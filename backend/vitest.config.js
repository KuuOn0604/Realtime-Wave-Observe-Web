import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration cho Backend (Node.js ESM)
 *
 * - Environment: node (không cần DOM)
 * - Globals: true — dùng describe/it/expect mà không cần import
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js', 'tests/**/*.spec.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      exclude: ['node_modules/**', 'tests/**'],
    },
  },
});
