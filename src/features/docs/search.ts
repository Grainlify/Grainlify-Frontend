// Full-text search over the docs, in the browser, with no dependency.
//
// Every page is one entry and every "## " section is another, so a result can
// open the page at the section that matched. A query matches when EVERY word
// in it matches a word in the entry: exactly, as a prefix ("wall" finds
// "wallet"), or with one typo for words of five letters or more ("walet").
// Title words count three times as much as body words.

export interface SearchEntry {
  kind: 'page' | 'heading';
  title: string;
  /** Page title, for heading entries. */
  page: string;
  section: string;
  text: string;
  href: string;
}

interface Indexed {
  entry: SearchEntry;
  title: string[];
  text: string[];
}

export type SearchIndex = Indexed[];

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9$]+/)
    .filter((t) => t.length >= 2);
}

export function buildSearchIndex(entries: SearchEntry[]): SearchIndex {
  return entries.map((entry) => ({ entry, title: tokenize(entry.title), text: tokenize(entry.text) }));
}

/** True when a and b differ by at most one insertion, deletion or substitution. */
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function termScore(q: string, words: string[]): number {
  let best = 0;
  for (const w of words) {
    if (w === q) return 3;
    if (w.startsWith(q)) best = Math.max(best, 2);
    else if (q.length >= 5 && best < 1 && withinOneEdit(q, w)) best = 1;
  }
  return best;
}

export function search(index: SearchIndex, query: string, limit = 12): SearchEntry[] {
  const terms = tokenize(query);
  if (!terms.length) return [];
  const scored: { entry: SearchEntry; score: number }[] = [];
  for (const item of index) {
    let score = 0;
    let all = true;
    for (const t of terms) {
      const s = termScore(t, item.title) * 3 + termScore(t, item.text);
      if (s === 0) {
        all = false;
        break;
      }
      score += s;
    }
    if (!all) continue;
    // A page beats one of its own sections on an equal score.
    if (item.entry.kind === 'page') score += 0.5;
    scored.push({ entry: item.entry, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.entry);
}

/** Splits text into plain and matched runs, for highlighting in results. */
export function markMatches(text: string, query: string): { text: string; match: boolean }[] {
  const terms = tokenize(query);
  if (!terms.length) return [{ text, match: false }];
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return text
    .split(re)
    .filter(Boolean)
    .map((part) => ({ text: part, match: terms.some((t) => part.toLowerCase() === t) }));
}

/** About 110 characters of the text around the first match, cut at word boundaries. */
export function snippetAround(text: string, query: string, length = 110): string {
  if (text.length <= length) return text;
  const lower = text.toLowerCase();
  const first = tokenize(query)
    .map((t) => lower.indexOf(t))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)[0];
  if (first === undefined) return text.slice(0, text.lastIndexOf(' ', length)) + '…';
  let start = Math.max(0, first - 40);
  if (start > 0) start = text.indexOf(' ', start) + 1 || start;
  let end = Math.min(text.length, start + length);
  if (end < text.length) end = text.lastIndexOf(' ', end) > start ? text.lastIndexOf(' ', end) : end;
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}
