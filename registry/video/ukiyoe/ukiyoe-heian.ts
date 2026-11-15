/**
 * UKIYO1 Heian court, after the Tosa-school *Evening Face* (Yūgao) scene of the Tale of Genji (Met 45743: the lady in
 * pink layered robes and red hakama, the noble in green with his black cap, the black-lacquered ox-cart with its great
 * wheels and blinds), Hokusai's *Court Lady* (Met 57286: the robes spread round her in many coloured layers, the hair
 * falling straight to the floor) and the Genji scroll's roofless palace rooms (Met 670936).
 *
 * - Hair `heian`: parted, falling straight and loose down the back to the floor (pooling behind when she kneels), the
 *   cheek locks (binsogi) cut at the jaw.
 * - Hat `kanmuri`: the court cap, black lacquered, with its tail (ei) standing up behind.
 * - Props `shaku` (the noble's flat baton held upright) and `hiogi` (the cypress fan with its coloured streamers).
 * - The twelve layers (jūnihitoe) are the figure's `layers` with the red `hakama`; `junihitoe()` gives a look.
 * - Motifs: `gissha` (the ox-cart; its wheels turn by `roll`, px travelled), `sudare` (a bamboo blind rolling up by
 *   `up`), `kicho` (a standing curtain screen whose silk panels stir) and `shinden` (a palace veranda: raised floor,
 *   railing, pillars, blinds in the bays, the cypress-bark roof).
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, clamp, clamp01, hash01, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { ellipseD, rectD } from "./ukiyoe-prims";
import type { UkiyoeFill, UkiyoePaint } from "./ukiyoe-pigments";
import type { UkiyoeAction, UkiyoeFigureLook } from "./ukiyoe-figure";
import type { UkiyoeNode, UkiyoeSceneSpec } from "./ukiyoe-scene";
import { eye } from "./ukiyoe-tsukumo";

type Map2 = (x: number, y: number) => Pt;
const f1 = (n: number) => n.toFixed(1);
const LACQUER: UkiyoeFill = { type: "linear", angle: 90, stops: [[0, "kogecha", 1], [.5, "sumi", 1], [1, "sumi", 1]] };
const WOOD: UkiyoeFill = { type: "linear", angle: 0, stops: [[0, "cha", 1], [.5, "kincha", 1], [1, "cha", 1]] };

/**
 * Heian hair in profile (head units, ±20 the face): the crown smooth and parted, the mass falling straight down the
 * back to `len` units below the head (the floor), its ends pooling behind when `pool` > 0; the cheek lock at the jaw.
 */
export function heianHairSide(P: Map2, lw: number, hairC: UkiyoePaint, len: number, pool: number, sway: number): { behind: Prim[]; over: Prim[] } {
  const back: Pt[] = [P(-4, -20), P(-14, -12), P(-17, 4), P(-16 - sway * .3, 40), P(-15 - sway, len * .55), P(-14 - sway * 1.3, len * .9), P(-18 - sway * 1.4 - pool * 50, len), P(-8 - sway - pool * 20, len + 2), P(-6, len * .6), P(-5, 20), P(-2, 8)];
  const behind: Prim[] = [{ t: "fill", d: smoothD(back, true, .35), fill: hairC, outline: lw }];
  const strands: string[] = [];
  for (let i = 1; i < 4; i++) strands.push(smoothD([P(-6 - i * 2.5, 0), P(-8 - i * 2.4 - sway * .4, len * .5), P(-9 - i * 2.2 - sway * 1.1 - pool * 18 * i / 3, len * .97)], false, .4));
  behind.push({ t: "stroke", d: strands.join(""), color: "usuzumi", width: lw * .5, opacity: .45 });
  const over: Prim[] = [{ t: "fill", d: smoothD([P(-1, -21), P(9, -19), P(15, -11), P(11, -9), P(6, -12), P(2, -6), P(1, 6), P(3, 14), P(-3, 16), P(-6, 4), P(-12, -14)], true, .4), fill: hairC, outline: lw }];
  return { behind, over };
}

/** Heian hair square on (radius 1): parted crown, hair framing the face to the jaw and falling to the floor either side (front) or as one sheet (back). */
export function heianHairSquare(P: Map2, lw: number, hairC: UkiyoePaint, len: number, back: boolean): Prim[] {
  const out: Prim[] = [];
  if (back) out.push({ t: "fill", d: smoothD([P(-.95, -.4), P(-1.1, 1), P(-1.05, len * .5), P(-.8, len), P(.8, len), P(1.05, len * .5), P(1.1, 1), P(.95, -.4), P(.6, -1.05), P(0, -1.15), P(-.6, -1.05)], true, .35), fill: hairC, outline: lw });
  else {
    for (const s of [-1, 1]) out.push({ t: "fill", d: smoothD([P(s * .85, -.3), P(s * 1.1, .8), P(s * 1.15, len * .5), P(s * 1.05, len), P(s * .7, len), P(s * .78, len * .5), P(s * .7, .9)], true, .35), fill: hairC, outline: lw });
    out.push({ t: "fill", d: smoothD([P(-.95, -.1), P(-.85, -.95), P(0, -1.15), P(.85, -.95), P(.95, -.1), P(.72, .6), P(.62, .1), P(.4, -.62), P(0, -.78), P(-.4, -.62), P(-.62, .1), P(-.72, .6)], true, .4), fill: hairC, outline: lw });
  }
  return out;
}

/** The kanmuri, profile (head units): a black lacquered cap over the crown, the knot (koji) behind, the ei tail standing up and curving back. */
export function kanmuriSide(P: Map2, lw: number): Prim[] {
  return [{ t: "fill", d: smoothD([P(-13, -12), P(-12, -22), P(0, -27), P(12, -22), P(13, -14), P(0, -16)], true, .4), fill: LACQUER, outline: lw },
    { t: "fill", d: smoothD([P(-8, -22), P(-8, -32), P(-2, -34), P(1, -24)], true, .35), fill: "sumi", outline: lw },
    { t: "fill", d: carvedLine([P(-9, -30), P(-18, -44), P(-30, -50), P(-38, -46)], 4.5, { taper: "end", minRatio: .6, smooth: true }), fill: "sumi", outline: lw * .6 },
    { t: "stroke", d: [-28, -33].map(x => `M${f1(P(x, -50)[0])} ${f1(P(x, -50)[1])}l${f1(P(1, 4)[0] - P(0, 0)[0])} ${f1(P(1, 4)[1] - P(0, 0)[1])}`).join(""), color: "usuzumi", width: lw * .5 }];
}

/** The kanmuri square on (radius 1). */
export function kanmuriSquare(P: Map2, lw: number, back: boolean): Prim[] {
  return [{ t: "fill", d: carvedLine([P(0, -1.2), P(back ? .05 : 0, -2.2), P(back ? .1 : .05, -2.9)], .45 * Math.abs(P(1, 0)[0] - P(0, 0)[0]), { taper: "end", minRatio: .7 }), fill: "sumi", outline: lw * .6 },
    { t: "fill", d: smoothD([P(-.9, -.55), P(-.8, -1.25), P(0, -1.45), P(.8, -1.25), P(.9, -.55), P(0, -.7)], true, .4), fill: LACQUER, outline: lw },
    { t: "fill", d: smoothD([P(-.35, -1.2), P(-.3, -1.75), P(.3, -1.75), P(.35, -1.2)], true, .35), fill: "sumi", outline: lw }];
}

/** The shaku held upright before the chest (hand `w`), or the hiogi fan opened with its streamers. */
export function courtProp(prop: "shaku" | "hiogi", w: Pt, H: number, lw: number, frame: number): Prim[] {
  if (prop === "shaku") return [{ t: "fill", d: smoothD([[w[0] - H * .012, w[1] + H * .03], [w[0] - H * .014, w[1] - H * .14], [w[0], w[1] - H * .15], [w[0] + H * .014, w[1] - H * .14], [w[0] + H * .012, w[1] + H * .03]], true, .2), fill: "paper", outline: lw }];
  const c: Pt = [w[0] + H * .01, w[1] - H * .02], R = H * .1, out: Prim[] = [];
  const ribs: string[] = [], d = [c] as Pt[];
  for (let i = 0; i <= 10; i++) { const a = (-160 + i * 14) * Math.PI / 180; d.push([c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R]); ribs.push(`M${f1(c[0])} ${f1(c[1])}L${f1(c[0] + Math.cos(a) * R)} ${f1(c[1] + Math.sin(a) * R)}`); }
  out.push({ t: "fill", d: smoothD(d, true, .1), fill: { type: "radial", stops: [[0, "kin", 1], [1, "paper", 1]] }, outline: lw }, { t: "stroke", d: ribs.join(""), color: "kincha", width: lw * .5, opacity: .7 });
  // Streamers of coloured silk cords from the fan's corners.
  for (const [k, col] of [[0, "beni"], [1, "matsu"], [2, "murasaki"]] as const) {
    const a = (k ? 0 : -160) * Math.PI / 180, s: Pt = [c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R];
    out.push({ t: "stroke", d: smoothD([s, [s[0] + Math.sin(frame / 9 + k) * H * .01, s[1] + H * .06], [s[0] + Math.sin(frame / 7 + k) * H * .02, s[1] + H * .13]], false, .5), color: col, width: lw * 1.6 });
  }
  return out;
}

/** A court lady's look: the layered robes (outermost first), red hakama, Heian hair. */
export function junihitoe(layers: readonly UkiyoePaint[] = ["sakura", "beni", "ki", "kusa", "murasaki"], outer: UkiyoePaint = "sakura"): UkiyoeFigureLook {
  return { hair: "heian", robe: outer, robePattern: { type: "kikko", color: "gofun", scale: .4, opacity: .35 }, layers, lower: "hakama", hakama: "beni", under: "gofun", obi: outer, feet: "bare", build: "slim", sleeves: "long", prop: "hiogi" };
}
export const UKIYOE_HEIAN_LOOKS = {
  lady: junihitoe(),
  lady2: junihitoe(["murasaki", "ai", "sora", "gofun", "beni"], "murasaki"),
  noble: { hair: "chonmage", hat: "kanmuri", robe: "matsu", robePattern: { type: "kikko", color: "kusa", scale: .5, opacity: .4 }, lower: "hakama", hakama: "ai", obi: "kin", feet: "bare", build: "average", sleeves: "long", prop: "shaku" },
  courtier: { hair: "chonmage", hat: "eboshi", robe: "gofun", lower: "hakama", hakama: "murasaki", obi: "usuzumi", feet: "bare", build: "average", sleeves: "long", prop: "shaku" },
  attendant: { hair: "chonmage", hat: "eboshi", robe: "gofun", lower: "tucked", legs: "hada", feet: "waraji", build: "stout" },
} as const;

// ---- Motifs ------------------------------------------------------------------------------------------------------------------------

type MP = Readonly<Record<string, unknown>>;
const num = (p: MP, k: string, d: number) => typeof p[k] === "number" && Number.isFinite(p[k]) ? p[k] as number : d;

/** A spoked wheel at c, radius r, turned by `turn` radians: rim, hub and spokes. */
function wheel(c: Pt, r: number, turn: number, lw: number): Prim[] {
  const spokes: string[] = [];
  for (let i = 0; i < 12; i++) { const a = turn + i * Math.PI / 6; spokes.push(`M${f1(c[0] + Math.cos(a) * r * .18)} ${f1(c[1] + Math.sin(a) * r * .18)}L${f1(c[0] + Math.cos(a) * r * .88)} ${f1(c[1] + Math.sin(a) * r * .88)}`); }
  return [{ t: "stroke", d: ellipseD(c[0], c[1], r * .94, r * .94), color: "sumi", width: r * .12 }, { t: "stroke", d: ellipseD(c[0], c[1], r * .94, r * .94), color: "kogecha", width: r * .04 },
    { t: "stroke", d: spokes.join(""), color: "sumi", width: r * .05 }, { t: "fill", d: ellipseD(c[0], c[1], r * .2, r * .2), fill: "kin", outline: lw }];
}

/** A bamboo blind (sudare): fine horizontal slats, a brocade border, red tassels; `up` (0–1) rolls it up. Params: width, height, up, color (border). */
export function sudare(p: MP, cx: { frame: number; wind: number }): Prim[] {
  const W = num(p, "width", 160), H = num(p, "height", 200), up = clamp01(num(p, "up", 0)), lw = Math.max(.8, W * .006), h = H * (1 - up * .88), out: Prim[] = [];
  const border = typeof p.color === "string" ? p.color as UkiyoePaint : "murasaki", sway = Math.sin(cx.frame / 25) * W * .005 + cx.wind * W * .01;
  const blind = smoothD([[0, 0], [W, 0], [W + sway, h], [sway, h]], true, .05);
  // Fine bamboo: you see dimly through it (the court ladies behind their blinds).
  out.push({ t: "fill", d: blind, fill: { type: "linear", angle: 90, stops: [[0, "kincha", .6], [1, "ki", .45]] }, outline: lw });
  out.push({ t: "clip", d: blind, key: `sudare-${f1(W)}-${f1(H)}`, prims: [{ t: "stroke", d: Array.from({ length: Math.max(2, Math.round(h / (H * .025))) }, (_, i) => `M0 ${f1(i * H * .025)}h${f1(W + Math.abs(sway))}`).join(""), color: "cha", width: lw * .5, opacity: .7 }] });
  out.push({ t: "fill", d: rectD(-W * .02, -H * .03, W * 1.04, H * .05), fill: border, outline: lw, pattern: { type: "kikko", color: "kin", scale: .3, opacity: .6 } });
  if (up > .2) out.push({ t: "fill", d: rectD(0, h - H * .02, W, H * .06), fill: "kincha", outline: lw });
  for (const x of [.25, .75]) out.push({ t: "stroke", d: `M${f1(W * x)} 0V${f1(h + H * .05)}`, color: "beni", width: lw * 1.4 }, { t: "fill", d: smoothD([[W * x - W * .03, h + H * .05], [W * x + W * .03, h + H * .05], [W * x + W * .02 + sway, h + H * .14], [W * x - W * .02 + sway, h + H * .14]], true, .2), fill: "beni" });
  return out;
}

/** A curtain screen (kichō): a black lacquered frame, silk panels with painted bands hanging from the top bar, stirring. Params: width, height, color. */
export function kicho(p: MP, cx: { frame: number; wind: number }): Prim[] {
  const W = num(p, "width", 160), H = num(p, "height", 200), col = typeof p.color === "string" ? p.color as UkiyoePaint : "sakura", lw = Math.max(.8, W * .006), out: Prim[] = [];
  out.push({ t: "fill", d: rectD(-W * .06, -H * .04, W * .12, H * .04), fill: LACQUER, outline: lw }, { t: "fill", d: rectD(-W * .015, -H, W * .03, H), fill: LACQUER, outline: lw });
  out.push({ t: "fill", d: rectD(-W * .55, -H * .97, W * 1.1, H * .03), fill: LACQUER, outline: lw });
  for (let i = 0; i < 4; i++) {
    const x0 = -W * .53 + i * W * .265, s = Math.sin(cx.frame / 20 + i) * W * .02 + cx.wind * W * .04, d = smoothD([[x0, -H * .94], [x0 + W * .25, -H * .94], [x0 + W * .25 + s, -H * .1], [x0 + s, -H * .1]], true, .05);
    out.push({ t: "fill", d, fill: { type: "linear", angle: 90, stops: [[0, "gofun", .9], [1, col, .95]] }, outline: lw * .8 });
    out.push({ t: "stroke", d: `M${f1(x0 + W * .125)} ${f1(-H * .94)}l${f1(s)} ${f1(H * .84)}`, color: "beni", width: lw * 1.6, opacity: .7 });
    out.push({ t: "clip", d, key: `kicho-${i}-${f1(W)}`, prims: [{ t: "fill", d: rectD(x0 - W * .05, -H * .55, W * .35, H * .08), fill: "kin", opacity: .6 }] });
  }
  return out;
}

/** The ox-cart (gissha): a black-lacquered house on two great wheels, blinds front and back, the shafts. Params: width, roll (px travelled), travel (px over progress 0→1), blinds (0–1 up). */
export function gissha(p: MP, cx: { frame: number; wind: number; progress: number }): Prim[] {
  // `travel` × the node's keyed progress is the distance rolled, so the wheels turn with the cart's keyed travel.
  const W = num(p, "width", 340), R = W * .3, lw = Math.max(1, W * .005), roll = num(p, "roll", 0) + num(p, "travel", 0) * cx.progress, out: Prim[] = [];
  const turn = roll / R, box: [number, number, number, number] = [-W * .42, -W * .78, W * .66, W * .44];
  // The shafts reach forward to the yoke; the box sits over the axle; the near wheel in front of it.
  out.push({ t: "fill", d: carvedLine([[box[0] + box[2] * .6, -R * 1.05], [W * .62, -R * .8], [W * .72, -R * .85]], W * .025, { taper: "none" }), fill: LACQUER, outline: lw });
  out.push(...wheel([-W * .05, -R], R * .96, turn, lw).map(q => ({ ...q, opacity: .7 } as Prim)));
  out.push({ t: "fill", d: smoothD([[box[0] - W * .03, box[1]], [box[0] + box[2] * .5, box[1] - W * .06], [box[0] + box[2] + W * .03, box[1]], [box[0] + box[2] + W * .05, box[1] + W * .04], [box[0] - W * .05, box[1] + W * .04]], true, .4), fill: LACQUER, outline: lw * 1.2 });
  out.push({ t: "fill", d: rectD(box[0], box[1] + W * .03, box[2], box[3] - W * .03), fill: LACQUER, outline: lw * 1.2, pattern: { type: "kikko", color: "kin", scale: .5, opacity: .3 } });
  out.push({ t: "fill", d: rectD(box[0] + box[2] * .1, box[1] + W * .08, box[2] * .45, box[3] * .55), fill: "kin", opacity: .2 });
  // Oboro-guruma: a vast face filling the front of the cart where the blind hangs, glaring out.
  const face = clamp01(num(p, "face", 0));
  if (face > 0) {
    const fc: Pt = [box[0] + box[2] * .55, box[1] + box[3] * .55], fr = box[3] * .6;
    out.push({ t: "fill", d: ellipseD(fc[0], fc[1], fr * .85, fr), fill: "hada", outline: lw * 1.2, opacity: face });
    for (const sx of [-1, 1]) out.push({ t: "group", opacity: face, prims: [...eye([fc[0] + sx * fr * .35, fc[1] - fr * .15], fr * .2, 1, lw, sx * -8), { t: "line", d: carvedLine([[fc[0] + sx * fr * .6, fc[1] - fr * .45], [fc[0] + sx * fr * .12, fc[1] - fr * .35]], fr * .1, { taper: "end" }), color: "sumi" }] });
    out.push({ t: "fill", d: smoothD([[fc[0] - fr * .4, fc[1] + fr * .4], [fc[0], fc[1] + fr * .3], [fc[0] + fr * .4, fc[1] + fr * .4], [fc[0], fc[1] + fr * (.62 + .1 * Math.sin(cx.frame / 5))]], true, .4), fill: "kogecha", outline: lw, opacity: face });
    out.push(...wheel([W * .02, -R], R, turn, lw));
    return out;
  }
  // The blind across the front, its trailing silk streamers.
  out.push({ t: "group", transform: `translate(${f1(box[0] + box[2] * .72)} ${f1(box[1] + W * .05)})`, prims: sudare({ width: box[2] * .26, height: box[3] * .8, up: num(p, "blinds", 0), color: "beni" }, cx) });
  out.push({ t: "stroke", d: smoothD([[box[0] + box[2], box[1] + W * .1], [box[0] + box[2] + W * .04 + cx.wind * W * .03, box[1] + W * .3], [box[0] + box[2] + W * .02 + Math.sin(cx.frame / 9) * W * .02, box[1] + W * .48]], false, .5), color: "gofun", width: W * .02 });
  out.push(...wheel([W * .02, -R], R, turn, lw));
  return out;
}

/**
 * A palace veranda (shinden): the floor raised on posts over the garden, a vermilion-topped railing, pillars with blinds
 * hanging in the bays (`up` rolls them), a dark interior, the brown cypress-bark roof. Params: width, height, bays, up.
 */
export function shinden(p: MP, cx: { frame: number; wind: number; seed: number; progress: number }): Prim[] {
  const W = num(p, "width", 900), H = num(p, "height", 480), bays = clamp(Math.round(num(p, "bays", 4)), 1, 10), lw = Math.max(1, W * .002), out: Prim[] = [];
  // `rise` × the node's keyed progress rolls the blinds up over time; `part` back/front puts figures between the interior and the blinds.
  const up = clamp01(num(p, "up", 0) + num(p, "rise", 0) * cx.progress), part = typeof p.part === "string" ? p.part : "all";
  const floor = -H * .2, top = -H * .82, bw = W / bays;
  if (part === "front") return shindenFront(W, H, bays, up, lw, floor, top, bw, cx);
  // Under-floor posts, the floor's edge, the dark interior wall behind the bays.
  out.push({ t: "fill", d: Array.from({ length: bays + 1 }, (_, i) => rectD(-W / 2 + i * bw - W * .006, floor, W * .012, -floor)).join(""), fill: "kogecha", outline: lw });
  out.push({ t: "fill", d: rectD(-W / 2, top, W, floor - top), fill: { type: "linear", angle: 90, stops: [[0, "sumi", 1], [1, "kogecha", 1]] } });
  out.push({ t: "fill", d: rectD(-W / 2 - W * .03, floor - H * .03, W * 1.06, H * .04), fill: WOOD, outline: lw, grain: .6 });
  // Roof (drawn with the back part so figures stand under it).
  out.push(...shindenRoof(W, H, top, lw));
  if (part === "back") return out;
  out.push(...shindenFront(W, H, bays, up, lw, floor, top, bw, cx));
  return out;
}

function shindenRoof(W: number, H: number, top: number, lw: number): Prim[] {
  return [{ t: "fill", d: smoothD([[-W / 2 - W * .1, top + H * .02], [-W / 2 + W * .1, top - H * .16], [W / 2 - W * .1, top - H * .16], [W / 2 + W * .1, top + H * .02], [W / 2 + W * .08, top + H * .05], [-W / 2 - W * .08, top + H * .05]], true, .25), fill: { type: "linear", angle: 90, stops: [[0, "kogecha", 1], [1, "cha", 1]] }, outline: lw * 1.4, grain: .8 },
    { t: "stroke", d: [.25, .5].map(k => `M${f1(-W / 2 - W * .1 + W * .2 * k)} ${f1(top + H * .02 - H * .18 * k)}H${f1(W / 2 + W * .1 - W * .2 * k)}`).join(""), color: "kogecha", width: lw, opacity: .6 }];
}

/** The front of the veranda: the blinds in the bays, the pillars, the railing. */
function shindenFront(W: number, H: number, bays: number, up: number, lw: number, floor: number, top: number, bw: number, cx: { frame: number; wind: number; seed: number }): Prim[] {
  const out: Prim[] = [];
  for (let i = 0; i < bays; i++) out.push({ t: "group", transform: `translate(${f1(-W / 2 + i * bw + bw * .04)} ${f1(top + H * .04)})`, prims: sudare({ width: bw * .92, height: (floor - top) * .82, up: (up + hash01(cx.seed, i, 1) * .1 * up), color: "murasaki" }, cx) });
  for (let i = 0; i <= bays; i++) out.push({ t: "fill", d: rectD(-W / 2 + i * bw - W * .009, top, W * .018, floor - top), fill: WOOD, outline: lw, grain: .5 });
  // The railing: posts, a rail with vermilion caps.
  const ry = floor - H * .1;
  out.push({ t: "stroke", d: Array.from({ length: bays * 3 + 1 }, (_, i) => `M${f1(-W / 2 - W * .03 + (W * 1.06) * i / (bays * 3))} ${f1(floor - H * .03)}V${f1(ry)}`).join(""), color: "cha", width: lw * 2 });
  out.push({ t: "fill", d: rectD(-W / 2 - W * .03, ry - H * .012, W * 1.06, H * .016), fill: "shu", outline: lw });
  return out;
}

export const HEIAN_MOTIFS = { gissha, sudare, kicho, shinden };
export const ANIMATED_HEIAN = ["gissha", "sudare", "kicho", "shinden"] as const;

// ---- Scene recipes -----------------------------------------------------------------------------------------------------------------

export type UkiyoeHeianScene = "veranda" | "oxcart" | "chamber";
export const UKIYOE_HEIAN_SCENES: readonly UkiyoeHeianScene[] = ["veranda", "oxcart", "chamber"];

/**
 * `veranda`: the palace in moonlight, a lady behind the blinds that roll up, a noble on the garden path with his baton
 * bowing to her. `oxcart`: the black ox drawing the lacquered cart along a road, attendants walking, its wheels turning
 * with the distance. `chamber`: two court ladies kneeling in their spread layered robes by a curtain screen.
 */
export function heianScene(kind: UkiyoeHeianScene = "veranda", frames = 300): UkiyoeSceneSpec {
  const night = kind === "veranda";
  const look = (k: keyof typeof UKIYOE_HEIAN_LOOKS) => UKIYOE_HEIAN_LOOKS[k] as unknown as UkiyoeFigureLook;
  const nodes: UkiyoeNode[] = [{ id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, band: .5, ...(night ? { top: "yoru", mid: "ai", horizon: "murasaki" } : { horizon: "beni" }) } }];
  const ground = (fill: unknown) => nodes.push({ id: "ground", kind: "block", x: 960, y: 1000, shape: { type: "rect", width: 1920, height: 300 }, fill, line: 0 } as unknown as UkiyoeNode);
  if (kind === "veranda") {
    nodes.push({ id: "moon", kind: "motif", motif: "moon", x: 1650, y: 180, params: { radius: 60 } } as UkiyoeNode);
    ground({ type: "linear", angle: 90, stops: [[0, "paper", 1], [1, "usuzumi", 1]] });
    // The lady kneels on the veranda floor between the palace's interior and its blinds, which roll half up as the noble comes.
    const px = { width: 1100, height: 640, bays: 4, up: .1, rise: .4 }, keys = [{ frame: 0, progress: 0 }, { frame: 100, progress: 0 }, { frame: 180, progress: 1 }];
    nodes.push({ id: "palace", kind: "motif", motif: "shinden", x: 820, y: 860, params: { ...px, part: "back" }, keys } as unknown as UkiyoeNode);
    nodes.push({ id: "lady", kind: "figure", x: 880, y: 860 - 640 * .2 - 640 * .03, scale: 1.5, look: look("lady"), facing: "right", actions: [{ type: "kneel", start: 0, end: frames }, { type: "look", start: 150, end: frames, angle: 8 }] } as unknown as UkiyoeNode);
    nodes.push({ id: "palace-front", kind: "motif", motif: "shinden", x: 820, y: 860, params: { ...px, part: "front" }, keys } as unknown as UkiyoeNode);
    nodes.push({ id: "noble", kind: "figure", x: 1700, y: 960, scale: 1.7, look: look("noble"), facing: "left", actions: [{ type: "walk", start: 0, end: 120, to: -110 }, { type: "bow", start: 150, end: 230, angle: 30 }] } as unknown as UkiyoeNode);
    nodes.push({ id: "willow", kind: "motif", motif: "willow", x: 1820, y: 960, params: { height: 620 } } as UkiyoeNode);
  } else if (kind === "oxcart") {
    nodes.push({ id: "hills", kind: "motif", motif: "hills", x: 960, y: 800, params: { width: 2200, height: 240 } } as UkiyoeNode);
    ground({ type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, "cha", 1]] });
    const dist = 760, actions: UkiyoeAction[] = [{ type: "walk", start: 0, end: frames, to: dist }];
    // The cart rolls with the ox: a motif can't travel, so it is keyed along the same path and its wheels turn by roll.
    const keys = [{ frame: 0, x: 340, progress: 0 }, { frame: frames, x: 340 + dist, progress: 1 }];
    nodes.push({ id: "cart", kind: "motif", motif: "gissha", x: 340, y: 930, params: { width: 440, travel: dist }, keys } as unknown as UkiyoeNode);
    // The ox stands in the shafts: its neck at the shafts' tip (the shafts reach .72 × width ahead; its neck is ~73 px ahead of its middle).
    nodes.push({ id: "ox", kind: "creature", species: "ox", x: 340 + 440 * .72 - 70, y: 930, scale: 1.25, facing: "right", actions } as unknown as UkiyoeNode);
    nodes.push({ id: "drover", kind: "figure", x: 340 + 440 * 1.3, y: 960, scale: 1.6, look: look("attendant"), facing: "right", actions: [{ type: "walk", start: 0, end: frames, to: dist }] } as unknown as UkiyoeNode);
    nodes.push({ id: "follower", kind: "figure", x: -80, y: 960, scale: 1.6, look: look("courtier"), facing: "right", actions: [{ type: "walk", start: 0, end: frames, to: dist }] } as unknown as UkiyoeNode);
  } else {
    nodes.push({ id: "room", kind: "motif", motif: "room", x: 960, y: 900, params: { width: 1500, height: 600, depth: 210, back: ["fusuma", "fusuma", "fusuma"], art: "clouds", kind: "boards", part: "back" } } as UkiyoeNode);
    nodes.push({ id: "screen", kind: "motif", motif: "kicho", x: 1300, y: 860, params: { width: 300, height: 360 } } as UkiyoeNode);
    nodes.push({ id: "lady1", kind: "figure", x: 720, y: 860, scale: 2, look: look("lady"), facing: "right", actions: [{ type: "kneel", start: 0, end: frames }, { type: "talk", start: 60, end: 140 }] } as unknown as UkiyoeNode);
    nodes.push({ id: "lady2", kind: "figure", x: 1080, y: 860, scale: 2, look: look("lady2"), facing: "left", actions: [{ type: "kneel", start: 0, end: frames }, { type: "talk", start: 160, end: 240 }] } as unknown as UkiyoeNode);
    nodes.push({ id: "room-front", kind: "motif", motif: "room", x: 960, y: 900, params: { width: 1500, height: 600, depth: 210, kind: "boards", part: "front", eave: "none" } } as UkiyoeNode);
  }
  return { version: 1, id: `heian-${kind}`, width: 1920, height: 1080, durationFrames: frames, seed: 59, cadence: 2, palette: { preset: night ? "night" : "spring" }, wind: { base: .3, turbulence: .3 }, nodes };
}
