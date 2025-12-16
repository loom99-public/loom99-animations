/**
 * Vitest setup file
 * Run before all tests
 */

import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Provide a minimal localStorage stub for non-browser test environments
const needsLocalStorageStub =
  typeof globalThis.localStorage === 'undefined' ||
  typeof globalThis.localStorage.getItem !== 'function';

if (needsLocalStorageStub) {
  const storage = new Map<string, string>();
  globalThis.localStorage = {
    get length() {
      return storage.size;
    },
    clear: () => storage.clear(),
    getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    removeItem: (key: string) => {
      storage.delete(key);
    },
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  } as Storage;
}

// Mock time for deterministic testing
let mockTime = 0;
let rafId = 1;

// Mock requestAnimationFrame to execute callbacks immediately with mock time
globalThis.requestAnimationFrame = vi.fn((callback: (time: number) => void) => {
  const id = rafId++;
  // Execute callback immediately with current mock time
  Promise.resolve().then(() => {
    callback(mockTime);
  });
  return id;
}) as typeof globalThis.requestAnimationFrame;

globalThis.cancelAnimationFrame = vi.fn((_id: number) => {
  // No-op since we execute immediately
}) as typeof globalThis.cancelAnimationFrame;

// Mock performance.now() for deterministic timing
globalThis.performance.now = vi.fn(() => mockTime);

// Helper to advance time in tests
export function advanceTime(ms: number): Promise<void> {
  mockTime += ms;
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

// Helper to reset mock time
export function resetMockTime(): void {
  mockTime = 0;
  rafId = 1;
}
