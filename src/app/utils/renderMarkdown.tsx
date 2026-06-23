import ReactMarkdown from "react-markdown"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a ?? []),
    ],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto"],
    src: ["http", "https"],
  },
}

export default function RenderMarkdownContent({
  content,
}: {
  content: string
}) {
  return (
    <ReactMarkdown
      rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
      components={{
        h2: ({ children }) => <h2>{children}</h2>,
        p: ({ children }) => <p>{children}</p>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
