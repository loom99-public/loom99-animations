# Phase 6: Phase-Centric UX Polish

**Status**: NOT STARTED (0% complete)
**Goal**: Make infinite time feel good.

---

## Summary

Phase 6 polishes the UX around phase and looping. Users should understand infinite animation intuitively, without anxiety about "where they are" in time.

---

## What's Needed

### 1. Phase Visualizations
**Priority**: HIGH
**Purpose**: Make phase visible and understandable

**Ring Visualization**:
```
      ╭────╮
    ╱        ╲
   │    ●     │  ← Current phase position
   │          │
    ╲        ╱
      ╰────╯

   Phase: 0.73
   Cycle: 42
```

**Features**:
- Circular progress indicator
- Current position marker
- Cycle counter
- Wrap animation (smooth 1→0 transition)
- Multiple rings for multiple phase buses

**Strip Visualization** (alternative):
```
├──────────────●────────┤
0                      1

Phase: 0.73 | Cycle: 42
```

### 2. Mode-Specific UI
**Priority**: HIGH
**Purpose**: Different modes need different controls

**Scrub Mode**:
```
┌─────────────────────────────────────────┐
│ SCRUB MODE                              │
│ ┌─────────────────────────────────────┐ │
│ │ ◀ ───────────●─────────────────── ▶ │ │  ← Scrub slider
│ └─────────────────────────────────────┘ │
│ Time: 4.23s | Phase A: 0.73            │
│ [Play] [Step ◀] [Step ▶]               │
└─────────────────────────────────────────┘
```

**Loop Mode**:
```
┌─────────────────────────────────────────┐
│ LOOP MODE                    🔁 ON      │
│ ┌───────────────────────────────────┐   │
│ │ ╭────╮  ╭────╮  ╭────╮           │   │  ← Phase rings
│ │ │ A  │  │ B  │  │ C  │           │   │
│ │ ╰────╯  ╰────╯  ╰────╯           │   │
│ └───────────────────────────────────┘   │
│ [Pause] [Tap Tempo] [Speed: 1.0x]      │
└─────────────────────────────────────────┘
```

**Performance Mode**:
```
┌─────────────────────────────────────────┐
│ PERFORMANCE MODE              🎹        │
│                                         │
│   [fullscreen animation view]           │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ phaseA ●○○○  phaseB ○●○○  energy ███│ │  ← Minimal controls
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 3. Default Bus Scaffolds
**Priority**: MEDIUM
**Purpose**: New patches start with sensible structure

**Scaffold on New Patch**:
```
┌─ New Patch Wizard ─────────────────────┐
│                                        │
│ Choose starting template:              │
│                                        │
│ ○ Empty (just default buses)           │
│ ● Ambient Loop (phaseA + energy)       │
│ ○ Rhythmic (phaseA + pulse + energy)   │
│ ○ Color Flow (phaseA + palette)        │
│                                        │
│ [Create]                               │
└────────────────────────────────────────┘
```

**Default Buses Already Exist**:
- phaseA, phaseB, energy, pulse, palette
- Scaffold adds initial publishers/listeners

### 4. Tutorial Integration
**Priority**: MEDIUM
**Purpose**: Teach phase concepts in context

**Overlay Hints**:
```
┌─────────────────────────────────────────┐
│                           ┌───────────┐ │
│                           │ Tip:      │ │
│                           │ phaseA    │ │
│   [Animation preview]     │ controls  │ │
│                           │ timing.   │ │
│                           │ Try       │ │
│                           │ changing  │ │
│                           │ the       │ │
│                           │ period!   │ │
│                           └───────────┘ │
└─────────────────────────────────────────┘
```

**Interactive Tutorial Steps**:
1. "This is a phase clock. It goes 0→1 and repeats."
2. "Connect it to phaseA bus to share the timing."
3. "Other blocks can listen to phaseA."
4. "Add a lens to change how they interpret it."

### 5. Performance Mode Layout
**Priority**: LOW
**Purpose**: Fullscreen animation with minimal UI

**Layout**:
- Animation fills viewport
- Controls minimized to bottom strip
- Keyboard shortcuts for common actions
- ESC to exit

**Controls Strip**:
```
[⏸ Pause] [🔁 Loop] [Speed: 1.0x ▼] [🔊 Audio] [⛶ Exit]
```

---

## Implementation Plan

### Task 6.1: Phase Ring Visualization
**Complexity**: Medium

**Steps**:
1. Create `PhaseRing.tsx` component
2. Use SVG or Canvas for smooth animation
3. Handle wrap transition (1→0 smoothly)
4. Add cycle counter
5. Support multiple rings

### Task 6.2: Transport Mode Switching
**Complexity**: Medium

**Steps**:
1. Add mode enum to UIStateStore: 'scrub' | 'loop' | 'performance'
2. Create mode-specific control panels
3. Keyboard shortcuts for switching
4. Persist mode preference

### Task 6.3: Scrub Mode Controls
**Complexity**: Low

**Steps**:
1. Add scrub slider to Transport
2. Connect to Player.seek()
3. Show current time and phase values
4. Step forward/backward buttons

### Task 6.4: Default Bus Scaffolds
**Complexity**: Low

**Steps**:
1. Define scaffold templates
2. Create template selector UI
3. Apply template on new patch
4. Document available scaffolds

### Task 6.5: Tutorial Overlay System
**Complexity**: High

**Steps**:
1. Create `TutorialOverlay.tsx` component
2. Define tutorial step data structure
3. Implement step navigation
4. Create phase tutorial content
5. Persist tutorial completion state

### Task 6.6: Performance Mode
**Complexity**: Medium

**Steps**:
1. Create fullscreen layout
2. Minimize controls to strip
3. Add keyboard shortcuts
4. ESC to exit
5. Remember previous layout

---

## UI/UX Guidelines

### From `09-ux-philosophy.md`

**Infinite Time Should Feel**:
- Continuous, not choppy
- Explorable, not overwhelming
- Playful, not technical

**Phase Visualization Principles**:
- Phase is a position, not a progress bar
- Wrapping should feel natural (like a clock)
- Multiple phases should be distinguishable

**Color Palette for Phases**:
| Phase Bus | Color |
|-----------|-------|
| phaseA | Cyan (#00ccff) |
| phaseB | Magenta (#ff00cc) |
| User phases | User-defined |

### Accessibility

- Phase rings should have aria labels
- Color alone shouldn't convey meaning
- Screen reader announcements for mode changes
- Keyboard navigation for all controls

---

## Acceptance Criteria

Phase 6 is complete when:

1. [ ] Phase ring visualization for all phase buses
2. [ ] Scrub mode with time slider
3. [ ] Loop mode with visual feedback
4. [ ] Performance mode (fullscreen)
5. [ ] Mode switching (keyboard + UI)
6. [ ] At least one tutorial overlay
7. [ ] Default bus scaffolds
8. [ ] Tests for new components
9. [ ] Documentation updated

---

## Related Documents

- `09-ux-philosophy.md`: UX principles
- `08-ui-detail.md`: UI specifications
- `01-time-and-phase.md`: Phase theory
