import { plainText } from './doc';
import type { ParsedDoc } from './doc';
import type { PageRef } from './nav';
import type { SearchEntry } from './search';
import { slugify } from './slugify';

/**
 * One search entry per page (its opening paragraphs) and one per "## "
 * section. Built from published pages only, which is what keeps admin pages
 * out of a signed-out reader's results: they are never in the list to match.
 */
export function searchEntries(pages: PageRef[], docs: Record<string, ParsedDoc>): SearchEntry[] {
  const out: SearchEntry[] = [];
  for (const { page, section } of pages) {
    const doc = docs[page.slug];
    if (!doc) continue;
    const href = `/docs/${page.slug}`;
    const [intro, ...sections] = doc.body.split(/\n## /);
    out.push({ kind: 'page', title: page.title, page: page.title, section: section.title, text: plainText(intro) || page.summary, href });
    for (const chunk of sections) {
      const nl = chunk.indexOf('\n');
      const heading = (nl < 0 ? chunk : chunk.slice(0, nl)).trim();
      const text = nl < 0 ? '' : plainText(chunk.slice(nl + 1));
      out.push({ kind: 'heading', title: heading, page: page.title, section: section.title, text, href: `${href}#${slugify(heading)}` });
    }
  }
  return out;
}
