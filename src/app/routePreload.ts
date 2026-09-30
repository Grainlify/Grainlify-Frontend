/**
 * Build step: start the first page's code downloading alongside the entry
 * script, instead of after it.
 *
 * Every page but the landing page is a lazy chunk, and a lazy chunk is only
 * requested once the entry script has downloaded, parsed and run. On a slow
 * phone connection that is one more round trip - 562 ms of latency at the
 * least - between the entry script and anything the visitor came for, on
 * sign-in, the dashboard, the wallet page and the docs alike.
 *
 * This writes a few lines into index.html that look at the address before
 * any script loads and add <link rel="modulepreload"> for that page's chunks.
 * The chunk names are hashed, so the table is built from the real bundle at
 * build time; a module that no longer produces a chunk fails the build rather
 * than quietly preloading nothing.
 */
import path from 'path'
import type { Plugin, Rollup } from 'vite'

type OutputChunk = Rollup.OutputChunk

export interface PreloadRoute {
  /** Tested against location.pathname + location.search. First match wins. */
  match: RegExp
  /** Source modules whose chunks, and those chunks' imports, the page needs. */
  modules: string[]
  /**
   * For pages behind sign-in: what a visitor with no session needs instead,
   * since they are about to be sent to /signin. Preloading the dashboard for
   * them would only compete with the page they will actually see.
   */
  signedOutModules?: string[]
}

export function routePreload(root: string, routes: PreloadRoute[]): Plugin {
  return {
    name: 'route-preload',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle
        if (!bundle) return html
        const chunks = Object.values(bundle).filter((c): c is OutputChunk => c.type === 'chunk')
        const entry = chunks.find((c) => c.isEntry)
        // What the entry already pulls in statically is preloaded by Vite.
        const alreadyLoading = new Set<string>([entry?.fileName ?? '', ...(entry?.imports ?? [])])

        const filesFor = (modules: string[]) => {
          const files = new Set<string>()
          const add = (chunk: OutputChunk) => {
            if (alreadyLoading.has(chunk.fileName) || files.has(chunk.fileName)) return
            files.add(chunk.fileName)
            for (const imported of chunk.imports) {
              const dep = bundle[imported]
              if (dep && dep.type === 'chunk') add(dep)
            }
          }
          for (const mod of modules) {
            const id = path.resolve(root, mod)
            // Its own chunk if it has one; a pure re-export (an index.ts) is
            // merged into the chunk of what it re-exports.
            const chunk =
              chunks.find((c) => c.facadeModuleId === id) ??
              chunks.find((c) => !c.isEntry && c.moduleIds.includes(id))
            if (!chunk) throw new Error(`route-preload: ${mod} is not in any lazy chunk`)
            add(chunk)
          }
          return [...files].map((f) => '/' + f)
        }
        const table = routes.map((route) => [
          route.match.source,
          filesFor(route.modules),
          route.signedOutModules ? filesFor(route.signedOutModules) : null,
        ])

        // Same session check as the app's: a token in storage. Storage that
        // throws (some private modes) counts as signed out.
        const script =
          `<script>(function(){var t=${JSON.stringify(table)},p=location.pathname+location.search,s=false;` +
          `try{s=!!localStorage.getItem('patchwork_jwt')}catch(e){}` +
          `for(var i=0;i<t.length;i++){if(new RegExp(t[i][0]).test(p)){(t[i][2]&&!s?t[i][2]:t[i][1]).forEach(function(h){` +
          `var l=document.createElement('link');l.rel='modulepreload';l.crossOrigin='';l.href=h;document.head.appendChild(l)});break}}})()</script>`
        // Before the entry script, so both start together.
        const at = html.indexOf('<script type="module"')
        if (at === -1) throw new Error('route-preload: no module script in index.html')
        return html.slice(0, at) + script + '\n    ' + html.slice(at)
      },
    },
  }
}
