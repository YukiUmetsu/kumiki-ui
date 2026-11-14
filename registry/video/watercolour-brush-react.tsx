import { memo, useId, useMemo } from "react";
import type { CSSProperties, SVGProps } from "react";
import { buildBrushRibbon, evaluatePaintStroke, inspectPaintSurface, paintHash, sampleBrushCenterline } from "./watercolour-brush";
import type { PaintStroke, PaintSurfaceSpec, BrushSample, StrokePhase } from "./watercolour-brush";

export interface WatercolourSurfaceProps extends Omit<SVGProps<SVGSVGElement>, "children" | "width" | "height" | "viewBox"> {
  spec: PaintSurfaceSpec;
  /** Absolute, integer frame supplied by FilmStage or an export caller. */
  frame: number;
  reducedMotion?: boolean;
  /** Ink only: host can supply a separately authored or painted paper. */
  transparentPaper?: boolean;
  label?: string;
  style?: CSSProperties;
}
interface PaperMark { x: number; y: number; length: number; angle: number; alpha: number }
interface PigmentMark { x: number; y: number; radius: number; alpha: number }
interface BristleMark { d: string; width: number; opacity: number }
interface Bloom { x: number; y: number; r: number; alpha: number }

function paperMarks(spec: PaintSurfaceSpec): PaperMark[] {
  return Array.from({ length: 340 }, (_, i) => ({
    x: paintHash(spec.seed, i, 11) * spec.width,
    y: paintHash(spec.seed, i, 17) * spec.height,
    length: 1 + paintHash(spec.seed, i, 23) * 10,
    angle: paintHash(spec.seed, i, 29) * 360,
    alpha: .06 + paintHash(spec.seed, i, 31) * .15,
  }));
}

/** These holes and flecks are on the PAPER, not attached to the moving brush tip or the viewport. */
function pigmentMarks(spec: PaintSurfaceSpec, stroke: PaintStroke, index: number, samples: readonly BrushSample[]): PigmentMark[] {
  const count = Math.min(96, Math.max(24, Math.ceil(samples.length * .36)));
  return Array.from({ length: count }, (_, i) => {
    const j = Math.min(samples.length - 1, Math.floor(paintHash(spec.seed + index * 43, i, 5) * samples.length));
    const s = samples[j], a = paintHash(spec.seed + index * 89, i, 7) * Math.PI * 2;
    const r = Math.sqrt(paintHash(spec.seed + index * 47, i, 13)) * s.radius;
    return {
      x: s.x + Math.cos(a) * r, y: s.y + Math.sin(a) * r,
      radius: .4 + paintHash(spec.seed + index * 31, i, 19) * Math.max(.9, Math.min(3.8, stroke.width * .11)),
      alpha: .14 + paintHash(spec.seed + index * 37, i, 23) * .72,
    };
  });
}

/** Sparse lifted fibres running WITH brush direction; never a set of equal-width vector stripes. */
function bristleMarks(spec: PaintSurfaceSpec, stroke: PaintStroke, index: number, samples: readonly BrushSample[]): BristleMark[] {
  if (!stroke.dryBrush || samples.length < 4) return [];
  const count = Math.min(36, Math.round((5 + samples.length * .11) * stroke.dryBrush));
  return Array.from({ length: count }, (_, i) => {
    const s = Math.min(samples.length - 3, Math.floor(paintHash(spec.seed + index * 13, i, 29) * (samples.length - 3)));
    const e = Math.min(samples.length - 1, s + 2 + Math.floor(paintHash(spec.seed + index * 17, i, 31) * 12));
    const mid = samples[s], end = samples[e];
    const dx = end.x - mid.x, dy = end.y - mid.y, length = Math.max(.01, Math.hypot(dx, dy));
    const lane = (paintHash(spec.seed + index * 43, i, 41) - .5) * 1.45 * Math.min(mid.radius, end.radius);
    const nx = -dy / length, ny = dx / length;
    const x1 = mid.x + nx * lane, y1 = mid.y + ny * lane;
    const x2 = end.x + nx * lane, y2 = end.y + ny * lane;
    const bend = (paintHash(spec.seed + index, i, 47) - .5) * Math.min(8, mid.radius);
    return {
      d: `M${x1.toFixed(2)} ${y1.toFixed(2)} Q${((x1 + x2) / 2 + nx * bend).toFixed(2)} ${((y1 + y2) / 2 + ny * bend).toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      width: .35 + paintHash(spec.seed + index, i, 53) * Math.min(2.8, stroke.width * .095),
      opacity: .38 + paintHash(spec.seed + index, i, 59) * .62,
    };
  });
}

function blooms(spec: PaintSurfaceSpec, index: number, samples: readonly BrushSample[]): Bloom[] {
  const count = Math.max(1, Math.min(8, Math.floor(samples.length / 38)));
  return Array.from({ length: count }, (_, i) => {
    const s = samples[Math.floor((i + .5) * samples.length / count)];
    return { x: s.x, y: s.y, r: s.radius * (1.15 + paintHash(spec.seed, index * 37 + i, 61) * 1.7),
      alpha: .14 + paintHash(spec.seed, index * 53 + i, 67) * .19 };
  });
}

interface PreparedStroke {
  samples: BrushSample[];
  flecks: PigmentMark[];
  bristles: BristleMark[];
  blooms: Bloom[];
}

/**
 * SVG uses real pressure-derived filled polygons, a separate spreading wash, paper-tooth
 * holes and directional bristle splitting. Filters act ONLY on pigmented edges.
 * No simulated clock, canvas context or random input is needed during capture.
 */
/** Dried strokes do not spend another React reconciliation or SVG filter pass
 * when only a later, still-wet stroke changes. A vital contract for long films.
 */
interface PaintStrokeLayerProps {
  spec: PaintSurfaceSpec;
  stroke: PaintStroke;
  prepared: PreparedStroke;
  phase: StrokePhase;
  i: number;
  uid: string;
}
const TONE_LEVELS = [0, .23, .38, .55, .72, .91] as const;
const PaintStrokeLayer = memo(function PaintStrokeLayer({ spec, stroke, prepared, phase, i, uid }: PaintStrokeLayerProps) {
  if (phase.deposit === 0) return null;
  const main = buildBrushRibbon(stroke, phase.deposit, 0, spec.seed + i);
  const spread = buildBrushRibbon(stroke, phase.deposit, .26 * stroke.water * phase.spread, spec.seed + i);
  const density = TONE_LEVELS[stroke.tone] * stroke.load;
  const coreOpacity = Math.min(.98, density * (.85 - stroke.dryBrush * .11));
  const edgeOpacity = Math.min(.4, density * (.12 + stroke.water * .21) * phase.spread);
  const tint = Math.min(.22, density * .24 * phase.spread);
  const clip = uid + "-clip-" + i, maskId = uid + "-bristles-" + i;
  const dryFibers = stroke.dryBrush >= .15 && prepared.bristles.length > 0;
  return <g data-km-brush-stroke={stroke.id} data-km-paint-phase={phase.settled ? "dry" : "wet"}
    style={{ mixBlendMode: "multiply" }} pointerEvents="none">
    <defs>
      <clipPath id={clip} clipPathUnits="userSpaceOnUse"><path d={main.path}/></clipPath>
      {dryFibers && <mask id={maskId} maskUnits="userSpaceOnUse"
        x={0} y={0} width={spec.width} height={spec.height}>
        <rect width={spec.width} height={spec.height} fill="white"/>
        {prepared.bristles.map((mark, j) =>
          <path key={j} d={mark.d} stroke="#000" opacity={stroke.dryBrush * mark.opacity}
            strokeWidth={mark.width} fill="none" strokeLinecap="round"/>)}
      </mask>}
    </defs>
    {phase.spread > 0 && <path data-km-wet-spread="" d={spread.path} fill={stroke.color}
      opacity={edgeOpacity} filter={stroke.width > 20 ? `url(#${uid}-edge)` : undefined}/>}
    <path data-km-deposition="" d={main.path} fill={stroke.color} opacity={coreOpacity}
      mask={dryFibers ? `url(#${maskId})` : undefined}/>
    <g clipPath={`url(#${clip})`}>
      {prepared.flecks.map((p, j) => <circle key={j} cx={p.x} cy={p.y} r={p.radius}
        fill={j % 4 === 0 ? spec.paper.color : stroke.color}
        opacity={(j % 4 === 0 ? .48 : .29) * p.alpha * (stroke.dryBrush + spec.paper.tooth * .7)}/>)}
      {stroke.water > .15 && phase.spread > 0 && prepared.blooms.map((b, j) =>
        <circle key={j} cx={b.x} cy={b.y} r={b.r * (.65 + phase.spread * .35)}
          fill={`url(#${uid}-bloom)`} opacity={b.alpha * stroke.water * phase.spread}/>)}
      {tint > 0 && <path d={main.path} fill={stroke.color} opacity={tint * (1 - .25 * phase.absorption)}/>}
    </g>
  </g>;
}, (a, b) =>
  a.spec === b.spec && a.stroke === b.stroke && a.prepared === b.prepared &&
  a.i === b.i && a.uid === b.uid && a.phase.deposit === b.phase.deposit &&
  a.phase.spread === b.phase.spread && a.phase.absorption === b.phase.absorption &&
  a.phase.settled === b.phase.settled
);

export function WatercolourSurface({
  spec, frame, reducedMotion = false, transparentPaper = false,
  label = "Brush-painted watercolor illustration", style, ...props
}: WatercolourSurfaceProps) {
  const issues = inspectPaintSurface(spec);
  if (issues.length) throw new Error("Invalid WM1 surface: " + issues.map(i => i.path + ": " + i.message).join("; "));
  if (!Number.isSafeInteger(frame) || frame < 0) throw new RangeError("Paint frame must be a nonnegative integer.");
  const rawId = useId();
  const uid = "wm" + rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const paper = useMemo(() => paperMarks(spec), [spec]);
  const prepared = useMemo<PreparedStroke[]>(() => spec.strokes.map((stroke, index) => {
    const samples = sampleBrushCenterline(stroke);
    return { samples, flecks: pigmentMarks(spec, stroke, index, samples),
      bristles: bristleMarks(spec, stroke, index, samples), blooms: blooms(spec, index, samples) };
  }), [spec]);

  return <svg {...props} role={props["aria-hidden"] ? undefined : "img"}
    aria-label={props["aria-hidden"] ? undefined : label}
    xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${spec.width} ${spec.height}`}
    data-km-watercolour="" data-km-paint-frame={frame} data-km-paint-medium={spec.medium}
    style={{ width: "100%", height: "100%", display: "block", overflow: "hidden", isolation: "isolate", ...style }}>
    <defs>
      {/* A single stable paper relief pattern. It moves with artwork, not with the camera/screen. */}
      <filter id={uid + "-edge"} x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".014 .025" numOctaves={3} seed={1 + (spec.seed % 991)} result="tooth" />
        <feDisplacementMap in="SourceGraphic" in2="tooth" scale={3.2 * spec.paper.tooth} xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <radialGradient id={uid + "-bloom"}>
        <stop offset="0%" stopColor="#ffffff" stopOpacity=".70" />
        <stop offset="53%" stopColor="#ffffff" stopOpacity=".18" />
        <stop offset="82%" stopColor="#000000" stopOpacity="0" />
        <stop offset="94%" stopColor="#000000" stopOpacity=".25" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>
    </defs>
    {!transparentPaper && <>
      <rect width={spec.width} height={spec.height} fill={spec.paper.color}/>
      <g data-km-paper-tooth="" pointerEvents="none">
        {paper.map((p, i) => <path key={i} d={`M${p.x.toFixed(1)} ${p.y.toFixed(1)} l${p.length.toFixed(1)} 0`}
          stroke="#64594B" strokeWidth=".55" opacity={p.alpha * spec.paper.tooth}
          transform={`rotate(${p.angle.toFixed(2)} ${p.x.toFixed(1)} ${p.y.toFixed(1)})`}/>)}
      </g>
    </>}
    {spec.strokes.map((stroke, i) => <PaintStrokeLayer key={stroke.id}
      spec={spec} stroke={stroke} i={i} uid={uid} prepared={prepared[i]}
      phase={evaluatePaintStroke(stroke, frame, reducedMotion)}/>)}
  </svg>;
}
