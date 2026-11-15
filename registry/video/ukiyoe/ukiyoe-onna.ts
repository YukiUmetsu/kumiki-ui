/**
 * UKIYO1 women ghosts and hags, after Hokusai's *One Hundred Ghost Stories* (Okiku at the plate mansion, Oiwa in the
 * lantern), Toriyama Sekien's *Gazu Hyakki Yagyō* (hone-onna with her peony lantern, the ubume in the river, the
 * futakuchi-onna) and Utamaro's mountain woman. Most of these women look alive until the moment the story turns, so
 * they are figure looks: they walk, kneel, talk and turn in every view like anyone else, and a `reveal` action shows
 * what they are.
 *
 * - `face`: `noppera` (the faceless woman: eyes, brows, nose and mouth smooth away to a bare egg), `kuchisake` (a cloth
 *   over her mouth drops to show it slit back to the ears), `futakuchi` (a second mouth opens in the back of her head,
 *   two locks of hair reaching out like hands), `skull` (the skin goes to bone: sockets, the nose cavity, the teeth),
 *   `oiwa` (the poisoned face: one eye swollen shut under a livid lump, the hair falling) and `hag` (a mountain hag's
 *   lined face; the reveal opens a fanged mouth).
 * - Props: `peony-lantern` (the botan-dōrō, a pale lantern painted and tied with peonies) and `baby` (a swaddled infant
 *   held at the breast). Hat: `gotoku`, the iron trivet worn crown-down with three burning candles (the jealous woman's
 *   midnight curse at the shrine).
 *
 * Every function draws in the head's own units (profile and three-quarter: the face spans about ±20; square: the
 * face radius is 1), as the figure's head drawing does, so they drop into it.
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, clamp01, lerp, noise1, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD } from "./ukiyoe-prims";
import type { UkiyoePaint } from "./ukiyoe-pigments";
import type { UkiyoeNode, UkiyoeSceneSpec } from "./ukiyoe-scene";
import type { UkiyoeFigureLook } from "./ukiyoe-figure";

export type UkiyoeGhostFace = "noppera" | "kuchisake" | "futakuchi" | "skull" | "oiwa" | "hag";
export const UKIYOE_GHOST_FACES: readonly UkiyoeGhostFace[] = ["noppera", "kuchisake", "futakuchi", "skull", "oiwa", "hag"];
export const isGhostFace = (f: unknown): f is UkiyoeGhostFace => UKIYOE_GHOST_FACES.includes(f as UkiyoeGhostFace);

type Map2 = (x: number, y: number) => Pt;
const f1 = (n: number) => n.toFixed(1);
const lerp2 = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const BONE: UkiyoePaint = "paper";

/** How much of the ordinary eyes, brows, nose and mouth still show (1 = all, 0 = none). */
export function humanFeatures(face: UkiyoeGhostFace | undefined, r: number): number {
  if (face === "noppera") return 1 - clamp01(r * 1.25);
  if (face === "skull") return 1 - clamp01((r - .25) * 2);
  return 1;
}

/**
 * The profile outline of the face for this face kind and reveal. The faceless woman's nose and lips smooth into an
 * egg; a skull's cheek falls in under the bone. `base` is the figure's own outline (profile or three-quarter).
 */
export function faceOutline(face: UkiyoeGhostFace | undefined, r: number, base: readonly Pt[], tq: boolean): Pt[] {
  if (face !== "noppera" && face !== "skull") return base.map(q => [q[0], q[1]]);
  const out: [number, number][] = base.map(q => [q[0], q[1]]);
  // Points between the brow and the chin, front of the face: pulled onto a smooth egg curve.
  const egg = (y: number) => 16.4 - .006 * (y - 2) * (y - 2) - (y > 10 ? (y - 10) * .35 : 0);
  const k = face === "noppera" ? clamp01(r * 1.25) : clamp01((r - .3) * 1.6) * .6;
  for (const q of out) if (q[0] > 12 && q[1] > -6 && q[1] < 16) q[0] = lerp(q[0], Math.min(q[0], egg(q[1]) - (tq ? 1.2 : 0)), k);
  return out;
}

/** Ghost face details over the human face, profile (tq = three-quarter). `mouth` is the pose's mouth opening. */
export function ghostFaceSide(face: UkiyoeGhostFace, r: number, P: Map2, k: number, lw: number, skin: UkiyoePaint, mouth: number, frame: number, seed: number, tq: boolean, outline: readonly Pt[]): Prim[] {
  const out: Prim[] = [], line = (pts: Pt[], w: number) => carvedLine(pts.map(q => P(q[0], q[1])), w * k * .5 + .35, { taper: "both", minRatio: .3, smooth: true });
  const ex = tq ? 6.8 : 10, mx = tq ? 12.4 : 16.6, my = tq ? 10.3 : 9.6;
  switch (face) {
    case "noppera": {
      // Nothing left but a soft sheen across the smooth face, the way a polished egg catches light.
      const s = clamp01(r * 1.25);
      out.push({ t: "fill", d: ellipseD(...P(tq ? 6 : 9, -2), 6 * k, 9 * k), fill: "gofun", opacity: .35 * s, noPrint: true });
      break;
    }
    case "kuchisake": {
      // The slit: from the lips back along the cheek to below the ear, dark red, the teeth showing; opens with `mouth`.
      if (r > .05) {
        const open = 1 + 2.4 * mouth, s = clamp01((r - .1) * 1.6), back = tq ? -1 : -2;
        const top: Pt[] = [[mx + .4, my], [mx - 4, my - .6], [mx - 9, my - 1.6], [back + 3, my - 3.2], [back, my - 5]];
        const bot: Pt[] = [[back, my - 5], [back + 3, my - 2.2 + open * .5], [mx - 9, my + open * .7], [mx - 4, my + open * .8], [mx + .4, my]];
        out.push({ t: "fill", d: smoothD([...top, ...bot.slice(1)].map(q => P(q[0], q[1])), true, .35), fill: "kogecha", opacity: s, outline: lw * .8, outlineColor: "beni" });
        const teeth: string[] = [];
        for (let i = 0; i < 9; i++) { const q = lerp2(top[0], top[3], i / 9), b = P(q[0], q[1]); teeth.push(`M${f1(b[0])} ${f1(b[1])}v${f1(k * .9)}`); }
        out.push({ t: "stroke", d: teeth.join(""), color: "gofun", width: k * .55, opacity: s });
        out.push({ t: "line", d: line([[mx + .2, my - .3], [mx - 6, my - 1.2], [back + 2, my - 4.4]], .8), color: "beni", opacity: s });
      }
      // The cloth over the mouth, tied behind: it slips down and falls away as she reveals.
      const drop = r * 14, a = clamp01(1 - r * 1.6);
      if (a > 0) {
        const cloth: Pt[] = [[mx + 2.6, 2 + drop], [mx + 1.5, 15 + drop], [6, 18 + drop], [-4, 9 + drop], [-5, 3 + drop], [4, 2.5 + drop]];
        out.push({ t: "fill", d: smoothD(cloth.map(q => P(q[0], q[1])), true, .3), fill: "gofun", outline: lw, opacity: a });
        out.push({ t: "stroke", d: smoothD([P(mx + 1, 6 + drop), P(6, 9 + drop), P(-3, 6.5 + drop)], false, .4), color: "usuzumi", width: k * .4, opacity: .6 * a });
      }
      break;
    }
    case "futakuchi": {
      // The second mouth in the back of the head, under the hair at the nape: lips part, teeth, a tongue; two locks of
      // hair lift and reach out behind her like arms.
      const s = clamp01(r * 1.4), o = s * (1 + .4 * Math.sin(frame / 6 + seed));
      const c: Pt = tq ? [-13.5, 3] : [-15, 2], Q = (x: number, y: number) => P(c[0] + x * 1.8, c[1] + y * 1.8);
      const lips = [Q(1.5, -5), Q(-2.2, -2.5 * o - .5), Q(-2.6, 0), Q(-2.2, 2.5 * o + .5), Q(1.5, 5), Q(.4, 0)];
      if (s > .02) {
        out.push({ t: "fill", d: smoothD(lips, true, .45), fill: "beni", outline: lw });
        out.push({ t: "fill", d: smoothD([Q(1.1, -4), Q(-1.6, -1.8 * o), Q(-1.9, 0), Q(-1.6, 1.8 * o), Q(1.1, 4), Q(.2, 0)], true, .45), fill: "kogecha" });
        out.push({ t: "fill", d: smoothD([Q(.6, .4), Q(-1.2, .9 * o), Q(.4, 2.6)], true, .5), fill: "beni", opacity: .9 });
        const teeth: string[] = [];
        for (let i = 0; i < 5; i++) { const y = -3.4 + i * 1.7, a = Q(.6, y), b = Q(-1.4 * Math.max(.3, o), y + (i < 2 ? .7 : i > 2 ? -.7 : 0)); teeth.push(`M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`); }
        out.push({ t: "stroke", d: teeth.join(""), color: "gofun", width: k * .9, opacity: s });
        // Locks of hair reaching out from behind, each a tapered tendril that curls and gropes.
        const locks: string[] = [];
        for (let i = 0; i < 2; i++) {
          const root: Pt = [c[0] + 2, c[1] - 9 + i * 13], pts: Pt[] = [root];
          for (let j = 1; j <= 7; j++) { const u = j / 7, reach = 34 * s; pts.push([root[0] - reach * u, root[1] + (i ? 6 : -6) * u + Math.sin(frame / 7 + u * 4 + i * 2) * 4 * u]); }
          locks.push(carvedLine(pts.map(q => P(q[0], q[1])), k * 2.2, { taper: "end", minRatio: .15, smooth: true }));
        }
        out.push({ t: "fill", d: locks.join(""), fill: "sumi", opacity: s });
      }
      break;
    }
    case "skull": {
      // The skin turns to bone; the eye becomes a hollow socket, the nose a dark cavity, the lips draw back from the teeth.
      const s = clamp01(r * 1.6), b = clamp01((r - .3) * 1.8);
      out.push({ t: "fill", d: smoothD(outline.map(q => P(q[0], q[1])), true, .32), fill: BONE, opacity: s * .9 });
      if (b > 0) {
        out.push({ t: "fill", d: smoothD([P(ex - 4, -4), P(ex + .5, -6), P(ex + 4, -2.5), P(ex + 2.5, 2), P(ex - 2.5, 2)], true, .45), fill: "sumi", opacity: b * .9 });
        out.push({ t: "fill", d: smoothD([P(tq ? 13.4 : 16, 1), P(tq ? 15.4 : 18.6, 4.4), P(tq ? 13 : 15.6, 5.4)], true, .3), fill: "sumi", opacity: b * .85 });
        out.push({ t: "line", d: line([[ex - 6, 4], [ex, 7.5], [mx - 2, 8]], 1.1), color: "usuzumi", opacity: b * .8 });
        const teeth: string[] = [];
        for (let i = 0; i < 6; i++) { const q = P(mx - .5 - i * 1.4, my - .6 + i * .15); teeth.push(`M${f1(q[0])} ${f1(q[1] - k * 1.4)}v${f1(k * 2.8)}`); }
        out.push({ t: "fill", d: smoothD([P(mx + .6, my - 1.6), P(mx - 8, my - 1.4), P(mx - 8, my + 1.6), P(mx + .6, my + 1.4)], true, .2), fill: BONE, outline: lw * .7, opacity: b });
        out.push({ t: "stroke", d: teeth.join(""), color: "usuzumi", width: k * .4, opacity: b });
        out.push({ t: "line", d: line([[-2, 12], [4, 17], [11, 17.5]], .9), color: "usuzumi", opacity: b * .7 });
      }
      break;
    }
    case "oiwa": {
      // Hokusai's Oiwa: a livid lump swelling over the visible eye, the lid dragged down, the skin gone grey, the hair
      // thinning from the brow and hanging in strands across the face.
      const s = clamp01(r);
      out.push({ t: "fill", d: smoothD(outline.map(q => P(q[0], q[1])), true, .32), fill: "usuzumi", opacity: .22 * s, noPrint: true });
      // The lump bulges unevenly over the brow and eye and sags onto the cheek; no hard edge, like a bruise.
      const lump: Pt[] = [[ex - 5.5, -5.5], [ex - 2, -9.5], [ex + 2.5, -8.5], [ex + 5.8, -5], [ex + 5, -.5], [ex + 3.6, 3], [ex + .5, 6.5], [ex - 2.5, 5], [ex - 4.5, 1.5]];
      out.push({ t: "fill", d: smoothD(lump.map(q => P(q[0] + s * .3, q[1] + s * .8)), true, .5), fill: { type: "radial", stops: [[0, "beni", .7 * s], [.6, "murasaki", .55 * s], [1, "murasaki", .1 * s]] }, noPrint: true });
      out.push({ t: "line", d: line([[ex - 4.5, -5], [ex - 1, -8.6], [ex + 3, -7.4]], .7), color: "murasaki", opacity: .7 * s });
      out.push({ t: "line", d: line([[ex - 3, 1.8 + s], [ex + .5, 2.6 + s * 1.4], [ex + 3.4, 1.6 + s]], 1), color: "sumi", opacity: s });
      out.push({ t: "fill", d: ellipseD(...P(ex + .4, 2.9 + s * 1.3), 1 * k, .5 * k), fill: "sumi", opacity: s });
      // Bare patches at the hairline and loose strands falling over the face.
      out.push({ t: "fill", d: smoothD([P(-4, -19), P(4, -19.6), P(9, -16), P(4, -14.5), P(-2, -15.5)], true, .4), fill: skin, opacity: s });
      const strands: string[] = [];
      for (let i = 0; i < 6; i++) { const x0 = -2 + i * 2.2, sway = Math.sin(frame / 17 + i) * .8; strands.push(carvedLine([P(x0, -16), P(x0 + 3 + sway, -2), P(x0 + 4.5 + sway * 1.5, 10 + i * 1.5)], k * .5 + .3, { taper: "end", minRatio: .1, smooth: true })); }
      out.push({ t: "fill", d: strands.join(""), fill: "sumi", opacity: .85 * s });
      break;
    }
    case "hag": {
      // Lines across the brow and down the cheek, a hollow under the cheekbone, pouched eyes; the reveal splits the
      // mouth back into a wide grin with two fangs.
      const wr: string[] = [];
      for (const [a, b] of [[[2, -12], [9, -12.6]], [[3, -10], [10, -10.4]], [[ex + 1, 2], [ex + 3.5, 4]], [[mx - 5, 3], [mx - 6, 11]], [[mx - 3.5, 12], [mx - 7, 15]]] as [Pt, Pt][]) wr.push(carvedLine([P(a[0], a[1]), P((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + .5), P(b[0], b[1])], k * .4 + .3, { taper: "both" }));
      out.push({ t: "line", d: wr.join(""), color: "cha", opacity: .8 });
      out.push({ t: "fill", d: ellipseD(...P(ex - 3, 6), 4 * k, 3 * k), fill: "cha", opacity: .2, noPrint: true });
      if (r > .05) {
        const s = clamp01(r * 1.5), open = 2 + 3 * mouth;
        out.push({ t: "fill", d: smoothD([P(mx + .6, my - .6), P(mx - 7, my - 1.4), P(mx - 7.6, my + .4), P(mx - 5, my + open), P(mx + .2, my + open * .6)].map(q => q), true, .35), fill: "kogecha", outline: lw, opacity: s });
        out.push({ t: "fill", d: smoothD([P(mx - 1, my - 1), P(mx - 1.6, my + 2.6), P(mx - 2.4, my - 1)], true, .2) + smoothD([P(mx - 5, my - 1.2), P(mx - 5.5, my + 2.2), P(mx - 6.2, my - 1.2)], true, .2), fill: "gofun", outline: lw * .5, opacity: s });
      }
      break;
    }
  }
  return out;
}

/** Ghost face details on the square-on face (radius 1): front view. */
export function ghostFaceFront(face: UkiyoeGhostFace, r: number, P: Map2, rad: number, lw: number, skin: UkiyoePaint, mouth: number, frame: number): Prim[] {
  const out: Prim[] = [], line = (pts: Pt[], w: number) => carvedLine(pts.map(q => P(q[0], q[1])), rad * w + .3, { taper: "both", minRatio: .3, smooth: true });
  switch (face) {
    case "noppera": out.push({ t: "fill", d: ellipseD(...P(-.15, -.2), rad * .4, rad * .5), fill: "gofun", opacity: .35 * clamp01(r * 1.25), noPrint: true }); break;
    case "kuchisake": {
      const s = clamp01((r - .1) * 1.6), open = .06 + .16 * mouth;
      if (r > .05) {
        out.push({ t: "fill", d: smoothD([P(-.92, .1), P(-.5, .52), P(0, .6), P(.5, .52), P(.92, .1), P(.5, .6 + open), P(0, .66 + open), P(-.5, .6 + open)], true, .35), fill: "kogecha", outline: lw * .8, outlineColor: "beni", opacity: s });
        out.push({ t: "stroke", d: Array.from({ length: 11 }, (_, i) => { const x = -.6 + i * .12, q = P(x, .55 + Math.abs(x) * -.1); return `M${f1(q[0])} ${f1(q[1])}v${f1(rad * .06)}`; }).join(""), color: "gofun", width: rad * .035, opacity: s });
      }
      const drop = r * .9, a = clamp01(1 - r * 1.6);
      if (a > 0) out.push({ t: "fill", d: smoothD([P(-.95, .15 + drop), P(0, .08 + drop), P(.95, .15 + drop), P(.7, .9 + drop), P(0, 1.05 + drop), P(-.7, .9 + drop)], true, .3), fill: "gofun", outline: lw, opacity: a });
      break;
    }
    case "skull": {
      const s = clamp01(r * 1.6), b = clamp01((r - .3) * 1.8);
      out.push({ t: "fill", d: smoothD([P(-.88, -.3), P(-.8, .45), P(-.45, .92), P(0, 1.05), P(.45, .92), P(.8, .45), P(.88, -.3), P(.6, -.95), P(0, -1.08), P(-.6, -.95)], true, .4), fill: BONE, opacity: s * .9 });
      if (b > 0) {
        for (const sx of [-1, 1]) out.push({ t: "fill", d: smoothD([P(sx * .62, -.2), P(sx * .38, -.36), P(sx * .14, -.18), P(sx * .2, .1), P(sx * .55, .1)], true, .45), fill: "sumi", opacity: b * .9 });
        out.push({ t: "fill", d: smoothD([P(0, .12), P(.1, .34), P(-.1, .34)], true, .2), fill: "sumi", opacity: b * .85 });
        out.push({ t: "fill", d: smoothD([P(-.4, .52), P(.4, .52), P(.36, .72), P(-.36, .72)], true, .2), fill: BONE, outline: lw * .7, opacity: b });
        out.push({ t: "stroke", d: Array.from({ length: 7 }, (_, i) => { const q = P(-.3 + i * .1, .52); return `M${f1(q[0])} ${f1(q[1])}v${f1(rad * .2)}`; }).join(""), color: "usuzumi", width: rad * .03, opacity: b });
        for (const sx of [-1, 1]) out.push({ t: "line", d: line([[sx * .75, .2], [sx * .55, .5], [sx * .42, .62]], .04), color: "usuzumi", opacity: b * .7 });
      }
      break;
    }
    case "oiwa": {
      const s = clamp01(r);
      out.push({ t: "fill", d: smoothD([P(-.08, -.6), P(-.4, -.68), P(-.72, -.45), P(-.75, .05), P(-.5, .25), P(-.15, .12)].map(q => [q[0] + 0, q[1] + s * .06] as Pt), true, .45), fill: { type: "radial", stops: [[0, "beni", .85 * s], [1, "murasaki", .6 * s]] }, outline: lw * .7 * s });
      out.push({ t: "line", d: line([[-.6, .1], [-.38, .2], [-.18, .1]], .05), color: "sumi", opacity: s });
      out.push({ t: "fill", d: smoothD([P(-.5, -1.02), P(.2, -1.06), P(.5, -.9), P(0, -.82)], true, .4), fill: skin, opacity: s });
      const strands: string[] = [];
      for (let i = 0; i < 5; i++) { const x = -.5 + i * .25, sw = Math.sin(frame / 17 + i) * .04; strands.push(carvedLine([P(x, -.9), P(x + .05 + sw, -.2), P(x + .02 + sw * 2, .55)], rad * .03 + .3, { taper: "end", minRatio: .1, smooth: true })); }
      out.push({ t: "fill", d: strands.join(""), fill: "sumi", opacity: .85 * s });
      break;
    }
    case "hag": {
      const wr = [[[-.45, -.72], [.45, -.72]], [[-.35, -.62], [.35, -.62]], [[-.7, .25], [-.55, .62]], [[.7, .25], [.55, .62]], [[-.55, .05], [-.3, .12]], [[.55, .05], [.3, .12]]] as [Pt, Pt][];
      out.push({ t: "line", d: wr.map(([a, b]) => carvedLine([P(a[0], a[1]), P((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + .03), P(b[0], b[1])], rad * .025 + .3, { taper: "both" })).join(""), color: "cha", opacity: .8 });
      if (r > .05) {
        const s = clamp01(r * 1.5), open = .12 + .2 * mouth;
        out.push({ t: "fill", d: smoothD([P(-.5, .52), P(0, .56), P(.5, .52), P(.3, .6 + open), P(-.3, .6 + open)], true, .35), fill: "kogecha", outline: lw, opacity: s });
        out.push({ t: "fill", d: smoothD([P(-.3, .53), P(-.24, .68), P(-.18, .53)], true, .2) + smoothD([P(.18, .53), P(.24, .68), P(.3, .53)], true, .2), fill: "gofun", outline: lw * .5, opacity: s });
      }
      break;
    }
    case "futakuchi": break;
  }
  return out;
}

/** The back of the head (radius 1): the futakuchi-onna's second mouth gapes in the hair, the locks reaching out. */
export function ghostFaceBack(face: UkiyoeGhostFace, r: number, P: Map2, rad: number, lw: number, frame: number): Prim[] {
  if (face !== "futakuchi" || r < .02) return [];
  const s = clamp01(r * 1.4), o = s * (1 + .4 * Math.sin(frame / 6)), out: Prim[] = [];
  out.push({ t: "fill", d: smoothD([P(-.5, .25), P(0, .25 - .32 * o), P(.5, .25), P(0, .25 + .32 * o)], true, .45), fill: "beni", outline: lw });
  out.push({ t: "fill", d: smoothD([P(-.4, .25), P(0, .25 - .24 * o), P(.4, .25), P(0, .25 + .24 * o)], true, .45), fill: "kogecha" });
  out.push({ t: "stroke", d: Array.from({ length: 6 }, (_, i) => { const x = -.3 + i * .12, a = P(x, .25 - .2 * o), b = P(x, .25 + .2 * o); return `M${f1(a[0])} ${f1(a[1])}v${f1(rad * .08)}M${f1(b[0])} ${f1(b[1])}v${f1(-rad * .08)}`; }).join(""), color: "gofun", width: rad * .05, opacity: s });
  const locks: string[] = [];
  for (const sx of [-1, 1]) {
    const pts: Pt[] = [];
    for (let j = 0; j <= 7; j++) { const u = j / 7; pts.push(P(sx * (.5 + 1.8 * s * u), .1 - .5 * u + Math.sin(frame / 7 + u * 4 + sx) * .25 * u)); }
    locks.push(carvedLine(pts, rad * .16, { taper: "end", minRatio: .15, smooth: true }));
  }
  out.push({ t: "fill", d: locks.join(""), fill: "sumi", opacity: s });
  return out;
}

// ---- Props and the candle crown ----------------------------------------------------------------------------------------------------

/**
 * The botan-dōrō: a pale paper lantern on a short handle, painted with a peony and tied with a real one, its light
 * flickering. `hand` is where it is held; the lantern hangs below and swings.
 */
export function peonyLantern(hand: Pt, H: number, lw: number, frame: number, wind: number, seed: number): Prim[] {
  const tip: Pt = [hand[0] + H * .14, hand[1] - H * .06], sw = Math.sin(frame / 13 + seed) * H * .012 + wind * H * .02, c: Pt = [tip[0] + sw, tip[1] + H * .15];
  const flick = .85 + .15 * Math.abs(noise1(seed, frame * .25)), out: Prim[] = [];
  out.push({ t: "line", d: carvedLine([hand, tip], H * .009, { taper: "none" }), color: "kincha" });
  out.push({ t: "stroke", d: `M${f1(tip[0])} ${f1(tip[1])}L${f1(c[0])} ${f1(c[1] - H * .07)}`, color: "sumi", width: 1 });
  out.push({ t: "glow", cx: c[0], cy: c[1], r: H * .38, color: "sakura", opacity: .45 * flick }, { t: "glow", cx: c[0], cy: c[1], r: H * .16, color: "gofun", opacity: .5 * flick });
  const rx = H * .045, ry = H * .065;
  out.push({ t: "fill", d: ellipseD(c[0], c[1], rx, ry), fill: { type: "radial", stops: [[0, "gofun", 1], [.7, "sakura", .9], [1, "beni", .7]] }, outline: lw });
  out.push({ t: "stroke", d: [-.5, 0, .5].map(k => `M${f1(c[0] - rx * Math.sqrt(1 - k * k))} ${f1(c[1] + ry * k)}h${f1(2 * rx * Math.sqrt(1 - k * k))}`).join(""), color: "cha", width: lw * .5, opacity: .5 });
  out.push({ t: "fill", d: ellipseD(c[0], c[1] - ry * 1.02, rx * .55, ry * .14) + ellipseD(c[0], c[1] + ry * 1.02, rx * .55, ry * .14), fill: "sumi" });
  // The painted peony, and the flower tied under the handle with its leaves.
  const petals: string[] = [];
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; petals.push(ellipseD(c[0] + Math.cos(a) * rx * .3, c[1] + Math.sin(a) * rx * .3, rx * .26, rx * .22)); }
  out.push({ t: "fill", d: petals.join(""), fill: "beni", opacity: .75, union: true });
  const fl: Pt = [tip[0] - H * .01, tip[1] + H * .01], fp: string[] = [];
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; fp.push(ellipseD(fl[0] + Math.cos(a) * H * .012, fl[1] + Math.sin(a) * H * .01, H * .013, H * .011)); }
  out.push({ t: "fill", d: smoothD([[fl[0] - H * .01, fl[1]], [fl[0] - H * .04, fl[1] + H * .02], [fl[0] - H * .02, fl[1] + H * .025]], true, .4) + smoothD([[fl[0] + H * .01, fl[1]], [fl[0] + H * .035, fl[1] + H * .028], [fl[0] + H * .012, fl[1] + H * .03]], true, .4), fill: "matsu", outline: lw * .5 });
  out.push({ t: "fill", d: fp.join(""), fill: "sakura", outline: lw * .5, union: true }, { t: "fill", d: circleD(fl[0], fl[1], H * .006), fill: "ki" });
  return out;
}

/** A swaddled infant held at the breast: the patterned wrap, the small face and hair peeping out at the top. */
export function babyBundle(c: Pt, H: number, lw: number, facing: 1 | -1 = 1, square = false): Prim[] {
  const w = H * (square ? .085 : .07), h = H * (square ? .07 : .1), out: Prim[] = [];
  const wrap = square
    ? smoothD([[c[0] - w, c[1]], [c[0] - w * .8, c[1] - h * .9], [c[0], c[1] - h * 1.1], [c[0] + w * .8, c[1] - h * .9], [c[0] + w, c[1]], [c[0] + w * .6, c[1] + h * .7], [c[0] - w * .6, c[1] + h * .7]], true, .4)
    : smoothD([[c[0] - w * .9, c[1] + h * .5], [c[0] - w, c[1] - h * .3], [c[0] - w * .2 * facing, c[1] - h], [c[0] + w * facing, c[1] - h * .7], [c[0] + w * .9, c[1] + h * .3], [c[0] + w * .2, c[1] + h * .8]], true, .4);
  out.push({ t: "fill", d: wrap, fill: "beni", outline: lw, pattern: { type: "asanoha", color: "gofun", scale: .35, opacity: .7 } });
  const fc: Pt = square ? [c[0], c[1] - h * .55] : [c[0] + w * .35 * facing, c[1] - h * .55];
  out.push({ t: "fill", d: ellipseD(fc[0], fc[1], H * .024, H * .026), fill: "hada", outline: lw * .7 });
  out.push({ t: "fill", d: smoothD([[fc[0] - H * .024, fc[1] - H * .004], [fc[0] - H * .015, fc[1] - H * .028], [fc[0] + H * .015, fc[1] - H * .028], [fc[0] + H * .022, fc[1] - H * .01]], true, .4), fill: "sumi" });
  out.push({ t: "stroke", d: `M${f1(fc[0] - H * .01)} ${f1(fc[1] + H * .002)}h${f1(H * .006)}M${f1(fc[0] + H * .005)} ${f1(fc[1] + H * .002)}h${f1(H * .006)}`, color: "sumi", width: lw * .6 });
  return out;
}

/**
 * The gotoku crown: an iron trivet worn upside-down on the head, its three legs pointing up, each carrying a lit candle
 * (the ushi-no-koku curse). Head units as above; `square` for the front and back views (radius 1).
 */
export function gotokuCrown(P: Map2, k: number, lw: number, frame: number, seed: number, square = false): Prim[] {
  const out: Prim[] = [], legs: [Pt, Pt][] = square
    ? [[[-0.85, -0.85], [-1.1, -1.55]], [[0, -1.08], [0, -1.8]], [[.85, -.85], [1.1, -1.55]]]
    : [[[-9, -19], [-13, -31]], [[3, -21], [4, -34]], [[11, -16.5], [15, -28]]];
  const ring = square ? smoothD([P(-1.0, -.82), P(0, -1.0), P(1.0, -.82), P(0, -.7)], true, .45) : smoothD([P(-13, -16), P(0, -22.5), P(14, -17), P(0, -14.5)], true, .45);
  out.push({ t: "stroke", d: ring, color: "sumi", width: (square ? k * .12 : k * 1.4) + .5 });
  legs.forEach(([a, b], i) => {
    out.push({ t: "line", d: carvedLine([P(a[0], a[1]), P(b[0], b[1])], (square ? k * .1 : k * 1.2) + .4, { taper: "none" }), color: "sumi" });
    const cw = square ? .1 : 1.4, ch = square ? .38 : 6, top = P(b[0], b[1] - ch), base = P(b[0], b[1]);
    out.push({ t: "fill", d: `M${f1(base[0] - cw * k)} ${f1(base[1])}L${f1(top[0] - cw * k)} ${f1(top[1])}L${f1(top[0] + cw * k)} ${f1(top[1])}L${f1(base[0] + cw * k)} ${f1(base[1])}Z`, fill: "gofun", outline: lw * .6 });
    const fl = 1 + .25 * Math.sin(frame / 3 + i * 2 + seed), fh = (square ? .3 : 4.5) * fl, flame = [P(b[0] - cw * .9, b[1] - ch), P(b[0] + (square ? .03 : .5) * Math.sin(frame / 5 + i), b[1] - ch - fh), P(b[0] + cw * .9, b[1] - ch)];
    out.push({ t: "glow", cx: flame[1][0], cy: flame[1][1], r: k * (square ? 1.1 : 14), color: "ki", opacity: .35 });
    out.push({ t: "fill", d: smoothD(flame, true, .5), fill: "ki", outline: lw * .4, outlineColor: "shu" });
  });
  return out;
}

/** Generic looks for the women of the ghost stories (no particular actress, print or performance). */
export const UKIYOE_ONNA_LOOKS = {
  noppera: { hair: "shimada", robe: "murasaki", robePattern: { type: "kanoko", color: "gofun", scale: .5 }, obi: "kin", under: "beni", feet: "geta", build: "slim", face: "noppera" },
  kuchisake: { hair: "long", robe: "usuzumi", robePattern: { type: "shima", color: "sumi", scale: .5, opacity: .5 }, obi: "beni", under: "beni", feet: "geta", build: "slim", face: "kuchisake" },
  futakuchi: { hair: "shimada", robe: "ai", robePattern: { type: "yagasuri", color: "gofun", scale: .5, opacity: .6 }, obi: "cha", under: "beni", feet: "bare", build: "slim", face: "futakuchi" },
  honeonna: { hair: "shimada", robe: "sakura", robePattern: { type: "sakura", color: "gofun", scale: .5 }, obi: "beni", under: "beni", feet: "geta", build: "slim", face: "skull", prop: "peony-lantern", sleeves: "long" },
  oiwa: { hair: "long", robe: "gofun", obi: "usuzumi", under: "usuzumi", feet: "bare", build: "slim", face: "oiwa" },
  yamanba: { hair: "long", hairColor: "gofun", robe: "cha", robePattern: { type: "kikko", color: "kogecha", scale: .5, opacity: .5 }, obi: "kogecha", lower: "tucked", legs: "hada", feet: "bare", build: "average", face: "hag", skin: "hada" },
  hashihime: { hair: "long", robe: "gofun", obi: "gofun", under: "beni", feet: "bare", build: "slim", skin: "shu", hat: "gotoku", lips: "sumi" },
  ubume: { hair: "long", robe: "gofun", under: "beni", obi: "usuzumi", feet: "bare", build: "slim", prop: "baby", skin: "gofun" },
} as const;

// ---- Scene recipes -----------------------------------------------------------------------------------------------------------------

const ONNA_LABELS: Readonly<Record<keyof typeof UKIYOE_ONNA_LOOKS, string>> = {
  noppera: "Noppera-bō", kuchisake: "Kuchisake-onna", futakuchi: "Futakuchi-onna", honeonna: "Hone-onna", oiwa: "Oiwa", yamanba: "Yamanba", hashihime: "Hashihime", ubume: "Ubume",
};

/**
 * `lineup`: the eight women of the ghost stories in a row at night, seen in `view`, each turning to show what she is at
 * frame 90 (they talk, so the faces and mouths move). `okiku`: Okiku rising out of her overgrown well by night, counting.
 */
export function onnaScene(kind: "lineup" | "okiku", view: "profile" | "three-quarter" | "front" | "back" = "profile", frames = 300): UkiyoeSceneSpec {
  const sky: UkiyoeNode = { id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, band: .5, top: "yoru", mid: "ai", horizon: "murasaki" } };
  const nodes: UkiyoeNode[] = [sky];
  if (kind === "lineup") {
    nodes.push({ id: "ground", kind: "block", shape: { type: "rect", width: 1920, height: 200 }, x: 960, y: 980, fill: { type: "linear", angle: 90, stops: [[0, "ai", 1], [1, "yoru", 1]] }, line: 0 });
    (Object.keys(UKIYOE_ONNA_LOOKS) as (keyof typeof UKIYOE_ONNA_LOOKS)[]).forEach((k, i) => {
      const x = 150 + i * 232;
      nodes.push({ id: k, kind: "figure", x, y: 900, scale: 1.45, look: { ...UKIYOE_ONNA_LOOKS[k], view } as UkiyoeFigureLook, facing: "right",
        // Hands held quietly before the body (those with a lantern or a baby keep their own hold).
        actions: [...("prop" in UKIYOE_ONNA_LOOKS[k] ? [] : [{ type: "hold" as const, start: 0, end: frames, angle: 18, amount: 96, blend: 0 }]),
          { type: "reveal", start: 90, end: frames, amount: 30 }, { type: "talk", start: 120, end: 200 }] });
      nodes.push({ id: k + "-label", kind: "text", style: "caption", depth: 0, x, y: 1010, text: ONNA_LABELS[k], size: 22 });
    });
  } else {
    nodes.push({ id: "moon", kind: "motif", motif: "moon", x: 1500, y: 220, params: { radius: 70 } });
    nodes.push({ id: "willow", kind: "motif", motif: "willow", x: 1380, y: 900, params: { height: 620 } });
    nodes.push({ id: "ground", kind: "block", shape: { type: "rect", width: 1920, height: 220 }, x: 960, y: 970, fill: { type: "linear", angle: 90, stops: [[0, "ai", 1], [1, "yoru", 1]] }, line: 0 });
    nodes.push({ id: "well-back", kind: "motif", motif: "well", x: 860, y: 920, params: { radius: 150, part: "back" } });
    nodes.push({ id: "okiku", kind: "creature", species: "okiku", x: 860, y: 920 - 150 * .85, look: { size: 540 }, facing: "right",
      actions: [{ type: "appear", start: 30, end: 120 }, { type: "howl", start: 150, end: 260 }] });
    nodes.push({ id: "well-front", kind: "motif", motif: "well", x: 860, y: 920, params: { radius: 150, part: "front" } });
  }
  return { version: 1, id: `onna-${kind}`, width: 1920, height: 1080, durationFrames: frames, seed: 19, cadence: 2, palette: { preset: "night" }, nodes };
}
