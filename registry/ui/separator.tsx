import { forwardRef } from "react";
import type { SeparatorProps as SeparatorPrimitiveProps } from "@base-ui/react/separator";
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/** Axis of the rule. */
export type SeparatorOrientation = "horizontal" | "vertical";

/** Size classes for each axis. The rule never bakes external spacing. */
const ORIENTATION_CLASSES: Record<SeparatorOrientation, string> = {
  horizontal: "h-px w-full",
  vertical: "w-px self-stretch",
};

const BASE_CLASSES = "shrink-0 bg-border";

export interface SeparatorProps
  extends Omit<SeparatorPrimitiveProps, "orientation" | "className" | "children"> {
  /**
   * Direction of the rule. Horizontal rules span the available width; vertical
   * rules are one pixel wide and stretch to the height of the flex row.
   * @default "horizontal"
   */
  orientation?: SeparatorOrientation;
  /**
   * Render the rule as presentational. Decorative rules are hidden from
   * assistive technology and expose no `separator` role, which is the right
   * choice for purely visual dividers. Set to `false` for a semantic divider
   * that assistive technology should announce.
   * @default true
   */
  decorative?: boolean;
  /** Extra classes merged onto the rule. */
  className?: string;
}

/**
 * Tokenized horizontal or vertical rule.
 *
 * Built on Base UI's Separator so the semantic mode exposes a real
 * `role="separator"` with `aria-orientation`. The default decorative mode is
 * presentational: it carries no role and is hidden from the accessibility tree,
 * so visual dividers never add noise for screen-reader users.
 *
 * Color comes from the border token and thickness from a single axis class.
 * External spacing is deliberately not included: margins belong to the layout
 * that composes the rule, so the same separator works in a toolbar, a list or a
 * dense form. `ref`, arbitrary div props and `className` are forwarded to the
 * root element.
 */
const Separator = forwardRef<HTMLDivElement, SeparatorProps>(function Separator(
  { orientation = "horizontal", decorative = true, className, ...props },
  ref
) {
  return (
    <SeparatorPrimitive
      ref={ref}
      data-km-separator=""
      data-orientation={orientation}
      data-decorative={decorative ? "true" : "false"}
      orientation={orientation}
      className={joinClasses(BASE_CLASSES, ORIENTATION_CLASSES[orientation], className)}
      {...(decorative ? { role: "none", "aria-hidden": true } : {})}
      {...props}
    />
  );
});

Separator.displayName = "Separator";

export { Separator };
export default Separator;
