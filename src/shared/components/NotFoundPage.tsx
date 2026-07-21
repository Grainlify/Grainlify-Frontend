import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { Home, ArrowLeft } from 'lucide-react'
import { textColor } from '../utils/textColorClasses'

export function NotFoundPage() {
  const { theme } = useTheme()
  const navigate = useNavigate()

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-6 transition-colors ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-[#1a1512] via-[#231c17] to-[#2d241d]'
          : 'bg-gradient-to-br from-[#e8dfd0] via-[#d4c5b0] to-[#c9b89a]'
      }`}
    >
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#c9983a]/20 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#d4af37]/10 blur-3xl animate-pulse" />

      {/* 404 Card */}
      <div
        className={`relative z-10 w-full max-w-md backdrop-blur-[40px] border rounded-[28px] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-colors ${
          theme === 'dark' ? 'bg-white/[0.08] border-white/15' : 'bg-white/[0.15] border-white/25'
        }`}
      >
        {/* 404 Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-[#c9983a]/20 flex items-center justify-center">
            <span
              className={`text-6xl font-bold ${
                theme === 'dark' ? 'text-[#c9983a]' : 'text-[#a67c2e]'
              }`}
            >
              404
            </span>
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center mb-8">
          <h1 className={`text-2xl font-bold mb-2 transition-colors ${
            theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
          }`}>
            Page Not Found
          </h1>
          <p className={`text-sm transition-colors ${
            theme === 'dark' ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]'
          }`}>
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate(-1)}
            className={`w-full py-3 rounded-[12px] font-medium transition-all flex items-center justify-center space-x-2 ${
              theme === 'dark'
                ? 'bg-white/[0.08] hover:bg-white/[0.12] text-[#f5efe5] border border-white/15'
                : 'bg-white/[0.15] hover:bg-white/[0.2] text-[#2d2820] border border-white/25'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 rounded-[12px] bg-[#c9983a] hover:bg-[#d4af37] text-white font-medium transition-all shadow-[0_4px_12px_rgba(201,152,58,0.3)] flex items-center justify-center space-x-2"
          >
            <Home className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </button>
        </div>

        {/* Help Text */}
        <p className={`text-xs text-center mt-6 transition-colors ${textColor.tertiary}`}>
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  )
}
