import type { RisoPaint } from "./print-plates-react";

/** Original press-ready ephemera attached to two independently animated hands. */
export interface RisoTransferPoint { x: number; y: number }
export interface RisoTransferSheetGeometry {
  border: string;
  fold: string;
  ruling: readonly string[];
  postmark: string;
  hatching: string;
}
const EMPTY: RisoTransferSheetGeometry = { border: "", fold: "", ruling: [], postmark: "", hatching: "" };
const f = (value: number) => value.toFixed(2);
const xy = (p: RisoTransferPoint) => f(p.x) + " " + f(p.y);
const valid = (p: RisoTransferPoint) => !!p && Number.isFinite(p.x) &&
  Number.isFinite(p.y) && Math.abs(p.x) <= 20000 && Math.abs(p.y) <= 20000;

/** Pure stage-space geometry; the paper never owns an independent clock. */
export function evaluateRisoTransferSheet(
  source: RisoTransferPoint, end: RisoTransferPoint, progress: number,
): RisoTransferSheetGeometry {
  if (!valid(source) || !valid(end) || !Number.isFinite(progress) || progress < 0 || progress > 1)
    throw new RangeError("RISO transfer geometry requires bounded points and progress 0..1.");
  const dx = end.x - source.x, dy = end.y - source.y;
  const length = Math.hypot(dx, dy);
  if (progress === 0 || length < 28) return EMPTY;
  // Follow the directed prop axis, including changes in hand height.
  const nx = -dy / length, ny = dx / length;
  const at = (t: number, offset = 0): RisoTransferPoint => ({
    x: source.x + dx * t + nx * offset,
    y: source.y + dy * t + ny * offset,
  });
  const border = "M" + xy(at(.05, -12)) + " Q" + xy(at(.48, -15)) +
    " " + xy(at(.95, -12)) + " L" + xy(at(.95, 14)) + " Q" +
    xy(at(.49, 18)) + " " + xy(at(.05, 14)) + " Z";
  const fold = length >= 70 ? "M" + xy(at(.46, -14)) + " Q" +
    xy(at(.445, 1)) + " " + xy(at(.46, 16)) : "";
  const ruling = length >= 85 ? [-6, 1, 8].map(n =>
    "M" + xy(at(.16, n)) + " Q" + xy(at(.46, n - .8)) + " " + xy(at(.69, n + .4))) : [];
  const center = at(.83, -2), r = Math.min(9, Math.max(4, length * .035));
  // A skewed cancellation stamp: intentional optical irregularity, not frame noise.
  const postmark = length >= 90
    ? "M" + xy({x:center.x-r, y:center.y}) +
      " C" + xy({x:center.x-r, y:center.y-r*1.4}) +
      " " + xy({x:center.x+r, y:center.y-r*1.4}) +
      " " + xy({x:center.x+r, y:center.y}) +
      " C" + xy({x:center.x+r, y:center.y+r*1.4}) +
      " " + xy({x:center.x-r, y:center.y+r*1.4}) +
      " " + xy({x:center.x-r, y:center.y}) +
      " M" + xy(at(.79, -4)) + " L" + xy(at(.87, 1))
    : "";
  const hatching = length >= 80
    ? [.09, .12, .15, .73, .76, .79].map((t, i) =>
      "M" + xy(at(t, 10 + i % 2 * 2)) + " L" +
      xy(at(t + (i % 2 === 0 ? .015 : .01), 8 - (i % 2)))).join(" ")
    : "";
  return { border, fold, ruling, postmark, hatching };
}

/** True independent blue/red spot masters; detail can be inspected plate-by-plate. */
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
