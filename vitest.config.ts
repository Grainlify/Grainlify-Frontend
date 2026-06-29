import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/cypress/**', '**/.{idea,git,cache,output,temp}/**'],
    // Provide the backend URL the app config validates at import time so tests
    // that pull in the shared module barrel don't trip env validation.
    env: {
      VITE_API_BASE_URL: 'http://localhost:8080',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      // Broaden inclusion to all shared and features source to reflect true surface.
      // Exclude tests, generated code, and assets to keep the report focused on logic.
      include: ['src/shared/**/*.{ts,tsx}', 'src/features/**/*.{ts,tsx}'],
      exclude: [
        // test files and infrastructure
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/test/**',
        'src/test-setup.ts',
        'src/**/*.d.ts',
        // app entry point — wires providers, no logic to test
        'src/main.tsx',
        // vendored shadcn/ui components — third-party generated code
        'src/app/components/ui/**',
        // Figma-generated import files — not hand-authored logic
        'src/imports/**',
        // styles and assets
        '**/*.{css,scss,sass,less,svg,png,jpg,jpeg,gif,webp,ico}',
      ],
      thresholds: {
        lines: 47,
        functions: 38,
        branches: 33,
        statements: 46,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
