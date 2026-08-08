import { siStellar, siTether } from 'simple-icons';

// Every payment method on this platform settles on Stellar today (see
// internal/handlers/redemptions.go on the backend — the wallet field is
// literally `stellar_wallet_address`, validated with Stellar's own address
// format). USDC/USDT/XLM are three assets *on* Stellar, not three networks,
// so these icons intentionally share one network badge rather than offering
// per-token network variants.

export function SimpleIconGlyph({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d={path} />
    </svg>
  );
}

/** Official Stellar mark + brand color, straight from simple-icons. */
export function StellarIcon({ className }: { className?: string }) {
  return (
    <div className={`rounded-full flex items-center justify-center ${className}`} style={{ backgroundColor: `#${siStellar.hex}` }}>
      <SimpleIconGlyph path={siStellar.path} className="w-[55%] h-[55%] text-black" />
    </div>
  );
}

/** Official Tether mark + brand color, straight from simple-icons. */
export function UsdtIcon({ className }: { className?: string }) {
  return (
    <div className={`rounded-full flex items-center justify-center ${className}`} style={{ backgroundColor: `#${siTether.hex}` }}>
      <SimpleIconGlyph path={siTether.path} className="w-[60%] h-[60%] text-white" />
    </div>
  );
}

// No official USDC mark ships in simple-icons - a plain circle in USDC's own
// brand blue plus the "$" reads clearly, especially paired with a "USDC"
// label right next to it in the UI.
export function UsdcIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#2775CA" />
      <text x="16" y="22" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="17" fill="#ffffff">
        $
      </text>
    </svg>
  );
}

const TOKEN_ICONS: Record<'usdc' | 'usdt' | 'xlm', (props: { className?: string }) => JSX.Element> = {
  usdc: UsdcIcon,
  usdt: UsdtIcon,
  xlm: StellarIcon,
};

export function TokenIcon({ token, className = 'w-8 h-8' }: { token: 'usdc' | 'usdt' | 'xlm'; className?: string }) {
  const Icon = TOKEN_ICONS[token];
  return <Icon className={className} />;
}

/** Token badge with the Stellar network's own logo overlapping the corner -
 * the same convention wallets and exchanges use for "token on chain". Skipped
 * for XLM itself, since XLM *is* Stellar's native asset - a network badge on
 * top of the network's own icon would be redundant. */
export function TokenOnStellarIcon({
  token,
  ringClassName,
  className = 'w-8 h-8',
}: {
  token: 'usdc' | 'usdt' | 'xlm';
  ringClassName: string;
  className?: string;
}) {
  if (token === 'xlm') return <TokenIcon token={token} className={className} />;

  return (
    <div className={`relative shrink-0 ${className}`}>
      <TokenIcon token={token} className="w-full h-full" />
      {/* Sized relative to the base icon (not a fixed px class) so the corner
          badge stays proportional whether this renders at w-6 or w-8. */}
      <div
        className={`absolute rounded-full ring-2 flex items-center justify-center ${ringClassName}`}
        style={{ bottom: '-8%', right: '-8%', width: '50%', height: '50%' }}
      >
        <StellarIcon className="w-full h-full" />
      </div>
    </div>
  );
}
