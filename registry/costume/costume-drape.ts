/**
 * COSTUME1 drape: how cloth hangs and folds, so any style draws folds the fabric would make.
 *
 * - **How stiff a cloth is** sets the size of its folds. Peirce's cantilever test measured the bending length (the
 *   length of cloth that bends under its own weight to a set angle) for about 50 fabrics: 1.81 cm for soft ones up to
 *   6.35 cm for stiff ones, and 1.6–8.5 cm with other overhangs (reported, via Cassidy's review). Leonardo said the
 *   same in words: heavy wool makes broad folds, thinner cloth narrow ones.
 * - **Folds form where there is more cloth than body.** A gathered or flared hem buckles into waves. A straight tube
 *   hangs nearly flat, with only a few soft folds.
 * - **Folds hang from supports:**
 *   - pipe folds from a waistband, an obi, a sash or the shoulders;
 *   - swags (catenary drop folds) between two held points;
 *   - zigzag compression folds at a bent elbow;
 *   - hanging sleeve bags.
 *
 * Units are metres on ANAT1's scale person (y up, ground at 0), as in `costume-shapes`.
 */
import type { FPoint, Range } from "../anatomy/foundation-shapes";
import { range, seeded } from "../anatomy/foundation-shapes";
import type { GarmentRecord } from "./costume-data";

/** Peirce (1930): bending length over about 50 fabrics (reported, via Cassidy's review of fabric drape measurement). */
export const PEIRCE_BENDING = { soft: 1.81, stiff: 6.35, extended: [1.6, 8.5] as const, unit: "cm", grade: "reported" as const,
  source: { title: "Cassidy, Fabric objective measurement and drape (review; Peirce 1930)", url: "https://eprints.whiterose.ac.uk/id/eprint/93388/" } };

/**
 * Bending length by fabric, cm: estimated by placing each fibre and weave in Peirce's reported range. Sheer silks and
 * voile sit at the soft end; brocade, denim, skins and barkcloth at the stiff end.
 */
export const FABRIC_BENDING: Readonly<Record<string, Range>> = {
  voile: range(1.4, 1.6, 1.9, "estimated"), crepe: range(1.5, 1.8, 2.2, "estimated"), silk: range(1.6, 2.0, 2.6, "estimated"), rayon: range(1.6, 2.0, 2.5, "estimated"),
  "piña": range(1.8, 2.2, 2.8, "estimated"), cotton: range(2.0, 2.6, 3.4, "estimated"), batik: range(2.0, 2.6, 3.2, "estimated"), kanga: range(2.0, 2.6, 3.2, "estimated"),
  wool: range(2.2, 3.0, 4.0, "estimated"), linen: range(2.6, 3.2, 4.0, "estimated"), ramie: range(2.6, 3.2, 4.0, "estimated"), hemp: range(2.8, 3.4, 4.4, "estimated"),
  "abacá": range(3.0, 3.8, 4.6, "estimated"), alpaca: range(2.4, 3.0, 3.8, "estimated"), bazin: range(3.4, 4.2, 5.0, "estimated"), "aso-oke": range(3.6, 4.4, 5.4, "estimated"),
  damask: range(3.4, 4.2, 5.0, "estimated"), brocade: range(4.0, 4.8, 6.0, "estimated"), denim: range(4.2, 5.0, 6.0, "estimated"),
  leather: range(5.5, 6.5, 8.0, "estimated"), deerskin: range(5.0, 6.0, 7.5, "estimated"), "seal skin": range(5.5, 6.5, 8.0, "estimated"), "caribou skin": range(5.5, 6.5, 8.0, "estimated"),
  fur: range(5.5, 6.5, 8.0, "estimated"), barkcloth: range(5.0, 6.0, 7.5, "estimated"),
};

/** A painter's rules for folds, from Leonardo's *Treatise on Painting* (Rigaud's translation, public domain), chapter 143 and following, in summary. */
export const FOLD_RULES = [
  "Folds wrap round the parts of the body they cover; they do not cut across a limb with hard deep creases.",
  "Folds gather where the limbs and the pose gather the cloth; elsewhere the cloth lies close to the form.",
  "Vary the folds with the stuff: heavy wool makes broad folds, thinner cloth narrower ones.",
  "Parts in light carry no dark folds, parts in shadow no bright ones.",
] as const;
export const FOLD_RULES_SOURCE = { title: "Leonardo da Vinci, A Treatise on Painting (trans. Rigaud), ch. 143–146", url: "https://en.wikisource.org/wiki/A_Treatise_on_Painting/Chapter_143" };

/** The garment's bending length in metres: its first fabric with a value, else cotton. */
export function bendingLength(g: Pick<GarmentRecord, "fabrics">): number {
  for (const f of g.fabrics ?? []) { const r = FABRIC_BENDING[f.toLowerCase()]; if (r) return r.typical / 100; }
  return FABRIC_BENDING.cotton.typical / 100;
}

/**
 * The distance between hanging folds for a bending length (metres). On Cusick's drape meter (a 30 cm disc of cloth
 * over an 18 cm support) a middling fabric makes about six nodes round a draped edge of about 75 cm, which is some 12 cm
 * apart for a 3 cm bending length. Fold spacing therefore runs at about four bending lengths (estimated from those
 * reported test sizes).
 */
export const foldSpacing = (bend: number) => 4 * bend;

export interface Fold {
  /** The fold's ridge, from its support down. */
  ridge: FPoint[];
  /** The shadowed side of the fold: a band beside the ridge, widening with the fold. */
  shadow: FPoint[];
}
export interface HangingFolds {
  folds: Fold[];
  /** The hem from the right edge to the left, waved by the folds. */
  hem: FPoint[];
  /** The fold count across the front, its spacing and depth (metres). */
  count: number; spacing: number; depth: number;
}

/**
 * Pipe folds hanging from a support line down to a hem (front view). The fold count comes from the hem's width over the
 * fold spacing. The depth comes from the extra cloth at the hem over the support: a fold of wavelength λ and depth a
 * takes about (πa/λ)² more cloth than it covers. The ridges spread from the support (gathered) to the hem; the light
 * comes from the upper left, so each fold's shadow lies on its right.
 */
export function hangingFolds(o: { top: number; hem: number; topHalf: number; hemHalf: number; bend: number; seed?: number; gathered?: boolean; light?: -1 | 1;
  /** Cloth held out by a frame (hoops, a cage): it spans the frame in a few broad folds. */
  framed?: boolean }): HangingFolds {
  const rnd = seeded((o.seed ?? 1) * 977 + 3), λ = foldSpacing(o.bend) * (o.framed ? 3 : 1), W = 2 * o.hemHalf, light = o.light ?? -1;
  // Excess cloth: a flared or gathered hem over its support; a straight tube still settles into a few soft folds.
  const excess = Math.max(o.gathered ? .35 : .04, o.hemHalf / Math.max(.05, o.topHalf) - 1);
  const depth = Math.min(λ * .9, λ / Math.PI * Math.sqrt(excess) * .9);
  const count = Math.max(2, Math.round(W / λ));
  const folds: Fold[] = [];
  for (let k = 0; k < count; k++) {
    // Spacing irregular by a quarter of a fold, as real folds are.
    const u = (k + .5 + (rnd() - .5) * .5) / count, xh = -o.hemHalf + u * W, xt = (u * 2 - 1) * o.topHalf * (o.gathered ? .9 : .8);
    // Near a straight-hanging support the fold starts lower down: it grows out of the cloth below the support.
    const start = o.top - (o.top - o.hem) * (o.gathered ? .02 : .18 + rnd() * .2), ridge: FPoint[] = [], n = 8, wob = rnd() * 6.28;
    for (let i = 0; i <= n; i++) {
      const t = i / n, y = start + (o.hem - start) * t, x = xt + (xh - xt) * Math.pow(t, .8) + Math.sin(t * 3 + wob) * λ * .05;
      ridge.push([x, y]);
    }
    // The shadow: zero at the fold's start, widening toward the hem with the fold's depth. Folds differ: some deep
    // troughs, some shallow ripples (half to one and a half times the mean depth).
    const dk = .5 + rnd(), w = (t: number) => (λ * .1 + depth * .35) * dk * Math.pow(t, .7);
    const side = -light;
    const edge = ridge.map((p, i) => [p[0] + side * w(i / n), p[1]] as FPoint);
    folds.push({ ridge, shadow: [...ridge, ...edge.reverse()] });
  }
  // The hem: each fold dips where it faces the viewer and lifts where it turns away (about a third of its depth).
  const hem: FPoint[] = [], steps = Math.max(12, count * 6), ph = rnd() * 6.28;
  for (let i = 0; i <= steps; i++) {
    const x = o.hemHalf - i / steps * W;
    hem.push([x, o.hem + depth * .32 * (1 + Math.cos((x + o.hemHalf) / λ * 2 * Math.PI + ph)) * .5 * (o.framed ? .25 : excess > .1 ? 1 : .5)]);
  }
  return { folds, hem, count, spacing: λ, depth };
}

/**
 * A swag: cloth hanging between two held points sags in a catenary, and each deeper layer sags more, giving the
 * nested drop folds of a sari's pallu or a toga's sinus. Returns the fold curves, outermost first.
 */
export function swagFolds(a: FPoint, b: FPoint, sag: number, layers = 4): FPoint[][] {
  const out: FPoint[][] = [];
  for (let l = 0; l < layers; l++) {
    const s = sag * (1 - l / (layers + 1)), pts: FPoint[] = [];
    // y = s·(cosh(k·u) − cosh(k)) / (cosh(k) − 1) for u in −1..1: zero at the ends, −s in the middle.
    const k = 1.6, ch = Math.cosh(k);
    for (let i = 0; i <= 16; i++) {
      const t = i / 16, u = t * 2 - 1, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      pts.push([x, y + s * (Math.cosh(k * u) - ch) / (ch - 1)]);
    }
    out.push(pts);
  }
  return out;
}

/** Compression folds where a sleeve bends at the elbow: short zigzag arcs across the sleeve (front view, arm hanging). */
export function elbowFolds(cx: number, y: number, halfWidth: number, bend: number, side: 1 | -1): FPoint[][] {
  const n = Math.max(2, Math.min(4, Math.round(halfWidth * 2 / (foldSpacing(bend) * .6)))), out: FPoint[][] = [];
  for (let i = 0; i < n; i++) {
    const yy = y + (i - (n - 1) / 2) * bend * 1.2, tilt = (i % 2 ? 1 : -1) * .012;
    out.push([[cx - side * halfWidth * .85, yy + tilt], [cx, yy - .008], [cx + side * halfWidth * .85, yy - tilt]]);
  }
  return out;
}
