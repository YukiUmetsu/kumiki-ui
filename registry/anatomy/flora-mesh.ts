/**
 * FLORA2 procedural mesh builder: turns a grown skeleton into renderer-neutral meshes.
 *
 * - **Axes** become tubes on rotation-minimizing frames, merged per surface (one batch per material). Thick axes get
 *   geometric bark relief cut from solid noise on the cylinder (no seam): baobab folds and wrinkles, willow
 *   fissures, dragon-tree rings. The foot flares into buttress lobes, limbs swell where they join, culms swell at nodes.
 *   UVs are in metres (`tile`), so the bark texture has the same texel density on every axis.
 * - **Organs** become a few templates (variants and maturity bins) with one matrix per placement, for instanced
 *   drawing. Flower heads expand into receptacle, disc florets in Vogel's spiral (r = c·√n, θ = n·137.5°), rays and
 *   bracts.
 */
import { seeded } from "./foundation-shapes";
import { fbm3, gradNoise3, linearOf } from "./foundation-raster";
import type { BladeSpec, BudSpec, CapitulumSpec, ClusterSpec, ColourStop, CorollaSpec, EarSpec, SpeciesMorphologyProfile, SurfaceSpec } from "./flora-profile";
import { growSkeleton } from "./flora-skeleton";
import type { FloraAxis, FloraSkeleton, OrganPlacement } from "./flora-skeleton";
import { buildBlade } from "./flora-leaf";
import type { BladeStats } from "./flora-leaf";
import { DEG, GOLDEN_ANGLE, MeshBuffer, add, basisMatrix, catmullRom, clamp, cross, dot, length3, lerp, normalize, perpendicular, scale, smooth, sub, transportFrames } from "./flora-math";
import type { MeshData, V3 } from "./flora-math";

export type FloraFidelity = "preview" | "high_def" | "macro_ultra";
export interface FidelitySettings {
  /** Radial segments of a 20 cm tube (thinner tubes use fewer). */
  radial: number;
  /** Node multiplier along axes. */
  detail: number;
  /** Most cells across a blade (a hero leaf). */
  leafCells: number;
  /** Triangles shared by all organ instances of one plant; small, numerous organs get simpler templates. */
  organTriangles: number;
  /** Texture size (px) for procedural maps. */
  texture: number;
  /** Fraction of small organs and fine axes kept. */
  density: number;
  /** Hole rows allowed on fenestrated leaves. */
  holeRows: number;
  maxOrgans: number;
  /** Template variants per organ and maturity bin. */
  variants: number;
  /** Geometric bark relief on thick axes. */
  relief: boolean;
  /** Fraction of disc florets drawn. */
  florets: number;
}
export const FLORA_FIDELITY: Readonly<Record<FloraFidelity, FidelitySettings>> = {
  preview: { radial: 7, detail: 0.6, leafCells: 16, organTriangles: 4e5, texture: 256, density: 0.65, holeRows: 1, maxOrgans: 60000, variants: 2, relief: false, florets: 0.35 },
  high_def: { radial: 14, detail: 1, leafCells: 40, organTriangles: 2.5e6, texture: 512, density: 0.75, holeRows: 2, maxOrgans: 300000, variants: 3, relief: true, florets: 0.8 },
  macro_ultra: { radial: 24, detail: 1.6, leafCells: 96, organTriangles: 8e6, texture: 1024, density: 1, holeRows: 3, maxOrgans: 800000, variants: 4, relief: true, florets: 1 },
};

/** Instanced organs: one template, one column-major matrix per instance, optional linear-RGB tints. */
export interface FloraOrganBatch { organ: string; surface: string; template: MeshData; matrices: Float32Array; tints?: Float32Array; count: number }
export interface FloraSpecimen {
  profile: SpeciesMorphologyProfile;
  seed: number;
  stage: number;
  height: number;
  /** Axes, support and mound merged per surface. */
  parts: { surface: string; mesh: MeshData }[];
  batches: FloraOrganBatch[];
  bounds: { min: V3; max: V3 };
  stats: { vertices: number; triangles: number; instances: number; templates: number; axes: number; ms: number };
  /** Labels of drawn radius-profile variants (for example the baobab trunk form). */
  forms: string[];
  /** Leaf statistics of the first fenestrated template (area, hole area, holes, splits). */
  leaf?: BladeStats;
}

/** Linear-RGB colour along stops (0 → 1). */
function colourRamp(stops: readonly ColourStop[]): (t: number) => V3 {
  const s = stops.slice().sort((a, b) => a.at - b.at).map(c => ({ at: c.at, c: linearOf(c.hex) as V3 }));
  return t => {
    if (t <= s[0].at) return s[0].c;
    for (let i = 1; i < s.length; i++) if (t <= s[i].at) { const u = (t - s[i - 1].at) / (s[i].at - s[i - 1].at || 1); return [lerp(s[i - 1].c[0], s[i].c[0], u), lerp(s[i - 1].c[1], s[i].c[1], u), lerp(s[i - 1].c[2], s[i].c[2], u)]; }
    return s[s.length - 1].c;
  };
}

/** Bark relief (−1…1) at angle φ and height s (m) on a tube of radius r: solid noise sampled on the cylinder. */
function barkRelief(kind: SurfaceSpec["texture"], seed: number, phi: number, s: number, r: number): number {
  const c = Math.cos(phi), d = Math.sin(phi);
  if (kind === "bark-folds") {
    const k = Math.max(0.6, r / 0.35);
    const folds = fbm3(seed, c * k, s / 1.6, d * k, 4), lumps = fbm3(seed + 3, c * k * 2.2, s / 0.5, d * k * 2.2, 3);
    const wrinkle = Math.sin(2 * Math.PI * s / 0.11 + 4 * fbm3(seed + 5, c * 3, s * 0.7, d * 3, 2)) * 0.5 + 0.5;
    return 0.75 * folds + 0.25 * lumps - 0.12 * wrinkle ** 6;
  }
  if (kind === "bark-fissured") {
    const k = Math.max(1, r / 0.045), n = 1 - Math.abs(gradNoise3(seed, c * k, s / 0.28, d * k));
    return (n ** 3 - 0.45) * 1.6 + 0.3 * fbm3(seed + 1, c * k * 2, s / 0.12, d * k * 2, 2);
  }
  if (kind === "bark-ringed") {
    const ring = Math.abs(Math.sin(Math.PI * (s / 0.045 + 0.4 * fbm3(seed, c, s * 0.6, d, 2))));
    return 0.5 * fbm3(seed + 2, c * 1.5, s / 0.6, d * 1.5, 3) - 0.35 * (1 - ring) ** 8;
  }
  if (kind === "coir") return 0.6 * gradNoise3(seed, c * 9, s / 0.08, d * 9);
  return 0.25 * fbm3(seed, c * 2, s / 0.4, d * 2, 2);
}

/** Appends one axis as a tube. */
/** Where branches leave an axis (for its swellings) and how its own base meets its parent (for its collar). */
interface Joint { children: { s: number; dir: V3; r: number }[]; crowned: boolean; parent?: { r: number; t: V3; end: boolean; exit: number } }
const WOODY = new Set(["trunk", "limb", "branch", "twig"]);

/**
 * Junction geometry for every axis, from the grown skeleton. A branch starts on its parent's axis and comes out of the
 * parent's surface at an arc length `s` along the parent (higher than its start when it leaves at a narrow angle),
 * toward a direction `dir` (across the parent), with a base radius `r`. `exit` is the branch's own arc length to that
 * surface: its collar and the parent's bark ridge sit there, where they can be seen. An axis is "crowned" when two or
 * more branches leave its last quarter (a trunk dividing into limbs, a dragon-tree fork): its top then dissolves into
 * their bases.
 */
function joints(sk: FloraSkeleton): Joint[] {
  const out: Joint[] = sk.axes.map(() => ({ children: [], crowned: false }));
  sk.axes.forEach((a, i) => {
    if (a.parent < 0) return;
    const p = sk.axes[a.parent], f = clamp(a.at) * (p.nodes.length - 1), k = Math.min(p.nodes.length - 2, Math.floor(f));
    const tp = normalize(sub(p.nodes[k + 1].p, p.nodes[k].p)), rp = lerp(p.nodes[k].r, p.nodes[k + 1].r, f - k);
    // The branch crosses the parent's radius after rp ÷ sin θ of its length (θ from the parent's axis), at most 3 rp.
    const d = normalize(sub(a.nodes[Math.min(1, a.nodes.length - 1)].p, a.nodes[0].p)), cos = dot(d, tp), sin = Math.sqrt(Math.max(0, 1 - cos * cos));
    const exit = Math.min(3 * rp, rp / Math.max(0.33, sin));
    // A child leaving the very end of its parent continues it (a fork), not a side branch.
    out[i].parent = { r: rp, t: tp, end: a.at >= 0.98, exit };
    if (!WOODY.has(a.rule.kind) || !WOODY.has(p.rule.kind) || a.at >= 0.98) return;
    const across = sub(d, scale(tp, cos));
    out[a.parent].children.push({ s: clamp(a.at) * p.length + exit * Math.max(0, cos), dir: length3(across) > 1e-3 ? normalize(across) : perpendicular(tp), r: a.nodes[0].r });
  });
  out.forEach((j, i) => { j.crowned = j.children.filter(c => c.s >= 0.75 * sk.axes[i].length).length >= 2; });
  return out;
}

function tube(buf: MeshBuffer, a: FloraAxis, surf: SurfaceSpec, f: FidelitySettings, seed: number, levels: number, joint: Joint) {
  const ramp = colourRamp(surf.colour);
  let pts = a.nodes.map(n => n.p), radii = a.nodes.map(n => n.r);
  if (f.detail >= 1 && pts.length >= 4 && a.level <= 2) {
    const sub = f.detail > 1.2 ? 3 : 2;
    pts = catmullRom(pts, sub);
    radii = pts.map((_, i) => { const u = i / sub, j = Math.min(radii.length - 2, Math.floor(u)); return lerp(radii[j], radii[j + 1], u - j); });
  }
  // A child at the end of its parent (a fork) starts inside the parent: back down the parent's axis, never along its own
  // direction, which would leave the parent's side when the child leaves at a wide angle. No step or cap shows.
  if (joint.parent?.end && WOODY.has(a.rule.kind)) { pts = [sub(pts[0], scale(joint.parent.t, joint.parent.r * 0.8)), ...pts]; radii = [Math.min(radii[0], joint.parent.r * 0.9), ...radii]; }
  const { n, b } = transportFrames(pts);
  const r0 = radii[0], ribs = a.rule.ribs, segs = Math.max(ribs ? ribs.count * 4 : 3, Math.min(f.radial * 2, Math.round(f.radial * (0.45 + Math.sqrt(r0 / 0.1) * 0.55))));
  // A scanned bark tiles at its real size; thin twigs take a part of one tile round them (no stretched streaks).
  const tileU = surf.scan?.width ?? surf.tile ?? 0.5, tileV = surf.scan?.height ?? surf.tile ?? 0.5, round = 2 * Math.PI * r0 / tileU, wraps = round >= 1 ? Math.round(round) : round;
  const relief = f.relief && r0 > 0.015 ? (surf.relief ?? 0) : 0, flare = a.level === 0 ? a.rule.flare : undefined;
  // The branch collar: the base flares (more on a thin branch on a thick parent) and stretches along the parent's axis.
  const collar = joint.parent && !joint.parent.end && WOODY.has(a.rule.kind) ? joint.parent : undefined, rp = collar?.r ?? r0;
  // The collar stays inside the parent (at most 0.95 of its radius): a codominant limb, nearly as thick as its parent, has
  // no collar, only the bark ridge (as in arborists' photos), and never bulges out of the trunk.
  const swell = collar ? Math.min(a.rule.swell ?? clamp(0.45 * rp / r0, 0.15, 0.85), Math.max(0, 0.95 * rp / r0 - 1)) : (a.rule.swell ?? 0);
  const t0 = normalize(sub(pts[1], pts[0])), along = collar ? (() => { const v = sub(collar.t, scale(t0, dot(collar.t, t0))); return length3(v) > 1e-3 ? normalize(v) : undefined; })() : undefined;
  const kids = joint.children, uShift = (seed % 89) / 89, vShift = (seed % 53) / 53;
  const rings = a.rule.nodeRings, flarePhase = (seed % 97) * 0.13;
  const base = buf.count;
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]);
    const u = i / (pts.length - 1);
    let r = radii[i];
    // The collar is full inside the parent and fades over about one branch diameter after the branch comes out.
    const out = collar ? Math.max(0, s - 0.85 * collar.exit) : s;
    if (swell) r *= 1 + swell * Math.exp(-out / (collar ? Math.min(0.75 * rp, 2.5 * r0) : 1.6 * r0));
    // A trunk dividing into limbs tapers into a dome inside their swollen bases: no capped cylinder shows.
    if (joint.crowned) r *= lerp(1, 0.68, smooth((u - 0.9) / 0.1));
    const stretch = along ? 0.55 * Math.exp(-out / Math.min(0.9 * rp, 3 * r0)) : 0;
    const near = kids.filter(c => Math.abs(s - c.s - 0.35 * c.r) < 4.8 * c.r);
    if (rings) { const d = s % rings.spacing; r *= 1 + rings.swell * (Math.exp(-((d / 0.007) ** 2)) + Math.exp(-(((rings.spacing - d) / 0.007) ** 2))); }
    const age = clamp((a.level + u) / levels);
    for (let j = 0; j <= segs; j++) {
      const phi = j / segs * Math.PI * 2;
      let rr = r;
      if (flare && s < flare.height * r0 * 3) rr *= 1 + flare.amount * Math.exp(-s / (flare.height * r0 * 0.45)) * (0.5 + 0.5 * Math.max(0, Math.cos(flare.lobes * phi + flarePhase + 1.2 * fbm3(seed, Math.cos(phi), s, Math.sin(phi), 2))) ** 1.5);
      const rel = relief ? barkRelief(surf.texture, seed, phi, s, r) : 0;
      rr *= 1 + relief * rel;
      // Ribs: crests on the frame's normal, rounded grooves between them.
      if (ribs) rr *= 1 - ribs.depth * (0.5 - 0.5 * Math.cos(ribs.count * phi)) ** 1.3;
      const dir = add(scale(n[i], Math.cos(phi)), scale(b[i], Math.sin(phi)));
      if (stretch && along) rr *= 1 + stretch * dot(dir, along) ** 2;
      // The parent swells toward each branch over its footprint, a little more above it (the bark ridge).
      for (const c of near) {
        const edge = Math.cos(clamp(Math.asin(Math.min(1, 1.3 * c.r / Math.max(1e-4, r))), 0.25, 1.4)), g = smooth((dot(dir, c.dir) - edge) / (1 - edge));
        if (g > 0) rr += 0.55 * c.r * g * Math.exp(-(((s - c.s - 0.35 * c.r) / (1.5 * c.r)) ** 2));
      }
      // Broad tone variation in world space breaks the repeat of a tiled bark scan (and of the procedural maps).
      const q = add(pts[i], dir, rr), shade = (1 + 0.22 * clamp(rel, -1, 1) * (relief ? 1 : 0)) * (0.86 + 0.28 * (0.5 + 0.5 * fbm3(seed >> 4, q[0] * 0.9, q[1] * 0.45, q[2] * 0.9, 3)));
      const c = ramp(age);
      buf.vertex(q, j / segs * wraps + uShift, s / tileV + vShift, [c[0] * shade, c[1] * shade, c[2] * shade]);
    }
  }
  const ring = segs + 1;
  for (let i = 0; i < pts.length - 1; i++) for (let j = 0; j < segs; j++) {
    const a0 = base + i * ring + j, a1 = a0 + 1, b0 = a0 + ring, b1 = b0 + 1;
    buf.tri(a0, a1, b0); buf.tri(a1, b1, b0);
  }
  // Close the tip with a short cone.
  const last = pts.length - 1, tipR = radii[last];
  if (tipR > 0.0015) {
    const t = normalize([pts[last][0] - pts[last - 1][0], pts[last][1] - pts[last - 1][1], pts[last][2] - pts[last - 1][2]]);
    const c = buf.vertex(add(pts[last], t, tipR * 0.7), 0.5, s / tileV + tipR / tileV, ramp(1));
    for (let j = 0; j < segs; j++) buf.tri(base + last * ring + j, base + last * ring + j + 1, c);
  }
}

/** A lathe: rotates a profile of (radius, height) points round +y. */
function lathe(buf: MeshBuffer, profile: readonly [number, number][], segs: number, colour: (u: number, phi: number) => V3, frame?: { o: V3; x: V3; y: V3; z: V3 }) {
  const base = buf.count;
  profile.forEach(([r, h], i) => {
    for (let j = 0; j <= segs; j++) {
      const phi = j / segs * Math.PI * 2, l: V3 = [Math.cos(phi) * r, h, Math.sin(phi) * r];
      const p: V3 = frame ? add(add(add(frame.o, frame.x, l[0]), frame.y, l[1]), frame.z, l[2]) : l;
      buf.vertex(p, j / segs, i / (profile.length - 1), colour(i / (profile.length - 1), phi));
    }
  });
  const ring = segs + 1;
  for (let i = 0; i < profile.length - 1; i++) for (let j = 0; j < segs; j++) {
    const a0 = base + i * ring + j, a1 = a0 + 1, b0 = a0 + ring, b1 = b0 + 1;
    buf.tri(a0, b0, a1); buf.tri(a1, b0, b1);
  }
}

/** A thin tube along a polyline, written straight into a buffer (stalks, silk). */
function strand(buf: MeshBuffer, pts: readonly V3[], r0: number, r1: number, segs: number, colour: (u: number) => V3) {
  const { n, b } = transportFrames(pts), base = buf.count;
  pts.forEach((p, i) => {
    const u = i / (pts.length - 1), r = lerp(r0, r1, u);
    for (let j = 0; j <= segs; j++) { const phi = j / segs * Math.PI * 2; buf.vertex(add(p, add(scale(n[i], Math.cos(phi)), scale(b[i], Math.sin(phi))), r), j / segs, u, colour(u)); }
  });
  for (let i = 0; i < pts.length - 1; i++) for (let j = 0; j < segs; j++) { const a0 = base + i * (segs + 1) + j; buf.tri(a0, a0 + 1, a0 + segs + 1); buf.tri(a0 + 1, a0 + segs + 2, a0 + segs + 1); }
}

const mat = (o: V3, x: V3, y: V3, z: V3, s: number) => basisMatrix(o, scale(x, s), scale(y, s), scale(z, s));

/** A stable key for a profile's content, so cached templates follow edits to a profile. */
const KEYS = new WeakMap<SpeciesMorphologyProfile, number>();
function profileKey(p: SpeciesMorphologyProfile): number {
  let k = KEYS.get(p);
  if (k === undefined) {
    const text = JSON.stringify(p);
    k = 2166136261;
    for (let i = 0; i < text.length; i++) k = Math.imul(k ^ text.charCodeAt(i), 16777619) >>> 0;
    KEYS.set(p, k);
  }
  return k;
}

/** Builds plants at one fidelity. Organ templates are cached per profile, so the plants of a species share them. */
export class ProceduralMeshBuilder {
  readonly settings: FidelitySettings;
  readonly #templates = new Map<string, MeshData>();
  constructor(readonly fidelity: FloraFidelity = "high_def") { this.settings = FLORA_FIDELITY[fidelity]; }

  /** Grows the skeleton of one plant, then builds its meshes. */
  build(profile: SpeciesMorphologyProfile, o: { seed: number; stage: number }): FloraSpecimen {
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    const f = this.settings;
    const sk = growSkeleton(profile, { seed: o.seed, stage: o.stage, density: f.density, detail: f.detail, maxOrgans: f.maxOrgans });
    const parts = new Map<string, MeshBuffer>();
    const part = (surface: string) => { let b = parts.get(surface); if (!b) { b = new MeshBuffer(); parts.set(surface, b); } return b; };
    const levels = Math.max(1, ...sk.axes.map(a => a.level)) + 1;
    const joint = joints(sk);
    sk.axes.forEach((a, i) => tube(part(a.rule.surface), a, profile.surfaces[a.rule.surface], f, o.seed * 31 + i, levels, joint[i]));
    addSupportAndMound(sk, part, f, o.seed);
    if (this.#templates.size > 3000) this.#templates.clear();
    const { batches, leaf } = organBatches(sk, f, o.seed, this.#templates, profileKey(profile));
    const meshes = [...parts].map(([surface, b]) => ({ surface, mesh: b.build() }));
    return summarize(profile, o.seed, o.stage, sk.height, meshes, batches, sk.axes.filter(a => a.form).map(a => a.form!), leaf, sk.axes.length, t0);
  }

  /** One organ alone at the origin, its length along +y and its face toward +z (close-ups and organ sheets). */
  organ(profile: SpeciesMorphologyProfile, organ: string, o: { maturity: number }): FloraSpecimen {
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    const spec = profile.organs[organ];
    if (!spec) throw new Error(`Unknown organ "${organ}" in ${profile.id}`);
    const size = spec.kind === "capitulum" ? spec.diameter.typical : spec.kind === "corolla" ? spec.petal.length.typical * 2 : spec.kind === "cluster" ? spec.size.typical : spec.length.typical;
    // Build once at the origin, then lift the organ so its lowest point rests just above the ground.
    // A corolla stands on its axis (its +z is the flower axis); blades and flower heads face the camera.
    const hanging = spec.kind === "cluster" && spec.shape === "raceme", upright = !hanging && (spec.kind === "corolla" || spec.kind === "cluster");
    const fy: V3 = upright ? [0, 0, -1] : hanging ? [0, 0, 1] : [0, 1, 0], fz: V3 = upright ? [0, 1, 0] : hanging ? [0, -1, 0] : [0, 0, 1];
    const at = (lift: number): FloraSkeleton => ({ profile, axes: [], height: size, stage: o.maturity, organs: [{ organ, p: [0, lift, 0], x: [1, 0, 0], y: fy, z: fz, scale: 1, maturity: o.maturity, pick: 0.5 }] });
    const first = organBatches(at(0), this.settings, 1, this.#templates, profileKey(profile));
    let low = Infinity;
    for (const b of first.batches) for (let k = 0; k < b.count; k++) {
      const e = b.matrices.subarray(k * 16, k * 16 + 16), q = b.template.positions;
      for (let i = 0; i < q.length; i += 3) low = Math.min(low, e[1] * q[i] + e[5] * q[i + 1] + e[9] * q[i + 2] + e[13]);
    }
    const { batches, leaf } = organBatches(at(Math.max(0, -low) + 0.02 * size), this.settings, 1, this.#templates, profileKey(profile));
    return summarize(profile, 1, o.maturity, size, [], batches, [], leaf, 0, t0);
  }
}

/** Bounds and counts of a built specimen. */
function summarize(profile: SpeciesMorphologyProfile, seed: number, stage: number, height: number, meshes: FloraSpecimen["parts"], batches: FloraOrganBatch[], forms: string[], leaf: BladeStats | undefined, axes: number, t0: number): FloraSpecimen {
  const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  const grow = (x: number, y: number, z: number, pad = 0) => { min[0] = Math.min(min[0], x - pad); min[1] = Math.min(min[1], y - pad); min[2] = Math.min(min[2], z - pad); max[0] = Math.max(max[0], x + pad); max[1] = Math.max(max[1], y + pad); max[2] = Math.max(max[2], z + pad); };
  let vertices = 0, triangles = 0, instances = 0;
  for (const m of meshes) { for (let i = 0; i < m.mesh.positions.length; i += 3) grow(m.mesh.positions[i], m.mesh.positions[i + 1], m.mesh.positions[i + 2]); vertices += m.mesh.positions.length / 3; triangles += m.mesh.indices.length / 3; }
  for (const bt of batches) {
    let reach = 0;
    for (let i = 0; i < bt.template.positions.length; i += 3) reach = Math.max(reach, Math.hypot(bt.template.positions[i], bt.template.positions[i + 1], bt.template.positions[i + 2]));
    for (let k = 0; k < bt.count; k++) { const e = bt.matrices.subarray(k * 16, k * 16 + 16), s = Math.hypot(e[4], e[5], e[6]); grow(e[12], e[13], e[14], reach * s); }
    vertices += bt.template.positions.length / 3 * bt.count; triangles += bt.template.indices.length / 3 * bt.count; instances += bt.count;
  }
  if (!Number.isFinite(min[0])) { min.fill(0); max.fill(0.01); }
  if (axes > 0) min[1] = Math.max(min[1], -0.2);
  const ms = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
  return { profile, seed, stage, height, parts: meshes, batches, bounds: { min, max }, forms, leaf, stats: { vertices, triangles, instances, templates: batches.length, axes, ms } };
}

/** The support pole and, for colonies, the mound of old stems under the living tips. */
function addSupportAndMound(sk: FloraSkeleton, part: (s: string) => MeshBuffer, f: FidelitySettings, seed: number) {
  const p = sk.profile;
  if (sk.support) {
    const s = p.surfaces[sk.support.surface], n = 2 + Math.round(sk.support.top / 0.15), nodes = Array.from({ length: n }, (_, i) => ({ p: [0, -0.03 + (sk.support!.top + 0.05) * i / (n - 1), 0] as V3, r: sk.support!.radius }));
    tube(part(sk.support.surface), { rule: { id: "support", kind: "stem", surface: sk.support.surface, length: { of: "height", ratio: 1 }, radius: { of: "height", ratio: 1, tip: 1 }, nodes: n }, level: 0, nodes, parent: -1, at: 0, length: sk.support.top, terminal: true }, { ...s, relief: s.relief ?? 0.06 }, { ...f, relief: true }, seed + 7, 1, { children: [], crowned: false });
  }
  const root = p.axes.find(a => a.id === p.root);
  if (root?.colony) {
    const R = Math.max(...sk.axes.filter(a => a.level === 0).map(a => Math.hypot(a.nodes[0].p[0], a.nodes[0].p[2])), 0.02), h = sk.height * 0.62;
    // Old stems below, shaded living leaves on top: gaps read as moss in shadow, not as soil.
    const ramp = colourRamp(p.surfaces[root.surface].colour), leafSurface = p.placements.find(r => r.on === root.id)?.organ, rng = seeded(seed + 3);
    const leafSpec = leafSurface ? p.organs[leafSurface] : undefined, top = leafSpec?.kind === "blade" ? colourRamp(p.surfaces[leafSpec.surface].colour)(0.7) : ramp(1);
    const prof: [number, number][] = Array.from({ length: 9 }, (_, i) => { const t = i / 8; return [R * 1.02 * Math.sin(Math.PI / 2 * (1 - t)) ** 0.8, h * Math.sin(Math.PI / 2 * t) * (1 - root.colony!.dome * 0.3 * (1 - t))]; });
    lathe(part(root.surface), prof, Math.max(12, f.radial * 2), (u, phi) => { const c = ramp(0.3), t = smooth((u - 0.25) / 0.6), k = 0.55 + 0.25 * t + 0.15 * fbm3(seed, Math.cos(phi) * 3, u * 3, Math.sin(phi) * 3, 2) + 0.05 * rng(); return [lerp(c[0], top[0], t) * k, lerp(c[1], top[1], t) * k, lerp(c[2], top[2], t) * k]; });
  }
}

/** Organ templates and their instances. */
function organBatches(sk: FloraSkeleton, f: FidelitySettings, seed: number, templates: Map<string, MeshData>, pkey: number): { batches: FloraOrganBatch[]; leaf?: BladeStats } {
  const p = sk.profile, groups = new Map<string, { organ: string; surface: string; template: MeshData; mats: number[]; tints: number[] }>();
  const tseed = pkey % 100003;
  let leaf: BladeStats | undefined;
  const push = (key: string, organ: string, surface: string, make: () => MeshData, matrix: ArrayLike<number>, tint?: V3) => {
    let g = groups.get(key);
    if (!g) { const tk = `${pkey}|${key}`; let t = templates.get(tk); if (!t) { t = make(); templates.set(tk, t); } g = { organ, surface, template: t, mats: [], tints: [] }; groups.set(key, g); }
    for (let i = 0; i < 16; i++) g.mats.push(matrix[i]);
    if (tint) g.tints.push(...tint); else g.tints.push(1, 1, 1);
  };
  // Cells across a blade from the triangle budget: about 2·nx·ny triangles with ny ≈ 0.45·nx·(length ÷ width).
  // Fallen organs lie flat and small on the ground: they are counted apart and get a twelfth of a living organ's share.
  const share = (pl: OrganPlacement) => pl.litter ? `${pl.organ}|litter` : pl.organ;
  const counts = new Map<string, number>();
  for (const pl of sk.organs) counts.set(share(pl), (counts.get(share(pl)) ?? 0) + 1);
  const budget = (spec: BladeSpec, organ: string) => f.organTriangles / ((counts.get(organ) ?? 1) * (spec.leaflets ? spec.leaflets.count.typical : 1) * (organ.endsWith("|litter") ? 12 : 1));
  // Narrow blades need few cells across (a 5 cm sword leaf does not need a hero leaf's 40).
  const cellsFor = (spec: BladeSpec, organ: string) => Math.max(2, Math.min(Math.max(4, Math.round(f.leafCells * Math.min(1, 2.5 * spec.width))), Math.round(Math.sqrt(budget(spec, organ) / (0.9 / Math.max(0.02, spec.width))))));
  const bladeMesh = (spec: BladeSpec, maturity: number, s: number, length?: number, cells = f.leafCells, triangles?: number) => {
    const surf = p.surfaces[spec.surface], ramp = colourRamp(surf.colour), rim = surf.rim, rimC = rim ? linearOf(rim.hex) : undefined;
    // A coloured rim (a variegated margin) blends in over the outer `width` of the half-width.
    const colour = rim && rimC ? (t: number, a: number): V3 => { const c = ramp(t), k = smooth((a - (1 - rim.width)) / (rim.width * 0.35)); return [lerp(c[0], rimC[0], k), lerp(c[1], rimC[1], k), lerp(c[2], rimC[2], k)]; } : ramp;
    const built = buildBlade(spec, { seed: s, resolution: cells, maturity, holeRows: f.holeRows, colour, length, triangles });
    if (!leaf && built.stats.holes + built.stats.splits > 0) leaf = built.stats;
    return built;
  };
  const bladeTemplate = (spec: BladeSpec, maturity: number, s: number, cells: number, triangles: number): MeshData => {
    const out = new MeshBuffer();
    const stalk = spec.stalk, stalkLen = stalk?.length ?? 0;
    if (stalk) {
      // A cheap blade (under 150 triangles) gets a straight three-sided stalk: 6 triangles, not 40.
      const cheap = triangles < 150, rows = cheap ? 2 : 6, sr = colourRamp(p.surfaces[stalk.surface].colour);
      const pts: V3[] = Array.from({ length: rows }, (_, i) => { const u = i / (rows - 1); return [0, u * stalkLen, Math.sin(u * Math.PI) * stalkLen * 0.06]; });
      strand(out, pts, stalk.radius, stalk.radius * 0.7, cheap ? 3 : f.radial >= 14 ? 6 : 4, sr);
    }
    if (spec.leaflets) {
      const n = maturity < 0.3 ? 1 : Math.max(1, Math.round(lerp(spec.leaflets.count.min, spec.leaflets.count.max, seeded(s)())));
      for (let i = 0; i < n; i++) {
        const u = n === 1 ? 0 : i / (n - 1) * 2 - 1, ang = u * spec.leaflets.spread / 2 * DEG, size = 1 - 0.42 * Math.abs(u) ** 1.4;
        const lm = bladeMesh(spec, maturity, s + i * 17, undefined, cells, triangles).mesh, x: V3 = [Math.cos(ang), -Math.sin(ang), 0], y: V3 = [Math.sin(ang), Math.cos(ang), 0];
        // Fused palmate lobes overlap at the base: lift each a hair so they never fight for the same depth.
        out.append(lm, basisMatrix([0, stalkLen, i * 0.002 * spec.length.typical], scale(x, size), scale(y, size), [0, 0, size]));
      }
    } else out.append(bladeMesh(spec, maturity, s, undefined, cells, triangles).mesh, stalk ? basisMatrix([0, stalkLen, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]) : undefined);
    return out.build();
  };
  const bins = (spec: BladeSpec) => (spec.fenestration || spec.leaflets ? 4 : 1);
  // Flowers share the organ budget too: a tree in bloom has thousands of them.
  const flowers = sk.organs.reduce((n, pl) => { const sp = p.organs[pl.organ]; return n + (sp.kind === "corolla" ? 1 : sp.kind === "cluster" ? sp.count.typical : 0); }, 0);
  const perFlower = flowers ? f.organTriangles / flowers : f.organTriangles;
  // Crown self-shading: leaves deep in the organ cloud and low in it are darker; each leaf also varies a little in tone.
  const cloud = sk.organs.length >= 40 ? (() => {
    const c = [0, 0, 0], d = [0, 0, 0];
    let lo = Infinity, hi = -Infinity;
    for (const o of sk.organs) for (let i = 0; i < 3; i++) c[i] += o.p[i] / sk.organs.length;
    for (const o of sk.organs) { for (let i = 0; i < 3; i++) d[i] += (o.p[i] - c[i]) ** 2 / sk.organs.length; lo = Math.min(lo, o.p[1]); hi = Math.max(hi, o.p[1]); }
    return { c, sd: d.map(v => Math.max(1e-3, Math.sqrt(v)) * 1.8), lo, hi };
  })() : undefined;
  const leafTint = (pl: OrganPlacement): V3 => {
    const h = (k: number) => ((Math.sin(pl.pick * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1 - 0.5;
    let shade = 1 + 0.1 * h(3);
    if (cloud) {
      const r = Math.hypot((pl.p[0] - cloud.c[0]) / cloud.sd[0], (pl.p[1] - cloud.c[1]) / cloud.sd[1], (pl.p[2] - cloud.c[2]) / cloud.sd[2]);
      shade *= lerp(0.48, 1, smooth(r)) * (0.82 + 0.18 * smooth((pl.p[1] - cloud.lo) / Math.max(1e-3, cloud.hi - cloud.lo)));
    }
    return [shade * (1 + 0.06 * h(1)), shade * (1 + 0.03 * h(2)), shade * (1 - 0.05 * h(1))];
  };
  for (const pl of sk.organs) {
    const spec = p.organs[pl.organ];
    const lengthFactor = (r: { min: number; typical: number; max: number }) => lerp(r.min, r.max, 0.25 + 0.5 * pl.pick) / r.typical;
    if (spec.kind === "blade") {
      const nb = bins(spec), bin = Math.min(nb - 1, Math.floor(pl.maturity * nb)), v = Math.floor(pl.pick * f.variants) % f.variants;
      const m = nb === 1 ? 1 : (bin + 0.7) / nb;
      const cells = cellsFor(spec, share(pl)), tris = budget(spec, share(pl));
      // The key holds the detail level, so a template made for a sparse plant is never reused on a dense one.
      push(`${pl.organ}|${bin}|${v}|${cells}|${Math.round(Math.log2(Math.min(tris, 1e9)) * 2)}`, pl.organ, spec.surface, () => bladeTemplate(spec, m, tseed + bin * 101 + v * 13, cells, tris), mat(pl.p, pl.x, pl.y, pl.z, pl.scale * lengthFactor(spec.length)), leafTint(pl));
    } else if (spec.kind === "bud") {
      const v = Math.floor(pl.pick * 2);
      push(`${pl.organ}|${v}`, pl.organ, spec.surface, () => budTemplate(spec, p, v), mat(pl.p, pl.x, pl.y, pl.z, pl.scale * lengthFactor(spec.length) * spec.length.typical));
    } else if (spec.kind === "ear") {
      push(`${pl.organ}`, pl.organ, spec.husk, () => earTemplate(spec, p, f, tseed), mat(pl.p, pl.x, pl.y, pl.z, pl.scale * lengthFactor(spec.length) * spec.length.typical));
    } else if (spec.kind === "corolla") corolla(spec, pl, p, f, tseed, push, bladeMesh, perFlower);
    else if (spec.kind === "cluster") cluster(spec, pl, p, f, tseed, push, bladeMesh, perFlower);
    else capitulum(spec, pl, p, f, seed, tseed, push, bladeMesh);
  }
  const batches = [...groups.values()].map(g => ({ organ: g.organ, surface: g.surface, template: g.template, matrices: new Float32Array(g.mats), tints: g.tints.some(v => v !== 1) ? new Float32Array(g.tints) : undefined, count: g.mats.length / 16 }));
  return { batches, leaf };
}

/** A spindle at unit length along +y; with a stalk, the stalk comes first (a fruit hanging on its peduncle). */
function budTemplate(spec: BudSpec, p: SpeciesMorphologyProfile, v: number): MeshData {
  const out = new MeshBuffer(), ramp = colourRamp(p.surfaces[spec.surface].colour), w = spec.width * (v ? 0.85 : 1);
  const stalk = spec.stalk ? spec.stalk.length / spec.length.typical : 0;
  if (spec.stalk) {
    const sr = colourRamp(p.surfaces[spec.stalk.surface].colour), r = spec.stalk.radius / spec.length.typical;
    strand(out, Array.from({ length: 6 }, (_, i) => [Math.sin(i / 5 * Math.PI) * stalk * 0.04, i / 5 * stalk, 0] as V3), r, r * 0.8, 5, u => sr(u));
  }
  lathe(out, Array.from({ length: 10 }, (_, i) => { const t = i / 9; return [w / 2 * Math.sin(Math.PI * t) ** 0.8, stalk + t] as [number, number]; }), spec.stalk ? 12 : 6, u => ramp(u));
  return out.build();
}

type BladeMeshFn = (s: BladeSpec, m: number, seed: number, length?: number, cells?: number) => { mesh: MeshData };

/**
 * A flower of petals or tepals round its axis (+z), in whorls or a spiral, opening with maturity. Each flower is one
 * instance per surface: all its petals form one template (built at unit petal length, in four opening bins and a few
 * variants), its stamens another, its pedicel a third. Long stamens are curved filaments with anthers.
 */
/** Below this many triangles per flower, a flower is drawn as one flat star (`starMesh`). */
const FAR_FLOWER = 40;

/** A distant flower: one flat star of its petals, a centre and a rim through each petal tip and gap, at unit petal length. */
function starMesh(spec: CorollaSpec, p: SpeciesMorphologyProfile, openB: number, stalk: number): MeshData {
  const out = new MeshBuffer(), ramp = colourRamp(p.surfaces[spec.petal.surface].colour), A = spec.angle[1] * lerp(0.3, 1, openB) * DEG;
  // Seen from afar, the pale petal blades dominate over the darker base: the colour runs from 0.3 at the centre to the tip.
  const c = out.vertex([0, 0, stalk], 0.5, 0, ramp(0.3)), m = Math.max(4, spec.count) * 2, rim: number[] = [];
  for (let k = 0; k < m; k++) {
    const az = k / m * Math.PI * 2, r = k % 2 === 0 ? 1 : 0.7;
    rim.push(out.vertex([Math.cos(az) * Math.sin(A) * r, Math.sin(az) * Math.sin(A) * r, stalk + Math.cos(A) * r], 0.5, r, ramp(lerp(0.3, 1, r))));
  }
  for (let k = 0; k < m; k++) out.tri(c, rim[k], rim[(k + 1) % m]);
  return out.build();
}

function corolla(spec: CorollaSpec, pl: OrganPlacement, p: SpeciesMorphologyProfile, f: FidelitySettings, tseed: number, push: Push, bladeMesh: BladeMeshFn, budget: number) {
  const open = smooth((pl.maturity - 0.45) / 0.45), bin = Math.min(3, Math.floor(open * 4)), openB = (bin + 0.5) / 4, v = Math.floor(pl.pick * f.variants) % f.variants;
  const L = lerp(spec.petal.length.min, spec.petal.length.max, 0.3 + 0.4 * pl.pick), unit = L * pl.scale, { p: o, x, y, z } = pl;
  // Detail from the budget per flower: about 60% for the petals, the rest for the stamens.
  const petalTris = budget * (spec.stamens ? 0.6 : 0.9) / spec.count, aspect = 1 / Math.max(0.05, spec.petal.width);
  const stalk = spec.stalk ? spec.stalk.length / L : 0, cells = Math.max(2, Math.min(Math.round(f.leafCells * 0.5), Math.round(Math.sqrt(petalTris / (0.9 * aspect)))));
  const n = spec.count, per = spec.perWhorl ?? n, whorls = Math.ceil(n / per), matrix = mat(o, x, y, z, unit);
  if (budget < FAR_FLOWER) {
    push(`${pl.organ}|star|${bin}|${spec.count}`, pl.organ, spec.petal.surface, () => starMesh(spec, p, openB, stalk), matrix);
    return;
  }
  push(`${pl.organ}|petals|${bin}|${v}|${cells}`, pl.organ, spec.petal.surface, () => {
    const out = new MeshBuffer(), X: V3 = [1, 0, 0], Y: V3 = [0, 1, 0], Z: V3 = [0, 0, 1];
    for (let k = 0; k < n; k++) {
      const w = Math.floor(k / per), whorled = spec.arrangement === "whorled";
      // rel 1 = outermost (first formed), 0 = innermost.
      const rel = whorled ? (whorls > 1 ? 1 - w / (whorls - 1) : 1) : 1 - k / Math.max(1, n - 1);
      const az = (whorled ? (k % per) * 360 / per + w * 180 / per : k * GOLDEN_ANGLE) * DEG + v * 0.4;
      const A = lerp(spec.angle[0], spec.angle[1], rel) * lerp(0.3, 1, openB) * DEG, sc = spec.scale ? lerp(spec.scale[0], spec.scale[1], rel) : 1;
      const radial = add(scale(X, Math.cos(az)), scale(Y, Math.sin(az))), py = normalize(add(scale(Z, Math.cos(A)), scale(radial, Math.sin(A))));
      const inward = scale(radial, -1), pz = normalize(add(inward, py, -dot(inward, py))), px = cross(py, pz);
      const len = sc * lerp(0.75, 1, openB), base = add([0, 0, stalk], radial, 0.06 * (0.4 + rel));
      out.append(bladeMesh(spec.petal, 1, tseed + 300 + v * 7 + w + k * 3, 1, cells).mesh, basisMatrix(base, scale(px, len), scale(py, len), scale(pz, len)));
    }
    return out.build();
  }, matrix);
  // Stamens of a distant flower are below a pixel: they are left out when the budget per flower is tiny.
  if (spec.stamens && openB > 0.2 && budget * 0.4 >= 30) {
    const st = spec.stamens, Ls = st.length / L, curve = (st.curve ?? 0) * DEG;
    // A dense tuft of short stamens is drawn with fewer, simpler filaments when the budget is small.
    const shown = Math.max(3, Math.min(st.count, Math.round(budget * 0.4 / 40))), rich = budget * 0.4 / shown > 120;
    push(`${pl.organ}|stamens|${v}|${shown}|${rich}`, pl.organ, st.surface, () => {
      const out = new MeshBuffer(), ramp = colourRamp(p.surfaces[st.surface].colour), rng = seeded(tseed + 77 + v);
      for (let k = 0; k < shown; k++) {
        const az = (k * 360 / shown + 30) * DEG + rng() * 0.3, radial: V3 = [Math.cos(az), Math.sin(az), 0];
        // Each filament leaves the centre tilted out, then bends toward the axis by `curve`; an anther sits at its end.
        const tilt = (curve ? 40 : 18 + 10 * rng()) * DEG, pts: V3[] = [[radial[0] * 0.03, radial[1] * 0.03, stalk + 0.02]];
        const steps = rich ? 7 : 2;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps, a = tilt * (1 - t) + (tilt - curve) * t, d: V3 = [radial[0] * Math.sin(a), radial[1] * Math.sin(a), Math.cos(a)];
          pts.push(add(pts[i - 1], d, Ls * (0.92 + 0.16 * rng()) / steps));
        }
        strand(out, pts, 0.008 * Math.min(1, Ls * 2), 0.005 * Math.min(1, Ls * 2), rich ? 4 : 3, u => ramp(u * 0.8));
        const tip = pts[pts.length - 1], ax = normalize(sub(tip, pts[pts.length - 2])), side = perpendicular(ax);
        const rows = rich ? 6 : 3;
        lathe(out, Array.from({ length: rows }, (_, i) => { const t = i / (rows - 1); return [0.022 * Math.sin(Math.PI * t) ** 0.7, t * 0.06] as [number, number]; }), rich ? 6 : 4, () => ramp(1),
          { o: tip, x: side, y: ax, z: cross(side, ax) });
      }
      return out.build();
    }, matrix);
  }
  if (spec.stalk && stalk > 0) {
    const st = spec.stalk;
    push(`${pl.organ}|stalk`, pl.organ, st.surface, () => {
      const out = new MeshBuffer(), ramp = colourRamp(p.surfaces[st.surface].colour);
      strand(out, Array.from({ length: 6 }, (_, i) => [0, Math.sin(i / 5 * Math.PI) * stalk * 0.05, i / 5 * stalk] as V3), st.radius / L, st.radius / L * 0.8, 5, u => ramp(u));
      return out.build();
    }, matrix);
  }
}

/**
 * Florets on one stalk, as a dome (hydrangea), an umbel (spider lily, cherry) or a hanging raceme (wisteria) along +z.
 * The rays or axis are one template per variant; each floret is a corolla placed on it (racemes open from the base, so
 * their tip florets stay in bud).
 */
function cluster(spec: ClusterSpec, pl: OrganPlacement, p: SpeciesMorphologyProfile, f: FidelitySettings, tseed: number, push: Push, bladeMesh: BladeMeshFn, budget: number) {
  const floret = p.organs[spec.floret];
  if (floret?.kind !== "corolla") return;
  // A distant cluster (star florets) is two instances: straight three-sided stalks, and all its stars merged into one
  // template. Its floret count takes one of four steps, so a wisteria does not make a template per count.
  const far = budget < FAR_FLOWER, v = Math.floor(pl.pick * f.variants) % f.variants, rng = seeded(tseed + 900 + v * 31);
  const count = Math.max(1, Math.round(lerp(spec.count.min, spec.count.max, far ? Math.round(pl.pick * 3) / 3 : pl.pick))), size = lerp(spec.size.min, spec.size.max, 0.3 + 0.4 * pl.pick) * pl.scale;
  const spread = (spec.spread ?? (spec.shape === "dome" ? 70 : 35)) * DEG;
  const local: { at: V3; dir: V3; scale: number; maturity: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count, az = i * GOLDEN_ANGLE * DEG + rng() * 0.3;
    if (spec.shape === "dome") {
      const R = size / 2, c = lerp(Math.cos(spread), 1, t), sn = Math.sqrt(1 - c * c), d: V3 = [sn * Math.cos(az), sn * Math.sin(az), c];
      local.push({ at: add([0, 0, R * 0.55], d, R), dir: d, scale: 0.9 + 0.2 * rng(), maturity: pl.maturity });
    } else if (spec.shape === "umbel") {
      const th = spread * (0.55 + 0.45 * rng()), a2 = i * 2 * Math.PI / count + rng() * 0.5, d: V3 = [Math.sin(th) * Math.cos(a2), Math.sin(th) * Math.sin(a2), Math.cos(th)];
      local.push({ at: scale(d, size * (0.85 + 0.3 * rng())), dir: d, scale: 0.9 + 0.2 * rng(), maturity: pl.maturity });
    } else {
      const zt = t * size, out: V3 = [Math.cos(az), Math.sin(az), 0], d = normalize(add(out, [0, 0, 1], 0.35));
      local.push({ at: add([0, 0, zt], out, size * 0.03), dir: d, scale: lerp(1, 0.4, t), maturity: pl.maturity * lerp(1, 0.35, t ** 1.5) });
    }
  }
  const { p: o, x, y, z } = pl, world = (l: V3): V3 => add(add(add(o, x, l[0]), y, l[1]), z, l[2]), wdir = (l: V3): V3 => normalize(add(add(scale(x, l[0]), scale(y, l[1])), scale(z, l[2])));
  push(`${pl.organ}|stalks|${v}|${count}|${far ? "far" : "near"}`, pl.organ, spec.stalk.surface, () => {
    const out = new MeshBuffer(), ramp = colourRamp(p.surfaces[spec.stalk.surface].colour), r = spec.stalk.radius / Math.max(1e-4, size);
    const rows = far ? 3 : 8;
    if (spec.shape === "raceme") strand(out, Array.from({ length: rows }, (_, i) => [0, Math.sin(i / (rows - 1) * 2) * 0.04, i / (rows - 1)] as V3), r * 1.4, r * 0.6, far ? 3 : 5, u => ramp(u));
    else for (const l of local) strand(out, far ? [[0, 0, 0], scale(l.at, 1 / size)] : [[0, 0, 0], scale(l.at, 0.5 / size), scale(l.at, 1 / size)], r, r * 0.8, far ? 3 : 4, u => ramp(u));
    return out.build();
  }, mat(o, x, y, z, size));
  if (far) {
    const open = smooth((pl.maturity - 0.45) / 0.45), bin = Math.min(3, Math.floor(open * 4));
    // Typical petal length over typical cluster size: the stars' size in the cluster's unit frame.
    const L = lerp(floret.petal.length.min, floret.petal.length.max, 0.5), rel = L / lerp(spec.size.min, spec.size.max, 0.5);
    push(`${pl.organ}|stars|${v}|${count}|${bin}`, spec.floret, floret.petal.surface, () => {
      const out = new MeshBuffer();
      // The bin's maturity, scaled per floret (a raceme opens from the base), gives each star its own opening.
      const m0 = 0.45 + 0.45 * (bin + 0.5) / 4;
      for (const l of local) {
        const ob = smooth((m0 * l.maturity / Math.max(1e-3, pl.maturity) - 0.45) / 0.45);
        const zf = normalize(l.dir), xf = perpendicular(zf), k = rel * l.scale;
        out.append(starMesh(floret, p, ob, floret.stalk ? floret.stalk.length / L : 0), basisMatrix(scale(l.at, 1 / size), scale(xf, k), scale(cross(zf, xf), k), scale(zf, k)));
      }
      return out.build();
    }, mat(o, x, y, z, size));
    return;
  }
  local.forEach((l, i) => {
    const zf = wdir(l.dir), xf = perpendicular(zf);
    corolla(floret, { organ: spec.floret, p: world(l.at), x: xf, y: cross(zf, xf), z: zf, scale: pl.scale * l.scale, maturity: l.maturity, pick: (pl.pick * 977 + i * 0.618) % 1 }, p, f, tseed, push, bladeMesh, budget);
  });
}

/** A maize ear: husked spindle with flag leaves and silk, built at unit length along +y. */
function earTemplate(spec: EarSpec, p: SpeciesMorphologyProfile, f: FidelitySettings, seed: number): MeshData {
  const out = new MeshBuffer(), husk = colourRamp(p.surfaces[spec.husk].colour), silk = colourRamp(p.surfaces[spec.silk].colour), rng = seeded(seed + 41), w = spec.width;
  const segs = Math.max(8, f.radial);
  lathe(out, Array.from({ length: 14 }, (_, i) => { const t = i / 13; return [w / 2 * Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.06)) ** 0.55 * (1 - 0.35 * t), t * 0.86] as [number, number]; }), segs,
    (u, phi) => { const c = husk(u), k = 0.9 + 0.1 * Math.cos(phi * 11 + u * 3); return [c[0] * k, c[1] * k, c[2] * k]; });
  for (let i = 0; i < 3; i++) {
    const a = rng() * Math.PI * 2, pts: V3[] = Array.from({ length: 6 }, (_, k) => { const u = k / 5; return [Math.cos(a) * w * 0.12 * (1 + u), 0.82 + u * 0.16, Math.sin(a) * w * 0.12 * (1 + u)]; });
    strand(out, pts, w * 0.09, w * 0.02, 4, u => husk(0.9 + u * 0.1));
  }
  const silks = Math.round(18 + 30 * f.density);
  for (let i = 0; i < silks; i++) {
    const a = rng() * Math.PI * 2, out1 = 0.15 + rng() * 0.35, L = spec.silkLength * (0.6 + 0.6 * rng()), droop = 0.5 + rng();
    const pts: V3[] = Array.from({ length: 7 }, (_, k) => { const u = k / 6; return [Math.cos(a) * (0.01 + u * out1 * L), 0.86 + Math.sin(u * 1.4) * L * 0.5 - droop * u * u * L * 0.45, Math.sin(a) * (0.01 + u * out1 * L)]; });
    strand(out, pts, 0.0035, 0.0018, 3, u => silk(u));
  }
  return out.build();
}

type Push = (key: string, organ: string, surface: string, make: () => MeshData, matrix: ArrayLike<number>, tint?: V3) => void;
/** A composite flower head: receptacle, disc florets in Vogel's spiral, ray florets and bracts. */
function capitulum(spec: CapitulumSpec, pl: OrganPlacement, p: SpeciesMorphologyProfile, f: FidelitySettings, seed: number, tseed: number, push: Push, bladeMesh: (s: BladeSpec, m: number, seed: number, length?: number, cells?: number) => { mesh: MeshData }) {
  const open = smooth((pl.maturity - 0.55) / 0.35), D = lerp(spec.diameter.min, spec.diameter.max, 0.3 + 0.4 * pl.pick) * lerp(0.35, 1, open);
  const R = D / 2, { p: o, x, y, z } = pl, rng = seeded(seed + Math.floor(pl.pick * 1e6));
  const at = (lx: number, ly: number, lz: number): V3 => add(add(add(o, x, lx), y, ly), z, lz);
  const recSurf = p.surfaces[spec.receptacle], recRamp = colourRamp(recSurf.colour), discRamp = colourRamp(p.surfaces[spec.disc.surface].colour);
  push(`${pl.organ}|receptacle`, pl.organ, spec.receptacle, () => {
    const out = new MeshBuffer();
    const prof: [number, number][] = [[0, -0.32], [0.06, -0.31], [0.14, -0.27], [0.3, -0.16], [0.44, -0.07], [0.5, -0.01], [0.49, 0.015], [0.4, 0.03], [0.2, 0.045], [0, 0.05]];
    lathe(out, prof, Math.max(16, f.radial * 2), u => (u > 0.62 ? discRamp(0.55) : recRamp(u / 0.62)));
    // Lathe turns round +y; the head faces +z, so turn it.
    const m = out.build(), q = m.positions;
    for (let i = 0; i < q.length; i += 3) { const yy = q[i + 1]; q[i + 1] = -q[i + 2]; q[i + 2] = yy; }
    const n = m.normals;
    for (let i = 0; i < n.length; i += 3) { const yy = n[i + 1]; n[i + 1] = -n[i + 2]; n[i + 2] = yy; }
    return m;
  }, mat(o, x, y, z, D));
  // Disc florets: Vogel's model, inner ones still in bud.
  const N = Math.round(spec.disc.count * (D / ((spec.diameter.typical) || D)) ** 2 * f.florets * lerp(0.4, 1, open));
  const cell = R * Math.sqrt(Math.PI / Math.max(1, N)) * 0.5;
  for (let k = 0; k < N; k++) {
    const rel = Math.sqrt((k + 0.5) / N), th = k * spec.disc.divergence * DEG, r = R * 0.96 * rel;
    const lx = Math.cos(th) * r, ly = Math.sin(th) * r, lz = 0.045 * D * (1 - rel * rel) + 0.002;
    const out: V3 = normalize([Math.cos(th), Math.sin(th), 0]), tilt = rel * 14 * DEG;
    const fz = normalize(add(scale(z, Math.cos(tilt)), add(scale(x, out[0] * Math.sin(tilt)), scale(y, out[1] * Math.sin(tilt))))), fx = normalize(cross(y, fz)), fy = cross(fz, fx);
    const h = lerp(0.65, 1.25, smooth(rel * 1.4)) * (1 + 0.1 * (rng() - 0.5)), c = discRamp(rel), s = cell * (0.85 + 0.25 * open);
    push(`${pl.organ}|floret`, pl.organ, spec.disc.surface, floretTemplate, basisMatrix(at(lx, ly, lz), scale(fx, s), scale(fy, s), scale(fz, s * h)), c);
  }
  // Ray florets and bracts are blades.
  const ray: BladeSpec = { kind: "blade", surface: spec.rays.surface, length: { min: 1, typical: 1, max: 1, grade: "estimated" }, width: spec.rays.width, widestAt: 0.42, baseShape: 0.7, apexShape: 0.75, veins: { style: "parallel", laterals: 6, angle: 10, midrib: 0.02 }, fold: 8, droop: 1.2, droopPitch: 0, ruffle: 0.06, twist: 10 };
  const bract: BladeSpec = { kind: "blade", surface: spec.bracts.surface, length: { min: 1, typical: 1, max: 1, grade: "estimated" }, width: 0.55, widestAt: 0.3, baseShape: 0.6, apexShape: 1.5, veins: { style: "parallel", laterals: 5, angle: 10, midrib: 0.05 }, fold: -10, droop: 2, droopPitch: 0 };
  if (open > 0.05) {
    const rays = Math.round(lerp(spec.rays.count.min, spec.rays.count.max, pl.pick));
    for (let k = 0; k < rays; k++) {
      const th = k * GOLDEN_ANGLE * DEG, tier = k % 2, radial = add(scale(x, Math.cos(th)), scale(y, Math.sin(th)));
      // Folded forward over the disc in bud, then spread and a little reflexed when open.
      const e = lerp(70, -10 - 8 * tier - 10 * rng(), open) * DEG, ry = normalize(add(scale(radial, Math.cos(e)), scale(z, Math.sin(e))));
      const rx = normalize(cross(ry, z)), out: V3 = [Math.cos(th), Math.sin(th), 0];
      const len = D * spec.rays.length * (0.85 + 0.3 * rng()) * lerp(0.4, 1, open);
      push(`${pl.organ}|ray|${k % f.variants}`, pl.organ, spec.rays.surface, () => bladeMesh(ray, 1, tseed + 500 + k % f.variants, undefined, Math.max(3, Math.round(f.leafCells * 0.2))).mesh, basisMatrix(at(out[0] * R * 0.97, out[1] * R * 0.97, -0.01 * D * tier), scale(rx, len), scale(ry, len), scale(cross(rx, ry), len)));
    }
  }
  for (let k = 0; k < spec.bracts.count; k++) {
    const th = k * GOLDEN_ANGLE * DEG, rel = k / spec.bracts.count, out: V3 = [Math.cos(th), Math.sin(th), 0], back = lerp(lerp(20, 60, rel), lerp(75, 125, rel), open) * DEG;
    const by = normalize(add(add(scale(x, out[0] * Math.sin(back)), scale(y, out[1] * Math.sin(back))), scale(z, Math.cos(back))));
    const bz = normalize(add(scale(x, out[0]), scale(y, out[1]))), bx = normalize(cross(by, bz)), len = D * spec.bracts.length * lerp(1, 0.6, rel);
    const rr = R * lerp(0.98, 0.55, rel), zz = -D * lerp(0.03, 0.2, rel);
    push(`${pl.organ}|bract|${k % 2}`, pl.organ, spec.bracts.surface, () => bladeMesh(bract, 1, tseed + 900 + k % 2, undefined, Math.max(3, Math.round(f.leafCells * 0.15))).mesh, basisMatrix(at(out[0] * rr, out[1] * rr, zz), scale(bx, len), scale(by, len), scale(cross(bx, by), len)));
  }
}

/** One disc floret at unit radius: a ribbed tube with a five-lobed corolla and a domed tip, along +z. */
function floretTemplate(): MeshData {
  const out = new MeshBuffer(), white: V3 = [1, 1, 1];
  const prof: [number, number][] = [[0.95, 0], [1, 0.5], [0.92, 1.0], [0.75, 1.3], [0.42, 1.52], [0, 1.6]];
  lathe(out, prof, 10, (u, phi) => { const k = 0.82 + 0.18 * Math.cos(phi * 5) * smooth((u - 0.5) * 3); return [white[0] * k, white[1] * k * (u > 0.7 ? 0.92 : 1), white[2] * k * (u > 0.7 ? 0.85 : 1)]; });
  const m = out.build(), q = m.positions, n = m.normals;
  for (let i = 0; i < q.length; i += 3) { const yy = q[i + 1]; q[i + 1] = -q[i + 2]; q[i + 2] = yy; const ny = n[i + 1]; n[i + 1] = -n[i + 2]; n[i + 2] = ny; }
  return m;
}
