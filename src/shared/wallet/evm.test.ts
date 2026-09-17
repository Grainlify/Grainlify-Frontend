import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  __resetEvmWalletsForTest,
  connectEvmWallet,
  signEvmChallenge,
  toHexUtf8,
  watchEvmWallets,
  WalletConflictError,
  WalletDeclinedError,
  WalletRequestPendingError,
  type EvmWallet,
} from './evm'

type Request = (args: { method: string; params?: unknown[] }) => Promise<unknown>

function provider(request: Request = vi.fn()) {
  return { request: vi.fn(request) }
}

function announce(info: Record<string, unknown>, p: unknown = provider()) {
  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: { info, provider: p } }))
}

function info(rdns: string, uuid: string, name = rdns) {
  return { rdns, uuid, name, icon: 'data:image/svg+xml;base64,AAAA' }
}

function watch() {
  let latest: EvmWallet[] = []
  const stop = watchEvmWallets((w) => {
    latest = w
  })
  return { get: () => latest, stop }
}

afterEach(() => {
  __resetEvmWalletsForTest()
  delete (window as { ethereum?: unknown }).ethereum
  vi.restoreAllMocks()
})

// The exact challenge format the server issues (challengeMessage in
// Grainlify-Backend internal/handlers/payout_address.go).
const challenge =
  'Grainlify payout address verification\nChain: base-sepolia\nAddress: 0xE623Ed51dbE14e054b9595079c50f1a41FeAe2c1\nNonce: n0nce_-AZaz09'

describe('signEvmChallenge', () => {
  it('sends the message as 0x + hex UTF-8, first, with the address second', async () => {
    const p = provider(async () => '0xSIG')
    const wallet = { key: 'k', provider: p, conflict: false } as unknown as EvmWallet

    await signEvmChallenge(wallet, challenge, '0xe623ed51dbe14e054b9595079c50f1a41feae2c1')

    expect(p.request).toHaveBeenCalledWith({
      method: 'personal_sign',
      params: ['0x' + Buffer.from(challenge, 'utf8').toString('hex'), '0xe623ed51dbe14e054b9595079c50f1a41feae2c1'],
    })
  })

  // Byte-for-byte: newlines stay LF, nothing trimmed, multi-byte text is UTF-8.
  it('encodes exactly the bytes it was given', () => {
    expect(toHexUtf8('a\nb')).toBe('0x610a62')
    expect(toHexUtf8('a\n')).toBe('0x610a')
    expect(toHexUtf8(' é')).toBe('0x20c3a9')
  })

  it('returns the signature exactly as the wallet gave it', async () => {
    const wallet = { key: 'k', provider: provider(async () => '0xAbC123'), conflict: false } as unknown as EvmWallet
    await expect(signEvmChallenge(wallet, challenge, '0x0')).resolves.toBe('0xAbC123')
  })

  it('refuses an empty signature rather than posting it', async () => {
    const wallet = { key: 'k', provider: provider(async () => ''), conflict: false } as unknown as EvmWallet
    await expect(signEvmChallenge(wallet, challenge, '0x0')).rejects.toThrow(/no signature/i)
  })

  it('maps 4001 to declined and -32002 to a request already open', async () => {
    const declined = { key: 'k', provider: provider(async () => Promise.reject({ code: 4001 })), conflict: false }
    const pending = { key: 'k', provider: provider(async () => Promise.reject({ code: -32002 })), conflict: false }
    await expect(signEvmChallenge(declined as unknown as EvmWallet, challenge, '0x0')).rejects.toBeInstanceOf(WalletDeclinedError)
    await expect(signEvmChallenge(pending as unknown as EvmWallet, challenge, '0x0')).rejects.toBeInstanceOf(WalletRequestPendingError)
  })

  it('passes other wallet errors through unchanged', async () => {
    const boom = { code: -32603, message: 'internal' }
    const wallet = { key: 'k', provider: provider(async () => Promise.reject(boom)), conflict: false }
    await expect(signEvmChallenge(wallet as unknown as EvmWallet, challenge, '0x0')).rejects.toBe(boom)
  })
})

describe('connectEvmWallet', () => {
  it('asks for accounts and returns the first as given', async () => {
    const p = provider(async () => ['0xe623ed51dbe14e054b9595079c50f1a41feae2c1'])
    const wallet = { key: 'k', provider: p, conflict: false } as unknown as EvmWallet
    await expect(connectEvmWallet(wallet)).resolves.toBe('0xe623ed51dbe14e054b9595079c50f1a41feae2c1')
    expect(p.request).toHaveBeenCalledWith({ method: 'eth_requestAccounts', params: [] })
  })

  it('refuses an empty or malformed account list', async () => {
    for (const res of [[], ['nope'], null]) {
      const wallet = { key: 'k', provider: provider(async () => res), conflict: false } as unknown as EvmWallet
      await expect(connectEvmWallet(wallet)).rejects.toThrow(/no usable account/i)
    }
  })

  it('maps a declined connection', async () => {
    const wallet = { key: 'k', provider: provider(async () => Promise.reject({ code: 4001 })), conflict: false }
    await expect(connectEvmWallet(wallet as unknown as EvmWallet)).rejects.toBeInstanceOf(WalletDeclinedError)
  })
})

describe('watchEvmWallets', () => {
  it('asks wallets to announce when watching starts', () => {
    const seen = vi.fn()
    window.addEventListener('eip6963:requestProvider', seen)
    const w = watch()
    window.removeEventListener('eip6963:requestProvider', seen)
    w.stop()
    expect(seen).toHaveBeenCalledTimes(1)
  })

  it('lists wallets in announcement order, keyed by rdns', () => {
    const w = watch()
    announce(info('io.example.b', 'u-b', 'Wallet'))
    announce(info('io.example.a', 'u-a', 'Wallet'))
    // Same name, different rdns: two rows. The name is not an identifier.
    expect(w.get().map((x) => x.key)).toEqual(['io.example.b', 'io.example.a'])
  })

  // No announcement window: a wallet that answers late still appears.
  it('adds a wallet that announces after watching started', () => {
    const w = watch()
    expect(w.get()).toEqual([])
    announce(info('io.example.late', 'u-late'))
    expect(w.get().map((x) => x.key)).toEqual(['io.example.late'])
  })

  it('updates a wallet that re-announces with the same uuid, without duplicating it', () => {
    const w = watch()
    announce(info('io.example.a', 'u-a', 'Old'))
    announce(info('io.example.b', 'u-b'))
    announce(info('io.example.a', 'u-a', 'New'))
    expect(w.get().map((x) => [x.key, x.name, x.conflict])).toEqual([
      ['io.example.a', 'New', false],
      ['io.example.b', 'io.example.b', false],
    ])
  })

  it('marks an rdns claimed by two uuids as a conflict, and refuses to connect to it', async () => {
    const w = watch()
    announce(info('io.example.a', 'u-1'))
    announce(info('io.example.a', 'u-2'))
    // A later re-announcement from the first does not clear it.
    announce(info('io.example.a', 'u-1'))
    const [row] = w.get()
    expect(w.get()).toHaveLength(1)
    expect(row.conflict).toBe(true)
    await expect(connectEvmWallet(row)).rejects.toBeInstanceOf(WalletConflictError)
    expect((row.provider.request as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled()
  })

  it('ignores announcements without an rdns, a uuid or a provider', () => {
    const w = watch()
    announce({ uuid: 'u', name: 'No rdns' })
    announce({ rdns: 'io.example.x', name: 'No uuid' })
    announce(info('io.example.y', 'u-y'), { notAProvider: true })
    expect(w.get()).toEqual([])
  })

  it('keeps only data:image icons and falls back to rdns for a blank name', () => {
    const w = watch()
    announce({ rdns: 'io.example.a', uuid: 'u-a', name: '  ', icon: 'https://example.com/i.png' })
    expect(w.get()[0]).toMatchObject({ name: 'io.example.a', icon: null })
  })

  it('offers window.ethereum only while nothing has announced', () => {
    ;(window as { ethereum?: unknown }).ethereum = provider()
    const w = watch()
    expect(w.get()).toMatchObject([{ key: 'window.ethereum', legacy: true, name: 'Browser wallet' }])
    announce(info('io.example.a', 'u-a'))
    expect(w.get().map((x) => x.key)).toEqual(['io.example.a'])
  })

  it('stops calling a watcher after it unsubscribes', () => {
    const fn = vi.fn()
    const stop = watchEvmWallets(fn)
    stop()
    fn.mockClear()
    announce(info('io.example.a', 'u-a'))
    expect(fn).not.toHaveBeenCalled()
  })
})
