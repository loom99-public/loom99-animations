/**
 * ParticleElement - Animated particle for particle effects
 * Used for animations where points coalesce/scatter
 */

import { BaseElement } from '../core/Element';
import type { ElementConfig } from '../core/Element';
import { Track } from '../core/Track';

export interface ParticleElementConfig extends ElementConfig {
  x: number;
  y: number;
  size?: number;
  color?: string;
  glowRadius?: number;
}

/**
 * ParticleElement - A single animated particle
 */
export class ParticleElement extends BaseElement {
  private x: number;
  private y: number;
  private size: number;
  private color: string;
  private glowRadius: number;

  // Current animated values
  private currentX: number;
  private currentY: number;
  private currentOpacity: number = 1;
  private currentSize: number;

  constructor(config: ParticleElementConfig) {
    super(config);
    this.x = config.x;
    this.y = config.y;
    this.size = config.size || 2.5;
    this.color = config.color || '#00d4ff';
    this.glowRadius = config.glowRadius || 8;

    this.currentX = this.x;
    this.currentY = this.y;
    this.currentSize = this.size;
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
    if (values.size !== undefined) {
      this.currentSize = values.size;
    }
  }

  /**
   * Draw particle to canvas context
   */
  drawToCanvas(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.currentOpacity;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = this.glowRadius;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.currentX, this.currentY, this.currentSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Render element to container
   */
  render(container: SVGElement | HTMLCanvasElement): void {
    if (container instanceof HTMLCanvasElement) {
      const ctx = container.getContext('2d');
      if (ctx) {
        this.drawToCanvas(ctx);
      }
    }
  }

  /**
   * Convert to SVG element (circle with animations)
   */
  toSVG(): SVGElement {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('id', this.id);
    circle.setAttribute('cx', String(this.currentX));
    circle.setAttribute('cy', String(this.currentY));
    circle.setAttribute('r', String(this.currentSize));
    circle.setAttribute('fill', this.color);

    // Add glow filter reference if applicable
    if (this.glowRadius > 0) {
      circle.setAttribute('filter', 'url(#glow)');
    }

    // Add SMIL animations for position
    const xTrack = this.trackGroup.get<number>('x');
    const yTrack = this.trackGroup.get<number>('y');
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
   * Add entrance animation - particles fly from random positions to target
   */
  addEntranceFromExplosion(
    centerX: number,
    centerY: number,
    duration: number,
    delay: number = 0,
    easing: string = 'easeOutCubic'
  ): void {
    // Random start position (explosion from center)
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 400 + 200;
    const startX = centerX + Math.cos(angle) * distance;
    const startY = centerY + Math.sin(angle) * distance;

    // Track X position
    this.addTrack(
      'x',
      new Track({
        from: startX,
        to: this.x,
        duration,
        delay,
        easing,
      })
    );

    // Track Y position
    this.addTrack(
      'y',
      new Track({
        from: startY,
        to: this.y,
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

    // Set initial values
    this.currentX = startX;
    this.currentY = startY;
    this.currentOpacity = 0;
  }

  /**
   * Add exit animation - particles scatter outward
   */
  addExitScatter(
    duration: number,
    delay: number = 0,
    easing: string = 'easeInCubic'
  ): void {
    // Random exit direction
    const exitAngle = Math.random() * Math.PI * 2;
    const exitDistance = Math.random() * 300 + 200;
    const exitX = this.x + Math.cos(exitAngle) * exitDistance;
    const exitY = this.y + Math.sin(exitAngle) * exitDistance;

    // Track X position
    this.addTrack(
      'x',
      new Track({
        from: this.x,
        to: exitX,
        duration,
        delay,
        easing,
      })
    );

    // Track Y position
    this.addTrack(
      'y',
      new Track({
        from: this.y,
        to: exitY,
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
   * Get current x position
   */
  getX(): number {
    return this.currentX;
  }

  /**
   * Get current y position
   */
  getY(): number {
    return this.currentY;
  }

  /**
   * Get current opacity
   */
  getOpacity(): number {
    return this.currentOpacity;
  }

  /**
   * Get current size
   */
  getSize(): number {
    return this.currentSize;
  }
}
