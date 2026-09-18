import { AlertCircle, RotateCw } from "lucide-react";
import { isApiError } from "../api/apiError";
import { EmptyState } from "./EmptyState";

/**
 * What a page shows when its data could not be loaded.
 *
 * It exists because the alternative kept being chosen by accident. Pages here
 * caught a failed fetch and then either left the skeleton up ("keep showing
 * skeleton") or set their list to [] and rendered "No issues found" / "No
 * projects yet". Both look like a working page. A contributor whose project
 * lookup 404'd saw a skeleton that never resolved; one whose issue fetch
 * failed saw "No issues in selected repositories" and reasonably concluded
 * there was nothing to apply to. A page that cannot load must say so.
 *
 * `error` is shown as a small code line under the explanation, so a report
 * ("it says project_not_accessible") names the cause without anyone opening
 * the console.
 */
interface LoadFailedProps {
  /** Noun phrase for what failed to load: "this project", "the issues". */
  what: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}

export function LoadFailed({ what, error, onRetry, className }: LoadFailedProps) {
  const code = errorCode(error);
  return (
    <div role="alert">
      <EmptyState
        icon={AlertCircle}
        title={`Couldn't load ${what}`}
        description={
          `${reasonFor(error)}${code ? ` (${code})` : ""}`
        }
        action={onRetry ? { label: "Try again", onClick: onRetry, icon: RotateCw } : undefined}
        className={className}
      />
    </div>
  );
}

function errorCode(error: unknown): string {
  if (isApiError(error)) {
    const fromBody = typeof error.data?.error === "string" ? error.data.error : "";
    return fromBody || `HTTP ${error.status}`;
  }
  if (error instanceof Error && error.message) return error.message;
  return "";
}

function reasonFor(error: unknown): string {
  if (isApiError(error) && error.status === 404) {
    return "The server could not find it or could not reach it on GitHub. This is not something you did.";
  }
  if (isApiError(error) && error.status >= 500) {
    return "The server hit an error. Try again in a moment.";
  }
  if (error instanceof TypeError) {
    return "The request did not reach the server. Check your connection and try again.";
  }
  return "Something went wrong while fetching it. Try again in a moment.";
}
