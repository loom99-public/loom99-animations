/**
 * Player: Animation Runtime
 *
 * Single authoritative source for:
 * - Current time (tMs)
 * - Playback state (playing/paused)
 * - Program lifecycle (hot swap)
 *
 * Key invariants:
 * - Time is an input, not integrated state
 * - Programs can be swapped without resetting time
 * - Scrubbing works independently of RAF
 */

import type { RenderTree } from './renderTree';
import type { CompileCtx, RuntimeCtx, Program, Seed } from '../compiler/types';

// =============================================================================
// Types
// =============================================================================

/**
 * A ProgramFactory creates a Program from seed, scene, and compile context.
 * This is what the patch compiler produces.
 */
export type ProgramFactory<T> = (
  seed: Seed,
  scene: Scene,
  ctx: CompileCtx
) => Program<T>;

/**
 * Scene represents the target geometry/content.
 * For now, a minimal stub - will be expanded.
 */
export interface Scene {
  id: string;
  targets?: readonly { x: number; y: number }[];
  paths?: readonly string[];
  bounds?: { width: number; height: number };
}

export type PlayState = 'playing' | 'paused';

export interface PlayerOptions {
  compileCtx: CompileCtx;
  runtimeCtx: RuntimeCtx;
  onFrame: (tree: RenderTree, tMs: number) => void;
  onStateChange?: (state: PlayState) => void;
  onTimeChange?: (tMs: number) => void;
}

// =============================================================================
// Player Implementation
// =============================================================================

export class Player {
  private programFactory: ProgramFactory<RenderTree> | null = null;
  private program: Program<RenderTree> | null = null;

  private seed: Seed = 1;
  private scene: Scene | null = null;

  private compileCtx: CompileCtx;
  private runtimeCtx: RuntimeCtx;

  private playState: PlayState = 'paused';
  private tMs = 0;
  private lastFrameMs = 0;
  private rafId: number | null = null;

  private speed = 1.0;

  private onFrame: (tree: RenderTree, tMs: number) => void;
  private onStateChange?: (state: PlayState) => void;
  private onTimeChange?: (tMs: number) => void;

  constructor(opts: PlayerOptions) {
    this.compileCtx = opts.compileCtx;
    this.runtimeCtx = opts.runtimeCtx;
    this.onFrame = opts.onFrame;
    this.onStateChange = opts.onStateChange;
    this.onTimeChange = opts.onTimeChange;
  }

  // ===========================================================================
  // Program Lifecycle
  // ===========================================================================

  /**
   * Set the program factory (compiled patch output).
   * Instantiates a new program but preserves current time.
   */
  setFactory(factory: ProgramFactory<RenderTree>): void {
    this.programFactory = factory;
    this.instantiateProgram();
  }

  /**
   * Set the random seed.
   * Reinstantiates the program with new seed.
   */
  setSeed(seed: Seed): void {
    this.seed = seed;
    this.instantiateProgram();
  }

  /**
   * Set the scene (target geometry).
   * Reinstantiates the program with new scene.
   */
  setScene(scene: Scene): void {
    this.scene = scene;
    this.instantiateProgram();
  }

  /**
   * Set playback speed multiplier.
   */
  setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(4, speed));
  }

  /**
   * Get current program (for inspection/debugging).
   */
  getProgram(): Program<RenderTree> | null {
    return this.program;
  }

  /**
   * Get current time in milliseconds.
   */
  getTime(): number {
    return this.tMs;
  }

  /**
   * Get current playback state.
   */
  getState(): PlayState {
    return this.playState;
  }

  private instantiateProgram(): void {
    if (!this.programFactory || !this.scene) return;

    this.program = this.programFactory(this.seed, this.scene, this.compileCtx);

    // NOTE: We intentionally do NOT reset tMs
    // This preserves scrubbing + temporal continuity during hot swap

    // Render once to show new program at current time
    this.renderOnce();
  }

  // ===========================================================================
  // Playback Control
  // ===========================================================================

  /**
   * Start playback.
   */
  play(): void {
    if (this.playState === 'playing') return;
    this.playState = 'playing';
    this.lastFrameMs = performance.now();
    this.onStateChange?.(this.playState);
    this.tick();
  }

  /**
   * Pause playback.
   */
  pause(): void {
    if (this.playState === 'paused') return;
    this.playState = 'paused';
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.onStateChange?.(this.playState);
  }

  /**
   * Toggle play/pause.
   */
  toggle(): void {
    if (this.playState === 'playing') {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Scrub to a specific time.
   * Works independently of RAF - just renders once at that time.
   */
  scrubTo(tMs: number): void {
    this.tMs = Math.max(0, tMs);
    this.onTimeChange?.(this.tMs);
    this.renderOnce();
  }

  /**
   * Reset to time 0.
   */
  reset(): void {
    this.scrubTo(0);
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.pause();
    this.program = null;
    this.programFactory = null;
  }

  // ===========================================================================
  // Frame Loop
  // ===========================================================================

  private tick = (): void => {
    if (this.playState !== 'playing') return;

    const now = performance.now();
    const dt = (now - this.lastFrameMs) * this.speed;
    this.lastFrameMs = now;
    this.tMs += dt;

    this.onTimeChange?.(this.tMs);
    this.renderOnce();

    this.rafId = requestAnimationFrame(this.tick);
  };

  private renderOnce(): void {
    if (!this.program) return;

    const tree = this.program.signal(this.tMs, this.runtimeCtx);
    this.onFrame(tree, this.tMs);
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a Player with default contexts.
 */
export function createPlayer(
  onFrame: (tree: RenderTree, tMs: number) => void,
  opts?: {
    width?: number;
    height?: number;
    onStateChange?: (state: PlayState) => void;
    onTimeChange?: (tMs: number) => void;
  }
): Player {
  const compileCtx: CompileCtx = {
    env: {},
    geom: {
      get: <K extends object, V>(key: K, compute: () => V) => compute(),
      invalidate: () => {},
    },
  };

  const runtimeCtx: RuntimeCtx = {
    viewport: {
      w: opts?.width ?? 800,
      h: opts?.height ?? 600,
      dpr: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    },
  };

  return new Player({
    compileCtx,
    runtimeCtx,
    onFrame,
    onStateChange: opts?.onStateChange,
    onTimeChange: opts?.onTimeChange,
  });
}
