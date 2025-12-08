/**
 * TransformElement - Element with CSS transform animations
 * Used for 3D rotations, perspective effects, and complex transforms
 */

import { BaseElement } from '../core/Element';
import type { ElementConfig } from '../core/Element';
import { Track } from '../core/Track';

export interface TransformElementConfig extends ElementConfig {
  content: SVGElement | HTMLElement;
  perspective?: number;
  transformOrigin?: string;
}

/**
 * TransformElement - Wraps content with CSS transform animations
 */
export class TransformElement extends BaseElement {
  private content: SVGElement | HTMLElement;
  private perspective: number;
  private transformOrigin: string;
  private wrapper: HTMLDivElement | SVGGElement | null = null;

  // Current animated values
  private currentRotateX: number = 0;
  private currentRotateY: number = 0;
  private currentRotateZ: number = 0;
  private currentScaleX: number = 1;
  private currentScaleY: number = 1;
  private currentTranslateX: number = 0;
  private currentTranslateY: number = 0;
  private currentTranslateZ: number = 0;
  private currentOpacity: number = 1;

  constructor(config: TransformElementConfig) {
    super(config);
    this.content = config.content;
    this.perspective = config.perspective || 1000;
    this.transformOrigin = config.transformOrigin || 'center center';
  }

  /**
   * Update element state at given time
   */
  update(elapsed: number): void {
    const values = this.getTrackValues(elapsed);

    if (values.rotateX !== undefined) this.currentRotateX = values.rotateX;
    if (values.rotateY !== undefined) this.currentRotateY = values.rotateY;
    if (values.rotateZ !== undefined) this.currentRotateZ = values.rotateZ;
    if (values.scaleX !== undefined) this.currentScaleX = values.scaleX;
    if (values.scaleY !== undefined) this.currentScaleY = values.scaleY;
    if (values.translateX !== undefined) this.currentTranslateX = values.translateX;
    if (values.translateY !== undefined) this.currentTranslateY = values.translateY;
    if (values.translateZ !== undefined) this.currentTranslateZ = values.translateZ;
    if (values.opacity !== undefined) this.currentOpacity = values.opacity;

    this.applyTransform();
  }

  /**
   * Apply current transform values to wrapper
   */
  private applyTransform(): void {
    if (!this.wrapper) return;

    const transform = this.buildTransformString();

    if (this.wrapper instanceof HTMLElement) {
      this.wrapper.style.transform = transform;
      this.wrapper.style.opacity = String(this.currentOpacity);
    } else {
      this.wrapper.setAttribute('transform', this.buildSVGTransform());
      this.wrapper.setAttribute('opacity', String(this.currentOpacity));
    }
  }

  /**
   * Build CSS transform string for 3D transforms
   */
  private buildTransformString(): string {
    const parts: string[] = [];

    if (this.currentTranslateX !== 0 || this.currentTranslateY !== 0 || this.currentTranslateZ !== 0) {
      parts.push(`translate3d(${this.currentTranslateX}px, ${this.currentTranslateY}px, ${this.currentTranslateZ}px)`);
    }

    if (this.currentRotateX !== 0) {
      parts.push(`rotateX(${this.currentRotateX}deg)`);
    }
    if (this.currentRotateY !== 0) {
      parts.push(`rotateY(${this.currentRotateY}deg)`);
    }
    if (this.currentRotateZ !== 0) {
      parts.push(`rotateZ(${this.currentRotateZ}deg)`);
    }

    if (this.currentScaleX !== 1 || this.currentScaleY !== 1) {
      parts.push(`scale(${this.currentScaleX}, ${this.currentScaleY})`);
    }

    return parts.length > 0 ? parts.join(' ') : 'none';
  }

  /**
   * Build SVG transform string (limited to 2D)
   */
  private buildSVGTransform(): string {
    const parts: string[] = [];

    if (this.currentTranslateX !== 0 || this.currentTranslateY !== 0) {
      parts.push(`translate(${this.currentTranslateX}, ${this.currentTranslateY})`);
    }

    if (this.currentRotateZ !== 0) {
      parts.push(`rotate(${this.currentRotateZ})`);
    }

    if (this.currentScaleX !== 1 || this.currentScaleY !== 1) {
      parts.push(`scale(${this.currentScaleX}, ${this.currentScaleY})`);
    }

    return parts.join(' ');
  }

  /**
   * Render element to container
   */
  render(container: SVGElement | HTMLCanvasElement): void {
    if (container instanceof SVGElement) {
      // Create SVG group wrapper
      this.wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      this.wrapper.setAttribute('id', this.id);
      this.wrapper.appendChild(this.content);
      container.appendChild(this.wrapper);
    } else if (container instanceof HTMLElement) {
      // Create HTML div wrapper with perspective
      this.wrapper = document.createElement('div');
      this.wrapper.id = this.id;
      this.wrapper.style.perspective = `${this.perspective}px`;
      this.wrapper.style.transformOrigin = this.transformOrigin;
      this.wrapper.style.transformStyle = 'preserve-3d';

      if (this.content instanceof HTMLElement) {
        this.wrapper.appendChild(this.content);
      }
      container.appendChild(this.wrapper);
    }

    this.applyTransform();
  }

  /**
   * Convert to SVG element (2D only, 3D requires CSS)
   */
  toSVG(): SVGElement {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', this.id);

    // Clone content
    if (this.content instanceof SVGElement) {
      g.appendChild(this.content.cloneNode(true));
    }

    // Add basic animations (limited to 2D for SVG)
    const rotateZTrack = this.trackGroup.get<number>('rotateZ');
    const translateXTrack = this.trackGroup.get<number>('translateX');
    const translateYTrack = this.trackGroup.get<number>('translateY');

    if (rotateZTrack) {
      const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
      animate.setAttribute('attributeName', 'transform');
      animate.setAttribute('type', 'rotate');
      animate.setAttribute('from', String(rotateZTrack.from));
      animate.setAttribute('to', String(rotateZTrack.to));
      animate.setAttribute('dur', `${rotateZTrack.duration}ms`);
      if (rotateZTrack.delay > 0) {
        animate.setAttribute('begin', `${rotateZTrack.delay}ms`);
      }
      animate.setAttribute('fill', 'freeze');
      g.appendChild(animate);
    }

    if (translateXTrack || translateYTrack) {
      const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
      animate.setAttribute('attributeName', 'transform');
      animate.setAttribute('type', 'translate');
      const fromX = translateXTrack?.from ?? 0;
      const fromY = translateYTrack?.from ?? 0;
      const toX = translateXTrack?.to ?? 0;
      const toY = translateYTrack?.to ?? 0;
      animate.setAttribute('from', `${fromX} ${fromY}`);
      animate.setAttribute('to', `${toX} ${toY}`);
      const duration = Math.max(translateXTrack?.duration ?? 0, translateYTrack?.duration ?? 0);
      animate.setAttribute('dur', `${duration}ms`);
      const delay = Math.min(translateXTrack?.delay ?? 0, translateYTrack?.delay ?? 0);
      if (delay > 0) {
        animate.setAttribute('begin', `${delay}ms`);
      }
      animate.setAttribute('fill', 'freeze');
      animate.setAttribute('additive', 'sum');
      g.appendChild(animate);
    }

    return g;
  }

  /**
   * Add flip entrance animation (3D rotation)
   */
  addFlipEntrance(
    axis: 'X' | 'Y',
    duration: number,
    delay: number = 0,
    easing: string = 'easeOutBack'
  ): void {
    const trackName = axis === 'X' ? 'rotateX' : 'rotateY';
    const startAngle = axis === 'X' ? -90 : 90;

    this.addTrack(
      trackName,
      new Track({
        from: startAngle,
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

    if (axis === 'X') {
      this.currentRotateX = startAngle;
    } else {
      this.currentRotateY = startAngle;
    }
    this.currentOpacity = 0;
  }

  /**
   * Add zoom entrance animation
   */
  addZoomEntrance(
    startScale: number,
    duration: number,
    delay: number = 0,
    easing: string = 'easeOutBack'
  ): void {
    this.addTrack(
      'scaleX',
      new Track({
        from: startScale,
        to: 1,
        duration,
        delay,
        easing,
      })
    );

    this.addTrack(
      'scaleY',
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

    this.currentScaleX = startScale;
    this.currentScaleY = startScale;
    this.currentOpacity = 0;
  }

  /**
   * Add slide entrance animation
   */
  addSlideEntrance(
    direction: 'left' | 'right' | 'up' | 'down',
    distance: number,
    duration: number,
    delay: number = 0,
    easing: string = 'easeOutCubic'
  ): void {
    let trackName: 'translateX' | 'translateY';
    let startValue: number;

    switch (direction) {
      case 'left':
        trackName = 'translateX';
        startValue = distance;
        break;
      case 'right':
        trackName = 'translateX';
        startValue = -distance;
        break;
      case 'up':
        trackName = 'translateY';
        startValue = distance;
        break;
      case 'down':
        trackName = 'translateY';
        startValue = -distance;
        break;
    }

    this.addTrack(
      trackName,
      new Track({
        from: startValue,
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

    if (trackName === 'translateX') {
      this.currentTranslateX = startValue;
    } else {
      this.currentTranslateY = startValue;
    }
    this.currentOpacity = 0;
  }

  /**
   * Add spin animation (continuous or single)
   */
  addSpin(
    degrees: number,
    duration: number,
    delay: number = 0,
    easing: string = 'linear'
  ): void {
    this.addTrack(
      'rotateZ',
      new Track({
        from: 0,
        to: degrees,
        duration,
        delay,
        easing,
      })
    );
  }
}
