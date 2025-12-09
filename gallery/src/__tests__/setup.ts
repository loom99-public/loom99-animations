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

// Mock time for deterministic testing
let mockTime = 0;
const rafCallbacks: Array<(time: number) => void> = [];
let rafId = 1;

// Mock requestAnimationFrame to execute callbacks immediately with mock time
global.requestAnimationFrame = vi.fn((callback: (time: number) => void) => {
  const id = rafId++;
  // Execute callback immediately with current mock time
  Promise.resolve().then(() => {
    callback(mockTime);
  });
  return id;
}) as any;

global.cancelAnimationFrame = vi.fn((id: number) => {
  // No-op since we execute immediately
}) as any;

// Mock performance.now() for deterministic timing
global.performance.now = vi.fn(() => mockTime);

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
