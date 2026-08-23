import { PayoutAddressCard } from './PayoutAddressCard';
import { PayoutReadinessCard } from './PayoutReadinessCard';
import { ClaimsCard } from './ClaimsCard';

/** Everything a contributor needs to be paid, and nothing that pretends to be.
 *
 *  This tab used to end with a "Payout preferences" card: the projects you had
 *  contributed to, a billing-profile dropdown per project, and a Save button.
 *  None of it did anything. handleSave's entire body was a console.log, the
 *  dropdown wrote to component state that no reload survived, and the profiles
 *  it offered live in localStorage rather than on the server. There is no
 *  endpoint for project-to-profile payout mappings and never was.
 *
 *  It shipped in the initial commit and stayed six months, which is the part
 *  worth remembering: the log is what made it look implemented. Clicking Save
 *  produced console output, so the button "worked" to anyone who checked the
 *  way a developer checks. To a contributor it did nothing at all - no error,
 *  no confirmation, no save - on the one screen where the stakes are money.
 *
 *  Removed rather than left disabled. A control that silently does nothing on
 *  a payout screen is worse than an absent one, and a disabled Save promises a
 *  feature that has no backend behind it. If mappings are ever built, this is
 *  a small amount of UI to write again against an endpoint that exists.
 */
export function PayoutTab() {
  return (
    <div className="space-y-6">
      {/* The address a payout is sent to. First, because nothing else in this
          tab matters if we have nowhere to pay. */}
      <ClaimsCard />
      <PayoutReadinessCard />
      <PayoutAddressCard />
    </div>
  );
}
