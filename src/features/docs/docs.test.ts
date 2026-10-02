import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { parseDoc, formatUpdated, headingsOf, plainText } from './doc';
import { buildSearchIndex, search, markMatches, snippetAround, tokenize, type SearchEntry } from './search';
import { DOCS_NAV, findPage, publishedNav, publishedPages } from './nav';
import { searchEntries } from './entries';
import { articleHtml, describe as describePage, pageHtml, sitemapXml, PUBLIC_APP_ROUTES } from './prerender';
import { MEDIA_BASE, PUBLISHED_VIDEOS } from './media';
import published from './capture/published.json';

const CONTENT = path.join(__dirname, 'content');
const SHOTS = new Set(published.shots);

function contentFiles(dir = CONTENT): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? contentFiles(full) : name.endsWith('.md') ? [full] : [];
  });
}
const slugOf = (file: string) => path.relative(CONTENT, file).replace(/\\/g, '/').replace(/\.md$/, '');
const docs = Object.fromEntries(contentFiles().map((f) => [slugOf(f), parseDoc(readFileSync(f, 'utf8'))]));
const available = new Set(Object.keys(docs));

describe('parsing a page', () => {
  it('reads the updated date and strips the front matter', () => {
    const d = parseDoc('---\nupdated: 2026-09-27\n---\n\nHello.\n\n## Part one\nText');
    expect(d.updated).toBe('2026-09-27');
    expect(d.body.startsWith('Hello.')).toBe(true);
    expect(headingsOf(d.body)).toEqual([{ text: 'Part one', id: 'part-one' }]);
  });

  it('formats the date without a timezone moving the day', () => {
    expect(formatUpdated('2026-09-01')).toBe('1 September 2026');
  });

  it('reduces Markdown to readable text', () => {
    expect(plainText('**Bold** [link](/x) ![img](shot:a)\n> [!NOTE]\n> Careful')).toBe('Bold link Careful');
  });
});

describe('search', () => {
  const entries: SearchEntry[] = [
    { kind: 'page', title: 'Link your Solana wallet', page: 'Link your Solana wallet', section: 'Contributors', text: 'Bounties are paid to the wallet linked to your GitHub account.', href: '/docs/a' },
    { kind: 'heading', title: 'Change your wallet', page: 'Link your Solana wallet', section: 'Contributors', text: 'Link a different wallet the same way.', href: '/docs/a#change' },
    { kind: 'page', title: 'Create your account', page: 'Create your account', section: 'Getting started', text: 'Sign in with GitHub. There is no password.', href: '/docs/b' },
  ];
  const index = buildSearchIndex(entries);

  it('matches whole words, prefixes, and one typo in longer words', () => {
    expect(search(index, 'wallet')[0].href).toBe('/docs/a');
    expect(search(index, 'wall').map((e) => e.href)).toContain('/docs/a');
    expect(search(index, 'walet').map((e) => e.href)).toContain('/docs/a');
    expect(search(index, 'passwrd').map((e) => e.href)).toEqual(['/docs/b']);
  });

  it('needs every word of the query to match', () => {
    expect(search(index, 'wallet password')).toEqual([]);
    expect(search(index, 'github password').map((e) => e.href)).toEqual(['/docs/b']);
  });

  it('ranks a title match above a body match', () => {
    // "account" is in the title of b and only the body of a.
    expect(search(index, 'account').map((e) => e.href)).toEqual(['/docs/b', '/docs/a']);
    // "wallet" is in the titles of a page and one of its sections; the page comes first.
    expect(search(index, 'wallet').slice(0, 2).map((e) => e.href)).toEqual(['/docs/a', '/docs/a#change']);
  });

  it('ignores punctuation and short noise', () => {
    expect(tokenize('Sign-in: a GitHub!')).toEqual(['sign', 'in', 'github']);
    expect(search(index, '  ')).toEqual([]);
  });

  it('marks matches and cuts snippets at word boundaries', () => {
    expect(markMatches('Link your wallet', 'wall').filter((p) => p.match).map((p) => p.text)).toEqual(['wall']);
    const s = snippetAround('one two three four five six seven eight nine ten eleven twelve thirteen fourteen wallet fifteen sixteen seventeen eighteen nineteen twenty twenty-one', 'wallet', 60);
    expect(s.startsWith('…')).toBe(true);
    expect(s).toContain('wallet');
    expect(s.split(' ')[0].replace('…', '')).toMatch(/^[a-z-]+$/);
  });
});

describe('the contents tree', () => {
  it('has a unique slug for every page', () => {
    const slugs = DOCS_NAV.flatMap((s) => [...(s.pages ?? []), ...(s.groups ?? []).flatMap((g) => g.pages)]).map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('lists only written pages, and drops sections left empty', () => {
    const nav = publishedNav(new Set(['welcome']), false);
    expect(nav.map((s) => s.title)).toEqual(['Getting started']);
    expect(nav[0].pages?.map((p) => p.slug)).toEqual(['welcome']);
  });

  it('shows the admin section to admins only', () => {
    const withAdmin = new Set(['welcome', 'admins/bounty-draw']);
    expect(publishedNav(withAdmin, false).some((s) => s.adminOnly)).toBe(false);
    expect(publishedNav(withAdmin, true).some((s) => s.adminOnly)).toBe(true);
  });

  it('keeps admin pages out of a signed-out reader’s search', () => {
    const withAdmin = new Set(['welcome', 'admins/bounty-draw']);
    const fake = { welcome: parseDoc('Hi.'), 'admins/bounty-draw': parseDoc('Run the draw.') };
    expect(searchEntries(publishedPages(withAdmin, false), fake).map((e) => e.href)).toEqual(['/docs/welcome']);
    expect(searchEntries(publishedPages(withAdmin, true), fake).map((e) => e.href)).toContain('/docs/admins/bounty-draw');
  });
});

describe('the pages as written', () => {
  it('every Markdown file has a place in the contents tree', () => {
    const orphans = [...available].filter((slug) => !findPage(slug));
    expect(orphans, 'Add these to nav.ts, or they can never be reached').toEqual([]);
  });

  it('every page has an updated date', () => {
    const undated = Object.entries(docs).filter(([, d]) => !d.updated).map(([slug]) => slug);
    expect(undated).toEqual([]);
  });

  it('every screenshot a page uses is on Blob, in every variant it needs', () => {
    const missing: string[] = [];
    for (const [slug, d] of Object.entries(docs)) {
      for (const [, ref] of d.body.matchAll(/\]\(shot:([^ )]+)/g)) {
        const [id, flag] = ref.split('?');
        const widths = flag === 'desktop' ? [1440] : [1440, 390];
        for (const theme of ['light', 'dark'])
          for (const w of widths) if (!SHOTS.has(`${id}.${theme}.${w}.webp`)) missing.push(`${slug}: ${id}.${theme}.${w}.webp`);
      }
    }
    expect(missing, 'Capture them (capture/run.mjs), then upload them (capture/publish.mjs)').toEqual([]);
  });

  it('every video marked published is on Blob, and its page embeds it', () => {
    expect(published.base).toBe(MEDIA_BASE);
    const embedded = new Set(Object.values(docs).flatMap((d) => [...d.body.matchAll(/\]\(video:([^ )]+)/g)].map((m) => m[1])));
    for (const slug of PUBLISHED_VIDEOS) {
      expect(published.videos, `${slug} is not on Blob: run capture/publish.mjs videos`).toContain(slug);
      expect(embedded.has(slug), `no page embeds video:${slug}`).toBe(true);
    }
  });

  it('every link to another docs page goes to a page its reader can open', () => {
    // A public page may only link to public pages; an admin page is read by an
    // admin, who can open admin pages too.
    const forEveryone = new Set(publishedPages(available, false).map((p) => `/docs/${p.page.slug}`));
    const forAdmins = new Set(publishedPages(available, true).map((p) => `/docs/${p.page.slug}`));
    const broken: string[] = [];
    for (const [slug, d] of Object.entries(docs)) {
      const allowed = findPage(slug)?.section.adminOnly ? forAdmins : forEveryone;
      for (const [, href] of d.body.matchAll(/\]\((\/docs[^ )#]*)/g)) if (href !== '/docs' && !allowed.has(href)) broken.push(`${slug} -> ${href}`);
    }
    expect(broken).toEqual([]);
  });
});

describe('the prerendered HTML', () => {
  const template = '<html><head><title>Grainlify</title></head><body><div id="root"></div></body></html>';
  const nav = publishedPages(available, false);

  it('gives each page its own title, description and canonical link', () => {
    const html = pageHtml(template, { slug: 'welcome', title: 'Welcome to Grainlify', description: 'A "quoted" <description>', content: '<p>Hi</p>' }, nav);
    expect(html).toContain('<title>Welcome to Grainlify · Grainlify Docs</title>');
    expect(html).toContain('<meta name="description" content="A &quot;quoted&quot; &lt;description&gt;" />');
    expect(html).toContain('<link rel="canonical" href="https://grainlify.com/docs/welcome" />');
    expect(html).toContain('<div id="root"><div class="docs-static"');
  });

  it('renders the article, with screenshots and without callout markers', () => {
    const html = articleHtml('Intro.\n\n![Alt](shot:signin "Cap")\n\n> [!NOTE]\n> Careful.');
    expect(html).toContain(`src="${MEDIA_BASE}/shots/signin.light.1440.webp"`);
    expect(html).not.toContain('[!NOTE]');
    expect(html).toContain('Careful.');
  });

  it('cuts a long description at a word', () => {
    const d = describePage('word '.repeat(60), 'fallback');
    expect(d.length).toBeLessThanOrEqual(160);
    expect(d.endsWith('…')).toBe(true);
  });

  it('refuses an index.html it does not recognise, rather than writing a broken page', () => {
    expect(() => pageHtml('<html></html>', { slug: '', title: 't', description: 'd', content: '' }, nav)).toThrow(/root/);
  });

  it("drops the home page's own preview tags, so a docs page carries only its own", () => {
    // The real index.html, which carries the home page's description and
    // Open Graph tags between the home-meta markers.
    const real = readFileSync(path.join(__dirname, '../../../index.html'), 'utf8');
    expect(real).toContain('<!-- home-meta:');
    const html = pageHtml(real, { slug: 'welcome', title: 'Welcome to Grainlify', description: 'Docs description', content: '<p>Hi</p>' }, nav);
    expect(html.match(/<meta name="description"/g)).toHaveLength(1);
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    expect(html).toContain('<link rel="canonical" href="https://grainlify.com/docs/welcome" />');
    expect(html).not.toContain('home-meta');
    expect(html).not.toContain('og-home.png');
  });

  it('refuses an index.html whose home-meta block is not closed', () => {
    const broken = template.replace('</title>', '</title><!-- home-meta: x -->');
    expect(() => pageHtml(broken, { slug: '', title: 't', description: 'd', content: '' }, nav)).toThrow(/home-meta/);
  });
});

describe('the sitemap', () => {
  const pages = publishedPages(available, false).map(({ page }) => ({ slug: page.slug, updated: docs[page.slug].updated }));
  const xml = sitemapXml(pages);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  it('lists the public app routes, the docs home and every public docs page', () => {
    for (const r of PUBLIC_APP_ROUTES) expect(locs).toContain(`https://grainlify.com${r}`);
    expect(locs).toContain('https://grainlify.com/docs');
    for (const p of pages) expect(locs).toContain(`https://grainlify.com/docs/${p.slug}`);
    expect(locs).toHaveLength(PUBLIC_APP_ROUTES.length + 1 + pages.length);
  });

  it('leaves out admin pages and pages that are not written', () => {
    expect(locs.some((l) => l.includes('/docs/admins/'))).toBe(false);
    for (const section of DOCS_NAV) {
      for (const page of [...(section.pages ?? []), ...(section.groups ?? []).flatMap((g) => g.pages)]) {
        if (!available.has(page.slug)) expect(locs).not.toContain(`https://grainlify.com/docs/${page.slug}`);
      }
    }
  });

  it('dates each docs page by its updated line', () => {
    expect(xml).toContain(`<loc>https://grainlify.com/docs/welcome</loc><lastmod>${docs.welcome.updated}</lastmod>`);
  });
});

describe('links into the docs from the rest of the app', () => {
  // Collected from source, so a link is checked the day it is added. The docs
  // moved from docs.grainlify.com to /docs on this site; four links on the
  // support page once 404'd because their paths were guessed, not read.
  const SRC = path.join(__dirname, '../..');
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) return full === __dirname ? [] : files(full);
      return /\.(tsx?)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
    });
  const sources = files(SRC).map((f) => ({ f: path.relative(SRC, f), text: readFileSync(f, 'utf8') }));

  it('never points at the retired docs host', () => {
    const hits = sources.filter(({ text }) => /https?:\/\/docs\.grainlify\.com/.test(text)).map(({ f }) => f);
    expect(hits).toEqual([]);
  });

  it('points only at docs pages a signed-out reader can open', () => {
    const open = new Set(publishedPages(available, false).map((p) => `/docs/${p.page.slug}`));
    const links = sources.flatMap(({ f, text }) =>
      [...text.matchAll(/['"`](\/docs\/[a-z0-9/-]+)/g)].map((m) => ({ f, href: m[1].replace(/\/$/, '') })),
    );
    // Guards against the pattern silently matching nothing.
    expect(links.length).toBeGreaterThanOrEqual(8);
    expect(links.filter(({ href }) => !open.has(href)).map(({ f, href }) => `${f} -> ${href}`)).toEqual([]);
  });
});
