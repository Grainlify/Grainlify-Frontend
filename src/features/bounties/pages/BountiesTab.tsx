import { ArrowLeft } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { BountyLedger } from '../components/BountyLedger';
import { BountiesProgramPage } from './BountiesProgramPage';

/** ?tab=bounties in the dashboard: the programme page, or its ledger under
 * ?subtab=ledger. The subtab is read here, as Settings reads its own, so the
 * Dashboard's URL sync needs nothing new. */
export function BountiesTab() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [params, setParams] = useSearchParams();

  if (params.get('subtab') !== 'ledger') {
    return <BountiesProgramPage ledgerHref="/dashboard?tab=bounties&subtab=ledger" />;
  }
  return (
    <div className="space-y-6">
      <button
        onClick={() => {
          const next = new URLSearchParams(params);
          next.delete('subtab');
          setParams(next);
        }}
        className={`flex items-center gap-2 px-4 py-2 rounded-[12px] border transition-all ${
          isDark ? 'bg-white/[0.08] border-white/10 text-[#f5f5f5] hover:bg-white/[0.12]' : 'bg-white/[0.15] border-white/25 text-[#2d2820] hover:bg-white/[0.2]'
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-[13px] font-medium">All bounties</span>
      </button>
      <BountyLedger />
    </div>
  );
}
