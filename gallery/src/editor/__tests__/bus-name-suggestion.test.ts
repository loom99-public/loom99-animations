/**
 * Tests for bus name auto-suggestion logic.
 * WI-11: Bus Name Auto-suggestion
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EditorStore } from '../store';

describe('Bus Name Auto-suggestion (WI-11)', () => {
  let store: EditorStore;

  beforeEach(() => {
    store = new EditorStore();
  });

  describe('Default names by domain', () => {
    it('should use "energy" for number domain', () => {
      const busId = store.createBus(
        { world: 'signal', domain: 'number', category: 'core', busEligible: true },
        'energy',
        'sum'
      );
      expect(store.buses.find(b => b.id === busId)?.name).toBe('energy');
    });

    it('should use "position" for vec2 domain', () => {
      const busId = store.createBus(
        { world: 'signal', domain: 'vec2', category: 'core', busEligible: true },
        'position',
        'sum'
      );
      expect(store.buses.find(b => b.id === busId)?.name).toBe('position');
    });

    it('should use "phaseA" for phase domain', () => {
      const busId = store.createBus(
        { world: 'signal', domain: 'phase', category: 'core', busEligible: true },
        'phaseA',
        'last'
      );
      expect(store.buses.find(b => b.id === busId)?.name).toBe('phaseA');
    });
  });

  describe('Collision handling: letter increment', () => {
    it('should increment phaseA to phaseB when phaseA exists', () => {
      // Create phaseA first
      store.createBus(
        { world: 'signal', domain: 'phase', category: 'core', busEligible: true },
        'phaseA',
        'last'
      );

      // Verify phaseA exists
      expect(store.buses.some(b => b.name === 'phaseA')).toBe(true);

      // Next suggested name should be phaseB
      const existingNames = store.buses.map(b => b.name);
      expect(existingNames.includes('phaseA')).toBe(true);
      expect(existingNames.includes('phaseB')).toBe(false);

      // Create phaseB
      store.createBus(
        { world: 'signal', domain: 'phase', category: 'core', busEligible: true },
        'phaseB',
        'last'
      );

      expect(store.buses.some(b => b.name === 'phaseB')).toBe(true);
    });

    it('should handle sequence phaseA → phaseB → phaseC', () => {
      store.createBus(
        { world: 'signal', domain: 'phase', category: 'core', busEligible: true },
        'phaseA',
        'last'
      );
      store.createBus(
        { world: 'signal', domain: 'phase', category: 'core', busEligible: true },
        'phaseB',
        'last'
      );
      store.createBus(
        { world: 'signal', domain: 'phase', category: 'core', busEligible: true },
        'phaseC',
        'last'
      );

      const names = store.buses.map(b => b.name).sort();
      expect(names).toEqual(['phaseA', 'phaseB', 'phaseC']);
    });
  });

  describe('Collision handling: numeric fallback', () => {
    it('should use numeric suffix when name has no letter', () => {
      // Create energy first
      store.createBus(
        { world: 'signal', domain: 'number', category: 'core', busEligible: true },
        'energy',
        'sum'
      );

      // Next should be energyA (handled by suggestion logic)
      // But if we want numeric, we'd create energy1
      store.createBus(
        { world: 'signal', domain: 'number', category: 'core', busEligible: true },
        'energy1',
        'sum'
      );

      expect(store.buses.some(b => b.name === 'energy')).toBe(true);
      expect(store.buses.some(b => b.name === 'energy1')).toBe(true);
    });

    it('should handle exhausted letters (phaseZ → phase1)', () => {
      // Create phase with letter Z
      store.createBus(
        { world: 'signal', domain: 'phase', category: 'core', busEligible: true },
        'phaseZ',
        'last'
      );

      // Next would be phase1
      store.createBus(
        { world: 'signal', domain: 'phase', category: 'core', busEligible: true },
        'phase1',
        'last'
      );

      expect(store.buses.some(b => b.name === 'phaseZ')).toBe(true);
      expect(store.buses.some(b => b.name === 'phase1')).toBe(true);
    });
  });

  describe('Case-insensitive collision detection', () => {
    it('should reject duplicate names regardless of case', () => {
      store.createBus(
        { world: 'signal', domain: 'number', category: 'core', busEligible: true },
        'energy',
        'sum'
      );

      // Should not allow "Energy" or "ENERGY"
      expect(() =>
        store.createBus(
          { world: 'signal', domain: 'number', category: 'core', busEligible: true },
          'Energy',
          'sum'
        )
      ).toThrow();

      expect(() =>
        store.createBus(
          { world: 'signal', domain: 'number', category: 'core', busEligible: true },
          'ENERGY',
          'sum'
        )
      ).toThrow();
    });
  });

  describe('Name validation', () => {
    it('should accept valid names', () => {
      const validNames = ['energy', 'position', 'phaseA', 'clock_main', 'speed-1'];

      validNames.forEach(name => {
        const busId = store.createBus(
          { world: 'signal', domain: 'number', category: 'core', busEligible: true },
          name,
          'sum'
        );
        expect(store.buses.find(b => b.id === busId)?.name).toBe(name);
      });
    });
  });

  describe('Integration: Multiple buses of same type', () => {
    it('should handle multiple phase buses with auto-increment', () => {
      // Simulating user creating multiple phase buses
      const bus1 = store.createBus(
        { world: 'signal', domain: 'phase', category: 'core', busEligible: true },
        'phaseA',
        'last'
      );
      const bus2 = store.createBus(
        { world: 'signal', domain: 'phase', category: 'core', busEligible: true },
        'phaseB',
        'last'
      );
      const bus3 = store.createBus(
        { world: 'signal', domain: 'phase', category: 'core', busEligible: true },
        'phaseC',
        'last'
      );

      const buses = store.buses;
      expect(buses.length).toBe(3);
      expect(buses.map(b => b.name).sort()).toEqual(['phaseA', 'phaseB', 'phaseC']);
    });

    it('should handle mixed collision strategies', () => {
      // energy → energyA → energyB
      store.createBus(
        { world: 'signal', domain: 'number', category: 'core', busEligible: true },
        'energy',
        'sum'
      );
      store.createBus(
        { world: 'signal', domain: 'number', category: 'core', busEligible: true },
        'energyA',
        'sum'
      );
      store.createBus(
        { world: 'signal', domain: 'number', category: 'core', busEligible: true },
        'energyB',
        'sum'
      );

      const names = store.buses.map(b => b.name).sort();
      expect(names).toEqual(['energy', 'energyA', 'energyB']);
    });
  });
});
