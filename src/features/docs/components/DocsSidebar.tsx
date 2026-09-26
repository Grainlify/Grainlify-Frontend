import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Lock } from 'lucide-react';
import type { DocPage, DocSection } from '../nav';

// The contents tree. Colours come from brand.css tokens; hover and active
// follow the landing navbar's pills (white wash on hover, gold tint when
// current). The section and group holding the current page start open.
// `sections` is the published tree (nav.ts publishedNav), already filtered for
// pages that exist and for admin-only sections.

function Item({ page, active, onNavigate }: { page: DocPage; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      to={`/docs/${page.slug}`}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`block rounded-[10px] px-3 py-[7px] text-[14px] leading-[1.35] transition-colors ${
        active
          ? 'bg-[#c9983a]/15 font-semibold text-[var(--brand-gold-text)]'
          : 'text-[var(--brand-ink-muted)] hover:text-[var(--brand-ink)] hover:bg-white/[0.35] dark:hover:bg-white/[0.06]'
      }`}
    >
      {page.title}
    </Link>
  );
}

function Disclosure({
  label,
  open,
  onToggle,
  level,
  badge,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  level: 'section' | 'group';
  badge?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`flex w-full items-center gap-2 rounded-[10px] px-3 text-left transition-colors hover:bg-white/[0.35] dark:hover:bg-white/[0.06] ${
        level === 'section'
          ? 'py-2 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--brand-gold-text-deep)]'
          : 'py-[7px] text-[14px] font-semibold text-[var(--brand-ink)]'
      }`}
    >
      <span className="flex-1">{label}</span>
      {badge}
      <ChevronRight className={`w-4 h-4 shrink-0 opacity-70 transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden="true" />
    </button>
  );
}

function containsSlug(section: DocSection, slug: string) {
  return (section.pages ?? []).some((p) => p.slug === slug) || (section.groups ?? []).some((g) => g.pages.some((p) => p.slug === slug));
}

export function DocsSidebar({ sections, slug, onNavigate }: { sections: DocSection[]; slug: string; onNavigate?: () => void }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = { start: true };
    for (const s of sections) {
      if (containsSlug(s, slug)) init[s.id] = true;
      for (const g of s.groups ?? []) if (g.pages.some((p) => p.slug === slug)) init[`${s.id}/${g.title}`] = true;
    }
    return init;
  });
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  return (
    <nav aria-label="Documentation" className="flex flex-col gap-3 text-[14px]">
      {sections.map((s) => (
        <div key={s.id}>
          <Disclosure
            label={s.title}
            level="section"
            open={!!open[s.id]}
            onToggle={() => toggle(s.id)}
            badge={
              s.adminOnly ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--brand-surface-border)] px-2 py-0.5 text-[10.5px] font-semibold normal-case tracking-normal text-[var(--brand-ink-muted)]">
                  <Lock className="w-3 h-3" aria-hidden="true" /> Admins only
                </span>
              ) : undefined
            }
          />
          {open[s.id] && (
            <div className="mt-1 flex flex-col gap-0.5">
              {(s.pages ?? []).map((p) => (
                <Item key={p.slug} page={p} active={p.slug === slug} onNavigate={onNavigate} />
              ))}
              {(s.groups ?? []).map((g) => {
                const k = `${s.id}/${g.title}`;
                return (
                  <div key={k}>
                    <Disclosure label={g.title} level="group" open={!!open[k]} onToggle={() => toggle(k)} />
                    {open[k] && (
                      <div className="ml-3 mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-[var(--brand-surface-border)] pl-2">
                        {g.pages.map((p) => (
                          <Item key={p.slug} page={p} active={p.slug === slug} onNavigate={onNavigate} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
