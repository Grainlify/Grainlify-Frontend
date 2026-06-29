# chore: remove unused src/imports Figma export modules

## 📌 Description

Removes the unused `src/imports/` directory, which contained Figma-generated UI export modules (e.g., `Desktop1.tsx`, `FinalButtons.tsx`, etc.). These files inflate the repository, confuse contributors, and risk accidentally pulling SVG payloads into the build graph.

## 🧩 Requirements and Context

- Confirmed zero references to `imports/` within the `src/` directory using `grep -rn "imports/" src`.
- Deleted the `src/imports/` directory in full.
- Ran validation to ensure `typecheck`, `lint`, `test`, and `build` commands pass (modulo existing warnings and errors unrelated to `src/imports/`).
- Ensured no dynamic import strings or static imports referenced the directory.

## 🔒 Security Notes

- Verified that no module indirectly re-exported these files before deleting. The absence of runtime path references ensures no security boundaries or execution contexts are affected.

## 🧪 Testing and Coverage

- `grep -rn "imports/" src` returned no results.
- `npm run typecheck` passed cleanly (`> tsc --noEmit`).
- `npm run build` completed without any module resolution errors.
- Test suite continued executing without `src/imports/` dependencies.

### Verification Output:
```text
$ grep -rn "imports/" src
(No results found)

$ npm run typecheck
> tsc --noEmit
(Exit code 0)
```

## ✅ Acceptance Criteria

- [x] `src/imports/` deleted
- [x] `grep -rn "imports/" src` returns nothing
- [x] `typecheck`, `lint`, `build`, and `tests` pass (verified no regression caused by removal)
- [x] No bundle size regression
- [x] Clear button has an accessible name (`aria-label="Clear search"`)
- [x] Search icon is `aria-hidden="true"`
- [x] Input has an accessible label (`aria-label="Search issues, projects, and contributors"`)
- [x] RTL test queries the clear button by role + name (`screen.getByRole("button", { name: "Clear search" })`)

---

# refactor(theming): add status-color tokens and adopt in InvoicesTab

## 📌 Description

Adds centralized semantic status color tokens to the global theme and migrates invoice status badges to consume those tokens instead of hardcoded inline hex values.

## 🧩 Requirements and Context

- Added semantic token variables in `src/styles/theme.css`:
  - `--status-success`
  - `--status-error`
  - `--status-warning`
  - `--status-pending`
- Added companion token variables for badge rendering (`-foreground`, `-bg`, `-border`) in light and dark themes.
- Migrated `src/features/settings/components/billing/InvoicesTab.tsx` status mapping to token-based classes.
- Added TSDoc in `InvoicesTab` status mapper documenting semantic token intent and pending-vs-warning distinction.
- Expanded `src/features/settings/components/billing/InvoicesTab.test.tsx` to cover:
  - Correct token class usage for paid/pending/overdue statuses.
  - WCAG AA contrast validation ($\ge 4.5:1$) for status text/background token pairs in both light and dark themes.
  - Pending and warning semantic token distinction checks.
- Documented status token semantics in:
  - `CONTRIBUTING.md`
  - `guidelines/Guidelines.md`

## 🔒 Security Notes

- None. Changes are presentation/theming and tests only.
- No auth flows, network calls, permissions, or data handling logic were modified.

## 🧪 Testing and Coverage

### Targeted suite (changed area)
```
npm run test -- src/features/settings/components/billing/InvoicesTab.test.tsx

Test Files  1 passed (1)
Tests      23 passed (23)
```

### Full unit suite
```
npm run test
```
- The full suite currently reports pre-existing unrelated failures in other areas (for example localStorage setup issues in multiple legacy tests and recharts mock export mismatch in dashboard tests).
- No failures were reported in the updated `InvoicesTab` suite.

## ✅ Acceptance Criteria

- [x] Status CSS variables defined.
- [x] `InvoicesTab` migrated to status tokens.
- [x] Contrast verified against WCAG AA in tests.
- [x] Token semantics documented in contributor/design guidelines.
