import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// The deployed commit, taken from whichever platform built this. Vercel sets
// VERCEL_GIT_COMMIT_SHA; the others are accepted so the check survives the
// service moving rather than silently reporting "unknown".
const BUILD_COMMIT =
  process.env.VITE_BUILD_COMMIT ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GIT_COMMIT_SHA ||
  process.env.COMMIT_SHA ||
  'unknown'

export default defineConfig({
  plugins: [
    {
      // Replaces the %VITE_BUILD_COMMIT% placeholder in index.html. Done as a
      // transform rather than a define because it has to land in the HTML
      // itself: a check that must run JavaScript to read the version cannot
      // distinguish "old build" from "build broken".
      name: 'html-build-commit',
      transformIndexHtml(html: string) {
        return html.replace(/%VITE_BUILD_COMMIT%/g, BUILD_COMMIT)
      },
    },
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  // console.log, .debug and .info are dropped from production builds.
  //
  // Not drop: ['console'], which would take console.error and console.warn
  // with it. Those 77 sites are clean and useful - they log Errors, component
  // stacks and public response shapes - and losing them would be a real cost
  // paid to fix a different problem.
  //
  // WHY A BUILD SETTING RATHER THAN A CONVENTION. A session JWT was printed
  // to the console at every sign-in for months, on a line directly above one
  // that carefully masked the same token as 'Present'/'Missing'. The author
  // knew it was sensitive. The full URL just did not read as "the token"
  // while it was being written. A rule does not reach someone who already
  // understood the rule.
  //
  // THIS PROTECTION IS A PROPERTY OF MINIFIED BUILDS. `pure` lets the
  // minifier drop these calls; it does not remove them itself. Set
  // build.minify: false - as somebody debugging a build issue reasonably
  // might - and every log comes back, in an artefact that can still be
  // deployed. Dev is unminified too, which is the half we want: local
  // logging keeps working.
  esbuild: {
    pure: ['console.log', 'console.debug', 'console.info'],
  },
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
})
