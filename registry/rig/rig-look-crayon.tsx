/**
 * RIG1 crayon look: rigged parts coloured like a wax-crayon drawing, with the CRAYON1 material
 * (`registry/video/materials/crayon-react`), the same engine as the Crayon scene films.
 *
 *   - Solid parts are opaque wax, so a far arm stays behind the body. The undercoat is tinted by the paper
 *     at the crayon's pressure and lit from the upper left in world space, whatever the bone's angle.
 *   - Dry-nib strokes are built up in two passes and follow the part's long axis. Paper tooth shows in the
 *     wax, the rim is frayed, and the contour is a soft darker wax line, not a vector stroke.
 *   - Shadows are cool and highlights warm, as with real crayon layering, not mixed toward grey.
 *   - Each held pose is a fresh drawing. The stroke seed changes on the look's boil step (every few frames),
 *     so marks are redrawn like hand-drawn frames, while the undercoat, light and silhouette stay steady.
 *   - Smoke and lamp light stay open, translucent wax. The ground is a scumbled verge under a wax line.
 */
import type { ReactNode } from "react";
import { Paper, WaxLine, WaxRegion } from "../video/materials/crayon-react";
import type { AffineMatrix } from "../motion/types";
import type { RigPartFrame } from "./rig-evaluate";
import { JointFade } from "./rig-form";
import type { RigLookContext } from "./rig-react";
import type { RigRole } from "./rig-spec";

/** Paper colour shared by the backdrop and the wax undercoat, so light pressure lets this paper show. */
export const RIG_CRAYON_PAPER = "#f6ecd6";
/** Cool shadow and warm highlight pigments that crayon colours are layered toward. */
const SHADOW = "#2c2840", LIGHT = "#fff4da";
/** Light falls from the upper left of the picture. */
const LIGHT_DIR = [-.55, -.83] as const;

const hex = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
function mix(a: string, b: string, t: number): `#${string}` {
  const x = hex(a), y = hex(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

interface Recipe { pressure: number; marks: number; burnish: number; rough: number; outline: number }
/** How hard each kind of surface is coloured: skin softly, hair and fur in visible strokes, metal burnished. */
const SOFT: Recipe = { pressure: .76, marks: .34, burnish: 0, rough: .1, outline: .7 };
const CLOTH: Recipe = { pressure: .84, marks: .5, burnish: 0, rough: .14, outline: .8 };
const STROKY: Recipe = { pressure: .88, marks: .68, burnish: 0, rough: .2, outline: .8 };
const HARD: Recipe = { pressure: .9, marks: .42, burnish: .55, rough: .1, outline: .85 };
const RECIPES: Partial<Record<RigRole, Recipe>> = {
  skin: SOFT, face: SOFT, belly: SOFT, membrane: { ...SOFT, marks: .42 },
  cloth: CLOTH, "cloth-dark": CLOTH, sail: CLOTH, rope: STROKY,
  hair: STROKY, fur: STROKY, "fur-dark": STROKY, feather: STROKY, fin: STROKY, wood: STROKY,
  scale: { ...STROKY, marks: .58 }, "scale-dark": { ...STROKY, marks: .58 }, horn: HARD, beak: HARD,
  metal: HARD, "metal-dark": HARD, brass: HARD, paint: HARD, "paint-dark": HARD, rubber: HARD, glass: { ...HARD, marks: .3 },
  shoe: HARD, accent: CLOTH,
};
const SMALL_ROLES = new Set<RigRole>(["eye", "mouth", "detail"]);
/** A finished drawing whose silhouette is traced with a darker wax line (CRAYON1 construction), not a vector stroke. */
const CONTOUR = { construction: { order: "fill-first", outlineFraction: .3, glaze: 0 }, frame: 5, first: 0, last: 4 } as const;

/** Where the light sits on a part, in its own bounding box: the world light direction taken into bone space. */
function lightFocus(m: AffineMatrix): { focusX: number; focusY: number } {
  const det = m.a * m.d - m.b * m.c || 1;
  const lx = (m.d * LIGHT_DIR[0] - m.c * LIGHT_DIR[1]) / det, ly = (-m.b * LIGHT_DIR[0] + m.a * LIGHT_DIR[1]) / det;
  const len = Math.hypot(lx, ly) || 1, r = (v: number) => Math.round(Math.min(1, Math.max(0, .5 + .34 * v / len)) * 100) / 100;
  return { focusX: r(lx), focusY: r(ly) };
}

/** The same light across a scene box, in the part's own coordinates: one light for all the parts of a form. */
function lightAcross(m: AffineMatrix, b: { x: number; y: number; width: number; height: number }) {
  const det = m.a * m.d - m.b * m.c || 1, size = Math.hypot(b.width, b.height);
  const x = b.x + b.width * (.5 + .34 * LIGHT_DIR[0]) - m.e, y = b.y + b.height * (.5 + .34 * LIGHT_DIR[1]) - m.f;
  return { cx: (m.d * x - m.c * y) / det, cy: (-m.b * x + m.a * y) / det, r: .8 * size / Math.sqrt(Math.abs(det)) };
}

/**
 * Strokes run along a part's long axis: across-the-grain colouring on a limb looks like bands, not wax. Wide parts
 * keep angle 0 (the marks carry their own lean): a tilted hatch covers the square of the diagonal, several times the
 * strokes for a car body or a wing.
 */
function strokeAngle(w: number, h: number, seed: number): number {
  const lean = (seed % 9) - 4;
  if (h > w * 1.35) return (seed % 2 ? 1 : -1) * 70 + lean;
  if (w > h * 1.35) return 0;
  return -28 + lean;
}
/** Joint caps (`knee-*`, `elbow-*` from the rig kit) only hide the seam between two limb segments: no contour. */
const isJointCap = (p: RigPartFrame) => p.shape.type === "ellipse" && /^(knee|elbow)(-|$)/.test(p.id);

export interface RigCrayonPartProps {
  p: RigPartFrame;
  ctx: RigLookContext;
  /** The part outline in bone space and its bounds. */
  d: string;
  bounds: { x: number; y: number; width: number; height: number };
  /** Pigment before far-side shading. */
  color: string;
  /** Stable per part; the boil step is added here. */
  seed: number;
  /** One part of a body form: the scene box its light turns across. Its form has the contour (`RigCrayonFormEdge`). */
  lightBox?: { x: number; y: number; width: number; height: number };
}
const pigment = (p: RigPartFrame, color: string) => p.far ? mix(color, SHADOW, .2) : color;
/** A part's share of the darker wax line round its body form: it goes down before the parts, which cover its inner half. */
export function RigCrayonFormEdge({ p, ctx, d, color, seed, fade }: { p: RigPartFrame; ctx: RigLookContext; d: string; color: string; seed: number; fade?: { id: string; reach: number } }) {
  const dark = mix(pigment(p, color), SHADOW, .42), r = RECIPES[p.role] ?? CLOTH;
  return <>
    {fade && <JointFade {...fade} color={dark} />}
    <WaxLine d={d} color={fade ? `url(#${fade.id})` : dark} width={3.4 + r.pressure * 1.5} seed={seed + (ctx.reduced ? 0 : ctx.step % 3) * 101 + 919} opacity={.72 * r.outline}
      paperSeed={ctx.seed} frame={2} first={0} last={1} reduced />
  </>;
}
/** One rigged part drawn in wax crayon. */
export function RigCrayonPart({ p, ctx, d, bounds: b, color, seed: partSeed, lightBox }: RigCrayonPartProps): ReactNode {
  const formed = !!lightBox;
  const base = pigment(p, color);
  const dark = mix(base, SHADOW, .42), light = mix(base, LIGHT, .3);
  // Each held pose is a fresh drawing: three drawings cycle on the boil step, never a texture sliding over the part.
  const seed = partSeed + (ctx.reduced ? 0 : ctx.step % 3) * 101;
  const shared = { tooth: ctx.uid + "-tooth", paperSeed: ctx.seed, paperColor: RIG_CRAYON_PAPER, frame: 2, first: 0, last: 1, reduced: true } as const;
  if (p.line) return <WaxLine d={d} color={dark} width={(p.lineWidth ?? 1) * 1.6} seed={seed} {...shared} />;
  const small = Math.max(b.width, b.height) < 16 || Math.min(b.width, b.height) < 3.5;
  // Eyes, mouths and tiny details are pressed hard in one go: a solid dab with a slightly darker edge.
  if (small || (SMALL_ROLES.has(p.role) && Math.max(b.width, b.height) < 40))
    return <path d={d} fill={SMALL_ROLES.has(p.role) ? base : mix(base, RIG_CRAYON_PAPER, .1)} stroke={formed ? undefined : dark} strokeWidth={.8} strokeOpacity={.5} strokeLinejoin="round" />;
  const spacing = Math.max(4, Math.min(8.5, Math.min(b.width, b.height) / 3.2));
  const angle = strokeAngle(b.width, b.height, partSeed);
  if (p.role === "smoke" || p.role === "light") {
    const glow = p.role === "light";
    return <WaxRegion d={d} bounds={b} colors={[base, glow ? light : mix(base, SHADOW, .15), light]} seed={seed} {...shared}
      pressure={glow ? .62 : .42} spacing={spacing} angle={angle} coverage="open" blendRadius={glow ? 3 : 5} markStrength={.5} outlineOpacity={0} />;
  }
  const r = RECIPES[p.role] ?? CLOTH, cap = isJointCap(p);
  // Stroke-built wax with the tapered nib: grainy paper contact at a quarter of the dry nib's SVG weight, which
  // matters with dozens of parts per figure redrawn on every boil. The contour is a darker wax line (CONTOUR).
  // A joint cap takes the limb's flat mid-tone, so no disc of its own light shows at a knee or an elbow.
  return <WaxRegion d={d} bounds={b} colors={[base, dark, light]} seed={seed} {...shared} {...CONTOUR}
    pressure={r.pressure} spacing={spacing} angle={angle} coverage="opaque" deposition="stroke-built"
    markLength="long" strokeOrder="patches" markStrength={r.marks} opaqueBurnish={r.burnish}
    underpaintGradient={cap ? undefined : { light: mix(base, LIGHT, .26), shadow: mix(base, SHADOW, .34), ...lightFocus(p.matrix), radius: 1.05 }}
    underpaintFrame={lightBox && lightAcross(p.matrix, lightBox)}
    underpaintTooth={.7} edgeRoughness={cap || formed ? 0 : r.rough} outlineOpacity={cap || formed ? 0 : r.outline} />;
}

/**
 * Crayon paper for a rig board: the visible sheet plus the shared tooth, relief and wax-contact patterns every part
 * samples. Inside `<defs>` (`RigLayer`) only the patterns take effect.
 */
export function RigCrayonPaper({ width, height, seed, uid }: { width: number; height: number; seed: number; uid: string }) {
  return <Paper width={width} height={height} seed={seed} tooth={uid + "-tooth"} strength={.6} color={RIG_CRAYON_PAPER} pigmentRelief handContact />;
}

/** One world-anchored ground tile in crayon: a scumbled verge under a wax ground line, with tufts and pebbles. */
export function RigCrayonGroundTile({ uid, k, x0, x1, ground, depth, seed, marks }: {
  uid: string; k: number; x0: number; x1: number; ground: number;
  /** How far the ground reaches below the ground line (to the bottom of the frame). */
  depth: number; seed: number;
  /** Tuft and pebble paths, in world space. */
  marks: readonly { d: string; kind: "tuft" | "pebble" }[];
}) {
  const shared = { tooth: uid + "-tooth", paperSeed: seed, paperColor: RIG_CRAYON_PAPER, frame: 2, first: 0, last: 1, reduced: true } as const;
  const w = x1 - x0, verge = 44, bottom = ground + Math.max(verge + 8, depth), hash = (n: number, m: number) => ((seed * 7 + n * 31) % 101 + 101) % 101 % m;
  // Drawn once per tile (the background is not redrawn). Undercoats are opaque and pre-mixed with the paper. The grass
  // verge ends in ragged stroke ends, at points shared by the tiles on both sides, over a paler field coloured with the
  // broad side of the crayon. A tile laps over the one before it along a ragged edge: a straight edge cut the strokes.
  const lap = (from: number, to: number) => {
    let d = "";
    for (let y = from, i = 0; y > to; y -= 13, i++) d += `L${x0 - 4 - hash(k * 5 + i * 3, 11)} ${y}`;
    return d;
  };
  let ends = "";
  for (let n = Math.ceil(x1 / 16); n >= Math.floor(x0 / 16) - 1; n--) ends += `L${Math.min(x1 + 1, Math.max(x0 - 6, n * 16))} ${ground + verge - 10 + hash(n, 13)}`;
  const top = `M${x0} ${ground + 1}C${x0 + w * .3} ${ground - 2} ${x0 + w * .62} ${ground + 3} ${x1 + 1} ${ground + 1}`;
  const field = `M${x0} ${ground + 18}H${x1 + 1}V${bottom}H${x0 - 4}${lap(bottom, ground + verge + 6)}L${x0} ${ground + verge + 5}Z`, line = uid + "-line" + k;
  return <g data-km-rig-crayon-ground={k}>
    {/* angle 0: a tilted hatch would cover the square of the tile's diagonal, ten times the strokes. */}
    <WaxRegion d={field} bounds={{ x: x0 - 16, y: ground + 18, width: w + 17, height: bottom - ground - 18 }} colors={[mix("#c6c593", RIG_CRAYON_PAPER, .62), "#a7a679", "#ebe5c2"]}
      seed={seed + k * 17 + 5} {...shared} pressure={.4} spacing={20} angle={0} coverage="opaque" markStrength={.42} underpaintTooth={.6} outlineOpacity={0} />
    <WaxRegion d={`${top}${ends}${lap(ground + verge - 12, ground + 14)}L${x0} ${ground + 10}Z`} bounds={{ x: x0 - 16, y: ground - 3, width: w + 17, height: verge + 8 }} colors={[mix("#b5bf86", RIG_CRAYON_PAPER, .4), "#a1a874", "#dfe1b4"]}
      seed={seed + k * 17 + 3} {...shared} pressure={.55} spacing={11} angle={0} coverage="opaque" markStrength={.34} underpaintTooth={.6} outlineOpacity={0} />
    {/* Cut flat at the tile's edges: the round end of a line on the next one made a knot. */}
    <clipPath id={line}><rect x={x0} y={ground - 20} width={w} height={40} /></clipPath>
    <g clipPath={`url(#${line})`}>
      <WaxLine d={`M${x0 - 6} ${ground + 2}L${x0} ${ground + 2}C${x0 + w * .3} ${ground - 3} ${x0 + w * .6} ${ground + 5} ${x1} ${ground + 2}L${x1 + 6} ${ground + 2}`} color="#7d6446" width={3.4} seed={seed + k} {...shared} />
    </g>
    {marks.map((m, i) => m.kind === "pebble"
      ? <path key={i} d={m.d} fill="#9c8a6c" stroke="#6f5d43" strokeWidth={1} strokeOpacity={.6} />
      : <WaxLine key={i} d={m.d} color="#6f7a48" width={2.2} seed={seed + k * 13 + i} {...shared} />)}
  </g>;
}
