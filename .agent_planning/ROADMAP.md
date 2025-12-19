# Project Roadmap

Last updated: 2025-12-19

---

## Phase 0: Lock Invariants

**Goal:** Make it impossible to accidentally violate the system's core truths.

### Topics

- **core-invariants** [PROPOSED]
  - Freeze and document: TimeCtx contract, Signal vs Field distinction, Bus immutability, Explicit state-only memory, Element Domain rules
  - Add compile-time assertions for world/domain mismatches, illegal cycles
  - Remove implicit wiring shortcuts, hidden time access, per-element eager APIs
  - Directory: `.agent_planning/core-invariants/`
  - Epic: `loom99-animations-44e`

---

## Phase 1: Bus-Aware Compiler Core

**Goal:** Make buses real in the compiler and runtime.

### Topics

- **bus-compiler** [PROPOSED]
  - Unified dependency graph (BlockOut nodes, BusValue nodes)
  - Deterministic ordering via sortKey + stable ID
  - Bus compilation pipeline: publisher collection, adapter application, combine
  - Signal buses end-to-end
  - SCC detection + memory block registry
  - Strict failure on illegal graphs
  - Directory: `.agent_planning/bus-compiler/`
  - Epic: `loom99-animations-1nu`

---

## Phase 2: Lazy Field Foundation

**Goal:** Get Field semantics right, permanently.

### Topics

- **lazy-fields** [PROPOSED]
  - FieldExpr DAG representation
  - Domain abstraction: stable IDs, ordering guarantees
  - Field combinators: map, zip, reduce (explicit only)
  - Lazy evaluation model: sink-driven materialization, dense batch evaluation
  - Field bus combination semantics
  - Domain mismatch hard errors
  - Directory: `.agent_planning/lazy-fields/`
  - Epic: `loom99-animations-6az`

---

## Phase 3: TimeRoot & Time Topology

**Goal:** Make time topology explicit and authoritative. The patch defines time, not the player.

### Topics

- **timemodel-types** [PROPOSED]
  - TimeModel types: FiniteTimeModel, CyclicTimeModel, InfiniteTimeModel
  - CompiledProgram interface with program + timeModel
  - Compiler returns TimeModel as first-class artifact
  - Player consumes TimeModel to configure itself
  - Spec: `feature_planning_docs/TimeRoot/0-PlayerTimeDesign.md`
  - Directory: `.agent_planning/time-model/`

- **timeroot-blocks** [PROPOSED]
  - FiniteTimeRoot, CycleTimeRoot, InfiniteTimeRoot blocks
  - Exactly one TimeRoot per patch (compile error otherwise)
  - TimeRoot defines patch topology: finite/cyclic/infinite
  - Compiler validates no conflicting topologies
  - Required outputs: timeModel, systemTime
  - Spec: `feature_planning_docs/TimeRoot/1-PlayerTimeConstraints.md`
  - Directory: `.agent_planning/timeroot-blocks/`

- **phaseclock-redesign** [PROPOSED]
  - PhaseClock becomes secondary/derived clock (never topology)
  - Takes tIn (Signal<time>) OR phaseIn (Signal<phase>)
  - Outputs: phase, u, wrap, cycleIndex
  - Modes: loop/pingpong/once (local, not patch-level)
  - No longer competes with player for time control
  - Scrub-safe classification
  - Spec: `feature_planning_docs/TimeRoot/3-PlayerTimePhaseClockChanges.md`
  - Directory: `.agent_planning/phaseclock-redesign/`

- **timeroot-ui** [PROPOSED]
  - Time Console replaces linear timeline
  - Finite: bounded progress bar (start/end)
  - Cyclic: phase ring with period display
  - Infinite: sliding window scope
  - Run/Freeze, Speed, Seed controls (always present)
  - TimeRoot picker in editor header
  - Scrubbing never resets state
  - Spec: `feature_planning_docs/TimeRoot/4-PlayerTimeRootUI.md`
  - Directory: `.agent_planning/timeroot-ui/`

---

## Phase 3.5: Phase & Loop Primitives

**Goal:** Make looping structural, not a UI trick.

### Topics

- **phase-primitives** [PROPOSED]
  - Derived phase blocks (stateless)
  - Stateful phase accumulators
  - Phase domain operations: wrap, quantize, fold, warp
  - Phase-trigger primitives
  - Cycle index signals
  - Clear scrub vs performance semantics
  - Directory: `.agent_planning/phase-primitives/`
  - Epic: `loom99-animations-cqy`

---

## Phase 4: Runtime Safety & Live Editing

**Goal:** Make the system unbreakable during play.

### Topics

- **live-editing** [PROPOSED]
  - Compile → validate → swap runtime
  - Program compatibility signatures
  - State mapping rules
  - Output crossfade fallback (only)
  - Error isolation and localization
  - Zero-frame freezes
  - Directory: `.agent_planning/live-editing/`
  - Epic: `loom99-animations-0yc`

---

## Phase 5: Bus Board UI

**Goal:** Replace lanes with a musical, legible control surface.

### Topics

- **bus-board-ui** [PROPOSED]
  - Bus Board layout
  - Bus rows with live visualization
  - Publisher inspection & ordering
  - Combine mode UI
  - Silent value editing
  - Binding UI (bus picker + lens)
  - Interpretation stack editor
  - Directory: `.agent_planning/bus-board-ui/`
  - Epic: `loom99-animations-rzm`

---

## Phase 6: Phase-Centric UX Polish

**Goal:** Make infinite time feel good.

### Topics

- **phase-ux** [PROPOSED]
  - Phase visualizations (rings, wraps)
  - Mode-specific UI (Scrub / Loop / Performance)
  - Default bus scaffolds
  - Tutorial integration
  - Performance mode layout
  - Directory: `.agent_planning/phase-ux/`
  - Epic: `loom99-animations-2fy`

---

## Phase 7: Composites & Reuse

**Goal:** Enable scale without complexity.

### Topics

- **composites** [PROPOSED]
  - Composite authoring
  - Internal bus exposure
  - Scoped buses (optional, gated)
  - Composite introspection
  - Migration-safe expansion
  - Directory: `.agent_planning/composites/`
  - Epic: `loom99-animations-xjl`

---

## Phase 8: First Release Polish

**Goal:** Ship something people can live inside.

### Topics

- **release-polish** [PROPOSED]
  - Default patch templates
  - Starter instruments
  - UX refinement
  - Documentation + tutorial polish
  - Performance tuning (hot paths only)
  - Directory: `.agent_planning/release-polish/`
  - Epic: `loom99-animations-bs5`

---

## Phase X: Demonstration & Outreach (Parallel Track)

**Goal:** Create accessible entry points for showcasing the animation system

### Topics

- **mobile-teaser-ui** [PROPOSED]
  - Functional mobile UI for on-the-go composing and demos
  - Teaser experience - does not require full functionality
  - Directory: `.agent_planning/mobile-ui/`
  - Epic: `loom99-animations-d44`

---

## Canonical Primitives Implementation

**Goal:** Build the foundational block set in correct order.

### Topics

- **domain-primitives** [PROPOSED]
  - DomainN, DomainFromSVGSample
  - Element identity contract, stable IDs
  - Directory: `.agent_planning/domain-primitives/`
  - Epic: `loom99-animations-utr`

- **position-mappers** [PROPOSED]
  - PositionMapGrid, PositionMapCircle, PositionMapLine
  - Count mismatch policies (wrap, crop, pad)
  - Directory: `.agent_planning/position-mappers/`
  - Epic: `loom99-animations-utr`

- **field-generators** [PROPOSED]
  - FieldConstNumber, FieldConstColor, FieldConstVec2
  - FieldHash01ById, FieldHashVec2ById
  - Directory: `.agent_planning/field-generators/`
  - Epic: `loom99-animations-41s`

- **field-combinators** [PROPOSED]
  - FieldMapNumber, FieldZipNumber
  - FieldZipVec2, FieldMapVec2
  - FieldFromSignalNumber (world-lift)
  - Directory: `.agent_planning/field-combinators/`
  - Epic: `loom99-animations-41s`

- **signal-primitives** [PROPOSED]
  - PhaseClock, PhaseMath, TriggerOnWrap
  - EnvelopeAD (STATEFUL)
  - DelaySignalNumber, IntegrateNumber (STATEFUL)
  - Directory: `.agent_planning/signal-primitives/`
  - Epic: `loom99-animations-41s`

- **renderer-primitives** [PROPOSED]
  - RenderInstances2D (primary Field sink)
  - LayerCombine
  - Batch field evaluation, typed buffers
  - Directory: `.agent_planning/renderer-primitives/`
  - Epic: `loom99-animations-2eo`

---

## Lenses System

**Goal:** Per-port perception stacks for shaping bus interpretation.

### Topics

- **lenses-core** [PROPOSED]
  - LensStack data model
  - Cast steps (type adapters) vs Shaper steps (feel transforms)
  - TypeDesc integration, from/to patterns
  - Directory: `.agent_planning/lenses-core/`
  - Epic: `loom99-animations-js3`

- **lens-step-library** [PROPOSED]
  - Numeric: MapRange, Clamp, Deadzone, Ease, Quantize, Slew (stateful), Softclip, Wavefold
  - Phase: Offset, Scale, Wrap/Fold, Window Gate, Warp, Quantize, Wrap Trigger
  - Trigger: Debounce, Pulse Stretch, Edge Detect, To Envelope
  - Color: Mix, Hue Shift, Palette Lookup
  - Vec2: Scale, Rotate, Clamp Length
  - World-changing: Broadcast, Reduce (heavy, explicit)
  - Directory: `.agent_planning/lens-step-library/`
  - Epic: `loom99-animations-js3`

- **lens-ui** [PROPOSED]
  - Lens Panel layout (per-port popover)
  - Add step menu (searchable, filtered)
  - Progressive disclosure (Basic vs Advanced)
  - Live preview (input/output sparklines)
  - Directory: `.agent_planning/lens-ui/`
  - Epic: `loom99-animations-js3`

---

## Starter Composite Library

**Goal:** Make good-looking ambient systems fast while keeping primitives small.

### Topics

- **arrangement-macros** [PROPOSED]
  - Grid Points, Circle Points, Line Points, SVG Sample Points
  - Directory: `.agent_planning/arrangement-macros/`
  - Epic: `loom99-animations-dkj`

- **variation-macros** [PROPOSED]
  - Per-Element Random, Phase Offset, Size Scatter, Rotation Scatter
  - Directory: `.agent_planning/variation-macros/`
  - Epic: `loom99-animations-dkj`

- **motion-macros** [PROPOSED]
  - Orbit Motion, Wave Displace, Breathing Scale
  - Directory: `.agent_planning/motion-macros/`
  - Epic: `loom99-animations-dkj`

- **color-macros** [PROPOSED]
  - Palette Drift, Per-Element Color Scatter
  - Directory: `.agent_planning/color-macros/`
  - Epic: `loom99-animations-dkj`

- **render-macros** [PROPOSED]
  - Dots Renderer (Ambient), Glyph/Path Instances Renderer
  - Directory: `.agent_planning/render-macros/`
  - Epic: `loom99-animations-dkj`

- **rhythm-macros** [PROPOSED]
  - Pulse → Envelope, Phase Wrap Pulse
  - Directory: `.agent_planning/rhythm-macros/`
  - Epic: `loom99-animations-dkj`

---

## Default Buses & Materialization

**Goal:** Auto-create essential buses and optimize field evaluation.

### Topics

- **default-buses** [PROPOSED]
  - Auto-create on new patch: phaseA, phaseB, energy, pulse, palette
  - Mark as origin: built-in for special UI treatment
  - Never inject into existing patches without user action
  - Directory: `.agent_planning/default-buses/`
  - Epic: `loom99-animations-6da`

- **field-materialization** [PROPOSED]
  - Batch-evaluate fields at renderer sinks
  - Typed buffers (Float32Array, Uint32Array)
  - Cache by (FieldExprId, DomainId, frameStamp)
  - Buffer reuse / arena allocation
  - Directory: `.agent_planning/field-materialization/`
  - Epic: `loom99-animations-6da`

---

## Explicit Deferrals (NOT v1)

These items are explicitly deferred to preserve v1 integrity:

- Timeline/keyframes
- Automatic randomness
- Implicit state
- Per-element JS scripting
- Advanced exports
- WASM execution backend (design-ready only)

---

## V4 Animation Migration (Existing Work)

**Goal:** Complete migration of animation techniques to V4 framework.

### Topics

- **technique-migration** [IN PROGRESS]
  - ✅ Technique 01: Line Drawing (line-morph)
  - ✅ Technique 02: Particles
  - ✅ Technique 03: Path Morph
  - ✅ Technique 04: Glitch
  - ✅ Technique 05: Liquid
  - ⚠️ Technique 06: Kinetic (partial) - Epic: `loom99-animations-45q`
  - ⚠️ Technique 07: 3D Transforms (partial) - Epic: `loom99-animations-boj`
  - ❌ Technique 08: Reveal Mask - Epic: `loom99-animations-ioh`
  - ❌ Technique 09: Wave Ripple - Epic: `loom99-animations-rou`
  - ⚠️ Technique 10: Typewriter (partial) - Epic: `loom99-animations-ca8`
  - Directory: `.agent_planning/v4-migration/`
