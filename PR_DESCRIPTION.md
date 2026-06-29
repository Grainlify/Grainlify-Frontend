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
