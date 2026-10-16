import { useState } from "react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { Select } from "../src/ui/select";
import type { SelectOption, SelectSearchInputRenderProps } from "../src/ui/select";

// floating-ui observes element sizes; jsdom has no ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
  (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ?? ResizeObserverStub;

// Base UI scrolls the highlighted option into view; jsdom has no implementation.
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

const options: SelectOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
];

function basic(props: Partial<ComponentProps<typeof Select>> = {}) {
  return <Select label="Fruit" options={options} placeholder="Select a fruit" {...props} />;
}

describe("Select", () => {
  it("renders the trigger with the label and placeholder", () => {
    render(basic());
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(within(trigger).getByText("Select a fruit")).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("opens the listbox and exposes options", async () => {
    render(basic());
    await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getAllByRole("option")).toHaveLength(3);
    expect(screen.getByRole("option", { name: "Apple" })).toBeInTheDocument();
  });

  it("selects an option and reports the value", async () => {
    const onValueChange = vi.fn();
    render(basic({ onValueChange }));
    const trigger = screen.getByRole("combobox", { name: "Fruit" });

    await userEvent.click(trigger);
    await screen.findByRole("listbox");
    await userEvent.click(screen.getByRole("option", { name: "Banana" }));

    expect(onValueChange).toHaveBeenCalledWith("banana");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(within(trigger).getByText("Banana")).toBeInTheDocument();
  });

  it("reflects defaultValue on the trigger", () => {
    render(basic({ defaultValue: "cherry" }));
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    expect(within(trigger).getByText("Cherry")).toBeInTheDocument();
    expect(within(trigger).queryByText("Select a fruit")).toBeNull();
  });

  it("does not open when disabled", async () => {
    render(basic({ disabled: true }));
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    expect(trigger).toBeDisabled();
    await userEvent.click(trigger);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("does not select a disabled option", async () => {
    const onValueChange = vi.fn();
    render(
      basic({
        onValueChange,
        options: [
          { value: "apple", label: "Apple" },
          { value: "banana", label: "Banana", disabled: true },
        ],
      })
    );
    await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
    const banana = await screen.findByRole("option", { name: "Banana" });
    expect(banana).toHaveAttribute("aria-disabled", "true");

    await userEvent.click(banana);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  });

  it("opens and navigates with the keyboard", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(basic({ onValueChange }));
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    trigger.focus();

    await user.keyboard("{Enter}");
    const listbox = await screen.findByRole("listbox");

    // Focus the first option explicitly so navigation keys are delivered to the
    // list regardless of when the floating focus manager settles.
    within(listbox).getByRole("option", { name: "Apple" }).focus();
    const last = within(listbox).getByRole("option", { name: "Cherry" });
    await user.keyboard("{End}");
    await waitFor(() => expect(last).toHaveAttribute("data-highlighted"));

    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("cherry");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    render(basic());
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    await userEvent.click(trigger);
    await screen.findByRole("listbox");

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(trigger).toHaveFocus();
  });

  it("supports a controlled value", async () => {
    function Harness() {
      const [value, setValue] = useState<string | null>("apple");
      return (
        <>
          <span data-testid="state">{value ?? "none"}</span>
          <Select label="Fruit" options={options} value={value} onValueChange={setValue} />
        </>
      );
    }
    render(<Harness />);
    expect(screen.getByTestId("state")).toHaveTextContent("apple");

    await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
    await screen.findByRole("listbox");
    await userEvent.click(screen.getByRole("option", { name: "Cherry" }));

    expect(screen.getByTestId("state")).toHaveTextContent("cherry");
  });

  it("filters options when searchable", async () => {
    render(
      basic({
        searchable: true,
        searchPlaceholder: "Filter fruit…",
        options: [
          ...options,
          { value: "dragonfruit", label: "Dragon fruit" },
        ],
      })
    );
    await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
    await screen.findByRole("listbox");

    const search = screen.getByRole("textbox", { name: "Search Fruit" });
    await userEvent.type(search, "drag");

    await waitFor(() =>
      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
        "Dragon fruit",
      ])
    );
    expect(screen.queryByRole("option", { name: "Apple" })).toBeNull();
  });

  it("shows an empty state when the filter matches nothing", async () => {
    render(basic({ searchable: true }));
    await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
    await screen.findByRole("listbox");

    await userEvent.type(screen.getByRole("textbox", { name: "Search Fruit" }), "zzz");

    expect(await screen.findByText("No options found")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("resets the filter when reopened", async () => {
    render(basic({ searchable: true }));
    const trigger = screen.getByRole("combobox", { name: "Fruit" });

    await userEvent.click(trigger);
    await screen.findByRole("listbox");
    await userEvent.type(screen.getByRole("textbox", { name: "Search Fruit" }), "zzz");
    await screen.findByText("No options found");

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());

    await userEvent.click(trigger);
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getAllByRole("option")).toHaveLength(3);
  });

  it("renders a custom search input", async () => {
    render(
      basic({
        searchable: true,
        searchInput: (props: SelectSearchInputRenderProps) => (
          <input
            data-testid="custom-search"
            id={props.id}
            type="text"
            value={props.value}
            aria-label={props["aria-label"]}
            onChange={(event) => props.onValueChange(event.target.value)}
          />
        ),
      })
    );
    await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
    await screen.findByRole("listbox");

    await userEvent.type(screen.getByTestId("custom-search"), "ban");
    await waitFor(() =>
      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Banana"])
    );
  });

  it("has no detectable accessibility violations while open", async () => {
    render(
      basic({
        searchable: true,
        options: [
          { value: "apple", label: "Apple" },
          { value: "banana", label: "Banana", disabled: true },
          { value: "cherry", label: "Cherry" },
        ],
      })
    );
    await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
    await screen.findByRole("listbox");

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
