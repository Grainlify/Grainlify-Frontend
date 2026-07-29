import { useTranslation } from '../../i18n'
import { useTheme } from '../../contexts/ThemeContext'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * Shared layout wrapper for static legal pages (Terms of Service / Privacy Policy).
 * Uses the same gradient background and glass-card pattern as NotFoundPage.
 */
function LegalPageShell({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const { theme } = useTheme()

  return (
    <div
      className={`min-h-screen flex items-start justify-center px-6 py-16 transition-colors ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-[#1a1512] via-[#231c17] to-[#2d241d]'
          : 'bg-gradient-to-br from-[#e8dfd0] via-[#d4c5b0] to-[#c9b89a]'
      }`}
    >
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#c9983a]/20 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#d4af37]/10 blur-3xl animate-pulse" />

      {/* Back Button */}
      <Link
        to="/signup"
        className={`absolute top-6 left-6 flex items-center space-x-2 hover:text-[#c9983a] transition-colors font-medium ${
          theme === 'dark' ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]'
        }`}
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Sign Up</span>
      </Link>

      {/* Content Card */}
      <div className="relative z-10 w-full max-w-3xl mt-8">
        <div
          className={`backdrop-blur-[40px] border rounded-[28px] p-8 md:p-12 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-colors ${
            theme === 'dark'
              ? 'bg-white/[0.08] border-white/15'
              : 'bg-white/[0.15] border-white/25'
          }`}
        >
          <h1
            className={`text-3xl font-bold mb-6 transition-colors ${
              theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
            }`}
          >
            {title}
          </h1>
          <div
            className={`prose prose-sm max-w-none transition-colors ${
              theme === 'dark' ? 'prose-invert' : ''
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export function TermsPage() {
  const { t } = useTranslation()

  return (
    <LegalPageShell title={t('terms.service.title')}>
      <h2 className="text-xl font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
      <p className="leading-relaxed mb-4">
        By accessing or using Grainlify ("the Platform"), you agree to be bound by these
        Terms of Service. If you do not agree to all the terms, you may not access or use
        the Platform.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">2. Description of Service</h2>
      <p className="leading-relaxed mb-4">
        Grainlify is an open-source contribution platform that connects contributors with
        projects. The Platform provides tools for discovering, tracking, and managing
        open-source contributions.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">3. User Accounts</h2>
      <p className="leading-relaxed mb-4">
        You are responsible for maintaining the confidentiality of your account and for
        all activities that occur under your account. You agree to notify us immediately
        of any unauthorized use of your account.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">4. Acceptable Use</h2>
      <p className="leading-relaxed mb-4">
        You agree not to use the Platform for any unlawful purpose or in violation of
        any applicable laws or regulations. You may not attempt to gain unauthorized
        access to any part of the Platform.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">5. Intellectual Property</h2>
      <p className="leading-relaxed mb-4">
        The Platform and its original content, features, and functionality are owned by
        Grainlify and are protected by international copyright, trademark, and other
        intellectual property laws.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">6. Limitation of Liability</h2>
      <p className="leading-relaxed mb-4">
        In no event shall Grainlify be liable for any indirect, incidental, special,
        consequential, or punitive damages arising out of or related to your use of the
        Platform.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">7. Changes to Terms</h2>
      <p className="leading-relaxed mb-4">
        We reserve the right to modify these terms at any time. We will notify users of
        material changes via the Platform or email. Continued use after changes
        constitutes acceptance of the new terms.
      </p>

      <p className="text-sm mt-8 opacity-70">
        Last updated: July 2026
      </p>
    </LegalPageShell>
  )
}

export function PrivacyPage() {
  const { t } = useTranslation()

  return (
    <LegalPageShell title={t('terms.privacy.title')}>
      <h2 className="text-xl font-semibold mt-6 mb-3">1. Information We Collect</h2>
      <p className="leading-relaxed mb-4">
        We collect information you provide when creating an account, including your
        GitHub username, public profile information, and email address. We also collect
        data about your interactions with the Platform.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">2. How We Use Your Information</h2>
      <p className="leading-relaxed mb-4">
        We use the information we collect to provide, maintain, and improve the Platform,
        to process your contributions, and to communicate with you about your account and
        Platform updates.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">3. Data Sharing</h2>
      <p className="leading-relaxed mb-4">
        We do not sell your personal information. We may share anonymized, aggregated
        data for analytical purposes. We may disclose information if required by law or
        to protect our rights.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">4. Data Security</h2>
      <p className="leading-relaxed mb-4">
        We implement appropriate security measures to protect your information. However,
        no method of transmission over the Internet is 100% secure, and we cannot
        guarantee absolute security.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">5. Your Rights</h2>
      <p className="leading-relaxed mb-4">
        You have the right to access, update, or delete your personal information. You
        can manage your account settings or contact us to exercise these rights.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">6. Third-Party Services</h2>
      <p className="leading-relaxed mb-4">
        The Platform integrates with GitHub for authentication. Your use of GitHub is
        governed by GitHub's own terms and privacy policy.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">7. Changes to This Policy</h2>
      <p className="leading-relaxed mb-4">
        We may update this Privacy Policy from time to time. We will notify you of
        changes by posting the new policy on this page.
      </p>

      <p className="text-sm mt-8 opacity-70">
        Last updated: July 2026
      </p>
    </LegalPageShell>
  )
}