import * as React from 'react'
import { ContributorsTable } from '../components/ContributorsTable'
import { ProjectsTable } from '../components/ProjectsTable'
import type { FilterType } from '../types'

/**
 * LeaderboardPage displays contribution rankings.
 * Filters the dataset based on activeFilter dimension.
 */
export const LeaderboardPage = ({ data = [] }: { data?: any[] }) => {
  const [activeFilter, setActiveFilter] = React.useState<FilterType>('overall')

  // Filtered data logic
  const filteredData = React.useMemo(() => {
    return data.filter((item) => activeFilter === 'overall' || item.dimension === activeFilter)
  }, [data, activeFilter])

  return (
    <div>
      <select onChange={(e) => setActiveFilter(e.target.value as FilterType)} value={activeFilter}>
        <option value="overall">Overall</option>
        <option value="rewards">Rewards</option>
        <option value="contributions">Contributions</option>
        <option value="ecosystems">Ecosystems</option>
      </select>

      {filteredData.length > 0 ? (
        <>
          <ContributorsTable data={filteredData} activeFilter={activeFilter} isLoaded={true} />
          <ProjectsTable data={filteredData} activeFilter={activeFilter} isLoaded={true} />
        </>
      ) : (
        <div className="empty-state">No results found for this filter.</div>
      )}
    </div>
  )
}
