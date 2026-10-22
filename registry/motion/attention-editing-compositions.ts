/**
 * Compositions that connect attention-edit treatments to existing Kumiki
 * timelines and validators. No private playback clock or media decoder.
 */
import { compileShortHook } from "../visual/short-hook-director";
import type { ShortHookSpec, ShortHookCompilation, HookOutput } from "../visual/short-hook-director";
import type { PrincipledProduction } from "../visual/explainer-principles";
import type { FrameRate, RecipeDiagnostic, RecipePlan, Beat } from "./attention-editing-recipes";

const diagnostic = (code: string, message: string, severity: "error" | "warning" = "error"): RecipeDiagnostic => ({ code, severity, message });
const finite = (value: number): boolean => Number.isFinite(value);
const intFrame = (f: number) => Number.isSafeInteger(f) && f >= 0;

export type HookVariantSet = {
  id: string;
  sharedClaimId: string;
  sharedPayoffId: string;
  bodyStartFrame: number;
  variants: ShortHookSpec[];
  commonSubjectIds: string[];
  requiredBodyState?: Record<string, number>;
};
export function composeHookVariants(spec: HookVariantSet, options: { production?: PrincipledProduction; outputs?: readonly HookOutput[] } = {}) {
  const diagnostics: RecipeDiagnostic[] = [];
  if (spec.variants.length < 2) diagnostics.push(diagnostic("variants-too-few", "At least two different openings are required for a comparison."));
  if (spec.variants.length > 5) diagnostics.push(diagnostic("variants-too-many", "Compare at most five openings per experiment."));
  if (new Set(spec.variants.map(v => v.id)).size !== spec.variants.length) diagnostics.push(diagnostic("variants-duplicate-id", "Each variant needs a unique ID."));
  const compiled: ShortHookCompilation[] = [];
  for (const variant of spec.variants) {
    if (variant.claimId !== spec.sharedClaimId || variant.payoffId !== spec.sharedPayoffId)
      diagnostics.push(diagnostic("variant-claim-drift", "Variant " + variant.id + " changes the claim or payoff."));
    if (variant.durationFrames !== spec.bodyStartFrame)
      diagnostics.push(diagnostic("variant-body-timing-drift", "Variant " + variant.id + " does not end at the common body entrance."));
    for (const id of spec.commonSubjectIds)
      if (!variant.subjectIds.includes(id)) diagnostics.push(diagnostic("variant-body-subject-missing", "Variant " + variant.id + " loses shared subject " + id + "."));
    const result = compileShortHook(variant, options);
    compiled.push(result);
    for (const d of result.diagnostics) diagnostics.push(diagnostic(d.code, variant.id + ": " + d.message, d.severity === "error" ? "error" : "warning"));
    for (const [key, value] of Object.entries(spec.requiredBodyState ?? {})) {
      const sample = result.plan.endState[key];
      if (typeof sample !== "number" || Math.abs(sample - value) > 1e-4)
        diagnostics.push(diagnostic("variant-body-state-mismatch", variant.id + " does not match body channel " + key + "."));
    }
  }
  return { id: spec.id, variants: compiled, commonBodyStart: spec.bodyStartFrame, diagnostics };
}

export interface SemanticCut {
  id: string;
  preferredFrame: number;
  minHoldFrames: number;
  requiredAnchorFrame?: number;
  subjectIds: string[];
}
export interface ProtectedInterval { startFrame: number; endFrame: number; reason: "speech" | "caption" | "evidence" | "action" }
export interface AlignedMontageSpec {
  id: string;
  fps: FrameRate;
  durationFrames: number;
  shots: SemanticCut[];
  audioBeatFrames: number[];
  protected: ProtectedInterval[];
  maxShiftFrames: number;
  minFinalHoldFrames: number;
}
/** Semantic and required narration cues outrank optional musical alignment. */
export function alignBeatMontage(spec: AlignedMontageSpec) {
  const diagnostics: RecipeDiagnostic[] = [];
  const shots = spec.shots.map(s => ({ ...s, subjectIds: [...s.subjectIds] }));
  const beats = [...new Set(spec.audioBeatFrames.filter(intFrame))].sort((a,b)=>a-b);
  const protectedIntervals = spec.protected.map(x => ({ ...x }));
  if (!intFrame(spec.durationFrames) || spec.durationFrames < 1 || !intFrame(spec.maxShiftFrames) || !intFrame(spec.minFinalHoldFrames))
    diagnostics.push(diagnostic("montage-config-invalid", "Durations and shift budgets must be non-negative integer frames."));
  if (shots.some(s=>!s.id||!intFrame(s.preferredFrame)||!intFrame(s.minHoldFrames)||s.minHoldFrames===0||!s.subjectIds.length))
    diagnostics.push(diagnostic("montage-shot-invalid", "Every shot needs an ID, subject and valid preferred frame/minimum hold."));
  if (protectedIntervals.some(p=>!intFrame(p.startFrame)||!intFrame(p.endFrame)||p.endFrame<=p.startFrame||p.endFrame>spec.durationFrames))
    diagnostics.push(diagnostic("montage-protected-invalid", "Protected intervals must be valid and inside the film."));
  const cuts: number[] = [];
  const isProtected=(f:number) => protectedIntervals.some(p=>p.startFrame<f&&f<p.endFrame);
  for (let i=0; i<shots.length; i++) {
    const shot=shots[i];
    const min = (cuts[cuts.length-1] ?? 0) + shot.minHoldFrames;
    const remainingMin = shots.slice(i+1).reduce((sum,s)=>sum+s.minHoldFrames, spec.minFinalHoldFrames);
    const max = spec.durationFrames - remainingMin;
    const anchor=shot.requiredAnchorFrame;
    const nearBeats=beats.filter(f=>Math.abs(f-shot.preferredFrame)<=spec.maxShiftFrames);
    const candidates=anchor!==undefined ? [anchor] : [...nearBeats, shot.preferredFrame];
    const valid=candidates.filter(f=>intFrame(f)&&f>=min&&f<=max&&!isProtected(f)).sort((a,b)=>{
      if(anchor===undefined&&beats.includes(a)!==beats.includes(b))return beats.includes(a)?-1:1;
      return Math.abs(a-shot.preferredFrame)-Math.abs(b-shot.preferredFrame)||a-b;
    });
    if(!valid.length) {
      diagnostics.push(diagnostic("beat-sync-unsatisfiable","No cut boundary respects protected intervals, semantic anchors and readable holds for "+shot.id+"."));
      continue;
    }
    const selected=valid[0];
    cuts.push(selected);
    if(anchor===undefined && !beats.includes(selected))
      diagnostics.push(diagnostic("beat-sync-manual-fallback","Preserved the authored cut rather than moving it onto a prohibited beat for "+shot.id+".","warning"));
  }
  return { cutFrames: cuts, shotIds: shots.map(s=>s.id), diagnostics };
}

export interface ExactValueTerm { id: string; label: string; valueMinor: string; unit: string; factRef: string; period?: string }
export interface ExactCascadeSpec { id: string; fps: FrameRate; durationFrames: number; terms: ExactValueTerm[]; claimedTotalMinor?: string; basis: string; unit: string }
const integer = (text:string)=>/^-?\d+$/.test(text);
export function compileExactValueCascade(spec: ExactCascadeSpec) {
  const diagnostics: RecipeDiagnostic[]=[];
  if(!spec.unit || !spec.basis) diagnostics.push(diagnostic("cascade-basis-missing","Unit and period/basis are mandatory."));
  if(!spec.terms.length) diagnostics.push(diagnostic("cascade-terms-empty","A cascade requires at least one term."));
  const prefixes: Array<{id:string;totalMinor:string}>=[];
  let sum=0n;
  for(const term of spec.terms){
    if (!term.id || !term.label || !term.factRef) diagnostics.push(diagnostic("cascade-term-provenance", "Each term needs an ID, label, and source reference."));
    if(term.unit!==spec.unit || (term.period && term.period!==spec.basis))
      diagnostics.push(diagnostic("cascade-unit-mismatch","Each term must use the same unit and period; convert explicitly before compiling."));
    if(!integer(term.valueMinor)){ diagnostics.push(diagnostic("cascade-not-integer", "Use integer minor units to preserve exact arithmetic."));continue; }
    sum+=BigInt(term.valueMinor);
    prefixes.push({id:term.id,totalMinor:sum.toString()});
  }
  if(spec.claimedTotalMinor!==undefined && (!integer(spec.claimedTotalMinor)||BigInt(spec.claimedTotalMinor)!==sum))
    diagnostics.push(diagnostic("cascade-total-mismatch","The supplied total does not match exact contributor arithmetic."));
  if(!intFrame(spec.durationFrames) || spec.durationFrames<spec.terms.length+1)
    diagnostics.push(diagnostic("cascade-duration-invalid","Allow at least one frame per term and one for the payoff."));
  const duration=Math.max(spec.durationFrames,1);
  const beats: Beat[]=spec.terms.map((term,i)=>({id:spec.id+"/"+term.id,startFrame:Math.floor(i*duration/(spec.terms.length+1)),endFrame:Math.floor((i+1)*duration/(spec.terms.length+1)),purpose:"explain" as const,subjectIds:[term.id]}));
  beats.push({id:spec.id+"/total",startFrame:Math.floor(spec.terms.length*duration/(spec.terms.length+1)),endFrame:duration,purpose:"payoff",subjectIds:["total"]});
  const plan: RecipePlan={id:spec.id,fps:spec.fps,durationFrames:spec.durationFrames,beats,metadata:{kind:"exact-value-cascade",unit:spec.unit,basis:spec.basis,totalMinor:sum.toString()},diagnostics};
  return {plan,totalMinor:sum.toString(),prefixes};
}

export interface LoopSubjectState { id: string; x:number; y:number; scale:number; rotation:number; opacity:number }
export interface LoopFrameState { camera:{x:number;y:number;scale:number}; subjects:LoopSubjectState[]; narrativePayoffShown:boolean }
export type LoopGrade = "discontinuous" | "position-candidate" | "motion-candidate";
export interface LoopContinuitySpec { start:LoopFrameState; second:LoopFrameState; penultimate:LoopFrameState; end:LoopFrameState; maxPositionError?:number; maxScaleError?:number; maxVelocityError?:number }
export function inspectLoopContinuity(spec:LoopContinuitySpec):{grade:LoopGrade;diagnostics:RecipeDiagnostic[];maxPositionDelta:number;maxVelocityDelta:number}{
  const diagnostics:RecipeDiagnostic[]=[];
  const start=new Map(spec.start.subjects.map(s=>[s.id,s]));
  const end=new Map(spec.end.subjects.map(s=>[s.id,s]));
  if(!spec.end.narrativePayoffShown) diagnostics.push(diagnostic("loop-payoff-missing","A loop must still visibly resolve its narrative claim."));
  if(start.size!==end.size||[...start.keys()].some(id=>!end.has(id))) diagnostics.push(diagnostic("loop-identity-mismatch","Start/end subject identities differ."));
  const poses=[spec.start.camera,spec.end.camera];
  if(poses.some(p=>![p.x,p.y,p.scale].every(finite))) diagnostics.push(diagnostic("loop-camera-invalid","Camera state must be finite."));
  let maxPositionDelta=Math.hypot(poses[0].x-poses[1].x,poses[0].y-poses[1].y);
  let maxVelocityDelta=0;
  const second=new Map(spec.second.subjects.map(s=>[s.id,s])), penultimate=new Map(spec.penultimate.subjects.map(s=>[s.id,s]));
  for(const [id,a] of start){
    const b=end.get(id); if(!b)continue;
    if(![a.x,a.y,a.scale,a.rotation,a.opacity,b.x,b.y,b.scale,b.rotation,b.opacity].every(finite)) {diagnostics.push(diagnostic("loop-pose-invalid","Subject "+id+" contains nonfinite state."));continue}
    const distance=Math.hypot(a.x-b.x,a.y-b.y);
    maxPositionDelta=Math.max(maxPositionDelta,distance);
    if(Math.abs(a.scale-b.scale)>(spec.maxScaleError??.02)||Math.abs(a.rotation-b.rotation)>.03||Math.abs(a.opacity-b.opacity)>.02)
      diagnostics.push(diagnostic("loop-property-mismatch","Subject "+id+" differs in scale, rotation or opacity at the seam."));
    const s1=second.get(id),s2=penultimate.get(id);
    if(s1&&s2){
      const velocityDiff=Math.hypot((s1.x-a.x)-(b.x-s2.x),(s1.y-a.y)-(b.y-s2.y));
      maxVelocityDelta=Math.max(maxVelocityDelta,velocityDiff);
    }else diagnostics.push(diagnostic("loop-velocity-unmeasured","Missing adjacent subject samples prevent C1 continuity checks.","warning"));
  }
  if(maxPositionDelta>(spec.maxPositionError??.02))diagnostics.push(diagnostic("loop-c0-mismatch","Subject or camera anchors jump at the loop boundary."));
  if(maxVelocityDelta>(spec.maxVelocityError??.02))diagnostics.push(diagnostic("loop-c1-mismatch","Position matches but velocity changes at the loop boundary.","warning"));
  const fatal=diagnostics.some(d=>d.severity==="error");
  return {grade:fatal?"discontinuous":maxVelocityDelta<=(spec.maxVelocityError??.02)?"motion-candidate":"position-candidate",diagnostics,maxPositionDelta,maxVelocityDelta};
}

export interface CaptionImpactSpec { startFrame:number;endFrame:number;entryFrames:number;style:"snap"|"overshoot"|"wipe"|"word-highlight";peakScale?:number }
export function evaluateCaptionImpact(spec:CaptionImpactSpec,frame:number,reducedMotion=false){
  if(!intFrame(spec.startFrame)||!intFrame(spec.endFrame)||spec.endFrame<=spec.startFrame||!intFrame(spec.entryFrames))
    throw new Error("Caption timing must be valid absolute frames.");
  const visible=frame>=spec.startFrame&&frame<spec.endFrame;
  const t=Math.max(0,Math.min(1,(frame-spec.startFrame)/Math.max(1,spec.entryFrames)));
  const peak=Math.max(1,Math.min(spec.peakScale??1.12,1.25));
  const curve=spec.style==="overshoot" ? 1+ (peak-1)*Math.sin(Math.PI*t) : 1;
  return {visible,opacity:visible?1:0,scale:reducedMotion?1:curve,
    reveal:reducedMotion?1:t,emphasized:visible&&frame>=spec.startFrame+spec.entryFrames,
    // Layout engine must reserve peakScale footprint before animation.
    reserveScale:peak};
}

export interface SpeedCurveKey {at:number;speed:number}
export interface SpeedCurveSpec {
  id:string; outputFrames:number; sourceIn:number; sourceOut:number;
  keys:SpeedCurveKey[]; freezeAt?:{outputFrame:number;durationFrames:number;sourceFrame:number};
}
/** Integrate positive playback speed into a monotone frame remap for FrameAccurateClip. */
export function compileSpeedCurve(spec:SpeedCurveSpec) {
  const diagnostics:RecipeDiagnostic[]=[];
  if(!intFrame(spec.outputFrames)||spec.outputFrames<2||!intFrame(spec.sourceIn)||!intFrame(spec.sourceOut)||spec.sourceOut<=spec.sourceIn)
    diagnostics.push(diagnostic("velocity-range-invalid","Valid output duration and ascending source bounds are required."));
  const keys=[...spec.keys].sort((a,b)=>a.at-b.at);
  if(keys.length<2||keys[0]?.at!==0||keys[keys.length-1]?.at!==1||keys.some((k,i)=>!finite(k.at)||!finite(k.speed)||k.speed<=0||k.at<0||k.at>1||(i>0&&k.at===keys[i-1].at)))
    diagnostics.push(diagnostic("velocity-curve-invalid","Speed curve requires positive speeds and ordered normalized endpoints 0 and 1."));
  const speedAt=(u:number)=>{
    for(let i=0;i<keys.length-1;i++)if(u<=keys[i+1].at){
      const a=keys[i],b=keys[i+1],t=(u-a.at)/(b.at-a.at);
      return a.speed+(b.speed-a.speed)*t;
    }
    return keys[keys.length-1]?.speed??1;
  };
  const distances:number[]=[0];
  for(let i=1;i<spec.outputFrames;i++){
    const a=(i-1)/(spec.outputFrames-1),b=i/(spec.outputFrames-1);
    const increment=(speedAt(a)+speedAt(b))/2;
    distances.push(distances[distances.length-1]+increment);
  }
  const consumed=distances[distances.length-1]||1;
  const remap=distances.map((d,i)=>({frame:i,sourceFrame:spec.sourceIn+(spec.sourceOut-1-spec.sourceIn)*(d/consumed)}));
  if (spec.freezeAt) {
    const {outputFrame:at,durationFrames:hold,sourceFrame:target}=spec.freezeAt;
    const end=at+hold;
    if(!intFrame(at)||!intFrame(hold)||at<1||hold<1||end>=remap.length-1||
       !finite(target)||target<spec.sourceIn||target>spec.sourceOut-1)
      diagnostics.push(diagnostic("velocity-freeze-invalid","Freeze must fit between opening and closing frames and reference a valid source frame."));
    else {
      const lead=Math.max(1,distances[at]),tail=Math.max(1,consumed-distances[end]);
      for(let i=0;i<remap.length;i++){
        if(i<at)remap[i].sourceFrame=spec.sourceIn+(target-spec.sourceIn)*(distances[i]/lead);
        else if(i<end)remap[i].sourceFrame=target;
        else remap[i].sourceFrame=target+(spec.sourceOut-1-target)*((distances[i]-distances[end])/tail);
      }
    }
  }
  if(remap.some((k,i)=>!finite(k.sourceFrame)||(i>0&&k.sourceFrame<remap[i-1].sourceFrame))) diagnostics.push(diagnostic("velocity-remap-invalid","Source map must stay finite and monotone."));
  return {remap,diagnostics};
}
