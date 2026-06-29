import { render, screen, fireEvent } from "@testing-library/react";
import { LeaderboardPage } from "./LeaderboardPage";

const mockData = [
  { id: 1, dimension: "blockchain" },
  { id: 2, dimension: "web" }
];

test("applies activeFilter correctly to table results", () => {
  render(<LeaderboardPage data={mockData} />);
  
  // Default: shows both
  expect(screen.getByText(/id: 1/)).toBeInTheDocument();
  expect(screen.getByText(/id: 2/)).toBeInTheDocument();

  // Apply filter
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'blockchain' } });
  
  expect(screen.getByText(/id: 1/)).toBeInTheDocument();
  expect(screen.queryByText(/id: 2/)).not.toBeInTheDocument();
});

test("shows empty state when filter excludes all", () => {
  render(<LeaderboardPage data={mockData} />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'non-existent' } });
  expect(screen.getByText(/No results found/)).toBeInTheDocument();
});
