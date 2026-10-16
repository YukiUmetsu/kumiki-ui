import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "../src/ui/dialog";

describe("Dialog", () => {
  it("renders nothing while closed", () => {
    render(
      <Dialog title="Settings">
        <p>Body</p>
      </Dialog>
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders a labelled modal with an associated description", () => {
    render(
      <Dialog open title="Settings" description="Manage your settings">
        <p>Body</p>
      </Dialog>
    );
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("Manage your settings");
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("omits aria-modal for a non-modal dialog", () => {
    render(
      <Dialog open modal={false} title="Settings">
        <p>Body</p>
      </Dialog>
    );
    expect(screen.getByRole("dialog", { name: "Settings" })).not.toHaveAttribute("aria-modal");
  });

  it("closes from the close button and reports the change once", async () => {
    const onOpenChange = vi.fn();
    const onClose = vi.fn();
    render(
      <Dialog open title="Settings" onOpenChange={onOpenChange} onClose={onClose}>
        <p>Body</p>
      </Dialog>
    );
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open title="Settings" onOpenChange={onOpenChange}>
        <p>Body</p>
      </Dialog>
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("locks page scroll while open and releases it after closing", async () => {
    const isScrollLocked = () =>
      document.body.style.overflowY === "hidden" ||
      document.documentElement.hasAttribute("data-base-ui-scroll-locked");

    const { rerender } = render(
      <Dialog open title="Settings">
        <p>Body</p>
      </Dialog>
    );
    await waitFor(() => expect(isScrollLocked()).toBe(true));

    rerender(
      <Dialog open={false} title="Settings">
        <p>Body</p>
      </Dialog>
    );
    await waitFor(() => expect(isScrollLocked()).toBe(false));
  });

  it("moves focus into the dialog and restores it to the trigger on close", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open
          </button>
          <Dialog open={open} title="Settings" onOpenChange={setOpen}>
            <p>Body</p>
          </Dialog>
        </>
      );
    }
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open" });
    await userEvent.click(trigger);

    const dialog = await screen.findByRole("dialog", { name: "Settings" });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger).toHaveFocus();
  });

  it("supports nested dialogs", async () => {
    function Harness() {
      const [outerOpen, setOuterOpen] = useState(true);
      const [innerOpen, setInnerOpen] = useState(false);
      return (
        <>
          <Dialog open={outerOpen} title="Outer" onOpenChange={setOuterOpen}>
            <button type="button" onClick={() => setInnerOpen(true)}>
              Open inner
            </button>
          </Dialog>
          <Dialog open={innerOpen} title="Inner" onOpenChange={setInnerOpen}>
            <p>Inner body</p>
          </Dialog>
        </>
      );
    }
    render(<Harness />);
    expect(await screen.findByRole("dialog", { name: "Outer" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Open inner" }));
    const inner = await screen.findByRole("dialog", { name: "Inner" });
    // Only the top-most dialog is exposed; focus moves into the nested one.
    expect(screen.queryByRole("dialog", { name: "Outer" })).toBeNull();
    await waitFor(() => expect(inner.contains(document.activeElement)).toBe(true));
  });

  it("scrolls long content inside the popup instead of clipping it", async () => {
    render(
      <Dialog open title="Long">
        <div style={{ height: 4000 }}>tall</div>
      </Dialog>
    );
    const dialog = await screen.findByRole("dialog", { name: "Long" });
    expect(dialog.className).toContain("overflow-y-auto");
  });
});
