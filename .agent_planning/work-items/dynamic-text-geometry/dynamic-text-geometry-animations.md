# Dynamic Text for Geometry-Based Animations

## Problem Statement

Some animations use hand-crafted geometry (stroke paths, particle positions, blob coordinates) rather than filled text shapes. Converting arbitrary text to these formats requires additional processing beyond what opentype.js provides.

## Animation Types & Solutions

### 1. Line Drawing (Hardest)

**Current approach:** Hand-drawn SVG stroke paths that trace letter outlines with specific start points and drawing directions.

**What's needed:**
1. **Path-to-stroke conversion** - opentype.js gives filled paths (the shape). Need to extract the *outline* as a drawable stroke.
2. **Stroke segmentation** - Break continuous outlines into logical drawing segments (one stroke per letter part).
3. **Drawing order** - Determine which segment to draw first, direction of each stroke.
4. **Animation timing** - Calculate stroke lengths for `stroke-dasharray` animation.

**Potential approach:**
```
Text → opentype.js → Filled Path → Extract outline points →
Simplify/segment → Calculate stroke order → Animate with stroke-dasharray
```

**Libraries to investigate:**
- `paper.js` - Path operations, can extract outlines
- `svg-path-commander` - Path manipulation
- Custom algorithm to trace path bounds and segment

**Key challenge:** A filled "O" is one path. A drawn "O" needs to be a single stroke that goes around. Converting fill → stroke while maintaining drawable segments is non-trivial.

---

### 2. Particles (Moderate)

**Current approach:** Sample pixel positions from text rendered on a hidden canvas, create particles at those positions.

**What's needed:**
1. Render text (using opentype.js path or canvas fillText) to offscreen canvas
2. Sample pixels at regular intervals
3. Create particles where alpha > threshold

**This actually already works** - the particle animations use `getImageData()` to sample. Just need to:
- Accept custom text input
- Re-render to canvas with new text
- Re-sample particle positions

**Solution:** Modify `getTextPoints()` function to accept dynamic text parameter instead of hardcoded strings.

---

### 3. Morphing (Hard)

**Current approach:** Hand-crafted SVG paths with matched point counts for smooth interpolation.

**What's needed:**
1. **Path normalization** - Different letters have different point counts. Need to normalize.
2. **Shape interpolation** - Library to morph between arbitrary shapes.

**Potential approach:**
```
Text → opentype.js → Path A (start shape)
                  → Path B (letter shape)
                  → flubber.js interpolate(A, B)
```

**Libraries:**
- `flubber.js` - Smooth shape interpolation between arbitrary SVG paths
- `polymorph.js` - Similar morphing library

**Key insight:** Don't try to match points manually. Use a library that handles arbitrary path morphing.

---

### 4. Liquid/Blobs (Moderate)

**Current approach:** Manually positioned circles/blobs that form letter shapes.

**What's needed:**
1. Get letter path from opentype.js
2. Fill path interior with packed circles (circle packing algorithm)
3. Or place circles along path outline at regular intervals

**Potential approach:**
```
Text → opentype.js → Path → Circle packing algorithm → Blob positions
```

**Libraries/algorithms:**
- `d3-hierarchy` pack layout
- Custom circle packing (place circles, check if center is inside path using point-in-polygon)

**Key challenge:** Circle packing to fill arbitrary shapes. Well-studied problem with existing solutions.

---

## Recommended Priority

1. **Particles** - Easiest, mostly works already, just needs text parameter wired up
2. **Liquid/Blobs** - Circle packing is a solved problem
3. **Morphing** - Use flubber.js, avoid manual point matching
4. **Line Drawing** - Hardest, may need custom stroke extraction algorithm

## Architecture Suggestion

Create a `TextGeometryGenerator` class:

```javascript
class TextGeometryGenerator {
  constructor(font) { this.font = font; }

  // For filled-shape animations (reveal, kinetic, etc.)
  toFilledPaths(text, fontSize) { }

  // For particle animations
  toParticlePositions(text, fontSize, density) { }

  // For blob/liquid animations
  toBlobPositions(text, fontSize, blobSize) { }

  // For morphing animations
  toMorphablePath(text, fontSize) { }

  // For line-drawing (hardest)
  toStrokeSegments(text, fontSize) { }
}
```

Each method returns the appropriate data structure for that animation type.

## References

- opentype.js: https://opentype.js.org/
- flubber.js: https://github.com/veltman/flubber
- paper.js: http://paperjs.org/
- Circle packing: https://www.npmjs.com/package/d3-hierarchy
