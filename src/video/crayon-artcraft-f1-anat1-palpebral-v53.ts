import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
import {CRAYON_PORTRAIT_AUDIT} from "./crayon-artcraft-portrait-audit";
import {crayonF1Anat1OrbitalGeometryV46}
  from "./crayon-artcraft-f1-anat1-orbital-aperture-v46";
import {CRAYON_F1_V49_FIELDS} from "./crayon-artcraft-f1-anat1-oblique-volume-v49";
import {CRAYON_F1_V50_HAIR_FIELDS} from "./crayon-artcraft-f1-anat1-photo-hair-v50";

/**
 * ArtCraft V53 (!dev): physically attached, photographed near-eye topology.
 * This is a NEW isolated source-shape trial, not approval of likeness.
 * No new layers, pixels, or hard decorative eye rings: only the shape and
 * exact clip bounds of existing native wax eyelids/iris/limbus.
 *
 * Observation: the 608x1082 original photo has an outer lid corner near
 * (214,556), a genuinely curved upper rim near x260,y534, and small
 * medial lacrimal contact near (315,545). The lower tarsal roll is
 * ASYMMETRIC, the pigment iris is partially tucked below the upper
 * margin rather than a complete centered coin. The pupil is a soft
 * dark upper-iris core, not a uniformly sized disk.
 *
 * Hand-traced source-image hypotheses; no new scan/3D identity claims.
 */
type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Id="sclera-near"|"iris-near"|"pupil-near"|
  "upper-lid-near"|"lash-root-near"|"lower-lid-near";
type Shape={d:string;angle:number};
export const CRAYON_F1_V53_SOURCE=Object.freeze({
  sha:CRAYON_PORTRAIT_AUDIT.source.sha256,
  size:[608,1082] as const,
  outerCanthus:[214,556] as const,
  innerCanthus:[317,545] as const,
  upperCrest:[265,535] as const,
  lowerCrest:[260,569] as const,
  irisCenter:[261,552] as const,
  releaseApproved:false,
});
/** Source-measured 4-cubic eyelid and iris flow. All paths use 12
 * non-collinear control points plus matching 13th closure contact.
 * Keep real texture/pressure/colors; move only original wax contours.
 * Photographic upper-lid shape bends over the center of the iris.
 */
const SHAPES:Readonly<Record<Id,Shape>>={
  "sclera-near":{
    d:"M215 557"+
      "C225 548 239 540 255 539"+
      "C279 536 302 538 317 545"+
      "C303 555 290 561 272 566"+
      "C246 570 228 566 215 557Z",angle:-8,
  },
  "iris-near":{
    d:"M238 543"+
      "C241 536 251 534 262 535"+
      "C277 535 282 541 283 549"+
      "C283 561 274 568 261 569"+
      "C245 569 238 558 238 543Z",angle:-7,
  },
  "pupil-near":{
    d:"M247 543"+
      "C251 540 260 539 266 542"+
      "C271 547 268 555 262 558"+
      "C255 560 248 555 247 543Z",angle:-7,
  },
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
  "lower-lid-near":{
    d:"M215 558"+
      "C234 570 250 574 272 566"+
      "C291 564 306 555 318 545"+
      "C307 564 288 576 270 578"+
      "C244 581 227 573 215 558Z",angle:15,
  },
};
export const CRAYON_F1_V53_CHANGED_IDS=Object.freeze(
  ["sclera-near","iris-near","pupil-near",
   "upper-lid-near","lash-root-near","lower-lid-near"] as const,
);
function bounds(d:string):Wax["bounds"]{
  // M/C cubic control points only; all are in exact original source-space.
  const values=(d.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);
  if(values.length!==26||values.some(n=>!Number.isFinite(n)))
    throw new RangeError("Incomplete source-traced closed orbit");
  const xs=values.filter((_,i)=>i%2===0),ys=values.filter((_,i)=>i%2!==0);
  const minx=Math.min(...xs),maxx=Math.max(...xs);
  const miny=Math.min(...ys),maxy=Math.max(...ys);
  if(minx<202||maxx>323||miny<515||maxy>585||
     maxx-minx<12||maxy-miny<15)
    throw new RangeError("V53 orbital source traces outside original crop");
  return {x:Math.floor(minx-7),y:Math.floor(miny-7),
    width:Math.ceil(maxx+7)-Math.floor(minx-7),
    height:Math.ceil(maxy+7)-Math.floor(miny-7)};
}
export function crayonF1RebuildSourcePalpebralV53(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  if(CRAYON_F1_V53_SOURCE.sha!==
    "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2")
    throw new RangeError("Unregistered CC0 ocular source photo");
  const original=crayonF1Anat1OrbitalGeometryV46();
  const seen=new Set<string>(),changed=new Set<Id>();
  let face=false,crown=false,right=false;
  const out=elements.map(el=>{
    if(seen.has(el.id))throw new RangeError("Duplicate original orbital scene source "+el.id);
    seen.add(el.id);
    if(el.id==="face-outline"){
      if(el.kind!=="wax"||el.underpaintFields?.length!==12||
         el.underpaintFields?.slice(8).some((f,i)=>f!==CRAYON_F1_V49_FIELDS[i]))
        throw new RangeError("V53 requires independent V49+V50 source photo undercoat");
      face=true;
    }
    if(el.id==="hair-crown-surface"||el.id==="hair-right-curtain"){
      const region=el.id==="hair-crown-surface"?"crown":"right";
      if(el.kind!=="wax"||
         el.underpaintFields!==CRAYON_F1_V50_HAIR_FIELDS[region])
        throw new RangeError("Original source-registered hair incomplete "+el.id);
      if(region==="crown")crown=true;else right=true;
    }
    if(!Object.prototype.hasOwnProperty.call(SHAPES,el.id))return el;
    const id=el.id as Id;
    if(el.kind!=="wax"||changed.has(id)||
       el.d!==original[id].d||
       el.clipToParent!==true||el.renderLayer==="backdrop"||
       el.parentId!==(id==="iris-near"?"sclera-near":
         id==="pupil-near"?"iris-near":"face-outline"))
      throw new RangeError("Unregistered original ANAT1 ocular surface "+id);
    changed.add(id);
    return {...el,d:SHAPES[id].d,angle:SHAPES[id].angle,
      bounds:bounds(SHAPES[id].d)} satisfies Wax;
  });
  if(changed.size!==CRAYON_F1_V53_CHANGED_IDS.length||
     !face||!crown||!right||!seen.has("sclera-far")||
     !seen.has("upper-lid-crease-near")||!seen.has("source-brow-follicles-near"))
    throw new RangeError("V53 source photo is missing original eyes, hair, brow or skin");
  if(out.some(e=>e.id.startsWith("hair-source-lock-")))
    throw new RangeError("Visually rejected V51 hair contours cannot enter V53");
  return out;
}
