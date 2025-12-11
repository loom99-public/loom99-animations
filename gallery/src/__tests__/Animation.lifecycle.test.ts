/**
 * Animation.lifecycle.test.ts - Lifecycle execution tests for Animation
 *
 * Tests entrance, hold, exit, and callback execution:
 * - Element updates during entrance/exit
 * - Callback triggering
 * - Full play sequence
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { Animation } from '../core/Animation';
import { BaseElement } from '../core/Element';
import { Track } from '../core/Track';

// Mock requestAnimationFrame and cancelAnimationFrame for node environment
global.requestAnimationFrame = vi.fn((cb) => {
  return setTimeout(() => cb(Date.now()), 0) as any;
});

global.cancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id as any);
});

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
  vi.useRealTimers();

  // Force garbage collection if available
  if (global.gc) global.gc();
});

function createAnimation(config: { elements: BaseElement[], onEntranceComplete?: () => void, onExitComplete?: () => void }): Animation {
  const animation = new Animation(config);
  animations.push(animation);
  return animation;
}

describe('Animation - Lifecycle Execution', () => {
  it('calls update on elements during entrance', async () => {
    const element = new MockElement('test-1', 10);
    const animation = createAnimation({ elements: [element] });

    await animation.entrance();

    expect(element.updateCount).toBeGreaterThan(0);
  });

  it('entrance completes when all elements complete', async () => {
    const element1 = new MockElement('test-1', 10);
    const element2 = new MockElement('test-2', 20);
    const animation = createAnimation({ elements: [element1, element2] });

    await animation.entrance();

    expect(animation.getState()).toBe('hold');
    expect(element1.isComplete(element1.lastElapsed)).toBe(true);
    expect(element2.isComplete(element2.lastElapsed)).toBe(true);
  });

  it('hold waits for specified duration', async () => {
    const animation = createAnimation({ elements: [] });

    const startTime = Date.now();
    await animation.hold(50);
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeGreaterThanOrEqual(45); // Allow timing variance
  });

  it('play executes full sequence: entrance → hold → exit', async () => {
    const element = new MockElement('test-1', 10);
    const animation = createAnimation({ elements: [element] });

    await animation.play(10);

    expect(animation.getState()).toBe('waiting');
  });
});

describe('Animation - Callback Execution', () => {
  it('calls onEntranceComplete when entrance finishes', async () => {
    const onEntranceComplete = vi.fn();
    const element = new MockElement('test-1', 10);
    const animation = createAnimation({
      elements: [element],
      onEntranceComplete
    });

    await animation.entrance();

    expect(onEntranceComplete).toHaveBeenCalledOnce();
  });

  it('calls onExitComplete when exit finishes', async () => {
    const onExitComplete = vi.fn();
    const element = new MockElement('test-1', 10);
    const animation = createAnimation({
      elements: [element],
      onExitComplete
    });

    await animation.entrance();
    await animation.exit();

    expect(onExitComplete).toHaveBeenCalledOnce();
  });

  it('does not call callbacks if reset during animation', async () => {
    // Use fake timers for this test to have better control
    vi.useFakeTimers();

    const onEntranceComplete = vi.fn();
    const element = new MockElement('test-1', 1000); // Long duration
    const animation = createAnimation({
      elements: [element],
      onEntranceComplete
    });

    // Start entrance but don't await
    const entrancePromise = animation.entrance();

    // Advance time slightly but not enough to complete
    vi.advanceTimersByTime(100);

    // Reset before completion
    animation.reset();

    // Advance time past when it would have completed
    vi.advanceTimersByTime(2000);

    // Callback should not have been called
    expect(onEntranceComplete).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
