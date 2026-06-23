# CI: Add lint/typecheck/test/build GitHub Actions workflow

## 📌 Description

Adds a CI workflow (`.github/workflows/ci.yml`) that runs on every pull request to `main` and on direct pushes to `main`, executing lint, typecheck, test (with coverage), and build — ensuring no broken code merges unnoticed.

## 🔍 Problem

The repository defines `lint`, `typecheck`, `test`, `test:coverage`, and `build` scripts in `package.json` and has a Playwright config, but `.github/` contained only `dependabot.yml` — there was no CI workflow running these checks on pull requests. Without CI, broken lint, types, or tests could merge undetected.

## ✅ Solution

### 1. `.github/workflows/ci.yml` — New CI workflow
- ✅ Triggers on `pull_request` and `push` to `main`
- ✅ Runs `pnpm install --frozen-lockfile` (deterministic, matches lockfile exactly)
- ✅ Runs `pnpm run lint` — ESLint static analysis
- ✅ Runs `pnpm run typecheck` — TypeScript type checking (`tsc --noEmit`)
- ✅ Runs `pnpm run test:coverage` — Vitest with coverage (95% threshold enforced)
- ✅ Runs `pnpm run build` — Vite production build

### 2. README.md — CI status badge
- ✅ Added [![CI](https://github.com/Phantomcall/Grainlify-Frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/Phantomcall/Grainlify-Frontend/actions/workflows/ci.yml) badge

## 🔒 Security Notes

- **Pinned actions**: All third-party actions (`actions/checkout@v4`, `actions/setup-node@v4`, `pnpm/action-setup@v4`) are pinned to major version tags — Dependabot is already configured to monitor GitHub Actions updates via the existing `dependabot.yml`.
- **Minimal permissions**: `GITHUB_TOKEN` is scoped to `contents: read` — the workflow never needs write access.
- **Deterministic installs**: `--frozen-lockfile` prevents dependency drift.

## 🧪 Testing

The workflow is self-validating — once merged, it will run on every PR and push to `main`. A green run on this PR itself serves as the test.

### Local verification commands (all pass):
```bash
pnpm run lint
pnpm run typecheck
pnpm run test:coverage
pnpm run build
```

## 📊 Changes

```
.github/workflows/ci.yml | 71 ++++++++++++++++++++++++++
README.md                |  2 ++
2 files changed, 73 insertions(+)
```

## ✅ Acceptance Criteria

- [x] Workflow runs on PRs to the default branch (`main`)
- [x] Lint, typecheck, test (with coverage), and build all run
- [x] pnpm dependency caching configured
- [x] Third-party actions pinned to versions
- [x] Minimal `contents: read` permission for `GITHUB_TOKEN`

## 🔗 Related Issue

Closes #198
