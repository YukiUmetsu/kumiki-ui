import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { SplitPane } from "../src/ui/split-pane";
import type { SplitPaneProps } from "../src/ui/split-pane";

function Demo(props: Partial<SplitPaneProps> = {}) {
  return (
    <SplitPane
      aria-label="Resize editor and preview"
      primary={<p>Primary panel</p>}
      secondary={<p>Secondary panel</p>}
      {...props}
    />
  );
}

function getSeparator(name = "Resize editor and preview"): HTMLElement {
  return screen.getByRole("separator", { name });
}

function mockRect(element: Element, width: number, height: number) {
  element.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      width,
      height,
      toJSON: () => ({}),
    }) as DOMRect;
}

/** Mock the panel geometry jsdom does not compute: 408px wide, 8px divider. */
function mockHorizontalGeometry(container: HTMLElement) {
  const root = container.querySelector<HTMLElement>('[data-km-split-pane="root"]');
  const divider = container.querySelector<HTMLElement>('[data-km-split-pane="divider"]');
  if (!root || !divider) throw new Error("split pane parts not found");
  mockRect(root, 408, 240);
  mockRect(divider, 8, 240);
  return { root, divider };
}

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

async function expectNoViolations(node: HTMLElement) {
  const results = await axe.run(node, AXE_OPTIONS);
  expect(results.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
}

describe("SplitPane", () => {
  it("renders both panels and a named separator with its full value contract", () => {
    const { container } = render(<Demo />);
    const divider = getSeparator();

    expect(divider).toHaveAttribute("role", "separator");
    expect(divider).toHaveAttribute("aria-orientation", "vertical");
    expect(divider).toHaveAttribute("aria-valuemin", "10");
    expect(divider).toHaveAttribute("aria-valuemax", "90");
    expect(divider).toHaveAttribute("aria-valuenow", "50");
    expect(divider).toHaveAttribute("aria-valuetext", "50%");
    expect(divider).toHaveAttribute("tabindex", "0");

    expect(screen.getByText("Primary panel")).toBeInTheDocument();
    expect(screen.getByText("Secondary panel")).toBeInTheDocument();

    const root = container.querySelector('[data-km-split-pane="root"]');
    expect(root).toHaveAttribute("data-orientation", "horizontal");
    expect(root).toHaveAttribute("data-unit", "percent");
    expect(container.querySelector('[data-km-split-pane="primary"]')).toHaveTextContent(
      "Primary panel"
    );
    expect(container.querySelector('[data-km-split-pane="secondary"]')).toHaveTextContent(
      "Secondary panel"
    );
  });

  it("falls back to the default divider name", () => {
    render(
      <SplitPane primary={<p>Primary panel</p>} secondary={<p>Secondary panel</p>} />
    );
    expect(screen.getByRole("separator", { name: "Resize panels" })).toBeInTheDocument();
  });

  it("uses a horizontal divider and Up/Down keys when stacked vertically", async () => {
    render(<Demo orientation="vertical" />);
    const divider = getSeparator();

    expect(divider).toHaveAttribute("aria-orientation", "horizontal");
    expect(divider).toHaveAttribute("aria-valuenow", "50");

    divider.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(divider).toHaveAttribute("aria-valuenow", "51");

    await userEvent.keyboard("{ArrowUp}");
    expect(divider).toHaveAttribute("aria-valuenow", "50");

    await userEvent.keyboard("{ArrowLeft}");
    expect(divider).toHaveAttribute("aria-valuenow", "50");
  });

  it("moves and clamps with the arrow keys, Home and End", async () => {
    const onPrimarySizeChange = vi.fn();
    render(
      <Demo
        defaultPrimarySize={50}
        minPrimarySize={20}
        maxPrimarySize={80}
        onPrimarySizeChange={onPrimarySizeChange}
      />
    );
    const divider = getSeparator();

    divider.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(divider).toHaveAttribute("aria-valuenow", "51");
    expect(onPrimarySizeChange).toHaveBeenLastCalledWith(51);

    await userEvent.keyboard("{Home}");
    expect(divider).toHaveAttribute("aria-valuenow", "20");
    expect(onPrimarySizeChange).toHaveBeenLastCalledWith(20);

    await userEvent.keyboard("{ArrowLeft}");
    expect(divider).toHaveAttribute("aria-valuenow", "20");
    expect(onPrimarySizeChange).toHaveBeenLastCalledWith(20);

    await userEvent.keyboard("{End}");
    expect(divider).toHaveAttribute("aria-valuenow", "80");
    expect(onPrimarySizeChange).toHaveBeenLastCalledWith(80);

    await userEvent.keyboard("{ArrowRight}");
    expect(divider).toHaveAttribute("aria-valuenow", "80");
    expect(onPrimarySizeChange).toHaveBeenLastCalledWith(80);
  });

  it("keeps a controlled size and reports the next clamped value", async () => {
    const onPrimarySizeChange = vi.fn();
    const { rerender } = render(
      <Demo primarySize={30} maxPrimarySize={80} onPrimarySizeChange={onPrimarySizeChange} />
    );
    const divider = getSeparator();
    expect(divider).toHaveAttribute("aria-valuenow", "30");

    divider.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onPrimarySizeChange).toHaveBeenLastCalledWith(31);
    // Controlled: the value only moves when the consumer feeds it back.
    expect(divider).toHaveAttribute("aria-valuenow", "30");

    rerender(
      <Demo primarySize={70} maxPrimarySize={80} onPrimarySizeChange={onPrimarySizeChange} />
    );
    expect(divider).toHaveAttribute("aria-valuenow", "70");

    rerender(
      <Demo primarySize={120} maxPrimarySize={80} onPrimarySizeChange={onPrimarySizeChange} />
    );
    expect(divider).toHaveAttribute("aria-valuenow", "80");
  });

  it("uses defaultPrimarySize when uncontrolled and updates itself", async () => {
    const onPrimarySizeChange = vi.fn();
    render(<Demo defaultPrimarySize={40} onPrimarySizeChange={onPrimarySizeChange} />);
    const divider = getSeparator();
    expect(divider).toHaveAttribute("aria-valuenow", "40");

    divider.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(divider).toHaveAttribute("aria-valuenow", "41");
    expect(onPrimarySizeChange).toHaveBeenLastCalledWith(41);
  });

  it("is inert when disabled", async () => {
    const onPrimarySizeChange = vi.fn();
    const { container } = render(
      <Demo disabled defaultPrimarySize={50} onPrimarySizeChange={onPrimarySizeChange} />
    );
    const divider = getSeparator();

    expect(divider).toHaveAttribute("aria-disabled", "true");
    expect(divider).toHaveAttribute("tabindex", "-1");

    divider.focus();
    await userEvent.keyboard("{ArrowRight}{End}{Home}");
    expect(divider).toHaveAttribute("aria-valuenow", "50");
    expect(onPrimarySizeChange).not.toHaveBeenCalled();

    const { divider: dividerInDom } = mockHorizontalGeometry(container);
    fireEvent.pointerDown(dividerInDom, { pointerId: 1, clientX: 100, button: 0 });
    fireEvent.pointerMove(dividerInDom, { pointerId: 1, clientX: 240 });
    fireEvent.pointerUp(dividerInDom, { pointerId: 1, clientX: 240 });
    expect(divider).toHaveAttribute("aria-valuenow", "50");
    expect(onPrimarySizeChange).not.toHaveBeenCalled();
  });

  it("drags with pointer events, prevents selection, and clamps to the bounds", () => {
    const onPrimarySizeChange = vi.fn();
    const { container } = render(
      <Demo
        defaultPrimarySize={50}
        minPrimarySize={20}
        maxPrimarySize={80}
        onPrimarySizeChange={onPrimarySizeChange}
      />
    );
    const { root, divider } = mockHorizontalGeometry(container);

    fireEvent.pointerDown(divider, {
      pointerId: 1,
      clientX: 100,
      clientY: 10,
      button: 0,
    });
    expect(root).toHaveAttribute("data-dragging", "true");
    expect(root.className).toContain("select-none");
    expect(divider.className).toContain("select-none");
    expect(divider).toHaveFocus();

    // 408px container minus the 8px divider leaves 400px: 40px is 10%.
    fireEvent.pointerMove(divider, { pointerId: 1, clientX: 140, clientY: 10 });
    expect(divider).toHaveAttribute("aria-valuenow", "60");
    expect(onPrimarySizeChange).toHaveBeenLastCalledWith(60);

    fireEvent.pointerMove(divider, { pointerId: 1, clientX: -10000, clientY: 10 });
    expect(divider).toHaveAttribute("aria-valuenow", "20");

    fireEvent.pointerMove(divider, { pointerId: 1, clientX: 10000, clientY: 10 });
    expect(divider).toHaveAttribute("aria-valuenow", "80");

    fireEvent.pointerUp(divider, { pointerId: 1, clientX: 10000, clientY: 10 });
    expect(root).not.toHaveAttribute("data-dragging");
    expect(divider).toHaveAttribute("aria-valuenow", "80");
  });

  it("supports pixel sizes with pixel-specific bounds and value text", async () => {
    const { container } = render(
      <Demo
        unit="pixels"
        defaultPrimarySize={240}
        minPrimarySize={160}
        maxPrimarySize={420}
      />
    );
    const { divider } = mockHorizontalGeometry(container);

    expect(divider).toHaveAttribute("aria-valuemin", "160");
    expect(divider).toHaveAttribute("aria-valuemax", "420");
    expect(divider).toHaveAttribute("aria-valuenow", "240");
    expect(divider).toHaveAttribute("aria-valuetext", "240 pixels");

    divider.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(divider).toHaveAttribute("aria-valuenow", "250");

    await userEvent.keyboard("{End}");
    expect(divider).toHaveAttribute("aria-valuenow", "420");
    expect(divider).toHaveAttribute("aria-valuetext", "420 pixels");

    await userEvent.keyboard("{Home}");
    expect(divider).toHaveAttribute("aria-valuenow", "160");

    fireEvent.pointerDown(divider, { pointerId: 2, clientX: 300, button: 0 });
    fireEvent.pointerMove(divider, { pointerId: 2, clientX: 330 });
    expect(divider).toHaveAttribute("aria-valuenow", "190");
    fireEvent.pointerUp(divider, { pointerId: 2, clientX: 330 });
  });

  it("forwards its ref, className and DOM props to the root", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SplitPane
        ref={ref}
        primary={<p>Primary panel</p>}
        secondary={<p>Secondary panel</p>}
        className="custom-split"
        id="split-root"
        data-testid="split-root"
      />
    );

    const root = screen.getByTestId("split-root");
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("data-km-split-pane", "root");
    expect(root).toHaveAttribute("id", "split-root");
    expect(root).toHaveClass("custom-split");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <Demo
        orientation="vertical"
        defaultPrimarySize={40}
        minPrimarySize={20}
        maxPrimarySize={80}
      />
    );
    await expectNoViolations(container);
  });
});
