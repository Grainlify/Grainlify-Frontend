// Where the docs' screenshots and videos are served from: Vercel Blob, put
// there by capture/publish.mjs. The version folder lets the files be cached
// for a year; to replace live media, bump it and publish everything again.
export const MEDIA_BASE = 'https://ems7boh8wuvmewtu.public.blob.vercel-storage.com/docs-media/v1';

// Videos that have narration and are on Blob. A page may embed a video before
// it is made; the player shows nothing until its slug is listed here.
//
// Withdrawn on 2 Oct 2026 because their narration on Blob says something
// untrue, until they are re-narrated from the corrected scripts in
// capture/video/scripts:
//   welcome                     "Bounties are funded by creator fees from the GRAIN token"
//   contributors/bounty-ledger  "posted, priced, ..." and "Here are the payouts from the last thirty days"
export const PUBLISHED_VIDEOS: ReadonlySet<string> = new Set([
  'create-your-account',
  'contributors/browse',
  'contributors/applying-to-issues',
  'contributors/link-solana-wallet',
  'contributors/apply-for-a-bounty',
  'contributors/bounty-payment',
  'maintainers',
]);

export const shotUrl = (id: string, theme: 'light' | 'dark', width: 1440 | 390) => `${MEDIA_BASE}/shots/${id}.${theme}.${width}.webp`;
export const videoUrl = (slug: string, theme: 'light' | 'dark', ext: 'mp4' | 'vtt' | 'poster.webp') =>
  `${MEDIA_BASE}/videos/${slug.replace(/\//g, '__')}.${theme}.${ext}`;
