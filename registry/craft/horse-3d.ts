/** An original, anatomically measured stock horse for 3D scenes (Quarter-horse type).
 *
 * One continuous signed-distance hide (torso lofted through measured cross-sections,
 * then shoulder, forearm, hip, thigh, hamstring and gaskin masses blended on), a
 * detailed head (jowl, flat forehead, orbital rims, flared nostrils, lips, mobile
 * ears), joint landmarks (carpus, fetlock, point of hock, stifle), cannons with
 * flexor tendons, lofted hooves with coronet bands and steel shoes, wet eyes in
 * almond lids, and hair as strands (mane, forelock, tail, fetlock feathers).
 *
 * The skeleton follows the real limb segments (scapula, humerus, forearm, cannon,
 * pastern, hoof; femur, tibia, cannon, pastern, hoof), so a gait solver can place
 * joints where a horse has them. Rest pose: standing square.
 *
 * Coordinates: metres, +X forward, +Y up, ground at y = 0; −Z is the horse's left ("near") side, +Z its right ("off").
 * Landmarks were measured on a side-view photograph of a standing Quarter Horse
 * (Wikimedia Commons "Quarter Horse(REFON)-cleaned.jpg", CC BY 2.5) scaled to a
 * 1.52 m withers height; widths are estimates from breed conformation guides.
 */
import { BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, SkinnedMesh, Vector3 } from "three";
import { createAssetResources } from "./hero-asset";
import type { HeroAsset } from "./hero-asset";
import {
  bounded, chain, clamp01, clipBelow, displace, ellipsoid, fbm3, linearRgb, loftY, meshSdfCached, mirrorZ, mix,
  intersect, roundBox, roundCone, sculptGeometry, smoothstep, smoothSubtract, smoothUnion, sphere, torus, union,
} from "./sdf-sculpt";
import type { Sdf, SculptMesh, SculptShading, Vec3 } from "./sdf-sculpt";
import { carveSocket, createEyeball, eyelidSdf, seatEye } from "./sculpt-anatomy";
import type { EyeSpec, EyeStyle } from "./sculpt-anatomy";
import { bindToAutoRig, createAutoRig } from "./auto-rig";
import type { AutoRig } from "./auto-rig";
import { applySurfaceDetail } from "./surface-detail";
import { paintTexture } from "./canvas-texture";
import type { HeroActionSpec, HeroActionState } from "./hero-action";
import { actionTime, findAction } from "./hero-action";
import { HORSE_SKELETON, poseHorseGallop, poseHorseStand } from "./horse-gallop";
import type { HorseGallopOptions } from "./horse-gallop";

// ------------------------------------------------------------------ landmarks

/** Measured skeleton landmarks (metres), standing square. `z` is the lateral offset of the off (right) side; the near side mirrors it. */
export const HORSE_LANDMARKS = {
  withersHeight: 1.52,
  croupHeight: 1.57,
  bodyLength: 2.09,
  /** Fore limb joint centres. */
  fore: {
    scapulaTop: [.17, 1.43, .14] as Vec3, shoulder: [.48, 1.06, .17] as Vec3, elbow: [.2, .8, .16] as Vec3,
    carpus: [.21, .43, .14] as Vec3, fetlock: [.22, .155, .135] as Vec3, coffin: [.28, .06, .135] as Vec3, toe: [.36, 0, .135] as Vec3,
  },
  /** Hind limb joint centres. */
  hind: {
    hip: [-.75, 1.24, .19] as Vec3, stifle: [-.52, .88, .21] as Vec3, hock: [-.84, .52, .15] as Vec3,
    fetlock: [-.8, .16, .135] as Vec3, coffin: [-.74, .06, .135] as Vec3, toe: [-.66, 0, .135] as Vec3,
  },
  poll: [.95, 1.72, 0] as Vec3,
  muzzle: [1.31, 1.32, 0] as Vec3,
  dock: [-1.02, 1.45, 0] as Vec3,
} as const;

// ------------------------------------------------------------------ coats

/** Where a saddle pad lies on the back (a rounded box in the horse frame): shared by the tack and the coat's sweat marks. */
export const HORSE_SADDLE_AREA = { center: [-.03, 1.39, 0] as Vec3, half: [.36, .215, .6] as Vec3, radius: .07 };

export type HorseCoatId = "bay" | "chestnut" | "black" | "buckskin" | "grey" | "palomino";

export interface HorseCoat {
  id: HorseCoatId;
  label: string;
  /** Body colour (sRGB) in shade and in full sun on the topline. */
  body: string;
  bodyLight: string;
  /** Lower legs, mane, tail, muzzle, ear rims when the coat has black points. */
  points: string | null;
  /** Mane and tail colour. */
  hair: string;
  hairTip: string;
  /** Muzzle skin. */
  muzzle: string;
  /** Leg markings (white socks) from 0 (none) to fetlock height multiples; per leg: fore-near, fore-far, hind-near, hind-far. */
  socks?: readonly [number, number, number, number];
  /** White face marking. */
  face?: "none" | "star" | "blaze";
  sheen: string;
}

export const HORSE_COATS: Readonly<Record<HorseCoatId, HorseCoat>> = {
  bay: { id: "bay", label: "Bay", body: "#4a200d", bodyLight: "#82401b", points: "#120c09", hair: "#0f0a08", hairTip: "#2a1a12", muzzle: "#221c1a", sheen: "#c08050", socks: [0, 0, 0, 1.3], face: "star" },
  chestnut: { id: "chestnut", label: "Chestnut", body: "#6a2e12", bodyLight: "#b0602a", points: null, hair: "#7a3614", hairTip: "#b06a34", muzzle: "#2a1a14", sheen: "#d89060", socks: [1.6, 0, 1.2, 0], face: "blaze" },
  black: { id: "black", label: "Black", body: "#141010", bodyLight: "#3a2c26", points: "#0b0908", hair: "#090807", hairTip: "#1c1714", muzzle: "#121010", sheen: "#80746a", face: "none" },
  buckskin: { id: "buckskin", label: "Buckskin", body: "#8a6a3c", bodyLight: "#cfae72", points: "#14100c", hair: "#110d0a", hairTip: "#2c2218", muzzle: "#1e1814", sheen: "#e8c890", face: "none" },
  grey: { id: "grey", label: "Dapple grey", body: "#6e6c68", bodyLight: "#c9c6c0", points: "#3a3836", hair: "#d8d4cc", hairTip: "#f0ece4", muzzle: "#2a2826", sheen: "#ffffff", face: "none" },
  palomino: { id: "palomino", label: "Palomino", body: "#a2763c", bodyLight: "#e2bf7a", points: null, hair: "#e8dcc2", hairTip: "#fbf4e2", muzzle: "#3a2a22", sheen: "#ffe0a0", socks: [0, 1.2, 0, 1.1], face: "blaze" },
};

// ------------------------------------------------------------------ sculpt helpers

/** A cross-section of a loft: position along the axis, extents toward +v ("top") and −v, lateral half-width. */
interface LoftSection2 { s: number; top: number; bottom: number; halfWidth: number; n?: number }

/**
 * Bilaterally symmetric loft along a straight axis in the XY plane: `u` from `origin` along `dir`,
 * `v` perpendicular (dir rotated +90°), lateral = world Z. Torso, neck and head are blocked this way:
 * a handful of measured sections instead of a pile of blobs.
 */
function loftAlong(origin: Vec3, dir: readonly [number, number], sections: readonly LoftSection2[], capRound = .02): Sdf {
  const len = Math.hypot(dir[0], dir[1]), ux = dir[0] / len, uy = dir[1] / len, vx = -uy, vy = ux;
  const loft = loftY(sections.map(q => {
    const c = (q.top + q.bottom) / 2;
    return { y: q.s, w: q.halfWidth, front: q.top - c, back: c - q.bottom, z: c, n: q.n ?? 2.2 };
  }), capRound);
  return (x, y, z) => {
    const px = x - origin[0], py = y - origin[1];
    return loft(z, px * ux + py * uy, px * vx + py * vy);
  };
}

/** Head-local frame: `u` runs from the poll to the muzzle, `v` toward the forehead/face, `w` lateral. */
function headFrame(poll: Vec3, muzzle: Vec3) {
  const ux = muzzle[0] - poll[0], uy = muzzle[1] - poll[1], len = Math.hypot(ux, uy);
  const U: Vec3 = [ux / len, uy / len, 0], V: Vec3 = [-U[1], U[0], 0];
  const at = (u: number, v: number, w = 0): Vec3 => [poll[0] + U[0] * u + V[0] * v, poll[1] + U[1] * u + V[1] * v, w];
  return { U, V, at, angle: Math.atan2(U[1], U[0]), length: len };
}

/** Lofted hoof: coronet on top, flared sole at the ground, sloped toe wall (≈ 52°). */
function hoofSdf(coffin: Vec3, z: number, scale = 1): Sdf {
  const x = coffin[0] + .005;
  return loftY([
    { y: 0, w: .068 * scale, front: .061 * scale, back: .061 * scale, x: x + .012, z, n: 2.3 },
    { y: .02, w: .066 * scale, front: .06 * scale, back: .06 * scale, x: x + .007, z, n: 2.3 },
    { y: .055, w: .056 * scale, front: .053 * scale, back: .053 * scale, x: x - .012, z, n: 2.2 },
    { y: .085, w: .048 * scale, front: .046 * scale, back: .046 * scale, x: x - .03, z, n: 2.1 },
  ], .006);
}

const inside = (region: Sdf, x: number, y: number, z: number, soft: number) => clamp01(.5 - region(x, y, z) / soft);

/**
 * A horse's ear: a leaf whose width swells to a third of its length and narrows to a point, a few millimetres of
 * cartilage thick, hollowed into a cup on the side facing `open`. Mirrored on both sides (uses |z|).
 */
function earSdf(base: Vec3, axis: Vec3, open: Vec3, length: number): Sdf {
  const e = new Vector3(...axis).normalize(), o = new Vector3(...open);
  o.addScaledVector(e, -o.dot(e)).normalize();
  const w = new Vector3().crossVectors(e, o);
  const [bx, by, bz] = base;
  const leaf = (u: number, v: number, s: number, scale: number) => {
    const t = Math.max(0, Math.min(1, u / length));
    const half = length * .26 * scale * Math.pow(Math.sin(Math.PI * Math.min(1, Math.pow(t, .7) * 1.0)), .9) + .004 * (1 - t);
    const thick = .016 * scale * (1 - t * .75) + 1e-4;
    const side = (Math.hypot(s / half, v / thick) - 1) * Math.min(half, thick);
    return Math.max(side, Math.max(-u, u - length));
  };
  return (x, y, z) => {
    const px = x - bx, py = y - by, pz = Math.abs(z) - bz;
    const u = px * e.x + py * e.y + pz * e.z, v = px * o.x + py * o.y + pz * o.z, s = px * w.x + py * w.y + pz * w.z;
    // The cup: the same leaf, smaller, moved toward the opening side.
    return Math.max(leaf(u, v, s, 1), -leaf(u - length * .08, v - .012, s, .72));
  };
}

/** Polynomial smooth minimum of two distances (the value form of `smoothUnion`). */
const smoothUnionValue = (a: number, b: number, k: number) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; };

/** Project a point onto a surface by Newton steps along the field gradient. */
function projectOnto(sdf: Sdf, p: Vec3): Vec3 {
  let [x, y, z] = p;
  for (let i = 0; i < 6; i++) {
    const d = sdf(x, y, z), h = .002;
    const gx = sdf(x + h, y, z) - sdf(x - h, y, z), gy = sdf(x, y + h, z) - sdf(x, y - h, z), gz = sdf(x, y, z + h) - sdf(x, y, z - h);
    const l = Math.hypot(gx, gy, gz) || 1;
    x -= gx / l * d; y -= gy / l * d; z -= gz / l * d;
  }
  return [x, y, z];
}

/** Veins as thin tubes lying on a surface: control points are projected onto it, the tube sits a third proud. */
function surfaceVeins(body: Sdf, veins: ReadonlyArray<{ points: readonly Vec3[]; radius: number }>): Sdf {
  return union(...veins.map(v => {
    const pts = v.points.map(p => projectOnto(body, p));
    // Densify so the tube hugs the curvature between control points.
    const dense: Vec3[] = [];
    for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < 4; k++) {
      const t = k / 4, a = pts[i], b = pts[i + 1];
      dense.push(projectOnto(body, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]));
    }
    dense.push(pts[pts.length - 1]);
    const r = v.radius, taper = dense.map((_, i) => r * (.55 + .45 * Math.sin(Math.PI * (i + .5) / dense.length)));
    const tube = chain(dense, taper, r * .8);
    return (x: number, y: number, z: number) => tube(x, y, z) + r * .45;
  }));
}

/**
 * Hair direction over the body (object space): back and a little down along the barrel, straight down the legs,
 * down and back from the crest on the neck, toward the muzzle on the face with a whorl on the forehead, and a
 * whorl on each flank. After coat-pattern references (Kidd, "The direction of hair in animals and man", 1903).
 */
export function horseHairFlow(x: number, y: number, z: number, head = headFrame(HORSE_LANDMARKS.poll, HORSE_LANDMARKS.muzzle)): Vec3 {
  let fx = -1, fy = -.3, fz = 0;
  // Belly: hair runs back and converges on the midline seam.
  const belly = smoothstep(1.0, .86, y) * smoothstep(-.7, -.5, x) * (1 - smoothstep(.35, .5, x));
  fx = mix(fx, -1, belly); fy = mix(fy, .05, belly); fz = mix(fz, -Math.sign(z) * .35, belly);
  // Neck: down and back from the mane.
  const neck = smoothstep(.32, .45, x) * smoothstep(1.05, 1.2, y);
  fx = mix(fx, -.45, neck); fy = mix(fy, -1, neck);
  // Legs: straight down, below the elbow and the stifle.
  const fore = smoothstep(.86, .74, y) * smoothstep(.0, .08, x) * (1 - smoothstep(.42, .5, x));
  const hind = smoothstep(.9, .78, y) * (1 - smoothstep(-.5, -.4, x));
  const leg = Math.max(fore, hind);
  fx = mix(fx, -.12, leg); fy = mix(fy, -1, leg); fz = mix(fz, 0, leg);
  // Flank whorl (each side): hair swirls round a point behind the barrel.
  const wx = x + .42, wy = y - 1.02, wz = Math.abs(z) - .3, wr = Math.hypot(wx, wy) + 1e-3;
  const whorl = Math.exp(-(wr * wr) / .012) * smoothstep(.15, .25, Math.abs(z)) * (1 - leg);
  fx = mix(fx, -wy / wr, whorl); fy = mix(fy, wx / wr, whorl);
  void wz;
  // Head: toward the muzzle, radiating from a whorl between the eyes.
  const hx = x - head.at(.16, .07)[0], hy = y - head.at(.16, .07)[1];
  const onHead = smoothstep(.36, .3, Math.hypot(x - head.at(.25, -.02)[0], y - head.at(.25, -.02)[1]));
  const radial = Math.exp(-(hx * hx + hy * hy) / .002);
  const hr = Math.hypot(hx, hy, z) + 1e-3;
  const headX = mix(head.U[0], hx / hr, radial), headY = mix(head.U[1], hy / hr, radial), headZ = mix(0, z / hr, radial);
  fx = mix(fx, headX, onHead); fy = mix(fy, headY, onHead); fz = mix(fz, headZ, onHead);
  return [fx, fy, fz];
}

/**
 * Attach the hair-flow field to a geometry, projected onto each vertex's tangent plane: as `kmFlow` (the fur relief
 * follows it) and as the glTF `tangent` (anisotropic highlights stretch along the lay of the hair, as on a real coat).
 */
function addHairFlow(geometry: BufferGeometry) {
  const p = geometry.getAttribute("position") as BufferAttribute, n = geometry.getAttribute("normal") as BufferAttribute;
  const flow = new Float32Array(p.count * 3), tangent = new Float32Array(p.count * 4), head = headFrame(HORSE_LANDMARKS.poll, HORSE_LANDMARKS.muzzle);
  for (let v = 0; v < p.count; v++) {
    const [fx, fy, fz] = horseHairFlow(p.getX(v), p.getY(v), p.getZ(v), head);
    const nx = n.getX(v), ny = n.getY(v), nz = n.getZ(v), d = fx * nx + fy * ny + fz * nz;
    let tx = fx - nx * d, ty = fy - ny * d, tz = fz - nz * d;
    const l = Math.hypot(tx, ty, tz) || 1; tx /= l; ty /= l; tz /= l;
    flow.set([tx, ty, tz], v * 3);
    tangent.set([tx, ty, tz, 1], v * 4);
  }
  geometry.setAttribute("kmFlow", new BufferAttribute(flow, 3));
  geometry.setAttribute("tangent", new BufferAttribute(tangent, 4));
}

// ------------------------------------------------------------------ the sculpt

export interface HorseSculpt {
  surface: Sdf;
  /** Both ears (mirrored), for fine patches that ride the ear bones. */
  ear: Sdf;
  earBase: Vec3;
  /** Smooth anatomy without fine relief: drives baked occlusion. */
  base: Sdf;
  regions: Record<"hooves" | "muzzle" | "lowerFore" | "lowerHind" | "ears" | "face" | "star" | "chestnuts" | "mouth" | "eyeRings", Sdf>;
  eyes: EyeSpec[];
  head: ReturnType<typeof headFrame>;
}

export function horseSdf(): HorseSculpt {
  const L = HORSE_LANDMARKS, F = L.fore, H = L.hind;
  // Torso: measured topline and underline from the reference profile, estimated widths.
  const torso = loftAlong([0, 0, 0], [1, 0], [
    { s: -1.1, top: 1.33, bottom: 1.08, halfWidth: .06 },
    { s: -1.04, top: 1.45, bottom: 1.0, halfWidth: .14 },
    { s: -.94, top: 1.54, bottom: .97, halfWidth: .21 },
    { s: -.78, top: 1.575, bottom: .99, halfWidth: .25 },
    { s: -.6, top: 1.56, bottom: .95, halfWidth: .265 },
    { s: -.42, top: 1.52, bottom: .88, halfWidth: .285, n: 2.3 },
    { s: -.2, top: 1.49, bottom: .83, halfWidth: .3, n: 2.4 },
    { s: .02, top: 1.49, bottom: .805, halfWidth: .3, n: 2.4 },
    { s: .2, top: 1.52, bottom: .8, halfWidth: .27, n: 2.3 },
    { s: .34, top: 1.5, bottom: .83, halfWidth: .23 },
    { s: .47, top: 1.36, bottom: .89, halfWidth: .2 },
    { s: .56, top: 1.2, bottom: .95, halfWidth: .16 },
    { s: .61, top: 1.1, bottom: 1.0, halfWidth: .08 },
  ]);
  // Withers ridge and spine: the dorsal processes make a narrow raised line.
  const withers = ellipsoid([.2, 1.43, 0], [.3, .1, .09], [0, 0, -.12]);
  const croup = ellipsoid([-.78, 1.47, 0], [.3, .1, .18]);
  // Muscle masses (one side, mirrored).
  const side = mirrorZ(smoothUnion(.06,
    ellipsoid([.33, 1.25, .17], [.12, .29, .085], [0, 0, -.62]),        // scapula + supraspinatus
    ellipsoid([.46, 1.06, .16], [.07, .075, .065]),                     // point of shoulder
    ellipsoid([.23, .97, .17], [.16, .14, .09], [0, 0, .2]),            // triceps
    ellipsoid([.5, .97, .085], [.09, .13, .085], [0, 0, -.25]),         // pectoral
    ellipsoid([-.66, 1.3, .17], [.26, .18, .1], [0, 0, .25]),           // gluteals over the hip
    ellipsoid([-.78, 1.05, .19], [.24, .27, .1], [0, 0, .28]),          // thigh (quadriceps/biceps femoris)
    ellipsoid([-.98, 1.07, .1], [.12, .27, .1], [0, 0, .12]),           // hamstrings at the rear line
    roundCone([-1.0, .95, .11], [-.92, .62, .13], .085, .042),          // semitendinosus down to the point of hock
    ellipsoid([-.52, .9, .21], [.06, .07, .05]),                        // stifle
  ));
  let body = smoothUnion(.09, torso, withers, croup, side);
  // Flank hollow in front of the stifle, girth groove behind the elbow, ribs.
  body = smoothSubtract(.1, body, mirrorZ(ellipsoid([-.4, .86, .34], [.16, .13, .08])));
  body = smoothSubtract(.06, body, mirrorZ(ellipsoid([.08, .86, .31], [.06, .12, .05])));
  body = displace(body, (x, y, z) => {
    const s = smoothstep(.2, .3, Math.abs(z)), band = smoothstep(.88, 1, y) * (1 - smoothstep(1.24, 1.36, y));
    const span = smoothstep(-.4, -.2, x) * (1 - smoothstep(.12, .26, x));
    return s * band * span * .0022 * Math.sin((x + (1.3 - y) * .3) * 24);
  });

  // Neck: a loft from the withers to the poll, deep at the base, the crest on top and the throat below.
  const neck = smoothUnion(.06, loftAlong([.42, 1.25, 0], [.51, .45], [
    { s: -.06, top: .21, bottom: -.36, halfWidth: .2 },
    { s: .1, top: .19, bottom: -.31, halfWidth: .17 },
    { s: .3, top: .16, bottom: -.24, halfWidth: .14 },
    { s: .5, top: .128, bottom: -.185, halfWidth: .116 },
    { s: .62, top: .108, bottom: -.15, halfWidth: .104 },
    { s: .72, top: .08, bottom: -.115, halfWidth: .094 },
  ], .03),
    ellipsoid([.58, 1.56, 0], [.28, .06, .05], [0, 0, .62]),             // crest under the mane
  );
  const neckGroove = mirrorZ(ellipsoid([.72, 1.4, .12], [.2, .008, .014], [0, 0, .76]));

  // Head in its own frame.
  const hf = headFrame(L.poll, L.muzzle), a = hf.angle, at = hf.at;
  // Head: a loft from the poll to the lips through sections read off profile photographs (ANIM1: eye two thirds of
  // the way from the nose; Orlov trotter profile, Commons, public domain): deep at the jowl, a broad flat face that
  // stays deep to a heavy, rounded muzzle.
  const headLoft = loftAlong(L.poll, [hf.U[0], hf.U[1]], [
    { s: -.03, top: .032, bottom: -.11, halfWidth: .08 },
    { s: .04, top: .06, bottom: -.165, halfWidth: .1, n: 2.6 },
    { s: .12, top: .07, bottom: -.22, halfWidth: .11, n: 2.6 },
    { s: .2, top: .066, bottom: -.25, halfWidth: .106, n: 2.7 },
    { s: .28, top: .058, bottom: -.238, halfWidth: .094, n: 2.8 },
    { s: .34, top: .052, bottom: -.19, halfWidth: .082, n: 2.9 },
    { s: .4, top: .047, bottom: -.148, halfWidth: .074, n: 3.0 },
    { s: .45, top: .042, bottom: -.128, halfWidth: .071, n: 3.0 },
    { s: .5, top: .032, bottom: -.124, halfWidth: .07, n: 2.6 },
    { s: .545, top: .01, bottom: -.108, halfWidth: .058 },
    { s: .566, top: -.016, bottom: -.074, halfWidth: .034 },
  ], .012);
  const headMass = smoothUnion(.028,
    // Masseter: the round cheek plate under and behind the eye, crisp-edged (Orlov profile: the jowl's lowest point
    // lies about half a head-length below the poll, under the eye).
    smoothUnion(.012, headLoft, mirrorZ(ellipsoid(at(.2, -.15, .082), [.115, .11, .04], [0, 0, a]))),
    ellipsoid(at(.24, -.2), [.12, .07, .09], [0, 0, a]),                    // rounded lower contour of the jaw
    mirrorZ(ellipsoid(at(.27, -.025, .077), [.075, .012, .014], [0, 0, a])), // facial crest below the eye
    mirrorZ(ellipsoid(at(.168, .04, .084), [.045, .022, .03], [0, 0, a])),  // orbital rims, the bony brow
    ellipsoid(at(.528, -.074), [.046, .036, .058], [0, 0, a]),              // upper lip, overhanging
    ellipsoid(at(.5, -.116), [.05, .028, .046], [0, 0, a]),                 // lower lip
    ellipsoid(at(.455, -.132), [.042, .03, .04], [0, 0, a]),                // chin
    mirrorZ(ellipsoid(at(.5, .022, .046), [.032, .009, .013], [0, 0, a - .35])), // alar fold over each nostril
  );
  // Ears: leaf-shaped, 15 cm, upright and pricked forward, hollow cups opening forward and out (mirrored inside).
  const ear = earSdf(at(-.01, .045, .058), [.18, 1, .14], [.62, .05, .78], .15);
  // The ears are meshed as fine patches of their own (`earPatch`); the head keeps only their bases.
  const earBase = at(-.01, .045, .058);
  const earStub = intersect(ear, sphere(earBase, .045));
  const head = bounded(smoothUnion(.02, headMass, earStub), at(.25, -.02), .48);
  const eye = seatEye(head, at(.178, .012, .06), { radius: .026, gaze: [.3, -.1, .95], aperture: { width: .95, height: .44 }, tilt: .12, lid: .14 }, .27);
  let skull = mirrorZ(carveSocket(head, eye));
  // The fold above the upper lid (HD eye photographs): a shallow crease following the lid, a finger's width above it.
  const g = eye.gaze, gl = Math.hypot(...g), up = eye.radius * 1.32;
  skull = smoothSubtract(.004, skull, mirrorZ(ellipsoid([eye.center[0] + g[0] / gl * eye.radius * .45, eye.center[1] + up, Math.abs(eye.center[2]) + Math.abs(g[2]) / gl * eye.radius * .45],
    [eye.radius * 1.05, .0022, .007], [0, Math.atan2(g[0], g[2]) * 0, -.15])));
  // Nostrils (large, flared at speed), the alar fold, mouth line and chin groove.
  skull = smoothSubtract(.012, skull, mirrorZ(ellipsoid(at(.515, .0, .046), [.03, .022, .014], [0, 0, a - .55])));  // nostrils
  skull = smoothSubtract(.012, skull, ellipsoid(at(.42, -.14), [.03, .01, .05], [0, 0, a]));                     // chin groove
  // Throatlatch: the groove where the back edge of the jaw meets the neck, below the ear.
  skull = smoothSubtract(.03, skull, mirrorZ(ellipsoid([.86, 1.52, .1], [.02, .09, .035], [0, 0, -.6])));
  skull = smoothSubtract(.03, skull, ellipsoid(at(.22, -.2), [.12, .03, .03], [0, 0, a]));  // channel between the jaw branches

  // ---------------------------------------------------------------- legs
  const z = (p: Vec3, s = 1): Vec3 => [p[0], p[1], p[2] * s];
  const foreLeg = smoothUnion(.035,
    ellipsoid([.21, .68, F.elbow[2]], [.08, .15, .07]),                 // forearm muscles
    roundCone(F.elbow, F.carpus, .07, .043),
    ellipsoid([.15, .82, F.elbow[2]], [.04, .045, .04]),                // olecranon (point of elbow)
    roundBox(F.carpus, [.042, .045, .041], .028),                       // carpus, flat in front
    roundCone(F.carpus, F.fetlock, .033, .029),                         // cannon
    roundCone([F.carpus[0] - .025, F.carpus[1] - .06, F.carpus[2]], [F.fetlock[0] - .03, F.fetlock[1] + .02, F.fetlock[2]], .02, .018), // flexor tendons
    ellipsoid([F.fetlock[0] - .006, F.fetlock[1], F.fetlock[2]], [.048, .044, .04]),
    roundCone(F.fetlock, F.coffin, .033, .036),                         // pastern
    torus([F.coffin[0] - .018, .088, F.coffin[2]], .042, .011),          // coronet band
  );
  const hindLeg = smoothUnion(.04,
    ellipsoid([-.8, .72, H.hock[2] + .025], [.11, .17, .075], [0, 0, -.38]),  // gaskin
    roundCone(H.stifle, H.hock, .085, .05),
    sphere([-.905, .565, H.hock[2]], .036),                             // point of hock (calcaneus)
    roundBox(H.hock, [.05, .055, .04], .03, { rotation: [0, 0, -.2] }),
    roundCone(H.hock, H.fetlock, .036, .03),                            // hind cannon
    roundCone([H.hock[0] - .04, H.hock[1] - .07, H.hock[2]], [H.fetlock[0] - .03, H.fetlock[1] + .02, H.fetlock[2]], .022, .018),
    ellipsoid([H.fetlock[0] - .006, H.fetlock[1], H.fetlock[2]], [.048, .044, .04]),
    roundCone(H.fetlock, H.coffin, .033, .036),
    torus([H.coffin[0] - .018, .088, H.coffin[2]], .042, .011),
  );
  const hooves = mirrorZ(union(hoofSdf(F.coffin, F.coffin[2]), hoofSdf(H.coffin, H.coffin[2], .97)));
  const legs = mirrorZ(union(bounded(foreLeg, [.21, .45, F.elbow[2]], .55), bounded(hindLeg, [-.72, .5, H.hock[2]], .6)));
  // Chestnuts: horny patches on the inside of the forearm and the inside of the hock.
  const chestnuts = mirrorZ(union(ellipsoid([.2, .55, F.carpus[2] - .04], [.022, .032, .01]), ellipsoid([-.86, .4, H.hock[2] - .035], [.018, .026, .009])));
  // The dock leaves the croup and curves down a hand's breadth behind the buttocks.
  const tailDock = chain([L.dock, [-1.12, 1.4, 0], [-1.19, 1.27, 0], [-1.22, 1.15, 0]], [.055, .045, .036, .026], .02);

  let anatomy = smoothUnion(.025, smoothUnion(.085, body, legs), chestnuts);
  // Muscle separations a fit horse shows: the triceps line behind the shoulder, the hamstring groove down the
  // back of the thigh, and the point of the hip standing out.
  anatomy = smoothSubtract(.035, anatomy, mirrorZ(ellipsoid([.27, 1.06, .27], [.11, .016, .03], [0, 0, -.55])));
  anatomy = smoothSubtract(.03, anatomy, mirrorZ(ellipsoid([-.93, 1.08, .17], [.016, .16, .03], [0, 0, .15])));
  anatomy = smoothUnion(.08, anatomy, mirrorZ(ellipsoid([-.58, 1.42, .225], [.045, .03, .035])));
  const withNeck = smoothSubtract(.03, smoothUnion(.1, anatomy, neck), neckGroove);
  const smoothBody = clipBelow(smoothUnion(.035, smoothUnion(.06, withNeck, skull), hooves, tailDock), 0);
  // Raised veins of a working horse: the spur vein along the lower barrel, the facial vein under the facial crest,
  // fine veins on the shoulder, forearm and gaskin. Laid on the surface (projected), a few millimetres proud.
  const veins = surfaceVeins(smoothBody, [
    { points: [[.12, .93, .34], [-.05, .93, .36], [-.25, .96, .36], [-.42, 1.01, .34]], radius: .0042 },
    { points: [[.42, 1.24, .25], [.36, 1.12, .27], [.31, 1.0, .26]], radius: .003 },
    { points: [[.2, .78, .2], [.215, .64, .19], [.22, .52, .17]], radius: .0028 },
    { points: [[-.76, .82, .24], [-.8, .7, .21], [-.84, .6, .19]], radius: .003 },
    { points: [at(.1, -.19, .11), at(.2, -.12, .11), at(.3, -.06, .1), at(.37, -.04, .08)], radius: .0032 },
  ]);
  const base = smoothUnion(.004, smoothBody, mirrorZ(veins));
  // Fine coat relief: barely-there muscle striation and skin, below the cell size × 3.
  const relief = fbm3(11, 3);
  const surface = displace(base, (x, y, zz) => y < .1 ? 0 : relief(x * 26, y * 26, zz * 26) * .0011);
  const coronets = (c: Vec3) => [c[0] - .01, c[1] + .025, c[2]] as Vec3;
  return {
    surface, base, ear, earBase, eyes: [eye, { ...eye, center: [eye.center[0], eye.center[1], -eye.center[2]], gaze: [eye.gaze[0], eye.gaze[1], -eye.gaze[2]] }], head: hf,
    regions: {
      hooves,
      muzzle: ellipsoid(at(.5, -.055), [.1, .095, .085], [0, 0, a]),
      lowerFore: mirrorZ(roundCone(z(F.carpus), coronets(F.coffin), .07, .06)),
      lowerHind: mirrorZ(roundCone(z(H.hock), coronets(H.coffin), .08, .06)),
      ears: ear,
      face: roundCone(at(.12, .07), at(.42, .03), .04, .03),
      chestnuts,
      // The line of the lips, painted dark instead of carved (a carved slit reads as teeth).
      mouth: ellipsoid(at(.5, -.095), [.06, .004, .07], [0, 0, a]),
      // A star: a small diamond of white hair between the eyes, a little above them.
      star: ellipsoid(at(.15, .075), [.028, .02, .03], [0, 0, a + .78]),
      // The fine, nearly hairless dark skin round each eye.
      eyeRings: mirrorZ(sphere([eye.center[0], eye.center[1], Math.abs(eye.center[2])], eye.radius * 1.5)),
    },
  };
}

/**
 * Coat painting: countershaded body with a fine bloom of lighter and darker hair, black points, socks, face
 * marking, wet muzzle, keratin hooves; and, with `sweat`, the dark wet sheen and white lather of a horse that has
 * been galloping (neck under the reins, shoulders, flanks, between the hind legs, the edges of the saddle pad).
 */
export function horseCoatShading(coat: HorseCoat, regions: HorseSculpt["regions"], sweat = 0): SculptShading {
  const body = linearRgb(coat.body), light = linearRgb(coat.bodyLight), points = coat.points ? linearRgb(coat.points) : null;
  const muzzle = linearRgb(coat.muzzle), white = linearRgb("#e9e4da"), pink = linearRgb("#c9a49a"), lather = linearRgb("#f1ede4");
  const hoofDark = linearRgb("#1d1714"), hoofLight = linearRgb("#7a6a55"), chestnut = linearRgb("#2c2420");
  const mottle = fbm3(5, 3), dapple = fbm3(19, 2), bloom = fbm3(23, 3), wetNoise = fbm3(29, 3), foam = fbm3(37, 4);
  const socks = coat.socks ?? [0, 0, 0, 0];
  const pad = roundBox(HORSE_SADDLE_AREA.center, HORSE_SADDLE_AREA.half, HORSE_SADDLE_AREA.radius);
  return ({ x, y, z, ny, occlusion, curvature }) => {
    const m = mottle(x * 4, y * 4, z * 4);
    const shade = mix(.42, 1, occlusion);
    const front = x > 0, near = z < 0;
    const sock = socks[front ? (near ? 0 : 1) : (near ? 2 : 3)];
    // Keratin hooves: dark on pigmented legs, striped pale under white socks.
    if (inside(regions.hooves, x, y, z, .004) > .95) {
      const c = sock > 0 ? hoofLight.map((v, i) => mix(v, hoofDark[i], .25 + .2 * Math.sin(z * 900 + x * 300))) : hoofDark.map(v => v * (.9 + m * .2));
      return [c[0] * shade, c[1] * shade, c[2] * shade, .55, 0];
    }
    if (inside(regions.chestnuts, x, y, z, .003) > .9) return [chestnut[0] * shade, chestnut[1] * shade, chestnut[2] * shade, .7, 0];
    // Countershading: sun-bleached topline, darker belly and inner legs; muscles catch a little more light (curvature).
    const top = clamp01(ny * .65 + .35);
    let c = body.map((v, i) => mix(v, light[i], clamp01(top * .62 + m * .28 + Math.max(0, curvature) * .4) * .6));
    // Coat bloom: patches where the hair lies a little differently, a few percent lighter or darker.
    const b = bloom(x * 9, y * 9, z * 9);
    c = c.map(v => v * (.9 + .2 * b));
    if (coat.id === "grey") {
      const d = smoothstep(.15, .45, dapple(x * 11, y * 11, z * 11)) * smoothstep(.85, 1.1, y) * (1 - smoothstep(1.5, 1.62, y));
      c = c.map((v, i) => mix(v, light[i] * 1.12, d * .7));
    } else {
      // Faint dapples on the quarters and barrel of a well-conditioned coat.
      const d = smoothstep(.62, .75, dapple(x * 13, y * 13, z * 13)) * smoothstep(.95, 1.15, y) * (x < .3 ? 1 : .3);
      c = c.map(v => v * (1 - .08 * d));
    }
    if (points) {
      const lower = Math.max(inside(regions.lowerFore, x, y, z, .06), inside(regions.lowerHind, x, y, z, .07));
      const legPoint = Math.min(1, lower * 1.6) * (1 - smoothstep(.4, .56, y));
      // Bay ears: dark all over, black at the rims and tips.
      const earDark = inside(regions.ears, x, y, z, .01) * (.55 + .4 * smoothstep(1.84, 1.9, y));
      c = c.map((v, i) => mix(v, points[i], Math.max(legPoint, earDark)));
    }
    // White socks up from the coronet.
    if (sock > 0) c = c.map((v, i) => mix(v, white[i], (1 - smoothstep(sock * .14, sock * .14 + .03, y)) * (y > .085 ? 1 : 0)));
    // Face marking.
    if (coat.face && coat.face !== "none") {
      const f = coat.face === "star" ? inside(regions.star, x, y, z, .012) : inside(regions.face, x, y, z, .015), star = f;
      c = c.map((v, i) => mix(v, white[i], star));
    }
    // Muzzle: fine dark skin, grey-pink soft nose under the white of a blaze.
    const mz = inside(regions.muzzle, x, y, z, .03);
    c = c.map((v, i) => mix(v, coat.face === "blaze" ? pink[i] : muzzle[i], Math.min(1, mz * 1.1)));
    const lips = inside(regions.mouth, x, y, z, .006);
    c = c.map(v => v * (1 - .7 * lips));
    const ring = inside(regions.eyeRings, x, y, z, .008);
    c = c.map((v, i) => mix(v, muzzle[i] * .8, ring * .85));
    // A groomed coat: satin, roughness about .55–.7, softer where the hair lies against the light.
    let rough = mix(.68, .56, mz) * (.92 + m * .1 + (b - .5) * .22);
    if (sweat > 0) {
      // Where sweat gathers: under the mane and reins, ahead of and below the pad, flanks, between the thighs, the chest.
      const az = Math.abs(z), padD = pad(x, y, z), n1 = wetNoise(x * 7, y * 7, z * 7);
      const neck = smoothstep(.42, .55, x) * smoothstep(1.15, 1.3, y) * (1 - smoothstep(.85, .95, x));
      const shoulder = smoothstep(.22, .3, x) * (1 - smoothstep(.48, .56, x)) * smoothstep(.95, 1.05, y) * (1 - smoothstep(1.4, 1.48, y));
      const flank = smoothstep(.12, .02, Math.abs(x + .12) - .2) * smoothstep(.82, .9, y) * (1 - smoothstep(1.12, 1.2, y));
      const thighs = (1 - smoothstep(.12, .2, az)) * smoothstep(-.6, -.7, x) * smoothstep(.75, .85, y) * (1 - smoothstep(1.15, 1.25, y));
      const chest = smoothstep(.45, .55, x) * smoothstep(.9, 1.0, y) * (1 - smoothstep(1.2, 1.3, y)) * (1 - smoothstep(.12, .18, az));
      const padEdge = smoothstep(.06, 0, Math.abs(padD - .02));
      const wet = clamp01(Math.max(neck, shoulder, flank, thighs, chest, padEdge * .8) * (.55 + .7 * n1) * sweat * 1.4);
      c = c.map(v => v * (1 - .38 * wet));
      rough = mix(rough, .3, wet);
      // Lather: white foam where skin and tack rub, the most at the pad's edge and between the thighs.
      const sides = 1 - smoothstep(1.28, 1.36, y);
      const froth = clamp01((Math.max(padEdge * .9 * sides, thighs * .7, neck * .35 * smoothstep(.0, .06, -z)) * sweat - .25) * 2.2) * smoothstep(.45, .7, foam(x * 22, y * 22, z * 22));
      c = c.map((v, i) => mix(v, lather[i], froth));
      rough = mix(rough, .75, froth);
    }
    return [c[0] * shade, c[1] * shade, c[2] * shade, rough, 0];
  };
}

/**
 * Per-vertex coat masks for the run-time coat shader (`horse-coat`), from the same anatomy regions the painted coat
 * uses: `kmcoata` = lower legs (black points), muzzle skin, ears, eye rings; `kmcoatb` = baked occlusion shade,
 * topline (countershading), hoof horn, dark skin (chestnuts, the line of the lips); `kmcoatc` = where sweat darkens
 * the coat and where lather forms.
 */
function addCoatMasks(geometry: BufferGeometry, mesh: SculptMesh, regions: HorseSculpt["regions"]) {
  const n = mesh.vertexCount, a = new Float32Array(n * 4), b = new Float32Array(n * 4), c = new Float32Array(n * 2);
  const wetNoise = fbm3(29, 3), pad = roundBox(HORSE_SADDLE_AREA.center, HORSE_SADDLE_AREA.half, HORSE_SADDLE_AREA.radius);
  for (let v = 0; v < n; v++) {
    const x = mesh.positions[v * 3], y = mesh.positions[v * 3 + 1], z = mesh.positions[v * 3 + 2], ny = mesh.normals[v * 3 + 1];
    const lower = Math.max(inside(regions.lowerFore, x, y, z, .06), inside(regions.lowerHind, x, y, z, .07));
    a[v * 4] = Math.min(1, lower * 1.6) * (1 - smoothstep(.4, .56, y));
    a[v * 4 + 1] = Math.min(1, inside(regions.muzzle, x, y, z, .03) * 1.1);
    a[v * 4 + 2] = inside(regions.ears, x, y, z, .01) * (.55 + .4 * smoothstep(1.84, 1.9, y));
    a[v * 4 + 3] = inside(regions.eyeRings, x, y, z, .008) * .85;
    b[v * 4] = mix(.42, 1, mesh.occlusion[v]);
    b[v * 4 + 1] = clamp01(ny * .65 + .35 + Math.max(0, mesh.curvature[v]) * .65);
    b[v * 4 + 2] = smoothstep(.9, .97, inside(regions.hooves, x, y, z, .004));
    b[v * 4 + 3] = Math.max(smoothstep(.85, .95, inside(regions.chestnuts, x, y, z, .003)), inside(regions.mouth, x, y, z, .006));
    // Sweat: under the mane and reins, ahead of and below the pad, flanks, between the thighs, the chest.
    const az = Math.abs(z), padD = pad(x, y, z), n1 = wetNoise(x * 7, y * 7, z * 7);
    const neck = smoothstep(.42, .55, x) * smoothstep(1.15, 1.3, y) * (1 - smoothstep(.85, .95, x));
    const shoulder = smoothstep(.22, .3, x) * (1 - smoothstep(.48, .56, x)) * smoothstep(.95, 1.05, y) * (1 - smoothstep(1.4, 1.48, y));
    const flank = smoothstep(.12, .02, Math.abs(x + .12) - .2) * smoothstep(.82, .9, y) * (1 - smoothstep(1.12, 1.2, y));
    const thighs = (1 - smoothstep(.12, .2, az)) * smoothstep(-.6, -.7, x) * smoothstep(.75, .85, y) * (1 - smoothstep(1.15, 1.25, y));
    const chest = smoothstep(.45, .55, x) * smoothstep(.9, 1.0, y) * (1 - smoothstep(1.2, 1.3, y)) * (1 - smoothstep(.12, .18, az));
    const padEdge = smoothstep(.06, 0, Math.abs(padD - .02));
    c[v * 2] = Math.max(neck, shoulder, flank, thighs, chest, padEdge * .8) * (.55 + .7 * n1);
    c[v * 2 + 1] = Math.max(padEdge * .9 * (1 - smoothstep(1.28, 1.36, y)), thighs * .7, neck * .35 * smoothstep(0, .06, -z));
  }
  geometry.setAttribute("kmcoata", new BufferAttribute(a, 4));
  geometry.setAttribute("kmcoatb", new BufferAttribute(b, 4));
  geometry.setAttribute("kmcoatc", new BufferAttribute(c, 2));
}

// ------------------------------------------------------------------ hair

export interface HairLock {
  at: Vec3;
  dir: Vec3;
  length: number;
  curl?: number;
  /** How far the lock's cards fan apart by the tip (m). */
  spread?: number;
}

export interface HairCardOptions {
  locks: readonly HairLock[];
  /** Cards per lock and card width at the root (m). */
  cards: number;
  width: number;
  segments: number;
  seed: number;
  /** Gravity droop per unit length (0 = straight). */
  droop: number;
  /** Keep locks outside this surface by `offset` (hair lies on the neck instead of passing through it). */
  collide?: { sdf: Sdf; offset: number };
  /** Lay cards flat along the surface they grow from (mane, forelock) instead of round the lock (tail). */
  flat?: boolean;
  /** Root and tip colours (sRGB) and per-card brightness jitter. */
  root: string;
  tip: string;
}

/**
 * Hair as clumped locks of alpha-mapped cards: each lock grows from its root with gravity, a little wave and
 * collision against the body; its cards start together and fan apart toward the tip. UVs run across (u) and
 * along (v, 0 at the root) a strand texture (`hairStrandTexture`); vertex colours ramp root → tip; `hair` stores v and
 * `hairroot` the lock's root. Normals are shading normals shared by both faces (render without flipping them on back
 * faces: `horse-coat` does).
 */
export function hairCardGeometry(o: HairCardOptions): BufferGeometry {
  const rows = o.segments + 1, verts = o.locks.length * o.cards * rows * 2;
  const position = new Float32Array(verts * 3), normal = new Float32Array(verts * 3), uv = new Float32Array(verts * 2);
  const hair = new Float32Array(verts), color = new Float32Array(verts * 3), root = new Float32Array(verts * 3), index: number[] = [];
  const cRoot = linearRgb(o.root), cTip = linearRgb(o.tip);
  let seed = o.seed;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const spine: Vector3[] = Array.from({ length: rows }, () => new Vector3()), tangents: Vector3[] = Array.from({ length: rows }, () => new Vector3());
  const p = new Vector3(), d = new Vector3(), g = new Vector3(), side = new Vector3(), off = new Vector3(), nrm = new Vector3(), shade = new Vector3(), up = new Vector3(0, 1, 0);
  const gradient = (sdf: Sdf, q: Vector3, out: Vector3) => {
    const h = .004;
    return out.set(sdf(q.x + h, q.y, q.z) - sdf(q.x - h, q.y, q.z), sdf(q.x, q.y + h, q.z) - sdf(q.x, q.y - h, q.z), sdf(q.x, q.y, q.z + h) - sdf(q.x, q.y, q.z - h)).normalize();
  };
  let v0 = 0;
  for (const lock of o.locks) {
    // Grow the lock's spine.
    p.set(...lock.at); d.set(...lock.dir).normalize();
    const step = lock.length / o.segments, curl = lock.curl ?? 0, phase = rand() * 6.28;
    for (let r = 0; r < rows; r++) {
      spine[r].copy(p); tangents[r].copy(d);
      if (r === o.segments) break;
      d.y -= o.droop * step / lock.length * 2;
      d.x += Math.sin(phase + r * .9) * curl * .12; d.z += Math.cos(phase + r * .7) * curl * .12;
      d.normalize();
      p.addScaledVector(d, step);
      if (o.collide) {
        const { sdf, offset } = o.collide, dist = sdf(p.x, p.y, p.z);
        if (dist < offset) {
          gradient(sdf, p, g);
          p.addScaledVector(g, offset - dist);
          const into = d.dot(g);
          if (into < 0) d.addScaledVector(g, -into).normalize();
        }
      }
    }
    // Card orientation: flat on the surface at the root, or round the lock.
    const surfaceNormal = o.collide ? gradient(o.collide.sdf, spine[0], new Vector3()) : up.clone();
    const spread = lock.spread ?? .02;
    for (let k = 0; k < o.cards; k++) {
      const angle = o.flat ? (rand() - .5) * .6 : rand() * Math.PI * 2, jitter = .78 + rand() * .44;
      const fan = (rand() - .5) * 2, lift = rand() * .5, w0 = o.width * (.75 + rand() * .5);
      for (let r = 0; r < rows; r++) {
        const t = r / o.segments, T = tangents[r];
        if (o.flat) side.crossVectors(T, surfaceNormal); else side.crossVectors(T, up);
        if (side.lengthSq() < 1e-6) side.set(0, 0, 1);
        side.normalize().applyAxisAngle(T, angle);
        nrm.crossVectors(side, T).normalize();
        // Cards start together and fan apart (sideways, and a little off the surface) toward the tip.
        const f = spread * Math.pow(t, 1.3);
        off.copy(side).multiplyScalar(fan * f).addScaledVector(nrm, lift * f * (o.flat ? .6 : 1));
        const w = w0 * (1 - .45 * t), v = v0 + r * 2;
        for (let e = 0; e < 2; e++) {
          const sgn = e ? .5 : -.5, i = v + e;
          const px = off.x + side.x * w * sgn, py = off.y + side.y * w * sgn, pz = off.z + side.z * w * sgn;
          position.set([spine[r].x + px, spine[r].y + py, spine[r].z + pz], i * 3);
          // Shading normals, the same on both faces: a round lock shades like a soft cylinder (out from its axis), a lock
          // lying on the neck like the neck's surface. Flat card normals flash white wherever a card meets the
          // mirror angle, which reads as stray white hairs.
          if (o.flat) shade.copy(surfaceNormal).multiplyScalar(.75).addScaledVector(nrm, .25 * Math.sign(nrm.dot(surfaceNormal) || 1));
          else {
            shade.set(px, py, pz).addScaledVector(T, -(px * T.x + py * T.y + pz * T.z));
            if (shade.lengthSq() < 1e-10) shade.copy(nrm);
            shade.normalize().multiplyScalar(.8).addScaledVector(nrm, .2 * Math.sign(nrm.dot(shade) || 1));
          }
          shade.normalize();
          normal.set([shade.x, shade.y, shade.z], i * 3);
          uv.set([e, t], i * 2);
          hair[i] = t;
          root.set(lock.at, i * 3);
          for (let c = 0; c < 3; c++) color[i * 3 + c] = mix(cRoot[c], cTip[c], t * .75) * jitter;
        }
        if (r < o.segments) index.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      }
      v0 += rows * 2;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(position, 3));
  geometry.setAttribute("normal", new BufferAttribute(normal, 3));
  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
  geometry.setAttribute("color", new BufferAttribute(color, 3));
  geometry.setAttribute("hair", new BufferAttribute(hair, 1));
  // Where each card's lock leaves the skin (rest frame): a coat shader colours pinto manes and tails by it.
  geometry.setAttribute("hairroot", new BufferAttribute(root, 3));
  geometry.setIndex(index);
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Painted strand texture for hair cards: tapered, slightly wavy strands of varying length, thickness and
 * brightness, dense at the root (v = 0, top) and thinning to fine tips. RGB = brightness, A = coverage.
 */
export function hairStrandTexture(seed = 3) {
  const texture = paintTexture(256, 1024, (ctx, w, h, random) => {
    ctx.clearRect(0, 0, w, h);
    // A soft, dense base near the root so a card never shows a gap where it leaves the skin.
    const base = ctx.createLinearGradient(0, 0, 0, h * .35);
    base.addColorStop(0, "rgba(150,150,150,.9)"); base.addColorStop(1, "rgba(150,150,150,0)");
    ctx.fillStyle = base; ctx.fillRect(w * .08, 0, w * .84, h * .35);
    // Dense enough that the average coverage stays high in the small mipmaps (sparse strands sparkle at distance).
    for (let i = 0; i < 280; i++) {
      const x0 = w * (.03 + random() * .94), length = h * (.55 + .45 * random() ** .6), width = 1.2 + random() * 2.6;
      const lum = 120 + Math.floor(random() * 135), amp = 1.5 + random() * 5, freq = 2 + random() * 4, ph = random() * 6.28, drift = (random() - .5) * .05;
      const steps = 40;
      for (let k = 0; k < steps; k++) {
        const y0 = length * k / steps, y1 = length * (k + 1) / steps, t = (k + .5) / steps;
        const xa = x0 + Math.sin(y0 / h * freq * 6.28 + ph) * amp + drift * y0, xb = x0 + Math.sin(y1 / h * freq * 6.28 + ph) * amp + drift * y1;
        const alpha = (t < .7 ? 1 : 1 - (t - .7) / .3) * (.65 + .35 * random());
        ctx.strokeStyle = `rgba(${lum},${lum},${lum},${alpha.toFixed(3)})`;
        ctx.lineWidth = width * (1 - .6 * t);
        ctx.beginPath(); ctx.moveTo(xa, y0); ctx.lineTo(xb, y1); ctx.stroke();
      }
    }
  }, { seed, fallback: [160, 160, 160, 255] });
  texture.flipY = false;
  return texture;
}

/** Mane, forelock and tail locks on the sculpted crest, poll and dock. */
function hairLocks(sculpt: HorseSculpt, seed: number) {
  let s = seed;
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const L = HORSE_LANDMARKS, hf = sculpt.head;
  const mane: HairLock[] = [], tail: HairLock[] = [], forelock: HairLock[] = [];
  // Mane along the crest from the poll to the withers, falling down the off (right, +Z) side of the neck.
  for (let i = 0; i < 380; i++) {
    const t = (i + rand()) / 380;
    const x = mix(.9, .27, t), y = mix(1.715, 1.555, t) + Math.sin(t * Math.PI) * .05;
    const len = mix(.2, .34, Math.sin(t * Math.PI * .9 + .2)) * (.8 + rand() * .35);
    mane.push({ at: [x + (rand() - .5) * .012, y - .004, (rand() - .5) * .035 + .008], dir: [-.15 - rand() * .12, .22, .9 + rand() * .2], length: len, curl: .1, spread: .035 });
  }
  for (let i = 0; i < 26; i++) {
    const at = hf.at(.005 + rand() * .06, .07, (rand() - .5) * .07);
    // Down the forehead, pressed onto it (the locks collide with the face as they grow).
    forelock.push({ at, dir: [hf.U[0] - hf.V[0] * .35, hf.U[1] - hf.V[1] * .35, (rand() - .5) * .25], length: .14 + rand() * .1, curl: .08, spread: .02 });
  }
  // Tail: locks from the whole dock, fanning out as they fall to near the hocks.
  const dockPath: Vec3[] = [L.dock, [-1.12, 1.4, 0], [-1.19, 1.27, 0], [-1.22, 1.15, 0]];
  const dockAt = (t: number): Vec3 => {
    const f = t * (dockPath.length - 1), i = Math.min(dockPath.length - 2, Math.floor(f)), k = f - i, a = dockPath[i], b = dockPath[i + 1];
    return [mix(a[0], b[0], k), mix(a[1], b[1], k), 0];
  };
  for (let i = 0; i < 220; i++) {
    const t = .15 + rand() * .85, a = rand() * Math.PI * 2, c = dockAt(t), r = .04 * (1 - t * .35);
    // Hair grows all round the dock: from the top it arches back before falling, from below it falls at once.
    const back = Math.max(0, Math.sin(a)) * .5;
    tail.push({ at: [c[0] - .01 + Math.cos(a) * r * .4, c[1] + Math.sin(a) * r * .3, Math.cos(a) * r], dir: [-.14 - back * .5 - rand() * .1, -1 + back * .3, (rand() - .5) * .3], length: mix(1.1, .82, t) * (.85 + rand() * .25), curl: .14, spread: .07 });
  }
  return { mane, tail, forelock };
}

/** Thin tapered strands as ribbons (eyelashes, whiskers): fixed width, opaque, for close-ups. */
function strandRibbons(strands: ReadonlyArray<{ points: Vec3[] }>, width: number): BufferGeometry {
  const pos: number[] = [], idx: number[] = [], nrm: number[] = [];
  const a = new Vector3(), b = new Vector3(), t = new Vector3(), side = new Vector3(), n = new Vector3();
  for (const s of strands) {
    const base = pos.length / 3, pts = s.points;
    pts.forEach((p, i) => {
      a.set(...pts[Math.max(0, i - 1)]); b.set(...pts[Math.min(pts.length - 1, i + 1)]);
      t.subVectors(b, a).normalize();
      side.set(-t.z, 0, t.x); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize();
      n.crossVectors(side, t);
      const w = width * (1 - i / pts.length * .85);
      pos.push(p[0] - side.x * w, p[1] - side.y * w, p[2] - side.z * w, p[0] + side.x * w, p[1] + side.y * w, p[2] + side.z * w);
      nrm.push(n.x, n.y, n.z, n.x, n.y, n.z);
      if (i < pts.length - 1) { const v = base + i * 2; idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); }
    });
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("normal", new BufferAttribute(new Float32Array(nrm), 3));
  g.setIndex(idx);
  return g;
}

/** A curved strand from `root` along `dir`, bending toward `bend`, as `segments` points. */
function curvedStrand(root: Vec3, dir: Vec3, bend: Vec3, length: number, segments = 6): Vec3[] {
  const d = new Vector3(...dir).normalize(), k = new Vector3(...bend), p = new Vector3(...root), out: Vec3[] = [[...root] as Vec3];
  for (let i = 0; i < segments; i++) {
    d.addScaledVector(k, 1 / segments).normalize();
    p.addScaledVector(d, length / segments);
    out.push([p.x, p.y, p.z]);
  }
  return out;
}

/** Horse eyelashes: a dense fringe along the upper lid, drooping out over the eye; a few short ones below. */
function eyelashGeometry(eye: EyeSpec, seed: number): BufferGeometry {
  let s = seed * 9301 + 49297;
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const g = new Vector3(...eye.gaze).normalize(), up0 = new Vector3(0, 1, 0);
  const side = new Vector3().crossVectors(g, up0).normalize(), up = new Vector3().crossVectors(side, g).normalize();
  const r = eye.radius, W = r * (eye.aperture?.width ?? .9) * 1.02, H = r * (eye.aperture?.height ?? .48) * 1.05;
  const strands: Array<{ points: Vec3[] }> = [];
  // Long lashes on the upper lid only, densest in the middle; the lower lid has only a few short ones.
  for (let i = 0; i < 44; i++) {
    const upper = i < 40, th = upper ? Math.PI * (.14 + .72 * i / 39) : Math.PI * (1.3 + .4 * (i - 40) / 3);
    const lid = 1 + (eye.lid ?? .3);
    const at = new Vector3(...eye.center).addScaledVector(g, r * lid * .98).addScaledVector(side, Math.cos(th) * W * 1.08).addScaledVector(up, Math.sin(th) * H * 1.15 - r * .08);
    // A horse's upper lashes leave the lid forward and droop down over the eye.
    const out = new Vector3().addScaledVector(g, 1).addScaledVector(up, upper ? .45 + rand() * .2 : -.3).addScaledVector(side, Math.cos(th) * .35 + (rand() - .5) * .3);
    const droop = new Vector3().addScaledVector(up, upper ? -.9 : .1).addScaledVector(g, .15);
    const len = upper ? (.008 + .007 * Math.sin(Math.PI * i / 39)) * (.75 + rand() * .5) : .004 + rand() * .002;
    strands.push({ points: curvedStrand([at.x, at.y, at.z], [out.x, out.y, out.z], [droop.x, droop.y, droop.z], len) });
  }
  return strandRibbons(strands, .00045);
}

/** Vibrissae: long, sparse, slightly curved hairs on the muzzle, chin and round the eyes (both sides). */
function whiskerGeometry(sculpt: HorseSculpt, seed: number): BufferGeometry {
  let s = seed * 7919 + 13;
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const at = sculpt.head.at, strands: Array<{ points: Vec3[] }> = [];
  const add = (u: number, v: number, w: number, dir: Vec3, len: number) => {
    const p = projectOnto(sculpt.base, at(u, v, w));
    strands.push({ points: curvedStrand(p, dir, [0, -.6, 0], len * (.7 + rand() * .6), 7) });
  };
  for (const zs of [-1, 1]) {
    for (let i = 0; i < 16; i++) add(.47 + rand() * .07, -.06 - rand() * .05, zs * (.055 + rand() * .02), [.5 + rand() * .3, -.2 + rand() * .4, zs * (.6 + rand() * .3)], .05);
    for (let i = 0; i < 8; i++) add(.43 + rand() * .06, -.12 - rand() * .02, zs * (.02 + rand() * .03), [.3, -.8, zs * .4], .04);
    for (let i = 0; i < 6; i++) add(.15 + rand() * .06, .04 + rand() * .02, zs * .09, [.2, .6, zs * .8], .035);
    for (let i = 0; i < 5; i++) add(.18 + rand() * .05, -.03, zs * .095, [.3, -.4, zs * .8], .03);
  }
  return strandRibbons(strands, .00018);
}

// ------------------------------------------------------------------ assembly

export interface StockHorseOptions {
  id?: string;
  coat?: HorseCoatId;
  /** Mesh cell size in metres ("hero" .011, "supporting" .016, "background" .026). */
  quality?: "hero" | "supporting" | "background";
  /** Gallop clip options (stride length, footfall timing); see `horse-gallop`. */
  gallop?: HorseGallopOptions;
}

const CELL = { hero: .011, supporting: .016, background: .026 } as const;

export const HORSE_ACTIONS: readonly HeroActionSpec[] = [
  // One stride at 2.4 strides/s is 12.5 frames at 30 fps; bake it at ≥ 120 fps for a clean loop.
  { id: "gallop", label: "Gallop (left lead)", durationFrames: 12.5, loop: true, meaning: "A transverse gallop, one stride per loop, in place: move the root forward at `horseGallopSpeed` so planted hooves never slide." },
  { id: "stand", label: "Stand", durationFrames: 90, loop: true, meaning: "Standing square, breathing, ears and tail moving." },
];

// A horse's visible eye is nearly all dark iris; the sclera shows only at the corners.
const HORSE_EYE: EyeStyle = { pupil: "horizontal", iris: "#24170e", irisLight: "#2f1e12", sclera: "#2a1e18", finish: "wet", irisSize: 1.25, pupilSize: [.4, .14] };

/**
 * Build the stock horse as a hero asset: one skinned hide, eyelids and eyeballs and steel shoes
 * riding their bones, and skinned hair (mane, forelock, tail) on the same skeleton.
 */
export function createStockHorse(options: StockHorseOptions = {}): HeroAsset & { rig: AutoRig } {
  const res = createAssetResources();
  const group = new Group();
  group.name = options.id ?? "stock-horse";
  const coat = HORSE_COATS[options.coat ?? "bay"];
  const quality = options.quality ?? "supporting";
  const sculpt = horseSdf();
  // The painted coat is the fallback for other glTF viewers; `horse-coat` recolours it at run time from the masks
  // (sweat included), so the paint itself stays dry.
  const shading = horseCoatShading(coat, sculpt.regions, 0);
  const mesh = meshSdfCached("stock-horse:" + quality, () => ({ surface: sculpt.surface, shading: sculpt.base }),
    { min: [-1.22, -.01, -.42], max: [1.45, 1.98, .42], cellSize: CELL[quality], occlusionDistance: .14 });
  // Short coat: fine strands laid along the hair-flow field, a satin sheen at grazing angles.
  // Roughness 1 here: the painted per-vertex value is the absolute roughness.
  // Anisotropy along the tangent (the hair flow) stretches highlights into the long streaks a groomed coat shows.
  const material = res.own(new MeshPhysicalMaterial({ color: "#ffffff", vertexColors: true, roughness: 1, metalness: 0, sheen: .22, sheenRoughness: .5, sheenColor: coat.sheen,
    anisotropy: .5 }));
  // Short body hair is about 1–2 cm long and lies flat: a fine, low relief along the flow.
  // Each hair differs a little in colour (golden tips, darker roots), which breaks the sheen into fine streaks
  // along the lay of the coat (HD macro photographs of bay and chestnut coats).
  // Streaks about 1 mm across and 1 cm along (frequency 620), very shallow: hair, not wrinkles.
  applySurfaceDetail(material, { kind: "fur", frequency: 620, strength: .00005, roughnessVariation: .45, albedoVariation: .18, vertexSurface: true, vertexFlow: true });
  material.name = "horse-coat";
  const geometry = res.own(sculptGeometry(mesh, shading));
  addHairFlow(geometry);
  addCoatMasks(geometry, mesh, sculpt.regions);
  const rig = createAutoRig(geometry, material, HORSE_SKELETON, { sharpness: 3.4, smoothing: 3 });
  const hide = rig.mesh;
  hide.castShadow = true; hide.receiveShadow = true;
  group.add(res.name(hide, "horse-hide"));
  const lashMaterial = res.own(new MeshStandardMaterial({ color: "#0c0908", roughness: .8, side: DoubleSide }));
  lashMaterial.name = "horse-lashes";
  for (const eye of sculpt.eyes) {
    const sideName = eye.center[2] < 0 ? "near" : "far";
    // Eye skin patch: the head and the almond lids as one field, meshed finely and lifted 0.8 mm over the hide so it
    // blends into it with no seam (the coarse hide keeps a round socket underneath).
    const lidField = eyelidSdf(eye), r = eye.radius * 2.4, [cx, cy, cz] = eye.center;
    const lidMesh = meshSdfCached(`stock-horse-lids:${sideName}:${quality}`, () => ({
      surface: (x: number, y: number, z: number) => smoothUnionValue(sculpt.base(x, y, z), lidField(x, y, z), eye.radius * .12) - .0008,
      shading: sculpt.base,
    // Same occlusion probe as the hide, so the baked shading matches across the patch edge.
    }), { min: [cx - r, cy - r, cz - r], max: [cx + r, cy + r, cz + r], cellSize: quality === "hero" ? .0026 : .0038, occlusionDistance: .14 });
    const lidGeo = res.own(sculptGeometry(lidMesh, shading));
    addHairFlow(lidGeo);
    addCoatMasks(lidGeo, lidMesh, sculpt.regions);
    const lids = new Mesh(lidGeo, material);
    lids.castShadow = true; lids.receiveShadow = true;
    res.name(lids, `horse-eyelids-${sideName}`);
    const ball = createEyeball(res, eye, HORSE_EYE, `horse-eye-${sideName}`);
    group.add(lids, ball);
    rig.attach("head", lids); rig.attach("head", ball);
    const lashes = new Mesh(res.own(eyelashGeometry(eye, 7 + (eye.center[2] < 0 ? 0 : 1))), lashMaterial);
    group.add(res.name(lashes, `horse-lashes-${sideName}`));
    rig.attach("head", lashes);
  }
  // Tactile whiskers (vibrissae): on the upper lip and chin, and a few above and below each eye.
  const whiskers = new Mesh(res.own(whiskerGeometry(sculpt, 21)), lashMaterial);
  group.add(res.name(whiskers, "horse-whiskers"));
  rig.attach("head", whiskers);
  // Ears: thin cartilage needs a finer mesh than the hide; each ear is a patch riding its own bone.
  for (const side of ["near", "far"] as const) {
    const zs = side === "near" ? -1 : 1, b = sculpt.earBase, cell = quality === "hero" ? .0035 : .005;
    const earMesh = meshSdfCached(`stock-horse-ear:${side}:${cell}`, () => ({ surface: (x: number, y: number, z: number) => zs * z < 0 ? .05 : sculpt.ear(x, y, z), shading: sculpt.base }),
      { min: [b[0] - .06, b[1] - .04, zs < 0 ? -.2 : .01], max: [b[0] + .09, b[1] + .2, zs < 0 ? -.01 : .2], cellSize: cell, occlusionDistance: .03 });
    const earGeo = res.own(sculptGeometry(earMesh, shading));
    addHairFlow(earGeo);
    addCoatMasks(earGeo, earMesh, sculpt.regions);
    const earPatch = new Mesh(earGeo, material);
    earPatch.castShadow = true; earPatch.receiveShadow = true;
    group.add(res.name(earPatch, `horse-ear-${side}`));
    rig.attach(`ear-${side}`, earPatch);
  }
  // Steel shoes: a nailed rim under each hoof wall, visible at break-over.
  const steel = res.own(new MeshStandardMaterial({ color: "#6d6a66", metalness: 1, roughness: .42 }));
  steel.name = "horse-shoe-steel";
  for (const leg of ["fore-near", "fore-far", "hind-near", "hind-far"] as const) {
    const L = HORSE_LANDMARKS, c = leg.startsWith("fore") ? L.fore.coffin : L.hind.coffin, zs = leg.endsWith("near") ? -1 : 1;
    const shoeMesh = meshSdfCached("horse-shoe:" + quality, () => {
      const outer = roundBox([0, .006, 0], [.066, .006, .058], .006);
      const ring = smoothSubtract(.002, outer, roundBox([-.012, .006, 0], [.06, .02, .038], .01));
      return { surface: ring };
    }, { min: [-.08, -.004, -.07], max: [.08, .02, .07], cellSize: .003 });
    const shoe = new Mesh(res.own(sculptGeometry(shoeMesh)), steel);
    shoe.position.set(c[0] + .015, -.004, c[2] * zs);
    shoe.castShadow = true;
    group.add(res.name(shoe, `horse-shoe-${leg}`));
    rig.attach(`${leg}-hoof`, shoe);
  }
  // Hair on the same skeleton: alpha-mapped strand cards (alpha-to-coverage in a renderer with MSAA).
  const locks = hairLocks(sculpt, 1234), strands = res.own(hairStrandTexture(5));
  // Vertex colours carry only the per-card brightness; the hair colour is the material's (or `horse-coat`'s).
  // Little sheen: it brightens surfaces seen at grazing angles, and a card seen edge-on is all grazing angle, so strong
  // sheen draws bright lines that read as white hairs.
  const hairMaterial = res.own(new MeshPhysicalMaterial({ color: coat.hair, map: strands, vertexColors: true, alphaTest: .32, alphaToCoverage: true, roughness: .55, specularIntensity: .45,
    sheen: .15, sheenRoughness: .5, sheenColor: coat.hairTip, side: DoubleSide }));
  hairMaterial.name = "horse-hair";
  const collide = { sdf: sculpt.base, offset: .006 };
  const hairPart = (name: string, part: readonly HairLock[], cards: number, width: number, segments: number, droop: number, seed: number, flat: boolean) => {
    const geometry = hairCardGeometry({ locks: part, cards, width, segments, seed, droop, collide, flat, root: "#ffffff", tip: "#ffffff" });
    const skinned: SkinnedMesh = bindToAutoRig(rig, res.own(geometry), hairMaterial, { sharpness: 3 });
    skinned.castShadow = true;
    group.add(res.name(skinned, name));
  };
  hairPart("horse-mane", locks.mane, 3, .04, 8, 1.2, 7, true);
  hairPart("horse-forelock", locks.forelock, 3, .03, 6, .5, 9, true);
  hairPart("horse-tail", locks.tail, 4, .05, 14, .9, 13, false);
  const gallop = options.gallop;
  return {
    id: group.name, group, parts: res.parts, tier: "hero", rig,
    bounds: { min: [-1.95, 0, -.45], max: [1.45, 1.98, .45] },
    exposure: 1.05,
    studio: { palette: "sand", keyAzimuth: -35 },
    craft: {
      materials: ["short glossy coat with sheen and strand relief, painted countershading and black points", "keratin hooves with coronet bands",
        "steel shoes", "wet eyes under clearcoat", "mane, forelock and tail as skinned hair strands"],
      details: ["torso lofted through measured sections", "scapula, triceps, pectoral, gluteal, thigh, hamstring and gaskin masses",
        "withers, croup, stifle and flank hollow", "jowl, flat forehead, orbital rims, flared nostrils, lips and chin groove", "cupped, pricked ears",
        "carpus, fetlock, point of hock, chestnuts and flexor tendons", "lofted hooves with a sloped toe wall"],
      stylization: "Original stock horse measured from reference photographs; the coat relief is procedural.",
    },
    metersPerUnit: 1,
    actions: HORSE_ACTIONS,
    pose: (state: HeroActionState) => {
      rig.reset();
      if (!state.id) return;
      const spec = findAction(HORSE_ACTIONS, state.id), t = actionTime(spec, state.frame, state.fps);
      if (spec.id === "gallop") poseHorseGallop(rig, t, gallop);
      else poseHorseStand(rig, t);
    },
    dispose: res.dispose,
  };
}
