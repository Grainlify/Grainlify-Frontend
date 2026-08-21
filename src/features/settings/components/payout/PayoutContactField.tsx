import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import { getPayoutContact, setPayoutContact } from '../../../../shared/api/client';

/** An optional address to reach somebody about payouts.
 *
 *  # Why it is here and not in settings generally
 *
 *  This sits under the payout address, after somebody has registered one. That
 *  is the single moment a person is doing something consequential with money
 *  and understands why we might need to reach them. The same field on signup or
 *  on a general settings page collects an address from somebody who was not
 *  thinking about payouts, which is a different thing even though the column
 *  would be identical.
 *
 *  # Optional means optional
 *
 *  Declining changes nothing: every other state on this screen is identical,
 *  there is no repeat prompt, and nothing is withheld. That is asserted in
 *  PayoutContactField.test.tsx rather than left to a reading of this file,
 *  because "optional" is exactly the property that degrades quietly - and this
 *  screen is the one every founding contributor is about to use for the first
 *  time.
 *
 *  # Removal
 *
 *  The clear control is the whole removal story for this data. There is no
 *  account-deletion path in the product to fall back on - not for this and not
 *  for anything else (Grainlify-Backend#532) - so this button is not a
 *  convenience, it is the mechanism. It saves through the same call as storing,
 *  so it cannot end up as the half that was never wired.
 */
export function PayoutContactField() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [stored, setStored] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const strong = dark ? 'text-[#f5efe5]' : 'text-[#2d2820]';
  const muted = dark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const res = await getPayoutContact();
      setStored(res.email ?? '');
      setDraft(res.email ?? '');
    } catch {
      // A failed read is not "they declined". Rendering the empty prompt would
      // invite somebody to re-enter an address they already gave, and a second
      // save is not harmful but the screen would be lying about what we hold.
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    try {
      const res = await setPayoutContact(draft.trim());
      setStored(res.email ?? '');
      setDraft(res.email ?? '');
      toast.success("We'll use this to tell you about payouts.");
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      toast.error(
        /email_malformed/.test(raw)
          ? "That doesn't look like an address we could send to."
          : "Couldn't save that. Nothing has changed.",
      );
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    try {
      await setPayoutContact('');
      setStored('');
      setDraft('');
      toast.success('Removed. We no longer have an address for you.');
    } catch {
      // Removal failing is the one failure here worth being blunt about: the
      // person asked for their data back and did not get it.
      toast.error("Couldn't remove it. Please try again, or contact us and we'll do it.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className={`text-[13px] mt-4 ${muted}`}>Checking…</p>;
  }
  if (loadFailed) {
    return (
      <p className={`text-[13px] mt-4 ${muted}`}>
        Couldn't check whether we have a contact address for you. Reload to try again — nothing
        you've already given us is affected.
      </p>
    );
  }

  const dirty = draft.trim() !== stored;

  return (
    <div className="mt-5 pt-5 border-t border-white/10">
      <label htmlFor="payout-contact" className={`text-[14px] font-semibold ${strong}`}>
        How should we contact you about payouts? <span className={`font-normal ${muted}`}>(optional)</span>
      </label>
      {/* The scope sentence and the limit in one breath, because a promise about
          use is only worth anything next to the ask. */}
      <p className={`text-[13px] mt-1.5 ${muted}`}>
        We'll use this only to tell you when a payout is ready to claim, and when a claim window is
        closing. Nothing else, ever. You can remove it at any time and everything on this screen
        keeps working without it.
      </p>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <input
          id="payout-contact"
          type="email"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
          placeholder="you@example.com"
          className={`flex-1 min-w-[220px] px-4 py-2.5 rounded-[12px] border text-[14px] ${
            dark
              ? 'bg-white/[0.06] border-white/10 text-[#f5efe5] placeholder:text-white/30'
              : 'bg-white/[0.4] border-white/40 text-[#2d2820] placeholder:text-black/30'
          }`}
        />
        <button
          type="button"
          onClick={save}
          disabled={busy || !dirty || draft.trim() === ''}
          className="px-5 py-2.5 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
        {stored !== '' && (
          <button
            type="button"
            onClick={clear}
            disabled={busy}
            className={`px-4 py-2.5 rounded-[12px] text-[13px] border ${
              dark ? 'border-white/15 text-[#b8a898]' : 'border-black/15 text-[#7a6b5a]'
            } disabled:opacity-50`}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
