/**
 * @file Bus Store
 * @description Manages signal buses and routing (publishers/listeners).
 */
import { makeObservable, observable, action } from 'mobx';
import type {
  Bus,
  Publisher,
  Listener,
  AdapterStep,
  TypeDescriptor,
  BusCombineMode,
  BlockId,
} from '../types';
import type { RootStore } from './RootStore';

export class BusStore {
  buses: Bus[] = [];
  publishers: Publisher[] = [];
  listeners: Listener[] = [];

  root: RootStore;

  constructor(root: RootStore) {
    this.root = root;
    makeObservable(this, {
      buses: observable,
      publishers: observable,
      listeners: observable,
      createBus: action,
      deleteBus: action,
      updateBus: action,
      addPublisher: action,
      updatePublisher: action,
      removePublisher: action,
      addListener: action,
      updateListener: action,
      removeListener: action,
      reorderPublisher: action,
    });
  }

  /**
   * Get bus by ID.
   */
  getBusById(id: string): Bus | null {
    return this.buses.find((b) => b.id === id) ?? null;
  }

  // =============================================================================
  // Actions - Bus Management
  // =============================================================================

  /**
   * Create a new bus.
   */
  createBus(
    typeDesc: TypeDescriptor,
    name: string,
    combineMode: BusCombineMode,
    defaultValue?: any
  ): string {
    // Check for duplicate name (case-insensitive)
    const normalizedName = name.toLowerCase();
    if (this.buses.some(b => b.name.toLowerCase() === normalizedName)) {
      throw new Error(`Bus name "${name}" already exists`);
    }

    const bus: Bus = {
      id: this.root.generateId('bus'),
      name,
      type: typeDesc,
      combineMode,
      defaultValue,
      sortKey: this.buses.length,
    };

    this.buses.push(bus);
    return bus.id;
  }

  /**
   * Delete a bus and all its routing.
   */
  deleteBus(busId: string): void {
    // Remove bus
    this.buses = this.buses.filter(b => b.id !== busId);

    // Remove all publishers and listeners for this bus
    this.publishers = this.publishers.filter(p => p.busId !== busId);
    this.listeners = this.listeners.filter(l => l.busId !== busId);

    // Deselect if selected
    if (this.root.uiStore.uiState.selectedBusId === busId) {
      this.root.uiStore.uiState.selectedBusId = null;
    }
  }

  /**
   * Update bus properties.
   */
  updateBus(busId: string, updates: Partial<Pick<Bus, 'name' | 'combineMode' | 'defaultValue'>>): void {
    const bus = this.buses.find(b => b.id === busId);
    if (!bus) {
      throw new Error(`Bus ${busId} not found`);
    }

    if (updates.name !== undefined) bus.name = updates.name;
    if (updates.combineMode !== undefined) bus.combineMode = updates.combineMode;
    if (updates.defaultValue !== undefined) bus.defaultValue = updates.defaultValue;
  }

  // =============================================================================
  // Actions - Routing Management
  // =============================================================================

  /**
   * Add a publisher from an output to a bus.
   */
  addPublisher(
    busId: string,
    blockId: BlockId,
    port: string,
    adapterChain?: AdapterStep[]
  ): string {
    const bus = this.buses.find(b => b.id === busId);
    if (!bus) {
      throw new Error(`Bus ${busId} not found`);
    }

    // Get next sort key
    const maxSortKey = this.publishers
      .filter(p => p.busId === busId)
      .reduce((max, p) => Math.max(max, p.sortKey), 0);

    const publisher: Publisher = {
      id: this.root.generateId('pub'),
      busId,
      from: { blockId, port },
      adapterChain,
      enabled: true,
      sortKey: maxSortKey + 10,
    };

    this.publishers.push(publisher);
    return publisher.id;
  }

  /**
   * Update publisher properties.
   */
  updatePublisher(publisherId: string, updates: Partial<Pick<Publisher, 'enabled' | 'sortKey'>>): void {
    const publisher = this.publishers.find(p => p.id === publisherId);
    if (!publisher) {
      throw new Error(`Publisher ${publisherId} not found`);
    }

    if (updates.enabled !== undefined) publisher.enabled = updates.enabled;
    if (updates.sortKey !== undefined) publisher.sortKey = updates.sortKey;
  }

  /**
   * Remove a publisher.
   */
  removePublisher(publisherId: string): void {
    this.publishers = this.publishers.filter(p => p.id !== publisherId);
  }

  /**
   * Add a listener from a bus to an input.
   */
  addListener(
    busId: string,
    blockId: BlockId,
    port: string,
    adapterChain?: AdapterStep[]
  ): string {
    const bus = this.buses.find(b => b.id === busId);
    if (!bus) {
      throw new Error(`Bus ${busId} not found`);
    }

    const listener: Listener = {
      id: this.root.generateId('list'),
      busId,
      to: { blockId, port },
      adapterChain,
      enabled: true,
    };

    this.listeners.push(listener);
    return listener.id;
  }

  /**
   * Update listener properties.
   */
  updateListener(listenerId: string, updates: Partial<Pick<Listener, 'enabled'>>): void {
    const listener = this.listeners.find(l => l.id === listenerId);
    if (!listener) {
      throw new Error(`Listener ${listenerId} not found`);
    }

    if (updates.enabled !== undefined) listener.enabled = updates.enabled;
  }

  /**
   * Remove a listener.
   */
  removeListener(listenerId: string): void {
    this.listeners = this.listeners.filter(l => l.id !== listenerId);
  }

  /**
   * Reorder publishers within a bus.
   */
  reorderPublisher(publisherId: string, newSortKey: number): void {
    const publisher = this.publishers.find(p => p.id === publisherId);
    if (!publisher) {
      throw new Error(`Publisher ${publisherId} not found`);
    }

    const oldSortKey = publisher.sortKey;
    publisher.sortKey = newSortKey;

    // Adjust other publishers in the same bus
    this.publishers
      .filter(p => p.busId === publisher.busId && p.id !== publisherId)
      .forEach(p => {
        if (oldSortKey < newSortKey && p.sortKey > oldSortKey && p.sortKey <= newSortKey) {
          p.sortKey--;
        } else if (oldSortKey > newSortKey && p.sortKey < oldSortKey && p.sortKey >= newSortKey) {
          p.sortKey++;
        }
      });
  }

  // =============================================================================
  // Query Methods - Bus Routing
  // =============================================================================

  /**
   * Get all publishers for a bus.
   */
  getPublishersByBus(busId: string): Publisher[] {
    return this.publishers
      .filter(p => p.busId === busId)
      .sort((a, b) => a.sortKey - b.sortKey);
  }

  /**
   * Get all listeners for a bus.
   */
  getListenersByBus(busId: string): Listener[] {
    return this.listeners.filter(l => l.id === busId);
  }

  /**
   * Get publishers for a specific block output port.
   */
  getPublishersByOutput(blockId: BlockId, port: string): Publisher[] {
    return this.publishers.filter(
      p => p.from.blockId === blockId && p.from.port === port
    );
  }

  /**
   * Get listeners for a specific block input port.
   */
  getListenersByInput(blockId: BlockId, port: string): Listener[] {
    return this.listeners.filter(
      l => l.to.blockId === blockId && l.to.port === port
    );
  }

  /**
   * Find all buses matching a type descriptor.
   */
  findBusesByTypeDesc(typeDesc: TypeDescriptor): Bus[] {
    return this.buses.filter(b =>
      b.type.world === typeDesc.world && b.type.domain === typeDesc.domain
    );
  }
}
