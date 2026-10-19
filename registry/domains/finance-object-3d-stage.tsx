/** Ready-to-use premium finance object stage; real Three render, CC1 camera.
 * Camera is optional and can be shared with an existing explainer timeline.
 */
import { useCallback, useEffect, useMemo } from "react";
import type { MotionTimeline, RationalFps } from "../motion/types";
import { createCameraTargetRegistry } from "../motion/camera-targets";
import { compileCinematicCamera } from "../motion/cinematic-camera-director";
import { CameraViewport3D } from "../motion/camera-viewport-3d";
import { resolveFinanceObject } from "./finance-object-model";
import type { FinanceObjectSpec } from "./finance-object-model";
import { createFinanceObjectHeroAsset, createFinanceObjectScene3D } from "./finance-object-3d";
import type { HeroBounds } from "../craft/hero-studio";
import type { SculptFinish } from "../craft/sculpt-finish";

export type FinanceReviewView="front"|"quarter"|"side"|"detail";
export function createFinanceObjectCameraTimeline(
  width:number,height:number,frames=180,fps:RationalFps={num:30,den:1},
  view:FinanceReviewView="quarter",
  /** Subject bounds; defaults to the standard finance object envelope. */
  bounds?:HeroBounds,
):MotionTimeline{
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||
     width<400||height<400||!Number.isSafeInteger(frames)||frames<1)
    throw new Error("Finance 3D stage needs valid positive pixel dimensions and frame length.");
  const targets=createCameraTargetRegistry({revision:"finance-object-camera-v1",targets:[{
    id:"finance-object",frames:[{frame:0,bounds:bounds
      ?{min:[...bounds.min] as [number,number,number],max:[...bounds.max] as [number,number,number]}
      :{min:[-2.70,-.60,-2.0] as const,max:[2.70,3.88,2.0] as const},
    }],
  }]});
  const result=compileCinematicCamera({schemaVersion:1,id:"finance-object-shot",
    title:"Finance object",durationFrames:frames,fps,output:{width,height},
    shots:[{id:"finance-object-focus",type:"establish",
      target:"finance-object",
      framing:view==="detail"?"close":"medium",
      movement:"hold",
      azimuth:view==="front"?0:view==="side"?90:32,
      elevation:view==="front"?8:view==="detail"?16:18,
      durationFrames:frames}]},targets);
  if(!result.ok)throw new Error("Cannot frame 3D finance object: "+
    result.diagnostics.map(d=>d.message).join("; "));
  return result.plan.timeline;
}
export interface FinanceObject3DProps {
  spec:FinanceObjectSpec;
  frame?:number;
  startFrame?:number;
  revealFrames?:number;
  width?:number;
  height?:number;
  durationFrames?:number;
  fps?:RationalFps;
  cameraTimeline?:MotionTimeline;
  /** Four authored review views. Do not count a single front view as approval. */
  reviewView?:FinanceReviewView;
  pixelRatio?:number;
  /** Hero sculptures (bull/bear): "aged-bronze" statue (default) or "natural" animal. */
  finish?:SculptFinish;
  /** Overrides the hero asset's recommended exposure. */
  exposure?:number;
  /** Signature action (e.g. bull "charge", cash "rain") starting at an absolute frame. */
  action?:{id:string;startFrame:number};
}
export function FinanceObject3D({
  spec,frame=179,startFrame=0,revealFrames=20,
  width=1280,height=720,durationFrames=180,fps={num:30,den:1},
  cameraTimeline,reviewView="quarter",pixelRatio=1.5,finish,exposure,action,
}:FinanceObject3DProps){
  const object=resolveFinanceObject(spec);
  // Crafted hero asset (when one exists) is built once per spec and shared with
  // the scene, so camera framing uses its authored bounds before any render.
  const hero=useMemo(()=>createFinanceObjectHeroAsset(spec,{finish}),[spec,finish]);
  useEffect(()=>()=>hero?.dispose(),[hero]);
  const timeline=useMemo(()=>cameraTimeline??createFinanceObjectCameraTimeline(
    width,height,durationFrames,fps,reviewView,hero?.bounds),
    [cameraTimeline,width,height,durationFrames,fps.num,fps.den,reviewView,hero]);
  if(!Number.isSafeInteger(frame)||frame<0||frame>=timeline.durationFrames)
    throw new Error("3D finance object frame is outside the shared timeline.");
  const createScene=useCallback(()=>createFinanceObjectScene3D(spec,{
    startFrame,revealFrames,heroAsset:hero??undefined,hero:hero!==null,action,fps:fps.num/fps.den,
  }),[spec,startFrame,revealFrames,hero,action?.id,action?.startFrame,fps.num,fps.den]);
  return <CameraViewport3D width={width} height={height} frame={frame}
    timeline={timeline} createScene={createScene} cameraMode="pose"
    reducedMotion={false} pixelRatio={pixelRatio} exposure={exposure??hero?.exposure??1}
    ariaLabel={object.title} data-km-finance-object-3d={object.kind}
    data-semantic-id={object.id}
    overlay={<div style={{position:"absolute",inset:0,pointerEvents:"none",
      fontFamily:"Geist, Inter, system-ui, sans-serif",
      color:"#EDF8FD"}}>
      <div style={{position:"absolute",top:"7%",left:"8%",maxWidth:"75%"}}>
        <div style={{fontSize:"clamp(18px,2.8vw,40px)",fontWeight:760}}>
          {object.title}
        </div>
        <div style={{color:"#99BFCD",fontSize:"clamp(10px,1.2vw,17px)",
          marginTop:8}}>FINANCE / BUSINESS · 3D</div>
      </div>
      <div style={{position:"absolute",bottom:"7%",left:"8%",right:"8%",
        borderTop:"1px solid #44616D",paddingTop:14,
        letterSpacing:2,color:"#8FAFBC",fontSize:14}}>
        {object.kind.replace(/-/g," ").toUpperCase()}
      </div>
    </div>}/>;
}
