/**
 * V4 Glitch Animation - Envelope Logic
 *
 * Maps phase state to amplitude envelopes.
 * Per ui_example_docs/04-glitch.md spec section 9.1.
 *
 * The glitch effect has four phases with distinct behaviors:
 * - glitch: intense noise, decaying from 1->0
 * - stabilize: residual noise, decaying to 0
 * - hold: no noise, static display
 * - exit: blast of noise then fade out
 */

import type { GlitchPhaseSample, GlitchEnvelopes } from './types';

// =============================================================================
// Envelope Calculation
// =============================================================================

/**
 * Calculate amplitude envelopes for the current phase state.
 *
 * @param ps - Phase sample containing phase name and progress
 * @returns Envelope values controlling all glitch parameters
 */
export function glitchEnvelopes(ps: GlitchPhaseSample): GlitchEnvelopes {
  // Default rates: higher in glitch, lower in stabilize, high again in exit
  const rateHz =
    ps.phase === 'glitch' ? 45 :
    ps.phase === 'stabilize' ? 18 :
    ps.phase === 'exit' ? 55 :
    0;

  if (ps.phase === 'glitch') {
    // Intensity starts high and decays through the phase
    const intensity = 1 - ps.u; // 1 -> 0

    return {
      rateHz,
      rgbAmp: intensity,
      jitterAmp: intensity,
      skewAmp: intensity,
      rotAmp: intensity,
      layerOpacityBase: 0.9 * intensity,
      mainJitterAmp: intensity,
      mainOpacityMul: 1,
    };
  }

  if (ps.phase === 'stabilize') {
    // Residual noise that decays to zero
    const k = 1 - ps.u; // decays to 0

    return {
      rateHz,
      rgbAmp: 0.35 * k,
      jitterAmp: 0.35 * k,
      skewAmp: 0.2 * k,
      rotAmp: 0.2 * k,
      layerOpacityBase: 0.35 * k,
      mainJitterAmp: 0.25 * k,
      mainOpacityMul: 1,
    };
  }

  if (ps.phase === 'hold') {
    // No noise during hold - static display
    return {
      rateHz: 0,
      rgbAmp: 0,
      jitterAmp: 0,
      skewAmp: 0,
      rotAmp: 0,
      layerOpacityBase: 0,
      mainJitterAmp: 0,
      mainOpacityMul: 1,
    };
  }

  // Exit phase
  // RGB offsets get huge early, then everything fades out
  if (ps.phase === 'exit') {
    const exitProgress = ps.u;
    const intensity = 1 - exitProgress;

    return {
      rateHz,
      rgbAmp: 2.0 * intensity,
      jitterAmp: 2.0 * intensity,
      skewAmp: 1.4 * intensity,
      rotAmp: 1.0 * intensity,
      layerOpacityBase: 1.0 * intensity,
      mainJitterAmp: 1.4 * intensity,
      mainOpacityMul: intensity,
    };
  }

  // Fallback (should never reach)
  return {
    rateHz: 0,
    rgbAmp: 0,
    jitterAmp: 0,
    skewAmp: 0,
    rotAmp: 0,
    layerOpacityBase: 0,
    mainJitterAmp: 0,
    mainOpacityMul: 1,
  };
}

// =============================================================================
// Envelope Presets
// =============================================================================

/**
 * Intense glitch preset - more aggressive values.
 */
export function glitchEnvelopesIntense(ps: GlitchPhaseSample): GlitchEnvelopes {
  const base = glitchEnvelopes(ps);

  // Scale up intensities
  const scale = 1.5;

  return {
    ...base,
    rateHz: base.rateHz * 1.2,
    rgbAmp: base.rgbAmp * scale,
    jitterAmp: base.jitterAmp * scale,
    skewAmp: base.skewAmp * scale,
    rotAmp: base.rotAmp * scale,
    mainJitterAmp: base.mainJitterAmp * scale,
  };
}

/**
 * Subtle glitch preset - gentler values.
 */
export function glitchEnvelopesSubtle(ps: GlitchPhaseSample): GlitchEnvelopes {
  const base = glitchEnvelopes(ps);

  // Scale down intensities
  const scale = 0.5;

  return {
    ...base,
    rateHz: base.rateHz * 0.7,
    rgbAmp: base.rgbAmp * scale,
    jitterAmp: base.jitterAmp * scale,
    skewAmp: base.skewAmp * scale,
    rotAmp: base.rotAmp * scale,
    mainJitterAmp: base.mainJitterAmp * scale,
  };
}

/**
 * Custom envelope function type.
 */
export type EnvelopeFn = (ps: GlitchPhaseSample) => GlitchEnvelopes;

/**
 * Create a custom envelope function with scaled intensities.
 */
export function createScaledEnvelopes(intensityScale: number): EnvelopeFn {
  return (ps: GlitchPhaseSample): GlitchEnvelopes => {
    const base = glitchEnvelopes(ps);

    return {
      ...base,
      rgbAmp: base.rgbAmp * intensityScale,
      jitterAmp: base.jitterAmp * intensityScale,
      skewAmp: base.skewAmp * intensityScale,
      rotAmp: base.rotAmp * intensityScale,
      mainJitterAmp: base.mainJitterAmp * intensityScale,
    };
  };
}
