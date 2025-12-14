# Evaluation: SVG Path System - Phase 3B (Path Management UI)

**Timestamp**: 2025-12-14-015900
**Confidence**: FRESH
**Git Commit**: a439129
**Focus**: Phase 3B - Import/Paste Modal + Path List Panel + Export functionality

---

## Previous Evaluation Reuse

| Finding | Previous Confidence | Current Confidence | Action |
|---------|--------------------|--------------------|--------|
| Phase 1 (PathLibrary backend) | FRESH (Dec 13) | RECENT | Carried forward - no backend changes |
| Phase 3A (SVGPathSource wiring) | FRESH (Dec 13) | RECENT | Carried forward - dropdown working |

**Summary of Phase 3A completion** (from STATUS-2025-12-13-svg-system.md):
- ✅ PathLibrary backend fully functional (7 files, ~3K lines)
- ✅ SVGPathSource block wired to library via dynamic dropdown
- ✅ Inspector shows path selection via `<select>` element
- ✅ All methods ready: `importFromString()`, `importFromJSON()`, `exportAsJSON()`, `add()`, `remove()`

---

## Phase 3B Requirements

**Goal**: Add UI for path management - import, view, delete, export

**Required Components**:
1. **Import/Paste Modal** - File upload + paste SVG code
2. **Path List Panel** - View library, delete user paths
3. **Export functionality** - Download paths as JSON

---

## UI Pattern Analysis

### Existing UI Patterns in Editor

**Modal Patterns**: ❌ NONE FOUND
- No existing modal components in `/src/editor/`
- No modal CSS classes
- Need to create from scratch

**Panel Patterns**: ✅ MULTIPLE EXAMPLES
- `BlockLibrary.tsx` - Left sidebar panel
- `Inspector.tsx` - Right sidebar panel
- `PreviewPanel.tsx` - Right panel (top section)
- `ControlSurfacePanel.tsx` - Right panel (bottom section)
- `LogWindow.tsx` - Collapsible panel

**Dropdown Patterns**: ✅ WELL ESTABLISHED
- `SettingsToolbar.tsx` - Reusable `Dropdown` component
- Uses: Icon + Label + Menu with close-on-outside-click
- Clean separation: `Dropdown` wrapper + `MenuItem` children
- CSS: `.toolbar-dropdown`, `.toolbar-dropdown-menu`, `.dropdown-menu-item`

**Button Patterns**: ✅ MULTIPLE STYLES
- Action buttons: `.toolbar-action-btn` (Save/Load/Export)
- Clear button: `.toolbar-clear-btn` (red hover)
- Delete button: `.delete-button` in Inspector

**File Input Patterns**: ❌ NOT PRESENT
- No existing file upload UI
- Need to add `<input type="file">` pattern

### Editor Layout Structure

```
<Editor>
  <SettingsToolbar />              ← Top toolbar (40px fixed height)
  <div className="editor-main">    ← Main flex container
    <BlockLibrary />               ← Left sidebar (180px min)
    <div className="editor-center"> ← Center (patch bay)
    <div className="editor-right-panel"> ← Right panel (420px)
      <PreviewPanel />             ← Preview + player controls
      <ControlSurfacePanel />      ← Control sliders/knobs
    </div>
    <Inspector />                  ← Far right (280px)
  </div>
</Editor>
```

**Key constraints**:
- Toolbar buttons in `.toolbar-right` section (after "Clear All")
- Panels must fit within `editor-main` (no overlay)
- OR use modal overlay (no existing pattern - must create)

---

## Architecture Decision Points

### 1. Where should the "Import Path" button live?

**Option A: SettingsToolbar (top right)**
- ✅ Visible, discoverable location
- ✅ Matches existing action buttons (Save/Load/Export)
- ✅ Consistent with file I/O operations
- ❌ Toolbar already has 4+ dropdowns (getting crowded)

**Option B: New dropdown in toolbar center**
- ✅ Follows existing dropdown pattern
- ✅ Could include "Import", "Export All", "Manage Paths"
- ✅ Clean separation of concerns
- ❌ Another dropdown to navigate

**Option C: BlockLibrary footer button**
- ✅ Near SVGPathSource block (contextual)
- ✅ Library is where you "get" resources
- ❌ Not obvious for first-time users
- ❌ BlockLibrary is already cramped

**RECOMMENDATION**: **Option A** - Add button in `.toolbar-right` next to Save/Load/Export
- Rationale: Path import/export is a file I/O operation like Save/Load
- Placement: Between "Export" and divider
- Style: Use `.toolbar-action-btn` (currently disabled="Phase 6")

---

### 2. Where should the Path List Panel live?

**Option A: Replace Inspector when showing paths**
- ✅ Reuses existing panel space
- ✅ Similar to how Inspector shows different content
- ❌ Loses block parameter access while browsing paths
- ❌ Context switching overhead

**Option B: New tab/section in BlockLibrary**
- ✅ Paths are "library resources" like blocks
- ✅ Could add tab switcher: "Blocks" | "Paths"
- ❌ BlockLibrary is narrow (180px min) - tight for thumbnails
- ❌ Need to build tab UI

**Option C: Modal overlay (click "Manage Paths" to open)**
- ✅ Full attention, dedicated space
- ✅ Can show large thumbnails, metadata
- ✅ Non-blocking - dismiss when done
- ❌ No existing modal pattern (must create)
- ❌ Hides patch bay while open

**Option D: Collapsible panel below Inspector**
- ✅ Always accessible
- ✅ Similar to LogWindow pattern
- ❌ Awkward vertical layout (Inspector already has scroll)
- ❌ Cramped for thumbnails

**RECOMMENDATION**: **Option C** - Modal overlay
- Rationale: Path management is infrequent, needs more space than sidebar
- Pattern: Click "Manage Paths" button → modal opens → browse/delete/export → close
- Can show 2-column grid with thumbnails, metadata, action buttons
- Similar to "Demos" dropdown but as a modal for better UX

---

### 3. Modal Pattern Implementation

**No existing modal pattern** - must create reusable component

**Required features**:
- Backdrop overlay (dark semi-transparent)
- Centered content box
- Close button (X top-right)
- Click outside to close
- ESC key to close
- Prevent body scroll while open

**Recommended structure**:
```tsx
<Modal isOpen={showPathManager} onClose={() => setShowPathManager(false)}>
  <ModalHeader title="Path Library" onClose={...} />
  <ModalBody>
    <PathLibraryContent />
  </ModalBody>
</Modal>
```

**CSS classes** (to create):
- `.modal-backdrop` - Full screen overlay
- `.modal-dialog` - Centered content box
- `.modal-header` - Title + close button
- `.modal-body` - Scrollable content
- `.modal-footer` - Action buttons (if needed)

---

### 4. Import/Paste UI Design

**Two input methods**:
1. **File Upload**: `<input type="file" accept=".svg" />`
2. **Paste SVG Code**: `<textarea>` for raw SVG paste

**Modal sections**:
```
┌─────────────────────────────────────┐
│ Import Path              [X Close]  │
├─────────────────────────────────────┤
│ [Tab: Upload File] [Tab: Paste SVG]│  ← Tab switcher
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Click to upload or drag & drop  │ │  ← File upload (Tab 1)
│ │        [Browse Files...]        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ OR                                  │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Paste SVG code here...          │ │  ← Textarea (Tab 2)
│ │                                 │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Name: [________________]            │  ← Optional name input
│                                     │
│         [Cancel]  [Import]          │  ← Action buttons
└─────────────────────────────────────┘
```

**Validation**:
- Show error message if SVG parse fails
- Show preview if successful
- Use `pathLibrary.importFromString()` (already implemented)

---

### 5. Path List Panel Design

**Layout** (inside modal):
```
┌─────────────────────────────────────┐
│ Path Library                [+ Import] [X Close]  │
├─────────────────────────────────────┤
│ Built-in Paths (3)                  │
│ ┌─────────┬─────────┬─────────┐     │
│ │ [thumb] │ [thumb] │ [thumb] │     │  ← Grid of path cards
│ │  Logo   │  Text   │  Heart  │     │
│ └─────────┴─────────┴─────────┘     │
│                                     │
│ User Paths (2)                      │
│ ┌─────────┬─────────┐               │
│ │ [thumb] │ [thumb] │               │
│ │ Custom1 │ Import2 │               │
│ │ [Delete]│ [Delete]│               │  ← Delete button for user paths
│ │ [Export]│ [Export]│               │  ← Export individual path
│ └─────────┴─────────┘               │
│                                     │
│ [Export All User Paths]             │  ← Bulk export
└─────────────────────────────────────┘
```

**Path Card Component**:
- Thumbnail: Small SVG preview (100x100px)
- Name: Display name
- Source badge: "Built-in" | "Imported" | "Pasted"
- Actions: Delete (user only), Export (JSON download)

**Actions**:
- Click card → Preview (highlight, show metadata?)
- Click Delete → Confirm modal → `pathLibrary.remove(id)`
- Click Export → `pathLibrary.exportAsJSON(id)` → download
- Click "Export All" → Bundle all user paths → download

---

## Runtime Check Requirements

### Existing Checks (run these):
| Check Command | Purpose | Status |
|---------------|---------|--------|
| `cd gallery && pnpm test` | Unit tests | PASS (11 suites) |
| `cd gallery && pnpm dev` | Dev server | NOT RUN (manual check) |

### Missing Checks (implementer should create):

**1. PathLibrary UI Integration Test** (`tests/pathLibrary.test.tsx`)
- Import SVG string → appears in dropdown
- Delete user path → removed from dropdown
- Export path → download triggered
- Built-in paths cannot be deleted

**2. Modal Interaction Test** (`tests/modal.test.tsx`)
- Click outside → closes modal
- Press ESC → closes modal
- Prevent body scroll when open
- Reusable across editor

**3. Manual Dev Server Check**
- Start dev server: `just dev`
- Navigate to `http://localhost:8889/#/editor`
- Click "Manage Paths" → modal opens
- Click "Import" → file picker works
- Paste SVG → preview shows
- Path appears in SVGPathSource dropdown

---

## Data Flow Verification

### Import Flow
```
User action → Modal → pathLibrary.importFromString()
                          ↓
                    PathEntry created
                          ↓
                    localStorage.setItem()
                          ↓
                    MobX observable updates
                          ↓
                    Dropdown re-renders with new option
```

**Trace points**:
1. ✅ **Input**: User pastes SVG → `importFromString()` validates
2. ✅ **Processing**: Parser extracts LineData → stored in entry
3. ✅ **Storage**: `persist()` saves to localStorage (key: `loom99-path-library`)
4. ✅ **Retrieval**: `getPathOptions()` reads from library
5. ⚠️ **Display**: Dropdown updates → **NEEDS VERIFICATION**
   - Question: Does `get options()` in `paramSchema` re-evaluate on library changes?
   - Potential issue: React may not detect changes to getter function

### Verification needed:
- **Test**: Import path → Check if dropdown immediately shows new option
- **Risk**: If getter isn't reactive, dropdown won't update until block re-mounts
- **Solution**: Subscribe to `pathLibrary` changes → force param schema refresh

---

## Findings

### [FRESH] Phase 3A Backend Integration
**Status**: COMPLETE
**Evidence**:
- `/Users/bmf/code/loom99-animations/gallery/src/editor/pathLibrary/index.ts:307` - Auto-init on import
- `/Users/bmf/code/loom99-animations/gallery/src/editor/blocks.ts:427` - Dynamic `get options()`
- `/Users/bmf/code/loom99-animations/gallery/src/editor/compiler/blocks/sources/SVGPathSource.ts:138` - Uses `pathLibrary.getById()`
**Issues**: None found

### [FRESH] UI Pattern Availability
**Status**: PARTIAL
**Evidence**:
- Dropdown pattern: `SettingsToolbar.tsx:24-71`
- Panel pattern: Multiple examples in layout
- Modal pattern: ❌ NOT FOUND - must create
**Issues**:
- No existing modal component
- No modal CSS foundation
- Need to build reusable `<Modal>` component

### [FRESH] Toolbar Space Analysis
**Status**: CROWDED BUT VIABLE
**Evidence**: `SettingsToolbar.tsx:309-343` - 4 action buttons + status
**Issues**:
- Toolbar right section has: Clear All, Save, Load, Export, Divider, Status Badge, Block Count
- Adding "Import Path" + "Manage Paths" = 6 buttons
- Risk: Too crowded, may need consolidation

### [RISKY] Dropdown Reactivity
**Status**: NEEDS VERIFICATION
**Evidence**: `blocks.ts:426` - `get options()` computed property
**Concern**:
- Inspector's `<select>` may not detect changes to getter return value
- MobX observability might not trigger re-render on library changes
**Verification needed**:
1. Import new path while SVGPathSource block selected
2. Check if dropdown immediately shows new option
3. If not, need to add explicit subscription or force re-render

---

## Ambiguities Found

| Area | Question | How LLM Might Guess | Impact |
|------|----------|---------------------|--------|
| Button placement | Should Import/Manage be separate buttons or combined? | Likely creates 2 separate buttons | UI clutter, redundant clicks |
| Modal vs Panel | Should path list be modal or sidebar panel? | Might choose sidebar (easier) | Cramped UI, poor thumbnails |
| Thumbnail generation | How to generate SVG preview for thumbnail? | Might skip thumbnails entirely | Harder to browse paths visually |
| Export format | JSON only, or also offer SVG export? | JSON only (follows spec) | Users may want SVG for other tools |
| Bulk operations | Delete all user paths? Export all? | Might skip bulk ops | Manual repetition for multiple paths |

---

## Recommendations

### Priority 1: Create Modal Foundation
**Complexity**: Low-Medium
**Tasks**:
1. Create `Modal.tsx` component with backdrop, dialog, close handlers
2. Create `Modal.css` with overlay, centering, animations
3. Test ESC key, click-outside, scroll prevention
**Why first**: All UI depends on modal pattern

### Priority 2: Import/Paste Modal
**Complexity**: Medium
**Tasks**:
1. Create `PathImportModal.tsx` with file input + textarea
2. Wire to `pathLibrary.importFromString()`
3. Add validation error display
4. Add "Import Path" button to toolbar
**Depends on**: Modal foundation

### Priority 3: Path List UI
**Complexity**: Medium
**Tasks**:
1. Create `PathLibraryModal.tsx` with grid layout
2. Create `PathCard.tsx` component (thumbnail, name, actions)
3. Implement delete, export actions
4. Add "Manage Paths" button to toolbar
**Depends on**: Modal foundation

### Priority 4: Verify Dropdown Reactivity
**Complexity**: Low
**Tasks**:
1. Manual test: Import path → check dropdown updates
2. If broken: Add `pathLibrary.subscribe()` to Inspector
3. Force re-render on library changes
**Critical**: Blocks Phase 3B acceptance if broken

### Priority 5: Thumbnail Generation (Optional)
**Complexity**: Medium-High
**Tasks**:
1. Render LineData to SVG string
2. Scale to fit 100x100 viewport
3. Cache in PathEntry.thumbnail
**Nice-to-have**: Can defer to later phase

---

## Open Questions for User

### Design Decisions Needed:

**1. Button consolidation**
Current plan adds 2 buttons: "Import Path" + "Manage Paths"
- Option A: Keep separate (clearer, 2 clicks to import)
- Option B: Single "Paths..." button opens modal with tabs (Import | Library)
- **Which do you prefer?**

**2. Export format options**
PathLibrary has `exportAsJSON()` ready
- Should we also offer SVG export (using `pathPointsToSVGPath()` from parser)?
- Use case: Users want to edit in Figma/Illustrator
- **JSON only, or JSON + SVG?**

**3. Thumbnail preview**
Showing visual previews helps identify paths
- Option A: Generate simple SVG thumbnails (extra work, nice UX)
- Option B: Text-only list initially (faster to implement)
- **Worth the effort for Phase 3B, or defer?**

---

## Workflow Recommendation

✅ **CONTINUE** - Requirements clear, patterns mostly exist

**BUT**: Answer design questions above before implementing to avoid rework.

**Acceptance criteria for Phase 3B**:
- [ ] User can click button to open import modal
- [ ] User can paste SVG code → path appears in library
- [ ] User can browse path list → see built-ins + user paths
- [ ] User can delete user paths (not built-ins)
- [ ] User can export individual path as JSON
- [ ] SVGPathSource dropdown updates when paths added/removed
- [ ] Modal closes on ESC, click-outside
- [ ] No console errors on import/delete operations

**Estimated Complexity**: Medium (modal creation is new, rest follows patterns)
