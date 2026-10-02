import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** The KeeperHub payout panel's colour tokens and controls, shared by the
 *  panel and the first-release box so both read as one surface. */

export type Tokens = ReturnType<typeof tokens>;

export function tokens(dark: boolean) {
  return {
    panel: dark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/20',
    strong: dark ? 'text-[#f5f5f5]' : 'text-[#2d2820]',
    body: dark ? 'text-[#d4d4d4]' : 'text-[#2d2820]',
    // Brighter than the settings card's #b8a898: this panel's tinted rows sit
    // on a lighter composite, and #b8a898 measured 4.1:1 there.
    muted: dark ? 'text-[#cdbfae]' : 'text-[#4a4038]',
    link: dark ? 'text-[#e8c571] hover:text-[#f5d98a]' : 'text-[#5c4214] hover:text-[#2d2820]',
    tile: dark ? 'border-white/10 bg-white/[0.04]' : 'border-white/30 bg-white/[0.20]',
    tileAlert: dark ? 'border-[#f59e0b]/45 bg-[#f59e0b]/[0.08] border-2' : 'border-[#b45309]/45 bg-[#f59e0b]/[0.10] border-2',
    note: dark ? 'border-white/[0.12] bg-white/[0.04]' : 'border-white/40 bg-white/[0.25]',
    leg: dark ? 'border border-white/10 bg-white/[0.06]' : 'border border-white/30 bg-white/[0.22]',
    legAlert: dark ? 'border-2 border-[#f59e0b]/55 bg-white/[0.06]' : 'border-2 border-[#b45309]/50 bg-white/[0.22]',
    dashed: dark ? 'border-white/20' : 'border-black/20',
    pillBox: dark ? 'border-white/10 bg-white/[0.08]' : 'border-white/40 bg-white/[0.30]',
    errorBox: dark ? 'border-[#ef4444]/25 bg-[#ef4444]/10 text-[#fca5a5]' : 'border-[#ef4444]/25 bg-[#ef4444]/[0.08] text-[#6f1818]',
    warnBox: dark ? 'border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#fcd34d]' : 'border-[#b45309]/30 bg-[#f59e0b]/10 text-[#7c2d12]',
    banner: {
      gold: dark ? 'border-[#c9983a]/35 bg-[#c9983a]/[0.08]' : 'border-[#c9983a]/40 bg-[#c9983a]/10',
      neutral: dark ? 'border-white/[0.12] bg-white/[0.04]' : 'border-white/40 bg-white/[0.25]',
      red: dark ? 'border-[#ef4444]/30 bg-[#ef4444]/[0.08]' : 'border-[#ef4444]/30 bg-[#ef4444]/[0.06]',
    },
    chip: {
      neutral: dark ? 'bg-white/10 text-[#ddd2c4]' : 'bg-black/[0.06] text-[#352c24]',
      gold: dark ? 'bg-[#c9983a]/20 text-[#e8c571]' : 'bg-[#c9983a]/20 text-[#5c4214]',
      amber: dark ? 'bg-[#f59e0b]/20 text-[#fbbf24]' : 'bg-[#f59e0b]/20 text-[#5f230e]',
      red: dark ? 'bg-[#ef4444]/20 text-[#fca5a5]' : 'bg-[#ef4444]/15 text-[#6f1818]',
      green: dark ? 'bg-[#22c55e]/20 text-[#4ade80]' : 'bg-[#22c55e]/20 text-[#123f22]',
    },
    toneText: {
      neutral: dark ? 'text-[#ddd2c4]' : 'text-[#4a4038]',
      amber: dark ? 'text-[#fbbf24]' : 'text-[#7c2d12]',
      red: dark ? 'text-[#fca5a5]' : 'text-[#6f1818]',
      green: dark ? 'text-[#4ade80]' : 'text-[#123f22]',
    },
    input: dark
      ? 'border-white/15 bg-white/[0.06] text-[#f5f5f5] placeholder:text-[#8f8272]'
      : 'border-black/15 bg-white/[0.35] text-[#2d2820] placeholder:text-[#6b5d4f]',
    secondary: dark
      ? 'border-white/15 bg-white/[0.06] text-[#d4d4d4] hover:bg-white/[0.10]'
      : 'border-black/15 bg-white/[0.20] text-[#2d2820] hover:bg-white/[0.30]',
    dialog: dark ? 'bg-[#2d2820] border-white/10 text-[#f5f5f5]' : 'bg-[#e6dccd] border-white/50 text-[#2d2820]',
    radioOn: dark ? 'border-[#c9983a] bg-[#c9983a]/[0.12]' : 'border-[#8a6420] bg-[#c9983a]/[0.15]',
    radioOff: dark ? 'border-white/15 bg-white/[0.04]' : 'border-black/15 bg-white/[0.20]',
  };
}

export function Code({ t, children }: { t: Tokens; children: ReactNode }) {
  return <span className={`font-mono text-[12px] ${t.muted}`}>{children}</span>;
}

export function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] border border-white/10 bg-gradient-to-br from-[#c9983a] to-[#a67c2e] px-[18px] py-2.5 text-[13px] font-semibold text-white shadow-[0_6px_20px_rgba(162,121,44,0.35)] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[40px]"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ t, children, onClick, disabled }: { t: Tokens; children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[44px] items-center justify-center rounded-[12px] border px-4 py-2 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[40px] ${t.secondary}`}
    >
      {children}
    </button>
  );
}

/** Static confirmation dialog. Not the shared Modal: that one animates in,
 *  and this is a no-motion surface. Escape and the backdrop cancel, except
 *  while the action is in flight. */
export function ConfirmShell({
  t,
  testId,
  titleId,
  busy,
  onCancel,
  children,
}: {
  t: Tokens;
  testId: string;
  titleId: string;
  busy: boolean;
  onCancel: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4" onClick={() => !busy && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={testId}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[90vh] w-full max-w-[540px] flex-col gap-4 overflow-y-auto rounded-[24px] border p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45)] sm:p-6 ${t.dialog}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
