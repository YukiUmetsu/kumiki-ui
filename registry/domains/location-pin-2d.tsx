/** Location tag drawings for photos and listings: an exact pin, an approximate area, or a stripped tag.
 * The street grid is generic and abstract. It is not map data and places no real street, city or
 * building. Coordinates are validated and shown only when the caller supplies them.
 */
import { forwardRef } from "react";
import { DomainIllustration, FitText, Part, RADIUS, STROKE, useIllustration } from "./illustration-2d";
import type { DomainIllustrationProps } from "./illustration-2d";

export const LOCATION_STATES = ["tagged", "approximate", "stripped"] as const;
export type LocationState = typeof LOCATION_STATES[number];

export interface LocationPin2DProps extends Omit<DomainIllustrationProps, "title"> {
  /** `tagged` (default): an exact pin. `approximate`: a soft area around the point, no pin.
   * `stripped`: no location data at all. */
  state?: LocationState;
  /** Decimal degrees, shown as text when the state carries a location. Both or neither. */
  lat?: number;
  lon?: number;
  /** Accessible name and title band. Defaults by state. */
  title?: string;
}

const DEFAULT_TITLE: Record<LocationState, string> = { tagged: "Exact location tag", approximate: "Approximate area", stripped: "No location tag" };

/** Validates a coordinate pair and formats it to four decimals. Throws with the valid range. */
export function formatCoordinates(lat: number, lon: number): string {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error(`Latitude ${lat} must be a number from -90 to 90.`);
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error(`Longitude ${lon} must be a number from -180 to 180.`);
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

// Generic street grid: four columns, three rows, with road gaps. Coordinates are artboard units.
const MAP = { x: 14, y: 18, w: 212, h: 132, r: RADIUS.lg, colGap: 10, rowGap: 10, cols: 4, rows: 3 };
const COL_W = (MAP.w - MAP.colGap * (MAP.cols - 1)) / MAP.cols;
const ROW_H = (MAP.h - MAP.rowGap * (MAP.rows - 1)) / MAP.rows;
/** Centre of the road intersection between the first and second rows and the second and third columns. */
const PIN = { x: MAP.x + COL_W * 2 + MAP.colGap * 1.5, y: MAP.y + ROW_H + MAP.rowGap / 2 };
const LABEL = { y: 126, height: 22 };

function Map() {
  const c = useIllustration();
  const blocks = [];
  for (let row = 0; row < MAP.rows; row++) for (let col = 0; col < MAP.cols; col++) {
    blocks.push(<rect key={`${row}-${col}`} x={MAP.x + col * (COL_W + MAP.colGap)} y={MAP.y + row * (ROW_H + MAP.rowGap)}
      width={COL_W} height={ROW_H} rx={RADIUS.sm} fill={c.color("deep", .05)} opacity={.55} />);
  }
  return <g>
    <rect x={MAP.x} y={MAP.y} width={MAP.w} height={MAP.h} rx={MAP.r} fill={c.color("surface", -.04)} stroke={c.tokens.ink} strokeWidth={STROKE.fine} />
    {blocks}
  </g>;
}

/** Filled pin whose tip sits at (x, y). */
function Pin({ x, y }: { x: number; y: number }) {
  const c = useIllustration();
  const r = 14, top = y - 26;
  const d = `M ${x} ${y} C ${x - 6} ${y - 10}, ${x - r} ${top + r + 4}, ${x - r} ${top + r} A ${r} ${r} 0 1 1 ${x + r} ${top + r} C ${x + r} ${top + r + 4}, ${x + 6} ${y - 10}, ${x} ${y} Z`;
  return <Part name="pin" pivot={[x, y]}>
    <ellipse cx={x} cy={y + 1} rx={7} ry={2.2} fill={c.ref("shadow")} />
    <path d={d} fill={c.paint("accent")} stroke={c.tokens.ink} strokeWidth={STROKE.outline} strokeLinejoin="round" />
    <circle cx={x} cy={top + r} r={5.2} fill={c.tokens.surface} stroke={c.tokens.ink} strokeWidth={STROKE.detail} />
  </Part>;
}

function Caption({ text, maxWidth }: { text: string; maxWidth: number }) {
  const c = useIllustration();
  const width = Math.min(maxWidth, 212);
  return <g>
    <rect x={PIN.x - width / 2} y={LABEL.y} width={width} height={LABEL.height} rx={LABEL.height / 2} fill={c.paint("surface")} stroke={c.tokens.ink} strokeWidth={STROKE.fine} />
    <FitText text={text} x={PIN.x} y={LABEL.y} bandHeight={LABEL.height} valign="center" maxWidth={width - 14} fill={c.tokens.ink} fontWeight={600} />
  </g>;
}

function LocationArt({ state, coordinates }: { state: LocationState; coordinates?: string }) {
  const c = useIllustration();
  return <g>
    <Map />
    {state === "tagged" && <>
      <Pin x={PIN.x} y={PIN.y} />
      {coordinates ? <Caption text={coordinates} maxWidth={140} /> : null}
    </>}
    {state === "approximate" && <>
      <circle cx={PIN.x} cy={PIN.y} r={34} fill={c.color("accent", .25)} opacity={.45} />
      <circle cx={PIN.x} cy={PIN.y} r={34} fill="none" stroke={c.tokens.accent} strokeWidth={STROKE.detail} strokeDasharray="6 5" />
      <Caption text={coordinates ?? "Approximate area"} maxWidth={coordinates ? 140 : 150} />
    </>}
    {state === "stripped" && <>
      <circle cx={PIN.x} cy={PIN.y} r={22} fill="none" stroke={c.tokens.ink} strokeWidth={STROKE.detail} strokeDasharray="4 4" opacity={.6} />
      <line x1={PIN.x - 15} y1={PIN.y + 15} x2={PIN.x + 15} y2={PIN.y - 15} stroke={c.tokens.ink} strokeWidth={STROKE.detail} opacity={.6} />
      <Caption text="No location tag" maxWidth={150} />
    </>}
  </g>;
}

export const LocationPin2D = forwardRef<SVGSVGElement, LocationPin2DProps>(function LocationPin2D({ state = "tagged", lat, lon, title, ...props }, ref) {
  if (!(LOCATION_STATES as readonly string[]).includes(state)) {
    throw new Error(`Unknown location state "${state}". Use one of: ${LOCATION_STATES.join(", ")}.`);
  }
  if ((lat === undefined) !== (lon === undefined)) throw new Error("Pass both lat and lon, or neither.");
  const coordinates = lat !== undefined && lon !== undefined && state !== "stripped" ? formatCoordinates(lat, lon) : undefined;
  return <DomainIllustration {...props} ref={ref} title={title ?? DEFAULT_TITLE[state]} semanticId={`location-${state}`}
    data={{ "data-km-location-pin-2d": state }}>
    <LocationArt state={state} coordinates={coordinates} />
  </DomainIllustration>;
});
