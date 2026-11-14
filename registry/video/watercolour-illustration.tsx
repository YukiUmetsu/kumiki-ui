import { useId } from "react";
import type { SVGProps } from "react";
import { inspectWetPaper } from "./watercolour-wet-paper";
import type { WetPaperSpec } from "./watercolour-wet-paper";
import { WatercolourWetPaper } from "./watercolour-wet-paper-react";

/** WC9: scene-independent, serializable watercolor artwork. No embedded timer,
 * copyrighted image assets, or screen-space filter on text/other film content.
 * A parent part moves its descendants, preserving their attachments.
 */
export type WatercolourTechnique = "wash" | "drybrush" | "line";
export interface WatercolourArtKey {
  frame: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  opacity: number;
}
interface ArtPartBase {
  id: string;
  /** Absolute-frame pose. A keyed parent carries every child with it. */
  keys?: readonly WatercolourArtKey[];
  /** Center of rotation and scaling in the part's local drawing coordinates. */
  pivot?: { x: number; y: number };
  startFrame?: number;
  fadeFrames?: number;
}
export type WatercolourArtPart =
  | (ArtPartBase & { kind: "group"; children: readonly WatercolourArtPart[] })
  | (ArtPartBase & { kind: "path"; path: string; technique: WatercolourTechnique;
      fill?: string; stroke?: string; strokeWidth?: number; opacity?: number });
export interface WatercolourArtwork {
  version: 1;
  width: number;
  height: number;
  seed: number;
  paper: { color: string; tooth: number };
  /** Original, hand-authored or procedurally built subject geometry. */
  parts: readonly WatercolourArtPart[];
  /** Optional shared-pigment atmospheric underpainting; same paper dimensions. */
  wetPaper?: WetPaperSpec;
}
export interface WatercolourArtPose {
  x: number; y: number; rotation: number; scale: number; opacity: number;
}
const hex = /^#[0-9a-f]{6}$/i;
const pathSafe = (path: unknown) => typeof path === "string" &&
  path.length >= 4 && path.length <= 65536 &&
  /^[Mm]\s*[-+.\d]/.test(path) &&
  /^[MmLlHhVvCcSsQqTtAaZz0-9eE,\s.+-]+$/.test(path);
const bounded = (v: number, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const integer = (v: number, min: number, max: number) =>
  Number.isSafeInteger(v) && v >= min && v <= max;
const smooth = (t: number) => {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
};
const neutral: WatercolourArtPose = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };

/** Invalid user-provided JSON must be rejected before it reaches SVG or FilmStage.
 * Enforce bounded tree size, IDs, coordinate range, motion and path syntax.
 */
export function inspectWatercolourArtwork(spec: WatercolourArtwork): string[] {
  const problems: string[] = [];
  if (!spec || spec.version !== 1) return ["/version"];
  if (!integer(spec.width, 240, 8192) || !integer(spec.height, 240, 8192))
    problems.push("/artboard");
  if (!integer(spec.seed, 0, 2147483647)) problems.push("/seed");
  if (!spec.paper || !hex.test(spec.paper.color) || !bounded(spec.paper.tooth, 0, 1))
    problems.push("/paper");
  if (!Array.isArray(spec.parts) || spec.parts.length < 1 || spec.parts.length > 128)
    return [...problems, "/parts"];
  if (spec.wetPaper) {
    problems.push(...inspectWetPaper(spec.wetPaper).map(issue => "/wetPaper" + issue.path));
    if (spec.wetPaper.width !== spec.width || spec.wetPaper.height !== spec.height)
      problems.push("/wetPaper/artboard");
  }
  const ids = new Set<string>();
  const visited = new WeakSet<object>();
  let count = 0;
  const inspect = (part: WatercolourArtPart, at: string, depth: number) => {
    if (!part || typeof part !== "object" || visited.has(part) || depth > 8) {
      problems.push(at); return;
    }
    visited.add(part);
    if (++count > 256) { problems.push("/parts/budget"); return; }
    if (typeof part.id !== "string" || !/^[a-z][a-z0-9-]{0,47}$/.test(part.id) || ids.has(part.id))
      problems.push(at + "/id");
    else ids.add(part.id);
    if (part.pivot && (!bounded(part.pivot.x, -8192, 8192) ||
      !bounded(part.pivot.y, -8192, 8192))) problems.push(at + "/pivot");
    if (part.startFrame !== undefined && !integer(part.startFrame, 0, 10000000))
      problems.push(at + "/startFrame");
    if (part.fadeFrames !== undefined && !integer(part.fadeFrames, 0, 600))
      problems.push(at + "/fadeFrames");
    if (part.keys !== undefined) {
      if (!Array.isArray(part.keys) || !part.keys.length || part.keys.length > 64)
        problems.push(at + "/keys");
      else {
        let prev = -1;
        for (const [j, key] of part.keys.entries()) {
          if (!key || !integer(key.frame, 0, 10000000) || key.frame <= prev ||
            !bounded(key.x, -8192, 8192) || !bounded(key.y, -8192, 8192) ||
            !bounded(key.rotation, -720, 720) || !bounded(key.scale, .05, 12) ||
            !bounded(key.opacity, 0, 1)) problems.push(at + "/keys/" + j);
          if (key && Number.isFinite(key.frame)) prev = key.frame;
        }
      }
    }
    if (part.kind === "group") {
      if (!Array.isArray(part.children) || !part.children.length || part.children.length > 128)
        problems.push(at + "/children");
      else part.children.forEach((child, j) => inspect(child, at + "/children/" + j, depth + 1));
      return;
    }
    if (part.kind !== "path") { problems.push(at + "/kind"); return; }
    if (!pathSafe(part.path)) problems.push(at + "/path");
    if (!["wash", "drybrush", "line"].includes(part.technique))
      problems.push(at + "/technique");
    if (!part.fill && !part.stroke) problems.push(at + "/pigment");
    for (const color of [part.fill, part.stroke])
      if (color !== undefined && color !== "none" && !hex.test(color))
        problems.push(at + "/pigment");
    if (part.strokeWidth !== undefined && !bounded(part.strokeWidth, .1, 96))
      problems.push(at + "/strokeWidth");
    if (part.opacity !== undefined && !bounded(part.opacity, 0, 1))
      problems.push(at + "/opacity");
  };
  spec.parts.forEach((part, i) => inspect(part, "/parts/" + i, 0));
  return problems;
}

/** A pure absolute-frame motion evaluator, independent of render/seek order. */
export function watercolourArtPoseAt(part: WatercolourArtPart, frame: number,
  reducedMotion = false): WatercolourArtPose {
  if (!integer(frame, 0, 10000000)) throw new RangeError("Invalid illustration frame.");
  const keys = part.keys;
  if (!keys?.length) return neutral;
  if (reducedMotion || frame >= keys[keys.length - 1].frame) return { ...keys[keys.length - 1] };
  if (frame <= keys[0].frame) return { ...keys[0] };
  for (let i = 1; i < keys.length; i++) {
    if (frame > keys[i].frame) continue;
    const a = keys[i - 1], b = keys[i];
    const t = smooth((frame - a.frame) / (b.frame - a.frame));
    const mix = (x: number, y: number) => x + (y - x) * t;
    return { x: mix(a.x, b.x), y: mix(a.y, b.y),
      rotation: mix(a.rotation, b.rotation),
      scale: Math.exp(mix(Math.log(a.scale), Math.log(b.scale))),
      opacity: mix(a.opacity, b.opacity) };
  }
  return neutral;
}

function ArtPart({ part, frame, reducedMotion, washFilter, dryFilter }: {
  part: WatercolourArtPart; frame: number; reducedMotion: boolean;
  washFilter: string; dryFilter: string;
}) {
  const pose = watercolourArtPoseAt(part, frame, reducedMotion);
  const start = part.startFrame ?? 0;
  const visible = reducedMotion ? 1 : part.fadeFrames
    ? smooth((frame - start) / part.fadeFrames) : Number(frame >= start);
  if (visible <= 0 || pose.opacity <= 0) return null;
  const pivot = part.pivot ?? { x: 0, y: 0 };
  const transform = `translate(${pose.x} ${pose.y}) translate(${pivot.x} ${pivot.y}) rotate(${pose.rotation}) scale(${pose.scale}) translate(${-pivot.x} ${-pivot.y})`;
  return <g data-km-watercolour-part={part.id} transform={transform}
    opacity={pose.opacity * visible}>
    {part.kind === "group"
      ? part.children.map(child => <ArtPart key={child.id} part={child} frame={frame}
          reducedMotion={reducedMotion} washFilter={washFilter} dryFilter={dryFilter}/>)
      : <path d={part.path} fill={part.fill ?? "none"}
          stroke={part.stroke ?? "none"} strokeWidth={part.strokeWidth ?? 1}
          strokeLinecap="round" strokeLinejoin="round"
          opacity={part.opacity ?? 1}
          filter={part.technique === "wash" ? washFilter
            : part.technique === "drybrush" ? dryFilter : undefined}
          style={{ mixBlendMode: part.technique === "line" ? "normal" : "multiply" }}
          data-km-watercolour-technique={part.technique}/>}
  </g>;
}

/** Native SVG artwork composited over the existing physical wet-paper engine.
 * Only watercolor pigment is displaced; FilmStage typography remains crisp.
 */
export function WatercolourIllustration({ spec, frame, reducedMotion = false, ...props }:
  Omit<SVGProps<SVGSVGElement>, "width" | "height" | "viewBox" | "children"> & {
    spec: WatercolourArtwork; frame: number; reducedMotion?: boolean;
  }) {
  const issues = inspectWatercolourArtwork(spec);
  if (issues.length) throw new RangeError("Invalid watercolor illustration: " + issues.join(", "));
  if (!integer(frame, 0, 10000000)) throw new RangeError("Invalid illustration frame.");
  const id = "wc9" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return <svg {...props} xmlns="http://www.w3.org/2000/svg"
    role={props["aria-hidden"] ? undefined : "img"}
    aria-label={props["aria-hidden"] ? undefined : (props["aria-label"] ?? "Watercolor illustration")}
    viewBox={`0 0 ${spec.width} ${spec.height}`}
    data-km-watercolour-illustration=""
    data-km-watercolour-illustration-frame={frame}
    style={{ display: "block", width: "100%", height: "100%", overflow: "hidden", ...props.style }}>
    <defs>
      <filter id={id + "-wash"} x="-4%" y="-4%" width="108%" height="108%"
        colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".019 .041" numOctaves={3}
          seed={1 + spec.seed % 997} result="paper"/>
        <feDisplacementMap in="SourceGraphic" in2="paper"
          scale={2.3 * spec.paper.tooth} xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <filter id={id + "-dry"} x="-3%" y="-3%" width="106%" height="106%"
        colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".13 .075" numOctaves={2}
          seed={1 + spec.seed % 773} result="fibres"/>
        <feDisplacementMap in="SourceGraphic" in2="fibres"
          scale={1.5 * spec.paper.tooth} xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs>
    <rect width={spec.width} height={spec.height} fill={spec.paper.color}/>
    {spec.wetPaper && <WatercolourWetPaper aria-hidden="true"
      spec={spec.wetPaper} frame={frame} reducedMotion={reducedMotion}
      transparentPaper/>}
    {spec.parts.map(part => <ArtPart key={part.id} part={part} frame={frame}
      reducedMotion={reducedMotion} washFilter={`url(#${id}-wash)`}
      dryFilter={`url(#${id}-dry)`}/>)}
  </svg>;
}
