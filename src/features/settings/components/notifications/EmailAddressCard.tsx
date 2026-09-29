import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ToggleSwitch } from '../shared/ToggleSwitch';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import {
  getStoredEmail,
  updateStoredEmail,
  removeStoredEmail,
  type StoredEmail,
} from '../../../../shared/api/client';

/** "2026-09-29T16:01:00Z" -> "29 September 2026", or "" when absent. */
function readableDate(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * What we hold, why, and how to be rid of it - on the same screen as the
 * switches it governs.
 *
 * Somebody who wants to know whether Grainlify has their email address should
 * not have to read a privacy page to find out. The address is shown, not
 * described.
 */
export function EmailAddressCard() {
  const { theme } = useTheme();
  const [state, setState] = useState<StoredEmail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getStoredEmail()
      .then((data) => {
        if (!cancelled) setState(data);
      })
      .catch(() => {
        // Not fatal: the switches below still work. Saying nothing would be
        // worse than saying we could not read it.
        if (!cancelled) toast.error('Could not load your email settings.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const run = async (fn: () => Promise<StoredEmail>, failure: string) => {
    setIsBusy(true);
    try {
      setState(await fn());
    } catch {
      toast.error(failure);
    } finally {
      setIsBusy(false);
    }
  };

  const heading = theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]';
  const muted = theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]';

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-[#d4a853]" aria-label="Loading email settings" />
      </div>
    );
  }
  if (!state) return null;

  return (
    <div
      data-testid="email-address-card"
      className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 max-sm:p-4 transition-colors ${
        theme === 'dark' ? 'bg-[#2d2820]/[0.4] border-white/10' : 'bg-white/[0.12] border-white/20'
      }`}
    >
      <h3 className={`text-[20px] font-bold mb-2 transition-colors ${heading}`}>Email address</h3>

      {state.address ? (
        <>
          <p className={`text-[13px] mb-6 transition-colors ${muted}`}>
            We hold this address so we can send you the notifications you have turned on below. It
            came from your GitHub account
            {readableDate(state.captured_at) ? ` on ${readableDate(state.captured_at)}` : ''}, and it
            is used for nothing else — never shown to maintainers, never shared, never used to
            market anything to you.
          </p>
          <div className="flex items-center justify-between gap-4 py-4 border-t border-white/10 max-sm:flex-col max-sm:items-start">
            <div className={`text-[15px] font-semibold break-all transition-colors ${heading}`}>
              {state.address}
            </div>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setConfirmingRemoval(true)}
              className={`text-[13px] font-semibold underline underline-offset-4 disabled:opacity-50 transition-colors ${muted} hover:${heading}`}
            >
              Remove this address
            </button>
          </div>
        </>
      ) : (
        <p className={`text-[13px] mb-4 transition-colors ${muted}`}>
          {state.declined
            ? 'You removed your email address, so we hold none. Signing in again will not bring it back. Notifications still reach you in the app.'
            : 'We hold no email address for you yet. The next time you sign in with GitHub we will store the primary address on your GitHub account, so we can send the emails you have turned on below.'}
        </p>
      )}

      {state.declined && (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => run(() => updateStoredEmail({ allow: true }), 'Could not change that.')}
          className="text-[13px] font-semibold text-[#d4a853] underline underline-offset-4 disabled:opacity-50"
        >
          Let Grainlify store it again at my next sign-in
        </button>
      )}

      {/* min-w-0 on the text and shrink-0 on the switch: without them the text
          column cannot shrink at 390px and pushes the switch out past the edge
          of the card, where half of it is clipped. */}
      <div className="flex items-center justify-between gap-4 pt-5 border-t border-white/10">
        <div className="min-w-0">
          <div className={`text-[15px] font-semibold mb-1 transition-colors ${heading}`}>
            Email notifications
          </div>
          <div className={`text-[13px] transition-colors ${muted}`}>
            Turn this off and we send you no email at all, whatever is switched on below.
            Notifications keep arriving in the app.
          </div>
        </div>
        <div className="shrink-0">
          <ToggleSwitch
            enabled={state.enabled}
            onChange={(value) =>
              run(() => updateStoredEmail({ enabled: value }), 'Could not save that.')
            }
          />
        </div>
      </div>

      {confirmingRemoval && (
        <div className="mt-5 pt-5 border-t border-white/10">
          <p className={`text-[13px] mb-4 transition-colors ${heading}`}>
            Remove {state.address}? We will delete it, and signing in again will not store it
            again unless you ask us to. You will stop receiving email from Grainlify; notifications
            keep arriving in the app.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={isBusy}
              onClick={async () => {
                await run(() => removeStoredEmail(), 'Could not remove the address.');
                setConfirmingRemoval(false);
              }}
              className="px-4 py-2 rounded-full text-[13px] font-semibold bg-[#d4a853] text-[#2d2820] disabled:opacity-50"
            >
              Remove it
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setConfirmingRemoval(false)}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold border border-white/20 disabled:opacity-50 transition-colors ${heading}`}
            >
              Keep it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
