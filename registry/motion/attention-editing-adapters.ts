/** Bridges from declarative attention recipes to existing Kumiki runtime contracts. */
import { createCameraTimeline, frameCameraSubject } from "./camera";
import type { MotionTimeline } from "./types";
import { compileCutPlan } from "./cut-director";
import type { CutPlanSpec, CutTransitionSpec } from "./cut-director";
import { validateClip } from "../video/frame-clip";
import type { ClipPlacement } from "../video/frame-clip";
import { compileCameraDive, evaluateCameraDive, compileMatchTransformation } from "./attention-editing-treatments";
import type { CameraDiveSpec, MatchTransformationSpec } from "./attention-editing-treatments";
import { compileSpeedCurve } from "./attention-editing-compositions";
import type { SpeedCurveSpec } from "./attention-editing-compositions";

/** Renders via the native MG1 camera evaluator. Output pixels and focus bounds are authored per aspect. */
export function cameraDiveToNativeTimeline(spec: CameraDiveSpec): { timeline?: MotionTimeline; diagnostics: ReturnType<typeof compileCameraDive>["plan"]["diagnostics"] } {
  const result=compileCameraDive(spec);
  const diagnostics=[...result.plan.diagnostics];
  if(diagnostics.some(d=>d.severity==="error")) return {diagnostics};
  if(spec.mode==="3d") {
    diagnostics.push({code:"camera-3d-native-rig-required",severity:"error",message:"3D dives must use CinematicCameraDirector with a supplied world-space rig."});
    return {diagnostics};
  }
  const first=evaluateCameraDive(result,0), last=evaluateCameraDive(result,result.travelFrames);
  const pose=(item:typeof first)=>({center:{
    x:(spec.stage.width/2-item.pose.x)/item.pose.scale,
    y:(spec.stage.height/2-item.pose.y)/item.pose.scale,
  },zoom:item.pose.scale});
  const arrival=Math.min(spec.durationFrames-1,result.travelFrames);
  const keys=arrival===spec.durationFrames-1
    ?[{frame:0,...pose(first)},{frame:arrival,...pose(last),easing:"ease-in-out-cubic" as const}]
    :[{frame:0,...pose(first)},{frame:arrival,...pose(last),easing:"ease-in-out-cubic" as const},
      {frame:spec.durationFrames-1,...pose(last)}];
  try {
    return {timeline:createCameraTimeline({id:spec.id+"/camera-dive",fps:spec.fps,durationFrames:spec.durationFrames,keyframes:keys}),diagnostics};
  }catch(cause){
    diagnostics.push({code:"camera-native-compile-failed",severity:"error",message:String(cause)});
    return {diagnostics};
  }
}

/** Compile a real native cut plan; semantic ID unifies distinct representation-local IDs. */
export function matchTransformationToCutPlan(spec: MatchTransformationSpec,output:{width:number;height:number}) {
  const decision=compileMatchTransformation(spec);
  const diagnostics=[...decision.plan.diagnostics];
  if(spec.mode==="morph") {
    diagnostics.push({code:"match-vt1-adapter-required",severity:"error",message:"For morph use VisualTransformation and provide actual VT1 scenes and topology mappings."});
    return {diagnostics};
  }
  if(diagnostics.some(d=>d.severity==="error"))return {diagnostics};
  const split=Math.floor(spec.durationFrames/2);
  if(split<2||spec.durationFrames-split<2){
    diagnostics.push({code:"match-duration-too-short",severity:"error",message:"Native CutDirector requires at least two frames per shot."});
    return {diagnostics};
  }
  const cameraA=frameCameraSubject(spec.from.rect,output,{padding:.15});
  const cameraB=frameCameraSubject(spec.to.rect,output,{padding:.15});
  const transition:CutTransitionSpec=spec.mode==="match-cut"?{kind:"match-cut",matchSubjectId:spec.semanticId}
    :spec.mode==="foreground-wipe"?{kind:"wipe",durationFrames:Math.max(4,Math.min(12,spec.durationFrames-split)),axis:"left-to-right"}
    :{kind:"dissolve",durationFrames:Math.max(4,Math.min(12,spec.durationFrames-split))};
  const cutSpec:CutPlanSpec={
    id:spec.id, fps:spec.fps, output,
    scenes:[
      {id:spec.from.sceneId,subjects:{[spec.semanticId]:spec.from.rect}},
      {id:spec.to.sceneId,subjects:{[spec.semanticId]:spec.to.rect}},
    ],
    shots:[
      {id:spec.id+"/before",sceneId:spec.from.sceneId,durationFrames:split,subjectIds:[spec.semanticId],camera:{start:cameraA}},
      {id:spec.id+"/after",sceneId:spec.to.sceneId,durationFrames:spec.durationFrames-split,subjectIds:[spec.semanticId],camera:{start:cameraB}},
    ],
    transitions:[transition],
  };
  const native=compileCutPlan(cutSpec);
  return {native: native.ok ? native.plan : undefined, diagnostics:[...diagnostics,...native.diagnostics]};
}

/** In-place native ClipPlacement time-remapping; the caller retains its decoder and separate audio lane. */
export function speedCurveToNativeClip(placement:ClipPlacement, outputFps:{num:number;den:number}, curve:SpeedCurveSpec) {
  const result=compileSpeedCurve(curve);
  const diagnostics=[...result.diagnostics];
  if(placement.durationFrames!==curve.outputFrames)
    diagnostics.push({code:"velocity-duration-mismatch",severity:"error",message:"Speed curve and clip output durations must match."});
  const clip:ClipPlacement={...placement,timing:{...placement.timing,remap:result.remap}};
  for(const d of validateClip(clip,outputFps))diagnostics.push({code:d.code,severity:d.severity,message:d.message});
  return {clip,diagnostics};
}
