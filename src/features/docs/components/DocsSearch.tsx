import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { Search, FileText, Hash, CornerDownLeft } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { markMatches, search, snippetAround, type SearchEntry, type SearchIndex } from '../search';

// Cmd/Ctrl+K palette. The panel and backdrop are the shared Modal's
// (portalled to body, #d4c5b0 / #3a3228 panel, black/50 backdrop); cmdk only
// supplies keyboard navigation. Matching and ranking are in ../search.ts.

function Highlighted({ text, query }: { text: string; query: string }) {
  return (
    <>
      {markMatches(text, query).map((part, i) =>
        part.match ? (
          <mark key={i} className="rounded-[4px] bg-[#c9983a]/30 px-0.5 text-inherit">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

export function DocsSearch({
  open,
  onClose,
  index,
}: {
  open: boolean;
  onClose: () => void;
  index: SearchIndex;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  // Each opening starts clean.
  useEffect(() => {
    if (open) setQ('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const results = useMemo(() => (q.trim().length >= 2 ? search(index, q) : []), [q, index]);

  const groups = useMemo(() => {
    const m = new Map<string, SearchEntry[]>();
    for (const r of results) m.set(r.section, [...(m.get(r.section) ?? []), r]);
    return [...m.entries()];
  }, [results]);

  if (!open) return null;

  const ink = isDark ? 'text-[#e8dfd0]' : 'text-[#2d2820]';
  const muted = 'text-[var(--brand-ink-muted)]';
  const kbd = `rounded-[6px] border px-1.5 py-0.5 text-[11px] font-semibold ${isDark ? 'border-white/20 text-[#b8a898]' : 'border-black/15 text-[#4a4038]'}`;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-start justify-center bg-black/50 backdrop-blur-sm sm:pt-[12vh]" onClick={onClose}>
      <Command
        shouldFilter={false}
        label="Search the docs"
        onClick={(e) => e.stopPropagation()}
        className={`flex w-full h-full sm:h-auto sm:w-[640px] sm:max-w-[90vw] sm:max-h-[70vh] flex-col overflow-hidden sm:rounded-[24px] sm:border-2 shadow-[0_20px_60px_rgba(0,0,0,0.3)] ${
          isDark ? 'bg-[#3a3228] border-white/30' : 'bg-[#d4c5b0] border-white/40'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 sm:px-5 py-3.5">
          <Search className={`w-5 h-5 shrink-0 ${isDark ? 'text-[#e8c571]' : 'text-[#5c4214]'}`} aria-hidden="true" />
          <Command.Input
            id="docs-search-input"
            autoFocus
            value={q}
            onValueChange={setQ}
            placeholder="Search the docs"
            className={`flex-1 min-w-0 bg-transparent text-[16px] outline-none placeholder:text-[var(--brand-ink-muted)] ${ink}`}
          />
          <button type="button" onClick={onClose} className={kbd} aria-label="Close search">
            Esc
          </button>
        </div>

        <Command.List className="flex-1 overflow-y-auto p-2 sm:p-3 scrollbar-custom">
          {q.trim().length >= 2 && results.length === 0 && (
            <Command.Empty className={`px-3 py-8 text-center text-[14px] ${muted}`}>
              No pages match “{q.trim()}”. Try a shorter word.
            </Command.Empty>
          )}
          {q.trim().length < 2 && (
            <p className={`px-3 py-6 text-center text-[14px] ${muted}`}>Type at least two letters to search every page.</p>
          )}
          {groups.map(([section, entries]) => (
            <Command.Group
              key={section}
              heading={section}
              className="mb-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-[var(--brand-gold-text-deep)]"
            >
              {entries.map((e) => {
                const Icon = e.kind === 'page' ? FileText : Hash;
                return (
                  <Command.Item
                    key={e.href}
                    value={e.href}
                    onSelect={() => {
                      navigate(e.href);
                      onClose();
                    }}
                    className={`group flex cursor-pointer items-start gap-3 rounded-[14px] px-3 py-2.5 ${
                      isDark ? 'data-[selected=true]:bg-white/[0.08]' : 'data-[selected=true]:bg-white/[0.35]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-[3px] shrink-0 ${isDark ? 'text-[#e8c571]' : 'text-[#5c4214]'}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[14.5px] font-semibold ${ink}`}>
                        <Highlighted text={e.title} query={q} />
                        {e.kind === 'heading' && <span className={`font-normal ${muted}`}> · {e.page}</span>}
                      </span>
                      {e.text && (
                        <span className={`mt-0.5 block text-[13px] leading-[1.45] ${muted}`}>
                          <Highlighted text={snippetAround(e.text, q)} query={q} />
                        </span>
                      )}
                    </span>
                    <CornerDownLeft className={`w-4 h-4 mt-[3px] shrink-0 opacity-0 group-data-[selected=true]:opacity-60 ${ink}`} aria-hidden="true" />
                  </Command.Item>
                );
              })}
            </Command.Group>
          ))}
        </Command.List>

        <div className={`hidden sm:flex items-center gap-4 border-t border-white/10 px-5 py-2.5 text-[12px] ${muted}`}>
          <span className="flex items-center gap-1.5"><span className={kbd}>↑</span><span className={kbd}>↓</span> to move</span>
          <span className="flex items-center gap-1.5"><span className={kbd}>↵</span> to open</span>
          <span className="ml-auto">Searches every page and heading</span>
        </div>
      </Command>
    </div>,
    document.body,
  );
}
