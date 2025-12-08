/**
 * TextElement - Animated text/character element
 * Used for kinetic typography, typewriter, and text transform animations
 */

import { BaseElement } from '../core/Element';
import type { ElementConfig } from '../core/Element';
import { Track } from '../core/Track';

export interface TextElementConfig extends ElementConfig {
  text: string;
  x: number;
  y: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fill?: string;
  textAnchor?: 'start' | 'middle' | 'end';
}

/**
 * TextElement - A single animated text element
 */
export class TextElement extends BaseElement {
  private text: string;
  private x: number;
  private y: number;
  private fontSize: number;
  private fontFamily: string;
  private fontWeight: string | number;
  private fill: string;
  private textAnchor: 'start' | 'middle' | 'end';
  private svgElement: SVGTextElement | null = null;

  // Current animated values
  private currentX: number;
  private currentY: number;
  private currentOpacity: number = 1;
  private currentRotation: number = 0;
  private currentScale: number = 1;
  private currentTranslateX: number = 0;
  private currentTranslateY: number = 0;

  constructor(config: TextElementConfig) {
    super(config);
    this.text = config.text;
    this.x = config.x;
    this.y = config.y;
    this.fontSize = config.fontSize || 48;
    this.fontFamily = config.fontFamily || 'sans-serif';
    this.fontWeight = config.fontWeight || 700;
    this.fill = config.fill || '#ffffff';
    this.textAnchor = config.textAnchor || 'start';

    this.currentX = this.x;
    this.currentY = this.y;
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
    if (values.opacity !== undefined) {
      this.currentOpacity = values.opacity;
    }
    if (values.rotation !== undefined) {
      this.currentRotation = values.rotation;
    }
    if (values.scale !== undefined) {
      this.currentScale = values.scale;
    }
    if (values.translateX !== undefined) {
      this.currentTranslateX = values.translateX;
    }
    if (values.translateY !== undefined) {
      this.currentTranslateY = values.translateY;
    }

    // Update DOM if element is rendered
    if (this.svgElement) {
      const transform = this.buildTransform();
      this.svgElement.setAttribute('transform', transform);
      this.svgElement.setAttribute('opacity', String(this.currentOpacity));
    }
  }

  /**
   * Build transform string
   */
  private buildTransform(): string {
    const parts: string[] = [];

    // Translate to position
    parts.push(`translate(${this.currentX + this.currentTranslateX}, ${this.currentY + this.currentTranslateY})`);

    // Rotate around center
    if (this.currentRotation !== 0) {
      parts.push(`rotate(${this.currentRotation})`);
    }

    // Scale from center
    if (this.currentScale !== 1) {
      parts.push(`scale(${this.currentScale})`);
    }

    return parts.join(' ');
  }

  /**
   * Render element to SVG container
   */
  render(container: SVGElement | HTMLCanvasElement): void {
    if (!(container instanceof SVGElement)) {
      throw new Error('TextElement can only render to SVG containers');
    }

    this.svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    this.svgElement.setAttribute('id', this.id);
    this.svgElement.setAttribute('font-size', String(this.fontSize));
    this.svgElement.setAttribute('font-family', this.fontFamily);
    this.svgElement.setAttribute('font-weight', String(this.fontWeight));
    this.svgElement.setAttribute('fill', this.fill);
    this.svgElement.setAttribute('text-anchor', this.textAnchor);
    this.svgElement.setAttribute('dominant-baseline', 'middle');
    this.svgElement.textContent = this.text;

    const transform = this.buildTransform();
    this.svgElement.setAttribute('transform', transform);
    this.svgElement.setAttribute('opacity', String(this.currentOpacity));

    container.appendChild(this.svgElement);
  }

  /**
   * Convert to SVG element
   */
  toSVG(): SVGElement {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('id', this.id);
    text.setAttribute('x', String(this.x));
    text.setAttribute('y', String(this.y));
    text.setAttribute('font-size', String(this.fontSize));
    text.setAttribute('font-family', this.fontFamily);
    text.setAttribute('font-weight', String(this.fontWeight));
    text.setAttribute('fill', this.fill);
    text.setAttribute('text-anchor', this.textAnchor);
    text.setAttribute('dominant-baseline', 'middle');
    text.textContent = this.text;

    // Add SMIL animations
    const opacityTrack = this.trackGroup.get<number>('opacity');
    const translateYTrack = this.trackGroup.get<number>('translateY');

    if (opacityTrack) {
      const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      this.applySMILFromTrack(animate, opacityTrack, 'opacity');
      text.appendChild(animate);
    }

    // Note: Complex transforms would need animateTransform
    if (translateYTrack) {
      const animateTransform = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
      animateTransform.setAttribute('attributeName', 'transform');
      animateTransform.setAttribute('type', 'translate');
      animateTransform.setAttribute('from', `${this.x} ${translateYTrack.from}`);
      animateTransform.setAttribute('to', `${this.x} ${this.y}`);
      animateTransform.setAttribute('dur', `${translateYTrack.duration}ms`);
      if (translateYTrack.delay > 0) {
        animateTransform.setAttribute('begin', `${translateYTrack.delay}ms`);
      }
      animateTransform.setAttribute('fill', 'freeze');
      text.appendChild(animateTransform);
    }

    return text;
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
   * Add typewriter entrance animation
   */
  addTypewriterEntrance(duration: number, delay: number = 0): void {
    // Fade in
    this.addTrack(
      'opacity',
      new Track({
        from: 0,
        to: 1,
        duration: duration * 0.1,
        delay,
        easing: 'linear',
      })
    );

    this.currentOpacity = 0;
  }

  /**
   * Add bounce entrance animation
   */
  addBounceEntrance(
    startY: number,
    duration: number,
    delay: number = 0,
    easing: string = 'easeOutBounce'
  ): void {
    // Drop from above
    this.addTrack(
      'translateY',
      new Track({
        from: startY - this.y,
        to: 0,
        duration,
        delay,
        easing,
      })
    );

    // Fade in
    this.addTrack(
      'opacity',
      new Track({
        from: 0,
        to: 1,
        duration: duration * 0.5,
        delay,
        easing: 'easeOutCubic',
      })
    );

    this.currentTranslateY = startY - this.y;
    this.currentOpacity = 0;
  }

  /**
   * Add rotation entrance animation
   */
  addRotationEntrance(
    startRotation: number,
    duration: number,
    delay: number = 0,
    easing: string = 'easeOutBack'
  ): void {
    this.addTrack(
      'rotation',
      new Track({
        from: startRotation,
        to: 0,
        duration,
        delay,
        easing,
      })
    );

    this.addTrack(
      'opacity',
      new Track({
        from: 0,
        to: 1,
        duration: duration * 0.5,
        delay,
        easing: 'easeOutCubic',
      })
    );

    this.currentRotation = startRotation;
    this.currentOpacity = 0;
  }

  /**
   * Add scale entrance animation
   */
  addScaleEntrance(
    startScale: number,
    duration: number,
    delay: number = 0,
    easing: string = 'easeOutBack'
  ): void {
    this.addTrack(
      'scale',
      new Track({
        from: startScale,
        to: 1,
        duration,
        delay,
        easing,
      })
    );

    this.addTrack(
      'opacity',
      new Track({
        from: 0,
        to: 1,
        duration: duration * 0.5,
        delay,
        easing: 'easeOutCubic',
      })
    );

    this.currentScale = startScale;
    this.currentOpacity = 0;
  }

  /**
   * Add fade out animation
   */
  addFadeOut(duration: number, delay: number = 0, easing: string = 'easeInCubic'): void {
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
   * Get current text
   */
  getText(): string {
    return this.text;
  }

  /**
   * Update text content
   */
  setText(text: string): void {
    this.text = text;
    if (this.svgElement) {
      this.svgElement.textContent = text;
    }
  }
}
