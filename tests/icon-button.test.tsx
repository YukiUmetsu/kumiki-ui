import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconButton } from "../src/ui/icon-button";

describe("IconButton", () => {
  it("renders a native button defaulting to type=button with an accessible name", () => {
    render(<IconButton aria-label="Add item">+</IconButton>);
    const button = screen.getByRole("button", { name: "Add item" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
  });

  it("keeps the decorative glyph out of the accessible name", () => {
    render(
      <IconButton aria-label="Add item">
        <svg data-testid="glyph" />
      </IconButton>
    );
    expect(screen.getByTestId("glyph").closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it("calls onClick on pointer and keyboard activation", async () => {
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Press" onClick={onClick}>
        +
      </IconButton>
    );
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
      <IconButton aria-label="Disabled" disabled onClick={onClick}>
        +
      </IconButton>
    );
    const button = screen.getByRole("button", { name: "Disabled" });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("blocks interaction and reports busy while loading", async () => {
    const onClick = vi.fn();
    const { container } = render(
      <IconButton aria-label="Save" isLoading onClick={onClick}>
        +
      </IconButton>
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("data-loading", "");
    expect(container.querySelector("svg.animate-spin")).not.toBeNull();

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("uses loadingLabel as the accessible name while loading", () => {
    render(
      <IconButton aria-label="Save" loadingLabel="Saving" isLoading>
        +
      </IconButton>
    );
    expect(screen.getByRole("button", { name: "Saving" })).toBeInTheDocument();
  });

  it("applies variant and size classes and merges consumer className", () => {
    render(
      <IconButton aria-label="Delete" variant="destructive" size="lg" className="my-class">
        +
      </IconButton>
    );
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.className).toContain("my-class");
    expect(button.className).toContain("size-12");
    expect(button.className).toContain("bg-destructive");
  });

  it("forwards its ref to the button element", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <IconButton aria-label="Ref" ref={ref}>
        +
      </IconButton>
    );
    expect(ref.current).toBe(screen.getByRole("button", { name: "Ref" }));
  });
});
