import { forwardRef, useId } from "react";
import type { HTMLAttributes } from "react";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/** Clamp any input to the closed 0–1 range, mapping non-numbers to 0. */
function clamp01(value: number | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Whether the bar reports a known completion fraction (`determinate`) or only
 * that work is in progress (`indeterminate`). Indeterminate never exposes a
 * fabricated number or percentage.
 */
export type ProgressMode = "determinate" | "indeterminate";

export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * Completion as a fraction from `0` to `1`. Values outside the range are
   * clamped. Only meaningful in `determinate` mode; ignored (and never
   * announced) when `mode` is `indeterminate`. @default 0
   */
  progress?: number;
  /**
   * Visible description of the ongoing work. It also becomes the bar's
   * accessible name, so it should name the task, not restate the value.
   */
  label?: string;
  /** Reporting mode. @default "determinate" */
  mode?: ProgressMode;
  /** Render the bar as inert and visually muted. @default false */
  disabled?: boolean;
  /** Extra classes for the outer wrapper (label row + track). */
  className?: string;
}

/**
 * Determinate and indeterminate progress bar.
 *
 * Renders `role="progressbar"`. In `determinate` mode it exposes
 * `aria-valuemin=0`/`aria-valuemax=1`/`aria-valuenow` plus a rounded
 * `aria-valuetext` percentage; in `indeterminate` mode it omits all value
 * attributes so assistive technology reports ongoing work instead of a number.
 * The visible percentage is marked `aria-hidden` to avoid duplicating the value
 * that the progressbar role already announces.
 *
 * The value is clamped and rounded from a single source, so the fill width,
 * the visible percentage and the announced value can never disagree — including
 * while an async update is in flight. `label` names the task; when it is not
 * set, pass `aria-label`/`aria-labelledby` to name the bar.
 *
 * Colours, radii and motion come from semantic tokens, so appearance, density
 * and reduced-motion preferences are handled centrally.
 */
const Progress = forwardRef<HTMLDivElement, ProgressProps>(function Progress(
  { progress, label, mode = "determinate", disabled = false, className, ...props },
  ref
) {
  const generatedId = useId();
  const labelId = `${generatedId}-label`;
  const isIndeterminate = mode === "indeterminate";

  const fraction = clamp01(progress);
  const percent = Math.round(fraction * 100);
  const valueText = `${percent}%`;

  return (
    <div
      className={joinClasses(
        "flex w-full flex-col gap-1",
        disabled && "opacity-50",
        className
      )}
      data-mode={mode}
      data-disabled={disabled ? "" : undefined}
    >
      {label != null && label !== "" ? (
        <div className="flex items-baseline justify-between gap-3">
          <span
            id={labelId}
            className="text-sm font-medium text-foreground"
          >
            {label}
          </span>
          {!isIndeterminate ? (
            <span
              aria-hidden="true"
              className="text-sm tabular-nums text-muted-foreground"
            >
              {valueText}
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        ref={ref}
        role="progressbar"
        aria-labelledby={label != null && label !== "" ? labelId : undefined}
        aria-valuemin={isIndeterminate ? undefined : 0}
        aria-valuemax={isIndeterminate ? undefined : 1}
        aria-valuenow={isIndeterminate ? undefined : fraction}
        aria-valuetext={isIndeterminate ? undefined : valueText}
        aria-disabled={disabled || undefined}
        className="relative h-2 w-full overflow-hidden rounded-full bg-surface-inset"
        {...props}
      >
        <div
          data-part="indicator"
          className={joinClasses(
            "h-full rounded-full bg-primary",
            isIndeterminate
              ? "w-full animate-pulse"
              : "transition-[width] duration-[var(--km-duration-medium)] ease-continuity"
          )}
          style={isIndeterminate ? undefined : { width: valueText }}
        />
      </div>
    </div>
  );
});

Progress.displayName = "Progress";

export { Progress };
export default Progress;
