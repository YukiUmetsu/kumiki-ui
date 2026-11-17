import {useId} from "react";
import type {CSSProperties} from "react";
import {RisoPrint} from "./print-plates-react";
import type {RisoPrintProps} from "./print-plates-react";
import {inspectRisoPrint} from "./print-plates";
import type {RisoSheet} from "./riso-sheet-feed";
import {completedRisoFrame} from "./riso-sheet-feed";
import {createRisoTornPaperProfile,risoTornPaperShape,risoTornProgress}
  from "./riso-torn-paper";
import type {RisoTearDirection} from "./riso-torn-paper";

export interface RisoTornPaperTransitionProps {
  /** Distinct printed original artwork with fully separate physical spot plates. */
  outgoing:RisoSheet;
  incoming:RisoSheet;
  /** Existing FilmStage scene-local frame; no independent clock. */
  frame:number;
  startFrame:number;
  durationFrames:number;
  direction?:RisoTearDirection;
  /** Original paper edge irregularity 0..1, exact zero means clean guillotine-cut collage. */
  roughness?:number;
  /** Paper edge bevel and contact shadow weight, not a generic blur. */
  paperThickness?:number;
  seed?:number;
  misregistration?:number;
  paperGrain?:number;
  /** Opt-in original per-drum paper-locked ink-pressure material (RISO75). */
  drumContact?:RisoPrintProps["drumContact"];
  reducedMotion?:boolean;
  label?:string;
  className?:string;
  style?:CSSProperties;
}
const isHex=(s:string)=>/^#[a-f\d]{6}$/i.test(s);
const channel=(hex:string,i:number)=>parseInt(hex.slice(i,i+2),16);
function mixHex(base:string,blend:string,weight:number){
  if(!isHex(base)||!isHex(blend))
    throw new RangeError("RISO76 requires authentic six-digit paper/ink colours.");
  return "#"+[1,3,5].map(i=>Math.round(
    channel(base,i)*(1-weight)+channel(blend,i)*weight
  ).toString(16).padStart(2,"0")).join("");
}

/** RISO76: an existing FD1 film can move from one fully composed print into
 * another by exposing an independently printed sheet along a hand-authored
 * ragged paper-fibre edge. Unlike an image wipe, both pictures stay intact
 * source-native vector ink/halftone masters behind an actual material silhouette.
 *
 * Browser/CSS time does not exist: the cut is entirely deterministic from the
 * existing film frame and seed. Terminal states show only one *whole* source.
 */
export function RisoTornPaperTransition({
  outgoing,incoming,frame,startFrame,durationFrames,
  direction="left-to-right",roughness=.77,paperThickness=.56,seed=76,
  misregistration=0,paperGrain=.55,drumContact,reducedMotion=false,
  label="A fibre-torn print collage reveals a second original Risograph artwork",
  className,style,
}:RisoTornPaperTransitionProps){
  const progress=risoTornProgress(frame,startFrame,durationFrames,reducedMotion);
  const errors=[
    ...inspectRisoPrint(outgoing.spec).map(p=>"outgoing"+p.path+": "+p.message),
    ...inspectRisoPrint(incoming.spec).map(p=>"incoming"+p.path+": "+p.message),
  ];
  if(errors.length)throw new RangeError(errors.join("; "));
  const {width,height}=outgoing.spec;
  if(width!==incoming.spec.width||height!==incoming.spec.height)
    throw new RangeError("RISO76 collage sheets must have exact matching canvas dimensions; author each aspect separately.");
  if(!Number.isFinite(paperThickness)||paperThickness<0||paperThickness>1||
    !Number.isFinite(roughness)||roughness<0||roughness>1||
    !Number.isFinite(misregistration)||misregistration<0||misregistration>1||
    !Number.isFinite(paperGrain)||paperGrain<0||paperGrain>1)
    throw new RangeError("RISO76 paper, registration, and texture controls must be 0..1.");
  const profile=createRisoTornPaperProfile({width,height,seed,roughness});
  const tear=risoTornPaperShape(profile,direction,progress);
  const cutId="riso76-"+useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const shadow=mixHex(outgoing.spec.paper,"#241c17",.55);
  const softShadow=mixHex(outgoing.spec.paper,"#42382F",.38);
  const underside=mixHex(incoming.spec.paper,"#FFFDF5",.60);
  const fibre=mixHex(incoming.spec.paper,"#FFFDF5",.29);
  const common={misregistration,paperGrain,drumContact,reducedMotion:true,
    "aria-hidden":true as const};
  return <svg xmlns="http://www.w3.org/2000/svg"
    className={className} role="img" aria-label={label}
    data-km-riso76-torn-collage=""
    data-km-riso76-frame={frame}
    data-km-riso76-direction={direction}
    data-km-riso76-progress={progress}
    data-km-riso76-roughness={roughness}
    data-km-riso76-paper-thickness={paperThickness}
    data-km-intentional-text-clip=""
    viewBox={`0 0 ${width} ${height}`}
    style={{width:"100%",height:"100%",display:"block",overflow:"hidden",
      background:outgoing.spec.paper,isolation:"isolate",...style}}>
    {progress<1&&<g data-km-riso76-outgoing-original="">
      <RisoPrint spec={outgoing.spec} artworks={outgoing.artworks}
        frame={completedRisoFrame(outgoing.spec)} {...common}/>
    </g>}
    {progress>0&&progress<1&&<defs>
      <clipPath id={cutId} clipPathUnits="userSpaceOnUse">
        <path data-km-riso76-source-torn-mask="" d={tear.clipPath}/>
      </clipPath>
    </defs>}
    {progress>0&&<g data-km-riso76-incoming-original=""
      clipPath={progress<1?`url(#${cutId})`:undefined}>
      <RisoPrint spec={incoming.spec} artworks={incoming.artworks}
        frame={completedRisoFrame(incoming.spec)} {...common}/>
    </g>}
    {progress>0&&progress<1&&<g pointerEvents="none"
      data-km-riso76-edge-material=""
      style={{mixBlendMode:"multiply"}}>
      {/* A deep, wide contact shade lies on the *unprinted outgoing stock*,
          then an offset pale paper shoulder catches light along every notch.
          These layers convey physical cut-sheet thickness instead of a
          generic UI-gradient border. The individual splinter lines are
          ink-free paper, not a shader on either spot-ink master. */}
      <path d={tear.edgePath} stroke={softShadow} opacity={.18*paperThickness}
        strokeWidth={7+paperThickness*8} fill="none"
        strokeLinecap="round" strokeLinejoin="round"
        data-km-riso76-contact-shadow=""/>
      <path d={tear.edgePath} stroke={shadow} opacity={.25*paperThickness}
        strokeWidth={1.2+paperThickness*2.2} fill="none"
        strokeLinecap="round" strokeLinejoin="round"
        data-km-riso76-inner-shadow=""/>
      <path d={tear.edgePath} stroke={underside}
        opacity={.45+.25*paperThickness}
        strokeWidth={.58+paperThickness*1.5} fill="none"
        strokeLinecap="round" strokeLinejoin="round"
        data-km-riso76-paper-lip=""/>
      <g stroke={fibre} fill="none" strokeLinecap="round"
        data-km-riso76-cellulose-edge="">
        {tear.fibrePaths.map(p=><path key={p.id}
          data-km-riso76-cellulose-fibre={p.id}
          d={p.d} strokeWidth={p.width}
          opacity={p.opacity*(.42+.58*paperThickness)}/>)}
      </g>
    </g>}
  </svg>;
}
