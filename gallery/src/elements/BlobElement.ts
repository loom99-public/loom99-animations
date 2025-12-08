/**
 * BlobElement - Animated blob/metaball for liquid effects
 * Used for gooey/liquid animations with SVG filter effects
 */

import { BaseElement } from '../core/Element';
import type { ElementConfig } from '../core/Element';
import { Track } from '../core/Track';

export interface BlobElementConfig extends ElementConfig {
  x: number;
  y: number;
  radius: number;
  color?: string;
}

/**
 * BlobElement - A single animated blob for liquid effects
 */
export class BlobElement extends BaseElement {
  private x: number;
  private y: number;
  private radius: number;
  private color: string;
  private svgElement: SVGCircleElement | null = null;

  // Current animated values
  private currentX: number;
  private currentY: number;
  private currentRadius: number;
  private currentOpacity: number = 1;

  constructor(config: BlobElementConfig) {
    super(config);
    this.x = config.x;
    this.y = config.y;
    this.radius = config.radius;
    this.color = config.color || 'hsl(0, 100%, 59%)';

    this.currentX = this.x;
    this.currentY = this.y;
    this.currentRadius = this.radius;
  }

  /**
   * Update element state at given time
   */
  update(elapsed: number): void {
    const values = this.getTrackValues(elapsed);

    if (values.x !== undefined) {
      this.currentX = values.x;
    }
    if (values.y !== undefined) {
      this.currentY = values.y;
    }
    if (values.radius !== undefined) {
      this.currentRadius = values.radius;
    }
    if (values.opacity !== undefined) {
      this.currentOpacity = values.opacity;
    }

    // Update DOM if element is rendered
    if (this.svgElement) {
      this.svgElement.setAttribute('cx', String(this.currentX));
      this.svgElement.setAttribute('cy', String(this.currentY));
      this.svgElement.setAttribute('r', String(Math.max(0, this.currentRadius)));
      this.svgElement.setAttribute('opacity', String(this.currentOpacity));
    }
  }

  /**
   * Render element to SVG container
   */
  render(container: SVGElement | HTMLCanvasElement): void {
    if (!(container instanceof SVGElement)) {
      throw new Error('BlobElement can only render to SVG containers');
    }

    this.svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.svgElement.setAttribute('id', this.id);
    this.svgElement.setAttribute('cx', String(this.currentX));
    this.svgElement.setAttribute('cy', String(this.currentY));
    this.svgElement.setAttribute('r', String(Math.max(0, this.currentRadius)));
    this.svgElement.setAttribute('fill', this.color);
    this.svgElement.setAttribute('filter', 'url(#goo)');

    container.appendChild(this.svgElement);
  }

  /**
   * Convert to SVG element
   */
  toSVG(): SVGElement {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('id', this.id);
    circle.setAttribute('cx', String(this.x));
    circle.setAttribute('cy', String(this.y));
    circle.setAttribute('r', String(this.radius));
    circle.setAttribute('fill', this.color);
    circle.setAttribute('filter', 'url(#goo)');

    // Add SMIL animations
    const xTrack = this.trackGroup.get<number>('x');
    const yTrack = this.trackGroup.get<number>('y');
    const radiusTrack = this.trackGroup.get<number>('radius');
    const opacityTrack = this.trackGroup.get<number>('opacity');

    if (xTrack) {
      const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      this.applySMILFromTrack(animate, xTrack, 'cx');
      circle.appendChild(animate);
    }

    if (yTrack) {
      const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      this.applySMILFromTrack(animate, yTrack, 'cy');
      circle.appendChild(animate);
    }

    if (radiusTrack) {
      const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      this.applySMILFromTrack(animate, radiusTrack, 'r');
      circle.appendChild(animate);
    }

    if (opacityTrack) {
      const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      this.applySMILFromTrack(animate, opacityTrack, 'opacity');
      circle.appendChild(animate);
    }

    return circle;
  }

  /**
   * Apply SMIL attributes from track
   */
  private applySMILFromTrack(
    element: SVGAnimateElement,
    track: Track<number>,
    attributeName: string
  ): void {
    const smil = track.toSMIL(attributeName);
    const matches = smil.matchAll(/(\w+)="([^"]+)"/g);
    for (const match of matches) {
      const [, attr, value] = match;
      element.setAttribute(attr, value);
    }
  }

  /**
   * Add drop animation - blob drops from above
   */
  addDropEntrance(
    startY: number,
    duration: number,
    delay: number = 0,
    dropEasing: string = 'easeInCubic',
    spreadEasing: string = 'easeOutCubic'
  ): void {
    // Random start position
    const startX = this.x + (Math.random() - 0.5) * 150;
    const startRadius = 2 + Math.random() * 6;

    // Vertical drop
    this.addTrack(
      'y',
      new Track({
        from: startY,
        to: this.y,
        duration: duration * 0.7,
        delay,
        easing: dropEasing,
      })
    );

    // Horizontal spread
    this.addTrack(
      'x',
      new Track({
        from: startX,
        to: this.x,
        duration: duration,
        delay,
        easing: spreadEasing,
      })
    );

    // Radius expansion
    this.addTrack(
      'radius',
      new Track({
        from: startRadius,
        to: this.radius,
        duration: duration,
        delay,
        easing: spreadEasing,
      })
    );

    // Set initial values
    this.currentX = startX;
    this.currentY = startY;
    this.currentRadius = startRadius;
  }

  /**
   * Add drip exit animation - blob drips downward
   */
  addDripExit(
    duration: number,
    delay: number = 0,
    easing: string = 'easeInCubic'
  ): void {
    const dripDistance = 500;

    // Drip down
    this.addTrack(
      'y',
      new Track({
        from: this.y,
        to: this.y + dripDistance,
        duration,
        delay,
        easing,
      })
    );

    // Shrink
    this.addTrack(
      'radius',
      new Track({
        from: this.radius,
        to: this.radius * 0.5,
        duration,
        delay,
        easing,
      })
    );

    // Fade out
    this.addTrack(
      'opacity',
      new Track({
        from: 1,
        to: 0,
        duration,
        delay,
        easing,
      })
    );
  }

  /**
   * Static method to create the SVG goo filter
   */
  static createGooFilter(id: string = 'goo', stdDeviation: number = 10): SVGFilterElement {
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', id);

    const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    blur.setAttribute('in', 'SourceGraphic');
    blur.setAttribute('stdDeviation', String(stdDeviation));
    blur.setAttribute('result', 'blur');
    filter.appendChild(blur);

    const colorMatrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
    colorMatrix.setAttribute('in', 'blur');
    colorMatrix.setAttribute('mode', 'matrix');
    colorMatrix.setAttribute('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7');
    colorMatrix.setAttribute('result', 'goo');
    filter.appendChild(colorMatrix);

    const composite = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
    composite.setAttribute('in', 'SourceGraphic');
    composite.setAttribute('in2', 'goo');
    composite.setAttribute('operator', 'atop');
    filter.appendChild(composite);

    return filter;
  }

  /**
   * Get current values
   */
  getX(): number {
    return this.currentX;
  }

  getY(): number {
    return this.currentY;
  }

  getRadius(): number {
    return this.currentRadius;
  }

  getOpacity(): number {
    return this.currentOpacity;
  }
}
