import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Modal, ModalFooter, ModalButton, ModalInput } from '../../../shared/components/ui/Modal';
import {
  getAdminRedemptions,
  markRedemptionPaid,
  rejectRedemption,
  type AdminRedemption,
} from '../../../shared/api/client';

export function RedemptionsReview() {
  const { theme } = useTheme();
  const [redemptions, setRedemptions] = useState<AdminRedemption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AdminRedemption | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchRedemptions = async () => {
    setIsLoading(true);
    try {
      const res = await getAdminRedemptions('pending');
      setRedemptions(res.redemptions);
    } catch (error) {
      console.error('Failed to fetch redemptions:', error);
      toast.error('Failed to load pending redemptions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRedemptions();
  }, []);

  const handleMarkPaid = async (redemption: AdminRedemption) => {
    setActioningId(redemption.id);
    try {
      await markRedemptionPaid(redemption.id);
      toast.success('Marked as paid.');
      await fetchRedemptions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark as paid.');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async () => {
    if (!rejecting) return;
    setActioningId(rejecting.id);
    try {
      await rejectRedemption(rejecting.id, rejectReason);
      toast.success('Redemption rejected and points refunded.');
      setRejecting(null);
      setRejectReason('');
      await fetchRedemptions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject redemption.');
    } finally {
      setActioningId(null);
    }
  };

  const copyWallet = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success('Wallet address copied.');
  };

  return (
    <div className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 transition-colors ${
      theme === 'dark' ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/20'
    }`}>
      <div className="mb-6">
        <h2 className={`text-[24px] font-bold mb-2 transition-colors ${theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
          Points Redemptions
        </h2>
        <p className={`text-[14px] transition-colors ${theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>
          Send USDC to the wallet address manually, then mark as paid. Rejecting refunds the points automatically.
        </p>
      </div>

      {isLoading ? (
        <div className={`text-center py-12 ${theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>Loading...</div>
      ) : redemptions.length === 0 ? (
        <div className={`text-center py-12 ${theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>No pending redemptions.</div>
      ) : (
        <div className="space-y-3">
          {redemptions.map((r) => (
            <div
              key={r.id}
              className={`flex items-center gap-4 p-4 rounded-[16px] border ${
                theme === 'dark' ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.12] border-white/20'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-[14px] font-semibold ${theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
                  {r.login ? `@${r.login}` : r.user_id} - {r.points_spent.toLocaleString()} points → ${r.usdc_amount} USDC
                </p>
                <button
                  onClick={() => copyWallet(r.stellar_wallet_address)}
                  className={`mt-1 inline-flex items-center gap-1.5 text-[12px] font-mono truncate max-w-full ${
                    theme === 'dark' ? 'text-[#b8a898] hover:text-[#f5f5f5]' : 'text-[#7a6b5a] hover:text-[#2d2820]'
                  }`}
                  title="Copy wallet address"
                >
                  <Copy className="w-3 h-3 shrink-0" /> {r.stellar_wallet_address}
                </button>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleMarkPaid(r)}
                  disabled={actioningId === r.id}
                  className={`p-2 rounded-[10px] transition-all ${theme === 'dark' ? 'hover:bg-green-500/20 text-green-400' : 'hover:bg-green-500/30 text-green-600'} disabled:opacity-50`}
                  title="Mark as paid"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setRejecting(r)}
                  disabled={actioningId === r.id}
                  className={`p-2 rounded-[10px] transition-all ${theme === 'dark' ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-500/30 text-red-600'} disabled:opacity-50`}
                  title="Reject and refund"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!rejecting} onClose={() => { setRejecting(null); setRejectReason(''); }} title="Reject Redemption" icon={<XCircle className="w-6 h-6 text-[#c9983a]" />} width="md">
        <div className="space-y-4">
          <p className={`text-[13px] ${theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>
            The {rejecting?.points_spent.toLocaleString()} points will be refunded to the user's balance.
          </p>
          <ModalInput label="Reason (optional)" value={rejectReason} onChange={setRejectReason} placeholder="e.g. wallet address looks wrong" rows={3} />
          <ModalFooter>
            <ModalButton onClick={() => { setRejecting(null); setRejectReason(''); }}>Cancel</ModalButton>
            <ModalButton variant="primary" onClick={handleReject} disabled={!!actioningId}>
              {actioningId ? 'Rejecting...' : 'Reject & Refund'}
            </ModalButton>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
