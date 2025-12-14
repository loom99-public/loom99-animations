# Composite Blocks: Design + UX/Engineering Plan

## Goal
Introduce *composite* blocks (user-defined blocks built from primitives/composites) with first-class creation, editing, replacement, and expansion in the editor—without breaking live patches.

## Current State
- Registry only has `form` metadata (`primitive | composite | legacy-composite | macro`); no mechanics for authoring/editing composites.
- Inspector/Library surfaces show forms/tags but cannot open composite internals.
- Blocks are single-layer; no nesting, no encapsulation, no inline editing.

## Requirements (from prompt)
- Create composites from selected connected primitives.
- Inspect/edit existing composites (see internals).
- Replace multiple primitives in a live patch with a composite (no interruption).
- Expand a composite back into parts live (no interruption).
- Cohesive UX that is intuitive and reliable.

## Concepts
- **Composite Definition**: `{ id, label, description, color, exposedInputs, exposedOutputs, graph: { nodes, edges }, form: 'composite' }`
- **Composite Instance** (placed block): references a definition id; has params (if defined), and is compiled to an inline subgraph at runtime.
- **Exposed Ports**: user-mapped ports from internal nodes to the composite’s external interface.
- **Inline Editor**: overlay or side panel that shows the composite’s internal graph for inspection/edit.

## Data Model
1) **Definition Storage**
   - New registry bucket: `COMPOSITE_DEFINITIONS` (user + built-in).
   - Each definition stores a subgraph of existing block types (primitives or composites), plus port exposure mapping.
   - Serializable to project file; assign IDs (UUID).
   - Tagging: `form: 'composite'`, `origin: 'user' | 'built-in'`, optional domains.

2) **Instance Representation**
   - Existing `Block` keeps `type`; composite types are `composite:<id>`.
   - When placed, instance references definition id; params default to exposed param set.
   - Autosave preserves reference only (not inlining into patch).

3) **Runtime Resolution**
   - For playback/compile, expand composites into subgraphs (like macro) but *inline* while keeping instance identity for edits (think “virtual nodes”).
   - Maintain mapping: composite instance id → internal node ids (stable) to support live edits.

## UX Flows
### A) Create Composite from Selection
1. User multi-selects connected blocks in PatchBay.
2. Toolbar/context action: “Create Composite”.
3. Dialog:
   - Name, description, color.
   - Expose ports: auto-suggest inputs with dangling edges and outputs with outgoing edges; allow manual add/remove.
   - Confirm creates definition + replaces selection with a composite instance wired to the same external connections.
4. Tag defaults: `form: 'composite'`, `origin: 'user'`, `sourceSelection: true`.

### B) Inspect/Edit Composite
1. Select a composite block → Inspector shows “Open Internals”.
2. Clicking opens inline editor:
   - Mode toggle over PatchBay OR drawer showing nested graph.
   - Shows internal nodes/edges with the composite’s exposed ports anchored.
   - Edits allowed: add/delete nodes, rewire, change exposed ports, change defaults/params.
3. Save updates the definition; live instances update via virtual graph mapping (hot reload).
4. Cancel reverts to previous definition snapshot.

### C) Replace Selection with Composite (Live)
1. Same as creation flow; upon confirm, selection is removed, composite instance inserted, connections remapped.
2. No playback interruption: compiler hot-reloads using the new definition.

### D) Expand Composite (Break Apart)
1. Action on composite instance: “Expand to Components”.
2. Replaces the composite with its internal nodes/edges in-place; reconnect external edges to the exposed ports’ mapped nodes.
3. Keep original instance params applied to exposed nodes if needed; preserve selection to allow undo.

### E) Manage Definitions
- Library tab: “Composites” section showing user/built-in composites.
- Context menu on definitions: rename, duplicate, delete (if unused), export/import.
- Visual badge on blocks indicating form.

## UI Additions
- Toolbar buttons:
  - “Create Composite” (enabled when multi-select has ≥1 connection).
  - “Expand Composite” on selected composite.
  - “Edit Composite” to open internals.
- Inspector:
  - Composite badge; buttons for Edit / Expand.
  - List of exposed ports + mapping summary.
- Library:
  - Form grouping already present; add user-created composites list.
- Inline Editor:
  - Breadcrumb (`Patch > Composite <Name>`), exit/save/cancel.
  - Exposed port rail on left/right to drag from/to internal nodes.

## Engine/Compiler Changes
- Composite definitions compiled to nested graphs; compiler must:
  - Inline composites recursively into primitives before codegen.
  - Detect cycles (composite referencing itself) and reject.
  - Cache expanded graphs per definition version.
  - Support hot-swap: on definition change, recompile affected instances without wiping patch state.

## Storage/Serialization
- Patch JSON gains `composites: CompositeDefinition[]`.
- Blocks referencing composites keep `type: 'composite:<id>'`.
- Import/export supports merging composite definitions (namespace collisions resolved by new IDs).

## Safety/Validation
- No legacy-composite inside composite creation (disallow until migrated).
- Cycle detection on definition graph + reference graph.
- Port exposure validation: only existing ports; type-consistent.
- Undo/redo snapshots around create/expand/edit.

## Iterative Implementation Plan
1) Data groundwork
   - Add `CompositeDefinition` type, registry bucket, serialization in patch.
   - Support `type: 'composite:<id>'` lookup in registry helpers.
2) Creation flow
   - Multi-select → “Create Composite” dialog → definition + replacement logic.
   - Connection remapping + exposed port auto-suggest.
3) Inline editing
   - Composite edit mode UI + save/cancel.
   - Definition update propagation to live instances via virtual graph map.
4) Expand composite
   - Replace instance with its internal nodes; reconnect external edges.
   - Undo/redo.
5) Library + inspector surfacing
   - Library composites section; badges; manage definition list.
   - Inspector actions + exposed-port view.
6) Compiler/runtime
   - Inline composites to primitives; hot reload on definition changes.
   - Cycle detection + error surfacing.
7) UX polish/tests
   - Keyboard shortcuts, toasts, validation, regression tests for create/edit/expand and compile integration.

## Risks & Mitigations
- **Cycles**: add DAG validation for composite references.
- **State loss on edits**: map internal node ids deterministically; reapply params on hot reload.
- **Performance**: cache expanded graphs; limit composite depth; warn on very large graphs.
- **Confusion with macros**: keep macros separate; composites are reusable blocks, macros are preset patches.

## Open Questions
- Parameter exposure model: allow defining composite-level params that map to internal params?
- Versioning: keep per-definition version for safe reload/undo?
- Access control: are user composites global per project or per patch?
