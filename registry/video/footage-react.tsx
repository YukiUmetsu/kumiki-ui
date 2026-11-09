/** Draws a footage scene at one frame: the clip, frame-exact, cover-fitted under a slow push, and words over it that land word by word
 * and hold still. See `film-document.ts` (`FilmFootageContent`). */
import type { CSSProperties, ReactNode } from "react";
import type { RationalFps } from "../motion/types";
import { FrameAccurateClip } from "./frame-accurate-clip";
import { createVideoElementAdapter } from "./frame-clip-adapters";
import type { ClipFrameAdapter } from "./frame-clip-adapters";
import type { FilmFootageContent } from "./film-document";

/** One adapter per page, shared by every footage scene, with each clip's source by its ID. */
const SOURCES = new Map<string, string>();
let adapter: ClipFrameAdapter | undefined;
const shared = () => adapter ??= createVideoElementAdapter({ url: source => SOURCES.get(source.id) ?? "", cacheSize: 8, timeoutMs: 20000 });

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const out3 = (t: number) => 1 - (1 - clamp01(t)) ** 3;
const FONT = "var(--km-font-display, var(--km-font-body, Inter, ui-sans-serif, system-ui, sans-serif))";

export function FootageScene({ content, frame, fps, durationFrames, width, height, safeInset, reducedMotion = false }: { content: FilmFootageContent; frame: number; fps: RationalFps;
  durationFrames: number; width: number; height: number; safeInset?: { left: number; right: number; top: number; bottom: number }; reducedMotion?: boolean }) {
  const v = content.video;
  SOURCES.set(v.id, v.src);
  const [p0, p1] = content.push ?? [1, 1.06], t = clamp01(frame / Math.max(1, durationFrames - 1)), scale = reducedMotion ? p0 : p0 + (p1 - p0) * (t * t * (3 - 2 * t) * .4 + t * .6);
  const focus = content.focus ?? { x: .5, y: .5 }, short = Math.min(width, height), title = content.title;
  const placement = { id: `footage-${v.id}`, source: { id: v.id, width: v.width, height: v.height, frameCount: v.frameCount, fps: { num: Math.round(v.fps * 1000), den: 1000 }, licenseRef: v.licenseRef },
    startFrame: 0, durationFrames, timing: { trimIn: content.from ?? 0, rate: content.rate ?? 1, end: "hold" as const } };
  let words: ReactNode;
  if (title) {
    const until = title.until ?? durationFrames, leave = clamp01((until - frame) / 8), place = title.place ?? "bottom", size = (title.size === "huge" ? .118 : .082) * short;
    const tokens = title.text.split(/\s+/), lit = new Set(title.emphasis ? title.emphasis.split(/\s+/) : []);
    const inset = (side: "left" | "right" | "top" | "bottom", least: number) => Math.max((safeInset?.[side] ?? 0) + .015, least);
    const box: CSSProperties = { position: "absolute", left: `${inset("left", .07) * 100}%`, right: `${inset("right", .07) * 100}%`, display: "flex", flexWrap: "wrap", columnGap: ".26em", rowGap: 0,
      justifyContent: place === "middle" ? "center" : "flex-start", textAlign: place === "middle" ? "center" : "left",
      ...place === "top" ? { top: `${inset("top", .09) * 100}%` } : place === "middle" ? { top: "50%", transform: "translateY(-50%)" } : { bottom: `${inset("bottom", .1) * 100}%` } };
    const shown = frame >= title.at && frame < until;
    words = <>
      {/* A soft shade where the words sit, so they read over sky, stone or water. */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, opacity: shown ? out3((frame - title.at) / 8) * leave : 0,
        background: place === "top" ? "linear-gradient(to bottom, rgba(6,9,14,.74), rgba(6,9,14,.3) 28%, rgba(6,9,14,0) 52%)" : place === "middle" ? "radial-gradient(ellipse 70% 45% at 50% 50%, rgba(6,9,14,.5), rgba(6,9,14,0))" : "linear-gradient(to top, rgba(6,9,14,.74), rgba(6,9,14,.3) 28%, rgba(6,9,14,0) 54%)" }} />
      {shown && <p style={{ ...box, margin: 0, font: `800 ${size}px/1.02 ${FONT}`, letterSpacing: "var(--km-title-tracking, -.025em)", color: "#fbf8f2", textShadow: `0 ${short * .004}px ${short * .03}px rgba(0,0,0,.45)`, opacity: leave }}>
        {tokens.map((token, i) => { const w = (frame - title.at - i * 2.5) / 8, e = reducedMotion ? 1 : out3(w);
          return <span key={i} {...(w < 1 && !reducedMotion) || leave < 1 ? { "data-km-text-entering": "" } : {}} style={{ display: "inline-block", opacity: clamp01(w * 2.2), color: lit.has(token.replace(/[^\p{L}\p{N}]/gu, "")) || lit.has(token) ? "#ffd27a" : undefined,
            transform: e < 1 ? `translateY(${(1 - e) * 30}%) scale(${1.14 - .14 * e})` : undefined, transformOrigin: "0 90%" }}>{token}</span>; })}
      </p>}
    </>;
  }
  return <div role="img" aria-label={content.label} data-km-footage={v.id} style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#07090c" }}>
    <div style={{ position: "absolute", inset: 0, transform: `scale(${scale})`, transformOrigin: `${focus.x * 100}% ${focus.y * 100}%` }}>
      <FrameAccurateClip placement={placement} frame={frame} fps={fps} adapter={shared()} width={width} height={height} framing={{ fit: "cover", focus }} description={content.label} style={{ position: "absolute", inset: 0 }} />
    </div>
    {words}
  </div>;
}
