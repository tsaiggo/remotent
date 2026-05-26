import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      // app.js is a classic IIFE-wrapped browser script, not an ES module.
      sourceType: 'script',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // Downgraded from `recommended`'s default `error` so the existing
      // renderer ships without runtime edits in this scaffolding PR.
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['vite.config.js', 'eslint.config.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  {
    ignores: ['dist/**', '.vite/**', 'node_modules/**', 'assets/**'],
  },
];
