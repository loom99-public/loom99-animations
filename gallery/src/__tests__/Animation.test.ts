/**
 * Animation.test.ts - Integration tests for Animation lifecycle
 *
 * FUNCTIONAL TESTING APPROACH:
 * - Tests real animation state machine behavior
 * - Validates lifecycle: idle → entrance → hold → exit → waiting
 * - Verifies no infinite loops (critical safety requirement)
 * - Tests with real Track/Element integration
 * - Uses real timing for integration tests (not mocked RAF)
 *
 * NOTE: These are TRUE integration tests - they test real behavior
 * without mocking the core animation loop. Tests will take real time to run.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Animation } from '../core/Animation';
import { BaseElement } from '../core/Element';
import { Track } from '../core/Track';

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
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('id', this.id);
    return rect;
  }
}

describe('Animation - State Machine', () => {
  it('initializes in idle state', () => {
    const element = new MockElement('test-1');
    const animation = new Animation({ elements: [element] });

    expect(animation.getState()).toBe('idle');
  });

  it('transitions to entrance when entrance() called', () => {
    const element = new MockElement('test-1', 10);
    const animation = new Animation({ elements: [element] });

    animation.entrance();
    expect(animation.getState()).toBe('entrance');
  });

  it('transitions to hold after entrance completes', async () => {
    const element = new MockElement('test-1', 10);
    const animation = new Animation({ elements: [element] });

    await animation.entrance();

    expect(animation.getState()).toBe('hold');
  });

  it('transitions to exit when exit() called', async () => {
    const element = new MockElement('test-1', 10);
    const animation = new Animation({ elements: [element] });

    await animation.entrance();

    animation.exit();
    expect(animation.getState()).toBe('exit');
  });

  it('transitions to waiting after exit completes', async () => {
    const element = new MockElement('test-1', 10);
    const animation = new Animation({ elements: [element] });

    await animation.entrance();
    await animation.exit();

    expect(animation.getState()).toBe('waiting');
  });

  it('resets to idle when reset() called', async () => {
    const element = new MockElement('test-1', 10);
    const animation = new Animation({ elements: [element] });

    await animation.entrance();
    animation.reset();

    expect(animation.getState()).toBe('idle');
  });
});

describe('Animation - Lifecycle Execution', () => {
  it('calls update on elements during entrance', async () => {
    const element = new MockElement('test-1', 10);
    const animation = new Animation({ elements: [element] });

    await animation.entrance();

    expect(element.updateCount).toBeGreaterThan(0);
  });

  it('entrance completes when all elements complete', async () => {
    const element1 = new MockElement('test-1', 10);
    const element2 = new MockElement('test-2', 20);
    const animation = new Animation({ elements: [element1, element2] });

    await animation.entrance();

    expect(animation.getState()).toBe('hold');
    expect(element1.isComplete(element1.lastElapsed)).toBe(true);
    expect(element2.isComplete(element2.lastElapsed)).toBe(true);
  });

  it('hold waits for specified duration', async () => {
    const animation = new Animation({ elements: [] });

    const startTime = Date.now();
    await animation.hold(50);
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeGreaterThanOrEqual(45); // Allow timing variance
  });

  it('play executes full sequence: entrance → hold → exit', async () => {
    const element = new MockElement('test-1', 10);
    const animation = new Animation({ elements: [element] });

    await animation.play(10);

    expect(animation.getState()).toBe('waiting');
  });
});

describe('Animation - Callback Execution', () => {
  it('calls onEntranceComplete when entrance finishes', async () => {
    const onEntranceComplete = vi.fn();
    const element = new MockElement('test-1', 10);
    const animation = new Animation({
      elements: [element],
      onEntranceComplete
    });

    await animation.entrance();

    expect(onEntranceComplete).toHaveBeenCalledOnce();
  });

  it('calls onExitComplete when exit finishes', async () => {
    const onExitComplete = vi.fn();
    const element = new MockElement('test-1', 10);
    const animation = new Animation({
      elements: [element],
      onExitComplete
    });

    await animation.entrance();
    await animation.exit();

    expect(onExitComplete).toHaveBeenCalledOnce();
  });

  it('does not call callbacks if reset during animation', async () => {
    const onEntranceComplete = vi.fn();
    const element = new MockElement('test-1', 50);
    const animation = new Animation({
      elements: [element],
      onEntranceComplete
    });

    animation.entrance(); // Don't await
    await new Promise(resolve => setTimeout(resolve, 10));

    animation.reset();
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(onEntranceComplete).not.toHaveBeenCalled();
  });
});

describe('Animation - Multiple Elements', () => {
  it('updates all elements during animation', async () => {
    const elements = [
      new MockElement('test-1', 10),
      new MockElement('test-2', 10),
      new MockElement('test-3', 10)
    ];
    const animation = new Animation({ elements });

    await animation.entrance();

    elements.forEach(el => {
      expect(el.updateCount).toBeGreaterThan(0);
    });
  });

  it('waits for longest element to complete', async () => {
    const shortElement = new MockElement('short', 10);
    const longElement = new MockElement('long', 30);
    const animation = new Animation({ elements: [shortElement, longElement] });

    await animation.entrance();

    expect(shortElement.isComplete(shortElement.lastElapsed)).toBe(true);
    expect(longElement.isComplete(longElement.lastElapsed)).toBe(true);
  });

  it('handles elements with delays', async () => {
    const element1 = new MockElement('test-1', 10);
    element1.addTrack('delayed', new Track({
      from: 0,
      to: 100,
      duration: 10,
      delay: 10
    }));

    const animation = new Animation({ elements: [element1] });

    await animation.entrance();

    // Element should complete after duration + delay
    const totalDuration = element1.getDuration();
    expect(totalDuration).toBe(20); // 10ms delay + 10ms duration
  });

  it('handles empty elements array', async () => {
    const animation = new Animation({ elements: [] });

    await animation.entrance();
    expect(animation.getState()).toBe('hold');

    await animation.exit();
    expect(animation.getState()).toBe('waiting');
  });
});

describe('Animation - SVG Export', () => {
  it('generates SVG with all elements', () => {
    const elements = [
      new MockElement('rect-1', 500),
      new MockElement('rect-2', 500)
    ];
    const animation = new Animation({ elements });

    const svg = animation.toSVG();

    expect(svg).toContain('<svg');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox=');
    expect(svg).toContain('id="rect-1"');
    expect(svg).toContain('id="rect-2"');
  });

  it('exports as downloadable blob', () => {
    const element = new MockElement('test-1', 500);
    const animation = new Animation({ elements: [element] });

    const blob = animation.exportSVG();

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/svg+xml');
  });

  it('generates valid SVG that can be parsed', () => {
    const element = new MockElement('test-1', 500);
    const animation = new Animation({ elements: [element] });

    const svg = animation.toSVG();

    expect(() => {
      if (typeof DOMParser !== 'undefined') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, 'image/svg+xml');
        const errors = doc.getElementsByTagName('parsererror');
        expect(errors.length).toBe(0);
      }
    }).not.toThrow();
  });
});

describe('Animation - No Infinite Loops (Critical Safety)', () => {
  it('entrance completes and does not restart', async () => {
    const element = new MockElement('test-1', 10);
    const animation = new Animation({ elements: [element] });

    await animation.entrance();

    const updateCountAfterComplete = element.updateCount;
    expect(animation.getState()).toBe('hold');

    // Wait additional time - should NOT restart
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(animation.getState()).toBe('hold');
    // Update count should not increase after completion
    expect(element.updateCount).toBe(updateCountAfterComplete);
  });

  it('exit completes and does not restart', async () => {
    const element = new MockElement('test-1', 10);
    const animation = new Animation({ elements: [element] });

    await animation.entrance();
    await animation.exit();

    expect(animation.getState()).toBe('waiting');

    // Wait additional time - should NOT restart or change state
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(animation.getState()).toBe('waiting');
  });

  it('play sequence completes without looping', async () => {
    const element = new MockElement('test-1', 10);
    const animation = new Animation({ elements: [element] });

    await animation.play(10);

    expect(animation.getState()).toBe('waiting');

    // State should remain waiting, not loop back to entrance
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(animation.getState()).toBe('waiting');
  });

  it('cancels animation frame when reset', async () => {
    const element = new MockElement('test-1', 50);
    const animation = new Animation({ elements: [element] });

    animation.entrance(); // Don't await
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateCountBeforeReset = element.updateCount;
    animation.reset();

    await new Promise(resolve => setTimeout(resolve, 100));

    // Updates should stop after reset
    expect(element.updateCount).toBe(updateCountBeforeReset);
  });

  it('handles multiple reset calls safely', () => {
    const element = new MockElement('test-1', 1000);
    const animation = new Animation({ elements: [element] });

    expect(() => {
      animation.reset();
      animation.reset();
      animation.reset();
    }).not.toThrow();

    expect(animation.getState()).toBe('idle');
  });
});

describe('Animation - Edge Cases', () => {
  it('handles entrance called multiple times', async () => {
    const element = new MockElement('test-1', 10);
    const animation = new Animation({ elements: [element] });

    const promise1 = animation.entrance();
    const promise2 = animation.entrance(); // Call again while running

    // Both should resolve
    await promise1;
    await promise2;

    expect(animation.getState()).toBe('hold');
  });

  it('handles zero-duration elements', async () => {
    const element = new MockElement('test-1', 0);
    const animation = new Animation({ elements: [element] });

    await animation.entrance();

    expect(animation.getState()).toBe('hold');
  });

  it('getElements returns all elements', () => {
    const elements = [
      new MockElement('test-1', 500),
      new MockElement('test-2', 500)
    ];
    const animation = new Animation({ elements });

    const retrieved = animation.getElements();

    expect(retrieved).toHaveLength(2);
    expect(retrieved[0]).toBe(elements[0]);
    expect(retrieved[1]).toBe(elements[1]);
  });

  it('handles elements with zero-duration tracks', async () => {
    const element = new MockElement('test-1', 0);
    element.addTrack('instant', new Track({
      from: 0,
      to: 100,
      duration: 0
    }));

    const animation = new Animation({ elements: [element] });

    await animation.entrance();

    expect(animation.getState()).toBe('hold');
  });

  it('entrance with negative hold duration', async () => {
    const element = new MockElement('test-1', 10);
    const animation = new Animation({ elements: [element] });

    await animation.play(-100); // Negative hold

    // Should complete without error
    expect(animation.getState()).toBe('waiting');
  });
});

describe('Animation - Real-World Scenarios', () => {
  it('simulates logo line drawing animation', async () => {
    // Multiple lines with staggered delays
    const lines = [
      new MockElement('line-1', 20),
      new MockElement('line-2', 20),
      new MockElement('line-3', 20)
    ];

    // Add staggered delays
    lines[1].addTrack('delayed', new Track({ from: 0, to: 1, duration: 20, delay: 5 }));
    lines[2].addTrack('delayed', new Track({ from: 0, to: 1, duration: 20, delay: 10 }));

    const animation = new Animation({ elements: lines });

    await animation.entrance();

    expect(animation.getState()).toBe('hold');
    lines.forEach(line => {
      expect(line.updateCount).toBeGreaterThan(0);
    });
  });

  it('simulates fade in + slide animation', async () => {
    const element = new MockElement('card', 20);
    element.addTrack('x', new Track({ from: -100, to: 0, duration: 20 }));
    element.addTrack('y', new Track({ from: 0, to: 0, duration: 20 }));
    element.addTrack('opacity', new Track({ from: 0, to: 1, duration: 20 }));

    const animation = new Animation({ elements: [element] });

    await animation.entrance();

    // All tracks should complete
    expect(element.trackGroup.isComplete(element.lastElapsed)).toBe(true);
  });

  it('simulates entrance → hold → exit → restart cycle', async () => {
    const element = new MockElement('test-1', 10);
    const animation = new Animation({ elements: [element] });

    // First cycle
    await animation.play(10);
    expect(animation.getState()).toBe('waiting');

    // Reset and play again
    animation.reset();
    expect(animation.getState()).toBe('idle');

    // Second cycle
    await animation.play(10);
    expect(animation.getState()).toBe('waiting');
  });

  it('handles complex timing with multiple delays and durations', async () => {
    const elements = [
      new MockElement('early', 10),   // Completes at 10ms
      new MockElement('delayed', 10), // Starts at 10ms, completes at 20ms
      new MockElement('late', 10)     // Starts at 20ms, completes at 30ms
    ];

    elements[1].addTrack('delayed', new Track({ from: 0, to: 1, duration: 10, delay: 10 }));
    elements[2].addTrack('delayed', new Track({ from: 0, to: 1, duration: 10, delay: 20 }));

    const animation = new Animation({ elements });

    await animation.entrance();

    // Should complete when last element finishes (30ms)
    expect(animation.getState()).toBe('hold');
  });
});
