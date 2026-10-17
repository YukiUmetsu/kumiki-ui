import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { Accordion } from "../src/ui/accordion";
import type { AccordionProps } from "../src/ui/accordion";

function Demo(props: Partial<AccordionProps> = {}) {
  return (
    <Accordion {...props}>
      <Accordion.Item value="shipping">
        <Accordion.Header>
          <Accordion.Trigger>Shipping</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>Shipping panel</Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="returns">
        <Accordion.Header>
          <Accordion.Trigger>Returns</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>Returns panel</Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="history">
        <Accordion.Header>
          <Accordion.Trigger>History</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>History panel</Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
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

describe("Accordion", () => {
  it("renders headings, native triggers and a labelled region", () => {
    render(<Demo defaultValue={["shipping"]} />);

    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);

    const trigger = screen.getByRole("button", { name: "Shipping" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    // Drives the chevron rotation (`group-data-[panel-open]:rotate-180`).
    expect(trigger).toHaveAttribute("data-panel-open");

    const panel = screen.getByRole("region", { name: "Shipping" });
    expect(panel).toHaveTextContent("Shipping panel");
    expect(trigger).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("data-open");

    expect(screen.queryByRole("region", { name: "Returns" })).not.toBeInTheDocument();
  });

  it("expands one item and closes the previously open one", async () => {
    const onValueChange = vi.fn();
    render(<Demo onValueChange={onValueChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Shipping" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["shipping"]);
    expect(screen.getByRole("button", { name: "Shipping" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );

    await userEvent.click(screen.getByRole("button", { name: "Returns" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["returns"]);
    expect(screen.getByRole("button", { name: "Shipping" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(screen.getByRole("button", { name: "Returns" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  it("reports an empty list when the open item is collapsed", async () => {
    const onValueChange = vi.fn();
    render(<Demo defaultValue={["history"]} onValueChange={onValueChange} />);

    await userEvent.click(screen.getByRole("button", { name: "History" }));

    expect(onValueChange).toHaveBeenLastCalledWith([]);
    expect(screen.getByRole("button", { name: "History" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("keeps several items open when openMultiple is set", async () => {
    const onValueChange = vi.fn();
    render(<Demo openMultiple onValueChange={onValueChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Shipping" }));
    await userEvent.click(screen.getByRole("button", { name: "Returns" }));

    expect(onValueChange).toHaveBeenLastCalledWith(["shipping", "returns"]);
    expect(screen.getByRole("button", { name: "Shipping" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByRole("button", { name: "Returns" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );

    await userEvent.click(screen.getByRole("button", { name: "Shipping" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["returns"]);
  });

  it("toggles with Enter and Space", async () => {
    render(<Demo />);
    await userEvent.tab();
    const trigger = screen.getByRole("button", { name: "Shipping" });
    expect(trigger).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await userEvent.keyboard(" ");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("moves focus with arrow keys, Home and End", async () => {
    render(<Demo />);
    await userEvent.tab();
    const shipping = screen.getByRole("button", { name: "Shipping" });
    const returns = screen.getByRole("button", { name: "Returns" });
    const history = screen.getByRole("button", { name: "History" });
    expect(shipping).toHaveFocus();

    await userEvent.keyboard("{ArrowDown}");
    expect(returns).toHaveFocus();

    await userEvent.keyboard("{End}");
    expect(history).toHaveFocus();

    await userEvent.keyboard("{Home}");
    expect(shipping).toHaveFocus();

    await userEvent.keyboard("{ArrowUp}");
    expect(history).toHaveFocus();

    await userEvent.keyboard("{ArrowDown}");
    expect(shipping).toHaveFocus();
  });

  it("skips disabled items while moving focus", async () => {
    render(
      <Accordion>
        <Accordion.Item value="shipping">
          <Accordion.Header>
            <Accordion.Trigger>Shipping</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>Shipping panel</Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="returns" disabled>
          <Accordion.Header>
            <Accordion.Trigger>Returns</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>Returns panel</Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="history">
          <Accordion.Header>
            <Accordion.Trigger>History</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>History panel</Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    );

    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Shipping" })).toHaveFocus();

    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "History" })).toHaveFocus();
  });

  it("keeps a disabled item inert and does not report a change", async () => {
    const onValueChange = vi.fn();
    render(
      <Accordion onValueChange={onValueChange}>
        <Accordion.Item value="shipping">
          <Accordion.Header>
            <Accordion.Trigger>Shipping</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>Shipping panel</Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="returns" disabled>
          <Accordion.Header>
            <Accordion.Trigger>Returns</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>Returns panel</Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    );

    const disabledTrigger = screen.getByRole("button", { name: "Returns" });
    expect(disabledTrigger).toBeDisabled();
    expect(disabledTrigger).toHaveAttribute("data-disabled");

    await userEvent.click(disabledTrigger);
    disabledTrigger.focus();
    await userEvent.keyboard("{Enter}");

    expect(onValueChange).not.toHaveBeenCalled();
    expect(disabledTrigger).toHaveAttribute("aria-expanded", "false");
  });

  it("honours defaultValue when uncontrolled", () => {
    render(<Demo defaultValue={["returns"]} />);
    expect(screen.getByRole("button", { name: "Returns" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByRole("button", { name: "Shipping" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("keeps a controlled value fixed until the prop changes", async () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<Demo value={["shipping"]} onValueChange={onValueChange} />);
    expect(screen.getByRole("button", { name: "Shipping" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );

    await userEvent.click(screen.getByRole("button", { name: "Returns" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["returns"]);
    expect(screen.getByRole("button", { name: "Shipping" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByRole("button", { name: "Returns" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );

    rerender(<Demo value={["returns"]} onValueChange={onValueChange} />);
    expect(screen.getByRole("button", { name: "Shipping" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(screen.getByRole("button", { name: "Returns" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  it("drives a parent-owned state pair", async () => {
    function Controlled() {
      const [openItems, setOpenItems] = useState<string[]>(["shipping"]);
      return (
        <>
          <Accordion value={openItems} onValueChange={setOpenItems}>
            <Accordion.Item value="shipping">
              <Accordion.Header>
                <Accordion.Trigger>Shipping</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>Shipping panel</Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="returns">
              <Accordion.Header>
                <Accordion.Trigger>Returns</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>Returns panel</Accordion.Panel>
            </Accordion.Item>
          </Accordion>
          <span data-testid="open-items">{openItems.join(",")}</span>
        </>
      );
    }

    render(<Controlled />);
    await userEvent.click(screen.getByRole("button", { name: "Returns" }));

    expect(screen.getByTestId("open-items")).toHaveTextContent("returns");
    expect(screen.getByRole("button", { name: "Returns" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  it("forwards refs to the root and the trigger", () => {
    const rootRef = createRef<HTMLDivElement>();
    const triggerRef = createRef<HTMLElement>();
    render(
      <Accordion ref={rootRef}>
        <Accordion.Item value="shipping">
          <Accordion.Header>
            <Accordion.Trigger ref={triggerRef}>Shipping</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>Shipping panel</Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    );

    expect(rootRef.current).not.toBeNull();
    expect(rootRef.current).toHaveAttribute("data-km-accordion", "root");
    expect(triggerRef.current).not.toBeNull();
    expect(triggerRef.current).toHaveAttribute("data-km-accordion", "trigger");
  });

  it("merges consumer classes on every part", () => {
    render(
      <Accordion className="root-extra" defaultValue={["shipping"]}>
        <Accordion.Item value="shipping" className="item-extra">
          <Accordion.Header className="header-extra">
            <Accordion.Trigger className="trigger-extra">Shipping</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel className="panel-extra">Shipping panel</Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    );

    expect(screen.getByRole("button", { name: "Shipping" })).toHaveClass("trigger-extra");
    expect(screen.getByRole("button", { name: "Shipping" }).className).toContain(
      "min-h-[var(--km-control-height)]"
    );
    expect(screen.getByRole("heading", { level: 3 })).toHaveClass("header-extra");
    expect(screen.getByRole("region", { name: "Shipping" })).toHaveClass("panel-extra");
    expect(screen.getByRole("region", { name: "Shipping" }).className).toContain(
      "h-[var(--accordion-panel-height)]"
    );
    expect(screen.getByRole("region", { name: "Shipping" }).closest('[data-km-accordion="root"]')).toHaveClass(
      "root-extra"
    );
    expect(
      screen.getByRole("region", { name: "Shipping" }).closest('[data-km-accordion="item"]')
    ).toHaveClass("item-extra");
  });

  it("has no detectable accessibility violations when expanded", async () => {
    render(
      <Accordion openMultiple defaultValue={["shipping", "returns"]}>
        <Accordion.Item value="shipping">
          <Accordion.Header>
            <Accordion.Trigger>Shipping</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>Shipping panel with a description.</Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="returns">
          <Accordion.Header>
            <Accordion.Trigger>Returns</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>Returns panel with a description.</Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="history" disabled>
          <Accordion.Header>
            <Accordion.Trigger>History</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>History panel.</Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    );

    await expectNoViolations(document.body);
  });
});
