import { useId, useMemo } from "react";
import type { PaperCraftStageProps } from "./paper-craft-react";
import { PaperCraftStage, paperShade } from "./paper-craft-react";
import { compilePaperDirector, resolvePaperDirector } from "./paper-director";
import type {
  PaperDirectorAspect, PaperDirectorFilm, PaperDirectorFrame, PaperDirectorPlan,
} from "./paper-director";

export interface PaperDirectorStageProps extends Omit<PaperCraftStageProps, "spec" | "frame"> {
  film: PaperDirectorFilm;
  aspect: PaperDirectorAspect;
  frame: number;
}
export interface PaperDirectorCompositionProps extends Omit<PaperDirectorStageProps, "film"> {
  plan: PaperDirectorPlan;
}
/** A single opaque sheet, with an authored uneven deckled edge.
 * The paper physically occludes a shot while the hard edit switches scenes;
 * incoming and outgoing drawings are never alpha blended.
 */
function PaperCurtain({shot}: {shot:PaperDirectorFrame}) {
  const entry=shot.curtain;
  if(!entry)return null;
  const {spec,phase,progress}=entry;
  const width=shot.spec.width,height=shot.spec.height;
  const over=Math.max(52,width*.07), top=-24, bottom=height+24;
  const edge=-over+(width+2*over)*progress;
  const segments=32;
  const edgePoints=Array.from({length:segments+1},(_,i)=>{
    const y=top+(bottom-top)*i/segments;
    // Hand-cut oscillation: irregular slow swells plus shallow tooth.
    // Bounded, authored in paper space: seeking never animates the texture.
    const rough=7.3*Math.sin(i*.71)+3.8*Math.sin(i*1.87+.8)+1.3*Math.sin(i*3.13);
    return [edge+rough,y] as const;
  });
  const cut=edgePoints.map(([x,y],i)=>(i?"L":"M")+x.toFixed(2)+" "+y.toFixed(2)).join(" ");
  const d=phase==="closing"
    ? `M ${(-over-10).toFixed(2)} ${top} L ${edgePoints[0][0].toFixed(2)} ${top} `+
      edgePoints.slice(1).map(([x,y])=>`L ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ")+
      ` L ${-over-10} ${bottom} Z`
    : `M ${width+over+10} ${top} L ${edgePoints[0][0].toFixed(2)} ${top} `+
      edgePoints.slice(1).map(([x,y])=>`L ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ")+
      ` L ${width+over+10} ${bottom} Z`;
  const rawId=useId(),id="paperCurtain"+rawId.replace(/[^a-zA-Z0-9]/g,"");
  const mirror=spec.direction==="right-to-left";
  return <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
    viewBox={`0 0 ${width} ${height}`}
    data-km-paper-curtain="" data-km-paper-phase={phase} data-km-paper-progress={progress.toFixed(4)}
    style={{position:"absolute",inset:0,width:"100%",height:"100%",display:"block",overflow:"hidden",pointerEvents:"none"}}>
    <defs>
      <pattern id={id+"-tooth"} width="47" height="71" patternUnits="userSpaceOnUse">
        <path d="M3 6 l7 2 M19 43 l11 -2 M30 66 l6 1 M2 68 l2 -5"
          fill="none" stroke={paperShade(spec.color,-.42)} strokeWidth=".45" strokeOpacity=".14"/>
        <path d="M9 54 l5 -1 M36 16 l7 1" fill="none"
          stroke={paperShade(spec.color,.35)} strokeWidth=".6" strokeOpacity=".18"/>
      </pattern>
    </defs>
    <g transform={mirror?`translate(${width} 0) scale(-1 1)`:undefined}>
      <path d={d} fill={spec.color} fillRule="nonzero"
        stroke={paperShade(spec.color,-.23)} strokeWidth="1.7" strokeLinejoin="round"
        style={{filter:"drop-shadow(3px 0px 5px rgba(30,25,19,.29))"}}/>
      <path d={d} fill={`url(#${id}-tooth)`} stroke="none"/>
      <path d={cut} fill="none" stroke={paperShade(spec.color,.28)}
        strokeWidth="1.05" strokeLinecap="round" strokeLinejoin="round" opacity=".67"/>
    </g>
  </svg>;
}
/** Safe frame-pure renderer for plans already compiled by the FD1 slot. */
export function PaperDirectorComposition({
  plan,aspect,frame,reducedMotion=false,...props
}:PaperDirectorCompositionProps) {
  const shot=resolvePaperDirector(plan,frame,aspect);
  return <div data-km-paper-film={plan.id} style={{
    position:"relative",width:"100%",height:"100%",overflow:"hidden",isolation:"isolate",
  }}>
    <PaperCraftStage key={shot.shotId} {...props}
      spec={shot.spec} frame={shot.localFrame} reducedMotion={reducedMotion}
      data-km-paper-director={plan.id} data-km-paper-shot={shot.shotId}
      data-km-paper-shot-index={shot.shotIndex}/>
    {!reducedMotion && shot.curtain && <PaperCurtain shot={shot}/>}
  </div>;
}
/** Portable JSON film; existing PAPER1 stage owns stock optics and hinges. */
export function PaperDirectorStage({film,aspect,frame,...props}:PaperDirectorStageProps) {
  const plan=useMemo(()=>compilePaperDirector(film),[film]);
  return <PaperDirectorComposition plan={plan} aspect={aspect} frame={frame} {...props}/>;
}
