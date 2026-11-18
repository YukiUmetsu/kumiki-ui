import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
import {CRAYON_PORTRAIT_AUDIT} from "./crayon-artcraft-portrait-audit";

/** V56 experimental photographic crown silhouette.
 * Exact source photo: 608x1082 CC0 Christopher Campbell browser-crop SHA.
 * A 9px wide, 22-row sustained brown-vs-green RGB scan reveals original
 * top hair y~194 at x300 and ~309 at x450. Existing V54 native sits y153
 * at x300 and y233 at x450: helmet dome too tall and far-side too high.
 * Modify only existing wax outer mass envelopes, NOT one of the original
 * 267+ rooted fiber subcurves, source hairline or any face/eye/foliage.
 */
export const CRAYON_F1_V56_SOURCE=Object.freeze({
  sha:CRAYON_PORTRAIT_AUDIT.source.sha256,
  x:[10,25,40,60,80,100,125,150,175,200,225,250,275,300,325,350,375,400,425,450,475,500] as const,
  originalY:[288,272,261,243,232,215,211,191,185,189,198,197,190,194,201,210,222,243,282,309,353,388] as const,
  v54Y:[268,249,234,218,204,193,184,177,171,168,166,160,154,153,156,163,172,185,205,233,272,330] as const,
  artisticApproval:false,
  method:"sustained brown>green material 9x22 source/photo column scan; hypothesis",
});
export const CRAYON_F1_V56_IDS=["hair-back","hair-crown-surface","hair-right-curtain"] as const;
type Id=typeof CRAYON_F1_V56_IDS[number];
const corrections:Readonly<Record<Id,{before:string;after:string;endBefore?:string;endAfter?:string}>>={
  "hair-back":{
    before:"M-45 422C-30 327 6 258 73 215"+
      "C126 179 185 183 247 167"+
      "C287 153 328 157 368 176"+
      "C424 191 465 252 491 307"+
      "C516 373 536 462 555 572",
    after:"M-45 446C-30 350 6 283 73 239"+
      "C108 210 146 187 177 188"+
      "C209 183 236 197 263 197"+
      "C300 182 343 204 376 225"+
      "C430 258 473 340 505 396"+
      "C528 440 543 502 555 572",
  },
  "hair-crown-surface":{
    before:"M-44 429C-24 322 6 263 72 216"+
      "C118 184 174 176 225 172"+
      "C270 165 283 158 305 164"+
      "C345 171 383 191 418 222"+
      "C452 250 464 290 476 328",
    after:"M-44 445C-20 351 10 285 75 238"+
      "C110 207 150 190 178 188"+
      "C216 183 238 198 260 195"+
      "C306 187 340 207 380 230"+
      "C422 256 451 310 476 345",
  },
  "hair-right-curtain":{
    before:"M379 191C425 203 460 242 479 295"+
      "C500 352 504 411 516 463"+
      "C528 519 534 558 544 609",
    after:"M379 222C425 257 461 303 483 359"+
      "C500 404 506 448 516 493"+
      "C528 535 534 562 544 609",
    endBefore:"C468 500 452 449 447 404C439 353 406 256 379 191Z",
    endAfter:"C468 500 452 449 447 404C439 353 406 256 379 222Z",
  },
};
export function crayonF1SourceOuterHairV56(elements:readonly CrayonElement[]):CrayonElement[]{
  if(CRAYON_F1_V56_SOURCE.sha!==
    "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2"||
     CRAYON_F1_V56_SOURCE.x.length!==22)
    throw new RangeError("V56 CC0 source pixel registration changed");
  const all=new Set<string>(),edited=new Set<Id>();
  const out=elements.map(el=>{
    if(all.has(el.id))throw new RangeError("Duplicated source wax "+el.id);
    all.add(el.id);
    if(!Object.prototype.hasOwnProperty.call(corrections,el.id))return el;
    const id=el.id as Id,rule=corrections[id];
    if(el.kind!=="wax"||el.parentId!==undefined||el.clipToParent===true||
       el.coverage!=="opaque"||!el.d.startsWith(rule.before)||
       !el.d.endsWith(rule.endBefore??"Z")||edited.has(id))
      throw new RangeError("V56 unexpected original-source crown topology "+id);
    edited.add(id);
    let d=rule.after+el.d.slice(rule.before.length);
    if(rule.endBefore&&rule.endAfter)
      d=d.slice(0,-rule.endBefore.length)+rule.endAfter;
    if(!d.endsWith("Z")||d.includes("NaN"))
      throw new RangeError("Disconnected original hair silhouette");
    return {...el,d};
  });
  if(edited.size!==CRAYON_F1_V56_IDS.length||
     [...all].some(id=>id.startsWith("hair-source-lock-"))||
     ["hair-left-curtain","hair-rooted-crown-0","hair-rooted-right-0",
       "face-outline","upper-lid-near","iris-near",
       "cc0-hedge-dark-underpaint","source-brow-follicles-near"]
       .some(id=>!all.has(id)))
    throw new RangeError("Incomplete original V54 hair/face/foliage");
  return out;
}
