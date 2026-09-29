// The maintainer world for the videos that add a repository (maintainers,
// maintainers__add-repositories): owen-maintains with tidewater-labs/harbor-bridge
// just installed and waiting for setup. Saving the setup form lists it: the
// pending list empties and the selector shows Edit instead of Complete setup.

import { world, PENDING_PROJECT } from '../../world/index.mjs'
import { cursor, perPage, setupDone } from './_paced.mjs'

export function setupWorld() {
  const w = world('maintainer')
  // A new repository: no description or ecosystem chosen yet.
  const fresh = { ...PENDING_PROJECT, description: '', ecosystem_id: null, ecosystem_name: '' }
  const stateOf = perPage(() => ({ saved: null }))
  const mine = w.api['/projects/mine']
  const api = {
    ...w.api,
    '/projects/pending-setup': (req) => (stateOf(req).saved ? [] : [fresh]),
    '/projects/mine': (req) => {
      const { saved } = stateOf(req)
      return mine.map((p) => (p.id === PENDING_PROJECT.id ? (saved ? { ...p, ...saved, needs_metadata: false } : { ...p, description: '', ecosystem_name: '' }) : p))
    },
    [`PUT /projects/${PENDING_PROJECT.id}/metadata`]: (req) => {
      const body = req.postDataJSON() ?? {}
      stateOf(req).saved = { description: body.description ?? '', ecosystem_name: body.ecosystem_name ?? '', tags: body.tags ?? [], category: body.category ?? '' }
      return { ok: true }
    },
  }
  return { ...w, api, init: [...w.init, setupDone, cursor] }
}
