import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useTheme } from '../../shared/contexts/ThemeContext'
import { useTranslation } from '../../shared/i18n'
import Header from './Header'
import Sidebar from './Sidebar'

/**
 * Layout component for the authenticated dashboard area.
 * Provides a sidebar navigation and a main content region with a skip-to-content link
 * for keyboard accessibility.
 */
export function DashboardLayout() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const [isSidebarCollapsed] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  const darkTheme = theme === 'dark'

  return (
    <div
      className={`min-h-screen relative overflow-hidden transition-colors ${
        darkTheme
          ? 'bg-gradient-to-br from-[#1a1512] via-[#231c17] to-[#2d241d]'
          : 'bg-gradient-to-br from-[#c4b5a0] via-[#b8a590] to-[#a89780]'
      }`}
    >
      {/* Skip Link */}
      <a
        href="#dashboard-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#c9983a] focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#c9983a] focus:ring-offset-2 transition-all"
      >
        {t('common.skipToContent')}
      </a>

      {/* Subtle Background Texture */}
      <div className="fixed inset-0 opacity-40">
        <div
          className={`absolute top-0 left-0 w-[800px] h-[800px] bg-gradient-radial blur-[100px] ${
            darkTheme ? 'from-[#c9983a]/10 to-transparent' : 'from-[#d4c4b0]/30 to-transparent'
          }`}
        />
        <div
          className={`absolute bottom-0 right-0 w-[900px] h-[900px] bg-gradient-radial blur-[120px] ${
            darkTheme ? 'from-[#c9983a]/5 to-transparent' : 'from-[#b8a898]/20 to-transparent'
          }`}
        />
      </div>

      {/* Fixed Layout Structural Components */}
      <Header />
      {/* Sidebar */}
      <aside
        className={`fixed top-2 left-2 bottom-2 z-50 transition-all duration-300 ${isSidebarCollapsed ? 'w-[65px] mr-2' : 'w-56 mr-2'}`}
      >
        <Sidebar />
      </aside>

      {/* 2. Main Landmark Container with Responsive Tailwind Offsets */}
      <main
        id="dashboard-main"
        tabIndex={-1}
        className={`mr-2 my-2 relative z-10 transition-all duration-300 outline-none ${isSidebarCollapsed ? 'ml-[81px]' : 'ml-[240px]'}`}
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
