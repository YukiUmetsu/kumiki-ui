import { memo, useId } from "react";
import type { ReactNode, SVGProps } from "react";
import { WatercolourPaper, WatercolourSurface, WatercolourTideFilter, WatercolourWashFilter } from "./watercolour-brush-react";
import { evaluatePaintWash, inspectPaintedComposition, paintBackrunAt, paintBackrunPath } from "./painted-composition";
import type { PaintWash, PaintedCompositionSpec, WashFrame } from "./painted-composition";

export interface PaintedCompositionProps extends Omit<SVGProps<SVGSVGElement>, "children" | "width" | "height" | "viewBox"> {
  spec: PaintedCompositionSpec;
  frame: number;
  reducedMotion?: boolean;
  transparentPaper?: boolean;
  /** Optional camera for all painted layers. Texture stays anchored to the painted paper. */
  camera?: { x: number; y: number; zoom: number };
  /** Text/measurement overlays remain real vectors and do not inherit pigment distortion. */
  children?: ReactNode;
  label?: string;
}
const tones = [0, .16, .29, .45, .63, .84] as const;

interface WashLayerProps {
  spec: PaintedCompositionSpec;
  wash: PaintWash;
  frameState: WashFrame;
  frame: number;
  reducedMotion: boolean;
  index: number;
  uid: string;
}

/** A paint layer acts on its SUBJECT'S ORIGINAL SILHOUETTE.
 * Its brush reveals coverage; the shared watercolour material gives the wash its wandering dried contour, a dried
 * edge as strong as the layer's `edgePooling`, granulation as strong as its `granulation`, and the accent charged
 * wet-in-wet into it. Reserves, backruns and details stay independent.
 */
const PaintedWashLayer = memo(function PaintedWashLayer({ spec, wash, frameState: state, frame, reducedMotion, index, uid }: WashLayerProps) {
  if (state.deposit <= 0) return null;
  const prefix = uid + "-wash-" + index;
  const shapeId = prefix + "-shape", brushId = prefix + "-gesture";
  const reserveId = prefix + "-reserve", gradientId = prefix + "-pigment";
  const amount = tones[wash.tone] * wash.opacity;
  const deposited = amount * (.77 + .14 * state.absorption);
  // The wet fringe is part of the same wash: it carries the dried edge once the water has gone.
  const wetFringe = wash.water * state.spread * .6 * deposited;
  const hasReserve = Boolean(wash.reservePaths?.length);
  const animated = wash.paintFrames > 0;
  return <g data-km-paint-wash={wash.id} data-km-wash-phase={state.settled ? "dry" : "wet"}
    style={{ mixBlendMode: "multiply" }} pointerEvents="none">
    <defs>
      <clipPath id={shapeId} clipPathUnits="userSpaceOnUse"><path d={wash.path}/></clipPath>
      <linearGradient id={gradientId} x1="10%" y1="0%" x2="85%" y2="100%">
        <stop offset="0%" stopColor={wash.pigment}/>
        <stop offset="48%" stopColor={wash.accent ?? wash.pigment}/>
        <stop offset="100%" stopColor={wash.pigment}/>
      </linearGradient>
      <WatercolourWashFilter id={prefix + "-material"} seed={spec.seed + index * 31} tooth={spec.paper.tooth}
        granulation={wash.granulation * (.4 + .5 * spec.paper.tooth)} driedEdge={.25 + .7 * wash.edgePooling}
        rim={1.6 + 1.4 * wash.water} mottle={.15 + .3 * wash.water}
        charge={wash.accent ? { color: wash.accent, amount: .25 + .3 * wash.water } : undefined}/>
      {animated && <mask id={brushId} maskUnits="userSpaceOnUse"
        x={0} y={0} width={spec.width} height={spec.height}>
        {state.deposit > 0 && <path d={wash.brushPath} fill="none" stroke="#fff"
          strokeWidth={wash.brushWidth} strokeLinecap="round" strokeLinejoin="round"
          pathLength={1} strokeDasharray={`${state.deposit} ${Math.max(.0001, 1-state.deposit)}`}/>}
      </mask>}
      {hasReserve && <mask id={reserveId} maskUnits="userSpaceOnUse"
        x={0} y={0} width={spec.width} height={spec.height}>
        <rect width={spec.width} height={spec.height} fill="#fff"/>
        {wash.reservePaths?.map((p, i) => <path key={i} d={p} fill="#000"/>)}
      </mask>}
    </defs>
    <g mask={animated && state.deposit < 1 ? `url(#${brushId})` : undefined}>
      <g mask={hasReserve ? `url(#${reserveId})` : undefined}>
        <g data-km-wash-material="" filter={`url(#${prefix}-material)`}>
          {/* The wash creeps a little beyond its line while wet; never an RGB-wide film filter. */}
          {state.spread > 0 && <path d={wash.path} fill={wash.pigment} opacity={wetFringe}
            stroke={wash.pigment} strokeWidth={2.5 * state.spread * wash.water} strokeLinejoin="round"/>}
          <path data-km-wash-pigment="" d={wash.path} fill={`url(#${gradientId})`}
            opacity={deposited}/>
        </g>
        <g clipPath={`url(#${shapeId})`}>
          {/* A drop into still-damp pigment pushes out a lighter centre and leaves a lobed,
              partly visible tide line inside the original shape. */}
          {wash.backruns?.map((run, i) => {
            const state = paintBackrunAt(run, frame, reducedMotion);
            if (state.progress === 0) return null;
            const path = paintBackrunPath(run, spec.seed + index * 97 + i * 23, state.progress);
            return <g key={i} data-km-watercolour-backrun="" data-km-backrun-phase={state.settled ? "dry" : "wet"}>
              <path d={path} fill={spec.paper.color}
                opacity={run.strength * (.26 + .18 * state.progress)} />
              <path d={path} fill="none" stroke={wash.pigment}
                strokeWidth={Math.max(1.2, Math.min(5, 1.4 + run.radius * .04))}
                opacity={Math.min(.75, amount * 1.4) * run.strength * (.3 + .5 * state.progress)}
                filter={`url(#${uid}-tide)`} />
            </g>;
          })}
          {wash.details?.map((detail, i) => <path key={i} d={detail.path}
            fill="none" stroke={detail.color} strokeWidth={detail.width}
            strokeLinecap="round" strokeLinejoin="round" opacity={detail.opacity * amount}/>)}
        </g>
      </g>
    </g>
  </g>;
}, (a, b) => a.spec === b.spec && a.wash === b.wash &&
  a.index === b.index && a.uid === b.uid &&
  (a.wash.backruns?.length ? a.frame === b.frame && a.reducedMotion === b.reducedMotion : true) &&
  a.frameState.deposit === b.frameState.deposit && a.frameState.spread === b.frameState.spread &&
  a.frameState.absorption === b.frameState.absorption && a.frameState.settled === b.frameState.settled
);

/** Reusable SVG composition: arbitrary supplied paint-path silhouettes, real brush trails and masked source imagery.
 * The source image is a separate, explicitly identified medium; it is NOT represented as simulation output.
 */
export function PaintedComposition({
  spec, frame, reducedMotion = false, transparentPaper = false, camera,
  label = "Layered painted illustration", children, style, ...svgProps
}: PaintedCompositionProps) {
  const issues = inspectPaintedComposition(spec);
  if (issues.length) throw new Error("Invalid WM2 composition: " + issues.map(x => x.path + ": " + x.message).join("; "));
  if (!Number.isSafeInteger(frame) || frame < 0) throw new RangeError("Painted composition frame must be a nonnegative integer.");
  if (camera && (!Number.isFinite(camera.x) || !Number.isFinite(camera.y) || !Number.isFinite(camera.zoom) ||
    camera.zoom < .1 || camera.zoom > 24)) throw new RangeError("Camera requires finite x,y and zoom 0.1..24.");

  const rawId = useId(), uid = "wm2" + rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const transform = camera ? `translate(${camera.x} ${camera.y}) scale(${camera.zoom})` : undefined;
  return <svg {...svgProps} xmlns="http://www.w3.org/2000/svg"
    viewBox={`0 0 ${spec.width} ${spec.height}`}
    role={svgProps["aria-hidden"] ? undefined : "img"}
    aria-label={svgProps["aria-hidden"] ? undefined : label}
    data-km-painted-composition="" data-km-paint-frame={frame}
    style={{ width: "100%", height: "100%", display: "block", isolation: "isolate", overflow: "hidden", ...style }}>
    <defs>
      <WatercolourTideFilter id={uid + "-tide"} seed={spec.seed} tooth={spec.paper.tooth}/>
    </defs>
    <g transform={transform}>
      {!transparentPaper && <g data-km-composition-paper="">
        <WatercolourPaper id={uid + "-paper"} width={spec.width} height={spec.height}
          color={spec.paper.color} tooth={spec.paper.tooth} seed={spec.seed}/>
      </g>}
      {spec.layers.map((layer, i) => {
        if (layer.kind === "wash") return <PaintedWashLayer key={layer.id}
          spec={spec} wash={layer} index={i} uid={uid}
          frame={frame} reducedMotion={reducedMotion}
          frameState={evaluatePaintWash(layer, frame, reducedMotion)}/>;
        if (layer.kind === "brush") {
          return <WatercolourSurface key={layer.id} spec={{ version: 1, medium: "watercolour",
            width: spec.width, height: spec.height, seed: spec.seed + i,
            paper: spec.paper, strokes: [layer.stroke] }}
            frame={frame} reducedMotion={reducedMotion} transparentPaper aria-hidden/>;
        }
        const [x, y, width, height] = layer.bounds;
        const id = uid + "-image-" + i;
        return <g key={layer.id} data-km-source-image={layer.id}>
          <defs><clipPath id={id} clipPathUnits="userSpaceOnUse"><path d={layer.silhouettePath}/></clipPath></defs>
          <image x={x} y={y} width={width} height={height}
            href={layer.href} clipPath={`url(#${id})`} opacity={layer.opacity}
            preserveAspectRatio="xMidYMid slice"/>
        </g>;
      })}
    </g>
    {/* Clean, undistorted reading layer: titles, diagrams, accessibility labels. */}
    {children}
  </svg>;
}
