import { Children, cloneElement, forwardRef, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from "react";
import { planExplainerLayout } from "./explainer-layout";
import type { ExplainerLayoutResult, ProtectedSubjectRegion } from "./explainer-layout";
import { measureDOMTypography } from "./dom-text-measure";

export interface ExplainerComposition {
  orientation: "landscape" | "portrait";
  subjects: Array<{ id: string; region: ProtectedSubjectRegion["region"] }>;
}
export interface ExplainerVisualProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  children?: ReactNode | ((composition: ExplainerComposition) => ReactNode);
}
export const ExplainerVisual = forwardRef<HTMLDivElement, ExplainerVisualProps>(function ExplainerVisual({ style, children, ...props }, ref) {
  return <div {...props} ref={ref} data-km-explainer-visual="" style={{ ...style, position: "absolute", inset: 0 }}>{typeof children === "function" ? null : children}</div>;
});
export interface ExplainerTextProps extends Omit<ComponentPropsWithoutRef<"p">, "children"> {
  children: string;
  maxLines?: number;
}
export const ExplainerText = forwardRef<HTMLParagraphElement, ExplainerTextProps>(function ExplainerText({ maxLines: _maxLines, style, ...props }, ref) {
  void _maxLines;
  return <p {...props} ref={ref} data-km-explainer-text="" style={{ fontFamily: "var(--km-font-body, sans-serif)", fontSize: "var(--km-explainer-font-size, 24px)", lineHeight: 1.4, color: "var(--km-text-primary, currentColor)", ...style, margin: 0 }} />;
});
export interface ExplainerStageProps extends ComponentPropsWithoutRef<"div"> {
  subjects?: readonly ProtectedSubjectRegion[];
  protect?: readonly string[];
  /** Auto uses portrait below 600 CSS px; measurement is at actual output size. */
  aspect?: "16:9" | "9:16" | "auto";
  safeMargin?: number;
  gapPx?: number;
  onLayout?: (result: ExplainerLayoutResult) => void;
}
const noSubjects: readonly ProtectedSubjectRegion[] = [];
const noProtection: readonly string[] = [];

/** One visual + one measured explanation. Essential text never silently clips.
 * Subject bounds are declared/projected output coordinates, not DOM discovery. */
export const ExplainerStage = forwardRef<HTMLDivElement, ExplainerStageProps>(function ExplainerStage({
  subjects = noSubjects, protect = noProtection, aspect = "auto", safeMargin = .06, gapPx = 20,
  onLayout, children, style, ...props
}, forwardedRef) {
  const slots = useMemo(() => Children.toArray(children), [children]);
  const visual = slots.find(child => isValidElement(child) && child.type === ExplainerVisual) as ReactElement<ExplainerVisualProps> | undefined;
  const text = slots.find(child => isValidElement(child) && child.type === ExplainerText) as ReactElement<ExplainerTextProps> | undefined;
  const root = useRef<HTMLDivElement | null>(null), canvas = useRef<HTMLDivElement>(null), metrics = useRef<HTMLParagraphElement>(null);
  const [portrait, setPortrait] = useState(aspect === "9:16");
  const [layout, setLayout] = useState<ExplainerLayoutResult | null>(null);
  const lastNotification = useRef("");
  const callback = useRef(onLayout);
  callback.current = onLayout;

  useEffect(() => {
    const stage = canvas.current, measurement = metrics.current;
    if (!stage || !measurement || !text) return;
    let active = true;
    const publish = (result: ExplainerLayoutResult) => {
      setLayout(result);
      const signature = JSON.stringify(result);
      if (signature !== lastNotification.current) {
        lastNotification.current = signature;
        callback.current?.(result);
      }
    };
    const compose = async () => {
      setLayout(null);
      try {
        const font = getComputedStyle(measurement).font;
        if (font) await document.fonts?.load(font, text.props.children);
        await document.fonts?.ready;
        if (!active) return;
        const width = stage.getBoundingClientRect().width;
        const isPortrait = aspect === "9:16" || aspect === "auto" && width < 600;
        setPortrait(isPortrait);
        const height = width * (isPortrait ? 16 / 9 : 9 / 16);
        const typography = measureDOMTypography(measurement);
        const result = planExplainerLayout({ viewport: { width, height }, subjects, protect,
          text: text.props.children, maxLines: text.props.maxLines, language: text.props.lang,
          safeMargin, gapPx, ...typography }, typography.measure);
        publish(result);
      } catch (cause) {
        if (!active) return;
        const result: ExplainerLayoutResult = { ok: false, diagnostics: [{ code: "text-measurer-unavailable", message: `Cannot measure explanation. Load its font and retry: ${String(cause)}` }] };
        publish(result);
      }
    };
    void compose();
    let observedWidth = stage.getBoundingClientRect().width;
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(() => {
      const width = stage.getBoundingClientRect().width;
      if (width !== observedWidth) { observedWidth = width; void compose(); }
    });
    observer?.observe(stage);
    const typographyObserver = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(() => { void compose(); });
    typographyObserver?.observe(measurement);
    document.fonts?.addEventListener("loadingdone", compose);
    window.addEventListener("resize", compose);
    return () => {
      active = false;
      observer?.disconnect();
      typographyObserver?.disconnect();
      document.fonts?.removeEventListener("loadingdone", compose);
      window.removeEventListener("resize", compose);
    };
  }, [text, subjects, protect, aspect, safeMargin, gapPx, props.className, style]);

  if (slots.length !== 2 || !visual || !text || typeof text.props.children !== "string")
    throw new Error("ExplainerStage requires exactly one ExplainerVisual and one ExplainerText with plain essential text as direct children.");
  const ready = layout?.ok ? layout : null;
  const status = !layout ? "pending" : layout.ok ? "ready" : "error";
  return <div {...props} ref={node => { root.current = node; if (typeof forwardedRef === "function") forwardedRef(node); else if (forwardedRef) forwardedRef.current = node; }}
    data-km-explainer-stage="" data-layout-status={status} data-orientation={portrait ? "portrait" : "landscape"}
    aria-busy={status === "pending"} style={{ ...style, position: "relative", width: style?.width ?? "100%" }}>
    <div ref={canvas} data-km-explainer-canvas="" style={{ position: "relative", overflow: "hidden", aspectRatio: portrait ? "9 / 16" : "16 / 9" }}>
      {cloneElement(visual, { key: "visual", children: typeof visual.props.children === "function" ? visual.props.children({
        orientation: portrait ? "portrait" : "landscape",
        subjects: subjects.map(subject => ({ id: subject.id, region: portrait ? subject.portraitRegion ?? subject.region : subject.region })),
      }) : visual.props.children })}
      {ready ? cloneElement(text, { key: "explanation", children: ready.text.lines.join("\n"), style: { ...text.props.style,
        position: "absolute", left: `${ready.text.rect.x * 100}%`, top: `${ready.text.rect.y * 100}%`,
        width: `${ready.text.rect.width * 100}%`, whiteSpace: "pre", padding: 0, border: 0 } }) : null}
      {cloneElement(text, { key: "measurement", id: undefined, ref: metrics, "aria-hidden": true, tabIndex: -1,
        style: { ...text.props.style, position: "absolute", visibility: "hidden", pointerEvents: "none", left: 0, top: 0,
          width: "max-content", maxWidth: "none", whiteSpace: "pre", padding: 0, border: 0 } } as Partial<ExplainerTextProps> & { ref: typeof metrics; key: string })}
    </div>
    {layout && !layout.ok ? <div data-km-explainer-fallback="" style={{ padding: "var(--km-space-4, 16px)" }}>
      <p role="alert">{layout.diagnostics.map(diagnostic => diagnostic.message).join(" ")}</p>
      {cloneElement(text, { key: "fallback", style: { ...text.props.style, position: "static", width: "auto", maxWidth: "100%", whiteSpace: "pre-wrap", overflowWrap: "anywhere" } })}
    </div> : null}
  </div>;
});
