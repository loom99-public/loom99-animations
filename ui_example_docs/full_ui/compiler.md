/**
 * Patch → Program Compiler Header (V4-aligned)
 * -------------------------------------------
 * This is a canonical, typed “Option A” compiler architecture:
 *
 * - Patch graph is made of blocks with typed ports.
 * - Compilation is a topo-ordered reduction that produces typed Artifacts per output port.
 * - The final Artifact must be a RenderTreeProgram.
 *
 * This file includes:
 *  1) Patch data model (blocks, ports, connections)
 *  2) Type system for ports (ValueKind) + compatibility checks
 *  3) Artifact model (compiled outputs)
 *  4) BlockCompiler + Registry
 *  5) compilePatch() skeleton with error reporting
 *  6) topoSortBlocks() requirements (skeleton)
 *
 * NOTE: This is deliberately “kernel-pure” (no UI concepts except stable ids).
 */

/* --------------------------------------------
 * Kernel primitives (minimal)
 * ------------------------------------------ */

export type Seed = number;

export interface Env {}

export interface GeometryCache {
  get<K extends object, V>(key: K, compute: () => V): V;
  invalidate(scope?: any): void;
}

export interface CompileCtx {
  env: Env;
  geom: GeometryCache;
}

export interface RuntimeCtx {
  viewport: { w: number; h: number; dpr: number };
  reducedMotion?: boolean;
}

export type KernelEvent = { type: string; payload?: unknown };

export interface Program<T> {
  signal: (tMs: number, rt: RuntimeCtx) => T;
  event: (ev: KernelEvent) => KernelEvent[];
}

export interface Vec2 { x: number; y: number; }
export interface Bounds { min: Vec2; max: Vec2; }

export type NodeId = string;

export type DrawNode =
  | { kind: "group"; id: NodeId; children: readonly DrawNode[]; tags?: readonly string[]; meta?: Record<string, unknown> }
  | { kind: "shape"; id: NodeId; geom: unknown; style?: unknown; tags?: readonly string[]; meta?: Record<string, unknown> }
  | { kind: "effect"; id: NodeId; effect: unknown; child: DrawNode; tags?: readonly string[]; meta?: Record<string, unknown> };

export type RenderTree = DrawNode;

/* --------------------------------------------
 * Bulk Field type (compile-time)
 * ------------------------------------------ */

export type Field<T> = (seed: Seed, n: number, ctx: CompileCtx) => readonly T[];

/* --------------------------------------------
 * Port typing: what can flow through wires
 * ------------------------------------------ */

/**
 * ValueKind is the core compatibility axis.
 * Keep it explicit. Avoid structural typing for ports.
 */
export type ValueKind =
  | "Scalar:number"
  | "Scalar:string"
  | "Scalar:boolean"
  | "Scalar:color"
  | "Scalar:vec2"
  | "Scalar:bounds"

  | "Field:number"
  | "Field:string"
  | "Field:boolean"
  | "Field:color"
  | "Field:vec2"

  | "PhaseMachine"
  | "TargetScene"
  | "RenderTreeProgram"

  | "Spec:LineMorph"
  | "Spec:Particles"
  | "Spec:RevealMask"
  | "Spec:Transform3DCompositor"
  | "Spec:DeformCompositor"
  | "Spec:ProgramStack";

/** PortType can be extended later with refinements (units, lanes, etc.) */
export interface PortType {
  kind: ValueKind;

  /**
   * Optional constraints to keep purity:
   * - e.g. Field sizes must match selection count
   * - e.g. "RenderTreeProgram" must be final output
   */
  meta?: Record<string, unknown>;
}

export interface PortDef {
  name: string;
  type: PortType;
  required?: boolean;
}

/* --------------------------------------------
 * Patch graph data model
 * ------------------------------------------ */

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

  // UI placement is not used by compiler, but harmless to store here.
  lane?: number;
  position?: number;
}

export interface Patch {
  blocks: Map<BlockId, BlockInstance>;
  connections: readonly Connection[];

  /**
   * Output selection: the “root” port of the patch.
   * If omitted, compiler can attempt to infer (single RenderTreeProgram sink),
   * but explicit is better.
   */
  output?: PortRef;
}

/* --------------------------------------------
 * Artifacts: compiled values
 * ------------------------------------------ */

export type Artifact =
  | { kind: "Scalar:number"; value: number }
  | { kind: "Scalar:string"; value: string }
  | { kind: "Scalar:boolean"; value: boolean }
  | { kind: "Scalar:color"; value: unknown } // define Color type in your kernel
  | { kind: "Scalar:vec2"; value: Vec2 }
  | { kind: "Scalar:bounds"; value: Bounds }

  | { kind: "Field:number"; value: Field<number> }
  | { kind: "Field:string"; value: Field<string> }
  | { kind: "Field:boolean"; value: Field<boolean> }
  | { kind: "Field:color"; value: Field<unknown> }
  | { kind: "Field:vec2"; value: Field<Vec2> }

  | { kind: "PhaseMachine"; value: PhaseMachine }
  | { kind: "TargetScene"; value: TargetScene }
  | { kind: "RenderTreeProgram"; value: Program<RenderTree> }

  | { kind: "Spec:LineMorph"; value: unknown }
  | { kind: "Spec:Particles"; value: unknown }
  | { kind: "Spec:RevealMask"; value: unknown }
  | { kind: "Spec:Transform3DCompositor"; value: unknown }
  | { kind: "Spec:DeformCompositor"; value: unknown }
  | { kind: "Spec:ProgramStack"; value: unknown }

  | { kind: "Error"; message: string; where?: { blockId?: string; port?: string } };

/** A compiled block returns one Artifact per declared output port. */
export type CompiledOutputs = Record<string /*port name*/, Artifact>;

/* --------------------------------------------
 * PhaseMachine + TargetScene minimal stubs
 * ------------------------------------------ */

export interface PhaseSample {
  phase: string;
  u: number;
  uRaw: number;
  tLocal: number;
}

export interface PhaseMachine {
  sample(tMs: number): PhaseSample;
}

export interface TargetScene {
  id: string;
  targets: readonly Vec2[];
  groups?: readonly number[];
  bounds?: Bounds;
  meta?: Record<string, unknown>;
}

/* --------------------------------------------
 * Block compiler contract
 * ------------------------------------------ */

export interface BlockCompiler {
  type: string;

  /** Declared input ports */
  inputs: readonly PortDef[];

  /** Declared output ports */
  outputs: readonly PortDef[];

  /**
   * Compile a block instance using already-compiled upstream Artifacts.
   * Must be pure. May construct Fields/Specs/Programs that are pure given inputs.
   */
  compile(args: {
    id: BlockId;
    params: Record<string, unknown>;

    /** For each input port name: the resolved Artifact (or Error if missing). */
    inputs: Record<string, Artifact>;

    /** Compile-time context available to blocks that pre-bake geometry/specs. */
    ctx: CompileCtx;
  }): CompiledOutputs;
}

export type BlockRegistry = Record<string /*block.type*/, BlockCompiler>;

/* --------------------------------------------
 * Errors: surfaced to editor for highlighting
 * ------------------------------------------ */

export type CompileErrorCode =
  | "BlockMissing"
  | "CompilerMissing"
  | "PortMissing"
  | "PortTypeMismatch"
  | "MultipleWriters"
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

  /** Optional: useful for debugging/explaining graph evaluation */
  compiledPortMap?: Map<string /*blockId:port*/, Artifact>;
}

/* --------------------------------------------
 * Compiler entrypoint
 * ------------------------------------------ */

export function compilePatch(
  patch: Patch,
  registry: BlockRegistry,
  seed: Seed,
  ctx: CompileCtx
): CompileResult {
  const errors: CompileError[] = [];

  // 1) Validate block types exist in registry
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

  // 2) Build connection indices (detect multiple writers to same input)
  const incoming = indexIncoming(patch.connections);
  const outgoing = indexOutgoing(patch.connections);

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

  // 3) Type-check connections against declared port types
  for (const c of patch.connections) {
    const fromBlock = patch.blocks.get(c.from.blockId);
    const toBlock = patch.blocks.get(c.to.blockId);

    if (!fromBlock) {
      errors.push({ code: "BlockMissing", message: `Missing from-block ${c.from.blockId}`, where: { connection: c } });
      continue;
    }
    if (!toBlock) {
      errors.push({ code: "BlockMissing", message: `Missing to-block ${c.to.blockId}`, where: { connection: c } });
      continue;
    }

    const fromComp = registry[fromBlock.type]!;
    const toComp = registry[toBlock.type]!;

    const fromPort = fromComp.outputs.find(p => p.name === c.from.port);
    const toPort = toComp.inputs.find(p => p.name === c.to.port);

    if (!fromPort) {
      errors.push({ code: "PortMissing", message: `Missing output port ${c.from.blockId}.${c.from.port}`, where: { connection: c } });
      continue;
    }
    if (!toPort) {
      errors.push({ code: "PortMissing", message: `Missing input port ${c.to.blockId}.${c.to.port}`, where: { connection: c } });
      continue;
    }

    if (!isPortTypeAssignable(fromPort.type, toPort.type)) {
      errors.push({
        code: "PortTypeMismatch",
        message: `Type mismatch: ${c.from.blockId}.${c.from.port} (${fromPort.type.kind}) → ${c.to.blockId}.${c.to.port} (${toPort.type.kind})`,
        where: { connection: c },
      });
    }
  }
  if (errors.length) return { ok: false, errors };

  // 4) Topological order by blocks (dependency graph from connections)
  const order = topoSortBlocks(patch, errors);
  if (errors.length) return { ok: false, errors };

  // 5) Compile blocks in topo order to artifacts per output port
  const compiledPortMap = new Map<string, Artifact>();

  for (const blockId of order) {
    const block = patch.blocks.get(blockId);
    if (!block) {
      errors.push({ code: "BlockMissing", message: `Block not found: ${blockId}`, where: { blockId } });
      continue;
    }

    const compiler = registry[block.type];
    if (!compiler) {
      errors.push({ code: "CompilerMissing", message: `Compiler missing for: ${block.type}`, where: { blockId } });
      continue;
    }

    // Resolve inputs
    const inputs: Record<string, Artifact> = {};
    for (const p of compiler.inputs) {
      const conn = incoming.get(keyOf(blockId, p.name))?.[0];
      if (conn) {
        const srcKey = keyOf(conn.from.blockId, conn.from.port);
        const src = compiledPortMap.get(srcKey);
        inputs[p.name] = src ?? {
          kind: "Error",
          message: `Missing upstream artifact for ${srcKey}`,
          where: { blockId: conn.from.blockId, port: conn.from.port },
        };
      } else {
        // No connection: either optional or provide default scalar constant from params.
        if (p.required) {
          inputs[p.name] = { kind: "Error", message: `Missing required input ${blockId}.${p.name}`, where: { blockId, port: p.name } };
        } else {
          // optional inputs default to an Error-free "null" via params defaults in the block compiler
          inputs[p.name] = { kind: "Error", message: `Unwired optional input ${blockId}.${p.name}`, where: { blockId, port: p.name } };
        }
      }
    }

    // If any required input is an Error, record it but still allow compiler to decide how to handle.
    for (const [name, art] of Object.entries(inputs)) {
      if (art.kind === "Error") {
        // only escalate if that port is required
        const def = compiler.inputs.find(x => x.name === name);
        if (def?.required) {
          errors.push({ code: "UpstreamError", message: art.message, where: { blockId, port: name } });
        }
      }
    }
    if (errors.length) return { ok: false, errors };

    const outs = compiler.compile({ id: blockId, params: block.params, inputs, ctx });

    // Validate outputs and store
    for (const outDef of compiler.outputs) {
      const produced = outs[outDef.name];
      if (!produced) {
        errors.push({
          code: "PortMissing",
          message: `Compiler did not produce required output port ${blockId}.${outDef.name}`,
          where: { blockId, port: outDef.name },
        });
        continue;
      }
      if (produced.kind === "Error") {
        errors.push({ code: "UpstreamError", message: produced.message, where: produced.where ?? { blockId, port: outDef.name } });
        continue;
      }
      if (!isKindAssignable(produced.kind, outDef.type.kind)) {
        errors.push({
          code: "PortTypeMismatch",
          message: `Compiler produced wrong kind for ${blockId}.${outDef.name}: got ${produced.kind}, expected ${outDef.type.kind}`,
          where: { blockId, port: outDef.name },
        });
        continue;
      }
      compiledPortMap.set(keyOf(blockId, outDef.name), produced);
    }

    if (errors.length) return { ok: false, errors };
  }

  // 6) Resolve final output port
  const outputRef = patch.output ?? inferOutputPort(patch, registry, compiledPortMap, errors);
  if (!outputRef) {
    errors.push({ code: "OutputMissing", message: "No output port specified and could not infer one." });
    return { ok: false, errors };
  }

  const outArt = compiledPortMap.get(keyOf(outputRef.blockId, outputRef.port));
  if (!outArt) {
    errors.push({ code: "OutputMissing", message: `Output artifact not found for ${outputRef.blockId}.${outputRef.port}` });
    return { ok: false, errors };
  }

  if (outArt.kind !== "RenderTreeProgram") {
    errors.push({
      code: "OutputWrongType",
      message: `Patch output must be RenderTreeProgram, got ${outArt.kind}`,
      where: { blockId: outputRef.blockId, port: outputRef.port },
    });
    return { ok: false, errors };
  }

  return { ok: true, program: outArt.value, errors: [], compiledPortMap };
}

/* --------------------------------------------
 * Port compatibility
 * ------------------------------------------ */

export function isPortTypeAssignable(from: PortType, to: PortType): boolean {
  // Exact match for now (maximal purity).
  // Later you can add widening rules (Scalar:number -> Field:number via lifting) explicitly.
  return from.kind === to.kind;
}

function isKindAssignable(fromKind: Artifact["kind"], toKind: ValueKind): boolean {
  return fromKind === toKind;
}

/* --------------------------------------------
 * Connection indexing
 * ------------------------------------------ */

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

function indexOutgoing(conns: readonly Connection[]): Map<string, Connection[]> {
  const m = new Map<string, Connection[]>();
  for (const c of conns) {
    const k = keyOf(c.from.blockId, c.from.port);
    const arr = m.get(k) ?? [];
    arr.push(c);
    m.set(k, arr);
  }
  return m;
}

function keyOf(blockId: string, port: string): string {
  return `${blockId}:${port}`;
}

/* --------------------------------------------
 * Topological sort (block-level)
 * ------------------------------------------ */

/**
 * topoSortBlocks sorts blocks so that upstream dependencies compile first.
 * Dependency graph edges: from c.from.blockId -> c.to.blockId
 *
 * Requirements:
 * - Detect cycles and emit CycleDetected error.
 * - Include isolated blocks (no edges) too, in stable order.
 */
export function topoSortBlocks(patch: Patch, errors: CompileError[]): readonly BlockId[] {
  const ids = Array.from(patch.blocks.keys());

  // build adjacency + indegree
  const adj = new Map<BlockId, Set<BlockId>>();
  const indeg = new Map<BlockId, number>();

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

  // Kahn
  const queue: BlockId[] = [];
  for (const id of ids) {
    if ((indeg.get(id) ?? 0) === 0) queue.push(id);
  }

  // Stable order: queue in insertion order; if you want deterministic across maps, sort by id.
  queue.sort();

  const out: BlockId[] = [];
  while (queue.length) {
    const x = queue.shift()!;
    out.push(x);
    for (const y of adj.get(x) ?? []) {
      indeg.set(y, (indeg.get(y) ?? 0) - 1);
      if ((indeg.get(y) ?? 0) === 0) queue.push(y);
    }
    queue.sort();
  }

  if (out.length !== ids.length) {
    errors.push({ code: "CycleDetected", message: "Cycle detected in patch graph." });
    return [];
  }

  return out;
}

/* --------------------------------------------
 * Output inference (optional)
 * ------------------------------------------ */

function inferOutputPort(
  patch: Patch,
  registry: BlockRegistry,
  compiled: Map<string, Artifact>,
  errors: CompileError[]
): PortRef | null {
  // Heuristic: find all produced RenderTreeProgram ports that are NOT used as a source to any connection.
  // If exactly one, pick it.
  const produced: PortRef[] = [];

  // Map of all ports that feed something
  const fed = new Set<string>();
  for (const c of patch.connections) fed.add(keyOf(c.from.blockId, c.from.port));

  for (const [blockId, block] of patch.blocks.entries()) {
    const comp = registry[block.type];
    for (const out of comp.outputs) {
      if (out.type.kind !== "RenderTreeProgram") continue;
      const k = keyOf(blockId, out.name);
      if (!compiled.has(k)) continue;
      if (fed.has(k)) continue;
      produced.push({ blockId, port: out.name });
    }
  }

  if (produced.length === 1) return produced[0]!;
  return null;
}

/* --------------------------------------------
 * Minimal example block compilers (optional)
 * ------------------------------------------ */

/**
 * ConstantNumber: outputs Scalar:number and Field:number (lifted)
 * This is useful because it shows how you can keep lifting explicit.
 */
export const ConstantNumberBlock: BlockCompiler = {
  type: "constNumber",
  inputs: [],
  outputs: [
    { name: "scalar", type: { kind: "Scalar:number" } },
    { name: "field", type: { kind: "Field:number" } },
  ],
  compile({ params }) {
    const v = Number(params.value ?? 0);
    const f: Field<number> = (_seed, n, _ctx) => {
      const out = new Array<number>(n);
      for (let i = 0; i < n; i++) out[i] = v;
      return out;
    };
    return {
      scalar: { kind: "Scalar:number", value: v },
      field: { kind: "Field:number", value: f },
    };
  },
};

/**
 * AddFieldNumber: adds two Field<number>
 */
export const AddFieldNumberBlock: BlockCompiler = {
  type: "addFieldNumber",
  inputs: [
    { name: "a", type: { kind: "Field:number" }, required: true },
    { name: "b", type: { kind: "Field:number" }, required: true },
  ],
  outputs: [{ name: "out", type: { kind: "Field:number" } }],
  compile({ inputs }) {
    const a = inputs.a;
    const b = inputs.b;
    if (a.kind !== "Field:number" || b.kind !== "Field:number") {
      return { out: { kind: "Error", message: "addFieldNumber: inputs must be Field:number" } };
    }
    const out: Field<number> = (seed, n, ctx) => {
      const A = a.value(seed, n, ctx);
      const B = b.value(seed, n, ctx);
      const Y = new Array<number>(n);
      for (let i = 0; i < n; i++) Y[i] = (A[i] ?? 0) + (B[i] ?? 0);
      return Y;
    };
    return { out: { kind: "Field:number", value: out } };
  },
};