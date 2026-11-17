import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
import {CRAYON_PORTRAIT_AUDIT} from "./crayon-artcraft-portrait-audit";

/**
 * ArtCraft F1 V41 · source-observed hairline / upper-forehead occlusion.
 *
 * The byte-verified CC0 browser screenshot is 608 × 1082. Comparing its
 * forehead transition to V40's native Chromium at identical coordinates
 * shows a source-photo first skin transition of about y334 at x140 versus
 * V40's y355; at x400 the photo is about y327 and V40 about y302.
 * The V40 frontal-arc is too high on the far/right side and too low on
 * the near/left side. Reconstruct the continuous *same face* where hair
 * legitimately gives way to skin; do not paste skin over eye or fake roots.
 *
 * This is still a hypothesis, not artist approval. See V41 source/photo
 * measurement protocol and real output-pixel review in docs/research/.
 */
type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Id="face-outline"|"forehead-light"|"hair-right-curtain";
type SourceEdge={x:number;photoY:number;v40Y:number};
export const CRAYON_F1_V41_SOURCE=Object.freeze({
  sha:CRAYON_PORTRAIT_AUDIT.source.sha256,
  width:608,
  height:1082,
  // Photo source pixels and V40 native frame 299 measured with local 7x7
  // medians and a sustained warm-skin transition. These points exclude
  // ambiguous far-hair/skin x320 & x440 and should not be treated as a
  // dense ground-truth silhouette or 18 independently verified landmarks.
  edge:[
    {x:140,photoY:334,v40Y:355},
    {x:160,photoY:322,v40Y:331},
    {x:180,photoY:314,v40Y:315},
    {x:200,photoY:307,v40Y:304},
    {x:220,photoY:301,v40Y:296},
    {x:240,photoY:296,v40Y:290},
    {x:260,photoY:294,v40Y:287},
    {x:280,photoY:296,v40Y:287},
    {x:300,photoY:293,v40Y:287},
    {x:340,photoY:291,v40Y:285},
    {x:360,photoY:299,v40Y:288},
    {x:380,photoY:312,v40Y:293},
    {x:400,photoY:327,v40Y:302},
    {x:420,photoY:353,v40Y:316},
  ] as readonly SourceEdge[],
  artisticApproval:false,
} as const);

/** Preserve untouched complete lower skull and every fine art surface.
 * Change only the source-aligned upper face envelope and overlapping
 * near-crown light plane; curl the far curtain *over* the right temple.
 * The existing hair-crown, left curtain and all 18 original fine fiber
 * geometry remain byte-identical to V40.
 */
const revised:Readonly<Record<Id,{starts:string;d:string}>>={
  "face-outline":{
    starts:"M142 353C170 305 236 282 292 287",
    d:"M120 350C144 328 164 314 194 309"+
      "C218 298 245 291 275 294"+
      "C292 293 304 289 321 286"+
      "C346 278 368 302 382 310"+
      "C410 330 427 357 439 401"+
      "Q463 430 468 464"+
      "C479 538 492 604 501 682"+
      "Q510 731 495 775C477 809 444 843 404 856"+
      "C364 871 322 874 275 867Q206 857 172 820"+
      "C145 795 119 762 112 719Q101 669 106 604"+
      "Q108 530 108 467C111 421 118 389 120 350Z",
  },
  "forehead-light":{
    starts:"M159 357Q230 291 341 295",
    d:"M145 341C183 312 237 292 299 296"+
      "C362 292 412 325 435 380"+
      "Q449 420 422 465Q369 469 317 438"+
      "Q259 429 202 486Q151 462 135 431Z",
  },
  "hair-right-curtain":{
    starts:"M379 191C425 203 460 242 479 295",
    d:"M379 191C425 203 460 242 479 295"+
      "C500 352 504 411 516 463"+
      "C528 519 534 558 544 609"+
      "C559 669 557 730 573 787"+
      "C582 856 589 926 604 1009"+
      "Q617 1064 615 1091L434 1091"+
      "C455 1015 474 953 481 895"+
      "C491 830 486 770 493 712"+
      "C494 649 483 605 473 551"+
      "C468 500 452 449 447 404"+
      "C439 353 406 256 379 191Z",
  },
};

export const CRAYON_F1_V41_CHANGED_IDS=Object.freeze([
  "face-outline","forehead-light","hair-right-curtain",
] as const);

/** Does not add elements or alter skin material, crown texture, facial
 * anatomy, eye, mouth, nose, parent clipping, timings, or 300-frame film.
 */
export function crayonF1AlignAnat1HairlineV41(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const changed=new Set<Id>(),all=new Set<string>();
  const out=elements.map(el=>{
    if(all.has(el.id))throw new RangeError("Duplicated original ANAT1 feature "+el.id);
    all.add(el.id);
    if(!Object.prototype.hasOwnProperty.call(revised,el.id))return el;
    const id=el.id as Id;
    if(el.kind!=="wax"||!el.d.startsWith(revised[id].starts)||
       (id==="forehead-light"?
         (el.parentId!=="face-outline"||el.clipToParent!==true):
         (el.parentId!==undefined||el.clipToParent===true)))
      throw new RangeError("Unregistered face/hairline source wax "+el.id);
    changed.add(id);
    return {...el,d:revised[id].d} satisfies Wax;
  });
  if(changed.size!==CRAYON_F1_V41_CHANGED_IDS.length||
     !all.has("hair-crown-surface")||!all.has("hair-left-curtain")||
     !all.has("source-brow-follicles-near"))
    throw new RangeError("Incomplete photographed ANAT1 face/hair source");
  return out;
}
