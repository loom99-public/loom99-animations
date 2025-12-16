# .agent_planning Directory Organization

This directory contains planning and execution artifacts organized by **work item/initiative**, not by file type. All related files for a given work item are grouped together.

## Directory Structure

### work-items/
Contains all active and recent work organized by initiative:

#### svg-path-module/
SVG path manipulation and compositor layer work
- EVAL-module-svg-path-*.md: Module evaluation reports
- PLAN-compositor-layer-20251214.md: Compositor infrastructure plan
- TASK-EVAL-compositor-layer-20251214.md: Task evaluation

#### v4-animation-framework/
V4 animation framework development
- EXEC-it-2025-12-09-034300.md: Execution logs
- PLAN-v3-animation-framework.md: V3 framework plan
- PLAN-v4-comprehensive-animation-framework.md: V4 comprehensive plan

#### html-controls/
HTML controls and seeding functionality
- PLAN-html-controls-seeding.md: HTML controls seeding plan

#### dynamic-text-geometry/
Dynamic text geometry animations
- dynamic-text-geometry-animations.md: Animation specifications

#### unified-animation-editor/
Unified Animation Editor (main project)
- PLAN-2025-12-12-180508.md: Implementation plan
- PROJECT_SPEC.md: Complete project specification

#### engine-flexibility-analysis/
Engine flexibility and abstraction analysis
- ENGINE-FLEXIBILITY-ANALYSIS.md: Critical analysis of engine abstraction

### archive/
Contains completed work and historical documents organized by work item when possible. All old status reports, summaries, and completed evaluations are archived here.

### Existing subdirectories (unchanged):
- `bus-transformation/`: Bus transformation initiative documents
- `do-command-logs/`: Logs from do command executions
- `do-command-state/`: State for do command executions
- `eval-cache/`: Cached evaluation results
- `pre-phase-3/`: Pre-phase 3 planning documents
- `ui-right-panel/`: UI right panel specific documents
- `_subagent_logs_leftover/`: Leftover subagent logs
- `.exec/`: Execution artifacts

## Organization Philosophy
- **Work-item-centric**: All files for a given initiative are grouped together
- **Single source of truth**: No need to hunt across multiple directories for related files
- **Clear separation**: Active work in work-items/, completed work in archive/

## Organization Date
Reorganized on 2025-12-15 to use work-item-based structure instead of file-type-based organization.