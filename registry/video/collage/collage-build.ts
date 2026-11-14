/**
 * COLLAGE1 evaluation: static paper geometry (cached per node) and per-frame node poses.
 *
 * Geometry that never changes while a piece moves — its torn outline, white fibre core, sticker backing,
 * halftone dots, word layout, map coastlines — is built once per node object and cached in a WeakMap.
 * Per-frame work is only transforms, trims and wobble.
 */
import type { Point } from "./collage-geometry";
import {
  bounds, flattenPath, hash01, hashSigned, noise1, offsetLoop, paperEdge, pointAlong, polylineLength, resample,
  seedOf, shapeLoops, toPathD, toSmoothPathD,
} from "./collage-geometry";
import type { CollagePose } from "./collage-motion";
import { boilOffsets, channelAt, ease, loopOffsets, moveOffsets, REST_POSE, steppedFrame } from "./collage-motion";
import type {
  CollageCutoutNode, CollageHalftone, CollageMapNode, CollageMarkerNode, CollageNode, CollageRouteNode, CollageSceneSpec, CollageTextNode,
} from "./collage-scene";
import { LAND_OUTLINES } from "../land-outline-110m";
import { measureText, wrapText } from "./collage-type";

const memo = <K extends object, V>() => new WeakMap<K, V>();

// ---- Cutouts ---------------------------------------------------------------------------------------------------------------------

export interface CutoutGeometry {
  /** Visible paper face. */
  face: string;
  /** White fibre core showing along a torn edge, or a sticker backing. */
  core?: string;
  /** Silhouette used for the shadow and clip (the outermost paper). */
  silhouette: string;
  box: { x: number; y: number; width: number; height: number };
  dots?: string;
}
const cutoutCache = memo<object, CutoutGeometry>();

/** Physical outline of a cutout: shape → paper edge → optional torn core / sticker margin. */
export function cutoutGeometry(node: Pick<CollageCutoutNode, "id" | "shape" | "edge" | "roughness" | "backing" | "halftone">, sceneSeed: number): CutoutGeometry {
  const hit = cutoutCache.get(node);
  if (hit) return hit;
  const seed = seedOf(node.id, sceneSeed);
  const edge = node.edge ?? "cut";
  const loops = shapeLoops(node.shape);
  const faces = loops.map((loop, i) => paperEdge(loop, { style: edge, seed: seed + i * 17, roughness: node.roughness }));
  const face = faces.map(f => toPathD(f, true)).join("");
  let core: string | undefined, silhouette = face;
  const backing = node.backing ?? (edge === "torn" ? { width: 2.6, edge: "torn" as const } : undefined);
  if (backing && backing.width > 0) {
    const coreLoops = loops.map((loop, i) => paperEdge(offsetLoop(resample(loop, 3, true), backing.width), {
      style: backing.edge ?? (edge === "torn" ? "torn" : "cut"), seed: seed + 991 + i * 13,
      roughness: (backing.edge ?? edge) === "torn" ? (node.roughness ?? 3.2) * .9 : undefined,
    }));
    core = coreLoops.map(f => toPathD(f, true)).join("");
    silhouette = core;
  }
  const box = bounds(faces.flat());
  const geometry: CutoutGeometry = { face, core, silhouette, box, dots: node.halftone ? halftoneDots(box, node.halftone) : undefined };
  cutoutCache.set(node, geometry);
  return geometry;
}

/**
 * Amplitude-modulated halftone: a rotated dot screen whose dot area follows a linear shading ramp, so the
 * dots genuinely grow toward the shadow side rather than fading a fixed pattern.
 */
export function halftoneDots(box: { x: number; y: number; width: number; height: number }, h: CollageHalftone): string {
  const cell = h.cell ?? 7, angle = (h.angle ?? 45) * Math.PI / 180, toward = (h.toward ?? 0) * Math.PI / 180;
  const from = h.from ?? 0, to = h.to ?? .6;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2, reach = Math.hypot(box.width, box.height) / 2 + cell;
  const ux = Math.cos(angle), uy = Math.sin(angle), tx = Math.cos(toward), ty = Math.sin(toward);
  const span = Math.abs(box.width / 2 * tx) + Math.abs(box.height / 2 * ty) || 1;
  const parts: string[] = [];
  const n = Math.ceil(reach / cell);
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    const x = cx + (i * ux - j * uy) * cell, y = cy + (i * uy + j * ux) * cell;
    if (x < box.x - cell || x > box.x + box.width + cell || y < box.y - cell || y > box.y + box.height + cell) continue;
    const g = Math.min(1, Math.max(0, ((x - cx) * tx + (y - cy) * ty) / span * .5 + .5));
    const coverage = from + (to - from) * g;
    const r = cell * Math.sqrt(Math.max(0, coverage) / Math.PI) * 1.02;
    if (r < .22) continue;
    const f = (v: number) => Math.round(v * 100) / 100;
    parts.push(`M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0`);
    if (parts.length > 12000) break;
  }
  return parts.join("");
}

// ---- Text ------------------------------------------------------------------------------------------------------------------------

export interface TextWord { text: string; x: number; width: number; index: number; line: number }
export interface TextLine { y: number; x: number; width: number; words: TextWord[] }
export interface TextLayout { lines: TextLine[]; ascent: number; descent: number; width: number; height: number }
const textCache = memo<object, TextLayout>();

/** Word boxes for a text node at its rest size. Reused by slips, highlight sweeps and per-word reveals. */
export function textLayout(node: CollageTextNode): TextLayout {
  const hit = textCache.get(node);
  if (hit) return hit;
  const role = node.role ?? "body";
  const options = { role, size: node.size, weight: textWeight(node), letterSpacing: node.letterSpacing, uppercase: node.uppercase };
  const source = node.count ? node.text.replace("{n}", formatCount(node.count.to, node.count.decimals, node.count.separator)) : node.text;
  const raw = node.maxWidth ? wrapText(source, node.maxWidth, options) : source.split("\n");
  const lh = node.size * (node.lineHeight ?? (role === "headline" ? 1.02 : 1.28));
  const ascent = node.size * (role === "headline" ? .8 : .74), descent = node.size * (role === "headline" ? .06 : .24);
  let index = 0, widest = 0;
  const lines: TextLine[] = raw.map((text, li) => {
    const display = node.uppercase ? text.toUpperCase() : text;
    const width = measureText(display, options);
    widest = Math.max(widest, width);
    const x0 = node.align === "middle" ? -width / 2 : node.align === "end" ? -width : 0;
    const words: TextWord[] = [];
    const tokens = display.match(/[⺀-꓏가-힣豈-﫿＀-｠]|[^\s⺀-꓏가-힣豈-﫿＀-｠]+/g) ?? [];
    let cursor = 0;
    for (const token of tokens) {
      const at = display.indexOf(token, cursor);
      const before = measureText(display.slice(0, at), options) + (at > 0 ? (node.letterSpacing ?? 0) : 0);
      const w = measureText(token, options);
      words.push({ text: token, x: x0 + before, width: w, index: index++, line: li });
      cursor = at + token.length;
    }
    return { y: li * lh, x: x0, width, words };
  });
  const layout = { lines, ascent, descent, width: widest, height: (lines.length - 1) * lh + ascent + descent };
  textCache.set(node, layout);
  return layout;
}
/** Effective font weight: the same number drives measurement and rendering. */
export function textWeight(node: Pick<CollageTextNode, "weight" | "role">): number {
  return node.weight ?? (node.role === "headline" ? 400 : node.role === "label" ? 600 : 500);
}
export function formatCount(value: number, decimals = 0, separator = true): string {
  const fixed = value.toFixed(decimals);
  if (!separator) return fixed;
  const [int, frac] = fixed.split(".");
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (frac ? "." + frac : "");
}

/** A torn/cut paper slip behind a span of type. Geometry cached per (node, key). */
const slipCache = memo<object, Map<string, CutoutGeometry>>();
export function slipGeometry(node: CollageTextNode, key: string, x: number, y: number, width: number, height: number, sceneSeed: number): CutoutGeometry {
  let map = slipCache.get(node);
  if (!map) { map = new Map(); slipCache.set(node, map); }
  const hit = map.get(key);
  if (hit) return hit;
  const pseudo = {
    id: node.id + "-" + key,
    shape: { type: "polygon" as const, points: [[x, y], [x + width, y], [x + width, y + height], [x, y + height]] as [number, number][] },
    edge: node.slip?.edge ?? "cut", backing: node.slip?.backing,
  };
  const g = cutoutGeometry(pseudo, sceneSeed);
  map.set(key, g);
  return g;
}

// ---- Markers ---------------------------------------------------------------------------------------------------------------------

const markerCache = memo<object, Point[][]>();
/** Polylines a marker draws, in drawing order. Hand-made strokes: overshoots, uneven pressure paths. */
export function markerStrokes(node: CollageMarkerNode, sceneSeed: number): Point[][] {
  const hit = markerCache.get(node);
  if (hit) return hit;
  const seed = seedOf(node.id, sceneSeed);
  let strokes: Point[][] = [];
  const s = node.stroke;
  if (node.d) strokes = flattenPath(node.d, 3).map(sp => sp.points);
  else if (s?.type === "circle") {
    const loops = s.loops ?? 1.18, n = Math.round(90 * loops), pts: Point[] = [];
    const a0 = -Math.PI * .62 + hashSigned(seed, 1) * .3;
    for (let k = 0; k <= n; k++) {
      const t = k / n, a = a0 + t * loops * Math.PI * 2;
      const wob = 1 + noise1(seed, t * 5) * .045 + t * .05;
      pts.push([Math.cos(a) * s.width / 2 * wob, Math.sin(a) * s.height / 2 * wob * (1 - .04 * t)]);
    }
    strokes = [pts];
  } else if (s?.type === "underline") {
    const pts: Point[] = [];
    for (let k = 0; k <= 40; k++) { const t = k / 40; pts.push([t * s.width, Math.sin(t * Math.PI) * -2.5 + noise1(seed, t * 3) * 2 + t * 3]); }
    pts.push([s.width - 10, 12]);
    strokes = [pts];
  } else if (s?.type === "arrow") {
    const [ex, ey] = s.to, len = Math.hypot(ex, ey) || 1, nx = -ey / len, ny = ex / len, bend = (s.bend ?? .18) * len;
    const pts: Point[] = [];
    for (let k = 0; k <= 48; k++) { const t = k / 48, b = 4 * t * (1 - t) * bend; pts.push([ex * t + nx * b, ey * t + ny * b]); }
    const end = pts[pts.length - 1], prev = pts[pts.length - 5], ang = Math.atan2(end[1] - prev[1], end[0] - prev[0]), head = s.head ?? Math.min(34, len * .22);
    const wing = (d: number): Point[] => [[end[0] - Math.cos(ang + d) * head, end[1] - Math.sin(ang + d) * head], end];
    strokes = [pts, wing(.5), wing(-.46)];
  } else if (s?.type === "cross") {
    const h = s.size / 2;
    strokes = [[[-h, -h], [h * .1, -h * .05], [h, h * 1.05]], [[h, -h * .95], [-h * .05, h * .08], [-h * 1.05, h]]];
  } else if (s?.type === "check") {
    const z = s.size;
    strokes = [[[-z * .5, 0], [-z * .32, z * .16], [-z * .1, z * .42], [z * .55, -z * .48]]];
  } else if (s?.type === "scribble") {
    const passes = s.passes ?? 7, pts: Point[] = [];
    for (let k = 0; k <= passes; k++) {
      const x = (k / passes - .5) * s.width;
      pts.push([x, (k % 2 ? 1 : -1) * s.height / 2 + hashSigned(seed, k) * 4]);
    }
    strokes = [resample(pts, 3, false)];
  }
  strokes = strokes.map(p => p.length > 2 ? resample(p, 2.5, false) : p);
  markerCache.set(node, strokes);
  return strokes;
}
/** Boiling redraw: every held pose the hand wobbles a little differently along the same stroke. */
export function wobbleStroke(points: readonly Point[], seed: number, step: number, amount: number): Point[] {
  if (amount <= 0) return points.slice();
  let walked = 0;
  return points.map((p, i) => {
    if (i) walked += Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]);
    return [p[0] + noise1(seed + step * 31, walked / 40) * amount, p[1] + noise1(seed + step * 31 + 7, walked / 40) * amount] as Point;
  });
}
export { toSmoothPathD };

// ---- Maps and routes -------------------------------------------------------------------------------------------------------------

export function projectGeo(map: Pick<CollageMapNode, "width" | "height" | "bounds">, lon: number, lat: number): Point {
  const b = map.bounds;
  return [(lon - b.west) / (b.east - b.west) * map.width - map.width / 2, (b.north - lat) / (b.north - b.south) * map.height - map.height / 2];
}
export interface MapGeometry { land: string[]; core: string[]; regions: { id: string; face: string; core: string; fill: string }[]; graticule?: string }
const mapCache = memo<object, MapGeometry>();
/** Torn-paper continents: Natural Earth land projected into the map window, each coast torn by its own seed. */
export function mapGeometry(node: CollageMapNode, sceneSeed: number): MapGeometry {
  const hit = mapCache.get(node);
  if (hit) return hit;
  const seed = seedOf(node.id, sceneSeed), edge = node.edge ?? "torn";
  const b = node.bounds, padLon = (b.east - b.west) * .15, padLat = (b.north - b.south) * .15;
  const land: string[] = [], core: string[] = [];
  const pxPerDeg = node.width / (b.east - b.west);
  if (node.land !== false) LAND_OUTLINES.forEach((ring, i) => {
    let inside = false, west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
    for (const [lon, lat] of ring) { if (lon < west) west = lon; if (lon > east) east = lon; if (lat < south) south = lat; if (lat > north) north = lat; }
    inside = east >= b.west - padLon && west <= b.east + padLon && north >= b.south - padLat && south <= b.north + padLat;
    if (!inside) return;
    const pts = ring.map(([lon, lat]) => projectGeo(node, lon, lat));
    const box = bounds(pts);
    if (box.width < 3 && box.height < 3) return;
    const rough = Math.max(.8, Math.min(3.4, pxPerDeg * .5));
    land.push(toPathD(paperEdge(pts, { style: edge, seed: seed + i * 7, roughness: rough }), true));
    core.push(toPathD(paperEdge(offsetLoop(resample(pts, 3, true), 2.2), { style: edge, seed: seed + i * 7 + 3, roughness: rough * .9 }), true));
  });
  const regions = (node.regions ?? []).map((r, i) => {
    const pts = r.points.map(([lon, lat]) => projectGeo(node, lon, lat));
    const e = r.edge ?? "cut";
    return {
      id: r.id, fill: r.fill,
      face: toPathD(paperEdge(pts, { style: e, seed: seed + 5000 + i * 11 }), true),
      core: toPathD(paperEdge(offsetLoop(resample(pts, 3, true), 3), { style: e, seed: seed + 5003 + i * 11 }), true),
    };
  });
  let graticule: string | undefined;
  if (node.graticule) {
    const every = Math.max(1, node.graticule.every), parts: string[] = [];
    for (let lon = Math.ceil(b.west / every) * every; lon <= b.east; lon += every) { const [x] = projectGeo(node, lon, 0); parts.push(`M${x} ${-node.height / 2}V${node.height / 2}`); }
    for (let lat = Math.ceil(b.south / every) * every; lat <= b.north; lat += every) { const [, y] = projectGeo(node, 0, lat); parts.push(`M${-node.width / 2} ${y}H${node.width / 2}`); }
    graticule = parts.join("");
  }
  const geometry = { land, core, regions, graticule };
  mapCache.set(node, geometry);
  return geometry;
}

const routeCache = memo<object, Point[]>();
/** Route polyline in the route's local space; legs bow by `arc` like flight paths. */
export function routePolyline(node: CollageRouteNode, map?: CollageMapNode): Point[] {
  const hit = routeCache.get(node);
  if (hit) return hit;
  const pts = node.points.map(p => node.geoPoints && map ? projectGeo(map, p[0], p[1]) : [p[0], p[1]] as Point);
  const arc = node.arc ?? 0, out: Point[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = (b[1] - a[1]) / len, ny = -(b[0] - a[0]) / len;
    const n = Math.max(2, Math.ceil(len / 6));
    for (let k = 1; k <= n; k++) { const t = k / n, bow = 4 * t * (1 - t) * arc * len; out.push([a[0] + (b[0] - a[0]) * t + nx * bow, a[1] + (b[1] - a[1]) * t + ny * bow]); }
  }
  routeCache.set(node, out);
  return out;
}
export { pointAlong, polylineLength };

// ---- Per-frame node pose ---------------------------------------------------------------------------------------------------------

export interface NodeState { visible: boolean; pose: CollagePose; step: number; sampled: number }

/** Visibility window: explicit from/to, else the enter start and exit end. */
export function nodeWindow(node: CollageNode): [number, number] {
  const start = node.from ?? node.enter?.frame ?? 0;
  const end = node.to ?? (node.exit ? node.exit.frame + node.exit.duration : Infinity);
  return [start, end];
}

/**
 * Pose of a node at an absolute frame, before parent transforms. Pieces are sampled on their cadence;
 * `follow` and `geo` placements resolve against the supplied lookups.
 */
export function nodeState(spec: CollageSceneSpec, node: CollageNode, frame: number, lookup: {
  map?: CollageMapNode; follow?: (pathId: string) => { node: CollageNode; points: Point[] } | undefined;
}): NodeState {
  const [start, end] = nodeWindow(node);
  const cadence = node.cadence ?? (node.kind === "marker" || node.kind === "route" ? 1 : spec.cadence ?? 2);
  const sampled = steppedFrame(frame, cadence), step = Math.floor(frame / Math.max(1, cadence));
  const visible = frame >= start && frame < end;
  const keys = node.keys;
  const geo = node.geo && lookup.map ? projectGeo(lookup.map, node.geo[0], node.geo[1]) : undefined;
  const pose: CollagePose = {
    x: channelAt(keys, "x", sampled, geo ? geo[0] : node.x ?? 0),
    y: channelAt(keys, "y", sampled, geo ? geo[1] : node.y ?? 0),
    rotate: channelAt(keys, "rotate", sampled, node.rotate ?? 0),
    scale: channelAt(keys, "scale", sampled, node.scale ?? 1),
    scaleX: channelAt(keys, "scaleX", sampled, 1),
    scaleY: channelAt(keys, "scaleY", sampled, 1),
    opacity: channelAt(keys, "opacity", sampled, node.opacity ?? 1),
    lift: channelAt(keys, "lift", sampled, 0),
    progress: channelAt(keys, "progress", sampled, 1),
  };
  const apply = (o: Partial<CollagePose>) => {
    if (o.x !== undefined) pose.x += o.x;
    if (o.y !== undefined) pose.y += o.y;
    if (o.rotate !== undefined) pose.rotate += o.rotate;
    if (o.scale !== undefined) pose.scale *= o.scale;
    if (o.scaleX !== undefined) pose.scaleX *= o.scaleX;
    if (o.scaleY !== undefined) pose.scaleY *= o.scaleY;
    if (o.opacity !== undefined) pose.opacity *= o.opacity;
    if (o.lift !== undefined) pose.lift += o.lift;
    if (o.progress !== undefined) pose.progress = Math.min(pose.progress, o.progress);
  };
  if (node.follow && lookup.follow) {
    const target = lookup.follow(node.follow.path);
    if (target) {
      const f = node.follow, t = ease(f.ease ?? "inOut", (sampled - f.start) / (f.end - f.start));
      const along = (f.fromT ?? 0) + ((f.toT ?? 1) - (f.fromT ?? 0)) * t;
      const at = pointAlong(target.points, along);
      const tx = target.node.x ?? 0, ty = target.node.y ?? 0, tr = (target.node.rotate ?? 0) * Math.PI / 180, ts = target.node.scale ?? 1;
      pose.x = tx + (at.x * Math.cos(tr) - at.y * Math.sin(tr)) * ts;
      pose.y = ty + (at.x * Math.sin(tr) + at.y * Math.cos(tr)) * ts;
      if (f.orient) pose.rotate += at.angle + (target.node.rotate ?? 0);
    }
  }
  if (node.enter) {
    const p = (sampled - node.enter.frame) / Math.max(1, node.enter.duration);
    if (p < 1) apply(moveOffsets(node.enter, p));
  }
  if (node.exit) {
    const p = (sampled - node.exit.frame) / Math.max(1, node.exit.duration);
    if (p > 0) apply(moveOffsets({ ...node.exit, ease: node.exit.ease ?? "in" }, 1 - p));
  }
  const seed = seedOf(node.id, spec.seed);
  for (const loop of node.loops ?? []) apply(loopOffsets(loop, sampled, seed));
  const boil = node.boil ?? (node.kind === "marker" || node.kind === "route" || node.kind === "string" ? 0 : spec.boil ?? .45);
  if (cadence > 1 && boil > 0) apply(boilOffsets(seed, step, boil));
  return { visible: visible && pose.opacity > .002, pose, step, sampled };
}

/** SVG transform for a pose about a pivot. Lifted paper reads slightly larger, as it is nearer the lens. */
export function poseTransform(pose: CollagePose, pivot?: readonly [number, number]): string {
  const r = (v: number) => Math.round(v * 1000) / 1000;
  const lift = 1 + Math.max(0, pose.lift) * .035;
  const sx = pose.scale * pose.scaleX * lift, sy = pose.scale * pose.scaleY * lift;
  const [px, py] = pivot ?? [0, 0];
  const pivoted = px || py;
  return `translate(${r(pose.x)} ${r(pose.y)})` + (pivoted ? ` translate(${r(px)} ${r(py)})` : "") +
    (pose.rotate ? ` rotate(${r(pose.rotate)})` : "") + (sx !== 1 || sy !== 1 ? ` scale(${r(sx)} ${r(sy)})` : "") +
    (pivoted ? ` translate(${r(-px)} ${r(-py)})` : "");
}

export { REST_POSE, hash01 };
