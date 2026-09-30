import { FlaskConical, CircleCheck } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import type { BountyAgentStatus } from '../../../shared/api/bountyAgent';

/** The programme's current status, in the agent's own words.
 *
 * The line comes from the agent's running configuration, not from copy in
 * this repo, so it changes when mainnet is switched on and cannot say more
 * than is true. The gold banner is KeeperHubPayoutPanel's; unknown status
 * (agent unreachable) says so rather than guessing. */
export function StatusNotice({
  status,
  paidOnMainnet = false,
  loading = false,
}: {
  status: BountyAgentStatus | null;
  paidOnMainnet?: boolean;
  /** True until the first answer arrives. Without it, null means both "not
   *  asked yet" and "asked and failed", and the panel announced the agent was
   *  unreachable on every first paint - a wrong answer shown before the real
   *  one was known, then corrected a moment later. */
  loading?: boolean;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const live = status?.mainnetLive === true;
  // paidOnMainnet is whether a mainnet payout has actually settled, which is a
  // different claim from "mainnet is switched on": the programme can be live
  // and still owe its first payout. The page derives it from the bounties it
  // already holds and passes it in; blurring the two is how a page ends up
  // claiming something that has not happened.
  const Icon = live && paidOnMainnet ? CircleCheck : FlaskConical;

  if (loading) {
    // The loaded notice's own markup, with words of the same length as its
    // usual ones held invisible under the pulse - neutral words, because a
    // claim about payouts must not be in the page before the status is known. Two thin bars were about 36px where the notice wraps
    // to 84px on a phone, so everything below it jumped 48px when the status
    // arrived - most of the page's layout shift. Real text sizes itself at
    // every width, which no fixed skeleton height does.
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Checking the bounty programme status"
        className={`relative flex items-start gap-3 rounded-[16px] border p-4 sm:p-5 ${isDark ? 'border-[#c9983a]/35 bg-[#c9983a]/[0.08]' : 'border-[#c9983a]/40 bg-[#c9983a]/10'}`}
      >
        <div className={`animate-pulse w-5 h-5 rounded shrink-0 mt-0.5 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
        <div className="relative" aria-hidden="true">
          <p className="text-[15px] font-bold invisible">Checking the state of the bounty programme.</p>
          <p className="text-[13px] leading-[1.5] invisible">Reading the bounty agent's current status, which says whether payouts have settled yet.</p>
          <div className="absolute inset-0 animate-pulse flex flex-col gap-2 pt-1">
            <div className={`h-4 w-64 max-w-full rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
            <div className={`h-3 w-full rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
            <div className={`h-3 w-2/3 rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-[16px] border p-4 sm:p-5 ${
        isDark ? 'border-[#c9983a]/35 bg-[#c9983a]/[0.08]' : 'border-[#c9983a]/40 bg-[#c9983a]/10'
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${isDark ? 'text-[#e8c571]' : 'text-[#5c4214]'}`} />
      <div>
        <p className={`text-[15px] font-bold ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
          {status ? 'Bounties pay real USDC and $ANSEM on Solana' : 'Status unavailable'}
        </p>
        <p className={`text-[13px] leading-[1.5] ${isDark ? 'text-[#d4d4d4]' : 'text-[#2d2820]'}`}>
          {!status
            ? 'The bounty agent could not be reached, so the current status is unknown.'
            : paidOnMainnet
              ? status.statusLine
              : 'No mainnet payout has happened yet. This line changes the moment the first one settles.'}
        </p>
      </div>
    </div>
  );
}
