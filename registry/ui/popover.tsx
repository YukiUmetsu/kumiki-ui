import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Transition } from "motion/react";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/**
 * Vertical placement preset relative to the anchor:
 * - `top`: above the anchor.
 * - `center`: vertically centered on the anchor (overlaps it).
 * - `bottom`: below the anchor.
 *
 * Collisions are always corrected on the alignment axis, so the popup stays in
 * the viewport even when the preferred placement overflows.
 */
export type PopoverSide = "top" | "center" | "bottom";

/** Horizontal alignment relative to the anchor. */
export type PopoverAlign = "start" | "center" | "end";

export interface PopoverProps {
  /**
   * The single element the popover is anchored to. Render a native element or a
   * Kumiki control that forwards DOM props and refs; Base UI merges the trigger
   * behavior onto it. It keeps its own accessible name.
   */
  children: ReactElement;
  /** Popover body. Accepts long and interactive content; it scrolls when tall. */
  content: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  /** Called whenever the open state changes (trigger press, outside press, Escape, close). */
  onOpenChange?: (open: boolean) => void;
  /**
   * Forwarded to the anchor element so the trigger points at an external
   * description. The popover content itself is related through Base UI's
   * trigger `aria-controls`, not this attribute.
   */
  "aria-describedby"?: string;
  /**
   * Accessible name for the popup surface. A popover is exposed with
   * `role="dialog"`, so assistive technology announces this label when the
   * popup opens. Provide a short name when the popover has no visible heading.
   */
  label?: string;
  /** Preferred side of the anchor. Collisions shift the popup to stay visible. @default "bottom" */
  side?: PopoverSide;
  /** Alignment along the chosen side. @default "center" */
  align?: PopoverAlign;
  /**
   * Hover delay before opening, in milliseconds, measured from the anchor.
   * Providing a delay also enables hover-open (tooltip-style), in addition to
   * the default press-to-open behavior.
   */
  delay?: number;
  /**
   * Gap between the anchor and the popup, in pixels. Defaults to `8` for the
   * `top`/`bottom` sides and `0` for the centered side.
   */
  sideOffset?: number;
  /** Disable the popover without altering the anchor. @default false */
  disabled?: boolean;
  /** Extra classes for the popup surface. */
  className?: string;
}

const MotionPopup = motion.create(PopoverPrimitive.Popup);

const popupClasses = [
  "z-50 max-h-[var(--available-height)] overflow-auto rounded-surface border border-border bg-surface-floating p-3",
  "text-sm text-foreground shadow-lg",
  "origin-[var(--transform-origin)]",
  "focus:outline-none",
].join(" ");

/**
 * Popup anchored to a single trigger element, exposed with `role="dialog"`.
 *
 * Built on Base UI's Popover: the trigger receives `aria-haspopup`/`aria-controls`,
 * focus moves into the popup and returns to the trigger on close, Escape and
 * outside presses dismiss it, and placement flips/shifts to avoid viewport
 * collisions. Long content scrolls inside the popup instead of being clipped.
 * All colors come from semantic tokens.
 *
 * The popup enters and exits with a spring-driven fade + subtle scale, wrapped
 * in `AnimatePresence` and suppressed under reduced motion.
 */
export function Popover({
  children,
  content,
  open,
  defaultOpen,
  onOpenChange,
  "aria-describedby": ariaDescribedBy,
  label,
  side = "bottom",
  align = "center",
  delay,
  sideOffset,
  disabled = false,
  className,
}: PopoverProps) {
  const reducedMotion = useReducedMotion();
  const [innerOpen, setInnerOpen] = useState(open ?? defaultOpen ?? false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : innerOpen;

  useEffect(() => {
    if (isControlled) setInnerOpen(open);
  }, [isControlled, open]);

  if (disabled) {
    return children;
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!isControlled) setInnerOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  const transition: Transition = reducedMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 400, damping: 30 };

  const isCentered = side === "center";

  return (
    <PopoverPrimitive.Root
      open={isOpen}
      defaultOpen={!isControlled ? defaultOpen : undefined}
      onOpenChange={handleOpenChange}
    >
      <PopoverPrimitive.Trigger
        render={children}
        openOnHover={delay != null}
        delay={delay}
        aria-describedby={ariaDescribedBy}
      />
      <AnimatePresence>
        {isOpen && (
          <PopoverPrimitive.Portal key="popover-portal">
            <PopoverPrimitive.Positioner
              side={isCentered ? "bottom" : side}
              align={align}
              sideOffset={
                isCentered
                  ? ({ anchor, positioner }) =>
                      (sideOffset ?? 0) - (anchor.height + positioner.height) / 2
                  : (sideOffset ?? 8)
              }
              collisionAvoidance={isCentered ? { side: "none", align: "shift" } : undefined}
              data-km-side={side}
              data-km-align={align}
              className="z-50 max-w-[var(--available-width)]"
            >
              <MotionPopup
                data-km-popover=""
                aria-label={label}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={transition}
                className={joinClasses(popupClasses, className)}
              >
                {content}
              </MotionPopup>
            </PopoverPrimitive.Positioner>
          </PopoverPrimitive.Portal>
        )}
      </AnimatePresence>
    </PopoverPrimitive.Root>
  );
}

export default Popover;
