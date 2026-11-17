import type {CrayonElement,CrayonColor} from "../../registry/video/materials/crayon-scene";

/**
 * F1 V43 experimental photographed foliage: irregular contours traced from
 * the exact CC0 608x1082 reference, NOT invented triplet leaf icons.
 * Christopher Campbell CC0 source screenshot SHA-256:
 * f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2
 *
 * From RGB blur Gaussian sigma=5, HSV green H 25..98 / S>55, score
 * G-.9R-.25B>18 (high-light pass >28), G>40, morphology close 9x9,
 * OpenCV RETR_EXTERNAL and approxPolyDP epsilon 2.3–3 source pixels.
 * 13 source green connected masses plus six smaller in-mass light islands.
 * These are licensed source-derived hand-wax study boundaries, not a
 * runtime image mask, photograph, copied stock foliage or bitmap shader.
 *
 * Only original V42 cc0-hedge-leaf/lamina nodes change. The original V41
 * entire face, 18 hair fiber IDs/cubics, 300-frame film, V42 foundation,
 * crown, frame seeds, paper and other source wax remain byte-identical.
 * ART HOLD: photograph pixel SSIM and complete animation review required.
 */
type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Ink=Extract<CrayonElement,{kind:"contour"}>;
type Point=readonly [number,number];
type SourcePatch={points:string;median:readonly [number,number,number]};
/** Measured from CC0 source green chroma contours, not imagined botanical icons.
 * Order: 13 spatial outer components by actual area, then 6 high-light islands.
 * No polygons are rasterized at runtime; cubic paths go to native wax engine.
 */
export const CRAYON_F1_V43_SOURCE_PATCHES:readonly SourcePatch[]=[
{points:"453,127 452,150 438,169 461,184 470,206 471,222 466,226 451,222 412,226 421,245 434,230 445,240 441,248 424,257 428,272 446,283 482,287 483,294 474,305 474,328 482,345 491,348 488,337 493,328 484,304 486,297 503,297 546,283 565,284 594,274 607,274 607,237 593,238 567,218 573,198 607,192 607,176 597,175 575,157 556,151 544,151 519,170 510,172 484,141",median:[41,73,14]},
{points:"212,91 201,84 164,75 131,87 107,73 95,56 76,75 66,61 52,57 43,48 0,47 0,55 25,58 52,73 76,78 84,91 81,110 104,116 108,123 104,132 91,138 54,145 39,133 49,112 38,103 0,87 0,103 7,111 0,118 0,243 33,259 38,255 35,234 47,228 51,201 72,208 103,209 118,200 119,190 109,183 95,183 91,177 93,165 109,145 118,145 137,160 137,172 145,171 142,163 154,145 151,138 135,127 119,131 113,127 127,106 163,105 184,99 203,101 212,98",median:[39,64,18]},
{points:"508,88 495,67 497,52 488,44 481,51 476,70 464,79 464,87 458,94 447,93 427,72 421,71 410,74 400,84 399,91 405,102 417,96 427,104 441,104 449,108 463,102 491,119 498,109 499,98",median:[26,50,20]},
{points:"540,69 542,77 563,94 587,93 607,100 607,63 576,59",median:[31,57,14]},
{points:"564,321 549,352 540,357 553,365 569,385 577,390 578,384 566,378 565,364 571,352 578,352 585,375 593,376 607,386 607,372 596,368 590,358 597,351 607,356 607,348 597,345 581,322 574,324",median:[36,63,21]},
{points:"141,22 115,7 119,19 100,47 109,50 120,42 135,39",median:[67,89,23]},
{points:"607,0 604,0 602,7 604,17 596,29 565,33 559,40 574,45 588,41 607,45",median:[33,58,19]},
{points:"290,148 293,155 297,156 307,155 318,159 323,156 323,151 315,146 311,134 302,144",median:[49,70,22]},
{points:"331,109 327,104 319,102 302,114 303,118 308,114 314,115 323,123 329,121",median:[65,91,25]},
{points:"593,109 590,113 607,131 607,111",median:[66,91,28]},
{points:"311,52 311,57 316,60 332,56 322,46 315,47",median:[32,57,24]},
{points:"577,623 573,632 576,647 582,654 579,637 584,626",median:[55,84,23]},
{points:"606,629 600,631 598,644 601,650 607,649",median:[74,102,27]},
{points:"467,146 461,149 449,168 471,187 477,213 487,232 472,243 456,243 430,262 431,267 450,276 494,278 501,284 510,285 521,279 521,276 511,270 503,270 499,262 510,239 512,181 500,174 480,147",median:[49,82,11]},
{points:"524,176 530,187 530,199 536,202 567,191 589,191 607,185 591,178 573,161 563,157 542,159",median:[44,82,15]},
{points:"583,234 573,231 559,239 542,273 569,276 595,267 586,253 587,243",median:[46,84,13]},
{points:"0,211 0,236 20,249 29,249 29,238 23,225 27,214 25,210",median:[44,82,25]},
{points:"30,159 30,171 43,185 53,177 64,174 59,153 49,155 37,151",median:[29,61,10]},
{points:"581,73 583,78 593,81 600,91 607,93 607,71",median:[46,82,24]},
] as const;

const n=(v:number)=>Number(v.toFixed(2));
const parsed=(p:string):Point[]=>p.split(" ").map(token=>{
  const [x,y]=token.split(",").map(Number);
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>607||y<0||y>1082)
    throw new RangeError("Source green contour escaped CC0 camera");
  return [x,y] as const;
});
/** Closed, source-led softened contour; preserving every authored turning
 * point avoids regular circles and symmetric, repeated fern icons.
 */
function cubicLoop(points:readonly Point[]):string{
  if(points.length<4)throw new RangeError("Invalid photographed foliage path");
  let d="M"+points[0][0]+" "+points[0][1];
  for(let i=0;i<points.length;i++){
    const p0=points[(i-1+points.length)%points.length];
    const p1=points[i],p2=points[(i+1)%points.length];
    const p3=points[(i+2)%points.length];
    // Tension .76: round only smaller aliasing (2-3px) from photo
    // threshold, never flatten the actual asymmetric parting outline.
    const tension=.115;
    const c1=[n(p1[0]+(p2[0]-p0[0])*tension),
      n(p1[1]+(p2[1]-p0[1])*tension)];
    const c2=[n(p2[0]-(p3[0]-p1[0])*tension),
      n(p2[1]-(p3[1]-p1[1])*tension)];
    d+=" C"+c1.join(" ")+" "+c2.join(" ")+" "+p2.join(" ");
  }
  return d+"Z";
}
const hex=(v:number)=>Math.min(255,Math.max(0,Math.round(v))).toString(16).padStart(2,"0");
function toColor([r,g,b]:readonly [number,number,number],scale:number):CrayonColor{
  return ("#"+hex(r*scale)+hex(g*scale)+hex(b*scale)) as CrayonColor;
}
/** Source-aligned short, partially disconnected dry-wax contact. No
 * geometric single long central vein that makes an artificial leaf icon.
 * The existing contour's parent masking prevents pigment escaping patch.
 */
function internalWax(points:readonly Point[],center:Point,length:number):string{
  const [cx,cy]=center;
  const spread=Math.min(11,length*.15);
  const a=[points[0],points[Math.floor(points.length*.35)],
    points[Math.floor(points.length*.73)]];
  return a.map((p,i)=>{
    const ox=(p[0]-cx)*.23,oy=(p[1]-cy)*.23;
    const x=cx+ox*.31+((i%2)*2-1)*spread*.3;
    const y=cy+oy*.31+(i-1)*spread*.42;
    return "M"+n(x)+" "+n(y)+" C"+n(x+ox*.24)+" "+
      n(y+oy*.21)+" "+n(x+ox*.54)+" "+n(y+oy*.52)+" "+
      n(x+ox*.70)+" "+n(y+oy*.65);
  }).join(" ");
}
export const CRAYON_F1_V43_PHOTOGRAPHIC_SOURCE={
  photo:"Christopher Campbell CC0 photographed 608x1082 woman / actual green canopy",
  sha256:"f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2",
  outerPatches:13,innerPatches:6,
  thresholdGreen:18,thresholdHighlight:28,gaussianSigma:5,
  artApproved:false,
} as const;

/** Refine only the V42 backgrounds. V42 retains its original selectable
 * triplet-leaf study. V43's real measured silhouettes are a fresh opt-in,
 * explicitly keeping 4 substrate masses + all 19 original source leaf
 * groups and 19 clipped microcontact groups at full detail.
 */
export function crayonF1RebuildPhotoFoliageV43(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const seen=new Set<string>(),original=new Map<string,CrayonElement>();
  const leaves:Wax[]=[];
  const laminae=new Map<string,Ink>();
  for(const el of elements){
    if(seen.has(el.id))throw new RangeError("Duplicate CC0 environment source id "+el.id);
    seen.add(el.id);original.set(el.id,el);
    if(el.id.startsWith("cc0-hedge-leaf-")){
      if(el.kind!=="wax"||el.renderLayer!=="backdrop")
        throw new RangeError("Unregistered CC0 leaf wax "+el.id);
      leaves.push(el);
    }else if(el.id.startsWith("cc0-hedge-lamina-")){
      if(el.kind!=="contour"||el.renderLayer!=="backdrop"||
         !el.clipToParent||!el.parentId?.startsWith("cc0-hedge-leaf-"))
        throw new RangeError("Disconnected CC0 lamina "+el.id);
      laminae.set(el.parentId,el);
    }
  }
  if(!leaves.length||leaves.length>CRAYON_F1_V43_SOURCE_PATCHES.length||
     leaves.length!==laminae.size||
     !seen.has("cc0-hedge-dark-underpaint")||
     !seen.has("cc0-hedge-far-pocket")||
     !seen.has("face-outline")||!seen.has("hair-crown-surface"))
    throw new RangeError("Incomplete source-registered background");
  const changed=new Map<string,CrayonElement>();
  for(let index=0;index<leaves.length;index++){
    const old=leaves[index];
    const trace=CRAYON_F1_V43_SOURCE_PATCHES[index];
    const points=parsed(trace.points);
    const minX=Math.min(...points.map(p=>p[0]));
    const minY=Math.min(...points.map(p=>p[1]));
    const maxX=Math.max(...points.map(p=>p[0]));
    const maxY=Math.max(...points.map(p=>p[1]));
    const dx=Math.max(1,maxX-minX),dy=Math.max(1,maxY-minY);
    const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
    const base=trace.median;
    // The foreground x>~500 has intentionally muted, dark green-black
    // photosensitive pigment. No synthetic chartreuse leaves.
    const colors=[
      toColor(base,.82),toColor(base,.42),toColor(base,1.12),
    ] as const;
    const wax:Wax={...old,d:cubicLoop(points),
      bounds:{x:minX-16,y:minY-16,width:dx+32,height:dy+32},
      colors,
      underpaintGradient:{
        light:toColor(base,1.04),
        shadow:toColor(base,.21),
        focusX:.52,focusY:.43,radius:1.42,
      },
      // For the far hedge, wax-tooth and feather contacts should look
      // optically soft at 1x; retain fibers/microrelief, not vector leaves.
      markStrength:.21,pressure:.67,spacing:9.7,
      blendRadius:18,edgeRoughness:.39,underpaintTooth:.34,
      opaqueBurnish:.61,featherContacts:true};
    changed.set(old.id,wax);
    const prev=laminae.get(old.id);
    if(!prev)throw new RangeError("Missing source wax-vein group for "+old.id);
    const ink:Ink={...prev,d:internalWax(points,[cx,cy],Math.hypot(dx,dy)),
      color:toColor(base,1.27),opacity:.18,width:.34,waxPressure:.39};
    changed.set(prev.id,ink);
  }
  if(changed.size!==leaves.length*2)
    throw new RangeError("Incomplete photographed botanical wax components");
  return elements.map(el=>changed.get(el.id)??el);
}
