import type {CrayonColor,CrayonElement} from "../../registry/video/materials/crayon-scene";

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
  strokes:string;strokeColor:CrayonColor;strokeWidth:number;strokePressure:number;
}>>={
  "brow-superciliary-near":{
    id:"source-brow-wax-near",
    // Dark source root is thinner than the broad diffuse shadow halo.
    // A single filled 27px-tall arch looked like a cut-paper cartoon.
    d:"M209 499 C228 489 244 479 258 476 "+
      "C273 471 285 472 298 475 "+
      "C312 478 321 483 326 489 "+
      "C315 486 306 483 295 483 "+
      "C274 481 260 484 244 489 "+
      "C227 494 216 499 209 499Z",
    bounds:{x:205,y:468,width:125,height:38},
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
    d:"M403 462 C416 451 431 442 446 440 "+
      "C458 439 467 442 472 447 "+
      "C456 445 445 448 434 454 "+
      "C420 459 408 463 403 462Z",
    bounds:{x:400,y:434,width:77,height:35},
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

/**
 * Source-aligned eyes have soft eyebrow halo and a much tighter dark core.
 * A separate open wax-edge field avoids a hard vector polygon boundary.
 * This still deposits real wax marks; it never fades the face itself.
 */
const haloD:Readonly<Record<string,string>>={
  near:"M198 504 C212 491 231 477 249 471 "+
    "C265 463 284 465 298 469 "+
    "C315 474 326 480 331 488 "+
    "C319 485 304 480 291 480 "+
    "C267 479 254 484 240 490 "+
    "C222 498 208 505 198 504Z",
  far:"M397 464 C409 448 430 438 445 436 "+
    "C459 434 470 439 476 446 "+
    "C458 442 445 445 433 450 "+
    "C416 457 402 463 397 464Z",
};

/** Keeps every source-rooted cubic but shortens individual hairs,
 * rather than drawing cartoon-length diagonal eyebrow hash marks.
 * Each control point moves toward its OWN root so local variation is
 * never replaced by a uniform stamp. */
function sourceRootedFiberScale(d:string,scale:number):string{
  const pattern=/M(\d+) (\d+) C(\d+) (\d+) (\d+) (\d+) (\d+) (\d+)/g;
  let count=0;
  const result=d.replace(pattern,(_,mx,my,x1,y1,x2,y2,x3,y3)=>{
    count++;
    const rx=Number(mx),ry=Number(my);
    const pos=(x:string,y:string)=>[
      +(rx+(Number(x)-rx)*scale).toFixed(2),
      +(ry+(Number(y)-ry)*scale).toFixed(2),
    ].join(" ");
    return "M"+rx+" "+ry+" C"+pos(x1,y1)+" "+pos(x2,y2)+" "+pos(x3,y3);
  });
  if(count<8||result.includes("undefined"))throw new Error("Bad F1 wax fibers");
  return result;
}

/**
 * Source has only a narrow dense dark band, surrounded by translucent
 * mixed wax on paper. The tiny rubbed core stays opaque, while the
 * anatomically shaped main arch remains an OPEN native pigment layer,
 * preventing a brown digital silhouette sticker.
 */
const vein:Readonly<Record<string,{d:string;bounds:Wax["bounds"]}>>={
  near:{
    d:"M227 491 C240 483 255 479 267 477 "+
      "C281 474 293 477 304 480 "+
      "C295 479 285 478 275 480 "+
      "C260 481 244 487 227 491Z",
    bounds:{x:223,y:470,width:85,height:25},
  },
  far:{
    d:"M415 454 C428 445 439 442 449 443 "+
      "C456 442 460 444 466 446 "+
      "C453 445 437 449 415 454Z",
    bounds:{x:411,y:437,width:59,height:21},
  },
};

/** Two halo glazes, two form-built wax roots, two dense veins and two fibers. */
export const CRAYON_F1_BROW_IDS=Object.freeze([
  "source-brow-feather-near","source-brow-wax-near",
  "source-brow-vein-near","source-brow-fibers-near",
  "source-brow-feather-far","source-brow-wax-far",
  "source-brow-vein-far","source-brow-fibers-far",
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
    const halo:Wax={
      ...element,
      id:near?"source-brow-feather-near":"source-brow-feather-far",
      d:haloD[near?"near":"far"],
      colors:near?["#906961","#604646","#aa847b"]:
        ["#886963","#5d494b","#aa837a"],
      pressure:near?.57:.54,spacing:near?5.7:6.1,
      markStrength:near?.12:.11,
      blendRadius:near?8.5:7.6,featherContacts:true,
      underpaintTooth:0,
      outlineOpacity:0,
    };
    const wax:Wax={
      ...element,
      id:spec.id,d:spec.d,bounds:spec.bounds,
      // Dark source-root color is built with overlapping OPEN pigment
      // contact and a separate microscopic opaque center vein, never
      // one flat brown wedge with geometrically sharp boundaries.
      colors:spec.colors,coverage:"open",
      featherContacts:true,blendRadius:near?4.3:3.7,
      pressure:near?.83:.81,
      spacing:near?4.7:4.9,markStrength:near?.26:.23,
      underpaintTooth:0,underpaintGradient:undefined,
      edgeRoughness:.13,outlineOpacity:0,
    };
    const core=vein[near?"near":"far"];
    const center:Wax={
      ...element,
      id:near?"source-brow-vein-near":"source-brow-vein-far",
      d:core.d,bounds:core.bounds,
      coverage:"opaque",
      featherContacts:false,blendRadius:undefined,
      underpaintTooth:near?.22:.17,
      underpaintGradient:spec.gradient,
      colors:near?["#684a45","#3e3032","#8f6860"]:
        ["#644945","#413235","#85645d"],
      pressure:near?.79:.75,spacing:near?4.4:4.6,
      markStrength:near?.13:.12,
      edgeRoughness:.07,outlineOpacity:0,
    };
    out.push(halo,wax,center,element);
    // The texture marks are single continuous native dry wax fibers,
    // not a uniform row of digital strokes or random disconnected dots.
    const fibers:Contour={
      kind:"contour",
      id:near?"source-brow-fibers-near":"source-brow-fibers-far",
      d:sourceRootedFiberScale(spec.strokes,near?.62:.66),
      color:spec.strokeColor,
      width:near?.28:.24,opacity:near?.51:.49,
      waxContact:"dry-wax",waxPressure:near?.52:.49,
      parentId:"face-outline",clipToParent:true,
      timing:{start:199,end:297},
    };
    out.push(fibers);
  }
  for(const id of Object.keys(arch))
    if(!seen.has(id))throw new RangeError("F1 eyebrow root missing: "+id);
  return out;
}
