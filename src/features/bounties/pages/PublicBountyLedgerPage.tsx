import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { BountyLedger } from '../components/BountyLedger';

/** /bounties/ledger, outside ProtectedRoute: the same ledger the dashboard
 * shows, for anyone - a contributor checking a payout, a judge, a sponsor.
 * A thin shell, as /support is (SupportRoutePage): same component, only the
 * chrome differs because there is no dashboard around it. */
export function PublicBountyLedgerPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  return (
    <div
      className={`min-h-screen px-4 sm:px-6 py-10 transition-colors ${
        dark ? 'bg-gradient-to-br from-[#1a1512] via-[#231c17] to-[#2d241d]' : 'bg-gradient-to-br from-[#c4b5a0] via-[#b8a590] to-[#a89780]'
      }`}
    >
      <div className="max-w-[1400px] mx-auto">
        <Link
          to="/"
          className={`inline-flex items-center gap-2 mb-6 text-[14px] font-medium transition-colors ${
            dark ? 'text-[#b8a898] hover:text-[#f5efe5]' : 'text-[#4a4038] hover:text-[#2d2820]'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Grainlify
        </Link>
        <BountyLedger />
      </div>
    </div>
  );
}
