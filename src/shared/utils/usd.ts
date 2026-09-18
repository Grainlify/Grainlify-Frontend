/** Formats a USD/USDC amount for display without ever parsing it to a number.
 *
 * The API sends these as fixed-scale decimal strings straight from Postgres
 * `numeric` - "8.000000", not "8" - and RewardsTab has stated the house rule
 * since it was written: the decimal is never rounded through a float. Parsing
 * with Number() to format it would break exactly the guarantee that rule
 * exists for, so everything here is digit-string arithmetic.
 *
 * Returns the bare amount ("8.00", "1,234.50"). Callers add their own currency
 * marker, because the surfaces disagree: the GrainHack pages show "$8.00",
 * the rewards table shows "3.00 USDC".
 *
 * Returns null for an absent or unparseable value so callers keep their own
 * empty copy, rather than this inventing a "0.00" for an amount that was never
 * set. A genuine zero formats as "0.00", since an event funded at zero is a
 * fact and an unset pool is not.
 */
export function formatUsdAmount(value: string | null | undefined): string | null {
  if (value == null) return null;
  const match = /^(-?)(\d+)(?:\.(\d*))?$/.exec(String(value).trim());
  if (!match) return null;

  const [, sign, intPart, frac = ''] = match;

  // Round half-up at the second decimal by inspecting the third digit, then
  // carry through one digit string so 9.999 -> 10.00 falls out of the same
  // path as 8.994 -> 8.99.
  let digits = intPart + (frac + '00').slice(0, 2);
  if (frac.charAt(2) >= '5' && frac.charAt(2) <= '9') {
    digits = incrementDigits(digits);
  }

  const cents = digits.slice(-2);
  const whole = digits.slice(0, -2).replace(/^0+(?=\d)/, '') || '0';
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `${sign}${grouped}.${cents}`;
}

/** Adds 1 to a non-negative integer represented as a digit string. */
function incrementDigits(digits: string): string {
  const out = digits.split('');
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i] === '9') {
      out[i] = '0';
    } else {
      // Character arithmetic, not parsing: the rule is that the amount never
      // becomes a number, and that holds for its digits too.
      out[i] = String.fromCharCode(out[i].charCodeAt(0) + 1);
      return out.join('');
    }
  }
  return `1${out.join('')}`;
}
