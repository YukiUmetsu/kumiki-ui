/**
 * Drawing a material transition's frame in the DOM (registry item `material-transitions`): warps as SVG displacement
 * filters, vector overlays as SVG, and clip rings as CSS clip paths. FilmStage uses it; any DOM renderer can.
 */
import { Fragment } from "react";
import type { CSSProperties } from "react";
import type { EncodedWarp } from "./film-warp";
import type { MaterialVector } from "./material-kit";

/** A PNG data URL of an RGBA grid. */
export function rgbaImage(rgba: Uint8ClampedArray, cols: number, rows: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const context = canvas.getContext("2d")!, image = context.createImageData(cols, rows);
  image.data.set(rgba);
  context.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

/** A PNG data URL of an alpha grid: white, with the value in its alpha. */
export function alphaImage(alpha: Uint8ClampedArray, cols: number, rows: number): string {
  const rgba = new Uint8ClampedArray(alpha.length * 4);
  for (let k = 0; k < alpha.length; k++) { rgba[4 * k] = rgba[4 * k + 1] = rgba[4 * k + 2] = 255; rgba[4 * k + 3] = alpha[k]; }
  return rgbaImage(rgba, cols, rows);
}

/** The images of an encoded warp, made once per frame. */
export interface WarpImages { warp: EncodedWarp; coarse: string[]; fine: (string | undefined)[]; blurMask?: string }
export function warpImages(warp: EncodedWarp): WarpImages {
  return {
    warp,
    coarse: warp.branches.map((b) => rgbaImage(b.coarse, warp.cols, warp.rows)),
    fine: warp.branches.map((b) => (b.fine ? rgbaImage(b.fine, warp.cols, warp.rows) : undefined)),
    blurMask: warp.blurMask ? alphaImage(warp.blurMask, warp.cols, warp.rows) : undefined,
  };
}

const ALPHA_FROM_BLUE = "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0";

/**
 * An SVG filter that draws a scene through an encoded warp; apply it with `filter: url(#id)`. Each branch moves its
 * pieces (a fine pass, then a coarse one) and keeps only them; the branches merge, then the optional blur. The hidden
 * images let a frame-accurate exporter wait until the maps are decoded.
 */
export function MaterialWarpFilter({ id, images, width, height }: { id: string; images: WarpImages; width: number; height: number }) {
  const { warp } = images, box = { x: 0, y: 0, width, height, preserveAspectRatio: "none" };
  const urls = [...images.coarse, ...images.fine.filter((u): u is string => Boolean(u)), ...(images.blurMask ? [images.blurMask] : [])];
  return <>
    <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }}>
      <filter id={id} x="0" y="0" width={width} height={height} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        {warp.branches.map((branch, i) => <Fragment key={i}>
          {images.fine[i] && <>
            <feImage href={images.fine[i]} {...box} result={`f${i}`} />
            <feDisplacementMap in="SourceGraphic" in2={`f${i}`} scale={branch.fineScale} xChannelSelector="R" yChannelSelector="G" result={`a${i}`} />
          </>}
          <feImage href={images.coarse[i]} {...box} result={`c${i}`} />
          <feDisplacementMap in={images.fine[i] ? `a${i}` : "SourceGraphic"} in2={`c${i}`} scale={branch.coarseScale} xChannelSelector="R" yChannelSelector="G" result={`d${i}`} />
          <feColorMatrix in={`c${i}`} type="matrix" values={ALPHA_FROM_BLUE} result={`m${i}`} />
          <feComposite in={`d${i}`} in2={`m${i}`} operator="in" result={`o${i}`} />
        </Fragment>)}
        {/* Branch masks are complementary at their soft edges, so the branches add up; laying one over another would leave
            a seam of lost alpha along every edge. */}
        {warp.branches.length === 1 ? <feComposite in="o0" in2="o0" operator="arithmetic" k2={1} result="warped" />
          : warp.branches.slice(1).map((_, i) => <feComposite key={i} in={i === 0 ? "o0" : `s${i}`} in2={`o${i + 1}`} operator="arithmetic" k2={1} k3={1}
            result={i === warp.branches.length - 2 ? "warped" : `s${i + 1}`} />)}
        {warp.blur && <>
          <feGaussianBlur in="warped" stdDeviation={`${warp.blur[0].toFixed(2)} ${warp.blur[1].toFixed(2)}`} edgeMode="duplicate" result="blurred" />
          {images.blurMask && <>
            <feImage href={images.blurMask} {...box} result="blur-mask" />
            <feComposite in="blurred" in2="blur-mask" operator="in" result="blurred-in" />
            <feMerge><feMergeNode in="warped" /><feMergeNode in="blurred-in" /></feMerge>
          </>}
        </>}
      </filter>
    </svg>
    {urls.map((url, i) => <img key={i} src={url} alt="" aria-hidden="true" data-km-film-warp-map="" style={{ display: "none" }} />)}
  </>;
}

/** Rings in frame heights as a CSS clip path in pixels (their union). */
export function ringsClipPath(rings: readonly (readonly number[])[], height: number): string {
  const d = rings.map((ring) => {
    let s = "";
    for (let i = 0; i < ring.length; i += 2) s += `${i ? "L" : "M"}${(ring[i] * height).toFixed(1)} ${(ring[i + 1] * height).toFixed(1)}`;
    return s + "Z";
  }).join("");
  return `path(nonzero, "${d}")`;
}

const pathData = (rings: readonly (readonly number[])[], closed: boolean) => rings.map((ring) => {
  let s = "";
  for (let i = 0; i < ring.length; i += 2) s += `${i ? "L" : "M"}${ring[i].toFixed(5)} ${ring[i + 1].toFixed(5)}`;
  return closed ? s + "Z" : s;
});

/** Vector overlays over a frame of `width × height` pixels; each is its own SVG so its blend mode reaches the scene. */
export function MaterialVectors({ vectors, width, height, idPrefix }: { vectors: readonly MaterialVector[]; width: number; height: number; idPrefix: string }) {
  const aspect = width / height, style: CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" };
  return <>{vectors.map((v) => {
    const gid = `${idPrefix}-${v.id}`, d = pathData(v.rings, v.closed), fill = v.gradient ? `url(#${gid}-g)` : v.fill ?? "none";
    return <svg key={v.id} aria-hidden="true" data-km-film-material-vector={v.id} width={width} height={height} viewBox={`0 0 ${aspect} 1`} preserveAspectRatio="none"
      style={{ ...style, mixBlendMode: v.blend === "normal" ? undefined : v.blend, opacity: v.alpha }}>
      {(v.gradient || v.blur || v.outside) && <defs>
        {v.gradient && <linearGradient id={`${gid}-g`} gradientUnits="userSpaceOnUse" x1={v.gradient.x1} y1={v.gradient.y1} x2={v.gradient.x2} y2={v.gradient.y2}>
          {v.gradient.stops.map(([offset, color, alpha], i) => <stop key={i} offset={offset} stopColor={color} stopOpacity={alpha} />)}
        </linearGradient>}
        {v.outside && <clipPath id={`${gid}-o`} clipPathUnits="userSpaceOnUse">
          <path clipRule="evenodd" d={`M-1 -1H${aspect + 1}V2H-1Z${pathData(v.outside, true).join("")}`} />
        </clipPath>}
        {v.blur && <filter id={`${gid}-b`} filterUnits="userSpaceOnUse" x={-0.1} y={-0.1} width={aspect + 0.2} height={1.2}><feGaussianBlur stdDeviation={v.blur / 1000} /></filter>}
      </defs>}
      <g clipPath={v.outside ? `url(#${gid}-o)` : undefined}><g filter={v.blur ? `url(#${gid}-b)` : undefined}>
        {d.map((path, i) => <path key={i} d={path} fill={v.closed ? fill : "none"} stroke={v.stroke} strokeWidth={v.width ? v.width / 1000 : undefined}
          strokeLinejoin="round" strokeLinecap="round" opacity={v.alphas ? v.alphas[i] : undefined} />)}
      </g></g>
    </svg>;
  })}</>;
}
