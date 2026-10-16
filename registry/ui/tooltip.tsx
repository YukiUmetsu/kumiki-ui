import type { ReactElement, ReactNode } from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

export type TooltipSide = "top" | "right" | "bottom" | "left";
export type TooltipAlign = "start" | "center" | "end";

export interface TooltipProps {
  /**
   * The single element the tooltip is anchored to. Render a native element or a
   * Kumiki control that forwards DOM props and refs; Base UI merges the trigger
   * behavior onto it. It must keep its own accessible name — the tooltip is a
   * hint for sighted users and must never be the sole label of a control.
   */
  children: ReactElement;
  /** Tooltip text/content. */
  content: ReactNode;
  /** Preferred side of the trigger. Collisions flip automatically. @default "top" */
  side?: TooltipSide;
  /** Alignment along the chosen side. @default "center" */
  align?: TooltipAlign;
  /** Gap between the trigger and the popup, in pixels. @default 8 */
  sideOffset?: number;
  /** Hover/focus delay before opening, in milliseconds. */
  delay?: number;
  /** Disable the tooltip without altering the trigger. */
  disabled?: boolean;
  /** Extra classes for the popup surface. */
  className?: string;
}

/**
 * Short hint shown on hover or keyboard focus of a single trigger element.
 *
 * Built on Base UI's Tooltip: the popup is exposed with `role="tooltip"` and the
 * trigger receives `aria-describedby` while open, placement flips to avoid
 * viewport collisions, and Escape dismisses it. Because assistive-technology
 * users may not perceive a tooltip reliably, always give the trigger its own
 * name and never hide essential information inside a tooltip.
 */
export function Tooltip({
  children,
  content,
  side = "top",
  align = "center",
  sideOffset = 8,
  delay,
  disabled,
  className,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root disabled={disabled}>
      <TooltipPrimitive.Trigger render={children} delay={delay} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} align={align} sideOffset={sideOffset}>
          <TooltipPrimitive.Popup
            className={[
              "z-50 max-w-xs rounded-control border border-border bg-surface px-3 py-2",
              "text-[length:var(--km-type-size-sm)] text-foreground shadow-lg",
              "origin-[var(--transform-origin)] transition-[transform,opacity] duration-[var(--km-duration-short)]",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
              "data-[starting-style]:[transform:scale(0.97)] data-[ending-style]:[transform:scale(0.97)]",
              className ?? "",
            ].join(" ")}
          >
            {content}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/** Shared delay grouping for adjacent tooltips. Wrap a group of triggers with it. */
export const TooltipProvider = TooltipPrimitive.Provider;

export default Tooltip;
