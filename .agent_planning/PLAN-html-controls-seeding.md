# PLAN: HTML Animation Play/Pause Controls + Seeded Randomness

**Goal**: Add play/pause controls and seeded randomness to original HTML animations WITHOUT changing visual output.

**Critical Constraint**: Animations must look identical before and after changes.

---

## Scope

**61 HTML animation files:**
- 30 logo animations (`animations/logo/`)
- 31 text animations (`animations/text/`)

**3 variant types per technique:**
- Base (no randomness - deterministic)
- Varied (subtle randomness)
- Procedural (heavy randomness)

---

## Change 1: Play/Pause Controls

### Approach

Add a 4th animation state `paused` alongside existing `entrance`, `hold`, `exit`:

```javascript
// Current pattern
let animationState = 'entrance'; // 'entrance', 'hold', 'exit'

// New pattern
let animationState = 'entrance'; // 'entrance', 'hold', 'exit', 'paused'
let pausedTime = 0;              // Elapsed time when paused
let pausedFromState = null;      // Which state we paused from
```

### Implementation

1. **On pause:**
   - Store `pausedTime = performance.now() - startTime`
   - Store `pausedFromState = animationState`
   - Set `animationState = 'paused'`
   - Clear `holdTimeout` if active
   - Don't call `requestAnimationFrame`

2. **On resume:**
   - Restore `animationState = pausedFromState`
   - Set `startTime = performance.now() - pausedTime`
   - Resume `requestAnimationFrame(animate)`

3. **UI Elements:**
   - Single play/pause button (▶/⏸)
   - Keyboard shortcut: Space to toggle
   - Minimal, non-intrusive styling

### Files Affected

All 61 HTML files need this change. Strategy:
- Create shared utility function in `animations/shared/`
- Each file includes the utility and wires up the button

---

## Change 2: Seeded Randomness

### Current State

- `SeededRandom` class **already exists** in `animations/shared/random-utils.js`
- `createRandomConfig()` already supports seed parameter
- BUT: No HTML files currently use it - all use `Math.random()` directly

### Approach

**Backward-compatible seeding via URL parameter:**

```javascript
// At animation startup
const urlParams = new URLSearchParams(window.location.search);
const seed = urlParams.get('seed') ? parseInt(urlParams.get('seed')) : Date.now();

// Replace Random object's internal rng
const seededRng = new SeededRandom(seed);
Random.range = (min, max) => min + seededRng.next() * (max - min);
// ... patch all Random.* methods
```

### Seed Display

- Show current seed in UI (small text)
- Click to copy seed to clipboard
- URL updates with seed on load (for bookmarking)

### Files Affected

**Varied & Procedural variants only** (base variants have no randomness):
- 20 logo files (varied + procedural)
- 20 text files (varied + procedural)

Base animations (20 files) need no randomness changes, only play/pause.

---

## Implementation Order

### Phase 1: Shared Utilities
1. Create `animations/shared/controls.js` - play/pause logic
2. Update `animations/shared/random-utils.js` - seed URL param handling
3. Create `animations/shared/controls.css` - button styling

### Phase 2: Template Update
4. Update `animations/template.html` with both features
5. Test thoroughly on one animation

### Phase 3: Logo Animations (30 files)
6. Apply to base animations (10 files) - play/pause only
7. Apply to varied animations (10 files) - play/pause + seeding
8. Apply to procedural animations (10 files) - play/pause + seeding

### Phase 4: Text Animations (31 files)
9. Apply same pattern to text animations

### Phase 5: Verification
10. Visual regression check - compare before/after
11. Seed reproducibility check - same seed = same animation

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Visual changes | Test each animation before/after, same seed should produce identical output |
| Timing drift after pause/resume | Store exact elapsed time, not just state |
| Random sequence changes | Seed must be set BEFORE any Random.* calls |
| Breaking existing bookmarks | No seed param = use Date.now() (current behavior) |

---

## Design Decisions (Confirmed)

1. **Controls position**: Bottom-center (like video players)
2. **Seed handling**: Display only + copy button, passed as `?seed=` query parameter
3. **Existing controls**: Standardize `logo-01-line-drawing.html` to match others (remove scrubber)

---

## Estimated Complexity

- Phase 1 (Utilities): Low - straightforward JS
- Phase 2 (Template): Low - single file
- Phase 3 (Logo): Medium - 30 files, mostly mechanical
- Phase 4 (Text): Medium - 31 files, same pattern
- Phase 5 (Verification): Medium - need to visually check each

**Total: 61 files to modify, pattern is repetitive after first few.**
