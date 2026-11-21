/** Motion blur along a zoom or a turn, as SVG filter primitives on a layer's pixels: the blur of a beat hit's punch (`film-hits-react`)
 * and of the spin and zoom-blur cuts (`film-spin`).
 *
 * `feDisplacementMap` moves each pixel by scale × (channel − ½). With a map whose red and green grow linearly from a centre, one map
 * gives every zoom about that centre (radial: red and green follow x and y), and with the channels swapped and one negated, every small
 * turn (tangential: red follows y, green follows −x; the second-order shrink of a turn is under 2 % at the largest steps used here).
 * Averaging evenly spaced samples gives the blur; two passes (a coarse one across the smear and a fine one across one of its steps)
 * blend 6 × 6 copies into one streak without the dotted texture that 8-bit maps give a single pass.
 */
import { Fragment } from "react";

/** Samples in each pass. */
const SAMPLES = 6;

/** A gradient image along one axis, from channel value `from` to `to` (0 to 1) in red or green. */
const ramp = (channel: "red" | "green", axis: "x" | "y", from: number, to: number, width: number, height: number) => {
  const colour = (v: number) => channel === "red" ? `rgb(${(v * 100).toFixed(3)}%,0%,0%)` : `rgb(0%,${(v * 100).toFixed(3)}%,0%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="${axis === "x" ? 1 : 0}" y2="${axis === "y" ? 1 : 0}">`
    + `<stop offset="0" stop-color="${colour(from)}"/><stop offset="1" stop-color="${colour(to)}"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
};

export type BlurKind = "zoom" | "spin";
/** The two ramp images of a zoom or a turn about `centre` (fractions), and `m`, the farthest edge in pixels: one unit of a channel is 2m. */
export function blurMaps(kind: BlurKind, centre: { x: number; y: number }, width: number, height: number) {
  const cx = centre.x * width, cy = centre.y * height, m = Math.max(cx, width - cx, cy, height - cy, 1);
  const across = (from: number, size: number) => [.5 - from / (2 * m), .5 + (size - from) / (2 * m)] as const;
  if (kind === "zoom") return { m, images: [ramp("red", "x", ...across(cx, width), width, height), ramp("green", "y", ...across(cy, height), width, height)] };
  // A turn moves a pixel along (y, −x) from the centre: red follows y, green follows −x.
  const [g0, g1] = across(cx, width);
  return { m, images: [ramp("red", "y", ...across(cy, height), width, height), ramp("green", "x", 1 - g0, 1 - g1, width, height)] };
}
/** The displacement scale of one sample: a zoom by 1 + z (sampling towards the centre), or a turn by `a` radians. */
const sampleScale = (kind: BlurKind, m: number, amount: number) => kind === "zoom" ? -2 * m * amount / (1 + amount) : 2 * m * amount;

/**
 * The primitives of one blur, reading `input` and writing `result`. `from` and `to` bound the smear: a zoom from 0 to z smears outwards
 * from the picture as it is; a turn from −a/2 to a/2 smears both ways about its angle. `prefix` keeps the results of two blurs apart.
 */
export function BlurPasses({ kind, from, to, centre, width, height, input, result, prefix }: {
  kind: BlurKind; from: number; to: number; centre: { x: number; y: number }; width: number; height: number; input: string; result: string; prefix: string;
}) {
  const { m, images } = blurMaps(kind, centre, width, height), box = { x: 0, y: 0, width, height, preserveAspectRatio: "none" };
  // The coarse pass spans the smear in SAMPLES steps; the fine pass spans one coarse step, centred, so together they cover it evenly.
  // A zoom's fine pass only reaches further in, so no sample looks past the frame's edge; a turn's is centred.
  const step = (to - from) / SAMPLES, coarse = Array.from({ length: SAMPLES }, (_, k) => from + step * (k + .5)), fine = Array.from({ length: SAMPLES }, (_, k) => step * ((k + .5) / SAMPLES - (kind === "spin" ? .5 : 0)));
  return <>
    <feImage href={images[0]} {...box} result={`${prefix}mx`} />
    <feImage href={images[1]} {...box} result={`${prefix}my`} />
    <feComposite in={`${prefix}mx`} in2={`${prefix}my`} operator="arithmetic" k2={1} k3={1} result={`${prefix}map`} />
    {[coarse, fine].map((amounts, p) => {
      const source = p === 0 ? input : `${prefix}p0s${SAMPLES - 1}`, last = p === 1;
      return <Fragment key={p}>
        {amounts.map((amount, k) => <feDisplacementMap key={k} in={source} in2={`${prefix}map`} scale={sampleScale(kind, m, amount).toFixed(3)} xChannelSelector="R" yChannelSelector="G" result={`${prefix}p${p}z${k}`} />)}
        {/* An even average: each step keeps k/(k+1) of the sum so far and adds 1/(k+1) of the next sample. */}
        {amounts.slice(1).map((_, k) => <feComposite key={k} in={k === 0 ? `${prefix}p${p}z0` : `${prefix}p${p}s${k}`} in2={`${prefix}p${p}z${k + 1}`} operator="arithmetic"
          k2={(k + 1) / (k + 2)} k3={1 / (k + 2)} result={last && k === SAMPLES - 2 ? result : `${prefix}p${p}s${k + 1}`} />)}
      </Fragment>;
    })}
  </>;
}
/** The map images of a blur, hidden in the page, so an export waits for them to decode before it captures a frame. */
export function BlurMapImages({ kind, centre, width, height }: { kind: BlurKind; centre: { x: number; y: number }; width: number; height: number }) {
  return <>{blurMaps(kind, centre, width, height).images.map((url, i) => <img key={i} src={url} alt="" aria-hidden="true" data-km-film-warp-map="" style={{ display: "none" }} />)}</>;
}

/** A filter that blurs a layer along a zoom and a turn at once, or nothing when both are too small to see. */
export function MotionBlurFilter({ id, zoom = 0, spin = 0, centre, width, height }: { id: string; zoom?: number; spin?: number; centre: { x: number; y: number }; width: number; height: number }) {
  const zooms = zoom > .002, spins = Math.abs(spin) * Math.max(width, height) / 2 > .75;
  if (!zooms && !spins) return null;
  return <>
    <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }}>
      <filter id={id} x="0" y="0" width={width} height={height} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        {zooms && <BlurPasses kind="zoom" from={0} to={zoom} centre={centre} width={width} height={height} input="SourceGraphic" result={spins ? "zoomed" : "blurred"} prefix="z" />}
        {spins && <BlurPasses kind="spin" from={-spin / 2} to={spin / 2} centre={centre} width={width} height={height} input={zooms ? "zoomed" : "SourceGraphic"} result="blurred" prefix="s" />}
      </filter>
    </svg>
    {zooms && <BlurMapImages kind="zoom" centre={centre} width={width} height={height} />}
    {spins && <BlurMapImages kind="spin" centre={centre} width={width} height={height} />}
  </>;
}
