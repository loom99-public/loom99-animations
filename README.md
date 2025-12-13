# loom99 Animation Editor

A visual programming environment for building SVG animations. Create complex procedural animations by connecting blocks in a node-based editor.

> **Reference Animations**: This project includes 60 hand-crafted HTML animations (10 techniques × 2 targets × 3 variants) that serve as the reference implementations. The goal is to recreate these in the editor. See [ANIMATIONS.md](./ANIMATIONS.md) for details.

## Table of Contents

- [Quick Start](#quick-start)
- [What is This?](#what-is-this)
- [Editor Overview](#editor-overview)
- [Project Goal](#project-goal)
- [Project Structure](#project-structure)
- [Development](#development)
- [Documentation](#documentation)

## Quick Start

```bash
# Install dependencies
cd gallery && pnpm install

# Start the dev server
pnpm dev

# Open the editor
open http://localhost:5173/#/editor
```

## What is This?

This is a **visual programming environment** for creating animations. Instead of writing code frame-by-frame, you:

1. **Drag blocks** from a library onto lanes
2. **Connect them** to define data flow
3. **Tweak parameters** in the inspector
4. **Watch the preview** update in real-time

The editor compiles your block graph into an optimized animation program that runs at 60fps.

For a deeper explanation of the concepts, see [Concepts](./gallery/src/editor/CONCEPTS.md).

## Editor Overview

```
+------------------+------------------------+----------+----------+
|                  |                        |          |          |
|  Block Library   |       Patch Bay        | Preview  | Inspector|
|                  |     (Lane Layout)      |          |          |
|                  |                        |          |          |
+------------------+------------------------+----------+----------+
|                         Transport                               |
+-----------------------------------------------------------------+
```

- **Block Library**: Drag blocks from here into lanes
- **Patch Bay**: Build your animation graph by connecting blocks
- **Preview**: Live animation preview with playback controls
- **Inspector**: Edit parameters of the selected block
- **Transport**: Play/pause, scrub time, change seed and speed

### Lanes

Blocks are organized into **lanes** by their role:

| Lane | Purpose |
|------|---------|
| Scene | What you're animating (SVG paths, text) |
| Phases | Time structure (entrance, hold, exit) |
| Fields | Per-element variation (timing, position, style) |
| Spec | Animation type (particles, line drawing, etc.) |
| Program | Compiled output and rendering |

### Block Types

| Category | Examples |
|----------|----------|
| Scene | SVG Paths, Sample Points |
| Fields | Radial Origin, Linear Stagger |
| Time | Phase Machine, Ease Ramp |
| Math | Add, Multiply, Constants |
| Compose | Demo Program, Per-Element Transport |
| Render | Particle Renderer, Canvas |

## Project Goal

The editor should be able to recreate all 60 reference animations from the `animations/` directory. These include:

| Technique | Description | Status |
|-----------|-------------|--------|
| 01 Line Drawing | Paths animate with stroke-dasharray | Partial |
| 02 Particles | Points coalesce from explosion pattern | Partial |
| 03 Morphing | Shapes interpolate between forms | Partial |
| 04 Glitch | RGB split, noise, scanlines | Partial |
| 05 Liquid | Metaball/goo filter effects | Partial |
| 06 Kinetic | Spring physics, elastic motion | TODO |
| 07 3D Transforms | Perspective rotations | TODO |
| 08 Reveal/Mask | Wipe and mask animations | TODO |
| 09 Wave/Ripple | Sine wave propagation | TODO |
| 10 Typewriter | Sequential character reveal | Partial |

Each technique has 6 variants: logo/text × original/varied/procedural.

## Project Structure

```
loom99-animations/
├── README.md                    # This file
├── ANIMATIONS.md                # Reference animation documentation
├── gallery/                     # Editor application
│   ├── src/
│   │   ├── editor/              # Editor components and logic
│   │   │   ├── README.md        # Editor usage guide
│   │   │   ├── CONCEPTS.md      # Conceptual documentation
│   │   │   ├── compiler/        # Block → Program compilation
│   │   │   └── runtime/         # Animation playback engine
│   │   ├── anim-v4/             # V4 animation implementations
│   │   └── components/          # React components
│   └── package.json
├── animations/                  # Reference HTML animations
│   ├── logo/                    # 30 logo animations
│   └── text/                    # 30 text animations
└── ui_example_docs/             # Architecture documentation
```

## Development

```bash
cd gallery

# Development
pnpm dev              # Start dev server (http://localhost:5173)
pnpm test             # Run tests
pnpm build            # Production build

# Type checking
pnpm exec tsc --noEmit
```

### Comparing Animations

To compare an editor animation against its HTML reference:

1. Open the reference: `open animations/logo/logo-02-particles.html`
2. Open the editor: `http://localhost:5173/#/editor`
3. Build an equivalent graph and compare visually

The gallery also has a side-by-side comparison view for V4 implementations.

## Documentation

| Document | Description |
|----------|-------------|
| [Editor README](./gallery/src/editor/README.md) | How to use the editor |
| [Concepts](./gallery/src/editor/CONCEPTS.md) | Mental model and architecture |
| [Animations Reference](./ANIMATIONS.md) | Original HTML animation details |
| [V4 Kernel](./ui_example_docs/v4_kernel.md) | Core animation primitives |
| [Archetypes](./ui_example_docs/archetypes/) | Per-technique specifications |

## License

This project was created for the loom99 brand. All rights reserved.
