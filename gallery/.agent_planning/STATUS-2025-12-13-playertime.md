# STATUS: Player Time UI Refactoring

**Date**: 2025-12-13
**Focus**: Player Controls Consolidation & Timeline Cue Point Investigation

## Executive Summary

This document analyzes the current editor UI architecture to understand the state of player controls and timeline functionality, specifically:
1. How controls are distributed between Transport and PreviewPanel
2. Why cue points are not showing on the preview window timeline
3. Current architecture blockers for requested UI changes

## Current Architecture Overview

### UI Component Hierarchy

```
Editor.tsx (root)
├── SettingsToolbar (top bar)
│   ├── Lane layout controls
│   ├── Connection settings
│   ├── Palette filtering
│   └── Demo loading
├── editor-main (flex container)
│   ├── BlockLibrary (left sidebar)
│   ├── PatchBay (center canvas)
│   ├── editor-right-panel
│   │   ├── PreviewPanel (with player controls)
│   │   └── ControlSurfacePanel
│   └── Inspector (right sidebar)
├── LogWindow
└── Transport (bottom bar - 60px fixed height)
```

### Current Control Distribution

#### Transport.tsx (Bottom Bar)
**Location**: `/Users/bmf/code/loom99-animations/gallery/src/editor/Transport.tsx`

**Current Controls**:
- Playback: Play/Pause, Stop (disabled)
- Scrubber: Timeline slider (0-6s range)
- Settings: **Speed** (0.1-4, step 0.1), **Seed** (number input)
- Actions: **Save**, **Load**, **Export** (all disabled, marked "Phase 6")
- Status: StatusBadge

**CSS**: 60px height, flexbox layout with gaps, bottom-fixed position

#### PreviewPanel.tsx (Right Panel)
**Location**: `/Users/bmf/code/loom99-animations/gallery/src/editor/PreviewPanel.tsx`

**Current Controls**:
- Preview header (title + live status)
- Canvas (SVG, variable size based on viewport)
- **Preview controls section**:
  - Play/Pause button
  - Reset button (⏮)
  - Loop mode toggle (loop/pingpong/none)
  - Time display (current time)
  - **Scrubber with cue point markers** (lines 248-271)
  - Time display (max time)
  - Timeline indicator (finite/infinite)

**CSS**:
- Controls: 8px padding, flexbox
- Scrubber container: relative positioning, 20px height
- Cue markers: absolute positioning, z-index 0, pointer-events none

### Player Architecture

#### Player Class
**Location**: `/Users/bmf/code/loom99-animations/gallery/src/editor/runtime/player.ts`

**Key Features**:
- Manages playback state, time, speed, seed, loop mode
- Callback-based architecture: `onStateChange`, `onTimeChange`, `onLoopModeChange`, `onTimelineChange`, `onCuePointsChange`
- Timeline hint extraction from programs (lines 253-281)
- Cue point extraction from timeline hints (lines 267-271)
- Auto-apply timeline hints (configurable via `autoApplyTimeline`)

**Timeline Hint Flow**:
1. Program instantiation (`instantiateProgram()`)
2. Extract timeline hints (`extractTimelineHints()`)
3. Get timeline from program: `this.program.timeline?.()`
4. Extract cue points from timeline if finite + has cuePoints
5. Notify listeners via callbacks
6. Auto-apply if enabled

#### PreviewPanel Player Integration
**Location**: `/Users/bmf/code/loom99-animations/gallery/src/editor/PreviewPanel.tsx`

**State Management**:
- `const [cuePoints, setCuePoints] = useState<readonly CuePoint[]>([]);` (line 60)
- `const [timeline, setTimeline] = useState<TimelineHint | null>(null);` (line 61)
- Player created with callbacks (lines 75-96):
  - `onCuePointsChange: setCuePoints`
  - `onTimelineChange: (hint) => { setTimeline(hint); ... }`

**Cue Point Rendering** (lines 259-270):
```typescript
{cuePoints.map((cue, i) => {
  const percent = maxTime > 0 ? (cue.tMs / maxTime) * 100 : 0;
  return (
    <div
      key={`cue-${i}`}
      className={`cue-marker cue-${cue.kind ?? 'marker'}`}
      style={{ left: `${percent}%` }}
      title={`${cue.label} (${formatTime(cue.tMs)})`}
    />
  );
})}
```

## Analysis of Requested Changes

### 1. Move Save/Load/Export to Top Bar

**Current State**:
- Buttons in Transport.tsx (bottom bar, disabled)
- SettingsToolbar.tsx has space in toolbar-right section

**Implementation Path**: STRAIGHTFORWARD
- Move button elements from Transport to SettingsToolbar
- Add to `.toolbar-right` section after Clear All button
- Maintain disabled state until Phase 6 implementation

**Blockers**: NONE

### 2. Double Preview Control Height + Move Scrubber Above

**Current State**:
- `.preview-controls`: 8px padding, single row flexbox
- Controls are in order: buttons, time, scrubber, time, indicator
- Current estimated height: ~48px

**Implementation Path**: MODERATE
- Change `.preview-controls` from single row to 2-row layout
- Top row: scrubber + time displays
- Bottom row: buttons + loop mode + timeline indicator
- Update CSS to ~80-96px total height
- Adjust flexbox layout for stacking

**Blockers**: NONE

### 3. Add Speed/Seed to Preview Window Controls

**Current State**:
- Speed/Seed in Transport.tsx as number inputs
- Preview controls currently don't have settings inputs

**Implementation Path**: MODERATE
- Move Speed/Seed input elements from Transport to PreviewPanel
- Add to bottom row of controls (after refactor from #2)
- Wire up to same store.setSpeed/setSeed actions
- Style to match preview control aesthetic

**Blockers**:
- Minor: Need to ensure store access in PreviewPanel (currently only has compilerService)
- Solution: Pass store as prop or extract speed/seed as controlled props

### 4. Remove Bottom Transport Completely

**Current State**:
- Transport component renders at bottom of editor
- Contains playback, scrubber, settings, actions, status
- Takes up 60px vertical space

**Implementation Path**: MODERATE
- After migrating controls per #1, #3
- Keep only StatusBadge (move to SettingsToolbar or PreviewPanel header)
- Remove Transport from Editor.tsx
- Remove Transport.css
- Update layout CSS to remove bottom bar space

**Blockers**:
- Need to decide final home for StatusBadge
- Transport scrubber controls store.currentTime - need to remove or migrate

**CRITICAL ISSUE**: Transport has its OWN scrubber/time management separate from PreviewPanel Player. These are currently independent:
- Transport reads/writes `store.uiState.currentTime`
- PreviewPanel Player has internal `tMs` state
- They sync via `isPlaying` prop but not via time scrubbing

### 5. Cue Points Not Showing - ROOT CAUSE ANALYSIS

**Investigation Findings**:

#### Timeline Hint Creation
Programs MUST export a `timeline()` function to provide cue points:

```typescript
interface Program<T> {
  signal: (tMs: number, rt: RuntimeCtx) => T;
  event: (ev: KernelEvent) => KernelEvent[];
  timeline?: () => TimelineHint;  // OPTIONAL
}
```

**Proof Programs with Timeline**:
- `pulsingLineProgram` - HAS timeline (infinite, 3.141s window)
- `lineDrawingProgram` - HAS timeline (finite, 4.5s, 3 cue points)
- `bouncingCircleProgram` - NO timeline
- `particlesProgram` - NO timeline
- `composedEffectsProgram` - NO timeline

**Compiler-Generated Programs**:
- `DemoProgramBlock` - **NO TIMELINE FUNCTION** (lines 138-140 only have signal/event)
- `OutputProgramBlock` - Pass-through, preserves upstream timeline

**ROOT CAUSE**:
1. Most programs created by the compiler DO NOT include a `timeline()` function
2. `DemoProgramBlock` is the primary test program and lacks timeline metadata
3. Without `timeline()`, Player's `extractTimelineHints()` sets `cuePoints = []`

**Why Cue Points Work in Proof Programs**:
- Proof programs in `proofPrograms.ts` manually define timeline functions
- `lineDrawingProgram` explicitly returns cue points
- These are only used in standalone testing, not in the editor's compiler workflow

**Current Editor Program Source**:
PreviewPanel loads programs from:
1. `compilerService.getProgram()` - compiled from patch graph
2. Fallback to `PROOF_PROGRAMS.lineDrawing` if no compiled program

When using compiler service, programs come from block compilers which don't generate timeline metadata.

### 6. PlayerTime Functionality Documentation

**Current Separation of Concerns**:

```
EditorStore.uiState.currentTime   (Transport scrubber)
    ↕ (synced via isPlaying only)
Player.tMs                         (PreviewPanel internal)
```

**Player Time Management**:
- Player maintains authoritative `tMs` via RAF loop
- Supports scrubbing independently via `scrubTo(tMs)`
- Callbacks notify UI of time changes
- Loop modes: none, loop, pingpong

**Transport Time Management**:
- Reads/writes `store.uiState.currentTime`
- Separate scrubber control
- Play/pause toggles `store.uiState.isPlaying`
- PreviewPanel watches `isPlaying` to sync Player state

**Conflict**: Two separate time sources without bidirectional sync

## Blockers & Risks

### High Priority
1. **Time State Duplication**: Transport and Player have independent time management
   - Risk: User confusion, desynced scrubbers
   - Solution: Make Player the single source of truth, remove Transport scrubber

2. **Missing Timeline Metadata**: Compiler blocks don't generate timeline hints
   - Risk: Cue points will never show for compiled programs
   - Solution: Blocks must be enhanced to produce timeline metadata

### Medium Priority
3. **Store Dependency in PreviewPanel**: Currently only has compilerService
   - Risk: Can't access speed/seed settings directly
   - Solution: Pass store or extract as controlled props

4. **StatusBadge Relocation**: Currently in Transport
   - Risk: Minor UX decision needed
   - Solution: Move to SettingsToolbar or PreviewPanel header

### Low Priority
5. **CSS Layout Adjustments**: Removing 60px bottom bar
   - Risk: Minor layout reflow
   - Solution: Update Editor.css flex container

## Recommendations

### Phase 1: Control Consolidation
1. Move Save/Load/Export to SettingsToolbar
2. Move Speed/Seed to PreviewPanel (add store prop)
3. Remove Transport component entirely
4. Move StatusBadge to SettingsToolbar right section
5. Make Player the single source of truth for time

### Phase 2: Preview Panel Layout
1. Refactor preview controls to 2-row layout
2. Top row: scrubber with cue markers + time displays
3. Bottom row: play/pause/reset, speed/seed inputs, loop mode

### Phase 3: Timeline Metadata Infrastructure
1. Enhance compiler block contracts to support timeline hints
2. Add timeline composition rules (how do stacked blocks combine timelines?)
3. Update DemoProgramBlock to generate timeline metadata
4. Add timeline extraction to major animation compiler blocks

### Phase 4: Documentation
1. Document Player time management architecture
2. Document timeline hint system
3. Document cue point rendering pipeline

## Files Requiring Changes

### Immediate Changes (Phase 1-2)
- `/Users/bmf/code/loom99-animations/gallery/src/editor/Editor.tsx` - Remove Transport, update layout
- `/Users/bmf/code/loom99-animations/gallery/src/editor/Editor.css` - Remove bottom bar space
- `/Users/bmf/code/loom99-animations/gallery/src/editor/SettingsToolbar.tsx` - Add Save/Load/Export + StatusBadge
- `/Users/bmf/code/loom99-animations/gallery/src/editor/SettingsToolbar.css` - Style new buttons
- `/Users/bmf/code/loom99-animations/gallery/src/editor/PreviewPanel.tsx` - Add Speed/Seed, refactor controls layout
- `/Users/bmf/code/loom99-animations/gallery/src/editor/PreviewPanel.css` - 2-row layout, increased height
- `/Users/bmf/code/loom99-animations/gallery/src/editor/store.ts` - Remove Transport time state (cleanup)
- **DELETE**: `/Users/bmf/code/loom99-animations/gallery/src/editor/Transport.tsx`
- **DELETE**: `/Users/bmf/code/loom99-animations/gallery/src/editor/Transport.css`

### Future Changes (Phase 3)
- `/Users/bmf/code/loom99-animations/gallery/src/editor/compiler/types.ts` - Timeline hint composition types
- `/Users/bmf/code/loom99-animations/gallery/src/editor/compiler/blocks/compose/DemoProgram.ts` - Add timeline function
- Multiple compiler blocks - Add timeline metadata generation

## Next Steps

1. Confirm approach with user
2. Create implementation plan with specific code changes
3. Execute Phase 1-2 (UI consolidation)
4. Test timeline infrastructure separately
5. Document Player architecture in top-level MD file
