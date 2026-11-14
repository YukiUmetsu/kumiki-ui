import type { ReactNode, SVGProps } from "react";
import { evaluateInkActor } from "./ink-wash-actor";
import type { InkActorCue, InkActorFrame, InkActorPart, InkActorRig, InkPartPose } from "./ink-wash-actor";

export interface InkWashActorProps extends Omit<SVGProps<SVGSVGElement>, "children" | "viewBox" | "width" | "height"> {
  rig: InkActorRig;
  cues: readonly InkActorCue[];
  frame: number;
  reducedMotion?: boolean;
  /** Host retains all actual authored vector/ink artwork, rig revision, licensing and identity. */
  renderPart: (part: InkActorPart, pose: InkPartPose, performance: InkActorFrame) => ReactNode;
  label?: string;
}
/**
 * Native independent-part paint performance. The material's centerlines and
 * tonal artwork remain in host-provided part art; this only poses named layers.
 * A nested hierarchy ensures facial parts follow their head instead of sliding
 * off during a nod or a gesture. The actor's camera stays with the parent film.
 */
export function InkWashActor({
  rig, cues, frame, reducedMotion = false, renderPart, label = "Ink-painted character",
  style, ...svgProps
}: InkWashActorProps) {
  const performance = evaluateInkActor(rig, cues, frame, reducedMotion);
  const children = new Map<string, InkActorPart[]>();
  for (const part of rig.parts) {
    const bucket = part.parent ?? "";
    children.set(bucket, [...(children.get(bucket) ?? []), part]);
  }
  for (const group of children.values()) group.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  function renderChild(part: InkActorPart): ReactNode {
    const pose = performance.poses[part.id], [x,y] = part.pivot;
    const xf = `translate(${pose.x.toFixed(4)} ${pose.y.toFixed(4)}) translate(${x} ${y}) rotate(${pose.rotation.toFixed(4)}) scale(${pose.scaleX.toFixed(5)} ${pose.scaleY.toFixed(5)}) translate(${-x} ${-y})`;
    return <g key={part.id} data-km-ink-actor-part={part.id} data-km-ink-role={part.role} transform={xf}>
      {renderPart(part, pose, performance)}
      {(children.get(part.id) ?? []).map(renderChild)}
    </g>;
  }
  return <svg {...svgProps} xmlns="http://www.w3.org/2000/svg"
    viewBox={`0 0 ${rig.width} ${rig.height}`}
    role={svgProps["aria-hidden"] ? undefined : "img"}
    aria-label={svgProps["aria-hidden"] ? undefined : (svgProps["aria-label"] ?? label)}
    data-km-ink-actor={rig.id}
    data-km-ink-actor-revision={rig.revision}
    data-km-ink-actor-frame={frame}
    data-km-ink-actor-sample={performance.sampledFrame}
    data-km-ink-actor-viseme={performance.viseme}
    data-km-ink-actor-blink={String(performance.blink)}
    style={{width:"100%",height:"100%",display:"block",overflow:"visible", ...style}}>
    <g data-km-ink-actor-root="" transform={`translate(${performance.root[0].toFixed(4)} ${performance.root[1].toFixed(4)})`}>
      {(children.get("") ?? []).map(renderChild)}
    </g>
  </svg>;
}
