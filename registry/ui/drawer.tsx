import { createContext, forwardRef, useContext } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { useReducedMotion } from "motion/react";
import { panelMotionStyle, resolvePanelMotion } from "./panel-motion";
import type { PanelMotion, PanelSide } from "./panel-motion";
import { joinPanelClasses, PANEL_CLOSE, PANEL_DESCRIPTION, PANEL_SURFACE, PANEL_TITLE, PanelBody, PanelFooter, PanelHeader } from "./panel-parts";

type DrawerSize = "sm" | "md" | "lg";
interface DrawerContextValue { side: PanelSide; motion: PanelMotion; modal: boolean }
const DrawerContext = createContext<DrawerContextValue>({ side: "bottom", motion: "smooth", modal: true });

type BaseDrawerRootProps = ComponentPropsWithoutRef<typeof DrawerPrimitive.Root>;
export interface DrawerRootProps extends Omit<BaseDrawerRootProps, "swipeDirection" | "children"> {
  children: ReactNode;
  side?: PanelSide;
  motion?: PanelMotion;
}

export function DrawerRoot({ children, side = "bottom", motion = "smooth", modal = true, onOpenChange, ...props }: DrawerRootProps) {
  const direction = { left: "left", right: "right", top: "up", bottom: "down" } as const;
  return <DrawerContext.Provider value={{ side, motion, modal: modal === true }}>
    <DrawerPrimitive.Root {...props} swipeDirection={direction[side]} modal={modal} onOpenChange={onOpenChange}>{children}</DrawerPrimitive.Root>
  </DrawerContext.Provider>;
}

export const DrawerTrigger = DrawerPrimitive.Trigger;
export const DrawerSwipeArea = DrawerPrimitive.SwipeArea;
export const DrawerIndent = DrawerPrimitive.Indent;
export const DrawerIndentBackground = DrawerPrimitive.IndentBackground;

const HORIZONTAL_SIZES: Record<DrawerSize, string> = { sm: "w-[min(20rem,100vw)]", md: "w-[min(28rem,100vw)]", lg: "w-[min(40rem,100vw)]" };
const VERTICAL_SIZES: Record<DrawerSize, string> = { sm: "h-[min(16rem,100dvh)]", md: "h-[min(28rem,100dvh)]", lg: "h-[min(36rem,100dvh)]" };
const POSITION: Record<PanelSide, string> = {
  left: "inset-y-0 left-0 max-h-dvh",
  right: "inset-y-0 right-0 max-h-dvh",
  top: "inset-x-0 top-0 max-h-dvh",
  bottom: "inset-x-0 bottom-0 max-h-dvh",
};
const OFFSCREEN: Record<PanelSide, string> = {
  left: "data-[starting-style]:translate-x-[var(--km-panel-travel)] data-[ending-style]:translate-x-[var(--km-panel-travel)]",
  right: "data-[starting-style]:translate-x-[var(--km-panel-travel)] data-[ending-style]:translate-x-[var(--km-panel-travel)]",
  top: "data-[starting-style]:translate-y-[var(--km-panel-travel)] data-[ending-style]:translate-y-[var(--km-panel-travel)]",
  bottom: "data-[starting-style]:translate-y-[var(--km-panel-travel)] data-[ending-style]:translate-y-[var(--km-panel-travel)]",
};

type BaseDrawerPopupProps = ComponentPropsWithoutRef<typeof DrawerPrimitive.Popup>;
export interface DrawerContentProps extends Omit<BaseDrawerPopupProps, "children" | "style" | "className"> {
  children: ReactNode;
  size?: DrawerSize;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  className?: string;
  style?: CSSProperties;
  showBackdrop?: boolean;
  backdropClassName?: string;
  /** A purely visual drag affordance, on by default for vertical drawers. */
  showHandle?: boolean;
}

export const DrawerContent = forwardRef<HTMLDivElement, DrawerContentProps>(function DrawerContent({
  children, className, style, size = "md", width, height, showBackdrop, backdropClassName, showHandle, ...props
}, ref) {
  const { side, motion, modal } = useContext(DrawerContext);
  const config = resolvePanelMotion(motion, useReducedMotion() ?? false);
  const horizontal = side === "left" || side === "right";
  const fromNegativeEdge = side === "left" || side === "top";
  const panelStyle: CSSProperties & { "--km-panel-travel": string } = {
    ...panelMotionStyle(config),
    "--km-panel-travel": `${fromNegativeEdge ? "-" : ""}${config.distance}%`,
    // Base UI writes these gesture variables; their transform stays independent of the entrance translate.
    transform: horizontal
      ? "translateX(calc(var(--drawer-snap-point-offset, 0px) + var(--drawer-swipe-movement-x, 0px)))"
      : "translateY(calc(var(--drawer-snap-point-offset, 0px) + var(--drawer-swipe-movement-y, 0px)))",
    ...(horizontal ? { width } : { height }),
    ...style,
  };

  return <DrawerPrimitive.Portal>
    {(showBackdrop ?? modal) ? <DrawerPrimitive.Backdrop
      data-km-drawer-backdrop=""
      className={joinPanelClasses("fixed inset-0 z-50 bg-overlay opacity-[calc(var(--km-panel-backdrop-opacity)*(1-var(--drawer-swipe-progress,0)))] transition-opacity duration-[var(--km-panel-backdrop-duration)] ease-[var(--km-panel-easing)] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[swiping]:transition-none motion-reduce:transition-none", !modal && "pointer-events-none", backdropClassName)}
      style={panelMotionStyle(config)}
    /> : null}
    <DrawerPrimitive.Viewport data-km-drawer-viewport="" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <DrawerPrimitive.Popup
        {...props} ref={ref}
        data-km-drawer="" data-side={side} aria-modal={modal ? true : undefined}
        className={joinPanelClasses(
          "pointer-events-auto fixed translate-x-0 translate-y-0 opacity-100 transition-[transform,translate,opacity] duration-[var(--km-panel-duration)] ease-[var(--km-panel-easing)] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[swiping]:transition-none motion-reduce:transition-none",
          PANEL_SURFACE, "rounded-surface", POSITION[side], horizontal ? HORIZONTAL_SIZES[size] : `w-full ${VERTICAL_SIZES[size]}`,
          OFFSCREEN[side], className
        )}
        style={panelStyle}
      >
        <DrawerPrimitive.Content className="flex min-h-0 flex-1 flex-col">
          {(showHandle ?? !horizontal) ? <div data-km-drawer-handle="" aria-hidden="true" className={joinPanelClasses("mx-auto my-3 shrink-0 rounded-full bg-muted-foreground/40", horizontal ? "h-10 w-1" : "h-1 w-10")} /> : null}
          {children}
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Popup>
    </DrawerPrimitive.Viewport>
  </DrawerPrimitive.Portal>;
});

type DrawerTitleProps = Omit<ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>, "className"> & { className?: string };
type DrawerDescriptionProps = Omit<ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>, "className"> & { className?: string };
type DrawerCloseProps = Omit<ComponentPropsWithoutRef<typeof DrawerPrimitive.Close>, "className"> & { className?: string };
export const DrawerTitle = forwardRef<HTMLHeadingElement, DrawerTitleProps>(function DrawerTitle({ className, ...props }, ref) {
  return <DrawerPrimitive.Title ref={ref} {...props} className={joinPanelClasses(PANEL_TITLE, className)} />;
});
export const DrawerDescription = forwardRef<HTMLParagraphElement, DrawerDescriptionProps>(function DrawerDescription({ className, ...props }, ref) {
  return <DrawerPrimitive.Description ref={ref} {...props} className={joinPanelClasses(PANEL_DESCRIPTION, className)} />;
});
export const DrawerClose = forwardRef<HTMLButtonElement, DrawerCloseProps>(function DrawerClose({ className, children, ...props }, ref) {
  return <DrawerPrimitive.Close ref={ref} {...props} aria-label={props["aria-label"] ?? (children == null ? "Close drawer" : undefined)} className={joinPanelClasses(PANEL_CLOSE, className)}>{children ?? <span aria-hidden="true" className="text-xl leading-none">×</span>}</DrawerPrimitive.Close>;
});

export const Drawer = Object.assign(DrawerRoot, {
  Root: DrawerRoot, Trigger: DrawerTrigger, SwipeArea: DrawerSwipeArea, Indent: DrawerIndent,
  IndentBackground: DrawerIndentBackground, Content: DrawerContent, Header: PanelHeader,
  Title: DrawerTitle, Description: DrawerDescription, Body: PanelBody, Footer: PanelFooter, Close: DrawerClose,
});
export default Drawer;
