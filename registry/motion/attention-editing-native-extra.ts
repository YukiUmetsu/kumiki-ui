/** Explicit native bridges for 3D rigs, sourced evidence, and fair physical comparisons. */
import { createCameraRig3D } from "./camera-rig-3d";
import type { CameraOrbit3D } from "./camera-rig-3d";
import { planComparisonStage } from "../visual/comparison-stage";
import type { ComparisonStageSpec, ComparisonLayoutOptions } from "../visual/comparison-stage";
import type { EvidenceSource, EvidenceStageSpec } from "../visual/evidence-stage";
import type { FrameRate, RecipeDiagnostic } from "./attention-editing-recipes";

const err=(code:string,message:string):RecipeDiagnostic=>({code,severity:"error",message});
/** Real 3D orbit+dolly movement, not a 2D scale impersonating depth. */
export function compileNativeCameraDive3D(input:{
 id:string; fps:FrameRate; durationFrames:number;
 start:CameraOrbit3D; end:CameraOrbit3D; arrivalHoldFrames:number;
}){
 const diagnostics:RecipeDiagnostic[]=[];
 if(!Number.isSafeInteger(input.durationFrames)||!Number.isSafeInteger(input.arrivalHoldFrames)||
    input.durationFrames<4||input.arrivalHoldFrames<1||input.arrivalHoldFrames>=input.durationFrames-1)
   diagnostics.push(err("dive-3d-timing","3D camera travel and hold must fit into positive integer frames."));
 if(diagnostics.some(d=>d.severity==="error"))return {diagnostics};
 const arrival=input.durationFrames-input.arrivalHoldFrames-1;
 try {
  const timeline=createCameraRig3D({id:input.id+"/camera3d",fps:input.fps,durationFrames:input.durationFrames,
   keyframes:[{frame:0,...input.start},{frame:arrival,...input.end,easing:"ease-in-out-cubic"},
     {frame:input.durationFrames-1,...input.end}]});
  return {timeline,diagnostics};
 }catch(e){diagnostics.push(err("dive-3d-rig-invalid",String(e)));return {diagnostics}}
}
/** Reuse EvidenceStage's exact anchor, provenance and rights checks. */
export function composeNativeEvidenceSpotlight(input:{
 id:string;fps:FrameRate;source:EvidenceSource;anchorId:string;
 establishFrames:number;focusFrames:number;concludeFrames:number;
 claimText:string; citationMarker?:string;
}):{spec?:EvidenceStageSpec;diagnostics:RecipeDiagnostic[]}{
 const diagnostics:RecipeDiagnostic[]=[];
 if(!input.anchorId||!input.source.anchors.some(a=>a.id===input.anchorId))
  diagnostics.push(err("spotlight-anchor-missing","The highlighted anchor must exist in the source."));
 if(!input.claimText||[input.establishFrames,input.focusFrames,input.concludeFrames].some(n=>!Number.isSafeInteger(n)||n<12))
  diagnostics.push(err("spotlight-readable-hold","Use author-supplied claim text and at least 12 frames per establish/focus/payoff beat."));
 if(diagnostics.length)return {diagnostics};
 const marker=input.citationMarker??"[1]";
 const source=input.source;
 const text=input.claimText.includes(marker)?input.claimText:input.claimText+" "+marker;
 const spec:EvidenceStageSpec={id:input.id,fps:input.fps,sources:[source],beats:[
  {id:input.id+"/establish",kind:"establish",sourceId:source.id,durationFrames:input.establishFrames},
  {id:input.id+"/focus",kind:"focus",sourceId:source.id,anchorIds:[input.anchorId],durationFrames:input.focusFrames},
  {id:input.id+"/conclude",kind:"conclude",durationFrames:input.concludeFrames}],
  conclusion:{text,citations:[{marker,sourceId:source.id,anchorId:input.anchorId}]}};
 return {spec,diagnostics};
}
/** Shared physical scale, separately laid out for each output; quantities use meters. */
export function composeNativeSplitComparison(input:{spec:ComparisonStageSpec;output:{width:number;height:number};options?:Partial<ComparisonLayoutOptions>}){
 const orientation=input.output.height>=input.output.width?"column":"row";
 const spec:ComparisonStageSpec={...input.spec,layout:input.spec.layout??orientation};
 const options:ComparisonLayoutOptions={width:input.output.width,height:input.output.height,...input.options};
 const result=planComparisonStage(spec,options);
 return {spec,layout:result,diagnostics:result.diagnostics};
}
