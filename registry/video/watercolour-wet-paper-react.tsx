import { useId, useMemo } from "react";
import type { CSSProperties, SVGProps } from "react";
import { evaluateWetPaper, inspectWetPaper } from "./watercolour-wet-paper";
import type { WetPaperSpec } from "./watercolour-wet-paper";

export interface WatercolourWetPaperProps extends
  Omit<SVGProps<SVGSVGElement>, "children" | "width" | "height" | "viewBox"> {
  spec: WetPaperSpec;
  /** Absolute FilmStage scene frame; no private timer or mutable fluid state. */
  frame: number;
  reducedMotion?: boolean;
  transparentPaper?: boolean;
  label?: string;
  style?: CSSProperties;
}

/** An actual shared wet-pigment field: different hues occupy and move between
 * the SAME paper cells rather than overlapping independent static SVG washes.
 * The filtered surface contains only pigment. Text and separately painted
 * figures must be composed on top, outside this material pass.
 */
export function WatercolourWetPaper({
  spec, frame, reducedMotion=false, transparentPaper=false,
  label="Watercolour pigment soaking into wet paper", style, ...props
}:WatercolourWetPaperProps) {
  const errors=inspectWetPaper(spec);
  if(errors.length) throw new RangeError("Invalid wet paper: "+errors.map(e=>e.path).join(", "));
  const state=useMemo(()=>evaluateWetPaper(spec,frame,reducedMotion),[spec,frame,reducedMotion]);
  const rawId=useId();
  const id="wm4"+rawId.replace(/[^a-zA-Z0-9_-]/g,"");
  const flecks=useMemo(()=>Array.from({length:230},(_,i)=>({
    x:(i*137.47+spec.seed*17.31)%spec.width,
    y:(i*359.11+spec.seed*43.27)%spec.height,
    length:.6+(i%7)*.53,
    opacity:.015+(i%11)*.006,
  })),[spec]);
  return <svg {...props} xmlns="http://www.w3.org/2000/svg"
    viewBox={`0 0 ${spec.width} ${spec.height}`}
    role={props["aria-hidden"]?undefined:"img"}
    aria-label={props["aria-hidden"]?undefined:label}
    data-km-wet-paper="" data-km-wet-paper-frame={frame}
    data-km-wet-paper-phase={state.settled?"dry":"wet"}
    data-km-wet-paper-pigment={state.totalPigment.toFixed(4)}
    style={{width:"100%",height:"100%",display:"block",isolation:"isolate",overflow:"hidden",...style}}>
    <defs>
      {Boolean(spec.reservePaths?.length) && <mask id={id+"-reserves"} maskUnits="userSpaceOnUse"
        x={0} y={0} width={spec.width} height={spec.height}>
        <rect width={spec.width} height={spec.height} fill="#fff"/>
        {spec.reservePaths?.map((path,i)=><path key={i} d={path} fill="#000"/>)}
      </mask>}
      {/* Stroke-scale softness then paper-tooth displacement; the film and
          UI typography are never blurred or displaced. */}
      <filter id={id+"-wick"} x="-8%" y="-8%" width="116%" height="116%"
        colorInterpolationFilters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation={Math.max(.8,spec.cellSize*.18)}
          result="diffused"/>
        <feTurbulence type="fractalNoise" baseFrequency=".018 .028"
          numOctaves={3} seed={1+spec.seed%991} result="paper"/>
        <feDisplacementMap in="diffused" in2="paper"
          scale={spec.paper.tooth*spec.cellSize*.18}
          xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs>
    {!transparentPaper && <>
      <rect width={spec.width} height={spec.height} fill={spec.paper.color}/>
      <g data-km-wet-paper-fibres="" pointerEvents="none">
        {flecks.map((p,i)=><path key={i}
          d={`M${p.x.toFixed(2)} ${p.y.toFixed(2)} h${p.length.toFixed(2)}`}
          stroke="#655D4E" strokeWidth=".55" opacity={p.opacity*spec.paper.tooth}/>)}
      </g>
    </>}
    <g data-km-wet-pigment-field="" pointerEvents="none"
      style={{mixBlendMode:"multiply"}} filter={`url(#${id}-wick)`}
      mask={spec.reservePaths?.length?`url(#${id}-reserves)`:undefined}>
      {state.cells.map((cell,i)=><rect key={i}
        data-km-pigment-cell="" x={cell.x} y={cell.y}
        width={cell.width+.35} height={cell.height+.35}
        fill={cell.pigment} opacity={cell.opacity}/>)}
    </g>
  </svg>;
}
