import ReactMarkdown from "react-markdown"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import { ReactNode } from "react"

/**
 * Sanitizes and validates URLs to prevent XSS attacks.
 * Uses a strict default-deny allowlist approach, blocking all dangerous URI schemes.
 *
 * @param url - The URL string to sanitize
 * @param protocol - The expected protocol (e.g., 'http', 'https', 'mailto')
 * @returns The sanitized URL, or empty string if the URL is malicious
 *
 * @remarks
 * This function blocks:
 * - javascript: URIs (can execute arbitrary scripts)
 * - data: URIs (can bypass security policies)
 * - vbscript: URIs (legacy scripting protocol)
 * - file: URIs (local file access)
 * - Any other non-whitelisted protocols
 */
function sanitizeUrl(url: string, protocol: string): string {
  if (!url || typeof url !== "string") return ""

  const trimmedUrl = url.trim()
  const lowerUrl = trimmedUrl.toLowerCase()

  const dangerousProtocols = [
    "javascript:",
    "data:",
    "vbscript:",
    "file:",
    "blob:",
  ]

  for (const dangerous of dangerousProtocols) {
    if (lowerUrl.startsWith(dangerous)) return ""
  }

  const allowedProtocols = ["http://", "https://", "mailto:", "/", "#"]

  const isAllowed = allowedProtocols.some(
    (p) => lowerUrl.startsWith(p) || (!lowerUrl.includes(":") && protocol !== "mailto")
  )

  return isAllowed ? trimmedUrl : ""
}

const strictSanitizeSchema = {
  tagNames: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "a", "em", "strong", "ul", "ol", "li", "code", "pre", "blockquote", "br", "hr", "img", "table", "thead", "tbody", "tr", "th", "td", "del", "ins"],
  attributes: {
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
    p: [],
    a: ["href", "title"],
    em: [],
    strong: [],
    ul: [],
    ol: ["start"],
    li: [],
    code: [],
    pre: [],
    blockquote: [],
    br: [],
    hr: [],
    img: ["src", "alt", "title", "width", "height"],
    table: [],
    thead: [],
    tbody: [],
    tr: [],
    th: [],
    td: [],
    del: [],
    ins: [],
  },
  protocols: {
    href: ["http", "https", "mailto"],
    src: ["http", "https"],
  },
}

interface RenderMarkdownContentProps {
  content: string
}

interface LinkComponentProps {
  href?: string
  children?: ReactNode
  title?: string
}

interface ImageComponentProps {
  src?: string
  alt?: string
  title?: string
}

export default function RenderMarkdownContent({
  content,
}: RenderMarkdownContentProps) {
  const LinkComponent = ({ href, children, title }: LinkComponentProps) => {
    if (!href) return <>{children}</>

    const sanitizedHref = sanitizeUrl(href, "http")
    if (!sanitizedHref) return <>{children}</>

    const isExternal = sanitizedHref.startsWith("http")

    return (
      <a
        href={sanitizedHref}
        title={title}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    )
  }

  const ImageComponent = ({ src, alt, title }: ImageComponentProps) => {
    if (!src) return null

    const sanitizedSrc = sanitizeUrl(src, "http")
    if (!sanitizedSrc) return null

    return <img src={sanitizedSrc} alt={alt || ""} title={title} />
  }

  return (
    <ReactMarkdown
      rehypePlugins={[[rehypeSanitize, strictSanitizeSchema]]}
      components={{
        h1: ({ children }) => <h1>{children}</h1>,
        h2: ({ children }) => <h2>{children}</h2>,
        h3: ({ children }) => <h3>{children}</h3>,
        h4: ({ children }) => <h4>{children}</h4>,
        h5: ({ children }) => <h5>{children}</h5>,
        h6: ({ children }) => <h6>{children}</h6>,
        p: ({ children }) => <p>{children}</p>,
        a: LinkComponent,
        img: ImageComponent,
        em: ({ children }) => <em>{children}</em>,
        strong: ({ children }) => <strong>{children}</strong>,
        ul: ({ children }) => <ul>{children}</ul>,
        ol: ({ children, ...props }) => <ol {...props}>{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        code: ({ children }) => <code>{children}</code>,
        pre: ({ children }) => <pre>{children}</pre>,
        blockquote: ({ children }) => <blockquote>{children}</blockquote>,
        hr: () => <hr />,
        br: () => <br />,
        table: ({ children }) => <table>{children}</table>,
        thead: ({ children }) => <thead>{children}</thead>,
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => <tr>{children}</tr>,
        th: ({ children }) => <th>{children}</th>,
        td: ({ children }) => <td>{children}</td>,
        del: ({ children }) => <del>{children}</del>,
        ins: ({ children }) => <ins>{children}</ins>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

export { sanitizeUrl }
