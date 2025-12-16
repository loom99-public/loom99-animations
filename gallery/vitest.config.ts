import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom', // lighter than jsdom, less memory issues
    globals: true,
    setupFiles: './src/__tests__/setup.ts',
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        isolate: true,
      },
    },
    exclude: ['**/to-delete/**', '**/node_modules/**', '**/dist/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/anim-v4/**/*.ts'],
      exclude: ['**/*.test.ts', '**/__tests__/**', '**/to-delete/**'],
    },
  },
});
