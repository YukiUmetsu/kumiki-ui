import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { ProcessMonitor } from "../src/patterns/process-monitor";
import type {
  ProcessMonitorProps,
  ProcessMonitorStage,
  ProcessMonitorStageStatus,
} from "../src/patterns/process-monitor";

const stages: ProcessMonitorStage[] = [
  { id: "prepare", label: "Prepare", description: "Collect the source files." },
  { id: "upload", label: "Upload" },
  { id: "process", label: "Process" },
  { id: "verify", label: "Verify" },
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
  expect(
    results.violations.map((violation) => `${violation.id}: ${violation.help}`)
  ).toEqual([]);
}

function basic(props: Partial<ProcessMonitorProps> = {}) {
  return (
    <ProcessMonitor
      stages={stages}
      stageStatus={{
        prepare: "done",
        upload: "active",
        process: "pending",
        verify: "pending",
      }}
      status="running"
      {...props}
    />
  );
}

function statusRecord(
  overrides: Record<string, ProcessMonitorStageStatus>
): Record<string, ProcessMonitorStageStatus> {
  return { prepare: "done", upload: "done", process: "pending", verify: "pending", ...overrides };
}

describe("ProcessMonitor", () => {
  it("renders every stage and their descriptions", () => {
    const { container } = render(basic());

    const list = container.querySelector('[data-part="stages"]');
    expect(list).not.toBeNull();
    expect(within(list as HTMLElement).getAllByRole("listitem")).toHaveLength(4);
    expect(within(list as HTMLElement).getByText("Prepare")).toBeInTheDocument();
    expect(within(list as HTMLElement).getByText("Collect the source files.")).toBeInTheDocument();
    expect(within(list as HTMLElement).getByText("Verify")).toBeInTheDocument();
  });

  it("marks the active stage both visually and programmatically", () => {
    const { container } = render(basic());

    const active = container.querySelector('[data-part="stage"][data-status="active"]');
    expect(active).not.toBeNull();
    expect(active).toHaveAttribute("aria-current", "step");
    expect(within(active as HTMLElement).getByText("Running")).toBeInTheDocument();

    // The non-active stages are not marked current.
    expect(
      container.querySelectorAll('[data-part="stage"][aria-current]')
    ).toHaveLength(1);
  });

  it("pairs each stage status with a status word, never colour alone", () => {
    render(basic());

    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getAllByText("Waiting")).toHaveLength(2);
  });

  it("renders indeterminate progress and never a fabricated percentage when progress is undefined", () => {
    const { container } = render(basic({ progress: undefined }));

    const bar = screen.getByRole("progressbar", { name: "Progress" });
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar).not.toHaveAttribute("aria-valuetext");
    expect(container.querySelector('[data-mode="indeterminate"]')).not.toBeNull();
    expect(container.textContent).not.toMatch(/%/);
  });

  it("renders determinate progress when a fraction is provided", () => {
    render(basic({ progress: 0.5 }));

    const bar = screen.getByRole("progressbar", { name: "Progress" });
    expect(bar).toHaveAttribute("aria-valuenow", "0.5");
    expect(bar).toHaveAttribute("aria-valuetext", "50%");
  });

  it("announces the running stage in a polite live region", () => {
    const { container } = render(basic());

    const announcer = container.querySelector('[data-part="status-announcer"]');
    expect(announcer).toHaveAttribute("role", "status");
    expect(announcer).toHaveAttribute("aria-live", "polite");
    expect(announcer).toHaveTextContent("Upload started");
  });

  it("exposes a focusable, labelled scrollable log region with an empty state", () => {
    const { rerender } = render(basic({ logLines: [] }));

    const log = screen.getByRole("log", { name: "Task log" });
    expect(log).toHaveAttribute("tabindex", "0");
    expect(log).toHaveTextContent("Waiting to start…");

    rerender(basic({ logLines: ["Prepared 4 files.", "パイプラインを処理しています。"] }));
    expect(screen.getByRole("log", { name: "Task log" })).toHaveTextContent(
      "パイプラインを処理しています。"
    );
  });

  it("calls onCancel while running", async () => {
    const onCancel = vi.fn();
    render(basic({ onCancel }));

    const cancel = screen.getByRole("button", { name: "Cancel" });
    await userEvent.click(cancel);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows the failure alert with a Retry action and focuses it", async () => {
    const onRetry = vi.fn();
    render(
      basic({
        status: "failed",
        progress: 0.25,
        stageStatus: statusRecord({ upload: "failed" }),
        logLines: ["Upload aborted: connection reset."],
        onRetry,
      })
    );

    expect(screen.getByText("Task failed")).toBeInTheDocument();
    expect(
      screen.getByText("Task failed. Check the log and try again.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();

    const retry = screen.getByRole("button", { name: "Retry" });
    expect(retry).toHaveFocus();

    await userEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows the completion alert and focuses Dismiss", async () => {
    const onDismiss = vi.fn();
    render(
      basic({
        status: "completed",
        progress: 1,
        stageStatus: statusRecord({ process: "done", verify: "done" }),
        logLines: ["Verification passed."],
        onDismiss,
      })
    );

    expect(screen.getByText("Task completed")).toBeInTheDocument();

    const dismiss = screen.getByRole("button", { name: "Dismiss" });
    expect(dismiss).toHaveFocus();

    await userEvent.click(dismiss);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("shows the cancelled state with skipped stages and a Dismiss action", async () => {
    const onDismiss = vi.fn();
    render(
      basic({
        status: "cancelled",
        stageStatus: statusRecord({ process: "skipped", verify: "skipped" }),
        logLines: ["Task stopped by the user."],
        onDismiss,
      })
    );

    expect(screen.getByText("Task stopped")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("supports label overrides and a custom log line renderer", () => {
    render(
      basic({
        title: "処理の状態",
        labels: { progressLabel: "進捗", logLabel: "タスクログ", cancel: "キャンセル" },
        logLines: ["line-one"],
        renderLogLine: (line) => `» ${line}`,
        onCancel: () => {},
      })
    );

    expect(screen.getByRole("heading", { name: "処理の状態" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "進捗" })).toBeInTheDocument();
    expect(screen.getByRole("log", { name: "タスクログ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "キャンセル" })).toBeInTheDocument();
    expect(screen.getByText("» line-one")).toBeInTheDocument();
  });

  it("forwards the ref, merges className and passes data attributes", () => {
    const ref = createRef<HTMLElement>();
    render(
      <ProcessMonitor
        ref={ref}
        className="consumer-monitor"
        data-testid="monitor-root"
        stages={stages}
        stageStatus={{}}
        status="idle"
      />
    );

    const root = screen.getByTestId("monitor-root");
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("data-km-process-monitor");
    expect(root).toHaveAttribute("data-status", "idle");
    expect(root).toHaveClass("consumer-monitor");
  });

  it("has no detectable accessibility violations in running and failed states", async () => {
    const { rerender } = render(
      basic({ progress: undefined, logLines: ["Uploading items…", "長いログ行です。"] })
    );
    await expectNoViolations(document.body);

    rerender(
      basic({
        status: "failed",
        stageStatus: statusRecord({ upload: "failed" }),
        logLines: ["Upload aborted: connection reset."],
        onRetry: () => {},
      })
    );
    await expectNoViolations(document.body);
  });
});
