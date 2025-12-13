# Animation Editor

A visual programming environment for building SVG animations using a node-based patch bay interface.

## Quick Start

```bash
# Start the dev server
cd gallery && pnpm dev

# Open the editor
open http://localhost:5173/#/editor
```

## Interface Overview

The editor has five main areas:

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

- **Block Library** (left): Drag blocks from here into lanes
- **Patch Bay** (center): Where you build the animation graph
- **Preview** (right): Live animation preview
- **Inspector** (far right): Edit parameters of selected blocks
- **Transport** (bottom): Playback controls, seed, speed

## Basic Workflow

### 1. Add Blocks

Drag blocks from the library onto lanes in the patch bay. The library filters to show relevant blocks based on which lane you're targeting.

### 2. Connect Blocks

Blocks have **ports** (connection points):
- **Inputs** on the left side
- **Outputs** on the right side

To connect blocks:
1. Click an output port (it gets selected)
2. Click a compatible input port on another block
3. A wire appears connecting them

Right-click a port for more options (disconnect, etc.).

### 3. Configure Parameters

Click any block to select it. The Inspector panel shows its parameters. Adjust values using sliders, dropdowns, or text inputs.

### 4. Preview

The preview panel shows your animation in real time. Use the transport bar to:
- Play/pause the animation
- Scrub through time
- Change the random seed
- Adjust playback speed

## Lanes

Lanes are horizontal tracks that organize blocks by their purpose. The editor offers two layout presets:

**Simple (5 lanes)** - Good for learning:
- **Scene**: What you're animating (logo, text)
- **Phases**: Time structure (entrance, hold, exit)
- **Fields**: Per-element variation (timing, motion, style)
- **Spec**: Animation type (LineMorph, Particles, etc.)
- **Program**: Output and rendering

**Detailed (9 lanes)** - More explicit organization:
- Splits Fields into Motion/Timing/Style
- Separates compile from compositing stages

Switch layouts using the gear icon in the settings toolbar.

## Block Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| Scene | Define what gets animated | SVG Paths, Sample Points |
| Fields | Per-element data | Radial Origin, Linear Stagger |
| Math | Scalar computations | Add, Multiply, Sin |
| Time | Animation timing | Phase Machine, Ease Ramp |
| Compose | Combine elements | Per-Element Transport, Demo Program |
| Render | Final output | Particle Renderer, Canvas |
| Adapters | Type conversion | Scene → Targets, Field → Signal |

## Port Types

Ports have types that determine what can connect to what. Common types:

| Type | Description |
|------|-------------|
| `Scene` | Collection of SVG paths |
| `SceneTargets` | Points sampled from paths |
| `Field<Point>` | Per-element positions |
| `Field<Duration>` | Per-element time values |
| `Field<number>` | Per-element numbers |
| `Signal<Unit>` | Time-varying 0-1 value |
| `Signal<PhaseSample>` | Phase machine output |
| `Program` | Compiled animation |
| `RenderTree` | Final render output |

Compatible ports highlight when you're making connections.

## Example: Simple Particle Animation

1. Drag **SVG Paths** into the Scene lane
2. Drag **Sample Points** to Scene, connect it to SVG Paths
3. Drag **Radial Origin** into Fields
4. Drag **Linear Stagger** into Fields
5. Drag **Phase Machine** into Phases
6. Drag **Demo Program** into Spec
   - Set variant to "Particles"
7. Drag **Program Output** into Program, connect to Demo Program

The preview should show particles animating.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Delete` / `Backspace` | Delete selected block |
| `Escape` | Deselect / close menus |

## Settings

Click the gear icon to access settings:

- **Layout**: Switch between Simple and Detailed lane layouts
- **Filter by Lane**: Show only relevant blocks in library
- **Show Type Hints**: Display port types on hover
- **Highlight Compatible**: Highlight valid connection targets

## Concepts

For a deeper understanding of the concepts behind this editor, see [CONCEPTS.md](./CONCEPTS.md).

## Troubleshooting

**Editor shows blank screen:**
- Check browser console for errors
- Verify route is `/#/editor` (hash-based routing)
- Run `pnpm exec tsc --noEmit` to check for TypeScript errors

**Can't connect two ports:**
- Port types must be compatible
- Make sure you're connecting output → input (not input → input)
- Check the log window at the bottom for error messages

**Animation not updating:**
- Ensure blocks are connected to a Program Output
- Check that all required inputs are connected
- Look for error decorations (red highlights) on blocks

**Styles not loading:**
- Hard refresh the browser (Cmd+Shift+R / Ctrl+Shift+R)
- Restart the dev server
