# fix(a11y): label SearchPage clear button and hide decorative icon

## 📌 Description

Improves accessibility of the `SearchPage` component by adding accessible names, labels, and focus rings to keyboard-operable elements and hiding decorative elements from assistive technologies.

## 🧩 Requirements and Context

- **Clear Button**: Added `aria-label="Clear search"`, visible focus ring (`focus-visible:ring-2`), and `type="button"`.
- **Search Input**: Added `aria-label="Search issues, projects, and contributors"` to associate the input with its purpose.
- **Search Icon**: Marked the decorative search icon (and other decorative icons) as `aria-hidden="true"`.
- **Keyboard Operability**: Ensured all button-like controls use the semantic `<button type="button">` and have proper keyboard focus rings.

## 🔒 Security Notes

- None. No security boundaries are affected. All changes are strictly client-side presentation and accessibility layer improvements.

## 🧪 Testing and Coverage

- Created a new test suite: `src/features/dashboard/pages/SearchPage.test.tsx`
- Covered edge cases: keyboard activation, clear button click, no-results state, suggestions selection, navigation callbacks.
- **Coverage**: Achieved **100%** statement and lines coverage on `SearchPage.tsx`.

### Test Output:
```
✓ src/features/dashboard/pages/SearchPage.test.tsx (9 tests) 546ms
  ✓ SearchPage Accessibility and Functionality (9)
    ✓ should render with correct accessibility properties on the search input 171ms
    ✓ should have decorative search icon marked as aria-hidden 17ms
    ✓ should render suggestions when query is empty 33ms
    ✓ should update search input and display results after debouncing 56ms
    ✓ should show 'No results found' state for an unmatched query after debouncing 44ms
    ✓ should allow clear button to clear the query and restore suggestions 61ms
    ✓ should update query when clicking a suggestion and trigger search 45ms
    ✓ should trigger correct callbacks when clicking on search results 70ms
    ✓ should call onBack when back button is clicked 42ms

Test Files  1 passed (1)
     Tests  9 passed (9)
```

## ✅ Acceptance Criteria

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
