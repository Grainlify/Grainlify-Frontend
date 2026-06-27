import { useState, useEffect } from 'react';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import { getTermsStatus, acceptTerms } from '../../../../shared/api/client';

/**
 * Current version of the terms and conditions.
 * Used to track which version the user has accepted.
 */
export const CURRENT_TERMS_VERSION = '1.0.0';

/**
 * Delay before showing the loading skeleton so fast status checks do not flash.
 */
export const TERMS_STATUS_SKELETON_DELAY_MS = 200;

function TermsStatusSkeleton({ theme }: { theme: string }) {
  const shimmer = theme === 'dark' ? 'bg-white/10' : 'bg-black/10';
  const textColor = theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]';

  return (
    <div role="status" aria-live="polite" className="w-full">
      <p className={`text-[13px] font-medium mb-4 ${textColor}`}>
        Checking terms status...
      </p>
      <div className="flex items-center justify-between gap-6">
        <div className="flex-1 space-y-3" aria-hidden="true">
          <div className={`h-4 w-40 rounded-full animate-pulse ${shimmer}`} />
          <div className={`h-3 w-full max-w-[520px] rounded-full animate-pulse ${shimmer}`} />
          <div className={`h-3 w-72 rounded-full animate-pulse ${shimmer}`} />
        </div>
        <div
          aria-hidden="true"
          className={`h-12 w-28 rounded-[16px] animate-pulse flex-shrink-0 ${shimmer}`}
        />
      </div>
    </div>
  );
}

/**
 * TermsTab component
 * Displays terms of service, privacy policy, and handles user consent.
 */
export function TermsTab() {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [showStatusSkeleton, setShowStatusSkeleton] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [acceptedVersion, setAcceptedVersion] = useState<string | null>(null);
  const [acceptedDate, setAcceptedDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const skeletonTimer = window.setTimeout(() => {
      if (mounted) {
        setShowStatusSkeleton(true);
      }
    }, TERMS_STATUS_SKELETON_DELAY_MS);

    const fetchStatus = async () => {
      try {
        const status = await getTermsStatus();
        if (mounted) {
          setIsAccepted(status.accepted);
          setAcceptedVersion(status.version);
          setAcceptedDate(status.accepted_at);
          setStatusError(null);
        }
      } catch {
        if (mounted) {
          setStatusError('Unable to load your terms status. You can still review the terms and try accepting again.');
        }
      } finally {
        if (mounted) {
          window.clearTimeout(skeletonTimer);
          setShowStatusSkeleton(false);
          setIsLoading(false);
        }
      }
    };
    fetchStatus();
    return () => {
      mounted = false;
      window.clearTimeout(skeletonTimer);
    };
  }, []);

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);
    try {
      const res = await acceptTerms(CURRENT_TERMS_VERSION);
      setIsAccepted(true);
      setAcceptedVersion(res.version);
      setAcceptedDate(res.accepted_at);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to accept terms. Please try again.';
      setError(message);
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 transition-colors ${
        theme === 'dark'
          ? 'bg-[#2d2820]/[0.4] border-white/10'
          : 'bg-white/[0.12] border-white/20'
      }`}>
        <h2 className={`text-[28px] font-bold mb-2 transition-colors ${
          theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
        }`}>Terms and Conditions</h2>
        <p className={`text-[14px] transition-colors ${
          theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
        }`}>Review our terms of service and privacy policy.</p>
      </div>

      {/* Terms Content */}
      <div className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 transition-colors ${
        theme === 'dark'
          ? 'bg-[#2d2820]/[0.4] border-white/10'
          : 'bg-white/[0.12] border-white/20'
      }`}>
        <div className="prose prose-sm max-w-none">
          <h3 className={`text-[20px] font-bold mb-4 transition-colors ${
            theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
          }`}>Terms of Service</h3>
          <p className={`text-[14px] leading-relaxed mb-6 transition-colors ${
            theme === 'dark' ? 'text-[#c5b5a2]' : 'text-[#6b5d4d]'
          }`}>
            By using Grainlify, you agree to abide by our <a href="/terms" className="underline hover:opacity-80">terms of service</a>. These terms govern your use of the platform and outline your rights and responsibilities as a user.
          </p>

          <h3 className={`text-[20px] font-bold mb-4 mt-8 transition-colors ${
            theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
          }`}>Privacy Policy</h3>
          <p className={`text-[14px] leading-relaxed mb-6 transition-colors ${
            theme === 'dark' ? 'text-[#c5b5a2]' : 'text-[#6b5d4d]'
          }`}>
            We take your privacy seriously. Our <a href="/privacy" className="underline hover:opacity-80">privacy policy</a> explains how we collect, use, and protect your personal information.
          </p>

          <h3 className={`text-[20px] font-bold mb-4 mt-8 transition-colors ${
            theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
          }`}>Data Collection</h3>
          <p className={`text-[14px] leading-relaxed mb-6 transition-colors ${
            theme === 'dark' ? 'text-[#c5b5a2]' : 'text-[#6b5d4d]'
          }`}>
            We collect information necessary to provide our services, including your GitHub profile data, contribution history, and reward preferences.
          </p>

          <h3 className={`text-[20px] font-bold mb-4 mt-8 transition-colors ${
            theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
          }`}>User Responsibilities</h3>
          <p className={`text-[14px] leading-relaxed mb-6 transition-colors ${
            theme === 'dark' ? 'text-[#c5b5a2]' : 'text-[#6b5d4d]'
          }`}>
            Users are responsible for maintaining the security of their accounts, providing accurate information, and complying with all applicable laws and regulations.
          </p>
        </div>
      </div>

      {/* Acceptance */}
      <div
        aria-busy={isLoading}
        aria-live="polite"
        className={`flex items-center justify-between backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 transition-colors ${
        theme === 'dark'
          ? 'bg-[#2d2820]/[0.4] border-white/10'
          : 'bg-white/[0.12] border-white/20'
      }`}
      >
        {isLoading && showStatusSkeleton ? (
          <TermsStatusSkeleton theme={theme} />
        ) : (
          <>
            <div>
              <h3 className={`text-[16px] font-bold mb-1 transition-colors ${
                theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
              }`}>Accept Terms</h3>
              <p className={`text-[13px] transition-colors ${
                theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
              }`}>
                By clicking accept, you agree to our <a href="/terms" className="underline hover:opacity-80">terms of service</a> and <a href="/privacy" className="underline hover:opacity-80">privacy policy</a>.
              </p>
              {statusError && (
                <p role="alert" className="text-[12px] text-red-500 mt-2 font-medium">
                  {statusError}
                </p>
              )}
              {isAccepted && acceptedVersion && acceptedDate && (
                <p className="text-[12px] text-green-500 mt-2 font-medium">
                  ✓ Accepted version {acceptedVersion} on {new Date(acceptedDate).toLocaleDateString()}
                </p>
              )}
              {error && (
                <p className="text-[12px] text-red-500 mt-2 font-medium">
                  {error}
                </p>
              )}
            </div>
            <button
              onClick={handleAccept}
              disabled={isLoading || isAccepting || isAccepted}
              className={`px-8 py-3 rounded-[16px] font-semibold text-[15px] transition-all border border-white/10 ${
                isAccepted
                  ? 'bg-green-600/20 text-green-500 cursor-not-allowed border-green-500/20 shadow-none'
                  : isLoading
                  ? 'bg-gray-500/50 text-gray-300 cursor-wait shadow-none'
                  : 'bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white shadow-[0_6px_24px_rgba(162,121,44,0.4)] hover:shadow-[0_8px_28px_rgba(162,121,44,0.5)] disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Checking...' : isAccepting ? 'Accepting...' : isAccepted ? 'Accepted' : 'Accept'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
