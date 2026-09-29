// The pilot pages' screenshots: Welcome, Create your account, Link your Solana wallet.

import { discoverApi, personas, phantomWallet, walletLinkApi } from '../fixtures.mjs'

/** The rectangle around an element, with room around it. */
export const around = (selector, padX = 112, padY = 56) => async (page) => {
  const b = await page.locator(selector).first().boundingBox()
  return { x: Math.max(0, b.x - padX), y: Math.max(0, b.y - padY), width: b.width + padX * 2, height: b.height + padY * 2 }
}

export const SHOTS = [
  {
    id: 'landing-hero',
    page: 'welcome',
    url: '/',
    api: discoverApi,
    ready: (page) => page.getByRole('heading', { level: 1 }).first(),
    // The top of the home page: headline and buttons, stopping above the
    // product image (it shows a Base Sepolia event, which the docs leave out)
    // and the live statistics (a fixture's number is not a real one).
    frame: async (page, width) => {
      const image = await page.locator('img[src*="grainhack-event"]').first().boundingBox()
      const bottom = image ? image.y - (width === 390 ? 20 : 28) : VIEW[width].height
      return { x: 0, y: 0, width: VIEW[width].width, height: Math.min(bottom, VIEW[width].height) }
    },
  },
  {
    id: 'signin',
    page: 'create-your-account',
    url: '/signin',
    ready: (page) => page.getByRole('button', { name: /Sign in with GitHub/ }),
    frame: (page, width) => (width === 390 ? 'viewport' : around('div.max-w-md')(page)),
  },
  {
    id: 'tour-welcome',
    page: 'create-your-account',
    url: '/dashboard',
    persona: personas.contributor,
    api: discoverApi,
    // The tour shows once, and on a computer only, so there is no phone variant.
    tour: true,
    widths: [1440],
    ready: (page) => page.getByText(`Welcome to Grainlify, ${personas.contributor.login}!`),
    frame: around('div.rounded-\\[20px\\]:has(button:text("Skip tour"))', 40, 32),
  },
  {
    id: 'walletlink-connect',
    page: 'contributors/link-solana-wallet',
    url: '/bounties/link',
    persona: personas.contributor,
    api: walletLinkApi,
    init: [phantomWallet()],
    ready: (page) => page.getByRole('heading', { name: 'Link a wallet to get paid' }),
    frame: (page, width) => (width === 390 ? 'viewport' : around('div.max-w-md')(page)),
  },
  {
    id: 'walletlink-sign',
    page: 'contributors/link-solana-wallet',
    url: '/bounties/link',
    persona: personas.contributor,
    api: walletLinkApi,
    init: [phantomWallet()],
    steps: async (page) => {
      await page.getByRole('heading', { name: 'Link a wallet to get paid' }).waitFor()
      await page.getByRole('button', { name: /Phantom/ }).click()
    },
    ready: (page) => page.getByRole('heading', { name: 'Sign to confirm' }),
    frame: (page, width) => (width === 390 ? 'viewport' : around('div.max-w-md')(page)),
  },
  {
    id: 'walletlink-linked',
    page: 'contributors/link-solana-wallet',
    url: '/bounties/link',
    persona: personas.contributor,
    api: walletLinkApi,
    init: [phantomWallet()],
    steps: async (page) => {
      await page.getByRole('heading', { name: 'Link a wallet to get paid' }).waitFor()
      await page.getByRole('button', { name: /Phantom/ }).click()
      await page.getByRole('button', { name: 'Sign message' }).click()
    },
    ready: (page) => page.getByRole('heading', { name: 'Wallet linked' }),
    frame: (page, width) => (width === 390 ? 'viewport' : around('div.max-w-md')(page)),
  },
]

const VIEW = { 1440: { width: 1440, height: 900 }, 390: { width: 390, height: 844 } }
