/** Draws a footage scene at one frame: the clip, frame-exact, cover-fitted under a slow push, and words over it that land word by word
 * and hold still. With a subject (`film-subject.ts`), its cutout is drawn over the clip with the same framing: in front of the words, with
 * an outline, over a new background, or as clones from earlier frames. See `film-document.ts` (`FilmFootageContent`). */
import type { CSSProperties, ReactNode } from "react";
import type { RationalFps } from "../motion/types";
import { FrameAccurateClip } from "./frame-accurate-clip";
import { createVideoElementAdapter } from "./frame-clip-adapters";
import type { ClipFrameAdapter } from "./frame-clip-adapters";
import type { FilmFootageContent } from "./film-document";
import type { FilmFootageSubject } from "./film-subject";
import { trailCopies } from "./film-subject";
import { freezeGrade } from "./film-freeze-react";

/** The outline around a cutout: its solid part (alpha over about 0.3, so a model's faint haze over shadows gets no line) grown by `px` (a
 * dilation), less the cutout, in `color`, and a soft glow of the same line. */
function OutlineFilter({ id, px, color, glow }: { id: string; px: number; color: string; glow: number }) {
  return <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }}>
    <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
      <feComponentTransfer in="SourceAlpha" result="solid"><feFuncA type="linear" slope="2.5" intercept="-0.75" /></feComponentTransfer>
      <feMorphology in="solid" operator="dilate" radius={px.toFixed(2)} result="grown" />
      <feComposite in="grown" in2="SourceAlpha" operator="out" result="ring" />
      <feFlood floodColor={color} result="ink" />
      <feComposite in="ink" in2="ring" operator="in" result="line" />
      {glow > 0 && <feGaussianBlur in="line" stdDeviation={(px * (1 + 4 * glow)).toFixed(2)} result="glow" />}
      <feMerge>{glow > 0 && <feMergeNode in="glow" />}{glow > 0 && <feMergeNode in="glow" />}<feMergeNode in="line" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </svg>;
}

/** One adapter per page, shared by every footage scene, with each clip's source by its ID. */
const SOURCES = new Map<string, string>();
let adapter: ClipFrameAdapter | undefined;
const shared = () => adapter ??= createVideoElementAdapter({ url: source => SOURCES.get(source.id) ?? "", cacheSize: 8, timeoutMs: 20000 });

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const out3 = (t: number) => 1 - (1 - clamp01(t)) ** 3;
const FONT = "var(--km-font-display, var(--km-font-body, Inter, ui-sans-serif, system-ui, sans-serif))";

/** A colour wash for trail copies: the copy's own picture mixed 70 % toward `color`, keeping its alpha. */
function TintFilter({ id, color }: { id: string; color: string }) {
  return <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }}>
    <filter id={id} colorInterpolationFilters="sRGB">
      <feFlood floodColor={color} result="ink" />
      <feComposite in="ink" in2="SourceAlpha" operator="in" result="wash" />
      <feComposite in="wash" in2="SourceGraphic" operator="arithmetic" k2={.7} k3={.3} />
    </filter>
  </svg>;
}

/** The cutout's placement: the footage's own timing, in the cutout's frames (`offset` into the footage), `delay` frames behind. */
function cutoutPlacement(subject: FilmFootageSubject, content: FilmFootageContent, durationFrames: number, delay = 0) {
  const c = subject.cutout;
  return { id: `subject-${c.id}-${delay}`, source: { id: c.id, width: c.width, height: c.height, frameCount: c.frameCount, fps: { num: Math.round(c.fps * 1000), den: 1000 }, licenseRef: c.licenseRef },
    startFrame: 0, durationFrames, timing: { trimIn: (content.from ?? 0) - (c.offset ?? 0) - delay, rate: content.rate ?? 1, end: "hold" as const } };
}

export function FootageScene({ content, frame, fps, durationFrames, width, height, safeInset, reducedMotion = false, freeze }: { content: FilmFootageContent; frame: number; fps: RationalFps;
  durationFrames: number; width: number; height: number; safeInset?: { left: number; right: number; top: number; bottom: number }; reducedMotion?: boolean;
  /** A freeze-frame intro in its hold: the background is graded and the subject keeps its colour, with a thin light edge. */
  freeze?: { grade: "mono" | "dim" | "none"; amount: number } }) {
  const v = content.video, subject = content.subject;
  SOURCES.set(v.id, v.src);
  if (subject) SOURCES.set(subject.cutout.id, subject.cutout.src);
  const [p0, p1] = content.push ?? [1, 1.06], t = clamp01(frame / Math.max(1, durationFrames - 1)), scale = reducedMotion ? p0 : p0 + (p1 - p0) * (t * t * (3 - 2 * t) * .4 + t * .6);
  const focus = content.focus ?? { x: .5, y: .5 }, short = Math.min(width, height), title = content.title;
  const placement = { id: `footage-${v.id}`, source: { id: v.id, width: v.width, height: v.height, frameCount: v.frameCount, fps: { num: Math.round(v.fps * 1000), den: 1000 }, licenseRef: v.licenseRef },
    startFrame: 0, durationFrames, timing: { trimIn: content.from ?? 0, rate: content.rate ?? 1, end: "hold" as const } };
  let words: ReactNode;
  if (title) {
    const until = title.until ?? durationFrames, leave = clamp01((until - frame) / 8), place = title.place ?? "bottom";
    // A giant title fills most of the frame's width (a word or two, for a subject to stand in front of), capped at 0.42 of the short side.
    const letters = [...title.text].reduce((sum, ch) => sum + (/\s/.test(ch) ? .35 : /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(ch) ? 1.6 : .64), 0);
    const size = title.size === "giant" ? Math.min(.42 * short, .86 * width / Math.max(1, letters)) : (title.size === "huge" ? .118 : .082) * short;
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
  // A whole-frame echo: earlier frames of the footage over the current one, oldest first; each at half the strength of a trail copy, so
  // the live picture stays the clearest.
  const echoes = content.echo ? trailCopies({ copies: content.echo.copies ?? 4, spacing: content.echo.spacing ?? 2, fade: content.echo.fade ?? .6 }) : [];
  const layer: CSSProperties = { position: "absolute", inset: 0 }, framing = { fit: "cover" as const, focus }, push: CSSProperties = { ...layer, transform: `scale(${scale})`, transformOrigin: `${focus.x * 100}% ${focus.y * 100}%` };
  const clip = (key: string, place: typeof placement, description: string, style?: CSSProperties) =>
    <FrameAccurateClip key={key} data-km-footage-layer={key} placement={place} frame={frame} fps={fps} adapter={shared()} width={width} height={height} framing={framing} description={description} style={{ ...layer, ...style }} />;
  const echoLayers = echoes.map(copy => clip(`echo-${copy.delay}`, { ...placement, id: `${placement.id}-echo-${copy.delay}`, timing: { ...placement.timing, trimIn: placement.timing.trimIn - copy.delay } }, "", { opacity: copy.opacity * .5 }));
  if (!subject) return <div role="img" aria-label={content.label} data-km-footage={v.id} style={{ ...layer, overflow: "hidden", background: "#07090c" }}>
    <div style={push}>{clip("footage", placement, content.label)}{echoLayers}</div>
    {words}
  </div>;
  // In a freeze the subject takes a thin light edge, unless it has its own outline.
  const background = subject.background, outline = subject.outline ?? (freeze && freeze.amount > 0 ? { color: "#ffffff", width: .0035, glow: .3 } : undefined), outlineId = `km-subject-outline-${subject.cutout.id}`;
  const graded = freeze ? freezeGrade(freeze.grade, freeze.amount) : undefined;
  return <div role="img" aria-label={content.label} data-km-footage={v.id} data-km-subject={subject.cutout.id} style={{ ...layer, overflow: "hidden", background: background && "color" in background ? background.color : "#07090c" }}>
    {/* The footage, unless a colour replaces it; blurred when the background is the footage itself, a little larger so the blur's edge stays out. */}
    {!(background && "color" in background) && <div style={{ ...push, filter: graded }}>{clip("footage", placement, content.label, background && "blur" in background ? { filter: `blur(${background.blur * short}px)`, transform: "scale(1.06)" } : undefined)}{echoLayers}</div>}
    {subject.behind && words}
    <div aria-hidden="true" style={push} data-km-illustration-region="art">
      {subject.trail?.tint && <TintFilter id={`${outlineId}-tint`} color={subject.trail.tint} />}
      {subject.trail && trailCopies(subject.trail).map(copy => clip(`trail-${copy.delay}`, cutoutPlacement(subject, content, durationFrames, copy.delay), "",
        { opacity: copy.opacity, filter: subject.trail!.tint ? `url(#${outlineId}-tint)` : undefined }))}
      {(subject.clones ?? []).map(clone => clip(`clone-${clone.delay}`, cutoutPlacement(subject, content, durationFrames, clone.delay), "", { opacity: clone.opacity ?? .85 }))}
      {outline && <OutlineFilter id={outlineId} px={(outline.width ?? .006) * short} color={outline.color ?? "#ffffff"} glow={outline.glow ?? 0} />}
      {clip("subject", cutoutPlacement(subject, content, durationFrames), "", outline ? { filter: `url(#${outlineId})` } : undefined)}
    </div>
    {!subject.behind && words}
  </div>;
}
