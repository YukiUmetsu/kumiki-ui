/**
 * ARCH1 storybook library: 100 structures and environments, each a recipe of modular parts painted by
 * `arch-paint.ts`. European vernacular first (British, French, Alpine, Low Countries, Italian, Iberian and
 * Mediterranean, Nordic), a select few from North Africa and the Middle East, historic engineering (Romanesque,
 * Gothic, castles, Baroque, Victorian iron and glass), rural and agrarian buildings, and lived-in interiors.
 *
 * Each entry records what it is (region, period, setting, scale), what it is made of and the human details that tell
 * its story, and builds its own scene: parts at their real sizes, a camera at a person's eye (verticals kept
 * vertical) and a light that suits it. What each entry learned from its references is in `note`; the sources are in
 * `docs/research/architecture-storybook-reference-study-2026-11-17.md`.
 */
import type { ArchScene, CameraSpec, Mood, MoodId } from "./arch-paint";
import { MOODS } from "./arch-paint";
import type { HouseSpec, WindowSpec } from "./arch-kit";
import { SceneBuilder, barrel, beam, bench, box, boxAt, capsule, clump, coneY, cut, cylY, cylZ, cypress, leaf, peaks, repeatX, repeatZ, dome, ellipsoid, firewood, gableRoof, gableWall, gardenWall, ground, hills, hipRoof, house, lamppost, onionDome, opening, pentRoof, revolve, sphere, spire, street, tower, tree, water } from "./arch-kit";
import { anvil, balance, breadRack, candlestick, clockParts, flourSack, forge, hangingLantern, herbBunch, jarRow, magnifierLamp, peel, sleepingCat, stool, tankard, wallClock, workbench, writingDesk } from "./arch-kit-props";
import { archRoll, sculpt } from "./arch-sdf";
import type { Node } from "./arch-sdf";
import { arcade, bridge, candle, chairRows, church, octShaft, curtainWall, domeChurch, gatehouse, glasshouse, gothicNave, hearth, kasbahTower, keep, lighthouse, room, shelves, staveChurch, table, trullo, waterWheel, windmill } from "./arch-kit-civic";
import type { SurfaceSpec } from "./arch-surface";

export type LibraryGroup = "british" | "french" | "alpine" | "low-countries" | "italian" | "mediterranean" | "nordic" | "middle-east" | "historic" | "rural" | "interior";
export interface LibraryEntry {
  id: string;
  label: string;
  group: LibraryGroup;
  region: string;
  era: string;
  setting: "rural" | "village" | "town" | "city" | "coast" | "mountain" | "riverside" | "garden";
  view: "exterior" | "interior";
  scale: "humble" | "domestic" | "civic" | "monumental";
  materials: readonly string[];
  /** The lived-in details that tell its story. */
  story: readonly string[];
  /** What the references taught about how it is built. */
  note: string;
  mood: MoodId;
  build: (seed?: number) => ArchScene;
}

export const LIBRARY_GROUPS: readonly { id: LibraryGroup; label: string }[] = [
  { id: "british", label: "British Isles" }, { id: "french", label: "France" }, { id: "alpine", label: "German-speaking and Alpine" },
  { id: "low-countries", label: "Low Countries" }, { id: "italian", label: "Italy" }, { id: "mediterranean", label: "Iberia and the Mediterranean" },
  { id: "nordic", label: "Nordic and Eastern Europe" }, { id: "middle-east", label: "North Africa and the Middle East" },
  { id: "historic", label: "Historic engineering and monuments" }, { id: "rural", label: "Rural and agrarian" }, { id: "interior", label: "Lived-in interiors" },
];

// ---- Shared materials (sRGB colours; sizes in arch-surface.ts) ------------------------------------------------------------

const S = {
  cotswold: { kind: "coursed-rubble", colour: "#c9a66a", colour2: "#cdbb92", moss: 0.3, age: 0.6 } as SurfaceSpec,
  stoneSlate: { kind: "stone-slate", colour: "#968668", moss: 0.6, age: 0.6 } as SurfaceSpec,
  thatch: { kind: "thatch", colour: "#ad8f58", age: 0.35, moss: 0.2 } as SurfaceSpec,
  slate: { kind: "slate", colour: "#4b5058", age: 0.3 } as SurfaceSpec,
  purpleSlate: { kind: "slate", colour: "#4f4855", age: 0.4, moss: 0.2 } as SurfaceSpec,
  plainTile: { kind: "plain-tile", colour: "#8f5038", age: 0.6, moss: 0.35 } as SurfaceSpec,
  pantile: { kind: "pantile", colour: "#a85f3e", age: 0.55 } as SurfaceSpec,
  copper: { kind: "copper", age: 0.85 } as SurfaceSpec,
  zinc: { kind: "zinc", colour: "#7f8a94" } as SurfaceSpec,
  shingle: { kind: "shingle", colour: "#6a5c50", age: 0.7 } as SurfaceSpec,
  limewash: (colour = "#efe8d8", flake = 0.3, under: SurfaceSpec["under"] = "rubble"): SurfaceSpec => ({ kind: "limewash", colour, flake, under, age: 0.5 }),
  plaster: (colour: string, flake = 0.12): SurfaceSpec => ({ kind: "plaster", colour, flake, under: "brick", age: 0.45 }),
  frame: (infill: string, oak: string, pattern: SurfaceSpec["pattern"], storey = 2.7, sill = 0.9, spacing = 0.55): SurfaceSpec => ({ kind: "timber-frame", colour: infill, colour2: oak, pattern, storey, sill, spacing, age: 0.5 }),
  ashlar: (colour = "#d6c39b", course = 0.36): SurfaceSpec => ({ kind: "ashlar", colour, course, age: 0.45 }),
  rubble: (colour = "#a99c84", moss = 0.3): SurfaceSpec => ({ kind: "rubble", colour, moss, age: 0.6 }),
  brick: (colour = "#9b4f37", pattern: SurfaceSpec["pattern"] = "english"): SurfaceSpec => ({ kind: "brick", colour, pattern, age: 0.45 }),
  boards: (colour: string, age = 0.5): SurfaceSpec => ({ kind: "boards", colour, age }),
  log: (colour = "#8a6a48"): SurfaceSpec => ({ kind: "log", colour, age: 0.5 }),
  paint: (colour: string, flake = 0.2): SurfaceSpec => ({ kind: "painted-wood", colour, flake }),
};
const W = {
  leaded: (w = 0.8, h = 1.0, extra: Partial<WindowSpec> = {}): WindowSpec => ({ w, h, panes: [2, 2], glass: { kind: "leaded" }, frame: S.paint("#5a4a3a", 0.3), sill: { kind: "ashlar", colour: "#bfae8a" }, ...extra }),
  sash: (w = 1.0, h = 1.7, extra: Partial<WindowSpec> = {}): WindowSpec => ({ w, h, panes: [3, 4], frame: S.paint("#efebe2", 0.1), sill: { kind: "ashlar", colour: "#d9cfba" }, reveal: 0.12, ...extra }),
  shuttered: (shutter: string, w = 0.9, h = 1.35, extra: Partial<WindowSpec> = {}): WindowSpec => ({ w, h, panes: [2, 3], shutters: { kind: "boards", colour: shutter, age: 0.4 }, crooked: 4, frame: S.paint("#ece6da", 0.2), ...extra }),
};

/** A camera at a person's eye looking at a target from `dist` metres, heading `yaw`° (0 = from +z); the lens shift frames the target without tilting. */
export function look(tx: number, ty: number, tz: number, dist: number, yaw = 0, eye = 1.6, fov = 55): CameraSpec {
  const a = (yaw * Math.PI) / 180, x = tx + Math.sin(a) * dist, z = tz + Math.cos(a) * dist, tanH = Math.tan((fov * Math.PI) / 360);
  return { x, y: eye, z, yaw: -yaw, fov, shift: (ty - eye) / (dist * tanH * (9 / 16)) };
}
/**
 * A camera at a person's eye that fits the subject (`b.subjectBounds`) seen from heading `yaw`° (0 = from +z), with
 * `pad` of the frame left round it. The camera stays level and frames by lens shift, so verticals stay vertical.
 */
export function frameSubject(b: SceneBuilder, yaw = 0, o: { eye?: number; fov?: number; pad?: number; lift?: number } = {}): CameraSpec {
  const { lo, hi } = b.subjectBounds(), eye = o.eye ?? 1.6, fov = o.fov ?? 55, pad = o.pad ?? 0.1;
  const a = (yaw * Math.PI) / 180, tanH = Math.tan((fov * Math.PI) / 360), tanV = tanH * (9 / 16), tx = (lo[0] + hi[0]) / 2, tz = (lo[2] + hi[2]) / 2;
  const fx = -Math.sin(a), fz = -Math.cos(a), rx = Math.cos(a), rz = -Math.sin(a);
  const fit = (d: number): number | null => {
    const cx = tx + Math.sin(a) * d, cz = tz + Math.cos(a) * d;
    let v0 = 1e9, v1 = -1e9;
    for (const X of [lo[0], hi[0]]) for (const Y of [lo[1], hi[1]]) for (const Z of [lo[2], hi[2]]) {
      const qx = X - cx, qz = Z - cz, depth = qx * fx + qz * fz;
      if (depth < 0.8) return null;
      if (Math.abs((qx * rx + qz * rz) / depth) > tanH * (1 - pad)) return null;
      const vy = (Y - eye) / depth; v0 = Math.min(v0, vy); v1 = Math.max(v1, vy);
    }
    return v1 - v0 > 2 * tanV * (1 - pad) ? null : (v0 + v1) / 2;
  };
  let d = 4, c = fit(d);
  while (c === null && d < 3000) { d *= 1.06; c = fit(d); }
  return { x: tx + Math.sin(a) * d, y: eye, z: tz + Math.cos(a) * d, yaw: -yaw, fov, shift: ((c ?? 0) + (o.lift ?? 0)) / tanV };
}
/** A house on one side of a street that runs along z (centre line at x = 0, `half` metres from the centre to each façade). */
function streetSide(b: SceneBuilder, s: HouseSpec, side: -1 | 1, z: number, half: number) {
  placeHouse(b, s, side * (half + s.d / 2), z, side < 0 ? -90 : 90);
}
/** Grass, a lane, hills and a few trees: the countryside round a building. */
function countryside(b: SceneBuilder, o: { grass?: string; lane?: boolean; trees?: [number, number, number][]; hills?: boolean; laneColour?: string } = {}) {
  ground(b, -400, 400, -400, 120, { kind: "grass", colour: o.grass ?? "#6b7a3c" });
  if (o.lane !== false) ground(b, -60, 60, 5, 9, { kind: "dirt", colour: o.laneColour }, 0.02);
  if (o.hills !== false) hills(b, -320);
  for (const [x, z, h] of o.trees ?? []) tree(b, x, z, h, h * 0.4);
  b.place();
}
/** A town street: cobbles between pavements. */
function town(b: SceneBuilder, kerbA = 6, kerbB = 12, cobble: SurfaceSpec = { kind: "cobbles", moss: 0.25 }) {
  ground(b, -400, 400, -400, 200, { kind: "flags", colour: "#8d877b" }, 0.02);
  street(b, -80, 80, kerbA, kerbB, cobble);
}
const done = (b: SceneBuilder, cam: CameraSpec, mood: MoodId | Mood, extra: Partial<ArchScene> = {}) => b.scene(cam, mood, extra);
/** A house placed at (x, z) turned `yaw`°, with props added after it. */
function placeHouse(b: SceneBuilder, s: HouseSpec, x = 0, z = 0, yaw = 0, lean = 0, props?: () => void) {
  house(b, s); props?.(); b.place({ x, z, yaw, leanX: lean * 0.6, leanZ: lean });
}

// ---- The library ----------------------------------------------------------------------------------------------------------

const E: LibraryEntry[] = [];
const add = (e: LibraryEntry) => { E.push(e); };

// British Isles ------------------------------------------------------------------------------------------------------------
add({ id: "cotswold-cottage", label: "Cotswold stone cottage", group: "british", region: "England, Cotswolds", era: "17th century", setting: "village", view: "exterior", scale: "humble", mood: "golden",
  materials: ["oolitic limestone rubble", "stone slates in diminishing courses", "oak", "leaded lights"], story: ["ivy on the gable", "flower boxes", "firewood under a lean-to", "worn threshold", "garden walls"],
  note: "Stone slates are laid largest at the eaves and smallest at the ridge, on a steep pitch (about 45° or more) because the porous stone needs it.",
  build: (seed = 1) => { const b = new SceneBuilder(seed); countryside(b, { trees: [[-8.5, -4, 9]] });
    placeHouse(b, { w: 9, d: 5.5, storeys: 2, storeyH: 2.6, walls: S.cotswold, roof: { kind: "gable", pitch: 52, mat: S.stoneSlate, over: 0.25, sag: 0.12 },
      windows: { rows: [[-2.8, 2.5], [-2.8, 0, 2.5]], spec: W.leaded(0.9, 1.0, { flowers: "#c0392b", head: { kind: "ashlar", colour: "#c9ad78" } }) },
      door: { x: -0.2, mat: S.boards("#3f5a52"), lantern: true, canopy: S.stoneSlate }, chimneys: [{ x: 3.9, mat: S.cotswold }], ivy: [{ x: -4.2, w: 2.5, h: 5 }] }, 0, 0, -32, 0, () => { firewood(b, 5.6, 2.8, 1.4, 1.1); bench(b, -1.9, 2.75); });
    const cam = frameSubject(b, 14, { pad: 0.14 });
    gardenWall(b, -14, -5, 4.2); gardenWall(b, 6, 14, 4.2); b.place();
    return done(b, cam, "golden"); } });
add({ id: "tudor-jettied-house", label: "Tudor jettied town house", group: "british", region: "England", era: "c. 1500–1580", setting: "town", view: "exterior", scale: "domestic", mood: "morning",
  materials: ["close-studded oak", "lime plaster infill", "plain clay tiles", "brick chimney"], story: ["upper floors jettied over the street", "a hanging shop sign", "oriel windows"],
  note: "Close studding: studs set as close as their own width; each floor jettied out on joist ends to gain room over the street.",
  build: (seed = 2) => { const b = new SceneBuilder(seed); town(b);
    for (const [x, k] of [[-8.5, 0], [0, 1], [8.2, 2]] as const) placeHouse(b, { w: 8, d: 7, storeys: 3, storeyH: 2.6, jetty: 0.55, walls: [S.plaster("#e8dcc2"), S.frame("#ece2c8", "#3c2e24", "close", 2.6, 0.9, 0.5), S.frame("#ece2c8", "#3c2e24", k === 1 ? "cross" : "close", 2.6, 0.9, 0.5)],
      roof: { kind: "gable-front", pitch: 52, mat: S.plainTile, over: 0.45, sag: 0.1 }, windows: { rows: [[], [-2, 2], [-2, 2]], spec: W.leaded(1.6, 1.0) }, shop: k === 0 ? { fascia: S.paint("#2f3b33") } : undefined,
      door: { x: k === 0 ? 2.8 : -2.5, mat: S.boards("#4a3424") }, chimneys: [{ x: 3, z: -2, mat: S.brick("#8f4a33") }] }, x, 0, 0, 0.004 * (k - 1));
    return done(b, frameSubject(b, -24, { fov: 60 }), "morning"); } });
add({ id: "thatched-cob-cottage", label: "Thatched cob cottage", group: "british", region: "England, Devon", era: "17th–18th century", setting: "village", view: "exterior", scale: "humble", mood: "morning",
  materials: ["cob walls, limewashed", "long-straw thatch", "oak"], story: ["rounded corners", "eyebrow dormer", "a cottage garden"],
  note: "Thatch wants 45–60°; the eaves are thick and rounded, and cob walls are limewashed every few years.",
  build: (seed = 3) => { const b = new SceneBuilder(seed); countryside(b, { trees: [[10, -6, 8]] });
    placeHouse(b, { w: 10, d: 6, storeys: 2, storeyH: 2.4, walls: S.limewash("#f1ead6", 0.2, "mudbrick"), roof: { kind: "hip", pitch: 55, mat: S.thatch, over: 0.6, sag: 0.08 },
      windows: { rows: [[-3, 2.8], [-3, 2.8]], spec: W.leaded(0.9, 0.9) }, door: { x: 0, mat: S.boards("#5a3f2a"), canopy: S.thatch }, chimneys: [{ x: 4.2, mat: S.brick("#8f4a33") }] }, 0, 0, 30);
    for (let i = 0; i < 6; i++) b.add(clump(-6 + i * 2.2, 0.35, 6.5, 0.9, 0.55, 0.6, b.mat({ kind: "foliage", colour: "#4c6b30", colour2: ["#d06a8a", "#e8d070", "#8a6ad0"][i % 3] }), b.r()));
    b.place();
    return done(b, frameSubject(b, -16), "morning"); } });
add({ id: "wealden-hall-house", label: "Wealden hall house", group: "british", region: "England, Kent and Sussex", era: "c. 1400–1530", setting: "rural", view: "exterior", scale: "domestic", mood: "golden",
  materials: ["oak frame with curved braces", "wattle and daub", "hipped plain-tile roof"], story: ["recessed open hall between jettied ends", "a long single roof over all"],
  note: "A single hipped roof runs over jettied end bays and a recessed hall, so the eaves of the hall are carried on a long plate and curved braces.",
  build: (seed = 4) => { const b = new SceneBuilder(seed); countryside(b, { trees: [[-14, -8, 10]] });
    const fr = S.frame("#ead9b6", "#3e3024", "square", 2.7, 1.0, 0.7);
    house(b, { w: 15, d: 7, storeys: 2, storeyH: 2.7, walls: [fr, fr], roof: { kind: "hip", pitch: 52, mat: S.plainTile, over: 0.5, sag: 0.15 }, windows: { rows: [[-5.5, 5.5], [-5.5, 5.5]], spec: W.leaded(1.3, 0.9) }, door: { x: -2, mat: S.boards("#4a3424") }, chimneys: [{ x: 1.5, mat: S.brick("#8f4a33") }] });
    b.add(boxAt(-3.5, 0, 3.0, 3.5, 5.4, 3.5, b.mat(fr)));
    b.place({ yaw: -22 });
    return done(b, frameSubject(b, 14), "golden"); } });
add({ id: "scottish-tower-house", label: "Scottish tower house", group: "british", region: "Scotland", era: "16th century", setting: "mountain", view: "exterior", scale: "civic", mood: "overcast",
  materials: ["harled rubble (lime roughcast)", "crow-stepped gables", "slate"], story: ["corbelled corner turrets", "a small door high up"],
  note: "L-plan towers grew upward: harled walls, crow-stepped gables, turrets corbelled out at the corners.",
  build: (seed = 5) => { const b = new SceneBuilder(seed); countryside(b, { grass: "#6a7448", lane: false });
    const harl = S.limewash("#ddd5c4", 0.25, "rubble");
    placeHouse(b, { w: 9, d: 8, storeys: 4, storeyH: 3, walls: harl, roof: { kind: "step-gable", pitch: 50, mat: S.slate, ridgeMat: S.ashlar("#b6ad9c") }, windows: { rows: [[], [-2, 2], [-2, 2], [0]], spec: W.sash(0.8, 1.2, { panes: [2, 3] }) }, door: { x: 2.5, w: 0.9 }, chimneys: [{ x: -3.5, h: 1.4, mat: harl }] }, 0, 0, 25);
    for (const s of [-1, 1]) tower(b, { x: s * 4.6, z: 4.1, plan: "round", r: 1.1, h: 2.2, wall: harl, roof: { kind: "cone", h: 3, mat: S.slate } });
    b.place({ y: 9.5, yaw: 25 });
    return done(b, frameSubject(b, -10), "overcast"); } });
add({ id: "welsh-slate-row", label: "Welsh quarry cottages", group: "british", region: "Wales, Snowdonia", era: "19th century", setting: "mountain", view: "exterior", scale: "humble", mood: "rain",
  materials: ["slate-stone rubble", "Welsh slate roof", "sash windows"], story: ["a terraced row", "rain on the slates", "smoking chimneys"],
  note: "Purple-grey Welsh slates lie in courses about 0.2 m deep; wet, they turn dark and mirror the sky.",
  build: (seed = 6) => { const b = new SceneBuilder(seed); countryside(b, { grass: "#5f6b42", lane: true, laneColour: "#5b5a55" });
    for (let k = 0; k < 4; k++) placeHouse(b, { w: 6, d: 6, storeys: 2, storeyH: 2.6, walls: S.rubble("#6f6f6c", 0.25), roof: { kind: "gable", pitch: 35, mat: S.purpleSlate, over: 0.15 }, windows: { rows: [[1.6], [-1.4, 1.6]], spec: W.sash(0.9, 1.3, { panes: [2, 2] }) }, door: { x: -1.4, mat: S.paint(["#2b4a6a", "#6a2b2b", "#2b5a3b", "#3a3a3a"][k]) }, chimneys: [{ x: 3, mat: S.rubble("#6f6f6c") }] }, (k - 1.5) * 6, 0, 0);
    return done(b, frameSubject(b, -28), "rain"); } });
add({ id: "coaching-inn", label: "Village coaching inn", group: "british", region: "England", era: "18th century", setting: "village", view: "exterior", scale: "domestic", mood: "dusk",
  materials: ["red brick in Flemish bond", "plain tiles", "painted sashes"], story: ["a hanging inn sign", "lanterns", "barrels by the door", "warm windows at dusk"],
  note: "Flemish bond alternates headers and stretchers in every course; burnt headers make a chequer.",
  build: (seed = 7) => { const b = new SceneBuilder(seed); town(b, 7, 13, { kind: "setts", moss: 0.3 });
    placeHouse(b, { w: 14, d: 8, storeys: 2, storeyH: 3, walls: S.brick("#9b4f37", "flemish"), roof: { kind: "gable", pitch: 42, mat: S.plainTile, over: 0.3 }, windows: { rows: [[-5, -2.5, 2.5, 5], [-5, -2.5, 0, 2.5, 5]], spec: W.sash(1.0, 1.6) },
      door: { x: 0, w: 1.2, mat: S.paint("#2f3b33"), lantern: true, fanlight: true, shape: "round" }, chimneys: [{ x: -6, mat: S.brick() }, { x: 6, mat: S.brick() }], cornice: S.ashlar("#e3dccb") }, 0, 0, 0, 0, () => {
      const iron = b.mat({ kind: "iron" }); b.add(boxAt(-7.2, 4.6, 4, -7.15, 4.65, 5.3, iron)); b.add(boxAt(-7.25, 3.6, 4.6, -7.1, 4.5, 5.2, b.mat(S.paint("#6a2b2b", 0.3))));
      barrel(b, 1.6, 4.6); barrel(b, 2.3, 4.7); });
    lamppost(b, -9, 6.6); b.place();
    return done(b, frameSubject(b, -20), "dusk"); } });
add({ id: "victorian-terrace", label: "Victorian bay-window terrace", group: "british", region: "England", era: "1860–1900", setting: "town", view: "exterior", scale: "domestic", mood: "rain",
  materials: ["yellow stock brick", "slate", "stone bay windows"], story: ["iron railings", "chimney pots", "wet pavement"],
  note: "Bay windows project on stone sills; each house has its own chimney stack on the party wall.",
  build: (seed = 8) => { const b = new SceneBuilder(seed); town(b, 8, 14);
    for (let k = 0; k < 4; k++) placeHouse(b, { w: 5.5, d: 9, storeys: 3, storeyH: 3, walls: [S.brick("#c9a874"), S.brick("#c9a874")], roof: { kind: "gable", pitch: 32, mat: S.slate, over: 0.2 }, windows: { rows: [[1.2], [-1.2, 1.2], [-1.2, 1.2]], spec: W.sash(1.0, 1.8, { surround: S.ashlar("#e2dccd") }) }, door: { x: -1.6, mat: S.paint(["#1f2f3f", "#3f1f2a", "#1f3a2a", "#2a2a2a"][k]), shape: "round", fanlight: true, surround: S.ashlar("#e2dccd") }, chimneys: [{ x: 2.75, pots: 3, mat: S.brick("#c9a874") }], cornice: S.ashlar("#e2dccd") }, (k - 1.5) * 5.5, 0, 0);
    lamppost(b, 3, 7.7); b.place();
    return done(b, frameSubject(b, -30), "rain"); } });
add({ id: "georgian-crescent", label: "Bath stone crescent", group: "british", region: "England, Bath", era: "1767–1775", setting: "city", view: "exterior", scale: "civic", mood: "noon",
  materials: ["Bath stone ashlar", "Ionic columns", "slate mansard"], story: ["a giant order over a rusticated base", "railings and area steps"],
  note: "Palladian order: a rusticated ground floor, a giant order of columns through two floors, a balustraded parapet.",
  build: (seed = 9) => { const b = new SceneBuilder(seed); town(b, 9, 16, { kind: "setts" });
    const bath = S.ashlar("#d9c79e", 0.32);
    for (let k = 0; k < 7; k++) {
      placeHouse(b, { w: 7, d: 12, storeys: 3, storeyH: 3.3, plinth: 0.6, walls: [{ kind: "rustication", colour: "#d4c197" }, bath], roof: { kind: "mansard", pitch: 25, mat: S.slate, h1: 2.4 }, windows: { rows: [[-1.8, 1.8], [-1.8, 1.8], [-1.8, 1.8]], spec: W.sash(1.1, 2.0, { surround: bath }) }, door: { x: 0, shape: "round", fanlight: true, mat: S.paint("#2a2a2a") }, cornice: bath }, Math.sin((k - 3) * 0.12) * 60, (1 - Math.cos((k - 3) * 0.12)) * 60, -(k - 3) * 0.12 * 57.3, 0, () => { for (const x of [-3.2, 3.2]) b.add(boxAt(x - 0.3, 3.9, 6, x + 0.3, 10.2, 6.18, b.mat(bath))); });
    }
    return done(b, frameSubject(b, -6, { fov: 62 }), "noon"); } });

// France -------------------------------------------------------------------------------------------------------------------
add({ id: "norman-colombage", label: "Norman half-timbered house", group: "french", region: "France, Normandy", era: "15th–17th century", setting: "town", view: "exterior", scale: "domestic", mood: "morning",
  materials: ["oak colombage (close vertical studs)", "torchis infill", "slate"], story: ["upper floor on corbels", "a crooked dormer", "geraniums"],
  note: "Norman colombage sets vertical studs close together with a middle rail; earth-and-straw (torchis) fills the panels.",
  build: (seed = 10) => { const b = new SceneBuilder(seed); town(b);
    placeHouse(b, { w: 7.5, d: 7, storeys: 3, storeyH: 2.7, jetty: 0.4, walls: [S.ashlar("#c9bda4", 0.3), S.frame("#e9dfc4", "#4a3527", "colombage", 2.7, 1.0, 0.42), S.frame("#e9dfc4", "#4a3527", "colombage", 2.7, 1.0, 0.42)],
      roof: { kind: "gable-front", pitch: 58, mat: S.slate, over: 0.5, sag: 0.12 }, windows: { rows: [[1.8], [-1.8, 1.8], [-1.6, 1.6]], spec: W.leaded(1.0, 1.1, { flowers: "#d03a2e" }) }, door: { x: -1.8, mat: S.boards("#5a3a2a") } }, 0, 0, -18, 0.006);
    placeHouse(b, { w: 6, d: 7, storeys: 2, storeyH: 2.8, walls: [S.plaster("#d8c9a6"), S.frame("#d9c6a0", "#3e2e22", "cross", 2.8, 1.0, 0.5)], roof: { kind: "gable", pitch: 50, mat: S.slate }, windows: { rows: [[1.5], [0]], spec: W.shuttered("#5a6a4a") }, door: { x: -1.5 } }, -7.6, 1.5, -18);
    return done(b, frameSubject(b, 18), "morning"); } });
add({ id: "haussmann-facade", label: "Haussmannian apartment building", group: "french", region: "France, Paris", era: "1853–1870", setting: "city", view: "exterior", scale: "civic", mood: "golden",
  materials: ["Lutetian limestone (pierre de taille)", "zinc mansard at 45°", "wrought-iron balconies"], story: ["continuous balconies on the second and fifth floors", "a café awning", "street lamp"],
  note: "Height tied to street width (about 20 m on a 20 m street), six storeys, continuous balconies on the 2nd and 5th floors, a 45° mansard.",
  build: (seed = 11) => { const b = new SceneBuilder(seed); town(b, 7, 17, { kind: "setts" });
    const stone = S.ashlar("#e2d6bd", 0.42);
    placeHouse(b, { w: 22, d: 14, storeys: 6, storeyH: 3.1, walls: [{ kind: "rustication", colour: "#ddd0b5", course: 0.42 }, stone], roof: { kind: "mansard", pitch: 20, mat: S.zinc, h1: 3.2 },
      windows: { rows: [[], [-9, -5.4, -1.8, 1.8, 5.4, 9], [-9, -5.4, -1.8, 1.8, 5.4, 9], [-9, -5.4, -1.8, 1.8, 5.4, 9], [-9, -5.4, -1.8, 1.8, 5.4, 9], [-9, -5.4, -1.8, 1.8, 5.4, 9]], spec: { w: 1.25, h: 2.3, panes: [2, 4], surround: stone, hood: "cornice", frame: S.paint("#f2efe8", 0.05), sillH: undefined } as WindowSpec, sillH: 0.3 },
      dormers: { count: 6, spec: { w: 0.9, h: 1.3, panes: [2, 3] }, mat: S.zinc }, balconies: [{ storey: 2, continuous: true }, { storey: 5, continuous: true }], shop: { fascia: S.paint("#3b2a24"), awning: { kind: "fabric", colour: "#8b2f2a", colour2: "#efe4cf" } }, door: null, cornice: stone, bands: stone }, 0, 0, -20);
    lamppost(b, 9, 6.6); b.place();
    return done(b, frameSubject(b, 24, { fov: 60 }), "golden"); } });
add({ id: "provencal-mas", label: "Provençal mas", group: "french", region: "France, Provence", era: "18th century", setting: "rural", view: "exterior", scale: "domestic", mood: "noon",
  materials: ["rubble stone with lime render", "Roman tiles at a low pitch", "painted shutters"], story: ["cypresses against the mistral", "a vine trellis", "lavender"],
  note: "Low pitches suit Roman tiles (about 17–35°); the north wall is nearly blind against the mistral; shutters in faded blue.",
  build: (seed = 12) => { const b = new SceneBuilder(seed); countryside(b, { grass: "#9a9a5c", laneColour: "#b9a07a" });
    placeHouse(b, { w: 14, d: 7, storeys: 2, storeyH: 2.9, walls: S.plaster("#d9c3a0", 0.3), roof: { kind: "gable", pitch: 22, mat: S.pantile, over: 0.35 }, windows: { rows: [[-4, 4], [-4, 0, 4]], spec: W.shuttered("#7f9cab", 0.9, 1.3) }, door: { x: 0, w: 1.2, h: 2.4, shape: "segmental", mat: S.boards("#6f8c95") }, chimneys: [{ x: -5, mat: S.plaster("#d9c3a0") }] }, 0, 0, -26);
    for (const [x, z] of [[-11, -2], [-12.5, 1], [11, -3]]) cypress(b, x, z, 11);
    for (let i = 0; i < 10; i++) b.add(clump(-8 + i * 1.6, 0.3, 9.5, 0.7, 0.35, 0.5, b.mat({ kind: "foliage", colour: "#6a7a5a", colour2: "#8a6ac0" }), b.r()));
    b.place();
    return done(b, frameSubject(b, 12), "noon"); } });
add({ id: "alsace-fachwerk", label: "Alsatian half-timbered houses", group: "french", region: "France, Alsace", era: "16th–17th century", setting: "riverside", view: "exterior", scale: "domestic", mood: "morning",
  materials: ["painted plaster in ochre, rose and blue", "oak frames", "beaver-tail tiles"], story: ["houses lean over the water", "flower boxes everywhere", "a canal"],
  note: "Gables face the water; each family painted its plaster; the frames form crosses and curved braces under the windows.",
  build: (seed = 13) => { const b = new SceneBuilder(seed); water(b, -200, 200, 3, 60, -0.9, "#3e5a5a"); ground(b, -200, 200, -200, 3, { kind: "flags" }, 0.02);
    b.add(boxAt(-22, -3, 2.6, 22, 0.02, 3.1, b.mat(S.ashlar("#a8a090")))); b.place();
    ["#e2b866", "#d99a8c", "#9fb8c6", "#e9dcb8"].forEach((c, k) => placeHouse(b, { w: 6.5, d: 8, storeys: 3, storeyH: 2.7, jetty: 0.3, walls: [S.ashlar("#c4b49a", 0.3), S.frame(c, "#4a3527", "fachwerk", 2.7, 1.0, 0.65)], roof: { kind: "gable-front", pitch: 56, mat: S.plainTile, over: 0.4 }, windows: { rows: [[0], [-1.6, 1.6], [0]], spec: W.leaded(1.0, 1.1, { flowers: k % 2 ? "#d03a2e" : "#e86a9a" }) }, door: { x: -1.6 } }, (k - 1.5) * 6.6, -2, 0, 0.004 * (k % 2 ? 1 : -1)));
    return done(b, frameSubject(b, -20), "morning"); } });
add({ id: "breton-granite-cottage", label: "Breton granite cottage", group: "french", region: "France, Brittany", era: "18th century", setting: "coast", view: "exterior", scale: "humble", mood: "overcast",
  materials: ["granite blocks", "slate with heavy ridge", "dormer windows"], story: ["a squat chimney at each gable", "sea wind", "hydrangeas"],
  note: "Granite cottages have massive chimneys at both gables and a dormer through the eaves.",
  build: (seed = 14) => { const b = new SceneBuilder(seed); countryside(b, { grass: "#6a7a4a", hills: false }); water(b, -400, 400, -400, -60, -0.5, "#4f6a70");
    placeHouse(b, { w: 11, d: 6.5, storeys: 1, storeyH: 2.8, walls: { kind: "rubble", colour: "#8f877c", colour2: "#b9b2a4", age: 0.7, moss: 0.4 }, roof: { kind: "gable", pitch: 48, mat: S.slate, over: 0.15 }, windows: { rows: [[-3.5, 3.5]], spec: W.sash(0.9, 1.2, { panes: [2, 3], frame: S.paint("#3a6a8a") }) }, door: { x: 0, mat: S.paint("#3a6a8a") }, dormers: { count: 2 }, chimneys: [{ x: -5.1, w: 1.0, h: 0.8, mat: { kind: "ashlar", colour: "#8f877c", course: 0.4 } }, { x: 5.1, w: 1.0, h: 0.8, mat: { kind: "ashlar", colour: "#8f877c", course: 0.4 } }] }, 0, 0, -18);
    for (const x of [-7, -6, 6.8]) b.add(clump(x, 0.6, 3.4, 0.9, 0.7, 0.8, b.mat({ kind: "foliage", colour: "#4f6a3a", colour2: "#7a8ad0" }), b.r()));
    b.place();
    return done(b, frameSubject(b, 10), "overcast"); } });
add({ id: "loire-chateau-tower", label: "Loire château", group: "french", region: "France, Loire valley", era: "16th century", setting: "riverside", view: "exterior", scale: "monumental", mood: "morning",
  materials: ["white tuffeau limestone", "blue-black slate cones", "lead finials"], story: ["round towers with conical roofs", "dormers with pinnacles", "a moat"],
  note: "Soft white tuffeau with steep slate roofs: towers capped by tall cones, dormers rising through the cornice.",
  build: (seed = 15) => { const b = new SceneBuilder(seed); countryside(b, { lane: false }); water(b, -400, 400, 4, 40, -1.2, "#3e5a60");
    const tuff = S.ashlar("#e8e0cc", 0.34);
    placeHouse(b, { w: 22, d: 10, storeys: 3, storeyH: 3.6, walls: tuff, roof: { kind: "hip", pitch: 58, mat: S.slate, over: 0.2 }, windows: { rows: [[-7, 0, 7], [-7, 0, 7], [-7, 0, 7]], spec: W.sash(1.3, 2.2, { panes: [2, 4], surround: tuff, frame: S.paint("#ece8dc") }) }, dormers: { count: 3, spec: { w: 1.1, h: 1.6, panes: [2, 3] }, mat: S.slate }, door: null, cornice: tuff, chimneys: [{ x: -4, h: 2.5, mat: tuff }, { x: 4, h: 2.5, mat: tuff }] }, 0, 0, -10, 0, () => {
      for (const s of [-1, 1]) tower(b, { x: s * 12, z: 4, plan: "round", r: 3.2, h: 14, wall: tuff, roof: { kind: "cone", h: 10, mat: S.slate, over: 0.25 }, finial: { kind: "lead" } }); });
    return done(b, frameSubject(b, 18), "morning"); } });
add({ id: "boulangerie-front", label: "Village boulangerie", group: "french", region: "France", era: "19th century", setting: "village", view: "exterior", scale: "humble", mood: "dusk",
  materials: ["painted timber shopfront", "limestone", "slate"], story: ["gilt lettering fascia", "bread in the window", "a bicycle-height bench", "warm light spilling onto cold cobbles"],
  note: "A shopfront is a timber frame applied to the masonry: pilasters, a fascia, glazing to the street.",
  build: (seed = 16) => { const b = new SceneBuilder(seed); town(b, 5, 11);
    placeHouse(b, { w: 8, d: 8, storeys: 3, storeyH: 3, walls: S.ashlar("#d8ccb0", 0.36), roof: { kind: "mansard", pitch: 25, mat: S.slate, h1: 2.4 }, windows: { rows: [[], [-2, 2], [-2, 2]], spec: W.shuttered("#5a6f7a", 1.0, 1.6) }, dormers: { count: 2 }, shop: { fascia: S.paint("#2f4a3f"), awning: { kind: "fabric", colour: "#2f4a3f", colour2: "#e9e0c8" } }, door: null, cornice: S.ashlar("#e2d8c2") }, 0, 0, -12, 0, () => {
      b.add(boxAt(-3.4, 0.55, 3.62, 3.4, 0.9, 3.75, b.mat({ kind: "bread" }))); b.light({ x: 0, y: 1.8, z: 3.2, kelvin: 2400, power: 0.9 }); bench(b, 3.6, 4.0); });
    lamppost(b, -5, 5.6); b.place();
    return done(b, frameSubject(b, 16, { pad: 0.05 }), "dusk"); } });
add({ id: "fortified-hill-village", label: "Fortified hill village", group: "french", region: "France, Dordogne", era: "13th–15th century", setting: "village", view: "exterior", scale: "domestic", mood: "golden",
  materials: ["honey limestone", "stone roofs (lauzes)", "brown tiles"], story: ["houses stacked up a hill to the church", "a ramparts walk"],
  note: "Hill villages climb in terraces; each house shows a gable or eave to the slope, and the church tower crowns the top.",
  build: (seed = 17) => { const b = new SceneBuilder(seed); countryside(b, { lane: false, grass: "#7a7f48" });
    const hill = b.mat({ kind: "rock", colour: "#8a8a5a" }); b.add(clump(0, -14, -20, 46, 26, 30, hill, 0.2, 0.08)); b.place();
    const stone = { kind: "coursed-rubble", colour: "#c9a774", moss: 0.25, age: 0.6 } as SurfaceSpec;
    for (let k = 0; k < 9; k++) { const x = (k % 3 - 1) * 9 + (k > 2 ? 3 : 0), z = -6 - Math.floor(k / 3) * 7, y = 3 + Math.floor(k / 3) * 3.5;
      house(b, { w: 7, d: 6, storeys: 2, storeyH: 2.7, walls: stone, roof: { kind: k % 2 ? "gable" : "hip", pitch: k % 3 ? 45 : 55, mat: k % 2 ? S.plainTile : { kind: "stone-slate", colour: "#8f8270", moss: 0.5 } }, windows: { rows: [[1.5], [-1.5, 1.5]], spec: W.shuttered("#6a4a3a", 0.8, 1.1) }, door: { x: -1.5 } }); b.place({ x, y, z, yaw: (k % 3 - 1) * 12 }); }
    tower(b, { x: 0, z: -30, plan: "square", r: 3, h: 16, wall: stone, roof: { kind: "pyramid", h: 6, mat: S.plainTile }, belfry: true }); b.place({ y: 13 });
    return done(b, frameSubject(b, 8), "golden"); } });
add({ id: "gothic-cathedral-west-front", label: "Gothic cathedral west front", group: "french", region: "France, Picardy", era: "1220–1270", setting: "city", view: "exterior", scale: "monumental", mood: "morning",
  materials: ["limestone ashlar", "lead roofs", "stained glass rose"], story: ["deep portals in orders", "twin towers", "a square before it with people for scale"],
  note: "Amiens' vault stands about 42 m high over bays about 14.6 m apart; the west front shows the nave and aisles behind its towers and portals.",
  build: (seed = 18) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "flags", colour: "#9d978a" });
    church(b, { style: "gothic", L: 70, W: 14, H: 32, bays: 7, wall: S.ashlar("#d9cfb6", 0.4), roof: { kind: "lead" }, aisles: { w: 8, h: 16 }, flying: true, towers: "west-pair", towerH: 52, spire: null, rose: true, apse: true });
    b.place({ yaw: -90 });
    return done(b, frameSubject(b, -24, { fov: 62 }), "morning"); } });

// German-speaking and Alpine ------------------------------------------------------------------------------------------------
add({ id: "bavarian-chalet", label: "Bavarian Alpine farmhouse", group: "alpine", region: "Germany, Upper Bavaria", era: "18th–19th century", setting: "mountain", view: "exterior", scale: "domestic", mood: "winter",
  materials: ["whitewashed masonry ground floor", "log upper floor", "shallow shingle roof weighted with stones"], story: ["painted façade (Lüftlmalerei)", "carved balcony", "firewood stacked under the eaves", "snow"],
  note: "A shallow roof (about 15–25°) with eaves nearly 2 m deep keeps snow on as insulation and shelters the balconies and stacked wood.",
  build: (seed = 19) => { const b = new SceneBuilder(seed); countryside(b, { grass: "#e9ecef", lane: false, hills: true, trees: [[-14, -6, 12], [15, -9, 13]] });
    placeHouse(b, { w: 13, d: 11, storeys: 3, storeyH: 2.7, walls: [S.limewash("#f1ede4", 0.08, "rubble"), S.limewash("#f1ede4", 0.08, "rubble"), S.log("#7a5638")], roof: { kind: "gable-front", pitch: 22, mat: S.shingle, over: 1.8 },
      windows: { rows: [[-3.5, 0, 3.5], [-3.5, 0, 3.5], [-2, 2]], spec: W.shuttered("#2f5a3a", 0.9, 1.2, { flowers: "#d03a2e", surround: { kind: "plaster", colour: "#b48a5a" } }) }, balconies: [{ storey: 2, continuous: true, mat: { kind: "oak", colour: "#6a4a30" } }], door: { x: 5, mat: S.boards("#5a3a24") } }, 0, 0, 22, 0, () => { firewood(b, -6.6 + 3, 5.6, 4, 1.8); });
    return done(b, frameSubject(b, -18, { eye: 13 }), "winter"); } });
add({ id: "emmental-farmhouse", label: "Swiss Emmental farmhouse", group: "alpine", region: "Switzerland, Emmental", era: "18th century", setting: "rural", view: "exterior", scale: "domestic", mood: "golden",
  materials: ["spruce boards", "a vast hipped roof with a gable-front bell (Ründi)", "shingles"], story: ["the roof sweeps almost to the ground", "galleries under the eaves", "geraniums"],
  note: "House, byre and barn under one huge half-hipped roof; the front gable curves into a vaulted board 'Ründi'.",
  build: (seed = 20) => { const b = new SceneBuilder(seed); countryside(b, { trees: [[14, -10, 12]] });
    placeHouse(b, { w: 16, d: 22, storeys: 2, storeyH: 3, walls: S.boards("#a07a4a", 0.4), roof: { kind: "half-hip", pitch: 48, mat: S.shingle, over: 2.2 }, windows: { rows: [[-5, -2.5, 0, 2.5, 5], [-5, -2.5, 0, 2.5, 5]], spec: W.leaded(0.9, 1.1, { flowers: "#d03a2e", frame: S.paint("#efe8dc") }) }, door: { x: -6.5 } }, 0, 0, 30);
    return done(b, frameSubject(b, -12), "golden"); } });
add({ id: "fachwerk-townhouse", label: "Franconian Fachwerk town house", group: "alpine", region: "Germany, Franconia", era: "16th century", setting: "town", view: "exterior", scale: "domestic", mood: "noon",
  materials: ["oak frames with 'Mann' figures", "ochre infill", "plain tiles"], story: ["a market square", "an oriel", "a hoist beam in the gable"],
  note: "Franconian frames are decorative: curved braces making a 'Mann' at the posts, St Andrew's crosses below the windows.",
  build: (seed = 21) => { const b = new SceneBuilder(seed); town(b, 6, 14);
    placeHouse(b, { w: 9, d: 10, storeys: 3, storeyH: 2.7, jetty: 0.35, walls: [S.ashlar("#c6b394", 0.3), S.frame("#e7c98d", "#5a2f22", "fachwerk", 2.7, 1.0, 0.75), S.frame("#e7c98d", "#5a2f22", "fachwerk", 2.7, 1.0, 0.75)], roof: { kind: "gable-front", pitch: 58, mat: S.plainTile, over: 0.4 }, hoist: true, windows: { rows: [[2.5], [-2.8, 0, 2.8], [-2.8, 0, 2.8]], spec: W.leaded(0.95, 1.1) }, door: { x: -2.5, shape: "round", mat: S.boards("#4a2e22") } }, 0, 0, -16, 0.004);
    placeHouse(b, { w: 8, d: 10, storeys: 3, storeyH: 2.7, walls: [S.plaster("#d9b8a0"), S.frame("#efe2c8", "#3e2e22", "cross", 2.7, 1.0, 0.6)], roof: { kind: "gable-front", pitch: 55, mat: S.plainTile }, windows: { rows: [[2], [-2, 2], [0]], spec: W.leaded(0.95, 1.1) }, door: { x: -2 } }, 9.4, 1.8, -16);
    return done(b, frameSubject(b, 18), "noon"); } });
add({ id: "black-forest-house", label: "Black Forest farmhouse", group: "alpine", region: "Germany, Black Forest", era: "17th–18th century", setting: "mountain", view: "exterior", scale: "domestic", mood: "morning",
  materials: ["timber on a masonry base", "a huge half-hipped thatch or shingle roof"], story: ["the hillside ramp into the hayloft", "a shrine on the gable"],
  note: "The roof is the house: a steep half-hipped hood over living rooms, byre and hayloft, its slope sometimes reaching the hillside.",
  build: (seed = 22) => { const b = new SceneBuilder(seed); countryside(b, { grass: "#5f7a3c", trees: [[-16, -12, 14], [18, -16, 15]] });
    placeHouse(b, { w: 15, d: 18, storeys: 2, storeyH: 2.9, walls: [S.limewash("#ece6d8", 0.15), S.boards("#6a4a2e", 0.6)], roof: { kind: "half-hip", pitch: 55, mat: S.thatch, over: 1.4 }, windows: { rows: [[-4.5, -1.5, 1.5, 4.5], [-4, -1.3, 1.3, 4]], spec: W.leaded(0.85, 1.0, { flowers: "#d03a2e" }) }, door: { x: 6, mat: S.boards("#4a3424") } }, 0, 0, -28);
    return done(b, frameSubject(b, 10), "morning"); } });
add({ id: "hanseatic-brick-gable", label: "Hanseatic brick-Gothic gable houses", group: "alpine", region: "Germany, Lübeck", era: "14th–15th century", setting: "city", view: "exterior", scale: "domestic", mood: "overcast",
  materials: ["dark red and glazed black brick", "stepped gables with blind arcades"], story: ["a merchant's hoist", "tall warehouse doors", "a cobbled lane"],
  note: "Brick Gothic gables step up in pinnacled tiers with blind pointed arches, in alternating red and glazed black headers.",
  build: (seed = 23) => { const b = new SceneBuilder(seed); town(b, 7, 12);
    [0, 1, 2, 3].forEach(k => placeHouse(b, { w: 7, d: 12, storeys: 3, storeyH: 3.2, walls: S.brick(["#7f3a2a", "#8a4430", "#743426", "#8c4a34"][k], "flemish"), roof: { kind: "step-gable", pitch: 56, mat: S.plainTile, ridgeMat: S.brick("#5a2a20") }, hoist: true, windows: { rows: [[1.8], [-1.8, 1.8], [-1.8, 1.8]], spec: { w: 1.0, h: 1.9, shape: "pointed", panes: [2, 4] } }, door: { x: -1.8, h: 2.8, shape: "pointed", mat: S.boards("#3a2a20") } }, (k - 1.5) * 7.1, 0, 0, 0.005 * ((k % 2) * 2 - 1)));
    return done(b, frameSubject(b, -24, { fov: 60 }), "overcast"); } });
add({ id: "baroque-onion-church", label: "Alpine Baroque onion-dome church", group: "alpine", region: "Austria and Bavaria", era: "18th century", setting: "mountain", view: "exterior", scale: "civic", mood: "noon",
  materials: ["white render with ochre pilasters", "copper onion dome", "shingle nave roof"], story: ["a churchyard wall", "the dome green with verdigris"],
  note: "Copper takes about 10–30 years to turn to green patina, streaked where water runs; the onion swells past its drum and draws up to a point.",
  build: (seed = 24) => { const b = new SceneBuilder(seed); countryside(b, { trees: [[16, -10, 10]] });
    church(b, { style: "romanesque", L: 22, W: 11, H: 10, bays: 4, wall: S.plaster("#f1ece0", 0.08), roof: S.shingle, towers: "none", apse: true, glass: { kind: "glass" } });
    tower(b, { x: -14, plan: "square", r: 3, h: 26, wall: S.plaster("#f1ece0", 0.08), clock: 21, belfry: true }); b.add(onionDome(-14, 0, 26, 3.1, 7, b.mat(S.copper)), cylY(-14, 0, 33, 35, 0.06, b.mat({ kind: "gold" })), coneY(-14, 0, 34.4, 35.6, 0.25, 0.01, b.mat({ kind: "gold" })));
    gardenWall(b, -30, 14, 10, 1.2, S.limewash("#ece6d8", 0.25)); b.place({ yaw: -20 });
    return done(b, frameSubject(b, -4), "noon"); } });
add({ id: "rhine-crag-castle", label: "Rhine castle on a crag", group: "alpine", region: "Germany, Middle Rhine", era: "13th–14th century", setting: "riverside", view: "exterior", scale: "monumental", mood: "golden",
  materials: ["slate rubble", "slate roofs", "a round bergfried"], story: ["the river below", "vineyard terraces", "a palas with stepped gables"],
  note: "Spur castles sit on rock above the river: a tall round keep (bergfried) as last refuge, the palas against the cliff edge.",
  build: (seed = 25) => { const b = new SceneBuilder(seed); countryside(b, { lane: false, grass: "#6a7a3e" }); water(b, -500, 500, 30, 400, -0.6, "#4a6066");
    b.add(clump(0, 0, -6, 32, 22, 22, b.mat({ kind: "rock", colour: "#6e6a62" }), 0.3, 0.14)); b.place();
    const wall = S.rubble("#7d776c", 0.35);
    tower(b, { x: -4, z: -2, plan: "round", r: 4, h: 22, wall, crenel: true, roof: { kind: "cone", h: 8, mat: S.slate }, slits: 3 }); curtainWall(b, -18, 20, 6, 6, wall); b.place({ y: 17 });
    house(b, { w: 16, d: 9, storeys: 3, storeyH: 3.4, walls: wall, roof: { kind: "step-gable", pitch: 55, mat: S.slate, ridgeMat: S.ashlar("#a89c88") }, windows: { rows: [[-4, 4], [-4, 0, 4], [-4, 0, 4]], spec: { w: 0.9, h: 1.6, shape: "pointed", panes: [2, 3] } }, door: null }); b.place({ x: 9, y: 17, z: 0 });
    return done(b, frameSubject(b, -12), "golden"); } });
add({ id: "medieval-town-gate", label: "Medieval town gate", group: "alpine", region: "Germany, Rothenburg", era: "14th century", setting: "town", view: "exterior", scale: "civic", mood: "dusk",
  materials: ["rubble with ashlar quoins", "tall tile roof", "oak gates"], story: ["a lantern in the gate passage", "the road running through the tower"],
  note: "Gate towers stand astride the road with a deep passage, their pyramid roofs of tile, the town wall running off each side.",
  build: (seed = 26) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "cobbles", moss: 0.25 });
    const wall = { kind: "coursed-rubble", colour: "#b7a888", moss: 0.3, age: 0.7 } as SurfaceSpec;
    const wm = b.mat(wall); b.add(cut(boxAt(-4.5, 0, -4, 4.5, 20, 4, wm), [opening(0, 0, 3.8, 3.2, "pointed", -6, 6)]));
    b.add(spire(0, 0, 20, 30, 5, 4, b.mat(S.plainTile), 0, Math.PI / 4)); b.light({ x: 0, y: 4, z: 0, kelvin: 2000, power: 0.4, lamp: true });
    for (const s of [-1, 1]) placeHouse(b, { w: 7, d: 8, storeys: 3, storeyH: 2.7, walls: [S.plaster("#d9c4a0"), S.frame("#ece0c4", "#3e2e22", "cross")], roof: { kind: "gable-front", pitch: 55, mat: S.plainTile }, windows: { rows: [[0], [-1.6, 1.6], [0]], spec: W.leaded(0.9, 1.0) }, door: { x: 1.6 } }, s * 9, 12, 0);
    const cam = frameSubject(b, 8, { pad: 0.06 });
    curtainWall(b, -40, -4.5, 0, 8, wall); curtainWall(b, 4.5, 40, 0, 8, wall); b.place();
    return done(b, cam, "dusk"); } });
add({ id: "alpine-hay-barn", label: "Alpine hay barn (Stadel)", group: "alpine", region: "Austria, Tyrol", era: "19th century", setting: "mountain", view: "exterior", scale: "humble", mood: "morning",
  materials: ["sun-blackened larch logs", "board roof weighted with stones"], story: ["a meadow of flowers", "logs notched at the corners"],
  note: "Board roofs weighted by rows of stones at a low pitch; logs crossed and notched at the corners, sun-blackened on the south.",
  build: (seed = 27) => { const b = new SceneBuilder(seed); countryside(b, { grass: "#76893e", lane: false, trees: [[-12, -12, 14]] });
    placeHouse(b, { w: 6, d: 5, storeys: 1, storeyH: 3.2, walls: S.log("#4a3424"), roof: { kind: "gable", pitch: 20, mat: S.boards("#5a4636", 0.8), over: 0.7 }, door: { x: 0, w: 1.8, h: 2.2, mat: S.boards("#3e2c20") } }, 0, 0, -30, 0.006, () => {
      for (let i = 0; i < 6; i++) b.add(clump(-2.5 + i, 3.2 + 1.7 * 0.364 + 0.12, 0.8 * (i % 2 ? 1 : -1), 0.25, 0.16, 0.25, b.mat(S.rubble("#8a857a")), b.r(), 0.3)); });
    const cam = frameSubject(b, 8, { pad: 0.22 });
    for (let i = 0; i < 30; i++) b.add(clump(-12 + b.r() * 24, 0.05, 2 + b.r() * 10, 0.4, 0.2, 0.4, b.mat({ kind: "foliage", colour: "#5f7a3a", colour2: ["#e8d070", "#d06a8a", "#f0f0e8"][i % 3] }), b.r()));
    b.place();
    return done(b, cam, "morning"); } });

// Low Countries -----------------------------------------------------------------------------------------------------------
const canalRow = (b: SceneBuilder, kinds: HouseSpec["roof"]["kind"][], colours: string[], seed: number) => {
  water(b, -200, 200, 4, 30, -1.4, "#3a5254"); ground(b, -200, 200, -200, 4, { kind: "setts" }, 0.02); ground(b, -200, 200, 30, 200, { kind: "setts" }, 0.02);
  b.add(boxAt(-80, -3, 3.5, 80, 0.02, 4.1, b.mat(S.brick("#7a3a2a")))); b.place();
  kinds.forEach((kind, k) => placeHouse(b, { w: 6.2, d: 14, storeys: 4, storeyH: 3, plinth: 0.8, walls: S.brick(colours[k % colours.length], "flemish"), roof: { kind, pitch: 55, mat: S.plainTile, ridgeMat: S.ashlar("#e8e2d4") }, hoist: true,
    windows: { rows: [[1.6], [-1.6, 1.6], [-1.6, 1.6], [0]], spec: W.sash(1.1, 2.0, { panes: [2, 3], frame: S.paint("#ece8e0"), surround: S.paint("#ece8e0", 0.1) }) }, door: { x: -1.6, mat: S.paint(["#1f3a2a", "#2a2a2a", "#3a1f22"][k % 3]) } }, (k - (kinds.length - 1) / 2) * 6.3, 0, 0, 0.012 + ((k * 7 + seed) % 3) * 0.004));
};
add({ id: "amsterdam-step-gables", label: "Amsterdam canal houses", group: "low-countries", region: "Netherlands, Amsterdam", era: "17th century", setting: "riverside", view: "exterior", scale: "domestic", mood: "golden",
  materials: ["brick in Flemish bond", "step, neck and bell gables", "white sash windows"], story: ["hoist beams in the gables", "facades leaning forward", "the canal mirroring them"],
  note: "Canal houses lean forward on purpose (a few centimetres per storey) so goods hoisted from the gable beam clear the facade; piles settling lean them further.",
  build: (seed = 28) => { const b = new SceneBuilder(seed); canalRow(b, ["step-gable", "neck-gable", "bell-gable", "step-gable", "neck-gable"], ["#7f3a2a", "#4a2a24", "#8a4a34", "#6a3226", "#5a2e26"], seed);
    return done(b, frameSubject(b, -14, { fov: 60, eye: 4.5 }), "golden"); } });
add({ id: "bruges-belfry", label: "Market square belfry", group: "low-countries", region: "Belgium, Bruges", era: "13th–15th century", setting: "city", view: "exterior", scale: "monumental", mood: "overcast",
  materials: ["brick and Gothic stone", "an octagonal top stage", "lead"], story: ["the market hall below", "a carillon"],
  note: "Belfries rise in square stages, then an octagonal lantern, as a sign of the town's freedom; the hall below kept charters and cloth.",
  build: (seed = 29) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "cobbles" });
    placeHouse(b, { w: 30, d: 14, storeys: 2, storeyH: 5, walls: S.brick("#9a5a40"), roof: { kind: "hip", pitch: 45, mat: S.plainTile }, windows: { rows: [[-10, -5, 5, 10], [-10, -5, 0, 5, 10]], spec: { w: 1.4, h: 3, shape: "pointed", panes: [2, 4] } }, door: { x: 0, w: 2.5, h: 4, shape: "pointed" } }, 0, 0, 0, 0, () => {
      tower(b, { x: 0, z: -2, plan: "square", r: 4.5, h: 46, wall: S.brick("#9a5a40"), belfry: true, clock: 38 }); });
    // the stone octagon stands on the brick tower, ringed by a pierced parapet, with a small turret at each corner of the square below
    const stone = b.mat(S.ashlar("#cfc4ad", 0.4)), lead = b.mat({ kind: "lead" });
    for (const [cx, cz] of [[-4.2, -6.2], [4.2, -6.2], [-4.2, 2.2], [4.2, 2.2]] as const) b.add(cylY(cx, cz, 40, 48.5, 0.75, stone), coneY(cx, cz, 48.5, 52, 0.95, 0.05, lead));
    b.add(cut(boxAt(-4.7, 46, -6.7, 4.7, 47.2, 2.7, stone), [boxAt(-4.3, 46.3, -6.3, 4.3, 48, 2.3, 0)]));
    b.add(octShaft(0, -2, 46, 70, 3.5, stone, Math.PI / 8), cut(octShaft(0, -2, 64, 68, 3.6, stone, Math.PI / 8), [opening(0, 64.4, 1.6, 2.2, "pointed", -6, 2, "z"), opening(-2, 64.4, 1.6, 2.2, "pointed", -4, 4, "x")]));
    b.add(cut(octShaft(0, -2, 70, 71.4, 3.95, stone, Math.PI / 8), [octShaft(0, -2, 70.3, 72, 3.6, 0, Math.PI / 8)]), octShaft(0, -2, 70, 76, 1.6, lead, Math.PI / 8), coneY(0, -2, 76, 79.5, 1.8, 0.05, lead), sphere(0, 79.6, -2, 0.25, b.mat({ kind: "gold" })));
    for (let k = 0; k < 8; k++) { const a = (k + 0.5) * (Math.PI / 4), r = 3.5 / Math.cos(Math.PI / 8); b.add(cylY(Math.cos(a) * r, -2 + Math.sin(a) * r, 46, 71.6, 0.28, stone), coneY(Math.cos(a) * r, -2 + Math.sin(a) * r, 71.6, 73.4, 0.32, 0.03, stone)); }
    b.place();
    return done(b, frameSubject(b, -16), "overcast"); } });
add({ id: "dutch-windmill", label: "Dutch smock windmill", group: "low-countries", region: "Netherlands, polder", era: "18th century", setting: "rural", view: "exterior", scale: "civic", mood: "morning",
  materials: ["thatched smock on a brick base", "a turning cap", "lattice sails with canvas"], story: ["a stage around the mill", "a ditch", "flat polder to the horizon"],
  note: "The cap turns the sails into the wind; canvas is reefed on the lattice; the stage lets the miller reach the sails.",
  build: (seed = 30) => { const b = new SceneBuilder(seed); countryside(b, { hills: false, grass: "#6f8440" }); water(b, -300, 300, 9, 12, -0.4, "#4a6a6e");
    windmill(b, 0, 0, 16, 4.6, S.thatch, S.thatch, 28); b.add(cylY(0, 0, 0, 3.5, 5.2, b.mat(S.brick("#7a3a2a")))); b.add(cylY(0, 0, 3.4, 3.6, 7, b.mat(S.boards("#5a4a3a")))); b.place();
    return done(b, frameSubject(b, -8), "morning"); } });
add({ id: "flemish-guildhall", label: "Flemish guildhall", group: "low-countries", region: "Belgium, Antwerp", era: "16th–17th century", setting: "city", view: "exterior", scale: "civic", mood: "golden",
  materials: ["sandstone with gilded ornament", "curved Baroque gable", "slate"], story: ["a gilded statue on the gable", "the guild's emblem"],
  note: "Guild houses compete in gables: volutes, obelisks and a gilded figure on top.",
  build: (seed = 31) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "cobbles" });
    [0, 1, 2].forEach(k => placeHouse(b, { w: 8, d: 12, storeys: 4, storeyH: 3.2, walls: S.ashlar(["#d9c9a6", "#cbb894", "#d6c19c"][k], 0.34), roof: { kind: k === 1 ? "curved-gable" : "neck-gable", pitch: 55, mat: S.slate, ridgeMat: { kind: "gold" } }, windows: { rows: [[2.2], [-2.2, 0, 2.2], [-2.2, 0, 2.2], [-1.2, 1.2]], spec: W.sash(1.1, 2.0, { surround: S.ashlar("#e6dcc4"), hood: k === 1 ? "pediment" : "cornice" }) }, door: { x: -2.2, shape: "round" }, bands: S.ashlar("#e6dcc4") }, (k - 1) * 8.1, 0, 0));
    return done(b, frameSubject(b, -18), "golden"); } });
add({ id: "frisian-farmhouse", label: "Frisian head-neck-body farm", group: "low-countries", region: "Netherlands, Friesland", era: "18th–19th century", setting: "rural", view: "exterior", scale: "domestic", mood: "overcast",
  materials: ["brick house", "a pyramid-roofed barn of thatch and tile"], story: ["the barn's vast pyramid roof", "a farmyard"],
  note: "House (head), a narrow link (neck) and a huge barn (body) under a pyramid roof whose thatch skirts reach low.",
  build: (seed = 32) => { const b = new SceneBuilder(seed); countryside(b, { hills: false, trees: [[-16, -6, 10], [-19, -2, 9]] });
    placeHouse(b, { w: 9, d: 8, storeys: 2, storeyH: 2.8, walls: S.brick("#8a3e2c"), roof: { kind: "gable-front", pitch: 50, mat: S.plainTile }, windows: { rows: [[-2.5, 2.5], [0]], spec: W.sash(1.0, 1.5, { frame: S.paint("#ffffff") }) }, door: { x: 0, mat: S.paint("#1f3a2a") } }, -8, 6, 0);
    placeHouse(b, { w: 18, d: 18, storeys: 1, storeyH: 3.2, walls: S.brick("#8a3e2c"), roof: { kind: "pyramid", pitch: 52, mat: S.thatch, over: 0.6 }, door: { x: 4, w: 3, h: 3, mat: S.boards("#2f4a3a") } }, 7, -6, 0);
    return done(b, frameSubject(b, 22), "overcast"); } });
add({ id: "antwerp-baroque-house", label: "Baroque merchant house", group: "low-countries", region: "Belgium", era: "17th century", setting: "city", view: "exterior", scale: "domestic", mood: "rain",
  materials: ["brick with stone dressings", "bell gable with volutes", "glazed tile roof"], story: ["the wet square reflecting the gables", "a cart by the door"],
  note: "Stone dressings (quoins, window heads, bands) frame the brick; the bell gable hides the roof behind it.",
  build: (seed = 33) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "setts", moss: 0.2 });
    [0, 1, 2].forEach(k => placeHouse(b, { w: 7, d: 12, storeys: 3, storeyH: 3.2, walls: S.brick(["#8a4430", "#7f3a2a", "#934c35"][k], "flemish"), quoins: S.ashlar("#e0d6c0"), roof: { kind: "bell-gable", pitch: 55, mat: S.plainTile, ridgeMat: S.ashlar("#e0d6c0") }, windows: { rows: [[1.8], [-1.8, 1.8], [-1.8, 1.8]], spec: W.sash(1.1, 2.0, { surround: S.ashlar("#e0d6c0") }) }, door: { x: -1.8, shape: "round" }, bands: S.ashlar("#e0d6c0") }, (k - 1) * 7.05, 0, 0, 0.006 * (k - 1)));
    lamppost(b, 5, 6); b.place();
    return done(b, frameSubject(b, 20), "rain"); } });

// Italy -------------------------------------------------------------------------------------------------------------------
add({ id: "florentine-palazzo", label: "Florentine Renaissance palazzo", group: "italian", region: "Italy, Florence", era: "1444–1460", setting: "city", view: "exterior", scale: "civic", mood: "golden",
  materials: ["rusticated pietra forte, smoother each floor", "bifora windows", "a great cornice"], story: ["iron torch rings", "a stone bench along the base"],
  note: "Rustication diminishes upward (rough, then drafted, then smooth ashlar) under one massive crowning cornice.",
  build: (seed = 34) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "flags", colour: "#8a8478" });
    placeHouse(b, { w: 30, d: 20, storeys: 3, storeyH: 6, walls: [{ kind: "rustication", colour: "#b9a280", course: 0.6, unit: 1.1 }, { kind: "rustication", colour: "#c2ac88", course: 0.45, unit: 0.9 }, S.ashlar("#c9b490", 0.4)], roof: { kind: "hip", pitch: 22, mat: S.pantile, over: 0.3 },
      windows: { rows: [[-10, 10], [-12, -6, 0, 6, 12], [-12, -6, 0, 6, 12]], spec: { w: 1.6, h: 3.4, shape: "round", panes: [2, 5], frame: S.paint("#5a4a3a") }, sillH: 1.2 }, door: { x: 0, w: 3, h: 5, shape: "round", mat: S.boards("#4a3424") }, cornice: S.ashlar("#c9b490"), bands: S.ashlar("#c9b490") }, 0, 0, -22, 0, () => bench(b, -8, 10.2, 6));
    return done(b, frameSubject(b, 16), "golden"); } });
add({ id: "tuscan-farmhouse", label: "Tuscan farmhouse with dovecote", group: "italian", region: "Italy, Tuscany", era: "18th century", setting: "rural", view: "exterior", scale: "domestic", mood: "golden",
  materials: ["stone and brick", "coppi and embrici tiles", "a colombaia tower"], story: ["cypresses on the drive", "an outside stair and loggia", "olive trees"],
  note: "The casa colonica's dovecote tower (colombaia) rises above the farmhouse; Roman tiles (flat embrici under curved coppi) at a low pitch.",
  build: (seed = 35) => { const b = new SceneBuilder(seed); countryside(b, { grass: "#8f8f52", laneColour: "#b8a07a" });
    const wall = { kind: "rubble", colour: "#b89c78", colour2: "#c8b494", moss: 0.15, age: 0.6 } as SurfaceSpec;
    placeHouse(b, { w: 14, d: 9, storeys: 2, storeyH: 3, walls: wall, roof: { kind: "hip", pitch: 22, mat: S.pantile, over: 0.4 }, windows: { rows: [[-4.5, 4.5], [-4.5, 0, 4.5]], spec: W.shuttered("#6f5a3a", 0.85, 1.3) }, door: { x: 0, shape: "round", w: 1.4, h: 2.6 } }, 0, 0, -20);
    // the colombaia rises through the roof at the back of the house
    house(b, { w: 4, d: 4, storeys: 3, storeyH: 3, walls: wall, roof: { kind: "pyramid", pitch: 22, mat: S.pantile, over: 0.3 }, windows: { rows: [[], [], [-0.9, 0.9]], spec: { w: 0.35, h: 0.55, shape: "round", panes: [1, 1] } }, door: null });
    b.place({ x: -2.6, z: -1.6, yaw: -20 });
    const cam = frameSubject(b, 10, { pad: 0.2 });
    for (let i = 0; i < 5; i++) cypress(b, 10 + i * 2.6, 8 + i * 2.2, 10 + b.r() * 2);
    for (let i = 0; i < 4; i++) tree(b, -12 - i * 4, 6 + (i % 2) * 3, 4, 2, { kind: "foliage", colour: "#7d8a5a" });
    b.place();
    return done(b, cam, "golden"); } });
add({ id: "venetian-gothic-palazzo", label: "Venetian Gothic palazzo", group: "italian", region: "Italy, Venice", era: "15th century", setting: "riverside", view: "exterior", scale: "civic", mood: "morning",
  materials: ["pink-washed brick", "Istrian stone traceried windows", "a water gate"], story: ["mooring poles", "the canal lapping the steps"],
  note: "Venetian Gothic groups pointed and ogee windows into a central loggia over a water gate, in white Istrian stone on coloured render.",
  build: (seed = 36) => { const b = new SceneBuilder(seed); water(b, -300, 300, -300, 300, -0.4, "#3f6a62");
    placeHouse(b, { w: 18, d: 14, storeys: 3, storeyH: 4.2, walls: S.plaster("#d9a796", 0.2), roof: { kind: "hip", pitch: 20, mat: S.pantile, over: 0.6 }, windows: { rows: [[-6, 6], [-6, -1.8, -0.6, 0.6, 1.8, 6], [-6, -1.8, -0.6, 0.6, 1.8, 6]], spec: { w: 1.0, h: 2.6, shape: "ogee", panes: [1, 3], surround: S.ashlar("#efece4") }, sillH: 0.9 }, door: { x: 0, w: 3, h: 3.2, shape: "round", mat: S.boards("#3a4a3a") }, cornice: S.ashlar("#efece4"), chimneys: [{ x: -6, h: 2.5, mat: S.plaster("#c98a7a") }] }, 0, -2, -14, 0, () => {
      for (const x of [-3, 3, 5]) b.add(cylY(x, 9.5, -1.5, 3.2, 0.12, b.mat({ kind: "painted-wood", colour: x > 0 ? "#2a4a8a" : "#e9e2d2" }))); });
    return done(b, frameSubject(b, 12), "morning"); } });
add({ id: "ligurian-painted-houses", label: "Ligurian painted fishing houses", group: "italian", region: "Italy, Cinque Terre", era: "18th–19th century", setting: "coast", view: "exterior", scale: "domestic", mood: "golden",
  materials: ["render in ochre, rose and terracotta", "green louvered shutters", "slate roofs"], story: ["boats pulled up", "painted window surrounds (trompe-l'œil)", "the sea below"],
  note: "Tall narrow houses in strong colours so fishermen knew their own; window frames painted on flat render.",
  build: (seed = 37) => { const b = new SceneBuilder(seed); water(b, -400, 400, 2, 400, -0.6, "#2e5f6a"); ground(b, -400, 400, -400, 2, { kind: "flags", colour: "#9a8f80" }, 0.6);
    ["#d99a4a", "#c9705a", "#e8c070", "#d98a80", "#c8a46a"].forEach((c, k) => placeHouse(b, { w: 5.5, d: 9, storeys: 5, storeyH: 2.8, walls: S.plaster(c, 0.18), roof: { kind: "gable", pitch: 28, mat: S.slate }, windows: { rows: [[1.3], [-1.3, 1.3], [-1.3, 1.3], [-1.3, 1.3], [-1.3, 1.3]], spec: W.shuttered("#2f6a4a", 0.8, 1.3, { surround: { kind: "plaster", colour: "#f0e8d8" } }) }, door: { x: -1.4 } }, (k - 2) * 5.6, -6 - (k % 2) * 2, 0, 0, undefined));
    b.place({ y: 0.6 });
    return done(b, frameSubject(b, -10), "golden"); } });
add({ id: "roman-street-laundry", label: "Roman side street", group: "italian", region: "Italy, Rome (Trastevere)", era: "17th–19th century", setting: "city", view: "exterior", scale: "domestic", mood: "golden",
  materials: ["ochre and rust stucco", "peperino doorways", "cobbles (sampietrini)"], story: ["laundry across the street", "ivy over a doorway", "a street shrine"],
  note: "Stucco in iron-oxide ochres and reds flakes to show brick; sampietrini are small basalt setts.",
  build: (seed = 38) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "setts", colour: "#5f5d5a", unit: 0.12 });
    const cols = ["#d48a4a", "#c46a42", "#e0a860", "#b85a3a", "#d89a5a", "#c87a4a"];
    for (let k = 0; k < 6; k++) streetSide(b, { w: 9, d: 10, storeys: 4, storeyH: 3.2, walls: S.plaster(cols[k], 0.35), roof: { kind: "gable", pitch: 22, mat: S.pantile }, windows: { rows: [[2.5], [-2.5, 2.5], [-2.5, 2.5], [-2.5, 2.5]], spec: W.shuttered(["#5a6a3a", "#3a5a6a", "#6a4a2a"][k % 3], 0.9, 1.6) }, door: { x: -2.2, mat: S.boards("#3a2a20") }, ivy: k === 2 ? [{ x: -2.2, w: 3, h: 4 }] : undefined }, k % 2 ? 1 : -1, -Math.floor(k / 2) * 9.2, 2.6);
    // laundry on lines across the street
    const rope = b.mat({ kind: "iron" }), sheet = b.mat({ kind: "fabric", colour: "#ece6d8", colour2: "#a9bcc8" });
    for (const [z, y] of [[-4, 8.6], [-12, 11.8]]) { b.add(boxAt(-2.6, y, z, 2.6, y + 0.02, z + 0.02, rope)); for (const x of [-1.6, -0.2, 1.2]) b.add(boxAt(x, y - 0.9 - 0.2 * Math.abs(x), z - 0.01, x + 0.9, y, z + 0.01, sheet)); }
    b.place();
    return done(b, { x: 0.4, y: 1.6, z: 9, yaw: 0, fov: 64, shift: 0.42 }, "golden"); } });
add({ id: "hill-town-campanile", label: "Italian hill-town campanile", group: "italian", region: "Italy, Umbria", era: "13th century", setting: "village", view: "exterior", scale: "civic", mood: "noon",
  materials: ["pink and white limestone", "a brick campanile with arched belfry", "terracotta"], story: ["swallows round the tower", "the square below"],
  note: "Campanili stand apart from their church, plain shafts opening into arcaded belfry stages at the top.",
  build: (seed = 39) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "flags", colour: "#a99e8c" });
    church(b, { style: "romanesque", L: 26, W: 12, H: 12, bays: 4, wall: { kind: "ashlar", colour: "#d9c2b0", course: 0.4, age: 0.5 }, roof: S.pantile, towers: "west", towerH: 0.1, spire: null, rose: true, apse: true, glass: { kind: "glass" } });
    tower(b, { x: 10, z: -8, plan: "square", r: 2.6, h: 32, wall: S.brick("#b26a48"), belfry: true, roof: { kind: "pyramid", h: 5, mat: S.pantile } });
    b.place({ yaw: -100 });
    return done(b, frameSubject(b, -24), "noon"); } });
add({ id: "trulli-alberobello", label: "Trulli of Alberobello", group: "italian", region: "Italy, Apulia", era: "18th century", setting: "village", view: "exterior", scale: "humble", mood: "noon",
  materials: ["dry-stone corbelled cones", "whitewashed walls", "white pinnacles"], story: ["symbols painted on the cones", "a cluster round a yard"],
  note: "Corbelled limestone slabs (chiancarelle) close each cone without mortar; walls are whitewashed, cones left grey.",
  build: (seed = 40) => { const b = new SceneBuilder(seed); countryside(b, { grass: "#9f9a6a", laneColour: "#c4b49a" });
    for (const [x, z, r] of [[-4, 0, 2.4], [0.5, -1, 2.8], [5, 0.5, 2.2], [-1, 4, 2.0], [8.5, -3, 2.5]]) trullo(b, x, z, r);
    b.place();
    return done(b, frameSubject(b, -14), "noon"); } });
add({ id: "roman-baroque-church", label: "Roman Baroque church", group: "italian", region: "Italy, Rome", era: "1630–1670", setting: "city", view: "exterior", scale: "monumental", mood: "golden",
  materials: ["travertine", "a ribbed lead dome", "volutes and a broken pediment"], story: ["a fountain in the piazza", "the dome's lantern catching the last sun"],
  note: "Baroque fronts curve and layer pilasters; side volutes step down from the upper storey; the dome rises on a windowed drum.",
  build: (seed = 41) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "flags", colour: "#a8a092" });
    domeChurch(b, { w: 22, d: 30, h: 16, wall: S.ashlar("#e4d9c0", 0.42), dome: { kind: "lead" }, drumR: 7, drumH: 5.5, baroque: true, ribs: S.ashlar("#e4d9c0") });
    b.add(cylY(0, 26, 0, 0.8, 4, b.mat(S.ashlar("#d9cfb8"))), cylY(0, 26, 0.75, 0.8, 3.6, b.mat({ kind: "water", colour: "#4a6a6a" })), revolve(0, 26, 0.8, 3.4, t => 0.6 - 0.4 * t + 0.3 * Math.sin(t * 6), 0.9, b.mat(S.ashlar("#d9cfb8")), 0, 3));
    b.place({ yaw: -14 });
    return done(b, frameSubject(b, 0, { fov: 58 }), "golden"); } });
add({ id: "lombard-romanesque-church", label: "Lombard Romanesque church", group: "italian", region: "Italy, Lombardy", era: "11th–12th century", setting: "village", view: "exterior", scale: "civic", mood: "morning",
  materials: ["brick and stone", "Lombard bands of small arches", "a rose window"], story: ["pilaster strips", "a porch on lions"],
  note: "Thick walls stiffened by pilaster strips and finished by rows of small blind arches under the eaves (Lombard bands).",
  build: (seed = 42) => { const b = new SceneBuilder(seed); countryside(b, { trees: [[18, -10, 10]] });
    church(b, { style: "romanesque", L: 24, W: 14, H: 13, bays: 5, wall: S.brick("#a6603f"), roof: S.pantile, aisles: { w: 5, h: 7 }, towers: "west", towerH: 0.1, spire: null, rose: true, apse: true, glass: { kind: "glass" } });
    tower(b, { x: 16, z: -9, plan: "square", r: 2.6, h: 28, wall: S.brick("#a6603f"), belfry: true, roof: { kind: "cone", h: 5, mat: S.pantile } });
    b.place({ yaw: -64 });
    return done(b, frameSubject(b, -10), "morning"); } });

// Iberia and the Mediterranean ---------------------------------------------------------------------------------------------
add({ id: "cycladic-cliffside", label: "Cycladic cliffside houses", group: "mediterranean", region: "Greece, Santorini", era: "18th–19th century", setting: "coast", view: "exterior", scale: "humble", mood: "noon",
  materials: ["lime-whitewashed rubble", "barrel vaults", "blue painted doors"], story: ["terraces where one roof is the next house's yard", "stairs down to the sea"],
  note: "Whitewash (lime, water, sea salt) keeps houses cool; vaults and flat roofs that gather water step down the cliff, each roof the terrace above the next.",
  build: (seed = 43) => { const b = new SceneBuilder(seed); water(b, -600, 600, 10, 600, -40, "#2a5f88");
    const cliff = b.mat({ kind: "rock", colour: "#8a6a58" }); b.add(clump(0, -20, -30, 120, 60, 40, cliff, 0.3, 0.12)); b.place();
    const white = S.limewash("#f5f3ec", 0.06, "rubble");
    for (let k = 0; k < 12; k++) { const row = Math.floor(k / 4), x = (k % 4 - 1.5) * 8 + (row % 2) * 4, y = 30 - row * 6, z = -8 + row * 5;
      house(b, { w: 6, d: 6, storeys: 1, storeyH: 3.2, walls: white, roof: { kind: "flat", pitch: 1, mat: S.limewash("#f5f3ec", 0.04), gableMat: white }, windows: { rows: [[1.5]], spec: W.shuttered("#2f6ab0", 0.8, 1.1) }, door: { x: -1.2, mat: S.paint("#2f6ab0", 0.1), step: null } });
      if (k % 3 === 0) b.add(cut(cylY(0, 0, 3.2, 3.2, 0, 0), []), dome(0, 3.2, 0, 2.4, 2.2, b.mat(S.paint("#2f6ab0", 0.05))));
      b.place({ x, y, z }); }
    return done(b, frameSubject(b, 14, { eye: 22 }), "noon"); } });
add({ id: "blue-domed-chapel", label: "Blue-domed island chapel", group: "mediterranean", region: "Greece, Cyclades", era: "19th century", setting: "coast", view: "exterior", scale: "humble", mood: "golden",
  materials: ["whitewash", "a blue-painted dome", "a pierced bell gable"], story: ["bells hung in the gable wall", "the sea beyond"],
  note: "Small chapels carry a dome on a drum and a pierced bell gable; walls and paving are whitewashed, the dome painted blue.",
  build: (seed = 44) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 0, { kind: "flags", colour: "#e9e6dc" }, 0); water(b, -600, 600, 0, 600, -30, "#2a5f88");
    const white = S.limewash("#f6f4ee", 0.05, "rubble"), wm = b.mat(white);
    house(b, { w: 6, d: 10, storeys: 1, storeyH: 4.2, walls: white, roof: { kind: "flat", pitch: 1, mat: white, gableMat: white }, door: { x: 0, shape: "round", mat: S.paint("#2a5fa8", 0.05), step: null }, windows: { rows: [[-1.8, 1.8]], spec: { w: 0.5, h: 0.9, shape: "round", panes: [1, 2] } } });
    b.add(cylY(0, -1, 4.2, 5.6, 2.2, wm), dome(0, 5.6, -1, 2.3, 2.1, b.mat(S.paint("#2a5fa8", 0.04))), cylY(0, -1, 7.6, 8.2, 0.05, b.mat({ kind: "iron" })));
    b.add(cut(boxAt(-2, 4.2, 4.6, 2, 7.6, 5, wm), [opening(-0.9, 5, 0.8, 0.9, "round", 4.4, 5.2), opening(0.9, 5, 0.8, 0.9, "round", 4.4, 5.2)]));
    b.place({ yaw: 28 });
    return done(b, frameSubject(b, -6), "golden"); } });
add({ id: "andalusian-white-village", label: "Andalusian white village", group: "mediterranean", region: "Spain, Andalusia", era: "18th–19th century", setting: "village", view: "exterior", scale: "humble", mood: "noon",
  materials: ["whitewashed walls", "curved clay tiles", "iron window grilles (rejas)"], story: ["geraniums in blue pots on the walls", "a narrow climbing street"],
  note: "Thick whitewashed walls and small barred windows against heat; roofs of curved tiles at a low pitch; pots hung on the walls.",
  build: (seed = 45) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "cobbles", colour: "#9a9284", moss: 0.1 });
    const white = S.limewash("#f6f3ea", 0.08, "rubble");
    for (let k = 0; k < 6; k++) streetSide(b, { w: 9, d: 7, storeys: 2, storeyH: 2.9, walls: white, roof: { kind: "gable", pitch: 20, mat: S.pantile, over: 0.3 }, windows: { rows: [[2.2], [-2.2, 2.2]], spec: { w: 0.8, h: 1.2, panes: [1, 2], frame: S.paint("#5a3a2a"), flowers: "#d0302a" } }, door: { x: -2, mat: S.boards("#6a3a24") } }, k % 2 ? 1 : -1, -Math.floor(k / 2) * 9.1 - (k % 2) * 3, 2.2);
    return done(b, { x: 0.3, y: 1.6, z: 9, yaw: 0, fov: 62, shift: 0.3 }, "noon"); } });
add({ id: "portuguese-azulejo-house", label: "Portuguese azulejo house", group: "mediterranean", region: "Portugal, Lisbon", era: "19th century", setting: "city", view: "exterior", scale: "domestic", mood: "morning",
  materials: ["glazed tile cladding (azulejos)", "stone window frames", "iron balconies"], story: ["a tram rail in the street", "laundry on a balcony"],
  note: "Tiled façades shed rain and salt; tiles about 14 cm square in repeating blue-and-white patterns, framed by stone.",
  build: (seed = 46) => { const b = new SceneBuilder(seed); town(b, 6, 12);
    ["#2f5f8a", "#3f7a6a", "#8a3a3a"].forEach((c, k) => placeHouse(b, { w: 7, d: 10, storeys: 3, storeyH: 3.3, walls: { kind: "glazed-tile", colour: c, colour2: "#efe9dc", unit: 0.14, pattern: "star" }, roof: { kind: "gable", pitch: 25, mat: S.pantile }, windows: { rows: [[1.7], [-1.7, 1.7], [-1.7, 1.7]], spec: W.sash(1.1, 2.1, { surround: S.ashlar("#ece6d8") }) }, balconies: [{ storey: 1 }, { storey: 2 }], door: { x: -1.7, mat: S.paint("#3a2a20") }, cornice: S.ashlar("#ece6d8") }, (k - 1) * 7.05, 0, 0));
    return done(b, frameSubject(b, -22), "morning"); } });
add({ id: "mallorcan-finca", label: "Mallorcan stone finca", group: "mediterranean", region: "Spain, Majorca", era: "18th century", setting: "rural", view: "exterior", scale: "domestic", mood: "golden",
  materials: ["golden marès sandstone", "green shutters", "Arab tiles"], story: ["an olive grove", "dry-stone terraces", "a round-arched portal"],
  note: "Fincas are courtyard farms of marès stone with a big round-arched portal and green shutters.",
  build: (seed = 47) => { const b = new SceneBuilder(seed); countryside(b, { grass: "#9a9458", laneColour: "#c4ae84" });
    const finca = () => placeHouse(b, { w: 16, d: 9, storeys: 2, storeyH: 3, walls: { kind: "rubble", colour: "#c8a878", moss: 0.1, age: 0.5 }, quoins: S.ashlar("#d8bc8a"), roof: { kind: "gable", pitch: 22, mat: S.pantile, over: 0.3 }, windows: { rows: [[-5, 5], [-5, -1.5, 1.5, 5]], spec: W.shuttered("#3f6a3a", 0.9, 1.3) }, door: { x: 0, shape: "round", w: 2.4, h: 3.2, surround: S.ashlar("#d8bc8a"), mat: S.boards("#4a3424") } }, 0, 0, 18);
    finca(); const cam = frameSubject(b, -10, { pad: 0.16 });
    for (let i = 0; i < 6; i++) tree(b, (i < 3 ? -24 : 16) + (i % 3) * 4, 2 + (i % 2) * 5, 3.6, 1.8, { kind: "foliage", colour: "#8a9468" }); gardenWall(b, -20, 20, 9.5, 0.9);
    b.place();
    return done(b, cam, "golden"); } });
add({ id: "maltese-balcony-street", label: "Maltese balcony street", group: "mediterranean", region: "Malta, Valletta", era: "18th–19th century", setting: "city", view: "exterior", scale: "domestic", mood: "golden",
  materials: ["globigerina limestone", "closed timber balconies (gallariji) in bright paint"], story: ["a steep stepped street", "a statue niche on a corner"],
  note: "Closed wooden balconies on stone corbels, painted green, red, blue, on honey-coloured limestone.",
  build: (seed = 48) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "flags", colour: "#b3a58a" });
    for (let k = 0; k < 6; k++) { const s = k % 2 ? 1 : -1, z = -Math.floor(k / 2) * 10.1;
      house(b, { w: 10, d: 8, storeys: 3, storeyH: 3.3, walls: S.ashlar("#d9be8a", 0.3), roof: { kind: "flat", pitch: 1, mat: S.ashlar("#d9be8a"), gableMat: S.ashlar("#d9be8a") }, windows: { rows: [[-2.5, 2.5], [], []], spec: W.sash(1.0, 1.8) }, door: { x: 0, mat: S.paint("#2a4a2a") } });
      for (const st of [1, 2]) { const col = b.mat(S.paint(["#2f6a3a", "#8a2a2a", "#2a4a8a", "#3a6a2a", "#6a2a4a", "#2a6a6a"][k], 0.2)), gw = b.mat({ kind: "glass" }), stone = b.mat(S.ashlar("#d9be8a")); b.add(boxAt(-1.8, st * 3.3 + 0.3, 4, 1.8, st * 3.3 + 2.8, 4.9, col), boxAt(-1.6, st * 3.3 + 1.3, 4.88, 1.6, st * 3.3 + 2.5, 4.95, gw), boxAt(-2, st * 3.3 + 0.1, 4, 2, st * 3.3 + 0.32, 5.1, stone)); }
      b.place({ x: s * (3 + 4), z, yaw: s < 0 ? -90 : 90 }); }
    return done(b, { x: 0.2, y: 1.6, z: 9, yaw: 0, fov: 62, shift: 0.42 }, "golden"); } });
add({ id: "dalmatian-harbour", label: "Dalmatian stone harbour houses", group: "mediterranean", region: "Croatia, Dalmatia", era: "17th–18th century", setting: "coast", view: "exterior", scale: "domestic", mood: "morning",
  materials: ["white Brač limestone", "red tiles", "green shutters"], story: ["fishing boats at the quay", "a bell tower over the roofs"],
  note: "Pale limestone ashlar with stone-slab roofs inland and red tile on the coast; shutters in green.",
  build: (seed = 49) => { const b = new SceneBuilder(seed); water(b, -400, 400, 4, 400, -0.8, "#2f6a7a"); ground(b, -400, 400, -400, 4, { kind: "flags", colour: "#c9c2b0" }, 0.02);
    for (let k = 0; k < 5; k++) placeHouse(b, { w: 7, d: 9, storeys: 3, storeyH: 3, walls: S.ashlar("#e6dfcf", 0.3), roof: { kind: "gable", pitch: 26, mat: S.pantile }, windows: { rows: [[1.8], [-1.8, 1.8], [-1.8, 1.8]], spec: W.shuttered("#3f6a4a", 0.8, 1.3) }, door: { x: -1.8 } }, (k - 2) * 7.1, -6, 0);
    tower(b, { x: 4, z: -16, plan: "square", r: 2.5, h: 24, wall: S.ashlar("#e6dfcf"), belfry: true, roof: { kind: "pyramid", h: 5, mat: S.pantile } }); b.place();
    return done(b, frameSubject(b, 14), "morning"); } });
add({ id: "spanish-cloister", label: "Romanesque monastery cloister", group: "mediterranean", region: "Spain, Castile", era: "12th century", setting: "garden", view: "exterior", scale: "civic", mood: "golden",
  materials: ["sandstone", "paired columns with carved capitals", "round arches"], story: ["a well at the centre", "a cypress", "the shadow of the arcade on the walk"],
  note: "Cloister arcades rest on paired columns; the walk behind is roofed with a lean-to of tiles.",
  build: (seed = 50) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "grass", colour: "#7a8048" }); ground(b, -14, 14, -14, 14, { kind: "flags", colour: "#b8a88a" }, 0.03);
    const st = { kind: "ashlar", colour: "#cdb48a", course: 0.32, age: 0.6, moss: 0.2 } as SurfaceSpec;
    for (const [yaw, d] of [[0, -10], [90, -10], [-90, -10]] as const) { arcade(b, -10, 10, d, 7, 4.2, "round", st, 3, S.pantile); b.place({ yaw }); }
    b.add(cylY(0, 0, 0, 0.9, 1.1, b.mat(st))); cypress(b, 4, 3, 8); b.place();
    return done(b, look(0, 3, 0, 14, 0, 1.6, 62), "golden"); } });
add({ id: "mediterranean-lighthouse", label: "Mediterranean lighthouse", group: "mediterranean", region: "Mediterranean coast", era: "19th century", setting: "coast", view: "exterior", scale: "civic", mood: "dusk",
  materials: ["whitewashed tower", "an iron lantern", "the keeper's cottage"], story: ["the lamp lit at dusk", "rocks and spray"],
  note: "A tapering masonry tower carries an iron gallery and a glazed lantern; the keeper lives beside it.",
  build: (seed = 51) => { const b = new SceneBuilder(seed); water(b, -600, 600, -600, 600, -1, "#2f5a6a");
    b.add(clump(0, -3, 0, 22, 6, 16, b.mat({ kind: "rock", colour: "#7a7468" }), 0.3, 0.15)); b.place();
    lighthouse(b, 0, 0, 18, { kind: "plaster", colour: "#a8302a", flake: 0.1 }, S.limewash("#f2efe6", 0.1));
    placeHouse(b, { w: 7, d: 6, storeys: 1, storeyH: 3, walls: S.limewash("#f2efe6", 0.1), roof: { kind: "hip", pitch: 22, mat: S.pantile }, windows: { rows: [[-2, 2]], spec: W.shuttered("#2f5a6a") }, door: { x: 0 } }, 6, 3, -20);
    b.place({ y: 2.5 });
    return done(b, frameSubject(b, -20), "dusk"); } });

// Nordic and Eastern Europe ------------------------------------------------------------------------------------------------
add({ id: "borgund-stave-church", label: "Norwegian stave church", group: "nordic", region: "Norway, Borgund", era: "c. 1180–1250", setting: "mountain", view: "exterior", scale: "civic", mood: "winter",
  materials: ["pine staves, tarred", "shingles", "carved dragon heads"], story: ["a gallery round the base", "snow", "a lych-gate"],
  note: "Borgund's nave is about 11 m to the ridge; its stacked roofs rise to a turret and spire; tar keeps the pine dark; dragon heads guard the gables.",
  build: (seed = 52) => { const b = new SceneBuilder(seed); countryside(b, { grass: "#e8ecef", lane: false, trees: [[-16, -10, 14], [16, -12, 15]] });
    staveChurch(b); b.place({ yaw: -28 });
    return done(b, frameSubject(b, 6), "winter"); } });
add({ id: "falu-red-cottage", label: "Swedish Falu-red cottage", group: "nordic", region: "Sweden", era: "19th century", setting: "rural", view: "exterior", scale: "humble", mood: "golden",
  materials: ["boards painted Falu red", "white trim", "clay tiles"], story: ["a birch by the porch", "a meadow", "a flagpole"],
  note: "Falu red is copper-mine slag pigment in linseed and rye flour; it protects boards and fades softly.",
  build: (seed = 53) => { const b = new SceneBuilder(seed); countryside(b, { grass: "#6e8440", trees: [[-9, 3, 9], [12, -6, 11]] });
    placeHouse(b, { w: 10, d: 7, storeys: 1, storeyH: 3, walls: S.boards("#8e2e22", 0.3), roof: { kind: "gable", pitch: 38, mat: S.plainTile, over: 0.35 }, windows: { rows: [[-3, 3]], spec: { w: 0.9, h: 1.3, panes: [2, 3], frame: S.paint("#f2efe8", 0.05), surround: S.paint("#f2efe8", 0.05) } }, dormers: { count: 1, mat: S.plainTile }, door: { x: 0, mat: S.paint("#3a5a3a"), surround: S.paint("#f2efe8") }, chimneys: [{ x: 0, mat: S.limewash("#efece4") }] }, 0, 0, -22);
    return done(b, frameSubject(b, 10), "golden"); } });
add({ id: "norwegian-stabbur", label: "Norwegian stabbur (storehouse)", group: "nordic", region: "Norway", era: "18th century", setting: "mountain", view: "exterior", scale: "humble", mood: "morning",
  materials: ["logs", "a turf roof", "staddle posts"], story: ["raised on posts against damp and vermin", "flowers on the roof"],
  note: "Storehouses stand on posts so mice cannot climb; the upper floor oversails; turf roofs on birch bark.",
  build: (seed = 54) => { const b = new SceneBuilder(seed); countryside(b, { grass: "#6a7a3a", trees: [[-10, -8, 12]] });
    const log = S.log("#5a3e28"), lm = b.mat(log);
    for (const [x, z] of [[-2, -1.5], [2, -1.5], [-2, 1.5], [2, 1.5]]) b.add(boxAt(x - 0.25, 0, z - 0.25, x + 0.25, 1.2, z + 0.25, lm));
    house(b, { w: 5.5, d: 4.5, storeys: 2, storeyH: 2.3, jetty: 0.5, walls: log, roof: { kind: "gable", pitch: 30, mat: { kind: "turf" }, over: 0.5 }, door: { x: 0, step: null }, windows: { rows: [[], [0]], spec: { w: 0.4, h: 0.4, panes: [1, 1] } } });
    b.place({ y: 1.2, yaw: 24 });
    return done(b, frameSubject(b, -8, { pad: 0.16 }), "morning"); } });
add({ id: "icelandic-turf-house", label: "Icelandic turf houses", group: "nordic", region: "Iceland", era: "18th–19th century", setting: "rural", view: "exterior", scale: "humble", mood: "overcast",
  materials: ["turf walls on stone", "timber gable fronts", "grass roofs"], story: ["a row of gabled fronts", "the hill behind"],
  note: "Thick turf walls insulate; each room shows a white or tarred timber gable to the yard; roofs are grass.",
  build: (seed = 55) => { const b = new SceneBuilder(seed); countryside(b, { grass: "#6a7a48", lane: false });
    for (let k = 0; k < 4; k++) { placeHouse(b, { w: 4.5, d: 10, storeys: 1, storeyH: 2.4, walls: S.boards(k % 2 ? "#f0ece2" : "#3a2a20", 0.3), roof: { kind: "gable-front", pitch: 48, mat: { kind: "turf" }, gableMat: S.boards(k % 2 ? "#f0ece2" : "#3a2a20", 0.3), over: 0.1 }, windows: { rows: [[1.2]], spec: { w: 0.6, h: 0.7, panes: [2, 2] } }, door: { x: -0.8, mat: S.paint("#2a3a2a") } }, (k - 1.5) * 5.2, 0, 0); }
    b.add(boxAt(-12, 0, -6, 12, 2.4, 4.6, b.mat({ kind: "turf-wall" }))); b.place();
    return done(b, frameSubject(b, -12), "overcast"); } });
add({ id: "danish-thatched-farm", label: "Danish half-timbered farm", group: "nordic", region: "Denmark, Funen", era: "18th century", setting: "rural", view: "exterior", scale: "humble", mood: "golden",
  materials: ["yellow-ochre limewash on timber frame", "reed thatch with a turf ridge", "tarred base"], story: ["a four-winged farmyard", "a stork's nest"],
  note: "Bindingsværk: a black-tarred frame filled with ochre-limewashed clay, under reed thatch with a ridge held by crossed timbers.",
  build: (seed = 56) => { const b = new SceneBuilder(seed); countryside(b, { trees: [[14, -8, 11]] });
    placeHouse(b, { w: 18, d: 7, storeys: 1, storeyH: 2.8, walls: S.frame("#e7c56a", "#1e1a18", "square", 2.8, 0.9, 0.7), roof: { kind: "gable", pitch: 50, mat: S.thatch, over: 0.5 }, windows: { rows: [[-6, -3, 3, 6]], spec: W.leaded(0.9, 1.0, { frame: S.paint("#f2efe8") }) }, door: { x: 0, mat: S.paint("#3a4a2a") }, chimneys: [{ x: -3, mat: S.limewash("#efe8d8") }] }, 0, 0, -18);
    return done(b, frameSubject(b, 12), "golden"); } });
add({ id: "kizhi-wooden-church", label: "Russian wooden church with onion domes", group: "nordic", region: "Russia, Karelia", era: "1714", setting: "riverside", view: "exterior", scale: "monumental", mood: "noon",
  materials: ["pine logs", "aspen shingle domes that weather silver"], story: ["tiers of domes", "the lake shore"],
  note: "Built of logs without nails; aspen shingles on the domes weather to silver; domes climb in tiers round a central one.",
  build: (seed = 57) => { const b = new SceneBuilder(seed); countryside(b, { lane: false, grass: "#7a8048" }); water(b, -500, 500, 20, 500, -0.6, "#5a7a88");
    const log = S.log("#7a6040"), sh = b.mat({ kind: "shingle", colour: "#b7b4aa", pattern: "fish", age: 0.2 }), lm = b.mat(log);
    b.add(boxAt(-6, 0, -6, 6, 9, 6, lm)); b.add(cylY(0, 0, 9, 22, 4, lm));
    const domes: [number, number, number, number][] = [[0, 0, 26, 2.2], [-4, -4, 13, 1.2], [4, -4, 13, 1.2], [-4, 4, 13, 1.2], [4, 4, 13, 1.2], [0, -5, 17, 1.3], [0, 5, 17, 1.3], [-5, 0, 17, 1.3], [5, 0, 17, 1.3], [-2.5, 0, 21, 1.1], [2.5, 0, 21, 1.1]];
    for (const [x, z, y, r] of domes) { b.add(cylY(x, z, y - 3, y, r * 0.7, lm), onionDome(x, z, y, r, r * 2.6, sh), cylY(x, z, y + r * 2.6, y + r * 2.6 + 1, 0.05, b.mat({ kind: "iron" }))); }
    b.place({ yaw: 20 });
    return done(b, frameSubject(b, -8), "noon"); } });
add({ id: "baroque-market-square", label: "Central European market square", group: "nordic", region: "Czechia and Poland", era: "16th–18th century", setting: "city", view: "exterior", scale: "civic", mood: "golden",
  materials: ["painted render", "arcaded ground floors", "Baroque gables"], story: ["arcades for market stalls", "a plague column"],
  note: "Burgher houses share arcades along the square; each gable in its own colour and curve.",
  build: (seed = 58) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "setts", colour: "#8a8478" });
    ["#e8c27a", "#c9d6b0", "#e6a99a", "#aac4d4", "#f0e0b8"].forEach((c, k) => placeHouse(b, { w: 7.5, d: 14, storeys: 3, storeyH: 3.3, walls: [S.plaster(c, 0.1)], roof: { kind: k % 2 ? "curved-gable" : "bell-gable", pitch: 55, mat: S.plainTile, ridgeMat: S.plaster("#f2ece0", 0.05) }, windows: { rows: [[], [-2, 0, 2], [-2, 0, 2]], spec: W.sash(1.0, 1.8, { surround: S.plaster("#f2ece0", 0.05), hood: "cornice" }) }, door: null, bands: S.plaster("#f2ece0", 0.05) }, (k - 2) * 7.55, 0, 0, 0, () => arcade(b, -3.75, 3.75, 7.0, 2, 3.3, "round", S.plaster(c, 0.1), 3)));
    b.add(cylY(16, 16, 0, 1.2, 2.2, b.mat(S.ashlar("#cfc4ad"))), cylY(16, 16, 1.2, 9, 0.5, b.mat(S.ashlar("#cfc4ad"))), sphere(16, 9.6, 16, 0.6, b.mat({ kind: "gold" }))); b.place();
    return done(b, frameSubject(b, -16, { fov: 62 }), "golden"); } });
add({ id: "carpathian-wooden-church", label: "Carpathian wooden church", group: "nordic", region: "Poland, Slovakia and Ukraine", era: "17th–18th century", setting: "mountain", view: "exterior", scale: "civic", mood: "morning",
  materials: ["spruce logs", "shingled tiers", "small onion domes"], story: ["three log chambers in a row", "a fenced churchyard"],
  note: "Three log frames (narthex, nave, sanctuary) each crowned by a stepped shingled tower.",
  build: (seed = 59) => { const b = new SceneBuilder(seed); countryside(b, { trees: [[-14, -10, 13], [14, -12, 14]] });
    const log = S.log("#6a4a30"), sh = { kind: "shingle", colour: "#5a4a3a", pattern: "fish" } as SurfaceSpec;
    [[-6, 4.5, 9], [0, 5.5, 12], [6, 4.5, 9]].forEach(([x, r, h]) => { b.add(boxAt(x - r / 2, 0, -r / 2, x + r / 2, 5, r / 2, b.mat(log))); tower(b, { x, plan: "square", r: r / 2 - 0.2, h: 5, wall: log, roof: { kind: "pyramid", h: h - 5, mat: sh } }); b.add(onionDome(x, 0, h, 0.6, 1.6, b.mat(sh))); });
    b.place({ yaw: -24 });
    return done(b, frameSubject(b, 8), "morning"); } });

// North Africa and the Middle East ----------------------------------------------------------------------------------------
add({ id: "moroccan-riad", label: "Moroccan riad courtyard", group: "middle-east", region: "Morocco, Marrakesh", era: "18th–19th century", setting: "city", view: "interior", scale: "domestic", mood: "noon",
  materials: ["lime plaster (tadelakt)", "zellige tile dado", "cedar", "horseshoe arches"], story: ["orange trees", "a fountain", "the sky as the ceiling"],
  note: "A riad turns inward round a four-sided garden court: blank walls outside, zellige below and carved plaster and cedar above.",
  build: (seed = 60) => { const b = new SceneBuilder(seed), C = 5, G = 2.4, n = 3, span = (2 * C) / n, E = C + G + 0.5;
    ground(b, -40, 40, -40, 40, { kind: "zellige", colour: "#2f6f73", colour2: "#efe7d3", unit: 0.12 }, 0);
    const wall = b.mat(S.plaster("#e3b48a", 0.08)), zel = b.mat({ kind: "zellige", colour: "#2f6f73", colour2: "#efe7d3", unit: 0.09, pattern: "star" }), geb = b.mat({ kind: "plaster", colour: "#efe2c8", flake: 0 });
    const cedar = b.mat({ kind: "oak", colour: "#6a4228", age: 0.3 }), green = b.mat({ kind: "glazed-tube", colour: "#2f6a4a", unit: 0.16, course: 0.26 }), door = b.mat({ kind: "painted-wood", colour: "#2a4a5a", flake: 0.1 }), dark = b.mat({ kind: "plain", colour: "#3a2a20" });
    for (const yaw of [0, 90, 180, 270]) {
      const z0 = -C, arches: Node[] = [];
      for (let i = 0; i < n; i++) arches.push(opening(-C + span * (i + 0.5), 0, span * 0.62, 2.3, "horseshoe", z0 - 0.7, z0 + 0.2));
      // ground floor: horseshoe arches on piers clad in zellige to 1.2 m, the gallery behind, a painted door in its back wall
      b.add(cut(boxAt(-C, 0, z0 - 0.5, C, 4.4, z0, wall), arches), cut(boxAt(-C, 0, z0, C, 1.2, z0 + 0.03, zel), arches));
      b.add(boxAt(-E, 4.2, z0 - G, E, 4.55, z0, wall));
      b.add(cut(boxAt(-E, 0, z0 - G - 0.5, E, 4.4, z0 - G, wall), [boxAt(-0.8, 0, z0 - G - 1, 0.8, 2.8, z0 - G + 0.1, 0)]), boxAt(-0.8, 0, z0 - G - 0.3, 0.8, 2.8, z0 - G - 0.25, door), boxAt(-E, 0, z0 - G, E, 1.2, z0 - G + 0.03, zel));
      // the carved plaster frieze over the arcade: a band of small blind horseshoe arches
      b.add(cut(boxAt(-C, 3.45, z0, C, 4.2, z0 + 0.05, geb), [repeatX(opening(-C + 0.15, 3.55, 0.17, 0.36, "horseshoe", z0 + 0.02, z0 + 0.12), 0.26, Math.floor((2 * C) / 0.26))]));
      // upper floor: a turned cedar balustrade between posts, the back wall with shuttered windows, a carved cedar eave on corbels, a green-tiled pent roof
      b.add(boxAt(-C, 4.55, z0 - 0.06, C, 4.65, z0 + 0.12, cedar), repeatX(revolve(-C + 0.12, z0 + 0.03, 4.65, 5.55, t => 0.025 + 0.02 * Math.sin(t * Math.PI * 3) ** 2, 0.05, cedar, 0, 2), 0.16, Math.floor((2 * C) / 0.16)), boxAt(-C, 5.55, z0 - 0.04, C, 5.65, z0 + 0.1, cedar));
      for (let i = 0; i <= n; i++) b.add(boxAt(-C + span * i - 0.1, 4.55, z0 - 0.1, -C + span * i + 0.1, 7.6, z0 + 0.1, cedar));
      const ups: Node[] = []; for (let i = 0; i < n; i++) ups.push(opening(-C + span * (i + 0.5), 4.9, 0.9, 1.5, "flat", z0 - G - 1, z0 - G + 0.1));
      b.add(cut(boxAt(-E, 4.55, z0 - G - 0.5, E, 9.6, z0 - G, wall), ups));
      for (let i = 0; i < n; i++) { const x = -C + span * (i + 0.5); b.add(boxAt(x - 0.45, 4.9, z0 - G - 0.25, x + 0.45, 6.4, z0 - G - 0.2, dark), boxAt(x - 0.95, 4.9, z0 - G + 0.02, x - 0.47, 6.4, z0 - G + 0.06, door), boxAt(x + 0.47, 4.9, z0 - G + 0.02, x + 0.95, 6.4, z0 - G + 0.06, door)); }
      b.add(boxAt(-C, 7.6, z0 - G, C, 7.85, z0 + 0.35, cedar), repeatX(sculpt([{ a: [-C + 0.2, 7.58, z0 + 0.04], b: [-C + 0.2, 7.3, z0 + 0.04], r1: 0.06, r2: 0.03 }, { a: [-C + 0.2, 7.58, z0 + 0.2], e: [0.06, 0.05, 0.14] }], 0.04, cedar), 0.42, Math.floor((2 * C) / 0.42)));
      b.add(pentRoof(-E, E, z0 - G, G + 0.6, 7.95 + (G + 0.6) * 0.445, 24, green));
      b.place({ yaw });
    }
    // the garden: an octagonal fountain basin with a marble bowl, four raised beds of orange trees and herbs, bougainvillea up a corner pier
    const marble = b.mat({ kind: "marble", colour: "#ece6da" }), water = b.mat({ kind: "water", colour: "#3a6a6a" }), soil = b.mat({ kind: "dirt", colour: "#5a4030" }), zb = b.mat({ kind: "zellige", colour: "#2a5a8a", colour2: "#efe7d3", unit: 0.08 }), herb = b.mat({ kind: "foliage", colour: "#4a6a3a" });
    b.add(octShaft(0, 0, 0, 0.42, 1.25, zb), octShaft(0, 0, 0.3, 0.38, 1.12, water), revolve(0, 0, 0.38, 0.95, t => (t < 0.6 ? 0.08 : 0.08 + 0.4 * ((t - 0.6) / 0.4) ** 1.5), 0.5, marble, 0, 3), cylY(0, 0, 0.9, 0.93, 0.44, water), capsule(0, 0.93, 0, 0, 1.2, 0, 0.012, b.mat({ kind: "plain", colour: "#e8f0f0" })));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) { const cx = sx * 2.9, cz = sz * 2.9; b.add(boxAt(cx - 1.3, 0, cz - 1.3, cx + 1.3, 0.35, cz + 1.3, zel), boxAt(cx - 1.2, 0.3, cz - 1.2, cx + 1.2, 0.36, cz + 1.2, soil)); for (let k = 0; k < 6; k++) b.add(clump(cx + Math.cos(k * 1.05) * 0.85, 0.45, cz + Math.sin(k * 1.05) * 0.85, 0.22, 0.14, 0.22, herb, b.r(), 0.4)); }
    for (let k = 0; k < 12; k++) b.add(clump(-C + 0.3 + 0.25 * Math.sin(k * 2.1), 0.6 + k * 0.38, -C + 0.3 + 0.25 * Math.cos(k * 1.7), 0.35, 0.28, 0.3, b.mat({ kind: "foliage", colour: k % 3 ? "#b0306a" : "#3a5a2a" }), b.r(), 0.5));
    b.place();
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) tree(b, sx * 2.9, sz * 2.9, 3.4, 1.15, { kind: "foliage", colour: "#2f4a2a", colour2: "#e88a2a" }, false);
    b.place();
    return done(b, { x: 0.5, y: 1.6, z: 4.6, yaw: -10, fov: 78, shift: 0.36 }, "morning"); } });
add({ id: "kasbah-ksar", label: "Atlas kasbah", group: "middle-east", region: "Morocco, Atlas", era: "17th–19th century", setting: "mountain", view: "exterior", scale: "civic", mood: "golden",
  materials: ["rammed earth (pisé)", "mud brick", "palm-wood lintels"], story: ["tapering corner towers with carved tops", "a palm grove", "the river bed"],
  note: "Rammed earth in lifts with putlog holes; corner towers taper upward and end in stepped merlons and incised patterns.",
  build: (seed = 61) => { const b = new SceneBuilder(seed); countryside(b, { grass: "#b49a72", lane: false, hills: true });
    const earth = { kind: "mudbrick", colour: "#b8805a" } as SurfaceSpec;
    house(b, { w: 16, d: 16, storeys: 3, storeyH: 3, walls: earth, roof: { kind: "flat", pitch: 1, mat: earth, gableMat: earth }, windows: { rows: [[], [-3, 3], [-4, 0, 4]], spec: { w: 0.5, h: 0.7, panes: [1, 1], frame: S.paint("#3a2a20") } }, door: { x: 0, w: 1.8, h: 2.6, shape: "pointed", mat: S.boards("#4a3424") } });
    for (const [x, z] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) kasbahTower(b, x, z, 4.4, 13, earth);
    b.place({ yaw: -18 });
    for (let i = 0; i < 6; i++) { const x = -24 + i * 9, z = 16 + (i % 2) * 6; b.add(cylY(x, z, 0, 8, 0.25, b.mat({ kind: "oak", colour: "#7a6a52" }))); for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; b.add(clump(x + Math.cos(a) * 1.6, 8, z + Math.sin(a) * 1.6, 2, 0.4, 0.7, b.mat({ kind: "foliage", colour: "#5a6a30" }), b.r(), 0.5)); } }
    b.place();
    return done(b, frameSubject(b, 10), "golden"); } });
add({ id: "souk-arcade", label: "Stone-arched souk", group: "middle-east", region: "Levant", era: "Ottoman period", setting: "city", view: "exterior", scale: "civic", mood: "noon",
  materials: ["limestone ashlar", "pointed arches", "canvas awnings"], story: ["shafts of sun through roof openings", "stalls of baskets and brass"],
  note: "Market streets roofed by pointed vaults, lit by openings in the crown that throw shafts onto the stalls.",
  build: (seed = 62) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "flags", colour: "#b0a48e" }, 0);
    const st = S.ashlar("#d6c6a4", 0.34), sm = b.mat(st);
    for (const s of [-1, 1]) { b.add(boxAt(s * 3.5, 0, -40, s * 4.2, 9.6, 6, sm)); for (let k = 0; k < 8; k++) b.add(boxAt(s * 3.0, 0, -36 + k * 5, s * 3.5, 1.0, -33 + k * 5, b.mat({ kind: "hay", colour: ["#c49a52", "#9a6a3a", "#b88a3a"][k % 3] }))); }
    for (let k = 0; k < 9; k++) b.add(cut(boxAt(-3.6, 3, -40 + k * 5, 3.6, 9.6, -39.3 + k * 5, sm), [opening(0, 0, 7, 3, "pointed", -41 + k * 5, -38 + k * 5)]));
    b.add(cut(boxAt(-4.2, 9.6, -40, 4.2, 10.2, 6, sm), Array.from({ length: 9 }, (_, k) => boxAt(-0.5, 9, -38.2 + k * 5, 0.5, 11, -36.8 + k * 5, 0))));
    
    b.place();
    return done(b, look(0, 3.6, -14, 14, 0, 1.6, 62), "noon", { dust: 0.7 }); } });
add({ id: "damascene-courtyard", label: "Damascene courtyard house", group: "middle-east", region: "Syria, Damascus", era: "18th century", setting: "city", view: "interior", scale: "domestic", mood: "morning",
  materials: ["ablaq striped stone (black basalt and limestone)", "an iwan", "a marble fountain"], story: ["a lemon tree", "jasmine on the wall"],
  note: "Ablaq: alternating courses of dark and light stone; an iwan (vaulted open hall) faces the fountain court.",
  build: (seed = 63) => { const b = new SceneBuilder(seed), X = 7, Zs = -9, Zn = 9, W = 6, hs = 4.75, zb = Zs - 6.8;
    ground(b, -40, 40, -40, 40, { kind: "tile-floor", colour: "#e2d8c6", colour2: "#6a5a50", unit: 0.6 }, 0);
    const ab = b.mat({ kind: "ashlar", colour: "#e6dcc8", course: 0.32, unit: 0.7, age: 0.3, pattern: "ablaq" }), plaster = b.mat(S.plaster("#e8dcc4", 0.06)), marble = b.mat({ kind: "marble", colour: "#ece6da" });
    const wood = b.mat({ kind: "painted-wood", colour: "#5a3a26", flake: 0.06 }), dark = b.mat({ kind: "plain", colour: "#2a221c" }), iron = b.mat({ kind: "iron", colour: "#1e1c1a" }), water = b.mat({ kind: "water", colour: "#3a6a6a" });
    // the iwan: a tall pointed arch raised a step, framed by a roll moulding and a rectangular border, a vaulted hall behind
    b.add(cut(boxAt(-X, 0, Zs - 0.8, X, 12, Zs, ab), [opening(0, 0.45, W, hs, "pointed", Zs - 2, Zs + 1)]));
    b.add(archRoll(0, 0.45, W, hs, "pointed", Zs + 0.03, 0.08, 0.09, marble, "z"), archRoll(0, 0.45, W, hs, "pointed", Zs + 0.03, 0.42, 0.06, marble, "z"));
    const top = 0.45 + hs + (W / 2) * 1.73 + 0.7;
    for (const sx of [-1, 1]) b.add(boxAt(sx * (W / 2 + 0.7) - 0.09, 0.45, Zs, sx * (W / 2 + 0.7) + 0.09, top, Zs + 0.08, marble));
    b.add(boxAt(-W / 2 - 0.79, top - 0.18, Zs, W / 2 + 0.79, top, Zs + 0.08, marble), boxAt(-W / 2 - 1, 0, Zs - 0.8, W / 2 + 1, 0.45, Zs + 0.6, marble));
    b.add(boxAt(-3.4, 0, zb, 3.4, 0.45, Zs, marble), boxAt(-4.0, 0, zb, -3.2, 11, Zs - 0.8, plaster), boxAt(3.2, 0, zb, 4.0, 11, Zs - 0.8, plaster), boxAt(-4, 0, zb - 0.6, 4, 11, zb, plaster));
    b.add(cut(boxAt(-3.3, 4.8, zb, 3.3, 11, Zs - 0.8, plaster), [opening(0, 0.45, 6.4, hs, "pointed", zb - 1, Zs)]));
    // in the iwan: banquettes with cushions along the walls, a carpet, a niche with a brass lamp
    const red = b.mat({ kind: "fabric", colour: "#8a2a24", colour2: "#c8902a", unit: 0.08 }), cush = b.mat({ kind: "velvet", colour: "#2a3a5a" });
    for (const sx of [-1, 1]) b.add(boxAt(sx * 3.2 - (sx > 0 ? 0.7 : 0), 0.45, zb + 0.2, sx * 3.2 + (sx < 0 ? 0.7 : 0), 0.85, Zs - 1.2, red, 0, 0.04), capsule(sx * 2.95, 1.0, zb + 0.4, sx * 2.95, 1.0, Zs - 1.4, 0.16, cush));
    b.add(boxAt(-2.0, 0.45, zb + 0.6, 2.0, 0.47, Zs - 1.6, b.mat({ kind: "rug", unit: 4, course: 4, offset: [0, (zb + Zs) / 2] })));
    b.add(cut(boxAt(-0.8, 1.2, zb - 0.05, 0.8, 3.4, zb + 0.02, plaster), [opening(0, 1.3, 1.2, 1.4, "pointed", zb - 0.4, zb + 0.1)]), revolve(0, zb + 0.15, 1.3, 1.65, t => 0.08 + 0.06 * Math.sin(Math.PI * t), 0.14, b.mat({ kind: "brass", colour: "#b08a45" })));
    // the side ranges: ablaq below with grilled windows and a door, plaster above with projecting wooden lattice windows, a cornice on corbels
    for (const sv of [-1, 1]) {
      const xw = sv * X, lo: Node[] = [], up: Node[] = [];
      for (const z of [-4.5, 4.5]) { lo.push(opening(z, 1.0, 1.2, 1.7, "flat", xw - 1, xw + 1, "x")); up.push(opening(z, 5.6, 1.3, 1.6, "flat", xw - 1, xw + 1, "x")); }
      lo.push(opening(0, 0, 1.4, 2.4, "pointed", xw - 1, xw + 1, "x")); up.push(opening(0, 5.6, 1.3, 1.6, "flat", xw - 1, xw + 1, "x"));
      const x0 = Math.min(xw, xw + sv * 0.8), x1 = Math.max(xw, xw + sv * 0.8);
      b.add(cut(boxAt(x0, 0, Zs, x1, 4.6, Zn, ab), lo), cut(boxAt(x0, 4.6, Zs, x1, 9.4, Zn, plaster), up), boxAt(x0, 0, Zs, x1, 0.2, Zn, ab));
      for (const z of [-4.5, 4.5]) { b.add(boxAt(xw + sv * 0.4, 1.0, z - 0.6, xw + sv * 0.45, 2.7, z + 0.6, dark)); for (let k = 0; k < 6; k++) b.add(capsule(xw + sv * 0.06, 1.0, z - 0.5 + k * 0.2, xw + sv * 0.06, 2.7, z - 0.5 + k * 0.2, 0.012, iron)); }
      b.add(boxAt(xw + sv * 0.35, 0, -0.7, xw + sv * 0.4, 3.0, 0.7, wood), boxAt(xw - sv * 0.02, 2.45, -0.95, xw + sv * 0.05, 2.62, 0.95, marble));
      for (const z of [-4.5, 0, 4.5]) {
        // a mashrabiya: a lattice box cantilevered on brackets
        b.add(boxAt(xw - sv * 0.55, 5.4, z - 0.85, xw, 5.5, z + 0.85, wood), boxAt(xw - sv * 0.55, 7.45, z - 0.85, xw, 7.6, z + 0.85, wood), boxAt(xw - sv * 0.55, 5.5, z - 0.8, xw - sv * 0.5, 7.45, z + 0.8, b.mat({ kind: "chinese-screen" })));
        for (const dz of [-0.8, 0.8]) b.add(boxAt(xw - sv * 0.55, 5.5, z + dz - 0.04, xw, 7.45, z + dz + 0.04, wood), capsule(xw, 4.9, z + dz * 0.8, xw - sv * 0.5, 5.4, z + dz * 0.8, 0.04, wood));
      }
      b.add(boxAt(xw - sv * 0.45, 9.2, Zs, xw + sv * 0.2, 9.45, Zn, wood), repeatZ(sculpt([{ a: [xw - sv * 0.05, 9.18, Zs + 0.3], b: [xw - sv * 0.05, 8.9, Zs + 0.3], r1: 0.06, r2: 0.03 }, { a: [xw - sv * 0.25, 9.15, Zs + 0.3], e: [0.18, 0.05, 0.06] }], 0.04, wood), 0.5, Math.floor((Zn - Zs) / 0.5)));
    }
    b.add(boxAt(-X, 0, Zn, X, 9.4, Zn + 0.8, plaster));
    // the court: an octagonal marble pool with a jet, citrus trees in round beds, jasmine up the west wall, pots along the iwan step
    b.add(octShaft(0, 1.5, 0, 0.55, 1.5, marble), octShaft(0, 1.5, 0.4, 0.5, 1.36, water), cylY(0, 1.5, 0.5, 0.75, 0.08, marble), capsule(0, 0.75, 1.5, 0, 1.15, 1.5, 0.012, b.mat({ kind: "plain", colour: "#e8f0f0" })));
    const soil = b.mat({ kind: "dirt", colour: "#5a4030" }), leaves = b.mat({ kind: "foliage", colour: "#3a5a2a" }), flowers = b.mat({ kind: "plain", colour: "#f4f0e6" }), pot = b.mat({ kind: "enamel", colour: "#b0603a" });
    for (const [x, z] of [[-3.6, 3.2], [3.6, -2.2]] as const) b.add(cut(cylY(x, z, 0, 0.4, 1.0, marble), [cylY(x, z, 0.3, 0.5, 0.9, 0)]), cylY(x, z, 0.3, 0.36, 0.9, soil));
    for (let k = 0; k < 16; k++) { const y = 0.5 + k * 0.5, z = -6 + 0.5 * Math.sin(k * 1.3) + (k % 3) * 0.4; b.add(clump(-X + 0.3, y, z, 0.3, 0.32, 0.5, leaves, b.r(), 0.5)); if (k % 2) b.add(sphere(-X + 0.55, y + 0.1, z + 0.2, 0.05, flowers), sphere(-X + 0.5, y - 0.1, z - 0.25, 0.05, flowers)); }
    for (const x of [-4.5, -3.9, 3.9, 4.5]) b.add(revolve(x, Zs + 0.9, 0, 0.45, t => 0.16 + 0.06 * Math.sin(Math.PI * t), 0.22, pot), clump(x, 0.6, Zs + 0.9, 0.25, 0.28, 0.25, leaves, b.r(), 0.5));
    b.place();
    for (const [x, z, c2] of [[-3.6, 3.2, "#e8d050"], [3.6, -2.2, "#e88a2a"]] as const) tree(b, x, z, 4.2, 1.7, { kind: "foliage", colour: "#3a5a2a", colour2: c2 }, false);
    b.place();
    return done(b, { x: 1.2, y: 1.6, z: 8.0, yaw: -3, fov: 72, shift: 0.42 }, "morning"); } });
add({ id: "ottoman-timber-house", label: "Ottoman timber house", group: "middle-east", region: "Turkey, Safranbolu", era: "18th–19th century", setting: "town", view: "exterior", scale: "domestic", mood: "golden",
  materials: ["stone ground floor", "timber-framed upper floors in white plaster", "projecting bays (cumba)"], story: ["upper floors overhanging the lane on curved brackets", "many small windows"],
  note: "A stone base holds stables; living floors in plastered timber oversail the street on brackets with rows of windows.",
  build: (seed = 64) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "cobbles" });
    placeHouse(b, { w: 10, d: 10, storeys: 3, storeyH: 2.8, jetty: 0.8, walls: [S.rubble("#a8987a"), S.plaster("#f0ebe0", 0.1), S.plaster("#f0ebe0", 0.1)], roof: { kind: "hip", pitch: 28, mat: S.pantile, over: 0.9 }, windows: { rows: [[2.5], [-3.6, -1.2, 1.2, 3.6], [-3.6, -1.2, 1.2, 3.6]], spec: { w: 0.9, h: 1.4, panes: [2, 3], frame: S.paint("#5a3a24"), surround: { kind: "oak", colour: "#5a3a24" } } }, door: { x: -2.5, w: 1.6, mat: S.boards("#4a3020") } }, 0, 0, -22, 0.004);
    return done(b, frameSubject(b, 12), "golden"); } });

// Historic engineering and monuments --------------------------------------------------------------------------------------
add({ id: "romanesque-abbey", label: "Romanesque abbey church", group: "historic", region: "France, Burgundy", era: "11th–12th century", setting: "rural", view: "exterior", scale: "monumental", mood: "golden",
  materials: ["limestone ashlar", "round arches", "a crossing tower"], story: ["an apse with radiating chapels", "the monks' garden"],
  note: "Thick walls carry barrel vaults; small round-headed windows; pilaster strips; a square crossing tower over the transept.",
  build: (seed = 65) => { const b = new SceneBuilder(seed); countryside(b, { trees: [[22, -10, 10]] });
    church(b, { style: "romanesque", L: 44, W: 12, H: 16, bays: 7, wall: S.ashlar("#d6c6a2", 0.36), roof: S.pantile, aisles: { w: 6, h: 9 }, towers: "crossing", towerH: 30, apse: true, glass: { kind: "glass" } });
    b.place({ yaw: -25 });
    return done(b, frameSubject(b, 4), "golden"); } });
add({ id: "gothic-flying-buttresses", label: "Gothic choir with flying buttresses", group: "historic", region: "France", era: "13th century", setting: "city", view: "exterior", scale: "monumental", mood: "noon",
  materials: ["limestone", "lead roof", "pinnacles"], story: ["two tiers of flyers", "gargoyles", "a carved pinnacle on every buttress"],
  note: "The vault's outward thrust is carried over the aisles by flyers to buttresses weighted by pinnacles; the walls between can become glass.",
  build: (seed = 66) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "grass", colour: "#6f7a44" });
    church(b, { style: "gothic", L: 50, W: 13, H: 30, bays: 6, wall: S.ashlar("#d4cab2", 0.4), roof: { kind: "lead" }, aisles: { w: 7, h: 15 }, flying: true, towers: "none", apse: true });
    b.place({ yaw: -8 });
    return done(b, frameSubject(b, 14, { fov: 62 }), "noon"); } });
add({ id: "gothic-nave-interior", label: "Gothic nave interior", group: "historic", region: "France", era: "13th century", setting: "city", view: "interior", scale: "monumental", mood: "interior-day",
  materials: ["limestone piers", "quadripartite rib vaults", "stained glass"], story: ["coloured light on the piers", "rows of rush chairs", "candles at a side altar"],
  note: "Three storeys after Chartres: compound piers carry the arcade, a triforium passage, and a clerestory of two lancets under a rose in each lunette of the rib vault; seen across the nave from its north side.",
  build: (seed = 67) => { const b = new SceneBuilder(seed);
    const nv = gothicNave(b, { bays: 6 }), B = nv.length / 6;
    chairRows(b, 4.9, -5.2, 8, 22); chairRows(b, -1.3, -5.2, 8, 22); b.place();
    // a side altar in the south aisle: a stone table with candles burning
    table(b, nv.span / 2 + 4.6, -B * 2.6, 1.6, 0.7, 1.0, { kind: "ashlar", colour: "#cbbd9e", course: 0.3 }, true);
    for (const dz of [-0.5, -0.2, 0.15, 0.45]) candle(b, nv.span / 2 + 4.5, 1.0, -B * 2.6 + dz, 0.04);
    b.place();
    return done(b, { x: -4.2, y: 1.6, z: -3.0, yaw: 26, fov: 70, shift: 0.62 }, { ...MOODS["interior-day"], sunElevation: 46, sunAzimuth: -62, sunPower: 4.6, ambient: 0.22, key: 0.1, burn: 0.9 }, { dust: 0.12, interior: true }); } });
add({ id: "norman-keep", label: "Norman stone keep", group: "historic", region: "England and Normandy", era: "1070–1180", setting: "rural", view: "exterior", scale: "monumental", mood: "overcast",
  materials: ["Caen limestone and flint rubble", "pilaster buttresses", "battlements"], story: ["a forebuilding stair to the first-floor door", "corner turrets"],
  note: "Square donjons (the White Tower is about 27 m high) with walls several metres thick at the base, entered at first floor.",
  build: (seed = 68) => { const b = new SceneBuilder(seed); countryside(b, { trees: [[-22, -12, 11]] });
    keep(b, 18, 24); b.place({ yaw: -30 });
    return done(b, frameSubject(b, 0), "overcast"); } });
add({ id: "concentric-castle", label: "Concentric castle with gatehouse", group: "historic", region: "Wales", era: "1280s", setting: "coast", view: "exterior", scale: "monumental", mood: "golden",
  materials: ["grey limestone and sandstone", "round towers", "a twin-towered gatehouse"], story: ["arrow slits", "a moat", "banners"],
  note: "Concentric walls (outer low, inner high) and round towers that deflect missiles; the gatehouse is the strongest point.",
  build: (seed = 69) => { const b = new SceneBuilder(seed); countryside(b, { lane: false }); water(b, -400, 400, 6, 16, -1, "#4a6060");
    const wall = S.ashlar("#a8a294", 0.45);
    curtainWall(b, -30, -5, 0, 10, wall); curtainWall(b, 5, 30, 0, 10, wall); gatehouse(b, 0, 0, 13, wall);
    for (const x of [-30, 30]) tower(b, { x, z: 0, plan: "round", r: 4.5, h: 15, wall, crenel: true, slits: 4 });
    for (const x of [-20, 20]) tower(b, { x, z: -26, plan: "round", r: 5, h: 22, wall, crenel: true, slits: 4 });
    curtainWall(b, -20, 20, -26, 16, wall);
    b.place({ yaw: 12 });
    return done(b, frameSubject(b, -12), "golden"); } });
add({ id: "baroque-palace", label: "Baroque palace façade", group: "historic", region: "Austria, Vienna", era: "1700–1730", setting: "garden", view: "exterior", scale: "monumental", mood: "noon",
  materials: ["ochre render with white dressings", "copper roofs", "a central pavilion with pediment"], story: ["a parterre garden", "statues on the balustrade"],
  note: "A central pavilion and end pavilions break forward; giant pilasters bind two floors; the roof line carries statues.",
  build: (seed = 70) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "gravel", colour: "#c9bea6" });
    const ochre = S.plaster("#e3c46a", 0.04), white = S.ashlar("#efe9dc", 0.3);
    placeHouse(b, { w: 70, d: 16, storeys: 3, storeyH: 4.6, walls: ochre, roof: { kind: "hip", pitch: 30, mat: S.copper }, windows: { rows: [Array.from({ length: 15 }, (_, i) => -31.5 + i * 4.5), Array.from({ length: 15 }, (_, i) => -31.5 + i * 4.5), Array.from({ length: 15 }, (_, i) => -31.5 + i * 4.5)], spec: W.sash(1.5, 2.6, { surround: white, hood: "pediment" }) }, door: null, cornice: white, bands: white }, 0, 0, 0);
    placeHouse(b, { w: 18, d: 18, storeys: 3, storeyH: 4.6, walls: ochre, roof: { kind: "hip", pitch: 30, mat: S.copper }, windows: { rows: [[-6, 6], [-6, -2, 2, 6], [-6, -2, 2, 6]], spec: W.sash(1.5, 2.8, { surround: white, hood: "pediment" }) }, door: { x: 0, w: 3, h: 4, shape: "round" }, cornice: white }, 0, 2, 0);
    for (let i = 0; i < 12; i++) b.add(clump(-30 + i * 5.5, 0.4, 24, 1.6, 0.5, 1.6, b.mat({ kind: "foliage", colour: "#3f5a2a" }), b.r(), 0.2)); b.place();
    return done(b, frameSubject(b, -10), "noon"); } });
add({ id: "cathedral-clocktower", label: "Cathedral clock tower with copper spire", group: "historic", region: "Northern Europe", era: "15th–17th century", setting: "city", view: "exterior", scale: "monumental", mood: "golden",
  materials: ["brick and stone", "a gilded clock face", "a patinated copper spire"], story: ["the clock face", "copper streaked green", "roofs of the town below"],
  note: "Copper spires turn brown, then green over 10–30 years; streaks follow where rain runs and gathers.",
  build: (seed = 71) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "cobbles" });
    tower(b, { plan: "square", r: 5, h: 44, wall: S.brick("#8a4a36"), clock: 36, belfry: true, roof: { kind: "spire", h: 36, mat: S.copper }, finial: { kind: "gold" } }); b.place();
    const cam = frameSubject(b, -12, { pad: 0.12 });
    for (let k = 0; k < 6; k++) placeHouse(b, { w: 8, d: 10, storeys: 3, storeyH: 3, walls: S.plaster(["#e8d0a8", "#d9c0b0", "#c8d0c0", "#e6dcc4", "#d8b49a", "#e0d4b0"][k]), roof: { kind: "gable-front", pitch: 55, mat: S.plainTile }, windows: { rows: [[2], [-2, 2], [0]], spec: W.sash(1.0, 1.6) }, door: { x: -2 } }, -24 + k * 8.2 + (k > 2 ? 16 : 0), 12, 0);
    return done(b, cam, "golden"); } });
add({ id: "roman-aqueduct", label: "Roman aqueduct", group: "historic", region: "Spain and southern France", era: "1st century", setting: "rural", view: "exterior", scale: "monumental", mood: "golden",
  materials: ["dry-laid granite blocks", "two tiers of round arches"], story: ["sheep grazing", "the channel on top"],
  note: "Semicircular arches (rise half the span) in two tiers of unmortared blocks, piers about a fifth of the span.",
  build: (seed = 72) => { const b = new SceneBuilder(seed); countryside(b, { grass: "#a09a62", lane: false });
    bridge(b, { arches: 7, span: 7, shape: "round", h: 14, w: 2.6, pier: 2.2, wall: { kind: "ashlar", colour: "#b8a88a", course: 0.55, unit: 1.0, age: 0.8, moss: 0.2 }, tier2: { arches: 14, h: 9 }, water: 0 });
    b.place({ yaw: -18 });
    return done(b, frameSubject(b, 6), "golden"); } });
add({ id: "medieval-stone-bridge", label: "Medieval multi-arch stone bridge", group: "historic", region: "England", era: "14th–15th century", setting: "riverside", view: "exterior", scale: "civic", mood: "morning",
  materials: ["rubble with ashlar voussoirs", "pointed arches", "cutwaters and refuges"], story: ["pedestrian refuges over the cutwaters", "reflections in the river", "moss on the cutwaters"],
  note: "Piers about 1/5–1/10 of the span with pointed cutwaters upstream; refuges let people step aside for carts.",
  build: (seed = 73) => { const b = new SceneBuilder(seed); countryside(b, { lane: false, trees: [[-30, -14, 12], [32, -16, 13]] }); water(b, -16, 16, -300, 300, -1.5, "#4a6264");
    bridge(b, { arches: 5, span: 7, shape: "pointed", h: 6.5, w: 5, wall: S.rubble("#a29680", 0.4), ring: S.ashlar("#b8aa8e", 0.35), cutwaters: true, refuges: true });
    b.place();
    return done(b, frameSubject(b, -8, { eye: 1.2 }), "morning"); } });
add({ id: "inhabited-bridge", label: "Bridge lined with houses", group: "historic", region: "Italy, Florence", era: "1345", setting: "riverside", view: "exterior", scale: "civic", mood: "golden",
  materials: ["segmental stone arches", "shops cantilevered over the river on brackets"], story: ["back rooms hanging over the water", "shutters and awnings"],
  note: "Low segmental arches leave room for a street of shops above; their back rooms hang over the river on timber brackets.",
  build: (seed = 74) => { const b = new SceneBuilder(seed); water(b, -400, 400, -400, 400, -1.2, "#5a6a4a");
    const L = bridge(b, { arches: 3, span: 16, shape: "segmental", h: 6, w: 12, pier: 4, wall: S.ashlar("#c8b088", 0.4), cutwaters: true }); b.place();
    for (let k = 0; k < 7; k++) { house(b, { w: L / 7 - 0.2, d: 4, storeys: 2 + (k % 2), storeyH: 2.7, jetty: 0.6, walls: S.plaster(["#d9a066", "#e2bc80", "#c9805a", "#e8cc90"][k % 4], 0.25), roof: { kind: "gable", pitch: 22, mat: S.pantile }, windows: { rows: [[0], [-1.4, 1.4], [0]], spec: W.shuttered("#5a4a2a", 0.8, 1.2) }, door: null }); for (const x of [-2, 0, 2]) b.add(beam(x, -1.6, 1.8, x, 0, 2.6, 0.18, b.mat({ kind: "oak", colour: "#4a3424" }))); b.place({ x: -L / 2 + (k + 0.5) * (L / 7), y: 6.05, z: 4.2 }); }
    return done(b, frameSubject(b, -16), "golden"); } });
add({ id: "timber-market-hall", label: "Timber market hall", group: "historic", region: "France and England", era: "15th–16th century", setting: "village", view: "exterior", scale: "civic", mood: "morning",
  materials: ["oak posts on stone pads", "a vast tile roof"], story: ["market stalls and crates", "pigeons on the beams"],
  note: "An open forest of oak posts on stone bases carries a steep roof over the market floor.",
  build: (seed = 75) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "cobbles", moss: 0.2 });
    const oak = b.mat({ kind: "oak", colour: "#5a4634", age: 0.7 }), pad = b.mat(S.ashlar("#b8ae9a"));
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { const x = -12 + i * 4.8, z = -5 + j * 5; b.add(boxAt(x - 0.4, 0, z - 0.4, x + 0.4, 0.6, z + 0.4, pad), boxAt(x - 0.18, 0.6, z - 0.18, x + 0.18, 4.6, z + 0.18, oak), capsule(x, 3.6, z, x + 1.2, 4.6, z, 0.1, oak), capsule(x, 3.6, z, x - 1.2, 4.6, z, 0.1, oak)); }
    b.add(boxAt(-13, 4.6, -6, 13, 4.9, 6, oak), hipRoof({ x0: -13, x1: 13, z0: -6, z1: 6, y: 4.9, pitch: 50, over: 0.9 }, b.mat(S.plainTile)));
    for (let i = 0; i < 8; i++) { const x = -10 + i * 2.8; b.add(boxAt(x, 0, -1, x + 1.6, 0.9, 0.6, b.mat(S.boards("#8a6a4a")))); b.add(boxAt(x + 0.1, 0.9, -0.9, x + 1.5, 1.1, 0.5, b.mat({ kind: "foliage", colour: ["#c04030", "#d0a030", "#5a8a30"][i % 3] }))); }
    b.place({ y: 0, yaw: -14 });
    return done(b, frameSubject(b, 18), "morning"); } });
add({ id: "town-hall-belfry", label: "Gothic town hall", group: "historic", region: "Belgium and Germany", era: "15th century", setting: "city", view: "exterior", scale: "monumental", mood: "dusk",
  materials: ["sandstone", "lead and slate", "gilded weathervane"], story: ["statues in niches", "lit windows at dusk", "a lantern on the steps"],
  note: "Civic Gothic: tall pointed windows between buttresses, corner turrets, a belfry over the centre.",
  build: (seed = 76) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "setts" });
    placeHouse(b, { w: 34, d: 14, storeys: 2, storeyH: 6, walls: S.ashlar("#cdbf9e", 0.4), roof: { kind: "hip", pitch: 55, mat: S.slate }, windows: { rows: [[-13, -8, -3, 3, 8, 13], [-13, -8, -3, 3, 8, 13]], spec: { w: 1.8, h: 4, shape: "pointed", panes: [2, 5] } }, door: { x: 0, w: 2.6, h: 4.2, shape: "pointed", lantern: true }, dormers: { count: 5 } }, 0, 0, 0, 0, () => {
      tower(b, { x: 0, z: -2, plan: "square", r: 3.5, h: 30, wall: S.ashlar("#cdbf9e"), belfry: true, roof: { kind: "spire", h: 18, mat: S.slate }, finial: { kind: "gold" } });
      for (const s of [-1, 1]) tower(b, { x: s * 17, z: 7, plan: "octagon", r: 1.4, h: 14, wall: S.ashlar("#cdbf9e"), roof: { kind: "spire", h: 6, mat: S.slate } }); });
    lamppost(b, -6, 12); lamppost(b, 6, 12); b.place();
    return done(b, frameSubject(b, 14), "dusk"); } });
add({ id: "renaissance-dome", label: "Renaissance cathedral dome", group: "historic", region: "Italy, Florence", era: "1420–1436", setting: "city", view: "exterior", scale: "monumental", mood: "morning",
  materials: ["brick dome in herringbone courses", "terracotta tiles with white marble ribs", "a marble lantern"], story: ["the town's tile roofs round it", "a drum with round windows"],
  note: "An octagonal brick dome laid without centring, covered in red tiles between eight white ribs, crowned by a marble lantern.",
  build: (seed = 77) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "flags" });
    domeChurch(b, { w: 34, d: 34, h: 30, wall: { kind: "marble", colour: "#e9e3d6" }, dome: { kind: "pantile", colour: "#b4583a", unit: 0.25 }, drumR: 16, drumH: 9, ribs: { kind: "marble" } });
    for (let k = 0; k < 10; k++) placeHouse(b, { w: 10, d: 12, storeys: 4, storeyH: 3.2, walls: S.plaster(["#d9b080", "#e2c8a0", "#cf9a70"][k % 3]), roof: { kind: "hip", pitch: 22, mat: S.pantile }, windows: { rows: [[], [-3, 0, 3], [-3, 0, 3], [-3, 0, 3]], spec: W.shuttered("#5a5a3a", 0.8, 1.4) }, door: null }, -50 + k * 10.2, 30, 0);
    return done(b, frameSubject(b, -8, { eye: 20 }), "morning"); } });
add({ id: "ruined-abbey", label: "Ruined Gothic abbey", group: "historic", region: "England, Yorkshire", era: "13th century, ruined 1539", setting: "rural", view: "exterior", scale: "monumental", mood: "overcast",
  materials: ["sandstone", "empty lancet windows", "ivy and turf"], story: ["sheep among the piers", "roofless nave open to the sky"],
  note: "Dissolved abbeys lost their lead and roofs; the walls stand with empty tracery, ivy and grass on the wall tops.",
  build: (seed = 78) => { const b = new SceneBuilder(seed); countryside(b, { lane: false, trees: [[-24, -16, 13], [24, -14, 12]] });
    church(b, { style: "gothic", L: 40, W: 12, H: 18, bays: 6, wall: { kind: "ashlar", colour: "#b8a082", course: 0.4, age: 0.9, moss: 0.6 }, roof: S.slate, towers: "west", towerH: 26, spire: null, ruin: true, glass: { kind: "glass", colour: "#9aa8b0" } });
    b.grow({ x: -10, z: 6.1, w: 8, h: 9, axis: "z" }); b.grow({ x: 12, z: 6.1, w: 6, h: 7, axis: "z" });
    b.place({ yaw: -18 });
    return done(b, frameSubject(b, 10), "overcast"); } });
add({ id: "victorian-conservatory", label: "Victorian iron-and-glass conservatory", group: "historic", region: "England, Kew", era: "1844–1848", setting: "garden", view: "exterior", scale: "monumental", mood: "morning",
  materials: ["wrought iron ribs", "small glass panes", "a brick plinth"], story: ["palms inside", "a pond in front", "a gravel walk"],
  note: "Curved iron ribs carry thousands of small panes; a tall centre for palms between lower wings (Palm House: about 110 m long, 19 m high).",
  build: (seed = 79) => { const b = new SceneBuilder(seed); ground(b, -400, 400, -400, 400, { kind: "grass", colour: "#6a7a3c" }); ground(b, -40, 40, 6, 10, { kind: "gravel" }, 0.02); water(b, -14, 14, 12, 22, -0.3, "#4a6a6a");
    glasshouse(b, 40, 10, 9); b.place({ yaw: -14 });
    return done(b, frameSubject(b, 14), "morning"); } });
add({ id: "stone-windmill-tower", label: "Stone tower mill", group: "historic", region: "England, Norfolk", era: "18th–19th century", setting: "rural", view: "exterior", scale: "civic", mood: "golden",
  materials: ["tarred brick tower", "a white boat-shaped cap", "white sails"], story: ["a fantail turning the cap", "the miller's cart"],
  note: "Tower mills keep a fixed brick tower and turn only the cap; a fantail behind steers the sails into the wind.",
  build: (seed = 80) => { const b = new SceneBuilder(seed); countryside(b, { hills: false });
    windmill(b, 0, 0, 18, 4.2, S.brick("#3a2a24"), S.paint("#efece4", 0.1), 8); b.place({ yaw: -12 });
    return done(b, frameSubject(b, 4), "golden"); } });

// Rural and agrarian ------------------------------------------------------------------------------------------------------
add({ id: "tithe-barn", label: "Stone tithe barn", group: "rural", region: "England", era: "14th century", setting: "rural", view: "exterior", scale: "civic", mood: "golden",
  materials: ["limestone rubble with buttresses", "stone slates", "a cart porch"], story: ["the great cart doors", "swallows", "hay in the threshing floor"],
  note: "Long barns with buttresses against the roof's spread, a tall porch for laden carts, slits for air.",
  build: (seed = 81) => { const b = new SceneBuilder(seed); countryside(b, { trees: [[-26, -10, 12]] });
    const wall = S.cotswold;
    placeHouse(b, { w: 40, d: 11, storeys: 1, storeyH: 6, walls: wall, roof: { kind: "gable", pitch: 52, mat: S.stoneSlate, over: 0.3, sag: 0.25 }, door: null }, 0, 0, -16, 0, () => {
      const wm = b.mat(wall); b.add(boxAt(-3.5, 0, 5.5, 3.5, 6, 9, wm)); b.add(boxAt(-3.5, 6, 5.5, 3.5, 6.01, 9, wm)); b.add(gableRoof({ x0: -3.5, x1: 3.5, z0: 5.5, z1: 9.5, y: 6, pitch: 52, over: 0.3, ridge: "z" }, b.mat(S.stoneSlate)), gableWall({ x0: -3.5, x1: 3.5, z0: 5.5, z1: 9.5, y: 6, pitch: 52, ridge: "z" }, wm));
      b.add(boxAt(-1.8, 0, 8.9, 1.8, 4.5, 9.1, b.mat({ kind: "hay" })));
      for (let k = 0; k < 8; k++) { const x = -18 + k * 5.2; if (Math.abs(x) > 4) b.add(boxAt(x - 0.5, 0, 5.5, x + 0.5, 4.2, 6.6, wm)); }
      for (let k = 0; k < 10; k++) { const x = -17 + k * 3.8; if (Math.abs(x) > 4.5) b.add(box(x, 3.2, 5.52, 0.08, 0.5, 0.05, b.mat({ kind: "plain", colour: "#1a1512" }))); } });
    return done(b, frameSubject(b, 18), "golden"); } });
add({ id: "overshot-watermill", label: "Watermill with overshot wheel", group: "rural", region: "England and France", era: "18th century", setting: "riverside", view: "exterior", scale: "domestic", mood: "morning",
  materials: ["stone mill house", "oak wheel and leat", "plain tiles"], story: ["water spilling into the buckets", "sacks by the door", "the millpond"],
  note: "An overshot wheel needs a head of water greater than its diameter; a leat on posts brings it to the top of the wheel.",
  build: (seed = 82) => { const b = new SceneBuilder(seed); countryside(b, { lane: false, trees: [[16, -8, 11]] }); water(b, -400, 400, 4, 9, -1.4, "#4a6060");
    placeHouse(b, { w: 10, d: 9, storeys: 3, storeyH: 2.8, walls: S.rubble("#a8987c", 0.4), roof: { kind: "gable", pitch: 45, mat: S.plainTile, over: 0.3 }, windows: { rows: [[2], [-2.5, 2], [-2.5, 2]], spec: W.leaded(0.8, 1.0) }, door: { x: -2.5, mat: S.boards("#4a3a2a") } }, 0, 0, -24, 0, () => { waterWheel(b, -7, 2.2, 1.5, 2.6, 1.1); barrel(b, 0.5, 5); });
    return done(b, frameSubject(b, 26), "morning"); } });
add({ id: "stone-dovecote", label: "Round stone dovecote", group: "rural", region: "France and England", era: "16th–17th century", setting: "rural", view: "exterior", scale: "humble", mood: "golden",
  materials: ["rubble with a string course (rat ledge)", "conical tile roof", "a lantern for the birds"], story: ["doves at the lantern", "a ladder by the door"],
  note: "A projecting string course stops rats climbing; the birds enter by a lantern at the roof's top.",
  build: (seed = 83) => { const b = new SceneBuilder(seed); countryside(b, { trees: [[12, -8, 10]] });
    tower(b, { plan: "round", r: 3.5, h: 7, wall: S.rubble("#b5a07e", 0.35), roof: { kind: "cone", h: 5.5, mat: S.plainTile, over: 0.25 } });
    b.add(cylY(0, 0, 4.2, 4.45, 3.75, b.mat(S.ashlar("#c9b48c"))), cylY(0, 0, 12, 13, 0.8, b.mat(S.boards("#5a4a3a"))), coneY(0, 0, 13, 14, 1.1, 0.05, b.mat(S.plainTile)));
    b.place();
    return done(b, frameSubject(b, -14, { pad: 0.14 }), "golden"); } });
add({ id: "farmyard-well", label: "Farmyard with well and hay barn", group: "rural", region: "Europe", era: "19th century", setting: "rural", view: "exterior", scale: "humble", mood: "noon",
  materials: ["rubble walls", "timber barn", "a stone well with a little roof"], story: ["a cart", "hay", "chickens' coop", "a pump"],
  note: "A yard enclosed by house, barn and byre; the well head of stone with a windlass under a little roof.",
  build: (seed = 84) => { const b = new SceneBuilder(seed); countryside(b, { lane: false, trees: [[-18, -14, 12]] }); ground(b, -14, 14, -12, 8, { kind: "dirt" }, 0.02);
    placeHouse(b, { w: 16, d: 9, storeys: 1, storeyH: 4.5, walls: S.boards("#6a5440", 0.7), roof: { kind: "gable", pitch: 40, mat: S.plainTile, over: 0.6 }, door: { x: 0, w: 3.2, h: 3.6, mat: S.boards("#4a3a2a") } }, 0, -12, 0, 0, () => b.add(boxAt(-1.4, 0, 4.4, 1.4, 2.5, 4.6, b.mat({ kind: "hay" }))));
    placeHouse(b, { w: 9, d: 7, storeys: 2, storeyH: 2.7, walls: S.rubble("#a99a80"), roof: { kind: "gable", pitch: 40, mat: S.plainTile }, windows: { rows: [[2], [-2, 2]], spec: W.shuttered("#5a6a4a") }, door: { x: -2 } }, -12, -2, 90);
    const st = b.mat(S.rubble("#9a8f7a", 0.5)); b.add(cut(cylY(2, 2, 0, 0.9, 0.9, st), [cylY(2, 2, 0.2, 2, 0.6, 0)]), boxAt(1.0, 0, 1.92, 1.1, 2.4, 2.08, b.mat({ kind: "oak" })), boxAt(2.9, 0, 1.92, 3.0, 2.4, 2.08, b.mat({ kind: "oak" })), cylY(2, 2, 0.2, 0.5, 0.58, b.mat({ kind: "water" })));
    b.add(spire(2, 2, 2.3, 3.1, 0.9, 4, b.mat(S.plainTile), 0, Math.PI / 4)); b.place();
    return done(b, frameSubject(b, 14), "noon"); } });
add({ id: "dry-stone-bothy", label: "Shepherd's dry-stone hut", group: "rural", region: "Scotland, Highlands", era: "18th–19th century", setting: "mountain", view: "exterior", scale: "humble", mood: "overcast",
  materials: ["dry-stone rubble", "turf over a cruck roof"], story: ["a sheepfold", "peat smoke from the chimney hole"],
  note: "Walls of unmortared stone, thick at the base; the roof of turf or heather over crucks.",
  build: (seed = 85) => { const b = new SceneBuilder(seed); countryside(b, { grass: "#6a6f48", lane: false });
    placeHouse(b, { w: 7, d: 5, storeys: 1, storeyH: 2, walls: S.rubble("#8a857a", 0.5), roof: { kind: "hip", pitch: 42, mat: { kind: "turf", colour: "#6a6a3a" }, over: 0.3 }, door: { x: 0, w: 0.8, h: 1.7, step: null }, windows: { rows: [[2]], spec: { w: 0.4, h: 0.4, panes: [1, 1] } } }, 0, 0, -18);
    gardenWall(b, -12, -4, 7, 1.2, S.rubble("#8a857a", 0.6)); gardenWall(b, 4, 12, 7, 1.2, S.rubble("#8a857a", 0.6)); b.place();
    return done(b, frameSubject(b, -14), "overcast"); } });
add({ id: "kentish-oast-house", label: "Kentish oast house", group: "rural", region: "England, Kent", era: "19th century", setting: "rural", view: "exterior", scale: "domestic", mood: "golden",
  materials: ["red brick roundels", "plain-tile cones", "white timber cowls"], story: ["hop bines", "the white cowls turning in the wind"],
  note: "Hops dried on a floor over a kiln in a round brick roundel; the cone's white cowl turns its back to the wind.",
  build: (seed = 86) => { const b = new SceneBuilder(seed); countryside(b, { trees: [[-18, -8, 10]] });
    for (const x of [-5, 1.5]) { tower(b, { x, plan: "round", r: 2.8, h: 6, wall: S.brick("#9b4a33"), roof: { kind: "cone", h: 6, mat: S.plainTile, over: 0.2 } }); b.add(cylY(x, 0, 12, 13.2, 0.55, b.mat(S.boards("#efece4", 0.2))), pentRoof(x - 0.6, x + 0.6, 0, -0.9, 13.5, 30, b.mat(S.paint("#efece4", 0.1)))); }
    placeHouse(b, { w: 12, d: 7, storeys: 2, storeyH: 2.8, walls: [S.brick("#9b4a33"), S.boards("#efece4", 0.3)], roof: { kind: "gable", pitch: 45, mat: S.plainTile }, windows: { rows: [[], [-3, 3]], spec: W.sash(1, 1) }, door: { x: 0, w: 2.2, h: 2.6 } }, 9, -1, 0);
    b.place({ yaw: -18 });
    return done(b, frameSubject(b, 6), "golden"); } });
add({ id: "vineyard-press-house", label: "Vineyard press house", group: "rural", region: "France, Burgundy", era: "18th century", setting: "rural", view: "exterior", scale: "humble", mood: "golden",
  materials: ["limestone", "Burgundian glazed tiles", "vaulted cellar door"], story: ["vines in rows", "barrels at the cellar mouth"],
  note: "A cellar dug under a small stone house; the roof in coloured glazed tiles in diamond patterns.",
  build: (seed = 87) => { const b = new SceneBuilder(seed); countryside(b, { grass: "#7f8a48", lane: false });
    placeHouse(b, { w: 10, d: 7, storeys: 2, storeyH: 2.8, walls: S.ashlar("#d8c8a2", 0.32), roof: { kind: "hip", pitch: 50, mat: { kind: "glazed-tile", colour: "#2f5a3a", colour2: "#c8902a", unit: 0.4 } }, windows: { rows: [[3], [-2.5, 2.5]], spec: W.shuttered("#5a3a24") }, door: { x: -2, w: 2, h: 2.4, shape: "segmental", mat: S.boards("#4a3424") } }, 0, 0, -24, 0, () => { barrel(b, -3.5, 4.6); barrel(b, -2.8, 4.9); barrel(b, -0.6, 4.8); });
    const cam = frameSubject(b, -16, { pad: 0.2, lift: -0.15 });
    for (let r = 0; r < 7; r++) { const z = 9 + r * 2.4; b.add(clump(-2 - r * 0.5, 0.6, z, 18, 0.42, 0.28, b.mat({ kind: "foliage", colour: "#44602a" }), b.r(), 0.25)); for (let k = 0; k < 10; k++) b.add(boxAt(-20 + k * 4 - 0.04, 0, z - 0.04, -20 + k * 4 + 0.04, 1.3, z + 0.04, b.mat({ kind: "oak", colour: "#6a5a48" }))); }
    b.place();
    return done(b, cam, "golden"); } });
add({ id: "packhorse-bridge", label: "Packhorse bridge", group: "rural", region: "England, Lake District", era: "17th century", setting: "mountain", view: "exterior", scale: "humble", mood: "morning",
  materials: ["slate rubble", "a single segmental arch", "low parapets for laden horses"], story: ["a beck tumbling below", "ferns in the joints"],
  note: "Narrow single arches with low parapets so packhorses' panniers could pass.",
  build: (seed = 88) => { const b = new SceneBuilder(seed); countryside(b, { lane: false, grass: "#5f6e3c" }); water(b, -3.4, 3.4, -300, 300, -1.2, "#5a6a62");
    bridge(b, { arches: 1, span: 7, shape: "round", h: 4.2, w: 1.8, pier: 3.5, wall: S.rubble("#7a776e", 0.6), water: 1.2, hump: 14 });
    b.place();
    // boulders in the beck and along its banks, ferns in the bridge's joints
    const rock = b.mat({ kind: "rock", colour: "#77746a", moss: 0.4 }), fern = b.mat({ kind: "foliage", colour: "#4a6a2a" });
    for (let k = 0; k < 14; k++) { const z = -26 + k * 4 + b.r(-1, 1), x = b.r(-1.8, 1.8); b.add(clump(x, -1.0, z, b.r(0.4, 0.9), b.r(0.3, 0.6), b.r(0.4, 0.8), rock, b.r(), 0.25)); }
    for (const sx of [-1, 1]) for (let k = 0; k < 34; k++) { const z = -40 + k * 2.2 + b.r(-0.6, 0.6); if (Math.abs(z) < 2.2) continue; b.add(clump(sx * (3.4 + b.r(-0.3, 0.4)), -0.45, z, b.r(0.6, 1.2), b.r(0.5, 0.9), b.r(0.6, 1.1), rock, b.r(), 0.25)); }
    for (let k = 0; k < 8; k++) b.add(clump(b.r(-6, 6), b.r(1.0, 3.2), b.r(0.8, 1.0) * (k % 2 ? 1 : -1), 0.25, 0.18, 0.12, fern, b.r(), 0.5));
    b.place();
    return done(b, frameSubject(b, -5, { pad: 0.2, eye: 1.1 }), "morning"); } });
add({ id: "cider-orchard-barn", label: "Cider barn in an orchard", group: "rural", region: "England, Somerset", era: "18th century", setting: "rural", view: "exterior", scale: "humble", mood: "golden",
  materials: ["red sandstone", "pantiles", "weatherboard"], story: ["apple trees in blossom", "a ladder against a tree"],
  note: "Weatherboarded upper storeys over stone, pantiles at a moderate pitch, apples pressed inside.",
  build: (seed = 89) => { const b = new SceneBuilder(seed); countryside(b, { grass: "#6f8440" });
    placeHouse(b, { w: 14, d: 7, storeys: 2, storeyH: 2.8, walls: [S.rubble("#9a5a44"), S.boards("#5a4a3a", 0.6)], roof: { kind: "gable", pitch: 38, mat: S.pantile }, door: { x: -3, w: 2.4, h: 2.6 }, windows: { rows: [[3], [0]], spec: W.leaded(0.8, 0.8) } }, 0, -4, -14);
    for (let i = 0; i < 6; i++) tree(b, (i < 3 ? -20 : 12) + (i % 3) * 4.5, -2 + (i % 2) * 6, 4.6, 2.2, { kind: "foliage", colour: "#6a8a3a", colour2: "#f0d8e0" }); b.place();
    return done(b, frameSubject(b, 8), "golden"); } });
add({ id: "alpine-summer-hut", label: "Alpine summer dairy hut", group: "rural", region: "Switzerland", era: "19th century", setting: "mountain", view: "exterior", scale: "humble", mood: "morning",
  materials: ["dry-stone walls", "a stone-slab roof", "a log upper gable"], story: ["cheese cellar", "cows' bells hanging by the door", "high pasture and peaks"],
  note: "Above the treeline huts are stone, roofed with heavy stone slabs at a low pitch against wind.",
  build: (seed = 90) => { const b = new SceneBuilder(seed); countryside(b, { grass: "#7a8a4a", lane: false });
    // the peaks above the pasture, snow on their upper faces
    peaks(b, [[-260, -470, 150, 150], [-50, -540, 200, 170], [170, -460, 135, 135], [360, -520, 170, 150]], 115);
    placeHouse(b, { w: 8, d: 6, storeys: 1, storeyH: 2.6, walls: S.rubble("#8f8a80", 0.4), roof: { kind: "gable", pitch: 24, mat: { kind: "stone-slate", colour: "#7a7670", course: 0.4, unit: 0.5, moss: 0.4 }, over: 0.4, gableMat: S.log("#5a4a3a") }, door: { x: 0, w: 1.0, mat: S.boards("#4a3a2a") }, windows: { rows: [[2.5]], spec: { w: 0.5, h: 0.5, panes: [1, 1] } } }, 0, 0, 20);
    b.place();
    // the yard: a hollowed-log trough under a spout, a split-rail fence round the hut, a bench by the door, a cowbell on its strap
    const log = b.mat(S.log("#6a5a44")), water = b.mat({ kind: "water", colour: "#4a6a6a" }), rail = b.mat({ kind: "oak", colour: "#7a6a52", age: 0.8 }), brass = b.mat({ kind: "brass", colour: "#a8823e" }), leather = b.mat({ kind: "leather", colour: "#4a2a1a" });
    b.add(cut(boxAt(-1.4, 0, -0.35, 1.4, 0.6, 0.35, log, 0, 0.12), [boxAt(-1.25, 0.2, -0.25, 1.25, 0.8, 0.25, 0, 0, 0.08)]), boxAt(-1.25, 0.2, -0.25, 1.25, 0.5, 0.25, water), capsule(1.6, 1.3, 0, 1.0, 0.95, 0, 0.05, log), capsule(1.6, 0, 0, 1.6, 1.35, 0, 0.07, log));
    b.place({ x: -6.5, z: 2.2, yaw: 20 });
    for (let k = 0; k < 9; k++) { const x = -10 + k * 2.6; b.add(capsule(x, 0, 7.5, x, 1.15, 7.5, 0.05, rail)); if (k < 8) for (const y of [0.5, 0.95]) b.add(capsule(x, y, 7.5, x + 2.6, y + 0.04 * Math.sin(k), 7.5, 0.04, rail)); }
    b.add(boxAt(-0.6, 0.42, 0, 0.6, 0.47, 0.32, rail), boxAt(-0.55, 0, 0.05, -0.48, 0.42, 0.28, rail), boxAt(0.48, 0, 0.05, 0.55, 0.42, 0.28, rail));
    b.place({ x: 2.2, z: 3.4, yaw: 20 });
    b.add(capsule(0, 2.1, 0, 0, 1.75, 0.02, 0.025, leather), revolve(0, 0.02, 1.48, 1.75, t => 0.11 - 0.05 * t, 0.12, brass));
    b.place({ x: -1.0, z: 3.25, yaw: 20 });
    return done(b, frameSubject(b, -10, { pad: 0.3, lift: 0.08 }), "morning"); } });

// Lived-in interiors ------------------------------------------------------------------------------------------------------
const interiorCam = (z = 5.5, y = 1.55, fov = 66, shift = 0.12, yaw = 0): CameraSpec => ({ x: 0, y, z, fov, shift, yaw });
/** Daylight indoors, exposed for the room as an interior photographer would (a bright window may burn out). */
const dayIn = (o: Partial<Mood> = {}): Mood => ({ ...MOODS["interior-day"], burn: 2.4, ...o });
add({ id: "village-bakery", label: "Village bakery interior", group: "interior", region: "France", era: "19th century", setting: "village", view: "interior", scale: "humble", mood: "interior-day",
  materials: ["brick bread oven", "limewashed walls", "oak counter and shelves"], story: ["loaves on the racks", "the oven's glow", "flour sacks", "a peel by the oven"],
  note: "A wood-fired dome oven in brick with a low segmental mouth; bread racked on slatted shelves; morning sun through the shop window.",
  build: (seed = 91) => { const b = new SceneBuilder(seed);
    room(b, { w: 7, d: 8, h: 3.2, view: "garden", wall: S.limewash("#ece2cc", 0.2, "brick"), floor: { kind: "tile-floor", colour: "#a8512f", colour2: "#c8b89a" }, beams: 1.2, windows: [{ wall: "left", at: -0.6, sill: 0.8, w: 1.8, h: 1.7, glass: { kind: "glass" } }],
      trim: { mould: { kind: "painted-wood", colour: "#5a6a5a", flake: 0.05 }, skirting: 0.15, dado: 1.1, dadoMat: { kind: "glazed-tile", colour: "#e8e2d4", colour2: "#dcd4c4", unit: 0.15 }, bars: [3, 3] } });
    // the oven: a brick dome in the corner, its mouth glowing; wood stacked beside it, the peel against the wall
    hearth(b, 1.6, -4, 1.0, 0.8, { kind: "brick", colour: "#9a5038", age: 0.9, soot: 2.4 }, 0.3); b.add(dome(1.6, 1.3, -3.4, 1.4, 1.1, b.mat({ kind: "brick", colour: "#9a5038", soot: 2.5 })));
    b.add(boxAt(2.7, 0, -2.6, 3.45, 0.95, -1.9, b.mat({ kind: "firewood" }))); b.place(); peel(b, 3.3, -3.7, -15);
    breadRack(b, -1.95, -3.55, 0, 2.7, 2.1);
    // the counter with loaves in baskets, a balance; flour sacks by the wall; the kneading trough
    table(b, -0.9, 0.3, 2.6, 0.8, 0.95, { kind: "oak", colour: "#6a4c34" }, true); b.place();
    const bread = b.mat({ kind: "bread" }), wicker = b.mat({ kind: "cane", colour: "#a8824e" });
    for (const [bx, n] of [[-1.7, 4], [-0.9, 3]] as const) { b.add(cut(cylY(bx, 0.3, 0.95, 1.08, 0.24, wicker), [cylY(bx, 0.3, 0.98, 1.2, 0.22, 0)])); for (let k = 0; k < n; k++) b.add(ellipsoid(bx + 0.1 * Math.cos(k * 2.1), 1.06, 0.3 + 0.1 * Math.sin(k * 2.1), 0.09, 0.06, 0.08, bread)); }
    b.place(); balance(b, 0.1, 0.95, 0.3);
    flourSack(b, 2.95, -1.2, 20); flourSack(b, 3.05, -0.55, -30, 0.92); flourSack(b, 2.45, -1.0, 60, 1.05);
    b.add(boxAt(0.6, 0.55, -2.5, 1.9, 0.95, -1.9, b.mat({ kind: "oak", colour: "#7a5a3a", age: 0.5 })), ellipsoid(1.25, 0.92, -2.2, 0.45, 0.06, 0.22, b.mat({ kind: "plain", colour: "#e8dcc0" })));
    for (const [lx, lz] of [[0.65, -2.45], [1.85, -2.45], [0.65, -1.95], [1.85, -1.95]] as const) b.add(boxAt(lx - 0.04, 0, lz - 0.04, lx + 0.04, 0.55, lz + 0.04, b.mat({ kind: "oak", colour: "#7a5a3a" })));
    b.place();
    return done(b, interiorCam(5.2, 1.55, 68, 0.12, -6), dayIn({ sunElevation: 18, sunAzimuth: -75 }), { dust: 0.22, interior: true }); } });
add({ id: "apothecary", label: "Cluttered apothecary", group: "interior", region: "Europe", era: "18th century", setting: "town", view: "interior", scale: "humble", mood: "interior-day",
  materials: ["oak drawers with labels", "glass and faience jars", "brass scales"], story: ["herbs drying from the beams", "a candle on the counter", "labels on every drawer"],
  note: "Walls of small labelled drawers below shelves of jars; herbs hung to dry from the ceiling beams.",
  build: (seed = 92) => { const b = new SceneBuilder(seed);
    room(b, { w: 6, d: 7, h: 3.0, view: "garden", wall: S.plaster("#bfae8a", 0.2), floor: { kind: "floorboards", colour: "#5a4232" }, beams: 1.0, windows: [{ wall: "left", at: 1.0, sill: 0.9, w: 0.9, h: 1.3, glass: { kind: "leaded" } }], trim: { mould: { kind: "oak", colour: "#3a2618" }, skirting: 0.18 } });
    // a wall of small labelled drawers under shelves of faience albarelli
    shelves(b, -3, 3, -3.5, 1.2, "drawers", 0.4); b.place();
    const oak = b.mat({ kind: "oak", colour: "#3e2a1c", age: 0.4 });
    for (let k = 0; k < 3; k++) { const y = 1.38 + k * 0.44; b.add(boxAt(-3, y - 0.03, -3.5, 3, y, -3.18, oak)); b.place(); jarRow(b, -2.92, 2.92, y, -3.34, k === 1 ? 0.24 : 0.2); }
    for (const x of [-3, -1, 1, 2.95]) b.add(boxAt(x, 1.2, -3.5, x + 0.05, 2.75, -3.18, oak)); b.add(boxAt(-3.05, 2.72, -3.5, 3.05, 2.8, -3.14, oak)); b.place();
    // the counter: a balance, a bronze mortar and pestle, bottles of tinctures, an open receipt book, a candle
    table(b, 0, -1.3, 3.4, 0.7, 0.95, { kind: "oak", colour: "#4a3424" }, true); b.place();
    balance(b, -0.9, 0.95, -1.3);
    const bronze = b.mat({ kind: "brass", colour: "#7a5a32" }), glassB = b.mat({ kind: "enamel", colour: "#2a3a2a" }), glassA = b.mat({ kind: "enamel", colour: "#6a3a1e" });
    b.add(cut(revolve(0.35, -1.25, 0.95, 1.09, t => 0.09 - 0.025 * t, 0.09, bronze), [sphere(0.35, 1.12, -1.25, 0.07, 0)]), capsule(0.35, 1.0, -1.25, 0.42, 1.22, -1.15, 0.016, bronze));
    for (let k = 0; k < 4; k++) b.add(revolve(1.0 + k * 0.13, -1.45, 0.95, 1.18 + (k % 2) * 0.05, t => (t < 0.62 ? 0.04 : 0.04 - (t - 0.62) * 0.08), 0.042, k % 2 ? glassA : glassB));
    b.add(boxAt(-0.25, 0.955, -1.2, 0.15, 0.965, -0.95, b.mat({ kind: "parchment", pattern: "text", unit: 0.4, course: 0.25, offset: [0.05, 0] })));
    b.place(); candlestick(b, 0.7, 0.95, -1.05, 0.05);
    for (let k = 0; k < 8; k++) herbBunch(b, -2.6 + k * 0.72, 2.72, -2.0 + (k % 3) * 0.55, ["#6a7040", "#7a6a3a", "#5a6a3a"][k % 3]);
    return done(b, interiorCam(4.4, 1.5, 68, 0.12), dayIn({ sunElevation: 20, sunAzimuth: -80, key: 0.2, burn: 1.5, sunPower: 3.0 }), { dust: 0.12, interior: true }); } });
add({ id: "old-library", label: "Old library", group: "interior", region: "Ireland and England", era: "18th century", setting: "city", view: "interior", scale: "civic", mood: "interior-day",
  materials: ["oak bookcases floor to ceiling", "a gallery", "leaded windows"], story: ["a rolling ladder", "a globe", "a reading table with an open book"],
  note: "Bookcases set at right angles to the walls between the windows (alcoves), a gallery reached by ladders.",
  build: (seed = 93) => { const b = new SceneBuilder(seed);
    room(b, { view: "garden", trim: { mould: { kind: "oak", colour: "#3a2618" }, skirting: 0.3 }, w: 9, d: 18, h: 7, wall: { kind: "boards", colour: "#4a3020", course: 0.24, age: 0.1 }, floor: { kind: "floorboards", colour: "#6a4a32" }, ceiling: { kind: "boards", colour: "#5a3e2a" }, windows: [{ wall: "left", at: -6, sill: 1.5, w: 1.8, h: 3.6, shape: "round", glass: { kind: "leaded" } }, { wall: "left", at: 0, sill: 1.5, w: 1.8, h: 3.6, shape: "round", glass: { kind: "leaded" } }] });
    shelves(b, -4.5, 4.5, -9, 6.8, "books", 0.4); for (const z of [-6, -3, 0, 3]) shelves(b, 2.2, 4.5, z, 6.6, "books", 0.35);
    b.add(boxAt(1.8, 3.4, -9, 2.2, 3.5, 6, b.mat({ kind: "oak", colour: "#4a3424" })));
    table(b, -1.5, -2, 2.4, 1.1, 0.8, { kind: "oak", colour: "#5a3e28" }); b.add(boxAt(-1.85, 0.8, -2.2, -1.15, 0.815, -1.8, b.mat({ kind: "parchment", pattern: "text", unit: 0.7, course: 0.4, offset: [1.5, 0] })), boxAt(-0.8, 0.8, -2.3, -0.45, 0.92, -2.05, b.mat({ kind: "leather", colour: "#5a2a1a" })), boxAt(-0.78, 0.92, -2.28, -0.47, 0.98, -2.07, b.mat({ kind: "leather", colour: "#2a3a2a" })));
    b.add(sphere(-3.2, 1.2, 0.5, 0.4, b.mat({ kind: "plain", colour: "#c9b48a" })), cylY(-3.2, 0.5, 0, 0.8, 0.05, b.mat({ kind: "oak" })));
    const oak = b.mat({ kind: "oak", colour: "#4a3424" }); b.add(boxAt(1.6, 0, -4.8, 1.68, 6.4, -4.7, oak), boxAt(1.6, 0, -4.2, 1.68, 6.4, -4.1, oak)); for (let k = 0; k < 18; k++) b.add(boxAt(1.6, 0.3 + k * 0.34, -4.8, 1.68, 0.33 + k * 0.34, -4.1, oak));
    // marble busts on pedestals at the ends of the bookcase alcoves
    const marble = b.mat({ kind: "marble", colour: "#e6e0d4" });
    for (const z of [-4.5, -1.5, 1.5]) b.add(revolve(1.9, z, 0, 1.2, t => 0.16 - 0.04 * Math.sin(Math.PI * t) + (t < 0.08 || t > 0.92 ? 0.04 : 0), 0.2, marble), sculpt([{ a: [1.9, 1.38, z], e: [0.22, 0.14, 0.12] }, { a: [1.9, 1.5, z], b: [1.9, 1.6, z], r1: 0.055, r2: 0.05 }, { a: [1.9, 1.72, z + 0.01], e: [0.085, 0.11, 0.095] }, { a: [1.82, 1.74, z + 0.07], e: [0.02, 0.025, 0.02] }], 0.04, marble));
    b.place();
    return done(b, interiorCam(7, 1.6, 68, 0.3), dayIn({ sunElevation: 26, sunAzimuth: -70, key: 0.2, burn: 1.6 }), { dust: 0.05, interior: true }); } });
add({ id: "attic-workshop", label: "Cosy attic workshop", group: "interior", region: "Europe", era: "19th century", setting: "town", view: "interior", scale: "humble", mood: "interior-day",
  materials: ["exposed rafters and purlins", "a dormer window", "a worn workbench"], story: ["tools on a board", "shavings on the floor", "a lantern", "a cat on the sill"],
  note: "Under the roof the rafters pitch down to low knee walls; light comes from a dormer cut through the slope.",
  build: (seed = 94) => { const b = new SceneBuilder(seed);
    room(b, { w: 7, d: 8, h: 1.2, view: "garden", wall: S.plaster("#d9cdb4", 0.2), floor: { kind: "floorboards", colour: "#6a4c34" }, attic: 48, windows: [{ wall: "back", at: 0, sill: 0.95, w: 1.3, h: 1.3, glass: { kind: "glass" } }], trim: { mould: { kind: "oak", colour: "#6a4c34" }, bars: [2, 2] } });
    workbench(b, 0, -3.15, 0, 2.6, false);
    // tools hung along the knee wall, a chair in pieces, a barrel, a stool, a lantern, the cat asleep on the sill
    const dk = b.mat({ kind: "oak", colour: "#3e2c1e" }), ir = b.mat({ kind: "iron", colour: "#1e1c1a" });
    for (let k = 0; k < 6; k++) b.add(capsule(-3.45, 1.0, -2.5 + k * 0.3, -3.45, 0.55 + (k % 2) * 0.1, -2.5 + k * 0.3, 0.012, k % 2 ? ir : dk));
    b.add(boxAt(-3.48, 0.95, -2.7, -3.44, 1.05, -0.7, dk)); b.place();
    for (let k = 0; k < 4; k++) b.add(capsule(-2.2 + k * 0.12, 0.02, 0.2, -2.0 + k * 0.12, 0.02, 0.9, 0.022, b.mat({ kind: "oak", colour: "#a8865c" })));
    b.add(boxAt(-2.6, 0.0, 0.6, -2.1, 0.03, 1.0, b.mat({ kind: "oak", colour: "#a8865c" }))); b.place();
    barrel(b, 2.8, -1.4, 0.3, 0.7); b.place(); stool(b, 0.8, -2.2, 20);
    hangingLantern(b, -0.6, 2.2, -2.6, 3.6, 0.05); sleepingCat(b, 0.15, 0.97, -3.95, 15);
    return done(b, interiorCam(4.2, 1.5, 72, 0.32), dayIn({ sunElevation: 26, sunAzimuth: 170, burn: 1.8 }), { dust: 0.18, interior: true }); } });
add({ id: "blacksmith-forge", label: "Blacksmith's forge", group: "interior", region: "Europe", era: "19th century", setting: "village", view: "interior", scale: "humble", mood: "interior-day",
  materials: ["brick forge with hood", "an iron anvil on an oak stump", "soot-black beams"], story: ["glowing coals", "tongs and hammers on the wall", "a quenching tub"],
  note: "The hearth raised to working height, bellows behind, the anvil a step away; everything soot-black but the fire.",
  build: (seed = 95) => { const b = new SceneBuilder(seed);
    room(b, { w: 8, d: 8, h: 3.6, view: "garden", wall: S.rubble("#4a4038", 0.1), floor: { kind: "dirt", colour: "#3a3028" }, beams: 1.1, windows: [{ wall: "left", at: -1.5, sill: 1.2, w: 0.9, h: 1.0, glass: { kind: "glass", colour: "#3a3a36" } }] });
    forge(b, 0.6, -3.35, 0, 1.5, 3.6); anvil(b, 0.3, -1.3, 12);
    // tongs and hammers racked on the wall, horseshoes on a nail, a heap of coal, a stool
    const ir = b.mat({ kind: "iron", colour: "#1e1c1a", age: 0.4 }), dk = b.mat({ kind: "oak", colour: "#3e2c1e", age: 0.6 });
    b.add(boxAt(-3.98, 1.7, -3.2, -3.9, 1.78, -0.6, dk));
    for (let k = 0; k < 8; k++) { const z = -3.0 + k * 0.32; b.add(capsule(-3.86, 1.72, z, -3.86, 0.75, z - 0.03, 0.012, ir), capsule(-3.86, 1.72, z + 0.04, -3.86, 0.75, z + 0.07, 0.012, ir)); }
    for (let k = 0; k < 5; k++) b.add(leaf((x, y, z) => { const zz = z - (-0.2 + k * 0.17); return Math.max(Math.abs(Math.hypot(y - 1.55, zz) - 0.06) - 0.009, Math.abs(x + 3.9) - 0.006, (y - 1.55) - 0.035); }, [-3.92, 1.48, -0.3 + k * 0.17], [-3.88, 1.6, -0.1 + k * 0.17], ir));
    for (let k = 0; k < 9; k++) b.add(clump(-2.2 + 0.3 * Math.cos(k * 1.9), 0.1 + 0.05 * (k % 3), -3.1 + 0.3 * Math.sin(k * 1.9), 0.18, 0.14, 0.18, b.mat({ kind: "rock", colour: "#1c1a18" }), b.r(), 0.4));
    b.place(); stool(b, -1.4, -0.6, 30); barrel(b, 2.9, -1.0, 0.4, 0.6); b.place();
    return done(b, interiorCam(4.2), dayIn({ sunElevation: 30, sunAzimuth: -70, ambient: 0.25, key: 0.13, burn: 1.4 }), { dust: 0.4, interior: true }); } });
add({ id: "tavern-hearth", label: "Tavern with a roaring hearth", group: "interior", region: "England", era: "17th–18th century", setting: "village", view: "interior", scale: "humble", mood: "candle",
  materials: ["inglenook fireplace", "flagstone floor", "low oak beams"], story: ["barrels behind the bar", "pewter tankards", "a settle by the fire"],
  note: "Low ceilings on heavy beams, an inglenook big enough to sit in, flagstones worn by boots.",
  build: (seed = 96) => { const b = new SceneBuilder(seed);
    room(b, { w: 8, d: 9, h: 2.5, view: "garden", wall: S.limewash("#e6dcc4", 0.3, "rubble"), floor: { kind: "flags", colour: "#7a7468", unit: 0.6 }, beams: 0.9, windows: [{ wall: "left", at: -2, sill: 0.9, w: 1.0, h: 0.9, glass: { kind: "leaded" } }], trim: { mould: { kind: "oak", colour: "#3a2a1c" }, skirting: 0.2 } });
    hearth(b, 1.5, -4.5, 2.2, 1.6, { kind: "rubble", colour: "#8a7a62", soot: 2.0 }, 0.12);
    // the bar: barrels on a stillage, a counter, bottles; pewter plates on a rail; hops along a beam
    const oak = b.mat({ kind: "oak", colour: "#4a3424", age: 0.5 }), pew = b.mat({ kind: "zinc", colour: "#8c8c88" }), bottle = b.mat({ kind: "enamel", colour: "#2a3424" }), hops = b.mat({ kind: "foliage", colour: "#7a8a48" });
    b.add(boxAt(-3.9, 0.5, -4.4, -2.5, 0.56, -1.6, oak)); b.place(); for (let k = 0; k < 3; k++) { barrel(b, -3.3, -3.9 + k * 0.85, 0.32, 0.75); b.place({ y: 0.56 }); }
    b.add(boxAt(-2.4, 0, -3.6, -2.0, 1.05, -0.8, oak, 0, 0.01), boxAt(-2.5, 1.05, -3.7, -1.9, 1.1, -0.7, oak));
    for (let k = 0; k < 6; k++) b.add(revolve(-2.2, -3.4 + k * 0.45, 1.1, 1.38, t => (t < 0.6 ? 0.04 : 0.04 - (t - 0.6) * 0.08), 0.042, bottle));
    b.add(boxAt(-1.5, 1.55, -4.5, 3.5, 1.58, -4.38, oak)); for (let k = 0; k < 9; k++) b.add(cylZ(-1.25 + k * 0.32, 1.72, -4.45, -4.43, 0.14, pew));
    for (let k = 0; k < 14; k++) b.add(clump(-3.6 + k * 0.5, 2.2 - 0.06 * Math.sin(k * 0.9), -0.7, 0.14, 0.1, 0.12, hops, b.r(), 0.5));
    b.place();
    // tables with tankards and candles, benches, stools; a cat by the fire
    table(b, -0.6, 0.2, 1.8, 0.9); table(b, 2.2, 1.2, 1.4, 0.9); bench(b, -0.6, -0.6, 1.6); bench(b, -0.6, 0.6, 1.6); b.place();
    for (const [x, z, a] of [[-1.1, 0.15, 0.4], [-0.3, 0.3, 2.6], [2.1, 1.0, 1.2], [2.4, 1.3, -0.6]] as const) tankard(b, x, 0.78, z, a);
    candlestick(b, -0.6, 0.78, 0.15, 0.022); candlestick(b, 2.25, 0.78, 1.25, 0.02);
    stool(b, 1.4, 1.4, 10); stool(b, 3.0, 1.0, 50); sleepingCat(b, 1.2, 0.0, -3.4, -30, "#3a3430");
    hangingLantern(b, 0.6, 1.7, -1.2, 2.5, 0.025);
    return done(b, interiorCam(4.8, 1.5), { ...MOODS["candle"], key: 0.12, burn: 1.0 }, { dust: 0.1, interior: true }); } });
add({ id: "monastery-scriptorium", label: "Monastery scriptorium", group: "interior", region: "Europe", era: "12th century", setting: "rural", view: "interior", scale: "humble", mood: "interior-day",
  materials: ["stone barrel vault", "round-arched windows", "sloped writing desks"], story: ["parchment and ink horns", "a shaft of morning light"],
  note: "Scribes worked in north light from tall round-headed windows, at sloped desks beneath a stone vault.",
  build: (seed = 97) => { const b = new SceneBuilder(seed);
    const st = S.ashlar("#cbbf9f", 0.34);
    room(b, { w: 6, d: 12, h: 7.5, view: "garden", wall: st, floor: { kind: "flags", colour: "#9a907e" }, ceiling: st, windows: [{ wall: "left", at: -3, sill: 1.2, w: 0.9, h: 2.2, shape: "round", glass: { kind: "glass" } }, { wall: "left", at: 1.5, sill: 1.2, w: 0.9, h: 2.2, shape: "round", glass: { kind: "glass" } }] });
    b.add(cut(boxAt(-3.5, 3.9, -6.5, 3.5, 7.5, 10, b.mat(st)), [opening(0, 0, 6, 4, "round", -7, 11, "z")])); b.place();
    // three monks' desks along the window wall, each with its manuscript and exemplar; a book cupboard; a candle stand
    for (const z of [-3.6, -0.5, 2.5]) writingDesk(b, -1.9, z, 90);
    const oak = b.mat({ kind: "oak", colour: "#5a4030", age: 0.5 }), books = b.mat({ kind: "books", course: 0.36 });
    b.add(boxAt(1.4, 0, -5.98, 2.9, 2.2, -5.4, oak), boxAt(1.48, 0.1, -5.9, 2.82, 2.1, -5.55, books), boxAt(1.4, 0, -5.4, 1.46, 2.2, -4.8, oak)); b.place();
    candlestick(b, 0.6, 1.1, -2.0, 0.04); b.add(revolve(0.6, -2.0, 0, 1.1, t => 0.03 + 0.12 * Math.exp(-t * 18), 0.15, b.mat({ kind: "iron", colour: "#1e1c1a" }))); b.place();
    // a reading lectern in the middle with the great book chained to it; a crucifix on the end wall; manuscripts stacked
    const dk = b.mat({ kind: "oak", colour: "#3e2c1e", age: 0.5 }), ir = b.mat({ kind: "iron", colour: "#1e1c1a" });
    b.add(revolve(0.9, 1.0, 0, 1.0, t => 0.05 + 0.15 * Math.exp(-t * 10), 0.2, dk), boxAt(0.6, 1.0, 0.75, 1.2, 1.04, 1.25, dk), boxAt(0.65, 1.04, 0.8, 1.15, 1.07, 1.2, b.mat({ kind: "parchment", pattern: "text", unit: 0.5, course: 0.4, offset: [-0.9, 0] })));
    for (let k = 0; k < 6; k++) b.add(sphere(1.2 + k * 0.03, 1.0 - k * 0.04, 1.0, 0.012, ir));
    b.add(boxAt(-0.05, 4.2, -5.95, 0.05, 5.4, -5.9, dk), boxAt(-0.35, 4.95, -5.95, 0.35, 5.05, -5.9, dk));
    for (let k = 0; k < 4; k++) b.add(boxAt(2.0, 0, -4.2 + k * 0.02, 2.36, 0.08 + k * 0.06, -3.9 + k * 0.02, b.mat({ kind: "leather", colour: ["#5a2a1a", "#3a2a1c", "#6a4a2a", "#2a1e18"][k] })));
    b.place();
    return done(b, { x: 1.9, y: 1.55, z: 4.6, fov: 64, shift: 0.22, yaw: -24 }, dayIn({ sunElevation: 24, sunAzimuth: -70 }), { dust: 0.16, interior: true }); } });
add({ id: "cottage-kitchen", label: "Cottage kitchen", group: "interior", region: "Europe", era: "19th century", setting: "village", view: "interior", scale: "humble", mood: "interior-day",
  materials: ["limewashed walls", "a range in the old hearth", "a dresser with plates"], story: ["copper pots", "bread on the table", "herbs on the windowsill"],
  note: "The old open hearth holds a range; a dresser of plates faces it; the scrubbed table is the centre of the house.",
  build: (seed = 98) => { const b = new SceneBuilder(seed);
    room(b, { w: 6.5, d: 7, h: 2.6, view: "garden", wall: S.limewash("#ede6d4", 0.25, "rubble"), floor: { kind: "flags", colour: "#8a8478", unit: 0.55 }, beams: 1.0, windows: [{ wall: "left", at: -1, sill: 0.9, w: 1.0, h: 1.0, glass: { kind: "leaded" } }], trim: { mould: { kind: "painted-wood", colour: "#6a7a5c", flake: 0.08 } } });
    hearth(b, 1.4, -3.5, 1.4, 1.2, { kind: "brick", colour: "#8a4a34", soot: 2 }, 0.3);
    // a crane swung over the fire with a pot; the dresser of blue-and-white plates; the scrubbed table; pans on the wall
    const ir = b.mat({ kind: "iron", colour: "#1e1c1a", age: 0.4 }), oak = b.mat({ kind: "oak", colour: "#6a4c32", age: 0.4 }), plateW = b.mat({ kind: "enamel", colour: "#e8e4dc" }), plateB = b.mat({ kind: "enamel", colour: "#2c4a8a" }), cu = b.mat({ kind: "enamel", colour: "#a8562c" });
    b.add(capsule(0.85, 0.3, -3.3, 0.85, 1.3, -3.3, 0.02, ir), capsule(0.85, 1.25, -3.3, 1.5, 1.25, -3.0, 0.015, ir), capsule(1.5, 1.25, -3.0, 1.5, 0.85, -3.0, 0.006, ir), revolve(1.5, -3.0, 0.55, 0.85, t => 0.13 + 0.04 * Math.sin(Math.PI * t), 0.17, ir));
    b.add(boxAt(-3.2, 0, -3.5, -1.0, 0.9, -3.0, oak), boxAt(-3.25, 0.9, -3.52, -0.95, 0.94, -2.95, oak), boxAt(-3.2, 0.94, -3.5, -3.15, 2.1, -3.25, oak), boxAt(-1.05, 0.94, -3.5, -1.0, 2.1, -3.25, oak), boxAt(-3.25, 2.1, -3.52, -0.95, 2.18, -3.2, oak));
    for (let r = 0; r < 3; r++) { const y = 1.25 + r * 0.32; b.add(boxAt(-3.2, y - 0.02, -3.5, -1.0, y, -3.28, oak)); for (let k = 0; k < 6; k++) { const px = -3.0 + k * 0.36; b.add(cylZ(px, y + 0.13, -3.42, -3.4, 0.13, k % 2 ? plateB : plateW), cylZ(px, y + 0.13, -3.4, -3.395, 0.09, k % 2 ? plateW : plateB)); } }
    b.place();
    table(b, 0, -0.5, 1.8, 0.9, 0.8, { kind: "oak", colour: "#c8b08a" }); b.place();
    b.add(ellipsoid(-0.2, 0.86, -0.5, 0.18, 0.08, 0.1, b.mat({ kind: "bread" })), revolve(0.4, -0.6, 0.8, 1.02, t => 0.06 + 0.03 * Math.sin(Math.PI * t), 0.1, b.mat({ kind: "enamel", colour: "#c8b090" })));
    b.add(capsule(-0.9, 2.15, -1.6, 0.9, 2.15, -1.6, 0.012, ir));
    for (const [k, x] of [-0.6, -0.15, 0.3, 0.75].entries()) { const r = 0.09 + k * 0.02, yc = 1.95 - r; b.add(capsule(x, 2.15, -1.6, x, yc + r, -1.6, 0.008, cu), cut(cylZ(x, yc, -1.66, -1.6, r, cu), [cylZ(x, yc, -1.8, -1.615, r - 0.008, 0)])); }
    for (const z of [-1.4, -0.95, -0.5]) b.add(revolve(-3.18, z, 0.92, 1.04, t => 0.05 + 0.02 * t, 0.07, b.mat({ kind: "enamel", colour: "#a8603a" })), ellipsoid(-3.18, 1.1, z, 0.06, 0.07, 0.06, b.mat({ kind: "foliage", colour: "#4a6a3a" })));
    b.place(); stool(b, -0.9, 0.3, 15); stool(b, 0.8, 0.4, 70);
    return done(b, interiorCam(4), dayIn({ sunElevation: 20, sunAzimuth: -75 }), { dust: 0.3, interior: true }); } });
add({ id: "clockmaker-shop", label: "Clockmaker's workshop", group: "interior", region: "Germany and Switzerland", era: "19th century", setting: "town", view: "interior", scale: "humble", mood: "interior-day",
  materials: ["walls of clocks", "a bench at the window", "brass and glass"], story: ["a magnifier on the bench", "pendulums at rest"],
  note: "A watchmaker's bench stands at the window for light; clocks hang on every wall, each case a little different.",
  build: (seed = 99) => { const b = new SceneBuilder(seed);
    room(b, { w: 6, d: 7, h: 3, view: "garden", wall: { kind: "boards", colour: "#6a4a30", course: 0.2, age: 0.2 }, floor: { kind: "floorboards", colour: "#5a3e2a" }, beams: 1.2, windows: [{ wall: "left", at: -2.0, sill: 0.95, w: 1.6, h: 1.4, glass: { kind: "glass" } }], trim: { mould: { kind: "oak", colour: "#3a2618" }, skirting: 0.15, bars: [3, 2] } });
    // clocks on every wall, each a different case: round dials, regulators, cuckoo clocks
    const woods: SurfaceSpec[] = [{ kind: "oak", colour: "#3a2618", age: 0.2 }, { kind: "oak", colour: "#6a4024", age: 0.2 }, { kind: "oak", colour: "#8a6038", age: 0.2 }];
    const styles = ["round", "regulator", "cuckoo", "round", "round", "cuckoo", "regulator", "round"] as const;
    for (let k = 0; k < 8; k++) wallClock(b, -2.4 + k * 0.68, styles[k] === "regulator" ? 1.9 : 1.65 + (k % 2) * 0.45, -3.5, styles[k], woods[k % 3]);
    for (let k = 0; k < 4; k++) wallClock(b, -1.6 + k * 0.85, 2.55, -3.5, "round", woods[(k + 1) % 3]);
    // the bench at the window: a high top over small drawers, the magnifier lamp, clock parts, a movement under a bell glass
    const oak = b.mat({ kind: "oak", colour: "#5a3e28", age: 0.3 }), dr = b.mat({ kind: "drawers" });
    b.add(boxAt(-2.95, 0, -3.0, -2.25, 0.92, -1.0, oak), boxAt(-2.94, 0.3, -2.95, -2.9, 0.88, -1.05, dr), boxAt(-3.0, 0.92, -3.05, -2.1, 0.97, -0.95, oak)); b.place();
    magnifierLamp(b, -2.6, 0.97, -2.3); clockParts(b, -2.45, 0.97, -1.7);
    b.add(cylY(-2.55, -1.25, 0.97, 1.0, 0.1, oak), cut(revolve(-2.55, -1.25, 1.0, 1.3, t => 0.085 * Math.sqrt(Math.max(0, 1 - Math.max(0, t - 0.6) ** 2 / 0.16)), 0.09, b.mat({ kind: "glass", colour: "#8a9a98", clear: 0.85 })), [revolve(-2.55, -1.25, 0.99, 1.29, t => 0.08 * Math.sqrt(Math.max(0, 1 - Math.max(0, t - 0.6) ** 2 / 0.16)), 0.085, 0)]));
    b.add(cylY(-2.55, -1.25, 1.0, 1.1, 0.05, b.mat({ kind: "brass", colour: "#c09a4e" }))); b.place();
    stool(b, -1.8, -2.0, -60);
    table(b, 0.8, -1.4, 2.0, 0.7, 0.92, { kind: "oak", colour: "#5a3e28" }, true); b.place(); clockParts(b, 0.6, 0.92, -1.45); wallClock(b, 1.3, 0.92, -1.6, "regulator");
    return done(b, interiorCam(4), dayIn({ sunElevation: 22, sunAzimuth: -80, key: 0.22 }), { dust: 0.2, interior: true }); } });
add({ id: "bookshop-rain-night", label: "Bookshop on a rainy night", group: "interior", region: "Europe", era: "19th century", setting: "town", view: "exterior", scale: "humble", mood: "rain-night",
  materials: ["painted shopfront", "small-paned bow window", "wet cobbles"], story: ["warm light from the window onto the wet street", "a lamp's reflection in the puddles", "books stacked in the window"],
  note: "Light spilling from a warm window onto rain-slicked cobbles: lamp colour about 2000 K against the blue night.",
  build: (seed = 100) => { const b = new SceneBuilder(seed); town(b, 5, 11, { kind: "cobbles", moss: 0.15 });
    placeHouse(b, { w: 7, d: 8, storeys: 3, storeyH: 2.9, walls: [S.paint("#2f3f4f", 0.1), S.brick("#7a3e2c")], roof: { kind: "gable-front", pitch: 50, mat: S.slate }, windows: { rows: [[], [-1.8, 1.8], [0]], spec: W.sash(0.9, 1.5) }, shop: { fascia: S.paint("#2f3f4f") }, door: null }, 0, 0, -10, 0.005, () => {
      b.add(boxAt(-2.8, 0.5, 3.72, 2.8, 0.85, 3.78, b.mat({ kind: "books", course: 0.36 }))); b.light({ x: 0, y: 1.8, z: 3.2, kelvin: 2200, power: 0.6 }); });
    lamppost(b, 4.5, 5.6); b.place();
    // the street the shop stands in: neighbours of other heights, colours and materials either side, a few windows lit
    const view = frameSubject(b, 14, { pad: 0.2 });
    const neighbours: readonly (readonly [number, number, SurfaceSpec, number])[] = [[-7.4, 4, S.brick("#6a3a2a"), 7], [-14.2, 3, S.paint("#c8b896", 0.1), 6.4], [7.2, 3, S.paint("#7a8a7a", 0.15), 7], [14.0, 4, S.brick("#8a4a34"), 6.4]];
    for (const [x, storeys, wall, w] of neighbours) placeHouse(b, { w, d: 8, storeys, storeyH: 2.8, walls: wall, roof: { kind: storeys > 3 ? "gable-front" : "gable", pitch: 45, mat: S.slate }, windows: { rows: Array.from({ length: storeys }, (_, k) => (k === 0 ? [-1.6, 1.6] : [-1.8, 0, 1.8])), spec: W.sash(0.8, 1.35) }, door: { x: 0, w: 1.0, mat: S.paint("#2a2a2a") } }, x, 0, -10, 0.004);
    lamppost(b, -9.5, 5.6); b.place();
    return done(b, view, "rain-night"); } });

/** All 100 entries. */
export const ARCH_LIBRARY: readonly LibraryEntry[] = E;
/** An entry by id. */
export const findLibraryEntry = (id: string) => E.find(e => e.id === id);

// ---- Studies for the style guide -------------------------------------------------------------------------------------------

/** One surface under raking light: a wall panel (with a sill and a window reveal), a roof slope or a patch of ground. */
export function surfaceStudy(surface: SurfaceSpec, form: "wall" | "roof" | "ground" = "wall", mood: MoodId = "morning", seed = 7): ArchScene {
  const b = new SceneBuilder(seed);
  ground(b, -60, 60, -60, 60, form === "ground" ? surface : { kind: "flags", colour: "#9a9284" });
  const m = b.mat(surface);
  if (form === "wall") {
    b.add(cut(boxAt(-1.6, 0, -0.4, 1.6, 2.6, 0, m), [opening(0.55, 0.9, 0.7, 1.0, "round", -0.3, 0.2)]), boxAt(0.1, 0.84, -0.18, 1.0, 0.9, 0.08, b.mat(S.ashlar("#cfc4ad"))));
    b.add(box(0.55, 1.5, -0.2, 0.36, 0.7, 0.01, b.mat({ kind: "glass" })));
    b.place({ yaw: 18 });
    return b.scene({ x: 0.2, y: 1.3, z: 3.6, yaw: -4, fov: 52, shift: 0 }, mood);
  }
  if (form === "roof") {
    b.add(gableRoof({ x0: -2, x1: 2, z0: -2.4, z1: 2.4, y: 0.6, pitch: 40, over: 0.2 }, m), gableWall({ x0: -2, x1: 2, z0: -2.4, z1: 2.4, y: 0.6, pitch: 40 }, b.mat(S.ashlar("#cfc4ad"))), boxAt(-2, 0, -2.4, 2, 0.6, 2.4, b.mat(S.ashlar("#cfc4ad"))));
    b.place({ yaw: 24 });
    return b.scene({ x: 0.8, y: 3.4, z: 5.2, yaw: -8, fov: 52, shift: -0.62 }, mood);
  }
  return b.scene({ x: 0, y: 1.6, z: 3, yaw: 0, fov: 52, shift: -0.85 }, mood);
}

/** The imperfections that make a building old: a forward lean (as canal houses lean) and a sagging ridge, side by side with a true one. */
export function imperfectionStudy(lean: number, sag: number, mood: MoodId = "golden", seed = 5): ArchScene {
  const b = new SceneBuilder(seed); town(b, 5, 11);
  for (const [k, l, sg] of [[-1, 0, 0], [0, lean, sag], [1, lean * 0.6, sag * 1.4]] as const) placeHouse(b, { w: 6, d: 8, storeys: 3, storeyH: 2.8, walls: k === 0 ? S.brick("#8a4430", "flemish") : S.frame("#e7d3a6", "#3e2e22", "close", 2.8, 0.9, 0.5), roof: { kind: k === 0 ? "step-gable" : "gable", pitch: 50, mat: S.plainTile, sag: sg, ridgeMat: S.ashlar("#e0d6c0") }, windows: { rows: [[1.4], [-1.4, 1.4], [-1.4, 1.4]], spec: W.leaded(0.9, 1.2) }, door: { x: -1.4 } }, k * 6.4, 0, 0, l);
  return b.scene(frameSubject(b, -16), mood);
}
