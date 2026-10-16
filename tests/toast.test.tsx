import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { ToastProvider, useToast } from "../src/ui/toast";
import type { ToastApi, ToastProviderProps } from "../src/ui/toast";

// jsdom cannot compute rendered colors/layout, so document-level and contrast
// rules are disabled; component semantics (names, roles, associations) stay on.
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

let api: ToastApi | null = null;

function Capture() {
  api = useToast();
  return null;
}

function Harness(props: ToastProviderProps) {
  return (
    <ToastProvider {...props}>
      <Capture />
      <button type="button">Anchor</button>
    </ToastProvider>
  );
}

function setup(props: ToastProviderProps = {}) {
  api = null;
  render(<Harness {...props} />);
  return () => {
    if (!api) throw new Error("toast api was not captured");
    return api;
  };
}

describe("Toast", () => {
  it("shows a notification with a title and message", () => {
    const toast = setup();
    act(() => {
      toast().show({ title: "Saved", message: "Your changes were stored." });
    });

    const dialog = screen.getByRole("dialog", { name: "Saved" });
    expect(dialog).toHaveTextContent("Saved");
    expect(dialog).toHaveTextContent("Your changes were stored.");
  });

  it("falls back to the severity label when a toast has no title", () => {
    const toast = setup();
    act(() => {
      toast().show({ type: "info", message: "Heads up" });
    });

    expect(screen.getByRole("dialog", { name: "Information" })).toHaveTextContent("Heads up");
  });

  it("announces errors urgently and other severities politely", () => {
    const toast = setup();
    act(() => {
      toast().show({ type: "info", title: "Info", message: "Polite" });
    });

    // Low priority: a polite dialog, with no assertive announcement region.
    expect(screen.getByRole("dialog", { name: "Info" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();

    act(() => {
      toast().show({ type: "error", title: "Failed", message: "Try again" });
    });

    const announcement = screen.getByRole("alert");
    expect(announcement).toHaveTextContent("Failed");
    expect(announcement).toHaveTextContent("Try again");
  });

  it("dismisses from the dismiss button and reports it once", async () => {
    const toast = setup();
    const onDismiss = vi.fn();
    act(() => {
      toast().show({ title: "Saved", message: "Stored", onDismiss });
    });

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("runs the action and then dismisses", async () => {
    const toast = setup();
    const action = vi.fn();
    act(() => {
      toast().show({ title: "Archived", message: "Moved", action, actionLabel: "Undo" });
    });

    await userEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(action).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("does not render an action button without an action", () => {
    const toast = setup();
    act(() => {
      toast().show({ title: "Saved", message: "Stored", actionLabel: "Undo" });
    });

    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });

  it("dismisses when the body is pressed and dismissOnClick is set", async () => {
    const toast = setup();
    act(() => {
      toast().show({ title: "Tip", message: "Press me", dismissOnClick: true });
    });

    const dialog = screen.getByRole("dialog", { name: "Tip" });
    await userEvent.click(within(dialog).getByText("Press me"));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("keeps the toast when the body is pressed without dismissOnClick", async () => {
    const toast = setup();
    act(() => {
      toast().show({ title: "Tip", message: "Press me" });
    });

    const dialog = screen.getByRole("dialog", { name: "Tip" });
    await userEvent.click(within(dialog).getByText("Press me"));

    expect(screen.getByRole("dialog", { name: "Tip" })).toBeInTheDocument();
  });

  it("auto-dismisses after autoDismiss seconds", async () => {
    const toast = setup();
    act(() => {
      toast().show({ title: "Upload", message: "Done", autoDismiss: 0.05 });
    });
    expect(screen.getByRole("dialog", { name: "Upload" })).toBeInTheDocument();

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 2000 });
  });

  it("auto-dismisses after timeout milliseconds", async () => {
    const toast = setup();
    act(() => {
      toast().show({ title: "Sync", message: "Done", timeout: 50 });
    });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 2000 });
  });

  it("keeps the toast when autoDismiss is zero", async () => {
    const toast = setup();
    act(() => {
      toast().show({ title: "Sticky", message: "Stays", autoDismiss: 0 });
    });

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(screen.getByRole("dialog", { name: "Sticky" })).toBeInTheDocument();
  });

  it("deduplicates identical notifications", () => {
    const toast = setup();
    act(() => {
      toast().show({ type: "info", title: "Syncing", message: "Updating your items…" });
      toast().show({ type: "info", title: "Syncing", message: "Updating your items…" });
      toast().show({ type: "info", title: "Syncing", message: "Updating your items…" });
    });

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("updates a toast that reuses an id instead of stacking it", () => {
    const toast = setup();
    act(() => {
      toast().show({ id: "sync-job", title: "Syncing", message: "Running" });
      toast().show({ id: "sync-job", title: "Syncing", message: "Finished" });
    });

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "Syncing" })).toHaveTextContent("Finished");
  });

  it("dismisses every toast at once", async () => {
    const toast = setup();
    act(() => {
      toast().show({ title: "First", message: "One" });
      toast().show({ title: "Second", message: "Two" });
    });
    expect(screen.getAllByRole("dialog")).toHaveLength(2);

    act(() => {
      toast().dismissAll();
    });

    await waitFor(() => expect(screen.queryAllByRole("dialog")).toHaveLength(0));
  });

  it("never steals focus from the current task", () => {
    const toast = setup();
    const anchor = screen.getByRole("button", { name: "Anchor" });
    anchor.focus();
    expect(anchor).toHaveFocus();

    act(() => {
      toast().show({ type: "error", title: "Failed", message: "Something went wrong" });
    });

    expect(anchor).toHaveFocus();
  });

  it("throws when useToast is called outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Capture />)).toThrow(/within <ToastProvider>/);
    spy.mockRestore();
  });

  it("has no detectable accessibility violations while a toast is visible", async () => {
    const toast = setup();
    act(() => {
      toast().show({
        type: "success",
        title: "Saved",
        message: "Your changes were stored.",
        actionLabel: "Undo",
        action: () => {},
      });
    });
    expect(screen.getByRole("dialog", { name: "Saved" })).toBeInTheDocument();

    const results = await axe.run(document.body, AXE_OPTIONS);
    expect(results.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
  });
});
