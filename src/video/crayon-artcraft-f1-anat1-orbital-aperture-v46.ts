import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
import {CRAYON_PORTRAIT_AUDIT} from "./crayon-artcraft-portrait-audit";
import {crayonF1RegisterAnat1Face} from "./crayon-artcraft-f1-anat1-malar";

/**
 * F1 V46: 3D ANAT1-constrained reconstruction of the near eye's actual
 * photographed aperture / tarsal fold, not just another wax color pass.
 *
 * Source: Campbell CC0 608×1082 f299 photographic crop. Exact original
 * reference SHA-256 f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2.
 * V43 screenshot failure: iris reads a generic flat disk, the bright
 * sclera a sharp triangle and the upper crease a hand-drawn acute wedge.
 * Original source has a continuous orbital upper sulcus x230..313
 * y519..537, eyelid rim x216..318 y538..558, and lower roll y564..580.
 *
 * The THREE-D source-camera fit constrains the canthal axis and vertical
 * upper/lower palpebrale depth, with observed CC0 coordinates retaining
 * >90% authority. Only the nine original V36 eye structure wax paths,
 * bounds, and nib tangent change; never remove original pigment, lash
 * follicles, iris highlights, temporal fragments or any face/hair detail.
 * Opt-in ART HOLD / not approved. No raster image or texture overlay.
 */
type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Point=readonly [number,number];
export const CRAYON_F1_V46_SOURCE=Object.freeze({
  sha:CRAYON_PORTRAIT_AUDIT.source.sha256,
  leftCanthus:[216,558] as const,rightCanthus:[318,545] as const,
  upperSulcus:[270,518] as const,upperTarsal:[266,536] as const,
  lowerLid:[269,566] as const,neutralSclera:[294,546] as const,
  irisCenter:[260,546] as const,
  calibratedFrom:"CC0-608x1082-and-ANAT1-468" as const,
  artApproved:false,
});
export const CRAYON_F1_V46_NINE_EYE_IDS=[
  "sclera-near","sclera-inner-contact-near","iris-near","pupil-near",
  "upper-lid-near","lash-root-near","lower-lid-near",
  "lower-lid-margin-near","upper-lid-crease-near",
] as const;
type Id=(typeof CRAYON_F1_V46_NINE_EYE_IDS)[number];
type SourcePlane="upper"|"lower"|"center";
type Shape={d:string;bounds:Wax["bounds"];angle:number};
type SourceShape={points:readonly Point[];plane:SourcePlane;angle:number;parent:string};
const p=(x:number,y:number):Point=>[x,y];
/** Cubic controls are authored from the true 608x1082 original photo,
 * retaining four connected asymmetrical cubic sub-arcs per surface.
 * Coordinates are never substituted from the 468-point average identity.
 */
const measured:Readonly<Record<Id,SourceShape>>={
  "sclera-near":{parent:"face-outline",plane:"center",angle:-8,points:[
    p(216,558),p(230,545),p(245,539),p(265,538),
    p(286,536),p(307,538),p(318,545),
    p(307,555),p(290,561),p(273,564),
    p(250,568),p(228,563),p(216,558),
  ]},
  "sclera-inner-contact-near":{parent:"sclera-near",plane:"center",angle:12,points:[
    p(280,542),p(285,540),p(292,538),p(298,540),
    p(307,539),p(311,542),p(313,544),
    p(303,551),p(300,556),p(292,557),
    p(285,557),p(280,551),p(280,542),
  ]},
  "iris-near":{parent:"sclera-near",plane:"center",angle:-5,points:[
    p(239,545),p(240,537),p(250,535),p(260,535),
    p(274,535),p(281,541),p(281,550),
    p(283,561),p(273,565),p(261,565),
    p(247,566),p(239,557),p(239,545),
  ]},
  "pupil-near":{parent:"iris-near",plane:"center",angle:6,points:[
    p(248,547),p(248,542),p(251,539),p(257,538),
    p(266,538),p(269,544),p(269,551),
    p(267,558),p(262,560),p(257,559),
    p(251,559),p(248,553),p(248,547),
  ]},
  "upper-lid-near":{parent:"face-outline",plane:"upper",angle:-11,points:[
    p(212,560),p(223,539),p(243,531),p(265,531),
    p(288,529),p(310,536),p(319,544),
    p(309,541),p(287,538),p(267,538),
    p(245,540),p(226,552),p(212,560),
  ]},
  "lash-root-near":{parent:"face-outline",plane:"upper",angle:-12,points:[
    p(217,556),p(229,542),p(245,535),p(265,535),
    p(286,533),p(306,538),p(317,545),
    p(298,542),p(286,539),p(267,540),
    p(248,539),p(231,548),p(217,556),
  ]},
  "lower-lid-near":{parent:"face-outline",plane:"lower",angle:17,points:[
    p(216,558),p(237,569),p(251,570),p(269,566),
    p(292,563),p(307,553),p(319,545),
    p(310,563),p(295,574),p(273,576),
    p(250,580),p(229,575),p(216,558),
  ]},
  "lower-lid-margin-near":{parent:"face-outline",plane:"lower",angle:19,points:[
    p(220,565),p(242,573),p(262,572),p(282,568),
    p(300,563),p(311,555),p(316,549),
    p(308,566),p(294,574),p(277,578),
    p(254,580),p(233,575),p(220,565),
  ]},
  "upper-lid-crease-near":{parent:"face-outline",plane:"upper",angle:-13,points:[
    p(212,549),p(225,529),p(241,520),p(261,519),
    p(281,517),p(302,522),p(320,536),
    p(298,525),p(283,522),p(267,524),
    p(243,525),p(225,538),p(212,549),
  ]},
};
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
const round=(n:number)=>Math.round(n*100)/100;
const fitSource=(point:Point,plane:SourcePlane,fit:ReturnType<
  typeof crayonF1RegisterAnat1Face>):Point=>{
  const near=CRAYON_F1_V46_SOURCE.leftCanthus;
  const far=CRAYON_F1_V46_SOURCE.rightCanthus;
  const a=fit.projected["exocanthion.R"];
  const b=fit.projected["endocanthion.R"];
  const t=clamp((point[0]-near[0])/(far[0]-near[0]),0,1);
  // Same 9% source authority-weighted ANAT1 pose correction as V36.
  const dx=clamp(.09*((1-t)*(a[0]-near[0])+t*(b[0]-far[0])),-2.5,2.5);
  const dy=clamp(.09*((1-t)*(a[1]-near[1])+t*(b[1]-far[1])),-2.5,2.5);
  const upper=fit.projected["palpebrale-superius.R"];
  const lower=fit.projected["palpebrale-inferius.R"];
  // Depth of the actual 3D mesh gives only a small continuous bend to
  // the top/bottom planes; photographed source identity always wins.
  const depth=plane==="upper"?
    clamp((upper[1]-534)*.035,-1.1,1.1):
    plane==="lower"?clamp((lower[1]-566)*.035,-1.1,1.1):0;
  const weight=1-Math.abs(2*t-1);
  return [round(point[0]+dx),round(point[1]+dy+depth*weight)];
};
const format=(v:Point)=>v[0]+" "+v[1];
/** The measured shapes share true source canthi and ANAT1-projected
 * tangent shifts. Bounds are computed from ALL control points, not an
 * invented enclosing primitive. Smooth cubic continuity is retained.
 */
export function crayonF1Anat1OrbitalGeometryV46():Readonly<Record<Id,Shape>>{
  const fit=crayonF1RegisterAnat1Face();
  if(fit.model!=="ANAT1/MediaPipe-468-unmodified"||
     fit.artisticApproval!==false||fit.rmse>=40||
     CRAYON_F1_V46_SOURCE.sha!==CRAYON_PORTRAIT_AUDIT.source.sha256)
    throw new RangeError("Unverified CC0 ANAT1 source eye pose");
  const result={} as Record<Id,Shape>;
  for(const id of CRAYON_F1_V46_NINE_EYE_IDS){
    const source=measured[id];
    if(source.points.length!==13||source.points.some(([x,y])=>
      !Number.isFinite(x)||!Number.isFinite(y)||x<190||x>332||y<490||y>610))
      throw new RangeError("Incomplete original-photo connected orbital cubic: "+id);
    const points=source.points.map(pt=>fitSource(pt,source.plane,fit));
    const [start,...tail]=points;
    const d="M"+format(start)+Array.from({length:4},(_,n)=>{
      const k=n*3;
      return " C"+format(tail[k])+" "+format(tail[k+1])+" "+format(tail[k+2]);
    }).join("")+"Z";
    const xmin=Math.min(...points.map(v=>v[0]));
    const xmax=Math.max(...points.map(v=>v[0]));
    const ymin=Math.min(...points.map(v=>v[1]));
    const ymax=Math.max(...points.map(v=>v[1]));
    const pad=8;
    const bounds={x:Math.floor(xmin-pad),y:Math.floor(ymin-pad),
      width:Math.ceil(xmax+pad)-Math.floor(xmin-pad),
      height:Math.ceil(ymax+pad)-Math.floor(ymin-pad)};
    if(!Number.isFinite(source.angle)||bounds.x<185||bounds.x>285||
      bounds.y<480||bounds.y>585||bounds.width<20||
      bounds.width>160||bounds.height<18||bounds.height>105||
      d.includes("NaN"))
      throw new RangeError("Source-fitted ANAT1 orbital plane escaped photographed eye: "+id);
    result[id]={d,bounds,angle:source.angle};
  }
  return Object.freeze(result);
}

/** Optical topology changes only, never wax colors/opacity/contact/texture.
 * Original full V43 ordered element IDs, paper, face, hair and film
 * are conserved. This allows clean native source vs candidate A/B.
 */
export function crayonF1RebuildOrbitalApertureV46(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const shapes=crayonF1Anat1OrbitalGeometryV46();
  const seen=new Set<string>(),changed=new Set<Id>();
  const out=elements.map(el=>{
    if(seen.has(el.id))throw new RangeError("Duplicated original photographed eye ID "+el.id);
    seen.add(el.id);
    if(!Object.prototype.hasOwnProperty.call(shapes,el.id))return el;
    const id=el.id as Id;
    if(el.kind!=="wax"||el.parentId!==measured[id].parent||
       el.clipToParent!==true||el.renderLayer==="backdrop"||
       !el.d.startsWith("M")||el.d===shapes[id].d)
      throw new RangeError("Detached/duplicate source ANAT1 eye geometry: "+id);
    changed.add(id);
    return {...el,...shapes[id]} satisfies Wax;
  });
  if(changed.size!==CRAYON_F1_V46_NINE_EYE_IDS.length||
     !seen.has("face-outline")||!seen.has("hair-crown-surface")||
     !seen.has("source-brow-follicles-near")||
     !seen.has("cc0-hedge-dark-underpaint")||
     !seen.has("sclera-far")||!seen.has("iris-far"))
    throw new RangeError("Incomplete original CC0 eye, face, hair or wax environment");
  return out;
}
