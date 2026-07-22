import { CircleDotDashed, ExternalLink, Inbox } from 'lucide-react'

import { useTranslation } from '../../../../shared/i18n'

interface EmptyIssueStateProps {
  issueCount: number
  ctaHref?: string
  onCtaClick?: () => void
}

export function EmptyIssueState({ issueCount, ctaHref, onCtaClick }: EmptyIssueStateProps) {
  const { t } = useTranslation()
  const displayCount = Number.isFinite(issueCount) ? issueCount : 0
  const issueCountLabel = t('maintainers.issues.empty.count', { count: displayCount })

  return (
    <>
      {/* Background decorative circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-[#c9983a]/5 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tl from-[#d4af37]/5 to-transparent rounded-full blur-3xl" />

      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="text-center relative max-w-lg">
          <div className="relative mx-auto mb-8 w-36 h-36 group/icon" aria-hidden="true">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#c9983a]/20 to-[#d4af37]/10 blur-xl animate-pulse" />
            <div className="absolute inset-4 rounded-[32px] border border-[#c9983a]/20 rotate-6" />
            <div className="absolute inset-6 rounded-[28px] border border-[#d4af37]/20 -rotate-6" />

            <div className="relative w-full h-full rounded-[36px] bg-gradient-to-br from-[#c9983a]/15 to-[#d4af37]/10 border-2 border-[#c9983a]/30 flex items-center justify-center backdrop-blur-[20px] group-hover/icon:scale-105 group-hover/icon:border-[#c9983a]/50 transition-all duration-500">
              <Inbox
                className="w-16 h-16 text-[#c9983a]/70 group-hover/icon:text-[#c9983a]/90 transition-colors duration-300"
                strokeWidth={1.5}
              />
              <CircleDotDashed
                className="absolute right-8 top-8 w-6 h-6 text-[#d4af37]/70"
                strokeWidth={1.5}
              />
            </div>

            <div
              className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-gradient-to-br from-[#c9983a] to-[#d4af37] opacity-60 animate-pulse"
              style={{ animationDelay: '0.2s' }}
            />
            <div
              className="absolute -bottom-2 -left-2 w-3 h-3 rounded-full bg-gradient-to-br from-[#d4af37] to-[#c9983a] opacity-60 animate-pulse"
              style={{ animationDelay: '0.4s' }}
            />
          </div>

          <h3 className="text-[24px] font-bold text-[#4a3f2f] mb-3 tracking-tight">
            {t('maintainers.issues.empty.title')}
          </h3>
          <p className="text-[16px] font-medium text-[#7a6b5a]/80 max-w-md mx-auto leading-relaxed mb-6">
            {t('maintainers.issues.empty.description')}
          </p>

          {ctaHref ? (
            <a
              href={ctaHref}
              target="_blank"
              rel="noreferrer"
              onClick={onCtaClick}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[14px] bg-gradient-to-br from-[#c9983a] to-[#d4af37] text-white text-[14px] font-bold shadow-[0_8px_24px_rgba(201,152,58,0.35)] hover:shadow-[0_10px_28px_rgba(201,152,58,0.45)] hover:-translate-y-0.5 transition-all"
            >
              {t('maintainers.issues.empty.cta')}
              <ExternalLink className="w-4 h-4" strokeWidth={2} />
            </a>
          ) : null}

          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border border-white/30">
            <div className="w-2 h-2 rounded-full bg-[#c9983a] animate-pulse" />
            <span className="text-[13px] font-semibold text-[#7a6b5a]">{issueCountLabel}</span>
          </div>
        </div>
      </div>
    </>
  )
}
