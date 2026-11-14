/**
 * "Why every clock agrees — from the archive": the same story as the paper film, told with real
 * photographs and documents in the explainer registers studied in docs/research/editorial-collage-reference-study.md.
 *
 * App fixture, not library code. Every image is public domain or CC0 (see assets/collage/ASSETS.md) and is
 * captioned with what it actually is and when it was made. Facts on screen come from the sources shown.
 */
import type { CollageNode, CollageSceneSpec } from "../../registry/video/collage/collage-scene";
import { coverSheet, mapPin } from "../../registry/video/collage/collage-kit";
import {
  archivalPrint, chapterCaption, cutLetters, documentScan, giantLabel, labelBox, photoCutout, scraps, sourceLine, yearBox,
} from "../../registry/video/collage/collage-kit-photo";
import type { CollageAspect, CollageShot } from "./collage-standard-time";
import { WATCH, watchRig } from "./collage-watch-rig";
import locoUrl from "./assets/collage/locomotive-1873-cutout.webp";
import stationUrl from "./assets/collage/union-station-indianapolis.jpg";
import stereoUrl from "./assets/collage/greenwich-stereograph-1904.jpg";
import sunUrl from "./assets/collage/the-sun-1883-11-19-p1.jpg";

export const PHOTO_PALETTE = {
  ink: "#1d1b19", paper: "#f3eee2", cream: "#efe6d2", yellow: "#f4d21f", red: "#c62f26", pink: "#e8536b", wine: "#9c3a49",
  blue: "#2b6a99", teal: "#1f7a85", slate: "#262b31", land: "#3b444e", highlighter: "#fff200", green: "#7fb08c", white: "#ffffff",
} as const;

const size = (aspect: CollageAspect) => aspect === "landscape" ? { W: 1920, H: 1080 } : { W: 1080, H: 1920 };
const base = (id: string, aspect: CollageAspect, durationFrames: number, seed: number, extra: Partial<CollageSceneSpec>): Omit<CollageSceneSpec, "nodes"> => ({
  version: 1, id: id + "-" + aspect, width: size(aspect).W, height: size(aspect).H, durationFrames, seed, palette: PHOTO_PALETTE, cadence: 2, boil: .55, grain: .42, drift: 1.4,
  board: { material: "flat" }, ...extra,
});
/** Sentence caption on a paper slip, fixed to the frame in the lower safe band. */
function caption(id: string, aspect: CollageAspect, text: string, frame: number, dark = false): CollageNode {
  const { W, H } = size(aspect), L = aspect === "landscape";
  return { id, kind: "text", depth: 0, x: L ? 96 : 72, y: L ? H - 150 : H - 420, text, role: "body", size: L ? 44 : 50, weight: 650, color: dark ? "paper" : "ink",
    maxWidth: L ? 1150 : W - 160, lineHeight: 1.18, slip: { fill: dark ? "ink" : "paper", padding: 18, edge: "cut", jitter: .4 },
    enter: { preset: "slide", frame, duration: 12, from: "left", distance: 700 } };
}
const credit = (id: string, aspect: CollageAspect, text: string, frame: number, dark = false): CollageNode => {
  const { W, H } = size(aspect), L = aspect === "landscape";
  return sourceLine(id, { text, x: L ? 96 : 72, y: H - (L ? 46 : 170), size: L ? 22 : 24, color: dark ? "paper" : "ink", from: frame, backing: dark ? "ink" : undefined, maxWidth: W - (L ? 400 : 150) });
};

// ---- 1. Printed cut-out collage: the hook --------------------------------------------------------------------------------------

export function photoHook(aspect: CollageAspect): CollageSceneSpec {
  const { W, H } = size(aspect), L = aspect === "landscape";
  const wx = L ? 1400 : W / 2, wy = L ? H / 2 + 10 : 660, wh = L ? 760 : 760;
  return {
    ...base("photo-hook", aspect, 150, 101, {
      board: { material: "flat", color: "yellow", halftone: { color: "wine", corner: "br", opacity: .22, cell: 24 } },
      camera: [{ frame: 0, x: W / 2, y: H / 2, zoom: 1 }, { frame: 149, x: W / 2 + 10, y: H / 2, zoom: 1.06, ease: "linear" }],
      bumps: [{ frame: 8, amount: .6 }],
    }),
    nodes: [
      ...scraps("scrap", { box: L ? { x: 820, y: 90, width: 980, height: 880 } : { x: 80, y: 180, width: 920, height: 900 }, count: 6, colors: ["blue", "ink", "paper", "red"], frame: 16, size: 64 }),
      // The photographed watch taken apart: the hours fly by while the question lands, the bow flops as it drops in.
      ...watchRig("watch", { x: wx, y: wy, rotate: 6, width: wh * 743 / 1040, sticker: 13, torn: true,
        treatment: { mode: "halftone", ink: "ink", paper: "paper", cell: 6, contrast: 1.3 },
        disc: { radius: wh * .44, fill: "red", halftone: "wine", offset: [-30, 90] },
        enter: { preset: "drop", frame: 4, duration: 12 }, loops: [{ kind: "sway", amplitude: .35, period: 120 }],
        bowFlops: [14], time: [{ frame: 0, hours: WATCH.photoTime }, { frame: 24, hours: WATCH.photoTime }, { frame: 130, hours: WATCH.photoTime + 6.3, ease: "inOut" }] }),
      { id: "tape", kind: "tape", x: wx - 40, y: wy - wh * .47, rotate: -14, length: 190, width: 46, enter: { preset: "stamp", frame: 14, duration: 6 } },
      ...cutLetters("q1", { x: L ? 110 : W / 2, y: L ? 410 : 1300, text: "WHO SET", size: L ? 132 : 132, chips: ["paper", "ink", "red"], inks: ["ink", "paper", "paper"], frame: 28, align: L ? "start" : "middle" }),
      ...cutLetters("q2", { x: L ? 110 : W / 2, y: L ? 590 : 1480, text: "THE CLOCK?", size: L ? 132 : 132, chips: ["ink", "paper", "blue"], inks: ["paper", "ink", "paper"], frame: 46, align: L ? "start" : "middle" }),
      credit("credit", aspect, "Pocket watch, about 1900 · The Metropolitan Museum of Art (CC0)", 20),
      coverSheet("cover", { width: W, height: H, fill: "blue", frame: 136, duration: 14, mode: "in", from: "right" }),
    ],
  };
}

// ---- 2. Cut-out collage: every railroad its own time --------------------------------------------------------------------------

export function photoRailroads(aspect: CollageAspect): CollageSceneSpec {
  const { W, H } = size(aspect), L = aspect === "landscape";
  const lw = L ? 1380 : 1000, lh = lw * 261 / 924, lx = L ? 1000 : W / 2, ly = L ? 640 : 1000;
  return {
    ...base("photo-railroads", aspect, 180, 102, {
      board: { material: "flat", color: "blue", halftone: { color: "ink", corner: "tl", opacity: .2, cell: 22 } },
      camera: [{ frame: 0, x: W / 2 + 30, y: H / 2, zoom: 1.04 }, { frame: 179, x: W / 2 - 30, y: H / 2, zoom: 1.04, ease: "linear" }],
    }),
    nodes: [
      coverSheet("cover", { width: W, height: H, fill: "blue", frame: 0, duration: 14, mode: "out", from: "left" }),
      // Speed streaks behind the engine, drawn as it arrives.
      ...[0, 1, 2].map((i): CollageNode => ({ id: "streak-" + i, kind: "marker", x: lx - lw * .62, y: ly - lh * .2 + i * lh * .25, d: `M0 0L${-(L ? 520 : 300) + i * 60} 0`, color: "paper", width: 10 - i * 2, tool: "brush",
        enter: { preset: "draw", frame: 14 + i * 2, duration: 10 }, exit: { preset: "fade", frame: 60, duration: 12 } })),
      ...photoCutout("loco", { x: lx, y: ly, width: lw, height: lh, href: locoUrl, sticker: 11, torn: true,
        treatment: { mode: "duotone", ink: "ink", paper: "cream", contrast: 1.25 },
        enter: { preset: "slide", frame: 6, duration: 22, from: "left", distance: 2200, ease: "out" } }),
      labelBox("year", { x: lx - lw * .42, y: ly - lh * .62, text: "1873", fill: "yellow", ink: "ink", size: L ? 54 : 50, rotate: -3, enter: { preset: "pop", frame: 32, duration: 8 } }),
      ...cutLetters("t1", { x: L ? 110 : W / 2, y: L ? 230 : 330, text: "EVERY RAILROAD", size: L ? 112 : 92, chips: ["paper", "yellow", "ink"], inks: ["ink", "ink", "paper"], frame: 40, align: L ? "start" : "middle" }),
      ...cutLetters("t2", { x: L ? 110 : W / 2, y: L ? 380 : 470, text: "ITS OWN TIME", size: L ? 112 : 92, chips: ["red", "paper", "yellow"], inks: ["paper", "ink", "ink"], frame: 64, align: L ? "start" : "middle" }),
      caption("caption", aspect, "The Pennsylvania Railroad ran on Philadelphia time. Other lines kept their own.", 90),
      credit("credit", aspect, "Pennsylvania Railroad locomotive no. 421, 1873 · Library of Congress", 30, true),
    ],
  };
}

// ---- 3. Document board: the newspaper the morning after -------------------------------------------------------------------------

/** OCR word boxes on the page crop (1184 px square), from the Library of Congress ALTO file for this page. */
const SUN = { size: 1184, headline: [24, 38, 540, 82] as const, lead: [[44, 291, 555, 318], [22, 320, 554, 346]] as const, allen: [[31, 1093, 562, 1116], [32, 1118, 554, 1146]] as const };

export function photoNewspaper(aspect: CollageAspect): CollageSceneSpec {
  const { W, H } = size(aspect), L = aspect === "landscape";
  const pw = L ? 940 : 1000, px = W / 2, py = L ? H / 2 + 20 : 820, k = pw / SUN.size;
  const at = (x: number, y: number) => [px + (x * k - pw / 2), py + (y * k - pw / 2)] as const;
  const head = at((SUN.headline[0] + SUN.headline[2]) / 2, (SUN.headline[1] + SUN.headline[3]) / 2);
  const allen = at((SUN.allen[0][0] + SUN.allen[1][2]) / 2, (SUN.allen[0][1] + SUN.allen[1][3]) / 2);
  const zoom = L ? 2.05 : 1.8;
  return {
    ...base("photo-newspaper", aspect, 240, 103, {
      board: { material: "slate", grid: { spacing: 40, opacity: .12 } },
      camera: [
        { frame: 0, x: W / 2, y: H / 2, zoom: 1 },
        { frame: 50, x: head[0], y: head[1] + 40, zoom, ease: "inOut" },
        { frame: 100, x: head[0] + 6, y: head[1] + 46, zoom: zoom * 1.02, ease: "linear" },
        { frame: 148, x: allen[0], y: allen[1], zoom, ease: "inOut" },
        { frame: 239, x: allen[0] + 6, y: allen[1] + 4, zoom: zoom * 1.04, ease: "linear" },
      ],
    }),
    nodes: [
      ...documentScan("sun", { x: px, y: py, width: pw, height: pw, href: sunUrl, sourceWidth: SUN.size, sourceHeight: SUN.size, enter: { preset: "drop", frame: 0, duration: 14 },
        highlights: [
          { rect: SUN.headline, frame: 56, duration: 16 },
          { rect: SUN.allen[0], frame: 156, duration: 14 },
          { rect: SUN.allen[1], frame: 172, duration: 14 },
        ],
        spotlight: { rect: [SUN.allen[0][0], SUN.allen[0][1], SUN.allen[1][2], SUN.allen[1][3]], frame: 150, dim: .55 } }),
      ...chapterCaption("chapter", { x: L ? 96 : 72, y: L ? 140 : H - 460, year: "19 NOVEMBER 1883", title: "The morning after", frame: 12, size: L ? 44 : 46 }),
      credit("credit", aspect, "The Sun (New York), 19 November 1883, page 1 · Library of Congress, Chronicling America", 20, true),
    ],
  };
}

// ---- 4. Dark map board: one prime meridian ---------------------------------------------------------------------------------------

export function photoMeridian(aspect: CollageAspect): CollageSceneSpec {
  const { W, H } = size(aspect), L = aspect === "landscape";
  const bounds = L ? { west: -95, east: 95, south: -42, north: 68 } : { west: -38, east: 38, south: -40, north: 68 };
  const mw = L ? 2000 : 1180, mh = L ? 1160 : 1680;
  const sw = L ? 560 : 640, sh = sw * 517 / 1004;
  return {
    ...base("photo-meridian", aspect, 240, 104, {
      board: { material: "slate", color: "#14181c", grid: { spacing: 48, opacity: .08 } }, grain: .5,
      camera: [{ frame: 0, x: W / 2, y: H / 2, zoom: 1.05 }, { frame: 239, x: W / 2 - (L ? 40 : 0), y: H / 2 - (L ? 70 : 140), zoom: 1.28, ease: "inOut" }],
    }),
    nodes: [
      { id: "map", kind: "map", x: W / 2, y: H / 2, width: mw, height: mh, bounds, land: "land", coast: "#69737e", edge: "cut", relief: { opacity: .7 }, shadow: .6, enter: { preset: "fade", frame: 0, duration: 12 } },
      giantLabel("giant", { x: L ? 60 : -40, y: L ? 330 : 520, text: "Greenwich", size: L ? 290 : 250, color: "white", opacity: .14, start: 0, end: 239, drift: -110 }),
      { id: "meridian", kind: "route", parent: "map", points: [[0, 66], [0, -40]], geoPoints: true, color: "red", width: 6, enter: { preset: "draw", frame: 26, duration: 34 } },
      ...mapPin("pin", { parent: "map", geo: [0, 51.48], dropAt: 58, size: 46, color: "white" }),
      labelBox("place", { parent: "map", geo: [L ? 3 : 2.5, 55], text: "Royal Observatory", role: "label", size: L ? 26 : 30, fill: "white", ink: "ink", enter: { preset: "pop", frame: 66, duration: 8 } }),
      ...yearBox("year", { x: L ? 1500 : 250, y: L ? 250 : 720, text: "1884", size: L ? 96 : 100, frame: 82 }),
      ...archivalPrint("stereo", { x: L ? 1430 : W / 2, y: L ? 720 : 1040, rotate: 3, width: sw, height: sh, href: stereoUrl,
        kenBurns: { start: 100, end: 239, to: 1.06 }, tag: { text: "Royal Observatory, Greenwich · 1904", frame: 120 },
        enter: { preset: "drop", frame: 100, duration: 14 } }),
      ...chapterCaption("chapter", { x: L ? 96 : 72, y: L ? 900 : 1660, year: "WASHINGTON, 1884", title: "One prime meridian", frame: 14, size: L ? 50 : 52 }),
      credit("credit", aspect, "Land: Natural Earth (public domain), relief illustrative · Stereograph: Keystone View Co., 1904, Library of Congress", 20, true),
    ],
  };
}

// ---- 5. Archival print: the station clock ----------------------------------------------------------------------------------------

export function photoStation(aspect: CollageAspect): CollageSceneSpec {
  const { W, H } = size(aspect), L = aspect === "landscape";
  const pw = L ? 640 : 760, ph = pw * 862 / 759, px = L ? 640 : W / 2, py = L ? H / 2 : 760;
  // The tower clock in the photo, as fractions of the picture; the marker follows the same linear Ken Burns push.
  const clock = [.528 - .5, .28 - .5] as const, kb = { start: 0, end: 179, to: 1.14, pan: [.25, -.55] as const };
  const follow = (z: number) => {
    const tx = -kb.pan[0] * pw * (z - 1) / 2, ty = -kb.pan[1] * ph * (z - 1) / 2;
    return { x: clock[0] * pw * z + tx, y: clock[1] * ph * z + ty, scale: z };
  };
  const a = follow(1), b = follow(kb.to);
  return {
    ...base("photo-station", aspect, 180, 105, {
      board: { material: "newsprint" },
      camera: [{ frame: 0, x: W / 2, y: H / 2, zoom: 1.02 }, { frame: 179, x: W / 2, y: H / 2, zoom: 1.08, ease: "linear" }],
    }),
    nodes: [
      ...archivalPrint("print", { x: px, y: py, rotate: -2, width: pw, height: ph, href: stationUrl, kenBurns: kb,
        tag: { text: "Union Station, Indianapolis · about 1900", frame: 24 }, enter: { preset: "drop", frame: 0, duration: 14 } }),
      { id: "ring", kind: "marker", parent: "print", stroke: { type: "circle", width: pw * .2, height: pw * .2 }, color: "red", width: 6,
        keys: [{ frame: kb.start, x: a.x, y: a.y, scale: a.scale }, { frame: kb.end, x: b.x, y: b.y, scale: b.scale, ease: "linear" }],
        enter: { preset: "draw", frame: 60, duration: 18 } },
      { id: "headline", kind: "text", x: L ? 1060 : 90, y: L ? 380 : 1560, text: L ? "STATION CLOCKS\nKEPT THE NEW\nSTANDARD TIME" : "STATION CLOCKS KEPT\nTHE NEW STANDARD TIME", role: "headline", size: L ? 104 : 78, color: "ink", lineHeight: 1.1,
        highlight: { words: L ? [4, 6] : [4, 6], color: "highlighter", frame: 70, duration: 22 }, reveal: { by: "line", frame: 34, stagger: 8, preset: "drop" } },
      credit("credit", aspect, "Union Station, Indianapolis, between 1900 and 1906 · Detroit Publishing Co., Library of Congress", 20),
    ],
  };
}

// ---- 6. Payoff: back to the printed cut-out -------------------------------------------------------------------------------------

export function photoPayoff(aspect: CollageAspect): CollageSceneSpec {
  const { W, H } = size(aspect), L = aspect === "landscape";
  const wh = L ? 700 : 720, wx = L ? 560 : W / 2, wy = L ? H / 2 + 20 : 700;
  return {
    ...base("photo-payoff", aspect, 180, 106, {
      board: { material: "flat", color: "red", halftone: { color: "ink", corner: "bl", opacity: .2, cell: 24 } },
      camera: [{ frame: 0, x: W / 2, y: H / 2, zoom: 1.08 }, { frame: 179, x: W / 2, y: H / 2, zoom: 1, ease: "out" }],
      bumps: [{ frame: 40, amount: .5 }, { frame: 70, amount: .5 }],
    }),
    nodes: [
      ...scraps("scrap", { box: L ? { x: 120, y: 80, width: 1700, height: 900 } : { x: 60, y: 120, width: 960, height: 1500 }, count: 7, colors: ["yellow", "paper", "ink", "blue"], frame: 10, size: 60 }),
      // Payoff: the hands wind round to exactly noon as the line lands, then the seconds hand starts to tick.
      ...watchRig("watch", { x: wx, y: wy, rotate: -5, width: wh * 743 / 1040, sticker: 13, torn: true,
        treatment: { mode: "halftone", ink: "ink", paper: "paper", cell: 6, contrast: 1.3 }, disc: { radius: wh * .45, fill: "yellow", halftone: "ink", offset: [24, 70] },
        enter: { preset: "drop", frame: 2, duration: 12 }, loops: [{ kind: "sway", amplitude: .3, period: 140 }], bowFlops: [12],
        time: [{ frame: 0, hours: 11.2 }, { frame: 18, hours: 11.2 }, { frame: 92, hours: 12, ease: "back" }],
        ticking: { frame: 92, startSecond: 0, seconds: 2 } }),
      ...cutLetters("p1", { x: L ? 1000 : W / 2, y: L ? 430 : 1340, text: "ONE LINE.", size: L ? 128 : 132, chips: ["paper", "ink", "yellow"], inks: ["ink", "paper", "ink"], frame: 34, align: L ? "start" : "middle" }),
      ...cutLetters("p2", { x: L ? 1000 : W / 2, y: L ? 620 : 1530, text: "ONE TIME.", size: L ? 128 : 132, chips: ["yellow", "paper", "ink"], inks: ["ink", "ink", "paper"], frame: 62, align: L ? "start" : "middle" }),
      credit("credit", aspect, "Pocket watch, about 1900 · The Metropolitan Museum of Art (CC0)", 20, true),
    ],
  };
}

export const PHOTO_REGISTER_SHOTS: readonly CollageShot[] = [
  { id: "photo-hook", title: "Printed cut-out: the hook", build: photoHook },
  { id: "photo-railroads", title: "Cut-out collage: railroad time", build: photoRailroads },
  { id: "photo-newspaper", title: "Document board: 19 Nov 1883", build: photoNewspaper },
  { id: "photo-meridian", title: "Dark map board: Greenwich", build: photoMeridian },
  { id: "photo-station", title: "Archival print: the station clock", build: photoStation },
  { id: "photo-payoff", title: "Printed cut-out: payoff", build: photoPayoff },
];
export const PHOTO_REGISTER_TEARS: Readonly<Record<string, number>> = { "photo-meridian": 22, "photo-payoff": 22 };
