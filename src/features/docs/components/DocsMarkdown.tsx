import { Children, createContext, isValidElement, useContext, type ReactNode } from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
import { Info, TriangleAlert } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Screenshot } from './Screenshot';
import { VideoFrame } from './VideoFrame';
import { slugify } from '../slugify';

// Reading surface for docs pages. Typography, colours and spacing are the
// blog reader's (BlogPostView) so an article reads the same in both places;
// what the blog lacks - heading anchors, numbered steps, callouts and
// screenshots - is added here. Block code is told apart from inline code the way
// ProjectDetailPage's README renderer does it, with a context set by <pre>.

const InPre = createContext(false);

function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : isValidElement(c) ? textOf((c.props as { children?: ReactNode }).children) : ''))
    .join('');
}

function Code({ children, isDark }: { children?: ReactNode; isDark: boolean }) {
  const inPre = useContext(InPre);
  if (inPre) return <code className="font-mono">{children}</code>;
  return (
    <code
      className={`px-1.5 py-0.5 rounded-[6px] text-[14px] font-mono border ${
        isDark ? 'bg-black/30 border-white/10 text-[#e8c87a]' : 'bg-black/[0.06] border-black/10 text-[#8b6f3a]'
      }`}
    >
      {children}
    </code>
  );
}

function Callout({ kind, children, isDark }: { kind: 'note' | 'warning'; children: ReactNode; isDark: boolean }) {
  // Note is StatusNotice's gold notice; warning is the wallet page's alert.
  const note = isDark ? 'border-[#c9983a]/35 bg-[#c9983a]/[0.08]' : 'border-[#c9983a]/40 bg-[#c9983a]/10';
  const warn = isDark ? 'border-[#ef4444]/25 bg-[#ef4444]/10' : 'border-[#ef4444]/25 bg-[#ef4444]/[0.06]';
  const icon = kind === 'note' ? (isDark ? 'text-[#e8c571]' : 'text-[#5c4214]') : isDark ? 'text-[#fca5a5]' : 'text-[#6f1818]';
  const Icon = kind === 'note' ? Info : TriangleAlert;
  return (
    <div
      role={kind === 'warning' ? 'note' : undefined}
      className={`my-6 flex items-start gap-3 rounded-[16px] border p-4 sm:p-5 text-[15px] leading-[1.6] ${kind === 'note' ? note : warn}`}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-[3px] ${icon}`} aria-hidden="true" />
      <div className="min-w-0 [&>p]:mb-0 [&>p+p]:mt-2">
        <span className="sr-only">{kind === 'note' ? 'Note: ' : 'Warning: '}</span>
        {children}
      </div>
    </div>
  );
}

export function DocsMarkdown({ source }: { source: string }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const body = isDark ? 'text-[#ddd6ca]' : 'text-[#4a4034]';
  const heading = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const linkCls =
    'text-[var(--brand-gold-text)] font-semibold underline underline-offset-2 decoration-[#c9983a]/50 hover:decoration-[#c9983a] transition-colors';

  return (
    <div className={`docs-article text-[16px] leading-[1.75] ${body}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // shot: and video: are this renderer's own embeds; everything else goes
        // through react-markdown's default URL sanitising.
        urlTransform={(url) => (/^(shot|video):/.test(url) ? url : defaultUrlTransform(url))}
        components={{
          h2: ({ children }) => {
            const id = slugify(textOf(children));
            return (
              <h2 id={id} className={`group scroll-mt-[104px] text-[26px] font-bold mt-12 mb-4 leading-tight ${heading}`}>
                {children}
                <a href={`#${id}`} aria-label="Link to this section" className="ml-2 opacity-0 group-hover:opacity-60 focus:opacity-60 text-[#c9983a]">
                  #
                </a>
              </h2>
            );
          },
          h3: ({ children }) => (
            <h3 id={slugify(textOf(children))} className={`scroll-mt-[104px] text-[20px] font-bold mt-9 mb-3 leading-tight ${heading}`}>
              {children}
            </h3>
          ),
          p: ({ children, node }) => {
            // A paragraph that is only a media embed renders as a block, not inside <p>.
            const only = node?.children?.length === 1 && node.children[0].type === 'element' && node.children[0].tagName === 'img';
            return only ? <>{children}</> : <p className="mb-5">{children}</p>;
          },
          strong: ({ children }) => <strong className={`font-bold ${heading}`}>{children}</strong>,
          ul: ({ children }) => <ul className="mb-5 space-y-2.5 list-disc pl-5 marker:text-[#c9983a]">{children}</ul>,
          // Ordered lists are procedures: numbered steps, in the wallet page's step circle.
          ol: ({ children }) => <ol className="mb-6 space-y-5 list-none pl-0 [counter-reset:step]">{children}</ol>,
          li: ({ children }) => <li className="relative pl-1">{children}</li>,
          blockquote: ({ children }) => {
            const text = textOf(children).trimStart();
            const m = /^\[!(NOTE|WARNING)\]\s*/.exec(text);
            if (m) {
              const kind = m[1] === 'NOTE' ? 'note' : 'warning';
              const stripped = Children.map(children, (c) => c);
              return (
                <Callout kind={kind} isDark={isDark}>
                  <StripMarker>{stripped}</StripMarker>
                </Callout>
              );
            }
            return <blockquote className={`my-6 pl-5 border-l-[3px] border-[#c9983a]/60 italic ${muted}`}>{children}</blockquote>;
          },
          code: ({ children }) => <Code isDark={isDark}>{children}</Code>,
          pre: ({ children }) => (
            <InPre.Provider value={true}>
              <pre
                className={`my-6 p-4 rounded-[14px] overflow-x-auto text-[13.5px] leading-relaxed border ${
                  isDark ? 'bg-black/35 border-white/10 text-[#e8dfd0]' : 'bg-black/[0.05] border-black/10 text-[#3a3228]'
                }`}
              >
                {children}
              </pre>
            </InPre.Provider>
          ),
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-[14px] border border-white/20">
              <table className="w-full border-collapse text-[14.5px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className={isDark ? 'bg-white/[0.07]' : 'bg-white/[0.25]'}>{children}</thead>,
          th: ({ children }) => <th className={`text-left px-4 py-3 font-bold border-b border-white/15 ${heading}`}>{children}</th>,
          td: ({ children }) => <td className="px-4 py-3 border-b border-white/10 align-top">{children}</td>,
          a: ({ children, href = '' }) =>
            href.startsWith('/') ? (
              <Link to={href} className={linkCls}>
                {children}
              </Link>
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer" className={linkCls}>
                {children}
              </a>
            ),
          img: ({ src = '', alt = '', title }) => {
            if (src.startsWith('shot:')) return <Screenshot id={src.slice(5)} alt={alt} caption={title} />;
            if (src.startsWith('video:')) return <VideoFrame slug={src.slice(6)} title={alt} duration={title} />;
            return <img src={src} alt={alt} className="my-6 rounded-[14px] border border-white/20" />;
          },
          hr: () => <hr className="my-10 border-0 h-px bg-white/15" />,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}

// Removes the "[!NOTE]" marker text from the first paragraph of a callout.
function StripMarker({ children }: { children: ReactNode }) {
  const strip = (node: ReactNode, done: { v: boolean }): ReactNode => {
    if (done.v) return node;
    if (typeof node === 'string') {
      const out = node.replace(/^\s*\[!(NOTE|WARNING)\]\s*/, '');
      if (out !== node) done.v = true;
      return out;
    }
    if (isValidElement(node)) {
      const props = node.props as { children?: ReactNode };
      const kids = Children.map(props.children, (c) => strip(c, done));
      return { ...node, props: { ...props, children: kids } };
    }
    return node;
  };
  const done = { v: false };
  return <>{Children.map(children, (c) => strip(c, done))}</>;
}
