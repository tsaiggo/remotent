import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';
import reactX from 'eslint-plugin-react-x';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      globals: { ...globals.browser },
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Downgraded from `recommended`'s default `error` so the existing
      // renderer ships without runtime edits in this scaffolding PR.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'separate-type-imports', prefer: 'type-imports' },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-x': reactX,
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactX.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    files: ['vite.config.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ['eslint.config.js'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  prettier,
  {
    ignores: ['dist/**', '.vite/**', 'node_modules/**', 'assets/**', 'storybook-static/**'],
  },
);
