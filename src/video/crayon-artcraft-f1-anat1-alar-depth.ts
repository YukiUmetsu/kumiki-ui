import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
import {crayonF1RegisterAnat1Face} from "./crayon-artcraft-f1-anat1-malar";
import {CRAYON_PORTRAIT_AUDIT} from "./crayon-artcraft-portrait-audit";
import {CRAYON_F1_V27_SOURCE_OBSERVATION}
  from "./crayon-artcraft-f1-naris-wax-fusion";

/**
 * ArtCraft V34 — source-registered *negative space*, a separate V32 branch.
 *
 * V33 dorsal pigment patches passed native checks but independently
 * REGRESSED every nose-region image SSIM: do not use V33 as the source of
 * this pass. Keep V33 opt-in with a marked ArtCraft rejection. This pass
 * begins with native V32 and modifies only two cartilage roofs and their
 * corresponding DARK CAVITIES, which must share precisely reversed cubic
 * edges so no free-floating ink disks or mismatched mesh borders arise.
 *
 * ANAT1 468-point camera determines face turn/upper-to-lower nasal
 * orientation; exact CC0 original 608×1082 source samples govern the
 * *individual photographed person*. There is no new photo/raster primitive,
 * generic ethnicity assumption, hidden skull or new wax element.
 */
type Wax=Extract<CrayonElement,{kind:"wax"}>;
type XY=readonly [number,number];
const p=(x:number,y:number):XY=>[Math.round(x*100)/100,Math.round(y*100)/100];
const plus=(point:XY,dx:number,dy:number)=>p(point[0]+dx,point[1]+dy);
const txt=(xy:XY)=>xy.join(" ");
const curve=(a:XY,b:XY,c:XY)=>" C"+txt(a)+" "+txt(b)+" "+txt(c);
const clamp=(x:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,x));
const box=(points:readonly XY[],feather:number)=>{
  const minX=Math.floor(Math.min(...points.map(a=>a[0]))-feather);
  const minY=Math.floor(Math.min(...points.map(a=>a[1]))-feather);
  const maxX=Math.ceil(Math.max(...points.map(a=>a[0]))+feather);
  const maxY=Math.ceil(Math.max(...points.map(a=>a[1]))+feather);
  return {x:minX,y:minY,width:maxX-minX,height:maxY-minY};
};
type Region={d:string;bounds:Wax["bounds"];angle:number};

export const CRAYON_F1_V34_SOURCE_OBSERVATIONS=Object.freeze({
  sourceSha:CRAYON_PORTRAIT_AUDIT.source.sha256,
  nearCenter:CRAYON_F1_V27_SOURCE_OBSERVATION.near.center,
  farCenter:CRAYON_F1_V27_SOURCE_OBSERVATION.far.center,
  nearSourceShadow:[22,3,3] as const,
  farSourceShadow:[76,24,20] as const,
  nativeV33NearShadow:[79,43,39] as const,
  nativeV33FarShadow:[96,65,60] as const,
});
export const CRAYON_F1_V34_IDS=[
  "alar-roof-near","naris-shadow-near",
  "alar-roof-far","naris-shadow-far",
] as const;
type Id=(typeof CRAYON_F1_V34_IDS)[number];

export function crayonF1Anat1RecessGeometry():Readonly<Record<Id,Region>>{
  const fit=crayonF1RegisterAnat1Face();
  // The source itself supplies the photographed person’s distinct
  // cavities. The 3D model is allowed only a ±1–2 px orientation
  // adjustment, not an arbitrary averaged facial width.
  const yawSlope=fit.projected["pronasale"][0]-fit.projected["sellion"][0];
  const turn=clamp((yawSlope-43)/10,-1.5,1.5);
  const pitch=clamp((fit.pitch-10)/6,-1.5,1.5);
  const near=p(CRAYON_F1_V34_SOURCE_OBSERVATIONS.nearCenter[0],
    CRAYON_F1_V34_SOURCE_OBSERVATIONS.nearCenter[1]);
  const far=p(CRAYON_F1_V34_SOURCE_OBSERVATIONS.farCenter[0],
    CRAYON_F1_V34_SOURCE_OBSERVATIONS.farCenter[1]);

  // The overhanging left alar cartilage has a hooked, recessed pupil
  // of negative space, not a cartoon ellipse or brown dot.
  const nA=plus(near,-16+turn,7);
  const nB=plus(near,1+turn,-12-pitch);
  const nC=plus(near,22,2-pitch);
  const nC1=plus(nA,2,-13),nC2=plus(nB,-9,-9);
  const nC3=plus(nB,13,-5),nC4=plus(nC,-3,-9);
  const rimNear="M"+txt(nA)+curve(nC1,nC2,nB)+curve(nC3,nC4,nC);
  // Reverse two *mathematically identical* cubic edges (no gaps).
  const rimNearReverse=curve(nC4,nC3,nB)+curve(nC2,nC1,nA);
  const nD=plus(near,5,5),nE=plus(near,-5,21);
  const nearCavity=rimNear+
    curve(plus(nC,-6,-5),plus(nD,4,-8),nD)+
    curve(plus(nD,-4,11),plus(nE,5,2),nE)+
    curve(plus(nE,-7,-2),plus(nA,2,6),nA)+"Z";
  const nrA=plus(near,-30,-7),nrB=plus(near,4,-27);
  const nrC=plus(near,25,8);
  const nearRoof="M"+txt(nrA)+
    curve(plus(nrA,9,-20),plus(nrB,-17,-12),nrB)+
    curve(plus(nrB,18,-4),plus(nrC,7,-14),nrC)+
    curve(plus(nrC,-1,6),plus(nC,4,8),nC)+
    rimNearReverse.slice(0)+
    curve(plus(nA,-6,-3),plus(nrA,4,11),nrA)+"Z";

  // Far ala is partly hair-occluded and foreshortened: a separate narrow
  // ascending crescent follows its OWN source photograph, not mirroring.
  const fA=plus(far,-7+turn,8);
  const fB=plus(far,3+turn,-13-pitch);
  const fC=plus(far,10,1-pitch);
  const fC1=plus(fA,-2,-7),fC2=plus(fB,-6,3);
  const fC3=plus(fB,7,1),fC4=plus(fC,1,-8);
  const rimFar="M"+txt(fA)+curve(fC1,fC2,fB)+curve(fC3,fC4,fC);
  const rimFarReverse=curve(fC4,fC3,fB)+curve(fC2,fC1,fA);
  const fD=plus(far,-1,19);
  const farCavity=rimFar+
    curve(plus(fC,-1,11),plus(fD,5,5),fD)+
    curve(plus(fA,2,13),plus(fA,0,5),fA)+"Z";
  const frA=plus(far,-10,-5),frB=plus(far,11,-21),frC=plus(far,15,11);
  const farRoof="M"+txt(frA)+
    curve(plus(frA,4,-14),plus(frB,-9,-12),frB)+
    curve(plus(frB,13,6),plus(frC,4,-11),frC)+
    curve(plus(frC,-2,12),plus(fC,1,8),fC)+
    rimFarReverse.slice(0)+
    curve(plus(fA,-4,-3),plus(frA,-5,8),frA)+"Z";

  const nearPoints=[nA,nB,nC,nC1,nC2,nC3,nC4,nD,nE,nrA,nrB,nrC] as const;
  const farPoints=[fA,fB,fC,fC1,fC2,fC3,fC4,fD,frA,frB,frC] as const;
  const nearRoot=box(nearPoints,9),farRoot=box(farPoints,8);
  const result={
    "naris-shadow-near":{d:nearCavity,bounds:nearRoot,angle:-24},
    "alar-roof-near":{d:nearRoof,bounds:nearRoot,angle:25},
    "naris-shadow-far":{d:farCavity,bounds:farRoot,angle:65},
    "alar-roof-far":{d:farRoof,bounds:farRoot,angle:69},
  } as const satisfies Record<Id,Region>;
  if(Object.values(result).some(p=>
    p.bounds.x<350||p.bounds.x>468||p.bounds.y<580||
    p.bounds.y>690||p.bounds.width>95||p.bounds.height>95))
    throw new RangeError("ANAT1 native alar rim fell outside photographed anatomy");
  return result;
}
const paints:Readonly<Record<Id,Partial<Wax>>>={
  "naris-shadow-near":{
    colors:["#3e211d","#100607","#715046"],
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:2.8,
    pressure:1,spacing:3.7,markStrength:.19,
    underpaintTooth:.04,opaqueBurnish:1,
    underpaintGradient:{light:"#492921",shadow:"#0e0407",
      focusX:.65,focusY:.54,radius:1.04},
    outlineOpacity:0,edgeRoughness:.14,
  },
  "naris-shadow-far":{
    colors:["#573128","#1a0d0e","#86564b"],
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:2.7,
    pressure:.99,spacing:3.8,markStrength:.20,
    underpaintTooth:.05,opaqueBurnish:.99,
    underpaintGradient:{light:"#643b2f",shadow:"#16090c",
      focusX:.71,focusY:.41,radius:.95},
    outlineOpacity:0,edgeRoughness:.14,
  },
  "alar-roof-near":{
    colors:["#cfa599","#9b7066","#eac1ac"],
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:7.2,
    pressure:.68,spacing:5.1,markStrength:.33,
    outlineOpacity:0,edgeRoughness:.16,
  },
  "alar-roof-far":{
    colors:["#bc9387","#866159","#daaa9d"],
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:7.0,
    pressure:.64,spacing:5.6,markStrength:.30,
    outlineOpacity:0,edgeRoughness:.16,
  },
};
/** Valid for the complete V32 scene *without* the rejected V33 dorsal
 * transform. Preserve every layer's original painter ordering (V26 places
 * recessed negative space after its matching raised cartilage roof).
 */
export function crayonF1RebuildAnat1AlarRecess(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const geometry=crayonF1Anat1RecessGeometry();
  const seen=new Set<string>();
  const result=elements.map(el=>{
    if(!Object.prototype.hasOwnProperty.call(geometry,el.id))return el;
    if(el.kind!=="wax"||seen.has(el.id)||
       el.parentId!=="face-outline"||el.clipToParent!==true)
      throw new RangeError("Invalid source-native ANAT1 alar contact "+el.id);
    const id=el.id as Id;
    if(el.d===geometry[id].d)
      throw new RangeError("V34 source alar negative space was already rebuilt");
    seen.add(el.id);
    return {...el,...paints[id],...geometry[id]};
  });
  if(seen.size!==CRAYON_F1_V34_IDS.length)
    throw new RangeError("Missing source-native ANAT1 near/far alar wax");
  for(const side of ["near","far"] as const){
    const roof=result.findIndex(el=>el.id==="alar-roof-"+side);
    const cavity=result.findIndex(el=>el.id==="naris-shadow-"+side);
    if(roof<0||cavity<=roof)
      throw new RangeError("Native cavity must occlude its attached cartilage");
  }
  return result;
}
