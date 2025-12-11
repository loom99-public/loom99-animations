/**
 * MorphingLineElement - Animated path morphing element
 * Uses PathMorphCompositor for "shoot-in-and-curve" animation effect
 */

import { BaseElement } from '../core/Element';
import type { ElementConfig } from '../core/Element';
import { Track } from '../core/Track';
import { PathMorphCompositor, type Point } from '../compositors/PathMorphCompositor';

export interface MorphingLineElementConfig extends ElementConfig {
  startPos: Point;
  points: Point[];
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  easing?: string;
}

/**
 * MorphingLineElement - SVG path with morphing animation
 *
 * Animation phases:
 * 1. Entrance: Path morphs from off-screen start position to final shape
 * 2. Hold: Path remains in final shape
 * 3. Exit: Path fades out or shoots back off-screen
 */
export class MorphingLineElement extends BaseElement {
  private startPos: Point;
  private points: Point[];
  private stroke: string;
  private strokeWidth: number;
  private fill: string;
  private compositor: PathMorphCompositor;
  private svgElement: SVGPathElement | null = null;

  // Current animated values
  private currentMorphProgress: number = 0;
  private currentOpacity: number = 1;
  private currentExitProgress: number = 0;

  constructor(config: MorphingLineElementConfig) {
    super(config);
    this.startPos = config.startPos;
    this.points = config.points;
    this.stroke = config.stroke || '#000000';
    this.strokeWidth = config.strokeWidth || 2;
    this.fill = config.fill || 'none';

    // Create compositor for path morphing
    this.compositor = new PathMorphCompositor({
      startPos: this.startPos,
      points: this.points,
      easing: config.easing || 'easeOutQuart',
    });
  }

  /**
   * Update element state at given time
   */
  update(elapsed: number): void {
    const values = this.getTrackValues(elapsed);

    // Update morph progress for path animation
    if (values.morphProgress !== undefined) {
      this.currentMorphProgress = values.morphProgress;
    }

    // Update opacity
    if (values.opacity !== undefined) {
      this.currentOpacity = values.opacity;
    }

    // Update exit progress
    if (values.exitProgress !== undefined) {
      this.currentExitProgress = values.exitProgress;
    }

    // Update DOM if element is rendered
    if (this.svgElement) {
      let d: string;

      if (this.currentExitProgress > 0) {
        // Exit animation: extend line toward start position (shoot-out effect)
        d = this.generateExitPath(this.currentExitProgress);
      } else {
        // Normal entrance/hold: use compositor
        d = this.compositor.update(this.currentMorphProgress);
      }

      this.svgElement.setAttribute('d', d);
      this.svgElement.style.opacity = String(this.currentOpacity);
    }
  }

  /**
   * Generate path with exit extension (shoot-out effect)
   * The line extends from the last point toward the exit position
   */
  private generateExitPath(exitProgress: number): string {
    // Start with the final shape (morph progress = 1)
    const lastPoint = this.points[this.points.length - 1];
    const firstPoint = this.points[0];

    // Build the base path in final form
    let d = `M ${firstPoint.x} ${firstPoint.y}`;

    for (let i = 1; i < this.points.length; i++) {
      const point = this.points[i];
      const type = point.type || 'L';

      if (type === 'Q') {
        d += ` Q ${point.controlX ?? point.x} ${point.controlY ?? point.y} ${point.x} ${point.y}`;
      } else if (type === 'A') {
        const radiusX = point.radiusX ?? 0;
        const radiusY = point.radiusY ?? 0;
        const rotation = point.rotation ?? 0;
        const largeArc = point.largeArc ? 1 : 0;
        const sweep = point.sweep ? 1 : 0;
        d += ` A ${radiusX} ${radiusY} ${rotation} ${largeArc} ${sweep} ${point.x} ${point.y}`;
      } else {
        d += ` L ${point.x} ${point.y}`;
      }
    }

    // Extend the line toward the exit position (startPos)
    const exitX = lastPoint.x + (this.startPos.x - lastPoint.x) * exitProgress;
    const exitY = lastPoint.y + (this.startPos.y - lastPoint.y) * exitProgress;
    d += ` L ${exitX} ${exitY}`;

    return d;
  }

  /**
   * Render element to SVG container
   */
  render(container: SVGElement): void {
    if (!(container instanceof SVGElement)) {
      throw new Error('MorphingLineElement can only render to SVG containers');
    }

    this.svgElement = this.createSVGPath();
    container.appendChild(this.svgElement);
  }

  /**
   * Convert to static SVG element
   */
  toSVG(): SVGElement {
    const path = this.createSVGPath();

    // Add SMIL animations
    const morphTrack = this.trackGroup.get<number>('morphProgress');
    const opacityTrack = this.trackGroup.get<number>('opacity');

    if (morphTrack) {
      // Use compositor's SMIL generation
      const animateElement = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      const smil = this.compositor.toSMIL();
      this.applySMILAttributes(animateElement, smil);

      // Add timing from track
      const delay = morphTrack.getDelay();
      const duration = morphTrack.getDuration();
      animateElement.setAttribute('begin', `${delay}ms`);
      animateElement.setAttribute('dur', `${duration}ms`);

      path.appendChild(animateElement);
    }

    if (opacityTrack) {
      const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animate.setAttribute('attributeName', 'opacity');
      const smil = opacityTrack.toSMIL('opacity');
      this.applySMILAttributes(animate, smil);
      path.appendChild(animate);
    }

    return path;
  }

  /**
   * Create base SVG path element
   */
  private createSVGPath(): SVGPathElement {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('id', this.id);

    // Set initial path at current morph progress
    const d = this.compositor.update(this.currentMorphProgress);
    path.setAttribute('d', d);

    path.setAttribute('stroke', this.stroke);
    path.setAttribute('stroke-width', String(this.strokeWidth));
    path.setAttribute('fill', this.fill);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.style.opacity = String(this.currentOpacity);

    return path;
  }

  /**
   * Parse SMIL string and apply to element
   */
  private applySMILAttributes(element: SVGAnimateElement, smil: string): void {
    // Simple parser for SMIL attributes
    const matches = smil.matchAll(/(\w+)="([^"]+)"/g);
    for (const match of matches) {
      const [, attr, value] = match;
      element.setAttribute(attr, value);
    }
  }

  /**
   * Add morphing animation (entrance effect)
   */
  addMorphAnimation(duration: number, delay: number = 0, easing: string = 'easeOutQuart'): void {
    // Create track from 0 (straight line from start) to 1 (final curved shape)
    const track = new Track({
      from: 0,
      to: 1,
      duration,
      delay,
      easing,
    });

    this.addTrack('morphProgress', track);
    this.currentMorphProgress = 0;
  }

  /**
   * Add fade in animation
   */
  addFadeIn(duration: number, delay: number = 0, easing: string = 'linear'): void {
    const track = new Track({
      from: 0,
      to: 1,
      duration,
      delay,
      easing,
    });

    this.addTrack('opacity', track);
    this.currentOpacity = 0;
  }

  /**
   * Add fade out animation
   */
  addFadeOut(duration: number, delay: number = 0, easing: string = 'linear'): void {
    const track = new Track({
      from: 1,
      to: 0,
      duration,
      delay,
      easing,
    });

    this.addTrack('opacity', track);
  }

  /**
   * Add shoot-out exit animation
   * Lines extend toward exit position while fading out
   */
  addShootOutExit(duration: number, delay: number = 0, easing: string = 'easeInCubic'): void {
    // Track exit progress from 0 to 1
    const exitTrack = new Track({
      from: 0,
      to: 1,
      duration,
      delay,
      easing,
    });

    this.addTrack('exitProgress', exitTrack);

    // Fade out simultaneously
    const opacityTrack = new Track({
      from: 1,
      to: 0,
      duration,
      delay,
      easing,
    });

    this.addTrack('opacity', opacityTrack);
  }

  /**
   * Get the start position (for exit direction calculation)
   */
  getStartPos(): Point {
    return this.startPos;
  }

  /**
   * Get the final point positions
   */
  getPoints(): Point[] {
    return this.points;
  }
}
