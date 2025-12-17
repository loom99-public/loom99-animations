# Ambient Animation Design Notes

This document summarizes design-level answers to questions about the current editor (in `gallery/src/editor`) and sketches how to evolve it from short “logo reveal” animations to infinite, ambient loops.

---

## 1. Current Kernel: What Already Exists

The core pipeline today is solid for **finite motifs**:

- **Scene / Targets**
  - `Scene`, `SceneTargets`, `SceneStrokes`.
  - `SVGPathSource`, `SamplePoints`, `SceneToTargets`, plus `TextSource`.
- **Per-element data (`Field<T>`)**
  - Spatial: `RadialOrigin`, `RegionField`, `ExplosionOrigin`, `TopDropOrigin`, `GridPositions`, `CenterPoint`.
  - Timing: `LinearStagger`, `RandomStagger`, `WaveStagger`, `ConstantFieldDuration`, `DurationVariation`, `IndexStagger`, `StaggerField`.
  - Style: `SizeVariation`, `OpacityField`, `ColorField`, etc.
- **Phase / Time**
  - `PhaseMachine` → `PhaseSample` (`entrance`, `hold`, `exit`, with `u`, `tLocal`).
  - `PhaseProgress`, `EaseRamp` (easing for 0–1 progress).
- **Composition / Motion**
  - `PerElementTransport`: targets + start positions + delays + phase → `Program<RenderTree>`.
  - `PerElementProgress` + `LerpPoints`: per-element progress → positions.
- **Rendering**
  - `PerElementCircles`, `PathRenderer`, `CircleNode`/`GroupNode`, `Canvas`, filters (`GlowFilter`, `GooFilter`, `RGBSplitFilter`).

The runtime/player already understands **timeline semantics**:

- `Program<T>` can expose `timeline(): TimelineHint`.
  - `kind: 'finite'` with `durationMs`, optional `cuePoints`, `recommendedLoop`.
  - `kind: 'infinite'` with `windowMs` (preview window) and `recommendedLoop`.
- `Player`:
  - Uses `timeline` hints to set `maxTime`, loop mode, and preview window.
  - Differentiates finite (`⏱`) vs infinite (`∞`) in the `PreviewPanel`.

There is also a **Compositor** scaffold:

- `Compositor<Tree>`: pure `tree → tree` transform with context `{ timeMs, seed, viewport }`.
- `CompositorStack` and `withCompositors(program, stack)` to adapt `Program<RenderTree>`.
- Not yet wired into the main editor UX, but ready for FX / ambient modifiers.

The missing pieces are mostly **UX and a few high-level blocks**, not core primitives.

---




---

## 4. 

## 6. Direct Responses to the Original Pain Points

### 6.1. “Pivot to looping / ambient is recent and unimplemented”

- Kernel support is mostly there:
  - `Program.timeline()` supports `kind: 'infinite'` with `windowMs`.
  - Player and `PreviewPanel` already differentiate finite vs infinite and set preview window/loop mode.
- Missing pieces:
  - Program-level blocks like `LoopProgram` / `LoopClock` to encode looping in the graph.
  - A clear “Timeline Mode” UX for each program (Shot / Loop / Ambient).
  - A couple of modulation primitives and/or compositors for slow ambient variation.

### 6.2. “Compositors not fully implemented”

- The **types and stack orchestration** are implemented:
  - `Compositor`, `CompositorStack`, `applyStack`, `withCompositors`.
- They’re not yet:
  - Exposed as first-class editor blocks / lanes.
  - Used as a standard way to add FX/ambient behavior in the UI.
- For ambient:
  - Use compositors as an **optional layer**:
    - Implement a small library of “ambient FX compositors”.
    - Surface them behind FX toggles on the output/Canvas block.

### 6.3. “Too many node types; Burst Stagger / PerElementTransport / PerElementProgress are opaque; any Field looks compatible”

- Semantics clarified:
  - Burst Stagger (`LinearStagger`) = per-element delays in seconds.
  - `PerElementProgress` = per-element 0–1 progress based on per-element delays/durations and a PhaseMachine.
  - `PerElementTransport` = a full particle transport+render program (start → logo → exit).
- Type confusion:
  - UI currently treats all `Field<*>` as compatible; this is overly permissive.
  - Kernel/compiler is significantly stricter and uses real kinds (`Field:number`, `Field:vec2`, etc.).
- Recommended fixes:
  - Tighten editor-level `Field` compatibility to near-exact matches.
  - Keep semantic labels like `Field<Duration>` and `Field<Point>` but treat them as units, not different runtime kinds.
  - Use explicit adapter blocks where you truly want cross-domain mapping.

### 6.4. “SVGPathSource uses few hardcoded paths; don’t want a full SVG editor; how do we get stuff to animate?”

- Under the hood, you already have:
  - `pathLibrary` with built-ins + user entries.
  - Import from pasted SVG, import from JSON, export to JSON.
  - Persistence in `localStorage`.
  - `TextSource` as an alternate Scene generator (per-character).
- Strategy:
  - Build a dedicated **Path Library UI**:
    - Thumbnail grid of paths.
    - One-click “use in Scene” for `SVGPathSource`.
    - Simple flows for paste/upload/import.
  - Add a handful of **parametric Scene blocks** for generic geometry.
  - This gives plentiful, user-controlled geometry without building a full SVG editor.

### 6.5. “How to change UX from 5s logo to infinite ambient (infinite but rhyming)”

High-level approach:

- Keep the current editor as a **motif/phrase designer**.
- Add a **looping / ambient layer** on top:
  - Program-level `LoopProgram` / `LoopClock`.
  - Multi-scale cycles (motion vs color vs jitter).
  - Compositors for global ambient motion.
- UX changes:
  - In Preview: expose and label **timeline mode** (Shot / Loop / Ambient).
  - In Program inspector: add a “Timeline Mode” panel with a few focused controls (loop length, preview window, variation).

This keeps the system coherent: users still build graphs out of Scenes, Fields, Phases, Specs, and Programs—but now those Programs can explicitly declare themselves as **finite shots**, **loops**, or **ambient surfaces** with multi-scale repetition.

