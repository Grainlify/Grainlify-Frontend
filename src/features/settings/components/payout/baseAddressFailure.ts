import { isApiError } from '../../../../shared/api/apiError';
import { WalletDeclinedError, WalletRequestPendingError } from '../../../../shared/wallet/evm';

/** Why a Base registration attempt ended, one kind per next action.
 *
 *  # The nonce distinctions are the point
 *
 *  The server (PostAddress, Grainlify-Backend payout_address.go) checks the
 *  address and the signature BEFORE it consumes the signing request, and
 *  everything after that runs on a request that is already spent. So:
 *
 *  - `signature_invalid`, `address_rejected`: nothing was consumed.
 *  - `unchanged`: the signature verified, the request WAS consumed, and the
 *    stored registration was left exactly as it was.
 *  - `another_account`, `store_failed`: consumed, nothing saved.
 *
 *  "Your address didn't change" reads the same for the first and the second,
 *  and they are different facts. Keep them as different kinds with different
 *  copy; do not fold `unchanged` into a generic "nothing changed" message.
 */
export type BaseFailureKind =
  | 'declined'
  | 'request_pending'
  | 'closed'
  | 'signature_invalid'
  | 'address_rejected'
  | 'nonce_expired'
  | 'nonce_spent'
  | 'another_account'
  | 'unchanged'
  | 'store_failed'
  | 'unknown';

export interface BaseFailure {
  kind: BaseFailureKind;
  /** The server's own `detail`, shown verbatim where the design says so. */
  detail?: string;
  /** The server code, kept for the card's test ids and for debugging. */
  code?: string;
}

export function classifyBaseFailure(e: unknown): BaseFailure {
  if (e instanceof WalletDeclinedError) return { kind: 'declined' };
  if (e instanceof WalletRequestPendingError) return { kind: 'request_pending' };
  if (!isApiError(e)) return { kind: 'unknown' };

  const code = typeof e.data?.error === 'string' ? e.data.error : undefined;
  const detail = typeof e.data?.detail === 'string' ? e.data.detail : undefined;
  switch (code) {
    case 'chain_not_enabled':
    case 'chain_not_configured':
    case 'chain_unsupported':
    case 'chain_family_unknown':
      return { kind: 'closed', code };
    case 'signature_invalid':
      return { kind: 'signature_invalid', code };
    case 'address_malformed':
    case 'address_reserved':
      return { kind: 'address_rejected', code, detail };
    case 'nonce_expired':
      return { kind: 'nonce_expired', code };
    case 'nonce_used':
    case 'nonce_unknown':
    case 'nonce_wrong_purpose':
      return { kind: 'nonce_spent', code };
    case 'address_registered_to_another_account':
      return { kind: 'another_account', code, detail };
    case 'address_unchanged':
      return { kind: 'unchanged', code };
    case 'store_failed':
      return { kind: 'store_failed', code };
    default:
      return { kind: 'unknown', code };
  }
}
