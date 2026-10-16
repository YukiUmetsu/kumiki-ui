import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "../src/ui/switch";

describe("Switch", () => {
  it("exposes the switch role and an accessible name", () => {
    render(<Switch label="Notifications" />);
    expect(screen.getByRole("switch")).toHaveAccessibleName("Notifications");
  });

  it("links a description without folding it into the accessible name", () => {
    render(<Switch label="Auto-save" description="Saves while you type" />);
    const control = screen.getByRole("switch");
    expect(control).toHaveAccessibleName("Auto-save");
    const describedBy = control.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent("Saves while you type");
  });

  it("toggles on click and reports the next value", async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Notifications" onCheckedChange={onCheckedChange} />);
    const control = screen.getByRole("switch");
    expect(control).toHaveAttribute("aria-checked", "false");

    await userEvent.click(control);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(control).toHaveAttribute("aria-checked", "true");
  });

  it("is keyboard operable with Space", async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Notifications" onCheckedChange={onCheckedChange} />);
    await userEvent.tab();
    expect(screen.getByRole("switch")).toHaveFocus();
    await userEvent.keyboard(" ");
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("does not change when disabled", async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Locked" disabled onCheckedChange={onCheckedChange} />);
    const control = screen.getByRole("switch");
    expect(control).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(control);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("renders a controlled switch from its prop", () => {
    render(<Switch label="Pinned" checked readOnly />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("forwards its ref", () => {
    const ref = createRef<HTMLElement>();
    render(<Switch label="Ref" ref={ref} />);
    expect(ref.current).not.toBeNull();
  });
});
