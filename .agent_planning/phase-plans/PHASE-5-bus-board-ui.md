# Phase 5: Bus Board UI

**Status**: PARTIAL (60% complete)
**Goal**: Replace lanes with a musical, legible control surface.

---

## Summary

Phase 5 creates a Bus Board UI that makes buses the primary mental model. Users should understand "why things move" by seeing bus activity, not by tracing wires.

---

## What's Implemented (60%)

### Current Components

| Component | Status | File |
|-----------|--------|------|
| `BusBoard.tsx` | ✅ Done | DAW-style mixer layout |
| `BusChannel.tsx` | ✅ Done | Individual bus strip |
| `BusViz.tsx` | ✅ Done | Live value visualization |
| `BusPicker.tsx` | ✅ Done | Bus selection modal |
| `BusInspector.tsx` | ✅ Done | Bus configuration panel |
| `BusCreationDialog.tsx` | ✅ Done | New bus creation |

### Current Layout

```
┌─────────────────────────────────────────────────┐
│ BUS BOARD                                       │
├─────────┬─────────┬─────────┬─────────┬─────────┤
│ phaseA  │ phaseB  │ energy  │ pulse   │ palette │
│ ~~~~~~  │ ~~~~~~  │ ~~~~~~  │ ~~~~~~  │ ~~~~~~  │
│ [viz]   │ [viz]   │ [viz]   │ [viz]   │ [viz]   │
│         │         │         │         │         │
│ Pub: 1  │ Pub: 0  │ Pub: 0  │ Pub: 0  │ Pub: 0  │
│ Sub: 2  │ Sub: 0  │ Sub: 0  │ Sub: 0  │ Sub: 0  │
└─────────┴─────────┴─────────┴─────────┴─────────┘
```

---

## What's Missing (40%)

### 1. Publisher Inspection & Ordering
**Priority**: HIGH
**Purpose**: See and reorder what feeds each bus

**UI**:
```
┌─ phaseA ─────────────────┐
│ Publishers (3):          │
│ ┌──────────────────────┐ │
│ │ ≡ PhaseClock-1       │ │  ← Drag handle
│ │   sortKey: 0         │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ ≡ PhaseClock-2       │ │
│ │   sortKey: 1         │ │
│ └──────────────────────┘ │
│ [+ Add Publisher]        │
└──────────────────────────┘
```

**Features**:
- List all publishers per bus
- Drag to reorder (updates sortKey)
- Click to select source block
- Remove publisher button

### 2. Combine Mode UI
**Priority**: MEDIUM
**Purpose**: Choose how publishers combine

**UI**:
```
┌─ energy ─────────────────┐
│ Combine: [sum ▼]         │
│                          │
│   ○ sum (add values)     │
│   ○ average              │
│   ○ max                  │
│   ○ min                  │
│   ○ last (priority)      │
│   ○ layer (for trees)    │
└──────────────────────────┘
```

**Features**:
- Dropdown for combine mode
- Tooltips explaining each mode
- Live preview of combined value

### 3. Silent Value Editing
**Priority**: MEDIUM
**Purpose**: Set bus value directly for testing

**UI**:
```
┌─ energy ─────────────────┐
│ Value: [0.75    ] ⚡     │  ← Override input
│ ┌────────────────────┐   │
│ │ Override mode: ON  │   │  ← When on, ignores publishers
│ └────────────────────┘   │
└──────────────────────────┘
```

**Features**:
- Direct value input per bus
- Override toggle (ignores publishers)
- Reset to computed value

### 4. Binding UI (Bus Picker + Lens)
**Priority**: HIGH
**Purpose**: Connect block inputs to buses with interpretation

**UI**:
```
┌─ Block: DotsRenderer ────────────────────┐
│ Inputs:                                  │
│                                          │
│ radius ──── [phaseA ▼] ──── [ease... ▼]  │
│             bus picker     lens preset   │
│                                          │
│ ┌─ Lens Stack ─────────────────────────┐ │
│ │ 1. ease: easeInOutSine               │ │
│ │ 2. scale: factor=2, offset=-1        │ │
│ │ [+ Add Step]                         │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

**Features**:
- Bus picker dropdown per input port
- Lens preset dropdown (quick selection)
- Expandable lens stack editor
- Add/remove/reorder lens steps

### 5. Interpretation Stack Editor
**Priority**: MEDIUM
**Purpose**: Build custom lens stacks

**UI**:
```
┌─ Lens Stack Editor ─────────────────────┐
│ ┌─────────────────────────────────────┐ │
│ │ ≡ ease: easeInOutSine         [×]  │ │
│ │   [easing curve selector]          │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ ≡ scale: factor=2, offset=-1  [×]  │ │
│ │   factor: [2.0    ]                │ │
│ │   offset: [-1.0   ]                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [+ Add Lens Step]                       │
│   ├─ ease                               │
│   ├─ slew                               │
│   ├─ quantize                           │
│   ├─ scale                              │
│   ├─ warp                               │
│   ├─ broadcast                          │
│   └─ perElementOffset                   │
└─────────────────────────────────────────┘
```

**Features**:
- Drag to reorder steps
- Inline parameter editing
- Live input/output preview (sparklines)
- Step type selector with descriptions

---

## Implementation Plan

### Task 5.1: Publisher Inspection Panel
**Complexity**: Medium

**Steps**:
1. Create `PublisherList.tsx` component
2. Add to BusChannel expanded state
3. Implement drag-to-reorder with sortKey update
4. Connect to BusStore actions
5. Add tests

### Task 5.2: Combine Mode Selector
**Complexity**: Low

**Steps**:
1. Add dropdown to BusChannel
2. Connect to Bus.combineMode
3. Add tooltips for each mode
4. Test mode changes propagate to compiler

### Task 5.3: Silent Value Override
**Complexity**: Medium

**Steps**:
1. Add override value state to BusStore
2. Create override input UI
3. Modify bus evaluation to check override
4. Add reset button
5. Test override behavior

### Task 5.4: Binding UI in Inspector
**Complexity**: Medium

**Steps**:
1. Extend Inspector.tsx for bus binding
2. Create BusBindingRow component
3. Integrate BusPicker and lens preset
4. Connect to listeners in BusStore
5. Test binding persistence

### Task 5.5: Lens Stack Editor
**Complexity**: High

**Steps**:
1. Create `LensStackEditor.tsx` component
2. Implement drag-to-reorder for steps
3. Create step-specific parameter UIs
4. Add sparkline previews
5. Integrate with binding UI
6. Comprehensive tests

---

## UI/UX Guidelines

### From `08-ui-detail.md`

**Bus Board Principles**:
- Buses are mixer channels, not wires
- Vertical layout (like DAW mixer)
- Live visualization is always visible
- Publishers/listeners are discoverable

**Color Coding**:
| Bus Type | Color |
|----------|-------|
| phase | Purple |
| number | Blue |
| color | Rainbow gradient |
| trigger | Orange |

**Interaction Patterns**:
- Click bus: Show inspector
- Double-click: Edit name
- Drag block output: Create publisher
- Drag to block input: Create listener

---

## Acceptance Criteria

Phase 5 is complete when:

1. [ ] Publisher list with reordering
2. [ ] Combine mode dropdown with tooltips
3. [ ] Silent value override for testing
4. [ ] Bus binding UI in Inspector
5. [ ] Full lens stack editor
6. [ ] Live sparkline previews
7. [ ] All tests pass
8. [ ] Documentation updated

---

## Related Documents

- `08-ui-detail.md`: UI specifications
- `05-lenses.md`: Lens system theory
- `09-ux-philosophy.md`: UX principles
