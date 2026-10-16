import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../src/ui/button";

describe("Button", () => {
  it("renders a native button with default variant and size", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "button");
    expect(button.tagName).toBe("BUTTON");
    expect(button).not.toBeDisabled();
  });

  it("respects an explicit submit type inside a form", () => {
    render(
      <form>
        <Button type="submit">Send</Button>
      </form>
    );
    expect(screen.getByRole("button", { name: "Send" })).toHaveAttribute("type", "submit");
  });

  it("calls onClick on click and on keyboard activation", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Press</Button>);
    const button = screen.getByRole("button", { name: "Press" });

    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);

    button.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>
    );
    const button = screen.getByRole("button", { name: "Disabled" });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("exposes a stable label, spinner and aria-busy while loading", () => {
    const { container, rerender } = render(<Button isLoading>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });

    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("data-loading", "");
    expect(container.querySelector("svg.animate-spin")).not.toBeNull();
    // The original label stays mounted so the control width does not jump.
    expect(screen.getByText("Save")).toBeInTheDocument();

    rerender(
      <Button isLoading loadingLabel="Saving…">
        Save
      </Button>
    );
    expect(screen.getByRole("button", { name: "Saving…" })).toBeInTheDocument();
  });

  it("applies loadingLabel only while loading and keeps the child label otherwise", () => {
    const { rerender } = render(
      <Button isLoading={false} loadingLabel="Saving…">
        Save
      </Button>
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();

    rerender(
      <Button isLoading loadingLabel="Saving…">
        Save
      </Button>
    );
    expect(screen.getByRole("button", { name: "Saving…" })).toBeInTheDocument();
  });

  it("hides the leading icon while loading", () => {
    const { container, rerender } = render(
      <Button icon={<span data-testid="icon">+</span>}>Add</Button>
    );
    expect(container.querySelector('[data-testid="icon"]')).not.toBeNull();

    rerender(
      <Button icon={<span data-testid="icon">+</span>} isLoading>
        Add
      </Button>
    );
    expect(container.querySelector('[data-testid="icon"]')).toBeNull();
    expect(container.querySelector("svg.animate-spin")).not.toBeNull();
  });

  it("supports icon-only usage through aria-label", () => {
    render(
      <Button size="icon" aria-label="Add item">
        +
      </Button>
    );
    expect(screen.getByRole("button", { name: "Add item" })).toBeInTheDocument();
  });

  it("applies variant and size classes and merges consumer className", () => {
    render(
      <Button variant="destructive" size="lg" className="my-custom-class">
        Delete
      </Button>
    );
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.className).toContain("my-custom-class");
    expect(button.className).toContain("h-12");
    expect(button.className).toContain("bg-destructive");
  });

  it("forwards its ref to the underlying button element", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toBe(screen.getByRole("button", { name: "Ref" }));
  });

  it("forwards arbitrary DOM props", () => {
    render(
      <Button data-analytics="save" name="save">
        Save
      </Button>
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("data-analytics", "save");
    expect(button).toHaveAttribute("name", "save");
  });
});
