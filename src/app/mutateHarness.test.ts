import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const SCRIPT_PATH = resolve(__dirname, '../../scripts/mutate.sh')

interface RunResult {
  status: number
  stdout: string
  stderr: string
}

function runMutate(
  args: string[],
  envOverrides: Record<string, string> = {},
): RunResult {
  try {
    const stdout = execFileSync('bash', [SCRIPT_PATH, ...args], {
      encoding: 'utf8',
      env: {
        ...process.env,
        ...envOverrides,
      },
    })
    return { status: 0, stdout, stderr: '' }
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string; stderr?: string }
    return {
      status: e.status ?? 1,
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
    }
  }
}

function withTempTarget(initialContent: string, fn: (targetPath: string, dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'mutate-harness-test-'))
  const targetPath = join(dir, 'sample.ts')
  writeFileSync(targetPath, initialContent, 'utf8')
  try {
    fn(targetPath, dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('scripts/mutate.sh', () => {
  it('aborts before mutating anything when the baseline does not compile', () => {
    const original = 'export const value = "ok"\n'
    withTempTarget(original, (target) => {
      const res = runMutate(
        [target, 'true', 'flip::s/"ok"/"mutated"/'],
        {
          MUTATE_TYPECHECK_CMD: 'false',
        },
      )

      expect(res.status).toBe(1)
      expect(res.stdout).toContain('=== baseline ===')
      expect(res.stdout).toContain('ABORT: the baseline does not compile')
      expect(res.stdout).not.toContain('=== mutations ===')
      expect(readFileSync(target, 'utf8')).toBe(original)
    })
  })

  it('aborts before mutating anything when the baseline tests do not pass', () => {
    const original = 'export const value = "ok"\n'
    withTempTarget(original, (target) => {
      const res = runMutate(
        [target, 'false', 'flip::s/"ok"/"mutated"/'],
        {
          MUTATE_TYPECHECK_CMD: 'true',
        },
      )

      expect(res.status).toBe(1)
      expect(res.stdout).toContain('=== baseline ===')
      expect(res.stdout).toContain('ABORT: the baseline does not pass')
      expect(res.stdout).not.toContain('=== mutations ===')
      expect(readFileSync(target, 'utf8')).toBe(original)
    })
  })

  it('distinguishes did not compile, caught, and test still passed, and restores the target file', () => {
    const original = 'export const state = "BASELINE"\n'
    withTempTarget(original, (target) => {
      // Typecheck fails only when the file contains BROKEN_TYPES.
      // Test command fails only when the file contains CAUGHT_BY_TEST.
      // When the file contains SURVIVOR, both typecheck and tests pass.
      const res = runMutate(
        [
          target,
          `! grep -q "CAUGHT_BY_TEST" "${target}"`,
          'type error::s/BASELINE/BROKEN_TYPES/',
          'caught mutation::s/BASELINE/CAUGHT_BY_TEST/',
          'surviving mutation::s/BASELINE/SURVIVOR/',
        ],
        {
          MUTATE_TYPECHECK_CMD: `! grep -q "BROKEN_TYPES" "${target}"`,
        },
      )

      expect(res.status).toBe(0)
      expect(res.stdout).toContain('=== baseline ===')
      expect(res.stdout).toContain('baseline passes')
      expect(res.stdout).toMatch(/type error\s+did not compile/)
      expect(res.stdout).toMatch(/caught mutation\s+caught/)
      expect(res.stdout).toMatch(/surviving mutation\s+test still passed — SURVIVED \(unverified\)/)
      expect(res.stdout).toContain('=== baseline, again ===')
      expect(res.stdout).toContain('baseline still passes - restores were clean')
      expect(res.stdout).toContain('1 survivor(s) marked UNVERIFIED')
      expect(readFileSync(target, 'utf8')).toBe(original)
    })
  })

  it('verifies each mutation anchor changed the file and fails when an anchor matches nothing', () => {
    const original = 'export const count = 1\n'
    withTempTarget(original, (target) => {
      const res = runMutate(
        [
          target,
          `grep -q "count = 1" "${target}"`,
          'missing anchor::s/nonExistentIdentifier/0/',
        ],
        {
          MUTATE_TYPECHECK_CMD: 'true',
        },
      )

      expect(res.status).toBe(1)
      expect(res.stdout).toMatch(/missing anchor\s+NOT APPLIED \(pattern matched nothing\)/)
      expect(res.stdout).toContain('ABORT: 1 mutation(s) did not change the file')
      expect(readFileSync(target, 'utf8')).toBe(original)
    })
  })

  it('runs a control mutation when provided and aborts if the control survives', () => {
    const original = 'export const flag = true\n'
    withTempTarget(original, (target) => {
      const res = runMutate(
        [
          target,
          'true',
          's/true/false/',
          'other::s/flag/renamedFlag/',
        ],
        {
          MUTATE_TYPECHECK_CMD: 'true',
        },
      )

      expect(res.status).toBe(1)
      expect(res.stdout).toContain('=== control (must be killed, or the run is void) ===')
      expect(res.stdout).toContain('ABORT: the control mutation SURVIVED.')
      expect(res.stdout).not.toContain('=== mutations ===')
      expect(readFileSync(target, 'utf8')).toBe(original)
    })
  })

  it('re-verifies the baseline after the last restore and aborts loudly if it no longer passes', () => {
    const original = 'export const ok = true\n'
    withTempTarget(original, (target, dir) => {
      const marker = join(dir, 'poisoned')
      // The test command passes on the initial baseline, fails during the mutation
      // while leaving a marker behind, and then fails on the final baseline re-check.
      const testCmd = `if [ -f "${marker}" ]; then exit 1; fi; grep -q "ok = true" "${target}" || (touch "${marker}" && exit 1)`

      const res = runMutate(
        [target, testCmd, 'flip::s/true/false/'],
        {
          MUTATE_TYPECHECK_CMD: 'true',
        },
      )

      expect(res.status).toBe(1)
      expect(res.stdout).toContain('=== baseline, again ===')
      expect(res.stdout).toContain('ABORT: the baseline no longer passes. A restore failed')
    })
  })
})
