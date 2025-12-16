/**
 * Animation.state.test.ts - State machine tests for Animation lifecycle
 *
 * Tests animation state transitions:
 * - idle → entrance → hold → exit → waiting
 * - reset() returns to idle
 *
 * @vitest-environment node
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { Animation } from '../core/Animation';
import { BaseElement } from '../core/Element';
import { Track } from '../core/Track';

// Mock requestAnimationFrame and cancelAnimationFrame for node environment
globalThis.requestAnimationFrame = vi.fn((cb) => {
  return setTimeout(() => cb(Date.now()), 0) as unknown as number;
}) as typeof globalThis.requestAnimationFrame;

globalThis.cancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
}) as typeof globalThis.cancelAnimationFrame;

/**
 * Mock element for testing
 */
class MockElement extends BaseElement {
  public updateCount = 0;
  public lastElapsed = 0;

  constructor(id: string, duration: number = 1000) {
    super({ id });
    this.addTrack('opacity', new Track({
      from: 0,
      to: 1,
      duration
    }));
  }

  update(elapsed: number): void {
    this.updateCount++;
    this.lastElapsed = elapsed;
  }

  render(container: SVGElement | HTMLCanvasElement): void {
    // Mock render
  }

  toSVG(): SVGElement {
    // Mock SVG element creation for node environment
    return {
      setAttribute: vi.fn(),
      getAttribute: vi.fn(),
    } as any;
  }
}

let animations: Animation[] = [];

afterEach(() => {
  // Clean up all animations created during tests
  animations.forEach(animation => {
    animation.reset();
  });
  animations = [];

  // Clear all timers
  vi.clearAllTimers();

  // Force garbage collection if available (Node.js specific)
  const gc = (globalThis as Record<string, unknown>).gc;
  if (typeof gc === 'function') {
    gc();
  }
});

function createAnimation(config: { elements: BaseElement[] }): Animation {
  const animation = new Animation(config);
  animations.push(animation);
  return animation;
}

describe('Animation - State Machine', () => {
  it('initializes in idle state', () => {
    const element = new MockElement('test-1');
    const animation = createAnimation({ elements: [element] });

    expect(animation.getState()).toBe('idle');
  });

  it('transitions to entrance when entrance() called', () => {
    const element = new MockElement('test-1', 10);
    const animation = createAnimation({ elements: [element] });

    animation.entrance();
    expect(animation.getState()).toBe('entrance');
  });

  it('transitions to hold after entrance completes', async () => {
    const element = new MockElement('test-1', 10);
    const animation = createAnimation({ elements: [element] });

    await animation.entrance();

    expect(animation.getState()).toBe('hold');
  });

  it('transitions to exit when exit() called', async () => {
    const element = new MockElement('test-1', 10);
    const animation = createAnimation({ elements: [element] });

    await animation.entrance();

    animation.exit();
    expect(animation.getState()).toBe('exit');
  });

  it('transitions to waiting after exit completes', async () => {
    const element = new MockElement('test-1', 10);
    const animation = createAnimation({ elements: [element] });

    await animation.entrance();
    await animation.exit();

    expect(animation.getState()).toBe('waiting');
  });

  it('resets to idle when reset() called', async () => {
    const element = new MockElement('test-1', 10);
    const animation = createAnimation({ elements: [element] });

    await animation.entrance();
    animation.reset();

    expect(animation.getState()).toBe('idle');
  });
});
