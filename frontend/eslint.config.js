import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier/recommended';
import { defineConfig, globalIgnores } from 'eslint/config';

/**
 * ESLint Flat Config — Frontend (React 19 + TypeScript)
 *
 * Thứ tự quan trọng:
 *  1. JS/TS rules (recommended)
 *  2. React-specific rules (hooks, refresh)
 *  3. Prettier CUỐI CÙNG — disable các ESLint rules xung đột với Prettier
 *     và thêm rule "prettier/prettier" để ESLint report Prettier violations.
 */
export default defineConfig([
  // Bỏ qua thư mục build output
  globalIgnores(['dist', 'coverage', 'node_modules']),

  // ── TypeScript + React rules ──────────────────────────────────────────────
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Custom rules bổ sung
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'warn',
    },
  },

  // ── Prettier (phải để CUỐI để override các formatting rules ở trên) ────────
  // eslint-plugin-prettier/recommended tự động:
  //   - extends eslint-config-prettier (tắt rules xung đột)
  //   - bật rule prettier/prettier (ESLint báo lỗi khi format sai)
  prettierPlugin,
]);
