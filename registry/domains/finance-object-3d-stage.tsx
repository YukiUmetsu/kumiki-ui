/** Ready-to-use premium finance object stage; real Three render, CC1 camera.
 * Camera is optional and can be shared with an existing explainer timeline.
 */
import { useCallback, useMemo } from "react";
import type { MotionTimeline, RationalFps } from "../motion/types";
import { createCameraTargetRegistry } from "../motion/camera-targets";
import { compileCinematicCamera } from "../motion/cinematic-camera-director";
import { CameraViewport3D } from "../motion/camera-viewport-3d";
import { resolveFinanceObject } from "./finance-object-model";
import type { FinanceObjectSpec } from "./finance-object-model";
import { createFinanceObjectScene3D } from "./finance-object-3d";

export function createFinanceObjectCameraTimeline(
  width:number,height:number,frames=180,fps:RationalFps={num:30,den:1},
):MotionTimeline{
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||
     width<400||height<400||!Number.isSafeInteger(frames)||frames<1)
    throw new Error("Finance 3D stage needs valid positive pixel dimensions and frame length.");
  const targets=createCameraTargetRegistry({revision:"finance-object-camera-v1",targets:[{
    id:"finance-object",frames:[{frame:0,bounds:{
      min:[-2.25,-.25,-1.7] as const,max:[2.25,3.25,1.7] as const,
    }}],
  }]});
  const result=compileCinematicCamera({schemaVersion:1,id:"finance-object-shot",
    title:"Finance object",durationFrames:frames,fps,output:{width,height},
    shots:[{id:"finance-object-focus",type:"establish",
      target:"finance-object",framing:"medium",movement:"hold",
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
  pixelRatio?:number;
}
export function FinanceObject3D({
  spec,frame=179,startFrame=0,revealFrames=20,
  width=1280,height=720,durationFrames=180,fps={num:30,den:1},
  cameraTimeline,pixelRatio=1.5,
}:FinanceObject3DProps){
  const object=resolveFinanceObject(spec);
  const timeline=useMemo(()=>cameraTimeline??createFinanceObjectCameraTimeline(
    width,height,durationFrames,fps),[cameraTimeline,width,height,durationFrames,fps.num,fps.den]);
  if(!Number.isSafeInteger(frame)||frame<0||frame>=timeline.durationFrames)
    throw new Error("3D finance object frame is outside the shared timeline.");
  const createScene=useCallback(()=>createFinanceObjectScene3D(spec,{
    startFrame,revealFrames,
  }),[spec,startFrame,revealFrames]);
  return <CameraViewport3D width={width} height={height} frame={frame}
    timeline={timeline} createScene={createScene} cameraMode="pose"
    reducedMotion={false} pixelRatio={pixelRatio}
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
