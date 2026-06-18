/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
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
  test: {
    // jsdom gives component tests a DOM; node-only tests still work under it.
    // Tests can still opt into a different environment per-file via a
    // `// @vitest-environment <env>` docblock.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts', './src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      include: [
        'src/shared/components/ui/Modal.tsx',
        'src/shared/components/GlassDropdown.tsx',
        'src/shared/components/FilterDropdown.tsx',
        'src/shared/components/SearchModal.tsx',
        'src/shared/utils/focusTrap.ts',
      ],
    },
  },
})
