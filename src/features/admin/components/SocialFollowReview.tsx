import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Modal, ModalFooter, ModalButton, ModalInput } from '../../../shared/components/ui/Modal';
import {
  getAdminSocialFollowSubmissions,
  approveSocialFollowSubmission,
  rejectSocialFollowSubmission,
  type SocialFollowSubmission,
} from '../../../shared/api/client';

export function SocialFollowReview() {
  const { theme } = useTheme();
  const [submissions, setSubmissions] = useState<SocialFollowSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [preview, setPreview] = useState<SocialFollowSubmission | null>(null);
  const [rejecting, setRejecting] = useState<SocialFollowSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const res = await getAdminSocialFollowSubmissions('pending');
      setSubmissions(res.submissions);
    } catch (error) {
      console.error('Failed to fetch social-follow submissions:', error);
      toast.error('Failed to load pending submissions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleApprove = async (submission: SocialFollowSubmission) => {
    setActioningId(submission.id);
    try {
      await approveSocialFollowSubmission(submission.id);
      toast.success(`Approved ${submission.platform} for ${submission.login ?? submission.user_id}.`);
      await fetchSubmissions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve submission.');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async () => {
    if (!rejecting) return;
    setActioningId(rejecting.id);
    try {
      await rejectSocialFollowSubmission(rejecting.id, rejectReason);
      toast.success('Submission rejected.');
      setRejecting(null);
      setRejectReason('');
      await fetchSubmissions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject submission.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 transition-colors ${
      theme === 'dark' ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/20'
    }`}>
      <div className="mb-6">
        <h2 className={`text-[24px] font-bold mb-2 transition-colors ${theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
          Social Follow Submissions
        </h2>
        <p className={`text-[14px] transition-colors ${theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>
          Review proof-of-follow screenshots. Once all three platforms are approved for a user, they earn the reward automatically.
        </p>
      </div>

      {isLoading ? (
        <div className={`text-center py-12 ${theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>Loading...</div>
      ) : submissions.length === 0 ? (
        <div className={`text-center py-12 ${theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>No pending submissions.</div>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-4 p-4 rounded-[16px] border ${
                theme === 'dark' ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.12] border-white/20'
              }`}
            >
              <button
                onClick={() => setPreview(s)}
                className={`w-14 h-14 rounded-[10px] overflow-hidden shrink-0 border flex items-center justify-center ${
                  theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/5'
                }`}
                title="View screenshot"
              >
                {s.screenshot ? (
                  <img src={s.screenshot} alt={`${s.platform} proof`} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-5 h-5 opacity-50" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-[14px] font-semibold capitalize ${theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
                  {s.platform}
                </p>
                <p className={`text-[12px] ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
                  {s.login ? `@${s.login}` : s.user_id}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleApprove(s)}
                  disabled={actioningId === s.id}
                  className={`p-2 rounded-[10px] transition-all ${theme === 'dark' ? 'hover:bg-green-500/20 text-green-400' : 'hover:bg-green-500/30 text-green-600'} disabled:opacity-50`}
                  title="Approve"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setRejecting(s)}
                  disabled={actioningId === s.id}
                  className={`p-2 rounded-[10px] transition-all ${theme === 'dark' ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-500/30 text-red-600'} disabled:opacity-50`}
                  title="Reject"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!preview} onClose={() => setPreview(null)} title={preview ? `${preview.platform} proof` : ''} width="lg">
        {preview && <img src={preview.screenshot} alt={`${preview.platform} proof`} className="w-full rounded-[12px]" />}
      </Modal>

      <Modal isOpen={!!rejecting} onClose={() => { setRejecting(null); setRejectReason(''); }} title="Reject Submission" icon={<XCircle className="w-6 h-6 text-[#c9983a]" />} width="md">
        <div className="space-y-4">
          <ModalInput label="Reason (optional)" value={rejectReason} onChange={setRejectReason} placeholder="e.g. screenshot doesn't show the follow" rows={3} />
          <ModalFooter>
            <ModalButton onClick={() => { setRejecting(null); setRejectReason(''); }}>Cancel</ModalButton>
            <ModalButton variant="primary" onClick={handleReject} disabled={!!actioningId}>
              {actioningId ? 'Rejecting...' : 'Reject'}
            </ModalButton>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
