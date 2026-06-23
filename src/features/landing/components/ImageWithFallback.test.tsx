import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ImageWithFallback } from "./ImageWithFallback";

describe("ImageWithFallback", () => {
  it("renders an img with provided props", () => {
    render(
      <ImageWithFallback
        src="https://example.com/avatar.jpg"
        alt="Test avatar"
        loading="lazy"
        decoding="async"
        className="w-12 h-12 rounded-full"
      />
    );

    const img = screen.getByTestId("image-with-fallback");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
    expect(img).toHaveAttribute("alt", "Test avatar");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
  });

  it("renders fallback for non-HTTP(S) URLs", () => {
    render(
      <ImageWithFallback
        src="javascript:alert(1)"
        alt="Malicious"
        className="w-12 h-12"
      />
    );

    const fallback = screen.getByTestId("image-fallback");
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveAttribute("aria-hidden", "true");
  });

  it("renders fallback for empty string src", () => {
    render(<ImageWithFallback src="" alt="Empty" className="w-12 h-12" />);

    const fallback = screen.getByTestId("image-fallback");
    expect(fallback).toBeInTheDocument();
  });

  it("renders fallback for invalid URL format", () => {
    render(
      <ImageWithFallback src="not-a-url" alt="Bad URL" className="w-12 h-12" />
    );

    const fallback = screen.getByTestId("image-fallback");
    expect(fallback).toBeInTheDocument();
  });

  it("switches to fallback on image error", () => {
    render(
      <ImageWithFallback
        src="https://example.com/nonexistent.jpg"
        alt="Missing"
        className="w-12 h-12"
      />
    );

    const img = screen.getByTestId("image-with-fallback");
    // Simulate error event
    fireEvent.error(img);

    const fallback = screen.getByTestId("image-fallback");
    expect(fallback).toBeInTheDocument();
  });

  it("accepts empty alt for decorative images", () => {
    render(
      <ImageWithFallback
        src="https://example.com/decorative.png"
        alt=""
        className="w-12 h-12"
      />
    );

    const img = screen.getByTestId("image-with-fallback");
    expect(img).toHaveAttribute("alt", "");
  });

  it("applies custom className and style", () => {
    render(
      <ImageWithFallback
        src="https://example.com/avatar.jpg"
        alt="Styled"
        className="custom-class"
        style={{ borderRadius: "50%" }}
      />
    );

    const img = screen.getByTestId("image-with-fallback");
    expect(img).toHaveClass("custom-class");
    expect(img).toHaveStyle("border-radius: 50%");
  });
});