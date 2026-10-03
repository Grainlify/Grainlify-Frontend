/** Names and explorer links for the networks a GrainHack or bounty payment can
 *  be on. One place, so the ledger and the admin payouts panel never disagree
 *  about which network a row is on or whether its tokens have any value. */

export type KnownNetwork = 'solana-mainnet' | 'solana-devnet' | 'base' | 'base-sepolia';

const LABEL: Record<KnownNetwork, string> = {
  'solana-mainnet': 'Solana mainnet',
  'solana-devnet': 'Solana devnet',
  base: 'Base mainnet',
  'base-sepolia': 'Base Sepolia testnet',
};

/** "Solana devnet", "Base Sepolia testnet"; an unknown network verbatim. */
export function networkLabel(network: string | null | undefined): string {
  if (!network) return 'Unknown network';
  return LABEL[network as KnownNetwork] ?? network;
}

/** True for every network whose tokens have no value. Unknown networks count
 *  as test: claiming real money for a network this page can't name would be
 *  the worse mistake. */
export function isTestNetwork(network: string | null | undefined): boolean {
  return network !== 'solana-mainnet' && network !== 'base';
}

/** The explorer page for a transaction, or null for a network with none known. */
export function txExplorerUrl(network: string | null | undefined, tx: string | null | undefined): string | null {
  if (!tx) return null;
  const id = encodeURIComponent(tx);
  switch (network) {
    case 'solana-mainnet':
      return `https://explorer.solana.com/tx/${id}`;
    case 'solana-devnet':
      return `https://explorer.solana.com/tx/${id}?cluster=devnet`;
    case 'base':
      return `https://basescan.org/tx/${id}`;
    case 'base-sepolia':
      return `https://sepolia.basescan.org/tx/${id}`;
    default:
      return null;
  }
}

/** "Solana Explorer" / "Basescan", for link text. */
export function explorerName(network: string | null | undefined): string {
  if (network === 'base' || network === 'base-sepolia') return 'Basescan';
  if (network === 'solana-mainnet' || network === 'solana-devnet') return 'Solana Explorer';
  return 'explorer';
}

/** The explorer a link points at, by its host, for link text. The backend
 *  links Solana transactions to Solana Explorer and the agent to Solscan, so
 *  the name follows the link rather than the network. */
export function explorerNameForUrl(url: string | null | undefined): string {
  if (!url) return 'explorer';
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    return 'explorer';
  }
  if (host === 'solscan.io' || host.endsWith('.solscan.io')) return 'Solscan';
  if (host === 'explorer.solana.com') return 'Solana Explorer';
  if (host === 'basescan.org' || host.endsWith('.basescan.org')) return 'Basescan';
  return 'explorer';
}

/** First 6 and last 4: enough to recognise a signature or hash. */
export function shortTx(tx: string): string {
  return tx.length > 14 ? `${tx.slice(0, 6)}…${tx.slice(-4)}` : tx;
}
