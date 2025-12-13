# Archetype Templates (Superblocks) - Implementation Plan

## Goal

Create "superblocks" for each animation archetype (LineMorph, Particles, Glitch, etc.) that, when added, automatically populate the lanes with all necessary blocks pre-wired to produce a working animation.

**User experience**: Click "LineMorph" template → lanes fill with LogoScene, RadialOrigin, StaggerDelay, PhaseMachine, LineMorphSpec, CompileLineMorph, Renderer, all connected and ready to preview.

---

## Current State (as of this writing)

### What Exists

**Block System** (`gallery/src/editor/`):
- `blocks.ts` - Block definitions with inputs/outputs/params
- `store.ts` - EditorStore with `addBlock()`, `connect()`, `moveBlockToLane()`
- `types.ts` - Block, Connection, Lane, Slot types
- `BlockLibrary.tsx` - Draggable block palette
- `PatchBay.tsx` - Lane display with droppable zones
- `laneLayouts.ts` - Switchable lane layouts (Simple 5-lane, Detailed 9-lane)

**Existing Block Categories**:
- Scene: LogoScene, TextLayout, Selection
- Derivers: SampleTargets
- Fields: RadialOrigin, CascadeOrigin, StaggerDelay, DurationField, etc.
- Math: Constant, Add, Multiply, Lift
- Time: PhaseMachine, Clock
- Compose: Parallel, Sequence (placeholders)
- Render: Renderer, Compositor (placeholders)
- Adapters: FieldToScalar, ScalarToField

**What's Missing**:
- Archetype-specific Spec blocks (LineMorphSpec, ParticlesSpec, GlitchSpec...)
- Archetype-specific Compiler blocks (CompileLineMorph, CompileParticles...)
- Template definitions (which blocks + how they wire together)
- Template instantiation logic
- Template UI

---

## Implementation Plan

### Phase 1: Template Data Model

**File**: `gallery/src/editor/archetypeTemplates.ts`

```typescript
interface TemplateBlock {
  /** Temporary ID for wiring (e.g., "scene", "origin", "spec") */
  refId: string;
  /** Block type from registry */
  type: BlockType;
  /** Which lane to place in */
  laneId: LaneId;
  /** Initial params */
  params?: Record<string, unknown>;
}

interface TemplateConnection {
  /** Source block refId + slot */
  from: { refId: string; slotId: string };
  /** Target block refId + slot */
  to: { refId: string; slotId: string };
}

interface ArchetypeTemplate {
  id: string;
  name: string;
  description: string;
  /** Which archetype this implements */
  archetype: 'LineMorph' | 'Particles' | 'Glitch' | 'Liquid' | 'Kinetic' | 'Transform3D' | 'RevealMask' | 'WaveRipple' | 'Typewriter';
  /** Blocks to create */
  blocks: TemplateBlock[];
  /** Connections to make */
  connections: TemplateConnection[];
}
```

### Phase 2: Store Action

**Add to `store.ts`**:

```typescript
loadTemplate(template: ArchetypeTemplate): void {
  // 1. Create all blocks, mapping refId → real blockId
  const refToId = new Map<string, BlockId>();

  for (const tb of template.blocks) {
    const blockId = this.addBlock(tb.type, tb.laneId, tb.params);
    refToId.set(tb.refId, blockId);
  }

  // 2. Create all connections
  for (const conn of template.connections) {
    const fromId = refToId.get(conn.from.refId);
    const toId = refToId.get(conn.to.refId);
    if (fromId && toId) {
      this.connect(fromId, conn.from.slotId, toId, conn.to.slotId);
    }
  }
}
```

### Phase 3: Example Template (LineMorph)

```typescript
export const LINE_MORPH_TEMPLATE: ArchetypeTemplate = {
  id: 'line-morph',
  name: 'Line Morph',
  description: 'Animated line drawing with fold/unfold phases',
  archetype: 'LineMorph',
  blocks: [
    { refId: 'scene', type: 'LogoScene', laneId: 'scene', params: { logo: 'logo-01' } },
    { refId: 'targets', type: 'SampleTargets', laneId: 'scene' },
    { refId: 'phase', type: 'PhaseMachine', laneId: 'phase', params: { entrance: 1.5, hold: 0.5, exit: 1.0 } },
    { refId: 'origin', type: 'RadialOrigin', laneId: 'fields' },
    { refId: 'delay', type: 'StaggerDelay', laneId: 'fields', params: { maxDelay: 0.8 } },
    { refId: 'duration', type: 'DurationField', laneId: 'fields', params: { base: 0.6 } },
    { refId: 'spec', type: 'LineMorphSpec', laneId: 'spec' },
    { refId: 'compile', type: 'CompileLineMorph', laneId: 'program' },
    { refId: 'render', type: 'Renderer', laneId: 'output' },
  ],
  connections: [
    { from: { refId: 'scene', slotId: 'scene' }, to: { refId: 'targets', slotId: 'scene' } },
    { from: { refId: 'targets', slotId: 'targets' }, to: { refId: 'origin', slotId: 'targets' } },
    { from: { refId: 'targets', slotId: 'targets' }, to: { refId: 'delay', slotId: 'targets' } },
    { from: { refId: 'origin', slotId: 'origin' }, to: { refId: 'spec', slotId: 'origin' } },
    { from: { refId: 'delay', slotId: 'delay' }, to: { refId: 'spec', slotId: 'delay' } },
    { from: { refId: 'duration', slotId: 'duration' }, to: { refId: 'spec', slotId: 'duration' } },
    { from: { refId: 'phase', slotId: 'phase' }, to: { refId: 'compile', slotId: 'phase' } },
    { from: { refId: 'spec', slotId: 'spec' }, to: { refId: 'compile', slotId: 'spec' } },
    { from: { refId: 'compile', slotId: 'program' }, to: { refId: 'render', slotId: 'program' } },
  ],
};
```

### Phase 4: Template UI

**Option A**: Add "Templates" section to BlockLibrary
- Collapsible section at top of library
- Click template → calls `store.loadTemplate()`

**Option B**: Separate "New Animation" dialog
- Button in toolbar opens modal
- Shows archetype cards with descriptions
- Click creates from template

**Option C**: Draggable "superblocks" in library
- Templates appear as special blocks
- Drag to PatchBay → expands into full block graph

Recommend **Option A** for simplicity.

### Phase 5: Real Archetype Blocks

For templates to produce working animations, need real implementations:

1. **LineMorphSpec** block - outputs `Spec:LineMorph`
2. **CompileLineMorph** block - takes spec + phase, outputs `Program<RenderTree>`
3. Wire compiler block to actual V4 archetype compiler

This connects the block system to the existing V4 animation implementations in `gallery/src/anim-v4/`.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `gallery/src/editor/archetypeTemplates.ts` | CREATE - Template type + definitions |
| `gallery/src/editor/store.ts` | MODIFY - Add `loadTemplate()` action |
| `gallery/src/editor/blocks.ts` | MODIFY - Add LineMorphSpec, CompileLineMorph blocks |
| `gallery/src/editor/BlockLibrary.tsx` | MODIFY - Add Templates section |
| `gallery/src/editor/BlockLibrary.css` | MODIFY - Style Templates section |

---

## Prompt for Fresh Agent

```
Continue implementing archetype templates for the animation editor.

READ FIRST:
- ui_example_docs/foundational_slice/archetype-templates.md (this file)
- gallery/src/editor/blocks.ts (existing block definitions)
- gallery/src/editor/store.ts (EditorStore)
- gallery/src/editor/BlockLibrary.tsx (block palette UI)

GOAL: Users should be able to click an archetype (like "LineMorph") and have all necessary blocks automatically created in the lanes, wired together, ready to preview.

CURRENT STATE: Block system exists with drag-drop, lanes, connections. Missing: template definitions, loadTemplate() action, template UI, real archetype-specific blocks.

NEXT STEPS:
1. Create archetypeTemplates.ts with ArchetypeTemplate type
2. Add loadTemplate() action to store.ts
3. Create LINE_MORPH_TEMPLATE as first example
4. Add Templates section to BlockLibrary UI
5. (Later) Add real LineMorphSpec and CompileLineMorph blocks that connect to V4

Start with steps 1-4 (template system), defer step 5 (real compilation) for later.
```

---

## Dependencies

This feature depends on:
- Slice 2.5 block registry (done)
- Lane system with layouts (done)
- Connection system (done)

This feature enables:
- One-click animation creation
- Learning by example (users see how blocks wire together)
- Rapid prototyping
