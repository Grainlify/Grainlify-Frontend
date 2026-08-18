import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SupportPage } from './SupportPage';
import { useTheme } from '../../../shared/contexts/ThemeContext';

/**
 * /support, outside ProtectedRoute.
 *
 * The page itself already existed — it just had no way in that did not require
 * an account. SupportPage rendered only inside Dashboard, and Dashboard is
 * wrapped in ProtectedRoute, so an anonymous visitor was redirected to
 * sign-in: the one person who most needs this is the one who cannot get to it.
 *
 * That mattered more than it looked. Six of the ten support reports we have
 * ever received came from the landing page and sign-in, every one of them
 * anonymous. Pointing those surfaces at a route that bounced them would have
 * closed the path those six people used.
 *
 * A thin shell rather than a second copy of the page: same SupportForm, same
 * doc links, same component. The only difference is the chrome, because there
 * is no dashboard around it here.
 */
export function SupportRoutePage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  return (
    <div
      className={`min-h-screen px-4 sm:px-6 py-10 transition-colors ${
        dark
          ? 'bg-gradient-to-br from-[#1a1512] via-[#231c17] to-[#2d241d]'
          : 'bg-gradient-to-br from-[#e8dfd0] via-[#d4c5b0] to-[#c9b89a]'
      }`}
    >
      <div className="max-w-3xl mx-auto">
        {/* Home, not history.back(): somebody arriving from a link in an
            email or a Telegram message has nothing to go back to. */}
        <Link
          to="/"
          className={`inline-flex items-center gap-2 mb-6 text-[14px] font-medium transition-colors ${
            dark ? 'text-[#b8a898] hover:text-[#f5efe5]' : 'text-[#7a6b5a] hover:text-[#2d2820]'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Grainlify
        </Link>
        <SupportPage />
      </div>
    </div>
  );
}
