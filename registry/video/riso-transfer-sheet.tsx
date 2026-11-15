import type { RisoPaint } from "./print-plates-react";

/** Original, press-ready paper shared by two independently evaluated actor hands. */
export interface RisoTransferPoint { x: number; y: number }
export interface RisoTransferSheetOptions {
  /** Curvature across the original paper centerline in stage units. 0..12. */
  curl?: number;
  /** Pinch the held ends without changing the long-edge silhouette. 0..1. */
  gripPinch?: number;
}
export interface RisoTransferSheetGeometry {
  /** THE source of truth for the opaque paper knockout AND printed contour. */
  outline: string;
  border: string;
  fold: string;
  /** Screened fold shadow, on the blue spot master, not a CSS gradient. */
  foldShade: string;
  ruling: readonly string[];
  postmark: string;
  hatching: string;
}
const EMPTY: RisoTransferSheetGeometry = {
  outline: "", border: "", fold: "", foldShade: "", ruling: [], postmark: "", hatching: "",
};
const f = (value: number) => value.toFixed(2);
const xy = (p: RisoTransferPoint) => f(p.x) + " " + f(p.y);
const valid = (p: RisoTransferPoint) => !!p && Number.isFinite(p.x) &&
  Number.isFinite(p.y) && Math.abs(p.x) <= 20000 && Math.abs(p.y) <= 20000;

/**
 * Film-frame-pure, two-ended printed sheet with an orthogonal body axis.
 * Every contour and interior engraving shares the same bent material basis.
 * No duplicate geometry is constructed in the character/film consumer.
 */
export function evaluateRisoTransferSheet(
  source: RisoTransferPoint, end: RisoTransferPoint, progress: number,
  options: RisoTransferSheetOptions = {},
): RisoTransferSheetGeometry {
  if (!valid(source) || !valid(end) || !Number.isFinite(progress) || progress < 0 || progress > 1)
    throw new RangeError("RISO transfer geometry requires bounded points and progress 0..1.");
  if (!options || typeof options !== "object" || Array.isArray(options))
    throw new RangeError("RISO transfer options must be an object.");
  const curl = options.curl ?? 3, pinch = options.gripPinch ?? .5;
  if (!Number.isFinite(curl) || curl < 0 || curl > 12 ||
      !Number.isFinite(pinch) || pinch < 0 || pinch > 1)
    throw new RangeError("RISO transfer curl must be 0..12 and gripPinch 0..1.");
  const dx = end.x - source.x, dy = end.y - source.y, length = Math.hypot(dx, dy);
  // Do not emit a degenerate 0-width quadrilateral at the first animation key.
  if (progress === 0 || length < 28) return EMPTY;
  const nx = -dy / length, ny = dx / length;
  const at = (t: number, offset = 0): RisoTransferPoint => {
    const bow = curl * Math.sin(Math.PI * Math.max(0, Math.min(1, t)));
    return {
      x: source.x + dx * t + nx * (offset + bow),
      y: source.y + dy * t + ny * (offset + bow),
    };
  };
  // The contour is a truly connected ribbon. Both pinched short edges
  // have their midpoints on the sampled hand contacts, even in tilted poses.
  const upper = -17 + pinch * 4, lower = 20 - pinch * 4;
  const outline = "M" + xy(at(0, upper)) +
    " C" + xy(at(.12, -22)) + " " + xy(at(.33, -21)) + " " + xy(at(.51, -18)) +
    " C" + xy(at(.7, -17)) + " " + xy(at(.89, -20)) + " " + xy(at(1, upper)) +
    " Q" + xy(at(1.018, 1)) + " " + xy(at(1, lower)) +
    " C" + xy(at(.84, 23)) + " " + xy(at(.66, 24)) + " " + xy(at(.49, 22)) +
    " C" + xy(at(.3, 24)) + " " + xy(at(.12, 23)) + " " + xy(at(0, lower)) +
    " Q" + xy(at(-.018, 1)) + " " + xy(at(0, upper)) + " Z";
  // Engraving is inside the curved, pinched paper perimeter, not registered
  // to the monitor's X/Y axes. The source artwork is linework, not digital grain.
  const border = "M" + xy(at(.055, -11)) + " Q" + xy(at(.48, -14.5)) +
    " " + xy(at(.945, -11)) + " L" + xy(at(.945, 13.5)) + " Q" +
    xy(at(.49, 17.5)) + " " + xy(at(.055, 13.5)) + " Z";
  const fold = length >= 70 ? "M" + xy(at(.46, -14)) + " Q" +
    xy(at(.443, -.5)) + " " + xy(at(.46, 16)) : "";
  const foldShade = length >= 70
    ? "M" + xy(at(.453, -13.5)) + " Q" + xy(at(.47, 1)) + " " + xy(at(.47, 16)) +
      " L" + xy(at(.484, 16)) + " Q" + xy(at(.467, .5)) +
      " " + xy(at(.466, -13.5)) + " Z"
    : "";
  const ruling = length >= 85 ? [-6, 1, 8].map(n =>
    "M" + xy(at(.16, n)) + " Q" + xy(at(.46, n - .8)) + " " +
    xy(at(.69, n + .4))) : [];
  // Cancellation stamp is oriented in the same local paper basis. Older
  // versions used a fixed screen-vertical ellipse, causing a rotated seal.
  const r = Math.min(9, Math.max(4, length * .035)), tr = r / length, t = .83;
  const postmark = length >= 90
    ? "M" + xy(at(t - tr, -2)) +
      " C" + xy(at(t - tr, -2 - r * .6)) + " " + xy(at(t - tr * .55, -2 - r)) +
      " " + xy(at(t, -2 - r)) +
      " C" + xy(at(t + tr * .62, -2 - r)) + " " + xy(at(t + tr, -2 - r * .45)) +
      " " + xy(at(t + tr, -2)) +
      " C" + xy(at(t + tr, -2 + r * .53)) + " " + xy(at(t + tr * .5, -2 + r)) +
      " " + xy(at(t, -2 + r)) +
      " C" + xy(at(t - tr * .6, -2 + r)) + " " + xy(at(t - tr, -2 + r * .52)) +
      " " + xy(at(t - tr, -2)) +
      " M" + xy(at(.795, -4)) + " L" + xy(at(.875, 1))
    : "";
  const hatching = length >= 80
    ? [.09, .12, .15, .73, .76, .79].map((t, i) =>
      "M" + xy(at(t, 10 + i % 2 * 2)) + " L" +
      xy(at(t + (i % 2 === 0 ? .015 : .01), 8 - (i % 2)))).join(" ")
    : "";
  return { outline, border, fold, foldShade, ruling, postmark, hatching };
}

/** Independent blue/red press masters; no actor alpha or global RGB filter. */
export function RisoTransferSheetPlate({
  outline, geometry, paint, plateId, detail = true,
}: {
  outline: string;
  geometry: RisoTransferSheetGeometry;
  paint: RisoPaint;
  plateId: "blue" | "red";
  detail?: boolean;
}) {
  if (!outline) return null;
  if (plateId === "blue") return <g data-km-riso-transfer-plate="blue"
    fill="none" stroke={paint.solid} strokeLinejoin="round" pointerEvents="none">
    <path d={outline} strokeWidth={2.1}/>
    {detail && <>
      {geometry.border && <path data-km-riso-transfer-inset="" d={geometry.border} strokeWidth={.95}/>}
      {geometry.foldShade && <path data-km-riso-transfer-fold-shade="" d={geometry.foldShade}
        fill={paint.dots} stroke="none"/>}
      {geometry.fold && <path data-km-riso-transfer-fold="" d={geometry.fold} strokeWidth={.75}/>}
      {geometry.ruling.map((d, i) => <path key={i} data-km-riso-transfer-rule={i}
        d={d} strokeWidth={.85}/>)}
    </>}
  </g>;
  return <g data-km-riso-transfer-plate="red" pointerEvents="none">
    {detail && <>
      {geometry.postmark && <path data-km-riso-transfer-postmark="" d={geometry.postmark}
        fill="none" stroke={paint.solid} strokeWidth={1.55}/>}
      {geometry.hatching && <path data-km-riso-transfer-print-grain="" d={geometry.hatching}
        fill="none" stroke={paint.solid} strokeWidth={.85}/>}
      {geometry.postmark && <path d={geometry.postmark} fill="none" stroke={paint.dots}
        strokeWidth={2.35}/>}
    </>}
  </g>;
}
