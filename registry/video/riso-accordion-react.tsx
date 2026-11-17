import {Fragment,useId} from "react";
import type {CSSProperties} from "react";
import {RisoPrint} from "./print-plates-react";
import type {RisoPrintProps} from "./print-plates-react";
import type {RisoSheet} from "./riso-sheet-feed";
import {completedRisoFrame} from "./riso-sheet-feed";
import {inspectRisoPrint} from "./print-plates";
import {createRisoAccordionProjection,risoAccordionCreaseFibres}
  from "./riso-accordion-projection";
import type {RisoAccordionAxis} from "./riso-accordion-projection";

export interface RisoAccordionPrintedZineProps{
  /** ONE authored continuous original printed illustration, never isolated posters. */
  readonly sheet:RisoSheet;
  readonly panels:number;
  readonly axis?:RisoAccordionAxis;
  /** Direct 0..1 openness, independently usable inside any FilmStage slot. */
  readonly openness:number;
  readonly paperStockRelief?:number;
  readonly seed?:number;
  readonly paperGrain?:number;
  readonly misregistration?:number;
  readonly drumContact?:RisoPrintProps["drumContact"];
  readonly label?:string;
  readonly className?:string;
  readonly style?:CSSProperties;
}

/** Original two-drum source ink and fibre-mark topology is never simplified:
 * the SAME intact vector print is clipped through each moving paper face,
 * preserving source plate registration across the scored hinges.
 * The output is an art-directed 2.5D overhead affine projection, not a
 * calibrated true 3D paper-simulation or a screenshot-effect wipe. */
export function RisoAccordionPrintedZine({
  sheet,panels,axis="vertical",openness,
  paperStockRelief=.62,seed=78,paperGrain=.56,misregistration=.2,
  drumContact,label="An original printed Risograph sheet unfolds as one connected accordion",
  className,style,
}:RisoAccordionPrintedZineProps){
  const problems=inspectRisoPrint(sheet.spec);
  if(problems.length)
    throw new RangeError("RISO78 invalid original print: "+
      problems.map(x=>x.path+": "+x.message).join("; "));
  if(!Number.isFinite(paperStockRelief)||paperStockRelief<0||paperStockRelief>1||
    !Number.isFinite(paperGrain)||paperGrain<0||paperGrain>1||
    !Number.isFinite(misregistration)||misregistration<0||misregistration>1)
    throw new RangeError("RISO78 material relief, stock grain and plate registration must be 0..1.");
  const {width,height}=sheet.spec;
  const projection=createRisoAccordionProjection({
    width,height,panels,axis,seed,openness,
  });
  const rawId=useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const uid="riso78-"+rawId;
  const common={
    frame:completedRisoFrame(sheet.spec),
    spec:sheet.spec,artworks:sheet.artworks,
    misregistration,paperGrain,drumContact,reducedMotion:true,
    "aria-hidden":true as const,
  };
  return <svg xmlns="http://www.w3.org/2000/svg"
    role="img" aria-label={label}
    className={className}
    viewBox={`0 0 ${width} ${height}`}
    data-km-riso78-accordion=""
    data-km-riso78-panels={panels}
    data-km-riso78-axis={axis}
    data-km-riso78-openness={openness}
    data-km-riso78-angle={projection.angleDegrees}
    data-km-riso78-original-plates={sheet.spec.plates.length}
    style={{width:"100%",height:"100%",display:"block",
      background:sheet.spec.paper,isolation:"isolate",overflow:"hidden",
      ...style}}>
    {openness===1?
      <g data-km-riso78-exact-original-source="">
        <RisoPrint {...common}/>
      </g>:
      <Fragment>
        <defs>
          {projection.faces.map(face=>{
            const [x,y,w,h]=face.sourceRect;
            return <Fragment key={face.index}>
              <clipPath id={`${uid}-p${face.index}`}
                clipPathUnits="userSpaceOnUse">
                <rect x={x} y={y} width={w} height={h}/>
              </clipPath>
              <linearGradient id={`${uid}-shade${face.index}`}
                x1="0%" y1="0%"
                x2={axis==="vertical"?"100%":"0%"}
                y2={axis==="vertical"?"0%":"100%"}>
                <stop offset="0" stopColor="#221C19"
                  stopOpacity={face.reverse?.20:.30}/>
                <stop offset=".13" stopColor="#221C19"
                  stopOpacity={face.reverse?.12:.13}/>
                <stop offset=".48" stopColor="#FBF4E9" stopOpacity=".14"/>
                <stop offset=".84" stopColor="#221C19"
                  stopOpacity={face.reverse?.28:.12}/>
                <stop offset="1" stopColor="#221C19"
                  stopOpacity={face.reverse?.32:.26}/>
              </linearGradient>
            </Fragment>;
          })}
        </defs>
        {/* A stationary table/backing, then all scored faces in physical
            source-page sequence. No independently regenerated ink grain. */}
        <rect width={width} height={height} fill={sheet.spec.paper}/>
        {projection.faces.map(face=>{
          const [a,b,c,d,e,f]=face.matrix;
          const [x,y,w,h]=face.sourceRect;
          const edgeCoord=axis==="vertical"?x:y;
          const creaseIds=face.index===0?[]:
            risoAccordionCreaseFibres(seed,face.index,axis,
              edgeCoord,axis==="vertical"?height:width);
          return <g key={face.index}
            data-km-riso78-panel={face.index}
            data-km-riso78-original-source=""
            data-km-riso78-paper-reverse={String(face.reverse)}
            transform={`matrix(${a} ${b} ${c} ${d} ${e} ${f})`}>
            <g clipPath={`url(#${uid}-p${face.index})`}
              data-km-riso78-source-panel={face.index}>
              <RisoPrint {...common}/>
              {face.shadeOpacity>0&&<rect x={x} y={y} width={w} height={h}
                data-km-riso78-angled-illumination={face.index}
                fill={`url(#${uid}-shade${face.index})`}
                opacity={face.shadeOpacity*paperStockRelief}
                pointerEvents="none"/>}
            </g>
            {face.index>0&&<g data-km-riso78-paper-score={face.index}
              pointerEvents="none">
              {/* A narrowly impressed pulp channel and lift lip: each is
                  physically scored at the SAME original paper coordinate
                  across all 24fps film frames. */}
              {axis==="vertical"?<Fragment>
                <path d={`M${x} 0 V${height}`} stroke="#40382F"
                  opacity={.29*(1-openness)*paperStockRelief}
                  strokeWidth={1.25} fill="none"/>
                <path d={`M${x+.75} 0 V${height}`} stroke="#FFFDF4"
                  opacity={.63*(1-openness)*paperStockRelief}
                  strokeWidth={1.15} fill="none"/>
              </Fragment>:<Fragment>
                <path d={`M0 ${y} H${width}`} stroke="#40382F"
                  opacity={.29*(1-openness)*paperStockRelief}
                  strokeWidth={1.25} fill="none"/>
                <path d={`M0 ${y+.75} H${width}`} stroke="#FFFDF4"
                  opacity={.63*(1-openness)*paperStockRelief}
                  strokeWidth={1.15} fill="none"/>
              </Fragment>}
              <g fill="none" stroke="#463E32" strokeWidth=".32"
                opacity={(1-openness)*.28*paperStockRelief}
                data-km-riso78-score-fibres={face.index}>
                {creaseIds.map((d,index)=><path key={index}
                  data-km-riso78-cellulose-scuff={face.index+"-"+index}
                  d={d} strokeLinecap="round"/>)}
              </g>
            </g>}
            {face.index>0&&<g pointerEvents="none"
              data-km-riso78-crease-shadow={face.index}>
              {axis==="vertical"?
                <rect x={x} width={Math.min(7,3+(1-openness)*4)}
                  y={0} height={height} fill="#231D1A"
                  opacity={face.shadeOpacity*paperStockRelief*.24}/>:
                <rect y={y} height={Math.min(7,3+(1-openness)*4)}
                  x={0} width={width} fill="#231D1A"
                  opacity={face.shadeOpacity*paperStockRelief*.24}/>}
            </g>}
          </g>;
        })}
      </Fragment>}
  </svg>;
}
