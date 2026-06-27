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
      // Keep PII-safe logging guard: disallow direct console usage (use guarded logger)
      'no-console': 'error',
      // Disallow raw fetch() outside the centralised API client.
      // Every request must go through apiRequest() so auth headers,
      // error handling, correlation IDs, and the 401 clear-redirect
      // flow are applied consistently.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name="fetch"]',
          message:
            'Use apiRequest() from src/shared/api/client.ts instead of raw fetch().',
        },
        {
          selector:
            'CallExpression[callee.object.name="localStorage"][callee.property.name="getItem"][arguments.0.value="patchwork_jwt"]',
          message:
            'Use getAuthToken() from src/shared/api/client.ts to read the JWT.',
        },
        {
          selector:
            'CallExpression[callee.object.name="localStorage"][callee.property.name="setItem"][arguments.0.value="patchwork_jwt"]',
          message:
            'Use setAuthToken() from src/shared/api/client.ts to store the JWT.',
        },
        {
          selector:
            'CallExpression[callee.object.name="localStorage"][callee.property.name="removeItem"][arguments.0.value="patchwork_jwt"]',
          message:
            'Use removeAuthToken() from src/shared/api/client.ts to clear the JWT.',
        },
      ],
    },
  },
  {
    // The guarded logger intentionally wraps the console API.
    files: ['src/shared/utils/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // The centralised API client and config are allowed to call fetch
    // and to read/store the JWT token directly.
    files: ['src/shared/api/client.ts', 'src/shared/config/api.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    // Test files mock the API client and need to set up token state
    // directly in localStorage to verify AuthContext behaviour.
    files: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  prettier,
)
