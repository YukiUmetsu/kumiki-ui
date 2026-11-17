/**
 * `RenderFrame`: a canvas that shows a `foundation-render` job.
 *
 * - It starts rendering when it comes near the screen (600 px ahead), so long pages render what is seen first.
 * - A cached render draws at once. Otherwise an optional preview (a smaller, quicker render of the same picture) is
 *   drawn first and then replaced by the full render.
 * - While it works, a small badge says so ("Rendering…", "Preview · refining…"); when the options change, the last
 *   picture stays, dimmed, until the new one is ready, so a lab never flashes empty. The badge's spinner stands still
 *   under reduced motion. The canvas carries `aria-busy` while it renders; errors show as text on the frame.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { CanvasHTMLAttributes, CSSProperties } from "react";
import { cachedRender, peekRender, requestRender } from "./foundation-render";
import type { RenderOutput, RenderPool } from "./foundation-render";

/** One job for a `RenderFrame`. */
export interface RenderJobSpec { pool: RenderPool; kind: string; args: unknown; affinity?: string; persist?: boolean }

export interface RenderFrameProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "width" | "height"> {
  job: RenderJobSpec;
  /** A quicker, smaller render of the same picture, drawn first (scaled up) when the full one is not cached. */
  preview?: RenderJobSpec;
  width: number;
  height: number;
  label: string;
  /** The canvas colour before anything is drawn. */
  placeholder?: string;
  onResult?: (out: RenderOutput) => void;
}

const STYLE_ID = "km-render-frame-style";
function ensureStyle() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = "@keyframes km-render-spin{to{transform:rotate(360deg)}}.km-render-spinner{width:12px;height:12px;border-radius:50%;border:2px solid #fff6;border-top-color:#fff;animation:km-render-spin .9s linear infinite;flex:none}@media (prefers-reduced-motion: reduce){.km-render-spinner{animation:none;border-color:#fff}}";
  document.head.appendChild(s);
}

const badge: CSSProperties = { position: "absolute", left: 8, top: 8, display: "flex", alignItems: "center", gap: 6, padding: "3px 9px 3px 7px", borderRadius: 999,
  background: "rgba(24, 21, 19, 0.74)", color: "#fff", font: "600 12px/1.4 var(--km-font-sans, system-ui, sans-serif)", pointerEvents: "none" };

function draw(c: HTMLCanvasElement | null, r: RenderOutput) {
  const ctx = c?.getContext("2d");
  if (!c || !ctx) return;
  const img = new ImageData(new Uint8ClampedArray(r.rgba), r.width, r.height);
  if (r.width === c.width && r.height === c.height) { ctx.putImageData(img, 0, 0); return; }
  // a preview: scale it up smoothly
  const tmp = document.createElement("canvas");
  tmp.width = r.width; tmp.height = r.height;
  tmp.getContext("2d")?.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(tmp, 0, 0, c.width, c.height);
}

type Phase = "idle" | "rendering" | "preview" | "done" | "error";

/** A canvas showing a render job: started near the screen, cached, previewed, with a visible working state. */
export const RenderFrame = forwardRef<HTMLCanvasElement, RenderFrameProps>(function RenderFrame({ job, preview, width, height, label, placeholder = "var(--km-surface-subtle, #8a8784)", onResult, style, ...rest }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null), box = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => canvas.current as HTMLCanvasElement, []);
  const [near, setNear] = useState(false), [phase, setPhase] = useState<Phase>("idle"), [error, setError] = useState(""), [drawn, setDrawn] = useState(false);
  const key = JSON.stringify([job.pool.id, job.kind, job.args, preview ? [preview.kind, preview.args] : null, width, height]);
  const result = useRef(onResult);
  result.current = onResult;

  useEffect(() => { ensureStyle(); }, []);
  useEffect(() => {
    if (near) return;
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") { setNear(true); return; }
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { setNear(true); io.disconnect(); } }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  useEffect(() => {
    const hit = peekRender(job);
    if (hit) { draw(canvas.current, hit); setDrawn(true); setPhase("done"); setError(""); result.current?.(hit); return; }
    setPhase("rendering");
    if (!near) return;
    const ac = new AbortController();
    let full = false;
    void (async () => {
      const cached = await cachedRender(job);
      if (ac.signal.aborted) return;
      if (cached) { draw(canvas.current, cached); setDrawn(true); setPhase("done"); result.current?.(cached); return; }
      if (preview) requestRender({ ...preview, priority: 0, signal: ac.signal }).then(r => {
        if (full || ac.signal.aborted) return;
        draw(canvas.current, r); setDrawn(true); setPhase("preview");
      }, () => {});
      try {
        const r = await requestRender({ ...job, priority: 1, signal: ac.signal });
        full = true;
        if (ac.signal.aborted) return;
        draw(canvas.current, r); setDrawn(true); setPhase("done"); setError(""); result.current?.(r);
      } catch (e) {
        if ((e as Error)?.name === "AbortError" || ac.signal.aborted) return;
        setError(String((e as Error)?.message ?? e)); setPhase("error");
      }
    })();
    return () => ac.abort();
  }, [key, near]); // eslint-disable-line react-hooks/exhaustive-deps

  const working = phase === "rendering" || phase === "preview";
  return (
    <div ref={box} style={{ position: "relative", minWidth: 0 }}>
      <canvas ref={canvas} width={width} height={height} role="img" aria-label={label} aria-busy={phase !== "done"}
        style={{ display: "block", width: "100%", height: "auto", aspectRatio: `${width} / ${height}`, borderRadius: 6, background: placeholder,
          opacity: working && drawn && phase !== "preview" ? 0.6 : 1, transition: "opacity 160ms ease-out", ...style }} {...rest} />
      {working ? <div style={badge} aria-hidden="true"><span className="km-render-spinner" />{phase === "preview" ? "Preview · refining…" : "Rendering…"}</div> : null}
      {phase === "error" ? <div role="alert" style={{ ...badge, background: "#7a1f1f", maxWidth: "calc(100% - 16px)", whiteSpace: "normal" }}>Could not render: {error}</div> : null}
    </div>
  );
});
