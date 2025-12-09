/**
 * KineticElement - Kinetic "fly-in" animation element
 * Uses TransformCompositor for transform-based animations
 *
 * Reference: animations/logo/logo-06-kinetic.html
 *
 * Elements fly in from off-screen with rotation and scale effects,
 * creating dynamic kinetic animations.
 */

import { BaseElement } from '../core/Element';
import type { ElementConfig } from '../core/Element';
import { Track } from '../core/Track';
import { TransformCompositor, type TransformState } from '../compositors/TransformCompositor';

export interface KineticElementConfig extends ElementConfig {
  /** Base SVG element to animate (path, circle, rect, etc.) */
  svgElement: SVGElement;

  /** Starting transform state (typically off-screen) */
  fromTransform: TransformState;

  /** Ending transform state (final position) */
  toTransform: TransformState;

  /** Transform origin for rotation/scale (default: element center) */
  transformOrigin?: { x: number; y: number };

  /** Animation easing function (default: easeOutBack) */
  easing?: string;
}

/**
 * KineticElement - SVG element with kinetic transform animations
 *
 * Animation phases:
 * 1. Entrance: Element flies in from off-screen with rotation/scale
 * 2. Hold: Element remains in final position
 * 3. Exit: Element flies away (optional)
 */
export class KineticElement extends BaseElement {
  private svgTemplate: SVGElement;
  private fromTransform: TransformState;
  private toTransform: TransformState;
  private transformOrigin: { x: number; y: number };
  private compositor: TransformCompositor;
  private renderedElement: SVGElement | null = null;

  // Current animated values
  private currentTransformProgress: number = 0;
  private currentOpacity: number = 1;

  constructor(config: KineticElementConfig) {
    super(config);

    this.svgTemplate = config.svgElement.cloneNode(true) as SVGElement;
    this.fromTransform = config.fromTransform;
    this.toTransform = config.toTransform;

    // Calculate transform origin from element bounding box if not specified
    if (config.transformOrigin) {
      this.transformOrigin = config.transformOrigin;
    } else {
      const bbox = this.svgTemplate.getBBox();
      this.transformOrigin = {
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2,
      };
    }

    // Create compositor for transform interpolation
    this.compositor = new TransformCompositor({
      from: this.fromTransform,
      to: this.toTransform,
      easing: config.easing || 'easeOutBack',
    });
  }

  /**
   * Update element state at given time
   */
  update(elapsed: number): void {
    const values = this.getTrackValues(elapsed);

    // Update transform progress
    if (values.transformProgress !== undefined) {
      this.currentTransformProgress = values.transformProgress;
    }

    // Update opacity
    if (values.opacity !== undefined) {
      this.currentOpacity = values.opacity;
    }

    // Update DOM if element is rendered
    if (this.renderedElement) {
      const transformString = this.compositor.update(this.currentTransformProgress);
      this.renderedElement.style.transform = transformString;
      this.renderedElement.style.transformOrigin = `${this.transformOrigin.x}px ${this.transformOrigin.y}px`;
      this.renderedElement.style.opacity = String(this.currentOpacity);
    }
  }

  /**
   * Render element to SVG container
   */
  render(container: SVGElement): void {
    if (!(container instanceof SVGElement)) {
      throw new Error('KineticElement can only render to SVG containers');
    }

    this.renderedElement = this.svgTemplate.cloneNode(true) as SVGElement;
    this.renderedElement.setAttribute('id', this.id);

    // Apply initial transform
    const transformString = this.compositor.update(this.currentTransformProgress);
    this.renderedElement.style.transform = transformString;
    this.renderedElement.style.transformOrigin = `${this.transformOrigin.x}px ${this.transformOrigin.y}px`;
    this.renderedElement.style.opacity = String(this.currentOpacity);

    container.appendChild(this.renderedElement);
  }

  /**
   * Convert to static SVG element with SMIL animations
   */
  toSVG(): SVGElement {
    const element = this.svgTemplate.cloneNode(true) as SVGElement;
    element.setAttribute('id', this.id);

    // Set transform origin
    const originX = this.transformOrigin.x;
    const originY = this.transformOrigin.y;

    // Add SMIL animations for transforms
    const transformTrack = this.trackGroup.get<number>('transformProgress');
    if (transformTrack) {
      const delay = transformTrack.getDelay();
      const duration = transformTrack.getDuration();

      // Get SMIL animations from compositor
      const smilAnimations = this.compositor.toSMIL();

      smilAnimations.forEach((smilString) => {
        const animateTransform = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');

        // Parse SMIL string and apply attributes
        this.applySMILAttributes(animateTransform, smilString);

        // Add timing from track
        animateTransform.setAttribute('begin', `${delay}ms`);
        animateTransform.setAttribute('dur', `${duration}ms`);

        // For rotate transforms, add transform origin
        if (smilString.includes('type="rotate"')) {
          // Rotate needs origin as third value: "angle cx cy"
          const values = animateTransform.getAttribute('values');
          if (values) {
            const valuesList = values.split(';').map(v => `${v} ${originX} ${originY}`);
            animateTransform.setAttribute('values', valuesList.join(';'));
          }
        }

        element.appendChild(animateTransform);
      });
    }

    // Add opacity animation if present
    const opacityTrack = this.trackGroup.get<number>('opacity');
    if (opacityTrack) {
      const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animate.setAttribute('attributeName', 'opacity');
      const smil = opacityTrack.toSMIL('opacity');
      this.applySMILAttributes(animate, smil);
      element.appendChild(animate);
    }

    return element;
  }

  /**
   * Parse SMIL string and apply to element
   */
  private applySMILAttributes(element: SVGAnimateElement | SVGAnimateTransformElement, smil: string): void {
    // Simple parser for SMIL attributes
    const matches = smil.matchAll(/(\w+)="([^"]+)"/g);
    for (const match of matches) {
      const [, attr, value] = match;
      element.setAttribute(attr, value);
    }
  }

  /**
   * Add entrance animation (fly-in with transform)
   */
  addEntranceAnimation(duration: number, delay: number = 0): void {
    // Create track from 0 (start transform) to 1 (end transform)
    const track = new Track({
      from: 0,
      to: 1,
      duration,
      delay,
      easing: 'easeOutBack',
    });

    this.addTrack('transformProgress', track);
    this.currentTransformProgress = 0;
  }

  /**
   * Add exit animation (fly-out with transform)
   */
  addExitAnimation(duration: number, delay: number = 0): void {
    // Create track from 1 (current position) to 0 (off-screen)
    const track = new Track({
      from: 1,
      to: 0,
      duration,
      delay,
      easing: 'easeInCubic',
    });

    this.addTrack('transformProgress', track);
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
