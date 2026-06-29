import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* 1. Skip to Content Link for Keyboard and Screen Reader Users */}
      <a
        href="#main-content"
        className="absolute left-4 top-[-100%] z-50 bg-blue-600 text-white px-4 py-2 rounded-b-md transition-all duration-200 focus:top-0 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        Skip to main content
      </a>

      {/* Fixed Layout Structural Components */}
      <Header />
      <Sidebar />

      {/* 2. Main Landmark Container with Responsive Tailwind Offsets */}
      <main
        id="main-content"
        tabIndex={-1}
        className="pt-16 md:pt-20 pl-0 md:pl-64 min-h-screen transition-all duration-300 focus:outline-none"
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
