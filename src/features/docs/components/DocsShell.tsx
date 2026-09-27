import { useEffect, useMemo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Menu, Moon, Search, Sun, X } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useThemeToggleAnimation } from '../../../shared/hooks/useThemeToggleAnimation';
import { GlassCard } from '../../../shared/components/ui/aceternity/GlassCard';
import grainlifyLogo from '../../../assets/grainlify_log.svg';

// The docs page's frame, laid out on the dashboard's measurements so the docs
// read as part of the app rather than a separate site:
//
//   - the contents panel sits where the dashboard rail sits: 8px from the top,
//     left and bottom edges;
//   - the header is the dashboard's floating pill, 8px from the top and right
//     and 8px from the panel, 52px tall on a computer;
//   - content starts 16px under the header and 8px from the panel and the
//     right edge, the dashboard's own rail and header gaps.
//
// Below 1024px the panel becomes a drawer and the header spans the width, as
// the dashboard's header does.
//
// The header is the only blurred surface, because the article scrolls under
// it; nothing inside it animates (docs/design-system.md: no motion inside
// glass). The contents panel has nothing behind it to blur, so it is a solid
// GlassCard, the same surface as the article.

export const SHELL = {
  /** Content offsets that clear the header and the contents panel. */
  content: 'mx-2 lg:ml-[288px] lg:mr-2 pt-[96px] lg:pt-[76px] pb-8',
  /** Top of anything fixed beside the content, level with the first card. */
  fixedTop: 'top-[76px]',
};

function useIsMac() {
  return useMemo(() => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform), []);
}

function Brand({ isDark }: { isDark: boolean }) {
  return (
    <Link to="/docs" className="flex items-center gap-2.5 min-w-0">
      <img src={grainlifyLogo} alt="Grainlify" className="w-8 h-8 shrink-0" />
      <span className={`text-[17px] font-bold ${isDark ? 'text-[#e8dfd0]' : 'text-[#2d2820]'}`}>Grainlify</span>
      <span className={`rounded-full border px-2 py-0.5 text-[12px] font-semibold ${isDark ? 'border-white/15 text-[#c6b9a8]' : 'border-black/10 text-[#6f6152]'}`}>
        Docs
      </span>
    </Link>
  );
}

export function DocsShell({
  sidebar,
  drawerOpen,
  onDrawer,
  onSearch,
  children,
}: {
  sidebar: (onNavigate?: () => void) => ReactNode;
  drawerOpen: boolean;
  onDrawer: (open: boolean) => void;
  onSearch: () => void;
  children: ReactNode;
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const { isAuthenticated } = useAuth();
  const isMac = useIsMac();
  const { ref: themeRef, toggleWithAnimation } = useThemeToggleAnimation({ onToggle: toggleTheme });

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onDrawer(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, onDrawer]);

  // The dashboard's page ground and its raised pill controls.
  const ground = isDark
    ? 'bg-gradient-to-br from-[#1a1512] via-[#231c17] to-[#2d241d]'
    : 'bg-gradient-to-br from-[#e8dfd0] via-[#d4c5b0] to-[#c9b89a]';
  const pillControl = `shadow-[0px_6px_6.5px_-1px_rgba(0,0,0,0.36),0px_0px_4.2px_0px_rgba(0,0,0,0.69)] ${
    isDark ? 'bg-[#2d2820] text-[#e8dfd0]' : 'bg-[#d4c5b0] text-[#2d2820]'
  }`;
  const pillInset = isDark
    ? 'shadow-[inset_1px_-1px_1px_0px_rgba(0,0,0,0.5),inset_-2px_2px_1px_-1px_rgba(255,255,255,0.11)]'
    : 'shadow-[inset_1px_-1px_1px_0px_rgba(0,0,0,0.15),inset_-2px_2px_1px_-1px_rgba(255,255,255,0.35)]';
  const iconMuted = isDark ? 'text-[rgba(255,255,255,0.69)]' : 'text-[rgba(45,40,32,0.75)]';
  // Ink on gold, as the landing navbar's call to action (white on gold fails contrast).
  // Display is set where each control is used, so `hidden lg:inline-flex` is not
  // overridden by a display class in the shared string.
  const cta =
    'h-[46px] items-center px-5 rounded-full text-sm font-semibold bg-gradient-to-r from-[#c9983a] to-[#d4af37] text-[#2d2820] border border-white/10 shadow-[0_4px_14px_rgba(162,121,44,0.35)]';

  const round = `relative h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full ${pillControl}`;

  return (
    <div className={`min-h-screen transition-colors ${ground}`}>
      {/* Header: the dashboard's pill. */}
      <header
        className={`fixed top-2 right-2 left-2 lg:left-[288px] z-[9999] flex items-center gap-2 lg:gap-3 h-[72px] lg:h-[52px] px-3 lg:px-[3px] rounded-[26px] backdrop-blur-[90px] border ${
          isDark
            ? 'bg-[#2d2820]/[0.4] border-white/10 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25),inset_0px_0px_9px_0px_rgba(201,152,58,0.1)]'
            : 'bg-white/[0.35] border-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25),inset_0px_0px_9px_0px_rgba(255,255,255,0.5)]'
        }`}
      >
        <div className="lg:hidden mr-auto min-w-0">
          <Brand isDark={isDark} />
        </div>

        <button type="button" onClick={onSearch} className={`relative hidden lg:block h-[46px] flex-1 rounded-[23px] text-left ${pillControl}`}>
          <span className={`absolute inset-0 pointer-events-none rounded-[23px] ${pillInset}`} />
          <span className="relative h-full flex items-center justify-between px-5">
            <span className="flex items-center">
              <Search className={`w-4 h-4 mr-3 ${iconMuted}`} aria-hidden="true" />
              <span className={`text-[13px] ${isDark ? 'text-[rgba(255,255,255,0.5)]' : 'text-[rgba(45,40,32,0.5)]'}`}>Search the docs</span>
            </span>
            <span
              className={`px-2 py-1 rounded border text-[11px] font-medium ${
                isDark ? 'bg-white/[0.08] border-white/20 text-white/70' : 'bg-black/[0.08] border-black/15 text-black/70'
              }`}
            >
              {isMac ? '⌘' : 'Ctrl'} K
            </span>
          </span>
        </button>

        <button type="button" onClick={onSearch} aria-label="Search the docs" className={`inline-flex lg:hidden ${round}`}>
          <span className={`absolute inset-0 pointer-events-none rounded-full ${pillInset}`} />
          <Search className={`relative w-4 h-4 ${iconMuted}`} />
        </button>

        <button
          type="button"
          ref={themeRef}
          onClick={toggleWithAnimation}
          aria-label="Toggle theme"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className={`hidden lg:inline-flex ${round}`}
        >
          <span className={`absolute inset-0 pointer-events-none rounded-full ${pillInset}`} />
          {isDark ? <Sun className={`relative w-4 h-4 ${iconMuted}`} /> : <Moon className={`relative w-4 h-4 ${iconMuted}`} />}
        </button>

        <Link to={isAuthenticated ? '/dashboard' : '/signin'} className={`hidden lg:inline-flex mr-[3px] ${cta}`}>
          {isAuthenticated ? 'Dashboard' : 'Get Started'}
        </Link>

        <button type="button" onClick={() => onDrawer(true)} aria-label="Open menu" className={`inline-flex lg:hidden ${round}`}>
          <span className={`absolute inset-0 pointer-events-none rounded-full ${pillInset}`} />
          <Menu className={`relative w-5 h-5 ${iconMuted}`} />
        </button>
      </header>

      {/* Contents: where the dashboard rail sits. */}
      <aside className="hidden lg:block fixed top-2 left-2 bottom-2 w-[272px] z-50">
        <GlassCard className="h-full flex flex-col overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <Brand isDark={isDark} />
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-5 scrollbar-custom">{sidebar()}</div>
        </GlassCard>
      </aside>

      <div className={SHELL.content}>{children}</div>

      {drawerOpen &&
        createPortal(
          <div className="fixed inset-0 z-[10000] lg:hidden" role="dialog" aria-modal="true" aria-label="Documentation contents">
            <div className="absolute inset-0 bg-black/50" onClick={() => onDrawer(false)} />
            <div className={`absolute top-2 left-2 bottom-2 w-[86%] max-w-[340px] rounded-[24px] border overflow-hidden flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.3)] ${ground} ${isDark ? 'border-white/10' : 'border-white/30'}`}>
              <div className="flex items-center justify-between px-5 pt-5 pb-4">
                <Brand isDark={isDark} />
                <button type="button" onClick={() => onDrawer(false)} aria-label="Close contents" className={`inline-flex ${round}`}>
                  <span className={`absolute inset-0 pointer-events-none rounded-full ${pillInset}`} />
                  <X className={`relative w-5 h-5 ${iconMuted}`} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-4">{sidebar(() => onDrawer(false))}</div>
              {/* The phone header has no room for these, so the drawer carries them. */}
              <div className={`flex items-center gap-2 border-t px-4 py-4 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                <button type="button" onClick={toggleTheme} aria-label="Toggle theme" className={`inline-flex ${round}`}>
                  <span className={`absolute inset-0 pointer-events-none rounded-full ${pillInset}`} />
                  {isDark ? <Sun className={`relative w-4 h-4 ${iconMuted}`} /> : <Moon className={`relative w-4 h-4 ${iconMuted}`} />}
                </button>
                <Link to={isAuthenticated ? '/dashboard' : '/signin'} className={`flex flex-1 justify-center ${cta}`}>
                  {isAuthenticated ? 'Dashboard' : 'Get Started'}
                </Link>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
