import { forwardRef } from "react";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

/** Visual emphasis of an icon button. Mirrors the core Button variants. */
export type IconButtonVariant = "primary" | "secondary" | "subtle" | "outline" | "destructive";

/** Square control size. `sm`/`md`/`lg` follow the core control heights (32/40/48px). */
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends React.ComponentPropsWithoutRef<typeof motion.button> {
  /** Visual emphasis. @default "primary" */
  variant?: IconButtonVariant;
  /** Square footprint. @default "md" */
  size?: IconButtonSize;
  /**
   * The icon glyph. It is rendered inside an `aria-hidden` wrapper, so it never
   * becomes the accessible name — provide `aria-label` (or `aria-labelledby`).
   */
  children?: ReactNode;
  /**
   * Replace the glyph with a spinner and block interaction while preserving the
   * square footprint so surrounding layout does not shift.
   */
  isLoading?: boolean;
  /** Accessible name announced while loading. Falls back to `aria-label`. */
  loadingLabel?: string;
}

const variantClasses: Record<IconButtonVariant, string> = {
  primary:
    "border-transparent bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/85 disabled:bg-disabled disabled:text-disabled-foreground",
  secondary:
    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90 active:bg-secondary/85 disabled:bg-disabled disabled:text-disabled-foreground",
  subtle:
    "border-transparent bg-subtle text-subtle-foreground hover:bg-subtle/80 active:bg-subtle/80 disabled:bg-disabled disabled:text-disabled-foreground",
  outline:
    "border-input bg-surface text-foreground hover:bg-surface-subtle active:bg-surface-inset disabled:bg-surface disabled:text-muted-foreground disabled:border-border-subtle",
  destructive:
    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/85 disabled:bg-disabled disabled:text-disabled-foreground",
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
};

const iconClasses: Record<IconButtonSize, string> = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
};

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={joinClasses("animate-spin", className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Square, icon-only button.
 *
 * Icon-only controls have no text content, so an accessible name is required:
 * pass `aria-label` (or `aria-labelledby`). Never rely on a tooltip as the only
 * label — pair the button with `Tooltip` for sighted guidance instead.
 *
 * Renders a native `<button>`, defaults to `type="button"`, forwards its ref,
 * and merges consumer `className` and DOM props. Colors, radii and motion come
 * from semantic tokens.
 */
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    variant = "primary",
    size = "md",
    isLoading = false,
    loadingLabel,
    className,
    children,
    type = "button",
    disabled,
    "aria-label": ariaLabel,
    ...props
  },
  ref
) {
  const reducedMotion = useReducedMotion();
  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      ref={ref}
      {...props}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      aria-label={isLoading && loadingLabel ? loadingLabel : ariaLabel}
      data-loading={isLoading ? "" : undefined}
      className={joinClasses(
        "inline-flex shrink-0 items-center justify-center rounded-full border font-medium",
        "transition-colors duration-[var(--km-duration-short)] ease-continuity",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      whileTap={!isDisabled && !reducedMotion ? { scale: 0.97 } : undefined}
      transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
    >
      {isLoading ? (
        <Spinner className={iconClasses[size]} />
      ) : (
        <span
          aria-hidden="true"
          className={joinClasses("inline-flex items-center justify-center", iconClasses[size])}
        >
          {children}
        </span>
      )}
    </motion.button>
  );
});

IconButton.displayName = "IconButton";

export { IconButton };
export default IconButton;
