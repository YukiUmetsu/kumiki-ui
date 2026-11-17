/**
 * React pieces for ANAT1 hands: `HandView` (a posed or grasping hand rendered by `renderHand` into a canvas after
 * paint, queued and cached) and `HandFlipbook` (an action rendered frame by frame, then played at its own speed; with
 * reduced motion it waits for Play).
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { CanvasHTMLAttributes, CSSProperties } from "react";
import { enqueueRender } from "./foundation-queue";
import { sheetSmall } from "./foundation-react";
import { animateHand, buildHand, findAnimation, graspHand, HAND_GESTURES, poseHand } from "./hand-model";
import type { HandPose } from "./hand-model";
import { renderHand } from "./hand-render";
import type { HandRender, HandRenderOptions } from "./hand-render";

export interface HandSpec { type: string; side?: "right" | "left"; gesture?: string; pose?: HandPose; grasp?: string; close?: number }
const cache = new Map<string, HandRender>();
const posed = (h: HandSpec) => {
  const hand = buildHand(h.type, h.side ?? "right");
  if (h.grasp) return graspHand(hand, h.grasp, h.close ?? 1);
  return poseHand(hand, h.pose ?? HAND_GESTURES.find(g => g.id === (h.gesture ?? "relaxed"))?.pose ?? HAND_GESTURES[0].pose);
};
const canvasStyle = (W: number, H: number, style?: CSSProperties): CSSProperties => ({ display: "block", width: "100%", height: "auto", aspectRatio: `${W} / ${H}`, borderRadius: 6, background: "var(--km-surface-subtle, #8a8784)", ...style });

export interface HandViewProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "width" | "height"> { hand: HandSpec; options?: HandRenderOptions; label: string }
/** A hand in a gesture or grasp, rendered after paint and cached. */
export const HandView = forwardRef<HTMLCanvasElement, HandViewProps>(function HandView({ hand, options = {}, label, style, ...rest }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null), [busy, setBusy] = useState(true);
  useImperativeHandle(ref, () => canvas.current as HTMLCanvasElement, []);
  const key = JSON.stringify([hand, options]), W = Math.round(options.width ?? 320), H = Math.round(options.height ?? 320);
  useEffect(() => {
    let live = true;
    const draw = (r: HandRender) => { const ctx = canvas.current?.getContext("2d"); if (ctx) ctx.putImageData(new ImageData(new Uint8ClampedArray(r.rgba), r.width, r.height), 0, 0); setBusy(false); };
    const hit = cache.get(key);
    if (hit) { draw(hit); return () => { live = false; }; }
    setBusy(true);
    void enqueueRender(() => {
      if (!live) return;
      const r = renderHand(posed(hand), options);
      if (cache.size > 80) cache.clear();
      cache.set(key, r);
      if (live) draw(r);
    });
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={canvas} width={W} height={H} role="img" aria-label={label} aria-busy={busy} style={canvasStyle(W, H, style)} {...rest} />;
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
    const hand = buildHand(type, side), out: ImageData[] = [];
    for (let k = 0; k < n; k++) void enqueueRender(() => {
      if (!live) return;
      const r = renderHand(animateHand(hand, anim, (k / n) * anim.duration), { quality: "draft", supersample: 1, ...options, width: W, height: H });
      out.push(new ImageData(new Uint8ClampedArray(r.rgba), r.width, r.height));
      if (live) setFrames(out.slice());
    });
    return () => { live = false; };
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
