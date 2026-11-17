/**
 * ANAT1 portrait: a measured, attractiveness-calibrated face (`beautifulFace`) rendered as a lit portrait on the CPU.
 *
 * Geometry:
 * - the face mask (MediaPipe canonical, calibrated and expressed);
 * - a cranium from ANSUR II head breadth, length and height;
 * - a neck and shoulders;
 * - eyeballs ray-traced inside the lids;
 * - a mouth cavity behind the lips;
 * - ears, hair, brows and lashes drawn as hairs.
 *
 * Shading:
 * - skin is lit by a key light with a shadow map, fill, rim, sky and bounce, with ambient occlusion from many
 *   directions;
 * - subsurface scattering blurs the irradiance with the six-Gaussian skin profile of d'Eon & Luebke (GPU Gems 3,
 *   ch. 14, fitted to the multipole model of Donner & Jensen 2005), so red light spreads furthest;
 * - specular is a dielectric (F₀ 0.028, η 1.4), oilier in the T-zone;
 * - regional colour comes from ANAT1's skin zones;
 * - eyes have a sclera, a textured iris lit brighter on the side away from the light (the cornea focuses light
 *   there), a pupil and a corneal highlight;
 * - hair is groomed and drawn strand by strand by ANAT1's hair foundation (`hair-groom.ts`): a style settled by physics
 *   and cut, tens of thousands of strands, Marschner highlights, deep-opacity self-shadowing and multiple scattering; it
 *   shadows the skin under it.
 *
 * Construction for any style, not an approved realistic portrait (see AGENTS.md rule 14 for the pencil portrait gate).
 */
import type { Vec3 } from "./anatomy-body";
import { eyeCentres, FACE_FEATURES, FACE_LANDMARKS } from "./anatomy-face";
import type { FaceLandmark } from "./anatomy-face";
import { hairAlbedo, hairSigmaA, skinZoneColor } from "./anatomy-color";
import type { SkinZone } from "./anatomy-color";
import { beautifulFace, faceTypeLook } from "./face-beauty";
import type { BeautifulFace, BeautyOptions } from "./face-beauty";
import { expressEmotion, expressFace, expressionMarks } from "./expression-face";
import type { AuWeights, ExpressedFace } from "./expression-face";
import { createRaster, downsample, encodeSrgb, fbm, fillPolygon, gaussianBlur, hash2, linearOf, rasterizeTriangles, strokePolyline } from "./foundation-raster";
import type { Raster, RGB3 } from "./foundation-raster";
import ansur from "./data/ansur-ii-ranges.json";
import { findHairStyle, groomHair, HAIR_PHYSICS, hairDensityMap, moveHair, partLine, renderHairStrands, rotateGroom, scalpCover } from "./hair-groom";
import type { HairMotion } from "./hair-groom";
import { EYE_SHAPES, findIris, irisAlbedo } from "./eye-detail";
import { ageSpotsAt, blendSkinRegions, faceWrinkles, findSkinRegion, frecklesAt, skinSurface } from "./skin-texture";
import type { EyeShapeSpec, IrisType } from "./eye-detail";
import type { FringeKind, HairGroom, HairHead, Parting } from "./hair-groom";

/** A HAIRSTYLES id (hair-groom.ts); "short", "bob" and "long" are kept as aliases. */
export type HairStyle = string;
/** An `IRIS_TYPES` id (eye-detail.ts): "black-brown", "dark-brown", "brown", "light-brown", "amber", "hazel", "green", "blue", … */
export type EyeColour = string;
export interface PortraitOptions extends BeautyOptions {
  width?: number; height?: number;
  /** Render at this many pixels per output pixel and downsample (2 by default; 1 for drafts). */
  supersample?: number;
  /** Skin base colour (sRGB hex), e.g. a Monk Skin Tone. */
  skin?: string;
  eyes?: EyeColour;
  /** A different iris for the right eye (complete heterochromia). */
  eyesRight?: EyeColour;
  /** Pupil diameter, mm (2 in bright light … 8 in the dark; default 4). */
  pupil?: number;
  /** Age in years (default 30): the skin's furrows grow fewer and deeper with age, its wrinkles stronger. */
  age?: number;
  /** Freckles across the nose and cheeks, 0 … 1. */
  freckles?: number;
  /** Exposure multiplier before tone mapping (1 by default). */
  exposure?: number;
  /**
   * Makeup as in portrait photography: "natural" (soft eyeshadow, a fine liner, mascara, a little blush, contour and
   * highlight, rosy lips, filled brows), "glamour" (a winged liner, deeper shadow, stronger contour, red lips) or
   * "none". Default: "natural" for women, "none" for men (whose brows are still groomed). With `paint`, the default is
   * "none": the paint (MAKEUP1's `makeupPaint`) does the makeup.
   */
  makeup?: "none" | "natural" | "glamour";
  /** Lipstick colour (sRGB hex) instead of the makeup's. */
  lipstick?: string;
  /** "eyes" frames a close-up of both eyes and brows (the camera closer in, the same light). */
  framing?: "portrait" | "eyes";
  /** Hair melanin (eumelanin 0.3 blonde … 1.3 brown … 8 black; pheomelanin for red). */
  hair?: { eumelanin: number; pheomelanin?: number };
  hairStyle?: HairStyle;
  /** Override the style's fringe and parting; strands drawn (default by size, 12,000–40,000; up to 120,000); length scale; curl type 1–8; share of grey strands. */
  fringe?: FringeKind; parting?: Parting; hairStrands?: number; hairLength?: number; hairCurl?: number; hairGrey?: number;
  /** An emotion prototype (EXPR1 id) at an intensity, or raw action-unit weights. */
  expression?: string; intensity?: number; weights?: AuWeights;
  /** Head turn and nod (degrees; the renderer is built for about ±25° of yaw). */
  yaw?: number; pitch?: number;
  /** Key light: azimuth from the camera (negative = the viewer's left) and elevation, degrees. */
  keyAzimuth?: number; keyElevation?: number;
  background?: string; clothing?: string;
  seed?: number;
  /** Output a pass instead of the portrait, for checking: surface normals, irradiance before scattering, or occlusion. */
  debug?: "normals" | "irradiance" | "ao" | "hair-shadow";
  /** Hair in moving air for one frame (`moveHair`): `{ t, wind, direction, gust }`. The groom is reused; only its pose changes. */
  hairMotion?: HairMotion;
  /** Paint on the skin: makeup (MAKEUP1's `makeupPaint`), face paint, kumadori. */
  paint?: SkinPaint;
}
/** A point of skin as the renderer shades it, for paint on top. Colours are linear RGB. */
export interface SkinPaintSample {
  /** What light entering the skin meets (it then scatters under the skin). */
  albedo: [number, number, number];
  /** Light the paint itself reflects before reaching the skin: not scattered under it, so opaque paint looks flatter. */
  film: [number, number, number];
  /** GGX roughness and a multiplier of the skin's specular strength. */
  roughness: number; specular: number;
  /** Share of reflective particles (shimmer, glitter) and, for metallic finishes, the highlight's colour. */
  sparkle: number; tint: [number, number, number] | null;
}
/**
 * Paint on the skin. `prepare` gets the neutral face (the 468-point mask, mm) once per render; `shade` is called for
 * every skin pixel of the face with its rest position on that face, so paint stays on the skin when the face moves.
 * An interface, so this file needs no import from the packs that build on it (MAKEUP1 implements it).
 */
export interface SkinPaint {
  /** A stable description of the paint: FacePortrait re-renders when it changes. */
  key: string;
  prepare?(neutral: readonly Vec3[]): void;
  shade(rest: Vec3, s: SkinPaintSample): void;
  /** Mascara or false lashes. */
  lashes?: LashSpec;
  /** Eyes: a circle lens. */
  eyes?: { lens?: LensSpec };
  /** Brow hair colour (linear RGB), density factor, and how far to straighten the brow's own shape (0-1). */
  brows?: { colour: RGB3; density: number; straight?: number };
}
/**
 * Mascara or false lashes: length and thickness factors and darkness 0-1 (0.5 = bare lashes). `style`: "wispy" (fine,
 * uneven lengths), "spiky" (manga: 5-7 long spikes over a short base) or "doll" (dense, long, flared). `lower`: the lower
 * lashes' length factor and darkness, and how many strokes are drawn below the lower lash line with liner.
 */
export interface LashSpec {
  length: number; thickness: number; darkness: number;
  style?: "natural" | "wispy" | "spiky" | "doll";
  /** How much of the style shows, 0-1 (default 1): MAKEUP1 fades it in with the intensity. */
  styleStrength?: number;
  lower?: { length: number; darkness: number; drawn: number };
}
/** A circle lens: its tinted diameter (mm; a natural iris is about 11.7), the limbal ring's darkness 0-1, and a tint
 * (linear RGB) laid over the iris pattern outside the pupil. */
export interface LensSpec { diameter: number; ring: number; tint?: RGB3 }
export interface Portrait { width: number; height: number; rgba: Uint8ClampedArray; face: BeautifulFace; expressed?: ExpressedFace; ms: number;
  /** The 468 face-mesh points in output pixels as a landmark detector reports them: x right, y down, z away from the
   * camera in pixels (MediaPipe's convention times [width, height, width]), for overlays and photo tools. */
  landmarks: [number, number, number][];
  /** The groomed hair and the head it was groomed on. */
  hair?: { groom: HairGroom; head: HairHead };
  /** Counts for captions: strands drawn and the groom's time (ms). Rendered in a worker, a portrait keeps these and drops `hair`. */
  stats?: { strands: number; groomMs: number } }

/** The six-Gaussian skin diffusion profile (variance mm², RGB weight), d'Eon & Luebke 2007 (GPU Gems 3, ch. 14). */
export const SKIN_PROFILE: readonly { variance: number; weight: RGB3 }[] = [
  { variance: 0.0064, weight: [0.233, 0.455, 0.649] }, { variance: 0.0484, weight: [0.1, 0.336, 0.344] }, { variance: 0.187, weight: [0.118, 0.198, 0] },
  { variance: 0.567, weight: [0.113, 0.007, 0.007] }, { variance: 1.99, weight: [0.358, 0.004, 0] }, { variance: 7.41, weight: [0.078, 0, 0] },
];
/** Iris colours as single swatches (the ciliary zone of each `IRIS_TYPES` iris); the portrait draws the full iris. */
export const IRIS_COLOURS: Record<string, string> = Object.fromEntries([...["dark-brown", "brown", "hazel", "green", "blue", "grey"].map(id => [id, findIris(id).ciliary])]);

type AnsurSex = { measurements: Record<string, { mean: number }> };
const A = ansur as unknown as { female: AnsurSex; male: AnsurSex };
const ans = (k: string, sex: number) => A.female.measurements[k].mean + (A.male.measurements[k].mean - A.female.measurements[k].mean) * sex;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smoothstep = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const norm3 = (v: Vec3): Vec3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const dot3 = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mixC = (a: RGB3, b: RGB3, t: number): RGB3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Feature loops of the canonical mesh.
const LOOP = (k: string) => FACE_FEATURES[k].loop;
const INNER_UPPER_LIP = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308], INNER_LOWER_LIP = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308];
const EYE_SETS = { R: new Set([...LOOP("eye-upper.R"), ...LOOP("eye-lower.R")]), L: new Set([...LOOP("eye-upper.L"), ...LOOP("eye-lower.L")]) };
const LID_SETS = { upper: { R: new Set(LOOP("eye-upper.R")), L: new Set(LOOP("eye-upper.L")) }, lower: { R: new Set(LOOP("eye-lower.R")), L: new Set(LOOP("eye-lower.L")) } };
const MOUTH_SET = new Set([...INNER_UPPER_LIP, ...INNER_LOWER_LIP]);

/** Render a portrait. Costs a few hundred milliseconds to a couple of seconds by size. */
export function renderPortrait(o: PortraitOptions = {}): Portrait {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const W = o.width ?? 384, H = o.height ?? 480, SS = Math.max(1, Math.round(o.supersample ?? 2)), w = W * SS, h = H * SS;
  const sex = clamp01(o.sex ?? 0), seed = o.seed ?? 7;
  // a face type asked for brings its look (skin, eyes, hair) unless those are given
  const look = o.faceType ? faceTypeLook(o.faceType, sex) : undefined, hairCurl = o.hairCurl ?? look?.hairCurl;
  // the type's fringe and parting go with its own hairstyle only
  const fringe = o.fringe ?? (o.hairStyle ? undefined : look?.fringe as FringeKind | undefined), parting = o.parting ?? (o.hairStyle ? undefined : look?.parting as Parting | undefined);
  const hairLength = o.hairLength ?? (o.hairStyle ? undefined : look?.hairLength);
  const face = beautifulFace({ ...o, sex });
  const expressed = o.weights ? expressFace(o.weights, face) : o.expression ? expressEmotion(o.expression, o.intensity ?? 1, face) : undefined;
  const V0 = (expressed?.vertices ?? face.vertices) as Vec3[], N0 = face.vertices as Vec3[];
  const LM = (k: FaceLandmark, v = V0) => v[FACE_LANDMARKS[k]];
  // ---- Landmarks and head measures (head space, mm, y up, z toward the camera) --------------------------------------------------
  const ec = eyeCentres(N0), pupilY = (ec.L[1] + ec.R[1]) / 2, sn = LM("subnasale", N0), me = LM("menton", N0), gl = LM("glabella", N0);
  const tragionY = (pupilY + sn[1]) / 2 - 2, headTop = tragionY + ans("tragiontopofhead", sex), headHalfW = ans("headbreadth", sex) / 2, headLen = ans("headlength", sex);
  const zyHalf = Math.abs(LM("zygion.L", N0)[0]);
  // ---- Assemble the mesh: face (minus the triangles over the eye openings and the mouth), cranium, neck, shoulders ------------
  const P: number[] = [], Nn: number[] = [], tris: number[] = [], triMat: number[] = [];
  // The face mask without the triangles over the eye openings and the mouth, smoothed by two levels of Loop subdivision
  // (the openings stay exact as boundaries), so silhouettes and shading are smooth at portrait size.
  const faceTris0: number[] = [], allTris = Array.from(face.mesh.faces);
  for (let t = 0; t < allTris.length / 3; t++) {
    const a = allTris[t * 3], b = allTris[t * 3 + 1], c = allTris[t * 3 + 2];
    // a triangle over an eye opening joins the upper and lower lids; one lying along a single lid is skin and stays
    const inEye = (s2: "L" | "R") => EYE_SETS[s2].has(a) && EYE_SETS[s2].has(b) && EYE_SETS[s2].has(c) && ![a, b, c].every(i => LID_SETS.upper[s2].has(i)) && ![a, b, c].every(i => LID_SETS.lower[s2].has(i));
    if (inEye("L") || inEye("R") || (MOUTH_SET.has(a) && MOUTH_SET.has(b) && MOUTH_SET.has(c))) continue;
    faceTris0.push(a, b, c);
  }
  const flat = (vs: readonly Vec3[]) => { const f2 = new Float64Array(vs.length * 3); vs.forEach((q, i) => { f2[i * 3] = q[0]; f2[i * 3 + 1] = q[1]; f2[i * 3 + 2] = q[2]; }); return f2; };
  const sub1 = loopSubdivide([flat(V0), flat(N0)], faceTris0), sub2 = loopSubdivide(sub1.pos, sub1.tris);
  // cranium: an ellipsoid from tragion − 45 mm to the head top, its front 6 mm behind the brow
  const ay = (headTop - (tragionY - 45)) / 2, cyE = headTop - ay, az = headLen / 2, czE = gl[2] - 6 - az, ax = headHalfW;
  // The face mask ends below the hairline. A strip of skin grows from its top edge up and round the forehead and
  // temples until it lies on the cranium, sharing the mask's edge vertices, so the forehead is one surface.
  const onCranium = (p: Vec3): Vec3 => {
    const dx = p[0], dy = p[1] - cyE, dz = p[2] - czE, r = Math.sqrt((dx / ax) ** 2 + (dy / ay) ** 2 + (dz / az) ** 2) || 1, k = 1 / r;
    const q: Vec3 = [dx * k, cyE + dy * k, czE + dz * k], nq = norm3([q[0] / (ax * ax), (q[1] - cyE) / (ay * ay), (q[2] - czE) / (az * az)]);
    return [q[0] + nq[0] * 0.3, q[1] + nq[1] * 0.3, q[2] + nq[2] * 0.3];
  };
  const strip = foreheadStrip(sub2.pos[0], sub2.pos[1], sub2.tris, Math.max(ec.L[1], ec.R[1]) + 6, onCranium);
  const FV = strip.E, FN0 = strip.N, faceTris = strip.tris, nFace = FV.length / 3;
  // The nasal base: the fitted face leaves two round cups facing forward where the nostrils are (real nostrils open
  // downward and barely show from the front). Smooth the vertices round the alar wings and the nostrils (a local
  // Laplacian, faded out at the region's edge) so the nose base is one soft form.
  {
    const al = LM("alare.L", N0), snb = LM("subnasale", N0), halfW = Math.abs(al[0]) + 3, nbr: number[][] = Array.from({ length: nFace }, () => []);
    for (let t = 0; t < faceTris.length / 3; t++) for (let e2 = 0; e2 < 3; e2++) { const a = faceTris[t * 3 + e2], b = faceTris[t * 3 + ((e2 + 1) % 3)]; if (a < nFace && b < nFace) { nbr[a].push(b); nbr[b].push(a); } }
    const wgt = new Float64Array(nFace);
    for (let i = 0; i < nFace; i++) {
      const x = FV[i * 3], y = FV[i * 3 + 1], z = FV[i * 3 + 2];
      const inX = 1 - smoothstep(halfW - 3, halfW, Math.abs(x)), inY = smoothstep(snb[1] - 4, snb[1] - 1, y) * (1 - smoothstep(snb[1] + 8, snb[1] + 11, y)), front = smoothstep(snb[2] - 14, snb[2] - 8, z);
      wgt[i] = inX * inY * front;
    }
    for (let it = 0; it < 30; it++) {
      const next = Float64Array.from(FV);
      for (let i = 0; i < nFace; i++) {
        if (wgt[i] < 0.01 || !nbr[i].length) continue;
        let sx = 0, sy = 0, sz = 0;
        for (const j of nbr[i]) { sx += FV[j * 3]; sy += FV[j * 3 + 1]; sz += FV[j * 3 + 2]; }
        const k = nbr[i].length, lam = 0.6 * wgt[i];
        next[i * 3] += (sx / k - FV[i * 3]) * lam; next[i * 3 + 1] += (sy / k - FV[i * 3 + 1]) * lam; next[i * 3 + 2] += (sz / k - FV[i * 3 + 2]) * lam;
      }
      FV.set(next);
    }
  }
  /** A chain of original vertices expanded through both levels' edge midpoints (exact opening boundaries). */
  const expand = (chain: readonly number[]) => { const c1: number[] = [chain[0]]; for (let k = 1; k < chain.length; k++) { const m = sub1.mid.get(ekey(chain[k - 1], chain[k])); if (m !== undefined) c1.push(m); c1.push(chain[k]); }
    const c2: number[] = [c1[0]]; for (let k = 1; k < c1.length; k++) { const m = sub2.mid.get(ekey(c1[k - 1], c1[k])); if (m !== undefined) c2.push(m); c2.push(c1[k]); } return c2; };
  const nPos = (i: number): Vec3 => [FN0[i * 3], FN0[i * 3 + 1], FN0[i * 3 + 2]];
  for (let i = 0; i < nFace; i++) P.push(FV[i * 3], FV[i * 3 + 1], FV[i * 3 + 2]);
  for (let t = 0; t < faceTris.length / 3; t++) { tris.push(faceTris[t * 3], faceTris[t * 3 + 1], faceTris[t * 3 + 2]); triMat.push(0); }
  {
    const fn = new Float64Array(nFace * 3);
    for (let t = 0; t < faceTris.length / 3; t++) {
      const a = faceTris[t * 3], b = faceTris[t * 3 + 1], c = faceTris[t * 3 + 2];
      const ax = FV[b * 3] - FV[a * 3], ay = FV[b * 3 + 1] - FV[a * 3 + 1], az = FV[b * 3 + 2] - FV[a * 3 + 2], bx = FV[c * 3] - FV[a * 3], by = FV[c * 3 + 1] - FV[a * 3 + 1], bz = FV[c * 3 + 2] - FV[a * 3 + 2];
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      for (const i of [a, b, c]) { fn[i * 3] += nx; fn[i * 3 + 1] += ny; fn[i * 3 + 2] += nz; }
    }
    let sz = 0; for (let i = 0; i < nFace; i++) sz += fn[i * 3 + 2];
    const sg = sz < 0 ? -1 : 1;
    for (let i = 0; i < nFace; i++) { const n = norm3([fn[i * 3] * sg, fn[i * 3 + 1] * sg, fn[i * 3 + 2] * sg]); Nn.push(n[0], n[1], n[2]); }
  }
  const addVert = (x: number, y: number, z: number, n: Vec3) => { P.push(x, y, z); Nn.push(n[0], n[1], n[2]); return P.length / 3 - 1; };
  {
    const NU = 96, NV = 56, base = P.length / 3;
    // Where the face mask covers the cranium the cranium stays at least 3 mm behind it: in the eye sockets its front
    // would otherwise poke through the recessed skin as flat discs beside the eyes; behind the face it still closes
    // the head.
    const maskFront = faceHeightField(sub2.pos[1], me[1] - 12, face.hairlineY + 44), craniumTri0 = tris.length / 3;
    for (let j = 0; j <= NV; j++) for (let i = 0; i < NU; i++) {
      const th = (j / NV) * Math.PI, ph = (i / NU) * Math.PI * 2, x = ax * Math.sin(th) * Math.sin(ph), y = cyE + ay * Math.cos(th);
      let z = czE + az * Math.sin(th) * Math.cos(ph);
      if (z > czE) {
        // (the sockets are deeper than the skin round them: well back there)
        const mf = maskFront(x, y), nearEye = Math.min(Math.hypot(x - ec.L[0], (y - ec.L[1]) * 1.4), Math.hypot(x - ec.R[0], (y - ec.R[1]) * 1.4)) < 24;
        if (Number.isFinite(mf)) z = Math.min(z, mf - (nearEye ? 14 : 3));
      }
      addVert(x, y, z, norm3([x / (ax * ax), (y - cyE) / (ay * ay), (z - czE) / (az * az)]));
    }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
      const a = base + j * NU + i, b = base + j * NU + ((i + 1) % NU), c = a + NU, d = b + NU;
      tris.push(a, c, b, b, c, d); triMat.push(1, 1);
    }
    // normals from the (reshaped) surface, oriented like the ellipsoid's
    const acc = new Float64Array((P.length / 3 - base) * 3);
    for (let t = craniumTri0; t < tris.length / 3; t++) {
      const [a, b, c] = [tris[t * 3], tris[t * 3 + 1], tris[t * 3 + 2]];
      const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2], vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const v of [a, b, c]) { acc[(v - base) * 3] += nx; acc[(v - base) * 3 + 1] += ny; acc[(v - base) * 3 + 2] += nz; }
    }
    for (let v = base; v < P.length / 3; v++) {
      let n = norm3([acc[(v - base) * 3], acc[(v - base) * 3 + 1], acc[(v - base) * 3 + 2]]);
      if (n[0] * Nn[v * 3] + n[1] * Nn[v * 3 + 1] + n[2] * Nn[v * 3 + 2] < 0) n = [-n[0], -n[1], -n[2]];
      Nn[v * 3] = n[0]; Nn[v * 3 + 1] = n[1]; Nn[v * 3 + 2] = n[2];
    }
  }
  // neck: an elliptic cylinder behind the jaw
  // The throat sits about 34 mm behind the chin; the neck's sides lie behind the jaw angles.
  const neckRx = 45 + 9 * sex, neckRz = 42 + 7 * sex, neckCz = me[2] - 34 - neckRz, neckTop = tragionY - 10, neckBot = me[1] - 105;
  {
    const NU = 48, NV = 14, base = P.length / 3;
    for (let j = 0; j <= NV; j++) for (let i = 0; i < NU; i++) {
      const ph = (i / NU) * Math.PI * 2, y = neckTop + (neckBot - neckTop) * (j / NV), flare = 1 + 0.12 * Math.max(0, (me[1] - 40 - y) / 120);
      const x = neckRx * flare * Math.sin(ph), z = neckCz + neckRz * Math.cos(ph);
      addVert(x, y, z, norm3([Math.sin(ph) / neckRx, 0, Math.cos(ph) / neckRz]));
    }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
      const a = base + j * NU + i, b = base + j * NU + ((i + 1) % NU), c = a + NU, d = b + NU;
      tris.push(a, c, b, b, c, d); triMat.push(2, 2);
    }
  }
  // shoulders and chest in cloth: shoulder line sloping down from the neck, a scoop or crew neckline
  const shoulderHalf = 165 + 30 * sex, shoulderY = me[1] - 58, chestCz = neckCz - 12;
  {
    const NU = 64, NV = 10, base = P.length / 3, scoop = 22 - 14 * sex;
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
      // the trapezius slopes from the side of the neck to the shoulder; the garment's neckline dips in front
      const u = i / NU * 2 - 1, x = u * shoulderHalf, ax2 = Math.abs(x), trap = ax2 < neckRx ? 0 : 0.22 * (ax2 - neckRx) + 0.0009 * Math.max(0, ax2 - neckRx - 60) ** 2;
      const neckline = ax2 < neckRx * 1.5 ? scoop * Math.cos((x / (neckRx * 1.5)) * Math.PI / 2) ** 2 : 0;
      // the chest comes forward of the neck below the neckline (the neck ends under the garment, not in front of it)
      const yTop = shoulderY + 18 - trap - neckline, y = yTop - (j / NV) * 160, zc = chestCz + (neckRz + 40) * Math.sqrt(Math.max(0, 1 - u * u)) - 20;
      addVert(x, y, zc, norm3([u * 0.9, j === 0 ? 0.6 : 0.05, Math.sqrt(Math.max(0.05, 1 - u * u))]));
    }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
      const a = base + j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1;
      tris.push(a, c, b, b, c, d); triMat.push(3, 3);
    }
  }
  const nV = P.length / 3;
  // ---- Head pose -----------------------------------------------------------------------------------------------------------------
  const yawR = ((o.yaw ?? 0) * Math.PI) / 180, pitchR = ((o.pitch ?? 0) * Math.PI) / 180, piv: Vec3 = [0, tragionY, gl[2] - 85];
  const rot = (p: Vec3, isBody: boolean): Vec3 => {
    // the head turns on the neck; the shoulders stay put
    if (isBody) return p;
    let x = p[0], y = p[1] - piv[1], z = p[2] - piv[2];
    const cy = Math.cos(pitchR), sy = Math.sin(pitchR);
    [y, z] = [y * cy - z * sy, y * sy + z * cy];
    const cx = Math.cos(yawR), sxx = Math.sin(yawR);
    [x, z] = [x * cx + z * sxx, -x * sxx + z * cx];
    return [x, y + piv[1], z + piv[2]];
  };
  const isBodyV = new Uint8Array(nV);
  for (let t = 0; t < triMat.length; t++) if (triMat[t] === 3) for (let k = 0; k < 3; k++) isBodyV[tris[t * 3 + k]] = 1;
  const PX = new Float64Array(nV), PY = new Float64Array(nV), PZ = new Float64Array(nV), NX = new Float64Array(nV), NY = new Float64Array(nV), NZ = new Float64Array(nV);
  for (let i = 0; i < nV; i++) {
    const p = rot([P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], !!isBodyV[i]), nn = rot([Nn[i * 3] + piv[0], Nn[i * 3 + 1] + piv[1], Nn[i * 3 + 2] + piv[2]], !!isBodyV[i]);
    PX[i] = p[0]; PY[i] = p[1]; PZ[i] = p[2];
    const nr = isBodyV[i] ? [Nn[i * 3], Nn[i * 3 + 1], Nn[i * 3 + 2]] as Vec3 : norm3([nn[0] - piv[0], nn[1] - piv[1], nn[2] - piv[2]]);
    NX[i] = nr[0]; NY[i] = nr[1]; NZ[i] = nr[2];
  }
  const rotH = (p: Vec3) => rot(p, false);
  // ---- Camera ------------------------------------------------------------------------------------------------------------------
  // a portrait from the top of the head to the chest, or a close-up of the eyes (as wide as the outer corners plus 34 mm)
  const exW = Math.abs(LM("exocanthion.L", N0)[0] - LM("exocanthion.R", N0)[0]), eyesH = ((exW + 34) * H) / W;
  const frameTop = o.framing === "eyes" ? pupilY + 4 + eyesH / 2 : headTop + 24, frameBot = o.framing === "eyes" ? pupilY + 4 - eyesH / 2 : me[1] - 112, frameH = frameTop - frameBot, D = 1150, yc = (frameTop + frameBot) / 2;
  const f = (h * (D - 40)) / frameH;
  const proj = (x: number, y: number, z: number): [number, number] => [w / 2 + (f * x) / (D - z), h / 2 - (f * (y - yc)) / (D - z)];
  const mmPerPx = (D - 40) / f;
  const SX = new Float32Array(nV), SY = new Float32Array(nV), SZ = new Float32Array(nV);
  for (let i = 0; i < nV; i++) { const [x, y] = proj(PX[i], PY[i], PZ[i]); SX[i] = x; SY[i] = y; SZ[i] = PZ[i]; }
  const gbuf = rasterizeTriangles(w, h, SX, SY, SZ, tris);
  // ---- Lights (toward the light, camera space) ----------------------------------------------------------------------------------
  // Default keys from portrait practice: Paramount/loop (high, near the camera axis) for women, loop/Rembrandt for men.
  // (the key a little to the side models the face's planes: the cheekbone lit, the far cheek and the jaw in shadow)
  const kaz = ((o.keyAzimuth ?? (-30 - 12 * sex)) * Math.PI) / 180, kel = ((o.keyElevation ?? (42 - 6 * sex)) * Math.PI) / 180;
  const Lkey = norm3([Math.sin(kaz) * Math.cos(kel), Math.sin(kel), Math.cos(kaz) * Math.cos(kel)]);
  const Lfill = norm3([0.62, -0.05, 0.78]), Lrim = norm3([0.75, 0.35, -0.55]), Lsky: Vec3 = [0, 1, 0];
  // A studio portrait's ratio: a soft key, a fill about a tenth of it so the shadow side keeps its shape, a cool sky, a
  // warm bounce from below, a rim from behind.
  const keyI: RGB3 = [3.0, 2.86, 2.72], fillI: RGB3 = [0.17, 0.18, 0.205], rimI: RGB3 = [0.95, 0.94, 0.98], skyI: RGB3 = [0.15, 0.16, 0.19], bounceI: RGB3 = [0.1, 0.085, 0.07];
  const camPos: Vec3 = [0, yc, D];
  // ---- Depth maps along directions: the key light's shadow and ambient occlusion ------------------------------------------------
  const occluderTris = tris.filter((_, i) => triMat[Math.floor(i / 3)] !== 1 || true), shadowHalf = Math.max(headTop - me[1] + 120, 2 * shoulderHalf) / 2 + 10;
  function depthMap(dir: Vec3, res: number) {
    // orthographic along dir, square covering the head and neck
    const up: Vec3 = Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], r = norm3([up[1] * dir[2] - up[2] * dir[1], up[2] * dir[0] - up[0] * dir[2], up[0] * dir[1] - up[1] * dir[0]]);
    const u = norm3([dir[1] * r[2] - dir[2] * r[1], dir[2] * r[0] - dir[0] * r[2], dir[0] * r[1] - dir[1] * r[0]]);
    const cx = 0, cy = (headTop + me[1] - 90) / 2, half = shadowHalf;
    const lx = new Float32Array(nV), ly = new Float32Array(nV), lz = new Float32Array(nV);
    for (let i = 0; i < nV; i++) {
      const px = PX[i] - cx, py = PY[i] - cy, pz = PZ[i];
      lx[i] = ((px * r[0] + py * r[1] + pz * r[2]) / half * 0.5 + 0.5) * res; ly[i] = (0.5 - (px * u[0] + py * u[1] + pz * u[2]) / half * 0.5) * res; lz[i] = px * dir[0] + py * dir[1] + pz * dir[2];
    }
    const buf = rasterizeTriangles(res, res, lx, ly, lz, occluderTris);
    const lookup = (p: Vec3) => { const px = p[0] - cx, py = p[1] - cy, pz = p[2]; return [((px * r[0] + py * r[1] + pz * r[2]) / half * 0.5 + 0.5) * res, (0.5 - (px * u[0] + py * u[1] + pz * u[2]) / half * 0.5) * res, px * dir[0] + py * dir[1] + pz * dir[2]]; };
    return { buf, lookup, res };
  }
  // the key's shadow map: finer for a close-up (about 0.25 mm per texel on the face) than for a portrait
  const shadow = depthMap(Lkey, o.framing === "eyes" ? 1600 : 900);
  // The key is a softbox of about 20° seen from the face: a shadow's edge widens with the distance from the surface
  // that casts it (about 0.35 of it), sharp where the shadow touches its caster and soft at the end of the nose's
  // shadow (percentage-closer soft shadows: a blocker search, then sixteen Poisson-disc taps, turned per point).
  const POISSON: [number, number][] = [[-0.94, -0.4], [0.95, -0.77], [-0.09, -0.93], [0.34, 0.29], [-0.92, 0.46], [-0.82, 0.15], [0.97, 0.76], [0.44, -0.25], [0.53, 0.6], [-0.26, 0.6], [0.66, -0.44], [-0.48, -0.75], [0.2, -0.53], [-0.33, -0.05], [-0.06, 0.94], [0.27, 0.86]];
  const penumbra = 1.0 / ((2 * shadowHalf) / shadow.res);
  const texMm = (2 * shadowHalf) / shadow.res, search = 6 / texMm;
  const lit = (p: Vec3, bias: number) => {
    const [x, y, z] = shadow.lookup(p), res = shadow.res, dep = shadow.buf.depth;
    const a = (Math.sin(p[0] * 12.9898 + p[1] * 78.233 + p[2] * 37.719) * 43758.5453) % 1 * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    let nb = 0, sumD = 0;
    for (const [u0, v0] of POISSON) {
      const u = u0 * ca - v0 * sa, v = u0 * sa + v0 * ca, xi = Math.floor(x + u * search), yi = Math.floor(y + v * search);
      if (xi < 0 || yi < 0 || xi >= res || yi >= res) continue;
      const d = dep[yi * res + xi];
      if (d > z + bias) { nb++; sumD += d - z; }
    }
    if (nb === 0) return 1;
    const pen = Math.min(7, Math.max(penumbra * texMm, (0.35 * sumD) / nb)) / texMm;
    let s = 0;
    for (const [u0, v0] of POISSON) {
      const u = u0 * ca - v0 * sa, v = u0 * sa + v0 * ca, xi = Math.floor(x + u * pen), yi = Math.floor(y + v * pen);
      if (xi < 0 || yi < 0 || xi >= res || yi >= res) { s++; continue; }
      if (!(dep[yi * res + xi] > z + bias)) s++;
    }
    return s / POISSON.length;
  };
  // ---- Hair: groomed on this head (cached), and its density along the key light (it shadows the skin) ---------------------------
  const styleAsked = o.hairStyle ?? look?.hairStyle;
  const styleId = { short: "short-crop", long: "long-straight" }[styleAsked ?? ""] ?? styleAsked ?? (sex > 0.5 ? "short-crop" : "long-straight");
  // the face's front as a height field (2 mm cells) from the neutral face: fringes rest on it, side hair passes beside it
  const FF = faceHeightField(FN0, me[1] - 12, face.hairlineY + 44);
  const hairHead: HairHead = { centre: [0, cyE, czE], radii: [ax, ay, az], hairlineY: face.hairlineY, browY: (LM("brow-mid.L", N0)[1] + LM("brow-mid.R", N0)[1]) / 2, tragionY, chinY: me[1], faceHalf: zyHalf,
    eyeY: pupilY, faceZ: gl[2], earX: headHalfW + 1, earZ: czE + az * 0.08, neck: { rx: neckRx, rz: neckRz, cz: neckCz }, shoulderY, shoulderHalf, sex,
    faceFront: FF, shoulderTop: x => shoulderY + 18 - (Math.abs(x) < neckRx ? 0 : 0.22 * (Math.abs(x) - neckRx) + 0.0009 * Math.max(0, Math.abs(x) - neckRx - 60) ** 2),
    // the garment's own front (as built above), so hanging hair lies on the shoulders and chest, not inside them
    chestFront: x => chestCz + (neckRz + 40) * Math.sqrt(Math.max(0, 1 - (x / shoulderHalf) ** 2)) - 20 };
  // strands drawn: as asked, or by the picture's size (a thumbnail needs fewer than a large portrait)
  // (a real head has about 100,000 hairs; at 600 px wide and up, 80,000 strands read as fine hair, not streaky blocks)
  const hairStrands = Math.round(o.hairStrands ?? Math.min(W >= 600 ? 80000 : 40000, Math.max(12000, W * H * 0.25)));
  const groomKey = JSON.stringify([styleId, fringe, parting, hairStrands, hairLength, hairCurl, seed, hairHead.radii.map(Math.round), Math.round(hairHead.hairlineY), Math.round(hairHead.browY), Math.round(gl[2]), Math.round(zyHalf), Math.round(sex * 10)]);
  let groom = GROOMS.get(groomKey);
  if (!groom) {
    groom = groomHair(hairHead, { style: findHairStyle(styleId), fringe, parting, strands: hairStrands, lengthScale: hairLength, curl: hairCurl, seed });
    if (GROOMS.size > 6) GROOMS.clear();
    GROOMS.set(groomKey, groom);
  }
  // the hair's density map toward the key light: 320 cells, fewer only for small previews
  const densityRes = Math.min(320, Math.max(128, Math.round(Math.max(w, h) * 0.8)));
  // in moving air the groomed hair (cached) takes this frame's pose
  if (o.hairMotion) groom = moveHair(groom, hairHead, o.hairMotion);
  const hairRot = rotateGroom(groom, rotH), hairKeyMap = hairDensityMap(groom, hairRot, Lkey, densityRes, 3.5);
  // The hair's shadow on the skin: fibre coverage between the first skin along the key and the light, in the shadow
  // map's frame. The key is a softbox of about 20°, so a shadow's edge widens with the hair's distance from the skin
  // (about 0.35 of it): coverage is gathered in four layers by that distance and each is blurred by its own penumbra
  // (hair lying on the skin casts a crisp edge, a curtain hanging 3 cm off the cheek a soft one).
  const hairOnSkin = new Float32Array(shadow.res * shadow.res);
  {
    const res = shadow.res, cellMm = (2 * shadowHalf) / res, fibreEff = (HAIR_PHYSICS.fibreDiameter.value * HAIR_PHYSICS.scalpCount.value) / Math.max(1, groom.starts.length);
    const LAYERS = [{ upTo: 6, sigma: 1.0 }, { upTo: 18, sigma: 2.6 }, { upTo: 40, sigma: 5 }, { upTo: Infinity, sigma: 9 }];
    const layer = LAYERS.map(() => new Float32Array(res * res));
    for (let s2 = 0; s2 < groom.starts.length; s2++) {
      const st = groom.starts[s2], c = groom.counts[s2];
      for (let j = 1; j < c; j++) {
        const a = (st + j - 1) * 3, b = (st + j) * 3, m: Vec3 = [(hairRot[a] + hairRot[b]) / 2, (hairRot[a + 1] + hairRot[b + 1]) / 2, (hairRot[a + 2] + hairRot[b + 2]) / 2];
        const [x, y, z] = shadow.lookup(m), xi = Math.floor(x), yi = Math.floor(y);
        if (xi < 0 || yi < 0 || xi >= res || yi >= res) continue;
        const sd = shadow.buf.depth[yi * res + xi], gap = z - sd;
        // (texels with no skin behind them shadow nothing; blurred, they would spill over the face's edge)
        if (!Number.isFinite(sd) || !(gap > 0.6)) continue;
        const L = gap < 6 ? 0 : gap < 18 ? 1 : gap < 40 ? 2 : 3;
        layer[L][yi * res + xi] += (Math.hypot(hairRot[b] - hairRot[a], hairRot[b + 1] - hairRot[a + 1], hairRot[b + 2] - hairRot[a + 2]) * fibreEff) / (cellMm * cellMm);
      }
    }
    LAYERS.forEach((l, k) => { const bl = gaussianBlur(layer[k], res, res, 1, l.sigma / cellMm); for (let i = 0; i < bl.length; i++) hairOnSkin[i] += bl[i]; });
  }
  /**
   * Hair fibre coverage over a point of skin, along the key light (real-head units: 1 = one full layer). Only skin the
   * key reaches has hair between it and the light: a point behind the first skin (a cheek turned away) is shadowed by
   * the head already, and must not take on the coverage of the forehead in front of it.
   */
  const hairCov = (p: Vec3) => {
    const [x, y, z] = shadow.lookup(p), res = shadow.res, fx = x - 0.5, fy = y - 0.5, xi = Math.floor(fx), yi = Math.floor(fy), u = fx - xi, v = fy - yi;
    const at = (i: number, j: number) => hairOnSkin[Math.min(res - 1, Math.max(0, j)) * res + Math.min(res - 1, Math.max(0, i))];
    const behind = shadow.buf.depth[Math.min(res - 1, Math.max(0, Math.round(fy))) * res + Math.min(res - 1, Math.max(0, Math.round(fx)))] - z;
    const reach = 1 - smoothstep(4, 12, behind);
    return reach * ((at(xi, yi) * (1 - u) + at(xi + 1, yi) * u) * (1 - v) + (at(xi, yi + 1) * (1 - u) + at(xi + 1, yi + 1) * u) * v);
  };
  // Hair over skin: a layer of dark fibres lets little light through (more melanin, less; estimated: about a quarter
  // through one full layer of brown hair, a tenth of black), and hair lying close over the skin also blocks the sky and
  // fill, so the skin under a fringe is in shade and the fringe reads as a solid mass, not a veil
  const underHair = (p: Vec3) => Math.max(0.1, Math.exp(-(0.55 + 0.11 * Math.min(8, Math.max(0, hairEu))) * hairCov(p)));
  const hairAmbient = (p: Vec3) => Math.max(0.35, Math.exp(-0.4 * hairCov(p)));
  // ambient occlusion per vertex from 22 directions over the front and upper hemisphere
  const ao = new Float32Array(nV).fill(1);
  {
    const dirs: Vec3[] = [];
    for (let k = 0; k < 22; k++) { const yy = 1 - (k + 0.5) / 22 * 1.3, r = Math.sqrt(Math.max(0, 1 - yy * yy)), ph = k * 2.39996; dirs.push(norm3([r * Math.cos(ph), yy, Math.abs(r * Math.sin(ph)) * 0.8 + 0.25])); }
    const acc = new Float32Array(nV), wsum = new Float32Array(nV);
    for (const d of dirs) {
      const dm = depthMap(d, 200);
      for (let i = 0; i < nV; i++) {
        const c = NX[i] * d[0] + NY[i] * d[1] + NZ[i] * d[2];
        if (c <= 0) continue;
        const [x, y, z] = dm.lookup([PX[i], PY[i], PZ[i]]), xi = Math.floor(x), yi = Math.floor(y);
        const vis = xi < 0 || yi < 0 || xi >= dm.res || yi >= dm.res ? 1 : dm.buf.depth[yi * dm.res + xi] > z + 2.2 ? 0 : 1;
        acc[i] += vis * c; wsum[i] += c;
      }
    }
    for (let i = 0; i < nV; i++) ao[i] = wsum[i] > 0 ? 0.16 + 0.84 * Math.pow(acc[i] / wsum[i], 1.6) : 1;
  }
  // ---- Skin colour zones per face vertex (neutral face, so they move with the expression) --------------------------------------
  const skinHex = o.skin ?? look?.skin ?? "#d8a98a";
  const zoneIds: SkinZone[] = ["forehead", "cheeks", "nose", "eyelids", "under-eye", "beard-shadow"];
  const zoneCol = zoneIds.map(z => linearOf(skinZoneColor(skinHex, z))), baseLin = linearOf(skinHex);
  const zoneW = new Float32Array(nV * zoneIds.length), tzone = new Float32Array(nV);
  // the skin-texture regions (skin-texture.ts) each face vertex belongs to
  const texIds = ["forehead", "nose", "cheek", "chin", "eyelid", "crow", "upper-lip"] as const, texRegions = texIds.map(findSkinRegion), texW = new Float32Array(nV * texIds.length);
  {
    const cb = { L: LM("cheekbone.L", N0), R: LM("cheekbone.R", N0) }, pr = LM("pronasale", N0), browY = (LM("brow-mid.L", N0)[1] + LM("brow-mid.R", N0)[1]) / 2;
    const g = (d: number, r: number) => Math.exp(-(d * d) / (2 * r * r));
    for (let i = 0; i < nFace; i++) {
      const [x, y] = nPos(i);
      const cheek = Math.max(...(["L", "R"] as const).map(s => g(Math.hypot(x - cb[s][0] * 0.88, (y - (cb[s][1] - 10)) * 1.2), 15)));
      const nose = g(Math.hypot(x - pr[0], (y - pr[1]) * 0.8), 10);
      const forehead = smoothstep(browY + 6, browY + 26, y);
      const lid = Math.max(...(["L", "R"] as const).map(s => g(Math.hypot((x - ec[s][0]) * 0.8, y - (ec[s][1] + 6)), 6))) * (y > ec.L[1] + 1 ? 1 : 0);
      const under = Math.max(...(["L", "R"] as const).map(s => g(Math.hypot((x - ec[s][0]) * 0.75, y - (ec[s][1] - 8)), 5.5)));
      const beard = sex * smoothstep(sn[1] + 2, sn[1] - 8, y) * (1 - g(Math.hypot(x, (y - LM("stomion", N0)[1]) * 1.6), 9)) * smoothstep(zyHalf * 0.98, zyHalf * 0.6, Math.abs(x) + Math.max(0, y - (sn[1] - 25)) * 1.3);
      // a healthy flush reads as attractive (redness, Little et al. 2011): the cheeks a little stronger on women
      const ws = [forehead * 0.7, cheek * (1.05 - 0.3 * sex), nose * 0.8, lid * 0.85, under * 0.65, beard * 0.75];
      ws.forEach((v, k) => (zoneW[i * zoneIds.length + k] = v));
      {
        const pg = LM("pogonion", N0), st = LM("stomion", N0), crowW = Math.max(...(["L", "R"] as const).map(s2 => g(Math.hypot(Math.abs(x) - Math.abs(LM(`exocanthion.${s2}`, N0)[0]) - 6, y - ec[s2][1]), 6)));
        const tw = [forehead, nose, Math.max(cheek, 0.25 * (1 - forehead)), g(Math.hypot(x * 0.8, y - pg[1]), 12), lid, crowW, g(Math.hypot(x * 0.6, y - (sn[1] + st[1]) / 2), 6)];
        tw.forEach((v2, k) => (texW[i * texIds.length + k] = v2));
      }
      tzone[i] = Math.max(forehead * 0.7 * (1 - smoothstep(10, 45, Math.abs(x))), g(Math.hypot(x, (y - (pr[1] + 12)) * 0.5), 9), g(Math.hypot(x * 1.5, y - LM("pogonion", N0)[1]), 10) * 0.6);
    }
  }
  // ---- Screen-space masks: lips, eye openings, mouth opening ---------------------------------------------------------------------
  const pv = (i: number): [number, number] => [SX[i], SY[i]];
  // the lips' outline: a smooth curve through the mesh's lip points, the upper and the lower lip each from corner to
  // corner (so the corners stay sharp and the lower lip is round, not a polygon), with a soft edge
  const lipPoly = [...catmullRom(LOOP("lips-upper").map(pv)), ...catmullRom(LOOP("lips-lower").slice().reverse().map(pv))];
  const lipMask = new Float32Array(w * h);
  fillPolygon(w, h, lipPoly, (i, c) => (lipMask[i] = c));
  lipMask.set(gaussianBlur(lipMask, w, h, 1, 0.22 / mmPerPx));
  // remove the mouth opening from the lip mask
  const mouthPoly = [...expand(INNER_UPPER_LIP).map(pv), ...expand(INNER_LOWER_LIP).slice().reverse().map(pv)], mouthMask = new Float32Array(w * h);
  fillPolygon(w, h, mouthPoly, (i, c) => (mouthMask[i] = c));
  const eyeMask = { L: new Float32Array(w * h), R: new Float32Array(w * h) }, eyePoly = { L: [] as [number, number][], R: [] as [number, number][] };
  for (const s of ["L", "R"] as const) { eyePoly[s] = [...expand(LOOP(`eye-upper.${s}`)).map(pv), ...expand(LOOP(`eye-lower.${s}`)).slice().reverse().map(pv)]; fillPolygon(w, h, eyePoly[s], (i, c) => (eyeMask[s][i] = c)); }
  // ---- Shade skin and cloth: irradiance (to be scattered), albedo and specular per pixel ---------------------------------------------
  const E = new Float32Array(w * h * 3), Alb = new Float32Array(w * h * 3), Spec = new Float32Array(w * h * 3), skinM = new Float32Array(w * h), solid = new Uint8Array(w * h);
  const paint = o.paint, Film = paint ? new Float32Array(w * h * 3) : null;
  paint?.prepare?.(N0);
  const ps: SkinPaintSample = { albedo: [0, 0, 0], film: [0, 0, 0], roughness: 0, specular: 1, sparkle: 0, tint: null };
  const cloth = linearOf(o.clothing ?? "#30343c"), lipBase = linearOf(skinZoneColor(skinHex, "lips"));
  const hairEu = o.hair?.eumelanin ?? look?.hair.eumelanin ?? (sex > 0.5 ? 1.6 : 1.3), hairPheo = o.hair?.pheomelanin ?? look?.hair.pheomelanin ?? 0.15, scalpHair = hairAlbedo(hairSigmaA(hairEu, hairPheo)) as unknown as RGB3;
  const rootCol: RGB3 = [scalpHair[0] * 0.8, scalpHair[1] * 0.8, scalpHair[2] * 0.8];
  // Which way the hair leaves the scalp, near each point: the groom's root segments (their first 25 mm) averaged in
  // 6 mm cells. The scalp under the hair shows fine streaks along it, and the hairline breaks into them.
  const FLOW_CELL = 6, flow = new Map<number, Vec3>();
  {
    const gp = groom.points, key3 = (x: number, y: number, z: number) => ((Math.floor(x / FLOW_CELL) + 512) * 1024 + (Math.floor(y / FLOW_CELL) + 512)) * 1024 + (Math.floor(z / FLOW_CELL) + 512);
    for (let s2 = 0; s2 < groom.starts.length; s2 += 2) {
      const st = groom.starts[s2], c = groom.counts[s2];
      let run = 0;
      for (let j = 1; j < c && run < 25; j++) {
        const a = (st + j - 1) * 3, b = (st + j) * 3, d: Vec3 = [gp[b] - gp[a], gp[b + 1] - gp[a + 1], gp[b + 2] - gp[a + 2]], l = Math.hypot(d[0], d[1], d[2]);
        run += l;
        const k = key3(gp[a], gp[a + 1], gp[a + 2]), f = flow.get(k);
        if (f) { f[0] += d[0]; f[1] += d[1]; f[2] += d[2]; } else flow.set(k, [d[0], d[1], d[2]]);
      }
    }
  }
  const flowAt = (q: Vec3): Vec3 | null => {
    let f: Vec3 = [0, 0, 0];
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const g = flow.get(((Math.floor(q[0] / FLOW_CELL) + dx + 512) * 1024 + (Math.floor(q[1] / FLOW_CELL) + dy + 512)) * 1024 + (Math.floor(q[2] / FLOW_CELL) + dz + 512));
      if (g) f = [f[0] + g[0], f[1] + g[1], f[2] + g[2]];
    }
    const l = Math.hypot(f[0], f[1], f[2]);
    return l > 1e-6 ? [f[0] / l, f[1] / l, f[2] / l] : null;
  };
  // natural lip colour: rosier and deeper than the skin zone's average (women's a little more saturated)
  const wrk = { browY: (LM("brow-mid.L", N0)[1] + LM("brow-mid.R", N0)[1]) / 2, hairlineY: face.hairlineY, eyeY: pupilY, outerCorner: Math.abs(LM("exocanthion.L", N0)[0]), neckTop: me[1] - 25,
    alar: [Math.abs(LM("alare.L", N0)[0]), LM("alare.L", N0)[1]] as [number, number], mouth: [Math.abs(LM("cheilion.L", N0)[0]), LM("cheilion.L", N0)[1]] as [number, number] };
  const neckRegion = findSkinRegion("neck"), frk = { noseY: LM("pronasale", N0)[1], cheekY: (LM("cheekbone.L", N0)[1] + LM("cheekbone.R", N0)[1]) / 2 + 2, halfWidth: zyHalf };
  const makeup = o.makeup ?? (o.paint || sex >= 0.5 ? "none" : "natural"), mk = makeup === "glamour" ? 1 : makeup === "natural" ? 0.55 : 0;
  // natural lips: rosier and deeper than the skin round them; lipstick mixed over them
  //   (men's lips nearer the skin's colour, and darker skin's lips browner: they carry its melanin too)
  const skinLum = 0.2126 * baseLin[0] + 0.7152 * baseLin[1] + 0.0722 * baseLin[2], rosy = (1 - 0.55 * sex) * (0.5 + 0.5 * smoothstep(0.04, 0.25, skinLum));
  const lipMel = mixC(lipBase, [baseLin[0] * 0.8, baseLin[1] * 0.62, baseLin[2] * 0.68], 0.75 * (1 - smoothstep(0.04, 0.25, skinLum)));
  const lipNat: RGB3 = mixC(lipMel, [lipMel[0], lipMel[1] * 0.6, lipMel[2] * 0.66], rosy);
  const stick = linearOf(o.lipstick ?? (makeup === "glamour" ? "#9e1c26" : "#b0545c"));
  const lipLin: RGB3 = mixC(lipNat, stick, o.lipstick ? 0.85 : makeup === "glamour" ? 0.85 : makeup === "natural" ? 0.45 : 0);
  const ggx = (n: Vec3, v: Vec3, l: Vec3, a: number) => {
    const hv = norm3([v[0] + l[0], v[1] + l[1], v[2] + l[2]]), nh = Math.max(0, dot3(n, hv)), nl = Math.max(0, dot3(n, l)), nv = Math.max(1e-3, dot3(n, v)), vh = Math.max(0, dot3(v, hv));
    const a2 = a * a, dd = nh * nh * (a2 - 1) + 1, Dd = a2 / (Math.PI * dd * dd), k = a / 2, G = (nl / (nl * (1 - k) + k)) * (nv / (nv * (1 - k) + k)), F = 0.028 + (1 - 0.028) * Math.pow(1 - vh, 5);
    return (Dd * G * F) / (4 * nv) ;
  };
  const tri3 = tris;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, t = gbuf.tri[i];
    if (t < 0) continue;
    solid[i] = 1;
    const a = tri3[t * 3], b = tri3[t * 3 + 1], c = tri3[t * 3 + 2], b1 = gbuf.b1[i], b2 = gbuf.b2[i], b0 = 1 - b1 - b2, mat = triMat[t];
    const p: Vec3 = [PX[a] * b0 + PX[b] * b1 + PX[c] * b2, PY[a] * b0 + PY[b] * b1 + PY[c] * b2, PZ[a] * b0 + PZ[b] * b1 + PZ[c] * b2];
    let n = norm3([NX[a] * b0 + NX[b] * b1 + NX[c] * b2, NY[a] * b0 + NY[b] * b1 + NY[c] * b2, NZ[a] * b0 + NZ[b] * b1 + NZ[c] * b2]);
    // the skin's surface (skin-texture.ts): furrows, pores, fine wrinkles and sheen by region and age, bending the
    // normal so light breaks up as it does on real skin; detail finer than about two pixels fades out
    let skinDark = 0, skinRed = 0, skinSheen = 1;
    if (mat === 0 || mat === 2 || (mat === 1 && p[2] > czE)) {
      let reg = texRegions[0];
      if (mat === 0) { const parts = texRegions.map((region, k) => ({ region, weight: texW[a * texIds.length + k] * b0 + texW[b * texIds.length + k] * b1 + texW[c * texIds.length + k] * b2 })); reg = blendSkinRegions(parts); }
      else if (mat === 2) reg = neckRegion;
      // the skin's own coordinates: across the face from the front, round the side from the side (no stretching)
      const hx0 = P[a * 3] * b0 + P[b * 3] * b1 + P[c * 3] * b2, hy0 = P[a * 3 + 1] * b0 + P[b * 3 + 1] * b1 + P[c * 3 + 1] * b2, hz0 = P[a * 3 + 2] * b0 + P[b * 3 + 2] * b1 + P[c * 3 + 2] * b2;
      const nx0 = Math.abs(Nn[a * 3] * b0 + Nn[b * 3] * b1 + Nn[c * 3] * b2), side = smoothstep(0.45, 0.8, nx0);
      const sx = hx0 * (1 - side) + (Math.sign(hx0) * 90 - hz0) * side, sy = hy0;
      const so = { age: o.age ?? 30, footprint: mmPerPx * SS, seed }, e2 = Math.max(0.03, mmPerPx * 0.6), age = o.age ?? 30;
      // the microrelief in the skin's own coordinates; the face's wrinkles and folds where they are on the face (front view)
      const s0 = skinSurface(reg, sx, sy, so), mh = (qx: number, qy: number) => skinSurface(reg, qx, qy, so).height;
      const wh = (qx: number, qy: number) => (mat !== 1 ? faceWrinkles(qx, qy, age, wrk, seed) : 0), w0 = wh(hx0, hy0);
      const gx2 = (mh(sx + e2, sy) - s0.height) / e2 + (wh(hx0 + e2, hy0) - w0) / e2, gy2 = (mh(sx, sy + e2) - s0.height) / e2 + (wh(hx0, hy0 + e2) - w0) / e2;
      n = norm3([n[0] - gx2 * 0.8, n[1] - gy2 * 0.8, n[2]]);
      skinDark = s0.darken + Math.min(0.25, Math.max(0, -w0 * 1.2)); skinRed = s0.redden; skinSheen = reg.sheen;
    }
    const v = norm3([camPos[0] - p[0], camPos[1] - p[1], camPos[2] - p[2]]), occ = ao[a] * b0 + ao[b] * b1 + ao[c] * b2;
    // the roots: where hair covers the scalp (and the skin above the hairline) it shows the hair's colour, lit like the
    // hair mass it stands for rather than shadowed like skin under hair
    const ph: Vec3 = [P[a * 3] * b0 + P[b * 3] * b1 + P[c * 3] * b2, P[a * 3 + 1] * b0 + P[b * 3 + 1] * b1 + P[c * 3 + 1] * b2, P[a * 3 + 2] * b0 + P[b * 3 + 2] * b1 + P[c * 3 + 2] * b2];
    let cover = mat <= 1 ? scalpCover(hairHead, groom.style, ph) : 0, streak = 1;
    const partW = mat <= 1 ? partLine(hairHead, groom.style, ph) : 0;
    if (cover > 0) {
      // streaks along the hair's flow (clumps about 0.8 mm across, 7 mm long), and a hairline that breaks into them:
      // fine hairs reaching out of the cover instead of a smooth fade
      const fd = flowAt(ph);
      if (fd) {
        const nn = norm3([ph[0] / (ax * ax), (ph[1] - cyE) / (ay * ay), (ph[2] - czE) / (az * az)]), side = norm3([nn[1] * fd[2] - nn[2] * fd[1], nn[2] * fd[0] - nn[0] * fd[2], nn[0] * fd[1] - nn[1] * fd[0]]);
        const along = ph[0] * fd[0] + ph[1] * fd[1] + ph[2] * fd[2], across = ph[0] * side[0] + ph[1] * side[1] + ph[2] * side[2];
        // straight hair shows long streaks; curls and coils (types IV–VIII) show round clumps a couple of millimetres across
        const curlK = Math.min(1, Math.max(0, ((hairCurl ?? 1) - 3) / 4));
        const tl = 0.6 * fbm(seed + 41, across / 0.8, along / 7, 2) + 0.4 * fbm(seed + 43, across / 0.35, along / 3, 1);
        const tc = 0.55 * fbm(seed + 47, across / 1.1, along / 1.1, 2) + 0.45 * Math.abs(Math.sin((across + 2 * fbm(seed + 53, across / 2, along / 2, 1)) * 2.6) * Math.sin((along + 2 * fbm(seed + 59, along / 2, across / 2, 1)) * 2.6));
        const t = tl * (1 - curlK) + tc * curlK;
        streak = 0.78 - 0.1 * curlK + (0.44 + 0.3 * curlK) * t;
        if (cover < 1) cover = smoothstep(0.15, 0.85, cover + 0.4 * (t - 0.5));
      }
    }
    // the shadow's bias grows where the light grazes the skin (no self-shadowing ripples on the brow and lids)
    const nlK0 = dot3(n, Lkey), sKey = lit(p, 0.9 + 3.2 * (1 - Math.max(0, nlK0)) * (900 / shadow.res)) * (underHair(p) + (1 - underHair(p)) * 0.6 * cover), nlKey = nlK0, nlFill = dot3(n, Lfill), nlRim = dot3(n, Lrim), nlSky = dot3(n, Lsky);
    if (mat === 3) {
      // hair over cloth: the fabric's nap and folds blur a lock's shadow, and light passes between the locks
      const sCloth = lit(p, 0.9 + 3.2 * (1 - Math.max(0, nlK0)) * (900 / shadow.res)) * Math.sqrt(underHair(p));
      const d = Math.max(0, nlKey) * sCloth * 0.9 + Math.max(0, nlFill) * 0.6 + occ * 0.3 * (0.6 + 0.4 * nlSky);
      for (let k = 0; k < 3; k++) { Alb[i * 3 + k] = cloth[k]; E[i * 3 + k] = d * (k === 2 ? 1.04 : 1) * 1.6; }
      continue;
    }
    // hair over the scalp is not skin: it takes no part in the skin's light scattering (no red rim along the hairline)
    skinM[i] = 1 - 0.95 * cover;
    const hA = cover > 0 ? 1 : hairAmbient(p);
    // Wrapped diffuse: light reaches a little past the terminator through the skin (the blur adds the rest).
    const wrap = (nl: number, k: number) => Math.max(0, (nl + k) / (1 + k));
    for (let k = 0; k < 3; k++) {
      E[i * 3 + k] = keyI[k] * wrap(nlKey, 0.08) * sKey + hA * (fillI[k] * wrap(nlFill, 0.2) * (0.5 + 0.5 * occ) + skyI[k] * occ * (0.55 + 0.45 * nlSky))
        + rimI[k] * Math.max(0, nlRim) * Math.pow(1 - Math.max(0, dot3(n, v)), 1.5) * 1.4 + bounceI[k] * occ * Math.max(0, -nlSky);
    }
    // Albedo: base tone shifted by regional zones (face only), a little even mottling.
    let alb: RGB3 = baseLin, tz = 0.25;
    if (mat === 0) {
      let r = baseLin[0], g = baseLin[1], bb = baseLin[2];
      for (let z = 0; z < zoneIds.length; z++) {
        const wz = zoneW[a * zoneIds.length + z] * b0 + zoneW[b * zoneIds.length + z] * b1 + zoneW[c * zoneIds.length + z] * b2;
        if (wz > 0.001) { r += (zoneCol[z][0] - baseLin[0]) * wz; g += (zoneCol[z][1] - baseLin[1]) * wz; bb += (zoneCol[z][2] - baseLin[2]) * wz; }
      }
      alb = [r, g, bb]; tz = 0.25 + 0.75 * (tzone[a] * b0 + tzone[b] * b1 + tzone[c] * b2);
    } else if (mat === 2) alb = mixC(baseLin, linearOf(skinZoneColor(skinHex, "cheeks")), 0.12);
    if (mat === 1) { alb = mixC(baseLin, zoneCol[0], 0.7); tz = 0.25 + 0.75 * 0.7 * (1 - smoothstep(10, 45, Math.abs(ph[0]))) * (1 - cover); }
    if (cover > 0) alb = mixC(alb, [rootCol[0] * streak, rootCol[1] * streak, rootCol[2] * streak], cover);
    // the scalp in a parting lies in the shade of the hair on both sides of it: a thin, dull line, not a bright seam
    // (where the strands part, the scalp lies deep in the hair's shade on both sides: dull and dark, not a bright stripe)
    if (partW > 0) alb = mixC(alb, [alb[0] * 0.3, alb[1] * 0.26, alb[2] * 0.25], Math.min(1, partW * 1.3));
    // uneven tone: broad blotches of redness and pigment (a few centimetres), finer mottling, more with age
    const mott = 1 + (0.035 + 0.02 * Math.max(0, ((o.age ?? 30) - 30) / 40)) * fbm(seed, p[0] / 5, p[1] / 5, 3) + 0.012 * fbm(seed + 9, p[0] / 1.2, p[1] / 1.2, 2) + 0.025 * fbm(seed + 13, p[0] / 22, p[1] / 22, 2);
    const lipW = lipMask[i] * (1 - mouthMask[i]);
    // lip volume: the lower lip's upper half catches the light, the upper lip (facing down) is a shade deeper
    const stomY = V0[13][1], lipShade = lipW > 0 ? (p[1] > stomY ? 0.86 : 1 + 0.1 * smoothstep(stomY - 2, stomY - 6, p[1]) * (1 - smoothstep(stomY - 7, stomY - 11, p[1]))) : 1;
    // Lip lines: fine vertical furrows across the vermilion.
    const lines = lipW > 0 ? 1 - 0.09 * Math.pow(Math.abs(Math.sin(p[0] * 2.1 + fbm(seed + 3, p[0] / 3, p[1] / 3, 2) * 2)), 6) : 1;
    // furrows and pores a little darker, the region's redness, freckles across the nose and cheeks
    const frC = Math.max(mat === 0 && o.freckles ? frecklesAt(ph[0], ph[1], o.freckles, frk, seed) : 0, mat === 0 || mat === 1 ? ageSpotsAt(ph[0], ph[1], o.age ?? 30, seed) : 0);
    const micro: RGB3 = [1 - skinDark * 0.8 + skinRed * 0.06, 1 - skinDark - skinRed * 0.05, 1 - skinDark * 1.05 - skinRed * 0.06];
    for (let k = 0; k < 3; k++) Alb[i * 3 + k] = (alb[k] * (1 - lipW) + lipLin[k] * lipW * lipShade) * mott * lines * micro[k] * (1 - frC * [0.3, 0.42, 0.52][k] * (1 - lipW));
    // Specular: oilier T-zone, glossier lips; the key and rim lights and a soft sky reflection.
    let rough = 0.42 - 0.12 * tz - (0.18 + 0.08 * mk) * lipW, sstr = (0.9 * (0.55 + 0.6 * tz) * skinSheen * (1 - 0.25 * mk) + (1.4 + 1.2 * mk) * lipW) * (1 - cover), glint = 0, tint: RGB3 | null = null;
    if (paint && mat === 0) {
      // paint sits on the neutral face, so it moves with the expression
      const rest: Vec3 = [FN0[a * 3] * b0 + FN0[b * 3] * b1 + FN0[c * 3] * b2, FN0[a * 3 + 1] * b0 + FN0[b * 3 + 1] * b1 + FN0[c * 3 + 1] * b2, FN0[a * 3 + 2] * b0 + FN0[b * 3 + 2] * b1 + FN0[c * 3 + 2] * b2];
      for (let k = 0; k < 3; k++) { ps.albedo[k] = Alb[i * 3 + k]; ps.film[k] = 0; }
      ps.roughness = rough; ps.specular = 1; ps.sparkle = 0; ps.tint = null;
      paint.shade(rest, ps);
      for (let k = 0; k < 3; k++) { Alb[i * 3 + k] = ps.albedo[k]; Film![i * 3 + k] = ps.film[k]; }
      rough = ps.roughness; sstr *= ps.specular; tint = ps.tint;
      // shimmer and glitter: tiny mirror flakes fixed to the skin (a 0.3 mm grid), each tilted at random, flash where
      // their tilt reflects the key light to the camera
      if (ps.sparkle > 0) {
        const gx = Math.floor(rest[0] / 0.3), gy = Math.floor(rest[1] / 0.3), hsh = hash2(seed + 71, gx, gy);
        if (hsh > 1 - 0.35 * ps.sparkle) {
          const tn = norm3([n[0] + (hash2(seed + 73, gx, gy) - 0.5) * 0.9, n[1] + (hash2(seed + 79, gx, gy) - 0.5) * 0.9, n[2]]);
          glint = ggx(tn, v, Lkey, 0.06) * Math.max(0, dot3(tn, Lkey)) * sKey * 0.5;
        }
      }
    }
    const sk = ggx(n, v, Lkey, rough) * Math.max(0, nlKey) * sKey, sr = ggx(n, v, Lrim, rough) * Math.max(0, nlRim), sf = ggx(n, v, Lfill, rough + 0.1) * Math.max(0, nlFill);
    const fres = 0.028 + 0.972 * Math.pow(1 - Math.max(0, dot3(n, v)), 5), tmax = tint ? Math.max(1e-4, tint[0], tint[1], tint[2]) : 1;
    for (let k = 0; k < 3; k++) Spec[i * 3 + k] = ((keyI[k] * sk + rimI[k] * sr + fillI[k] * sf) * sstr + keyI[k] * glint) * (tint ? tint[k] / tmax : 1) + skyI[k] * fres * occ * 0.35;
  }
  if (mk > 0 || sex < 0.5) applyFaceMakeup({ w, h, Alb, Spec, skinM, mk, sex, mmPerPx, pv, LMi: (k: FaceLandmark) => FACE_LANDMARKS[k], LOOP, expand, seed, eyeShape: face.eyeShape ?? EYE_SHAPES[0] });
  if (o.debug) {
    const dbg = createRaster(w, h, [0, 0, 0], 1);
    for (let i = 0; i < w * h; i++) {
      const t = gbuf.tri[i]; if (t < 0) continue;
      const a = tris[t * 3], b = tris[t * 3 + 1], c = tris[t * 3 + 2], b1 = gbuf.b1[i], b2 = gbuf.b2[i], b0 = 1 - b1 - b2;
      if (o.debug === "normals") { dbg.rgb[i * 3] = (NX[a] * b0 + NX[b] * b1 + NX[c] * b2) * 0.5 + 0.5; dbg.rgb[i * 3 + 1] = (NY[a] * b0 + NY[b] * b1 + NY[c] * b2) * 0.5 + 0.5; dbg.rgb[i * 3 + 2] = (NZ[a] * b0 + NZ[b] * b1 + NZ[c] * b2) * 0.5 + 0.5; }
      else if (o.debug === "ao") { const v2 = ao[a] * b0 + ao[b] * b1 + ao[c] * b2; dbg.rgb[i * 3] = dbg.rgb[i * 3 + 1] = dbg.rgb[i * 3 + 2] = v2; }
      else if (o.debug === "hair-shadow") { const pp: Vec3 = [PX[a] * b0 + PX[b] * b1 + PX[c] * b2, PY[a] * b0 + PY[b] * b1 + PY[c] * b2, PZ[a] * b0 + PZ[b] * b1 + PZ[c] * b2]; dbg.rgb[i * 3] = dbg.rgb[i * 3 + 1] = dbg.rgb[i * 3 + 2] = underHair(pp); }
      else for (let k = 0; k < 3; k++) dbg.rgb[i * 3 + k] = E[i * 3 + k] / 4;
    }
    const fin2 = downsample(dbg, SS), rgba2 = encodeSrgb(fin2);
    return { width: W, height: H, rgba: rgba2, face, expressed, ms: 0, hair: { groom, head: hairHead }, landmarks: [], stats: { strands: groom.starts.length, groomMs: groom.ms } };
  }
  // ---- Subsurface scattering: blur the irradiance with the six-Gaussian skin profile (mm → pixels) ------------------------------
  const Es = new Float32Array(w * h * 3);
  {
    const em = new Float32Array(w * h * 4);
    for (let i = 0; i < w * h; i++) { em[i * 4] = E[i * 3] * skinM[i]; em[i * 4 + 1] = E[i * 3 + 1] * skinM[i]; em[i * 4 + 2] = E[i * 3 + 2] * skinM[i]; em[i * 4 + 3] = skinM[i]; }
    for (const g of SKIN_PROFILE) {
      const sigPx = Math.sqrt(g.variance) / mmPerPx, blurred = blurScaled(em, w, h, 4, sigPx);
      for (let i = 0; i < w * h; i++) {
        if (!skinM[i]) continue;
        const m = Math.max(1e-4, blurred[i * 4 + 3]);
        for (let k = 0; k < 3; k++) Es[i * 3 + k] += g.weight[k] * (blurred[i * 4 + k] / m);
      }
    }
    // the profile's weights sum to 1 per channel (normalised), so energy is kept
    const sums = [0, 1, 2].map(k => SKIN_PROFILE.reduce((s, g) => s + g.weight[k], 0));
    for (let i = 0; i < w * h; i++) for (let k = 0; k < 3; k++) Es[i * 3 + k] /= sums[k];
  }
  // ---- Compose: background, back hair, body, eyes, mouth, marks, brows, lashes, ears, front hair ---------------------------------
  const out = createRaster(w, h);
  const bg = linearOf(o.background ?? "#8a8784");
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, r = Math.hypot((x - w * 0.42) / w, (y - h * 0.38) / h), k = 1.12 - 0.75 * r;
    out.rgb[i * 3] = bg[0] * k; out.rgb[i * 3 + 1] = bg[1] * k; out.rgb[i * 3 + 2] = bg[2] * k; out.alpha[i] = 1;
  }
  const hairCol = scalpHair;
  for (let i = 0; i < w * h; i++) {
    if (!solid[i]) continue;
    const sm = skinM[i];
    for (let k = 0; k < 3; k++) out.rgb[i * 3 + k] = Alb[i * 3 + k] * (Es[i * 3 + k] * sm + E[i * 3 + k] * (1 - sm)) + (Film ? Film[i * 3 + k] * E[i * 3 + k] : 0) + Spec[i * 3 + k];
  }
  // ears (before the front hair, after the head)
  // the eyeballs and the mouth are solid to the hair too (they are drawn, not in the depth buffer)
  const hairSolid = Float32Array.from(gbuf.depth);
  for (const s2 of ["L", "R"] as const) { const z = rotH([ec[s2][0], ec[s2][1], ec[s2][2] - 9.6])[2] + 11; for (let i = 0; i < w * h; i++) if (eyeMask[s2][i] > 0.05) hairSolid[i] = Math.max(hairSolid[i], z); }
  { const z = rotH(LM("stomion"))[2] - 6; for (let i = 0; i < w * h; i++) if (mouthMask[i] > 0.05) hairSolid[i] = Math.max(hairSolid[i], z); }
  drawEars(out, { proj: (q: Vec3) => { const r = rotH(q); return proj(r[0], r[1], r[2]); }, headHalfW, tragionY, browY: hairHead.browY, sn: sn[1], zEar: czE + az * 0.08, skinHex, Lkey, keyI, mmPerPx, yaw: o.yaw ?? 0,
    depth: hairSolid, depthOf: (q: Vec3) => rotH(q)[2], rot: rotH, lit: (q: Vec3) => lit(q, 2) * underHair(q), fillI, skyI, Lfill });
  // mouth interior where the lips part
  drawMouth(out, mouthMask, gbuf.tri, { w, h, upper: INNER_UPPER_LIP.map(pv), lower: INNER_LOWER_LIP.map(pv), mmPerPx, keyI });
  // eyes
  const gaze = expressed?.gaze ?? { x: 0, y: 0, cross: 0 };
  const shape = face.eyeShape ?? EYE_SHAPES[0], pupilR = Math.min(4, Math.max(1, (o.pupil ?? 4) / 2));
  for (const s of ["L", "R"] as const) drawEye(out, eyeMask[s], { w, h, side: s, centre: rotH([ec[s][0], ec[s][1], ec[s][2] - 9.6]), camPos, f, D, yc, Lkey, keyI, skyI, fillI, Lfill,
    iris: findIris((s === "R" ? o.eyesRight : undefined) ?? o.eyes ?? look?.eyes ?? "brown"), pupilR, epicanthal: shape.epicanthal, seed: seed + (s === "L" ? 1 : 2), lens: o.paint?.eyes?.lens,
    upper: expand(LOOP(`eye-upper.${s}`)).map(pv), lower: expand(LOOP(`eye-lower.${s}`)).map(pv), mmPerPx, gaze, yawR, pitchR });
  // nostrils
  for (const s of ["L", "R"] as const) {
    // Seen from the front the nostrils are small dark crescents beside the columella, partly hidden by the tip.
    const al = LM(`alare.${s}` as FaceLandmark), sub = LM("subnasale"), c = rotH([(al[0] * 0.42 + sub[0] * 0.58), sn[1] + 2.2, (al[2] + sub[2]) / 2 + 2]);
    const [cx, cy] = proj(c[0], c[1], c[2]), rx = 2.1 / mmPerPx, ry = 0.85 / mmPerPx;
    for (let y = Math.floor(cy - ry * 2); y <= cy + ry * 2; y++) for (let x = Math.floor(cx - rx * 2); x <= cx + rx * 2; x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const d = Math.hypot((x - cx) / rx, (y - cy + Math.abs(x - cx) * 0.25) / ry), k = 1 - 0.3 * smoothstep(1.2, 0.5, d);
      // the inside of a nostril is warm and dark (light reaching it passes through skin), not grey
      const i = y * w + x; out.rgb[i * 3] *= k + (1 - k) * 0.35; out.rgb[i * 3 + 1] *= k; out.rgb[i * 3 + 2] *= k * 0.97;
    }
  }
  // where closed lips meet: a dark line (the shadow inside the mouth), darkest in the middle
  {
    const inner = expand(INNER_UPPER_LIP).map(pv), lower = expand(INNER_LOWER_LIP).map(pv);
    const gap = Math.max(...inner.map((q, k) => Math.abs((lower[Math.min(k, lower.length - 1)] ?? q)[1] - q[1]))) * mmPerPx;
    if (gap < 2.5) {
      const ml = createRaster(w, h);
      strokePolyline(ml, inner, 0.55 / mmPerPx, 0.4 / mmPerPx, [0, 0, 0], 1);
      const soft = gaussianBlur(ml.alpha, w, h, 1, 0.35 / mmPerPx);
      const cx = (inner[0][0] + inner[inner.length - 1][0]) / 2, half = Math.abs(inner[inner.length - 1][0] - inner[0][0]) / 2 || 1;
      for (let i = 0; i < w * h; i++) if (soft[i] > 0.01) { const x = i % w, k = 1 - 0.62 * soft[i] * (1 - 0.45 * ((x - cx) / half) ** 2); out.rgb[i * 3] *= k + 0.08 * (1 - k); out.rgb[i * 3 + 1] *= k; out.rgb[i * 3 + 2] *= k; }
    }
  }
  // the vermilion border: a fine light line above the upper lip (the "white roll"), and the philtrum: two faint
  // columns from the nose to the cupid's bow; both catch a little more light than the skin beside them
  {
    const hl = createRaster(w, h);
    const border: [number, number][] = catmullRom(LOOP("lips-upper").map(i => { const r = rotH([V0[i][0], V0[i][1] + 0.5, V0[i][2] + 0.2]); return proj(r[0], r[1], r[2]); }));
    strokePolyline(hl, border, 0.7 / mmPerPx, 0.5 / mmPerPx, [1, 1, 1], 1);
    const ls = LM("labiale-superius"), sub = LM("subnasale");
    for (const dx of [-3.2, 3.2]) { const a1 = rotH([sub[0] + dx * 0.7, sub[1] - 1.5, sub[2] - 1]), b1 = rotH([ls[0] + dx, ls[1] + 1, ls[2] + 0.5]); strokePolyline(hl, [proj(a1[0], a1[1], a1[2]), proj(b1[0], b1[1], b1[2])], 1.6 / mmPerPx, 2.2 / mmPerPx, [1, 1, 1], 0.5); }
    const soft = gaussianBlur(hl.alpha, w, h, 1, 0.35 / mmPerPx);
    for (let i = 0; i < w * h; i++) if (soft[i] > 0.01 && skinM[i]) { const k = 1 + 0.07 * soft[i]; for (let q = 0; q < 3; q++) out.rgb[i * 3 + q] *= k; }
  }
  // the alar crease round each nose wing, where the nose meets the cheek
  for (const s2 of ["L", "R"] as const) {
    const al = LM(`alare.${s2}` as FaceLandmark), sg = Math.sign(al[0]) || 1, pts: [number, number][] = [];
    for (let q = 0; q <= 8; q++) { const a2 = (-0.2 + q / 8 * 1.6) * Math.PI / 2, pz = nearestZ(V0, al[0] + sg * 1.2, al[1]); const r = rotH([al[0] + sg * (1.4 + 1.5 * Math.cos(a2)), al[1] + 5.5 * Math.sin(a2) - 1.5, pz]); pts.push(proj(r[0], r[1], r[2])); }
    const cr = createRaster(w, h);
    strokePolyline(cr, pts, 0.9 / mmPerPx, 0.5 / mmPerPx, [0, 0, 0], 1);
    const soft = gaussianBlur(cr.alpha, w, h, 1, 0.6 / mmPerPx);
    for (let i = 0; i < w * h; i++) if (soft[i] > 0.01 && skinM[i]) { const k = 1 - 0.3 * soft[i]; for (let q = 0; q < 3; q++) out.rgb[i * 3 + q] *= q === 0 ? k + 0.05 * (1 - k) : k; }
  }
  // expression creases
  if (expressed) for (const m of expressionMarks(expressed)) {
    const pts = m.points.map(([x, y]) => { const z = nearestZ(V0, x, y); const r = rotH([x, y, z + 0.4]); return proj(r[0], r[1], r[2]); });
    const crease = createRaster(w, h);
    strokePolyline(crease, pts, 1.1 / mmPerPx, 0.6 / mmPerPx, [0, 0, 0], 1);
    const soft = gaussianBlur(crease.alpha, w, h, 1, 0.5 / mmPerPx);
    for (let i = 0; i < w * h; i++) if (soft[i] > 0.01 && skinM[i]) { const k = 1 - 0.32 * m.strength * soft[i]; for (let q = 0; q < 3; q++) out.rgb[i * 3 + q] *= q === 0 ? k + 0.04 * (1 - k) : k; }
  }
  // brows and lashes
  const browCol: RGB3 = paint?.brows?.colour ?? [hairCol[0] * 0.32, hairCol[1] * 0.28, hairCol[2] * 0.26];
  const VS: Vec3[] = Array.from({ length: nFace }, (_, i) => [FV[i * 3], FV[i * 3 + 1], FV[i * 3 + 2]] as Vec3);
  drawBrows(out, { V: VS, rot: rotH, proj, mmPerPx, sex, col: browCol, seed, filled: mk, density: paint?.brows?.density ?? 1, straight: paint?.brows?.straight });
  drawLashes(out, { V: VS, rot: rotH, proj, mmPerPx, seed, col: [0.012, 0.009, 0.008], shape: face.eyeShape ?? EYE_SHAPES[0], skinM, sex, mk, makeup, mascara: paint?.lashes });
  // the hair, strand by strand, over everything it is in front of
  renderHairStrands(out, groom, { project: (q: Vec3) => { const r = rotH(q), [sx, sy] = proj(r[0], r[1], r[2]); return [sx, sy, r[2]]; }, rotate: rotH, camera: camPos, pxPerMm: 1 / mmPerPx, solidDepth: hairSolid },
    { eumelanin: hairEu, pheomelanin: hairPheo, grey: o.hairGrey, key: { dir: Lkey, colour: keyI }, fill: { dir: Lfill, colour: fillI }, rim: { dir: Lrim, colour: rimI }, sky: skyI, headShadow: (q: Vec3) => lit(q, 2.5), rotated: hairRot, keyMap: hairKeyMap });
  const fin = downsample(out, SS), rgba = encodeSrgb(fin, { toneMap: "filmic", exposure: o.exposure ?? 1.0, white: 3.2 });
  const landmarks = Array.from({ length: 468 }, (_, i) => [SX[i] / SS, SY[i] / SS, -(SZ[i] - SZ[4]) / (mmPerPx * SS)] as [number, number, number]);
  const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
  return { width: W, height: H, rgba, face, expressed, ms: t1 - t0, hair: { groom, head: hairHead }, landmarks, stats: { strands: groom.starts.length, groomMs: groom.ms } };
}

/**
 * Grow the face mask's top edge (its outer boundary above `yMin`) into a strip of skin: rows 4.5 mm apart continuing the
 * surface outward from the edge, bending onto the cranium (`onCranium`: the ellipsoid along its radius, 0.3 mm out) over 32 mm. Returns the
 * expressed and neutral positions and the triangles, extended; the mask's own vertices keep their indices.
 */
function foreheadStrip(E0: Float64Array, N0: Float64Array, T0: ArrayLike<number>, yMin: number, onCranium: (p: Vec3) => Vec3) {
  const n0 = E0.length / 3, count = new Map<number, number>(), triOf = new Map<number, number>();
  for (let t = 0; t < T0.length / 3; t++) for (let e = 0; e < 3; e++) { const k = ekey(T0[t * 3 + e], T0[t * 3 + ((e + 1) % 3)]); count.set(k, (count.get(k) ?? 0) + 1); triOf.set(k, t); }
  const adj = new Map<number, number[]>(), inner = new Map<number, Vec3>();
  const pos = (A: Float64Array, i: number): Vec3 => [A[i * 3], A[i * 3 + 1], A[i * 3 + 2]];
  // only the mask's outer edge (its longest boundary loop), never the edges of the eye and mouth openings
  const bAdj = new Map<number, number[]>();
  for (const [k, c] of count) { if (c !== 1) continue; const a = Math.floor(k / 1048576), b = k % 1048576; for (const [u, w] of [[a, b], [b, a]] as const) { if (!bAdj.has(u)) bAdj.set(u, []); bAdj.get(u)!.push(w); } }
  const loopOf = new Map<number, number>(), loopLen: number[] = [];
  for (const v0 of bAdj.keys()) {
    if (loopOf.has(v0)) continue;
    const id = loopLen.length, stack = [v0]; let n = 0;
    while (stack.length) { const u = stack.pop()!; if (loopOf.has(u)) continue; loopOf.set(u, id); n++; for (const w of bAdj.get(u) ?? []) if (!loopOf.has(w)) stack.push(w); }
    loopLen.push(n);
  }
  const outer = loopLen.indexOf(Math.max(...loopLen));
  for (const [k, c] of count) {
    if (c !== 1) continue;
    const a = Math.floor(k / 1048576), b = k % 1048576;
    if (loopOf.get(a) !== outer || N0[a * 3 + 1] < yMin || N0[b * 3 + 1] < yMin) continue;
    for (const [u, v] of [[a, b], [b, a]] as const) { if (!adj.has(u)) adj.set(u, []); adj.get(u)!.push(v); }
    // outward: from the triangle's third vertex across the edge
    const t = triOf.get(k)!, cIdx = [T0[t * 3], T0[t * 3 + 1], T0[t * 3 + 2]].find(i => i !== a && i !== b)!, cp = pos(N0, cIdx);
    for (const v of [a, b]) { const pv = pos(N0, v), d: Vec3 = [pv[0] - cp[0], pv[1] - cp[1], pv[2] - cp[2]], o = inner.get(v) ?? [0, 0, 0]; inner.set(v, [o[0] + d[0], o[1] + d[1], o[2] + d[2]]); }
  }
  let start = -1;
  for (const [v, ns] of adj) if (ns.length === 1 && (start < 0 || N0[v * 3] < N0[start * 3])) start = v;
  const chain: number[] = [];
  for (let prev = -1, cur = start; cur >= 0 && chain.length < 4000;) { chain.push(cur); const nx = (adj.get(cur) ?? []).find(v => v !== prev); prev = cur; cur = nx ?? -1; if (cur === start) break; }
  if (chain.length < 3) return { E: E0, N: N0, tris: Array.from(T0) };
  // smooth the outward directions along the chain (the mask's edge is ragged)
  const dirs = chain.map(v => norm3(inner.get(v) ?? [0, 1, 0]));
  const sm = dirs.map((_, i) => { let s: Vec3 = [0, 0, 0]; for (let d = -4; d <= 4; d++) { const q = dirs[Math.min(dirs.length - 1, Math.max(0, i + d))], w = Math.exp(-(d * d) / 8); s = [s[0] + q[0] * w, s[1] + q[1] * w, s[2] + q[2] * w]; } return norm3(s); });
  const K = 7, DS = 4.5, M = chain.length, E: number[] = Array.from(E0), N: number[] = Array.from(N0), tris: number[] = Array.from(T0);
  for (let k = 1; k <= K; k++) for (let i = 0; i < M; i++) {
    const w = smoothstep(0, 1, k / K);
    for (const [A, out] of [[E0, E], [N0, N]] as const) {
      const b0 = pos(A, chain[i]), p: Vec3 = [b0[0] + sm[i][0] * DS * k, b0[1] + sm[i][1] * DS * k, b0[2] + sm[i][2] * DS * k];
      // onto the cranium along its radius from the ellipsoid's centre (sideways at the temples too, where a strip that
      // only moved in depth stood out past the skull as fins)
      const q = onCranium(p);
      for (let c = 0; c < 3; c++) p[c] += (q[c] - p[c]) * w;
      out.push(p[0], p[1], p[2]);
    }
  }
  // wind the strip like the mask (whose triangles may face in or out; the caller orients normals from the whole)
  let wz = 0;
  for (let t = 0; t < T0.length / 3; t++) { const a = pos(N0, T0[t * 3]), b = pos(N0, T0[t * 3 + 1]), c = pos(N0, T0[t * 3 + 2]); wz += (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
  const outward = wz >= 0;
  const idx = (k: number, i: number) => (k === 0 ? chain[i] : n0 + (k - 1) * M + i);
  const centre: Vec3 = [0, (Math.max(...chain.map(v => N0[v * 3 + 1]))), Math.min(...chain.map(v => N0[v * 3 + 2])) - 80];
  for (let k = 0; k < K; k++) for (let i = 0; i < M - 1; i++) {
    const a = idx(k, i), b = idx(k, i + 1), c = idx(k + 1, i + 1), d = idx(k + 1, i), pa = pos(Float64Array.from(N.slice(a * 3, a * 3 + 3)), 0), pb = [N[b * 3], N[b * 3 + 1], N[b * 3 + 2]], pc = [N[c * 3], N[c * 3 + 1], N[c * 3 + 2]];
    const u = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]], v = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]], nrm: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const out: Vec3 = [pa[0] - centre[0], pa[1] - centre[1], pa[2] - centre[2]];
    if ((nrm[0] * out[0] + nrm[1] * out[1] + nrm[2] * out[2] >= 0) === outward) tris.push(a, b, c, a, c, d); else tris.push(a, c, b, a, d, c);
  }
  return { E: Float64Array.from(E), N: Float64Array.from(N), tris };
}

/** The face's front surface as a height field over (x, y): 2 mm cells, holes (eye openings) filled from their neighbours; NaN off the face. */
function faceHeightField(V: Float64Array, y0: number, y1: number): (x: number, y: number) => number {
  const C = 2, x0 = -112, nx = Math.ceil(224 / C) + 1, ny = Math.ceil((y1 - y0) / C) + 1;
  let g = new Float32Array(nx * ny).fill(-Infinity);
  for (let i = 0; i < V.length / 3; i++) {
    const xi = Math.round((V[i * 3] - x0) / C), yi = Math.round((V[i * 3 + 1] - y0) / C);
    if (xi >= 0 && yi >= 0 && xi < nx && yi < ny) g[yi * nx + xi] = Math.max(g[yi * nx + xi], V[i * 3 + 2]);
  }
  for (let pass = 0; pass < 4; pass++) {
    const n2 = g.slice();
    for (let y = 1; y < ny - 1; y++) for (let x = 1; x < nx - 1; x++) {
      if (g[y * nx + x] > -Infinity) continue;
      let s = 0, n = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const v = g[(y + j) * nx + x + i]; if (v > -Infinity) { s += v; n++; } }
      if (n >= 4) n2[y * nx + x] = s / n;
    }
    g = n2;
  }
  return (x: number, y: number) => {
    const fx = (x - x0) / C, fy = (y - y0) / C, xi = Math.floor(fx), yi = Math.floor(fy);
    if (xi < 0 || yi < 0 || xi >= nx - 1 || yi >= ny - 1) return NaN;
    const a = g[yi * nx + xi], b = g[yi * nx + xi + 1], c = g[(yi + 1) * nx + xi], d = g[(yi + 1) * nx + xi + 1];
    if (!(a > -Infinity && b > -Infinity && c > -Infinity && d > -Infinity)) return NaN;
    const u = fx - xi, v = fy - yi;
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  };
}

/** Grooms reused while only the light, pose or expression changes. */
const GROOMS = new Map<string, HairGroom>();
const ekey = (a: number, b: number) => (a < b ? a * 1048576 + b : b * 1048576 + a);
/**
 * One level of Loop subdivision of a triangle mesh, applied to several position sets with the same topology (the
 * expressed face and its neutral). Boundary edges (the openings and the mask's rim) use the boundary rules, so they
 * stay put; `mid` maps each edge to its new vertex.
 */
function loopSubdivide(sets: readonly Float64Array[], tris: readonly number[]): { pos: Float64Array[]; tris: number[]; mid: Map<number, number> } {
  const n = sets[0].length / 3, opp = new Map<number, number[]>(), nbr: Set<number>[] = Array.from({ length: n }, () => new Set());
  for (let t = 0; t < tris.length / 3; t++) {
    const v = [tris[t * 3], tris[t * 3 + 1], tris[t * 3 + 2]];
    for (let k = 0; k < 3; k++) {
      const a = v[k], b = v[(k + 1) % 3], c = v[(k + 2) % 3], key = ekey(a, b);
      (opp.get(key) ?? opp.set(key, []).get(key)!).push(c);
      nbr[a].add(b); nbr[b].add(a);
    }
  }
  const mid = new Map<number, number>();
  let next = n;
  for (const key of opp.keys()) mid.set(key, next++);
  const boundaryNbrs: number[][] = Array.from({ length: n }, () => []);
  for (const [key, o] of opp) if (o.length === 1) { const a = Math.floor(key / 1048576), b = key % 1048576; boundaryNbrs[a].push(b); boundaryNbrs[b].push(a); }
  const pos = sets.map(src => {
    const out = new Float64Array(next * 3);
    for (let i = 0; i < n; i++) {
      const bn = boundaryNbrs[i];
      for (let c = 0; c < 3; c++) {
        if (bn.length === 2) out[i * 3 + c] = 0.75 * src[i * 3 + c] + 0.125 * (src[bn[0] * 3 + c] + src[bn[1] * 3 + c]);
        else if (bn.length > 0) out[i * 3 + c] = src[i * 3 + c];
        else {
          const nb = [...nbr[i]], k = nb.length, beta = k > 3 ? 3 / (8 * k) : 3 / 16;
          let sum = 0; for (const j of nb) sum += src[j * 3 + c];
          out[i * 3 + c] = (1 - k * beta) * src[i * 3 + c] + beta * sum;
        }
      }
    }
    for (const [key, o] of opp) {
      const a = Math.floor(key / 1048576), b = key % 1048576, m = mid.get(key)!;
      for (let c = 0; c < 3; c++) out[m * 3 + c] = o.length === 1 ? 0.5 * (src[a * 3 + c] + src[b * 3 + c]) : 0.375 * (src[a * 3 + c] + src[b * 3 + c]) + 0.125 * (src[o[0] * 3 + c] + src[o[1] * 3 + c]);
    }
    return out;
  });
  const nt: number[] = [];
  for (let t = 0; t < tris.length / 3; t++) {
    const a = tris[t * 3], b = tris[t * 3 + 1], c = tris[t * 3 + 2], ab = mid.get(ekey(a, b))!, bc = mid.get(ekey(b, c))!, ca = mid.get(ekey(c, a))!;
    nt.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
  }
  return { pos, tris: nt, mid };
}

/** Blur with σ in pixels, working at reduced resolution for wide kernels (fast enough for the skin profile). */
function blurScaled(src: Float32Array, w: number, h: number, ch: number, sigma: number): Float32Array {
  const k = Math.max(1, Math.floor(sigma / 2.5));
  if (k === 1) return gaussianBlur(src, w, h, ch, sigma);
  const sw = Math.ceil(w / k), sh = Math.ceil(h / k), small = new Float32Array(sw * sh * ch);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) for (let c = 0; c < ch; c++) {
    let s = 0, n = 0;
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) { const xx = x * k + i, yy = y * k + j; if (xx < w && yy < h) { s += src[(yy * w + xx) * ch + c]; n++; } }
    small[(y * sw + x) * ch + c] = s / Math.max(1, n);
  }
  const b = gaussianBlur(small, sw, sh, ch, sigma / k), out = new Float32Array(w * h * ch);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = Math.min(sw - 1.001, Math.max(0, (x + 0.5) / k - 0.5)), fy = Math.min(sh - 1.001, Math.max(0, (y + 0.5) / k - 0.5)), x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    for (let c = 0; c < ch; c++) {
      const v00 = b[(y0 * sw + x0) * ch + c], v10 = b[(y0 * sw + x0 + 1) * ch + c], v01 = b[((y0 + 1) * sw + x0) * ch + c], v11 = b[((y0 + 1) * sw + x0 + 1) * ch + c];
      out[(y * w + x) * ch + c] = v00 * (1 - tx) * (1 - ty) + v10 * tx * (1 - ty) + v01 * (1 - tx) * ty + v11 * tx * ty;
    }
  }
  return out;
}

function nearestZ(v: readonly Vec3[], x: number, y: number): number {
  let best = 0, bd = Infinity;
  for (const p of v) { const d = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (d < bd && p[2] > -10) { bd = d; best = p[2]; } }
  return best;
}

// ---- Eyes ------------------------------------------------------------------------------------------------------------------------

/** A Catmull-Rom curve through screen points (end points kept), `n` points a span. */
function catmullRom(pts: [number, number][], n = 6): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(c => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)) as [number, number]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function drawEye(out: Raster, mask: Float32Array, e: { w: number; h: number; side: "L" | "R"; centre: Vec3; camPos: Vec3; f: number; D: number; yc: number; Lkey: Vec3; keyI: RGB3; skyI: RGB3; fillI: RGB3; Lfill: Vec3;
  iris: IrisType; pupilR: number; epicanthal: number; seed: number; lens?: LensSpec;
  upper: [number, number][]; lower: [number, number][]; mmPerPx: number; gaze: { x: number; y: number; cross: number }; yawR: number; pitchR: number }) {
  const R = 12, irisR = (e.lens?.diameter ?? 11.7) / 2, pupilR = e.pupilR, C = e.centre;
  // Gaze: toward the camera, turned by the expression's gaze (about 15° at full) and convergence.
  const toCam = norm3([e.camPos[0] - C[0], e.camPos[1] - C[1], e.camPos[2] - C[2]]);
  const gz = norm3([toCam[0] + e.gaze.x * 0.26 - Math.sign(C[0]) * e.gaze.cross * 0.2, toCam[1] + e.gaze.y * 0.2, toCam[2]]);
  const up0: Vec3 = [0, 1, 0], ux = norm3([up0[1] * gz[2] - up0[2] * gz[1], up0[2] * gz[0] - up0[0] * gz[2], up0[0] * gz[1] - up0[1] * gz[0]]), uy = norm3([gz[1] * ux[2] - gz[2] * ux[1], gz[2] * ux[0] - gz[0] * ux[2], gz[0] * ux[1] - gz[1] * ux[0]]);
  const cornea: Vec3 = [C[0] + gz[0] * 4.7, C[1] + gz[1] * 4.7, C[2] + gz[2] * 4.7], corneaR = 7.8;
  // the sclera is never paper white in a portrait: shaded by the lids and the socket, pinker toward the corners
  // (in photographs the whites read a little darker than the lit skin beside them)
  const sclera: RGB3 = [0.6, 0.575, 0.55], vessel: RGB3 = [0.56, 0.36, 0.33];
  // the light reaching the eye in its socket: the key (as it faces the eye), the fill and the sky; the iris is lit like
  // the face around it, so its colour reads at its true strength
  const keyOn = 0.35 + 0.65 * Math.max(0, dot3(gz, e.Lkey)), fillOn = 0.5 + 0.5 * Math.max(0, dot3(gz, e.Lfill));
  const lightInPlane = norm3([dot3(e.Lkey, ux), dot3(e.Lkey, uy), 0]);
  const distToPoly = (x: number, y: number, poly: [number, number][]) => { let d = Infinity; for (let i = 1; i < poly.length; i++) { const [ax, ay] = poly[i - 1], [bx, by] = poly[i], vx = bx - ax, vy = by - ay, t = clamp01(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1)); d = Math.min(d, Math.hypot(x - ax - vx * t, y - ay - vy * t)); } return d; };
  const medial = e.upper[e.upper.length - 1];
  for (let y = 0; y < e.h; y++) for (let x = 0; x < e.w; x++) {
    const i = y * e.w + x, cov = mask[i];
    if (cov <= 0) continue;
    const dir = norm3([(x + 0.5 - e.w / 2) / e.f, -(y + 0.5 - e.h / 2) / e.f, -1]), O = e.camPos;
    // ray–eyeball
    const oc: Vec3 = [O[0] - C[0], O[1] - C[1], O[2] - C[2]], bq = dot3(oc, dir), cq = dot3(oc, oc) - R * R, disc = bq * bq - cq;
    let col: RGB3;
    if (disc < 0) col = [0.08, 0.05, 0.05];
    else {
      const tt = -bq - Math.sqrt(disc), p: Vec3 = [O[0] + dir[0] * tt, O[1] + dir[1] * tt, O[2] + dir[2] * tt], n = norm3([p[0] - C[0], p[1] - C[1], p[2] - C[2]]);
      const cosT = dot3(n, gz), sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT)), rr = (sinT * R) / irisR;
      const nl = dot3(n, e.Lkey), diffuse = 0.3 + 0.7 * Math.max(0, (nl + 0.35) / 1.35);
      if (cosT > 0 && rr < 1) {
        // iris (eye-detail.ts): pupillary and ciliary zones, collarette, fibres, crypts, furrows, limbal ring, ruff;
        // brighter on the side away from the light, where the cornea focuses it
        const ang = Math.atan2(dot3(n, uy), dot3(n, ux)), r = (rr * irisR - pupilR) / (irisR - pupilR);
        if (r < 0) col = [0.004, 0.0035, 0.003];
        else {
          let alb = irisAlbedo(e.iris, r, e.side === "L" ? ang : Math.PI - ang, e.seed);
          if (e.lens) {
            // a circle lens: its tint over the iris pattern (clear over the pupil), its printed ring darker at the edge
            const lt = e.lens.tint, k = 0.75 * smoothstep(0.02, 0.18, r), ringK = 1 - 0.85 * e.lens.ring * smoothstep(1 - Math.min(1, 0.9 / (irisR - pupilR)), 1, r);
            alb = [0, 1, 2].map(q => (lt ? alb[q] + (lt[q] - alb[q]) * k : alb[q]) * ringK) as typeof alb;
          }
          const side = dot3([Math.cos(ang), Math.sin(ang), 0], lightInPlane), caustic = 0.8 + 0.6 * Math.max(0, -side) * smoothstep(0.2, 0.9, rr);
          col = [0, 1, 2].map(k => alb[k] * (e.keyI[k] * 0.5 * keyOn * caustic + e.fillI[k] * 0.6 * fillOn + e.skyI[k] * 1.3)) as unknown as RGB3;
        }
      } else {
        const corner = smoothstep(0.3, 1.0, Math.abs(dot3(n, ux)));
        col = mixC(sclera, vessel, corner * 0.5).map((c, k) => c * (e.keyI[k] * 0.36 * diffuse + e.fillI[k] * 0.4 * fillOn + e.skyI[k] * 1.1) * (1 - 0.35 * corner)) as unknown as RGB3;
      }
      // cornea: the key light's sharp reflection and a soft sky reflection
      const oc2: Vec3 = [O[0] - cornea[0], O[1] - cornea[1], O[2] - cornea[2]], b2 = dot3(oc2, dir), c2 = dot3(oc2, oc2) - corneaR * corneaR, disc2 = b2 * b2 - c2;
      if (disc2 > 0 && cosT > 0.8) {
        const t2 = -b2 - Math.sqrt(disc2), pc: Vec3 = [O[0] + dir[0] * t2, O[1] + dir[1] * t2, O[2] + dir[2] * t2], nc = norm3([pc[0] - cornea[0], pc[1] - cornea[1], pc[2] - cornea[2]]);
        const rd: Vec3 = [dir[0] - 2 * dot3(dir, nc) * nc[0], dir[1] - 2 * dot3(dir, nc) * nc[1], dir[2] - 2 * dot3(dir, nc) * nc[2]];
        // the key is a softbox: its reflection is a soft-edged rectangle (about 9° by 7° as seen from the face)
        const kr = norm3([e.Lkey[2], 0, -e.Lkey[0]]), ku = norm3([e.Lkey[1] * kr[2] - e.Lkey[2] * kr[1], e.Lkey[2] * kr[0] - e.Lkey[0] * kr[2], e.Lkey[0] * kr[1] - e.Lkey[1] * kr[0]]);
        const fa = Math.abs(dot3(rd, kr)), fb = Math.abs(dot3(rd, ku)), facing = dot3(rd, e.Lkey) > 0 ? 1 : 0;
        const spot = facing * smoothstep(0.085, 0.06, fa) * smoothstep(0.065, 0.045, fb) * 6 + Math.pow(Math.max(0, dot3(rd, e.Lkey)), 60) * 0.2, sky = 0.05 * Math.max(0, rd[1] + 0.3);
        col = [col[0] + e.keyI[0] * spot + e.skyI[0] * sky, col[1] + e.keyI[1] * spot + e.skyI[1] * sky, col[2] + e.keyI[2] * spot + e.skyI[2] * sky];
      }
    }
    // The upper lid and lashes shade the top of the eye; the lower lid a little; the inner corner is the pink caruncle.
    const du = distToPoly(x, y, e.upper) * e.mmPerPx, dl = distToPoly(x, y, e.lower) * e.mmPerPx, dm = Math.hypot(x - medial[0], y - medial[1]) * e.mmPerPx;
    // the upper lid and its lashes shade the top of the eye (the upper third of the iris in life), the lower lid a little
    const shadeLid = (0.32 + 0.68 * smoothstep(0, 3.2, du) ** 0.8) * (0.82 + 0.18 * smoothstep(0, 0.9, dl));
    col = col.map(c => c * shadeLid) as unknown as RGB3;
    // the caruncle (hidden under an epicanthal fold)
    if (dm < 3) col = mixC(col, [0.42, 0.2, 0.19], smoothstep(3, 1.2, dm) * 0.85 * (1 - e.epicanthal));
    // the lower lid's wet rim (the waterline): pink, with a thin highlight along it
    if (dl < 0.8) col = mixC(col, [0.8, 0.53, 0.49].map((c, k) => c * (e.keyI[k] * 0.3 + e.skyI[k] * 1.2)) as unknown as RGB3, smoothstep(0.8, 0.15, dl) * 0.75);
    if (dl > 0.25 && dl < 0.55) col = col.map((c, k) => c + e.keyI[k] * 0.05 * (1 - Math.abs(dl - 0.4) / 0.15)) as unknown as RGB3;
    for (let k = 0; k < 3; k++) out.rgb[i * 3 + k] = out.rgb[i * 3 + k] * (1 - cov) + col[k] * cov;
  }
}

// ---- Mouth ------------------------------------------------------------------------------------------------------------------------

function drawMouth(out: Raster, mask: Float32Array, tri: Int32Array, m: { w: number; h: number; upper: [number, number][]; lower: [number, number][]; mmPerPx: number; keyI: RGB3 }) {
  // The lips' parting is always dark (a closed mouth shows only a fine line); teeth show once it opens past 2.5 mm.
  const top = m.upper, ys = top.map(p => p[1]), topY = Math.min(...ys), x0 = Math.min(...top.map(p => p[0])), x1 = Math.max(...top.map(p => p[0]));
  const opening = Math.max(...m.lower.map((p, k) => p[1] - m.upper[k][1])) * m.mmPerPx, showTeeth = opening > 2.5;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const i = y * m.w + x, cov = mask[i];
    if (cov <= 0 || tri[i] >= 0 && cov < 0.5) continue;
    // dark cavity, the upper incisors just under the upper lip, the tongue low
    const u = (x - x0) / Math.max(1, x1 - x0), depthUnder = (y - topY) * m.mmPerPx;
    let col: RGB3 = [0.05, 0.018, 0.016];
    const teethBand = showTeeth && depthUnder < 7.5 && u > 0.18 && u < 0.82;
    if (teethBand) {
      const gapLine = Math.abs(Math.sin((u - 0.5) * Math.PI * 4)) < 0.06 ? 0.75 : 1, shade = 0.55 + 0.45 * smoothstep(7.5, 1.5, depthUnder);
      col = [0.62 * shade * gapLine, 0.6 * shade * gapLine, 0.55 * shade * gapLine];
    } else if (depthUnder > 9) col = [0.32, 0.09, 0.08];
    for (let k = 0; k < 3; k++) out.rgb[i * 3 + k] = out.rgb[i * 3 + k] * (1 - cov) + col[k] * cov;
  }
}

// ---- Makeup ------------------------------------------------------------------------------------------------------------------------

/**
 * Makeup on the skin's albedo (before light and scattering), in screen space from the face's landmarks: eyeshadow on
 * the upper lid deepening toward the outer corner, blush on the cheek apples, contour under the cheekbones, at the
 * temples and along the jaw, and highlight on the cheekbones, the bridge of the nose and the cupid's bow. Women get a
 * faint flush of colour even without makeup.
 */
function applyFaceMakeup(m: { w: number; h: number; Alb: Float32Array; Spec: Float32Array; skinM: Float32Array; mk: number; sex: number; mmPerPx: number;
  pv: (i: number) => [number, number]; LMi: (k: FaceLandmark) => number; LOOP: (k: string) => readonly number[]; expand: (c: readonly number[]) => number[]; seed: number; eyeShape: EyeShapeSpec }) {
  const { w, h, Alb, Spec, skinM, mk, sex, mmPerPx } = m, P = (k: FaceLandmark) => m.pv(m.LMi(k)), px = (mm: number) => mm / mmPerPx;
  const blob = (cx: number, cy: number, rx: number, ry: number, rot: number, f: (i: number, a: number) => void) => {
    const R = Math.max(rx, ry) * 2.2, c = Math.cos(rot), s2 = Math.sin(rot);
    for (let y = Math.max(0, Math.floor(cy - R)); y <= Math.min(h - 1, Math.ceil(cy + R)); y++) for (let x = Math.max(0, Math.floor(cx - R)); x <= Math.min(w - 1, Math.ceil(cx + R)); x++) {
      const i = y * w + x; if (!skinM[i]) continue;
      const dx = x - cx, dy = y - cy, u = (dx * c + dy * s2) / rx, v = (-dx * s2 + dy * c) / ry, a = Math.exp(-(u * u + v * v) / 2);
      if (a > 0.01) f(i, a);
    }
  };
  const tint = (col: RGB3, amt: number) => (i: number, a: number) => { const k = amt * a; for (let q = 0; q < 3; q++) Alb[i * 3 + q] = Alb[i * 3 + q] * (1 - k) + Alb[i * 3 + q] * col[q] * k; };
  const blushAmt = 0.06 * (1 - sex) + 0.16 * mk, contour = 0.1 * mk, shadow = 0.26 * mk, highlight = 0.1 * mk;
  for (const s of ["L", "R"] as const) {
    const cb = P(`cheekbone.${s}` as FaceLandmark), ch = P(`cheilion.${s}` as FaceLandmark), zy = P(`zygion.${s}` as FaceLandmark), ex = P(`exocanthion.${s}` as FaceLandmark), go = P(`gonion.${s}` as FaceLandmark);
    const sg = Math.sign(cb[0] - P("pronasale")[0]) || 1;
    // blush: the apple of the cheek, a little below and inside the cheekbone, swept up toward the temple
    if (blushAmt > 0) blob(cb[0] * 0.72 + ch[0] * 0.28, cb[1] * 0.62 + ch[1] * 0.38, px(15), px(9), -0.35 * sg, tint([1.06, 0.8, 0.82], blushAmt));
    if (contour > 0) {
      // under the cheekbone, from near the ear toward the mouth's corner (stopping well short of it)
      const ux = zy[0] * 0.55 + ch[0] * 0.45, uy = (zy[1] * 0.55 + ch[1] * 0.45) + px(6);
      blob(ux * 0.7 + zy[0] * 0.3, uy, px(17), px(5.5), Math.atan2(ch[1] - zy[1], ch[0] - zy[0]), tint([0.82, 0.78, 0.76], contour));
      // the temple and the jaw's edge
      blob(ex[0] + sg * px(14), ex[1] - px(16), px(8), px(13), 0, tint([0.86, 0.82, 0.8], contour * 0.8));
      blob(go[0] * 0.8 + P("pogonion")[0] * 0.2, go[1] * 0.8 + P("pogonion")[1] * 0.2 + px(2), px(16), px(4.5), Math.atan2(P("pogonion")[1] - go[1], P("pogonion")[0] - go[0]), tint([0.86, 0.82, 0.8], contour * 0.8));
    }
    if (highlight > 0) {
      // the top of the cheekbone: a soft sheen and a touch of brightness
      blob(cb[0] * 0.85 + ex[0] * 0.15, cb[1] - px(5), px(10), px(4.5), -0.3 * sg, (i, a) => { for (let q = 0; q < 3; q++) { Alb[i * 3 + q] *= 1 + highlight * a; Spec[i * 3 + q] *= 1 + 1.2 * highlight * a; } });
    }
    // eyeshadow: on the lid from the lash line to just above the crease, deepest toward the outer corner
    if (shadow > 0) {
      const lid = m.expand(m.LOOP(`eye-upper.${s}`)).map(m.pv), crease = m.eyeShape.crease > 0 ? m.eyeShape.crease : 6;
      const inner = lid[0], outer = lid[lid.length - 1], medialFirst = Math.abs(inner[0] - P("pronasale")[0]) < Math.abs(outer[0] - P("pronasale")[0]);
      const ordered = medialFirst ? lid : lid.slice().reverse();
      const top = ordered.map(([x, y], k) => { const t = k / (ordered.length - 1); return [x + sg * px(1.5) * t, y - px(crease + 2.5) * Math.sin(Math.PI * Math.min(1, 0.15 + 0.85 * t)) ** 0.6 - px(1.5) * t] as [number, number]; });
      const mask = new Float32Array(w * h);
      fillPolygon(w, h, [...ordered, ...top.reverse()], (i, c) => (mask[i] = c));
      const soft = gaussianBlur(mask, w, h, 1, px(1.6));
      const ox = ordered[ordered.length - 1][0], ix = ordered[0][0];
      for (let i = 0; i < w * h; i++) if (soft[i] > 0.01 && skinM[i]) {
        const x = i % w, t = Math.min(1, Math.max(0, (x - ix) / ((ox - ix) || 1))), a = shadow * soft[i] * (0.45 + 0.55 * t);
        Alb[i * 3] *= 1 - a * 0.42; Alb[i * 3 + 1] *= 1 - a * 0.52; Alb[i * 3 + 2] *= 1 - a * 0.55;
      }
    }
  }
  if (highlight > 0) {
    // the bridge of the nose and the cupid's bow
    const se = P("sellion"), pr = P("pronasale"), ls = P("labiale-superius");
    blob((se[0] + pr[0]) / 2, (se[1] + pr[1]) / 2, px(2.2), Math.abs(pr[1] - se[1]) * 0.42, 0, (i, a) => { for (let q = 0; q < 3; q++) { Alb[i * 3 + q] *= 1 + 0.8 * highlight * a; Spec[i * 3 + q] *= 1 + 1.5 * highlight * a; } });
    blob(ls[0], ls[1] - px(1.6), px(3.5), px(1.1), 0, (i, a) => { for (let q = 0; q < 3; q++) Alb[i * 3 + q] *= 1 + 0.9 * highlight * a; });
  }
}

// ---- Brows and lashes ------------------------------------------------------------------------------------------------------------

/** The lower edge of each brow on the canonical mesh, lateral to medial (the upper edge is FACE_FEATURES' brow loop). */
const BROW_LOWER = { R: [46, 53, 52, 65, 55], L: [276, 283, 282, 295, 285] } as const;

function drawBrows(out: Raster, b: { V: readonly Vec3[]; rot: (p: Vec3) => Vec3; proj: (x: number, y: number, z: number) => [number, number]; mmPerPx: number; sex: number; col: RGB3; seed: number; filled?: number; density: number; straight?: number }) {
  // A groomed brow, as in portraits: its head above the inner corner of the eye, its arch peaking about two-thirds of
  // the way out (above the outer edge of the iris) and its tail ending a little above the head's lower edge. Women's are
  // arched and taper to a fine tail; men's are thicker, flatter and straighter. Dense hairs read as a soft mass of tone
  // with the hairs' strokes over it; filled brows (makeup) are darker and crisper.
  const sex = b.sex, fill = b.filled ?? 0;
  for (const s of ["L", "R"] as const) {
    const loop = LOOP(`brow.${s}`).map(i => b.V[i]);
    const pts = Math.abs(loop[0][0]) > Math.abs(loop[loop.length - 1][0]) ? loop.slice().reverse() : loop.slice(); // medial → lateral
    const onLoop = (t: number): Vec3 => { const x = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(x)), f = x - i; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f, pts[i][2] + (pts[i + 1][2] - pts[i][2]) * f]; };
    // the loop is the brow's upper edge and BROW_LOWER its lower edge (five points each, head to tail): the brow fills
    // the band between them, smoothed, so its arch and thickness are the face's own (a face type's stars' straight,
    // full or arched, fine brows), tapering to the tail where the edges meet
    const peakT = 0.6 + 0.08 * sex;
    const lo0 = BROW_LOWER[s].map(i => b.V[i]), lo = Math.abs(lo0[0][0]) > Math.abs(lo0[lo0.length - 1][0]) ? lo0.slice().reverse() : lo0;
    const curve = (P: readonly Vec3[], t: number) => {
      const x = t * (P.length - 1), i = Math.min(P.length - 2, Math.max(0, Math.floor(x))), f = x - i;
      const y0 = P[Math.max(0, i - 1)][1], y1 = P[i][1], y2 = P[i + 1][1], y3 = P[Math.min(P.length - 1, i + 2)][1];
      return 0.5 * (2 * y1 + (-y0 + y2) * f + (2 * y0 - 5 * y1 + 4 * y2 - y3) * f * f + (-y0 + 3 * y1 - 3 * y2 + y3) * f * f * f);
    };
    // makeup can straighten the brow (MAKEUP1): both edges move toward their straight head-to-tail lines
    const st = Math.min(1, Math.max(0, b.straight ?? 0));
    const straighten = (g: (t: number) => number) => (st > 0 ? (t: number) => g(t) + (g(0) + (g(1) - g(0)) * t - g(t)) * st : g);
    const topY = straighten((t: number) => curve(pts, t) - 0.3), botY = straighten((t: number) => Math.min(curve(lo, t) + 0.3, topY(t) - 1.0 - 1.5 * (1 - t)));
    const at = (t: number): Vec3 => { const q = onLoop(t); return [q[0], (topY(t) + botY(t)) / 2, q[2] + 0.6]; };
    const outward = Math.sign(pts[pts.length - 1][0] - pts[0][0]) || 1;
    // full height (mm) along the brow: the band, the tail drawn finer than the meeting edges
    const thickAt = (t: number) => (topY(t) - botY(t)) * (t > 0.8 ? 1 - 0.5 * ((t - 0.8) / 0.2) : 1);
    const upperE: [number, number][] = [], lowerE: [number, number][] = [];
    for (let q = 0; q <= 30; q++) { const t = q / 30, c = at(t), th = thickAt(t) / 2; const pu = b.rot([c[0], c[1] + th * 1.05, c[2]]), pl = b.rot([c[0], c[1] - th * 0.95, c[2]]); upperE.push(b.proj(pu[0], pu[1], pu[2])); lowerE.push(b.proj(pl[0], pl[1], pl[2])); }
    const tone = new Float32Array(out.width * out.height);
    fillPolygon(out.width, out.height, [...upperE, ...lowerE.reverse()], (i, c) => (tone[i] = c));
    const toneS = gaussianBlur(tone, out.width, out.height, 1, (0.7 - 0.25 * fill) / b.mmPerPx);
    // the head is softer and lighter than the body (hairs grow up and apart there)
    const headX = b.proj(...(b.rot(at(0)) as [number, number, number]))[0], bodyX = b.proj(...(b.rot(at(0.2)) as [number, number, number]))[0];
    const baseA = 0.5 + 0.12 * sex + 0.22 * fill;
    for (let i = 0; i < toneS.length; i++) if (toneS[i] > 0.01) {
      const x = i % out.width, f = Math.min(1, Math.max(0, (x - headX) / ((bodyX - headX) || 1)));
      const a = baseA * toneS[i] * (0.55 + 0.45 * f);
      for (let k = 0; k < 3; k++) out.rgb[i * 3 + k] = out.rgb[i * 3 + k] * (1 - a) + b.col[k] * a;
    }
    const n = Math.round((950 + 450 * sex) * b.density);
    for (let k = 0; k < n; k++) {
      const t = Math.pow(hash2(b.seed + 31, k, s === "L" ? 1 : 2), 0.85), across = hash2(b.seed + 37, k, 3) * 2 - 1;
      const thick = thickAt(t), c = at(t), root: Vec3 = [c[0], c[1] + across * thick * 0.45, c[2]];
      // growth: up at the head, up-and-out along the body, down-and-out in the tail; upper hairs lie down, lower hairs up
      let ang = t < 0.12 ? 80 - t * 200 : t < peakT ? 34 - (t - 0.12) * 45 : -10 - (t - peakT) * 40;
      ang -= across * 16;
      const len = (t < 0.12 ? 5 : 7 - t * 2.5) * (0.8 + 0.4 * hash2(b.seed + 41, k, 5)) * (1 + 0.15 * sex), rad = (ang * Math.PI) / 180;
      const dx = Math.cos(rad) * outward, dy = Math.sin(rad);
      const ptsS: [number, number][] = [];
      for (let q = 0; q <= 3; q++) {
        const u = q / 3, bend = -0.18 * u * u * len * Math.sign(dy || 1);
        const p = b.rot([root[0] + dx * len * u, root[1] + dy * len * u + bend * 0.3, root[2] + 0.4 * u]);
        ptsS.push(b.proj(p[0], p[1], p[2]));
      }
      strokePolyline(out, ptsS, (0.12 + 0.03 * sex) / b.mmPerPx, 0.035 / b.mmPerPx, b.col, 0.82);
    }
  }
}

function drawLashes(out: Raster, l: { V: readonly Vec3[]; rot: (p: Vec3) => Vec3; proj: (x: number, y: number, z: number) => [number, number]; mmPerPx: number; seed: number; col: RGB3; shape: EyeShapeSpec; skinM: Float32Array;
  sex?: number; mk?: number; makeup?: string; mascara?: LashSpec }) {
  const sh = l.shape, single = sh.crease <= 0, sex = l.sex ?? 0, mk = l.mk ?? 0, glam = l.makeup === "glamour";
  // mascara lengthens, thickens and darkens the lashes; men's lashes are a little shorter and sparser
  const lashLen = (1 - 0.12 * sex) * (1 + 0.22 * mk), lashW = (1 - 0.15 * sex) * (1 + 0.45 * mk);
  // MAKEUP1's mascara on top (bare lashes: length 1, thickness 1, darkness 0.5)
  const mL = l.mascara?.length ?? 1, mT = l.mascara?.thickness ?? 1, mD = Math.min(1, Math.max(0, l.mascara?.darkness ?? 0.5));
  // false-lash styles and lower lashes (MAKEUP1); without them every factor below is 1
  const style = l.mascara?.style ?? "natural", lowerL = l.mascara?.lower, styled = style !== "natural";
  // how much of the style shows: it fades in, so a low intensity is not a full set of false lashes
  const sStr = styled ? Math.min(1, Math.max(0, l.mascara?.styleStrength ?? 1)) : 0, sf = (f: number) => 1 + (f - 1) * sStr;
  // a single lid's fold presses bare lashes down; false lashes are curled and glued on, so they rise past it
  const rise = single ? sStr : 1;
  const lowD = lowerL ? Math.min(1, Math.max(0, lowerL.darkness)) : mD;
  // soft dark (or light) lines on the skin: creases, the fold of a single lid, a hood's shadow, an epicanthal fold
  const shadeLine = (pts: [number, number][], widthMm: number, blurMm: number, strength: number) => {
    const cr = createRaster(out.width, out.height);
    strokePolyline(cr, pts, widthMm / l.mmPerPx, blurMm / l.mmPerPx, [0, 0, 0], 1);
    const soft = gaussianBlur(cr.alpha, out.width, out.height, 1, (blurMm * 0.9) / l.mmPerPx);
    for (let i = 0; i < soft.length; i++) if (soft[i] > 0.01 && l.skinM[i]) { const k = 1 - strength * soft[i]; out.rgb[i * 3] *= strength > 0 ? k + 0.06 * (1 - k) : k; out.rgb[i * 3 + 1] *= k; out.rgb[i * 3 + 2] *= k; }
  };
  for (const s of ["L", "R"] as const) for (const which of ["upper", "lower"] as const) {
    const loop = LOOP(`eye-${which}.${s}`).map(i => l.V[i]);
    const pts = Math.abs(loop[0][0]) > Math.abs(loop[loop.length - 1][0]) ? loop.slice().reverse() : loop.slice(); // medial → lateral
    const at = (t: number): Vec3 => { const x = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(x)), f = x - i; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f, pts[i][2] + (pts[i + 1][2] - pts[i][2]) * f]; };
    const outward = Math.sign(pts[pts.length - 1][0] - pts[0][0]) || 1, upper = which === "upper";
    // Lashes grow in small clumps of two to four (about 90–150 upper, 75 lower in life; fewer drawn, each a little
    // bolder). Upper: 8–11 mm, longest in the outer third, growing forward and curling up, so from the front they rise
    // only a few millimetres; lower: 4–6 mm, sparse and pale, down and out. A single lid's fold presses the upper
    // lashes down and hides their roots.
    const clumps = upper ? Math.round((38 + 8 * (1 - sex)) * sf(style === "doll" ? 1.3 : style === "wispy" ? 1.2 : style === "spiky" ? 0.7 : 1)) : Math.round(18 * sf(style === "doll" ? 1.3 : 1));
    for (let cI = 0; cI < clumps; cI++) {
      const tc = 0.05 + 0.92 * ((cI + 0.5 + 0.4 * (hash2(l.seed + 61, cI, upper ? 1 : 2) - 0.5)) / clumps), nIn = 2 + Math.floor(hash2(l.seed + 67, cI, 3) * 3);
      const cLen = (upper ? (6.8 + 4.4 * Math.sin(Math.PI * Math.pow(tc, 0.7))) * (0.85 + 0.3 * hash2(l.seed + 53, cI, 1)) * (single ? 0.6 + (1 - 0.15 * sh.hood - 0.6) * rise : 1 - 0.15 * sh.hood) * mL : (2.6 + 2.6 * Math.sin(Math.PI * tc)) * (0.8 + 0.3 * hash2(l.seed + 59, cI, 2)) * (1 + (mL - 1) * 0.5) * (lowerL?.length ?? 1))
        * sf(style === "doll" ? 1.35 : upper && style === "spiky" ? 0.75 : 1);
      const cFan = ((tc - 0.42) * (upper ? 1.0 : 0.7) + (hash2(l.seed + 71, cI, 4) - 0.5) * 0.15) * sf(style === "doll" ? 1.25 : 1);
      for (let k = 0; k < (upper ? nIn : 1 + (nIn > 3 ? 1 : 0)); k++) {
        const t = tc + (hash2(l.seed + 73, cI * 7 + k, 5) - 0.5) * (0.9 / clumps), base = at(Math.min(0.99, Math.max(0.01, t)));
        const rnd = hash2(l.seed + 79, cI * 7 + k, 6), lenRaw = cLen * (style === "wispy" ? 0.85 + 0.25 * rnd + (0.45 * rnd - 0.2) * sStr : 0.85 + 0.25 * rnd) * (upper ? lashLen : 1 + 0.1 * mk);
        const len = styled ? Math.min(14, lenRaw) : lenRaw, fan = cFan + (hash2(l.seed + 83, cI * 7 + k, 7) - 0.5) * 0.12;
        const lift = upper ? (single ? 0.12 + 0.43 * rise : 0.55) : -0.3;
        const ptsS: [number, number][] = [];
        for (let q = 0; q <= 6; q++) {
          const u = q / 6, curl = lift * u * u;
          // the tips of a clump draw together
          const conv = upper ? -0.06 * u * u * (k - (nIn - 1) / 2) : 0;
          const p = l.rot([base[0] + outward * (fan * len * u + conv), base[1] + (upper ? (single ? -0.05 + 0.13 * rise : 0.08) * u + curl * 0.42 : -0.2 * u + curl * 0.4) * len, base[2] + 0.85 * len * u]);
          ptsS.push(l.proj(p[0], p[1], p[2]));
        }
        strokePolyline(out, ptsS, (upper ? 0.17 * lashW : 0.08 * (1 + 0.3 * mk)) * mT * sf(style === "wispy" || (upper && style === "spiky") ? 0.8 : 1) / l.mmPerPx, 0.02 * mT / l.mmPerPx, l.col, Math.min(1, (upper ? 0.94 : 0.42 + 0.2 * mk) * (0.6 + 0.8 * (upper ? mD : lowD))));
      }
    }
    // manga (spiky) false lashes: 5-7 spikes, 10-14 mm, longest in the outer third, each a few lashes drawn to one tip
    if (upper && style === "spiky") {
      const nSp = 5 + Math.floor(hash2(l.seed + 101, s === "L" ? 1 : 2, 0) * 3);
      for (let i = 0; i < nSp; i++) {
        const t = 0.16 + 0.78 * ((i + 0.5) / nSp), spikeLen = Math.min(14, (10.2 + 3.6 * Math.sin(Math.PI * Math.pow(t, 0.8))) * mL) * (0.5 + 0.5 * sStr);
        const lift = single ? 0.12 + 0.43 * rise : 0.55, fan0 = (t - 0.42) * 1.05;
        for (let k = 0; k < 4; k++) {
          const base = at(Math.min(0.99, Math.max(0.01, t + (k - 1.5) * 0.012))), ptsS: [number, number][] = [];
          for (let q = 0; q <= 6; q++) {
            const u = q / 6, curl = lift * u * u, conv = -0.28 * u * u * (k - 1.5);
            const p = l.rot([base[0] + outward * (fan0 * spikeLen * u + conv), base[1] + ((single ? -0.05 + 0.13 * rise : 0.08) * u + curl * 0.42) * spikeLen, base[2] + 0.85 * spikeLen * u]);
            ptsS.push(l.proj(p[0], p[1], p[2]));
          }
          strokePolyline(out, ptsS, 0.18 * mT / l.mmPerPx, 0.02 / l.mmPerPx, l.col, 0.97 * sStr);
        }
      }
    }
    // lower lashes drawn with liner: tapered strokes 2-4 mm down from the lower lash line, on its outer two thirds
    if (!upper && lowerL && lowerL.drawn > 0) {
      const n = Math.round(lowerL.drawn);
      for (let i = 0; i < n; i++) {
        const f = (i + 0.5) / n, t = 0.36 + 0.58 * f, base = at(t), len = 2 + 2 * f, out1 = 0.18 + 0.38 * f, seg: [number, number][] = [];
        for (let q = 0; q <= 4; q++) { const u = q / 4, p = l.rot([base[0] + outward * out1 * len * u, base[1] - 0.45 - len * u * (1 - 0.15 * u), base[2] + 0.25 - 0.3 * u]); seg.push(l.proj(p[0], p[1], p[2])); }
        for (let q = 1; q < seg.length; q++) strokePolyline(out, [seg[q - 1], seg[q]], (0.17 - 0.03 * q) / l.mmPerPx, 0.03 / l.mmPerPx, l.col, Math.min(1, 0.55 + 0.45 * lowD));
      }
    }
    // the lash line: a soft dark margin along the upper lid
    if (upper) {
      const line: [number, number][] = [];
      for (let q = 0; q <= 20; q++) { const p = l.rot(at(q / 20)); line.push(l.proj(p[0], p[1] + 0.2, p[2] + 0.2)); }
      // the lash roots and the lid margin's shadow, thinner toward the inner corner; with makeup a liner along it,
      // widening outward (glamour: winged past the outer corner)
      const liner: [number, number][] = [], widths: number[] = [];
      for (let q = 0; q <= 24; q++) { const t = q / 24, p = l.rot(at(t)); liner.push(l.proj(p[0], p[1] + 0.25, p[2] + 0.2)); widths.push(0.55 + (0.35 + 0.9 * mk) * t ** 1.5); }
      for (let q = 1; q < liner.length; q++) strokePolyline(out, [liner[q - 1], liner[q]], ((widths[q - 1] + widths[q]) / 2) * (0.8 + 0.4 * mD) / l.mmPerPx, 0.35 / l.mmPerPx, [0.02, 0.015, 0.014], Math.min(1, (0.8 + 0.15 * Math.min(1, mk * 2)) * (0.7 + 0.6 * mD)));
      if (glam) {
        const p0 = at(1), ax = outward;
        const wing: [number, number][] = [0, 1, 2, 3, 4, 5].map(q => { const u = q / 5, p = l.rot([p0[0] + ax * 6 * u, p0[1] + 0.3 + 2.4 * u, p0[2] - 1.2 * u]); return l.proj(p[0], p[1], p[2]); });
        for (let q = 1; q < wing.length; q++) strokePolyline(out, [wing[q - 1], wing[q]], (1.3 * (1 - (q - 0.5) / 5) + 0.1) / l.mmPerPx, 0.25 / l.mmPerPx, [0.015, 0.012, 0.012], 0.92);
      }
      void line;
      if (!single) {
        // the upper-lid crease at the shape's height (highest near the middle); an in-fold crease starts low, in the
        // epicanthal fold at the inner corner; a hood hangs over it and brings the visible fold down
        const crease: [number, number][] = [], band: [number, number][] = [];
        for (let q = 1; q <= 19; q++) {
          const tq = q / 20, prof = sh.infold ? Math.min(1, 0.12 + tq * 2.4) * Math.sin(Math.PI * (0.2 + 0.8 * tq)) ** 0.4 : Math.sin(Math.PI * tq) ** 0.55;
          const hgt = sh.crease * (0.3 + 0.7 * prof) * (1 - 0.5 * sh.hood), p = l.rot(at(tq));
          crease.push(l.proj(p[0], p[1] + hgt, p[2] - 0.6 - 0.06 * hgt));
          band.push(l.proj(p[0], p[1] + hgt * 0.55, p[2] - 0.3));
        }
        // a defined crease line, the fold's soft shadow just above it, and the lid platform below catching the light
        shadeLine(crease, 0.45, 0.3, 0.5 + 0.15 * sh.hood);
        shadeLine(crease.map(([x, y]) => [x, y - 0.9 / l.mmPerPx] as [number, number]), 1.4, 0.9, 0.12);
        shadeLine(band, Math.max(0.8, sh.crease * 0.45), 0.8, sh.hood > 0.2 ? 0.2 * sh.hood : -0.05);
      } else {
        // a single lid: the fold rests on the lashes, a soft shadow just above the lash line and no crease
        const fold: [number, number][] = [];
        for (let q = 1; q <= 19; q++) { const p = l.rot(at(q / 20)); fold.push(l.proj(p[0], p[1] + 1.3, p[2] + 0.2)); }
        shadeLine(fold, 1.8, 1.1, 0.24);
      }
      // an epicanthal fold: skin from the upper lid curving down over the inner corner toward the lower lid
      if (sh.epicanthal > 0.05) {
        const c0 = at(0), arc: [number, number][] = [];
        for (let q = 0; q <= 10; q++) { const a2 = (q / 10) * Math.PI * 0.85, p = l.rot([c0[0] - outward * (0.6 + 1.8 * Math.sin(a2)) * sh.epicanthal, c0[1] + 2.2 * Math.cos(a2) * (0.6 + 0.4 * sh.epicanthal) - 0.6, c0[2] + 0.4]); arc.push(l.proj(p[0], p[1], p[2])); }
        shadeLine(arc, 0.6, 0.45, 0.32 * sh.epicanthal);
      }
    }
  }
}

// ---- Ears ------------------------------------------------------------------------------------------------------------------------

function drawEars(out: Raster, e: { proj: (p: Vec3) => [number, number]; headHalfW: number; tragionY: number; browY: number; sn: number; zEar: number; skinHex: string; Lkey: Vec3; keyI: RGB3; mmPerPx: number; yaw: number;
  depth?: Float32Array; depthOf?: (p: Vec3) => number; rot?: (p: Vec3) => Vec3; lit?: (p: Vec3) => number; fillI?: RGB3; skyI?: RGB3; Lfill?: Vec3 }) {
  // The ear as a relief, shaded per pixel: the helix rim rolling round the top and back, the Y of the antihelix inside
  // it, the deep bowl of the concha, the tragus in front, a fleshy lobe; lit like the skin (with the key's shadow,
  // hair included), darker in the folds, and red where light passes through the thin cartilage.
  const ear = mixC(linearOf(e.skinHex), linearOf(skinZoneColor(e.skinHex, "ears")), 0.6), top = e.browY - 2, bot = e.sn - 2, len = top - bot;
  const rot = e.rot ?? ((q: Vec3) => q), W = out.width, Hh = out.height;
  const fillI = e.fillI ?? [0.17, 0.18, 0.2], skyI = e.skyI ?? [0.15, 0.16, 0.19], Lfill = e.Lfill ?? norm3([0.62, -0.05, 0.78]);
  // the outline in ear coordinates (u outward from the head, mm; v up, mm from the ear's mid height)
  const vm = (top + bot) / 2, V = (y: number) => y - vm;
  // (an adult ear is about 60–65 mm long and 30–35 mm wide; u runs from the tragus back to the helix)
  const K = 2.6, rough = ([[0, V(top - len * 0.05)], [5, V(top + 2)], [10, V(top - len * 0.06)], [12.5, V(top - len * 0.25)], [11.5, V(top - len * 0.5)], [9, V(top - len * 0.74)], [6.5, V(bot + 4)], [4.5, V(bot - 0.5)], [1.8, V(bot - 0.5)], [0, V(bot + 5)]] as [number, number][]).map(([u, v]) => [u * K, v] as [number, number]);
  // a smooth outline through those points (Catmull-Rom, closed): no corners on the helix
  const outline: [number, number][] = [];
  for (let i = 0; i < rough.length; i++) {
    const p0 = rough[(i - 1 + rough.length) % rough.length], p1 = rough[i], p2 = rough[(i + 1) % rough.length], p3 = rough[(i + 2) % rough.length];
    for (let k = 0; k < 6; k++) { const t = k / 6, t2 = t * t, t3 = t2 * t; outline.push([0, 1].map(c => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)) as [number, number]); }
  }
  const inside = (u: number, v: number) => { let c = false; for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) { const [xi, yi] = outline[i], [xj, yj] = outline[j]; if ((yi > v) !== (yj > v) && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const edgeDist = (u: number, v: number) => { let d = Infinity; for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) { const [x1, y1] = outline[j], [x2, y2] = outline[i], dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((u - x1) * dx + (v - y1) * dy) / (dx * dx + dy * dy))); d = Math.min(d, Math.hypot(u - x1 - dx * t, v - y1 - dy * t)); } return d; };
  const lobeV = V(bot + len * 0.18);
  // the antihelix: a ridge from the upper inner ear curving down to the antitragus
  const anti: [number, number][] = ([[4, V(top - len * 0.12)], [6.5, V(top - len * 0.3)], [7, V(top - len * 0.5)], [5.5, V(top - len * 0.68)], [3.2, V(bot + len * 0.26)]] as [number, number][]).map(([u, v]) => [u * K, v] as [number, number]);
  const segD = (u: number, v: number, pts: [number, number][]) => { let d = Infinity; for (let i = 1; i < pts.length; i++) { const [x1, y1] = pts[i - 1], [x2, y2] = pts[i], dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((u - x1) * dx + (v - y1) * dy) / (dx * dx + dy * dy))); d = Math.min(d, Math.hypot(u - x1 - dx * t, v - y1 - dy * t)); } return d; };
  const height = (u: number, v: number) => {
    if (!inside(u, v)) return NaN;
    const ed = edgeDist(u, v), lobe = smoothstep(lobeV + 3, lobeV - 3, v), front = smoothstep(5, 1, u);
    const helix = 2.2 * Math.exp(-((ed - 1.8) ** 2) / 1.6) * (1 - lobe) * (1 - front * 0.8);
    const antihelix = 1.6 * Math.exp(-(segD(u, v, anti) ** 2) / 3) * (1 - lobe);
    const concha = -3 * Math.exp(-(((u - 3.2 * K) / (2.6 * K)) ** 2 + ((v - V(top - len * 0.6)) / 5) ** 2));
    const tragus = 1.4 * Math.exp(-(((u - 1.5) / 2.2) ** 2 + ((v - V(top - len * 0.62)) / 3) ** 2));
    return helix + antihelix + concha + tragus + 0.9 * lobe * Math.sqrt(Math.max(0, 1 - (ed > 3 ? 0 : (3 - ed) / 3) ** 2));
  };
  for (const s of [-1, 1]) {
    const origin: Vec3 = [s * (e.headHalfW - 3), vm, e.zEar + 14];
    // the ear's plane: back along the head, standing off it by about 30° (the helix furthest out), up; its face looks outward and forward
    const U3: Vec3 = norm3([s * 0.5, 0, -0.866]), N3: Vec3 = norm3([s * 0.866, 0.05, 0.5]);
    const at = (u: number, v: number, h = 0): Vec3 => [origin[0] + U3[0] * u + N3[0] * h * 0.3, origin[1] + v + N3[1] * h * 0.3, origin[2] + U3[2] * u + N3[2] * h * 0.3];
    // an affine map from the ear's (u, v) to the screen, and back
    const p0 = e.proj(at(0, 0)), pu = e.proj(at(1, 0)), pv = e.proj(at(0, 1));
    const a11 = pu[0] - p0[0], a12 = pv[0] - p0[0], a21 = pu[1] - p0[1], a22 = pv[1] - p0[1], det = a11 * a22 - a12 * a21;
    if (Math.abs(det) < 1e-6) continue;
    const poly = outline.map(([u, v]) => e.proj(at(u, v)));
    const x0 = Math.max(0, Math.floor(Math.min(...poly.map(q => q[0])) - 2)), x1 = Math.min(W - 1, Math.ceil(Math.max(...poly.map(q => q[0])) + 2));
    const y0 = Math.max(0, Math.floor(Math.min(...poly.map(q => q[1])) - 2)), y1 = Math.min(Hh - 1, Math.ceil(Math.max(...poly.map(q => q[1])) + 2));
    const zE = e.depthOf ? e.depthOf([s * (e.headHalfW + 2), vm, e.zEar - 5]) : 0;
    const Uw = norm3(rot([origin[0] + U3[0], origin[1] + U3[1], origin[2] + U3[2]]).map((c, k) => c - rot(origin)[k]) as Vec3), Nw = norm3(rot([origin[0] + N3[0], origin[1] + N3[1], origin[2] + N3[2]]).map((c, k) => c - rot(origin)[k]) as Vec3), Vw = norm3([Nw[1] * Uw[2] - Nw[2] * Uw[1], Nw[2] * Uw[0] - Nw[0] * Uw[2], Nw[0] * Uw[1] - Nw[1] * Uw[0]]);
    const sh = e.lit ? e.lit(rot(at(6, 0))) : 1, step = 0.25;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - p0[0], dy = y + 0.5 - p0[1], u = (a22 * dx - a12 * dy) / det, v = (-a21 * dx + a11 * dy) / det;
      const h = height(u, v);
      if (Number.isNaN(h)) continue;
      // hidden where the head is nearer (the ear's root lies behind the cheek and the side of the head)
      const pix = y * W + x;
      if (e.depth && e.depthOf && e.depth[pix] > e.depthOf(at(u, v, h)) + 0.8) continue;
      // edge coverage: soften the outline over about a pixel
      const cov = Math.min(1, edgeDist(u, v) / Math.max(0.05, e.mmPerPx * 0.8));
      const hh = (a: number, b: number) => { const q = height(a, b); return Number.isNaN(q) ? h : q; };
      const hu = (hh(u + step, v) - hh(u - step, v)) / (2 * step), hv = (hh(u, v + step) - hh(u, v - step)) / (2 * step);
      const nl3 = norm3([-hu * 0.6, -Math.max(-3, Math.min(3, hv)) * 0.6 * (s < 0 ? 1 : 1), 1]);
      const n = norm3([Uw[0] * nl3[0] + Vw[0] * nl3[1] * -1 + Nw[0] * nl3[2], Uw[1] * nl3[0] + Vw[1] * nl3[1] * -1 + Nw[1] * nl3[2], Uw[2] * nl3[0] + Vw[2] * nl3[1] * -1 + Nw[2] * nl3[2]]);
      const nlk = dot3(n, e.Lkey), nlf = dot3(n, Lfill);
      // folds hold less light (occlusion follows the relief: the concha deepest)
      const ao = Math.min(1, Math.max(0.5, 0.78 + 0.1 * h));
      const thin = smoothstep(1.5, 0, edgeDist(u, v)) * (1 - smoothstep(lobeV + 3, lobeV - 3, v));
      const trans = Math.max(0, -nlk) * 0.35 + thin * 0.25 * Math.max(0, 0.3 - nlk);
      const c: RGB3 = [0, 1, 2].map(k => ear[k] * (e.keyI[k] * Math.max(0, (nlk + 0.1) / 1.1) * sh * 0.42 + fillI[k] * Math.max(0, (nlf + 0.2) / 1.2) * 0.9 * ao + skyI[k] * ao * (0.6 + 0.4 * n[1]) + 0.05 * ao)
        + [0.9, 0.25, 0.12][k] * trans * ear[k] * e.keyI[k] * 0.25 * sh) as unknown as RGB3;
      const i = y * W + x;
      for (let k = 0; k < 3; k++) out.rgb[i * 3 + k] = out.rgb[i * 3 + k] * (1 - cov) + c[k] * cov;
      if (e.depth && cov > 0.5) e.depth[i] = Math.max(e.depth[i], zE);
    }
  }
}

/** A portrait's landmark positions are not needed by most callers; `FACE_LANDMARKS` and the face are returned for reports. */
export type { BeautifulFace };
