import { createRef, useState } from "react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { Listbox } from "../src/ui/listbox";
import type { ListboxOption } from "../src/ui/listbox";

const options: ListboxOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
];

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

function basic(props: Partial<ComponentProps<typeof Listbox>> = {}) {
  return (
    <Listbox
      {...(props as ComponentProps<typeof Listbox>)}
      label="Fruit"
      options={options}
    />
  );
}

describe("Listbox", () => {
  it("exposes a named listbox with named options", () => {
    render(basic({ defaultValue: "apple" }));

    const listbox = screen.getByRole("listbox", { name: "Fruit" });
    expect(listbox).toHaveAttribute("data-km-listbox");
    expect(listbox).not.toHaveAttribute("aria-multiselectable");
    expect(within(listbox).getAllByRole("option")).toHaveLength(3);
    expect(screen.getByRole("option", { name: "Apple" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("option", { name: "Banana" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("renders labelled groups with their own accessible names", () => {
    render(
      <Listbox
        label="Fruit by family"
        selectionMode="multiple"
        options={[
          { value: "apple", label: "Apple", group: "Orchard fruit" },
          { value: "pear", label: "Pear", group: "Orchard fruit" },
          { value: "lemon", label: "Lemon", group: "Citrus" },
          { value: "lime", label: "Lime", group: "Citrus" },
        ]}
      />
    );

    const listbox = screen.getByRole("listbox", { name: "Fruit by family" });
    expect(listbox).toHaveAttribute("aria-multiselectable", "true");
    expect(within(listbox).getAllByRole("group")).toHaveLength(2);

    const orchard = screen.getByRole("group", { name: "Orchard fruit" });
    expect(within(orchard).getAllByRole("option")).toHaveLength(2);
    expect(screen.getByRole("group", { name: "Citrus" })).toBeInTheDocument();
  });

  it("names the option by its content, including the description", () => {
    render(
      <Listbox
        label="Delivery speed"
        options={[
          {
            value: "express",
            label: "Express",
            description: "Arrives the next business day before noon.",
          },
        ]}
      />
    );

    const option = screen.getByRole("option", {
      name: /Express.*Arrives the next business day before noon\./s,
    });
    expect(option).not.toHaveAttribute("aria-describedby");
    expect(option).toHaveAccessibleName(
      /Express.*Arrives the next business day before noon\./s
    );
  });

  it("selects one value and reports the exact payload", async () => {
    const onValueChange = vi.fn();
    render(basic({ onValueChange }));

    await userEvent.click(screen.getByRole("option", { name: "Banana" }));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("banana");
    expect(screen.getByRole("option", { name: "Banana" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("option", { name: "Apple" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("toggles multiple values and reports the complete selection", async () => {
    const onValueChange = vi.fn();
    render(basic({ selectionMode: "multiple", onValueChange }));

    await userEvent.click(screen.getByRole("option", { name: "Apple" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["apple"]);

    await userEvent.click(screen.getByRole("option", { name: "Cherry" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["apple", "cherry"]);

    await userEvent.click(screen.getByRole("option", { name: "Apple" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["cherry"]);
    expect(screen.getByRole("option", { name: "Apple" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("moves the active option with arrows, Home and End", async () => {
    const user = userEvent.setup();
    render(basic());

    const listbox = screen.getByRole("listbox", { name: "Fruit" });
    const apple = screen.getByRole("option", { name: "Apple" });
    const banana = screen.getByRole("option", { name: "Banana" });
    const cherry = screen.getByRole("option", { name: "Cherry" });

    listbox.focus();
    expect(listbox).toHaveAttribute("aria-activedescendant", apple.id);

    await user.keyboard("{ArrowDown}");
    expect(listbox).toHaveAttribute("aria-activedescendant", banana.id);

    await user.keyboard("{End}");
    expect(listbox).toHaveAttribute("aria-activedescendant", cherry.id);

    await user.keyboard("{Home}");
    expect(listbox).toHaveAttribute("aria-activedescendant", apple.id);

    await user.keyboard("{ArrowUp}");
    expect(listbox).toHaveAttribute("aria-activedescendant", apple.id);
  });

  it("skips disabled options while moving and never selects them", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Listbox
        label="Fruit"
        options={[
          { value: "apple", label: "Apple" },
          { value: "banana", label: "Banana", disabled: true },
          { value: "cherry", label: "Cherry" },
        ]}
        onValueChange={onValueChange}
      />
    );

    const listbox = screen.getByRole("listbox", { name: "Fruit" });
    const banana = screen.getByRole("option", { name: "Banana" });
    const cherry = screen.getByRole("option", { name: "Cherry" });

    expect(banana).toHaveAttribute("aria-disabled", "true");

    await userEvent.click(banana);
    expect(onValueChange).not.toHaveBeenCalled();

    listbox.focus();
    await user.keyboard("{ArrowDown}");
    expect(listbox).toHaveAttribute("aria-activedescendant", cherry.id);

    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("cherry");
  });

  it("jumps to a matching option with type-ahead", async () => {
    const user = userEvent.setup();
    render(basic());

    const listbox = screen.getByRole("listbox", { name: "Fruit" });
    listbox.focus();

    await user.keyboard("c");
    expect(listbox).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: "Cherry" }).id
    );
  });

  it("skips disabled matches during type-ahead", async () => {
    const user = userEvent.setup();
    render(
      <Listbox
        label="Fruit"
        options={[
          { value: "apple", label: "Apple" },
          { value: "banana", label: "Banana", disabled: true },
          { value: "blackberry", label: "Blackberry" },
        ]}
      />
    );

    const listbox = screen.getByRole("listbox", { name: "Fruit" });
    listbox.focus();

    await user.keyboard("b");
    expect(listbox).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: "Blackberry" }).id
    );
  });

  it("selects with Enter in single mode", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(basic({ onValueChange }));

    screen.getByRole("listbox", { name: "Fruit" }).focus();
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onValueChange).toHaveBeenCalledWith("banana");
  });

  it("toggles with Space in multiple mode", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(basic({ selectionMode: "multiple", onValueChange }));

    screen.getByRole("listbox", { name: "Fruit" }).focus();
    await user.keyboard(" ");
    expect(onValueChange).toHaveBeenLastCalledWith(["apple"]);

    await user.keyboard("{ArrowDown}");
    await user.keyboard(" ");
    expect(onValueChange).toHaveBeenLastCalledWith(["apple", "banana"]);
  });

  it("supports a controlled single value", async () => {
    function Harness() {
      const [value, setValue] = useState<string | null>("apple");
      return (
        <>
          <span data-testid="state">{value ?? "none"}</span>
          <Listbox
            label="Fruit"
            options={options}
            value={value}
            onValueChange={setValue}
          />
        </>
      );
    }

    render(<Harness />);
    expect(screen.getByTestId("state")).toHaveTextContent("apple");

    await userEvent.click(screen.getByRole("option", { name: "Cherry" }));

    expect(screen.getByTestId("state")).toHaveTextContent("cherry");
    expect(screen.getByRole("option", { name: "Cherry" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("supports controlled multiple values", async () => {
    function Harness() {
      const [value, setValue] = useState<string[]>(["apple"]);
      return (
        <>
          <span data-testid="state">{value.join(",")}</span>
          <Listbox
            label="Fruit"
            options={options}
            selectionMode="multiple"
            value={value}
            onValueChange={setValue}
          />
        </>
      );
    }

    render(<Harness />);

    await userEvent.click(screen.getByRole("option", { name: "Cherry" }));
    expect(screen.getByTestId("state")).toHaveTextContent("apple,cherry");

    await userEvent.click(screen.getByRole("option", { name: "Apple" }));
    expect(screen.getByTestId("state")).toHaveTextContent("cherry");
  });

  it("applies defaultValue and keeps the selection internally when uncontrolled", async () => {
    render(basic({ defaultValue: "banana" }));

    expect(screen.getByRole("option", { name: "Banana" })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    await userEvent.click(screen.getByRole("option", { name: "Cherry" }));

    expect(screen.getByRole("option", { name: "Cherry" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("option", { name: "Banana" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("forwards the ref to the listbox element and merges className", () => {
    const ref = createRef<HTMLDivElement>();
    render(basic({ ref, className: "custom-listbox" }));

    const listbox = screen.getByRole("listbox", { name: "Fruit" });
    expect(ref.current).toBe(listbox);
    expect(listbox).toHaveClass("custom-listbox");
    expect(listbox).toHaveClass("bg-surface");
  });

  it("makes the whole listbox non-interactive when disabled", async () => {
    const onValueChange = vi.fn();
    render(basic({ disabled: true, onValueChange }));

    const listbox = screen.getByRole("listbox", { name: "Fruit" });
    expect(listbox).toHaveAttribute("aria-disabled", "true");
    expect(listbox).toHaveAttribute("tabindex", "-1");

    await userEvent.click(screen.getByRole("option", { name: "Banana" }));
    expect(onValueChange).not.toHaveBeenCalled();

    listbox.focus();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("has no detectable accessibility violations in a grouped, multiple, described state", async () => {
    render(
      <Listbox
        label="Fruit"
        selectionMode="multiple"
        defaultValue={["apple"]}
        options={[
          {
            value: "apple",
            label: "Apple",
            description: "Crisp and sweet.",
            group: "Orchard fruit",
          },
          { value: "pear", label: "Pear", group: "Orchard fruit" },
          { value: "lemon", label: "Lemon", group: "Citrus" },
          {
            value: "banana",
            label: "Banana",
            description: "Currently unavailable.",
            disabled: true,
            group: "Tropical",
          },
        ]}
      />
    );

    await expectNoViolations(document.body);
  });
});
