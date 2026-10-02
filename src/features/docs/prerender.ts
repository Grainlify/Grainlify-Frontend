import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import ReactDOMServer from 'react-dom/server';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Plugin } from 'vite';
import { parseDoc, plainText, type ParsedDoc } from './doc';
import { publishedPages, type PageRef } from './nav';
import { PUBLISHED_VIDEOS, shotUrl } from './media';

// Static HTML for every published docs page, written next to the app at build
// time: dist/docs/index.html and dist/docs/<slug>/index.html.
//
// The app is a single-page app, so without this every docs URL would arrive
// as an empty <div id="root"> titled "Grainlify". Each file here is the app's
// own index.html with the page's title, description, canonical link and
// social tags, and the article as plain HTML inside #root. Search engines and
// link previews read that; a browser runs the app, which replaces it.
//
// Vercel serves these files directly: the filesystem is checked before
// vercel.json rewrites, and /docs/x is answered by docs/x/index.html. A docs
// URL with no file falls through to 404.html with a real 404 status.
//
// Admin pages are never written here. They are published to signed-in admins
// only, and a static file would publish them to everyone.

export const SITE = 'https://grainlify.com';
const HOME_TITLE = 'Grainlify Docs';
const HOME_DESCRIPTION =
  'How to use Grainlify, step by step: finding work, applying for issues, bounties, GrainHack, getting paid, and running a project.';

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The first sentence or two of a page, cut at a word, for the meta description. */
export function describe(body: string, fallback: string): string {
  const intro = plainText(body.split(/\n## /)[0]);
  const text = intro || fallback;
  if (text.length <= 160) return text;
  return text.slice(0, text.lastIndexOf(' ', 157)) + '…';
}

export function articleHtml(body: string): string {
  return ReactDOMServer.renderToStaticMarkup(
    createElement(
      ReactMarkdown,
      {
        remarkPlugins: [remarkGfm],
        urlTransform: (url: string) => (/^(shot|video):/.test(url) ? url : defaultUrlTransform(url)),
        components: {
          img: ({ src = '', alt = '' }: { src?: string; alt?: string }) =>
            src.startsWith('shot:')
              ? createElement('img', { src: shotUrl(src.slice(5).split('?')[0], 'light', 1440), alt, loading: 'lazy' })
              : src.startsWith('video:')
                ? PUBLISHED_VIDEOS.has(src.slice(6)) ? createElement('p', null, `Video: ${alt}`) : null
                : createElement('img', { src, alt }),
        },
      },
      // The callout marker is a rendering instruction, not text.
      body.replace(/\[!(NOTE|WARNING)\]\s*/g, ''),
    ),
  );
}

interface PageOut {
  slug: string;
  title: string;
  description: string;
  content: string;
}

export function pageHtml(template: string, page: PageOut, nav: PageRef[]): string {
  const url = page.slug ? `${SITE}/docs/${page.slug}` : `${SITE}/docs`;
  const title = page.slug ? `${page.title} · ${HOME_TITLE}` : HOME_TITLE;
  const head = [
    `<meta name="description" content="${escapeHtml(page.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="${page.slug ? 'article' : 'website'}" />`,
    `<meta property="og:site_name" content="Grainlify" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta name="twitter:card" content="summary" />`,
    // Hidden once scripts run, so a reader never sees it flash before the app
    // replaces it. Only a client without JavaScript shows it.
    `<script>document.documentElement.classList.add('docs-js')</script>`,
    `<style>.docs-js .docs-static{display:none}</style>`,
  ].join('\n    ');
  const links = nav.map((p) => `<li><a href="/docs/${p.page.slug}">${escapeHtml(p.page.title)}</a></li>`).join('');
  const body = `<div class="docs-static" style="max-width:720px;margin:0 auto;padding:32px 16px;font-family:Inter,system-ui,sans-serif;line-height:1.7">
<nav aria-label="Documentation"><p><a href="/docs">${HOME_TITLE}</a></p><ul>${links}</ul></nav>
<main><article><h1>${escapeHtml(page.slug ? page.title : HOME_TITLE)}</h1>${page.content}</article></main>
</div>`;

  if (!template.includes('<div id="root"></div>')) throw new Error('docs prerender: <div id="root"></div> not found in index.html');
  // The home page's own description and preview tags. Left in, a docs page
  // would carry two descriptions, two og:titles and the home canonical link,
  // and a crawler would take whichever it read first.
  const HOME_META = /[ \t]*<!-- home-meta:[\s\S]*?<!-- \/home-meta -->\n?/;
  if (template.includes('<!-- home-meta:') && !HOME_META.test(template)) throw new Error('docs prerender: unterminated home-meta block in index.html');
  template = template.replace(HOME_META, '');
  if (!/<title>[^<]*<\/title>/.test(template)) throw new Error('docs prerender: <title> not found in index.html');
  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>\n    ${head}`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

function readContent(dir: string): Record<string, ParsedDoc> {
  const out: Record<string, ParsedDoc> = {};
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = path.join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.md')) out[path.relative(dir, full).replace(/\\/g, '/').replace(/\.md$/, '')] = parseDoc(readFileSync(full, 'utf8'));
    }
  };
  walk(dir);
  return out;
}

export function docsPrerender(contentDir: string): Plugin {
  return {
    name: 'docs-prerender',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (!index || index.type !== 'asset') throw new Error('docs prerender: index.html missing from the bundle');
      const template = String(index.source);
      const docs = readContent(contentDir);
      const pages = publishedPages(new Set(Object.keys(docs)), false);

      const outputs: PageOut[] = [
        {
          slug: '',
          title: HOME_TITLE,
          description: HOME_DESCRIPTION,
          content: `<p>${escapeHtml(HOME_DESCRIPTION)}</p>`,
        },
        ...pages.map(({ page }) => ({
          slug: page.slug,
          title: page.title,
          description: describe(docs[page.slug].body, page.summary),
          content: articleHtml(docs[page.slug].body),
        })),
      ];
      for (const page of outputs) {
        this.emitFile({
          type: 'asset',
          fileName: page.slug ? `docs/${page.slug}/index.html` : 'docs/index.html',
          source: pageHtml(template, page, pages),
        });
      }

      // The sitemap, from the same list of published pages, so it cannot name
      // a docs page that was not written or miss one that was.
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: sitemapXml(pages.map(({ page }) => ({ slug: page.slug, updated: docs[page.slug].updated }))),
      });
    },
  };
}

/**
 * The public, signed-out pages that are worth a search result. The rest of
 * the app is behind sign-in (/dashboard and the /bounties aliases into it),
 * or is a sign-in step itself.
 */
export const PUBLIC_APP_ROUTES = ['/', '/bounties/rules', '/support'];

export function sitemapXml(docsPages: { slug: string; updated?: string | null }[]): string {
  const url = (loc: string, lastmod?: string | null) =>
    `  <url><loc>${escapeHtml(`${SITE}${loc}`)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
  const newest = docsPages.map((p) => p.updated ?? '').sort().pop() || null;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...PUBLIC_APP_ROUTES.map((r) => url(r)),
    url('/docs', newest),
    ...docsPages.map((p) => url(`/docs/${p.slug}`, p.updated)),
    '</urlset>',
    '',
  ].join('\n');
}
