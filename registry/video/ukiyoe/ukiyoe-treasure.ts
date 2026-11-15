/**
 * UKIYO1 hero's gear and the oni's treasure, after Utagawa Toyoharu's *Momotarō and His Animal Friends Conquer the
 * Demons* (public domain: the beaten oni crawl forward with the treasure heaped on a tray — sacks tied at the neck,
 * a branch of red coral, the mallet of luck, the hat and straw cloak of invisibility), Yoshitoshi's *Momotarō Goes to
 * Devil's Island* (public domain: a tall nobori banner on a pole with a small streaming flag at its head) and the
 * Momotarō inrō (Met 45583, CC0).
 *
 * - Prop `nobori`: a tall banner on a pole held upright, its white cloth tied to the pole along one side, a peach crest
 *   in place of lettering, a little flag (fukinagashi) streaming from the top in the wind.
 * - Prop `dango`: millet dumplings (kibi-dango) held out in the hand on a fold of paper, to be given away.
 * - Motif `takara`: the treasure heap on its lacquered stand (sanbō): sacks, coral, gold coins, the mallet, the hat and
 *   the straw cloak.
 * - Motif `kuruma`: a two-wheeled handcart (daihachi-guruma) carrying the heap, its shafts forward; the wheels turn by
 *   `roll` or `travel` × keyed progress, as the ox-cart's do.
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, clamp01, hash01, lerp, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD, rectD } from "./ukiyoe-prims";
import type { UkiyoeFill, UkiyoePaint } from "./ukiyoe-pigments";
import { kozuchi } from "./ukiyoe-folk";

type MP = Readonly<Record<string, unknown>>;
const num = (p: MP, k: string, d: number) => typeof p[k] === "number" && Number.isFinite(p[k]) ? p[k] as number : d;
const f1 = (n: number) => n.toFixed(1);
const WOOD: UkiyoeFill = { type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, "cha", 1]] };
const LACQUER: UkiyoeFill = { type: "linear", angle: 90, stops: [[0, "shu", 1], [1, "beni", 1]] };

/** A peach crest: the fruit with its two leaves, in a roundel. */
function peachCrest(c: Pt, r: number, lw: number): Prim[] {
  return [
    { t: "fill", d: circleD(c[0], c[1], r), fill: "gofun", outline: lw },
    { t: "fill", d: smoothD([[c[0], c[1] - r * .55], [c[0] + r * .5, c[1] - r * .05], [c[0] + r * .3, c[1] + r * .5], [c[0], c[1] + r * .6], [c[0] - r * .3, c[1] + r * .5], [c[0] - r * .5, c[1] - r * .05]], true, .5), fill: "beni", outline: lw * .7 },
    { t: "fill", d: smoothD([[c[0], c[1] - r * .55], [c[0] - r * .45, c[1] - r * .75], [c[0] - r * .2, c[1] - r * .45]], true, .4) + smoothD([[c[0], c[1] - r * .55], [c[0] + r * .4, c[1] - r * .8], [c[0] + r * .25, c[1] - r * .45]], true, .4), fill: "kusa", outline: lw * .6 },
  ];
}

/** The banner held upright in hand `w` (figure height H): pole, cloth tied along the pole, crest, streaming top flag. */
export function noboriProp(w: Pt, H: number, lw: number, wind: number, frame: number): Prim[] {
  const top: Pt = [w[0] + H * .02, w[1] - H * 1.25], foot: Pt = [w[0] - H * .01, w[1] + H * .35], cw = H * .2, ch = H * .7, out: Prim[] = [];
  out.push({ t: "line", d: carvedLine([foot, top], H * .014, { taper: "none" }), color: "kogecha" });
  // The cloth hangs from a crossbar at the top and is tied to the pole along its edge; its free edge stirs in the wind.
  const sway = Math.sin(frame / 14) * H * .008 + wind * H * .02, x0 = top[0] + H * .01, y0 = top[1] + H * .06;
  out.push({ t: "line", d: carvedLine([[x0, y0], [x0 + cw, y0]], H * .01, { taper: "none" }), color: "kogecha" });
  out.push({ t: "fill", d: smoothD([[x0, y0], [x0 + cw, y0], [x0 + cw + sway, y0 + ch * .5], [x0 + cw + sway * 1.4, y0 + ch], [x0, y0 + ch]], true, .08), fill: "gofun", outline: lw, grain: .3 });
  out.push({ t: "fill", d: rectD(x0, y0, cw * .14, ch), fill: "beni", outline: lw * .5 });
  out.push({ t: "stroke", d: [.2, .4, .6, .8].map(k => `M${f1(x0)} ${f1(y0 + ch * k)}l${f1(-H * .015)} 0`).join(""), color: "sumi", width: lw });
  out.push(...peachCrest([x0 + cw * .58 + sway * .3, y0 + ch * .32], cw * .3, lw));
  // The fukinagashi: a little tapering flag streaming from the pole's head.
  const s = Math.sin(frame / 7) * H * .015, streamer: Pt[] = [[top[0], top[1] + H * .02], [top[0] + H * .1, top[1] + s], [top[0] + H * .2, top[1] + H * .02 - s], [top[0] + H * .28, top[1] + s * .5]];
  out.push({ t: "line", d: carvedLine(streamer, H * .035, { taper: "end", minRatio: .2, smooth: true }), color: "beni" });
  out.push({ t: "fill", d: circleD(top[0], top[1] - H * .015, H * .014), fill: "kin", outline: lw * .5 });
  return out;
}

/** Kibi-dango: three millet dumplings on a fold of white paper, held out in hand `w`. */
export function dangoProp(w: Pt, H: number, lw: number): Prim[] {
  const c: Pt = [w[0] + H * .03, w[1] - H * .02], r = H * .018;
  return [
    { t: "fill", d: smoothD([[c[0] - r * 3, c[1] + r * .6], [c[0] + r * 3, c[1] + r * .2], [c[0] + r * 2.2, c[1] + r * 1.6], [c[0] - r * 2.4, c[1] + r * 1.8]], true, .2), fill: "gofun", outline: lw * .6 },
    { t: "fill", d: [-1.6, 0, 1.6].map(k => circleD(c[0] + k * r, c[1] - (k === 0 ? r * .4 : 0), r)).join(""), fill: { type: "radial", stops: [[0, "ki", 1], [1, "kincha", 1]] }, outline: lw * .6 },
  ];
}

/** The treasure heap drawn about its base centre `c`, `S` wide. */
function treasureHeap(c: Pt, S: number, lw: number, seed: number): Prim[] {
  const out: Prim[] = [], [x, y] = c;
  // The straw cloak of invisibility (kakuremino) laid at the back, the hat (kakuregasa) leaning on it.
  const cloak: Pt[] = [[x - S * .45, y], [x - S * .4, y - S * .42], [x - S * .1, y - S * .58], [x + S * .05, y - S * .3], [x - S * .05, y]];
  out.push({ t: "fill", d: smoothD(cloak, true, .3), fill: { type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, "cha", 1]] }, outline: lw, grain: 1 });
  out.push({ t: "stroke", d: Array.from({ length: 8 }, (_, i) => { const u = i / 8; return `M${f1(lerp(x - S * .4, x - S * .05, u))} ${f1(y - S * (.5 - .2 * u))}l${f1(-S * .03)} ${f1(S * .3)}`; }).join(""), color: "kogecha", width: lw * .6, opacity: .7 });
  out.push({ t: "fill", d: smoothD([[x - S * .2, y - S * .55], [x - S * .02, y - S * .78], [x + S * .16, y - S * .58], [x - S * .02, y - S * .6]], true, .25), fill: "kincha", outline: lw });
  // Sacks tied at the neck.
  for (const [dx, sz, col] of [[.12, .3, "gofun"], [.36, .24, "sakura"]] as const) {
    const sx = x + S * dx, s2 = S * sz;
    out.push({ t: "fill", d: smoothD([[sx - s2 * .5, y], [sx - s2 * .55, y - s2 * .6], [sx - s2 * .15, y - s2 * .95], [sx + s2 * .15, y - s2 * .95], [sx + s2 * .55, y - s2 * .6], [sx + s2 * .5, y]], true, .4), fill: col as UkiyoePaint, outline: lw });
    out.push({ t: "fill", d: smoothD([[sx - s2 * .12, y - s2 * .92], [sx, y - s2 * 1.18], [sx + s2 * .14, y - s2 * .92]], true, .4), fill: col as UkiyoePaint, outline: lw * .8 }, { t: "line", d: carvedLine([[sx - s2 * .16, y - s2 * .92], [sx + s2 * .16, y - s2 * .92]], lw * 2, { taper: "none" }), color: "beni" });
  }
  // A branch of red coral.
  const coral = (a: Pt, b: Pt, wd: number) => out.push({ t: "line", d: carvedLine([a, b], wd, { taper: "end", minRatio: .3 }), color: "shu" });
  const base: Pt = [x + S * .22, y - S * .3];
  coral(base, [x + S * .2, y - S * .72], S * .045); coral([x + S * .21, y - S * .5], [x + S * .34, y - S * .66], S * .03); coral([x + S * .2, y - S * .6], [x + S * .08, y - S * .78], S * .028); coral([x + S * .3, y - S * .6], [x + S * .36, y - S * .82], S * .022);
  // Gold coins (koban) spilling in front, and the mallet of luck.
  const coins: string[] = [];
  for (let i = 0; i < 9; i++) coins.push(ellipseD(x - S * .3 + S * .6 * hash01(seed, i, 1), y - S * .03 - S * .06 * hash01(seed, i, 2), S * .045, S * .028));
  out.push({ t: "fill", d: coins.join(""), fill: { type: "linear", angle: 90, stops: [[0, "kin", 1], [1, "ki", 1]] }, outline: lw * .6 });
  out.push(...kozuchi([x - S * .32, y - S * .08], -30, S * 1.1, lw));
  return out;
}

/** The treasure on its lacquered stand (sanbō). Params: size (width), stand (1 to draw the stand). Origin: the ground. */
export function takara(p: MP, cx: { seed: number }): Prim[] {
  const S = num(p, "size", 200), lw = Math.max(.8, S * .008), out: Prim[] = [], stand = num(p, "stand", 1) > 0, h = stand ? S * .22 : 0;
  out.push({ t: "fill", d: ellipseD(0, 0, S * .55, S * .05), fill: "sumi", opacity: .18, noPrint: true });
  if (stand) {
    out.push({ t: "fill", d: rectD(-S * .35, -h, S * .7, h * .8), fill: { type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, "cha", 1]] }, outline: lw, grain: .6 });
    out.push({ t: "fill", d: ellipseD(0, -h * .45, S * .07, h * .25), fill: "sumi", opacity: .7 });
    out.push({ t: "fill", d: rectD(-S * .5, -h - S * .04, S, S * .05), fill: LACQUER, outline: lw });
  }
  out.push(...treasureHeap([0, -h - S * .04], S * .9, lw, cx.seed));
  return out;
}

/** A spoked cart wheel at `c`, radius `r`, turned by `turn` radians. */
function cartWheel(c: Pt, r: number, turn: number, lw: number): Prim[] {
  const spokes: string[] = [];
  for (let i = 0; i < 8; i++) { const a = turn + i * Math.PI / 4; spokes.push(`M${f1(c[0] + Math.cos(a) * r * .2)} ${f1(c[1] + Math.sin(a) * r * .2)}L${f1(c[0] + Math.cos(a) * r * .9)} ${f1(c[1] + Math.sin(a) * r * .9)}`); }
  return [{ t: "stroke", d: circleD(c[0], c[1], r * .95), color: "kogecha", width: r * .14 }, { t: "stroke", d: circleD(c[0], c[1], r * .95), color: "cha", width: r * .05 },
    { t: "stroke", d: spokes.join(""), color: "kogecha", width: r * .07 }, { t: "fill", d: circleD(c[0], c[1], r * .2), fill: "cha", outline: lw }];
}

/**
 * The handcart (daihachi-guruma): a plank bed on one axle between two big wheels, long shafts reaching forward (+x),
 * the treasure heap roped on the bed. Params: width, roll (px travelled), travel (px over keyed progress 0 → 1),
 * load (1 for the treasure). Origin: the ground under the axle.
 */
export function kuruma(p: MP, cx: { seed: number; progress: number }): Prim[] {
  const W = num(p, "width", 360), R = W * .2, lw = Math.max(1, W * .006), roll = num(p, "roll", 0) + num(p, "travel", 0) * clamp01(cx.progress), turn = roll / R, out: Prim[] = [];
  const bed = -R * 1.05;
  out.push({ t: "fill", d: ellipseD(0, 0, W * .5, W * .03), fill: "sumi", opacity: .16, noPrint: true });
  out.push(...cartWheel([W * .04, -R], R * .92, turn, lw).map(q => ({ ...q, opacity: .75 } as Prim)));
  if (num(p, "load", 1) > 0) out.push(...treasureHeap([-W * .05, bed - W * .03], W * .62, lw, cx.seed));
  out.push({ t: "fill", d: rectD(-W * .45, bed - W * .03, W * .8, W * .04), fill: WOOD, outline: lw, grain: .8 });
  out.push({ t: "line", d: carvedLine([[W * .3, bed - W * .01], [W * .7, bed + W * .04], [W * .75, bed + W * .03]], W * .02, { taper: "none" }), color: "cha" });
  out.push({ t: "line", d: carvedLine([[-W * .35, bed - W * .2], [-W * .05, bed - W * .03], [W * .2, bed - W * .22]], lw * 1.6, { taper: "none" }), color: "kincha", opacity: .9 });
  out.push(...cartWheel([-W * .02, -R], R, turn, lw));
  return out;
}

export const TREASURE_MOTIFS = { takara, kuruma };
export const ANIMATED_TREASURE = ["kuruma"] as const;
