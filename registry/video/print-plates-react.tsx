import { Fragment, useId, useMemo } from "react";
import type { ReactNode, SVGProps } from "react";
import { evaluateRisoPrint, inspectRisoPrint, plateRegistration, printHash, risoPaperFibres, risoPaperPores } from "./print-plates";
import type { RisoPrintSpec } from "./print-plates";
import { createRisoScreenGeometry, wrapRisoScreenDots } from "./riso-screening";
import type { RisoScreenGeometry, RisoScreenMode } from "./riso-screening";
import {createRisoDrumContactGeometry} from "./riso-drum-contact";
import type {RisoDrumContactGeometry} from "./riso-drum-contact";

/** Render-owned SVG paint bindings: authored artwork chooses solid fills or screened densities per spot ink. */
export interface RisoPaint {
  solid: string;
  /** A screen of separate ink dots, not a postprocessed RGB halftone overlay. */
  dots: string;
  /** Small-dot tonal value on the SAME physical plate; no alpha RGB trick. */
  lightDots?: string;
  /** Mid-density tonal value on the SAME physical plate. */
  midDots?: string;
}
export type RisoArtwork = (paint: RisoPaint) => ReactNode;
/** A later print layer may first knock out earlier inks with unprinted paper. */
export interface RisoForegroundLayer {
  id: string;
  /** Opaque paper-shaped artwork; use a character's evaluated union silhouette. */
  knockout?: ReactNode;
  /** Foreground spot-ink masters, rendered in press order after the knockout. */
  artworks: Readonly<Record<string, RisoArtwork>>;
}
export interface RisoPrintProps extends Omit<SVGProps<SVGSVGElement>, "children" | "viewBox" | "width" | "height"> {
  spec: RisoPrintSpec;
  frame: number;
  artworks: Readonly<Record<string, RisoArtwork>>;
  /** Optional ordered layers: print background, cut away its ink under subjects, then print subjects. */
  foregroundLayers?: readonly RisoForegroundLayer[];
  misregistration?: number;
  paperGrain?: number;
  /** Optional art-directed per-drum longitudinal ink starvation, 0..1.
   * Native SVG source geometry is untouched. Exact zero equals no effect. */
  drumContact?: {readonly dryness:number;
    readonly feed:"top-to-bottom"|"left-to-right"};
  /** AM regular variable-radius screen or FM deterministic dispersed droplets. Defaults to AM. */
  screenMode?: RisoScreenMode;
  /** Nominal screened coverage 0..1; defaults to the legacy .32-radius AM screen. */
  screenDensity?: number;
  /** Emulated physical spread of deposited ink 0..1; does not affect solid artwork. */
  dotGain?: number;
  reducedMotion?: boolean;
  /** Render ink only, without an opaque paper rectangle or paper fibres. For native overprinting. */
  transparentPaper?: boolean;
  /** Optional plate separation for native material transitions; unknown ids fail explicitly. */
  visiblePlateIds?: readonly string[];
  label?: string;
}

/** Ink arrives from the press feed direction with a seeded, frame-stable ragged edge. */
export function printRevealPath(width: number, height: number, progress: number, seed: number): string {
  if (progress <= 0) return "M0 0 H0 V0 Z";
  if (progress >= 1) return `M0 0 H${width} V${height} H0 Z`;
  const x = width * progress;
  const edge = Array.from({ length: 17 }, (_, i) => {
    const y = height * i / 16;
    const wave = (printHash(seed, i, 5) - .5) * 13;
    return `${Math.max(0, Math.min(width, x + wave)).toFixed(2)} ${y.toFixed(2)}`;
  });
  return `M0 0 L${edge.join(" L")} L0 ${height} Z`;
}

// ---- Shared print materials (used by RisoPrint and by other renderers that print in this style, e.g. the RIG1 look) ----

/** One plate's halftone screen as an SVG pattern: separate ink dots in the referencing element's user space. */
export function RisoScreenPattern({ id, geometry, angle, color }: { id: string; geometry: RisoScreenGeometry; angle: number; color: string }) {
  return <pattern id={id} x={0} y={0} width={geometry.tileSize} height={geometry.tileSize}
    patternUnits="userSpaceOnUse" patternTransform={`rotate(${angle})`}>
    {wrapRisoScreenDots(geometry).map((dot, dotIndex) => <circle key={dotIndex} cx={dot.x} cy={dot.y} r={dot.r} fill={color} />)}
  </pattern>;
}
/** Paper pores as black mask dots (place inside a white mask): the specks of paper every ink pass leaves open. */
export function RisoPaperPores({ pores, grain }: { pores: readonly { x: number; y: number; r: number }[]; grain: number }) {
  return <>{grain > 0 && pores.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r * (.4 + grain)} fill="#000" />)}</>;
}
/** Paper fibres: short darker strokes locked to the sheet, so texture never crawls with the camera or the art. */
export function RisoPaperFibres({ fibres, grain }: { fibres: readonly { x: number; y: number; length: number; opacity: number; vertical: boolean }[]; grain: number }) {
  return <g pointerEvents="none" stroke="#694B38" strokeWidth=".7">
    {fibres.map((p, i) => <path key={i} opacity={p.opacity * grain}
      d={`M${p.x.toFixed(1)} ${p.y.toFixed(1)} l${p.vertical ? "0.8" : p.length.toFixed(1)} ${p.vertical ? p.length.toFixed(1) : "0.8"}`} />)}
  </g>;
}
/** RISO75 drum contact as black mask marks (place inside a white mask): dry roller streaks and pinpricks per drum. */
export function RisoDrumContactMarks({ geometry, plateId }: { geometry: RisoDrumContactGeometry; plateId: string }) {
  return <>
    <g stroke="#000" strokeLinecap="round" fill="none"
      data-km-riso75-fibre-master={plateId}>
      {geometry.streaks.map(line=><path
        key={line.id} data-km-riso75-streak={line.id}
        d={line.d} strokeWidth={line.strokeWidth}
        opacity={line.opacity}/>)}
    </g>
    <g fill="#000" data-km-riso75-pore-master={plateId}>
      {geometry.pinpricks.map(p=><ellipse
        key={p.id} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry}
        opacity={p.opacity}/>)}
    </g>
  </>;
}

/** Separate ink layers over fixed paper; no local clocks, image downloads, or WebGL. */
export function RisoPrint({
  spec, frame, artworks, foregroundLayers = [], misregistration = 0, paperGrain = .5, drumContact,
  screenMode = "am", screenDensity = Math.PI * .32 * .32, dotGain = 0, reducedMotion = false,
  transparentPaper = false, visiblePlateIds, label = "Two-color Risograph print", style, ...svgProps
}: RisoPrintProps) {
  const issues = inspectRisoPrint(spec);
  if (issues.length) throw new Error(`Invalid RISO1 print: ${issues.map(i => `${i.path}: ${i.message}`).join("; ")}`);
  const missing = spec.plates.filter(plate => typeof artworks[plate.id] !== "function");
  if (missing.length) throw new Error(`Missing vector artwork for plate: ${missing.map(plate => plate.id).join(", ")}`);
  if (visiblePlateIds && (visiblePlateIds.length === 0 || visiblePlateIds.some(id => !spec.plates.some(p => p.id === id))))
    throw new Error("RISO1 visiblePlateIds must refer to one or more declared plate IDs.");
  if (!Array.isArray(foregroundLayers) || foregroundLayers.length > 24)
    throw new Error("Risograph foreground requires no more than 24 ordered layers.");
  const layerNames = new Set<string>();
  for (const layer of foregroundLayers) {
    if (!layer || typeof layer.id !== "string" || !/^[a-z][a-z0-9-]{0,47}$/.test(layer.id) || layerNames.has(layer.id))
      throw new Error("Risograph foreground layer IDs must be unique slugs.");
    layerNames.add(layer.id);
    if (spec.plates.some(plate => typeof layer.artworks?.[plate.id] !== "function"))
      throw new Error("Risograph foreground layer requires an artwork callback for every spot plate.");
    if (transparentPaper && layer.knockout != null)
      throw new Error("Paper knockouts are incompatible with transparentPaper output.");
  }
  if ((screenMode !== "am" && screenMode !== "fm") || !Number.isFinite(screenDensity) || screenDensity < 0 || screenDensity > 1 ||
      !Number.isFinite(dotGain) || dotGain < 0 || dotGain > 1)
    throw new RangeError("RISO screenMode must be AM or FM, with screenDensity and dotGain between 0 and 1.");
  if(drumContact && (!Number.isFinite(drumContact.dryness)||
    drumContact.dryness<0||drumContact.dryness>1||
    !["top-to-bottom","left-to-right"].includes(drumContact.feed)))
    throw new RangeError("RISO75 contact requires ink dryness 0..1 and a paper feed direction.");
  const activePlateIds = visiblePlateIds ? new Set(visiblePlateIds) : null;
  const frameState = evaluateRisoPrint(spec, frame, reducedMotion);
  const rawId = useId();
  const uid = "riso" + rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const grain = Math.max(0, Math.min(1, paperGrain));
  const screens = spec.plates.map((plate, index) => createRisoScreenGeometry({
    cell: plate.dotCell, mode: screenMode, density: screenDensity, dotGain,
    seed: spec.seed, plateIndex: index,
  }));
  // RISO26: value hierarchy is actual deposited dot *area* on the spot
  // master, not CSS opacity. All variants share cell, angle, plate seed,
  // position and registration. No doubling of the face under print motion.
  const toneScreens = spec.plates.map((plate, index) => ({
    light: createRisoScreenGeometry({cell:plate.dotCell, mode:screenMode,
      density:screenDensity*.22, dotGain:dotGain*.5,
      seed:spec.seed, plateIndex:index}),
    mid: createRisoScreenGeometry({cell:plate.dotCell, mode:screenMode,
      density:screenDensity*.55, dotGain:dotGain*.75,
      seed:spec.seed, plateIndex:index}),
  }));
  const drumContactGeometry = spec.plates.map((_, index)=>
    drumContact && drumContact.dryness>0 ? createRisoDrumContactGeometry({
      width:spec.width,height:spec.height,seed:spec.seed,
      plateIndex:index,dryness:drumContact.dryness,feed:drumContact.feed,
    }):null);
  const sheet = useMemo(() => risoPaperFibres(spec.seed, spec.width, spec.height), [spec.seed, spec.width, spec.height]);
  const pores = useMemo(() => risoPaperPores(spec.seed, spec.width, spec.height), [spec.seed, spec.width, spec.height]);
  const inkPass = (i: number, artwork: RisoArtwork, layerId?: string) => {
    const plate = spec.plates[i];
    const [dx, dy] = plateRegistration(spec, i, misregistration);
    const paint: RisoPaint = {
      solid:plate.color,dots:`url(#${uid}-dots-${i})`,
      lightDots:`url(#${uid}-dots-light-${i})`,
      midDots:`url(#${uid}-dots-mid-${i})`,
    };
    return <g key={plate.id} data-km-riso-plate={layerId ? undefined : plate.id}
      data-km-riso-foreground-plate={layerId ? plate.id : undefined}
      data-km-riso-foreground-layer={layerId}
      style={{ mixBlendMode: "multiply" }} opacity={plate.opacity}
      clipPath={`url(#${uid}-clip-${i})`} mask={`url(#${uid}-tooth)`}>
      <g data-km-riso75-contact-drum={drumContactGeometry[i]?plate.id:undefined}
        mask={drumContactGeometry[i]?`url(#${uid}-contact-${i})`:undefined}>
        <g transform={`translate(${dx.toFixed(3)} ${dy.toFixed(3)})`}
          fill={plate.color} stroke="none">
          {artwork(paint)}
        </g>
      </g>
    </g>;
  };

  return <svg {...svgProps} role={svgProps["aria-hidden"] ? undefined : "img"}
    aria-label={svgProps["aria-hidden"] ? undefined : label}
    viewBox={`0 0 ${spec.width} ${spec.height}`}
    xmlns="http://www.w3.org/2000/svg"
    data-km-riso-print="" data-km-riso-frame={frame}
    data-km-riso-screen-mode={screenMode} data-km-riso-screen-density={screenDensity}
    data-km-riso-dot-gain={dotGain}
    style={{ width: "100%", height: "100%", display: "block", overflow: "hidden", isolation: "isolate", ...style }}>
    <defs>
      <mask id={`${uid}-tooth`} x={0} y={0} width={spec.width} height={spec.height} maskUnits="userSpaceOnUse">
        <rect width={spec.width} height={spec.height} fill="#fff" />
        <RisoPaperPores pores={pores} grain={grain} />
      </mask>
      {spec.plates.map((plate, index) => <Fragment key={plate.id}>
        {drumContactGeometry[index]&&<mask id={`${uid}-contact-${index}`}
          x={0} y={0} width={spec.width} height={spec.height}
          maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
          <rect width={spec.width} height={spec.height} fill="#fff"/>
          <RisoDrumContactMarks geometry={drumContactGeometry[index]} plateId={plate.id} />
        </mask>}
        <RisoScreenPattern id={`${uid}-dots-${index}`} geometry={screens[index]} angle={plate.dotAngle} color={plate.color} />
        {(["light","mid"] as const).map(tone => <RisoScreenPattern key={tone}
          id={`${uid}-dots-${tone}-${index}`} geometry={toneScreens[index][tone]}
          angle={plate.dotAngle} color={plate.color} />)}
        <clipPath id={`${uid}-clip-${index}`} clipPathUnits="userSpaceOnUse">
          <path d={printRevealPath(spec.width, spec.height, frameState.plates[index].progress, spec.seed + index * 11)} />
        </clipPath>
      </Fragment>)}
    </defs>
    {!transparentPaper && <rect width={spec.width} height={spec.height} fill={spec.paper} />}
    {/* Paper fibres stay locked to the sheet, preventing camera/animation texture crawl. */}
    {!transparentPaper && grain > 0 && <RisoPaperFibres fibres={sheet} grain={grain} />}
    {spec.plates.map((plate, i) => activePlateIds && !activePlateIds.has(plate.id)
      ? null : inkPass(i, artworks[plate.id]))}
    {/* The paper knockout is applied only *after* all backdrop inks and *before*
        every foreground ink. Inking a translucent character over the old
        backdrop without this stage makes an apparently see-through character. */}
    {foregroundLayers.map(layer => <Fragment key={layer.id}>
      {layer.knockout != null && <g data-km-riso-paper-knockout={layer.id}
        pointerEvents="none" fill={spec.paper} stroke={spec.paper}>
        {layer.knockout}
      </g>}
      {spec.plates.map((plate, i) => activePlateIds && !activePlateIds.has(plate.id)
        ? null : inkPass(i, layer.artworks[plate.id], layer.id))}
    </Fragment>)}
  </svg>;
}
