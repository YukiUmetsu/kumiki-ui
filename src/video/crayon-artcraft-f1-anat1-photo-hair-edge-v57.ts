import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
import {CRAYON_F1_V56_SOURCE,CRAYON_F1_V56_IDS}
  from "./crayon-artcraft-f1-anat1-outer-hair-v56";

/**
 * ArtCraft V57 experimental refinement: correct the remaining photographed
 * edge-to-foliage scalp/crown registration after the independently accepted
 * V56 *regional* experiment. Source camera/sitter 608x1082 is immutable.
 *
 * The V56 native material-boundary scan still sees 3..23 px of too-high
 * helmet contour at all 22 stations. V57 lowers only the existing upper
 * cubic segments (not the internally correct forehead/hairline, pressure,
 * hair-root fiber filaments, face or green foliage). This is a measured
 * directional source hypothesis, NOT a raster segmentation, and must be
 * independently graded against the exact real original photo before use.
 */
export const CRAYON_F1_V57_SOURCE=Object.freeze({
  sha:CRAYON_F1_V56_SOURCE.sha,
  observedX:CRAYON_F1_V56_SOURCE.x,
  observedTop:CRAYON_F1_V56_SOURCE.originalY,
  v56RenderedTop:[278,261,247,232,219,210,197,186,182,181,185,189,
    187,187,193,204,219,234,259,292,336,383] as const,
  acceptedForRelease:false,
  approval:"Measured source-top hypothesis, opt-in !dev only",
});
type Mass=(typeof CRAYON_F1_V56_IDS)[number];
type Shape={original:string;replacement:string;endOriginal?:string;endReplacement?:string};
const SHAPES:Readonly<Record<Mass,Shape>>={
  "hair-back":{
    original:"M-45 446C-30 350 6 283 73 239"+
      "C108 210 146 187 177 188"+
      "C209 183 236 197 263 197"+
      "C300 182 343 204 376 225"+
      "C430 258 473 340 505 396"+
      "C528 440 543 502 555 572",
    replacement:"M-45 456C-30 360 6 291 73 247"+
      "C108 217 146 193 177 193"+
      "C209 190 236 204 263 203"+
      "C300 188 343 211 376 231"+
      "C430 271 473 352 505 403"+
      "C528 442 543 502 555 572",
  },
  "hair-crown-surface":{
    original:"M-44 445C-20 351 10 285 75 238"+
      "C110 207 150 190 178 188"+
      "C216 183 238 198 260 195"+
      "C306 187 340 207 380 230"+
      "C422 256 451 310 476 345",
    replacement:"M-44 452C-20 360 10 292 75 247"+
      "C110 214 150 194 178 193"+
      "C216 191 238 204 260 202"+
      "C306 194 340 214 380 239"+
      "C422 270 451 323 476 358",
  },
  "hair-right-curtain":{
    original:"M379 222C425 257 461 303 483 359"+
      "C500 404 506 448 516 493"+
      "C528 535 534 562 544 609",
    replacement:"M379 231C425 267 461 318 483 369"+
      "C500 404 506 448 516 493"+
      "C528 535 534 562 544 609",
    endOriginal:"C468 500 452 449 447 404C439 353 406 256 379 222Z",
    endReplacement:"C468 500 452 449 447 404C439 353 406 256 379 231Z",
  },
};
export function crayonF1PhotographicHairEdgeV57(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  if(CRAYON_F1_V57_SOURCE.sha!==
     "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2"||
     CRAYON_F1_V57_SOURCE.observedX.length!==22||
     CRAYON_F1_V57_SOURCE.v56RenderedTop.length!==22)
    throw new RangeError("V57 original CC0 source registration changed");
  const unique=new Set<string>(),changed=new Set<Mass>();
  const out=elements.map(el=>{
    if(unique.has(el.id))throw new RangeError("Duplicate V56 source anatomy "+el.id);
    unique.add(el.id);
    if(!Object.prototype.hasOwnProperty.call(SHAPES,el.id))return el;
    const id=el.id as Mass,shape=SHAPES[id];
    if(el.kind!=="wax"||el.coverage!=="opaque"||
       el.parentId!==undefined||el.clipToParent===true||
       !el.d.startsWith(shape.original)||
       !el.d.endsWith(shape.endOriginal??"Z")||changed.has(id))
      throw new RangeError("V57 original V56 source contour unavailable "+id);
    changed.add(id);
    const tail=el.d.slice(shape.original.length);
    const revised=shape.replacement+(
      shape.endOriginal&&shape.endReplacement?
      tail.slice(0,-shape.endOriginal.length)+shape.endReplacement:tail);
    if(!revised.endsWith("Z")||revised===el.d||revised.includes("NaN"))
      throw new RangeError("V57 photo edge source continuity lost "+id);
    return {...el,d:revised};
  });
  if(changed.size!==CRAYON_F1_V56_IDS.length||
     [...unique].some(id=>id.startsWith("hair-source-lock-"))||
     ["hair-left-curtain","hair-rooted-crown-0","hair-rooted-right-0",
       "face-outline","iris-near","pupil-near","upper-lid-near",
       "cc0-hedge-dark-underpaint","source-brow-follicles-near"]
       .some(id=>!unique.has(id)))
    throw new RangeError("Missing native source-registered parent or rejected V51 marks");
  return out;
}
