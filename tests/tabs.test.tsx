import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { Tabs } from "../src/ui/tabs";
import type { TabsProps } from "../src/ui/tabs";

function Demo(props: Partial<TabsProps> = {}) {
  return (
    <Tabs label="Sections" {...props}>
      <Tabs.List>
        <Tabs.Tab value={0}>Overview</Tabs.Tab>
        <Tabs.Tab value={1}>Details</Tabs.Tab>
        <Tabs.Tab value={2}>Reviews</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value={0}>Overview panel</Tabs.Panel>
      <Tabs.Panel value={1}>Details panel</Tabs.Panel>
      <Tabs.Panel value={2}>Reviews panel</Tabs.Panel>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("exposes a named tablist with tab and tabpanel roles", () => {
    render(<Demo />);
    expect(screen.getByRole("tablist")).toHaveAccessibleName("Sections");
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Overview panel");
  });

  it("selects the default tab and marks it selected", () => {
    render(<Demo defaultActiveIndex={1} />);
    expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Details panel");
  });

  it("reports the index when a tab is clicked", async () => {
    const onChange = vi.fn();
    render(<Demo onChange={onChange} />);
    await userEvent.click(screen.getByRole("tab", { name: "Reviews" }));
    expect(onChange).toHaveBeenCalledWith(2);
    expect(screen.getByRole("tab", { name: "Reviews" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Reviews panel");
  });

  it("can be driven from a controlled activeIndex", () => {
    const { rerender } = render(<Demo activeIndex={0} />);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Overview panel");
    rerender(
      <Tabs activeIndex={2} label="Sections">
        <Tabs.List>
          <Tabs.Tab value={0}>Overview</Tabs.Tab>
          <Tabs.Tab value={1}>Details</Tabs.Tab>
          <Tabs.Tab value={2}>Reviews</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value={0}>Overview panel</Tabs.Panel>
        <Tabs.Panel value={1}>Details panel</Tabs.Panel>
        <Tabs.Panel value={2}>Reviews panel</Tabs.Panel>
      </Tabs>
    );
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Reviews panel");
  });

  it("moves focus with the arrow keys and activates with Enter (roving focus)", async () => {
    const onChange = vi.fn();
    render(<Demo onChange={onChange} />);
    await userEvent.tab();
    const [first, second] = screen.getAllByRole("tab");
    expect(first).toHaveFocus();

    // Activating on focus is off: the arrow only moves focus.
    await userEvent.keyboard("{ArrowRight}");
    expect(second).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("wraps focus at the ends of the list", async () => {
    render(<Demo defaultActiveIndex={2} />);
    await userEvent.tab();
    expect(screen.getByRole("tab", { name: "Reviews" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveFocus();
  });

  it("uses Up/Down for a vertical list", async () => {
    render(<Demo orientation="vertical" />);
    await userEvent.tab();
    expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "vertical");
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("tab", { name: "Details" })).toHaveFocus();
  });

  it("swaps the navigation axis without changing the labelled orientation", async () => {
    render(<Demo orientation="horizontal" orientationSwap />);
    await userEvent.tab();
    const [first, second] = screen.getAllByRole("tab");
    expect(first).toHaveFocus();

    await userEvent.keyboard("{ArrowRight}");
    expect(first).toHaveFocus();

    await userEvent.keyboard("{ArrowDown}");
    expect(second).toHaveFocus();
    expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "horizontal");
  });

  it("keeps a disabled tab inert", async () => {
    const onChange = vi.fn();
    render(
      <Tabs label="Sections" onChange={onChange}>
        <Tabs.List>
          <Tabs.Tab value={0}>Overview</Tabs.Tab>
          <Tabs.Tab value={1} disabled>
            Details
          </Tabs.Tab>
          <Tabs.Tab value={2}>Reviews</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value={0}>Overview panel</Tabs.Panel>
        <Tabs.Panel value={1}>Details panel</Tabs.Panel>
        <Tabs.Panel value={2}>Reviews panel</Tabs.Panel>
      </Tabs>
    );
    const disabledTab = screen.getByRole("tab", { name: "Details" });
    expect(disabledTab).toHaveAttribute("aria-disabled", "true");

    await userEvent.click(disabledTab);
    disabledTab.focus();
    await userEvent.keyboard("{Enter}");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  });

  it("clears the selection on Escape when closeOnEscape is set", async () => {
    const onChange = vi.fn();
    render(<Demo closeOnEscape onChange={onChange} />);
    await userEvent.tab();
    await userEvent.keyboard("{Escape}");
    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "false");
  });

  it("does nothing on Escape by default", async () => {
    const onChange = vi.fn();
    render(<Demo onChange={onChange} />);
    await userEvent.tab();
    await userEvent.keyboard("{Escape}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("scrolls the list instead of clipping when it overflows", () => {
    render(<Demo />);
    expect(screen.getByRole("tablist").className).toContain("overflow-x-auto");
  });

  it("forwards its ref to the root element", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Tabs ref={ref} label="Sections">
        <Tabs.List>
          <Tabs.Tab value={0}>Overview</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value={0}>Overview panel</Tabs.Panel>
      </Tabs>
    );
    expect(ref.current).not.toBeNull();
    expect(ref.current).toHaveAttribute("data-km-tabs", "root");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<Demo defaultActiveIndex={0} />);
    const axeOptions = {
      rules: {
        "color-contrast": { enabled: false },
        region: { enabled: false },
        "landmark-one-main": { enabled: false },
        "page-has-heading-one": { enabled: false },
        "html-has-lang": { enabled: false },
        "document-title": { enabled: false },
      },
    } as Parameters<typeof axe.run>[1];
    const results = await axe.run(container, axeOptions);
    const problems = results.violations.map((violation) => `${violation.id}: ${violation.help}`);
    expect(problems).toEqual([]);
  });
});
