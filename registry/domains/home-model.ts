/** Renderer-neutral home model: one validated layout feeds 2D and 3D builders.
 *
 * A `HouseSpec` describes a detached house in physical terms (meters): its
 * footprint, storeys, roof pitch, foundation, openings per facade and building
 * systems. `resolveHouseLayout` turns it into plain numbers — wall frames,
 * opening rectangles, the roof plane, a semantic part tree with world bounds,
 * named anchors/ports and orthogonal service routes (ducts, pipes, line sets,
 * rain drainage). The 3D builder and the 2D section draw the same layout, so
 * semantic part IDs, bounds, anchors and flow paths agree across renderers.
 *
 * World frame: meters, ground (finished grade) at y = 0, +Y up, the front
 * facade faces +Z, the ridge runs along X, left = −X and right = +X.
 *
 * Illustrative construction only: dimensions follow common light-frame
 * practice, but nothing here is a structural, energy or code-compliance claim.
 */

import { createInspectableAsset } from "../visual/inspectable-asset";
import type { InspectableAsset } from "../visual/inspectable-asset";

export type HouseFacade = "front" | "back" | "left" | "right";
export const HOUSE_FACADES: readonly HouseFacade[] = ["front", "right", "back", "left"];
export type HouseFoundation = "slab" | "crawlspace" | "basement";
export type HouseOpeningKind = "window" | "door" | "garage-door";
export type HouseWindowStyle = "double-hung" | "picture";
export type HouseCondition = "new" | "aged" | "damaged";
export type ShingleStyle = "three-tab" | "architectural";
export type WallFraming = "2x4" | "2x6";
export type AirHandlerLocation = "attic" | "basement" | "closet";

export interface HouseOpening {
  /** Stable suffix; defaults to `<facade>-<n>` in authored order. */
  id?: string;
  kind: HouseOpeningKind;
  /** 0 = ground storey. */
  storey?: number;
  /** Center along the facade, meters from its left edge as seen from outside. */
  center: number;
  width: number;
  height: number;
  /** Sill height above the storey floor; doors are always 0. */
  sill?: number;
  style?: HouseWindowStyle;
  /** Colonial grid on double-hung sashes. */
  muntins?: boolean;
}

export interface HousePalette {
  siding: string; trim: string; door: string; shingles: string; foundation: string;
  brick: string; shutters: string; ground: string;
}
export const HOUSE_PALETTES = {
  harbor: { siding: "#8fa3ad", trim: "#f2efe8", door: "#7a2f2b", shingles: "#4a4d52", foundation: "#a19d95", brick: "#9c5a43", shutters: "#2f3d47", ground: "#5d7a45" },
  sandstone: { siding: "#d8ccb4", trim: "#fbf8f1", door: "#2f4a3a", shingles: "#5a4b40", foundation: "#b0a796", brick: "#a8674d", shutters: "#4b3a2f", ground: "#6b8048" },
  slate: { siding: "#3f4a54", trim: "#e9ecee", door: "#c79a3a", shingles: "#2b2e33", foundation: "#8e8c88", brick: "#7d4b3c", shutters: "#1d242a", ground: "#55703f" },
  meadow: { siding: "#e8e2d2", trim: "#ffffff", door: "#2c4f7c", shingles: "#6a6f73", foundation: "#a7a39b", brick: "#9a5b44", shutters: "#3d5a3f", ground: "#62803f" },
} as const satisfies Record<string, HousePalette>;
export type HousePaletteName = keyof typeof HOUSE_PALETTES;

export interface HouseSystems {
  /** Outdoor condensing unit beside a facade (center along it), or none. */
  condenser?: { facade: HouseFacade; center: number } | false;
  airHandler?: AirHandlerLocation | false;
  waterHeater?: boolean;
  electricalPanel?: boolean;
  /** Photovoltaic array on the front roof plane. */
  solar?: { rows: number; columns: number } | false;
}

export interface HouseSpec {
  id?: string;
  /** Exterior width along X (front facade length), meters. */
  width: number;
  /** Exterior depth along Z, meters. */
  depth: number;
  storeys: 1 | 2;
  /** Floor-to-floor height, meters (default 2.75). */
  storeyHeight?: number;
  /** Degrees; 18–45 (default 30). */
  roofPitch?: number;
  /** Horizontal eave overhang beyond the wall (default 0.45). */
  eaveOverhang?: number;
  /** Rake overhang beyond the gable walls (default 0.3). */
  rakeOverhang?: number;
  foundation?: HouseFoundation;
  /** Floor level above grade (default: slab .25, crawlspace .7, basement .5). */
  floorHeight?: number;
  framing?: WallFraming;
  shingles?: ShingleStyle;
  condition?: HouseCondition;
  openings?: Partial<Record<HouseFacade, readonly HouseOpening[]>>;
  /** Masonry chimney centered at this X; omit or false for none. */
  chimney?: { x: number } | false;
  systems?: HouseSystems;
  /** Ground plot around the house with a soil cross-section. */
  site?: boolean;
  palette?: HousePaletteName | Partial<HousePalette>;
}

/* ----------------------------------------------------------------- presets */

const win = (center: number, storey = 0, extra: Partial<HouseOpening> = {}): HouseOpening =>
  ({ kind: "window", center, storey, width: .9, height: 1.35, sill: .85, style: "double-hung", muntins: true, ...extra });
const door = (center: number, extra: Partial<HouseOpening> = {}): HouseOpening =>
  ({ kind: "door", center, width: .95, height: 2.1, ...extra });

/** Anonymous, reusable starting points; spread and override any field. */
export const HOUSE_PRESETS = {
  cottage: {
    id: "cottage", width: 9.6, depth: 7.4, storeys: 1, roofPitch: 34, foundation: "crawlspace",
    openings: {
      front: [win(1.9), door(4.8, { id: "front-door" }), win(7.7)],
      right: [win(3.7)],
      back: [win(2.4, 0, { width: 1.2 }), door(5.6, { id: "back-door" }), win(8.0)],
      left: [win(2.1), win(5.3)],
    },
    chimney: { x: -2.6 },
    systems: { condenser: { facade: "right", center: 5.4 }, airHandler: "attic", waterHeater: true, electricalPanel: true, solar: false },
    site: true, palette: "harbor",
  },
  "two-storey": {
    id: "two-storey", width: 10.4, depth: 8, storeys: 2, roofPitch: 32, foundation: "basement",
    openings: {
      front: [win(1.8), door(5.2, { id: "front-door" }), win(8.6), win(1.8, 1), win(5.2, 1), win(8.6, 1)],
      right: [win(4, 0), win(4, 1)],
      back: [win(2.2, 0, { width: 1.6, height: 1.4, sill: .75, style: "picture", muntins: false }), door(5.6, { id: "back-door" }), win(8.4), win(2.6, 1), win(7.8, 1)],
      left: [win(2.4), win(5.6), win(4, 1)],
    },
    chimney: false,
    systems: { condenser: { facade: "left", center: 2.2 }, airHandler: "basement", waterHeater: true, electricalPanel: true, solar: { rows: 2, columns: 5 } },
    site: true, palette: "sandstone",
  },
  ranch: {
    id: "ranch", width: 15, depth: 8.6, storeys: 1, roofPitch: 24, eaveOverhang: .6, foundation: "slab",
    shingles: "architectural",
    openings: {
      front: [{ kind: "garage-door", center: 2.9, width: 4.8, height: 2.15 }, door(7.4, { id: "front-door" }),
        win(9.7, 0, { width: 1.8, height: 1.4, sill: .8, style: "picture", muntins: false }), win(12.9)],
      right: [win(2.6), win(6)],
      back: [win(3.4), door(7.8, { id: "back-door" }), win(10.6, 0, { width: 1.6, style: "picture", muntins: false }), win(13.2)],
      left: [win(4.3)],
    },
    chimney: false,
    systems: { condenser: { facade: "back", center: 11.8 }, airHandler: "attic", waterHeater: true, electricalPanel: true, solar: false },
    site: true, palette: "slate",
  },
} as const satisfies Record<string, HouseSpec>;
export type HousePresetName = keyof typeof HOUSE_PRESETS;

/* ------------------------------------------------------------------ layout */

export type Vec3 = readonly [number, number, number];
export interface Box3Bounds { min: Vec3; max: Vec3 }

/** Orthonormal facade frame: world = origin + u·uAxis + v·up + w·normal. */
export interface FacadeFrame { origin: Vec3; uAxis: Vec3; normal: Vec3 }

export interface ResolvedOpening {
  /** Semantic part ID, e.g. `opening.front-2`. */
  id: string;
  facade: HouseFacade;
  kind: HouseOpeningKind;
  style: HouseWindowStyle;
  muntins: boolean;
  storey: number;
  /** Left/right/bottom/top in facade coordinates (u along, v above grade). */
  u0: number; u1: number; v0: number; v1: number;
}

export interface FacadeLayout {
  facade: HouseFacade;
  frame: FacadeFrame;
  length: number;
  /** Wall height above grade at the eave line (top of the wall frame). */
  eaveV: number;
  /** Gable peak above the eave (0 for eave walls). */
  gableRise: number;
  /** Bottom of the wall (floor level). */
  baseV: number;
  openings: readonly ResolvedOpening[];
}

/** Wall build-up, exterior to interior (meters). */
export interface WallLayers { siding: number; sheathing: number; studs: number; drywall: number; total: number }

export type HouseSemanticRole = "assembly" | "layer" | "framing" | "opening" | "moving" | "equipment" | "service" | "site" | "finish";

export interface HousePart {
  id: string;
  parentId?: string;
  label: string;
  role: HouseSemanticRole;
  /** Approximate authored world bounds at rest. */
  bounds: Box3Bounds;
  /** Safe to hide/ghost without exposing missing geometry. */
  hideable: boolean;
  /** Has real interior/thickness so a clipping plane reveals construction. */
  clippable: boolean;
}

export type HouseAnchorKind = "label" | "focus" | "port";
export type HouseMedium = "supply-air" | "return-air" | "refrigerant" | "cold-water" | "hot-water" | "rain" | "electric" | "heat";

export interface HouseAnchor {
  id: string;
  partId: string;
  kind: HouseAnchorKind;
  position: Vec3;
  /** Outward direction for leaders/ports. */
  normal: Vec3;
  medium?: HouseMedium;
}

/** Orthogonal polyline route used both to build ducts/pipes and to animate flow. */
export interface HouseRoute {
  id: string;
  medium: HouseMedium;
  /** Part that physically carries this route (duct, pipe, roof…). */
  partId: string;
  points: readonly Vec3[];
  /** Duct/pipe outer radius (or half width for rectangular trunks). */
  radius: number;
  shape: "round" | "rect" | "surface";
  /** Anchors at either end, when they exist. */
  from?: string;
  to?: string;
}

export interface HouseDims {
  width: number; depth: number; storeys: number; storeyHeight: number;
  /** Finished floor of the ground storey above grade. */
  floorY: number;
  /** Top of the wall frame at the eaves. */
  eaveY: number;
  pitch: number; slope: number;
  eaveOverhang: number; rakeOverhang: number;
  rafterDepth: number; rafterWidth: number; heel: number;
  /** Top of rafters at the ridge (z = 0). */
  ridgeY: number;
  /** Top of rafters as a function of z: ridgeY − |z|·slope. */
  roofTopAt(z: number): number;
  /** Eave tail position (z, y at rafter top) on the front side. */
  eaveTail: { z: number; y: number };
  layers: WallLayers;
  footingDepth: number;
  /** Top of slab / bottom of the floor system. */
  foundationTop: number;
  /** Lowest structural point (footing bottom). */
  foundationBottom: number;
  basementFloorY?: number;
}

export interface HouseLayout {
  id: string;
  spec: Readonly<HouseSpec>;
  palette: HousePalette;
  dims: HouseDims;
  facades: Readonly<Record<HouseFacade, FacadeLayout>>;
  openings: readonly ResolvedOpening[];
  parts: readonly HousePart[];
  anchors: readonly HouseAnchor[];
  routes: readonly HouseRoute[];
  /** Chimney footprint, if any. */
  chimney?: { x: number; z: number; w: number; d: number; top: number };
  condenser?: { facade: HouseFacade; center: Vec3; size: Vec3 };
  airHandler?: { location: AirHandlerLocation; center: Vec3; size: Vec3 };
  waterHeater?: { center: Vec3; radius: number; height: number };
  /** Supply registers (ceiling or floor) served by the air handler. */
  registers: readonly { id: string; position: Vec3; facing: "down" | "up" }[];
  /** K-style gutter on both eaves: top edge height and outer face |z|. */
  gutter: { top: number; front: number; width: number };
  /** Downspout centerlines from each gutter outlet to the splash block. */
  downspouts: readonly { id: string; points: readonly Vec3[] }[];
  solar?: { rows: number; columns: number; panel: { w: number; h: number }; origin: { x: number; s: number } };
  site?: Box3Bounds;
  /** Whole-house world bounds including roof overhang, chimney and equipment (no site). */
  bounds: Box3Bounds;
}

const PANEL_W = 1.04, PANEL_H = 1.75;
const finite = (...values: number[]) => values.every(Number.isFinite);
const round = (value: number) => Math.round(value * 1e6) / 1e6;
const v3 = (x: number, y: number, z: number): Vec3 => [round(x), round(y), round(z)];

function facadeFrame(facade: HouseFacade, width: number, depth: number): FacadeFrame {
  const w = width / 2, d = depth / 2;
  switch (facade) {
    case "front": return { origin: [-w, 0, d], uAxis: [1, 0, 0], normal: [0, 0, 1] };
    case "back": return { origin: [w, 0, -d], uAxis: [-1, 0, 0], normal: [0, 0, -1] };
    case "right": return { origin: [w, 0, d], uAxis: [0, 0, -1], normal: [1, 0, 0] };
    case "left": return { origin: [-w, 0, -d], uAxis: [0, 0, 1], normal: [-1, 0, 0] };
  }
}
/** Facade (u, v, w-outward) → world. */
export function facadePoint(frame: FacadeFrame, u: number, v: number, w = 0): Vec3 {
  const { origin: o, uAxis: a, normal: n } = frame;
  return v3(o[0] + a[0] * u + n[0] * w, o[1] + v, o[2] + a[2] * u + n[2] * w);
}
function boundsOf(points: readonly Vec3[], pad = 0): Box3Bounds {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const p of points) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], p[i]); max[i] = Math.max(max[i], p[i]); }
  return { min: v3(min[0] - pad, min[1] - pad, min[2] - pad), max: v3(max[0] + pad, max[1] + pad, max[2] + pad) };
}
function unionBounds(list: readonly Box3Bounds[]): Box3Bounds {
  return boundsOf(list.flatMap(b => [b.min, b.max]));
}
const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Box3Bounds =>
  ({ min: v3(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)), max: v3(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)) });

function resolvePalette(palette: HouseSpec["palette"]): HousePalette {
  if (palette === undefined) return HOUSE_PALETTES.harbor;
  if (typeof palette === "string") {
    const named = HOUSE_PALETTES[palette];
    if (!named) throw new Error(`Unknown house palette "${palette}". Use one of: ${Object.keys(HOUSE_PALETTES).join(", ")}.`);
    return named;
  }
  const merged = { ...HOUSE_PALETTES.harbor, ...palette };
  for (const [role, value] of Object.entries(merged))
    if (!/^#[0-9a-fA-F]{6}$/.test(value)) throw new Error(`House palette "${role}" must be a six-digit hex color.`);
  return merged;
}

/** Validate a spec and derive every renderer-neutral number the builders need. Throws actionable errors. */
export function resolveHouseLayout(spec: HouseSpec): HouseLayout {
  const id = spec.id ?? "house";
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) throw new Error(`House id "${id}" must be lowercase kebab-case (1–64 chars).`);
  const width = spec.width, depth = spec.depth, storeys = spec.storeys;
  if (!finite(width, depth) || width < 5 || width > 30 || depth < 5 || depth > 20)
    throw new Error("House width must be 5–30 m and depth 5–20 m.");
  if (storeys !== 1 && storeys !== 2) throw new Error("House storeys must be 1 or 2.");
  const storeyHeight = spec.storeyHeight ?? 2.75;
  if (!finite(storeyHeight) || storeyHeight < 2.4 || storeyHeight > 3.6) throw new Error("storeyHeight must be 2.4–3.6 m.");
  const pitchDeg = spec.roofPitch ?? 30;
  if (!finite(pitchDeg) || pitchDeg < 18 || pitchDeg > 45) throw new Error("roofPitch must be 18–45 degrees.");
  const eaveOverhang = spec.eaveOverhang ?? .45, rakeOverhang = spec.rakeOverhang ?? .3;
  if (!finite(eaveOverhang, rakeOverhang) || eaveOverhang < .1 || eaveOverhang > 1 || rakeOverhang < .1 || rakeOverhang > .8)
    throw new Error("eaveOverhang must be 0.1–1 m and rakeOverhang 0.1–0.8 m.");
  const foundation = spec.foundation ?? "slab";
  if (!["slab", "crawlspace", "basement"].includes(foundation)) throw new Error(`Unsupported foundation "${foundation}".`);
  const floorY = spec.floorHeight ?? (foundation === "slab" ? .25 : foundation === "crawlspace" ? .7 : .5);
  if (!finite(floorY) || floorY < .1 || floorY > 1.4) throw new Error("floorHeight must be 0.1–1.4 m above grade.");
  const framing = spec.framing ?? "2x4";
  const studs = framing === "2x6" ? .14 : .089;
  const layers: WallLayers = { siding: .02, sheathing: .012, studs, drywall: .013, total: .02 + .012 + studs + .013 };
  const palette = resolvePalette(spec.palette);

  const pitch = pitchDeg * Math.PI / 180, slope = Math.tan(pitch);
  const eaveY = floorY + storeys * storeyHeight - .3; // wall frame top (ceiling joist seat)
  const rafterDepth = .184, rafterWidth = .038, heel = rafterDepth / Math.cos(pitch);
  const ridgeY = eaveY + heel + depth / 2 * slope;
  const roofTopAt = (z: number) => ridgeY - Math.abs(z) * slope;
  const eaveTail = { z: depth / 2 + eaveOverhang, y: roofTopAt(depth / 2 + eaveOverhang) };
  // Gutter hangs on the fascia just below the roof edge.
  const gutter = { top: eaveTail.y + .016 * Math.cos(pitch) - .015, front: eaveTail.z + .025 + .125, width: .125 };
  const downspouts: { id: string; points: Vec3[] }[] = [];
  const footingDepth = foundation === "basement" ? 2.3 : .6;
  const foundationTop = foundation === "slab" ? floorY : floorY - .24; // floor system sits on stem/basement walls
  const foundationBottom = -footingDepth - .25;
  const dims: HouseDims = {
    width, depth, storeys, storeyHeight, floorY, eaveY, pitch, slope, eaveOverhang, rakeOverhang,
    rafterDepth, rafterWidth, heel, ridgeY, roofTopAt, eaveTail, layers, footingDepth, foundationTop, foundationBottom,
    basementFloorY: foundation === "basement" ? -footingDepth + .1 : undefined,
  };

  // Facades and openings.
  const facades = {} as Record<HouseFacade, FacadeLayout>;
  const openings: ResolvedOpening[] = [];
  const ids = new Set<string>();
  for (const facade of HOUSE_FACADES) {
    const length = facade === "front" || facade === "back" ? width : depth;
    const gableRise = facade === "left" || facade === "right" ? depth / 2 * slope : 0;
    const resolved: ResolvedOpening[] = [];
    (spec.openings?.[facade] ?? []).forEach((opening, index) => {
      const oid = `opening.${opening.id ?? `${facade}-${index + 1}`}`;
      const where = `${facade} opening ${index + 1} (${oid})`;
      if (ids.has(oid)) throw new Error(`Duplicate opening id "${oid}". Give each opening a unique id.`);
      ids.add(oid);
      if (!["window", "door", "garage-door"].includes(opening.kind)) throw new Error(`${where}: unsupported kind "${opening.kind}".`);
      const storey = opening.storey ?? 0;
      if (!Number.isInteger(storey) || storey < 0 || storey >= storeys) throw new Error(`${where}: storey ${storey} does not exist on a ${storeys}-storey house.`);
      if (opening.kind !== "window" && storey !== 0) throw new Error(`${where}: doors must be on the ground storey.`);
      if (opening.kind === "garage-door" && facade !== "front" && facade !== "back") throw new Error(`${where}: garage doors belong on an eave (front/back) wall.`);
      if (opening.kind === "garage-door" && foundation !== "slab") throw new Error(`${where}: a garage door needs a slab foundation at drive level.`);
      if (!finite(opening.center, opening.width, opening.height) || opening.width < .4 || opening.height < .4)
        throw new Error(`${where}: needs finite center/width/height of at least 0.4 m.`);
      const sill = opening.kind === "window" ? opening.sill ?? .85 : 0;
      if (!finite(sill) || sill < 0) throw new Error(`${where}: sill must be a nonnegative height.`);
      const floor = floorY + storey * storeyHeight;
      const u0 = opening.center - opening.width / 2, u1 = opening.center + opening.width / 2;
      const v0 = floor + sill, v1 = v0 + opening.height;
      const ceiling = floorY + (storey + 1) * storeyHeight - .3 - .25; // leave room for the header
      if (u0 < .45 || u1 > length - .45) throw new Error(`${where}: keep at least 0.45 m of wall at each corner (facade is ${length} m long).`);
      if (v1 > Math.min(ceiling, eaveY - .25)) throw new Error(`${where}: top at ${round(v1)} m leaves no room for a header below ${round(Math.min(ceiling, eaveY - .25))} m.`);
      for (const other of resolved) if (u0 < other.u1 + .3 && other.u0 < u1 + .3 && v0 < other.v1 + .3 && other.v0 < v1 + .3)
        throw new Error(`${where} overlaps or crowds ${other.id}; leave 0.3 m of framing between openings.`);
      resolved.push({ id: oid, facade, kind: opening.kind, style: opening.kind === "window" ? opening.style ?? "double-hung" : "picture",
        muntins: opening.kind === "window" && (opening.muntins ?? false) && (opening.style ?? "double-hung") === "double-hung",
        storey, u0: round(u0), u1: round(u1), v0: round(v0), v1: round(v1) });
    });
    facades[facade] = { facade, frame: facadeFrame(facade, width, depth), length, eaveV: eaveY, gableRise, baseV: floorY, openings: resolved };
    openings.push(...resolved);
  }

  // Chimney.
  let chimney: HouseLayout["chimney"];
  if (spec.chimney) {
    const x = spec.chimney.x;
    if (!finite(x) || Math.abs(x) > width / 2 - .9) throw new Error(`Chimney x must lie within ±${round(width / 2 - .9)} m of the center.`);
    const z = -depth * .12, w = .7, d = .6;
    chimney = { x, z, w, d, top: ridgeY + .95 };
  }

  // Systems.
  const systems = spec.systems ?? {};
  const parts: HousePart[] = [];
  const anchors: HouseAnchor[] = [];
  const routes: HouseRoute[] = [];
  const registers: { id: string; position: Vec3; facing: "down" | "up" }[] = [];
  const part = (p: Omit<HousePart, "hideable" | "clippable"> & Partial<Pick<HousePart, "hideable" | "clippable">>) =>
    parts.push({ hideable: true, clippable: false, ...p });
  const anchor = (a: HouseAnchor) => anchors.push({ ...a, position: v3(...a.position), normal: v3(...a.normal) });

  const W = width / 2, D = depth / 2;
  let condenser: HouseLayout["condenser"];
  if (systems.condenser) {
    const { facade, center } = systems.condenser;
    const f = facades[facade];
    if (!f) throw new Error(`Condenser facade "${facade}" is not a house facade.`);
    if (!finite(center) || center < .6 || center > f.length - .6) throw new Error(`Condenser center must be 0.6–${round(f.length - .6)} m along the ${facade} facade.`);
    const size: Vec3 = [.78, .74, .78];
    const c = facadePoint(f.frame, center, .1 + size[1] / 2, .62);
    condenser = { facade, center: c, size };
    for (const o of f.openings) if (center > o.u0 - .5 && center < o.u1 + .5 && o.kind !== "window")
      throw new Error(`Condenser blocks ${o.id}; move it along the ${facade} facade.`);
  }
  let airHandler: HouseLayout["airHandler"];
  const atticFloor = eaveY + .02;
  if (systems.airHandler) {
    const location = systems.airHandler;
    if (location === "basement" && foundation !== "basement") throw new Error("An air handler in the basement needs a basement foundation.");
    const size: Vec3 = location === "attic" ? [1.3, .55, .62] : [.62, 1.35, .62];
    const center: Vec3 = location === "attic" ? v3(0, atticFloor + .1 + size[1] / 2, -D * .25)
      : location === "basement" ? v3(W * .45, dims.basementFloorY! + size[1] / 2 + .05, -D + layers.total + .6)
      : v3(W - layers.total - .5, floorY + size[1] / 2 + .02, -D + layers.total + .45);
    airHandler = { location, center, size };
  }
  let waterHeater: HouseLayout["waterHeater"];
  if (systems.waterHeater) {
    const height = 1.45, radius = .27;
    const base = foundation === "basement" ? dims.basementFloorY! : floorY;
    const x = foundation === "basement" ? -W * .5 : -W + layers.total + .45;
    waterHeater = { center: v3(x, base + .04 + height / 2, -D + layers.total + .42), radius, height };
  }
  let solar: HouseLayout["solar"];
  if (systems.solar) {
    const { rows, columns } = systems.solar;
    if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows < 1 || columns < 1) throw new Error("Solar rows/columns must be positive integers.");
    const slopeLen = (D + eaveOverhang) / Math.cos(pitch);
    const needW = columns * (PANEL_W + .02), needH = rows * (PANEL_H + .02);
    if (needW > width - .8 || needH > slopeLen - .9) throw new Error(`Solar array ${columns}×${rows} (${round(needW)}×${round(needH)} m) does not fit the front roof plane.`);
    solar = { rows, columns, panel: { w: PANEL_W, h: PANEL_H }, origin: { x: -needW / 2, s: (slopeLen - needH) * .55 } };
  }

  // Bounds of the major assemblies.
  const roofBounds = box(-W - rakeOverhang - .05, eaveTail.y - .3, -eaveTail.z - .12, W + rakeOverhang + .05, ridgeY + .12, eaveTail.z + .12);
  const foundationBounds = box(-W - .1, foundationBottom, -D - .1, W + .1, foundationTop, D + .1);
  const wallBounds = (facade: HouseFacade) => {
    const f = facades[facade];
    return boundsOf([facadePoint(f.frame, 0, floorY, 0), facadePoint(f.frame, f.length, eaveY + f.gableRise, -layers.total)]);
  };
  part({ id: "house", label: "House", role: "assembly", bounds: box(0, 0, 0, 0, 0, 0), hideable: false });
  if (spec.site) {
    const site = box(-W - 4, Math.min(-1.4, foundationBottom - .35), -D - 3.5, W + 4, 0, D + 5);
    part({ id: "site", parentId: "house", label: "Site", role: "site", bounds: site });
    part({ id: "site.ground", parentId: "site", label: "Ground and soil", role: "site", bounds: site, clippable: true });
    const entry = facades.front.openings.find(o => o.kind === "door");
    if (entry) {
      const x = -W + (entry.u0 + entry.u1) / 2;
      part({ id: "site.walkway", parentId: "site", label: "Walkway", role: "site", bounds: box(x - .6, -.1, D, x + .6, .03, D + 5) });
    }
    if (HOUSE_FACADES.some(f => facades[f].openings.some(o => o.kind === "door")))
      part({ id: "site.steps", parentId: "site", label: "Entry steps", role: "site", bounds: box(-W - 1, 0, -D - 1.2, W + 1, floorY, D + 1.2) });
    const garage = facades.front.openings.find(o => o.kind === "garage-door");
    if (garage) part({ id: "site.driveway", parentId: "site", label: "Driveway", role: "site", bounds: box(-W + garage.u0 - .2, -.12, D, -W + garage.u1 + .2, .03, D + 5) });
  }
  part({ id: "foundation", parentId: "house", label: "Foundation", role: "assembly", bounds: foundationBounds });
  part({ id: "foundation.footing", parentId: "foundation", label: "Footing", role: "layer", bounds: box(-W - .15, foundationBottom, -D - .15, W + .15, foundationBottom + .25, D + .15), clippable: true });
  if (foundation === "slab") part({ id: "foundation.slab", parentId: "foundation", label: "Concrete slab", role: "layer", bounds: box(-W, floorY - .2, -D, W, floorY, D), clippable: true });
  else part({ id: "foundation.wall", parentId: "foundation", label: foundation === "basement" ? "Basement wall" : "Stem wall", role: "layer", bounds: box(-W, foundationBottom + .25, -D, W, foundationTop, D), clippable: true });
  if (foundation === "basement") part({ id: "foundation.basement-floor", parentId: "foundation", label: "Basement slab", role: "layer", bounds: box(-W, dims.basementFloorY! - .1, -D, W, dims.basementFloorY!, D), clippable: true });
  part({ id: "structure", parentId: "house", label: "Floors", role: "assembly", bounds: box(-W, foundationTop, -D, W, eaveY + .25, D) });
  for (let s = 0; s < storeys; s++) {
    const y = floorY + s * storeyHeight;
    part({ id: `structure.floor-${s + 1}`, parentId: "structure", label: s ? "Upper floor" : "Ground floor", role: "layer", bounds: box(-W, y - .25, -D, W, y, D), clippable: true });
  }
  part({ id: "structure.ceiling", parentId: "structure", label: "Ceiling", role: "layer", bounds: box(-W, eaveY - .02, -D, W, eaveY + .2, D) });
  part({ id: "walls", parentId: "house", label: "Walls", role: "assembly", bounds: unionBounds(HOUSE_FACADES.map(wallBounds)) });
  for (const facade of HOUSE_FACADES) {
    const b = wallBounds(facade), f = facades[facade];
    const wid = `wall.${facade}`;
    part({ id: wid, parentId: "walls", label: `${facade[0].toUpperCase()}${facade.slice(1)} wall`, role: "assembly", bounds: b });
    for (const [layer, label] of [["siding", "Siding"], ["sheathing", "Sheathing"], ["framing", "Studs and plates"], ["insulation", "Cavity insulation"], ["drywall", "Drywall"]] as const)
      part({ id: `${wid}.${layer}`, parentId: wid, label, role: layer === "framing" ? "framing" : "layer", bounds: b, clippable: true });
    anchor({ id: `${wid}.face`, partId: `${wid}.siding`, kind: "label", position: facadePoint(f.frame, f.length * .5, floorY + storeyHeight * .55, .02), normal: f.frame.normal });
  }
  part({ id: "trim", parentId: "house", label: "Exterior trim", role: "finish", bounds: unionBounds(HOUSE_FACADES.map(wallBounds)) });
  for (const o of openings) {
    const f = facades[o.facade];
    const b = boundsOf([facadePoint(f.frame, o.u0 - .1, o.v0 - .06, .06), facadePoint(f.frame, o.u1 + .1, o.v1 + .12, -layers.total)]);
    const label = o.kind === "window" ? "Window" : o.kind === "door" ? "Door" : "Garage door";
    // Openings belong to their wall: moving a wall carries its windows and doors.
    part({ id: o.id, parentId: `wall.${o.facade}`, label, role: "opening", bounds: b });
    const moving = o.kind === "window" ? (o.style === "double-hung" ? "sash" : "glass") : o.kind === "door" ? "leaf" : "panels";
    part({ id: `${o.id}.${moving}`, parentId: o.id, label: o.kind === "window" ? (moving === "sash" ? "Lower sash" : "Glazing") : o.kind === "door" ? "Door leaf" : "Door sections", role: "moving", bounds: b });
    anchor({ id: `${o.id}.center`, partId: o.id, kind: "focus", position: facadePoint(f.frame, (o.u0 + o.u1) / 2, (o.v0 + o.v1) / 2, .03), normal: f.frame.normal });
  }
  part({ id: "roof", parentId: "house", label: "Roof", role: "assembly", bounds: roofBounds });
  for (const [layer, label, role] of [["framing", "Rafters and ridge", "framing"], ["decking", "Roof decking", "layer"], ["underlayment", "Underlayment", "layer"],
    ["shingles", "Shingles", "layer"], ["ridge-cap", "Ridge cap", "finish"], ["trim", "Fascia, rake and soffit", "finish"], ["gutters", "Gutters and downspouts", "service"]] as const)
    part({ id: `roof.${layer}`, parentId: "roof", label, role, bounds: roofBounds, clippable: role === "layer" || role === "framing" });
  part({ id: "attic.insulation", parentId: "roof", label: "Attic insulation", role: "layer", bounds: box(-W + layers.total, eaveY, -D + layers.total, W - layers.total, eaveY + .32, D - layers.total), clippable: true });
  const front = facades.front.frame;
  anchor({ id: "roof.ridge", partId: "roof.ridge-cap", kind: "label", position: [0, ridgeY + .1, 0], normal: [0, 1, 0] });
  anchor({ id: "roof.front-plane", partId: "roof.shingles", kind: "label", position: [W * .35, roofTopAt(D * .45) + .06, D * .45], normal: [0, Math.cos(pitch), Math.sin(pitch)] });
  anchor({ id: "roof.eave", partId: "roof.trim", kind: "label", position: [-W * .6, eaveTail.y - .12, eaveTail.z + .03], normal: [0, 0, 1] });
  anchor({ id: "roof.gutter", partId: "roof.gutters", kind: "port", medium: "rain", position: [W * .5, gutter.top - .05, gutter.front], normal: [0, 0, 1] });
  anchor({ id: "attic.insulation.top", partId: "attic.insulation", kind: "label", position: [W * .3, eaveY + .3, 0], normal: [0, 1, 0] });
  anchor({ id: "foundation.edge", partId: foundation === "slab" ? "foundation.slab" : "foundation.wall", kind: "label", position: facadePoint(front, width * .7, floorY * .5, .02), normal: [0, 0, 1] });
  anchor({ id: "foundation.footing.toe", partId: "foundation.footing", kind: "label", position: facadePoint(front, width * .7, foundationBottom + .12, .14), normal: [0, 0, 1] });

  if (chimney) {
    part({ id: "chimney", parentId: "house", label: "Chimney", role: "assembly", bounds: box(chimney.x - chimney.w / 2 - .06, eaveY - .1, chimney.z - chimney.d / 2 - .06, chimney.x + chimney.w / 2 + .06, chimney.top + .2, chimney.z + chimney.d / 2 + .06), clippable: true });
    anchor({ id: "chimney.flashing", partId: "chimney", kind: "label", position: [chimney.x, roofTopAt(chimney.z + chimney.d / 2) + .1, chimney.z + chimney.d / 2 + .02], normal: [0, 0, 1] });
  }

  // HVAC: condenser, line set, air handler, supply trunk/branches and return.
  const ceilingY = eaveY - .02;
  const cavity = layers.total * .5;
  const inner = (x: number, z: number) => [Math.max(-W + layers.total + .7, Math.min(W - layers.total - .7, x)), Math.max(-D + layers.total + .7, Math.min(D - layers.total - .7, z))] as const;
  if (condenser || airHandler) part({ id: "hvac", parentId: "house", label: "Heating and cooling", role: "assembly", bounds: box(0, 0, 0, 0, 0, 0) });
  if (condenser && !airHandler) throw new Error("A condenser needs an air handler to connect its refrigerant line set; set systems.airHandler.");
  if (condenser) {
    const c = condenser.center, s = condenser.size, n = facades[condenser.facade].frame.normal;
    part({ id: "hvac.condenser", parentId: "hvac", label: "Outdoor condenser", role: "equipment", bounds: box(c[0] - .55, 0, c[2] - .55, c[0] + .55, c[1] + s[1] / 2 + .05, c[2] + .55) });
    part({ id: "hvac.condenser.fan", parentId: "hvac.condenser", label: "Condenser fan", role: "moving", bounds: box(c[0] - .3, c[1] + s[1] / 2 - .1, c[2] - .3, c[0] + .3, c[1] + s[1] / 2 + .02, c[2] + .3) });
    anchor({ id: "hvac.condenser.top", partId: "hvac.condenser.fan", kind: "label", position: [c[0], c[1] + s[1] / 2 + .04, c[2]], normal: [0, 1, 0], medium: "heat" });
    anchor({ id: "hvac.condenser.valves", partId: "hvac.condenser", kind: "port", medium: "refrigerant", position: [c[0] - n[0] * (s[0] / 2 + .02) + n[2] * .26, c[1] - .12, c[2] - n[2] * (s[2] / 2 + .02) - n[0] * .26], normal: [-n[0], 0, -n[2]] });
  }
  if (airHandler) {
    const a = airHandler.center, s = airHandler.size;
    part({ id: "hvac.air-handler", parentId: "hvac", label: airHandler.location === "attic" ? "Air handler (attic)" : "Furnace / air handler", role: "equipment", bounds: box(a[0] - s[0] / 2, a[1] - s[1] / 2, a[2] - s[2] / 2, a[0] + s[0] / 2, a[1] + s[1] / 2, a[2] + s[2] / 2) });
    anchor({ id: "hvac.air-handler.center", partId: "hvac.air-handler", kind: "focus", position: a, normal: [0, 1, 0] });
    const columns = Math.max(2, Math.round(width / 3.6));
    const overhead = airHandler.location !== "basement";
    const trunkY = overhead ? atticFloor + .34 : foundationTop - .2;
    const trunkZ = overhead ? a[2] : -D * .1;
    // Supply leaves the cabinet: side (attic), top (closet/basement).
    const supplyOut: Vec3 = airHandler.location === "attic" ? [a[0] + s[0] / 2, trunkY, a[2]] : [a[0], a[1] + s[1] / 2, a[2]];
    const join: Vec3 = airHandler.location === "attic" ? [a[0], trunkY, trunkZ] : [a[0], trunkY, trunkZ];
    anchor({ id: "hvac.air-handler.supply", partId: "hvac.air-handler", kind: "port", medium: "supply-air", position: supplyOut,
      normal: airHandler.location === "attic" ? [1, 0, 0] : [0, 1, 0] });
    const xMin = inner(-W, 0)[0], xMax = inner(W, 0)[0];
    const riser: Vec3[] = airHandler.location === "attic" ? [] : airHandler.location === "basement"
      ? [supplyOut, [a[0], trunkY, a[2]], join] : [supplyOut, join];
    const trunks: Vec3[][] = [];
    const hx = airHandler.location === "attic" ? a[0] : a[0];
    if (xMax - hx > .3) trunks.push([[airHandler.location === "attic" ? a[0] + s[0] / 2 : hx, trunkY, trunkZ], [xMax, trunkY, trunkZ]]);
    if (hx - xMin > .3) trunks.push([[airHandler.location === "attic" ? a[0] - s[0] / 2 : hx, trunkY, trunkZ], [xMin, trunkY, trunkZ]]);
    if (riser.length > 1) routes.push({ id: "hvac.supply.riser", medium: "supply-air", partId: "hvac.supply-duct", radius: .16, shape: "rect", from: "hvac.air-handler.supply", points: dedupe(riser) });
    trunks.forEach((points, i) => routes.push({ id: `hvac.supply.trunk-${i + 1}`, medium: "supply-air", partId: "hvac.supply-duct", radius: .16, shape: "rect",
      from: riser.length > 1 ? undefined : "hvac.air-handler.supply", points: dedupe(points) }));
    // Keep branch takeoffs clear of the cabinet itself.
    const clear = s[0] / 2 + .5;
    const regXs = Array.from({ length: columns }, (_, i) => {
      const x = inner(-W + width * (i + .5) / columns, 0)[0];
      return Math.abs(x - a[0]) < clear && overhead ? a[0] + (x >= a[0] ? clear : -clear) : x;
    }).filter(x => x >= xMin - 1e-6 && x <= xMax + 1e-6);
    if (overhead) {
      regXs.forEach((x, i) => {
        for (const side of [-1, 1]) {
          const z = inner(0, side * D * .55)[1], rid = `hvac.register-${i + 1}${side < 0 ? "b" : "f"}`;
          if (Math.abs(z - trunkZ) < .3) continue;
          const p: Vec3 = v3(x, ceilingY, z);
          registers.push({ id: rid, position: p, facing: "down" });
          anchor({ id: rid, partId: "hvac.registers", kind: "port", medium: "supply-air", position: p, normal: [0, -1, 0] });
          routes.push({ id: `hvac.supply.${rid.slice(5)}`, medium: "supply-air", partId: "hvac.supply-duct", radius: .09, shape: "round", to: rid,
            points: dedupe([[x, trunkY, trunkZ], [x, trunkY, z], [x, ceilingY + .01, z]]) });
        }
      });
    } else {
      for (let level = 0; level < storeys; level++) regXs.forEach((x, i) => {
        const z = inner(0, D * .62)[1], rid = `hvac.register-${level + 1}-${i + 1}`;
        const y = floorY + level * storeyHeight;
        const p: Vec3 = v3(x, y + .005, z);
        registers.push({ id: rid, position: p, facing: "up" });
        anchor({ id: rid, partId: "hvac.registers", kind: "port", medium: "supply-air", position: p, normal: [0, 1, 0] });
        // Upper registers rise in the back wall cavity, then run in the upper floor framing.
        const pts: Vec3[] = level === 0 ? [[x, trunkY, trunkZ], [x, trunkY, z], [x, y - .02, z]]
          : [[x, trunkY, trunkZ], [x, trunkY, -D + cavity], [x, y - .14, -D + cavity], [x, y - .14, z], [x, y - .02, z]];
        routes.push({ id: `hvac.supply.${rid.slice(5)}`, medium: "supply-air", partId: "hvac.supply-duct", radius: level ? .05 : .075, shape: "round", to: rid, points: dedupe(pts) });
      });
    }
    // Return: a central ceiling grille (overhead) or floor grille (basement).
    let ret: Vec3, retPort: Vec3, retPts: Vec3[];
    if (airHandler.location === "attic") {
      ret = v3(inner(a[0] - s[0] / 2 - .9, 0)[0], ceilingY, inner(0, a[2] + 1.4)[1]);
      retPort = [a[0] - s[0] / 2 + .2, atticFloor + .2, a[2] + s[2] / 2];
      retPts = [[ret[0], ceilingY + .01, ret[2]], [ret[0], atticFloor + .2, ret[2]], [ret[0], atticFloor + .2, a[2] + s[2] / 2 + .3], [retPort[0], atticFloor + .2, a[2] + s[2] / 2 + .3], retPort];
    } else if (airHandler.location === "closet") {
      ret = v3(a[0] - s[0] / 2 - .45, a[1] - s[1] * .3, a[2]);
      retPort = [a[0] - s[0] / 2, ret[1], a[2]];
      retPts = [ret, retPort];
    } else {
      ret = v3(inner(-W * .1, 0)[0], floorY + .005, inner(0, -D * .55)[1]);
      retPort = [a[0] - s[0] / 2, a[1] - s[1] * .2, a[2]];
      retPts = [[ret[0], floorY - .02, ret[2]], [ret[0], trunkY - .05, ret[2]], [ret[0], trunkY - .05, a[2]], [a[0] - s[0] / 2 - .35, trunkY - .05, a[2]], [a[0] - s[0] / 2 - .35, retPort[1], a[2]], retPort];
    }
    anchor({ id: "hvac.return-grille", partId: "hvac.return-duct", kind: "port", medium: "return-air", position: ret,
      normal: airHandler.location === "attic" ? [0, -1, 0] : airHandler.location === "closet" ? [-1, 0, 0] : [0, 1, 0] });
    anchor({ id: "hvac.air-handler.return", partId: "hvac.air-handler", kind: "port", medium: "return-air", position: retPort, normal: airHandler.location === "attic" ? [0, 0, 1] : [-1, 0, 0] });
    routes.push({ id: "hvac.return.main", medium: "return-air", partId: "hvac.return-duct", radius: airHandler.location === "closet" ? .11 : .13, shape: "round",
      from: "hvac.return-grille", to: "hvac.air-handler.return", points: dedupe(retPts) });
    part({ id: "hvac.supply-duct", parentId: "hvac", label: "Supply ducts", role: "service", bounds: box(-W, 0, -D, W, 1, D) });
    part({ id: "hvac.return-duct", parentId: "hvac", label: "Return duct", role: "service", bounds: box(-W, 0, -D, W, 1, D) });
    if (registers.length) part({ id: "hvac.registers", parentId: "hvac", label: "Supply registers", role: "finish", bounds: box(-W, floorY, -D, W, eaveY, D) });
    if (condenser) {
      // Line set: valves → wall → into the wall cavity → to the coil (attic: up the cavity).
      const valves = anchors.find(x => x.id === "hvac.condenser.valves")!.position;
      const n = facades[condenser.facade].frame.normal;
      const gap = .62 - condenser.size[0] / 2 - .1;
      const wallOut: Vec3 = [valves[0] - n[0] * gap, valves[1], valves[2] - n[2] * gap];
      const into = (p: Vec3, depthIn: number): Vec3 => [p[0] - n[0] * (depthIn + .08), p[1], p[2] - n[2] * (depthIn + .08)];
      const port: Vec3 = airHandler.location === "attic" ? [a[0] + s[0] * .3, a[1] - s[1] * .15, a[2] - s[2] / 2] : [a[0] + s[0] / 2, a[1] - s[1] * .1, a[2]];
      const out: Vec3 = airHandler.location === "attic" ? [0, 0, -1] : [1, 0, 0];
      const approach: Vec3 = [port[0] + out[0] * .22, port[1], port[2] + out[2] * .22];
      const pts: Vec3[] = [valves, wallOut];
      let cursor: Vec3;
      if (airHandler.location === "attic") {
        const penetrate: Vec3 = [wallOut[0], eaveY - .25, wallOut[2]];
        cursor = into(penetrate, cavity);
        pts.push(penetrate, cursor, cursor = [cursor[0], atticFloor + .12, cursor[2]]);
      } else {
        cursor = into(wallOut, layers.total + .2);
        pts.push(cursor);
      }
      pts.push([approach[0], cursor[1], cursor[2]], [approach[0], cursor[1], approach[2]], approach, port);
      const lineset = dedupe(pts);
      anchor({ id: "hvac.air-handler.coil", partId: "hvac.air-handler", kind: "port", medium: "refrigerant", position: port, normal: out });
      routes.push({ id: "hvac.lineset", medium: "refrigerant", partId: "hvac.lineset", radius: .022, shape: "round", from: "hvac.condenser.valves", to: "hvac.air-handler.coil", points: lineset });
      part({ id: "hvac.lineset", parentId: "hvac", label: "Refrigerant line set", role: "service", bounds: boundsOf(lineset, .05) });
    }
  }

  // Plumbing: main in from the street → water heater → hot line in the back wall cavity → fixture.
  if (waterHeater) {
    const h = waterHeater;
    part({ id: "plumbing", parentId: "house", label: "Plumbing", role: "assembly", bounds: box(0, 0, 0, 0, 0, 0) });
    part({ id: "plumbing.water-heater", parentId: "plumbing", label: "Water heater", role: "equipment", bounds: box(h.center[0] - h.radius, h.center[1] - h.height / 2, h.center[2] - h.radius, h.center[0] + h.radius, h.center[1] + h.height / 2 + .35, h.center[2] + h.radius) });
    anchor({ id: "plumbing.water-heater.tank", partId: "plumbing.water-heater", kind: "label", position: [h.center[0] + h.radius, h.center[1] + .2, h.center[2]], normal: [1, 0, 0] });
    const top = h.center[1] + h.height / 2 + .1;
    const cold: Vec3 = [h.center[0] - .09, top, h.center[2]], hot: Vec3 = [h.center[0] + .09, top, h.center[2]];
    const wallZ = -D + cavity;
    const runY = foundation === "basement" ? foundationTop - .12 : foundation === "crawlspace" ? floorY - .45 : floorY - .12;
    const mainIn: Vec3 = [-W * .25, -.95, D + 3];
    const fixture: Vec3 = v3(W - layers.total - 1.4, floorY + .95, wallZ);
    anchor({ id: "plumbing.main", partId: "plumbing.supply", kind: "port", medium: "cold-water", position: mainIn, normal: [0, 0, 1] });
    anchor({ id: "plumbing.fixture", partId: "plumbing.supply", kind: "port", medium: "hot-water", position: fixture, normal: [0, 0, 1] });
    const coldPts = dedupe([mainIn, [mainIn[0], mainIn[1], D - .35], [mainIn[0], runY, D - .35], [mainIn[0], runY, wallZ], [cold[0], runY, wallZ],
      [cold[0], top + .3, wallZ], [cold[0], top + .3, cold[2]], cold]);
    const hotY = Math.max(top + .3, foundation === "basement" ? runY : top + .3);
    const hotPts = dedupe([hot, [hot[0], hotY, hot[2]], [hot[0], hotY, wallZ], [fixture[0], hotY, wallZ], fixture]);
    routes.push({ id: "plumbing.cold", medium: "cold-water", partId: "plumbing.supply", radius: .014, shape: "round", from: "plumbing.main", points: coldPts });
    routes.push({ id: "plumbing.hot", medium: "hot-water", partId: "plumbing.supply", radius: .014, shape: "round", to: "plumbing.fixture", points: hotPts });
    part({ id: "plumbing.supply", parentId: "plumbing", label: "Water supply lines", role: "service", bounds: boundsOf([...coldPts, ...hotPts], .05) });
  }
  if (systems.electricalPanel) {
    const f = facades[condenser?.facade === "right" ? "left" : "right"];
    const meterV = floorY + 1.2;
    const clearOf = (u: number) => f.openings.every(o => u < o.u0 - .45 || u > o.u1 + .45) &&
      (!condenser || condenser.facade !== f.facade || Math.abs(u - (systems.condenser as { center: number }).center) > .7);
    const candidates = Array.from({ length: Math.floor((f.length - 1.2) / .1) + 1 }, (_, i) => .6 + i * .1).sort((x, y) => Math.abs(x - f.length * .72) - Math.abs(y - f.length * .72));
    const u = candidates.find(clearOf);
    if (u === undefined) throw new Error(`No clear wall on the ${f.facade} facade for the electric meter; remove an opening or disable systems.electricalPanel.`);
    const p = facadePoint(f.frame, u, meterV, .06);
    part({ id: "electrical.meter", parentId: "house", label: "Electric meter", role: "equipment", bounds: boundsOf([p], .25) });
    anchor({ id: "electrical.meter", partId: "electrical.meter", kind: "port", medium: "electric", position: p, normal: f.frame.normal });
  }
  if (solar) {
    part({ id: "solar.array", parentId: "roof", label: "Solar array", role: "equipment", bounds: box(solar.origin.x, eaveTail.y, 0, -solar.origin.x, ridgeY + .2, eaveTail.z) });
    const midS = solar.origin.s + solar.rows * (PANEL_H + .02) / 2, z = eaveTail.z - midS * Math.cos(pitch);
    anchor({ id: "solar.array", partId: "solar.array", kind: "label", position: [0, roofTopAt(z) + .15, z], normal: [0, Math.cos(pitch), Math.sin(pitch)], medium: "electric" });
  }

  // Rain: ridge → down the front plane → gutter → downspout → splash block.
  for (const sz of [1, -1]) for (const sx of [1, -1]) {
    const x = sx * (W - .15), z0 = sz * (gutter.front - .06);
    const p0: Vec3 = [x, gutter.top - .115, z0], p1: Vec3 = [x, gutter.top - .2, z0];
    const wallZ = sz * (D + .05), drop = Math.abs(z0 - wallZ);
    downspouts.push({ id: `${sz > 0 ? "front" : "back"}-${sx > 0 ? "right" : "left"}`,
      points: [p0, p1, v3(x, gutter.top - .2 - drop, wallZ), v3(x, .32, wallZ), v3(x, .12, sz * (D + .25))] });
  }
  const spout = downspouts[0].points;
  routes.push({ id: "roof.rain", medium: "rain", partId: "roof.shingles", radius: .03, shape: "surface", to: "roof.gutter",
    points: [v3(W * .55, ridgeY + .04, .05), v3(W * .55, eaveTail.y + .04, eaveTail.z), v3(W * .55, gutter.top - .06, gutter.front - .06),
      v3(spout[0][0], gutter.top - .06, gutter.front - .06), ...spout, v3(spout[0][0], .03, D + .5)] });

  // HVAC bounds now that routes exist.
  const fill = (pid: string, ids: string[]) => {
    const p = parts.find(x => x.id === pid);
    const kids = parts.filter(x => ids.includes(x.parentId ?? "") || ids.includes(x.id)).filter(x => x.id !== pid);
    const routeB = routes.filter(r => r.partId.startsWith(pid + ".")).map(r => boundsOf(r.points, r.radius + .05));
    if (p && (kids.length || routeB.length)) p.bounds = unionBounds([...kids.map(k => k.bounds), ...routeB]);
  };
  for (const pid of ["hvac.supply-duct", "hvac.return-duct"]) {
    const p = parts.find(x => x.id === pid);
    const list = routes.filter(r => r.partId === pid).map(r => boundsOf(r.points, r.radius + .03));
    if (p && list.length) p.bounds = unionBounds(list);
  }
  const regs = parts.find(x => x.id === "hvac.registers");
  if (regs && registers.length) regs.bounds = boundsOf(registers.map(r => r.position), .25);
  fill("hvac", ["hvac"]);
  fill("plumbing", ["plumbing"]);

  const houseBounds = unionBounds([roofBounds, foundationBounds, ...parts.filter(p => p.id.startsWith("hvac.condenser") || p.id === "chimney").map(p => p.bounds)]);
  parts[parts.findIndex(p => p.id === "house")].bounds = houseBounds;
  const site = spec.site ? parts.find(p => p.id === "site")!.bounds : undefined;

  const layout: HouseLayout = {
    id, spec, palette, dims, facades, openings, parts, anchors, routes, chimney, condenser, airHandler, waterHeater, registers, gutter, downspouts, solar, site, bounds: houseBounds,
  };
  const issues = validateHouseLayout(layout);
  if (issues.length) throw new Error(`House layout "${id}" is inconsistent: ${issues.join(" ")}`);
  return layout;
}

function dedupe(points: Vec3[]): Vec3[] {
  return points.filter((p, i) => i === 0 || Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1], p[2] - points[i - 1][2]) > 1e-6).map(p => v3(...p));
}

/** Structural self-check: unique IDs, resolvable parents/anchors/routes, orthogonal routes. */
export function validateHouseLayout(layout: Pick<HouseLayout, "parts" | "anchors" | "routes">): string[] {
  const issues: string[] = [];
  const partIds = new Set<string>();
  for (const p of layout.parts) {
    if (partIds.has(p.id)) issues.push(`Duplicate part "${p.id}".`);
    partIds.add(p.id);
  }
  for (const p of layout.parts) if (p.parentId && !partIds.has(p.parentId)) issues.push(`Part "${p.id}" has missing parent "${p.parentId}".`);
  const anchorIds = new Set<string>();
  for (const a of layout.anchors) {
    if (anchorIds.has(a.id)) issues.push(`Duplicate anchor "${a.id}".`);
    anchorIds.add(a.id);
    if (!partIds.has(a.partId)) issues.push(`Anchor "${a.id}" references missing part "${a.partId}".`);
  }
  for (const r of layout.routes) {
    if (!partIds.has(r.partId)) issues.push(`Route "${r.id}" references missing part "${r.partId}".`);
    for (const end of [r.from, r.to]) if (end && !anchorIds.has(end)) issues.push(`Route "${r.id}" references missing anchor "${end}".`);
    if (r.points.length < 2) issues.push(`Route "${r.id}" needs at least two points.`);
    if (r.shape !== "surface") for (let i = 1; i < r.points.length; i++) {
      const a = r.points[i - 1], b = r.points[i];
      const axes = [0, 1, 2].filter(k => Math.abs(a[k] - b[k]) > 1e-6).length;
      if (axes !== 1) issues.push(`Route "${r.id}" segment ${i} must be axis-aligned and nonzero.`);
    }
  }
  return issues;
}

/** Children of a part (direct), in authored order. */
export function housePartChildren(layout: Pick<HouseLayout, "parts">, id: string): HousePart[] {
  return layout.parts.filter(p => p.parentId === id);
}
/** A part and all of its descendants. */
export function housePartSubtree(layout: Pick<HouseLayout, "parts">, id: string): HousePart[] {
  const out: HousePart[] = [];
  const visit = (pid: string) => { for (const p of layout.parts) if (p.parentId === pid) { out.push(p); visit(p.id); } };
  const root = layout.parts.find(p => p.id === id);
  if (!root) throw new Error(`Unknown house part "${id}".`);
  out.push(root); visit(id);
  return out;
}

/* ------------------------------------------------------------ inspection */

/** Condition states every house supports (geometry/material variants; see `HouseSpec.condition`). */
export const HOUSE_STATES = ["new", "aged", "damaged"] as const;

/** Renderer-neutral InspectableAsset over the layout's authored rest bounds and anchors (no Three.js). */
export function inspectHouseLayout(layout: HouseLayout): InspectableAsset {
  const parts = layout.parts.map(p => ({ id: p.id, parentId: p.parentId, label: p.label, role: p.role, hideable: p.hideable, ghostable: p.hideable, clippable: p.clippable }));
  const byId = new Map(layout.parts.map(p => [p.id, p]));
  const anchors = new Map(layout.anchors.map(a => [a.id, a]));
  return createInspectableAsset({
    id: layout.id, dimension: 3, metersPerUnit: 1, parts,
    anchors: layout.anchors.map(a => ({ id: a.id, partId: a.partId, kind: a.kind, medium: a.medium })),
    states: [...HOUSE_STATES],
    capabilities: { sectioning: "clip", explodable: true, canGhost: true, flowPorts: layout.anchors.some(a => a.kind === "port"), stateful: true },
    revision: `${layout.id}:layout:${layout.parts.length}:${layout.routes.length}`,
  }, {
    // A layout is a rest description: frames do not move anything.
    bounds: id => { const b = byId.get(id)!.bounds; return { min: b.min, max: b.max }; },
    anchor: id => { const a = anchors.get(id)!; return { position: a.position, normal: a.normal }; },
  });
}
