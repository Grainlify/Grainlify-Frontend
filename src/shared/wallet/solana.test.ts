import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerFakeWallet } from '../../test/fakeSolanaWallet'
import { WalletRejectedError, base58, connectWallet, phoneOs, registerMobileWalletAdapter, signText, walletBrowseLink, watchSolanaWallets, type SolanaWallet } from './solana'

describe('Solana wallets (Wallet Standard)', () => {
  const cleanup: (() => void)[] = []
  afterEach(() => {
    cleanup.splice(0).forEach((f) => f())
    vi.restoreAllMocks()
  })

  it('lists wallets that connect, sign messages and speak Solana, including ones that register late', () => {
    const seen: string[][] = []
    const stop = watchSolanaWallets((ws) => seen.push(ws.map((w) => w.name)))
    cleanup.push(stop)
    cleanup.push(registerFakeWallet({ name: 'Phantom' }).unregister)
    cleanup.push(registerFakeWallet({ name: 'EvmOnly', chains: ['eip155:1'] }).unregister)
    cleanup.push(registerFakeWallet({ name: 'NoSign', noSignMessage: true }).unregister)
    // An extension that registers after the page has rendered: the old one-time
    // window.solflare check would not have seen it.
    cleanup.push(registerFakeWallet({ name: 'Solflare' }).unregister)
    expect(seen[seen.length - 1]).toEqual(['Phantom', 'Solflare'])
  })

  it('lists a wallet once even when it registers twice, as Phantom does', () => {
    let wallets: SolanaWallet[] = []
    cleanup.push(watchSolanaWallets((ws) => (wallets = ws)))
    cleanup.push(registerFakeWallet({ name: 'Phantom' }).unregister)
    cleanup.push(registerFakeWallet({ name: 'Phantom' }).unregister)
    expect(wallets.map((w) => w.name)).toEqual(['Phantom'])
  })

  it('connects and signs the exact text as UTF-8', async () => {
    const fake = registerFakeWallet({ name: 'Phantom' })
    cleanup.push(fake.unregister)
    let wallets: SolanaWallet[] = []
    cleanup.push(watchSolanaWallets((ws) => (wallets = ws)))
    const account = await connectWallet(wallets[0])
    expect(account.address).toBe(fake.address)
    const sig = await signText(wallets[0], account, 'Grainlify: línk ✓')
    expect(sig).toHaveLength(64)
    expect(fake.signed).toEqual(['Grainlify: línk ✓'])
  })

  it('reports a declined request as a rejection, whichever way the wallet says it', async () => {
    for (const reason of [Object.assign(new Error('x'), { code: 4001 }), new Error('User rejected the request.'), new Error('Signing was cancelled')]) {
      const fake = registerFakeWallet({ name: 'Phantom', signMessage: async () => Promise.reject(reason) })
      let wallets: SolanaWallet[] = []
      const stop = watchSolanaWallets((ws) => (wallets = ws))
      const account = await connectWallet(wallets[0])
      await expect(signText(wallets[0], account, 'm')).rejects.toBeInstanceOf(WalletRejectedError)
      stop()
      fake.unregister()
    }
  })

  it('passes other failures through unchanged', async () => {
    const fake = registerFakeWallet({ name: 'Phantom', connect: async () => Promise.reject(new Error('wallet locked')) })
    cleanup.push(fake.unregister)
    let wallets: SolanaWallet[] = []
    cleanup.push(watchSolanaWallets((ws) => (wallets = ws)))
    await expect(connectWallet(wallets[0])).rejects.toThrow('wallet locked')
  })

  it('registers the Mobile Wallet Adapter only on Android', async () => {
    const seen: string[] = []
    cleanup.push(watchSolanaWallets((ws) => seen.splice(0, seen.length, ...ws.map((w) => w.name))))
    await registerMobileWalletAdapter('https://grainlify.com')
    expect(seen).not.toContain('Mobile Wallet Adapter')
  })

  it('tells iOS, Android and computers apart', () => {
    expect(phoneOs('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('ios')
    expect(phoneOs('Mozilla/5.0 (Linux; Android 15; Pixel 9)')).toBe('android')
    expect(phoneOs('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBeNull()
  })

  it('encodes base58 like the Solana libraries do, including leading zeros', () => {
    expect(base58(new Uint8Array([0, 0, 1]))).toBe('112')
    expect(base58(new Uint8Array([255]))).toBe('5Q')
    expect(base58(new TextEncoder().encode('hello'))).toBe('Cn8eVZg')
  })

  it('builds universal links that open the page inside each wallet', () => {
    const page = 'https://grainlify.com/bounties/link?bounty=abc'
    expect(walletBrowseLink('Phantom', page, 'https://grainlify.com')).toBe(
      'https://phantom.app/ul/browse/https%3A%2F%2Fgrainlify.com%2Fbounties%2Flink%3Fbounty%3Dabc?ref=https%3A%2F%2Fgrainlify.com',
    )
    expect(walletBrowseLink('Solflare', page, 'https://grainlify.com')).toMatch(/^https:\/\/solflare\.com\/ul\/v1\/browse\/https%3A/)
  })
})
