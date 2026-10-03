import { Info } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';

/** GrainHack's first event. Its results were published from a computation
 *  with a $50 floor; what was actually paid was the pool split pro rata, on a
 *  testnet, through KeeperHub. The published figures stay as they are
 *  (payout contract, "Decisions"), so wherever they are shown this note says
 *  what was paid. Only this event: later events pay exactly the published
 *  pro-rata figure, so there is nothing to explain. */
export const EVENT_1_ID = 'e11e77b0-8d8d-40c5-a8dd-b525a491374b';

export const EVENT_1_PAID_TEXT =
  'Each of the two contributors received 4 USDC on the Base Sepolia testnet on 19 September 2026, splitting the pool pro rata. ' +
  'The figures published for this event are the results computation, which applied a $50 floor; they stay as published.';

export function isEvent1(hackathonId: string | null | undefined): boolean {
  return hackathonId === EVENT_1_ID;
}

export function Event1PaidNote({ className = '' }: { className?: string }) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return (
    <aside
      data-testid="event1-paid-note"
      aria-label="What was paid"
      className={`flex gap-3 rounded-[16px] border px-4 py-3.5 ${dark ? 'border-white/[0.12] bg-white/[0.04]' : 'border-white/40 bg-white/[0.25]'} ${className}`}
    >
      <Info className={`mt-0.5 h-4 w-4 shrink-0 ${dark ? 'text-[#e8c571]' : 'text-[#5c4214]'}`} aria-hidden />
      <div className="flex flex-col gap-1">
        <p className={`text-[13.5px] font-bold ${dark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>What was paid</p>
        <p className={`text-[13px] leading-[1.55] ${dark ? 'text-[#d4d4d4]' : 'text-[#4a4038]'}`}>{EVENT_1_PAID_TEXT}</p>
      </div>
    </aside>
  );
}
