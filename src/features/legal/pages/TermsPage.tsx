import { useTheme } from '../../../shared/contexts/ThemeContext'
import { useTranslation } from '../../../shared/i18n/useTranslation'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function TermsPage() {
  const { theme } = useTheme()
  const { t } = useTranslation()

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 py-12 transition-colors ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-[#1a1512] via-[#231c17] to-[#2d241d]'
          : 'bg-gradient-to-br from-[#e8dfd0] via-[#d4c5b0] to-[#c9b89a]'
      }`}
    >
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#c9983a]/20 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#d4af37]/10 blur-3xl animate-pulse" />

      {/* Content Card */}
      <div
        className={`relative z-10 w-full max-w-2xl backdrop-blur-[40px] border rounded-[28px] p-8 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-colors ${
          theme === 'dark' ? 'bg-white/[0.08] border-white/15' : 'bg-white/[0.15] border-white/25'
        }`}
      >
        {/* Back Link */}
        <Link
          to="/signup"
          className={`inline-flex items-center space-x-2 text-sm mb-6 transition-colors ${
            theme === 'dark'
              ? 'text-[#d4c5b0] hover:text-[#c9983a]'
              : 'text-[#7a6b5a] hover:text-[#a67c2e]'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('auth.signup.backToHome')}</span>
        </Link>

        {/* Title */}
        <h1
          className={`text-2xl md:text-3xl font-bold mb-2 transition-colors ${
            theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
          }`}
        >
          {t('terms.service.title')}
        </h1>

        <p
          className={`text-sm mb-8 transition-colors ${
            theme === 'dark' ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]'
          }`}
        >
          {t('terms.description')}
        </p>

        {/* Terms Content */}
        <div
          className={`space-y-6 text-sm leading-relaxed ${theme === 'dark' ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]'}`}
        >
          <section>
            <h2
              className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'}`}
            >
              {t('terms.service.title')}
            </h2>
            <p>
              {t('terms.service.bodyPrefix')}{' '}
              <Link to="/privacy" className="text-[#c9983a] hover:text-[#d4af37] underline">
                {t('terms.links.privacyPolicy')}
              </Link>{' '}
              {t('terms.service.bodySuffix')}
            </p>
          </section>

          <section>
            <h2
              className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'}`}
            >
              {t('terms.dataCollection.title')}
            </h2>
            <p>{t('terms.dataCollection.body')}</p>
          </section>

          <section>
            <h2
              className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'}`}
            >
              {t('terms.userResponsibilities.title')}
            </h2>
            <p>{t('terms.userResponsibilities.body')}</p>
          </section>
        </div>
      </div>
    </div>
  )
}
