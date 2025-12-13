/**
 * FieldToSignal Block Compiler
 *
 * Converts Field<A> to Signal<A> by freezing at compile time.
 * Note: This is a simplified adapter; full signal support needs more infrastructure.
 */

import type { BlockCompiler, Field } from '../../types';

export const FieldToSignalBlock: BlockCompiler = {
  type: 'FieldToSignal',
  inputs: [{ name: 'field', type: { kind: 'Field:number' }, required: true }],
  outputs: [{ name: 'signal', type: { kind: 'Scalar:number' } }],

  compile({ inputs, ctx }) {
    if (inputs.field?.kind !== 'Field:number') {
      return {
        signal: { kind: 'Error', message: 'FieldToSignal: input must be Field:number' },
      };
    }

    const field = inputs.field.value as Field<number>;

    // Evaluate the field at compile time for a single element
    // This "freezes" the field value as a constant
    const values = field(42, 1, ctx);
    const value = values[0] ?? 0;

    return { signal: { kind: 'Scalar:number', value } };
  },
};
