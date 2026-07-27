import { SkeletonLoader } from './SkeletonLoader'

interface ChartSkeletonProps {
  showTitle?: boolean
  showLegend?: boolean
  barAreaHeight?: string
}

// Fixed heights keep the placeholder deterministic so the markup is stable
// across re-renders and assertable in tests.
const BAR_HEIGHTS = ['65%', '45%', '80%', '55%', '90%', '70%']

export function ChartSkeleton({
  showTitle = true,
  showLegend = true,
  barAreaHeight = '200px',
}: ChartSkeletonProps) {
  return (
    <div className="space-y-6 h-full" data-testid="chart-skeleton">
      {showTitle && (
        <div className="space-y-2">
          <SkeletonLoader variant="text" width="200px" height="24px" />
          <SkeletonLoader variant="text" width="150px" height="14px" />
        </div>
      )}

      <div className="space-y-4 h-full">
        {/* Explicit bar-area height lets callers fill a fixed container; without
            it a percentage height would collapse against the auto-sized parent. */}
        <div className="flex items-end gap-4" style={{ height: barAreaHeight }}>
          {BAR_HEIGHTS.map((height, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
              <SkeletonLoader
                variant="default"
                width="100%"
                height={height}
                className="rounded-t-[8px]"
              />
              <SkeletonLoader variant="text" width="40px" height="12px" />
            </div>
          ))}
        </div>

        {showLegend && (
          <div className="flex items-center gap-4 justify-center pt-4">
            <div className="flex items-center gap-2">
              <SkeletonLoader variant="circle" width="12px" height="12px" />
              <SkeletonLoader variant="text" width="80px" height="12px" />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonLoader variant="circle" width="12px" height="12px" />
              <SkeletonLoader variant="text" width="60px" height="12px" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
