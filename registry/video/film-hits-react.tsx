/** Draws a beat hit (`film-hits.ts`) on a scene: the punch, shake and rotation as one transform, and the RGB split and zoom blur as
 * one SVG filter on the scene's pixels, so they work on any scene, 3D shots and footage included. */
import { Fragment } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { HitState } from "./film-hits";

/** Samples of the zoom blur in each of its two passes: the picture at evenly spaced zooms, averaged. The second pass smears the
 * first by one step of it, so 6 × 6 copies blend into one smooth streak instead of six ghosts. */
const BLUR_SAMPLES = 6;
const R_ONLY = "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0", G_ONLY = "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0", B_ONLY = "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0";

/** A gradient image along one axis, from channel value `from` to `to` (0 to 1) in red (x) or green (y). */
const ramp = (axis: "x" | "y", from: number, to: number, width: number, height: number) => {
  const colour = (v: number) => axis === "x" ? `rgb(${(v * 100).toFixed(3)}%,0%,0%)` : `rgb(0%,${(v * 100).toFixed(3)}%,0%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="${axis === "x" ? 1 : 0}" y2="${axis === "y" ? 1 : 0}">`
    + `<stop offset="0" stop-color="${colour(from)}"/><stop offset="1" stop-color="${colour(to)}"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
};

/**
 * The radial map of a zoom about `centre` (fractions): red and green grow by one unit per 2M pixels from the centre, M the farthest
 * edge, so `feDisplacementMap` with scale −2M·z/(1+z) shows the picture zoomed by 1 + z about the centre, the same on both axes.
 */
export function zoomMaps(centre: { x: number; y: number }, width: number, height: number) {
  const cx = centre.x * width, cy = centre.y * height, m = Math.max(cx, width - cx, cy, height - cy, 1);
  return { m, x: ramp("x", .5 - cx / (2 * m), .5 + (width - cx) / (2 * m), width, height), y: ramp("y", .5 - cy / (2 * m), .5 + (height - cy) / (2 * m), width, height) };
}

/** The scale that keeps the frame covered while the picture is moved by (dx, dy) px and turned by `rotate` degrees. */
export function coverScale(width: number, height: number, dx: number, dy: number, rotate: number): number {
  const r = Math.abs(rotate) * Math.PI / 180, turn = r ? Math.cos(r) + Math.max(width / height, height / width) * Math.sin(r) : 1;
  return turn + 2 * Math.max(Math.abs(dx) / width, Math.abs(dy) / height);
}

/** The SVG filter for a hit's split and blur, or nothing when the hit has neither this frame. Apply with `filter: url(#id)`. */
export function HitFilter({ id, hit, centre, width, height }: { id: string; hit: HitState; centre: { x: number; y: number }; width: number; height: number }) {
  const dx = hit.splitX * height, dy = hit.splitY * height, split = Math.hypot(dx, dy) > .25, blur = hit.blur > .002;
  if (!split && !blur) return null;
  const maps = blur ? zoomMaps(centre, width, height) : undefined, box = { x: 0, y: 0, width, height, preserveAspectRatio: "none" };
  // The coarse pass spans the smear in BLUR_SAMPLES - 1 steps; the fine pass spans one coarse step. Together they reach the full zoom.
  const steps = BLUR_SAMPLES - 1, coarse = hit.blur * steps / (steps + 1), scaleOf = (z: number) => -2 * maps!.m * z / (1 + z);
  const passes = blur ? [coarse, coarse / steps].map(span => Array.from({ length: steps }, (_, k) => scaleOf(span * (k + 1) / steps))) : [];
  const blurred = blur ? `p1s${steps}` : "SourceGraphic";
  return <>
    <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }}>
      <filter id={id} x="0" y="0" width={width} height={height} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        {blur && <>
          <feImage href={maps!.x} {...box} result="zx" />
          <feImage href={maps!.y} {...box} result="zy" />
          <feComposite in="zx" in2="zy" operator="arithmetic" k2={1} k3={1} result="zmap" />
          {passes.map((scales, p) => {
            const source = p === 0 ? "SourceGraphic" : `p0s${steps}`;
            return <Fragment key={p}>
              {scales.map((scale, k) => <feDisplacementMap key={k} in={source} in2="zmap" scale={scale.toFixed(3)} xChannelSelector="R" yChannelSelector="G" result={`p${p}z${k + 1}`} />)}
              {/* An even average: each step keeps k/(k+1) of the sum so far and adds 1/(k+1) of the next sample. */}
              {scales.map((_, k) => <feComposite key={k} in={k === 0 ? source : `p${p}s${k}`} in2={`p${p}z${k + 1}`} operator="arithmetic" k2={(k + 1) / (k + 2)} k3={1 / (k + 2)} result={`p${p}s${k + 1}`} />)}
            </Fragment>;
          })}
        </>}
        {split && <>
          <feColorMatrix in={blurred} type="matrix" values={R_ONLY} result="r" />
          <feOffset in="r" dx={dx.toFixed(2)} dy={dy.toFixed(2)} result="ro" />
          <feColorMatrix in={blurred} type="matrix" values={G_ONLY} result="g" />
          <feColorMatrix in={blurred} type="matrix" values={B_ONLY} result="b" />
          <feOffset in="b" dx={(-dx).toFixed(2)} dy={(-dy).toFixed(2)} result="bo" />
          {/* The channels are disjoint, so their sum is the picture with red and blue moved apart. */}
          <feComposite in="ro" in2="g" operator="arithmetic" k2={1} k3={1} result="rg" />
          <feComposite in="rg" in2="bo" operator="arithmetic" k2={1} k3={1} />
        </>}
      </filter>
    </svg>
    {maps && [maps.x, maps.y].map((url, i) => <img key={i} src={url} alt="" aria-hidden="true" data-km-film-warp-map="" style={{ display: "none" }} />)}
  </>;
}

/** A scene inside its hits: enlarged once by `reach` (so moves and splits never show an edge), then moved, turned and zoomed about the hit
 * centre, filtered for split and blur, and under the hit's flash. Without `reach` (reduced motion) the scene is as it is. */
export function HitLayer({ id, hit, reach, centre, width, height, children }: {
  id: string; hit: HitState; reach?: { move: number; turn: number; split: number }; centre: { x: number; y: number }; width: number; height: number; children: ReactNode;
}) {
  const dx = hit.x * height, dy = hit.y * height, splitPx = Math.hypot(hit.splitX, hit.splitY) * height, filtered = splitPx > .25 || hit.blur > .002;
  const edge = reach ? (reach.move + reach.split) * height : 0, overscan = reach ? coverScale(width, height, edge, edge, reach.turn) : 1;
  const scale = hit.scale * overscan, moved = scale !== 1 || dx !== 0 || dy !== 0 || hit.rotate !== 0;
  const layer: CSSProperties = { position: "absolute", inset: 0 };
  // The same elements at rest and in a hit, so a scene (a 3D canvas, a video) is never remounted by its hits.
  return <div style={layer} data-km-film-hit="">
    <HitFilter id={id} hit={hit} centre={centre} width={width} height={height} />
    <div style={{ ...layer, transformOrigin: `${centre.x * width}px ${centre.y * height}px`, filter: filtered ? `url(#${id})` : undefined,
      transform: moved ? `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${hit.rotate.toFixed(4)}deg) scale(${scale.toFixed(5)})` : undefined }}>{children}</div>
    {hit.flash > .004 && <div aria-hidden="true" data-km-film-hit-flash="" style={{ ...layer, background: "#ffffff", opacity: hit.flash, pointerEvents: "none" }} />}
  </div>;
}
