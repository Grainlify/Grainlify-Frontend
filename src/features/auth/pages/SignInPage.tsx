import { logger } from '../../../shared/utils/logger'
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../../../shared/contexts/ThemeContext'
import { ArrowLeft, Github } from 'lucide-react'
import { getGitHubLoginUrl } from '../../../shared/api/client'
import { useTranslation } from '../../../shared/i18n'

const AUTH_RETURN_TO_KEY = 'authReturnTo'

/**
 * Lifecycle for auth return targets:
 * `/signin?returnTo=...` stores only internal dashboard paths, `/auth/callback`
 * consumes and clears them, and revisiting sign-in clears abandoned attempts.
 */
function isValidAuthReturnTo(returnTo: string | null): returnTo is string {
  if (!returnTo || returnTo.startsWith('//')) return false
  return (
    returnTo === '/dashboard' ||
    returnTo.startsWith('/dashboard/') ||
    returnTo.startsWith('/dashboard?') ||
    returnTo.startsWith('/dashboard#')
  )
}

export function SignInPage() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Persist returnTo so after OAuth we can redirect back to the intended page.
  useEffect(() => {
    sessionStorage.removeItem(AUTH_RETURN_TO_KEY)
    const params = new URLSearchParams(window.location.search)
    const returnTo = params.get('returnTo')
    if (isValidAuthReturnTo(returnTo)) {
      sessionStorage.setItem(AUTH_RETURN_TO_KEY, returnTo)
    }
  }, [])

  // Check for OAuth callback token in URL (fallback for wrong redirect URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (token) {
      // If there's a token in the URL, redirect to the proper callback handler
      navigate(`/auth/callback?token=${token}`, { replace: true })
    }
  }, [navigate])

  const handleGitHubSignIn = async () => {
    setIsRedirecting(true)
    try {
      const loginUrl = await getGitHubLoginUrl()
      window.location.href = loginUrl
    } catch (error) {
      logger.error('Failed to get GitHub login URL:', error)
      setIsRedirecting(false)
    }
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-6 relative overflow-hidden transition-colors ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-[#1a1512] via-[#231c17] to-[#2d241d]'
          : 'bg-gradient-to-br from-[#e8dfd0] via-[#d4c5b0] to-[#c9b89a]'
      }`}
    >
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/30 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent-strong/20 blur-3xl animate-pulse" />

      {/* Back Button */}
      <Link
        to="/"
        className={`absolute top-6 left-6 flex items-center space-x-2 hover:text-primary transition-colors font-medium ${
          theme === 'dark' ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]'
        }`}
      >
        <ArrowLeft className="w-5 h-5" />
        <span>{t('auth.signin.backToHome')}</span>
      </Link>

      {/* Sign In Form */}
      <div className="relative z-10 w-full max-w-md">
        <div
          className={`backdrop-blur-[40px] border rounded-[28px] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-colors ${
            theme === 'dark' ? 'bg-white/[0.08] border-white/15' : 'bg-white/[0.15] border-white/25'
          }`}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center space-x-3 justify-center mb-8">
              <div className="w-10 h-10 rounded-lg bg-accent-gradient shadow-[0_2px_8px_rgba(201,152,58,0.4)]" />
              <span
                className={`text-2xl font-semibold transition-colors ${
                  theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
                }`}
              >
                Grainlify
              </span>
            </div>
            <h2
              className={`text-3xl font-bold mb-2 transition-colors ${
                theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
              }`}
            >
              {t('auth.signin.title')}
            </h2>
            <p
              className={`transition-colors ${
                theme === 'dark' ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]'
              }`}
            >
              {t('auth.signin.subtitle')}
            </p>
          </div>

          {/* GitHub Sign In */}
          <div className="space-y-6">
            <button
              onClick={handleGitHubSignIn}
              disabled={isRedirecting}
              className="w-full py-4 rounded-[12px] bg-[#24292e] hover:bg-[#1b1f23] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-all flex items-center justify-center space-x-3 border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
            >
              {isRedirecting ? (
                <>
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{t('auth.signin.redirecting')}</span>
                </>
              ) : (
                <>
                  <Github className="w-6 h-6" />
                  <span>{t('auth.signin.githubButton')}</span>
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span
                  className={`px-4 bg-transparent transition-colors ${
                    theme === 'dark' ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]'
                  }`}
                >
                  {t('auth.signin.oauthSecurity')}
                </span>
              </div>
            </div>

            <div
              className={`backdrop-blur-[25px] border rounded-[12px] p-4 transition-colors ${
                theme === 'dark'
                  ? 'bg-white/[0.06] border-white/10'
                  : 'bg-white/[0.12] border-white/20'
              }`}
            >
              <p
                className={`text-xs text-center transition-colors ${
                  theme === 'dark' ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]'
                }`}
              >
                {t('auth.signin.consentDisclaimer')}
              </p>
            </div>
          </div>

          {/* Sign Up Link */}
          <p
            className={`text-center mt-6 transition-colors ${
              theme === 'dark' ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]'
            }`}
          >
            {t('auth.signin.signupPrompt')}{' '}
            <Link to="/signup" className="text-[#c9983a] hover:text-[#d4af37] font-medium">
              {t('auth.signin.signupLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
