import type {CrayonElement} from "../../registry/video/materials/crayon-scene";

type Contour=Extract<CrayonElement,{kind:"contour"}>;
export type CrayonF1LashFinish="sparse"|"rooted"|"rooted-flow";

/**
 * ArtCraft F1 lash construction: authored from source 608×1082 CC0 eye
 * close-ups. These are original CRAYON1 pressure-built cubic wax strokes,
 * not repeated SVG ticks/feather brush stamps or a photo mask.
 *
 * Near eye root follows the oblique lid from x217/y555, across x263/y535,
 * to x312/y542. The source contains dense asymmetric hair-root groups;
 * isolated equal-distance lines fail both root connectivity and texture.
 * Far eye, partly hair-covered, receives a shorter 14-stroke family.
 */
const clusters:Record<string,{paths:readonly string[];width:number;
  opacity:number;waxPressure:number}>={
  "lash-contact-near":{
    paths:[
      // Outer canthus: short down-left / tangential groups, not long rods.
      "M218 558 C217 558 216 557 215 555",
      "M220 555 C219 554 217 552 216 550",
      "M224 552 C223 550 221 549 220 547",
      "M228 549 C226 548 224 545 224 543",
      "M232 547 C231 544 228 542 227 541",
      "M236 545 C235 542 232 540 232 539",
      "M240 542 C239 540 237 538 236 536",
      "M244 540 C242 537 241 535 241 534",
      // Central lash-root bouquet, overlapped and deliberately unequal.
      "M247 539 C246 537 245 533 245 532",
      "M250 538 C248 536 247 533 248 530",
      "M253 537 C252 534 251 532 252 530",
      "M256 537 C255 534 255 531 256 529",
      "M259 536 C258 533 258 531 259 529",
      "M262 536 C262 533 262 530 263 529",
      "M266 535 C265 532 266 529 267 528",
      "M269 535 C269 532 269 530 271 529",
      "M272 535 C272 532 274 530 275 530",
      "M275 535 C276 532 277 529 279 530",
      // Medial side: compressed, mixed inward/outer releases.
      "M279 536 C281 533 281 532 283 532",
      "M283 536 C284 534 286 532 288 533",
      "M287 537 C290 535 291 533 292 534",
      "M291 538 C294 536 296 534 297 536",
      "M296 539 C299 537 301 537 303 538",
      "M300 540 C303 538 306 539 308 540",
      "M305 541 C307 540 309 541 311 542",
      // Fine roots weave through the main clump; not random field noise.
      "M232 548 C231 546 230 544 229 543",
      "M246 540 C244 538 243 537 243 535",
      "M261 537 C260 535 260 534 260 533",
      "M274 537 C275 535 276 534 278 534",
      "M287 538 C290 536 292 536 293 537",
      "M304 540 C306 542 308 543 309 543",
      "M224 552 C222 552 220 550 219 549",
      "M252 538 C252 537 252 535 253 533",
    ],
    width:.29,opacity:.66,waxPressure:.57,
  },
  "lash-contact-far":{
    paths:[
      "M406 529 C405 527 404 525 404 524",
      "M409 525 C407 522 406 520 406 518",
      "M412 519 C410 516 409 514 410 513",
      "M416 516 C414 513 412 511 413 510",
      "M420 513 C419 510 417 509 418 507",
      "M423 511 C423 508 421 506 422 505",
      "M427 509 C426 506 426 503 427 502",
      "M432 506 C432 503 433 500 434 500",
      "M437 505 C438 502 440 501 441 500",
      "M442 504 C444 502 446 501 447 502",
      "M447 502 C449 503 451 503 453 503",
      "M453 503 C455 504 457 504 458 506",
      "M421 514 C419 512 419 511 419 510",
      "M439 503 C440 504 442 504 444 503",
    ],
    width:.25,opacity:.62,waxPressure:.52,
  },
};

/** Source-authored paths above run root → tip for easy anatomical review.
 * Native crayon deposits terminal wax pickup at the END of a path. For
 * eyelashes that creates a black dot at the *thin free tip* (a false
 * mascara bead) and makes 33 strands look like a comb of little pegs.
 * Reversing the same cubic geometry puts the thicker terminal deposition
 * back inside the dark, parent-attached upper lash rim. It preserves every
 * control point and the original silhouette, but restores material flow.
 */
function depositTowardRoot(path:string):string{
  const m=/^M(-?\d+) (-?\d+) C(-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+)$/
    .exec(path);
  if(!m)throw new RangeError("Invalid ArtCraft cubic lash root");
  const [,x0,y0,x1,y1,x2,y2,x3,y3]=m;
  return "M"+x3+" "+y3+" C"+x2+" "+y2+" "+x1+" "+y1+" "+x0+" "+y0;
}


/**
 * Opt-in F1 ArtCraft v12 photo-observed lash *tip* length study.
 * v11 Chromium still revealed free tick-like eyelashes sticking out of
 * the upper lid despite all 47 roots being attached. This is a source
 * anatomy hypothesis, NOT a verified attractive render.
 *
 * Shorten each original hand-authored cubic by de Casteljau subdivision:
 * preserve its original root, tangent, curvature, asymmetry, 33/14 strand
 * count and terminal wax pickup at the true lid, but contract only the
 * source-visible free segment. Unlike moving the endpoint alone this
 * preserves geometric curvature of every authored strand.
 */
function depositShortF1Lash(path:string,maxReach:number):string{
  const m=/^M(-?\d+) (-?\d+) C(-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+)$/.exec(path);
  if(!m||!Number.isFinite(maxReach)||maxReach<=0)
    throw new RangeError("Invalid source-rooted F1 lash geometry");
  const xy=(a:number):Point=>[Number(m[a]),Number(m[a+1])];
  const p0=xy(1),p1=xy(3),p2=xy(5),p3=xy(7);
  const len=Math.hypot(p3[0]-p0[0],p3[1]-p0[1]);
  if(!Number.isFinite(len)||len<=0)throw new RangeError("Degenerate F1 lash");
  // Near source eye supports a longer central fan, far eye is hair-occluded.
  // Cap the long outliers; don't resample the original uneven spacing.
  const t=Math.min(.78,maxReach/len);
  const lerp=(p:Point,q:Point):Point=>[
    p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t,
  ];
  const a=lerp(p0,p1),b=lerp(p1,p2),c=lerp(p2,p3);
  const d=lerp(a,b),e=lerp(b,c),tip=lerp(d,e);
  const fmt=(p:Point)=>p[0].toFixed(2)+" "+p[1].toFixed(2);
  // Reverse the exact subdivided cubic: visible free tip first, wax
  // terminal density at the anatomical parent-rim root.
  return "M"+fmt(tip)+" C"+fmt(d)+" "+fmt(a)+" "+fmt(p0);
}

/**
 * ArtCraft topology gate for the opt-in F1 rooted lash construction.
 * Five-axis source deconstruction: these are two *different* photographed
 * upper-rim rails, not mirrored face-template curves. Check the deposited
 * thick end of EACH cubic (which is at the end after reversal) against that
 * anatomical root. A correct stroke count cannot detect floating lashes.
 *
 * Numerical source-space proximity is a necessary connectivity check, not
 * a pixel-fidelity, wax-realism or human-art-approval certificate.
 */
type Point=readonly [number,number];
type Cubic=readonly [Point,Point,Point,Point];
const sourceUpperRims:Readonly<Record<"near"|"far",readonly Cubic[]>>={
  near:[
    [[216,559],[231,545],[245,537],[264,535]],
    [[264,535],[288,533],[307,537],[318,544]],
  ],
  far:[
    [[404,529],[416,506],[435,500],[449,499]],
    [[449,499],[464,499],[474,506],[479,513]],
  ],
} as const;
const rootPoint=(c:Cubic,t:number):Point=>{
  const u=1-t;
  return [
    u*u*u*c[0][0]+3*u*u*t*c[1][0]+3*u*t*t*c[2][0]+t*t*t*c[3][0],
    u*u*u*c[0][1]+3*u*u*t*c[1][1]+3*u*t*t*c[2][1]+t*t*t*c[3][1],
  ];
};
function distanceToSourceRim(side:"near"|"far",point:Point):number{
  let best=Infinity;
  // Fixed sampling density is sufficient at 608×1082 source resolution;
  // all returned distances remain source pixels, independent of film camera.
  for(const curve of sourceUpperRims[side]){
    for(let i=0;i<=120;i++){
      const p=rootPoint(curve,i/120);
      best=Math.min(best,Math.hypot(point[0]-p[0],point[1]-p[1]));
    }
  }
  return best;
}
const depositedRoots=(d:string):Point[]=>{
  const number="-?\\d+(?:\\.\\d+)?";
  const re=new RegExp("M("+number+") ("+number+") C("+number+") ("+
    number+") ("+number+") ("+number+") ("+number+") ("+number+")","g");
  const points=Array.from(d.matchAll(re),match=>
    [Number(match[7]),Number(match[8])] as const);
  if(points.length===0||points.length!==(d.match(/M/g)??[]).length)
    throw new RangeError("Malformed source-rooted lash cubic");
  return points;
};
export interface CrayonF1LashRootAudit {
  readonly near:{count:number;maximumDistance:number;meanDistance:number;detached:number};
  readonly far:{count:number;maximumDistance:number;meanDistance:number;detached:number};
}
export function auditCrayonF1LashRootContinuity(
  elements:readonly CrayonElement[],tolerance=5.5,
):CrayonF1LashRootAudit{
  if(!Number.isFinite(tolerance)||tolerance<=0||tolerance>20)
    throw new RangeError("Invalid lash-to-tarsal tolerance");
  const report=(side:"near"|"far")=>{
    const matches=elements.filter(e=>e.id==="lash-contact-"+side);
    if(matches.length!==1||matches[0].kind!=="contour")
      throw new RangeError("Missing or duplicated F1 "+side+" eyelash contour");
    const roots=depositedRoots(matches[0].d);
    const distances=roots.map(p=>distanceToSourceRim(side,p));
    return {
      count:roots.length,
      maximumDistance:Math.max(...distances),
      meanDistance:distances.reduce((a,b)=>a+b,0)/distances.length,
      detached:distances.filter(d=>d>tolerance).length,
    };
  };
  return {near:report("near"),far:report("far")};
}

/** Preserve all original elements exactly unless the opt-in rooted finish
 * is requested; the global scene still uses the same absolute timing,
 * paper seed, outline clipping and semantic eye parents.
 */
export function crayonF1AddRootedLashes(elements:readonly CrayonElement[],
  finish:CrayonF1LashFinish="sparse"):CrayonElement[]{
  if(!["sparse","rooted","rooted-flow"].includes(finish))
    throw new RangeError("Invalid F1 native rooted lash finish");
  if(finish==="sparse")return [...elements];
  const result=elements.map(e=>{
    if(e.kind!=="contour")return e;
    const group=clusters[e.id];
    if(!group)return e;
    const flow=finish==="rooted-flow";
    const maxReach=e.id==="lash-contact-near"?5.2:3.9;
    return {...e,d:group.paths.map(path=>flow?
        depositShortF1Lash(path,maxReach):depositTowardRoot(path)).join(" "),
      width:flow?group.width*.87:group.width,
      opacity:flow?Math.min(.72,group.opacity*1.02):group.opacity,
      waxContact:"dry-wax",waxPressure:flow?
        group.waxPressure*.92:group.waxPressure} satisfies Contour;
  });
  const audit=auditCrayonF1LashRootContinuity(result);
  if(audit.near.detached||audit.far.detached)
    throw new RangeError("Source F1 lash roots detached from tarsal rim");
  return result;
}

export const CRAYON_F1_LASH_CLUSTER_COUNTS=Object.freeze({
  near:clusters["lash-contact-near"].paths.length,
  far:clusters["lash-contact-far"].paths.length,
});
