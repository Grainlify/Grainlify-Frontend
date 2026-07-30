import { describe, it, expect } from 'vitest'
import {
  getRepoName,
  isValidProject,
  filterProjects,
  type FilterableProject,
  type ProjectFilterCriteria,
} from './projectFilter'

/**
 * Minimal shape of a project record as consumed by {@link isValidProject}.
 * Only the fields the validator inspects are modelled; tests build on top of
 * this via {@link makeProject} so each case stays focused on the branch it
 * exercises.
 */
interface ProjectFixture {
  id?: unknown
  github_full_name?: unknown
}

/**
 * Build a valid project fixture, optionally overriding individual fields.
 * Defaults represent a well-formed, valid project so each test only has to
 * declare the field relevant to the branch under test.
 */
function makeProject(overrides: Partial<ProjectFixture> = {}): ProjectFixture {
  return {
    id: 'proj-1',
    github_full_name: 'grainlify/grainlify-frontend',
    ...overrides,
  }
}

describe('getRepoName', () => {
  /**
   * Table of inputs and the repo segment we expect to be extracted. Covers the
   * happy "owner/repo" path, the `?? githubFullName` fallback branch, and a
   * handful of malformed strings.
   */
  const cases: ReadonlyArray<{
    name: string
    input: string
    expected: string
  }> = [
    {
      name: 'extracts the repo segment from owner/repo',
      input: 'grainlify/grainlify-frontend',
      expected: 'grainlify-frontend',
    },
    {
      name: 'returns the original string when there is no slash',
      input: 'grainlify-frontend',
      expected: 'grainlify-frontend',
    },
    {
      name: 'returns the original string for an empty string',
      input: '',
      expected: '',
    },
    {
      name: 'returns an empty repo segment for a trailing slash',
      input: 'owner/',
      expected: '',
    },
    {
      name: 'treats a leading slash as an empty owner',
      input: '/repo',
      expected: 'repo',
    },
    {
      name: 'keeps only the second segment when there are extra slashes',
      input: 'owner/repo/extra',
      expected: 'repo',
    },
    {
      name: 'is case-preserving (does not normalise casing)',
      input: 'Owner/Repo-Name',
      expected: 'Repo-Name',
    },
  ]

  it.each(cases)('$name', ({ input, expected }) => {
    expect(getRepoName(input)).toBe(expected)
  })
})

describe('isValidProject', () => {
  describe('rejects falsy or incomplete projects', () => {
    /**
     * Each case targets one short-circuit in the guard
     * `!project || project.id == null || !project.github_full_name`.
     */
    const invalidCases: ReadonlyArray<{ name: string; project: unknown }> = [
      { name: 'null', project: null },
      { name: 'undefined', project: undefined },
      { name: 'false', project: false },
      { name: 'missing id', project: { github_full_name: 'owner/repo' } },
      { name: 'empty-string id', project: makeProject({ id: '' }) },
      {
        name: 'missing github_full_name',
        project: { id: 'proj-1' },
      },
      {
        name: 'empty-string github_full_name',
        project: makeProject({ github_full_name: '' }),
      },
    ]

    it.each(invalidCases)('returns false for $name', ({ project }) => {
      expect(isValidProject(project)).toBe(false)
    })
  })

  describe('excludes special GitHub repositories', () => {
    it('returns false when the repo is the .github special repo', () => {
      expect(isValidProject(makeProject({ github_full_name: 'grainlify/.github' }))).toBe(false)
    })

    it('is case-sensitive: .GitHub is not treated as the special repo', () => {
      expect(isValidProject(makeProject({ github_full_name: 'grainlify/.GitHub' }))).toBe(true)
    })

    it("does not exclude repos that merely contain '.github'", () => {
      expect(isValidProject(makeProject({ github_full_name: 'grainlify/.github-actions' }))).toBe(
        true
      )
    })

    it("treats a bare '.github' (no owner) as the special repo", () => {
      expect(isValidProject(makeProject({ github_full_name: '.github' }))).toBe(false)
    })
  })

  describe('accepts well-formed projects', () => {
    /**
     * Valid projects spanning string and numeric ids and varied repo names,
     * confirming the function returns `true` once every guard passes.
     */
    const validCases: ReadonlyArray<{ name: string; project: ProjectFixture }> = [
      {
        name: 'a standard owner/repo project',
        project: makeProject(),
      },
      {
        name: 'a numeric id',
        project: makeProject({ id: 42 }),
      },
      {
        name: 'an id of 0 (falsy but valid)',
        project: makeProject({ id: 0 }),
      },
      {
        name: 'a github_full_name without a slash',
        project: makeProject({ github_full_name: 'standalone-repo' }),
      },
    ]

    it.each(validCases)('returns true for $name', ({ project }) => {
      expect(isValidProject(project)).toBe(true)
    })
  })
})

describe('filterProjects', () => {
  /**
   * Fixed fixture spanning every dimension exercised below: names/descriptions
   * that do or don't contain "atlas", three languages, and both fully
   * overlapping and disjoint categories. Ids double as a quick way to assert
   * *which* projects survived a given combination.
   */
  const projects: ReadonlyArray<FilterableProject & { id: number }> = [
    {
      id: 1,
      name: 'atlas-ui',
      description: 'Frontend dashboard toolkit',
      language: 'typescript',
      category: 'frontend',
    },
    {
      id: 2,
      name: 'atlas-api',
      description: 'Backend service for atlas',
      language: 'python',
      category: 'backend',
    },
    {
      id: 3,
      name: 'nebula',
      description: 'Full stack starter kit',
      language: 'typescript',
      category: 'fullstack',
    },
    {
      id: 4,
      name: 'forge-cli',
      description: 'DevOps automation tool',
      language: 'rust',
      category: 'devops',
    },
    {
      id: 5,
      name: 'atlas-docs',
      description: 'Documentation site for the atlas ecosystem',
      language: 'javascript',
      category: 'frontend',
    },
    {
      id: 6,
      name: 'quasar',
      description: 'Backend queue processor',
      language: 'python',
      category: 'backend',
    },
  ]

  const ids = (result: ReadonlyArray<{ id: number }>) => result.map((p) => p.id)

  describe('single-criterion filtering', () => {
    it('matches on name or description substring, case-insensitively', () => {
      expect(ids(filterProjects(projects, { searchQuery: 'ATLAS' }))).toEqual([1, 2, 5])
    })

    it('matches by language alone', () => {
      expect(ids(filterProjects(projects, { languages: ['python'] }))).toEqual([2, 6])
    })

    it('matches by category alone', () => {
      expect(ids(filterProjects(projects, { categories: ['frontend'] }))).toEqual([1, 5])
    })
  })

  describe('combined-criterion filtering', () => {
    /**
     * Table-driven combined scenarios. Each case AND-combines two or three
     * dimensions and asserts the exact surviving id set, so every row also
     * proves projects that satisfy only *some* of the criteria are excluded.
     */
    const cases: ReadonlyArray<{
      name: string
      criteria: ProjectFilterCriteria
      expectedIds: number[]
    }> = [
      {
        name: 'two-way: search AND language narrows to their intersection',
        criteria: { searchQuery: 'atlas', languages: ['typescript'] },
        expectedIds: [1],
      },
      {
        name: 'two-way: search AND category narrows to their intersection',
        criteria: { searchQuery: 'atlas', categories: ['backend'] },
        expectedIds: [2],
      },
      {
        name: 'two-way: language AND category narrows to their intersection',
        criteria: { languages: ['typescript'], categories: ['frontend'] },
        expectedIds: [1],
      },
      {
        name: 'three-way: search AND language AND category narrows to a single project',
        criteria: {
          searchQuery: 'atlas',
          languages: ['typescript'],
          categories: ['frontend'],
        },
        expectedIds: [1],
      },
      {
        name: 'three-way combination with no matches yields the empty state',
        criteria: {
          searchQuery: 'atlas',
          languages: ['rust'],
          categories: ['frontend'],
        },
        expectedIds: [],
      },
      {
        name: 'two-way combination with no overlap yields the empty state',
        criteria: { languages: ['rust'], categories: ['backend'] },
        expectedIds: [],
      },
      {
        name: 'no-op filters (all empty/default) yield the full set',
        criteria: {},
        expectedIds: [1, 2, 3, 4, 5, 6],
      },
      {
        name: 'explicitly empty search/language/category values yield the full set',
        criteria: { searchQuery: '', languages: [], categories: [] },
        expectedIds: [1, 2, 3, 4, 5, 6],
      },
    ]

    it.each(cases)('$name', ({ criteria, expectedIds }) => {
      expect(ids(filterProjects(projects, criteria))).toEqual(expectedIds)
    })
  })

  describe('filter order independence', () => {
    /**
     * Standalone predicates mirroring each individual criterion. Chaining
     * them in every permutation and comparing against `filterProjects`
     * proves the AND-combination is commutative: since none of the
     * predicates depend on another field, applying them in any order (or all
     * at once) must yield the same surviving set.
     */
    const bySearch = (query: string) => (p: FilterableProject) =>
      query === '' ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase())

    const byLanguage = (languages: string[]) => (p: FilterableProject) =>
      languages.length === 0 || (p.language != null && languages.includes(p.language))

    const byCategory = (categories: string[]) => (p: FilterableProject) =>
      categories.length === 0 || (p.category != null && categories.includes(p.category))

    it('yields the same result regardless of which predicate is applied first', () => {
      const criteria: ProjectFilterCriteria = {
        searchQuery: 'atlas',
        languages: ['typescript', 'javascript'],
        categories: ['frontend'],
      }

      const searchP = bySearch(criteria.searchQuery ?? '')
      const languageP = byLanguage(criteria.languages ?? [])
      const categoryP = byCategory(criteria.categories ?? [])

      const searchFirst = projects.filter(searchP).filter(languageP).filter(categoryP)
      const categoryFirst = projects.filter(categoryP).filter(languageP).filter(searchP)
      const languageFirst = projects.filter(languageP).filter(categoryP).filter(searchP)

      const combined = filterProjects(projects, criteria)

      expect(ids(searchFirst)).toEqual(ids(combined))
      expect(ids(categoryFirst)).toEqual(ids(combined))
      expect(ids(languageFirst)).toEqual(ids(combined))
    })

    it('is unaffected by the order of values within a multi-value criterion', () => {
      const forward = filterProjects(projects, {
        languages: ['python', 'typescript'],
      })
      const reversed = filterProjects(projects, {
        languages: ['typescript', 'python'],
      })

      expect(ids(reversed)).toEqual(ids(forward))
    })
  })
})
