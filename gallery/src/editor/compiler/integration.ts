/**
 * Compiler Integration
 *
 * Bridges the EditorStore with the patch compiler.
 * Converts editor data structures to compiler format and handles compilation.
 */

import type { EditorStore } from '../store';
import type { Block, Connection } from '../types';
import { logStore } from '../logStore';
import { compilePatch } from './compile';
import { createCompileCtx } from './context';
import { createBlockRegistry } from './blocks';
import type {
  BlockInstance,
  BlockRegistry,
  CompileResult,
  CompilerConnection,
  CompilerPatch,
  Program,
  RenderTree,
  Seed,
} from './types';
import { buildDecorations, emptyDecorations, type DecorationSet } from './error-decorations';

// =============================================================================
// Patch Conversion
// =============================================================================

/**
 * Convert EditorStore blocks to compiler BlockInstance map.
 */
function convertBlocks(blocks: Block[]): Map<string, BlockInstance> {
  const map = new Map<string, BlockInstance>();
  for (const block of blocks) {
    map.set(block.id, {
      id: block.id,
      type: block.type,
      params: { ...block.params },
    });
  }
  return map;
}

/**
 * Convert EditorStore connections to compiler format.
 */
function convertConnections(connections: Connection[]): CompilerConnection[] {
  return connections.map((c) => ({
    from: { blockId: c.from.blockId, slotId: c.from.slotId },
    to: { blockId: c.to.blockId, slotId: c.to.slotId },
  })).map((c) => ({
    from: { blockId: c.from.blockId, port: c.from.slotId },
    to: { blockId: c.to.blockId, port: c.to.slotId },
  }));
}

/**
 * Convert EditorStore to CompilerPatch.
 */
export function editorToPatch(store: EditorStore): CompilerPatch {
  return {
    blocks: convertBlocks(store.blocks),
    connections: convertConnections(store.connections),
    // output is auto-inferred
  };
}

// =============================================================================
// Compiler Service
// =============================================================================

export interface Viewport {
  width: number;
  height: number;
  background?: string;
}

export interface CompilerService {
  /** Compile the current patch */
  compile(): CompileResult;

  /** Get the compiled program (if successful) */
  getProgram(): Program<RenderTree> | null;

  /** Get the block registry */
  getRegistry(): BlockRegistry;

  /** Get error decorations for UI display */
  getDecorations(): DecorationSet;

  /** Get viewport dimensions from Canvas block (or defaults) */
  getViewport(): Viewport;
}

/**
 * Create a compiler service for an EditorStore.
 */
export function createCompilerService(store: EditorStore): CompilerService {
  const registry = createBlockRegistry();
  const ctx = createCompileCtx();

  let lastResult: CompileResult | null = null;
  let lastDecorations: DecorationSet = emptyDecorations();

  return {
    compile(): CompileResult {
      const startTime = performance.now();

      logStore.debug('compiler', 'Starting compilation...');

      try {
        const patch = editorToPatch(store);
        const seed: Seed = store.settings.seed;

        logStore.debug(
          'compiler',
          `Patch has ${patch.blocks.size} blocks and ${patch.connections.length} connections`
        );

        const result = compilePatch(patch, registry, seed, ctx);
        const elapsed = (performance.now() - startTime).toFixed(1);

        if (result.ok) {
          logStore.info('compiler', `Compiled successfully (${elapsed}ms)`);
          lastDecorations = emptyDecorations();
        } else {
          // EmptyPatch is not an error - it's expected when the patch is cleared
          const isEmptyPatch = result.errors.length === 1 && result.errors[0].code === 'EmptyPatch';

          if (isEmptyPatch) {
            // Silently clear state - no error logging for empty patch
            lastDecorations = emptyDecorations();
          } else {
            // Log each error
            for (const err of result.errors) {
              const location = err.where?.blockId
                ? ` [${err.where.blockId}${err.where.port ? '.' + err.where.port : ''}]`
                : '';
              logStore.error('compiler', `${err.code}: ${err.message}${location}`);
            }
            logStore.warn('compiler', `Compilation failed with ${result.errors.length} error(s)`);
            // Build decorations for UI display
            lastDecorations = buildDecorations(result.errors);
          }
        }

        lastResult = result;
        return result;
      } catch (e) {
        const elapsed = (performance.now() - startTime).toFixed(1);
        const message = e instanceof Error ? e.message : String(e);
        const stack = e instanceof Error ? e.stack : undefined;

        logStore.error('compiler', `Unexpected error: ${message}`, stack);

        lastResult = {
          ok: false,
          errors: [{ code: 'UpstreamError', message }],
        };
        lastDecorations = buildDecorations(lastResult.errors);
        return lastResult;
      }
    },

    getProgram(): Program<RenderTree> | null {
      return lastResult?.program ?? null;
    },

    getRegistry(): BlockRegistry {
      return registry;
    },

    getDecorations(): DecorationSet {
      return lastDecorations;
    },

    getViewport(): Viewport {
      // Find Canvas block in the store and extract its viewport params
      const canvasBlock = store.blocks.find((b) => b.type === 'canvas');
      if (canvasBlock) {
        return {
          width: (canvasBlock.params.width as number) ?? 800,
          height: (canvasBlock.params.height as number) ?? 600,
          background: canvasBlock.params.background as string | undefined,
        };
      }
      // Default viewport if no Canvas block
      return { width: 800, height: 600 };
    },
  };
}

// =============================================================================
// Auto-Compile Hook (MobX reaction)
// =============================================================================

import { reaction } from 'mobx';

export interface AutoCompileOptions {
  /** Debounce delay in ms (default: 300) */
  debounce?: number;
  /** Callback when compilation completes */
  onCompile?: (result: CompileResult) => void;
}

/**
 * Set up auto-compilation that triggers when the patch changes.
 * Returns a dispose function to stop watching.
 */
export function setupAutoCompile(
  store: EditorStore,
  service: CompilerService,
  options: AutoCompileOptions = {}
): () => void {
  const { debounce = 300, onCompile } = options;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const dispose = reaction(
    // Track these observables
    () => ({
      blockCount: store.blocks.length,
      blocks: store.blocks.map((b) => ({ id: b.id, type: b.type, params: JSON.stringify(b.params) })),
      connectionCount: store.connections.length,
      connections: store.connections.map((c) => `${c.from.blockId}:${c.from.slotId}->${c.to.blockId}:${c.to.slotId}`),
      seed: store.settings.seed,
    }),
    // React to changes
    () => {
      // Clear pending compile
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Schedule new compile
      timeoutId = setTimeout(() => {
        logStore.debug('compiler', 'Auto-compile triggered');
        const result = service.compile();
        onCompile?.(result);
      }, debounce);
    },
    {
      // Don't fire immediately on setup
      fireImmediately: false,
    }
  );

  // Return dispose function that also clears pending timeout
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    dispose();
  };
}
