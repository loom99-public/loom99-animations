/**
 * ParticleCompositor - Particle-based animation system
 *
 * Manages many particles, each interpolating from start position to target position.
 * Used for particle convergence animations where particles start scattered and
 * converge to form a shape (like the logo).
 *
 * Reference: animations/logo/logo-02-particles.html
 *
 * Features:
 * - Individual particle state (position, opacity, size, color)
 * - Configurable easing (default: easeOutCubic)
 * - Opacity fade-in during movement
 * - Per-particle or automatic staggered delays
 * - SMIL export as animated circles
 */

export interface Particle {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  color: string;
  size: number;
  delay?: number; // Optional per-particle delay (0-1)
}

export interface ParticleState {
  x: number;
  y: number;
  opacity: number;
  size: number;
  color: string;
}

export interface ParticleCompositorConfig {
  particles: Particle[];
  easing?: 'linear' | 'easeOutCubic' | 'easeInCubic';
  fadeDuration?: number; // Duration of fade-in as fraction of total (default 0.5)
  stagger?: number; // Automatic stagger delay between particles (default 0)
}

/**
 * ParticleCompositor - Creates particle convergence animations
 *
 * Each particle interpolates from startX,startY to targetX,targetY with
 * configurable easing and opacity fade-in.
 */
export class ParticleCompositor {
  private particles: Particle[];
  private easing: 'linear' | 'easeOutCubic' | 'easeInCubic';
  private fadeDuration: number;
  private stagger: number;

  constructor(config: ParticleCompositorConfig) {
    this.particles = config.particles;
    this.easing = config.easing || 'easeOutCubic';
    this.fadeDuration = config.fadeDuration ?? 0.5;
    this.stagger = config.stagger ?? 0;
  }

  /**
   * Update all particles at given progress (0-1)
   * Returns array of particle states for rendering
   */
  update(progress: number): ParticleState[] {
    // Clamp progress to 0-1 range
    const p = Math.max(0, Math.min(1, progress));

    return this.particles.map((particle, index) => {
      // Calculate per-particle delay
      const delay = particle.delay ?? (this.stagger * index);

      // Adjust progress for this particle's delay
      const localProgress = Math.max(0, Math.min(1, (p - delay) / (1 - delay)));

      // Apply easing to position interpolation
      const easedProgress = this.applyEasing(localProgress);

      // Interpolate position
      const x = this.interpolate(particle.startX, particle.targetX, easedProgress);
      const y = this.interpolate(particle.startY, particle.targetY, easedProgress);

      // Calculate opacity (fades in faster than movement completes)
      const opacityProgress = Math.min(1, localProgress / this.fadeDuration);
      const opacity = localProgress > 0 ? opacityProgress : 0;

      return {
        x,
        y,
        opacity,
        size: particle.size,
        color: particle.color,
      };
    });
  }

  /**
   * Apply easing function to progress value
   */
  private applyEasing(t: number): number {
    switch (this.easing) {
      case 'linear':
        return t;
      case 'easeOutCubic':
        return 1 - Math.pow(1 - t, 3);
      case 'easeInCubic':
        return t * t * t;
      default:
        return t;
    }
  }

  /**
   * Linear interpolation between two values
   */
  private interpolate(from: number, to: number, progress: number): number {
    return from + (to - from) * progress;
  }

  /**
   * Generate SVG representation with SMIL animations
   * Returns SVG group containing all particles as animated circles
   */
  toSVG(): string {
    if (this.particles.length === 0) {
      return '<g></g>';
    }

    const circles = this.particles.map((particle, index) => {
      return this.particleToSVG(particle, index);
    });

    return `<g>\n${circles.join('\n')}\n</g>`;
  }

  /**
   * Convert single particle to SVG circle with SMIL animations
   */
  private particleToSVG(particle: Particle, index: number): string {
    const delay = particle.delay ?? (this.stagger * index);

    // Generate keyframe values for cx (x position)
    const cxAnimation = this.generateAnimation('cx', particle.startX, particle.targetX, delay);

    // Generate keyframe values for cy (y position)
    const cyAnimation = this.generateAnimation('cy', particle.startY, particle.targetY, delay);

    // Generate opacity animation
    const opacityAnimation = this.generateOpacityAnimation(delay);

    return `  <circle cx="${particle.startX}" cy="${particle.startY}" r="${particle.size}" fill="${particle.color}">
    ${cxAnimation}
    ${cyAnimation}
    ${opacityAnimation}
  </circle>`;
  }

  /**
   * Generate SMIL animate element for a numeric attribute
   */
  private generateAnimation(
    attributeName: string,
    from: number,
    to: number,
    delay: number
  ): string {
    const keyframeCount = 10;
    const values: string[] = [];
    const keyTimes: string[] = [];

    for (let i = 0; i <= keyframeCount; i++) {
      const globalProgress = i / keyframeCount;
      const localProgress = Math.max(0, Math.min(1, (globalProgress - delay) / (1 - delay)));
      const easedProgress = this.applyEasing(localProgress);
      const value = this.interpolate(from, to, easedProgress);

      values.push(value.toFixed(2));
      keyTimes.push(globalProgress.toFixed(3));
    }

    const calcMode = this.easing === 'linear' ? 'linear' : 'spline';
    const attrs = [
      `attributeName="${attributeName}"`,
      `values="${values.join(';')}"`,
      `keyTimes="${keyTimes.join(';')}"`,
      `calcMode="${calcMode}"`,
      'fill="freeze"',
    ];

    // Add keySplines if using spline mode
    if (calcMode === 'spline') {
      const keySplines = this.generateKeySplines(keyframeCount);
      attrs.push(`keySplines="${keySplines}"`);
    }

    return `<animate ${attrs.join(' ')} />`;
  }

  /**
   * Generate SMIL animate element for opacity
   */
  private generateOpacityAnimation(delay: number): string {
    const keyframeCount = 10;
    const values: string[] = [];
    const keyTimes: string[] = [];

    for (let i = 0; i <= keyframeCount; i++) {
      const globalProgress = i / keyframeCount;
      const localProgress = Math.max(0, Math.min(1, (globalProgress - delay) / (1 - delay)));
      const opacityProgress = Math.min(1, localProgress / this.fadeDuration);
      const opacity = localProgress > 0 ? opacityProgress : 0;

      values.push(opacity.toFixed(3));
      keyTimes.push(globalProgress.toFixed(3));
    }

    const calcMode = 'linear'; // Opacity fades linearly
    const attrs = [
      'attributeName="opacity"',
      `values="${values.join(';')}"`,
      `keyTimes="${keyTimes.join(';')}"`,
      `calcMode="${calcMode}"`,
      'fill="freeze"',
    ];

    return `<animate ${attrs.join(' ')} />`;
  }

  /**
   * Generate keySplines for easing
   */
  private generateKeySplines(keyframeCount: number): string {
    const keySplines: string[] = [];

    for (let i = 0; i < keyframeCount; i++) {
      // Generate keySplines based on easing type
      if (this.easing === 'easeOutCubic') {
        // Control points for cubic ease-out
        keySplines.push('0.215 0.61 0.355 1');
      } else if (this.easing === 'easeInCubic') {
        // Control points for cubic ease-in
        keySplines.push('0.55 0.055 0.675 0.19');
      } else {
        // Default to ease-out
        keySplines.push('0.33 1 0.67 1');
      }
    }

    return keySplines.join(';');
  }
}
