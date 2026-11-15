/**
 * UKIYO1 people and treasures of the Dragon Palace (Ryūgū-jō), after Yanagawa Shigenobu's *Hanatsuru as the Dragon
 * Princess Otohime* (Met 845812, CC0: a gold dragon coiled as her crown, long loose hair, a dark seigaiha-wave robe over
 * vermilion and green collars), Totoya Hokkei's *Urashima Tarō Going Home on a Tai* (Met 54029, CC0: the Dragon King in
 * a dragon crown and red robe, white-bearded), Kawanabe Kyōsai's *Urashima Tarō Riding on a Tortoise* (Met 50771, CC0:
 * the young fisherman with his topknot, blue jacket and rod) and a lacquered tebako (Met 45492, CC0: a deep lid
 * overlapping a box with rounded corners, gold maki-e on lacquer, metal rings for the cord).
 *
 * - Hat `dragon`: a gold dragon coiled on the head, its head reaching forward over the brow, in every view.
 * - Prop `tamatebako`: the jewelled box held in both hands, black lacquer with gold waves, tied with a red cord.
 * - Motif `tamatebako`: the same box on the ground; `opens` × keyed progress lifts the lid and lets out the white smoke
 *   that rises, swells round whoever kneels there, and thins away (the swap to an old man belongs under its thickest part,
 *   at progress ≈ .55: `TAMATEBAKO_THICKEST`).
 * - Looks: `UKIYOE_OTOHIME_LOOK`, `UKIYOE_RYUJIN_LOOK`, `UKIYOE_URASHIMA_LOOK`, and `agedLook()` for anyone who has
 *   grown old in a moment.
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, clamp01, hash01, lerp, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD } from "./ukiyoe-prims";
import type { UkiyoeFill } from "./ukiyoe-pigments";
import type { UkiyoeFigureLook } from "./ukiyoe-figure";
import { billow } from "./ukiyoe-effects";

type Map2 = (x: number, y: number) => Pt;
type MP = Readonly<Record<string, unknown>>;
const num = (p: MP, k: string, d: number) => typeof p[k] === "number" && Number.isFinite(p[k]) ? p[k] as number : d;
const f1 = (n: number) => n.toFixed(1);
const GOLD: UkiyoeFill = { type: "linear", angle: 90, stops: [[0, "kin", 1], [.6, "ki", 1], [1, "kincha", 1]] };
const LACQUER: UkiyoeFill = { type: "linear", angle: 90, stops: [[0, "kogecha", 1], [.35, "sumi", 1], [1, "sumi", 1]] };

// ---- Dragon crown -----------------------------------------------------------------------------------------------------------------

/** The dragon crown on a profile head (head units: ±20 about the head's centre, facing +x). */
export function dragonCrownSide(P0: Map2, lw: number): Prim[] {
  // Drawn large, as in Shigenobu's print: the coil covers the crown of the head.
  const P: Map2 = (x, y) => P0(x * 1.4, -20 + (y + 20) * 1.4);
  const k = Math.abs(P(1, 0)[0] - P(0, 0)[0]), out: Prim[] = [];
  // The body coils once round the crown of the head and lifts its tail behind; scales and a dorsal fringe along it.
  const body: Pt[] = [P(9, -19), P(13, -27), P(7, -33), P(-3, -31), P(-12, -26), P(-15, -19), P(-11, -15), P(-4, -18), P(-6, -25), P(-14, -33), P(-21, -40)];
  out.push({ t: "fill", d: carvedLine(body, 4.2 * k, { taper: "end", minRatio: .25, smooth: true }), fill: GOLD, outline: lw * .8 });
  const fins: string[] = [];
  for (let i = 1; i < body.length - 1; i++) {
    const a = body[i], b = body[i + 1], nx = -(b[1] - a[1]), ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1, s = 2.6 * k * (1 - i / body.length);
    const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    fins.push(`M${f1(a[0] + nx / l * k)} ${f1(a[1] + ny / l * k)}L${f1(m[0] + nx / l * (s + k))} ${f1(m[1] + ny / l * (s + k))}L${f1(b[0] + nx / l * k)} ${f1(b[1] + ny / l * k)}`);
  }
  out.push({ t: "stroke", d: fins.join(""), color: "kincha", width: lw * .7 });
  out.push({ t: "stroke", d: body.slice(1, -2).map((q, i) => circleD(q[0], q[1], 1.1 * k * (1 - i * .06))).join(""), color: "kogecha", width: lw * .45, opacity: .7 });
  // The head reaching over the brow: snout, open jaw, an eye, whiskers streaming back.
  const head: Pt[] = [P(8, -20), P(15, -25), P(22, -24), P(23, -21), P(17, -19), P(21, -17), P(14, -16)];
  out.push({ t: "fill", d: smoothD(head, true, .3), fill: GOLD, outline: lw * .8 });
  out.push({ t: "fill", d: circleD(...P(15.5, -22.5), 1 * k), fill: "shu" });
  out.push({ t: "stroke", d: `M${f1(P(21, -23)[0])} ${f1(P(21, -23)[1])}Q${f1(P(14, -31)[0])} ${f1(P(14, -31)[1])} ${f1(P(4, -36)[0])} ${f1(P(4, -36)[1])}M${f1(P(13, -26)[0])} ${f1(P(13, -26)[1])}l${f1(-3 * k)} ${f1(-6 * k)}l${f1(2 * k)} ${f1(-1 * k)}`, color: "kincha", width: lw * .8 });
  // The jewel it holds before it.
  out.push({ t: "fill", d: circleD(...P(25, -19), 1.8 * k), fill: "gofun", outline: lw * .6 });
  return out;
}

/** The dragon crown square on (radius 1): the coil rising over the crown, the head facing out from the top. */
export function dragonCrownSquare(P0: Map2, lw: number, back: boolean): Prim[] {
  const P: Map2 = (x, y) => P0(x * 1.35, -.9 + (y + .9) * 1.35);
  const k = Math.abs(P(1, 0)[0] - P(0, 0)[0]), out: Prim[] = [];
  const body: Pt[] = [P(-.75, -.75), P(-.9, -1.15), P(-.5, -1.45), P(0, -1.35), P(.5, -1.5), P(.9, -1.2), P(.7, -.85), P(.3, -1.05), P(.45, -1.65), P(.8, -1.95)];
  out.push({ t: "fill", d: carvedLine(body, .2 * k, { taper: "end", minRatio: .3, smooth: true }), fill: GOLD, outline: lw * .8 });
  if (!back) {
    out.push({ t: "fill", d: smoothD([P(-.28, -1.25), P(-.3, -1.6), P(0, -1.75), P(.3, -1.6), P(.28, -1.25), P(0, -1.12)], true, .35), fill: GOLD, outline: lw * .8 });
    for (const s of [-1, 1]) out.push({ t: "fill", d: circleD(...P(s * .12, -1.48), .05 * k), fill: "shu" });
    out.push({ t: "fill", d: circleD(...P(0, -1.05), .09 * k), fill: "gofun", outline: lw * .5 });
  }
  return out;
}

// ---- Tamatebako ------------------------------------------------------------------------------------------------------------------

/**
 * The box itself, its base centre at `c`, `w` wide: a lacquered box under a deeper domed lid that overlaps it, gold
 * waves (maki-e) on the sides, the red cord crossing the lid and tied in a bow on top. `lid` (0–1) lifts the lid away
 * and back; the cord falls slack once it is untied.
 */
export function tamatebakoPrims(c: Pt, w: number, lw: number, lid = 0): Prim[] {
  const out: Prim[] = [], h = w * .62, d = w * .3, bodyH = h * .55, lidH = h * .45;
  const [x, y] = c, top = y - bodyH, open = clamp01(lid);
  // Body: front face and the top-side face in perspective (seen a little from above).
  out.push({ t: "fill", d: smoothD([[x - w / 2, y], [x - w / 2, top], [x + w / 2, top], [x + w / 2, y]], true, .06), fill: LACQUER, outline: lw, grain: .3 });
  out.push({ t: "fill", d: smoothD([[x + w / 2, y], [x + w / 2, top], [x + w / 2 + d * .5, top - d * .35], [x + w / 2 + d * .5, y - d * .35]], true, .06), fill: "sumi", outline: lw });
  const waves = (x0: number, y0: number, ww: number, hh: number) => {
    const arcs: string[] = [];
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) { const cx = x0 + ww * (i + .5 + (r % 2) * .5) / 4, cy = y0 + hh * (.45 + r * .35); arcs.push(`M${f1(cx - ww * .1)} ${f1(cy)}A${f1(ww * .1)} ${f1(hh * .22)} 0 0 1 ${f1(cx + ww * .1)} ${f1(cy)}`); }
    return arcs.join("");
  };
  out.push({ t: "stroke", d: waves(x - w / 2, top, w, bodyH), color: "kin", width: Math.max(.6, w * .018), opacity: .9 });
  // A ring fitting on the side for the cord.
  out.push({ t: "stroke", d: circleD(x + w / 2 + d * .25, y - bodyH * .55 - d * .17, w * .045), color: "kin", width: Math.max(.6, w * .015) });
  if (open > .02) {
    // Inside: the dark mouth of the box.
    out.push({ t: "fill", d: smoothD([[x - w / 2 + w * .04, top], [x + w / 2 - w * .02, top], [x + w / 2 + d * .45, top - d * .32], [x - w / 2 + d * .5, top - d * .32]], true, .05), fill: "sumi", outline: lw * .7 });
  }
  // The lid: lifted and tipped back as it opens; its cord tied in a bow, or slack and fallen once untied.
  const lift = open * h * 1.1, tip = open * 28, lx = x - open * w * .35, ly = top - lift;
  const lidPrims: Prim[] = [
    { t: "fill", d: smoothD([[lx - w * .53, ly + lidH * .02], [lx - w * .53, ly - lidH * .75], [lx - w * .45, ly - lidH], [lx + w * .45, ly - lidH], [lx + w * .53, ly - lidH * .75], [lx + w * .53, ly + lidH * .02]], true, .12), fill: LACQUER, outline: lw, grain: .3 },
    { t: "fill", d: smoothD([[lx + w * .53, ly + lidH * .02], [lx + w * .53, ly - lidH * .75], [lx + w * .53 + d * .55, ly - lidH * .75 - d * .38], [lx + w * .53 + d * .55, ly - d * .36]], true, .1), fill: "sumi", outline: lw },
    { t: "fill", d: smoothD([[lx - w * .45, ly - lidH], [lx + w * .45, ly - lidH], [lx + w * .53 + d * .5, ly - lidH * .75 - d * .38], [lx - w * .45 + d * .5, ly - lidH - d * .35]], true, .2), fill: { type: "linear", angle: 90, stops: [[0, "kogecha", 1], [1, "sumi", 1]] }, outline: lw },
    { t: "stroke", d: waves(lx - w / 2, ly - lidH, w, lidH), color: "kin", width: Math.max(.6, w * .018), opacity: .9 },
    { t: "line", d: carvedLine([[lx - w * .53, ly - lidH * .05], [lx + w * .53, ly - lidH * .05]], Math.max(1, w * .02), { taper: "none" }), color: "kin" },
  ];
  if (open < .15) {
    // The cord: down the front, across the top, the bow with two loops and two tails.
    const cw = Math.max(1.2, w * .045), k: Pt = [lx + d * .25, ly - lidH - d * .18];
    lidPrims.push({ t: "line", d: carvedLine([[lx, y], [lx, ly - lidH], k], cw, { taper: "none" }), color: "shu" });
    lidPrims.push({ t: "line", d: carvedLine([[lx - w * .45 + d * .25, ly - lidH - d * .18], k, [lx + w * .53 + d * .25, ly - lidH * .87 - d * .19]], cw, { taper: "none" }), color: "shu" });
    lidPrims.push({ t: "fill", d: smoothD([k, [k[0] - w * .2, k[1] - w * .14], [k[0] - w * .26, k[1] - w * .02]], true, .45) + smoothD([k, [k[0] + w * .2, k[1] - w * .14], [k[0] + w * .26, k[1] - w * .02]], true, .45), fill: "beni", outline: lw * .7 });
    lidPrims.push({ t: "line", d: carvedLine([k, [k[0] - w * .1, k[1] + w * .2], [k[0] - w * .07, k[1] + w * .32]], cw * .8, { taper: "end" }), color: "shu" }, { t: "line", d: carvedLine([k, [k[0] + w * .12, k[1] + w * .18], [k[0] + w * .14, k[1] + w * .3]], cw * .8, { taper: "end" }), color: "shu" });
    lidPrims.push({ t: "fill", d: circleD(k[0], k[1], cw * 1.1), fill: "shu", outline: lw * .6 });
  } else {
    // Untied: the cord lies slack on the ground beside the box.
    out.push({ t: "line", d: carvedLine([[x - w * .7, y + 1], [x - w * .45, y - w * .04], [x - w * .1, y + 2], [x + w * .2, y - w * .02]], Math.max(1.2, w * .045), { taper: "both", smooth: true }), color: "shu" });
  }
  out.push(tip ? { t: "group", transform: `rotate(${f1(-tip)} ${f1(lx - w * .53)} ${f1(ly)})`, prims: lidPrims } : { t: "group", prims: lidPrims });
  return out;
}

/** Progress at which the smoke is thickest: swap a figure for its aged self here. */
export const TAMATEBAKO_THICKEST = .55;

/** The white smoke let out of the box: billows rising from the mouth `c`, swelling to `height`, curling, thinning away. */
export function tamatebakoSmoke(c: Pt, w: number, height: number, u: number, seed: number, toward = 0): Prim[] {
  const t = clamp01((u - .12) / .88);
  if (t <= 0) return [];
  const rise = 1 - (1 - Math.min(1, t / .45)) ** 2, fade = 1 - clamp01((t - .62) / .38), clouds: string[] = [], curls: string[] = [], n = 9;
  for (let i = 0; i < n; i++) {
    const v = i / (n - 1), y = c[1] - height * v * rise, swell = Math.sin(Math.min(1, v * 1.2) * Math.PI * .5 + .2);
    const r = w * (.55 + 1.5 * swell * rise) * (.85 + .3 * hash01(seed, i, 1)), x = c[0] + toward * Math.min(1, v * 1.6) + Math.sin(v * 5 + t * 3 + seed) * w * .35 * v;
    if (v > rise + .05) continue;
    clouds.push(billow([x, y], r, seed + i * 7));
    // A scroll curl in every other billow, opening toward the outside of the plume (the prints' cloud curls).
    if (i % 2) continue;
    const sp: Pt[] = [], side = i % 4 ? 1 : -1, cc: Pt = [x + side * r * .3, y - r * .1];
    for (let j = 0; j <= 8; j++) { const q = j / 8, a = side * (q * 1.25 * Math.PI) + (side > 0 ? 0 : Math.PI); sp.push([cc[0] + Math.cos(a) * r * .38 * (1 - q * .55), cc[1] + Math.sin(a) * r * .28 * (1 - q * .55)]); }
    curls.push(carvedLine(sp, Math.max(.8, w * .03), { taper: "end", minRatio: .2, smooth: true }));
  }
  return [{ t: "group", opacity: fade, prims: [
    { t: "fill", d: clouds.join(""), fill: { type: "radial", stops: [[0, "gofun", 1], [1, "paper", .95]] }, outline: 1.4, outlineColor: "usuzumi", union: true },
    { t: "fill", d: curls.join(""), fill: "usuzumi", opacity: .55 },
  ] }];
}

/**
 * The jewelled box on the ground. Params: size (width), opens (1 to open as the keyed progress runs 0 → 1),
 * smoke (the plume's height, default 6 × size), toward (px the plume leans as it rises, onto whoever opened it).
 * Origin: the ground under the box.
 */
export function tamatebako(p: MP, cx: { progress: number; seed: number }): Prim[] {
  const w = num(p, "size", 60), lw = Math.max(.8, w * .02), u = num(p, "opens", 0) > 0 ? clamp01(cx.progress) : 0;
  const lid = clamp01(u / .2);
  return [{ t: "fill", d: ellipseD(0, 0, w * .7, w * .07), fill: "sumi", opacity: .18, noPrint: true },
    ...tamatebakoPrims([0, 0], w, lw, lid), ...tamatebakoSmoke([0, -w * .4], w, num(p, "smoke", w * 6), u, cx.seed, num(p, "toward", 0))];
}

export const RYUGU_MOTIFS = { tamatebako };
export const ANIMATED_RYUGU = ["tamatebako"] as const;

// ---- Looks ------------------------------------------------------------------------------------------------------------------------

/** Otohime, the Dragon King's daughter: dragon crown, long loose hair, a seigaiha-wave robe over vermilion and green. */
export const UKIYOE_OTOHIME_LOOK: UkiyoeFigureLook = {
  hair: "long", hat: "dragon", robe: "ai", robePattern: { type: "seigaiha", color: "sora", scale: .5, opacity: .75 }, under: "shu", layers: ["shu", "kusa", "gofun"],
  obi: "kin", sleeves: "long", stole: "kusa", feet: "bare", build: "slim", lower: "robe", uchikake: "ai", lining: "shu", prop: "hiogi",
} as UkiyoeFigureLook;
/** The Dragon King (Ryūjin): dragon crown, white hair and beard, a red robe. */
export const UKIYOE_RYUJIN_LOOK: UkiyoeFigureLook = {
  hair: "elder", hairColor: "gofun", beard: true, hat: "dragon", robe: "shu", robePattern: { type: "kikko", color: "kin", scale: .6, opacity: .5 }, under: "kusa",
  lower: "hakama", hakama: "kogecha", feet: "bare", build: "stout", prop: "shaku",
} as UkiyoeFigureLook;
/** Urashima Tarō, the young fisherman: topknot, an indigo jacket over a tucked robe, bare legs. */
export const UKIYOE_URASHIMA_LOOK: UkiyoeFigureLook = {
  hair: "chonmage", robe: "ai", robePattern: { type: "yagasuri", color: "sora", scale: .45, opacity: .6 }, obi: "kogecha", lower: "tucked", legs: "hada", feet: "waraji", build: "average",
} as UkiyoeFigureLook;
/** The same person grown very old in a moment: white hair and beard, the clothes unchanged. */
export function agedLook(look: UkiyoeFigureLook): UkiyoeFigureLook {
  return { ...look, hair: "elder", hairColor: "gofun", beard: true, legs: look.legs === "hada" ? "hada" : look.legs } as UkiyoeFigureLook;
}

/** Where the box sits in two hands: between the wrists, a little below them. */
export const tamatebakoHeld = (a: Pt, b: Pt, H: number): Pt => [lerp(a[0], b[0], .5), lerp(a[1], b[1], .5) + H * .03];
