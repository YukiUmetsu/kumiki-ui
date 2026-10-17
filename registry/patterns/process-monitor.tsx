import { forwardRef, useEffect, useRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Alert } from "../ui/alert";
import { Badge } from "../ui/badge";
import type { BadgeVariant } from "../ui/badge";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Surface } from "../ui/surface-card";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/** Lifecycle state of a single stage. */
export type ProcessMonitorStageStatus =
  | "pending"
  | "active"
  | "done"
  | "failed"
  | "skipped";

/** Lifecycle state of the whole task. */
export type ProcessMonitorStatus =
  | "idle"
  | "running"
  | "cancelled"
  | "failed"
  | "completed";

/** One stage of the task. `id` must be unique and stable within the list. */
export interface ProcessMonitorStage {
  /** Stable, unique identity; used as the React key and to look up `stageStatus`. */
  id: string;
  /** Visible stage name, supplied by the consumer. */
  label: string;
  /** Optional secondary line explaining what the stage does. */
  description?: string;
}

/**
 * Consumer-overridable copy. Every value has a neutral English default, so a
 * consumer only supplies the strings it localises or renames.
 */
export interface ProcessMonitorLabels {
  /** Visible label of the progress bar (also its accessible name). @default "Progress" */
  progressLabel?: string;
  /** Accessible name of the scrollable log region. @default "Task log" */
  logLabel?: string;
  /** Shown inside the log region before any line arrives. @default "Waiting to start…" */
  emptyLog?: string;
  /** Cancel action while the task runs. @default "Cancel" */
  cancel?: string;
  /** Retry action after a failure. @default "Retry" */
  retry?: string;
  /** Dismiss/close action in a terminal state. @default "Dismiss" */
  dismiss?: string;
  /** Stage status word: pending. @default "Waiting" */
  statusPending?: string;
  /** Stage status word: active. @default "Running" */
  statusActive?: string;
  /** Stage status word: done. @default "Done" */
  statusDone?: string;
  /** Stage status word: failed. @default "Failed" */
  statusFailed?: string;
  /** Stage status word: skipped. @default "Skipped" */
  statusSkipped?: string;
  /** Failure alert heading. @default "Task failed" */
  failedTitle?: string;
  /** Failure alert body. @default "Task failed. Check the log and try again." */
  failedMessage?: string;
  /** Cancelled alert heading. @default "Task stopped" */
  cancelledTitle?: string;
  /** Cancelled alert body. @default "Remaining stages were skipped." */
  cancelledMessage?: string;
  /** Completion alert heading. @default "Task completed" */
  completedTitle?: string;
  /** Completion alert body. @default "All stages finished." */
  completedMessage?: string;
}

export interface ProcessMonitorProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title" | "onCancel"> {
  /** Ordered stages to display. The consumer owns the names and order. */
  stages: ProcessMonitorStage[];
  /** Status per stage id. Missing ids fall back to `"pending"`. */
  stageStatus: Record<string, ProcessMonitorStageStatus>;
  /** Lifecycle state of the whole task. */
  status: ProcessMonitorStatus;
  /**
   * Completion as a fraction from `0` to `1`. When omitted the bar renders in
   * `mode="indeterminate"` and no percentage is ever fabricated. @default undefined
   */
  progress?: number;
  /** Append-only log lines. Rendered newest at the bottom. @default [] */
  logLines?: string[];
  /** Region heading rendered in the pattern shell. @default "Process status" */
  title?: ReactNode;
  /** Copy overrides for every visible or announced string. */
  labels?: ProcessMonitorLabels;
  /** Called when the user cancels a running task. */
  onCancel?: () => void;
  /** Called when the user retries after a failure. */
  onRetry?: () => void;
  /** Called when the user dismisses a completed or cancelled task. */
  onDismiss?: () => void;
  /** Custom renderer for a single log line. Receives the raw string. */
  renderLogLine?: (line: string) => ReactNode;
  /** Extra classes merged onto the root surface (consumer classes win). */
  className?: string;
}

const DEFAULT_LABELS: Required<Omit<ProcessMonitorLabels, never>> = {
  progressLabel: "Progress",
  logLabel: "Task log",
  emptyLog: "Waiting to start…",
  cancel: "Cancel",
  retry: "Retry",
  dismiss: "Dismiss",
  statusPending: "Waiting",
  statusActive: "Running",
  statusDone: "Done",
  statusFailed: "Failed",
  statusSkipped: "Skipped",
  failedTitle: "Task failed",
  failedMessage: "Task failed. Check the log and try again.",
  cancelledTitle: "Task stopped",
  cancelledMessage: "Remaining stages were skipped.",
  completedTitle: "Task completed",
  completedMessage: "All stages finished.",
};

const DEFAULT_TITLE = "Process status";

const LOG_CLASSES = joinClasses(
  "h-48 w-full overflow-auto rounded-surface bg-surface-inset p-3",
  "font-mono text-body-sm text-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
  "sm:h-64"
);

const STAGE_LIST_CLASSES =
  "flex min-w-0 flex-col gap-2 sm:w-2/5 sm:shrink-0";

const STAGE_ROW_CLASSES =
  "flex items-start gap-3 rounded-control px-2 py-2";

function stageLabelKey(
  status: ProcessMonitorStageStatus
): keyof ProcessMonitorLabels {
  switch (status) {
    case "active":
      return "statusActive";
    case "done":
      return "statusDone";
    case "failed":
      return "statusFailed";
    case "skipped":
      return "statusSkipped";
    default:
      return "statusPending";
  }
}

function stageBadgeVariant(status: ProcessMonitorStageStatus): BadgeVariant {
  switch (status) {
    case "active":
      return "info";
    case "done":
      return "success";
    case "failed":
      return "danger";
    default:
      return "neutral";
  }
}

/**
 * Shape-distinct glyph for the neutral states. `Badge` only draws a glyph for
 * its status variants, so pending/skipped draw their own hollow and struck
 * circles; that keeps status recognizable without relying on colour.
 */
function NeutralGlyph({ status }: { status: ProcessMonitorStageStatus }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3 shrink-0"
    >
      {status === "skipped" ? (
        <>
          <circle cx="6" cy="6" r="4.6" />
          <path d="M3.9 6h4.2" />
        </>
      ) : (
        <circle cx="6" cy="6" r="4.6" strokeDasharray="2.4 2" />
      )}
    </svg>
  );
}

function StageBadge({
  status,
  label,
}: {
  status: ProcessMonitorStageStatus;
  label: string;
}) {
  const variant = stageBadgeVariant(status);
  const showCustomGlyph = variant === "neutral";

  return (
    <Badge variant={variant} size="sm" className="shrink-0">
      {showCustomGlyph ? <NeutralGlyph status={status} /> : null}
      {label}
    </Badge>
  );
}

/**
 * Multi-stage async task monitor.
 *
 * Renders an ordered stage list, a truthful progress bar, a scrollable log
 * region and the terminal actions around a task the consumer drives entirely
 * through props. Stage rows pair a status word with a shape-distinct glyph and
 * the matching `status.*` token, so status is never conveyed by colour alone.
 * The progress bar is `determinate` only when the consumer supplies a fraction;
 * with `progress` omitted it runs `indeterminate` and never shows a fabricated
 * percentage.
 *
 * The log is a scrollable `role="log"` region (`bg-surface-inset`, monospace,
 * `tabIndex={0}` with an accessible label) that smooth-scrolls to the newest
 * line unless the user prefers reduced motion. A polite live region announces
 * the running stage; terminal states surface an `Alert` and move focus to the
 * relevant action — Retry on failure, Dismiss on completion. Below 640px the
 * stage list, progress and log stack; above it the stage list sits on the left
 * and the log on the right.
 *
 * All colours, radii, spacing and motion come from semantic tokens. Long and
 * CJK stage names, descriptions and log lines wrap instead of clipping. `ref`,
 * arbitrary DOM props and `className` are forwarded to the root surface.
 */
const ProcessMonitor = forwardRef<HTMLElement, ProcessMonitorProps>(
  function ProcessMonitor(
    {
      stages,
      stageStatus,
      status,
      progress,
      logLines = [],
      title = DEFAULT_TITLE,
      labels,
      onCancel,
      onRetry,
      onDismiss,
      renderLogLine,
      className,
      ...props
    },
    ref
  ) {
    const reducedMotion = useReducedMotion();
    const logRef = useRef<HTMLDivElement>(null);
    const retryRef = useRef<HTMLButtonElement>(null);
    const dismissRef = useRef<HTMLButtonElement>(null);

    const l = { ...DEFAULT_LABELS, ...labels };
    const hasTitle = title != null && title !== "";

    // Keep the log pinned to the newest line; under reduced motion jump instead
    // of animating the scroll.
    useEffect(() => {
      const log = logRef.current;
      if (!log) return;
      if (reducedMotion) {
        log.scrollTop = log.scrollHeight;
      } else if (typeof log.scrollTo === "function") {
        log.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
      } else {
        log.scrollTop = log.scrollHeight;
      }
    }, [logLines, reducedMotion]);

    // On a terminal transition, move focus to the action the user most likely
    // needs next.
    useEffect(() => {
      if (status === "failed") retryRef.current?.focus();
      else if (status === "completed") dismissRef.current?.focus();
    }, [status]);

    const activeStage = stages.find((stage) => stageStatus[stage.id] === "active");
    const announcement =
      status === "running" && activeStage ? `${activeStage.label} started` : "";

    const showCancel = status === "running" && onCancel != null;
    const showRetry = status === "failed" && onRetry != null;
    const showDismiss =
      (status === "completed" || status === "cancelled") && onDismiss != null;

    const footer =
      showCancel || showRetry || showDismiss ? (
        <>
          {showCancel ? (
            <Button variant="outline" size="sm" onClick={onCancel}>
              {l.cancel}
            </Button>
          ) : null}
          {showRetry ? (
            <Button ref={retryRef} variant="primary" size="sm" onClick={onRetry}>
              {l.retry}
            </Button>
          ) : null}
          {showDismiss ? (
            <Button
              ref={dismissRef}
              variant="primary"
              size="sm"
              onClick={onDismiss}
            >
              {l.dismiss}
            </Button>
          ) : null}
        </>
      ) : null;

    return (
      <Surface
        ref={ref}
        data-km-process-monitor=""
        data-status={status}
        className={className}
        header={
          hasTitle ? (
            <div className="flex min-w-0 flex-col gap-1">
              <h2
                data-part="title"
                className="font-serif text-heading font-normal tracking-heading text-foreground"
              >
                {title}
              </h2>
            </div>
          ) : null
        }
        footer={footer}
        {...props}
      >
        <div className="flex flex-col gap-6">
          {/* Progress is only shown when it is truthful: a determinate bar for a
              supplied fraction, an indeterminate bar only while the run is
              actually in flight. Idle and terminal runs never animate. */}
          {progress !== undefined ? (
            <div data-part="progress">
              <Progress progress={progress} mode="determinate" label={l.progressLabel} />
            </div>
          ) : status === "running" ? (
            <div data-part="progress">
              <Progress mode="indeterminate" label={l.progressLabel} />
            </div>
          ) : null}

          {status === "failed" ? (
            <Alert variant="danger" live="polite" title={l.failedTitle}>
              {l.failedMessage}
            </Alert>
          ) : status === "cancelled" ? (
            <Alert variant="warning" live="polite" title={l.cancelledTitle}>
              {l.cancelledMessage}
            </Alert>
          ) : status === "completed" ? (
            <Alert variant="success" live="polite" title={l.completedTitle}>
              {l.completedMessage}
            </Alert>
          ) : null}

          <div
            role="status"
            aria-live="polite"
            data-part="status-announcer"
            className="sr-only"
          >
            {announcement}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <ol data-part="stages" className={STAGE_LIST_CLASSES}>
              {stages.map((stage) => {
                const value = stageStatus[stage.id] ?? "pending";
                return (
                  <motion.li
                    key={stage.id}
                    data-part="stage"
                    data-status={value}
                    aria-current={value === "active" ? "step" : undefined}
                    className={joinClasses(
                      STAGE_ROW_CLASSES,
                      value === "active" && "bg-surface-subtle"
                    )}
                    initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : { duration: 0.18, ease: [0.4, 0, 0.2, 1] }
                    }
                  >
                    <StageBadge status={value} label={l[stageLabelKey(value)]} />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span
                        data-part="stage-label"
                        className="break-words text-sm font-medium text-foreground"
                      >
                        {stage.label}
                      </span>
                      {stage.description != null && stage.description !== "" ? (
                        <span
                          data-part="stage-description"
                          className="break-words text-body-sm text-muted-foreground"
                        >
                          {stage.description}
                        </span>
                      ) : null}
                    </span>
                  </motion.li>
                );
              })}
            </ol>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div
                ref={logRef}
                data-part="log"
                role="log"
                aria-label={l.logLabel}
                tabIndex={0}
                className={LOG_CLASSES}
              >
                {logLines.length === 0 ? (
                  <p data-part="log-empty" className="text-muted-foreground">
                    {l.emptyLog}
                  </p>
                ) : (
                  logLines.map((line, index) => (
                    <div
                      key={`${index}-${line}`}
                      data-part="log-line"
                      className="whitespace-pre-wrap break-words"
                    >
                      {renderLogLine ? renderLogLine(line) : line}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </Surface>
    );
  }
);

ProcessMonitor.displayName = "ProcessMonitor";

export { ProcessMonitor };
export default ProcessMonitor;
