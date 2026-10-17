import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { CommandPalette } from "../src/ui/command-palette";
import type { CommandPaletteCommand, CommandPaletteProps } from "../src/ui/command-palette";

// Base UI dialogs measure their popup; jsdom has no ResizeObserver and no
// scrollIntoView, so stub both.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
  (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ?? ResizeObserverStub;
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

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

type HarnessProps = Omit<CommandPaletteProps, "open" | "onOpenChange" | "commands"> & {
  commands: CommandPaletteCommand[];
  initialOpen?: boolean;
};

function Harness({ initialOpen = true, commands, ...props }: HarnessProps) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open palette
      </button>
      <CommandPalette
        {...props}
        commands={commands}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

/**
 * Base UI moves focus to the search field after the dialog mounts (on a frame
 * boundary). Keyboard assertions must wait for that, otherwise `userEvent`
 * dispatches the key to `<body>`.
 */
async function focusedInput(): Promise<HTMLElement> {
  const input = await screen.findByRole("combobox");
  await waitFor(() => expect(input).toHaveFocus());
  return input;
}

function makeCommands(overrides: {
  onNew?: () => void;
  onOpen?: () => void;
  onSettings?: () => void;
  onDisabled?: () => void;
} = {}): CommandPaletteCommand[] {
  return [
    {
      id: "new",
      label: "New file",
      group: "File",
      keywords: ["create"],
      shortcut: "⌘N",
      onSelect: overrides.onNew ?? (() => {}),
    },
    {
      id: "open",
      label: "Open file",
      group: "File",
      keywords: ["browse"],
      shortcut: "⌘O",
      onSelect: overrides.onOpen ?? (() => {}),
    },
    {
      id: "settings",
      label: "Settings",
      group: "Preferences",
      keywords: ["preferences", "theme"],
      onSelect: overrides.onSettings ?? (() => {}),
    },
    {
      id: "locked",
      label: "Locked command",
      group: "Preferences",
      disabled: true,
      onSelect: overrides.onDisabled ?? (() => {}),
    },
  ];
}

describe("CommandPalette", () => {
  it("renders nothing while closed", () => {
    render(<Harness commands={makeCommands()} initialOpen={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders a labelled modal with a combobox and a close button", async () => {
    render(<Harness commands={makeCommands()} />);

    const dialog = await screen.findByRole("dialog", { name: "Command palette" });
    expect(dialog).toHaveAttribute("aria-modal", "true");

    const input = screen.getByRole("combobox", { name: "Command palette" });
    expect(input).toHaveAttribute("placeholder", "Search commands…");
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();

    await waitFor(() => expect(input).toHaveFocus());
  });

  it("renders groups with accessible group labels", async () => {
    render(<Harness commands={makeCommands()} />);
    const list = await screen.findByRole("listbox");

    expect(within(list).getByRole("group", { name: "File" })).toBeInTheDocument();
    expect(within(list).getByRole("group", { name: "Preferences" })).toBeInTheDocument();
    expect(within(list).getAllByRole("option")).toHaveLength(4);
  });

  it("filters commands by label and keywords, case-insensitively", async () => {
    render(<Harness commands={makeCommands()} />);
    const input = await screen.findByRole("combobox");

    await userEvent.type(input, "new");
    expect(screen.getByRole("option", { name: "New file" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Open file" })).toBeNull();

    await userEvent.clear(input);
    await userEvent.type(input, "CREATE");
    expect(screen.getByRole("option", { name: "New file" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Settings" })).toBeNull();

    await userEvent.clear(input);
    await userEvent.type(input, "theme");
    expect(screen.getByRole("option", { name: "Settings" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "New file" })).toBeNull();
  });

  it("moves the highlight with Arrow keys, Home and End, skipping disabled commands", async () => {
    render(<Harness commands={makeCommands()} />);
    const input = await focusedInput();
    const options = screen.getAllByRole("option");

    expect(input).toHaveAttribute("aria-activedescendant", options[0]!.id);

    await userEvent.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", options[1]!.id);

    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{ArrowDown}");
    // The disabled command is last; movement clamps at the last enabled option.
    expect(input).toHaveAttribute("aria-activedescendant", options[2]!.id);

    await userEvent.keyboard("{End}");
    expect(input).toHaveAttribute("aria-activedescendant", options[2]!.id);
    await userEvent.keyboard("{Home}");
    expect(input).toHaveAttribute("aria-activedescendant", options[0]!.id);

    const locked = screen.getByRole("option", { name: "Locked command" });
    expect(locked).toHaveAttribute("aria-disabled", "true");
    expect(locked).toHaveAttribute("data-disabled");
  });

  it("wires the combobox to the listbox and its active option", async () => {
    render(<Harness commands={makeCommands()} />);
    const input = await focusedInput();
    const list = screen.getByRole("listbox");
    const options = screen.getAllByRole("option");

    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-controls", list.id);
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input).toHaveAttribute("aria-activedescendant", options[0]!.id);
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    await userEvent.keyboard("{ArrowDown}");
    expect(options[0]).toHaveAttribute("aria-selected", "false");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
  });

  it("runs the highlighted command exactly once and closes", async () => {
    const onNew = vi.fn();
    const onOpen = vi.fn();
    render(<Harness commands={makeCommands({ onNew, onOpen })} />);
    await focusedInput();

    await userEvent.keyboard("{Enter}");

    expect(onNew).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("runs a clicked command exactly once and closes", async () => {
    const onOpen = vi.fn();
    render(<Harness commands={makeCommands({ onOpen })} />);
    await screen.findByRole("combobox");

    await userEvent.click(screen.getByRole("option", { name: "Open file" }));

    expect(onOpen).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("never runs a disabled command", async () => {
    const onDisabled = vi.fn();
    render(<Harness commands={makeCommands({ onDisabled })} />);
    const input = await screen.findByRole("combobox");

    await userEvent.click(screen.getByRole("option", { name: "Locked command" }));
    expect(onDisabled).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.type(input, "locked");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await userEvent.keyboard("{Enter}");

    expect(onDisabled).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes on Escape and restores focus to the previously focused element", async () => {
    render(<Harness commands={makeCommands()} initialOpen={false} />);
    const trigger = screen.getByRole("button", { name: "Open palette" });

    await userEvent.click(trigger);
    await focusedInput();

    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("shows the empty message when nothing matches", async () => {
    render(
      <Harness
        commands={makeCommands()}
        emptyMessage="Nothing matches that search."
      />
    );
    const input = await screen.findByRole("combobox");

    await userEvent.type(input, "zzzz");

    expect(await screen.findByText("Nothing matches that search.")).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("shows a truthful loading state without stale results", async () => {
    render(<Harness commands={makeCommands()} loading />);

    const dialog = await screen.findByRole("dialog", { name: "Command palette" });
    expect(dialog).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading commands…")).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.queryByText("No commands found.")).toBeNull();

    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).not.toHaveAttribute("aria-controls");
    expect(input).not.toHaveAttribute("aria-activedescendant");
  });

  it("forwards a ref to the search input and merges className onto the panel", async () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <CommandPalette
        ref={ref}
        open
        onOpenChange={() => {}}
        commands={makeCommands()}
        className="consumer-panel"
      />
    );

    await screen.findByRole("dialog");
    expect(ref.current).toBeInstanceOf(HTMLInputElement);

    const panel = document.querySelector("[data-km-command-palette]");
    expect(panel).not.toBeNull();
    expect(panel).toHaveClass("consumer-panel");
    expect(panel).toHaveClass("bg-surface-floating");
    expect(panel).toHaveClass("shadow");
  });

  it("has no detectable accessibility violations while open", async () => {
    render(
      <Harness
        commands={[
          ...makeCommands(),
          {
            id: "url",
            label: "https://example.com/files/reports/quarterly-summary-final.pdf",
            group: "Recent",
            onSelect: () => {},
          },
        ]}
      />
    );

    await screen.findByRole("dialog", { name: "Command palette" });
    await focusedInput();
    await userEvent.keyboard("{ArrowDown}");

    await expectNoViolations(document.body);
  });
});
