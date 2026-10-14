#!/usr/bin/env bash
#
# A frontend mutation harness that checks itself before it reports anything.
#
# WHY THIS EXISTS
#
# Mutation-testing the frontend without a baseline guard produces confidently
# wrong verdicts in three ways:
#
#   1. An unrelated TypeScript error in the working tree makes `tsc --noEmit`
#      fail on the baseline before any mutation is applied. Every mutation then
#      reports "did not compile — inconclusive", inviting the reader to treat a
#      broken baseline as a property of the mutations.
#
#   2. A mutation anchor that matches nothing leaves the file unchanged, the
#      test suite passes against the unmutated code, and an unapplied patch is
#      misread as a survivor (or worse, a passing check).
#
#   3. Restoring with `git checkout` discards uncommitted work in the file under
#      test, or a failed restore leaves a mutation applied and poisons every
#      subsequent result.
#
# So this script refuses to report until it has established that the harness
# itself is working:
#
#   * Establish baseline: `pnpm typecheck && pnpm vitest run <target>` must
#     pass before the first mutation, or the run aborts before mutating anything.
#   * Per mutation: verify the anchor was found and the file's SHA-1 actually
#     changed before running any check.
#   * Distinguish three outcomes — `did not compile`, `test still passed`, and
#     `caught` — rather than collapsing compile failures and test failures into
#     a single non-zero exit code.
#   * Restore from a temporary copy (never `git checkout`), then re-verify the
#     baseline at the end and abort loudly if a restore failed.
#
# USAGE
#
#   scripts/mutate.sh <file> <test-target-or-cmd> [<control-perl-expr>] <label>::<perl-expr>...
#
# Examples:
#
#   scripts/mutate.sh src/features/notifications/NotificationsDropdown.tsx \
#     src/features/notifications/NotificationsDropdown.test.tsx \
#     'unread badge::s/unreadCount > 0/unreadCount < 0/' \
#     'mark all read::s/onMarkAllRead\(\)/void 0/'
#
#   # With an explicit control mutation (3rd arg without `::` when 4+ args are given):
#   scripts/mutate.sh src/app/routes.ts \
#     src/app/routes.test.ts \
#     's/export const/const/' \
#     'blog redirect::s/\/blog/\/wrong/'
#
# Environment overrides (useful for fast harness self-tests):
#   MUTATE_TYPECHECK_CMD  Command used to typecheck (default: "pnpm typecheck")
#   MUTATE_TEST_CMD       Command prefix when <test-target> is a file path
#                         (default: "pnpm vitest run")

set -uo pipefail

if [ "$#" -lt 3 ]; then
  sed -n '2,55p' "$0" | sed 's/^# \{0,1\}//'
  exit 64
fi

TARGET="$1"; shift
TEST_ARG="$1"; shift

if [ ! -f "$TARGET" ]; then
  echo "mutate: no such file: $TARGET" >&2
  exit 64
fi

CONTROL=""
if [ "$#" -ge 2 ] && [ "${1#*::}" = "$1" ]; then
  CONTROL="$1"
  shift
fi

TYPECHECK_CMD="${MUTATE_TYPECHECK_CMD:-pnpm typecheck}"
TEST_RUNNER="${MUTATE_TEST_CMD:-pnpm vitest run}"

BACKUP="$(mktemp -t mutate-baseline)"
cp "$TARGET" "$BACKUP"
BASELINE_SHA="$(shasum "$BACKUP" | cut -d' ' -f1)"
restore() { cp "$BACKUP" "$TARGET"; }
trap 'restore; rm -f "$BACKUP"' EXIT

run_typecheck() {
  eval "$TYPECHECK_CMD" >/dev/null 2>&1
}

run_tests() {
  if [ -e "$TEST_ARG" ]; then
    eval "$TEST_RUNNER \"$TEST_ARG\"" >/dev/null 2>&1
    return
  fi
  case "$TEST_ARG" in
    *" "*|true|false)
      eval "$TEST_ARG" >/dev/null 2>&1
      ;;
    *.test.*|*.spec.*|src/*|./*)
      eval "$TEST_RUNNER \"$TEST_ARG\"" >/dev/null 2>&1
      ;;
    *)
      eval "$TEST_ARG" >/dev/null 2>&1
      ;;
  esac
}

# Three-way outcome of the current working tree:
#   did_not_compile | caught | test_still_passed
outcome() {
  if ! run_typecheck; then
    echo "did_not_compile"
    return
  fi
  if ! run_tests; then
    echo "caught"
    return
  fi
  echo "test_still_passed"
}

apply() {
  local expr="$1"
  local before after
  before="$(shasum "$TARGET" | cut -d' ' -f1)"
  perl -0pi -e "$expr" "$TARGET"
  after="$(shasum "$TARGET" | cut -d' ' -f1)"
  [ "$before" != "$after" ]
}

echo "=== baseline ==="
baseline_outcome="$(outcome)"
if [ "$baseline_outcome" = "did_not_compile" ]; then
  echo "  ABORT: the baseline does not compile (typecheck failed). Nothing measured here would mean anything."
  exit 1
fi
if [ "$baseline_outcome" != "test_still_passed" ]; then
  echo "  ABORT: the baseline does not pass. Nothing measured here would mean anything."
  exit 1
fi
echo "  baseline passes"

if [ -n "$CONTROL" ]; then
  echo ""
  echo "=== control (must be killed, or the run is void) ==="
  if ! apply "$CONTROL"; then
    echo "  ABORT: the control expression did not change the file. The pattern is wrong."
    exit 1
  fi
  control_outcome="$(outcome)"
  restore
  if [ "$control_outcome" = "test_still_passed" ]; then
    echo "  ABORT: the control mutation SURVIVED."
    echo "  The harness is not measuring what it thinks it is. Every result in this"
    echo "  run would be void, so none are reported."
    exit 1
  fi
  echo "  control killed - the harness can detect a broken build and a failing test"
fi

echo ""
echo "=== mutations ==="
survivors=0
unapplied=0
compile_errors=0

for spec in "$@"; do
  label="${spec%%::*}"
  expr="${spec#*::}"
  if [ "$label" = "$spec" ]; then label="$expr"; fi

  if ! apply "$expr"; then
    printf '  %-52s NOT APPLIED (pattern matched nothing)\n' "$label"
    unapplied=$((unapplied + 1))
    restore
    continue
  fi

  case "$(outcome)" in
    did_not_compile)
      printf '  %-52s did not compile\n' "$label"
      compile_errors=$((compile_errors + 1))
      ;;
    caught)
      printf '  %-52s caught\n' "$label"
      ;;
    test_still_passed)
      printf '  %-52s test still passed — SURVIVED (unverified)\n' "$label"
      survivors=$((survivors + 1))
      ;;
  esac
  restore
done

echo ""
echo "=== baseline, again ==="
after_sha="$(shasum "$TARGET" | cut -d' ' -f1)"
if [ "$after_sha" != "$BASELINE_SHA" ] || [ "$(outcome)" != "test_still_passed" ]; then
  echo "  ABORT: the baseline no longer passes. A restore failed, so the results above"
  echo "  are not trustworthy."
  exit 1
fi
echo "  baseline still passes - restores were clean"

if [ "$unapplied" -gt 0 ]; then
  echo ""
  echo "  ABORT: $unapplied mutation(s) did not change the file (anchor not found)."
  exit 1
fi

if [ "$survivors" -gt 0 ]; then
  echo ""
  echo "$survivors survivor(s) marked UNVERIFIED. Before recording any of them as a"
  echo "real gap, confirm the patch changed BEHAVIOUR and not merely the file:"
  echo "  * name the observable it should have altered"
  echo "  * if you cannot, the patch is a no-op and proves nothing"
  echo "A no-op patch reporting a survivor is the third failure mode in this file's"
  echo "header, and it is the one that looks most like a finding."
fi
