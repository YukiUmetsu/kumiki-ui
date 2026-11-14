import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import { evaluatePencilMark, hatchPencilRegion, inspectPencilDrawing, pencilHash } from "./colored-pencil";
import type { PencilDrawingSpec, PencilTrace } from "./colored-pencil";

export interface PencilDrawingProps {
  drawing: PencilDrawingSpec;
  /** Absolute frame from FilmStage or a host. The component owns no timer. */
  frame: number;
  reducedMotion?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
  /** Annotations, legend and other explanatory artwork owned by the scene. */
  children?: ReactNode;
}
function Trace({ trace, frame, reducedMotion = false }: { trace: PencilTrace; frame: number; reducedMotion?: boolean }) {
  const progress = evaluatePencilMark(frame, trace, reducedMotion);
  return <path d={trace.path} fill="none" stroke={trace.color} strokeWidth={trace.width}
    strokeLinecap="round" strokeLinejoin="round" opacity={trace.opacity ?? .85}
    pathLength={1} strokeDasharray={progress.toFixed(5) + " 1"} />;
}

/**
 * One SVG surface: paper tooth is in document coordinates, not re-generated per frame.
 * Independent pressure-sensitive marks are clipped to the authored shape, laid at meaningful
 * angles, and drawn at individual absolute frames. No uniform photography filter or WebGL.
 */
export function PencilDrawing({ drawing, frame, reducedMotion = false,
  label = "Coloured-pencil scientific illustration", className, style, children }: PencilDrawingProps) {
  const issues = inspectPencilDrawing(drawing);
  if (issues.length) throw new RangeError("Invalid pencil drawing: " + issues.join("; "));
  // Reject before laying out hundreds of brush marks.
  evaluatePencilMark(frame, { startFrame: 0, durationFrames: 1 }, reducedMotion);
  const uid = "km-cp-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const pores = Array.from({ length: 850 }, (_, i) => ({
    x: pencilHash(drawing.seed, i, 11) * 1024,
    y: pencilHash(drawing.seed, i, 13) * 1024,
    radius: .28 + pencilHash(drawing.seed, i, 15) * 1.3,
    opacity: .2 + pencilHash(drawing.seed, i, 17) * .48,
  }));
  const fibers = Array.from({ length: 180 }, (_, i) => ({
    x: pencilHash(drawing.seed, i, 21) * 1024,
    y: pencilHash(drawing.seed, i, 22) * 1024,
    len: 3 + pencilHash(drawing.seed, i, 23) * 23,
    vertical: pencilHash(drawing.seed, i, 24) < .18,
  }));
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox={"0 0 " + drawing.width + " " + drawing.height}
    role="img" aria-label={label} className={className}
    data-km-colored-pencil="" data-km-pencil-frame={frame}
    style={{ width: "100%", height: "100%", display: "block", overflow: "hidden", isolation: "isolate", ...style }}>
    <defs>
      <pattern id={uid + "-paper"} width={1024} height={1024} patternUnits="userSpaceOnUse">
        {pores.map((dot, i) => <circle key={i} cx={dot.x} cy={dot.y} r={dot.radius}
          fill="#917f6c" opacity={dot.opacity * drawing.paperTooth * .14} />)}
        {fibers.map((fiber, i) => <path key={i}
          d={"M" + fiber.x.toFixed(1) + " " + fiber.y.toFixed(1) + " l" +
            (fiber.vertical ? ".6 " + fiber.len.toFixed(1) : fiber.len.toFixed(1) + " .6")}
          stroke="#8d755b" strokeWidth={.45} opacity={drawing.paperTooth * .16} />)}
      </pattern>
      <pattern id={uid + "-tooth"} width={1024} height={1024} patternUnits="userSpaceOnUse">
        {pores.map((dot, i) => <circle key={i} cx={dot.x} cy={dot.y}
          r={dot.radius * (.45 + drawing.paperTooth * .45)} fill="#000"
          opacity={.25 + dot.opacity * .65}/>)}
      </pattern>
      <mask id={uid + "-pigment-mask"} x={0} y={0} width={drawing.width} height={drawing.height} maskUnits="userSpaceOnUse">
        <rect width={drawing.width} height={drawing.height} fill="#fff" />
        {drawing.paperTooth > 0 && <rect width={drawing.width} height={drawing.height} fill={"url(#" + uid + "-tooth)"} />}
      </mask>
      {drawing.regions.map((region, i) => <clipPath key={region.id} id={uid + "-region-" + i}
        clipPathUnits="userSpaceOnUse"><path d={region.path}/></clipPath>)}
    </defs>
    <rect width={drawing.width} height={drawing.height} fill={drawing.paper} />
    {drawing.paperTooth > 0 && <rect width={drawing.width} height={drawing.height} fill={"url(#" + uid + "-paper)"} />}
    {drawing.regions.map((region, index) => {
      const [x, y, w, h] = region.bounds;
      return <g key={region.id} data-km-pencil-region={region.id} transform={region.transform}>
        {/* An unfinished sheet stays blank until a real pencil stroke starts. Underpaint only
            softens voids beneath deposited pigment; it must never reveal the subject early. */}
        {region.underpaint && (reducedMotion || frame > region.layers[0].startFrame) &&
          <path data-km-pencil-underpaint="" d={region.path} fill={region.underpaint}
            opacity={.042 * evaluatePencilMark(frame, {
              startFrame: region.layers[0].startFrame,
              durationFrames: region.layers[0].durationFrames,
            }, reducedMotion)} />}
        <g clipPath={"url(#" + uid + "-region-" + index + ")"} mask={"url(#" + uid + "-pigment-mask)"}>
          {region.layers.map((layer, layerIndex) => {
            const strokes = hatchPencilRegion(region, layer);
            return <g key={layerIndex} data-km-pigment-layer={layerIndex} stroke={layer.color} fill="none"
              transform={"rotate(" + layer.angle + " " + (x + w / 2) + " " + (y + h / 2) + ")"}>
              {strokes.map((mark, i) => <path key={i} d={mark.path} strokeWidth={mark.width}
                strokeLinecap="round" opacity={mark.opacity} pathLength={1}
                strokeDasharray={evaluatePencilMark(frame, mark, reducedMotion).toFixed(5) + " 1"} />)}
            </g>;
          })}
        </g>
        <g data-km-graphite="">
          <Trace trace={region.contour} frame={frame} reducedMotion={reducedMotion}/>
          {region.details?.map((trace, i) => <Trace key={i} trace={trace} frame={frame} reducedMotion={reducedMotion}/>)}
        </g>
      </g>;
    })}
    {children}
  </svg>;
}
