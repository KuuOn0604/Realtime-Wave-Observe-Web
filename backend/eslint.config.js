import js from '@eslint/js';
import globals from 'globals';
import prettierPlugin from 'eslint-plugin-prettier/recommended';

export default [
  js.configs.recommended,
  prettierPlugin,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
