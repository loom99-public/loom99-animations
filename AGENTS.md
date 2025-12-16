Notes for agents
----------------

Purpose
- Loom Editor is the focus; all editor code lives in `gallery/src/editor`.
- Goal: editor should recreate the 60 reference animations in `animations/` (see `ANIMATIONS.md`).

Run the app
- `cd gallery && pnpm install` once, then `pnpm dev` (opens at `http://localhost:5173/#/editor`).
- Typecheck/tests: `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm test:e2e` (Playwright).

Key entry points
- `gallery/src/editor/Editor.tsx` + `store.ts`: main UI + state.
- `gallery/src/editor/blocks.ts`: block catalog/definitions.
- `gallery/src/editor/compiler/`: graph → program compilation.
- `gallery/src/editor/runtime/`: playback engine.
- `gallery/src/editor/CONCEPTS.md` and `README.md`: mental model and UI usage.

Workflow reminders
- Editor uses lane layouts (Simple/Detailed) controlled via settings toolbar.
- Use hash route `/#/editor`; blank screen usually means route or TS errors (see README troubleshooting).
