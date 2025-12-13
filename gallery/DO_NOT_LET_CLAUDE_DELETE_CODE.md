# ⚠️ CRITICAL REMINDER ⚠️

## DO NOT LET CLAUDE DELETE OR "CLEAN UP" CODE

**Date:** 2025-12-12
**Incident:** Claude attempted to remove "dead code" and caused significant disruption

## What Went Wrong

1. **Claude moved active code to "to-delete"** - Files that were actively imported and used were flagged as "dead code"
2. **No dependency analysis** - Did not properly trace which files were actually imported and used
3. **Overly aggressive** - Removed entire directories without understanding their role
4. **Used `rm -rf`** - Dangerous command that permanently deletes files

## What Was Almost Lost

- `SideBySideViewer.tsx` - Actively used by AnimationCard
- `LineDrawingViewer.tsx` - Used for technique 01 preview
- `pathData.ts` - Imported by ParticleViewer
- Original HTML animations (HtmlAnimatedLine, HtmlVariedAnimation, LineDrawingAnimation)
- Legacy Track/Element/Compositor system that other code depends on

## The Correct Approach

### Before Deleting Anything:

1. **Map dependencies first** - Use `grep` to find ALL imports of a module before deleting it
2. **Check git blame** - See when files were last modified
3. **Run tests** - Verify nothing breaks
4. **Ask the user** - Especially for ambiguous cases

### Never:

- Use `rm -rf` on code directories
- Move code to "to-delete" without explicit user approval per file
- Assume something is "dead" without proof
- Make bulk changes without incremental testing

## Rules for Code Cleanup

1. **START SMALL** - One file or directory at a time
2. **TEST FREQUENTLY** - Run `pnpm build` and `pnpm test` after each change
3. **ASK QUESTIONS** - If unsure whether something is used, ASK
4. **USE GIT** - Check if files can be safely deleted with `git rm --dry-run`
5. **DOCUMENT** - Keep notes of what was deleted and why

## What Actually Needs Cleaning

The user wants to remove:
- **V3 system** (anim-v3/) - Can be removed IF we verify nothing imports from it
- **Unused legacy code** - ONLY after confirming it's truly unused

Keep:
- **V4 framework** (anim-v4/) - The primary focus
- **Gallery UI** (components/, editor/)
- **Original HTML animations** (animations/Html*.ts, LineDrawingAnimation.ts)
- **Build/server config** (vite.config.ts, etc.)

## Bottom Line

**ASK BEFORE DELETING ANYTHING**

Even if it looks unused, even if tests still pass, even if you're "pretty sure" - ASK THE USER FIRST.
