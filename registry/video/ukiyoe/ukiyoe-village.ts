/**
 * UKIYO1 village goods for the New Year folktales (Kasa Jizō and its kin), after Hiroshige's *Evening Snow at Kanbara*
 * (Met 56915, CC0: travellers under wide, shallow straw kasa whose ribs run from the crown to the brim, thick snow caps
 * on the thatch) and the netsuke *Daikoku and Bag on Rice Bale* (Met 59066, CC0: a barrel-shaped tawara whose round
 * end cap is gathered into a centre knot, straw running lengthwise under rope bands).
 *
 * - `kasaHat()`: one straw kasa seen a little from above, for any motif to put on a head or a pile.
 * - Motif `kasa`: a stack of straw hats for sale (`count`).
 * - Motif `tawara`: rice bales, one or stacked in a pyramid (`count`).
 * - Motif `sori`: a wooden sled on curled runners, loaded with bales and New Year gifts, its pull rope running forward.
 * - `UKIYOE_JIZO_LOOK`: a figure look for a jizō that walks (stone-grey, shaven, red bib, straw hat).
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, clamp01, hash01, lerp, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD } from "./ukiyoe-prims";
import type { UkiyoeFill, UkiyoePaint } from "./ukiyoe-pigments";
import type { UkiyoeFigureLook } from "./ukiyoe-figure";

type MP = Readonly<Record<string, unknown>>;
const num = (p: MP, k: string, d: number) => typeof p[k] === "number" && Number.isFinite(p[k]) ? p[k] as number : d;
const f1 = (n: number) => n.toFixed(1);
const STRAW: UkiyoeFill = { type: "linear", angle: 0, stops: [[0, "kincha", 1], [.55, "ki", 1], [1, "kincha", 1]] };
const WOOD: UkiyoeFill = { type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, "cha", 1]] };

/**
 * One straw kasa centred on its brim at (cx, cy), radius `r`: a shallow cone seen a little from above, the brim an ellipse,
 * ribs from the crown knob to the front of the brim, the darker underside showing at the back. `tilt` in degrees.
 */
export function kasaHat(cx: number, cy: number, r: number, lw: number, tilt = 0, color: UkiyoePaint = "kincha"): Prim[] {
  const ry = r * .2, apex: Pt = [0, -r * .4], out: Prim[] = [];
  const front: Pt[] = [];
  for (let i = 0; i <= 12; i++) { const a = Math.PI * i / 12; front.push([-Math.cos(a) * r, Math.sin(a) * ry]); }
  out.push({ t: "fill", d: ellipseD(0, 0, r, ry), fill: "cha", outline: lw });
  const cone = `M${f1(-r)} 0L${f1(apex[0])} ${f1(apex[1])}L${f1(r)} 0` + front.slice().reverse().map(p => `L${f1(p[0])} ${f1(p[1])}`).join("") + "Z";
  out.push({ t: "fill", d: cone, fill: color === "kincha" ? STRAW : color, outline: lw, grain: .7 });
  const ribs = front.slice(1, -1).map(p => `M${f1(apex[0])} ${f1(apex[1])}L${f1(p[0])} ${f1(p[1])}`).join("");
  out.push({ t: "stroke", d: ribs, color: "cha", width: lw * .6, opacity: .65 });
  // Woven rings round the cone, and the knob at the crown.
  out.push({ t: "stroke", d: [.45, .75].map(k => `M${f1(-r * k)} ${f1(apex[1] * (1 - k))}Q0 ${f1(apex[1] * (1 - k) + ry * k * 1.6)} ${f1(r * k)} ${f1(apex[1] * (1 - k))}`).join(""), color: "kogecha", width: lw * .5, opacity: .5 });
  out.push({ t: "fill", d: circleD(apex[0], apex[1] + r * .02, r * .06), fill: "kogecha", outline: lw * .7 });
  return [{ t: "group", transform: `translate(${f1(cx)} ${f1(cy)})${tilt ? ` rotate(${f1(tilt)})` : ""}`, prims: out }];
}

/** A pile of straw hats for sale. Params: count (1–8), size (brim radius), tilt. Origin: the bottom hat's brim. */
export function kasa(p: MP, cx: { seed: number }): Prim[] {
  const n = Math.max(1, Math.min(8, Math.round(num(p, "count", 5)))), r = num(p, "size", 60), lw = Math.max(1, r * .03), out: Prim[] = [];
  out.push({ t: "fill", d: ellipseD(0, r * .08, r * 1.05, r * .12), fill: "sumi", opacity: .15, noPrint: true });
  for (let i = 0; i < n; i++) out.push(...kasaHat((hash01(cx.seed, i, 1) - .5) * r * .12, -i * r * .11, r, lw, (hash01(cx.seed, i, 2) - .5) * 4 + num(p, "tilt", 0)));
  return out;
}

/** One rice bale lying on its side, centred at (cx, cy): length `L`, the round end cap toward +x. */
export function tawaraBale(cx: number, cy: number, L: number, lw: number, seed: number): Prim[] {
  const R = L * .36, h = L / 2, out: Prim[] = [];
  const body = smoothD([[-h, -R * .82], [-h * .55, -R], [h * .55, -R], [h, -R * .82], [h * 1.04, 0], [h, R * .82], [h * .55, R], [-h * .55, R], [-h, R * .82], [-h * 1.04, 0]], true, .35);
  out.push({ t: "fill", d: body, fill: { type: "linear", angle: 90, stops: [[0, "ki", 1], [.6, "kincha", 1], [1, "cha", 1]] }, outline: lw, grain: .9 });
  // Straw lengthwise, following the bulge.
  const straw: string[] = [];
  for (let i = 1; i < 9; i++) { const y = lerp(-R * .9, R * .9, i / 9), b = (1 - (y / R) ** 2) * R * .06; straw.push(`M${f1(-h * .95)} ${f1(y)}Q0 ${f1(y - b + (hash01(seed, i) - .5) * R * .05)} ${f1(h * .95)} ${f1(y)}`); }
  out.push({ t: "stroke", d: straw.join(""), color: "cha", width: lw * .5, opacity: .55 });
  // Rope bands wrapping round.
  out.push({ t: "stroke", d: [-.5, 0, .5].map(k => `M${f1(h * k)} ${f1(-R)}Q${f1(h * k + R * .18)} 0 ${f1(h * k)} ${f1(R)}`).join(""), color: "kogecha", width: lw * 1.6 });
  // The end cap (sandawara): a woven disc puckered into a centre knot.
  const ex = h * .98, erx = R * .34;
  out.push({ t: "fill", d: ellipseD(ex, 0, erx, R * .9), fill: "kincha", outline: lw, grain: .8 });
  const pucker: string[] = [];
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; pucker.push(`M${f1(ex + Math.cos(a) * erx * .9)} ${f1(Math.sin(a) * R * .8)}Q${f1(ex + Math.cos(a + .4) * erx * .4)} ${f1(Math.sin(a + .4) * R * .35)} ${f1(ex)} 0`); }
  out.push({ t: "stroke", d: pucker.join(""), color: "cha", width: lw * .6, opacity: .7 });
  out.push({ t: "fill", d: circleD(ex, 0, R * .09), fill: "kogecha" });
  return [{ t: "group", transform: `translate(${f1(cx)} ${f1(cy)})`, prims: out }];
}

/** Bales stacked as a pyramid, back rows first. Origin: the ground under the stack's middle. */
function balePile(n: number, L: number, lw: number, seed: number): Prim[] {
  const R = L * .36, rows: number[] = [];
  for (let left = n, w = Math.ceil((Math.sqrt(8 * n + 1) - 1) / 2); left > 0 && w > 0; w--) { const k = Math.min(w, left); rows.push(k); left -= k; }
  const out: Prim[] = [];
  rows.forEach((k, row) => { for (let i = 0; i < k; i++) out.push(...tawaraBale((i - (k - 1) / 2) * L * .92, -R - row * R * 1.6, L, lw, seed + row * 7 + i)); });
  return out;
}

/** Rice bales. Params: count (1–10, stacked in a pyramid), size (a bale's length). Origin: the ground under the pile. */
export function tawara(p: MP, cx: { seed: number }): Prim[] {
  const n = Math.max(1, Math.min(10, Math.round(num(p, "count", 1)))), L = num(p, "size", 110), lw = Math.max(1, L * .014);
  return [{ t: "fill", d: ellipseD(0, 0, L * (.4 + n * .18), L * .07), fill: "sumi", opacity: .15, noPrint: true }, ...balePile(n, L, lw, cx.seed)];
}

/**
 * A wooden sled (sori) on two runners that curl up at the front (+x), loaded for New Year: rice bales, a stand of
 * mirror rice cakes and wrapped bundles. The pull rope runs forward from the curl to `rope` px ahead (0 hides it), and
 * sags. Params: width, bales (0–6), mochi (bool), bundles (0–3), rope, ropeY (the rope's far end, relative to the
 * ground). Origin: the ground under the sled's middle.
 */
export function sori(p: MP, cx: { seed: number; frame: number }): Prim[] {
  const W = num(p, "width", 300), lw = Math.max(1.2, W * .007), h = W / 2, out: Prim[] = [], deck = -W * .1;
  const bales = Math.max(0, Math.min(6, Math.round(num(p, "bales", 3)))), bundles = Math.max(0, Math.min(3, Math.round(num(p, "bundles", 2))));
  const rope = num(p, "rope", 0), ropeY = num(p, "ropeY", -W * .25);
  out.push({ t: "fill", d: ellipseD(0, W * .01, h * 1.05, W * .03), fill: "sumi", opacity: .15, noPrint: true });
  // Load first, so the deck's front lip sits over it.
  const L = W * .34;
  if (bales) out.push({ t: "group", transform: `translate(${f1(-W * .12)} ${f1(deck)})`, prims: balePile(bales, L, lw, cx.seed) });
  if (num(p, "mochi", 1)) {
    const mx = h * .5, top = deck - W * .1;
    out.push({ t: "fill", d: `M${f1(mx - W * .1)} ${f1(deck)}L${f1(mx - W * .08)} ${f1(top)}L${f1(mx + W * .08)} ${f1(top)}L${f1(mx + W * .1)} ${f1(deck)}Z`, fill: "shu", outline: lw, grain: .4 });
    out.push({ t: "fill", d: ellipseD(mx, top - W * .035, W * .08, W * .04), fill: "gofun", outline: lw * .8 });
    out.push({ t: "fill", d: ellipseD(mx, top - W * .085, W * .06, W * .032), fill: "gofun", outline: lw * .8 });
    out.push({ t: "fill", d: circleD(mx, top - W * .13, W * .028), fill: "tan", outline: lw * .7 });
  }
  const wraps: UkiyoePaint[] = ["ai", "beni", "kusa"];
  for (let i = 0; i < bundles; i++) {
    const bx = h * (.05 + i * .2) + W * .02, by = deck, s = W * .07;
    out.push({ t: "fill", d: smoothD([[bx - s, by], [bx - s * .9, by - s * 1.2], [bx, by - s * 1.5], [bx + s * .9, by - s * 1.2], [bx + s, by]], true, .4), fill: wraps[i], outline: lw, pattern: { type: "kanoko", color: "gofun", scale: .4, opacity: .6 } });
    out.push({ t: "fill", d: smoothD([[bx - s * .4, by - s * 1.45], [bx - s * .1, by - s * 1.9], [bx + s * .1, by - s * 1.5], [bx + s * .45, by - s * 1.85], [bx + s * .3, by - s * 1.35]], true, .3), fill: wraps[i], outline: lw * .8 });
  }
  // The deck of slats, the runners curling up in front, the uprights between them.
  out.push({ t: "fill", d: `M${f1(-h)} ${f1(deck - W * .03)}L${f1(h * .82)} ${f1(deck - W * .03)}L${f1(h * .82)} ${f1(deck + W * .02)}L${f1(-h)} ${f1(deck + W * .02)}Z`, fill: WOOD, outline: lw, grain: .8 });
  out.push({ t: "stroke", d: [-.6, -.2, .2, .6].map(k => `M${f1(h * k)} ${f1(deck - W * .03)}L${f1(h * k)} ${f1(deck + W * .02)}`).join(""), color: "kogecha", width: lw * .6, opacity: .7 });
  out.push({ t: "stroke", d: [-.8, -.25, .3].map(k => `M${f1(h * k)} ${f1(deck + W * .02)}L${f1(h * k)} ${f1(-W * .02)}`).join(""), color: "kogecha", width: lw * 1.8 });
  out.push({ t: "line", d: carvedLine([[-h * 1.02, -W * .012], [h * .6, -W * .012], [h * .92, -W * .04], [h * 1.02, -W * .1], [h * .96, -W * .15]], lw * 2.6, { taper: "end" }), color: "cha" });
  if (rope) {
    const from: Pt = [h * .96, -W * .14], to: Pt = [h + rope, ropeY], sag = Math.min(60, rope * .12) * (1 + .1 * Math.sin(cx.frame / 7));
    out.push({ t: "stroke", d: `M${f1(from[0])} ${f1(from[1])}Q${f1((from[0] + to[0]) / 2)} ${f1(Math.max(from[1], to[1]) + sag)} ${f1(to[0])} ${f1(to[1])}`, color: "kogecha", width: lw * 1.3 });
  }
  return out;
}

export const VILLAGE_MOTIFS = { kasa, tawara, sori };
export const ANIMATED_VILLAGE = ["sori"] as const;

/** A jizō that walks (Kasa Jizō's night visit): stone-grey, shaven, a red bib at the collar, the straw hat it was given. */
export const UKIYOE_JIZO_LOOK: UkiyoeFigureLook = { robe: "usuzumi", skin: "usuzumi", legs: "usuzumi", hair: "bald", hat: "kasa", lower: "robe", under: "shu", obi: "usuzumi", feet: "bare", build: "child" };

/** How far the hat has come down onto the jizō's head (0 held above, 1 on), from the motif's progress. */
export const kasaDrop = (progress: number) => { const u = clamp01(progress); return 1 - (1 - u) ** 3; };
