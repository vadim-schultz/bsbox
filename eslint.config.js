import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.astro/**',
      '**/.wrangler/**',
      '.e2e-state/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/node_modules/**',
      '.plans/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { import: importPlugin },
    settings: {
      'import/resolver': { node: { extensions: ['.ts', '.tsx', '.js', '.mjs'] } },
    },
    rules: {
      // Dependency direction (architecture section 5).
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './packages/shared',
              from: './apps',
              message: 'packages/shared must not import any app.',
            },
            {
              target: './packages/shared',
              from: './packages/addin',
              message: 'packages/shared must not import addin.',
            },
            {
              target: './apps/web',
              from: './apps/worker',
              message: 'apps/web must not import apps/worker.',
            },
          ],
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@bsbox/worker', '@bsbox/worker/*'], message: 'No imports of apps/worker.' },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/shared/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@bsbox/worker*', '@bsbox/web*', '@bsbox/docs*', '@bsbox/addin*'],
              message: 'shared imports no app.',
            },
          ],
        },
      ],
    },
  },
);
