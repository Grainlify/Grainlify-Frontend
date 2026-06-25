import { describe, it, expect } from "vitest";
import { getRepoName, isValidProject } from "./projectFilter";

/**
 * Minimal shape of a project record as consumed by {@link isValidProject}.
 * Only the fields the validator inspects are modelled; tests build on top of
 * this via {@link makeProject} so each case stays focused on the branch it
 * exercises.
 */
interface ProjectFixture {
  id?: unknown;
  github_full_name?: unknown;
}

/**
 * Build a valid project fixture, optionally overriding individual fields.
 * Defaults represent a well-formed, valid project so each test only has to
 * declare the field relevant to the branch under test.
 */
function makeProject(overrides: Partial<ProjectFixture> = {}): ProjectFixture {
  return {
    id: "proj-1",
    github_full_name: "grainlify/grainlify-frontend",
    ...overrides,
  };
}

describe("getRepoName", () => {
  /**
   * Table of inputs and the repo segment we expect to be extracted. Covers the
   * happy "owner/repo" path, the `?? githubFullName` fallback branch, and a
   * handful of malformed strings.
   */
  const cases: ReadonlyArray<{
    name: string;
    input: string;
    expected: string;
  }> = [
    {
      name: "extracts the repo segment from owner/repo",
      input: "grainlify/grainlify-frontend",
      expected: "grainlify-frontend",
    },
    {
      name: "returns the original string when there is no slash",
      input: "grainlify-frontend",
      expected: "grainlify-frontend",
    },
    {
      name: "returns the original string for an empty string",
      input: "",
      expected: "",
    },
    {
      name: "returns an empty repo segment for a trailing slash",
      input: "owner/",
      expected: "",
    },
    {
      name: "treats a leading slash as an empty owner",
      input: "/repo",
      expected: "repo",
    },
    {
      name: "keeps only the second segment when there are extra slashes",
      input: "owner/repo/extra",
      expected: "repo",
    },
    {
      name: "is case-preserving (does not normalise casing)",
      input: "Owner/Repo-Name",
      expected: "Repo-Name",
    },
  ];

  it.each(cases)("$name", ({ input, expected }) => {
    expect(getRepoName(input)).toBe(expected);
  });
});

describe("isValidProject", () => {
  describe("rejects falsy or incomplete projects", () => {
    /**
     * Each case targets one short-circuit in the guard
     * `!project || !project.id || !project.github_full_name`.
     */
    const invalidCases: ReadonlyArray<{ name: string; project: unknown }> = [
      { name: "null", project: null },
      { name: "undefined", project: undefined },
      { name: "false", project: false },
      { name: "missing id", project: { github_full_name: "owner/repo" } },
      { name: "empty-string id", project: makeProject({ id: "" }) },
      { name: "zero id", project: makeProject({ id: 0 }) },
      {
        name: "missing github_full_name",
        project: { id: "proj-1" },
      },
      {
        name: "empty-string github_full_name",
        project: makeProject({ github_full_name: "" }),
      },
    ];

    it.each(invalidCases)("returns false for $name", ({ project }) => {
      expect(isValidProject(project)).toBe(false);
    });
  });

  describe("excludes special GitHub repositories", () => {
    it("returns false when the repo is the .github special repo", () => {
      expect(
        isValidProject(makeProject({ github_full_name: "grainlify/.github" })),
      ).toBe(false);
    });

    it("is case-sensitive: .GitHub is not treated as the special repo", () => {
      expect(
        isValidProject(makeProject({ github_full_name: "grainlify/.GitHub" })),
      ).toBe(true);
    });

    it("does not exclude repos that merely contain '.github'", () => {
      expect(
        isValidProject(
          makeProject({ github_full_name: "grainlify/.github-actions" }),
        ),
      ).toBe(true);
    });

    it("treats a bare '.github' (no owner) as the special repo", () => {
      expect(isValidProject(makeProject({ github_full_name: ".github" }))).toBe(
        false,
      );
    });
  });

  describe("accepts well-formed projects", () => {
    /**
     * Valid projects spanning string and numeric ids and varied repo names,
     * confirming the function returns `true` once every guard passes.
     */
    const validCases: ReadonlyArray<{ name: string; project: ProjectFixture }> =
      [
        {
          name: "a standard owner/repo project",
          project: makeProject(),
        },
        {
          name: "a numeric id",
          project: makeProject({ id: 42 }),
        },
        {
          name: "a github_full_name without a slash",
          project: makeProject({ github_full_name: "standalone-repo" }),
        },
      ];

    it.each(validCases)("returns true for $name", ({ project }) => {
      expect(isValidProject(project)).toBe(true);
    });
  });
});
