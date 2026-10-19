/** XP1: fast, deterministic explainer preflight over declared semantic data.
 * No DOM, WebGL, screenshots, LLMs, OCR, or full-timeline rendering.
 * Geometry is the author's measured/layout-projected truth. We do not pretend
 * to detect things an author did not declare (including glyph ink overlap).
 */
import type { Rect } from "../motion/types";
import type {
  SemanticDirectionScene,SemanticElement,SemanticFrameSample,CameraPurpose,
} from "../motion/semantic-direction";

export type PreflightSeverity="error"|"warning";
export interface PreflightDiagnostic {
  severity:PreflightSeverity;
  code:string;
  message:string;
  sceneId:string;
  frame?:number;
  elements?:string[];
}
export interface PreflightOptions {
  /** Increase for graphic styles that need more breathing room (design px). */
  minLabelGap?:number;
  /** Treat two overlapping distinct semantic labels as a hard failure. */
  collisionSeverity?:PreflightSeverity;
  /** Warn on identical visible label contents. No fuzzy/LLM comparisons. */
  detectDuplicateText?:boolean;
  /** Visual attention budget, not a hard aesthetic limit. Set to Infinity to disable. */
  maxConcurrentLabels?:number;
  /** Client code supplies geometry only at meaningful frames/keyframes. */
  samples?:readonly SemanticFrameSample[];
}
export interface PreflightResult {
  ok:boolean;
  diagnostics:PreflightDiagnostic[];
  inspectedFrames:number;
}
const validRect=(r:Rect)=>!!r&&[r.x,r.y,r.width,r.height].every(Number.isFinite)&&r.width>0&&r.height>0;
const range=(r:{startFrame:number;endFrame:number}|undefined,end:number)=>
  !!r&&Number.isSafeInteger(r.startFrame)&&Number.isSafeInteger(r.endFrame)
  &&r.startFrame>=0&&r.endFrame>r.startFrame&&r.endFrame<=end;
const visible=(e:SemanticElement,frame:number)=>!e.visible||(frame>=e.visible.startFrame&&frame<e.visible.endFrame);
const overlap=(a:Rect,b:Rect,gap:number)=>
  a.x<b.x+b.width+gap&&a.x+a.width+gap>b.x&&
  a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y;
const boxInside=(r:Rect,w:number,h:number)=>r.x>=0&&r.y>=0&&r.x+r.width<=w&&r.y+r.height<=h;
function localBounds(e:SemanticElement,s:SemanticFrameSample):Rect {
  return s.bounds?.[e.id]??e.bounds;
}
function compareCamera(intent:CameraPurpose,
  samples:readonly SemanticFrameSample[],emit:(d:Omit<PreflightDiagnostic,"sceneId">)=>void) {
  const inRange=samples.filter(s=>s.frame>=intent.range.startFrame&&s.frame<intent.range.endFrame);
  if(intent.kind==="hold") {
    let baseline:readonly number[]|undefined;
    for(const sample of inRange) {
      if(!sample.cameraPose)continue;
      if(!baseline){baseline=sample.cameraPose;continue;}
      if(baseline.length!==sample.cameraPose.length||
        baseline.some((v,i)=>Math.abs(v-sample.cameraPose![i])>1e-4)) {
        emit({severity:"warning",code:"camera-hold-drift",
          message:`Camera intent "${intent.id}" is a hold but the sampled pose changes.`,frame:sample.frame});
        break;
      }
    }
  }
  if(intent.kind==="focus"&&intent.screenTarget) {
    let previous=Infinity;
    for(const sample of inRange) {
      const p=sample.cameraFocus?.[intent.targetId];
      if(!p)continue;
      const d=Math.hypot(p.x-intent.screenTarget.x,p.y-intent.screenTarget.y);
      if(previous!==Infinity&&d>previous+1.5) {
        emit({severity:"warning",code:"camera-reverses-focus",
          message:`Camera focus "${intent.id}" moves its target away from the intended screen position.`,
          frame:sample.frame,elements:[intent.targetId]});
        break;
      }
      previous=d;
    }
  }
}
export function validateExplainerComposition(
  scene:SemanticDirectionScene,options:PreflightOptions={},
):PreflightResult {
  const diagnostics:PreflightDiagnostic[]=[];
  const emit=(d:Omit<PreflightDiagnostic,"sceneId">)=>{ diagnostics.push({...d,sceneId:scene.id}); };
  const validDuration=Number.isSafeInteger(scene.durationFrames)&&scene.durationFrames>0;
  if(!scene.id?.trim()||!validDuration||!Number.isFinite(scene.width)||
    !Number.isFinite(scene.height)||scene.width<=0||scene.height<=0) {
    emit({severity:"error",code:"scene-invalid",
      message:"Provide an ID, positive dimensions, and a positive integer frame count."});
    return {ok:false,diagnostics,inspectedFrames:0};
  }
  const byId=new Map<string,SemanticElement>();
  for(const e of scene.elements) {
    if(!e.id?.trim()||!e.semanticId?.trim()||byId.has(e.id)) {
      emit({severity:"error",code:"element-identity",
        message:`Element "${e.id}" has a missing or duplicate stable identity.`,elements:[e.id]});
    } else byId.set(e.id,e);
    if(!validRect(e.bounds))emit({severity:"error",code:"element-bounds",
      message:`Element "${e.id}" must have finite, positive bounds.`,elements:[e.id]});
    if(e.visible&&!range(e.visible,scene.durationFrames))
      emit({severity:"error",code:"element-window",
        message:`Element "${e.id}" has an invalid visibility interval.`,elements:[e.id]});
  }
  if(!scene.beats.length)emit({severity:"error",code:"no-learning-beats",
    message:"At least one beat must state what the viewer should learn."});
  for(const beat of scene.beats) {
    if(!beat.id?.trim()||!beat.claim?.trim()||!beat.visualChange?.trim()||
      !range(beat.range,scene.durationFrames)||!byId.has(beat.focusId)) {
      emit({severity:"error",code:"beat-invalid",
        message:`Beat "${beat.id}" needs a valid interval, one claim, an observable change and a registered focus.`,
        elements:[beat.focusId]});
    }
  }
  const transferIds=new Set<string>();
  for(const tr of scene.transfers??[]) {
    if(!tr.id?.trim()||transferIds.has(tr.id))emit({severity:"error",code:"transfer-identity",
      message:`Transfer "${tr.id}" has an empty or duplicate ID.`});
    transferIds.add(tr.id);
    if(!tr.semanticId?.trim()||!range(tr.range,scene.durationFrames)||
      !byId.has(tr.fromId)||!byId.has(tr.toId)||
      (tr.fromId===tr.toId&&tr.intent!=="highlight")||
      tr.fadeFrames!==undefined&&(!Number.isSafeInteger(tr.fadeFrames)||tr.fadeFrames<0||
        tr.fadeFrames>tr.range.endFrame-tr.range.startFrame)) {
      emit({severity:"error",code:"transfer-invalid",
        message:`Transfer "${tr.id}" must move a named payload between registered subjects in a positive frame window.`,
        elements:[tr.fromId,tr.toId]});
    }
    if(byId.get(tr.fromId)?.role==="decoration"||byId.get(tr.toId)?.role==="decoration")
      emit({severity:"warning",code:"decorative-transfer",
        message:`Transfer "${tr.id}" uses a decorative element as an endpoint. Confirm it communicates real data.`});
  }
  for(const cam of scene.camera??[]) {
    if(!cam.id?.trim()||!cam.reason?.trim()||!range(cam.range,scene.durationFrames)||
       !byId.has(cam.targetId))emit({severity:"error",code:"camera-intent-invalid",
      message:`Camera operation "${cam.id}" needs a purpose, valid interval, and semantic target.`});
  }
  const samples=[...(options.samples??[])].sort((a,b)=>a.frame-b.frame);
  const inspected=new Set<number>();
  const gap=options.minLabelGap??8;
  const maxLabels=options.maxConcurrentLabels??4;
  if(!(maxLabels===Infinity||(Number.isSafeInteger(maxLabels)&&maxLabels>=1)))
    emit({severity:"error",code:"preflight-options",
      message:"maxConcurrentLabels must be positive or Infinity."});
  if(!Number.isFinite(gap)||gap<0)emit({severity:"error",code:"preflight-options",
    message:"minLabelGap must be finite and nonnegative."});
  for(const sample of samples) {
    if(!Number.isSafeInteger(sample.frame)||sample.frame<0||sample.frame>=scene.durationFrames){
      emit({severity:"error",code:"sample-frame-invalid",
        message:`Invalid sample frame: ${sample.frame}`});continue;
    }
    if(inspected.has(sample.frame))continue;
    inspected.add(sample.frame);
    const active=scene.elements.filter(e=>visible(e,sample.frame));
    const labels=active.filter(e=>e.role==="label");
    if(labels.length>maxLabels)emit({severity:"warning",code:"scene-cognitive-load",
      message:`${labels.length} simultaneous labels exceed the authored attention budget of ${maxLabels}.`,
      frame:sample.frame,elements:labels.map(e=>e.id)});

    const canCompare=(a:SemanticElement,b:SemanticElement)=>
      a.semanticId!==b.semanticId&&validRect(localBounds(a,sample))&&validRect(localBounds(b,sample));
    for(const e of labels) {
      const rect=localBounds(e,sample);
      if(!validRect(rect)||!boxInside(rect,scene.width,scene.height))
        emit({severity:options.collisionSeverity??"error",code:"label-clipped",
          message:`Label "${e.id}" is outside the authored viewport or has invalid measured bounds.`,
          frame:sample.frame,elements:[e.id]});
    }
    for(let i=0;i<labels.length;i++) {
      const a=labels[i];
      for(const b of active) {
        if(a.id===b.id||b.role==="decoration"||b.role==="label"&&labels.indexOf(b)<=i)continue;
        if(!canCompare(a,b))continue;
        const ar=localBounds(a,sample),br=localBounds(b,sample);
        if(overlap(ar,br,gap))emit({severity:options.collisionSeverity??"error",
          code:b.role==="label"?"label-overlap":"label-obscures-subject",
          message:`Label "${a.id}" collides with ${b.role} "${b.id}" at frame ${sample.frame}.`,
          frame:sample.frame,elements:[a.id,b.id]});
      }
    }
    if(options.detectDuplicateText!==false){
      const texts=new Map<string,SemanticElement>();
      for(const label of labels) {
        const str=label.text?.trim().replace(/\s+/g," ").toLocaleLowerCase();
        if(!str)continue;
        const prev=texts.get(str);
        if(prev&&prev.semanticId!==label.semanticId)
          emit({severity:"warning",code:"duplicate-label",
            message:`The same text is visible on labels "${prev.id}" and "${label.id}".`,
            frame:sample.frame,elements:[prev.id,label.id]});
        else texts.set(str,label);
      }
    }
  }
  for(const cam of scene.camera??[])
    if(range(cam.range,scene.durationFrames))compareCamera(cam,samples,emit);
  return {ok:!diagnostics.some(x=>x.severity==="error"),diagnostics,inspectedFrames:inspected.size};
}
