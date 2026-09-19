import { afterEach, describe, expect, it } from 'vitest';
import { base58, detectSolanaWallet, isGitHubLogin, linkMessage, signLinkMessage, walletBrowseLink } from './solana';

describe('Solana wallet linking', () => {
  afterEach(() => {
    delete window.phantom;
    delete window.solflare;
  });

  // The agent verifies this exact text. If it changes here and not there, every link fails.
  it('builds the message the agent verifies, byte for byte', () => {
    expect(linkMessage('Friend-Dev', 'Wallet111', '2026-09-20T00:00:00.000Z')).toBe(
      'Grainlify bounty agent: link this wallet to my GitHub account\nGitHub: friend-dev\nWallet: Wallet111\nIssued: 2026-09-20T00:00:00.000Z',
    );
  });

  it('encodes base58 like the Solana libraries do, including leading zeros', () => {
    expect(base58(new Uint8Array([0, 0, 1]))).toBe('112');
    expect(base58(new Uint8Array([255]))).toBe('5Q');
    expect(base58(new TextEncoder().encode('hello'))).toBe('Cn8eVZg');
  });

  it('builds universal links that open the page inside each wallet', () => {
    const page = 'https://grainlify.com/bounties/link?bounty=abc';
    expect(walletBrowseLink('phantom', page, 'https://grainlify.com')).toBe(
      'https://phantom.app/ul/browse/https%3A%2F%2Fgrainlify.com%2Fbounties%2Flink%3Fbounty%3Dabc?ref=https%3A%2F%2Fgrainlify.com',
    );
    expect(walletBrowseLink('solflare', page, 'https://grainlify.com')).toMatch(/^https:\/\/solflare\.com\/ul\/v1\/browse\/https%3A/);
  });

  it('accepts real GitHub usernames and rejects the rest', () => {
    for (const ok of ['octocat', 'Friend-Dev', 'a', 'a1-b2']) expect(isGitHubLogin(ok)).toBe(true);
    for (const bad of ['', '-lead', 'trail-', 'double--dash', 'has space', 'x'.repeat(40)]) expect(isGitHubLogin(bad)).toBe(false);
  });

  it('detects Phantom and Solflare only when they identify themselves', () => {
    expect(detectSolanaWallet()).toBeNull();
    window.solflare = { isSolflare: true, connect: async () => {}, signMessage: async () => new Uint8Array() };
    expect(detectSolanaWallet()).toBe('solflare');
    window.phantom = { solana: { isPhantom: true, connect: async () => {}, signMessage: async () => new Uint8Array() } };
    expect(detectSolanaWallet()).toBe('phantom');
  });

  it('asks the wallet to sign only the link message and returns the comment', async () => {
    let signed = '';
    const provider = {
      connect: async () => {},
      signMessage: async (m: Uint8Array) => {
        signed = new TextDecoder().decode(m);
        return { signature: new Uint8Array([1, 2, 3]) };
      },
    };
    const r = await signLinkMessage(provider, 'octocat', 'Wallet111', new Date('2026-09-20T00:00:00.000Z'));
    expect(signed).toBe(linkMessage('octocat', 'Wallet111', '2026-09-20T00:00:00.000Z'));
    expect(r.comment).toBe(`/grainlify link Wallet111 ${base58(new Uint8Array([1, 2, 3]))} 2026-09-20T00:00:00.000Z`);
  });
});
