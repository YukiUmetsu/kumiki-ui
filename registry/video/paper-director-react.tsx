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
  const rawId=useId();
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
  const id="paperCurtain"+rawId.replace(/[^a-zA-Z0-9]/g,"");
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
/** A printed paper leaf hinged at the gutter, with a separately cut verso.
 * Both images remain full-opacity card. Browser 3D projection supplies genuine
 * foreshortening; never mix the illustrations by alpha. Frame-pure and seekable.
 */
function PaperPageTurn({shot,reducedMotion,renderProps}:{
  shot:PaperDirectorFrame;
  reducedMotion:boolean;
  renderProps:Omit<PaperCraftStageProps,"spec"|"frame"|"reducedMotion">;
}) {
  const state=shot.pageTurn;
  if(!state)return null;
  const {spec,phase,progress,outgoing,outgoingFrame,incoming,incomingFrame}=state;
  const eased=progress*progress*(3-2*progress);
  const degrees=phase==="closing"?88.75*eased:91.25+88.75*eased;
  const right=spec.direction==="left-to-right";
  const facing=right?degrees:-degrees;
  const edge=right?"right":"left";
  const freeEdge=right?"left":"right";
  const width=outgoing.width, color=spec.color;
  return <div data-km-paper-page-turn="" data-km-paper-phase={phase}
    data-km-paper-angle={degrees.toFixed(3)}
    data-km-paper-progress={progress.toFixed(4)}
    style={{position:"absolute",inset:0,isolation:"isolate",pointerEvents:"none",
      perspective:`${Math.round(width*2.1)}px`}}>
    <div data-km-paper-next-page="" style={{position:"absolute",inset:0}}>
      <PaperCraftStage {...renderProps} spec={incoming} frame={incomingFrame}
        reducedMotion={reducedMotion} aria-hidden="true"/>
    </div>
    <div data-km-paper-page-leaf="" style={{
      position:"absolute",inset:0,
      transformOrigin:`${edge} center`,
      transform:`rotateY(${facing.toFixed(3)}deg)`,
      transformStyle:"preserve-3d",
      backfaceVisibility:"hidden",
      boxShadow:right?"-3px 1px 22px #241c1e70":"3px 1px 22px #241c1e70",
    }}>
      <div data-km-paper-printed-front="" style={{
        position:"absolute",inset:0,backfaceVisibility:"hidden",
        backgroundColor:outgoing.backing,
      }}>
        <PaperCraftStage {...renderProps} spec={outgoing} frame={outgoingFrame}
          reducedMotion={reducedMotion} aria-hidden="true"/>
        {/* The moving FORE edge is opposite the book hinge.
            Attaching stock to the spine looked like a digital crop during
            the first real native preview. A real paper edge casts shadow. */}
        <div data-km-paper-fore-edge="" aria-hidden="true" style={{
          position:"absolute",top:0,bottom:0,[freeEdge]:0,
          width:Math.max(3,width*.007),backgroundColor:paperShade(color,.14),
          boxShadow:right?"-4px 0px 9px #20191f72":"4px 0px 9px #20191f72",
        }}/>
      </div>
      <div data-km-paper-leaf-verso="" style={{
        position:"absolute",inset:0,backgroundColor:color,
        transform:"rotateY(180deg)",backfaceVisibility:"hidden",
        boxShadow:"inset 0 0 12px #241c1d1f",
      }}/>
    </div>
    {/* The turned verso is nearly edge-on beyond 90 degrees. Preserve its
        physical paper thickness as it tucks into the book binding; do not
        insert a ghosted reverse image or invent a full-size second flap. */}
    {phase==="opening" && <div data-km-paper-reverse-tuck="" aria-hidden="true"
      style={{position:"absolute",top:0,bottom:0,[edge]:0,
        width:Math.max(.1,width*.024*(1-progress)),
        backgroundColor:color,
        boxShadow:right?"-3px 0px 8px #1d1a2070":"3px 0px 8px #1d1a2070",
      }}/>}
    {/* Independently constructed spine remains pinned throughout. */}
    <div data-km-paper-spine="" aria-hidden="true" style={{
      position:"absolute",top:0,bottom:0,[edge]:0,
      width:Math.max(3,width*.006),backgroundColor:paperShade(color,-.25),
      boxShadow:right?"-2px 0px 6px #1c172454":"2px 0px 6px #1c172454",
    }}/>
  </div>;
}
/** Safe frame-pure renderer for plans already compiled by the FD1 slot. */
export function PaperDirectorComposition({
  plan,aspect,frame,reducedMotion=false,...props
}:PaperDirectorCompositionProps) {
  const shot=resolvePaperDirector(plan,frame,aspect);
  // A true book leaf requires both painted paper scenes simultaneously.
  // The previous scene is printed on the turning leaf, not faded above the next.
  if(!reducedMotion && shot.pageTurn)return <div data-km-paper-film={plan.id}
    data-km-paper-director={plan.id} data-km-paper-shot={shot.shotId}
    style={{position:"relative",width:"100%",height:"100%",overflow:"hidden",isolation:"isolate"}}>
    <PaperPageTurn shot={shot} reducedMotion={reducedMotion} renderProps={props}/>
  </div>;
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
