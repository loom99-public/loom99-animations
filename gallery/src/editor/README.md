# Unified Animation Editor

Visual programming environment for the V4 animation framework.

## Getting Started

### Access the Editor

Navigate to `http://localhost:5173/#/editor` (dev server) or `http://0.0.0.0:5173/#/editor` (network access).

### Current State (Phase 1)

The editor shell is complete with:

- ✅ 7-lane patch bay layout (Scene, Fields, Time, Events, Dynamics, Composition, Render)
- ✅ Block library panel (empty, categories visible)
- ✅ Inspector panel (shows selected block info)
- ✅ Transport bar (playback controls, seed/speed settings)
- ✅ MobX store for graph state
- ✅ TypeScript type definitions

### What Works

- Navigate between gallery (`/`) and editor (`/#/editor`) via URL
- See empty patch bay with 7 labeled lanes
- See block library categories (Scene, Fields, Time, etc.)
- Inspector shows "No block selected" placeholder
- Transport controls render (non-functional)

### What's Next (Phase 2)

- Populate block library with 5-10 example blocks
- Implement drag-and-drop (dnd-kit integration)
- Render blocks in patch bay as colored rectangles
- Enable block selection (click to select, inspector shows details)

## Architecture

```
Editor/
├── types.ts          - Core type definitions (Block, Slot, Lane, Patch)
├── store.ts          - MobX observable store
├── Editor.tsx        - Root layout component
├── PatchBay.tsx      - 7-lane patch bay
├── BlockLibrary.tsx  - Left panel block catalog
├── Inspector.tsx     - Right panel property editor
├── Transport.tsx     - Bottom bar playback controls
└── index.ts          - Public exports
```

## Testing the Editor

```bash
# Run dev server
pnpm dev

# Open editor
open http://localhost:5173/#/editor

# Check TypeScript compilation
pnpm exec tsc --noEmit
```

## Design Documents

- **PROJECT_SPEC.md**: `../.agent_planning/PROJECT_SPEC.md`
- **UI Design (High-Level)**: `../../ui_example_docs/full_ui/ui_high_level_unified_iface.md`
- **UI Design (Specifics)**: `../../ui_example_docs/full_ui/ui_specifics.md`

## Development Notes

### Adding Blocks (Phase 2)

Create block definitions in a `blocks/` directory:

```typescript
// blocks/RadialOrigin.ts
export const RadialOriginBlock: BlockBehavior = {
  type: 'RadialOrigin',
  defaultParams: {
    centerX: 0.5,
    centerY: 0.5,
    radius: 0.3,
  },
  compile: (block, inputs) => {
    // TODO Phase 4: Compile to V4 Field<Point>
  },
};
```

Register in block registry (to be created in Phase 2).

### Testing Strategy

**Unit Tests** (store, graph logic):
```typescript
// store.test.ts
test('addBlock creates block and adds to lane', () => {
  const store = new EditorStore();
  const id = store.addBlock('RadialOrigin', 'Fields');
  expect(store.blocks).toHaveLength(1);
  expect(store.lanes.find(l => l.name === 'Fields')?.blockIds).toContain(id);
});
```

**Integration Tests** (React components):
```typescript
// Editor.test.tsx
test('clicking block selects it in inspector', () => {
  render(<Editor />);
  const block = screen.getByText('RadialOrigin');
  fireEvent.click(block);
  expect(screen.getByText(/Selected/)).toBeInTheDocument();
});
```

## Contributing

When implementing phases, follow this workflow:

1. **Read PROJECT_SPEC.md** - Understand phase goals and acceptance criteria
2. **Write tests first** - Define expected behavior
3. **Implement feature** - Keep it simple, match spec
4. **Run tests** - `pnpm test`
5. **Manual testing** - Load editor, verify UX
6. **Update docs** - Keep this README in sync with features

## Troubleshooting

**Editor shows blank screen:**
- Check browser console for errors
- Verify route is `/#/editor` (hash-based routing)
- Check TypeScript compilation: `pnpm exec tsc --noEmit`

**MobX warnings about observables:**
- Ensure all mutations use `action` decorator
- Check MobX strict mode is enabled in dev

**Styles not loading:**
- Verify CSS imports in components
- Check Vite dev server is running
- Hard refresh browser (Cmd+Shift+R)
