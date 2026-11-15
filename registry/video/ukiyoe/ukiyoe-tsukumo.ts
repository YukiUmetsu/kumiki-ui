/**
 * UKIYO1 tsukumogami (objects that come alive after a hundred years), after Toriyama Sekien's *Biwa-bokuboku* (a lute for
 * a head on a robed body, walking with a staff), *Wanyūdō* (a burning cart wheel with a man's head for its hub, rolling
 * in flames), *Mokumokuren* (eyes in every pane of a torn shoji), *Kosode-no-te* (pale hands reaching from the sleeves of a
 * kimono on its rack) and *Oboro-guruma* (an ox-cart with a vast face for its blind). Wikimedia Commons, public domain.
 *
 * Yōkai (creature species): `biwabokuboku`, `wanyudo` (rolls with its travel, a pure function of the distance),
 * `ittanmomen` (a flying strip of white cotton, rippling, two small eyes), `chagama` (Bunbuku: an iron kettle with a
 * tanuki's head, paws and bushy tail; `transform` takes it back to a plain kettle).
 * Motifs: `ikou` (a kimono rack with a robe on it; `hands` brings the pale hands out of the sleeves). The `room` motif's
 * `eyes` (0–1) opens eyes in its shoji panes, and the `gissha`'s `face` (0–1) gives the oboro-guruma its face.
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, clamp01, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD, rectD } from "./ukiyoe-prims";
import type { UkiyoePaint } from "./ukiyoe-pigments";

export type UkiyoeTsukumo = "biwabokuboku" | "wanyudo" | "ittanmomen" | "chagama";
export const UKIYOE_TSUKUMO: readonly UkiyoeTsukumo[] = ["biwabokuboku", "wanyudo", "ittanmomen", "chagama"];
type W = (type: string) => { w: number; t: number; len: number };
interface Look { size?: number; color?: UkiyoePaint }
const f1 = (n: number) => n.toFixed(1);

/** One eye (almond, iris, pupil) at c, width w, open 0–1, rotated `a` degrees. */
export function eye(c: Pt, w: number, open: number, lw: number, a = 0, iris: UkiyoePaint = "sumi"): Prim[] {
  const h = w * .45 * open, prims: Prim[] = [{ t: "fill", d: smoothD([[c[0] - w, c[1]], [c[0], c[1] - h], [c[0] + w, c[1]], [c[0], c[1] + h]], true, .5), fill: "gofun", outline: lw }];
  if (open > .3) prims.push({ t: "fill", d: circleD(c[0] + w * .1, c[1], Math.min(h, w * .38)), fill: iris }, { t: "fill", d: circleD(c[0] + w * .18, c[1] - h * .3, w * .08), fill: "gofun" });
  return a ? [{ t: "group", transform: `rotate(${f1(a)} ${f1(c[0])} ${f1(c[1])})`, prims }] : prims;
}

/** Flames trailing from a burning thing at c (radius r), streaming back (−x) with its speed. */
function trailingFlames(c: Pt, r: number, frame: number, seed: number, streak: number): Prim[] {
  const outer: string[] = [], inner: string[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + frame / 30, base: Pt = [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r], len = r * (.5 + .4 * Math.abs(Math.sin(frame / 5 + i * 1.7 + seed))) * (1 + streak);
    const tip: Pt = [base[0] - len * (.6 + streak) + Math.cos(a) * len * .3, base[1] - len * .5 + Math.sin(a) * len * .2];
    const n: Pt = [Math.cos(a + Math.PI / 2) * r * .15, Math.sin(a + Math.PI / 2) * r * .15];
    outer.push(smoothD([[base[0] - n[0], base[1] - n[1]], [(base[0] + tip[0]) / 2 - n[0] * .6, (base[1] + tip[1]) / 2 - n[1] * .6], tip, [(base[0] + tip[0]) / 2 + n[0] * .6, (base[1] + tip[1]) / 2 + n[1] * .6], [base[0] + n[0], base[1] + n[1]]], true, .4));
    inner.push(smoothD([[base[0] - n[0] * .4, base[1] - n[1] * .4], [(base[0] * 2 + tip[0]) / 3, (base[1] * 2 + tip[1]) / 3], [base[0] + n[0] * .4, base[1] + n[1] * .4]], true, .4));
  }
  return [{ t: "glow", cx: c[0], cy: c[1], r: r * 2.4, color: "tan", opacity: .45 }, { t: "fill", d: outer.join(""), fill: "shu", outline: 1, outlineColor: "kogecha", union: true, opacity: .95 }, { t: "fill", d: inner.join(""), fill: "ki", union: true }];
}

function wanyudo(look: Look, s: { moving: boolean; dist: number }, frame: number, seed: number): Prim[] {
  const S = look.size ?? 260, R = S / 2, lw = Math.max(1, S * .008), c: Pt = [0, -R], turn = s.dist / R, out: Prim[] = [];
  out.push(...trailingFlames(c, R * .95, frame, seed, s.moving ? .35 : .1));
  // The wheel: a heavy black rim, spokes turning with the distance rolled.
  const spokes: string[] = [];
  for (let i = 0; i < 10; i++) { const a = turn + i * Math.PI / 5; spokes.push(`M${f1(c[0] + Math.cos(a) * R * .38)} ${f1(c[1] + Math.sin(a) * R * .38)}L${f1(c[0] + Math.cos(a) * R * .88)} ${f1(c[1] + Math.sin(a) * R * .88)}`); }
  out.push({ t: "stroke", d: ellipseD(c[0], c[1], R * .94, R * .94), color: "sumi", width: R * .12 }, { t: "stroke", d: spokes.join(""), color: "sumi", width: R * .07 });
  // The hub is a man's head, wild-haired and glaring, not turning with the wheel.
  const hr = R * .4;
  out.push({ t: "fill", d: Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2 + Math.sin(frame / 6 + i) * .1, rr = hr * (1.1 + (i % 2 ? .3 : 0)); return `${i ? "L" : "M"}${f1(c[0] + Math.cos(a) * rr)} ${f1(c[1] + Math.sin(a) * rr)}`; }).join("") + "Z", fill: "sumi", outline: lw });
  out.push({ t: "fill", d: ellipseD(c[0], c[1] + hr * .05, hr * .78, hr * .88), fill: "hada", outline: lw });
  for (const sx of [-1, 1]) out.push(...eye([c[0] + sx * hr * .32, c[1] - hr * .1], hr * .18, 1, lw * .8, sx * -10), { t: "line", d: carvedLine([[c[0] + sx * hr * .55, c[1] - hr * .32], [c[0] + sx * hr * .15, c[1] - hr * .25]], hr * .08, { taper: "end" }), color: "sumi" });
  out.push({ t: "fill", d: smoothD([[c[0] - hr * .35, c[1] + hr * .38], [c[0], c[1] + hr * .3], [c[0] + hr * .35, c[1] + hr * .38], [c[0], c[1] + hr * (.55 + .1 * Math.sin(frame / 4))]], true, .4), fill: "kogecha", outline: lw });
  out.push({ t: "fill", d: smoothD([[c[0] - hr * .5, c[1] + hr * .4], [c[0], c[1] + hr * .95], [c[0] + hr * .5, c[1] + hr * .4], [c[0], c[1] + hr * .6]], true, .4), fill: "sumi", opacity: .9 });
  return out;
}

function biwabokuboku(look: Look, s: { moving: boolean; dist: number }, frame: number, seed: number): Prim[] {
  const S = look.size ?? 260, lw = Math.max(1, S * .007), out: Prim[] = [], ph = s.dist / (S * .3) * Math.PI, step = s.moving ? Math.sin(ph) * S * .03 : 0;
  // The robed body of a blind monk-musician, stooping over a staff; the robe trailing.
  out.push({ t: "line", d: carvedLine([[S * .18, -S * .62], [S * .26 + step * .3, 0]], S * .018, { taper: "none" }), color: "kogecha" });
  out.push({ t: "fill", d: smoothD([[-S * .02, -S * .7], [S * .1, -S * .66], [S * .18, -S * .4], [S * .16 + step, 0], [-S * .2 - step, 0], [-S * .18, -S * .3], [-S * .1, -S * .6]], true, .35), fill: "usuzumi", outline: lw, pattern: { type: "kikko", color: "gofun", scale: .4, opacity: .4 } });
  out.push({ t: "fill", d: smoothD([[S * .02, -S * .62], [S * .2, -S * .58], [S * .24, -S * .5], [S * .16, -S * .44], [S * .02, -S * .5]], true, .35), fill: "usuzumi", outline: lw });
  out.push({ t: "fill", d: ellipseD(S * .2, -S * .58, S * .03, S * .025), fill: "hada", outline: lw * .7 });
  // The head is a biwa: a pear-shaped body with its two crescent sound-holes, the bent neck with pegs, the strings.
  const nod = Math.sin(frame / 20 + seed) * 4;
  const B = (x: number, y: number): Pt => { const a = (-20 + nod) * Math.PI / 180, xx = x * S, yy = y * S; return [S * .02 + xx * Math.cos(a) - yy * Math.sin(a), -S * .74 + xx * Math.sin(a) + yy * Math.cos(a)]; };
  out.push({ t: "fill", d: smoothD([B(-.1, .02), B(-.12, -.12), B(-.04, -.2), B(.04, -.2), B(.12, -.12), B(.1, .02), B(0, .06)], true, .45), fill: { type: "linear", angle: 0, stops: [[0, "kogecha", 1], [.5, "cha", 1], [1, "kogecha", 1]] }, outline: lw, grain: .8 });
  out.push({ t: "fill", d: carvedLine([B(0, -.2), B(0, -.32), B(.05, -.38)], S * .03, { taper: "none" }), fill: "kogecha", outline: lw * .7 });
  out.push({ t: "stroke", d: [-.03, -.01, .01, .03].map(x => `M${f1(B(x, .0)[0])} ${f1(B(x, .0)[1])}L${f1(B(x * .4, -.32)[0])} ${f1(B(x * .4, -.32)[1])}`).join(""), color: "paper", width: lw * .5 });
  out.push({ t: "fill", d: [[-.05, -.1], [.05, -.1]].map(([x, y]) => smoothD([B(x - .015, y), B(x, y - .02), B(x + .015, y)], false, .4) + "Z").join(""), fill: "sumi" });
  out.push({ t: "stroke", d: [-.02, .02].map(y => `M${f1(B(.01, -.34 + y)[0])} ${f1(B(.01, -.34 + y)[1])}l${f1(S * .04)} 0`).join(""), color: "kogecha", width: lw * 1.6 });
  // The fan of a hand raised as if feeling the way.
  out.push({ t: "stroke", d: [0, 1, 2, 3].map(i => `M${f1(S * .22)} ${f1(-S * .58)}l${f1(S * (.06 + i * .01))} ${f1(-S * (.08 - i * .03))}`).join(""), color: "hada", width: lw * 1.6 });
  return out;
}

function ittanmomen(look: Look, s: { moving: boolean; dist: number }, frame: number, seed: number): Prim[] {
  const S = look.size ?? 420, lw = Math.max(1, S * .004), out: Prim[] = [], n = 24, spine: Pt[] = [];
  const wave = (s.moving ? s.dist / (S * .25) : frame / 18) * Math.PI;
  for (let i = 0; i <= n; i++) { const u = i / n; spine.push([(.5 - u) * S, -S * .6 + Math.sin(u * Math.PI * 2 - wave + seed) * S * .08 * (.3 + u)]); }
  const w = S * .08, top: Pt[] = [], bot: Pt[] = [];
  spine.forEach((q, i) => { const tw = Math.sin(i / n * Math.PI * 2 - wave * .7); top.push([q[0], q[1] - w * (.5 + .2 * tw)]); bot.push([q[0], q[1] + w * (.5 - .2 * tw)]); });
  const d = smoothD([...top, ...bot.reverse()], true, .35);
  out.push({ t: "fill", d, fill: { type: "linear", angle: 90, stops: [[0, "gofun", 1], [1, "paper", 1]] }, outline: lw * 1.2 });
  out.push({ t: "stroke", d: [.3, .7].map(k => smoothD(spine.map(q => [q[0], q[1] + (k - .5) * w * .8] as Pt), false, .4)).join(""), color: "usuzumi", width: lw * .5, opacity: .35 });
  for (const dx of [-.025, .025]) out.push(...eye([spine[1][0] + dx * S, spine[1][1] - w * .1], w * .16, ((frame + seed) % 80) < 4 ? .1 : 1, lw * .7));
  return out;
}

function chagama(look: Look, w: W, s: { moving: boolean; dist: number }, frame: number, seed: number): Prim[] {
  const S = look.size ?? 160, lw = Math.max(1, S * .01), out: Prim[] = [], tf = w("transform"), plain = tf.w > 0 && tf.t > tf.len / 2;
  const ph = s.dist / (S * .25) * Math.PI, hop = s.moving ? Math.abs(Math.sin(ph)) * S * .05 : 0, by = -S * .38 - hop;
  if (!plain) {
    // Paws and the bushy striped tail of the tanuki.
    for (const [x, k] of [[-S * .22, 0], [S * .2, Math.PI]] as const) out.push({ t: "fill", d: carvedLine([[x, by + S * .2], [x + (s.moving ? Math.sin(ph + k) * S * .06 : 0), -hop * .2]], S * .09, { taper: "end", minRatio: .7 }), fill: "kogecha", outline: lw });
    const tail: Pt[] = [];
    for (let i = 0; i <= 8; i++) { const u = i / 8; tail.push([-S * .4 - u * S * .3, by + S * .05 - Math.sin(u * 2 + frame / 10) * S * .1 * u - u * S * .1]); }
    out.push({ t: "fill", d: carvedLine(tail, S * .2, { taper: "end", minRatio: .3, smooth: true }), fill: "cha", outline: lw }, { t: "stroke", d: [3, 5, 7].map(i => `M${f1(tail[i][0])} ${f1(tail[i][1] - S * .08)}l0 ${f1(S * .16)}`).join(""), color: "kogecha", width: lw * 2.4 });
  }
  // The kettle: an iron body with its rows of bosses, the rim, the lid and knob, the spout.
  out.push({ t: "fill", d: smoothD([[-S * .42, by + S * .02], [-S * .38, by - S * .2], [0, by - S * .26], [S * .38, by - S * .2], [S * .42, by + S * .02], [S * .3, by + S * .24], [-S * .3, by + S * .24]], true, .4), fill: { type: "linear", angle: 0, stops: [[0, "sumi", 1], [.55, "usuzumi", 1], [1, "sumi", 1]] }, outline: lw * 1.2 });
  out.push({ t: "dots", d: Array.from({ length: 24 }, (_, i) => circleD(-S * .32 + (i % 8) * S * .09, by - S * .12 + Math.floor(i / 8) * S * .08, S * .016)).join(""), color: "gofun", opacity: .35 });
  out.push({ t: "fill", d: ellipseD(0, by - S * .26, S * .3, S * .05), fill: "sumi", outline: lw }, { t: "fill", d: ellipseD(0, by - S * .29, S * .06, S * .035), fill: "kin", outline: lw * .7 });
  if (plain) out.push({ t: "fill", d: smoothD([[S * .38, by - S * .06], [S * .58, by - S * .2], [S * .6, by - S * .16], [S * .4, by + S * .04]], true, .3), fill: "sumi", outline: lw });
  else {
    // The tanuki's head in place of the spout: round ears, the dark eye mask, a merry face.
    const h: Pt = [S * .5, by - S * .16], hs = S * .17;
    out.push({ t: "fill", d: ellipseD(h[0] - hs * .5, h[1] - hs * .75, hs * .28, hs * .25) + ellipseD(h[0] + hs * .3, h[1] - hs * .82, hs * .26, hs * .24), fill: "kogecha", outline: lw });
    out.push({ t: "fill", d: smoothD([[h[0] - hs, h[1]], [h[0] - hs * .8, h[1] - hs * .7], [h[0], h[1] - hs * .9], [h[0] + hs * .8, h[1] - hs * .5], [h[0] + hs * 1.3, h[1] + hs * .1], [h[0] + hs * .6, h[1] + hs * .6], [h[0] - hs * .5, h[1] + hs * .55]], true, .4), fill: "cha", outline: lw });
    out.push({ t: "fill", d: smoothD([[h[0] - hs * .5, h[1] - hs * .25], [h[0] + hs * .2, h[1] - hs * .45], [h[0] + hs * .6, h[1] - hs * .2], [h[0] + hs * .2, h[1] + hs * .1], [h[0] - hs * .4, h[1] + hs * .05]], true, .4), fill: "kogecha" });
    out.push(...eye([h[0] + hs * .1, h[1] - hs * .2], hs * .17, ((frame + seed) % 90) < 4 ? .1 : 1, lw * .7, 0, "kogecha"));
    out.push({ t: "fill", d: circleD(h[0] + hs * 1.25, h[1] + hs * .05, hs * .12), fill: "sumi" }, { t: "stroke", d: `M${f1(h[0] + hs * .7)} ${f1(h[1] + hs * .35)}q${f1(hs * .25)} ${f1(hs * .15)} ${f1(hs * .5)} 0`, color: "sumi", width: lw });
  }
  return out;
}

/** Draw a tsukumogami at a frame. */
export function drawTsukumo(kind: UkiyoeTsukumo, look: Look, w: W, s: { moving: boolean; dist: number }, frame: number, seed: number): Prim[] {
  switch (kind) {
    case "wanyudo": return wanyudo(look, s, frame, seed);
    case "biwabokuboku": return biwabokuboku(look, s, frame, seed);
    case "ittanmomen": return ittanmomen(look, s, frame, seed);
    case "chagama": return chagama(look, w, s, frame, seed);
  }
}

// ---- Motif ------------------------------------------------------------------------------------------------------------------------

type MP = Readonly<Record<string, unknown>>;
const num = (p: MP, k: string, d: number) => typeof p[k] === "number" && Number.isFinite(p[k]) ? p[k] as number : d;

/**
 * A kimono rack (ikō) with a robe hung across it, sleeves spread; `hands` (0–1) brings pale, thin hands out of the
 * sleeves, the fingers reaching and curling (Kosode-no-te). Params: width, height, color, hands.
 */
export function ikou(p: MP, cx: { frame: number; wind: number }): Prim[] {
  const W = num(p, "width", 300), H = num(p, "height", 260), hands = clamp01(num(p, "hands", 0)), lw = Math.max(1, W * .006), out: Prim[] = [];
  const robe = typeof p.color === "string" ? p.color as UkiyoePaint : "beni", bar = -H * .9;
  // The lacquered frame: two uprights on feet, the top bar with upturned ends.
  for (const sx of [-1, 1]) out.push({ t: "fill", d: rectD(sx * W * .45 - W * .015, bar, W * .03, -bar), fill: "sumi", outline: lw }, { t: "fill", d: rectD(sx * W * .45 - W * .08, -H * .03, W * .16, H * .03), fill: "sumi", outline: lw });
  out.push({ t: "fill", d: smoothD([[-W * .58, bar - H * .03], [-W * .5, bar], [W * .5, bar], [W * .58, bar - H * .03], [W * .5, bar + H * .025], [-W * .5, bar + H * .025]], true, .2), fill: "sumi", outline: lw });
  // The robe draped over the bar: body falling to the floor, sleeves hanging at the ends, the collar folded over.
  const sway = Math.sin(cx.frame / 30) * W * .01 + cx.wind * W * .015;
  const body = smoothD([[-W * .52, bar], [W * .52, bar], [W * .5 + sway, bar + H * .3], [W * .28 + sway, bar + H * .35], [W * .3 + sway * 1.3, -H * .02], [-W * .3 + sway * 1.3, -H * .02], [-W * .28 + sway, bar + H * .35], [-W * .5 + sway, bar + H * .3]], true, .25);
  out.push({ t: "fill", d: body, fill: robe, outline: lw, pattern: { type: "sakura", color: "gofun", scale: .5, opacity: .7 }, grain: .3 });
  out.push({ t: "stroke", d: `M${f1(-W * .1)} ${f1(bar)}L${f1(-W * .02 + sway)} ${f1(-H * .02)}M${f1(W * .1)} ${f1(bar)}L${f1(W * .02 + sway)} ${f1(-H * .02)}`, color: "gofun", width: lw * 2, opacity: .7 });
  if (hands > 0) for (const sx of [-1, 1]) {
    // A thin pale forearm sliding out of the sleeve opening, the long fingers spreading and curling.
    const cuff: Pt = [sx * W * .48 + sway, bar + H * .28], reach = hands * W * .22, wr: Pt = [cuff[0] + sx * reach * .3, cuff[1] + reach * .9];
    out.push({ t: "fill", d: carvedLine([cuff, wr], W * .03, { taper: "end", minRatio: .7 }), fill: "gofun", outline: lw, opacity: hands });
    for (let k = 0; k < 4; k++) { const a = (70 + sx * (k - 1.5) * 18 + Math.sin(cx.frame / 9 + k) * 8) * Math.PI / 180, l = W * .06; out.push({ t: "line", d: carvedLine([wr, [wr[0] + Math.cos(a) * l * .6, wr[1] + Math.sin(a) * l * .6], [wr[0] + Math.cos(a + sx * .5) * l, wr[1] + Math.sin(a + sx * .5) * l]], W * .009, { taper: "end", minRatio: .5 }), color: "gofun", opacity: hands }); }
  }
  return out;
}
export const TSUKUMO_MOTIFS = { ikou };
export const ANIMATED_TSUKUMO = ["ikou"] as const;

// ---- Scenes ------------------------------------------------------------------------------------------------------------------------

export type UkiyoeTsukumoScene = "wheel" | "biwa" | "shoji" | "kosode" | "cotton" | "kettle" | "cart";
export const UKIYOE_TSUKUMO_SCENES: readonly UkiyoeTsukumoScene[] = ["wheel", "biwa", "shoji", "kosode", "cotton", "kettle", "cart"];

/**
 * `wheel`: the wanyūdō rolls burning down a night street past a gate. `biwa`: the biwa-bokuboku walks a moor with its
 * staff. `shoji`: eyes open one by one in the torn shoji of a deserted room. `kosode`: hands reach from a kimono on its
 * rack. `cotton`: the ittan-momen flies over the fields at dusk. `kettle`: the teakettle grows a tanuki's head and tail,
 * walks, and turns back into a kettle. `cart`: the oboro-guruma's face glares on a misty night road.
 */
export function tsukumoScene(kind: UkiyoeTsukumoScene = "wheel", frames = 300): import("./ukiyoe-scene").UkiyoeSceneSpec {
  type N = import("./ukiyoe-scene").UkiyoeNode;
  const night = kind !== "biwa" && kind !== "cotton" && kind !== "kettle";
  const nodes: N[] = [{ id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, band: .5, ...(night ? { top: "yoru", mid: "ai", horizon: "ai" } : { horizon: kind === "cotton" ? "beni" : "beni" }) } }];
  const ground = (fill: unknown) => nodes.push({ id: "ground", kind: "block", x: 960, y: 1000, shape: { type: "rect", width: 1920, height: 300 }, fill, line: 0 } as unknown as N);
  const c = (id: string, species: string, x: number, y: number, look: Record<string, unknown>, actions: unknown[], facing: "left" | "right" = "right") => nodes.push({ id, kind: "creature", species, x, y, facing, look, actions } as unknown as N);
  const dark = { type: "linear", angle: 90, stops: [[0, "ai", 1], [1, "yoru", 1]] };
  if (kind === "wheel") {
    ground(dark);
    nodes.push({ id: "gate", kind: "motif", motif: "yashiki", x: 960, y: 860, params: { width: 1800, height: 220, pines: 3, night: 1 } } as N);
    c("wheel", "wanyudo", 1700, 960, { size: 300 }, [{ type: "walk", start: 0, end: frames, to: -1500 }], "left");
  } else if (kind === "biwa") {
    nodes.push({ id: "hills", kind: "motif", motif: "hills", x: 960, y: 800, params: { width: 2200, height: 260 } } as N);
    ground({ type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, "kusa", 1]] });
    nodes.push({ id: "reeds", kind: "motif", motif: "reeds", x: 1500, y: 960, params: { width: 600, height: 240 } } as N);
    c("biwa", "biwabokuboku", 500, 980, { size: 520 }, [{ type: "walk", start: 0, end: frames, to: 500 }]);
  } else if (kind === "shoji") {
    const R = { width: 1500, height: 600, depth: 210, back: ["shoji", "shoji", "shoji", "shoji"], night: .8, torn: .6, kind: "boards", eave: "none" };
    nodes.push({ id: "room", kind: "motif", motif: "room", x: 960, y: 900, params: { ...R, eyes: .7 }, keys: [] } as unknown as N);
    nodes.push({ id: "lamp", kind: "motif", motif: "andon", x: 700, y: 860, params: { height: 150, lit: .5 } } as N);
  } else if (kind === "kosode") {
    const R = { width: 1500, height: 600, depth: 210, back: ["fusuma", "fusuma", "wall"], night: .7, kind: "tatami", eave: "none", art: "clouds" };
    nodes.push({ id: "room", kind: "motif", motif: "room", x: 960, y: 900, params: R } as N);
    nodes.push({ id: "rack", kind: "motif", motif: "ikou", x: 960, y: 840, params: { width: 460, height: 400 }, keys: [{ frame: 0, progress: 0 }] } as unknown as N);
    nodes.push({ id: "rack-hands", kind: "motif", motif: "ikou", x: 960, y: 840, params: { width: 460, height: 400, hands: 1 }, enter: { preset: "fade", frame: 100, duration: 80 } } as unknown as N);
    nodes.push({ id: "lamp", kind: "motif", motif: "andon", x: 1300, y: 860, params: { height: 150 } } as N);
  } else if (kind === "cotton") {
    ground({ type: "linear", angle: 90, stops: [[0, "kusa", 1], [1, "matsu", 1]] });
    nodes.push({ id: "field", kind: "motif", motif: "ricefield", x: 0, y: 960, params: { width: 1920, height: 160 } } as N);
    nodes.push({ id: "farmer", kind: "figure", x: 760, y: 1000, scale: 1.5, look: { hair: "chonmage", hat: "kasa", robe: "cha", lower: "tucked", legs: "hada", feet: "waraji" }, facing: "right", actions: [{ type: "startle", start: 120, end: 180 }] } as unknown as N);
    c("cotton", "ittanmomen", 1800, 760, { size: 720 }, [{ type: "fly", start: 0, end: frames, to: -1700, toY: -100 }], "left");
  } else if (kind === "kettle") {
    ground({ type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, "cha", 1]] });
    nodes.push({ id: "hall", kind: "motif", motif: "hondo", x: 1450, y: 860, params: { width: 600, height: 360 } } as N);
    c("kettle", "chagama", 500, 960, { size: 260 }, [{ type: "walk", start: 20, end: 200, to: 420 }, { type: "transform", start: 230, end: 270 }]);
  } else {
    ground(dark);
    nodes.push({ id: "willow", kind: "motif", motif: "willow", x: 300, y: 940, params: { height: 600 } } as N);
    nodes.push({ id: "cart", kind: "motif", motif: "gissha", x: 1100, y: 960, params: { width: 520, face: 1, travel: 300 }, keys: [{ frame: 0, x: 1300, progress: 0 }, { frame: frames, x: 900, progress: 1 }] } as unknown as N);
    nodes.push({ id: "mist", kind: "block", x: 960, y: 940, shape: { type: "rect", width: 1920, height: 160 }, fill: "gofun", opacity: .35, line: 0 } as unknown as N);
  }
  return { version: 1, id: `tsukumo-${kind}`, width: 1920, height: 1080, durationFrames: frames, seed: 71, cadence: 2, palette: { preset: night ? "night" : "edo" }, wind: { base: .4, turbulence: .4 }, nodes };
}
