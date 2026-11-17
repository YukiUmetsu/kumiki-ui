/**
 * ANAT1 hair foundation, second generation: hairstyles groomed on a head, grown under gravity, cut like a haircut and
 * filled out to tens of thousands of strands; and a strand renderer with self-shadowing and multiple scattering.
 *
 * Grooming (`groomHair`):
 * - roots inside an anatomical hairline (front, temples, around the ears, nape) on the cranium;
 * - each style combs its roots (parting, whorl, swept back or to the side, gathered into a tie), and each fringe has
 *   its own section (a triangle behind the front hairline) and flow;
 * - about 480 guide strands are grown from the root as heavy elastic rods: lying on the head, where the hair under
 *   them holds them up (outer layers from higher roots lie further out), they follow the comb and slide downhill;
 *   where the head falls away they hang, turning toward gravity over √(ℓ³/L) for the length L still below them, with
 *   ℓ ≈ 5 cm, the elasto-gravity length of a hair (Goldstein, Warren & Ball 2012). So long hair falls from the widest
 *   part of the head, short hair stands, and ends a few centimetres long keep their direction;
 * - hair rests on the forehead (fringes), passes beside the cheeks and over the ears, and drapes over the shoulders,
 *   in front of the ridge to the chest and behind it down the back;
 * - fringes and short and medium hair then settle under their weight (a heavy elastic rod, the moment method), pushed out
 *   of the head, face, ears, neck, shoulders and chest on every pass;
 * - then cut: a blunt line (bobs), layers or textured ends, and each fringe on its own line, measured on 25 modern
 *   photographs (full fringes at the brows and lower toward the temples, curtains open in the middle to the cheekbones);
 * - child strands (5,000–120,000, configurable) interpolate guides of the same section, gather into clumps, curl by
 *   curl type, frizz and fly away in smooth arcs.
 *
 * Rendering (`renderHairStrands`):
 * - Marschner's three lobes (R, TT, TRT) with their longitudinal shifts, coloured by melanin absorption;
 * - deep opacity maps (Yuksel & Keyser 2008) along the light for self-shadowing, and along the view for occlusion of
 *   sky light;
 * - multiple scattering inside the hair volume (after the dual-scattering idea, Zinke et al. 2008): light that
 *   penetrates deeper and comes back in the hair's own colour, so the shadowed side is coloured, not black or bald;
 * - strands as anti-aliased lines, far to near, hidden behind the skin.
 */
import type { Vec3 } from "./anatomy-body";
import type { RGB } from "./anatomy-color";
import { hairAlbedo, hairSigmaA } from "./anatomy-color";
import { CURL_TYPES } from "./anatomy-hair";
import type { Raster } from "./foundation-raster";

// ---- Styles -------------------------------------------------------------------------------------------------------------------------

export type FringeKind = "none" | "blunt" | "wispy" | "micro" | "long" | "curtain" | "bottleneck" | "side-swept";
export type Parting = "none" | "center" | "left" | "right";
export interface HairStyleSpec {
  id: string; label: string;
  /** Length of hair combed straight down, mm, by where it grows: top (crown), sides (temples, above the ears), back (nape), front (the fringe section). */
  length: { top: number; side: number; back: number; front: number };
  /** How the ends are cut: one line (a bob), graduated layers, or ragged texture. */
  cut: "blunt" | "layered" | "textured";
  /** A blunt line's height below the ear opening (mm) and its rise toward the back (mm per mm; an A-line is negative). */
  cutLine?: { below: number; slope: number };
  parting: Parting;
  fringe: FringeKind;
  comb: "natural" | "back" | "side";
  /** Gathered hair: a ponytail hangs from a tie, a bun coils at it. Heights in mm above the ear opening, depth behind it. */
  gather?: { kind: "ponytail" | "bun"; up: number; back: number; tail: number };
  curl: number;
  /** Thickness of the hair mass over the scalp, mm. */
  volume: number;
  clump: number; frizz: number;
  /** How firmly the hair keeps its combed direction against gravity: 0.3 loose … 2 set with product. */
  hold?: number;
  /** The last few centimetres turn under toward the neck (positive, a bevelled bob) or flip out (negative). */
  ends?: number;
  /** Extra lift at the front hairline, mm (a quiff or a blow-dried front). */
  frontLift?: number;
  /** How closely the hanging hair is dried to hug the head and neck (0 falls freely … 1 close), instead of splaying out. */
  hug?: number;
  /** What it looks like and where it was seen. */
  note: string;
}

/**
 * Hairstyles after real ones. Lengths are the standard salon definitions (a bob ends at the chin or jaw, a lob at the
 * collarbone; clipper guards #1–#8 are 3–25 mm), estimated where a range is given; references are public-domain
 * photographs (Renée Adorée's 1920s bob, Veronica Lake's 1940s side wave, Abbey Lincoln's afro, 1940s men's side parts).
 */
export const HAIRSTYLES: readonly HairStyleSpec[] = [
  { id: "long-straight", label: "Long, straight", length: { top: 470, side: 430, back: 470, front: 400 }, cut: "layered", parting: "center", fringe: "none", comb: "natural", curl: 1, volume: 9, clump: 0.4, frizz: 0.06, ends: 0.15, hug: 0.25, note: "Hair to the shoulder blades, long layers, a centre part." },
  { id: "long-wavy", label: "Long, wavy", length: { top: 460, side: 420, back: 460, front: 380 }, cut: "layered", parting: "left", fringe: "none", comb: "natural", curl: 3, volume: 14, clump: 0.6, frizz: 0.14, ends: 0.1, note: "Soft waves (curl type III) from a side part." },
  { id: "lob", label: "Long bob (lob)", length: { top: 290, side: 250, back: 270, front: 250 }, cut: "blunt", cutLine: { below: 120, slope: 0.08 }, parting: "left", fringe: "none", comb: "natural", curl: 1, volume: 10, clump: 0.35, frizz: 0.06, ends: 0.35, hug: 0.5, note: "Ends at the collarbone in one line." },
  { id: "bob", label: "Bob", length: { top: 230, side: 170, back: 190, front: 170 }, cut: "blunt", cutLine: { below: 50, slope: 0.05 }, parting: "left", fringe: "none", comb: "natural", curl: 1, volume: 10, clump: 0.3, frizz: 0.05, ends: 0.6, hug: 0.7, note: "Ends in a line at the jaw, turned under (Renée Adorée, 1920s)." },
  { id: "bob-bangs", label: "Bob with blunt bangs", length: { top: 230, side: 170, back: 190, front: 90 }, cut: "blunt", cutLine: { below: 50, slope: 0.05 }, parting: "none", fringe: "blunt", comb: "natural", curl: 1, volume: 10, clump: 0.3, frizz: 0.04, ends: 0.6, hug: 0.7, note: "The classic bob with a full fringe cut straight at the brows." },
  { id: "shoulder-curtain", label: "Shoulder length, curtain bangs", length: { top: 330, side: 290, back: 330, front: 130 }, cut: "layered", parting: "center", fringe: "curtain", comb: "natural", curl: 2, volume: 12, clump: 0.42, frizz: 0.08, ends: 0.25, hug: 0.3, note: "Bangs parted in the middle, from the bridge of the nose to the cheekbones, sweeping out." },
  { id: "side-wave", label: "Long side wave", length: { top: 400, side: 380, back: 420, front: 380 }, cut: "layered", parting: "left", fringe: "side-swept", comb: "side", curl: 3, volume: 14, clump: 0.62, frizz: 0.05, hold: 1.2, ends: 0.45, note: "A deep side part, the front falling across the brow in a wave (Veronica Lake, 1940s)." },
  { id: "curly", label: "Curly", length: { top: 300, side: 270, back: 300, front: 220 }, cut: "textured", parting: "none", fringe: "none", comb: "natural", curl: 5, volume: 26, clump: 0.75, frizz: 0.3, note: "Curl type V in ringlets; curls shrink the hair to about two-thirds of its length." },
  { id: "afro", label: "Afro", length: { top: 190, side: 170, back: 170, front: 160 }, cut: "textured", parting: "none", fringe: "none", comb: "natural", curl: 8, volume: 55, clump: 0.5, frizz: 0.45, note: "Tightly coiled hair (type VIII) standing out in a rounded mass (Abbey Lincoln, 1966)." },
  { id: "ponytail", label: "Ponytail", length: { top: 400, side: 400, back: 400, front: 380 }, cut: "layered", parting: "none", fringe: "none", comb: "back", gather: { kind: "ponytail", up: 40, back: 95, tail: 260 }, curl: 2, volume: 5, clump: 0.5, frizz: 0.1, hold: 1.5, note: "Combed back to a tie at the crown, the tail hanging." },
  { id: "bun", label: "Low bun", length: { top: 380, side: 380, back: 380, front: 360 }, cut: "layered", parting: "center", fringe: "none", comb: "back", gather: { kind: "bun", up: -10, back: 92, tail: 0 }, curl: 1, volume: 4, clump: 0.45, frizz: 0.08, hold: 1.5, note: "Combed back from a centre part to a coil at the nape." },
  { id: "pixie", label: "Pixie", length: { top: 75, side: 35, back: 30, front: 85 }, cut: "textured", parting: "left", fringe: "side-swept", comb: "side", curl: 1, volume: 7, clump: 0.6, frizz: 0.12, hold: 1.4, frontLift: 5, note: "Short at the back and sides, longer on top, a side-swept fringe." },
  { id: "short-crop", label: "Short crop (men)", length: { top: 60, side: 20, back: 18, front: 65 }, cut: "textured", parting: "left", fringe: "none", comb: "side", curl: 1, volume: 6, clump: 0.55, frizz: 0.08, hold: 1.6, frontLift: 9, note: "Sides clipped (#6, 19 mm), top combed to a side part with a little lift at the front (1940s men's portraits)." },
  { id: "slicked-back", label: "Slicked back", length: { top: 120, side: 25, back: 30, front: 140 }, cut: "textured", parting: "none", fringe: "none", comb: "back", curl: 1, volume: 5, clump: 0.7, frizz: 0.02, hold: 2, frontLift: 6, note: "Long on top, combed straight back with product; short sides." },
  { id: "buzz", label: "Buzz cut", length: { top: 9, side: 6, back: 6, front: 9 }, cut: "blunt", parting: "none", fringe: "none", comb: "natural", curl: 1, volume: 2, clump: 0.1, frizz: 0.05, note: "Clipped all over (#3 guard, 10 mm, on top)." },
];
export const findHairStyle = (id: string) => HAIRSTYLES.find(s => s.id === id) ?? HAIRSTYLES[0];

/** A fringe: its section, how thick it is left, how firmly it is set, and where it is cut. */
export interface FringeSpec {
  id: Exclude<FringeKind, "none">; label: string;
  /** Half-width of the section at the front hairline, degrees of azimuth (the temple corners are at about 36°). */
  width: number;
  /** How far the triangular section reaches back from the front hairline, mm. */
  depth: number;
  /** Share of the section's hair left in (thinned, see-through fringes keep less). */
  density: number;
  hold: number;
  /** How strongly its hair gathers into pieces (0 even … 1 separate pieces with gaps). */
  clump: number;
  note: string;
}
/**
 * Fringes as stylists cut them. Each is a triangular section from the temple corners to a point a few centimetres
 * behind the front hairline (the usual sectioning in cutting guides), cut on its own line. Widths, depths and lengths
 * are estimated from salon descriptions and public-domain portrait photographs.
 */
export const FRINGES: readonly FringeSpec[] = [
  { id: "blunt", label: "Blunt (full)", width: 34, depth: 55, density: 1, hold: 0.7, clump: 0.35, note: "Cut straight across at the brows; heavy, the ends turned a little under by the brush." },
  { id: "wispy", label: "Wispy (see-through)", width: 30, depth: 36, density: 0.55, hold: 0.7, clump: 0.9, note: "A shallow section thinned so the forehead shows through, uneven ends at the brows." },
  { id: "micro", label: "Micro (baby)", width: 30, depth: 42, density: 0.9, hold: 0.9, clump: 0.4, note: "Cut halfway up the forehead." },
  { id: "long", label: "Long (lash-grazing)", width: 34, depth: 50, density: 0.85, hold: 0.55, clump: 0.7, note: "Full and long, grazing the lashes, falling into pieces." },
  { id: "curtain", label: "Curtain", width: 46, depth: 55, density: 1, hold: 1.15, clump: 0.55, note: "Parted in the middle, from the bridge of the nose to the cheekbones, sweeping out to frame the eyes." },
  { id: "bottleneck", label: "Bottleneck", width: 32, depth: 45, density: 0.9, hold: 1.05, clump: 0.5, note: "Short and narrow in the middle at the brows, curving round the eyes to the cheekbones." },
  { id: "side-swept", label: "Side-swept", width: 37, depth: 52, density: 0.9, hold: 1.25, clump: 0.55, note: "Across the forehead from a side part: at the brow on the part side, to the cheekbone on the other." },
];
export const findFringe = (id: FringeKind) => FRINGES.find(f => f.id === id);

/**
 * A fringe strand is drawn as this many finer ones (the fringe is the most looked-at hair: a smoother sheet), each at
 * FRINGE_WIDTH of the usual width: together a little denser than the rest, as a cut fringe is (it is thinned less than
 * the lengths behind it, and lies in one thin layer over the forehead).
 */
const FRINGE_STRANDS = 2, FRINGE_WIDTH = 0.85;

/** Physical facts the groom uses. */
export const HAIR_PHYSICS = {
  gravityLength: { value: 50, unit: "mm", grade: "reported" as const, source: "Goldstein, Warren & Ball, The shape of a ponytail, Phys. Rev. Lett. 108, 078101 (2012): ℓ = (A/λg)^(1/3) ≈ 5 cm" },
  scalpCount: { value: 100_000, grade: "reported" as const, source: "Commonly 80,000–150,000 scalp hairs, about 100,000 on average" },
  fibreDiameter: { value: 0.07, unit: "mm", grade: "measured" as const, source: "HAIR_GROUPS (70–78 µm equivalent diameter)" },
  highlights: { alphaR: -7, betaR: 7.5, grade: "reported" as const, source: "Marschner et al. 2003 (R shifted toward the root by 5–10°, TT by half the opposite, TRT by one and a half)" },
};
/** Extinction of key light per unit of fibre coverage: direct light, and light scattered on through the hair (estimated, checked in renders). */
export const HAIR_SHADOW = { direct: 0.32, multiple: 0.05 };

// ---- The head ------------------------------------------------------------------------------------------------------------------

/** A head for hair, mm, y up, z toward the face, x toward the head's left. */
export interface HairHead {
  /** The cranium as an ellipsoid. */
  centre: Vec3; radii: Vec3;
  /** Heights (y) of the front hairline at the midline, the brow line, the ear opening (tragion), the chin, and the face's half width at the cheekbones. */
  hairlineY: number; browY: number; tragionY: number; chinY: number; faceHalf: number;
  /** Pupil height (fringe lengths are set from it); about 22 mm below the brows if not given. */
  eyeY?: number;
  /** z of the face's front (glabella). */
  faceZ: number;
  /** Ear centre (x = ±earX), and the neck (elliptic cylinder) and shoulder line hair can rest on. */
  earX: number; earZ: number;
  neck: { rx: number; rz: number; cz: number };
  shoulderY: number; shoulderHalf: number;
  /** 0 woman … 1 man (sideburns and temples). */
  sex: number;
  /** z of the face's front surface at (x, y), NaN off the face: fringes rest on it, side hair passes beside it. */
  faceFront?: (x: number, y: number) => number;
  /** The top of the shoulders and the front of the chest at x: hair drapes over them. */
  shoulderTop?: (x: number) => number;
  chestFront?: (x: number) => number;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sc = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const nrm = (a: Vec3): Vec3 => sc(a, 1 / (len(a) || 1));
const tangential = (v: Vec3, n: Vec3) => nrm(sub(v, sc(n, dot(v, n))));
const mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sst = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const mulberry = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const gaussR = (r: () => number) => Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(2 * Math.PI * r());
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
const DOWN: Vec3 = [0, -1, 0];

/**
 * The ellipsoid (offset `grow` mm outward) near a point: its normal there, the point moved onto it along that normal
 * (the nearest point, closely, for points near the surface; a push from the centre would drift strands sideways), and
 * whether the point is inside.
 */
function ellipsoidAt(h: HairHead, p: Vec3, grow = 0): { surf: Vec3; n: Vec3; inside: boolean } {
  const d = sub(p, h.centre), q: Vec3 = [d[0] / h.radii[0], d[1] / h.radii[1], d[2] / h.radii[2]], r = len(q) || 1e-9;
  const s0 = add(h.centre, sc(d, 1 / r)), n = nrm([(s0[0] - h.centre[0]) / (h.radii[0] ** 2), (s0[1] - h.centre[1]) / (h.radii[1] ** 2), (s0[2] - h.centre[2]) / (h.radii[2] ** 2)]);
  const gap = dot(sub(p, add(s0, sc(n, grow))), n);
  return { surf: sub(p, sc(n, gap)), n, inside: gap < 0 };
}
/** The hairline's height at an azimuth round the head (0° the forehead, 90° the ear, 180° the nape). */
function hairlineAt(h: HairHead, azDeg: number): number {
  const a = Math.abs(azDeg), front = h.hairlineY, temple = h.browY + 18 + 6 * h.sex, aboveEar = h.tragionY + 26, nape = h.centre[1] - h.radii[1] * 0.9;
  const knots: [number, number][] = [[0, front], [22, front - 2], [38, temple], [62, h.tragionY - 6 - 10 * h.sex], [78, aboveEar], [104, aboveEar], [122, h.tragionY - 18], [150, nape + 8], [180, nape]];
  for (let i = 1; i < knots.length; i++) if (a <= knots[i][0]) { const [a0, y0] = knots[i - 1], [a1, y1] = knots[i]; return y0 + ((a - a0) / (a1 - a0)) * (y1 - y0); }
  return nape;
}
const azimuth = (h: HairHead, p: Vec3) => (Math.atan2(p[0], p[2] - h.centre[2]) * 180) / Math.PI;
/** Is this point on the cranium inside the hairline (and away from the ear)? */
function onScalp(h: HairHead, p: Vec3): boolean {
  if (p[1] < hairlineAt(h, azimuth(h, p))) return false;
  return Math.hypot(Math.abs(p[0]) - h.earX, p[1] - h.tragionY - 6, p[2] - h.earZ) >= 27;
}
const partXOf = (s: HairStyleSpec) => (s.parting === "left" ? 24 : s.parting === "right" ? -24 : 0);

/**
 * How much of the scalp at a point is hidden by hair at the roots (0 bare … 1 covered): the hairline softens over
 * about 8 mm and a parting shows a line of scalp about 2 mm wide. Painted under the strands, it stands in for the
 * hairs too fine and too many to draw.
 */
export function scalpCover(head: HairHead, style: HairStyleSpec | string, p: Vec3): number {
  const st = typeof style === "string" ? findHairStyle(style) : style;
  // (a real hairline turns from skin to full cover over a few millimetres of fine hairs, not a wide tinted band)
  const c = sst(-0.5, 3.5, p[1] - hairlineAt(head, azimuth(head, p)));
  const ear = Math.hypot(Math.abs(p[0]) - head.earX, p[1] - head.tragionY - 6, p[2] - head.earZ);
  // hairs from both sides lie across a parting, so even its bare line keeps most of its cover
  return c * sst(24, 30, ear) * (1 - 0.35 * partLine(head, st, p));
}
/**
 * The parting's bare line at a point (0 … 1): about a millimetre and a half wide with uneven edges where hairs cross
 * it, from the front hairline back for about 9 cm, fading toward the crown.
 */
export function partLine(head: HairHead, style: HairStyleSpec, p: Vec3): number {
  if (style.parting === "none" || style.gather || p[1] < head.tragionY + 35 || p[2] - head.centre[2] < -head.radii[2] * 0.4) return 0;
  const along = p[2] - head.centre[2], wobble = 0.35 * Math.sin(along * 0.9) + 0.25 * Math.sin(along * 2.3 + 1.7);
  const half = 0.75 + wobble * 0.5, d = Math.abs(p[0] - partXOf(style) - wobble * 0.4);
  return (1 - sst(half * 0.4, half, d)) * sst(-head.radii[2] * 0.4, head.radii[2] * 0.2, along) * sst(-0.5, 3, p[1] - hairlineAt(head, azimuth(head, p)));
}

// ---- Grooming --------------------------------------------------------------------------------------------------------------------

export interface GroomOptions {
  /** A style id from HAIRSTYLES, or a full spec. */
  style?: string | HairStyleSpec;
  /** Override parts of the style. */
  fringe?: FringeKind; parting?: Parting; curl?: number;
  /** Scale every length (1 = the style's). */
  lengthScale?: number;
  /** Strands drawn (the real head has about 100,000). Default 40,000. */
  strands?: number;
  /** Guide strands grown. Default 480. */
  guides?: number;
  seed?: number;
}
export interface HairGroom {
  /** Strand points, mm, head space; strand after strand. */
  points: Float32Array; starts: Uint32Array; counts: Uint16Array;
  /** Per strand: random 0–1, its root's height on the scalp 0 (lowest) … 1 (crown), and its root's distance above the hairline (mm). */
  jitter: Float32Array; layer: Float32Array; edge: Float32Array;
  /** Per strand: its lock's (clump's) random 0–1, shared by the strands of a lock. */
  lock?: Float32Array;
  /** Per strand: its drawn width as a share of the usual (finer where one strand is drawn as several, as in a fringe). */
  width?: Float32Array;
  guides: Vec3[][];
  style: HairStyleSpec;
  ms: number;
}

/** Groom a hairstyle on a head. Deterministic for the same head and options. */
export function groomHair(head: HairHead, o: GroomOptions = {}): HairGroom {
  const t0 = now();
  const base = typeof o.style === "object" ? o.style : findHairStyle(o.style ?? "long-straight");
  const style: HairStyleSpec = { ...base, fringe: o.fringe ?? base.fringe, parting: o.parting ?? base.parting, curl: o.curl ?? base.curl };
  const ct = CURL_TYPES[clamp(Math.round(style.curl) - 1, 0, 7)];
  const rnd = mulberry((o.seed ?? 1) * 7919 + 101);
  const ls = o.lengthScale ?? 1;
  const nGuides = Math.max(60, Math.round(o.guides ?? 480)), nStrands = Math.max(200, Math.round(o.strands ?? 40000));
  const H = head, fr = style.gather ? undefined : findFringe(style.fringe), eyeY = H.eyeY ?? H.browY - 22;
  const top = H.centre[1] + H.radii[1], lowest = H.centre[1] - H.radii[1], partX = partXOf(style);
  const hold = style.hold ?? 0.6, holdLen = style.comb === "back" ? 160 : style.comb === "side" ? 90 : 45;
  // ---- scalp sampling (area-uniform on the cranium inside the hairline) ----
  const sample = (): { p: Vec3; n: Vec3; layer: number } => {
    for (let tries = 0; tries < 400; tries++) {
      const u = nrm([gaussR(rnd), gaussR(rnd), gaussR(rnd)]);
      const p: Vec3 = [H.centre[0] + u[0] * H.radii[0], H.centre[1] + u[1] * H.radii[1], H.centre[2] + u[2] * H.radii[2]];
      if (!onScalp(H, p)) continue;
      // roots sit on the skin: where the forehead stands in front of the cranium, on the forehead
      if (H.faceFront && p[2] > H.centre[2] + H.radii[2] * 0.25) { const ff = H.faceFront(p[0], p[1]); if (Number.isFinite(ff) && ff > p[2]) p[2] = ff; }
      return { p, n: ellipsoidAt(H, p).n, layer: clamp((p[1] - lowest) / (top - lowest), 0, 1) };
    }
    return { p: [H.centre[0], top, H.centre[2]], n: [0, 1, 0], layer: 1 };
  };
  // ---- sections: the fringe triangle, and the front swept off the face ----
  const inFringe = (p: Vec3): boolean => {
    if (!fr) return false;
    const dz = p[2] - H.centre[2];
    if (dz < 0) return false;
    // the section lies behind the front hairline: sideburns and temples below it are never fringe
    if (p[1] < H.hairlineY - 8) return false;
    const az = Math.abs(azimuth(H, p)), back = (p[1] - H.hairlineY) / (fr.depth * 0.75);
    return back < 1 && az < fr.width * (1 - Math.max(0, back) * 0.85);
  };
  /** The front of the head above the face, where a style holds hair off the face until it passes the temple. */
  const inFront = (p: Vec3) => Math.abs(azimuth(H, p)) < 50 && p[1] < H.hairlineY + 45 && p[1] > H.browY - 10 && p[2] - H.centre[2] > H.radii[2] * 0.3;
  // ---- the comb ----
  const crown: Vec3 = [H.centre[0] - 0.12 * H.radii[0], H.centre[1] + H.radii[1] * 0.82, H.centre[2] - H.radii[2] * 0.45];
  const tie: Vec3 | null = style.gather ? [H.centre[0], H.tragionY + style.gather.up, H.centre[2] - H.radii[2] - 4 - (style.gather.back - H.radii[2]) * 0.2] : null;
  const fringeDir = (p: Vec3, root: Vec3): Vec3 => {
    // 0 on the scalp … 1 down the forehead: bangs go forward over the hairline, then fall, sweep out or across
    const k = clamp((H.hairlineY + 4 - p[1]) / 30, 0, 1), sx = Math.sign(root[0] - partX) || 1, away = style.parting === "right" ? 1 : -1;
    switch (fr?.id) {
      // curtains part at the centre and sweep out to clear the eyes; a bottleneck is shorter and rounder
      // (as on the references: down and out at about 45° from the part, lying along the face, not out to the sides)
      //  first down from the part, then out: a pair of parentheses round the eyes)
      case "curtain": return nrm([sx * (0.18 + 1.35 * k * k), -0.85 - 0.6 * k, 1.1 * (1 - k)]);
      case "bottleneck": return nrm([sx * (0.15 + 1.4 * k * k), -0.5 - 0.6 * k, 1.1 * (1 - k)]);
      case "side-swept": return nrm([away * (1.25 - 0.35 * k), -0.35 - 0.6 * k, 1.0 * (1 - k)]);
      default: return nrm([root[0] * 0.004, -0.4 - 0.75 * k, 1.1 * (1 - k)]);
    }
  };
  const combField = (p: Vec3, n: Vec3, root: Vec3): Vec3 => {
    if (tie) return tangential(sub(tie, p), n);
    const down = tangential(DOWN, n);
    let d = len(sub(p, crown)) < 6 ? tangential([0, 0, -1], n) : tangential(sub(p, crown), n);
    if (style.comb === "back") d = tangential(add(sc(tangential([0, 0, -1], n), 1.6), sc(down, 0.4)), n);
    if (style.comb === "side") d = tangential(add(sc(tangential([style.parting === "right" ? 1 : -1, 0, 0], n), 1.2), sc(down, 0.6)), n);
    // the part: hair leaves the part line on its own side
    if (style.parting !== "none" && p[1] > H.tragionY + 35 && p[2] - H.centre[2] > -H.radii[2] * 0.4) {
      const side = root[0] >= partX ? 1 : -1, w = Math.exp(-Math.abs(p[0] - partX) / 26);
      d = tangential(add(d, sc(tangential([side, -0.25, 0], n), 2.2 * w)), n);
    }
    // no fringe here: the front is swept off the face, to its side of the part, or back
    if (inFront(p)) {
      const side = root[0] >= partX ? 1 : -1;
      d = tangential(add(sc(d, 0.4), sc(tangential(style.comb === "back" ? [0, 0.2, -1] : [side, 0.15, -0.55], n), 1.4)), n);
    }
    return d;
  };
  // ---- target lengths (combed straight) by root position ----
  const lengthAt = (p: Vec3, fringe: boolean): number => {
    const az = Math.abs(azimuth(H, p)) / 180; // 0 front … 1 back
    const topness = clamp((p[1] - H.tragionY) / (top - H.tragionY), 0, 1);
    const side = style.length.side + (style.length.back - style.length.side) * sst(0.5, 0.95, az);
    let L = fringe ? style.length.front : side + (style.length.top - side) * topness * topness;
    // a fringe is cut from hair longer than the finished fringe (from behind the hairline over the dome to the cut line),
    // so the cut, not the length, decides where it ends; a short men's fringe keeps its own length
    if (fringe && fr && style.length.front >= 80) L = Math.max(L, { blunt: 140, wispy: 135, micro: 90, long: 160, curtain: 175, bottleneck: 160, "side-swept": 180 }[fr.id]);
    // sideburns (in front of the ear, below the temple) are clipped shorter on short cuts
    if (style.length.side < 60 && Math.abs(azimuth(H, p)) < 80 && p[1] < H.browY) L *= 0.55;
    return L * ls;
  };
  // ---- the face's outline by height (side hair passes outside it) ----
  const fy0 = H.chinY - 10, faceRows: number[] = [];
  if (H.faceFront) for (let y = fy0; y <= H.hairlineY + 30; y += 2) { let e = 0; for (let x = 0; x < 110; x += 1.5) if (Number.isFinite(H.faceFront(x, y)) || Number.isFinite(H.faceFront(-x, y))) e = x; faceRows.push(e); }
  const faceEdge = (y: number) => (faceRows.length ? faceRows[clamp(Math.round((y - fy0) / 2), 0, faceRows.length - 1)] : H.faceHalf);
  const shoulderTop = H.shoulderTop ?? ((x: number) => H.shoulderY + 14 - 0.22 * Math.max(0, Math.abs(x) - H.neck.rx));
  const chestFront = H.chestFront ?? (() => H.neck.cz + 30);
  // the torso in section: half its depth RZ, and the rounding RY where the shoulder's top meets its front (the garment
  // is upright below it, so hanging hair lies on its front, not a little inside it)
  const RZ = 58, RY = 14, bustBottom = H.shoulderY - 175;
  // ---- guides ----
  interface Guide { root: Vec3; n: Vec3; dir: Vec3; L: number; fringe: boolean; layer: number; side: number; drape: number; pts: Vec3[] }
  const guides: Guide[] = [];
  const sideOf = (p: Vec3) => (style.parting === "none" || style.gather ? 0 : p[0] >= partX ? 1 : -1);
  for (let g = 0; g < nGuides; g++) {
    const s = sample(), fringe = inFringe(s.p);
    const dir = fringe ? tangential(fringeDir(s.p, s.p), s.n) : combField(s.p, s.n, s.p);
    guides.push({ root: s.p, n: s.n, dir, fringe, layer: s.layer, side: fringe && fr && (fr.id === "curtain" || fr.id === "bottleneck") ? (s.p[0] >= partX ? 1 : -1) : sideOf(s.p), drape: 0, L: lengthAt(s.p, fringe) * (1 + (rnd() - 0.5) * 0.06), pts: [] });
  }
  const effShrink = 1 - ct.shrinkage;
  const lift = ((ct.lift + style.volume * 0.4) * Math.PI) / 180;
  const shellOff = (layer: number, fringe: boolean, root: Vec3) => {
    const edge = root[1] - hairlineAt(H, azimuth(H, root));
    // a fringe stands off the scalp where it leaves it (the rounded dome over the hairline on the references)
    let o = 1 + style.volume * (0.2 + 0.8 * Math.pow(layer, 0.8)) * (fringe ? 0.75 : 1) * (0.35 + 0.65 * sst(0, 25, edge));
    if (style.frontLift && !fringe && inFront(root)) o += style.frontLift * Math.exp(-Math.max(0, edge) / 35);
    return o;
  };
  const coily = ct.id >= 6, held = (style.hold ?? 0) >= 1.4 || !!style.gather;
  /** Push a point out of the head, face, ears, neck and shoulders. */
  const collide = (q0: Vec3, off: number, g: Guide, mode: "guide" | "child" = "guide") => {
    let q = q0, head = false, body = false;
    const e = ellipsoidAt(H, q, off);
    if (e.inside) { q = e.surf; head = true; }
    if (H.faceFront && q[1] > H.chinY - 5 && q[1] < H.hairlineY + 30 && q[2] > H.centre[2] + H.radii[2] * 0.25) {
      const ff = H.faceFront(q[0], q[1]);
      if (Number.isFinite(ff)) {
        // a fringe lies close on the forehead; hair beside the face keeps the thickness of the mass it belongs to
        const offF = g.fringe ? 1.2 + off * 0.5 : 2 + off * 1.0;
        if (mode === "guide" && !g.fringe && inFront(q) && q[2] > ff - 28) {
          // hair that is not a fringe stays above the hairline over the face: it slides along the hairline on the scalp
          const hl = hairlineAt(H, azimuth(H, q)) + 1 + off * 0.3;
          if (q[1] < hl && q[1] > hl - 12) {
            // straight up to the hairline, onto the skin there (the cranium or the forehead in front of it)
            const r = 1 - (q[0] / H.radii[0]) ** 2 - ((hl - H.centre[1]) / H.radii[1]) ** 2, f2 = H.faceFront(q[0], hl);
            let z = r > 0 ? H.centre[2] + H.radii[2] * Math.sqrt(r) + off : q[2];
            if (Number.isFinite(f2)) z = Math.max(z, f2 + offF);
            q = [q[0], hl, Math.max(q[2], z)]; head = true;
          }
        }
        const ff2 = H.faceFront(q[0], q[1]);
        if (Number.isFinite(ff2) && q[2] < ff2 + offF && q[2] > ff2 - 28) {
          // over the forehead hair lies on the face; lower down it passes beside the cheeks, on its own side
          if (g.fringe || q[1] > H.browY + 8) { q = [q[0], q[1], ff2 + offF]; head = true; }
          else {
            // out from in front of the face, a few millimetres a step, on the strand's own side
            const side = Math.sign(g.root[0] - partX) || Math.sign(q[0]) || 1, nx = side * (faceEdge(q[1]) + offF);
            q = [q[0] + clamp(nx - q[0], -4, 4), q[1], q[2]];
          }
        }
      }
    }
    // curtain, bottleneck and side-swept fringes are blow-dried to frame the eyes, not to hang in them: below the brows a
    // fringe strand stays outside the eye on its own side (a blunt or long fringe may graze the lashes)
    if (g.fringe && fr && (fr.id === "curtain" || fr.id === "bottleneck" || fr.id === "side-swept") && q[1] < H.browY + 2 && q[1] > eyeY - 14) {
      const eyeX = H.faceHalf * 0.47, side = fr.id === "side-swept" ? (style.parting === "right" ? 1 : -1) : (Math.sign(g.root[0] - partX) || 1);
      const outer = side * (eyeX + 17 + off * 0.3), inner = side * (eyeX - 16);
      if (side * q[0] > side * inner && side * q[0] < side * outer) q = [q[0] + clamp(outer - q[0], -5, 5), q[1], q[2]];
    }
    for (const sg of [-1, 1]) {
      const c: Vec3 = [sg * H.earX, H.tragionY + 4, H.earZ], rx = 9 + off * 0.5, ry = 33 + off * 0.3, rz = 17 + off * 0.3;
      const dx = (q[0] - c[0]) / rx, dy = (q[1] - c[1]) / ry, dz = (q[2] - c[2]) / rz, r = Math.hypot(dx, dy, dz);
      if (r < 1) { q = [c[0] + (dx / r) * rx, c[1] + (dy / r) * ry, c[2] + (dz / r) * rz]; head = true; }
    }
    if (q[1] < H.tragionY - 10 && q[1] > bustBottom) {
      const rx = H.neck.rx + off * 0.6, rz = H.neck.rz + off * 0.6, dx = q[0] / rx, dz = (q[2] - H.neck.cz) / rz, rr = Math.hypot(dx, dz);
      if (rr < 1) { q = [q[0] / rr, q[1], H.neck.cz + (q[2] - H.neck.cz) / rr]; body = true; }
    }
    // the shoulders in section (y–z) at this x: a rounded top over the chest in front and the back behind
    if (Math.abs(q[0]) < H.shoulderHalf) {
      const tp = shoulderTop(q[0]) + off * 0.4, zc = chestFront(q[0]) + off * 0.4 - RZ, yc = tp - RY, dz = q[2] - zc;
      if (q[1] < tp) {
        if (q[1] > yc) { const ry = (q[1] - yc) / RY, rz = dz / RZ, r = Math.hypot(ry, rz); if (r < 1) { q = [q[0], yc + (ry / (r || 1)) * RY, zc + (rz / (r || 1)) * RZ]; body = true; } }
        else if (Math.abs(dz) < RZ) { q = [q[0], q[1], zc + (Math.sign(dz) || 1) * RZ]; body = true; }
      }
      if (body && q[1] < tp) g.drape = q[2] > zc ? 1 : -1;
    }
    return { q, head, body };
  };
  // where each fringe ends, from fringes measured on 25 modern photographs (docs/research/hair-bangs-2026-11-17.md): e mm
  // below the brows' upper edge across the forehead, xb the outer end of the brow; full fringes end at the brows and come
  // lower toward the temples, a curtain opens to the hairline in the middle and reaches the outer brow and the cheekbone,
  // a side-swept fringe runs from the hairline on the short side to below the brow on the long side. `jit` (mm) moves a
  // piece's end up or down.
  const xb = H.faceHalf * 0.8;
  const fringeCutY = (xx: number, jit: number): number => {
    const ax = Math.abs(xx), r = Math.min(1.6, ax / xb);
    switch (fr?.id) {
      case "blunt": return H.browY - (2 + 10 * r * r) - jit;
      case "micro": return H.browY + (H.hairlineY - H.browY) * 0.5 - jit * 0.5;
      case "wispy": return H.browY - (3 + 8 * r * r) - jit * 1.4;
      case "long": return Math.min(H.browY - 12, eyeY + 6) - 6 * r * r - jit;
      // (a short curtain, as on men's middle-parted cuts, ends at the brows by the temples, not on the cheekbones)
      case "curtain": return Math.max(style.length.front < 120 ? H.browY - 4 : -Infinity, H.browY + 30 - 37 * Math.min(1, r) ** 1.25 - 26 * Math.max(0, r - 1) - jit);
      case "bottleneck": return H.browY + 12 - 22 * Math.min(1, r) ** 1.6 - 24 * Math.max(0, r - 1) - jit;
      case "side-swept": { const across = clamp(((style.parting === "right" ? xx : -xx) / xb) * 0.5 + 0.5, 0, 1); return H.browY + 30 - 48 * across ** 1.2 - jit; }
      default: return -Infinity;
    }
  };
  // ---- physics: each guide settles under its own weight ----
  // A heavy elastic rod (the hair's bending stiffness B against its weight w per length, B / w = l^3 with l the
  // elasto-gravity length, about 5 cm; Goldstein, Warren & Ball 2012), settled by the moment method: the weight beyond
  // each joint bends the rod there away from its styled (set) curvature by (moment x segment) / B; positions are rebuilt
  // from the root so no segment stretches, and every point is pushed out of the head, face, ears, neck, shoulders and
  // chest on every pass. Set hair is stiffer (hold). With no contact this is the heavy elastica: a horizontal 5 cm hair
  // tips 9.5 degrees down, 7.5 cm 29, 10 cm 54, 15 cm 82.
  const ELL = HAIR_PHYSICS.gravityLength.value;
  const rotAbout = (v: Vec3, ax: Vec3, ang: number): Vec3 => {
    const c = Math.cos(ang), sn = Math.sin(ang), k = dot(ax, v), cr = cross(ax, v);
    return [v[0] * c + cr[0] * sn + ax[0] * k * (1 - c), v[1] * c + cr[1] * sn + ax[1] * k * (1 - c), v[2] * c + cr[2] * sn + ax[2] * k * (1 - c)];
  };
  const settle = (pts0: Vec3[], g: Guide, offFull: number, ramp: number): Vec3[] => {
    if (tie || coily || pts0.length < 4) return pts0;
    const cum = [0]; for (let i = 1; i < pts0.length; i++) cum.push(cum[i - 1] + len(sub(pts0[i], pts0[i - 1])));
    const total = cum[cum.length - 1];
    // long hair is grown hanging already (its free part turns to the vertical over its elasto-gravity length); the
    // moment passes would let it swing across the face, so they settle fringes and short and medium hair
    // a blunt cut (a bob) is shaped by the cut and the blow-dry, its ends turned under against the neck: it keeps its grown
    // shape (its fringe still settles)
    if (total < 8 || (!g.fringe && (total > 260 || style.cut === "blunt"))) return pts0;
    const m = clamp(Math.round(total / 3.5), 4, 70), ds = total / m;
    // longer strands: smaller turns a pass (their joints carry long levers; large turns overshoot into loops)
    const maxTurn = 0.8 * Math.min(1, 160 / total), relaxK = total > 200 ? 0.6 : 0.8;
    const P: Vec3[] = []; let j = 0;
    for (let i = 0; i <= m; i++) { const t = (i / m) * total; while (j < cum.length - 2 && cum[j + 1] < t) j++; const f = (t - cum[j]) / Math.max(1e-9, cum[j + 1] - cum[j]); P.push(mix3(pts0[j], pts0[Math.min(pts0.length - 1, j + 1)], clamp(f, 0, 1))); }
    const r: Vec3[] = []; for (let i = 0; i < m; i++) r.push(nrm(sub(P[i + 1], P[i])));
    const B = ELL ** 3 * (1 + 2.5 * Math.max(0, (g.fringe && fr ? fr.hold : hold) - 0.5));
    let d = r.slice();
    const X: Vec3[] = P.slice(), touch = new Uint8Array(m + 1);
    const build = () => {
      for (let i = 0; i < m; i++) {
        const want = add(X[i], sc(d[i], ds)), q = collide(want, offFull * sst(0, ramp, (i + 1) * ds), g).q;
        touch[i + 1] = len(sub(q, want)) > 0.05 ? 1 : 0;
        const dd = nrm(sub(q, X[i])); d[i] = dd; X[i + 1] = add(X[i], sc(dd, ds));
      }
    };
    // the rest bend carried along: segment i keeps its set turn from segment i - 1 (the rest direction turned the way
    // segment i - 1 has turned from its own rest direction)
    const carry = (prevNow: Vec3, i: number): Vec3 => {
      const ax = cross(r[i - 1], prevNow), l = len(ax);
      return l > 1e-9 ? rotAbout(r[i], sc(ax, 1 / l), Math.atan2(l, dot(r[i - 1], prevNow))) : dot(r[i - 1], prevNow) > 0 ? r[i] : sc(r[i], -1);
    };
    // (15 passes, the update 0.8 of the way, at most 0.8 rad a joint a pass: within 1-3 degrees of the elastica)
    for (let it = 0; it < 15; it++) {
      build();
      // resting on the head or face along its whole length: nothing to settle
      if (it === 0) { let all = true; for (let i = 2; i <= m && all; i++) all = touch[i] === 1; if (all) break; }
      // the weight beyond each joint, as a torque about it (w = 1 per mm): lever (sum of midpoints - n X_k) x (0, -ds, 0)
      // where the hair rests on the head, face or shoulders the surface carries the weight beyond: the sum restarts there
      const tau: Vec3[] = new Array(m);
      let Sx = 0, Sz = 0, n = 0;
      for (let k = m - 1; k >= 0; k--) {
        if (touch[k + 1]) { Sx = 0; Sz = 0; n = 0; }
        Sx += (X[k][0] + X[k + 1][0]) / 2; Sz += (X[k][2] + X[k + 1][2]) / 2; n++; tau[k] = [(Sz - n * X[k][2]) * ds, 0, -(Sx - n * X[k][0]) * ds];
      }
      const nd: Vec3[] = [r[0]];
      for (let i = 1; i < m; i++) {
        let v = carry(nd[i - 1], i);
        const t = tau[i], tl = len(t), ang = Math.min(maxTurn, (tl * ds) / B);
        if (ang > 1e-7) v = rotAbout(v, sc(t, 1 / tl), ang);
        nd.push(nrm(mix3(d[i], v, relaxK)));
      }
      // settled: no joint turns more than 0.002 rad a pass
      let moved = 0; for (let i = 0; i < m; i++) moved = Math.max(moved, 1 - dot(d[i], nd[i]));
      d = nd;
      if (moved < 2e-6) break;
    }
    build();
    return X;
  };
  for (const g of guides) {
    const Lsim = Math.max(3, g.L * effShrink), ds = clamp(Lsim / 90, 0.7, 3.5);
    const offFull = coily ? 2 : shellOff(g.layer, g.fringe, g.root), ramp = Math.max(5, offFull * 2.2);
    let x: Vec3 = add(g.root, sc(g.n, 0.2)), d = nrm(add(sc(g.dir, Math.cos(lift)), sc(g.n, Math.sin(lift))));
    const pts: Vec3[] = [x];
    let arc = 0, contact = true, tied = false, tiedArc = 0, steps = 0;
    const tieOff: Vec3 = [gaussR(rnd) * 3.5, gaussR(rnd) * 3.5, 0], bunR = 20 + rnd() * 6, bunr = 2 + rnd() * 10, bunPhase = rnd() * Math.PI * 2;
    while (arc < Lsim && steps++ < 3000) {
      const Lr = Math.max(1, Lsim - arc), off = offFull * sst(0, ramp, arc);
      if (tie && style.gather && !tied && len(sub(x, tie)) < 8) {
        tied = true; tiedArc = arc; x = add(tie, tieOff); pts.push(x);
        d = nrm([gaussR(rnd) * 0.15, 0.35 + gaussR(rnd) * 0.1, -1]);
        continue;
      }
      if (tied && tie && style.gather?.kind === "bun") {
        // the bun: hair wraps round a coil behind the tie
        arc += ds;
        const u = (arc - tiedArc) / bunR, v = bunPhase + u * 0.35, rad: Vec3 = [Math.cos(u), Math.sin(u) * 0.8, 0];
        x = add(add(tie, [0, 0, -12]), add(sc(rad, bunR), add(sc(rad, Math.cos(v) * bunr), [0, 0, -Math.sin(v) * bunr])));
        pts.push(x);
        continue;
      }
      let target: Vec3, relax: number;
      const free = Math.min(400, Math.sqrt(HAIR_PHYSICS.gravityLength.value ** 3 / Lr)) * (1 + ct.stiffness);
      if (g.fringe) {
        // a fringe follows its cut and set while it lies on the head and forehead; off them, gravity takes it
        const f = fringeDir(contact ? x : [x[0], Math.min(x[1], H.hairlineY - 30), x[2]], g.root);
        const offHold = !fr ? 0.6 : fr.id === "side-swept" ? 1.3 : fr.id === "curtain" || fr.id === "bottleneck" ? 1.0 : 0.6;
        target = nrm(add(sc(f, (fr?.hold ?? 0.8) * (contact ? 2 : offHold)), DOWN)); relax = contact ? 10 : free;
      } else if (coily && !tied) {
        // tightly coiled hair is stiff and its coils hold one another up: it stands out from the scalp
        const e0 = ellipsoidAt(H, x, 0), c = combField(e0.surf, e0.n, g.root);
        target = nrm(add(add(sc(e0.n, 2), sc(c, 0.6)), sc(DOWN, 0.25))); relax = 14;
      } else if ((contact || held) && !tied) {
        const e0 = ellipsoidAt(H, x, 0), c = combField(e0.surf, e0.n, g.root);
        // over the front of the head the style (and the hair lying on it) holds hair along the comb, off the face, until
        // it has passed the temple, where it may fall; gathered hair is pulled to its tie
        target = inFront(x) || tie ? c : nrm(add(sc(c, hold * (0.35 + 0.65 * Math.exp(-arc / holdLen)) * 1.6), DOWN)); relax = 8;
      } else {
        // hanging; a blow-dried cut hangs a little in toward the head and neck rather than splaying from the widest part
        target = style.hug ? nrm(add(DOWN, sc(nrm([-x[0], 0, H.neck.cz - x[2]]), style.hug * 0.3))) : DOWN; relax = free;
      }
      // the ends: the last few centimetres turn under toward the neck, or flip out
      if (style.ends && Lr < 45 && !g.fringe && !tied) {
        const inward = nrm([-x[0], 0, H.neck.cz - x[2]]);
        target = nrm(add(target, sc(inward, style.ends * (1 - Lr / 45) * 1.2)));
      }
      const f = 1 - Math.exp(-ds / relax);
      d = nrm(add(sc(d, 1 - f), sc(target, f)));
      const qTry = add(x, sc(d, ds));
      let q0 = qTry;
      // over the upper head the hair beneath and above holds a strand on the mass: it wraps round the head rather than
      // leaving it where the head curves away, until it passes the widest part and falls; bangs keep to the forehead
      // (not where the strand lies on the face, in front of the cranium: bangs rest on the forehead, not on the skull
      // behind it, and pulling them toward it along its normal would draw them to the middle)
      const onFace = !!H.faceFront && Number.isFinite(H.faceFront(q0[0], q0[1])) && q0[2] > H.centre[2] + H.radii[2] * 0.25;
      if ((contact || held) && !tied && !coily && !g.fringe && !onFace) {
        // styled (set or gathered) hair is held against the head further and lower
        const e1 = ellipsoidAt(H, q0, off);
        if (!e1.inside && e1.n[1] > (held ? -0.45 : -0.1) && dot(sub(q0, e1.surf), e1.n) < (held ? 12 : 3)) q0 = e1.surf;
        if (g.fringe && H.faceFront && q0[1] > H.browY - 12) {
          const ff = H.faceFront(q0[0], q0[1]), rest = ff + 1.2 + off * 0.5;
          if (Number.isFinite(ff) && q0[2] > rest && q0[2] - rest < 3) q0 = [q0[0], q0[1], rest];
        }
      }
      const c = collide(q0, off, g), q = c.q, step = len(sub(q, x));
      contact = c.head;
      if (step < 1e-4) break;
      // a push off a surface turns the strand along it; the push itself is not a direction to keep going in
      const push = sub(q, qTry), pl = len(push);
      if (pl > 1e-6) { const pn = sc(push, 1 / pl), into = dot(d, pn); if (into < 0) d = nrm(sub(d, sc(pn, into))); }
      arc += step; x = q; pts.push(q);
      if (x[1] < bustBottom) break;
    }
    // ---- settle under gravity, then cut (a cut is made on hair that hangs) ----
    const settled = settle(pts, g, offFull, ramp);
    if (settled !== pts) { pts.length = 0; pts.push(...settled); }
    let keep = pts.length;
    if (style.cut === "blunt" && style.cutLine && !g.fringe) {
      for (let i = 2; i < pts.length; i++) { const yCut = H.tragionY - style.cutLine.below + (pts[i][2] - H.centre[2]) * -style.cutLine.slope; if (pts[i][1] < yCut) { keep = i; break; } }
    }
    if (g.fringe && fr) {
      const jitL = gaussR(rnd) * 2.2;
      for (let i = 2; i < pts.length; i++) if (pts[i][1] < fringeCutY(pts[i][0], jitL)) { keep = i; break; }
    }
    if (style.cut === "textured") keep = Math.max(2, Math.round(keep * (0.82 + 0.18 * rnd())));
    // a light smoothing (root fixed) takes out the small kinks a collision step leaves
    const kept = pts.slice(0, Math.max(2, keep));
    for (let it = 0; it < 2; it++) for (let i = 1; i < kept.length - 1; i++) kept[i] = mix3(kept[i], sc(add(kept[i - 1], kept[i + 1]), 0.5), 0.5);
    g.pts = kept;
  }
  // ---- children ----
  const MG = 96;
  const resample = (pts: Vec3[], n: number): Vec3[] => {
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + len(sub(pts[i], pts[i - 1])));
    const total = cum[cum.length - 1] || 1, out: Vec3[] = [];
    let j = 0;
    for (let k = 0; k < n; k++) { const s = (k / (n - 1)) * total; while (j < cum.length - 2 && cum[j + 1] < s) j++; const f = (s - cum[j]) / Math.max(1e-9, cum[j + 1] - cum[j]); out.push(mix3(pts[j], pts[Math.min(pts.length - 1, j + 1)], Math.min(1, f))); }
    return out;
  };
  const G = guides.map(g => resample(g.pts, MG));
  const guideLen = guides.map(g => { let s = 0; for (let i = 1; i < g.pts.length; i++) s += len(sub(g.pts[i], g.pts[i - 1])); return s; });
  const at = (curve: Vec3[], u: number): Vec3 => { const f = clamp(u, 0, 1) * (curve.length - 1), i = Math.min(curve.length - 2, Math.floor(f)); return mix3(curve[i], curve[i + 1], f - i); };
  /** A child's curve: the nearest guides of its own section (fringe or not, its side of the part, the same drape), inverse-distance weighted. */
  const childCurve = (p: Vec3) => {
    const fringe = inFringe(p), side = fringe && fr && (fr.id === "curtain" || fr.id === "bottleneck") ? (p[0] >= partX ? 1 : -1) : sideOf(p);
    let best: [number, number][] = [];
    const scan = (strict: boolean) => {
      for (let gi = 0; gi < guides.length; gi++) {
        if (strict && (guides[gi].fringe !== fringe || guides[gi].side !== side)) continue;
        const d = len(sub(guides[gi].root, p));
        if (best.length < 4 || d < best[3][0]) { best.push([d, gi]); best.sort((a, b) => a[0] - b[0]); if (best.length > 4) best.pop(); }
      }
    };
    scan(true);
    if (!best.length) scan(false);
    // only guides that go where the nearest one goes: averaging two that part ways (one swept left, one right) would
    // send the child between them, over the face
    const g0 = best[0][1], drape = guides[g0].drape, near = (gi: number) => [0.35, 0.7, 1].every(u => len(sub(at(G[gi], u), at(G[g0], u))) < Math.max(18, 2.5 * len(sub(guides[gi].root, guides[g0].root))));
    best = best.filter(b => guides[b[1]].drape === drape && (b[1] === g0 || near(b[1]))).slice(0, 3);
    const ws = best.map(([d]) => 1 / Math.max(0.5, d) ** 2), wsum = ws.reduce((a, b) => a + b, 0);
    let rootAvg: Vec3 = [0, 0, 0], L = 0;
    best.forEach(([, gi], k) => { rootAvg = add(rootAvg, sc(guides[gi].root, ws[k] / wsum)); L += (guideLen[gi] * ws[k]) / wsum; });
    const offset = sub(p, rootAvg);
    const base = (u: number): Vec3 => { let q: Vec3 = [0, 0, 0]; best.forEach(([, gi], j) => { q = add(q, sc(at(G[gi], u), ws[j] / wsum)); }); return q; };
    return { base, offset, L, fringe, side, drape };
  };
  /**
   * A child's points along its guides. The root's offset from them is carried in the strand's own frame (across the hair
   * sheet and through its layers), not as a fixed vector, which lower down would cut through the neck or chin.
   */
  const followGuides = (c: ReturnType<typeof childCurve>, n0: Vec3, us: number[]) => {
    const B = us.map(u => c.base(u)), pts: Vec3[] = [], frames: { n: Vec3; b: Vec3 }[] = [];
    let t = nrm(sub(B[Math.min(1, B.length - 1)], B[0])), n = tangential(n0, t), b = cross(t, n);
    const a = dot(c.offset, b), dn = dot(c.offset, n), rest = sub(c.offset, add(sc(b, a), sc(n, dn)));
    for (let k = 0; k < B.length; k++) {
      if (k > 0) { const tt = sub(B[k], B[k - 1]); if (len(tt) > 1e-6) { t = nrm(tt); const n2 = sub(n, sc(t, dot(n, t))); if (len(n2) > 1e-6) n = nrm(n2); b = cross(t, n); } }
      pts.push(add(add(B[k], add(sc(b, a * (1 - 0.4 * us[k])), sc(n, dn))), sc(rest, Math.max(0, 1 - us[k] / 0.08))));
      frames.push({ n, b });
    }
    return { pts, frames };
  };
  // clumps: leaders among the children, in the same section
  const clumpN = Math.max(8, Math.round(nStrands / (14 + 50 * (1 - style.clump))));
  const leaders: { root: Vec3; pts: Vec3[]; phase: number; key: string; L: number }[] = [];
  for (let k = 0; k < clumpN; k++) {
    const s = sample(), c = childCurve(s.p), pts = followGuides(c, s.n, Array.from({ length: MG }, (_, i) => i / (MG - 1))).pts;
    // neighbouring locks wave nearly in step (the waves run in bands across the hair, as real waves do; locks out of
    // step cross one another in a braided texture): the phase varies slowly over the head, with a little jitter
    const field = 0.9 * Math.sin(s.p[0] / 70 + 0.4) + 0.7 * Math.sin(s.p[2] / 90 + s.p[1] / 110);
    leaders.push({ root: s.p, pts, phase: field + (rnd() - 0.5) * 0.3, key: `${c.fringe}${c.side}${c.drape}`, L: c.L });
  }
  // a fringe has clumps of its own, much finer than the rest (a few dozen hairs each in a blunt fringe, larger pieces in
  // a wispy one): the head's clumps are too coarse for it and leave it a comb of separate locks
  if (fr) {
    const nLead = Math.round(18 + 30 * (1 - fr.clump));
    for (let k = 0, tries = 0; k < nLead && tries < nLead * 60; tries++) {
      const s = sample(); if (!inFringe(s.p)) continue;
      const c = childCurve(s.p), pts = followGuides(c, s.n, Array.from({ length: MG }, (_, i) => i / (MG - 1))).pts;
      leaders.push({ root: s.p, pts, phase: rnd() * 6, key: `${c.fringe}${c.side}${c.drape}`, L: c.L }); k++;
    }
  }
  const helix = ct.helix, amp = ct.amplitude * 1000, wl = ct.wavelength * 1000, segC = amp > 0 ? Math.min(6, wl / 7) : 6;
  const out: number[] = [], starts: number[] = [], counts: number[] = [], jit: number[] = [], lay: number[] = [], edge: number[] = [], lockR: number[] = [];
  const wid: number[] = [];
  // a strand in the fringe is drawn as FRINGE_STRANDS finer ones beside one another
  let pendBase: { p: Vec3; n: Vec3; layer: number } | null = null, pendLeft = 0, sampled = 0;
  for (;;) {
    let s: { p: Vec3; n: Vec3; layer: number }, isExtra = false;
    if (pendLeft > 0 && pendBase) { pendLeft--; isExtra = true; s = { p: add(pendBase.p, [gaussR(rnd) * 0.9, gaussR(rnd) * 0.9, 0]), n: pendBase.n, layer: pendBase.layer }; }
    else { if (sampled >= nStrands) break; sampled++; s = sample(); }
    const c = childCurve(s.p);
    if (c.fringe && fr && !isExtra) {
      if (rnd() > fr.density) continue;
      pendBase = s; pendLeft = FRINGE_STRANDS - 1;
    }
    const key = `${c.fringe}${c.side}${c.drape}`;
    const jt = rnd(), fly = rnd() < 0.01 + style.frizz * 0.02;
    // length jitter: blunt cuts stay even, layered and textured vary
    const lj = style.cut === "blunt" ? 1 - rnd() * 0.03 : style.cut === "layered" ? 1 - rnd() * 0.12 : 1 - rnd() * 0.25;
    const edgeMm = s.p[1] - hairlineAt(H, azimuth(H, s.p));
    // about one in two hairs at the very edge of the hairline is a short fine one (4–15 mm)
    const lenK = edgeMm < 4 && !c.fringe && jt < 0.5 ? Math.min(1, (4 + 11 * rnd()) / Math.max(1, c.L)) : 1;
    // fringes in finer segments: a few long straight segments show as a zig-zag across a fringe's face
    const nPts = clamp(Math.round((c.L * lj * lenK) / (c.fringe ? Math.min(segC, 2.5) : segC)) + 1, 4, MG);
    const step = (c.L * lj * lenK) / (nPts - 1);
    const flyDir = nrm([gaussR(rnd), gaussR(rnd) * 0.5, gaussR(rnd)]), ph: Vec3 = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
    const childOff = shellOff(s.layer, c.fringe, s.p) * 0.9, childG: Guide = { root: s.p, n: s.n, dir: s.n, L: c.L, fringe: c.fringe, layer: s.layer, side: c.side, drape: c.drape, pts: [] };
    starts.push(out.length / 3); counts.push(nPts); jit.push(jt); lay.push(s.layer); edge.push(edgeMm); wid.push(c.fringe ? FRINGE_WIDTH : 1);
    let arc = 0;
    const cp: Vec3[] = [], us = Array.from({ length: nPts }, (_, k) => (k / (nPts - 1)) * lj * lenK), path = followGuides(c, s.n, us);
    // the clump this strand joins: a near leader whose hair goes where this strand's goes (by root and tip)
    const tip = path.pts[nPts - 1], uEnd = us[nPts - 1];
    let lead = leaders[0], ld = Infinity;
    const tipOf = (l: { pts: Vec3[]; L: number }) => at(l.pts, clamp((uEnd * c.L) / Math.max(1, l.L), 0, 1));
    for (const l of leaders) { if (l.key !== key) continue; const d = len(sub(l.root, s.p)) + 0.5 * len(sub(tipOf(l), tip)); if (d < ld) { ld = d; lead = l; } }
    if (!Number.isFinite(ld)) for (const l of leaders) { const d = len(sub(l.root, s.p)) + 0.5 * len(sub(tipOf(l), tip)); if (d < ld) { ld = d; lead = l; } }
    lockR.push((((lead.phase * 7.13) % 1) + 1) % 1);

    for (let k = 0; k < nPts; k++) {
      const u = us[k], base = path.pts[k];
      let q = base;
      // clumping toward the clump leader, stronger toward the tips
      // (a fringe stays one sheet down most of its length and gathers into pieces only near the ends)
      //  a see-through fringe is thin pieces all the way, with skin between them)
      const w = c.fringe && fr ? Math.min(0.95, (0.35 + 0.65 * fr.clump) * sst(0.68, 1, u) ** 1.5 + 0.08 * u + Math.max(0, fr.clump - 0.6) * 1.8 * u ** 0.8) : style.clump * Math.pow(u, 1.3) * 0.9;
      // (toward the leader's point the same distance from its root: a leader longer or shorter than the strand must
      // not pull its tip along a different length, which drags fringe ends down onto the cheeks)
      if (w > 0) q = mix3(q, add(at(lead.pts, clamp((u * c.L) / Math.max(1, lead.L), 0, 1)), sc(sub(s.p, lead.root), 0.15)), w);
      // curl: offsets round the strand's direction; a clump curls together
      if (amp > 0 && k > 0) {
        const ref = path.frames[k].n, bin = path.frames[k].b;
        arc += step;
        const lockV = 0.94 + 0.12 * ((lead.phase * 3.7 % 1 + 1) % 1), th = (2 * Math.PI * arc) / (wl * lockV) + lead.phase + jt * 0.15, ramp = Math.min(1, arc / 15), a2 = amp * (1.2 - 0.4 * lockV / 1.2) * (c.fringe ? 0.25 : 1);
        const o2 = helix ? add(sc(ref, Math.cos(th) * a2), sc(bin, Math.sin(th) * a2)) : add(sc(bin, Math.sin(th) * a2), sc(ref, Math.sin(th * 0.5 + 0.7) * a2 * 0.2));
        q = add(q, sc(o2, ramp));
      }
      // frizz as slow, smooth wander; the odd flyaway leaves the mass in an arc
      if (k > 1) {
        const fz = style.frizz * 1.8 * u * u, ka = k * step / 14;
        if (fz > 0) q = add(q, [Math.sin(ka + ph[0]) * fz, Math.sin(ka * 0.8 + ph[1]) * fz * 0.5, Math.sin(ka * 0.9 + ph[2]) * fz]);
        if (fly) q = add(q, sc(flyDir, 10 * Math.max(0, u - 0.25) ** 2));
      }
      // children keep out of the head, ears, neck and shoulders (the face rules are for the guides they follow)
      if (k > 0) q = collide(q, childOff * sst(0, Math.max(5, childOff * 2.2), u * c.L), childG, "child").q;
      cp.push(q);
    }
    // a curl or clump must not lie over the face: each point's push to the side of the face (on the strand's side) is
    // spread smoothly along the strand, so it bends round the face instead of jumping
    const faceAt = H.faceFront;
    if (!c.fringe && faceAt) {
      // the side the strand hangs on (not its root's: without a part, hair from just right of centre may fall left)
      const meanX = cp.reduce((a, q) => a + q[0], 0) / cp.length, side = Math.sign(meanX) || Math.sign(s.p[0] - partX) || 1, push = cp.map(q => {
        if (q[1] > H.hairlineY || q[1] < H.chinY - 5 || q[2] < H.centre[2] + H.radii[2] * 0.25) return 0;
        const ff = faceAt(q[0], q[1]);
        if (!Number.isFinite(ff) || q[2] < ff - 28) return 0;
        return Math.max(0, faceEdge(q[1]) + 2 - side * q[0]);
      });
      if (push.some(v => v > 0)) {
        const sm = push.map((_, k) => { let m = 0; for (let j = 0; j < push.length; j++) if (push[j] > 0) m = Math.max(m, push[j] * Math.exp(-Math.abs(j - k) * step / 12)); return m; });
        for (let k = 0; k < cp.length; k++) cp[k] = [cp[k][0] + side * sm[k], cp[k][1], cp[k][2]];
      }
    }
    // nor below the hairline over the forehead: a child's root offset can carry it a few millimetres under the guides
    // it follows along the hairline; lift those points back above it, smoothly, onto the skin
    if (!c.fringe) {
      const lift = cp.map(q => { if (!inFront(q)) return 0; const hl = hairlineAt(H, azimuth(H, q)) + 0.8; return q[1] < hl && q[1] > hl - 15 ? hl - q[1] : 0; });
      if (lift.some(v => v > 0)) {
        const sm = lift.map((_, k) => { let m = 0; for (let j = 0; j < lift.length; j++) if (lift[j] > 0) m = Math.max(m, lift[j] * Math.exp(-Math.abs(j - k) * step / 10)); return m; });
        for (let k = 1; k < cp.length; k++) {
          if (sm[k] <= 0) continue;
          let q: Vec3 = [cp[k][0], cp[k][1] + sm[k], cp[k][2]];
          const e = ellipsoidAt(H, q, 1);
          if (e.inside) q = e.surf;
          const ff = faceAt ? faceAt(q[0], q[1]) : NaN;
          if (Number.isFinite(ff) && q[2] < ff + 1.5 && q[2] > ff - 28) q = [q[0], q[1], ff + 1.5];
          cp[k] = q;
        }
      }
    }
    // a fringe's children are cut on the fringe's line too, as scissors cut every hair, exactly where they cross it; each
    // piece a few millimetres up or down (the measured edges wander by about 4.7 mm): a row of points, not a ruled line
    if (c.fringe && fr) {
      const cj = (((((lead.phase * 9.17) % 1) + 1) % 1) * 2 - 1) * 3;
      for (let k = 2; k < cp.length; k++) {
        const yc = fringeCutY(cp[k][0], cj);
        if (cp[k][1] < yc) { const a = cp[k - 1], b = cp[k], t = clamp((a[1] - yc) / Math.max(1e-6, a[1] - b[1]), 0, 1); cp[k] = mix3(a, b, t); cp.length = k + 1; break; }
      }
      counts[counts.length - 1] = cp.length;
    }
    for (const q of cp) out.push(q[0], q[1], q[2]);
  }
  return {
    points: Float32Array.from(out), starts: Uint32Array.from(starts), counts: Uint16Array.from(counts), jitter: Float32Array.from(jit), layer: Float32Array.from(lay), edge: Float32Array.from(edge), lock: Float32Array.from(lockR), width: Float32Array.from(wid),
    guides: guides.map(g => g.pts), style, ms: now() - t0,
  };
}

// ---- Rendering ----------------------------------------------------------------------------------------------------------------------

export interface HairRenderView {
  /** Head-space point → screen x, y and a depth (larger = nearer the camera). */
  project: (p: Vec3) => [number, number, number];
  /** Head-space vector rotated into the camera's frame (for lighting). */
  rotate: (v: Vec3) => Vec3;
  /** Camera position in the rotated frame, and screen pixels per mm at the head. */
  camera: Vec3; pxPerMm: number;
  /** Depth of the nearest solid surface per pixel (larger = nearer), to hide hair behind the head. */
  solidDepth?: Float32Array;
}
export interface HairLight { dir: Readonly<Vec3>; colour: Readonly<RGB>; }
export interface HairRenderOptions {
  eumelanin?: number; pheomelanin?: number; grey?: number;
  key: HairLight; fill?: HairLight; rim?: HairLight; sky?: Readonly<RGB>;
  /** Light the head itself blocks (0 shadowed … 1 lit) at a rotated point. */
  headShadow?: (p: Vec3) => number;
  /** Drawn strand width in mm. By default each drawn strand covers what the 100,000 / N real 0.07 mm hairs it stands for would. */
  fibre?: number;
}
export interface HairShadowMap { at: (rotated: Vec3) => number }
/** Hair fibre coverage in front of a rotated point along a direction (a deep opacity map), in real-head units. */
export type HairDensityMap = ((rotated: Vec3) => number) & { total?: (rotated: Vec3) => number };

/** Marschner-style longitudinal lobe. */
const lobe = (x: number, mu: number, beta: number) => Math.exp(-((x - mu) ** 2) / (2 * beta * beta)) / (beta * Math.sqrt(2 * Math.PI));

/** Rotate a groom's points into the camera frame once (shared by the opacity maps and the renderer). */
/** Moving air on hair, for a frame at time `t` (s). */
export interface HairMotion {
  /** Seconds into the motion; the same `t` gives the same frame. */
  t: number;
  /** Mean wind speed at the head, m/s (0 still air; 1 a light air; 3 a gentle breeze; 6 a fresh breeze). Default 2. */
  wind?: number;
  /** Where the wind blows toward, degrees about the vertical (0 toward the figure's back, 90 toward its left). Default 0. */
  direction?: number;
  /** Gustiness: how much the speed swings about its mean (0–0.8). Default 0.35. */
  gust?: number;
  /** Loop length (s): every rate is rounded to a whole number of cycles in it, so frame `period` matches frame 0. */
  period?: number;
}

/**
 * Hair in moving air, one frame (`moveHair`): each strand bends from its root like a light cantilever loaded by the
 * wind's drag, so its sideways travel grows with the square of the distance from the root and with the square of the
 * wind speed (a 25 cm lock moves its end about 3 cm in a 3 m/s breeze; a 5 cm crop barely moves). Gusts swing the
 * speed at two slow rates (about 0.6 and 1.7 Hz); a wave runs down each lock (about 15 cm long, so ends lag their
 * roots), and every lock has its own phase, so locks move together but not in step. Strands keep their lengths
 * (each point is pulled back to its segment's length from the one before) and are pushed out of the head, the face,
 * the neck, the shoulders and the chest. Deterministic for a time `t`.
 */
export function moveHair(groom: HairGroom, head: HairHead, m: HairMotion): HairGroom {
  const U0 = Math.max(0, m.wind ?? 2), g = Math.min(0.8, Math.max(0, m.gust ?? 0.35)), t = m.t;
  if (U0 <= 0) return groom;
  const az = ((m.direction ?? 0) * Math.PI) / 180, W: Vec3 = nrm([Math.sin(az), 0.12, -Math.cos(az)]);
  const hz = (f: number) => (m.period ? Math.max(1, Math.round(f * m.period)) / m.period : f);
  const U = U0 * (1 + g * (0.65 * Math.sin(2 * Math.PI * hz(0.6) * t) + 0.35 * Math.sin(2 * Math.PI * hz(1.7) * t + 1.3)));
  const fWave = hz(1.1), fLat = hz(0.8);
  const K = 3e-5, LAMBDA = 150, P = groom.points, out = new Float32Array(P.length);
  const side = nrm(cross([0, 1, 0], W));
  for (let s = 0; s < groom.starts.length; s++) {
    const st = groom.starts[s], n = groom.counts[s];
    if (n < 2) { out.set(P.subarray(st * 3, (st + n) * 3), st * 3); continue; }
    let L = 0;
    for (let k = 1; k < n; k++) L += Math.hypot(P[(st + k) * 3] - P[(st + k - 1) * 3], P[(st + k) * 3 + 1] - P[(st + k - 1) * 3 + 1], P[(st + k) * 3 + 2] - P[(st + k - 1) * 3 + 2]);
    const ph = 2 * Math.PI * ((groom.lock?.[s] ?? groom.jitter[s]) + 0.3 * groom.jitter[s]);
    const tip = Math.min(0.25 * L, K * U * U * L * L);
    out[st * 3] = P[st * 3]; out[st * 3 + 1] = P[st * 3 + 1]; out[st * 3 + 2] = P[st * 3 + 2];
    let sArc = 0;
    for (let k = 1; k < n; k++) {
      const i = (st + k) * 3, j = (st + k - 1) * 3, seg = Math.hypot(P[i] - P[j], P[i + 1] - P[j + 1], P[i + 2] - P[j + 2]);
      sArc += seg;
      const u = sArc / Math.max(1, L), wave = Math.sin(2 * Math.PI * (fWave * t - sArc / LAMBDA) + ph);
      // hair lying on the head, the shoulders or the chest is held there by friction: it moves much less
      const rest: Vec3 = [P[i], P[i + 1], P[i + 2]], held = touching(head, rest) ? 0.3 : 1;
      const d = held * tip * u * u * (0.82 + 0.18 * wave), lat = held * tip * u * u * 0.12 * Math.sin(2 * Math.PI * (fLat * t - sArc / LAMBDA) + ph * 1.7);
      let q: Vec3 = [P[i] + W[0] * d + side[0] * lat, P[i + 1] + W[1] * d + side[1] * lat, P[i + 2] + W[2] * d + side[2] * lat];
      // keep the segment's length from the point before (the hair does not stretch)
      const a: Vec3 = [out[j], out[j + 1], out[j + 2]], v = sub(q, a), lv = len(v) || 1;
      q = add(a, sc(v, seg / lv));
      q = keepOut(head, q, rest);
      out[i] = q[0]; out[i + 1] = q[1]; out[i + 2] = q[2];
    }
  }
  return { ...groom, points: out };
}

/** Whether a resting hair point lies on the head, the shoulders or the chest (within a few millimetres). */
function touching(H: HairHead, p: Vec3): boolean {
  if (ellipsoidAt(H, p, 5).inside) return true;
  if (H.shoulderTop) { const top = H.shoulderTop(p[0]); if (p[1] < top + 6 && p[1] > top - 4 && Math.abs(p[2] - H.neck.cz) < 70) return true; }
  if (H.chestFront && p[1] < H.shoulderY) { const cf = H.chestFront(p[0]); if (p[2] < cf + 6 && p[2] > cf - 4) return true; }
  return false;
}

/**
 * A point pushed out of the head (2 mm off the scalp), the face and the neck, and back onto the shoulders or chest
 * when its resting point lay on them (hair hanging in front of or behind the shoulders is not lifted onto them).
 */
function keepOut(H: HairHead, q0: Vec3, rest: Vec3): Vec3 {
  let q = q0;
  const e = ellipsoidAt(H, q, 2);
  if (e.inside) q = e.surf;
  if (H.faceFront && q[1] > H.chinY - 5 && q[1] < H.hairlineY + 20) {
    const ff = H.faceFront(q[0], q[1]);
    if (Number.isFinite(ff) && q[2] < ff + 1.5 && q[2] > ff - 30) q = [q[0], q[1], ff + 1.5];
  }
  if (q[1] < H.chinY + 10 && q[1] > H.shoulderY - 20) {
    const dx = q[0] / H.neck.rx, dz = (q[2] - H.neck.cz) / H.neck.rz, r = Math.hypot(dx, dz);
    if (r < 1.04) { const k = 1.04 / Math.max(1e-6, r); q = [q[0] * k, q[1], H.neck.cz + (q[2] - H.neck.cz) * k]; }
  }
  if (H.shoulderTop) { const top = H.shoulderTop(q[0]) + 1.5; if (rest[1] >= top + 0.5 && q[1] < top && q[1] > top - 25 && Math.abs(q[2] - H.neck.cz) < 70) q = [q[0], top, q[2]]; }
  if (H.chestFront && q[1] < H.shoulderY) { const cf = H.chestFront(q[0]) + 1.5; if (rest[2] >= cf + 0.5 && q[2] < cf && q[2] > cf - 40) q = [q[0], q[1], cf]; }
  return q;
}

export function rotateGroom(groom: HairGroom, rotate: (p: Vec3) => Vec3): Float32Array {
  const P = groom.points, n = P.length / 3, R = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const r = rotate([P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]); R[i * 3] = r[0]; R[i * 3 + 1] = r[1]; R[i * 3 + 2] = r[2]; }
  return R;
}
/**
 * A deep opacity map of rotated hair along `dir` (Yuksel & Keyser 2008): eight layers behind the first hair each texel
 * sees, splatted and read bilinearly. Each drawn strand stands for 100,000 / N real hairs of 0.07 mm, so the coverage
 * does not change with the number drawn. `soften` blurs it by texels (soft shadows on skin).
 */
export function hairDensityMap(groom: HairGroom, R: Float32Array, dir: Vec3, res = 320, slab = 3.5, soften = 0): HairDensityMap {
  const nPts = R.length / 3, fibreEff = (HAIR_PHYSICS.fibreDiameter.value * HAIR_PHYSICS.scalpCount.value) / Math.max(1, groom.starts.length);
  const up: Vec3 = Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], ax = nrm(cross(up, dir)), ay = cross(dir, ax);
  let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
  for (let i = 0; i < nPts; i++) { const p: Vec3 = [R[i * 3], R[i * 3 + 1], R[i * 3 + 2]], x = dot(p, ax), y = dot(p, ay); minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
  const span = Math.max(maxx - minx, maxy - miny) + 8, cell = span / res, K = 8;
  let first = new Float32Array(res * res).fill(Infinity);
  let layers = new Float32Array(res * res * K);
  const coord = (p: Vec3) => [(dot(p, ax) - minx + 4) / cell - 0.5, (dot(p, ay) - miny + 4) / cell - 0.5, -dot(p, dir)] as const;
  for (let i = 0; i < nPts; i++) {
    const [x, y, d] = coord([R[i * 3], R[i * 3 + 1], R[i * 3 + 2]]), xi = Math.floor(x), yi = Math.floor(y);
    for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) { const X = xi + k, Y = yi + j; if (X >= 0 && Y >= 0 && X < res && Y < res && d < first[Y * res + X]) first[Y * res + X] = d; }
  }
  // each segment adds its projected fibre area to the layer at its depth, shared bilinearly between four texels
  for (let s = 0; s < groom.starts.length; s++) {
    const st = groom.starts[s], c = groom.counts[s];
    for (let j = 1; j < c; j++) {
      const a = st + j - 1, b = st + j, pa: Vec3 = [R[a * 3], R[a * 3 + 1], R[a * 3 + 2]], pb: Vec3 = [R[b * 3], R[b * 3 + 1], R[b * 3 + 2]];
      const [x, y, d] = coord(sc(add(pa, pb), 0.5)), xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, area = (len(sub(pb, pa)) * fibreEff) / (cell * cell);
      for (let jj = 0; jj < 2; jj++) for (let kk = 0; kk < 2; kk++) {
        const X = xi + kk, Y = yi + jj;
        if (X < 0 || Y < 0 || X >= res || Y >= res) continue;
        const t = Y * res + X, l = clamp(Math.floor((d - first[t]) / slab), 0, K - 1);
        layers[t * K + l] += area * (kk ? fx : 1 - fx) * (jj ? fy : 1 - fy);
      }
    }
  }
  for (let t = 0; t < res * res; t++) for (let l = 1; l < K; l++) layers[t * K + l] += layers[t * K + l - 1];
  for (let pass = 0; pass < soften; pass++) {
    // texels just outside the hair take their neighbours' first depth, so soft shadows reach past the edge
    const nf = first.slice();
    for (let y = 0; y < res; y++) for (let x = 0; x < res; x++) {
      if (Number.isFinite(first[y * res + x])) continue;
      let m = Infinity;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const X = x + i, Y = y + j; if (X >= 0 && Y >= 0 && X < res && Y < res) m = Math.min(m, first[Y * res + X]); }
      nf[y * res + x] = m;
    }
    first = nf;
    const nx = new Float32Array(layers.length);
    for (let y = 0; y < res; y++) for (let x = 0; x < res; x++) for (let l = 0; l < K; l++) {
      let s = 0, n = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const X = x + i, Y = y + j; if (X < 0 || Y < 0 || X >= res || Y >= res) continue; s += layers[(Y * res + X) * K + l]; n++; }
      nx[(y * res + x) * K + l] = s / n;
    }
    layers = nx;
  }
  const texel = (t: number, d: number) => {
    if (!Number.isFinite(first[t])) return 0;
    const l = (d - first[t]) / slab;
    if (l <= 0) return 0;
    const li = Math.min(K - 1, Math.floor(l)), f = l - li, before = li > 0 ? layers[t * K + li - 1] : 0;
    return before + (layers[t * K + li] - before) * Math.min(1, f);
  };
  const fn = ((p: Vec3) => {
    const [x, y, d] = coord(p), xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    let s = 0;
    for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) { const X = clamp(xi + k, 0, res - 1), Y = clamp(yi + j, 0, res - 1); s += texel(Y * res + X, d) * (k ? fx : 1 - fx) * (j ? fy : 1 - fy); }
    return s;
  }) as HairDensityMap;
  // the whole column of hair along the direction at a point (front to back): how much hair there is to scatter in
  fn.total = (p: Vec3) => {
    const [x, y] = coord(p), xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    let s = 0;
    for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) { const X = clamp(xi + k, 0, res - 1), Y = clamp(yi + j, 0, res - 1); s += layers[(Y * res + X) * K + K - 1] * (k ? fx : 1 - fx) * (j ? fy : 1 - fy); }
    return s;
  };
  return fn;
}

/**
 * Draw groomed hair into a raster (linear RGB): strands far to near, hidden behind solid surfaces, lit by the key with
 * self-shadowing from a deep opacity map, multiple scattering in the hair's colour, sky light occluded by the hair in
 * front. Returns the key light's hair shadow, so skin under the hair can be darkened.
 */
export function renderHairStrands(out: Raster, groom: HairGroom, view: HairRenderView, o: HairRenderOptions & { rotated?: Float32Array; keyMap?: HairDensityMap }): HairShadowMap {
  const w = out.width, h = out.height, P = groom.points, nPts = P.length / 3;
  const fibre = o.fibre ?? clamp((HAIR_PHYSICS.fibreDiameter.value * HAIR_PHYSICS.scalpCount.value) / Math.max(1, groom.starts.length), 0.07, 0.3);
  const R = o.rotated ?? rotateGroom(groom, view.rotate), S = new Float32Array(nPts * 3);
  for (let i = 0; i < nPts; i++) { const s = view.project([P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]); S[i * 3] = s[0]; S[i * 3 + 1] = s[1]; S[i * 3 + 2] = s[2]; }
  const L = nrm([o.key.dir[0], o.key.dir[1], o.key.dir[2]]);
  const keyDom = o.keyMap ?? hairDensityMap(groom, R, L), viewDom = hairDensityMap(groom, R, nrm(view.camera), 224, 3);
  const Lf = o.fill ? nrm([o.fill.dir[0], o.fill.dir[1], o.fill.dir[2]]) : null, Lr = o.rim ? nrm([o.rim.dir[0], o.rim.dir[1], o.rim.dir[2]]) : null;
  // ---- colour of the fibres ----
  const sig = hairSigmaA(o.eumelanin ?? 1.3, o.pheomelanin ?? 0.15), alb = hairAlbedo(sig), white = hairAlbedo(hairSigmaA(0.02, 0.01));
  const aR = (HAIR_PHYSICS.highlights.alphaR * Math.PI) / 180, bR = (HAIR_PHYSICS.highlights.betaR * Math.PI) / 180;
  const sky = o.sky ?? [0.2, 0.215, 0.25];
  const { direct: kDense, multiple: kMs } = HAIR_SHADOW;
  // ---- segments: shade, then sort far → near ----
  const nSeg = nPts - groom.starts.length, segA = new Uint32Array(nSeg), segCol = new Float32Array(nSeg * 3), segDepth = new Float32Array(nSeg), segT = new Float32Array(nSeg), segW = new Float32Array(nSeg);
  let q = 0, dMin = Infinity, dMax = -Infinity;
  for (let s = 0; s < groom.starts.length; s++) {
    const st = groom.starts[s], c = groom.counts[s], jt = groom.jitter[s], fine = (jt < 0.5 ? 0.4 + 0.6 * sst(0, 4, groom.edge ? groom.edge[s] : 9) : 1) * (groom.width ? groom.width[s] : 1);
    // locks catch the light a little differently from one another
    const lockTone = 0.9 + 0.2 * (groom.lock ? groom.lock[s] : 0.5);
    const isGrey = (o.grey ?? 0) > 0 && jt < (o.grey ?? 0);
    const base0 = (isGrey ? white : alb).map(v => v * (0.88 + 0.24 * jt) * lockTone) as RGB, sigS = isGrey ? hairSigmaA(0.02, 0.01) : sig;
    for (let j = 1; j < c; j++) {
      const a = st + j - 1, b = st + j, pa: Vec3 = [R[a * 3], R[a * 3 + 1], R[a * 3 + 2]], pb: Vec3 = [R[b * 3], R[b * 3 + 1], R[b * 3 + 2]], m = sc(add(pa, pb), 0.5);
      const t = nrm(sub(pb, pa)), v = nrm(sub(view.camera, m)), t01 = j / (c - 1);
      // older hair toward the ends is a little lighter (weathered cuticle)
      const base = base0.map(x => x * (1 + 0.1 * t01)) as RGB, lum = 0.2126 * base[0] + 0.7152 * base[1] + 0.0722 * base[2];
      const dKey = keyDom(m), dView = viewDom(m), sh = o.headShadow ? o.headShadow(m) : 1;
      // light scattered on through the hair needs hair to scatter in: a thin fringe or a lone strand has little behind it
      // (dual scattering's global part grows with the hair along the light), so it is not lit like the inside of the mass
      const vol = keyDom.total ? 1 - Math.exp(-0.35 * keyDom.total(m)) : 1;
      const Tkey = Math.exp(-kDense * dKey) * sh, Tms = Math.exp(-kMs * dKey) * (0.4 + 0.6 * sh), occ = Math.exp(-0.25 * dView);
      // longitudinal angles
      const si = clamp(dot(L, t), -1, 1), sr = clamp(dot(v, t), -1, 1), thI = Math.asin(si), thR = Math.asin(sr), thH = (thI + thR) / 2, thD = (thR - thI) / 2;
      const lp = nrm(sub(L, sc(t, si))), vp = nrm(sub(v, sc(t, sr))), phi = Math.acos(clamp(dot(lp, vp), -1, 1));
      const cosD = Math.cos(thD), fr = 0.046 + (1 - 0.046) * Math.pow(1 - cosD * Math.cos(phi / 2), 5);
      // the key is a softbox about 20° across, not a point: its reflection (R) is a broad, bright, colourless band — on dark
      // hair the brightest thing in the hair (the lobe widened by the light's size, its energy kept)
      const MR = lobe(thH, aR, Math.hypot(bR, 0.09)), MTT = lobe(thH, -aR / 2, bR / 2), MTRT = lobe(thH, -1.5 * aR, bR * 2);
      const NR = 0.25 * Math.cos(phi / 2) * fr * 2.6, path = 2 / Math.max(0.3, cosD);
      const diff = Math.sqrt(Math.max(0, 1 - si * si));
      // the fill's own sheen keeps the shadow side reading as hair
      let specF = 0;
      if (Lf) { const sf = clamp(dot(Lf, t), -1, 1); specF = lobe((Math.asin(sf) + thR) / 2, aR, bR * 1.6) * 0.06; }
      const col: number[] = [0, 0, 0];
      for (let k = 0; k < 3; k++) {
        const aTT = Math.exp(-sigS[k] * path), aTRT = Math.exp(-sigS[k] * path * 2);
        const NTT = (1 - fr) * (1 - fr) * aTT * Math.exp(-((Math.PI - phi) ** 2) / (2 * 0.35 * 0.35)), NTRT = (1 - fr) * (1 - fr) * fr * aTRT * (0.6 + 0.8 * Math.exp(-((phi - 0.7) ** 2) / 0.2));
        const spec = (MR * NR + MTT * NTT + MTRT * NTRT) / Math.max(0.25, cosD * cosD);
        // multiple scattering: light diffused through the hair volume returns in the hair's colour, deeper than direct light reaches
        // (each bounce multiplies by the fibre's colour, but much of the light goes forward through few fibres: the volume
        // is a little more saturated than one fibre, not as much as a square)
        const ms = base[k] * (0.5 * base[k] + 0.5 * lum) * 1.6 * (0.45 + 0.55 * diff) * Tms * (0.25 + 0.75 * vol) + base[k] * 0.35 * diff * Tkey;
        // sky and the light bounced round inside the hair and off the skin reach even the inner layers
        let cc = o.key.colour[k] * (spec * Tkey * 0.75 + ms) + sky[k] * base[k] * (0.3 + 0.7 * occ) * 0.9;
        if (o.fill && Lf) cc += o.fill.colour[k] * (base[k] * Math.sqrt(Math.max(0, 1 - dot(Lf, t) ** 2)) * 0.7 + specF * (0.6 + base[k])) * occ;
        if (o.rim && Lr) { const sr2 = dot(Lr, t); cc += o.rim.colour[k] * lobe(Math.asin(clamp((sr2 + sr) / 2, -1, 1)), 0, 0.25) * 0.08 * base[k] * Math.exp(-kMs * dKey * 0.5); }
        col[k] = cc;
      }
      const dep = (S[a * 3 + 2] + S[b * 3 + 2]) / 2;
      segA[q] = a; segCol[q * 3] = col[0]; segCol[q * 3 + 1] = col[1]; segCol[q * 3 + 2] = col[2]; segDepth[q] = dep; segT[q] = t01; segW[q] = fine; q++;
      if (dep < dMin) dMin = dep;
      if (dep > dMax) dMax = dep;
    }
  }
  // far → near by a counting sort on depth
  const NB = 16384, cnt = new Uint32Array(NB + 1), bucket = (d: number) => clamp(Math.floor(((d - dMin) / Math.max(1e-6, dMax - dMin)) * (NB - 1)), 0, NB - 1);
  for (let i = 0; i < q; i++) cnt[bucket(segDepth[i]) + 1]++;
  for (let b = 1; b <= NB; b++) cnt[b] += cnt[b - 1];
  const order = new Uint32Array(q);
  for (let i = 0; i < q; i++) order[cnt[bucket(segDepth[i])]++] = i;
  // ---- draw: thin anti-aliased lines with depth test against solid surfaces ----
  const px = view.pxPerMm, solid = view.solidDepth;
  const plot = (x: number, y: number, cov: number, col: number[], depth: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h || cov <= 0) return;
    const i = y * w + x;
    if (solid && solid[i] > depth + 1.5) return;
    const a = Math.min(1, cov);
    out.rgb[i * 3] += (col[0] - out.rgb[i * 3]) * a; out.rgb[i * 3 + 1] += (col[1] - out.rgb[i * 3 + 1]) * a; out.rgb[i * 3 + 2] += (col[2] - out.rgb[i * 3 + 2]) * a;
    out.alpha[i] = Math.max(out.alpha[i], a);
  };
  for (let oi = 0; oi < q; oi++) {
    const qi = order[oi], a = segA[qi], b = a + 1, x0 = S[a * 3], y0 = S[a * 3 + 1], x1 = S[b * 3], y1 = S[b * 3 + 1], depth = segDepth[qi], t = segT[qi];
    const col = [segCol[qi * 3], segCol[qi * 3 + 1], segCol[qi * 3 + 2]];
    // a fibre narrower than a pixel draws as a one-pixel line with partial coverage; it tapers at the tip
    const wpx = fibre * px * (1 - 0.6 * t * t) * segW[qi], alpha = Math.min(0.95, Math.max(0.12, wpx)) * (wpx < 1 ? 1 : 0.95);
    const dx = x1 - x0, dy = y1 - y0, steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
    const steep = Math.abs(dy) > Math.abs(dx);
    for (let k = 0; k <= steps; k++) {
      const u = k / steps, x = x0 + dx * u, y = y0 + dy * u;
      if (steep) { const xi = Math.floor(x - 0.5), f = x - 0.5 - xi, yi = Math.round(y); plot(xi, yi, alpha * (1 - f), col, depth); plot(xi + 1, yi, alpha * f, col, depth); }
      else { const yi = Math.floor(y - 0.5), f = y - 0.5 - yi, xi = Math.round(x); plot(xi, yi, alpha * (1 - f), col, depth); plot(xi, yi + 1, alpha * f, col, depth); }
      if (wpx > 1.6) { const ox = steep ? 1 : 0, oy = steep ? 0 : 1; plot(Math.round(x) + ox * 2, Math.round(y) + oy * 2, alpha * Math.min(1, wpx - 1.6), col, depth); }
    }
  }
  return { at: (rotated: Vec3) => Math.exp(-kDense * keyDom(rotated)) };
}
