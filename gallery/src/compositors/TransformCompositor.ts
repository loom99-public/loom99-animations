/**
 * TransformCompositor - CSS transform composition for kinetic animations
 *
 * Manages translate, rotate, and scale transformations for elements.
 * Used for kinetic "fly-in" and "fly-out" animations.
 *
 * Reference: animations/logo/logo-06-kinetic.html
 *
 * Features:
 * - Translate (x, y) positioning
 * - Rotate (angle in degrees)
 * - Scale (uniform or x/y independent)
 * - Transform origin support
 * - SMIL <animateTransform> export
 */

export interface TransformState {
  translateX?: number;
  translateY?: number;
  rotate?: number; // degrees
  scaleX?: number;
  scaleY?: number;
  scale?: number; // uniform scale (overrides scaleX/scaleY if set)
}

export interface TransformConfig {
  from: TransformState;
  to: TransformState;
  easing?: string;
}

/**
 * TransformCompositor - Creates kinetic transform animations
 *
 * Interpolates between transform states and outputs CSS transform strings
 * or SMIL animateTransform elements.
 */
export class TransformCompositor {
  private from: Required<TransformState>;
  private to: Required<TransformState>;
  private easing: string;

  constructor(config: TransformConfig) {
    // Fill in defaults for from state
    this.from = {
      translateX: config.from.translateX ?? 0,
      translateY: config.from.translateY ?? 0,
      rotate: config.from.rotate ?? 0,
      scaleX: config.from.scaleX ?? config.from.scale ?? 1,
      scaleY: config.from.scaleY ?? config.from.scale ?? 1,
      scale: config.from.scale ?? 1,
    };

    // Fill in defaults for to state
    this.to = {
      translateX: config.to.translateX ?? 0,
      translateY: config.to.translateY ?? 0,
      rotate: config.to.rotate ?? 0,
      scaleX: config.to.scaleX ?? config.to.scale ?? 1,
      scaleY: config.to.scaleY ?? config.to.scale ?? 1,
      scale: config.to.scale ?? 1,
    };

    this.easing = config.easing || 'linear';
  }

  /**
   * Update transform at given progress (0-1)
   * Returns CSS transform string
   */
  update(progress: number): string {
    // Clamp progress to 0-1 range
    const p = Math.max(0, Math.min(1, progress));

    // Interpolate all transform properties
    const translateX = this.interpolate(this.from.translateX, this.to.translateX, p);
    const translateY = this.interpolate(this.from.translateY, this.to.translateY, p);
    const rotate = this.interpolate(this.from.rotate, this.to.rotate, p);
    const scaleX = this.interpolate(this.from.scaleX, this.to.scaleX, p);
    const scaleY = this.interpolate(this.from.scaleY, this.to.scaleY, p);

    // Build CSS transform string
    const transforms: string[] = [];

    if (translateX !== 0 || translateY !== 0) {
      transforms.push(`translate(${translateX}px, ${translateY}px)`);
    }

    if (rotate !== 0) {
      transforms.push(`rotate(${rotate}deg)`);
    }

    if (scaleX !== 1 || scaleY !== 1) {
      if (scaleX === scaleY) {
        transforms.push(`scale(${scaleX})`);
      } else {
        transforms.push(`scale(${scaleX}, ${scaleY})`);
      }
    }

    return transforms.join(' ') || 'none';
  }

  /**
   * Linear interpolation between two values
   */
  private interpolate(from: number, to: number, progress: number): number {
    return from + (to - from) * progress;
  }

  /**
   * Generate SMIL <animateTransform> elements for SVG export
   * Returns array of SMIL strings (one per transform type)
   */
  toSMIL(): string[] {
    const animations: string[] = [];
    const keyframeCount = 10;

    // Check if translate animation is needed
    if (this.from.translateX !== this.to.translateX || this.from.translateY !== this.to.translateY) {
      const values: string[] = [];
      const keyTimes: string[] = [];

      for (let i = 0; i <= keyframeCount; i++) {
        const progress = i / keyframeCount;
        const x = this.interpolate(this.from.translateX, this.to.translateX, progress);
        const y = this.interpolate(this.from.translateY, this.to.translateY, progress);
        values.push(`${x} ${y}`);
        keyTimes.push(progress.toFixed(3));
      }

      animations.push(this.buildAnimateTransform('translate', values, keyTimes));
    }

    // Check if rotate animation is needed
    if (this.from.rotate !== this.to.rotate) {
      const values: string[] = [];
      const keyTimes: string[] = [];

      for (let i = 0; i <= keyframeCount; i++) {
        const progress = i / keyframeCount;
        const angle = this.interpolate(this.from.rotate, this.to.rotate, progress);
        values.push(String(angle));
        keyTimes.push(progress.toFixed(3));
      }

      animations.push(this.buildAnimateTransform('rotate', values, keyTimes));
    }

    // Check if scale animation is needed
    if (this.from.scaleX !== this.to.scaleX || this.from.scaleY !== this.to.scaleY) {
      const values: string[] = [];
      const keyTimes: string[] = [];

      for (let i = 0; i <= keyframeCount; i++) {
        const progress = i / keyframeCount;
        const sx = this.interpolate(this.from.scaleX, this.to.scaleX, progress);
        const sy = this.interpolate(this.from.scaleY, this.to.scaleY, progress);
        values.push(`${sx} ${sy}`);
        keyTimes.push(progress.toFixed(3));
      }

      animations.push(this.buildAnimateTransform('scale', values, keyTimes));
    }

    return animations;
  }

  /**
   * Build SMIL animateTransform element string
   */
  private buildAnimateTransform(type: string, values: string[], keyTimes: string[]): string {
    const calcMode = this.easing === 'linear' ? 'linear' : 'spline';

    const attrs: string[] = [
      'attributeName="transform"',
      `type="${type}"`,
      `values="${values.join(';')}"`,
      `keyTimes="${keyTimes.join(';')}"`,
      `calcMode="${calcMode}"`,
      'fill="freeze"',
      'additive="sum"', // Allows multiple transforms to combine
    ];

    // Add keySplines if using spline mode
    if (calcMode === 'spline') {
      const keySplines: string[] = [];
      for (let i = 0; i < values.length - 1; i++) {
        // Generate keySplines based on easing type
        if (this.easing === 'easeOutQuart') {
          keySplines.push('0.25 1 0.5 1');
        } else if (this.easing === 'easeInCubic') {
          keySplines.push('0.32 0 0.67 0');
        } else if (this.easing === 'easeOutBack') {
          keySplines.push('0.34 1.56 0.64 1');
        } else {
          // Default to ease-out
          keySplines.push('0.33 1 0.67 1');
        }
      }
      attrs.push(`keySplines="${keySplines.join(';')}"`);
    }

    return `<animateTransform ${attrs.join(' ')} />`;
  }

  /**
   * Get current transform state at progress
   */
  getState(progress: number): TransformState {
    const p = Math.max(0, Math.min(1, progress));

    return {
      translateX: this.interpolate(this.from.translateX, this.to.translateX, p),
      translateY: this.interpolate(this.from.translateY, this.to.translateY, p),
      rotate: this.interpolate(this.from.rotate, this.to.rotate, p),
      scaleX: this.interpolate(this.from.scaleX, this.to.scaleX, p),
      scaleY: this.interpolate(this.from.scaleY, this.to.scaleY, p),
    };
  }
}
