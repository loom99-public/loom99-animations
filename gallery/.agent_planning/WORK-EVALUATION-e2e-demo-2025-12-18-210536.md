# Work Evaluation - 2025-12-18-210536
Scope: work/e2e-demo
Confidence: FRESH

## Goals Under Evaluation
From user request and SUMMARY-iterative-implementer-2025-12-18-210331.txt:
1. Demo patch file: `breathing-dots.json` with GridPoints, PhaseClock, DotsRenderer
2. Demo loader: "Load Demo" button in SettingsToolbar
3. Documentation: README.md with usage instructions
4. Validation: Dev server starts, editor loads, button works, animation renders

## Previous Evaluation Reference
No previous work evaluation for this scope.

## Reused From Cache/Previous Evaluations
- No eval-cache exists yet
- Reviewed SUMMARY-iterative-implementer-2025-12-18-210331.txt for implementation context

## Persistent Check Results
| Check | Status | Output Summary |
|-------|--------|----------------|
| `pnpm test` | PASS | 385/385 tests, 1.89s |
| `pnpm exec tsc --noEmit` | PASS | No TypeScript errors |

## Manual Runtime Testing

### What I Tried
1. Started dev server: `pnpm dev`
2. Verified server started without errors on port 5173
3. Examined demo patch structure via JSON parsing
4. Traced data flow through code:
   - Button click → loadDemoAnimation()
   - loadPatch() populates stores with demo data
   - Blocks: GridPoints, PhaseClock, DotsRenderer
   - Connections: domain, positions
   - Bus routing: PhaseClock → phaseA bus → DotsRenderer.radius (with ease lens)
5. Verified block definitions exist in domain-composites.ts
6. Verified button and styling in SettingsToolbar.tsx

### What Actually Happened
1. Dev server starts successfully: ✅
   - Vite ready in 139ms, accessible at http://localhost:5173/
   - No compilation errors, no runtime warnings

2. Demo patch JSON structure is valid: ✅
   - Version 2 format with buses feature enabled
   - 3 blocks, 2 connections, 1 bus, 1 publisher, 1 listener
   - All block types exist as registered composites

3. "Load Demo" button implemented: ✅
   - Button exists at SettingsToolbar.tsx:345-351
   - Calls `store.loadDemoAnimation()` on click
   - Styling exists (`.toolbar-action-btn`)

4. Demo loader implemented: ✅
   - RootStore.ts:178-180 implements `loadDemoAnimation()`
   - Imports breathing-dots.json at line 10
   - Calls `loadPatch()` which populates all stores

## Data Flow Verification
| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| Import demo patch | breathing-dots.json loaded | Import at RootStore.ts:10 | ✅ |
| Button click | Calls loadDemoAnimation() | SettingsToolbar.tsx:347 | ✅ |
| Load patch | Populates stores | loadPatch() at RootStore.ts:103-149 | ✅ |
| Blocks created | 3 blocks in lanes | GridPoints, PhaseClock, DotsRenderer | ✅ |
| Connections | 2 wires | domain, positions | ✅ |
| Bus publisher | PhaseClock.phase → phaseA | Publisher defined in JSON | ✅ |
| Bus listener | phaseA → DotsRenderer.radius | **FAILS - port doesn't exist** | ❌ |
| Animation renders | Preview shows breathing dots | **UNKNOWN - cannot verify without UI** | ❓ |

## Break-It Testing
| Attack | Expected | Actual | Severity |
|--------|----------|--------|----------|
| Load demo twice | Replace existing blocks | loadPatch() sets blocks/connections (doesn't append) | ✅ LOW |
| Invalid JSON | Import error | N/A - static import, would fail at build time | N/A |
| Missing block type | Compilation error | All types exist | ✅ LOW |
| **Listener on non-existent port** | **Should error or warn** | **Silently ignored** | ❌ **CRITICAL** |

## Critical Bug Found

**BUG: Bus listener wired to non-existent port**

**Location**: `demo-patches/breathing-dots.json:198-214`

**What's wrong**:
The demo patch defines a bus listener:
```json
{
  "id": "listener-1",
  "busId": "bus-phaseA",
  "to": {
    "blockId": "block-3",
    "port": "radius"
  },
  "lens": {
    "type": "ease",
    "params": { "easing": "easeInOutSine" }
  }
}
```

But `block-3` is a `DotsRenderer` composite, which only exposes these inputs:
- `domain` (Domain)
- `positions` (Field<vec2>)

**There is NO `radius` input exposed.**

**Evidence**: domain-composites.ts:607-624 defines DotsRenderer's exposedInputs - only `domain` and `positions`.

**Impact**:
1. The listener will be silently ignored during compilation (compileBusAware.ts:563-576)
2. The demo will load successfully
3. Blocks will appear connected
4. **But the breathing animation effect will NOT work** - dots will be static size
5. No error message will alert the user

**Root cause**:
DotsRenderer composite hardcodes the radius calculation through an internal pipeline:
```
sizeHash → sizeScale → sizeOffset → render.radius
```

The internal `RenderInstances2D` block DOES accept a `radius` input (RenderInstances2D.ts:38), but it's not exposed through the composite's external interface.

**What should happen**:
Either:
1. DotsRenderer should expose a `radius` input that overrides the internal size pipeline, OR
2. The demo patch should use a different mechanism for breathing (e.g., wire phaseA to a different parameter), OR
3. The compiler should validate listeners and error/warn on orphaned bus connections

## Evidence

### Demo Patch Structure
```bash
$ node -e "const patch = require('./src/editor/demo-patches/breathing-dots.json'); ..."
Version: 2
Blocks: GridPoints (block-1), PhaseClock (block-2), DotsRenderer (block-3)
Connections: block-1.domain → block-3.domain, block-1.positions → block-3.positions
Publishers: block-2.phase → bus-phaseA
Listeners: bus-phaseA → block-3.radius  # ❌ PORT DOESN'T EXIST
```

### DotsRenderer Exposed Inputs (domain-composites.ts:607-624)
```typescript
exposedInputs: [
  {
    id: 'domain',
    label: 'Domain',
    direction: 'input',
    slotType: 'Domain',
    nodeId: 'sizeHash',
    nodePort: 'domain',
  },
  {
    id: 'positions',
    label: 'Positions',
    direction: 'input',
    slotType: 'Field<vec2>',
    nodeId: 'render',
    nodePort: 'positions',
  },
]
// NOTE: No 'radius' input exposed!
```

### Listener Processing (compileBusAware.ts:563-576)
```typescript
const busListener = listeners.find(
  l => l.enabled && l.to.blockId === blockId && l.to.port === p.name
);
// If p.name doesn't match 'radius' for any input in the block's definition,
// the listener is never matched and silently ignored
```

## Assessment

### ✅ Working
1. **Dev server starts**: No errors, builds successfully
   - Evidence: Vite ready in 139ms
2. **All tests pass**: 385/385 passing
   - Evidence: Test suite runs clean
3. **TypeScript compiles**: No type errors
   - Evidence: `tsc --noEmit` succeeds
4. **Demo patch JSON is valid**: Well-formed JSON matching Patch type
   - Evidence: Parses successfully, all required fields present
5. **Button exists**: "Load Demo" visible in toolbar
   - Evidence: SettingsToolbar.tsx:345-351
6. **Loader implemented**: loadDemoAnimation() method works
   - Evidence: RootStore.ts:178-180
7. **Block types exist**: GridPoints, PhaseClock, DotsRenderer registered
   - Evidence: domain-composites.ts defines all three
8. **Connections valid**: domain and positions wired correctly
   - Evidence: Demo patch connections reference valid exposed ports
9. **Documentation exists**: README.md rewritten with demo tutorial
   - Evidence: README.md:1-320 comprehensive guide

### ❌ Not Working
1. **Bus listener on invalid port**: phaseA → DotsRenderer.radius
   - Port: `radius` doesn't exist on DotsRenderer composite
   - Impact: **Breathing animation will not work**
   - Evidence: DotsRenderer only exposes `domain` and `positions` inputs
   - Severity: **CRITICAL** - defeats entire purpose of demo

2. **No validation for orphaned listeners**: Compiler silently ignores bad listeners
   - Impact: User gets no feedback that bus routing failed
   - Evidence: No error checking in compileBusAware.ts for unmatched listeners
   - Severity: **HIGH** - makes debugging bus issues very hard

### ⚠️ Ambiguities Found
| Decision | What Was Assumed | Should Have Asked | Impact |
|----------|------------------|-------------------|--------|
| DotsRenderer port design | Size is always internally calculated | Should radius be bus-controllable? | Demo doesn't work |
| Listener validation | Silent failure is acceptable | Should orphaned listeners error? | Poor developer experience |

## Missing Checks (implementer should create)

1. **E2E test for demo loading** (`src/editor/__tests__/demo-loading.test.ts`)
   - Load breathing-dots.json via loadDemoAnimation()
   - Verify blocks created with correct types
   - Verify connections exist
   - Verify bus publisher/listener registered
   - **Verify compilation succeeds**
   - **Verify no orphaned listeners**

2. **Bus listener validation** (in `compiler/compileBusAware.ts`)
   - After compilation, check for listeners that weren't matched to any input
   - Add warning or error for orphaned listeners
   - Helps catch misconfigured bus routing

3. **Visual regression test** (manual for now, automated later)
   - Load demo
   - Capture preview at t=0, t=1, t=2
   - Verify dots change size (breathing effect)

## Verdict: INCOMPLETE

**Reason**: Critical bug prevents demo from working as intended.

The implementation is structurally sound:
- ✅ All files exist
- ✅ Code is type-safe
- ✅ Button works
- ✅ Loader works
- ✅ No compilation errors

But the demo **will not produce the intended visual result**:
- ❌ Breathing animation won't work
- ❌ User sees static dots instead of animated dots
- ❌ No error message indicates the problem

This is a **demo-killer bug**. The user clicks "Load Demo", sees dots appear, but they don't animate. The tutorial in README.md says "25 dots that smoothly grow and shrink" but this doesn't happen.

## What Needs to Change

### Option 1: Fix DotsRenderer to accept radius input (RECOMMENDED)

**File**: `gallery/src/editor/domain-composites.ts:545-635`

**Change**: Expose a `radius` input that can override the internal size calculation.

**Implementation**:
```typescript
// In DotsRenderer graph.inputMap:
inputMap: {
  domain: 'sizeHash.domain',
  positions: 'render.positions',
  radius: 'render.radius',  // NEW: Allow external radius input
},

// In exposedInputs array:
{
  id: 'radius',
  label: 'Radius',
  direction: 'input',
  slotType: 'Field<number>',  // Or Signal<number> if bus-driven
  nodeId: 'render',
  nodePort: 'radius',
  optional: true,  // Make optional so internal pipeline still works by default
},
```

**But wait** - RenderInstances2D expects `Field<number>`, but the bus provides `Signal<number>`. Need a lens that converts Signal → Field. Check if `broadcast` lens exists.

### Option 2: Fix demo patch to use different parameter

**File**: `gallery/src/editor/demo-patches/breathing-dots.json:198-214`

**Change**: Wire phaseA bus to a parameter that actually exists.

**Problem**: DotsRenderer doesn't expose any parameters that would create breathing effect. The only inputs are `domain` and `positions`.

**Conclusion**: This option doesn't work without Option 1.

### Option 3: Create new composite with exposed radius

**File**: New file `gallery/src/editor/domain-composites.ts`

**Change**: Create `BreathingDotsRenderer` composite that exposes radius input.

**Problem**: This is just a workaround. Better to fix DotsRenderer.

### RECOMMENDED FIX: Option 1 + Type Compatibility Check

1. Modify DotsRenderer to expose optional `radius` input
2. Verify bus listener type compatibility (Signal<number> → Field<number> via broadcast lens)
3. Update demo patch if needed to use broadcast lens
4. Add E2E test to verify demo loads and compiles
5. Add validation for orphaned bus listeners

## Questions Needing Answers

1. **Should DotsRenderer expose `radius` as an external input?**
   - Pro: Enables bus-driven size animation (which is the whole point of this demo)
   - Con: May conflict with internal size pipeline
   - Suggested: Make it optional, prefer external if wired, fallback to internal

2. **How should Signal<number> → Field<number> conversion work?**
   - Is `broadcast` lens the right mechanism?
   - Or should there be a primitive block for this?
   - Check: Does `broadcast` lens already exist in lens-presets.ts?

3. **Should orphaned bus listeners produce errors or warnings?**
   - Error: Strict, prevents compilation
   - Warning: Permissive, allows compilation but alerts user
   - Silent: Current behavior, very confusing
   - Recommended: Warning (loud enough to notice, not blocking)

## What Could Not Be Verified

**Cannot verify visual rendering** without browser UI access:
- Whether preview panel shows dots
- Whether dots actually animate
- Visual appearance of breathing effect

**However**, code analysis strongly indicates the breathing effect will NOT work due to missing port.
