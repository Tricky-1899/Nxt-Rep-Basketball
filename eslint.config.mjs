// ESLint config for the site's browser JavaScript (/assets/*.js).
// Run in CI by .github/workflows/lint-and-security.yml.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', '.github/**'] },
  js.configs.recommended,
  {
    files: ['assets/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'script',          // plain <script> files, not modules
      globals: { ...globals.browser }
    },
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Ban innerHTML/outerHTML/document.write: write text with textContent instead (XSS).
      'no-restricted-properties': ['error',
        { property: 'innerHTML', message: 'Use textContent or DOM methods (XSS risk).' },
        { property: 'outerHTML', message: 'Use DOM methods (XSS risk).' },
        { object: 'document', property: 'write', message: 'document.write is unsafe and blocks rendering.' }
      ]
    }
  }
];
