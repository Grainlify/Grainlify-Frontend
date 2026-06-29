import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  Search,
  Compass,
  Grid3x3,
  Calendar,
  Globe,
  Users,
  Trophy,
  Database,
  FileText,
  ChevronRight,
  Moon,
  Sun,
  Shield,
  X,
  Menu
} from "lucide-react";
import { useModeAnimation } from "react-theme-switch-animation";
import { useAuth } from "../../shared/contexts/AuthContext";
import grainlifyLogo from "../../assets/grainlify_log.svg";
import { useTheme } from "../../shared/contexts/ThemeContext";
import { UserProfileDropdown } from "../../shared/components/UserProfileDropdown";
import { NotificationsDropdown } from "../../shared/components/NotificationsDropdown";
import { RoleSwitcher } from "../../shared/components/RoleSwitcher";
import {
  Modal,
  ModalFooter,
  ModalButton,
  ModalInput,
} from "../../shared/components/ui/Modal";
import { bootstrapAdmin } from "../../shared/api/client";
import { useTranslation } from "../../shared/i18n";

/**
 * Layout component for the authenticated dashboard area.
 * Provides a sidebar navigation and a main content region with a skip-to-content link
 * for keyboard accessibility.
 */
export function DashboardLayout() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const { theme, setThemeFromAnimation } = useTheme();
  const location = useLocation();
  const { ref: themeToggleRef, toggleSwitchTheme } = useModeAnimation({
    isDarkMode: theme === "dark",
    onDarkModeChange: (isDark) => setThemeFromAnimation(isDark),
  });
  const navigate = useNavigate();
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
     typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [activeRole, setActiveRole] = useState<"contributor" | "maintainer" | "admin">("contributor");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deviceWidth, setDeviceWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : null
  );

  // Admin password gating (bootstrap token)
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(() => {
    return sessionStorage.getItem("admin_authenticated") === "true";
  });
  const [_pendingAdminTarget, setPendingAdminTarget] = useState<"nav" | "role" | null>(null);

  useEffect(() => { 
    const handleResize = () => {
      setDeviceWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get current page from URL path
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard/discover')) return 'discover';
    if (path.startsWith('/dashboard/browse')) return 'browse';
    if (path.startsWith('/dashboard/open-source-week')) return 'osw';
    if (path.startsWith('/dashboard/ecosystems')) return 'ecosystems';
    if (path.startsWith('/dashboard/contributors')) return 'contributors';
    if (path.startsWith('/dashboard/maintainers')) return 'maintainers';
    if (path.startsWith('/dashboard/data')) return 'data';
    if (path.startsWith('/dashboard/leaderboard')) return 'leaderboard';
    if (path.startsWith('/dashboard/blog')) return 'blog';
    if (path.startsWith('/dashboard/settings')) return 'settings';
    if (path.startsWith('/dashboard/admin')) return 'admin';
    if (path.startsWith('/dashboard/search')) return 'search';
    if (path.startsWith('/dashboard/profile')) return 'profile';
    return 'discover';
  };

  const currentPage = getCurrentPage();

  const handleNavigation = (page: string) => {
    navigate(`/dashboard/${page}`);
    setMobileMenuOpen(false);
  };


  const openAdminAuthModal = (target: "nav" | "role") => {
    setPendingAdminTarget(target);
    setShowAdminPasswordModal(true);
  };


  const handleAdminPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) return;
    setIsAuthenticating(true);
    try {
      const response = await bootstrapAdmin(adminPassword.trim());
      await login(response.token);
      setAdminAuthenticated(true);
      sessionStorage.setItem("admin_authenticated", "true");
      setShowAdminPasswordModal(false);
      setAdminPassword("");
      setActiveRole("admin");
      handleNavigation("admin");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Admin authentication failed:", error);
      setAdminPassword("");
    } finally {
      setIsAuthenticating(false);
      setPendingAdminTarget(null);
    }
  };

  const handleRoleChange = (role: "contributor" | "maintainer" | "admin") => {
    if (role === "admin") {
      if (adminAuthenticated) {
        setActiveRole("admin");
        handleNavigation("admin");
      } else {
        openAdminAuthModal("role");
      }
      return;
    }
    setActiveRole(role);
    if (role === "maintainer") {
      handleNavigation("maintainers");
    } else {
      handleNavigation("discover");
    }
  };

  const closeMobileNav = () => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  // Role-based navigation items
  const navItems = [
    { id: "discover", icon: Compass, label: t("dashboardNav.discover"), path: "/dashboard/discover" },
    { id: "browse", icon: Grid3x3, label: t("dashboardNav.browse"), path: "/dashboard/browse" },
    { id: "osw", icon: Calendar, label: t("dashboardNav.openSourceWeek"), path: "/dashboard/open-source-week" },
    { id: "ecosystems", icon: Globe, label: t("dashboardNav.ecosystems"), path: "/dashboard/ecosystems" },
    activeRole === "maintainer" || activeRole === "admin"
      ? { id: "maintainers", icon: Users, label: t("dashboardNav.maintainers"), path: "/dashboard/maintainers" }
      : { id: "contributors", icon: Users, label: t("dashboardNav.contributors"), path: "/dashboard/contributors" },
    ...(activeRole === "admin"
      ? [{ id: "data", icon: Database, label: t("dashboardNav.data"), path: "/dashboard/data" }]
      : []),
    { id: "leaderboard", icon: Trophy, label: t("dashboardNav.leaderboard"), path: "/dashboard/leaderboard" },
    { id: "blog", icon: FileText, label: t("dashboardNav.blog"), path: "/dashboard/blog" },
  ];

  const darkTheme = theme === "dark";
  const isSmallDevice = deviceWidth && deviceWidth < 1024;
  const showMobileNav = mobileMenuOpen && isSmallDevice;

/**
 * DashboardLayout Component
 *
 * Provides the core layout structure for the user dashboard.
 * Includes global accessibility features like landmark roles, a skip-to-content link,
 * and a fully fluid, responsive layout grid that accommodates mobile viewports.
 *
 * @returns {React.ReactElement} The structurally accessible dashboard frame.
 */
export const DashboardLayout: React.FC = () => {
  return (
    <div
      className={`min-h-screen relative overflow-hidden transition-colors ${
        darkTheme
          ? "bg-gradient-to-br from-[#1a1512] via-[#231c17] to-[#2d241d]"
          : "bg-gradient-to-br from-[#c4b5a0] via-[#b8a590] to-[#a89780]"
      }`}
    >
      {/* Skip Link */}
      <a
        href="#dashboard-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#c9983a] focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#c9983a] focus:ring-offset-2 transition-all"
      >
        {t("common.skipToContent")}
      </a>

      {/* Subtle Background Texture */}
      <div className="fixed inset-0 opacity-40">
        <div
          className={`absolute top-0 left-0 w-[800px] h-[800px] bg-gradient-radial blur-[100px] ${
            darkTheme
              ? "from-[#c9983a]/10 to-transparent"
              : "from-[#d4c4b0]/30 to-transparent"
          }`}
        />
        <div
          className={`absolute bottom-0 right-0 w-[900px] h-[900px] bg-gradient-radial blur-[120px] ${
            darkTheme
              ? "from-[#c9983a]/5 to-transparent"
              : "from-[#b8a898]/20 to-transparent"
          }`}
        />
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-2 left-2 bottom-2 z-50 transition-all duration-300 ${isSidebarCollapsed ? "w-[65px] mr-2" : "w-56 mr-2"}`}
      >
        Skip to main content
      </a>

      {/* Fixed Layout Structural Components */}
      <Header />
      <Sidebar />

      {/* 2. Main Landmark Container with Responsive Tailwind Offsets */}
      <main
        id="dashboard-main"
        tabIndex={-1}
        className={`mr-2 my-2 relative z-10 transition-all duration-300 outline-none ${isSidebarCollapsed ? "ml-[81px]" : "ml-[240px]"}`}
      >
        <div className="container mx-auto p-4 md:p-8">
          {/* Nested Route Content renders here without double-landmark conflicts */}
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout
