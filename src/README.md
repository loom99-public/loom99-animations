# Animation Engines

This directory contains reusable TypeScript-based animation engines extracted from the loom99 animation files.

## Status: PROOF OF CONCEPT

**These engines are NOT production-ready.** They are a proof-of-concept to explore whether abstracting the animation logic provides value.

## Critical Reading

**BEFORE using these engines, read:**
- `/.agent_planning/ENGINE-FLEXIBILITY-ANALYSIS.md` - Documents 10 critical concerns

## What's Here

### Engines
- `engines/LineDrawingEngine.ts` - Reusable line drawing animation engine
- `engines/ParticleEngine.ts` - Reusable particle animation engine

### Types
- `types/animation.ts` - TypeScript type definitions for all configuration

### Templates
- `templates/line-drawing-test.html` - Demo showing engine usage (mock implementation)
- `templates/particles-test.html` - Demo showing engine usage (mock implementation)

## Goals

Replace 6 files with 1 engine instance:
- `logo-01-line-drawing.html` → LineDrawingEngine with variance='none'
- `logo-01-line-drawing-varied.html` → LineDrawingEngine with variance='moderate'
- `logo-01-line-drawing-procedural.html` → LineDrawingEngine with variance='heavy'
- `text-01-line-drawing.html` → LineDrawingEngine with variance='none', different paths
- `text-01-line-drawing-varied.html` → LineDrawingEngine with variance='moderate', different paths
- `text-01-line-drawing-procedural.html` → LineDrawingEngine with variance='heavy', different paths

Same pattern for particle animations (files 02).

## How to Use (Theoretical)

### 1. Compile TypeScript

```bash
# Install TypeScript if needed
npm install -g typescript

# Compile engines
cd src/engines
tsc LineDrawingEngine.ts --target ES2020 --module ES2020
tsc ParticleEngine.ts --target ES2020 --module ES2020
```

### 2. Import in HTML

```html
<script type="module">
import { LineDrawingEngine } from './engines/LineDrawingEngine.js';
import { LineDrawingPresets } from './engines/presets.js';

const svg = document.getElementById('logo');
const config = LineDrawingPresets.moderate({
    lines: [/* your line definitions */]
});

const engine = new LineDrawingEngine(svg, config, {
    onStateChange: (state) => console.log('State:', state)
});

engine.start();

svg.addEventListener('click', () => {
    if (engine.getState() === 'hold') {
        engine.startExit();
    }
});
</script>
```

### 3. Handle Varied Mode Regeneration

```javascript
// Varied mode needs NEW config on each restart
let engine = null;

function createEngine() {
    if (engine) engine.destroy();

    const config = generateRandomConfig(); // NEW config each time
    engine = new LineDrawingEngine(svg, config, {
        onExitComplete: () => {
            // Regenerate for varied mode
            if (config.variance !== 'none') {
                createEngine();
            } else {
                engine.restart();
            }
        }
    });

    engine.start();
}
```

## Known Limitations

### 1. No Config Hot-Swapping
You cannot change config while the engine is running. You must destroy and recreate.

### 2. TypeScript Compilation Required
Original files were pure HTML/JS. These require a build step.

### 3. All-or-Nothing
You cannot easily override behavior for a single element without modifying the engine.

### 4. Variant Mode Inefficiency
Varied/procedural modes require full destroy/recreate cycle on each loop, causing:
- Memory allocation churn
- DOM thrashing
- Loss of state

### 5. Untested with Text Animations
Only analyzed logo animations. Text animations may have different requirements.

### 6. Unknown Dynamic Text Compatibility
The existing dynamic text feature (postMessage API) may not work with this pattern.

## Alternative Approaches

See ENGINE-FLEXIBILITY-ANALYSIS.md for alternatives:

1. **Extract utilities only** - Keep files separate, share Random/Color utilities
2. **Hybrid approach** - Engines for standard, custom for unique cases
3. **Config-driven generator** - Generate the 60 files from templates at build time

## Files This Would Replace

If fully implemented, could replace:

### Logo Line Drawing (3 files)
- animations/logo/logo-01-line-drawing.html
- animations/logo/logo-01-line-drawing-varied.html
- animations/logo/logo-01-line-drawing-procedural.html

### Text Line Drawing (3 files)
- animations/text/text-01-line-drawing.html
- animations/text/text-01-line-drawing-varied.html
- animations/text/text-01-line-drawing-procedural.html

### Logo Particles (3 files)
- animations/logo/logo-02-particles.html
- animations/logo/logo-02-particles-varied.html
- animations/logo/logo-02-particles-procedural.html

### Text Particles (3 files)
- animations/text/text-02-particles.html
- animations/text/text-02-particles-varied.html
- animations/text/text-02-particles-procedural.html

**Total: 12 files → 2 engines + 12 config objects**

## Questions to Answer

1. Is 12 files → 2 engines worth the complexity?
2. Does this help or hurt maintainability?
3. What happens when we need animation type 11, 12, 13?
4. How do we handle future one-off customizations?
5. Is the goal fewer files or better abstractions?

## Recommendation

**DO NOT proceed with full implementation until:**
1. ✅ Verifying text animation compatibility
2. ✅ Testing dynamic text feature
3. ✅ Adding config hot-swap capability
4. ✅ Deciding on build tooling strategy
5. ✅ Getting user buy-in on tradeoffs

**This is exploration, not solution.**

## Next Steps

If proceeding:
1. Analyze text animation files for differences
2. Test with actual compiled TypeScript
3. Implement config hot-swapping
4. Build preset system to reduce config complexity
5. Create migration plan for existing files
6. Set up build tooling (esbuild, rollup, etc.)

If not proceeding:
1. Extract Random/Color utilities to shared file
2. Keep files separate
3. Use engines as reference for future refactoring
