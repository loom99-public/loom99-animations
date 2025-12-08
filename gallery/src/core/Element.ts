/**
 * Element - Base class for animated elements
 */

import { Track, TrackGroup } from './Track';

export interface ElementConfig {
  id: string;
  tracks?: Record<string, Track<any>>;
}

/**
 * Base class for all animated elements
 */
export abstract class BaseElement {
  readonly id: string;
  protected trackGroup: TrackGroup;

  constructor(config: ElementConfig) {
    this.id = config.id;
    this.trackGroup = new TrackGroup();

    // Add tracks if provided
    if (config.tracks) {
      Object.entries(config.tracks).forEach(([name, track]) => {
        this.trackGroup.add(name, track);
      });
    }
  }

  /**
   * Add a track to this element
   */
  addTrack<T>(name: string, track: Track<T>): void {
    this.trackGroup.add(name, track);
  }

  /**
   * Get current values for all tracks at given time
   */
  getTrackValues(elapsed: number): Record<string, any> {
    return this.trackGroup.getValues(elapsed);
  }

  /**
   * Check if all tracks are complete
   */
  isComplete(elapsed: number): boolean {
    return this.trackGroup.isComplete(elapsed);
  }

  /**
   * Get total duration of all tracks
   */
  getDuration(): number {
    return this.trackGroup.getDuration();
  }

  /**
   * Update element state at given time
   * This is called every frame during animation
   */
  abstract update(elapsed: number): void;

  /**
   * Render element to container
   * @param container - SVG or Canvas element to render into
   */
  abstract render(container: SVGElement | HTMLCanvasElement): void;

  /**
   * Convert element to SVG markup
   * @returns SVG element with embedded animations
   */
  abstract toSVG(): SVGElement;

  /**
   * Get SVG string representation
   */
  toSVGString(): string {
    const el = this.toSVG();
    return el.outerHTML;
  }
}
