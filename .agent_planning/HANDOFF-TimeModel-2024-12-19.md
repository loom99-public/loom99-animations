# Handoff: TimeModel Implementation

**Created**: 2024-12-19 03:45
**For**: dev-loop:iterative-implementer
**Status**: ready-to-start

---

## Objective

Implement the first two increments of the TimeModel architecture: (1) define TimeModel types and update compiler to output `{ program, timeModel }`, and (2) update player to consume TimeModel and stop wrapping time internally.

## Current State

### What's Been Done
- Authoritative spec written: `feature_planning_docs/PlayerTimeDesign.md`
- Planning documents created in `.agent_planning/time-model/`
- User approved the DoD for increments 1 & 2
- Existing `TimelineHint` type exists (to be replaced)
- Player already has `loopMode` and `maxTime` (to be refactored)

### What's In Progress
- Nothing started yet

### What Remains
- Increment 1: Define TimeModel types, update compiler output
- Increment 2: Player consumes TimeModel, remove time wrapping

## Context & Background

### Why We're Doing This
Currently there are **two independent time systems** that conflict:
1. **Player time** (`player.ts`): Linear `t` with `maxTime`, wraps via `time % maxTime`
2. **Patch time** (PhaseClock signal): Internally loops via `t % period`

This causes mid-cycle resets, arbitrary truncation, and UI lies (finite timeline for infinite patches). The spec mandates: **patch defines time topology, player does not**.

### Key Decisions Made
| Decision | Rationale | Date |
|----------|-----------|------|
| Replace TimelineHint with TimeModel | TimeModel is mandatory/authoritative, not optional hint | 2024-12-19 |
| Player time becomes unbounded | Wrapping/looping happens in signals, not player | 2024-12-19 |
| Three TimeModel variants | finite/cyclic/infinite cover all use cases | 2024-12-19 |

### Important Constraints
- Must maintain backward compatibility with existing patches during transition
- Tests must pass after each increment
- No UI changes in these increments (future work)
- PhaseClock already does internal wrapping - this is correct and should remain

## Acceptance Criteria

### Increment 1: TimeModel Types & Compiler Output

- [ ] `TimeModel` type exists in `compiler/types.ts` with three variants:
  - `FiniteTimeModel { kind: 'finite', durationMs: number }`
  - `CyclicTimeModel { kind: 'cyclic', periodMs: number }`
  - `InfiniteTimeModel { kind: 'infinite', windowMs: number }`
- [ ] `CompiledProgram` type exists: `{ program: Program<RenderTree>, timeModel: TimeModel }`
- [ ] Main compilation function returns `CompiledProgram` instead of raw `Program`
- [ ] Basic inference logic implemented:
  - PhaseClock with mode='loop' → `CyclicTimeModel`
  - PhaseMachine → `FiniteTimeModel` (computed duration)
  - Default → `InfiniteTimeModel { windowMs: 10000 }`
- [ ] All compiler call sites updated to handle new return type
- [ ] `pnpm test` passes
- [ ] `pnpm build` succeeds

### Increment 2: Player Consumes TimeModel

- [ ] Player has `applyTimeModel(timeModel: TimeModel)` method
- [ ] Player stores `timeModel` as instance property
- [ ] Player `tick()` no longer wraps time via `time % maxTime`
- [ ] Player time advances unbounded: `time += dt * speed`
- [ ] PreviewPanel calls `player.applyTimeModel()` after compilation
- [ ] Cyclic animations loop correctly (signal layer handles wrap)
- [ ] `pnpm test` passes
- [ ] `pnpm build` succeeds

## Scope

### Files to Modify

**Increment 1:**
- `gallery/src/editor/compiler/types.ts` - Add TimeModel types, deprecate TimelineHint
- `gallery/src/editor/compiler/compile.ts` - Return CompiledProgram, add inference
- `gallery/src/editor/compiler/compileBusAware.ts` - May need updates for return type
- `gallery/src/editor/PreviewPanel.tsx` - Destructure new return type
- `gallery/src/editor/runtime/player.ts` - Import TimeModel type

**Increment 2:**
- `gallery/src/editor/runtime/player.ts` - Add applyTimeModel(), remove time wrapping
- `gallery/src/editor/PreviewPanel.tsx` - Call player.applyTimeModel()

### Related Components
- `gallery/src/editor/compiler/blocks/domain/PhaseClock.ts` - Reference for cyclic detection
- `gallery/src/editor/compiler/blocks/legacy/time/PhaseMachine.ts` - Reference for finite detection

### Out of Scope
- UI changes (scrubber, phase rings) - future increment
- Multiple cycle detection - future increment
- Hot-swap during playback - future increment
- Phase offset injection for scrubbing - future increment

## Implementation Approach

### Recommended Steps

**Increment 1:**
1. Add TimeModel types to `compiler/types.ts` (keep TimelineHint for now with deprecation comment)
2. Add `CompiledProgram` type
3. Create `inferTimeModel(blocks: Block[]): TimeModel` helper function
4. Update main compile function to return `CompiledProgram`
5. Update PreviewPanel to destructure `{ program, timeModel }`
6. Add console.log to verify inference works
7. Run tests, fix any call site issues

**Increment 2:**
1. Add `timeModel: TimeModel | null` property to Player class
2. Add `applyTimeModel(timeModel: TimeModel)` method
3. Modify `tick()` to NOT wrap time - just advance unbounded
4. For now, use `timeModel.durationMs` or `timeModel.periodMs` or `timeModel.windowMs` as scrubber bounds
5. Update PreviewPanel to call `player.applyTimeModel(timeModel)` after compilation
6. Verify cyclic patches loop via signal layer (PhaseClock)
7. Run tests

### Patterns to Follow
- Discriminated unions for TimeModel (already used in codebase)
- Keep existing loopMode UI working - it will become "how player handles reaching bounds" for finite
- Signal layer owns phase wrapping (see PhaseClock: `(t % durationMs) / durationMs`)

### Known Gotchas
- **maxTime in player** is currently hardcoded. After increment 2, it comes from TimeModel
- **loopMode** in player will change meaning: it becomes "what to do at bounds" for finite animations only
- **PhaseClock already wraps internally** - don't double-wrap
- **Multiple call sites** for compile - search thoroughly

## Reference Materials

### Planning Documents
- [PLAN-2024-12-19.md](.agent_planning/time-model/PLAN-2024-12-19.md) - Full implementation plan
- [DOD-2024-12-19.md](.agent_planning/time-model/DOD-2024-12-19.md) - Acceptance criteria
- [USER-RESPONSE-2024-12-19.md](.agent_planning/time-model/USER-RESPONSE-2024-12-19.md) - User approval

### Authoritative Spec
- `feature_planning_docs/PlayerTimeDesign.md` - The canonical technical specification

### Codebase References
- `gallery/src/editor/compiler/types.ts:51-62` - Existing TimelineHint (to be replaced)
- `gallery/src/editor/runtime/player.ts:384-419` - Current tick() with time wrapping
- `gallery/src/editor/compiler/blocks/domain/PhaseClock.ts` - PhaseClock compiler (has mode param)
- `gallery/src/editor/PreviewPanel.tsx` - Main consumer of compilation result

## Questions & Blockers

### Open Questions
- [x] Should TimelineHint be deleted or deprecated? → Deprecate with TODO, delete later

### Current Blockers
- None

### Need User Input On
- None (DoD approved)

## Testing Strategy

### Existing Tests
- `gallery/src/editor/__tests__/domain-pipeline.test.ts` - Tests domain block compilation
- `gallery/src/editor/__tests__/bus-compilation.test.ts` - Tests bus compilation

### New Tests Needed
- [ ] Test TimeModel inference: PhaseClock → cyclic
- [ ] Test TimeModel inference: PhaseMachine → finite
- [ ] Test TimeModel inference: empty patch → infinite

### Manual Testing
- [ ] Compile patch with PhaseClock (loop) → verify cyclic TimeModel logged
- [ ] Compile patch with PhaseMachine → verify finite TimeModel logged
- [ ] Play cyclic patch → verify animation loops (via signal, not player)
- [ ] Scrubbing still works

## Success Metrics

- All existing tests pass
- Build succeeds
- Cyclic patches loop correctly via signal layer
- TimeModel logged on each compilation
- No player-level time wrapping (time advances unbounded)

---

## Next Steps for Agent

**Immediate actions**:
1. Read `feature_planning_docs/PlayerTimeDesign.md` for full context
2. Read `gallery/src/editor/compiler/types.ts` to see existing TimelineHint
3. Start Increment 1: Add TimeModel types

**Before starting implementation**:
- [x] Review all reference materials linked above
- [x] Verify no conflicting work in progress

**When complete**:
- [ ] Update this handoff with status
- [ ] Run full test suite
- [ ] Commit with descriptive message
