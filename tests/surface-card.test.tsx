import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { Surface } from "../src/ui/surface-card";

function rootOf(container: HTMLElement): HTMLElement {
  const root = container.querySelector<HTMLElement>('[data-km-surface="root"]');
  if (!root) throw new Error("Surface root not found");
  return root;
}

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

describe("Surface", () => {
  it("renders a non-interactive container by default", () => {
    const { container } = render(<Surface>Content</Surface>);
    const root = rootOf(container);
    expect(root.tagName).toBe("DIV");
    expect(screen.queryByRole("button")).toBeNull();
    expect(root).not.toHaveAttribute("data-km-interactive");
  });

  it("applies the tokenized base surface styles", () => {
    const { container } = render(<Surface>Content</Surface>);
    const root = rootOf(container);
    expect(root.className).toContain("rounded-surface");
    expect(root.className).toContain("border");
    expect(root.className).toContain("bg-surface");
    expect(root.className).toContain("text-foreground");
  });

  it("applies the selected variant treatment", () => {
    const solid = rootOf(render(<Surface variant="solid">Solid</Surface>).container);
    const outline = rootOf(render(<Surface variant="outline">Outline</Surface>).container);
    const ghost = rootOf(render(<Surface variant="ghost">Ghost</Surface>).container);

    expect(solid.className).toContain("bg-surface");
    expect(solid.className).toContain("shadow-xs");

    expect(outline.className).toContain("bg-transparent");
    expect(outline.className).toContain("border-border");

    expect(ghost.className).toContain("border-transparent");
    expect(ghost.className).toContain("bg-transparent");
  });

  it("merges a consumer className onto the root", () => {
    const { container } = render(<Surface className="my-surface">Content</Surface>);
    expect(rootOf(container).className).toContain("my-surface");
  });

  it("renders header, body and footer regions in order", () => {
    const { container } = render(
      <Surface header="Title" footer="Actions">
        Body
      </Surface>
    );
    const header = container.querySelector('[data-km-surface="header"]');
    const body = container.querySelector('[data-km-surface="body"]');
    const footer = container.querySelector('[data-km-surface="footer"]');

    expect(header).toHaveTextContent("Title");
    expect(body).toHaveTextContent("Body");
    expect(footer).toHaveTextContent("Actions");

    // header → body → footer stacking order
    expect(header!.compareDocumentPosition(body!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(body!.compareDocumentPosition(footer!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("omits regions that are not provided", () => {
    const { container } = render(<Surface header="Title" />);
    expect(container.querySelector('[data-km-surface="header"]')).not.toBeNull();
    expect(container.querySelector('[data-km-surface="body"]')).toBeNull();
    expect(container.querySelector('[data-km-surface="footer"]')).toBeNull();
  });

  it("renders interactive surfaces as a native button and fires onClick", async () => {
    const onClick = vi.fn();
    render(
      <Surface interactive onClick={onClick}>
        Open report
      </Surface>
    );
    const button = screen.getByRole("button", { name: "Open report" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("data-km-interactive", "true");

    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is keyboard operable with Enter and Space when interactive", async () => {
    const onClick = vi.fn();
    render(
      <Surface interactive onClick={onClick}>
        Submit
      </Surface>
    );
    await userEvent.tab();
    const button = screen.getByRole("button", { name: "Submit" });
    expect(button).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("forwards a ref to the root element", () => {
    const divRef = createRef<HTMLElement>();
    const { container } = render(<Surface ref={divRef}>Content</Surface>);
    expect(divRef.current).toBe(rootOf(container));

    const buttonRef = createRef<HTMLElement>();
    render(
      <Surface ref={buttonRef} interactive>
        Action
      </Surface>
    );
    expect(buttonRef.current).toBe(screen.getByRole("button", { name: "Action" }));
  });

  it("supports long and CJK content", () => {
    render(
      <Surface header="ワークスペースの設定">
        長いテキストやCJKのコンテンツは折り返され、クリップされません。
      </Surface>
    );
    expect(screen.getByText("ワークスペースの設定")).toBeInTheDocument();
    expect(
      screen.getByText("長いテキストやCJKのコンテンツは折り返され、クリップされません。")
    ).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <div>
        <Surface header="Static" footer="Footer">
          Body
        </Surface>
        <Surface interactive aria-label="Open report">
          Action
        </Surface>
      </div>
    );
    const results = await axe.run(container, AXE_OPTIONS);
    const problems = results.violations.map((violation) => `${violation.id}: ${violation.help}`);
    expect(problems).toEqual([]);
  });
});
