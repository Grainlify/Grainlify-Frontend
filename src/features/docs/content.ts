import { parseDoc, type ParsedDoc } from './doc';

// Every Markdown file under content/, keyed by slug: content/contributors/link-solana-wallet.md
// is "contributors/link-solana-wallet". Bundled into the docs chunk only - the
// docs route is lazy, so none of this reaches the rest of the app.
const raw = import.meta.glob('./content/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const DOCS: Record<string, ParsedDoc> = Object.fromEntries(
  Object.entries(raw).map(([file, text]) => [file.replace('./content/', '').replace(/\.md$/, ''), parseDoc(text)]),
);

export const AVAILABLE: ReadonlySet<string> = new Set(Object.keys(DOCS));
