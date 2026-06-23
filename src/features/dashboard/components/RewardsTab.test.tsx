import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

const mockGetProfileRewards = vi.fn();

vi.mock("../../../shared/api/client", () => ({
  getProfileRewards: () => mockGetProfileRewards(),
}));

vi.mock("../../../shared/contexts/ThemeContext", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useTheme: () => ({
    theme: "light",
    toggleTheme: vi.fn(),
    setThemeFromAnimation: vi.fn(),
  }),
}));

import { RewardsTab } from "./RewardsTab";

function renderRewardsTab() {
  return render(<RewardsTab />);
}

beforeEach(() => {
  mockGetProfileRewards.mockReset();
});

describe("RewardsTab", () => {
  it("fetches rewards and formats real reward data", async () => {
    mockGetProfileRewards.mockResolvedValue({
      rewards: [
        {
          id: "reward-1",
          date: "2026-06-22T00:00:00Z",
          project_name: "Grainlify Frontend",
          project_logo: "GF",
          contributor_login: "maintainer-login",
          contribution_title: "Fix RewardsTab",
          amount: 1250,
          currency: "usd",
          status: "Complete",
        },
      ],
    });

    renderRewardsTab();

    await waitFor(() =>
      expect(screen.getAllByText("Grainlify Frontend").length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("$1,250").length).toBeGreaterThan(0);
    expect(screen.getAllByText("maintainer-login").length).toBeGreaterThan(0);
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
    expect(mockGetProfileRewards).toHaveBeenCalledTimes(1);
  });

  it("shows a loading skeleton while rewards are loading", () => {
    mockGetProfileRewards.mockReturnValue(new Promise(() => {}));

    renderRewardsTab();

    expect(screen.getByLabelText("Loading rewards")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("shows an empty state when the API returns no rewards", async () => {
    mockGetProfileRewards.mockResolvedValue({ rewards: [] });

    renderRewardsTab();

    expect(await screen.findByText("No rewards yet")).toBeInTheDocument();
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
  });

  it("shows an error state and retries successfully", async () => {
    mockGetProfileRewards.mockRejectedValueOnce(new Error("network"));

    renderRewardsTab();

    const errorMessage = await screen.findByText("Unable to load rewards");
    const retry = errorMessage.closest('[role="alert"]')!.querySelector("button")!;

    mockGetProfileRewards.mockResolvedValue({
      rewards: [
        {
          id: 2,
          created_at: "2026-06-20T00:00:00Z",
          project: "Retry Project",
          amount: "42.5",
          currency: "EUR",
          status: "Processing",
        },
      ],
    });

    await userEvent.click(retry);

    await waitFor(() =>
      expect(screen.getAllByText("Retry Project").length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("€42.50").length).toBeGreaterThan(0);
    expect(screen.queryByText("Unable to load rewards")).not.toBeInTheDocument();
    expect(mockGetProfileRewards).toHaveBeenCalledTimes(2);
  });

  it("guards missing amount and currency values without rendering undefined", async () => {
    mockGetProfileRewards.mockResolvedValue({
      rewards: [
        {
          id: "missing-amount",
          project_name: "Guarded Project",
          amount: undefined,
          currency: undefined,
          status: undefined,
        },
      ],
    });

    renderRewardsTab();

    await waitFor(() =>
      expect(screen.getAllByText("Guarded Project").length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
  });

  it("falls back to USD when the API returns an invalid currency code", async () => {
    mockGetProfileRewards.mockResolvedValue({
      rewards: [
        {
          id: "invalid-currency",
          project_name: "Fallback Currency Project",
          amount: 12,
          currency: "not-valid",
          status: "Complete",
        },
      ],
    });

    renderRewardsTab();

    await waitFor(() =>
      expect(
        screen.getAllByText("Fallback Currency Project").length,
      ).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("$12").length).toBeGreaterThan(0);
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
  });
});
