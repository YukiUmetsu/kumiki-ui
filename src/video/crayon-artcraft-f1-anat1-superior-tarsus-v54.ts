import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
import {CRAYON_F1_V53_SOURCE} from "./crayon-artcraft-f1-anat1-palpebral-v53";
import {crayonF1Anat1OrbitalGeometryV46}
  from "./crayon-artcraft-f1-anat1-orbital-aperture-v46";
import {CRAYON_F1_V49_FIELDS}
  from "./crayon-artcraft-f1-anat1-oblique-volume-v49";
import {CRAYON_F1_V50_HAIR_FIELDS}
  from "./crayon-artcraft-f1-anat1-photo-hair-v50";

/** V54 ArtCraft !dev: the V53 source-eye study independently worsened
 * iris and lower-lid photo similarity, so retain their original V52
 * geometry byte-identical. ONLY source-measured superior tarsus and
 * attached lash-root contact improved in cropped original photo review.
 * No new strokes/material overlays/eye coin, no shape simplification.
 */
type Id="upper-lid-near"|"lash-root-near";
export const CRAYON_F1_V54_IDS=["upper-lid-near","lash-root-near"] as const;
export const CRAYON_F1_V54_SOURCE=Object.freeze({
  originalSha:CRAYON_F1_V53_SOURCE.sha,approved:false,
  v53Excluded:"sclera/iris/pupil/lower-lid V53 source-SSIM regressions",
});
const SHAPES:Readonly<Record<Id,{d:string;angle:number}>>={
  "upper-lid-near":{
    d:"M214 557"+
      "C227 538 244 522 262 521"+
      "C288 517 304 526 320 539"+
      "C307 535 287 533 269 534"+
      "C245 536 226 549 214 557Z",angle:-11,
  },
  "lash-root-near":{
    d:"M215 557"+
      "C225 543 244 534 264 533"+
      "C286 531 304 537 317 545"+
      "C303 540 287 538 268 538"+
      "C245 540 228 549 215 557Z",angle:-13,
  },
};
function bounds(d:string){
  const nums=(d.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);
  if(nums.length!==26||nums.some(n=>!Number.isFinite(n)))
    throw new RangeError("Incomplete native photo upper tarsal cubic");
  const xs=nums.filter((_,i)=>i%2===0),ys=nums.filter((_,i)=>i%2===1);
  const minx=Math.min(...xs),maxx=Math.max(...xs);
  const miny=Math.min(...ys),maxy=Math.max(...ys);
  if(minx<205||maxx>325||miny<515||maxy>585)
    throw new RangeError("Upper/lash geometry escaped CC0 photograph");
  return {x:Math.floor(minx-7),y:Math.floor(miny-7),
    width:Math.ceil(maxx+7)-Math.floor(minx-7),
    height:Math.ceil(maxy+7)-Math.floor(miny-7)};
}
export function crayonF1SourceSuperiorTarsusV54(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  if(CRAYON_F1_V54_SOURCE.originalSha!==
    "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2")
    throw new RangeError("V54 original CC0 photographic source changed");
  const eye=crayonF1Anat1OrbitalGeometryV46();
  const known=new Set<string>(),used=new Set<Id>();
  let face=false,hair=false;
  const result=elements.map(el=>{
    if(known.has(el.id))throw new RangeError("Duplicated source photo element "+el.id);
    known.add(el.id);
    if(el.id==="face-outline"){
      if(el.kind!=="wax"||el.underpaintFields?.length!==12||
         el.underpaintFields.slice(8).some((f,i)=>f!==CRAYON_F1_V49_FIELDS[i]))
        throw new RangeError("V54 requires complete V52 source photo face");
      face=true;
    }
    if(el.id==="hair-crown-surface"){
      if(el.kind!=="wax"||el.underpaintFields!==CRAYON_F1_V50_HAIR_FIELDS.crown)
        throw new RangeError("V54 requires V50 original wax hair");
      hair=true;
    }
    if(!CRAYON_F1_V54_IDS.includes(el.id as Id))return el;
    const id=el.id as Id;
    if(el.kind!=="wax"||used.has(id)||el.parentId!=="face-outline"||
       el.clipToParent!==true||el.d!==eye[id].d)
      throw new RangeError("Source tarsal anatomy already altered: "+id);
    used.add(id);
    return {...el,d:SHAPES[id].d,angle:SHAPES[id].angle,
      bounds:bounds(SHAPES[id].d)};
  });
  if(!face||!hair||used.size!==2||
     [...known].some(x=>x.startsWith("hair-source-lock-"))||
     ["sclera-near","iris-near","pupil-near","lower-lid-near","sclera-far",
      "cc0-hedge-dark-underpaint"].some(x=>!known.has(x)))
    throw new RangeError("V54 missing original photo eyes/hair or includes V51");
  return result;
}
