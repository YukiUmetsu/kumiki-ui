import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

type DialogSize = "sm" | "md" | "lg";
type DialogPlacement = "top" | "center" | "bottom";

export interface DialogProps {
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  /** Called whenever the open state changes (close button, Escape, outside click). */
  onOpenChange?: (open: boolean) => void;
  /** Convenience callback fired only when the dialog closes. */
  onClose?: () => void;
  /** Accessible dialog title (also the label). */
  title?: ReactNode;
  /** Optional accessible description. */
  description?: ReactNode;
  /** Dialog body content. */
  children?: ReactNode;
  /** Panel width preset. */
  size?: DialogSize;
  /** Vertical alignment within the viewport. */
  placement?: DialogPlacement;
  /**
   * Modal by default: focus is trapped, page scroll is locked and pointer
   * interactions outside are disabled. Pass `false` for a non-modal dialog
   * (no trap, no scroll lock); the popup then omits `aria-modal`.
   */
  modal?: boolean;
  /** Extra classes for the dialog panel. */
  className?: string;
  /** Accessible label for the built-in close button. */
  closeLabel?: string;
}

const sizeClasses: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

const placementClasses: Record<DialogPlacement, string> = {
  top: "items-start",
  center: "items-center",
  bottom: "items-end",
};

/**
 * Modal dialog built on Base UI's Dialog primitive.
 *
 * Provides a focus trap, initial/return focus management, Escape and
 * outside-click dismissal, scroll lock and portal rendering. Content longer
 * than the viewport scrolls inside the overlay rather than being clipped.
 * All colors come from semantic tokens.
 */
export function Dialog({
  open,
  defaultOpen,
  onOpenChange,
  onClose,
  title,
  description,
  children,
  size = "md",
  placement = "center",
  modal = true,
  className,
  closeLabel = "Close",
}: DialogProps) {
  function handleOpenChange(nextOpen: boolean) {
    onOpenChange?.(nextOpen);
    if (!nextOpen) onClose?.();
  }

  return (
    <DialogPrimitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={handleOpenChange}
      modal={modal}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-overlay" />
        <DialogPrimitive.Popup
          data-km-dialog=""
          aria-modal={modal ? true : undefined}
          className={[
            "fixed inset-0 z-50 flex justify-center overflow-y-auto p-4",
            placementClasses[placement],
          ].join(" ")}
        >
          <div
            className={[
              "relative m-auto w-full rounded-surface border border-border bg-surface p-6 text-foreground shadow-xl",
              "focus:outline-none",
              sizeClasses[size],
              className ?? "",
            ].join(" ")}
          >
            {title != null && title !== "" ? (
              <DialogPrimitive.Title className="text-[length:var(--km-type-size-lg)] font-semibold leading-tight">
                {title}
              </DialogPrimitive.Title>
            ) : null}
            {description != null && description !== "" ? (
              <DialogPrimitive.Description className="mt-1 text-[length:var(--km-type-size-sm)] text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            ) : null}
            <div className="mt-4">{children}</div>
            <DialogPrimitive.Close
              aria-label={closeLabel}
              className={[
                "absolute end-4 top-4 inline-flex size-8 items-center justify-center rounded-control text-muted-foreground",
                "hover:bg-surface-subtle",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
              ].join(" ")}
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ×
              </span>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default Dialog;
