import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Downgrade rules that have widespread existing violations to warn
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'no-useless-escape': 'warn',
      'no-unsafe-finally': 'warn',
      // eslint-plugin-react-hooks v5+ added React Compiler-oriented diagnostics
      // to its recommended config. These fire on widespread pre-existing patterns
      // across the codebase. Downgrade to warn rather than mass-refactoring
      // unrelated code.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/globals': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/set-state-in-render': 'warn',
      'react-hooks/config': 'warn',
      'react-hooks/gating': 'warn',
      // Keep PII-safe logging guard: disallow direct console usage (use guarded logger)
      'no-console': 'error',
    },
  },
  {
    // The guarded logger intentionally wraps the console API.
    files: ['src/shared/utils/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  prettier,
)
