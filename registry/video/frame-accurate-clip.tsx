import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import type { RationalFps } from "../motion/types";
import { checkClipCapabilities, resolveClipDraw, resolveClipFrame } from "./frame-clip";
import type { ClipDiagnostic, ClipFraming, ClipPlacement, ResolvedClipFrame } from "./frame-clip";
import type { ClipFrameAdapter, ClipFrameImage } from "./frame-clip-adapters";

export type ClipStatus = "pending" | "ready" | "inexact" | "hidden" | "error";
export interface ClipRenderState {
  status: ClipStatus;
  resolved: ResolvedClipFrame;
  /** Source frame actually drawn on the canvas. */
  drawnFrame?: number;
  /** Source frame + framing + box of the drawn result; the clip is pending until it matches the request. */
  drawnKey?: string;
  presentedTime?: number;
  diagnostics: ClipDiagnostic[];
  message?: string;
}
export interface FrameAccurateClipProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  placement: ClipPlacement;
  /** Absolute output frame. The clip owns no clock. */
  frame: number;
  fps: RationalFps;
  adapter: ClipFrameAdapter;
  /** Box size in output px for this output; framing is resolved per box. */
  width: number;
  height: number;
  framing?: ClipFraming;
  /** Inexact frames become errors (export). Default false: shown but reported as `inexact`. */
  requireExact?: boolean;
  /** Accessible description of the footage. */
  description: string;
  onStatus?: (state: ClipRenderState) => void;
}

/** Deterministic footage: the canvas shows exactly the source frame resolved for `frame`, or says why not. */
export const FrameAccurateClip = forwardRef<HTMLDivElement, FrameAccurateClipProps>(function FrameAccurateClip({
  placement, frame, fps, adapter, width, height, framing, requireExact = false, description, onStatus, style, ...props
}, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const resolved = useMemo(() => resolveClipFrame(placement, frame, fps), [placement, frame, fps]);
  const capabilities = useMemo(() => checkClipCapabilities(placement, adapter, { requireExact }), [placement, adapter, requireExact]);
  const blocking = capabilities.filter(d => d.severity === "error");
  const [state, setState] = useState<ClipRenderState>({ status: "pending", resolved, diagnostics: capabilities });
  const notify = useRef(onStatus);
  notify.current = onStatus;
  const framingKey = JSON.stringify(framing ?? {});
  const requestKey = JSON.stringify([resolved.sourceFrame, framingKey, width, height]);

  useEffect(() => {
    const publish = (next: ClipRenderState) => { setState(next); notify.current?.(next); };
    const context = canvas.current?.getContext("2d");
    if (blocking.length) { publish({ status: "error", resolved, diagnostics: capabilities, message: blocking[0].message }); return; }
    if (!resolved.visible || resolved.sourceFrame === undefined) { context?.clearRect(0, 0, width, height); publish({ status: "hidden", resolved, diagnostics: capabilities }); return; }
    const controller = new AbortController(), index = resolved.sourceFrame;
    publish({ status: "pending", resolved, diagnostics: capabilities });
    adapter.load(placement.source, index, controller.signal).then((image: ClipFrameImage) => {
      if (controller.signal.aborted) return;
      if (!context) throw new Error("2D canvas is unavailable.");
      const draw = resolveClipDraw(placement.source, { width, height }, framing);
      const sx = image.width / placement.source.width, sy = image.height / placement.source.height;
      context.clearRect(0, 0, width, height);
      context.drawImage(image.image, draw.sx * sx, draw.sy * sy, draw.sw * sx, draw.sh * sy, draw.dx, draw.dy, draw.dw, draw.dh);
      const inexact = !image.exact;
      publish({ status: inexact ? (requireExact ? "error" : "inexact") : "ready", resolved, drawnFrame: index, drawnKey: JSON.stringify([index, framingKey, width, height]),
        presentedTime: image.presentedTime, diagnostics: capabilities,
        message: inexact ? `Frame ${index} could not be verified${image.presentedTime !== undefined ? ` (decoder presented ${image.presentedTime.toFixed(3)} s)` : ""}.` : undefined });
    }).catch((cause: unknown) => {
      if (controller.signal.aborted || (cause instanceof DOMException && cause.name === "AbortError")) return;
      publish({ status: "error", resolved, drawnKey: JSON.stringify([index, framingKey, width, height]), diagnostics: capabilities,
        message: `Frame ${index} is unavailable: ${cause instanceof Error ? cause.message : String(cause)}` });
    });
    return () => controller.abort();
    // framingKey tracks framing by value; resolved/capabilities are memoized on their inputs.
  }, [adapter, placement, resolved, capabilities, blocking.length, width, height, framingKey, requireExact]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived during render: right after a seek the effect has not run yet, so a stale "ready"
  // (previous frame or framing still on the canvas) must read as pending to capture tools.
  const status: ClipStatus = blocking.length ? "error" : !resolved.visible ? "hidden"
    : state.drawnKey !== requestKey ? "pending" : state.status;
  return <div {...props} ref={ref} data-km-frame-clip="" data-clip-status={status} data-expected-source-frame={resolved.sourceFrame ?? ""}
    data-source-frame={state.drawnFrame ?? ""} data-clip-phase={resolved.phase}
    style={{ position: "relative", width: "100%", aspectRatio: `${width} / ${height}`, ...style }}>
    <canvas ref={canvas} width={width} height={height} role="img" aria-label={description}
      style={{ display: "block", width: "100%", height: "100%", visibility: status === "hidden" ? "hidden" : undefined }} />
    {status === "error" ? <p role="alert" style={{ position: "absolute", inset: "auto 8px 8px 8px", margin: 0, padding: "6px 10px", borderRadius: 6,
      font: "500 13px/1.4 var(--km-font-body, system-ui, sans-serif)", background: "var(--km-surface-elevated, #fff)", color: "var(--km-text-danger, #b91c1c)" }}>{state.message}</p> : null}
  </div>;
});
