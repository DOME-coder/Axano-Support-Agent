/**
 * Root ESLint flat config.
 *
 * This is a baseline; each workspace (apps/widget, apps/dashboard,
 * services/api, packages/shared) extends and adds its own framework
 * plugins (Preact, Next, Nest, etc.) once those apps are scaffolded.
 *
 * Plugins are not yet installed — they are added per-workspace when
 * that workspace's package.json declares its dependencies.
 */

export default [
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      '.next/',
      '.turbo/',
      'coverage/',
      'services/agent/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
    },
  },
];
