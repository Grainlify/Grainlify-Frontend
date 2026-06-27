/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    // Conditionally enable rollup-plugin-visualizer when ANALYZE environment variable is set.
    // This generates an HTML report of the bundle size to identify heavy dependencies.
    // It is disabled in standard production builds to avoid build overhead and ensure security.
    process.env.ANALYZE === 'true' &&
      visualizer({
        filename: 'dist/stats.html',
        title: 'Grainlify Bundle Analysis',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean) as any[],
  resolve: {
    alias: {
      // Ensure a single React instance is used everywhere
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    rollupOptions: {
      output: {
        // Isolate react-intl (and its @formatjs / intl-messageformat deps) into a
        // dedicated vendor chunk. react-intl is a stable dependency, so splitting
        // it out keeps the app's main `index-*.js` chunk lean and improves
        // long-term caching — the vendor chunk changes far less often than feature
        // code. This also keeps the measured main chunk within the CI bundle
        // budget after adding i18n. See README "Bundle Size and Analysis".
        manualChunks(id) {
          if (
            id.includes('react-intl') ||
            id.includes('@formatjs') ||
            id.includes('intl-messageformat')
          ) {
            return 'i18n-vendor'
          }
        },
      },
    },
  },
  test: {
    // jsdom gives component tests a DOM; node-only tests still work under it.
    // Tests can still opt into a different environment per-file via a
    // `// @vitest-environment <env>` docblock.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts', './src/test/setup.ts'],
    css: false,
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
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
})
