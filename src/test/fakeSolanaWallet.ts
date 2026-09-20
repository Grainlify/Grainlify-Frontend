// A Wallet Standard wallet for tests, registered through the real registry
// (@wallet-standard/app) exactly as an extension registers itself.

import { getWallets } from '@wallet-standard/app'
import type { Wallet, WalletAccount } from '@wallet-standard/base'

export interface FakeWalletOptions {
  name: string
  address?: string
  chains?: `${string}:${string}`[]
  connect?: () => Promise<void>
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>
  noSignMessage?: boolean
}

export function registerFakeWallet(o: FakeWalletOptions) {
  const address = o.address ?? 'H4AbmvyPav1oLUgcKGQUpsSdk1Uh7EkYLQX7qHJdUCmu'
  const account: WalletAccount = { address, publicKey: new Uint8Array(32), chains: ['solana:devnet'], features: ['solana:signMessage'] }
  const signed: string[] = []
  const features: Record<string, unknown> = {
    'standard:connect': {
      version: '1.0.0',
      connect: async () => {
        await o.connect?.()
        return { accounts: [account] }
      },
    },
  }
  if (!o.noSignMessage) {
    features['solana:signMessage'] = {
      version: '1.0.0',
      signMessage: async ({ message }: { message: Uint8Array }) => {
        signed.push(new TextDecoder().decode(message))
        const signature = o.signMessage ? await o.signMessage(message) : new Uint8Array(64).fill(7)
        return [{ signedMessage: message, signature }]
      },
    }
  }
  const wallet = {
    version: '1.0.0',
    name: o.name,
    icon: 'data:image/svg+xml;base64,PHN2Zy8+',
    chains: o.chains ?? ['solana:mainnet', 'solana:devnet'],
    accounts: [],
    features,
  } as unknown as Wallet
  const unregister = getWallets().register(wallet)
  return { unregister, signed, address }
}
