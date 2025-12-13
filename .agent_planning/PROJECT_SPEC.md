# Project Specification: Unified Animation Editor

**Generated**: 2025-12-12
**Last Updated**: 2025-12-12
**Scenario**: Greenfield Component
**Status**: Active

---

## 1. Project Overview

### Purpose

The Unified Animation Editor is a visual programming environment for creating animations using the V4 animation framework. It provides a drag-and-drop "patch bay" interface where users wire together typed blocks (scene sources, fields, time transforms, dynamics, composition, rendering) to build complex animations without writing code.

The editor solves the problem of animation exploration and design by making the V4 framework's abstractions tangible and visual. Instead of writing functions and wiring signals manually in TypeScript, users manipulate blocks in lanes, see immediate preview feedback, and export working V4 programs.

### Target Users

- **Developers** exploring animation design patterns before coding them
- **Technical designers** who understand animation concepts but prefer visual tools
- **Animation researchers** experimenting with new techniques and archetypes
- **Documentation creators** who want reproducible, tweakable animation examples

This is a development and exploration tool, not an end-user consumer product.

### Core Goals

1. **Enable rapid animation prototyping** - Create working V4 animations 5-10x faster than manual coding
2. **Make V4 abstractions learnable** - Visual representation of Signal, Event, Field, scan helps users understand the kernel
3. **Prevent broken states** - Typed slots, safe defaults, and adapters ensure animations always run
4. **Support archetype exploration** - Templates (Particles, Line Drawing, etc.) demonstrate patterns users can modify
5. **Generate portable code** - Export JSON patches that compile to V4 programs, usable outside the editor

### Success Criteria

**User Experience Metrics:**
- User can create a working particle animation in <5 minutes using the Particles template
- User can swap blocks (e.g., change field generators) and see live preview update
- User can save and reload patches without loss

**Technical Metrics:**
- 90% type safety: blocks only connect to compatible slots
- <100ms preview update latency after block connection
- Zero runtime crashes from invalid patch configurations (safe defaults prevent NaN/undefined)

**Adoption Metrics:**
- 3+ distinct animation archetypes working in editor (Particles, Line Drawing, Typewriter)
- JSON export format can be loaded and compiled in standalone V4 runtime
- At least 2 non-author developers successfully create animations using the editor

---

## 2. Architecture

### System Overview

The editor is a React-based visual programming environment with three core subsystems:

1. **Editor UI** - Drag-and-drop patch bay interface (React + MobX state management)
2. **Type System** - Runtime slot type checking and adapter insertion logic
3. **Compiler** - Transforms patch JSON into executable V4 Program<RenderTree>

**Execution Flow:**

```
User drags blocks → MobX store updates → Type checker validates →
Compiler builds V4 program → Preview renders → User sees output
```

The editor maintains a **mutable observable graph** (MobX) of blocks and connections. When the graph changes, a pure compilation step transforms it into an immutable V4 program that can be sampled at any time `t`.

**Loose Coupling Design:**

The editor's type system (Block, Slot, Lane) is intentionally decoupled from V4 kernel types (Signal, Event, Field). This allows:
- Editor abstractions to remain stable while V4 kernel evolves
- Multiple blocks to compile to the same V4 primitive
- Editor to add convenience types (e.g., "Color Palette" block) without modifying V4

**Compilation Target:**

Editor patches compile to **functions and closures** that run in the browser. The compilation step produces:
- Signal<A> functions: `(t, ctx) => A`
- Event streams: sorted arrays of occurrences
- A root Program<RenderTree> that drives the preview canvas

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Editor Route                               │
│  ┌───────────────┐  ┌─────────────────┐  ┌──────────────────┐     │
│  │ BlockLibrary  │  │   Patch Bay      │  │   Inspector      │     │
│  │  (categories) │  │   (7 lanes)      │  │  (block params)  │     │
│  │               │  │                  │  │                  │     │
│  │ - Scene       │  │  Scene ▭─▭─▭     │  │  Selected: Ease  │     │
│  │ - Fields      │  │  Fields ▭─▭      │  │  ┌──────────────┐ │     │
│  │ - Time        │  │  Time ▭─▭─▭─▭    │  │  │ type: 'quad' │ │     │
│  │ - Events      │  │  Events          │  │  │ direction:   │ │     │
│  │ - Dynamics    │  │  Dynamics        │  │  │   'inOut'    │ │     │
│  │ - Compose     │  │  Compose ▭─▭     │  │  └──────────────┘ │     │
│  │ - Render      │  │  Render ▭        │  │                  │     │
│  │ - Adapters    │  │                  │  │                  │     │
│  └───────┬───────┘  └────────┬─────────┘  └──────────────────┘     │
│          │                   │                                       │
│          └───────────────────┴──────────────────┐                   │
│                                                  ▼                   │
│                                         ┌──────────────┐             │
│                                         │ EditorStore  │             │
│                                         │   (MobX)     │             │
│                                         └──────┬───────┘             │
│  ┌───────────────────────────────────────────┐│                     │
│  │          Transport Bar                     ││                     │
│  │  ▶ ■  ━━━━●━━━━  speed: 1x  seed: 42  ││                     │
│  └────────────────────────────────────────────┘│                     │
│                                                 ▼                     │
│                                         ┌──────────────┐             │
│                                         │  Compiler    │             │
│                                         │ (patch→V4)   │             │
│                                         └──────┬───────┘             │
│                                                 │                     │
│                                                 ▼                     │
│                                         ┌──────────────┐             │
│                                         │ V4 Program   │             │
│                                         │  Signal<RT>  │             │
│                                         └──────┬───────┘             │
│                                                 │                     │
│                                                 ▼                     │
│                                         ┌──────────────┐             │
│                                         │   Preview    │             │
│                                         │   Canvas     │             │
│                                         └──────────────┘             │
└─────────────────────────────────────────────────────────────────────┘

External Dependencies:
  • V4 Kernel (Signal, Event, scan, rand, RenderTree)
  • dnd-kit (drag-drop)
  • MobX (observable state)
```

### Component Responsibilities

#### EditorStore (MobX)
- **Purpose**: Central observable state for the patch bay graph
- **Key responsibilities**:
  - Store blocks, connections, lane assignments
  - Provide observables for UI reactivity
  - Enforce graph invariants (no cycles, valid connections)
  - Serialize/deserialize patch JSON
- **Dependencies**: None (pure data)
- **Exposes**: Observable blocks, connections, selected block, methods to add/remove/connect

#### PatchBay
- **Purpose**: Visual representation of the 7-lane patch bay
- **Key responsibilities**:
  - Render lanes with typed slots
  - Handle drag-drop of blocks into slots
  - Display connections between blocks
  - Highlight drop targets based on type compatibility
- **Dependencies**: EditorStore (reads blocks/connections), dnd-kit (drag-drop)
- **Exposes**: React component

#### BlockLibrary
- **Purpose**: Searchable catalog of available blocks
- **Key responsibilities**:
  - Display blocks by category (Scene, Fields, Time, etc.)
  - Provide drag handles for blocks
  - Show block thumbnails and descriptions
  - Filter by search term
- **Dependencies**: EditorStore (to add blocks on drag)
- **Exposes**: React component

#### Inspector
- **Purpose**: Property editor for selected block
- **Key responsibilities**:
  - Display block parameters as editable controls
  - Clamp values to safe ranges
  - Update EditorStore on parameter changes
  - Show block documentation
- **Dependencies**: EditorStore (reads/writes selected block params)
- **Exposes**: React component

#### Transport
- **Purpose**: Playback controls and global settings
- **Key responsibilities**:
  - Play/pause animation
  - Scrub timeline
  - Set global seed, speed multiplier
  - Trigger snapshot/export
- **Dependencies**: EditorStore (reads/writes playback state)
- **Exposes**: React component

#### Compiler
- **Purpose**: Transform patch JSON into V4 Program
- **Key responsibilities**:
  - Walk block graph from Render lane backwards
  - Instantiate block behaviors (functions/closures)
  - Wire Signal/Event/Field connections
  - Produce executable Program<RenderTree>
- **Dependencies**: EditorStore (reads graph), V4 kernel (Signal, Event, etc.)
- **Exposes**: `compile(store: EditorStore, seed: number): Program<RenderTree>`

#### Preview
- **Purpose**: Render animation output
- **Key responsibilities**:
  - Sample compiled Program at current time
  - Render RenderTree to canvas
  - Handle play/pause/scrub from Transport
- **Dependencies**: Compiler (gets Program), V4 kernel (RenderTree → pixels)
- **Exposes**: React component with canvas ref

### Data Flow

**Critical User Workflow: "User Creates Particle Animation"**

1. **User clicks "Particles" template button**
   - Editor calls `store.loadTemplate('particles')`
   - Store populates lanes with pre-wired blocks:
     - Scene lane: `SVGPathSource` → `SamplePoints` adapter
     - Fields lane: `RadialOrigin`, `LinearStagger`, `RandomRadius`
     - Time lane: `PhaseMachine` (entrance/hold/exit)
     - Compose lane: `PerElementTransport`
     - Render lane: `ParticleRenderer`

2. **Store updates observable graph**
   - MobX fires reactions
   - PatchBay re-renders, showing blocks in lanes
   - Compiler is triggered (autorun on graph changes)

3. **Compiler builds V4 program**
   - Walks graph from Render lane backwards
   - For each block:
     - Instantiate behavior (e.g., `RadialOrigin` → Field<Point>)
     - Connect inputs from upstream blocks
   - Produces `Program<RenderTree>` with signal `(t, ctx) => RenderTree`

4. **Preview samples and renders**
   - RAF loop calls `program.signal(currentTime, context)`
   - Gets RenderTree (list of circles with positions/colors)
   - Renders to canvas using V4 renderer

5. **User tweaks parameters**
   - Selects `RadialOrigin` block in PatchBay
   - Inspector shows `{ centerX, centerY, radius }` sliders
   - User drags `radius` slider
   - Store updates block params (observable)
   - Compiler re-runs (autorun)
   - Preview updates immediately

6. **User exports patch**
   - Clicks "Export" in Transport
   - Store calls `serialize()` → clean JSON
   - Downloads `particles-animation.json`
   - JSON can be loaded later or compiled standalone

**Type Safety Enforcement:**

When user drags block to incompatible slot:
1. DragOverlay highlights valid drop targets (type-compatible slots)
2. User releases block over invalid slot
3. `onDragEnd` handler checks `canConnect(block.outputs, slot.type)`
4. If invalid, block snaps back to origin (no connection made)
5. If valid, connection is created in store

**Adapter Auto-Insertion (Phase 3-4):**

When user connects incompatible types with known adapter:
1. User drags `Field<Point>` output to `Signal<Point>` input
2. Type checker finds `FieldToSignal` adapter
3. Editor inserts adapter block inline (visible in graph)
4. Connection becomes: `Field → FieldToSignal → Signal`

---

## 3. Technology Stack

### Language: TypeScript 5.9
**Rationale**:
- Existing codebase uses TypeScript 5.9
- Type safety critical for editor (block types, slot types, V4 integration)
- Excellent React + MobX support
- Team expertise (already using in V4 kernel and gallery)

**Alternatives considered**:
- Plain JavaScript: Rejected (type safety is core to "impossible to break" goal)

### Frontend Framework: React 19
**Rationale**:
- Already used in gallery (React 19.2.0)
- Mature ecosystem for UI components
- Excellent dev tools and testing support
- Team familiarity

**Alternatives considered**:
- Vue, Svelte: Rejected (no compelling reason to introduce new framework, React already integrated)

### State Management: MobX 6.15
**Rationale**:
- Already used in gallery (mobx 6.15.0, mobx-react-lite 4.1.1)
- Mutable observable graph is natural fit for patch bay (nodes and edges change)
- Autorun reactions simplify compiler integration (recompile on graph change)
- Less boilerplate than Redux for this use case

**Alternatives considered**:
- Redux: Rejected (immutable updates awkward for graph mutations, more boilerplate)
- Zustand: Rejected (less mature, MobX already in use)
- React Context: Rejected (no reactivity, manual optimization needed)

**ADR**: See ADR-001 below for detailed justification.

### Drag-and-Drop: dnd-kit
**Rationale**:
- Modern TypeScript-first API
- Accessible by default (keyboard navigation)
- Supports complex drag scenarios (sensors, modifiers, collision detection)
- Well-maintained, active community
- Better than react-dnd (legacy, class-based API)

**Alternatives considered**:
- react-dnd: Rejected (older API, more boilerplate, less TypeScript support)
- react-beautiful-dnd: Rejected (unmaintained, drag lists only)
- Custom drag implementation: Rejected (significant effort, accessibility concerns)

**ADR**: See ADR-004 below.

### Build Tool: Vite 7.2
**Rationale**:
- Already configured in gallery (vite 7.2.4)
- Fast HMR (critical for editor with live preview)
- Built-in TypeScript support
- Excellent dev experience

**Alternatives considered**: None (Vite already integrated and working well)

### Testing: Vitest 4 + Testing Library
**Rationale**:
- Already configured in gallery (vitest 4.0.15, @testing-library/react 16.3.0)
- Fast test execution (native ESM, parallel)
- Vite integration (share config)
- Testing Library for React component integration tests
- Vitest for unit tests (graph logic, compiler)

**Alternatives considered**: Jest (rejected, slower, Vite integration less mature)

### Rendering: SVG (editor UI) + Canvas (animation preview)
**Rationale**:
- **SVG for editor**: Block shapes, connection lines benefit from SVG's declarative API and easy styling
- **Canvas for preview**: V4 animations target canvas (performance, pixel control)
- Hybrid approach keeps concerns separated

**Alternatives considered**:
- Canvas for everything: Rejected (editor UI harder to implement, accessibility worse)
- SVG for preview: Rejected (V4 animations use canvas, performance issues for particles)

### Database: None
**Rationale**:
- Patches stored as JSON files (download/upload)
- No user accounts, no server-side storage
- Simplicity: file system is the database

### Key Libraries & Dependencies

- **dnd-kit** (npm): Drag-and-drop - accessible, TypeScript-first, modern API
- **mobx** (npm): Observable state - mutable graph reactivity
- **mobx-react-lite** (npm): React bindings for MobX - hooks-based, lightweight
- **react** (npm): UI framework - already in use, mature
- **react-dom** (npm): React renderer - required for React
- **vite** (npm): Build tool - already configured, fast HMR
- **vitest** (npm): Test runner - Vite integration, fast
- **@testing-library/react** (npm): Component testing - user-centric assertions
- **typescript** (npm): Type system - type safety for blocks, slots, V4 integration

**No additional external dependencies** for Phase 1-3. Future phases may add:
- `zustand` or `immer` if undo/redo requires immutable snapshots
- `react-json-view` for debug inspector

### Infrastructure

- **Development**: Local dev server (`pnpm dev`, Vite binds to 0.0.0.0 per project CLAUDE.md)
- **Production**: Static build deployed alongside gallery (same Vite app, `/editor` route)
- **Hosting**: Same as gallery (TBD, likely Vercel/Netlify for static hosting)
- **File storage**: Browser download/upload (no server)

**Rationale**:
- Editor is part of gallery app (not separate monorepo package)
- Simplicity: no backend, no database, no auth
- Cost: $0 hosting (static site)

---

## 4. Development Workflow

### Version Control
- **Git workflow**: Feature branches (merge to main/master after review)
- **Commit messages**: Conventional commits (feat:, fix:, docs:, refactor:)
- **Branch protection**: Manual merges (solo developer initially, no forced rules)

**Rationale**: Existing project uses Git, conventional commits help with changelog generation, feature branches isolate work.

### Package Management
- **Tool**: pnpm (per project CLAUDE.md)
- **Lock files**: Committed to repo (reproducible builds)

**Rationale**: pnpm is faster and more disk-efficient than npm/yarn, lock files ensure consistent dependencies across machines.

### Task Running
- **Tool**: `just` (per project CLAUDE.md)
- **Script location**: Justfile in repo root

**Rationale**: Project prefers `just` over npm scripts for task running.

### Code Quality Tools
- **Linting**: ESLint (already configured in gallery)
- **Formatting**: No explicit formatter configured yet (add Prettier in Phase 2)
- **Type checking**: TypeScript compiler (`tsc -b`)
- **Pre-commit hooks**: None currently (defer to Phase 2-3)

**Configuration files**: `.eslintrc.js` (existing), `tsconfig.json` (existing)

### Testing Approach

- **Framework**: Vitest (already configured)
- **Test levels**:
  - **Unit tests**: Graph logic (add block, connect blocks, validate types), compiler (patch → V4 program)
  - **Integration tests**: React components (drag block, update param, preview updates)
  - **No E2E tests**: Editor is dev tool, E2E overkill for Phase 1-3
- **Mocking strategy**:
  - Mock V4 renderer for preview tests (test that correct RenderTree is produced, not canvas pixels)
  - Use real MobX store (integration tests should test real reactivity)
- **Coverage goals**: No hard target, focus on core logic (graph mutations, compiler correctness)
- **CI execution**: All tests on every commit (Vitest is fast)

**Philosophy**: Write tests alongside code (not TDD, but not "tests later"). Add tests for bugs.

### CI/CD
- **Platform**: None initially (local testing only)
- **Pipeline stages**: TBD (defer to Phase 5-6 when deploying editor publicly)
- **Deployment triggers**: Manual for now

**Rationale**: Early prototype, CI overhead not justified yet. Add when team grows or public deployment needed.

---

## 5. Architecture Decisions

### ADR-001: MobX for Patch Bay Graph State
**Date**: 2025-12-12
**Status**: Accepted

**Context**:
The patch bay graph is a mutable data structure (blocks, connections, positions) that changes frequently (drag, connect, delete, update params). We need a state management solution that:
1. Handles fine-grained reactivity (UI updates when specific block changes)
2. Supports mutable updates (graph algorithms easier with mutation)
3. Integrates with React
4. Triggers side effects (compiler re-runs when graph changes)

**Decision**: Use MobX 6.15 with observable classes for EditorStore.

**Options Considered**:

1. **MobX** (Chosen)
   - **Pros**: Mutable observables (natural graph operations), autorun for compiler, fine-grained reactivity, already in use
   - **Cons**: Learning curve for new contributors, less popular than Redux

2. **Redux**
   - **Pros**: Immutable updates (easier to reason about), popular ecosystem, time-travel debugging
   - **Cons**: Immutable graph updates verbose/awkward, boilerplate (actions, reducers), no autorun (need manual effect subscriptions)

3. **Zustand**
   - **Pros**: Simpler API than Redux, immutable updates, TypeScript support
   - **Cons**: No autorun, not already in use, less mature than MobX

**Rationale**:
- Graph mutations (add block, connect edges) are natural with mutable observables
- MobX autorun perfect for compiler integration: `autorun(() => compile(store.blocks))`
- Fine-grained reactivity avoids re-rendering entire patch bay on single block param change
- Already in project dependencies (zero setup cost)
- Immutable graph updates (Redux/Zustand) require complex diffing/reconciliation

**Consequences**:
- **Positive**: Fast development, natural graph operations, automatic compiler re-runs
- **Negative**: MobX magic less explicit than Redux, learning curve for contributors unfamiliar with observables
- **Risks**: Serialization requires care (observables can't be JSON.stringified directly, need `toJS()`)

---

### ADR-002: Pull-Based Execution Model
**Date**: 2025-12-12
**Status**: Accepted

**Context**:
The editor compiles patches into V4 programs that produce animations. We need to choose how programs execute:
- **Push-based**: Events trigger state updates, UI subscribes to state changes
- **Pull-based**: UI samples program at time `t`, program computes result on-demand

**Decision**: Use pull-based execution: `Signal<A> = (t: Time, ctx: Context) => A`

**Options Considered**:

1. **Pull-based** (Chosen)
   - **Pros**: Matches V4 kernel design, enables scrubbing (sample any `t`), pure/deterministic, no state management
   - **Cons**: May recompute values (less efficient for complex signals)

2. **Push-based**
   - **Pros**: Efficient (compute once, push to subscribers), familiar event-driven model
   - **Cons**: Scrubbing requires state snapshots, stateful (harder to reason about), doesn't match V4

**Rationale**:
- V4 kernel is pull-based (`Signal<A> = (t) => A`)
- Scrubbing is critical for animation editor (user drags timeline, sees output at any `t`)
- Pull-based enables time-travel debugging (sample at `t=0, t=1, t=2` independently)
- Purity simplifies testing (same `t` always produces same result)

**Consequences**:
- **Positive**: Scrubbing works trivially, pure functions easier to test, matches V4 philosophy
- **Negative**: Performance overhead if signals recompute unnecessarily (mitigate with memoization in V4 kernel)
- **Risks**: Complex signals (e.g., scan over 10k events) may be slow (profile and optimize if needed)

---

### ADR-003: Hybrid Block Representation (JSON + Behavior Classes)
**Date**: 2025-12-12
**Status**: Accepted

**Context**:
Blocks in the editor have both data (parameters, connections) and behavior (how they compile to V4 functions). We need a representation that:
1. Serializes to JSON for save/export
2. Supports runtime behavior (compile to Signal, Event, etc.)
3. Allows type checking and validation

**Decision**: Use hybrid representation:
- **Data**: Plain JSON objects (`{ id, type, params, connections }`)
- **Behavior**: Registry of block classes/factories keyed by `type`

**Options Considered**:

1. **Hybrid (JSON + Registry)** (Chosen)
   - **Pros**: Clean JSON serialization, decoupled data/behavior, extensible (add new block types)
   - **Cons**: Indirection (type string → behavior lookup), registry must be maintained

2. **Class Instances Only**
   - **Pros**: OOP-friendly, behavior and data co-located
   - **Cons**: Serialization awkward (toJSON/fromJSON for each class), harder to extend

3. **Pure JSON + Interpreter**
   - **Pros**: No classes, purely data-driven
   - **Cons**: Interpreter complex, type safety harder, behavior spread across codebase

**Rationale**:
- JSON is required for save/export (version-controlled patches)
- Behavior must be functions/closures (compile to V4 Signal, Event)
- Decoupling data and behavior allows JSON to stay clean (no function serialization hacks)
- Registry pattern extensible (plugins can register new block types)

**Consequences**:
- **Positive**: Clean JSON, easy serialization, extensible block system
- **Negative**: Indirection (type string → factory lookup), registry must be populated at startup
- **Risks**: Type string typos at runtime (mitigate with TypeScript literal types and validation)

---

### ADR-004: dnd-kit over react-dnd
**Date**: 2025-12-12
**Status**: Accepted

**Context**:
Drag-and-drop is core to the editor UX. We need a library that:
1. Supports dragging blocks from library to patch bay slots
2. Provides accessible drag-and-drop (keyboard support)
3. Handles complex scenarios (custom sensors, collision detection)
4. Has good TypeScript support

**Decision**: Use dnd-kit (modern, TypeScript-first drag-and-drop library)

**Options Considered**:

1. **dnd-kit** (Chosen)
   - **Pros**: TypeScript-first, accessible, modern hooks API, active maintenance, supports custom sensors
   - **Cons**: Newer (less Stack Overflow content), less popular than react-dnd

2. **react-dnd**
   - **Pros**: Battle-tested, large community, many examples
   - **Cons**: Class-based API (pre-hooks), less TypeScript support, more boilerplate

3. **react-beautiful-dnd**
   - **Pros**: Beautiful default animations, simple API
   - **Cons**: Unmaintained (archived), limited to lists, doesn't support our use case (2D grid of slots)

4. **Custom implementation**
   - **Pros**: Full control, no dependency
   - **Cons**: Significant effort, accessibility hard to get right, reinventing wheel

**Rationale**:
- dnd-kit's TypeScript API fits our codebase (TypeScript 5.9)
- Accessibility built-in (keyboard navigation, screen reader support)
- Supports our use case: drag from library (vertical list) to patch bay (2D grid of slots)
- Active maintenance (react-dnd less actively developed)
- Modern hooks-based API (matches React 19)

**Consequences**:
- **Positive**: Good TypeScript support, accessible, modern API, active maintenance
- **Negative**: Less Stack Overflow/tutorial content (newer library), team needs to learn dnd-kit patterns
- **Risks**: Library abandonment (mitigate: healthy contributor activity, modern API easier to fork if needed)

---

### ADR-005: Editor as Gallery Route (Not Separate Package)
**Date**: 2025-12-12
**Status**: Accepted

**Context**:
The editor could be:
1. A separate npm package in a monorepo
2. A route within the existing gallery app
3. A standalone app in a separate repo

**Decision**: Implement editor as a `/editor` route within the gallery app

**Options Considered**:

1. **Gallery Route** (Chosen)
   - **Pros**: Simplicity (one app, one build, one deploy), shared dependencies, fast development
   - **Cons**: Coupled to gallery (harder to extract later), larger bundle size

2. **Monorepo Package**
   - **Pros**: Decoupled, reusable, independent versioning
   - **Cons**: Monorepo setup overhead (pnpm workspaces), shared deps complexity, slower development

3. **Separate Repo**
   - **Pros**: Complete independence, separate deploy
   - **Cons**: Duplicate dependencies (V4 kernel), no shared components, maintenance overhead

**Rationale**:
- Editor and gallery share V4 kernel and React infrastructure (no duplication)
- Gallery is dev tool, editor is dev tool (similar audience, similar deployment needs)
- Simplicity trumps decoupling for prototype phase (can extract later if needed)
- One Vite build, one deploy, one set of dependencies

**Consequences**:
- **Positive**: Fast setup, shared V4 kernel, unified dev/build/test workflow
- **Negative**: Gallery bundle size increases (mitigate with code splitting), editor coupled to gallery structure
- **Risks**: If editor grows large, may need extraction to separate package (but not a Phase 1-3 concern)

---

### ADR-006: Start with Loose Types, Tighten Incrementally
**Date**: 2025-12-12
**Status**: Accepted

**Context**:
Type safety is critical to the "impossible to break" goal, but full TypeScript + runtime type checking from day 1 may slow prototyping.

**Decision**: Start with loose types (TypeScript interfaces, basic runtime checks), tighten incrementally (branded types, exhaustive validation, runtime parsers).

**Options Considered**:

1. **Loose → Tight** (Chosen)
   - **Pros**: Faster prototype, iterate on design, tighten when patterns stabilize
   - **Cons**: Tech debt (need to retrofit types), possible runtime errors during development

2. **Tight from Day 1**
   - **Pros**: Prevent bugs early, enforce correctness
   - **Cons**: Slower development, may over-engineer before understanding requirements

**Rationale**:
- Working prototype is priority for Phase 1 (visual feedback > perfect types)
- Type requirements will emerge from usage (don't prematurely design type system)
- TypeScript prevents most errors (runtime validation secondary)
- Tech debt acceptable if we commit to tightening by Phase 3-4

**Consequences**:
- **Positive**: Faster initial development, flexibility to change block types
- **Negative**: Runtime errors possible (mitigate with defensive coding), tech debt to repay later
- **Risks**: If types never tighten, "impossible to break" goal fails (mitigation: make Phase 3 type safety a hard requirement)

---

### ADR-007: Defer Adapter Auto-Insertion to Phase 3-4
**Date**: 2025-12-12
**Status**: Accepted

**Context**:
Adapter blocks bridge incompatible types (Field<A> → Signal<A>, Event<A> → Signal<A>). Auto-insertion (editor inserts adapter when user connects incompatible types) improves UX but adds complexity.

**Decision**: Phase 1-2 require manual adapter placement. Phase 3-4 add auto-insertion.

**Options Considered**:

1. **Manual Adapters → Auto-Insertion** (Chosen)
   - **Pros**: Simpler Phase 1, visible adapters help users learn type system
   - **Cons**: More drag-and-drop steps initially

2. **Auto-Insertion from Day 1**
   - **Pros**: Better UX immediately
   - **Cons**: Complex type inference, adapter registry, risk of incorrect adapters

**Rationale**:
- Manual adapters force users to understand type system (learning aid)
- Auto-insertion requires type inference graph search (complexity)
- Phase 1 goal is working prototype, not perfect UX
- Visible adapters in graph clarify compilation process

**Consequences**:
- **Positive**: Simpler Phase 1 implementation, users learn type system
- **Negative**: More drag steps for users, less "magical" UX
- **Risks**: Users frustrated by manual adapters (mitigate: good documentation, clear error messages)

---

## 6. Implementation Roadmap

**Complexity Scores**:
- **Small**: 1-3 files, straightforward logic, <1 day for experienced dev
- **Medium**: 4-8 files, moderate complexity, 1-3 days
- **Large**: 9+ files, complex interactions, 3-5 days

---

### Phase 1: Core Editor UI Shell
**Goal**: Render empty editor layout with lanes and basic drag-and-drop scaffolding

**Deliverables**:
- Editor route at `/editor` in gallery app
- 7 lanes rendered (Scene, Fields, Time, Events, Dynamics, Composition, Render)
- Empty BlockLibrary (categories visible, no real blocks yet)
- Empty Inspector (placeholder for selected block)
- Transport bar (static UI, no playback yet)
- Basic MobX store (blocks array, connections array, no behavior)

**Acceptance criteria**:
- Navigate to `http://localhost:5173/editor` shows patch bay with 7 labeled lanes
- Lanes have distinct colors/styling for visual separation
- BlockLibrary shows category headers (Scene, Fields, Time, etc.)
- Transport bar renders (play button, scrubber, seed input - all non-functional)
- No TypeScript errors, app builds successfully

**Estimated effort**: Medium (setting up layout, routing, basic MobX store)

---

### Phase 2: Block Library + Drag-and-Drop
**Goal**: Users can drag blocks from library to patch bay and see them placed in lanes

**Deliverables**:
- BlockLibrary populated with 5-10 example blocks (at least 1 per major category)
- Drag-and-drop with dnd-kit (drag block from library, drop into lane)
- EditorStore tracks blocks and positions
- PatchBay renders blocks as colored rectangles with labels
- Inspector shows selected block's type and ID (no param editing yet)

**Acceptance criteria**:
- User drags "RadialOrigin" from library, drops into Fields lane, block appears
- Blocks persist in store (refresh loses them, but during session they stay)
- Clicking block selects it (visual highlight)
- Inspector displays selected block info
- Multiple blocks can exist in same lane

**Estimated effort**: Medium (dnd-kit integration, block rendering, selection state)

---

### Phase 3: Type System + Manual Adapters
**Goal**: Blocks have typed input/output slots, editor prevents incompatible connections

**Deliverables**:
- Slot type definitions (SceneSource, Field<T>, Signal<T>, Event<T>, RenderTree)
- Block definitions include input/output slot types
- Connection validation (can only connect compatible types)
- Adapter blocks available in library (Field→Signal, Event→Signal, Scene→Targets)
- Visual feedback for valid/invalid drop targets during drag

**Acceptance criteria**:
- User can connect `RadialOrigin` (Field<Point>) to `FieldToSignal` adapter (Field<T> → Signal<T>)
- User cannot connect `RadialOrigin` directly to `PhaseMachine` (incompatible types)
- Drag highlights valid drop targets (green) and invalid targets (red/none)
- Adapter blocks render distinctly (different shape/color)
- Type errors display helpful message ("Cannot connect Field<Point> to Signal<Unit>, use FieldToSignal adapter")

**Estimated effort**: Large (type system design, connection validation, visual feedback, adapter blocks)

---

### Phase 4: V4 Kernel Integration + Preview
**Goal**: Compiled patches produce working V4 programs, preview shows animation output

**Deliverables**:
- Compiler module (`patch JSON → V4 Program<RenderTree>`)
- At least 1 fully working block per lane:
  - Scene: `SVGPathSource` (hardcoded logo SVG)
  - Fields: `RadialOrigin` (compile to Field<Point>)
  - Time: `PhaseMachine` (compile to Signal<PhaseSample>)
  - Composition: `PerElementTransport` (combine fields + time → Signal<Point[]>)
  - Render: `ParticleRenderer` (Signal<Point[]> → RenderTree)
- Preview canvas renders compiled program
- Transport controls work (play/pause, scrubber updates preview)

**Acceptance criteria**:
- User builds simple patch (Scene → Fields → Time → Compose → Render)
- Click "Compile" button (or auto-compile on graph change)
- Preview canvas shows animated particles
- Scrubbing timeline updates particle positions
- Changing block parameters (e.g., radial origin center) updates preview

**Estimated effort**: Large (compiler logic, block behavior implementation, preview rendering)

---

### Phase 5: Archetype Templates
**Goal**: One-click creation of complete animations (Particles, Line Drawing, Typewriter)

**Deliverables**:
- Template system (`store.loadTemplate(name)`)
- 3 templates:
  - **Particles**: SVGPathSource → SamplePoints → RadialOrigin + LinearStagger → PhaseMachine → ParticleRenderer
  - **Line Drawing**: SVGPathSource → ExtractStrokes → LinearStagger → PhaseMachine → PathMorphRenderer
  - **Typewriter** (simplified): TextSource → CharDelay → EventScript → TypewriterRenderer
- Template buttons in UI (top bar or BlockLibrary)
- Preview works for all 3 templates

**Acceptance criteria**:
- User clicks "Particles" button, patch bay populates with pre-wired blocks
- Preview shows working particle animation
- User can tweak template parameters (origin point, stagger delay) and see changes
- All 3 templates produce recognizable animations
- Templates demonstrate different archetypes (static geometry, path morph, event-driven text)

**Estimated effort**: Medium (template definitions, additional block implementations)

---

### Phase 6: Save/Load + Export
**Goal**: Users can save patches as JSON, reload them, and export for use outside editor

**Deliverables**:
- Serialization (`store.toJSON()`) with clean, version-controlled format
- Deserialization (`store.fromJSON(json)`)
- Download patch as JSON file (browser download)
- Upload JSON file to load patch (file input)
- Export format documented (JSON schema, usage example)

**Acceptance criteria**:
- User creates patch, clicks "Save", downloads `my-animation.json`
- JSON is human-readable, diff-friendly (no UUIDs in random order, stable key ordering)
- User clicks "Load", uploads JSON, patch recreates exactly (same blocks, connections, params)
- Exported JSON can be compiled standalone (provide example script: `compile(json)` → V4 program)
- JSON validates against documented schema

**Estimated effort**: Medium (serialization logic, file I/O, format documentation)

---

## 7. Future Considerations

### Deferred Decision: Undo/Redo

**Current approach**: No undo/redo (destructive edits, no history)

**When to revisit**:
- When users report frustration from accidental deletions (>5 user complaints)
- When patch complexity grows (>20 blocks common) and mistakes are costly
- Phase 6+ (after save/load works, so users can manually save checkpoints)

**Upgrade path**:
1. Use immutable state snapshots (immer + MobX or separate undo stack)
2. Capture snapshot on every "significant" action (add block, delete block, change param, connect)
3. Limit history depth (50-100 snapshots) to avoid memory issues
4. Add undo/redo UI (Cmd+Z keybinding, buttons in Transport)
5. Test with large patches (100+ blocks) to verify performance

**Estimated effort**: Medium (1-2 days, immutable snapshots + UI)

---

### Deferred Decision: Collaborative Editing

**Current approach**: Single-user, local-only (no server, no real-time sync)

**When to revisit**:
- When team grows beyond solo developer (multiple people editing same patches)
- When user requests "share link" feature
- Phase 7+ (after core editor stable)

**Upgrade path**:
1. Add server component (Node.js + WebSocket or Yjs CRDT)
2. Sync MobX store across clients (Yjs bindings for MobX exist)
3. Add presence indicators (who's editing which block)
4. Conflict resolution (last-write-wins or CRDT-based)
5. Add auth (if patches are private) or allow anonymous collaboration

**Estimated effort**: Large (3-5 days, backend + sync + auth)

**Alternative**: Use GitHub as "collaboration layer" (users share JSON files via PRs, no real-time sync)

---

### Deferred Decision: Video Export

**Current approach**: Preview renders to canvas in browser (no export)

**When to revisit**:
- When users want to share animations outside editor (embed in docs, social media)
- When animation quality/performance needs evaluation (export for A/B testing)
- Phase 7+ (after editor feature-complete)

**Upgrade path**:
1. Add "Export Video" button in Transport
2. Use MediaRecorder API (browser-native, WebM output)
3. Render animation at fixed FPS (30 or 60), record canvas frames
4. Provide download as .webm (or convert to .mp4 with ffmpeg.wasm)
5. Add export settings (resolution, FPS, duration, seed)

**Estimated effort**: Small-Medium (1-2 days, MediaRecorder integration)

**Alternative**: Screenshot export (single frame) simpler, may be sufficient for documentation use case

---

### Deferred Decision: Additional Archetypes

**Current approach**: 3 archetypes (Particles, Line Drawing, Typewriter) in Phase 5

**When to revisit**:
- When users request specific techniques (Glitch, Liquid, Kinetic, 3D Transform, Reveal Mask, Wave Ripple)
- When block library feels limited (<20 blocks total)
- Phase 7+ (after core editor and 3 templates stable)

**Upgrade path**:
For each new archetype:
1. Identify required blocks (Scene, Fields, Time, Dynamics, Render)
2. Implement missing blocks (e.g., "GlitchEffect", "LiquidSimulator", "3DProjection")
3. Create template (pre-wired block graph)
4. Add to template picker
5. Test with real use cases (does archetype feel natural in editor?)

**Estimated effort per archetype**: Medium (2-3 days, block implementation + template)

**Priority order** (based on user requests):
1. Reveal Mask (common UI pattern, straightforward)
2. Kinetic Typography (extends Typewriter)
3. Liquid/Particle systems (complex Dynamics, good stress test)
4. 3D Transform (requires 3D math, WebGL renderer)

---

### Deferred Decision: Plugin System

**Current approach**: All blocks hardcoded in editor, registry populated at build time

**When to revisit**:
- When external contributors want to add custom blocks without forking
- When archetype diversity explodes (>50 block types)
- Phase 8+ (after core stable, multiple users)

**Upgrade path**:
1. Define plugin API (register block type, provide factory, schema)
2. Dynamic block loading (import plugin JS at runtime)
3. Plugin discovery (registry URL or npm packages with tag)
4. Sandboxing (plugins run in iframe or worker to prevent breakage)
5. Plugin gallery (UI to browse, install, enable/disable)

**Estimated effort**: Large (5-7 days, plugin API + loader + sandboxing)

**Risks**: Security (malicious plugins), stability (buggy plugins crash editor), complexity (testing plugin interactions)

---

### Deferred Decision: Performance Optimization (Large Patches)

**Current approach**: No optimization, assume patches <50 blocks

**When to revisit**:
- When users create patches >100 blocks and editor lags (drag, preview update)
- When preview FPS drops below 30 (animation feels choppy)
- Phase 6+ (after features stable, optimization is premature before then)

**Upgrade path**:
1. **Editor rendering**: Virtualize block list (only render visible blocks in library), use React.memo for blocks
2. **Compiler**: Memoize compiled signals (cache block outputs, recompile only changed subgraphs)
3. **Preview**: Web Workers for compilation (keep UI thread responsive), throttle preview updates (compile max 10fps)
4. **Graph algorithms**: Optimize topological sort, connection lookup (use Map/Set instead of arrays)

**Estimated effort**: Medium (2-3 days, profiling + targeted optimizations)

**Measurement**: Profile with Chrome DevTools, set performance budgets (compile <50ms, render <16ms for 60fps)

---

### Deferred Decision: Accessibility (Keyboard-Only Editing)

**Current approach**: dnd-kit provides keyboard drag-and-drop, but full keyboard workflow untested

**When to revisit**:
- When accessibility audit fails (WCAG 2.1 AA compliance)
- When keyboard-only user reports issues
- Phase 6+ (after core features work with mouse)

**Upgrade path**:
1. Test with keyboard only (no mouse): can user drag block, connect, edit params, play preview?
2. Add keyboard shortcuts (Cmd+Z undo, Cmd+S save, Space play/pause, arrow keys navigate blocks)
3. Improve focus management (Tab cycles through blocks, Enter selects, Esc deselects)
4. Add ARIA labels (lanes, blocks, connections)
5. Screen reader testing (VoiceOver, NVDA)

**Estimated effort**: Medium (2-3 days, keyboard testing + ARIA + shortcuts)

**Note**: dnd-kit handles drag accessibility, but param editing (Inspector sliders) needs manual work

---

## 8. Open Questions & Risks

### Open Questions

1. **Q: What SVG assets should ship with editor for templates?**
   - **Impact**: Templates need SVG paths for Scene blocks (logo, text, shapes)
   - **Who decides**: User (project lead)
   - **Deadline**: Before Phase 5 (templates)
   - **Options**: (a) Use gallery's existing SVGs, (b) Create new minimal shapes (circle, square, star), (c) Load external SVGs (file upload)

2. **Q: Should editor preview be interactive (respond to hover, click)?**
   - **Impact**: If yes, need Input system (pointer, keys) in preview Context
   - **Who decides**: User (UX decision)
   - **Deadline**: Before Phase 4 (preview integration)
   - **Default assumption**: Non-interactive for Phase 1-4 (simplicity), add interactivity in Phase 6+ if needed

3. **Q: How should adapter blocks render visually?**
   - **Impact**: User needs to distinguish adapters from "real" blocks
   - **Who decides**: User (design decision)
   - **Deadline**: Before Phase 3 (adapters)
   - **Options**: (a) Different shape (diamond vs rectangle), (b) Different color (gray vs colored), (c) Icon badge, (d) Dashed border

4. **Q: Should compiler run automatically (autorun on graph change) or manually (user clicks "Compile")?**
   - **Impact**: Auto-compile = live preview (better UX), manual = explicit control (better for complex patches)
   - **Who decides**: User (workflow preference)
   - **Deadline**: Before Phase 4 (compiler)
   - **Recommendation**: Auto-compile with debounce (200ms) for Phase 1-4, add "manual mode" toggle in Phase 5+ if users want control

### Risks

1. **Risk: dnd-kit doesn't support our drag-and-drop UX (library → 2D grid of slots)**
   - **Likelihood**: Low (dnd-kit supports custom collision detection, many examples exist)
   - **Impact**: High (no drag-and-drop = no editor)
   - **Mitigation**: Prototype drag-and-drop in Phase 2 isolation (test dnd-kit before building full editor). If fails, fall back to react-dnd or custom implementation.
   - **Owner**: Lead developer

2. **Risk: Compiler complexity explodes (graph has cycles, type inference fails, adapter chains unbounded)**
   - **Likelihood**: Medium (graph cycles preventable with validation, but adapter chains could grow)
   - **Impact**: High (compiler crashes or produces wrong V4 programs)
   - **Mitigation**: (a) Prevent cycles with topological sort validation on connect, (b) Limit adapter chain depth (max 3 adapters), (c) Add compiler unit tests early (Phase 4)
   - **Owner**: Lead developer

3. **Risk: MobX reactivity causes infinite loops (autorun triggers graph change → autorun triggers again)**
   - **Likelihood**: Low (MobX detects cycles, but poor action boundaries can cause loops)
   - **Impact**: Medium (browser hangs, poor UX)
   - **Mitigation**: (a) Use MobX actions for all mutations (boundaries prevent loops), (b) Add MobX strict mode in dev (enforces action usage), (c) Test with React Strict Mode
   - **Owner**: Lead developer

4. **Risk: Preview performance poor (FPS <30 for simple animations)**
   - **Likelihood**: Low (V4 kernel fast, simple animations should run 60fps)
   - **Impact**: Medium (bad UX, users frustrated)
   - **Mitigation**: (a) Profile early (Phase 4 with first preview), (b) Throttle compiler re-runs (debounce 200ms), (c) Use Web Workers for compilation if needed (Phase 6+)
   - **Owner**: Lead developer

5. **Risk: JSON export format changes between phases (breaking backward compatibility)**
   - **Likelihood**: Medium (format will evolve as features added)
   - **Impact**: Medium (users can't load old patches)
   - **Mitigation**: (a) Add format version field (`{ version: 1, blocks: [...] }`), (b) Write migration logic for old versions, (c) Validate JSON on load (fail gracefully with error message), (d) Keep test fixtures for old formats
   - **Owner**: Lead developer

6. **Risk: Type system too rigid (users can't build creative patches, feel constrained)**
   - **Likelihood**: Low (adapters provide escape hatches, typed slots are flexible)
   - **Impact**: Medium (editor feels limiting, users abandon)
   - **Mitigation**: (a) User testing in Phase 3-4 (can users build desired animations?), (b) Add "Any" type for experimental blocks (escape hatch), (c) Collect feedback on type constraints
   - **Owner**: Lead developer + user testers

---

## Appendix A: Glossary

**Adapter Block**: A block that converts between incompatible types (e.g., Field<A> → Signal<A>). Adapters are visible in the patch bay graph.

**Archetype**: A category of animation technique (Particles, Line Drawing, Typewriter, etc.). Each archetype has a characteristic "shape" in the patch bay (which lanes are populated).

**Block**: A functional unit in the patch bay. Blocks have typed input/output slots and parameters. Examples: RadialOrigin, PhaseMachine, ParticleRenderer.

**Compiler**: The subsystem that transforms a patch (graph of blocks) into an executable V4 Program<RenderTree>.

**Event**: V4 kernel primitive for discrete occurrences. EventStream<A> is a sorted list of timestamped values.

**Field<A>**: V4 kernel primitive for per-element initial conditions. A function `(seed, n, ctx) => A[]` that generates N values.

**Lane**: A horizontal track in the patch bay. One of: Scene, Fields, Time, Events, Dynamics, Composition, Render.

**Patch Bay**: The central editor panel where users arrange blocks in lanes and connect them.

**Program<Out>**: V4 kernel type for complete animation. A program has a signal `(t, ctx) => Out` and an event stream.

**Pull-Based Execution**: Execution model where output is computed on-demand by sampling at time `t`. Opposite of push-based (event-driven).

**RenderTree**: V4 kernel type for backend-neutral rendering output. A tree of shapes (circles, paths, text) with positions, colors, transforms.

**Signal<A>**: V4 kernel primitive for continuous time-indexed values. A function `(t: Time, ctx: Context) => A`.

**Slot**: A typed connection point on a block. Slots have input/output direction and a type (e.g., Field<Point>, Signal<Unit>).

**Template**: A pre-wired patch that demonstrates an archetype. Clicking "Particles" template populates lanes with a working particle animation.

---

## Appendix B: References

- **V4 Kernel Types**: `gallery/src/anim-v4/core/types.ts` (Signal, Event, Field, Program, RenderTree definitions)
- **UI Design Doc (High-Level)**: `ui_example_docs/full_ui/ui_high_level_unified_iface.md` (single skeleton, archetypes as templates)
- **UI Design Doc (Specifics)**: `ui_example_docs/full_ui/ui_specifics.md` (lanes, slots, block taxonomy, adapter blocks)
- **MobX Documentation**: https://mobx.js.org/ (observable state, autorun, reactions)
- **dnd-kit Documentation**: https://docs.dndkit.com/ (drag-and-drop, sensors, collision detection)
- **React 19 Documentation**: https://react.dev/ (hooks, components, performance)
- **Vite Documentation**: https://vite.dev/ (build tool, HMR, configuration)
- **Vitest Documentation**: https://vitest.dev/ (test runner, mocking, coverage)

---

## Generation History

**Generated**: 2025-12-12
**Agent**: project-architect
**Scenario**: Greenfield Component (editor within existing gallery app)
**Handoff**: Ready for implementation. Next step: `/do:plan editor` to create detailed backlog and begin Phase 1.
