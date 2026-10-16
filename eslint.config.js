import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'no-restricted-syntax': [
        'warn',
        {
          selector: "NewExpression[callee.name='Date']",
          message:
            'Use src/utils/dateUtils (hojeLocal, mesCorrente, formatarDataLocal): new Date() depende do fuso do navegador.',
        },
      ],
    },
  },
  {
    files: ['src/utils/dateUtils.js'],
    rules: { 'no-restricted-syntax': 'off' },
  },
])
