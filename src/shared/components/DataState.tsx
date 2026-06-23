import React, { ReactNode } from 'react'
import { getUserFriendlyError } from '../utils/errorHandler'
import './DataState.css'

interface DataStateProps {
  isLoading: boolean
  isEmpty: boolean
  hasError: boolean
  error?: unknown
  onRetry?: () => void
  emptyMessage?: string
  children?: ReactNode
}

/**
 * Renders the canonical loading, error, empty, or content branch for shared data views.
 *
 * Parents provide derived state from `useOptimisticData` or similar hooks. Loading
 * takes precedence over error and empty states, and successful data simply renders
 * the supplied children without wrapping markup.
 */
export const DataState: React.FC<DataStateProps> = ({
  isLoading,
  isEmpty,
  hasError,
  error,
  onRetry,
  emptyMessage = 'No data available.',
  children,
}) => {
  if (isLoading) {
    return (
      <div className="data-state data-state--loading" role="status">
        <div className="glass-loader" />
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="data-state data-state--error">
        <p className="error-message">{getUserFriendlyError(error)}</p>
        {onRetry && (
          <button className="retry-button" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="data-state data-state--empty">
        <p className="empty-message">{emptyMessage}</p>
      </div>
    )
  }

  return <>{children}</>
}
