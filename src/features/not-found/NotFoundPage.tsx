import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '../../shared/contexts/ThemeContext';
import grainlifyLogo from '../../assets/grainlify_log.svg';

/** Every path no route claims. Public, outside the sign-in guard, so a typo
 * is answered with "not found" rather than a sign-in screen.
 *
 * The sign-in page's frame (SignInPage) with its glows held still, as the
 * wallet-link page does: nothing new visually. The server answers these paths
 * with HTTP 404 too - vercel.json rewrites only real routes to the app, and
 * everything else gets 404.html, a copy of index.html that renders this. */
export function NotFoundPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const { pathname, search } = useLocation();
  const strong = dark ? 'text-[#f5efe5]' : 'text-[#2d2820]';
  const muted = dark ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]';

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 sm:px-6 py-16 relative overflow-hidden ${dark ? 'bg-gradient-to-br from-[#1a1512] via-[#231c17] to-[#2d241d]' : 'bg-gradient-to-br from-[#e8dfd0] via-[#d4c5b0] to-[#c9b89a]'}`}>
      <div aria-hidden="true" className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#c9983a]/30 blur-3xl" />
      <div aria-hidden="true" className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#d4af37]/20 blur-3xl" />

      <Link to="/" className={`absolute top-6 left-6 flex items-center space-x-2 hover:text-[#c9983a] font-medium ${muted}`}>
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Grainlify</span>
      </Link>

      <div className="relative w-full max-w-md">
        <div className={`backdrop-blur-[40px] border rounded-[28px] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex flex-col gap-5 ${dark ? 'bg-white/[0.08] border-white/15' : 'bg-white/[0.15] border-white/25'}`}>
          <div className="flex items-center justify-center space-x-3">
            <img src={grainlifyLogo} alt="" className="w-10 h-10" />
            <span className={`text-2xl font-semibold ${strong}`}>Grainlify</span>
          </div>
          <div className="text-center">
            <h1 className={`text-[26px] leading-tight font-bold mb-2 ${strong}`}>Page not found</h1>
            <p className={`text-[16px] ${muted}`}>There is no page at this address. The link may be mistyped, or the page may have moved.</p>
          </div>
          <p className={`rounded-[12px] border p-3 text-[13px] leading-[1.5] font-mono break-all ${dark ? 'border-white/12 bg-black/25 text-[#f5efe5]' : 'border-black/12 bg-white/[0.45] text-[#2d2820]'}`}>
            {window.location.host}
            {pathname}
            {search}
          </p>
          <Link
            to="/dashboard"
            className="min-h-[52px] w-full rounded-[12px] border border-white/10 bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[16px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] inline-flex items-center justify-center"
          >
            Open your dashboard
          </Link>
          <Link to="/support" className="self-center text-[13px] font-medium text-[#c9983a] hover:text-[#d4af37]">
            Get help
          </Link>
        </div>
      </div>
    </div>
  );
}
