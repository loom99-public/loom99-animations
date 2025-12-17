/**
 * V4 Typewriter Animation - Compiler
 *
 * Compiles typewriter animations using BULK field evaluation.
 * Follows the determinism boundary: fields evaluated once at compile time.
 */

import type { Signal, Context, Time, Seed, CompileCtx } from '../../core/types';
import { PhaseMachines } from '../../core/types';
import type { RenderTree } from '../../render/tree';
import type {
  TypewriterScene,
  TypewriterFields,
  TypewriterPhases,
  TypewriterParams,
  TypewriterState,
  Color,
} from './types';
import { buildTypeSchedule, countRevealed, clamp01 } from './schedule';

// =============================================================================
// Program Type
// =============================================================================

export type Program<Out> = {
  readonly signal: Signal<Out>;
  readonly event: (t: Time, ctx: Context) => readonly never[];
};

// =============================================================================
// Default Field Values
// =============================================================================

const DEFAULT_START_DELAY: number = 0;
const DEFAULT_INTERVAL_JITTER: number = 0;
const DEFAULT_BURST_CHANCE: number = 0;
const DEFAULT_BURST_SIZE: number = 0;
const DEFAULT_OPACITY: number = 1;
const DEFAULT_COLOR: Color = '#00ffff';
const DEFAULT_PER_CHAR_FADE_MS: number = 0;
const DEFAULT_PER_CHAR_JITTER_PX: number = 0;
const DEFAULT_CARET_ENABLED: boolean = true;
const DEFAULT_CARET_BLINK_HZ: number = 2;
const DEFAULT_CARET_WIDTH_PX: number = 3;
const DEFAULT_CARET_HEIGHT_PX: number = 18;

// =============================================================================
// Typewriter Compiler
// =============================================================================

/**
 * Compile a typewriter animation.
 *
 * CRITICAL: Uses BULK FIELD EVALUATION pattern.
 * All fields are evaluated exactly once at compile time.
 *
 * @param scene - The text scene to animate
 * @param fields - Field generators (BULK form)
 * @param phases - Phase machine configuration
 * @param seed - Random seed for determinism
 * @param ctx - Compile context (viewport, etc.)
 * @param renderer - Renderer function
 * @returns Program with signal and event functions
 */
export function compileTypewriter(
  scene: TypewriterScene,
  fields: TypewriterFields,
  phases: TypewriterPhases,
  seed: Seed,
  ctx: CompileCtx,
  renderer: (input: {
    scene: TypewriterScene;
    params: TypewriterParams;
    state: TypewriterState;
    viewport: { width: number; height: number };
  }) => RenderTree
): Program<RenderTree> {
  // Tokenize text into characters
  const tokens = Array.from(scene.text);
  const N = tokens.length;

  // ===== BULK FIELD EVALUATION (ONCE, OUTSIDE LOOP) =====
  // This is the determinism boundary: all fields evaluated here.

  // Single-value fields (evaluate with n=1, take first element)
  const startDelayArr = fields.startDelay(seed, 1, ctx);
  const startDelay = startDelayArr[0] ?? DEFAULT_START_DELAY;

  const opacityArr = fields.opacity ? fields.opacity(seed, 1, ctx) : [DEFAULT_OPACITY];
  const baseOpacity = opacityArr[0] ?? DEFAULT_OPACITY;

  const caretEnabledArr = fields.caretEnabled
    ? fields.caretEnabled(seed, 1, ctx)
    : [DEFAULT_CARET_ENABLED];
  const caretEnabled = caretEnabledArr[0] ?? DEFAULT_CARET_ENABLED;

  const caretBlinkHzArr = fields.caretBlinkHz
    ? fields.caretBlinkHz(seed, 1, ctx)
    : [DEFAULT_CARET_BLINK_HZ];
  const caretBlinkHz = caretBlinkHzArr[0] ?? DEFAULT_CARET_BLINK_HZ;

  const caretWidthArr = fields.caretWidthPx
    ? fields.caretWidthPx(seed, 1, ctx)
    : [DEFAULT_CARET_WIDTH_PX];
  const caretWidth = caretWidthArr[0] ?? DEFAULT_CARET_WIDTH_PX;

  const caretHeightArr = fields.caretHeightPx
    ? fields.caretHeightPx(seed, 1, ctx)
    : [DEFAULT_CARET_HEIGHT_PX];
  const caretHeight = caretHeightArr[0] ?? DEFAULT_CARET_HEIGHT_PX;

  // Per-character fields (evaluate with n=N)
  const charIntervals = fields.charInterval(seed, N, ctx);
  const intervalJitters = fields.intervalJitter
    ? fields.intervalJitter(seed, N, ctx)
    : Array(N).fill(DEFAULT_INTERVAL_JITTER);
  const burstChances = fields.burstChance
    ? fields.burstChance(seed, N, ctx)
    : Array(N).fill(DEFAULT_BURST_CHANCE);
  const burstSizes = fields.burstSize
    ? fields.burstSize(seed, N, ctx)
    : Array(N).fill(DEFAULT_BURST_SIZE);
  const colors = fields.color(seed, N, ctx);
  const perCharFadeDurations = fields.perCharFadeMs
    ? fields.perCharFadeMs(seed, N, ctx)
    : Array(N).fill(DEFAULT_PER_CHAR_FADE_MS);
  const perCharJitters = fields.perCharJitterPx
    ? fields.perCharJitterPx(seed, N, ctx)
    : Array(N).fill(DEFAULT_PER_CHAR_JITTER_PX);

  // Build deterministic schedule
  const schedule = buildTypeSchedule({
    seed,
    N,
    startDelay,
    charIntervals,
    intervalJitters,
    burstChances,
    burstSizes,
  });

  // Create params bundle (result of bulk evaluation)
  const params: TypewriterParams = {
    text: scene.text,
    tokens,
    startDelay,
    charIntervals,
    intervalJitters,
    burstChances,
    burstSizes,
    baseOpacity,
    colors,
    perCharFadeDurations,
    perCharJitters,
    caretEnabled,
    caretBlinkHz,
    caretWidthPx: caretWidth,
    caretHeightPx: caretHeight,
    schedule,
  };

  // ===== PROGRAM SIGNAL =====

  return {
    signal: (t: Time, _ctx: Context): RenderTree => {
      const ps = PhaseMachines.sample(phases.machine, t);

      // Determine visible count based on phase
      let visibleCount: number;
      const timeMs = ps.globalTime * 1000; // Convert to ms

      if (ps.phase === 'typing') {
        // Sample schedule: binary search for revealed count
        visibleCount = countRevealed(schedule.timesMs, timeMs);
      } else if (ps.phase === 'hold' || ps.phase === 'exit') {
        // All visible during hold/exit
        visibleCount = N;
      } else {
        visibleCount = 0;
      }

      // Per-character alpha (fade-in effect)
      const hasCharFade = params.perCharFadeDurations.some(d => d > 0);
      const perCharAlpha = hasCharFade
        ? (i: number) => {
            const revealTime = schedule.timesMs[i] ?? 0;
            const fadeDur = params.perCharFadeDurations[i] ?? 0;
            if (fadeDur <= 0) return 1;
            const elapsed = timeMs - revealTime;
            const u = clamp01(elapsed / fadeDur);
            return u; // Linear fade (could add easing later)
          }
        : undefined;

      // Caret blink (deterministic, time-based toggle)
      const caretVisible =
        params.caretEnabled &&
        ps.phase !== 'exit' &&
        Math.floor((timeMs / 1000) * params.caretBlinkHz) % 2 === 0;

      const caret = params.caretEnabled
        ? {
            index: Math.min(visibleCount, N),
            visible: caretVisible,
            color: params.colors[0] ?? DEFAULT_COLOR,
            widthPx: params.caretWidthPx,
            heightPx: params.caretHeightPx,
          }
        : undefined;

      // Exit opacity multiplier
      const exitPolicy = phases.exit
        ? phases.exit({
            phase: ps.phase,
            progress: ps.progress,
            progressRaw: ps.progressRaw,
          })
        : undefined;
      const opacity = clamp01(params.baseOpacity * (exitPolicy?.opacityMul ?? 1));

      // Build state
      const state: TypewriterState = {
        visibleCount,
        perCharAlpha,
        caret,
        opacity,
      };

      // Render
      return renderer({
        scene,
        params,
        state,
        viewport: ctx.viewport,
      });
    },

    event: () => [],
  };
}
