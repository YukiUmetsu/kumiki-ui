import type {CrayonElement,CrayonUnderpaintField} from "../../registry/video/materials/crayon-scene";
import {CRAYON_PORTRAIT_AUDIT} from "./crayon-artcraft-portrait-audit";

/**
 * CRAYON1 ArtCraft F1 V50 (!dev): preserve the V39 original hair flow,
 * V40 organically asymmetric silhouette, V41 real forehead overlap,
 * original CC0 eye/face and all individual dry-wax root cubics. Only
 * three existing opaque native hair masses receive soft, source-measured
 * pigment undercoats before their original paper-tooth wax fibers.
 * This is an unapproved experiment; no source raster is shipped.
 */
type Region="crown"|"left"|"right";
type Mass="hair-crown-surface"|"hair-left-curtain"|"hair-right-curtain";
type SourceSpot={at:readonly [number,number];photo:readonly [number,number,number];
  nativeV48:readonly [number,number,number];color:`#${string}`;
  radius:readonly [number,number];pressure:number};
const REGIONS=["crown","left","right"] as const;
const MASS:Readonly<Record<Region,Mass>>={
  crown:"hair-crown-surface",left:"hair-left-curtain",right:"hair-right-curtain",
};
/** Exact preserved V40 mass bounds, not fitted ovals or approximate scene boxes. */
const BOUNDS:Readonly<Record<Mass,{x:number;y:number;width:number;height:number}>>={
  "hair-crown-surface":{x:-48,y:157,width:531,height:350},
  "hair-left-curtain":{x:-36,y:181,width:233,height:919},
  "hair-right-curtain":{x:376,y:184,width:245,height:915},
};
export const CRAYON_F1_V50_SOURCE=Object.freeze({
  sha:CRAYON_PORTRAIT_AUDIT.source.sha256,
  image:"Original CC0 608x1082 browser crop, not original camera file" as const,
  artistApproved:false,
});
/** Independent 7×7 original CC0 vs actual same-frame V48 Chromium medians. */
export const CRAYON_F1_V50_SPOTS:Readonly<Record<Region,readonly SourceSpot[]>>={
  crown:[
    {at:[278,215],photo:[45,34,29],nativeV48:[73,51,44],color:"#261a1b",radius:[133,103],pressure:.66},
    {at:[330,220],photo:[45,33,29],nativeV48:[97,68,56],color:"#24191b",radius:[118,101],pressure:.57},
    {at:[145,245],photo:[47,36,33],nativeV48:[100,73,60],color:"#30211d",radius:[86,87],pressure:.44},
    {at:[70,265],photo:[106,84,71],nativeV48:[78,55,47],color:"#b18a6e",radius:[57,102],pressure:.31},
  ],
  left:[
    {at:[40,364],photo:[92,64,50],nativeV48:[46,34,29],color:"#af8266",radius:[43,150],pressure:.55},
    {at:[35,555],photo:[58,33,25],nativeV48:[73,51,43],color:"#291a1a",radius:[45,123],pressure:.40},
    {at:[50,640],photo:[19,10,8],nativeV48:[58,39,34],color:"#100d0f",radius:[56,159],pressure:.62},
    {at:[80,830],photo:[2,1,0],nativeV48:[71,53,45],color:"#100a0d",radius:[61,198],pressure:.72},
  ],
  right:[
    {at:[450,354],photo:[61,43,36],nativeV48:[86,63,51],color:"#24181a",radius:[71,151],pressure:.52},
    {at:[485,520],photo:[67,38,28],nativeV48:[101,74,60],color:"#241719",radius:[68,169],pressure:.56},
    {at:[550,860],photo:[52,33,27],nativeV48:[69,50,43],color:"#201518",radius:[65,200],pressure:.43},
  ],
};
const round=(n:number)=>Number(n.toFixed(5));
function fields(region:Region):readonly CrayonUnderpaintField[]{
  const bounds=BOUNDS[MASS[region]];
  return Object.freeze(CRAYON_F1_V50_SPOTS[region].map(w=>{
    const f:CrayonUnderpaintField={
      x:round((w.at[0]-bounds.x)/bounds.width),
      y:round((w.at[1]-bounds.y)/bounds.height),
      radiusX:round(w.radius[0]/bounds.width),
      radiusY:round(w.radius[1]/bounds.height),
      color:w.color,strength:w.pressure,
    };
    if(![f.x,f.y,f.radiusX,f.radiusY,f.strength].every(Number.isFinite)||
       f.x<0||f.x>1||f.y<0||f.y>1||f.radiusX<=0||f.radiusX>1||
       f.radiusY<=0||f.radiusY>1||f.strength<=0||f.strength>1)
      throw new RangeError("CC0 measured hair deposition escaped native wax bounds");
    return Object.freeze(f);
  }));
}
export const CRAYON_F1_V50_HAIR_FIELDS=Object.freeze({
  crown:fields("crown"),left:fields("left"),right:fields("right"),
});
export const CRAYON_F1_V50_HAIR_IDS=Object.freeze(REGIONS.map(r=>MASS[r]));

/** Zero new elements and zero changed paths, pigment fibers, hierarchy,
 * film/camera frames or facial shapes. Repeated application fails closed.
 */
export function crayonF1AddPhotometricHairWaxV50(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  if(CRAYON_F1_V50_SOURCE.sha!==
    "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2")
    throw new RangeError("Photographed CC0 source changed");
  const ids=new Map<string,CrayonElement>();
  for(const el of elements){
    if(ids.has(el.id))throw new RangeError("Duplicate native face/hair source "+el.id);
    ids.set(el.id,el);
  }
  const face=ids.get("face-outline");
  if(face?.kind!=="wax"||face.coverage!=="opaque"||
     !face.underpaintFields||face.underpaintFields.length!==8||
     face.bounds.x!==73||face.bounds.y!==272||
     face.bounds.width!==440||face.bounds.height!==611)
    throw new RangeError("V50 requires unmodified V48 source-photometric face");
  for(const region of REGIONS){
    const id=MASS[region],el=ids.get(id);
    if(el?.kind!=="wax"||el.coverage!=="opaque"||
       el.deposition!=="stroke-built"||!el.underpaintGradient||
       el.underpaintFields!==undefined||!el.d.startsWith("M")||
       Object.entries(BOUNDS[id]).some(([key,n])=>
         el.bounds[key as keyof typeof BOUNDS[Mass]]!==n))
      throw new RangeError("Source-registered original hair wax missing: "+id);
    const originalRootIds=[...ids.keys()].filter(x=>x.startsWith("hair-rooted-"+region+"-"));
    if(originalRootIds.length===0||originalRootIds.some(x=>{
      const root=ids.get(x);
      return root?.kind!=="contour"||root.parentId!==id||root.clipToParent!==true||
        !root.d.startsWith("M");
    }))throw new RangeError("Missing or detached original directional root strands "+region);
  }
  for(const id of ["hair-back","sclera-near","iris-near","iris-far",
    "pupil-near","source-brow-follicles-near","cc0-hedge-dark-underpaint"])
    if(!ids.has(id))throw new RangeError("Missing original protected photo element "+id);
  const fromMass=new Map<string,Region>(REGIONS.map(r=>[MASS[r],r]));
  return elements.map(el=>{
    const region=fromMass.get(el.id);
    return region&&el.kind==="wax"?
      {...el,underpaintFields:CRAYON_F1_V50_HAIR_FIELDS[region]}:el;
  });
}
