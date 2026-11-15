/**
 * "Why every clock agrees" — an original six-shot editorial-collage explainer for the COLLAGE1 engine.
 *
 * App fixture, not library code. Facts used: towns kept local solar time; North American railroads moved
 * to standard time zones on 18 November 1883; the 1884 International Meridian Conference adopted the
 * Greenwich meridian. No invented statistics. The newspaper is fictional and set in our own words.
 */
import type { CollageNode, CollageSceneSpec } from "../../registry/video/collage/collage-scene";
import type { CollagePuppetLook } from "../../registry/video/collage/collage-puppet";
import { polylineLength, routePolyline, textLayout } from "../../registry/video/collage/collage-build";
import { building, clipping, clock, cloud, coverSheet, locomotive, mapPin, pushPin, speechBubble, stamp, sun } from "../../registry/video/collage/collage-kit";

export type CollageAspect = "landscape" | "portrait";
export const COLLAGE_FPS = 30;

export const PALETTE = {
  ink: "#1d1b19", cream: "#f2e9d6", paper: "#f8f4ea", red: "#cf3b2a", mustard: "#e2a62b", teal: "#2c6e86", navy: "#24384f",
  yellow: "#f7d43a", sage: "#8ea885", pink: "#e8a094", sky: "#a9cbd2", brick: "#9d4a32", slate: "#3d3b4a",
} as const;

/** Recurring cast: the same paper puppets in every shot they appear in. */
export const CAST: Record<"conductor" | "traveller" | "delegate", CollagePuppetLook> = {
  conductor: { skin: "#c98d6a", hair: "ink", top: "navy", bottom: "#1f2a3a", shoes: "ink", accent: "red", hairStyle: "cap", topStyle: "coat", brads: true },
  traveller: { skin: "#e2b08c", hair: "#5a2e1a", top: "mustard", bottom: "#3a2f2a", shoes: "#5a3020", accent: "red", hairStyle: "bun", topStyle: "coat", accessory: "scarf" },
  delegate: { skin: "#a8724e", hair: "#b9b6ae", top: "slate", bottom: "slate", shoes: "ink", accent: "red", hairStyle: "short", topStyle: "shirt", accessory: "tie", build: .75 },
};

const size = (aspect: CollageAspect) => aspect === "landscape" ? { W: 1920, H: 1080 } : { W: 1080, H: 1920 };
const base = (id: string, aspect: CollageAspect, durationFrames: number, seed: number, extra: Partial<CollageSceneSpec>): Omit<CollageSceneSpec, "nodes"> => ({
  version: 1, id: id + "-" + aspect, width: size(aspect).W, height: size(aspect).H, durationFrames, seed, palette: PALETTE, cadence: 2, boil: .5, grain: .38, drift: 1.6,
  board: { material: "kraft" }, ...extra,
});

/** One caption per shot, on a paper slip, fixed to the frame (depth 0) and inside the lower safe band. */
function caption(id: string, aspect: CollageAspect, text: string, frame: number, until?: number): CollageNode {
  const { W, H } = size(aspect), landscape = aspect === "landscape";
  return {
    id, kind: "text", depth: 0, x: landscape ? 96 : 72, y: landscape ? H - 104 : H - 230, text, role: "body", size: landscape ? 46 : 52, weight: 650,
    color: "ink", maxWidth: landscape ? 1180 : W - 160, lineHeight: 1.18,
    slip: { fill: "paper", padding: 18, edge: "cut", jitter: .5 }, enter: { preset: "slide", frame, duration: 12, from: "left", distance: 700 },
    exit: until !== undefined ? { preset: "fade", frame: until, duration: 8 } : undefined,
  };
}
/** Small kicker label on black tape. */
function kicker(id: string, x: number, y: number, text: string, frame: number, extra: Partial<CollageNode> = {}): CollageNode {
  return { id, kind: "text", x, y, text, role: "label", size: 28, weight: 700, letterSpacing: 3, color: "cream", uppercase: true,
    slip: { fill: "ink", padding: 13, edge: "cut", jitter: .4 }, enter: { preset: "slide", frame, duration: 12, from: "left", distance: 900 }, ...extra } as CollageNode;
}

// ---- 1. Cold open ---------------------------------------------------------------------------------------------------------------

export function shotColdOpen(aspect: CollageAspect): CollageSceneSpec {
  const { W, H } = size(aspect), L = aspect === "landscape";
  const sheetW = L ? 1340 : 900, sheetH = L ? 780 : 1260, hs = L ? 150 : 128;
  const left = -sheetW / 2 + (L ? 90 : 70);
  const head2: CollageNode = { id: "head-2", kind: "text", parent: "sheet", x: left, y: L ? 100 : 30, text: L ? "KEPT ITS OWN NOON" : "KEPT ITS\nOWN NOON", role: "headline", size: hs, color: "cream", lineHeight: 1.2,
    slip: { fill: "red", perWord: true, padding: 16, edge: "torn", jitter: 2 }, reveal: { by: "word", frame: 50, stagger: 6, preset: "stamp" } };
  const noonWord = textLayout(head2 as Parameters<typeof textLayout>[0]).lines.flatMap(line => line.words.map(w => ({ ...w, y: line.y }))).find(w => w.text === "NOON")!;
  const noon = { x: left + noonWord.x + noonWord.width / 2, y: (L ? 100 : 30) + noonWord.y - hs * .36, w: noonWord.width };
  return {
    ...base("cold-open", aspect, 150, 7, { camera: [{ frame: 0, x: W / 2, y: H / 2, zoom: 1.02 }, { frame: 149, x: W / 2 + 12, y: H / 2 + 6, zoom: 1.07, ease: "linear" }] }),
    nodes: [
      { id: "sheet", kind: "cutout", x: W / 2, y: H / 2, rotate: -1.3, shape: { type: "rect", width: sheetW, height: sheetH }, fill: "cream", edge: "torn", roughness: 4.2,
        pattern: { type: "lines", color: "#b9c7cc", spacing: 44, opacity: .35 }, enter: { preset: "drop", frame: 0, duration: 14 } },
      ...sun("sun", { parent: "sheet", x: L ? 430 : 250, y: L ? -200 : -420, radius: L ? 120 : 110, enter: { preset: "pop", frame: 24, duration: 14 } }),
      ...clock("clock", { parent: "sheet", x: L ? 500 : -250, y: L ? 262 : 430, radius: L ? 120 : 130, rotate: 6, enter: { preset: "drop", frame: 40, duration: 12 },
        time: [{ frame: 0, hours: 11.6 }, { frame: 110, hours: 12, ease: "back" }] }),
      kicker("kicker", left, L ? -268 : -470, "A short history of standard time", 10, { parent: "sheet" }),
      { id: "head-1", kind: "text", parent: "sheet", x: left, y: L ? -80 : -330, text: L ? "WHEN EVERY TOWN" : "WHEN EVERY\nTOWN", role: "headline", size: hs, color: "ink", lineHeight: 1.2,
        slip: { fill: "paper", perWord: true, padding: 16, edge: "cut", jitter: 1.8 }, reveal: { by: "word", frame: 28, stagger: 6, preset: "drop" } },
      head2,
      // The circle is placed from the measured word box, so it rings "NOON" in any layout.
      { id: "circle", kind: "marker", parent: "sheet", x: noon.x, y: noon.y, stroke: { type: "circle", width: noon.w + 90, height: hs * 1.25 }, color: "ink", width: 7, enter: { preset: "draw", frame: 88, duration: 18 } },
      { id: "under", kind: "marker", parent: "sheet", x: left - 6, y: L ? 168 : 252, stroke: { type: "underline", width: L ? 360 : 300 }, color: "yellow", width: 24, tool: "highlighter", enter: { preset: "draw", frame: 104, duration: 12 } },
      { id: "tape-a", kind: "tape", x: W / 2 - sheetW / 2 + 40, y: H / 2 - sheetH / 2 + 26, rotate: -38, length: 170, width: 42, enter: { preset: "stamp", frame: 12, duration: 7 } },
      { id: "tape-b", kind: "tape", x: W / 2 + sheetW / 2 - 30, y: H / 2 + sheetH / 2 - 24, rotate: -34, length: 170, width: 42, enter: { preset: "stamp", frame: 16, duration: 7 } },
      coverSheet("cover", { width: W, height: H, fill: "teal", frame: 136, duration: 14, mode: "in", from: "right" }),
    ],
    bumps: [{ frame: 50, amount: .5 }, { frame: 62, amount: .4 }],
  };
}

// ---- 2. Noon by the sun ---------------------------------------------------------------------------------------------------------

export function shotLocalNoon(aspect: CollageAspect): CollageSceneSpec {
  const { W, H } = size(aspect), L = aspect === "landscape";
  const ground = L ? 820 : 1260, span = L ? 1400 : 700, x0 = W / 2 - span / 2;
  const towns = [0, .5, 1].map(t => x0 + span * t);
  const types = ["church", "tower", "house"] as const;
  // The sun travels one bowed arc; the frame it passes over each town is measured from that same path,
  // and that is the frame the town's clock reaches noon.
  const arcFrom: [number, number] = [x0 - (L ? 300 : 160), ground - 40], arcTo: [number, number] = [x0 + span + (L ? 300 : 160), ground - 40];
  const peak = L ? 150 : 420, arcLen = arcTo[0] - arcFrom[0];
  const arcRoute: CollageNode = { id: "arc", kind: "route", points: [arcFrom, arcTo], arc: (ground - 40 - peak) / arcLen, color: "#f7f2e6", width: 4, dash: [2, 16],
    enter: { preset: "draw", frame: 8, duration: 40 }, depth: .9 };
  const sunStart = 20, sunEnd = 220;
  const path = routePolyline(arcRoute as Parameters<typeof routePolyline>[0]), total = polylineLength(path);
  const passes = towns.map(x => {
    let walked = 0;
    for (let k = 1; k < path.length; k++) {
      walked += Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]);
      if (path[k][0] >= x) return Math.round(sunStart + (sunEnd - sunStart) * walked / total);
    }
    return sunEnd;
  });
  const nodes: CollageNode[] = [
    coverSheet("cover", { width: W, height: H, fill: "teal", frame: 0, duration: 14, mode: "out", from: "left" }),
    { id: "sky", kind: "cutout", x: W / 2, y: (ground + 60) / 2 - 40, shape: { type: "rect", width: W * 1.2, height: ground + 220 }, fill: "sky", edge: "torn", roughness: 5, depth: .9,
      halftone: { color: "#7fb0bc", toward: 90, from: .25, to: 0, cell: 12, opacity: .7 } },
    ...cloud("cloud-a", { x: L ? 380 : 220, y: L ? 210 : 480, width: 220, depth: .85 }),
    ...cloud("cloud-b", { x: L ? 1540 : 860, y: L ? 300 : 700, width: 180, depth: .85 }),
    arcRoute,
    ...sun("sun", { x: arcFrom[0], y: arcFrom[1], radius: L ? 64 : 56, follow: { path: "arc", start: sunStart, end: sunEnd, ease: "linear" }, depth: .9 }),
    { id: "hill", kind: "cutout", x: W / 2, y: ground + (L ? 200 : 380), shape: { type: "rect", width: W * 1.15, height: L ? 440 : 800, radius: 0 }, fill: "sage", edge: "torn", roughness: 6,
      halftone: { color: "#5f7d5c", toward: 90, from: 0, to: .35, cell: 8 } },
  ];
  towns.forEach((x, i) => {
    const bw = L ? 230 : 170, bh = L ? 300 : 240;
    nodes.push(...building("town-" + i, { type: types[i], x, y: ground, width: bw, height: bh, wall: ["brick", "cream", "mustard"][i] as string, roof: ["navy", "red", "brick"][i] as string,
      enter: { preset: "grow", frame: 4 + i * 5, duration: 14 } }).map(n => n.id === "town-" + i ? { ...n, pivot: [0, 0] as [number, number] } : n));
    // Town clocks hang on the facades; the label sits above the roof, clear of the sun's path.
    const clockY = ground - bh * (i === 1 ? .66 : .48), r = L ? 58 : 50;
    nodes.push(...clock("clock-" + i, { x, y: clockY, radius: r, enter: { preset: "drop", frame: 18 + i * 5, duration: 12 },
      time: [{ frame: 0, hours: 11.3 }, { frame: passes[i], hours: 12, ease: "back" }] }));
    nodes.push({ id: "noon-" + i, kind: "text", x, y: ground - bh - (L ? 34 : 30), text: "NOON HERE", role: "headline", size: L ? 40 : 36, color: "cream", align: "middle",
      slip: { fill: "red", padding: 9, edge: "cut", jitter: 1.4 }, from: passes[i], enter: { preset: "stamp", frame: passes[i], duration: 7 } });
  });
  nodes.push(
    { id: "conductor", kind: "puppet", x: L ? W - 190 : W - 150, y: L ? H - 40 : H - 330, height: L ? 330 : 300, facing: -1, look: CAST.conductor, depth: 1.12,
      actions: [{ type: "look", start: 40, end: 150, angle: -12 }, { type: "shrug", start: 186, end: 232 }] },
    kicker("kicker", L ? 96 : 72, L ? 96 : 140, "Local solar time", 6, { depth: 0 }),
    caption("caption", aspect, "Noon came when the sun was highest — a little later in every town to the west.", 30),
  );
  return { ...base("local-noon", aspect, 240, 21, { camera: [{ frame: 0, x: W / 2 - 40, y: H / 2, zoom: 1.04 }, { frame: 239, x: W / 2 + 40, y: H / 2, zoom: 1.04, ease: "linear" }], bumps: passes.map(p => ({ frame: p, amount: .35 })) }), nodes };
}

// ---- 3. The railroad problem -----------------------------------------------------------------------------------------------------

export function shotRailways(aspect: CollageAspect): CollageSceneSpec {
  const { W, H } = size(aspect), L = aspect === "landscape";
  const mapW = L ? 1640 : 1000, mapH = L ? 820 : 640;
  const stops: { id: string; geo: [number, number]; at: number }[] = [
    { id: "ny", geo: [-74.0, 40.7], at: 34 }, { id: "chi", geo: [-87.6, 41.9], at: 80 }, { id: "oma", geo: [-95.9, 41.3], at: 112 },
    { id: "den", geo: [-104.9, 39.7], at: 146 }, { id: "sf", geo: [-122.4, 37.8], at: 200 },
  ];
  const nodes: CollageNode[] = [
    { id: "map", kind: "map", x: W / 2, y: L ? H / 2 + 10 : H / 2 - 40, width: mapW, height: mapH, bounds: { west: -126, east: -64, south: 23, north: 51 }, land: "cream", water: "sky",
      graticule: { every: 5, color: "#3f5f68", opacity: .32 }, enter: { preset: "drop", frame: 0, duration: 16 }, rotate: -.8 },
    { id: "rail", kind: "route", parent: "map", points: stops.map(s => s.geo), geoPoints: true, arc: .05, color: "ink", width: 5, dash: [14, 9],
      enter: { preset: "draw", frame: 24, duration: 180, ease: "linear" } },
    // Heading west: the paper locomotive is flipped, not rotated, so it never runs upside down.
    ...locomotive("train", { parent: "map", length: L ? 120 : 92, follow: { path: "rail", start: 24, end: 204, ease: "linear" }, from: 22, enter: { preset: "pop", frame: 22, duration: 8 }, wheelSpin: 12, keys: [{ frame: 0, scaleX: -1 }] }),
  ];
  const names: Record<string, string> = { ny: "New York", chi: "Chicago", oma: "Omaha", den: "Denver", sf: "San Francisco" };
  stops.forEach((s, i) => {
    nodes.push(...mapPin("pin-" + s.id, { parent: "map", geo: s.geo, dropAt: s.at, size: L ? 40 : 34 }));
    nodes.push({ id: "name-" + s.id, kind: "text", parent: "map", geo: [s.geo[0] + (s.id === "sf" ? (L ? 4.6 : 5.6) : 0), s.geo[1] - (L ? 1.3 : 1.6)], text: names[s.id], role: "label", size: L ? 26 : 26, weight: 700, letterSpacing: 1.5,
      uppercase: true, color: "ink", align: "middle", from: s.at + 2, enter: { preset: "fade", frame: s.at + 2, duration: 6 } });
    // Each stop's clock reads a different local time when the train arrives.
    nodes.push(...clock("t-" + s.id, { parent: "map", geo: [s.geo[0] + (L ? 2.6 : 3.2), s.geo[1] + (L ? 3.2 : 4.2)], radius: L ? 34 : 30,
      enter: { preset: "pop", frame: s.at + 4, duration: 9 }, time: [{ frame: 0, hours: 12 - i * .45 }] }));
  });
  nodes.push(
    kicker("kicker", L ? 96 : 72, L ? 96 : 200, "The railroad problem", 8, { depth: 0 }),
    caption("caption", aspect, "Railroads juggled dozens of local times, and every stop kept a different clock.", 40),
  );
  return { ...base("railways", aspect, 240, 33, { board: { material: "cork" }, camera: L ? [{ frame: 0, x: W / 2 + 180, y: H / 2, zoom: 1.16 }, { frame: 239, x: W / 2 - 160, y: H / 2, zoom: 1.08, ease: "inOut" }]
    : [{ frame: 0, x: 820, y: H / 2 - 60, zoom: 1.55 }, { frame: 40, x: 800, y: H / 2 - 60, zoom: 1.55 }, { frame: 210, x: 250, y: H / 2 - 60, zoom: 1.55, ease: "inOut" }, { frame: 239, x: 260, y: H / 2 - 50, zoom: 1.5 }] }), nodes };
}

// ---- 4. The day of two noons -----------------------------------------------------------------------------------------------------

export function shotTwoNoons(aspect: CollageAspect): CollageSceneSpec {
  const { W, H } = size(aspect), L = aspect === "landscape";
  // Landscape: clipping left of centre, clocks top right, the two travellers bottom right, caption bottom left.
  // Portrait: clipping on top, clocks in the right column, travellers above the caption band.
  const cw = L ? 760 : 820, ch = L ? 700 : 760, cx = L ? W / 2 - 300 : W / 2, cy = L ? H / 2 - 50 : 600;
  const feet = L ? H - 36 : H - 290;
  const nodes: CollageNode[] = [
    ...clipping("news", {
      x: cx, y: cy, rotate: -2, width: cw, height: ch, enter: { preset: "drop", frame: 0, duration: 14 },
      masthead: "The Morning Ledger", dateline: "November 18, 1883", headline: "Railroads Adopt Standard Time",
      body: "At noon today the railroads of the United States and Canada set their clocks to standard time zones. In many towns the clocks will strike noon twice, once by the sun and once by the railroad.",
      highlight: { words: [21, 26], frame: 70, duration: 30 },
    }),
    ...pushPin("pin-a", { x: cx - cw / 2 + 40, y: cy - ch / 2 + 40, from: 10 }),
    ...pushPin("pin-b", { x: cx + cw / 2 - 40, y: cy - ch / 2 + 30, from: 13, color: "teal" }),
    ...stamp("two", { x: cx + cw * .26, y: cy + ch * .36, text: "TWO NOONS", frame: 112, size: L ? 50 : 54 }),
    ...clock("noon-a", { x: L ? W - 470 : 250, y: L ? 230 : 1110, radius: L ? 104 : 88, rotate: 4, enter: { preset: "drop", frame: 20, duration: 12 }, time: [{ frame: 0, hours: 11.85 }, { frame: 140, hours: 12, ease: "back" }] }),
    ...clock("noon-b", { x: L ? W - 220 : 480, y: L ? 330 : 1140, radius: L ? 88 : 70, rotate: -5, enter: { preset: "drop", frame: 26, duration: 12 }, accent: "red", time: [{ frame: 0, hours: 12 }, { frame: 160, hours: 12.12 }] }),
    { id: "arrow", kind: "marker", x: L ? W - 600 : 620, y: L ? 300 : 1080, stroke: { type: "arrow", to: L ? [-210, 50] : [90, -140], bend: -.3 }, color: "red", width: 6, enter: { preset: "draw", frame: 150, duration: 14 } },
    { id: "traveller", kind: "puppet", x: L ? W - 760 : 420, y: feet, height: L ? 360 : 320, look: CAST.traveller, depth: L ? 1.25 : 1,
      actions: [{ type: "walk", start: 6, end: 66, toX: L ? 180 : 200 }, { type: "talk", start: 160, end: 200 }, { type: "shrug", start: 204, end: 238 }] },
    { id: "conductor", kind: "puppet", x: L ? W - 220 : 940, y: feet, height: L ? 350 : 310, facing: -1, look: CAST.conductor, depth: L ? 1.25 : 1,
      actions: [{ type: "point", start: 120, end: 160, angle: 120 }, { type: "nod", start: 200, end: 230 }] },
    ...speechBubble("bubble", { x: L ? W - 560 : 760, y: L ? feet - 480 : feet - 430, width: L ? 300 : 320, height: 110, tail: [-70, 90], text: "WHICH NOON?", size: L ? 46 : 50, from: 162, depth: L ? 1.25 : 1, to: 240 }),
    caption("caption", aspect, "On 18 November 1883, North American railroads switched to standard time.", 24),
  ];
  return {
    ...base("two-noons", aspect, 240, 45, {
      board: { material: "cork" },
      camera: [{ frame: 0, x: W / 2, y: H / 2, zoom: 1 }, { frame: 60, x: cx + 30, y: cy + 60, zoom: L ? 1.45 : 1.3, ease: "inOut" }, { frame: 128, x: cx + 30, y: cy + 60, zoom: L ? 1.45 : 1.3 }, { frame: 168, x: W / 2, y: H / 2, zoom: 1.02, ease: "inOut" }],
      bumps: [{ frame: 112, amount: .8 }],
    }), nodes,
  };
}

// ---- 5. One line -----------------------------------------------------------------------------------------------------------------

export function shotMeridian(aspect: CollageAspect): CollageSceneSpec {
  const { W, H } = size(aspect), L = aspect === "landscape";
  const mapW = L ? 1720 : 1020, mapH = L ? 880 : 1380;
  const bounds = L ? { west: -120, east: 120, south: -50, north: 72 } : { west: -40, east: 40, south: -40, north: 72 };
  const nodes: CollageNode[] = [
    { id: "map", kind: "map", x: W / 2, y: H / 2, width: mapW, height: mapH, bounds, land: "cream", water: "teal", edge: "torn", enter: { preset: "drop", frame: 0, duration: 14 } },
  ];
  // Tissue-paper hour bands, fifteen degrees wide, laid down outward from Greenwich.
  const bands: number[] = [];
  for (let lon = -180; lon < 180; lon += 15) if (lon + 15 > bounds.west && lon < bounds.east) bands.push(lon);
  bands.sort((a, b) => Math.abs(a + 7.5) - Math.abs(b + 7.5));
  // Alternate hours get a strip of yellow tissue; every hour gets its offset printed at the top.
  bands.forEach((lon, i) => {
    const centre = lon + 7.5, hour = Math.round(centre / 15), at = 110 + i * 5;
    const x = (centre - bounds.west) / (bounds.east - bounds.west) * mapW - mapW / 2, bw = 15 / (bounds.east - bounds.west) * mapW;
    if (hour % 2) nodes.push({ id: "band-" + i, kind: "cutout", parent: "map", x, y: 0, pivot: [0, -mapH / 2 - 30],
      shape: { type: "rect", width: bw - 2, height: mapH + 60 }, fill: "yellow", material: "tissue", edge: "deckle", shadow: .3,
      blend: "multiply", opacity: .62, enter: { preset: "unfold", frame: at, duration: 12 } });
    nodes.push({ id: "hour-" + i, kind: "text", parent: "map", x, y: -mapH / 2 + (L ? 46 : 52), text: hour === 0 ? "0" : (hour > 0 ? "+" : "\u2212") + Math.abs(hour), role: "headline", size: L ? 34 : 38,
      color: "cream", align: "middle", slip: { fill: hour === 0 ? "red" : "ink", padding: 8, edge: "cut" }, enter: { preset: "pop", frame: at + 4, duration: 8 } });
  });
  nodes.push(
    { id: "meridian", kind: "route", parent: "map", points: [[0, 70], [0, -48]], geoPoints: true, color: "red", width: 7, enter: { preset: "draw", frame: 34, duration: 30 } },
    ...mapPin("greenwich", { parent: "map", geo: [-.0, 51.48], dropAt: 64, size: 50, color: "ink" }),
    { id: "gname", kind: "text", parent: "map", geo: [3, 55], text: "GREENWICH", role: "headline", size: L ? 50 : 54, color: "cream", slip: { fill: "ink", padding: 12, edge: "cut" }, enter: { preset: "pop", frame: 72, duration: 9 } },
    ...stamp("year", { parent: "map", geo: L ? [-34, 30] : [-22, 20], text: "1884", frame: 86, size: L ? 70 : 74, color: "red", card: "paper" }),
    // A presenter pinned to the frame (depth 0): the map moves under the camera, the host does not.
    { id: "delegate", kind: "puppet", x: L ? W - 110 : W - 100, y: H - (L ? 24 : 300), height: L ? 360 : 330, facing: -1, look: CAST.delegate, depth: 0,
      actions: [{ type: "walk", start: 4, end: 50, toX: L ? -120 : -80 }, { type: "point", start: 56, end: 120, angle: 132 }, { type: "talk", start: 130, end: 210 }] },
    caption("caption", aspect, "In 1884, delegates chose Greenwich as the prime meridian. Time zones are counted from it, hour by hour.", 30),
  );
  return { ...base("meridian", aspect, 270, 57, { board: { material: "card", color: "navy" }, camera: [{ frame: 0, x: W / 2, y: H / 2, zoom: 1.12 }, { frame: 100, x: W / 2 + (L ? 40 : 0), y: H / 2 - (L ? 40 : 120), zoom: 1.32, ease: "inOut" }, { frame: 269, x: W / 2, y: H / 2, zoom: 1.04, ease: "inOut" }] }), nodes };
}

// ---- 6. Payoff -------------------------------------------------------------------------------------------------------------------

export function shotPayoff(aspect: CollageAspect): CollageSceneSpec {
  const { W, H } = size(aspect), L = aspect === "landscape";
  const xs = L ? [W / 2 - 520, W / 2, W / 2 + 520] : [W / 2 - 330, W / 2, W / 2 + 330];
  const cy = L ? 360 : 520, r = L ? 128 : 112;
  const nodes: CollageNode[] = [];
  xs.forEach((x, i) => nodes.push(...clock("c" + i, { x, y: cy, radius: r, rotate: [-4, 2, 5][i], enter: { preset: "drop", frame: 4 + i * 6, duration: 12 },
    time: [{ frame: 0, hours: [11.55, 11.8, 12.2][i] }, { frame: 70, hours: 12, ease: "back" }] })));
  xs.forEach((x, i) => nodes.push(...pushPin("p" + i, { x, y: cy - r - 18, from: 20 + i * 4, color: (["red", "teal", "mustard"] as const)[i] })));
  nodes.push(
    { id: "s1", kind: "string", ends: ["p0", "p1"], sag: .12, width: 3.5, enter: { preset: "draw", frame: 74, duration: 14 } },
    { id: "s2", kind: "string", ends: ["p1", "p2"], sag: .12, width: 3.5, enter: { preset: "draw", frame: 84, duration: 14 } },
    { id: "head-1", kind: "text", x: W / 2, y: L ? 690 : 900, text: "ONE LINE.", role: "headline", size: L ? 150 : 150, color: "ink", align: "middle",
      slip: { fill: "paper", perWord: true, padding: 16, edge: "cut", jitter: 2 }, reveal: { by: "word", frame: 96, stagger: 8, preset: "stamp" } },
    { id: "head-2", kind: "text", x: W / 2, y: L ? 860 : 1080, text: L ? "ONE SHARED CLOCK." : "ONE SHARED\nCLOCK.", role: "headline", size: L ? 150 : 140, color: "cream", align: "middle", lineHeight: 1.2,
      slip: { fill: "red", perWord: true, padding: 16, edge: "torn", jitter: 2 }, reveal: { by: "word", frame: 116, stagger: 8, preset: "stamp" } },
    { id: "conductor", kind: "puppet", x: L ? 140 : 120, y: H - (L ? 20 : 120), height: L ? 300 : 340, look: CAST.conductor, depth: 1.15,
      actions: [{ type: "walk", start: 6, end: 60, toX: L ? 90 : 60 }, { type: "cheer", start: 150, end: 209 }] },
    { id: "traveller", kind: "puppet", x: L ? W - 140 : W - 120, y: H - (L ? 20 : 120), height: L ? 310 : 330, facing: -1, look: CAST.traveller, depth: 1.15,
      actions: [{ type: "walk", start: 10, end: 64, toX: L ? -90 : -60 }, { type: "wave", start: 150, end: 209 }] },
    { id: "delegate", kind: "puppet", x: L ? W - 330 : W / 2, y: H - (L ? 20 : 120), height: L ? 330 : 360, facing: -1, look: CAST.delegate, depth: 1.08, from: L ? 0 : 0,
      actions: [{ type: "nod", start: 160, end: 190 }] },
  );
  if (!L) nodes.splice(nodes.findIndex(n => n.id === "delegate"), 1);
  return { ...base("payoff", aspect, 210, 69, { board: { material: "cream" }, camera: [{ frame: 0, x: W / 2, y: H / 2 - 20, zoom: 1.1 }, { frame: 209, x: W / 2, y: H / 2, zoom: 1, ease: "out" }],
    bumps: [{ frame: 96, amount: .6 }, { frame: 116, amount: .6 }] }), nodes };
}

export interface CollageShot { id: string; title: string; build: (aspect: CollageAspect) => CollageSceneSpec }
export const STANDARD_TIME_SHOTS: readonly CollageShot[] = [
  { id: "cold-open", title: "Cold open", build: shotColdOpen },
  { id: "local-noon", title: "Noon by the sun", build: shotLocalNoon },
  { id: "railways", title: "The railroad problem", build: shotRailways },
  { id: "two-noons", title: "The day of two noons", build: shotTwoNoons },
  { id: "meridian", title: "One line", build: shotMeridian },
  { id: "payoff", title: "One shared clock", build: shotPayoff },
];
