/**
 * Track - Time-based value interpolation
 * Core primitive for animation system
 */

import type { EasingFunction } from './easing';
import { getEasing, easingToKeySplines } from './easing';

export interface TrackConfig<T = number> {
  from: T;
  to: T;
  duration: number;
  delay?: number;
  easing?: EasingFunction | string;
}

/**
 * Track represents a single animated property over time
 * Supports number, number[], and object interpolation
 */
export class Track<T = number> {
  readonly from: T;
  readonly to: T;
  readonly duration: number;
  readonly delay: number;
  readonly easing: EasingFunction;

  constructor(config: TrackConfig<T>) {
    this.from = config.from;
    this.to = config.to;
    this.duration = config.duration;
    this.delay = config.delay || 0;
    this.easing = getEasing(config.easing || 'linear');
  }

  /**
   * Get interpolated value at given elapsed time
   */
  getValue(elapsed: number): T {
    const progress = this.getProgress(elapsed);
    return this.interpolate(this.from, this.to, progress);
  }

  /**
   * Get 0-1 progress at given elapsed time
   * Accounts for delay and easing
   */
  getProgress(elapsed: number): number {
    // Before track starts
    if (elapsed < this.delay) {
      return 0;
    }

    // After track ends
    if (elapsed >= this.delay + this.duration) {
      return 1;
    }

    // During track
    const localTime = elapsed - this.delay;
    const rawProgress = localTime / this.duration;
    return this.easing(rawProgress);
  }

  /**
   * Check if track is active at given time
   */
  isActive(elapsed: number): boolean {
    return elapsed >= this.delay && elapsed < this.delay + this.duration;
  }

  /**
   * Check if track has completed at given time
   */
  isComplete(elapsed: number): boolean {
    return elapsed >= this.delay + this.duration;
  }

  /**
   * Get the delay of this track
   */
  getDelay(): number {
    return this.delay;
  }

  /**
   * Get the duration of this track
   */
  getDuration(): number {
    return this.duration;
  }

  /**
   * Interpolate between two values based on progress
   */
  private interpolate(from: T, to: T, progress: number): T {
    // Number interpolation
    if (typeof from === 'number' && typeof to === 'number') {
      return (from + (to - from) * progress) as T;
    }

    // Array interpolation
    if (Array.isArray(from) && Array.isArray(to)) {
      return from.map((f, i) => {
        const t = to[i] as number;
        return f + (t - f) * progress;
      }) as T;
    }

    // Object interpolation (for colors, transforms, etc.)
    if (typeof from === 'object' && typeof to === 'object' && from !== null && to !== null) {
      const result: any = {};
      for (const key in from) {
        if (key in to) {
          const fromVal = (from as any)[key];
          const toVal = (to as any)[key];
          if (typeof fromVal === 'number' && typeof toVal === 'number') {
            result[key] = fromVal + (toVal - fromVal) * progress;
          } else {
            result[key] = progress < 0.5 ? fromVal : toVal;
          }
        }
      }
      return result as T;
    }

    // Fallback: discrete transition at midpoint
    return progress < 0.5 ? from : to;
  }

  /**
   * Generate SMIL <animate> element for SVG export
   */
  toSMIL(attributeName: string, id?: string): string {
    const fromStr = this.valueToString(this.from);
    const toStr = this.valueToString(this.to);
    const keySplines = easingToKeySplines(this.easing);

    const attrs: string[] = [
      id ? `id="${id}"` : '',
      `attributeName="${attributeName}"`,
      `from="${fromStr}"`,
      `to="${toStr}"`,
      `dur="${this.duration}ms"`,
      this.delay > 0 ? `begin="${this.delay}ms"` : '',
      `fill="freeze"`,
      `calcMode="spline"`,
      `keySplines="${keySplines}"`,
      `values="${fromStr};${toStr}"`,
      `keyTimes="0;1"`,
    ].filter(Boolean);

    return `<animate ${attrs.join(' ')} />`;
  }

  /**
   * Convert value to string for SVG
   */
  private valueToString(value: T): string {
    if (typeof value === 'number') {
      return value.toString();
    }
    if (Array.isArray(value)) {
      return value.join(' ');
    }
    if (typeof value === 'object' && value !== null) {
      // Handle color objects, transforms, etc.
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Create a track from keyframes
   */
  static fromKeyframes<T>(
    keyframes: Array<{ time: number; value: T; easing?: string | EasingFunction }>
  ): Track<T>[] {
    const tracks: Track<T>[] = [];

    for (let i = 0; i < keyframes.length - 1; i++) {
      const current = keyframes[i];
      const next = keyframes[i + 1];

      tracks.push(
        new Track({
          from: current.value,
          to: next.value,
          delay: current.time,
          duration: next.time - current.time,
          easing: current.easing || 'linear',
        })
      );
    }

    return tracks;
  }
}

/**
 * TrackGroup - Multiple tracks that run in parallel
 */
export class TrackGroup {
  private tracks: Map<string, Track<any>> = new Map();

  add<T>(name: string, track: Track<T>): void {
    this.tracks.set(name, track);
  }

  get<T>(name: string): Track<T> | undefined {
    return this.tracks.get(name);
  }

  getValue(name: string, elapsed: number): any {
    const track = this.tracks.get(name);
    return track ? track.getValue(elapsed) : undefined;
  }

  getValues(elapsed: number): Record<string, any> {
    const values: Record<string, any> = {};
    this.tracks.forEach((track, name) => {
      values[name] = track.getValue(elapsed);
    });
    return values;
  }

  isComplete(elapsed: number): boolean {
    for (const track of this.tracks.values()) {
      if (!track.isComplete(elapsed)) {
        return false;
      }
    }
    return true;
  }

  getDuration(): number {
    let maxDuration = 0;
    this.tracks.forEach((track) => {
      const trackEnd = track.delay + track.duration;
      if (trackEnd > maxDuration) {
        maxDuration = trackEnd;
      }
    });
    return maxDuration;
  }

  toSMIL(): string {
    const animations: string[] = [];
    this.tracks.forEach((track, name) => {
      animations.push(track.toSMIL(name));
    });
    return animations.join('\n  ');
  }
}
