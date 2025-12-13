/**
 * V4 Kernel Tests
 *
 * Verifies the 8 primitives work correctly.
 */

import { describe, it, expect } from 'vitest';
import {
  SignalFns,
  EventFns,
  TimeFns,
  SwitchFns,
  ScanFns,
  RandFns,
  DEFAULT_INPUT,
  createPRNG,
  easeOutQuart,
  type Signal,
  type RenderTree,
} from '../index';
import { renderTree, path, group } from '../render/tree';

describe('V4 Kernel', () => {
  describe('Signal', () => {
    it('constant returns same value at any time', () => {
      const signal = SignalFns.constant(42);
      expect(signal(0, DEFAULT_INPUT)).toBe(42);
      expect(signal(1, DEFAULT_INPUT)).toBe(42);
      expect(signal(100, DEFAULT_INPUT)).toBe(42);
    });

    it('ramp goes from 0 to 1 over duration', () => {
      const signal = SignalFns.ramp(2.0);
      expect(signal(0, DEFAULT_INPUT)).toBe(0);
      expect(signal(1, DEFAULT_INPUT)).toBe(0.5);
      expect(signal(2, DEFAULT_INPUT)).toBe(1);
      expect(signal(3, DEFAULT_INPUT)).toBe(1); // Clamped
    });

    it('map transforms signal output', () => {
      const base = SignalFns.constant(10);
      const doubled = SignalFns.mapSignal(base, (x) => x * 2);
      expect(doubled(0, DEFAULT_INPUT)).toBe(20);
    });

    it('lerp interpolates between values', () => {
      const signal = SignalFns.lerp(0, 100, 1.0);
      expect(signal(0, DEFAULT_INPUT)).toBe(0);
      expect(signal(0.5, DEFAULT_INPUT)).toBe(50);
      expect(signal(1, DEFAULT_INPUT)).toBe(100);
    });
  });

  describe('Event', () => {
    it('at creates single-occurrence stream', () => {
      const events = EventFns.at(1.0, 'hello');
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ time: 1.0, value: 'hello' });
    });

    it('hold creates signal from events', () => {
      const events = EventFns.fromPairs([
        [1.0, 'a'],
        [2.0, 'b'],
        [3.0, 'c'],
      ]);
      const signal = EventFns.hold(events, 'initial');

      expect(signal(0, DEFAULT_INPUT)).toBe('initial');
      expect(signal(0.5, DEFAULT_INPUT)).toBe('initial');
      expect(signal(1.5, DEFAULT_INPUT)).toBe('a');
      expect(signal(2.5, DEFAULT_INPUT)).toBe('b');
      expect(signal(10, DEFAULT_INPUT)).toBe('c');
    });

    it('fold accumulates events into state', () => {
      const events = EventFns.fromPairs([
        [1.0, 1],
        [2.0, 2],
        [3.0, 3],
      ]);
      const sum = EventFns.fold(events, 0, (state, value) => state + value);

      expect(sum(0, DEFAULT_INPUT)).toBe(0);
      expect(sum(1.5, DEFAULT_INPUT)).toBe(1);
      expect(sum(2.5, DEFAULT_INPUT)).toBe(3);
      expect(sum(10, DEFAULT_INPUT)).toBe(6);
    });
  });

  describe('Time', () => {
    it('delay shifts signal in time', () => {
      const signal = SignalFns.ramp(1.0);
      const delayed = TimeFns.delay(signal, 2.0);

      expect(delayed(0, DEFAULT_INPUT)).toBe(0);
      expect(delayed(1, DEFAULT_INPUT)).toBe(0);
      expect(delayed(2, DEFAULT_INPUT)).toBe(0);
      expect(delayed(2.5, DEFAULT_INPUT)).toBe(0.5);
      expect(delayed(3, DEFAULT_INPUT)).toBe(1);
    });

    it('stretch scales signal duration', () => {
      const signal = SignalFns.ramp(1.0);
      const stretched = TimeFns.stretch(signal, 2.0);

      // Stretched by 2x means it takes twice as long
      expect(stretched(0, DEFAULT_INPUT)).toBe(0);
      expect(stretched(1, DEFAULT_INPUT)).toBe(0.5);
      expect(stretched(2, DEFAULT_INPUT)).toBe(1);
    });

    it('easedRamp applies easing function', () => {
      const signal = TimeFns.easedRamp(1.0, easeOutQuart);

      expect(signal(0, DEFAULT_INPUT)).toBe(0);
      expect(signal(1, DEFAULT_INPUT)).toBe(1);
      // Eased value at 0.5 should be > 0.5 (easeOut accelerates then decelerates)
      expect(signal(0.5, DEFAULT_INPUT)).toBeGreaterThan(0.5);
    });

    it('loop repeats signal', () => {
      const signal = SignalFns.ramp(1.0);
      const looped = TimeFns.loop(signal, 1.0);

      expect(looped(0, DEFAULT_INPUT)).toBe(0);
      expect(looped(0.5, DEFAULT_INPUT)).toBe(0.5);
      expect(looped(1.0, DEFAULT_INPUT)).toBe(0); // Wrapped
      expect(looped(1.5, DEFAULT_INPUT)).toBe(0.5);
    });
  });

  describe('Switch', () => {
    it('switchAt changes signal at time', () => {
      const before = SignalFns.constant('before');
      const after = SignalFns.constant('after');
      const signal = SwitchFns.switchAt(before, after, 2.0);

      expect(signal(0, DEFAULT_INPUT)).toBe('before');
      expect(signal(1.9, DEFAULT_INPUT)).toBe('before');
      expect(signal(2.0, DEFAULT_INPUT)).toBe('after');
      expect(signal(10, DEFAULT_INPUT)).toBe('after');
    });

    it('phaseInfo reports phase progress', () => {
      const info = SwitchFns.phaseInfo([
        { name: 'entrance', duration: 1.0 },
        { name: 'hold', duration: 2.0 },
        { name: 'exit', duration: 1.0 },
      ]);

      const t0 = info(0, DEFAULT_INPUT);
      expect(t0.name).toBe('entrance');
      expect(t0.progress).toBe(0);

      const t05 = info(0.5, DEFAULT_INPUT);
      expect(t05.name).toBe('entrance');
      expect(t05.progress).toBe(0.5);

      const t15 = info(1.5, DEFAULT_INPUT);
      expect(t15.name).toBe('hold');
      expect(t15.progress).toBe(0.25);

      const t35 = info(3.5, DEFAULT_INPUT);
      expect(t35.name).toBe('exit');
      expect(t35.progress).toBe(0.5);
    });
  });

  describe('Scan', () => {
    it('scan accumulates state over time', () => {
      // Simple counter that increments by dt
      const counter = ScanFns.scan(
        (state: number, dt: number) => state + dt,
        0,
        1 / 60
      );

      expect(counter(0, DEFAULT_INPUT)).toBe(0);
      // After 1 second, should be approximately 1
      expect(counter(1, DEFAULT_INPUT)).toBeCloseTo(1, 1);
    });

    it('integrate produces position from velocity', () => {
      const velocity = SignalFns.constant(10); // 10 units/second
      const position = ScanFns.integrate(velocity, 0, 1 / 60);

      expect(position(0, DEFAULT_INPUT)).toBe(0);
      expect(position(1, DEFAULT_INPUT)).toBeCloseTo(10, 1);
      expect(position(2, DEFAULT_INPUT)).toBeCloseTo(20, 1);
    });
  });

  describe('Rand', () => {
    it('createPRNG produces deterministic sequence', () => {
      const rng1 = createPRNG(42);
      const rng2 = createPRNG(42);

      expect(rng1.next()).toBe(rng2.next());
      expect(rng1.next()).toBe(rng2.next());
      expect(rng1.next()).toBe(rng2.next());
    });

    it('runRand produces deterministic result', () => {
      const random = RandFns.uniformRange(0, 100);
      const result1 = RandFns.runRand(random, 42);
      const result2 = RandFns.runRand(random, 42);

      expect(result1).toBe(result2);
    });

    it('fieldFromRand generates per-element values', () => {
      const field = RandFns.fieldFromRand(RandFns.uniformRange(0, 1));
      const values = RandFns.runField(field, 42, 5, {
        viewport: { width: 800, height: 600 },
        elementCount: 5,
      });

      expect(values).toHaveLength(5);
      values.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      });
    });
  });

  describe('RenderTree', () => {
    it('creates valid render tree structure', () => {
      const tree: RenderTree = renderTree(
        800,
        600,
        group('root', [
          path('line1', 'M0 0 L100 100', { stroke: 'blue', strokeWidth: 2 }),
          path('line2', 'M100 0 L0 100', { stroke: 'red', strokeWidth: 2 }),
        ])
      );

      expect(tree.width).toBe(800);
      expect(tree.height).toBe(600);
      expect(tree.root.type).toBe('group');
      expect(tree.root.id).toBe('root');
    });

    it('path node has correct structure', () => {
      const node = path('myPath', 'M0 0 L100 100', {
        stroke: 'blue',
        strokeWidth: 3,
        opacity: 0.5,
      });

      expect(node.type).toBe('path');
      expect(node.id).toBe('myPath');
      expect(node.d).toBe('M0 0 L100 100');
      expect(node.style?.stroke).toBe('blue');
      expect(node.style?.strokeWidth).toBe(3);
      expect(node.style?.opacity).toBe(0.5);
    });
  });

  describe('Integration', () => {
    it('composes primitives into animation', () => {
      // A complete animation that:
      // 1. Fades in over 1 second
      // 2. Holds for 2 seconds
      // 3. Fades out over 1 second

      const phaseInfo = SwitchFns.phaseInfo([
        { name: 'entrance', duration: 1.0 },
        { name: 'hold', duration: 2.0 },
        { name: 'exit', duration: 1.0 },
      ]);

      const animation: Signal<RenderTree> = (t, input) => {
        const phase = phaseInfo(t, input);
        let opacity: number;

        switch (phase.name) {
          case 'entrance':
            opacity = easeOutQuart(phase.progress);
            break;
          case 'hold':
            opacity = 1;
            break;
          case 'exit':
            opacity = 1 - phase.progress;
            break;
          default:
            opacity = 0;
        }

        return renderTree(
          800,
          600,
          path('rect', 'M0 0 H100 V100 H0 Z', {
            fill: 'blue',
            opacity,
          })
        );
      };

      // Test at different times
      const t0 = animation(0, DEFAULT_INPUT);
      expect(t0.root.style?.opacity).toBe(0);

      const t05 = animation(0.5, DEFAULT_INPUT);
      expect(t05.root.style?.opacity).toBeGreaterThan(0);
      expect(t05.root.style?.opacity).toBeLessThan(1);

      const t2 = animation(2, DEFAULT_INPUT);
      expect(t2.root.style?.opacity).toBe(1);

      const t35 = animation(3.5, DEFAULT_INPUT);
      expect(t35.root.style?.opacity).toBe(0.5);
    });
  });
});
