## 3. “Stuff to animate”: beyond hard-coded `SVGPathSource`

Currently, the primary “Scene” source is `SVGPathSource`, which picks from a **small set of hardcoded paths**. That’s limiting and leads to “toy demo” vibes.

However, the **path library** is already much more capable:

- `pathLibrary` (`pathLibrary/index.ts`):
  - Singleton managing paths with:
    - `getAll()`, `getBuiltins()`, `getUserPaths()`.
    - `getById`, `setActiveId`.
  - Persists user paths in `localStorage`.
- `PathEntry` (`pathLibrary/types.ts`):
  - `id`, `name`, `source: 'builtin' | 'imported' | 'pasted'`.
  - `data: LineData[]` (low-level line representation).
  - Optional `thumbnail` SVG string.
  - `meta` with `viewBox`, `description`, `originalSVG`, etc.
- Import/export:
  - `importFromString(svgString)`:
    - Validates and parses pasted SVG.
    - Creates a new `PathEntry` with `source: 'pasted'`.
  - `importFromJSON(jsonString)`:
    - Allows sharing/export of path presets.
  - `exportAsJSON(id)`:
    - Dump `name`, `data`, `meta` for a given entry.

### 3.1. Geometry strategy without a full SVG editor

The main missing piece is **user-facing UI**, not core code. A pragmatic approach:

1. **Path Library Panel / Modal**
   - Show a grid of entries from `pathLibrary.getAll()`:
     - Built-ins (logo, text, heart).
     - User imports (pasted or from files).
   - For each entry:
     - Render `thumbnail` (already generated for built-ins).
     - Show `name`, `source` badge.
   - Actions:
     - “Use in Scene” → sets `SVGPathSource.target` to that entry’s `id`.
     - “Set as default” → `pathLibrary.setActiveId(id)`, used for new blocks.

2. **Lightweight import flows**
   - **Paste SVG**:
     - Button or menu item: “Paste SVG…”.
     - Opens a textarea; on submit call `pathLibrary.importFromString(svg)`.
   - **Upload SVG file**:
     - File input; read text → same parser.
   - **Import JSON**:
     - Another textarea for JSON; call `importFromJSON`.
   - These can live:
     - In the Path Library panel.
     - Or in the `SVGPathSource` inspector as “Change Path…” / “Import…” actions.

3. **Parametric sources**
   - Add a few simple **parametric Scene blocks** so you can get “stuff to animate” with zero external assets:
     - `CircleRingSource`: concentric circles or rings.
     - `StripedLinesSource`: parallel or curved lines across the viewport.
     - `GridSource`: grid of lines / rectangles.
     - Possibly `NoiseBlobSource`: abstract organic shapes.
   - All output a `Scene` (or `SceneTargets`).
   - These are just procedural equivalents to built-in SVGs, but much more controllable and suited for ambient motion.

This gives you:

- “Use our logo” → import once, then pick it like any other PathEntry.
- “Make a generic ambient animation” → use parametric sources (rings, grids, text) without leaving the tool.
- You avoid building a full-fledged vector editor; external tools remain the authoring canon, the editor is about animation logic.