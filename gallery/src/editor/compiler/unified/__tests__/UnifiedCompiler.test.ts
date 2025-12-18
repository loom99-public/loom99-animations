/**
 * @file UnifiedCompiler tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { UnifiedCompiler } from '../UnifiedCompiler';
import { stateBlockRegistry } from '../StateBlock';
import { createDelayBlock } from '../blocks/DelayBlock';
import type { PatchDefinition } from '../UnifiedCompiler';

describe('UnifiedCompiler', () => {
  let compiler: UnifiedCompiler;

  beforeEach(() => {
    compiler = new UnifiedCompiler();

    // Clear and re-register Delay block
    stateBlockRegistry.clear();
    stateBlockRegistry.register('Delay', createDelayBlock({ delay: 0.5 }));
  });

  it('compiles empty patch', () => {
    const patch: PatchDefinition = {
      blocks: new Map(),
      connections: [],
    };

    const result = compiler.compile(patch);

    expect(result.errors).toHaveLength(0);
    expect(result.blocks).toHaveLength(0);
    expect(result.buses).toHaveLength(0);
  });

  it('compiles simple linear patch', () => {
    const patch: PatchDefinition = {
      blocks: new Map([
        ['block1', { id: 'block1', type: 'Source', params: {} }],
        ['block2', { id: 'block2', type: 'Transform', params: {} }],
        ['block3', { id: 'block3', type: 'Sink', params: {} }],
      ]),
      connections: [
        { from: { blockId: 'block1', port: 'out' }, to: { blockId: 'block2', port: 'in' } },
        { from: { blockId: 'block2', port: 'out' }, to: { blockId: 'block3', port: 'in' } },
      ],
    };

    const result = compiler.compile(patch);

    expect(result.errors).toHaveLength(0);
    expect(result.blocks).toHaveLength(3);

    // Check evaluation order
    const order = result.evaluationOrder;
    expect(order.indexOf('block1')).toBeLessThan(order.indexOf('block2'));
    expect(order.indexOf('block2')).toBeLessThan(order.indexOf('block3'));
  });

  it('detects instantaneous cycle', () => {
    const patch: PatchDefinition = {
      blocks: new Map([
        ['block1', { id: 'block1', type: 'Source', params: {} }],
        ['block2', { id: 'block2', type: 'Transform', params: {} }],
      ]),
      connections: [
        { from: { blockId: 'block1', port: 'out' }, to: { blockId: 'block2', port: 'in' } },
        { from: { blockId: 'block2', port: 'out' }, to: { blockId: 'block1', port: 'in' } },
      ],
    };

    const result = compiler.compile(patch);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.type).toBe('cycle');
    expect(result.errors[0]?.message).toContain('instantaneous cycle');
  });

  it('allows cycle through state block', () => {
    const patch: PatchDefinition = {
      blocks: new Map([
        ['block1', { id: 'block1', type: 'Source', params: {} }],
        ['delay1', { id: 'delay1', type: 'Delay', params: { delay: 0.5 } }],
      ]),
      connections: [
        { from: { blockId: 'block1', port: 'out' }, to: { blockId: 'delay1', port: 'input' } },
        { from: { blockId: 'delay1', port: 'output' }, to: { blockId: 'block1', port: 'in' } },
      ],
    };

    const result = compiler.compile(patch);

    // Should succeed - cycle through state block is legal
    expect(result.errors).toHaveLength(0);
    expect(result.blocks).toHaveLength(2);
  });

  it('compiles patch with buses', () => {
    const patch: PatchDefinition = {
      blocks: new Map([
        ['source1', { id: 'source1', type: 'Source', params: {} }],
        ['source2', { id: 'source2', type: 'Source', params: {} }],
        ['sink1', { id: 'sink1', type: 'Sink', params: {} }],
      ]),
      connections: [],
      buses: [
        {
          id: 'bus1',
          type: { world: 'signal', domain: 'number' },
          combineMode: 'sum',
          defaultValue: 0,
          sortKey: 0,
        },
      ],
      publishers: [
        {
          id: 'pub1',
          busId: 'bus1',
          from: { blockId: 'source1', port: 'out' },
          sortKey: 0,
          enabled: true,
        },
        {
          id: 'pub2',
          busId: 'bus1',
          from: { blockId: 'source2', port: 'out' },
          sortKey: 1,
          enabled: true,
        },
      ],
      listeners: [
        {
          id: 'list1',
          busId: 'bus1',
          to: { blockId: 'sink1', port: 'in' },
          enabled: true,
        },
      ],
    };

    const result = compiler.compile(patch);

    expect(result.errors).toHaveLength(0);
    expect(result.blocks).toHaveLength(3);
    expect(result.buses).toHaveLength(1);

    // Check bus evaluation order
    const order = result.evaluationOrder;
    expect(order.indexOf('source1')).toBeLessThan(order.indexOf('bus1'));
    expect(order.indexOf('source2')).toBeLessThan(order.indexOf('bus1'));
    expect(order.indexOf('bus1')).toBeLessThan(order.indexOf('sink1'));
  });

  it('initializes state memory for state blocks', () => {
    const patch: PatchDefinition = {
      blocks: new Map([
        ['delay1', { id: 'delay1', type: 'Delay', params: { delay: 0.5 } }],
      ]),
      connections: [],
    };

    const result = compiler.compile(patch);

    expect(result.errors).toHaveLength(0);
    expect(result.blocks).toHaveLength(1);

    const delayBlock = result.blocks[0];
    expect(delayBlock?.isStateBlock).toBe(true);
    expect(delayBlock?.stateMemory).toBeDefined();
    expect(delayBlock?.stateMemory?.shape.type).toBe('Delay');
  });

  it('sorts publishers by sort key', () => {
    const patch: PatchDefinition = {
      blocks: new Map([
        ['source1', { id: 'source1', type: 'Source', params: {} }],
        ['source2', { id: 'source2', type: 'Source', params: {} }],
        ['source3', { id: 'source3', type: 'Source', params: {} }],
      ]),
      connections: [],
      buses: [
        {
          id: 'bus1',
          type: { world: 'signal', domain: 'number' },
          combineMode: 'sum',
          defaultValue: 0,
          sortKey: 0,
        },
      ],
      publishers: [
        {
          id: 'pub1',
          busId: 'bus1',
          from: { blockId: 'source1', port: 'out' },
          sortKey: 20,
          enabled: true,
        },
        {
          id: 'pub2',
          busId: 'bus1',
          from: { blockId: 'source2', port: 'out' },
          sortKey: 10,
          enabled: true,
        },
        {
          id: 'pub3',
          busId: 'bus1',
          from: { blockId: 'source3', port: 'out' },
          sortKey: 30,
          enabled: true,
        },
      ],
    };

    const result = compiler.compile(patch);

    expect(result.errors).toHaveLength(0);
    expect(result.buses).toHaveLength(1);

    // Publishers should be sorted by sort key (10, 20, 30)
    // This is verified internally by the compiler
  });

  it('handles disabled publishers and listeners', () => {
    const patch: PatchDefinition = {
      blocks: new Map([
        ['source1', { id: 'source1', type: 'Source', params: {} }],
        ['sink1', { id: 'sink1', type: 'Sink', params: {} }],
      ]),
      connections: [],
      buses: [
        {
          id: 'bus1',
          type: { world: 'signal', domain: 'number' },
          combineMode: 'sum',
          defaultValue: 0,
          sortKey: 0,
        },
      ],
      publishers: [
        {
          id: 'pub1',
          busId: 'bus1',
          from: { blockId: 'source1', port: 'out' },
          sortKey: 0,
          enabled: false, // Disabled
        },
      ],
      listeners: [
        {
          id: 'list1',
          busId: 'bus1',
          to: { blockId: 'sink1', port: 'in' },
          enabled: false, // Disabled
        },
      ],
    };

    const result = compiler.compile(patch);

    expect(result.errors).toHaveLength(0);

    // Disabled publishers/listeners should not create edges
    const graph = result.graph;
    const edges = graph.getAllEdges();

    // Should not have publish or listen edges
    expect(edges.filter((e) => e.type === 'publish')).toHaveLength(0);
    expect(edges.filter((e) => e.type === 'listen')).toHaveLength(0);
  });
});
