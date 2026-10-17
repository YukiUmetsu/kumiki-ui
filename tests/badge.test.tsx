import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { Badge } from "../src/ui/badge";
import type { BadgeVariant } from "../src/ui/badge";

// jsdom cannot compute rendered colors/layout, so document-level and contrast
// rules are disabled; component semantics (names, roles) stay on.
const AXE_OPTIONS = {
  rules: {
    "color-contrast": { enabled: false },
    region: { enabled: false },
    "landmark-one-main": { enabled: false },
    "page-has-heading-one": { enabled: false },
    "html-has-lang": { enabled: false },
    "document-title": { enabled: false },
  },
} as Parameters<typeof axe.run>[1];

describe("Badge", () => {
  it("renders a span with the root hook and its children", () => {
    const { container } = render(<Badge>Draft</Badge>);
    const badge = container.querySelector<HTMLElement>("[data-km-badge]");

    expect(badge).not.toBeNull();
    expect(badge!.tagName).toBe("SPAN");
    expect(badge).toHaveAttribute("data-variant", "neutral");
    expect(badge).toHaveTextContent("Draft");
  });

  it("renders no marker by default and no live-region semantics", () => {
    const { container } = render(<Badge>Draft</Badge>);
    const badge = container.querySelector<HTMLElement>("[data-km-badge]")!;

    expect(badge).not.toHaveAttribute("data-dot");
    expect(badge.querySelector('[data-part="dot"]')).toBeNull();
    expect(badge.querySelector('[data-part="icon"]')).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders a shape-distinct glyph and status token for every status variant", () => {
    const variants: BadgeVariant[] = ["info", "success", "warning", "danger"];
    const { container } = render(
      <div>
        {variants.map((variant) => (
          <Badge key={variant} variant={variant}>
            {variant}
          </Badge>
        ))}
      </div>
    );
    const badges = Array.from(container.querySelectorAll<HTMLElement>("[data-km-badge]"));

    expect(badges).toHaveLength(variants.length);
    variants.forEach((variant, index) => {
      const badge = badges[index];
      const icon = badge.querySelector('[data-part="icon"]');

      expect(badge).toHaveClass(`text-status-${variant}`);
      expect(badge).toHaveTextContent(variant);
      expect(icon).not.toBeNull();
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(icon!.querySelector("svg")).not.toBeNull();
      expect(badge.querySelector('[data-part="dot"]')).toBeNull();
    });
  });

  it("renders an aria-hidden dot instead of the glyph when dot is set", () => {
    const { container, rerender } = render(<Badge dot>Draft</Badge>);
    let dot = container.querySelector<HTMLElement>('[data-part="dot"]');

    expect(dot).not.toBeNull();
    expect(dot).toHaveAttribute("aria-hidden", "true");
    expect(dot).toHaveClass("bg-muted-foreground");
    expect(container.querySelector('[data-part="icon"]')).toBeNull();

    rerender(
      <Badge variant="danger" dot>
        Failed
      </Badge>
    );
    dot = container.querySelector<HTMLElement>('[data-part="dot"]');
    expect(dot).toHaveClass("bg-status-danger");
    expect(container.querySelector('[data-part="icon"]')).toBeNull();
  });

  it("applies the compact and regular footprints", () => {
    const { container } = render(
      <div>
        <Badge size="sm">Small</Badge>
        <Badge size="md">Medium</Badge>
      </div>
    );
    const [small, medium] = Array.from(
      container.querySelectorAll<HTMLElement>("[data-km-badge]")
    );

    expect(small).toHaveClass("text-caption");
    expect(small).toHaveClass("rounded-control");
    expect(medium).toHaveClass("text-sm");
    expect(medium).toHaveClass("rounded-control");
  });

  it("merges a consumer className and forwards DOM props", () => {
    render(
      <Badge className="my-badge" data-analytics="status" title="Current state">
        New
      </Badge>
    );
    const badge = screen.getByText("New").closest("[data-km-badge]")!;

    expect(badge).toHaveClass("my-badge");
    expect(badge).toHaveAttribute("data-analytics", "status");
    expect(badge).toHaveAttribute("title", "Current state");
  });

  it("forwards its ref to the root span", () => {
    const ref = createRef<HTMLSpanElement>();
    const { container } = render(<Badge ref={ref}>Ref</Badge>);

    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    expect(ref.current).toBe(container.querySelector("[data-km-badge]"));
  });

  it("forwards role and accessible name for an optional announcement", () => {
    render(
      <Badge role="status" aria-label="Build passing">
        Passing
      </Badge>
    );

    const status = screen.getByRole("status", { name: "Build passing" });
    expect(status).toHaveTextContent("Passing");
  });

  it("keeps long CJK labels and URLs inside the badge", () => {
    const cjk = "アップロードに失敗しました。もう一度お試しください";
    const url = "https://example.com/workspaces/9f2c/reports/quarterly-summary?period=2026-q3";
    const { container } = render(
      <div>
        <Badge variant="warning">{cjk}</Badge>
        <Badge variant="info" dot>
          {url}
        </Badge>
      </div>
    );

    expect(screen.getByText(cjk)).toBeInTheDocument();
    expect(screen.getByText(url)).toBeInTheDocument();
    expect(container.querySelectorAll('[data-part="label"]')).toHaveLength(2);
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <div>
        <Badge variant="neutral">Draft</Badge>
        <Badge variant="info">In review</Badge>
        <Badge variant="success" dot>
          Active
        </Badge>
        <Badge variant="warning">Expiring</Badge>
        <Badge variant="danger" role="status" aria-label="Import failed">
          Failed
        </Badge>
      </div>
    );

    const results = await axe.run(container, AXE_OPTIONS);
    const problems = results.violations.map((violation) => `${violation.id}: ${violation.help}`);
    expect(problems).toEqual([]);
  });
});
