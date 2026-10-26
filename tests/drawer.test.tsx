import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { Drawer } from "../src/ui/drawer";

function Demo({ side = "bottom" as const, modal = true, onOpenChange }: { side?: "left" | "right" | "top" | "bottom"; modal?: boolean; onOpenChange?: (open: boolean) => void }) {
  return <Drawer.Root open side={side} modal={modal} onOpenChange={onOpenChange} snapPoints={[0.35, 1]} motion={{ durationMs: 260, opacity: 0.25 }}>
    <Drawer.Content>
      <Drawer.Header><Drawer.Title>Choose files</Drawer.Title><Drawer.Close aria-label="Dismiss drawer">×</Drawer.Close></Drawer.Header>
      <Drawer.Description>Two files selected</Drawer.Description>
      <Drawer.Body><div data-base-ui-swipe-ignore="">Scroll without swiping</div></Drawer.Body>
      <Drawer.Footer><button type="button">Continue</button></Drawer.Footer>
    </Drawer.Content>
  </Drawer.Root>;
}

describe("Drawer", () => {
  it("has no detected structural accessibility violations with snap points", async () => {
    render(<Demo />);
    const result = await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, region: { enabled: false }, "landmark-one-main": { enabled: false } } });
    expect(result.violations.map((issue) => issue.id)).toEqual([]);
  });
  it("renders a labelled modal, body, actions and optional drag handle", async () => {
    render(<Demo />);
    const panel = await screen.findByRole("dialog", { name: "Choose files" });
    expect(panel).toHaveAttribute("aria-modal", "true");
    expect(panel).toHaveAccessibleDescription("Two files selected");
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(panel.querySelector("[data-km-drawer-handle]")).toBeInTheDocument();
    expect(panel.querySelector('[data-base-ui-swipe-ignore]')).toBeInTheDocument();
  });

  it("maps every edge to the matching Base UI swipe direction", () => {
    const { rerender } = render(<Demo side="left" />);
    for (const side of ["left", "right", "top", "bottom"] as const) {
      rerender(<Demo side={side} />);
      expect(screen.getByRole("dialog")).toHaveAttribute("data-side", side);
      expect(screen.getByRole("dialog")).toHaveAttribute("data-swipe-direction", { left: "left", right: "right", top: "up", bottom: "down" }[side]);
    }
  });

  it("uses custom motion variables while leaving gestures controlled by the primitive", () => {
    render(<Demo />);
    const panel = screen.getByRole("dialog");
    expect(panel.style.getPropertyValue("--km-panel-duration")).toBe("260ms");
    expect(panel.style.getPropertyValue("--km-panel-backdrop-opacity")).toBe("0.25");
    expect(panel.className).toContain("data-[swiping]:transition-none");
  });

  it("respects non-modal interaction and forwards a single boolean close notification", async () => {
    const onOpenChange = vi.fn();
    render(<Demo modal={false} onOpenChange={onOpenChange} />);
    expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-modal");
    expect(document.querySelector('[data-km-drawer-backdrop]')).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Dismiss drawer" }));
    expect(onOpenChange.mock.calls.some((call) => call[0] === false)).toBe(true);
  });

  it("opens from its trigger, closes with Escape and restores focus", async () => {
    render(<Drawer.Root><Drawer.Trigger>Open actions</Drawer.Trigger><Drawer.Content showHandle={false}><Drawer.Title>Actions</Drawer.Title><Drawer.Body>Pick an action</Drawer.Body></Drawer.Content></Drawer.Root>);
    const trigger = screen.getByRole("button", { name: "Open actions" });
    await userEvent.click(trigger);
    const panel = await screen.findByRole("dialog", { name: "Actions" });
    await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger).toHaveFocus();
  });
});
