import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import { InkWash } from "./ink-wash-react";
import type { InkWashSpec } from "./ink-wash";
import {
  assertInkFilm, inkCameraAt, inkLayerProgress, inkRevealPath,
} from "./ink-wash-story";
import type { InkFilmPlan, InkLayerPlan, InkShot } from "./ink-wash-story";

export interface InkMediaRevealProps {
  width: number;
  height: number;
  layer: InkLayerPlan;
  frame: number;
  children: ReactNode;
  reducedMotion?: boolean;
  /** Do not tint real-world footage unless the creator deliberately opts in. */
  treatment?: "wash" | "original";
}

/**
 * An absolute-frame material transition for *any* rendered React content.
 * The child may be a photograph, 3D character, diagram, live footage or caption.
 * The SVG matte changes *visibility* only; it never pretends that media was hand-painted.
 */
export function InkMediaReveal({
  width, height, layer, frame, children, reducedMotion = false, treatment,
}: InkMediaRevealProps) {
  const rawId = useId();
  const id = "kminkclip" + rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const progress = inkLayerProgress(layer, frame, reducedMotion);
  if (progress <= 0) return null;
  const look = treatment ?? layer.treatment ?? "original";
  const material: CSSProperties = look === "wash"
    ? { filter: "grayscale(1) contrast(1.22)", mixBlendMode: "multiply" }
    : {};
  const shape = progress < 1 && layer.reveal !== "instant";
  const content = <div data-km-ink-layer={layer.id} data-km-ink-progress={progress.toFixed(3)}
    style={{ width, height, position: "relative", ...material }}>{children}</div>;
  if (!shape) return <div style={{ position: "absolute", inset: 0, width, height }}>{content}</div>;
  const path = inkRevealPath(width, height, progress, layer.reveal, layer.seed ?? 1,
    layer.direction ?? "right", layer.origin);
  return <svg aria-hidden="true" width={width} height={height} viewBox={"0 0 " + width + " " + height}
    data-km-ink-reveal={layer.reveal}
    style={{ position: "absolute", inset: 0, width, height, display: "block", overflow: "hidden" }}>
    <defs>
      <clipPath id={id} clipPathUnits="userSpaceOnUse"><path d={path}/></clipPath>
    </defs>
    <foreignObject x={0} y={0} width={width} height={height} clipPath={"url(#" + id + ")"}>
      <div style={{ width, height }} data-km-ink-media="">{content}</div>
    </foreignObject>
  </svg>;
}

export interface InkWashSceneProps {
  /** Consumer-authored paint substrate; may contain zero strokes for media-only stories. */
  spec: InkWashSpec;
  frame: number;
  /** Frame and layers local to one FD1 shot, not a parallel film timeline. */
  shot: InkShot;
  /** Any media or live UI is provided by the host, never downloaded by this component. */
  renderLayer: (layer: InkLayerPlan, context: { frame: number; reducedMotion: boolean }) => ReactNode;
  reducedMotion?: boolean;
  /** Fixed captions / badges / legends unaffected by ink or camera masks. */
  children?: ReactNode;
  /** Ink can sit behind or in front of the other visual layers. */
  paintOrder?: "under" | "over";
  /** A11y label describing the scene; live text remains ordinary DOM outside the SVG masks. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}
export function InkWashScene({
  spec, frame, shot, renderLayer, reducedMotion = false, children, paintOrder = "under",
  label = "Ink wash composition", className, style,
}: InkWashSceneProps) {
  // The shot is a local scene plan; validate once through the same contract as FD1.
  const plan: InkFilmPlan = {
    id: "single-shot", outputs: [{ id: "proof", width: spec.width, height: spec.height }], shots: [shot],
  };
  assertInkFilm(plan);
  if (!Number.isSafeInteger(frame) || frame < 0 || frame >= shot.durationFrames)
    throw new RangeError("INK2 scene frame is outside the shot duration.");
  const camera = inkCameraAt(shot.camera, reducedMotion ? shot.durationFrames - 1 : frame);
  const paint = <div data-km-ink-paint="" style={{ position: "absolute", inset: 0, width: spec.width, height: spec.height,
    transform: "translate(" + camera.x.toFixed(3) + "px," + camera.y.toFixed(3) + "px) scale(" + camera.zoom.toFixed(5) + ")",
    transformOrigin: "50% 50%" }}>
    <InkWash spec={spec} frame={frame} reducedMotion={reducedMotion} label={label} />
  </div>;
  return <div className={className} role="group" aria-label={label}
    data-km-ink-scene="" data-km-ink-scene-frame={frame}
    style={{ position: "relative", overflow: "hidden", isolation: "isolate", width: spec.width,
      height: spec.height, background: spec.paper, ...style }}>
    {paintOrder === "under" && paint}
    {shot.layers.map(layer => {
      const factor = layer.parallax ?? 1;
      const zoom = 1 + (camera.zoom - 1) * factor;
      const transform = "translate(" + (camera.x * factor).toFixed(3) + "px," +
        (camera.y * factor).toFixed(3) + "px) scale(" + zoom.toFixed(5) + ")";
      // The frame is relative to *this shot*, which FilmStage already computed.
      // All content keeps its original complete dimensions so camera scale cannot crop its own matte.
      return <div key={layer.id} data-km-ink-layer-host={layer.id} style={{
        width: spec.width, height: spec.height, position: "absolute", inset: 0,
        transform, transformOrigin: "50% 50%", pointerEvents: "none",
      }}>
        <InkMediaReveal width={spec.width} height={spec.height} layer={layer} frame={frame}
          reducedMotion={reducedMotion}>
          {renderLayer(layer, { frame, reducedMotion })}
        </InkMediaReveal>
      </div>;
    })}
    {paintOrder === "over" && paint}
    {children && <div data-km-ink-reading-plane="" style={{ position: "absolute", inset: 0,
      pointerEvents: "none" }}>{children}</div>}
  </div>;
}
