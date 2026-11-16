import type {RisoCharacterSpec} from "../../registry/video/riso-character";
import {riso51SourceKeys} from "./riso51-view-conditioned-source";
import {riso54WebContour} from "./riso54-interdigital-paper-reserve";
import {riso57PalmContourFromKnots} from "./riso57-palm-contact-silhouette";
import type {Riso57SurfaceLandmark} from "./riso57-palm-contact-silhouette";
import {riso58ContactSkin,riso58ProjectSkinPoint,riso58ProjectMcpInk}
  from "./riso58-anat1-volume-skin";
import type {Riso58Actor,Riso58Side,Riso58Digit,Riso58ContactSource,
  Riso58Bone} from "./riso58-anat1-volume-skin";

/**
 * RISO59 — reversible, *experimental* positive-source hand reconstruction.
 *
 * RISO58's palm surface ended at four MCP peaks, while its independently
 * moving PIP/DIP ink continued outside as hanging, disconnected-looking
 * sausages. Construct ONE continuous red skin silhouette with the *same*
 * existing 16 C1 controls. Three differently curled ulnar support crests
 * advance toward their TRUE animated ANAT1 3D PIP roots. The two white
 * interdigital source reserves and four cobalt MCP planes follow exactly
 * those newly sculpted red stations, instead of floating at RISO58's old
 * contour. The original 12 distinct red bones, all cobalt nail engravings,
 * every existing detail stroke, occlusion order, and two real ink masters
 * remain, byte for byte, outside these four original print paths.
 *
 * This is a review-only candidate, not a photo-calibrated skin mesh and
 * not an approved anatomy replacement. Do NOT silently replace COURIER
 * or PAPER_ARTIST until native two-aspect, 1x/6x source QA approves it.
 */
export const RISO59_HAND_ENVELOPE={
  stage:"experimental-physical-source-preview",
  source:"actual RISO58 ANAT1 four 3D bone chains, moving 3/4 side pinch",
  document:"docs/research/riso59-threequarter-envelope-artcraft.md",
  sourceCubicCount:16,
  protectedRedPhalanges:12,
  originalInkPlates:["red","blue"] as const,
  contactFrame:160,
  previewOnly:true,
  maximumCrestMove:3.6,
  crestWeight:{middle:.78,ring:.67,pinky:.55},
} as const;

type SupportDigit=Exclude<Riso58Digit,"index">;
export interface Riso59CrestShift {
  readonly digit:SupportDigit;
  readonly dx:number;
  readonly dy:number;
  readonly distance:number;
  readonly clinicalDepth:number;
}
export interface Riso59Preview {
  readonly spec:RisoCharacterSpec;
  readonly actor:Riso58Actor;
  readonly side:Riso58Side;
  readonly contactContour:string;
  readonly crestShifts:readonly Riso59CrestShift[];
  readonly changedPartIds:readonly string[];
}
const round=(n:number)=>Number(n.toFixed(4));
const support=["middle","ring","pinky"] as const;
const crestNames={
  middle:"middle-mcp",ring:"ring-mcp",pinky:"fifth-mcp",
} as const satisfies Record<SupportDigit,Riso57SurfaceLandmark>;

function crestDisplacement(
  skin:Riso58ContactSource,bone:Riso58Bone,digit:SupportDigit,
):Riso59CrestShift{
  const crest=skin.anchors.find(k=>k.landmark===crestNames[digit]);
  if(!crest)throw new Error("RISO59 missing ANAT1 positive crest: "+digit);
  // The PIP is reconstructed in true 3D clinical space, *not* inferred
  // from whichever dot happens to appear on a printed screenshot.
  const [px,py]=riso58ProjectSkinPoint(bone.pip,skin.side);
  const dx=px-crest.x,dy=py-crest.y;
  const length=Math.hypot(dx,dy);
  if(!Number.isFinite(length))throw new RangeError("RISO59 nonfinite source depth");
  // A bounded correction rather than a global scale: distinct ring/little
  // finger projected depths remain authored by their own moving joints.
  const move=Math.min(RISO59_HAND_ENVELOPE.maximumCrestMove,
    length*RISO59_HAND_ENVELOPE.crestWeight[digit]);
  return {digit,dx:round(length?dx/length*move:0),
    dy:round(length?dy/length*move:0),distance:round(move),
    clinicalDepth:round(bone.depthProximal)};
}

/** Pure original-vector preview. No DOM/raster/SVG opacity change.
 * New RED silhouette retains RISO58's true moving 3D source knots,
 * index/thumb opposition and active-actor boundaries.
 */
export function riso59PreviewContact(
  spec:RisoCharacterSpec,actor:Riso58Actor,
):Riso59Preview{
  if(spec.id!==actor)throw new RangeError("RISO59 wrong original actor");
  const side:Riso58Side=actor==="courier"?"right":"left";
  const skin=riso58ContactSkin(spec,actor,side,RISO59_HAND_ENVELOPE.contactFrame);
  const bone=new Map(skin.bones.map(b=>[b.digit,b]));
  const shifts=support.map(digit=>{
    const source=bone.get(digit);
    if(!source)throw new Error("RISO59 missing living "+digit+" clinical bone");
    return crestDisplacement(skin,source,digit);
  });
  const original=new Map(skin.anchors.map(k=>[k.landmark,k]));
  const next=skin.anchors.map(k=>{
    const crest=shifts.find(s=>crestNames[s.digit]===k.landmark);
    if(crest)return {...k,x:round(k.x+crest.dx),y:round(k.y+crest.dy)};
    const web={
      "middle-ring-web":["middle","ring"],
      "ring-little-web":["ring","pinky"],
    } as const;
    const pair=k.landmark==="middle-ring-web"||k.landmark==="ring-little-web"?
      web[k.landmark]:null;
    if(pair){
      const a=shifts.find(s=>s.digit===pair[0])!;
      const b=shifts.find(s=>s.digit===pair[1])!;
      // The web valley follows both moving crests *less* than their peaks;
      // this preserves open negative, tactile paper gaps rather than
      // joining the three finger masses into a solid red block.
      return {...k,x:round(k.x+(a.dx+b.dx)*.22),
        y:round(k.y+(a.dy+b.dy)*.22)};
    }
    if(k.landmark==="hypothenar-heel"){
      const ulnar=shifts[2];
      return {...k,x:round(k.x+ulnar.dx*.15),
        y:round(k.y+ulnar.dy*.15)};
    }
    return k;
  });
  if(next.length!==16||next.some(k=>!Number.isFinite(k.x)||!Number.isFinite(k.y)))
    throw new RangeError("RISO59 broken original 16-knot ink anatomy");
  const contactContour=riso57PalmContourFromKnots(next);
  const joined:Riso58ContactSource={...skin,anchors:next,path:contactContour};
  const sourceId=side+"-glove";
  const mcpId=sourceId+"-knuckle-arc";
  const negatives:ReadonlyMap<string,{at:Riso57SurfaceLandmark;skew:number}>=new Map([
    [sourceId+"-web-reserve-middle-ring",{at:"middle-ring-web",skew:.2}],
    [sourceId+"-web-reserve-ring-pinky",{at:"ring-little-web",skew:-.27}],
  ] as const);
  const changedPartIds=[sourceId,mcpId,...negatives.keys()];
  for(const id of changedPartIds)
    if(!spec.parts.some(p=>p.id===id))
      throw new Error("RISO59 missing original ink path "+id);
  const parts=spec.parts.map(p=>{
    let contact:string|undefined;
    if(p.id===sourceId){
      if(p.plate!=="red"||p.paint!=="solid")throw new Error("RISO59 positive ink must be red");
      contact=contactContour;
    }else if(p.id===mcpId){
      if(p.plate!=="blue")throw new Error("RISO59 MCP must be original blue plate");
      contact=riso58ProjectMcpInk(p.d,joined);
    }else{
      const mask=negatives.get(p.id);
      if(mask){
        if(!p.knockoutOnly||p.plate!=="red")
          throw new Error("RISO59 cannot substitute stencil overlay");
        const knot=next.find(k=>k.landmark===mask.at);
        if(!knot)throw new Error("RISO59 missing original paper web");
        contact=riso54WebContour(knot.x,knot.y-.55,mask.skew);
      }
    }
    if(contact===undefined)return p;
    if(!p.pathKeys)throw new Error("RISO59 needs full-fidelity original 240f source morph");
    return {...p,pathKeys:riso51SourceKeys(p.d,contact,actor)};
  });
  if(shifts.some(s=>s.distance>RISO59_HAND_ENVELOPE.maximumCrestMove+.0001))
    throw new RangeError("RISO59 original anatomical paper screen overshoot");
  // Check every named skin surface point is from our real 3D chain/knots,
  // never a fake photo trace or a separately painted third layer.
  if(!original.has("first-web-inset")||!original.has("fifth-mcp"))
    throw new Error("RISO59 lost the original thumb/index skin origin");
  return {spec:{...spec,parts},actor,side,contactContour,
    crestShifts:shifts,changedPartIds};
}
