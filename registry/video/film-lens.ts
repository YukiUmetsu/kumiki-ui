/** Glass lens: a clear glass shape that moves over a scene and bends what is behind it, magnifying the middle and bending the edge harder,
 * with a bright rim (doc 34, A8). And a lens gateway: a lens crosses into the frame and grows, with the next scene behind the glass (T8).
 *
 * Practice: Apple's Liquid Glass makes lensing its main idea: light bends at the edges, larger elements lens more, and objects appear by
 * changing how they bend light rather than by fading (WWDC25, session 219). A web page cannot displace pixels with CSS alone.
 *
 * Kumiki draws the lens from copies of the scene itself: one copy inside the lens, magnified about its centre, and one in a ring at its
 * edge, magnified more. Both are clipped to the lens shape, so every frame is exact and needs nothing loaded. Copies cost a second render
 * of the scene, so a lens is for drawn scenes, not WebGL ones.
 */

export type LensShape = "circle" | "pill";
export interface FilmLensSpec {
  /** @default "circle" */
  shape?: LensShape;
  /** The lens's height as a fraction of the frame's short side. A pill is 1.9 times as wide. @default 0.3 */
  size?: number;
  /** Where the lens is: its centre at scene frames, as fractions of the frame. It glides between them and rests at the ends. */
  path: ReadonlyArray<{ at: number; x: number; y: number }>;
  /** How much the middle is magnified. The edge bends 1.5 times as much. @default 1.18 */
  magnify?: number;
  /** Frames the lens takes to come in from flat glass at its first point, and to go back out at its last. @default 10 */
  appear?: number;
}
export interface FilmLens { shape: LensShape; size: number; path: FilmLensSpec["path"]; magnify: number; appear: number }
export interface LensProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }

const minimumJerk = (t: number) => { const u = Math.min(1, Math.max(0, t)); return u * u * u * (10 - 15 * u + 6 * u * u); };

/** The lens at a scene frame: its centre and size in pixels, and its strength (0 flat glass, 1 full lensing). */
export function lensAt(lens: FilmLens, frame: number, width: number, height: number): { x: number; y: number; w: number; h: number; strength: number } {
  const keys = lens.path, h = lens.size * Math.min(width, height), w = lens.shape === "pill" ? h * 1.9 : h;
  let x = keys[0].x, y = keys[0].y;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (frame >= b.at) { x = b.x; y = b.y; continue; }
    if (frame > a.at) { const t = minimumJerk((frame - a.at) / Math.max(1, b.at - a.at)); x = a.x + (b.x - a.x) * t; y = a.y + (b.y - a.y) * t; }
    break;
  }
  // The lens materializes by bending light more and more, not by fading in.
  const first = keys[0].at, strength = frame < first ? 0 : minimumJerk((frame - first + 1) / Math.max(1, lens.appear));
  return { x: x * width, y: y * height, w, h, strength };
}
/** An SVG path of a rounded rectangle (a circle when square with the full radius), for clip paths. */
export function roundedPath(cx: number, cy: number, w: number, h: number, r = Math.min(w, h) / 2): string {
  const x = cx - w / 2, y = cy - h / 2, k = Math.min(r, w / 2, h / 2);
  const f = (v: number) => v.toFixed(2);
  return `M ${f(x + k)} ${f(y)} H ${f(x + w - k)} A ${f(k)} ${f(k)} 0 0 1 ${f(x + w)} ${f(y + k)} V ${f(y + h - k)} A ${f(k)} ${f(k)} 0 0 1 ${f(x + w - k)} ${f(y + h)} H ${f(x + k)} A ${f(k)} ${f(k)} 0 0 1 ${f(x)} ${f(y + h - k)} V ${f(y + k)} A ${f(k)} ${f(k)} 0 0 1 ${f(x + k)} ${f(y)} Z`;
}
/** The two copies a lens draws: the middle, magnified about the centre and clipped to the inner shape, and the edge ring, magnified more and
 * clipped to the band between the inner shape and the outline. `ring` is the band's share of the lens's height. */
export function lensCopies(at: ReturnType<typeof lensAt>, magnify: number, ring = .16) {
  const round = (v: number) => Math.round(v * 1e4) / 1e4;
  const m = round(1 + (magnify - 1) * at.strength), edge = round(1 + (magnify - 1) * 1.5 * at.strength), inset = at.h * ring;
  const outer = roundedPath(at.x, at.y, at.w, at.h), inner = roundedPath(at.x, at.y, at.w - inset * 2, at.h - inset * 2);
  return {
    middle: { clip: `path("${inner}")`, transform: `translate(${at.x}px, ${at.y}px) scale(${m}) translate(${-at.x}px, ${-at.y}px)` },
    edge: { clip: `path(evenodd, "${outer} ${inner}")`, transform: `translate(${at.x}px, ${at.y}px) scale(${edge}) translate(${-at.x}px, ${-at.y}px)` },
    outline: outer,
  };
}

/** Checks a scene's lens. `drawn` says the scene is drawn in HTML or SVG rather than WebGL. */
export function inspectLens(spec: FilmLensSpec, durationFrames: number, path: string, drawn: boolean): { lens?: FilmLens; problems: LensProblem[] } {
  const problems: LensProblem[] = [], say = (severity: LensProblem["severity"], code: string, at: string, message: string, hint?: string) => problems.push({ severity, code, path: path + at, message, hint });
  const size = spec.size ?? .3, magnify = spec.magnify ?? 1.18, appear = spec.appear ?? 10;
  if (!drawn) say("error", "lens-scene", "", "A lens copies its scene, so it cannot sit over a WebGL scene (a ray world or a 3D shot).", "Put the lens over a card, a picture, a drawing, an object story or a screen demo.");
  if (!["circle", "pill"].includes(spec.shape ?? "circle")) say("error", "lens-shape", "/shape", `"${spec.shape}" is not a lens shape.`, "Shapes: circle, pill.");
  if (!(size >= .08 && size <= .8)) say("error", "lens-size", "/size", "A lens is 0.08 to 0.8 of the frame's short side.");
  if (!(magnify >= 1 && magnify <= 1.6)) say("error", "lens-magnify", "/magnify", "A lens magnifies 1 to 1.6 times.", "More and the middle turns to mush.");
  if (!spec.path?.length) say("error", "lens-path", "/path", "A lens needs at least one point.");
  (spec.path ?? []).forEach((key, i) => {
    if (!(key.at >= 0 && key.at < durationFrames && key.x >= -.5 && key.x <= 1.5 && key.y >= -.5 && key.y <= 1.5)) say("error", "lens-path", `/path/${i}`, "A lens point is a frame inside the scene and a place near the frame.");
    else if (i > 0 && key.at <= spec.path[i - 1].at) say("error", "lens-path", `/path/${i}/at`, "Lens points run in order.");
  });
  if (problems.length) return { problems };
  return { lens: { shape: spec.shape ?? "circle", size, path: spec.path, magnify, appear }, problems };
}

/** A lens gateway at `progress` (0 to 1): a round lens enters from one side and grows until it covers the frame, the next scene behind its
 * glass, magnified a little at first and settling to its own size. */
export function lensGateFrame(progress: number, width: number, height: number, direction: "left" | "right") {
  const p = Math.min(1, Math.max(0, progress)), e = p * p * (3 - 2 * p), short = Math.min(width, height);
  const cx = direction === "left" ? -short * .3 + (width / 2 + short * .3) * Math.min(1, e * 1.35) : width + short * .3 - (width / 2 + short * .3) * Math.min(1, e * 1.35);
  const cy = height / 2, cover = Math.hypot(Math.max(cx, width - cx), height / 2) + 2;
  const r = short * .16 + (cover - short * .16) * p ** 1.8, scale = Math.round((1.16 - .16 * e) * 1e4) / 1e4;
  return { cx, cy, r, scale, rim: 1 - Math.min(1, Math.max(0, (p - .65) / .35)) };
}
