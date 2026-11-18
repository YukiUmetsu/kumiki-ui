/**
 * COLLAGE1 — editorial paper-collage scene contract.
 *
 * The look of the newsroom explainer: cut and torn paper on a textured board, halftone print shading,
 * sticker borders, masking tape, highlighter sweeps and marker annotations, condensed headline type on
 * paper slips, paper maps with routes and pins, and paper-puppet characters, all moved like stop-motion
 * under a smooth rostrum camera.
 *
 * A scene is JSON-safe data: no clock, no callbacks, no remote code. Every node is evaluated from the
 * absolute frame, so frames render identically in any seek order.
 */
import type { CollageShape, EdgeStyle } from "./collage-geometry";
import { isSafePath } from "./collage-geometry";
import type { CollageCameraBump, CollageCameraKey, CollageEase, CollageKey, CollageLoop, CollageMove } from "./collage-motion";
import { COLLAGE_CHANNELS, COLLAGE_EASES } from "./collage-motion";
import type { CollageFontRole, CollageFonts } from "./collage-type";
import type { CollagePuppetAction, CollagePuppetLook } from "./collage-puppet";
import { inspectPuppet } from "./collage-puppet";
import type { RigSpec } from "../../rig/rig-spec";
import { inspectPaperSheetMotion } from "../../motion/paper-sheet";
import type { PaperSheetMotion } from "../../motion/paper-sheet";
import { inspectRig } from "../../rig/rig-spec";

export type CollageColor = `#${string}`;
/** A literal colour or a palette role name such as `"accent"`. */
export type CollagePaint = string;

/** Board surfaces. Each is a deterministic texture generated from the scene seed. */
/** `flat` is a bold flat colour field (the cut-out photo register); `slate` is the dark editorial stage (maps, archives). */
export type CollageBoardMaterial = "kraft" | "cream" | "newsprint" | "cork" | "card" | "graph" | "blackboard" | "flat" | "slate";
/** Paper stocks for cutouts: changes fibre texture strength and translucency. */
export type CollagePaperMaterial = "paper" | "card" | "kraft" | "newsprint" | "tissue" | "glossy";

export interface CollageHalftone {
  /** Ink of the dots. */
  color: CollagePaint;
  /** Dot pitch in authored pixels. */
  cell?: number;
  /** Screen angle in degrees. */
  angle?: number;
  /** Direction the shading darkens toward, degrees (0 = right, 90 = down). */
  toward?: number;
  /** Coverage at the light and dark ends, 0..1. */
  from?: number;
  to?: number;
  opacity?: number;
}

export interface CollageBacking {
  /** Margin in authored pixels between the cutout and its sticker/torn backing. */
  width: number;
  color?: CollagePaint;
  edge?: EdgeStyle;
}

export interface CollageBase {
  id: string;
  /** Parent node id, or `puppetId.part` to ride on a puppet's hand, head or torso. */
  parent?: string;
  x?: number;
  y?: number;
  rotate?: number;
  scale?: number;
  /** Local pivot for rotation and scale. */
  pivot?: readonly [number, number];
  /** Parallax depth for top-level nodes. 1 = board plane; .6 = far back; 1.3 = close to the lens. */
  depth?: number;
  /** Visible from this frame (inclusive)… */
  from?: number;
  /** …until this frame (exclusive). */
  to?: number;
  enter?: CollageMove;
  exit?: CollageMove;
  keys?: readonly CollageKey[];
  loops?: readonly CollageLoop[];
  /** Follow a `route` (or any `marker`) node's path; position and optional orientation come from it. */
  follow?: { path: string; start: number; end: number; fromT?: number; toT?: number; ease?: CollageEase; orient?: boolean };
  /** Position on a parent `map` node by longitude/latitude. */
  geo?: readonly [number, number];
  /** Held source frames per pose: 2 = on twos. Overrides the scene cadence. */
  cadence?: 1 | 2 | 3 | 4;
  /** Hand-placement error per held pose, in pixels. */
  boil?: number;
  opacity?: number;
  /** Drop-shadow strength 0..1. Defaults by kind. */
  shadow?: number;
  blend?: "normal" | "multiply" | "screen" | "overlay" | "darken";
  /** Print the whole subtree through a real halftone screen (archival-photo look). */
  print?: { mode: "halftone" | "duotone" | "mono"; ink?: CollagePaint; paper?: CollagePaint; cell?: number; contrast?: number };
}

export interface CollageCutoutNode extends CollageBase {
  kind: "cutout";
  shape: CollageShape;
  fill: CollagePaint;
  material?: CollagePaperMaterial;
  edge?: EdgeStyle;
  roughness?: number;
  backing?: CollageBacking;
  halftone?: CollageHalftone;
  /** Printed rules on the paper: lined notebook, graph squares or a dot grid. */
  pattern?: { type: "lines" | "grid" | "dots" | "stripes"; color: CollagePaint; spacing?: number; angle?: number; opacity?: number };
  /** Optional thin printed outline. */
  stroke?: { color: CollagePaint; width: number };
  /**
   * MC1.3 physical paper: the cutout folds, peels, rolls and tears in 3D with curvature shading, edge thickness and
   * cast shadows; its outline is the cutout's silhouette. The stock defaults from `material`. Keys use scene frames.
   */
  sheet?: PaperSheetMotion;
}

export interface CollageTextNode extends CollageBase {
  kind: "text";
  text: string;
  role?: CollageFontRole;
  size: number;
  color: CollagePaint;
  weight?: number;
  italic?: boolean;
  align?: "start" | "middle" | "end";
  letterSpacing?: number;
  uppercase?: boolean;
  lineHeight?: number;
  /** Wrap width in pixels. */
  maxWidth?: number;
  /** Paper slip behind the text. `perWord` cuts every word out separately, like a pasted-up headline. */
  slip?: { fill: CollagePaint; edge?: EdgeStyle; padding?: number; perWord?: boolean; jitter?: number; backing?: CollageBacking; material?: CollagePaperMaterial };
  /** Word-by-word or letter-by-letter arrival. */
  reveal?: { by: "word" | "letter" | "line"; frame: number; stagger: number; preset?: "drop" | "pop" | "stamp" | "fade" | "type"; duration?: number };
  /** Highlighter sweep behind a word range [first, last] (inclusive, zero-based across all lines). */
  /** `marker` is a translucent highlighter; `box` a solid label box; `brush` a rough opaque brush block (neon on dark stages). */
  highlight?: { words?: readonly [number, number]; color: CollagePaint; frame: number; duration: number; style?: "marker" | "box" | "brush" };
  /** Animated number: `{n}` inside `text` is replaced by the counted value. */
  count?: { from: number; to: number; frame: number; duration: number; decimals?: number; ease?: CollageEase; separator?: boolean };
}

export type CollageMarkerTool = "marker" | "highlighter" | "pencil" | "brush";
export interface CollageMarkerNode extends CollageBase {
  kind: "marker";
  /** Path in local coordinates, or a generated stroke. */
  d?: string;
  stroke?:
    | { type: "circle"; width: number; height: number; loops?: number }
    | { type: "underline"; width: number }
    | { type: "arrow"; to: readonly [number, number]; bend?: number; head?: number }
    | { type: "cross"; size: number }
    | { type: "check"; size: number }
    | { type: "scribble"; width: number; height: number; passes?: number };
  color: CollagePaint;
  width: number;
  tool?: CollageMarkerTool;
  /** Redraw wobble per held pose, pixels. Gives hand-drawn lines their life. */
  wobble?: number;
  dash?: readonly [number, number];
}

export interface CollageTapeNode extends CollageBase {
  kind: "tape";
  length: number;
  width?: number;
  color?: CollagePaint;
}

/** How a photograph is printed. `natural` keeps evidence tonality; the others are decorative print looks. */
export interface CollagePhotoTreatment {
  mode: "natural" | "mono" | "duotone" | "halftone";
  /** Ink colour (dark tones) for mono/duotone/halftone. */
  ink?: CollagePaint;
  /** Paper colour (light tones). */
  paper?: CollagePaint;
  /** Halftone dot pitch in image pixels. */
  cell?: number;
  contrast?: number;
}
export interface CollageImageNode extends CollageBase {
  kind: "image";
  href: string;
  width: number;
  height: number;
  /** Silhouette that cuts the photo out; defaults to its rectangle. Ignored when `cutout` is set. */
  mask?: CollageShape;
  edge?: EdgeStyle;
  backing?: CollageBacking;
  /** The image already has a transparent background (a subject cut-out): borders and shadows follow its alpha. */
  cutout?: boolean;
  /** White sticker border that follows the cut-out's silhouette; `torn` roughens it like hand-torn paper. */
  sticker?: { width: number; color?: CollagePaint; torn?: boolean };
  treatment?: CollagePhotoTreatment;
  /** Slow push across the photo inside its frame (zoom 1 → `to`), panning toward `pan` (fractions of the size). */
  kenBurns?: { start: number; end: number; from?: number; to: number; pan?: readonly [number, number] };
}

/** Dims everything around a window, so the eye lands on one passage of a document or one detail of a photo. */
export interface CollageSpotlightNode extends CollageBase {
  kind: "spotlight";
  /** Window size, centred on the node's position. */
  width: number;
  height: number;
  shape?: "rect" | "ellipse";
  color?: CollagePaint;
  /** Strength of the dimming, 0..1 (multiplied by the node opacity). */
  dim?: number;
  /** Soft edge in pixels. */
  feather?: number;
}

export interface CollageGroupNode extends CollageBase { kind: "group" }

export interface CollageMapRegion { id: string; points: readonly (readonly [number, number])[]; fill: CollagePaint; edge?: EdgeStyle; /** Diagonal hatching, e.g. a contested area. */ hatch?: CollagePaint }
export interface CollageMapNode extends CollageBase {
  kind: "map";
  width: number;
  height: number;
  /** Visible longitude/latitude window (equirectangular). */
  bounds: { west: number; east: number; south: number; north: number };
  /** Paper colour of land; set `land: false` to draw only regions. */
  land?: CollagePaint | false;
  water?: CollagePaint;
  edge?: EdgeStyle;
  regions?: readonly CollageMapRegion[];
  graticule?: { every: number; color: CollagePaint; opacity?: number };
  /** Colour of the paper core showing along torn coastlines (default cream; darker on dark stages). */
  coast?: CollagePaint;
  /** Illustrative shaded-relief texture printed on the land (not elevation data). */
  relief?: { opacity?: number };
}

export interface CollageRouteNode extends CollageBase {
  kind: "route";
  /** Points in local (or parent-map geo, when `geoPoints`) coordinates. */
  points: readonly (readonly [number, number])[];
  geoPoints?: boolean;
  /** Arc height as a fraction of each leg's length; flight paths bow. */
  arc?: number;
  color: CollagePaint;
  width: number;
  dash?: readonly [number, number];
}

export interface CollageStringNode extends CollageBase {
  kind: "string";
  /** Board points or node ids whose origins the string ties to. */
  ends: readonly [readonly [number, number] | string, readonly [number, number] | string];
  color?: CollagePaint;
  width?: number;
  sag?: number;
}

/** Any RIG1 rig (person, animal, dragon, vehicle, machine…) drawn in a film look. Its root keys are node-local. */
export interface CollageRigNode extends CollageBase {
  kind: "rig";
  rig: RigSpec;
  /** Film look the rig is painted in; defaults to paper collage. */
  look?: "flat" | "collage" | "crayon" | "riso" | "ink" | "blueprint";
  showBones?: boolean;
}

export interface CollagePuppetNode extends CollageBase {
  kind: "puppet";
  look: CollagePuppetLook;
  /** Figure height in pixels from sole to crown. */
  height?: number;
  facing?: 1 | -1;
  actions?: readonly CollagePuppetAction[];
}

export type CollageNode =
  | CollageCutoutNode | CollageTextNode | CollageMarkerNode | CollageTapeNode | CollageImageNode
  | CollageGroupNode | CollageMapNode | CollageRouteNode | CollageStringNode | CollagePuppetNode | CollageSpotlightNode | CollageRigNode;
export type CollageNodeKind = CollageNode["kind"];

export interface CollageSceneSpec {
  version: 1;
  id: string;
  width: number;
  height: number;
  durationFrames: number;
  seed: number;
  board: {
    material: CollageBoardMaterial; color?: CollagePaint; grain?: number; vignette?: number;
    /** Fine printed grid over the board (dark editorial stages, graph paper). */
    grid?: { spacing?: number; color?: CollagePaint; opacity?: number };
    /** Halftone dot gradient spreading from one corner of the frame (the flat-colour cut-out register). */
    halftone?: { color: CollagePaint; corner?: "tl" | "tr" | "bl" | "br"; opacity?: number; cell?: number };
  };
  /** Named colours; any paint field may reference a role name. */
  palette?: Readonly<Record<string, CollageColor>>;
  fonts?: CollageFonts;
  /** Default stop-motion cadence for paper (camera stays smooth). */
  cadence?: 1 | 2 | 3 | 4;
  /** Default boil in pixels for cutouts. */
  boil?: number;
  camera?: readonly CollageCameraKey[];
  /** Handheld rostrum drift in pixels. */
  drift?: number;
  bumps?: readonly CollageCameraBump[];
  /** Direction shadows fall, degrees (0 = right, 90 = down). Default 58: light from the upper left. */
  light?: number;
  /** Film grain over the finished frame 0..1. */
  grain?: number;
  nodes: readonly CollageNode[];
}

// ---- Validation ------------------------------------------------------------------------------------------------------------------

const SLUG = /^[a-z][a-z0-9-]{0,63}$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const int = (v: unknown): v is number => Number.isSafeInteger(v);
const inRange = (v: unknown, lo: number, hi: number) => finite(v) && v >= lo && v <= hi;
const KINDS: readonly CollageNodeKind[] = ["cutout", "text", "marker", "tape", "image", "group", "map", "route", "string", "puppet", "spotlight", "rig"];
const MOVES = ["slide", "drop", "pop", "flip", "unfold", "grow", "fade", "stamp", "swing", "draw", "peel", "none"];
const EDGES: readonly EdgeStyle[] = ["torn", "cut", "deckle", "clean"];
const BOARDS: readonly CollageBoardMaterial[] = ["kraft", "cream", "newsprint", "cork", "card", "graph", "blackboard", "flat", "slate"];
const PAPERS: readonly CollagePaperMaterial[] = ["paper", "card", "kraft", "newsprint", "tissue", "glossy"];

/** A paint is valid when it is a 6-digit hex colour or a palette role. */
function checkPaint(value: unknown, palette: Record<string, unknown> | undefined, path: string, errors: string[]) {
  if (typeof value !== "string") { errors.push(path + " must be a colour"); return; }
  if (HEX.test(value)) return;
  if (!palette || !(value in palette)) errors.push(path + " must be a 6-digit hex colour or a palette role (got \"" + value + "\")");
}
function checkShape(shape: unknown, path: string, errors: string[]) {
  const s = shape as CollageShape | undefined;
  if (!s || typeof s !== "object") { errors.push(path + " must be a shape"); return; }
  const dim = (v: unknown, name: string) => { if (!inRange(v, .5, 8192)) errors.push(path + "." + name + " must be 0.5..8192"); };
  switch (s.type) {
    case "rect": dim(s.width, "width"); dim(s.height, "height"); if (s.radius !== undefined && !inRange(s.radius, 0, 4096)) errors.push(path + ".radius is out of range"); break;
    case "ellipse": dim(s.rx, "rx"); dim(s.ry, "ry"); break;
    case "polygon":
      if (!Array.isArray(s.points) || s.points.length < 3 || s.points.length > 2000 || !s.points.every(p => Array.isArray(p) && p.length === 2 && p.every(v => inRange(v, -16384, 16384))))
        errors.push(path + ".points must hold 3..2000 finite [x,y] pairs");
      break;
    case "star":
      if (!int(s.points) || s.points < 3 || s.points > 64) errors.push(path + ".points must be 3..64");
      dim(s.outer, "outer"); dim(s.inner, "inner"); break;
    case "bubble":
      dim(s.width, "width"); dim(s.height, "height");
      if (!Array.isArray(s.tail) || s.tail.length !== 2 || !s.tail.every(v => inRange(v, -8192, 8192))) errors.push(path + ".tail must be an [x,y] point");
      break;
    case "path": if (!isSafePath(s.d)) errors.push(path + ".d must be bounded SVG path data beginning with M"); break;
    default: errors.push(path + ".type must be rect, ellipse, polygon, star, bubble or path");
  }
}
function checkMove(move: unknown, duration: number, path: string, errors: string[]) {
  const m = move as CollageMove | undefined;
  if (!m || typeof m !== "object") { errors.push(path + " must be a move"); return; }
  if (!MOVES.includes(m.preset)) errors.push(path + ".preset must be one of " + MOVES.join(", "));
  if (!int(m.frame) || m.frame < 0 || m.frame >= duration) errors.push(path + ".frame must be inside the scene");
  if (!int(m.duration) || m.duration < 1 || m.duration > duration) errors.push(path + ".duration must be 1..scene length");
  if (m.from !== undefined && !["left", "right", "top", "bottom"].includes(m.from)) errors.push(path + ".from must be left, right, top or bottom");
  if (m.distance !== undefined && !inRange(m.distance, 0, 16384)) errors.push(path + ".distance is out of range");
  if (m.ease !== undefined && !COLLAGE_EASES.includes(m.ease)) errors.push(path + ".ease is unknown");
}

/** Every problem with a scene, each with its JSON path. Empty means valid. */
export function inspectCollageScene(input: unknown): string[] {
  const errors: string[] = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) return ["scene must be an object"];
  const v = input as Partial<CollageSceneSpec>;
  if (v.version !== 1) errors.push("version must be 1");
  if (typeof v.id !== "string" || !SLUG.test(v.id)) errors.push("id must be a lowercase slug");
  if (!int(v.width) || v.width < 64 || v.width > 4096 || !int(v.height) || v.height < 64 || v.height > 4096) errors.push("width and height must be integers 64..4096");
  if (!int(v.durationFrames) || v.durationFrames < 1 || v.durationFrames > 36000) errors.push("durationFrames must be 1..36000");
  if (!int(v.seed)) errors.push("seed must be a safe integer");
  const palette = v.palette as Record<string, unknown> | undefined;
  if (palette !== undefined) {
    if (!palette || typeof palette !== "object" || Array.isArray(palette)) errors.push("palette must be an object of hex colours");
    else for (const [role, colour] of Object.entries(palette)) {
      if (!SLUG.test(role)) errors.push("palette." + role + " must be a lowercase slug");
      if (typeof colour !== "string" || !HEX.test(colour)) errors.push("palette." + role + " must be a 6-digit hex colour");
    }
  }
  if (!v.board || typeof v.board !== "object") errors.push("board is required");
  else {
    if (!BOARDS.includes(v.board.material)) errors.push("board.material must be one of " + BOARDS.join(", "));
    if (v.board.color !== undefined) checkPaint(v.board.color, palette, "board.color", errors);
    if (v.board.grain !== undefined && !inRange(v.board.grain, 0, 1)) errors.push("board.grain must be 0..1");
    if (v.board.vignette !== undefined && !inRange(v.board.vignette, 0, 1)) errors.push("board.vignette must be 0..1");
    const grid = v.board.grid, ht = v.board.halftone;
    if (grid !== undefined) {
      if (grid.spacing !== undefined && !inRange(grid.spacing, 4, 400)) errors.push("board.grid.spacing must be 4..400");
      if (grid.color !== undefined) checkPaint(grid.color, palette, "board.grid.color", errors);
      if (grid.opacity !== undefined && !inRange(grid.opacity, 0, 1)) errors.push("board.grid.opacity must be 0..1");
    }
    if (ht !== undefined) {
      checkPaint(ht.color, palette, "board.halftone.color", errors);
      if (ht.corner !== undefined && !["tl", "tr", "bl", "br"].includes(ht.corner)) errors.push("board.halftone.corner must be tl, tr, bl or br");
      if (ht.opacity !== undefined && !inRange(ht.opacity, 0, 1)) errors.push("board.halftone.opacity must be 0..1");
      if (ht.cell !== undefined && !inRange(ht.cell, 3, 80)) errors.push("board.halftone.cell must be 3..80");
    }
  }
  if (v.cadence !== undefined && ![1, 2, 3, 4].includes(v.cadence)) errors.push("cadence must be 1..4");
  if (v.boil !== undefined && !inRange(v.boil, 0, 8)) errors.push("boil must be 0..8 pixels");
  if (v.drift !== undefined && !inRange(v.drift, 0, 60)) errors.push("drift must be 0..60 pixels");
  if (v.light !== undefined && !inRange(v.light, -360, 360)) errors.push("light must be degrees");
  if (v.grain !== undefined && !inRange(v.grain, 0, 1)) errors.push("grain must be 0..1");
  const duration = int(v.durationFrames) ? v.durationFrames : 1;
  if (v.camera !== undefined) {
    if (!Array.isArray(v.camera) || v.camera.length < 1 || v.camera.length > 64) errors.push("camera must have 1..64 keys");
    else {
      let previous = -1;
      v.camera.forEach((k, i) => {
        if (!k || !int(k.frame) || k.frame <= previous || k.frame >= duration || !finite(k.x) || !finite(k.y) || !inRange(k.zoom, .2, 12) ||
          (k.rotate !== undefined && !inRange(k.rotate, -180, 180)) || (k.ease !== undefined && !COLLAGE_EASES.includes(k.ease)))
          errors.push("camera[" + i + "] must be sorted, inside the scene, zoom .2..12");
        previous = k?.frame ?? previous;
      });
    }
  }
  if (v.bumps !== undefined && (!Array.isArray(v.bumps) || v.bumps.length > 64 || v.bumps.some(b => !b || !int(b.frame) || (b.amount !== undefined && !inRange(b.amount, 0, 6)))))
    errors.push("bumps must be up to 64 {frame, amount 0..6}");
  if (!Array.isArray(v.nodes) || v.nodes.length < 1 || v.nodes.length > 600) { errors.push("nodes must have 1..600 entries"); return errors; }

  const ids = new Map<string, CollageNode>();
  v.nodes.forEach((node, i) => {
    const p = "nodes[" + i + "]";
    if (!node || typeof node !== "object") { errors.push(p + " must be an object"); return; }
    if (typeof node.id !== "string" || !SLUG.test(node.id)) errors.push(p + ".id must be a lowercase slug");
    else if (ids.has(node.id)) errors.push(p + ".id \"" + node.id + "\" is used twice");
    else ids.set(node.id, node);
    if (!KINDS.includes(node.kind)) { errors.push(p + ".kind must be one of " + KINDS.join(", ")); return; }
    for (const key of ["x", "y", "rotate"] as const) if (node[key] !== undefined && !inRange(node[key], -16384, 16384)) errors.push(p + "." + key + " is out of range");
    if (node.scale !== undefined && !inRange(node.scale, .01, 40)) errors.push(p + ".scale must be .01..40");
    if (node.depth !== undefined && !inRange(node.depth, 0, 3)) errors.push(p + ".depth must be 0..3");
    if (node.opacity !== undefined && !inRange(node.opacity, 0, 1)) errors.push(p + ".opacity must be 0..1");
    if (node.shadow !== undefined && !inRange(node.shadow, 0, 1)) errors.push(p + ".shadow must be 0..1");
    if (node.boil !== undefined && !inRange(node.boil, 0, 8)) errors.push(p + ".boil must be 0..8");
    if (node.cadence !== undefined && ![1, 2, 3, 4].includes(node.cadence)) errors.push(p + ".cadence must be 1..4");
    if (node.pivot !== undefined && (!Array.isArray(node.pivot) || node.pivot.length !== 2 || !(node.pivot as unknown[]).every((c: unknown) => inRange(c, -16384, 16384)))) errors.push(p + ".pivot must be [x,y]");
    if (node.from !== undefined && (!int(node.from) || node.from < 0)) errors.push(p + ".from must be a frame");
    if (node.to !== undefined && (!int(node.to) || node.to <= (node.from ?? 0))) errors.push(p + ".to must be after from");
    if (node.blend !== undefined && !["normal", "multiply", "screen", "overlay", "darken"].includes(node.blend)) errors.push(p + ".blend is unsupported");
    if (node.enter) checkMove(node.enter, duration, p + ".enter", errors);
    if (node.exit) checkMove(node.exit, duration, p + ".exit", errors);
    if (node.keys !== undefined) {
      if (!Array.isArray(node.keys) || node.keys.length > 200) errors.push(p + ".keys must have up to 200 keys");
      else {
        let previous = -1;
        (node.keys as CollageKey[]).forEach((k: CollageKey, j: number) => {
          if (!k || !int(k.frame) || k.frame <= previous) errors.push(p + ".keys[" + j + "].frame must be increasing integers");
          for (const c of COLLAGE_CHANNELS) if (k?.[c] !== undefined && !inRange(k[c], -16384, 16384)) errors.push(p + ".keys[" + j + "]." + c + " must be finite");
          if (k?.ease !== undefined && !COLLAGE_EASES.includes(k.ease)) errors.push(p + ".keys[" + j + "].ease is unknown");
          previous = k?.frame ?? previous;
        });
      }
    }
    if (node.loops !== undefined && (!Array.isArray(node.loops) || node.loops.length > 8 ||
      (node.loops as CollageLoop[]).some((l: CollageLoop) => !l || !["bob", "sway", "spin", "pulse", "float", "flutter", "orbit"].includes(l.kind) || (l.period !== undefined && !inRange(l.period, 2, 36000)) || (l.amplitude !== undefined && !inRange(l.amplitude, -50, 50)))))
      errors.push(p + ".loops must be up to 8 known loops");
    if (node.follow !== undefined) {
      const f = node.follow;
      if (!f || typeof f.path !== "string" || !int(f.start) || !int(f.end) || f.end <= f.start ||
        (f.fromT !== undefined && !inRange(f.fromT, 0, 1)) || (f.toT !== undefined && !inRange(f.toT, 0, 1)))
        errors.push(p + ".follow needs path, start < end and fromT/toT in 0..1");
    }
    if (node.geo !== undefined && (!Array.isArray(node.geo) || node.geo.length !== 2 || !inRange(node.geo[0], -360, 360) || !inRange(node.geo[1], -90, 90)))
      errors.push(p + ".geo must be [longitude, latitude]");
    if (node.print !== undefined) {
      if (!["halftone", "duotone", "mono"].includes(node.print.mode)) errors.push(p + ".print.mode must be halftone, duotone or mono");
      if (node.print.ink !== undefined) checkPaint(node.print.ink, palette, p + ".print.ink", errors);
      if (node.print.paper !== undefined) checkPaint(node.print.paper, palette, p + ".print.paper", errors);
      if (node.print.cell !== undefined && !inRange(node.print.cell, 2, 40)) errors.push(p + ".print.cell must be 2..40");
      if (node.print.contrast !== undefined && !inRange(node.print.contrast, .2, 4)) errors.push(p + ".print.contrast must be .2..4");
    }
    switch (node.kind) {
      case "cutout": {
        checkShape(node.shape, p + ".shape", errors);
        checkPaint(node.fill, palette, p + ".fill", errors);
        if (node.material !== undefined && !PAPERS.includes(node.material)) errors.push(p + ".material must be one of " + PAPERS.join(", "));
        if (node.edge !== undefined && !EDGES.includes(node.edge)) errors.push(p + ".edge must be torn, cut, deckle or clean");
        if (node.roughness !== undefined && !inRange(node.roughness, 0, 40)) errors.push(p + ".roughness must be 0..40");
        if (node.backing) {
          if (!inRange(node.backing.width, 0, 200)) errors.push(p + ".backing.width must be 0..200");
          if (node.backing.color !== undefined) checkPaint(node.backing.color, palette, p + ".backing.color", errors);
          if (node.backing.edge !== undefined && !EDGES.includes(node.backing.edge)) errors.push(p + ".backing.edge is unknown");
        }
        if (node.halftone) {
          checkPaint(node.halftone.color, palette, p + ".halftone.color", errors);
          if (node.halftone.cell !== undefined && !inRange(node.halftone.cell, 2, 60)) errors.push(p + ".halftone.cell must be 2..60");
          for (const key of ["from", "to", "opacity"] as const) if (node.halftone[key] !== undefined && !inRange(node.halftone[key], 0, 1)) errors.push(p + ".halftone." + key + " must be 0..1");
        }
        if (node.sheet !== undefined) for (const issue of inspectPaperSheetMotion(node.sheet, p + ".sheet.")) errors.push(`${issue.path}: ${issue.message}`);
        if (node.pattern) {
          if (!["lines", "grid", "dots", "stripes"].includes(node.pattern.type)) errors.push(p + ".pattern.type is unknown");
          checkPaint(node.pattern.color, palette, p + ".pattern.color", errors);
          if (node.pattern.spacing !== undefined && !inRange(node.pattern.spacing, 2, 400)) errors.push(p + ".pattern.spacing must be 2..400");
        }
        if (node.stroke) { checkPaint(node.stroke.color, palette, p + ".stroke.color", errors); if (!inRange(node.stroke.width, 0, 60)) errors.push(p + ".stroke.width must be 0..60"); }
        break;
      }
      case "text": {
        if (typeof node.text !== "string" || node.text.length < 1 || node.text.length > 600) errors.push(p + ".text must be 1..600 characters");
        if (node.role !== undefined && !["headline", "body", "label"].includes(node.role)) errors.push(p + ".role must be headline, body or label");
        if (!inRange(node.size, 6, 600)) errors.push(p + ".size must be 6..600");
        checkPaint(node.color, palette, p + ".color", errors);
        if (node.maxWidth !== undefined && !inRange(node.maxWidth, 20, 8192)) errors.push(p + ".maxWidth must be 20..8192");
        if (node.align !== undefined && !["start", "middle", "end"].includes(node.align)) errors.push(p + ".align must be start, middle or end");
        if (node.lineHeight !== undefined && !inRange(node.lineHeight, .7, 3)) errors.push(p + ".lineHeight must be .7..3");
        if (node.slip) {
          checkPaint(node.slip.fill, palette, p + ".slip.fill", errors);
          if (node.slip.padding !== undefined && !inRange(node.slip.padding, 0, 200)) errors.push(p + ".slip.padding must be 0..200");
          if (node.slip.edge !== undefined && !EDGES.includes(node.slip.edge)) errors.push(p + ".slip.edge is unknown");
        }
        if (node.reveal && (!["word", "letter", "line"].includes(node.reveal.by) || !int(node.reveal.frame) || !inRange(node.reveal.stagger, 0, 600)))
          errors.push(p + ".reveal needs by (word|letter|line), frame and stagger");
        if (node.highlight) {
          checkPaint(node.highlight.color, palette, p + ".highlight.color", errors);
          if (!int(node.highlight.frame) || !int(node.highlight.duration) || node.highlight.duration < 1) errors.push(p + ".highlight needs frame and duration");
          if (node.highlight.style !== undefined && !["marker", "box", "brush"].includes(node.highlight.style)) errors.push(p + ".highlight.style must be marker, box or brush");
        }
        if (node.count && (![node.count.from, node.count.to].every(finite) || !int(node.count.frame) || !int(node.count.duration) || node.count.duration < 1 || !node.text.includes("{n}")))
          errors.push(p + ".count needs from, to, frame, duration and a {n} in text");
        break;
      }
      case "marker": {
        if (node.d === undefined && node.stroke === undefined) errors.push(p + " needs d or stroke");
        if (node.d !== undefined && !isSafePath(node.d)) errors.push(p + ".d must be bounded SVG path data");
        if (node.stroke !== undefined && !["circle", "underline", "arrow", "cross", "check", "scribble"].includes(node.stroke.type)) errors.push(p + ".stroke.type is unknown");
        checkPaint(node.color, palette, p + ".color", errors);
        if (!inRange(node.width, .25, 200)) errors.push(p + ".width must be .25..200");
        if (node.tool !== undefined && !["marker", "highlighter", "pencil", "brush"].includes(node.tool)) errors.push(p + ".tool is unknown");
        if (node.wobble !== undefined && !inRange(node.wobble, 0, 20)) errors.push(p + ".wobble must be 0..20");
        break;
      }
      case "tape":
        if (!inRange(node.length, 4, 4096)) errors.push(p + ".length must be 4..4096");
        if (node.width !== undefined && !inRange(node.width, 2, 400)) errors.push(p + ".width must be 2..400");
        if (node.color !== undefined) checkPaint(node.color, palette, p + ".color", errors);
        break;
      case "image":
        if (typeof node.href !== "string" || !/^(data:image\/(png|jpeg|webp|svg\+xml)[;,]|https?:\/\/|\/|\.{0,2}\/?[\w-])/.test(node.href) || node.href.length > 4_000_000) errors.push(p + ".href must be an image URL or data URI");
        if (!inRange(node.width, 1, 8192) || !inRange(node.height, 1, 8192)) errors.push(p + ".width/height must be 1..8192");
        if (node.mask) checkShape(node.mask, p + ".mask", errors);
        if (node.edge !== undefined && !EDGES.includes(node.edge)) errors.push(p + ".edge is unknown");
        if (node.sticker) {
          if (!inRange(node.sticker.width, 0, 120)) errors.push(p + ".sticker.width must be 0..120");
          if (node.sticker.color !== undefined) checkPaint(node.sticker.color, palette, p + ".sticker.color", errors);
          if (!node.cutout) errors.push(p + ".sticker needs cutout: true (it follows the image's transparency)");
        }
        if (node.treatment) {
          if (!["natural", "mono", "duotone", "halftone"].includes(node.treatment.mode)) errors.push(p + ".treatment.mode must be natural, mono, duotone or halftone");
          if (node.treatment.ink !== undefined) checkPaint(node.treatment.ink, palette, p + ".treatment.ink", errors);
          if (node.treatment.paper !== undefined) checkPaint(node.treatment.paper, palette, p + ".treatment.paper", errors);
          if (node.treatment.cell !== undefined && !inRange(node.treatment.cell, 2, 40)) errors.push(p + ".treatment.cell must be 2..40");
          if (node.treatment.contrast !== undefined && !inRange(node.treatment.contrast, .2, 4)) errors.push(p + ".treatment.contrast must be .2..4");
        }
        if (node.kenBurns) {
          const k = node.kenBurns;
          if (!int(k.start) || !int(k.end) || k.end <= k.start || !inRange(k.to, .5, 4) || (k.from !== undefined && !inRange(k.from, .5, 4)) ||
            (k.pan !== undefined && (!Array.isArray(k.pan) || k.pan.length !== 2 || !(k.pan as unknown[]).every((c: unknown) => inRange(c, -1, 1)))))
            errors.push(p + ".kenBurns needs start < end, zoom .5..4 and pan within -1..1");
        }
        break;
      case "spotlight":
        if (!inRange(node.width, 1, 16384) || !inRange(node.height, 1, 16384)) errors.push(p + ".width/height must be 1..16384");
        if (node.shape !== undefined && !["rect", "ellipse"].includes(node.shape)) errors.push(p + ".shape must be rect or ellipse");
        if (node.color !== undefined) checkPaint(node.color, palette, p + ".color", errors);
        if (node.dim !== undefined && !inRange(node.dim, 0, 1)) errors.push(p + ".dim must be 0..1");
        if (node.feather !== undefined && !inRange(node.feather, 0, 400)) errors.push(p + ".feather must be 0..400");
        break;
      case "map": {
        if (!inRange(node.width, 16, 16384) || !inRange(node.height, 16, 16384)) errors.push(p + ".width/height must be 16..16384");
        const b = node.bounds;
        if (!b || !inRange(b.west, -360, 360) || !inRange(b.east, -360, 360) || !inRange(b.south, -90, 90) || !inRange(b.north, -90, 90) || b.east <= b.west || b.north <= b.south)
          errors.push(p + ".bounds must have west < east and south < north");
        if (node.land !== undefined && node.land !== false) checkPaint(node.land, palette, p + ".land", errors);
        if (node.water !== undefined) checkPaint(node.water, palette, p + ".water", errors);
        if (node.coast !== undefined) checkPaint(node.coast, palette, p + ".coast", errors);
        if (node.relief !== undefined && node.relief.opacity !== undefined && !inRange(node.relief.opacity, 0, 1)) errors.push(p + ".relief.opacity must be 0..1");
        (node.regions as CollageMapRegion[] | undefined)?.forEach((r: CollageMapRegion, j: number) => {
          if (!r || !SLUG.test(r.id) || !Array.isArray(r.points) || r.points.length < 3) errors.push(p + ".regions[" + j + "] needs id and 3+ [lon,lat] points");
          else checkPaint(r.fill, palette, p + ".regions[" + j + "].fill", errors);
          if (r?.hatch !== undefined) checkPaint(r.hatch, palette, p + ".regions[" + j + "].hatch", errors);
        });
        break;
      }
      case "route":
        if (!Array.isArray(node.points) || node.points.length < 2 || node.points.length > 400 || !(node.points as unknown[][]).every((q: unknown[]) => Array.isArray(q) && q.length === 2 && q.every((c: unknown) => inRange(c, -16384, 16384))))
          errors.push(p + ".points must hold 2..400 [x,y] pairs");
        checkPaint(node.color, palette, p + ".color", errors);
        if (!inRange(node.width, .25, 120)) errors.push(p + ".width must be .25..120");
        if (node.arc !== undefined && !inRange(node.arc, -1, 1)) errors.push(p + ".arc must be -1..1");
        break;
      case "string":
        if (!Array.isArray(node.ends) || node.ends.length !== 2) errors.push(p + ".ends must be two points or node ids");
        if (node.color !== undefined) checkPaint(node.color, palette, p + ".color", errors);
        break;
      case "rig":
        for (const e of inspectRig(node.rig)) errors.push(p + ".rig." + e);
        if (node.look !== undefined && !["flat", "collage", "crayon", "riso", "ink", "blueprint"].includes(node.look)) errors.push(p + ".look is not a rig look");
        break;
      case "puppet":
        if (node.height !== undefined && !inRange(node.height, 20, 4000)) errors.push(p + ".height must be 20..4000");
        if (node.facing !== undefined && node.facing !== 1 && node.facing !== -1) errors.push(p + ".facing must be 1 or -1");
        for (const e of inspectPuppet(node.look, node.actions, duration, palette)) errors.push(p + "." + e);
        break;
      case "group": break;
    }
  });
  // Parents must exist, precede their children and form no cycle. Puppet parts are addressed as `puppet.part`.
  v.nodes.forEach((node, i) => {
    if (!node?.parent) return;
    const [base, part] = node.parent.split(".");
    const parent = ids.get(base);
    if (!parent) { errors.push("nodes[" + i + "].parent \"" + node.parent + "\" does not exist"); return; }
    if (part !== undefined && parent.kind !== "puppet") errors.push("nodes[" + i + "].parent part addressing works only on puppets");
    if (part !== undefined && !["head", "torso", "hand-front", "hand-back", "hips"].includes(part)) errors.push("nodes[" + i + "].parent part must be head, torso, hips, hand-front or hand-back");
    if (v.nodes!.indexOf(parent) > i) errors.push("nodes[" + i + "].parent must come before the child");
    if (node.geo && parent.kind !== "map") errors.push("nodes[" + i + "].geo needs a map parent");
  });
  v.nodes.forEach((node, i) => {
    if (node?.follow && !ids.has(node.follow.path)) errors.push("nodes[" + i + "].follow.path \"" + node.follow.path + "\" does not exist");
    else if (node?.follow) { const k = ids.get(node.follow.path)!.kind; if (k !== "route" && k !== "marker") errors.push("nodes[" + i + "].follow.path must be a route or marker"); }
    if (node?.kind === "string") (node.ends as (string | number[])[] | undefined)?.forEach((e: string | number[], j: number) => {
      if (typeof e === "string") { if (!ids.has(e)) errors.push("nodes[" + i + "].ends[" + j + "] \"" + e + "\" does not exist"); }
      else if (!Array.isArray(e) || e.length !== 2 || !e.every(finite)) errors.push("nodes[" + i + "].ends[" + j + "] must be [x,y] or a node id");
    });
    if ((node?.kind === "text" || node?.kind === "route" || node?.kind === "string") && node.from !== undefined && node.from >= duration) errors.push("nodes[" + i + "].from is after the scene ends");
  });
  return errors;
}

export function assertCollageScene(input: unknown): asserts input is CollageSceneSpec {
  const errors = inspectCollageScene(input);
  if (errors.length) throw new RangeError("Invalid COLLAGE1 scene: " + errors.slice(0, 12).join("; ") + (errors.length > 12 ? "; …" : ""));
}

/** Resolve a palette role or hex colour. Unknown roles fall back to ink black so a typo never vanishes silently in preview. */
export function paint(spec: Pick<CollageSceneSpec, "palette">, value: CollagePaint | undefined, fallback = "#1d1b19"): string {
  if (!value) return fallback;
  if (value.startsWith("#")) return value;
  return spec.palette?.[value] ?? fallback;
}

export const COLLAGE_KINDS = KINDS;
