import { useState, useCallback } from "react";

/**
 * Props for the ImageWithFallback component.
 *
 * @remarks
 * Use this component for all remote images to ensure graceful degradation
 * when the source fails to load or is untrusted.
 */
export interface ImageWithFallbackProps {
  /** Image source URL. Must be a valid HTTP(S) URL. */
  src: string;
  /** Descriptive alt text for screen readers. Use "" for decorative images. */
  alt: string;
  /** CSS class names applied to the img element. */
  className?: string;
  /** Native img loading strategy. */
  loading?: "eager" | "lazy";
  /** Image decoding hint for the browser. */
  decoding?: "async" | "sync" | "auto";
  /** Optional inline styles. */
  style?: React.CSSProperties;
}

/**
 * Validates that a string is a safe HTTP(S) URL.
 *
 * @param url - The URL string to validate.
 * @returns `true` if the URL is valid and uses http: or https:.
 */
function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * A resilient image component that validates remote URLs and renders
 * a neutral placeholder skeleton when the image fails to load.
 *
 * @example
 * ```tsx
 * <ImageWithFallback
 *   src="https://example.com/avatar.jpg"
 *   alt="User avatar"
 *   loading="lazy"
 *   decoding="async"
 *   className="w-12 h-12 rounded-full"
 * />
 * ```
 */
export function ImageWithFallback({
  src,
  alt,
  className = "",
  loading = "lazy",
  decoding = "async",
  style,
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  // Security: reject non-HTTP(S) URLs entirely
  const isValid = isValidImageUrl(src);

  if (!isValid || hasError) {
    return (
      <div
        className={`bg-white/10 animate-pulse ${className}`}
        style={style}
        aria-hidden="true"
        data-testid="image-fallback"
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding={decoding}
      className={className}
      style={style}
      onError={handleError}
      data-testid="image-with-fallback"
    />
  );
}