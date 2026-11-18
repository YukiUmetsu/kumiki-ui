/**
 * INTERIOR1 library: every furniture piece alone on the parchment studio cove (`pieceScene`), and painted rooms of
 * ten periods and places (`ROOMS`, `roomScene`) furnished with the same pieces at their measured sizes, lit by their
 * windows, fires, candles and lamps.
 */
import type { ArchScene, CameraSpec, Mood, MoodId } from "./arch-paint";
import { MOODS } from "./arch-paint";
import { SceneBuilder, boxAt, capsule, coneY, cut, cylY, cylZ, ellipsoid, opening, repeatX, repeatZ, revolve, sphere } from "./arch-kit";
import { studioScene } from "./arch-modules";
import { candle, chairRows, gothicNave, hearth, room, shelves, table } from "./arch-kit-civic";
import { chabana, chashitsu, kakejiku, minkaIrori, washitsu } from "./arch-kit-japan";
import { moonWindow } from "./arch-kit-chinese";
import { leaf, sculpt } from "./arch-sdf";
import type { SurfaceSpec } from "./arch-surface";
import { buildFurniture } from "./furn-construct";
import { FURNITURE_TYPES } from "./furn-data";

/** Views that show each kind of piece best (heading, eye as a share of its height). */
const VIEW: Record<string, { yaw: number; eye: number }> = { seat: { yaw: 32, eye: 0.75 }, table: { yaw: 28, eye: 1.25 }, storage: { yaw: 22, eye: 0.6 }, bed: { yaw: 35, eye: 0.85 }, light: { yaw: 15, eye: 0.6 }, fixture: { yaw: 18, eye: 0.6 } };
/** One piece alone on the studio cove. */
export function pieceScene(id: string, seed = 3): ArchScene {
  const t = FURNITURE_TYPES.find(x => x.id === id);
  if (!t) throw new Error(`Unknown furniture ${id}`);
  const b = new SceneBuilder(seed);
  buildFurniture(b, id);
  // low pieces (a futon, a chabudai, cushions) are seen from above, as one stands over them
  return studioScene(b, { ...VIEW[t.kind], ...(t.h < 0.6 ? { eye: 4.5 } : {}), pad: 0.14 });
}

/** What a room's build returns: its camera, and (for a room open to a garden) the box inside which interior light rules apply. */
export type RoomView = CameraSpec & { interiorBox?: ArchScene["interiorBox"] };
export interface RoomEntry { id: string; label: string; mood: MoodId | Mood; dust?: number; build: (b: SceneBuilder) => RoomView; note: string }
const put = (b: SceneBuilder, id: string, x: number, z: number, yaw = 0) => { buildFurniture(b, id); b.place({ x, z, yaw }); };
const cam = (z: number, y = 1.5, fov = 64, shift = 0.12, x = 0, yaw = 0): CameraSpec => ({ x, y, z, fov, shift, yaw });
const rug = (b: SceneBuilder, x: number, z: number, w: number, l: number, s: SurfaceSpec = { kind: "rug", unit: 1, course: 1 }) => { b.add(boxAt(x - w / 2, 0, z - l / 2, x + w / 2, 0.012, z + l / 2, b.mat({ ...s, unit: w, course: l, offset: [-x, -z] }), 0, 0.006)); b.place(); };

/** A chimney breast projecting `depth` from the back wall at `zWall`, its firebox recess cut for a fireplace stood at its face (returned z). */
const chimneyBreast = (b: SceneBuilder, x: number, zWall: number, depth: number, h: number, wall: SurfaceSpec) => {
  const zf = zWall + depth;
  b.add(cut(boxAt(x - 1.05, 0, zWall - 0.02, x + 1.05, h, zf, b.mat(wall)), [boxAt(x - 0.52, 0, zf - 0.37, x + 0.52, 0.87, zf + 0.1, 0)])); b.place();
  return zf;
};
/** Painted rooms, furnished from the piece library. */
export const ROOMS: readonly RoomEntry[] = [
  { id: "tudor-hall", label: "Tudor hall", mood: "interior-day", note: "Dark oak panelling, a great hearth, a refectory table, a settle by the fire.", build: b => {
    room(b, { view: "garden", w: 9, d: 10, h: 4.4, wall: { kind: "boards", colour: "#4a3424", course: 0.4, age: 0.05 }, floor: { kind: "flags", colour: "#8a8478", unit: 0.7 }, beams: 1.2, windows: [{ wall: "left", at: -1, sill: 1.1, w: 1.6, h: 2.0, glass: { kind: "leaded" } }] });
    hearth(b, 1.5, -5, 2.2, 1.6, { kind: "rubble", colour: "#8a7a62", soot: 2.4 }, 0.6); b.place();
    put(b, "refectory-table", -0.4, 0.5); put(b, "settle", 2.6, -2.2, -90); put(b, "blanket-chest", -3.3, -3.6, 90);
    candle(b, -1, 0.78, 0.5, 0.05); candle(b, 0.4, 0.78, 0.4, 0.05); b.place();
    return cam(6.2, 1.55, 66, 0.15); } },
  { id: "georgian-drawing-room", label: "Georgian drawing room", mood: "interior-day", note: "Pale panelled walls, a centred fireplace, chairs against the walls, a chandelier, a longcase clock.", build: b => {
    room(b, { view: "garden", w: 8, d: 9, h: 3.8, wall: { kind: "plaster", colour: "#b8c6ad", flake: 0.02 }, floor: { kind: "floorboards", colour: "#6a4a32" }, ceiling: { kind: "plaster", colour: "#efeadc" }, windows: [{ wall: "left", at: -1.5, sill: 0.6, w: 1.2, h: 2.4, glass: { kind: "glass" } }, { wall: "left", at: 1.5, sill: 0.6, w: 1.2, h: 2.4, glass: { kind: "glass" } }],
      trim: { rose: { x: 0, z: -0.6, r: 0.55 }, skirting: 0.24, cornice: 0.2, dado: 0.86, dadoMat: { kind: "painted-wood", colour: "#a9b89e", flake: 0.01 }, bars: [3, 4], curtains: { kind: "velvet", colour: "#7a5a3a" }, door: { wall: "right", at: -2.2 }, pictures: [{ wall: "back", at: -2.4, y: 2.2, w: 0.9, h: 0.7 }, { wall: "right", at: 1.4, y: 2.1, w: 1.1, h: 0.8 }] } });
    rug(b, 0, -0.5, 3.6, 4.6); put(b, "fireplace", 0, chimneyBreast(b, 0, -4.5, 0.4, 3.8, { kind: "plaster", colour: "#b8c6ad", flake: 0.02 })); put(b, "chippendale-chair", -1.4, -1.2, 25); put(b, "chippendale-chair", 1.4, -1.2, -25); put(b, "longcase-clock", 3.6, -4.2, -20);
    buildFurniture(b, "chandelier"); b.place({ y: 2.4, z: -0.6 });
    return cam(5.5, 1.5, 64, 0.2); } },
  { id: "victorian-parlour", label: "Victorian parlour", mood: { ...MOODS["interior-day"], sunElevation: 14, sunPower: 2.6, key: 0.2 }, note: "Deep red walls, a buttoned Chesterfield, a pedestal desk under a leaded-glass lamp, books.", build: b => {
    room(b, { view: "garden", w: 7, d: 8, h: 3.4, wall: { kind: "plaster", colour: "#6a2a24", flake: 0.02 }, floor: { kind: "floorboards", colour: "#4a3424" }, ceiling: { kind: "plaster", colour: "#e6dcc4" }, beams: 0, windows: [{ wall: "left", at: -1.2, sill: 0.7, w: 1.1, h: 2.0, glass: { kind: "glass" } }],
      trim: { mould: { kind: "oak", colour: "#3a2216" }, rose: { x: 0, z: 0, r: 0.45 }, skirting: 0.26, cornice: 0.16, pictureRail: 2.55, dado: 0.9, dadoMat: { kind: "oak", colour: "#3a2418" }, bars: [2, 2], curtains: { kind: "velvet", colour: "#3a4a2a" }, door: { wall: "right", at: -2.6, mat: { kind: "oak", colour: "#3a2216" } }, pictures: [{ wall: "back", at: 1.9, y: 1.95, w: 0.7, h: 0.55 }, { wall: "back", at: -2.6, y: 2.0, w: 0.5, h: 0.65 }, { wall: "right", at: 0.6, y: 1.85, w: 0.9, h: 0.65 }, { wall: "right", at: 1.9, y: 2.05, w: 0.45, h: 0.55 }] } });
    rug(b, 0, 0, 3.4, 4.2); put(b, "chesterfield", -0.6, 0.6, 0); put(b, "pedestal-desk", 1.6, -2.6, -15); put(b, "bookcase", -2.2, -3.7); put(b, "fireplace", 0.6, chimneyBreast(b, 0.6, -4, 0.38, 3.4, { kind: "plaster", colour: "#6a2a24", flake: 0.02 }));
    buildFurniture(b, "tiffany-lamp"); b.place({ x: 2.0, y: 0.76, z: -2.6 }); candle(b, 0.1, 1.33, -3.8, 0.05); b.place();
    return cam(4.6, 1.45, 66, 0.12); } },
  { id: "shaker-room", label: "Shaker room", mood: "interior-day", note: "Plain white walls, a peg rail, ladder-back chairs, a gateleg table on scrubbed boards.", build: b => {
    room(b, { view: "garden", w: 6, d: 7, h: 3, wall: { kind: "plaster", colour: "#efeadf", flake: 0.03 }, floor: { kind: "floorboards", colour: "#b38a5a" }, windows: [{ wall: "left", at: -0.5, sill: 0.8, w: 1.1, h: 1.6, glass: { kind: "glass" } }],
      trim: { mould: { kind: "painted-wood", colour: "#4a5a6a", flake: 0.04 }, skirting: 0.14, bars: [3, 4], door: { wall: "right", at: -1.6, mat: { kind: "painted-wood", colour: "#4a5a6a", flake: 0.04 } } } });
    // the peg rail: turned pegs every 65 cm for chairs, cloaks and brooms; oval boxes stacked by the wall
    const pegW = b.mat({ kind: "oak", colour: "#7a5a3a" }), red = b.mat({ kind: "painted-wood", colour: "#8a3a26", flake: 0.08 }), ochre = b.mat({ kind: "painted-wood", colour: "#b8862e", flake: 0.08 }), teal = b.mat({ kind: "painted-wood", colour: "#3a6a62", flake: 0.08 });
    b.add(boxAt(-3, 1.75, -3.5, 3, 1.85, -3.44, pegW)); for (let i = 0; i < 9; i++) b.add(cylZ(-2.6 + i * 0.65, 1.8, -3.44, -3.36, 0.012, pegW), sphere(-2.6 + i * 0.65, 1.8, -3.35, 0.018, pegW));
    b.add(capsule(1.3, 1.8, -3.37, 1.3, 0.55, -3.3, 0.014, pegW), ellipsoid(1.3, 0.38, -3.3, 0.16, 0.2, 0.04, b.mat({ kind: "hay", colour: "#c8aa66" })), capsule(1.17, 0.55, -3.3, 1.43, 0.55, -3.3, 0.01, b.mat({ kind: "fabric", colour: "#7a3a2a", pattern: "plain" })));
    const oval = (x: number, y: number, z: number, a: number, c: number, h: number, m: number) => leaf((px, py, pz) => Math.max((Math.hypot((px - x) / a, (pz - z) / c) - 1) * Math.min(a, c), y - py, py - y - h), [x - a, y, z - c], [x + a, y + h, z + c], m);
    b.add(oval(2.4, 0, -3.1, 0.22, 0.15, 0.13, red), oval(2.4, 0.13, -3.1, 0.18, 0.12, 0.11, ochre), oval(2.4, 0.24, -3.1, 0.14, 0.095, 0.09, teal), oval(2.4, 0.33, -3.1, 0.15, 0.1, 0.012, teal));
    b.place(); put(b, "gateleg-table", 0, -0.5); put(b, "ladder-back", -0.9, -0.4, 90); put(b, "ladder-back", 0.9, -0.6, -90); put(b, "ladder-back", 0.2, 0.55, 180);
    // the built-in wall of drawers and cupboards in the corner: graduated drawers with turned knobs, doors above
    const pine = b.mat({ kind: "painted-wood", colour: "#a8743a", flake: 0.03 }), knob = b.mat({ kind: "oak", colour: "#6a4a2a" });
    b.add(boxAt(2.95, 0, -3.5, 3.0, 2.95, -1.0, pine), boxAt(2.4, 0, -3.5, 2.95, 2.95, -1.0, pine));
    for (let k = 0; k < 5; k++) { const y0 = 0.08 + k * 0.24, y1 = y0 + 0.21; b.add(boxAt(2.38, y0, -3.45, 2.4, y1, -1.05, pine)); for (const z of [-2.9, -1.6]) b.add(sphere(2.36, (y0 + y1) / 2, z, 0.022, knob)); }
    for (const [z0, z1] of [[-3.45, -2.3], [-2.2, -1.05]]) b.add(boxAt(2.38, 1.35, z0, 2.4, 2.85, z1, pine), boxAt(2.37, 1.42, z0 + 0.07, 2.38, 2.78, z1 - 0.07, pine), sphere(2.355, 2.0, z0 < -3 ? z1 - 0.12 : z0 + 0.12, 0.02, knob));
    b.place();
    // a braided rag rug: concentric bands of rag colours in an oval; a rocking chair with a woven tape seat by the window
    const bands = ["#7a3a2a", "#c8b48a", "#3a4a5a", "#8a6a3a", "#c8b48a", "#5a3a2a"];
    for (let k = 0; k < bands.length; k++) { const a = 1.25 - k * 0.17, c = 0.85 - k * 0.12; b.add(leaf((x, y, z) => Math.max((Math.hypot(x / a, (z - 0.4) / c) - 1) * Math.min(a, c), -y, y - (0.008 + k * 0.0004)), [-a, 0, 0.4 - c], [a, 0.012, 0.4 + c], b.mat({ kind: "fabric", colour: bands[k], colour2: bands[(k + 2) % bands.length], unit: 0.02 }))); }
    b.place();
    const mp = b.mat({ kind: "oak", colour: "#b98a55", age: 0.2 });
    buildFurniture(b, "ladder-back"); for (const sx of [-0.21, 0.21]) b.add(leaf((x, y, z) => Math.max(Math.abs(x - sx) - 0.015, Math.hypot(y - 1.4, z) - 1.42 + 0.0 * x, 1.38 - Math.hypot(y - 1.4, z), Math.abs(z) - 0.42), [sx - 0.02, -0.05, -0.45], [sx + 0.02, 0.08, 0.45], mp));
    b.place({ x: -1.9, z: -2.0, yaw: 55 });
    return cam(4.2, 1.5, 64, 0.1, 0.3, 4); } },
  { id: "alpine-stube", label: "Alpine Stube", mood: "interior-day", note: "A pine-lined room round a tiled stove, a corner bench and a table.", build: b => {
    room(b, { view: "garden", w: 6, d: 7, h: 2.6, wall: { kind: "boards", colour: "#b9935e", course: 0.16, age: 0.05 }, floor: { kind: "floorboards", colour: "#9a7448" }, ceiling: { kind: "boards", colour: "#a8834e" }, windows: [{ wall: "left", at: -1, sill: 0.9, w: 0.9, h: 0.9, glass: { kind: "glass" } }, { wall: "back", at: -1.6, sill: 0.9, w: 0.9, h: 0.9, glass: { kind: "glass" } }], trim: { mould: { kind: "boards", colour: "#9a7448" }, bars: [2, 2], curtains: { kind: "fabric", colour: "#a83a2e", colour2: "#efe6d6", pattern: "check", unit: 0.04 } } });
    put(b, "tiled-stove", 1.9, -2.5, -30); put(b, "refectory-table", -1.2, -1.6, 90);
    // the corner bench (Eckbank) round the table, the Herrgottswinkel shrine in the corner above it, a lamp over the table
    const pine = b.mat({ kind: "boards", colour: "#a98450", course: 0.12, age: 0.1 }), dk = b.mat({ kind: "oak", colour: "#5a3e24" });
    b.add(boxAt(-2.98, 0, -3.48, -2.5, 0.45, -0.3, pine), boxAt(-2.98, 0.45, -3.48, -2.9, 0.95, -0.3, pine), boxAt(-2.98, 0, -3.48, -0.4, 0.45, -3.0, pine), boxAt(-2.98, 0.45, -3.48, -0.4, 0.95, -3.42, pine));
    b.add(leaf((x, y, z) => Math.max(x + 2.98 + z + 3.48 - 0.5, -(x + 2.98), -(z + 3.48), Math.abs(y - 1.72) - 0.02), [-3, 1.7, -3.5], [-2.4, 1.74, -2.9], dk), boxAt(-2.82, 1.74, -3.34, -2.8, 2.06, -3.32, dk), boxAt(-2.88, 1.94, -3.34, -2.74, 1.96, -3.32, dk), ellipsoid(-2.7, 1.8, -3.25, 0.05, 0.07, 0.05, b.mat({ kind: "foliage", colour: "#3a5a30" })));
    b.add(coneY(-1.2, -1.6, 1.75, 1.95, 0.22, 0.05, b.mat({ kind: "painted-wood", colour: "#2e4a3a", flake: 0.02 })), cylY(-1.2, -1.6, 1.95, 2.6, 0.006, dk), sphere(-1.2, 1.77, -1.6, 0.05, b.mat({ kind: "plain", colour: "#fff2cc", emit: 2 }))); b.light({ x: -1.2, y: 1.72, z: -1.6, kelvin: 2700, power: 0.08 });
    b.place();

    return cam(3.4, 1.45, 66, 0.08); } },
  { id: "art-deco-lounge", label: "Art Deco lounge", mood: "interior-day", note: "Sunburst veneer, a chequered floor, tubular steel chairs and a long sideboard.", build: b => {
    room(b, { w: 8, d: 8, h: 3.6, wall: { kind: "veneer", colour: "#7a4a2a", pattern: "star" }, floor: { kind: "tile-floor", colour: "#1a1a1a", colour2: "#e8e2d4", unit: 0.5 }, ceiling: { kind: "plaster", colour: "#efe6d0" }, windows: [{ wall: "left", at: 0, sill: 0.5, w: 2.4, h: 2.6, glass: { kind: "curtain", unit: 0.4, course: 0.4 } }],
      trim: { mould: { kind: "painted-wood", colour: "#1a1614" }, skirting: 0.12, cornice: 0.12, curtains: { kind: "velvet", colour: "#c8a878" }, pictures: [{ wall: "right", at: -0.6, y: 1.8, w: 1.0, h: 0.7, frame: { kind: "steel" } }] } });
    put(b, "sideboard", 0.5, -3.7); put(b, "wassily-chair", -1.2, -0.6, 30); put(b, "wassily-chair", 1.2, -0.6, -30);
    // a round mirror over the sideboard, fluted uplighters either side, a lacquered vase, a stepped geometric rug
    const gilt = b.mat({ kind: "gold" }), mirror = b.mat({ kind: "glass" }), lac = b.mat({ kind: "enamel", colour: "#1a1a1a" }), frost = b.mat({ kind: "plain", colour: "#fff0d0", emit: 1.6 });
    b.add(cylZ(0.5, 1.75, -3.99, -3.95, 0.55, gilt), cylZ(0.5, 1.75, -3.97, -3.94, 0.5, mirror), revolve(0.95, -3.7, 0.75, 1.1, t => 0.06 + 0.05 * Math.sin(Math.PI * t), 0.12, lac));
    for (const x of [-1.6, 2.6]) { b.add(revolve(x, -3.6, 0, 1.7, t => 0.05 + 0.03 * Math.exp(-t * 8) + 0.004 * Math.cos(Math.atan2(0, 1) + t * 80), 0.1, gilt, 0, 2), revolve(x, -3.6, 1.7, 1.85, t => 0.06 + 0.16 * t, 0.23, frost)); b.light({ x, y: 1.9, z: -3.6, kelvin: 2800, power: 0.08 }); }
    rug(b, 0, -0.9, 3.2, 2.4, { kind: "rug", colour: "#c8b48a", colour2: "#1a1a1a" });
    return cam(4.6, 1.5, 64, 0.12); } },
  { id: "mid-century-living", label: "Mid-century living room", mood: "interior-day", note: "White walls, oak floor and wool rug, a moulded plywood lounge chair, a teak sideboard under a wide window.", build: b => {
    room(b, { view: "garden", w: 8, d: 8, h: 2.8, wall: { kind: "plaster", colour: "#f1eee6", flake: 0.01 }, floor: { kind: "floorboards", colour: "#a8784a" }, windows: [{ wall: "back", at: 0, sill: 0.4, w: 4.4, h: 2.1, glass: { kind: "glass" } }],
      trim: { mould: { kind: "painted-wood", colour: "#f1eee6" }, skirting: 0.07, bars: [4, 1], curtains: { kind: "fabric", colour: "#e8dfcc", colour2: "#e2d8c4", pattern: "plain" }, pictures: [{ wall: "right", at: -1.0, y: 1.6, w: 0.9, h: 0.65, frame: { kind: "oak", colour: "#c8a070" } }] } });
    rug(b, 0, 0, 2.8, 2.2, { kind: "jute", colour: "#c8b896", unit: 0.03 }); put(b, "lounge-chair", -1.2, 0.1, 35); put(b, "sideboard", 1.5, -3.75);
    // a low teak sofa facing the window, a coffee table with records and a bowl, an arc lamp, a tall rubber plant, a record player on the sideboard
    const teak = b.mat({ kind: "veneer", colour: "#8a5530" }), wool = b.mat({ kind: "fabric", colour: "#4a6a6a", colour2: "#46646a", pattern: "plain" }), mustard = b.mat({ kind: "fabric", colour: "#c8962a", pattern: "plain" });
    b.add(boxAt(0.3, 0.18, 1.5, 2.5, 0.24, 2.3, teak), boxAt(0.35, 0.24, 1.55, 2.45, 0.42, 2.25, wool, 0, 0.04), boxAt(0.35, 0.42, 2.0, 2.45, 0.8, 2.28, wool, 0, 0.06), boxAt(0.6, 0.42, 1.85, 0.95, 0.7, 2.02, mustard, 0, 0.06));
    for (const [lx, lz] of [[0.4, 1.6], [2.4, 1.6], [0.4, 2.2], [2.4, 2.2]] as const) b.add(capsule(lx, 0.18, lz, lx + (lx < 1 ? -0.04 : 0.04), 0, lz + (lz < 2 ? -0.04 : 0.04), 0.018, teak));
    b.add(boxAt(0.6, 0.36, 0.0, 1.9, 0.4, 0.7, teak, 0, 0.01));
    for (const [lx, lz] of [[0.7, 0.1], [1.8, 0.1], [0.7, 0.6], [1.8, 0.6]] as const) b.add(capsule(lx, 0.36, lz, lx + (lx < 1 ? -0.03 : 0.03), 0, lz + (lz < 0.3 ? -0.03 : 0.03), 0.016, teak));
    b.add(boxAt(0.8, 0.4, 0.1, 1.11, 0.415, 0.41, b.mat({ kind: "plain", colour: "#c84a2a" })), boxAt(0.82, 0.415, 0.12, 1.13, 0.42, 0.43, b.mat({ kind: "plain", colour: "#2a3a5a" })), cut(revolve(1.5, 0.4, 0.4, 0.5, t => 0.08 + 0.05 * t, 0.13, b.mat({ kind: "enamel", colour: "#e8e2d4" })), [revolve(1.5, 0.4, 0.41, 0.52, t => 0.07 + 0.05 * t, 0.12, 0)]));
    const brass = b.mat({ kind: "brass", colour: "#c09a4e" }), shade = b.mat({ kind: "enamel", colour: "#e8e4dc" });
    b.add(cylY(3.3, 1.4, 0, 0.05, 0.18, b.mat({ kind: "marble", colour: "#e6e0d4" })));
    // the arc rises from its marble foot and ends over the table, where the shade hangs from it
    const aEnd = Math.acos(1 - 1.55 / 1.8), arc = (a: number): [number, number, number] => [3.3 - 1.8 * (1 - Math.cos(a)), 0.05 + 2.0 * Math.sin(a), 1.4 - 0.4 * (1 - Math.cos(a))];
    for (let k = 0; k < 10; k++) b.add(capsule(...arc((k / 10) * aEnd), ...arc(((k + 1) / 10) * aEnd), 0.012, brass));
    const [ex, ey, ez] = arc(aEnd);
    b.add(capsule(ex, ey, ez, ex, ey - 0.12, ez, 0.008, brass), cut(sphere(ex, ey - 0.3, ez, 0.2, shade), [sphere(ex, ey - 0.3, ez, 0.19, 0), boxAt(ex - 0.35, ey - 0.65, ez - 0.35, ex + 0.35, ey - 0.35, ez + 0.35, 0)]), sphere(ex, ey - 0.33, ez, 0.06, b.mat({ kind: "plain", colour: "#fff2d0", emit: 2 })));
    b.light({ x: ex, y: ey - 0.37, z: ez, kelvin: 2700, power: 0.08 });
    b.add(revolve(-3.3, -3.3, 0, 0.45, t => 0.17 + 0.03 * t, 0.2, b.mat({ kind: "enamel", colour: "#d8d0c0" })), capsule(-3.3, 0.45, -3.3, -3.25, 1.6, -3.25, 0.015, b.mat({ kind: "oak", colour: "#5a4a2a" })));
    for (let k = 0; k < 11; k++) { const a = k * 2.4, y = 0.7 + k * 0.09; b.add(ellipsoid(-3.3 + Math.cos(a) * 0.2, y, -3.3 + Math.sin(a) * 0.2, 0.13, 0.03, 0.08, b.mat({ kind: "foliage", colour: "#2f4a2a" }))); }
    b.add(boxAt(1.2, 0.75, -3.85, 1.7, 0.85, -3.5, teak), cylY(1.42, -3.67, 0.85, 0.86, 0.15, b.mat({ kind: "plain", colour: "#1a1a1a" })));
    b.place();
    return cam(4.6, 1.4, 66, 0.08, 0.3, 6); } },
  { id: "washitsu", label: "Japanese shoin room", mood: { ...MOODS["interior-day"], sunElevation: 26, sunAzimuth: 68, sunPower: 4.0, burn: 5 }, dust: 0.3, note: "Eight Kyōma mats laid so no four corners meet; a tokonoma with a natural post, scroll and flower beside staggered chigaidana shelves; fusuma painted in ink under a shippō ranma; shoji slid open onto the engawa, a stone lantern and a maple.", build: b => {
    const w = washitsu(b);
    put(b, "zataku", 0.25, -0.15, 90); put(b, "floor-cushions", -0.6, -0.15, 90); put(b, "hibachi", 1.3, 0.9); put(b, "andon", -1.55, 1.45);
    return { ...cam(1.7, 1.05, 70, 0.12, -1.35, 32), interiorBox: w.interiorBox }; } },
  { id: "chashitsu", label: "Tea room (chashitsu)", mood: { ...MOODS["interior-day"], sunElevation: 30, sunAzimuth: 80, sunPower: 3.6, ambient: 0.5, key: 0.24, skyTop: "#a9b6c4" }, dust: 0.1, note: "Four and a half mats round a sunken hearth whose iron kettle sits over charcoal; earth walls with a paper wainscot, windows that show their bamboo lattice, a low ceiling sloping over bamboo rafters, a small tokonoma, the crawl-in door.", build: b => {
    const w = chashitsu(b);
    return { ...cam(1.35, 1.0, 84, -0.28, 0.85, -27), interiorBox: w.interiorBox }; } },
  { id: "minka-irori", label: "Farmhouse irori room (minka)", mood: { ...MOODS["interior-day"], sunElevation: 32, sunAzimuth: 168, sunPower: 4.4, ambient: 0.3, key: 0.15, burn: 0.9 }, dust: 0.28, note: "A sunken hearth with logs burning in ash, a carp-locked pot hook holding an iron pot, fish grilling on skewers; floors polished black, curved log beams and bamboo rafters under soot-dark thatch; a kamidana; one barred window letting sun into the smoke.", build: b => {
    const w = minkaIrori(b);
    put(b, "floor-cushions", -1.5, 0.2, 90); put(b, "tansu", 3.2, -1.4, -90);
    return { ...cam(2.0, 1.05, 78, 0.16, 1.5, -24), interiorBox: w.interiorBox }; } },
  { id: "scholar-studio", label: "Chinese scholar's studio", mood: "interior-day", note: "White walls and a grey brick floor; a landscape scroll over an altar table set with a scholar's rock, a brush pot and a potted pine; a moon window of ice-ray lattice; horseshoe and official's hat chairs, a round-corner cabinet, a screen.", build: b => {
    room(b, { w: 8, d: 8, h: 3.6, wall: { kind: "plaster", colour: "#ece6d8", flake: 0.03 }, floor: { kind: "setts", colour: "#7c7a74", unit: 0.4 }, ceiling: { kind: "boards", colour: "#5a3e28" }, beams: 1.0, windows: [{ wall: "left", at: -0.6, sill: 0.8, w: 1.8, h: 1.8, glass: { kind: "chinese-screen" } }], trim: { mould: { kind: "painted-wood", colour: "#4a2c1c", flake: 0.03 }, skirting: 0.12 } });
    kakejiku(b, 0, -4, 3.05, 0.78, 2.0); b.add(...moonWindow(b, 4, -1.3, 1.55, 0.85, -1)); b.portals.push({ x: 4.0, y: 1.55, z: -1.3, axis: "x", hw: 0.6, hh: 0.6, tint: "paper" }); b.place();
    put(b, "altar-table", 0, -3.6); put(b, "official-hat-chair", -0.8, -1.4, 20); put(b, "ming-horseshoe", 0.9, -1.2, -20); put(b, "round-corner-cabinet", 3.2, -3.5, -30); put(b, "folding-screen", -2.6, -2.6, 50);
    // on the altar table: a scholar's rock on a carved stand, a bamboo brush pot, a pine in a shallow pot, a stack of thread-bound books
    const rock = b.mat({ kind: "rock", colour: "#6a6a66" }), stand = b.mat({ kind: "oak", colour: "#3a2014" }), bam = b.mat({ kind: "cane", colour: "#b89a60" }), pot = b.mat({ kind: "enamel", colour: "#4a5a6a" }), pine = b.mat({ kind: "foliage", colour: "#3a5030" }), blue = b.mat({ kind: "fabric", colour: "#2a3a5a", pattern: "plain" });
    b.add(boxAt(-0.82, 0.9, -3.68, -0.5, 0.95, -3.5, stand), cut(sculpt([{ a: [-0.66, 1.05, -3.6], e: [0.1, 0.12, 0.07] }, { a: [-0.62, 1.22, -3.6], e: [0.06, 0.1, 0.05] }, { a: [-0.7, 1.3, -3.62], e: [0.04, 0.06, 0.04] }], 0.04, rock), [sphere(-0.64, 1.12, -3.55, 0.035, 0), sphere(-0.68, 1.24, -3.57, 0.022, 0)]));
    b.add(cut(cylY(0.45, -3.6, 0.9, 1.06, 0.06, bam), [cylY(0.45, -3.6, 0.92, 1.1, 0.05, 0)]), ...[0, 1, 2, 3].map(k => capsule(0.45 + 0.02 * Math.cos(k * 1.6), 0.95, -3.6 + 0.02 * Math.sin(k * 1.6), 0.45 + 0.05 * Math.cos(k * 1.6), 1.22, -3.6 + 0.05 * Math.sin(k * 1.6), 0.005, stand)));
    b.add(boxAt(0.7, 0.9, -3.72, 0.98, 0.95, -3.48, pot), sculpt([{ a: [0.8, 0.95, -3.6], b: [0.9, 1.12, -3.6], r1: 0.015, r2: 0.01 }, { a: [0.9, 1.12, -3.6], b: [0.76, 1.2, -3.58], r1: 0.01, r2: 0.006 }], 0.01, stand), ellipsoid(0.76, 1.22, -3.58, 0.09, 0.035, 0.07, pine), ellipsoid(0.93, 1.16, -3.6, 0.07, 0.03, 0.06, pine));
    for (let k = 0; k < 3; k++) b.add(boxAt(-0.25 + k * 0.01, 0.9 + k * 0.025, -3.68, 0.0 + k * 0.01, 0.924 + k * 0.025, -3.5, blue));
    b.place();
    return cam(4.6, 1.5, 64, 0.12, 0, 8); } },
  { id: "moroccan-salon", label: "Moroccan salon", mood: "interior-day", note: "A zellige dado under a carved plaster frieze of small arches, a painted cedar frieze at the ceiling, long low banquettes, a pierced brass lantern, mint tea on a brass tray table.", build: b => {
    room(b, { w: 7, d: 7, h: 4, wall: { kind: "plaster", colour: "#e2c09a", flake: 0.02 }, floor: { kind: "tile-floor", colour: "#2f6f73", colour2: "#efe7d3", unit: 0.25 }, ceiling: { kind: "polychrome", colour: "#8a2a1e" }, windows: [{ wall: "back", at: 0, sill: 0.6, w: 1.4, h: 2.6, shape: "horseshoe", glass: { kind: "stained", pattern: "star", emit: 0.8 } }] });
    const zel = b.mat({ kind: "zellige", colour: "#2f6f73", colour2: "#efe7d3", unit: 0.09, pattern: "star" }), geb = b.mat({ kind: "plaster", colour: "#efe2c8", flake: 0 }), cedar = b.mat({ kind: "polychrome", colour: "#6a3a22" });
    b.add(cut(boxAt(-3.5, 0, -3.5, 3.5, 1.1, -3.46, zel), [boxAt(-0.72, 0.55, -3.6, 0.72, 1.2, -3.3, 0)]), boxAt(-3.5, 0, -3.5, -3.46, 1.1, 3.5, zel), boxAt(3.46, 0, -3.5, 3.5, 1.1, 3.5, zel));
    // the carved plaster frieze: a band of small horseshoe arches cut into the gebs, then the cedar frieze under the ceiling
    for (const [x0, x1] of [[-3.5, -0.75], [0.75, 3.5]] as const) b.add(cut(boxAt(x0, 1.1, -3.5, x1, 1.55, -3.44, geb), [repeatX(opening(x0 + 0.12, 1.16, 0.16, 0.18, "horseshoe", -3.6, -3.46), 0.22, Math.floor((x1 - x0) / 0.22))]));
    for (const s of [-1, 1]) b.add(cut(boxAt(s * 3.44 - 0.03, 1.1, -3.5, s * 3.44 + 0.03, 1.55, 3.5, geb), [repeatZ(opening(-3.38, 1.16, 0.16, 0.18, "horseshoe", s * 3.44 - 0.1, s * 3.44 + 0.1, "x"), 0.22, 31)]));
    b.add(boxAt(-3.5, 3.55, -3.5, 3.5, 4.0, -3.4, cedar), boxAt(-3.5, 3.55, -3.5, -3.4, 4.0, 3.5, cedar), boxAt(3.4, 3.55, -3.5, 3.5, 4.0, 3.5, cedar));
    // long low banquettes along the walls, bolsters against them
    const mat = b.mat({ kind: "fabric", colour: "#7a1e22", colour2: "#c8902a", unit: 0.06 }), bol = b.mat({ kind: "velvet", colour: "#2a3a6a" });
    for (const [x0, x1] of [[-3.4, -0.9], [0.9, 3.4]] as const) b.add(boxAt(x0, 0, -3.44, x1, 0.32, -2.74, mat, 0, 0.04), capsule(x0 + 0.1, 0.48, -3.32, x1 - 0.1, 0.48, -3.32, 0.14, bol));
    b.add(boxAt(-3.44, 0, -2.6, -2.74, 0.32, 1.5, mat, 0, 0.04), capsule(-3.32, 0.48, -2.5, -3.32, 0.48, 1.4, 0.14, bol));
    b.place();
    rug(b, 0, -0.8, 2.6, 3.2);
    table(b, 0, -1.2, 0.8, 0.8, 0.4, { kind: "brass", colour: "#b08a45" }, true); b.place();
    // mint tea: a silver pot and small painted glasses on the tray
    const silver = b.mat({ kind: "steel" }), glasses = [b.mat({ kind: "stained", colour: "#2a6a4a", emit: 0.2 }), b.mat({ kind: "stained", colour: "#8a2a3a", emit: 0.2 })];
    b.add(revolve(-0.1, -1.2, 0.4, 0.58, t => 0.07 * Math.sin(Math.PI * (0.15 + t * 0.7)) + 0.015 + (t > 0.8 ? 0.01 : 0), 0.085, silver), capsule(-0.04, 0.46, -1.2, 0.06, 0.55, -1.2, 0.008, silver), sphere(-0.1, 0.6, -1.2, 0.015, silver));
    for (let k = 0; k < 4; k++) b.add(cylY(0.12 + (k % 2) * 0.09, -1.28 + Math.floor(k / 2) * 0.12, 0.4, 0.48, 0.025, glasses[k % 2]));
    // the pierced brass lantern hung on a chain, its light thrown through star-shaped holes
    const br = b.mat({ kind: "brass", colour: "#b8903e" }), glow = b.mat({ kind: "plain", colour: "#ffd890", emit: 3 });
    b.add(cut(revolve(0, -1.0, 2.2, 2.85, t => 0.24 * Math.sin(Math.PI * (0.1 + t * 0.8)) + 0.02, 0.27, br), [leaf((x, y, z) => { const a = Math.atan2(z + 1.0, x) * 8, yy = (y - 2.2) * 22; return (Math.abs(Math.sin(a)) * Math.abs(Math.sin(yy)) - 0.55) * -0.02; }, [-0.3, 2.25, -1.3], [0.3, 2.8, -0.7], 0)]), sphere(0, 2.52, -1.0, 0.17, glow), coneY(0, -1.0, 2.85, 3.0, 0.08, 0.01, br), cylY(0, -1.0, 3.0, 4.0, 0.006, br));
    b.light({ x: 0, y: 2.5, z: -1.0, kelvin: 2200, power: 0.18 }); b.place();
    return cam(3.2, 1.3, 70, 0.14, 0.6, -6); } },
  { id: "japandi-living", label: "Japandi living room", mood: { ...MOODS["interior-day"], sunElevation: 22, sunAzimuth: -70, sunPower: 3.8, burn: 3 }, dust: 0.25, note: "After the Japandi rooms pinned in their thousands: limewashed walls, wide pale oak, a low linen sofa, an oak drum table, a paper globe, a slatted screen, an olive tree, a jute rug and sheer linen at a wide window.", build: b => {
    room(b, { view: "garden", w: 7, d: 7, h: 2.8, wall: { kind: "limewash", colour: "#e6ddcf", flake: 0.0 }, floor: { kind: "floorboards", colour: "#c4a27a" }, ceiling: { kind: "plaster", colour: "#ece6da" }, windows: [{ wall: "left", at: -0.6, sill: 0.25, w: 2.6, h: 2.2, glass: { kind: "glass" } }],
      trim: { mould: { kind: "oak", colour: "#b8946a", age: 0.02 }, skirting: 0.05, bars: [3, 1], curtains: { kind: "fabric", colour: "#efe8da", colour2: "#e9e1d2", pattern: "plain" } } });
    rug(b, 0.1, -0.6, 2.6, 2.0, { kind: "jute", colour: "#b8a07a" });
    put(b, "platform-sofa", 0.4, -2.75); put(b, "round-coffee-table", 0.3, -0.9); put(b, "potted-olive", -2.6, -2.8); put(b, "floor-cushions", -1.1, 0.4, 20);
    buildFurniture(b, "paper-pendant"); b.place({ x: 0.3, y: 0.85, z: -0.9 });
    const slat = b.mat({ kind: "oak", colour: "#a8845a", age: 0.02 });
    b.add(repeatX(boxAt(2.0, 0, -3.5, 2.04, 2.8, -1.8, slat), 0.09, 14)); b.place();
    chabana(b, -2.8, 0.5, 1.4, 1.5); b.add(boxAt(-3.45, 0, 0.9, -2.55, 0.45, 2.3, b.mat({ kind: "oak", colour: "#b08a5e", age: 0.05 }))); b.place();
    return cam(3.0, 1.35, 68, 0.06, 1.0, -14); } },
  { id: "academia-library", label: "Dark academia library", mood: { ...MOODS["candle"], sunPower: 0.2, sunElevation: 6, ambient: 0.12, key: 0.11 }, dust: 0, note: "After the dark-academia libraries of mood boards: bottle-green walls, books to the ceiling, a library ladder on a brass rail, a leather wing chair by the fire, a banker's lamp, a globe, a Persian rug, candles and a dusk window.", build: b => {
    room(b, { view: "garden", w: 7, d: 8, h: 3.6, wall: { kind: "plaster", colour: "#26372c", flake: 0.0 }, floor: { kind: "floorboards", colour: "#3a2a1c" }, ceiling: { kind: "plaster", colour: "#d8ccb0" }, windows: [{ wall: "left", at: 1.4, sill: 0.6, w: 1.2, h: 2.4, glass: { kind: "glass" } }],
      trim: { mould: { kind: "oak", colour: "#2e1e14" }, skirting: 0.24, cornice: 0.22, dado: 0.95, dadoMat: { kind: "oak", colour: "#33231a" }, bars: [3, 4], curtains: { kind: "velvet", colour: "#5a1e1e" }, pictures: [{ wall: "left", at: -1.6, y: 2.2, w: 0.8, h: 1.0 }] } });
    rug(b, 0, -0.6, 3.0, 3.8);
    for (const x of [-3.0, -1.5, 0.0, 1.5]) { put(b, "bookcase", x + 0.75, -3.65); }
    shelves(b, 3.15, 3.5, -3.5, 3.4, "books", 0.34); b.place();
    const br = b.mat({ kind: "brass", colour: "#b8954a" }), ld = b.mat({ kind: "oak", colour: "#3a2416" });
    b.add(capsule(-3.4, 3.0, -3.25, 3.0, 3.0, -3.25, 0.014, br));
    for (const s2 of [-1, 1]) b.add(capsule(-0.6 + s2 * 0.22, 3.0, -3.27, -0.6 + s2 * 0.24, 0.0, -2.4, 0.022, ld));
    for (let k = 1; k < 10; k++) b.add(capsule(-0.82, 3.0 - k * 0.3, -3.27 + k * 0.087, -0.38, 3.0 - k * 0.3, -3.27 + k * 0.087, 0.014, ld));
    b.place();
    put(b, "fireplace", 3.32, -0.6, -90); put(b, "wing-chair", 1.9, 0.1, -120); put(b, "pedestal-desk", -1.6, 0.2, 15); put(b, "globe", 0.2, -2.0, 0);
    buildFurniture(b, "bankers-lamp"); b.place({ x: -1.8, y: 0.76, z: 0.0, yaw: 15 });
    candle(b, 3.2, 1.33, -1.1, 0.05); candle(b, 3.2, 1.33, -0.1, 0.05); b.place();
    return cam(3.6, 1.5, 70, 0.1, -0.6, 8); } },
  { id: "cottage-kitchen", label: "Cotswold cottage kitchen", mood: { ...MOODS["interior-day"], sunElevation: 24, sunAzimuth: -55, sunPower: 4.0, burn: 2.6 }, dust: 0.4, note: "After the cottage kitchens of Cotswoldcore boards: low oak beams, flagstones, a cream range in the inglenook, a Belfast sink under the window, sage cabinets with oak tops, a dresser of blue-and-white plates, copper pans, herbs drying.", build: b => {
    room(b, { view: "garden", w: 6.5, d: 6.5, h: 2.5, wall: { kind: "limewash", colour: "#efe6d2", flake: 0.12 }, floor: { kind: "flags", colour: "#8a8274", unit: 0.6 }, ceiling: { kind: "plaster", colour: "#ece2cc" }, beams: 0.8, windows: [{ wall: "left", at: -1.0, sill: 1.05, w: 1.0, h: 0.95, glass: { kind: "leaded" } }], trim: { mould: { kind: "painted-wood", colour: "#8a9a7c", flake: 0.06 }, curtains: { kind: "fabric", colour: "#e8e0d0", colour2: "#c8b8a0", pattern: "check", unit: 0.05 } } });
    // the inglenook: a stone fireplace under an oak bressumer, the range set in it
    const stone = b.mat({ kind: "ashlar", colour: "#c8b48a", course: 0.28, age: 0.6, soot: 1.2 }), oakB = b.mat({ kind: "oak", colour: "#3a2a1c", age: 0.6 });
    b.add(cut(boxAt(-1.0, 0, -3.25, 1.4, 2.5, -2.35, stone), [boxAt(-0.75, 0, -3.0, 1.15, 1.6, -2.3, 0)]), boxAt(-0.85, 1.6, -2.45, 1.25, 1.85, -2.25, oakB));
    b.place();
    put(b, "range-cooker", 0.2, -2.68);
    // the sink run under the window: sage cabinets, an oak worktop, the Belfast sink
    const sage = b.mat({ kind: "painted-wood", colour: "#8a9a7c", flake: 0.04 }), oakT = b.mat({ kind: "oak", colour: "#9a7048", age: 0.3 }), brass = b.mat({ kind: "brass", colour: "#b8954a" });
    b.add(boxAt(-3.25, 0, -2.6, -2.65, 0.88, 0.4, sage), boxAt(-3.25, 0.88, -2.62, -2.6, 0.92, 0.42, oakT));
    for (const z of [-2.2, -1.6, 0.0]) b.add(boxAt(-2.66, 0.1, z - 0.27, -2.64, 0.82, z + 0.27, sage), sphere(-2.63, 0.7, z + 0.2, 0.015, brass));
    b.place();
    put(b, "butler-sink", -2.95, -1.0, 90);
    put(b, "welsh-dresser", 3.0, -0.6, -90); put(b, "refectory-table", 0.4, 0.6, 0); put(b, "windsor-chair", -0.5, 1.15, 180); put(b, "windsor-chair", 1.3, 0.05, 0);
    // copper pans from a rack, herbs drying from the beam
    const cu = b.mat({ kind: "enamel", colour: "#a8562c" }), herb = b.mat({ kind: "foliage", colour: "#6a7a48" }), ir = b.mat({ kind: "iron", colour: "#1c1a18" });
    b.add(capsule(-0.4, 2.05, 0.6, 1.6, 2.05, 0.6, 0.015, ir));
    // each pan hangs by its handle, its copper bottom toward the room
    for (const [k, x] of [-0.2, 0.25, 0.7, 1.15].entries()) { const r = 0.09 + k * 0.02, yc = 1.86 - 0.32 - r; b.add(capsule(x, 2.05, 0.6, x, 2.0, 0.6, 0.006, ir), capsule(x, 2.0, 0.6, x, yc + r, 0.6, 0.012, cu), cut(cylZ(x, yc, 0.58, 0.64, r, cu), [cylZ(x, yc, 0.5, 0.625, r - 0.008, 0)])); }
    for (const z of [-1.2, -0.9, -0.6]) b.add(capsule(-1.6, 2.3, z, -1.6, 1.95, z, 0.004, b.mat({ kind: "hay", colour: "#8a7048" })), ellipsoid(-1.6, 1.9, z, 0.06, 0.12, 0.06, herb));
    b.add(revolve(0.9, 0.5, 0.78, 1.0, t => 0.07 + 0.03 * Math.sin(Math.PI * t), 0.1, b.mat({ kind: "enamel", colour: "#d8d0c0" })), ...[0, 1, 2, 3, 4, 5, 6].flatMap(k => { const a = k * 2.4, l = 0.22 + 0.06 * Math.sin(k * 1.3), tx = 0.9 + Math.cos(a) * 0.09, tz = 0.5 + Math.sin(a) * 0.09; return [capsule(0.9, 0.98, 0.5, tx, 0.98 + l, tz, 0.004, b.mat({ kind: "foliage", colour: "#5a6a3a" })), ellipsoid(tx, 0.98 + l + 0.03, tz, 0.016, 0.045, 0.016, b.mat({ kind: "foliage", colour: "#8a72b0" }))]; }));
    b.place();
    return cam(2.9, 1.5, 72, 0.06, 1.6, -22); } },
  { id: "gothic-nave", label: "Gothic nave", dust: 0.12, mood: { ...MOODS["interior-day"], sunElevation: 46, sunAzimuth: -62, sunPower: 4.6, ambient: 0.22, key: 0.1, burn: 0.9 }, note: "A three-storey nave after Chartres: compound piers, a pointed arcade, a triforium passage, a stained-glass clerestory in plate tracery under quadripartite rib vaults, a five-sided apse.", build: b => {
    const nv = gothicNave(b, { bays: 6 }), L = nv.length, B = L / 6;
    // rows of rush chairs either side of the centre aisle, facing east
    chairRows(b, 4.9, -5.2, 8, 22); chairRows(b, -1.3, -5.2, 8, 22); b.place();
    // the pulpit against a north pier, its stair toward the west; the eagle lectern at the head of the nave
    put(b, "pulpit", -nv.span / 2 + 0.6, -B * 3 + 0.2, -90); put(b, "eagle-lectern", 2.4, -L + 2.2, 0);
    put(b, "altar-reredos", 0, -L - 1.6, 0);
    // two coronas hung on long chains from the vault, candles lit
    for (const z of [-B * 2.2, -B * 4.3]) { buildFurniture(b, "corona"); b.place({ x: 0, y: 6.8, z }); b.add(cylY(0, z, 10, nv.crown - 0.2, 0.012, b.mat({ kind: "iron", colour: "#1c1a18" }))); b.place(); }
    put(b, "votive-stand", -nv.span / 2 - 3.2, -B * 2.5, 90); put(b, "votive-stand", nv.span / 2 + 3.2, -B * 4.5, -90); put(b, "font", nv.span / 2 + 3, -3.4, 0);
    return cam(-3.0, 1.6, 74, 0.5, -0.45); } },
];
/** A painted room by id. */
export function roomScene(id: string, seed = 5): ArchScene {
  const r = ROOMS.find(x => x.id === id);
  if (!r) throw new Error(`Unknown room ${id}`);
  const b = new SceneBuilder(seed), { interiorBox, ...c } = r.build(b), m = typeof r.mood === "string" ? MOODS[r.mood] : r.mood;
  // exposed for the room, as an interior photographer would: a bright view through the windows may burn out
  return b.scene(c, { ...m, burn: m.burn ?? (m.night > 0.5 ? undefined : 2.4) }, { dust: r.dust ?? 0.35, interior: true, interiorBox: interiorBox ?? b.interiorBox });
}
