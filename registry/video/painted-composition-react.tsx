import { memo, useId, useMemo } from "react";
import type { ReactNode, SVGProps } from "react";
import { WatercolourSurface } from "./watercolour-brush-react";
import { evaluatePaintWash, inspectPaintedComposition, samplePigmentGrains } from "./painted-composition";
import type { PaintWash, PaintedCompositionSpec, PigmentGrain, WashFrame } from "./painted-composition";

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
  index: number;
  uid: string;
  grains: readonly PigmentGrain[];
}

/** A paint layer acts on its SUBJECT'S ORIGINAL SILHOUETTE.
 * Its brush reveals coverage; material wash, pigment fringe, reserve and granulation are independent.
 */
const PaintedWashLayer = memo(function PaintedWashLayer({ spec, wash, frameState: state, index, uid, grains }: WashLayerProps) {
  if (state.deposit <= 0) return null;
  const prefix = uid + "-wash-" + index;
  const shapeId = prefix + "-shape", brushId = prefix + "-gesture";
  const reserveId = prefix + "-reserve", gradientId = prefix + "-pigment";
  const [x, y, width, height] = wash.bounds;
  const amount = tones[wash.tone] * wash.opacity;
  const deposited = amount * (.77 + .14 * state.absorption);
  const wetFringe = wash.water * state.spread * .24 * amount;
  const edge = amount * wash.edgePooling * (.085 + .18 * state.absorption);
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
    <g mask={animated ? `url(#${brushId})` : undefined}>
      <g mask={hasReserve ? `url(#${reserveId})` : undefined}>
        {/* Wash extends gently beyond the line only during drying; this is not an RGB-wide film filter. */}
        {state.spread > 0 && <path d={wash.path} fill={wash.pigment} opacity={wetFringe}
          stroke={wash.accent ?? wash.pigment} strokeWidth={2.5 * state.spread * wash.water}
          strokeLinejoin="round" filter={`url(#${uid}-edge)`}/>}
        <path data-km-wash-pigment="" d={wash.path} fill={`url(#${gradientId})`}
          opacity={deposited}/>
        <g clipPath={`url(#${shapeId})`}>
          {/* Underpainting is transparent and pigment varies by paper coordinate, not current frame. */}
          {wash.accent && <ellipse cx={x + width*.7} cy={y + height*.53}
            rx={width*.34} ry={height*.32} fill={wash.accent}
            opacity={.12 * wash.water * amount}/>}
          {grains.map((g, i) => <ellipse key={i} cx={g.x} cy={g.y}
            rx={g.radius * (1 + .7 * wash.water)} ry={g.radius * .57}
            fill={g.accent && wash.accent ? wash.accent : wash.pigment}
            opacity={g.strength * wash.granulation * (.3 + .7 * state.absorption)}/>)}
          {/* Paper valleys accumulate pigment at the perimeter; line is irregular, light and incomplete. */}
          {edge > 0 && <path d={wash.path} fill="none" stroke={wash.pigment}
            strokeWidth={Math.max(.6, 2.6 * wash.water + 1.2 * wash.edgePooling)}
            opacity={edge} strokeDasharray={`${10 + index % 7} ${3 + index % 5}`}
            filter={`url(#${uid}-edge)`}/>}
          {wash.details?.map((detail, i) => <path key={i} d={detail.path}
            fill="none" stroke={detail.color} strokeWidth={detail.width}
            strokeLinecap="round" strokeLinejoin="round" opacity={detail.opacity * amount}/>)}
        </g>
      </g>
    </g>
  </g>;
}, (a, b) => a.spec === b.spec && a.wash === b.wash && a.grains === b.grains &&
  a.index === b.index && a.uid === b.uid &&
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
  const grains = useMemo(() => spec.layers.map((layer, i) => layer.kind === "wash"
    ? samplePigmentGrains(layer, spec.seed + 101 * i) : []), [spec]);
  const paper = useMemo(() => Array.from({ length: 290 }, (_, i) => ({
    x: (i * 9176.113 + spec.seed * 43.19) % spec.width,
    y: (i * 3836.137 + spec.seed * 27.71) % spec.height,
    length: .9 + (i % 11) * .65,
    alpha: .04 + ((i * 23) % 17) / 170,
  })), [spec]);
  const transform = camera ? `translate(${camera.x} ${camera.y}) scale(${camera.zoom})` : undefined;
  return <svg {...svgProps} xmlns="http://www.w3.org/2000/svg"
    viewBox={`0 0 ${spec.width} ${spec.height}`}
    role={svgProps["aria-hidden"] ? undefined : "img"}
    aria-label={svgProps["aria-hidden"] ? undefined : label}
    data-km-painted-composition="" data-km-paint-frame={frame}
    style={{ width: "100%", height: "100%", display: "block", isolation: "isolate", overflow: "hidden", ...style }}>
    <defs>
      <filter id={uid+"-edge"} x="-7%" y="-7%" width="114%" height="114%"
        colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".019 .027" numOctaves={2}
          seed={1+(spec.seed % 997)} result="pores"/>
        <feDisplacementMap in="SourceGraphic" in2="pores" scale={3*spec.paper.tooth}
          xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs>
    <g transform={transform}>
      {!transparentPaper && <>
        <rect width={spec.width} height={spec.height} fill={spec.paper.color}/>
        <g pointerEvents="none" data-km-composition-paper="">
          {paper.map((p, i) => <path key={i}
            d={`M${p.x.toFixed(1)} ${p.y.toFixed(1)} h${p.length.toFixed(1)}`}
            stroke="#777064" strokeWidth=".6" opacity={p.alpha * spec.paper.tooth}/>)}
        </g>
      </>}
      {spec.layers.map((layer, i) => {
        if (layer.kind === "wash") return <PaintedWashLayer key={layer.id}
          spec={spec} wash={layer} index={i} uid={uid}
          grains={grains[i]} frameState={evaluatePaintWash(layer, frame, reducedMotion)}/>;
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
