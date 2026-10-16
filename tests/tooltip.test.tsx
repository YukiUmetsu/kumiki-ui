import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip } from "../src/ui/tooltip";

// floating-ui observes element sizes; jsdom has no ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
  (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ?? ResizeObserverStub;

describe("Tooltip", () => {
  it("shows its content on hover and hides it on unhover", async () => {
    render(
      <Tooltip delay={0} content="Add an item">
        <button type="button">Add</button>
      </Tooltip>
    );
    const trigger = screen.getByRole("button", { name: "Add" });
    expect(screen.queryByText("Add an item")).toBeNull();

    await userEvent.hover(trigger);
    expect(await screen.findByText("Add an item")).toBeInTheDocument();

    await userEvent.unhover(trigger);
    await waitFor(() => expect(screen.queryByText("Add an item")).toBeNull());
  });

  it("shows its content on keyboard focus", async () => {
    render(
      <Tooltip delay={0} content="Save the draft">
        <button type="button">Save</button>
      </Tooltip>
    );
    await userEvent.tab();
    expect(await screen.findByText("Save the draft")).toBeInTheDocument();
  });

  it("dismisses on Escape", async () => {
    render(
      <Tooltip delay={0} content="Add an item">
        <button type="button">Add</button>
      </Tooltip>
    );
    const trigger = screen.getByRole("button", { name: "Add" });
    await userEvent.hover(trigger);
    await screen.findByText("Add an item");

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("Add an item")).toBeNull());
  });

  it("never replaces the trigger's own accessible name", async () => {
    render(
      <Tooltip delay={0} content="Delete this item">
        <button type="button" aria-label="Delete item">
          x
        </button>
      </Tooltip>
    );
    const trigger = screen.getByRole("button", { name: "Delete item" });
    await userEvent.hover(trigger);
    await screen.findByText("Delete this item");
    expect(screen.getByRole("button", { name: "Delete item" })).toBe(trigger);
  });

  it("does not open when disabled", async () => {
    render(
      <Tooltip delay={0} disabled content="Hidden">
        <button type="button">No</button>
      </Tooltip>
    );
    await userEvent.hover(screen.getByRole("button", { name: "No" }));
    await waitFor(() => {
      expect(screen.queryByText("Hidden")).toBeNull();
    });
  });
});
