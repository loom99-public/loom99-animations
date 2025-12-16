# Project Structure

## Gallery Application
- **Root**: `/Users/bmf/code/loom99-animations/gallery/`
- **Type**: React + TypeScript + Vite
- **Editor Location**: `src/editor/`
- **Compiler Location**: `src/editor/compiler/`

## Key Directories
- `src/editor/` - Visual editor components (~5K lines)
- `src/editor/compiler/` - Patch → Program compiler
- `src/editor/types.ts` - Core type definitions
- `src/editor/store.ts` - MobX state management
- `src/anim-v4/` - Functional animation framework

## Build System
- **Command**: `pnpm build` (runs `tsc -b && vite build`)
- **Test Command**: `pnpm test` (vitest with happy-dom)
- **Dev Server**: `pnpm dev` (binds to 0.0.0.0)

## Test Framework
- **Runner**: Vitest
- **Environment**: happy-dom
- **Coverage**: `pnpm test:coverage`
- **UI**: `pnpm test:ui`

Last Updated: 2025-12-15