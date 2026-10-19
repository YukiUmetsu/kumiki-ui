/** Anatomical detail parts for sculpted creatures: eyelids and eyeballs.
 *
 * Eyes make or break a creature. A believable eye is NOT a sphere stuck on a
 * head: it sits in a socket, is framed by an almond-shaped aperture between an
 * upper and lower lid (thicker upper lid, tilted canthus), and has an iris
 * with radial fibrils, a darker limbal ring and a species-correct pupil
 * (horizontal in grazing animals, round in bears and humans, vertical slit in
 * cats) under a wet cornea.
 *
 * Lids are meshed as a separate fine-resolution patch so they stay crisp at
 * close-up without paying that resolution for the whole body.
 */
import { Matrix4, Mesh, MeshPhysicalMaterial, SphereGeometry, Vector3 } from "three";
import type { AssetResources } from "./hero-asset";
import { paintTexture } from "./canvas-texture";
import type { Sdf, Vec3 } from "./sdf-sculpt";
import { meshSdfCached, sculptGeometry, smoothSubtract, smoothUnion } from "./sdf-sculpt";
import type { SculptShading } from "./sdf-sculpt";
import type { MeshPhysicalMaterial as PhysicalMaterial } from "three";

export type PupilShape = "horizontal" | "round" | "vertical";

export interface EyeSpec {
  /** Eyeball center (world). */
  center: Vec3;
  /** Eyeball radius. */
  radius: number;
  /** Direction the eye looks (need not be normalized). */
  gaze: Vec3;
  /** Aperture half-extents as fractions of radius. */
  aperture?: { width: number; height: number };
  /** Canthus tilt in radians (+ raises the outer corner). */
  tilt?: number;
  /** Lid thickness as a fraction of radius. */
  lid?: number;
}

export interface EyeStyle {
  pupil: PupilShape;
  iris: string;
  irisLight: string;
  sclera: string;
  /** Iris angular radius (radians on the eyeball). */
  irisSize?: number;
  /** Pupil angular half-size (radians): [horizontal, vertical]. */
  pupilSize?: readonly [number, number];
  /** "wet": glossy living eye; "bronze": incised metal eye for statues. */
  finish: "wet" | "bronze";
}

interface Frame { side: Vector3; forward: Vector3; up: Vector3 }

function eyeFrame(spec: EyeSpec): Frame {
  const forward = new Vector3(...spec.gaze).normalize();
  const worldUp = new Vector3(0, 1, 0);
  const side = new Vector3().crossVectors(forward, worldUp).normalize();
  const up = new Vector3().crossVectors(side, forward).normalize();
  const tilt = spec.tilt ?? 0;
  if (tilt) {
    const s = side.clone(), u = up.clone();
    side.copy(s.multiplyScalar(Math.cos(tilt)).add(u.clone().multiplyScalar(Math.sin(tilt))));
    up.crossVectors(side, forward).normalize();
  }
  return { side, forward, up };
}

/** Lid shell with an almond aperture, as an SDF to union with the head. */
export function eyelidSdf(spec: EyeSpec): Sdf {
  const { side, forward, up } = eyeFrame(spec);
  const [cx, cy, cz] = spec.center, r = spec.radius;
  const outer = r * (1 + (spec.lid ?? .3)), inner = r * 1.035;
  const W = r * (spec.aperture?.width ?? .9), H = r * (spec.aperture?.height ?? .48);
  const R = (W * W + H * H) / (2 * H);
  // Upper lid slightly heavier: aperture center sits a little below the eye's equator.
  const f0 = r * 1.15, u0 = -r * .1;
  return (x, y, z) => {
    const px = x - cx, py = y - cy, pz = z - cz;
    const ls = px * side.x + py * side.y + pz * side.z;
    const lf = px * forward.x + py * forward.y + pz * forward.z;
    const lu = px * up.x + py * up.y + pz * up.z - u0;
    const len = Math.hypot(ls, lf, lu + u0);
    const shell = Math.max(len - outer, inner - len);
    // Lens (almond) cutter: intersection of two spheres offset along `up`.
    const a = Math.hypot(ls, lf - f0, lu - (R - H)) - R;
    const b = Math.hypot(ls, lf - f0, lu + (R - H)) - R;
    const almond = Math.max(a, b);
    return -smoothMin(-shell, almond, r * .12);
  };
}

const smoothMin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * .25;
};

/**
 * Seat an eye on a head surface: march from `inside` along the gaze until the
 * head SDF crosses zero, then sink the eyeball so `protrusion` × diameter shows.
 * Hand-placed eye centers are almost always buried or floating; this is not.
 */
export function seatEye(head: Sdf, inside: Vec3, eye: Omit<EyeSpec, "center">, protrusion = .42): EyeSpec {
  const g = new Vector3(...eye.gaze).normalize();
  let t = 0, last = head(...inside);
  if (last >= 0) throw new Error("seatEye: the start point must be inside the head.");
  for (let i = 0; i < 400; i++) {
    t += eye.radius * .05;
    const d = head(inside[0] + g.x * t, inside[1] + g.y * t, inside[2] + g.z * t);
    if (d >= 0) { t -= eye.radius * .05 * d / (d - last); break; }
    last = d;
  }
  const depth = eye.radius * (1 - 2 * protrusion);
  return { ...eye, center: [inside[0] + g.x * (t + depth), inside[1] + g.y * (t + depth), inside[2] + g.z * (t + depth)] };
}

/** Carve the eye socket from a head SDF so the separate eyeball can sit in it. */
export function carveSocket(head: Sdf, spec: EyeSpec): Sdf {
  const [cx, cy, cz] = spec.center;
  const r = spec.radius * 1.04;
  return smoothSubtract(spec.radius * .15, head, (x, y, z) => Math.hypot(x - cx, y - cy, z - cz) - r);
}

/** Painted eyeball texture (equirect on SphereGeometry; iris around +Y pole). */
function eyeTexture(style: EyeStyle) {
  const irisSize = style.irisSize ?? .62;
  const [ph, pv] = style.pupilSize ?? (style.pupil === "horizontal" ? [.34, .13] : style.pupil === "vertical" ? [.07, .36] : [.17, .17]);
  return paintTexture(1024, 512, (ctx, w, h, random) => {
    ctx.fillStyle = style.sclera; ctx.fillRect(0, 0, w, h);
    // Fine scleral vessels.
    ctx.strokeStyle = "rgba(150,60,50,.25)"; ctx.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      let x = random() * w, y = h * (.45 + random() * .4);
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (random() - .5) * 30; y -= random() * 25; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    const irisRow = irisSize / Math.PI * h;
    for (let x = 0; x < w; x++) {
      const phi = x / w * Math.PI * 2;
      // Radial fibrils: per-meridian brightness noise, smoothed.
      const fibril = .5 + .5 * Math.sin(phi * 37 + Math.sin(phi * 11) * 2) * Math.sin(phi * 13 + 1.7);
      const grad = ctx.createLinearGradient(0, 0, 0, irisRow);
      grad.addColorStop(0, style.iris);
      grad.addColorStop(.45, fibril > .55 ? style.irisLight : style.iris);
      grad.addColorStop(.82, style.iris);
      grad.addColorStop(1, "#0d0907"); // limbal ring
      ctx.fillStyle = grad; ctx.fillRect(x, 0, 1, irisRow);
      // Pupil boundary: ellipse in angular space, wider along the eye's side axis.
      const c = Math.cos(phi), s = Math.sin(phi);
      const pupil = 1 / Math.sqrt((c * c) / (ph * ph) + (s * s) / (pv * pv));
      ctx.fillStyle = "#070504"; ctx.fillRect(x, 0, 1, pupil / Math.PI * h);
    }
  }, { seed: 77, fallback: [40, 28, 20, 255] });
}

/** Eyeball mesh oriented so the iris looks along `gaze` and the pupil's long axis stays horizontal. */
export function createEyeball(res: AssetResources, spec: EyeSpec, style: EyeStyle, name: string): Mesh {
  const geometry = res.own(new SphereGeometry(spec.radius, 48, 32));
  const map = res.own(eyeTexture(style));
  const material = res.own(style.finish === "wet"
    ? new MeshPhysicalMaterial({ map, roughness: .32, metalness: 0, clearcoat: 1, clearcoatRoughness: .02, ior: 1.376 })
    : new MeshPhysicalMaterial({ map, color: "#c99a66", roughness: .34, metalness: 1 }));
  const mesh = new Mesh(geometry, material);
  const { side, forward } = eyeFrame(spec);
  // SphereGeometry: u = 0 is -X, iris painted around +Y. Map X→side, Y→gaze.
  const zAxis = new Vector3().crossVectors(side, forward).normalize();
  mesh.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(side, forward, zAxis));
  mesh.position.set(...spec.center);
  mesh.castShadow = false; mesh.receiveShadow = true;
  return res.name(mesh, name);
}

/** Mesh the lids of one eye as a fine detail patch, shaded with the creature's look. */
export function createEyelidPatch(res: AssetResources, spec: EyeSpec, context: Sdf, shading: SculptShading,
  material: PhysicalMaterial, name: string, cellSize = .0042): Mesh {
  const r = spec.radius * (1 + (spec.lid ?? .3)) * 1.25;
  const [cx, cy, cz] = spec.center;
  const lid = eyelidSdf(spec);
  const mesh = meshSdfCached(name + ":" + JSON.stringify(spec), () => ({
    surface: lid,
    shading: smoothUnion(spec.radius * .2, context, lid),
  }), { min: [cx - r, cy - r, cz - r], max: [cx + r, cy + r, cz + r], cellSize, occlusionDistance: spec.radius * 1.2 });
  const patch = new Mesh(res.own(sculptGeometry(mesh, shading)), material);
  patch.castShadow = true; patch.receiveShadow = true;
  return res.name(patch, name);
}
