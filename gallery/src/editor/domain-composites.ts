/**
 * Domain Composites - Pre-built compound blocks for domain-based workflows.
 *
 * These composites combine domain primitives into common patterns.
 */

import { registerComposite } from './composites';

/**
 * GridPoints - Combines DomainN + PositionMapGrid into a single block.
 *
 * This composite creates a grid of points in one step, hiding the internal
 * Domain → PositionMapGrid pipeline from the user.
 */
export const GridPoints = registerComposite({
  id: 'GridPoints',
  label: 'Grid Points',
  description: 'Create a grid of positioned elements',
  color: '#8B5CF6',
  subcategory: 'Sources',
  laneKind: 'Fields',
  tags: {
    origin: 'domain-composites',
    form: 'composite',
  },
  graph: {
    nodes: {
      domain: {
        type: 'DomainN',
        params: {
          n: { __fromParam: 'count' },
          seed: { __fromParam: 'seed' },
        },
      },
      grid: {
        type: 'PositionMapGrid',
        params: {
          rows: { __fromParam: 'rows' },
          cols: { __fromParam: 'cols' },
          spacing: { __fromParam: 'spacing' },
          originX: { __fromParam: 'originX' },
          originY: { __fromParam: 'originY' },
          order: { __fromParam: 'order' },
        },
      },
    },
    edges: [
      { from: 'domain.domain', to: 'grid.domain' },
    ],
    inputMap: {},
    outputMap: {
      domain: 'domain.domain',
      positions: 'grid.pos',
    },
  },
  exposedInputs: [],
  exposedOutputs: [
    {
      id: 'domain',
      label: 'Domain',
      direction: 'output',
      slotType: 'Domain',
      nodeId: 'domain',
      nodePort: 'domain',
    },
    {
      id: 'positions',
      label: 'Positions',
      direction: 'output',
      slotType: 'Field<vec2>',
      nodeId: 'grid',
      nodePort: 'pos',
    },
  ],
});

/**
 * Register all domain composites.
 * Called during editor initialization.
 */
export function registerDomainComposites(): void {
  // Composites are registered on module load via registerComposite() calls above
  // This function exists for explicit initialization if needed
}
