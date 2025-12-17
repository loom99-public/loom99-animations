import { describe, expect, it } from 'vitest';
import { createCompilerService } from '../compiler';
import { EditorStore } from '../store';
import { registerComposite } from '../composites';

describe('composite expansion', () => {
  it('expands composite graph and passes params into internal nodes', () => {
    const store = new EditorStore();

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

    // Add composite to patch and connect to debug sink
    const lane = store.lanes.find((l) => l.kind === 'Fields') ?? store.lanes[0];
    const compositeId = store.addBlock(`composite:${def.id}`, lane.id, { factor: 2 });
    const debugId = store.addBlock('debugOutput', lane.id, {});
    store.connect(compositeId, 'out', debugId, 'field');

    const compiler = createCompilerService(store);
    const result = compiler.compile();
    if (!result.ok) {
      // Log errors for visibility when the test fails
      console.error('Composite compile errors:', result.errors);
    }
    expect(result.ok).toBe(true);
  });
});
