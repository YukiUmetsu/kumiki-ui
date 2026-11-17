/**
 * MAKEUP1 paint: a MakeupPlan on skin.
 *
 *   makeupPaint(plan)        the SkinPaint ANAT1's portrait renderer calls per skin pixel (renderPortrait({ paint }))
 *   paintPhoto(photo, plan)  the same layers on a photograph, given its 478 MediaPipe face landmarks
 *
 * Each product is a pigment film (makeup-color.ts): what it hides it replaces, what it lets through it filters; light
 * the film reflects itself does not scatter under the skin (so heavy foundation looks flatter, as in life). Finishes
 * change the skin's roughness and specular strength; shimmer and glitter add flakes fixed to the skin.
 *
 * Photos: the face is fitted to the canonical mesh (Horn's closed-form similarity), every pixel gets its rest
 * position through the mesh, and frequency separation keeps the photo's own texture: luminance relief (pores, fine
 * lines, the form's light) stays with the light layer, so makeup changes colour and value, not the skin's surface. The
 * Python pipeline (scripts/makeup) adds a measured light model and dense transfer from reference photographs.
 */
import type { Vec3 } from "./anatomy-body";
import type { Lab, RGB } from "./anatomy-color";
import faceData from "./data/face-mesh-mediapipe.json";
import { beautifulFace } from "./face-beauty";
import type { PortraitOptions, SkinPaint, SkinPaintSample } from "./face-portrait";
import { gaussianBlur, hash2, rasterizeTriangles, srgbDecode, srgbEncode } from "./foundation-raster";
import { filmStep, labToLinear, linearToLab, pigmentFor } from "./makeup-color";
import type { BlendMode } from "./makeup-color";
import { tapedEyeShape } from "./makeup-design";
import type { MakeupPlan } from "./makeup-design";
import { MAKEUP_ATLAS, zoneField } from "./makeup-zones";
import type { FinishSpec } from "./makeup-zones";

const LUMA: RGB = [0.2126, 0.7152, 0.0722];
const lum = (c: readonly number[]) => c[0] * LUMA[0] + c[1] * LUMA[1] + c[2] * LUMA[2];

/** Blend a pigment into a sample's skin and film parts. */
function blend(s: SkinPaintSample, w: number, m: RGB, hide: number, mode: BlendMode): void {
  if (mode === "film" || mode === "multiply" || mode === "normal") { filmStep(s.albedo, s.film, w, m, mode === "multiply" ? 0 : mode === "normal" ? 1 : hide); return; }
  const total = [0, 1, 2].map(k => s.albedo[k] + s.film[k]);
  let next: number[];
  if (mode === "screen") next = total.map((t, k) => 1 - (1 - t) * (1 - w * m[k]));
  else {
    // W3C soft light on gamma-encoded values (as designers expect it to look)
    next = total.map((t, k) => {
      const cb = srgbEncode(Math.min(1, t)), cs = srgbEncode(m[k]), d = cb <= 0.25 ? ((16 * cb - 12) * cb + 4) * cb : Math.sqrt(cb);
      return t + w * (srgbDecode(cs <= 0.5 ? cb - (1 - 2 * cs) * cb * (1 - cb) : cb + (2 * cs - 1) * (d - cb)) - t);
    });
  }
  for (let k = 0; k < 3; k++) {
    if (next[k] >= total[k]) s.film[k] += next[k] - total[k];
    else { const r = next[k] / Math.max(1e-6, total[k]); s.albedo[k] *= r; s.film[k] *= r; }
  }
}

interface Resolved { field: (p: Vec3) => number; coverage: number; hide: number; blend: BlendMode; finish: FinishSpec; pigment?: RGB; rel?: [number, number, number] }

/** The SkinPaint for a plan (scale a look with designMakeup's `intensity`). */
export function makeupPaint(plan: MakeupPlan): SkinPaint {
  const skinLin = labToLinear(plan.skin.lab);
  let layers: Resolved[] = [];
  return {
    key: JSON.stringify(["makeup1", plan.look, plan.intensity, plan.skin.hex, plan.layers, plan.lashes, plan.brows, plan.eyes]),
    lashes: plan.lashes,
    eyes: plan.eyes?.lens ? { lens: plan.eyes.lens } : undefined,
    brows: { colour: labToLinear(plan.brows.colour), density: plan.brows.density, straight: plan.brows.straight },
    prepare(neutral) {
      layers = plan.layers.map(L => {
        const r: Resolved = { field: zoneField(L.zone, neutral, L.adjust), coverage: L.coverage, hide: L.hide, blend: L.blend, finish: MAKEUP_ATLAS.finishes[L.finish] };
        if ("lab" in L.colour) r.pigment = labToLinear(L.colour.lab);
        else if (L.colour.to === "skin") {
          const t = L.colour.relative, base = plan.skin.lab;
          r.pigment = pigmentFor(labToLinear([base[0] + t.dL, base[1] + t.da, base[2] + t.db]), skinLin, L.hide);
        } else r.rel = [L.colour.relative.dL, L.colour.relative.da, L.colour.relative.db];
        return r;
      });
    },
    shade(rest, s) {
      for (const L of layers) {
        const w = L.field(rest) * L.coverage;
        if (w < 1e-3) continue;
        let m = L.pigment;
        if (!m) {
          // relative to this zone's own colour, pixel by pixel (a lip tint follows the lip's own variation)
          const base = [s.albedo[0] + s.film[0], s.albedo[1] + s.film[1], s.albedo[2] + s.film[2]] as RGB, lab = linearToLab(base);
          m = pigmentFor(labToLinear([lab[0] + L.rel![0], lab[1] + L.rel![1], lab[2] + L.rel![2]] as Lab), base, L.hide);
        }
        blend(s, w, m, L.hide, L.blend);
        s.roughness += (L.finish.roughness - s.roughness) * w;
        s.specular *= 1 + (L.finish.specular - 1) * w;
        s.sparkle = Math.max(s.sparkle, w * L.finish.sparkle);
        if (L.finish.tinted && w > 0.3) s.tint = [m[0], m[1], m[2]];
      }
    },
  };
}

/** Whether a plan changes the face at all (layers, eye tools, lashes or brows). A bare plan renders the bare portrait. */
export function wearsMakeup(plan: MakeupPlan): boolean {
  const l = plan.lashes;
  return plan.layers.length > 0 || !!plan.eyes?.lens || (plan.eyes?.tape ?? 0) > 0 || (plan.brows.straight ?? 0) > 0 || plan.brows.density !== 1
    || l.length !== 1 || l.thickness !== 1 || l.darkness !== 0.5 || (l.style ?? "natural") !== "natural" || (l.curl ?? 0) > 0 || l.lower !== undefined;
}

/**
 * Portrait options that wear a plan: its paint, the eye shape with its tape, and none of the renderer's own makeup unless
 * `portrait.makeup` asks for it. For `renderPortrait` or `FacePortrait`.
 */
export function makeupPortraitOptions(portrait: PortraitOptions, plan: MakeupPlan): PortraitOptions {
  const options: PortraitOptions = { makeup: "none", ...portrait, paint: makeupPaint(plan) }, taped = tapedShape(portrait, plan);
  if (taped) options.eyeShape = taped;
  return options;
}

/** The face as a plan wears it (tape changes the lids): check and chart a taped plan on this face. */
export function wornFace(portrait: PortraitOptions, plan: MakeupPlan): readonly Vec3[] {
  const taped = tapedShape(portrait, plan);
  return beautifulFace(taped ? { ...portrait, eyeShape: taped } : portrait).vertices;
}

/** Tape changes the face's own eye shape; a face with measured lids (no eye shape) is left as it is. */
function tapedShape(portrait: PortraitOptions, plan: MakeupPlan) {
  const tape = plan.eyes?.tape ?? 0, own = tape > 0 ? beautifulFace(portrait).eyeShape : undefined;
  return own ? tapedEyeShape(own, tape) : undefined;
}

// ---- Photographs -----------------------------------------------------------------------------------------------------

const CANON = faceData.vertices as Vec3[];
const TRIS = faceData.triangles as number[][];
/** Vertices that move little with expression: the pose fit uses these (the Python pipeline uses the same list). */
const STABLE = [10, 151, 9, 8, 168, 6, 197, 195, 5, 4, 1, 33, 133, 263, 362, 130, 359, 243, 463, 116, 345, 117, 346, 118, 347, 50, 280, 123, 352, 108, 337, 69, 299, 104, 333, 105, 334, 66, 296, 107, 336, 55, 285];
const OPENINGS = [new Set([33, 246, 161, 160, 159, 158, 157, 173, 133, 7, 163, 144, 145, 153, 154, 155]), new Set([263, 466, 388, 387, 386, 385, 384, 398, 362, 249, 390, 373, 374, 380, 381, 382]),
  new Set([78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 95, 88, 178, 87, 14, 317, 402, 318, 324])];
const SKIN_TRIS = TRIS.filter(t => !OPENINGS.some(s => t.every(v => s.has(v)))).flat();

/**
 * A photo's landmarks in the face's rest frame (mm, +x the face's left, +y up, +z forward): the similarity (scale,
 * rotation, translation) that best fits the stable vertices to the canonical mesh, by Horn's quaternion method (1987).
 * `landmarks`: MediaPipe's normalised landmarks times [width, height, width] (x right, y down, z away from the camera).
 */
export function restFrame(landmarks: readonly (readonly number[])[]): { rest: Vec3[]; scale: number; yaw: number; pitch: number; roll: number } {
  const cam = landmarks.map(p => [p[0], -p[1], -p[2]] as Vec3);
  const mean = (pts: Vec3[]) => pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length] as Vec3, [0, 0, 0] as Vec3);
  const P = STABLE.map(i => cam[i]), Q = STABLE.map(i => CANON[i]), pm = mean(P), qm = mean(Q);
  const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  P.forEach((p, k) => { for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) S[a][b] += (p[a] - pm[a]) * (Q[k][b] - qm[b]); });
  const [[xx, xy, xz], [yx, yy, yz], [zx, zy, zz]] = S;
  const N = [[xx + yy + zz, yz - zy, zx - xz, xy - yx], [yz - zy, xx - yy - zz, xy + yx, zx + xz], [zx - xz, xy + yx, -xx + yy - zz, yz + zy], [xy - yx, zx + xz, yz + zy, -xx - yy + zz]];
  // the eigenvector of N's largest eigenvalue, by power iteration on a shifted (positive) matrix
  const shift = N.flat().reduce((s, v) => s + Math.abs(v), 0);
  let q = [1, 0, 0, 0];
  for (let it = 0; it < 200; it++) {
    const nq = [0, 1, 2, 3].map(r => N[r].reduce((s, v, c) => s + v * q[c], 0) + shift * q[r]), n = Math.hypot(...nq);
    q = nq.map(v => v / n);
  }
  const [w, x, y, z] = q;
  const R = [[w * w + x * x - y * y - z * z, 2 * (x * y - w * z), 2 * (x * z + w * y)], [2 * (x * y + w * z), w * w - x * x + y * y - z * z, 2 * (y * z - w * x)], [2 * (x * z - w * y), 2 * (y * z + w * x), w * w - x * x - y * y + z * z]];
  const rot = (p: Vec3): Vec3 => [R[0][0] * p[0] + R[0][1] * p[1] + R[0][2] * p[2], R[1][0] * p[0] + R[1][1] * p[1] + R[1][2] * p[2], R[2][0] * p[0] + R[2][1] * p[1] + R[2][2] * p[2]];
  let num = 0, den = 0;
  P.forEach((p, k) => { const r = rot([p[0] - pm[0], p[1] - pm[1], p[2] - pm[2]]); num += r[0] * (Q[k][0] - qm[0]) + r[1] * (Q[k][1] - qm[1]) + r[2] * (Q[k][2] - qm[2]); den += (p[0] - pm[0]) ** 2 + (p[1] - pm[1]) ** 2 + (p[2] - pm[2]) ** 2; });
  const s = num / den, rpm = rot(pm), t: Vec3 = [qm[0] - s * rpm[0], qm[1] - s * rpm[1], qm[2] - s * rpm[2]];
  const rest = cam.map(p => { const r = rot(p); return [s * r[0] + t[0], s * r[1] + t[1], s * r[2] + t[2]] as Vec3; });
  // head pose: the rotation from the canonical face to the camera is R transposed
  const deg = 180 / Math.PI;
  return { rest, scale: s, yaw: Math.atan2(R[2][0], R[2][2]) * deg, pitch: Math.asin(Math.max(-1, Math.min(1, -R[2][1]))) * deg, roll: Math.atan2(R[0][1], R[1][1]) * deg };
}

export interface PhotoFace {
  width: number; height: number;
  /** sRGB pixels, RGBA. */
  data: Uint8ClampedArray;
  /** 478 MediaPipe landmarks in pixels (x right, y down, z scaled like x, away from the camera). */
  landmarks: readonly (readonly number[])[];
  /** Optional skin mask (1 = face skin, e.g. MediaPipe's multiclass segmenter): keeps paint off hair and hands. */
  skinMask?: Uint8Array | null;
}

/** Paint a plan onto a photograph; returns new RGBA pixels. The plan's colours adapt to the photo's own skin. */
export function paintPhoto(photo: PhotoFace, plan: MakeupPlan): Uint8ClampedArray {
  const { width: W, height: H, data, landmarks } = photo, n = W * H;
  const { rest } = restFrame(landmarks);
  const sx = new Float32Array(468), sy = new Float32Array(468), sz = new Float32Array(468);
  for (let i = 0; i < 468; i++) { sx[i] = landmarks[i][0]; sy[i] = landmarks[i][1]; sz[i] = -landmarks[i][2]; }
  const buf = rasterizeTriangles(W, H, sx, sy, sz, SKIN_TRIS);
  const lin = new Float32Array(n * 3), m = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) lin[i * 3 + k] = srgbDecode(data[i * 4 + k] / 255);
    m[i] = buf.tri[i] >= 0 && (!photo.skinMask || photo.skinMask[i]) ? 1 : 0;
  }
  const ewPx = (Math.hypot(landmarks[33][0] - landmarks[133][0], landmarks[33][1] - landmarks[133][1]) + Math.hypot(landmarks[263][0] - landmarks[362][0], landmarks[263][1] - landmarks[362][1])) / 2;
  // frequency separation inside the face: a smooth colour layer and the detail ratio
  const sig = Math.max(0.8, 0.06 * ewPx), wl = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) wl[i * 3 + k] = lin[i * 3 + k] * m[i];
  const lowS = gaussianBlur(wl, W, H, 3, sig), mS = gaussianBlur(m, W, H, 1, sig);
  const restAt = (i: number): Vec3 => {
    const t = SKIN_TRIS, tri = buf.tri[i], a = t[tri * 3], b = t[tri * 3 + 1], c = t[tri * 3 + 2], b1 = buf.b1[i], b2 = buf.b2[i], b0 = 1 - b1 - b2;
    return [rest[a][0] * b0 + rest[b][0] * b1 + rest[c][0] * b2, rest[a][1] * b0 + rest[b][1] * b1 + rest[c][1] * b2, rest[a][2] * b0 + rest[b][2] * b1 + rest[c][2] * b2];
  };
  // the skin's colour: the median of clean skin (not brows, lips or lids)
  const notSkin = ["brow", "lips", "lid", "liner"].map(z => zoneField(z, rest));
  const samples: number[][] = [];
  for (let i = 0; i < n; i += 3) if (m[i] && notSkin.every(f => f(restAt(i)) < 0.15)) samples.push([lowS[i * 3] / mS[i], lowS[i * 3 + 1] / mS[i], lowS[i * 3 + 2] / mS[i]]);
  const med = (k: number) => { const v = samples.map(s => s[k]).sort((p, q) => p - q); return v[Math.floor(v.length / 2)] ?? 0.3; };
  const base: RGB = [med(0), med(1), med(2)], yBase = Math.max(1e-4, lum(base));
  // Lips and brows are darker than the skin by their own colour, not by the light. Their mean luminance against the
  // skin around them goes back into their albedo, so a film covers their true colour and is lit like the skin there.
  const feature = ["lips", "brow"].map(z => zoneField(z, rest));
  const fw = new Float32Array(n), wF = new Float32Array(n), sF = new Float32Array(n), wS = new Float32Array(n), sS = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    if (!m[i]) continue;
    const p = restAt(i), f = Math.min(1, Math.max(feature[0](p), feature[1](p)));
    // each pixel's own luminance (not the smooth layer's) and each side's core, so the edge mixes neither into the other
    const S = lum([lin[i * 3], lin[i * 3 + 1], lin[i * 3 + 2]]) / yBase;
    fw[i] = f; wF[i] = f ** 4; sF[i] = S * wF[i]; wS[i] = (1 - f) ** 4; sS[i] = S * wS[i];
  }
  const sigBroad = Math.max(1, 0.35 * ewPx);
  const [bF, bWF, bS, bWS] = [sF, wF, sS, wS].map(a => gaussianBlur(a, W, H, 1, sigBroad));
  const adapted: MakeupPlan = { ...plan, skin: { ...plan.skin, lab: linearToLab(base) } };
  const paint = makeupPaint(adapted);
  paint.prepare!(rest);
  const out = new Uint8ClampedArray(data);
  const s: SkinPaintSample = { albedo: [0, 0, 0], film: [0, 0, 0], roughness: 0.45, specular: 1, sparkle: 0, tint: null };
  for (let i = 0; i < n; i++) {
    if (!m[i]) continue;
    const low = [lowS[i * 3] / mS[i], lowS[i * 3 + 1] / mS[i], lowS[i * 3 + 2] / mS[i]], yl = Math.max(1e-5, lum(low));
    // the luminance variation goes to the light layer (form, pores). The albedo keeps the pixel's chroma at the skin's
    // value, or at the feature's own value on lips and brows.
    const own = fw[i] > 1e-3 ? Math.min(1.5, Math.max(0.1, (bF[i] / Math.max(1e-6, bWF[i])) / Math.max(1e-6, bS[i] / Math.max(1e-6, bWS[i])))) : 1;
    const S = yl / yBase / (1 + (own - 1) * fw[i]);
    for (let k = 0; k < 3; k++) { s.albedo[k] = low[k] / S; s.film[k] = 0; }
    s.roughness = 0.45; s.specular = 1; s.sparkle = 0; s.tint = null;
    const p = restAt(i);
    paint.shade(p, s);
    const tot = [s.albedo[0] + s.film[0], s.albedo[1] + s.film[1], s.albedo[2] + s.film[2]], hidden = Math.min(1, lum(s.film) / Math.max(1e-5, lum(tot)));
    // finish: matte takes away shine (the bright side of the detail), dewy adds a sheen where the face is lit, flakes sparkle
    const yi = lum([lin[i * 3], lin[i * 3 + 1], lin[i * 3 + 2]]), shine = Math.max(0, yi - yl);
    let add = 0;
    if (s.specular < 1) add -= (1 - s.specular) * shine * 0.8;
    else if (s.specular > 1) add += (s.specular - 1) * 0.12 * yBase * Math.max(0, S - 0.9) ** 2;
    if (s.sparkle > 0 && hash2(23, Math.floor(p[0] / 0.35), Math.floor(p[1] / 0.35)) > 1 - 0.3 * s.sparkle) add += 0.35 * yBase * Math.max(0, S - 0.7);
    const keep = 1 - 0.55 * hidden;
    for (let k = 0; k < 3; k++) {
      const D = lin[i * 3 + k] / Math.max(1e-5, low[k]);
      const v = tot[k] * S * Math.pow(Math.max(1e-4, D), keep) + add;
      out[i * 4 + k] = Math.round(Math.min(1, Math.max(0, srgbEncode(Math.max(0, v)))) * 255);
    }
  }
  return out;
}
