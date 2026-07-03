// eslint.config.js
import globals from 'globals'

import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

import tseslint from 'typescript-eslint'

import js from '@eslint/js'
import {
  defineConfig, 
  globalIgnores 
} from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
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
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*'],
              message: 'Use @/ imports instead of relative paths',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/engine/**/*.{ts,tsx}',
      'src/store/plannerStore.ts',
      'src/store/cloudStore.ts',
      'src/engine/simulate.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/ai/*', '*/ai/*'],
              message: 'The simulation core must not depend on AI modules (AI is a leaf).',
            },
          ],
        },
      ],
    },
  },
])