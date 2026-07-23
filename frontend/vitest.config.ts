/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Vitest configuration cho Frontend (React 19 + TypeScript)
 *
 * - Environment: jsdom (giả lập DOM browser trong Node.js)
 * - Setup file: tự động import @testing-library/jest-dom matchers
 * - Coverage: v8 provider (nhanh, không cần Babel)
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false, // Bỏ qua CSS trong test — tăng tốc đáng kể
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.d.ts',
        'vite.config.ts',
        'vitest.config.ts',
      ],
    },
  },
});
