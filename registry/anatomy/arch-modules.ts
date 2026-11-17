/**
 * ARCH1 module showcase: isolated, hero-grade architectural building blocks, each a function that builds the module
 * in local metres (ground y = 0, front toward +z) into a `SceneBuilder`, so films and plates can reuse them, and each
 * shown alone on a warm parchment studio cove with a golden key light, a warm rim light and contact shadows.
 *
 * Eight families: classical and neoclassical, Gothic, Renaissance and Baroque, Chinese imperial and vernacular,
 * European vernacular details, Art Deco, Modernism, Brutalism and Deconstructivism. Proportions follow the sources in
 * `docs/research/architecture-storybook-reference-study-2026-11-17.md` (module section): classical orders by lower
 * diameters, the Pantheon's five rings of 28 coffers, equilateral Gothic arches, the dougong's cap block, arms and
 * cantilevers, ridge beasts in odd numbers led by a rider, Le Corbusier's pilotis and ribbon windows, board-formed
 * béton brut, shingled titanium, diagrid steel.
 */
import type { ArchScene, CameraSpec } from "./arch-paint";
import type { Node } from "./arch-sdf";
import { boxDistance, leaf } from "./arch-sdf";
import { SceneBuilder, beam, boxAt, capsule, clump, coneY, cut, cylX, cylY, cylZ, ellipsoid, gableRoof, gableWall, lanternParts, opening, openingTop, repeatAround, repeatWheel, repeatX, revolve, sphere, spire, tiltedBoard, windowParts } from "./arch-kit";
import type { SurfaceSpec } from "./arch-surface";

export type ModuleGroup = "classical" | "gothic" | "renaissance" | "chinese" | "vernacular" | "deco" | "modern" | "brutalist";
export const MODULE_GROUPS: readonly { id: ModuleGroup; label: string }[] = [
  { id: "classical", label: "Classical and neoclassical" }, { id: "gothic", label: "Gothic" }, { id: "renaissance", label: "Renaissance and Baroque" },
  { id: "chinese", label: "Chinese imperial and vernacular" }, { id: "vernacular", label: "European vernacular and craft details" }, { id: "deco", label: "Art Deco" },
  { id: "modern", label: "Modernism and the International Style" }, { id: "brutalist", label: "Brutalist and Deconstructivist" },
];
export interface ModuleEntry {
  id: string; label: string; group: ModuleGroup;
  /** Landmarks it is drawn from. */
  inspiration: readonly string[];
  materials: readonly string[];
  /** How it is built (what the references show). */
  note: string;
  /** View heading (degrees from the front) and eye height as a share of the module's height. */
  view?: { yaw?: number; eye?: number; pad?: number };
  build: (b: SceneBuilder) => void;
}

// ---- Materials ------------------------------------------------------------------------------------------------------------

const M = {
  marble: { kind: "marble", colour: "#ece6da" } as SurfaceSpec,
  oldMarble: { kind: "marble", colour: "#e2dacb", age: 0.5 } as SurfaceSpec,
  limestone: { kind: "ashlar", colour: "#d8cba9", course: 0.42, age: 0.6, moss: 0.15 } as SurfaceSpec,
  granite: { kind: "ashlar", colour: "#8f8b84", course: 0.4, age: 0.7, moss: 0.3 } as SurfaceSpec,
  travertine: { kind: "travertine", colour: "#e1d4b6" } as SurfaceSpec,
  terracotta: { kind: "pantile", colour: "#b0583a", unit: 0.22, age: 0.4 } as SurfaceSpec,
  gold: { kind: "gold" } as SurfaceSpec,
  iron: { kind: "iron", age: 0.3 } as SurfaceSpec,
  brass: { kind: "brass", colour: "#c39a4c" } as SurfaceSpec,
  bronze: { kind: "brass", colour: "#7a5a34" } as SurfaceSpec,
  steel: { kind: "steel" } as SurfaceSpec,
  stained: { kind: "stained", emit: 0.9 } as SurfaceSpec,
  glass: { kind: "glass" } as SurfaceSpec,
  curtain: { kind: "curtain" } as SurfaceSpec,
  stucco: { kind: "plaster", colour: "#f1eee6", flake: 0.03, under: "brick" } as SurfaceSpec,
  concrete: { kind: "board-concrete", age: 0.7, moss: 0.35 } as SurfaceSpec,
  titanium: { kind: "titanium" } as SurfaceSpec,
  red: { kind: "painted-wood", colour: "#8e2a1f", flake: 0.08 } as SurfaceSpec,
  poly: { kind: "polychrome" } as SurfaceSpec,
  yellowTile: { kind: "glazed-tube", colour: "#d6a52a" } as SurfaceSpec,
  blueTile: { kind: "glazed-tube", colour: "#2c4f96" } as SurfaceSpec,
  greenTile: { kind: "glazed-tube", colour: "#2f8a7c" } as SurfaceSpec,
  greyBrick: { kind: "brick", colour: "#7d7c78", colour2: "#c7c2b8", age: 0.6, moss: 0.3 } as SurfaceSpec,
  greyTile: { kind: "pantile", colour: "#5e6062", unit: 0.18, age: 0.5, moss: 0.3 } as SurfaceSpec,
  oak: { kind: "oak", colour: "#5a4330", age: 0.6 } as SurfaceSpec,
  frame: { kind: "timber-frame", colour: "#e9dcc0", colour2: "#3d2e22", pattern: "close", storey: 2.6, sill: 0.9, spacing: 0.45, age: 0.6 } as SurfaceSpec,
  clayTile: { kind: "plain-tile", colour: "#8f5038", age: 0.7, moss: 0.75 } as SurfaceSpec,
  brick: { kind: "brick", colour: "#93503a", age: 0.6, soot: 0 } as SurfaceSpec,
  cobbles: { kind: "cobbles", moss: 0.5 } as SurfaceSpec,
  lattice: { kind: "painted-wood", colour: "#6a3f28", flake: 0.05 } as SurfaceSpec,
  paper: { kind: "plain", colour: "#efe4c8" } as SurfaceSpec,
  rubble: { kind: "rubble", colour: "#9b8f7b", moss: 0.3, age: 0.6 } as SurfaceSpec,
};

// ---- Shaped leaves --------------------------------------------------------------------------------------------------------

/** A fluted shaft with entasis: `n` flutes `depth` deep, radius r0 at the foot tapering to r1. */
export function flutedShaft(x: number, z: number, y0: number, y1: number, r0: number, r1: number, n: number, depth: number, mat: number): Node {
  const h = y1 - y0;
  return leaf((px, py, pz) => {
    const t = Math.min(1, Math.max(0, (py - y0) / h)), R = r0 + (r1 - r0) * t + 0.012 * r0 * Math.sin(Math.PI * t) * 2, qx = px - x, qz = pz - z, q = Math.hypot(qx, qz);
    const fl = Math.pow(Math.abs(Math.sin((n * Math.atan2(qz, qx)) / 2)), 0.6), dr = q - (R - depth * fl), dy = Math.abs(py - (y0 + y1) / 2) - h / 2;
    return (Math.min(Math.max(dr, dy), 0) + Math.hypot(Math.max(dr, 0), Math.max(dy, 0))) * 0.62;
  }, [x - r0, y0, z - r0], [x + r0, y1, z + r0], mat);
}
/** A disc facing ±z with a spiral groove cut in both faces (an Ionic volute, a scroll's end). */
export function volute(x: number, y: number, z0: number, z1: number, R: number, turns: number, mat: number): Node {
  const hz = (z1 - z0) / 2, zc = (z0 + z1) / 2, p = R / (turns + 0.4);
  return leaf((px, py, pz) => {
    const qx = px - x, qy = py - y, r = Math.hypot(qx, qy), dz = Math.abs(pz - zc) - hz, dr = r - R;
    const disk = Math.min(Math.max(dr, dz), 0) + Math.hypot(Math.max(dr, 0), Math.max(dz, 0));
    const a = (Math.atan2(qy, qx) / (2 * Math.PI) + 1) % 1, s = (((r - a * p) % p) + p) % p, sd = Math.min(s, p - s);
    return Math.max(disk, -Math.max(sd - p * 0.16, hz - 0.03 - Math.abs(pz - zc), r - R * 0.95));
  }, [x - R, y - R, z0], [x + R, y + R, z1], mat);
}
/** A slab of lattice (bars in a square-and-diagonal pattern) in the plane z = zc. */
function latticePanel(x0: number, y0: number, x1: number, y1: number, zc: number, cell: number, bar: number, t: number, mat: number): Node {
  return leaf((px, py, pz) => {
    const u = px - x0, v = py - y0, a = (u + v) / cell, c = (u - v) / cell;
    const sq = Math.min(Math.abs(u / cell - Math.round(u / cell)), Math.abs(v / cell - Math.round(v / cell))) * cell;
    const dg = Math.min(Math.abs(a - Math.round(a)), Math.abs(c - Math.round(c))) * cell * 0.7071;
    const bars = Math.min(sq, dg * 1.0 + (Math.abs(((u / cell) % 2) - 1) < 0.5 ? 0 : 1e3)) - bar / 2;
    return Math.max(bars, Math.abs(pz - zc) - t / 2, boxDistance([x0, y0, zc - t], [x1, y1, zc + t], px, py, pz));
  }, [x0, y0, zc - t], [x1, y1, zc + t], mat);
}
/** A coffered dome wedge seen from inside: a spherical shell whose inner face steps back in rings of coffers. */
function cofferedDome(R: number, t: number, rings: number, perRing: number, wedge: number, mat: number): Node {
  return leaf((px, py, pz) => {
    const r = Math.hypot(px, py, pz), el = Math.asin(Math.max(-1, Math.min(1, py / (r || 1)))), az = Math.atan2(px, pz);
    const ring = (el / (Math.PI / 2)) * (rings + 1.4), ri = Math.floor(ring), fe = ring - ri, ca = az / ((2 * Math.PI) / perRing), fa = ca - Math.round(ca);
    const inCoffer = ri < rings && Math.abs(fe - 0.5) < 0.36 && Math.abs(fa) < 0.36;
    const steps = inCoffer ? (Math.abs(fe - 0.5) < 0.26 && Math.abs(fa) < 0.26 ? 2 : 1) : 0;
    const inner = R - t + steps * t * 0.22;
    return Math.max(r - R, inner - r, Math.abs(az) - wedge, -py) * 0.7;
  }, [-R, 0, -R], [R, R, R], mat);
}
/** An octagonal ribbed dome: eight curved faces rising from a drum, radius `R`, height `H`. */
function octagonDome(y0: number, R: number, H: number, mat: number): Node {
  const step = Math.PI / 4;
  return leaf((px, py, pz) => {
    const a = Math.atan2(pz, px), k = Math.round(a / step) * step, q = px * Math.cos(k) + pz * Math.sin(k), t = (py - y0) / H;
    if (t < 0) return Math.max(q - R, y0 - py);
    const rAt = R * Math.pow(Math.max(0, 1 - Math.min(1, t) ** 1.7), 0.62);
    return Math.max((q - rAt) * 0.6, py - y0 - H);
  }, [-R * 1.09, y0, -R * 1.09], [R * 1.09, y0 + H, R * 1.09], mat);
}
/** A hip-roof corner whose eaves sweep up toward the corner (Chinese imperial roofs): slopes at `pitch`°, `lift` at the corner. */
function upturnedCorner(span: number, pitch: number, lift: number, t: number, mat: number): Node {
  const a = (pitch * Math.PI) / 180, sn = Math.sin(a), cs = Math.cos(a);
  return leaf((px, py, pz) => {
    // the corner is at (+span, +span); slopes fall toward +x and +z from a hip running to the origin
    const ux = px / span, uz = pz / span, near = Math.max(0, Math.min(ux, uz)), yy = py - lift * Math.pow(Math.max(0, Math.max(ux, uz) - 0.35) / 0.65, 2.2) * (0.45 + 0.55 * near);
    const top = Math.max((yy - span * Math.tan(a)) * cs + px * sn, (yy - span * Math.tan(a)) * cs + pz * sn);
    return Math.max(top, -top - t, -px, -pz, px - span, pz - span) * 0.72;
  }, [0, -0.5, 0], [span, span * Math.tan(a) + lift + 0.5, span], mat);
}
/** A stepped Art Deco setback crown: nested arches on the front, each pierced by triangular windows. */
function decoArches(w: number, y0: number, steps: number, d: number, steel: number, glass: number, b: SceneBuilder) {
  for (let k = 0; k < steps; k++) {
    const r = (w / 2) * (1 - k * 0.16), yc = y0 + k * w * 0.16, z0 = -d / 2 + k * 0.4, z1 = d / 2 - k * 0.4;
    b.add(cut(cylZ(0, yc, z0, z1, r, steel), [boxAt(-r - 1, yc - r - 1, z0 - 1, r + 1, yc, z1 + 1, 0), cylZ(0, yc, z0 - 1, z1 + 1, r - 0.35, 0)]));
    // triangular windows round the arch
    const n = 7 - k;
    for (let i = 0; i < n; i++) { const ang = Math.PI * (0.12 + (0.76 * i) / Math.max(1, n - 1)), cx = Math.cos(ang) * (r - 0.18), cy = yc + Math.sin(ang) * (r - 0.18); b.add(spire(cx, z1 + 0.01, cy - 0.15, cy + 0.15, 0.09, 4, glass, 0, Math.PI / 4)); }
  }
}

// ---- The modules ----------------------------------------------------------------------------------------------------------

const stylobate = (b: SceneBuilder, w: number, d: number, mat: SurfaceSpec, steps = 2, rise = 0.18) => { for (let i = 0; i < steps; i++) b.add(boxAt(-w / 2 + i * 0.25, i * rise, -d / 2 + i * 0.25, w / 2 - i * 0.25, (i + 1) * rise, d / 2 - i * 0.25, b.mat(mat), b.r())); return steps * rise; };

const E: ModuleEntry[] = [];
const add = (e: ModuleEntry) => { E.push(e); };

// Classical
add({ id: "doric-column", label: "Doric column", group: "classical", inspiration: ["Parthenon, Athens"], materials: ["Pentelic marble"], view: { yaw: 22, eye: 0.55 },
  note: "No base: twenty shallow flutes meeting in sharp arrises rise from the stylobate, with a slight swelling (entasis), to a cushion-like echinus and a square abacus; about 5½ lower diameters tall.",
  build: b => { const m = b.mat(M.oldMarble), y = stylobate(b, 2.2, 2.2, M.oldMarble); const D = 0.9; b.add(flutedShaft(0, 0, y, y + D * 5.2, D / 2, D * 0.39, 20, 0.035, m), revolve(0, 0, y + D * 5.2, y + D * 5.2 + 0.28, t => D * 0.39 + 0.17 * Math.sin(t * Math.PI * 0.55) ** 0.8, 0.62, m, 0, 2), boxAt(-0.6, y + D * 5.2 + 0.28, -0.6, 0.6, y + D * 5.2 + 0.46, 0.6, m)); } });
add({ id: "ionic-column", label: "Ionic column", group: "classical", inspiration: ["Erechtheion, Athens", "Villa Rotonda, Vicenza"], materials: ["marble"], view: { yaw: 18, eye: 0.6 },
  note: "An Attic base of two tori, twenty-four flutes separated by fillets, and a capital of two spiral volutes joined by a cushion; about 9 diameters tall.",
  build: b => { const m = b.mat(M.marble), D = 0.6, y = stylobate(b, 1.6, 1.6, M.marble, 1); b.add(revolve(0, 0, y, y + 0.25, t => D * 0.62 - 0.06 * Math.sin(t * Math.PI * 2) ** 2, D * 0.65, m, 0, 3), flutedShaft(0, 0, y + 0.25, y + 0.25 + D * 8, D / 2, D * 0.42, 24, 0.022, m));
    const yc = y + 0.25 + D * 8; b.add(cylX(yc + 0.1, 0, -0.45, 0.45, 0.17, m)); for (const s of [-1, 1]) b.add(volute(s * 0.42, yc + 0.02, -0.28, 0.28, 0.24, 2.5, m)); b.add(boxAt(-0.5, yc + 0.27, -0.5, 0.5, yc + 0.37, 0.5, m)); } });
add({ id: "corinthian-column", label: "Corinthian column", group: "classical", inspiration: ["Pantheon portico, Rome"], materials: ["marble"], view: { yaw: 25, eye: 0.7 },
  note: "A bell-shaped capital wrapped in two rows of acanthus leaves, with small corner volutes under a concave abacus; about 10 diameters tall.",
  build: b => { const m = b.mat(M.marble), D = 0.6, y = stylobate(b, 1.6, 1.6, M.marble, 1), ys = y + 0.25 + D * 8.4; b.add(revolve(0, 0, y, y + 0.25, t => D * 0.62 - 0.06 * Math.sin(t * Math.PI * 2) ** 2, D * 0.65, m, 0, 3), flutedShaft(0, 0, y + 0.25, ys, D / 2, D * 0.42, 24, 0.022, m));
    b.add(revolve(0, 0, ys, ys + 0.62, t => D * 0.42 + 0.18 * t ** 1.6, 0.62, m, 0, 1));
    for (const [row, h, out] of [[0, 0.3, 0.12], [1, 0.48, 0.16]] as const) b.add(repeatAround(clump(D * 0.42 + out * 0.5, ys + h * 0.5, 0, 0.09, h * 0.5, 0.11, m, 0.3 + row, 0.25), 0, 0, 8, D * 0.42 + 0.3));
    for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + (k * Math.PI) / 2; b.add(sphere(Math.cos(a) * 0.48, ys + 0.62, Math.sin(a) * 0.48, 0.07, m)); }
    b.add(cut(boxAt(-0.55, ys + 0.62, -0.55, 0.55, ys + 0.74, 0.55, m), [cylY(0, 0.95, ys, ys + 1, 0.45, 0), cylY(0, -0.95, ys, ys + 1, 0.45, 0), cylY(0.95, 0, ys, ys + 1, 0.45, 0), cylY(-0.95, 0, ys, ys + 1, 0.45, 0)])); } });
add({ id: "coffered-dome", label: "Coffered dome segment", group: "classical", inspiration: ["Pantheon, Rome"], materials: ["Roman concrete", "stucco coffers"], view: { yaw: 0, eye: 0.25 },
  note: "Five rings of 28 coffers, each stepped back in two recesses and shrinking toward the oculus; seen from inside the shell.",
  build: b => { b.add(cofferedDome(5, 0.7, 5, 28, 0.85, b.mat({ kind: "travertine", colour: "#d9ccb0" }))); b.place({ yaw: 180 }); } });
add({ id: "pediment", label: "Weathered triangular pediment", group: "classical", inspiration: ["Parthenon, Athens", "Pantheon portico"], materials: ["weathered limestone"], view: { yaw: 12, eye: 0.6 },
  note: "A low triangle (about 12–15°) framed by raking and horizontal cornices over a row of dentils; acroteria at the apex and corners.",
  build: b => { const m = b.mat(M.limestone), W = 9, y0 = 0.9; b.add(boxAt(-W / 2, 0, -0.6, W / 2, y0 - 0.3, 0.6, m), boxAt(-W / 2 - 0.2, y0 - 0.3, -0.7, W / 2 + 0.2, y0, 0.75, m), repeatX(boxAt(-W / 2 + 0.1, y0 - 0.48, 0.6, -W / 2 + 0.22, y0 - 0.32, 0.7, m), 0.22, Math.floor(W / 0.22)));
    b.add(gableWall({ x0: -W / 2, x1: W / 2, z0: -0.6, z1: 0.45, y: y0, pitch: 14, ridge: "z" }, m), gableRoof({ x0: -W / 2, x1: W / 2, z0: -0.7, z1: 0.75, y: y0, pitch: 14, over: 0.25, t: 0.22, ridge: "z" }, m));
    const top = y0 + (W / 2) * Math.tan((14 * Math.PI) / 180); b.add(sphere(0, top + 0.45, 0.4, 0.28, m), sphere(-W / 2, y0 + 0.4, 0.4, 0.22, m), sphere(W / 2, y0 + 0.4, 0.4, 0.22, m)); } });

// Gothic
add({ id: "lancet-portal", label: "Lancet portal in orders", group: "gothic", inspiration: ["Chartres Cathedral"], materials: ["weathered granite"], view: { yaw: 18, eye: 0.45 },
  note: "Equilateral pointed arches stepping back in orders, each carried on a slender colonnette with a capital.",
  build: b => { const m = b.mat(M.granite), cuts: Node[] = []; for (let k = 0; k < 4; k++) cuts.push(opening(0, 0, 2.4 - k * 0.0 + (3 - k) * 0.42, 3.2, "pointed", 0.3 - k * 0.35, 1.5, "z"));
    b.add(cut(boxAt(-3, 0, -1, 3, 7.8, 0.9, m), cuts)); for (let k = 0; k < 3; k++) for (const s of [-1, 1]) { const x = s * (1.2 + (3 - k) * 0.21 + 0.02), z = 0.3 - k * 0.35 + 0.1; b.add(cylY(x, z, 0, 3.2, 0.07, m), boxAt(x - 0.12, 3.2, z - 0.12, x + 0.12, 3.38, z + 0.12, m)); }
    b.add(boxAt(-1.25, 0, -0.85, 1.25, 3.0, -0.75, b.mat({ kind: "boards", colour: "#4a3424" }))); } });
add({ id: "tracery-window", label: "Lancet window with tracery", group: "gothic", inspiration: ["Notre-Dame de Paris"], materials: ["limestone", "leaded stained glass"], view: { yaw: 10, eye: 0.5 },
  note: "Two lancets under a pointed head, a quatrefoil oculus between them, cut in thin stone bars so most of the wall is glass.",
  build: b => { const m = b.mat(M.limestone), g = b.mat(M.stained); const ws = 2.2, hs = 3.4;
    b.add(cut(boxAt(-1.9, 0, -0.5, 1.9, 7.2, 0.3, m), [opening(0, 0.8, ws * 1.4, hs, "pointed", -0.6, 0.6)]));
    b.add(boxAt(-1.5, 0.8, -0.25, 1.5, 6.6, -0.2, g));
    b.add(cut(boxAt(-1.55, 0.8, -0.2, 1.55, 6.9, 0.05, m), [opening(-0.72, 0.8, 1.15, hs - 0.8, "pointed", -0.5, 0.5), opening(0.72, 0.8, 1.15, hs - 0.8, "pointed", -0.5, 0.5), cylZ(0, 5.55, -0.5, 0.5, 0.6, 0), outsideClip(0, 0.8, ws * 1.4, hs)])); } });
add({ id: "rose-window", label: "Stained-glass rose window", group: "gothic", inspiration: ["Notre-Dame de Paris", "Chartres Cathedral"], materials: ["limestone tracery", "stained glass, lit from behind"], view: { yaw: 6, eye: 0.5 },
  note: "Radiating stone spokes from a central oculus to an outer ring of small circles, glazed in red and blue glass that glows from behind.",
  build: b => { const m = b.mat(M.limestone), g = b.mat({ kind: "stained", emit: 1.6 }), R = 3, yc = 3.6;
    b.add(cut(boxAt(-3.8, 0, -0.6, 3.8, 7.6, 0, m), [cylZ(0, yc, -1, 1, R, 0)]), cylZ(0, yc, -0.42, -0.38, R + 0.02, g));
    b.add(cut(cylZ(0, yc, -0.35, -0.05, R + 0.05, m), [cylZ(0, yc, -1, 1, R - 0.22, 0)]), cut(cylZ(0, yc, -0.35, -0.05, 0.62, m), [cylZ(0, yc, -1, 1, 0.42, 0)]));
    b.add(repeatWheel(boxAt(0.6, yc - 0.05, -0.33, R - 0.2, yc + 0.05, -0.08, m), 0, yc, 16, R), repeatWheel(cut(cylZ(R - 0.62, yc, -0.33, -0.08, 0.36, m), [cylZ(R - 0.62, yc, -1, 1, 0.26, 0)]), 0, yc, 16, R)); } });
add({ id: "flying-buttress", label: "Flying buttress segment", group: "gothic", inspiration: ["Notre-Dame de Paris", "Amiens Cathedral"], materials: ["weathered granite"], view: { yaw: -70, eye: 0.5 },
  note: "A stepped pier weighted by a pinnacle carries a quadrant arch that leans against the clerestory wall, catching the vault's outward thrust.",
  build: b => { const m = b.mat(M.granite); b.add(boxAt(-0.6, 0, 4, 0.6, 9.5, 5.6, m), boxAt(-0.7, 0, 3.8, 0.7, 4, 6.0, m), spire(0, 4.8, 9.5, 13.5, 0.55, 4, m, 0, Math.PI / 4), boxAt(-0.9, 0, -0.8, 0.9, 15, 0, m));
    b.add(cut(boxAt(-0.28, 7.2, 0, 0.28, 12.6, 4, m), [{ lo: [-1, 0, -1], hi: [1, 20, 6], f: (_x: number, y: number, z: number) => Math.hypot(z, y - 7.0) - 3.9 }, { lo: [-1, 0, -1], hi: [1, 20, 6], f: (_x: number, y: number, z: number) => -(((z) * 0.62 + (y - 13.2) * 1) / 1.18) }])); } });
add({ id: "gargoyle", label: "Gargoyle downspout", group: "gothic", inspiration: ["Notre-Dame de Paris", "Mont-Saint-Michel"], materials: ["carved limestone", "lead gutter"], view: { yaw: 55, eye: 0.6 },
  note: "A horned beast leaning out from the parapet, its open mouth the end of the gutter, throwing rainwater clear of the wall.",
  build: b => { const m = b.mat({ kind: "ashlar", colour: "#b8ae9c", course: 0.4, age: 0.9, moss: 0.4 }); b.add(boxAt(-1.4, 0, -1.2, 1.4, 2.6, 0, m), boxAt(-1.6, 2.6, -1.3, 1.6, 2.9, 0.15, m));
    b.add(capsule(0, 2.2, 0, 0, 2.05, 1.5, 0.36, m), ellipsoid(0, 2.12, 1.85, 0.34, 0.3, 0.38, m), coneY(0.2, 1.95, 2.3, 2.75, 0.07, 0.01, m), coneY(-0.2, 1.95, 2.3, 2.75, 0.07, 0.01, m));
    b.add(cut(ellipsoid(0, 1.98, 2.15, 0.26, 0.16, 0.3, m), [boxAt(-0.3, 1.94, 2.0, 0.3, 2.02, 2.6, 0)]), sphere(0.17, 2.24, 2.08, 0.06, b.mat({ kind: "plain", colour: "#2a2622" })), sphere(-0.17, 2.24, 2.08, 0.06, b.mat({ kind: "plain", colour: "#2a2622" })));
    for (const s of [-1, 1]) b.add(tiltedBoard(s * 0.55, 2.35, 0.7, 0.4, 0.28, 0.05, s * 0.5, m)); for (const s of [-1, 1]) b.add(capsule(s * 0.22, 1.9, 0.9, s * 0.25, 1.4, 0.95, 0.09, m)); } });

// Renaissance and Baroque
add({ id: "octagonal-dome", label: "Octagonal ribbed dome", group: "renaissance", inspiration: ["Florence Cathedral"], materials: ["terracotta tiles", "white marble ribs", "marble lantern"], view: { yaw: 22, eye: 0.62 },
  note: "Eight curved faces of red tiles between eight white marble ribs on an octagonal drum with round windows, crowned by a marble lantern.",
  build: b => { const st = b.mat({ kind: "marble", colour: "#e6e0d2" }), drum = 3.2;
    b.add(cut(leaf((px, py, pz) => { const s = Math.PI / 4, a = Math.atan2(pz, px), k = Math.round(a / s) * s; return Math.max(px * Math.cos(k) + pz * Math.sin(k) - 4.6, -py, py - drum); }, [-5, 0, -5], [5, drum, 5], st), [repeatAround(cylZ(4.6, drum * 0.55, -0.4, 0.4, 0.45, 0), 0, 0, 8, 5.2)]));
    b.add(octagonDome(drum, 4.5, 6.2, b.mat(M.terracotta)));
    for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4 + Math.PI / 8 - Math.PI / 8, pts = [0, 0.25, 0.5, 0.72, 0.88, 1].map(t => { const r = 4.55 * Math.pow(Math.max(0, 1 - t ** 1.7), 0.62) / Math.cos(Math.PI / 8); return [Math.cos(a + Math.PI / 8) * r, drum + t * 6.2, Math.sin(a + Math.PI / 8) * r] as const; }); for (let i = 1; i < pts.length; i++) b.add(capsule(...pts[i - 1], ...pts[i], 0.14, st)); }
    b.add(cylY(0, 0, drum + 6.0, drum + 7.6, 0.9, st), coneY(0, 0, drum + 7.6, drum + 9, 1.0, 0.1, st), sphere(0, drum + 9.2, 0, 0.25, b.mat(M.gold))); } });
add({ id: "travertine-scroll", label: "Travertine volute console", group: "renaissance", inspiration: ["Roman Baroque churches"], materials: ["travertine"], view: { yaw: 70, eye: 0.55 },
  note: "An S-shaped scroll: a large volute at the top and a small one at the foot, joined by a curved band, with spiral grooves on both faces.",
  build: b => { const m = b.mat(M.travertine); b.add(volute(0, 3.2, -0.35, 0.35, 0.75, 2.2, m), volute(1.25, 0.45, -0.3, 0.3, 0.45, 1.6, m), boxAt(-0.2, 0, -0.5, 1.9, 0.12, 0.5, m));
    b.add(leaf((x, y, z) => { const ax = 0, ay = 3.2, bx = 1.25, by = 0.45, ex = bx - ax, ey = by - ay, L = Math.hypot(ex, ey), t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / (L * L))), cx = ax + ex * t + Math.sin(t * Math.PI) * 0.45, cy = ay + ey * t; return Math.max(Math.hypot(x - cx, y - cy) - (0.42 - 0.18 * t), Math.abs(z) - 0.3); }, [-0.8, 0, -0.35], [2.2, 4, 0.35], m)); } });
add({ id: "gilded-balcony", label: "Gilded wrought-iron balcony", group: "renaissance", inspiration: ["Palace of Versailles"], materials: ["wrought iron", "gold leaf", "stone consoles"], view: { yaw: 25, eye: 0.7 },
  note: "A stone slab on scrolled consoles carries a railing of iron scrolls and rings, picked out in gold at the rosettes and the rail.",
  build: b => { const st = b.mat(M.limestone), ir = b.mat(M.iron), au = b.mat(M.gold); b.add(boxAt(-2.4, 0, -1.2, 2.4, 2.2, 0, st), boxAt(-2, 2.2, -0.2, 2, 2.42, 1.1, st));
    for (const x of [-1.5, 0, 1.5]) b.add(volute(x, 1.85, 0.0, 0.0001 + 0.28, 0.3, 1.5, st));
    b.add(boxAt(-1.95, 3.35, 0.95, 1.95, 3.42, 1.05, au), repeatX(cylY(-1.85, 1.0, 2.42, 3.35, 0.018, ir), 0.185, 21));
    b.add(repeatX(cut(cylZ(-1.67, 2.9, 0.98, 1.02, 0.17, ir), [cylZ(-1.67, 2.9, 0.9, 1.1, 0.14, 0)]), 0.37, 10), repeatX(sphere(-1.67, 2.9, 1.0, 0.045, au), 0.37, 10)); } });
add({ id: "palace-window", label: "Arched palace casement window", group: "renaissance", inspiration: ["Schönbrunn Palace", "Palace of Versailles"], materials: ["ochre stucco", "white stone surround", "painted casements"], view: { yaw: 14, eye: 0.5 },
  note: "A tall round-headed casement in a stone surround with a keystone and a segmental hood, a balustered apron below, on Schönbrunn yellow.",
  build: b => { const wall = b.mat({ kind: "plaster", colour: "#e6c46a", flake: 0.05, under: "brick" }), wp = windowParts(b, 0, 1.2, 0.3, { w: 1.6, h: 3.6, shape: "round", panes: [2, 6], surround: { kind: "ashlar", colour: "#efe9dc" }, hood: "pediment", frame: { kind: "painted-wood", colour: "#efeee8" } }, 0.6);
    b.add(cut(boxAt(-2.2, 0, -0.3, 2.2, 6.4, 0.3, wall), [wp.cutter]), ...wp.parts, repeatX(revolve(-0.8, 0.42, 0.25, 1.05, t => 0.07 + 0.05 * Math.sin(t * Math.PI * 1.6) ** 2, 0.12, b.mat({ kind: "ashlar", colour: "#efe9dc" }), 0, 1), 0.32, 6)); } });

// Chinese imperial and vernacular
add({ id: "dougong", label: "Dougong bracket set", group: "chinese", inspiration: ["Forbidden City, Hall of Supreme Harmony"], materials: ["timber", "mineral-pigment polychrome (caihua)"], view: { yaw: 35, eye: 0.55 },
  note: "A cap block (ludou) on the column carries crossing arms (gong) in tiers, each tipped with small bearing blocks (sheng), and a slanting cantilever (ang) reaching out under the eave purlin.",
  build: b => { const p = b.mat(M.poly), red = b.mat(M.red), blk = b.mat({ kind: "polychrome", colour: "#9b2f22", unit: 0.3 });
    b.add(cylY(0, 0, 0, 2.2, 0.3, red), boxAt(-2.4, 2.2, -0.2, 2.4, 2.55, 0.2, p), boxAt(-0.45, 2.55, -0.45, 0.45, 2.9, 0.45, blk));
    // three tiers of arms (gong) crossing at right angles, each longer than the one below, each arm tipped by a bearing block (sheng)
    for (let k = 0; k < 3; k++) { const y = 2.9 + k * 0.3, L = 0.55 + k * 0.38, t = 0.13;
      b.add(boxAt(-L, y, -t, L, y + 0.22, t, p), boxAt(-t, y, -L, t, y + 0.22, L, p));
      for (const sx of [-1, 1]) { b.add(boxAt(sx * L - 0.17, y + 0.22, -0.17, sx * L + 0.17, y + 0.3, 0.17, blk), boxAt(-0.17, y + 0.22, sx * L - 0.17, 0.17, y + 0.3, sx * L + 0.17, blk)); } }
    // the eave purlin and its plate carried on top
    b.add(boxAt(-2.4, 3.8, -0.22, 2.4, 4.05, 0.22, p), cylX(4.25, 0, -2.4, 2.4, 0.2, red)); } });
add({ id: "upturned-eave", label: "Upturned eave corner with ridge beasts", group: "chinese", inspiration: ["Forbidden City"], materials: ["glazed yellow tiles", "polychrome eaves", "glazed ridge beasts"], view: { yaw: 45, eye: 0.55 },
  note: "Eaves sweep up toward the corner; yellow glazed tube tiles run down the slopes; along the hip ridge a rider leads a file of beasts, more for a more important hall, in odd numbers.",
  build: b => { const tile = b.mat(M.yellowTile), p = b.mat(M.poly), ridge = b.mat({ kind: "glazed-tube", colour: "#c9961f" }), red = b.mat(M.red);
    b.add(upturnedCorner(5, 28, 0.9, 0.3, tile), cylY(1.5, 1.5, -3, 0.05, 0.3, red), boxAt(0, -0.55, 3.4, 4.6, -0.05, 3.7, p), boxAt(3.4, -0.55, 0, 3.7, -0.05, 4.6, p));
    const hip = (t: number) => { const x = 5 * t, top = 5 * Math.tan((28 * Math.PI) / 180) * (1 - t) + 0.9 * Math.pow(Math.max(0, t - 0.35) / 0.65, 2.2); return [x, top + 0.18] as const; };
    for (let i = 0; i < 12; i++) { const [x0, y0] = hip(i / 12), [x1, y1] = hip((i + 1) / 12); b.add(capsule(x0, y0, x0, x1, y1, x1, 0.14, ridge)); }
    for (let i = 0; i < 7; i++) { const [x, y] = hip(0.9 - i * 0.075); b.add(ellipsoid(x, y + 0.2, x, 0.11, 0.13, 0.11, ridge), sphere(x + 0.05, y + 0.36, x + 0.05, 0.07, ridge)); if (i === 0) b.add(coneY(x + 0.03, x + 0.03, y + 0.4, y + 0.6, 0.05, 0.01, ridge)); }
    b.place({ yaw: -45 }); } });
add({ id: "temple-heaven-roof", label: "Triple-eaved round roof", group: "chinese", inspiration: ["Temple of Heaven, Hall of Prayer for Good Harvests"], materials: ["blue glazed tiles", "red lacquered columns", "gilded finial", "white marble terrace"], view: { yaw: 0, eye: 0.55 },
  note: "Three conical eaves of blue glazed tiles (the colour of heaven) over red drums, a gilded finial, on a three-tier white marble terrace.",
  build: b => { const blue = b.mat(M.blueTile), red = b.mat(M.red), p = b.mat(M.poly), mar = b.mat(M.marble);
    for (let i = 0; i < 3; i++) b.add(cylY(0, 0, i * 0.5, (i + 1) * 0.5, 7.2 - i * 1.0, mar));
    let y = 1.5; for (let i = 0; i < 3; i++) { const r = 4.4 - i * 1.1; b.add(cylY(0, 0, y, y + 1.8, r - 0.9, red), cylY(0, 0, y + 1.5, y + 1.85, r - 0.75, p), coneY(0, 0, y + 1.8, y + 3.0, r + 0.6, r - 1.2, blue)); y += 2.6; }
    b.add(coneY(0, 0, y - 0.8, y + 0.8, 1.6, 0.2, blue), sphere(0, y + 1.15, 0, 0.42, b.mat(M.gold)), coneY(0, 0, y + 1.4, y + 2.2, 0.15, 0.01, b.mat(M.gold))); } });
add({ id: "marble-balustrade", label: "Carved white marble balustrade", group: "chinese", inspiration: ["Forbidden City terraces"], materials: ["white marble (hanbaiyu)"], view: { yaw: 28, eye: 0.6 },
  note: "Posts with cloud-carved heads between panels with carved vase-shaped openings, on a plinth with dragon-head drain spouts below each post.",
  build: b => { const m = b.mat(M.marble); b.add(boxAt(-4.6, 0, -0.8, 4.6, 1.2, 0.6, m));
    for (let i = 0; i < 5; i++) { const x = -4 + i * 2; b.add(boxAt(x - 0.14, 1.2, -0.14, x + 0.14, 2.6, 0.14, m), revolve(x, 0, 2.6, 3.0, t => 0.17 * Math.sin(0.4 + t * 2.4) + 0.02, 0.2, m, 0, 2), ellipsoid(x, 0.9, 0.85, 0.12, 0.12, 0.35, m)); if (i < 4) b.add(cut(boxAt(x + 0.14, 1.35, -0.08, x + 1.86, 2.3, 0.08, m), [opening(x + 1, 1.55, 0.7, 0.35, "round", -0.2, 0.2), opening(x + 1, 1.98, 1.2, 0.12, "flat", -0.2, 0.2)]), boxAt(x + 0.14, 2.3, -0.1, x + 1.86, 2.42, 0.1, m)); } } });
add({ id: "moon-gate", label: "Moon gate in a garden wall", group: "chinese", inspiration: ["Classical Gardens of Suzhou"], materials: ["weathered grey brick", "stone ring", "grey roof tiles"], view: { yaw: 18, eye: 0.42 },
  note: "A circular opening in a whitewashed or grey-brick garden wall, ringed in stone, under a little tiled coping; it frames the garden beyond as a picture.",
  build: b => { const br = b.mat(M.greyBrick), st = b.mat({ kind: "ashlar", colour: "#b6b2a8", course: 0.3 }); b.add(cut(boxAt(-4.5, 0, -0.3, 4.5, 3.9, 0.3, br), [cylZ(0, 1.75, -1, 1, 1.45, 0)]), cut(cylZ(0, 1.75, -0.33, 0.33, 1.6, st), [cylZ(0, 1.75, -1, 1, 1.45, 0)]));
    b.add(gableRoof({ x0: -4.7, x1: 4.7, z0: -0.35, z1: 0.35, y: 3.9, pitch: 32, over: 0.3, t: 0.12 }, b.mat(M.greyTile)), boxAt(-4.6, 3.85, -0.32, 4.6, 3.95, 0.32, st));
    b.add(clump(0.9, 0.6, -2.6, 0.8, 0.9, 0.6, b.mat({ kind: "rock", colour: "#8f8a80" }), 0.3, 0.3), clump(-0.8, 1.6, -3.4, 1.1, 1.3, 0.9, b.mat({ kind: "foliage", colour: "#4a6a32" }), 0.4)); } });
add({ id: "lattice-door", label: "Lattice screen door", group: "chinese", inspiration: ["Classical Gardens of Suzhou"], materials: ["lacquered wood lattice", "paper"], view: { yaw: 20, eye: 0.5 },
  note: "A tall frame filled with a fine geometric lattice backed by paper, over a solid lower panel carved with a shallow motif.",
  build: b => { const wd = b.mat(M.lattice), pa = b.mat(M.paper); b.add(boxAt(-0.62, 1.05, -0.03, 0.62, 2.85, -0.01, pa));
    b.add(cut(boxAt(-0.75, 0, -0.06, 0.75, 3.0, 0.08, wd), [boxAt(-0.62, 1.05, -0.2, 0.62, 2.85, 0.2, 0)]), latticePanel(-0.62, 1.05, 0.62, 2.85, 0.03, 0.15, 0.022, 0.05, wd), cut(boxAt(-0.62, 0.15, 0.04, 0.62, 0.95, 0.08, wd), [boxAt(-0.5, 0.27, 0.06, 0.5, 0.83, 0.2, 0)]));
    b.add(boxAt(-0.9, 0, -0.1, -0.75, 3.15, 0.1, wd), boxAt(0.75, 0, -0.1, 0.9, 3.15, 0.1, wd), boxAt(-0.9, 3.0, -0.1, 0.9, 3.15, 0.1, wd)); } });

// European vernacular and craft details
add({ id: "tudor-gable-peak", label: "Tudor half-timbered gable peak", group: "vernacular", inspiration: ["English Tudor houses"], materials: ["green oak frame, pegged mortise and tenon", "lime plaster", "clay tiles", "carved bargeboard"], view: { yaw: 24, eye: 0.55 },
  note: "Close studs as wide as their gaps, pegged into the sole plate and a collar, under a steep tiled gable with a carved bargeboard and finial.",
  build: b => { const fr = b.mat({ ...M.frame, storey: 2.2 }), tile = b.mat(M.clayTile), oak = b.mat(M.oak);
    b.add(boxAt(-2.6, 0, -1.5, 2.6, 2.2, 0.3, fr), gableWall({ x0: -2.6, x1: 2.6, z0: -1.5, z1: 0.3, y: 2.2, pitch: 54, ridge: "z" }, fr), gableRoof({ x0: -2.6, x1: 2.6, z0: -1.5, z1: 0.6, y: 2.2, pitch: 54, over: 0.3, ridge: "z", sag: 0.08 }, tile));
    const top = 2.2 + 2.6 * Math.tan((54 * Math.PI) / 180); for (const s of [-1, 1]) b.add(beam(0, top + 0.1, 0.62, s * 2.9, 2.0, 0.62, 0.12, oak)); b.add(cylY(0, 0.62, top - 0.4, top + 0.7, 0.06, oak), sphere(0, top + 0.75, 0.62, 0.1, oak)); } });
add({ id: "sagging-tile-roof", label: "Sagging handmade tile roof", group: "vernacular", inspiration: ["English and Norman cottages"], materials: ["handmade clay plain tiles", "moss in the laps", "crested ridge tiles"], view: { yaw: 30, eye: 1.05 },
  note: "Tiles at a 100 mm gauge, each fired a little differently; the ridge sags between the gables and moss gathers in the laps on the shaded slope.",
  build: b => { const tile = b.mat(M.clayTile), w = b.mat(M.rubble); b.add(boxAt(-3, 0, -1.6, 3, 1.2, 1.6, w), gableWall({ x0: -3, x1: 3, z0: -1.6, z1: 1.6, y: 1.2, pitch: 48, sag: 0.18 }, w), gableRoof({ x0: -3, x1: 3, z0: -1.6, z1: 1.6, y: 1.2, pitch: 48, over: 0.25, sag: 0.18 }, tile)); } });
add({ id: "sooty-chimney", label: "Soot-stained chimney with ivy", group: "vernacular", inspiration: ["English cottages"], materials: ["handmade brick", "soot", "clay pots", "ivy"], view: { yaw: 30, eye: 0.6 },
  note: "A brick stack corbelled out near its top under clay pots; soot darkens the top courses and runs down; ivy climbs from below.",
  build: b => { const top = 5.4, br = b.mat({ ...M.brick, soot: top - 0.1 }), pot = b.mat({ kind: "plain-tile", colour: "#a2573b", soot: top + 0.7 });
    b.add(boxAt(-0.7, 0, -0.5, 0.7, top, 0.5, br), boxAt(-0.82, top - 0.55, -0.62, 0.82, top - 0.35, 0.62, br), boxAt(-0.76, top - 0.2, -0.56, 0.76, top, 0.56, br));
    for (const x of [-0.35, 0.35]) b.add(coneY(x, 0, top, top + 0.7, 0.2, 0.14, pot)); b.grow({ x: -0.1, z: 0.52, w: 1.8, h: 3.4, axis: "z" }); } });
add({ id: "iron-lantern", label: "Hand-forged street lantern", group: "vernacular", inspiration: ["European old towns"], materials: ["wrought iron", "glass"], view: { yaw: 25, eye: 0.62 },
  note: "A tapering post with a scrolled bracket carries a four-sided glazed lantern under a little pyramid roof and a finial.",
  build: b => { const ir = b.mat(M.iron); b.add(revolve(0, 0, 0, 3.2, t => 0.09 - 0.04 * t + 0.03 * Math.exp(-((t - 0.08) ** 2) * 300), 0.13, ir, 0, 2), boxAt(-0.6, 3.2, -0.04, 0.05, 3.27, 0.04, ir), volute(-0.3, 2.95, -0.02, 0.02, 0.22, 1.5, ir));
    b.add(...lanternParts(b, -0.6, 3.0, 0)); } });
add({ id: "cobble-threshold", label: "Worn threshold and cobbles", group: "vernacular", inspiration: ["European old towns"], materials: ["worn limestone step", "hand-laid cobbles", "oak door"], view: { yaw: 18, eye: 0.85 },
  note: "A limestone step hollowed in the middle by centuries of feet, before an oak door, with domed cobbles in dark grit and moss.",
  build: b => { const st = b.mat({ kind: "ashlar", colour: "#bdb39e", course: 0.3, age: 0.8, moss: 0.3 }), cb = b.mat(M.cobbles);
    b.add(boxAt(-2.4, -0.3, -0.1, 2.4, 0.05, 2.6, cb), cut(boxAt(-0.9, 0, -0.1, 0.9, 0.2, 0.55, st), [ellipsoid(0, 0.24, 0.25, 0.55, 0.06, 0.25, 0)]), cut(boxAt(-1.5, 0, -0.6, 1.5, 3.0, -0.1, b.mat(M.rubble)), [boxAt(-0.62, 0.2, -0.3, 0.62, 2.35, 0.2, 0)]), boxAt(-0.62, 0.2, -0.26, 0.62, 2.35, -0.2, b.mat({ kind: "boards", colour: "#4e3a28", age: 0.7 })), cut(boxAt(-0.85, 0.2, -0.12, 0.85, 2.6, -0.04, st), [boxAt(-0.62, 0.1, -0.3, 0.62, 2.35, 0.2, 0)])); } });

// Art Deco
add({ id: "deco-crown", label: "Stepped stainless crown", group: "deco", inspiration: ["Chrysler Building, New York"], materials: ["stainless steel (Nirosta)", "triangular windows"], view: { yaw: 18, eye: 0.5 },
  note: "Terraced arches stepping back in seven stages, each pierced by triangular windows, rising to a needle; clad in chromium-nickel stainless steel.",
  build: b => { const st = b.mat(M.steel), g = b.mat({ kind: "glass", colour: "#ffd9a0", emit: 0.3 }); b.add(boxAt(-3, 0, -3, 3, 4, 3, b.mat(M.limestone)));
    decoArches(6, 4, 5, 6, st, g, b); b.add(coneY(0, 0, 8.6, 14, 0.5, 0.02, st)); } });
add({ id: "sunburst-relief", label: "Brass sunburst relief", group: "deco", inspiration: ["1920s Paris facades", "Shanghai Bund"], materials: ["brushed brass", "limestone ground"], view: { yaw: 10, eye: 0.5 },
  note: "A half sun with alternating long and short rays and stepped rings, in brushed brass on a limestone panel.",
  build: b => { const br = b.mat(M.brass); b.add(boxAt(-2.6, 0, -0.3, 2.6, 3, 0, b.mat(M.limestone)), cut(cylZ(0, 0.4, 0, 0.12, 0.7, br), [boxAt(-1, -1, -1, 1, 0.4, 1, 0)]));
    for (let k = 0; k < 2; k++) b.add(cut(cylZ(0, 0.4, 0, 0.06, 1.0 + k * 0.25, br), [cylZ(0, 0.4, -1, 1, 0.92 + k * 0.25, 0), boxAt(-3, -1, -1, 3, 0.4, 1, 0)]));
    for (let i = 0; i < 13; i++) { const a = Math.PI * (i / 12), L = i % 2 ? 1.5 : 2.3; b.add(beam(Math.cos(a) * 1.55, 0.4 + Math.sin(a) * 1.55, 0.04, Math.cos(a) * L * 1.0 + Math.cos(a) * 0.2, 0.4 + Math.sin(a) * (L + 0.2), 0.04, i % 2 ? 0.06 : 0.1, br)); } } });
add({ id: "fluted-pier", label: "Fluted stone pier", group: "deco", inspiration: ["Shanghai Bund", "1920s Paris"], materials: ["limestone", "bronze"], view: { yaw: 30, eye: 0.55 },
  note: "A square pier with shallow vertical flutes, a stepped (ziggurat) capital and a bronze band, the Deco answer to a column.",
  build: b => { const m = b.mat({ ...M.limestone, course: 0.6 }); b.add(cut(boxAt(-0.6, 0.4, -0.6, 0.6, 6, 0.6, m), Array.from({ length: 5 }, (_, i) => boxAt(-0.42 + i * 0.21 - 0.05, 0.6, 0.55, -0.42 + i * 0.21 + 0.05, 5.6, 0.7, 0))), boxAt(-0.75, 0, -0.75, 0.75, 0.4, 0.75, m));
    for (let k = 0; k < 3; k++) b.add(boxAt(-0.68 - k * 0.12, 6 + k * 0.22, -0.68 - k * 0.12, 0.68 + k * 0.12, 6.22 + k * 0.22, 0.68 + k * 0.12, m)); b.add(boxAt(-0.62, 5.0, -0.62, 0.62, 5.12, 0.62, b.mat(M.bronze))); } });
add({ id: "deco-transom", label: "Bronze-and-glass transom", group: "deco", inspiration: ["Chrysler Building lobby", "Shanghai Bund"], materials: ["bronze", "glass"], view: { yaw: 8, eye: 0.5 },
  note: "A fanlight of bronze bars in chevrons and a sunburst over the door, set in a stepped limestone frame.",
  build: b => { const bz = b.mat(M.bronze), g = b.mat(M.glass); b.add(cut(boxAt(-2.2, 0, -0.4, 2.2, 4.6, 0, b.mat(M.limestone)), [boxAt(-1.4, 0, -1, 1.4, 4.0, 1, 0)]), boxAt(-1.4, 2.9, -0.32, 1.4, 4.0, -0.28, g), boxAt(-1.4, 0, -0.3, 1.4, 2.9, -0.2, bz));
    for (let i = 0; i < 9; i++) { const x = -1.2 + i * 0.3; b.add(beam(x, 2.95, -0.25, 0, 3.95, -0.25, 0.04, bz)); } b.add(boxAt(-1.4, 2.85, -0.27, 1.4, 2.95, -0.2, bz), boxAt(-1.4, 3.42, -0.27, 1.4, 3.48, -0.2, bz)); } });

// Modernism
add({ id: "pilotis-ribbon", label: "Box on pilotis with ribbon window", group: "modern", inspiration: ["Villa Savoye, Poissy"], materials: ["white rendered concrete", "steel ribbon window"], view: { yaw: 32, eye: 0.45 },
  note: "Le Corbusier's points: the house lifted on slender pilotis, a free facade, and a ribbon window running its whole length.",
  build: b => { const w = b.mat(M.stucco), g = b.mat({ kind: "curtain", unit: 1.2, course: 1.2 }); for (let i = 0; i < 5; i++) for (const z of [-2.6, 2.6]) b.add(cylY(-6 + i * 3, z, 0, 3, 0.13, w));
    b.add(cut(boxAt(-7, 3, -3, 7, 6.2, 3, w), [boxAt(-6.8, 3.9, 2.6, 6.8, 5.1, 3.3, 0)]), boxAt(-6.8, 3.9, 2.75, 6.8, 5.1, 2.8, g), boxAt(-2, 0, -1.6, 2, 2.6, 1.0, b.mat({ kind: "curtain", colour: "#4d5e62", unit: 1, course: 2.6 }))); } });
add({ id: "cantilever-terraces", label: "Cantilevered terraces", group: "modern", inspiration: ["Fallingwater, Pennsylvania"], materials: ["cream concrete slabs", "local sandstone", "red steel window frames"], view: { yaw: 35, eye: 0.6 },
  note: "Horizontal concrete trays cantilever off a vertical core of rough local stone, each with rounded parapet edges, over glass in red-painted steel.",
  build: b => { const c = b.mat({ kind: "plaster", colour: "#e6d9b8", flake: 0.02 }), st = b.mat({ kind: "coursed-rubble", colour: "#a99a7a", moss: 0.2 }), gl = b.mat({ kind: "curtain", colour2: "#8e2a1f", unit: 0.8, course: 2.2 });
    b.add(boxAt(-1.2, 0, -2.5, 1.2, 9.5, 0, st), boxAt(-4, 2.4, -3, 4, 3.2, 3.2, c, 0, 0.15), boxAt(-6.2, 5.2, -2.6, 2.2, 6.0, 2.0, c, 0, 0.15), boxAt(-2.5, 7.8, -3.4, 4.5, 8.5, 0.8, c, 0, 0.15));
    b.add(boxAt(-3.5, 3.2, -2.6, 3.5, 5.2, 2.0, gl), boxAt(-5.5, 6.0, -2.3, 1.8, 7.8, 0.8, gl)); } });
add({ id: "pavilion-planes", label: "Free-standing planes and cruciform columns", group: "modern", inspiration: ["Barcelona Pavilion"], materials: ["travertine plinth", "onyx and marble walls", "chrome cruciform columns", "glass", "a still pool"], view: { yaw: 28, eye: 0.62 },
  note: "A thin flat roof floats on slender chromed cruciform columns; walls of stone and glass stand free beneath it, sliding past each other.",
  build: b => { const tr = b.mat(M.travertine), ch = b.mat(M.steel); b.add(boxAt(-8, 0, -5, 8, 0.6, 5, tr), boxAt(-7, 3.6, -3.6, 5, 3.9, 3.4, b.mat(M.stucco)));
    for (const [x, z] of [[-5, -1.6], [-1, -1.6], [3, -1.6], [-5, 1.8], [-1, 1.8], [3, 1.8]]) b.add(boxAt(x - 0.12, 0.6, z - 0.03, x + 0.12, 3.6, z + 0.03, ch), boxAt(x - 0.03, 0.6, z - 0.12, x + 0.03, 3.6, z + 0.12, ch));
    b.add(boxAt(-6.5, 0.6, -3.3, 0.5, 3.6, -3.1, b.mat({ kind: "marble", colour: "#3d5a48" })), boxAt(-2.5, 0.6, 0.2, 1.5, 3.6, 0.35, b.mat({ kind: "marble", colour: "#c8a86a" })), boxAt(2, 0.6, -2.4, 2.1, 3.6, 2.6, b.mat(M.glass)), boxAt(4, 0.55, 0.5, 7.6, 0.6, 4.6, b.mat({ kind: "water", colour: "#2c3c3c" }))); } });

// Brutalist and Deconstructivist
add({ id: "beton-brut-block", label: "Board-formed concrete block on pilotis", group: "brutalist", inspiration: ["Unité d'Habitation, Marseille"], materials: ["board-formed concrete (béton brut)", "coloured loggia panels"], view: { yaw: 28, eye: 0.5 },
  note: "Raw concrete keeps the grain of the boards it was cast in; a grid of deep loggias (brise-soleil) over massive tapering pilotis; water stains and moss below the ledges.",
  build: b => { const c = b.mat(M.concrete); for (const x of [-4.5, 0, 4.5]) b.add(coneY(x, 0, 0, 3.4, 0.55, 0.85, c));
    const cuts: Node[] = []; for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) cuts.push(boxAt(-6.6 + i * 2.25, 3.9 + j * 2.0, 1.4, -6.6 + i * 2.25 + 1.95, 3.9 + j * 2.0 + 1.75, 2.2, 0));
    b.add(cut(boxAt(-7, 3.4, -2, 7, 10, 2, c), cuts)); for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) b.add(boxAt(-6.5 + i * 2.25, 3.95 + j * 2.0, 1.38, -6.5 + i * 2.25 + 0.5, 3.95 + j * 2.0 + 1.7, 1.42, b.mat({ kind: "painted-wood", colour: ["#c8442a", "#e2b33a", "#3a6a9a", "#5a8a4a"][(i + j) % 4] }))); } });
add({ id: "stacked-boxes", label: "Stacked concrete boxes", group: "brutalist", inspiration: ["Habitat 67, Montreal"], materials: ["precast concrete", "glass"], view: { yaw: 35, eye: 0.55 },
  note: "Prefabricated concrete boxes stacked and offset so each roof is the next home's garden; windows in the open ends.",
  build: b => { const c = b.mat({ ...M.concrete, course: 0.3 }), g = b.mat(M.curtain), boxes: [number, number, number, number][] = [[-3, 0, 0, 0], [2, 0, 1, 1], [-1, 3, -1, 1], [4, 3, 0, 0], [0, 6, 1, 0], [-4, 3, 2, 1], [2, 6, -2, 1]];
    for (const [x, y, z, r] of boxes) { const w = r ? 3 : 5.6, d = r ? 5.6 : 3; b.add(boxAt(x - w / 2, y, z - d / 2, x + w / 2, y + 3, z + d / 2, c), r ? boxAt(x - 1.2, y + 0.5, z + d / 2, x + 1.2, y + 2.6, z + d / 2 + 0.05, g) : boxAt(x + w / 2, y + 0.5, z - 1.1, x + w / 2 + 0.05, y + 2.6, z + 1.1, g)); } } });
add({ id: "titanium-petals", label: "Curving titanium panels", group: "brutalist", inspiration: ["Guggenheim Museum Bilbao"], materials: ["thin titanium shingles", "glass", "limestone"], view: { yaw: 30, eye: 0.55 },
  note: "Free curved volumes skinned in small, very thin titanium panels that pillow slightly and shift in colour with the light.",
  build: b => { const ti = b.mat(M.titanium); b.add(boxAt(-6, 0, -3, 6, 1.4, 3, b.mat({ kind: "travertine", colour: "#d8c9a6" })));
    for (const [x, y, z, rx, ry, rz, cutY] of [[-2.5, 1.4, 0, 3.2, 4.8, 2.2, 1.4], [2.2, 1.4, -0.5, 2.6, 6.4, 2.0, 1.4], [0, 5, 0.5, 3.8, 2.6, 1.8, 4.2], [3.8, 4.5, 1, 1.8, 3.4, 1.3, 3.0]] as const) b.add(cut(ellipsoid(x, y, z, rx, ry, rz, ti), [boxAt(x - rx - 1, y - ry - 1, z - rz - 1, x + rx + 1, cutY, z + rz + 1, 0)]));
    b.add(boxAt(-1.2, 1.4, 1.3, 1.6, 5.2, 1.4, b.mat(M.curtain))); } });
add({ id: "diagrid-tower", label: "Steel diagrid tower fragment", group: "brutalist", inspiration: ["CCTV Headquarters, Beijing"], materials: ["steel diagrid", "glass curtain wall"], view: { yaw: 30, eye: 0.42 },
  note: "Diagonal steel members cross over the glass skin, denser where the forces gather, so the structure shows on the face.",
  build: b => { const st = b.mat({ kind: "steel", colour: "#7f8488" }), g = b.mat({ kind: "curtain", unit: 1.0, course: 1.0 });
    b.add(boxAt(-2.8, 0, -2.8, 2.8, 16, 2.8, g));
    b.add(leaf((x, y, z) => { const sh = Math.max(Math.abs(x), Math.abs(z)) - 3.0, dd = Math.abs(sh) - 0.12; const u = Math.abs(x) > Math.abs(z) ? z : x, P = 2.4 - 0.9 * Math.min(1, y / 16), a = (u + y) / P, c = (u - y) / P; const bars = Math.min(Math.abs(a - Math.round(a)), Math.abs(c - Math.round(c))) * P * 0.7 - 0.09; return Math.max(dd, bars, -y, y - 16) * 0.7; }, [-3.2, 0, -3.2], [3.2, 16, 3.2], st)); } });
add({ id: "twisting-glass", label: "Twisting glass facade fragment", group: "brutalist", inspiration: ["Dancing House, Prague"], materials: ["glass in a steel mesh", "pinched steel columns"], view: { yaw: 22, eye: 0.45 },
  note: "A glass tower pinched at its waist and leaning, as if dancing, standing on splayed columns beside its concrete partner.",
  build: b => { const g = b.mat({ kind: "curtain", unit: 0.9, course: 1.1 }), st = b.mat(M.steel);
    b.add(leaf((x, y, z) => { const t = Math.min(1, Math.max(0, y / 14)), lean = 0.12 * y - 0.6 * Math.sin(t * Math.PI), r = 2.6 - 1.1 * Math.sin(t * Math.PI) ** 1.4 + (t > 0.7 ? 0.5 * (t - 0.7) : 0); return Math.max((Math.hypot(x - lean, z) - r) * 0.8, -y + 2.4, y - 14); }, [-3, 2.4, -3.2], [4.5, 14, 3.2], g));
    for (const [x, z] of [[-1.6, 1.4], [1.6, 1.4], [0, -1.9]]) b.add(capsule(x * 1.1, 0, z * 1.1, x * 0.75, 2.6, z * 0.75, 0.13, st));
    b.add(boxAt(3.6, 0, -2.6, 8, 13, 2.6, b.mat({ kind: "plaster", colour: "#d8cdb6", flake: 0.03 }))); } });

/** A cutter that removes everything outside an arched opening (used to trim tracery to its arch). */
function outsideClip(cx: number, y0: number, w: number, hs: number): Node {
  const o = opening(cx, y0, w, hs - openingTop(w, 0, "pointed"), "pointed", -1, 1);
  return { lo: [cx - w, y0 - 1, -1], hi: [cx + w, y0 + hs + w, 1], f: (x, y, z) => -o.f(x, y, z) };
}
/** All modules. */
export const ARCH_MODULES: readonly ModuleEntry[] = E;
export const findModule = (id: string) => E.find(e => e.id === id);

/** One module alone on a parchment studio cove, framed level at the module's own scale, in studio light. */
export function moduleScene(id: string, seed = 3): ArchScene {
  const e = findModule(id);
  if (!e) throw new Error(`Unknown module ${id}`);
  const b = new SceneBuilder(seed);
  e.build(b); b.place();
  const { lo, hi } = b.subjectBounds(), size = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
  const yaw = e.view?.yaw ?? 25, a = (yaw * Math.PI) / 180, nx = Math.sin(a), nz = Math.cos(a), cx = (lo[0] + hi[0]) / 2, cz = (lo[2] + hi[2]) / 2, D = size * 0.9 + 2;
  const cam = studioCamera(b, yaw, lo[1] + (hi[1] - lo[1]) * (e.view?.eye ?? 0.55), e.view?.pad ?? 0.16);
  // the cove: a floor that curves up into a wall behind the module, facing the camera
  const k = Math.max(2, size * 0.6), paper = b.mat({ kind: "parchment" });
  b.add(leaf((x, y, z) => { const dw = (x - cx) * nx + (z - cz) * nz + D, h = Math.max(k - Math.abs(y - dw), 0) / k; return Math.min(y, dw) - h * h * k * 0.25; }, [-1e4, -1, -1e4], [1e4, 1e4, 1e4], paper));
  b.place();
  return b.scene(cam, "studio", { far: size * 30 + 200 });
}
function studioCamera(b: SceneBuilder, yaw: number, eye: number, pad: number): CameraSpec {
  const { lo, hi } = b.subjectBounds(), a = (yaw * Math.PI) / 180, fov = 34, tanH = Math.tan((fov * Math.PI) / 360), tanV = tanH * (9 / 16), tx = (lo[0] + hi[0]) / 2, tz = (lo[2] + hi[2]) / 2;
  const fx = -Math.sin(a), fz = -Math.cos(a), rx = Math.cos(a), rz = -Math.sin(a);
  const fit = (d: number): number | null => {
    const cx = tx + Math.sin(a) * d, cz = tz + Math.cos(a) * d; let v0 = 1e9, v1 = -1e9;
    for (const X of [lo[0], hi[0]]) for (const Y of [Math.max(0, lo[1]), hi[1]]) for (const Z of [lo[2], hi[2]]) {
      const qx = X - cx, qz = Z - cz, depth = qx * fx + qz * fz;
      if (depth < 0.3 || Math.abs((qx * rx + qz * rz) / depth) > tanH * (1 - pad)) return null;
      const vy = (Y - eye) / depth; v0 = Math.min(v0, vy); v1 = Math.max(v1, vy);
    }
    return v1 - v0 > 2 * tanV * (1 - pad) ? null : (v0 + v1) / 2;
  };
  let d = 1, c = fit(d);
  while (c === null && d < 5000) { d *= 1.05; c = fit(d); }
  return { x: tx + Math.sin(a) * d, y: eye, z: tz + Math.cos(a) * d, yaw: -yaw, fov, shift: (c ?? 0) / tanV };
}
