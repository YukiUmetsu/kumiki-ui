import { useCallback, useMemo } from "react";
import { createCameraTargetRegistry } from "../motion/camera-targets";
import { compileCinematicCamera } from "../motion/cinematic-camera-director";
import { CameraViewport3D } from "../motion/camera-viewport-3d";
import type { MotionTimeline, RationalFps } from "../motion/types";
import { metricRevealProgress, resolveMetricVisual } from "./metric-model";
import type { MetricReveal, MetricVisualSpec } from "./metric-model";
import { createMetricScene3D } from "./metric-visual-3d";

export interface MetricVisual3DProps {
  spec:MetricVisualSpec;
  frame?:number;
  reveal?:MetricReveal;
  width?:number;
  height?:number;
  /** Supplying CC1/MG1 timeline ties the visual directly to an explainer. */
  timeline?:MotionTimeline;
  /** Only applies to the built-in, static framing helper. */
  durationFrames?:number;
  fps?:RationalFps;
  className?:string;
  pixelRatio?:number;
}
export function createMetricCameraTimeline(
  width:number,height:number,durationFrames=240,
  fps:RationalFps={num:30,den:1},
):MotionTimeline{
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<600||height<400||
    !Number.isSafeInteger(durationFrames)||durationFrames<1||
    !Number.isSafeInteger(fps.num)||!Number.isSafeInteger(fps.den)||fps.num<1||fps.den<1)
    throw new Error("Metric 3D camera needs positive dimensions, FPS and duration.");
  const targets=createCameraTargetRegistry({revision:"metric-camera-v1",targets:[{
    id:"metric-stage",frames:[{frame:0,bounds:{
      min:[-6,-.7,-2] as const,max:[6,5.7,2.6] as const,
    }}],
  }]});
  const result=compileCinematicCamera({
    schemaVersion:1,id:"metric-visual-camera",title:"Metric overview",
    fps,durationFrames,output:{width,height},
    shots:[{id:"chart-overview",type:"establish",target:"metric-stage",
      framing:"wide",movement:"hold",durationFrames}],
  },targets);
  if(!result.ok)throw new Error("Unable to frame 3D metric stage: "+result.diagnostics.map(d=>d.message).join("; "));
  return result.plan.timeline;
}
/** Premade cinematic stage with authored semantic metrics, persistent data
 * labels and a deterministic CC1 camera. No second animation playhead.
 */
export function MetricVisual3D({
  spec,frame=239,reveal,width=1280,height=720,timeline,durationFrames=240,
  fps={num:30,den:1},className,pixelRatio=1.5,
}:MetricVisual3DProps) {
  const model=resolveMetricVisual(spec);
  const camera=useMemo(()=>timeline??createMetricCameraTimeline(width,height,durationFrames,fps),
    [timeline,width,height,durationFrames,fps.num,fps.den]);
  if(!Number.isSafeInteger(frame)||frame<0||frame>=camera.durationFrames)
    throw new Error("Metric visual frame must be inside the shared camera timeline.");
  const createScene=useCallback(()=>createMetricScene3D(spec,{reveal}),[spec,reveal]);
  return <CameraViewport3D timeline={camera} frame={frame}
    cameraMode="pose" cameraId="camera3d" reducedMotion={false}
    width={width} height={height} pixelRatio={pixelRatio} className={className}
    ariaLabel={model.summary} createScene={createScene}
    data-km-metric-visual-3d={model.kind} data-semantic-id={model.id}
    overlay={<div style={{position:"absolute",inset:0,color:"#F2FAFF",
      fontFamily:"Geist, Inter, system-ui, sans-serif",pointerEvents:"none"}}>
      <div style={{position:"absolute",top:"6%",left:"5%",maxWidth:"72%"}}>
        <div style={{fontSize:"clamp(20px,3vw,46px)",fontWeight:740,
          lineHeight:1.05,letterSpacing:"-.025em"}}>{model.title}</div>
        <div style={{fontSize:"clamp(12px,1.4vw,19px)",color:"#B7CED9",
          paddingTop:9}}>{model.subtitle}</div>
      </div>
      <div style={{position:"absolute",top:"21%",right:"4%",textAlign:"right",
        fontSize:"clamp(10px,1vw,14px)",lineHeight:1.5,color:"#B7CED9"}}>
        <div>TOP {model.formatValue(model.domain[1])}</div>
        <div>BASE {model.formatValue(model.domain[0])}</div>
        {model.scaleDisclosure?<div style={{color:"#FF9DAD"}}>{model.scaleDisclosure}</div>:null}
      </div>
      <div style={{position:"absolute",left:"4%",right:"4%",bottom:"5%",
        display:"grid",gridTemplateColumns:`repeat(${model.marks.length}, minmax(0, 1fr))`,
        gap:5,borderTop:"1px solid #426071",paddingTop:15}}>
        {model.marks.map((m,i)=><div key={m.id}
          data-km-metric-label={m.id} style={{textAlign:"center",
            opacity:metricRevealProgress(i,frame,reveal)>0?1:.12}}>
          <div style={{fontWeight:750,fontSize:"clamp(10px,1.1vw,16px)",
            color:i===model.marks.length-1?"#AEAAFF":"#F2FAFF"}}>
            {m.value===null?"—":model.formatValue(m.value)}</div>
          <div style={{color:"#B5CAD6",fontSize:"clamp(9px,.9vw,13px)",
            marginTop:4,overflowWrap:"anywhere"}}>{m.label}</div>
        </div>)}
      </div>
      {model.sourceNote?<div style={{position:"absolute",right:"4%",bottom:"1%",
        color:"#A4C0CE",fontSize:"clamp(10px,.85vw,13px)"}}>{model.sourceNote}</div>:null}
    </div>} />;
}
