/**
 * MAKEUP1 design: read a face, choose a look's colours and placement for it, and check the result against the rules.
 *
 *   analyzeFace(V)        face shape, eye spacing and tilt, lip ratio, brow peak (rest-frame landmarks, mm)
 *   designMakeup(opts)    a look + a skin colour + a face (+ iris and hair colour) -> a MakeupPlan with reasons
 *   checkMakeup(plan, V)  placement and colour checks (contour stops at the iris, blush above the nose base, ...)
 *
 * A plan is plain data (schema kumiki.makeup.plan/1): `makeupPaint` paints it on ANAT1 portraits, `paintPhoto` on a
 * photograph, and the Python pipeline (scripts/makeup) reads the same JSON.
 */
import type { Vec3 } from "./anatomy-body";
import type { EyeShapeSpec } from "./eye-detail";
import type { LashSpec, LensSpec } from "./face-portrait";
import type { Lab } from "./anatomy-color";
import { hairColorHex } from "./anatomy-color";
import { createFace } from "./anatomy-face";
import { basePalette, blushOn, BLUSH_FOR, browColour, deltaE2000, EYE_COMPLEMENTS, hexToLab, irisFamily, labToHex, labToLinear, lipColour, readSkin, RED_FOR } from "./makeup-color";
import type { BlendMode, SkinReading, Undertone } from "./makeup-color";
import { EYE_RULES, EYE_SHAPE_RULES, FACE_SHAPE_RULES, findLook, learnedR, MAKEUP_LEARNED } from "./makeup-data";
import type { ColourRule, FaceShape, Look, LookLayer } from "./makeup-data";
import { eyeWidth, findZone, MAKEUP_ATLAS, resolveZone } from "./makeup-zones";
import type { FinishId, ProductId, ZoneAdjust } from "./makeup-zones";

// ---- Reading a face -------------------------------------------------------------------------------------------------

export interface FaceAnalysis {
  eyeWidth: number;
  shape: { id: FaceShape; scores: Record<FaceShape, number>; features: Record<string, number> };
  /** Inner-corner distance over one eye width, against the average face's (1 = average, the classic 'one eye between
   * the eyes'; photo landmarks put the eye corners inside the true canthi, so the raw ratio differs by source). */
  eyeSpacing: number;
  /** Mean canthal tilt, degrees (+ = outer corners higher). */
  canthalTilt: number;
  /** Lower over upper vermilion height (attractive young women about 1.6-2: Popenko et al. 2017). */
  lipRatio: number;
  /** Brow peak as a fraction of the eye width from the inner corner (preferred about 0.71). */
  browPeak: number;
}

/** Face-shape prototypes as changes from the average face (cosmetology's 'oval'); the same table as the Python pipeline. */
const SHAPE_DELTA: Record<FaceShape, Record<string, number>> = {
  oval: {}, round: { length_width: -0.08, jaw_cheek: 0.04, chin_jaw: 0.08 }, square: { length_width: -0.06, jaw_cheek: 0.1, chin_jaw: 0.1 },
  oblong: { length_width: 0.1 }, heart: { forehead_cheek: 0.06, jaw_cheek: -0.08, chin_jaw: -0.12 },
  diamond: { forehead_cheek: -0.09, jaw_cheek: -0.07, chin_jaw: -0.05 }, triangle: { forehead_cheek: -0.08, jaw_cheek: 0.1 },
};
export function shapeFeatures(V: readonly Vec3[]): Record<string, number> {
  const cheek = Math.abs(V[454][0] - V[234][0]), jaw = Math.abs(V[397][0] - V[172][0]);
  return { length_width: (V[10][1] - V[152][1]) / cheek, forehead_cheek: Math.abs(V[284][0] - V[54][0]) / cheek, jaw_cheek: jaw / cheek, chin_jaw: Math.abs(V[378][0] - V[149][0]) / jaw };
}
let ANAT1_REF: Record<string, number> | undefined;
const spacingOf = (V: readonly Vec3[]) => Math.abs(V[362][0] - V[133][0]) / eyeWidth(V);
function anat1Reference(): Record<string, number> {
  const V = createFace({}).vertices;
  return { ...shapeFeatures(V), eye_spacing: spacingOf(V) };
}

/**
 * Read a face for makeup. `reference` is the average face's shape features in the same measurement: ANAT1's
 * calibrated average by default; for photo landmarks use MAKEUP_LEARNED.shape_reference (photo outlines sit on the
 * visible cheek, the mesh's behind it).
 */
export function analyzeFace(V: readonly Vec3[], reference: "anat1" | "photo" | Record<string, number> = "anat1"): FaceAnalysis {
  const ref = reference === "photo" ? MAKEUP_LEARNED.shape_reference : reference === "anat1" ? (ANAT1_REF ??= anat1Reference()) : reference;
  const f = shapeFeatures(V), ew = eyeWidth(V);
  const scores = {} as Record<FaceShape, number>;
  for (const [id, d] of Object.entries(SHAPE_DELTA) as [FaceShape, Record<string, number>][]) {
    const dist = Object.keys(f).reduce((s, k) => s + ((f[k] / ref[k] - 1) - (d[k] ?? 0)) ** 2, 0) / 0.04 ** 2;
    scores[id] = Math.exp(-0.5 * dist);
  }
  const tot = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
  for (const k of Object.keys(scores) as FaceShape[]) scores[k] /= tot;
  const id = (Object.keys(scores) as FaceShape[]).reduce((a, b) => (scores[b] > scores[a] ? b : a));
  const tilt = (ex: number, en: number) => (Math.atan2(V[ex][1] - V[en][1], Math.abs(V[ex][0] - V[en][0])) * 180) / Math.PI;
  const peak = (loop: number[], en: number, ex: number) => {
    // vertex of a parabola through the five upper brow points (the landmarks alone would snap to one of them)
    const xs = loop.map(i => V[i][0]), ys = loop.map(i => V[i][1]), n = xs.length;
    const S = (p: number) => xs.reduce((s, x) => s + x ** p, 0), Sy = (p: number) => xs.reduce((s, x, k) => s + x ** p * ys[k], 0);
    const M = [[S(4), S(3), S(2)], [S(3), S(2), S(1)], [S(2), S(1), n]], r = [Sy(2), Sy(1), Sy(0)];
    const det = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D = det(M), a2 = det([[r[0], M[0][1], M[0][2]], [r[1], M[1][1], M[1][2]], [r[2], M[2][1], M[2][2]]]) / D, a1 = det([[M[0][0], r[0], M[0][2]], [M[1][0], r[1], M[1][2]], [M[2][0], r[2], M[2][2]]]) / D;
    let px = a2 < 0 ? -a1 / (2 * a2) : xs[ys.indexOf(Math.max(...ys))];
    px = Math.min(Math.max(...xs), Math.max(Math.min(...xs), px));
    return (px - V[en][0]) / (V[ex][0] - V[en][0]);
  };
  return {
    eyeWidth: ew, shape: { id, scores, features: f },
    eyeSpacing: spacingOf(V) / (ref.eye_spacing ?? spacingOf(createFace({}).vertices)),
    canthalTilt: (tilt(33, 133) + tilt(263, 362)) / 2,
    lipRatio: (V[14][1] - V[17][1]) / Math.max(1e-6, V[0][1] - V[13][1]),
    browPeak: (peak([70, 63, 105, 66, 107], 133, 33) + peak([300, 293, 334, 296, 336], 362, 263)) / 2,
  };
}

// ---- Plans ----------------------------------------------------------------------------------------------------------

export type LayerColour = { lab: Lab } | { relative: { dL: number; da: number; db: number }; to: "skin" | "zone" };
export interface MakeupLayer {
  zone: string; product: ProductId; label: string;
  /** The pan colour over white, or the change the product makes at full strength against the skin or the zone's own colour. */
  colour: LayerColour;
  coverage: number; hide: number; finish: FinishId; blend: BlendMode; adjust?: ZoneAdjust; why: string;
}
export interface MakeupPlan {
  schema: "kumiki.makeup.plan/1"; look: string; label: string; intensity: number;
  skin: SkinReading; analysis?: FaceAnalysis;
  layers: MakeupLayer[];
  lashes: LashSpec;
  /** A circle lens (linear-RGB tint) and double-eyelid tape 0-1. */
  eyes: { lens?: LensSpec; tape: number };
  brows: { colour: Lab; density: number; straight: number };
  rationale: string[];
}
export interface DesignOptions {
  look?: string | Look;
  /** The skin's colour (sRGB hex, e.g. a Monk Skin Tone, or CIELAB). */
  skin?: string | Lab;
  /** Rest-frame face (ANAT1 vertices or a photo's rest landmarks) for the face-shape and eye rules. */
  face?: readonly Vec3[]; faceReference?: "anat1" | "photo";
  /** Iris colour id (ANAT1's IRIS_TYPES, or an EYE_COMPLEMENTS key). */
  eyes?: string;
  /** Eye shape id (ANAT1's EYE_SHAPES: hooded, monolid, round, downturned...): applies EYE_SHAPE_RULES. */
  eyeShape?: string;
  /** Hair colour: hex, CIELAB or melanin (ANAT1's hair model). */
  hair?: string | Lab | { eumelanin: number; pheomelanin?: number };
  /** 0 bare ... 1 the look as designed ... 1.5 heavier. */
  intensity?: number;
  undertone?: Undertone;
  /** Design for this face shape instead of the one the analysis finds (to show or compare the rules). */
  faceShape?: FaceShape;
  /** Per zone: replace fields of the look's layer, false to remove it, or a new layer (with a colour) to add it. */
  overrides?: Record<string, Partial<LookLayer> | false>;
}

const EYE_TONES = { champagne: [80, 4, 18], taupe: [50, 6, 10], brown: [36, 12, 18], espresso: [24, 8, 9], charcoal: [22, 0, -2], rose: [60, 26, 8], "peach-gold": [72, 14, 30], pink: [72, 22, 4], red: [44, 52, 30] } as const;
const EYE_TONES_DEEP = { champagne: [64, 8, 34], taupe: [40, 8, 12], brown: [30, 14, 20], espresso: [20, 8, 8], charcoal: [18, 0, -2], rose: [48, 34, 10], "peach-gold": [60, 22, 40], pink: [52, 34, 6], red: [40, 56, 34] } as const;

function hairLab(hair: DesignOptions["hair"]): Lab {
  if (!hair) return hexToLab(hairColorHex(3.2, 0.1));
  if (typeof hair === "string") return hexToLab(hair);
  if (Array.isArray(hair)) return hair as Lab;
  const h = hair as { eumelanin: number; pheomelanin?: number };
  return hexToLab(hairColorHex(h.eumelanin, h.pheomelanin ?? 0));
}

function resolveColour(rule: ColourRule, skin: SkinReading, eyes: string, hair: Lab): LayerColour {
  const rel = (lab: Lab): LayerColour => ({ relative: { dL: lab[0] - skin.lab[0], da: lab[1] - skin.lab[1], db: lab[2] - skin.lab[2] }, to: "skin" });
  switch (rule.kind) {
    case "palette": return rel(basePalette(skin.lab)[rule.swatch].lab);
    case "skin": return { relative: { dL: rule.dL ?? 0, da: rule.da ?? 0, db: rule.db ?? 0 }, to: "skin" };
    case "zone": return { relative: { dL: rule.dL ?? 0, da: rule.da ?? 0, db: rule.db ?? 0 }, to: "zone" };
    case "blush": return rel(blushOn(skin.lab, rule.family ?? BLUSH_FOR[skin.undertone]));
    case "lip": return { lab: lipColour(skin.lab, rule.family === "red" || !rule.family ? RED_FOR[skin.undertone] : rule.family) };
    case "eye": {
      if (rule.tone === "complement") return { lab: EYE_COMPLEMENTS[irisFamily(eyes)].shadow };
      const t = (skin.lab[0] < 45 ? EYE_TONES_DEEP : EYE_TONES)[rule.tone];
      return { lab: [t[0], t[1], t[2]] };
    }
    case "liner": return { lab: rule.tone === "black" ? [11, 0, 0] : [24, 10, 14] };
    case "brow": return { lab: browColour(hair) };
    case "lab": return { lab: rule.lab };
  }
}

/** Design a look for a face: colours from the skin, iris and hair; placement from the face's shape and eyes. */
export function designMakeup(o: DesignOptions = {}): MakeupPlan {
  const look = typeof o.look === "object" ? o.look : findLook(o.look ?? "soft-glam");
  if (!look) throw new Error(`MAKEUP1: unknown look "${String(o.look)}"`);
  const reading = readSkin(o.skin ?? "#d8a98a");
  const skin = o.undertone ? { ...reading, undertone: o.undertone } : reading;
  const intensity = Math.max(0, o.intensity ?? 1), eyes = o.eyes ?? "brown", hair = hairLab(o.hair);
  const found = o.face ? analyzeFace(o.face, o.faceReference ?? "anat1") : undefined;
  const analysis = found && o.faceShape ? { ...found, shape: { ...found.shape, id: o.faceShape } } : found;
  const rationale = [`${look.label}: ${look.summary}`,
    `Skin ${skin.hex}: ITA ${skin.ita.toFixed(0)} deg (${skin.category}), hue ${skin.hue.toFixed(1)} deg -> ${skin.undertone} undertone${o.undertone ? " (set by hand)" : ""}.`];
  let layers: LookLayer[] = look.layers.map(l => ({ ...l }));
  // face-shape and eye rules
  if (analysis && (look.adapt ?? true)) {
    const rule = FACE_SHAPE_RULES[analysis.shape.id];
    rationale.push(`Face shape: ${analysis.shape.id} (${o.faceShape ? "set by hand" : `${Math.round(analysis.shape.scores[analysis.shape.id] * 100)}%`}). ${rule.note}`);
    const sculpting = layers.some(l => l.zone === "cheek-contour");
    layers = layers.filter(l => !(rule.skip ?? []).includes(l.zone)).map(l => {
      if (l.zone === "cheek-contour" && rule.contour) return { ...l, adjust: { ...rule.contour, ...l.adjust } };
      if (l.zone === "blush-apples" && rule.blush !== "blush-apples") return { ...l, zone: rule.blush, adjust: rule.blushAdjust ?? l.adjust };
      if (l.zone === "blush-apples" && rule.blushAdjust) return { ...l, adjust: rule.blushAdjust };
      return l;
    });
    if (sculpting) for (const add of rule.add ?? []) if (!layers.some(l => l.zone === add.zone)) {
      const hl = findZone(add.zone).product === "highlight";
      layers.push({ zone: add.zone, colour: { kind: "palette", swatch: hl ? "highlight" : "contour" }, coverage: add.coverage, why: rule.note });
    }
    const eyeLook = layers.some(l => ["lid", "crease", "outer-v"].includes(l.zone));
    if (eyeLook && analysis.eyeSpacing < EYE_RULES.closeSet.below) {
      rationale.push(`Eyes ${analysis.eyeSpacing.toFixed(2)} eye widths apart: ${EYE_RULES.closeSet.note}`);
      layers = layers.map(l => (l.zone === "outer-v" ? { ...l, coverage: Math.min(1, l.coverage + 0.15) } : l));
      if (!layers.some(l => l.zone === "inner-corner")) layers.push({ zone: "inner-corner", colour: { kind: "eye", tone: "champagne" }, coverage: 0.55, finish: "shimmer" });
    } else if (eyeLook && analysis.eyeSpacing > EYE_RULES.wideSet.above) {
      rationale.push(`Eyes ${analysis.eyeSpacing.toFixed(2)} eye widths apart: ${EYE_RULES.wideSet.note}`);
      layers = layers.map(l => (l.zone === "crease" ? { ...l, adjust: { ...l.adjust, shift: [0.06, 0] } } : l));
    }
    if (analysis.canthalTilt < EYE_RULES.downturned.below) {
      rationale.push(`Canthal tilt ${analysis.canthalTilt.toFixed(1)} deg: ${EYE_RULES.downturned.note}`);
      layers = layers.map(l => (l.zone === "liner-wing" ? { ...l, adjust: { ...l.adjust, rotate: (l.adjust?.rotate ?? 0) - 8 } } : l));
    } else if (analysis.canthalTilt > EYE_RULES.upturned.above) {
      rationale.push(`Canthal tilt ${analysis.canthalTilt.toFixed(1)} deg: ${EYE_RULES.upturned.note}`);
      layers = layers.map(l => (l.zone === "liner-wing" ? { ...l, adjust: { ...l.adjust, rotate: (l.adjust?.rotate ?? 0) + 6 } } : l));
    }
  }
  // the eye shape (ANAT1's EYE_SHAPES): placement for hooded, single and in-fold lids, tilts and depths
  const shapeRule = o.eyeShape ? EYE_SHAPE_RULES[o.eyeShape] : undefined;
  if (shapeRule && (look.adapt ?? true) && layers.some(l => ["lid", "crease", "outer-v", "liner"].includes(l.zone))) {
    rationale.push(`Eye shape ${o.eyeShape}: ${shapeRule.note}`);
    layers = layers.map(l => {
      const r = shapeRule.zones[l.zone];
      return r ? { ...l, coverage: l.coverage * (r.coverage ?? 1), adjust: r.adjust ? { ...l.adjust, ...r.adjust } : l.adjust } : l;
    });
  }
  // the caller's changes
  for (const [zone, ch] of Object.entries(o.overrides ?? {})) {
    if (ch === false) layers = layers.filter(l => l.zone !== zone);
    else if (layers.some(l => l.zone === zone)) layers = layers.map(l => (l.zone === zone ? { ...l, ...ch } : l));
    else if (ch.colour) layers.push({ zone, coverage: 0.6, ...ch } as LookLayer);
  }
  const out: MakeupLayer[] = layers.map(l => {
    const z = findZone(l.zone), product = l.product ?? z.product, spec = MAKEUP_ATLAS.products[product];
    return { zone: l.zone, product, label: z.label, colour: resolveColour(l.colour, skin, eyes, hair), coverage: Math.min(1, l.coverage * intensity), hide: spec.hide,
      finish: l.finish ?? spec.finish, blend: l.blend ?? "film", adjust: l.adjust, why: l.why ?? z.note };
  }).filter(l => l.coverage > 0);
  const lash = look.lashes ?? { length: 1, thickness: 1, darkness: 0.5 }, k = Math.min(1.5, intensity), k1 = Math.min(1, k), ln = look.eyes?.lens;
  // the eye tools scale with intensity and go at 0; a lens grows from a natural 11.7 mm iris to its own size
  const lens: LensSpec | undefined = ln && k > 0 ? { diameter: 11.7 + (ln.diameter - 11.7) * k1, ring: ln.ring * k1, ...(ln.tint ? { tint: labToLinear(hexToLab(ln.tint)) } : {}) } : undefined;
  const lower = lash.lower && k > 0 ? { length: 1 + (lash.lower.length - 1) * k, darkness: 0.5 + (lash.lower.darkness - 0.5) * k1, drawn: Math.round(lash.lower.drawn * k1) } : undefined;
  return {
    schema: "kumiki.makeup.plan/1", look: look.id, label: look.label, intensity, skin, analysis, layers: out,
    lashes: { length: 1 + (lash.length - 1) * k, thickness: 1 + (lash.thickness - 1) * k, darkness: 0.5 + (lash.darkness - 0.5) * k1, ...(lash.style && k > 0 ? { style: lash.style, styleStrength: k1 } : {}), ...(lower ? { lower } : {}) },
    eyes: { ...(lens ? { lens } : {}), tape: (look.eyes?.tape ?? 0) * k1 },
    brows: { colour: browColour(hair), density: look.brows?.density ?? 1, straight: (look.brows?.straight ?? 0) * k1 },
    rationale,
  };
}

/**
 * Double-eyelid tape (or glue) on an eye shape. A single lid gets a low crease (4.5 + 2·t mm). An in-fold lid keeps its
 * in-fold shape, lifted to at least that height (Chinese respondents preferred an in-fold double lid; Chi et al. 2024).
 * A hood shrinks. The opening grows by up to 1.2 mm on single and in-fold lids, inside the 8.0-9.9 mm range between
 * single and double lids (Jung et al. 2020), and by up to 0.5 mm on others.
 */
export function tapedEyeShape(shape: EyeShapeSpec, tape: number): EyeShapeSpec {
  const t = Math.min(1, Math.max(0, tape));
  if (t === 0) return shape;
  const single = shape.crease <= 0, lifted = 4.5 + 2 * t;
  return { ...shape, id: `${shape.id}+tape`, label: `${shape.label}, taped`, crease: single ? lifted : shape.infold ? Math.max(shape.crease, lifted) : shape.crease,
    hood: shape.hood * (1 - t), height: shape.height + (single ? 1.2 : 0.5) * t };
}

// ---- Checks ----------------------------------------------------------------------------------------------------------

export interface MakeupCheck { id: string; ok: boolean; message: string; rule: string }
const lighten = (lab: Lab, dL: number): Lab => [lab[0] + dL, lab[1], lab[2]];

/** Check a plan on a face against the placement and colour rules. Each result says what it measured. */
export function checkMakeup(plan: MakeupPlan, V: readonly Vec3[]): MakeupCheck[] {
  const out: MakeupCheck[] = [], ew = eyeWidth(V), layer = (z: string) => plan.layers.find(l => l.zone === z);
  const limbusR = V[133][0] + (V[33][0] - V[133][0]) * 0.71;
  const contour = layer("cheek-contour");
  if (contour) {
    const pts = resolveZone("cheek-contour", V, contour.adjust)[0].pts, end = pts[pts.length - 1];
    const ok = end[0] <= limbusR + 0.1 * ew;
    out.push({ id: "contour-stops", ok, rule: "Contour stops before the iris: brought further in, the shadow drags the cheek down (convention).",
      message: `The cheek contour ends ${((limbusR - end[0]) / ew).toFixed(2)} eye widths outside the lateral limbus${ok ? "" : ": too far toward the mouth"}.` });
  }
  const blush = plan.layers.find(l => l.product === "blush");
  if (blush) {
    const part = resolveZone(blush.zone, V, blush.adjust)[0], low = Math.min(...part.pts.map((p, k) => p[1] - part.r[k]));
    const ok = low >= V[2][1] - 0.15 * ew;
    out.push({ id: "blush-height", ok, rule: "Blush stays above the base of the nose: lower, it drags the face down (convention).",
      message: `The blush's core ends ${((low - V[2][1]) / ew).toFixed(2)} eye widths ${low >= V[2][1] ? "above" : "below"} the base of the nose.` });
  }
  const hl = layer("cheekbone-highlight");
  if (hl && contour) {
    const cy = (z: string, a?: ZoneAdjust) => { const p = resolveZone(z, V, a)[0].pts; return p.reduce((s, q) => s + q[1], 0) / p.length; };
    const ok = cy("cheekbone-highlight", hl.adjust) > cy("cheek-contour", contour.adjust);
    out.push({ id: "light-over-shadow", ok, rule: "Highlight on the plane above the contour: light comes forward, shadow recedes (chiaroscuro).", message: ok ? "The highlight sits above the contour." : "The highlight sits below the contour." });
  }
  const wing = layer("liner-wing");
  if (wing) {
    const p = resolveZone("liner-wing", V, wing.adjust)[0].pts, tip = p[p.length - 1], ang = (Math.atan2(tip[1] - p[0][1], Math.abs(tip[0] - p[0][0])) * 180) / Math.PI;
    const ok = ang >= 10 && ang <= 45;
    out.push({ id: "wing-angle", ok, rule: "A wing continues the lower lash line up toward the brow tail: about 10-45 degrees (convention).", message: `The wing rises at ${ang.toFixed(0)} degrees.` });
  }
  const puppy = layer("puppy-wing");
  if (puppy) {
    const p = resolveZone("puppy-wing", V, puppy.adjust)[0].pts, tip = p[p.length - 1], ang = (Math.atan2(tip[1] - p[0][1], Math.abs(tip[0] - p[0][0])) * 180) / Math.PI;
    out.push({ id: "wing-angle", ok: ang >= -25 && ang <= -3, rule: "A puppy wing follows the lower lash line out and down: about 3-25 degrees below level (convention).", message: `The wing falls at ${(-ang).toFixed(0)} degrees.` });
  }
  const aegyo = layer("aegyo-sal");
  if (aegyo) {
    const part = resolveZone("aegyo-sal", V, aegyo.adjust)[0], height = 2 * Math.max(...part.r), opening = Math.hypot(V[159][0] - V[145][0], V[159][1] - V[145][1], V[159][2] - V[145][2]), ratio = height / opening;
    out.push({ id: "aegyo-sal-height", ok: ratio >= 0.35 && ratio <= 0.65, rule: "An aegyo-sal about half the eye opening's height: 5 mm and 0.5 were preferred (Aesthetic Surgery Journal 2024).", message: `The aegyo-sal is ${height.toFixed(1)} mm tall, ${ratio.toFixed(2)} of the opening.` });
  }
  if (plan.eyes.lens) {
    const d = plan.eyes.lens.diameter;
    out.push({ id: "lens-size", ok: d <= 14.5, rule: "A circle lens of at most 14.5 mm tinted diameter (12.5-14.5 mm is usual): a natural iris is about 11.7 mm, and larger reads as costume (convention). A 125% iris read as more attractive (Takehara & Tanijiri 2015).", message: `The lens is ${d.toFixed(1)} mm across.` });
  }
  const found = layer("foundation");
  if (found && "relative" in found.colour) {
    const r = found.colour.relative, dE = deltaE2000(plan.skin.lab, [plan.skin.lab[0] + r.dL, plan.skin.lab[1] + r.da, plan.skin.lab[2] + r.db]);
    out.push({ id: "foundation-match", ok: dE <= 3, rule: "Foundation matches the skin (CIEDE2000 under about 2.5-3; 1 is just noticeable side by side).", message: `The foundation is ${dE.toFixed(1)} CIEDE2000 from the skin.` });
  }
  if (found) out.push({ id: "evenness", ok: found.coverage >= 0.25, rule: `Even skin colour reads healthier and younger (Matts et al. 2007). Among the learned data's women, even redness rose with rated attractiveness (${learnedR("female", "skin evenness sd a*")}).`,
    message: `Foundation at ${(found.coverage * 100).toFixed(0)}% coverage${found.coverage >= 0.25 ? " evens redness" : " barely evens the skin"}.` });
  const lips = layer("lips");
  if (lips) {
    const natural = lighten(plan.skin.lab, -10);
    const lipL = "lab" in lips.colour ? lips.colour.lab[0] * lips.coverage + natural[0] * (1 - lips.coverage) : natural[0] + lips.colour.relative.dL * lips.coverage;
    const c = (plan.skin.lab[0] - lipL) / (plan.skin.lab[0] + lipL), made = MAKEUP_LEARNED.contrast.made_up.lips.L, bare = MAKEUP_LEARNED.contrast.bare.lips.L;
    out.push({ id: "lip-contrast", ok: c >= bare.median - 0.02, rule: "Makeup raises lip contrast (Russell 2009; Jones et al. 2015).",
      message: `Lip luminance contrast about ${c.toFixed(2)}; bare faces in the learned data ${bare.median.toFixed(2)}, made-up ${made.p25.toFixed(2)}-${made.p75.toFixed(2)}.` });
  }
  const brow = layer("brow");
  if (brow) {
    // the brow fill's upper edge (its first six points run from the head to the tail): where is its highest point?
    const pts = resolveZone("brow", V, brow.adjust)[0].pts.slice(0, 6), top = pts.reduce((p, q) => (q[1] > p[1] ? q : p));
    const frac = (top[0] - V[133][0]) / (V[33][0] - V[133][0]), ok = frac >= 0.55 && frac <= 1;
    out.push({ id: "brow-peak", ok, rule: "Brow peak near 71% of the eye width (the lateral limbus) and no further out than the outer canthus (Griffin & Kim review).",
      message: `The filled brow peaks at ${(frac * 100).toFixed(0)}% of the eye width (this face's own brow: ${(analyzeFace(V).browPeak * 100).toFixed(0)}%).` });
  }
  return out;
}

/** A plan's colours as swatches: the pan colour, or for relative layers the colour they make on this skin. */
export function planSwatches(plan: MakeupPlan): { zone: string; label: string; hex: string; why: string }[] {
  return plan.layers.map(l => {
    const lab = "lab" in l.colour ? l.colour.lab : ([plan.skin.lab[0] + l.colour.relative.dL, plan.skin.lab[1] + l.colour.relative.da, plan.skin.lab[2] + l.colour.relative.db] as Lab);
    return { zone: l.zone, label: l.label, hex: labToHex(lab), why: l.why };
  });
}
