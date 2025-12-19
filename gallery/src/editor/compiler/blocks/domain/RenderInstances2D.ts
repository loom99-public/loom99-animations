/**
 * RenderInstances2D Block Compiler
 *
 * Materializes Domain + Fields into a renderable 2D circle output.
 * This is the sink that turns per-element data into visual output.
 *
 * Takes:
 *   - Domain: element identity
 *   - positions: Field<vec2> - per-element positions
 *   - radius: Field<number> - per-element radii (optional)
 *   - color: Field<color> - per-element colors (optional)
 *
 * Produces:
 *   - render: RenderTree - SVG-compatible render tree with circles
 */

import type { BlockCompiler, Vec2, Domain, Field, RuntimeCtx, DrawNode } from '../../types';

// Default compile context for field evaluation
const DEFAULT_CTX = {
  env: {},
  geom: {
    get<K extends object, V>(_key: K, compute: () => V): V {
      return compute();
    },
    invalidate() {},
  },
};

export const RenderInstances2DBlock: BlockCompiler = {
  type: 'RenderInstances2D',

  inputs: [
    { name: 'domain', type: { kind: 'Domain' }, required: true },
    { name: 'positions', type: { kind: 'Field:vec2' }, required: true },
    { name: 'radius', type: { kind: 'Field:number' }, required: false },
    { name: 'color', type: { kind: 'Field:color' }, required: false },
  ],

  outputs: [
    { name: 'render', type: { kind: 'RenderTree' } },
  ],

  compile({ params, inputs }) {
    const domainArtifact = inputs.domain;
    if (!domainArtifact || domainArtifact.kind !== 'Domain') {
      return {
        render: {
          kind: 'Error',
          message: 'RenderInstances2D requires a Domain input',
        },
      };
    }

    const positionsArtifact = inputs.positions;
    if (!positionsArtifact || positionsArtifact.kind !== 'Field:vec2') {
      return {
        render: {
          kind: 'Error',
          message: 'RenderInstances2D requires a Field<vec2> positions input',
        },
      };
    }

    const domain = domainArtifact.value as Domain;
    const positionField = positionsArtifact.value as Field<Vec2>;

    // Optional radius field - default to constant if not provided
    const radiusArtifact = inputs.radius;
    const radiusField: Field<number> = radiusArtifact?.kind === 'Field:number'
      ? radiusArtifact.value as Field<number>
      : (_seed, n) => new Array(n).fill(5);

    // Optional color field - default to white if not provided
    const colorArtifact = inputs.color;
    const colorField: Field<unknown> = colorArtifact?.kind === 'Field:color'
      ? colorArtifact.value as Field<unknown>
      : (_seed, n) => new Array(n).fill('#ffffff');

    // Params
    const opacity = Number(params.opacity ?? 1.0);
    const glow = Boolean(params.glow ?? false);
    const glowIntensity = Number(params.glowIntensity ?? 2.0);

    // Create the render function - evaluates fields at render time
    const renderFn = (_tMs: number, _ctx: RuntimeCtx): DrawNode => {
      const n = domain.elements.length;
      const seed = 0; // Fixed seed for consistent rendering

      // Evaluate all fields
      const positions = positionField(seed, n, DEFAULT_CTX);
      const radii = radiusField(seed, n, DEFAULT_CTX);
      const colors = colorField(seed, n, DEFAULT_CTX);

      // Build circle nodes
      const circles: DrawNode[] = [];
      for (let i = 0; i < n; i++) {
        const pos = positions[i];
        const r = radii[i] ?? 5;
        const color = colors[i] ?? '#ffffff';

        if (pos) {
          circles.push({
            kind: 'shape',
            id: `circle-${domain.elements[i]}`,
            geom: {
              type: 'circle',
              cx: pos.x,
              cy: pos.y,
              r,
            },
            style: {
              fill: color as string,
              opacity,
            },
          });
        }
      }

      // Wrap in group, optionally with glow filter
      const children: DrawNode = {
        kind: 'group',
        id: 'instances',
        children: circles,
      };

      if (glow) {
        return {
          kind: 'effect',
          id: 'glow-wrapper',
          effect: {
            type: 'glow',
            blur: 10,
            intensity: glowIntensity,
          },
          child: children,
        };
      }

      return children;
    };

    return {
      render: { kind: 'RenderTree', value: renderFn },
    };
  },
};
