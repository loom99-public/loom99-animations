# Sprint Plan: Compositor Layer Infrastructure
Generated: 2025-12-14-022100
Based on: TASK-EVAL-compositor-layer-20251214.md

## Sprint Goal

Implement the core compositor infrastructure (TreeRewrite, Selection API, Compositor interface) enabling Program→Program transformations to be built.

## Scope

**In scope (this sprint):**
1. **TreeRewrite utilities** - Tree traversal, path-based operations, wrapping/replacement
2. **Selection API** - Selector types, selection resolution, stable ordering
3. **Compositor interface** - Compositor<Spec> type, ComposeCtx, composeProgram stacking

**Explicitly out of scope (future sprints):**
- Transform3DCompositor implementation (will use these primitives)
- Additional compositors (Mask, Glow, Deform)
- BoundsResolver integration (spec provides it, not critical path)
- Effect type consolidation (works as-is)
- Editor UI integration

## Work Items

### P0: TreeRewrite Utilities

**Files to create:**
- `gallery/src/anim-v4/core/treeRewrite.ts`

**Acceptance Criteria:**
- [ ] `traverse(tree)` generator yields all nodes with paths
- [ ] `getAt(tree, path)` retrieves node at path
- [ ] `replaceAt(tree, path, node)` returns new tree with node replaced (structural sharing)
- [ ] `wrapAt(tree, path, wrapper)` wraps node at path with wrapper function
- [ ] `findById(tree, id)` finds first node with matching id
- [ ] All functions are pure (no mutation)
- [ ] Types exported and usable by compositor code

**Technical Notes:**
- Transcribe from `feature_planning_docs/to-verify/future-work/2-compositor-treerewrite.md` lines 86-164
- Use existing DrawNode types from `editor/runtime/renderTree.ts` or define minimal compatible types
- Include `NodePath` type (readonly number[])
- Include `TraversalItem` interface for traverse() yields

**Implementation guidance:**
```typescript
// Core exports needed
export type NodePath = readonly number[];
export interface TraversalItem { node: DrawNode; path: NodePath; parent?; indexInParent? }
export function* traverse(tree: DrawNode): Generator<TraversalItem>
export function getAt(tree: DrawNode, path: NodePath): DrawNode
export function replaceAt(tree: DrawNode, path: NodePath, replacement: DrawNode): DrawNode
export function wrapAt(tree: DrawNode, path: NodePath, wrapper: (child: DrawNode) => DrawNode): DrawNode
export function findById(tree: DrawNode, id: string): { node: DrawNode; path: NodePath } | null
```

### P1: Selection API

**Files to create:**
- `gallery/src/anim-v4/core/selection.ts`

**Acceptance Criteria:**
- [ ] `Selector` type with all variants: all, byId, byTag, childrenOf, predicate
- [ ] `Selection` type with ids and paths arrays
- [ ] `select(tree, selector)` resolves selector to Selection
- [ ] Selection maintains stable traversal order
- [ ] `selectionSignature(ids)` produces stable hash for caching
- [ ] De-duplication: each node appears at most once in selection

**Technical Notes:**
- Transcribe from spec lines 51-61, 167-244
- Include `hash32` for FNV-1a hashing (lines 70-78)
- Include `orderSelectionById` helper (lines 399-403)

**Implementation guidance:**
```typescript
export type Selector =
  | { kind: "all" }
  | { kind: "byId"; ids: readonly string[] }
  | { kind: "byTag"; tag: string }
  | { kind: "childrenOf"; id: string }
  | { kind: "predicate"; test: (node: DrawNode) => boolean };

export interface Selection {
  ids: readonly string[];
  paths: readonly NodePath[];
}

export function select(tree: DrawNode, selector: Selector): Selection
export function selectionSignature(ids: readonly string[]): string
export function orderSelectionById(sel: Selection): Selection
```

### P2: Compositor Interface

**Files to create:**
- `gallery/src/anim-v4/core/compositor.ts`

**Acceptance Criteria:**
- [ ] `Compositor<Spec>` interface with `id` and `apply()` method
- [ ] `ComposeCtx` type with seed and compile context
- [ ] `CompositorSpecBase` with selector field
- [ ] `composeProgram(base, items, ctx)` stacks multiple compositors
- [ ] `StackItem<S>` type for compositor+spec pairs
- [ ] Types compatible with existing Program<T> from `anim-v4/core/types.ts`

**Technical Notes:**
- Transcribe from `1-compositor-layer.md` lines 204-214, 239-246, 420-433
- Import Program, CompileCtx, Seed from existing types
- Keep it minimal - this is the interface, not implementations

**Implementation guidance:**
```typescript
import { Program, CompileCtx, Seed } from './types';
import { RenderTree } from '../render/tree';
import { Selector } from './selection';

export interface Compositor<Spec> {
  id: string;
  apply(input: Program<RenderTree>, spec: Spec, ctx: ComposeCtx): Program<RenderTree>;
}

export interface ComposeCtx {
  seed: Seed;
  compile: CompileCtx;
}

export interface CompositorSpecBase {
  selector: Selector;
  order?: "selection" | "byId";
}

export interface StackItem<S> {
  compositor: Compositor<S>;
  spec: S;
}

export function composeProgram(
  base: Program<RenderTree>,
  items: readonly StackItem<any>[],
  ctx: ComposeCtx
): Program<RenderTree>
```

## Dependencies

**Internal (all satisfied):**
- `anim-v4/core/types.ts` - Program, CompileCtx, Seed (EXISTS)
- `anim-v4/render/tree.ts` or `editor/runtime/renderTree.ts` - DrawNode types (EXISTS)

**External:**
- None

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| DrawNode type mismatch | Medium | Use minimal compatible interface; document which model is canonical |
| TreeRewrite performance | Low | Spec's approach is already optimized; add caching in future if needed |
| Circular imports | Low | Keep new files independent; import only types, not implementations |

## Definition of Done (Sprint Level)

- [ ] All three files created with types and functions
- [ ] TypeScript compiles without errors
- [ ] Exports added to `anim-v4/core/index.ts` (or created if missing)
- [ ] Basic smoke test: create a Selection, wrap a node, compose two empty compositors
- [ ] No regressions: `pnpm build` and `pnpm test` pass
- [ ] Code follows spec document closely (easy to verify against spec)

## Testing Strategy

**Unit tests (recommended but not blocking):**
- `treeRewrite.test.ts`: traverse, getAt, replaceAt, wrapAt with sample trees
- `selection.test.ts`: select with each Selector variant
- `compositor.test.ts`: composeProgram with mock compositors

**Smoke test (minimum):**
```typescript
// In any test or console
import { traverse, wrapAt } from './treeRewrite';
import { select } from './selection';
import { composeProgram } from './compositor';

const tree: DrawNode = { id: 'root', kind: 'group', children: [
  { id: 'a', kind: 'shape', geom: {} },
  { id: 'b', kind: 'shape', geom: {} }
]};

// TreeRewrite works
for (const item of traverse(tree)) console.log(item.node.id, item.path);

// Selection works
const sel = select(tree, { kind: 'byTag', tag: 'foo' });
console.log(sel.ids);

// Compositor stacking works (with empty/identity compositors)
const base: Program<RenderTree> = { signal: () => tree, event: () => [] };
const result = composeProgram(base, [], { seed: 42, compile: {} as any });
console.log(result.signal(0, {} as any));
```

## Estimated Complexity

| Item | Lines | Complexity |
|------|-------|------------|
| TreeRewrite | ~150 | Low (pure structural code) |
| Selection | ~100 | Low (type definitions + traversal) |
| Compositor | ~50 | Low (interfaces + simple reduce) |
| **Total** | ~300 | Low |

## Next Sprint Preview

Once this infrastructure is in place, the next sprint would:
1. Implement `Transform3DCompositor` using these primitives
2. Add BoundsResolver integration if needed for origin policies
3. Wire up a compositor in the editor for testing
