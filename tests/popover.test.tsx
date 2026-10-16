import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Popover } from "../src/ui/popover";

// floating-ui observes element sizes; jsdom has no ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
  (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ?? ResizeObserverStub;

describe("Popover", () => {
  it("renders nothing while closed", () => {
    render(
      <Popover content="Hidden">
        <button type="button">Open</button>
      </Popover>
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens on trigger press and reports the change", async () => {
    const onOpenChange = vi.fn();
    render(
      <Popover content="Details" onOpenChange={onOpenChange}>
        <button type="button">Open</button>
      </Popover>
    );

    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Details");
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("renders a controlled popover from its open prop", async () => {
    render(
      <Popover open content="Controlled">
        <button type="button">Open</button>
      </Popover>
    );
    const popup = await screen.findByRole("dialog");
    expect(popup).toHaveTextContent("Controlled");
    expect(screen.getByRole("button", { name: "Open" })).toHaveAttribute("aria-expanded", "true");
  });

  it("names the popup surface with the label prop", async () => {
    render(
      <Popover open label="Notifications" content="You are all caught up.">
        <button type="button">Open</button>
      </Popover>
    );
    expect(await screen.findByRole("dialog")).toHaveAccessibleName("Notifications");
  });

  it("forwards aria-describedby to the anchor", () => {
    render(
      <Popover aria-describedby="hint" content="Details">
        <button type="button">Open</button>
      </Popover>
    );
    expect(screen.getByRole("button", { name: "Open" })).toHaveAttribute(
      "aria-describedby",
      "hint"
    );
  });

  it("dismisses on Escape", async () => {
    render(
      <Popover content="Details">
        <button type="button">Open</button>
      </Popover>
    );
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("dismisses on an outside press", async () => {
    render(
      <Popover content="Details">
        <button type="button">Open</button>
      </Popover>
    );
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");

    await userEvent.click(document.body);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("reflects the requested side and align on the positioner", async () => {
    render(
      <Popover open side="top" align="end" content="Details">
        <button type="button">Open</button>
      </Popover>
    );
    await screen.findByRole("dialog");
    const positioner = document.querySelector("[data-km-side]");
    expect(positioner).toHaveAttribute("data-km-side", "top");
    expect(positioner).toHaveAttribute("data-km-align", "end");
  });

  it("opens on hover when a delay is provided", async () => {
    render(
      <Popover delay={0} content="Hover hint">
        <button type="button">Hover</button>
      </Popover>
    );
    const trigger = screen.getByRole("button", { name: "Hover" });
    expect(screen.queryByRole("dialog")).toBeNull();

    await userEvent.hover(trigger);
    expect(await screen.findByRole("dialog")).toHaveTextContent("Hover hint");

    await userEvent.unhover(trigger);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("ignores interaction and leaves the anchor unchanged when disabled", async () => {
    render(
      <Popover disabled content="Hidden">
        <button type="button">No</button>
      </Popover>
    );
    const trigger = screen.getByRole("button", { name: "No" });
    await userEvent.click(trigger);
    await userEvent.hover(trigger);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).not.toHaveAttribute("aria-haspopup");
  });
});
