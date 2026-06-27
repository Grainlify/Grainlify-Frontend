import { useCallback, useEffect, useRef, useState } from 'react';
import { User, ExternalLink, Award, GitPullRequest, Trophy, Users, Star, Check, Loader2 } from 'lucide-react';
import { Applicant } from '../../types';

/** Actions a maintainer can take on an application. */
type ActionType = 'assign' | 'reject' | 'unassign';

interface ApplicationCardProps {
  /** The applicant to display. If `null`/`undefined`, the card renders nothing. */
  applicant: Applicant | null | undefined;
  /** Whether the applicant is already assigned (`assigned`) or still awaiting a decision (`pending`). */
  status: 'assigned' | 'pending';
  /** Invoked when the user header is activated (click or keyboard). */
  onProfileClick: () => void;
  /**
   * Called when the maintainer assigns the applicant. May return a promise; while it
   * is pending the action buttons are disabled and a spinner is shown.
   */
  onAssign?: (applicant: Applicant) => void | Promise<void>;
  /**
   * Called when the maintainer rejects the applicant. Destructive: requires the user to
   * confirm before this fires. May return a promise to drive the pending state.
   */
  onReject?: (applicant: Applicant) => void | Promise<void>;
  /**
   * Called when the maintainer unassigns the applicant. Destructive: requires the user to
   * confirm before this fires. May return a promise to drive the pending state.
   */
  onUnassign?: (applicant: Applicant) => void | Promise<void>;
}

/**
 * Card summarising a single applicant for a maintainer, with assign / reject / unassign
 * controls.
 *
 * Safety behaviours:
 * - Destructive actions (reject, unassign) require an inline confirmation step so a single
 *   accidental click cannot trigger an irreversible request.
 * - While any action is in flight every action button is disabled and the active button
 *   shows a spinner, preventing duplicate submissions from double-clicks.
 * - A `null`/`undefined` `applicant` renders nothing instead of crashing.
 *
 * All controls are native buttons, so they are keyboard-operable and expose accessible
 * names (`aria-label` where the visible label is ambiguous).
 */
export function ApplicationCard({
  applicant,
  status,
  onProfileClick,
  onAssign,
  onReject,
  onUnassign,
}: ApplicationCardProps) {
  /** The action currently awaiting confirmation, if any. */
  const [confirming, setConfirming] = useState<'reject' | 'unassign' | null>(null);
  /** The action whose handler is currently in flight, if any. */
  const [pending, setPending] = useState<ActionType | null>(null);

  // The card may unmount as a result of its own action (e.g. reject removes it from the
  // list). Guard async state updates so we never set state after unmount.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runAction = useCallback(
    async (type: ActionType, handler?: (applicant: Applicant) => void | Promise<void>) => {
      // Ignore if there is nothing to run or another action is already in flight.
      if (!applicant || !handler || pending) return;
      setPending(type);
      try {
        await handler(applicant);
      } finally {
        // Reset on settle. For destructive actions this keeps the confirmation prompt
        // (with its spinner) visible for the duration of the request, then dismisses it.
        if (mountedRef.current) {
          setPending(null);
          setConfirming(null);
        }
      }
    },
    [applicant, pending],
  );

  // Guard: never render (or read fields off) a missing applicant.
  if (!applicant) return null;

  const isBusy = pending !== null;

  /** Shared confirmation prompt for destructive actions. */
  const renderConfirm = (
    type: 'reject' | 'unassign',
    handler: ((applicant: Applicant) => void | Promise<void>) | undefined,
  ) => {
    const label = type === 'reject' ? 'Reject' : 'Unassign';
    const isPending = pending === type;
    return (
      <div className="flex w-full items-center gap-2" role="group" aria-label={`Confirm ${label.toLowerCase()}`}>
        <span className="text-[13px] font-semibold text-[#2d2820]" id={`confirm-${type}-label`}>
          {type === 'reject' ? 'Reject this application?' : 'Unassign this applicant?'}
        </span>
        <button
          type="button"
          onClick={() => runAction(type, handler)}
          disabled={isBusy}
          aria-busy={isPending}
          aria-describedby={`confirm-${type}-label`}
          className="ml-auto px-4 py-2 rounded-[8px] bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-[13px] font-semibold text-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {isPending ? `${label}ing…` : `Confirm ${label.toLowerCase()}`}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(null)}
          disabled={isBusy}
          className="px-4 py-2 rounded-[8px] bg-white/30 hover:bg-white/50 border border-white/40 text-[13px] font-semibold text-[#2d2820] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    );
  };

  return (
    <div className="backdrop-blur-[25px] bg-white/[0.15] rounded-[16px] border border-white/25 p-6">
      {/* Clickable User Header */}
      <button
        type="button"
        onClick={onProfileClick}
        aria-label={`View ${applicant.name}'s profile`}
        className="w-full flex items-center gap-3 mb-5 hover:bg-white/10 -m-2 p-2 rounded-[12px] transition-all group/user"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#c9983a] to-[#d4af37] flex items-center justify-center shadow-[0_4px_12px_rgba(201,152,58,0.3)]">
          <User className="w-6 h-6 text-white" aria-hidden="true" />
        </div>
        <div className="text-left">
          <h4 className="text-[15px] font-bold text-[#2d2820] group-hover/user:text-[#c9983a] transition-colors">
            {applicant.name}
          </h4>
          <p className="text-[12px] text-[#7a6b5a]">Applied - {applicant.appliedDate}</p>
        </div>
        <ExternalLink className="w-4 h-4 text-[#7a6b5a] ml-auto opacity-0 group-hover/user:opacity-100 transition-opacity" aria-hidden="true" />
      </button>

      {/* Badge (guarded: optional and may be absent) */}
      {applicant.badge && (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-gradient-to-r from-[#c9983a]/20 to-[#d4af37]/15 border border-[#c9983a]/30 mb-5">
          <Award className="w-4 h-4 text-[#c9983a]" aria-hidden="true" />
          <span className="text-[13px] font-bold text-[#2d2820]">{applicant.badge}</span>
        </div>
      )}

      {/* Profile Stats */}
      {applicant.profileStats && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="backdrop-blur-[20px] bg-white/[0.12] rounded-[12px] border border-[#c9983a]/20 p-3">
            <div className="flex items-center gap-2 mb-1">
              <GitPullRequest className="w-4 h-4 text-[#c9983a]" aria-hidden="true" />
              <span className="text-[20px] font-bold text-[#2d2820]">{applicant.profileStats.contributions}</span>
            </div>
            <p className="text-[11px] font-semibold text-[#7a6b5a] uppercase tracking-wide">Contributions</p>
          </div>
          <div className="backdrop-blur-[20px] bg-white/[0.12] rounded-[12px] border border-[#c9983a]/20 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-[#c9983a]" aria-hidden="true" />
              <span className="text-[20px] font-bold text-[#2d2820]">{applicant.profileStats.rewards}</span>
            </div>
            <p className="text-[11px] font-semibold text-[#7a6b5a] uppercase tracking-wide">Rewards</p>
          </div>
        </div>
      )}

      {/* Additional Profile Info */}
      {applicant.profileStats && (
        <div className="space-y-2 mb-5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#7a6b5a]" aria-hidden="true" />
            <span className="text-[13px] text-[#7a6b5a]">
              Contributor on <span className="font-bold text-[#2d2820]">{applicant.profileStats.contributorProjects}</span> projects
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[#7a6b5a]" aria-hidden="true" />
            <span className="text-[13px] text-[#7a6b5a]">
              Lead <span className="font-bold text-[#2d2820]">{applicant.profileStats.leadProjects}</span> projects
            </span>
          </div>
        </div>
      )}

      {/* Message */}
      {applicant.message && (
        <div className="p-4 rounded-[12px] bg-white/20 border border-white/30 mb-5">
          <p className="text-[13px] text-[#2d2820] leading-relaxed">
            {applicant.message}
          </p>
        </div>
      )}

      {/* Status & Action Buttons */}
      <div className="flex items-center justify-between gap-2">
        {status === 'assigned' ? (
          confirming === 'unassign' ? (
            renderConfirm('unassign', onUnassign)
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#c9983a] to-[#d4af37] flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} aria-hidden="true" />
                </div>
                <span className="text-[13px] font-bold text-[#c9983a]">Assigned</span>
              </div>
              {/* Destructive: opens the inline confirmation prompt; the spinner lives there. */}
              <button
                type="button"
                onClick={() => setConfirming('unassign')}
                disabled={isBusy}
                aria-label={`Unassign ${applicant.name}`}
                className="px-4 py-2 rounded-[8px] bg-white/30 hover:bg-white/50 border border-white/40 hover:border-[#c9983a]/40 text-[13px] font-semibold text-[#2d2820] hover:text-[#c9983a] transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                Unassign
              </button>
            </>
          )
        ) : confirming === 'reject' ? (
          renderConfirm('reject', onReject)
        ) : (
          <>
            {/* Destructive: opens the inline confirmation prompt; the spinner lives there. */}
            <button
              type="button"
              onClick={() => setConfirming('reject')}
              disabled={isBusy}
              aria-label={`Reject ${applicant.name}`}
              className="flex-1 px-4 py-2 rounded-[8px] bg-white/30 hover:bg-white/50 border border-white/40 hover:border-[#c9983a]/40 text-[13px] font-semibold text-[#2d2820] hover:text-[#c9983a] transition-all mr-2 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => runAction('assign', onAssign)}
              disabled={isBusy}
              aria-busy={pending === 'assign'}
              aria-label={`Assign ${applicant.name}`}
              className="flex-1 px-4 py-2 rounded-[8px] bg-gradient-to-br from-[#c9983a]/30 to-[#d4af37]/25 border border-[#c9983a]/40 text-[13px] font-semibold text-[#2d2820] hover:from-[#c9983a]/40 hover:to-[#d4af37]/35 hover:shadow-[0_4px_16px_rgba(201,152,58,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {pending === 'assign' && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {pending === 'assign' ? 'Assigning…' : 'Assign'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
