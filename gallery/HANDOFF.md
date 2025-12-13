# Handoff: Side-by-Side HTML vs React Animation Comparison

## Current Task
Building a POC to compare original HTML animations with React ports side-by-side, controlled by a single scrubber. The goal is to identify and fix visual differences between the two implementations.

## What Was Just Completed

### Side-by-Side Viewer (`src/components/animations/SideBySideViewer.tsx`)
- Two SVG panels showing "HTML Original" and "React Port"
- Single scrub slider controls both animations simultaneously
- Click either panel to play/pause (loops automatically)
- Text input for precise time positioning
- Uses seeded random so both sides produce identical "random" values

### Varied HTML Animation Port (`src/animations/HtmlVariedAnimation.ts`)
Faithfully ported the variation logic from `logo-01-line-drawing-varied.html`:
- **Random modes**: converge, cascade, diagonal (different start directions)
- **Timing variance**: duration ±15%, stagger ±20%
- **Color variance**: hue shift ±15 degrees
- **Effects variance**: stroke width ±1.5, glow radius ±2

### Seeded Randomness
Added mulberry32 PRNG to both:
- `src/animations/LineDrawingAnimation.ts` - accepts optional `seed` parameter
- `src/animations/HtmlVariedAnimation.ts` - `createVariedHtmlLines(seed)` function

## Key Files

| File | Purpose |
|------|---------|
| `src/components/animations/SideBySideViewer.tsx` | Main comparison component |
| `src/components/animations/SideBySideViewer.css` | Styling for side-by-side layout |
| `src/animations/HtmlAnimatedLine.ts` | Base HTML animation line class |
| `src/animations/HtmlVariedAnimation.ts` | Varied HTML animation with seeded random |
| `src/animations/LineDrawingAnimation.ts` | React animation factory (now with seed support) |
| `src/components/AnimationCard.tsx` | Added "Compare" button for first 3 logo cards |

## How to Test
1. Run `pnpm dev`
2. Open http://localhost:5174/
3. Click "01 Line Drawing / Path Animation" to expand
4. Click "Compare" on any of the first 3 logo animation cards
5. Click the animation panels to play/pause, or use the scrubber

## Known Issues / Next Steps
1. The HTML and React animations may still show visual differences - that's the point of the comparison tool
2. Only the first 3 logo animations have the Compare button (POC limitation)
3. Text target animations not yet supported in comparison view
4. Procedural variant uses same logic as varied (could be expanded)

## Critical Architecture Context

### Animation Timing
Both systems use elapsed time from animation start:
- HTML: `line.updateEntrance(elapsed)`
- React: `animation.seek(elapsed)`

### Path Data
All path definitions live in `src/data/pathData.ts`:
- `LOGO_PATHS` - 6 lines for "loom99" logo
- `TEXT_PATHS` - lines for "DO MORE NOW" text

### Variance Levels
- `original` - No randomization, fixed values
- `varied` - Moderate randomization with seeded PRNG
- `procedural` - Higher randomization (currently same as varied in HTML port)

## Dev Server
The Vite dev server may still be running on port 5174. Check with `lsof -i :5174`.
