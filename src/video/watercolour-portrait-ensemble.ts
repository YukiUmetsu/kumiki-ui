import type { WatercolourArtKey,WatercolourArtPart,WatercolourArtwork }
  from "../../registry/video/watercolour-illustration";
import {
  watercolorPortraitFigure,watercolorPortraitSpec,
} from "./watercolour-portrait-demo";
import type { PortraitOutput,PortraitSubject } from "./watercolour-portrait-demo";

/** WC14: two or three independent painted sitters share a single paper and film frame.
 * Authoring is serializable; no duplicated SVG IDs, CSS transforms or wall clocks.
 */
export interface WatercolourPortraitCastMember {
  id:string;
  sitter:PortraitSubject;
  x:number;
  y:number;
  scale:number;
  /** Delays reveal, blink, head motion and individual painting events. */
  delayFrames:number;
}
export const DEFAULT_PORTRAIT_CAST={
  landscape:[
    {id:"left",sitter:"sitter-a",x:29,y:-24,scale:.71,delayFrames:0},
    {id:"right",sitter:"sitter-b",x:520,y:-18,scale:.71,delayFrames:46},
  ],
  portrait:[
    {id:"top",sitter:"sitter-a",x:78,y:3,scale:.62,delayFrames:0},
    {id:"bottom",sitter:"sitter-b",x:78,y:477,scale:.62,delayFrames:46},
  ],
} as const satisfies Record<PortraitOutput,readonly WatercolourPortraitCastMember[]>;

const validNumber=(v:unknown,min:number,max:number):v is number=>
  typeof v==="number" && Number.isFinite(v) && v>=min && v<=max;
const sitterValid=(v:unknown):v is PortraitSubject=>v==="sitter-a"||v==="sitter-b";

/** Tight validation matters: these values may come from FilmStage JSON. */
export function inspectPortraitCast(value:unknown):string[] {
  if(!Array.isArray(value)||value.length<1||value.length>3)return ["/cast"];
  const issues:string[]=[];
  const names=new Set<string>();
  value.forEach((member:unknown,i)=>{
    const root="/cast/"+i;
    if(member===null||typeof member!=="object"||Array.isArray(member)){
      issues.push(root);return;
    }
    const person=member as Record<string,unknown>;
    if(typeof person.id!=="string"||!(/^[a-z][a-z0-9-]{0,7}$/).test(person.id)||
      names.has(person.id))issues.push(root+"/id");
    else names.add(person.id);
    if(!sitterValid(person.sitter))issues.push(root+"/sitter");
    if(!validNumber(person.x,-500,1600))issues.push(root+"/x");
    if(!validNumber(person.y,-500,1600))issues.push(root+"/y");
    if(!validNumber(person.scale,.25,1.5))issues.push(root+"/scale");
    if(!Number.isSafeInteger(person.delayFrames)||!validNumber(person.delayFrames,0,120))
      issues.push(root+"/delayFrames");
    if(Object.keys(person).some(k=>!["id","sitter","x","y","scale","delayFrames"].includes(k)))
      issues.push(root+"/extra");
  });
  return issues;
}

/** Every copy needs a unique SVG ID so iris clip paths and pigment gradients
 * never cross between actors. Absolute frame keys stay independent per sitter.
 */
function namespacePart(part:WatercolourArtPart,prefix:string,delay:number):WatercolourArtPart {
  const keys=part.keys?.map((k:WatercolourArtKey)=>({...k,frame:k.frame+delay}));
  const startFrame=part.startFrame!==undefined?part.startFrame+delay:undefined;
  if(part.kind==="group"){
    return {...part,id:prefix+part.id,
      ...(keys?{keys}:{}),
      ...(startFrame!==undefined?{startFrame}:{}),
      children:part.children.map(c=>namespacePart(c,prefix,delay))};
  }
  return {...part,id:prefix+part.id,
    ...(keys?{keys}:{}),
    ...(startFrame!==undefined?{startFrame}:{})};
}
const painted=(id:string,path:string,fill:string,opacity:number,startFrame:number):WatercolourArtPart=>({
  id,kind:"path",path,fill,opacity,technique:"wash",composite:"multiply",
  wash:{highlight:"#E9E3D6",shadow:fill,edgeSoftness:.89,gradient:"radial"},
  startFrame,fadeFrames:90,
});

/** Construct a complete composited painting, not a split view of two DOM stages.
 * The stage shares wet-paper fiber space, while each actor has its own timed marks.
 * Callers can pass 1–3 original actors in any position or scale.
 */
export function watercolorPortraitEnsembleSpec(
  output:PortraitOutput,seed=83,
  cast:readonly WatercolourPortraitCastMember[]=DEFAULT_PORTRAIT_CAST[output],
):WatercolourArtwork {
  if(output!=="portrait"&&output!=="landscape")throw new RangeError("Invalid watercolor output.");
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647)
    throw new RangeError("Invalid watercolor seed.");
  const problems=inspectPortraitCast(cast);
  if(problems.length)throw new RangeError("Invalid watercolor cast: "+problems.join(", "));
  const base=watercolorPortraitSpec(output,seed,"sitter-a");
  const landscape=output==="landscape";
  const atmosphere:WatercolourArtPart[]=[
    painted("ensemble-cool-reserve",
      landscape?"M12 70 Q148 8 280 104 Q356 221 257 311 Q114 319 12 70 Z":
        "M9 48 Q146 -8 375 131 Q447 247 240 328 Q90 294 9 48 Z",
      "#9BADAF",.12,0),
    painted("ensemble-warm-reflection",
      landscape?"M668 42 Q887 10 947 151 Q943 302 749 316 Q598 231 668 42 Z":
        "M83 544 Q267 473 427 589 Q488 749 288 841 Q107 753 83 544 Z",
      "#D4A98B",.12,44),
  ];
  const members=cast.map((c,i):WatercolourArtPart=>{
    const prefix=String.fromCharCode(97+i)+"-";
    const sit=namespacePart(watercolorPortraitFigure(c.sitter),prefix,c.delayFrames);
    return {
      id:"ensemble-"+c.id,kind:"group",children:[sit],
      pivot:{x:0,y:0},
      keys:[{frame:0,x:c.x,y:c.y,rotation:0,scale:c.scale,opacity:1}],
    };
  });
  return {...base,parts:[...atmosphere,...members]};
}
