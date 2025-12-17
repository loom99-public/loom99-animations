# dev-loop Implementation Plan: Block Tier/Tags Refactor

This document describes the automated iterative implementation workflow currently running for the update to the editor block and macro registry. It applies the approved plan for the 'DO IT' topic, as managed by the dev-loop implementation system.

---

## Summary of Plan and Steps

### 1. Scope
- Refactor all block and macro registry entries to add a `tier` field (already present for most) and a new flexible `tags` field.
- Migrate existing `category` to `legacyCategory` within `tags` for full backward compatibility.
- Update registry logic, block definitions, and macro definitions accordingly.
- Prepare for BlockLibrary and Inspector UI to use `tier`/`tags` for multi-level grouping.

### 2. Implementation Workflow (dev-loop)
1. **Topic Resolution**: Use most recent explicit task: Registry and macro tier/tags refactor.
2. **Topic Directory**: `.agent_planning/` structure used for planning, DoD, and status.
3. **Plan + Definition of Done**: Pull from approved plan (`bright-stargazing-scott.md`) and acceptance criteria.
4. **Iterative Implementation**: For each criterion:
   - Update registry code to add fields and tags
   - Add utilities (`getBlockTags`)
   - Update macro recipes
   - UI/library refactor comes next after registry
   - Run tests and validate at each major step
5. **Validation**: After each logical chunk, run type checks, lint, tests, and runtime smoke checks.
6. **User Checkpoints**: Output status—print completion, issues, or needed human input.

### 3. Steps Breakdown
- [x] Update block/macro `BlockDefinition` interface (add `tags`)
- [ ] Update all block and macro objects: add `tags`, migrate categories
- [ ] Implement tag utility (`getBlockTags`)
- [ ] Refactor BlockLibrary and Inspector for tier/tags-driven grouping
- [ ] Extend tests
- [ ] Type & runtime validation

## Key Acceptance Criteria
- All block and macro definitions have tier and tags, with `legacyCategory` present for fallback
- No breaking changes to patch serialization
- BlockLibrary palette displays using new tree logic
- Inspector UI shows tags/tier, with fallback display
- All changes covered by runtime and tests

---

This plan is live. Progress updates will be printed below after each step.
