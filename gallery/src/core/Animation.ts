/**
 * Animation - Orchestrates elements and their lifecycles
 */

import { BaseElement } from './Element';

export interface AnimationConfig {
  elements: BaseElement[];
  onEntranceComplete?: () => void;
  onExitComplete?: () => void;
}

export type AnimationState = 'idle' | 'entrance' | 'hold' | 'exit' | 'waiting';

/**
 * Animation manages the lifecycle of animated elements
 */
export class Animation {
  private elements: BaseElement[];
  private state: AnimationState = 'idle';
  private startTime: number = 0;
  private animationFrame: number | null = null;
  private onEntranceComplete?: () => void;
  private onExitComplete?: () => void;

  constructor(config: AnimationConfig) {
    this.elements = config.elements;
    this.onEntranceComplete = config.onEntranceComplete;
    this.onExitComplete = config.onExitComplete;
  }

  /**
   * Start entrance animation
   */
  entrance(): Promise<void> {
    return new Promise((resolve) => {
      this.state = 'entrance';
      this.startTime = performance.now();

      const animate = (timestamp: number) => {
        const elapsed = timestamp - this.startTime;

        // Update all elements
        this.elements.forEach((el) => el.update(elapsed));

        // Check if all elements are complete
        const allComplete = this.elements.every((el) => el.isComplete(elapsed));

        if (allComplete) {
          this.state = 'hold';
          if (this.onEntranceComplete) {
            this.onEntranceComplete();
          }
          resolve();
        } else {
          this.animationFrame = requestAnimationFrame(animate);
        }
      };

      this.animationFrame = requestAnimationFrame(animate);
    });
  }

  /**
   * Start exit animation
   */
  exit(): Promise<void> {
    return new Promise((resolve) => {
      this.state = 'exit';
      this.startTime = performance.now();

      const animate = (timestamp: number) => {
        const elapsed = timestamp - this.startTime;

        // Update all elements
        this.elements.forEach((el) => el.update(elapsed));

        // Check if all elements are complete
        const allComplete = this.elements.every((el) => el.isComplete(elapsed));

        if (allComplete) {
          this.state = 'waiting';
          if (this.onExitComplete) {
            this.onExitComplete();
          }
          resolve();
        } else {
          this.animationFrame = requestAnimationFrame(animate);
        }
      };

      this.animationFrame = requestAnimationFrame(animate);
    });
  }

  /**
   * Reset animation to initial state
   */
  reset(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.state = 'idle';
    this.startTime = 0;
  }

  /**
   * Get current state
   */
  getState(): AnimationState {
    return this.state;
  }

  /**
   * Play full animation sequence: entrance -> hold -> exit
   */
  async play(holdDuration: number = 2000): Promise<void> {
    await this.entrance();
    await this.hold(holdDuration);
    await this.exit();
  }

  /**
   * Hold state for specified duration
   */
  hold(duration: number): Promise<void> {
    return new Promise((resolve) => {
      this.state = 'hold';
      setTimeout(() => {
        resolve();
      }, duration);
    });
  }

  /**
   * Generate complete SVG with all elements and animations
   */
  toSVG(): string {
    const svgElements = this.elements.map((el) => el.toSVGString());

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  ${svgElements.join('\n  ')}
</svg>`;
  }

  /**
   * Export animation as downloadable SVG file
   */
  exportSVG(): Blob {
    const svgString = this.toSVG();
    return new Blob([svgString], { type: 'image/svg+xml' });
  }

  /**
   * Get all elements
   */
  getElements(): BaseElement[] {
    return this.elements;
  }

  /**
   * Update all elements at a specific elapsed time
   * Used for scrubbing/seeking through animation
   */
  seek(elapsed: number): void {
    this.elements.forEach((el) => el.update(elapsed));
  }

  /**
   * Get total duration of entrance animation
   * Returns the max end time across all elements
   */
  getEntranceDuration(): number {
    let maxDuration = 0;
    for (const element of this.elements) {
      const duration = element.getDuration();
      if (duration > maxDuration) {
        maxDuration = duration;
      }
    }
    return maxDuration;
  }
}
