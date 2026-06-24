import { render, fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, expect } from 'vitest'
import { ApplicationsChart, generateApplicationsSummary } from './ApplicationsChart'

// Mock theme hook to avoid needing full provider
vi.mock('../../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}))

// Mock Recharts to avoid layout size warnings and rendering logs in JSDOM
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <svg>{children}</svg>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: ({ content }: any) => {
    if (typeof content === 'function') {
      return (
        <div data-testid="mock-tooltip">
          {content({
            active: true,
            payload: [
              { dataKey: 'applications', value: 120, color: '#c9983a', payload: { month: 'Jan' } },
              { dataKey: 'merged', value: 80, color: '#4fb37a', payload: { month: 'Jan' } },
            ],
          })}
          {content({
            active: false,
            payload: [],
          })}
        </div>
      )
    }
    return null
  },
}))

const mockData = [
  { month: 'Jan', applications: 120, merged: 80 },
  { month: 'Feb', applications: 150, merged: 95 },
  { month: 'Mar', applications: 200, merged: 110 },
  { month: 'Apr', applications: 180, merged: 140 },
  { month: 'May', applications: 220, merged: 160 },
  { month: 'Jun', applications: 250, merged: 190 },
]

describe('generateApplicationsSummary', () => {
  it('handles empty series', () => {
    expect(generateApplicationsSummary([])).toBe('No application history data available.')
    expect(generateApplicationsSummary(null as any)).toBe('No application history data available.')
  })

  it('handles single data point', () => {
    const singleData = [{ month: 'Jan', applications: 5, merged: 2 }]
    const result = generateApplicationsSummary(singleData)
    expect(result).toContain('Applications history chart showing 1 month')
    expect(result).toContain('Jan: 5 applications, 2 merged')
  })

  it('handles pluralization correctly for single counts', () => {
    const singleData = [{ month: 'Jan', applications: 1, merged: 1 }]
    const result = generateApplicationsSummary(singleData)
    expect(result).toContain('Jan: 1 application, 1 merged')
  })

  it('handles large series/normal series', () => {
    const result = generateApplicationsSummary(mockData)
    expect(result).toContain('Applications history chart showing data for 6 months')
    expect(result).toContain('Total applications: 1120')
    expect(result).toContain('Total merged: 775')
    expect(result).toContain('Jan: 120 applications, 80 merged')
  })
})

describe('ApplicationsChart Component', () => {
  it('renders title, description, and accessibility labels', () => {
    render(<ApplicationsChart data={mockData} />)

    // Check region labelling
    const region = screen.getByRole('region', { name: /applications history/i })
    expect(region).toBeInTheDocument()

    // Check chart container summary label
    const chartContainer = screen.getByRole('img', {
      name: /applications history chart showing data for 6 months/i,
    })
    expect(chartContainer).toBeInTheDocument()

    // SVG wrapper must be aria-hidden="true"
    const svgWrapper = chartContainer.firstElementChild
    expect(svgWrapper).toHaveAttribute('aria-hidden', 'true')
  })

  it('initially displays visual chart and hides the data table visually', () => {
    const { container } = render(<ApplicationsChart data={mockData} />)

    const chartContainer = screen.getByRole('img')
    expect(chartContainer).toHaveClass('block')
    expect(chartContainer).not.toHaveClass('hidden')

    const tableContainer = container.querySelector('#applications-data-table')
    expect(tableContainer).toHaveClass('sr-only')
  })

  it('toggles to data table view on button click and back to chart view', () => {
    const { container } = render(<ApplicationsChart data={mockData} />)

    const toggleButton = screen.getByRole('button', { name: /view table/i })
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false')

    // Click to view table
    fireEvent.click(toggleButton)
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /view chart/i })).toBeInTheDocument()

    // Visual chart container should now be hidden
    const chartContainer = screen.getByRole('img', { hidden: true })
    expect(chartContainer).toHaveClass('hidden')
    expect(chartContainer).not.toHaveClass('block')

    // Table container should be visible (not sr-only)
    const tableContainer = container.querySelector('#applications-data-table')
    expect(tableContainer).not.toHaveClass('sr-only')
    expect(tableContainer).toHaveClass('h-[320px]')

    // Verify table structure and data
    const tableHeaders = screen.getAllByRole('columnheader')
    expect(tableHeaders).toHaveLength(3)
    expect(tableHeaders[0]).toHaveTextContent('Month')
    expect(tableHeaders[1]).toHaveTextContent('Applications')
    expect(tableHeaders[2]).toHaveTextContent('Merged')

    expect(screen.getAllByText('Jan').length).toBeGreaterThan(0)
    expect(screen.getAllByText('120').length).toBeGreaterThan(0)
    expect(screen.getAllByText('80').length).toBeGreaterThan(0)

    // Click to view chart again
    fireEvent.click(toggleButton)
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
    expect(chartContainer).toHaveClass('block')
    expect(tableContainer).toHaveClass('sr-only')
  })

  it('renders placeholders gracefully when data series is empty', () => {
    render(<ApplicationsChart data={[]} />)

    // Verify empty summary
    const chartContainer = screen.getByRole('img', {
      name: /no application history data available/i,
    })
    expect(chartContainer).toBeInTheDocument()

    // Toggle table
    const toggleButton = screen.getByRole('button', { name: /view table/i })
    fireEvent.click(toggleButton)

    // Table must show "No application history data available."
    const noDataCell = screen.getByText('No application history data available.')
    expect(noDataCell).toBeInTheDocument()
    expect(noDataCell).toHaveAttribute('colspan', '3')
  })

  it('renders custom tooltip content correctly when active and covers all tooltip paths', () => {
    render(<ApplicationsChart data={mockData} />)

    // Verify mock tooltip exists and renders correctly
    const tooltipContainer = screen.getByTestId('mock-tooltip')
    expect(tooltipContainer).toBeInTheDocument()
    
    // Check that we have values from applications (120) and merged (80)
    expect(screen.getAllByText('Applications')).toHaveLength(3) // 1 in tooltip, 1 in legend, 1 in table header
    expect(screen.getAllByText('Merged')).toHaveLength(3) // 1 in tooltip, 1 in legend, 1 in table header
    expect(screen.getAllByText('120').length).toBeGreaterThan(0)
    expect(screen.getAllByText('80').length).toBeGreaterThan(0)
  })
})
