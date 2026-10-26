import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";

export const joinPanelClasses = (...values: Array<string | undefined | false>) => values.filter(Boolean).join(" ");

/** Shared panel structure. Motion, gestures and dialog semantics remain in their respective primitives. */
export const PANEL_SURFACE = "flex min-h-0 flex-col overflow-hidden border border-border bg-surface-elevated text-foreground shadow-lg focus:outline-none";
export const PANEL_CLOSE = "inline-flex size-9 shrink-0 items-center justify-center rounded-control text-muted-foreground transition-colors duration-[var(--km-duration-short)] motion-reduce:transition-none hover:bg-surface-subtle hover:text-foreground active:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated";
export const PANEL_TITLE = "min-w-0 text-lg font-semibold leading-snug tracking-tight text-foreground";
export const PANEL_DESCRIPTION = "mt-1 text-sm leading-relaxed text-muted-foreground";

export const PanelHeader = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(function PanelHeader({ className, ...props }, ref) {
  return <div ref={ref} {...props} data-km-panel-header="" className={joinPanelClasses("flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4", className)} />;
});

export const PanelBody = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(function PanelBody({ className, ...props }, ref) {
  return <div ref={ref} {...props} data-km-panel-body="" className={joinPanelClasses("min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 text-sm", className)} />;
});

export const PanelFooter = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(function PanelFooter({ className, ...props }, ref) {
  return <div ref={ref} {...props} data-km-panel-footer="" className={joinPanelClasses("flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-surface-elevated px-5 py-4", className)} />;
});
