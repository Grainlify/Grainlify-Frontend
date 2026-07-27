import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectsTab } from "./ProjectsTab";

vi.mock("../../../shared/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: "light",
  }),
}));

describe("ProjectsTab", () => {
  it("renders a table with correct accessibility attributes", () => {
    render(<ProjectsTab />);

    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();

    const caption = table.querySelector("caption");
    expect(caption).toBeInTheDocument();
    expect(caption).toHaveTextContent(/projects/i);
    expect(caption).toHaveClass("sr-only");

    const headers = screen.getAllByRole("columnheader");
    expect(headers.length).toBe(10);
    headers.forEach((header) => {
      expect(header).toHaveAttribute("scope", "col");
    });
  });

  it("renders project data correctly", () => {
    render(<ProjectsTab />);

    // Check for some sample project data
    expect(screen.getAllByText("React Ecosystem").length).toBeGreaterThan(0);
    expect(screen.getAllByText("project-lead-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1250").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3,600 USD").length).toBeGreaterThan(0);

    expect(screen.getAllByText("Next.js Framework").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Django").length).toBeGreaterThan(0);
  });

  it("renders mobile view cards", () => {
    render(<ProjectsTab />);

    // In JSDOM, both desktop and mobile views are rendered unless we mock matchMedia
    // or rely on CSS hiding (which JSDOM doesn't do by default for layout).
    // The mobile view has "Contributors" as a label in the stats grid.
    const contributorLabels = screen.getAllByText("Contributors");
    // There are 10 columns in desktop (one is "Contributors")
    // and 5 projects in mobile (each has a "Contributors" label).
    // Total should be 1 + 5 = 6.
    expect(contributorLabels.length).toBe(6);
  });
});
