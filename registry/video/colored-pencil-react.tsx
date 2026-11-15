import { useId, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { evaluatePencilMark, hatchPencilRegion, inspectPencilDrawing, pencilHash } from "./colored-pencil";
import type { PencilDrawingSpec, PencilTrace, PencilRegion, PencilPigmentLayer } from "./colored-pencil";
import { pencilMicroDeposit, pencilGrainTile } from "./colored-pencil-craft";
import { inspectPencilFoundationDrawing } from "./colored-pencil-foundation";

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
/** Stroke geometry is static while frames are sought; memoise only the pure material pass. */
function PigmentPass({ region, layer, index, frame, reducedMotion }: {
  region: PencilRegion; layer: PencilPigmentLayer; index: number;
  frame: number; reducedMotion: boolean;
}) {
  const [x, y, w, h] = region.bounds;
  const strokes = useMemo(() => hatchPencilRegion({ bounds: [x, y, w, h] }, layer),
    [x, y, w, h, layer]);
  const cx = x + w / 2, cy = y + h / 2;
  const craft = !!region.craft;
  return <g data-km-pigment-layer={index} stroke={layer.color} fill="none"
    transform={`rotate(${layer.angle} ${cx} ${cy})`}>
    {strokes.map((mark, i) => <path key={i} d={mark.path}
      strokeWidth={craft?mark.width*.59:mark.width}
      strokeLinecap="round" opacity={craft?mark.opacity*.65:mark.opacity} pathLength={1}
      transform={mark.angleOffset ? `rotate(${mark.angleOffset.toFixed(3)} ${cx} ${cy})` : undefined}
      strokeDasharray={evaluatePencilMark(frame, mark, reducedMotion).toFixed(5) + " 1"}/>)}
  </g>;
}
/** Thin, directionally stable graphite/pigment fibres in three translucent families. */
function CraftDeposit({region,frame,reducedMotion}:{
  region:PencilRegion;frame:number;reducedMotion:boolean;
}){
  const marks=useMemo(()=>region.craft?
    pencilMicroDeposit(region,region.craft,region.layers[0].seed):[],
    [region]);
  const begin=region.layers[0].startFrame+38;
  const progress=evaluatePencilMark(frame,{startFrame:begin,durationFrames:96},reducedMotion);
  return <g data-km-pencil-micro="" fill="none" strokeLinecap="round"
    opacity={progress.toFixed(4)}>
    {marks.map((group,i)=><path key={i} data-km-craft-group={i}
      d={group.path} stroke={group.color}
      strokeWidth={group.width} opacity={group.opacity}/>)}
  </g>;
}
function Trace({ trace, frame, reducedMotion = false }: { trace: PencilTrace; frame: number; reducedMotion?: boolean }) {
  const progress = evaluatePencilMark(frame, trace, reducedMotion);
  return <path d={trace.path} fill="none" stroke={trace.color} strokeWidth={trace.width}
    data-km-pencil-trace={trace.id} transform={trace.transform}
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
  const issues = drawing.foundation
    ? inspectPencilFoundationDrawing(drawing) : inspectPencilDrawing(drawing);
  if (issues.length) throw new RangeError("Invalid pencil drawing: " + issues.join("; "));
  // Reject before laying out hundreds of brush marks.
  evaluatePencilMark(frame, { startFrame: 0, durationFrames: 1 }, reducedMotion);
  const uid = "km-cp-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const pores = useMemo(() => Array.from({ length: 850 }, (_, i) => ({
    x: pencilHash(drawing.seed, i, 11) * 1024,
    y: pencilHash(drawing.seed, i, 13) * 1024,
    radius: .28 + pencilHash(drawing.seed, i, 15) * 1.3,
    opacity: .2 + pencilHash(drawing.seed, i, 17) * .48,
  })), [drawing.seed]);
  const grain = useMemo(()=>pencilGrainTile(drawing.seed,850),[drawing.seed]);
  const fibers = useMemo(() => Array.from({ length: 180 }, (_, i) => ({
    x: pencilHash(drawing.seed, i, 21) * 1024,
    y: pencilHash(drawing.seed, i, 22) * 1024,
    len: 3 + pencilHash(drawing.seed, i, 23) * 23,
    vertical: pencilHash(drawing.seed, i, 24) < .18,
  })), [drawing.seed]);
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox={"0 0 " + drawing.width + " " + drawing.height}
    role="img" aria-label={label} className={className}
    data-km-colored-pencil="" data-km-pencil-frame={frame}
    data-km-pencil-foundation={drawing.foundation?"CP-F1":undefined}
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
      {/* The pencil pigment is absorbed by a much tighter tooth than the visible
          background paper fibers. These fixed tiny white voids read as dry media. */}
      <pattern id={uid + "-craft-grain"} width={64} height={64} patternUnits="userSpaceOnUse">
        {grain.map((dot,i)=><circle key={i} cx={dot.x} cy={dot.y}
          r={dot.r} fill="#000" opacity={dot.value}/>)}
      </pattern>
      {drawing.regions.map((region,i)=>region.craft&&
        <mask key={region.id} id={uid+"-craft-mask-"+i} maskUnits="userSpaceOnUse"
          x={0} y={0} width={drawing.width} height={drawing.height}>
          <rect width={drawing.width} height={drawing.height} fill="#fff"/>
          <rect width={drawing.width} height={drawing.height}
            fill={"url(#"+uid+"-craft-grain)"}
            opacity={Math.min(.92,.86*drawing.paperTooth*region.craft.tooth)}/>
        </mask>)}
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
      {drawing.regions.map((region,i)=>region.craft&&<linearGradient key={region.id}
        id={uid+"-tone-"+i} gradientUnits="userSpaceOnUse"
        x1={region.bounds[0]+region.bounds[2]*(region.craft.light<.5?.12:.89)}
        y1={region.bounds[1]+region.bounds[3]*.10}
        x2={region.bounds[0]+region.bounds[2]*(region.craft.light<.5?.89:.12)}
        y2={region.bounds[1]+region.bounds[3]*.95}>
        <stop offset="0%" stopColor={region.layers[2]?.color??region.layers[0].color}/>
        <stop offset="27%" stopColor={region.layers[0].color}/>
        <stop offset="65%" stopColor={region.layers[0].color}/>
        <stop offset="100%" stopColor={region.layers[1]?.color??region.layers[0].color}/>
      </linearGradient>)}
    </defs>
    <rect width={drawing.width} height={drawing.height} fill={drawing.paper} />
    {drawing.paperTooth > 0 && <rect width={drawing.width} height={drawing.height} fill={"url(#" + uid + "-paper)"} />}
    {drawing.regions.map((region, index) => {
      return <g key={region.id} data-km-pencil-region={region.id} transform={region.transform}>
        {region.opaqueSupport && (reducedMotion || frame > region.layers[0].startFrame) &&
          <path data-km-pencil-support={region.id} d={region.path} fill={drawing.paper}
            opacity={evaluatePencilMark(frame, {
              startFrame: region.layers[0].startFrame,
              durationFrames: 16,
            }, reducedMotion)}/>}
        {/* An unfinished sheet stays blank until a real pencil stroke starts. Underpaint only
            softens voids beneath deposited pigment; it must never reveal the subject early. */}
        {region.craft && (reducedMotion || frame > region.layers[0].startFrame) &&
          <path data-km-pencil-craft-base="" d={region.path}
            fill={"url(#"+uid+"-tone-"+index+")"}
            mask={"url(#"+uid+"-craft-mask-"+index+")"}
            opacity={( .76 + .20*region.craft.burnish) * evaluatePencilMark(frame,{
              startFrame:region.layers[0].startFrame,
              durationFrames:Math.max(45,Math.floor(region.layers[0].durationFrames*.64)),
            },reducedMotion)}/>}
        {!region.craft && region.underpaint &&
          (reducedMotion || frame > region.layers[0].startFrame) &&
          <path data-km-pencil-underpaint="" d={region.path} fill={region.underpaint}
            mask={"url(#" + uid + "-pigment-mask)"}
            opacity={(region.underpaintOpacity ?? .042) * evaluatePencilMark(frame, {
              startFrame: region.layers[0].startFrame,
              durationFrames: region.layers[0].durationFrames,
            }, reducedMotion)} />}
        <g clipPath={"url(#" + uid + "-region-" + index + ")"} mask={"url(#" + uid + "-pigment-mask)"}>
          {region.layers.map((layer, layerIndex) => <PigmentPass key={layerIndex}
            region={region} layer={layer} index={layerIndex} frame={frame}
            reducedMotion={reducedMotion}/> )}
          {region.craft&&<CraftDeposit region={region} frame={frame}
            reducedMotion={reducedMotion}/>}
        </g>
        <g data-km-graphite="">
          {region.craft ?
            <g opacity={region.craft.kind==="ocular"||region.craft.kind==="keratin"?.83:.34}>
              <Trace trace={region.contour} frame={frame} reducedMotion={reducedMotion}/>
            </g>:
            <Trace trace={region.contour} frame={frame} reducedMotion={reducedMotion}/>} 
          {region.clipDetails ?
            <g data-km-pencil-details="" clipPath={"url(#" + uid + "-region-" + index + ")"}>
              {region.details?.map((trace, i) =>
                <Trace key={i} trace={trace} frame={frame} reducedMotion={reducedMotion}/>)}
            </g> :
            region.details?.map((trace, i) =>
              <Trace key={i} trace={trace} frame={frame} reducedMotion={reducedMotion}/>)}
        </g>
      </g>;
    })}
    {children}
  </svg>;
}
