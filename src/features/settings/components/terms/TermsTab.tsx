import { useState, useEffect } from 'react'
import { useTheme } from '../../../../shared/contexts/ThemeContext'
import { getTermsStatus, acceptTerms } from '../../../../shared/api/client'
import { Skeleton } from '../../../../shared/components/ui/skeleton'
import { logger } from '../../../../shared/utils/logger'
import { useTranslation } from '../../../../shared/i18n'

/**
 * Current version of the terms and conditions.
 * Used to track which version the user has accepted.
 */
export const CURRENT_TERMS_VERSION = '1.0.0'

/**
 * Delay (ms) before the loading skeleton is shown. Fast status fetches resolve
 * before this threshold elapses, so the skeleton never flashes for quick loads.
 */
export const SKELETON_DELAY_MS = 300

/**
 * TermsTab component
 * Displays terms of service, privacy policy, and handles user consent.
 */
export function TermsTab() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const loadStatusFailedMessage = t('terms.errors.loadStatusFailed')
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [isAccepted, setIsAccepted] = useState(false)
  const [acceptedVersion, setAcceptedVersion] = useState<string | null>(null)
  const [acceptedDate, setAcceptedDate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Determine if the current acceptance matches the latest terms version
  const isCurrentAccepted =
    isAccepted && acceptedVersion === CURRENT_TERMS_VERSION && !!acceptedDate
  const isVersionMismatch =
    isAccepted && acceptedVersion && acceptedVersion !== CURRENT_TERMS_VERSION
  /** Set when the initial status fetch fails, so the UI can announce it. */
  const [fetchError, setFetchError] = useState<string | null>(null)
  /**
   * Only true once {@link SKELETON_DELAY_MS} has elapsed while still loading.
   * Gates the skeleton so it never flashes for fast loads.
   */
  const [showSkeleton, setShowSkeleton] = useState(false)

  useEffect(() => {
    let mounted = true
    const fetchStatus = async () => {
      try {
        const status = await getTermsStatus()
        if (mounted) {
          setIsAccepted(status.accepted)
          setAcceptedVersion(status.version)
          setAcceptedDate(status.accepted_at)
        }
      } catch (err) {
        logger.error('Failed to fetch terms status:', err)
        if (mounted) {
          setFetchError(err instanceof Error ? err.message : loadStatusFailedMessage)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }
    fetchStatus()
    return () => {
      mounted = false
    }
  }, [loadStatusFailedMessage])

  // Delay the skeleton so quick fetches don't cause a flash of loading UI.
  useEffect(() => {
    if (!isLoading) {
      setShowSkeleton(false)
      return
    }
    const timer = setTimeout(() => setShowSkeleton(true), SKELETON_DELAY_MS)
    return () => clearTimeout(timer)
  }, [isLoading])

  const handleAccept = async () => {
    setIsAccepting(true)
    setError(null)
    try {
      const res = await acceptTerms(CURRENT_TERMS_VERSION)
      setIsAccepted(true)
      setAcceptedVersion(res.version)
      setAcceptedDate(res.accepted_at)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('terms.errors.acceptFailed'))
    } finally {
      setIsAccepting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 transition-colors ${
          theme === 'dark'
            ? 'bg-[#2d2820]/[0.4] border-white/10'
            : 'bg-white/[0.12] border-white/20'
        }`}
      >
        <h2
          className={`text-[28px] font-bold mb-2 transition-colors ${
            theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
          }`}
        >
          {t('terms.title')}
        </h2>
        <p
          className={`text-[14px] transition-colors ${
            theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
          }`}
        >
          {t('terms.description')}
        </p>
      </div>

      {/* Terms Content */}
      <div
        className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 transition-colors ${
          theme === 'dark'
            ? 'bg-[#2d2820]/[0.4] border-white/10'
            : 'bg-white/[0.12] border-white/20'
        }`}
      >
        <div className="prose prose-sm max-w-none">
          <h3
            className={`text-[20px] font-bold mb-4 transition-colors ${
              theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
            }`}
          >
            {t('terms.service.title')}
          </h3>
          <p
            className={`text-[14px] leading-relaxed mb-6 transition-colors ${
              theme === 'dark' ? 'text-[#c5b5a2]' : 'text-[#6b5d4d]'
            }`}
          >
            {t('terms.service.bodyPrefix')}{' '}
            <a href="/terms" className="underline hover:opacity-80">
              {t('terms.links.termsOfService')}
            </a>
            {t('terms.service.bodySuffix')}
          </p>

          <h3
            className={`text-[20px] font-bold mb-4 mt-8 transition-colors ${
              theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
            }`}
          >
            {t('terms.privacy.title')}
          </h3>
          <p
            className={`text-[14px] leading-relaxed mb-6 transition-colors ${
              theme === 'dark' ? 'text-[#c5b5a2]' : 'text-[#6b5d4d]'
            }`}
          >
            {t('terms.privacy.bodyPrefix')}{' '}
            <a href="/privacy" className="underline hover:opacity-80">
              {t('terms.links.privacyPolicy')}
            </a>{' '}
            {t('terms.privacy.bodySuffix')}
          </p>

          <h3
            className={`text-[20px] font-bold mb-4 mt-8 transition-colors ${
              theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
            }`}
          >
            {t('terms.dataCollection.title')}
          </h3>
          <p
            className={`text-[14px] leading-relaxed mb-6 transition-colors ${
              theme === 'dark' ? 'text-[#c5b5a2]' : 'text-[#6b5d4d]'
            }`}
          >
            {t('terms.dataCollection.body')}
          </p>

          <h3
            className={`text-[20px] font-bold mb-4 mt-8 transition-colors ${
              theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
            }`}
          >
            {t('terms.userResponsibilities.title')}
          </h3>
          <p
            className={`text-[14px] leading-relaxed mb-6 transition-colors ${
              theme === 'dark' ? 'text-[#c5b5a2]' : 'text-[#6b5d4d]'
            }`}
          >
            {t('terms.userResponsibilities.body')}
          </p>
        </div>
      </div>

      {/* Acceptance */}
      <div
        className={`flex items-center justify-between backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 transition-colors ${
          theme === 'dark'
            ? 'bg-[#2d2820]/[0.4] border-white/10'
            : 'bg-white/[0.12] border-white/20'
        }`}
      >
        <div>
          <h3
            className={`text-[16px] font-bold mb-1 transition-colors ${
              theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
            }`}
          >
            {t('terms.acceptance.title')}
          </h3>
          <p
            className={`text-[13px] transition-colors ${
              theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
            }`}
          >
            {t('terms.acceptance.bodyPrefix')}{' '}
            <a href="/terms" className="underline hover:opacity-80">
              {t('terms.links.termsOfService')}
            </a>{' '}
            {t('terms.acceptance.bodyConnector')}{' '}
            <a href="/privacy" className="underline hover:opacity-80">
              {t('terms.links.privacyPolicy')}
            </a>
            {t('terms.acceptance.bodySuffix')}
          </p>

          {/* Acceptance status region: announced and gated behind a delay so
              fast loads don't flash a skeleton. */}
          <div role="status" aria-live="polite" aria-busy={isLoading} className="mt-2">
            {isLoading ? (
              showSkeleton ? (
                <div data-testid="terms-status-skeleton">
                  <span className="sr-only">{t('terms.status.loading')}</span>
                  <Skeleton className="h-4 w-64" />
                </div>
              ) : null
            ) : fetchError ? (
              <p className="text-[12px] text-red-500 font-medium">{fetchError}</p>
            ) : isCurrentAccepted ? (
              <p className="text-[12px] text-green-500 font-medium">
                {t('terms.status.acceptedVersion', {
                  version: acceptedVersion,
                  date: new Date(acceptedDate).toLocaleDateString(),
                })}
              </p>
            ) : isVersionMismatch ? (
              <p className="text-[12px] text-yellow-600 font-medium">
                {t('terms.status.outdated', { current: CURRENT_TERMS_VERSION })}
              </p>
            ) : null}
          </div>

          {error && <p className="text-[12px] text-red-500 mt-2 font-medium">{error}</p>}
        </div>
        <button
          onClick={handleAccept}
          disabled={isLoading || isAccepting || isCurrentAccepted}
          className={`px-8 py-3 rounded-[16px] font-semibold text-[15px] transition-all border border-white/10 ${
            isCurrentAccepted
              ? 'bg-green-600/20 text-green-500 cursor-not-allowed border-green-500/20 shadow-none'
              : isLoading
                ? 'bg-gray-500/50 text-gray-300 cursor-wait shadow-none'
                : 'bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white shadow-[0_6px_24px_rgba(162,121,44,0.4)] hover:shadow-[0_8px_28px_rgba(162,121,44,0.5)] disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {isCurrentAccepted
            ? 'Accepted'
            : isLoading
              ? t('terms.actions.loading')
              : isAccepting
                ? t('terms.actions.accepting')
                : t('terms.actions.accept')}
        </button>
      </div>
    </div>
  )
}
