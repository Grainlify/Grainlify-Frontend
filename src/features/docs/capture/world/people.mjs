// Everyone in the fixture world. All invented: no real person's name,
// handle or avatar appears in the docs.

import { avatar, uuidFor } from './util.mjs'

/** The three signed-in viewers the docs are captured as. */
export const personas = {
  contributor: { id: 'u-mira', login: 'mira-dev', role: 'contributor' },
  maintainer: { id: 'u-owen', login: 'owen-maintains', role: 'maintainer' },
  admin: { id: 'u-ada', login: 'ada-admin', role: 'admin' },
}

/** Profile fields behind GET /me for each persona. */
export const meProfiles = {
  contributor: {
    first_name: 'Mira',
    last_name: 'Castellan',
    location: 'Lisbon, Portugal',
    website: 'https://mira.example.dev',
    bio: 'Rust and TypeScript. I like small, well-tested pull requests and docs that stay true.',
    telegram: 'mira_dev',
    linkedin: 'https://www.linkedin.example/in/mira-castellan',
    twitter: 'mira_codes',
    discord: 'mira.dev',
    whatsapp: '',
    github: { name: 'Mira Castellan', email: 'mira@mira.example.dev', location: 'Lisbon, Portugal', bio: 'Rust and TypeScript, mostly payments tooling.', website: 'https://mira.example.dev' },
  },
  maintainer: {
    first_name: 'Owen',
    last_name: 'Hartley',
    location: 'Bristol, UK',
    website: 'https://tidewater.example',
    bio: 'Maintainer of ledgerline and tide-sdk at Tidewater Labs.',
    telegram: 'owen_tides',
    linkedin: '',
    twitter: 'owen_maintains',
    discord: 'owen.h',
    whatsapp: '',
    github: { name: 'Owen Hartley', email: 'owen@tidewater.example', location: 'Bristol, UK', bio: 'Payment channels, append-only logs.', website: 'https://tidewater.example' },
  },
  admin: {
    first_name: 'Ada',
    last_name: 'Quill',
    location: 'Remote',
    website: '',
    bio: 'Grainlify operations.',
    telegram: '',
    linkedin: '',
    twitter: '',
    discord: '',
    whatsapp: '',
    github: { name: 'Ada Quill', email: 'ada@grainlify.example', location: 'Remote', bio: '', website: '' },
  },
}

/** GET /me for a persona. */
export function me(key) {
  const p = personas[key]
  const m = meProfiles[key]
  return {
    id: p.id,
    role: p.role,
    first_name: m.first_name,
    last_name: m.last_name,
    location: m.location,
    website: m.website,
    bio: m.bio,
    avatar_url: avatar(p.login),
    telegram: m.telegram,
    linkedin: m.linkedin,
    whatsapp: m.whatsapp,
    twitter: m.twitter,
    discord: m.discord,
    github: { login: p.login, avatar_url: avatar(p.login), ...m.github },
  }
}

/** Other contributors who appear in lists, applications and leaderboards. */
const OTHER_LOGINS = [
  'jun-okafor', 'priya-kern', 'tomas-rivet', 'lena-marsh', 'kofi-ade', 'noor-writes', 'felix-quay', 'ines-byte',
  'dara-loop', 'arun-patch', 'yuki-tern', 'bram-oster', 'sol-mendes', 'hana-grid', 'ravi-forge', 'elif-stack',
  'mateo-rook', 'zoe-lattice', 'ike-nwosu', 'wren-codes',
]

export const users = Object.fromEntries(
  [
    ...Object.values(personas).map((p) => [p.login, { login: p.login, user_id: p.id, avatar_url: avatar(p.login) }]),
    ...OTHER_LOGINS.map((login) => [login, { login, user_id: uuidFor('user:' + login), avatar_url: avatar(login) }]),
  ],
)

export const others = OTHER_LOGINS
