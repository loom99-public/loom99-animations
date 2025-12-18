import { describe, expect, it, beforeEach } from 'vitest';
import { createCompilerService } from '../compiler';
import { RootStore } from '../stores/RootStore';
import { registerComposite } from '../composites';
import { registerAllComposites } from '../composite-bridge';

describe('composite expansion', () => {
  beforeEach(() => {
    // Register all composites before each test
    registerAllComposites();
  });

  it('expands composite graph and passes params into internal nodes', () => {
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
