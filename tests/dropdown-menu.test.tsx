import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { DropdownMenu } from "../src/ui/dropdown-menu";
import type { DropdownMenuEntry } from "../src/ui/dropdown-menu";

// floating-ui observes element sizes; jsdom has no ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
  (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ?? ResizeObserverStub;

const basicItems: DropdownMenuEntry[] = [
  { label: "Edit", onSelect: () => {} },
  { label: "Duplicate", onSelect: () => {} },
  { label: "Archive", onSelect: () => {} },
];

function open(label = "Actions") {
  return (
    <DropdownMenu label={label} items={basicItems}>
      <button type="button">{label}</button>
    </DropdownMenu>
  );
}

describe("DropdownMenu", () => {
  it("renders only the anchor while closed", () => {
    render(open());
    const trigger = screen.getByRole("button", { name: "Actions" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens on anchor press and reports the change", async () => {
    const onOpenChange = vi.fn();
    render(
      <DropdownMenu label="Actions" items={basicItems} onOpenChange={onOpenChange}>
        <button type="button">Actions</button>
      </DropdownMenu>
    );

    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("names the menu with the label prop", async () => {
    render(open("Actions"));
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(await screen.findByRole("menu", { name: "Actions" })).toBeInTheDocument();
  });

  it("activates an item and closes the menu", async () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu
        label="Actions"
        items={[{ label: "Edit", onSelect }, { label: "Duplicate", onSelect: () => {} }]}
      >
        <button type="button">Actions</button>
      </DropdownMenu>
    );

    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    const menu = await screen.findByRole("menu");
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Edit" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("opens from the keyboard", async () => {
    render(open());
    const trigger = screen.getByRole("button", { name: "Actions" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByRole("menu")).toBeInTheDocument();
  });

  it("navigates entries with the keyboard and activates the highlighted one", async () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu
        label="Actions"
        items={[{ label: "Edit", onSelect }, { label: "Duplicate", onSelect: () => {} }]}
      >
        <button type="button">Actions</button>
      </DropdownMenu>
    );

    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    const menu = await screen.findByRole("menu");
    // The popup owns roving focus; focus it explicitly so navigation keys apply.
    menu.focus();

    const first = within(menu).getByRole("menuitem", { name: "Edit" });
    const last = within(menu).getByRole("menuitem", { name: "Duplicate" });

    await userEvent.keyboard("{End}");
    await waitFor(() => expect(last).toHaveAttribute("data-highlighted"));
    await userEvent.keyboard("{Home}");
    await waitFor(() => expect(first).toHaveAttribute("data-highlighted"));
    await userEvent.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("moves the highlight with type-ahead", async () => {
    render(open());
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    const menu = await screen.findByRole("menu");
    menu.focus();
    await userEvent.keyboard("D");
    await waitFor(() =>
      expect(within(menu).getByRole("menuitem", { name: "Duplicate" })).toHaveAttribute(
        "data-highlighted"
      )
    );
  });

  it("does not activate a disabled item and keeps the menu open", async () => {
    const onDisabled = vi.fn();
    const onEnabled = vi.fn();
    render(
      <DropdownMenu
        label="Actions"
        items={[
          { label: "Edit", onSelect: onEnabled },
          { label: "Locked", disabled: true, onSelect: onDisabled },
        ]}
      >
        <button type="button">Actions</button>
      </DropdownMenu>
    );

    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    const menu = await screen.findByRole("menu");
    const locked = within(menu).getByRole("menuitem", { name: "Locked" });

    expect(locked).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(locked);

    expect(onDisabled).not.toHaveBeenCalled();
    expect(onEnabled).not.toHaveBeenCalled();
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("renders separators as non-interactive rules", async () => {
    render(
      <DropdownMenu
        label="Actions"
        items={[
          { label: "Edit", onSelect: () => {} },
          { separator: true },
          { label: "Delete", destructive: true, onSelect: () => {} },
        ]}
      >
        <button type="button">Actions</button>
      </DropdownMenu>
    );

    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getAllByRole("separator")).toHaveLength(1);
    // The separator is not part of the keyboard order.
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(2);
  });

  it("opens a submenu and activates a nested item", async () => {
    const onNested = vi.fn();
    render(
      <DropdownMenu
        label="Actions"
        items={[
          { label: "Open", onSelect: () => {} },
          {
            label: "Share",
            items: [
              { label: "Copy link", onSelect: onNested },
              { label: "Email", onSelect: () => {} },
            ],
          },
        ]}
      >
        <button type="button">Actions</button>
      </DropdownMenu>
    );

    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    const menu = await screen.findByRole("menu");
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Share" }));

    await waitFor(() => expect(screen.getAllByRole("menu")).toHaveLength(2));
    const submenu = screen.getAllByRole("menu")[1]!;
    await userEvent.click(within(submenu).getByRole("menuitem", { name: "Copy link" }));

    expect(onNested).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("closes on Escape by default", async () => {
    render(open());
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    await screen.findByRole("menu");

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(screen.getByRole("button", { name: "Actions" })).toHaveFocus();
  });

  it("keeps the menu open on Escape when closeOnEscape is false", async () => {
    render(
      <DropdownMenu label="Actions" items={basicItems} closeOnEscape={false}>
        <button type="button">Actions</button>
      </DropdownMenu>
    );
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    await screen.findByRole("menu");

    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("reflects the requested alignment", async () => {
    render(
      <DropdownMenu label="Actions" items={basicItems} align="end" sideOffset={8}>
        <button type="button">Actions</button>
      </DropdownMenu>
    );
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    const menu = await screen.findByRole("menu");
    expect(menu).toHaveAttribute("data-align", "end");
  });

  it("renders a visible header and divider when label and separator are set", async () => {
    render(
      <DropdownMenu label="Actions" separator items={basicItems}>
        <button type="button">Trigger</button>
      </DropdownMenu>
    );
    await userEvent.click(screen.getByRole("button", { name: "Trigger" }));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("Actions")).toBeInTheDocument();
    expect(within(menu).getAllByRole("separator")).toHaveLength(1);
  });

  it("ignores interaction when disabled", async () => {
    render(
      <DropdownMenu label="Actions" items={basicItems} disabled>
        <button type="button">Actions</button>
      </DropdownMenu>
    );
    const trigger = screen.getByRole("button", { name: "Actions" });
    expect(trigger).toBeDisabled();

    await userEvent.click(trigger);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("supports controlled open state", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            External
          </button>
          <DropdownMenu
            label="Actions"
            items={basicItems}
            open={open}
            onOpenChange={setOpen}
            children={<button type="button">Actions</button>}
          />
        </>
      );
    }
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "External" }));
    expect(await screen.findByRole("menu")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("has no detectable accessibility violations while open", async () => {
    render(
      <DropdownMenu
        label="Actions"
        separator
        items={[
          { label: "Edit", shortcut: "⌘E", onSelect: () => {} },
          { label: "Duplicate", onSelect: () => {} },
          { separator: true },
          { label: "Locked", disabled: true, onSelect: () => {} },
          { label: "Delete", destructive: true, onSelect: () => {} },
        ]}
      >
        <button type="button">Actions</button>
      </DropdownMenu>
    );
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    await screen.findByRole("menu");

    const results = await axe.run(document.body, {
      rules: {
        "color-contrast": { enabled: false },
        region: { enabled: false },
        "landmark-one-main": { enabled: false },
        "page-has-heading-one": { enabled: false },
        "html-has-lang": { enabled: false },
        "document-title": { enabled: false },
      },
    });
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
