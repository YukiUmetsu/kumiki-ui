import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cva } from "class-variance-authority";

/** Visual emphasis of a button. */
export type ButtonVariant = "primary" | "secondary" | "subtle" | "outline" | "destructive";

/**
 * Control footprint. `sm`/`md`/`lg` are the text sizes (32/40/48px); `icon`
 * is the square, icon-only footprint and requires an accessible name.
 */
export type ButtonSize = "sm" | "md" | "lg" | "icon";

/**
 * Variant/size composition shared by the component and by consumers who need to
 * style a non-`<button>` element with the same treatment:
 * `buttonVariants({ variant, size, className })`.
 */
export const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-control border font-medium",
    "transition-colors duration-[var(--km-duration-short)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        primary: "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90",
        subtle: "border-transparent bg-subtle text-subtle-foreground hover:bg-subtle/80",
        outline: "border-input bg-transparent text-foreground hover:bg-surface-subtle",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-[var(--km-control-height)] px-[var(--km-control-space-x)] text-[length:var(--km-control-font)]",
        lg: "h-12 px-5 text-base",
        icon: "size-[var(--km-control-height)] p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual emphasis. @default "primary" */
  variant?: ButtonVariant;
  /** Control footprint. @default "md" */
  size?: ButtonSize;
  /** Optional leading icon. Rendered `aria-hidden`; hidden while loading. */
  icon?: ReactNode;
  /** Replace the leading icon with a spinner and prevent repeat triggers. @default false */
  isLoading?: boolean;
  /**
   * Accessible name announced while loading. Use it when `isLoading` is set and
   * the visible label alone is not descriptive enough.
   */
  loadingLabel?: string;
  /** Button content. Doubles as the accessible name when no `aria-label` is given. */
  children?: ReactNode;
  /** Extra classes merged onto the `<button>`. */
  className?: string;
}

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      className="size-4 shrink-0 animate-spin"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Accessible, tokenized button.
 *
 * Renders a native `<button>` (so Enter/Space activation, form semantics and the
 * screen-reader "button" role come from the platform), defaults `type="button"`
 * so it can never accidentally submit a form, forwards its ref, and merges
 * consumer `className` and arbitrary DOM props.
 *
 * While `isLoading` it sets `disabled` + `aria-busy="true"` + `data-loading`, swaps
 * the leading icon for an `aria-hidden` spinner and, when `loadingLabel` is set,
 * uses it as the accessible name. The visible label stays mounted so the control
 * width does not jump between states.
 *
 * Colours, radii and motion come from semantic tokens, so appearance, density and
 * reduced-motion preferences are handled centrally.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    icon,
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
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      aria-label={isLoading && loadingLabel ? loadingLabel : ariaLabel}
      data-loading={isLoading ? "" : undefined}
      className={buttonVariants({ variant, size, className })}
      {...props}
    >
      {isLoading ? (
        <Spinner />
      ) : icon ? (
        <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
});

Button.displayName = "Button";

export { Button };
export default Button;
