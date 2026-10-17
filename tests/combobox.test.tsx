import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { Combobox } from "../src/ui/combobox";
import type { ComboboxOption, ComboboxSingleProps } from "../src/ui/combobox";

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

const options: ComboboxOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
];

function basic(props: Partial<ComboboxSingleProps> = {}) {
  return (
    <Combobox label="Fruit" options={options} placeholder="Search fruit" {...props} />
  );
}

function highlightedOption(): HTMLElement {
  const option = document.querySelector<HTMLElement>('[role="option"][data-highlighted]');
  expect(option).not.toBeNull();
  return option as HTMLElement;
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

describe("Combobox", () => {
  it("renders a named combobox in the collapsed state", () => {
    render(basic());

    const input = screen.getByRole("combobox", { name: "Fruit" });
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("aria-haspopup", "listbox");
    expect(input).toHaveAttribute("placeholder", "Search fruit");
    expect(input).toHaveValue("");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("opens on click and filters options as the user types", async () => {
    render(basic());
    const input = screen.getByRole("combobox", { name: "Fruit" });

    await userEvent.click(input);
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getAllByRole("option")).toHaveLength(3);
    expect(input).toHaveAttribute("aria-expanded", "true");

    await userEvent.type(input, "ban");

    await waitFor(() =>
      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
        "Banana",
      ])
    );
    expect(screen.queryByRole("option", { name: "Apple" })).toBeNull();
  });

  it("selects an option and reports the exact value", async () => {
    const onValueChange = vi.fn();
    render(basic({ onValueChange }));
    const input = screen.getByRole("combobox", { name: "Fruit" });

    await userEvent.click(input);
    await userEvent.click(await screen.findByRole("option", { name: "Banana" }));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("banana");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(input).toHaveValue("Banana");
  });

  it("keeps the popup open and reports the whole selection in multiple mode", async () => {
    const onValueChange = vi.fn();
    render(
      <Combobox
        label="Fruit"
        options={options}
        multiple
        onValueChange={onValueChange}
      />
    );
    const input = screen.getByRole("combobox", { name: "Fruit" });

    await userEvent.click(input);
    await userEvent.click(await screen.findByRole("option", { name: "Apple" }));
    await userEvent.click(screen.getByRole("option", { name: "Banana" }));

    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange).toHaveBeenLastCalledWith(["apple", "banana"]);

    const apples = screen.getAllByRole("option", { name: "Apple" });
    expect(apples).toHaveLength(1);
    expect(apples[0]).toHaveAttribute("aria-selected", "true");

    const field = document.querySelector<HTMLElement>("[data-km-combobox-field]");
    expect(field).not.toBeNull();
    expect(within(field as HTMLElement).getByText("Apple")).toBeInTheDocument();
    expect(
      within(field as HTMLElement).getByRole("button", { name: "Remove Apple" })
    ).toBeInTheDocument();
  });

  it("moves the highlight with the keyboard and selects with Enter", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(basic({ onValueChange }));
    const input = screen.getByRole("combobox", { name: "Fruit" });

    await user.click(input);
    await screen.findByRole("listbox");

    await user.keyboard("{ArrowDown}");
    await waitFor(() => expect(highlightedOption()).toHaveTextContent("Apple"));
    const first = highlightedOption();

    await user.keyboard("{ArrowDown}");
    await waitFor(() => expect(highlightedOption()).toHaveTextContent("Banana"));
    const second = highlightedOption();
    expect(second).not.toBe(first);
    expect(input).toHaveAttribute("aria-activedescendant", second.id);
    expect(input).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{ArrowUp}");
    await waitFor(() => expect(highlightedOption()).toHaveTextContent("Apple"));

    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("banana");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  });

  it("jumps to the ends with Home and End", async () => {
    const user = userEvent.setup();
    render(basic());
    const input = screen.getByRole("combobox", { name: "Fruit" });

    await user.click(input);
    await screen.findByRole("listbox");

    await user.keyboard("{End}");
    await waitFor(() => expect(highlightedOption()).toHaveTextContent("Cherry"));

    await user.keyboard("{Home}");
    await waitFor(() => expect(highlightedOption()).toHaveTextContent("Apple"));
  });

  it("closes on Escape and leaves focus in the field", async () => {
    render(basic());
    const input = screen.getByRole("combobox", { name: "Fruit" });

    await userEvent.click(input);
    await screen.findByRole("listbox");

    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(input).toHaveFocus();
  });

  it("never selects a disabled option and skips it while navigating", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      basic({
        onValueChange,
        options: [
          { value: "apple", label: "Apple" },
          { value: "banana", label: "Banana", disabled: true },
          { value: "cherry", label: "Cherry" },
        ],
      })
    );
    const input = screen.getByRole("combobox", { name: "Fruit" });

    await user.click(input);
    const banana = await screen.findByRole("option", { name: "Banana" });
    expect(banana).toHaveAttribute("aria-disabled", "true");

    await user.click(banana);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Home}");
    await waitFor(() => expect(highlightedOption()).toHaveTextContent("Apple"));
    await user.keyboard("{ArrowDown}");
    await waitFor(() => expect(highlightedOption()).toHaveTextContent("Cherry"));

    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("cherry");
  });

  it("shows the empty message when the query matches nothing", async () => {
    render(basic());
    const input = screen.getByRole("combobox", { name: "Fruit" });

    await userEvent.click(input);
    await screen.findByRole("listbox");
    await userEvent.type(input, "zzz");

    expect(await screen.findByText("No options found")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("renders group headings and filters inside them", async () => {
    render(
      <Combobox
        label="Produce"
        options={[
          { value: "apple", label: "Apple", group: "Fruit" },
          { value: "banana", label: "Banana", group: "Fruit" },
          { value: "carrot", label: "Carrot", group: "Vegetables" },
          { value: "leek", label: "Leek", group: "Vegetables" },
        ]}
      />
    );
    const input = screen.getByRole("combobox", { name: "Produce" });

    await userEvent.click(input);
    await screen.findByRole("listbox");
    expect(screen.getByText("Fruit")).toBeInTheDocument();
    expect(screen.getByText("Vegetables")).toBeInTheDocument();

    await userEvent.type(input, "car");

    await waitFor(() =>
      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
        "Carrot",
      ])
    );
    expect(screen.queryByText("Fruit")).toBeNull();
    expect(screen.getByText("Vegetables")).toBeInTheDocument();
  });

  it("supports a custom filter", async () => {
    render(basic({ filter: (option) => option.value.startsWith("c") }));
    const input = screen.getByRole("combobox", { name: "Fruit" });

    await userEvent.click(input);
    await screen.findByRole("listbox");
    await userEvent.type(input, "x");

    await waitFor(() =>
      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
        "Cherry",
      ])
    );
  });

  it("does not open when disabled", async () => {
    render(basic({ disabled: true }));
    const input = screen.getByRole("combobox", { name: "Fruit" });

    expect(input).toBeDisabled();
    await userEvent.click(input);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("uses aria-label when no visible label is rendered", () => {
    render(<Combobox options={options} aria-label="Fruit choice" />);
    expect(
      screen.getByRole("combobox", { name: "Fruit choice" })
    ).toBeInTheDocument();
  });

  it("renders a truthful loading state without selectable options", async () => {
    render(basic({ loading: true, options: [] }));
    const input = screen.getByRole("combobox", { name: "Fruit" });

    expect(input).toHaveAttribute("aria-busy", "true");
    expect(document.querySelector("[data-km-combobox]")).toHaveAttribute(
      "data-loading"
    );

    await userEvent.click(input);

    expect(await screen.findByText("Loading options…")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.queryByText("No options found")).toBeNull();
  });

  it("supports a controlled value", async () => {
    function Harness() {
      const [value, setValue] = useState<string | null>("apple");
      return (
        <>
          <span data-testid="state">{value ?? "none"}</span>
          <Combobox
            label="Fruit"
            options={options}
            value={value}
            onValueChange={setValue}
          />
        </>
      );
    }
    render(<Harness />);
    const input = screen.getByRole("combobox", { name: "Fruit" });
    expect(screen.getByTestId("state")).toHaveTextContent("apple");
    expect(input).toHaveValue("Apple");

    await userEvent.click(input);
    await userEvent.click(await screen.findByRole("option", { name: "Cherry" }));

    expect(screen.getByTestId("state")).toHaveTextContent("cherry");
    expect(input).toHaveValue("Cherry");
  });

  it("reflects defaultValue when uncontrolled", () => {
    render(basic({ defaultValue: "banana" }));
    expect(screen.getByRole("combobox", { name: "Fruit" })).toHaveValue("Banana");
  });

  it("forwards the ref to the input and merges className on the wrapper", () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <Combobox
        ref={ref}
        label="Fruit"
        options={options}
        className="custom-combobox"
      />
    );

    const input = screen.getByRole("combobox", { name: "Fruit" });
    expect(ref.current).toBe(input);
    expect(input).toHaveAttribute("data-km-combobox-input");
    const root = document.querySelector("[data-km-combobox]");
    expect(root).toHaveClass("custom-combobox");
  });

  it("has no detectable accessibility violations while open", async () => {
    render(
      <Combobox
        label="Produce"
        options={[
          {
            value: "apple",
            label: "Apple",
            description: "Crisp and sweet",
            group: "Fruit",
          },
          { value: "banana", label: "Banana", disabled: true, group: "Fruit" },
          { value: "carrot", label: "Carrot", group: "Vegetables" },
          { value: "leek", label: "Leek", group: "Vegetables" },
        ]}
      />
    );
    const input = screen.getByRole("combobox", { name: "Produce" });
    await userEvent.click(input);
    await screen.findByRole("listbox");
    await userEvent.type(input, "a");
    await waitFor(() =>
      expect(screen.getAllByRole("option").length).toBeGreaterThan(0)
    );

    const results = await axe.run(document.body, AXE_OPTIONS);
    expect(results.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual(
      []
    );
  });
});
