/**
 * LineElement - Animated line/path element
 */

import { BaseElement } from '../core/Element';
import type { ElementConfig } from '../core/Element';
import { Track } from '../core/Track';

export interface LineElementConfig extends ElementConfig {
  path: string;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
}

/**
 * LineElement - SVG path with animatable properties
 */
export class LineElement extends BaseElement {
  private path: string;
  private stroke: string;
  private strokeWidth: number;
  private fill: string;
  private svgElement: SVGPathElement | null = null;

  // Current animated values
  private currentStrokeDashoffset: number = 0;
  private currentOpacity: number = 1;

  constructor(config: LineElementConfig) {
    super(config);
    this.path = config.path;
    this.stroke = config.stroke || '#000000';
    this.strokeWidth = config.strokeWidth || 2;
    this.fill = config.fill || 'none';
  }

  /**
   * Update element state at given time
   */
  update(elapsed: number): void {
    const values = this.getTrackValues(elapsed);

    // Update stroke-dashoffset for line drawing effect
    if (values.strokeDashoffset !== undefined) {
      this.currentStrokeDashoffset = values.strokeDashoffset;
    }

    // Update opacity
    if (values.opacity !== undefined) {
      this.currentOpacity = values.opacity;
    }

    // Update DOM if element is rendered
    if (this.svgElement) {
      this.svgElement.style.strokeDashoffset = String(this.currentStrokeDashoffset);
      this.svgElement.style.opacity = String(this.currentOpacity);
    }
  }

  /**
   * Render element to SVG container
   */
  render(container: SVGElement): void {
    if (!(container instanceof SVGElement)) {
      throw new Error('LineElement can only render to SVG containers');
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
    const strokeDashoffsetTrack = this.trackGroup.get<number>('strokeDashoffset');
    const opacityTrack = this.trackGroup.get<number>('opacity');

    if (strokeDashoffsetTrack) {
      const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animate.setAttribute('attributeName', 'stroke-dashoffset');
      const smil = strokeDashoffsetTrack.toSMIL('stroke-dashoffset');
      // Parse SMIL and apply attributes
      this.applySMILAttributes(animate, smil);
      path.appendChild(animate);
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
    path.setAttribute('d', this.path);
    path.setAttribute('stroke', this.stroke);
    path.setAttribute('stroke-width', String(this.strokeWidth));
    path.setAttribute('fill', this.fill);

    // Calculate path length for line drawing
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const tempPath = path.cloneNode(true) as SVGPathElement;
    tempSvg.appendChild(tempPath);
    document.body.appendChild(tempSvg);
    const pathLength = tempPath.getTotalLength();
    document.body.removeChild(tempSvg);

    path.setAttribute('stroke-dasharray', String(pathLength));
    path.setAttribute('stroke-dashoffset', String(this.currentStrokeDashoffset));
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
   * Add line drawing animation
   */
  addLineDrawing(duration: number, delay: number = 0, easing: string = 'easeOutCubic'): void {
    // Calculate path length
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.setAttribute('d', this.path);
    tempSvg.appendChild(tempPath);
    document.body.appendChild(tempSvg);
    const pathLength = tempPath.getTotalLength();
    document.body.removeChild(tempSvg);

    // Create track from full offset to zero (draws the line)
    const track = new Track({
      from: pathLength,
      to: 0,
      duration,
      delay,
      easing,
    });

    this.addTrack('strokeDashoffset', track);
    this.currentStrokeDashoffset = pathLength;
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
}
