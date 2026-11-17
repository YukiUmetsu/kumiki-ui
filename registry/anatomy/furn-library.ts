/**
 * INTERIOR1 library: every furniture piece alone on the parchment studio cove (`pieceScene`), and painted rooms of
 * ten periods and places (`ROOMS`, `roomScene`) furnished with the same pieces at their measured sizes, lit by their
 * windows, fires, candles and lamps.
 */
import type { ArchScene, CameraSpec, MoodId } from "./arch-paint";
import { SceneBuilder, boxAt, cylY } from "./arch-kit";
import { studioScene } from "./arch-modules";
import { candle, hearth, room, table } from "./arch-kit-civic";
import { latticeScreen } from "./arch-kit-chinese";
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

export interface RoomEntry { id: string; label: string; mood: MoodId; build: (b: SceneBuilder) => CameraSpec; note: string }
const put = (b: SceneBuilder, id: string, x: number, z: number, yaw = 0) => { buildFurniture(b, id); b.place({ x, z, yaw }); };
const cam = (z: number, y = 1.5, fov = 64, shift = 0.12, x = 0, yaw = 0): CameraSpec => ({ x, y, z, fov, shift, yaw });
const rug = (b: SceneBuilder, x: number, z: number, w: number, l: number, s: SurfaceSpec = { kind: "rug", unit: 1, course: 1 }) => { b.add(boxAt(x - w / 2, 0, z - l / 2, x + w / 2, 0.012, z + l / 2, b.mat({ ...s, unit: w, course: l }))); b.place(); };

/** Painted rooms, furnished from the piece library. */
export const ROOMS: readonly RoomEntry[] = [
  { id: "tudor-hall", label: "Tudor hall", mood: "interior-day", note: "Dark oak panelling, a great hearth, a refectory table, a settle by the fire.", build: b => {
    room(b, { w: 9, d: 10, h: 4.4, wall: { kind: "boards", colour: "#4a3424", course: 0.4, age: 0.05 }, floor: { kind: "flags", colour: "#8a8478", unit: 0.7 }, beams: 1.2, windows: [{ wall: "left", at: -1, sill: 1.1, w: 1.6, h: 2.0, glass: { kind: "leaded" } }] });
    hearth(b, 1.5, -5, 2.2, 1.6, { kind: "rubble", colour: "#8a7a62", soot: 2.4 }, 1.2); b.place();
    put(b, "refectory-table", -0.4, 0.5); put(b, "settle", 2.6, -2.2, -90); put(b, "blanket-chest", -3.3, -3.6, 90);
    candle(b, -1, 0.78, 0.5, 0.05); candle(b, 0.4, 0.78, 0.4, 0.05); b.place();
    return cam(6.2, 1.55, 66, 0.15); } },
  { id: "georgian-drawing-room", label: "Georgian drawing room", mood: "interior-day", note: "Pale panelled walls, a centred fireplace, chairs against the walls, a chandelier, a longcase clock.", build: b => {
    room(b, { w: 8, d: 9, h: 3.8, wall: { kind: "plaster", colour: "#b8c6ad", flake: 0.02 }, floor: { kind: "floorboards", colour: "#6a4a32" }, ceiling: { kind: "plaster", colour: "#efeadc" }, windows: [{ wall: "left", at: -1.5, sill: 0.6, w: 1.2, h: 2.4, glass: { kind: "glass" } }, { wall: "left", at: 1.5, sill: 0.6, w: 1.2, h: 2.4, glass: { kind: "glass" } }] });
    rug(b, 0, -0.5, 3.6, 4.6); put(b, "fireplace", 0, -4.5); put(b, "chippendale-chair", -1.4, -1.2, 25); put(b, "chippendale-chair", 1.4, -1.2, -25); put(b, "longcase-clock", 3.6, -4.2, -20);
    buildFurniture(b, "chandelier"); b.place({ y: 2.4, z: -0.6 });
    return cam(5.5, 1.5, 64, 0.2); } },
  { id: "victorian-parlour", label: "Victorian parlour", mood: "candle", note: "Deep red walls, a buttoned Chesterfield, a pedestal desk under a leaded-glass lamp, books.", build: b => {
    room(b, { w: 7, d: 8, h: 3.4, wall: { kind: "plaster", colour: "#6a2a24", flake: 0.02 }, floor: { kind: "floorboards", colour: "#4a3424" }, ceiling: { kind: "plaster", colour: "#e6dcc4" }, beams: 0 });
    rug(b, 0, 0, 3.4, 4.2); put(b, "chesterfield", -0.6, 0.6, 0); put(b, "pedestal-desk", 1.6, -2.6, -15); put(b, "bookcase", -2.2, -3.7); put(b, "fireplace", 0.6, -3.95);
    buildFurniture(b, "tiffany-lamp"); b.place({ x: 2.0, y: 0.76, z: -2.6 }); candle(b, -0.6, 1.33, -3.85, 0.05); b.place();
    return cam(4.6, 1.45, 66, 0.12); } },
  { id: "shaker-room", label: "Shaker room", mood: "interior-day", note: "Plain white walls, a peg rail, ladder-back chairs, a gateleg table on scrubbed boards.", build: b => {
    room(b, { w: 6, d: 7, h: 3, wall: { kind: "plaster", colour: "#efeadf", flake: 0.03 }, floor: { kind: "floorboards", colour: "#b38a5a" }, windows: [{ wall: "left", at: -0.5, sill: 0.8, w: 1.1, h: 1.6, glass: { kind: "glass" } }] });
    b.add(boxAt(-3, 1.75, -3.5, 3, 1.85, -3.44, b.mat({ kind: "oak", colour: "#7a5a3a" }))); for (let i = 0; i < 9; i++) b.add(cylY(-2.6 + i * 0.65, -3.42, 1.76, 1.84, 0.015, b.mat({ kind: "oak", colour: "#7a5a3a" })));
    b.place(); put(b, "gateleg-table", 0, -0.5); put(b, "ladder-back", -0.9, -0.4, 90); put(b, "ladder-back", 0.9, -0.6, -90); put(b, "ladder-back", 0.2, 0.55, 180);
    return cam(4.2, 1.5, 62, 0.08); } },
  { id: "alpine-stube", label: "Alpine Stube", mood: "interior-day", note: "A pine-lined room round a tiled stove, a corner bench and a table.", build: b => {
    room(b, { w: 6, d: 7, h: 2.6, wall: { kind: "boards", colour: "#b9935e", course: 0.16, age: 0.05 }, floor: { kind: "floorboards", colour: "#9a7448" }, ceiling: { kind: "boards", colour: "#a8834e" }, windows: [{ wall: "left", at: -1, sill: 0.9, w: 0.9, h: 0.9, glass: { kind: "glass" } }, { wall: "back", at: -1.6, sill: 0.9, w: 0.9, h: 0.9, glass: { kind: "glass" } }] });
    put(b, "tiled-stove", 1.9, -2.5, -30); put(b, "refectory-table", -1.2, -1.2, 90); put(b, "settle", -2.6, -1.2, 90);
    return cam(3.4, 1.45, 66, 0.08); } },
  { id: "art-deco-lounge", label: "Art Deco lounge", mood: "interior-day", note: "Sunburst veneer, a chequered floor, tubular steel chairs and a long sideboard.", build: b => {
    room(b, { w: 8, d: 8, h: 3.6, wall: { kind: "veneer", colour: "#7a4a2a", pattern: "star" }, floor: { kind: "tile-floor", colour: "#1a1a1a", colour2: "#e8e2d4", unit: 0.5 }, ceiling: { kind: "plaster", colour: "#efe6d0" }, windows: [{ wall: "left", at: 0, sill: 0.5, w: 2.4, h: 2.6, glass: { kind: "curtain", unit: 0.4, course: 0.4 } }] });
    put(b, "sideboard", 0.5, -3.7); put(b, "wassily-chair", -1.2, -0.6, 30); put(b, "wassily-chair", 1.2, -0.6, -30);
    return cam(4.6, 1.5, 64, 0.12); } },
  { id: "mid-century-living", label: "Mid-century living room", mood: "interior-day", note: "White walls, oak floor and wool rug, a moulded plywood lounge chair, a teak sideboard under a wide window.", build: b => {
    room(b, { w: 8, d: 8, h: 2.8, wall: { kind: "plaster", colour: "#f1eee6", flake: 0.01 }, floor: { kind: "floorboards", colour: "#a8784a" }, windows: [{ wall: "back", at: 0, sill: 0.4, w: 4.4, h: 2.1, glass: { kind: "glass" } }] });
    rug(b, 0, 0, 2.8, 2.2, { kind: "fabric", colour: "#d8cdb6", colour2: "#cfc3aa" }); put(b, "lounge-chair", -1, 0, 30); put(b, "sideboard", 1.5, -3.75);
    return cam(4.6, 1.4, 62, 0.08); } },
  { id: "washitsu", label: "Japanese washitsu", mood: "interior-day", note: "Tatami mats, shoji light, a staircase chest, a low table with cushions, a futon laid out.", build: b => {
    room(b, { w: 5.5, d: 5.5, h: 2.5, wall: { kind: "plaster", colour: "#cdb894", flake: 0.02 }, floor: { kind: "tatami-mat" }, ceiling: { kind: "boards", colour: "#8a6a48" }, windows: [{ wall: "left", at: 0, sill: 0.35, w: 3.6, h: 1.8, glass: { kind: "plain", colour: "#f0e8d2", emit: 0.6 } }] });
    b.add(latticeScreen(-2.75 + 0.02, 0.35, -2.75 + 0.06, 2.15, -1.8, 0.3, 0.02, 0.04, b.mat({ kind: "oak", colour: "#6a4e34" }))); b.place();
    put(b, "chabudai", 0, -0.2); put(b, "floor-cushions", -0.9, -0.3); put(b, "tansu", 1.6, -2.5); put(b, "futon", -1.3, 1.2, 90);
    return cam(3.4, 1.15, 66, 0.0); } },
  { id: "scholar-studio", label: "Chinese scholar's studio", mood: "interior-day", note: "White walls, a grey brick floor, an altar table under a scroll, horseshoe and official's hat chairs, a cabinet and a screen.", build: b => {
    room(b, { w: 8, d: 8, h: 3.6, wall: { kind: "plaster", colour: "#ece6d8", flake: 0.03 }, floor: { kind: "setts", colour: "#7c7a74", unit: 0.4 }, ceiling: { kind: "boards", colour: "#5a3e28" }, beams: 1.0, windows: [{ wall: "left", at: -0.6, sill: 0.8, w: 1.8, h: 1.8, glass: { kind: "plain", colour: "#efe4c8", emit: 0.5 } }] });
    b.add(boxAt(-0.5, 1.2, -3.98, 0.5, 2.9, -3.96, b.mat({ kind: "plain", colour: "#e2d6b4" }))); b.place();
    put(b, "altar-table", 0, -3.6); put(b, "official-hat-chair", -0.8, -1.4, 20); put(b, "ming-horseshoe", 0.9, -1.2, -20); put(b, "round-corner-cabinet", 3.2, -3.5, -30); put(b, "folding-screen", -2.6, -2.6, 50);
    return cam(4.6, 1.5, 64, 0.12); } },
  { id: "moroccan-salon", label: "Moroccan salon", mood: "interior-day", note: "A zellige dado, carved plaster, low banquettes of cushions and a brass lantern.", build: b => {
    room(b, { w: 7, d: 7, h: 4, wall: { kind: "plaster", colour: "#e2c09a", flake: 0.02 }, floor: { kind: "tile-floor", colour: "#2f6f73", colour2: "#efe7d3", unit: 0.25 }, ceiling: { kind: "polychrome", colour: "#8a2a1e" }, windows: [{ wall: "back", at: 0, sill: 0.6, w: 1.4, h: 2.6, shape: "horseshoe", glass: { kind: "stained", emit: 0.9 } }] });
    b.add(boxAt(-3.5, 0, -3.5, 3.5, 1.1, -3.46, b.mat({ kind: "zellige", colour: "#2f6f73", colour2: "#efe7d3", unit: 0.09, pattern: "star" }))); b.place();
    put(b, "floor-cushions", -1.8, -2.8); put(b, "floor-cushions", 1.0, -2.8); rug(b, 0, -0.8, 2.6, 3.2);
    table(b, 0, -1.2, 0.8, 0.8, 0.4, { kind: "brass", colour: "#b08a45" }, true); b.place();
    return cam(4.2, 1.3, 66, 0.1); } },
];
/** A painted room by id. */
export function roomScene(id: string, seed = 5): ArchScene {
  const r = ROOMS.find(x => x.id === id);
  if (!r) throw new Error(`Unknown room ${id}`);
  const b = new SceneBuilder(seed), c = r.build(b);
  return b.scene(c, r.mood, { dust: 0.6, interior: true });
}
