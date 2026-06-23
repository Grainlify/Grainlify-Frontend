import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

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
      reporter: ['text', 'json', 'html'],
      include: [
        'src/shared/api/client.ts',
        'src/shared/components/AuthGuard.tsx',
        'src/shared/config/api.ts',
        'src/shared/contexts/AuthContext.tsx',
        'src/shared/hooks/useOptimisticData.ts',
        'src/shared/utils/errorHandler.ts',
        'src/shared/utils/projectFilter.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
