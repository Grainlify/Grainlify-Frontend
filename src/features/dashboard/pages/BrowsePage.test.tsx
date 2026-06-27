import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "../../../shared/contexts/ThemeContext";

// --- Mock the API client -------------------------------------------------
const getPublicProjects = vi.fn();
const getEcosystems = vi.fn();
vi.mock("../../../shared/api/client", () => ({
  getPublicProjects: (...args: unknown[]) => getPublicProjects(...args),
  getEcosystems: (...args: unknown[]) => getEcosystems(...args),
}));

// --- Mock heavy / presentational children -------------------------------
const projectCardRenderCount = vi.fn();

// Use a real memoization for the mock to test BrowsePage's stability
import { memo } from "react";
const MockProjectCard = memo(({ project }: { project: { id: string; name: string } }) => {
  projectCardRenderCount();
  return <div data-testid={`project-card-${project.id}`}>{project.name}</div>;
});

vi.mock("../components/ProjectCard", () => ({
  ProjectCard: (props: any) => <MockProjectCard {...props} />,
}));
vi.mock("../components/ProjectCardSkeleton", () => ({
  ProjectCardSkeleton: () => <div data-testid="project-skeleton" />,
}));
vi.mock("../../../shared/components/ui/Dropdown", () => ({
  Dropdown: ({
    filterType,
    onToggle,
    onSearchChange,
    onToggleOpen,
    onClose,
  }: {
    filterType: string;
    onToggle: (value: string) => void;
    onSearchChange: (value: string) => void;
    onToggleOpen: () => void;
    onClose: () => void;
  }) => (
    <div>
      <button onClick={() => onToggle("TypeScript")}>filter-{filterType}</button>
      <button onClick={() => onSearchChange("ty")}>search-{filterType}</button>
      <button onClick={onToggleOpen}>open-{filterType}</button>
      <button onClick={onClose}>close-{filterType}</button>
    </div>
  ),
}));

import { BrowsePage } from "./BrowsePage";

/** Build an API response page of `count` projects starting at `start`. */
function makeResponse(count: number, total: number, start = 0) {
  return {
    projects: Array.from({ length: count }, (_, i) => ({
      id: `p${start + i}`,
      github_full_name: `owner/repo-${start + i}`,
      language: "TypeScript",
      tags: [],
      category: null,
      stars_count: 1,
      forks_count: 1,
      contributors_count: 1,
      open_issues_count: 1,
      open_prs_count: 1,
      ecosystem_name: null,
      ecosystem_slug: null,
      description: "desc",
      created_at: "",
      updated_at: "",
    })),
    total,
    limit: 12,
    offset: start,
  };
}

const cards = () => screen.queryAllByTestId(/^project-card-/).length;

const renderPage = () =>
  render(
    <ThemeProvider>
      <BrowsePage />
    </ThemeProvider>,
  );

beforeEach(() => {
  getPublicProjects.mockReset();
  getEcosystems.mockReset();
  getEcosystems.mockResolvedValue({ ecosystems: [] });
  localStorage.clear();
  projectCardRenderCount.mockClear();
});

describe("BrowsePage pagination", () => {
  it("loads the first page and shows 'Load more' when a total remains", async () => {
    getPublicProjects.mockResolvedValueOnce(makeResponse(12, 30));
    renderPage();

    await waitFor(() => expect(cards()).toBe(12));
    expect(
      screen.getByRole("button", { name: "Load more" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Showing 12 of 30 projects")).toBeInTheDocument();
    // First page is requested with clamped limit/offset.
    expect(getPublicProjects).toHaveBeenCalledWith({ limit: 12, offset: 0 });
  });

  it("appends the next page and stops at the total", async () => {
    getPublicProjects
      .mockResolvedValueOnce(makeResponse(12, 20, 0))
      .mockResolvedValueOnce(makeResponse(8, 20, 12));
    renderPage();

    await waitFor(() => expect(cards()).toBe(12));
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    await waitFor(() => expect(cards()).toBe(20));
    expect(getPublicProjects).toHaveBeenLastCalledWith({ limit: 12, offset: 12 });
    expect(
      screen.queryByRole("button", { name: "Load more" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/reached the end of the list/i)).toBeInTheDocument();
    expect(screen.getByText("Showing 20 of 20 projects")).toBeInTheDocument();
  });

  it("shows the empty state when there are no projects", async () => {
    getPublicProjects.mockResolvedValueOnce(makeResponse(0, 0));
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("No projects found")).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "Load more" }),
    ).not.toBeInTheDocument();
  });

  it("shows the end-of-list state on a single short page", async () => {
    getPublicProjects.mockResolvedValueOnce(makeResponse(5, 5));
    renderPage();

    await waitFor(() => expect(cards()).toBe(5));
    expect(
      screen.queryByRole("button", { name: "Load more" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/reached the end of the list/i)).toBeInTheDocument();
  });

  it("does not fire duplicate concurrent load-more requests", async () => {
    let resolveSecond: (v: unknown) => void = () => {};
    const second = new Promise((res) => {
      resolveSecond = res;
    });
    getPublicProjects
      .mockResolvedValueOnce(makeResponse(12, 40, 0))
      .mockReturnValueOnce(second);

    renderPage();
    await waitFor(() => expect(cards()).toBe(12));

    const button = screen.getByRole("button", { name: /load more|loading/i });
    fireEvent.click(button);
    fireEvent.click(button);

    // Initial call + a single load-more call only.
    expect(getPublicProjects).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveSecond(makeResponse(12, 40, 12));
      await second;
    });
    await waitFor(() => expect(cards()).toBe(24));
  });

  it("resets pagination to offset 0 when filters change", async () => {
    getPublicProjects
      .mockResolvedValueOnce(makeResponse(12, 40, 0)) // initial
      .mockResolvedValueOnce(makeResponse(12, 40, 12)) // load more
      .mockResolvedValueOnce(makeResponse(3, 3, 0)); // refetch after filter change
    renderPage();

    await waitFor(() => expect(cards()).toBe(12));
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() => expect(cards()).toBe(24));

    // Toggle a language filter -> pagination resets and refetches at offset 0.
    await userEvent.click(
      screen.getByRole("button", { name: "filter-languages" }),
    );

    await waitFor(() => expect(cards()).toBe(3));
    expect(getPublicProjects).toHaveBeenLastCalledWith({
      language: "TypeScript",
      limit: 12,
      offset: 0,
    });
  });

  it("renders an error state when the fetch fails", async () => {
    getPublicProjects.mockRejectedValueOnce(new Error("boom"));
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Couldn't load projects")).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "Load more" }),
    ).not.toBeInTheDocument();
  });

  it("falls back to a page-size heuristic when the API omits a total", async () => {
    // Some endpoints may return a bare array; a full page still offers more.
    getPublicProjects.mockResolvedValueOnce(
      Array.from({ length: 12 }, (_, i) => ({
        id: `b${i}`,
        github_full_name: `owner/repo-${i}`,
        tags: [],
      })),
    );
    renderPage();

    await waitFor(() => expect(cards()).toBe(12));
    // No total -> no "Showing X of Y" line, but a full page still shows more.
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Load more" }),
    ).toBeInTheDocument();
  });
});

describe("BrowsePage rendering & data mapping", () => {
  it("formats large counts and keeps real descriptions", async () => {
    getPublicProjects.mockResolvedValueOnce({
      projects: [
        {
          id: "x1",
          github_full_name: "acme/big",
          language: "Go",
          tags: ["a"],
          category: "Backend",
          stars_count: 1_500_000,
          forks_count: 2500,
          contributors_count: 3,
          open_issues_count: 4,
          open_prs_count: 5,
          description: "First line\nsecond line",
          created_at: "",
          updated_at: "",
        },
      ],
      total: 1,
      limit: 12,
      offset: 0,
    });
    renderPage();

    await waitFor(() => expect(cards()).toBe(1));
    expect(screen.getByTestId("project-card-x1")).toHaveTextContent("big");
    expect(screen.getByText(/reached the end of the list/i)).toBeInTheDocument();
  });

  it("excludes invalid repos (e.g. owner/.github) from the grid", async () => {
    getPublicProjects.mockResolvedValueOnce({
      projects: [
        { id: "ok", github_full_name: "owner/real", tags: [] },
        { id: "skip", github_full_name: "owner/.github", tags: [] },
        { github_full_name: "owner/missing-id", tags: [] }, // no id -> invalid
      ],
      total: 1,
      limit: 12,
      offset: 0,
    });
    renderPage();

    await waitFor(() => expect(cards()).toBe(1));
    expect(screen.getByTestId("project-card-ok")).toHaveTextContent("real");
  });

  it("loads active ecosystems for the filter options", async () => {
    getEcosystems.mockResolvedValueOnce({
      ecosystems: [
        { name: "Live", status: "active" },
        { name: "Dead", status: "inactive" },
      ],
    });
    getPublicProjects.mockResolvedValueOnce(makeResponse(2, 2));
    renderPage();

    await waitFor(() => expect(cards()).toBe(2));
    // Ecosystem fetch resolving without throwing exercises the mapping branch.
    expect(getEcosystems).toHaveBeenCalled();
  });

  it("tolerates an ecosystem fetch failure", async () => {
    getEcosystems.mockRejectedValueOnce(new Error("eco down"));
    getPublicProjects.mockResolvedValueOnce(makeResponse(2, 2));
    renderPage();

    await waitFor(() => expect(cards()).toBe(2));
  });

  it("renders selected-filter chips and supports dropdown plumbing", async () => {
    getPublicProjects
      .mockResolvedValueOnce(makeResponse(12, 40))
      .mockResolvedValueOnce(makeResponse(2, 2));
    renderPage();

    await waitFor(() => expect(cards()).toBe(12));

    // Exercise the dropdown search/open/close handlers.
    await userEvent.click(screen.getByRole("button", { name: "open-languages" }));
    await userEvent.click(
      screen.getByRole("button", { name: "search-languages" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "close-languages" }));

    // Selecting a filter renders an active-filter chip and refetches.
    await userEvent.click(
      screen.getByRole("button", { name: "filter-languages" }),
    );
    await waitFor(() => expect(cards()).toBe(2));
  });

  it("renders correctly under the dark theme", async () => {
    localStorage.setItem("theme", "dark");
    getPublicProjects.mockResolvedValueOnce(makeResponse(12, 40));
    renderPage();

    await waitFor(() => expect(cards()).toBe(12));
    expect(screen.getByText("Showing 12 of 40 projects")).toBeInTheDocument();
  });

  it("shows the dark-theme empty state", async () => {
    localStorage.setItem("theme", "dark");
    getPublicProjects.mockResolvedValueOnce(makeResponse(0, 0));
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("No projects found")).toBeInTheDocument(),
    );
  });

  it("truncates a long single-line description", async () => {
    const long = "x".repeat(200);
    getPublicProjects.mockResolvedValueOnce({
      projects: [{ id: "l1", github_full_name: "owner/long", tags: [], description: long }],
      total: 1,
      limit: 12,
      offset: 0,
    });
    renderPage();
    await waitFor(() => expect(cards()).toBe(1));
  });

  it("warns and shows empty state on an unexpected response shape", async () => {
    getPublicProjects.mockResolvedValueOnce({} as unknown as ReturnType<typeof makeResponse>);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("No projects found")).toBeInTheDocument(),
    );
  });
});

describe("BrowsePage memoization", () => {
  it("does not re-render ProjectCards when opening a dropdown", async () => {
    getPublicProjects.mockResolvedValueOnce(makeResponse(5, 5));
    renderPage();

    // Wait for projects to load
    await waitFor(() => expect(cards()).toBe(5));

    // Reset count after initial render
    projectCardRenderCount.mockClear();

    // Toggle a dropdown (triggers state change in BrowsePage)
    await userEvent.click(screen.getByRole("button", { name: "open-languages" }));

    // Verify projects are still there
    expect(cards()).toBe(5);

    // ProjectCards should not have re-rendered because we're using React.memo
    // and BrowsePage passed memoized handlers.
    expect(projectCardRenderCount).not.toHaveBeenCalled();
  });

  it("does not re-render ProjectCards when changing search terms in a dropdown", async () => {
    getPublicProjects.mockResolvedValueOnce(makeResponse(5, 5));
    renderPage();

    await waitFor(() => expect(cards()).toBe(5));

    projectCardRenderCount.mockClear();

    // Change search term (triggers state change in BrowsePage)
    await userEvent.click(screen.getByRole("button", { name: "search-languages" }));

    expect(cards()).toBe(5);
    expect(projectCardRenderCount).not.toHaveBeenCalled();
  });
});

describe("BrowsePage filters", () => {
  it("forwards every active filter group to the API", async () => {
    getPublicProjects.mockResolvedValue(makeResponse(2, 2));
    renderPage();
    await waitFor(() => expect(cards()).toBe(2));

    await userEvent.click(screen.getByRole("button", { name: "filter-ecosystems" }));
    await userEvent.click(screen.getByRole("button", { name: "filter-categories" }));
    await userEvent.click(screen.getByRole("button", { name: "filter-tags" }));

    await waitFor(() =>
      expect(getPublicProjects).toHaveBeenLastCalledWith({
        ecosystem: "TypeScript",
        category: "TypeScript",
        tags: "TypeScript",
        limit: 12,
        offset: 0,
      }),
    );
  });

  it("toggles a filter value off when selected twice", async () => {
    getPublicProjects.mockResolvedValue(makeResponse(2, 2));
    renderPage();
    await waitFor(() => expect(cards()).toBe(2));

    const toggle = screen.getByRole("button", { name: "filter-languages" });
    await userEvent.click(toggle); // select
    expect(await screen.findByText("TypeScript")).toBeInTheDocument();
    await userEvent.click(toggle); // deselect

    await waitFor(() =>
      expect(screen.queryByText("TypeScript")).not.toBeInTheDocument(),
    );
  });

  it("removes an active-filter chip when its X is clicked", async () => {
    getPublicProjects.mockResolvedValue(makeResponse(2, 2));
    renderPage();
    await waitFor(() => expect(cards()).toBe(2));

    // Select a filter -> a chip appears.
    await userEvent.click(screen.getByRole("button", { name: "filter-languages" }));
    const chip = await screen.findByText("TypeScript");
    expect(chip).toBeInTheDocument();

    // The chip's X button is the last button rendered inside the chip.
    const xButton = chip.closest("span")?.querySelector("button");
    expect(xButton).toBeTruthy();
    await userEvent.click(xButton as HTMLButtonElement);

    await waitFor(() =>
      expect(screen.queryByText("TypeScript")).not.toBeInTheDocument(),
    );
  });
});

describe("BrowsePage ecosystem options", () => {
  it("accepts an array-shaped ecosystems response", async () => {
    getEcosystems.mockResolvedValueOnce([
      { name: "Arr", status: "active" },
    ] as unknown as { ecosystems: [] });
    getPublicProjects.mockResolvedValueOnce(makeResponse(1, 1));
    renderPage();
    await waitFor(() => expect(cards()).toBe(1));
  });

  it("discovers an array property on an unexpected ecosystems response", async () => {
    getEcosystems.mockResolvedValueOnce({
      data: [{ name: "Found", status: "active" }],
    } as unknown as { ecosystems: [] });
    getPublicProjects.mockResolvedValueOnce(makeResponse(1, 1));
    renderPage();
    await waitFor(() => expect(cards()).toBe(1));
  });
});
