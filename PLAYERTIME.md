# PlayerTime: Animation Playback Architecture

**Last Updated**: 2025-12-13

## Overview

PlayerTime is the animation playback engine that drives real-time rendering of compiled animation programs. It manages time, playback state, and the render loop while maintaining deterministic, scrubbable playback.

## Core Principles

### 1. Time as Input, Not State
Animations are pure functions of time: `Signal<T> = (t: Time, ctx: Context) => T`

The Player doesn't "integrate" time - it samples programs at specific time points.

### 2. Deterministic Playback
Given the same time `t`, a program MUST produce identical output. This enables:
- Scrubbing (jump to any time instant)
- Frame-perfect replay
- Visual debugging via time inspection

### 3. Hot Swap Without Reset
Programs can be replaced at runtime without resetting the timeline. The Player:
- Preserves current `tMs` during program swap
- Re-renders at the same time with the new program
- Maintains playback state (playing/paused)

## Architecture

### Player Class
**Location**: `gallery/src/editor/runtime/player.ts`

```typescript
export class Player {
  // Program lifecycle
  private programFactory: ProgramFactory<RenderTree> | null;
  private program: Program<RenderTree> | null;

  // Time state
  private tMs: number = 0;
  private playState: PlayState = 'paused';
  private speed: number = 1.0;
  private maxTime: number = 10000;

  // Loop behavior
  private loopMode: LoopMode = 'loop';
  private playDirection: number = 1; // 1 forward, -1 backward

  // Timeline metadata
  private currentTimeline: TimelineHint | null;
  private cuePoints: readonly CuePoint[];
}
```

### Key Methods

#### Program Management
```typescript
setFactory(factory: ProgramFactory<RenderTree>): void
setSeed(seed: Seed): void
setScene(scene: Scene): void
```
All trigger `instantiateProgram()` which:
1. Creates new program instance
2. Extracts timeline hints
3. Preserves current time
4. Renders once at current position

#### Playback Control
```typescript
play(): void      // Start RAF loop
pause(): void     // Stop RAF loop
toggle(): void    // Toggle play/pause
scrubTo(tMs: number): void  // Jump to time
reset(): void     // Jump to t=0
```

#### Time Management
```typescript
setSpeed(speed: number): void       // 0.1 to 4.0x
setLoopMode(mode: LoopMode): void   // 'loop' | 'pingpong' | 'none'
setMaxTime(maxTime: number): void   // Loop duration in ms
```

### Callback Architecture

Player uses callbacks to notify the UI of state changes:

```typescript
interface PlayerOptions {
  onFrame: (tree: RenderTree, tMs: number) => void;
  onStateChange?: (state: PlayState) => void;
  onTimeChange?: (tMs: number) => void;
  onLoopModeChange?: (mode: LoopMode) => void;
  onTimelineChange?: (hint: TimelineHint | null) => void;
  onCuePointsChange?: (cuePoints: readonly CuePoint[]) => void;
  autoApplyTimeline?: boolean;
}
```

**Why Callbacks?**
- Decouples Player from UI framework (works with React, Vue, vanilla JS)
- Allows multiple listeners (e.g., scrubber, time display, inspector)
- Enables selective updates (only re-render changed parts)

## Timeline Hints System

### TimelineHint Interface
**Location**: `gallery/src/editor/compiler/types.ts`

```typescript
type TimelineHint =
  | {
      kind: 'finite';
      durationMs: number;
      recommendedLoop?: 'loop' | 'pingpong' | 'none';
      cuePoints?: readonly CuePoint[];
    }
  | {
      kind: 'infinite';
      recommendedLoop?: 'loop' | 'none';
      windowMs?: number; // Suggested preview window
    };

interface CuePoint {
  tMs: number;
  label: string;
  kind?: 'phase' | 'beat' | 'marker';
}
```

### Timeline Hint Flow

```
Program.timeline()
    ↓
Player.extractTimelineHints()
    ↓
Player.currentTimeline, Player.cuePoints
    ↓
onTimelineChange(hint), onCuePointsChange(cuePoints)
    ↓
UI updates (scrubber range, cue markers)
```

### Auto-Apply Timeline
When `autoApplyTimeline: true` (default):
- Finite programs → set `maxTime = durationMs`
- Infinite programs → set `maxTime = windowMs ?? 10000`
- Apply `recommendedLoop` if specified

**Example**: Line drawing animation
```typescript
timeline(): TimelineHint {
  return {
    kind: 'finite',
    durationMs: 4500,  // 3s entrance + 1.5s hold
    recommendedLoop: 'loop',
    cuePoints: [
      { tMs: 0, label: 'Entrance Start', kind: 'phase' },
      { tMs: 3000, label: 'Hold', kind: 'phase' },
      { tMs: 4500, label: 'End', kind: 'phase' },
    ],
  };
}
```

## Loop Modes

### Loop (default)
Wraps time at boundaries: `t >= maxTime → t = 0`

**Use case**: Continuous animations, cycles

### Pingpong
Reverses direction at boundaries:
- Forward until `t >= maxTime`, then `playDirection = -1`
- Backward until `t <= 0`, then `playDirection = 1`

**Use case**: Back-and-forth motion, wave patterns

### None
Clamps at max and pauses: `t >= maxTime → pause()`

**Use case**: One-shot animations, intro sequences

## RAF Loop Implementation

```typescript
private tick = (): void => {
  if (this.playState !== 'playing') return;

  const now = performance.now();
  const dt = (now - this.lastFrameMs) * this.speed * this.playDirection;
  this.lastFrameMs = now;
  this.tMs += dt;

  // Apply loop mode
  if (this.loopMode === 'loop') {
    if (this.tMs >= this.maxTime) this.tMs = 0;
    else if (this.tMs < 0) this.tMs = this.maxTime;
  } else if (this.loopMode === 'pingpong') {
    // ... handle direction reversal
  } else {
    // ... handle clamp and pause
  }

  this.onTimeChange?.(this.tMs);
  this.renderOnce();
  this.rafId = requestAnimationFrame(this.tick);
};

private renderOnce(): void {
  if (!this.program) return;
  const tree = this.program.signal(this.tMs, this.runtimeCtx);
  this.onFrame(tree, this.tMs);
}
```

**Key Points**:
- Delta time multiplied by speed and direction
- Loop logic applied before rendering
- RAF scheduled at end of tick (tail call)

## Integration with PreviewPanel

**Location**: `gallery/src/editor/PreviewPanel.tsx`

### Initialization (once)
```typescript
useEffect(() => {
  const player = createPlayer(
    (tree: RenderTree, tMs: number) => {
      renderer.render(tree);
    },
    {
      onStateChange: setPlayState,
      onTimeChange: setCurrentTime,
      onLoopModeChange: setLoopMode,
      onTimelineChange: (hint) => {
        setTimeline(hint);
        if (hint?.kind === 'finite') {
          setMaxTime(hint.durationMs);
        }
      },
      onCuePointsChange: setCuePoints,
      autoApplyTimeline: true,
    }
  );
  player.play();
}, []); // Empty deps - run once
```

### Program Hot Swap (polling)
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    const compiled = compilerService.getProgram();
    if (compiled && compiled !== lastGoodProgramRef.current) {
      player.setFactory(() => compiled);
      lastGoodProgramRef.current = compiled;
    }
  }, 500);
  return () => clearInterval(interval);
}, [compilerService]);
```

**Future**: Replace polling with MobX reaction for instant updates.

### Cue Point Rendering
```typescript
<div className="preview-scrubber-container">
  <input type="range" className="preview-scrubber" ... />
  {cuePoints.map((cue, i) => {
    const percent = (cue.tMs / maxTime) * 100;
    return (
      <div
        key={`cue-${i}`}
        className={`cue-marker cue-${cue.kind ?? 'marker'}`}
        style={{ left: `${percent}%` }}
        title={`${cue.label} (${formatTime(cue.tMs)})`}
      />
    );
  })}
</div>
```

**CSS** (`PreviewPanel.css`):
```css
.cue-marker {
  position: absolute;
  top: 50%;
  transform: translateX(-50%) translateY(-50%);
  width: 3px;
  border-radius: 1px;
  pointer-events: none;
  z-index: 0;
  opacity: 0.7;
}

.cue-marker.cue-phase { background: #ffd93d; height: 16px; }
.cue-marker.cue-beat { background: #ff6b6b; height: 12px; }
.cue-marker.cue-marker { background: #4ecdc4; height: 10px; }
```

## Current Limitations & Future Work

### Known Issues

#### 1. Missing Timeline Metadata in Compiler
**Problem**: Blocks don't generate timeline hints when compiling patches.

**Impact**: Cue points only work with hardcoded proof programs, not user-created patches.

**Example**: `DemoProgramBlock` returns:
```typescript
return {
  signal: (tMs) => { /* ... */ },
  event: () => [],
  // timeline() missing!
};
```

**Solution**: Enhance block compilers to compose timeline metadata:
```typescript
// PhaseMachine could export timeline based on phase durations
// Compositor blocks could merge upstream timelines
// Canvas block could set viewport-based window
```

#### 2. Time State Duplication
**Problem**: `Transport.tsx` has independent time management via `store.uiState.currentTime`.

**Impact**: Two scrubbers, potential desync, user confusion.

**Solution**: Remove Transport component, make Player the single source of truth.

#### 3. Polling for Program Updates
**Problem**: PreviewPanel polls compiler service every 500ms.

**Impact**: Wasted CPU, 500ms lag on changes.

**Solution**: Use MobX reaction to detect program changes instantly.

### Future Enhancements

#### Timeline Composition
When multiple blocks contribute to animation timing:
```typescript
interface TimelineComposer {
  merge(timelines: TimelineHint[]): TimelineHint;
}
```

**Rules**:
- Finite + Finite → Finite (max duration)
- Finite + Infinite → Infinite
- Cue points concatenated and sorted
- Loop mode: take most restrictive

#### Performance Metrics
Add timing instrumentation:
```typescript
interface PerformanceMetrics {
  frameTime: number;     // Last frame render time
  fps: number;           // Current FPS
  programSwaps: number;  // Hot swap count
  scrubEvents: number;   // User scrub interactions
}
```

#### Timeline Editing
Allow user to add custom cue points:
```typescript
interface UserCuePoint extends CuePoint {
  id: string;
  userCreated: true;
}
```

## Related Documentation

- **Kernel Primitives**: `ui_example_docs/v4_kernel.md`
- **Signal Architecture**: `ui_example_docs/high-level.md`
- **Editor Architecture**: `ui_example_docs/foundational_slice/`
- **Compiler Types**: `gallery/src/editor/compiler/types.ts`

## FAQ

### Why doesn't the Player use `Date.now()`?
`performance.now()` provides high-resolution timestamps (~microsecond precision) and is monotonic (never jumps backward).

### Can I change speed during playback?
Yes! `setSpeed()` takes effect on the next frame. The RAF loop multiplies `dt` by `speed`.

### What happens if a program throws during render?
The Player doesn't catch exceptions. The error bubbles up, RAF loop continues. Future: add error boundary and fallback rendering.

### How do I add cue points to my animation?
Return a `timeline()` function from your Program that includes a `cuePoints` array.

### Why are cue points `readonly`?
Timeline hints are immutable metadata derived from program structure. User edits would create divergence from program semantics.

### Can I have multiple Players?
Yes! Each Player is independent. Common use case: side-by-side comparison of programs.

### How do I sync multiple Players?
Share a single `tMs` source and call `scrubTo()` on all players when time changes.
