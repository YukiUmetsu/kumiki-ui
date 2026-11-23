import { memo, useId, useMemo } from "react";
import type { CSSProperties, SVGProps } from "react";
import { buildBrushRibbon, evaluatePaintStroke, inspectPaintSurface, paintBloomPath, paintClamp, paintHash, sampleBrushCenterline } from "./watercolour-brush";
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
// ---- Shared watercolour material ---------------------------------------------------------------
// One wash material and one paper for every painter of this style (WM1 brush, WM2 composition,
// WM4 wet paper, the RIG1 watercolour look). All noise is a function of the user-space position of
// the element it is applied to, never of the frame, so a still painting never flickers and a moving
// part carries its own pigment texture.

export interface WatercolourWashFilterProps {
  id: string;
  seed: number;
  /** Paper tooth 0..1: how far the dried contour wanders from the drawn shape. */
  tooth: number;
  /** 0..1: pigment settling into the valleys of the paper and skipping its peaks. */
  granulation: number;
  /** 0..1: the darker rim left where pigment migrated to the edge of a drying wash. */
  driedEdge: number;
  /** Rim width in user units (the hard outer edge fades inward over about twice this). */
  rim?: number;
  /** 0..1: uneven wet-in-wet density across a wash (large soft blotches). */
  mottle?: number;
  /** A second pigment dropped into the wet wash, bleeding in irregular blotches. */
  charge?: { color: string; amount: number };
  /**
   * A second, cooler glaze on the side of the silhouette away from the light, and a sliver of reserved paper on the
   * lit edge. `depth` is how far the glaze reaches in from the edge (user units); `light` points toward the light.
   */
  shade?: { color: string; amount: number; depth: number; light?: readonly [number, number]; reserve?: number };
  /** Feature size multiplier (1 = paper pixels). Use the drawing scale when a wash is painted zoomed in. */
  scale?: number;
}

const hexChannels = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
const table = (values: readonly number[]) => values.map(v => v.toFixed(4)).join(" ");

/**
 * Turns any filled silhouette into a watercolour wash: an irregular dried contour, a darker dried edge
 * (pigment carried to the drying rim multiplies with itself, as density adds), optional wet-in-wet charge,
 * a form-shadow glaze and mottling, and granulation. Granulation and mottling only change pigment
 * coverage (alpha), so on a multiply-blended wash their effect is proportional to the pigment's density:
 * a pale wash stays clean and a dense one shows its grain, as on real paper.
 */
export function WatercolourWashFilter({ id, seed, tooth, granulation, driedEdge, rim = 2.2, mottle = 0, charge, shade, scale = 1 }: WatercolourWashFilterProps) {
  const s = 1 + (Math.abs(Math.floor(seed)) % 997), k = (v: number) => +(v / scale).toFixed(5), u = (v: number) => +(v * scale).toFixed(3);
  const g = paintClamp(granulation), m = paintClamp(mottle), e = paintClamp(driedEdge);
  // Paper peaks (low noise) skip pigment, valleys (high noise) hold all of it.
  const settle = table([1 - .62 * g, 1 - .56 * g, 1 - .44 * g, 1 - .3 * g, 1 - .18 * g, 1 - .08 * g, 1, 1, 1]);
  const [cr, cg, cb] = charge ? hexChannels(charge.color) : [0, 0, 0];
  const amount = charge ? paintClamp(charge.amount) : 0;
  const light = shade?.light ?? [-.5, -.87], ln = Math.hypot(light[0], light[1]) || 1, lx = light[0] / ln, ly = light[1] / ln;
  const base = amount > 0 ? "charged" : "wash";
  const glazed = Boolean(shade && shade.amount > 0), reserved = glazed && (shade?.reserve ?? 0) > 0;
  const formed = reserved ? "reserved" : glazed ? "glazed" : base;
  const mottled = m > 0 ? "mottled" : "dried";
  return <filter id={id} x="-6%" y="-6%" width="112%" height="112%" colorInterpolationFilters="sRGB" data-km-watercolour-wash="">
    <feTurbulence type="fractalNoise" baseFrequency={`${k(.032)} ${k(.041)}`} numOctaves={3} seed={s} result="contour" />
    <feDisplacementMap in="SourceGraphic" in2="contour" scale={u(1.2 + 5.5 * paintClamp(tooth))} xChannelSelector="R" yChannelSelector="G" result="wash" />
    {amount > 0 && <>
      <feTurbulence type="fractalNoise" baseFrequency={k(.011)} numOctaves={2} seed={s + 37} result="chargeNoise" />
      <feColorMatrix in="chargeNoise" type="matrix" result="chargePigment"
        values={`0 0 0 0 ${cr.toFixed(4)} 0 0 0 0 ${cg.toFixed(4)} 0 0 0 0 ${cb.toFixed(4)} ${(3.6 * amount).toFixed(4)} 0 0 0 ${(-1.75 * amount).toFixed(4)}`} />
      <feComposite in="chargePigment" in2="wash" operator="atop" result="charged" />
    </>}
    {/* The silhouette as solid paper coverage, so edges are found the same way on thin and dense washes. */}
    <feComponentTransfer in="wash" result="solid"><feFuncA type="linear" slope={24} intercept={0} /></feComponentTransfer>
    {glazed && shade && <>
      {/* The silhouette minus itself moved toward the light leaves the far side: the shadow glaze. */}
      <feOffset in="solid" dx={u(lx * shade.depth)} dy={u(ly * shade.depth)} result="towardLight" />
      <feComposite in="solid" in2="towardLight" operator="out" result="farSide" />
      <feGaussianBlur in="farSide" stdDeviation={u(Math.max(.6, shade.depth * .12))} result="farSoft" />
      <feFlood floodColor={shade.color} floodOpacity={paintClamp(shade.amount)} />
      <feComposite in2="farSoft" operator="in" result="glazeLayer" />
      <feComposite in="glazeLayer" in2="wash" operator="in" result="glaze" />
      <feBlend in="glaze" in2={base} mode="multiply" result="glazed" />
      {reserved && <>
        <feOffset in="solid" dx={u(-lx * shade.depth * .3)} dy={u(-ly * shade.depth * .3)} result="awayFromLight" />
        <feComposite in="solid" in2="awayFromLight" operator="out" result="litSide" />
        <feFlood floodColor="#ffffff" floodOpacity={paintClamp(shade.reserve ?? 0)} />
        <feComposite in2="litSide" operator="in" result="reserveSolid" />
        <feComposite in="reserveSolid" in2="wash" operator="in" result="reserveLayer" />
        <feComposite in="reserveLayer" in2="glazed" operator="atop" result="reserved" />
      </>}
    </>}
    {/* Dried edge: a band just inside the silhouette, carrying the wash's own pigment, multiplied onto itself. */}
    <feGaussianBlur in="solid" stdDeviation={u(rim)} result="inner" />
    <feComposite in="solid" in2="inner" operator="out" result="edgeBand" />
    <feComposite in={base} in2="edgeBand" operator="in" result="band" />
    <feColorMatrix in="band" type="matrix" values={`1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${(2.1 * e).toFixed(4)} 0`} result="rimPigment" />
    <feBlend in="rimPigment" in2={formed} mode="multiply" result="dried" />
    {m > 0 && <>
      {/* Mottling reuses the contour noise's third channel: soft blotches at the scale of the contour's wander. */}
      <feColorMatrix in="contour" type="matrix" values={`0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 ${(1.1 * m).toFixed(4)} 0 ${(1 - .78 * m).toFixed(4)}`} result="mottleMap" />
      <feComposite in="dried" in2="mottleMap" operator="arithmetic" k1={1} k2={0} k3={0} k4={0} result="mottled" />
    </>}
    {g > 0 && <>
      <feTurbulence type="fractalNoise" baseFrequency={k(.14)} numOctaves={2} seed={s + 11} result="grainNoise" />
      <feColorMatrix in="grainNoise" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 1 0 0 0 0" result="grainMono" />
      <feComponentTransfer in="grainMono" result="grainMap"><feFuncA type="table" tableValues={settle} /></feComponentTransfer>
      <feComposite in={mottled} in2="grainMap" operator="arithmetic" k1={1} k2={0} k3={0} k4={0} result="granulated" />
    </>}
  </filter>;
}

/**
 * The tide line of a bloom or backrun: a stroked front made to wander with the paper and to show only where the water
 * reached, softened on both sides. Apply it to a `fill="none"` stroke of a `paintBloomPath` outline.
 */
export function WatercolourTideFilter({ id, seed, tooth }: { id: string; seed: number; tooth: number }) {
  const s = Math.abs(Math.floor(seed)) % 991;
  return <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB" data-km-watercolour-tide="">
    <feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves={2} seed={1 + s} result="front"/>
    <feDisplacementMap in="SourceGraphic" in2="front" scale={+(2.5 + 2 * paintClamp(tooth)).toFixed(3)} xChannelSelector="R" yChannelSelector="G" result="moved"/>
    {/* The front is only partly visible: it fades where the water ran thin. */}
    <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves={1} seed={7 + s} result="reach"/>
    <feColorMatrix in="reach" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 2.6 0 0 0 -.85" result="reachMask"/>
    <feComposite in="moved" in2="reachMask" operator="in" result="broken"/>
    <feGaussianBlur in="broken" stdDeviation={.7}/>
  </filter>;
}

export interface WatercolourPaperProps {
  id: string;
  width: number;
  height: number;
  color: string;
  /** 0..1 depth of the cold-press relief. */
  tooth: number;
  seed: number;
}
/**
 * Cold-press paper: the sheet colour lit across a fixed fractal relief, so pigment laid over it by
 * multiply shows the tooth. Fixed to the sheet (screen), never to the frame number.
 */
export function WatercolourPaper({ id, width, height, color, tooth, seed }: WatercolourPaperProps) {
  const t = paintClamp(tooth), slope = .14 * t;
  return <g data-km-paper-tooth="" pointerEvents="none">
    <defs>
      <filter id={id} x={0} y={0} width={width} height={height} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".125" numOctaves={4} seed={1 + (Math.abs(Math.floor(seed)) % 991)} result="relief" />
        <feDiffuseLighting in="relief" surfaceScale={+(1.5 * t).toFixed(3)} diffuseConstant={1} lightingColor="#ffffff" result="lit">
          <feDistantLight azimuth={235} elevation={52} />
        </feDiffuseLighting>
        <feComponentTransfer in="lit">
          <feFuncR type="linear" slope={slope.toFixed(4)} intercept={(1 - .79 * slope).toFixed(4)} />
          <feFuncG type="linear" slope={slope.toFixed(4)} intercept={(1 - .79 * slope).toFixed(4)} />
          <feFuncB type="linear" slope={slope.toFixed(4)} intercept={(1 - .79 * slope).toFixed(4)} />
        </feComponentTransfer>
      </filter>
    </defs>
    <rect width={width} height={height} fill={color} />
    <rect width={width} height={height} fill="#fff" filter={`url(#${id})`} style={{ mixBlendMode: "multiply" }} />
  </g>;
}

interface BristleMark { d: string; width: number; opacity: number }
interface Bloom { x: number; y: number; r: number; alpha: number; seed: number }

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

/**
 * Blooms happen where water meets a still-damp wash: only in broad, wet strokes, and only a few, at seeded places
 * (not evenly spaced). Each is a lobed backrun front (`paintBloomPath`), never a ring.
 */
function blooms(spec: PaintSurfaceSpec, stroke: PaintStroke, index: number, samples: readonly BrushSample[]): Bloom[] {
  const strict = (spec.pigmentGranulation ?? 0) > 0;
  if (samples.length < 8 || stroke.water < (strict ? .88 : .6) || stroke.width < (strict ? 70 : 24)) return [];
  const count = Math.floor(paintHash(spec.seed, index * 7, 61) * (1 + stroke.water * 1.6));
  return Array.from({ length: count }, (_, i) => {
    const s = samples[Math.floor((.15 + .7 * paintHash(spec.seed, index * 37 + i, 63)) * (samples.length - 1))];
    return { x: s.x, y: s.y, r: s.radius * (.55 + paintHash(spec.seed, index * 41 + i, 65) * .6),
      alpha: .55 + paintHash(spec.seed, index * 53 + i, 67) * .45, seed: spec.seed + index * 101 + i * 13 };
  });
}

interface PreparedStroke {
  samples: BrushSample[];
  bristles: BristleMark[];
  blooms: Bloom[];
}

/**
 * SVG uses real pressure-derived filled polygons and a separate spreading wash, laid together as one wash through the
 * shared watercolour material (wandering contour, dried edge at the outer wet front, granulation), plus directional
 * bristle splitting and lobed blooms. No simulated clock, canvas context or random input is needed during capture.
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
  // The wet front reaches a little past the deposit; it is where the dried edge forms.
  const main = buildBrushRibbon(stroke, phase.deposit, 0, spec.seed + i);
  const spread = buildBrushRibbon(stroke, phase.deposit, .12 * stroke.water * phase.spread, spec.seed + i);
  const density = TONE_LEVELS[stroke.tone] * stroke.load;
  const coreOpacity = Math.min(.98, density * (.85 - stroke.dryBrush * .11));
  const edgeOpacity = Math.min(.7, coreOpacity * (.55 + .3 * stroke.water) * phase.spread);
  const tint = Math.min(.22, density * .24 * phase.spread);
  const clip = uid + "-clip-" + i, maskId = uid + "-bristles-" + i;
  const dryFibers = stroke.dryBrush >= .15 && prepared.bristles.length > 0;
  const realGranule=(spec.pigmentGranulation??0)>0 && stroke.width>=12 && stroke.water>=.35;
  const wet = stroke.water >= .5 && stroke.width > 20;
  return <g data-km-brush-stroke={stroke.id} data-km-paint-phase={phase.settled ? "dry" : "wet"}
    style={{ mixBlendMode: "multiply" }} pointerEvents="none">
    <defs>
      <clipPath id={clip} clipPathUnits="userSpaceOnUse"><path d={(phase.spread > 0 ? spread : main).path}/></clipPath>
      {dryFibers && <mask id={maskId} maskUnits="userSpaceOnUse"
        x={0} y={0} width={spec.width} height={spec.height}>
        <rect width={spec.width} height={spec.height} fill="white"/>
        {prepared.bristles.map((mark, j) =>
          <path key={j} d={mark.d} stroke="#000" opacity={stroke.dryBrush * mark.opacity}
            strokeWidth={mark.width} fill="none" strokeLinecap="round"/>)}
      </mask>}
    </defs>
    <g data-km-wm1-wash="" filter={`url(#${uid}-${wet ? "wet" : "crisp"})`}>
      {phase.spread > 0 && <path data-km-wet-spread="" d={spread.path} fill={stroke.color} opacity={edgeOpacity}/>}
      <path data-km-deposition=""
        data-km-granulated-deposition={realGranule?"":undefined}
        d={main.path} fill={stroke.color} opacity={coreOpacity}
        filter={realGranule?`url(#${uid}-sediment-grain)`:undefined}
        mask={dryFibers ? `url(#${maskId})` : undefined}/>
    </g>
    <g clipPath={`url(#${clip})`}>
      {phase.spread > 0 && prepared.blooms.map((b, j) => {
        const d = paintBloomPath(b.x, b.y, b.r, b.seed, .55 + .45 * phase.spread);
        return <g key={j} data-km-bloom="">
          {/* Water pushes pigment out of the bloom (lighter inside) and leaves it in a lobed tide line. */}
          <path d={d} fill={spec.paper.color} opacity={.34 * b.alpha * stroke.water * phase.spread}/>
          <path d={d} fill="none" stroke={stroke.color} strokeWidth={1.4 + .025 * stroke.width}
            opacity={Math.min(.55, coreOpacity) * b.alpha * phase.spread} filter={`url(#${uid}-tide)`}/>
        </g>;
      })}
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
  const prepared = useMemo<PreparedStroke[]>(() => spec.strokes.map((stroke, index) => {
    const samples = sampleBrushCenterline(stroke);
    return { samples, bristles: bristleMarks(spec, stroke, index, samples), blooms: blooms(spec, stroke, index, samples) };
  }), [spec]);
  const tooth = spec.paper.tooth;

  return <svg {...props} role={props["aria-hidden"] ? undefined : "img"}
    aria-label={props["aria-hidden"] ? undefined : label}
    xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${spec.width} ${spec.height}`}
    data-km-watercolour="" data-km-paint-frame={frame} data-km-paint-medium={spec.medium}
    data-km-pigment-granulation={spec.pigmentGranulation??0}
    style={{ width: "100%", height: "100%", display: "block", overflow: "hidden", isolation: "isolate", ...style }}>
    <defs>
      {/* One shared wash material, fixed to the paper: wet strokes dry with a pronounced edge at their wet front,
          drier strokes keep a crisper, lighter one. Ink is laid denser and granulates less. */}
      <WatercolourWashFilter id={uid + "-wet"} seed={spec.seed} tooth={tooth} granulation={(spec.medium === "ink" ? .25 : .55) * tooth}
        driedEdge={.8} rim={2.6} mottle={.3}/>
      <WatercolourWashFilter id={uid + "-crisp"} seed={spec.seed + 1} tooth={tooth * .7} granulation={(spec.medium === "ink" ? .2 : .45) * tooth}
        driedEdge={.5} rim={1.4} mottle={.15}/>
      <WatercolourTideFilter id={uid + "-tide"} seed={spec.seed} tooth={tooth}/>
      {Boolean(spec.reservePaths?.length) && <mask id={uid + "-paper-reserves"}
        maskUnits="userSpaceOnUse" x={0} y={0}
        width={spec.width} height={spec.height}>
        <rect width={spec.width} height={spec.height} fill="#fff"/>
        {spec.reservePaths?.map((path,i)=>
          <path key={i} d={path} fill="#000"/>)}
      </mask>}
      {(spec.pigmentGranulation??0)>0 && (() => {
        const weight=1.75*(spec.pigmentGranulation??0);
        const bias=1-weight*.5;
        // Pigment density follows micro-scale paper relief WITHIN the real
        // pressure-brush ribbon. Never apply this to captions or whole frame.
        return <filter id={uid+"-sediment-grain"} x="-3%" y="-3%"
          width="106%" height="106%" primitiveUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency=".29 .35"
            numOctaves={3} seed={1+(spec.seed%991)} result="paper-grain"/>
          <feColorMatrix in="paper-grain" type="matrix"
            values={`0 0 0 0 0
              0 0 0 0 0
              0 0 0 0 0
              ${weight} 0 0 0 ${bias}`} result="sediment-coverage"/>
          <feComposite in="SourceGraphic" in2="sediment-coverage" operator="in"/>
        </filter>;
      })()}
    </defs>
    {!transparentPaper && <WatercolourPaper id={uid + "-paper"} width={spec.width} height={spec.height}
      color={spec.paper.color} tooth={tooth} seed={spec.seed}/>}
    <g data-km-wm1-pigment-pass="" data-km-paper-reserve-count={spec.reservePaths?.length??0}
      mask={spec.reservePaths?.length ? `url(#${uid}-paper-reserves)` : undefined}>
      {spec.strokes.map((stroke, i) => <PaintStrokeLayer key={stroke.id}
        spec={spec} stroke={stroke} i={i} uid={uid} prepared={prepared[i]}
        phase={evaluatePaintStroke(stroke, frame, reducedMotion)}/>)}
    </g>
  </svg>;
}
