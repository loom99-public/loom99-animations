Cool — here are both, in a way that plugs directly into Slice 1 + Slice 2 without adding “magic”.

1) Reference block registry

This gives you:
	•	a Program source block (demo.program)
	•	an Output block (core.outputProgram) that makes the patch root explicit
	•	a tiny math lane starter kit (constNumber, addScalar, mulScalar, sinScalar)
	•	a lift block (lift.scalarToFieldNumber) so Scalar→Field is explicit and type-safe

Assumes your kernel exports: Program, RenderTree, Seed, CompileCtx, RuntimeCtx, and your RenderTree node constructors/types.

// registry.ts
import type { BlockRegistry, BlockCompiler } from "./block-registry";
import type { Artifact } from "./patch-types";
import type { Program, RenderTree, RuntimeCtx } from "@kernel";

// -------- helpers --------
function expect<A extends Artifact["kind"]>(
  a: Artifact,
  kind: A,
  who: string
): Extract<Artifact, { kind: A }> {
  if (a.kind !== kind) throw new Error(`${who}: expected ${kind}, got ${a.kind}`);
  return a as any;
}

function scalarNum(a: Artifact, who: string) {
  return expect(a, "Scalar:number", who).value;
}

// -------- blocks --------

// 1) OutputProgram: explicit root
const OutputProgram: BlockCompiler = {
  type: "core.outputProgram",
  inputs: [{ name: "program", type: { kind: "Program:RenderTree" }, required: true }],
  outputs: [{ name: "program", type: { kind: "Program:RenderTree" } }],
  compile({ inputs }) {
    const p = expect(inputs.program, "Program:RenderTree", "OutputProgram").value;
    return { program: { kind: "Program:RenderTree", value: p } };
  },
};

// 2) DemoProgram: produces a RenderTree program (no patch compiler complexity yet)
const DemoProgram: BlockCompiler = {
  type: "demo.program",
  inputs: [
    { name: "speed", type: { kind: "Scalar:number" }, required: false },
    { name: "amp", type: { kind: "Scalar:number" }, required: false },
  ],
  outputs: [{ name: "program", type: { kind: "Program:RenderTree" } }],
  compile({ inputs, block }) {
    // optional inputs: if unwired we read defaults from params
    const speed =
      inputs.speed.kind === "Scalar:number" ? inputs.speed.value : Number(block.params.speed ?? 1);
    const amp =
      inputs.amp.kind === "Scalar:number" ? inputs.amp.value : Number(block.params.amp ?? 30);

    const stroke = String(block.params.stroke ?? "#ffffff");
    const cx = Number(block.params.cx ?? 200);
    const cy = Number(block.params.cy ?? 120);
    const r = Number(block.params.r ?? 8);

    const program: Program<RenderTree> = {
      signal: (tMs: number, _rt: RuntimeCtx) => {
        const t = (tMs / 1000) * speed;
        const x = cx + Math.sin(t) * amp;

        return {
          kind: "group",
          id: "root",
          children: [
            {
              kind: "shape",
              id: "dot",
              geom: { kind: "circle", cx: x, cy, r },
              style: { fill: stroke, stroke: "none", opacity: 1 },
            },
            {
              kind: "shape",
              id: "baseline",
              geom: { kind: "svgPath", d: `M ${cx - amp} ${cy} L ${cx + amp} ${cy}` },
              style: { stroke: stroke, strokeWidth: 2, fill: "none", opacity: 0.4 },
            },
          ],
        } as any;
      },
      event: () => [],
    };

    return { program: { kind: "Program:RenderTree", value: program } };
  },
};

// 3) ConstNumber
const ConstNumber: BlockCompiler = {
  type: "math.constNumber",
  inputs: [],
  outputs: [{ name: "out", type: { kind: "Scalar:number" } }],
  compile({ block }) {
    const v = Number(block.params.value ?? 0);
    return { out: { kind: "Scalar:number", value: v } };
  },
};

// 4) AddScalar
const AddScalar: BlockCompiler = {
  type: "math.addScalar",
  inputs: [
    { name: "a", type: { kind: "Scalar:number" }, required: true },
    { name: "b", type: { kind: "Scalar:number" }, required: true },
  ],
  outputs: [{ name: "out", type: { kind: "Scalar:number" } }],
  compile({ inputs }) {
    const a = scalarNum(inputs.a, "AddScalar.a");
    const b = scalarNum(inputs.b, "AddScalar.b");
    return { out: { kind: "Scalar:number", value: a + b } };
  },
};

// 5) MulScalar
const MulScalar: BlockCompiler = {
  type: "math.mulScalar",
  inputs: [
    { name: "a", type: { kind: "Scalar:number" }, required: true },
    { name: "b", type: { kind: "Scalar:number" }, required: true },
  ],
  outputs: [{ name: "out", type: { kind: "Scalar:number" } }],
  compile({ inputs }) {
    const a = scalarNum(inputs.a, "MulScalar.a");
    const b = scalarNum(inputs.b, "MulScalar.b");
    return { out: { kind: "Scalar:number", value: a * b } };
  },
};

// 6) SinScalar (pure function node; time-independent because it's just math)
const SinScalar: BlockCompiler = {
  type: "math.sinScalar",
  inputs: [{ name: "x", type: { kind: "Scalar:number" }, required: true }],
  outputs: [{ name: "out", type: { kind: "Scalar:number" } }],
  compile({ inputs }) {
    const x = scalarNum(inputs.x, "SinScalar.x");
    return { out: { kind: "Scalar:number", value: Math.sin(x) } };
  },
};

// 7) Explicit lift: Scalar:number -> Field:number
const LiftScalarToFieldNumber: BlockCompiler = {
  type: "lift.scalarToFieldNumber",
  inputs: [{ name: "x", type: { kind: "Scalar:number" }, required: true }],
  outputs: [{ name: "out", type: { kind: "Field:number" } }],
  compile({ inputs }) {
    const x = scalarNum(inputs.x, "LiftScalarToFieldNumber.x");
    const field = ((_: any, n: number) => Array.from({ length: n }, () => x)) as any;
    return { out: { kind: "Field:number", value: field } };
  },
};

export const registry: BlockRegistry = {
  [OutputProgram.type]: OutputProgram,
  [DemoProgram.type]: DemoProgram,
  [ConstNumber.type]: ConstNumber,
  [AddScalar.type]: AddScalar,
  [MulScalar.type]: MulScalar,
  [SinScalar.type]: SinScalar,
  [LiftScalarToFieldNumber.type]: LiftScalarToFieldNumber,
};

Why this is the “right” starter registry
	•	It forces you to keep Scalar vs Field distinct (critical later).
	•	It introduces the Output block pattern early (avoids ambiguous roots).
	•	It proves that the compiler + runtime loop can run a real patch.
	•	None of this gets thrown away when you add Specs and Compilers.

⸻

2) UI error decoration mapping

You want errors to land in the UI as:
	•	Block-level errors (missing compiler, cycle)
	•	Port-level errors (unwired required input, type mismatch)
	•	Wire-level errors (mismatch on that connection)

So we convert CompileError[] into a “decoration model” the editor can render.

// error-decorations.ts
import type { CompileError } from "./compile-patch";
import type { Connection, BlockId, PortRef } from "./patch-types";

export type Severity = "error" | "warning";

export interface BlockDecoration {
  blockId: BlockId;
  severity: Severity;
  messages: string[];
}

export interface PortDecoration {
  blockId: BlockId;
  port: string;
  severity: Severity;
  messages: string[];
}

export interface WireDecoration {
  from: PortRef;
  to: PortRef;
  severity: Severity;
  messages: string[];
}

export interface DecorationSet {
  blocks: Record<string, BlockDecoration>;
  ports: Record<string, PortDecoration>; // key = `${blockId}:${port}`
  wires: WireDecoration[];
  global: { severity: Severity; message: string }[];
}

function portKey(blockId: string, port: string) {
  return `${blockId}:${port}`;
}

export function buildDecorations(errors: readonly CompileError[]): DecorationSet {
  const blocks: DecorationSet["blocks"] = {};
  const ports: DecorationSet["ports"] = {};
  const wires: WireDecoration[] = [];
  const global: DecorationSet["global"] = [];

  const addBlock = (blockId: string, msg: string, severity: Severity = "error") => {
    const e = (blocks[blockId] ??= { blockId, severity, messages: [] });
    e.messages.push(msg);
    e.severity = severity; // escalate rules can be added later
  };

  const addPort = (blockId: string, port: string, msg: string, severity: Severity = "error") => {
    const k = portKey(blockId, port);
    const e = (ports[k] ??= { blockId, port, severity, messages: [] });
    e.messages.push(msg);
    e.severity = severity;
  };

  for (const err of errors) {
    const w = err.where;

    // Wire-attached errors
    if (w?.connection) {
      wires.push({
        from: w.connection.from,
        to: w.connection.to,
        severity: "error",
        messages: [err.message],
      });

      // Often also helpful to mark the destination port
      addPort(w.connection.to.blockId, w.connection.to.port, err.message, "error");
      continue;
    }

    // Port-attached errors
    if (w?.blockId && w?.port) {
      addPort(w.blockId, w.port, err.message, "error");
      addBlock(w.blockId, err.message, "error");
      continue;
    }

    // Block-attached errors
    if (w?.blockId) {
      addBlock(w.blockId, err.message, "error");
      continue;
    }

    // Global errors (cycle, ambiguous outputs, etc.)
    global.push({ severity: "error", message: err.message });
  }

  return { blocks, ports, wires, global };
}

How the UI uses this (simple rules)
	•	Block outline red if blocks[blockId] exists
	•	Port ring red if ports[blockId:port] exists
	•	Wire stroke red if any wires match that edge
	•	Hover shows messages

Why this matters early

You will iterate on block types a lot. Good error UX is what keeps the system usable while incomplete.

⸻

Practical “next step” wiring

Once you have:
	•	Slice 1 runtime (Player + SvgRenderer)
	•	Slice 2 compiler (compilePatch)
	•	this registry (registry)
	•	decoration mapping (buildDecorations)

Your editor loop becomes:
	1.	compile patch
	2.	if ok: hot swap program
	3.	else: keep last good program and show decorations

No drama.

⸻

If you say next, Slice 3 is where we stop using demo.program and build your first real end-to-end: Scene block + LineMorphSpec block + CompileLineMorph block + Output, which proves the whole “spec → compiler → program” pipeline with logo-01.