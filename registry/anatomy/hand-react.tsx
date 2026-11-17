/**
 * React pieces for ANAT1 hands: `HandView` (a posed or grasping hand rendered by `renderHand` in a worker and
 * cached) and `HandFlipbook` (an action rendered frame by frame in workers, then played at its own speed; with
 * reduced motion it waits for Play).
 */
import { forwardRef, useEffect, useRef, useState } from "react";
import type { CanvasHTMLAttributes, CSSProperties } from "react";
import { ANATOMY_RENDER_POOL } from "./anatomy-render-pool";
import { requestRender } from "./foundation-render";
import { RenderFrame } from "./foundation-render-react";
import { sheetSmall } from "./foundation-react";
import { findAnimation } from "./hand-model";
import type { HandRenderOptions } from "./hand-render";

import type { HandSpec } from "./anatomy-render-jobs";

export type { HandSpec };
const canvasStyle = (W: number, H: number, style?: CSSProperties): CSSProperties => ({ display: "block", width: "100%", height: "auto", aspectRatio: `${W} / ${H}`, borderRadius: 6, background: "var(--km-surface-subtle, #8a8784)", ...style });

export interface HandViewProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "width" | "height"> { hand: HandSpec; options?: HandRenderOptions; label: string }
/** A hand in a gesture or grasp, rendered in a worker and cached, with a visible working state. */
export const HandView = forwardRef<HTMLCanvasElement, HandViewProps>(function HandView({ hand, options = {}, label, style, ...rest }, ref) {
  const W = Math.round(options.width ?? 320), H = Math.round(options.height ?? 320);
  return <RenderFrame ref={ref} width={W} height={H} label={label} placeholder="var(--km-surface-subtle, #8a8784)" style={style}
    job={{ pool: ANATOMY_RENDER_POOL, kind: "hand", args: { hand, options } }} {...rest} />;
});

export interface HandFlipbookProps { type: string; animation: string; side?: "right" | "left"; options?: HandRenderOptions; fps?: number; label?: string }
/** An action rendered frame by frame (draft quality), then looped at its own speed. Reduced motion: it waits for Play. */
export function HandFlipbook({ type, animation, side = "right", options = {}, fps = 12, label }: HandFlipbookProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const anim = findAnimation(animation), n = Math.max(2, Math.round(anim.duration * fps));
  const W = Math.round(options.width ?? 200), H = Math.round(options.height ?? 200);
  const [frames, setFrames] = useState<ImageData[]>([]), [playing, setPlaying] = useState(false);
  const key = JSON.stringify([type, animation, side, options, fps]);
  useEffect(() => {
    let live = true;
    setFrames([]);
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setPlaying(!reduce);
    const ac = new AbortController(), out: (ImageData | undefined)[] = new Array(n).fill(undefined);
    let count = 0;
    for (let k = 0; k < n; k++) void requestRender({ pool: ANATOMY_RENDER_POOL, kind: "hand-frame", args: { type, side, animation, t: (k / n) * anim.duration, options: { quality: "draft", supersample: 1, ...options, width: W, height: H } }, priority: 1 + k / n, signal: ac.signal })
      .then(r => { if (!live) return; out[k] = new ImageData(new Uint8ClampedArray(r.rgba), r.width, r.height); count++; if (count === n) setFrames(out as ImageData[]); else setFrames(out.filter((f): f is ImageData => !!f)); }, () => {});
    const stop = () => ac.abort();
    return () => { live = false; stop(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const ready = frames.length === n;
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || !frames.length) return;
    if (!ready || !playing) { ctx.putImageData(frames[ready ? 0 : frames.length - 1], 0, 0); return; }
    let raf = 0, start = 0;
    const tick = (now: number) => { if (!start) start = now; const k = Math.floor(((now - start) / 1000) * fps) % n; ctx.putImageData(frames[k], 0, 0); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frames, ready, playing, fps, n]);
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <canvas ref={canvas} width={W} height={H} role="img" aria-label={label ?? `${anim.label}, animated`} aria-busy={!ready} style={canvasStyle(W, H)} />
      <div style={{ display: "flex", gap: 8, alignItems: "center", ...sheetSmall }}>
        <button type="button" disabled={!ready} onClick={() => setPlaying(p => !p)} aria-pressed={playing} style={{ minHeight: 32, padding: "4px 10px", borderRadius: 6, border: "1px solid #797776", background: "#fff", font: "13px system-ui" }}>{playing ? "Pause" : "Play"}</button>
        <span aria-live="polite">{ready ? `${n} frames, ${fps} fps` : `Preparing frames ${frames.length} / ${n}`}</span>
      </div>
    </div>
  );
}
