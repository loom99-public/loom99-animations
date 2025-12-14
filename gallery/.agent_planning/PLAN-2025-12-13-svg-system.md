# PLAN: SVG Path Library System

**Date**: 2025-12-13
**Status Reference**: STATUS-2025-12-13-svg-system.md

## Objective

Replace hardcoded SVG path data with an extensible Path Library that supports:
- Built-in paths (existing logo/text/heart)
- User-imported SVG paths
- Paste-from-clipboard input
- Dynamic source selection in blocks
- Import/Export for sharing

---

## Architecture Overview

### New Components

```
gallery/src/editor/
├── pathLibrary/
│   ├── index.ts           # PathLibrary class (singleton)
│   ├── types.ts           # PathEntry, PathLibraryState
│   ├── parser.ts          # SVG → LineData parser
│   ├── storage.ts         # localStorage persistence
│   └── builtins.ts        # Re-export existing LOGO/TEXT/HEART
├── components/
│   └── PathLibraryPanel.tsx  # UI for library management
```

### Data Model

```typescript
interface PathEntry {
  id: string;              // unique identifier
  name: string;            // display name
  source: 'builtin' | 'imported' | 'pasted';
  data: LineData[];        // the actual path data
  thumbnail?: string;      // SVG preview string
  createdAt: number;       // timestamp
  meta?: {
    originalFile?: string;
    viewBox?: string;
    description?: string;
  };
}

interface PathLibraryState {
  entries: PathEntry[];
  activeId: string | null;  // currently selected for new blocks
}
```

---

## Implementation Tasks

### Phase 1: Path Library Core (Foundation)

#### Task 1.1: Create PathLibrary Service
**Files**: `pathLibrary/index.ts`, `pathLibrary/types.ts`
**Deliverables**:
- `PathEntry` and `PathLibraryState` types
- `PathLibrary` class with:
  - `getAll(): PathEntry[]`
  - `getById(id: string): PathEntry | null`
  - `add(entry: Omit<PathEntry, 'id'>): PathEntry`
  - `remove(id: string): void`
  - `export(id: string): string` (JSON)
- Singleton instance
- Emit change events (MobX observable or EventEmitter)

#### Task 1.2: Migrate Built-in Paths
**Files**: `pathLibrary/builtins.ts`
**Deliverables**:
- Convert LOGO_PATHS → PathEntry { id: 'builtin:logo', name: 'Loom99 Logo', ... }
- Convert TEXT_PATHS → PathEntry { id: 'builtin:text', name: 'Do More Now', ... }
- Convert HEART_PATHS → PathEntry { id: 'builtin:heart', name: 'Heart', ... }
- Auto-register on library init

#### Task 1.3: localStorage Persistence
**Files**: `pathLibrary/storage.ts`
**Deliverables**:
- `saveLibrary(state: PathLibraryState): void`
- `loadLibrary(): PathLibraryState | null`
- Key: `loom99-path-library`
- Don't persist builtins (recreate on load)

### Phase 2: SVG Import (Core Feature)

#### Task 2.1: SVG Parser
**Files**: `pathLibrary/parser.ts`
**Deliverables**:
- `parseSVGString(svg: string): LineData[]`
- Handle `<path d="...">` elements
- Parse M, L, Q, C, A, Z commands
- Handle relative (lowercase) commands
- Extract viewBox for scaling
- Extract colors from fill/stroke

#### Task 2.2: File Import
**Files**: `pathLibrary/index.ts` (extend)
**Deliverables**:
- `importFromFile(file: File): Promise<PathEntry>`
- Use FileReader API
- Auto-generate name from filename
- Create thumbnail preview

#### Task 2.3: Paste from Clipboard
**Files**: `pathLibrary/index.ts` (extend)
**Deliverables**:
- `importFromString(svg: string, name?: string): PathEntry`
- Validate SVG structure
- Generate unique ID
- Prompt for name if not provided

### Phase 3: UI Integration (User-Facing)

#### Task 3.1: Update SVGPathSource Block
**Files**: `blocks.ts`, `compiler/blocks/sources/SVGPathSource.ts`
**Deliverables**:
- Change `target` param from static dropdown to dynamic
- Populate options from PathLibrary.getAll()
- Handle both builtin IDs ('builtin:logo') and custom IDs
- Update compiler to load from library

#### Task 3.2: Path Library Panel Component
**Files**: `components/PathLibraryPanel.tsx`
**Deliverables**:
- List view of all paths with thumbnails
- Import button (file picker)
- Paste button (opens text input modal)
- Delete button for user paths (not builtins)
- Export button (downloads JSON)
- Click to preview path

#### Task 3.3: Integrate Panel into Editor
**Files**: `Editor.tsx` or sidebar
**Deliverables**:
- Add Path Library tab/section
- Wire up to PathLibrary service
- React to library changes

### Phase 4: Export & Sharing

#### Task 4.1: Export Single Path
**Deliverables**:
- Export as JSON (our LineData format)
- Export as SVG string (using pathPointsToSVGPath)

#### Task 4.2: Import JSON Format
**Deliverables**:
- `importFromJSON(json: string): PathEntry`
- Validate structure matches LineData[]
- For sharing paths between users

---

## Brainstorm: Lightweight In-App Editing (NOT implementing now)

These are ideas for future consideration, not part of this sprint:

### Simple Modifications (Easiest)
1. **Scale/Transform**: Sliders to uniformly scale paths, flip H/V
2. **Color Override**: Change all path colors with single picker
3. **Density Control**: Adjust point sampling density
4. **Bounds Crop**: Limit paths to a bounding box

### Path Generation (Medium)
1. **Text to Path**: Use canvas measureText + path approximation
2. **Shape Presets**: Circle, rectangle, star, polygon generators
3. **Icon Packs**: Bundle popular icon sets as optional imports

### Basic Editing (Complex - Probably Don't Do)
1. **Point Adjustment**: Drag individual control points
2. **Simplify/Smooth**: Reduce path complexity
3. **Combine Paths**: Merge multiple paths into one entry

### External Tools Integration (Clever)
1. **Figma Plugin**: Export paths in our format
2. **SVG Optimizer Link**: "Open in SVGOMG" button
3. **Google Fonts API**: Generate paths from any Google Font

**Recommendation**: Start with Scale/Transform and Color Override as they're trivial to implement and immediately useful.

---

## File Changes Summary

| File | Change |
|------|--------|
| `pathLibrary/index.ts` | NEW - PathLibrary class |
| `pathLibrary/types.ts` | NEW - Type definitions |
| `pathLibrary/parser.ts` | NEW - SVG parser |
| `pathLibrary/storage.ts` | NEW - localStorage |
| `pathLibrary/builtins.ts` | NEW - Migrate existing |
| `blocks.ts` | MODIFY - Dynamic dropdown |
| `SVGPathSource.ts` | MODIFY - Use PathLibrary |
| `PathLibraryPanel.tsx` | NEW - UI component |
| `Editor.tsx` | MODIFY - Add panel |
| `pathData.ts` | KEEP - Imported by builtins.ts |

---

## Acceptance Criteria

### Phase 1 Complete When:
- [ ] PathLibrary service exists with CRUD operations
- [ ] Built-in paths accessible via library
- [ ] User paths persist across page reloads

### Phase 2 Complete When:
- [ ] Can import .svg file → appears in library
- [ ] Can paste SVG code → appears in library
- [ ] Parser handles common SVG path commands

### Phase 3 Complete When:
- [ ] SVGPathSource dropdown shows all library entries
- [ ] New blocks can use imported paths
- [ ] UI panel allows library management

### Phase 4 Complete When:
- [ ] Can export path as JSON
- [ ] Can import JSON from another user
- [ ] Round-trip: export → import preserves path

---

## Complexity Estimate

| Phase | Tasks | Complexity |
|-------|-------|------------|
| 1 | 3 | Low-Medium |
| 2 | 3 | Medium (parser is tricky) |
| 3 | 3 | Medium |
| 4 | 2 | Low |

**Total**: ~11 tasks, Medium overall complexity

---

## Dependencies

- No external libraries required
- Uses existing: MobX (for reactivity), FileReader API, localStorage
- SVG parsing is pure string manipulation (no DOM dependency)

## Risks

1. **SVG Parser Complexity**: Real-world SVGs have many edge cases
   - Mitigation: Start simple (M, L, Q, C, Z), iterate
2. **Large SVGs**: Could have thousands of points
   - Mitigation: Add simplification or density limit
3. **Invalid SVGs**: User might paste garbage
   - Mitigation: Validate + helpful error messages
