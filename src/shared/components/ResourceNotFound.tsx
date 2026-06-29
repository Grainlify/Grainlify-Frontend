import { Link } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ResourceNotFoundProps {
  /** Main heading text. Defaults to "Resource not found". */
  title?: string;
  /** Secondary message. Defaults to a generic "couldn't find" message. */
  message?: string;
  /** Where the primary action button should navigate to. Defaults to "/dashboard". */
  backTo?: string;
  /** Label for the primary action button. Defaults to "Back to Dashboard". */
  backLabel?: string;
}

/**
 * A generic empty-state/not-found component for use within dashboard pages.
 * Displays a centered message with primary and secondary navigation actions.
 */
export function ResourceNotFound({
  title = 'Resource not found',
  message = "We couldn't find what you're looking for. It may have been moved or removed.",
  backTo = '/dashboard',
  backLabel = 'Back to Dashboard',
}: ResourceNotFoundProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="space-y-6">
      <div
        className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-10 text-center transition-colors ${
          isDark ? 'bg-white/[0.12] border-white/20' : 'bg-white/[0.2] border-white/30'
        }`}
      >
        <h2
          className={`text-[28px] font-bold mb-3 transition-colors ${
            isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
          }`}
        >
          {title}
        </h2>
        <p
          className={`text-[16px] mb-8 transition-colors ${
            isDark ? 'text-[#d4d4d4]' : 'text-[#6b5d4d]'
          }`}
        >
          {message}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to={backTo}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white rounded-[14px] font-semibold text-[14px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_8px_24px_rgba(162,121,44,0.5)] transition-all border border-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9983a] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </Link>
          {backTo !== '/dashboard' && (
            <Link
              to="/dashboard"
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-[14px] font-semibold text-[14px] transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9983a] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                isDark
                  ? 'bg-white/[0.08] border-white/15 text-[#f5efe5] hover:bg-white/[0.12]'
                  : 'bg-white/[0.15] border-black/10 text-[#2d2820] hover:bg-white/[0.25]'
              }`}
            >
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
