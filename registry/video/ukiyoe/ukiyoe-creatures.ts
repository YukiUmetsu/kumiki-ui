/**
 * UKIYO1 creatures: the animals and spirits of Japanese folktales, drawn as a print would draw them (flat fills, a
 * fine key line, fur and feather hatching) and animated by small rigs that share the figure conventions.
 *
 * - Four-legged rig: fox (kitsune, up to nine tails and foxfire), tanuki (also upright, belly-drumming), dog, cat, rabbit.
 * - Bird rig: crane, heron, crow, pheasant, sparrow — standing, walking, pecking, dancing and flapping flight.
 * - Dragon: a serpentine body with travelling undulation, scales, belly plates, dorsal flames, clawed legs, whiskers.
 * Every pose is a pure function of the frame. Origin: ground point under the body; authored facing right.
 */
import type { Pt } from "./ukiyoe-core";
import { add, alongPath, carvedLine, clamp, clamp01, DEG, hash01, hashSigned, lerp, noise1, polar, polyD, polylineLength, smooth, smoothD, span } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD } from "./ukiyoe-prims";
import type { UkiyoeYokai } from "./ukiyoe-yokai";
import { drawYokai, UKIYOE_YOKAI } from "./ukiyoe-yokai";
import type { UkiyoeCritter } from "./ukiyoe-critters";
import { drawCritter, UKIYOE_CRITTERS } from "./ukiyoe-critters";
import type { UkiyoeFill, UkiyoePaint } from "./ukiyoe-pigments";
import { birdFlight, flightAt, glideStroke, wingStroke } from "../../anatomy/animal-flight";

export type UkiyoeSpecies = "fox" | "tanuki" | "dog" | "cat" | "rabbit" | "monkey" | "horse" | "nue" | "bear" | "boar" | "deer" | "ox" | "wolf" | "mouse" | "weasel" | "baku" | "ape" | "crane" | "heron" | "crow" | "pheasant" | "sparrow" | "hawk" | "oshidori" | "dragon" | UkiyoeYokai | UkiyoeCritter;
export const UKIYOE_SPECIES: readonly UkiyoeSpecies[] = ["fox", "tanuki", "dog", "cat", "rabbit", "monkey", "horse", "nue", "bear", "boar", "deer", "ox", "wolf", "mouse", "weasel", "baku", "ape", "crane", "heron", "crow", "pheasant", "sparrow", "hawk", "oshidori", "dragon", ...UKIYOE_YOKAI, ...UKIYOE_CRITTERS];
export type UkiyoeCreatureActionType = "walk" | "run" | "fly" | "hop" | "float" | "sit" | "stand" | "look" | "leap" | "howl" | "drum" | "peck" | "dance" | "coil" | "roar" | "transform" | "sleep"
  | "beckon" | "blow" | "vanish" | "appear" | "bow" | "fan" | "stretch";
/** Species that can also be seen square on (look.view "front" / "back"); the rest draw in profile or three-quarter. */
export const UKIYOE_SQUARE_VIEW_SPECIES: readonly UkiyoeSpecies[] = ["fox", "tanuki", "dog", "cat", "rabbit", "monkey", "horse", "nue", "bear", "boar", "deer", "ox", "wolf", "mouse", "weasel", "baku", "ape"];
export const UKIYOE_CREATURE_ACTIONS: readonly UkiyoeCreatureActionType[] = ["walk", "run", "fly", "hop", "float", "sit", "stand", "look", "leap", "howl", "drum", "peck", "dance", "coil", "roar", "transform", "sleep",
  "beckon", "blow", "vanish", "appear", "bow", "fan", "stretch"];

export interface UkiyoeCreatureLook {
  color?: UkiyoePaint;
  belly?: UkiyoePaint;
  dark?: UkiyoePaint;
  accent?: UkiyoePaint;
  /** Body length in px at scale 1 (dragons: total length). */
  size?: number;
  /** Fox: 1–9 tails (kyūbi). */
  tails?: number;
  /** Fox: floating foxfire orbs. */
  foxfire?: boolean;
  /** Tanuki: straw hat and sake bottle (the folk-statue tanuki). */
  hat?: boolean;
  bottle?: boolean;
  /** Dragon: the flaming pearl it chases. */
  pearl?: boolean;
  /** Horse: harness, saddle cloth and pack (a Tōkaidō packhorse). */
  tack?: boolean;
  /** Bakeneko: a hand towel (tenugui) knotted over the head, for the cats' night dance. */
  towel?: UkiyoePaint;
  /** Eyes that glow in the dark (the okuri-inu, the bakeneko). */
  glowEyes?: boolean;
  /** Carried in the mouth: Inari's messenger fox holds a key, a jewel or a scroll. */
  carry?: "key" | "jewel" | "scroll";
  /** Turned three-quarters toward the viewer: a foreshortened body, the far legs (and wing) set back and higher, the
   * head turned to us with a shorter muzzle and the far eye showing. Four-legged animals and birds. */
  view?: "profile" | "three-quarter" | "front" | "back";
}
export interface UkiyoeCreatureAction { type: UkiyoeCreatureActionType; start: number; end: number; to?: number; toY?: number; via?: readonly (readonly [number, number])[]; angle?: number; amount?: number; blend?: number }
export interface UkiyoeCreatureSpec { species: UkiyoeSpecies; look?: UkiyoeCreatureLook; actions?: readonly UkiyoeCreatureAction[]; facing?: "left" | "right" }
export interface DrawnCreature { prims: Prim[]; x: number; y: number; dir: 1 | -1 }

const TRAVEL = new Set<UkiyoeCreatureActionType>(["walk", "run", "fly", "hop", "float"]);

function weight(a: UkiyoeCreatureAction, frame: number): number {
  const b = Math.max(1, a.blend ?? 6);
  if (frame < a.start || frame > a.end + b) return 0;
  return Math.min(smooth((frame - a.start) / b), frame <= a.end ? 1 : smooth(1 - (frame - a.end) / b));
}
/** Root offset and travel state from walk/run/fly/hop segments (each starts where the previous left off). */
export function creatureTravel(actions: readonly UkiyoeCreatureAction[], frame: number): { x: number; y: number; dist: number; moving?: UkiyoeCreatureAction; dir: 1 | -1; lastDir: 1 | -1 } {
  let x = 0, y = 0, dist = 0, moving: UkiyoeCreatureAction | undefined, dir: 1 | -1 = 1;
  for (const a of actions) {
    if (!TRAVEL.has(a.type) || a.start > frame) continue;
    const tx = a.to ?? x, ty = a.toY ?? y, len = Math.max(1, a.end - a.start), u = clamp01((frame - a.start) / len);
    const accel = Math.min(.2, 10 / len), e = u < accel ? u * u / (2 * accel * (1 - accel)) : u > 1 - accel ? 1 - (1 - u) ** 2 / (2 * accel * (1 - accel)) : (u - accel / 2) / (1 - accel);
    if (tx !== x) dir = tx > x ? 1 : -1;
    const path: Pt[] = [[x, y], ...(a.via ?? []), [tx, ty]], total = polylineLength(path);
    if (frame <= a.end) { moving = a; dist += total * e; [x, y] = alongPath(path, total * e); break; }
    dist += total; x = tx; y = ty;
  }
  return { x, y, dist, moving, dir, lastDir: dir };
}

/** Blended action weights by type (0..1) and the time inside each. */
function actionState(actions: readonly UkiyoeCreatureAction[], frame: number) {
  const w: Partial<Record<UkiyoeCreatureActionType, { w: number; t: number; a: UkiyoeCreatureAction }>> = {};
  for (const a of actions) {
    const k = weight(a, frame);
    if (k > (w[a.type]?.w ?? 0)) w[a.type] = { w: k, t: frame - a.start, a };
  }
  return (type: UkiyoeCreatureActionType) => w[type] ?? { w: 0, t: 0, a: undefined };
}

// ---- Shared drawing helpers ------------------------------------------------------------------------------------------------------------

function limb(a: Pt, b: Pt, w0: number, w1: number): string {
  const tx = b[0] - a[0], ty = b[1] - a[1], len = Math.hypot(tx, ty) || 1, nx = -ty / len, ny = tx / len;
  return smoothD([[a[0] + nx * w0, a[1] + ny * w0], [b[0] + nx * w1, b[1] + ny * w1], [b[0] + tx / len * w1 * .7, b[1] + ty / len * w1 * .7], [b[0] - nx * w1, b[1] - ny * w1], [a[0] - nx * w0, a[1] - ny * w0], [a[0] - tx / len * w0 * .6, a[1] - ty / len * w0 * .6]], true, .3);
}
const rot = (p: Pt, deg: number, about: Pt): Pt => { const r = deg * DEG, c = Math.cos(r), s = Math.sin(r), x = p[0] - about[0], y = p[1] - about[1]; return [about[0] + x * c - y * s, about[1] + x * s + y * c]; };
// ---- Four-legged animals ------------------------------------------------------------------------------------------------------------------
//
// Built the way the animal prints of Koson and Kuniyoshi read: one continuous body (deep chest, tucked waist, a haunch
// and a shoulder that the legs grow out of), legs with real joints (the hind leg's hock angles back, the fore leg has a
// wrist and a short pastern, each paw has toes), fur shown by carved hairlines that follow the body and by tufted edges
// where the coat is long (ruff, cheeks, belly, breeches, tail), and a face with a stop, a muzzle, lips, nose leather and
// an eye with rim, iris, pupil and catchlight.

interface Beast {
  L: number; bh: number; leg: number; color: UkiyoePaint; belly: UkiyoePaint; dark: UkiyoePaint; head: number; tail: number; tailW: number;
  ears: "fox" | "round" | "cat" | "rabbit" | "dog" | "horse" | "monkey" | "mouse" | "boar"; snout: number;
  /** Deer antlers or an ox's horns; a boar's tusks; a fawn's white spots; the moon bear's white crescent on the chest. */
  horns?: "antler" | "ox"; tusks?: boolean; spots?: boolean; crescent?: boolean;
  /** The baku's elephant trunk hanging from the muzzle. */
  trunk?: boolean;
  /** Neck length (× the usual), head tilt (deg, + turns the face down), mane colour, hooves, bare-skinned face colour. */
  neck?: number; headTilt?: number; mane?: UkiyoePaint; hoof?: boolean; face?: UkiyoePaint;
  /** Tiger stripes over the coat and legs. */
  stripes?: boolean;
  /** Belly tuck (+ up at the waist, − sagging), chest depth, fur length (fraction of body height), hairline density. */
  tuck: number; chest: number; fur: number; hairs: number;
  /** Long-coat colour for ruff, cheeks and belly fringe; lower-leg colour ("stockings"); eye iris; slit pupil. */
  ruff: UkiyoePaint; stocking?: UkiyoePaint; iris: UkiyoePaint; slit: boolean; tailTip?: UkiyoePaint;
  /** Shoulders rising above the back line (fraction of body height): the boar's high withers. The back arching up
   * between shoulders and hips (the bear's). */
  withers?: number; arch?: number;
  /** Gait: ground covered per stride (× the usual; a hog takes short, quick strides) and how far the fore legs reach
   * (× the usual; a galloping bear flings them far ahead, after Muybridge's plates). */
  stride?: number; reach?: number;
  /** A crest of long stiff bristles standing along the nape and the spine (the boar's mane). */
  bristles?: UkiyoePaint;
  /** Lower legs and paws broader than usual (×), and long curved claws on the paws (the bear's). */
  paw?: number; claws?: boolean;
  /** The muzzle in another colour (the black bear's tan muzzle); the pale stripe along the jaw (the Japanese boar's). */
  muzzle?: UkiyoePaint; cheek?: UkiyoePaint;
}
type QuadSpecies = "fox" | "tanuki" | "dog" | "cat" | "rabbit" | "monkey" | "horse" | "nue" | "bear" | "boar" | "deer" | "ox" | "wolf" | "mouse" | "weasel" | "baku" | "ape";
const BEASTS: Readonly<Record<QuadSpecies, Beast>> = {
  fox: { L: 90, bh: 44, leg: 63, color: "tan", belly: "gofun", dark: "kogecha", head: 34, tail: 88, tailW: 36, ears: "fox", snout: 1.25,
    tuck: .2, chest: .14, fur: .2, hairs: 1, ruff: "gofun", stocking: "sumi", iris: "ki", slit: true, tailTip: "gofun" },
  tanuki: { L: 128, bh: 60, leg: 34, color: "cha", belly: "kincha", dark: "kogecha", head: 32, tail: 70, tailW: 32, ears: "round", snout: .75,
    tuck: -.12, chest: .06, fur: .26, hairs: 1.2, ruff: "kincha", stocking: "kogecha", iris: "kogecha", slit: false },
  dog: { L: 94, bh: 38, leg: 60, color: "kincha", belly: "gofun", dark: "cha", head: 30, tail: 38, tailW: 16, ears: "dog", snout: 1,
    tuck: .16, chest: .14, fur: .12, hairs: .8, ruff: "gofun", iris: "cha", slit: false },
  cat: { L: 94, bh: 32, leg: 46, color: "gofun", belly: "gofun", dark: "sumi", head: 27, tail: 80, tailW: 10, ears: "cat", snout: .6,
    tuck: .1, chest: .08, fur: .07, hairs: .6, ruff: "gofun", iris: "ki", slit: true },
  rabbit: { L: 86, bh: 48, leg: 26, color: "gofun", belly: "gofun", dark: "usuzumi", head: 26, tail: 14, tailW: 14, ears: "rabbit", snout: .6,
    tuck: 0, chest: .04, fur: .14, hairs: .8, ruff: "gofun", iris: "beni", slit: false },
  // The Japanese macaque of Koson's prints: shaggy grey-brown coat, a bare red face, small ears at the side, a stub tail.
  monkey: { L: 92, bh: 44, leg: 64, head: 30, tail: 16, tailW: 12, ears: "monkey", snout: .25, tuck: .06, chest: .1, fur: .12, hairs: 1.3,
    color: "usuzumi", belly: "usuzumi", dark: "kogecha", ruff: "usuzumi", iris: "cha", slit: false, face: "beni", headTilt: 6, neck: .2 },
  // A bay packhorse: long legs, a long arched neck and long head, black mane, tail and stockings, hooves.
  horse: { L: 200, bh: 76, leg: 118, head: 40, tail: 110, tailW: 30, ears: "horse", snout: 1.75, tuck: .1, chest: .18, fur: .03, hairs: .45,
    color: "cha", belly: "cha", dark: "kogecha", ruff: "cha", stocking: "sumi", iris: "kogecha", slit: false, neck: 2.3, headTilt: 48, mane: "sumi", hoof: true },
  // The nue of the Heike tale, after Sekien: a monkey's face, a tiger-striped body and legs, and a snake for a tail.
  nue: { L: 150, bh: 56, leg: 56, head: 32, tail: 170, tailW: 15, ears: "monkey", snout: .3, tuck: .14, chest: .12, fur: .1, hairs: 1,
    color: "ki", belly: "gofun", dark: "kogecha", ruff: "ki", iris: "ki", slit: false, face: "beni", neck: .35, headTilt: 4, stripes: true },
  // Legs and strides are set so the standing profile meets ANIM1's measured ranges (clearance under the chest about a
  // third of the shoulder height for the bear, nearly half for the boar; see `ukiyoeBeastLandmarks`). The fox, dog,
  // cat, wolf and ox were fitted the same way, toward the stylised edge of each range: they had been drawn long and low,
  // the ox nearly on the ground. The tanuki, the rabbit and the mouse are left as drawn: the folk tanuki's stoutness
  // and the crouching rabbit and mouse are deliberate.
  // The Asian black bear (tsukinowaguma) Kintarō rides, after Tanaka Yoshio's 1875 plate, Hokusai and Kuniyoshi: a heavy
  // barrel of a body on thick legs, the head carried low, a broad skull with big round ears and a short tan muzzle, a
  // shaggy ruff round the neck, the white crescent on the chest, flat broad paws with long curved claws.
  bear: { L: 158, bh: 76, leg: 79, color: "sumi", belly: "sumi", dark: "sumi", head: 38, tail: 10, tailW: 10, ears: "round", snout: .85, tuck: -.06, chest: .16, fur: .12, hairs: 1.8,
    ruff: "sumi", iris: "kogecha", slit: false, crescent: true, neck: -.55, headTilt: 18, withers: .06, arch: .1, paw: 1.7, claws: true, muzzle: "cha", reach: 1.45, stride: 1.4 },
  // The Japanese wild boar, after the Fauna Japonica plate, Morikuni's running boars and Kuniyoshi's: heavy forequarters
  // under high withers and a crest of bristles, a long deep wedge of a head ending in the flat snout disc, small eye, small
  // pointed ears, the lower tusk curving up out of the lip, the pale stripe along the jaw that names it (leucomystax),
  // slender legs on cloven hooves, a thin tail with a tuft.
  boar: { L: 150, bh: 60, leg: 90, color: "cha", belly: "cha", dark: "kogecha", head: 32, tail: 22, tailW: 5, ears: "boar", snout: 1.2, tuck: .02, chest: .14, fur: .03, hairs: 2,
    ruff: "cha", iris: "kogecha", slit: false, tusks: true, headTilt: 12, neck: .55, hoof: true, withers: .16, bristles: "kogecha", cheek: "gofun", tailTip: "kogecha", stride: 1.4 },
  // The sika deer of Nara and the old poems: slender legs and hooves, a long neck, white rump and spots, branched antlers.
  deer: { L: 140, bh: 46, leg: 86, color: "kincha", belly: "gofun", dark: "cha", head: 28, tail: 14, tailW: 10, ears: "horse", snout: 1.1, tuck: .18, chest: .12, fur: .05, hairs: .5,
    ruff: "gofun", iris: "kogecha", slit: false, horns: "antler", spots: true, hoof: true, neck: 1.6, headTilt: 22 },
  // The black ox of Tenjin's shrines and the cowherd's tale: massive, a deep dewlap, short curved horns, hooves.
  ox: { L: 157, bh: 57, leg: 90, color: "sumi", belly: "sumi", dark: "sumi", head: 46, tail: 64, tailW: 8, ears: "horse", snout: .72, tuck: 0, chest: .3, fur: .03, hairs: .4,
    ruff: "sumi", iris: "kogecha", slit: false, horns: "ox", hoof: true, neck: -.25, headTilt: 50, paw: 1.5 },
  // The Japanese wolf (the okuri-inu): leaner and longer-legged than the dog, grey with a pale belly and a thick tail.
  wolf: { L: 109, bh: 40, leg: 67, color: "usuzumi", belly: "gofun", dark: "sumi", head: 32, tail: 56, tailW: 22, ears: "dog", snout: 1.3, tuck: .22, chest: .16, fur: .18, hairs: 1.1,
    ruff: "gofun", iris: "ki", slit: false },
  // The mouse of the rolling rice ball and the mouse's wedding: small, round-bodied, big thin ears, a long bare tail.
  // The weasel (itachi) of the kamaitachi: long and low, a slim neck, short legs, a bushy tail.
  weasel: { L: 110, bh: 30, leg: 22, color: "kincha", belly: "gofun", dark: "cha", head: 24, tail: 60, tailW: 14, ears: "round", snout: .9, tuck: .02, chest: .05, fur: .12, hairs: 1,
    ruff: "gofun", iris: "sumi", slit: false, neck: 1.2, headTilt: 4 },
  // The baku, eater of nightmares, after Hokusai's: a shaggy tawny coat, an elephant's curling trunk and tusks, clawed
  // paws and a bushy tail.
  baku: { L: 160, bh: 70, leg: 58, color: "kincha", belly: "kincha", dark: "kogecha", head: 38, tail: 70, tailW: 26, ears: "round", snout: 1, tuck: .04, chest: .14, fur: .26, hairs: 1.7,
    ruff: "kincha", iris: "ki", slit: false, trunk: true, tusks: true, neck: .5, headTilt: 14 },
  // The great mountain ape of the satori and yamabiko tales: big, long-haired, brown, a bare red face.
  ape: { L: 120, bh: 66, leg: 82, head: 40, tail: 10, tailW: 10, ears: "monkey", snout: .3, tuck: .06, chest: .12, fur: .3, hairs: 1.6,
    color: "cha", belly: "kincha", dark: "kogecha", ruff: "kincha", iris: "ki", slit: false, face: "beni", headTilt: 6, neck: .2 },
  // No neck to speak of: the head runs straight on from the body (neck −.6).
  mouse: { L: 60, bh: 30, leg: 14, color: "usuzumi", belly: "gofun", dark: "kogecha", head: 22, tail: 72, tailW: 3, ears: "mouse", snout: .9, tuck: 0, chest: .05, fur: .05, hairs: .6,
    ruff: "gofun", iris: "sumi", slit: false, neck: -.6, headTilt: 8 },
};

const lerp2 = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
/** Densify a polyline through a Catmull-Rom spline (closed: wraps around). */
function smoothPts(points: readonly Pt[], per = 6, closed = true): Pt[] {
  const n = points.length, out: Pt[] = [], at = (i: number) => closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  if (!closed) out.push(points[n - 1]);
  return out;
}
/** A ribbon along a spine, tapering from w0 to w1, as a closed path. */
function ribbonQ(spine: readonly Pt[], w0: number, w1: number): string {
  const L: Pt[] = [], Rr: Pt[] = [];
  spine.forEach((q, i) => {
    const a = spine[Math.max(0, i - 1)], c = spine[Math.min(spine.length - 1, i + 1)], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, w = lerp(w0, w1, i / Math.max(1, spine.length - 1)) / 2;
    L.push([q[0] - (c[1] - a[1]) / l * w, q[1] + (c[0] - a[0]) / l * w]); Rr.push([q[0] + (c[1] - a[1]) / l * w, q[1] - (c[0] - a[0]) / l * w]);
  });
  return smoothD([...L, ...Rr.reverse()], true, .35);
}
/** Tangent (unit) of a polyline at arc length s. */
function tangentAt(pts: readonly Pt[], s: number): Pt {
  const L = polylineLength(pts), a = alongPath(pts, Math.max(0, s - 1.5)), b = alongPath(pts, Math.min(L, s + 1.5)), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
}
/**
 * A tufted fur edge along an open contour: a band whose outer side breaks into pointed tufts lying along the contour
 * (`lay` 1 with its direction, −1 against it). `side` 1 puts the tufts on the left of travel (y down: outward for a
 * contour running clockwise). Returns the band and the hairlines that run up each tuft.
 */
function furEdge(pts: readonly Pt[], depth: number, side: 1 | -1, lay: number, seed: number, every = 1): { band: string; hairs: string } {
  const L = polylineLength(pts);
  if (L < 2 || depth < .4) return { band: "", hairs: "" };
  const n = Math.max(3, Math.round(L / Math.max(2.5, depth * .9 * every))), inner: Pt[] = [], outer: Pt[] = [], hairs: string[] = [];
  for (let i = 0; i <= n; i++) {
    const s = L * i / n, q = alongPath(pts, s), t = tangentAt(pts, s), nx = -t[1] * side, ny = t[0] * side;
    inner.push([q[0] - nx * depth * .35, q[1] - ny * depth * .35]);
    if (i === n) { outer.push(q); break; }
    const d = depth * (.55 + .6 * hash01(seed, i, 301)) * Math.sin(Math.PI * Math.min(1, (i + .5) / n * 1.15)) ** .3;
    const tip: Pt = [q[0] + nx * d + t[0] * lay * d * .7, q[1] + ny * d + t[1] * lay * d * .7];
    const s2 = L * (i + .55) / n, q2 = alongPath(pts, s2), notch: Pt = [q2[0] + nx * d * .12, q2[1] + ny * d * .12];
    outer.push(q, tip, notch);
    hairs.push(`M${(q[0] - nx * depth * .2).toFixed(1)} ${(q[1] - ny * depth * .2).toFixed(1)}Q${(q[0] + nx * d * .45).toFixed(1)} ${(q[1] + ny * d * .45).toFixed(1)} ${(tip[0] - (t[0] * lay * d * .15)).toFixed(1)} ${(tip[1] - t[1] * lay * d * .15).toFixed(1)}`);
  }
  return { band: polyD([...outer, ...inner.reverse()]), hairs: hairs.join("") };
}
/**
 * Carved hairlines filling the coat between a back line and a belly line (both running rump → chest): short, slightly
 * curved strokes lying toward the tail and turning downward toward the belly, denser along the back.
 */
function furField(back: readonly Pt[], belly: readonly Pt[], count: number, len: number, seed: number): string {
  const Lb = polylineLength(back), Lu = polylineLength(belly), out: string[] = [];
  for (let i = 0; i < count; i++) {
    const u = hash01(seed, i, 311), v = hash01(seed, i, 312) ** 1.3 * .92 + .04;
    const a = alongPath(back, Lb * u), b = alongPath(belly, Lu * u), p: Pt = [lerp(a[0], b[0], v), lerp(a[1], b[1], v)];
    const t = tangentAt(back, Lb * u), ang = Math.atan2(-t[1], -t[0]) + (v * .6 + hashSigned(seed, i, 313) * .25) * -Math.sign(t[0] || 1);
    const l = len * (.6 + .7 * hash01(seed, i, 314)) * (1 - v * .3), bend = hashSigned(seed, i, 315) * .35;
    const e: Pt = [p[0] + Math.cos(ang) * l, p[1] + Math.sin(ang) * l], m: Pt = [p[0] + Math.cos(ang + bend) * l * .5, p[1] + Math.sin(ang + bend) * l * .5];
    out.push(`M${p[0].toFixed(1)} ${p[1].toFixed(1)}Q${m[0].toFixed(1)} ${m[1].toFixed(1)} ${e[0].toFixed(1)} ${e[1].toFixed(1)}`);
  }
  return out.join("");
}
/** Hairlines along a limb or tail spine: strokes lying down the length, staggered across the width. */
function furAlong(spine: readonly Pt[], width: number, count: number, len: number, seed: number): string {
  const L = polylineLength(spine), out: string[] = [];
  for (let i = 0; i < count; i++) {
    const s = L * hash01(seed, i, 321), q = alongPath(spine, s), t = tangentAt(spine, s), off = hashSigned(seed, i, 322) * width * .42;
    const p: Pt = [q[0] - t[1] * off, q[1] + t[0] * off], l = len * (.6 + .6 * hash01(seed, i, 323));
    out.push(`M${p[0].toFixed(1)} ${p[1].toFixed(1)}l${(t[0] * l + t[1] * off * .15).toFixed(1)} ${(t[1] * l - t[0] * off * .15).toFixed(1)}`);
  }
  return out.join("");
}

/**
 * A contour whose long-haired stretches break into tufts: `depth(u)` (px, by arc-length fraction 0..1) is the hair
 * length along the contour; where it is above zero the edge zigzags out into pointed tufts lying along `lay(u)` (1 with
 * the contour's direction, −1 against it). `side` 1 puts the tufts on the left of travel. Returns the new polyline.
 */
function tufted(pts: readonly Pt[], depth: (u: number) => number, side: 1 | -1, lay: (u: number) => number, seed: number, closed = false): Pt[] {
  const ring = closed ? [...pts, pts[0]] : pts, L = polylineLength(ring), out: Pt[] = [];
  const step = Math.max(2, Math.min(9, L / 90));
  let s = 0, i = 0;
  while (s < L) {
    const u = s / L, d = depth(u), q = alongPath(ring, s);
    if (d < .8) { out.push(q); s += step * 2; continue; }
    // A lock of hair: uneven length (now and then a long one), its front edge bowed, its tip lying along the coat.
    const r = hash01(seed, i, 331), t = tangentAt(ring, s), nx = -t[1] * side, ny = t[0] * side, ly = lay(u);
    const h = d * (r > .86 ? 1.25 : .35 + .55 * hash01(seed, i, 333)), w = Math.max(step * .7, d * (.35 + .4 * hash01(seed, i, 332)));
    out.push(q, [q[0] + nx * h * .55 + t[0] * ly * h * .15, q[1] + ny * h * .55 + t[1] * ly * h * .15], [q[0] + nx * h + t[0] * ly * h * .8, q[1] + ny * h + t[1] * ly * h * .8]);
    s += w; i++;
  }
  if (!closed) out.push(ring[ring.length - 1]);
  return out;
}

/** Glowing eyes, a towel knotted over the head, something carried in the mouth (profile head units). */
function headExtras(look: UkiyoeCreatureLook, P: (x: number, y: number) => Pt, hs: number, ex: number, ey: number, sn: number, blink: boolean): Prim[] {
  const out: Prim[] = [];
  if (look.glowEyes && !blink) out.push({ t: "glow", cx: (ex + .02) * hs, cy: ey * hs, r: hs * .6, color: "ki", opacity: .7 }, { t: "fill", d: ellipseD((ex + .02) * hs, ey * hs, hs * .1, hs * .07), fill: "ki", opacity: .95 });
  if (look.towel) {
    // A tenugui over the head, knotted under the chin's side, its ends flapping: the bakeneko's dancing towel.
    out.push({ t: "fill", d: smoothD([P(-.72, -.2), P(-.6, -.62), P(-.15, -.82), P(.35, -.7), P(.5, -.42), P(.2, -.48), P(-.3, -.5), P(-.55, -.1)], true, .35), fill: look.towel, outline: 1, pattern: { type: "shima", color: "gofun", scale: .25, opacity: .6 } });
    out.push({ t: "fill", d: smoothD([P(-.6, -.1), P(-.95, .05), P(-1.05, .3), P(-.8, .2), P(-.62, .12)], true, .3), fill: look.towel, outline: .9 });
  }
  if (look.carry) {
    const m = P(.6 + .7 * sn, .2);
    if (look.carry === "key") out.push({ t: "stroke", d: `M${(m[0] - hs * .3).toFixed(1)} ${m[1].toFixed(1)}h${(hs * .6).toFixed(1)}`, color: "kin", width: hs * .07 }, { t: "fill", d: ellipseD(m[0] + hs * .35, m[1], hs * .1, hs * .1), fill: "kin", outline: .8 }, { t: "stroke", d: `M${(m[0] - hs * .3).toFixed(1)} ${m[1].toFixed(1)}v${(hs * .14).toFixed(1)}m${(hs * .08).toFixed(1)} 0v${(-hs * .1).toFixed(1)}`, color: "kin", width: hs * .05 });
    else if (look.carry === "jewel") out.push({ t: "glow", cx: m[0] + hs * .1, cy: m[1], r: hs * .5, color: "ki", opacity: .5 }, { t: "fill", d: smoothD([P(.6 + .7 * sn, .32), P(.48 + .7 * sn, .1), P(.7 + .7 * sn, -.18), P(.84 + .7 * sn, .1)], true, .45), fill: { type: "radial", stops: [[0, "gofun", 1], [1, "ki", 1]] }, outline: .9 });
    else out.push({ t: "fill", d: smoothD([P(.3 + .7 * sn, .12), P(1.0 + .7 * sn, .12), P(1.0 + .7 * sn, .3), P(.3 + .7 * sn, .3)], true, .1), fill: "gofun", outline: .9 }, { t: "fill", d: ellipseD(m[0] + hs * .38, m[1] + hs * .01, hs * .05, hs * .1), fill: "beni" });
  }
  return out;
}
/** Antlers (branched, from the crown up and back) or an ox's short curved horns, in profile (head units). */
function hornsSide(b: Beast, hs: number): Prim[] {
  const P = (x: number, y: number): Pt => [x * hs, y * hs];
  if (b.horns === "antler") {
    const beam = (x0: number, lean: number): string => {
      const main: Pt[] = [P(x0, -.55), P(x0 - .1 + lean, -1.1), P(x0 - .35 + lean, -1.7), P(x0 - .55 + lean, -2.15)];
      const tines = ([[1, .35, -.35], [2, .3, -.4], [2, -.2, -.25]] as const).map(([i, dx, dy]) => carvedLine([main[i], [main[i][0] + dx * hs, main[i][1] + dy * hs]], hs * .06, { taper: "end", minRatio: .3 }));
      return carvedLine(main, hs * .09, { taper: "end", minRatio: .4, smooth: true }) + tines.join("");
    };
    return [{ t: "fill", d: beam(-.3, -.05) + beam(-.05, .15), fill: { type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, "paper", 1]] }, outline: .9 }];
  }
  if (b.horns === "ox") return [{ t: "fill", d: smoothD([P(-.46, -.52), P(-.5, -.82), P(-.3, -1.05), P(.02, -1.1), P(.06, -1.0), P(-.18, -.92), P(-.28, -.74), P(-.22, -.5)], true, .35), fill: { type: "linear", angle: 90, stops: [[0, "ki", 1], [1, "gofun", 1]] }, outline: 1 }];
  return [];
}
/** Antlers or horns seen square on (head units). */
function hornsFront(b: Beast, hs: number): Prim[] {
  const P = (x: number, y: number): Pt => [x * hs, y * hs], out: Prim[] = [];
  for (const s of [-1, 1]) {
    if (b.horns === "antler") out.push({ t: "fill", d: carvedLine([P(s * .25, -.55), P(s * .5, -1.1), P(s * .9, -1.6), P(s * 1.1, -2.0)], hs * .09, { taper: "end", minRatio: .4, smooth: true }) + carvedLine([P(s * .55, -1.15), P(s * .4, -1.6)], hs * .06, { taper: "end" }) + carvedLine([P(s * .9, -1.6), P(s * .75, -2.0)], hs * .05, { taper: "end" }), fill: "kincha", outline: .9 });
    if (b.horns === "ox") out.push({ t: "fill", d: smoothD([P(s * .4, -.5), P(s * .9, -.6), P(s * 1.15, -.95), P(s * 1.05, -1.0), P(s * .85, -.75), P(s * .35, -.7)], true, .35), fill: { type: "linear", angle: 90, stops: [[0, "ki", 1], [1, "gofun", 1]] }, outline: 1 });
  }
  return out;
}
/** A small eye in profile at (ex, ey) head units: rim, iris, pupil, catchlight, or the closed lid. */
function smallEye(P: (x: number, y: number) => Pt, hs: number, ex: number, ey: number, ew: number, eh: number, iris: UkiyoePaint, blink: boolean): Prim[] {
  if (blink) return [{ t: "line", d: carvedLine([P(ex - ew, ey), P(ex, ey + eh * .5), P(ex + ew, ey - eh * .1)], hs * .045, { taper: "both", minRatio: .4 }), color: "sumi" }];
  return [{ t: "fill", d: smoothD([P(ex - ew, ey + eh * .2), P(ex - ew * .1, ey - eh), P(ex + ew, ey), P(ex, ey + eh * .9)], true, .5), fill: iris, outline: 1.1 },
    { t: "dots", d: circleD(ex * hs, ey * hs, hs * eh * .62), color: "sumi" },
    { t: "dots", d: circleD((ex + ew * .3) * hs, (ey - eh * .35) * hs, Math.max(.6, hs * .018)), color: "gofun" },
    { t: "line", d: carvedLine([P(ex - ew * 1.1, ey + eh * .1), P(ex - ew * .1, ey - eh * 1.1), P(ex + ew * 1.15, ey - eh * .1)], hs * .04, { taper: "both", minRatio: .3, smooth: true }), color: "sumi" }];
}
/**
 * The Japanese wild boar's head in profile (head units, facing +x), after the Fauna Japonica plate and Kuniyoshi: a long
 * deep wedge whose forehead runs straight from the crown down to the snout, the snout ending in a flat disc with the
 * nostril, the mouth line turning up at its corner, the heavy jaw and jowl, the small eye set high and well back, small
 * pointed ears laid back on the crown, the lower tusk curving up and back out of the lip, the pale stripe along the jaw
 * (Sus scrofa leucomystax, "white whiskers"), bristles standing on the crown and nape.
 */
function boarHead(b: Beast, hs: number, open: number, blink: boolean, look: UkiyoeCreatureLook, seed: number): Prim[] {
  const tq = look.view === "three-quarter", color = look.color ?? b.color, dark = look.dark ?? b.dark, cheek = look.color ? undefined : b.cheek;
  // Turned toward us the long snout foreshortens.
  const sn = tq ? .74 : 1, X = (x: number) => x > .2 ? .2 + (x - .2) * sn : x, P = (x: number, y: number): Pt => [X(x) * hs, y * hs];
  const out: Prim[] = [];
  // Broad, hairy, pointed ears laid back on the crown (not a horse's tall ones).
  const ear = (dx: number, lean: number, h: number, fill: UkiyoePaint): Prim[] => [
    { t: "fill", d: smoothD([P(dx - .28, -.5), P(dx - .2 + lean * .5, -.5 - h * .62), P(dx + lean, -.5 - h), P(dx + .1 + lean * .45, -.5 - h * .45), P(dx + .2, -.46)], true, .22), fill, outline: 1.1 },
    { t: "fill", d: smoothD([P(dx - .1, -.54), P(dx - .08 + lean * .5, -.5 - h * .55), P(dx + lean * .9, -.5 - h * .86), P(dx + .04 + lean * .4, -.52 - h * .4)], true, .25), fill: dark, opacity: .85, noPrint: true }];
  // The far ear just shows behind the near one.
  out.push(...ear(-.16, -.34, .42, dark));
  const skull: Pt[] = [P(-.8, .04), P(-.72, -.4), P(-.42, -.6), P(.05, -.56), P(.75, -.42), P(1.4, -.26), P(1.72, -.17), P(1.83, -.12), P(1.86, .1), P(1.74, .19),
    P(1.38, .25), P(.95, .37), P(.45, .58), P(-.1, .7), P(-.55, .58)];
  const skullD = smoothD(skull, true, .3);
  out.push({ t: "fill", d: skullD, fill: color, grain: .25 });
  // The key line from the crown down the straight face to the snout disc (none where the head joins the neck and mane).
  out.push({ t: "line", d: carvedLine(smoothPts(skull.slice(2, 10), 5, false), hs * .05, { taper: "both", minRatio: .25, smooth: true }), color: "sumi" });
  out.push({ t: "line", d: carvedLine(smoothPts([P(1.74, .19), P(1.38, .25), P(.95, .37), P(.45, .58)], 4, false), hs * .04, { taper: "end", minRatio: .2, smooth: true }), color: "sumi", opacity: .85 });
  // The pale stripe from the corner of the mouth back along the jaw to the throat.
  if (cheek) out.push({ t: "clip", d: skullD, key: "boarcheek", prims: [
    { t: "fill", d: smoothD([P(1.1, .3), P(.85, .36), P(.45, .5), P(-.05, .62), P(-.5, .58), P(-.1, .42), P(.4, .36), P(.8, .3), P(1.04, .27)], true, .45), fill: cheek, opacity: .75, noPrint: true },
    { t: "stroke", d: furAlong([P(1.0, .3), P(.5, .42), P(-.2, .52)], hs * .14, 16, hs * .16, seed + 81), color: "usuzumi", width: .55, opacity: .55 }] });
  // Coarse hair on the face, darker along the top of the snout, and wrinkles across it.
  out.push({ t: "stroke", d: furField([P(-.7, -.36), P(.2, -.52), P(1.3, -.24)], [P(-.7, .3), P(.2, .1), P(1.3, .14)], 34, hs * .2, seed + 82), color: dark, width: .6, opacity: .55 });
  out.push({ t: "line", d: carvedLine([P(.7, -.4), P(1.3, -.25), P(1.7, -.16)], hs * .07, { taper: "both", minRatio: .3, smooth: true }), color: dark, opacity: .35 });
  out.push({ t: "stroke", d: [1.48, 1.58, 1.66].map(x => { const a = P(x, -.22), e = P(x + .04, -.08); return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${((a[0] + e[0]) / 2 + hs * .03).toFixed(1)} ${((a[1] + e[1]) / 2).toFixed(1)} ${e[0].toFixed(1)} ${e[1].toFixed(1)}`; }).join(""), color: "sumi", width: .7, opacity: .55 });
  // The snout disc: bare, dark, seen nearly edge-on, with the nostril.
  out.push({ t: "fill", d: ellipseD(1.835 * sn * hs + (1 - sn) * .2 * hs, -.01 * hs, hs * .06 * (tq ? 1.8 : 1), hs * .15), fill: "sumi", opacity: .8, outline: .8 });
  out.push({ t: "fill", d: ellipseD((X(1.84) + (tq ? .04 : 0)) * hs, -.03 * hs, hs * .025 * (tq ? 1.8 : 1), hs * .05), fill: "beni", opacity: .55, noPrint: true });
  // Mouth: the lip line from the disc back to its upturned corner; open, the red mouth under it.
  if (open > .05) out.push({ t: "fill", d: smoothD([P(1.74, .16), P(1.3, .22), P(1.02, .26), P(1.3, .3 + .25 * open), P(1.66, .24 + .12 * open)], true, .3), fill: "shu", outline: .9 });
  out.push({ t: "line", d: carvedLine([P(1.78, .14), P(1.42, .21), P(1.1, .23), P(1.0, .17)], hs * .045, { taper: "end", minRatio: .3, smooth: true }), color: "sumi" });
  // The lower tusk: out of the lip ahead of the corner, curving up and back, ivory with a dark root.
  out.push({ t: "fill", d: smoothD([P(1.4, .25), P(1.45, .08), P(1.4, -.08), P(1.27, -.2), P(1.3, -.06), P(1.33, .08), P(1.32, .24)], true, .35), fill: { type: "linear", angle: 90, stops: [[0, "gofun", 1], [.75, "gofun", 1], [1, "kincha", 1]] }, outline: .9 });
  // The small eye sits far back, about three-fifths of the way from the snout to the ear.
  out.push(...smallEye(P, hs, .26, -.3, .085, .055, look.accent ?? b.iris, blink));
  // The heavy brow over the eye and the folds below it.
  out.push({ t: "stroke", d: [[.1, -.4, .42, -.42], [.12, -.2, .38, -.18]].map(([x0, y0, x1, y1]) => { const a = P(x0, y0), e = P(x1, y1); return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${((a[0] + e[0]) / 2).toFixed(1)} ${((a[1] + e[1]) / 2 - hs * .04).toFixed(1)} ${e[0].toFixed(1)} ${e[1].toFixed(1)}`; }).join(""), color: "sumi", width: .7, opacity: .55 });
  // A few long bristles from the lip and the jaw.
  out.push({ t: "stroke", d: [[1.5, .2, 1.72, .36], [1.2, .27, 1.38, .44], [.9, .34, 1.02, .52]].map(([x0, y0, x1, y1]) => { const a = P(x0, y0), e = P(x1, y1); return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${e[0].toFixed(1)} ${e[1].toFixed(1)}`; }).join(""), color: "sumi", width: .55, opacity: .6 });
  // The near ear on the crown, and the bristles standing back along the crown and nape.
  out.push(...ear(-.44, -.4, .48, color));
  const crown = smoothPts([P(.15, -.56), P(-.4, -.6), P(-.78, -.36)], 5, false);
  const locks = tufted(crown, u => hs * .2 * Math.sin(Math.PI * Math.min(1, u * 1.1 + .1)) ** .6, 1, () => 1, seed + 83);
  out.push({ t: "fill", d: polyD([...locks, ...crown.map(q => [q[0], q[1] + hs * .06] as Pt).reverse()]), fill: b.bristles ?? dark, grain: .3 });
  out.push({ t: "stroke", d: furAlong(crown, hs * .12, 14, hs * .16, seed + 84), color: "sumi", width: .5, opacity: .55 });
  out.push(...headExtras(look, P, hs, .26, -.3, sn, blink));
  return out;
}
/**
 * The Asian black bear's head in profile (head units, facing +x), after Tanaka Yoshio's plate (1875), the Okuhida
 * specimens and Hokusai: a broad domed skull with big round ears set high and far back, a short tapering muzzle in tan,
 * the large black nose leather, a small eye, a short mouth line, and long hair under the jaw flaring into the neck ruff.
 */
function bearHead(b: Beast, hs: number, open: number, blink: boolean, look: UkiyoeCreatureLook, seed: number): Prim[] {
  const tq = look.view === "three-quarter", color = look.color ?? b.color, muzzle = look.color ? color : b.muzzle ?? color;
  const sn = tq ? .78 : 1, X = (x: number) => x > .4 ? .4 + (x - .4) * sn : x, P = (x: number, y: number): Pt => [X(x) * hs, y * hs];
  const out: Prim[] = [];
  const ear = (cx: number, cy: number, r: number): Prim[] => [{ t: "fill", d: ellipseD(cx * hs, cy * hs, r * hs, r * .92 * hs), fill: color, outline: 1.1 },
    { t: "fill", d: ellipseD((cx + .04) * hs, (cy + .04) * hs, r * .5 * hs, r * .45 * hs), fill: "usuzumi", opacity: .14, noPrint: true }];
  out.push(...ear(-.1, -.74, .25));
  // The forehead slopes into a long, blunt muzzle (the eye nearly halfway from the nose to the back of the skull).
  const skull: Pt[] = [P(-.78, .08), P(-.7, -.4), P(-.35, -.64), P(.1, -.62), P(.45, -.5), P(.7, -.34), P(1.05, -.24), P(1.28, -.16), P(1.34, -.03), P(1.27, .08),
    P(1.1, .18), P(.8, .3), P(.35, .46), P(-.2, .55), P(-.6, .45)];
  out.push({ t: "fill", d: smoothD(skull, true, .3), fill: color, grain: .25 });
  // The tan muzzle from the stop to the nose and round under the chin.
  out.push({ t: "fill", d: smoothD([P(.62, -.4), P(1.05, -.25), P(1.28, -.16), P(1.34, -.03), P(1.27, .08), P(1.1, .18), P(.82, .28), P(.6, .08)], true, .4), fill: muzzle, opacity: .95, noPrint: true });
  out.push({ t: "stroke", d: furAlong([P(.64, -.08), P(1.22, -.1)], hs * .3, 14, hs * .1, seed + 85), color: "kogecha", width: .5, opacity: .5 });
  out.push({ t: "line", d: carvedLine(smoothPts(skull.slice(2, 10), 5, false), hs * .05, { taper: "both", minRatio: .25, smooth: true }), color: "sumi" });
  // Long black hair under the jaw and behind the cheek, breaking into locks: the start of the neck ruff.
  const lobe = [P(.55, .3), P(.1, .42), P(-.4, .32), P(-.82, .1)], under = [P(-.82, .1), P(-.74, .52), P(-.3, .62), P(.2, .52), P(.55, .3)];
  out.push({ t: "fill", d: polyD([...smoothPts(lobe, 4, false), ...tufted(smoothPts(under, 4, false), u => hs * .16 * (1 - u * .6), 1, () => -1, seed + 86)]), fill: color });
  // Hair on the head: pale hairlines catch the light on the black coat.
  out.push({ t: "stroke", d: furField([P(-.7, -.4), P(-.1, -.66), P(.5, -.46)], [P(-.7, .3), P(-.1, .1), P(.5, .1)], 30, hs * .17, seed + 87), color: "usuzumi", width: .55, opacity: .5 });
  // The nose leather, large and black, with its nostril; the short mouth line; the red mouth and fangs when it roars.
  if (open > .05) out.push({ t: "fill", d: smoothD([P(1.22, .08), P(.84, .22), P(1.0, .3 + .35 * open), P(1.2, .16 + .2 * open)], true, .3), fill: "shu", outline: .9 },
    { t: "fill", d: polyD([P(1.14, .1), P(1.12, .2 + .1 * open), P(1.08, .12)]) + polyD([P(1.12, .24 + .3 * open), P(1.09, .16 + .2 * open), P(1.06, .25 + .28 * open)]), fill: "gofun", noPrint: true });
  out.push({ t: "fill", d: smoothD([P(1.13, -.19), P(1.31, -.16), P(1.38, -.03), P(1.29, .05), P(1.15, -.01)], true, .35), fill: "sumi", outline: .7 });
  out.push({ t: "fill", d: ellipseD(X(1.3) * hs, -.07 * hs, hs * .035, hs * .025), fill: "usuzumi", opacity: .7, noPrint: true });
  out.push({ t: "line", d: carvedLine([P(1.26, .07), P(1.08, .16), P(.88, .2)], hs * .04, { taper: "end", minRatio: .3, smooth: true }), color: "sumi" });
  out.push(...smallEye(P, hs, .36, -.32, .08, .05, look.accent ?? b.iris, blink));
  if (look.glowEyes && !blink) out.push({ t: "glow", cx: X(.36) * hs, cy: -.32 * hs, r: hs * .5, color: "ki", opacity: .7 });
  // The near ear, big and round, set high on the back of the skull.
  out.push(...ear(-.44, -.64, .27));
  out.push(...headExtras({ ...look, glowEyes: false }, P, hs, .36, -.32, sn, blink));
  return out;
}
/**
 * The ox's head, after a bull in profile and ANIM1's cattle face (eye 0.6 of the head back from the nose, ears held out
 * sideways below the horns). A broad, flat forehead and a straight face down to a deep, square muzzle with a wide moist
 * nose pad; a large dark eye under a bony orbit; a deep jaw with the round cheek muscle; the curly poll between the
 * horns; broad ears out to the side, fringed inside. Head units: x forward to the nose, y down, the face carried
 * steeply downward by the head tilt.
 */
function oxHead(b: Beast, hs: number, open: number, blink: boolean, look: UkiyoeCreatureLook, seed: number): Prim[] {
  const tq = look.view === "three-quarter", color = look.color ?? b.color, dark = look.dark ?? b.dark;
  const sn = tq ? .8 : 1, X = (x: number) => x > .2 ? .2 + (x - .2) * sn : x, P = (x: number, y: number): Pt => [X(x) * hs, y * hs];
  const out: Prim[] = [];
  // The far ear, held out sideways behind the poll.
  // The ear points straight back in the world, whatever the head's own tilt: in head units that is back and down by the
  // tilt (the face is carried about 50° down).
  const tilt = (b.headTilt ?? 0) * Math.PI / 180, bx = -Math.cos(tilt), by = Math.sin(tilt), nx = -by, ny = bx;
  const ear = (dx: number, dy: number, far: boolean): Prim[] => {
    const at = (u: number, w: number) => P(dx + bx * u + nx * w, dy + by * u + ny * w);
    const e: Pt[] = [at(0, -.1), at(.3, -.13), at(.52, -.04), at(.5, .07), at(.24, .11), at(0, .09)];
    // The inner ear, its pale fringe of hair, shows the ear against the dark head and neck.
    const inner: Pt[] = [at(.06, -.04), at(.3, -.07), at(.46, -.01), at(.3, .05), at(.06, .04)];
    return [{ t: "fill", d: smoothD(e, true, .35), fill: color, outline: 1.1, ...(far ? { opacity: .95 } : {}) },
      { t: "fill", d: smoothD(inner, true, .35), fill: "usuzumi", opacity: far ? .35 : .55, noPrint: true },
      { t: "stroke", d: furAlong([at(.05, 0), at(.45, 0)], hs * .1, 7, hs * .1, seed + (far ? 91 : 92)), color: "usuzumi", width: .6, opacity: .55 }];
  };
  out.push(...ear(-.42, -.42, true));
  out.push(...hornsSide(b, hs));
  // The skull: poll and crown, the flat forehead and straight face, the square muzzle, the deep lower jaw, the throat.
  const skull: Pt[] = [P(-.62, .1), P(-.6, -.38), P(-.42, -.58), P(-.1, -.62), P(.4, -.5), P(.9, -.36), P(1.12, -.28), P(1.22, -.14), P(1.24, .08), P(1.16, .24),
    P(.95, .3), P(.6, .36), P(.2, .5), P(-.2, .56), P(-.5, .42)];
  out.push({ t: "fill", d: smoothD(skull, true, .28), fill: color, grain: .25 });
  out.push({ t: "line", d: carvedLine(smoothPts(skull.slice(1, 11), 5, false), hs * .05, { taper: "both", minRatio: .25, smooth: true }), color: "sumi" });
  // The round cheek muscle and the bony ridge of the face.
  out.push({ t: "line", d: carvedLine(smoothPts([P(-.32, -.08), P(-.18, .28), P(.15, .42), P(.42, .3)], 5, false), hs * .03, { taper: "both", minRatio: .2, smooth: true }), color: "sumi", opacity: .55 });
  out.push({ t: "line", d: carvedLine([P(.2, -.42), P(.75, -.3), P(1.02, -.22)], hs * .02, { taper: "both", minRatio: .3, smooth: true }), color: "usuzumi", opacity: .5 });
  // The curly poll: tight curls of hair between and in front of the horns (the Japanese Black's topknot).
  const curls = [0, 1, 2, 3, 4].map(i => { const c = P(-.38 + i * .1, -.58 + Math.abs(i - 2) * .02); const r = hs * .045; return `M${(c[0] - r).toFixed(1)} ${c[1].toFixed(1)}a${r.toFixed(1)} ${r.toFixed(1)} 0 1 1 ${(r * 1.4).toFixed(1)} ${(r * .6).toFixed(1)}`; }).join("");
  out.push({ t: "stroke", d: curls, color: "usuzumi", width: .8, opacity: .7 });
  // The moist nose pad across the front of the muzzle, the comma nostril; the mouth line; open when it lows.
  out.push({ t: "fill", d: smoothD([P(1.02, -.24), P(1.2, -.18), P(1.25, .02), P(1.2, .14), P(1.04, .1), P(.98, -.06)], true, .35), fill: dark === "sumi" ? "usuzumi" : dark, outline: .8, opacity: .95 });
  out.push({ t: "line", d: carvedLine([P(1.12, -.12), P(1.18, -.06), P(1.13, .02)], hs * .04, { taper: "both", minRatio: .3, smooth: true }), color: "sumi" });
  if (open > .05) out.push({ t: "fill", d: smoothD([P(1.18, .16), P(.82, .26), P(.95, .34 + .3 * open), P(1.16, .22 + .2 * open)], true, .3), fill: "shu", outline: .9 });
  out.push({ t: "line", d: carvedLine([P(1.18, .17), P(1.0, .22), P(.78, .28)], hs * .035, { taper: "end", minRatio: .3, smooth: true }), color: "sumi" });
  // The large dark eye high on the head under a bony orbit, about 0.6 of the head back from the nose.
  const ex = .12, ey = -.3;
  out.push({ t: "line", d: carvedLine([P(ex - .14, ey - .04), P(ex, ey - .15), P(ex + .16, ey - .06)], hs * .035, { taper: "both", minRatio: .3, smooth: true }), color: "sumi", opacity: .75 });
  // On a black coat the eye needs its pale rim of bare lid to read.
  if (!blink) out.push({ t: "fill", d: ellipseD(X(ex) * hs, ey * hs, .14 * hs, .1 * hs), fill: "usuzumi", opacity: .7, noPrint: true });
  out.push(...smallEye(P, hs, ex, ey, .1, .07, look.accent ?? b.iris, blink));
  // Short coat: a few hairlines along the face and over the crown.
  out.push({ t: "stroke", d: furField([P(-.55, -.4), P(.1, -.52), P(.7, -.34)], [P(-.55, .3), P(.1, .1), P(.7, .1)], 18, hs * .14, seed + 93), color: "usuzumi", width: .5, opacity: .4 });
  // The near ear, out to the side below the horn.
  out.push(...ear(-.36, -.34, false));
  out.push(...headExtras(look, P, hs, ex, ey, sn, blink));
  return out;
}
/** A glossy black eye with no iris showing (mouse, weasel): a dark ball, a thin rim, a bright catchlight. */
function beadEye(P: (x: number, y: number) => Pt, hs: number, ex: number, ey: number, r: number, blink: boolean, rx = r): Prim[] {
  if (blink) return [{ t: "line", d: carvedLine([P(ex - rx, ey), P(ex, ey + r * .45), P(ex + rx, ey)], hs * .04, { taper: "both", minRatio: .4 }), color: "sumi" }];
  return [{ t: "fill", d: ellipseD(ex * hs, ey * hs, rx * hs, r * hs), fill: "sumi", outline: .9 },
    { t: "fill", d: ellipseD((ex - rx * .15) * hs, (ey + r * .25) * hs, rx * .6 * hs, r * .45 * hs), fill: "ai", opacity: .35, noPrint: true },
    { t: "dots", d: circleD((ex + rx * .32) * hs, (ey - r * .35) * hs, Math.max(.7, r * .28 * hs)), color: "gofun" }];
}
/** Whiskers fanning from the whisker pad (head units). */
function whiskers(P: (x: number, y: number) => Pt, x: number, y: number, len: number, n = 4, opacity = .6): Prim {
  const d = Array.from({ length: n }, (_, i) => {
    const a = P(x, y + i * .035), sp = (i - (n - 1) / 2) / n, e = P(x + len * .55, y + i * .035 + len * (sp * .5 - .04)), f = P(x + len, y + i * .05 + len * (sp * .9 + .02));
    return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${e[0].toFixed(1)} ${e[1].toFixed(1)} ${f[0].toFixed(1)} ${f[1].toFixed(1)}`;
  }).join("");
  return { t: "stroke", d, color: "sumi", width: .5, opacity };
}
/**
 * The house mouse's head in profile (head units, facing +x), after CC0 photographs: a cone from the round crown to a
 * fine pointed snout with a pink nose, no neck; a large glossy black eye about a seventh of the head long, set nearer
 * the nose than the ear; huge thin round ears, half the head's length, standing just behind the eye; long whiskers.
 */
function mouseHead(b: Beast, hs: number, open: number, blink: boolean, look: UkiyoeCreatureLook, seed: number): Prim[] {
  const tq = look.view === "three-quarter", color = look.color ?? b.color, belly = look.belly ?? b.belly;
  const sn = tq ? .8 : 1, X = (x: number) => x > .1 ? .1 + (x - .1) * sn : x, P = (x: number, y: number): Pt => [X(x) * hs, y * hs], out: Prim[] = [];
  const ear = (cx: number, cy: number, rx: number, ry: number, rotDeg: number, near: boolean): Prim[] => {
    const e = (k: number) => smoothD(Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2; return rot([cx * hs + Math.cos(a) * rx * k * hs, cy * hs + Math.sin(a) * ry * k * hs], rotDeg, [cx * hs, (cy + ry) * hs]); }), true, .5);
    // The thin ear: pink inside, a soft fold curving down from the rim toward its base.
    const fold = [[-.5, -.3], [-.2, .2], [.05, .55]].map(([u, v]) => rot([cx * hs + u * rx * hs, cy * hs + v * ry * hs], rotDeg, [cx * hs, (cy + ry) * hs]));
    return [{ t: "fill", d: e(1), fill: color, outline: near ? 1 : .8 }, { t: "fill", d: e(.72), fill: "sakura", opacity: near ? .75 : .5, noPrint: true },
      { t: "stroke", d: smoothD(fold, false, .5), color: "beni", width: .6, opacity: .35 }];
  };
  out.push(...ear(-.02, -.66, .36, .42, 14, false));
  const skull: Pt[] = [P(-.62, .3), P(-.66, -.12), P(-.42, -.4), P(-.05, -.42), P(.35, -.28), P(.72, -.1), P(1.0, .02), P(1.02, .09), P(.94, .14), P(.66, .2), P(.3, .3), P(-.15, .4)];
  const skullD = smoothD(skull, true, .38);
  out.push({ t: "fill", d: skullD, fill: color, grain: .2 });
  out.push({ t: "clip", d: skullD, key: "mousechin", prims: [{ t: "fill", d: smoothD([P(.95, .14), P(.6, .1), P(.2, .2), P(-.2, .3), P(-.2, .5), P(.6, .4)], true, .4), fill: belly, opacity: .9, noPrint: true }] });
  out.push({ t: "line", d: carvedLine(smoothPts(skull.slice(0, 9), 5, false), hs * .045, { taper: "both", minRatio: .25, smooth: true }), color: "sumi" });
  out.push({ t: "stroke", d: furField([P(-.55, -.3), P(-.05, -.38), P(.5, -.18)], [P(-.5, .2), P(.0, .15), P(.5, .05)], 22, hs * .12, seed + 101), color: "usuzumi", width: .5, opacity: .45 });
  // The pink nose at the snout's tip, the tiny mouth under it, a hint of the incisors.
  out.push({ t: "fill", d: smoothD([P(.93, -.02), P(1.04, .0), P(1.05, .08), P(.96, .1)], true, .4), fill: "sakura", outline: .6 });
  out.push({ t: "line", d: carvedLine([P(.95, .13), P(.86, .19), P(.76, .19)], hs * .025, { taper: "end", minRatio: .3 }), color: "sumi", opacity: .8 });
  if (open > .05) out.push({ t: "fill", d: polyD([P(.9, .17), P(.94, .25 + .1 * open), P(.86, .2)]), fill: "gofun", outline: .6 });
  out.push({ t: "dots", d: [0, 1, 2].map(i => circleD(X(.8 + i * .04) * hs, (.06 + (i % 2) * .03) * hs, hs * .012)).join(""), color: "sumi" });
  out.push(whiskers(P, .82, .04, .95, 5, .55));
  out.push(...beadEye(P, hs, .4, -.14, .12, blink, .11));
  if (tq) out.push(...beadEye(P, hs, .68, -.18, .08, blink, .045));
  out.push(...ear(-.18, -.6, .38, .44, -12, true));
  out.push(...headExtras(look, P, hs, .4, -.14, sn, blink));
  return out;
}
/**
 * The Japanese weasel's head in profile (head units, facing +x), after the Tokyo specimen and Ōkyo's studies: a small,
 * flat wedge no wider than the long neck, the forehead nearly level, a short blunt muzzle; a small black eye a third of
 * the way back from the nose; small rounded ears set low on the side of the head; the dark brown face mask round the
 * eye and over the muzzle, the white upper lip and chin.
 */
function weaselHead(b: Beast, hs: number, open: number, blink: boolean, look: UkiyoeCreatureLook, seed: number): Prim[] {
  const tq = look.view === "three-quarter", color = look.color ?? b.color, dark = look.dark ?? b.dark, belly = look.belly ?? b.belly;
  const sn = tq ? .8 : 1, X = (x: number) => x > .2 ? .2 + (x - .2) * sn : x, P = (x: number, y: number): Pt => [X(x) * hs, y * hs], out: Prim[] = [];
  const skull: Pt[] = [P(-.66, .3), P(-.68, -.12), P(-.4, -.34), P(.1, -.36), P(.55, -.24), P(.86, -.1), P(.98, .0), P(.97, .1), P(.86, .16), P(.55, .22), P(.15, .32), P(-.3, .38)];
  const skullD = smoothD(skull, true, .38);
  out.push({ t: "fill", d: skullD, fill: color, grain: .2 });
  out.push({ t: "clip", d: skullD, key: "weaselface", prims: [
    { t: "fill", d: smoothD([P(.02, -.3), P(.5, -.3), P(1.0, -.06), P(.96, .06), P(.62, .1), P(.3, .06), P(.08, -.02)], true, .45), fill: look.color ? color : dark, opacity: .85, noPrint: true },
    { t: "fill", d: smoothD([P(.98, .08), P(.7, .14), P(.3, .2), P(-.1, .32), P(-.2, .5), P(.4, .42), P(.9, .2)], true, .4), fill: belly, noPrint: true }] });
  out.push({ t: "line", d: carvedLine(smoothPts(skull.slice(0, 10), 5, false), hs * .045, { taper: "both", minRatio: .25, smooth: true }), color: "sumi" });
  out.push({ t: "stroke", d: furField([P(-.6, -.24), P(0, -.32), P(.55, -.2)], [P(-.6, .22), P(0, .12), P(.55, .06)], 18, hs * .12, seed + 102), color: dark, width: .5, opacity: .45 });
  out.push({ t: "fill", d: smoothD([P(.9, -.06), P(1.0, -.03), P(1.0, .05), P(.92, .05)], true, .4), fill: "sumi", outline: .5 });
  if (open > .05) out.push({ t: "fill", d: smoothD([P(.92, .12), P(.6, .18), P(.82, .24 + .2 * open)], true, .3), fill: "shu", outline: .7 });
  out.push({ t: "line", d: carvedLine([P(.95, .1), P(.8, .15), P(.62, .16)], hs * .03, { taper: "end", minRatio: .3 }), color: "sumi", opacity: .85 });
  out.push(whiskers(P, .84, .06, .6, 4, .5));
  out.push(...beadEye(P, hs, .42, -.14, .075, blink));
  if (tq) out.push(...beadEye(P, hs, .7, -.17, .05, blink, .03));
  // The small round ear, low on the side of the head behind the eye, its pale rim and dark inside.
  out.push({ t: "fill", d: smoothD([P(-.42, -.18), P(-.44, -.42), P(-.24, -.5), P(-.1, -.36), P(-.16, -.2)], true, .5), fill: color, outline: 1 },
    { t: "fill", d: smoothD([P(-.36, -.24), P(-.36, -.4), P(-.24, -.42), P(-.18, -.3)], true, .5), fill: dark, opacity: .7, noPrint: true });
  out.push(...headExtras(look, P, hs, .42, -.14, sn, blink));
  return out;
}
/**
 * The tanuki's head in profile (head units, facing +x), after the 1874 Zoological Society plate, Specht and the Genoa
 * specimen: a short pointed muzzle (eye to nose about two-fifths of the head) with a black nose; the dark mask that
 * surrounds the eye and runs down and back over the cheek; pale fur above the eye and on the side of the muzzle; small
 * rounded ears edged dark; full grizzled cheek fur flaring back under the jaw.
 */
function tanukiHead(b: Beast, hs: number, open: number, blink: boolean, look: UkiyoeCreatureLook, seed: number): Prim[] {
  const tq = look.view === "three-quarter", color = look.color ?? b.color, dark = look.dark ?? b.dark, pale = look.color ? color : "kincha";
  const sn = tq ? .8 : 1, X = (x: number) => x > .3 ? .3 + (x - .3) * sn : x, P = (x: number, y: number): Pt => [X(x) * hs, y * hs], out: Prim[] = [];
  const ear = (dx: number, dy: number, near: boolean): Prim[] => [
    { t: "fill", d: smoothD([P(dx - .2, dy + .12), P(dx - .16, dy - .16), P(dx + .02, dy - .26), P(dx + .17, dy - .12), P(dx + .16, dy + .12)], true, .5), fill: dark, outline: near ? 1 : .8 },
    { t: "fill", d: smoothD([P(dx - .12, dy + .1), P(dx - .09, dy - .1), P(dx + .02, dy - .17), P(dx + .1, dy - .06), P(dx + .09, dy + .1)], true, .5), fill: pale, opacity: .8, noPrint: true }];
  out.push(...ear(-.2, -.52, false));
  const skull: Pt[] = [P(-.7, .22), P(-.66, -.26), P(-.32, -.54), P(.12, -.5), P(.42, -.3), P(.72, -.14), P(.96, -.04), P(.97, .07), P(.84, .14), P(.55, .2), P(.15, .32), P(-.3, .42)];
  const skullD = smoothD(skull, true, .38);
  out.push({ t: "fill", d: skullD, fill: color, grain: .22 });
  out.push({ t: "clip", d: skullD, key: "tanukimask", prims: [
    // Pale brow over the mask and pale muzzle side; then the mask: round the eye, down and back over the cheek.
    { t: "fill", d: smoothD([P(-.15, -.4), P(.2, -.48), P(.5, -.3), P(.9, -.1), P(.9, .1), P(.5, .14), P(.2, -.2)], true, .45), fill: pale, opacity: .9, noPrint: true },
    { t: "fill", d: smoothD([P(.02, -.34), P(.3, -.36), P(.5, -.2), P(.56, -.02), P(.4, .14), P(.12, .3), P(-.22, .36), P(-.3, .18), P(-.06, .02)], true, .45), fill: look.color ? dark : "sumi", opacity: .88 }] });
  out.push({ t: "line", d: carvedLine(smoothPts(skull.slice(0, 9), 5, false), hs * .05, { taper: "both", minRatio: .25, smooth: true }), color: "sumi" });
  out.push({ t: "stroke", d: furField([P(-.6, -.36), P(-.1, -.5), P(.4, -.28)], [P(-.6, .2), P(-.1, .05), P(.4, .0)], 20, hs * .14, seed + 103), color: "usuzumi", width: .55, opacity: .45 });
  // Full cheek fur flaring back under the jaw, grizzled.
  const lobe = [P(.3, .26), P(-.05, .3), P(-.45, .22), P(-.72, .1)], under = [P(-.72, .1), P(-.6, .55), P(-.2, .64), P(.25, .44)];
  out.push({ t: "fill", d: polyD([...smoothPts(lobe, 4, false), ...tufted(smoothPts(under, 4, false), () => hs * .2, 1, () => -1, seed + 104)]), fill: color });
  out.push({ t: "stroke", d: furAlong([P(.1, .38), P(-.55, .32)], hs * .32, 12, hs * .2, seed + 105), color: "gofun", width: .55, opacity: .5 });
  out.push({ t: "fill", d: smoothD([P(.86, -.08), P(.99, -.06), P(1.0, .05), P(.88, .06)], true, .4), fill: "sumi", outline: .5 });
  if (open > .05) out.push({ t: "fill", d: smoothD([P(.9, .12), P(.55, .2), P(.8, .26 + .25 * open)], true, .3), fill: "shu", outline: .8 });
  out.push({ t: "line", d: carvedLine([P(.93, .1), P(.76, .17), P(.58, .18)], hs * .035, { taper: "end", minRatio: .3 }), color: "sumi" });
  out.push(whiskers(P, .78, .06, .55, 3, .45));
  out.push(...smallEye(P, hs, .34, -.18, .085, .06, look.accent ?? b.iris, blink));
  if (tq) out.push(...smallEye(P, hs, .62, -.2, .045, .045, look.accent ?? b.iris, blink));
  out.push(...ear(-.42, -.46, true));
  out.push(...headExtras(look, P, hs, .34, -.18, sn, blink));
  return out;
}
/** The mouse's face square on: huge round ears at the sides, large black eyes, the snout pointing at us to a pink nose. */
function mouseFace(b: Beast, hs: number, look: UkiyoeCreatureLook, blink: boolean, open: number, seed: number): Prim[] {
  const out: Prim[] = [], P = (x: number, y: number): Pt => [x * hs, y * hs], color = look.color ?? b.color, belly = look.belly ?? b.belly;
  const skull: Pt[] = [P(-.6, -.3), P(-.3, -.52), P(0, -.56), P(.3, -.52), P(.6, -.3), P(.62, .02), P(.4, .3), P(.16, .52), P(0, .58), P(-.16, .52), P(-.4, .3), P(-.62, .02)];
  out.push({ t: "fill", d: smoothD(skull, true, .38), fill: color, outline: 1.1, grain: .2 });
  out.push({ t: "fill", d: smoothD([P(-.3, .22), P(0, .3), P(.3, .22), P(.16, .5), P(0, .56), P(-.16, .5)], true, .4), fill: belly, opacity: .7, noPrint: true });
  out.push({ t: "stroke", d: furField([P(-.5, -.35), P(0, -.5), P(.5, -.35)], [P(-.4, .1), P(0, .2), P(.4, .1)], 20, hs * .12, seed + 106), color: "usuzumi", width: .5, opacity: .4 });
  for (const s of [-1, 1]) out.push(...beadEye(P, hs, s * .33, -.08, .13, blink, .11));
  out.push({ t: "fill", d: smoothD([P(-.08, .44), P(.08, .44), P(.06, .53), P(0, .56), P(-.06, .53)], true, .4), fill: "sakura", outline: .6 });
  out.push({ t: "stroke", d: `M0 ${(.56 * hs).toFixed(1)}L0 ${(.62 * hs).toFixed(1)}`, color: "sumi", width: .6, opacity: .7 });
  if (open > .05) out.push({ t: "fill", d: smoothD([P(-.04, .62), P(.04, .62), P(.03, .7), P(-.03, .7)], true, .3), fill: "gofun", outline: .5 });
  for (const s of [-1, 1]) out.push({ t: "stroke", d: [0, 1, 2, 3].map(i => `M${(s * .1 * hs).toFixed(1)} ${((.46 + i * .03) * hs).toFixed(1)}q${(s * hs * .35).toFixed(1)} ${((i - 1.5) * hs * .04).toFixed(1)} ${(s * hs * .8).toFixed(1)} ${((i - 1.5) * hs * .14).toFixed(1)}`).join(""), color: "sumi", width: .5, opacity: .5 });
  return out;
}
/** The weasel's face square on: a broad flat head, small round ears at its corners, the dark mask over the eyes and nose, the white lips and chin. */
function weaselFace(b: Beast, hs: number, look: UkiyoeCreatureLook, blink: boolean, open: number, seed: number): Prim[] {
  const out: Prim[] = [], P = (x: number, y: number): Pt => [x * hs, y * hs], color = look.color ?? b.color, dark = look.dark ?? b.dark, belly = look.belly ?? b.belly;
  const skull: Pt[] = [P(-.64, -.22), P(-.38, -.46), P(0, -.5), P(.38, -.46), P(.64, -.22), P(.66, .06), P(.46, .3), P(.22, .46), P(0, .5), P(-.22, .46), P(-.46, .3), P(-.66, .06)];
  const skullD = smoothD(skull, true, .38);
  out.push({ t: "fill", d: skullD, fill: color, outline: 1.1, grain: .2 });
  out.push({ t: "clip", d: skullD, key: "weaselmask", prims: [
    { t: "fill", d: smoothD([P(-.56, -.18), P(-.2, -.26), P(0, -.2), P(.2, -.26), P(.56, -.18), P(.5, .06), P(.2, .14), P(.12, .34), P(0, .38), P(-.12, .34), P(-.2, .14), P(-.5, .06)], true, .45), fill: look.color ? color : dark, opacity: .85, noPrint: true },
    { t: "fill", d: smoothD([P(-.34, .34), P(-.1, .36), P(0, .42), P(.1, .36), P(.34, .34), P(.2, .52), P(0, .56), P(-.2, .52)], true, .4), fill: belly, noPrint: true }] });
  out.push({ t: "stroke", d: furField([P(-.5, -.3), P(0, -.44), P(.5, -.3)], [P(-.4, .0), P(0, -.1), P(.4, .0)], 18, hs * .1, seed + 107), color: dark, width: .5, opacity: .4 });
  for (const s of [-1, 1]) out.push(...beadEye(P, hs, s * .28, -.08, .075, blink));
  out.push({ t: "fill", d: smoothD([P(-.1, .22), P(.1, .22), P(.08, .3), P(0, .33), P(-.08, .3)], true, .4), fill: "sumi", outline: .5 });
  out.push({ t: "stroke", d: `M0 ${(.33 * hs).toFixed(1)}L0 ${(.38 * hs).toFixed(1)}M${(-.12 * hs).toFixed(1)} ${(.4 * hs).toFixed(1)}Q0 ${(.43 * hs).toFixed(1)} ${(.12 * hs).toFixed(1)} ${(.4 * hs).toFixed(1)}`, color: "sumi", width: .7, opacity: .8 });
  if (open > .05) out.push({ t: "fill", d: ellipseD(0, .45 * hs, .1 * hs, .05 * hs * (1 + open)), fill: "shu", outline: .6 });
  for (const s of [-1, 1]) out.push({ t: "stroke", d: [0, 1, 2].map(i => `M${(s * .14 * hs).toFixed(1)} ${((.3 + i * .03) * hs).toFixed(1)}l${(s * hs * .5).toFixed(1)} ${((i - 1) * hs * .1).toFixed(1)}`).join(""), color: "sumi", width: .5, opacity: .45 });
  return out;
}
/**
 * The tanuki's face square on, after the Zoological Society plate and the Genoa specimen: broad across the full cheek
 * fur, the dark masks round the eyes slanting down and out over the cheeks, pale fur between and above them and round
 * the short pointed muzzle, the black nose.
 */
function tanukiFace(b: Beast, hs: number, look: UkiyoeCreatureLook, blink: boolean, open: number, seed: number): Prim[] {
  const out: Prim[] = [], P = (x: number, y: number): Pt => [x * hs, y * hs], color = look.color ?? b.color, dark = look.dark ?? b.dark, pale = look.color ? color : "kincha";
  const jaw = smoothPts([P(.74, -.12), P(.86, .2), P(.58, .44), P(0, .58), P(-.58, .44), P(-.86, .2), P(-.74, -.12)], 4, false);
  const skull: Pt[] = [P(-.62, -.4), P(-.3, -.6), P(0, -.62), P(.3, -.6), P(.62, -.4)];
  const outline = [...smoothPts(skull, 4, false), ...tufted(jaw, u => hs * .16 * Math.sin(Math.PI * u) ** .5, 1, u => u < .5 ? 1 : -1, seed + 108)];
  const faceD = polyD(outline);
  out.push({ t: "fill", d: faceD, fill: color, outline: 1.1, grain: .22 });
  out.push({ t: "clip", d: faceD, key: "tanukiface", prims: [
    { t: "fill", d: smoothD([P(-.5, -.42), P(0, -.5), P(.5, -.42), P(.28, -.2), P(.16, .1), P(.2, .4), P(0, .5), P(-.2, .4), P(-.16, .1), P(-.28, -.2)], true, .45), fill: pale, opacity: .9, noPrint: true },
    ...[-1, 1].map((s): Prim => ({ t: "fill", d: smoothD([P(s * .1, -.24), P(s * .36, -.32), P(s * .56, -.12), P(s * .66, .2), P(s * .5, .34), P(s * .3, .2), P(s * .14, 0)], true, .45), fill: look.color ? dark : "sumi", opacity: .88 }))] });
  out.push({ t: "stroke", d: furField([P(-.5, -.45), P(0, -.58), P(.5, -.45)], [P(-.5, -.15), P(0, -.25), P(.5, -.15)], 16, hs * .12, seed + 109), color: "usuzumi", width: .5, opacity: .4 });
  out.push({ t: "fill", d: smoothD([P(-.12, .3), P(.12, .3), P(.09, .4), P(0, .44), P(-.09, .4)], true, .4), fill: "sumi", outline: .5 });
  out.push({ t: "stroke", d: `M0 ${(.44 * hs).toFixed(1)}L0 ${(.5 * hs).toFixed(1)}M${(-.12 * hs).toFixed(1)} ${(.52 * hs).toFixed(1)}Q0 ${(.55 * hs).toFixed(1)} ${(.12 * hs).toFixed(1)} ${(.52 * hs).toFixed(1)}`, color: "sumi", width: .7, opacity: .8 });
  if (open > .05) out.push({ t: "fill", d: ellipseD(0, .56 * hs, .12 * hs, .05 * hs * (1 + open)), fill: "shu", outline: .6 });
  for (const s of [-1, 1]) {
    const cx = s * .3, ey = -.1;
    if (blink) out.push({ t: "line", d: carvedLine([P(cx - .08, ey), P(cx, ey + .04), P(cx + .08, ey)], hs * .04, { taper: "both", minRatio: .4 }), color: "gofun" });
    else out.push({ t: "fill", d: ellipseD(cx * hs, ey * hs, .08 * hs, .065 * hs), fill: look.accent ?? b.iris, outline: .8 },
      { t: "dots", d: circleD(cx * hs, ey * hs, .045 * hs), color: "sumi" }, { t: "dots", d: circleD((cx + .025) * hs, (ey - .025) * hs, Math.max(.6, .016 * hs)), color: "gofun" });
  }
  return out;
}
function beastHead(b: Beast, species: string, hs: number, open: number, blink: boolean, look: UkiyoeCreatureLook, seed: number): Prim[] {
  if (species === "boar") return boarHead(b, hs, open, blink, look, seed);
  if (species === "bear") return bearHead(b, hs, open, blink, look, seed);
  if (species === "ox") return oxHead(b, hs, open, blink, look, seed);
  if (species === "mouse") return mouseHead(b, hs, open, blink, look, seed);
  if (species === "weasel") return weaselHead(b, hs, open, blink, look, seed);
  if (species === "tanuki") return tanukiHead(b, hs, open, blink, look, seed);
  const P = (x: number, y: number): Pt => [x * hs, y * hs];
  const color = look.color ?? b.color, belly = look.belly ?? b.belly, dark = look.dark ?? b.dark, out: Prim[] = [];
  const tq = look.view === "three-quarter";
  // Turned toward the viewer, the muzzle foreshortens (the horse's long head the most).
  const sn = b.snout * (tq ? .66 : 1), ruff = look.belly ?? b.ruff, longMuzzle = species === "fox" || species === "dog";
  // Ears behind the skull: a curved front edge, a dark back (fox), the inner ear pale with long hairs.
  const ear = (dx: number, tall: number, wide: number, tip: number, back: boolean): Prim[] => {
    const base: Pt[] = [P(dx - wide, -.5), P(dx - wide * .55 + tip * .4, -.55 - tall * .6), P(dx + tip, -.55 - tall), P(dx + wide * .7, -.62 - tall * .35), P(dx + wide, -.48)];
    const inner: Pt[] = [P(dx - wide * .5, -.56), P(dx - wide * .25 + tip * .5, -.55 - tall * .55), P(dx + tip * .92, -.55 - tall * .86), P(dx + wide * .45, -.6 - tall * .3), P(dx + wide * .55, -.52)];
    const hairs = [0, 1, 2, 3].map(i => { const a = P(dx - wide * .3 + i * wide * .25, -.56), e = P(dx + tip * .6 + (i - 1.5) * wide * .12, -.55 - tall * (.55 + .07 * i)); return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${e[0].toFixed(1)} ${e[1].toFixed(1)}`; }).join("");
    return [{ t: "fill", d: smoothD(base, true, .2), fill: back && species === "fox" ? dark : color, outline: 1.1 },
      { t: "fill", d: smoothD(inner, true, .2), fill: species === "rabbit" ? "sakura" : species === "fox" || species === "dog" ? "gofun" : dark, opacity: species === "rabbit" ? .85 : .9, noPrint: true },
      { t: "stroke", d: hairs, color: species === "rabbit" ? "beni" : "usuzumi", width: .7, opacity: .5 }];
  };
  if (b.ears === "fox") out.push(...ear(-.38, .95, .34, .06, true), ...ear(.04, 1.05, .32, .14, false));
  else if (b.ears === "dog") out.push(...ear(-.32, .66, .32, .1, true), ...ear(.04, .74, .3, .16, false));
  else if (b.ears === "cat") out.push(...ear(-.36, .6, .32, -.02, true), ...ear(.12, .64, .3, .06, false));
  else if (b.ears === "mouse") out.push({ t: "fill", d: ellipseD(-.5 * hs, -.62 * hs, .42 * hs, .4 * hs) + ellipseD(.02 * hs, -.78 * hs, .4 * hs, .38 * hs), fill: color, outline: 1.1 },
    { t: "fill", d: ellipseD(-.48 * hs, -.6 * hs, .28 * hs, .27 * hs) + ellipseD(.04 * hs, -.76 * hs, .27 * hs, .26 * hs), fill: "sakura", opacity: .85, noPrint: true });
  else if (b.ears === "round") out.push({ t: "fill", d: ellipseD(-.46 * hs, -.6 * hs, .27 * hs, .25 * hs) + ellipseD(.08 * hs, -.72 * hs, .25 * hs, .23 * hs), fill: dark, outline: 1.1 },
    { t: "fill", d: ellipseD(-.44 * hs, -.58 * hs, .14 * hs, .12 * hs) + ellipseD(.09 * hs, -.69 * hs, .13 * hs, .11 * hs), fill: belly, opacity: .7, noPrint: true });
  else if (b.ears === "horse") {
    // Tall, narrow, pointed ears on top of the poll, turning a little now and then.
    const flick = Math.sin(seed + 1) * .08;
    const hEar = (dx: number, lean: number): Prim[] => {
      const base: Pt[] = [P(dx - .13, -.62), P(dx - .12 + lean, -1.05), P(dx + .02 + lean * 1.4, -1.32), P(dx + .1 + lean, -1.02), P(dx + .14, -.6)];
      return [{ t: "fill", d: smoothD(base, true, .3), fill: color, outline: 1.1 }, { t: "fill", d: smoothD([P(dx - .05, -.68), P(dx - .03 + lean, -1.05), P(dx + .02 + lean * 1.3, -1.22), P(dx + .06 + lean, -1.0), P(dx + .07, -.66)], true, .3), fill: dark, opacity: .8, noPrint: true }];
    };
    out.push(...hEar(-.42, -.06 + flick), ...hEar(-.22, .05 - flick));
  } else if (b.ears === "monkey") {
    // Small, rounded, nearly bare ears low at the side of the head.
    out.push({ t: "fill", d: smoothD([P(-.42, -.32), P(-.58, -.42), P(-.68, -.22), P(-.6, -.02), P(-.44, -.06)], true, .5), fill: b.face ?? "hada", outline: 1, opacity: .95 },
      { t: "stroke", d: smoothD([P(-.5, -.3), P(-.6, -.22), P(-.54, -.1)], false, .5), color: "kogecha", width: .7, opacity: .7 });
  } else if (b.ears === "rabbit") {
    const flop = Math.sin(seed) * .1;
    const longEar = (x0: number, x1: number, tipX: number, tipY: number): Prim[] => {
      const outerE: Pt[] = [P(x0, -.5), P(x0 - .22 + flop, -1.3), P(tipX + flop, tipY), P(x1 + .1 + flop * .5, -1.3), P(x1, -.52)];
      const innerE: Pt[] = [P(x0 + .07, -.62), P(x0 - .12 + flop, -1.3), P(tipX + flop + .02, tipY + .2), P(x1 + .02 + flop * .5, -1.3), P(x1 - .06, -.6)];
      return [{ t: "fill", d: smoothD(outerE, true, .42), fill: color, outline: 1.1 }, { t: "fill", d: smoothD(innerE, true, .42), fill: "sakura", opacity: .85, noPrint: true },
        { t: "stroke", d: furAlong([P((x0 + x1) / 2, -.6), P(tipX + flop, tipY + .25)], hs * .16, 7, hs * .25, seed + Math.round(x0 * 100)), color: "beni", width: .6, opacity: .35 }];
    };
    out.push(...longEar(-.52, -.18, -.5, -2.0), ...longEar(-.16, .14, .1, -2.05));
  }
  out.push(...hornsSide(b, hs));
  // Skull: occiput, crown, forehead, the stop between the eyes, the muzzle down to the nose, the jaw and the throat.
  // The horse's head is its own shape: a flat forehead and a straight nose, a deep rounded muzzle and chin, and the
  // big round jowl at the back of the jaw.
  const skull: Pt[] = species === "horse"
    ? [P(-.62, .02), P(-.5, -.5), P(-.15, -.62), P(.4, -.52), P(1.1, -.36), P(1.6, -.22), P(1.78, -.02), P(1.74, .22), P(1.56, .36), P(1.36, .36), P(1.2, .44), P(.75, .42), P(.15, .6), P(-.3, .55)]
    : [P(-.72, .08), P(-.62, -.5), P(-.2, -.72), P(.24, -.62), P(.46, -.4), P(.5 + .62 * sn, -.12), P(.6 + .72 * sn, .04), P(.56 + .66 * sn, .16),
      P(.44 + .5 * sn, .26), P(.12, .44), P(-.36, .52)];
  // No key line under the skull, where the head flows into the neck: the line runs from the nape over the crown and down
  // the face to the jaw.
  out.push({ t: "fill", d: smoothD(skull, true, .36), fill: color, grain: .2 });
  const faceLine = smoothPts(skull.slice(0, species === "horse" ? 13 : 10), 5, false);
  out.push({ t: "line", d: carvedLine(faceLine, hs * .05, { taper: "both", minRatio: .25, smooth: true }), color: "sumi" });
  // Pale muzzle and cheek (fox, dog: urajiro), or a dark mask (tanuki).
  if (longMuzzle || species === "cat" || species === "rabbit")
    out.push({ t: "fill", d: smoothD([P(-.5, .38), P(-.1, .06), P(.3, .04), P(.5 + .6 * sn, .06), P(.56 + .66 * sn, .16), P(.42 + .48 * sn, .28), P(.1, .45), P(-.36, .52)], true, .4), fill: ruff, noPrint: true });
  if (species === "tanuki") out.push({ t: "fill", d: smoothD([P(-.38, -.28), P(-.05, -.44), P(.36, -.32), P(.62, -.08), P(.42, .14), P(.1, .04), P(-.25, .14), P(-.45, .02)], true, .45), fill: dark, opacity: .95 });
  if (b.face) {
    // The macaque's bare red face: a heart-shaped mask from the brow over the eyes and muzzle, ringed by grey fur.
    out.push({ t: "fill", d: smoothD([P(.12, -.42), P(.38, -.48), P(.62, -.32), P(.72, -.04), P(.64, .22), P(.42, .36), P(.2, .3), P(.1, .06), P(.04, -.2)], true, .4), fill: b.face, outline: .8, grain: .3 });
    out.push({ t: "fill", d: smoothD([P(.06, -.42), P(.34, -.5), P(.6, -.34), P(.36, -.36)], true, .4), fill: "sumi", opacity: .18, noPrint: true });
  }
  if (species === "horse") {
    // The long face: the cheek's round jowl, the bony line down the nose, the soft muzzle and the chin.
    out.push({ t: "line", d: carvedLine(smoothPts([P(-.35, -.1), P(-.25, .3), P(.1, .5), P(.5, .35), P(.6, .1)], 5, false), hs * .035, { taper: "both", minRatio: .2, smooth: true }), color: "sumi", opacity: .7 });
    out.push({ t: "fill", d: smoothD([P(1.25, -.3), P(1.6, -.22), P(1.78, -.02), P(1.74, .22), P(1.56, .36), P(1.3, .3)], true, .4), fill: "sumi", opacity: .32, noPrint: true });
    out.push({ t: "line", d: carvedLine([P(.15, -.48), P(.8, -.36), P(1.3, -.24)], hs * .02, { taper: "both", minRatio: .3, smooth: true }), color: dark, opacity: .5 });
    out.push({ t: "line", d: carvedLine([P(1.72, .22), P(1.5, .26), P(1.34, .3)], hs * .035, { taper: "end", minRatio: .3, smooth: true }), color: "sumi" });
    out.push({ t: "fill", d: smoothD([P(-.5, -.5), P(-.25, -.75), P(.05, -.72), P(.1, -.5), P(-.1, -.38)], true, .4), fill: b.mane ?? "sumi", outline: .7 });
  }
  // Cheek ruff: long fur flaring back from the jaw (fox, tanuki, rabbit).
  if (b.fur > .1) {
    // A pale lobe of long hair from the cheek back under the ear, its edge breaking into locks lying back.
    const lobe = [P(.25, .32), P(-.05, .3), P(-.4, .18), P(-.66, .1)], under = [P(-.66, .1), P(-.55, .45), P(-.2, .56), P(.18, .44)];
    const edge = tufted(smoothPts(under, 4, false), () => hs * b.fur * .9, 1, () => -1, seed + 41);
    out.push({ t: "fill", d: polyD([...smoothPts(lobe, 4, false), ...edge]), fill: species === "tanuki" ? belly : ruff, noPrint: true });
    out.push({ t: "stroke", d: furAlong([P(.1, .38), P(-.5, .32)], hs * .3, 8, hs * .2, seed + 42), color: "usuzumi", width: .55, opacity: .45 });
  }
  // Fur on the face: short strokes from the forehead back over the crown, and along the muzzle.
  out.push({ t: "stroke", d: furField([P(-.6, -.42), P(-.1, -.62), P(.38, -.42)], [P(-.6, .1), P(-.1, -.12), P(.38, -.2)], 14, hs * .16, seed + 43), color: dark, width: .65, opacity: .45 });
  // Mouth: the jaw opens below a black lip line that runs from the nose back to the corner of the mouth.
  if (open > .05) out.push({ t: "fill", d: smoothD([P(.16, .24), P(.5 + .6 * sn, .14), P(.44 + .48 * sn, .26 + .36 * open), P(.1, .34 + .1 * open)], true, .3), fill: "shu", outline: 1 },
    { t: "fill", d: polyD([P(.38 + .46 * sn, .15), P(.42 + .5 * sn, .25), P(.34 + .42 * sn, .17)]), fill: "gofun", noPrint: true });
  if (species !== "horse") out.push({ t: "line", d: carvedLine([P(.58 + .68 * sn, .12), P(.4 + .45 * sn, .24), P(.14, .26)], hs * .05, { taper: "end", minRatio: .3, smooth: true }), color: "sumi" });
  if (b.tusks) out.push({ t: "fill", d: smoothD([P(.3 + .4 * sn, .22), P(.4 + .48 * sn, .0), P(.52 + .56 * sn, -.3), P(.58 + .58 * sn, -.32), P(.48 + .52 * sn, .02), P(.4 + .46 * sn, .26)], true, .3), fill: "gofun", outline: 1 });
  // Nose leather with a nostril, and a line up the bridge of the muzzle.
  if (species === "horse") out.push({ t: "fill", d: smoothD([P(1.5, -.06), P(1.66, -.06), P(1.64, .06), P(1.52, .05)], true, .5), fill: "sumi", opacity: .85 });
  else if (species === "monkey") out.push({ t: "dots", d: circleD((.56 + .7 * sn) * hs, .06 * hs, hs * .035) + circleD((.5 + .7 * sn) * hs, .08 * hs, hs * .035), color: "sumi" });
  else out.push({ t: "fill", d: smoothD([P(.52 + .66 * sn, -.04), P(.63 + .74 * sn, .0), P(.62 + .72 * sn, .1), P(.53 + .64 * sn, .1)], true, .4), fill: species === "rabbit" ? "sakura" : "sumi", outline: .6 });
  if (species !== "horse") out.push({ t: "line", d: carvedLine([P(.42, -.36), P(.52 + .6 * sn, -.12)], hs * .03, { taper: "both", minRatio: .3 }), color: dark, opacity: .55 });
  // Eye: dark rim (heavier on the upper lid), iris, pupil (slit for fox and cat), catchlight; brow hairs above it.
  // The monkey's eyes look forward from under a heavy brow; the horse's sit high and far back on its long head.
  const ex = species === "tanuki" ? .14 : species === "monkey" ? .36 : species === "horse" ? .04 : .1, ey = species === "horse" ? -.3 : species === "monkey" ? -.22 : -.24;
  const ew = species === "rabbit" ? .13 : species === "monkey" ? .12 : .16, eh = species === "rabbit" ? .11 : species === "monkey" ? .1 : .09;
  if (blink) out.push({ t: "line", d: carvedLine([P(ex - ew, ey), P(ex, ey + .05), P(ex + ew * 1.05, ey - .01)], hs * .055, { taper: "both", minRatio: .4 }), color: "sumi" });
  else {
    const almond = smoothD([P(ex - ew, ey + .02), P(ex - ew * .2, ey - eh), P(ex + ew * 1.05, ey - .02), P(ex + ew * .1, ey + eh * .85)], true, .5);
    out.push({ t: "fill", d: almond, fill: look.accent ?? b.iris, outline: 1.2 });
    out.push(b.slit ? { t: "fill", d: ellipseD((ex + .02) * hs, ey * hs, hs * .025, hs * eh * .8), fill: "sumi" } : { t: "dots", d: circleD((ex + .02) * hs, ey * hs, hs * eh * .62), color: "sumi" });
    out.push({ t: "dots", d: circleD((ex + .05) * hs, (ey - eh * .35) * hs, Math.max(.7, hs * .022)), color: "gofun" });
    out.push({ t: "line", d: carvedLine([P(ex - ew * 1.05, ey - .01), P(ex - ew * .1, ey - eh * 1.05), P(ex + ew * 1.1, ey - .03)], hs * .045, { taper: "both", minRatio: .3, smooth: true }), color: "sumi" });
  }
  out.push({ t: "stroke", d: [0, 1, 2].map(i => { const a = P(ex - .06 + i * .09, ey - .16), e = P(ex - .12 + i * .1, ey - .28 - i * .02); return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${e[0].toFixed(1)} ${e[1].toFixed(1)}`; }).join(""), color: dark, width: .7, opacity: .6 });
  if (tq && species !== "horse") {
    // The far eye, foreshortened by the turn of the head, just inside the far edge of the face beyond the bridge of the
    // nose; and the stop between the eyes as a short line.
    const fx = ex + .34 + .1 * sn, fw = ew * .55, fy = ey - .02;
    if (blink) out.push({ t: "line", d: carvedLine([P(fx - fw, fy), P(fx, fy + .03), P(fx + fw, fy - .01)], hs * .045, { taper: "both", minRatio: .4 }), color: "sumi" });
    else {
      out.push({ t: "fill", d: smoothD([P(fx - fw, fy + .01), P(fx - fw * .1, fy - eh * .85), P(fx + fw, fy - .01), P(fx, fy + eh * .7)], true, .5), fill: look.accent ?? b.iris, outline: 1 });
      out.push(b.slit ? { t: "fill", d: ellipseD((fx + .01) * hs, fy * hs, hs * .018, hs * eh * .65), fill: "sumi" } : { t: "dots", d: circleD((fx + .01) * hs, fy * hs, hs * eh * .45), color: "sumi" });
    }
    out.push({ t: "line", d: carvedLine([P(ex + .2, ey - .08), P(ex + .26, ey + .06)], hs * .03, { taper: "both", minRatio: .3 }), color: dark, opacity: .6 });
  } else if (tq) {
    // The horse's far eye sits round the side of its long head: only its upper rim shows over the forehead.
    out.push({ t: "line", d: carvedLine([P(ex + .3, ey - .06), P(ex + .38, ey - .1), P(ex + .46, ey - .06)], hs * .04, { taper: "both", minRatio: .3 }), color: "sumi" });
  }
  // Whisker pads and whiskers.
  if (species !== "horse" && species !== "monkey") out.push({ t: "dots", d: [0, 1, 2].map(i => circleD((.36 + .42 * sn + i * .05) * hs, (.14 + (i % 2) * .05) * hs, hs * .018)).join(""), color: "sumi" });
  if (species === "cat" || species === "rabbit" || species === "tanuki" || species === "fox")
    out.push({ t: "stroke", d: [0, 1, 2].map(i => `M${((.38 + .44 * sn) * hs).toFixed(1)} ${((.15 + i * .05) * hs).toFixed(1)}q${(hs * .4).toFixed(1)} ${(hs * (i - 1) * .05).toFixed(1)} ${(hs * .8).toFixed(1)} ${(hs * ((i - 1) * .16 + .04)).toFixed(1)}`).join(""), color: "sumi", width: .7, opacity: .55 });
  // The baku's trunk: a ringed, tapering trunk hanging from the muzzle and curling at the tip.
  if (b.trunk) out.push({ t: "fill", d: carvedLine(smoothPts([P(.58 + .66 * sn, .02), P(.8 + .7 * sn, .3), P(.78 + .7 * sn, .75), P(.62 + .66 * sn, 1.0), P(.74 + .66 * sn, 1.1)], 4, false), hs * .2, { taper: "end", minRatio: .35, smooth: true }), fill: look.color ?? b.color, outline: 1.1 },
    { t: "stroke", d: [.25, .45, .65, .85].map(v => `M${((.68 + .68 * sn) * hs).toFixed(1)} ${(v * hs).toFixed(1)}h${(hs * .16).toFixed(1)}`).join(""), color: "sumi", width: .7, opacity: .5 });
  out.push(...headExtras(look, P, hs, ex, ey, sn, blink));
  return out;
}

/**
 * A four-legged animal seen square on, from the front or from behind (look.view "front" / "back"), from the same
 * action weights as the profile rig: walking lifts the legs in turn, sitting folds the haunches into a wide base,
 * sleeping curls it low. From the front: the face (both eyes, both ears, the muzzle pointing at us with the nose leather
 * at its tip, the species' markings), the chest ruff, the front legs side by side and the hind legs peeking behind.
 * From behind: the backs of the ears over the shoulders, the rump with the tail down its middle, the hind legs side by side.
 */
function quadFrontBack(species: QuadSpecies, spec: UkiyoeCreatureSpec, frame: number, wind: number, seed: number, back: boolean): Prim[] {
  const b = BEASTS[species], look = spec.look ?? {}, k = (look.size ?? b.L) / b.L, out: Prim[] = [];
  // Square on, the boar's great wedge of a head is nearly as wide as its chest and is carried low.
  const leg = b.leg * k, bh = b.bh * k, hs = b.head * k * (species === "boar" ? 1.3 : 1), W = bh * (species === "horse" ? .72 : .85);
  const color = look.color ?? b.color, belly = look.belly ?? b.belly, dark = look.dark ?? b.dark, stocking = look.color ? undefined : b.stocking;
  const st = actionState(spec.actions ?? [], frame), tr = creatureTravel(spec.actions ?? [], frame);
  const sit = Math.max(st("sit").w, st("sleep").w), sleep = st("sleep").w, moving = tr.moving ? 1 : 0;
  const ph = tr.dist / (b.L * k * .9) * Math.PI * 2, line = 1.1;
  const lift = (phase: number) => moving * Math.max(0, Math.sin(ph + phase)) * leg * .18;
  // Sitting, the chest stays up on straight front legs and the haunches spread at the base; sleeping lies low.
  const sitUp = sit * (1 - sleep), bodyTop = -leg - bh * .55 + sitUp * leg * .15 + sleep * leg * .8, bodyBot = bodyTop + bh * (1 + sitUp * .15);
  out.push({ t: "fill", d: ellipseD(0, 2, W * 1.3, bh * .14), fill: "sumi", opacity: .12, noPrint: true });
  const blink = (frame + (seed % 97)) % 97 < 4 || sleep > .5;
  // The folk tanuki standing (or drumming) is drawn upright square on.
  if (species === "tanuki" && Math.max(st("stand").w, st("drum").w) > .5) return out.concat(tanukiUpright(b, look, k, frame, seed, back, blink, st("drum").w));
  // Foxfire orbs circle the animal; the kyūbi's tails fan out behind it like a spread fan.
  const tails = species === "fox" || species === "cat" ? clamp(Math.round(look.tails ?? 1), 1, 9) : 1;
  const foxfire = (): Prim[] => !(look.foxfire || tails > 1) ? [] : Array.from({ length: 3 + tails }, (_, i): Prim[] => {
    const a = frame / 40 + i * 2.1, c: Pt = [Math.cos(a) * W * (2 + .5 * hash01(seed, i)), bodyTop - bh * .5 + Math.sin(a * 1.3) * bh * .9], fl = .7 + .3 * Math.abs(noise1(seed + i, frame / 4));
    return [{ t: "glow", cx: c[0], cy: c[1], r: hs * 1.6, color: "sora", opacity: .55 * fl },
      { t: "fill", d: smoothD([add(c, [-hs * .2, 0]), add(c, [0, -hs * .55 * fl]), add(c, [hs * .2, 0]), add(c, [0, hs * .18])], true, .5), fill: "gofun", opacity: .95, noPrint: true }];
  }).flat();
  const fan = (): Prim[] => {
    if (tails < 2) return [];
    const root: Pt = [0, bodyTop + bh * .45], len = b.tail * k * .85, w = b.tailW * k * .8, res: Prim[] = [];
    for (let t = 0; t < tails; t++) {
      const f = t / (tails - 1) - .5, ang = f * 2.4 + Math.sin(frame / 13 + t * 1.7 + seed) * .06 - wind * .05;
      const tip: Pt = [root[0] + Math.sin(ang) * len, root[1] - Math.cos(ang) * len * .9], mid: Pt = [root[0] + Math.sin(ang) * len * .45 + f * bh * .3, root[1] - Math.cos(ang) * len * .55 + bh * .1];
      res.push({ t: "fill", d: carvedLine([root, mid, tip], w, { taper: "swell", minRatio: .35, smooth: true }), fill: color, outline: line * .9, grain: .3 });
      if (b.tailTip && !look.color) res.push({ t: "fill", d: ellipseD(tip[0], tip[1], w * .42, w * .38), fill: b.tailTip });
    }
    return res;
  };
  // A leg seen end-on: a column narrowing to the paw (a hoof for the horse), lifting in turn when it walks.
  const column = (x: number, top: number, phase: number, w: number, far: boolean): Prim[] => {
    const up = lift(phase), foot = -up, pw = w * .9;
    const d = smoothD([[x - w, top], [x + w, top], [x + w * .7, foot - pw * .8], [x + pw, foot], [x - pw, foot], [x - w * .7, foot - pw * .8]], true, .3);
    const res: Prim[] = [{ t: "fill", d, fill: species === "tanuki" ? dark : color, outline: line, grain: .2 }];
    if (stocking) res.push({ t: "fill", d: smoothD([[x - w * .72, foot - leg * .45], [x + w * .72, foot - leg * .45], [x + pw, foot], [x - pw, foot]], true, .3), fill: stocking, opacity: .9 });
    if (b.hoof) {
      res.push({ t: "fill", d: polyD([[x - pw * 1.05, foot - pw * .9], [x + pw * 1.05, foot - pw * .9], [x + pw * 1.15, foot + 1], [x - pw * 1.15, foot + 1]]), fill: "sumi", outline: line });
      if (species !== "horse") res.push({ t: "stroke", d: `M${x.toFixed(1)} ${(foot + 1).toFixed(1)}l0 ${(-pw * .85).toFixed(1)}`, color: "usuzumi", width: .8, opacity: .8 });
    } else res.push({ t: "stroke", d: [-.4, .4].map(f => `M${(x + pw * f).toFixed(1)} ${(foot + 1).toFixed(1)}l0 ${(-pw * .6).toFixed(1)}`).join(""), color: b.claws ? "usuzumi" : "sumi", width: .8, opacity: .8 });
    if (b.claws) res.push({ t: "fill", d: [-.6, 0, .6].map(f => carvedLine([[x + pw * f, foot - pw * .2], [x + pw * f * 1.1, foot + pw * .25], [x + pw * f * 1.15, foot + pw * .45]], pw * .22, { taper: "end", minRatio: .15, smooth: true })).join(""), fill: "usuzumi", outline: .6 });
    if (far) res.push({ t: "fill", d, fill: "sumi", opacity: .2, noPrint: true });
    return res;
  };
  const legW = bh * (species === "horse" ? .12 : species === "boar" ? .1 : .14) * (b.paw ? 1 + (b.paw - 1) * .6 : 1);
  // Far pair first (the hind legs from the front, the front legs from behind), drawn a little higher and inside.
  if (sleep < .5) {
    for (const s of [-1, 1]) out.push(...column(s * W * .55, bodyBot - bh * .3, s > 0 ? 0 : Math.PI, legW * .85, true));
  }
  // The tail: from behind it hangs down the middle of the rump; from the front a brush may show beside the body.
  const tailSway = Math.sin(frame / 11 + seed) * .15 - wind * .1;
  const tail = (): Prim[] => {
    const root: Pt = [0, bodyTop + bh * .25], len = b.tail * k * (species === "horse" ? .9 : .7);
    if (species === "rabbit") return [{ t: "fill", d: ellipseD(0, bodyTop + bh * .35, bh * .22, bh * .2), fill: "gofun", outline: line }];
    // A hanging tail stops short of the ground; the nue's snake rears up over the rump in an S and looks back.
    const tip: Pt = species === "dog" ? [bh * .1, bodyTop - bh * .45] : species === "cat" ? [bh * .25, bodyTop - bh * .7]
      : species === "nue" ? [W * .75 + tailSway * bh, bodyTop - bh * .75] : [root[0] + tailSway * len, Math.min(root[1] + len * (species === "horse" ? .95 : .75), -bh * .08)];
    const mid: Pt = species === "cat" ? [bh * .35, bodyTop - bh * .1] : species === "nue" ? [W * .2, bodyTop + bh * .55] : [(root[0] + tip[0]) / 2 + tailSway * len * .3, (root[1] + tip[1]) / 2];
    const w = b.tailW * k * (species === "fox" || species === "tanuki" ? 1.1 : .8);
    const res: Prim[] = [{ t: "fill", d: carvedLine([root, mid, tip], w, { taper: species === "fox" || species === "tanuki" ? "swell" : "end", minRatio: .35, smooth: true }), fill: species === "horse" ? b.mane ?? "sumi" : species === "nue" ? "matsu" : color, outline: line, grain: .3, ...(species === "nue" ? { pattern: { type: "uroko" as const, color: "kusa", scale: .35, opacity: .7 } } : {}) }];
    // The nue's tail is a snake: its head at the end, eye and tongue.
    if (species === "nue") res.push({ t: "fill", d: ellipseD(tip[0], tip[1] - w * .4, w * .9, w * 1.1), fill: "matsu", outline: line }, { t: "dots", d: circleD(tip[0] - w * .35, tip[1] - w * .6, w * .18) + circleD(tip[0] + w * .35, tip[1] - w * .6, w * .18), color: "ki" },
      { t: "stroke", d: `M${tip[0].toFixed(1)} ${(tip[1] - w * 1.5).toFixed(1)}l0 ${(-w * .5).toFixed(1)}l${(-w * .25).toFixed(1)} ${(-w * .3).toFixed(1)}M${tip[0].toFixed(1)} ${(tip[1] - w * 2).toFixed(1)}l${(w * .25).toFixed(1)} ${(-w * .3).toFixed(1)}`, color: "shu", width: 1 });
    if (b.tailTip && !look.color) res.push({ t: "fill", d: ellipseD(tip[0], tip[1] - w * .1, w * .4, w * .35), fill: b.tailTip });
    return res;
  };
  if (back) {
    // Behind: the rump (haunches swelling at the sides), the tail, the hind legs; the head's back over the shoulders.
    // (The horse's head stands high on its neck, the mane falling down the back of it.)
    out.push(...fan());
    const horse = species === "horse", headBackY = bodyTop - hs * (horse ? 1.55 : .45);
    if (horse) out.push({ t: "fill", d: smoothD([[-hs * .35, bodyTop + bh * .1], [-hs * .3, headBackY], [hs * .3, headBackY], [hs * .35, bodyTop + bh * .1]], true, .3), fill: color, outline: line },
      { t: "fill", d: carvedLine([[0, headBackY - hs * .2], [0, bodyTop + bh * .15]], hs * .28, { taper: "end", minRatio: .5 }), fill: b.mane ?? "sumi", outline: .8 });
    const bear = species === "bear";
    out.push(...beastEars(b, species, hs * (bear ? .85 : 1), color, dark, true).map(p => shift(p, 0, headBackY + (horse ? hs * .9 : bear ? hs * .2 : 0))));
    out.push({ t: "fill", d: ellipseD(0, headBackY + hs * .1, hs * (horse ? .42 : bear ? .78 : .62), hs * (horse ? .5 : bear ? .6 : .55)), fill: color, outline: line, grain: .2 });
    if (sitUp > .3 && sleep < .5) for (const s2 of [-1, 1]) out.push({ t: "fill", d: ellipseD(s2 * W * .62, -bh * .32, W * .5, bh * .36), fill: color, outline: line, grain: .3 });
    const rumpPts: Pt[] = [[-W * .95, bodyTop + bh * .35], [-W * .85, bodyTop], [0, bodyTop - bh * .12], [W * .85, bodyTop], [W * .95, bodyTop + bh * .35], [W * .75, bodyBot], [0, bodyBot + bh * .05], [-W * .75, bodyBot]];
    const rump = species === "bear" ? shaggy(rumpPts, bodyBot, bh, seed + 48) : smoothD(rumpPts, true, .4);
    out.push({ t: "fill", d: rump, fill: { type: "linear", angle: 90, stops: [[0, color, 1], [.8, color, 1], [1, belly, 1]] }, outline: line * 1.1, grain: .3 });
    out.push({ t: "clip", d: rump, key: "rumpfur", prims: [{ t: "stroke", d: furField([[-W * .9, bodyTop + bh * .1], [0, bodyTop - bh * .05], [W * .9, bodyTop + bh * .1]], [[-W * .8, bodyBot], [0, bodyBot], [W * .8, bodyBot]], Math.round(40 * b.hairs), bh * .16, seed + 31), color: dark === color ? "usuzumi" : dark, width: .55, opacity: .45 },
      ...(b.stripes && !look.color ? [{ t: "fill" as const, d: [-.6, -.2, .2, .6].map(f => carvedLine([[f * W, bodyTop], [f * W * 1.1, bodyTop + bh * .5]], bh * .1, { taper: "end", minRatio: .1 })).join(""), fill: "sumi", opacity: .85 }] : [])] });
    if (sleep < .5 && sitUp < .3) for (const s of [-1, 1]) out.push(...column(s * W * .5, bodyBot - bh * .25, s > 0 ? Math.PI : 0, legW, false));
    if (tails < 2) out.push(...tail());
    return out.concat(foxfire());
  }
  // Front: the body behind the chest, the front legs, the chest ruff, then the head.
  out.push(...fan());
  if ((species === "fox" && tails < 2) || species === "tanuki" || species === "cat") {
    const tl = tail(); out.push({ t: "group", transform: `translate(${(W * 1.05).toFixed(1)} ${(-bh * .3).toFixed(1)}) rotate(-25)`, prims: tl });
  }
  if (sitUp > .3 && sleep < .5) for (const s2 of [-1, 1]) out.push({ t: "fill", d: ellipseD(s2 * W * .85, -bh * .38, W * .55, bh * .42), fill: color, outline: line, grain: .3 }, { t: "fill", d: ellipseD(s2 * W * 1.05, -bh * .08, bh * .22, bh * .1), fill: species === "tanuki" ? dark : stocking ?? color, outline: line });
  const chestPts: Pt[] = [[-W * .9, bodyTop + bh * .3], [-W * .7, bodyTop - bh * .05], [0, bodyTop - bh * .15], [W * .7, bodyTop - bh * .05], [W * .9, bodyTop + bh * .3], [W * .7, bodyBot], [-W * .7, bodyBot]];
  // Long-coated beasts (the bear) carry a ragged edge of hair round the shoulders and down both flanks, lying downward.
  const chest = species === "bear" ? shaggy(chestPts, bodyBot, bh, seed + 47) : smoothD(chestPts, true, .4);
  out.push({ t: "fill", d: chest, fill: color, outline: line * 1.1, grain: .3 });
  if (dark === color) out.push({ t: "clip", d: chest, key: "chestfur", prims: [{ t: "stroke", d: furField([[-W * .85, bodyTop + bh * .1], [0, bodyTop - bh * .08], [W * .85, bodyTop + bh * .1]], [[-W * .7, bodyBot], [0, bodyBot], [W * .7, bodyBot]], Math.round(30 * b.hairs), bh * .15, seed + 32), color: "usuzumi", width: .5, opacity: .4 }] });
  out.push({ t: "fill", d: smoothD([[-W * .45, bodyTop + bh * .05], [W * .45, bodyTop + bh * .05], [W * .3, bodyBot - bh * .1], [0, bodyBot + bh * .05], [-W * .3, bodyBot - bh * .1]], true, .45), fill: species === "tanuki" ? belly : b.ruff, noPrint: true });
  if (b.fur > .1) out.push({ t: "fill", d: polyD(tufted(smoothPts([[-W * .4, bodyBot - bh * .3], [0, bodyBot + bh * .08], [W * .4, bodyBot - bh * .3]], 4, false), () => bh * b.fur * .7, -1, () => 0, seed + 41).concat([[0, bodyTop + bh * .1]])), fill: species === "tanuki" ? belly : b.ruff, noPrint: true });
  // The moon bear's white crescent, a broad V across the chest.
  if (b.crescent && !look.color) out.push({ t: "fill", d: carvedLine([[-W * .55, bodyTop + bh * .1], [0, bodyTop + bh * .42], [W * .55, bodyTop + bh * .1]], bh * .13, { taper: "both", minRatio: .3, smooth: true }), fill: "gofun", opacity: .95 });
  if (sleep < .5) for (const s of [-1, 1]) out.push(...column(s * W * .38, bodyBot - bh * .35, s > 0 ? 0 : Math.PI, legW, false));
  // The head square on.
  const hy = bodyTop - hs * (species === "horse" ? 1.6 : species === "boar" ? .3 : .55) + sleep * hs * .8;
  out.push(...beastEars(b, species, hs, color, dark, false).map(p => shift(p, 0, hy)));
  out.push({ t: "group", transform: `translate(0 ${hy.toFixed(1)})`, prims: beastFace(b, species, hs, look, blink, st("howl").w) });
  return out.concat(foxfire());
}
/**
 * The folk tanuki standing on its hind legs, square on: the round belly it drums with both forepaws (from the front), the
 * straw hat and the sake bottle hanging from one paw; from behind, the round back, the brush of the tail and the hat.
 */
function tanukiUpright(b: Beast, look: UkiyoeCreatureLook, k: number, frame: number, seed: number, back: boolean, blink: boolean, drum: number): Prim[] {
  const out: Prim[] = [], bh = b.bh * k, hs = b.head * k, leg = b.leg * k, color = look.color ?? b.color, dark = look.dark ?? b.dark, belly = look.belly ?? b.belly;
  const W = bh * .95, cy = -leg * .5 - bh * 1.0, top = cy - bh * 1.05, line = 1.1;
  // Short hind legs, the feet turned out.
  for (const s of [-1, 1]) out.push({ t: "fill", d: smoothD([[s * W * .2, cy + bh * .5], [s * W * .62, cy + bh * .5], [s * W * .7, -bh * .12], [s * W * .85, 0], [s * W * .2, 0], [s * W * .25, -bh * .15]], true, .35), fill: dark, outline: line, grain: .2 });
  const tailBack: Prim[] = !back ? [] : [{ t: "fill", d: carvedLine([[0, cy + bh * .3], [bh * .08, cy + bh * .9], [0, -bh * .1]], b.tailW * k * 1.2, { taper: "swell", minRatio: .4, smooth: true }), fill: color, outline: line, grain: .3 },
    { t: "fill", d: [.35, .6].map(f => ellipseD(bh * .06, cy + bh * .3 + f * bh * .7, b.tailW * k * .9, bh * .05)).join(""), fill: dark, opacity: .8 }];
  const body = smoothD([[0, top], [W * .8, top + bh * .3], [W * 1.05, cy + bh * .2], [W * .8, cy + bh * .85], [0, cy + bh * 1.0], [-W * .8, cy + bh * .85], [-W * 1.05, cy + bh * .2], [-W * .8, top + bh * .3]], true, .45);
  out.push({ t: "fill", d: body, fill: color, outline: line * 1.1, grain: .3 });
  out.push({ t: "clip", d: body, key: "tanukifur", prims: [{ t: "stroke", d: furField([[-W, top + bh * .2], [0, top], [W, top + bh * .2]], [[-W * .8, cy + bh * .9], [0, cy + bh], [W * .8, cy + bh * .9]], 36, bh * .16, seed + 33), color: dark, width: .55, opacity: .45 }] });
  out.push(...tailBack);
  // Forelegs: from the front both paws beat the drum of the belly; from behind the elbows show at the sides.
  const beat = Math.sin(frame / 2.4) * drum;
  if (!back) {
    out.push({ t: "fill", d: ellipseD(0, cy + bh * .25, W * .62, bh * .62), fill: belly, outline: line, grain: .2 });
    for (const s of [-1, 1]) {
      const hand: Pt = [s * W * (.42 + .1 * drum), cy + bh * (.05 + .12 * (s > 0 ? beat : -beat))];
      out.push({ t: "fill", d: carvedLine([[s * W * .82, top + bh * .4], [s * W * 1.0, cy - bh * .05], hand], bh * .17, { taper: "end", minRatio: .7, smooth: true }), fill: dark, outline: line });
      out.push({ t: "fill", d: ellipseD(hand[0], hand[1], bh * .14, bh * .12), fill: dark, outline: line });
    }
  } else for (const s of [-1, 1]) out.push({ t: "fill", d: smoothD([[s * W * .9, top + bh * .35], [s * W * 1.12, cy], [s * W * .98, cy + bh * .3], [s * W * .85, cy]], true, .4), fill: dark, outline: line });
  if (look.bottle) {
    const h: Pt = [W * (back ? -1.1 : 1.1), cy + bh * .7];
    out.push({ t: "stroke", d: `M${h[0].toFixed(1)} ${(cy + bh * .15).toFixed(1)}L${h[0].toFixed(1)} ${(h[1] - 14 * k).toFixed(1)}`, color: "cha", width: 1 },
      { t: "fill", d: smoothD([add(h, [-8 * k, 0]), add(h, [-6 * k, -16 * k]), add(h, [-2 * k, -20 * k]), add(h, [2 * k, -16 * k]), add(h, [8 * k, 0]), add(h, [6 * k, 16 * k]), add(h, [-6 * k, 16 * k])], true, .4), fill: "gofun", outline: 1.1, pattern: { type: "shima", color: "ai", scale: .3 } });
  }
  const hy = top - hs * .35;
  out.push(...beastEars(b, "tanuki", hs, color, dark, back).map(p => shift(p, 0, hy)));
  if (back) out.push({ t: "fill", d: ellipseD(0, hy + hs * .1, hs * .62, hs * .55), fill: color, outline: line, grain: .2 });
  else out.push({ t: "group", transform: `translate(0 ${hy.toFixed(1)})`, prims: beastFace(b, "tanuki", hs, look, blink, 0) });
  if (look.hat) out.push({ t: "group", transform: `translate(0 ${(hy - hs * .55).toFixed(1)})`, prims: [
    { t: "fill", d: smoothD([[-hs * 1.45, hs * .18], [-hs * .5, -hs * .1], [0, -hs * .62], [hs * .5, -hs * .1], [hs * 1.45, hs * .18], [0, hs * .32]], true, .3), fill: "kincha", outline: 1.2, grain: .7 },
    { t: "stroke", d: [-1, -.5, 0, .5, 1].map(f => `M${(f * hs * .12).toFixed(1)} ${(-hs * .55).toFixed(1)}L${(f * hs * 1.3).toFixed(1)} ${(hs * .2).toFixed(1)}`).join(""), color: "cha", width: .7, opacity: .6 }] });
  return out;
}
/**
 * A square-on body outline (left flank, top, right flank, bottom) whose flanks and top break into locks lying downward,
 * the same on both sides: the outline is walked from the bottom centre so each flank gets its own stretch.
 */
function shaggy(pts: readonly Pt[], bot: number, bh: number, seed: number): string {
  // Re-start the ring at the bottom centre: bottom-left, left flank up, over the top, right flank down, bottom-right.
  const ring: Pt[] = [[0, bot + bh * .02], ...pts.slice(6), ...pts.slice(0, 6)];
  return polyD(tufted(smoothPts(ring, 4), u => bh * .06 * (u > .1 && u < .9 ? 1 : 0), 1, u => u < .33 ? -1 : u < .62 ? 0 : 1, seed, true));
}
/** Moves a prim by translating it in a group. */
function shift(p: Prim, dx: number, dy: number): Prim { return { t: "group", transform: `translate(${dx.toFixed(1)} ${dy.toFixed(1)})`, prims: [p] }; }
/** Both ears, symmetric, by ear type; `backs` draws their backs (seen from behind). */
function beastEars(b: Beast, species: string, hs: number, color: UkiyoePaint, dark: UkiyoePaint, backs: boolean): Prim[] {
  const out: Prim[] = [], P = (x: number, y: number): Pt => [x * hs, y * hs];
  for (const s of [-1, 1]) {
    let outer: Pt[] = [], inner: Pt[] = [];
    if (b.ears === "fox" || b.ears === "cat" || b.ears === "dog") {
      const tall = b.ears === "fox" ? 1.0 : b.ears === "dog" ? .75 : .65, wide = b.ears === "fox" ? .3 : .28, x0 = s * .42;
      outer = [P(x0 - s * wide, -.35), P(x0 + s * .05, -.35 - tall), P(x0 + s * wide * 1.1, -.45)]; inner = [P(x0 - s * wide * .55, -.4), P(x0 + s * .05, -.35 - tall * .8), P(x0 + s * wide * .6, -.47)];
    } else if (b.ears === "round") {
      // The bear's ears are big and set wide on the top of the skull.
      // The weasel's are small and low at the corners of its flat head; the tanuki's sit wide on the crown.
      const r = species === "bear" ? .3 : species === "weasel" ? .17 : .22, ex2 = species === "bear" ? .64 : species === "weasel" ? .56 : .5, ey2 = species === "weasel" ? -.4 : species === "tanuki" ? -.56 : -.6;
      out.push({ t: "fill", d: ellipseD(s * ex2 * hs, ey2 * hs, r * hs, r * .92 * hs), fill: species === "weasel" ? color : dark, outline: 1 });
      if (species === "weasel" && !backs) out.push({ t: "fill", d: ellipseD(s * (ex2 - .02) * hs, (ey2 + .02) * hs, r * .55 * hs, r * .5 * hs), fill: dark, opacity: .7, noPrint: true });
      if (species === "bear" && !backs) out.push({ t: "fill", d: ellipseD(s * (ex2 - .03) * hs, -.57 * hs, r * .5 * hs, r * .45 * hs), fill: "usuzumi", opacity: .16, noPrint: true });
      continue;
    }
    else if (b.ears === "boar") { outer = [P(s * .26, -.46), P(s * .4, -.74), P(s * .76, -.96), P(s * .82, -.62), P(s * .7, -.36)]; inner = [P(s * .36, -.5), P(s * .48, -.72), P(s * .72, -.86), P(s * .74, -.6), P(s * .64, -.44)]; }
    else if (b.ears === "mouse") { out.push({ t: "fill", d: ellipseD(s * .62 * hs, -.62 * hs, .44 * hs, .46 * hs), fill: color, outline: 1 }, ...(backs ? [] : [{ t: "fill" as const, d: ellipseD(s * .62 * hs, -.6 * hs, .31 * hs, .33 * hs), fill: "sakura" as UkiyoePaint, opacity: .75, noPrint: true }])); continue; }
    else if (b.ears === "rabbit") { outer = [P(s * .15, -.5), P(s * .2, -1.9), P(s * .45, -2.05), P(s * .5, -.5)]; inner = [P(s * .22, -.6), P(s * .26, -1.8), P(s * .4, -1.9), P(s * .43, -.6)]; }
    // Cattle hold their broad ears out sideways from the sides of the poll, below the horns.
    else if (species === "ox") {
      // Seen from behind, the poll is lower in the drawing; the ears come out from its sides there.
      const dy = backs ? .22 : 0;
      outer = [P(s * .36, -.5 + dy), P(s * .72, -.62 + dy), P(s * 1.02, -.56 + dy), P(s * 1.0, -.44 + dy), P(s * .7, -.36 + dy), P(s * .36, -.34 + dy)];
      inner = [P(s * .46, -.48 + dy), P(s * .74, -.56 + dy), P(s * .94, -.52 + dy), P(s * .72, -.42 + dy), P(s * .48, -.42 + dy)];
    }
    else if (b.ears === "horse") { outer = [P(s * .25, -1.25), P(s * .32, -1.75), P(s * .45, -1.25)]; inner = [P(s * .29, -1.3), P(s * .33, -1.65), P(s * .41, -1.3)]; }
    else if (b.ears === "monkey") { out.push({ t: "fill", d: ellipseD(s * .85 * hs, -.15 * hs, .2 * hs, .25 * hs), fill: b.face ?? "hada", outline: 1 }); continue; }
    out.push({ t: "fill", d: smoothD(outer, true, .25), fill: backs && species === "fox" ? dark : color, outline: 1.1 });
    if (!backs) out.push({ t: "fill", d: smoothD(inner, true, .25), fill: species === "rabbit" ? "sakura" : species === "fox" || species === "dog" ? "gofun" : species === "ox" ? "usuzumi" : dark, opacity: species === "ox" ? .55 : .85, noPrint: true });
  }
  return out;
}
/** Two small eyes square on, at ±ex. */
function frontEyes(P: (x: number, y: number) => Pt, hs: number, ex: number, ey: number, ew: number, eh: number, iris: UkiyoePaint, blink: boolean): Prim[] {
  const out: Prim[] = [];
  for (const s of [-1, 1]) {
    const cx = s * ex;
    if (blink) { out.push({ t: "line", d: carvedLine([P(cx - ew, ey), P(cx, ey + eh * .5), P(cx + ew, ey)], hs * .045, { taper: "both", minRatio: .4 }), color: "sumi" }); continue; }
    out.push({ t: "fill", d: smoothD([P(cx - ew * s, ey + eh * .3), P(cx, ey - eh), P(cx + ew * s, ey - eh * .2), P(cx, ey + eh * .9)], true, .5), fill: iris, outline: 1.1 });
    out.push({ t: "dots", d: circleD(cx * hs, ey * hs, hs * eh * .6), color: "sumi" }, { t: "dots", d: circleD((cx + .025) * hs, (ey - .025) * hs, Math.max(.6, hs * .018)), color: "gofun" });
  }
  return out;
}
/**
 * The boar's face square on: the long snout comes straight at us, so the face narrows down to the round snout disc with
 * its two nostrils; the tusks curve up and out from the corners of the mouth, the pale jaw stripes run up the sides, the
 * small eyes sit high and wide, the bristles stand on the brow.
 */
function boarFace(b: Beast, hs: number, look: UkiyoeCreatureLook, blink: boolean, open: number, seed: number): Prim[] {
  // A broad brow and a face that tapers to the disc, shorter than it looks in profile (it points at us).
  const out: Prim[] = [], P = (x: number, y: number): Pt => [x * hs, (y > 0 ? y * .86 : y) * hs], color = look.color ?? b.color, dark = look.dark ?? b.dark, cheek = look.color ? undefined : b.cheek;
  const skull: Pt[] = [P(-.7, -.5), P(0, -.7), P(.7, -.5), P(.82, -.1), P(.6, .35), P(.4, .72), P(.32, .92), P(-.32, .92), P(-.4, .72), P(-.6, .35), P(-.82, -.1)];
  out.push({ t: "fill", d: smoothD(skull, true, .35), fill: color, outline: 1.2, grain: .25 });
  if (cheek) for (const s of [-1, 1]) out.push({ t: "fill", d: smoothD([P(s * .72, -.08), P(s * .6, .34), P(s * .42, .76), P(s * .34, .7), P(s * .48, .32), P(s * .58, -.06)], true, .45), fill: cheek, opacity: .9, noPrint: true });
  // The planes of the snout: two lines converging from the brow down to the disc, wrinkles across it.
  out.push({ t: "line", d: [-1, 1].map(s => carvedLine([P(s * .26, -.22), P(s * .22, .35), P(s * .3, .66)], hs * .035, { taper: "both", minRatio: .3, smooth: true })).join(""), color: dark, opacity: .55 });
  out.push({ t: "stroke", d: [.4, .5].map(y => `M${(-.18 * hs).toFixed(1)} ${(y * hs).toFixed(1)}Q0 ${((y - .05) * hs).toFixed(1)} ${(.18 * hs).toFixed(1)} ${(y * hs).toFixed(1)}`).join(""), color: "sumi", width: .7, opacity: .5 });
  out.push({ t: "stroke", d: furField([P(-.6, -.5), P(0, -.66), P(.6, -.5)], [P(-.4, .4), P(0, .3), P(.4, .4)], 26, hs * .18, seed + 91), color: dark, width: .55, opacity: .5 });
  // Mouth under the disc, open when it charges or roars; the tusks from its corners.
  if (open > .05) out.push({ t: "fill", d: ellipseD(0, .97 * hs, .26 * hs, .08 * hs * (1 + open)), fill: "shu", outline: .7 });
  out.push({ t: "stroke", d: `M${(-.32 * hs).toFixed(1)} ${(.9 * hs).toFixed(1)}Q0 ${(.99 * hs).toFixed(1)} ${(.32 * hs).toFixed(1)} ${(.9 * hs).toFixed(1)}`, color: "sumi", width: hs * .035 + .4 });
  for (const s of [-1, 1]) out.push({ t: "fill", d: smoothD([P(s * .26, .94), P(s * .42, .84), P(s * .54, .64), P(s * .52, .52), P(s * .44, .7), P(s * .3, .82)], true, .35), fill: "gofun", outline: .9 });
  // The snout disc, round and bare, the nostrils in it.
  out.push({ t: "fill", d: ellipseD(0, .76 * hs, .3 * hs, .18 * hs), fill: "sumi", opacity: .78, outline: .9 });
  out.push({ t: "fill", d: ellipseD(-.11 * hs, .77 * hs, .055 * hs, .08 * hs) + ellipseD(.11 * hs, .77 * hs, .055 * hs, .08 * hs), fill: "sumi" });
  out.push({ t: "fill", d: ellipseD(0, .7 * hs, .2 * hs, .06 * hs), fill: "beni", opacity: .35, noPrint: true });
  out.push(...frontEyes(P, hs, .42, -.2, .1, .055, look.accent ?? b.iris, blink));
  out.push({ t: "stroke", d: [-1, 1].map(s => `M${(s * .26 * hs).toFixed(1)} ${(-.32 * hs).toFixed(1)}Q${(s * .42 * hs).toFixed(1)} ${(-.38 * hs).toFixed(1)} ${(s * .56 * hs).toFixed(1)} ${(-.3 * hs).toFixed(1)}`).join(""), color: "sumi", width: .8, opacity: .6 });
  // Bristles standing up over the brow and crown.
  const crest = furEdge(smoothPts([P(.4, -.6), P(0, -.74), P(-.4, -.6)], 4, false), hs * .18, 1, 0, seed + 92);
  out.push({ t: "fill", d: crest.band, fill: b.bristles ?? dark, noPrint: true }, { t: "stroke", d: crest.hairs, color: "sumi", width: .55, opacity: .6 });
  return out;
}
/**
 * The black bear's face square on: a broad round head ringed by the shaggy cheek ruff, big round ears, small eyes, the
 * short tan muzzle with the big black nose at its end, and the mouth under it.
 */
function bearFace(b: Beast, hs: number, look: UkiyoeCreatureLook, blink: boolean, open: number, seed: number): Prim[] {
  const out: Prim[] = [], P = (x: number, y: number): Pt => [x * hs, y * hs], color = look.color ?? b.color, muzzle = look.color ? color : b.muzzle ?? color;
  const jaw = smoothPts([P(.92, -.1), P(.84, .4), P(.42, .7), P(0, .76), P(-.42, .7), P(-.84, .4), P(-.92, -.1)], 4, false);
  const skull: Pt[] = [P(-.82, -.38), P(0, -.68), P(.82, -.38), ...tufted(jaw, u => hs * .2 * Math.sin(Math.PI * u) ** .4, 1, u => u < .5 ? 1 : -1, seed + 93)];
  out.push({ t: "fill", d: polyD(smoothPts(skull.slice(0, 3), 4, false).concat(skull.slice(3))), fill: color, outline: 1.2, grain: .25 });
  out.push({ t: "stroke", d: furField([P(-.7, -.4), P(0, -.62), P(.7, -.4)], [P(-.6, .4), P(0, .2), P(.6, .4)], 30, hs * .17, seed + 94), color: "usuzumi", width: .55, opacity: .5 });
  // The long muzzle comes at us: narrow at the bridge between the eyes, broadening to the big black nose, tan all over.
  out.push({ t: "fill", d: smoothD([P(-.15, -.3), P(0, -.34), P(.15, -.3), P(.28, .08), P(.34, .34), P(.22, .56), P(0, .6), P(-.22, .56), P(-.34, .34), P(-.28, .08)], true, .45), fill: muzzle, outline: .9 });
  out.push({ t: "line", d: [-1, 1].map(s => carvedLine([P(s * .1, -.22), P(s * .16, .02), P(s * .24, .2)], hs * .022, { taper: "both", minRatio: .3, smooth: true })).join(""), color: "kogecha", opacity: .5 });
  if (open > .05) out.push({ t: "fill", d: ellipseD(0, .5 * hs, .18 * hs, .08 * hs * (1 + open)), fill: "shu", outline: .7 });
  out.push({ t: "fill", d: smoothD([P(-.21, .12), P(.21, .12), P(.17, .3), P(0, .36), P(-.17, .3)], true, .4), fill: "sumi", outline: .5 });
  out.push({ t: "fill", d: ellipseD(-.09 * hs, .2 * hs, .045 * hs, .03 * hs) + ellipseD(.09 * hs, .2 * hs, .045 * hs, .03 * hs), fill: "usuzumi", opacity: .6, noPrint: true });
  // A short, straight mouth: a bear does not smile.
  out.push({ t: "stroke", d: `M0 ${(.36 * hs).toFixed(1)}L0 ${(.45 * hs).toFixed(1)}M${(-.17 * hs).toFixed(1)} ${(.48 * hs).toFixed(1)}Q0 ${(.44 * hs).toFixed(1)} ${(.17 * hs).toFixed(1)} ${(.48 * hs).toFixed(1)}`, color: "sumi", width: hs * .03 + .4 });
  out.push(...frontEyes(P, hs, .36, -.2, .08, .045, look.accent ?? b.iris, blink));
  out.push({ t: "stroke", d: [-1, 1].map(s => `M${(s * .24 * hs).toFixed(1)} ${(-.3 * hs).toFixed(1)}Q${(s * .36 * hs).toFixed(1)} ${(-.37 * hs).toFixed(1)} ${(s * .5 * hs).toFixed(1)} ${(-.28 * hs).toFixed(1)}`).join(""), color: "usuzumi", width: .9, opacity: .55 });
  if (look.glowEyes && !blink) for (const s of [-1, 1]) out.push({ t: "glow", cx: s * .34 * hs, cy: -.17 * hs, r: hs * .4, color: "ki", opacity: .7 });
  return out;
}
/** The face square on: skull, cheeks, the muzzle pointing at us (nose leather at its tip), both eyes, the markings. */
function beastFace(b: Beast, species: string, hs: number, look: UkiyoeCreatureLook, blink: boolean, howl: number): Prim[] {
  if (species === "boar") return boarFace(b, hs, look, blink, howl, 0);
  if (species === "bear") return bearFace(b, hs, look, blink, howl, 0);
  if (species === "mouse") return mouseFace(b, hs, look, blink, howl, 0);
  if (species === "weasel") return weaselFace(b, hs, look, blink, howl, 0);
  if (species === "tanuki") return tanukiFace(b, hs, look, blink, howl, 0);
  const out: Prim[] = [], P = (x: number, y: number): Pt => [x * hs, y * hs], color = look.color ?? b.color, dark = look.dark ?? b.dark, ruff = look.belly ?? b.ruff;
  const horse = species === "horse";
  out.push(...hornsFront(b, hs));
  // Skull with cheek fur, narrowing to the muzzle (the horse's long face runs far down).
  const skull: Pt[] = horse ? [P(-.55, -1.25), P(.55, -1.25), P(.6, -.4), P(.42, .6), P(.38, 1.0), P(-.38, 1.0), P(-.42, .6), P(-.6, -.4)]
    : [P(-.7, -.45), P(0, -.68), P(.7, -.45), P(.92, .05), P(.6, .42), P(.25, .6), P(-.25, .6), P(-.6, .42), P(-.92, .05)];
  out.push({ t: "fill", d: smoothD(skull, true, .38), fill: color, outline: 1.2, grain: .2 });
  if (species === "fox" || species === "dog" || species === "cat" || species === "rabbit") out.push({ t: "fill", d: smoothD([P(-.75, .1), P(-.3, .05), P(0, .3), P(.3, .05), P(.75, .1), P(.5, .5), P(0, .65), P(-.5, .5)], true, .4), fill: ruff, noPrint: true });
  if (species === "tanuki") for (const s of [-1, 1]) out.push({ t: "fill", d: smoothD([P(s * .12, -.3), P(s * .5, -.35), P(s * .72, -.05), P(s * .45, .12), P(s * .15, .05)], true, .45), fill: dark, opacity: .95 });
  if (b.face) out.push({ t: "fill", d: smoothD([P(-.55, -.35), P(0, -.5), P(.55, -.35), P(.62, .1), P(.35, .5), P(0, .58), P(-.35, .5), P(-.62, .1)], true, .4), fill: b.face, outline: .8 });
  if (b.stripes && !look.color) out.push({ t: "fill", d: [-.4, 0, .4].map(f => carvedLine([P(f, -.65), P(f * 1.1, -.35)], hs * .1, { taper: "end", minRatio: .1 })).join(""), fill: "sumi", opacity: .85 });
  if (horse) out.push({ t: "fill", d: smoothD([P(-.3, -1.35), P(0, -1.6), P(.3, -1.35), P(0, -1.0)], true, .4), fill: b.mane ?? "sumi", outline: .8 });
  // Muzzle toward us: a rounded block at the lower centre, the nose leather at its tip, the mouth line under it.
  const mY = horse ? .78 : .3, mw = horse ? .38 : .3 * Math.min(1.3, .7 + b.snout * .35);
  out.push({ t: "fill", d: smoothD([P(-mw, mY - .12), P(mw, mY - .12), P(mw * .9, mY + .22), P(0, mY + .3), P(-mw * .9, mY + .22)], true, .45), fill: horse ? color : ruff, outline: .9 });
  if (horse) for (const s of [-1, 1]) out.push({ t: "fill", d: ellipseD(s * .17 * hs, (mY + .1) * hs, .07 * hs, .1 * hs), fill: "sumi", opacity: .85 });
  else {
    out.push({ t: "fill", d: smoothD([P(-.14, mY - .1), P(.14, mY - .1), P(.1, mY + .04), P(0, mY + .08), P(-.1, mY + .04)], true, .4), fill: species === "rabbit" ? "sakura" : "sumi", outline: .5 });
    out.push({ t: "stroke", d: `M${(0).toFixed(1)} ${((mY + .08) * hs).toFixed(1)}L0 ${((mY + .18) * hs).toFixed(1)}M${(-mw * .7 * hs).toFixed(1)} ${((mY + .16) * hs).toFixed(1)}Q0 ${((mY + .28) * hs).toFixed(1)} ${(mw * .7 * hs).toFixed(1)} ${((mY + .16) * hs).toFixed(1)}`, color: "sumi", width: hs * .03 + .4 });
    if (howl > .2) out.push({ t: "fill", d: ellipseD(0, (mY + .24) * hs, mw * .5 * hs, .1 * hs * howl), fill: "shu", outline: .6 });
    if (b.tusks) for (const s of [-1, 1]) out.push({ t: "fill", d: smoothD([P(s * mw * .8, mY + .1), P(s * mw * 1.2, mY - .15), P(s * mw * 1.3, mY - .35), P(s * mw * 1.05, mY - .1), P(s * mw * .7, mY + .16)], true, .3), fill: "gofun", outline: .8 });
    if (species !== "monkey") for (const s of [-1, 1]) out.push({ t: "stroke", d: [0, 1, 2].map(i => `M${(s * mw * .9 * hs).toFixed(1)} ${((mY + .02 + i * .05) * hs).toFixed(1)}l${(s * hs * .45).toFixed(1)} ${((i - 1) * hs * .08).toFixed(1)}`).join(""), color: "sumi", width: .6, opacity: .5 });
  }
  // Eyes, a pair; slit pupils for the fox and cat; the horse's set wide at the sides.
  const ex = horse ? .5 : species === "monkey" ? .25 : .32, ey = horse ? -.7 : -.18, ew = species === "rabbit" ? .13 : .15, eh = .08;
  for (const s of [-1, 1]) {
    const cx = s * ex;
    if (blink) out.push({ t: "line", d: carvedLine([P(cx - ew, ey), P(cx, ey + .04), P(cx + ew, ey)], hs * .045, { taper: "both", minRatio: .4 }), color: "sumi" });
    else {
      out.push({ t: "fill", d: smoothD([P(cx - ew * s, ey + .03), P(cx, ey - eh), P(cx + ew * s, ey - .02), P(cx, ey + eh * .8)], true, .5), fill: look.accent ?? b.iris, outline: 1.1 });
      out.push(b.slit ? { t: "fill", d: ellipseD(cx * hs, ey * hs, hs * .022, hs * eh * .75), fill: "sumi" } : { t: "dots", d: circleD(cx * hs, ey * hs, hs * eh * .55), color: "sumi" });
      out.push({ t: "dots", d: circleD((cx + .03) * hs, (ey - .03) * hs, Math.max(.6, hs * .02)), color: "gofun" });
    }
  }
  return out;
}

/** Standing, the legs reach the ground exactly (hind: upper .52 at 78°, lower .58 at 112° from a root .1·bh below the hip). */
const beastHipStand = (leg: number, bh: number) => -leg * (.52 * Math.sin(78 * DEG) + .58 * Math.sin(112 * DEG)) - bh * .1;
/**
 * The body's contour, in three runs: the back (rump → withers → neck), the front of the chest down to the brisket,
 * and the belly back to the rump (a deep chest, a tucked waist, the flank rising into the thigh). High withers (the
 * boar's) lift the shoulders above the back and let the line fall away to the rump; an arch (the bear's) bows it up.
 */
function beastContour(b: Beast, L: number, bh: number, hipY: number) {
  const by = hipY + bh * .45, top = hipY - bh * .5, wr = (b.withers ?? 0) * bh, ar = (b.arch ?? 0) * bh;
  const back: Pt[] = [[-L * .52, hipY + bh * .02], [-L * .47, top + bh * .1 - ar * .3], [-L * .34, top - bh * .04 + wr * .3 - ar * .8], [-L * .12, top + bh * .07 + wr * .05 - ar], [L * .12, top + bh * .04 - wr * .55 - ar * .7],
    [L * .3, top - bh * .06 - wr], [L * .45, top + bh * .04 - wr * .55]];
  const chest: Pt[] = [[L * .45, top + bh * .04], [L * .53, hipY - bh * .04], [L * .48, by - bh * .02], [L * .32, by + bh * b.chest]];
  const belly: Pt[] = [[L * .32, by + bh * b.chest], [L * .12, by + bh * (b.chest * .6 - b.tuck * .2)], [-L * .08, by - bh * b.tuck * .6], [-L * .22, by - bh * b.tuck],
    [-L * .36, by - bh * b.tuck * .3], [-L * .5, hipY + bh * .24], [-L * .52, hipY + bh * .02]];
  return { by, top, wr, back, chest, belly };
}

/**
 * A four-legged creature's standing profile landmarks, in its own drawing units (y down, ground at 0), from the same
 * contour `quadruped` draws: give them to ANIM1's `measureAnimal(…, false)` and `checkAnimalProportions` to compare
 * the drawing with the real animal.
 */
export function ukiyoeBeastLandmarks(species: UkiyoeSpecies) {
  const b = (BEASTS as Partial<Record<UkiyoeSpecies, Beast>>)[species];
  if (!b) return undefined;
  const c = beastContour(b, b.L, b.bh, beastHipStand(b.leg, b.bh));
  return { ground: 0, withers: c.back[5], brisket: c.chest[3], pointOfShoulder: c.chest[1], pointOfButtock: c.back[0] };
}

function quadruped(species: QuadSpecies, spec: UkiyoeCreatureSpec, frame: number, wind: number, seed: number): Prim[] {
  const b = BEASTS[species], look = spec.look ?? {}, k = (look.size ?? b.L) / b.L;
  if (look.view === "front" || look.view === "back") return quadFrontBack(species, spec, frame, wind, seed, look.view === "back");
  // Three-quarter: the body foreshortens along its length; the far legs stand back and higher (see below).
  const tq = look.view === "three-quarter";
  const L = b.L * k * (tq ? .8 : 1), leg = b.leg * k, bh = b.bh * k, hs = b.head * k, fur = bh * b.fur;
  const color = look.color ?? b.color, belly = look.belly ?? b.belly, dark = look.dark ?? b.dark;
  const stocking = look.color ? undefined : b.stocking;
  const st = actionState(spec.actions ?? [], frame), tr = creatureTravel(spec.actions ?? [], frame);
  // Hooved animals (deer, ox, boar, horse) do not rear up: "stand" leaves them standing on all four legs.
  const run = st("run").w, hop = st("hop").w, sit = Math.max(st("sit").w, st("sleep").w), stand = b.hoof ? 0 : Math.max(st("stand").w, st("drum").w), sleep = st("sleep").w;
  // Hooved animals never sit on their haunches (ANIM1's postures): "sit" lays them down on folded legs as sleep does,
  // with the head up and the eyes open. `lie` is the lying body; `sleep` still closes the eyes and lowers the head.
  const lie = b.hoof ? sit : sleep;
  const gaitLen = L * (run > .5 ? 1.6 : hop > .5 ? 1.2 : .9) * (b.stride ?? 1);
  const ph = tr.dist / gaitLen * Math.PI * 2, moving = tr.moving ? 1 : 0;
  // Body pitch: sitting raises the chest just enough for straight front legs to reach the ground; standing (tanuki)
  // turns the body upright on its hind legs; sleeping lays it flat.
  const sitPitch = species === "rabbit" ? -22 : -46;
  const pitch = sitPitch * sit * (1 - lie) - 80 * stand + (hop > 0 ? -Math.sin(ph) * 14 * hop * moving : 0);
  const bob = moving * (run > .5 ? Math.abs(Math.sin(ph)) * leg * .18 : Math.abs(Math.sin(ph * 2)) * leg * .04) + (hop > 0 ? Math.max(0, Math.sin(ph)) * leg * 1.2 * hop * moving : 0);
  const leap = st("leap"), leapT = leap.w > 0 && leap.a ? span(leap.t, 0, leap.a.end - leap.a.start) : 0, leapH = leap.w * Math.sin(Math.PI * leapT) * leg * 2.4;
  // Standing, the legs reach the ground exactly (hind: upper .52 at 78°, lower .58 at 112° from a root .1·bh below the hip).
  const hipStand = beastHipStand(leg, bh), hipLow = -bh * .45;
  const hipY = lerp(lerp(lerp(hipStand, hipLow, sit), -leg * 1.02, stand), hipLow * .9, lie) - bob - leapH;
  const hip: Pt = [-L * .34, hipY], pivot = hip;
  const R = (p: Pt) => rot(p, pitch, pivot);
  const shoulder = R([L * .3, hip[1] + bh * .06]);
  const contour = beastContour(b, L, bh, hip[1]), { by, top, wr } = contour;
  const backLine = contour.back.map(R), chestLine = contour.chest.map(R), bellyLine = contour.belly.map(R);
  const torsoPts = [...backLine, ...chestLine.slice(1), ...bellyLine.slice(1, -1)];
  // The coat's silhouette: the same contour, its long-haired stretches (chest ruff, belly fringe, a little along the
  // back) breaking into tufts lying toward the tail and down. One shape, one key line, as the prints carve it.
  const ring = smoothPts(torsoPts, 4), nB = (backLine.length - 1) / torsoPts.length, nC = (backLine.length + chestLine.length - 2) / torsoPts.length;
  const hairAt = (u: number) => .7 * (u < nB ? fur * .35 * smooth(span(u, .05, .2)) * (1 - smooth(span(u, nB - .08, nB))) : u < nC ? fur * 1.25 * smooth(span(u, nB, nB + .04)) : fur * (1.1 - .7 * smooth(span(u, .82, .97))));
  const coatPts = fur > 1.2 ? tufted(ring, hairAt, -1, u => u < nB ? -1 : 1, seed + 71, true) : ring;
  const coatD = polyD(coatPts);
  // Everything but the coat: a frame around the creature with the coat cut out (wound the other way), for clipping.
  const area = (q: readonly Pt[]) => q.reduce((acc, p2, i2) => { const n2 = q[(i2 + 1) % q.length]; return acc + p2[0] * n2[1] - n2[0] * p2[1]; }, 0);
  const F = L * 4, box: Pt[] = [[-F, -F * 1.5], [F, -F * 1.5], [F, F], [-F, F]];
  const outsideCoat = polyD(area(box) > 0 === area(coatPts) > 0 ? box : box.slice().reverse()) + polyD(coatPts.slice().reverse());
  // The coat colour shades from the back to a pale underside: a narrow band, so the white reads as the chest and belly.
  const coatFill = { type: "linear" as const, angle: 90, stops: [[0, color, 1], [.62, color, 1], [.8, belly, 1], [1, belly, 1]] as [number, UkiyoePaint, number][] };
  const legColor = species === "tanuki" ? dark : color;
  // Legs in world angles (0 = forward, 90 = straight down). Lateral-sequence walk, bounding run, rabbit hop. The rig
  // solves two segments (upper, lower); the drawing adds the hock (hind) and the wrist (fore) along the lower segment.
  const legPrims = (near: boolean): Prim[] => {
    const out: Prim[] = [];
    for (const [hind, phase] of [[true, near ? 0 : .5], [false, near ? .25 : .75]] as const) {
      const p = ph / (Math.PI * 2) + (run > .5 ? (hind ? 0 : .5) + (near ? .08 : 0) : hop > .5 ? (hind ? 0 : .5) : phase);
      const swing = Math.sin(p * Math.PI * 2) * (run > .5 ? 38 : hop > .5 ? 30 : 22) * moving * (hind ? 1 : 1 + ((b.reach ?? 1) - 1) * run);
      const lift = Math.max(0, Math.cos(p * Math.PI * 2)) * moving;
      const root = hind ? R([-L * .33, hip[1] + bh * .1]) : shoulder;
      const reach = !hind && sit > 0 ? lerp(1, clamp((-root[1]) / (leg * 1.06), 1, 2.4), sit * (1 - lie)) : 1;
      const seg1 = leg * (hind ? .52 : .5) * reach, seg2 = leg * (hind ? .58 : .56) * reach;
      let a1 = hind ? 78 - swing : 92 - swing, a2 = hind ? 112 - swing * .3 + lift * 25 : 88 - swing * .2 - lift * 45;
      // Galloping, a leg on the ground or reaching for it is nearly straight (the fore leg flung ahead, the hind leg
      // driving back, as in Muybridge's plates); it folds only while it is carried forward off the ground.
      if (run > 0 && moving) { const plant = run * (1 - lift); a2 = lerp(a2, hind ? a1 + 28 : a1 + 6, plant * (hind ? .6 : .85)); }
      const mix = (w: number, t1: number, t2: number) => { if (w > 0) { a1 = lerp(a1, t1, w); a2 = lerp(a2, t2, w); } };
      mix(sit * (1 - lie), hind ? 6 : 90, hind ? 168 : 90);
      if (!hind) mix(stand, 30 + Math.sin(frame / (st("drum").w > .5 ? 2.4 : 22)) * 35 * Math.max(st("drum").w, .2), 110);
      else mix(stand, near ? 84 : 96, near ? 96 : 84);
      // Lying, hooved animals fold the forelegs under the chest (the forearm forward and down, the cannon tucked back);
      // the others stretch them out in front.
      mix(lie, hind ? 8 : b.hoof ? 40 : 12, hind ? 170 : b.hoof ? 172 : 4);
      if (leap.w > 0) { const k2 = leap.w * Math.sin(Math.PI * leapT); a1 = lerp(a1, hind ? 160 : 25, k2); a2 = lerp(a2, hind ? 175 : 15, k2); }
      const knee = polar(root, a1, seg1), paw = polar(knee, a2, seg2);
      // The hock bends back from the line knee → paw; the wrist sits low on the fore leg with the pastern angled forward.
      const dx = paw[0] - knee[0], dy = paw[1] - knee[1], dl = Math.hypot(dx, dy) || 1, back: Pt = [dy / dl, -dx / dl];
      const sideSign = back[0] > 0 ? -1 : 1;   // perpendicular pointing toward the tail
      const joint: Pt = hind ? [lerp(knee[0], paw[0], .55) + back[0] * sideSign * leg * .1, lerp(knee[1], paw[1], .55) + back[1] * sideSign * leg * .1]
        : [lerp(knee[0], paw[0], .8) - back[0] * sideSign * leg * .02, lerp(knee[1], paw[1], .8) - back[1] * sideSign * leg * .02];
      const w0 = (hind ? bh * .36 : bh * .25) * (species === "rabbit" && hind ? 1.35 : 1), w1 = bh * .085 * (b.paw ?? 1);
      // Upper leg: the thigh (or the shoulder and upper arm) as a tapering mass rising into the body; the lower leg slim.
      const massTop = hind ? R([-L * .3, top + bh * .32]) : R([L * .26, top + bh * .3]);
      const upper = carvedLine([massTop, root, knee], w0 * 2, { taper: "end", minRatio: .36, smooth: true, wobble: .03 });
      const lw = w0 * .62 * (b.paw ? 1.25 : 1), lower = carvedLine([knee, joint, paw], lw, { taper: "end", minRatio: Math.min(1, w1 * 2 / lw), smooth: true, wobble: .03 });
      if (!near) out.push({ t: "fill", d: upper + lower, fill: legColor, outline: 1, union: true, grain: .2 });
      else {
        // Inside the body the thigh carries no key line: it is the coat itself, its edge shown by one carved contour
        // sweeping down its front (as the prints draw a haunch or a shoulder). Outside the body it is outlined.
        out.push({ t: "clip", d: outsideCoat, key: "legout", prims: [{ t: "fill", d: upper + lower, fill: legColor, outline: 1, union: true, grain: .2 }] });
        // (Inside the body the mass is the coat colour even where the lower leg is dark, as on the tanuki.)
        out.push({ t: "clip", d: coatD, key: "legin", prims: [{ t: "fill", d: upper + lower, fill: color, grain: .3 }] });
        const front = hind ? [polar(massTop, a1 - 70, w0 * .55), polar(root, a1 - 80, w0 * .95), polar(knee, a1 - 90, w0 * .38)] : [polar(massTop, a1 + 60, w0 * .4), polar(root, a1 - 85, w0 * .9), polar(knee, a1 - 90, w0 * .38)];
        out.push({ t: "line", d: carvedLine(front, Math.max(1, bh * .035), { taper: "both", minRatio: .15, smooth: true }), color: "sumi", opacity: .85 });
      }
      // Tiger bands across the leg (nue).
      if (b.stripes && !look.color) {
        const bands: string[] = [];
        for (let i = 0; i < 6; i++) {
          const u = (i + .6) / 6.5, q = i < 3 ? lerp2(root, knee, u * 2) : lerp2(knee, paw, (u - .46) * 1.9), across = (hind ? a1 : a1) + 90;
          bands.push(carvedLine([polar(q, across, w0 * (i < 3 ? .9 : .4)), polar(q, across + 180, w0 * (i < 3 ? .6 : .35))], bh * .06, { taper: "both", minRatio: .2 }));
        }
        out.push({ t: "clip", d: upper + lower, union: true, key: "legbands", prims: [{ t: "fill", d: bands.join(""), fill: "sumi", opacity: near ? .8 : .6 }] });
      }
      // Breeches: long fur on the back of the thigh (fox, tanuki), tufts lying down the leg.
      if (hind && fur > 2) {
        const br = furEdge([polar(root, a1 + 100, w0 * .7), polar(knee, a1 + 90, w0 * .3)], fur * .8, sideSign > 0 ? -1 : 1, 1, seed + (near ? 7 : 9));
        out.push({ t: "fill", d: br.band, fill: legColor, noPrint: true });
      }
      // Stockings: the dark lower leg of the fox.
      if (stocking) out.push({ t: "fill", d: carvedLine([[lerp(knee[0], joint[0], .55), lerp(knee[1], joint[1], .55)], joint, paw], w0 * .44, { taper: "end", minRatio: .6, smooth: true }), fill: stocking, opacity: .92 });
      // Paw with toes.
      if (b.hoof) {
        // A hoof: the fetlock's tuft over a dark horn cap, wider at the ground, the toe forward.
        const hw = w1 * 1.25;
        out.push({ t: "fill", d: polyD([[paw[0] - hw * .8, paw[1] - hw * 1.3], [paw[0] + hw * .7, paw[1] - hw * 1.3], [paw[0] + hw * 1.25, paw[1] + hw * .35], [paw[0] - hw * 1, paw[1] + hw * .35]]), fill: "sumi", outline: 1 });
        out.push({ t: "fill", d: smoothD([[paw[0] - hw * 1.1, paw[1] - hw * 1.2], [paw[0] - hw * .3, paw[1] - hw * 2.2], [paw[0] + hw * .9, paw[1] - hw * 1.5], [paw[0] + hw * .2, paw[1] - hw * 1.1]], true, .4), fill: stocking ?? legColor, noPrint: true });
        out.push({ t: "stroke", d: `M${(paw[0] - hw * .6).toFixed(1)} ${(paw[1] - hw * .4).toFixed(1)}l${(hw * 1.4).toFixed(1)} 0`, color: "usuzumi", width: .7, opacity: .6 });
        if (species !== "horse") {
          // Cloven: the split between the two toes of the hoof, and the dewclaws behind, above the heel.
          out.push({ t: "stroke", d: `M${(paw[0] + hw * .3).toFixed(1)} ${(paw[1] + hw * .3).toFixed(1)}L${(paw[0] + hw * .05).toFixed(1)} ${(paw[1] - hw * 1.1).toFixed(1)}`, color: "usuzumi", width: .8, opacity: .8 });
          out.push({ t: "fill", d: ellipseD(paw[0] - hw * 1.15, paw[1] - hw * 1.55, hw * .38, hw * .26), fill: "sumi", outline: .6 });
        }
      } else {
        const pawD = smoothD([[paw[0] - w1 * .9, paw[1] - w1 * .3], [paw[0] + w1 * .2, paw[1] - w1 * .85], [paw[0] + w1 * 1.9, paw[1] - w1 * .3], [paw[0] + w1 * 1.7, paw[1] + w1 * .45], [paw[0] - w1 * .7, paw[1] + w1 * .45]], true, .45);
        out.push({ t: "fill", d: pawD, fill: species === "monkey" ? "kogecha" : stocking ?? legColor, outline: 1 });
        out.push({ t: "stroke", d: (species === "monkey" ? [.3, .75, 1.2] : [.55, 1.15]).map(f => `M${(paw[0] + w1 * f).toFixed(1)} ${(paw[1] + w1 * .45).toFixed(1)}l${(-w1 * .15).toFixed(1)} ${(-w1 * .55).toFixed(1)}`).join(""), color: b.claws ? "usuzumi" : "sumi", width: .8, opacity: .8 });
        // Long curved claws out of the front of the paw (longest on the fore paws, as the bear digs and climbs with them).
        if (b.claws) out.push({ t: "fill", d: [0, 1, 2].map(i => {
          const base: Pt = [paw[0] + w1 * (1.35 + i * .18), paw[1] - w1 * (.35 - i * .22)], len = w1 * (hind ? .55 : .85);
          return carvedLine([base, [base[0] + len * .7, base[1] + len * .15], [base[0] + len * .95, base[1] + len * .55]], w1 * .2, { taper: "end", minRatio: .15, smooth: true });
        }).join(""), fill: "usuzumi", outline: .6 });
      }
      // Hairlines down the leg.
      out.push({ t: "stroke", d: (near ? furAlong([massTop, root, knee], w0 * 1.4, Math.round(16 * b.hairs), bh * .13, seed + (hind ? 1 : 2)) : "") + furAlong([knee, joint, paw], w0 * .45, Math.round(6 * b.hairs), bh * .09, seed + 3), color: dark, width: .55, opacity: .42 });
      if (!near) out.push({ t: "fill", d: upper + lower, fill: "sumi", opacity: .22, noPrint: true });
    }
    return out;
  };
  // Tail(s): a chain swinging with the gait, the wind and its own lag; long-haired tails are tufted at the edges.
  const tails = species === "fox" || species === "cat" ? clamp(Math.round(look.tails ?? 1), 1, 9) : 1;
  const tailPrims: Prim[] = [];
  const tailRoot = R([-L * .48, hip[1] - bh * .22]);
  for (let t = 0; t < tails; t++) {
    const fan = tails > 1 ? (t / (tails - 1) - .5) * 110 : 0;
    const pts: Pt[] = [tailRoot];
    let a = (species === "dog" ? -60 : species === "rabbit" ? -150 : species === "cat" ? -120 : species === "horse" ? -178 : species === "monkey" ? -140 : species === "boar" ? 118 : -165) + fan + pitch * .6, at = tailRoot;
    const segs = 10, len = b.tail * k;
    for (let i = 0; i < segs; i++) {
      const u = i / segs;
      a += (species === "dog" ? -24 : species === "cat" ? 6 + Math.sin(frame / 14 + t) * 10 : species === "horse" ? -13 * (1 - u * .5) + (moving ? 2 : 0) : 3) + Math.sin(frame / 9 + i * .6 + t + seed) * (4 + 8 * u) * (1 + moving)
        - wind * 8 * u * (species === "rabbit" ? 0 : 1) + (sit * 12);
      at = polar(at, a, len / segs);
      pts.push(at);
    }
    if (species === "nue") {
      // The nue's tail is a living snake: a long sinuous body in scales, its head turning back to look and flicking
      // a forked tongue.
      const sp: Pt[] = [tailRoot];
      let ang = -160 + pitch * .6, at2 = tailRoot;
      for (let i = 0; i < 18; i++) { const u = i / 17; ang += Math.sin(frame / 8 - u * 5 + seed) * 16 * (.4 + u) - 4; at2 = polar(at2, ang, b.tail * k / 18); sp.push(at2); }
      const w0 = b.tailW * k, body = ribbonQ(sp, w0, w0 * .62);
      tailPrims.push({ t: "fill", d: body, fill: "matsu", outline: 1.1, pattern: { type: "uroko", color: "kusa", scale: .35, opacity: .7 }, grain: .3 });
      tailPrims.push({ t: "clip", d: body, key: "snakebelly", prims: [{ t: "line", d: carvedLine(sp.map((q, i) => { const a3 = sp[Math.max(0, i - 1)], c3 = sp[Math.min(sp.length - 1, i + 1)], l3 = Math.hypot(c3[0] - a3[0], c3[1] - a3[1]) || 1; return [q[0] - (c3[1] - a3[1]) / l3 * w0 * .3, q[1] + (c3[0] - a3[0]) / l3 * w0 * .3] as Pt; }), w0 * .35, { taper: "end", minRatio: .5, smooth: true }), color: "ki", opacity: .75 }] });
      // The head: a wedge with a glaring eye, the jaw line, and the tongue.
      const end = sp[sp.length - 1], prev2 = sp[sp.length - 3], ha = Math.atan2(end[1] - prev2[1], end[0] - prev2[0]) / DEG, hl = w0 * 2.2;
      const SH = (x: number, y: number): Pt => add(end, rot([x * hl, y * hl], ha, [0, 0]));
      tailPrims.push({ t: "fill", d: smoothD([SH(-.1, -.38), SH(.55, -.4), SH(1.05, -.12), SH(1.08, .1), SH(.6, .34), SH(-.1, .36)], true, .4), fill: "matsu", outline: 1.1 });
      tailPrims.push({ t: "line", d: carvedLine([SH(1.02, .05), SH(.6, .12), SH(.2, .1)], w0 * .08, { taper: "end" }), color: "sumi" });
      tailPrims.push({ t: "fill", d: ellipseD(...SH(.6, -.16), hl * .12, hl * .1), fill: "ki", outline: .8 }, { t: "dots", d: circleD(...SH(.62, -.16), hl * .05), color: "sumi" });
      const flick = Math.sin(frame / 3 + seed) > .3;
      if (flick) tailPrims.push({ t: "stroke", d: `M${SH(1.05, .02).join(" ")}L${SH(1.45, .04).join(" ")}L${SH(1.6, -.08).join(" ")}M${SH(1.45, .04).join(" ")}L${SH(1.6, .14).join(" ")}`, color: "shu", width: Math.max(1, w0 * .1) });
      continue;
    }
    if (species === "horse") {
      // A horse's tail: a short dock, then a long fall of hair in strands, swinging and parting as it moves.
      const strands: string[] = [];
      for (let k2 = 0; k2 < 9; k2++) {
        const off = (k2 - 4) / 4, sp: Pt[] = pts.map((q, i) => { const u = i / (pts.length - 1); return add(q, [off * b.tailW * k * .25 * u + Math.sin(frame / 10 + k2 + u * 3) * b.tailW * k * .08 * u, off * b.tailW * k * .1 * u]); });
        strands.push(ribbonQ(sp.slice(1), b.tailW * k * .32, b.tailW * k * .03));
      }
      tailPrims.push({ t: "fill", d: carvedLine(pts.slice(0, 3), b.tailW * k * .45, { taper: "end", minRatio: .6, smooth: true }), fill: color, outline: 1 });
      tailPrims.push({ t: "stroke", d: strands.join(""), color: "sumi", width: 1.6 }, { t: "fill", d: strands.join(""), fill: b.mane ?? "sumi" });
      tailPrims.push({ t: "stroke", d: strands.join(""), color: "usuzumi", width: .5, opacity: .35 });
      continue;
    }
    if (species === "rabbit") {
      const puffD = furEdge(Array.from({ length: 13 }, (_, i) => polar([tailRoot[0] - 4 * k, tailRoot[1]], i * 30, b.tailW * k * .45)), b.tailW * k * .3, 1, 1, seed + 51);
      tailPrims.push({ t: "fill", d: ellipseD(tailRoot[0] - 4 * k, tailRoot[1], b.tailW * k * .5, b.tailW * k * .46), fill: "gofun", outline: 1 }, { t: "fill", d: puffD.band, fill: "gofun", noPrint: true });
      continue;
    }
    const wd = b.tailW * k * (tails > 1 ? .75 : 1), long = fur > 2 && species !== "dog";
    // One shape: both edges of the tail (swelling for brush tails), tufted where the hair is long, round the tip.
    const swell = species === "fox" || species === "tanuki";
    const edge = (side: 1 | -1) => pts.map((q, i) => {
      const a2 = pts[Math.max(0, i - 1)], b2 = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]) || 1, u = i / (pts.length - 1);
      const w = wd * .5 * (swell ? .45 + 1.1 * Math.sin(Math.PI * Math.min(1, u * .9 + .08)) ** .8 * (1 - .5 * u ** 4) : 1 - .7 * u);
      return [q[0] - (b2[1] - a2[1]) / l * w * side, q[1] + (b2[0] - a2[0]) / l * w * side] as Pt;
    });
    const tip = polar(pts[pts.length - 1], a, wd * (swell ? .25 : .15));
    const outline = [...edge(1), tip, ...edge(-1).reverse()];
    // Many tails (kyūbi) overlap, so each is drawn lighter: shorter locks and a finer line.
    const many = tails > 1;
    const tailPts = long ? tufted(smoothPts(outline, 3, false), u => wd * (many ? .1 : .2) * Math.sin(Math.PI * u) ** .4, 1, u => u < .5 ? 1 : -1, seed + t * 13) : smoothPts(outline, 3, false);
    const tailD = polyD(tailPts);
    tailPrims.push({ t: "fill", d: tailD, fill: color, outline: many ? .7 : 1.1, grain: .3 });
    // The white tip and the tanuki's rings ride inside the tail shape.
    const inside: Prim[] = [];
    if (b.tailTip && !look.color) inside.push({ t: "fill", d: ellipseD(...polar(pts[pts.length - 1], a, wd * .1), wd * 1.15, wd * .95), fill: b.tailTip });
    if (species === "tanuki") for (let r = 3; r < pts.length - 1; r += 3) inside.push({ t: "line", d: carvedLine([polar(pts[r], a + 90, wd * .6), polar(pts[r], a - 90, wd * .6)], wd * .2, { taper: "none" }), color: dark, opacity: .85 });
    inside.push({ t: "stroke", d: furAlong(pts, wd * .8, Math.round((many ? 10 : 26) * b.hairs), wd * .45, seed + t), color: many ? "usuzumi" : dark, width: .55, opacity: many ? .35 : .45 });
    tailPrims.push({ t: "clip", d: tailD, key: "tail" + t, prims: inside });
  }
  // Head on the neck: pitch for howl/look, lowered for sleep.
  const howl = st("howl").w, lk = st("look"), roar = st("roar").w;
  const headPitch = -55 * howl + (lk.a?.angle ?? -10) * lk.w + 30 * sleep + 10 * sit * (b.hoof ? 0 : 1) - pitch * .55;
  const neck = R([L * .44, top + bh * .05]), nl = b.neck ?? 1, headRot = headPitch + (b.headTilt ?? 0) * (1 - .6 * sleep);
  // A long neck (the horse's) rises steeply from the withers; the head hangs from its end, tilted face-down.
  const headC = add(neck, rot([hs * .9 * (nl > 1 ? .55 * nl : 1), -hs * (.55 - .8 * sleep) * (nl > 1 ? 1.25 * nl : nl)], -headPitch * .3 + pitch * .45, [0, 0]));
  const blink = (frame + (seed % 97)) % 97 < 4 || sleep > .5;
  const open = Math.max(howl * (.6 + .3 * Math.sin(frame / 3)), roar);
  const out: Prim[] = [];
  out.push({ t: "fill", d: ellipseD(hip[0] + L * .15, 2, L * .5 * (1 - leapH / (leg * 6)), L * .05), fill: "sumi", opacity: .1, noPrint: true });
  const farLegs = legPrims(false);
  out.push(...(tq ? [{ t: "group" as const, transform: `translate(${(-L * .07).toFixed(1)} ${(-bh * .2).toFixed(1)})`, prims: farLegs }] : farLegs), ...tailPrims);
  // Neck and coat: one silhouette with one key line. The neck sweeps up from the withers and the chest to the nape and
  // the throat; long-coated animals carry a pale throat ruff from the cheeks down to the chest.
  const hp = (x: number, y: number) => add(headC, rot([x * hs, y * hs], headRot, [0, 0]));
  const withers = R([L * .28, top - bh * .05 - wr * .9]), chestFront = R([L * .5, hip[1] + bh * .05]), nape = hp(-.5, -.42), throat = hp(-.05, .42);
  const throatEdge = smoothPts([throat, add(lerp2(throat, chestFront, .5), rot([bh * .08, 0], pitch, [0, 0])), chestFront], 4, false);
  const throatTufts = fur > 1.2 ? tufted(throatEdge, u => fur * .8 * Math.sin(Math.PI * Math.min(1, u * 1.2 + .1)) ** .5, -1, () => 1, seed + 77) : throatEdge;
  const neckD = polyD([...smoothPts([withers, lerp2(withers, nape, .5), nape], 4, false), ...throatTufts, R([L * .3, hip[1]])]);
  const ruffD = polyD([...throatTufts, R([L * .36, hip[1] + bh * .1]), hp(-.3, .3)]);
  out.push({ t: "fill", d: neckD + coatD, fill: coatFill, outline: 1.2, union: true, grain: .3 });
  // Shading and hair, clipped to the coat: the back a shade darker, the underside in shadow, carved hairlines lying
  // toward the tail, a few pale ones catching the light, and hairlines up each tuft of the long fur.
  const hairsN = Math.round(110 * b.hairs * Math.min(1.8, k));
  out.push({ t: "clip", d: coatD + neckD, union: true, key: "coat", prims: [
    { t: "line", d: carvedLine(backLine, bh * .42, { taper: "both", minRatio: .5, smooth: true }), color: dark, opacity: species === "fox" ? .18 : .12 },
    { t: "line", d: carvedLine(bellyLine.slice(1, -1), bh * .26, { taper: "both", minRatio: .4, smooth: true }), color: "sumi", opacity: .06 },
    { t: "stroke", d: furField(backLine.slice().reverse(), bellyLine.slice(1, -1), hairsN, bh * .18, seed + 61), color: dark, width: .55, opacity: .5 },
    { t: "stroke", d: furField(backLine.slice().reverse(), bellyLine.slice(1, -1), Math.round(hairsN * .3), bh * .15, seed + 67), color: "gofun", width: .5, opacity: .4 },
    { t: "stroke", d: furAlong([withers, nape], bh * .5, Math.round(14 * b.hairs), bh * .14, seed + 69), color: dark, width: .5, opacity: .45 },
  ] });
  if (b.ruff !== color && !look.color) out.push({ t: "fill", d: ruffD, fill: b.ruff, noPrint: true });
  if (fur > 1.2) {
    const ruffHairs = furEdge(chestLine.slice(1), fur * 1.1, 1, 1, seed + 71).hairs + furEdge(bellyLine.slice(1, -2), fur * .9, 1, 1, seed + 73).hairs;
    out.push({ t: "stroke", d: ruffHairs, color: "usuzumi", width: .55, opacity: .45 });
  }
  // Calico patches (cat) and the tanuki's pale belly.
  if (species === "cat" && !look.color) out.push({ t: "clip", d: coatD, key: "calico", prims: [
    { t: "fill", d: smoothD([R([-L * .38, top]), R([-L * .12, top - bh * .05]), R([-L * .02, top + bh * .5]), R([-L * .3, top + bh * .55])], true, .5), fill: "ki", opacity: .92 },
    { t: "fill", d: smoothD([R([-L * .06, top - bh * .1]), R([L * .14, top - bh * .05]), R([L * .2, top + bh * .4]), R([0, top + bh * .45])], true, .5), fill: "sumi", opacity: .88 },
    { t: "fill", d: smoothD([R([L * .22, top]), R([L * .42, top + bh * .05]), R([L * .38, top + bh * .3]), R([L * .25, top + bh * .3])], true, .5), fill: "ki", opacity: .9 }] });
  if (b.stripes && !look.color) {
    // Tiger stripes: dark tapering bands down from the spine, forking and thinning toward the belly.
    const Lb = polylineLength(backLine), stripesD: string[] = [];
    for (let i = 0; i < 11; i++) {
      const u = (i + .5) / 11, q = alongPath(backLine, Lb * u), t2 = tangentAt(backLine, Lb * u), sgn = t2[0] < 0 ? -1 : 1, dn: Pt = [-t2[1] * sgn, t2[0] * sgn];   // pointing down into the body
      const len = bh * (.55 + .3 * hash01(seed, i, 401)), bend = hashSigned(seed, i, 402) * bh * .12;
      const a3 = add(q, [-dn[0] * bh * .05, -dn[1] * bh * .05]), m3 = add(q, [dn[0] * len * .5 + t2[0] * bend, dn[1] * len * .5 + t2[1] * bend]), e3 = add(q, [dn[0] * len + t2[0] * bend * 1.6, dn[1] * len + t2[1] * bend * 1.6]);
      stripesD.push(carvedLine([a3, m3, e3], bh * (.1 + .05 * hash01(seed, i, 403)), { taper: "end", minRatio: .05, smooth: true }));
      if (hash01(seed, i, 404) < .4) stripesD.push(carvedLine([m3, add(m3, [dn[0] * len * .35 - t2[0] * bh * .12, dn[1] * len * .35 - t2[1] * bh * .12])], bh * .06, { taper: "end", minRatio: .05 }));
    }
    out.push({ t: "clip", d: coatD + neckD, union: true, key: "stripes", prims: [{ t: "fill", d: stripesD.join(""), fill: "sumi", opacity: .85 }] });
  }
  if (b.spots && !look.color) {
    // A sika's white spots in loose rows along the flank.
    const sp: string[] = [];
    for (let i = 0; i < 22; i++) { const u = .12 + .7 * (i % 11) / 10, v = .22 + .2 * Math.floor(i / 11) + .05 * hash01(seed, i, 501); sp.push(ellipseD(...R([lerp(-L * .45, L * .3, u), top + bh * v]), bh * .045, bh * .035)); }
    out.push({ t: "clip", d: coatD, key: "spots", prims: [{ t: "fill", d: sp.join(""), fill: "gofun", opacity: .9 }] });
  }
  // The moon bear's crescent: a broad white band across the throat and the front of the chest, ahead of the fore leg.
  if (b.crescent && !look.color) out.push({ t: "clip", d: coatD + neckD, union: true, key: "crescent", prims: [{ t: "fill", d: smoothD([R([L * .47, top + bh * .3]), R([L * .59, top + bh * .56]), R([L * .51, top + bh * .88]), R([L * .45, top + bh * .82]), R([L * .51, top + bh * .56]), R([L * .41, top + bh * .36])], true, .45), fill: "gofun", opacity: .95 }] });
  // The boar's crest: long stiff bristles standing up and lying back along the spine, longest over the withers and nape.
  if (b.bristles && !look.color) {
    const ridge = smoothPts([R([-L * .2, top + bh * .06]), R([L * .12, top + bh * .04 - wr * .55]), withers, lerp2(withers, nape, .55), nape], 4, false);
    // Uneven locks, longest over the withers, lying back toward the tail; the band's root sinks into the coat.
    const locks = tufted(ridge, u => bh * .2 * Math.sin(Math.PI * Math.min(1, u * 1.05 + .04)) ** .7, -1, () => -1, seed + 79);
    const root = ridge.map(q => [q[0], q[1] + bh * .06] as Pt);
    out.push({ t: "fill", d: polyD([...locks, ...root.slice().reverse()]), fill: b.bristles, grain: .3 });
    out.push({ t: "stroke", d: furAlong(ridge, bh * .14, 46, bh * .16, seed + 78), color: "sumi", width: .55, opacity: .6 });
  }
  if (species === "tanuki") out.push({ t: "clip", d: coatD, key: "tbelly", prims: [{ t: "fill", d: ellipseD(...R([L * .05, by - bh * .1]), L * .3, bh * .38), fill: belly, opacity: .9 }] });
  out.push(...legPrims(true));
  // The horse's mane falls from the crest of the neck in long locks over its side, the forelock between the ears.
  if (b.mane) {
    const crest = smoothPts([lerp2(withers, nape, .02), lerp2(withers, nape, .5), lerp2(nape, hp(-.1, -.62), .6)], 6, false);
    const fall = crest.map((q, i) => { const u = i / (crest.length - 1); return add(q, [-hs * (.18 + .1 * Math.sin(frame / 13 + u * 5)) - wind * hs * .1, hs * (.5 - .2 * u) + (moving ? Math.sin(ph + u * 3) * hs * .06 : 0)]); });
    const locks = tufted(fall, () => hs * .2, 1, () => 1, seed + 91);
    const maneD = polyD([...crest, ...locks.slice().reverse()]);
    out.push({ t: "fill", d: maneD, fill: b.mane, outline: .8, grain: .3 }, { t: "stroke", d: crest.slice(1, -1).map((q, i) => { const e = fall[i + 1]; return `M${q[0].toFixed(1)} ${q[1].toFixed(1)}L${lerp(q[0], e[0], .9).toFixed(1)} ${lerp(q[1], e[1], .9).toFixed(1)}`; }).join(""), color: "usuzumi", width: .6, opacity: .5 });
  }
  if (look.tack && species === "horse") {
    // Harness of the packhorses on the Tōkaidō: a red breast strap and crupper, a striped saddle cloth, a pack on top.
    const strap = (pts: Pt[], w: number) => carvedLine(pts, w, { taper: "none", smooth: true });
    out.push({ t: "fill", d: smoothD([R([-L * .22, top - bh * .02]), R([L * .2, top - bh * .04]), R([L * .22, top + bh * .62]), R([-L * .24, top + bh * .62])], true, .2), fill: "ai", outline: 1, pattern: { type: "shima", color: "gofun", scale: .5, opacity: .7 } });
    out.push({ t: "fill", d: smoothD([R([-L * .14, top - bh * .32]), R([L * .12, top - bh * .34]), R([L * .16, top + bh * .05]), R([-L * .18, top + bh * .06])], true, .3), fill: "kincha", outline: 1, grain: .7 });
    out.push({ t: "stroke", d: [-.08, 0, .08].map(f => `M${R([L * f, top - bh * .33])[0].toFixed(1)} ${R([L * f, top - bh * .33])[1].toFixed(1)}L${R([L * (f + .02), top + bh * .05])[0].toFixed(1)} ${R([L * (f + .02), top + bh * .05])[1].toFixed(1)}`).join(""), color: "cha", width: 1, opacity: .7 });
    out.push({ t: "fill", d: strap([R([L * .2, top + bh * .1]), R([L * .5, hip[1] - bh * .02]), R([L * .48, by - bh * .1])], bh * .08) + strap([R([-L * .22, top + bh * .1]), R([-L * .48, hip[1] - bh * .1]), R([-L * .44, hip[1] + bh * .2])], bh * .08), fill: "shu", outline: .7 });
    out.push({ t: "dots", d: [R([L * .38, hip[1] - bh * .12]), R([L * .46, hip[1] + bh * .02]), R([-L * .38, hip[1] - bh * .14])].map(q => circleD(q[0], q[1], bh * .05)).join(""), color: "kin" });
  }
  out.push({ t: "group", transform: `translate(${headC[0].toFixed(1)} ${headC[1].toFixed(1)}) rotate(${headRot.toFixed(1)})`, prims: beastHead(b, species, hs, open, blink, look, seed) });
  if (look.tack && species === "horse") out.push({ t: "group", transform: `translate(${headC[0].toFixed(1)} ${headC[1].toFixed(1)}) rotate(${headRot.toFixed(1)})`, prims: [
    { t: "stroke", d: `M${(-.35 * hs).toFixed(1)} ${(-.55 * hs).toFixed(1)}Q${(-.2 * hs).toFixed(1)} ${(.1 * hs).toFixed(1)} ${(-.1 * hs).toFixed(1)} ${(.45 * hs).toFixed(1)}M${(-.15 * hs).toFixed(1)} ${(-.1 * hs).toFixed(1)}L${(1.6 * hs).toFixed(1)} ${(.02 * hs).toFixed(1)}`, color: "shu", width: Math.max(1.5, hs * .07) },
    { t: "dots", d: circleD(-.15 * hs, -.1 * hs, hs * .06), color: "kin" }] });
  if (species === "tanuki" && look.hat) out.push({ t: "group", transform: `translate(${headC[0].toFixed(1)} ${(headC[1] - hs * .7).toFixed(1)}) rotate(${(headPitch - 8).toFixed(1)})`,
    prims: [{ t: "fill", d: smoothD([[-hs * 1.4, hs * .2], [0, -hs * .7], [hs * 1.4, hs * .15], [0, hs * .05]], true, .2), fill: "kincha", outline: 1.2, grain: .7 },
      { t: "stroke", d: [-.9, -.45, 0, .45, .9].map(f => `M${(f * hs * .3).toFixed(1)} ${(-hs * .62).toFixed(1)}L${(f * hs * 1.35).toFixed(1)} ${(hs * .16).toFixed(1)}`).join(""), color: "cha", width: .7, opacity: .6 }] });
  if (species === "tanuki" && look.bottle) {
    const hand = R([L * .5, hip[1] + bh * .1]);
    out.push({ t: "fill", d: smoothD([add(hand, [-8 * k, 0]), add(hand, [-6 * k, -16 * k]), add(hand, [-2 * k, -20 * k]), add(hand, [2 * k, -16 * k]), add(hand, [8 * k, 0]), add(hand, [6 * k, 16 * k]), add(hand, [-6 * k, 16 * k])], true, .4), fill: "gofun", outline: 1.1, pattern: { type: "shima", color: "ai", scale: .3 } });
  }
  if (look.foxfire || (species === "fox" && tails > 1)) for (let i = 0; i < 3 + tails; i++) {
    const a = frame / 40 + i * 2.1, c: Pt = [hip[0] + Math.cos(a) * L * (.7 + .2 * hash01(seed, i)), hip[1] - bh * 1.4 + Math.sin(a * 1.3) * bh * .9];
    const fl = .7 + .3 * Math.abs(noise1(seed + i, frame / 4));
    out.push({ t: "glow", cx: c[0], cy: c[1], r: hs * 1.6, color: "sora", opacity: .55 * fl });
    out.push({ t: "fill", d: smoothD([add(c, [-hs * .2, 0]), add(c, [0, -hs * .55 * fl]), add(c, [hs * .2, 0]), add(c, [0, hs * .18])], true, .5), fill: "gofun", opacity: .95, noPrint: true });
  }
  return out;
}

// ---- Birds ----------------------------------------------------------------------------------------------------------------------------------
//
// Built as Koson's bird prints read: one silhouette from the breast up the neck into the head; a wing made of real
// feathers on a bone frame (shoulder, wrist, hand) — individual primaries and secondaries under two scalloped rows of
// coverts — folding along the body with the primaries crossing over the tail, spreading in flight with the hand
// lagging the wrist; legs with the backward heel joint, scaled shanks and toes (three forward, one back) with claws.

interface Bird {
  body: number; neck: number; leg: number; tail: number;
  color: UkiyoePaint; back: UkiyoePaint; neckColor: UkiyoePaint; head: UkiyoePaint; beak: UkiyoePaint; legColor: UkiyoePaint;
  primary: UkiyoePaint; secondary: UkiyoePaint; covert: UkiyoePaint; tailColor: UkiyoePaint; eye: UkiyoePaint;
  crown?: UkiyoePaint; cheek?: UkiyoePaint; bib?: UkiyoePaint; slim: number; beakLen: number; beakDepth: number; headR: number; scallop: number; sheen?: UkiyoePaint; plume?: boolean; bustle?: boolean; bars?: UkiyoePaint;
}
/** Each UKIYO1 bird's species in ANIM1, for its flight. */
const ANIM1_BIRDS: Readonly<Record<"crane" | "heron" | "crow" | "pheasant" | "sparrow" | "hawk" | "oshidori", string>> = {
  crane: "red-crowned-crane", heron: "grey-heron", crow: "large-billed-crow", pheasant: "green-pheasant", sparrow: "eurasian-tree-sparrow", hawk: "eurasian-goshawk", oshidori: "mandarin-duck",
};
const BIRDS: Readonly<Record<"crane" | "heron" | "crow" | "pheasant" | "sparrow" | "hawk" | "oshidori", Bird>> = {
  // The goshawk of the falconry prints: barred pale breast, brown back, yellow eye and feet, the hooked beak.
  hawk: { body: 56, neck: 12, leg: 30, tail: 42, color: "gofun", back: "cha", neckColor: "gofun", head: "cha", beak: "sumi", legColor: "ki", primary: "kogecha", secondary: "cha", covert: "cha",
    tailColor: "cha", eye: "ki", cheek: "gofun", slim: 1, beakLen: .28, beakDepth: .2, headR: .26, scallop: .9, bars: "kogecha" },
  // The mandarin drake (oshidori) of the faithful pair: orange flank and sails, the white eye stripe, the purple
  // breast, a crest of green; the duck is plainer (look.color).
  oshidori: { body: 42, neck: 12, leg: 12, tail: 18, color: "kincha", back: "kogecha", neckColor: "tan", head: "matsu", beak: "beni", legColor: "tan", primary: "kogecha", secondary: "asagi", covert: "tan",
    tailColor: "kogecha", eye: "sumi", crown: "matsu", cheek: "gofun", bib: "murasaki", slim: 1.15, beakLen: .28, beakDepth: .14, headR: .3, scallop: .6, sheen: "murasaki" },
  crane: { body: 70, neck: 66, leg: 82, tail: 26, color: "gofun", back: "gofun", neckColor: "sumi", head: "sumi", beak: "kusa", legColor: "sumi", primary: "gofun", secondary: "sumi", covert: "gofun",
    tailColor: "gofun", eye: "kogecha", crown: "shu", cheek: "gofun", slim: .85, beakLen: .62, beakDepth: .13, headR: .17, scallop: 0, bustle: true },
  heron: { body: 58, neck: 62, leg: 72, tail: 18, color: "gofun", back: "gofun", neckColor: "gofun", head: "gofun", beak: "ki", legColor: "sumi", primary: "gofun", secondary: "gofun", covert: "gofun",
    tailColor: "gofun", eye: "ki", slim: .78, beakLen: .62, beakDepth: .1, headR: .15, scallop: 0, plume: true },
  crow: { body: 46, neck: 14, leg: 28, tail: 32, color: "sumi", back: "sumi", neckColor: "sumi", head: "sumi", beak: "sumi", legColor: "sumi", primary: "sumi", secondary: "sumi", covert: "sumi",
    tailColor: "sumi", eye: "kogecha", slim: 1, beakLen: .42, beakDepth: .2, headR: .27, scallop: 1, sheen: "ai" },
  pheasant: { body: 56, neck: 22, leg: 34, tail: 96, color: "matsu", back: "cha", neckColor: "matsu", head: "matsu", beak: "kincha", legColor: "kincha", primary: "kogecha", secondary: "cha", covert: "kincha",
    tailColor: "kincha", eye: "ki", crown: "shu", slim: 1, beakLen: .2, beakDepth: .14, headR: .2, scallop: .8, sheen: "asagi", bars: "kogecha" },
  sparrow: { body: 24, neck: 6, leg: 10, tail: 15, color: "gofun", back: "cha", neckColor: "cha", head: "kogecha", beak: "sumi", legColor: "kincha", primary: "kogecha", secondary: "cha", covert: "kincha",
    tailColor: "kogecha", eye: "sumi", cheek: "gofun", bib: "sumi", slim: 1.1, beakLen: .2, beakDepth: .16, headR: .34, scallop: .7, bars: "kogecha" },
};

/**
 * Overlapping parts drawn as one outlined shape whatever their winding: the key line of every part is painted first at
 * double width, then each part is filled on its own, so only the outer half of the outer contour survives.
 */
function silhouette(parts: readonly string[], fills: readonly UkiyoeFill[], line: number, color: UkiyoePaint = "sumi", opacity?: number): Prim[] {
  return [{ t: "stroke", d: parts.join(""), color, width: line * 2, opacity }, ...parts.map((d, i): Prim => ({ t: "fill", d, fill: fills[Math.min(i, fills.length - 1)], grain: .2, opacity }))];
}
/** The angle a feather lies at when it trails behind a bone pointing at `a`: rotated `f` (0..1) of the way to the rear. */
function trail(a: number, f: number): number {
  const n = ((a % 360) + 540) % 360 - 180, rear = n >= 0 ? 180 : -180;
  return n + (rear - n) * f;
}

/** One feather: a narrow leaf from base to tip, the shaft along it. */
function feather(base: Pt, angle: number, len: number, width: number): string {
  const tip = polar(base, angle, len), mid = polar(base, angle, len * .55), n = (angle + 90) * DEG, nx = Math.cos(n), ny = Math.sin(n);
  return smoothD([[base[0] + nx * width * .3, base[1] + ny * width * .3], [mid[0] + nx * width * .5, mid[1] + ny * width * .5], tip,
    [mid[0] - nx * width * .42, mid[1] - ny * width * .42], [base[0] - nx * width * .3, base[1] - ny * width * .3]], true, .4);
}
/** A row of scalloped feather edges between two lines (coverts, breast or back feathering), as open arcs. */
function scallops(from: Pt, to: Pt, size: number, sag: number, seed: number): string {
  const L = Math.hypot(to[0] - from[0], to[1] - from[1]), n = Math.max(2, Math.round(L / size)), out: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = lerp2(from, to, i / n), b = lerp2(from, to, (i + 1) / n), m = lerp2(a, b, .5);
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, s = sag * (.8 + .4 * hash01(seed, i, 341));
    out.push(`M${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${(m[0] - dy / l * s).toFixed(1)} ${(m[1] + dx / l * s).toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
  }
  return out.join("");
}

function bird(species: keyof typeof BIRDS, spec: UkiyoeCreatureSpec, frame: number, wind: number, seed: number): Prim[] {
  const b = BIRDS[species], look = spec.look ?? {}, k = (look.size ?? b.body) / b.body;
  const st = actionState(spec.actions ?? [], frame), tr = creatureTravel(spec.actions ?? [], frame);
  const fly = st("fly").w, dance = st("dance").w, peck = st("peck"), walk = Math.max(st("walk").w, st("run").w) * (tr.moving ? 1 : 0);
  const B = b.body * k, N = b.neck * k, Lg = b.leg * k, out: Prim[] = [];
  const color = look.color ?? b.color, back = look.color ?? b.back, line = Math.max(.8, Math.min(1.3, B * .02));
  // The wingbeat comes from ANIM1's flight table: the species' predicted cruising rate (drawn at no more than 7.5 beats a
  // second, four frames a beat at 30 fps) and its style: a crane rows on steadily, a goshawk flaps and glides, a pheasant
  // bursts then glides on bowed wings, a sparrow bounds with its wings closed between bursts.
  const fl = birdFlight(ANIM1_BIRDS[species]), at = fl ? flightAt(ANIM1_BIRDS[species], frame / 30, seed, 7.5) : undefined;
  let down: number, closed = 0, flex = 0;
  if (fl && at) {
    const { top, bottom } = fl.stroke, share = (e: number) => clamp01((top - e) / (top - bottom));
    // On the upstroke the wrist flexes and the wing comes up narrow; it opens again for the downstroke.
    if (at.flight === "flap") { const ws = wingStroke(fl, at.t); down = share(ws.elevation); flex = ws.fold; }
    else if (at.flight === "glide") down = share(glideStroke(fl).elevation) * at.amount;
    else { down = 0; closed = at.amount; }
  } else {
    const beat = (frame / 6.5 + seed) % (Math.PI * 2);
    down = .5 - .5 * Math.cos(beat);   // 0 top of stroke … 1 bottom
  }
  // The body rises on each downstroke (and sinks a little through a closed-wing bound).
  const lift = fly * (Lg * .9 + (1 - down) * B * .06 - closed * B * .05);
  const bodyC: Pt = [0, -Lg * (1 - fly) - B * .42 - lift + dance * Math.abs(Math.sin(frame / 10)) * B * .3];
  const tilt = fly * 6 - (1 - fly) * (species === "crane" || species === "heron" ? 6 : 16);
  const T = (x: number, y: number): Pt => rot(add(bodyC, [x * B, y * B]), tilt, bodyC);
  // Body: breast, back, rump; slimmer birds are longer and shallower.
  const sl = b.slim;
  const bodyPts: Pt[] = [T(.5, -.06), T(.38, -.27 * sl), T(.08, -.34 * sl), T(-.28, -.28 * sl), T(-.56, -.08), T(-.5, .05), T(-.2, .26 * sl), T(.18, .3 * sl), T(.46, .14)];
  // Neck: an S for crane and heron (stretched forward in flight), dipping to peck; short and thick for the rest.
  const pk = peck.w > 0 ? Math.max(0, Math.sin(peck.t / 5)) * peck.w : 0;
  const neckBase = T(.4, -.12), longNeck = species === "crane" || species === "heron";
  const tuck = species === "heron" && fly > .5;   // herons fly with the neck drawn back into an S; cranes stretch it out
  const headP: Pt = add(neckBase, tuck ? [N * .42, -N * .22] : fly > .5 ? [N * 1.05, -N * .05] : [N * (longNeck ? .32 : .55) + pk * N * .6, -N * (longNeck ? .95 : .6) + pk * N * 1.6 + dance * Math.sin(frame / 6) * N * .1]);
  const n1: Pt = add(neckBase, tuck ? [-N * .05, -N * .32] : fly > .5 ? [N * .5, -N * .02] : longNeck ? [N * .02 + pk * N * .3, -N * .5 + pk * N * .8] : [N * .3, -N * .35 + pk * N * .7]);
  const neckPath = smoothPts3([neckBase, n1, headP]);
  const hr = B * b.headR, neckW = Math.max(3, B * (longNeck ? .16 : .44));
  const ba = fly > .5 ? 2 : 8 + pk * 62, beakLen = B * b.beakLen;
  const tailBase = T(-.5, -.02);
  const tailTip = add(tailBase, [-b.tail * k * (fly > .5 ? 1 : .92) * Math.cos(tilt * DEG), (species === "pheasant" ? .1 : -.04) * b.tail * k + Math.sin(frame / 11) * 2 - wind * 6]);
  // Legs: the heel bends backward; flying, they trail behind (crane, heron) or tuck up.
  const legRoot = T(-.02, .26 * sl);
  const gait = tr.dist / (B * 1.2) * Math.PI * 2;
  const legPrim = (near: boolean): Prim[] => {
    const res: Prim[] = [];
    const sw = walk * Math.sin(gait + (near ? 0 : Math.PI)) * 24 + dance * Math.sin(frame / 8 + (near ? 0 : 2)) * 30;
    const raised = walk * Math.max(0, Math.sin(gait + (near ? 0 : Math.PI))) ;
    let heel = polar(legRoot, 98 - sw * .6, Lg * .48), foot = polar(heel, 84 + sw * .4 - raised * 30, Lg * .52 * (1 - raised * .15));
    if (fly > 0) {
      const trail = longNeck ? 1 : .35;
      heel = lerp2(heel, add(legRoot, [-Lg * .4 * trail, Lg * .12]), fly); foot = lerp2(foot, add(legRoot, [-Lg * .95 * trail, Lg * (longNeck ? .14 : .1)]), fly);
    }
    const w = Math.max(1.4, B * (longNeck ? .03 : .045));
    res.push({ t: "fill", d: carvedLine([legRoot, heel], w * 1.6, { taper: "end", minRatio: .7 }) + carvedLine([heel, foot], w * 1.1, { taper: "none" }), fill: b.legColor, opacity: near ? 1 : .75, union: true, outline: .5 });
    // Scales on the shank.
    if (B > 18) res.push({ t: "stroke", d: Array.from({ length: Math.round(Lg / 6) }, (_, i) => { const q = lerp2(heel, foot, (i + .5) / Math.round(Lg / 6)); return `M${(q[0] - w * .6).toFixed(1)} ${q[1].toFixed(1)}l${(w * 1.2).toFixed(1)} ${(w * .3).toFixed(1)}`; }).join(""), color: "gofun", width: .5, opacity: b.legColor === "sumi" ? .35 : .25 });
    if (fly < .6) {
      const toes = [-14, 6, 26].map(a => carvedLine([foot, polar(foot, a, B * (longNeck ? .2 : .26))], w * .9, { taper: "end", minRatio: .4 }));
      toes.push(carvedLine([foot, polar(foot, 170, B * .1)], w * .8, { taper: "end", minRatio: .4 }));
      res.push({ t: "fill", d: toes.join(""), fill: b.legColor, opacity: near ? 1 : .75 });
    }
    return res;
  };
  // A wing on its bone frame. Folded: arm forward along the side, hand back over the tail. Spread: the arm rises and
  // falls with the stroke; the hand lags behind the wrist; the primaries fan from the hand, the secondaries hang from
  // the forearm along the trailing edge.
  const wingPrims = (near: boolean): Prim[] => {
    const open = Math.max(fly * (1 - closed) * (1 - .55 * flex), dance * .9), res: Prim[] = [];
    const shoulder = T(.16, -.2 * sl), span2 = B * (longNeck ? 1.25 : species === "sparrow" ? .9 : 1.05);
    // In flight the arm sweeps from up-and-back at the top of the stroke to down at the bottom; dancing, it waves.
    const strokeA = dance > fly ? -95 + Math.sin(frame / 7) * 50 : lerp(-112, 78, down) + (near ? 0 : -8);
    // Folded, the wrist (the bend of the wing) sits forward and down the bird's side, so the wing covers the upper flank.
    const armA = lerp(64, strokeA, open), lag = dance > fly ? 0 : lerp(-26, 20, down);
    const handA = open > .02 ? lerp(182, strokeA + lag, open) : 182;
    const wrist = polar(shoulder, armA, lerp(B * .3, span2 * .42, open)), hand = polar(wrist, handA, lerp(B * .1, span2 * .18, open));
    const pN = species === "sparrow" ? 6 : 9, sN = species === "sparrow" ? 5 : 9;
    const fw = B * (longNeck ? .12 : .14);
    const prim: string[] = [], sec: string[] = [];
    // Secondaries hang from the forearm (wrist → shoulder) along the trailing edge, always toward the rear.
    for (let i = 0; i < sN; i++) {
      const u = (i + .5) / sN, base = lerp2(wrist, shoulder, u * .92);
      const a = lerp(184 - i * 1.6, trail(armA, .5 + u * .12), open) + hashSigned(seed, i, 351) * 3;
      sec.push(feather(base, a, lerp(B * (.5 - .04 * u), span2 * (.4 - .06 * u), open), fw));
    }
    // Primaries spring from the hand: the outermost along the hand, the inner ones fanning back toward the secondaries.
    for (let i = 0; i < pN; i++) {
      const u = i / (pN - 1), base = lerp2(hand, wrist, u * .45);
      const a = lerp(181 - i * 1.4, trail(handA, u * lerp(.25, .5, open * down)), open) + hashSigned(seed, i, 352) * 2;
      prim.push(feather(base, a, lerp(B * (.95 - .22 * u), span2 * (.62 - .2 * u), open), fw * (1 - .2 * u)));
    }
    // Coverts: the shoulder-to-wrist band over the feather bases.
    const rearArm = trail(armA, .5);
    const cov = smoothD([shoulder, polar(shoulder, armA - 90 * Math.sign(rearArm - armA || 1) * -1, B * .1), wrist, polar(wrist, handA, B * .12), polar(lerp2(wrist, shoulder, .45), rearArm, lerp(B * .22, span2 * .2, open)), polar(shoulder, rearArm, B * .14)], true, .4);
    const shade = near ? 0 : .2;
    if (open < .35) {
      // Folded: one clean wing shape (one key line) with the feather edges carved inside it, primaries crossing the tail.
      const parts = [...sec, ...prim, cov];
      res.push(...silhouette(parts, [...sec.map(() => look.accent ?? b.secondary), ...prim.map(() => b.primary), b.covert], line * .8));
      res.push({ t: "stroke", d: [...sec, ...prim].join(""), color: b.secondary === "sumi" && b.primary === "sumi" ? "usuzumi" : "sumi", width: .5, opacity: .35 });
    } else {
      // Spread: each flight feather separate and outlined; coverts over their bases.
      res.push({ t: "fill", d: sec.join(""), fill: look.accent ?? b.secondary, outline: line * .8 });
      res.push({ t: "fill", d: prim.join(""), fill: b.primary, outline: line * .8 });
      res.push({ t: "fill", d: cov, fill: b.covert, outline: line * .8 });
    }
    for (let r = 0; r < 2; r++) {
      const off = lerp(B * .07, span2 * .07, open) * (r + 1);
      res.push({ t: "stroke", d: scallops(polar(shoulder, rearArm, off), polar(wrist, rearArm, off * .8), B * .1, B * .035, seed + r + (near ? 0 : 9)), color: b.covert === "sumi" ? "usuzumi" : "sumi", width: .55, opacity: b.covert === "sumi" ? .55 : .4 });
    }
    if (b.sheen) res.push({ t: "fill", d: cov, fill: b.sheen, opacity: .18, noPrint: true });
    if (shade) res.push({ t: "fill", d: sec.join("") + prim.join("") + cov, fill: "sumi", opacity: shade, noPrint: true });
    return res;
  };
  out.push({ t: "fill", d: ellipseD(0, 1, B * .6 * (1 - fly), B * .06), fill: "sumi", opacity: .1 * (1 - fly), noPrint: true });
  // Three-quarter: the far leg and wing stand back and higher on the page.
  const tqB = look.view === "three-quarter";
  const farB = [...legPrim(false), ...wingPrims(false)];
  out.push(...(tqB ? [{ t: "group" as const, transform: `translate(${(-B * .12).toFixed(1)} ${(-B * .14).toFixed(1)})`, prims: farB }] : farB));
  // Tail: a fan of feathers (barred on the pheasant); the crane's black bustle of plumes droops over it.
  const tailA = Math.atan2(tailTip[1] - tailBase[1], tailTip[0] - tailBase[0]) / DEG, tl = Math.hypot(tailTip[0] - tailBase[0], tailTip[1] - tailBase[1]);
  const tailF: string[] = [];
  const tn = species === "pheasant" ? 4 : 6;
  for (let i = 0; i < tn; i++) tailF.push(feather(add(tailBase, [0, (i - tn / 2) * B * .02]), tailA + (i - (tn - 1) / 2) * (species === "pheasant" ? 2.5 : 5), tl * (1 - Math.abs(i - (tn - 1) / 2) * .08), B * (species === "pheasant" ? .1 : .16)));
  out.push({ t: "fill", d: tailF.join(""), fill: b.tailColor, outline: line * .8 });
  if (b.bars) out.push({ t: "clip", d: tailF.join(""), key: "tailbars", prims: [{ t: "stroke", d: Array.from({ length: Math.round(tl / (B * .1)) }, (_, i) => { const q = polar(tailBase, tailA, (i + .6) * B * .1), a = polar(q, tailA + 90, B * .2), c = polar(q, tailA - 90, B * .2); return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${c[0].toFixed(1)} ${c[1].toFixed(1)}`; }).join(""), color: b.bars, width: Math.max(.8, B * .025), opacity: .8 }] });
  // Body + neck + head: one silhouette, one key line.
  const skull = smoothD([add(headP, [-hr, hr * .2]), add(headP, [-hr * .7, -hr * .85]), add(headP, [hr * .2, -hr * 1.05]), add(headP, [hr * .95, -hr * .3]), add(headP, [hr * .9, hr * .45]), add(headP, [-hr * .1, hr * .95])], true, .45);
  const neckD = carvedLine(neckPath, neckW, { taper: longNeck ? "end" : "none", minRatio: longNeck ? hr * 1.5 / neckW : 1, smooth: true });
  const bodyD = smoothD(bodyPts, true, .45);
  out.push(...silhouette([bodyD, neckD, skull], [{ type: "linear", angle: 90, stops: [[0, back, 1], [.5, color, 1], [1, color, 1]] }, color, color], line));
  // Markings and feathering, clipped to the bird: neck colour, breast scallops or fine hairlines, cheek, bib, crown.
  const marks: Prim[] = [];
  if (b.neckColor !== color && !look.color) marks.push({ t: "fill", d: neckD + skull, fill: b.neckColor });
  if (species === "crane" && !look.color) marks.push({ t: "line", d: carvedLine(neckPath.slice(4), neckW * .4, { taper: "start", minRatio: .2, smooth: true }), color: "gofun" });   // the white nape
  if (b.head !== b.neckColor && !look.color) marks.push({ t: "fill", d: skull, fill: b.head });
  if (b.cheek && !look.color) marks.push({ t: "fill", d: ellipseD(headP[0] - hr * .15, headP[1] + hr * .25, hr * .6, hr * .45), fill: b.cheek });
  if (species === "sparrow" && !look.color) marks.push({ t: "dots", d: circleD(headP[0] - hr * .25, headP[1] + hr * .32, hr * .17), color: "sumi" });
  if (b.bib && !look.color) marks.push({ t: "fill", d: ellipseD(headP[0] + hr * .25, headP[1] + hr * 1.05, hr * .38, hr * .42), fill: b.bib });
  if (b.scallop > 0) for (let r = 0; r < 5; r++) {
    const y = -.16 + r * .1;
    marks.push({ t: "stroke", d: scallops(T(.38 - r * .02, y), T(-.36, y + .06), B * .09, B * .035 * b.scallop, seed + 60 + r), color: color === "sumi" ? "usuzumi" : "sumi", width: .55, opacity: color === "sumi" ? .45 : .3 });
  } else marks.push({ t: "stroke", d: furField([T(-.5, -.12), T(0, -.28), T(.42, -.1)], [T(-.4, .08), T(0, .24), T(.4, .12)], Math.round(40 * Math.min(2, k)), B * .12, seed + 63), color: "usuzumi", width: .5, opacity: .3 });
  if (b.sheen) marks.push({ t: "fill", d: smoothD([T(.35, -.24), T(0, -.32), T(-.3, -.24), T(-.05, -.18)], true, .5), fill: b.sheen, opacity: .25 });
  out.push({ t: "clip", d: bodyD + neckD + skull, union: true, key: "plumage", prims: marks });
  // The pheasant's red face wattle; the crane's red crown; the heron's plumes.
  if (b.crown && species === "crane") out.push({ t: "fill", d: ellipseD(headP[0] + hr * .1, headP[1] - hr * .72, hr * .48, hr * .32), fill: b.crown, noPrint: true });
  if (b.crown && species === "pheasant") out.push({ t: "fill", d: smoothD([add(headP, [-hr * .2, -hr * .55]), add(headP, [hr * .55, -hr * .5]), add(headP, [hr * .6, hr * .25]), add(headP, [-hr * .1, hr * .35])], true, .5), fill: b.crown, noPrint: true });
  if (b.plume) out.push({ t: "line", d: carvedLine([add(headP, [-hr * .5, -hr * .4]), add(headP, [-hr * 2, -hr * .1]), add(headP, [-hr * 3.2, hr * .5 + Math.sin(frame / 9) * hr * .3 - wind * hr])], hr * .2, { taper: "end", minRatio: .1, smooth: true }), color: "gofun" },
    { t: "stroke", d: `M${(headP[0] - hr * .5).toFixed(1)} ${(headP[1] - hr * .4).toFixed(1)}Q${(headP[0] - hr * 2).toFixed(1)} ${(headP[1] - hr * .1).toFixed(1)} ${(headP[0] - hr * 3.2).toFixed(1)} ${(headP[1] + hr * .5).toFixed(1)}`, color: "usuzumi", width: .5, opacity: .5 });
  // Beak (upper and lower mandibles with the gape line), eye with a ring and catchlight.
  const bTip = polar(add(headP, [hr * .75, hr * .05]), ba, beakLen), bRoot = add(headP, [hr * .7, hr * .05]);
  const upperB = smoothD([polar(bRoot, ba - 90, hr * .55 * b.beakDepth / .15), polar(lerp2(bRoot, bTip, .5), ba - 90, hr * .2 * b.beakDepth / .15), bTip, polar(lerp2(bRoot, bTip, .4), ba + 90, hr * .05), bRoot], true, .3);
  const lowerB = smoothD([bRoot, polar(lerp2(bRoot, bTip, .5), ba + 90, hr * .06), polar(bTip, ba + 180, beakLen * .06), polar(lerp2(bRoot, bTip, .4), ba + 90, hr * .32 * b.beakDepth / .15), polar(bRoot, ba + 90, hr * .4)], true, .3);
  out.push({ t: "fill", d: lowerB, fill: b.beak, outline: line * .8 }, { t: "fill", d: upperB, fill: b.beak, outline: line * .8 });
  if (species === "crow") out.push({ t: "stroke", d: furAlong([polar(bRoot, ba - 90, hr * .3), polar(lerp2(bRoot, bTip, .35), ba - 90, hr * .2)], hr * .3, 6, hr * .3, seed + 81), color: "usuzumi", width: .5, opacity: .6 });
  const eyeC = add(headP, [hr * .25, -hr * .2]), er = Math.max(1.2, hr * .2);
  out.push({ t: "dots", d: circleD(eyeC[0], eyeC[1], er * 1.25), color: color === "sumi" || b.head === "sumi" ? "kogecha" : "gofun" });
  out.push({ t: "dots", d: circleD(eyeC[0], eyeC[1], er), color: b.eye }, { t: "dots", d: circleD(eyeC[0], eyeC[1], er * .55), color: "sumi" }, { t: "dots", d: circleD(eyeC[0] + er * .3, eyeC[1] - er * .3, er * .22), color: "gofun" });
  out.push(...legPrim(true));
  if (b.bustle) {
    // The crane's black tertials: a drooping bustle of plumes over the white tail.
    const bus: string[] = [];
    for (let i = 0; i < 6; i++) bus.push(feather(T(-.22 + i * .02, -.18 + i * .03), 160 + i * 6 + Math.sin(frame / 13 + i) * 3, B * (.42 - i * .03) * (1 - fly * .4), B * .14));
    out.push({ t: "fill", d: bus.join(""), fill: "sumi", outline: line * .7, outlineColor: "sumi" }, { t: "stroke", d: bus.join(""), color: "usuzumi", width: .5, opacity: .5 });
  }
  out.push(...wingPrims(true));
  return out;
}
function smoothPts3(p: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10, u = 1 - t; out.push([u * u * p[0][0] + 2 * u * t * p[1][0] + t * t * p[2][0], u * u * p[0][1] + 2 * u * t * p[1][1] + t * t * p[2][1]]); }
  return out;
}

// ---- Dragon ----------------------------------------------------------------------------------------------------------------------------------

/**
 * A ryū: the body is a centreline carrying a travelling wave (head leads, tail follows), widened into a tube with
 * a ribbed belly, scale pattern, a crest of flame-like dorsal fins, four clawed legs that paddle the air, a horned
 * head with an open jaw, long whiskers that trail and curl, and an optional flaming pearl.
 */
function dragon(spec: UkiyoeCreatureSpec, frame: number, wind: number, seed: number): Prim[] {
  const look = spec.look ?? {}, Lt = look.size ?? 900, st = actionState(spec.actions ?? [], frame), tr = creatureTravel(spec.actions ?? [], frame);
  const color = look.color ?? "matsu", belly = look.belly ?? "ki", fin = look.accent ?? "shu", dark = look.dark ?? "ai";
  const coil = st("coil").w, roar = st("roar").w, moving = tr.moving ? 1 : 0;
  const n = 72, amp = Lt * (.11 + .05 * coil), waves = 1.25 + coil * .8, speed = .03 + .02 * moving;
  const spine: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, ph = (u * waves - frame * speed + hash01(seed, 5)) * Math.PI * 2;
    const x = -u * Lt * (1 - coil * .45), y = Math.sin(ph) * amp * (.35 + .65 * Math.min(1, u * 3)) + coil * Math.sin(u * Math.PI * 3) * Lt * .12 - wind * u * u * 20;
    spine.push([x, y - Lt * .12]);
  }
  const width = (u: number) => Lt * .055 * (u < .08 ? .75 + u * 3 : u < .55 ? 1 : Math.max(.08, 1 - (u - .55) / .45 * .95));
  const left: Pt[] = [], right: Pt[] = [], normals: Pt[] = [];
  spine.forEach((q, i) => {
    const a = spine[Math.max(0, i - 1)], b2 = spine[Math.min(n, i + 1)], tx = b2[0] - a[0], ty = b2[1] - a[1], len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len, ny = tx / len, w = width(i / n);
    normals.push([nx, ny]);
    left.push([q[0] + nx * w, q[1] + ny * w]); right.push([q[0] - nx * w, q[1] - ny * w]);
  });
  const out: Prim[] = [];
  // Far legs, dorsal fins (behind the body edge), body, belly plates, near legs, head.
  const legAt = [.16, .5];
  const legs = (near: boolean): Prim[] => {
    const res: Prim[] = [];
    for (const [j, u] of legAt.entries()) {
      const i = Math.round(u * n), q = spine[i], nn = normals[i];
      const root: Pt = [q[0] - nn[0] * width(u) * (near ? .2 : -.2), q[1] - nn[1] * width(u) * (near ? .2 : -.2)];
      const paddle = Math.sin(frame / 8 + j * 1.7 + (near ? 0 : 1.3)) * 30;
      const elbow = polar(root, 110 + paddle + (j ? -20 : 0), Lt * .07), foot = polar(elbow, 40 + paddle * .6, Lt * .06);
      res.push({ t: "fill", d: limb(root, elbow, Lt * .022, Lt * .016) + limb(elbow, foot, Lt * .016, Lt * .012), fill: color, outline: 1.2, pattern: { type: "uroko", color: dark, scale: .35, opacity: .5 } });
      const claws: string[] = [];
      for (let c = -1; c <= 1; c++) {
        const base = polar(foot, 40 + c * 40, Lt * .008), pts: Pt[] = [base];
        let a = 40 + paddle * .6 + c * 45, at = base;
        for (let s = 0; s < 5; s++) { at = polar(at, a, Lt * .007); pts.push(at); a += 22; }
        claws.push(carvedLine(pts, Lt * .006, { taper: "end" }));
      }
      res.push({ t: "fill", d: claws.join(""), fill: "gofun", outline: .8 });
      if (!near) res.push({ t: "fill", d: limb(root, elbow, Lt * .022, Lt * .016) + limb(elbow, foot, Lt * .016, Lt * .012), fill: "sumi", opacity: .2, noPrint: true });
    }
    return res;
  };
  out.push(...legs(false));
  const fins: string[] = [];
  for (let i = 3; i < n - 4; i += 2) {
    const u = i / n, q = left[i], nn = normals[i], h = width(u) * (.55 + .25 * Math.sin(i * 1.3 + frame / 6));
    const back = left[i + 2];
    fins.push(polyD([q, [q[0] + nn[0] * h + (back[0] - q[0]) * 1.4, q[1] + nn[1] * h + (back[1] - q[1]) * 1.4], [q[0] + nn[0] * h * .3 + (back[0] - q[0]) * 1.1, q[1] + nn[1] * h * .3 + (back[1] - q[1]) * 1.1], back]));
  }
  out.push({ t: "fill", d: fins.join(""), fill: { type: "linear", angle: 90, stops: [[0, "ki", 1], [1, fin, 1]] }, outline: 1, outlineColor: "kogecha" });
  const bodyD = smoothD([...left, ...right.slice().reverse()], true, .3);
  out.push({ t: "fill", d: bodyD, fill: { type: "linear", angle: 90, stops: [[0, color, 1], [1, dark, 1]] }, outline: 1.6, pattern: { type: "uroko", color: dark, scale: .55, opacity: .55 }, grain: .3 });
  // Belly plates along the lower edge.
  const plates: string[] = [];
  const bellyLine = right.map((q, i) => [q[0] + normals[i][0] * width(i / n) * .45, q[1] + normals[i][1] * width(i / n) * .45] as Pt);
  out.push({ t: "fill", d: smoothD([...right.slice(2, n - 3), ...bellyLine.slice(2, n - 3).reverse()], true, .3), fill: belly, outline: 1 });
  for (let i = 3; i < n - 4; i += 1) plates.push(`M${right[i][0].toFixed(1)} ${right[i][1].toFixed(1)}L${bellyLine[i][0].toFixed(1)} ${bellyLine[i][1].toFixed(1)}`);
  out.push({ t: "stroke", d: plates.join(""), color: "kogecha", width: 1, opacity: .7 });
  out.push(...legs(true));
  // Tail flame tuft.
  const tail = spine[n], tn = normals[n];
  const tuft: string[] = [];
  for (let i = 0; i < 5; i++) {
    const a0 = 180 + (i - 2) * 22 + Math.sin(frame / 5 + i) * 10, pts: Pt[] = [tail];
    let a = a0, at = tail;
    for (let j = 0; j < 6; j++) { at = polar(at, a, Lt * (.016 - .002 * Math.abs(i - 2))); pts.push(at); a += (i - 2) * 6 + 10; }
    tuft.push(carvedLine(pts, Lt * .02, { taper: "end", smooth: true }));
  }
  out.push({ t: "fill", d: tuft.join(""), fill: fin, outline: 1, outlineColor: "kogecha" });
  void tn;
  // Head: snout, open jaw, eye, horns, mane, whiskers.
  const h = spine[0], hd = normals[0], ang = Math.atan2(spine[0][1] - spine[2][1], spine[0][0] - spine[2][0]) / DEG;
  const S = Lt * .055, open = .25 + .55 * roar + .1 * Math.sin(frame / 9);
  const headPrims: Prim[] = [];
  headPrims.push({ t: "fill", d: smoothD([[-S * 1.2, -S * .9], [S * .2, -S * 1.25], [S * 1.4, -S * .8], [S * 2.6, -S * .55], [S * 2.75, -S * .2], [S * 1.4, -S * .05], [0, S * .3], [-S * 1.1, S * .6]], true, .35), fill: color, outline: 1.5, pattern: { type: "uroko", color: dark, scale: .3, opacity: .4 } });
  headPrims.push({ t: "fill", d: smoothD([[S * .1, S * .2], [S * 1.4, S * (.05 + open * .6)], [S * 2.4, S * (.15 + open * .9)], [S * 2.2, S * (.4 + open * .9)], [S * .8, S * (.6 + open * .3)], [-S * .4, S * .7]], true, .35), fill: color, outline: 1.4 });
  headPrims.push({ t: "fill", d: smoothD([[S * .9, S * .08], [S * 2.6, -S * .12], [S * 2.2, S * (.12 + open * .8)], [S * 1.1, S * (.2 + open * .5)]], true, .3), fill: "shu", noPrint: true });
  const teeth: string[] = [];
  for (let i = 0; i < 4; i++) { const x = S * (1.3 + i * .32); teeth.push(polyD([[x, -S * .12], [x + S * .1, S * .12], [x + S * .2, -S * .12]])); }
  headPrims.push({ t: "fill", d: teeth.join(""), fill: "gofun", outline: .6 });
  headPrims.push({ t: "fill", d: ellipseD(S * .6, -S * .62, S * .32, S * .22), fill: "ki", outline: 1.2 });
  headPrims.push({ t: "dots", d: circleD(S * .68, -S * .62, S * .12), color: "sumi" });
  headPrims.push({ t: "line", d: carvedLine([[S * .1, -S * .9], [S * .6, -S * .95], [S * 1.1, -S * .8]], S * .14, { taper: "both" }), color: "sumi" });
  for (const [x0, len, a0] of [[-S * .3, S * 2.2, -150], [S * .1, S * 1.8, -140]] as const) {
    const pts: Pt[] = [[x0, -S * 1.05]];
    let a = a0, at = pts[0];
    for (let i = 0; i < 6; i++) { at = polar(at, a, len / 6); pts.push(at); a += i === 3 ? 40 : 8; }
    headPrims.push({ t: "fill", d: carvedLine(pts, S * .22, { taper: "end", smooth: true }), fill: "kincha", outline: 1.1 });
  }
  const mane: string[] = [];
  for (let i = 0; i < 9; i++) {
    const base: Pt = [-S * (.3 + i * .32), -S * (.55 - i * .12)], pts: Pt[] = [base];
    let a = 185 + i * 6 + Math.sin(frame / 7 + i) * 14, at = base;
    for (let s = 0; s < 8; s++) { at = polar(at, a, S * .38); pts.push(at); a += 14 + (i % 2) * 6; }
    mane.push(carvedLine(pts, S * .38, { taper: "end", smooth: true }));
  }
  headPrims.unshift({ t: "fill", d: mane.join(""), fill: fin, outline: 1, outlineColor: "kogecha" });
  const whisk: string[] = [];
  for (const [y0, dir] of [[-S * .35, -1], [S * .1, 1]] as const) {
    const pts: Pt[] = [[S * 2.3, y0]];
    let at = pts[0];
    for (let i = 0; i < 14; i++) {
      at = [at[0] - S * .38, at[1] + dir * S * .1 + Math.sin(frame / 6 + i * .7 + dir) * S * .28 - wind * S * .05 * i];
      pts.push(at);
    }
    whisk.push(carvedLine(pts, S * .1, { taper: "end", smooth: true }));
  }
  headPrims.push({ t: "fill", d: whisk.join(""), fill: "sumi", opacity: .9 });
  out.push({ t: "group", transform: `translate(${h[0].toFixed(1)} ${h[1].toFixed(1)}) rotate(${ang.toFixed(1)})`, prims: headPrims });
  if (look.pearl) {
    const pc = polar(h, ang, S * 5);
    out.push({ t: "glow", cx: pc[0], cy: pc[1], r: S * 2.4, color: "ki", opacity: .6 });
    const flames: string[] = [];
    for (let i = 0; i < 7; i++) { const a = i * 360 / 7 + frame * 3; flames.push(smoothD([polar(pc, a - 18, S * .5), polar(pc, a + Math.sin(frame / 4 + i) * 10, S * (1.1 + .3 * Math.sin(frame / 3 + i))), polar(pc, a + 18, S * .5)], true, .4)); }
    out.push({ t: "fill", d: flames.join(""), fill: "shu", opacity: .9, noPrint: true });
    out.push({ t: "fill", d: ellipseD(pc[0], pc[1], S * .55, S * .55), fill: { type: "radial", center: [.4, .4], stops: [[0, "gofun", 1], [1, "sora", 1]] }, outline: 1 });
  }
  void hd;
  return out;
}

// ---- Transform puff (henge) ------------------------------------------------------------------------------------------------------------

function puff(frame: number, a: UkiyoeCreatureAction, size: number, seed: number): { prims: Prim[]; cover: number } {
  const len = Math.max(1, a.end - a.start), t = clamp01((frame - a.start) / len);
  if (t <= 0 || t >= 1) return { prims: [], cover: 0 };
  const grow = smooth(Math.min(1, t * 2.5)), fade = 1 - smooth(Math.max(0, (t - .55) / .45));
  const blobs: string[] = [];
  for (let i = 0; i < 11; i++) {
    const a2 = i * 360 / 11 + hash01(seed, i) * 20, r = size * (.35 + .4 * hash01(seed, i, 2)) * grow;
    const c = polar([0, -size * .5], a2, size * .45 * grow);
    blobs.push(ellipseD(c[0], c[1], r, r * .85));
  }
  // One outlined cloud (the blobs' outline drawn under the fill, so inner edges vanish), faded as a whole.
  return { prims: [{ t: "group", opacity: fade, prims: [{ t: "fill", d: blobs.join(""), fill: "gofun", outline: 1.2, outlineColor: "usuzumi", union: true, noPrint: true }] }], cover: Math.sin(Math.PI * t) };
}

export function drawCreature(spec: UkiyoeCreatureSpec, frame: number, wind: number, seed: number): DrawnCreature {
  const tr = creatureTravel(spec.actions ?? [], frame);
  let dir: 1 | -1 = spec.facing === "left" ? -1 : 1;
  let x = 0;
  for (const a of spec.actions ?? []) { if (a.start > frame) break; if (TRAVEL.has(a.type) && a.to !== undefined && a.to !== x) { dir = a.to > x ? 1 : -1; x = a.to; } }
  let prims: Prim[];
  switch (spec.species) {
    case "fox": case "tanuki": case "dog": case "cat": case "rabbit": case "monkey": case "horse": case "nue":
    case "bear": case "boar": case "deer": case "ox": case "wolf": case "mouse": case "weasel": case "baku": case "ape": prims = quadruped(spec.species, spec, frame, wind * dir, seed); break;
    case "crab": case "turtle": case "snake": case "frog": case "carp": case "octopus": {
      const st = actionState(spec.actions ?? [], frame);
      prims = drawCritter(spec.species, spec.look ?? {}, (type: string) => { const e = st(type as UkiyoeCreatureActionType); return { w: e.w, t: e.t }; }, { moving: !!tr.moving, dist: tr.dist }, frame, wind * dir, seed);
      break;
    }
    case "dragon": prims = dragon(spec, frame, wind * dir, seed); break;
    case "yukionna": case "yurei": case "rokurokubi": case "kasaobake": case "chochinobake": case "hitodama": case "kappa": case "tengu": case "karasutengu": case "nurikabe": case "tsuchigumo": case "okiku": case "akaname": case "gashadokuro": case "umibozu": case "orochi": case "omukade": case "namazu": case "jasei": case "biwabokuboku": case "wanyudo": case "ittanmomen": case "chagama": {
      const acts = spec.actions ?? [], st = actionState(acts, frame);
      const w = (type: string) => { const e = st(type as UkiyoeCreatureActionType); return { w: e.w, t: e.t, len: e.a ? e.a.end - e.a.start : 1 }; };
      // A spirit with an `appear` is unseen until it first appears; after a `vanish` has run it stays gone (until the next
      // `appear`). The fades themselves are drawn by the yōkai.
      let seen = !acts.some(a => a.type === "appear");
      for (const a of [...acts].sort((x, y) => x.start - y.start)) {
        if (a.start > frame) break;
        if (a.type === "appear") seen = true;
        else if (a.type === "vanish") seen = frame <= a.end;
      }
      prims = seen ? drawYokai(spec.species, spec.look ?? {}, { w, moving: !!tr.moving, dist: tr.dist }, frame, wind * dir, seed) : [];
      break;
    }
    default: prims = bird(spec.species, spec, frame, wind * dir, seed);
  }
  // Henge: a puff of smoke; from the puff's midpoint the creature is gone (place what it becomes as its own node).
  for (const tf of (spec.actions ?? []).filter(a => a.type === "transform" && frame >= a.start)) {
    if (frame >= (tf.start + tf.end) / 2) prims = [];
    if (frame <= tf.end) prims = [...prims, ...puff(frame, tf, (spec.look?.size ?? 120) * 1.2, seed).prims];
  }
  return { prims, x: tr.x, y: tr.y, dir };
}
