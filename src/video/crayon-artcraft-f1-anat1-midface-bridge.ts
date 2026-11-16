import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
import {CRAYON_PORTRAIT_AUDIT} from "./crayon-artcraft-portrait-audit";
import {crayonF1RegisterAnat1Face} from "./crayon-artcraft-f1-anat1-malar";

/**
 * F1 V32: original ANAT1 3D zygomatic → infraorbital → alar surface in native
 * CRAYON1. The earlier V31 corrected only a small cheek highlight; the
 * original V31 1×/3× screenshots still show a flat large cheek and a pale
 * nose sidewall *sticker*. Both must share believable anatomical flow.
 *
 * ANAT1's 468-vertex face/registered camera supplies relative spatial
 * direction, but its average is NOT Christopher Campbell's CC0 subject.
 * The observed source cheek (211,658), near canthi (222/303,544),
 * nose root (363,522) and tip (411,631) remain the identity constraints.
 * No photo pixels, average human race/ethnicity inference or SVG overlays.
 *
 * All skin/tooth/dry-wax materials, micro-strokes, iris/eyelids, hair,
 * segment IDs, nested clips, existing film timing and acoustic layers
 * are preserved. Unapproved until independent native image review.
 */
type Wax=Extract<CrayonElement,{kind:"wax"}>;
type XY=readonly [number,number];
export const CRAYON_F1_V32_ANAT1_IDS=["malar-cheek-near","nose-sidewall"] as const;
export const CRAYON_F1_V32_SOURCE_SHA=
  CRAYON_PORTRAIT_AUDIT.source.sha256;

const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const round=(v:number)=>Math.round(v*100)/100;
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const xy=(x:number,y:number)=>[round(x),round(y)] as const;
const fmt=(a:readonly number[])=>a.map(round).join(" ");
const b3=(a:XY,b:XY,c:XY)=>" C"+fmt([...a,...b,...c]);
const bounds=(pairs:XY[],pad:number)=>{
  const x=Math.floor(Math.min(...pairs.map(p=>p[0]))-pad);
  const y=Math.floor(Math.min(...pairs.map(p=>p[1]))-pad);
  const xx=Math.ceil(Math.max(...pairs.map(p=>p[0]))+pad);
  const yy=Math.ceil(Math.max(...pairs.map(p=>p[1]))+pad);
  return {x,y,width:xx-x,height:yy-y};
};
type Shape=Pick<Wax,"d"|"bounds"|"angle">;

export function crayonF1Anat1MidfacePaths():Readonly<Record<
  (typeof CRAYON_F1_V32_ANAT1_IDS)[number],Shape>>{
  const fit=crayonF1RegisterAnat1Face();
  const src=CRAYON_PORTRAIT_AUDIT.sourcePoints;
  const cheek=fit.projected["cheekbone.R"];
  const zygion=fit.projected["zygion.R"];
  const lowerEye=fit.projected["palpebrale-inferius.R"];
  const alar=fit.projected["alare.R"];
  const noseRoot=fit.projected["sellion"];
  const noseTip=fit.projected["pronasale"];
  // source coordinate wins when population-average 3D is off identity.
  const high=xy(lerp(src.cheek_near[0],cheek[0],.3),
    lerp(src.cheek_near[1],cheek[1],.3));
  const lateral=xy(clamp(zygion[0]+16,101,121),
    clamp(zygion[1]-29,561,590));
  const underEye=xy(lerp(src.eye_near_inner[0]-19,lowerEye[0],.34),
    lerp(src.eye_near_inner[1]+38,lowerEye[1]+22,.34));
  const alarSide=xy(lerp(src.nose_tip[0]-56,alar[0]+11,.3),
    lerp(src.nose_tip[1]-19,alar[1]-29,.3));
  const innerCheek=xy(clamp(alarSide[0]+11,327,362),
    clamp(alarSide[1]+33,616,652));
  const cheekTurn=xy(clamp(high[0]+45,246,286),
    clamp(high[1]+91,713,767));
  const cheekReturn=xy(clamp(high[0]-61,120,167),
    clamp(high[1]+115,746,791));
  const malarStart=lateral;
  const malarEnd=xy(lateral[0]+1,lateral[1]+1);
  const malarControls:XY[]=[
    xy(lateral[0]+21,lateral[1]-15),xy(underEye[0]-46,underEye[1]-26),underEye,
    xy(underEye[0]+37,underEye[1]-6),xy(alarSide[0]-24,alarSide[1]-7),alarSide,
    xy(innerCheek[0]+10,innerCheek[1]+36),
    xy(cheekTurn[0]+31,cheekTurn[1]-4),cheekTurn,
    xy(cheekTurn[0]-31,cheekTurn[1]+35),
    xy(cheekReturn[0]+36,cheekReturn[1]+10),cheekReturn,
    xy(lateral[0]-20,cheekReturn[1]-49),
    xy(lateral[0]-10,lateral[1]+69),malarEnd,
  ];
  // 3D-connected zygoma and infraorbital skin, one closed continuous
  // five-cubic volume. The highlight remains on the exact same root.
  const malarD="M"+fmt(malarStart)+
    b3(malarControls[0],malarControls[1],malarControls[2])+
    b3(malarControls[3],malarControls[4],malarControls[5])+
    b3(malarControls[6],malarControls[7],malarControls[8])+
    b3(malarControls[9],malarControls[10],malarControls[11])+
    b3(malarControls[12],malarControls[13],malarControls[14])+"Z";
  // Shared alar transition is built from the same source-conditioned
  // ANAT1 endpoint, not a second disconnected nasal stripe.
  const root=xy(lerp(src.nose_root[0]-18,noseRoot[0]-11,.45),
    lerp(src.nose_root[1]+11,noseRoot[1]+16,.45));
  const sideMid=xy(lerp(root[0]+9,alarSide[0]-11,.55),
    lerp(root[1]+64,alarSide[1]-18,.55));
  const sideBottom=xy(alarSide[0]+20,alarSide[1]+41);
  const sideReturn=xy(alarSide[0]-13,alarSide[1]+31);
  const noseControls:XY[]=[
    xy(root[0]+7,root[1]+24),xy(sideMid[0]-4,sideMid[1]-14),sideMid,
    xy(sideMid[0]+17,sideMid[1]+23),
    xy(sideBottom[0]+16,sideBottom[1]-4),sideBottom,
    xy(sideBottom[0]-15,sideBottom[1]+1),
    xy(sideReturn[0]+12,sideReturn[1]+7),sideReturn,
    xy(sideReturn[0]-9,sideReturn[1]-23),
    xy(root[0]-14,root[1]+30),root,
  ];
  const noseD="M"+fmt(root)+
    b3(noseControls[0],noseControls[1],noseControls[2])+
    b3(noseControls[3],noseControls[4],noseControls[5])+
    b3(noseControls[6],noseControls[7],noseControls[8])+
    b3(noseControls[9],noseControls[10],noseControls[11])+"Z";
  const malar:Shape={
    d:malarD,
    bounds:bounds([malarStart,underEye,alarSide,innerCheek,cheekTurn,
      cheekReturn,...malarControls],21),
    angle:round(clamp(Math.atan2(high[1]-lateral[1],high[0]-lateral[0])*180/Math.PI,-75,75)),
  };
  const nose:Shape={
    d:noseD,bounds:bounds([root,sideMid,sideBottom,sideReturn,...noseControls],16),
    angle:round(clamp(Math.atan2(noseTip[1]-noseRoot[1],noseTip[0]-noseRoot[0])*180/Math.PI,-75,75)),
  };
  if([malar,nose].some(p=>
    !Number.isFinite(p.angle)||p.bounds.width>450||p.bounds.height>450||
    p.bounds.width<15||p.bounds.height<15))
    throw new RangeError("ANAT1 midface does not fit source camera");
  return Object.freeze({"malar-cheek-near":malar,"nose-sidewall":nose});
}
/** This is a transform of *original native shapes*, never a generic face
 * mutation; reversible against V31 and restricted to these 2 planes.
 */
export function crayonF1RebuildAnat1Midface(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const paths=crayonF1Anat1MidfacePaths();
  const found=new Set<string>();
  const out=elements.map(el=>{
    if(!Object.prototype.hasOwnProperty.call(paths,el.id))return el;
    if(el.kind!=="wax"||found.has(el.id)||
       el.parentId!=="face-outline"||el.clipToParent!==true)
      throw new RangeError("ANAT1 source medial wax missing or duplicated: "+el.id);
    const next=paths[el.id as keyof typeof paths];
    if(el.d===next.d)throw new RangeError("ANAT1 source midface already applied");
    found.add(el.id);
    return {...el,...next};
  });
  if(found.size!==CRAYON_F1_V32_ANAT1_IDS.length)
    throw new RangeError("Missing ANAT1 source malar/sidewall anatomical plane");
  return out;
}
