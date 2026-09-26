import { FlaskConical, CircleCheck } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import type { BountyAgentStatus } from '../../../shared/api/bountyAgent';

/** The programme's current status, in the agent's own words.
 *
 * The line comes from the agent's running configuration, not from copy in
 * this repo, so it changes when mainnet is switched on and cannot say more
 * than is true. The gold banner is KeeperHubPayoutPanel's; unknown status
 * (agent unreachable) says so rather than guessing. */
export function StatusNotice({ status, paidOnMainnet = false }: { status: BountyAgentStatus | null; paidOnMainnet?: boolean }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const live = status?.mainnetLive === true;
  // paidOnMainnet is whether a mainnet payout has actually settled, which is a
  // different claim from "mainnet is switched on": the programme can be live
  // and still owe its first payout. The page derives it from the bounties it
  // already holds and passes it in; blurring the two is how a page ends up
  // claiming something that has not happened.
  const Icon = live && paidOnMainnet ? CircleCheck : FlaskConical;

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
