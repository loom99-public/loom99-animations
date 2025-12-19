How composites, buses, and compilation interact — and why composites should remain opaque at the authoring level but be lowered (expanded) into a flat executable IR during compilation.

This document is written as a canonical internal design spec. You should be able to hand this to a future contributor and have them understand why the architecture is the way it is, not just what to implement.

⸻

Design Document

Composite Transparency vs Compilation Lowering

(Buses, Lazy Fields, and Deterministic Execution)

⸻

1. Problem Statement

The system supports:
	•	Primitive blocks (atomic, directly compilable)
	•	Composite blocks (user-defined or built-in blocks composed of primitives)
	•	Bus-based signal routing (publish/subscribe independent of direct wiring)
	•	Lazy Field evaluation
	•	Live editing with no visual jank
	•	Deterministic execution

A critical architectural decision must be made:

Should composites be expanded into primitives before compilation, during compilation, or never expanded at all?

This decision directly impacts:
	•	Bus listener/publisher resolution
	•	Deterministic identity and state preservation
	•	Compiler complexity
	•	Optimization potential
	•	UX expectations around encapsulation

⸻

2. Goals and Non-Goals

Goals
	•	Composite blocks behave like first-class blocks in the editor
	•	Bus bindings work seamlessly through composites
	•	Live patch edits do not break state or cause visual jank
	•	Compiler remains optimizable and performant
	•	Architecture scales to:
	•	scoped buses
	•	WASM backends
	•	aggressive compile-time optimization

Non-Goals
	•	No requirement to preserve composite internals at runtime
	•	No requirement that composites remain hierarchical in executable form
	•	No hidden runtime indirection that obscures performance costs

⸻

3. Architectural Options Considered

Option 1: Expand composites early (editor-level)

Rejected
	•	Composites lose encapsulation
	•	Editor graphs explode in size
	•	Poor UX and poor authoring clarity

⸻

Option 2: Never expand composites (hierarchical compiler)

Viable in theory, rejected for now

Requires:
	•	Hierarchical dependency resolution
	•	Cross-boundary cycle detection
	•	Composite boundary ABI
	•	Nested bus scopes from day one
	•	More complex optimization passes

This is effectively writing a full hierarchical compiler frontend and optimizer.

⸻

Option 3: Expand composites during compilation (Chosen)
	•	Authoring graph remains hierarchical and clean
	•	Compiler lowers authored graph into a flat executable IR
	•	Composite expansion is:
	•	deterministic
	•	reversible in principle
	•	invisible to the user
	•	Enables aggressive optimization and simple execution model

⸻

4. Core Decision

Composites are opaque at the authoring level and are lowered (expanded) into primitives during compilation using a deterministic rewrite mapping.

This expansion:
	•	Does not mutate the authored patch
	•	Does not affect editor state
	•	Produces a flat IR suitable for execution and optimization

⸻

5. Conceptual Model

5.1 Two Representations of a Patch

Authored Patch (Editor Model)
	•	Hierarchical
	•	Contains:
	•	primitives
	•	composites
	•	macro blocks
	•	bus bindings attached to boundary ports
	•	Stable block IDs

Executable Patch (Compiler IR)
	•	Flat
	•	Contains:
	•	only primitives
	•	no composites
	•	Deterministic internal block IDs
	•	All buses resolved to concrete producers/consumers

⸻

6. Composite Boundary Contract (Critical)

A composite definition must explicitly declare:

6.1 Boundary Ports

Each exposed port on a composite maps to exactly one internal port reference.

CompositePortMap {
  externalPortId → internal { blockId, portId }
}

This is non-negotiable for:
	•	wires
	•	bus publishers
	•	bus listeners

If a composite output is conceptually “derived from many internals,” it must designate one internal anchor port.

⸻

7. Composite Expansion as a Rewrite Pass

7.1 Expansion Output

Composite expansion produces:

ExpandedPatch {
  blocks: PrimitiveBlock[]
  connections: Wire[]
  rewriteMap: PortRefRewriteMap
}

Where:

type PortRef = { blockId: string; portId: string }

type PortRefRewriteMap = {
  rewrite(ref: PortRef): PortRef | null
}


⸻

7.2 Rewrite Rules
	•	Primitive ports rewrite to themselves
	•	Composite boundary ports rewrite to their mapped internal port
	•	References to removed or invalid ports → compilation error

This rewrite map is the single source of truth for all downstream remapping.

⸻

8. Bus System Integration

8.1 Authoring-Time Bus Bindings

Bus publishers and listeners always attach to:
	•	primitive ports, or
	•	composite boundary ports

They never attach to internal composite ports unless authored inside the composite editor.

Example (authored):

listener = {
  busId: "phaseA",
  to: { blockId: "dotsComposite", portId: "radius" }
}


⸻

8.2 Compile-Time Remapping

After composite expansion:

rewrittenListener.to =
  rewriteMap.rewrite(listener.to)

Result:

{ blockId: "dotsComposite::render", portId: "size" }

The bus compiler never sees composites. It only sees rewritten primitive port refs.

⸻

9. Why This Solves the Original Bug

Observed failure mode:
	•	Bus listeners reference composite IDs
	•	Composite expansion removes those IDs
	•	Compiler cannot resolve listeners

With rewrite-map lowering:
	•	Composite IDs never reach the executable IR
	•	All bus bindings are rewritten to valid primitive ports
	•	Compiler logic remains unchanged

⸻

10. Cycle Detection and Memory Semantics

Because the executable graph is flat:
	•	SCC detection works exactly once, globally
	•	Cycles through composites are naturally detected
	•	Memory blocks inside composites are treated identically to top-level ones

No special “composite-aware” cycle logic is required.

⸻

11. State Preservation & No-Jank Editing

This architecture is a prerequisite for stable state mapping.

11.1 Stable Identity Strategy
	•	Composite instance ID is stable
	•	Internal primitive IDs derived deterministically:

compositeInstanceId + internalStableKey



11.2 During Live Edit
	•	Old compiled graph runs until new one is ready
	•	Rewrite map enables:
	•	state transfer
	•	field buffer reuse
	•	renderer continuity

⸻

12. Performance & Optimization Benefits

Flattened IR enables:
	•	FieldExpr fusion
	•	Dead code elimination
	•	Adapter chain simplification
	•	WASM-friendly lowering
	•	Batch materialization at render sinks

Hierarchical compilation would significantly complicate all of the above.

⸻

13. Relationship to Future Features

13.1 Composite-Scoped Buses (Future)

This architecture does not block them.

Future approach:
	•	Introduce bus scope metadata
	•	Lower scoped buses during expansion
	•	Rewrite bus IDs similarly to port refs

13.2 WASM Backend

Lowered IR is exactly what a WASM backend wants:
	•	Flat graph
	•	Explicit dependencies
	•	No runtime indirection through composites

⸻

14. Explicit Rejections

❌ Name-based late binding

Too fragile, ambiguous, and non-deterministic.

❌ Editor-level expansion

Destroys UX and compositional clarity.

❌ Runtime composite indirection

Adds overhead, blocks optimization, complicates scheduling.

⸻

15. Final Decision Summary

Authoring model
	•	Composites are opaque
	•	Bus bindings attach to composite boundary ports
	•	Editor graph remains clean and hierarchical

Compilation model
	•	Composites are deterministically lowered
	•	A rewrite map remaps all port references
	•	Compiler operates on a flat primitive-only IR

Outcome
	•	Buses work through composites
	•	Performance is preserved
	•	Architecture scales cleanly
	•	No hacks, no hidden magic

⸻

16. Implementation Checklist (Authoritative)
	•	Composite definitions declare explicit boundary port mappings
	•	expandComposites() returns { expandedPatch, rewriteMap }
	•	Rewrite map applies to:
	•	wires
	•	bus publishers
	•	bus listeners
	•	Compiler only sees primitive blocks
	•	No editor mutation during expansion
	•	Invalid rewrite → hard compile error

⸻

This design puts the issue to bed permanently and aligns with everything you care about:
determinism, performance, composability, and long-term extensibility.
