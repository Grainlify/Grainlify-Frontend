# Glassmorphism Landing Page

This is a code bundle for Glassmorphism Landing Page. The original project is available at https://www.figma.com/design/Q7mcDMFYoct92SkOWFAoCP/Glassmorphism-Landing-Page.

## Prerequisites

- **Node.js**: Latest LTS version (recommended: v20.x or higher)
- **pnpm**: Package manager (install globally with `npm install -g pnpm` if not already installed)

## Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` and set the required variables:
   - `VITE_API_BASE_URL`: Backend API URL (e.g., `http://localhost:8080`)
   - `VITE_FRONTEND_BASE_URL`: Frontend base URL (optional, defaults to current origin)

## Running the code

Run `pnpm run dev` to start the development server.

## Deployments and environments

`VITE_API_BASE_URL` is a **build-time** value: Vite inlines it into the bundle,
so it is compiled into the artifact rather than read at runtime. Changing it
requires a rebuild, and a wrong value ships silently — the app loads perfectly
and simply talks to the wrong backend.

That is not hypothetical. Production held `https://api.grainlify.0xo.in` after
the migration to `grainlify.com`, invisible to every search of every repository,
until the old hostname was retired and sign-in stopped. The check that finds it
is to read the deployed bundle rather than the source:

```sh
curl -s https://grainlify.com/ | grep -o '/assets/index-[^"]*\.js' \
  | xargs -I{} curl -s "https://grainlify.com{}" | grep -o 'https://api\.[a-z.]*'
```

### Preview deployments are deliberately non-functional

`VITE_API_BASE_URL` is set for **Production only**. Preview builds fall back to
`http://localhost:8080` and every API call fails.

This is a decision, not an oversight. There is no staging backend — Railway runs
a single `production` environment — so the only value that would make previews
work is the production API. A preview build talking to production reads and
writes real user data: a preview of the founding gate could assign somebody a
permanent wave, a preview of the KYC review card could reset a real
contributor's verification.

**Broken and harmless beats functional and unisolated.** Previews become usable
when a staging backend exists, and not before.

## Testing

```bash
pnpm run typecheck     # tsc --noEmit
pnpm run test          # vitest run
pnpm run test:coverage # vitest run --coverage
pnpm run test:e2e      # playwright test (local only, not run in CI)
```

CI (`.github/workflows/ci.yml`) runs typecheck, build, and test on every push/PR, and gates deploys on them passing.
