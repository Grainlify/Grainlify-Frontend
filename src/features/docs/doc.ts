import { slugify } from './slugify';

// A docs page is Markdown with a two-line front matter block:
//
//   ---
//   updated: 2026-09-27
//   ---
//
// The title and summary live in nav.ts, so the contents tree, search, the page
// header and the prerendered <title> can never disagree about a page's name.

export interface ParsedDoc {
  updated: string | null;
  body: string;
}

export function parseDoc(raw: string): ParsedDoc {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  if (!m) return { updated: null, body: raw.trim() };
  const updated = /^updated:\s*(\d{4}-\d{2}-\d{2})\s*$/m.exec(m[1])?.[1] ?? null;
  return { updated, body: raw.slice(m[0].length).trim() };
}

/** "2026-09-27" → "27 September 2026". Parsed by hand so no timezone can shift the day. */
export function formatUpdated(iso: string): string {
  const [y, mo, d] = iso.split('-').map(Number);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${d} ${months[mo - 1]} ${y}`;
}

/** The page's second-level headings, which make up "On this page". */
export function headingsOf(body: string): { text: string; id: string }[] {
  return [...body.matchAll(/^## (.+)$/gm)].map((m) => ({ text: m[1].trim(), id: slugify(m[1]) }));
}

/** Markdown reduced to readable text, for search and meta descriptions. */
export function plainText(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[!(NOTE|WARNING)\]/g, '')
    .replace(/[*_`>#]/g, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*-\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}
