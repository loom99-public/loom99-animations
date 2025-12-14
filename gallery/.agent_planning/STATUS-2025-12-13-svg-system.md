# STATUS: SVG Path System Overhaul

**Date**: 2025-12-13
**Focus**: Comprehensive overhaul of SVG path data system

## Current State Analysis

### What Exists

**Path Data Storage** (`gallery/src/data/pathData.ts`):
- 3 hardcoded datasets: `LOGO_PATHS`, `TEXT_PATHS`, `HEART_PATHS`
- Each is an array of `LineData` objects with:
  - `startX`, `startY` - path start
  - `points: PathPoint[]` - curve segments (L=line, Q=quadratic, A=arc)
  - `color`, `delay`, `duration` - styling/timing

**SVGPathSource Block**:
- Single `target` param: dropdown with 3 options (logo/text/heart)
- Samples paths mathematically into `TargetScene` with Vec2 points
- No way to add custom paths
- No import/export

### Problems

1. **Hardcoded Data**: Only 3 shapes, forever. Users can't add more.
2. **No Import**: Can't load external SVG files
3. **No Export**: Can't save path configurations
4. **Fixed Dropdown**: Block UI has only 3 choices
5. **Poor Quality**: Existing paths are basic "developer art"
6. **No Editing**: Zero ability to modify paths in-app

### Data Flow

```
pathData.ts (hardcoded)
  → SVGPathSource (samples to points)
  → TargetScene {targets: Vec2[]}
  → Animation blocks
```

## Requirements Analysis

### Must Have (a-d from request)
- [ ] **a) Decouple from hardcoded file** - Path registry system
- [ ] **b) Import/Export SVG paths** - File I/O for raw paths
- [ ] **c) Paste SVG code** - Quick text input method
- [ ] **d) Dynamic dropdown** - List available sources, allow selection

### Nice to Have (e - brainstorm only)
- Simple path editing without full SVG editor
- Path generation helpers

## Architecture Decision

**Core Concept: SVG Path Library**

A user-extensible library of path sources that:
1. Comes with built-in paths (existing logo/text/heart)
2. Allows importing SVG files → converted to LineData format
3. Persists user-added paths in localStorage
4. Dynamically populates SVGPathSource dropdown
5. Supports export for sharing

**Not Building**:
- Full SVG editor (out of scope)
- Real-time path drawing (complex)
- Vector graphic manipulation tools

## Verdict

**CONTINUE** - Clear requirements, well-scoped system upgrade.
