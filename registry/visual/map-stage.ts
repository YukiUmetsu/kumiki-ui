/** MapStage core: caller-supplied GeoJSON-style geometry, each collection carrying a mandatory attribution, two pure
 * projections (equirectangular and orthographic) fitted aspect-preserving to a map lane, routes that draw by frame along
 * great circles, pins with measured label pills placed without collisions, a camera that eases to a feature's bounds
 * (keeping small neighbouring regions whole) and then holds, an optional graticule, and a header, legend and
 * attribution that are always drawn (wrapped, never truncated). Nothing is bundled or fetched, no geodesy database is
 * built, and caller geometry is drawn exactly as given. Evaluation is a pure function of the frame.
 */
import type { MeasureText } from "../media/text-layout";
import { evaluateEasing } from "../motion/easing";
import type { Diagnostic, RationalFps, Rect } from "../motion/types";
import { layoutCaptionLines } from "./caption-track";
import { samplePolylineAt } from "./flow-path";

export const MAP_PROJECTIONS = ["equirectangular", "orthographic"] as const;
export type MapProjectionKind = typeof MAP_PROJECTIONS[number];
/** [longitude, latitude] in degrees. */
export type MapPosition = readonly [number, number];
export type MapGeometry =
  | { type: "Point"; coordinates: MapPosition }
  | { type: "LineString"; coordinates: readonly MapPosition[] }
  | { type: "Polygon"; coordinates: readonly (readonly MapPosition[])[] }
  | { type: "MultiPolygon"; coordinates: readonly (readonly (readonly MapPosition[])[])[] };
export interface MapFeature {
  type: "Feature";
  id: string;
  geometry: MapGeometry;
  /** `name` labels a pin. `fillKey` colours a region through the legend. */
  properties?: { name?: string; fillKey?: string; [key: string]: unknown };
}
export interface MapAttribution { source: string; licence: string; url?: string }
export interface MapCollection {
  type: "FeatureCollection";
  id: string;
  attribution: MapAttribution;
  features: readonly MapFeature[];
}
export interface MapRoute {
  id: string;
  /** A LineString feature, drawn by progress. */
  featureId: string;
  /** Point features whose coordinates the route must start and end on. */
  from: string;
  to: string;
  color?: string;
  /** How a segment between two positions is drawn: along the great circle (default) or straight in longitude/latitude. */
  interpolation?: "geodesic" | "linear";
}
export interface MapLegendEntry { key: string; label: string; color?: string }
export type MapBeat =
  | { id: string; kind: "establish"; durationFrames: number }
  | { id: string; kind: "route"; routeId: string; durationFrames: number }
  /** `context` names features kept whole in view with the target. Without it, small regions near the target are kept whole. */
  | { id: string; kind: "focus"; targetId: string; context?: readonly string[]; durationFrames: number };
export interface MapStageSpec {
  id: string;
  fps: RationalFps;
  projection: MapProjectionKind;
  collections: readonly MapCollection[];
  routes?: readonly MapRoute[];
  legend?: readonly MapLegendEntry[];
  beats: readonly MapBeat[];
  /** Small line above the title: the subject, the projection, the period. */
  eyebrow?: string;
  title?: string;
  /** One honesty badge for the whole stage, e.g. "Fictional geometry" or "Licensed boundaries". */
  badge?: string;
  /** Graticule spacing in degrees. Omit for none. */
  graticuleDeg?: number;
  /** Frames the camera takes to ease into a beat's view, then holds. Default 36. */
  moveFrames?: number;
}
export interface MapStageDiagnostic extends Diagnostic { featureId?: string; beatId?: string; collectionId?: string }

export interface MapStageOptions {
  measure: MeasureText;
  /** CSS font family. Must match the view, or widths will be wrong. */
  family?: string;
  labelPx: number;
  legendPx: number;
  attributionPx: number;
  /** Title size. Default 1.55 × `labelPx`. */
  titlePx?: number;
  /** Eyebrow and badge size. Default `attributionPx`. */
  eyebrowPx?: number;
  /** Below this a text size warns `map-text-small`. */
  readablePx?: number;
  /** Outer margin. Default 5.5% of the short side. */
  marginPx?: number;
  /** Share of the fitted extent kept clear around it. Default 0.12. */
  padding?: number;
  /** Smallest extent a fitted view shows, in degrees, so one point gets a readable neighbourhood. Default 4. */
  minSpanDeg?: number;
}

export interface MapCamera { lon: number; lat: number; scale: number }
/** A measured block of wrapped text. Line `i` is centred on `rect.y + (i + 0.5) * lineHeight`. */
export interface MapTextBlock { lines: readonly string[]; font: string; sizePx: number; weight: number; lineHeight: number; rect: Rect }
export interface MapLegendItem { key: string; label: string; color: string; rect: Rect }
/** Where a pin's label pill sits, in px from the pin. `leader` pills are set off and joined by a short line. */
export interface MapLabelSlot { side: string; dx: number; dy: number; leader: boolean }
export interface MapStageLayout {
  box: Rect;
  /** The box minus its margins. */
  inner: Rect;
  projection: MapProjectionKind;
  header: { eyebrow?: MapTextBlock; title?: MapTextBlock; badge?: { pill: Rect; text: MapTextBlock } };
  /** The map lane: everything between the header and the legend. Geometry is clipped to it. */
  viewport: Rect;
  cornerRadius: number;
  legend: { rect: Rect; items: readonly MapLegendItem[]; swatch: number; gap: number; font: string; sizePx: number };
  attribution: { rect: Rect; lines: readonly string[]; font: string; lineHeight: number; block?: MapTextBlock };
  label: { font: string; sizePx: number; padX: number; gap: number; height: number; markerRadius: number; haloRadius: number };
  route: { arrow: number; endInset: number };
  pinLabels: Readonly<Record<string, { text: string; width: number }>>;
  /** Route positions after interpolation (great-circle by default). Endpoints are the caller's exact positions. */
  routePaths: Readonly<Record<string, readonly MapPosition[]>>;
  /** One settled camera per beat. Empty when the spec is refused. */
  cameras: readonly MapCamera[];
  /** One label placement per beat, chosen at its settled camera. */
  slots: readonly Readonly<Record<string, MapLabelSlot>>[];
  diagnostics: MapStageDiagnostic[];
}

export type MapScreenPoint = [number, number];
export interface MapFeatureFrame {
  id: string;
  kind: "region" | "line";
  fill?: string;
  /** False when any vertex is behind the horizon of an orthographic view; such a feature is not drawn. */
  visible: boolean;
  rings: MapScreenPoint[][];
}
export interface MapRouteFrame {
  id: string;
  color: string;
  progress: number;
  visible: boolean;
  /** True while the route's own beat runs. */
  active: boolean;
  /** The drawn trail, from the start to the head. */
  points: MapScreenPoint[];
  /** The part still to draw, from the head to the end (shown while the route is active). */
  remainder: MapScreenPoint[];
  head?: MapScreenPoint;
  /** Direction of travel at the head, in radians (screen space). */
  headAngle?: number;
}
export interface MapPinFrame {
  id: string;
  text: string;
  x: number;
  y: number;
  /** False behind an orthographic horizon. */
  visible: boolean;
  /** True when the marker is inside the map lane. Labels of other pins are not drawn. */
  inView: boolean;
  labelRect: Rect;
  leader: boolean;
  /** Fades only while a label moves to a new slot between beats. */
  labelOpacity: number;
}
export interface MapStageFrame {
  beatIndex: number;
  beat: MapBeat;
  /** Frames since the current beat started. */
  local: number;
  camera: MapCamera;
  /** 0→1 as the camera settles into the beat's view. */
  settle: number;
  features: MapFeatureFrame[];
  routes: MapRouteFrame[];
  pins: MapPinFrame[];
  /** Graticule polylines in screen space (empty without `graticuleDeg`). */
  graticule: MapScreenPoint[][];
}

const D2R = Math.PI / 180;
const REGION_FALLBACK = "var(--km-map-land, #e8e3d3)";
const FILL_PALETTE = ["#cbdcbc", "#eed8ad", "#d8cce8", "#efc9b9", "#bcd8d3"];
const TEXT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const LINE = 1.25;
const fontFor = (px: number, family: string, weight = 400) => `${weight} ${px}px ${family}`;
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const sameTuple = (a: unknown, b: unknown) => Array.isArray(a) && Array.isArray(b) && a[0] === b[0] && a[1] === b[1];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Longitude offset from the centre, wrapped to [-180, 180) degrees. */
const wrapDelta = (lon: number, centre: number) => ((((lon - centre + 540) % 360) + 360) % 360) - 180;

/** Projects one position about a centre, in radians of projected units. `visible` is false behind an orthographic horizon. */
export function projectMapPosition(projection: MapProjectionKind, centre: { lon: number; lat: number }, [lon, lat]: MapPosition): { x: number; y: number; visible: boolean } {
  const dl = wrapDelta(lon, centre.lon) * D2R, phi = lat * D2R, phi0 = centre.lat * D2R;
  if (projection === "equirectangular") return { x: dl * Math.cos(phi0), y: phi - phi0, visible: true };
  const cosC = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(dl);
  return {
    x: Math.cos(phi) * Math.sin(dl),
    y: Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(dl),
    visible: cosC >= 0,
  };
}

const toVector = ([lon, lat]: MapPosition) => [Math.cos(lat * D2R) * Math.cos(lon * D2R), Math.cos(lat * D2R) * Math.sin(lon * D2R), Math.sin(lat * D2R)];
const arcBetween = (a: MapPosition, b: MapPosition) => {
  const va = toVector(a), vb = toVector(b);
  return Math.acos(Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2])));
};

/** The point a fraction `t` of the way along the great circle from `a` to `b`. Antipodal or equal points fall back to a straight blend. */
export function interpolateGreatCircle(a: MapPosition, b: MapPosition, t: number): MapPosition {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const w = arcBetween(a, b);
  if (w < 1e-9 || Math.PI - w < 1e-6) return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const va = toVector(a), vb = toVector(b), s = Math.sin(w), ka = Math.sin((1 - t) * w) / s, kb = Math.sin(t * w) / s;
  const v = [ka * va[0] + kb * vb[0], ka * va[1] + kb * vb[1], ka * va[2] + kb * vb[2]];
  return [Math.atan2(v[1], v[0]) / D2R, Math.asin(Math.max(-1, Math.min(1, v[2]))) / D2R];
}

/** Inserts great-circle points every half degree of arc. The caller's own positions are kept exactly. */
function densifyRoute(positions: readonly MapPosition[], mode: MapRoute["interpolation"]): MapPosition[] {
  if (mode === "linear" || positions.length < 2) return [...positions];
  const out: MapPosition[] = [positions[0]];
  for (let i = 1; i < positions.length; i += 1) {
    const a = positions[i - 1], b = positions[i], steps = Math.max(1, Math.ceil(arcBetween(a, b) / D2R / 0.5));
    for (let k = 1; k < steps; k += 1) out.push(interpolateGreatCircle(a, b, k / steps));
    out.push(b);
  }
  return out;
}

function positionsOf(geometry: MapGeometry): MapPosition[] {
  if (geometry.type === "Point") return [geometry.coordinates];
  if (geometry.type === "LineString") return [...geometry.coordinates];
  if (geometry.type === "Polygon") return geometry.coordinates.flatMap(ring => [...ring]);
  return geometry.coordinates.flatMap(polygon => polygon.flatMap(ring => [...ring]));
}

function positionIssue(position: unknown): "invalid" | "range" | undefined {
  if (!Array.isArray(position) || position.length !== 2 || !isNumber(position[0]) || !isNumber(position[1])) return "invalid";
  return Math.abs(position[0]) > 180 || Math.abs(position[1]) > 90 ? "range" : undefined;
}

/** Structural checks that need no measurement: attribution, geometry, references, legend keys and beat targets. */
export function checkMapSpec(spec: MapStageSpec): MapStageDiagnostic[] {
  const out: MapStageDiagnostic[] = [];
  const report = (severity: "error" | "warning", code: string, message: string, extra: Partial<MapStageDiagnostic> = {}) =>
    out.push({ code, severity, message, ...extra });
  if (!(MAP_PROJECTIONS as readonly string[]).includes(spec.projection))
    report("error", "map-projection-unknown", `Projection "${String(spec.projection)}" is not supported; use equirectangular or orthographic.`);
  if (spec.graticuleDeg !== undefined && !(isNumber(spec.graticuleDeg) && spec.graticuleDeg >= 1 && spec.graticuleDeg <= 90))
    report("error", "map-graticule-invalid", `Graticule spacing ${String(spec.graticuleDeg)}° must be a number from 1 to 90.`);

  const features = new Map<string, MapFeature>();
  for (const collection of spec.collections) {
    const attribution = collection.attribution as Partial<MapAttribution> | undefined;
    if (!attribution || !nonEmpty(attribution.source) || !nonEmpty(attribution.licence))
      report("error", "map-attribution-missing", `Collection "${collection.id}" needs an attribution with a source and a licence. Geometry without them is refused.`, { collectionId: collection.id });
    else if (attribution.url !== undefined && !isHttpUrl(attribution.url))
      report("error", "map-attribution-url-invalid", `Collection "${collection.id}" links to "${String(attribution.url)}", which is not an http(s) URL.`, { collectionId: collection.id });
    for (const feature of collection.features) {
      if (features.has(feature.id)) {
        report("error", "map-feature-duplicate", `Feature id "${feature.id}" appears twice.`, { featureId: feature.id, collectionId: collection.id });
        continue;
      }
      features.set(feature.id, feature);
      checkGeometry(feature, collection.id, report);
    }
  }
  if (features.size === 0) report("error", "map-no-geometry", "The map has no features to draw.");

  const legendKeys = new Set<string>();
  for (const entry of spec.legend ?? []) {
    if (legendKeys.has(entry.key)) report("error", "map-legend-duplicate", `Legend key "${entry.key}" appears twice.`);
    legendKeys.add(entry.key);
  }
  const usedKeys = new Set<string>();
  for (const feature of features.values()) {
    const key = feature.properties?.fillKey;
    if ((feature.geometry.type !== "Polygon" && feature.geometry.type !== "MultiPolygon") || key === undefined) continue;
    usedKeys.add(key);
    if (!legendKeys.has(key)) report("error", "map-fill-key-unknown", `Region "${feature.id}" uses fill key "${key}", which the legend does not explain.`, { featureId: feature.id });
  }
  for (const key of legendKeys) if (!usedKeys.has(key)) report("warning", "map-legend-unused", `Legend entry "${key}" colours no region.`);

  const routeIds = new Set<string>();
  for (const route of spec.routes ?? []) {
    if (routeIds.has(route.id)) report("error", "map-route-duplicate", `Route "${route.id}" appears twice.`);
    routeIds.add(route.id);
    const line = features.get(route.featureId), from = features.get(route.from), to = features.get(route.to);
    if (!line || line.geometry.type !== "LineString")
      report("error", "map-route-unknown", `Route "${route.id}" draws feature "${route.featureId}", which is not a LineString in the collections.`, { featureId: route.featureId });
    if (!from || from.geometry.type !== "Point")
      report("error", "map-route-unknown", `Route "${route.id}" starts at "${route.from}", which is not a pin in the collections.`, { featureId: route.from });
    if (!to || to.geometry.type !== "Point")
      report("error", "map-route-unknown", `Route "${route.id}" ends at "${route.to}", which is not a pin in the collections.`, { featureId: route.to });
    if (line?.geometry.type === "LineString" && from?.geometry.type === "Point" && to?.geometry.type === "Point") {
      const points = line.geometry.coordinates;
      if (points.length < 2 || !sameTuple(points[0], from.geometry.coordinates) || !sameTuple(points[points.length - 1], to.geometry.coordinates))
        report("error", "map-route-endpoint-mismatch", `Route "${route.id}" must start and end exactly on pins "${route.from}" and "${route.to}".`, { featureId: route.featureId });
    }
  }
  const beatRoutes = new Set(spec.beats.flatMap(b => b.kind === "route" ? [b.routeId] : []));
  for (const route of spec.routes ?? []) if (!beatRoutes.has(route.id))
    report("warning", "map-route-unused", `Route "${route.id}" has no beat, so it will never be drawn.`);

  if (spec.beats.length === 0) report("error", "map-beat-invalid", "The map needs at least one beat.");
  for (const beat of spec.beats) {
    if (!Number.isSafeInteger(beat.durationFrames) || beat.durationFrames < 1)
      report("error", "map-beat-invalid", `Beat "${beat.id}" needs a positive integer duration.`, { beatId: beat.id });
    if (beat.kind === "route" && !routeIds.has(beat.routeId))
      report("error", "map-target-unknown", `Beat "${beat.id}" draws route "${beat.routeId}", which is not declared.`, { beatId: beat.id });
    if (beat.kind === "focus") {
      if (!features.has(beat.targetId))
        report("error", "map-target-unknown", `Beat "${beat.id}" focuses "${beat.targetId}", which is not a feature.`, { beatId: beat.id });
      for (const id of beat.context ?? []) if (!features.has(id))
        report("error", "map-target-unknown", `Beat "${beat.id}" keeps "${id}" in view, which is not a feature.`, { beatId: beat.id });
    }
    const kind = (beat as { kind: string }).kind;
    if (kind !== "establish" && kind !== "route" && kind !== "focus")
      report("error", "map-beat-invalid", `Beat "${beat.id}" has an unknown kind.`, { beatId: beat.id });
  }
  return out;
}

function checkGeometry(feature: MapFeature, collectionId: string, report: (severity: "error" | "warning", code: string, message: string, extra?: Partial<MapStageDiagnostic>) => void) {
  const geometry = feature.geometry as { type: string; coordinates?: unknown };
  const reported = new Set<string>();
  const once = (severity: "error" | "warning", code: string, message: string) => {
    if (reported.has(code)) return;
    reported.add(code);
    report(severity, code, `Feature "${feature.id}": ${message}`, { featureId: feature.id, collectionId });
  };
  const checkPositions = (positions: unknown[]) => {
    for (const position of positions) {
      const issue = positionIssue(position);
      if (issue === "invalid") once("error", "map-position-invalid", "a position is not a [longitude, latitude] pair of finite numbers.");
      if (issue === "range") once("error", "map-coordinate-range", "a coordinate is outside longitude ±180 or latitude ±90.");
    }
  };
  const antimeridian = (positions: unknown[]) => {
    for (let i = 1; i < positions.length; i += 1) {
      const a = positions[i - 1], b = positions[i];
      if (positionIssue(a) || positionIssue(b)) continue;
      if (Math.abs((a as MapPosition)[0] - (b as MapPosition)[0]) > 180)
        once("warning", "map-antimeridian", "consecutive vertices jump more than 180° of longitude; the shape may cross the antimeridian and draw the wrong way round.");
    }
  };
  const ring = (r: unknown) => {
    if (!Array.isArray(r) || r.length < 4) return once("error", "map-ring-invalid", "a polygon ring needs at least four positions.");
    checkPositions(r);
    antimeridian(r);
    if (!sameTuple(r[0], r[r.length - 1])) once("error", "map-ring-open", "a polygon ring must be closed (first position equal to last).");
  };
  switch (geometry.type) {
    case "Point":
      checkPositions([geometry.coordinates]);
      break;
    case "LineString": {
      const points = geometry.coordinates;
      if (!Array.isArray(points) || points.length < 2) once("error", "map-line-invalid", "a line needs at least two positions.");
      else { checkPositions(points); antimeridian(points); }
      break;
    }
    case "Polygon":
      if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) once("error", "map-ring-invalid", "a polygon needs at least one ring.");
      else geometry.coordinates.forEach(ring);
      break;
    case "MultiPolygon":
      if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) once("error", "map-ring-invalid", "a multipolygon needs at least one polygon.");
      else geometry.coordinates.forEach((polygon: unknown) => {
        if (!Array.isArray(polygon) || polygon.length === 0) once("error", "map-ring-invalid", "a polygon needs at least one ring.");
        else polygon.forEach(ring);
      });
      break;
    default:
      once("error", "map-geometry-unsupported", `geometry type "${String(geometry.type)}" is not Point, LineString, Polygon or MultiPolygon.`);
  }
}

/** Largest scale at which the target's visible extent, padded, fits the viewport. Centre is the middle of its bounds. */
function fitCamera(projection: MapProjectionKind, positions: readonly MapPosition[], viewport: Rect, padding: number, minSpanDeg: number): MapCamera {
  const lons = positions.map(p => p[0]), lats = positions.map(p => p[1]);
  const lon = (Math.min(...lons) + Math.max(...lons)) / 2, lat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const visible = positions.map(p => projectMapPosition(projection, { lon, lat }, p)).filter(p => p.visible);
  if (visible.length === 0) return { lon, lat, scale: 1e-6 };
  const xs = visible.map(p => p.x), ys = visible.map(p => p.y), minSpan = minSpanDeg * D2R;
  const w = Math.max(Math.max(...xs) - Math.min(...xs), minSpan), h = Math.max(Math.max(...ys) - Math.min(...ys), minSpan);
  // The bounds' centre in projected space, so a lopsided target still sits in the middle of the lane.
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const scale = Math.max(Math.min(viewport.width / (w * (1 + 2 * padding)), viewport.height / (h * (1 + 2 * padding))), 1e-6);
  const shifted = projection === "equirectangular" ? { lon: lon + cx / Math.max(1e-6, Math.cos(lat * D2R)) / D2R, lat: lat + cy / D2R } : { lon, lat };
  return { ...shifted, scale };
}

function toScreen(viewport: Rect, camera: MapCamera, p: { x: number; y: number }): MapScreenPoint {
  return [viewport.x + viewport.width / 2 + camera.scale * p.x, viewport.y + viewport.height / 2 - camera.scale * p.y];
}

function tweenCamera(a: MapCamera, b: MapCamera, t: number): MapCamera {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return {
    lon: a.lon + wrapDelta(b.lon, a.lon) * t,
    lat: a.lat + (b.lat - a.lat) * t,
    scale: Math.exp(Math.log(a.scale) + (Math.log(b.scale) - Math.log(a.scale)) * t),
  };
}

/** Total length in frames. */
export function mapStageDuration(spec: MapStageSpec): number {
  return spec.beats.reduce((n, beat) => n + beat.durationFrames, 0);
}

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const inside = (r: Rect, outer: Rect) => r.x >= outer.x && r.y >= outer.y && r.x + r.width <= outer.x + outer.width && r.y + r.height <= outer.y + outer.height;
const grow = (r: Rect, by: number): Rect => ({ x: r.x - by, y: r.y - by, width: r.width + 2 * by, height: r.height + 2 * by });
const shrink = (r: Rect, by: number): Rect => grow(r, -by);
const pointIn = (x: number, y: number, r: Rect) => x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
const disc = (x: number, y: number, r: number): Rect => ({ x: x - r, y: y - r, width: 2 * r, height: 2 * r });

/** Every place a label pill may sit, nearest first. The far slots are joined to their pin by a leader. */
function candidateSlots(textWidth: number, label: MapStageLayout["label"]): MapLabelSlot[] {
  const w = textWidth + 2 * label.padX, h = label.height, near = label.haloRadius + label.gap, far = label.sizePx * 1.9, d = near * .72;
  return [
    { side: "right", dx: near, dy: -h / 2, leader: false },
    { side: "left", dx: -near - w, dy: -h / 2, leader: false },
    { side: "above", dx: -w / 2, dy: -near - h, leader: false },
    { side: "below", dx: -w / 2, dy: near, leader: false },
    { side: "upper-right", dx: d, dy: -d - h, leader: false },
    { side: "lower-right", dx: d, dy: d, leader: false },
    { side: "upper-left", dx: -d - w, dy: -d - h, leader: false },
    { side: "lower-left", dx: -d - w, dy: d, leader: false },
    { side: "right-far", dx: near + far, dy: -h / 2, leader: true },
    { side: "left-far", dx: -near - far - w, dy: -h / 2, leader: true },
    { side: "above-far", dx: -w / 2, dy: -near - far - h, leader: true },
    { side: "below-far", dx: -w / 2, dy: near + far, leader: true },
  ];
}
const slotRect = (x: number, y: number, slot: MapLabelSlot, textWidth: number, label: MapStageLayout["label"]): Rect =>
  ({ x: x + slot.dx, y: y + slot.dy, width: textWidth + 2 * label.padX, height: label.height });

interface ScreenPin { id: string; x: number; y: number; width: number }
function screenPins(spec: MapStageSpec, camera: MapCamera, viewport: Rect, pinLabels: MapStageLayout["pinLabels"]): ScreenPin[] {
  const out: ScreenPin[] = [];
  for (const collection of spec.collections) for (const feature of collection.features) {
    if (feature.geometry.type !== "Point") continue;
    const p = projectMapPosition(spec.projection, camera, feature.geometry.coordinates);
    const [x, y] = toScreen(viewport, camera, p);
    if (p.visible && pointIn(x, y, viewport)) out.push({ id: feature.id, x, y, width: pinLabels[feature.id].width });
  }
  return out;
}

/** Zooms out until every pin in the lane has at least one slot whose label fits inside the lane. */
function keepLabelsInside(spec: MapStageSpec, camera: MapCamera, viewport: Rect, pinLabels: MapStageLayout["pinLabels"], label: MapStageLayout["label"]): MapCamera {
  let current = camera;
  const room = shrink(viewport, label.gap * .5);
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const clipped = screenPins(spec, current, viewport, pinLabels)
      .some(pin => !candidateSlots(pin.width, label).some(slot => inside(slotRect(pin.x, pin.y, slot, pin.width, label), room)));
    if (!clipped) return current;
    current = { ...current, scale: current.scale * .97 };
  }
  return current;
}

/** Greedy, deterministic placement at a settled camera: priority pins first, each takes the nearest free slot inside the lane,
 * keeping its previous slot when that still works so labels do not hop between beats. */
function placeLabels(spec: MapStageSpec, beat: MapBeat, camera: MapCamera, viewport: Rect, pinLabels: MapStageLayout["pinLabels"],
  label: MapStageLayout["label"], previous?: Readonly<Record<string, MapLabelSlot>>): Record<string, MapLabelSlot> {
  const pins = screenPins(spec, camera, viewport, pinLabels);
  const priority = new Set<string>();
  if (beat.kind === "focus") priority.add(beat.targetId);
  if (beat.kind === "route") {
    const route = spec.routes?.find(r => r.id === beat.routeId);
    if (route) { priority.add(route.from); priority.add(route.to); }
  }
  const ordered = [...pins.filter(p => priority.has(p.id)), ...pins.filter(p => !priority.has(p.id))];
  const room = shrink(viewport, label.gap * .5), clearance = label.gap * .6;
  const placed: Rect[] = [], slots: Record<string, MapLabelSlot> = {};
  for (const pin of ordered) {
    const candidates = candidateSlots(pin.width, label);
    const prior = previous?.[pin.id];
    if (prior) candidates.sort((a, b) => Number(b.side === prior.side) - Number(a.side === prior.side));
    const free = candidates.find(slot => {
      const rect = slotRect(pin.x, pin.y, slot, pin.width, label);
      return inside(rect, room) && !placed.some(r => overlaps(grow(rect, clearance), r))
        && !pins.some(other => other.id !== pin.id && overlaps(grow(rect, clearance), disc(other.x, other.y, label.haloRadius)));
    }) ?? candidates[0];
    slots[pin.id] = free;
    placed.push(slotRect(pin.x, pin.y, free, pin.width, label));
  }
  for (const id of Object.keys(pinLabels)) slots[id] ??= previous?.[id] ?? candidateSlots(pinLabels[id].width, label)[0];
  return slots;
}

interface LonLatBox { minLon: number; maxLon: number; minLat: number; maxLat: number }
const boxOf = (positions: readonly MapPosition[]): LonLatBox => ({
  minLon: Math.min(...positions.map(p => p[0])), maxLon: Math.max(...positions.map(p => p[0])),
  minLat: Math.min(...positions.map(p => p[1])), maxLat: Math.max(...positions.map(p => p[1])),
});

/** What a beat frames: everything, the route, or the target plus its context (named features, or small regions it touches). */
function framedPositions(spec: MapStageSpec, beat: MapBeat, byId: ReadonlyMap<string, MapFeature>, routePaths: MapStageLayout["routePaths"],
  all: readonly MapPosition[], minSpanDeg: number): MapPosition[] {
  if (beat.kind === "establish") return [...all];
  const base = beat.kind === "route" ? [...routePaths[beat.routeId]] : positionsOf(byId.get(beat.targetId)!.geometry);
  const named = beat.kind === "focus" && beat.context ? beat.context.flatMap(id => positionsOf(byId.get(id)!.geometry)) : [];
  if (beat.kind === "focus" && beat.context) return [...base, ...named];
  const b = boxOf(base), half = minSpanDeg / 2;
  const cLon = (b.minLon + b.maxLon) / 2, cLat = (b.minLat + b.maxLat) / 2;
  const win: LonLatBox = { minLon: Math.min(b.minLon, cLon - half), maxLon: Math.max(b.maxLon, cLon + half),
    minLat: Math.min(b.minLat, cLat - half), maxLat: Math.max(b.maxLat, cLat + half) };
  const extra: MapPosition[] = [];
  for (const feature of byId.values()) {
    if (feature.geometry.type !== "Polygon" && feature.geometry.type !== "MultiPolygon") continue;
    const r = boxOf(positionsOf(feature.geometry));
    const touches = r.minLon <= win.maxLon && r.maxLon >= win.minLon && r.minLat <= win.maxLat && r.maxLat >= win.minLat;
    const small = r.maxLon - r.minLon <= 1.6 * (win.maxLon - win.minLon) && r.maxLat - r.minLat <= 1.6 * (win.maxLat - win.minLat);
    if (touches && small) extra.push(...positionsOf(feature.geometry));
  }
  return [...base, ...extra];
}

function emptyLayout(spec: MapStageSpec, box: { width: number; height: number }, diagnostics: MapStageDiagnostic[], options: MapStageOptions): MapStageLayout {
  const font = fontFor(options.labelPx, options.family ?? TEXT_STACK);
  const zero = { x: 0, y: 0, width: 0, height: 0 };
  return {
    box: { x: 0, y: 0, ...box }, inner: { x: 0, y: 0, ...box }, projection: spec.projection, header: {}, viewport: { x: 0, y: 0, ...box }, cornerRadius: 0,
    legend: { rect: zero, items: [], swatch: 0, gap: 0, font, sizePx: options.legendPx },
    attribution: { rect: zero, lines: [], font, lineHeight: 0 },
    label: { font, sizePx: options.labelPx, padX: 0, gap: 0, height: 0, markerRadius: 0, haloRadius: 0 },
    route: { arrow: 0, endInset: 0 }, pinLabels: {}, routePaths: {}, cameras: [], slots: [], diagnostics,
  };
}

/**
 * Lays the stage out in `box`: a header (eyebrow, title, one badge), the map lane, then the legend (wrapped by measured width)
 * and the attribution (wrapped, never truncated) at the bottom. Each beat gets a settled camera fitted to its target and a label
 * placement. Structural errors refuse the spec; the frame checks (label collisions, hidden features, labels outside the lane)
 * run over every frame of a valid spec.
 */
export function layoutMapStage(spec: MapStageSpec, box: { width: number; height: number }, options: MapStageOptions): MapStageLayout {
  const diagnostics = checkMapSpec(spec);
  if (diagnostics.some(d => d.severity === "error")) return emptyLayout(spec, box, diagnostics, options);
  const { measure } = options, family = options.family ?? TEXT_STACK;
  const short = Math.min(box.width, box.height);
  const margin = options.marginPx ?? Math.round(short * .055);
  const inner: Rect = { x: margin, y: margin, width: box.width - 2 * margin, height: box.height - 2 * margin };
  const titlePx = options.titlePx ?? Math.round(options.labelPx * 1.55), eyebrowPx = options.eyebrowPx ?? options.attributionPx;
  const gap = Math.round(options.attributionPx * .6);
  const readable = options.readablePx;
  if (readable !== undefined) for (const [name, px] of [["Pin labels", options.labelPx], ["Legend", options.legendPx], ["Attribution", options.attributionPx], ["Eyebrow", eyebrowPx]] as const) {
    if (px < readable) diagnostics.push({ code: "map-text-small", severity: "warning",
      message: `${name} is ${px} px, under the ${readable} px comfortable size for this output; use a larger frame or less text.` });
  }
  const measurable = measure(fontFor(options.labelPx, family), "M") > 0;
  if (!measurable) diagnostics.push({ code: "map-measure-unavailable", severity: "error", message: "No text measurer is available; supply a real font measurer so labels, legend and attribution can be sized." });

  const block = (text: string, sizePx: number, weight: number, maxWidth: number, maxLines: number, code: string, what: string, x: number, y: number): MapTextBlock | undefined => {
    const font = fontFor(sizePx, family, weight), lineHeight = Math.round(sizePx * LINE);
    const wrapped = layoutCaptionLines({ text, measure, font, lineHeightPx: lineHeight, maxWidthPx: maxWidth, maxLines });
    if (!wrapped.ok) {
      if (measurable) diagnostics.push({ code, severity: "error",
        message: `The ${what} needs more than ${maxLines} line${maxLines > 1 ? "s" : ""} or has a word wider than ${Math.round(maxWidth)} px at ${sizePx} px. Shorten it or use a wider output. Nothing is truncated.` });
      return undefined;
    }
    return { lines: wrapped.lines.map(l => l.text), font, sizePx, weight, lineHeight, rect: { x, y, width: wrapped.width, height: wrapped.lines.length * lineHeight } };
  };

  /* Header: eyebrow, title, one honesty badge. */
  let top = inner.y;
  const header: MapStageLayout["header"] = {};
  if (nonEmpty(spec.eyebrow)) {
    header.eyebrow = block(spec.eyebrow, eyebrowPx, 650, inner.width, 2, "map-header-unfit", "eyebrow", inner.x, top);
    if (header.eyebrow) top += header.eyebrow.rect.height + gap * .35;
  }
  if (nonEmpty(spec.title)) {
    header.title = block(spec.title, titlePx, 700, inner.width, 2, "map-header-unfit", "title", inner.x, top);
    if (header.title) top += header.title.rect.height + gap * .8;
  }
  if (nonEmpty(spec.badge)) {
    const padX = Math.round(eyebrowPx * .75), pillH = Math.round(eyebrowPx * 1.75);
    const text = block(spec.badge, eyebrowPx, 600, inner.width - padX * 2, 1, "map-header-unfit", "badge", inner.x + padX, top + (pillH - Math.round(eyebrowPx * LINE)) / 2);
    if (text) {
      header.badge = { pill: { x: inner.x, y: top, width: text.rect.width + padX * 2, height: pillH }, text };
      top += pillH;
    }
  }
  if (top > inner.y) top += gap * 1.4;

  /* Bottom lane, built upwards: the attribution, then the legend above it. */
  let bottom = inner.y + inner.height;
  const attributionText = spec.collections.map(c => `Source: ${c.attribution.source}. Licence: ${c.attribution.licence}.${c.attribution.url ? ` ${c.attribution.url}` : ""}`).join("\n");
  const attributionFont = fontFor(options.attributionPx, family), attributionLine = Math.round(options.attributionPx * LINE);
  const wrapped = layoutCaptionLines({ text: attributionText, measure, font: attributionFont, lineHeightPx: attributionLine, maxWidthPx: inner.width, maxLines: 6 });
  let attribution: MapStageLayout["attribution"] = { rect: { x: inner.x, y: bottom, width: inner.width, height: 0 }, lines: [], font: attributionFont, lineHeight: attributionLine };
  if (wrapped.ok) {
    const height = wrapped.lines.length * attributionLine;
    bottom -= height;
    const rect = { x: inner.x, y: bottom, width: wrapped.width, height };
    attribution = { rect, lines: wrapped.lines.map(l => l.text), font: attributionFont, lineHeight: attributionLine,
      block: { lines: wrapped.lines.map(l => l.text), font: attributionFont, sizePx: options.attributionPx, weight: 400, lineHeight: attributionLine, rect } };
    bottom -= gap * .9;
  } else if (measurable) diagnostics.push({ code: "map-attribution-unfit", severity: "error",
    message: `The attribution has a word or line wider than the ${Math.round(inner.width)} px lane at ${options.attributionPx} px, or needs more than 6 lines. Shorten the source, licence or URL, or use a wider output. Nothing is truncated.` });

  const legendFont = fontFor(options.legendPx, family, 500);
  const swatch = Math.round(options.legendPx * 1.15), swatchGap = Math.round(options.legendPx * .5), rowHeight = Math.round(options.legendPx * 1.65), itemGap = Math.round(options.legendPx * 1.4);
  const rows: { key: string; label: string; color: string; width: number; row: number; x: number }[] = [];
  let row = 0, cursor = 0;
  (spec.legend ?? []).forEach((entry, i) => {
    const width = swatch + swatchGap + measure(legendFont, entry.label);
    if (width > inner.width + 1e-6) diagnostics.push({ code: "map-legend-unfit", severity: "error", message: `Legend entry "${entry.label}" is wider than the output; shorten it.` });
    if (cursor > 0 && cursor + width > inner.width) { row += 1; cursor = 0; }
    rows.push({ key: entry.key, label: entry.label, color: entry.color ?? `var(--km-map-fill-${i + 1}, ${FILL_PALETTE[i % FILL_PALETTE.length]})`, width, row, x: cursor });
    cursor += width + itemGap;
  });
  const legendHeight = rows.length ? (row + 1) * rowHeight : 0;
  if (legendHeight) bottom -= legendHeight;
  const items: MapLegendItem[] = rows.map(r => ({ key: r.key, label: r.label, color: r.color, rect: { x: inner.x + r.x, y: bottom + r.row * rowHeight, width: r.width, height: rowHeight } }));
  const legendRect = { x: inner.x, y: bottom, width: inner.width, height: legendHeight };
  if (legendHeight) bottom -= gap * 1.3;

  const viewport: Rect = { x: inner.x, y: top, width: inner.width, height: Math.max(0, bottom - top) };
  if (viewport.height < box.height * .35 || viewport.width <= 0)
    diagnostics.push({ code: "map-viewport-too-small", severity: "error", message: "The header, legend and attribution leave less than 35% of the output for the map; shorten them or use a taller frame." });

  const label = { font: fontFor(options.labelPx, family, 600), sizePx: options.labelPx, padX: Math.round(options.labelPx * .55), gap: Math.round(options.labelPx * .3),
    height: Math.round(options.labelPx * 1.7), markerRadius: Math.max(3, Math.round(short * .012)), haloRadius: Math.max(5, Math.round(short * .0185)) };
  const routeStyle = { arrow: Math.round(options.labelPx * .9), endInset: 0 };
  routeStyle.endInset = label.haloRadius + routeStyle.arrow * .7;
  const pinLabels: Record<string, { text: string; width: number }> = {};
  const allPositions: MapPosition[] = [];
  const byId = new Map<string, MapFeature>();
  for (const collection of spec.collections) for (const feature of collection.features) {
    byId.set(feature.id, feature);
    allPositions.push(...positionsOf(feature.geometry));
    if (feature.geometry.type === "Point") {
      const name = feature.properties?.name;
      const text = typeof name === "string" && name.length > 0 ? name : feature.id;
      pinLabels[feature.id] = { text, width: measure(label.font, text) };
    }
  }
  const routePaths: Record<string, readonly MapPosition[]> = {};
  for (const route of spec.routes ?? []) {
    const line = byId.get(route.featureId)!.geometry as Extract<MapGeometry, { type: "LineString" }>;
    routePaths[route.id] = densifyRoute(line.coordinates, route.interpolation);
  }
  const padFit = options.padding ?? .12, minSpan = options.minSpanDeg ?? 4;
  const cameras = spec.beats.map(beat => keepLabelsInside(spec,
    fitCamera(spec.projection, framedPositions(spec, beat, byId, routePaths, allPositions, minSpan), viewport, padFit, minSpan), viewport, pinLabels, label));
  const slots: Record<string, MapLabelSlot>[] = [];
  spec.beats.forEach((beat, i) => { slots.push(placeLabels(spec, beat, cameras[i], viewport, pinLabels, label, slots[i - 1])); });

  const layout: MapStageLayout = {
    box: { x: 0, y: 0, width: box.width, height: box.height }, inner, projection: spec.projection, header, viewport, cornerRadius: Math.round(short * .022),
    legend: { rect: legendRect, items, swatch, gap: swatchGap, font: legendFont, sizePx: options.legendPx },
    attribution, label, route: routeStyle, pinLabels, routePaths, cameras, slots, diagnostics,
  };
  if (measurable) diagnostics.push(...frameDiagnostics(spec, layout));
  return layout;
}

/** Checks every frame: pins and labels must not collide (error once the view has settled, warning while the camera moves),
 * labels of pins in the lane must stay in the lane, and features must not hide behind the orthographic horizon at a settled
 * view. Each problem is reported once per beat. */
function frameDiagnostics(spec: MapStageSpec, layout: MapStageLayout): MapStageDiagnostic[] {
  const out: MapStageDiagnostic[] = [], seen = new Set<string>();
  const move = spec.moveFrames ?? 36, r = layout.label.haloRadius;
  const report = (key: string, d: MapStageDiagnostic) => { if (!seen.has(key)) { seen.add(key); out.push(d); } };
  let start = 0;
  spec.beats.forEach((beat, index) => {
    for (let local = 0; local < beat.durationFrames; local += 1) {
      const settled = index === 0 || local >= move;
      const frame = evaluateFrame(spec, layout, start + local, false);
      const pins = frame.pins.filter(p => p.visible && p.inView);
      for (let i = 0; i < pins.length; i += 1) for (let j = i + 1; j < pins.length; j += 1) {
        const a = pins[i], b = pins[j];
        const shown = (p: MapPinFrame) => p.labelOpacity >= .5;
        const hit = overlaps(disc(a.x, a.y, r), disc(b.x, b.y, r))
          || (shown(a) && (overlaps(a.labelRect, disc(b.x, b.y, r)) || (shown(b) && overlaps(a.labelRect, b.labelRect))))
          || (shown(b) && overlaps(b.labelRect, disc(a.x, a.y, r)));
        if (!hit) continue;
        const where = settled ? `at the settled view of beat "${beat.id}"` : `while the camera moves in beat "${beat.id}"`;
        report(`${beat.id}|collide|${a.id}|${b.id}|${settled}`, { code: settled ? "map-label-collision" : "map-label-collision-moving", severity: settled ? "error" : "warning", beatId: beat.id, featureId: a.id,
          message: `Pins "${a.text}" and "${b.text}" or their labels overlap ${where}; separate the pins or change the view.` });
      }
      if (settled) {
        for (const pin of pins) if (!inside(pin.labelRect, layout.viewport))
          report(`${beat.id}|outside|${pin.id}`, { code: "map-label-outside", severity: "warning", beatId: beat.id, featureId: pin.id,
            message: `The label "${pin.text}" falls outside the map lane at beat "${beat.id}".` });
        for (const feature of frame.features) if (!feature.visible)
          report(`${beat.id}|horizon|${feature.id}`, { code: "map-feature-behind-horizon", severity: "warning", beatId: beat.id, featureId: feature.id,
            message: `Feature "${feature.id}" is partly behind the orthographic horizon at beat "${beat.id}" and is not drawn; centre the view on it or use equirectangular.` });
        for (const route of frame.routes) if (!route.visible && route.progress > 0)
          report(`${beat.id}|horizon|${route.id}`, { code: "map-feature-behind-horizon", severity: "warning", beatId: beat.id, featureId: route.id,
            message: `Route "${route.id}" is partly behind the orthographic horizon at beat "${beat.id}" and is not drawn.` });
      }
    }
    start += beat.durationFrames;
  });
  return out;
}

/** Route progress per route id at a frame: eased 0→1 across its beat, then held at 1. */
function routeProgress(spec: MapStageSpec, frame: number): Map<string, number> {
  const out = new Map<string, number>();
  let start = 0;
  for (const beat of spec.beats) {
    if (beat.kind === "route" && frame >= start)
      out.set(beat.routeId, evaluateEasing("ease-in-out", Math.min(1, (frame - start) / beat.durationFrames)));
    start += beat.durationFrames;
  }
  return out;
}

function slicePolyline(points: MapScreenPoint[], cumulative: number[], length: number, from: number, to: number): MapScreenPoint[] {
  if (to <= from) return [];
  const line = { points, cumulative, length };
  const out: MapScreenPoint[] = [samplePolylineAt(line, from).position as MapScreenPoint];
  for (let i = 1; i < points.length - 1; i += 1) if (cumulative[i] > from && cumulative[i] < to) out.push(points[i]);
  out.push(samplePolylineAt(line, to).position as MapScreenPoint);
  return out;
}

/** The drawn trail up to `progress` of the route, the part still to draw, and the head with its direction. The drawable length
 * stops `endInset` px short of the end, so the arrow meets the destination pin's halo instead of hiding under it. */
function partialRoute(points: MapScreenPoint[], progress: number, endInset: number): Pick<MapRouteFrame, "points" | "remainder" | "head" | "headAngle"> {
  if (points.length < 2) return { points: [], remainder: [] };
  const cumulative = [0];
  for (let i = 1; i < points.length; i += 1)
    cumulative.push(cumulative[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  const length = cumulative[cumulative.length - 1], usable = Math.max(0, length - endInset), d = usable * clamp01(progress);
  const remainder = slicePolyline(points, cumulative, length, d, usable);
  if (progress <= 0) return { points: [], remainder };
  const sample = samplePolylineAt({ points, cumulative, length }, d);
  const head = sample.position as MapScreenPoint;
  const trail = slicePolyline(points, cumulative, length, 0, d);
  trail[trail.length - 1] = head;
  return { points: trail, remainder, head, headAngle: Math.atan2(sample.tangent[1], sample.tangent[0]) };
}

/** Graticule lines around the current view, sampled densely enough to curve on the orthographic globe. */
function graticuleLines(spec: MapStageSpec, viewport: Rect, camera: MapCamera): MapScreenPoint[][] {
  const step = spec.graticuleDeg;
  if (!step) return [];
  const halfLat = Math.min(90, (viewport.height / 2 / camera.scale) / D2R * 1.6 + step);
  const halfLon = Math.min(180, (viewport.width / 2 / camera.scale) / D2R / Math.max(.2, Math.cos(camera.lat * D2R)) * 1.6 + step);
  const latMin = Math.max(-89, camera.lat - halfLat), latMax = Math.min(89, camera.lat + halfLat);
  const lonMin = camera.lon - halfLon, lonMax = camera.lon + halfLon;
  const samples = 48;
  const lines: MapScreenPoint[][] = [];
  const trace = (at: (t: number) => MapPosition) => {
    let run: MapScreenPoint[] = [];
    for (let k = 0; k <= samples; k += 1) {
      const p = projectMapPosition(spec.projection, camera, at(k / samples));
      if (p.visible) run.push(toScreen(viewport, camera, p));
      else { if (run.length > 1) lines.push(run); run = []; }
    }
    if (run.length > 1) lines.push(run);
  };
  for (let k = Math.ceil(lonMin / step); k <= Math.floor(lonMax / step); k += 1) {
    const lon = wrapDelta(k * step, 0);
    trace(t => [lon, latMin + (latMax - latMin) * t]);
  }
  for (let k = Math.ceil(latMin / step); k <= Math.floor(latMax / step); k += 1) {
    const lat = k * step;
    trace(t => [wrapDelta(lonMin + (lonMax - lonMin) * t, 0), lat]);
  }
  return lines;
}

/** State of the map at one absolute frame: the camera (eased from the previous beat's view, then held), every feature in
 * screen space, route progress and pin positions with their label pills. Pure: no clock, no history. */
export function evaluateMapStage(spec: MapStageSpec, layout: MapStageLayout, frame: number): MapStageFrame {
  return evaluateFrame(spec, layout, frame, true);
}

function evaluateFrame(spec: MapStageSpec, layout: MapStageLayout, frame: number, withGraticule: boolean): MapStageFrame {
  const total = mapStageDuration(spec), f = Math.max(0, Math.min(total - 1, Math.floor(frame)));
  let start = 0, index = 0;
  for (let i = 0; i < spec.beats.length; i += 1) {
    const end = start + spec.beats[i].durationFrames;
    if (f >= start && f < end) { index = i; break; }
    start = end;
  }
  const beat = spec.beats[index], local = f - start, move = spec.moveFrames ?? 36;
  const moving = index > 0 && local < move, t = moving ? local / move : 1;
  const target = layout.cameras[index];
  const camera = moving ? tweenCamera(layout.cameras[index - 1], target, evaluateEasing("ease-in-out-cubic", t)) : target;
  const viewport = layout.viewport;
  const routeByFeature = new Map((spec.routes ?? []).map(r => [r.featureId, r]));
  const progress = routeProgress(spec, f);
  const colourOf = new Map(layout.legend.items.map(item => [item.key, item.color]));
  const slots = layout.slots[index], before = index > 0 ? layout.slots[index - 1] : slots;
  const features: MapFeatureFrame[] = [], routes: MapRouteFrame[] = [], pins: MapPinFrame[] = [];
  const project = (pos: MapPosition) => {
    const p = projectMapPosition(spec.projection, camera, pos);
    return { visible: p.visible, at: toScreen(viewport, camera, p) };
  };
  for (const collection of spec.collections) for (const feature of collection.features) {
    const g = feature.geometry;
    if (g.type === "Point") {
      const { visible, at: [x, y] } = project(g.coordinates);
      const { text, width } = layout.pinLabels[feature.id];
      const now = slots[feature.id], then = before[feature.id];
      const changes = moving && then.side !== now.side;
      const slot = changes && t < .5 ? then : now;
      pins.push({ id: feature.id, text, x, y, visible, inView: visible && pointIn(x, y, viewport),
        labelRect: slotRect(x, y, slot, width, layout.label), leader: slot.leader, labelOpacity: changes ? clamp01(Math.abs(t - .5) * 4) : 1 });
      continue;
    }
    const route = g.type === "LineString" ? routeByFeature.get(feature.id) : undefined;
    if (route) {
      let visible = true;
      const points = layout.routePaths[route.id].map(pos => { const p = project(pos); if (!p.visible) visible = false; return p.at; });
      const amount = progress.get(route.id) ?? 0;
      const drawn = visible ? partialRoute(points, amount, layout.route.endInset) : { points: [], remainder: [] };
      routes.push({ id: route.id, color: route.color ?? "var(--km-map-route, #e0531f)", progress: amount, visible,
        active: beat.kind === "route" && beat.routeId === route.id, ...drawn });
      continue;
    }
    let visible = true;
    const rings = (g.type === "Polygon" ? g.coordinates : g.type === "MultiPolygon" ? g.coordinates.flat() : [g.coordinates] as readonly (readonly MapPosition[])[])
      .map(ring => ring.map(pos => { const p = project(pos); if (!p.visible) visible = false; return p.at; }));
    if (g.type === "LineString") features.push({ id: feature.id, kind: "line", visible, rings: visible ? rings : [] });
    else {
      const key = feature.properties?.fillKey;
      features.push({ id: feature.id, kind: "region", fill: (key !== undefined ? colourOf.get(key) : undefined) ?? REGION_FALLBACK, visible, rings: visible ? rings : [] });
    }
  }
  return { beatIndex: index, beat, local, camera, settle: moving ? evaluateEasing("ease-in-out-cubic", t) : 1, features, routes, pins,
    graticule: withGraticule ? graticuleLines(spec, viewport, camera) : [] };
}
