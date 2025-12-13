/**
 * Block Compilers
 *
 * Implementations of BlockCompiler for each block type.
 * These compile block instances into typed Artifacts.
 */

import type {
  Artifact,
  BlockCompiler,
  BlockRegistry,
  Field,
  Program,
  RenderTree,
  RuntimeCtx,
  Vec2,
} from './types';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Type-safe artifact extraction with error messages.
 */
function expect<A extends Artifact['kind']>(
  a: Artifact,
  kind: A,
  who: string
): Extract<Artifact, { kind: A }> {
  if (a.kind !== kind) throw new Error(`${who}: expected ${kind}, got ${a.kind}`);
  return a as Extract<Artifact, { kind: A }>;
}

/**
 * Extract scalar number from artifact with error context.
 */
function scalarNum(a: Artifact, who: string): number {
  return expect(a, 'Scalar:number', who).value;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * ConstantNumber: outputs Scalar:number and Field:number (lifted)
 */
export const ConstantNumberBlock: BlockCompiler = {
  type: 'constNumber',
  inputs: [],
  outputs: [
    { name: 'scalar', type: { kind: 'Scalar:number' } },
    { name: 'field', type: { kind: 'Field:number' } },
  ],
  compile({ params }) {
    const v = Number(params.value ?? 0);
    const f: Field<number> = (_seed, n, _ctx) => {
      const out = new Array<number>(n);
      for (let i = 0; i < n; i++) out[i] = v;
      return out;
    };
    return {
      scalar: { kind: 'Scalar:number', value: v },
      field: { kind: 'Field:number', value: f },
    };
  },
};

/**
 * ConstantVec2: outputs Scalar:vec2 and Field:vec2
 */
export const ConstantVec2Block: BlockCompiler = {
  type: 'constVec2',
  inputs: [],
  outputs: [
    { name: 'scalar', type: { kind: 'Scalar:vec2' } },
    { name: 'field', type: { kind: 'Field:vec2' } },
  ],
  compile({ params }) {
    const x = Number(params.x ?? 0);
    const y = Number(params.y ?? 0);
    const v: Vec2 = { x, y };
    const f: Field<Vec2> = (_seed, n, _ctx) => {
      const out = new Array<Vec2>(n);
      for (let i = 0; i < n; i++) out[i] = v;
      return out;
    };
    return {
      scalar: { kind: 'Scalar:vec2', value: v },
      field: { kind: 'Field:vec2', value: f },
    };
  },
};

// =============================================================================
// Field Combinators
// =============================================================================

/**
 * AddFieldNumber: adds two Field<number>
 */
export const AddFieldNumberBlock: BlockCompiler = {
  type: 'addFieldNumber',
  inputs: [
    { name: 'a', type: { kind: 'Field:number' }, required: true },
    { name: 'b', type: { kind: 'Field:number' }, required: true },
  ],
  outputs: [{ name: 'out', type: { kind: 'Field:number' } }],
  compile({ inputs }) {
    const a = inputs.a;
    const b = inputs.b;
    if (a.kind !== 'Field:number' || b.kind !== 'Field:number') {
      return { out: { kind: 'Error', message: 'addFieldNumber: inputs must be Field:number' } };
    }
    const out: Field<number> = (seed, n, ctx) => {
      const A = a.value(seed, n, ctx);
      const B = b.value(seed, n, ctx);
      const Y = new Array<number>(n);
      for (let i = 0; i < n; i++) Y[i] = (A[i] ?? 0) + (B[i] ?? 0);
      return Y;
    };
    return { out: { kind: 'Field:number', value: out } };
  },
};

/**
 * MulFieldNumber: multiplies two Field<number>
 */
export const MulFieldNumberBlock: BlockCompiler = {
  type: 'mulFieldNumber',
  inputs: [
    { name: 'a', type: { kind: 'Field:number' }, required: true },
    { name: 'b', type: { kind: 'Field:number' }, required: true },
  ],
  outputs: [{ name: 'out', type: { kind: 'Field:number' } }],
  compile({ inputs }) {
    const a = inputs.a;
    const b = inputs.b;
    if (a.kind !== 'Field:number' || b.kind !== 'Field:number') {
      return { out: { kind: 'Error', message: 'mulFieldNumber: inputs must be Field:number' } };
    }
    const out: Field<number> = (seed, n, ctx) => {
      const A = a.value(seed, n, ctx);
      const B = b.value(seed, n, ctx);
      const Y = new Array<number>(n);
      for (let i = 0; i < n; i++) Y[i] = (A[i] ?? 0) * (B[i] ?? 0);
      return Y;
    };
    return { out: { kind: 'Field:number', value: out } };
  },
};

/**
 * ScaleFieldNumber: multiplies Field<number> by a scalar
 */
export const ScaleFieldNumberBlock: BlockCompiler = {
  type: 'scaleFieldNumber',
  inputs: [
    { name: 'field', type: { kind: 'Field:number' }, required: true },
    { name: 'scale', type: { kind: 'Scalar:number' }, required: false },
  ],
  outputs: [{ name: 'out', type: { kind: 'Field:number' } }],
  compile({ params, inputs }) {
    const field = inputs.field;
    if (field.kind !== 'Field:number') {
      return { out: { kind: 'Error', message: 'scaleFieldNumber: field must be Field:number' } };
    }
    // Scale from input or params
    const scale =
      inputs.scale?.kind === 'Scalar:number'
        ? inputs.scale.value
        : Number(params.scale ?? 1);

    const out: Field<number> = (seed, n, ctx) => {
      const F = field.value(seed, n, ctx);
      const Y = new Array<number>(n);
      for (let i = 0; i < n; i++) Y[i] = (F[i] ?? 0) * scale;
      return Y;
    };
    return { out: { kind: 'Field:number', value: out } };
  },
};

/**
 * MapFieldNumber: applies a function to each element
 * Params: { fn: 'sin' | 'cos' | 'abs' | 'sqrt' | 'negate' }
 */
export const MapFieldNumberBlock: BlockCompiler = {
  type: 'mapFieldNumber',
  inputs: [{ name: 'field', type: { kind: 'Field:number' }, required: true }],
  outputs: [{ name: 'out', type: { kind: 'Field:number' } }],
  compile({ params, inputs }) {
    const field = inputs.field;
    if (field.kind !== 'Field:number') {
      return { out: { kind: 'Error', message: 'mapFieldNumber: field must be Field:number' } };
    }

    const fnName = String(params.fn ?? 'abs');
    const fn = getFn(fnName);

    const out: Field<number> = (seed, n, ctx) => {
      const F = field.value(seed, n, ctx);
      const Y = new Array<number>(n);
      for (let i = 0; i < n; i++) Y[i] = fn(F[i] ?? 0);
      return Y;
    };
    return { out: { kind: 'Field:number', value: out } };
  },
};

function getFn(name: string): (x: number) => number {
  switch (name) {
    case 'sin':
      return Math.sin;
    case 'cos':
      return Math.cos;
    case 'abs':
      return Math.abs;
    case 'sqrt':
      return Math.sqrt;
    case 'negate':
      return (x) => -x;
    case 'square':
      return (x) => x * x;
    default:
      return (x) => x;
  }
}

/**
 * StaggerField: creates a staggered delay Field<number> based on index
 */
export const StaggerFieldBlock: BlockCompiler = {
  type: 'staggerField',
  inputs: [],
  outputs: [{ name: 'out', type: { kind: 'Field:number' } }],
  compile({ params }) {
    const delay = Number(params.delay ?? 0.05); // delay per element
    const offset = Number(params.offset ?? 0);

    const out: Field<number> = (_seed, n, _ctx) => {
      const Y = new Array<number>(n);
      for (let i = 0; i < n; i++) Y[i] = offset + i * delay;
      return Y;
    };
    return { out: { kind: 'Field:number', value: out } };
  },
};

/**
 * NoiseField: creates a noise-based Field<number> using seed
 */
export const NoiseFieldBlock: BlockCompiler = {
  type: 'noiseField',
  inputs: [],
  outputs: [{ name: 'out', type: { kind: 'Field:number' } }],
  compile({ params }) {
    const amplitude = Number(params.amplitude ?? 1);
    const offset = Number(params.offset ?? 0);

    const out: Field<number> = (seed, n, _ctx) => {
      const Y = new Array<number>(n);
      for (let i = 0; i < n; i++) {
        // Simple seeded pseudo-random
        const t = seed * 12.9898 + i * 78.233;
        const noise = Math.sin(t) * 43758.5453;
        Y[i] = offset + (noise - Math.floor(noise)) * amplitude;
      }
      return Y;
    };
    return { out: { kind: 'Field:number', value: out } };
  },
};

// =============================================================================
// Math Scalar Blocks (Slice 2.5)
// =============================================================================

/**
 * math.constNumber: simple constant scalar output
 */
export const MathConstNumberBlock: BlockCompiler = {
  type: 'math.constNumber',
  inputs: [],
  outputs: [{ name: 'out', type: { kind: 'Scalar:number' } }],
  compile({ params }) {
    const v = Number(params.value ?? 0);
    return { out: { kind: 'Scalar:number', value: v } };
  },
};

/**
 * math.addScalar: add two scalar numbers
 */
export const MathAddScalarBlock: BlockCompiler = {
  type: 'math.addScalar',
  inputs: [
    { name: 'a', type: { kind: 'Scalar:number' }, required: true },
    { name: 'b', type: { kind: 'Scalar:number' }, required: true },
  ],
  outputs: [{ name: 'out', type: { kind: 'Scalar:number' } }],
  compile({ inputs }) {
    const a = scalarNum(inputs.a, 'AddScalar.a');
    const b = scalarNum(inputs.b, 'AddScalar.b');
    return { out: { kind: 'Scalar:number', value: a + b } };
  },
};

/**
 * math.mulScalar: multiply two scalar numbers
 */
export const MathMulScalarBlock: BlockCompiler = {
  type: 'math.mulScalar',
  inputs: [
    { name: 'a', type: { kind: 'Scalar:number' }, required: true },
    { name: 'b', type: { kind: 'Scalar:number' }, required: true },
  ],
  outputs: [{ name: 'out', type: { kind: 'Scalar:number' } }],
  compile({ inputs }) {
    const a = scalarNum(inputs.a, 'MulScalar.a');
    const b = scalarNum(inputs.b, 'MulScalar.b');
    return { out: { kind: 'Scalar:number', value: a * b } };
  },
};

/**
 * math.sinScalar: sine of a scalar number
 */
export const MathSinScalarBlock: BlockCompiler = {
  type: 'math.sinScalar',
  inputs: [{ name: 'x', type: { kind: 'Scalar:number' }, required: true }],
  outputs: [{ name: 'out', type: { kind: 'Scalar:number' } }],
  compile({ inputs }) {
    const x = scalarNum(inputs.x, 'SinScalar.x');
    return { out: { kind: 'Scalar:number', value: Math.sin(x) } };
  },
};

// =============================================================================
// Lift Blocks (Slice 2.5)
// =============================================================================

/**
 * lift.scalarToFieldNumber: explicit lift from Scalar:number to Field:number
 * This makes the Scalar→Field conversion explicit and type-safe.
 */
export const LiftScalarToFieldNumberBlock: BlockCompiler = {
  type: 'lift.scalarToFieldNumber',
  inputs: [{ name: 'x', type: { kind: 'Scalar:number' }, required: true }],
  outputs: [{ name: 'out', type: { kind: 'Field:number' } }],
  compile({ inputs }) {
    const x = scalarNum(inputs.x, 'LiftScalarToFieldNumber.x');
    const field: Field<number> = (_seed, n, _ctx) => {
      const out = new Array<number>(n);
      for (let i = 0; i < n; i++) out[i] = x;
      return out;
    };
    return { out: { kind: 'Field:number', value: field } };
  },
};

// =============================================================================
// Program Blocks (Slice 2)
// =============================================================================

/**
 * DemoProgram: creates a visual proof program.
 * Params: { variant: 'pulsingLine' | 'bouncingCircle' | 'particles' | 'lineDrawing' }
 * Also supports: speed, amp, stroke, cx, cy, r for 'oscillator' variant
 */
export const DemoProgramBlock: BlockCompiler = {
  type: 'demoProgram',
  inputs: [
    { name: 'speed', type: { kind: 'Scalar:number' }, required: false },
    { name: 'amp', type: { kind: 'Scalar:number' }, required: false },
  ],
  outputs: [{ name: 'program', type: { kind: 'RenderTreeProgram' } }],
  compile({ id, params, inputs }) {
    const variant = String(params.variant ?? 'lineDrawing');

    // For 'oscillator' variant: use inputs if wired, else params
    const speed =
      inputs.speed?.kind === 'Scalar:number' ? inputs.speed.value : Number(params.speed ?? 1);
    const amp =
      inputs.amp?.kind === 'Scalar:number' ? inputs.amp.value : Number(params.amp ?? 30);
    const stroke = String(params.stroke ?? '#ffffff');
    const cx = Number(params.cx ?? 200);
    const cy = Number(params.cy ?? 120);
    const r = Number(params.r ?? 8);

    const program: Program<RenderTree> = {
      signal: (tMs, _rt: RuntimeCtx) => {
        const t = tMs / 1000;

        switch (variant) {
          case 'oscillator': {
            // Slice 2.5 demo: oscillating dot with baseline
            const tScaled = t * speed;
            const x = cx + Math.sin(tScaled) * amp;

            return {
              kind: 'group',
              id: `${id}-root`,
              children: [
                {
                  kind: 'shape',
                  id: `${id}-dot`,
                  geom: { kind: 'circle', cx: x, cy, r },
                  style: { fill: stroke, stroke: 'none', opacity: 1 },
                },
                {
                  kind: 'shape',
                  id: `${id}-baseline`,
                  geom: { kind: 'svgPath', d: `M ${cx - amp} ${cy} L ${cx + amp} ${cy}` },
                  style: { stroke, strokeWidth: 2, fill: 'none', opacity: 0.4 },
                },
              ],
            } as RenderTree;
          }

          case 'pulsingLine': {
            const opacity = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2));
            return {
              kind: 'effect',
              id: `${id}-pulse`,
              effect: { kind: 'opacityMul', mul: opacity },
              child: {
                kind: 'shape',
                id: `${id}-line`,
                geom: { kind: 'svgPath', d: 'M 100 200 L 700 200' },
                style: { stroke: '#4a9eff', strokeWidth: 4, strokeLinecap: 'round' },
              },
            };
          }

          case 'bouncingCircle': {
            const y = Math.sin(t * 3) * 100;
            const scale = 0.8 + 0.4 * (0.5 + 0.5 * Math.sin(t * 6));
            return {
              kind: 'effect',
              id: `${id}-bounce`,
              effect: {
                kind: 'transform2d',
                transform: { translate: { x: 400, y: 300 + y }, scale },
              },
              child: {
                kind: 'shape',
                id: `${id}-ball`,
                geom: { kind: 'circle', cx: 0, cy: 0, r: 50 },
                style: { fill: '#ff6b6b', stroke: '#fff', strokeWidth: 2 },
              },
            };
          }

          case 'particles': {
            const particles: RenderTree[] = [];
            for (let i = 0; i < 15; i++) {
              const phase = (i / 15) * Math.PI * 2;
              const speed = 0.5 + (i % 5) * 0.3;
              const radius = 80 + Math.sin(t * speed + phase) * 40;
              const angle = t * speed + phase;
              const x = 400 + Math.cos(angle) * radius;
              const y = 300 + Math.sin(angle) * radius;
              const size = 5 + Math.sin(t * 2 + phase) * 3;
              const opacity = 0.5 + 0.5 * Math.sin(t + phase);

              particles.push({
                kind: 'effect',
                id: `${id}-p-op-${i}`,
                effect: { kind: 'opacityMul', mul: opacity },
                child: {
                  kind: 'shape',
                  id: `${id}-p-${i}`,
                  geom: { kind: 'circle', cx: x, cy: y, r: size },
                  style: { fill: `hsl(${(i * 24) % 360}, 70%, 60%)`, stroke: 'none' },
                },
              });
            }
            return { kind: 'group', id: `${id}-particles`, children: particles };
          }

          case 'lineDrawing':
          default: {
            const duration = 3;
            const progress = Math.min(1, (t % (duration + 1)) / duration);
            const pathLength = 1000;
            const lines: RenderTree[] = [];

            for (let i = 0; i < 5; i++) {
              const lineProgress = Math.max(0, Math.min(1, (progress * 5 - i)));
              const dashOffset = pathLength * (1 - lineProgress);
              const y = 150 + i * 80;

              lines.push({
                kind: 'shape',
                id: `${id}-line-${i}`,
                geom: { kind: 'svgPath', d: `M 100 ${y} Q 400 ${y - 50} 700 ${y}` },
                style: {
                  stroke: `hsl(${200 + i * 30}, 70%, 60%)`,
                  strokeWidth: 4,
                  strokeLinecap: 'round',
                  strokeDasharray: String(pathLength),
                  strokeDashoffset: dashOffset,
                },
              });
            }
            return { kind: 'group', id: `${id}-drawing`, children: lines };
          }
        }
      },
      event: () => [],
    };

    return { program: { kind: 'RenderTreeProgram', value: program } };
  },
};

/**
 * OutputProgram: pass-through block that marks the patch output explicitly.
 * Makes patch.output inference unnecessary and UI clearer.
 */
export const OutputProgramBlock: BlockCompiler = {
  type: 'outputProgram',
  inputs: [{ name: 'program', type: { kind: 'RenderTreeProgram' }, required: true }],
  outputs: [{ name: 'out', type: { kind: 'RenderTreeProgram' } }],
  compile({ inputs }) {
    const input = inputs.program;
    if (input.kind !== 'RenderTreeProgram') {
      return { out: { kind: 'Error', message: 'outputProgram: input must be RenderTreeProgram' } };
    }
    // Pass through unchanged
    return { out: input };
  },
};

/**
 * DebugOutput: placeholder that outputs a minimal RenderTreeProgram
 * Use for testing the compiler pipeline.
 */
export const DebugOutputBlock: BlockCompiler = {
  type: 'debugOutput',
  inputs: [{ name: 'field', type: { kind: 'Field:number' }, required: false }],
  outputs: [{ name: 'program', type: { kind: 'RenderTreeProgram' } }],
  compile({ id, inputs }) {
    // Just create a minimal program that logs the field values
    const program: Program<RenderTree> = {
      signal: (_tMs, _rt) => ({
        kind: 'group',
        id: `debug-${id}`,
        children: [],
        meta: {
          debugInfo: 'Debug output block',
          hasFieldInput: inputs.field?.kind === 'Field:number',
        },
      }),
      event: (_ev) => [],
    };
    return { program: { kind: 'RenderTreeProgram', value: program } };
  },
};

// =============================================================================
// Registry
// =============================================================================

/**
 * Default block compiler registry.
 * Add new block compilers here.
 */
export const DEFAULT_BLOCK_REGISTRY: BlockRegistry = {
  // Constants
  constNumber: ConstantNumberBlock,
  constVec2: ConstantVec2Block,

  // Field combinators
  addFieldNumber: AddFieldNumberBlock,
  mulFieldNumber: MulFieldNumberBlock,
  scaleFieldNumber: ScaleFieldNumberBlock,
  mapFieldNumber: MapFieldNumberBlock,
  staggerField: StaggerFieldBlock,
  noiseField: NoiseFieldBlock,

  // Math scalar blocks (Slice 2.5)
  'math.constNumber': MathConstNumberBlock,
  'math.addScalar': MathAddScalarBlock,
  'math.mulScalar': MathMulScalarBlock,
  'math.sinScalar': MathSinScalarBlock,

  // Lift blocks (Slice 2.5)
  'lift.scalarToFieldNumber': LiftScalarToFieldNumberBlock,

  // Program blocks (Slice 2)
  demoProgram: DemoProgramBlock,
  outputProgram: OutputProgramBlock,
  debugOutput: DebugOutputBlock,
};

/**
 * Create a registry with additional custom blocks.
 */
export function createBlockRegistry(
  custom: BlockRegistry = {}
): BlockRegistry {
  return { ...DEFAULT_BLOCK_REGISTRY, ...custom };
}
