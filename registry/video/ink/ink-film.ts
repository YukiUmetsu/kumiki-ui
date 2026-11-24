/**
 * INK-FILM1 film: a Chinese-ink film as data. Shots hold layers; a layer is a subject from a book (a figure, a mountain, a title) with a
 * place, a depth, a way in and a way out. Everything that moves is a pure function of the film's time.
 *
 * Lengths of time are seconds; places are stage units of the film's own size. A layer or a shot may carry `tall`: what differs when the
 * same film is made upright.
 */
import type { InkCel, InkPart, InkSubject } from "./ink-cel";
import { inkPosesOf } from "./ink-cel";
import { inkMove, inkPoseAt, inkSmooth } from "./ink-motion";
import type { InkMotion } from "./ink-motion";
import type { InkLeave, InkReveal, InkTransition } from "./ink-reveal";
import type { InkMount, InkStageFrame, InkStageLayer, InkStageSheet } from "./ink-stage";

type P = readonly [number, number];
export type InkSubjectMaker = (props: Readonly<Record<string, unknown>>) => InkSubject;
/** What a film may name. */
export type InkBook = Readonly<Record<string, InkSubjectMaker>>;

export interface InkPlacement { /** Where the subject's anchor lies. */ at: P; scale?: number; rotate?: number; flip?: boolean; /** Page units of the subject (default: the middle of its page). */ anchor?: P }
/** Many small copies that fall, fly or drift: petals, snow, rain, leaves, geese. */
export interface InkSwarm {
  count: number; seed?: number;
  /** x, y, width, height they live in; they come round again when they leave it. */
  area: readonly [number, number, number, number];
  /** Units a second, and how far it varies from one to the next (0–1). */
  velocity: P; vary?: number;
  /** Swing aside, units; its time; turns a second. */
  swing?: number; seconds?: number; spin?: number;
  /** Size of the copies. */
  size?: readonly [number, number];
}
export interface InkFilmLayer extends InkPlacement {
  id?: string;
  subject: string | InkSubject;
  props?: Readonly<Record<string, unknown>>;
  /** 0 = at the back of the world, 1 = where the camera looks (default), 2 = twice as near. */
  depth?: number;
  opacity?: number; density?: number; blur?: number;
  enter?: InkReveal; leave?: InkLeave;
  /** Motion of the whole layer, stage units, after it is placed. */
  motion?: readonly InkMotion[];
  /** How much its parts' own motion counts (default 1). */
  live?: number;
  /** Only these parts, or all but these. */
  parts?: readonly string[]; without?: readonly string[];
  swarm?: InkSwarm;
  tall?: Partial<Omit<InkFilmLayer, "subject" | "tall">>;
}
export interface InkCameraKey { at: number; x?: number; y?: number; zoom?: number; roll?: number }
export interface InkFilmText {
  text: string; lang?: string;
  /** Middle line of the text, stage units; its size; how wide it may be. */
  at: P; size?: number; width?: number; align?: "left" | "center" | "right";
  from?: number; to?: number;
  tall?: Partial<Omit<InkFilmText, "text" | "tall">>;
}
export interface InkShot {
  id: string;
  seconds: number;
  layers: readonly InkFilmLayer[];
  /** Camera keys, stage units from the home view: x, y in the picture plane, zoom 1. Eased through. */
  camera?: readonly InkCameraKey[];
  text?: readonly InkFilmText[];
  /** How this shot takes over from the one before it. The two overlap for that long. */
  enter?: InkTransition;
  mount?: InkMount;
  /** What the shot shows, for a screen reader. */
  label?: string;
  tall?: { camera?: readonly InkCameraKey[]; text?: readonly InkFilmText[]; mount?: InkMount };
}
export interface InkFilm {
  schemaVersion: 1;
  id: string; title: string;
  fps: number;
  paper: string;
  size: { width: number; height: number };
  /** Upright size, when the film has one. */
  tall?: { width: number; height: number };
  shots: readonly InkShot[];
}

export interface InkPlannedShot { shot: InkShot; index: number; /** Start and end on the film's clock. */ from: number; to: number; enter: InkTransition | null }
export interface InkFilmPlan { film: InkFilm; upright: boolean; width: number; height: number; seconds: number; frames: number; shots: InkPlannedShot[] }

/** Problems a film has, in words; none when it can be made. */
export function inspectInkFilm(film: InkFilm, book: InkBook = {}): string[] {
  const out: string[] = [], at = (s: InkShot, k: string) => `Shot "${s.id}": ${k}`;
  if (film.schemaVersion !== 1) out.push("schemaVersion must be 1.");
  if (!(film.fps >= 1 && film.fps <= 120)) out.push("fps must be 1–120.");
  if (!film.shots.length) out.push("A film needs at least one shot.");
  const ids = new Set<string>();
  for (const [i, s] of film.shots.entries()) {
    if (ids.has(s.id)) out.push(at(s, "its id is used twice.")); ids.add(s.id);
    if (!(s.seconds > 0)) out.push(at(s, "seconds must be above 0."));
    if (i && s.enter && s.enter.kind !== "cut" && s.enter.seconds > Math.min(s.seconds, film.shots[i - 1].seconds) * 0.6) out.push(at(s, `its ${s.enter.kind} takes ${s.enter.seconds} s, more than 60% of the shorter shot.`));
    for (const l of s.layers) {
      if (typeof l.subject === "string" && !book[l.subject]) out.push(at(s, `no subject "${l.subject}" in the book.`));
      if (l.enter && l.enter.at + l.enter.seconds > s.seconds) out.push(at(s, `layer "${l.id ?? (typeof l.subject === "string" ? l.subject : l.subject.id)}" is still coming in when the shot ends.`));
      if (l.leave && l.enter && l.leave.at < l.enter.at + l.enter.seconds) out.push(at(s, "a layer leaves before it has come in."));
      if (l.swarm && l.swarm.count > 400) out.push(at(s, "a swarm holds at most 400 copies."));
    }
    for (const t of s.text ?? []) { const size = t.size ?? 40; if (size < film.size.height * 0.026) out.push(at(s, `text "${t.text.slice(0, 18)}" is smaller than 2.6% of the picture's height.`)); if ((t.to ?? s.seconds) - (t.from ?? 0) < Math.min(1.2, 0.5 + t.text.length * 0.045)) out.push(at(s, `text "${t.text.slice(0, 18)}" is up for too short a time to read.`)); }
  }
  return out;
}
export function planInkFilm(film: InkFilm, o: { upright?: boolean } = {}): InkFilmPlan {
  const upright = Boolean(o.upright && film.tall), size = upright ? film.tall! : film.size, shots: InkPlannedShot[] = [];
  let t = 0;
  for (const [index, shot] of film.shots.entries()) {
    const enter = index && shot.enter && shot.enter.kind !== "cut" ? shot.enter : null, from = index ? t - (enter?.seconds ?? 0) : 0;
    shots.push({ shot, index, from, to: from + shot.seconds, enter }); t = from + shot.seconds;
  }
  return { film, upright, width: size.width, height: size.height, seconds: t, frames: Math.max(1, Math.round(t * film.fps)), shots };
}
/** The layer as it is for this shape of film. */
export const inkLayerFor = (plan: InkFilmPlan, l: InkFilmLayer): InkFilmLayer => (plan.upright && l.tall ? { ...l, ...l.tall } : l);
const made = new WeakMap<InkFilmLayer, InkSubject>();
export function inkSubjectOf(l: InkFilmLayer, book: InkBook): InkSubject {
  if (typeof l.subject !== "string") return l.subject;
  let s = made.get(l);
  if (!s) { const maker = book[l.subject]; if (!maker) throw new Error(`No ink subject "${l.subject}". The book has: ${Object.keys(book).join(", ")}.`); made.set(l, (s = maker(l.props ?? {}))); }
  return s;
}
const partsOf = (l: InkFilmLayer, s: InkSubject): InkPart[] => s.parts.filter(p => p.only !== "still" && (!l.parts || l.parts.includes(p.id)) && !l.without?.includes(p.id));
/** Camera at a time of the shot: eased between keys. */
export function inkCameraAt(keys: readonly InkCameraKey[] | undefined, t: number): { x: number; y: number; zoom: number; roll: number } {
  if (!keys?.length) return { x: 0, y: 0, zoom: 1, roll: 0 };
  let i = 0; while (i < keys.length - 2 && keys[i + 1].at <= t) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)], u = a === b ? 0 : Math.min(1, Math.max(0, (t - a.at) / (b.at - a.at || 1e-9)));
  // leaves slowly and arrives slowly, but moves from its first frames
  const e = u < 1 ? 0.35 * u + 0.65 * (u * u * (3 - 2 * u)) : 1, mix = (p: number, q: number) => p + (q - p) * e;
  return { x: mix(a.x ?? 0, b.x ?? 0), y: mix(a.y ?? 0, b.y ?? 0), zoom: Math.exp(mix(Math.log(a.zoom ?? 1), Math.log(b.zoom ?? 1))), roll: mix(a.roll ?? 0, b.roll ?? 0) };
}
/** A cel the film needs: which one, and how many pixels per page unit it is seen at, at most. */
export interface InkCelOrder { id: string; layer: InkFilmLayer; subject: InkSubject; part: InkPart; pose: string; scale: number; shot: number }
export const inkCelId = (l: InkFilmLayer, shot: InkShot, s: InkSubject, part: InkPart, pose: string) => `${shot.id}/${l.id ?? shot.layers.indexOf(l)}/${s.id}/${part.id}/${pose}`;
/** Every cel a film needs, shot by shot. `unit` is output pixels per stage unit. */
export function inkFilmOrders(plan: InkFilmPlan, book: InkBook, unit: number): InkCelOrder[] {
  const out: InkCelOrder[] = [];
  for (const { shot, index } of plan.shots) {
    const keys = (plan.upright ? shot.tall?.camera : undefined) ?? shot.camera, zoom = Math.max(1, ...(keys ?? []).map(k => k.zoom ?? 1));
    for (const raw of shot.layers) {
      const l = inkLayerFor(plan, raw), s = inkSubjectOf(raw, book), grown = 1 + (zoom - 1) * Math.min(1.6, l.depth ?? 1), size = (l.scale ?? 1) * (l.swarm ? (l.swarm.size?.[1] ?? 1) : 1);
      const scale = Math.min(3, Math.max(0.05, size * grown * unit));
      for (const part of partsOf(l, s)) for (const pose of inkPosesOf(part)) out.push({ id: inkCelId(raw, shot, s, part, pose), layer: raw, subject: s, part, pose, scale, shot: index });
    }
  }
  return out;
}
const hash = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7 + 74.7) * 43758.5453; return s - Math.floor(s); };

/** When each part of a layer comes in, and for how long. A picture that paints itself goes part by part, in the order a hand would, and gives each the time its size asks for. */
function entrances(l: InkFilmLayer, s: InkSubject, parts: readonly InkPart[], celOf: (p: InkPart) => InkCel | null | undefined): [number, number][] {
  const e = l.enter;
  if (!e) return parts.map(() => [0, 0]);
  if (e.kind !== "paint" || e.stagger !== undefined || parts.length < 2) return parts.map((_, i) => [e.at + (e.stagger ?? 0) * i, e.seconds]);
  const page = Math.sqrt(s.page.width * s.page.height), size = parts.map(p => { const c = celOf(p); return Math.max(0.12, c ? Math.sqrt(c.width * c.height) / page : 0); }), order = parts.map((p, i) => [p.turn ?? i, i] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(p => p[1]);
  const over = 0.35, k = e.seconds / (size.reduce((a, b) => a + b, 0) + over * size[order[order.length - 1]]), out: [number, number][] = [];
  let at = e.at; for (const i of order) { out[i] = [at, size[i] * k * (1 + over)]; at += size[i] * k; }
  return out;
}
/** Where the words of a shot stand, stage units: x, y, width, height. What falls or flies goes thin there. */
export function inkTextBoxes(plan: InkFilmPlan, shot: InkShot): [number, number, number, number][] {
  return ((plan.upright ? shot.tall?.text : undefined) ?? shot.text ?? []).map(raw => {
    const x = plan.upright && raw.tall ? { ...raw, ...raw.tall } : raw, size = x.size ?? 40, full = x.width ?? plan.width * 0.8, long = [...x.text].reduce((a, c) => a + (c.charCodeAt(0) > 0x2e80 ? 1.08 : 0.5), 0) * size, lines = Math.max(1, Math.ceil(long / full)), w = Math.min(full, lines > 1 ? full : long), h = lines * size * 1.36, left = x.align === "left" ? x.at[0] : x.align === "right" ? x.at[0] - w : x.at[0] - w / 2;
    return [left, x.at[1] - h / 2, w, h];
  });
}
function sheetAt(plan: InkFilmPlan, planned: InkPlannedShot, time: number, book: InkBook, cels: ReadonlyMap<string, InkCel | null>, live: number): InkStageSheet {
  const { shot } = planned, t = time - planned.from, keys = (plan.upright ? shot.tall?.camera : undefined) ?? shot.camera, cam = inkCameraAt(keys, live ? t : shot.seconds), cx = plan.width / 2, cy = plan.height / 2, layers: InkStageLayer[] = [];
  const roll = (cam.roll * Math.PI) / 180, rc = Math.cos(roll), rs = Math.sin(roll), kept = shot.layers.some(l => l.swarm) ? inkTextBoxes(plan, shot) : [];
  /** 0 among the words, 1 clear of them. */
  const clear = (x: number, y: number, room: number) => kept.reduce((a, [bx, by, bw, bh]) => Math.min(a, inkSmooth(room, room + 70, Math.hypot(Math.max(bx - x, 0, x - bx - bw), Math.max(by - y, 0, y - by - bh)))), 1);
  for (const raw of shot.layers) {
    const l = inkLayerFor(plan, raw), s = inkSubjectOf(raw, book), depth = l.depth ?? 1, zoom = 1 + (cam.zoom - 1) * depth, scale = l.scale ?? 1, a = ((l.rotate ?? 0) * Math.PI) / 180, c = Math.cos(a) * scale, n = Math.sin(a) * scale, flip = l.flip ? -1 : 1;
    const anchor = l.anchor ?? [s.page.width / 2, s.page.height / 2];
    const toStage = (x: number, y: number): [number, number] => { const u = (x - anchor[0]) * flip, v = y - anchor[1]; return [l.at[0] + u * c - v * n, l.at[1] + u * n + v * c]; };
    const view = (x: number, y: number, d = depth, z = zoom): [number, number] => { const u = (x - cx - cam.x * d) * z, v = (y - cy - cam.y * d) * z; return [cx + u * rc - v * rs, cy + u * rs + v * rc]; };
    const parts = partsOf(l, s), own = (l.live ?? 1) * live, e = l.enter;
    if (l.swarm) {
      const sw = l.swarm, [ax, ay, aw, ah] = sw.area, part = parts[0];
      if (!part) continue;
      const poses = inkPosesOf(part), r0 = e ? inkSmooth(e.at, e.at + e.seconds, live ? t : 1e9) : 1, gone = l.leave ? inkSmooth(l.leave.at, l.leave.at + l.leave.seconds, t) : 0;
      for (let i = 0; i < sw.count; i++) {
        const sd = (sw.seed ?? 1) * 17 + i, k = 1 + (sw.vary ?? 0.4) * (hash(sd, 1) * 2 - 1), size = (sw.size?.[0] ?? 1) + ((sw.size?.[1] ?? 1) - (sw.size?.[0] ?? 1)) * hash(sd, 2) ** 1.6, time0 = live ? t : 0;
        const wrap = (v: number, m: number) => ((v % m) + m) % m, ph = hash(sd, 5) * 6.283, sec = (sw.seconds ?? 4) * (0.7 + 0.6 * hash(sd, 6));
        const x = ax + wrap(hash(sd, 3) * aw + sw.velocity[0] * k * time0, aw) + (sw.swing ?? 0) * Math.sin((6.283 * time0) / sec + ph), y = ay + wrap(hash(sd, 4) * ah + sw.velocity[1] * k * time0, ah);
        const turn = ph + (sw.spin ?? 0) * 6.283 * time0 * (hash(sd, 7) < 0.5 ? -1 : 1) * k, tc = Math.cos(sw.spin ? turn : 0) * size, ts = Math.sin(sw.spin ? turn : 0) * size;
        const list = part.poses ? inkPoseAt(part.poses.kind === "cycle" ? { ...part.poses, phase: hash(sd, 8) } : part.poses, time0, live) : [[poses[0], 1] as const];
        // they come in and go out of being at the edges of their place
        const rim = Math.min(1, Math.min(y - ay, ay + ah - y) / (ah * 0.06 + 1)) * (kept.length ? clear(...view(x, y), Math.max(s.page.width, s.page.height) * 0.5 * size * scale) : 1);
        for (const [pose, w] of list) { const cel = cels.get(inkCelId(raw, shot, s, part, pose)); if (cel) layers.push({ cel, grid: [1, 1], opacity: Math.max(0, rim) * w * (l.opacity ?? 1) * r0 * (1 - gone), density: l.density, blur: l.blur, place: (px, py) => { const u = (px - anchor[0]) * flip * scale, v = (py - anchor[1]) * scale; return view(x + u * tc - v * ts, y + u * ts + v * tc); } }); }
      }
      continue;
    }
    const when = entrances(l, s, parts, part => cels.get(inkCelId(raw, shot, s, part, inkPosesOf(part)[0])));
    for (const [i, part] of parts.entries()) {
      const d = depth + (part.depth ?? 0), z = 1 + (cam.zoom - 1) * d, group = part.group ? s.groups?.[part.group] : undefined, bends = own > 0 && Boolean(part.motion?.some(m => m.kind === "sway" || m.kind === "ripple") || group?.some(m => m.kind === "sway" || m.kind === "ripple") || l.motion?.some(m => m.kind === "sway" || m.kind === "ripple"));
      const place = (x: number, y: number): readonly [number, number] => { let [px, py] = inkMove(part.motion, x, y, t, own); if (group) [px, py] = inkMove(group, px, py, t, own); [px, py] = toStage(px, py); if (l.motion) [px, py] = inkMove(l.motion, px, py, t, live); return view(px, py, d, z); };
      const [start, each] = when[i], shown = e && live ? Math.min(1, Math.max(0, (t - start) / Math.max(0.001, each))) : 1, gone = l.leave ? inkSmooth(l.leave.at, l.leave.at + l.leave.seconds, t) : 0;
      for (const [pose, w] of inkPoseAt(part.poses, t, own)) {
        const cel = cels.get(inkCelId(raw, shot, s, part, pose));
        if (!cel) continue;
        const from = e?.from ?? [cel.x + cel.width / 2, cel.y + cel.height / 2], cells = (len: number) => Math.min(28, Math.max(2, Math.ceil((len * scale) / 34)));
        layers.push({ cel, place, grid: bends ? [cells(cel.width), cells(cel.height)] : [1, 1], opacity: (l.opacity ?? 1) * w, density: l.density, blur: l.blur,
          reveal: e || l.leave ? { kind: e?.kind ?? "none", shown, gone, soft: e?.soft ?? (e?.kind === "paint" ? (part.soft ?? 0.06) : 0.22), from, angle: ((e?.angle ?? 0) * Math.PI) / 180, reach: Math.hypot(s.page.width, s.page.height), seed: (i * 7.3 + (s.seed ?? 1)) % 50 } : undefined });
      }
    }
  }
  return { layers, paper: [cam.x, cam.y] };
}
/** The whole picture at a time of the film. `live` 0 holds everything still, shown in full: for a viewer who asks for less motion. */
export function inkFrameAt(plan: InkFilmPlan, time: number, book: InkBook, cels: ReadonlyMap<string, InkCel | null>, live = 1): InkStageFrame {
  const t = Math.min(Math.max(0, time), plan.seconds), list = plan.shots;
  let i = list.length - 1; while (i > 0 && t < list[i].from) i--;
  const now = list[i], e = now.enter, inTransition = e && i > 0 && t < now.from + e.seconds, mountOf = (s: InkShot) => (plan.upright ? s.tall?.mount : undefined) ?? s.mount;
  if (!inTransition) return { sheet: sheetAt(plan, now, t, book, cels, live), mount: mountOf(now.shot) };
  return { sheet: sheetAt(plan, list[i - 1], t, book, cels, live), next: sheetAt(plan, now, t, book, cels, live), mount: mountOf(now.shot), transition: { kind: live ? e!.kind : "dissolve", t: (t - now.from) / e!.seconds, from: e!.from ?? [0.5, 0.5], angle: 0, seed: e!.seed ?? i * 3.7 } };
}
export interface InkTextAt { text: InkFilmText; opacity: number; key: string }
/** The words that are up at a time, with how far they have come in. */
export function inkTextAt(plan: InkFilmPlan, time: number): InkTextAt[] {
  const out: InkTextAt[] = [];
  for (const [i, s] of plan.shots.entries()) {
    const t = time - s.from; if (t < 0 || t > s.shot.seconds) continue;
    // words never stand on each other: one shot's are gone before the next picture comes, and its own wait until it has
    const first = s.enter ? s.enter.seconds * 0.6 : 0, last = plan.shots[i + 1] ? plan.shots[i + 1].from - s.from + 0.2 : s.shot.seconds;
    for (const [k, raw] of ((plan.upright ? s.shot.tall?.text : undefined) ?? s.shot.text ?? []).entries()) {
      const x = plan.upright && raw.tall ? { ...raw, ...raw.tall } : raw, from = Math.max(first, x.from ?? 0.3), to = Math.min(last, x.to ?? s.shot.seconds), o = inkSmooth(from, from + 0.4, t) * (1 - inkSmooth(to - 0.35, to, t));
      if (o > 0.004) out.push({ text: x, opacity: o, key: `${s.shot.id}/${k}` });
    }
  }
  return out;
}
/** The shot that fills most of the picture at a time. */
export function inkShotAt(plan: InkFilmPlan, time: number): InkPlannedShot { let i = plan.shots.length - 1; while (i > 0 && time < plan.shots[i].from + (plan.shots[i].enter?.seconds ?? 0) / 2) i--; return plan.shots[i]; }
