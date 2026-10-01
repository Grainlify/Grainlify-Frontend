import { useCallback, useEffect, useState } from 'react';
import type { WalletAccount } from '@wallet-standard/base';
import {
  canSendTransactions,
  connectWallet,
  registerMobileWalletAdapter,
  sendTransaction,
  watchSolanaWallets,
  WalletRejectedError,
  type SolanaWallet,
} from '../../../../shared/wallet/solana';

/**
 * The funder's wallet, for the screens that ask it to sign.
 *
 * Grainlify builds every transaction a funder sends and can sign none of them,
 * so this is the only place money moves from: their wallet, on their approval.
 * `send` also checks the connected address is the one the escrow names, since
 * the program refuses any other and a refusal after signing is a worse way to
 * find out.
 */
export function useFunderWallet() {
  const [wallets, setWallets] = useState<SolanaWallet[]>([]);
  const [wallet, setWallet] = useState<SolanaWallet | null>(null);
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void registerMobileWalletAdapter(window.location.origin);
    return watchSolanaWallets((all) => setWallets(all.filter(canSendTransactions)));
  }, []);

  const connect = useCallback(async (w: SolanaWallet) => {
    setError(null);
    try {
      const a = await connectWallet(w);
      setWallet(w);
      setAccount(a);
    } catch (e) {
      setError(e instanceof WalletRejectedError ? `You declined in ${w.name}, so nothing was connected.` : e instanceof Error ? e.message : String(e));
    }
  }, []);

  const send = useCallback(
    async (transaction: string, network: string, mustBe?: string) => {
      if (!wallet || !account) throw new Error('Connect your wallet first.');
      if (mustBe && account.address !== mustBe) {
        throw new Error(`This escrow belongs to ${short(mustBe)}. Connect that wallet to sign for it; ${short(account.address)} cannot.`);
      }
      try {
        return await sendTransaction(wallet, account, transaction, network);
      } catch (e) {
        if (e instanceof WalletRejectedError) throw new Error(`You declined in ${wallet.name}, so nothing was sent.`);
        throw e;
      }
    },
    [wallet, account],
  );

  return { wallets, wallet, address: account?.address ?? null, connect, send, error };
}

export function short(address: string) {
  return address.length > 12 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}

/**
 * Ask the agent to confirm until the chain shows it. A wallet reports a
 * transaction sent a moment before the RPC the agent reads has it, so the
 * first confirm can honestly say "not yet".
 */
export async function untilConfirmed<T>(confirm: () => Promise<T>, tries = 8, waitMs = 2500): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await confirm();
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw last;
}
