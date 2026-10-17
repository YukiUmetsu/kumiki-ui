import { forwardRef, useCallback, useEffect, useId, useRef, useState } from "react";
import type { MutableRefObject, ReactNode, TextareaHTMLAttributes } from "react";

const textareaClasses = [
  "block w-full rounded-control border border-input bg-surface px-[var(--km-control-space-x)] py-2",
  "text-base text-foreground placeholder:text-muted-foreground",
  "transition-colors duration-[var(--km-duration-short)] ease-continuity",
  // Hover strengthens the boundary for an enabled, valid field only.
  "not-disabled:not-aria-[invalid=true]:hover:border-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
  "disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-muted-foreground disabled:border-border-subtle",
  "aria-[invalid=true]:border-danger aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger/30",
  "aria-[invalid=true]:focus-visible:ring-ring",
].join(" ");

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Extra classes for the `<textarea>` element. */
  className?: string;
  /** Grow the height to fit the content instead of scrolling. @default false */
  autoResize?: boolean;
  /**
   * Visible rows when not auto-resizing; also the minimum rows when
   * `autoResize` is enabled. @default 3
   */
  minRows?: number;
  /** Maximum rows before an auto-resizing textarea starts scrolling. */
  maxRows?: number;
}

/**
 * Multiline text input.
 *
 * Preserves native `<textarea>` semantics and form behavior, supports
 * controlled and uncontrolled values, IME and long/CJK content. Enable
 * `autoResize` to grow with content while never exceeding `maxRows`.
 */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, autoResize = false, minRows = 3, maxRows, value, rows, onInput, ...props },
  forwardedRef
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  const setRefs = useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) (forwardedRef as MutableRefObject<HTMLTextAreaElement | null>).current = node;
    },
    [forwardedRef]
  );

  const resize = useCallback(() => {
    const element = innerRef.current;
    if (!element || !autoResize) return;

    const styles = getComputedStyle(element);
    // Prefer the element's live metrics; read the base type tokens for the
    // fallback so the maths follows the theme, and keep the literals only as a
    // last resort for environments without computed custom properties.
    const fontSize =
      parseFloat(styles.fontSize) ||
      parseFloat(styles.getPropertyValue("--km-type-scale-base")) ||
      16;
    const lineHeight =
      parseFloat(styles.lineHeight) ||
      fontSize * (parseFloat(styles.getPropertyValue("--km-type-leading-base")) || 1.5);
    const verticalBox =
      parseFloat(styles.paddingTop) +
      parseFloat(styles.paddingBottom) +
      parseFloat(styles.borderTopWidth) +
      parseFloat(styles.borderBottomWidth);
    const minHeight = minRows > 0 ? minRows * lineHeight + verticalBox : 0;
    const maxHeight = maxRows && maxRows > 0 ? maxRows * lineHeight + verticalBox : Number.POSITIVE_INFINITY;

    element.style.height = "auto";
    const nextHeight = Math.min(Math.max(element.scrollHeight, minHeight), maxHeight);
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [autoResize, minRows, maxRows]);

  // Re-measure on mount, on controlled value changes and on resize options.
  useEffect(() => {
    resize();
  }, [resize, value]);

  return (
    <textarea
      ref={setRefs}
      value={value}
      rows={autoResize ? undefined : rows ?? minRows}
      onInput={(event) => {
        resize();
        onInput?.(event);
      }}
      className={joinClasses(textareaClasses, autoResize && "resize-none", className)}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

export interface TextareaFieldProps extends TextareaProps {
  /** Visible field label, associated with the textarea. */
  label: ReactNode;
  /** Supporting text shown below the control while there is no error. */
  hint?: ReactNode;
  /** Validation message; replaces the hint and marks the field invalid. */
  error?: ReactNode;
  /** Extra classes for the wrapper element. */
  containerClassName?: string;
  /**
   * Show a live character counter. Defaults to `true` when `maxLength` is set,
   * so limits are only surfaced when they actually exist.
   */
  showCount?: boolean;
}

/**
 * Textarea with an associated label, hint, actionable error and an optional
 * character counter. All helper text is wired through `aria-describedby` and
 * errors are announced with `role="alert"`.
 */
const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(function TextareaField(
  {
    label,
    hint,
    error,
    containerClassName,
    className,
    id,
    maxLength,
    value,
    defaultValue,
    showCount = maxLength != null,
    onInput,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const hintId = `${textareaId}-hint`;
  const errorId = `${textareaId}-error`;
  const countId = `${textareaId}-count`;

  const hasError = error != null && error !== "";
  const hasHint = hint != null && hint !== "";
  const hasCounter = showCount && maxLength != null;

  const [count, setCount] = useState(() => String(value ?? defaultValue ?? "").length);

  useEffect(() => {
    if (value != null) setCount(String(value).length);
  }, [value]);

  const descriptionIds = [hasError ? errorId : hasHint ? hintId : undefined, hasCounter ? countId : undefined]
    .filter(Boolean)
    .join(" ");

  // Native `maxLength` caps typing, but a controlled `value` can still exceed the
  // limit; the counter then carries the "over" state in text, not colour alone.
  const overLimit = maxLength != null && count > maxLength;

  return (
    <div className={joinClasses("flex flex-col gap-1.5", containerClassName)}>
      <label
        htmlFor={textareaId}
        className="mb-0.5 text-sm font-medium text-foreground"
      >
        {label}
      </label>
      <Textarea
        ref={ref}
        id={textareaId}
        value={value}
        defaultValue={defaultValue}
        maxLength={maxLength}
        aria-invalid={hasError || undefined}
        aria-describedby={descriptionIds || undefined}
        onInput={(event) => {
          setCount(event.currentTarget.value.length);
          onInput?.(event);
        }}
        className={className}
        {...props}
      />
      {hasError ? (
        <>
          <p id={errorId} role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
          <p aria-live="polite" className="sr-only">
            {error}
          </p>
        </>
      ) : hasHint ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {hasCounter ? (
        <p
          id={countId}
          className={joinClasses(
            "self-end text-xs tabular-nums",
            overLimit ? "text-danger" : "text-muted-foreground"
          )}
        >
          {count} / {maxLength}
        </p>
      ) : null}
    </div>
  );
});

TextareaField.displayName = "TextareaField";

export { Textarea, TextareaField };
export default Textarea;
