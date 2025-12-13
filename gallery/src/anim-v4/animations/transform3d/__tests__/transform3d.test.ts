/**
 * V4 Transform3D Animation - Basic Smoke Test
 *
 * Verifies:
 * - Compiler runs without errors
 * - Produces valid RenderTree
 * - All three phases (entrance/hold/exit) sample correctly
 */

import { describe, it, expect } from 'vitest';
import { compileTransform3D } from '../compiler';
import { createSVGTransform3DRenderer } from '../render';
import { createProceduralMode, createTransform3DFields } from '../modes';
import { PhaseMachines } from '../../../core/types';
import { circle } from '../../../render/tree';
import type { Transform3DScene } from '../types';

describe('Transform3D Animation', () => {
  it('compiles and samples without errors', () => {
    // Create a simple scene with 3 circle parts
    const scene: Transform3DScene = {
      id: 'test-scene',
      parts: [
        { id: 'part-1', node: circle('circle-1', 100, 100, 20) },
        { id: 'part-2', node: circle('circle-2', 200, 200, 20) },
        { id: 'part-3', node: circle('circle-3', 300, 300, 20) },
      ],
      perspectivePx: 1000,
    };

    // Create mode and fields
    const modeConfig = createProceduralMode();
    const fields = createTransform3DFields(modeConfig);

    // Create phase machine: entrance (2.5s) -> hold (2s) -> exit (0.5s)
    const phases = PhaseMachines.of([
      { name: 'entrance', duration: 2.5 },
      { name: 'hold', duration: 2.0 },
      { name: 'exit', duration: 0.5 },
    ]);

    // Compile
    const program = compileTransform3D(
      {
        scene,
        fields,
        phases: { machine: phases },
        renderer: createSVGTransform3DRenderer(),
      },
      42, // seed
      { viewport: { width: 800, height: 600 }, elementCount: 3 }
    );

    // Sample at entrance phase (t=1.0s)
    const tree1 = program.signal(1.0, {
      env: { viewport: { width: 800, height: 600 } },
      input: {
        pointer: { x: 0, y: 0, down: false },
        scrollY: 0,
        keysDown: new Set(),
      },
    });

    expect(tree1).toBeDefined();
    expect(tree1.width).toBe(800);
    expect(tree1.height).toBe(600);
    expect(tree1.root.type).toBe('group');
    if (tree1.root.type === 'group') {
      expect(tree1.root.children.length).toBe(3);
    }

    // Sample at hold phase (t=3.5s)
    const tree2 = program.signal(3.5, {
      env: { viewport: { width: 800, height: 600 } },
      input: {
        pointer: { x: 0, y: 0, down: false },
        scrollY: 0,
        keysDown: new Set(),
      },
    });

    expect(tree2).toBeDefined();
    expect(tree2.root.type).toBe('group');

    // Sample at exit phase (t=4.8s)
    const tree3 = program.signal(4.8, {
      env: { viewport: { width: 800, height: 600 } },
      input: {
        pointer: { x: 0, y: 0, down: false },
        scrollY: 0,
        keysDown: new Set(),
      },
    });

    expect(tree3).toBeDefined();
    expect(tree3.root.type).toBe('group');

    // Verify events are empty
    const events = program.event(1.0, {
      env: { viewport: { width: 800, height: 600 } },
      input: {
        pointer: { x: 0, y: 0, down: false },
        scrollY: 0,
        keysDown: new Set(),
      },
    });
    expect(events).toEqual([]);
  });
});
