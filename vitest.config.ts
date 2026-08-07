import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],
    // Deterministic value for tests asserting exact request URLs.
    env: {
      VITE_API_BASE_URL: 'http://localhost:8080',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/shared/**/*.{ts,tsx}', 'src/features/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/test/**',
        'src/**/*.d.ts',
        'src/main.tsx',
        '**/*.{css,scss,sass,less,svg,png,jpg,jpeg,gif,webp,ico}',
      ],
      // Pinned a few points below the actual achieved coverage as of the
      // full test suite landing (lines 53.07 / functions 41.47 / branches
      // 43.59 / statements 50.46), so CI catches a real regression without
      // breaking on minor natural fluctuation. Ratchet up over time.
      thresholds: {
        lines: 51,
        functions: 39,
        branches: 41,
        statements: 48,
      },
    },
  },
  resolve: {
    alias: {
      // Mirror vite.config.ts exactly: force a single React instance so
      // component tests don't hit a duplicate-React-copy invariant violation.
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
})
