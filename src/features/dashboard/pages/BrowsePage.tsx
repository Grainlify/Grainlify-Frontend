import { X, SearchX, AlertCircle, ChevronLeft } from "lucide-react";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { useState, useEffect, useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Dropdown } from "../../../shared/components/ui/Dropdown";
import { ProjectCard, Project } from "../components/ProjectCard";
import { ProjectCardSkeleton } from "../components/ProjectCardSkeleton";
import { OrganizationCard, Organization } from "../components/OrganizationCard";
import { getPublicProjects, getEcosystems } from "../../../shared/api/client";
import {
  isValidProject,
  getRepoName,
} from "../../../shared/utils/projectFilter";
import { EmptyState } from "../../../shared/components/EmptyState";
import {
  cardContainerVariants,
  cardVariants,
} from "../../../shared/utils/motionVariants";

import { useOptimisticData } from "../../../shared/hooks/useOptimisticData";

interface BrowsePageProps {
  onProjectClick?: (id: string) => void;
}

// BrowsePage's own project shape carries the owning org alongside whatever
// ProjectCard needs to render - Browse groups by org, ProjectCard doesn't
// need to know that grouping exists.
interface BrowseProject extends Project {
  owner: string;
  // Raw star count for org-level aggregation - `stars` above is already
  // formatted for display (e.g. "1.2K") and can't be summed directly.
  starsCount: number;
}

// Helper function to format numbers (e.g., 1234 -> "1.2K", 1234567 -> "1.2M")
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

// Helper function to get project icon/avatar
const getProjectIcon = (githubFullName: string): string => {
  const [owner] = githubFullName.split("/");
  // Use higher‑resolution owner avatar so cards look crisp
  return `https://github.com/${owner}.png?size=200`;
};

// Helper function to get gradient color based on project name
const getProjectColor = (name: string): string => {
  const colors = [
    "from-blue-500 to-cyan-500",
    "from-purple-500 to-pink-500",
    "from-green-500 to-emerald-500",
    "from-red-500 to-pink-500",
    "from-orange-500 to-red-500",
    "from-gray-600 to-gray-800",
    "from-green-600 to-green-800",
    "from-cyan-500 to-blue-600",
  ];
  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// Helper function to truncate description to first line or first 80 characters
const truncateDescription = (
  description: string | undefined | null,
  maxLength: number = 80,
): string => {
  if (!description || description.trim() === "") {
    return "";
  }

  // Get first line
  const firstLine = description.split("\n")[0].trim();

  // If first line is longer than maxLength, truncate it
  if (firstLine.length > maxLength) {
    return firstLine.substring(0, maxLength).trim() + "...";
  }

  return firstLine;
};

export function BrowsePage({ onProjectClick }: BrowsePageProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const prefersReducedMotion = useReducedMotion();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({
    languages: "",
    ecosystems: "",
    categories: "",
    tags: "",
  });
  const [selectedFilters, setSelectedFilters] = useState<{
    [key: string]: string[];
  }>({
    languages: [],
    ecosystems: [],
    categories: [],
    tags: [],
  });
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);

  // Use optimistic data hook for projects with 30-second cache
  const {
    data: projects,
    isLoading,
    hasError,
    fetchData: fetchProjects,
  } = useOptimisticData<BrowseProject[]>([], { cacheDuration: 30000 });

  // Group projects by their GitHub org/owner - Browse shows orgs first,
  // drilling into a specific org shows just its repos.
  const organizations = useMemo<Organization[]>(() => {
    const byOwner = new Map<string, BrowseProject[]>();
    for (const project of projects) {
      const list = byOwner.get(project.owner) ?? [];
      list.push(project);
      byOwner.set(project.owner, list);
    }
    return Array.from(byOwner.entries())
      .map(([owner, repos]) => ({
        name: owner,
        avatar: `https://github.com/${owner}.png?size=200`,
        repoCount: repos.length,
        totalStars: repos.reduce((sum, r) => sum + r.starsCount, 0),
        totalContributors: repos.reduce((sum, r) => sum + r.contributors, 0),
      }))
      .sort((a, b) => b.repoCount - a.repoCount || a.name.localeCompare(b.name));
  }, [projects]);

  const orgProjects = useMemo(
    () => (selectedOrg ? projects.filter((p) => p.owner === selectedOrg) : []),
    [projects, selectedOrg],
  );

  // If a filter change makes the drilled-into org disappear (no more
  // matching repos), don't strand the user on an empty drill-down view.
  useEffect(() => {
    if (selectedOrg && !isLoading && !organizations.some((o) => o.name === selectedOrg)) {
      setSelectedOrg(null);
    }
  }, [selectedOrg, organizations, isLoading]);

  const [ecosystems, setEcosystems] = useState<Array<{ name: string }>>([]);

  // Filter options data
  const filterOptions = {
    languages: [
      { name: "TypeScript" },
      { name: "JavaScript" },
      { name: "Python" },
      { name: "Go" },
      { name: "Rust" },
      { name: "Java" },
    ],
    ecosystems: ecosystems,
    categories: [
      { name: "Frontend" },
      { name: "Backend" },
      { name: "Full Stack" },
      { name: "DevOps" },
      { name: "Mobile" },
    ],
    tags: [
      { name: "Good first issues" },
      { name: "Open issues" },
      { name: "Help wanted" },
      { name: "Bug" },
      { name: "Feature" },
      { name: "Documentation" },
    ],
  };

  // Fetch ecosystems from API
  useEffect(() => {
    const fetchEcosystems = async () => {
      try {
        const response = await getEcosystems();
        // Handle different response structures
        let ecosystemsArray: any[] = [];

        if (response && Array.isArray(response)) {
          ecosystemsArray = response;
        } else if (
          response &&
          response.ecosystems &&
          Array.isArray(response.ecosystems)
        ) {
          ecosystemsArray = response.ecosystems;
        } else if (response && typeof response === "object") {
          // Try to find any array property
          const keys = Object.keys(response);
          for (const key of keys) {
            if (Array.isArray((response as any)[key])) {
              ecosystemsArray = (response as any)[key];
              break;
            }
          }
        }

        // Filter only active ecosystems and map to expected format
        const activeEcosystems = ecosystemsArray
          .filter((eco: any) => eco.status === "active")
          .map((eco: any) => ({ name: eco.name }));

        setEcosystems(activeEcosystems);
      } catch (err) {
        console.error("BrowsePage: Failed to fetch ecosystems:", err);
        // Fallback to empty array on error
        setEcosystems([]);
      }
    };

    fetchEcosystems();
  }, []);

  const toggleFilter = (filterType: string, value: string) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [filterType]: prev[filterType].includes(value)
        ? prev[filterType].filter((v) => v !== value)
        : [...prev[filterType], value],
    }));
  };

  const clearFilter = (filterType: string, value: string) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [filterType]: prev[filterType].filter((v) => v !== value),
    }));
  };

  // Fetch projects from API
  useEffect(() => {
    const loadProjects = async () => {
      await fetchProjects(async () => {
        try {
          const params: {
            language?: string;
            ecosystem?: string;
            category?: string;
            tags?: string;
          } = {};

          // Apply filters
          if (selectedFilters.languages.length > 0) {
            params.language = selectedFilters.languages[0]; // API supports single language
          }
          if (selectedFilters.ecosystems.length > 0) {
            params.ecosystem = selectedFilters.ecosystems[0]; // API supports single ecosystem
          }
          if (selectedFilters.categories.length > 0) {
            params.category = selectedFilters.categories[0]; // API supports single category
          }
          if (selectedFilters.tags.length > 0) {
            params.tags = selectedFilters.tags.join(','); // API supports comma-separated tags
          }

          const response = await getPublicProjects(params);

          console.log('BrowsePage: API response received', { response });

          // Handle response - check if it's valid
          let projectsArray: any[] = [];
          if (response && response.projects && Array.isArray(response.projects)) {
            projectsArray = response.projects;
          } else if (Array.isArray(response)) {
            // Handle case where API returns array directly
            projectsArray = response;
          } else {
            console.warn('BrowsePage: Unexpected response format', response);
            projectsArray = [];
          }

          // Map API response to BrowseProject (Project + org grouping info)
          const mappedProjects: BrowseProject[] = projectsArray
            .filter(isValidProject)
            .map((p) => {
              const repoName = getRepoName(p.github_full_name);
              return {
                id: p.id || `project-${Date.now()}-${Math.random()}`, // Fallback ID if missing
                name: repoName,
                owner: p.github_full_name.split('/')[0] || repoName,
                icon: getProjectIcon(p.github_full_name),
                stars: formatNumber(p.stars_count || 0),
                starsCount: p.stars_count || 0,
                forks: formatNumber(p.forks_count || 0),
                contributors: p.contributors_count || 0,
                openIssues: p.open_issues_count || 0,
                prs: p.open_prs_count || 0,
                description: truncateDescription(p.description) || `${p.language || 'Project'} repository${p.category ? ` - ${p.category}` : ''}`,
                tags: Array.isArray(p.tags) ? p.tags : [],
                color: getProjectColor(repoName),
              };
            });

          console.log('BrowsePage: Mapped projects', { count: mappedProjects.length });
          return mappedProjects;
        } catch (err) {
          console.error('BrowsePage: Failed to fetch projects:', err);
          throw err; // Re-throw to let the hook handle the error
        }
      });
    };

    loadProjects();
  }, [selectedFilters, fetchProjects]);

  return (
    <div className="space-y-6">
      {/* Active Filters Display */}
      {Object.values(selectedFilters).some((arr) => arr.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(selectedFilters).map(([filterType, values]) =>
            values.map((value) => (
              <span
                key={`${filterType}-${value}`}
                className={`px-3.5 py-2 rounded-full text-[13px] font-semibold border-[1.5px] flex items-center gap-2 transition-all hover:scale-105 shadow-lg ${
                  isDark
                    ? "bg-[#a17932] border-[#c9983a] text-white"
                    : "bg-[#b8872f] border-[#a17932] text-white"
                }`}
              >
                {value}
                <button
                  onClick={() => clearFilter(filterType, value)}
                  className="hover:text-red-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )),
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center flex-wrap gap-3">
        {["languages", "ecosystems", "categories", "tags"].map((filterType) => (
          <Dropdown
            key={filterType}
            filterType={filterType}
            options={filterOptions[filterType as keyof typeof filterOptions]}
            selectedValues={selectedFilters[filterType]}
            onToggle={(value) => toggleFilter(filterType, value)}
            searchValue={searchTerms[filterType]}
            onSearchChange={(value) =>
              setSearchTerms((prev) => ({ ...prev, [filterType]: value }))
            }
            isOpen={openDropdown === filterType}
            onToggleOpen={() =>
              setOpenDropdown(openDropdown === filterType ? null : filterType)
            }
            onClose={() => setOpenDropdown(null)}
          />
        ))}
      </div>

      {/* Back button + org header, only while drilled into an organization */}
      {!isLoading && !hasError && selectedOrg && (
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedOrg(null)}
            className={`flex items-center gap-2 px-4 py-2 rounded-[12px] backdrop-blur-[30px] border font-medium text-[14px] transition-all hover:scale-[1.02] ${
              isDark
                ? "bg-[#2d2820]/60 hover:bg-[#2d2820]/80 text-[#d4c5b0] border-white/10"
                : "bg-white/60 hover:bg-white/80 text-[#6b5d4d] border-white/25"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Organizations
          </button>
          <div className="flex items-center gap-2.5">
            <img
              src={`https://github.com/${selectedOrg}.png?size=80`}
              alt={selectedOrg}
              className="w-7 h-7 rounded-[8px] border border-white/20"
            />
            <h2 className={`text-[16px] font-bold transition-colors ${isDark ? "text-[#f5f5f5]" : "text-[#2d2820]"}`}>
              {selectedOrg}
            </h2>
          </div>
        </div>
      )}

      {/* Projects / Organizations Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {[...Array(8)].map((_, idx) => (
            <ProjectCardSkeleton key={idx} />
          ))}
        </div>
      ) : hasError ? (
        <EmptyState
          icon={AlertCircle}
          title="Couldn't load projects"
          description="Something went wrong while fetching projects. Please try again in a moment."
        />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No projects found"
          description="Try adjusting your filters or check back later."
        />
      ) : selectedOrg ? (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5"
          variants={cardContainerVariants}
          initial={prefersReducedMotion ? false : "hidden"}
          animate="visible"
        >
          {orgProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={onProjectClick}
              variants={cardVariants}
            />
          ))}
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5"
          variants={cardContainerVariants}
          initial={prefersReducedMotion ? false : "hidden"}
          animate="visible"
        >
          {organizations.map((organization) => (
            <OrganizationCard
              key={organization.name}
              organization={organization}
              onClick={setSelectedOrg}
              variants={cardVariants}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
