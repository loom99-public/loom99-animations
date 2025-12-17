2️⃣ Non-Negotiable Architectural Invariants

(Canonical constraints; breaking any of these is a design regression)

This document is the “constitution” of the system. It’s what you use to evaluate every feature, refactor, optimization, and UI choice.

⸻

A. Purity and Determinism

A1. No hidden randomness
	•	All stochasticity must be seeded and explicit.
	•	Any block that uses randomness must:
	•	declare its seed inputs (directly or via a seed bus/context)
	•	be deterministic given (seed, timeCtx, elementId, params)

Forbidden: implicit Math.random(), time-based entropy, non-reproducible noise.

⸻

A2. Programs are pure functions of time (and explicit context)
	•	Program<T> is semantically: (timeCtx, evalCtx) → T
	•	Evaluation must have no side effects (no mutation of global state, no IO).
	•	All stateful behavior must be encapsulated in explicit state primitives (see Section C).

⸻

A3. Identical patch + identical inputs = identical output

Given:
	•	same patch graph
	•	same assets/resources
	•	same seeds
	•	same time mode and time inputs

…the system must produce the same results across runs.

Allowed variance: small floating-point differences across machines if you accept it; if not, you must standardize numeric policies (precision, transcendentals).

⸻

B. Buses: Meaning, Typing, and Order

B1. Bus world is immutable

A bus is either:
	•	Signal (continuous-time program), or
	•	Field (per-element program)

Once created, it cannot switch worlds.

⸻

B2. Bus typing is structured and enforced
	•	Every bus has a TypeDesc = (world, domain, semantics?, unit?).
	•	Publishers and listeners must be:
	•	directly compatible, or
	•	connected through an explicit adapter chain.

Forbidden: “any Field connects to any Field,” or “we’ll coerce it.”

⸻

B3. Buses are first-class compilation nodes
	•	Buses are not “post-processing glue.”
	•	Compiler must treat each bus value as a node in the dependency graph.
	•	Consumers see the compiled bus artifact, not a partial/uncombined set.

⸻

B4. Publisher order is explicit and stable (sortKey)
	•	Combine semantics that depend on order (last, layer) must use publisher ordering.
	•	Publisher ordering is defined only by:
	•	primary: sortKey
	•	tie-break: stable publisherId

Forbidden: relying on topo sort output, array insertion order, or UI layout.

⸻

B5. Silent value is explicit and independent of combine mode
	•	Every bus has a silent value.
	•	If a bus has no enabled publishers, it evaluates to silent.
	•	Combine mode never changes the silent default.

⸻

C. State and Feedback

C1. State exists only in explicit memory primitives

“Memory boundaries” are the only legal source of state:
	•	Delay / DelayLine
	•	Integrate
	•	SampleHold (only if truly stateful)
	•	History buffers / State blocks

Everything else must remain pure.

⸻

C2. Feedback loops are only legal through memory boundaries
	•	Any combinational cycle in the dependency graph is illegal.
	•	Cycles are permitted only if the cycle crosses an explicit memory boundary.
	•	Cycle legality is decided at compile time by graph analysis (SCC).

Forbidden: runtime “it kinda works,” or hidden one-frame delays.

⸻

C3. Scrub-safe vs performance is explicit and preserved
	•	Every stateful primitive must define:
	•	performance mode semantics (evolve from previous state using dt)
	•	scrub mode semantics (reintegrate deterministically from initial conditions, or declare not scrub-safe)

The UI must surface this distinction—never hide it.

⸻

D. Lazy Fields and Element Domains

D1. Fields are defined over an explicit Element Domain
	•	A Field is meaningful only with an explicit domain:
	•	deterministic id set
	•	deterministic evaluation order
	•	Dense evaluation must be domain-driven, not “just N.”

Forbidden: Field(seed,n) => array as the semantic contract.

⸻

D2. Stable identity: per-element variation and state use id, never index
	•	Any deterministic “random” / noise / hash uses element id.
	•	Any per-element state is keyed by id.

Index is only “where you write output,” not identity.

⸻

D3. Domain mismatch is an error unless remapped explicitly
	•	Combining Field publishers requires matching domain tags.
	•	Cross-domain mixing requires an explicit remap block/adapter.

Forbidden: silently zipping mismatched arrays.

⸻

D4. Evaluation is batch-first and WASM-ready
	•	The Field runtime must support dense batch evaluation into typed buffers.
	•	No per-element JS object allocation on hot paths.
	•	API shape must permit a future WASM backend without redesign.

⸻

E. UI Integrity Constraints

E1. Nothing important is invisible
	•	Any adapter chain must be inspectable.
	•	Any perception/interpretation transform must be inspectable.
	•	Any publisher ordering must be visible and controllable.

Forbidden: invisible conversions, hidden priority rules, magic defaults that change behavior.

⸻

E2. You can’t create invalid connections
	•	UI must prevent illegal wiring/binding:
	•	type incompatibility
	•	world mismatch without explicit lift
	•	illegal cycles (or warn+block at compile time with clear diagnostics)

⸻

E3. Live editing must not catastrophically break playback
	•	A patch change either:
	•	compiles and swaps in cleanly, or
	•	fails compilation and continues running last-known-good output with clear error feedback

Forbidden: partial fallback compilation that hides errors.

⸻

F. Composition and Reuse

F1. Composites preserve semantics
	•	Expanding a composite must reproduce the same behavior (modulo IDs if explicitly documented).
	•	Replacing a subgraph with a composite must preserve external connections and meaning.
	•	Composite internals remain inspectable.

⸻

F2. Every abstraction remains composable
	•	Blocks compose into composites.
	•	Composites can publish/consume buses.
	•	Composites can be nested.
	•	No “special-case” graph islands that can’t be reused.

⸻

G. Performance as Architecture (not afterthought)

G1. Performance-critical paths are data-oriented
	•	Hot loops operate on typed buffers, not object graphs.
	•	Expression graphs compile to fused evaluators.
	•	Compiler and runtime avoid intermediate allocations.

⸻

G2. Predictable costs
	•	No operation should have “surprising” O(N×K×M) costs without being explicit and surfaced (e.g., Reduce, Remap, heavy geometry sampling).

⸻

The Enforcement Mechanism

These invariants are not “guidelines.” They should be enforced by:
	•	Type system rules (direct vs convertible vs invalid)
	•	Graph validation (SCC cycle checks)
	•	Registry metadata (memoryBoundary, scrubSafe, busEligible)
	•	UI affordances (visibility of adapters, ordering, transforms)
	•	Compiler contracts (buses as nodes, explicit silent values)
	•	Runtime contracts (explicit domain, id-based determinism)

