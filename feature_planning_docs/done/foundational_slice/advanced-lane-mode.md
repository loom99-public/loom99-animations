# Advanced Lane Mode Specification

This document describes the Advanced Lane Mode feature, which is currently stubbed out (grayed out in the UI) but planned for future implementation.

## Overview

Advanced Mode unlocks full lane customization while maintaining compiler correctness. The key principle is: **"same compiler, different desk"** - lanes are UI organization only; port types and connections remain the source of truth.

## Simple Mode (Current Default)

Simple Mode provides a guided experience:
- Fixed lane layouts (Simple 5-lane or Detailed 9-lane presets)
- Lanes cannot be added, removed, or reordered by users
- Palette suggestions are filtered by lane type
- Users can only switch between preset layouts

## Advanced Mode (Future Implementation)

### Unlocked Capabilities

When Advanced Mode is enabled, users can:

1. **Lane Structure**
   - Add new lanes (any LaneKind)
   - Duplicate existing lanes
   - Delete lanes (except Output - requires at least one)
   - Reorder lanes via drag-and-drop
   - Group lanes into collapsible sections

2. **Lane Properties**
   - Rename lanes (custom labels)
   - Change lane kind (Scene, Phase, Fields, etc.)
   - Change lane flavor (Motion, Timing, Style, General)
   - Set custom lane colors/tints
   - Adjust lane height/density
   - Pin lanes (always visible)
   - Collapse lanes (save space)

3. **Block Placement**
   - Place any block in any lane
   - Move blocks freely between lanes
   - Palette shows all blocks (with type-compatible highlighting)

### What Advanced Mode Does NOT Change

These remain constant regardless of mode:
- Port types (SlotType definitions)
- Connection legality (type compatibility)
- Compile semantics
- Evaluation order (topological sort)
- Block behavior

## Implementation Plan

### Phase 1: UI Foundation (This PR)
- [x] Settings toolbar with dropdowns
- [x] Lane layout selector (preset switching)
- [x] Simple/Advanced mode toggle (grayed out)
- [x] Store settings for mode state

### Phase 2: Lane Manipulation UI
- [ ] Lane header actions menu (rename, delete, duplicate)
- [ ] Lane drag handle for reordering
- [ ] "Add Lane" button with kind selector
- [ ] Lane property inspector (kind, flavor, color)

### Phase 3: Lane Sections
- [ ] Section model in store (array of lane groups)
- [ ] Section headers with collapse/expand
- [ ] Drag lanes between sections
- [ ] Create/delete sections

### Phase 4: Persistence & Templates
- [ ] Save custom layouts
- [ ] Export/import layouts as JSON
- [ ] User-created layout templates

## Data Model

### Lane Configuration (Advanced Mode)

```typescript
interface LaneConfig {
  id: string;
  kind: LaneKind;
  flavor: LaneFlavor;
  name: string;           // User-editable label
  collapsed?: boolean;
  height?: number;        // Custom height (px or relative)
  tint?: string;          // Visual color hint (hex)
  pinned?: boolean;
  order: number;          // Position index
  sectionId?: string;     // Optional section grouping
}

interface LaneSection {
  id: string;
  name: string;
  collapsed: boolean;
  laneIds: string[];      // Ordered lanes in section
}
```

### Store Extensions

```typescript
// New store properties for Advanced Mode
class EditorStore {
  // ... existing properties ...

  laneSections: LaneSection[] = [];  // Optional grouping
  customLayouts: LaneLayout[] = [];  // User-saved layouts

  // Advanced mode actions
  setLaneKind(laneId: string, kind: LaneKind): void;
  setLaneFlavor(laneId: string, flavor: LaneFlavor): void;
  setLaneTint(laneId: string, color: string): void;
  reorderLanes(laneIds: string[]): void;
  createSection(name: string): string;
  moveToSection(laneId: string, sectionId: string): void;
  saveCurrentLayout(name: string): void;
}
```

## UX Considerations

### Mode Transition
- Switching from Simple → Advanced preserves current block placements
- Switching from Advanced → Simple prompts to migrate to nearest preset
- No data loss on mode switch (blocks/connections preserved)

### Visual Differentiation
- Advanced Mode shows a subtle badge in toolbar
- Lane headers show edit icons when in Advanced Mode
- Drag handles appear on hover in Advanced Mode

### Guard Rails
- Warn before deleting lane with blocks
- Suggest moving blocks before lane deletion
- Cannot delete last Output lane
- Undo/redo support for lane operations

## Related Documents
- `lane-simple-advanced.md` - Original design spec
- `lanes-overview.md` - Lane philosophy
- `lane-mode.md` - Simple layout specification
- `lane-mode-2.md` - Detailed layout specification
