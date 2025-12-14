import { describe, expect, it } from 'vitest';
import { BLOCK_DEFINITIONS, getBlockTags } from '../blocks';

describe('block registry tags', () => {
  it('populates tags for every block definition', () => {
    expect(BLOCK_DEFINITIONS.length).toBeGreaterThan(0);

    for (const definition of BLOCK_DEFINITIONS) {
      const tags = getBlockTags(definition);

      expect(tags).toBeDefined();
      expect(tags.legacyCategory).toBe(definition.category);
      expect(tags.form).toBe(definition.form);
      expect(tags.subcategory).toBe(definition.subcategory);
      expect(tags.laneKind).toBe(definition.laneKind);
    }
  });

  it('retains lane flavor tags when present', () => {
    const withFlavor = BLOCK_DEFINITIONS.find((def) => def.laneFlavor);
    expect(withFlavor).toBeDefined();

    if (withFlavor) {
      const tags = getBlockTags(withFlavor);
      expect(tags.laneFlavor).toBe(withFlavor.laneFlavor);
    }
  });

  it('supports scalar and array tag values', () => {
    const sample = {
      ...BLOCK_DEFINITIONS[0],
      tags: { custom: ['a', 'b', true, 3], flag: true, weight: 2 },
    };

    const tags = getBlockTags(sample);
    expect(tags.custom).toEqual(['a', 'b', true, 3]);
    expect(tags.flag).toBe(true);
    expect(tags.weight).toBe(2);
  });
});
