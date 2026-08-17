import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { FoundingMe, SocialFollowStatus } from '../../../../shared/api/client';

const WAVE_LABEL: Record<string, string> = {
  founding: 'Founding member',
  wave_two: 'Early member',
  open: 'Open wave',
};

/** Somebody's position in the Founding Contributor Pool, shown with their
 *  eligibility and never without it.
 *
 *  # Why the two facts are one component
 *
 *  17 of the 38 people who hold a position have no approved follow proof. They
 *  hold a Founding position at ×1.5 that will pay them nothing, and nothing
 *  has ever told them a proof is required. A panel showing "Founding member,
 *  ×1.5" on its own would confirm a belief that is false — which is worse than
 *  showing nothing, because it forecloses the question.
 *
 *  So position and eligibility render together or not at all. The caller holds
 *  both before mounting this; there is deliberately no state here where one has
 *  arrived and the other has not, because that gap would flash exactly the
 *  false confirmation the component exists to prevent.
 *
 *  # Why there is no fill counter
 *
 *  "38 of 100 claimed" invites people to read scarcity into something where
 *  nobody is ever refused — past the bands you still join and can still earn
 *  fully — and it is the one figure that moves under the reader. Left out.
 */
export function FoundingPosition({
  position,
  follow,
  theme,
  onVerifyClick,
}: {
  /** null means the request failed. `{member:false}` means no position yet —
   *  a different fact, and the reason this prop is nullable rather than
   *  optional. */
  position: FoundingMe | null;
  follow: SocialFollowStatus;
  theme: string;
  onVerifyClick?: () => void;
}) {
  const dark = theme === 'dark';
  const strong = dark ? 'text-[#f5efe5]' : 'text-[#2d2820]';
  const muted = dark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const shell = `rounded-[16px] border p-5 ${
    dark ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.25] border-white/30'
  }`;

  // Load failure. Said plainly, and separated from "you have no position",
  // because a blank where a position belongs reads as an answer rather than a
  // missing one.
  if (position === null) {
    return (
      <div className={shell}>
        <p className={`text-[14px] ${muted}`}>
          Couldn't load your pool position. This doesn't affect it — reload to try again.
        </p>
      </div>
    );
  }

  const eligible = follow.status === 'approved';

  // State 3: eligible, no position yet. Names the missing step rather than
  // leaving them to infer it.
  if (!position.member) {
    if (eligible) {
      return (
        <div className={shell}>
          <div className="flex items-center gap-2 mb-1.5">
            <CheckCircle2 className={`w-4 h-4 ${dark ? 'text-[#4ade80]' : 'text-[#16a34a]'}`} />
            <span className={`text-[15px] font-bold ${strong}`}>Approved · no position yet</span>
          </div>
          <p className={`text-[14px] ${muted}`}>
            You're eligible for the Founding Contributor Pool. You'll be given a wave and
            multiplier when you verify your identity — positions are allocated in the order
            people complete both steps.
          </p>
          {onVerifyClick && (
            <button
              onClick={onVerifyClick}
              className="mt-3 px-4 py-2 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] border border-white/10"
            >
              Verify your identity
            </button>
          )}
        </div>
      );
    }
    // State 4: neither. Both steps, and the sequence rule in plain words.
    return (
      <div className={shell}>
        <div className="flex items-center gap-2 mb-1.5">
          <Info className={`w-4 h-4 ${dark ? 'text-[#c9983a]' : 'text-[#a67c2e]'}`} />
          <span className={`text-[15px] font-bold ${strong}`}>
            Not in the Founding Contributor Pool yet
          </span>
        </div>
        <p className={`text-[14px] ${muted}`}>
          Two steps: verify your identity, and get a follow proof approved. Whichever you
          finish second is when your position is allocated.
        </p>
      </div>
    );
  }

  const band = WAVE_LABEL[position.wave ?? ''] ?? 'Pool member';
  const number = position.sequence_number ? `#${position.sequence_number}` : null;
  const multiplier = position.multiplier ? `×${position.multiplier}` : null;

  const header = (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1.5">
      <span className={`text-[15px] font-bold ${strong}`}>{band}</span>
      {number && <span className={`text-[15px] font-bold ${dark ? 'text-[#c9983a]' : 'text-[#a67c2e]'}`}>{number}</span>}
      {multiplier && <span className={`text-[15px] font-bold ${strong}`}>{multiplier}</span>}
    </div>
  );

  // State 1: position and approved.
  if (eligible) {
    return (
      <div className={shell}>
        {header}
        <p className={`text-[14px] ${muted}`}>
          Your share total is multiplied by {position.multiplier} when the pool is shared out.
          Your follow proof is approved, so you're eligible.
        </p>
      </div>
    );
  }

  // State 2: position, not eligible. The one that does the work.
  return (
    <div
      className={`rounded-[16px] border p-5 ${
        dark ? 'bg-[#c9983a]/[0.08] border-[#c9983a]/30' : 'bg-[#c9983a]/[0.10] border-[#c9983a]/35'
      }`}
    >
      {header}
      <div className="flex items-start gap-2">
        <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${dark ? 'text-[#c9983a]' : 'text-[#a67c2e]'}`} />
        <div>
          <p className={`text-[14px] font-semibold ${strong}`}>
            You're not currently eligible to receive a share.
          </p>
          <p className={`text-[14px] mt-1 ${muted}`}>
            The Founding Contributor Pool requires an approved follow proof for LinkedIn and X,
            and {followShortfall(follow)}.{' '}
            {/* Stated before the fix, and deliberately. Read as a threat to
                their position, some people do nothing; the position is not at
                risk and saying so is what makes the next sentence actionable. */}
            <span className={strong}>Your position and multiplier are permanent and won't be affected</span> —{' '}
            {followRemedy(follow)}
          </p>
        </div>
      </div>
    </div>
  );
}

/** What is actually wrong with their proof, read from the stored status.
 *
 *  Not hardcoded to "hasn't been submitted". That is true of all 17 people in
 *  this state today and will stop being true the moment one of them submits and
 *  is rejected — at which point the old wording would tell somebody who had
 *  submitted twice that they had never submitted at all.
 */
export function followShortfall(follow: SocialFollowStatus): string {
  switch (follow.status) {
    case 'pending':
      return 'yours is still being reviewed';
    case 'rejected':
      return 'yours wasn\'t approved';
    case 'revoked':
      return 'yours was withdrawn';
    default:
      return 'yours hasn\'t been submitted';
  }
}

/** What to do next, matched to the same status. A person waiting on a review
 *  must not be told to submit again. */
export function followRemedy(follow: SocialFollowStatus): string {
  switch (follow.status) {
    case 'pending':
      return 'you\'ll be eligible as soon as it\'s approved.';
    case 'rejected':
    case 'revoked':
      return 'submit new screenshots below and you\'re eligible again.';
    default:
      return 'submit your proof below and you\'re eligible.';
  }
}
