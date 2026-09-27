import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronRight, GitPullRequest, Search, Users, Wallet } from 'lucide-react';
import { GlassCard } from '../../../shared/components/ui/aceternity/GlassCard';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { DocsSidebar } from '../components/DocsSidebar';
import { DocsSearch } from '../components/DocsSearch';
import { DocsMarkdown } from '../components/DocsMarkdown';
import { DocsShell, SHELL } from '../components/DocsShell';
import { publishedNav, publishedPages, type DocPage } from '../nav';
import { AVAILABLE, DOCS } from '../content';
import { formatUpdated, headingsOf } from '../doc';
import { searchEntries } from '../entries';
import { buildSearchIndex } from '../search';
import '../docs.css';

// /docs and /docs/*, public. Laid out on the dashboard's measurements (see
// DocsShell); the article sits on a solid GlassCard: Tier C in
// docs/design-system.md, so nothing sits behind text people read and nothing
// animates. Each page is also prerendered to static HTML at build
// time (../prerender.ts); this component replaces it once the app loads.

export const DOCS_HOME_TITLE = 'Grainlify Docs';

function useIsMac() {
  return useMemo(() => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform), []);
}

export function DocsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  const slug = (useParams()['*'] ?? '').replace(/\/+$/, '');
  const { hash } = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMac = useIsMac();

  const sections = useMemo(() => publishedNav(AVAILABLE, isAdmin), [isAdmin]);
  const pages = useMemo(() => publishedPages(AVAILABLE, isAdmin), [isAdmin]);
  const index = useMemo(() => buildSearchIndex(searchEntries(pages, DOCS)), [pages]);
  const at = pages.findIndex((p) => p.page.slug === slug);
  const entry = at >= 0 ? pages[at] : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // A new page starts at the top, unless the link named a section.
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [slug, hash]);

  // The tab title follows the page, and goes back to the app's own on the way out.
  useEffect(() => {
    document.title = slug === '' ? DOCS_HOME_TITLE : entry ? `${entry.page.title} · ${DOCS_HOME_TITLE}` : `Page not found · ${DOCS_HOME_TITLE}`;
  }, [slug, entry]);
  useEffect(() => () => void (document.title = 'Grainlify'), []);

  const kbd = `rounded-[6px] border px-1.5 py-0.5 text-[11px] font-semibold ${isDark ? 'border-white/20 text-[#b8a898]' : 'border-black/15 text-[#4a4038]'}`;

  return (
    <DocsShell
      drawerOpen={drawerOpen}
      onDrawer={setDrawerOpen}
      onSearch={() => setSearchOpen(true)}
      sidebar={(onNavigate) => <DocsSidebar key={slug} sections={sections} slug={slug} onNavigate={onNavigate} />}
    >
      <main>
        {slug === '' ? (
          <DocsHome isDark={isDark} onSearch={() => setSearchOpen(true)} kbd={kbd} isMac={isMac} start={pages.slice(0, 6).map((p) => p.page)} />
        ) : entry ? (
          <Article
            isDark={isDark}
            title={entry.page.title}
            trail={[entry.section.title, entry.group?.title].filter(Boolean) as string[]}
            body={DOCS[entry.page.slug].body}
            updated={DOCS[entry.page.slug].updated}
            prev={pages[at - 1]?.page}
            next={pages[at + 1]?.page}
          />
        ) : (
          <GlassCard className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-[28px] font-bold text-[var(--brand-ink)]">This page doesn't exist yet</h1>
            <p className="mt-3 max-w-[60ch] text-[16px] leading-[1.7] text-[var(--brand-ink-muted)]">
              It may still be being written. Search the docs, or pick a page from the contents.
            </p>
            <Link to="/docs" className="mt-5 inline-block font-semibold text-[var(--brand-gold-text)] underline underline-offset-2">
              Go to the docs home
            </Link>
          </GlassCard>
        )}
      </main>
      <DocsSearch open={searchOpen} onClose={() => setSearchOpen(false)} index={index} />
    </DocsShell>
  );
}

function Article({
  isDark,
  title,
  trail,
  body,
  updated,
  prev,
  next,
}: {
  isDark: boolean;
  title: string;
  trail: string[];
  body: string;
  updated: string | null;
  prev?: DocPage;
  next?: DocPage;
}) {
  const headings = useMemo(() => headingsOf(body), [body]);
  const [active, setActive] = useState(headings[0]?.id ?? '');

  // "On this page" follows the reader: the section nearest the top is current.
  useEffect(() => {
    if (!headings.length || typeof IntersectionObserver === 'undefined') return;
    const els = headings.map((h) => document.getElementById(h.id)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (ents) => {
        const vis = ents.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive((vis.target as HTMLElement).id);
      },
      { rootMargin: '-100px 0px -65% 0px' },
    );
    els.forEach((el) => io.observe(el));
    // A short last section never reaches the top band, so at the very bottom
    // of the page the last heading is the current one.
    const onScroll = () => {
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) setActive(headings[headings.length - 1].id);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [headings]);

  const heading = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';

  const toc = (
    <ul className="flex flex-col border-l border-[var(--brand-surface-border)]">
      {headings.map((h) => {
        const on = h.id === active;
        return (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={() => setActive(h.id)}
              aria-current={on ? 'location' : undefined}
              className={`-ml-px block border-l-2 py-1.5 pl-3 text-[13.5px] leading-[1.4] transition-colors ${
                on ? 'border-[#c9983a] font-semibold text-[var(--brand-gold-text)]' : 'border-transparent text-[var(--brand-ink-muted)] hover:text-[var(--brand-ink)]'
              }`}
            >
              {h.text}
            </a>
          </li>
        );
      })}
    </ul>
  );

  return (
    <GlassCard as="article" className="p-4 sm:p-6 lg:p-8">
      <div className="xl:flex xl:gap-12">
        <div className="min-w-0 flex-1 max-w-[760px]">
          <header className="mb-8">
            <nav aria-label="Breadcrumb" className={`mb-4 flex flex-wrap items-center gap-1.5 text-[13px] font-medium ${muted}`}>
              {trail.map((t, i) => (
                <span key={t} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />}
                  {t}
                </span>
              ))}
            </nav>
            <h1 className={`text-[30px] md:text-[40px] font-bold leading-[1.15] tracking-[-0.01em] text-balance ${heading}`}>{title}</h1>
            <div className="h-[3px] w-24 mt-5 bg-gradient-to-r from-[#c9983a] via-[#d4af37] to-transparent rounded-full" />
            {updated && <p className={`mt-4 text-[13px] ${muted}`}>Updated {formatUpdated(updated)}</p>}
            {headings.length > 1 && (
              <details className="xl:hidden mt-5 rounded-[16px] border border-[var(--brand-surface-border)] px-4 py-3">
                <summary className={`cursor-pointer text-[14px] font-semibold ${heading}`}>On this page</summary>
                <div className="mt-3">{toc}</div>
              </details>
            )}
          </header>

          <DocsMarkdown source={body} />

          <p className={`mt-10 border-t border-[var(--brand-surface-border)] pt-5 text-[13.5px] ${muted}`}>
            Something on this page wrong or unclear?{' '}
            <Link to="/support" className="font-semibold text-[var(--brand-gold-text)] underline underline-offset-2">
              Tell us
            </Link>
            .
          </p>

          {(prev || next) && (
            <nav aria-label="Previous and next page" className="mt-6 grid gap-4 sm:grid-cols-2">
              {prev ? <PrevNext dir="prev" page={prev} /> : <span className="hidden sm:block" />}
              {next && <PrevNext dir="next" page={next} />}
            </nav>
          )}
        </div>

        {headings.length > 1 && (
          <aside className="hidden xl:block w-[200px] shrink-0">
            {/* Fixed, not sticky: App.tsx wraps every route in overflow-x-hidden,
                which makes that wrapper the scroll container a sticky element
                sticks to, and it never scrolls. A fixed element with no left
                offset keeps its place in the column. */}
            <div className={`fixed ${SHELL.fixedTop} w-[200px] max-h-[calc(100vh-92px)] overflow-y-auto pt-8`}>
              <p className="mb-3 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--brand-gold-text-deep)]">On this page</p>
              {toc}
            </div>
          </aside>
        )}
      </div>
    </GlassCard>
  );
}

function PrevNext({ dir, page }: { dir: 'prev' | 'next'; page: DocPage }) {
  const Icon = dir === 'prev' ? ArrowLeft : ArrowRight;
  return (
    <Link
      to={`/docs/${page.slug}`}
      rel={dir}
      className={`group flex items-center gap-3 rounded-[16px] border p-4 transition-colors hover:border-[#c9983a]/60 bg-[var(--brand-surface)] border-[var(--brand-surface-border)] ${
        dir === 'next' ? 'flex-row-reverse text-right' : ''
      }`}
    >
      <Icon className="w-5 h-5 shrink-0 text-[var(--brand-gold-text)]" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-[12px] font-medium text-[var(--brand-ink-muted)]">{dir === 'prev' ? 'Previous' : 'Next'}</span>
        <span className="block text-[15px] font-semibold text-[var(--brand-ink)] group-hover:underline underline-offset-2">{page.title}</span>
      </span>
    </Link>
  );
}

// The three ways in. Shown only once all three pages are published: a card
// that leads to "this page doesn't exist yet" is worse than no card.
const PATHS = [
  { icon: Users, title: 'Contribute to open source', body: 'Find an issue, apply, get assigned, and get your pull request merged.', slug: 'contributors/discover' },
  { icon: Wallet, title: 'Get paid for your work', body: 'Link a wallet, win a bounty, and follow a payout from merge to your address.', slug: 'contributors/link-solana-wallet' },
  { icon: GitPullRequest, title: 'Bring your project', body: 'Install the GitHub App, set up your project, and review applications.', slug: 'maintainers' },
];

function DocsHome({
  isDark,
  onSearch,
  kbd,
  isMac,
  start,
}: {
  isDark: boolean;
  onSearch: () => void;
  kbd: string;
  isMac: boolean;
  start: DocPage[];
}) {
  const heading = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const body = isDark ? 'text-[#ddd6ca]' : 'text-[#4a4034]';
  return (
    <div className="flex flex-col gap-6">
      <GlassCard className="p-4 sm:p-6 lg:p-8">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--brand-gold-text-deep)]">Grainlify Docs</p>
        <h1 className={`mt-3 text-[30px] md:text-[40px] font-bold leading-[1.15] tracking-[-0.01em] text-balance ${heading}`}>
          How to use Grainlify, step by step
        </h1>
        <p className={`mt-4 max-w-[60ch] text-[16px] leading-[1.75] ${body}`}>
          Grainlify pays people to work on open source. These pages walk through each part of it as it works today, with screenshots of
          the real screens.
        </p>
        <button
          type="button"
          onClick={onSearch}
          className={`mt-6 flex w-full max-w-[520px] items-center gap-3 rounded-full border px-5 py-3 text-left ${
            isDark ? 'bg-white/[0.06] border-white/12 text-[#c6b9a8]' : 'bg-white/[0.25] border-white/30 text-[#6f6152]'
          }`}
        >
          <Search className="w-5 h-5" aria-hidden="true" />
          <span className="flex-1 text-[15px] font-medium">Search the docs</span>
          <span className={`hidden sm:inline ${kbd}`}>{isMac ? '⌘' : 'Ctrl'} K</span>
        </button>
      </GlassCard>

      {PATHS.every((p) => AVAILABLE.has(p.slug)) && (
        <div className="grid gap-4 md:grid-cols-3">
          {PATHS.map(({ icon: Icon, title, body: text, slug }) => (
            <Link key={slug} to={`/docs/${slug}`} className="group">
              <GlassCard className="h-full p-6">
                <span className={`inline-flex size-11 items-center justify-center rounded-[12px] bg-[#c9983a]/15 ${isDark ? 'text-[#e8c571]' : 'text-[#5c4214]'}`}>
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <h2 className={`mt-4 text-[18px] font-bold ${heading} group-hover:underline underline-offset-2`}>{title}</h2>
                <p className={`mt-2 text-[14.5px] leading-[1.6] ${body}`}>{text}</p>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}

      <GlassCard className="p-4 sm:p-6 lg:p-8">
        <h2 className={`text-[18px] font-bold ${heading}`}>New here? Start with these</h2>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2">
          {start.map((p, i) => (
            <li key={p.slug}>
              <Link to={`/docs/${p.slug}`} className="flex items-start gap-3 rounded-[12px] px-2 py-2 hover:bg-white/[0.35] dark:hover:bg-white/[0.06]">
                <span className="mt-0.5 inline-flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#7d5c20] text-[13px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-[var(--brand-ink)]">{p.title}</span>
                  <span className="block text-[13.5px] leading-[1.5] text-[var(--brand-ink-muted)]">{p.summary}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </GlassCard>
    </div>
  );
}
