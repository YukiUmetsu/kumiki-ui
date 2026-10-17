import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { RadioGroup } from "../src/ui/radio-group";

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

describe("RadioGroup", () => {
  it("exposes a labelled radiogroup with named radios", () => {
    render(
      <RadioGroup label="Billing period">
        <RadioGroup.Item value="monthly" label="Monthly" />
        <RadioGroup.Item value="yearly" label="Yearly" />
      </RadioGroup>
    );

    const group = screen.getByRole("radiogroup", { name: "Billing period" });
    expect(group).toHaveAttribute("aria-orientation", "vertical");

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(radios[0]).toHaveAccessibleName("Monthly");
    expect(radios[1]).toHaveAccessibleName("Yearly");
    expect(radios[0]).toHaveAttribute("aria-checked", "false");
  });

  it("selects on click and reports the next value", async () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup label="Billing period" onValueChange={onValueChange}>
        <RadioGroup.Item value="monthly" label="Monthly" />
        <RadioGroup.Item value="yearly" label="Yearly" />
      </RadioGroup>
    );

    await userEvent.click(screen.getByRole("radio", { name: "Yearly" }));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]).toEqual(["yearly"]);
    expect(screen.getByRole("radio", { name: "Yearly" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Monthly" })).toHaveAttribute("aria-checked", "false");
  });

  it("selects when the visible row label is clicked", async () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup label="Billing period" onValueChange={onValueChange}>
        <RadioGroup.Item value="monthly" label="Monthly" />
        <RadioGroup.Item value="yearly" label="Yearly" />
      </RadioGroup>
    );

    await userEvent.click(screen.getByText("Yearly"));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]).toEqual(["yearly"]);
    expect(screen.getByRole("radio", { name: "Yearly" })).toHaveAttribute("aria-checked", "true");
  });

  it("roves vertical focus and selection with wrapping arrows", async () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup label="Billing period" defaultValue="monthly" onValueChange={onValueChange}>
        <RadioGroup.Item value="monthly" label="Monthly" />
        <RadioGroup.Item value="yearly" label="Yearly" />
        <RadioGroup.Item value="lifetime" label="Lifetime" />
      </RadioGroup>
    );

    const monthly = screen.getByRole("radio", { name: "Monthly" });
    const yearly = screen.getByRole("radio", { name: "Yearly" });
    const lifetime = screen.getByRole("radio", { name: "Lifetime" });

    await userEvent.tab();
    expect(monthly).toHaveFocus();

    await userEvent.keyboard("{ArrowDown}");
    expect(yearly).toHaveFocus();
    expect(yearly).toHaveAttribute("aria-checked", "true");
    expect(onValueChange).toHaveBeenLastCalledWith("yearly");

    await userEvent.keyboard("{ArrowUp}");
    expect(monthly).toHaveFocus();
    expect(monthly).toHaveAttribute("aria-checked", "true");

    // Wrapping: ArrowUp from the first enabled item lands on the last one.
    await userEvent.keyboard("{ArrowUp}");
    expect(lifetime).toHaveFocus();
    expect(lifetime).toHaveAttribute("aria-checked", "true");
  });

  it("roves horizontal focus and selection with wrapping arrows", async () => {
    render(
      <RadioGroup label="Contact preference" orientation="horizontal" defaultValue="email">
        <RadioGroup.Item value="email" label="Email" />
        <RadioGroup.Item value="phone" label="Phone" />
        <RadioGroup.Item value="post" label="Post" />
      </RadioGroup>
    );

    expect(screen.getByRole("radiogroup", { name: "Contact preference" })).toHaveAttribute(
      "aria-orientation",
      "horizontal"
    );

    const email = screen.getByRole("radio", { name: "Email" });
    const phone = screen.getByRole("radio", { name: "Phone" });
    const post = screen.getByRole("radio", { name: "Post" });

    await userEvent.tab();
    expect(email).toHaveFocus();

    await userEvent.keyboard("{ArrowRight}");
    expect(phone).toHaveFocus();
    expect(phone).toHaveAttribute("aria-checked", "true");

    await userEvent.keyboard("{ArrowLeft}");
    expect(email).toHaveFocus();

    // Wrapping: ArrowLeft from the first enabled item lands on the last one.
    await userEvent.keyboard("{ArrowLeft}");
    expect(post).toHaveFocus();
    expect(post).toHaveAttribute("aria-checked", "true");
  });

  it("disables every item when the group is disabled", async () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup
        label="Billing period"
        disabled
        defaultValue="monthly"
        onValueChange={onValueChange}
      >
        <RadioGroup.Item value="monthly" label="Monthly" />
        <RadioGroup.Item value="yearly" label="Yearly" />
      </RadioGroup>
    );

    const group = screen.getByRole("radiogroup", { name: "Billing period" });
    expect(group).toHaveAttribute("aria-disabled", "true");

    const radios = screen.getAllByRole("radio");
    for (const radio of radios) {
      expect(radio).toHaveAttribute("data-disabled");
    }

    await userEvent.click(screen.getByRole("radio", { name: "Yearly" }));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "Monthly" })).toHaveAttribute("aria-checked", "true");
  });

  it("skips a disabled item while arrowing and ignores clicks on it", async () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup label="Billing period" defaultValue="monthly" onValueChange={onValueChange}>
        <RadioGroup.Item value="monthly" label="Monthly" />
        <RadioGroup.Item value="yearly" label="Yearly" disabled />
        <RadioGroup.Item value="lifetime" label="Lifetime" />
      </RadioGroup>
    );

    const monthly = screen.getByRole("radio", { name: "Monthly" });
    const yearly = screen.getByRole("radio", { name: "Yearly" });
    const lifetime = screen.getByRole("radio", { name: "Lifetime" });

    expect(yearly).toHaveAttribute("data-disabled");

    await userEvent.click(yearly);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(monthly).toHaveAttribute("aria-checked", "true");

    await userEvent.tab();
    expect(monthly).toHaveFocus();

    await userEvent.keyboard("{ArrowDown}");
    expect(lifetime).toHaveFocus();
    expect(lifetime).toHaveAttribute("aria-checked", "true");

    // The disabled item is skipped in both directions and wrap stays intact.
    await userEvent.keyboard("{ArrowDown}");
    expect(monthly).toHaveFocus();
  });

  it("honours uncontrolled and controlled values", async () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <RadioGroup label="Billing period" defaultValue="monthly" onValueChange={onValueChange}>
        <RadioGroup.Item value="monthly" label="Monthly" />
        <RadioGroup.Item value="yearly" label="Yearly" />
      </RadioGroup>
    );

    expect(screen.getByRole("radio", { name: "Monthly" })).toHaveAttribute("aria-checked", "true");

    await userEvent.click(screen.getByRole("radio", { name: "Yearly" }));
    expect(screen.getByRole("radio", { name: "Yearly" })).toHaveAttribute("aria-checked", "true");

    rerender(
      <RadioGroup label="Billing period" value="monthly" onValueChange={onValueChange}>
        <RadioGroup.Item value="monthly" label="Monthly" />
        <RadioGroup.Item value="yearly" label="Yearly" />
      </RadioGroup>
    );

    await userEvent.click(screen.getByRole("radio", { name: "Yearly" }));
    expect(onValueChange).toHaveBeenLastCalledWith("yearly");
    // A controlled group renders the prop, not the last interaction.
    expect(screen.getByRole("radio", { name: "Monthly" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Yearly" })).toHaveAttribute("aria-checked", "false");

    rerender(
      <RadioGroup label="Billing period" value="yearly" onValueChange={onValueChange}>
        <RadioGroup.Item value="monthly" label="Monthly" />
        <RadioGroup.Item value="yearly" label="Yearly" />
      </RadioGroup>
    );
    expect(screen.getByRole("radio", { name: "Yearly" })).toHaveAttribute("aria-checked", "true");
  });

  it("submits the selected value through a native radio input", () => {
    const { container } = render(
      <form>
        <RadioGroup name="billing" label="Billing period" defaultValue="yearly">
          <RadioGroup.Item value="monthly" label="Monthly" />
          <RadioGroup.Item value="yearly" label="Yearly" />
        </RadioGroup>
      </form>
    );

    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    expect(new FormData(form as HTMLFormElement).get("billing")).toBe("yearly");

    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(inputs).toHaveLength(2);
    expect(inputs[1].checked).toBe(true);
  });

  it("associates an item description without folding it into the name", () => {
    render(
      <RadioGroup label="Billing period">
        <RadioGroup.Item value="monthly" label="Monthly" description="Billed every month." />
      </RadioGroup>
    );

    const radio = screen.getByRole("radio", { name: "Monthly" });
    const describedBy = radio.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent("Billed every month.");
  });

  it("associates description and error with the group and marks it invalid", () => {
    render(
      <RadioGroup
        label="Billing period"
        description="You can change this later."
        error="Choose a billing period."
      >
        <RadioGroup.Item value="monthly" label="Monthly" />
        <RadioGroup.Item value="yearly" label="Yearly" />
      </RadioGroup>
    );

    const group = screen.getByRole("radiogroup", { name: "Billing period" });
    expect(group).toHaveAttribute("aria-invalid", "true");

    const describedBy = group.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!.split(" ")[0])).toHaveTextContent(
      "You can change this later."
    );

    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Choose a billing period.");
    expect(describedBy).toContain(error.id);
  });

  it("forwards refs to the group and item hosts", () => {
    const groupRef = createRef<HTMLDivElement>();
    const itemRef = createRef<HTMLElement>();

    render(
      <RadioGroup ref={groupRef} label="Billing period">
        <RadioGroup.Item ref={itemRef} value="monthly" label="Monthly" />
      </RadioGroup>
    );

    expect(groupRef.current).toBeInstanceOf(HTMLDivElement);
    expect(groupRef.current).toHaveAttribute("role", "radiogroup");
    expect(itemRef.current).not.toBeNull();
    expect(itemRef.current).toHaveAttribute("role", "radio");
  });

  it("merges consumer class names on the wrapper and the item", () => {
    const { container } = render(
      <RadioGroup label="Billing period" className="custom-group">
        <RadioGroup.Item value="monthly" label="Monthly" className="custom-item" />
      </RadioGroup>
    );

    expect(screen.getByRole("radiogroup").parentElement).toHaveClass("custom-group");
    expect(container.querySelector('[data-part="item-field"]')).toHaveClass("custom-item");
  });

  it("has no detectable accessibility violations in a complete state", async () => {
    render(
      <RadioGroup
        label="Billing period"
        description="You can change this later."
        error="Choose a billing period."
        defaultValue="monthly"
      >
        <RadioGroup.Item value="monthly" label="Monthly" description="Billed every month." />
        <RadioGroup.Item value="yearly" label="Yearly" />
        <RadioGroup.Item value="lifetime" label="Lifetime" disabled />
      </RadioGroup>
    );

    await expectNoViolations(document.body);
  });
});
