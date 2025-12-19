Test Matrix: Composite Lowering + RewriteMap + Buses + Lazy Fields

Goal: ensure composites remain opaque in authoring, are lowered deterministically at compile time, and all port references (wires + publishers + listeners) remain correct, with deterministic behavior and no jank regressions.

Format:
	•	ID — scenario
	•	Setup — authored patch structure
	•	Action — compile / edit / migrate
	•	Expected — correctness + determinism + UX guarantees
	•	Notes — edge cases, required assertions

⸻

A. RewriteMap correctness (structural)

A1 — Primitive passthrough
	•	Setup: patch with only primitive blocks; wires + bus pub/listeners
	•	Action: compile
	•	Expected: rewrite(ref) === ref for all PortRefs; compiled output identical to baseline
	•	Notes: proves rewrite-map is non-invasive

A2 — Single composite with one mapped input
	•	Setup: composite C exposes input radius mapped to internal RenderInstances2D.size
	•	Action: compile
	•	Expected: listener targeting {C, radius} rewrites to {C::render, size}
	•	Notes: verify compiled graph has no block with id C

A3 — Single composite with one mapped output
	•	Setup: composite C exposes output tree mapped to internal renderer tree
	•	Action: compile
	•	Expected: wire from {C, tree} rewrites to internal {C::render, tree}
	•	Notes: symmetry with inputs

A4 — Multiple composites, unique mappings
	•	Setup: two composites C1, C2 of same definition in one patch
	•	Action: compile
	•	Expected: rewrite maps C1.radius to C1::<stableInternalKey>.size, and similarly for C2; no cross-wiring
	•	Notes: verify determinism of internal IDs per instance

A5 — Nested composites (composite contains composite)
	•	Setup: composite Outer contains composite Inner
	•	Action: compile
	•	Expected: rewrite resolves boundary ports through both layers; final PortRef points to primitive
	•	Notes: should be recursive lowering; ensure no composite IDs survive

A6 — Deeply nested composites (stress)
	•	Setup: 5-level nesting; minimal ports
	•	Action: compile
	•	Expected: rewrite completes; compile time within budget; no stack overflow
	•	Notes: tail recursion or iterative lowering may be needed

A7 — Invalid boundary map (missing internal port)
	•	Setup: composite exposes radius but mapping points to nonexistent internal port
	•	Action: compile
	•	Expected: hard compile error: “Composite port mapping invalid: …”
	•	Notes: no fallbacks

A8 — Ambiguous boundary mapping (illegal)
	•	Setup: composite port tries to map to two internal targets (or is declared fanout)
	•	Action: compile
	•	Expected: rejected at definition validation: “Boundary port must map to exactly one internal PortRef”
	•	Notes: if internal fanout is needed, it must happen after the mapped internal anchor via wires

⸻

B. Bus bindings through composites

B1 — Listener targets composite boundary input
	•	Setup: listener {to: C.radius} ← phaseA
	•	Action: compile
	•	Expected: listener remaps to internal renderer size port; bus compile sees valid primitive targets

B2 — Publisher from composite boundary output
	•	Setup: composite outputs energyOut published to energy bus
	•	Action: compile
	•	Expected: publisher remaps to the internal source port

B3 — Multiple listeners to same composite port
	•	Setup: two buses both feed C.radius with different lenses/adapters
	•	Action: compile
	•	Expected: both listeners remap to same internal port; adapter chains preserved per-listener
	•	Notes: ensure deterministic combine of multiple bus contributions into a single port value (your bus model should prevent two listeners per port unless you allow multi-bind; if you disallow, this should error)

B4 — Multiple publishers to same bus, includes composites
	•	Setup: PhaseClock publisher + composite publisher both publish to phaseA with sortKeys
	•	Action: compile
	•	Expected: publisher ordering stable and respects sortKey; composite-origin publisher is remapped but retains sortKey
	•	Notes: verify sortKey doesn’t depend on internal IDs

B5 — Listener with lens stack on composite boundary
	•	Setup: C.radius listens to phaseA with lens MapRange(0..1 → 3..15)
	•	Action: compile and evaluate at multiple times
	•	Expected: output matches mapping; lens stack is applied after bus combine
	•	Notes: verify lens stack remains attached to listener after rewrite

B6 — Heavy adapter step via composite boundary
	•	Setup: composite port expects field:number but bus is signal:number; listener uses Broadcast adapter (heavy)
	•	Action: compile
	•	Expected: rewrite works; heavy adapter preserved; perf warning exists (if you have warnings) but compile succeeds
	•	Notes: ensures rewrite is type-agnostic; type system handles convertibility

B7 — Composite internal bus bindings (authored inside composite)
	•	Setup: composite definition contains internal bus bindings; outer patch also has bindings to composite boundary
	•	Action: compile
	•	Expected: internal bindings expand naturally and do not require rewrite (they already target internal ports); boundary bindings rewrite
	•	Notes: important separation between authored-inside vs authored-outside

⸻

C. Wires + buses together (mixed routing)

C1 — Composite boundary port wired + bus-bound (illegal or defined?)
	•	Setup: C.radius has both a wire input and a bus listener
	•	Action: compile
	•	Expected: Hard error unless you explicitly define precedence. Recommended: disallow double-driving.
	•	Notes: add explicit test for your chosen policy

C2 — Bus-driven parameter passes through internal wires
	•	Setup: boundary radius maps to internal node R, which then wires to renderer size
	•	Action: compile
	•	Expected: rewrite maps to {R, in} and internal wires propagate value
	•	Notes: proves boundary port mapping can point to non-renderer anchors

C3 — Wire into composite + internal bus usage
	•	Setup: wire from primitive into composite input; composite internal uses buses too
	•	Action: compile
	•	Expected: both remap correctly; no conflict

⸻

D. Deterministic identity & stable internal IDs (no-jank prerequisites)

D1 — Internal ID determinism across compiles
	•	Setup: same patch compiled twice with no changes
	•	Action: compile twice
	•	Expected: expanded primitive IDs identical; rewrite maps identical; evaluation identical
	•	Notes: fail if IDs depend on iteration order of object keys etc.

D2 — Internal ID stability under unrelated edits
	•	Setup: composite C plus another unrelated block
	•	Action: add/move/edit unrelated block, compile
	•	Expected: internal IDs for C unchanged
	•	Notes: critical for state preservation later

D3 — Internal IDs stable under composite definition edit (controlled change)
	•	Setup: composite C definition edited but preserves internal stable keys for existing nodes
	•	Action: modify definition (add a new internal node), compile
	•	Expected: existing internal node IDs unchanged; new node gets new deterministic ID
	•	Notes: requires “internalStableKey” scheme in composite defs

D4 — Listener rewrite stability across composite def edits
	•	Setup: listener targets composite boundary radius
	•	Action: edit composite internal mapping but keep boundary port name
	•	Expected: binding remains valid; rewritten target changes only if mapping changed intentionally
	•	Notes: assert: boundary ports are the stable API

⸻

E. Lazy Field evaluation correctness at renderer sink

E1 — RenderInstances2D materializes fields once per frame
	•	Setup: renderer consumes pos, size, fill, opacity fields
	•	Action: evaluate one frame; instrument counters
	•	Expected: each required field evaluated exactly once (per domain) per frame; buffers reused, not reallocated
	•	Notes: you can assert using a debug counter in FieldExpr evaluator

E2 — Shared subexpression across two renderer inputs (fusion/CSE)
	•	Setup: size = map(hash), opacity = map(hash) share the same hash field
	•	Action: evaluate frame
	•	Expected: hash computed once, reused (or at least not recomputed per consumer) depending on your caching strategy
	•	Notes: if you don’t implement CSE yet, mark this test as “expected fail / future”

E3 — FieldExpr depends only on id (time-invariant) caches across frames
	•	Setup: hashById driving color scatter
	•	Action: evaluate N frames
	•	Expected: buffers remain constant and reuse cached values; no per-frame recompute
	•	Notes: again, if not implemented yet, make it a perf TODO test

⸻

F. Cycle detection across composites (SCC correctness)

F1 — Cycle entirely within a composite, no memory block
	•	Setup: composite internal wiring forms a signal cycle without Delay/Integrate
	•	Action: compile
	•	Expected: compile error citing cycle path; points to composite instance context
	•	Notes: error should remain intelligible: “Cycle inside composite X…”

F2 — Cycle across composite boundary, no memory
	•	Setup: patch feeds composite output back into composite input via bus or wire
	•	Action: compile
	•	Expected: compile error; SCC detection sees it after lowering

F3 — Legal cycle with Delay in composite
	•	Setup: same as F2 but includes Delay block in the cycle path inside composite
	•	Action: compile
	•	Expected: success; cycle marked legal

⸻

G. Migration + backward compatibility (if relevant now)

G1 — Wire-only patch compiles unchanged
	•	Setup: legacy patch with wires, no buses, no composites
	•	Action: compile
	•	Expected: identical output vs baseline

G2 — Mixed patch versioning
	•	Setup: patch with composites + buses (v2 schema)
	•	Action: load/save/compile
	•	Expected: no loss of bindings; rewrite only at compile time; saved patch retains authored composite IDs

⸻

H. Error handling & diagnostics (must be good for your “no fallbacks” policy)

H1 — Listener targets missing port
	•	Setup: bus listener references {blockId, portId} that doesn’t exist (stale)
	•	Action: compile
	•	Expected: hard error: missing port; includes block label and port name

H2 — Rewrite produces null (unmappable)
	•	Setup: listener targets composite port that is not exposed/mapped
	•	Action: compile
	•	Expected: hard error: “Port not exposed by composite boundary: …”

H3 — Type mismatch after rewrite
	•	Setup: boundary port type changed in composite definition but listener expects old type
	•	Action: compile
	•	Expected: hard error with suggested adapter paths (if available)

⸻

I. Live-edit / “no jank” behavioral tests (high-level)

(These are integration tests that measure continuity rather than exact pixels.)

I1 — Hot swap keeps phase continuity
	•	Setup: phase-driven renderer
	•	Action: edit an unrelated block, recompile while running
	•	Expected: phase doesn’t reset; animation continues smoothly

I2 — Hot swap preserves state blocks
	•	Setup: patch contains Integrate or Delay inside a composite
	•	Action: edit a non-state part of composite, recompile
	•	Expected: state values persist; no snap-to-initial

I3 — Domain identity stability under mapper edits
	•	Setup: DomainN + PositionMapGrid + renderer
	•	Action: change spacing/origin
	•	Expected: instances move smoothly; no flicker/reordering

I4 — Domain count change is controlled and predictable
	•	Setup: DomainN with n changed
	•	Action: increase n
	•	Expected: old elements keep identity; new ones appear deterministically; no reshuffle

⸻

How to implement these tests efficiently

Recommended layers:
	1.	Pure unit tests
	•	rewriteMap correctness
	•	port mapping validation
	•	bus endpoint rewriting
	2.	Compiler integration tests
	•	compile expanded IR
	•	verify no composites remain
	•	SCC outcomes
	3.	Runtime determinism tests
	•	evaluate at fixed times with fixed seed
	•	compare numeric buffers / hashes
	4.	Performance guard tests (lightweight)
	•	assert buffer reuse (no allocations) using counters
	•	assert “evaluate each field once per frame” counters

⸻

Minimal “must-pass before shipping composites+buses”

If you want a concise gating list, these are the non-negotiables:
	•	A2, A4, A5 (rewrite correctness)
	•	B1, B4, B5 (buses through composites + ordering + lenses)
	•	D1, D2 (determinism)
	•	H2, H3 (hard errors, no fallbacks)
	•	I1, I2 (no jank continuity)

