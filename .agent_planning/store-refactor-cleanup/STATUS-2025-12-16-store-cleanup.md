# Status Report: EditorStore Refactoring Cleanup
**Timestamp**: 2025-12-16
**Scope**: store.ts refactoring recovery
**Confidence**: FRESH

## Executive Summary
The store.ts file was broken during refactoring. We've already fixed the `addBlock` method. Now there's a new runtime error from missing computed properties. Comprehensive comparison reveals **4 missing observables**, **4 missing computed getters**, and **1 broken method**.

**Runtime Error**:
```
TypeError: undefined is not an object (evaluating 'currentLayout.id')
in SettingsToolbar.tsx:300
```

## Missing Items from store.ts vs store.ts.backup

### ACTIVELY BROKEN (Causes Runtime Errors)

#### 1. Missing Observable: `currentLayoutId`
**Status**: MISSING - CAUSES RUNTIME ERROR
**Evidence**:
- Backup file line 97: `currentLayoutId: string = DEFAULT_LAYOUT.id`
- Current file: NOT PRESENT
- Used by: SettingsToolbar.tsx:196, LayoutSelector.tsx:16,24, store switchLayout method

**Impact**: CRITICAL - `store.currentLayout` returns undefined, breaking SettingsToolbar

#### 2. Missing Computed: `currentLayout`
**Status**: MISSING - CAUSES RUNTIME ERROR
**Evidence**:
- Backup file lines 252-254:
  ```typescript
  get currentLayout(): LaneLayout {
    return getLayoutById(this.currentLayoutId) ?? DEFAULT_LAYOUT;
  }
  ```
- Current file: NOT PRESENT
- Used by: SettingsToolbar.tsx:196, LayoutSelector.tsx:16,24,33

**Impact**: CRITICAL - Direct cause of the TypeError

#### 3. Missing Computed: `availableLayouts`
**Status**: MISSING - WILL CAUSE RUNTIME ERROR
**Evidence**:
- Backup file lines 256-259:
  ```typescript
  get availableLayouts(): readonly LaneLayout[] {
    return PRESET_LAYOUTS;
  }
  ```
- Current file: NOT PRESENT
- Used by: LayoutSelector.tsx:17,27

**Impact**: HIGH - LayoutSelector will crash when opened

#### 4. Missing Computed: `activeLane`
**Status**: MISSING - WILL CAUSE RUNTIME ERROR
**Evidence**:
- Backup file lines 231-234:
  ```typescript
  get activeLane(): Lane | null {
    if (!this.uiState.activeLaneId) return null;
    return this.lanes.find((l) => l.id === this.uiState.activeLaneId) ?? null;
  }
  ```
- Current file: NOT PRESENT
- Used by: BlockLibrary.tsx:176,283,320

**Impact**: HIGH - BlockLibrary lane filtering will break

#### 5. Missing Computed: `selectedPortInfo`
**Status**: MISSING - WILL CAUSE RUNTIME ERROR
**Evidence**:
- Backup file lines 236-249:
  ```typescript
  get selectedPortInfo(): { block: Block; slot: import('./types').Slot; direction: 'input' | 'output' } | null {
    const portRef = this.uiState.selectedPort;
    if (!portRef) return null;

    const block = this.blocks.find((b) => b.id === portRef.blockId);
    if (!block) return null;

    const slots = portRef.direction === 'input' ? block.inputs : block.outputs;
    const slot = slots.find((s) => s.id === portRef.slotId);
    if (!slot) return null;

    return { block, slot, direction: portRef.direction };
  }
  ```
- Current file: NOT PRESENT
- Used by: Inspector.tsx:680,688-696

**Impact**: HIGH - Inspector port wiring panel will crash

### BROKEN METHODS

#### 6. Method: `switchLayout`
**Status**: INCOMPLETE - LOGIC ERROR
**Evidence**:
- **Current implementation (lines 539-559)**:
  - Does NOT update `currentLayoutId`
  - Does NOT check `layoutId === this.currentLayoutId` to prevent redundant switches
  - Does NOT preserve block lane assignments properly (uses simple migration)
  - Does NOT use `mapLaneToLayout` helper

- **Backup implementation (lines 962-991)**:
  - Properly checks `layoutId === this.currentLayoutId` and returns early
  - Sets `this.currentLayoutId = layoutId` (line 978)
  - Captures `oldLayout` from `this.currentLayout` getter
  - Uses `mapLaneToLayout(oldLaneId, oldLayout, newLayout)` for intelligent migration

**Impact**: MEDIUM - Layout switching works but doesn't update currentLayoutId state, causing inconsistency

## Missing MobX Decorator Annotations

The current store.ts MobX annotations (lines 105-175) are MISSING:

```typescript
// MISSING in makeObservable():
currentLayoutId: observable,    // line 155 in backup
currentLayout: computed,         // line 213 in backup
availableLayouts: computed,      // line 214 in backup
activeLane: computed,            // line 211 in backup
selectedPortInfo: computed,      // line 212 in backup
```

## Files That Will Break

| File | Uses | Status |
|------|------|--------|
| **SettingsToolbar.tsx:196** | `store.currentLayout` | ❌ BROKEN NOW |
| **SettingsToolbar.tsx:213** | `currentLayout.id` | ❌ BROKEN NOW |
| **LayoutSelector.tsx:16** | `store.currentLayout` | ❌ BROKEN NOW |
| **LayoutSelector.tsx:17** | `store.availableLayouts` | ⚠️ WILL BREAK |
| **LayoutSelector.tsx:24** | `currentLayout.id` | ❌ BROKEN NOW |
| **LayoutSelector.tsx:33** | `currentLayout.description` | ❌ BROKEN NOW |
| **BlockLibrary.tsx:176** | `store.activeLane` | ⚠️ WILL BREAK |
| **BlockLibrary.tsx:283** | `activeLane.label` | ⚠️ WILL BREAK |
| **BlockLibrary.tsx:320** | `activeLane.label` | ⚠️ WILL BREAK |
| **Inspector.tsx:680** | `store.selectedPortInfo` | ⚠️ WILL BREAK |

## Implementation Red Flags

### Current store.ts Issues:
1. **Line 68**: `lanes` initialized with `SIMPLE_LAYOUT` but no `currentLayoutId` tracking
2. **Lines 539-559**: `switchLayout` method doesn't update any layout ID state
3. **Constructor**: Missing 5 computed property annotations
4. **No layout state**: Can't detect which layout is active

### Backup store.ts (Correct):
1. **Line 97**: `currentLayoutId: string = DEFAULT_LAYOUT.id` - proper observable
2. **Line 100**: `lanes` initialized from `DEFAULT_LAYOUT`
3. **Lines 962-991**: `switchLayout` properly updates `currentLayoutId` and migrates blocks intelligently
4. **Constructor lines 213-214**: All computed properties properly annotated

## Data Flow Verification

### Current (BROKEN) Flow:
```
User clicks layout dropdown → SettingsToolbar reads store.currentLayout
→ UNDEFINED (not a getter) → TypeError
```

### Expected (WORKING) Flow:
```
User clicks layout dropdown → SettingsToolbar reads store.currentLayout (computed getter)
→ Returns getLayoutById(this.currentLayoutId) ?? DEFAULT_LAYOUT
→ Renders layout name and description
```

## Recommendations (Priority Order)

### 1. IMMEDIATE - Fix Runtime Error (CRITICAL)
Add missing observable and computed properties to restore basic functionality:

**a) Add `currentLayoutId` observable (after line 95):**
```typescript
/** Current lane layout ID */
currentLayoutId: string = DEFAULT_LAYOUT.id;
```

**b) Add computed getters (after line 190):**
```typescript
/** Get current lane layout */
get currentLayout(): LaneLayout {
  return getLayoutById(this.currentLayoutId) ?? DEFAULT_LAYOUT;
}

/** Get all available layouts */
get availableLayouts(): readonly LaneLayout[] {
  return PRESET_LAYOUTS;
}

/** Get active lane (for palette filtering) */
get activeLane(): Lane | null {
  if (!this.uiState.activeLaneId) return null;
  return this.lanes.find((l) => l.id === this.uiState.activeLaneId) ?? null;
}

/** Get selected port with full block/slot info */
get selectedPortInfo(): { block: Block; slot: import('./types').Slot; direction: 'input' | 'output' } | null {
  const portRef = this.uiState.selectedPort;
  if (!portRef) return null;

  const block = this.blocks.find((b) => b.id === portRef.blockId);
  if (!block) return null;

  const slots = portRef.direction === 'input' ? block.inputs : block.outputs;
  const slot = slots.find((s) => s.id === portRef.slotId);
  if (!slot) return null;

  return { block, slot, direction: portRef.direction };
}
```

**c) Add MobX annotations (in constructor):**
```typescript
currentLayoutId: observable,
currentLayout: computed,
availableLayouts: computed,
activeLane: computed,
selectedPortInfo: computed,
```

### 2. Fix `switchLayout` Method (HIGH)
Replace lines 539-559 with the backup implementation (lines 962-991):
- Add check: `if (!newLayout || layoutId === this.currentLayoutId) return;`
- Capture old layout: `const oldLayout = this.currentLayout;`
- Update ID: `this.currentLayoutId = layoutId;`
- Use intelligent migration: `mapLaneToLayout(oldLaneId, oldLayout, newLayout)`

### 3. Verify No Other Missing Methods (MEDIUM)
Run diff on full file to check for any other missing utility methods or getters

## Test Suite Assessment

**Tests that should catch this**:
- ❌ No test for `store.currentLayout` getter
- ❌ No test for `switchLayout` updating `currentLayoutId`
- ❌ No integration test for SettingsToolbar with store

**Recommendation**: Add tests for computed properties and state mutations

## Verdict

- [x] **PAUSE** - Critical runtime errors need immediate fix before proceeding
- [ ] CONTINUE - Not ready until missing properties restored

## Next Steps

1. Add all 5 missing properties (observable + computed getters + annotations)
2. Fix `switchLayout` method to update `currentLayoutId`
3. Test in browser: Open editor → Click layout dropdown → Verify no errors
4. Test lane filtering: Hover over lane → Check BlockLibrary updates
5. Test port selection: Click port → Check Inspector shows wiring panel
6. Run full diff to check for any other missing pieces
