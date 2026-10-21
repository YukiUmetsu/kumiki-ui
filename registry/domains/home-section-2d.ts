/** Renderer-neutral 2D cross-section of a `HouseLayout` (transverse cut, gable profile).
 *
 * The cut plane is x = `cutX`, viewed toward +X: front (+Z) is on the right,
 * the far gable wall is drawn as an interior elevation, the near half is
 * removed. Every shape belongs to the same semantic part ID as the 3D build
 * (`wall.front.insulation`, `roof.shingles`, `opening.front-door.leaf`, …), so
 * 2D and 3D share callout anchors, SectionReveal targets and flow routes.
 *
 * Coordinates are SVG user units: 1 unit = 1 m, x = z − zMin, y = yMax − height
 * (y grows downward). Thin layers are drawn at least `minThickness` thick so
 * they stay legible (a stated illustration exaggeration, default 25 mm);
 * services (ducts, pipes, equipment) are projected “x-ray” onto the plane.
 */
import { createInspectableAsset } from "../visual/inspectable-asset";
import type { InspectableAsset } from "../visual/inspectable-asset";
import type { FlowPathSpec } from "../visual/flow-path";
import { houseFlowSpecs } from "./home-model";
import { PARTITION_THICKNESS } from "./home-interior-model";
import type { HouseFlow, HouseLayout, HouseMedium, ResolvedOpening, Vec3 } from "./home-model";

export type SectionMaterial =
  | "soil" | "lawn" | "gravel" | "concrete" | "cmu" | "brick" | "lumber" | "osb" | "insulation" | "blown" | "drywall"
  | "siding" | "trim" | "shingles" | "underlayment" | "metal" | "glass" | "door" | "interior" | "equipment" | "duct" | "pipe" | "copper" | "foam" | "paving"
  | "fabric" | "porcelain" | "appliance" | "furniture";
export type P2 = readonly [number, number];
export interface SectionShape {
  points: P2[];
  material: SectionMaterial;
  /** "cut" = sliced by the plane; "beyond" = seen past the plane; "service" = projected x-ray. */
  mode: "cut" | "beyond" | "service";
  /** Open polylines are stroked, not filled. */
  open?: boolean;
  strokeWidth?: number;
}
export interface SectionPartDrawing { id: string; label: string; role: string; shapes: SectionShape[] }
export interface HouseSectionOptions {
  /** Cut plane x (meters, default 0 = center). */
  cutX?: number;
  /** Minimum drawn layer thickness (default .025 m). */
  minThickness?: number;
}
export interface HouseSection {
  layout: HouseLayout;
  cutX: number;
  minThickness: number;
  /** SVG viewBox size in meters. */
  width: number;
  height: number;
  /** Paint order (back to front). */
  parts: SectionPartDrawing[];
  /** 3D world point → section SVG point. */
  project(p: Vec3): P2;
  anchors: Array<{ id: string; partId: string; kind: "label" | "focus" | "port"; position: P2; medium?: HouseMedium }>;
}

const rect = (x0: number, y0: number, x1: number, y1: number): P2[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

export function createHouseSection(layout: HouseLayout, options: HouseSectionOptions = {}): HouseSection {
  const { dims, palette } = layout; void palette;
  const W = dims.width / 2, D = dims.depth / 2, L = dims.layers, min = options.minThickness ?? .025;
  const cutX = options.cutX ?? 0;
  if (!Number.isFinite(cutX) || Math.abs(cutX) >= W) throw new Error(`Section cutX must lie inside the house (|x| < ${W}).`);
  const t = (v: number) => Math.max(v, min);
  const pitch = dims.pitch, cos = Math.cos(pitch), sin = Math.sin(pitch), rd = dims.rafterDepth;
  const tailLen = dims.eaveTail.z / cos, soffitY = dims.eaveTail.y - rd * cos;
  const site = layout.site;
  const zMin = site ? site.min[2] : -dims.eaveTail.z - .6, zMax = site ? site.max[2] : dims.eaveTail.z + .6;
  const yTop = Math.max(dims.ridgeY + .35, layout.chimney ? layout.chimney.top + .35 : 0), yBottom = site ? site.min[1] : dims.foundationBottom - .2;
  const S = (z: number, y: number): P2 => [z - zMin, yTop - y];
  const poly = (pts: Array<readonly [number, number]>) => pts.map(([z, y]) => S(z, y));
  const box = (z0: number, y0: number, z1: number, y1: number) => poly(rect(Math.min(z0, z1), Math.min(y0, y1), Math.max(z0, z1), Math.max(y0, y1)));
  const parts = new Map<string, SectionPartDrawing>();
  const order: string[] = [];
  const label = (id: string) => layout.parts.find(p => p.id === id)?.label ?? id;
  const role = (id: string) => layout.parts.find(p => p.id === id)?.role ?? "assembly";
  const add = (id: string, shape: SectionShape) => {
    if (!parts.has(id)) { parts.set(id, { id, label: label(id), role: role(id), shapes: [] }); order.push(id); }
    parts.get(id)!.shapes.push(shape);
  };
  const has = (id: string) => layout.parts.some(p => p.id === id);

  /* --------------------------------------------------- far gable wall (beyond) */
  const far = layout.facades.right;
  const inner = D - L.total;
  add("wall.right.drywall", { mode: "beyond", material: "interior", points: box(-inner, dims.floorY, inner, dims.eaveY) });
  add("wall.right.framing", { mode: "beyond", material: "lumber", points: poly([[-inner, dims.eaveY], [inner, dims.eaveY], [0, dims.eaveY + inner * dims.slope]]) });
  for (const o of far.openings) {
    // Right facade: u runs from +Z toward −Z.
    const z0 = D - o.u1, z1 = D - o.u0;
    add(o.id, { mode: "beyond", material: o.kind === "window" ? "glass" : "door", points: box(z0, o.v0, z1, o.v1) });
    add(o.id, { mode: "beyond", material: "trim", open: true, strokeWidth: .035, points: box(z0, o.v0, z1, o.v1).concat([box(z0, o.v0, z1, o.v1)[0]]) });
  }
  if (has("structure.ceiling")) {
    add("structure.ceiling", { mode: "beyond", material: "lumber", points: box(-D + .035, dims.eaveY, D - .035, dims.eaveY + .14) });
    add("structure.ceiling", { mode: "cut", material: "drywall", points: box(-inner, dims.eaveY - t(.013), inner, dims.eaveY) });
  }

  /* ------------------------------------------------------------------ floors */
  for (let s = 0; s < dims.storeys; s++) {
    const y = dims.floorY + s * dims.storeyHeight, id = `structure.floor-${s + 1}`;
    add(id, { mode: "cut", material: "lumber", points: box(-inner, y - t(.012), inner, y) });
    const framed = s > 0 || layout.spec.foundation !== "slab";
    if (framed) {
      const jd = s > 0 ? .235 : y - dims.foundationTop - .038 - .03;
      add(id, { mode: "cut", material: "osb", points: box(-D + .035, y - t(.012) - t(.018), D - .035, y - t(.012)) });
      add(id, { mode: "beyond", material: "lumber", points: box(-D + .07, y - .03 - jd, D - .07, y - .03) });
      if (s > 0) add(id, { mode: "cut", material: "drywall", points: box(-inner, y - .3 - t(.013), inner, y - .3) });
    }
  }

  /* ------------------------------------------- interior: partitions and furniture */
  if (layout.interior) {
    const plan = layout.interior, HALF = PARTITION_THICKNESS / 2;
    for (let s = 0; s < dims.storeys; s++) {
      const y0 = dims.floorY + s * dims.storeyHeight, y1 = y0 + dims.storeyHeight - .3;
      // Walls beyond the plane, farthest first, each drawn as an elevation with its doorways.
      const beyond = plan.partitions.filter(p => p.storey === s && p.axis === "z" && p.at > cutX).sort((a, b) => b.at - a.at);
      for (const p of beyond) {
        add(p.id, { mode: "beyond", material: "interior", points: box(p.from, y0, p.to, y1) });
        for (const d of p.doors) add(d.kind === "opening" ? p.id : `${d.id}.leaf`, { mode: "beyond", material: d.kind === "opening" ? "interior" : "trim", points: box(d.at - d.width / 2, y0, d.at + d.width / 2, y0 + d.height) });
      }
      // Furniture between the plane and the first wall behind it, as silhouettes (farther first).
      const wallBehind = (z: number) => Math.min(W, ...beyond.filter(p => z >= p.from && z <= p.to).map(p => p.at));
      const items = plan.furnishings.filter(f => f.storey === s && f.kind !== "rug").map(f => {
        const c = Math.abs(Math.cos(f.yaw)), sn = Math.abs(Math.sin(f.yaw));
        return { f, hx: (c * f.size[0] + sn * f.size[2]) / 2, hz: (sn * f.size[0] + c * f.size[2]) / 2 };
      }).filter(({ f, hx }) => f.position[0] + hx > cutX && f.position[0] - hx < wallBehind(f.position[2])).sort((a, b) => b.f.position[0] - a.f.position[0]);
      const MAT: Partial<Record<string, SectionMaterial>> = { sofa: "fabric", armchair: "fabric", bed: "fabric", chair: "fabric", "desk-chair": "fabric", stool: "furniture",
        bathtub: "porcelain", toilet: "porcelain", vanity: "furniture", "pedestal-sink": "porcelain", fridge: "appliance", range: "appliance", dishwasher: "appliance", washer: "appliance", dryer: "appliance",
        hood: "appliance", tv: "appliance", car: "appliance", "base-cabinets": "trim", "upper-cabinets": "trim", sink: "trim", island: "trim", fireplace: "brick", plant: "lawn", "floor-lamp": "metal", "table-lamp": "porcelain" };
      for (const { f, hz } of items) {
        const z = f.position[2], y = f.position[1], h = f.kind === "closet-rod" ? 2.1 : f.size[1];
        if (f.kind === "stair") {
          const n = Math.ceil(h / .19), run = (f.size[2] - .1) / (n - 1), z0 = z - f.size[2] / 2, pts: Array<[number, number]> = [[z0, y]];
          for (let i = 0; i < n; i++) pts.push([z0 + run * i, y + h * (i + 1) / n], [z0 + run * (i + 1), y + h * (i + 1) / n]);
          pts.push([z0 + run * n, y]);
          add(f.id, { mode: Math.abs(f.position[0] - cutX) < f.size[0] / 2 ? "cut" : "beyond", material: "lumber", points: poly(pts) });
          continue;
        }
        const r = Math.min(.06, h * .2, hz * .4);
        // Rounded silhouette: soft furniture reads as furniture, not boxes.
        const pts: Array<[number, number]> = [[z - hz, y], [z + hz, y], [z + hz, y + h - r], [z + hz - r * .3, y + h - r * .3], [z + hz - r, y + h], [z - hz + r, y + h], [z - hz + r * .3, y + h - r * .3], [z - hz, y + h - r]];
        add(f.id, { mode: "beyond", material: MAT[f.kind] ?? "furniture", points: poly(pts) });
      }
      // Walls along X that the plane slices: cut strips (with a header over any door).
      for (const p of plan.partitions) {
        if (p.storey !== s || p.axis !== "x" || cutX <= p.from || cutX >= p.to) continue;
        const door = p.doors.find(d => Math.abs(cutX - d.at) < d.width / 2);
        add(p.id, { mode: "cut", material: "drywall", points: box(p.at - HALF, door ? y0 + door.height : y0, p.at + HALF, y1) });
        if (!door) add(p.id, { mode: "cut", material: "lumber", points: box(p.at - HALF + .013, y0, p.at + HALF - .013, y0 + .038) });
      }
    }
  }

  /* ------------------------------------------------------------ attic insulation */
  if (has("attic.insulation")) {
    const pts: Array<[number, number]> = [];
    const z0 = -inner + .02, z1 = inner - .02, steps = 60;
    for (let i = 0; i <= steps; i++) {
      const z = z0 + (z1 - z0) * i / steps;
      const cap = dims.eaveY + (D - Math.abs(z)) * dims.slope - .07;
      const lump = Math.sin(z * 7.1) * .014 + Math.sin(z * 13.3 + 1) * .008;
      pts.push([z, Math.max(dims.eaveY + .02, Math.min(dims.eaveY + .3, cap) + lump)]);
    }
    add("attic.insulation", { mode: "cut", material: "blown", points: poly([[z0, dims.eaveY], ...pts, [z1, dims.eaveY]]) });
  }

  /* ---------------------------------------------------------- services (x-ray) */
  for (const r of layout.routes) {
    if (r.shape === "surface" || !has(r.partId)) continue;
    const material: SectionMaterial = r.partId.startsWith("hvac.lineset") ? "foam" : r.partId.startsWith("hvac") ? "duct" : "copper";
    const rad = Math.max(r.radius, .02), h = r.shape === "rect" ? rad * .62 : rad;
    for (let i = 1; i < r.points.length; i++) {
      const a = r.points[i - 1], b = r.points[i];
      const along = [0, 1, 2].find(k => Math.abs(a[k] - b[k]) > 1e-6)!;
      if (along === 0) {
        // Runs through the plane: draw its cross-section.
        if (r.shape === "rect") add(r.partId, { mode: "service", material, points: box(a[2] - rad, a[1] - h, a[2] + rad, a[1] + h) });
        else add(r.partId, { mode: "service", material, points: Array.from({ length: 16 }, (_, k) => { const q = k / 16 * Math.PI * 2; return S(a[2] + Math.cos(q) * rad, a[1] + Math.sin(q) * rad); }) });
      } else if (along === 2) add(r.partId, { mode: "service", material, points: box(a[2], a[1] - h, b[2], b[1] + h) });
      else add(r.partId, { mode: "service", material, points: box(a[2] - rad, a[1], a[2] + rad, b[1]) });
    }
  }
  if (layout.airHandler) {
    const a = layout.airHandler;
    add("hvac.air-handler", { mode: "service", material: "equipment", points: box(a.center[2] - a.size[2] / 2, a.center[1] - a.size[1] / 2, a.center[2] + a.size[2] / 2, a.center[1] + a.size[1] / 2) });
  }
  for (const reg of layout.registers) if (has("hvac.registers")) add("hvac.registers", { mode: "service", material: "trim", points: box(reg.position[2] - .16, reg.position[1] - .012, reg.position[2] + .16, reg.position[1] + .012) });
  if (layout.waterHeater) {
    const h = layout.waterHeater, zc = h.center[2], y0 = h.center[1] - h.height / 2, y1 = h.center[1] + h.height / 2;
    const dome = Array.from({ length: 9 }, (_, k) => { const q = Math.PI * k / 8; return [zc + Math.cos(q) * h.radius, y1 - .05 + Math.sin(q) * .07] as [number, number]; });
    add("plumbing.water-heater", { mode: "service", material: "equipment", points: poly([[zc - h.radius, y0], [zc + h.radius, y0], ...dome]) });
  }

  /* ------------------------------------------------------------ walls (cut) */
  const sidingStart = layout.spec.foundation === "crawlspace" ? dims.foundationTop - .05 : layout.spec.foundation === "basement" ? dims.foundationTop - .06 : dims.floorY - .07;
  for (const facade of ["front", "back"] as const) {
    const f = layout.facades[facade], sz = facade === "front" ? 1 : -1;
    // Layer stack from the exterior face inward, each at least `min` thick.
    const stack = [["siding", "siding", L.siding], ["sheathing", "osb", L.sheathing], ["insulation", "insulation", L.studs], ["drywall", "drywall", L.drywall]] as const;
    let w = 0;
    const bands: Record<string, [number, number]> = {};
    for (const [name, , thick] of stack) { const d = t(thick); bands[name] = [w, w + d]; w += d; }
    const zOf = (depth: number) => sz * (D - depth);
    const cutOpenings = f.openings.filter(o => { const x0 = f.frame.origin[0] + f.frame.uAxis[0] * o.u0, x1 = f.frame.origin[0] + f.frame.uAxis[0] * o.u1; return cutX > Math.min(x0, x1) && cutX < Math.max(x0, x1); });
    const spans = (y0: number, y1: number): Array<[number, number]> => {
      let out: Array<[number, number]> = [[y0, y1]];
      for (const o of cutOpenings) out = out.flatMap(([a, b]) => o.v1 <= a || o.v0 >= b ? [[a, b] as [number, number]] : [[a, o.v0], [o.v1, b]].filter(([p, q]) => q - p > .005) as Array<[number, number]>);
      return out;
    };
    const top = { siding: soffitY - .14, sheathing: dims.eaveY, insulation: dims.eaveY - .076, drywall: dims.eaveY - .013 } as const;
    const bottom = { siding: sidingStart, sheathing: sidingStart + .02, insulation: dims.floorY + .038, drywall: dims.floorY } as const;
    for (const [name, material] of stack) {
      const [d0, d1] = bands[name];
      for (const [a, b] of spans(bottom[name], top[name])) add(`wall.${facade}.${name}`, { mode: "cut", material, points: box(zOf(d0), a, zOf(d1), b) });
    }
    // Framing: plates, rim joists, headers and sills where the cut crosses an opening.
    const [s0, s1] = bands.insulation;
    for (let s = 0; s < dims.storeys; s++) {
      const vb = dims.floorY + s * dims.storeyHeight, vt = vb + dims.storeyHeight - .3;
      add(`wall.${facade}.framing`, { mode: "cut", material: "lumber", points: box(zOf(s0), vb, zOf(s1), vb + .038) });
      add(`wall.${facade}.framing`, { mode: "cut", material: "lumber", points: box(zOf(s0), vt - .076, zOf(s1), vt) });
      if (s < dims.storeys - 1) add(`wall.${facade}.framing`, { mode: "cut", material: "lumber", points: box(zOf(s0), vt, zOf(s0 + .038 + .02), vt + .235) });
    }
    for (const o of cutOpenings) drawOpening(o, zOf, bands, sz);
    // Soffit and frieze at this eave.
    if (has("roof.trim")) {
      add("roof.trim", { mode: "cut", material: "trim", points: box(sz * D, soffitY - t(.012), sz * dims.eaveTail.z, soffitY) });
      add("trim", { mode: "cut", material: "trim", points: box(sz * D, soffitY - .14, sz * (D + t(.024)), soffitY) });
    }
  }
  function drawOpening(o: ResolvedOpening, zOf: (d: number) => number, bands: Record<string, [number, number]>, sz: number) {
    const [s0, s1] = bands.insulation, wallIn = bands.drywall[1];
    add(`wall.${o.facade}.framing`, { mode: "cut", material: "lumber", points: box(zOf(s0), o.v1, zOf(s1), o.v1 + .235) });
    if (o.kind === "window") {
      add(`wall.${o.facade}.framing`, { mode: "cut", material: "lumber", points: box(zOf(s0), o.v0 - .038, zOf(s1), o.v0) });
      add(o.id, { mode: "cut", material: "trim", points: box(zOf(-.012), o.v0 - .02, zOf(wallIn - .005), o.v0 + .04) });
      add(o.id, { mode: "cut", material: "trim", points: box(zOf(-.012), o.v1 - .03, zOf(wallIn - .005), o.v1) });
      add(o.id, { mode: "cut", material: "trim", points: box(zOf(-.035), o.v0 - .055, zOf(.02), o.v0 - .015) }); // sill nose
      const moving = `${o.id}.${o.style === "double-hung" ? "sash" : "glass"}`;
      const meet = (o.v0 + o.v1) / 2;
      add(o.id, { mode: "cut", material: "glass", points: box(zOf(.04), meet - .02, zOf(.05), o.v1 - .04) });
      add(moving, { mode: "cut", material: "glass", points: box(zOf(.088), o.v0 + .05, zOf(.098), meet + .02) });
      add(moving, { mode: "cut", material: "trim", points: box(zOf(.075), o.v0 + .04, zOf(.111), o.v0 + .1) });
    } else {
      add(o.id, { mode: "cut", material: "metal", points: box(zOf(-.02), o.v0, zOf(wallIn), o.v0 + .02) });
      add(`${o.id}.${o.kind === "door" ? "leaf" : "panels"}`, { mode: "cut", material: o.kind === "door" ? "door" : "trim", points: box(zOf(.053), o.v0 + .02, zOf(.097), o.v1 - .035) });
    }
    void sz;
  }

  /* ------------------------------------------------------------------- roof */
  // Roof frames in (z, y): front side s = +1 rises toward the ridge at z = 0.
  const rf = (s: 1 | -1, along: number, n: number): [number, number] => [s * (sin * n + cos * along), dims.ridgeY + cos * n - sin * along];
  const band = (s: 1 | -1, a0: number, a1: number, n0: number, n1: number) => poly([rf(s, a0, n0), rf(s, a1, n0), rf(s, a1, n1), rf(s, a0, n1)]);
  const deck = t(.016), under = Math.max(.003, min * .4), shingle = t(.014);
  for (const s of [1, -1] as const) {
    add("roof.framing", { mode: "beyond", material: "lumber", points: band(s, .02, tailLen, -rd, 0) });
    add("roof.decking", { mode: "cut", material: "osb", points: band(s, .03, tailLen, 0, deck) });
    add("roof.underlayment", { mode: "cut", material: "underlayment", points: band(s, .03, tailLen, deck, deck + under) });
    // Shingles: a stepped band, one tooth per course.
    const n0 = deck + under, e = .14, pts: Array<[number, number]> = [rf(s, .03, n0)];
    for (let b = tailLen + .012 - Math.floor((tailLen - .1) / e) * e; b <= tailLen + .013; b += e) { pts.push(rf(s, b - e * .02, n0 + shingle * .55), rf(s, b, n0 + shingle)); }
    pts.push(rf(s, tailLen + .012, n0));
    add("roof.shingles", { mode: "cut", material: "shingles", points: poly(pts) });
    if (has("roof.ridge-cap")) add("roof.ridge-cap", { mode: "cut", material: "shingles", points: band(s, 0, .17, n0 + shingle, n0 + shingle * 1.8) });
    const [zt] = rf(s, tailLen, 0);
    if (has("roof.trim")) add("roof.trim", { mode: "cut", material: "trim", points: box(zt, soffitY - .03, zt + s * t(.025), dims.eaveTail.y + .016 * cos) });
    if (has("roof.gutters")) {
      const g = layout.gutter, back = zt + s * t(.025);
      const prof: Array<[number, number]> = [[0, 0], [-.105, 0], [-.115, .012], [-.115, .085], [-.098, .105], [-.07, .11], [-.06, g.width - .002], [-.036, g.width], [-.012, g.width - .004], [0, g.width]];
      add("roof.gutters", { mode: "cut", material: "metal", points: poly(prof.map(([dy, dz]) => [back + s * dz, g.top + dy] as [number, number])) });
    }
  }
  add("roof.framing", { mode: "cut", material: "lumber", points: box(-.019, dims.ridgeY - .3, .019, dims.ridgeY - .02) });
  {
    const y = dims.eaveY + (dims.ridgeY - dims.eaveY) * .66, z = (dims.ridgeY - dims.heel - y) / dims.slope;
    add("roof.framing", { mode: "beyond", material: "lumber", points: box(-z, y - .07, z, y + .07) });
  }

  /* --------------------------------------------------------- chimney */
  if (layout.chimney && has("chimney")) {
    const c = layout.chimney, cutThrough = Math.abs(cutX - c.x) < c.w / 2;
    if (cutThrough || c.x > cutX) {
      const mode = cutThrough ? "cut" : "beyond";
      add("chimney", { mode, material: "brick", points: box(c.z - c.d / 2, dims.floorY, c.z + c.d / 2, c.top) });
      add("chimney", { mode, material: "concrete", points: box(c.z - c.d / 2 - .06, c.top, c.z + c.d / 2 + .06, c.top + .09) });
    }
  }

  /* --------------------------------------------------- site and foundation */
  const fb = dims.foundationBottom, kind = layout.spec.foundation ?? "slab";
  if (site && has("site.ground")) {
    const under = kind === "crawlspace" ? -.01 : kind === "slab" ? dims.floorY - .22 : (dims.basementFloorY ?? 0) - .1;
    add("site.ground", { mode: "cut", material: "soil", points: box(zMin, yBottom, -D, 0) });
    add("site.ground", { mode: "cut", material: "soil", points: box(D, yBottom, zMax, 0) });
    add("site.ground", { mode: "cut", material: "soil", points: box(-D, yBottom, D, under) });
    add("site.ground", { mode: "cut", material: "lawn", points: box(zMin, -.05, -D - (kind === "basement" ? 0 : 0), 0) });
    add("site.ground", { mode: "cut", material: "lawn", points: box(D, -.05, zMax, 0) });
    const walk = layout.parts.find(p => p.id === "site.walkway");
    if (walk && cutX > walk.bounds.min[0] && cutX < walk.bounds.max[0]) add("site.walkway", { mode: "cut", material: "paving", points: box(D + .05, -.05, zMax, .03) });
    const drive = layout.parts.find(p => p.id === "site.driveway");
    if (drive && cutX > drive.bounds.min[0] && cutX < drive.bounds.max[0])
      add("site.driveway", { mode: "cut", material: "paving", points: poly([[D, -.12], [D, dims.floorY - .012], [D + .5, dims.floorY - .012], [D + 2.6, .03], [zMax, .03], [zMax, -.12]]) });
    if (has("site.steps")) for (const o of layout.openings) {
      if (o.kind !== "door" || (o.facade !== "front" && o.facade !== "back")) continue;
      const f = layout.facades[o.facade], x0 = f.frame.origin[0] + f.frame.uAxis[0] * o.u0, x1 = f.frame.origin[0] + f.frame.uAxis[0] * o.u1;
      if (!(cutX > Math.min(x0, x1) - .35 && cutX < Math.max(x0, x1) + .35)) continue;
      const sz = o.facade === "front" ? 1 : -1, n = Math.max(1, Math.round((dims.floorY - .02) / .18)), rise = (dims.floorY - .02) / n;
      const pts: Array<[number, number]> = [[sz * D, 0], [sz * (D + .3 * n + .01), 0]];
      for (let i = 0; i < n; i++) { const run = sz * (D + .3 * (n - i) + .01); pts.push([run, rise * (i + 1)], [sz * (D + .3 * (n - i - 1) + .01), rise * (i + 1)]); }
      pts.push([sz * D, dims.floorY - .02]);
      add("site.steps", { mode: "cut", material: "paving", points: poly(pts) });
    }
  }
  for (const sz of [1, -1]) {
    if (kind === "slab") add("foundation.footing", { mode: "cut", material: "concrete", points: box(sz * (D - .38), fb, sz * (D - .02), dims.floorY - .1) });
    else {
      add("foundation.footing", { mode: "cut", material: "concrete", points: box(sz * (D - .32), fb, sz * (D + .12), fb + .25) });
      add("foundation.wall", { mode: "cut", material: kind === "crawlspace" ? "cmu" : "concrete", points: box(sz * (D - .22), fb + .25, sz * (D - .02), dims.foundationTop) });
      add("foundation.wall", { mode: "cut", material: "lumber", points: box(sz * (D - .16), dims.foundationTop, sz * (D - .02), dims.foundationTop + .038) });
    }
  }
  if (kind === "slab") {
    add("foundation.slab", { mode: "cut", material: "concrete", points: box(-D + .02, dims.floorY - .1, D - .02, dims.floorY - .012) });
    add("foundation.slab", { mode: "cut", material: "gravel", points: box(-D + .38, dims.floorY - .22, D - .38, dims.floorY - .1) });
  }
  if (kind === "basement") add("foundation.basement-floor", { mode: "cut", material: "concrete", points: box(-D + .22, dims.basementFloorY! - .1, D - .22, dims.basementFloorY!) });

  /* ---------------------------------------------------- outdoor equipment */
  // Outdoor units only read in a transverse section when they stand beyond the front or back wall.
  if (layout.condenser && has("hvac.condenser") && Math.abs(layout.condenser.center[2]) > D) {
    const c = layout.condenser;
    add("hvac.condenser", { mode: "service", material: "equipment", points: box(c.center[2] - c.size[2] / 2, .1, c.center[2] + c.size[2] / 2, .1 + c.size[1]) });
    add("hvac.condenser", { mode: "service", material: "paving", points: box(c.center[2] - c.size[2] / 2 - .09, .02, c.center[2] + c.size[2] / 2 + .09, .1) });
  }
  if (has("roof.gutters")) for (const d of layout.downspouts) {
    // Only the downspouts on the far (+X) half are in view.
    if (d.points[0][0] < cutX) continue;
    for (let i = 1; i < d.points.length; i++) {
      const a = d.points[i - 1], b = d.points[i];
      add("roof.gutters", { mode: "beyond", material: "metal", open: true, strokeWidth: .075, points: [S(a[2], a[1]), S(b[2], b[1])] });
    }
  }

  const project = (p: Vec3): P2 => S(p[2], p[1]);
  const anchors = layout.anchors.map(a => ({ id: a.id, partId: a.partId, kind: a.kind, medium: a.medium, position: project(a.position) }));
  return { layout, cutX, minThickness: min, width: zMax - zMin, height: yTop - yBottom, parts: order.map(id => parts.get(id)!), project, anchors };
}

/** 2D InspectableAsset with the same part IDs as the 3D build (bounds from the drawn shapes). */
export function inspectHouseSection(section: HouseSection): InspectableAsset {
  const drawn = new Map(section.parts.map(p => [p.id, p]));
  const layoutParts = section.layout.parts;
  // Keep the semantic tree: include ancestors of every drawn part.
  const keep = new Set<string>();
  for (const id of drawn.keys()) for (let p: string | undefined = id; p; p = layoutParts.find(x => x.id === p)?.parentId) keep.add(p);
  const parts = layoutParts.filter(p => keep.has(p.id)).map(p => ({ id: p.id, parentId: p.parentId, label: p.label, role: p.role, hideable: p.hideable, ghostable: p.hideable }));
  const children = new Map<string, string[]>();
  for (const p of layoutParts) if (p.parentId) children.set(p.parentId, [...(children.get(p.parentId) ?? []), p.id]);
  const subtree = (id: string): string[] => [id, ...(children.get(id) ?? []).flatMap(subtree)];
  const subtreeShapes = (id: string): P2[] => subtree(id).flatMap(k => drawn.get(k)?.shapes.flatMap(s => s.points) ?? []);
  const bounds = (id: string) => {
    const pts = subtreeShapes(id);
    if (!pts.length) return { min: [0, 0], max: [0, 0] };
    return { min: [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1]))], max: [Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))] };
  };
  const anchors = section.anchors.filter(a => keep.has(a.partId));
  const byAnchor = new Map(anchors.map(a => [a.id, a]));
  return createInspectableAsset({
    id: `${section.layout.id}-section`, dimension: 2, parts,
    anchors: anchors.map(a => ({ id: a.id, partId: a.partId, kind: a.kind, medium: a.medium })),
    capabilities: { sectioning: "isolate-ghost", explodable: false, canGhost: true, flowPorts: anchors.some(a => a.kind === "port"), stateful: false },
    revision: `${section.layout.id}:section:${section.cutX}`,
  }, { bounds, anchor: id => ({ position: byAnchor.get(id)!.position }) });
}

/** The layout's flows projected onto the section (2D points in section units). */
export function houseSectionFlows(section: HouseSection, options: Parameters<typeof houseFlowSpecs>[1] = {}): HouseFlow[] {
  return houseFlowSpecs(section.layout, options).map(flow => {
    const pts = (flow.spec.path as readonly (readonly number[])[]).map(p => section.project(p as unknown as Vec3));
    const dedup = pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 1e-4);
    const spec: FlowPathSpec = { ...flow.spec, path: dedup.map(p => [p[0], p[1]]) };
    return { ...flow, spec };
  }).filter(f => (f.spec.path as unknown[]).length >= 2);
}
