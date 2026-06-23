import React, { useState, useEffect } from 'react'

/** The fallback SVG base64 string when an image fails to load. */
export const FALLBACK_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

/**
 * Props for ImageWithFallback component.
 */
export interface ImageWithFallbackProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'onLoad'> {
  /** Optional callback invoked when the image loads successfully. */
  onLoad?: () => void
}

/**
 * ImageWithFallback
 *
 * A resilient image component that loads a remote or local image source.
 *
 * @remarks
 * - **Purpose**: Renders an image with fallback logic and supports lazy loading.
 * - **Retry Behavior**: If the image fails to load once, it attempts to load again. If the second attempt fails as well, the fallback image is rendered.
 * - **Fallback**: Uses an SVG placeholder with an accessible `aria-label` when the image cannot be loaded.
 */
export function ImageWithFallback(props: ImageWithFallbackProps) {
  const {
    src,
    alt = 'Image',
    style,
    className,
    loading = 'lazy',
    onLoad,
    ...rest
  } = props

  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // Reset state when src changes
  useEffect(() => {
    setHasError(false)
    setRetryCount(0)
  }, [src])

  const handleError = () => {
    if (retryCount < 1) {
      setRetryCount(prev => prev + 1)
    } else {
      setHasError(true)
    }
  }

  const handleLoad = () => {
    if (onLoad) {
      onLoad()
    }
  }

  const getSrcWithRetry = () => {
    if (!src) return src
    if (retryCount > 0 && !src.startsWith('data:')) {
      const separator = src.includes('?') ? '&' : '?'
      return `${src}${separator}retry=${retryCount}`
    }
    return src
  }

  if (hasError) {
    return (
      <div
        className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
        style={style}
      >
        <div className="flex items-center justify-center w-full h-full">
          <img
            src={FALLBACK_IMAGE}
            alt={alt}
            aria-label="Error loading image"
            {...rest}
          />
        </div>
      </div>
    )
  }

  return (
    <img
      key={retryCount}
      src={getSrcWithRetry()}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      onError={handleError}
      onLoad={handleLoad}
      {...rest}
    />
  )
}

