/**
 * ANIM1 faces square on. A species' measured `face.front` (Shiba, red fox, wolf, cat, Japanese Black cattle) or its
 * body plan's (estimated from those and the side-view faces) gives the layout. `frontFaceShapes` turns it into path
 * data for a head outline, ears, eyes, a muzzle and a nose, in units of the head's width at the eyes with y up and the
 * eye line at 0, for any style to paint.
 */
import type { BodyPlanId } from "./animal-plans";
import type { AnimalSpecies, FrontFace } from "./animal-species";
import { findAnimal } from "./animal-species";
import type { FPoint } from "./foundation-shapes";
import { ellipsePoints, smoothClosedPath } from "./foundation-shapes";

const est = (f: Omit<FrontFace, "grade" | "source">, source: string): FrontFace => ({ ...f, grade: "estimated", source });

/** Plan defaults square on (estimated), for species without a measured front. */
export const PLAN_FRONT: Partial<Record<BodyPlanId, FrontFace>> = {
  canid: est({ crown: .43, chin: .57, nose: .38, noseWidth: .17, muzzleWidth: .35, eye: .12, earTip: [.45, .62], earBase: .29, earBaseX: .31 }, "the mean of the measured Shiba, red fox and wolf"),
  felid: est({ crown: .41, chin: .45, nose: .29, noseWidth: .13, muzzleWidth: .35, eye: .17, earTip: [.42, .62], earBase: .35, earBaseX: .3 }, "the measured cat"),
  ursid: est({ crown: .45, chin: .55, nose: .42, noseWidth: .2, muzzleWidth: .38, eye: .07, earTip: [.48, .5], earBase: .26, earBaseX: .4 }, "the moon bear's broad skull and big round ears set high and wide"),
  suid: est({ crown: .35, chin: .75, nose: .7, noseWidth: .32, muzzleWidth: .4, eye: .07, earTip: [.55, .45], earBase: .22, earBaseX: .38 }, "the boar's long wedge ending in the snout disc"),
  ruminant: est({ crown: .62, chin: .95, nose: .76, noseWidth: .5, muzzleWidth: .62, eye: .13, earTip: [1.0, .14], earBase: .28, earBaseX: .55 }, "the measured Japanese Black, narrower at the nose for deer"),
  equid: est({ crown: .5, chin: 1.4, nose: 1.2, noseWidth: .5, muzzleWidth: .6, eye: .14, earTip: [.3, .62], earBase: .16, earBaseX: .22 }, "a horse's long face with the eyes at its sides"),
  leporid: est({ crown: .38, chin: .45, nose: .3, noseWidth: .12, muzzleWidth: .36, eye: .16, earTip: [.25, 1.6], earBase: .18, earBaseX: .14 }, "a hare's long ears close together on the crown, eyes at the sides"),
  rodent: est({ crown: .38, chin: .45, nose: .4, noseWidth: .1, muzzleWidth: .3, eye: .16, earTip: [.62, .52], earBase: .35, earBaseX: .42 }, "a mouse's huge round ears"),
  mustelid: est({ crown: .32, chin: .38, nose: .26, noseWidth: .14, muzzleWidth: .38, eye: .1, earTip: [.48, .26], earBase: .2, earBaseX: .42 }, "the weasel's flat head with small low ears"),
  primate: est({ crown: .5, chin: .55, nose: .22, noseWidth: .18, muzzleWidth: .45, eye: .1, earTip: [.58, .02], earBase: .2, earBaseX: .5 }, "Siebold's macaque square on: eyes close, ears low at the sides"),
};

/** A species' face square on: measured where it was, otherwise its plan's. */
export function frontFace(subject: string | AnimalSpecies): FrontFace | undefined {
  const sp = typeof subject === "string" ? findAnimal(subject) : subject;
  if (!sp) return undefined;
  return sp.face?.front ?? PLAN_FRONT[sp.plan];
}

export interface FrontFaceShapes {
  head: string; ears: string; earsInner: string; muzzle: string; nose: string; eyes: string;
  /** Eye centres (left, right), and their radius. */
  eyeCentres: readonly [FPoint, FPoint]; eyeR: number;
  bounds: readonly [number, number, number, number];
}

/** Path data for a face square on (head widths, y up, the eye line at 0, the centre line at x 0). */
export function frontFaceShapes(subject: string | AnimalSpecies): FrontFaceShapes | undefined {
  const sp = typeof subject === "string" ? findAnimal(subject) : subject, f = sp && frontFace(sp);
  if (!sp || !f) return undefined;
  const spacing = sp.face?.eyeSpacing ?? .4, half = .5;
  // The head: the crown, out to the cheeks at the eye line, in to the muzzle and down to the chin.
  const nose = -f.nose, chin = -f.chin, mw = f.muzzleWidth / 2;
  const right: FPoint[] = [[0, f.crown], [half * .62, f.crown * .9], [half * .92, f.crown * .45], [half, 0], [half * .9, nose * .45], [Math.max(mw * 1.05, half * .6), nose * .9],
    [mw * .95, (nose + chin) / 2], [mw * .55, chin]];
  const outline = [...right, ...right.slice(1).reverse().map(([x, y]) => [-x, y] as FPoint)];
  // Ears: a base on the skull and a tip; pointed for most, rounded for bears, mice and macaques.
  const round = ["ursid", "rodent", "primate"].includes(sp.plan), ears: string[] = [], inner: string[] = [];
  for (const s of [-1, 1]) {
    const bx = s * f.earBaseX, by = f.crown * (f.earTip[1] < f.crown * .5 ? .1 : .85), tip: FPoint = [s * f.earTip[0], f.earTip[1]];
    const b0: FPoint = [bx - s * f.earBase / 2, by], b1: FPoint = [bx + s * f.earBase / 2, by - (f.earTip[1] < f.crown * .5 ? .05 : .08)];
    if (round) {
      const c: FPoint = [(b0[0] + b1[0] + tip[0]) / 3, (b0[1] + b1[1] + tip[1]) / 3], r = Math.max(f.earBase * .55, Math.hypot(tip[0] - c[0], tip[1] - c[1]));
      ears.push(smoothClosedPath(ellipsePoints({ cx: c[0], cy: c[1], rx: r, ry: r * .95, angle: 0 }, 20)));
      inner.push(smoothClosedPath(ellipsePoints({ cx: c[0], cy: c[1], rx: r * .55, ry: r * .5, angle: 0 }, 16)));
    } else {
      const mid = (a: FPoint, b: FPoint, k: number): FPoint => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
      ears.push(smoothClosedPath([b0, mid(b0, tip, .6), tip, mid(b1, tip, .55), b1]));
      inner.push(smoothClosedPath([mid(b0, b1, .2), mid(mid(b0, b1, .25), tip, .7), mid(tip, mid(b0, b1, .5), .12), mid(mid(b0, b1, .75), tip, .65), mid(b0, b1, .8)]));
    }
  }
  const eyeR = f.eye / 2, eyes: [FPoint, FPoint] = [[-spacing / 2, 0], [spacing / 2, 0]];
  const muzzle = smoothClosedPath([[-mw, nose * .4], [mw, nose * .4], [mw * 1.05, (nose + chin) / 2], [0, chin * .98], [-mw * 1.05, (nose + chin) / 2]]);
  const nw = f.noseWidth / 2, noseD = smoothClosedPath([[-nw, nose + nw * .3], [nw, nose + nw * .3], [nw * .7, nose - nw * .45], [0, nose - nw * .7], [-nw * .7, nose - nw * .45]]);
  const eyeD = eyes.map(c => smoothClosedPath(ellipsePoints({ cx: c[0], cy: c[1], rx: eyeR, ry: eyeR * (sp.face?.eyeLook === "bead" ? 1 : .75), angle: 0 }, 16))).join("");
  const xs = [...outline.map(p => p[0]), -f.earTip[0] - f.earBase, f.earTip[0] + f.earBase], ys = [...outline.map(p => p[1]), f.earTip[1] + .1];
  return {
    head: smoothClosedPath(outline), ears: ears.join(""), earsInner: inner.join(""), muzzle, nose: noseD, eyes: eyeD,
    eyeCentres: eyes, eyeR, bounds: [Math.min(...xs) - .05, Math.min(...ys) - .05, Math.max(...xs) + .05, Math.max(...ys) + .05],
  };
}
