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
