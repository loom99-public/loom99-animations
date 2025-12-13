You’re on the right track with Option A, but the thing that will “make it right” is being explicit about what you are compiling.

Right now your sketch conflates 3 different compilation products:
	1.	Fields: compile-time functions producing readonly T[]
	2.	Programs: runtime t → RenderTree
	3.	Specs: structured config objects that later get compiled into Programs

Your patch compiler will be dramatically simpler and purer if you treat your visual graph as compiling into a typed IR made of those three layers.

Here’s a concrete architecture that stays maximally V4-aligned and fixes the loose ends.

⸻

0) Fix the type: Program is time-dependent

V4 “Program” (as we’ve been using it in this thread) should be:

type Program<T> = (seed: Seed, scene: Scene, ctx: CompileCtx) => {
  signal: (tMs: number, rt: RuntimeCtx) => T;
  event: (ev: KernelEvent) => KernelEvent[];
};

If you collapse that to (seed, scene, ctx) => T, you lose time.

So your patch compiler should produce a factory that returns a time-varying program.

⸻

1) Make ports first-class: “what flows through wires”

Don’t wire BlockId → Field<any> directly. Wire ports.

type PortId = string;

interface PortRef { blockId: string; port: string; } // e.g. {blockId:"delay_1", port:"out"}

type ValueKind =
  | "Field:number"
  | "Field:Vec2"
  | "Field:Transform3D"
  | "PhaseMachine"
  | "RenderTreeProgram"
  | "TargetScene"
  | "Spec:Particles"
  | "Spec:LineMorph"
  | "Spec:Compositor"; // etc

interface PortType { kind: ValueKind; } // you can enrich later

interface Connection {
  from: PortRef;
  to: PortRef;
}

This solves “which blocks connect” by construction: ports have types.

⸻

2) Block compilation target: compile to a typed artifact

Each block type compiles to one or more typed outputs.

type Artifact =
  | { kind: "Field:number"; value: Field<number> }
  | { kind: "PhaseMachine"; value: PhaseMachine }
  | { kind: "Spec:Transform3D"; value: Transform3DCompositorSpec }
  | { kind: "RenderTreeProgram"; value: Program<RenderTree> }
  | { kind: "TargetScene"; value: TargetScene }
  | { kind: "Error"; message: string };

type CompiledOutputs = Record<string /*port name*/, Artifact>;

Then your registry is:

interface BlockCompiler {
  type: string;

  inputs: Record<string, PortType>;
  outputs: Record<string, PortType>;

  compile(args: {
    id: string;
    params: Record<string, any>;
    inputs: Record<string, Artifact>;     // already compiled upstream artifacts
  }): CompiledOutputs;
}

This is still “Option A”, just made explicit and composable.

⸻

3) The patch compiler becomes a pure reducer over a topo order

Topo sort by block, but resolve inputs by ports

Pseudo:

function compilePatch(patch: Patch, registry: Registry): Program<RenderTree> {
  const order = topoSortBlocks(patch);

  const compiledPorts = new Map<string /*blockId:port*/, Artifact>();

  for (const blockId of order) {
    const block = patch.blocks.get(blockId)!;
    const compiler = registry[block.type];

    // gather input artifacts by following connections into this block’s input ports
    const inputArtifacts: Record<string, Artifact> = {};
    for (const [portName, portType] of Object.entries(compiler.inputs)) {
      const src = findConnectionSource(patch.connections, { blockId, port: portName });
      inputArtifacts[portName] = src
        ? compiledPorts.get(keyOf(src)) ?? { kind: "Error", message: `Missing ${keyOf(src)}` }
        : defaultValueFor(portType, block.params); // e.g. constants
    }

    // compile the block
    const outs = compiler.compile({ id: blockId, params: block.params, inputs: inputArtifacts });

    // store each output port
    for (const [outPort, artifact] of Object.entries(outs)) {
      compiledPorts.set(`${blockId}:${outPort}`, artifact);
    }
  }

  // finally: locate the designated "output" block/port and return it (must be RenderTreeProgram)
  const out = compiledPorts.get(findFinalOutputPort(patch))!;
  if (out.kind !== "RenderTreeProgram") throw new Error("Patch output must be RenderTreeProgram");
  return out.value;
}

Why this is “the right” purity move
	•	Blocks compile to pure artifacts
	•	Wiring is type-checked at compile time
	•	Runtime program is just the artifact you compiled, not an interpreter

⸻

4) Field signature mismatch resolved cleanly

In this model, Fields are always the bulk form:

type Field<T> = (seed: Seed, n: number, ctx: CompileCtx) => readonly T[];

If a block wants scalar-by-index ergonomics, it wraps internally.

So Delay becomes:

compile({ params, inputs }) {
  const amount = params.amount as number;
  const x = (inputs.value as {kind:"Field:number", value: Field<number>}).value;

  const out: Field<number> = (seed, n, ctx) => {
    const xs = x(seed, n, ctx);
    const ys = new Array<number>(n);
    for (let i = 0; i < n; i++) ys[i] = xs[i]! + amount;
    return ys;
  };

  return { out: { kind: "Field:number", value: out } };
}

No ambiguity. No second signature. i exists only inside array loops.

⸻

5) The crucial missing concept: “spec-building blocks” vs “program blocks”

If you let every block output Program<RenderTree> directly, you’ll end up with tons of ad-hoc compilers.

Better:
	•	Archetype blocks output Spec (pure data)
	•	Compositor blocks output Spec
	•	A small number of “CompileX” blocks turn a Spec into a Program

This keeps your patch language small and reusable.

Example pipeline in the editor:

[LineMorphSpec] -> (Spec:LineMorph)
[Transform3DSpec] -> (Spec:Transform3DCompositor)
[Compose] -> (Spec:ProgramStack)
[CompileProgram] -> Program<RenderTree>

So you only have a few true “program constructors”.

⸻

6) Memoization without impurity

You mentioned “Field caching prevents re-evaluation of shared inputs”.

In the bulk Field model, caching is clean if you do it per call:

function memoField<T>(f: Field<T>): Field<T> {
  return (seed, n, ctx) => {
    const key = `field|${seed}|${n}`; // plus anything else you need
    return ctx.geom.get({ kind: "FieldMemo", key } as any, () => f(seed, n, ctx));
  };
}

But be careful: GeometryCache is shared; if n changes often, this can explode. For most fields it’s cheaper to just compute.

The real caching wins are:
	•	baked geometry (paths → polylines)
	•	selections (node ids → paths)
	•	text layout → targets

⸻

7) What I would change in your draft (surgical)

Replace:

“fields: Map<string, Field>”

with:

“compiledPorts: Map<string, Artifact> keyed by blockId:port”

Because blocks can have multiple outputs and not all outputs are Fields.

Replace:

“Final output is RenderTree from terminal blocks”

with:

“Final output is a RenderTreeProgram artifact at a designated OutputPort”

Because otherwise you’ll accidentally allow patches that output a Field and forget to run a renderer.

Keep:
	•	topo sort
	•	block registry with compile()
	•	type checking at connection time

⸻

8) Minimal block categories you’ll want (to keep sanity)
	1.	Constant blocks: output Field<number> / Field<Vec2> / Scalar
	2.	Field combinators: add/mul/map/noise/stagger
	3.	Phase blocks: output PhaseMachine
	4.	Spec blocks: build archetype/compositor specs from fields
	5.	Compile blocks: Spec → Program
	6.	Output block: declares the final required port type

That’s enough to build almost everything.

