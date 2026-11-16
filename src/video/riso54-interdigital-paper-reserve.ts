import type {RisoCharacterPart,RisoCharacterSpec} from "../../registry/video/riso-character";
import {evaluateRisoCharacter} from "../../registry/video/riso-character";
import {riso51ProjectPalmarPath,riso51SourceKeys}
  from "./riso51-view-conditioned-source";

/**
 * RISO54 — the actual unprinted contour, not a false DOM red-over-red layer.
 *
 * RISO53 reordered the nine filled RED distal/support stencils before the
 * filled RED palm. Identical opaque fills on a single drum are a union;
 * painter ordering ALONE cannot create the negative skin-to-paper hollows
 * that a curled gripping hand must show in the printed image.
 *
 * These source-authored moving paper RESERVES carve two anatomical ulnar
 * interdigital saddles into the physical two-color stencil. Each reserve
 * is an original narrow, four-cubic closed SVG part rooted on the existing
 * hand joint, with the same view-conditioned source keys as the real palm.
 * The unprinted paper becomes part of the PRINT MASTER — not an overlay,
 * alpha, blur, brush texture, detached drawn highlight or third ink.
 *
 * Both original opposite/index/thumb digits, all 12 red phalanx shapes,
 * cobalt nail engraving and paper-transfer time remain unchanged. This
 * is a 2D original anatomy study, not calibrated three-dimensional likeness.
 */
export type Riso54Actor="courier"|"paper-artist";
export type Riso54Side="left"|"right";
type Saddle="middle-ring"|"ring-pinky";
const saddles=["middle-ring","ring-pinky"] as const;
export const RISO54_WEB_REFERENCE={
  image:"Kilian van de Water, Tabak risograph hands; Proko finger anatomy",
  medium:"moving original paper-white stencil reserve on BOTH authentic spot masters",
  diagnosis:"solid same-plate RED fill order cannot change positive-ink union",
  count:2,
  topologicalSegments:4,
  display:"interdigital outer-edge notches, NOT holes in the middle of palm",
} as const;

const n=(v:number)=>Number(v.toFixed(3));
const point=(x:number,y:number)=>`${n(x)} ${n(y)}`;
/** Shallow crescent at true exterior metacarpal valleys. Open to paper
 * outside at positive local-y; the negative valley narrows organically at
 * its inner base and has a small off-axis character-specific inflection.
 */
function webContour(cx:number,cy:number,skew:number):string{
  const p=(x:number,y:number)=>point(cx+x+skew*(y<2?(.45-y*.1):0),cy+y);
  return [
    `M${p(-1.45,7.4)}`,
    `C${p(-1.18,5.4)} ${p(-.68,4.0)} ${p(-.82,2.14)}`,
    `C${p(-.77,.75)} ${p(-.3,-.78)} ${p(.1,-.98)}`,
    `C${p(.49,-.91)} ${p(.73,.69)} ${p(.68,2.03)}`,
    `C${p(.63,4.06)} ${p(1.26,5.65)} ${p(1.43,7.4)} Z`,
  ].join(" ");
}
/** Do not apply paper reserves to inactive hands; leave their exact
 * neutral and detail shapes untouched. The anatomy source gets preserved
 * for both actors via separately authored handedness and pressure.
 */
export function riso54WebReserveParts(actor:Riso54Actor):readonly RisoCharacterPart[]{
  const side:Riso54Side=actor==="courier"?"right":"left";
  const handed=side==="right"?1:-1;
  const actorOffset=actor==="courier"?-.19:.21;
  return saddles.map((saddle,i)=>{
    const x=-handed*(i===0?3.2:8.12)+(i===1?actorOffset:0);
    const y=(i===0?18.8:16.15)+(actor==="courier"?-.17:.17);
    // At frame zero the open-hand negative reserve is outside all original
    // hand source ink. It approaches the moving crest ONLY at contact.
    const base=webContour(x,y+12,i===0?.2:-.27);
    const originalContact=webContour(x,y,i===0?.2:-.27);
    const contact=riso51ProjectPalmarPath(originalContact,side,actor,1);
    return {
      id:side+"-glove-web-reserve-"+saddle,
      joint:side+"-hand",
      plate:"red",paint:"solid",knockoutOnly:true,
      d:base,pathKeys:riso51SourceKeys(base,contact,actor),
    };
  });
}
/** Union of authentic positive-ink paths with an anatomically placed
 * paper-white exterior reserve. Critically: append after the filled palm
 * and all existing ink, because RisoCharacterInk uses named knockoutOnly
 * paths to mask preceding deposited spot inks on BOTH physical masters.
 */
export function riso54ApplyWebReserves(
  source:readonly RisoCharacterPart[],actor:Riso54Actor,
):readonly RisoCharacterPart[]{
  const additions=riso54WebReserveParts(actor);
  if(additions.some(p=>source.some(a=>a.id===p.id)))
    throw new Error("RISO54 duplicate real print source web");
  const hand=actor==="courier"?"right":"left";
  const palm=source.findIndex(p=>p.id===hand+"-glove");
  const index=source.findIndex(p=>p.id===hand+"-glove-index");
  const thumb=source.findIndex(p=>p.id===hand+"-glove-thumb");
  if(palm<0||index<0||thumb<0)
    throw new Error("RISO54 original living gripping palm missing");
  return [...source,...additions];
}

export function inspectRiso54WebReserves(
  actor:RisoCharacterSpec,frame:number,
){
  const expected=riso54WebReserveParts(actor.id as Riso54Actor);
  const pose=evaluateRisoCharacter(actor,frame);
  const source=new Map(actor.parts.map(p=>[p.id,p]));
  const live=new Map(pose.parts.map(p=>[p.id,p]));
  return {
    actor:actor.id,frame,sourceCount:expected.length,
    reserves:expected.map(item=>{
      const original=source.get(item.id),part=live.get(item.id);
      if(!original||!part||!original.knockoutOnly||
        original.plate!=="red"||original.paint!=="solid"||
        original.joint!==item.joint||original.d!==item.d||
        !original.pathKeys||part.opacity!==1)
        throw new Error("RISO54 missing true negative-source stencil "+item.id);
      const palmIndex=actor.parts.findIndex(p=>p.id===item.joint.replace("-hand","-glove"));
      const cutIndex=actor.parts.findIndex(p=>p.id===item.id);
      if(cutIndex<=palmIndex)
        throw new Error("RISO54 negative source must cut ink after positive print");
      return {
        id:item.id,d:part.d,transform:part.transform,
        paperReserve:part.knockoutOnly,
        curveCount:(part.d.match(/[Cc]/g)??[]).length,
        sourceKeys:original.pathKeys.length,
      };
    }),
  };
}
