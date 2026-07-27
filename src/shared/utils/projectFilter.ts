export function getRepoName(githubFullName: string): string {
  // Handles "owner/repo" and edge cases
  const parts = githubFullName.split('/')
  return parts[1] ?? githubFullName
}

export interface FilterableProject {
  name: string
  description: string
  language?: string | null
  category?: string | null
}

export interface ProjectFilterCriteria {
  searchQuery?: string
  languages?: string[]
  categories?: string[]
}

/**
 * AND-combines search/language/category criteria. Each predicate is
 * independent (no cross-field dependency), so combined results are the same
 * regardless of the order criteria are applied in.
 */
export function filterProjects<T extends FilterableProject>(
  projects: readonly T[],
  criteria: ProjectFilterCriteria
): T[] {
  const { searchQuery = '', languages = [], categories = [] } = criteria
  const query = searchQuery.toLowerCase()

  return projects.filter((project) => {
    const matchesSearch =
      query === '' ||
      project.name.toLowerCase().includes(query) ||
      project.description.toLowerCase().includes(query)

    const matchesLanguage =
      languages.length === 0 || (project.language != null && languages.includes(project.language))

    const matchesCategory =
      categories.length === 0 || (project.category != null && categories.includes(project.category))

    return matchesSearch && matchesLanguage && matchesCategory
  })
}

export function isValidProject(project: any): boolean {
  if (!project || !project.id || !project.github_full_name) {
    return false
  }

  const repoName = getRepoName(project.github_full_name)

  // Exclude special GitHub repositories
  if (repoName === '.github') {
    return false
  }

  return true
}
