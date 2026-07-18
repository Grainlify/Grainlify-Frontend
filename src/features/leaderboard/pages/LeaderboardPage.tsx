import * as React from "react";
import { ContributorsTable } from "../components/ContributorsTable";
import { ProjectsTable } from "../components/ProjectsTable";

/**
 * LeaderboardPage displays contribution rankings.
 * Filters the dataset based on activeFilter dimension.
 */
export const LeaderboardPage = ({ data }: { data: any[] }) => {
  const [activeFilter, setActiveFilter] = React.useState<string>("all");

  // Filtered data logic
  const filteredData = React.useMemo(() => {
    if (activeFilter === "all") return data;
    return data.filter((item) => item.dimension === activeFilter);
  }, [data, activeFilter]);

  return (
    <div>
      <select onChange={(e) => setActiveFilter(e.target.value)} value={activeFilter}>
        <option value="all">All</option>
        <option value="blockchain">Blockchain</option>
        <option value="web">Web</option>
      </select>

      {filteredData.length > 0 ? (
        <>
          <ContributorsTable data={filteredData} />
          <ProjectsTable data={filteredData} />
        </>
      ) : (
        <div className="empty-state">No results found for this filter.</div>
      )}
    </div>
  );
};
