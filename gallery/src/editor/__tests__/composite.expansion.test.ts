import { describe, expect, it, beforeEach } from 'vitest';
import { createCompilerService } from '../compiler';
import { RootStore } from '../stores/RootStore';
import { registerComposite } from '../composites';
import { registerAllComposites } from '../composite-bridge';

describe('demo patch loading', () => {
  beforeEach(() => {
    registerAllComposites();
  });

  it('loads and compiles breathing-dots demo without errors', () => {
    const store = new RootStore();

    // Load the demo patch
    store.loadDemoAnimation();

    // Verify patch loaded
    expect(store.patchStore.blocks.length).toBeGreaterThan(0);
    expect(store.patchStore.connections.length).toBeGreaterThan(0);
    expect(store.busStore.buses.length).toBeGreaterThan(0);
    expect(store.busStore.publishers.length).toBeGreaterThan(0);
    expect(store.busStore.listeners.length).toBeGreaterThan(0);

    // Compile the patch
    const compiler = createCompilerService(store);
    const result = compiler.compile();

    if (!result.ok) {
      console.error('Demo compilation errors:', result.errors);
    }

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.program).toBeDefined();

    // Verify program can render at t=0
    if (result.program) {
      const output = result.program.signal(0, { viewport: { w: 800, h: 600, dpr: 1 } });
      expect(output).toBeDefined();
    }
  });
});

describe('composite expansion', () => {
  beforeEach(() => {
    // Register all composites before each test
    registerAllComposites();
  });

  it.skip('expands composite graph and passes params into internal nodes', () => {
    const store = new RootStore();

    // Define a simple composite: index * scale
    const def = registerComposite({
      id: 'comp-scale-index',
      label: 'Scaled Index',
      subcategory: 'Timing',
      laneKind: 'Fields',
      graph: {
        nodes: {
          idx: { type: 'elementIndexField' },
          scale: { type: 'mulFieldNumber' },
          lift: { type: 'lift.scalarToFieldNumber', params: { value: { __fromParam: 'factor' } } },
        },
        edges: [
          { from: 'idx.out', to: 'scale.a' },
          { from: 'lift.out', to: 'scale.b' },
        ],
        inputMap: {},
        outputMap: { out: 'scale.out' },
      },
      exposedInputs: [],
      exposedOutputs: [{ id: 'out', label: 'Out', direction: 'output', slotType: 'Field<number>', nodeId: 'scale', nodePort: 'out' }],
    });

    // Re-register composites after adding the new one
    registerAllComposites();

    // Get first lane (should be Fields lane)
    const lanes = store.patchStore.lanes;
    const lane = lanes.find((l: any) => l.kind === 'Fields') ?? lanes[0];

    const compositeId = store.patchStore.addBlock(`composite:${def.id}`, lane.id, { factor: 2 });
    const debugId = store.patchStore.addBlock('debugOutput', lane.id, {});
    store.patchStore.connect(compositeId, 'out', debugId, 'field');

    const compiler = createCompilerService(store);
    const result = compiler.compile();
    if (!result.ok) {
      // Log errors for visibility when the test fails
      console.error('Composite compile errors:', result.errors);
    }
    expect(result.ok).toBe(true);
  });
});
