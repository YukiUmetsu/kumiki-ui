/**
 * UKIYO1 trees and forest spirits, after Sakai Hōitsu's *Persimmon Tree* (Met 45392: a gnarled, sparse tree, a few
 * leaves and round vermilion fruit), the *Taketori Monogatari* scroll (Wikimedia Commons, public domain), and Sekien's
 * *Kodama* (the spirits of a hundred-year-old tree: an old couple emerging from the pine).
 *
 * Motifs:
 * - `bamboo`: a grove of jointed stalks with leaf sprays, swaying in the wind; `shine` lights one stalk from within
 *   (where the bamboo cutter finds Kaguya), its glow pulsing.
 * - `kaki`: a persimmon tree, gnarled and sparse, with leaves and round fruit (`fruit` 0–1; `ripe` for the colour).
 * - `shinboku`: a great sacred tree: a massive buttressed trunk with bark ridges and a hollow, the shimenawa rope round
 *   it with paper streamers, a dense crown. `face` (0–1) opens an old face in the bark (the tree spirit, the vampire
 *   tree), its eyes and mouth moving; `reach` (0–1) bends the lower branches down like grasping arms (jubokko).
 * - `jinmenju`: the human-faced tree, its fruit small laughing heads that sway on their stems.
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, clamp, clamp01, hash01, lerp, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD } from "./ukiyoe-prims";
import type { UkiyoePaint } from "./ukiyoe-pigments";
import type { UkiyoeNode, UkiyoeSceneSpec } from "./ukiyoe-scene";

type P = Readonly<Record<string, unknown>>;
interface C { seed: number; frame: number; wind: number }
const num = (p: P, k: string, d: number) => typeof p[k] === "number" && Number.isFinite(p[k]) ? p[k] as number : d;
const f1 = (n: number) => n.toFixed(1);

/** A branching limb: from `a` toward angle `ang` (deg, 0 = right, −90 = up), forking `depth` times; returns ribbons and tip points. */
function branch(a: Pt, ang: number, len: number, w: number, depth: number, seed: number, sway: number, tips: Pt[], out: string[], bend = 0): void {
  const r = (ang + sway * (3 - depth) + bend) * Math.PI / 180, kink = (hash01(seed, depth, 1) - .5) * 30;
  const mid: Pt = [a[0] + Math.cos(r + kink * Math.PI / 360) * len * .5, a[1] + Math.sin(r + kink * Math.PI / 360) * len * .5], b: Pt = [a[0] + Math.cos(r) * len, a[1] + Math.sin(r) * len];
  out.push(carvedLine([a, mid, b], w, { taper: "end", minRatio: .55, smooth: true }));
  if (depth <= 0) { tips.push(b); return; }
  const n = 2 + (hash01(seed, depth, 2) > .6 ? 1 : 0);
  for (let i = 0; i < n; i++) branch(b, ang + (i - (n - 1) / 2) * (32 + 14 * hash01(seed, i, 3)) + (hash01(seed, i, 4) - .5) * 14, len * (.6 + .15 * hash01(seed, i, 5)), w * .62, depth - 1, seed * 7 + i + 1, sway, tips, out, bend * 1.2);
}

/** A bamboo grove. Params: width, height, stalks, shine (index of the glowing stalk, −1 for none), color. */
export function bamboo(p: P, cx: C): Prim[] {
  const W = num(p, "width", 600), H = num(p, "height", 700), n = clamp(Math.round(num(p, "stalks", 9)), 1, 40), shine = Math.round(num(p, "shine", -1));
  const color = typeof p.color === "string" ? p.color as UkiyoePaint : "kusa", lw = Math.max(1, H * .002), out: Prim[] = [], leaves: string[] = [], nodes: string[] = [];
  const stalks: { d: string; x: number; w: number; top: Pt; i: number }[] = [];
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + W * (i + .5) / n + (hash01(cx.seed, i, 1) - .5) * W / n * .6, w = H * (.016 + .01 * hash01(cx.seed, i, 2)), h = H * (.75 + .25 * hash01(cx.seed, i, 3));
    const sway = (cx.wind * .04 + Math.sin(cx.frame / 31 + i * 1.3) * .015) * h, pts: Pt[] = [];
    for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push([x + sway * u * u, -h * u]); }
    stalks.push({ d: carvedLine(pts, w, { taper: "end", minRatio: .6 }), x, w, top: pts[8], i });
    for (let k = 1; k < 8; k++) { const q = pts[k]; nodes.push(`M${f1(q[0] - w * .6)} ${f1(q[1])}h${f1(w * 1.2)}`); }
    // Leaf sprays near the top: narrow leaves fanning down from twigs, fluttering.
    for (let s = 0; s < 4; s++) {
      const q = pts[5 + (s % 3)], dir = s % 2 ? 1 : -1, len = H * (.06 + .03 * hash01(cx.seed, i * 9 + s, 4));
      for (let l = 0; l < 4; l++) {
        const a = (20 + l * 22 + 6 * Math.sin(cx.frame / 9 + i + l)) * Math.PI / 180, tip: Pt = [q[0] + dir * Math.sin(a) * len + cx.wind * len * .2, q[1] + Math.cos(a) * len * .7];
        leaves.push(carvedLine([q, [(q[0] + tip[0]) / 2, (q[1] + tip[1]) / 2 - len * .06], tip], len * .14, { taper: "both" }));
      }
    }
  }
  for (const st of stalks) {
    out.push({ t: "fill", d: st.d, fill: { type: "linear", angle: 0, stops: [[0, "matsu", 1], [.5, color, 1], [1, "matsu", 1]] }, outline: lw });
    if (st.i === shine) {
      // The shining stalk: lit from within, a pulsing glow round its lower joint, gold light in the hollow.
      const g = .8 + .2 * Math.sin(cx.frame / 10), q: Pt = [st.x, -H * .14];
      out.push({ t: "glow", cx: q[0], cy: q[1], r: H * .25 * g, color: "ki", opacity: .7 }, { t: "fill", d: st.d, fill: "ki", opacity: .55 * g }, { t: "fill", d: ellipseD(q[0], q[1], st.w * .9, H * .03), fill: "gofun", opacity: .9 });
    }
  }
  out.push({ t: "stroke", d: nodes.join(""), color: "matsu", width: lw * 1.6 }, { t: "fill", d: leaves.join(""), fill: "matsu", opacity: .9 });
  return out;
}

/** A persimmon tree. Params: height, fruit (0–1 how many), ripe (0 green → 1 vermilion), lean. */
export function kaki(p: P, cx: C): Prim[] {
  const H = num(p, "height", 420), fruit = clamp01(num(p, "fruit", 1)), ripe = clamp01(num(p, "ripe", 1)), lean = num(p, "lean", 10), lw = Math.max(1, H * .004), out: Prim[] = [];
  const sway = cx.wind * 3 + Math.sin(cx.frame / 40 + cx.seed) * 1.2, limbs: string[] = [], tips: Pt[] = [];
  // A gnarled trunk bending as it rises, then two main limbs forking into sparse branches (Hōitsu's tree).
  const t0: Pt = [0, 0], t1: Pt = [H * .08 + lean, -H * .3], t2: Pt = [-H * .04 + lean * 1.3, -H * .52];
  limbs.push(carvedLine([t0, [H * .04, -H * .15], t1, [H * .02 + lean, -H * .42], t2], H * .085, { taper: "end", minRatio: .5, smooth: true }));
  branch(t2, -70, H * .26, H * .03, 3, cx.seed + 1, sway, tips, limbs);
  branch(t1, -20, H * .22, H * .028, 3, cx.seed + 2, sway, tips, limbs);
  branch(t2, -130, H * .2, H * .024, 2, cx.seed + 3, sway, tips, limbs);
  out.push({ t: "fill", d: limbs.join(""), fill: { type: "linear", angle: 0, stops: [[0, "kogecha", 1], [.6, "cha", 1], [1, "kogecha", 1]] }, outline: lw, grain: .7 });
  // Leaves in small clusters at the tips, and the fruit hanging under some of them.
  const leafD: string[] = [], fruitD: string[] = [], calyx: string[] = [];
  tips.forEach((q, i) => {
    for (let l = 0; l < 3; l++) {
      const a = (l * 110 + i * 40) * Math.PI / 180, s = H * .035;
      leafD.push(smoothD([q, [q[0] + Math.cos(a - .4) * s, q[1] + Math.sin(a - .4) * s], [q[0] + Math.cos(a) * s * 1.8, q[1] + Math.sin(a) * s * 1.8], [q[0] + Math.cos(a + .4) * s, q[1] + Math.sin(a + .4) * s]], true, .45));
    }
    if (hash01(cx.seed, i, 9) < fruit * .22) {
      const r = H * .028, c: Pt = [q[0] + Math.sin(cx.frame / 25 + i) * r * .1, q[1] + r * 1.4];
      fruitD.push(ellipseD(c[0], c[1], r, r * .92));
      calyx.push(smoothD([[c[0] - r * .5, c[1] - r * .85], [c[0], c[1] - r * 1.15], [c[0] + r * .5, c[1] - r * .85], [c[0], c[1] - r * .7]], true, .3));
    }
  });
  out.push({ t: "fill", d: leafD.join(""), fill: { type: "linear", angle: 90, stops: [[0, "matsu", 1], [1, "kusa", 1]] }, outline: lw * .6, opacity: .95 });
  out.push({ t: "fill", d: fruitD.join("") || "M0 0", fill: { type: "radial", stops: [[0, ripe > .5 ? "tan" : "ki", 1], [1, ripe > .5 ? "shu" : "kusa", 1]] }, outline: lw }, { t: "fill", d: calyx.join("") || "M0 0", fill: "matsu" });
  return out;
}

/** An old face opening in bark (centre c, size s): heavy brows, eyes that open, a mouth that moves. */
function barkFace(c: Pt, s: number, k: number, frame: number, lw: number, glare = false): Prim[] {
  if (k <= .02) return [];
  const open = k * (.6 + .4 * Math.abs(Math.sin(frame / 7))), out: Prim[] = [];
  for (const sx of [-1, 1]) {
    out.push({ t: "line", d: carvedLine([[c[0] + sx * s * .55, c[1] - s * .38], [c[0] + sx * s * .3, c[1] - s * .48], [c[0] + sx * s * .08, c[1] - s * .3]], s * .1, { taper: "both" }), color: "sumi", opacity: k });
    out.push({ t: "fill", d: ellipseD(c[0] + sx * s * .3, c[1] - s * .2, s * .14, s * .1 * k), fill: glare ? "ki" : "sumi", opacity: k });
    if (glare) out.push({ t: "fill", d: circleD(c[0] + sx * s * .3, c[1] - s * .2, s * .05), fill: "sumi", opacity: k });
  }
  out.push({ t: "fill", d: smoothD([[c[0] - s * .3, c[1] + s * .25], [c[0], c[1] + s * (.2 - .05 * open)], [c[0] + s * .3, c[1] + s * .25], [c[0], c[1] + s * (.3 + .3 * open)]], true, .4), fill: "kogecha", opacity: k, outline: lw * k });
  out.push({ t: "stroke", d: [-.4, 0, .4].map(x => `M${f1(c[0] + x * s - s * .2)} ${f1(c[1] + s * .7)}q${f1(s * .2)} ${f1(-s * .1)} ${f1(s * .4)} 0`).join(""), color: "sumi", width: lw, opacity: .5 * k });
  return out;
}

/** A great sacred tree. Params: height, face (0–1), reach (0–1), rope (true), color (crown). */
export function shinboku(p: P, cx: C): Prim[] {
  const H = num(p, "height", 640), face = clamp01(num(p, "face", 0)), reach = clamp01(num(p, "reach", 0)), lw = Math.max(1, H * .003), out: Prim[] = [];
  const crownC = typeof p.color === "string" ? p.color as UkiyoePaint : "matsu", tw = H * .26, sway = cx.wind * 2 + Math.sin(cx.frame / 50 + cx.seed);
  // Crown: big clumps of foliage, darker behind, lighter in front.
  const clumps = (tone: UkiyoePaint, n: number, k: number, off: number) => {
    const d: string[] = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 1.1 + Math.PI * .95, r = H * (.28 + .1 * hash01(cx.seed, i + off, 1)) * k, c: Pt = [Math.cos(a) * H * .32 + sway * 2, -H * .72 + Math.sin(a) * H * .22]; d.push(ellipseD(c[0], c[1], r * .55, r * .38)); }
    d.push(ellipseD(sway * 2, -H * .8, H * .32 * k, H * .2 * k));
    return { t: "fill" as const, d: d.join(""), fill: tone, outline: lw, union: true, grain: .5 };
  };
  out.push(clumps("sumi", 7, 1, 0), clumps(crownC, 6, .85, 11));
  // Branches: thick limbs from the trunk; with `reach` the lower ones bend down and forward like arms, fingers spread.
  const limbs: string[] = [], tips: Pt[] = [];
  for (const sx of [-1, 1]) {
    branch([sx * tw * .3, -H * .48], sx > 0 ? -35 : -145, H * .2, H * .05, 2, cx.seed + (sx > 0 ? 5 : 6), sway, [], limbs);
    branch([sx * tw * .45, -H * .3], sx > 0 ? lerp(-20, 35, reach) : lerp(-160, -215, reach), H * .22, H * .05, 2, cx.seed + (sx > 0 ? 7 : 8), sway + Math.sin(cx.frame / 9) * 4 * reach, tips, limbs, sx * 12 * reach);
  }
  // Trunk: a massive buttressed column, bark ridges spiralling up, a dark hollow.
  // Roots flaring into the ground, the trunk twisting a little as it rises and narrowing into the crown.
  const trunk = smoothD([[-tw * 1.25, H * .01], [-tw * .7, -H * .04], [-tw * .48, -H * .16], [-tw * .55, -H * .34], [-tw * .34, -H * .62], [tw * .3, -H * .64], [tw * .44, -H * .4], [tw * .5, -H * .16], [tw * .72, -H * .04], [tw * 1.3, H * .01], [tw * .5, H * .015], [0, -H * .01], [-tw * .5, H * .015]], true, .35);
  out.push({ t: "fill", d: limbs.join(""), fill: "kogecha", outline: lw, grain: .7 });
  out.push({ t: "fill", d: trunk, fill: { type: "linear", angle: 0, stops: [[0, "sumi", 1], [.35, "kogecha", 1], [.6, "cha", 1], [1, "sumi", 1]] }, outline: lw * 1.4, grain: 1 });
  const ridges: string[] = [];
  for (let i = 0; i < 10; i++) { const x = -tw * .45 + tw * .9 * i / 9, cur = (hash01(cx.seed, i, 2) - .5) * tw * .2; ridges.push(smoothD([[x * 1.6, 0], [x * 1.1 + cur, -H * .2], [x + cur * .5, -H * .45], [x * .9, -H * .6]], false, .5)); }
  out.push({ t: "stroke", d: ridges.join(""), color: "sumi", width: lw * 1.2, opacity: .5 });
  if (face < .5) out.push({ t: "fill", d: ellipseD(tw * .15, -H * .22, tw * .12, H * .05), fill: "sumi", opacity: .85 });
  out.push(...barkFace([0, -H * .27], tw * .45, face, cx.frame, lw, reach > .3));
  if (reach > 0) out.push({ t: "fill", d: tips.map(q => circleD(q[0], q[1], H * .008)).join(""), fill: "beni", opacity: .8 * reach });
  if (p.rope !== false) {
    // The shimenawa round the trunk with its paper streamers.
    const ry = -H * .38, rope = smoothD([[-tw * .5, ry], [0, ry + H * .03], [tw * .5, ry]], false, .5);
    out.push({ t: "stroke", d: rope, color: "kincha", width: H * .02 }, { t: "stroke", d: rope, color: "cha", width: H * .006, dash: `${f1(H * .012)} ${f1(H * .012)}` });
    for (const x of [-.3, 0, .3]) { const sx = x * tw + Math.sin(cx.frame / 9 + x * 10) * H * .003, sy = ry + H * .03 - Math.abs(x) * H * .04, z = H * .018; out.push({ t: "fill", d: `M${f1(sx)} ${f1(sy)}h${f1(z)}l${f1(-z / 2)} ${f1(z)}h${f1(z)}l${f1(-z / 2)} ${f1(z)}h${f1(z)}l${f1(-z * 1.5)} ${f1(z)}l${f1(-z / 2)} ${f1(-z)}h${f1(z / 2)}l${f1(-z / 2)} ${f1(-z)}h${f1(z / 2)}Z`, fill: "gofun", outline: lw * .5 }); }
  }
  return out;
}

/** The human-faced tree: a spreading tree whose fruit are small laughing heads swaying on their stems. Params: height, heads. */
export function jinmenju(p: P, cx: C): Prim[] {
  const H = num(p, "height", 480), n = clamp(Math.round(num(p, "heads", 9)), 1, 30), lw = Math.max(1, H * .003), out: Prim[] = [], limbs: string[] = [], tips: Pt[] = [];
  const sway = cx.wind * 3 + Math.sin(cx.frame / 40 + cx.seed);
  limbs.push(carvedLine([[0, 0], [H * .03, -H * .25], [0, -H * .45]], H * .07, { taper: "end", minRatio: .5, smooth: true }));
  branch([0, -H * .45], -60, H * .22, H * .035, 3, cx.seed + 1, sway, tips, limbs);
  branch([0, -H * .42], -120, H * .22, H * .035, 3, cx.seed + 2, sway, tips, limbs);
  out.push({ t: "fill", d: limbs.join(""), fill: "kogecha", outline: lw, grain: .7 });
  const leaves: string[] = [];
  tips.forEach((q, i) => { for (let l = 0; l < 2; l++) { const a = (l * 180 + i * 50) * Math.PI / 180, s = H * .04; leaves.push(ellipseD(q[0] + Math.cos(a) * s, q[1] + Math.sin(a) * s * .6, s, s * .5)); } });
  out.push({ t: "fill", d: leaves.join(""), fill: "matsu", outline: lw * .6, union: true });
  // Heads: round faces hanging from the tips, each laughing on its own rhythm, swinging on its stem.
  // Spread the heads across the whole crown (every k-th tip), not bunched on one branch.
  const step = Math.max(1, Math.floor(tips.length / n));
  tips.filter((_, i) => i % step === 0).slice(0, n).forEach((q, i) => {
    const sw = Math.sin(cx.frame / 13 + i * 1.7) * 6, r = H * .03, laugh = Math.max(0, Math.sin(cx.frame / 5 + i * 2.1));
    const c: Pt = [q[0] + Math.sin(sw * Math.PI / 180) * r * 2.5, q[1] + r * 2.4];
    out.push({ t: "stroke", d: `M${f1(q[0])} ${f1(q[1])}L${f1(c[0])} ${f1(c[1] - r)}`, color: "matsu", width: lw * 1.2 });
    out.push({ t: "fill", d: ellipseD(c[0], c[1], r, r * 1.1), fill: "hada", outline: lw });
    out.push({ t: "fill", d: ellipseD(c[0], c[1] - r * .9, r * .9, r * .4), fill: "sumi" });
    out.push({ t: "stroke", d: `M${f1(c[0] - r * .55)} ${f1(c[1] - r * .1)}q${f1(r * .2)} ${f1(-r * .25)} ${f1(r * .4)} 0M${f1(c[0] + r * .15)} ${f1(c[1] - r * .1)}q${f1(r * .2)} ${f1(-r * .25)} ${f1(r * .4)} 0`, color: "sumi", width: lw });
    out.push({ t: "fill", d: smoothD([[c[0] - r * .45, c[1] + r * .3], [c[0] + r * .45, c[1] + r * .3], [c[0], c[1] + r * (.45 + .4 * laugh)]], true, .4), fill: "beni", outline: lw * .7 });
  });
  return out;
}

export const TREE_MOTIFS = { bamboo, kaki, shinboku, jinmenju };
export const ANIMATED_TREES = ["bamboo", "kaki", "shinboku", "jinmenju"] as const;

// ---- Scene recipes -----------------------------------------------------------------------------------------------------------------

export type UkiyoeTreeScene = "kaguya" | "persimmon" | "kodama" | "jubokko" | "jinmenju";
export const UKIYOE_TREE_SCENES: readonly UkiyoeTreeScene[] = ["kaguya", "persimmon", "kodama", "jubokko", "jinmenju"];

/**
 * `kaguya`: the bamboo cutter walks into the grove at dusk and finds the shining stalk. `persimmon`: the monkey up the
 * persimmon tree, the crab below. `kodama`: the old spirit couple appear from the sacred tree whose face opens.
 * `jubokko`: the vampire tree on the old battlefield, its arms reaching, its face glaring, a broken spear by its roots.
 * `jinmenju`: the laughing human-faced tree in a mountain valley.
 */
export function treeScene(kind: UkiyoeTreeScene = "kaguya", frames = 300): UkiyoeSceneSpec {
  const night = kind === "kodama" || kind === "jubokko";
  const nodes: UkiyoeNode[] = [{ id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, band: .5, ...(night ? { top: "yoru", mid: "ai", horizon: kind === "jubokko" ? "beni" : "ai" } : kind === "kaguya" ? { top: "ai", mid: "murasaki", horizon: "beni" } : { horizon: "beni" }) } }];
  const ground = (fill: unknown) => nodes.push({ id: "ground", kind: "block", x: 960, y: 1000, shape: { type: "rect", width: 1920, height: 300 }, fill, line: 0 } as unknown as UkiyoeNode);
  const m = (id: string, motif: string, x: number, y: number, params: Record<string, unknown>, extra: Record<string, unknown> = {}) => nodes.push({ id, kind: "motif", motif, x, y, params, ...extra } as unknown as UkiyoeNode);
  const grass = { type: "linear", angle: 90, stops: [[0, "kusa", 1], [1, "matsu", 1]] }, dark = { type: "linear", angle: 90, stops: [[0, "ai", 1], [1, "yoru", 1]] };
  if (kind === "kaguya") {
    m("grove-far", "bamboo", 960, 870, { width: 2000, height: 760, stalks: 26, color: "matsu" }, { opacity: .7 });
    ground(grass);
    m("grove", "bamboo", 960, 900, { width: 1800, height: 820, stalks: 14, shine: 9 });
    nodes.push({ id: "cutter", kind: "figure", x: 200, y: 930, scale: 1.8, look: { hair: "elder", hat: "kasa", robe: "cha", lower: "tucked", legs: "hada", feet: "waraji", beard: true, prop: "staff" }, facing: "right", actions: [{ type: "walk", start: 0, end: 160, to: 520 }, { type: "startle", start: 170, end: 210 }, { type: "kneel", start: 220, end: frames }] } as unknown as UkiyoeNode);
  } else if (kind === "persimmon") {
    ground(grass);
    m("tree", "kaki", 1000, 920, { height: 700 });
    nodes.push({ id: "monkey", kind: "creature", species: "monkey", x: 1060, y: 520, scale: 1.2, facing: "left", actions: [{ type: "sit", start: 0, end: frames }] } as unknown as UkiyoeNode);
    nodes.push({ id: "crab", kind: "creature", species: "crab", x: 760, y: 960, scale: 2.2, facing: "right", actions: [{ type: "dance", start: 0, end: frames }] } as unknown as UkiyoeNode);
  } else if (kind === "kodama") {
    ground(dark);
    m("tree", "shinboku", 960, 940, { height: 900 }, { keys: [] });
    for (const [i, x] of [[0, 640], [1, 1280]] as const) nodes.push({ id: "spirit" + i, kind: "figure", x, y: 950, scale: 1.6, opacity: .8, enter: { preset: "mist", frame: 90 + i * 30, duration: 60 }, look: i ? { hair: "elder", hairColor: "gofun", robe: "gofun", feet: "bare", beard: true, prop: "staff" } : { hair: "long", hairColor: "gofun", robe: "gofun", feet: "bare" }, facing: i ? "left" : "right", actions: [{ type: "bow", start: 200, end: 260 }] } as unknown as UkiyoeNode);
  } else if (kind === "jubokko") {
    ground({ type: "linear", angle: 90, stops: [[0, "kogecha", 1], [1, "sumi", 1]] });
    m("tree", "shinboku", 960, 940, { height: 820, face: 1, reach: 1, rope: false, color: "kogecha" });
    nodes.push({ id: "spear", kind: "line", points: [[1300, 980], [1480, 720]], width: 8, color: "sumi" } as unknown as UkiyoeNode);
    nodes.push({ id: "crows", kind: "particles", type: "birds", count: 6, area: [200, 150, 1500, 300] } as unknown as UkiyoeNode);
  } else {
    m("hills", "hills", 960, 820, { width: 2200, height: 260 });
    ground(grass);
    m("tree", "jinmenju", 960, 940, { height: 760, heads: 12 });
  }
  return { version: 1, id: `trees-${kind}`, width: 1920, height: 1080, durationFrames: frames, seed: 53, cadence: 2, palette: { preset: night ? "night" : kind === "persimmon" ? "autumn" : "edo" }, wind: { base: .4, turbulence: .4 }, nodes };
}
