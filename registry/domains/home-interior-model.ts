/** Customizable, renderer-neutral interiors: floor plans, furniture recipes, electrical, yards and tours.
 *
 * Everything is data you can author or tweak:
 * - `FloorPlanSpec`: rooms as rectangles (meters or fractions of each storey's
 *   interior footprint; several rectangles make L-shaped rooms) plus
 *   connections between rooms (door, bifold, cased opening or fully open).
 *   Rooms tile the footprint edge to edge; walls are derived from shared edges.
 * - `autoFloorPlan(ctx)` is only a default generator: pass your own plan, or a
 *   function that edits the generated one.
 * - Furniture comes from per-room-kind `ROOM_RECIPES` that read each room's
 *   walls, doors and windows; override recipes, add/replace/omit items per room.
 * - Electrical (lights, switches, outlets, detectors, panel) and yard items are
 *   rule-based and switchable; `planHouseTour` turns rooms into a camera walkthrough.
 *
 * Everything carries stable semantic IDs and world positions (meters). The
 * result is a plausible illustration, not a code-compliant architectural design.
 */
import type { Vec3 } from "./home-model";

/* ------------------------------------------------------------------- types */

export type RoomKind = "living" | "kitchen" | "dining" | "bedroom" | "bath" | "powder" | "closet" | "utility" | "hall" | "garage" | "stair" | "office";
export type FloorFinish = "wood" | "tile" | "concrete" | "carpet";
export interface PlanRect { x0: number; z0: number; x1: number; z1: number }
export interface RoomSpec {
  id: string;
  kind: RoomKind;
  storey?: number;
  /** One or more rectangles that tile part of the storey footprint (touching edges, no overlaps). */
  rects: readonly PlanRect[];
  label?: string;
  floor?: FloorFinish;
}
export type ConnectionKind = "door" | "bifold" | "opening" | "open";
export interface ConnectionSpec {
  /** The leaf swings into the second room. */
  between: readonly [string, string];
  /** door (swing leaf), bifold (closet), opening (cased, no leaf) or open (no wall at all). Default door. */
  kind?: ConnectionKind;
  /** Position along the shared wall, 0–1 (default .5). */
  at?: number;
  width?: number;
}
export interface FloorPlanSpec {
  /** "fraction": rects are 0–1 of the storey's interior box (scales with the house). Default meters. */
  units?: "meters" | "fraction";
  rooms: readonly RoomSpec[];
  connections?: readonly ConnectionSpec[];
}
export type FurnishingKind =
  | "sofa" | "armchair" | "coffee-table" | "tv-console" | "tv" | "rug" | "floor-lamp" | "bookshelf" | "fireplace"
  | "bed" | "nightstand" | "table-lamp" | "dresser" | "desk" | "desk-chair" | "closet-rod"
  | "base-cabinets" | "upper-cabinets" | "sink" | "range" | "hood" | "fridge" | "dishwasher" | "island" | "stool" | "dining-table" | "chair" | "sideboard"
  | "bathtub" | "toilet" | "vanity" | "mirror" | "towel-bar" | "pedestal-sink"
  | "washer" | "dryer" | "shelf" | "workbench" | "stair" | "plant" | "car";
/** Explicit furnishing in a room: position as fractions of the room's main rectangle. */
export interface FurnishingSpec {
  kind: FurnishingKind;
  name?: string;
  /** [fx, fz] inside the room's main rectangle (0–1). */
  at: readonly [number, number];
  /** Degrees; 0 faces +Z (front of the house). */
  yaw?: number;
  size?: Vec3;
  variant?: string;
  /** Height above the floor (wall cabinets, lamps on tables). */
  lift?: number;
}
export interface Furnishing { id: string; kind: FurnishingKind; roomId: string; storey: number; position: Vec3; size: Vec3; yaw: number; variant?: string; /** Floor offset already included in position[1]. */ lift?: number }
export type ElectricalKind = "ceiling-light" | "pendant" | "vanity-light" | "switch" | "outlet" | "smoke-detector" | "exhaust-fan" | "panel";
export interface ElectricalDevice { id: string; kind: ElectricalKind; roomId: string; storey: number; position: Vec3; normal: Vec3 }
export type YardKind = "tree" | "shrub" | "fence" | "patio" | "patio-table" | "patio-chair" | "umbrella" | "grill" | "mailbox" | "path-light" | "garden-bed";
export interface YardItemSpec { kind: YardKind; zone: "front-yard" | "backyard"; name: string; position: Vec3; size: Vec3; yaw?: number }
export interface YardItem { id: string; kind: YardKind; zone: "front-yard" | "backyard"; position: Vec3; size: Vec3; yaw: number; seed: number }

export interface PlanRoom {
  id: string; kind: RoomKind; label: string; storey: number; floor: FloorFinish; y: number;
  /** Main usable rectangle (largest piece, inset by half a wall where it meets another room). */
  x0: number; x1: number; z0: number; z1: number;
  /** Every usable piece (floors are laid over these). */
  rects: PlanRect[];
  /** Closets: the room they open into. */
  parentRoomId?: string;
}
export interface InteriorDoor { id: string; at: number; width: number; height: number; into: string; from: string; hinge: "start" | "end"; kind: "swing" | "bifold" | "opening" }
export interface Partition { id: string; storey: number; axis: "x" | "z"; at: number; from: number; to: number; doors: InteriorDoor[] }
export interface InteriorDiagnostic { code: "not-adjacent" | "no-space" | "recipe-failed"; message: string }
export interface InteriorPlan {
  rooms: PlanRoom[]; partitions: Partition[]; furnishings: Furnishing[]; electrical: ElectricalDevice[]; yard: YardItem[];
  /** The resolved floor plan (meters) — edit it and pass it back as `interior.plan`. */
  floorPlan: FloorPlanSpec;
  utilityRoomId?: string; kitchenSink?: Vec3; bathSink?: Vec3;
  diagnostics: InteriorDiagnostic[];
}

/* -------------------------------------------------------------- recipes */

export interface RoomWall {
  side: "x0" | "x1" | "z0" | "z1";
  /** Wall line and extent (world). For x-sides `at` is x and the span runs along z. */
  at: number; from: number; to: number;
  exterior: boolean;
  /** Door/opening spans along the wall [a, b]. */
  doors: Array<[number, number]>;
  /** Window spans along exterior walls [a, b] with sill height. */
  windows: Array<{ a: number; b: number; sill: number }>;
  /** Direction pointing into the room (x, z). */
  inward: readonly [number, number];
}
export interface RoomContext {
  room: PlanRoom;
  walls: RoomWall[];
  house: InteriorContext;
  /** Pose for an item of `size` against `wall`, centered `along` the wall, `gap` off it; local +Z faces into the room. */
  onWall(wall: RoomWall, along: number, size: Vec3, gap?: number): { x: number; z: number; yaw: number };
  /** Wall stretches free of doors (and windows unless allowed). */
  freeSpans(wall: RoomWall, options?: { allowWindows?: boolean; clearance?: number }): Array<[number, number]>;
  /** The wall stretch with the most free length ≥ `length` (optionally preferring exterior or interior walls). */
  bestWall(length: number, options?: { allowWindows?: boolean; exclude?: RoomWall[]; preferExterior?: boolean }): { wall: RoomWall; span: [number, number] } | undefined;
}
export interface RecipeItem { name: string; kind: FurnishingKind; x: number; z: number; size: Vec3; yaw: number; variant?: string; lift?: number }
export type RoomRecipe = (ctx: RoomContext) => RecipeItem[];

/* ---------------------------------------------------------------- inputs */

export interface InteriorContext {
  width: number; depth: number; storeys: number; storeyHeight: number; floorY: number; eaveY: number;
  wallThickness: number; foundation: "slab" | "crawlspace" | "basement";
  frontDoorX?: number; backDoorX?: number; garage?: { x0: number; x1: number };
  /** Exterior windows: facade, world span along the facade's wall axis, storey and sill height. */
  windows: ReadonlyArray<{ facade: "front" | "back" | "left" | "right"; a: number; b: number; storey: number; sill: number }>;
  chimney?: { x: number; z: number; w: number; d: number };
  site?: { min: Vec3; max: Vec3 };
}
export interface AutoPlanOptions {
  /** Depth of the private back zone (meters). */
  backDepth?: number;
  /** Bath width in the back zone (default 2.2 m). */
  bathWidth?: number;
  /** A utility/mudroom when there is no garage or basement (default true). */
  utility?: boolean;
  /** Reach-in bedroom closets (default true). */
  closets?: boolean;
}
export interface InteriorSpec {
  /** "auto" (default), an authored plan, or a function that edits the auto plan. */
  plan?: "auto" | FloorPlanSpec | ((auto: FloorPlanSpec, ctx: InteriorContext) => FloorPlanSpec);
  auto?: AutoPlanOptions;
  /** Furnish rooms from recipes (default true). */
  furnish?: boolean;
  recipes?: Partial<Record<RoomKind, RoomRecipe>>;
  /** Per-room overrides by room ID. */
  rooms?: Readonly<Record<string, { items?: readonly FurnishingSpec[]; replace?: boolean; omit?: readonly string[]; label?: string; floor?: FloorFinish }>>;
  electrical?: false | { lights?: boolean; switches?: boolean; outlets?: boolean; smoke?: boolean; outletSpacing?: number };
  /** Auto yard (default), explicit items, or none. */
  yard?: boolean | readonly YardItemSpec[];
}

/* ------------------------------------------------------------- constants */

/** Interior partition thickness: 2x4 studs with drywall both sides. */
export const PARTITION_THICKNESS = .114;
const PT = PARTITION_THICKNESS, HALF = PT / 2, EPS = .02;
const DOOR = { width: .8, height: 2.03 };
const round = (v: number) => Math.round(v * 1e4) / 1e4;
export const ROOM_LABELS: Readonly<Record<RoomKind, string>> = { living: "Living room", kitchen: "Kitchen", dining: "Dining room", bedroom: "Bedroom", bath: "Bathroom", powder: "Powder room",
  closet: "Closet", utility: "Utility room", hall: "Hall", garage: "Garage", stair: "Stair", office: "Office" };
export const FURNISHING_LABELS: Readonly<Record<FurnishingKind, string>> = {
  sofa: "Sofa", armchair: "Armchair", "coffee-table": "Coffee table", "tv-console": "TV console", tv: "Television", rug: "Rug", "floor-lamp": "Floor lamp", bookshelf: "Bookshelf", fireplace: "Fireplace",
  bed: "Bed", nightstand: "Nightstand", "table-lamp": "Table lamp", dresser: "Dresser", desk: "Desk", "desk-chair": "Desk chair", "closet-rod": "Closet rod and shelf",
  "base-cabinets": "Base cabinets", "upper-cabinets": "Wall cabinets", sink: "Kitchen sink", range: "Range and oven", hood: "Range hood", fridge: "Refrigerator", dishwasher: "Dishwasher",
  island: "Kitchen island", stool: "Counter stool", "dining-table": "Dining table", chair: "Chair", sideboard: "Sideboard",
  bathtub: "Bathtub with shower", toilet: "Toilet", vanity: "Vanity and sink", mirror: "Mirror", "towel-bar": "Towel bar", "pedestal-sink": "Pedestal sink",
  washer: "Washing machine", dryer: "Clothes dryer", shelf: "Shelving", workbench: "Workbench", stair: "Stair", plant: "Potted plant", car: "Car",
};
/** Separately animatable sub-parts each furnishing kind exposes (`<furnishing id>.<name>`), with their motion. */
export const FURNISHING_MOVING_PARTS: Readonly<Partial<Record<FurnishingKind, readonly string[]>>> = {
  fridge: ["door-left", "door-right", "freezer"], range: ["oven-door"], dishwasher: ["door"], washer: ["door"], dryer: ["door"],
  nightstand: ["drawer"], dresser: ["drawer-1", "drawer-2", "drawer-3"], desk: ["drawer"], toilet: ["lid"], "desk-chair": ["seat"],
  "base-cabinets": ["door"], vanity: ["door"], car: ["door-left", "door-right"],
};
export const ELECTRICAL_LABELS: Readonly<Record<ElectricalKind, string>> = {
  "ceiling-light": "Ceiling light", pendant: "Pendant light", "vanity-light": "Vanity light", switch: "Light switch", outlet: "Outlet", "smoke-detector": "Smoke detector", "exhaust-fan": "Exhaust fan", panel: "Electrical panel",
};
export const YARD_LABELS: Readonly<Record<YardKind, string>> = {
  tree: "Tree", shrub: "Shrub", fence: "Fence", patio: "Patio", "patio-table": "Patio table", "patio-chair": "Patio chair", umbrella: "Patio umbrella", grill: "Grill", mailbox: "Mailbox", "path-light": "Path light", "garden-bed": "Garden bed",
};

/** Interior box of a storey (inside the exterior walls). */
export function interiorBox(ctx: Pick<InteriorContext, "width" | "depth" | "wallThickness">): PlanRect {
  const W = ctx.width / 2, D = ctx.depth / 2, T = ctx.wallThickness;
  return { x0: round(-W + T), x1: round(W - T), z0: round(-D + T), z1: round(D - T) };
}

/* ---------------------------------------------------------- auto planner */

/** Default rule-based plan: private back zone, open front living zone, hall upstairs. Edit the result freely. */
export function autoFloorPlan(ctx: InteriorContext, options: AutoPlanOptions = {}): FloorPlanSpec {
  const box = interiorBox(ctx);
  const rooms: RoomSpec[] = [], connections: ConnectionSpec[] = [];
  const R = (id: string, kind: RoomKind, storey: number, rects: PlanRect[], label?: string, floor?: FloorFinish) => { rooms.push({ id, kind, storey, rects, label, floor }); };
  const C = (a: string, b: string, kind: ConnectionKind = "door", at?: number, width?: number) => connections.push({ between: [a, b], kind, at, width });
  const depth = box.z1 - box.z0;
  const backDepth = options.backDepth ?? (ctx.storeys > 1 ? Math.max(2.9, Math.min(3.3, depth * .43)) : Math.max(2.9, Math.min(3.9, depth * .47)));
  const zb = round(box.z0 + backDepth);
  const cutsOf = (a: number, b: number, widths: ReadonlyArray<number | "*">): number[] => {
    const fixed = widths.reduce<number>((s, w) => s + (w === "*" ? 0 : w), 0), stars = widths.filter(w => w === "*").length;
    const share = ((b - a) - fixed) / Math.max(1, stars);
    if (share < 1.2) throw new Error(`Auto floor plan cannot fit ${widths.join(" + ")} m into ${(b - a).toFixed(2)} m; author a plan instead.`);
    const cuts = [a]; let x = a;
    for (const w of widths) { x += w === "*" ? share : w; cuts.push(round(x)); }
    return cuts;
  };
  const closets = options.closets ?? true;
  /** Bedroom with a reach-in closet in a corner of its door wall; the bedroom becomes L-shaped. */
  const bedroom = (id: string, storey: number, r: PlanRect, doorWall: "z0" | "z1", corner: "x0" | "x1", label: string, floor: FloorFinish) => {
    if (!closets || r.x1 - r.x0 < 2.6) { R(id, "bedroom", storey, [r], label, floor); return; }
    const len = round(Math.min(1.8, (r.x1 - r.x0) * .5)), d = .7;
    const cx0 = corner === "x0" ? r.x0 : round(r.x1 - len), cx1 = corner === "x0" ? round(r.x0 + len) : r.x1;
    const cz0 = doorWall === "z0" ? r.z0 : round(r.z1 - d), cz1 = doorWall === "z0" ? round(r.z0 + d) : r.z1;
    R(`closet-${id}`, "closet", storey, [{ x0: cx0, x1: cx1, z0: cz0, z1: cz1 }], `${label} closet`, floor);
    const main: PlanRect = doorWall === "z0" ? { ...r, z0: cz1 } : { ...r, z1: cz0 };
    const strip: PlanRect = { x0: corner === "x0" ? cx1 : r.x0, x1: corner === "x0" ? r.x1 : cx0, z0: cz0, z1: cz1 };
    R(id, "bedroom", storey, [main, strip], label, floor);
    C(id, `closet-${id}`, "bifold", .5, Math.min(1.5, len - .3));
  };
  for (let s = 0; s < ctx.storeys; s++) {
    let hx0 = box.x0, hx1 = box.x1;
    if (s === 0 && ctx.garage) {
      const left = (ctx.garage.x0 + ctx.garage.x1) / 2 < 0;
      if (left) { const gx1 = round(Math.max(ctx.garage.x1 + .45, box.x0 + 3.3)); R("garage", "garage", 0, [{ x0: box.x0, x1: gx1, z0: box.z0, z1: box.z1 }]); hx0 = gx1; }
      else { const gx0 = round(Math.min(ctx.garage.x0 - .45, box.x1 - 3.3)); R("garage", "garage", 0, [{ x0: gx0, x1: box.x1, z0: box.z0, z1: box.z1 }]); hx1 = gx0; }
    }
    const back = (x0: number, x1: number): PlanRect => ({ x0, x1, z0: box.z0, z1: zb });
    if (ctx.storeys === 1) {
      const util = (options.utility ?? true) && !ctx.garage && ctx.foundation !== "basement";
      const cuts = cutsOf(hx0, hx1, util ? ["*", options.bathWidth ?? 2.2, 1.25, "*"] : ["*", options.bathWidth ?? 2.2, "*"]);
      const split = round(hx0 + (hx1 - hx0) * .56);
      const livingLeft = ctx.frontDoorX === undefined || ctx.frontDoorX < split || !!ctx.garage;
      const living: PlanRect = livingLeft ? { x0: hx0, x1: split, z0: zb, z1: box.z1 } : { x0: round(hx1 - (split - hx0)), x1: hx1, z0: zb, z1: box.z1 };
      const kitchen: PlanRect = livingLeft ? { x0: split, x1: hx1, z0: zb, z1: box.z1 } : { x0: hx0, x1: living.x0, z0: zb, z1: box.z1 };
      R("living", "living", 0, [living]); R("kitchen", "kitchen", 0, [kitchen]); C("living", "kitchen", "open");
      const hub = (x: number) => (x >= living.x0 && x <= living.x1 ? "living" : "kitchen");
      // The garage opens into whichever front room it borders.
      if (ctx.garage) C("garage", hub((ctx.garage.x0 + ctx.garage.x1) / 2 < 0 ? hx0 + .1 : hx1 - .1), "door", .75);
      const last = cuts.length - 2;
      bedroom("bedroom-1", 0, back(cuts[0], cuts[1]), "z1", "x0", "Bedroom 1", "wood");
      R("bath-1", "bath", 0, [back(cuts[1], cuts[2])]);
      if (util) R("utility", "utility", 0, [back(cuts[2], cuts[3])]);
      bedroom("bedroom-2", 0, back(cuts[last], cuts[last + 1]), "z1", "x1", "Bedroom 2", "wood");
      C(hub(cuts[1] - .6), "bedroom-1", "door", .9); C(hub((cuts[1] + cuts[2]) / 2), "bath-1", "door", .5);
      if (util) C(hub((cuts[2] + cuts[3]) / 2), "utility", "door", .5);
      C(hub(cuts[last] + .6), "bedroom-2", "door", .1);
    } else if (s === 0) {
      const cuts = cutsOf(hx0, hx1, ["*", 1.1, 1.7, "*"]);
      R("dining", "dining", 0, [back(cuts[0], cuts[1])]); R("stair", "stair", 0, [back(cuts[1], cuts[2])]);
      R("powder", "powder", 0, [back(cuts[2], cuts[3])]); R("office", "office", 0, [back(cuts[3], cuts[4])]);
      const split = round(hx0 + (hx1 - hx0) * .52);
      R("living", "living", 0, [{ x0: hx0, x1: split, z0: zb, z1: box.z1 }]); R("kitchen", "kitchen", 0, [{ x0: split, x1: hx1, z0: zb, z1: box.z1 }]);
      C("living", "kitchen", "open"); C("living", "dining", "open"); C("dining", "stair", "open"); C("living", "stair", "open");
      C(split > (cuts[2] + cuts[3]) / 2 ? "living" : "kitchen", "powder", "door", .5); C("kitchen", "office", "door", .15);
    } else {
      const hallZ1 = round(zb + 1.05);
      const cuts = cutsOf(hx0, hx1, ["*", 1.1, 2.3, "*"]);
      const rest = cuts[4] - cuts[3], hall = `hall-${s + 1}`, midX = round((hx0 + hx1) / 2);
      bedroom(`bedroom-${s * 3}`, s, back(cuts[0], cuts[1]), "z1", "x0", `Bedroom ${s * 3}`, "carpet");
      R(`stair-${s + 1}`, "stair", s, [back(cuts[1], cuts[2])], "Stair landing", "wood");
      R(`bath-${s + 1}`, "bath", s, [back(cuts[2], cuts[3])]);
      const fourth = rest >= 2.6 ? `bedroom-${s * 3 + 1}` : "closet-linen";
      if (rest >= 2.6) R(fourth, "bedroom", s, [back(cuts[3], cuts[4])], `Bedroom ${s * 3 + 1}`, "carpet");
      else R(fourth, "closet", s, [back(cuts[3], cuts[4])], "Linen closet", "wood");
      R(hall, "hall", s, [{ x0: hx0, x1: hx1, z0: zb, z1: hallZ1 }]);
      bedroom(`bedroom-${s * 3 - 2}`, s, { x0: hx0, x1: midX, z0: hallZ1, z1: box.z1 }, "z0", "x0", `Bedroom ${s * 3 - 2}`, "carpet");
      bedroom(`bedroom-${s * 3 - 1}`, s, { x0: midX, x1: hx1, z0: hallZ1, z1: box.z1 }, "z0", "x1", `Bedroom ${s * 3 - 1}`, "carpet");
      C(hall, `bedroom-${s * 3}`, "door", .9); C(hall, `stair-${s + 1}`, "open"); C(hall, `bath-${s + 1}`, "door", .5);
      C(hall, fourth, rest >= 2.6 ? "door" : "bifold", .1);
      C(hall, `bedroom-${s * 3 - 2}`, "door", .9); C(hall, `bedroom-${s * 3 - 1}`, "door", .1);
    }
  }
  return { units: "meters", rooms, connections };
}

/* ----------------------------------------------------------------- derive */

/** Resolve a floor plan into rooms, partitions and doors, then furnish, wire and landscape it. */
export function planHouseInterior(ctx: InteriorContext, spec: InteriorSpec = {}): InteriorPlan {
  const diagnostics: InteriorDiagnostic[] = [];
  const box = interiorBox(ctx);
  const auto = () => autoFloorPlan(ctx, spec.auto);
  const raw = spec.plan === undefined || spec.plan === "auto" ? auto() : typeof spec.plan === "function" ? spec.plan(auto(), ctx) : spec.plan;
  const toM = (r: PlanRect): PlanRect => raw.units === "fraction"
    ? { x0: round(box.x0 + r.x0 * (box.x1 - box.x0)), x1: round(box.x0 + r.x1 * (box.x1 - box.x0)), z0: round(box.z0 + r.z0 * (box.z1 - box.z0)), z1: round(box.z0 + r.z1 * (box.z1 - box.z0)) }
    : r;
  const floorPlan: FloorPlanSpec = { units: "meters", rooms: raw.rooms.map(r => ({ ...r, storey: r.storey ?? 0, rects: r.rects.map(toM) })), connections: raw.connections ?? [] };
  const ids = new Set<string>();
  for (const r of floorPlan.rooms) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(r.id) || ids.has(r.id)) throw new Error(`Room ID "${r.id}" must be unique lowercase kebab-case.`);
    ids.add(r.id);
    if (!(r.storey! >= 0 && r.storey! < ctx.storeys)) throw new Error(`Room "${r.id}" is on storey ${r.storey}, but the house has ${ctx.storeys}.`);
    if (!r.rects.length) throw new Error(`Room "${r.id}" needs at least one rectangle.`);
    for (const q of r.rects) {
      if (!(q.x1 - q.x0 > .3 && q.z1 - q.z0 > .3)) throw new Error(`Room "${r.id}" has a rectangle smaller than 0.3 m.`);
      if (q.x0 < box.x0 - EPS || q.x1 > box.x1 + EPS || q.z0 < box.z0 - EPS || q.z1 > box.z1 + EPS)
        throw new Error(`Room "${r.id}" extends outside the interior (${box.x0}…${box.x1} × ${box.z0}…${box.z1} m).`);
    }
  }
  const rects = floorPlan.rooms.flatMap(r => r.rects.map(q => ({ room: r, q })));
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i], b = rects[j];
    if (a.room.id === b.room.id || a.room.storey !== b.room.storey) continue;
    const ox = Math.min(a.q.x1, b.q.x1) - Math.max(a.q.x0, b.q.x0), oz = Math.min(a.q.z1, b.q.z1) - Math.max(a.q.z0, b.q.z0);
    if (ox > EPS && oz > EPS) throw new Error(`Rooms "${a.room.id}" and "${b.room.id}" overlap; rooms must tile edge to edge.`);
  }
  const pair = (a: string, b: string) => [a, b].sort().join("|");
  const openPairs = new Set((floorPlan.connections ?? []).filter(c => c.kind === "open").map(c => pair(c.between[0], c.between[1])));
  // Shared edges between different rooms → wall segments (low side `lo`, high side `hi`) unless open.
  interface Seg { storey: number; axis: "x" | "z"; at: number; from: number; to: number; lo: string; hi: string; open: boolean }
  const segs: Seg[] = [];
  for (const a of rects) for (const b of rects) {
    if (a === b || a.room.storey !== b.room.storey || a.room.id === b.room.id) continue;
    const open = openPairs.has(pair(a.room.id, b.room.id));
    if (Math.abs(a.q.x1 - b.q.x0) < EPS) { const f = Math.max(a.q.z0, b.q.z0), t = Math.min(a.q.z1, b.q.z1); if (t - f > .05) segs.push({ storey: a.room.storey!, axis: "z", at: round(a.q.x1), from: round(f), to: round(t), lo: a.room.id, hi: b.room.id, open }); }
    if (Math.abs(a.q.z1 - b.q.z0) < EPS) { const f = Math.max(a.q.x0, b.q.x0), t = Math.min(a.q.x1, b.q.x1); if (t - f > .05) segs.push({ storey: a.room.storey!, axis: "x", at: round(a.q.z1), from: round(f), to: round(t), lo: a.room.id, hi: b.room.id, open }); }
  }
  // Usable rects: inset half a wall on each side that meets a walled neighbor.
  const rooms: PlanRoom[] = floorPlan.rooms.map(r => {
    const over = spec.rooms?.[r.id];
    const hits = (axis: "x" | "z", at: number, from: number, to: number) => segs.some(s => !s.open && (s.lo === r.id || s.hi === r.id) && s.axis === axis && Math.abs(s.at - at) < EPS && s.to > from + EPS && s.from < to - EPS);
    const pieces = r.rects.map(q => ({
      x0: round(q.x0 + (hits("z", q.x0, q.z0, q.z1) ? HALF : 0)), x1: round(q.x1 - (hits("z", q.x1, q.z0, q.z1) ? HALF : 0)),
      z0: round(q.z0 + (hits("x", q.z0, q.x0, q.x1) ? HALF : 0)), z1: round(q.z1 - (hits("x", q.z1, q.x0, q.x1) ? HALF : 0)),
    }));
    const main = [...pieces].sort((p, q) => (q.x1 - q.x0) * (q.z1 - q.z0) - (p.x1 - p.x0) * (p.z1 - p.z0))[0];
    const kind = r.kind;
    return { id: r.id, kind, label: over?.label ?? r.label ?? ROOM_LABELS[kind], storey: r.storey!, y: round(ctx.floorY + r.storey! * ctx.storeyHeight),
      floor: over?.floor ?? r.floor ?? (kind === "bath" || kind === "powder" || kind === "kitchen" || kind === "utility" ? "tile" : kind === "garage" ? "concrete" : "wood"),
      ...main, rects: pieces };
  });
  const byId = new Map(rooms.map(r => [r.id, r]));
  // Merge collinear walled segments into partitions.
  const lines = new Map<string, Seg[]>();
  for (const s of segs) if (!s.open) { const key = `${s.storey}|${s.axis}|${s.at.toFixed(3)}`; lines.set(key, [...(lines.get(key) ?? []), s]); }
  const partitions: Partition[] = [];
  let pc = 0;
  for (const key of [...lines.keys()].sort()) {
    const list = lines.get(key)!.sort((p, q) => p.from - q.from);
    let cur: { storey: number; axis: "x" | "z"; at: number; from: number; to: number } | null = null;
    const flush = () => { if (cur) partitions.push({ id: `partition.${cur.storey + 1}-${++pc}`, ...cur, doors: [] }); };
    for (const s of list) { if (cur && s.from <= cur.to + EPS) cur.to = Math.max(cur.to, s.to); else { flush(); cur = { storey: s.storey, axis: s.axis, at: s.at, from: s.from, to: s.to }; } }
    flush();
  }
  // Doors.
  for (const c of floorPlan.connections ?? []) {
    const [a, b] = c.between;
    if (!byId.has(a) || !byId.has(b)) throw new Error(`Connection ${a} ↔ ${b} names an unknown room.`);
    if (c.kind === "open") continue;
    const shared = segs.filter(s => !s.open && pair(s.lo, s.hi) === pair(a, b)).sort((p, q) => (q.to - q.from) - (p.to - p.from))[0];
    if (!shared) { diagnostics.push({ code: "not-adjacent", message: `Rooms "${a}" and "${b}" share no wall; the ${c.kind ?? "door"} was skipped.` }); continue; }
    const width = c.width ?? (c.kind === "bifold" ? Math.min(1.5, shared.to - shared.from - .3) : DOOR.width);
    const usable = shared.to - shared.from - width - .24;
    if (usable < 0) { diagnostics.push({ code: "no-space", message: `The wall between "${a}" and "${b}" is too short for a ${width.toFixed(2)} m door.` }); continue; }
    const at = round(shared.from + .12 + width / 2 + usable * Math.max(0, Math.min(1, c.at ?? .5)));
    const p = partitions.find(q => q.storey === shared.storey && q.axis === shared.axis && Math.abs(q.at - shared.at) < EPS && at >= q.from - EPS && at <= q.to + EPS);
    if (!p) continue;
    p.doors.push({ id: `door.${b}`, at, width: round(width), height: DOOR.height, into: b, from: a, hinge: at < (p.from + p.to) / 2 ? "start" : "end",
      kind: c.kind === "bifold" ? "bifold" : c.kind === "opening" ? "opening" : "swing" });
    const into = byId.get(b)!;
    if (into.kind === "closet") into.parentRoomId = a;
  }

  // Walls, doors and windows as seen from inside each room.
  const facadeOf = (side: RoomWall["side"]) => side === "x0" ? "left" : side === "x1" ? "right" : side === "z0" ? "back" : "front";
  const roomWalls = (r: PlanRoom): RoomWall[] => {
    const mk = (side: RoomWall["side"], at: number, from: number, to: number, inward: [number, number]): RoomWall => {
      const axis = side.startsWith("x") ? "z" : "x";
      const exterior = side === "x0" ? Math.abs(at - box.x0) < EPS : side === "x1" ? Math.abs(at - box.x1) < EPS : side === "z0" ? Math.abs(at - box.z0) < EPS : Math.abs(at - box.z1) < EPS;
      const line = at + (side.endsWith("0") ? -HALF : HALF);
      const doors: Array<[number, number]> = partitions.filter(p => p.storey === r.storey && p.axis === axis && Math.abs(p.at - line) < EPS)
        .flatMap(p => p.doors.map(d => [d.at - d.width / 2, d.at + d.width / 2] as [number, number])).filter(([a, b]) => b > from && a < to);
      // Open edges: there is no wall to stand furniture against.
      for (const s of segs) if (s.open && (s.lo === r.id || s.hi === r.id) && s.axis === axis && Math.abs(s.at - at) < EPS + HALF) doors.push([s.from, s.to]);
      const facade = facadeOf(side);
      const windows = exterior ? ctx.windows.filter(w => w.facade === facade && w.storey === r.storey && w.b > from && w.a < to).map(w => ({ a: w.a, b: w.b, sill: w.sill })) : [];
      if (exterior && r.storey === 0 && facade === "front" && ctx.frontDoorX !== undefined && ctx.frontDoorX > from && ctx.frontDoorX < to) doors.push([ctx.frontDoorX - .55, ctx.frontDoorX + .55]);
      if (exterior && r.storey === 0 && facade === "back" && ctx.backDoorX !== undefined && ctx.backDoorX > from && ctx.backDoorX < to) doors.push([ctx.backDoorX - .55, ctx.backDoorX + .55]);
      return { side, at, from, to, exterior, doors, windows, inward };
    };
    return [mk("z0", r.z0, r.x0, r.x1, [0, 1]), mk("z1", r.z1, r.x0, r.x1, [0, -1]), mk("x0", r.x0, r.z0, r.z1, [1, 0]), mk("x1", r.x1, r.z0, r.z1, [-1, 0])];
  };
  const contextFor = (r: PlanRoom): RoomContext => {
    const walls = roomWalls(r);
    const freeSpans: RoomContext["freeSpans"] = (wall, o = {}) => {
      const blocks = [...wall.doors, ...(o.allowWindows ? [] : wall.windows.map(w => [w.a, w.b] as [number, number]))]
        .map(([a, b]) => [a - (o.clearance ?? .1), b + (o.clearance ?? .1)] as [number, number]).sort((p, q) => p[0] - q[0]);
      const spans: Array<[number, number]> = []; let cur = wall.from;
      for (const [a, b] of blocks) { if (a > cur) spans.push([cur, Math.min(a, wall.to)]); cur = Math.max(cur, b); }
      if (cur < wall.to) spans.push([cur, wall.to]);
      return spans.filter(([a, b]) => b - a > .05);
    };
    return {
      room: r, walls, house: ctx, freeSpans,
      onWall(wall, along, size, gap = 0) {
        const off = size[2] / 2 + gap;
        if (wall.side.startsWith("z")) return { x: round(along), z: round(wall.at + wall.inward[1] * off), yaw: wall.side === "z0" ? 0 : Math.PI };
        return { x: round(wall.at + wall.inward[0] * off), z: round(along), yaw: wall.side === "x0" ? Math.PI / 2 : -Math.PI / 2 };
      },
      bestWall(length, o = {}) {
        let best: { wall: RoomWall; span: [number, number]; score: number } | undefined;
        for (const wall of walls) {
          if (o.exclude?.some(e => e.side === wall.side)) continue;
          for (const span of freeSpans(wall, { allowWindows: o.allowWindows })) {
            const len = span[1] - span[0];
            if (len < length) continue;
            const score = len + (o.preferExterior === undefined ? 0 : wall.exterior === o.preferExterior ? 2 : 0);
            if (!best || score > best.score) best = { wall, span, score };
          }
        }
        return best && { wall: best.wall, span: best.span };
      },
    };
  };

  // Furniture.
  const furnishings: Furnishing[] = [];
  const recipes: Partial<Record<RoomKind, RoomRecipe>> = { ...ROOM_RECIPES, ...spec.recipes };
  for (const r of rooms) {
    const over = spec.rooms?.[r.id];
    const items: RecipeItem[] = [];
    if (spec.furnish !== false && !over?.replace) {
      try { items.push(...(recipes[r.kind]?.(contextFor(r)) ?? [])); }
      catch (e) { diagnostics.push({ code: "recipe-failed", message: `Recipe for "${r.id}" failed: ${(e as Error).message}` }); }
    }
    for (const [i, it] of (over?.items ?? []).entries())
      items.push({ name: it.name ?? `${it.kind}-${i + 1}`, kind: it.kind, x: round(r.x0 + it.at[0] * (r.x1 - r.x0)), z: round(r.z0 + it.at[1] * (r.z1 - r.z0)), size: it.size ?? DEFAULT_SIZES[it.kind], yaw: (it.yaw ?? 0) * Math.PI / 180, variant: it.variant, lift: it.lift });
    const seen = new Set<string>();
    for (const it of items) {
      if (over?.omit?.includes(it.name) || over?.omit?.includes(it.kind)) continue;
      let name = it.name; for (let k = 2; seen.has(name); k++) name = `${it.name}-${k}`;
      seen.add(name);
      furnishings.push({ id: `furnish.${r.id}.${name}`, kind: it.kind, roomId: r.id, storey: r.storey, position: [round(it.x), round(r.y + (it.lift ?? 0)), round(it.z)], size: it.size, yaw: round(it.yaw), variant: it.variant, lift: it.lift });
    }
  }

  // Electrical.
  const electrical: ElectricalDevice[] = [];
  const el = spec.electrical === false ? null : { lights: true, switches: true, outlets: true, smoke: true, outletSpacing: 2.4, ...spec.electrical };
  if (el) for (const r of rooms) {
    const ceil = round(r.y + ctx.storeyHeight - .32), cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
    const dev = (kind: ElectricalKind, name: string, position: Vec3, normal: Vec3) => electrical.push({ id: `electrical.${name}.${r.id}`, kind, roomId: r.id, storey: r.storey, position: position.map(round) as unknown as Vec3, normal });
    const items = furnishings.filter(f => f.roomId === r.id);
    if (el.lights) {
      if (r.kind === "garage") { dev("ceiling-light", "light-a", [cx, ceil, r.z0 + (r.z1 - r.z0) * .3], [0, -1, 0]); dev("ceiling-light", "light-b", [cx, ceil, r.z0 + (r.z1 - r.z0) * .7], [0, -1, 0]); }
      else if (!(r.kind === "stair" && r.storey === 0)) dev("ceiling-light", "light", [cx, ceil, cz], [0, -1, 0]);
      const over = items.find(f => f.kind === "island" || f.kind === "dining-table");
      if (over) dev("pendant", "pendant", [over.position[0], ceil, over.position[2]], [0, -1, 0]);
      const vanity = items.find(f => f.kind === "vanity" || f.kind === "pedestal-sink");
      if (vanity) {
        const fx = Math.sin(vanity.yaw), fz = Math.cos(vanity.yaw);
        dev("vanity-light", "vanity-light", [vanity.position[0] - fx * (vanity.size[2] / 2 - .03), r.y + 1.95, vanity.position[2] - fz * (vanity.size[2] / 2 - .03)], [fx, 0, fz]);
        dev("exhaust-fan", "fan", [cx, ceil, cz + (r.z1 - r.z0) * .2], [0, -1, 0]);
      }
    }
    const walls = roomWalls(r);
    if (el.switches) {
      // Beside the first doorway into the room, on the latch side.
      const p = partitions.flatMap(q => q.doors.filter(d => d.into === r.id && d.kind !== "opening").map(d => ({ q, d })))[0];
      const side = p && walls.find(w => (p.q.axis === "x" ? w.side.startsWith("z") : w.side.startsWith("x")) && Math.abs(w.at - p.q.at) < PT);
      if (p && side) {
        const s = p.d.at + (p.d.hinge === "start" ? 1 : -1) * (p.d.width / 2 + .15);
        dev("switch", "switch", side.side.startsWith("z") ? [s, r.y + 1.2, side.at + side.inward[1] * .012] : [side.at + side.inward[0] * .012, r.y + 1.2, s], [side.inward[0], 0, side.inward[1]]);
      }
    }
    if (el.outlets && r.kind !== "closet" && r.kind !== "stair") {
      let k = 0;
      const height = r.kind === "kitchen" ? 1.1 : r.kind === "bath" ? 1.05 : .3;
      const ctxR = contextFor(r);
      for (const w of walls) for (const [a, b] of ctxR.freeSpans(w, { allowWindows: true, clearance: .2 }))
        for (let t = a + .4; t < b - .2; t += el.outletSpacing) {
          const pos: Vec3 = w.side.startsWith("z") ? [t, r.y + height, w.at + w.inward[1] * .012] : [w.at + w.inward[0] * .012, r.y + height, t];
          electrical.push({ id: `electrical.outlet.${r.id}-${++k}`, kind: "outlet", roomId: r.id, storey: r.storey, position: pos.map(round) as unknown as Vec3, normal: [w.inward[0], 0, w.inward[1]] });
        }
    }
    if (el.smoke && (r.kind === "bedroom" || r.kind === "hall" || (r.kind === "living" && r.storey === 0))) dev("smoke-detector", "smoke", [r.x0 + .5, ceil, cz], [0, -1, 0]);
  }
  const utility = rooms.find(r => r.kind === "utility") ?? rooms.find(r => r.kind === "garage");
  if (el && utility && ctx.foundation !== "basement") electrical.push({ id: "electrical.panel", kind: "panel", roomId: utility.id, storey: 0, position: [round(utility.x0 + .02), round(utility.y + 1.5), round(utility.z0 + .9)], normal: [1, 0, 0] });

  // Yard.
  const yard: YardItem[] = [];
  if (ctx.site && spec.yard !== false) {
    const list: readonly YardItemSpec[] = Array.isArray(spec.yard) ? spec.yard : autoYard(ctx);
    list.forEach((y, i) => yard.push({ id: `site.${y.zone}.${y.name}`, kind: y.kind, zone: y.zone, position: y.position, size: y.size, yaw: y.yaw ?? 0, seed: i + 1 }));
  }

  const sink = furnishings.find(f => f.kind === "sink"), vanity = furnishings.find(f => f.kind === "vanity" || f.kind === "pedestal-sink");
  return {
    rooms, partitions, furnishings, electrical, yard, floorPlan, diagnostics,
    utilityRoomId: utility?.id,
    kitchenSink: sink ? [sink.position[0], round(sink.position[1] + .9), sink.position[2]] : undefined,
    bathSink: vanity ? [vanity.position[0], round(vanity.position[1] + .86), vanity.position[2]] : undefined,
  };
}

/** Default yard: shade trees, foundation shrubs, mailbox and path lights in front; patio set, grill and fence behind. */
export function autoYard(ctx: InteriorContext): YardItemSpec[] {
  const s = ctx.site!, W = ctx.width / 2, D = ctx.depth / 2, out: YardItemSpec[] = [];
  const add = (zone: YardItemSpec["zone"], name: string, kind: YardKind, x: number, z: number, size: Vec3, yaw = 0) => out.push({ zone, name, kind, position: [round(x), 0, round(z)], size, yaw });
  const doorX = ctx.frontDoorX ?? 0;
  add("front-yard", "tree", "tree", s.min[0] + 2.1, D + 2.6, [3.2, 5.5, 3.2]);
  let k = 0;
  for (let x = -W + .6; x < W - .5; x += 1.05) {
    if (Math.abs(x - doorX) < 1.1 || (ctx.garage && x > ctx.garage.x0 - .5 && x < ctx.garage.x1 + .5)) continue;
    add("front-yard", `shrub-${++k}`, "shrub", x, D + .55, [.75, .7, .7]);
  }
  add("front-yard", "bed", "garden-bed", s.max[0] - 2.4, D + 2.4, [2.6, .12, 1.4]);
  add("front-yard", "mailbox", "mailbox", doorX + .95, s.max[2] - .5, [.25, 1.15, .5]);
  [1.2, 2.6, 4.0].forEach((dz, i) => { add("front-yard", `path-light-${i * 2 + 1}`, "path-light", doorX - .8, D + dz, [.1, .45, .1]); add("front-yard", `path-light-${i * 2 + 2}`, "path-light", doorX + .8, D + dz, [.1, .45, .1]); });
  const bx = ctx.backDoorX ?? 0;
  add("backyard", "patio", "patio", bx, -D - 1.6, [3.6, .08, 3.0]);
  add("backyard", "table", "patio-table", bx + .3, -D - 1.8, [1.0, .74, 1.0]);
  [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dz], i) => add("backyard", `chair-${i + 1}`, "patio-chair", bx + .3 + dx * .8, -D - 1.8 + dz * .8, [.55, .85, .6], Math.atan2(-dx, -dz)));
  add("backyard", "umbrella", "umbrella", bx + .3, -D - 1.8, [2.4, 2.3, 2.4]);
  add("backyard", "grill", "grill", bx - 1.6, -D - .9, [.7, 1.05, .55], Math.PI);
  add("backyard", "tree", "tree", s.max[0] - 1.8, s.min[2] + 2.0, [3.6, 6, 3.6]);
  add("backyard", "bed", "garden-bed", s.min[0] + 2.0, s.min[2] + 1.0, [3.0, .12, 1.0]);
  const fz = s.min[2] + .25;
  add("backyard", "fence-back", "fence", 0, fz, [s.max[0] - s.min[0] - .5, 1.5, .05]);
  add("backyard", "fence-left", "fence", s.min[0] + .25, (fz - D) / 2, [-D - fz, 1.5, .05], Math.PI / 2);
  add("backyard", "fence-right", "fence", s.max[0] - .25, (fz - D) / 2, [-D - fz, 1.5, .05], Math.PI / 2);
  return out;
}

/* ---------------------------------------------------------------- recipes */

export const DEFAULT_SIZES: Readonly<Record<FurnishingKind, Vec3>> = {
  sofa: [2.1, .84, .92], armchair: [.82, .82, .82], "coffee-table": [1.1, .42, .6], "tv-console": [1.6, .5, .42], tv: [1.25, .74, .06], rug: [2.4, .01, 1.7], "floor-lamp": [.38, 1.6, .38],
  bookshelf: [1.2, 1.8, .34], fireplace: [1.3, 1.1, .4], bed: [1.6, .6, 2.1], nightstand: [.48, .55, .42], "table-lamp": [.3, .5, .3], dresser: [1.2, .86, .5], desk: [1.2, .75, .6],
  "desk-chair": [.6, 1, .6], "closet-rod": [1.5, 2.1, .6], "base-cabinets": [.6, .91, .63], "upper-cabinets": [.6, .76, .34], sink: [.9, .91, .63], range: [.76, .91, .63], hood: [.76, .5, .5],
  fridge: [.9, 1.78, .74], dishwasher: [.6, .91, .63], island: [1.8, .91, .9], stool: [.4, .75, .4], "dining-table": [1.6, .75, .9], chair: [.46, .9, .5], sideboard: [1.6, .82, .45],
  bathtub: [1.7, .56, .76], toilet: [.4, .78, .7], vanity: [.9, .86, .55], mirror: [.8, .9, .03], "towel-bar": [.6, 1.1, .08], "pedestal-sink": [.5, .85, .42],
  washer: [.62, .88, .66], dryer: [.62, .88, .66], shelf: [1.0, 1.8, .32], workbench: [1.8, .9, .65], stair: [1, 2.75, 3.3], plant: [.45, 1.1, .45], car: [1.85, 1.45, 4.5],
};
const S = DEFAULT_SIZES;
const item = (name: string, kind: FurnishingKind, p: { x: number; z: number; yaw: number }, size: Vec3 = S[kind], extra: Partial<RecipeItem> = {}): RecipeItem => ({ name, kind, x: p.x, z: p.z, yaw: p.yaw, size, ...extra });
const mid = (span: [number, number]) => (span[0] + span[1]) / 2;
const toward = (wall: RoomWall, dist: number) => ({ dx: wall.inward[0] * dist, dz: wall.inward[1] * dist });

/** Default furnishing per room kind; each reads the room's walls, doors and windows so it adapts to any plan. Override via `interior.recipes`. */
export const ROOM_RECIPES: Readonly<Partial<Record<RoomKind, RoomRecipe>>> = {
  living(c) {
    const r = c.room, out: RecipeItem[] = [];
    const ch = c.house.chimney && c.house.chimney.x > r.x0 - .5 && c.house.chimney.x < r.x1 + .5 && c.house.chimney.z > r.z0 && c.house.chimney.z < r.z1 ? c.house.chimney : undefined;
    let focal: { wall: RoomWall; along: number } | undefined;
    if (ch) {
      // The chimney's room-facing side is the focal wall: fireplace with the TV above the mantel.
      const toLeft = ch.x - r.x0 < r.x1 - ch.x;
      const wall: RoomWall = { side: toLeft ? "x0" : "x1", at: ch.x + (toLeft ? ch.w / 2 : -ch.w / 2), from: ch.z - ch.d / 2, to: ch.z + ch.d / 2, exterior: false, doors: [], windows: [], inward: [toLeft ? 1 : -1, 0] };
      focal = { wall, along: ch.z };
      out.push(item("fireplace", "fireplace", c.onWall(wall, ch.z, S.fireplace)), item("tv", "tv", c.onWall(wall, ch.z, [1.1, .65, .05]), [1.1, .65, .05], { variant: "above-mantel", lift: 1.3 }));
    } else {
      const b = c.bestWall(1.7, { preferExterior: true });
      if (b) { focal = { wall: b.wall, along: mid(b.span) }; out.push(item("tv-console", "tv-console", c.onWall(b.wall, focal.along, S["tv-console"])), item("tv", "tv", c.onWall(b.wall, focal.along, S.tv, .14), S.tv, { lift: .52 })); }
    }
    if (focal) {
      const w = focal.wall, along = focal.along;
      const at = (d: number) => w.side.startsWith("x") ? { x: w.at + w.inward[0] * d, z: along } : { x: along, z: w.at + w.inward[1] * d };
      const facing = Math.atan2(w.inward[0], w.inward[1]);
      const depth = w.side.startsWith("x") ? r.x1 - r.x0 : r.z1 - r.z0;
      const sofaD = Math.max(1.8, Math.min(3.0, depth - .55));
      out.push(item("rug", "rug", { ...at(sofaD * .62), yaw: facing + Math.PI / 2 }, [2.4, .01, 1.7]));
      out.push(item("coffee-table", "coffee-table", { ...at(sofaD * .58), yaw: facing + Math.PI / 2 }));
      out.push(item("sofa", "sofa", { ...at(sofaD), yaw: facing + Math.PI }));
      const lateralMax = w.side.startsWith("x") ? r.z1 : r.x1;
      const off = along + 1.5 < lateralMax - .45 ? 1.45 : -1.45;
      const ap = w.side.startsWith("x") ? { x: at(sofaD * .58).x, z: along + off } : { x: along + off, z: at(sofaD * .58).z };
      const t = at(sofaD * .58);
      out.push(item("armchair", "armchair", { ...ap, yaw: Math.atan2(t.x - ap.x, t.z - ap.z) }));
    }
    const shelf = c.bestWall(1.3, { exclude: focal ? [focal.wall] : [] });
    if (shelf) out.push(item("bookshelf", "bookshelf", c.onWall(shelf.wall, mid(shelf.span), S.bookshelf)));
    out.push(item("plant", "plant", { x: r.x0 + .4, z: r.z1 - .4, yaw: 0 }), item("floor-lamp", "floor-lamp", { x: r.x1 - .4, z: r.z1 - .4, yaw: 0 }));
    return out;
  },
  kitchen(c) {
    const r = c.room, out: RecipeItem[] = [];
    // A galley along the longest usable wall (windows allowed above the counter).
    const run = c.bestWall(2.6, { allowWindows: true, preferExterior: true });
    if (!run) return out;
    // Essentials first (fridge, sink, range), then a dishwasher and counter space as the wall allows.
    const avail = run.span[1] - run.span[0] - .04;
    const extra = avail - (.9 + .9 + .76 + .3 + .3);
    const dish = extra >= .6;
    const spare = Math.max(0, extra - (dish ? .6 : 0));
    const seq: Array<[FurnishingKind | "counter", number]> = [["fridge", .9], ["counter", .3 + spare * .35], ["sink", .9], ...(dish ? [["dishwasher", .6] as [FurnishingKind, number]] : []),
      ["counter", .3 + spare * .3], ["range", .76], ["counter", spare * .35]];
    let t = run.span[0] + .02, k = 0;
    for (const [kind, w] of seq) {
      if (w < .25) continue;
      if (t + w > run.span[1] + 1e-6) break;
      const along = t + w / 2;
      if (kind === "counter") out.push(item(`base-cabinets-${++k}`, "base-cabinets", c.onWall(run.wall, along, [w, .91, .63]), [w, .91, .63]));
      else if (kind === "fridge") out.push(item("fridge", "fridge", c.onWall(run.wall, along, S.fridge)));
      else out.push(item(kind, kind, c.onWall(run.wall, along, S[kind]), [w, .91, .63]));
      if (kind === "range") out.push(item("hood", "hood", c.onWall(run.wall, along, S.hood), S.hood, { lift: 1.52 }));
      // Wall cabinets everywhere except over the fridge, the range (hood) and windows.
      const window = run.wall.windows.some(win => win.b > t && win.a < t + w);
      if (kind !== "fridge" && kind !== "range" && !window) out.push(item(`upper-${++k}`, "upper-cabinets", c.onWall(run.wall, along, [w, .76, .34]), [w, .76, .34], { lift: 1.45 }));
      t += w;
    }
    const free = run.wall.side.startsWith("x") ? r.x1 - r.x0 : r.z1 - r.z0;
    const base = c.onWall(run.wall, mid(run.span), [1, 1, 0]);
    const runLen = run.span[1] - run.span[0];
    if (free > 3.2) {
      const { dx, dz } = toward(run.wall, Math.min(2.1, free * .5));
      out.push(item("island", "island", { x: base.x + dx, z: base.z + dz, yaw: base.yaw }, [Math.min(2.0, runLen * .55), .91, .9]));
      const { dx: sx, dz: sz } = toward(run.wall, Math.min(2.1, free * .5) + .75);
      [-.55, 0, .55].forEach((o, i) => {
        const lx = run.wall.side.startsWith("x") ? 0 : o, lz = run.wall.side.startsWith("x") ? o : 0;
        out.push(item(`stool-${i + 1}`, "stool", { x: base.x + sx + lx, z: base.z + sz + lz, yaw: base.yaw + Math.PI }));
      });
    } else if (free > 2.4) {
      // Narrow kitchens get a small table for two at the open end.
      const { dx, dz } = toward(run.wall, free - .7);
      out.push(item("table", "dining-table", { x: base.x + dx, z: base.z + dz, yaw: base.yaw }, [1.1, .75, .7]));
      [-1, 1].forEach((s, i) => out.push(item(`chair-${i + 1}`, "chair", { x: base.x + dx + (run.wall.side.startsWith("x") ? 0 : s * .7), z: base.z + dz + (run.wall.side.startsWith("x") ? s * .7 : 0), yaw: Math.atan2(-(run.wall.side.startsWith("x") ? 0 : s), -(run.wall.side.startsWith("x") ? s : 0)) })));
    }
    return out;
  },
  dining(c) {
    const r = c.room, cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, wide = r.x1 - r.x0 >= r.z1 - r.z0;
    const out = [item("rug", "rug", { x: cx, z: cz, yaw: wide ? Math.PI / 2 : 0 }, [2.6, .01, 2.0]), item("table", "dining-table", { x: cx, z: cz, yaw: wide ? Math.PI / 2 : 0 }, [1.8, .75, .95])];
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? -1 : 1, k = i % 3 - 1;
      out.push(item(`chair-${i + 1}`, "chair", wide ? { x: cx + k * .6, z: cz + side * .7, yaw: side < 0 ? 0 : Math.PI } : { x: cx + side * .7, z: cz + k * .6, yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2 }));
    }
    const sb = c.bestWall(1.7);
    if (sb) out.push(item("sideboard", "sideboard", c.onWall(sb.wall, mid(sb.span), S.sideboard)));
    return out;
  },
  bedroom(c) {
    const r = c.room, out: RecipeItem[] = [], w = r.x1 - r.x0, d = r.z1 - r.z0;
    const queen = Math.min(w, d) > 2.9;
    const bed: Vec3 = queen ? [1.6, .6, 2.1] : [1.0, .6, 2.05];
    // Headboard on the wall with the most free length (a window above the headboard is fine).
    const head = c.bestWall(bed[0] + 1.2, { allowWindows: true }) ?? c.bestWall(bed[0] + .1, { allowWindows: true });
    if (!head) return out;
    const along = mid(head.span), p = c.onWall(head.wall, along, bed, .02);
    out.push(item("bed", "bed", p, bed, { variant: queen ? "queen" : "twin" }));
    for (const s of [-1, 1]) {
      const a = along + s * (bed[0] / 2 + .3);
      if (a - .25 < head.span[0] || a + .25 > head.span[1]) continue;
      const n = c.onWall(head.wall, a, S.nightstand, .02);
      out.push(item(`nightstand-${s < 0 ? "l" : "r"}`, "nightstand", n), item(`lamp-${s < 0 ? "l" : "r"}`, "table-lamp", n, S["table-lamp"], { lift: .55 }));
    }
    const { dx, dz } = toward(head.wall, bed[2] * .75);
    out.push(item("rug", "rug", { x: p.x + dx, z: p.z + dz, yaw: p.yaw + Math.PI / 2 }, [1.6, .01, Math.min(2.2, Math.max(1.4, bed[0] + .6))]));
    const other = c.bestWall(1.25, { exclude: [head.wall] });
    if (other) {
      if (other.span[1] - other.span[0] > 1.5 && w * d > 9) {
        const dp = c.onWall(other.wall, mid(other.span), S.desk);
        out.push(item("desk", "desk", dp));
        const { dx: ex, dz: ez } = toward(other.wall, .6);
        out.push(item("desk-chair", "desk-chair", { x: dp.x + ex, z: dp.z + ez, yaw: dp.yaw + Math.PI }));
      } else out.push(item("dresser", "dresser", c.onWall(other.wall, mid(other.span), S.dresser)));
    }
    return out;
  },
  bath(c) {
    const out: RecipeItem[] = [];
    // Tub on an exterior (else any) wall long enough for it; toilet and vanity on the side walls.
    const tubWall = [...c.walls].filter(w => w.to - w.from >= 1.5 && !w.doors.length).sort((a, b) => Number(b.exterior) - Number(a.exterior) || (a.to - a.from) - (b.to - b.from))[0];
    if (!tubWall) return out;
    const len = Math.min(1.7, tubWall.to - tubWall.from - .02);
    out.push(item("bathtub", "bathtub", c.onWall(tubWall, (tubWall.from + tubWall.to) / 2, [len, .56, .76]), [len, .56, .76]));
    const sides = c.walls.filter(w => w.side[0] !== tubWall.side[0]);
    const pastTub = (w: RoomWall) => {
      const start = tubWall.side.endsWith("0") ? w.from + .82 : w.from, end = tubWall.side.endsWith("0") ? w.to : w.to - .82;
      return c.freeSpans(w, { allowWindows: true }).map(([a, b]) => [Math.max(a, start), Math.min(b, end)] as [number, number]).filter(([a, b]) => b - a > .5).sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]))[0];
    };
    const [left, right] = sides, ls = left && pastTub(left), rs = right && pastTub(right);
    const near = (span: [number, number], dist: number) => tubWall.side.endsWith("0") ? span[0] + dist : span[1] - dist;
    if (ls) out.push(item("toilet", "toilet", c.onWall(left, near(ls, .45), S.toilet)), item("towel-bar", "towel-bar", c.onWall(left, near(ls, Math.min(1.25, ls[1] - ls[0] - .35)), S["towel-bar"])));
    if (rs) { const a = near(rs, .55); out.push(item("vanity", "vanity", c.onWall(right, a, S.vanity)), item("mirror", "mirror", c.onWall(right, a, S.mirror), S.mirror, { lift: 1.05 })); }
    return out;
  },
  powder(c) {
    const out: RecipeItem[] = [], w = c.bestWall(1.2, { allowWindows: true });
    if (!w) return out;
    out.push(item("toilet", "toilet", c.onWall(w.wall, w.span[0] + .4, S.toilet)), item("sink", "pedestal-sink", c.onWall(w.wall, w.span[0] + 1.0, S["pedestal-sink"])), item("mirror", "mirror", c.onWall(w.wall, w.span[0] + 1.0, [.55, .8, .03]), [.55, .8, .03], { lift: 1.05 }));
    return out;
  },
  office(c) {
    const out: RecipeItem[] = [], d = c.bestWall(1.5, { allowWindows: true, preferExterior: true });
    if (d) {
      const p = c.onWall(d.wall, mid(d.span), [1.4, .75, .7]);
      out.push(item("desk", "desk", p, [1.4, .75, .7]));
      const { dx, dz } = toward(d.wall, .7);
      out.push(item("chair", "desk-chair", { x: p.x + dx, z: p.z + dz, yaw: p.yaw + Math.PI }));
      const b = c.bestWall(1.1, { exclude: [d.wall] });
      if (b) out.push(item("bookshelf", "bookshelf", c.onWall(b.wall, mid(b.span), [1.0, 1.9, .34]), [1.0, 1.9, .34]));
    }
    out.push(item("plant", "plant", { x: c.room.x0 + .35, z: c.room.z1 - .4, yaw: 0 }));
    return out;
  },
  closet(c) {
    const r = c.room, long = r.x1 - r.x0 >= r.z1 - r.z0;
    // Rod along a long wall without the closet door.
    const back = c.walls.find(w => (long ? w.side.startsWith("z") : w.side.startsWith("x")) && !w.doors.length) ?? c.walls[0];
    const len = Math.max(.4, back.to - back.from - .05), depth = Math.min(.6, (long ? r.z1 - r.z0 : r.x1 - r.x0) - .05);
    return [item("rod", "closet-rod", c.onWall(back, (back.from + back.to) / 2, [len, 2.1, depth]), [len, 2.1, depth])];
  },
  utility(c) {
    const out: RecipeItem[] = [], w = c.bestWall(1.3, { allowWindows: true });
    if (w) {
      out.push(item("washer", "washer", c.onWall(w.wall, w.span[0] + .35, S.washer)), item("dryer", "dryer", c.onWall(w.wall, w.span[0] + 1.02, S.dryer)));
      out.push(item("shelf", "shelf", c.onWall(w.wall, w.span[0] + .68, [1.3, .4, .3]), [1.3, .4, .3], { variant: "wall-high", lift: 1.55 }));
    }
    return out;
  },
  garage(c) {
    const r = c.room, out: RecipeItem[] = [], cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
    out.push(item("car", "car", { x: cx, z: cz + .4, yaw: 0 }));
    const back = c.walls.find(w => w.side === "z0")!, wb = c.freeSpans(back, { allowWindows: true })[0];
    if (wb) out.push(item("workbench", "workbench", c.onWall(back, mid(wb), [Math.min(1.8, wb[1] - wb[0] - .1), .9, .65]), [Math.min(1.8, wb[1] - wb[0] - .1), .9, .65]));
    const outer = c.walls.find(w => w.exterior && w.side.startsWith("x"));
    const inner = c.walls.find(w => !w.exterior && w.side.startsWith("x"));
    if (outer) out.push(item("shelf", "shelf", c.onWall(outer, r.z0 + 1.7, [1.6, 1.9, .4]), [1.6, 1.9, .4]));
    if (inner) out.push(item("washer", "washer", c.onWall(inner, r.z0 + 1.0, S.washer)), item("dryer", "dryer", c.onWall(inner, r.z0 + 1.7, S.dryer)));
    return out;
  },
  stair(c) {
    const r = c.room;
    if (r.storey > 0) return [];
    return [item("flight", "stair", { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2, yaw: 0 }, [r.x1 - r.x0 - .04, c.house.storeyHeight, r.z1 - r.z0 - .02])];
  },
};

/* ----------------------------------------------------------------- tours */

export interface TourPose { position: Vec3; target: Vec3; roomId: string }
export interface HouseTour { durationFrames: number; stops: ReadonlyArray<{ roomId: string; startFrame: number }>; sample(frame: number): TourPose }

/** Deterministic eye-level walkthrough: hold and pan in each room, walk through the connecting doorway to the next (cut between storeys). */
export function planHouseTour(plan: Pick<InteriorPlan, "rooms" | "partitions">, options: { roomIds?: readonly string[]; eyeHeight?: number; holdFrames?: number; walkFrames?: number } = {}): HouseTour {
  const eye = options.eyeHeight ?? 1.55, hold = options.holdFrames ?? 75, walk = options.walkFrames ?? 50;
  const rooms = (options.roomIds ?? plan.rooms.filter(r => r.kind !== "closet" && r.kind !== "stair").map(r => r.id)).map(id => {
    const r = plan.rooms.find(q => q.id === id);
    if (!r) throw new Error(`Tour room "${id}" does not exist.`);
    return r;
  });
  if (!rooms.length) throw new Error("A tour needs at least one room.");
  const doorBetween = (a: string, b: string): Vec3 | undefined => {
    for (const p of plan.partitions) for (const d of p.doors) if ((d.into === a && d.from === b) || (d.into === b && d.from === a))
      return p.axis === "x" ? [d.at, 0, p.at] : [p.at, 0, d.at];
    return undefined;
  };
  // View from the entry side toward the far side of the room.
  const view = (r: PlanRoom, from?: Vec3) => {
    const c: Vec3 = [(r.x0 + r.x1) / 2, r.y + eye, (r.z0 + r.z1) / 2];
    const dir = from ? [c[0] - from[0], c[2] - from[2]] : [0, -1];
    const l = Math.hypot(dir[0], dir[1]) || 1, ux = dir[0] / l, uz = dir[1] / l;
    const reach = Math.min(r.x1 - r.x0, r.z1 - r.z0) * .3;
    return { position: [c[0] - ux * reach, c[1], c[2] - uz * reach] as Vec3, target: [c[0] + ux * 3, r.y + 1.15, c[2] + uz * 3] as Vec3 };
  };
  type Key = { frame: number; position: Vec3; target: Vec3; roomId: string; cut?: boolean };
  const keys: Key[] = [], stops: Array<{ roomId: string; startFrame: number }> = [];
  let frame = 0, prevDoor: Vec3 | undefined;
  rooms.forEach((r, i) => {
    const v = view(r, prevDoor);
    stops.push({ roomId: r.id, startFrame: frame });
    const pan = (k: number): Vec3 => { const dx = v.target[0] - v.position[0], dz = v.target[2] - v.position[2], a = (k - .5) * .55; return [v.position[0] + dx * Math.cos(a) - dz * Math.sin(a), v.target[1], v.position[2] + dx * Math.sin(a) + dz * Math.cos(a)]; };
    keys.push({ frame, position: v.position, target: pan(0), roomId: r.id, cut: i > 0 && !prevDoor }, { frame: frame + hold, position: v.position, target: pan(1), roomId: r.id });
    frame += hold;
    const next = rooms[i + 1];
    if (next) {
      const door = next.storey === r.storey ? doorBetween(r.id, next.id) : undefined;
      if (door) {
        keys.push({ frame: frame + walk, position: [door[0], r.y + eye, door[2]], target: [door[0] * 2 - v.position[0], next.y + 1.2, door[2] * 2 - v.position[2]], roomId: next.id });
        frame += walk;
      }
      prevDoor = door;
    }
  });
  const durationFrames = Math.max(1, frame + 1);
  const ease = (t: number) => t * t * (3 - 2 * t);
  return {
    durationFrames, stops,
    sample(f) {
      const x = Math.max(0, Math.min(durationFrames - 1, Math.round(f)));
      let i = 0;
      while (i < keys.length - 1 && keys[i + 1].frame <= x) i++;
      const a = keys[i], b = keys[Math.min(keys.length - 1, i + 1)];
      if (a === b || b.cut) return { position: a.position, target: a.target, roomId: a.roomId };
      const t = ease((x - a.frame) / Math.max(1, b.frame - a.frame));
      const mix = (p: Vec3, q: Vec3): Vec3 => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
      return { position: mix(a.position, b.position), target: mix(a.target, b.target), roomId: t < .5 ? a.roomId : b.roomId };
    },
  };
}
