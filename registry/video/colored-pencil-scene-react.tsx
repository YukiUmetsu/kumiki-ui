import type { CSSProperties } from "react";
import { PencilDrawing } from "./colored-pencil-react";
import {
  evaluatePencilCamera, inspectPencilScene, pencilSceneProgress,
} from "./colored-pencil-scene";
import type { PencilAnnotation, PencilSceneSpec } from "./colored-pencil-scene";

export interface PencilSceneProps {
  scene: PencilSceneSpec;
  /** Existing FilmStage local frame or a host absolute frame. No internal timeline. */
  frame: number;
  reducedMotion?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
}
const family: Record<"sans" | "serif" | "mono", string> = {
  sans: "Arial, 'Noto Sans CJK JP', 'Yu Gothic', system-ui, sans-serif",
  serif: "Georgia, 'Noto Serif CJK JP', 'Yu Mincho', serif",
  mono: "'Courier New', monospace",
};
function Annotation({ annotation, frame, reducedMotion = false }: {
  annotation: PencilAnnotation; frame: number; reducedMotion?: boolean;
}) {
  const t = pencilSceneProgress(frame, annotation.startFrame, annotation.durationFrames, reducedMotion);
  if (t === 0) return null;
  if (annotation.type === "stroke")
    return <path data-km-pencil-annotation={annotation.id}
      d={annotation.path} fill="none" stroke={annotation.color}
      strokeWidth={annotation.width} strokeLinecap="round" strokeLinejoin="round"
      pathLength={1} strokeDasharray={t.toFixed(5) + " 1"}/>;
  if (annotation.type === "callout") {
    const size = annotation.size ?? 16;
    return <g data-km-pencil-annotation={annotation.id} fill="none" stroke={annotation.color}>
      <path d={annotation.path} strokeWidth={1.3} strokeLinejoin="round" strokeLinecap="round"
        pathLength={1} strokeDasharray={t.toFixed(5) + " 1"}/>
      <text x={annotation.at[0]} y={annotation.at[1]}
        fontFamily={family.sans} fontSize={size} fontWeight={600} fill={annotation.color}
        stroke="none" opacity={Math.max(0, Math.min(1, (t - .68) / .32))}>{annotation.label}</text>
    </g>;
  }
  const lines = typeof annotation.text === "string" ? [annotation.text] : annotation.text;
  return <text data-km-pencil-annotation={annotation.id}
    data-km-source={annotation.type === "metric" ? annotation.provenance : undefined}
    x={annotation.at[0]} y={annotation.at[1]}
    fontFamily={family[annotation.font ?? "sans"]} fontSize={annotation.size}
    fill={annotation.color} opacity={t} stroke="none">
    {lines.map((line, i) => <tspan key={i} x={annotation.at[0]}
      dy={i === 0 ? 0 : annotation.size * 1.33}>{line}</tspan>)}
  </text>;
}

/** Reusable paper-world composition for engineering, anatomy, diagrams, storytelling and more.
 * The subject + paper move together; screen-space caption zones do not zoom away from the viewer.
 * FD1 remains the sole owner of shot edits, transitions, soundtrack and duration.
 */
export function PencilScene({ scene, frame, reducedMotion = false,
  label = "An authored coloured-pencil video scene", className, style }: PencilSceneProps) {
  const issues = inspectPencilScene(scene);
  if (issues.length) throw new RangeError("Invalid CP2 pencil scene: " + issues.join("; "));
  const { drawing, annotations = [] } = scene;
  const camera = evaluatePencilCamera(scene.camera, frame, reducedMotion);
  const transform = "translate(" + camera.x.toFixed(3) + " " + camera.y.toFixed(3) +
    ") scale(" + camera.zoom.toFixed(5) + ")";
  const renderIn = (space: "paper" | "screen") =>
    annotations.filter(a => (a.space ?? "screen") === space)
      .map(a => <Annotation key={a.id} annotation={a} frame={frame} reducedMotion={reducedMotion}/>);
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox={"0 0 " + drawing.width + " " + drawing.height}
    role="img" aria-label={label} className={className}
    data-km-pencil-scene="" data-km-pencil-scene-frame={frame}
    style={{ width: "100%", height: "100%", display: "block", overflow: "hidden", isolation: "isolate", ...style }}>
    <rect width={drawing.width} height={drawing.height} fill={drawing.paper}/>
    <g data-km-pencil-camera="" transform={transform}>
      <PencilDrawing drawing={drawing} frame={frame} reducedMotion={reducedMotion}
        label={label + " — paper artwork"}/>
      {renderIn("paper")}
    </g>
    {renderIn("screen")}
  </svg>;
}
