import type {CrayonElement} from "../../registry/video/materials/crayon-scene";

type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Contour=Extract<CrayonElement,{kind:"contour"}>;

/**
 * ArtCraft v9: source-observed, source-space brow roots, not stamped
 * geometric cartoon arches or photo pixels.
 *
 * F1 CC0 Campbell browser screenshot, 608×1082:
 * near arch grows from x199/y508 -> darkest ridge x250..310/y478..485
 * -> sparse inner x329/y488. Far arch x402..465/y439..462 is
 * foreshortened and partly hidden by the foreground hair curtain.
 *
 * Actual reference vs previous render, same image pixels:
 * near brow center x235..308/y466..499:
 * source median RGB (116,79,70), old native (187,156,147).
 * A soft open-only eyebrow wash left the original skin color almost
 * untouched. Restore the connected anatomical eyebrow wax mass BEFORE
 * its existing fully detailed open pressure/feather glaze; then root
 * variable wax hair contacts in the same strip. The previous scene
 * remains an exact opt-out negative control.
 *
 * Wax crayon is not oil/soft pastel: hard/warm binder contact is from
 * the installed ArtCraft material study and PMA wax-crayon samples.
 */
const arch:Readonly<Record<string,{
  id:string;d:string;bounds:{x:number;y:number;width:number;height:number};
  colors:Wax["colors"];gradient:NonNullable<Wax["underpaintGradient"]>;
  strokes:string;strokeColor:string;strokeWidth:number;strokePressure:number;
}>>={
  "brow-superciliary-near":{
    id:"source-brow-wax-near",
    d:"M198 504 C212 491 231 477 249 471 "+
      "C265 463 284 465 298 469 "+
      "C315 474 326 480 331 488 "+
      "C319 485 304 480 291 480 "+
      "C267 479 254 484 240 490 "+
      "C222 498 208 505 198 504Z",
    bounds:{x:193,y:458,width:142,height:53},
    colors:["#71514e","#493638","#987369"],
    gradient:{
      light:"#946e63",shadow:"#443238",focusX:.58,focusY:.42,radius:.81,
    },
    strokes:[
      "M204 501 C208 496 214 491 219 489",
      "M210 500 C214 495 220 490 226 486",
      "M217 495 C222 490 228 485 233 482",
      "M223 495 C227 489 237 483 240 480",
      "M231 490 C237 484 242 479 246 475",
      "M237 488 C241 482 249 474 252 471",
      "M244 486 C249 480 256 473 261 470",
      "M249 484 C254 479 263 470 266 468",
      "M257 485 C260 478 266 469 272 468",
      "M265 483 C270 475 276 469 280 467",
      "M272 484 C276 477 281 471 285 470",
      "M281 483 C284 475 289 472 295 470",
      "M290 483 C293 475 297 471 303 474",
      "M297 481 C303 476 308 477 311 480",
      "M305 484 C309 481 313 481 318 483",
      "M312 486 C317 483 322 484 326 487",
      "M318 486 C321 482 324 485 329 488",
      "M229 490 C233 489 240 481 242 480",
      "M253 484 C261 479 267 475 271 472",
      "M275 481 C280 475 284 472 288 472",
    ].join(" "),
    strokeColor:"#49383a",strokeWidth:.39,strokePressure:.58,
  },
  "brow-superciliary-far":{
    id:"source-brow-wax-far",
    d:"M397 464 C409 448 430 438 445 436 "+
      "C459 434 470 439 476 446 "+
      "C458 442 445 445 433 450 "+
      "C416 457 402 463 397 464Z",
    bounds:{x:391,y:429,width:89,height:40},
    colors:["#70524f","#49373b","#93736b"],
    gradient:{
      light:"#997871",shadow:"#463538",focusX:.52,focusY:.44,radius:.84,
    },
    strokes:[
      "M403 462 C407 457 412 451 417 449",
      "M411 457 C415 452 421 447 426 444",
      "M417 456 C423 449 429 444 434 442",
      "M425 452 C432 444 438 440 441 439",
      "M435 447 C440 442 446 438 452 439",
      "M441 445 C447 440 455 439 460 443",
      "M452 444 C458 441 464 440 469 445",
      "M407 460 C412 455 416 453 422 450",
      "M428 452 C432 447 438 444 443 442",
    ].join(" "),
    strokeColor:"#48373a",strokeWidth:.32,strokePressure:.53,
  },
} as const;

/** Two opaque roots and two irregular paper-contact fiber groups. */
export const CRAYON_F1_BROW_IDS=Object.freeze([
  "source-brow-wax-near","source-brow-fibers-near",
  "source-brow-wax-far","source-brow-fibers-far",
] as const);

export function crayonF1ReconstructBrows(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const out:CrayonElement[]=[];
  const seen=new Set<string>();
  for(const element of elements){
    if(element.kind!=="wax"||!(element.id in arch)){
      out.push(element);continue;
    }
    const spec=arch[element.id];
    if(seen.has(element.id))throw new RangeError("Duplicate F1 brow "+element.id);
    seen.add(element.id);
    const near=element.id.endsWith("-near");
    const wax:Wax={
      ...element,
      id:spec.id,d:spec.d,bounds:spec.bounds,
      colors:spec.colors,coverage:"opaque",
      featherContacts:false,blendRadius:undefined,
      pressure:near?.88:.84,
      spacing:near?4.7:4.9,markStrength:near?.30:.27,
      underpaintTooth:near?.23:.19,
      underpaintGradient:spec.gradient,
      edgeRoughness:.14,outlineOpacity:0,
    };
    out.push(wax,element);
    // The texture marks are single continuous native dry wax fibers,
    // not a uniform row of digital strokes or random disconnected dots.
    const fibers:Contour={
      kind:"contour",
      id:near?"source-brow-fibers-near":"source-brow-fibers-far",
      d:spec.strokes,color:spec.strokeColor,
      width:spec.strokeWidth,opacity:near?.69:.63,
      waxContact:"dry-wax",waxPressure:spec.strokePressure,
      parentId:"face-outline",clipToParent:true,
      timing:{start:199,end:297},
    };
    out.push(fibers);
  }
  for(const id of Object.keys(arch))
    if(!seen.has(id))throw new RangeError("F1 eyebrow root missing: "+id);
  return out;
}
