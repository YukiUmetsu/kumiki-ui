import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "../src/ui/checkbox";

describe("Checkbox", () => {
  it("takes its accessible name from the wrapping label", () => {
    render(<Checkbox label="Accept terms" />);
    expect(screen.getByRole("checkbox")).toHaveAccessibleName("Accept terms");
  });

  it("toggles on click and reports the next value", async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox label="Accept terms" onCheckedChange={onCheckedChange} />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toHaveAttribute("aria-checked", "false");

    await userEvent.click(checkbox);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(checkbox).toHaveAttribute("aria-checked", "true");
  });

  it("links a description without folding it into the accessible name", () => {
    render(<Checkbox label="Email notifications" description="We never share your address" />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toHaveAccessibleName("Email notifications");
    const describedBy = checkbox.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent("We never share your address");
  });

  it("exposes the indeterminate state as mixed", () => {
    render(<Checkbox label="Select all" indeterminate />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "mixed");
  });

  it("is keyboard operable with Space", async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox label="Accept terms" onCheckedChange={onCheckedChange} />);
    await userEvent.tab();
    expect(screen.getByRole("checkbox")).toHaveFocus();
    await userEvent.keyboard(" ");
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("does not change when disabled", async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox label="Locked" disabled onCheckedChange={onCheckedChange} />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(checkbox);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("renders a controlled checkbox from its prop", () => {
    render(<Checkbox label="Pinned" checked readOnly />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
  });

  it("forwards its ref", () => {
    const ref = createRef<HTMLElement>();
    render(<Checkbox label="Ref" ref={ref} />);
    expect(ref.current).not.toBeNull();
  });
});
