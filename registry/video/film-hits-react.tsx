/** Draws a beat hit (`film-hits.ts`) on a scene: the punch, shake and rotation as one transform, and the RGB split and zoom blur as
 * one SVG filter on the scene's pixels, so they work on any scene, 3D shots and footage included. */
import type { CSSProperties, ReactNode } from "react";
import type { HitState } from "./film-hits";
import { BlurMapImages, BlurPasses } from "./film-blur-react";

const R_ONLY = "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0", G_ONLY = "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0", B_ONLY = "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0";

/** The scale that keeps the frame covered while the picture is moved by (dx, dy) px and turned by `rotate` degrees. */
export function coverScale(width: number, height: number, dx: number, dy: number, rotate: number): number {
  const r = Math.abs(rotate) * Math.PI / 180, turn = r ? Math.cos(r) + Math.max(width / height, height / width) * Math.sin(r) : 1;
  return turn + 2 * Math.max(Math.abs(dx) / width, Math.abs(dy) / height);
}

/** The SVG filter for a hit's split and blur, or nothing when the hit has neither this frame. Apply with `filter: url(#id)`. */
export function HitFilter({ id, hit, centre, width, height }: { id: string; hit: HitState; centre: { x: number; y: number }; width: number; height: number }) {
  const dx = hit.splitX * height, dy = hit.splitY * height, split = Math.hypot(dx, dy) > .25, blur = hit.blur > .002, source = blur ? "blurred" : "SourceGraphic";
  if (!split && !blur) return null;
  return <>
    <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }}>
      <filter id={id} x="0" y="0" width={width} height={height} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        {blur && <BlurPasses kind="zoom" from={0} to={hit.blur} centre={centre} width={width} height={height} input="SourceGraphic" result="blurred" prefix="z" />}
        {split && <>
          <feColorMatrix in={source} type="matrix" values={R_ONLY} result="r" />
          <feOffset in="r" dx={dx.toFixed(2)} dy={dy.toFixed(2)} result="ro" />
          <feColorMatrix in={source} type="matrix" values={G_ONLY} result="g" />
          <feColorMatrix in={source} type="matrix" values={B_ONLY} result="b" />
          <feOffset in="b" dx={(-dx).toFixed(2)} dy={(-dy).toFixed(2)} result="bo" />
          {/* The channels are disjoint, so their sum is the picture with red and blue moved apart. */}
          <feComposite in="ro" in2="g" operator="arithmetic" k2={1} k3={1} result="rg" />
          <feComposite in="rg" in2="bo" operator="arithmetic" k2={1} k3={1} />
        </>}
      </filter>
    </svg>
    {blur && <BlurMapImages kind="zoom" centre={centre} width={width} height={height} />}
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
