2) Architecture & functionality: detailed breakdown

This is the “single-file mental model” of your system: what pieces exist, what they do, what boundaries are sacred, and how data flows end-to-end from UI → compiler → runtime → pixels.

⸻

A. System layers at a glance

1) Kernel layer (truth + computation)

The kernel is where “what this means” lives:
	•	types (Field, Program, RenderTree, Scene, etc.)
	•	deterministic evaluation contracts
	•	composition primitives (compositors, phase machines, etc.)

It does not know about UI, lanes, palette, inspector layout.

2) Compiler layer (graph → runnable program)

The compiler turns a Patch into a runnable program:
	•	enforces type correctness
	•	topo-sorts dependencies
	•	compiles blocks into artifacts
	•	selects an output program port
	•	returns either a Program<RenderTree> or structured errors

3) Runtime/Player layer (time policy + continuity)

The player owns:
	•	playback policy (looping, pingpong, scrubbing, rate)
	•	continuity (hot swaps, transitions, “play never stops”)
	•	render loop (requestAnimationFrame / stable dt)

It does not own animation meaning; it just runs Programs.

4) Renderer layer (RenderTree → pixels)

Renderer interprets RenderTree instructions:
	•	SVG renderer now (paths, groups, styles)
	•	later: Canvas/WebGL renderers behind the same interface

Renderer does not decide timing or randomness.

5) Editor/UI layer (human affordances)

The editor owns:
	•	lane layout and block placement
	•	palette and suggestions
	•	control surface + bindings UI
	•	error decorations + highlighting
	•	macro expansion UX (archetype drop-in)

Editor is allowed to be opinionated; correctness is enforced by compiler types.

⸻

B. Core types and the “shape” of execution

Even as details evolve, the system stabilizes around these abstract roles:

1) Patch (what the user edits)

A Patch is a typed wiring diagram:
	•	blocks: Map<BlockId, BlockInstance>
	•	connections: Connection[] (from output port → to input port)
	•	optional explicit patch.output: PortRef for the root

Blocks have:
	•	type (registry key)
	•	params (serialized config)
	•	optional layout metadata (lane, position)

Important: Patch is not the program

Patch is a recipe that becomes a program when compiled.

⸻

2) Block descriptor registry (UI + compilation metadata)

Each block type has:
	•	port defs: inputs + outputs with ValueKind
	•	compiler: pure compile({inputs, params}) -> outputs
	•	UI metadata: category, lane preference, defaults, tags

This is the critical unifier:
	•	editor uses metadata to help users
	•	compiler uses port defs to enforce correctness

⸻

3) Artifacts (compiled values)

During compilation, you build an artifact map keyed by:
	•	"blockId:portName" → Artifact

Artifact kinds include:
	•	Scalar:number, Scalar:boolean, Scalar:string
	•	Field:number, Field:vec2, Field:color
	•	PhaseMachine
	•	Spec:*
	•	Program:RenderTree

Artifacts are the “intermediate representation” of your compiled patch.

⸻

4) Field (compile-time, per-element parameterization)

Fields produce per-element values deterministically:
	•	e.g. origin positions per stroke
	•	delays per stroke
	•	colors per stroke
	•	durations per particle emitter element

Key invariant:
	•	Fields are seeded and scene-aware
	•	Fields can be evaluated once at compile time (typical)
	•	They represent parameterization more than motion itself

Design implication:
	•	Fields are how you encode “modes,” “variance,” “cohesion,” and “identity sets.”

⸻

5) Spec (declarative intent)

A Spec is a stable declaration:
	•	scene constraint
	•	field bundle
	•	phase structure
	•	mode selection
	•	archetype-specific knobs

Specs are not executable until compiled.

⸻

6) Compiler (Spec → Program)

Archetype compilers:
	•	evaluate relevant fields
	•	compute timing envelopes
	•	build deterministic runtime behavior
	•	output Program<RenderTree>
	•	optionally provide timeline metadata (finite/infinite, cue points)

This is where you keep things “true to the root”:
	•	specs declare what
	•	compilers decide how to realize it

⸻

7) Program (runtime behavior)

A Program is the runtime signal:
	•	input: time (and runtime ctx)
	•	output: RenderTree

Optional:
	•	timeline() hint (finite duration, cue points, infinite window recommendation)

Programs should ideally be:
	•	deterministic w.r.t. seed + scene + time (except live audio)
	•	scrub-safe (time can jump)

⸻

8) RenderTree (render-agnostic output)

RenderTree is a declarative set of draw instructions:
	•	groups
	•	shapes (paths, circles, etc.)
	•	transforms
	•	styles

Renderer reads RenderTree each frame and updates the DOM/canvas.

RenderTree is crucial because it decouples:
	•	animation logic from rendering technology

⸻

C. The compilation pipeline in detail

Here’s the path from Patch → Program:

Step 1: Validate + index connections
	•	ensure each block type exists in registry
	•	detect multiple writers into one input port (unless you allow merges later)
	•	index incoming connections by toPort

Step 2: Type-check connections
	•	from.kind === to.kind (strict early)
	•	later: allow explicit converter blocks, not implicit casts

Step 3: Topological sort
	•	blocks compile in dependency order
	•	detect cycles with a clear error

Step 4: Compile blocks

For each block:
	•	gather input artifacts from upstream ports
	•	validate required inputs are present
	•	call block compiler → outputs
	•	store outputs in artifact map

Step 5: Resolve output program
	•	prefer patch.output
	•	else infer a unique unused Program:RenderTree output
	•	error if ambiguous

Step 6: Return CompileResult
	•	success: { program, compiledPorts }
	•	failure: { errors, decorations }

Why this architecture matters

It scales. Adding new archetypes or effects becomes:
	•	new blocks + compilers
	•	no changes to the compiler core

⸻

D. Runtime/Player responsibilities (and why)

1) Playback policy (player-owned)

Player controls:
	•	play/pause
	•	loop mode (loop/pingpong/clamp)
	•	rate
	•	scrubbing behavior
	•	smoothing for seeks

Player should not “know” about archetypes.

2) Timeline awareness (program-supplied)

Programs can optionally provide:
	•	duration (finite)
	•	cue points (phases, beats)
	•	infinite window (recommended loop window)

Player uses this to:
	•	auto-size loops
	•	show phase markers
	•	default loop settings intelligently

3) Hot swap + continuity (instrument mode)

When patch recompiles:
	•	do not cut
	•	wrap old+new in a transition program
	•	default transition = crossfade
	•	advanced transitions = blocks

This is foundational for “live instrument” behavior.

⸻

E. Editor UX subsystems and their boundaries

1) Lanes
	•	Simple mode: fixed lane layout (Scene → Phases → Fields → Spec → Compile → Program → Output)
	•	Advanced mode: user can add/rename/reorder lanes

Key boundary:
	•	lanes guide palette + organization
	•	lanes do not change semantics

2) Palette ranking
	•	lane affinity + descriptor priority + search + recents + context boosts
	•	hard gate: type compatibility when invoked from a port

3) Auto-wiring
	•	only when unique, safe, cycle-free, non-overwriting
	•	strict ambiguity rules: “no guessy wiring”

4) Error decorations

Compiler errors are mapped to:
	•	blocks
	•	ports
	•	wires
	•	global banner

This is what makes it “impossible to break” without modal dialogs.

⸻

F. Control Surfaces (expression layer)

Control Surface is a stable, user-facing instrument panel:
	•	sections: Time / Motion / Style / Chaos
	•	each control emits a typed value
	•	bindings map controls → targets (params/ports)
	•	mappings include clamp/curve/scale and explicit combine rules

Control surface must:
	•	never change topology
	•	be deterministic
	•	be scrub-safe
	•	be explainable (hover highlights bindings)

This is what makes the system fun for non-technical users without compromising correctness.

⸻

G. Macros (structural expansion)

Macro (your definition) is a block-library concept:
	•	user drops “LineMorph Archetype Macro”
	•	it expands into a subgraph (dozens of blocks prewired)
	•	it usually also installs a default Control Surface

Macros are the on-ramp.
Blocks are the atoms.

⸻

H. Ambient/infinite pivot (how it plugs into the architecture)

This pivot primarily affects:
	•	Player policy defaults (loop-first, never stop)
	•	Program timeline hints (finite/infinite)
	•	transitions (hot swap wrapper programs)
	•	seed scheduling (seed stream/playlist)
	•	audio sources (live signals → modulators)

It does not require you to rewrite the kernel.
It’s largely:
	•	new block types
	•	new runtime wrappers
	•	UX defaults

⸻

If you say next, I’ll do the third message: Must-haves (the absolutely critical pieces to implement next to keep momentum and avoid architectural debt), with a clear priority order and why each is essential.