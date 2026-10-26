import { createContext, forwardRef, useContext, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, PointerEvent, ReactNode } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useReducedMotion } from "motion/react";
import { panelMotionStyle, resolvePanelMotion } from "./panel-motion";
import type { PanelMotion, PanelSide } from "./panel-motion";
import { joinPanelClasses, PANEL_CLOSE, PANEL_DESCRIPTION, PANEL_SURFACE, PANEL_TITLE, PanelBody, PanelFooter, PanelHeader } from "./panel-parts";

type SheetSize = "sm" | "md" | "lg";
interface SheetContextValue { side: PanelSide; motion: PanelMotion; modal: boolean }
const SheetContext = createContext<SheetContextValue>({ side: "right", motion: "smooth", modal: true });

type BaseSheetRootProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Root>;
export interface SheetRootProps extends Omit<BaseSheetRootProps, "children" | "modal"> {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  /** `false` allows outside interaction and avoids a focus trap/scroll lock. */
  modal?: boolean;
  /** Screen edge from which the panel appears. @default "right" */
  side?: PanelSide;
  /** Motion preset or per-instance values. @default "smooth" */
  motion?: PanelMotion;
}

export function SheetRoot({ children, side = "right", motion = "smooth", modal = true, onOpenChange, ...props }: SheetRootProps) {
  return <SheetContext.Provider value={{ side, motion, modal }}><DialogPrimitive.Root modal={modal} onOpenChange={onOpenChange} {...props}>{children}</DialogPrimitive.Root></SheetContext.Provider>;
}

export const SheetTrigger = DialogPrimitive.Trigger;

const HORIZONTAL_SIZES: Record<SheetSize, string> = { sm: "w-[min(20rem,100vw)]", md: "w-[min(28rem,100vw)]", lg: "w-[min(40rem,100vw)]" };
const VERTICAL_SIZES: Record<SheetSize, string> = { sm: "h-[min(16rem,100dvh)]", md: "h-[min(28rem,100dvh)]", lg: "h-[min(36rem,100dvh)]" };
const POSITION: Record<PanelSide, string> = {
  right: "inset-y-0 right-0 max-h-dvh",
  left: "inset-y-0 left-0 max-h-dvh",
  top: "inset-x-0 top-0 max-h-dvh",
  bottom: "inset-x-0 bottom-0 max-h-dvh",
};
const OFFSCREEN: Record<PanelSide, string> = {
  right: "data-[starting-style]:translate-x-[var(--km-panel-travel)] data-[ending-style]:translate-x-[var(--km-panel-travel)]",
  left: "data-[starting-style]:translate-x-[var(--km-panel-travel)] data-[ending-style]:translate-x-[var(--km-panel-travel)]",
  top: "data-[starting-style]:translate-y-[var(--km-panel-travel)] data-[ending-style]:translate-y-[var(--km-panel-travel)]",
  bottom: "data-[starting-style]:translate-y-[var(--km-panel-travel)] data-[ending-style]:translate-y-[var(--km-panel-travel)]",
};

type PopupProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Popup>;
export interface SheetContentProps extends Omit<PopupProps, "children" | "style" | "className"> {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  size?: SheetSize;
  /** Explicit size in px or any CSS length; responsive max constraints still apply. */
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  showBackdrop?: boolean;
  backdropClassName?: string;
  /** Add an operable edge handle for desktop properties/editing panels. */
  resizable?: boolean;
  minSize?: number;
  maxSize?: number;
  onSizeChange?: (size: number) => void;
}

export const SheetContent = forwardRef<HTMLDivElement, SheetContentProps>(function SheetContent({
  children, className, style, size = "md", width, height, showBackdrop, backdropClassName,
  resizable = false, minSize = 280, maxSize = 900, onSizeChange, ...props
}, ref) {
  const { side, motion, modal } = useContext(SheetContext);
  const reduced = useReducedMotion() ?? false;
  const config = resolvePanelMotion(motion, reduced);
  const horizontal = side === "left" || side === "right";
  const defaultPixels = horizontal ? { sm: 320, md: 448, lg: 640 }[size] : { sm: 256, md: 448, lg: 576 }[size];
  const [extent, setExtent] = useState<number | undefined>();
  const pointer = useRef<{ start: number; size: number } | null>(null);
  const minimum = Number.isFinite(minSize) ? Math.max(100, minSize) : 280;
  const maximum = Number.isFinite(maxSize) ? Math.max(minimum, maxSize) : 900;
  const viewportLimit = typeof window === "undefined" ? maximum : Math.max(100, horizontal ? window.innerWidth : window.innerHeight);
  const accessibleMaximum = Math.min(maximum, viewportLimit);
  const accessibleMinimum = Math.min(minimum, accessibleMaximum);

  function setClampedSize(value: number) {
    const viewport = horizontal ? window.innerWidth : window.innerHeight;
    const limit = Math.max(100, Math.min(maximum, viewport));
    const floor = Math.min(minimum, limit);
    const next = Math.min(limit, Math.max(floor, value));
    setExtent(next);
    onSizeChange?.(next);
  }

  const fromNegativeEdge = side === "left" || side === "top";
  const panelStyle: CSSProperties & { "--km-panel-travel": string } = {
    ...panelMotionStyle(config),
    "--km-panel-travel": `${fromNegativeEdge ? "-" : ""}${config.distance}%`,
    ...(horizontal ? { width: extent ?? width } : { height: extent ?? height }),
    ...style,
  };

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const rect = event.currentTarget.parentElement?.getBoundingClientRect();
    pointer.current = { start: horizontal ? event.clientX : event.clientY, size: extent ?? (horizontal ? rect?.width : rect?.height) ?? defaultPixels };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointer.current) return;
    const delta = (horizontal ? event.clientX : event.clientY) - pointer.current.start;
    setClampedSize(pointer.current.size + (fromNegativeEdge ? delta : -delta));
  }
  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <DialogPrimitive.Portal>
      {(showBackdrop ?? modal) ? <DialogPrimitive.Backdrop
        data-km-sheet-backdrop=""
        className={joinPanelClasses("fixed inset-0 z-50 bg-overlay opacity-[var(--km-panel-backdrop-opacity)] transition-opacity duration-[var(--km-panel-backdrop-duration)] ease-[var(--km-panel-easing)] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none", !modal && "pointer-events-none", backdropClassName)}
        style={panelMotionStyle(config)}
      /> : null}
      <DialogPrimitive.Popup
        {...props}
        ref={ref}
        aria-modal={modal ? true : undefined}
        data-km-sheet=""
        data-side={side}
        className={joinPanelClasses(
          "fixed z-50 max-w-[100vw] max-h-[100dvh] translate-x-0 translate-y-0 opacity-100 transition-[translate,opacity] duration-[var(--km-panel-duration)] ease-[var(--km-panel-easing)] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none",
          PANEL_SURFACE, "rounded-surface",
          POSITION[side], horizontal ? HORIZONTAL_SIZES[size] : `w-full ${VERTICAL_SIZES[size]}`,
          OFFSCREEN[side], className
        )}
        style={panelStyle}
      >
        {resizable ? <div
          role="separator" aria-label="Resize panel" aria-orientation={horizontal ? "vertical" : "horizontal"}
          aria-valuemin={accessibleMinimum} aria-valuemax={accessibleMaximum} aria-valuenow={Math.min(accessibleMaximum, Math.max(accessibleMinimum, extent ?? defaultPixels))}
          tabIndex={0} data-km-sheet-resize=""
          className={joinPanelClasses("group absolute z-10 touch-none rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            horizontal ? "inset-y-0 w-3 cursor-ew-resize" : "inset-x-0 h-3 cursor-ns-resize",
            side === "right" ? "left-0" : side === "left" ? "right-0" : side === "top" ? "bottom-0" : "top-0")}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          onKeyDown={(event) => {
            if (event.key === "Home" || event.key === "End") { event.preventDefault(); setClampedSize(event.key === "Home" ? minimum : maximum); return; }
            const signs: Record<PanelSide, Record<string, number>> = {
              right: { ArrowLeft: 1, ArrowRight: -1 }, left: { ArrowRight: 1, ArrowLeft: -1 },
              top: { ArrowDown: 1, ArrowUp: -1 }, bottom: { ArrowUp: 1, ArrowDown: -1 },
            };
            const sign = signs[side][event.key];
            if (sign) { event.preventDefault(); setClampedSize((extent ?? defaultPixels) + sign * 16); }
          }}
        ><span aria-hidden="true" className={joinPanelClasses("pointer-events-none absolute rounded-full bg-border transition-colors group-hover:bg-muted-foreground group-focus-visible:bg-foreground",
          horizontal ? "inset-y-[42%] left-1/2 w-0.5 -translate-x-1/2" : "inset-x-[42%] top-1/2 h-0.5 -translate-y-1/2")} /></div> : null}
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
});

type SheetTitleProps = Omit<ComponentPropsWithoutRef<typeof DialogPrimitive.Title>, "className"> & { className?: string };
type SheetDescriptionProps = Omit<ComponentPropsWithoutRef<typeof DialogPrimitive.Description>, "className"> & { className?: string };
type SheetCloseProps = Omit<ComponentPropsWithoutRef<typeof DialogPrimitive.Close>, "className"> & { className?: string };
export const SheetTitle = forwardRef<HTMLHeadingElement, SheetTitleProps>(function SheetTitle({ className, ...props }, ref) {
  return <DialogPrimitive.Title ref={ref} {...props} className={joinPanelClasses(PANEL_TITLE, className)} />;
});
export const SheetDescription = forwardRef<HTMLParagraphElement, SheetDescriptionProps>(function SheetDescription({ className, ...props }, ref) {
  return <DialogPrimitive.Description ref={ref} {...props} className={joinPanelClasses(PANEL_DESCRIPTION, className)} />;
});
export const SheetClose = forwardRef<HTMLButtonElement, SheetCloseProps>(function SheetClose({ className, children, ...props }, ref) {
  return <DialogPrimitive.Close ref={ref} {...props} aria-label={props["aria-label"] ?? (children == null ? "Close panel" : undefined)} className={joinPanelClasses(PANEL_CLOSE, className)}>{children ?? <span aria-hidden="true" className="text-xl leading-none">×</span>}</DialogPrimitive.Close>;
});

export const Sheet = Object.assign(SheetRoot, {
  Root: SheetRoot, Trigger: SheetTrigger, Content: SheetContent, Header: PanelHeader, Title: SheetTitle,
  Description: SheetDescription, Body: PanelBody, Footer: PanelFooter, Close: SheetClose,
});
export default Sheet;
