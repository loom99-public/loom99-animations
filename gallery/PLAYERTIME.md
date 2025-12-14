# PlayerTime: Animation Playback System

**Last Updated**: 2025-12-13

## Overview

PlayerTime is the runtime playback system for V4 animations in the editor. It manages time, playback state, looping, and timeline metadata for smooth, scrubbable animation preview.

## Core Principles

### 1. Time is an Input, Not State
The Player doesn't "advance" time through integration. Instead, time is an input to pure signal functions:
```typescript
const tree = program.signal(tMs, runtimeCtx);
```
This makes scrubbing, rewinding, and hot-swapping trivial.

### 2. Determinism
All animations are deterministic given the same time input. Random values are seeded at compile-time, never at runtime. This enables:
- Frame-perfect scrubbing
- Reproducible renders
- Hot-swapping programs without losing temporal position

### 3. Hot Swap
Programs can be swapped mid-playback without resetting time. The new program simply renders at the current time position.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      PreviewPanel                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │                  Canvas (SVG)                     │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Controls (2 rows)                    │  │
│  │  Row 1: Time | Scrubber w/ Cue Points | Time | ∞  │  │
│  │  Row 2: Play/Pause | Reset | Loop | Speed | Seed  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                       Player                             │
│  - tMs: number (current time in milliseconds)           │
│  - playState: 'playing' | 'paused'                      │
│  - speed: number (0.1 to 4.0)                           │
│  - loopMode: 'none' | 'loop' | 'pingpong'               │
│  - maxTime: number (from timeline or default)           │
│  - program: Program<RenderTree>                         │
│  - timeline: TimelineHint | null                        │
│  - cuePoints: CuePoint[]                                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Program<RenderTree>                    │
│  signal(tMs, ctx) => RenderTree                         │
│  event(ev) => KernelEvent[]                             │
│  timeline?() => TimelineHint                            │
└─────────────────────────────────────────────────────────┘
```

## Key Types

### TimelineHint

Programs can optionally provide temporal metadata:

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
```

### CuePoint

Marks significant moments in the animation:

```typescript
interface CuePoint {
  tMs: number;           // Time position in milliseconds
  label: string;         // Human-readable label
  kind?: 'phase' | 'beat' | 'marker';  // For styling
}
```

### Program Interface

```typescript
interface Program<T> {
  signal: (tMs: number, rt: RuntimeCtx) => T;
  event: (ev: KernelEvent) => KernelEvent[];
  timeline?: () => TimelineHint;  // Optional
}
```

## Player API

### Playback Control

```typescript
player.play()           // Start playback
player.pause()          // Pause playback
player.toggle()         // Toggle play/pause
player.reset()          // Jump to t=0
player.scrubTo(tMs)     // Jump to specific time
```

### Configuration

```typescript
player.setSpeed(1.5)            // Playback speed multiplier
player.setLoopMode('pingpong')  // none | loop | pingpong
player.setMaxTime(5000)         // Set loop boundary
player.setSeed(42)              // Seed (triggers recompile)
```

### Program Management

```typescript
player.setFactory(factory)      // Set program factory
player.setScene(scene)          // Set target geometry
```

### Query Methods

```typescript
player.getTime()                // Current tMs
player.getState()               // 'playing' | 'paused'
player.getTimeline()            // TimelineHint | null
player.getCuePoints()           // CuePoint[]
player.hasFiniteDuration()      // boolean
player.getProgramDuration()     // number | null
```

### Callbacks

```typescript
const player = createPlayer(onFrame, {
  onStateChange: (state) => { /* 'playing' | 'paused' */ },
  onTimeChange: (tMs) => { /* current time */ },
  onLoopModeChange: (mode) => { /* none | loop | pingpong */ },
  onTimelineChange: (hint) => { /* TimelineHint | null */ },
  onCuePointsChange: (cues) => { /* CuePoint[] */ },
  autoApplyTimeline: true,  // Auto-set maxTime and loop from hints
});
```

## Loop Modes

### `loop`
Wraps from maxTime back to 0:
```
0 ──────────────► maxTime ─┐
▲                          │
└──────────────────────────┘
```

### `pingpong`
Reverses direction at boundaries:
```
0 ──────────────► maxTime
  ◄──────────────
```

### `none`
Stops at maxTime:
```
0 ──────────────► maxTime ■ (pause)
```

## RAF Loop Implementation

```typescript
private tick = (): void => {
  if (this.playState !== 'playing') return;

  const now = performance.now();
  const dt = (now - this.lastFrameMs) * this.speed * this.playDirection;
  this.lastFrameMs = now;
  this.tMs += dt;

  // Handle loop modes...

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

## Integration with PreviewPanel

The PreviewPanel creates and owns the Player instance:

```typescript
const player = createPlayer(
  (tree, _tMs) => { renderer.render(tree); },
  {
    width, height,
    onStateChange: setPlayState,
    onTimeChange: setCurrentTime,
    onLoopModeChange: setLoopMode,
    onTimelineChange: (hint) => {
      setTimeline(hint);
      if (hint?.kind === 'finite') setMaxTime(hint.durationMs);
    },
    onCuePointsChange: setCuePoints,
    autoApplyTimeline: true,
  }
);
```

## Known Limitations

### 1. Cue Points Require `timeline()` Function

**Issue**: Cue points only appear when a program exports a `timeline()` function. Currently, only the proof programs (hardcoded test programs) have this. Compiler-generated programs do NOT generate timeline metadata.

**Impact**: In normal editor use, cue points will never appear because the compiler blocks don't produce timeline hints.

**Future Work**: Enhance compiler blocks (especially DemoProgramBlock) to generate appropriate timeline metadata based on phase machines and animation structure.

### 2. No Timeline Composition Rules

When multiple blocks/programs are combined, there are no defined rules for how their timelines should merge. This needs to be designed.

### 3. Program Polling Instead of Reactions

PreviewPanel polls for program changes every 500ms instead of using MobX reactions. This is inefficient and can cause delayed updates.

```typescript
// Current: polling
const interval = setInterval(() => {
  const compiled = compilerService.getProgram();
  // ...
}, 500);

// Should be: MobX reaction
```

### 4. Type Inconsistency

There are two `DrawNode` type definitions (compiler/types vs runtime/renderTree) that don't quite match, causing TypeScript errors in PreviewPanel.

## Future Work

### Timeline Infrastructure
- [ ] Add timeline generation to DemoProgramBlock
- [ ] Define timeline composition rules for stacked blocks
- [ ] Add timeline editor UI

### Player Enhancements
- [ ] Replace polling with MobX reactions
- [ ] Add frame stepping (forward/backward one frame)
- [ ] Add keyboard shortcuts (Space, Arrow keys)
- [ ] Add time display format options (ms vs s vs frames)

### Performance
- [ ] Consider Web Workers for rendering
- [ ] Add performance metrics overlay
- [ ] Investigate frame dropping on slow machines

## File Locations

| File | Purpose |
|------|---------|
| `src/editor/runtime/player.ts` | Player class and factory |
| `src/editor/runtime/index.ts` | Runtime exports |
| `src/editor/PreviewPanel.tsx` | Player integration UI |
| `src/editor/PreviewPanel.css` | Control styling |
| `src/editor/compiler/types.ts` | TimelineHint, CuePoint types |
| `src/anim-v4/core/types.ts` | V4 kernel timeline types |
| `src/editor/runtime/proofPrograms.ts` | Example programs with timeline |

## Related Documentation

- `.agent_planning/STATUS-2025-12-13-playertime.md` - Investigation findings
- `.agent_planning/PLAN-2025-12-13-playertime.md` - Implementation plan
- `CLAUDE.md` - General architecture overview
