import {evaluateRisoCharacter} from "../../registry/video/riso-character";
import type {RisoCharacterSpec} from "../../registry/video/riso-character";
import {RISO42_SUPPORT_CURL} from "./riso31-finger-phalanges";

/** RISO42 / ArtCraft: actual moving 2D anatomical support-finger angles.
 * The index and thumb are the precision pinch. Remaining three digits
 * deliberately flex along independent PIP/DIP source bones instead of
 * pointing as parallel red tines, and retain independent blue nail details.
 */
export const RISO42_SUPPORT_DIGITS=["middle","ring","pinky"] as const;
const relative=(child:number,parent:number)=>((child-parent+540)%360)-180;
export function inspectRiso42SupportingDigits(
  spec:RisoCharacterSpec,frame:number,side:"left"|"right",
){
  const pose=evaluateRisoCharacter(spec,frame);
  const joints=new Map(pose.joints.map(j=>[j.id,j]));
  const parts=new Map(pose.parts.map(p=>[p.id,p]));
  const get=(id:string)=>{
    const joint=joints.get(id);
    if(!joint)throw new Error("RISO42 missing live source joint "+id);
    return joint;
  };
  const digits=RISO42_SUPPORT_DIGITS.map(digit=>{
    const root=side+"-"+digit,pip=root+"-pip",dip=root+"-dip";
    const parent=get(root),pipJoint=get(pip),dipJoint=get(dip);
    const sourceIds=[side+"-glove-"+digit,
      side+"-glove-"+digit+"-middle-phalanx",
      side+"-glove-"+digit+"-distal-phalanx"] as const;
    const red=sourceIds.map(id=>{
      const part=parts.get(id);
      if(!part||part.plate!=="red"||part.paint!=="solid"||
        !part.transform.startsWith("matrix("))
        throw new Error("RISO42 source-red supporting phalanx missing "+id);
      return part;
    });
    return {digit,root,pip,dip,
      pipAngle:relative(pipJoint.angle,parent.angle),
      dipAngle:relative(dipJoint.angle,pipJoint.angle),
      sourceRedInkCount:red.length,
      animatedTransformsUnique:new Set(red.map(p=>p.transform)).size===3,
      referenceProjection:RISO42_SUPPORT_CURL[digit],
    };
  });
  return {actor:spec.id,frame,side,digits,
    meanSupportFlex:digits.reduce((s,d)=>s+Math.abs(d.pipAngle),0)/digits.length,
    movingRedSourceCount:digits.reduce((s,d)=>s+d.sourceRedInkCount,0),
    cue:"three truly articulated support fingers, distinct from opposed index/thumb" as const};
}
