import { Link } from "react-router-dom";
import { Menu, X, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useThemeToggleAnimation } from "../../../shared/hooks/useThemeToggleAnimation";
import grainlifyLogo from "../../../assets/grainlify_log.svg";

// Aceternity's "Navbar Pill", recoloured to the warm palette and gold
// #c9983a. The pill treatment is the reason for the pick: the hero's badge is
// a pill and the dashboard's role switcher is a pill, so this echoes an
// idiom the product already has rather than importing a new one.
//
// What the block does NOT have, and is kept from the navbar it replaces: the
// animated theme toggle, and the auth-aware right-hand side that shows
// Dashboard + Sign Out to a signed-in visitor and Get Started to everyone
// else. Those are behaviour, not styling, so the block supplies the treatment
// and this supplies what the bar actually does.
//
// Its `dark:` variants and its @tabler/icons-react dependency are dropped -
// the first because `dark:` follows the OS here rather than the theme toggle
// (see Hero.tsx), the second because three icons is not worth a new package
// when lucide-react is already installed.

const LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Why Choose Us", href: "#why-choose-us" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, logout } = useAuth();
  const { ref, toggleWithAnimation: toggleSwitchTheme } = useThemeToggleAnimation({
    onToggle: toggleTheme,
  });
  const isDark = theme === "dark";
  const reduceMotion = useReducedMotion();

  const tap = reduceMotion ? {} : { whileTap: { scale: 0.97 } };
  const lift = reduceMotion ? {} : { whileHover: { y: -1 }, whileTap: { scale: 0.97 } };

  const ghost = `px-5 py-2.5 rounded-full transition-colors font-medium ${
    isDark ? "text-[#e8dfd0] hover:text-[#c9983a]" : "text-[#2d2820] hover:text-[#c9983a]"
  }`;

  // Ink on gold, not white on gold: white measures 2.61:1 against #c9983a
  // (issue #1057) and this bar is where that pairing was most visible.
  const cta =
    "px-5 py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-[#c9983a] to-[#d4af37] text-[#2d2820] border border-white/10 shadow-[0_4px_14px_rgba(162,121,44,0.35)] hover:shadow-[0_6px_18px_rgba(162,121,44,0.45)] transition-all";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-[40px] border-b shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-colors ${
        isDark ? "bg-[#1a1512]/[0.85] border-white/10" : "bg-white/[0.12] border-white/25"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-2">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link to="/" className="flex items-center space-x-3 shrink-0">
            <img src={grainlifyLogo} alt="Grainlify" className="w-9 h-9 rounded-[10px]" />
            <span
              className={`text-lg font-bold transition-colors ${
                isDark ? "text-[#e8dfd0]" : "text-[#2d2820]"
              }`}
            >
              Grainlify
            </span>
          </Link>

          {/* The pill group */}
          <nav
            className={`hidden md:flex items-center gap-1 rounded-full border p-1 backdrop-blur-[30px] transition-colors ${
              isDark ? "bg-white/[0.06] border-white/12" : "bg-white/[0.25] border-white/30"
            }`}
          >
            {LINKS.map((l) => (
              <motion.a
                key={l.href}
                href={l.href}
                {...lift}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isDark
                    ? "text-[#c6b9a8] hover:text-[#e8dfd0] hover:bg-white/[0.08]"
                    : "text-[#6f6152] hover:text-[#2d2820] hover:bg-white/[0.5]"
                }`}
              >
                {l.label}
              </motion.a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            <motion.button
              ref={ref}
              onClick={toggleSwitchTheme}
              {...tap}
              className={`p-2.5 rounded-full backdrop-blur-[30px] border transition-all ${
                isDark
                  ? "bg-white/[0.08] border-white/15 hover:bg-white/[0.12] text-[#e8dfd0]"
                  : "bg-white/[0.15] border-white/25 hover:bg-white/[0.2] text-[#2d2820]"
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.button>

            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className={ghost}>
                  Dashboard
                </Link>
                <button onClick={logout} className={ghost}>
                  Sign Out
                </button>
              </>
            ) : (
              <motion.div {...tap}>
                <Link to="/signin" className={`${cta} inline-block`}>
                  Get Started
                </Link>
              </motion.div>
            )}
          </div>

          <motion.button
            {...tap}
            onClick={() => setMobileMenuOpen((s) => !s)}
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
            className={`md:hidden inline-flex size-10 items-center justify-center rounded-full border transition-colors ${
              isDark
                ? "bg-white/[0.08] border-white/15 text-[#e8dfd0]"
                : "bg-white/[0.15] border-white/25 text-[#2d2820]"
            }`}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </motion.button>
        </div>

        <AnimatePresence initial={false}>
          {mobileMenuOpen && (
            <motion.div
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }}
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
              transition={reduceMotion ? undefined : { duration: 0.22 }}
              className="md:hidden overflow-hidden"
            >
              <div className="flex flex-col gap-1 py-3">
                {LINKS.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`rounded-full px-4 py-2.5 text-[15px] font-medium transition-colors ${
                      isDark
                        ? "text-[#c6b9a8] hover:text-[#e8dfd0] hover:bg-white/[0.08]"
                        : "text-[#6f6152] hover:text-[#2d2820] hover:bg-white/[0.4]"
                    }`}
                  >
                    {l.label}
                  </a>
                ))}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={toggleSwitchTheme}
                    className={`p-2.5 rounded-full border transition-all ${
                      isDark
                        ? "bg-white/[0.08] border-white/15 text-[#e8dfd0]"
                        : "bg-white/[0.15] border-white/25 text-[#2d2820]"
                    }`}
                    aria-label="Toggle theme"
                  >
                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>

                  {isAuthenticated ? (
                    <>
                      <Link
                        to="/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className={ghost}
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                        className={ghost}
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/signin"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`${cta} flex-1 text-center`}
                    >
                      Get Started
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
