import {
  Component,
  Suspense,
  lazy,
  useEffect,
  type ComponentProps,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { isChunkLoadError } from '../../../shared/components/chunkReload';

/** A lazy-loaded route component whose dynamic import can be reset and retried
 *  at route scope without reloading the entire document.
 *
 *  `React.lazy` caches a rejected promise inside its internal payload (`_status
 *  = Rejected`). Once an import rejects, re-rendering the same `React.lazy`
 *  instance re-throws the cached rejection synchronously without calling the
 *  import factory again. Wrapping the `lazy` instance behind `reset()` lets a
 *  per-route error boundary swap in a fresh `React.lazy(factory)` so the next
 *  render genuinely re-imports that route's chunk.
 */
export interface RetryableLazyComponent<T extends ComponentType<any>> {
  (props: ComponentProps<T>): JSX.Element;
  /** Disards the cached lazy payload so the next render re-invokes `factory`. */
  reset: () => void;
}

export function lazyRoute<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): RetryableLazyComponent<T> {
  let Inner = lazy(factory);

  const Wrapper = ((props: ComponentProps<T>) => {
    const Current = Inner;
    return <Current {...props} />;
  }) as RetryableLazyComponent<T>;

  Wrapper.reset = () => {
    Inner = lazy(factory);
  };

  return Wrapper;
}

/** Fires `onResolved` only after the `<Suspense>` subtree has both resolved its
 *  lazy chunk import and committed a render without throwing.
 *
 *  At document scope (`chunkReload.ts`), "recovered" has no safe definition
 *  because the shell rendering says nothing about whether the failing route
 *  loaded. At a single route boundary, "recovered" is exact: the child inside
 *  `<Suspense>` resolved and committed.
 */
function RouteResolvedSentinel({
  onResolved,
  children,
}: {
  onResolved: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    onResolved();
  }, [onResolved]);

  return <>{children}</>;
}

export interface RouteBoundaryProps {
  /** Human-readable name for the route surface (e.g. "Leaderboard", "The admin tab"). */
  surface: string;
  /** Route-specific skeleton rendered while the route's chunk is loading. */
  fallback: ReactNode;
  /** Resets the route's lazy wrapper so retrying re-runs the dynamic `import()`. */
  onRetryChunk?: () => void;
  children: ReactNode;
}

interface RouteBoundaryState {
  error: Error | null;
  hasAutoRetried: boolean;
  attempt: number;
}

/** Per-route `<Suspense>` + error boundary with targeted stale-chunk recovery.
 *
 *  Wrapping each lazy route in its own boundary rather than sharing one top-level
 *  `<Suspense>` across all 22 dashboard pages achieves two things:
 *
 *  1. Each route renders a skeleton whose layout matches the page that is
 *     actually arriving, rather than a generic spinner.
 *  2. A failed chunk import retries re-importing *that route's chunk* once
 *     before falling back to an inline error card inside the route. Retrying
 *     one route does not spend the document-wide reload budget in
 *     `chunkReload.ts`, preserves state elsewhere in the app, and keeps the
 *     dashboard shell and navigation alive if the retry also fails.
 */
export class RouteBoundary extends Component<RouteBoundaryProps, RouteBoundaryState> {
  state: RouteBoundaryState = {
    error: null,
    hasAutoRetried: false,
    attempt: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<RouteBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isChunkLoadError(error) && !this.state.hasAutoRetried) {
      this.props.onRetryChunk?.();
      this.setState((prev) => ({
        error: null,
        hasAutoRetried: true,
        attempt: prev.attempt + 1,
      }));
      return;
    }

    console.error(`[${this.props.surface}] render failed`, error, info.componentStack);
  }

  private handleResolved = () => {
    if (this.state.hasAutoRetried) {
      this.setState({ hasAutoRetried: false });
    }
  };

  private handleManualRetry = () => {
    this.props.onRetryChunk?.();
    this.setState((prev) => ({
      error: null,
      attempt: prev.attempt + 1,
    }));
  };

  private handleDocumentReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (error) {
      const chunkFailure = isChunkLoadError(error);
      return (
        <div
          role="alert"
          data-route-surface={this.props.surface}
          className="rounded-[16px] border border-[#c9983a]/35 bg-[#c9983a]/[0.10] p-5"
        >
          <p className="text-[15px] font-bold text-[#2d2820] dark:text-[#f5efe5]">
            {this.props.surface} couldn't be {chunkFailure ? 'loaded' : 'displayed'}
          </p>
          {chunkFailure ? (
            <p className="text-[14px] mt-1.5 text-[#7a6b5a] dark:text-[#b8a898]">
              This section's code could not be fetched even after retrying once. The rest of the
              dashboard is still working and nothing you entered elsewhere was lost. You can retry
              loading just this section, or reload the page if a new version was just deployed.
            </p>
          ) : (
            <p className="text-[14px] mt-1.5 text-[#7a6b5a] dark:text-[#b8a898]">
              The rest of the site is fine — this section failed to render.{' '}
              <strong className="font-semibold">No action you took has been undone</strong>, but if
              you were in the middle of something, check whether it completed before trying again.
            </p>
          )}
          <pre className="mt-3 text-[12px] font-mono whitespace-pre-wrap break-all text-[#7a6b5a] dark:text-[#b8a898]">
            {error.message}
          </pre>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={this.handleManualRetry}
              className="px-4 py-2 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] border border-white/10"
            >
              Try again
            </button>
            {chunkFailure && (
              <button
                type="button"
                onClick={this.handleDocumentReload}
                className="px-4 py-2 rounded-[12px] border border-[#c9983a]/40 text-[#2d2820] dark:text-[#f5efe5] font-semibold text-[13px] hover:bg-[#c9983a]/15"
              >
                Reload page
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <Suspense key={this.state.attempt} fallback={this.props.fallback}>
        <RouteResolvedSentinel onResolved={this.handleResolved}>
          {this.props.children}
        </RouteResolvedSentinel>
      </Suspense>
    );
  }
}
