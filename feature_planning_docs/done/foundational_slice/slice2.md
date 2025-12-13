Foundational Slice 2: Patch Compiler + Typed Ports + Block Registry + Error Surfacing

Slice 1 gave you a runtime that can run any Program<RenderTree> and render it. Slice 2 gives you the missing bridge:

Patch (blocks + connections) → compiled artifacts → final Program<RenderTree>
with strong typing, good errors, and a registry-based growth path.

This slice is where your “lanes” UI becomes real, because now the editor isn’t just drawing boxes — it’s building a well-typed program.

⸻

High-level: what Slice 2 must accomplish

1) Compile is a pure reduction

The compiler should:
	•	read patch state (blocks + wires)
	•	validate types + structure
	•	topo-sort dependencies
	•	compile each block exactly once (per patch revision)
	•	produce a typed port artifact map
	•	select an explicit output port (or infer it)
	•	return either:
	•	Program<RenderTree> (success)
	•	a structured list of errors (failure)

2) The “port is the unit”, not the block

Blocks can have multiple outputs. Your compiler should store artifacts by:

"${blockId}:${portName}" → Artifact

This is also what lets you show UI errors “on the exact port” and highlight bad wires.

3) Typed ports are the enforcement mechanism

“Which blocks can connect?” is not a UI question. It’s a compiler question (and the UI just reflects it).

So every block compiler declares:
	•	input ports: name + type + required
	•	output ports: name + type

Connections are valid iff from.type is assignable to to.type.

In Slice 2: keep assignability strict equality. If you want coercions later (Scalar→Field lifting, etc.), add them explicitly as blocks, not implicit magic.

4) Fast feedback loop

You want the editor to compile constantly. So:
	•	compile on patch changes (debounced)
	•	show errors immediately
	•	if compile fails, keep last good program running (hot swap behavior)

⸻

Code: Slice 2 (imports assume your kernel exists)

Below are three files you can drop in:
	1.	patch-types.ts — patch model + port types
	2.	block-registry.ts — block compiler interface + registry
	3.	compile-patch.ts — the actual compiler

I’m intentionally not redefining kernel types. You’ll import them from your kernel.

⸻

1) patch-types.ts

// patch-types.ts
import type { Program, RenderTree } from "@kernel";

// ---------- Patch graph ----------
export type BlockId = string;

export interface PortRef {
  blockId: BlockId;
  port: string; // port name
}

export interface Connection {
  from: PortRef; // output port
  to: PortRef;   // input port
}

export interface BlockInstance {
  id: BlockId;
  type: string; // registry key
  params: Record<string, unknown>;

  // optional editor-only layout metadata
  lane?: number;
  position?: number;
}

export interface Patch {
  blocks: Map<BlockId, BlockInstance>;
  connections: readonly Connection[];
  output?: PortRef; // explicit is best
}

// ---------- Port typing ----------
export type ValueKind =
  // scalars (editor constants / config)
  | "Scalar:number"
  | "Scalar:boolean"
  | "Scalar:string"

  // compile-time arrays
  | "Field:number"
  | "Field:vec2"
  | "Field:color"

  // runtime-ish / structural
  | "PhaseMachine"
  | "Scene"
  | "Program:RenderTree"

  // specs (optional for later slices; harmless to include now)
  | "Spec:LineMorph"
  | "Spec:ProgramStack"
  | "Spec:Transform3DCompositor";

export interface PortType {
  kind: ValueKind;
  meta?: Record<string, unknown>;
}

export interface PortDef {
  name: string;
  type: PortType;
  required?: boolean;
}

// ---------- Artifacts ----------
export type Artifact =
  | { kind: "Scalar:number"; value: number }
  | { kind: "Scalar:boolean"; value: boolean }
  | { kind: "Scalar:string"; value: string }

  | { kind: "Field:number"; value: unknown } // Field<number> in your kernel
  | { kind: "Field:vec2"; value: unknown }   // Field<Vec2>
  | { kind: "Field:color"; value: unknown }  // Field<Color>

  | { kind: "PhaseMachine"; value: unknown }
  | { kind: "Scene"; value: unknown }

  | { kind: "Program:RenderTree"; value: Program<RenderTree> }

  | { kind: "Spec:LineMorph"; value: unknown }
  | { kind: "Spec:ProgramStack"; value: unknown }
  | { kind: "Spec:Transform3DCompositor"; value: unknown }

  | { kind: "Error"; message: string; where?: { blockId?: string; port?: string } };

export type CompiledOutputs = Record<string /*port name*/, Artifact>;

// keying convention
export function portKey(ref: PortRef): string {
  return `${ref.blockId}:${ref.port}`;
}
export function keyOf(blockId: string, port: string): string {
  return `${blockId}:${port}`;
}


⸻

2) block-registry.ts

// block-registry.ts
import type { CompileCtx, Seed } from "@kernel";
import type { Artifact, BlockId, BlockInstance, CompiledOutputs, PortDef } from "./patch-types";

export interface BlockCompiler {
  type: string;

  inputs: readonly PortDef[];
  outputs: readonly PortDef[];

  /**
   * Compile must be pure.
   * It receives already-compiled upstream artifacts for its input ports.
   */
  compile(args: {
    id: BlockId;
    block: BlockInstance;
    seed: Seed;
    ctx: CompileCtx;
    inputs: Record<string, Artifact>;
  }): CompiledOutputs;
}

export type BlockRegistry = Record<string /*block.type*/, BlockCompiler>;


⸻

3) compile-patch.ts

This is the real compiler with:
	•	validation
	•	type checking
	•	topo sorting
	•	artifact map
	•	output selection
	•	structured errors

// compile-patch.ts
import type { CompileCtx, Seed, Program, RenderTree } from "@kernel";
import type {
  Patch, Connection, PortRef, Artifact, ValueKind, PortDef
} from "./patch-types";
import { keyOf } from "./patch-types";
import type { BlockRegistry } from "./block-registry";

export type CompileErrorCode =
  | "CompilerMissing"
  | "BlockMissing"
  | "PortMissing"
  | "MultipleWriters"
  | "PortTypeMismatch"
  | "CycleDetected"
  | "OutputMissing"
  | "OutputWrongType"
  | "UpstreamError";

export interface CompileError {
  code: CompileErrorCode;
  message: string;
  where?: { blockId?: string; port?: string; connection?: Connection };
}

export interface CompileResult {
  ok: boolean;
  program?: Program<RenderTree>;
  errors: readonly CompileError[];
  compiledPorts?: Map<string, Artifact>; // for debugging / inspector UI
}

export function compilePatch(
  patch: Patch,
  registry: BlockRegistry,
  seed: Seed,
  ctx: CompileCtx
): CompileResult {
  const errors: CompileError[] = [];

  // ---- 1) Validate registry presence for all blocks ----
  for (const [id, b] of patch.blocks.entries()) {
    if (!registry[b.type]) {
      errors.push({
        code: "CompilerMissing",
        message: `No compiler registered for block type "${b.type}"`,
        where: { blockId: id },
      });
    }
  }
  if (errors.length) return { ok: false, errors };

  // ---- 2) Index connections + detect multiple writers ----
  const incoming = indexIncoming(patch.connections);
  for (const [toKey, conns] of incoming.entries()) {
    if (conns.length > 1) {
      errors.push({
        code: "MultipleWriters",
        message: `Input port has multiple incoming connections: ${toKey}`,
        where: { connection: conns[0] },
      });
    }
  }
  if (errors.length) return { ok: false, errors };

  // ---- 3) Type check all connections ----
  for (const c of patch.connections) {
    const fb = patch.blocks.get(c.from.blockId);
    const tb = patch.blocks.get(c.to.blockId);
    if (!fb || !tb) {
      errors.push({
        code: "BlockMissing",
        message: `Missing block in connection`,
        where: { connection: c },
      });
      continue;
    }

    const fc = registry[fb.type]!;
    const tc = registry[tb.type]!;

    const fromPort = fc.outputs.find(p => p.name === c.from.port);
    const toPort = tc.inputs.find(p => p.name === c.to.port);

    if (!fromPort) {
      errors.push({ code: "PortMissing", message: `Missing output port ${c.from.blockId}.${c.from.port}`, where: { connection: c } });
      continue;
    }
    if (!toPort) {
      errors.push({ code: "PortMissing", message: `Missing input port ${c.to.blockId}.${c.to.port}`, where: { connection: c } });
      continue;
    }

    if (!isAssignable(fromPort.type.kind, toPort.type.kind)) {
      errors.push({
        code: "PortTypeMismatch",
        message: `Type mismatch: ${c.from.blockId}.${c.from.port} (${fromPort.type.kind}) → ${c.to.blockId}.${c.to.port} (${toPort.type.kind})`,
        where: { connection: c },
      });
    }
  }
  if (errors.length) return { ok: false, errors };

  // ---- 4) Topo sort blocks ----
  const order = topoSortBlocks(patch, errors);
  if (errors.length) return { ok: false, errors };

  // ---- 5) Compile blocks in order ----
  const compiled = new Map<string, Artifact>();

  for (const blockId of order) {
    const block = patch.blocks.get(blockId);
    if (!block) {
      errors.push({ code: "BlockMissing", message: `Block not found: ${blockId}`, where: { blockId } });
      continue;
    }

    const compiler = registry[block.type];
    if (!compiler) {
      errors.push({ code: "CompilerMissing", message: `Missing compiler for type: ${block.type}`, where: { blockId } });
      continue;
    }

    const inputs: Record<string, Artifact> = {};

    // Resolve each declared input port
    for (const p of compiler.inputs) {
      const conn = incoming.get(keyOf(blockId, p.name))?.[0];
      if (conn) {
        const srcKey = keyOf(conn.from.blockId, conn.from.port);
        const art = compiled.get(srcKey);
        inputs[p.name] = art ?? { kind: "Error", message: `Missing upstream artifact for ${srcKey}`, where: { blockId: conn.from.blockId, port: conn.from.port } };
      } else {
        if (p.required) {
          inputs[p.name] = { kind: "Error", message: `Missing required input ${blockId}.${p.name}`, where: { blockId, port: p.name } };
        } else {
          // optional, compiler can ignore or use defaults from params
          inputs[p.name] = { kind: "Error", message: `Unwired optional input ${blockId}.${p.name}`, where: { blockId, port: p.name } };
        }
      }
    }

    // Hard fail early on required upstream errors (keeps later blocks sane)
    for (const p of compiler.inputs) {
      if (!p.required) continue;
      const a = inputs[p.name];
      if (a?.kind === "Error") {
        errors.push({ code: "UpstreamError", message: a.message, where: a.where ?? { blockId, port: p.name } });
      }
    }
    if (errors.length) return { ok: false, errors, compiledPorts: compiled };

    const outs = compiler.compile({ id: blockId, block, seed, ctx, inputs });

    // Validate outputs exist and match declared kinds
    for (const outDef of compiler.outputs) {
      const produced = outs[outDef.name];
      if (!produced) {
        errors.push({ code: "PortMissing", message: `Compiler did not produce output ${blockId}.${outDef.name}`, where: { blockId, port: outDef.name } });
        continue;
      }
      if (produced.kind === "Error") {
        errors.push({ code: "UpstreamError", message: produced.message, where: produced.where ?? { blockId, port: outDef.name } });
        continue;
      }
      if (!isAssignable(produced.kind, outDef.type.kind)) {
        errors.push({
          code: "PortTypeMismatch",
          message: `Wrong output kind at ${blockId}.${outDef.name}: got ${produced.kind}, expected ${outDef.type.kind}`,
          where: { blockId, port: outDef.name },
        });
        continue;
      }
      compiled.set(keyOf(blockId, outDef.name), produced);
    }
    if (errors.length) return { ok: false, errors, compiledPorts: compiled };
  }

  // ---- 6) Resolve final output port ----
  const outRef = patch.output ?? inferOutputPort(patch, registry, compiled, errors);
  if (!outRef) {
    errors.push({ code: "OutputMissing", message: "No patch output specified and could not infer one." });
    return { ok: false, errors, compiledPorts: compiled };
  }

  const out = compiled.get(keyOf(outRef.blockId, outRef.port));
  if (!out) {
    errors.push({ code: "OutputMissing", message: `Output artifact missing: ${outRef.blockId}.${outRef.port}` });
    return { ok: false, errors, compiledPorts: compiled };
  }
  if (out.kind !== "Program:RenderTree") {
    errors.push({ code: "OutputWrongType", message: `Output must be Program:RenderTree, got ${out.kind}`, where: { blockId: outRef.blockId, port: outRef.port } });
    return { ok: false, errors, compiledPorts: compiled };
  }

  return { ok: true, program: out.value, errors: [], compiledPorts: compiled };
}

// ---------- Strict assignability for Slice 2 ----------
function isAssignable(from: ValueKind, to: ValueKind): boolean {
  return from === to;
}

// ---------- Connection indexing ----------
function indexIncoming(conns: readonly Connection[]): Map<string, Connection[]> {
  const m = new Map<string, Connection[]>();
  for (const c of conns) {
    const k = keyOf(c.to.blockId, c.to.port);
    const arr = m.get(k) ?? [];
    arr.push(c);
    m.set(k, arr);
  }
  return m;
}

// ---------- Topological sort ----------
function topoSortBlocks(patch: Patch, errors: CompileError[]): readonly string[] {
  const ids = Array.from(patch.blocks.keys());

  const adj = new Map<string, Set<string>>();
  const indeg = new Map<string, number>();

  for (const id of ids) {
    adj.set(id, new Set());
    indeg.set(id, 0);
  }

  for (const c of patch.connections) {
    const a = c.from.blockId;
    const b = c.to.blockId;
    if (!adj.has(a) || !adj.has(b)) continue;
    if (!adj.get(a)!.has(b)) {
      adj.get(a)!.add(b);
      indeg.set(b, (indeg.get(b) ?? 0) + 1);
    }
  }

  const q = ids.filter(id => (indeg.get(id) ?? 0) === 0).sort();
  const out: string[] = [];

  while (q.length) {
    const x = q.shift()!;
    out.push(x);
    for (const y of adj.get(x) ?? []) {
      indeg.set(y, (indeg.get(y) ?? 0) - 1);
      if ((indeg.get(y) ?? 0) === 0) q.push(y);
    }
    q.sort();
  }

  if (out.length !== ids.length) {
    errors.push({ code: "CycleDetected", message: "Cycle detected in patch graph." });
    return [];
  }

  return out;
}

// ---------- Output inference (optional) ----------
function inferOutputPort(
  patch: Patch,
  registry: BlockRegistry,
  compiled: Map<string, Artifact>,
  errors: CompileError[]
): PortRef | null {
  // Find all ports that produce Program:RenderTree and are not used as sources
  const fed = new Set<string>();
  for (const c of patch.connections) fed.add(keyOf(c.from.blockId, c.from.port));

  const candidates: PortRef[] = [];

  for (const [blockId, b] of patch.blocks.entries()) {
    const comp = registry[b.type]!;
    for (const out of comp.outputs) {
      if (out.type.kind !== "Program:RenderTree") continue;
      const k = keyOf(blockId, out.name);
      if (!compiled.has(k)) continue;
      if (fed.has(k)) continue;
      candidates.push({ blockId, port: out.name });
    }
  }

  if (candidates.length === 1) return candidates[0]!;
  if (candidates.length > 1) {
    errors.push({ code: "OutputMissing", message: "Multiple possible outputs; set patch.output explicitly." });
  }
  return null;
}


⸻

How Slice 2 plugs into Slice 1

In your editor loop:
	•	on patch change:
	•	const res = compilePatch(patch, registry, seed, compileCtx)
	•	if res.ok:
	•	player.setFactory(() => res.program!) OR just player.setProgram(res.program)
	•	else:
	•	show errors in UI (don’t stop the last good animation)

Important runtime behavior: keep “last good program” running even when compiler errors occur. That makes the system feel robust.

⸻

What blocks do you need to prove Slice 2 works?

For Slice 2 you don’t need LineMorph yet. You just need one real Program-producing block + an Output block.

Minimal-but-forward-compatible block set:
	1.	DemoProgram block

	•	outputs Program:RenderTree
	•	params: maybe color/speed

	2.	OutputProgram block (optional)

	•	mostly exists to make patch.output explicit and UI-friendly
	•	input: Program:RenderTree
	•	output: Program:RenderTree (pass-through)

With those, you can:
	•	create blocks
	•	connect them
	•	compile
	•	run in the Player from Slice 1
	•	see errors when you mismatch types

Then in Slice 3 we replace DemoProgram with the first “real pipeline” (Scene + LineMorphSpec + CompileLineMorph).

⸻

What to watch for (early issues)

1) Cycles

Even with typed ports, users can accidentally create cycles in math graphs. Catch it early with topo sort and show it clearly.

2) Optional inputs

Avoid implicit defaults in the compiler. Let block compilers decide defaults. That keeps semantics local and avoids surprising behavior.

3) Type coercions

Do not implement automatic coercions early. It makes graphs “feel magical” and later breaks determinism and explainability.
If you want Scalar→Field lifting, make it a block.

⸻

If you want, next I can also provide:
	•	a reference registry with DemoProgram + OutputProgram + 2–3 numeric field combinators
	•	a small helper to map CompileError objects into UI decorations (highlight block border vs port ring vs wire)

Just say next.