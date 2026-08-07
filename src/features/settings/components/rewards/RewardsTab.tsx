import { useEffect, useRef, useState } from 'react';
import { siGithub, siTelegram } from 'simple-icons';
import { Linkedin, Loader2, Gift, Coins, CheckCircle2, Clock, XCircle, Upload, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import {
  getPointsBalance,
  getSocialFollowStatus,
  submitSocialFollowProof,
  getMyRedemptions,
  createRedemption,
  SOCIAL_FOLLOW_PLATFORMS,
  type PointsBalance,
  type SocialFollowStatus,
  type SocialFollowPlatform,
  type Redemption,
} from '../../../../shared/api/client';

function SimpleIconGlyph({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d={path} />
    </svg>
  );
}

const PLATFORM_INFO: Record<SocialFollowPlatform, { label: string; icon: React.ReactNode; followUrl?: string }> = {
  github: { label: 'GitHub', icon: <SimpleIconGlyph path={siGithub.path} className="w-5 h-5" />, followUrl: 'https://github.com/Grainlify' },
  telegram: { label: 'Telegram', icon: <SimpleIconGlyph path={siTelegram.path} className="w-5 h-5" /> },
  linkedin: { label: 'LinkedIn', icon: <Linkedin className="w-5 h-5" /> },
};

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const VALID_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

function Card({ children, theme }: { children: React.ReactNode; theme: string }) {
  return (
    <div
      className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 transition-colors ${
        theme === 'dark' ? 'bg-[#2d2820]/[0.4] border-white/10' : 'bg-white/[0.12] border-white/20'
      }`}
    >
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full bg-green-500/15 text-green-500">
        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-500">
        <Clock className="w-3.5 h-3.5" /> Pending review
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full bg-red-500/15 text-red-500">
        <XCircle className="w-3.5 h-3.5" /> Rejected
      </span>
    );
  }
  return null;
}

function PlatformRow({
  platform,
  status,
  rejectionReason,
  onUpload,
  isUploading,
  theme,
}: {
  platform: SocialFollowPlatform;
  status: string | null;
  rejectionReason?: string;
  onUpload: (file: File) => void;
  isUploading: boolean;
  theme: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const info = PLATFORM_INFO[platform];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      toast.error('Please select a PNG, JPG, GIF, or WEBP image.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      toast.error('Screenshot must be under 5MB.');
      e.target.value = '';
      return;
    }
    onUpload(file);
    e.target.value = '';
  };

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-[16px] border transition-colors ${
        theme === 'dark' ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.15] border-white/25'
      }`}
    >
      <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${theme === 'dark' ? 'bg-white/10 text-[#f5efe5]' : 'bg-black/5 text-[#2d2820]'}`}>
        {info.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[15px] font-semibold transition-colors ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'}`}>
            {info.label}
          </span>
          {info.followUrl && (
            <a
              href={info.followUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-[12px] inline-flex items-center gap-1 ${theme === 'dark' ? 'text-[#c9983a] hover:text-[#e8c77f]' : 'text-[#a67c2e] hover:text-[#c9983a]'}`}
            >
              Follow <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <div className="mt-1.5">
          <StatusBadge status={status} />
          {status === 'rejected' && rejectionReason && (
            <p className={`text-[12px] mt-1 ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>{rejectionReason}</p>
          )}
        </div>
      </div>
      {status !== 'approved' && (
        <label
          className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-[10px] border border-dashed text-[13px] font-medium cursor-pointer transition-colors ${
            theme === 'dark' ? 'border-[#c9983a]/50 bg-white/[0.06] hover:bg-white/[0.1] text-[#d4c5b0]' : 'border-[#c9983a]/50 bg-white/40 hover:bg-white/60 text-[#7a6b5a]'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {status === 'rejected' ? 'Re-upload proof' : 'Upload proof'}
          <input ref={inputRef} type="file" accept={VALID_IMAGE_TYPES.join(',')} className="hidden" onChange={handleFileChange} />
        </label>
      )}
    </div>
  );
}

export function RewardsTab() {
  const { theme } = useTheme();
  const [balance, setBalance] = useState<PointsBalance | null>(null);
  const [socialFollow, setSocialFollow] = useState<SocialFollowStatus | null>(null);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingPlatform, setUploadingPlatform] = useState<string | null>(null);
  const [redeemPoints, setRedeemPoints] = useState('');
  const [redeemWallet, setRedeemWallet] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  const loadAll = () => {
    return Promise.all([getPointsBalance(), getSocialFollowStatus(), getMyRedemptions()]).then(
      ([b, s, r]) => {
        setBalance(b);
        setSocialFollow(s);
        setRedemptions(r.redemptions);
      }
    );
  };

  useEffect(() => {
    let cancelled = false;
    loadAll()
      .catch((error) => {
        console.error('Failed to load rewards data:', error);
        if (!cancelled) toast.error('Failed to load your rewards info.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = (platform: SocialFollowPlatform, file: File) => {
    setUploadingPlatform(platform);
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== 'string') {
        setUploadingPlatform(null);
        return;
      }
      try {
        await submitSocialFollowProof(platform, reader.result);
        toast.success(`${PLATFORM_INFO[platform].label} proof submitted for review.`);
        const status = await getSocialFollowStatus();
        setSocialFollow(status);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to submit proof.');
      } finally {
        setUploadingPlatform(null);
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read the selected file.');
      setUploadingPlatform(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const points = parseInt(redeemPoints, 10);
    if (!Number.isFinite(points) || points <= 0) {
      toast.error('Enter a valid number of points.');
      return;
    }
    if (!redeemWallet.trim()) {
      toast.error('Enter your Stellar wallet address.');
      return;
    }
    setIsRedeeming(true);
    try {
      await createRedemption(points, redeemWallet.trim());
      toast.success('Redemption request submitted.');
      setRedeemPoints('');
      setRedeemWallet('');
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit redemption.');
    } finally {
      setIsRedeeming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className={`w-6 h-6 animate-spin ${theme === 'dark' ? 'text-[#c9983a]' : 'text-[#a2792c]'}`} />
      </div>
    );
  }

  if (!balance || !socialFollow) {
    return (
      <Card theme={theme}>
        <p className={theme === 'dark' ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]'}>Couldn't load your rewards info. Please try again later.</p>
      </Card>
    );
  }

  const usdcPreview = (parseInt(redeemPoints, 10) || 0) * balance.usdc_per_point;

  return (
    <div className="space-y-6">
      {/* Points balance */}
      <Card theme={theme}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#d4af37] flex items-center justify-center shadow-[0_2px_8px_rgba(201,152,58,0.4)]">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <h2 className={`text-[28px] font-bold transition-colors ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'}`}>
            {balance.balance.toLocaleString()} points
          </h2>
        </div>
        <p className={`text-[14px] transition-colors ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
          ≈ ${(balance.balance * balance.usdc_per_point).toFixed(2)} USDC available to redeem
        </p>
      </Card>

      {/* Social Follow */}
      <Card theme={theme}>
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#d4af37] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(201,152,58,0.4)]">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className={`text-[22px] font-bold mb-1 transition-colors ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'}`}>
              Social Follow Program
            </h2>
            <p className={`text-[14px] transition-colors ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
              Follow us on every platform below and upload a screenshot as proof. Once all three are approved,
              you earn {socialFollow.points_reward} points.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {SOCIAL_FOLLOW_PLATFORMS.map((platform) => {
            const p = socialFollow.platforms.find((x) => x.platform === platform);
            return (
              <PlatformRow
                key={platform}
                platform={platform}
                status={p?.status ?? null}
                rejectionReason={p?.rejection_reason}
                onUpload={(file) => handleUpload(platform, file)}
                isUploading={uploadingPlatform === platform}
                theme={theme}
              />
            );
          })}
        </div>

        {socialFollow.completed && (
          <div className="mt-4 flex items-center gap-2 text-[13px] text-green-500 font-medium">
            <CheckCircle2 className="w-4 h-4" /> Completed - you earned {socialFollow.points_awarded} points.
          </div>
        )}
      </Card>

      {/* Redeem */}
      <Card theme={theme}>
        <h2 className={`text-[22px] font-bold mb-1 transition-colors ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'}`}>
          Redeem for USDC
        </h2>
        <p className={`text-[14px] mb-6 transition-colors ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
          Minimum {balance.min_redemption_points} points per request. Requests are reviewed by an admin before payout.
        </p>

        <form onSubmit={handleRedeem} className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="flex-1">
            <input
              type="number"
              min={balance.min_redemption_points}
              value={redeemPoints}
              onChange={(e) => setRedeemPoints(e.target.value)}
              placeholder={`Points (min ${balance.min_redemption_points})`}
              className={`w-full px-4 py-3 rounded-[12px] border text-[14px] transition-colors ${
                theme === 'dark' ? 'bg-white/10 border-white/20 text-[#e8dfd0] placeholder:text-[#8a7e70]' : 'bg-white/40 border-white/30 text-[#2d2820] placeholder:text-[#a89684]'
              }`}
            />
            {redeemPoints && (
              <p className={`text-[12px] mt-1 ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>≈ ${usdcPreview.toFixed(2)} USDC</p>
            )}
          </div>
          <div className="flex-[2]">
            <input
              type="text"
              value={redeemWallet}
              onChange={(e) => setRedeemWallet(e.target.value)}
              placeholder="Stellar wallet address (G...)"
              className={`w-full px-4 py-3 rounded-[12px] border text-[14px] font-mono transition-colors ${
                theme === 'dark' ? 'bg-white/10 border-white/20 text-[#e8dfd0] placeholder:text-[#8a7e70]' : 'bg-white/40 border-white/30 text-[#2d2820] placeholder:text-[#a89684]'
              }`}
            />
          </div>
          <button
            type="submit"
            disabled={isRedeeming}
            className="px-6 py-3 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[14px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_10px_30px_rgba(162,121,44,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRedeeming ? 'Submitting...' : 'Redeem'}
          </button>
        </form>

        {redemptions.length > 0 && (
          <div className="space-y-2">
            {redemptions.map((r) => (
              <div
                key={r.id}
                className={`flex items-center justify-between px-4 py-3 rounded-[12px] border text-[13px] transition-colors ${
                  theme === 'dark' ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.15] border-white/25'
                }`}
              >
                <div className={theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'}>
                  {r.points_spent.toLocaleString()} points → ${r.usdc_amount} USDC
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
