/**
 * UKIYO1 interiors, after the rooms of Hiroshige's Akasaka inn (Tōkaidō, ca. 1834), Harunobu's Zashiki hakkei parlours
 * (ca. 1766), Utamaro's weavers and kitchen (ca. 1794–1800), Kiyonaga's and Shunman's tokonoma rooms and the roofless
 * (fukinuki yatai) rooms of the Genji scrolls. A room is drawn the way the prints draw it: the front wall taken away, the
 * floor in parallel oblique projection receding up and to the right, the back wall seen through the opening up to the
 * front lintel. Motifs:
 *
 * - `room`: tatami (or boards, or an earthen floor), the back wall in bays — fusuma with painted paper and round pulls,
 *   shoji with their lattice, a tokonoma alcove with a hanging scroll and a vase, staggered chigaidana shelves, a round
 *   window, plaster, an open bay into the next room or the garden — posts, the kamoi rail and the transom, a side wall,
 *   a veranda in front. Panels slide on their tracks (`slide`) and shoji can be torn. `part: "back" | "front"` splits
 *   it so figures stand between the floor and the front posts, lintel and eave.
 * - `andon`: a standing paper lamp whose light flickers; `irori`: the sunken hearth with its fire, the hanging pot hook
 *   (jizai-kagi) with a fish-shaped crosspiece, a kettle and its steam; `futon`: the mattress and pillow (`layer:
 *   "under"`) and the quilted cover (`layer: "over"`, over a sleeper); `loom`: a treadle loom whose shed changes, beater
 *   swings and cloth grows, timed with the figure's `weave` action; `byobu`: a folding screen of gold leaf.
 *
 * Each motif stands on its base centre (the front edge of the floor for a room). The oblique is shared: going one unit
 * back moves `skew` units right.
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, clamp, clamp01, hash01, lerp, noise1, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD, rectD } from "./ukiyoe-prims";
import type { UkiyoeFill, UkiyoePaint } from "./ukiyoe-pigments";
import type { UkiyoeNode, UkiyoeSceneSpec } from "./ukiyoe-scene";
import type { UkiyoeAction, UkiyoeFigureLook } from "./ukiyoe-figure";

type P = Readonly<Record<string, unknown>>;
export interface InteriorContext { seed: number; frame: number; wind: number }
const num = (p: P, k: string, d: number) => typeof p[k] === "number" && Number.isFinite(p[k]) ? p[k] as number : d;
const str = (p: P, k: string, d: string) => typeof p[k] === "string" ? p[k] as string : d;
const paint = (p: P, k: string, d: UkiyoePaint): UkiyoePaint => typeof p[k] === "string" ? p[k] as string : d;
const bool = (p: P, k: string, d: boolean) => typeof p[k] === "boolean" ? p[k] as boolean : d;
const f = (n: number) => n.toFixed(1);
const poly = (pts: readonly Pt[]) => "M" + pts.map(q => `${f(q[0])} ${f(q[1])}`).join("L") + "Z";
const seg = (a: Pt, b: Pt) => `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`;
const smooth = (t: number) => { const u = clamp01(t); return u * u * (3 - 2 * u); };

const WOOD: UkiyoeFill = { type: "linear", angle: 0, stops: [[0, "cha", 1], [.5, "kincha", 1], [1, "cha", 1]] };
const DARKWOOD: UkiyoeFill = { type: "linear", angle: 0, stops: [[0, "kogecha", 1], [.5, "cha", 1], [1, "kogecha", 1]] };
const LACQUER: UkiyoeFill = { type: "linear", angle: 90, stops: [[0, "sumi", 1], [.5, "kogecha", 1], [1, "sumi", 1]] };
/** Sand-plaster wall (jurakukabe): warm and slightly mottled. */
const PLASTER: UkiyoeFill = { type: "linear", angle: 90, stops: [[0, "paper", 1], [1, "kincha", .55]] };

/** The panel kinds a room's back wall is built from. */
export type UkiyoeBayKind = "fusuma" | "shoji" | "tokonoma" | "tana" | "wall" | "marumado" | "open" | "garden";
export const UKIYOE_BAY_KINDS: readonly UkiyoeBayKind[] = ["fusuma", "shoji", "tokonoma", "tana", "wall", "marumado", "open", "garden"];
/** A sliding panel: bay index, how far it ends up open (0–1), when it starts and how many frames it takes. */
export interface UkiyoeSlide { bay: number; open: number; start?: number; frames?: number; from?: number }

interface Wall {
  lw: number; seed: number; frame: number; night: number; torn: number; art: string; paper: UkiyoePaint;
  beyond: string; slides: readonly UkiyoeSlide[]; scroll: string; flower: boolean; snow: number;
}

function slideOpen(w: Wall, bay: number): number {
  let open = 0;
  for (const s of w.slides) if (s.bay === bay) {
    const start = s.start ?? 0, frames = Math.max(1, s.frames ?? 1), from = s.from ?? 0;
    open = lerp(from, s.open, smooth((w.frame - start) / frames));
  }
  return clamp01(open);
}

// ---- Wall bays (drawn in wall-local coordinates: x along the wall from 0, the sill at y = 0, up is −y) ----------------

/** What shows behind a slid panel: the dark next room, the garden by day, or the night outside. */
function beyondFill(x0: number, w: number, ph: number, kind: string, night: number, seed: number, snow = 0, frame = 0): Prim[] {
  const d = rectD(x0, -ph, w, ph);
  if (kind === "garden") {
    const out: Prim[] = [{ t: "fill", d, fill: { type: "linear", angle: 90, stops: night > .5 ? [[0, "yoru", 1], [1, "ai", 1]] : [[0, "sora", 1], [1, "paper", 1]] } }];
    const bush: string[] = [];
    for (let i = 0; i < 4; i++) { const cx = x0 + w * (.15 + .25 * i) + w * .06 * (hash01(seed, i, 41) - .5), r = w * (.16 + .06 * hash01(seed, i, 42)); bush.push(ellipseD(cx, -ph * .18, r, r * .62)); }
    out.push({ t: "fill", d: bush.join(""), fill: night > .5 ? "sumi" : "matsu", opacity: night > .5 ? .8 : .9, union: true, outline: .6 });
    if (snow > 0) {
      // Snow lying on the bushes and falling past the opening, each flake on its own slow drift.
      const caps: string[] = [], flakes: string[] = [];
      for (let i = 0; i < 4; i++) { const cx = x0 + w * (.15 + .25 * i) + w * .06 * (hash01(seed, i, 41) - .5), r = w * (.16 + .06 * hash01(seed, i, 42)); caps.push(ellipseD(cx, -ph * .18 - r * .4, r * .8, r * .28)); }
      out.push({ t: "fill", d: caps.join(""), fill: "gofun", opacity: .9 * snow, union: true });
      const n = Math.round(30 * snow * w / 300);
      for (let i = 0; i < n; i++) {
        const sp = .6 + .8 * hash01(seed, i, 51), y = -ph + (((hash01(seed, i, 52) * ph + frame * sp) % ph) + ph) % ph, x = x0 + w * hash01(seed, i, 53) + Math.sin(frame / 30 + i) * w * .03;
        flakes.push(circleD(x, y, 1.2 + 1.6 * hash01(seed, i, 54)));
      }
      out.push({ t: "dots", d: flakes.join(""), color: "gofun", opacity: .9 * snow });
    }
    return out;
  }
  return [{ t: "fill", d, fill: { type: "linear", angle: 90, stops: [[0, "sumi", 1], [1, "kogecha", 1]] } },
    { t: "stroke", d: [.3, .55, .8].map(k => `M${f(x0)} ${f(-ph * (1 - k) * .4)}h${f(w)}`).join(""), color: "cha", width: .8, opacity: .4 }];
}

/** Bamboo painted on fusuma paper in ink: stalks with nodes, and sprays of narrow leaves (Hiroshige's inn). */
function bambooArt(x0: number, w: number, ph: number, seed: number, lw: number): Prim[] {
  const stalks: string[] = [], nodes: string[] = [], leaves: string[] = [];
  const n = Math.max(2, Math.round(w / (ph * .22)));
  for (let i = 0; i < n; i++) {
    const x = x0 + w * (i + .3 + .4 * hash01(seed, i, 1)) / n, lean = (hash01(seed, i, 2) - .5) * w * .06, sw = lw * (1.6 + 1.2 * hash01(seed, i, 3));
    stalks.push(carvedLine([[x, 0], [x + lean * .5, -ph * .5], [x + lean, -ph]], sw, { taper: "none" }));
    for (let k = 1; k < 6; k++) { const y = -ph * (k / 6 + .03 * hash01(seed, i, k + 10)), xx = x + lean * (-y / ph); nodes.push(`M${f(xx - sw * .9)} ${f(y)}h${f(sw * 1.8)}`); }
    // Leaf sprays: three to five narrow leaves fanning from a twig, pointing down and out.
    for (let s = 0; s < 3; s++) {
      if (hash01(seed, i, s + 20) < .35) continue;
      const y = -ph * (.35 + .55 * hash01(seed, i, s + 30)), xx = x + lean * (-y / ph), dir = hash01(seed, i, s + 40) < .5 ? -1 : 1;
      const len = ph * (.07 + .04 * hash01(seed, i, s + 50));
      for (let l = 0; l < 4; l++) {
        const a = (25 + l * 22 + 10 * hash01(seed, i * 7 + l, s)) * Math.PI / 180, tip: Pt = [xx + dir * Math.sin(a) * len, y + Math.cos(a) * len * .8];
        const mid: Pt = [(xx + tip[0]) / 2 - dir * Math.cos(a) * len * .08, (y + tip[1]) / 2 - len * .05];
        leaves.push(carvedLine([[xx, y], mid, tip], len * .13, { taper: "both" }));
      }
    }
  }
  return [{ t: "line", d: stalks.join(""), color: "usuzumi", opacity: .55 }, { t: "stroke", d: nodes.join(""), color: "usuzumi", width: lw * 1.2, opacity: .7 },
    { t: "line", d: leaves.join(""), color: "usuzumi", opacity: .6 }];
}

/** Gold mist bands (suyari-gasumi): long rounded bars with scalloped ends drifting across the panel. */
function cloudArt(x0: number, w: number, ph: number, seed: number): Prim[] {
  const bands: string[] = [];
  for (let i = 0; i < 3; i++) {
    const y = -ph * (.2 + .27 * i + .07 * hash01(seed, i, 5)), h = ph * .05, a = x0 + w * (-.1 + .35 * hash01(seed, i, 6)), b = a + w * (.55 + .4 * hash01(seed, i, 7));
    // The top edge rises in a few soft lobes, the bottom runs straighter; the ends are rounded off.
    const lobes = Math.max(2, Math.round((b - a) / (h * 3.2))), pts: Pt[] = [[a - h * .4, y]];
    for (let k = 0; k <= lobes * 2; k++) pts.push([lerp(a, b, k / (lobes * 2)), y - h * (k % 2 ? 1.25 : .75) - h * .15 * hash01(seed, i * 20 + k, 8)]);
    pts.push([b + h * .45, y - h * .2], [b + h * .2, y + h * .45]);
    for (let k = lobes; k >= 0; k--) pts.push([lerp(a, b, k / lobes) + h * .3, y + h * (k % 2 ? .55 : .4)]);
    bands.push(smoothD(pts, true, .45));
  }
  return [{ t: "fill", d: bands.join(""), fill: "kin", opacity: .9, outline: .6, outlineColor: "kincha" }];
}

/** Painted fusuma art clipped to one panel, translated with the panel as it slides. */
function fusumaArt(style: string, x0: number, w: number, ph: number, seed: number, lw: number): Prim[] {
  if (style === "bamboo") return bambooArt(x0, w, ph, seed, lw);
  if (style === "clouds") return cloudArt(x0, w, ph, seed);
  if (style === "waves") return [{ t: "fill", d: rectD(x0, -ph, w, ph), fill: "gofun", opacity: 0, pattern: { type: "seigaiha", color: "ai", scale: ph * .0016, opacity: .35 } }];
  if (style === "pine") {
    const trunk = carvedLine([[x0 + w * .1, -ph * .05], [x0 + w * .3, -ph * .45], [x0 + w * .22, -ph * .7], [x0 + w * .55, -ph * .82]], lw * 5, { taper: "end", seed });
    const pads: string[] = [];
    for (let i = 0; i < 5; i++) { const c: Pt = [x0 + w * (.25 + .15 * i), -ph * (.5 + .08 * (i % 3))]; pads.push(ellipseD(c[0], c[1], w * .12, ph * .05)); }
    return [{ t: "line", d: trunk, color: "kogecha", opacity: .8 }, { t: "fill", d: pads.join(""), fill: "matsu", opacity: .8, union: true }];
  }
  return [{ t: "fill", d: rectD(x0, -ph, w, ph), fill: "gofun", opacity: 0, pattern: { type: "kikko", color: "kincha", scale: ph * .0012, opacity: .18 } }];
}

/** One fusuma panel: lacquered frame, painted paper, a round recessed pull near its inner edge. */
function fusumaPanel(x: number, w: number, ph: number, wall: Wall, artX0: number, artW: number, offset: number, key: string, pullRight: boolean): Prim[] {
  const lw = wall.lw, d = rectD(x, -ph, w, ph), out: Prim[] = [];
  out.push({ t: "fill", d, fill: wall.paper, grain: .15 });
  out.push({ t: "clip", d, key, prims: [{ t: "group", transform: `translate(${f(offset)} 0)`, prims: fusumaArt(wall.art, artX0, artW, ph, wall.seed, lw) }] });
  const fr = lw * 2.4;
  out.push({ t: "stroke", d: rectD(x + fr / 2, -ph + fr / 2, w - fr, ph - fr), color: "sumi", width: fr });
  const hx = pullRight ? x + w - w * .12 : x + w * .12, hy = -ph * .48;
  out.push({ t: "fill", d: ellipseD(hx, hy, w * .045, w * .06), fill: "sumi", outline: lw * .8, outlineColor: "kin" }, { t: "fill", d: ellipseD(hx, hy, w * .025, w * .035), fill: "kogecha" });
  return out;
}

/**
 * Torn shoji paper, the way the ghost prints show a neglected house: whole cells of the lattice burst open to the dark
 * beyond, a ragged scrap of paper still hanging from one edge of each, a few cells only split.
 */
function tears(x: number, w: number, top: number, h: number, cols: number, rows: number, amount: number, seed: number, lw: number): Prim[] {
  if (amount <= 0) return [];
  const cw = w / cols, ch = h / rows, holes: string[] = [], scraps: string[] = [], splits: string[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const roll = hash01(seed, r * 7 + c, 61);
    if (roll > amount * .45) continue;
    const x0 = x + c * cw, y0 = top + r * ch;
    if (roll < amount * .3) {
      holes.push(rectD(x0, y0, cw, ch));
      // The scrap: paper still glued along the top edge, torn off in a jagged line and curling down.
      const depth = ch * (.25 + .45 * hash01(seed, r * 7 + c, 62)), pts: Pt[] = [[x0, y0]];
      for (let k = 0; k <= 6; k++) pts.push([x0 + cw * (k / 6), y0 + depth * (.4 + .6 * hash01(seed, r * 70 + c * 9 + k, 63)) * (k % 2 ? .7 : 1)]);
      pts.push([x0 + cw, y0]);
      scraps.push(poly(pts));
    } else {
      const a: Pt = [x0 + cw * hash01(seed, r * 7 + c, 64), y0], b: Pt = [x0 + cw * .5, y0 + ch * .5], e: Pt = [x0 + cw * hash01(seed, r * 7 + c, 65), y0 + ch];
      splits.push(`M${f(a[0])} ${f(a[1])}L${f(b[0] + cw * .08)} ${f(b[1] - ch * .1)}L${f(b[0] - cw * .06)} ${f(b[1] + ch * .08)}L${f(e[0])} ${f(e[1])}`);
    }
  }
  return [{ t: "fill", d: holes.join("") || "M0 0", fill: "sumi", opacity: .9 }, { t: "fill", d: scraps.join("") || "M0 0", fill: "paper", outline: lw * .5, outlineColor: "usuzumi" },
    { t: "stroke", d: splits.join("") || "M0 0", color: "sumi", width: lw * .8, opacity: .8 }];
}

/** One shoji panel: a thin wooden frame, white paper over a kumiko lattice, a board at the foot. */
function shojiPanel(x: number, w: number, ph: number, wall: Wall, i: number, warm = false): Prim[] {
  const lw = wall.lw, out: Prim[] = [], koshi = ph * .17, top = -ph, paperH = ph - koshi;
  // By day the paper glows white. At night it is grey-blue with the moonlight outside, or warm when the lamp is on
  // this side of it (a front shoji seen from outside).
  const paperFill: UkiyoeFill = wall.night <= .5 ? "gofun" : warm ? { type: "radial", stops: [[0, "gofun", 1], [1, "ki", 1]] } : { type: "linear", angle: 90, stops: [[0, "usuzumi", 1], [1, "sora", 1]] };
  out.push({ t: "fill", d: rectD(x, top, w, paperH), fill: paperFill });
  const rows = Math.max(4, Math.round(paperH / (w * .42)));
  out.push(...tears(x, w, top, paperH, 3, rows, wall.torn, wall.seed + i * 31, lw));
  const grid: string[] = [];
  for (let k = 1; k < 3; k++) grid.push(`M${f(x + w * k / 3)} ${f(top)}v${f(paperH)}`);
  for (let k = 1; k < rows; k++) grid.push(`M${f(x)} ${f(top + paperH * k / rows)}h${f(w)}`);
  out.push({ t: "stroke", d: grid.join(""), color: "cha", width: lw * .9 });
  out.push({ t: "fill", d: rectD(x, -koshi, w, koshi), fill: WOOD, grain: .7, outline: lw * .7 });
  out.push({ t: "stroke", d: rectD(x + lw, top + lw, w - lw * 2, ph - lw * 2), color: "cha", width: lw * 2 });
  return out;
}

/** A pair of sliding panels in one bay; the right one slides behind the left as the bay opens. */
function slidingBay(kind: "fusuma" | "shoji", x0: number, w: number, ph: number, wall: Wall, bay: number): Prim[] {
  const out: Prim[] = [...beyondFill(x0, w, ph, wall.beyond, wall.night, wall.seed + bay, wall.snow, wall.frame)], hw = w / 2, off = -slideOpen(wall, bay) * hw * .94;
  if (kind === "fusuma") {
    // The painting runs across both panels of the bay (and moves with the right one as it slides).
    const bw: Wall = { ...wall, seed: wall.seed + bay * 17 };
    out.push(...fusumaPanel(x0 + hw + off, hw, ph, bw, x0, w, off, `fus-${wall.seed}-${bay}-r`, false));
    out.push(...fusumaPanel(x0, hw, ph, bw, x0, w, 0, `fus-${wall.seed}-${bay}-l`, true));
  } else {
    out.push(...shojiPanel(x0 + hw + off, hw, ph, wall, bay * 2 + 1));
    out.push(...shojiPanel(x0, hw, ph, wall, bay * 2));
  }
  return out;
}

/** The hanging scroll's painting: a mountain in mist, a crane, or an autumn moon over grasses. */
function scrollPainting(style: string, x: number, y: number, w: number, h: number, lw: number): Prim[] {
  const cx = x + w / 2;
  if (style === "crane") {
    const body = smoothD([[cx - w * .25, y + h * .55], [cx, y + h * .45], [cx + w * .22, y + h * .5], [cx + w * .05, y + h * .6]], true, .5);
    return [{ t: "fill", d: body, fill: "gofun", outline: lw * .7 }, { t: "line", d: carvedLine([[cx - w * .2, y + h * .5], [cx - w * .28, y + h * .3], [cx - w * .22, y + h * .22]], lw * 1.2, { taper: "end" }), color: "sumi" },
      { t: "fill", d: ellipseD(cx - w * .22, y + h * .22, w * .03, w * .03), fill: "beni" }, { t: "stroke", d: seg([cx, y + h * .58], [cx - w * .04, y + h * .85]) + seg([cx + w * .04, y + h * .58], [cx + w * .06, y + h * .85]), color: "sumi", width: lw * .8 }];
  }
  if (style === "moon") {
    const grass: string[] = [];
    for (let k = 0; k < 7; k++) { const gx = x + w * (.1 + .12 * k); grass.push(carvedLine([[gx, y + h * .95], [gx + w * .05, y + h * .75], [gx + w * .12, y + h * (.6 + .05 * (k % 3))]], lw, { taper: "end" })); }
    return [{ t: "fill", d: ellipseD(cx + w * .12, y + h * .28, w * .16, w * .16), fill: "kin" }, { t: "line", d: grass.join(""), color: "usuzumi", opacity: .8 }];
  }
  const mtn = smoothD([[x + w * .05, y + h * .72], [cx - w * .1, y + h * .3], [cx, y + h * .26], [cx + w * .1, y + h * .3], [x + w * .95, y + h * .72]], false, .3) + `L${f(x + w * .95)} ${f(y + h * .78)}L${f(x + w * .05)} ${f(y + h * .78)}Z`;
  return [{ t: "fill", d: mtn, fill: { type: "linear", angle: 90, stops: [[0, "usuzumi", .8], [1, "paper", 0]] } },
    { t: "fill", d: smoothD([[cx - w * .07, y + h * .33], [cx, y + h * .27], [cx + w * .07, y + h * .33], [cx + w * .03, y + h * .36], [cx - w * .03, y + h * .35]], true, .4), fill: "gofun" },
    { t: "fill", d: ellipseD(cx, y + h * .62, w * .42, h * .04), fill: "paper", opacity: .85 }];
}

/** The tokonoma: a shallow raised alcove with a lacquered front edge, a natural post, a hanging scroll and a vase. */
function tokonoma(x0: number, w: number, ph: number, wall: Wall, depthX: number, depthY: number): Prim[] {
  const lw = wall.lw, out: Prim[] = [], step = ph * .07, otoshi = -ph * .84;
  // The alcove's back wall stands a little further back (up and right), its left inner side wall shows as a sliver.
  out.push({ t: "fill", d: rectD(x0, -ph, w, ph), fill: PLASTER, grain: .3 });
  out.push({ t: "fill", d: poly([[x0, -step], [x0 + depthX, -step - depthY], [x0 + depthX, otoshi - depthY], [x0, otoshi]]), fill: "kincha", opacity: .35 });
  // Alcove floor (a board seen from just above) and the black lacquered toko-gamachi under its front edge.
  out.push({ t: "fill", d: poly([[x0, -step], [x0 + w, -step], [x0 + w + depthX, -step - depthY], [x0 + depthX, -step - depthY]]), fill: DARKWOOD, grain: .6, outline: lw * .5 });
  out.push({ t: "fill", d: rectD(x0, -step, w, step), fill: LACQUER, outline: lw * .7 });
  // The otoshigake beam below the kamoi, with the small wall above it.
  out.push({ t: "fill", d: rectD(x0, -ph, w, ph + otoshi), fill: PLASTER, grain: .3 }, { t: "fill", d: rectD(x0, otoshi - ph * .03, w, ph * .03), fill: WOOD, outline: lw * .6 });
  // Hanging scroll (kakejiku): silk mount, gold bands above and below the painting, the roller at the foot, the cord.
  const sw = w * .32, sx = x0 + depthX + w * .5 - sw / 2, sy = otoshi - depthY + ph * .06, sh = ph * .58;
  out.push({ t: "stroke", d: `M${f(sx + sw * .5)} ${f(otoshi - depthY + ph * .01)}L${f(sx + sw * .2)} ${f(sy)}M${f(sx + sw * .5)} ${f(otoshi - depthY + ph * .01)}L${f(sx + sw * .8)} ${f(sy)}`, color: "sumi", width: lw * .6 });
  out.push({ t: "fill", d: rectD(sx, sy, sw, sh), fill: "asagi", outline: lw * .6, grain: .3 });
  out.push({ t: "fill", d: rectD(sx + sw * .1, sy + sh * .12, sw * .8, sh * .76), fill: "kin", outline: lw * .4 });
  const py = sy + sh * .16, pH = sh * .68;
  out.push({ t: "fill", d: rectD(sx + sw * .14, py, sw * .72, pH), fill: "paper", outline: lw * .4 });
  out.push(...scrollPainting(wall.scroll, sx + sw * .14, py, sw * .72, pH, lw));
  out.push({ t: "stroke", d: `M${f(sx + sw * .35)} ${f(sy)}v${f(sh * .3)}M${f(sx + sw * .65)} ${f(sy)}v${f(sh * .3)}`, color: "kincha", width: lw * 1.4 });
  out.push({ t: "fill", d: rectD(sx - sw * .08, sy + sh, sw * 1.16, sh * .035), fill: "sumi" });
  // Vase with a flowering plum branch on the alcove floor.
  if (wall.flower) {
    const vx = x0 + depthX * .5 + w * .78, vy = -step - depthY * .5, vh = ph * .16;
    out.push({ t: "fill", d: smoothD([[vx - vh * .14, vy], [vx - vh * .24, vy - vh * .45], [vx - vh * .08, vy - vh * .85], [vx - vh * .14, vy - vh], [vx + vh * .14, vy - vh], [vx + vh * .08, vy - vh * .85], [vx + vh * .24, vy - vh * .45], [vx + vh * .14, vy]], true, .35), fill: { type: "linear", angle: 0, stops: [[0, "matsu", 1], [.5, "asagi", 1], [1, "matsu", 1]] }, outline: lw * .7 });
    const br: Pt[] = [[vx, vy - vh], [vx - vh * .2, vy - vh * 1.6], [vx + vh * .3, vy - vh * 2.2], [vx + vh * .1, vy - vh * 2.8]];
    out.push({ t: "line", d: carvedLine(br, lw * 1.6, { taper: "end", seed: wall.seed }) + carvedLine([[vx - vh * .1, vy - vh * 1.3], [vx - vh * .6, vy - vh * 1.7], [vx - vh * .7, vy - vh * 2.1]], lw * 1.1, { taper: "end" }), color: "kogecha" });
    const bl: string[] = [];
    for (let k = 0; k < 9; k++) { const q = k % 2 ? br[1 + (k % 3)] : [vx - vh * (.3 + .1 * (k % 3)), vy - vh * (1.5 + .15 * k)] as Pt; bl.push(circleD(q[0] + vh * .1 * Math.sin(k * 2.3), q[1] + vh * .08 * Math.cos(k * 1.7), vh * .06)); }
    out.push({ t: "dots", d: bl.join(""), color: "sakura" }, { t: "dots", d: bl.slice(0, 4).join(""), color: "gofun", opacity: .6 });
  }
  return out;
}

/** Chigaidana: staggered shelves joined by a short post, a small cupboard above and one below. */
function tana(x0: number, w: number, ph: number, wall: Wall): Prim[] {
  const lw = wall.lw, out: Prim[] = [{ t: "fill", d: rectD(x0, -ph, w, ph), fill: PLASTER, grain: .3 }], dx = w * .06, dy = ph * .03;
  const box = (y: number, h: number) => {
    out.push({ t: "fill", d: rectD(x0, y - h, w, h), fill: WOOD, outline: lw * .7, grain: .4 });
    for (const k of [0, 1]) { const px = x0 + w * (.06 + .45 * k); out.push({ t: "fill", d: rectD(px, y - h * .85, w * .42, h * .7), fill: "kin", outline: lw * .6 }, { t: "fill", d: ellipseD(px + (k ? w * .05 : w * .37), y - h * .5, w * .012, h * .07), fill: "sumi" }); }
  };
  box(-ph * .78, ph * .2);
  box(0, ph * .19);
  const shelf = (a: number, b: number, y: number) => {
    out.push({ t: "fill", d: poly([[a, y], [b, y], [b + dx, y - dy], [a + dx, y - dy]]), fill: "kincha", outline: lw * .5 });
    out.push({ t: "fill", d: rectD(a, y, b - a, ph * .022), fill: LACQUER, outline: lw * .6 });
  };
  const yHi = -ph * .55, yLo = -ph * .43;
  shelf(x0, x0 + w * .58, yHi);
  shelf(x0 + w * .42, x0 + w, yLo);
  out.push({ t: "fill", d: rectD(x0 + w * .47, yHi, w * .03, yLo - yHi), fill: LACQUER });
  // Fude-gaeshi: the upturned lip on the higher shelf's free end.
  out.push({ t: "fill", d: smoothD([[x0 + w * .52, yHi], [x0 + w * .58, yHi], [x0 + w * .6, yHi - ph * .03], [x0 + w * .57, yHi - ph * .025]], true, .3), fill: "sumi" });
  // A lacquered writing box on the lower shelf, an incense burner on the higher one.
  out.push({ t: "fill", d: rectD(x0 + w * .64, yLo - ph * .05, w * .24, ph * .05), fill: LACQUER, outline: lw * .5 }, { t: "stroke", d: `M${f(x0 + w * .68)} ${f(yLo - ph * .03)}h${f(w * .16)}`, color: "kin", width: lw });
  out.push({ t: "fill", d: smoothD([[x0 + w * .12, yHi], [x0 + w * .1, yHi - ph * .04], [x0 + w * .16, yHi - ph * .065], [x0 + w * .22, yHi - ph * .04], [x0 + w * .2, yHi]], true, .4), fill: "usuzumi", outline: lw * .5 });
  return out;
}

/** Plaster with a round window: a wooden ring, a bamboo lattice, lit paper behind (Harunobu's parlour). */
function marumado(x0: number, w: number, ph: number, wall: Wall): Prim[] {
  const lw = wall.lw, r = Math.min(w, ph) * .36, cx = x0 + w / 2, cy = -ph * .56, d = ellipseD(cx, cy, r, r);
  const grid: string[] = [];
  for (let k = -3; k <= 3; k++) { const o = k * r * .27; grid.push(`M${f(cx + o)} ${f(cy - r)}v${f(2 * r)}M${f(cx - r)} ${f(cy + o)}h${f(2 * r)}`); }
  const vine: string[] = [];
  for (let k = 0; k < 3; k++) vine.push(smoothD([[cx - r, cy - r * .5 + k * r * .5], [cx - r * .3, cy - r * .7 + k * r * .5], [cx + r * .3, cy - r * .3 + k * r * .5], [cx + r, cy - r * .55 + k * r * .5]], false, .5));
  return [{ t: "fill", d: rectD(x0, -ph, w, ph), fill: "usuzumi", opacity: .55, grain: .3 }, { t: "fill", d: rectD(x0, -ph, w, ph), fill: PLASTER, opacity: .5 },
    { t: "fill", d, fill: wall.night > .5 ? "usuzumi" : "gofun" },
    { t: "clip", d, key: `maru-${wall.seed}-${f(x0)}`, prims: [{ t: "stroke", d: grid.join(""), color: "ki", width: lw * 2.2 }, { t: "stroke", d: vine.join(""), color: "sumi", width: lw * .8 }] },
    { t: "stroke", d, color: "kogecha", width: lw * 3 }];
}

function bay(kind: UkiyoeBayKind, x0: number, w: number, ph: number, wall: Wall, i: number, depthX: number, depthY: number): Prim[] {
  switch (kind) {
    case "fusuma": case "shoji": return slidingBay(kind, x0, w, ph, wall, i);
    case "tokonoma": return tokonoma(x0, w, ph, wall, depthX, depthY);
    case "tana": return tana(x0, w, ph, wall);
    case "marumado": return marumado(x0, w, ph, wall);
    case "open": return beyondFill(x0, w, ph, "dark", wall.night, wall.seed + i);
    case "garden": return beyondFill(x0, w, ph, "garden", wall.night, wall.seed + i, wall.snow, wall.frame);
    default: {
      const dots: string[] = [];
      for (let k = 0; k < 40; k++) dots.push(circleD(x0 + w * hash01(wall.seed, i * 50 + k, 71), -ph * hash01(wall.seed, i * 50 + k, 72), wall.lw * .5));
      return [{ t: "fill", d: rectD(x0, -ph, w, ph), fill: PLASTER, grain: .4 }, { t: "dots", d: dots.join(""), color: "cha", opacity: .35 }];
    }
  }
}

/** A run of bays along a wall (wall-local), with the kamoi rail, transom (ranma) and posts between the bays. */
function wallRun(kinds: readonly UkiyoeBayKind[], len: number, ph: number, above: number, wall: Wall, pw: number, depthX: number, depthY: number, first = 0): Prim[] {
  const out: Prim[] = [], bw = len / kinds.length, lw = wall.lw, beam = ph * .045;
  // Plaster above the rail up to the top of the wall, with an openwork transom over the sliding bays.
  out.push({ t: "fill", d: rectD(0, -ph - above, len, above), fill: PLASTER, grain: .3 });
  kinds.forEach((k, i) => {
    if (k !== "fusuma" && k !== "shoji") return;
    const x = i * bw + bw * .06, y = -ph - beam - above * .62, rw = bw * .88, rh = above * .5;
    out.push({ t: "fill", d: rectD(x, y, rw, rh), fill: WOOD, outline: lw * .6, grain: .5 });
    const holes: string[] = [];
    for (let c = 0; c < 4; c++) { const cx = x + rw * (.14 + .24 * c), cy = y + rh * (.5 + .12 * Math.sin(c * 1.9)); holes.push(smoothD([[cx - rw * .09, cy], [cx - rw * .04, cy - rh * .3], [cx + rw * .05, cy - rh * .22], [cx + rw * .1, cy + rh * .05], [cx + rw * .02, cy + rh * .28], [cx - rw * .06, cy + rh * .2]], true, .5)); }
    out.push({ t: "fill", d: holes.join(""), fill: "sumi", opacity: .85 });
  });
  kinds.forEach((k, i) => out.push(...bay(k, i * bw, bw, ph, wall, first + i, depthX, depthY)));
  // The kamoi rail over the bays and the sill under them.
  out.push({ t: "fill", d: rectD(0, -ph - beam, len, beam), fill: WOOD, outline: lw * .8, grain: .5 });
  out.push({ t: "fill", d: rectD(0, -ph * .012, len, ph * .012), fill: DARKWOOD });
  // Posts between bays (and at the wall's ends).
  for (let i = 0; i <= kinds.length; i++) {
    const x = i * bw;
    const natural = kinds[i] === "tana" && kinds[i - 1] === "tokonoma" || kinds[i - 1] === "tana" && kinds[i] === "tokonoma";
    out.push({ t: "fill", d: rectD(x - pw / 2, -ph - above, pw, ph + above), fill: natural ? { type: "linear", angle: 0, stops: [[0, "kincha", 1], [.4, "paper", 1], [1, "cha", 1]] } : WOOD, outline: lw * .8, grain: natural ? 1 : .6 });
    if (natural) out.push({ t: "stroke", d: smoothD([[x - pw * .1, -ph * .2], [x + pw * .15, -ph * .45], [x - pw * .05, -ph * .7]], false, .5), color: "cha", width: lw * .6 });
  }
  return out;
}

// ---- Floors ------------------------------------------------------------------------------------------------------------------------

/**
 * Tatami in columns of mats lying front to back, the joints staggered so four corners never meet (each column's
 * cross-joints sit between its neighbours'). Cloth borders (heri) run along the long sides; the woven rush shows as
 * fine lines across each mat, which also carries the recession.
 */
function tatami(W: number, D: number, sk: number, matW: number, color: UkiyoePaint, heri: UkiyoePaint, lw: number, u0 = 0): Prim[] {
  const fp = (u: number, v: number): Pt => [-W / 2 + u * W + v * sk, -v * D];
  const cols = Math.max(2, Math.round(W / matW)), out: Prim[] = [], mats: string[] = [], heriD: string[] = [], joints: string[] = [], rush: string[] = [];
  for (let c = 0; c < cols; c++) {
    const a = c / cols, b = (c + 1) / cols;
    if (b <= u0) continue;
    const ua = Math.max(a, u0), cuts = c % 2 ? [0, .25, .75, 1] : [0, .5, 1];
    mats.push(poly([fp(ua, 0), fp(b, 0), fp(b, 1), fp(ua, 1)]));
    const hw = (b - a) * .028;
    for (const e of [ua, b - hw]) if (e >= u0) heriD.push(poly([fp(e, 0), fp(e + hw, 0), fp(e + hw, 1), fp(e, 1)]));
    for (const v of cuts.slice(1, -1)) joints.push(seg(fp(ua, v), fp(b, v)));
    for (let v = .03; v < 1; v += .045) rush.push(seg(fp(ua + hw, v), fp(b - hw, v)));
  }
  out.push({ t: "fill", d: mats.join(""), fill: { type: "linear", angle: 90, stops: [[0, color, .82], [1, color, 1]] }, grain: .35 });
  out.push({ t: "stroke", d: rush.join(""), color: "kogecha", width: lw * .5, opacity: .16 });
  out.push({ t: "stroke", d: joints.join(""), color: "kogecha", width: lw * .9, opacity: .7 });
  out.push({ t: "fill", d: heriD.join(""), fill: heri, opacity: .85 });
  return out;
}

function boards(W: number, D: number, sk: number, lw: number, u0: number, u1: number, seed: number): Prim[] {
  const fp = (u: number, v: number): Pt => [-W / 2 + u * W + v * sk, -v * D];
  const lines: string[] = [], n = Math.round((u1 - u0) * W / (D * .32));
  for (let k = 1; k < n; k++) { const u = u0 + (u1 - u0) * k / n; lines.push(seg(fp(u, 0), fp(u, 1))); }
  for (let k = 0; k < n; k++) { const u = u0 + (u1 - u0) * (k + .5) / n, v = hash01(seed, k, 81); lines.push(seg(fp(u - .002, v), fp(u + .002, Math.min(1, v + .05)))); }
  return [{ t: "fill", d: poly([fp(u0, 0), fp(u1, 0), fp(u1, 1), fp(u0, 1)]), fill: { type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, "cha", 1]] }, grain: .9 },
    { t: "stroke", d: lines.join(""), color: "kogecha", width: lw * .8, opacity: .7 }];
}

function earth(W: number, D: number, sk: number, u1: number, drop: number, seed: number, lw: number): Prim[] {
  const fp = (u: number, v: number): Pt => [-W / 2 + u * W + v * sk, -v * D + drop];
  const dots: string[] = [];
  for (let k = 0; k < 160; k++) { const q = fp(hash01(seed, k, 91) * u1, hash01(seed, k, 92)); dots.push(circleD(q[0], q[1], lw * (.4 + .5 * hash01(seed, k, 93)))); }
  return [{ t: "fill", d: poly([fp(0, 0), fp(u1, 0), fp(u1, 1), fp(0, 1)]), fill: { type: "linear", angle: 90, stops: [[0, "usuzumi", .7], [1, "cha", .8]] }, grain: .5 },
    { t: "dots", d: dots.join(""), color: "kogecha", opacity: .4 }];
}

// ---- Motifs ------------------------------------------------------------------------------------------------------------------------

/**
 * A room with its front wall taken away. Params: width, height (the opening up to the front lintel), depth (the floor
 * seen in projection), skew, kind ("tatami" | "boards" | "farmhouse": an earthen doma on the left, raised boards on the
 * right), doma (its share of the width), tatami / heri colours, back (bay kinds), side (the left side wall's bay kind),
 * art ("bamboo" | "clouds" | "waves" | "pine" | "plain"), paper, scroll ("mountain" | "crane" | "moon"), flower,
 * beyond ("dark" | "garden": what slid panels show), slide (sliding panels), torn (0–1), night (0–1), veranda (px),
 * eave ("tile" | "thatch" | "none"), frontShoji ([left, right] closed panels at the front), part ("back" | "front" | "all").
 */
export function room(p: P, cx: InteriorContext): Prim[] {
  const W = num(p, "width", 1200), H = num(p, "height", 520), D = num(p, "depth", 170), skew = num(p, "skew", .6), sk = D * skew;
  const lw = Math.max(1, W * .0022), part = str(p, "part", "all"), night = clamp01(num(p, "night", 0)), seed = cx.seed;
  const floor = str(p, "kind", "tatami"), backRaw = Array.isArray(p.back) ? (p.back as unknown[]).filter((k): k is UkiyoeBayKind => UKIYOE_BAY_KINDS.includes(k as UkiyoeBayKind)) : [];
  const back: UkiyoeBayKind[] = backRaw.length ? backRaw : floor === "farmhouse" ? ["wall", "shoji", "shoji", "wall"] : ["fusuma", "fusuma", "tokonoma", "tana"];
  const wall: Wall = {
    lw, seed, frame: cx.frame, night, torn: clamp01(num(p, "torn", 0)), art: str(p, "art", "bamboo"), paper: paint(p, "paper", "gofun"),
    beyond: str(p, "beyond", "dark"), slides: Array.isArray(p.slide) ? p.slide as UkiyoeSlide[] : [], scroll: str(p, "scroll", "mountain"), flower: bool(p, "flower", true), snow: clamp01(num(p, "snow", 0)),
  };
  const pw = W * .018, ph = (H - D) * .8, above = H, E = num(p, "veranda", 0), ext = W * .05;
  const out: Prim[] = [], opening = rectD(-W / 2, -H, W, H);
  if (part !== "front") {
    const inner: Prim[] = [];
    // Floor.
    const doma = floor === "farmhouse" ? clamp(num(p, "doma", .4), .1, .8) : 0, drop = D * .18;
    if (floor === "boards") inner.push(...boards(W, D, sk, lw, 0, 1, seed));
    else if (floor === "farmhouse") inner.push(...earth(W, D, sk, doma, 0, seed, lw), ...boards(W, D, sk, lw, doma, 1, seed));
    else inner.push(...tatami(W, D, sk, H * .34, paint(p, "tatami", "kusa"), paint(p, "heri", "sumi"), lw));
    // The left side wall: a sheared run of bays receding from the front-left post to the back corner.
    const sideKind = str(p, "side", floor === "farmhouse" ? "wall" : "fusuma") as UkiyoeBayKind, sideLen = D * 1.6;
    const sideBase = floor === "farmhouse" ? drop : 0;
    inner.push({ t: "group", transform: `matrix(${(sk / sideLen).toFixed(4)} ${(-D / sideLen).toFixed(4)} 0 1 ${f(-W / 2)} ${f(sideBase)})`, prims: wallRun([UKIYOE_BAY_KINDS.includes(sideKind) ? sideKind : "wall"], sideLen, ph + D * .4, above, { ...wall, slides: [] }, pw * 1.2, 0, 0, 100) });
    inner.push({ t: "fill", d: poly([[-W / 2, sideBase], [-W / 2 + sk, -D], [-W / 2 + sk, -H], [-W / 2, -H]]), fill: "kogecha", opacity: .14 });
    // The back wall.
    inner.push({ t: "group", transform: `translate(${f(-W / 2 + sk)} ${f(-D)})`, prims: wallRun(back, W, ph, above, wall, pw, sk * .22, D * .22) });
    // A farmhouse's earthen floor lies a step below the boards; the step is a heavy beam (agari-kamachi).
    if (doma) {
      const a: Pt = [-W / 2 + doma * W, 0], b: Pt = [-W / 2 + doma * W + sk, -D];
      inner.push({ t: "fill", d: poly([a, b, [b[0], b[1] + drop], [a[0], a[1] + drop]]), fill: DARKWOOD, outline: lw, grain: .7 });
    }
    // Night: the room sinks into blue dark (lamps drawn after the room glow through it).
    if (night > 0) inner.push({ t: "fill", d: opening, fill: "yoru", opacity: .55 * night });
    out.push({ t: "clip", d: opening, key: `room-${seed}`, prims: inner });
    // The threshold (shiki) along the front edge.
    out.push({ t: "fill", d: rectD(-W / 2, 0, W, H * .018), fill: DARKWOOD, outline: lw * .8 });
    if (E > 0) {
      const vs = skew, vx = (y: number) => -E * vs * (y / E);
      out.push({ t: "fill", d: poly([[-W / 2 - ext, H * .018], [W / 2 + ext, H * .018], [W / 2 + ext + vx(E), E], [-W / 2 - ext + vx(E), E]]), fill: { type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, "ki", .75]] }, grain: .9 });
      const pl: string[] = [];
      for (let x = -W / 2 - ext + E * .4; x < W / 2 + ext; x += E * .45) pl.push(seg([x, H * .018], [x + vx(E), E]));
      out.push({ t: "stroke", d: pl.join(""), color: "cha", width: lw * .8, opacity: .8 });
      out.push({ t: "fill", d: rectD(-W / 2 - ext + vx(E), E, W + ext * 2, E * .12), fill: DARKWOOD, outline: lw });
      out.push({ t: "fill", d: rectD(-W / 2 - ext + vx(E), E * 1.12, W + ext * 2, E * .5), fill: "sumi", opacity: .85 });
      const posts: string[] = [];
      for (let x = -W / 2 - ext + vx(E) + W * .03; x < W / 2 + ext + vx(E); x += W * .16) posts.push(rectD(x, E * 1.12, W * .012, E * .48));
      out.push({ t: "fill", d: posts.join(""), fill: "cha", opacity: .9 });
    }
  }
  if (part !== "back") {
    // Front shoji closed at either side.
    const fs = Array.isArray(p.frontShoji) ? p.frontShoji as number[] : [num(p, "frontShoji", 0), 0], fpw = H * .3;
    for (let s = 0; s < 2; s++) for (let k = 0; k < clamp(Math.round(fs[s] ?? 0), 0, 6); k++) {
      const x = s === 0 ? -W / 2 + k * fpw : W / 2 - (k + 1) * fpw;
      out.push(...shojiPanel(x, fpw, H, { ...wall, torn: wall.torn * .5, night }, 200 + s * 10 + k, true));
    }
    // Front posts, the lintel and a strip of wall above it, then the eave.
    const top = H * .16;
    out.push({ t: "fill", d: rectD(-W / 2 - ext, -H - top, W + ext * 2, top), fill: PLASTER, outline: lw, grain: .4 });
    out.push({ t: "fill", d: rectD(-W / 2 - ext, -H - H * .04, W + ext * 2, H * .04), fill: WOOD, outline: lw, grain: .6 });
    for (const x of [-W / 2, W / 2]) out.push({ t: "fill", d: rectD(x - pw * .7, -H - top, pw * 1.4, H + top + H * .018), fill: WOOD, outline: lw, grain: .7 });
    const eave = str(p, "eave", "tile"), ey = -H - top;
    if (eave === "thatch") {
      const spikes: Pt[] = [[-W / 2 - ext * 2, ey - H * .02]];
      for (let x = -W / 2 - ext * 2; x <= W / 2 + ext * 2; x += W * .012) spikes.push([x, ey + H * (.012 + .02 * hash01(seed, Math.round(x), 95))], [x + W * .006, ey - H * .005]);
      spikes.push([W / 2 + ext * 2, ey - H * .02], [W / 2 + ext * 2, ey - H * .2], [-W / 2 - ext * 2, ey - H * .2]);
      out.push({ t: "fill", d: poly(spikes), fill: { type: "linear", angle: 90, stops: [[0, "kogecha", 1], [1, "tan", .85]] }, outline: lw, grain: .8 });
      out.push({ t: "stroke", d: Array.from({ length: 60 }, (_, i) => { const x = -W / 2 - ext * 2 + (W + ext * 4) * i / 60; return seg([x, ey - H * .18], [x - W * .004, ey]); }).join(""), color: "kogecha", width: lw * .7, opacity: .5 });
    } else if (eave === "tile") {
      out.push({ t: "fill", d: rectD(-W / 2 - ext * 2, ey - H * .14, W + ext * 4, H * .14), fill: { type: "linear", angle: 90, stops: [[0, "sumi", 1], [1, "usuzumi", 1]] }, outline: lw });
      const caps: string[] = [];
      for (let x = -W / 2 - ext * 2; x < W / 2 + ext * 2; x += H * .05) caps.push(ellipseD(x + H * .025, ey - H * .012, H * .022, H * .02));
      out.push({ t: "fill", d: caps.join(""), fill: "usuzumi", outline: lw * .6 });
    }
  }
  return out;
}

/** A standing paper lamp. Params: height, lit (0–1). Its light flickers a little. */
export function andon(p: P, cx: InteriorContext): Prim[] {
  const h = num(p, "height", 150), lit = clamp01(num(p, "lit", 1)), w = h * .34, sx = w * .34, sy = w * .26, lw = Math.max(.8, h * .008);
  const flick = lit * (.88 + .07 * Math.sin(cx.frame * .9 + cx.seed) + .05 * noise1(cx.seed, cx.frame * .3));
  const out: Prim[] = [];
  if (lit > 0) out.push({ t: "glow", cx: w * .2, cy: -h * .58, r: h * 2.4, color: "ki", opacity: .5 * flick }, { t: "glow", cx: w * .2, cy: -h * .58, r: h * .9, color: "gofun", opacity: .45 * flick });
  // Base board, legs and the oil-dish shelf.
  out.push({ t: "fill", d: poly([[-w * .62, 0], [w * .62, 0], [w * .62 + sx, -sy], [-w * .62 + sx, -sy]]), fill: DARKWOOD, outline: lw });
  out.push({ t: "fill", d: rectD(-w * .62, 0, w * 1.24, h * .04), fill: LACQUER, outline: lw });
  const legs = [[-w / 2, 0], [w / 2, 0], [w / 2 + sx, -sy]] as Pt[];
  out.push({ t: "stroke", d: legs.map(q => seg(q, [q[0], -h * .28 + (q[1] ? -sy : 0)])).join(""), color: "kogecha", width: lw * 2.2 });
  // The paper box: front face and the right side face receding.
  const y0 = -h * .28, y1 = -h * .92, paperFill: UkiyoeFill = lit > 0 ? { type: "radial", stops: [[0, "gofun", 1], [.6, "ki", .9 * flick + .1], [1, "kincha", 1]] } : "paper";
  out.push({ t: "fill", d: poly([[w / 2, y0], [w / 2 + sx, y0 - sy], [w / 2 + sx, y1 - sy], [w / 2, y1]]), fill: lit > 0 ? { type: "linear", angle: 0, stops: [[0, "ki", .9], [1, "kincha", 1]] } : "kincha", outline: lw, opacity: lit > 0 ? .95 : 1 });
  out.push({ t: "fill", d: rectD(-w / 2, y1, w, y0 - y1), fill: paperFill, outline: lw });
  // The dish and wick seen through the paper, and the frame's crossbars as shadows.
  out.push({ t: "fill", d: ellipseD(w * .05, -h * .5, w * .22, h * .02), fill: "kogecha", opacity: .45 });
  if (lit > 0) out.push({ t: "fill", d: smoothD([[w * .05, -h * .52], [w * .1, -h * .58], [w * .05, -h * .66], [0, -h * .58]], true, .5), fill: "gofun", opacity: .8 * flick });
  out.push({ t: "stroke", d: [1, 2].map(k => `M${f(-w / 2)} ${f(y0 + (y1 - y0) * k / 3)}h${f(w)}l${f(sx)} ${f(-sy)}`).join("") + `M0 ${f(y0)}V${f(y1)}`, color: "kogecha", width: lw * .9, opacity: .7 });
  out.push({ t: "stroke", d: `M${f(-w / 2)} ${f(y1)}h${f(w)}l${f(sx)} ${f(-sy)}h${f(-w)}Z`, color: "kogecha", width: lw * 2 });
  // The handle: an upright either side and the bar across.
  out.push({ t: "stroke", d: `M${f(-w * .2 + sx * .5)} ${f(y1 - sy * .5)}v${f(-h * .1)}h${f(w * .4)}v${f(h * .1)}`, color: "kogecha", width: lw * 1.8 });
  return out;
}

/**
 * The irori, a square hearth sunk in the floor. Params: size (front edge), depth (in projection), skew, fire (0–1),
 * pot ("kettle" | "pot" | "none"), hook (the jizai-kagi's height above the floor), steam (0–1).
 */
export function irori(p: P, cx: InteriorContext): Prim[] {
  const S = num(p, "size", 240), d = num(p, "depth", S * .3), sk = d * num(p, "skew", .6), fire = clamp01(num(p, "fire", 1)), lw = Math.max(1, S * .006);
  const hookTop = -num(p, "hook", S * 2.6), pot = str(p, "pot", "kettle"), steam = clamp01(num(p, "steam", 1)), F = cx.frame, seed = cx.seed;
  const fp = (u: number, v: number): Pt => [-S / 2 + u * S + v * sk, -v * d];
  const out: Prim[] = [];
  if (fire > 0) out.push({ t: "glow", cx: sk / 2, cy: -d * .5 - S * .1, r: S * 1.6, color: "tan", opacity: .35 * fire });
  // The frame (robuchi), then the sunken ash bed inside it with the far inner wall showing.
  out.push({ t: "fill", d: poly([fp(-.08, -.25), fp(1.08, -.25), fp(1.08, 1.25), fp(-.08, 1.25)]), fill: DARKWOOD, outline: lw, grain: .8 });
  const ia = fp(0, 0), ib = fp(1, 0), ic = fp(1, 1), id = fp(0, 1), sunk = d * .16;
  out.push({ t: "fill", d: poly([id, ic, [ic[0], ic[1] + sunk], [id[0], id[1] + sunk]]), fill: "kogecha" });
  out.push({ t: "fill", d: poly([[id[0], id[1] + sunk], [ic[0], ic[1] + sunk], [ib[0], ib[1]], [ia[0], ia[1]]]), fill: { type: "linear", angle: 90, stops: [[0, "usuzumi", 1], [1, "paper", .9]] }, grain: .4 });
  // Firewood: three sticks laid in to the centre, their ends charred and glowing.
  const c = fp(.5, .5);
  const logs: [Pt, Pt][] = [[fp(.1, .25), c], [fp(.92, .35), c], [fp(.4, .95), c]];
  for (const [a, b] of logs) {
    const m: Pt = [lerp(a[0], b[0], .82), lerp(a[1], b[1], .82)];
    out.push({ t: "line", d: carvedLine([a, m], S * .045, { taper: "none" }), color: "cha" }, { t: "line", d: carvedLine([[lerp(a[0], b[0], .6), lerp(a[1], b[1], .6)], m], S * .045, { taper: "none" }), color: "sumi" });
  }
  if (fire > 0) {
    // Flames as the prints draw them: tongues of vermilion with yellow hearts and a key line, each rising to a tip
    // that hooks over sideways, the middle one tallest, every one flickering on its own.
    const tongues: string[] = [], inner: string[] = [];
    for (let k = 0; k < 5; k++) {
      const o = k - 2, x = c[0] + o * S * .045, tall = 1 - Math.abs(o) * .22;
      const h = S * (.15 + .06 * noise1(seed + k, F * .23)) * tall * fire, sway = S * .03 * noise1(seed + k + 9, F * .31), wid = S * (.035 + .01 * tall), curl = (k % 2 ? 1 : -1) * wid;
      const base = c[1] + S * .01;
      tongues.push(smoothD([[x - wid, base], [x - wid * .8, base - h * .35], [x - wid * .25 + sway * .5, base - h * .68], [x + sway, base - h], [x + sway + curl * .7, base - h * .84], [x + wid * .3 + sway * .4, base - h * .6], [x + wid * .75, base - h * .3], [x + wid, base]], true, .4));
      inner.push(smoothD([[x - wid * .45, base], [x - wid * .2 + sway * .3, base - h * .4], [x + sway * .6, base - h * .62], [x + wid * .3, base - h * .32], [x + wid * .45, base]], true, .45));
    }
    out.push({ t: "fill", d: tongues.join(""), fill: "shu", opacity: .95, union: true, outline: lw * .9, outlineColor: "kogecha" }, { t: "fill", d: inner.join(""), fill: "ki", opacity: .95, union: true });
    const em: string[] = [];
    for (let k = 0; k < 10; k++) { const q = fp(.32 + .36 * hash01(seed, k, 1), .32 + .36 * hash01(seed, k, 2)); em.push(circleD(q[0], q[1], S * .008)); }
    out.push({ t: "dots", d: em.join(""), color: "tan", opacity: .6 + .4 * Math.abs(Math.sin(F * .2)) });
  }
  // The near frame edge drawn over the bed's front.
  out.push({ t: "fill", d: poly([fp(-.08, -.25), fp(1.08, -.25), fp(1.08, 0), fp(-.08, 0)]), fill: DARKWOOD, outline: lw, grain: .8 });
  // The jizai-kagi: a bamboo tube hanging from the beam above, the fish-shaped crosspiece, the hook and the pot.
  if (pot !== "none") {
    const hx = c[0], potY = c[1] - S * .42;
    out.push({ t: "line", d: carvedLine([[hx, hookTop], [hx, potY - S * .3]], S * .035, { taper: "none" }), color: "kincha" });
    out.push({ t: "stroke", d: [.15, .35, .55, .75].map(k => `M${f(hx - S * .018)} ${f(lerp(hookTop, potY - S * .3, k))}h${f(S * .036)}`).join(""), color: "cha", width: lw });
    const fy = lerp(hookTop, potY, .35), fl = S * .26;
    out.push({ t: "fill", d: smoothD([[hx - fl * .5, fy], [hx - fl * .2, fy - fl * .16], [hx + fl * .25, fy - fl * .1], [hx + fl * .5, fy - fl * .2], [hx + fl * .44, fy], [hx + fl * .5, fy + fl * .18], [hx + fl * .25, fy + fl * .1], [hx - fl * .2, fy + fl * .14]], true, .4), fill: DARKWOOD, outline: lw, grain: .6 });
    out.push({ t: "fill", d: circleD(hx - fl * .33, fy - fl * .02, fl * .03), fill: "gofun" });
    out.push({ t: "stroke", d: `M${f(hx)} ${f(potY - S * .3)}v${f(S * .12)}q${f(S * .04)} ${f(S * .04)} 0 ${f(S * .06)}`, color: "sumi", width: lw * 1.6 });
    if (pot === "kettle") {
      out.push({ t: "stroke", d: smoothD([[hx - S * .12, potY - S * .08], [hx, potY - S * .2], [hx + S * .12, potY - S * .08]], false, .5), color: "sumi", width: lw * 2 });
      out.push({ t: "fill", d: smoothD([[hx - S * .15, potY], [hx - S * .14, potY - S * .1], [hx, potY - S * .13], [hx + S * .14, potY - S * .1], [hx + S * .15, potY], [hx + S * .1, potY + S * .08], [hx - S * .1, potY + S * .08]], true, .4), fill: { type: "linear", angle: 0, stops: [[0, "sumi", 1], [.6, "usuzumi", 1], [1, "sumi", 1]] }, outline: lw });
      const bumps: string[] = [];
      for (let r = 0; r < 2; r++) for (let k = 0; k < 7; k++) bumps.push(circleD(hx - S * .12 + k * S * .04, potY - S * .07 + r * S * .04, S * .009));
      out.push({ t: "dots", d: bumps.join(""), color: "gofun", opacity: .3 });
      out.push({ t: "fill", d: poly([[hx + S * .13, potY - S * .02], [hx + S * .24, potY - S * .1], [hx + S * .25, potY - S * .08], [hx + S * .14, potY + S * .03]]), fill: "sumi" });
    } else {
      out.push({ t: "fill", d: smoothD([[hx - S * .2, potY - S * .06], [hx + S * .2, potY - S * .06], [hx + S * .17, potY + S * .08], [hx - S * .17, potY + S * .08]], true, .3), fill: "sumi", outline: lw });
      out.push({ t: "fill", d: ellipseD(hx, potY - S * .07, S * .19, S * .03), fill: "cha", outline: lw });
      out.push({ t: "stroke", d: smoothD([[hx - S * .2, potY - S * .06], [hx, potY - S * .22], [hx + S * .2, potY - S * .06]], false, .5), color: "sumi", width: lw * 1.6 });
    }
    if (steam > 0) {
      // Steam: three wisps rising from the spout (or lid), curling and fading as they climb, on a slow loop.
      const sx0 = pot === "kettle" ? hx + S * .25 : hx, sy0 = pot === "kettle" ? potY - S * .1 : potY - S * .1, wisps: Prim[] = [];
      for (let k = 0; k < 3; k++) {
        const u = ((F / 70 + k / 3) % 1), rise = S * .9 * u, pts: Pt[] = [];
        for (let j = 0; j <= 6; j++) { const v = j / 6; pts.push([sx0 + S * .1 * Math.sin(v * 5 + F * .06 + k * 2) * v + S * .1 * u, sy0 - rise * v - S * .05 * j / 6]); }
        wisps.push({ t: "line", d: carvedLine(pts, S * .03 * (1 - u * .5), { taper: "both" }), color: "gofun", opacity: steam * .6 * Math.sin(Math.PI * u) });
      }
      out.push(...wisps);
    }
  }
  return out;
}

/**
 * Bedding laid on the floor. `layer: "under"` draws the mattress (shikibuton) and the pillow at the left end; `layer:
 * "over"` the quilted cover (kakebuton) with its dark velvet collar, rising over a sleeper (`sleeper: true`). Draw the
 * under-layer before a sleeping figure and the cover after it. Params: length, depth, skew, cover, pattern, layer.
 */
export function futon(p: P): Prim[] {
  const L = num(p, "length", 320), d = num(p, "depth", L * .2), sk = d * num(p, "skew", .6), t = L * .035, lw = Math.max(1, L * .004);
  const layer = str(p, "layer", "both"), sleeper = bool(p, "sleeper", true), cover = paint(p, "cover", "ai"), patC = paint(p, "pattern", "gofun");
  const fp = (u: number, v: number, h = 0): Pt => [-L / 2 + u * L + v * sk, -v * d - h];
  const out: Prim[] = [];
  if (layer !== "over") {
    // Mattress: its top face, then the thick front edge.
    out.push({ t: "fill", d: poly([fp(0, 0, t), fp(1, 0, t), fp(1, 1, t), fp(0, 1, t)]), fill: { type: "linear", angle: 90, stops: [[0, "gofun", 1], [1, "paper", 1]] }, outline: lw });
    out.push({ t: "fill", d: smoothD([fp(0, 0, t), fp(1, 0, t), [fp(1, 0)[0] + t * .2, 0], [fp(0, 0)[0] - t * .2, 0]], true, .15), fill: "paper", outline: lw });
    out.push({ t: "stroke", d: seg(fp(.02, 0, t * .5), fp(.98, 0, t * .5)), color: "beni", width: lw * 1.4, opacity: .7 });
    // The pillow (makura): a small lacquered box with a cushion and a paper wrap on top.
    const m = fp(.08, .5, t), mw = L * .1, mh = L * .05;
    out.push({ t: "fill", d: rectD(m[0] - mw / 2, m[1] - mh, mw, mh), fill: LACQUER, outline: lw });
    out.push({ t: "fill", d: smoothD([[m[0] - mw * .55, m[1] - mh], [m[0] - mw * .45, m[1] - mh * 1.7], [m[0] + mw * .45, m[1] - mh * 1.7], [m[0] + mw * .55, m[1] - mh]], true, .4), fill: "beni", outline: lw });
    out.push({ t: "fill", d: rectD(m[0] - mw * .4, m[1] - mh * 1.72, mw * .8, mh * .25), fill: "gofun", outline: lw * .6 });
  }
  if (layer !== "under") {
    // Cover (kakebuton): a thick quilt from below the sleeper's shoulders to past the feet, a mound along the body,
    // its front edge falling to the floor in soft folds; the dark velvet collar band across the head end.
    const u0 = .2, u1 = 1.03, q = L * .03, bump = sleeper ? L * .1 : 0, H0 = t + q;
    const b = (u: number) => Math.sin(Math.PI * clamp01((u - u0 - .02) / (u1 - u0 - .1))) ** .7;
    const top = poly([fp(u0, -.04, H0), fp(u1, -.04, H0), fp(u1, 1.04, H0), fp(u0, 1.04, H0)]);
    const up: Pt[] = [], lo: Pt[] = [];
    for (let i = 0; i <= 12; i++) { const u = lerp(u0 + .02, u1 - .04, i / 12); up.push(fp(u, .45, H0 + bump * b(u))); lo.push(fp(u, .45, H0)); }
    const hump = bump > 0 ? smoothD([...up, ...lo.reverse()], true, .3) : "";
    const fl: Pt[] = [];
    for (let i = 0; i <= 8; i++) { const u = lerp(u1, u0, i / 8); fl.push([fp(u, -.04)[0] + (i % 2 ? L * .006 : 0), L * (i % 2 ? .006 : -.002)]); }
    const front = smoothD([fp(u0, -.04, H0), fp(u1, -.04, H0), ...fl], true, .2);
    const pat = { type: "kikko" as const, color: patC, scale: L * .0016, opacity: .5 };
    out.push({ t: "fill", d: front, fill: cover, outline: lw * 1.2, pattern: pat }, { t: "fill", d: front, fill: "sumi", opacity: .22 });
    out.push({ t: "fill", d: top, fill: cover, outline: lw * 1.2, pattern: pat, grain: .3 });
    if (hump) out.push({ t: "fill", d: hump, fill: cover, pattern: pat, grain: .3 }, { t: "fill", d: hump, fill: "gofun", opacity: .08 }, { t: "stroke", d: smoothD(up, false, .3), color: "sumi", width: lw * 1.2 });
    out.push({ t: "stroke", d: smoothD(fl, false, .2), color: patC, width: lw * 1.4, opacity: .6 });
    out.push({ t: "fill", d: poly([fp(u0, -.04, H0), fp(u0 + .045, -.04, H0), fp(u0 + .045, 1.04, H0), fp(u0, 1.04, H0)]) + poly([fp(u0, -.04, H0), fp(u0 + .045, -.04, H0), fp(u0 + .045, -.04, 0), fp(u0, -.04, 0)]), fill: "sumi", outline: lw });
  }
  return out;
}

/** The weaving cycle shared by the loom and the figure's `weave` action (frames): pass the shuttle, beat, change shed. */
export const UKIYOE_WEAVE_PERIOD = 44;
/** Where the weave cycle is at `frame`: `beat` 0→1→0 as the beater is pulled to the cloth, `pass` while the shuttle
 * crosses, `shed` ±1 the open shed's sign (it flips each pick), `pick` the pick count. */
export function weaveBeat(frame: number): { beat: number; pass: number; shed: number; pick: number; u: number } {
  const P = UKIYOE_WEAVE_PERIOD, pick = Math.floor(frame / P), u = (frame - pick * P) / P;
  const pass = u < .38 ? Math.sin(Math.PI * u / .38) : 0;
  const beat = u < .38 ? 0 : u < .5 ? smooth((u - .38) / .12) : u < .66 ? 1 - smooth((u - .5) / .16) : 0;
  const sign = pick % 2 ? 1 : -1, change = smooth((u - .7) / .25);
  return { beat, pass, shed: sign * (1 - 2 * change), pick, u };
}

/** How far (× loom height) the beater swings from rest to the fell. */
export const LOOM_BEATER_PULL = .07;
const LOOM_BEAM_X = .05, LOOM_FELL_X = .2;
/** The beater's top bar at rest on the near side, relative to the loom's base centre: where a weaver's hand holds it. */
export function loomGrip(h: number, skew = .6): Pt {
  void skew;
  const Lm = h * 1.5, beamY = h * .26, fellX = h * LOOM_FELL_X;
  return [-Lm / 2 + fellX + LOOM_BEATER_PULL * h, -(beamY + h * .1)];
}

/**
 * A treadle loom (takahata) in oblique view, the weaver's end at the left: the cloth beam over her lap, the warp running
 * away to the back beam, two heddles hanging from the overhead arm, the swinging beater with its reed, and the woven
 * cloth growing on the beam. Params: height, cloth (colour), warp (colour), progress (0–1), skew.
 */
export function loom(p: P, cx: InteriorContext): Prim[] {
  const h = num(p, "height", 280), Lm = h * 1.5, lw = Math.max(1, h * .006), cloth = paint(p, "cloth", "gofun"), warp = paint(p, "warp", "paper");
  const wd = h * .2, ws = wd * num(p, "skew", .6) * .8, progress = clamp01(num(p, "progress", .3));
  const { beat, pass, shed } = weaveBeat(cx.frame);
  // Loom coordinates: x along the loom (0 at the weaver's end), z across (0 near, 1 far), y height above the floor.
  const X = (x: number, z: number, y: number): Pt => [-Lm / 2 + x + z * ws, -y - z * wd * .55];
  const out: Prim[] = [];
  const beamX = h * LOOM_BEAM_X, beamY = h * .26, fellX = h * LOOM_FELL_X, heddleX = h * .72, backX = Lm - h * .08, backY = h * .4, open = h * .05 * Math.abs(shed);
  // Timbers are pale wood blocks with a key line (Utamaro's loom), the far ones a shade darker.
  const timber = (a: Pt, b2: Pt, wdt: number, far: boolean): Prim => ({ t: "fill", d: carvedLine([a, b2], wdt, { taper: "none" }), fill: far ? "kincha" : { type: "linear", angle: 0, stops: [[0, "kincha", 1], [.5, "paper", 1], [1, "kincha", 1]] }, outline: lw * .8, grain: .6 });
  const post = (x: number, z: number, y0: number, y1: number, wdt = 1) => timber(X(x, z, y0), X(x, z, y1), h * .045 * wdt, z > .5);
  const rail = (x0: number, x1: number, z: number, y: number, wdt = 1) => timber(X(x0, z, y), X(x1, z, y), h * .04 * wdt, z > .5);
  const edge = (prims: Prim[]) => out.push(...prims);
  // Far side frame.
  edge([rail(0, Lm, 1, h * .04), post(h * .06, 1, 0, beamY + h * .05), post(heddleX - h * .1, 1, 0, h), post(backX, 1, 0, backY + h * .05), rail(heddleX - h * .1, backX, 1, h * .5, .8)]);
  // The warp: from the cloth's fell to the heddles in two sheets (the shed), then together to the back beam.
  out.push({ t: "fill", d: poly([X(fellX, 0, beamY + h * .01), X(heddleX, 0, backY - h * .02), X(backX, 0, backY), X(backX, 1, backY), X(heddleX, 1, backY - h * .02), X(fellX, 1, beamY + h * .01)]), fill: warp, opacity: .35 });
  const warpLines: string[] = [], n = 22;
  for (let i = 0; i <= n; i++) {
    const z = i / n, up = i % 2 ? shed : -shed, hy = backY - h * .02 + up * open * .5;
    warpLines.push(seg(X(fellX, z, beamY + h * .01), X(heddleX, z, hy)) + `L${f(X(backX, z, backY)[0])} ${f(X(backX, z, backY)[1])}`);
  }
  out.push({ t: "stroke", d: warpLines.join(""), color: warp, width: lw * .8, opacity: .95 });
  // Woven cloth: from the fell to the cloth beam, with weft lines; the roll on the beam thickens with progress.
  out.push({ t: "fill", d: poly([X(beamX, 0, beamY), X(fellX, 0, beamY + h * .01), X(fellX, 1, beamY + h * .01), X(beamX, 1, beamY)]), fill: cloth, outline: lw * .6, grain: .2 });
  const weft: string[] = [];
  for (let k = 1; k < 9; k++) { const x = lerp(beamX, fellX, k / 9); weft.push(seg(X(x, 0, beamY), X(x, 1, beamY))); }
  out.push({ t: "stroke", d: weft.join(""), color: "usuzumi", width: lw * .5, opacity: .3 });
  // Heddles: two frames on cords from the overhead arm, one up and one down as the shed opens.
  for (const s of [-1, 1]) {
    const hx = heddleX + s * h * .025, dy = s * shed * open * .5, y0 = backY - h * .12 + dy, y1 = backY + h * .12 + dy;
    out.push({ t: "stroke", d: poly([X(hx, 0, y0), X(hx, 1, y0), X(hx, 1, y1), X(hx, 0, y1)]), color: "cha", width: lw * 1.4 });
    out.push({ t: "stroke", d: seg(X(hx, .5, y1), X(hx, .5, h * .92)), color: "sumi", width: lw * .7 });
  }
  // Overhead arm reaching toward the weaver from the tall post.
  out.push(rail(h * .3, heddleX + h * .05, .5, h * .95, .8));
  // The beater swings on cords from the arm: back toward the heddles, pulled to the fell on the beat.
  const bx = lerp(fellX + LOOM_BEATER_PULL * h, fellX + h * .01, beat), pivot = X(lerp(fellX, heddleX, .55), .5, h * .95);
  out.push({ t: "stroke", d: seg(pivot, X(bx, .5, beamY + h * .08)), color: "sumi", width: lw * .7 });
  out.push({ t: "fill", d: poly([X(bx - h * .012, 0, beamY - h * .02), X(bx + h * .012, 0, beamY - h * .02), X(bx + h * .012, 0, beamY + h * .1), X(bx - h * .012, 0, beamY + h * .1)]), fill: "kincha", outline: lw * .6 });
  out.push({ t: "fill", d: poly([X(bx, 0, beamY + h * .1), X(bx, 1, beamY + h * .1), X(bx, 1, beamY + h * .07), X(bx, 0, beamY + h * .07)]), fill: "cha", outline: lw * .6 });
  out.push({ t: "stroke", d: Array.from({ length: 12 }, (_, i) => seg(X(bx, i / 11, beamY + h * .07), X(bx, i / 11, beamY - h * .01))).join(""), color: "kogecha", width: lw * .5, opacity: .8 });
  // Shuttle crossing in the shed while it is open.
  if (pass > 0) {
    const z = clamp01(pass < 1 ? (cx.frame % UKIYOE_WEAVE_PERIOD) / (UKIYOE_WEAVE_PERIOD * .38) : 1), q = X(lerp(bx, heddleX, .3), z, beamY + h * .03);
    out.push({ t: "fill", d: smoothD([[q[0] - h * .05, q[1]], [q[0], q[1] - h * .018], [q[0] + h * .05, q[1]], [q[0], q[1] + h * .015]], true, .4), fill: "kogecha", outline: lw * .6 });
  }
  // Cloth beam with the roll of finished cloth, and the near side frame.
  // The cloth beam: a cylinder across the loom with the finished cloth wound on it (thicker as the work grows), its
  // wooden ends showing past the cloth.
  const rr = h * (.022 + .022 * progress), r0 = X(beamX, -.08, beamY - rr * .4), r1 = X(beamX, 1.08, beamY - rr * .4), c0 = X(beamX, .02, beamY - rr * .4), c1 = X(beamX, .98, beamY - rr * .4);
  out.push({ t: "fill", d: carvedLine([r0, r1], h * .026, { taper: "none" }), fill: "kincha", outline: lw * .8 });
  out.push({ t: "fill", d: carvedLine([c0, c1], rr * 2, { taper: "none" }), fill: cloth, outline: lw * .8 });
  out.push({ t: "stroke", d: [.3, .6].map(k => seg(X(beamX, .02, beamY - rr * .4 - rr * (k - .45) * 2), X(beamX, .98, beamY - rr * .4 - rr * (k - .45) * 2))).join(""), color: "usuzumi", width: lw * .5, opacity: .4 });
  edge([rail(0, Lm, 0, h * .04), post(h * .06, 0, 0, beamY + h * .05), post(heddleX - h * .1, 0, 0, h), post(backX, 0, 0, backY + h * .05), rail(heddleX - h * .1, backX, 0, h * .5, .8), post(h * .3, .5, h * .9, h * .98, .6)]);
  // The treadles under the warp.
  out.push({ t: "stroke", d: [.3, .6].map(z => seg(X(fellX, z, h * .02), X(heddleX + h * .1, z, h * .08))).join(""), color: "cha", width: lw * 2 });
  return out;
}

/**
 * A folding screen (byōbu) standing in zigzag on the floor: gold leaf in squares, gold-cloud bands and a pine or waves
 * painted across the panels, each panel's face lit or shaded by its angle. Params: panels, height, art ("pine" |
 * "waves" | "clouds"), skew.
 */
export function byobu(p: P, cx: InteriorContext): Prim[] {
  const n = clamp(Math.round(num(p, "panels", 6)), 2, 8), h = num(p, "height", 220), pw = h * .36, zz = pw * .32, lw = Math.max(1, h * .006);
  const art = str(p, "art", "pine"), total = n * pw, out: Prim[] = [];
  // Flat artwork across the whole screen (x 0..total, y 0..-h), then each panel shows its slice, sheared to its angle.
  const flat: Prim[] = [{ t: "fill", d: rectD(0, -h, total, h), fill: { type: "linear", angle: 90, stops: [[0, "kin", 1], [1, "ki", 1]] } }];
  const leaf: string[] = [];
  for (let x = 0; x < total; x += h * .1) leaf.push(`M${f(x)} ${f(-h)}v${f(h)}`);
  for (let y = 0; y < h; y += h * .1) leaf.push(`M0 ${f(-y)}h${f(total)}`);
  flat.push({ t: "stroke", d: leaf.join(""), color: "kincha", width: lw * .5, opacity: .35 });
  if (art === "waves") flat.push({ t: "fill", d: rectD(0, -h * .4, total, h * .4), fill: "ai", pattern: { type: "nami", color: "gofun", scale: h * .004, opacity: .7 }, opacity: .9 });
  else if (art === "pine") {
    flat.push({ t: "line", d: carvedLine([[total * .2, 0], [total * .28, -h * .4], [total * .22, -h * .62], [total * .5, -h * .78], [total * .72, -h * .72]], h * .07, { taper: "end", seed: cx.seed }), color: "kogecha" });
    const pads: string[] = [];
    for (let i = 0; i < 7; i++) { const q: Pt = [total * (.18 + .09 * i), -h * (.55 + .12 * Math.sin(i * 1.7))]; pads.push(ellipseD(q[0], q[1], h * .16, h * .06)); }
    flat.push({ t: "fill", d: pads.join(""), fill: "matsu", union: true, outline: lw * .6 });
  }
  flat.push(...cloudArt(0, total, h, cx.seed));
  for (let i = 0; i < n; i++) {
    const up = i % 2 === 0, x0 = -total / 2 + i * pw, dy0 = up ? 0 : -zz, dy1 = up ? -zz : 0;
    // matrix maps flat (x, y) in this panel's slice to the panel's sheared quad.
    const m = `matrix(1 ${((dy1 - dy0) / pw).toFixed(4)} 0 1 ${f(x0 - i * pw)} ${f(dy0 - (dy1 - dy0) / pw * i * pw)})`;
    const quad = poly([[x0, dy0], [x0 + pw, dy1], [x0 + pw, dy1 - h], [x0, dy0 - h]]);
    out.push({ t: "clip", d: quad, key: `byobu-${cx.seed}-${i}`, prims: [{ t: "group", transform: m, prims: flat }, { t: "fill", d: quad, fill: up ? "gofun" : "sumi", opacity: up ? .08 : .2 }] });
    out.push({ t: "stroke", d: quad, color: "sumi", width: lw * 2.4 });
  }
  return out;
}

export const INTERIOR_MOTIFS = { room, andon, irori, futon, loom, byobu };
/** The interior motifs that change with the frame. */
export const ANIMATED_INTERIOR = ["room", "andon", "irori", "loom"] as const;

// ---- Scene recipes -----------------------------------------------------------------------------------------------------------------

/** The four rooms `interiorScene` builds. */
export type UkiyoeInteriorKind = "inn" | "weaver" | "hearth" | "bedroom";
export const UKIYOE_INTERIOR_KINDS: readonly UkiyoeInteriorKind[] = ["inn", "weaver", "hearth", "bedroom"];

const LOOKS: Readonly<Record<string, UkiyoeFigureLook>> = {
  traveller: { hair: "chonmage", robe: "ai", robePattern: { type: "kanoko", color: "gofun", scale: .6 }, obi: "cha", lower: "robe", feet: "bare", build: "average" },
  guest: { hair: "chonmage", robe: "cha", obi: "kogecha", coat: "kogecha", lower: "robe", feet: "bare", build: "stout", prop: "pipe" },
  maid: { hair: "shimada", robe: "asagi", robePattern: { type: "shima", color: "ai", scale: .5 }, obi: "beni", under: "beni", lower: "robe", feet: "bare", build: "slim" },
  weaver: { hair: "shimada", hairColor: "sumi", robe: "gofun", robePattern: { type: "asanoha", color: "usuzumi", scale: .5, opacity: .35 }, obi: "usuzumi", under: "beni", lower: "robe", feet: "bare", build: "slim" },
  grandfather: { hair: "elder", robe: "cha", robePattern: { type: "shima", color: "kogecha", scale: .5 }, obi: "kogecha", lower: "robe", feet: "bare", build: "average", beard: true },
  grandmother: { hair: "elder", hairColor: "gofun", robe: "ai", robePattern: { type: "kanoko", color: "gofun", scale: .5 }, obi: "cha", lower: "robe", feet: "bare", build: "slim" },
  sleeper: { hair: "chonmage", robe: "gofun", robePattern: { type: "yagasuri", color: "ai", scale: .5, opacity: .4 }, obi: "ai", lower: "robe", feet: "bare", build: "average" },
};

/**
 * A complete room scene (1920 × 1080): the room in two parts with its figures between them, lit and animated.
 * `inn`: a traveller's inn at night after Hiroshige's Akasaka — two guests talking by a lamp, a maid coming along the
 * veranda and kneeling to bow to them. `weaver`: a woman at her loom by lamplight behind closed shoji (the crane
 * wife). `hearth`: an old couple kneeling at a farmhouse irori, the kettle steaming. `bedroom`: a sleeper under the
 * quilt by a low lamp; a shoji slides open on the snowy night.
 */
export function interiorScene(kind: UkiyoeInteriorKind = "inn", options: { frames?: number; seed?: number } = {}): UkiyoeSceneSpec {
  const frames = options.frames ?? 360, seed = options.seed ?? 11, nodes: UkiyoeNode[] = [];
  const W = 1500, H = 600, D = 210, X = 960, Y = 900, skew = .6;
  const at = (u: number, v: number): [number, number] => [X - W / 2 + u * W + v * D * skew, Y - v * D];
  const room = (params: Record<string, unknown>) => {
    nodes.push({ id: "room", kind: "motif", motif: "room", x: X, y: Y, params: { width: W, height: H, depth: D, skew, ...params, part: "back" } });
    return () => nodes.push({ id: "room-front", kind: "motif", motif: "room", x: X, y: Y, params: { width: W, height: H, depth: D, skew, ...params, part: "front" } });
  };
  const fig = (id: string, look: UkiyoeFigureLook, u: number, v: number, actions: UkiyoeAction[], facing: "left" | "right" = "right", extra: Partial<UkiyoeNode> = {}) => {
    const [x, y] = at(u, v);
    nodes.push({ id, kind: "figure", x, y, look: { ...look, height: 300 }, actions, facing, ...extra } as UkiyoeNode);
  };
  const sky: UkiyoeNode = { id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, band: .5, top: "yoru", mid: "ai", horizon: "murasaki" } };
  let front: () => void;
  if (kind === "inn") {
    nodes.push(sky);
    front = room({ back: ["fusuma", "fusuma", "tokonoma", "tana"], art: "bamboo", night: .55, veranda: 110, eave: "thatch", frontShoji: [2, 0], scroll: "moon" });
    nodes.push({ id: "lamp", kind: "motif", motif: "andon", x: at(.56, .55)[0], y: at(.56, .55)[1], params: { height: 160 } });
    fig("guest", LOOKS.guest, .36, .45, [{ type: "kneel", start: 0, end: frames, blend: 0 }, { type: "talk", start: 40, end: 150 }, { type: "talk", start: 230, end: 300 }], "right");
    fig("traveller", LOOKS.traveller, .72, .5, [{ type: "kneel", start: 0, end: frames, blend: 0 }, { type: "look", start: 150, end: 230, angle: 6 }, { type: "talk", start: 160, end: 220 }], "left");
    const [mx, my] = at(1.08, -.42), [kx] = at(.62, -.42);
    nodes.push({ id: "maid", kind: "figure", x: mx, y: my, look: { ...LOOKS.maid, height: 300 }, facing: "left", actions: [{ type: "walk", start: 20, end: 170, to: kx - mx }, { type: "hold", start: 0, end: 175, angle: 30, amount: 95 }, { type: "kneel", start: 185, end: frames }, { type: "bow", start: 200, end: 260, angle: 30 }] } as UkiyoeNode);
  } else if (kind === "weaver") {
    nodes.push(sky);
    front = room({ kind: "boards", back: ["shoji", "shoji", "wall"], side: "wall", night: .7, eave: "thatch" });
    const lh = 360, [lx, ly] = at(.55, .3);
    nodes.push({ id: "lamp", kind: "motif", motif: "andon", x: at(.2, .75)[0], y: at(.2, .75)[1], params: { height: 150 } });
    nodes.push({ id: "loom", kind: "motif", motif: "loom", x: lx, y: ly, params: { height: lh, cloth: "gofun", progress: .6 } });
    // She kneels with her knees under the cloth beam, her hands on the beater.
    const grip = loomGrip(lh), wx = lx - lh * .75 + lh * LOOM_BEAM_X - 300 * .1, wy = ly + 4;
    nodes.push({ id: "weaver", kind: "figure", x: wx, y: wy, look: { ...LOOKS.weaver, height: 300 }, facing: "right", actions: [{ type: "weave", start: 0, end: frames, blend: 0, aim: [lx + grip[0] - wx, ly + grip[1] - wy], amount: LOOM_BEATER_PULL * lh * .99 }] } as UkiyoeNode);
  } else if (kind === "hearth") {
    nodes.push({ ...sky, params: { width: 1920, height: 1080, band: .5, top: "usuzumi", mid: "paper", horizon: "paper" } } as UkiyoeNode);
    front = room({ kind: "farmhouse", doma: .32, eave: "thatch", back: ["wall", "shoji", "shoji", "wall"] });
    const [hx, hy] = at(.62, .45);
    nodes.push({ id: "hearth", kind: "motif", motif: "irori", x: hx, y: hy, params: { size: 300, hook: H - .45 * D + 30 } });
    fig("grandfather", LOOKS.grandfather, .45, .6, [{ type: "kneel", start: 0, end: frames, blend: 0 }, { type: "talk", start: 60, end: 170 }, { type: "pray", start: 260, end: 330 }], "right");
    fig("grandmother", LOOKS.grandmother, .84, .58, [{ type: "kneel", start: 0, end: frames, blend: 0 }, { type: "look", start: 170, end: 250, angle: 8 }, { type: "talk", start: 180, end: 240 }], "left");
  } else {
    nodes.push({ ...sky, params: { width: 1920, height: 1080, band: .5, top: "yoru", mid: "yoru", horizon: "ai" } } as UkiyoeNode);
    front = room({ back: ["shoji", "fusuma", "fusuma", "wall"], art: "clouds", night: .75, beyond: "garden", snow: 1, slide: [{ bay: 0, open: 1, start: Math.round(frames * .45), frames: 90 }], scroll: "moon" });
    nodes.push({ id: "lamp", kind: "motif", motif: "andon", x: at(.86, .6)[0], y: at(.86, .6)[1], params: { height: 140, lit: .7 } });
    // The sleeper lies on the mattress along its middle, heels near the foot end, head on the pillow.
    const L = 420, [fx, fy] = at(.48, .25), fd = L * .2;
    nodes.push({ id: "bed", kind: "motif", motif: "futon", x: fx, y: fy, params: { length: L, layer: "under" } });
    nodes.push({ id: "sleeper", kind: "figure", x: fx - L / 2 + L * .1 + 300 * .96 + fd * .45 * skew, y: fy - fd * .45 - L * .035, look: { ...LOOKS.sleeper, height: 300 }, facing: "right", actions: [{ type: "sleep", start: 0, end: frames, blend: 0 }] } as UkiyoeNode);
    nodes.push({ id: "cover", kind: "motif", motif: "futon", x: fx, y: fy, params: { length: 420, layer: "over", cover: "beni", pattern: "kin" } });
  }
  front();
  return { version: 1, id: `interior-${kind}`, width: 1920, height: 1080, durationFrames: frames, seed, cadence: 2, palette: { preset: kind === "hearth" ? "edo" : "night" }, nodes };
}
