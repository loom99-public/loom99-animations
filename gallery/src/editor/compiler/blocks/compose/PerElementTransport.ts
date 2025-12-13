/**
 * PerElementTransport Block Compiler
 *
 * Composes targets, start positions, delays, and phase into a Program
 * that animates each element from its start position to its target.
 */

import type {
  BlockCompiler,
  Field,
  PhaseMachine,
  Program,
  TargetScene,
  Vec2,
} from '../../types';
import type { RenderTree, DrawNode } from '../../../runtime/renderTree';
import { circle, group, withOpacity } from '../../../runtime/renderTree';
import { clamp01, easeOutCubic, easeInCubic, lerp } from '../helpers';

/**
 * Linear interpolation between two Vec2 points.
 */
function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  };
}

export const PerElementTransportBlock: BlockCompiler = {
  type: 'PerElementTransport',
  inputs: [
    { name: 'targets', type: { kind: 'TargetScene' }, required: true },
    { name: 'positions', type: { kind: 'Field:vec2' }, required: true },
    { name: 'delays', type: { kind: 'Field:number' }, required: true },
    { name: 'phase', type: { kind: 'PhaseMachine' }, required: true },
  ],
  outputs: [{ name: 'program', type: { kind: 'RenderTreeProgram' } }],

  compile({ id, inputs, ctx }) {
    // Validate inputs
    if (inputs.targets?.kind !== 'TargetScene') {
      return {
        program: { kind: 'Error', message: 'PerElementTransport: targets must be TargetScene' },
      };
    }
    if (inputs.positions?.kind !== 'Field:vec2') {
      return {
        program: { kind: 'Error', message: 'PerElementTransport: positions must be Field:vec2' },
      };
    }
    if (inputs.delays?.kind !== 'Field:number') {
      return {
        program: { kind: 'Error', message: 'PerElementTransport: delays must be Field:number' },
      };
    }
    if (inputs.phase?.kind !== 'PhaseMachine') {
      return {
        program: { kind: 'Error', message: 'PerElementTransport: phase must be PhaseMachine' },
      };
    }

    const scene: TargetScene = inputs.targets.value;
    const positionsField: Field<Vec2> = inputs.positions.value;
    const delaysField: Field<number> = inputs.delays.value;
    const phaseMachine: PhaseMachine = inputs.phase.value;

    const n = scene.targets.length;
    const seed = 42; // Default seed; could be parameterized

    // Evaluate fields at compile time (BULK form)
    const startPositions = positionsField(seed, n, ctx);
    const delays = delaysField(seed, n, ctx);

    // Get colors from scene metadata if available
    const colors: string[] = (scene.meta?.colors as string[]) ?? [];

    // Pre-compute exit targets (scatter outward)
    const exitTargets: Vec2[] = scene.targets.map((target, i) => {
      const t = seed * 12.9898 + i * 78.233;
      const rand = (Math.sin(t) * 43758.5453) % 1;
      const angle = rand * Math.PI * 2;
      const distance = 200 + rand * 200;
      return {
        x: target.x + Math.cos(angle) * distance,
        y: target.y + Math.sin(angle) * distance,
      };
    });

    // Create the program
    const program: Program<RenderTree> = {
      signal: (tMs: number): RenderTree => {
        const phaseSample = phaseMachine.sample(tMs);

        const particles: DrawNode[] = scene.targets.map((target, i) => {
          const startPos = startPositions[i] ?? { x: 0, y: 0 };
          const delay = (delays[i] ?? 0) * 1000; // Convert to ms
          const exitTarget = exitTargets[i] ?? target;
          const color = colors[i] ?? '#00d4ff';

          let position: Vec2;
          let opacity = 1;

          if (phaseSample.phase === 'entrance') {
            // Local time for this particle
            const localT = phaseSample.tLocal - delay;
            const duration = 2000; // 2 second duration per particle
            const uRaw = duration <= 0 ? 1 : localT / duration;
            const u = clamp01(uRaw);
            const uEased = easeOutCubic(u);

            position = lerpVec2(startPos, target, uEased);
            opacity = clamp01(u * 2); // Fade in during first half
          } else if (phaseSample.phase === 'hold') {
            position = target;
            opacity = 1;
          } else {
            // Exit phase
            const uEased = easeInCubic(phaseSample.u);
            position = lerpVec2(target, exitTarget, uEased);
            opacity = 1 - uEased;
          }

          // Wrap with opacity effect, then create circle
          return withOpacity(
            `${id}-op-${i}`,
            opacity,
            circle(`${id}-p-${i}`, position.x, position.y, 2.5, {
              fill: color,
              filter: 'blur(4px)',
            })
          );
        });

        return group(`${id}-root`, particles);
      },

      event: () => [],
    };

    return { program: { kind: 'RenderTreeProgram', value: program } };
  },
};
