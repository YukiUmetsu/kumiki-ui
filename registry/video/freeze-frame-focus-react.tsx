import { forwardRef, useId, useMemo } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { createCanvasMeasurer } from "../media/text-layout";
import type { RationalFps } from "../motion/types";
import { layoutCallouts } from "../visual/semantic-callouts";
import type { CalloutLayout, CalloutTypography } from "../visual/semantic-callouts";
import { SemanticCalloutOverlay } from "../visual/semantic-callouts-react";
import type { CalloutTheme } from "../visual/semantic-callouts-react";
import { FrameAccurateClip } from "./frame-accurate-clip";
import type { ClipRenderState } from "./frame-accurate-clip";
import type { ClipFraming } from "./frame-clip";
import type { ClipFrameAdapter } from "./frame-clip-adapters";
import { evaluateFreezeFocus, footageInspectable, freezeFocusCallouts, freezeFocusClip } from "./freeze-frame-focus";
import type { FreezeFrameFocusSpec } from "./freeze-frame-focus";

export interface FreezeFrameFocusProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  spec: FreezeFrameFocusSpec;
  frame: number;
  fps: RationalFps;
  adapter: ClipFrameAdapter;
  /** Box in output px; each output can pass its own framing. */
  width: number;
  height: number;
  framing?: ClipFraming;
  description: string;
  /** Callout fonts in output px. Measured with the loaded font via canvas. */
  typography?: Partial<Omit<CalloutTypography, "measure">>;
  calloutTheme?: Partial<CalloutTheme>;
  requireExact?: boolean;
  onStatus?: (state: ClipRenderState) => void;
}

/** Pause, push in on an annotated detail, explain it, release. Owns no clock.
 * For the phase, framing and spotlight of a frame, call `evaluateFreezeFocus` (pure). */
export const FreezeFrameFocus = forwardRef<HTMLDivElement, FreezeFrameFocusProps>(function FreezeFrameFocus({
  spec, frame, fps, adapter, width, height, framing, description, typography, calloutTheme, requireExact, onStatus, style, ...props
}, ref) {
  const clip = useMemo(() => freezeFocusClip(spec), [spec]);
  const asset = useMemo(() => footageInspectable(spec, fps), [spec, fps]);
  const callouts = useMemo(() => freezeFocusCallouts(spec), [spec]);
  const measure = useMemo(() => createCanvasMeasurer({}), []);
  const box = useMemo(() => ({ width, height }), [width, height]);
  const focus = evaluateFreezeFocus(spec, frame, fps, box, framing);
  const titleSizePx = typography?.titleSizePx ?? Math.round(Math.min(width, height) * 0.045);
  const layout: CalloutLayout = callouts.length ? layoutCallouts({
    asset, callouts, frame, viewport: box,
    project: ([x, y]) => { const d = focus.draw, px = d.dx + (x - d.sx) * d.scale, py = d.dy + (y - d.sy) * d.scale; return { x: px, y: py, inView: px >= 0 && py >= 0 && px <= width && py <= height }; },
    occluded: () => false,
    protectedRegions: focus.focusRect ? [focus.focusRect] : [],
    // Canvas measurement cannot resolve CSS variables: pass a concrete font stack.
    typography: { titleFont: `600 ${titleSizePx}px system-ui, sans-serif`, titleSizePx,
      maxWidthPx: Math.round(width * 0.42), ...typography, measure },
  }) : { callouts: [], diagnostics: [] };
  const maskId = `${useId().replace(/:/g, "")}-spot`;
  const r = focus.focusRect, padPx = Math.min(width, height) * 0.02;
  return <div {...props} ref={ref} data-km-freeze-focus="" data-freeze-phase={focus.phase} style={{ position: "relative", width: "100%", aspectRatio: `${width} / ${height}`, ...style }}>
    <FrameAccurateClip placement={clip} frame={frame} fps={fps} adapter={adapter} width={width} height={height} framing={focus.framing}
      requireExact={requireExact} description={description} onStatus={onStatus} style={{ position: "absolute", inset: 0 }} />
    {r && focus.amount > 0 ? <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true" data-km-freeze-spotlight=""
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      <defs><mask id={maskId}><rect width={width} height={height} fill="white" />
        <rect x={r.x - padPx} y={r.y - padPx} width={r.width + 2 * padPx} height={r.height + 2 * padPx} rx={padPx} fill="black" /></mask></defs>
      <rect width={width} height={height} fill="var(--km-freeze-dim, #05080f)" opacity={focus.dim} mask={`url(#${maskId})`} />
      <rect x={r.x - padPx} y={r.y - padPx} width={r.width + 2 * padPx} height={r.height + 2 * padPx} rx={padPx} fill="none"
        stroke="var(--km-freeze-outline, #ffd166)" strokeWidth={Math.max(2, Math.min(width, height) * 0.006)} opacity={focus.amount} />
    </svg> : null}
    <SemanticCalloutOverlay layout={layout} width={width} height={height} theme={calloutTheme} />
  </div>;
});
