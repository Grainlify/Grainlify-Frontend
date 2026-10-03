import { describe, it, expect } from 'vitest'
import { explorerName, isTestNetwork, networkLabel, shortTx, txExplorerUrl } from './payoutNetwork'

describe('payoutNetwork', () => {
  it('names each network, and an unknown one verbatim', () => {
    expect(networkLabel('solana-devnet')).toBe('Solana devnet')
    expect(networkLabel('solana-mainnet')).toBe('Solana mainnet')
    expect(networkLabel('base-sepolia')).toBe('Base Sepolia testnet')
    expect(networkLabel('aptos-testnet')).toBe('aptos-testnet')
    expect(networkLabel(null)).toBe('Unknown network')
  })

  it('treats everything but the two mainnets as test, unknown networks included', () => {
    expect(isTestNetwork('solana-mainnet')).toBe(false)
    expect(isTestNetwork('base')).toBe(false)
    expect(isTestNetwork('solana-devnet')).toBe(true)
    expect(isTestNetwork('base-sepolia')).toBe(true)
    expect(isTestNetwork('something-new')).toBe(true)
  })

  it('links each network to its explorer', () => {
    expect(txExplorerUrl('solana-mainnet', 'abc')).toBe('https://explorer.solana.com/tx/abc')
    expect(txExplorerUrl('solana-devnet', 'abc')).toBe('https://explorer.solana.com/tx/abc?cluster=devnet')
    expect(txExplorerUrl('base-sepolia', '0x12')).toBe('https://sepolia.basescan.org/tx/0x12')
    expect(txExplorerUrl('base', '0x12')).toBe('https://basescan.org/tx/0x12')
    expect(txExplorerUrl('aptos-testnet', '0x12')).toBeNull()
    expect(txExplorerUrl('solana-devnet', null)).toBeNull()
    expect(explorerName('base-sepolia')).toBe('Basescan')
    expect(explorerName('solana-devnet')).toBe('Solana Explorer')
  })

  it('shortens long signatures only', () => {
    expect(shortTx('5hK2abcdefghijklmnopqrstuvwxyz')).toBe('5hK2ab…wxyz')
    expect(shortTx('0x1234')).toBe('0x1234')
  })
})
