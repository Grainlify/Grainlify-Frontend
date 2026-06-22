import { Link } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { Menu, X, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useModeAnimation } from "react-theme-switch-animation";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { useAuth } from "../../../shared/contexts/AuthContext";
import grainlifyLogo from "../../../assets/grainlify_log.svg";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setThemeFromAnimation } = useTheme();
  const { isAuthenticated, logout } = useAuth();
  const { ref, toggleSwitchTheme } = useModeAnimation({
    isDarkMode: theme === "dark",
    onDarkModeChange: (isDark) => setThemeFromAnimation(isDark),
  });

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-[40px] border-b shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-colors ${
        theme === "dark"
          ? "bg-[#1a1512]/[0.85] border-white/10"
          : "bg-white/[0.12] border-white/25"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo — above-the-fold, eager load for LCP */}
          <Link to="/" className="flex items-center space-x-3">
            <img
              src={grainlifyLogo}
              alt="Grainlify"
              loading="eager"
              decoding="async"
              className="w-8 h-8 grainlify-logo"
            />
            <span
              className={`text-xl font-semibold transition-colors ${
                theme === "dark" ? "text-[#e8dfd0]" : "text-[#2d2820]"
              }`}
            >
              Grainlify
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#features"
              className={`transition-colors font-medium ${
                theme === "dark"
                  ? "text-[#b8a898] hover:text-[#c9983a]"
                  : "text-[#7a6b5a] hover:text-[#c9983a]"
              }`}
            >
              <FormattedMessage id="landingNav.features" />
            </a>
            <a
              href="#how-it-works"
              className={`transition-colors font-medium ${
                theme === "dark"
                  ? "text-[#b8a898] hover:text-[#c9983a]"
                  : "text-[#7a6b5a] hover:text-[#c9983a]"
              }`}
            >
              <FormattedMessage id="landingNav.howItWorks" />
            </a>
            <a
              href="#why-choose-us"
              className={`transition-colors font-medium ${
                theme === "dark"
                  ? "text-[#b8a898] hover:text-[#c9983a]"
                  : "text-[#7a6b5a] hover:text-[#c9983a]"
              }`}
            >
              <FormattedMessage id="landingNav.whyChooseUs" />
            </a>
            <a
              href="#testimonials"
              className={`transition-colors font-medium ${
                theme === "dark"
                  ? "text-[#b8a898] hover:text-[#c9983a]"
                  : "text-[#7a6b5a] hover:text-[#c9983a]"
              }`}
            >
              <FormattedMessage id="landingNav.testimonials" />
            </a>
          </div>

          {/* CTA Buttons + Theme Toggle */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              ref={ref}
              onClick={() => {
                toggleSwitchTheme();
              }}
              className={`p-2.5 rounded-[12px] backdrop-blur-[30px] border transition-all ${
                theme === "dark"
                  ? "bg-white/[0.08] border-white/15 hover:bg-white/[0.12] text-[#e8dfd0]"
                  : "bg-white/[0.15] border-white/25 hover:bg-white/[0.2] text-[#2d2820]"
              }`}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className={`px-5 py-2.5 rounded-[12px] transition-colors font-medium ${
                    theme === "dark"
                      ? "text-[#e8dfd0] hover:text-[#c9983a]"
                      : "text-[#2d2820] hover:text-[#c9983a]"
                  }`}
                >
                  <FormattedMessage id="landingNav.dashboard" />
                </Link>
                <button
                  onClick={logout}
                  className={`px-5 py-2.5 rounded-[12px] transition-colors font-medium ${
                    theme === "dark"
                      ? "text-[#e8dfd0] hover:text-[#c9983a]"
                      : "text-[#2d2820] hover:text-[#c9983a]"
                  }`}
                >
                  <FormattedMessage id="landingNav.signOut" />
                </button>
              </>
            ) : (
              <Link
                to="/signin"
                className="px-5 py-2.5 rounded-[12px] bg-gradient-to-r from-[#c9983a] to-[#d4af37] text-white font-medium hover:shadow-2xl hover:shadow-[#c9983a]/50 transition-all"
              >
                <FormattedMessage id="landingNav.getStarted" />
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-4">
            <a
              href="#features"
              className={`block transition-colors font-medium ${
                theme === "dark"
                  ? "text-[#b8a898] hover:text-[#c9983a]"
                  : "text-[#7a6b5a] hover:text-[#c9983a]"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <FormattedMessage id="landingNav.features" />
            </a>
            <a
              href="#how-it-works"
              className={`block transition-colors font-medium ${
                theme === "dark"
                  ? "text-[#b8a898] hover:text-[#c9983a]"
                  : "text-[#7a6b5a] hover:text-[#c9983a]"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <FormattedMessage id="landingNav.howItWorks" />
            </a>
            <a
              href="#why-choose-us"
              className={`block transition-colors font-medium ${
                theme === "dark"
                  ? "text-[#b8a898] hover:text-[#c9983a]"
                  : "text-[#7a6b5a] hover:text-[#c9983a]"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <FormattedMessage id="landingNav.whyChooseUs" />
            </a>
            <a
              href="#testimonials"
              className={`block transition-colors font-medium ${
                theme === "dark"
                  ? "text-[#b8a898] hover:text-[#c9983a]"
                  : "text-[#7a6b5a] hover:text-[#c9983a]"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <FormattedMessage id="landingNav.testimonials" />
            </a>

            {/* Theme Toggle Mobile */}
            <button
              onClick={() => {
                toggleSwitchTheme();
              }}
              className={`w-full text-left px-3 py-2 rounded-[12px] transition-colors font-medium ${
                theme === "dark"
                  ? "text-[#e8dfd0] hover:text-[#c9983a]"
                  : "text-[#2d2820] hover:text-[#c9983a]"
              }`}
            >
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>

            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className={`block px-3 py-2 rounded-[12px] transition-colors font-medium ${
                    theme === "dark"
                      ? "text-[#e8dfd0] hover:text-[#c9983a]"
                      : "text-[#2d2820] hover:text-[#c9983a]"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FormattedMessage id="landingNav.dashboard" />
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-[12px] transition-colors font-medium ${
                    theme === "dark"
                      ? "text-[#e8dfd0] hover:text-[#c9983a]"
                      : "text-[#2d2820] hover:text-[#c9983a]"
                  }`}
                >
                  <FormattedMessage id="landingNav.signOut" />
                </button>
              </>
            ) : (
              <Link
                to="/signin"
                className="block px-3 py-2 rounded-[12px] bg-gradient-to-r from-[#c9983a] to-[#d4af37] text-white font-medium text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                <FormattedMessage id="landingNav.getStarted" />
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}