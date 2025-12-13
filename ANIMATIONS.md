# Reference Animations

This document describes the 60 hand-crafted HTML animations that serve as the reference implementations for the editor. The goal is to recreate these animations in the visual editor.

## Table of Contents

- [Overview](#overview)
- [Animation Techniques](#animation-techniques)
- [File Structure](#file-structure)
- [Viewing Animations](#viewing-animations)
- [Technical Details](#technical-details)
- [Animation Patterns](#animation-patterns)
- [Design Reference](#design-reference)

## Overview

The collection includes **60 animations**:
- **10 techniques** × **2 targets** (logo, text) × **3 variants** (original, varied, procedural)

Each animation is:
- **Self-contained**: Standalone HTML with no external dependencies
- **Accessible**: Respects `prefers-reduced-motion`
- **Interactive**: Click anywhere to restart
- **Performant**: Optimized for 60fps

## Animation Techniques

### 01. Line Drawing / Path Animation
Lines animate using `stroke-dasharray` and `stroke-dashoffset`.

- **Logo**: Lines shoot in from off-canvas and curve into shape
- **Text**: Strokes form letters with staggered timing

Key parameters: path length, draw duration, stagger delay

### 02. Particle Effects
Points coalesce from scattered positions to form the target shape.

- **Logo**: Particles explode outward then converge
- **Text**: Scattered particles gravitate to letter positions

Key parameters: particle count, start radius, trajectory easing

### 03. Morphing / Shape Transitions
Shapes interpolate between source and target forms.

- **Logo**: Geometric primitives morph into logo paths
- **Text**: Simple shapes transform into letters

Key parameters: source shapes, interpolation curves, morph duration

### 04. Glitch Effects
Digital distortion with RGB splitting and noise.

- **Logo**: RGB channel offset, transform jitter
- **Text**: Chromatic aberration, scanlines

Key parameters: split offset, noise intensity, glitch frequency

### 05. Liquid / Fluid Motion
Metaball effects using SVG goo filter.

- **Logo**: Liquid droplets merge together
- **Text**: Fluid blobs coalesce into letters

Key parameters: filter blur, contrast threshold, drop timing

### 06. Kinetic Typography / Motion
Spring physics and elastic motion.

- **Logo**: Components fly in with overshoot
- **Text**: Letters spiral with elastic bounce

Key parameters: spring tension, damping, entry trajectories

### 07. 3D Transforms
Perspective rotations in 3D space.

- **Logo**: Flips through space with rotation
- **Text**: Words rotate on different axes

Key parameters: perspective, rotation axes, transform origin

### 08. Reveal / Mask Animations
Progressive reveal using masks or clips.

- **Logo**: Left-to-right wipe
- **Text**: Expanding circular mask from center

Key parameters: mask shape, reveal direction, timing

### 09. Wave / Ripple Effects
Sine wave propagation through elements.

- **Logo**: Ripples through components
- **Text**: Letters oscillate in wave patterns

Key parameters: wave frequency, amplitude, propagation speed

### 10. Typewriter / Sequential Reveal
Character-by-character appearance.

- **Logo**: Monospace typewriter with cursor
- **Text**: Classic typewriter effect

Key parameters: character delay, cursor blink rate

## File Structure

```
animations/
├── logo/
│   ├── logo-01-line-drawing.html
│   ├── logo-01-line-drawing-varied.html
│   ├── logo-01-line-drawing-procedural.html
│   ├── logo-02-particles.html
│   ├── logo-02-particles-varied.html
│   ├── logo-02-particles-procedural.html
│   └── ... (30 total)
├── text/
│   ├── text-01-line-drawing.html
│   ├── text-01-line-drawing-varied.html
│   ├── text-01-line-drawing-procedural.html
│   └── ... (30 total)
└── template.html
```

### Variant Types

| Variant | Description |
|---------|-------------|
| **Original** | Hand-tuned, deterministic animation |
| **Varied** | Same structure with parameter variation |
| **Procedural** | Seed-based randomization |

### Naming Convention

```
{target}-{number}-{technique}[-variant].html

Examples:
  logo-02-particles.html           # Original
  logo-02-particles-varied.html    # Varied
  text-05-liquid-procedural.html   # Procedural
```

## Viewing Animations

### Individual Animation
```bash
open animations/logo/logo-02-particles.html
```

Click anywhere to restart the animation.

### Gallery View
```bash
open index.html
```

Browse all animations organized by technique.

## Technical Details

### Technologies
- **SVG**: Vector paths and filters
- **Canvas API**: Particle rendering (techniques 02, 04)
- **CSS**: Transforms, filters, animations
- **JavaScript (ES6+)**: Animation loops, easing

### Browser Support
Modern browsers with:
- SVG and CSS transforms
- `requestAnimationFrame`
- ES6 JavaScript

### Performance
- Target: 60fps desktop, smooth mobile
- Hardware-accelerated CSS transforms
- Optimized particle counts
- Minimal DOM manipulation

### Accessibility
All animations support `prefers-reduced-motion`:
```javascript
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (prefersReducedMotion) {
  // Show final state or gentle fade
}
```

## Animation Patterns

### Easing Functions

```javascript
// Quick start, slow end
function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

// Overshoot and settle
function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// Bouncy spring
function easeOutElastic(t) {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}
```

### Timing Structure

Most animations follow this pattern:

```javascript
const delay = 0;           // Start time (ms)
const duration = 2000;     // Run time (ms)

function animate(timestamp) {
  const elapsed = timestamp - startTime;
  const progress = Math.min(1, (elapsed - delay) / duration);
  const eased = easingFunction(progress);

  // Apply eased value to animation

  if (progress < 1) {
    requestAnimationFrame(animate);
  }
}
```

### Staggered Elements

```javascript
elements.forEach((el, i) => {
  const stagger = i * 80;  // 80ms between elements
  const elProgress = Math.max(0, (elapsed - stagger) / duration);
  // Animate element
});
```

### Phase Structure

Complex animations use phases:
```javascript
const phases = {
  entrance: { start: 0, duration: 2000 },
  hold: { start: 2000, duration: 1500 },
  exit: { start: 3500, duration: 500 }
};
```

## Design Reference

### Logo
- **Elements**: L, O, O, M, 9, 9 (6 separable paths)
- **Colors**: Cyan (#00d4ff) → Purple (#7b2ff7) → Pink (#ff2d75)
- **Style**: Clean stroke-based typography

### Text ("Do It Now")
- **"DO"**: Red (#ff2d2d)
- **"IT"**: Orange (#ff6b00)
- **"NOW"**: Yellow (#ffdd00)

### Durations
| Type | Duration |
|------|----------|
| Short | 800-1200ms |
| Medium | 1500-2000ms |
| Long | 2500-3000ms |

See `assets/logo-design.html` for the full design reference.

## Using as Reference

When implementing animations in the editor:

1. **Open the reference**: `open animations/logo/logo-02-particles.html`
2. **Study the behavior**: Note timing, easing, element count
3. **Check the source**: View the HTML/JS for exact parameters
4. **Build in editor**: Recreate using blocks
5. **Compare**: Side-by-side visual comparison

Key things to match:
- Entrance/hold/exit durations
- Easing functions
- Start positions and trajectories
- Color handling
- Stagger timing
