/**
 * ANAT1 reference painters. `HumanFigure` draws one `HumanFrame`: a canvas surface (clay, tonal value study or flat
 * silhouette) under SVG line work (visible contours with light-driven weight, light/shadow terminators, the mesh,
 * skeleton, landmarks and a head-unit grid). Colours come from CSS custom properties so themes can restyle it:
 *   --kumiki-anatomy-light, --kumiki-anatomy-shadow, --kumiki-anatomy-ink, --kumiki-anatomy-accent, --kumiki-anatomy-grid
 * Painters for other media should consume `HumanFrame` directly (triangles, contours, terminators, landmarks).
 */
import { forwardRef, useEffect, useMemo, useRef } from "react";
import type { CSSProperties, HTMLAttributes } from "react";
import type { HumanFrame } from "./anatomy-view";
import { rasterizeHumanFrame, smoothPath } from "./anatomy-view";

export type HumanSurface = "clay" | "tonal" | "cel" | "silhouette" | "none";
export interface HumanPalette { light: string; shadow: string; ink: string; accent: string; grid: string; eye: string }
const FALLBACK: HumanPalette = { light: "#e8d8c6", shadow: "#5b4a42", ink: "#2a211d", accent: "#c2413a", grid: "#9a8f86", eye: "#f4efe8" };
const VARS: Record<keyof HumanPalette, string> = { light: "--kumiki-anatomy-light", shadow: "--kumiki-anatomy-shadow", ink: "--kumiki-anatomy-ink", accent: "--kumiki-anatomy-accent", grid: "--kumiki-anatomy-grid", eye: "--kumiki-anatomy-eye" };

export interface HumanFigureProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  frame: HumanFrame;
  surface?: HumanSurface;
  /** Visible occluding contours with weight from light (thicker in shadow). */
  contour?: boolean;
  /** Terminator: where light turns into the core shadow. */
  terminator?: boolean;
  wire?: boolean;
  skeleton?: boolean;
  /** true for all landmarks, or a list of landmark names. */
  landmarks?: boolean | readonly string[];
  /** Head-unit grid: pass the standing stature and head height in metres. */
  headGrid?: { stature: number; headHeight: number };
  /** Base contour width in pixels (default scales with the figure). */
  lineWidth?: number;
  palette?: Partial<HumanPalette>;
  /** Accessible description of the figure. */
  label?: string;
}

const isHex = (s: string) => /^#[0-9a-f]{6}$/i.test(s);

function resolvePalette(el: Element | null, over?: Partial<HumanPalette>): HumanPalette {
  const css = el ? getComputedStyle(el) : null;
  const out = { ...FALLBACK };
  for (const k of Object.keys(VARS) as (keyof HumanPalette)[]) {
    const v = over?.[k] ?? css?.getPropertyValue(VARS[k]).trim();
    if (v && isHex(v)) out[k] = v;
  }
  return out;
}

export const HumanFigure = forwardRef<HTMLDivElement, HumanFigureProps>(function HumanFigure(
  { frame, surface = "clay", contour = true, terminator = false, wire = false, skeleton = false, landmarks = false, headGrid, lineWidth, palette, label, className, style, ...rest }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const { width, height } = frame;
  const base = lineWidth ?? Math.max(0.8, Math.min(2.6, frame.pixelsPerMetre / 260));
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
    cv.width = Math.round(width * dpr); cv.height = Math.round(height * dpr);
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (surface === "none") return;
    const pal = resolvePalette(hostRef.current, palette);
    const rgb = (h: string): [number, number, number] => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const img = rasterizeHumanFrame(frame, surface, { light: rgb(pal.light), shadow: rgb(pal.shadow), eye: rgb(pal.eye) }, dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.putImageData(new ImageData(img.data as Uint8ClampedArray<ArrayBuffer>, img.width, img.height), 0, 0);
  }, [frame, surface, palette, width, height]);

  const paths = useMemo(() => {
    const variable = (line: { points: [number, number][]; weight: number[] }, k: number) => {
      // split long lines into short runs so the stroke width can follow the weight hint
      const out: { d: string; w: number }[] = [];
      const step = 6;
      for (let i = 0; i < line.points.length - 1; i += step) {
        const seg = line.points.slice(i, Math.min(line.points.length, i + step + 1));
        const w = line.weight.slice(i, i + step + 1).reduce((a, b) => a + b, 0) / Math.min(step + 1, line.weight.length - i);
        out.push({ d: smoothPath(seg), w: w * k });
      }
      return out;
    };
    return {
      contours: contour ? frame.contours.flatMap(l => variable(l, base)) : [],
      terminators: terminator ? frame.terminators.map(l => smoothPath(l.points)) : [],
    };
  }, [frame, contour, terminator, base]);

  const wirePath = useMemo(() => {
    if (!wire) return "";
    const s = frame.screen, r = (v: number) => Math.round(v * 10) / 10;
    return frame.triangles.filter(t => !t.eye).map(t => `M${r(s[t.a * 3])} ${r(s[t.a * 3 + 1])}L${r(s[t.b * 3])} ${r(s[t.b * 3 + 1])}L${r(s[t.c * 3])} ${r(s[t.c * 3 + 1])}Z`).join("");
  }, [frame, wire]);

  const lmNames = landmarks === true ? Object.keys(frame.landmarks) : landmarks ? landmarks : [];
  const grid = headGrid ? Array.from({ length: Math.ceil(headGrid.stature / headGrid.headHeight) + 1 }, (_, k) => frame.floorY - k * headGrid.headHeight * frame.pixelsPerMetre) : [];
  const cssVars = { color: `var(${VARS.ink}, ${FALLBACK.ink})` } as CSSProperties;

  return (
    <div ref={node => { hostRef.current = node; if (typeof ref === "function") ref(node); else if (ref) ref.current = node; }}
      role="img" aria-label={label ?? "Human figure"} className={className}
      style={{ position: "relative", width, height, ...style }} {...rest}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width, height }} aria-hidden="true" />
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", inset: 0, overflow: "hidden", ...cssVars }} aria-hidden="true">
        {grid.map((y, k) => <line key={k} x1={0} x2={width} y1={y} y2={y} stroke={`var(${VARS.grid}, ${FALLBACK.grid})`} strokeWidth={k === 0 ? 1.2 : 0.8} strokeDasharray={k === 0 ? undefined : "4 5"} opacity={0.75} />)}
        {wirePath && <path d={wirePath} fill="none" stroke={`var(${VARS.ink}, ${FALLBACK.ink})`} strokeWidth={0.35} opacity={0.35} />}
        {paths.terminators.map((d, i) => <path key={`t${i}`} d={d} fill="none" stroke={`var(${VARS.accent}, ${FALLBACK.accent})`} strokeWidth={base * 0.8} strokeDasharray="3 3" strokeLinecap="round" opacity={0.9} />)}
        {paths.contours.map((p, i) => <path key={`c${i}`} d={p.d} fill="none" stroke="currentColor" strokeWidth={p.w} strokeLinecap="round" strokeLinejoin="round" />)}
        {skeleton && Object.entries(frame.joints).map(([id, j]) => (
          <g key={id}>
            <line x1={j.head[0]} y1={j.head[1]} x2={j.tail[0]} y2={j.tail[1]} stroke={`var(${VARS.accent}, ${FALLBACK.accent})`} strokeWidth={Math.max(1, base * 0.9)} strokeLinecap="round" opacity={0.85} />
            <circle cx={j.head[0]} cy={j.head[1]} r={Math.max(1.4, base * 1.1)} fill={`var(${VARS.accent}, ${FALLBACK.accent})`} />
          </g>
        ))}
        {lmNames.map(n => frame.landmarks[n] && (
          <circle key={n} cx={frame.landmarks[n][0]} cy={frame.landmarks[n][1]} r={Math.max(2, base * 1.4)} fill="none" stroke={`var(${VARS.accent}, ${FALLBACK.accent})`} strokeWidth={1.2}>
            <title>{n}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
});
