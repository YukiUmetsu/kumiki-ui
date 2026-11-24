/**
 * INK-FILM1 scenes: whole places, as the layers of a shot. Each is composed for a wide picture of 1920 × 1080 and an upright one of
 * 1080 × 1920, leaves paper to breathe 留白, and takes a seed: another seed is another place of the same kind. The layers name subjects of `INK_BOOK`.
 *
 *   inkPeaksScene   peaks over a sea of cloud      inkRiverScene   a moonlit river and a boat
 *   inkTownScene    a water town and its bridge    inkHeightScene  a figure on a height, facing the far mountains
 *   inkRainScene    a lady under an umbrella in the rain
 *   inkLotusScene   a lotus pond and its koi       inkAutumnScene  maple over a lake, geese going south
 *   inkSnowScene    peaks and a pine in the snow   inkFlock        birds in a line, to lay over any of them
 */
import type { InkFilmLayer } from "./ink-film";
import { inkSkyline } from "./ink-land";
import type { InkMassifOptions } from "./ink-land";
import type { InkPigment } from "./ink-pigments";
import type { InkReveal } from "./ink-reveal";
import type { InkSubjectName } from "./ink-subjects";

const put = (subject: InkSubjectName, props: object): { subject: InkSubjectName; props: Readonly<Record<string, unknown>> } => ({ subject, props: props as Readonly<Record<string, unknown>> });
export interface InkSceneOptions {
  seed?: number;
  /** The scene comes onto the paper from this second on, back to front. Left out, it is there. */
  enter?: number;
  /** A pigment through the distance. */
  tint?: InkPigment;
}
const coming = (o: InkSceneOptions, i: number, kind: InkReveal["kind"] = "develop", seconds = 1.8): InkReveal | undefined => (o.enter === undefined ? undefined : { kind, at: o.enter + i * 0.32, seconds });

/** Peaks over a sea of cloud. */
export function inkPeaksScene(o: InkSceneOptions = {}): InkFilmLayer[] {
  const s = o.seed ?? 3;
  return [
    { id: "far", ...put("range", { seed: s + 4, layers: 2, tone: [0.12, 0.2], sharp: 0.7, pigment: o.tint ?? "indigo" }), at: [1060, 560], scale: 1.2, depth: 0.2, enter: coming(o, 0), tall: { at: [540, 900], scale: 1.1 } },
    { id: "peaks", ...put("massif", { seed: s + 4, kind: "pillar", trees: 1, tint: o.tint ?? "indigo", tintAmount: 0.16 }), at: [1100, 640], scale: 1.16, depth: 0.55, enter: coming(o, 1, "paint", 3.2), tall: { at: [560, 1000], scale: 0.92 } },
    ...inkFlock({ subject: "crane", seed: s, count: 3, at: [640, 270], tall: [560, 470], scale: 0.19, gap: 150, open: 24, velocity: [34, -5], depth: 0.6, enter: coming(o, 4) }),
    { id: "cloud", ...put("mist", { seed: s + 2 }), at: [960, 830], scale: 1.2, depth: 0.7, enter: coming(o, 2, "mist"), tall: { at: [540, 1330], scale: 1.05 } },
    { id: "near", ...put("massif", { seed: s + 28, kind: "crag", width: 1300, height: 800, trees: 0.8, moss: 1, summits: [{ x: 0.2, z: 0.35, height: 0.62, width: 0.62 }, { x: 0.0, z: 0.5, height: 0.6, width: 0.5 }, { x: 0.5, z: 0.18, height: 0.28, width: 0.46 }], mist: 0.14 }), at: [520, 860], scale: 1.0, depth: 1.1, enter: coming(o, 3, "paint", 2.6), tall: { at: [560, 1560], scale: 0.9 } },
    { id: "cloud-near", ...put("mist", { seed: s + 7, height: 360 }), at: [960, 1050], scale: 1.25, depth: 1.3, enter: coming(o, 3, "mist"), tall: { at: [540, 1830], scale: 1.2 } },
  ];
}
/** A river under the moon, far hills, and a boat. */
export function inkRiverScene(o: InkSceneOptions & { lantern?: boolean } = {}): InkFilmLayer[] {
  const s = o.seed ?? 2;
  return [
    { id: "moon", ...put("moon", { seed: s, radius: 104, reach: 4.2, tone: 0.5, pigment: o.tint ?? "indigo" }), at: [1370, 270], depth: 0.1, enter: coming(o, 0, "bloom"), tall: { at: [730, 620], scale: 0.9 } },
    { id: "hills", ...put("range", { seed: s + 5, layers: 3, tone: [0.1, 0.3], sharp: 0.2, pigment: o.tint ?? "indigo", height: 520 }), at: [960, 560], scale: 1.1, depth: 0.25, enter: coming(o, 1), tall: { at: [540, 960], scale: 1 } },
    { id: "water", ...put("water", { seed: s, light: 0.68, height: 480, pigment: "ink", amount: 0.8 }), at: [960, 950], scale: 1.1, depth: 0.7, enter: coming(o, 2), tall: { at: [540, 1460], scale: 1.1 } },
    { id: "boat", ...put("boat", { seed: s, lantern: o.lantern ?? true }), at: [760, 830], scale: 0.62, depth: 0.95, motion: [{ kind: "drift", by: [90, 4], back: 60, phase: -1.2 }], enter: coming(o, 3, "develop", 1.4), tall: { at: [480, 1340], scale: 0.6 } },
  ];
}
/** White walls and black tiles along a canal, a humped bridge before them. */
export function inkTownScene(o: InkSceneOptions = {}): InkFilmLayer[] {
  const s = o.seed ?? 3;
  return [
    { id: "far", ...put("range", { seed: s + 9, layers: 2, tone: [0.07, 0.16], sharp: 0.3, pigment: o.tint ?? "indigo" }), at: [960, 400], scale: 1.1, depth: 0.2, enter: coming(o, 0), tall: { at: [540, 760], scale: 1 } },
    { id: "pagoda", ...put("pagoda", { ink: 0.5 }), at: [1500, 360], scale: 0.4, depth: 0.35, density: 0.6, enter: coming(o, 1), tall: { at: [840, 720], scale: 0.42 } },
    { id: "houses", ...put("houses", { seed: s, count: 7, width: 1800 }), at: [960, 640], scale: 1.0, depth: 0.6, enter: coming(o, 2, "paint", 3), tall: { at: [540, 1040], scale: 0.86 } },
    { id: "bridge", ...put("bridge", { seed: s }), at: [600, 830], scale: 0.82, depth: 1, enter: coming(o, 4, "paint", 2.2), tall: { at: [560, 1370], scale: 0.86 } },
    { id: "boat", ...put("boat", { seed: s, lantern: true }), at: [1370, 900], scale: 0.5, depth: 1.1, motion: [{ kind: "drift", by: [-120, 0], back: 70 }], enter: coming(o, 5, "develop", 1.2), tall: { at: [700, 1640], scale: 0.56 } },
  ];
}
/** A figure on a height, facing the far mountains. */
export function inkHeightScene(o: InkSceneOptions = {}): InkFilmLayer[] {
  const s = o.seed ?? 5, rock: InkMassifOptions = { seed: s + 35, kind: "crag", width: 1000, height: 680, trees: 0, moss: 0.8, rough: 0.85, summits: [{ x: 0.335, z: 0.3, height: 0.5, width: 0.66 }, { x: 0.375, z: 0.3, height: 0.5, width: 0.66 }, { x: 0.415, z: 0.3, height: 0.49, width: 0.66 }, { x: 0.08, z: 0.5, height: 0.42, width: 0.5 }, { x: 0.68, z: 0.14, height: 0.26, width: 0.42 }], mist: 0.04, mistEdge: 0.16 }, stand = 388, sky = inkSkyline(rock);
  // both boots on the rock: the lower of the two places decides how high he stands
  const on = (at: readonly [number, number], scale: number, figure: number): [number, number] => { const k = figure / scale, top = Math.max(sky(stand - 45 * k) - 48 * k, sky(stand + 100 * k) - 3 * k) + 2; return [at[0] + (stand - 500) * scale, at[1] + (top - 340) * scale]; }, wide: [number, number] = [640, 800], tall: [number, number] = [470, 1520];
  return [
    { id: "sun", ...put("moon", { seed: s, kind: "sun", radius: 104, tone: 0.9 }), at: [1330, 310], depth: 0.08, enter: coming(o, 0, "bloom"), tall: { at: [740, 480] } },
    { id: "far", ...put("range", { seed: s, layers: 3, tone: [0.12, 0.3], sharp: 0.7, pigment: o.tint ?? "ink" }), at: [1000, 640], scale: 1.2, depth: 0.25, enter: coming(o, 0), tall: { at: [540, 980], scale: 1.1 } },
    { id: "cloud", ...put("mist", { seed: s + 3 }), at: [1060, 880], scale: 1.2, depth: 0.5, enter: coming(o, 1, "mist"), tall: { at: [540, 1240], scale: 1.1 } },
    { id: "height", ...put("massif", rock), at: wide, scale: 1.5, depth: 1, enter: coming(o, 2, "paint", 2.4), tall: { at: tall, scale: 1.4 } },
    { id: "figure", ...put("swordsman", { seed: s, ground: false }), anchor: [500, 1092], at: on(wide, 1.5, 0.34), scale: 0.34, depth: 1, enter: coming(o, 4, "paint", 2), tall: { at: on(tall, 1.4, 0.4), scale: 0.4 } },
  ];
}
/** A lady under an umbrella, walking in the rain. */
export function inkRainScene(o: InkSceneOptions = {}): InkFilmLayer[] {
  const s = o.seed ?? 4;
  return [
    { id: "far", ...put("range", { seed: s + 1, layers: 2, tone: [0.08, 0.18], sharp: 0.3, pigment: o.tint ?? "teal" }), at: [960, 480], scale: 1.1, depth: 0.2, enter: coming(o, 0), tall: { at: [540, 800] } },
    { id: "pavilion", ...put("pavilion", { ink: 0.6 }), at: [1460, 560], scale: 0.55, depth: 0.5, density: 0.7, enter: coming(o, 1), tall: { at: [800, 900], scale: 0.5 } },
    { id: "cloud", ...put("mist", { seed: s + 5 }), at: [960, 760], scale: 1.2, depth: 0.6, enter: coming(o, 1, "mist"), tall: { at: [540, 1180], scale: 1.1 } },
    { id: "lady", ...put("umbrella-lady", { seed: s }), at: [760, 590], scale: 0.72, depth: 1, enter: coming(o, 2, "paint", 2.6), tall: { at: [520, 1250], scale: 0.82 } },
    { id: "rain-far", ...put("raindrop", { seed: s, slant: 9, length: 0.8, tone: 0.3 }), at: [0, 0], depth: 0.6, swarm: { count: 110, seed: s, area: [-60, -90, 2040, 1260], velocity: [-118, 760], vary: 0.12, size: [0.5, 0.8] }, enter: coming(o, 3), tall: { swarm: { count: 110, seed: s, area: [-60, -90, 1200, 2100], velocity: [-118, 760], vary: 0.12, size: [0.5, 0.8] } } },
    { id: "rain", ...put("raindrop", { seed: s + 1, slant: 9, length: 1.1, tone: 0.5 }), at: [0, 0], depth: 1.2, swarm: { count: 60, seed: s + 1, area: [-60, -120, 2040, 1320], velocity: [-186, 1200], vary: 0.1, size: [1, 1.5] }, enter: coming(o, 3), tall: { swarm: { count: 60, seed: s + 1, area: [-60, -120, 1200, 2160], velocity: [-186, 1200], vary: 0.1, size: [1, 1.5] } } },
  ];
}
export interface InkFlockOptions {
  seed?: number; count?: number;
  /** Where the first bird is, and its height on the page. */
  at: readonly [number, number]; tall?: readonly [number, number];
  subject?: "goose" | "crane" | "swallow"; scale?: number; depth?: number;
  /** Units a second: where they are going. */
  velocity?: readonly [number, number];
  /** How far one is behind the next, and how wide the two arms open, degrees. One arm only with 0 on the short side. */
  gap?: number; open?: number; short?: number;
  density?: number; enter?: InkReveal;
  props?: Readonly<Record<string, unknown>>;
}
/** Birds in a skein 雁陣: two arms that open back from the first, each bird a little off its place and its beat. */
export function inkFlock(o: InkFlockOptions): InkFilmLayer[] {
  const n = o.count ?? 7, v = o.velocity ?? [-34, -5], subject = o.subject ?? "goose", seed = o.seed ?? 1, gap = o.gap ?? 92, dir = Math.atan2(-v[1], -v[0]), open = ((o.open ?? 26) * Math.PI) / 180, short = o.short ?? Math.floor((n - 1) / 3), rnd = (i: number, k: number) => { const q = Math.sin((seed * 13 + i * 7.3 + k * 3.1) * 12.9898) * 43758.5453; return q - Math.floor(q); };
  return Array.from({ length: n }, (_, i) => {
    const arm = i === 0 ? 0 : i <= short * 2 ? (i % 2 ? 1 : -1) : 1, rank = i === 0 ? 0 : i <= short * 2 ? Math.ceil(i / 2) : i - short, a = dir + arm * open, d = gap * rank * (0.92 + 0.16 * rnd(i, 1)), off: [number, number] = [Math.cos(a) * d + (rnd(i, 2) - 0.5) * gap * 0.16, Math.sin(a) * d + (rnd(i, 3) - 0.5) * gap * 0.2];
    const put = (at: readonly [number, number]): [number, number] => [at[0] + off[0], at[1] + off[1]];
    return { id: `bird-${i}`, subject, props: { seed: seed + (i % 3), facing: v[0] < 0 ? "left" : "right", ...(subject === "goose" ? { phase: Math.round(rnd(i, 4) * 10) / 10, seconds: 0.95 + 0.1 * (i % 3) } : {}), ...o.props }, at: put(o.at), scale: (o.scale ?? 0.3) * (0.94 + 0.12 * rnd(i, 5)), depth: o.depth ?? 0.4, density: o.density, enter: o.enter, motion: [{ kind: "drift", by: v }, { kind: "drift", by: [0, 7], back: 2.6 + 0.5 * (i % 3), phase: rnd(i, 6) * 6 }], ...(o.tall ? { tall: { at: put(o.tall) } } : {}) };
  });
}
/** A lotus pond: one clump near, one far, and two koi that cross below. */
export function inkLotusScene(o: InkSceneOptions = {}): InkFilmLayer[] {
  const s = o.seed ?? 3;
  return [
    { id: "far", ...put("lotus", { seed: s + 4, leaves: 3, flowers: 0, bud: true, pod: true }), at: [560, 380], scale: 0.4, depth: 0.5, density: 0.4, blur: 1.2, enter: coming(o, 0), tall: { at: [300, 560], scale: 0.42 } },
    { id: "pond", ...put("water", { seed: s + 2, height: 480, amount: 0.5 }), at: [960, 760], scale: 1.15, depth: 0.8, enter: coming(o, 1), tall: { at: [540, 1300], scale: 1.1 } },
    { id: "koi-b", ...put("koi", { seed: s + 5, pattern: "ink", heading: -14 }), at: [300, 720], scale: 0.4, depth: 0.95, density: 0.8, motion: [{ kind: "drift", by: [22, -5] }], enter: coming(o, 3), tall: { at: [180, 1330], scale: 0.44 } },
    { id: "koi-a", ...put("koi", { seed: s, pattern: "both", heading: -24 }), at: [420, 880], scale: 0.52, depth: 1, motion: [{ kind: "drift", by: [26, -11] }], enter: coming(o, 4), tall: { at: [300, 1560], scale: 0.6 } },
    { id: "lotus", ...put("lotus", { seed: s, leaves: 4, flowers: 2 }), at: [1330, 520], scale: 0.72, depth: 1.15, enter: coming(o, 2, "paint", 3.4), tall: { at: [660, 1010], scale: 0.72 } },
  ];
}
/** Maple over a lake in autumn, geese going south. */
export function inkAutumnScene(o: InkSceneOptions = {}): InkFilmLayer[] {
  const s = o.seed ?? 2;
  return [
    { id: "sun", ...put("moon", { seed: s, kind: "sun", radius: 92, tone: 0.7, pigment: "ochre" }), at: [330, 300], depth: 0.08, enter: coming(o, 0, "bloom"), tall: { at: [330, 560] } },
    { id: "far", ...put("range", { seed: s + 6, layers: 3, tone: [0.1, 0.3], sharp: 0.35, pigment: o.tint ?? "indigo", edge: 0.02 }), at: [960, 590], scale: 1.2, depth: 0.2, enter: coming(o, 0), tall: { at: [540, 960], scale: 1.1 } },
    ...inkFlock({ seed: s, at: [600, 210], tall: [470, 400], count: 7, scale: 0.34, gap: 92, velocity: [-30, 5], enter: coming(o, 2) }),
    { id: "lake", ...put("water", { seed: s + 1, height: 460, amount: 0.75, pigment: "indigo" }), at: [960, 985], scale: 1.15, depth: 0.7, enter: coming(o, 1), tall: { at: [540, 1470], scale: 1.1 } },
    { id: "boat", ...put("boat", { seed: s, boatman: false, awning: true }), at: [560, 880], scale: 0.42, depth: 0.9, motion: [{ kind: "drift", by: [10, 0.4] }], enter: coming(o, 3, "develop", 1.2), tall: { at: [360, 1400], scale: 0.5 } },
    { id: "maple", ...put("maple", { seed: s, from: "right", leaves: 70 }), at: [1390, 380], scale: 0.86, depth: 1.25, enter: coming(o, 3, "paint", 2.8), tall: { at: [640, 420], scale: 0.86 } },
    { id: "falling", ...put("leaf", { kind: "maple", pigment: "cinnabar", seed: s }), at: [0, 0], depth: 1.3, swarm: { count: 9, seed: s, area: [500, -60, 1480, 1240], velocity: [-46, 88], vary: 0.4, swing: 54, seconds: 3.6, spin: 0.12, size: [0.9, 1.5] }, enter: coming(o, 5), tall: { swarm: { count: 9, seed: s, area: [-40, -60, 1160, 2080], velocity: [-46, 96], vary: 0.4, swing: 54, seconds: 3.6, spin: 0.12, size: [0.9, 1.5] } } },
  ];
}
/** Peaks left as paper under a grey sky, a pine, and snow coming down. */
export function inkSnowScene(o: InkSceneOptions = {}): InkFilmLayer[] {
  const s = o.seed ?? 6, flakes = (id: string, count: number, depth: number, size: readonly [number, number], fall: number): InkFilmLayer => { const swarm = { count, seed: s + count, velocity: [-fall * 0.28, fall] as const, vary: 0.3, swing: 26, seconds: 4.2, size }; return { id, ...put("snowflake", { seed: s, body: "#FFFFFF" }), at: [0, 0], depth, swarm: { ...swarm, area: [-60, -60, 2040, 1200] }, enter: coming(o, 4), tall: { swarm: { ...swarm, area: [-60, -60, 1200, 2040] } } }; };
  return [
    { id: "sky", ...put("sky", { seed: s, tone: 0.62, pigment: o.tint ?? "indigo", cloud: 0.35 }), at: [960, 560], scale: 1, depth: 0.05, enter: coming(o, 0, "develop", 2.2), tall: { at: [540, 900], scale: 1.6 } },
    { id: "far", ...put("range", { seed: s + 3, layers: 2, tone: [0.14, 0.24], sharp: 0.7, pigment: "ink", edge: 0.02 }), at: [960, 560], scale: 1.2, depth: 0.2, enter: coming(o, 0), tall: { at: [540, 900], scale: 1.1 } },
    { id: "peaks", ...put("massif", { seed: s + 3, kind: "crag", ink: 0.85, texture: 0.55, water: 0.35, moss: 0.4, trees: 0.8 }), at: [760, 620], scale: 1.1, depth: 0.5, enter: coming(o, 1, "paint", 2.8), tall: { at: [480, 1080], scale: 0.95 } },
    { id: "cloud", ...put("mist", { seed: s + 2 }), at: [960, 900], scale: 1.25, depth: 0.7, enter: coming(o, 2, "mist"), tall: { at: [540, 1420], scale: 1.1 } },
    flakes("snow-far", 120, 0.6, [0.14, 0.26], 62),
    { id: "pine", ...put("pine", { seed: s + 1, form: "tree", wash: "indigo" }), at: [1480, 610], scale: 0.62, depth: 1, enter: coming(o, 2, "paint", 3), tall: { at: [700, 1420], scale: 0.62 } },
    flakes("snow", 70, 1.2, [0.3, 0.55], 110),
  ];
}
