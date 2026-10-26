import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { Sheet } from "../src/ui/sheet";

function Panel({ open = true, onOpenChange, modal = true, side = "right" as const, resizable = false }: {
  open?: boolean; onOpenChange?: (next: boolean) => void; modal?: boolean;
  side?: "left" | "right" | "top" | "bottom"; resizable?: boolean;
}) {
  return (
    <Sheet.Root open={open} onOpenChange={onOpenChange} modal={modal} side={side} motion={{ durationMs: 410, backdropMs: 110, opacity: 0.3 }}>
      <Sheet.Trigger>Open panel</Sheet.Trigger>
      <Sheet.Content resizable={resizable}>
        <Sheet.Header><Sheet.Title>Settings</Sheet.Title><Sheet.Close aria-label="Dismiss">×</Sheet.Close></Sheet.Header>
        <Sheet.Description>Adjust your preferences</Sheet.Description>
        <Sheet.Body><button type="button">A focused action</button></Sheet.Body>
        <Sheet.Footer><button type="button">Save</button></Sheet.Footer>
      </Sheet.Content>
    </Sheet.Root>
  );
}

describe("Sheet", () => {
  it("has no detected structural accessibility violations in its open and resizable state", async () => {
    render(<Panel resizable />);
    const result = await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, region: { enabled: false }, "landmark-one-main": { enabled: false } } });
    expect(result.violations.map((issue) => issue.id)).toEqual([]);
  });
  it("exposes an accessible, labelled modal with usable header, body and footer", async () => {
    render(<Panel />);
    const dialog = await screen.findByRole("dialog", { name: "Settings" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("Adjust your preferences");
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "A focused action" })).toBeInTheDocument();
    expect(dialog.querySelector('[data-km-panel-body]')).toHaveClass("overflow-y-auto");
  });

  it("offers four edges and per-instance backdrop/motion customization", () => {
    const { rerender } = render(<Panel side="left" />);
    const left = screen.getByRole("dialog", { name: "Settings" });
    expect(left).toHaveAttribute("data-side", "left");
    expect(left.style.getPropertyValue("--km-panel-duration")).toBe("410ms");
    expect(left.style.getPropertyValue("--km-panel-backdrop-opacity")).toBe("0.3");
    rerender(<Panel side="top" />);
    expect(screen.getByRole("dialog")).toHaveAttribute("data-side", "top");
    rerender(<Panel side="bottom" />);
    expect(screen.getByRole("dialog")).toHaveAttribute("data-side", "bottom");
    rerender(<Panel side="right" />);
    expect(screen.getByRole("dialog")).toHaveAttribute("data-side", "right");
  });

  it("respects non-modal mode and is dismissible with its close button or Escape", async () => {
    const onOpenChange = vi.fn();
    render(<Panel modal={false} onOpenChange={onOpenChange} />);
    expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-modal");
    expect(document.querySelector('[data-km-sheet-backdrop]')).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onOpenChange.mock.calls.some((call) => call[0] === false)).toBe(true);
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange.mock.calls.some((call) => call[0] === false)).toBe(true);
  });

  it("supports uncontrolled trigger state, Escape dismissal and focus restoration", async () => {
    function Harness() {
      return <Sheet.Root><Sheet.Trigger>Show details</Sheet.Trigger><Sheet.Content><Sheet.Title>Details</Sheet.Title><Sheet.Body>Something to edit</Sheet.Body></Sheet.Content></Sheet.Root>;
    }
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Show details" });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Details" });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger).toHaveFocus();
  });

  it("supports controlled state without assuming the parent accepts a close request", async () => {
    const panel = (open: boolean) => <Sheet.Root open={open} onOpenChange={() => {}}><Sheet.Content><Sheet.Title>Editor</Sheet.Title><Sheet.Close>Close editor</Sheet.Close></Sheet.Content></Sheet.Root>;
    const { rerender } = render(panel(true));
    await userEvent.click(screen.getByRole("button", { name: "Close editor" }));
    expect(screen.getByRole("dialog", { name: "Editor" })).toBeInTheDocument();
    rerender(panel(false));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("allows keyboard resizing with clamped dimensions", async () => {
    render(<Panel resizable />);
    const handle = screen.getByRole("separator", { name: "Resize panel" });
    expect(handle).toHaveAttribute("aria-orientation", "vertical");
    handle.focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("dialog").style.width).toBe("464px");
    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("dialog").style.width).toBe("280px");
    await userEvent.keyboard("{End}");
    expect(Number.parseInt(screen.getByRole("dialog").style.width, 10)).toBeGreaterThan(280);
  });

  it("keeps resized size and accessible slider bounds valid on narrow viewports", async () => {
    const previous = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { value: 220, configurable: true });
    try {
      render(<Panel resizable />);
      const handle = screen.getByRole("separator", { name: "Resize panel" });
      handle.focus();
      await userEvent.keyboard("{Home}");
      const minimum = Number(handle.getAttribute("aria-valuemin"));
      const maximum = Number(handle.getAttribute("aria-valuemax"));
      const current = Number(handle.getAttribute("aria-valuenow"));
      expect(minimum).toBeLessThanOrEqual(current);
      expect(current).toBeLessThanOrEqual(maximum);
      expect(Number.parseInt(screen.getByRole("dialog").style.width, 10)).toBeLessThanOrEqual(220);
    } finally {
      Object.defineProperty(window, "innerWidth", { value: previous, configurable: true });
    }
  });
});
