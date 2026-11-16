import { pencilHash } from "../../registry/video/colored-pencil";
import type { PencilAspect, PencilDrawingSpec, PencilRegion, PencilTrace } from "../../registry/video/colored-pencil";
import { createPencilMaterialRegion } from "../../registry/video/colored-pencil-materials";
import { createPencilFoundationDrawing } from "../../registry/video/colored-pencil-foundation";
import type { PencilSurface } from "../../registry/video/colored-pencil-materials";
import { newCharacterHeadStageOne } from "./colored-pencil-first-character";

/**
 * Original, authored anatomy studies based on observation of pencil technique,
 * not tracing an existing portrait, animal illustration or landscape.
 * Every subject can be replaced with its own authored silhouette and landmarks.
 */
export const PENCIL_LIVING_STUDIES = ["portrait", "fox", "valley"] as const;
export type PencilLivingStudy = typeof PENCIL_LIVING_STUDIES[number];
export type PencilPalette = readonly [string,string,string];
export interface PencilSubjectPart {
  id: string;
  path: string;
  bounds: readonly [number,number,number,number];
  material: PencilSurface;
  palette: PencilPalette;
  details?: readonly PencilTrace[];
  direction?: number;
  flow?: number;
  /** In authored local subject coordinates, not shot-specific screen coordinates. */
  start?: number;
}
const mark = (path:string, color:string, width=.8, startFrame=206,
  opacity=.83):PencilTrace => ({
    path, color, width, startFrame, durationFrames:50, opacity,
  });
const fmt=(x:number)=>x.toFixed(2);
type Bundle = readonly [number,number,number,number,number,number,number,number];
/** Hand-authored hair/feather/needle root tracks with bounded seeded separation. */
export function flowBundles(
  guides:readonly Bundle[], seed:number, ink:string, width=.68, start=225,
):PencilTrace[] {
  if (!guides.length || guides.length>16 || !Number.isSafeInteger(seed) || seed<0)
    throw new RangeError("Need finite, bounded authored flow guides.");
  return guides.map(([x0,y0,x1,y1,cx,cy,count,spread],group)=>{
    if (![x0,y0,x1,y1,cx,cy,count,spread].every(Number.isFinite) ||
      !Number.isSafeInteger(count) || count<2 || count>36 ||
      spread<0 || spread>24 || Math.hypot(x1-x0,y1-y0)<2)
      throw new RangeError("Unbounded pencil anatomy guide.");
    const paths:string[]=[];
    for(let i=0;i<count;i++){
      const shift=(i-(count-1)/2)*spread/count +
        (pencilHash(seed,group*41+i,7)-.5)*spread*.12;
      const stagger=(pencilHash(seed,group*41+i,13)-.5)*5;
      // Coherent hair/fur fan: each strand curves with its authored local tract.
      paths.push("M"+fmt(x0+shift)+" "+fmt(y0+stagger)+" Q"+
        fmt(cx+shift*.82)+" "+fmt(cy+stagger*.65)+" "+
        fmt(x1+shift*.54)+" "+fmt(y1+stagger*.4));
    }
    return mark(paths.join(" "),ink,width,start+group*5,.76);
  });
}


/** Local observed fur tracts, not a uniformly spaced hatch across a face.
 * Each tangent-aligned strand begins near a curved skin-plane guide; length,
 * normal spread and timing vary deterministically. The short strokes remain
 * readable at 1x and have separate underfur, shadow and highlight families.
 *
 * Evidence: Bonny Snowdon's fox construction sequence and Darren Gwatkin's
 * profile, both studied for fur direction only (no third-party paths traced).
 */
export function pencilRootedFur(
  guides:readonly Bundle[],seed:number,
  palette:readonly [string,string,string],startFrame=222,
):PencilTrace[] {
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647||
     !Number.isSafeInteger(startFrame)||startFrame<0||
     guides.length<1||guides.length>8||
     palette.length!==3||palette.some(p=>!/^#[0-9A-F]{6}$/i.test(p)))
    throw new RangeError("Invalid rooted coloured-pencil fur inputs");
  const strokes:PencilTrace[]=[];
  guides.forEach(([x0,y0,x1,y1,cx,cy,count,spread],group)=>{
    if(![x0,y0,x1,y1,cx,cy,count,spread].every(Number.isFinite)||
       !Number.isSafeInteger(count)||count<12||count>36||
       spread<0||spread>22||Math.hypot(x1-x0,y1-y0)<5)
      throw new RangeError("Rooted fur needs measured finite anatomy guides");
    for(let layer=0;layer<3;layer++){
      const pieces:string[]=[];
      for(let i=0;i<count;i++){
        const index=group*109+layer*43+i;
        const t=Math.max(.025,Math.min(.975,
          (i+.5+(pencilHash(seed,index,31)-.5)*.82)/count));
        const u=1-t;
        const baseX=u*u*x0+2*u*t*cx+t*t*x1;
        const baseY=u*u*y0+2*u*t*cy+t*t*y1;
        const tangentX=2*u*(cx-x0)+2*t*(x1-cx);
        const tangentY=2*u*(cy-y0)+2*t*(y1-cy);
        const distance=Math.hypot(tangentX,tangentY);
        if(distance<.001)continue;
        const dx=tangentX/distance,dy=tangentY/distance;
        const nx=-dy,ny=dx;
        const offset=(pencilHash(seed,index,32)-.5)*spread;
        const len=(4.1+7.4*pencilHash(seed,index,33))*(layer===2?.69:1);
        const turn=(pencilHash(seed,index,34)-.5)*2.1;
        const ax=baseX+offset*nx,ay=baseY+offset*ny;
        const cx2=ax+dx*len*.52+nx*turn;
        const cy2=ay+dy*len*.52+ny*turn;
        const bx=ax+dx*len+nx*turn*.62;
        const by=ay+dy*len+ny*turn*.62;
        pieces.push("M"+fmt(ax)+" "+fmt(ay)+" Q"+fmt(cx2)+" "+fmt(cy2)+
          " "+fmt(bx)+" "+fmt(by));
      }
      strokes.push({...mark(pieces.join(" "),palette[layer],
        [.56,.38,.27][layer],startFrame+layer*7+group*3,[.69,.56,.62][layer]),
        id:"fibre-"+group+"-"+layer});
    }
  });
  return strokes;
}


/** Fine dry-pencil guard hairs rooted at a known part boundary. Each point
 * follows an authored parent quadratic, whose outward normal determines
 * the lift direction. No random hairs may appear detached in paper space.
 */
type FringeGuide=readonly [number,number,number,number,number,number,number,number];
function pencilContourFringe(
  guides:readonly FringeGuide[],seed:number,palette:PencilPalette,startFrame=248,
):PencilTrace[]{
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647||
     guides.length<1||guides.length>6||
     palette.some(c=>!/^#[0-9a-f]{6}$/i.test(c)))
    throw new RangeError("Invalid authored pencil contour fringe");
  const marks:PencilTrace[]=[];
  for(let layer=0;layer<3;layer++){
    const arcs:string[]=[];
    guides.forEach(([x0,y0,x1,y1,cx,cy,count,side],group)=>{
      if(![x0,y0,x1,y1,cx,cy,count,side].every(Number.isFinite)||
         !Number.isInteger(count)||count<16||count>40||
         (side!==1&&side!==-1)||
         Math.hypot(x1-x0,y1-y0)<8)
        throw new RangeError("Contour fringe must follow a bounded parent");
      for(let i=0;i<count;i++){
        const key=group*131+layer*43+i;
        const t=Math.max(.025,Math.min(.975,
          (i+.5+(pencilHash(seed,key,41)-.5)*.7)/count));
        const u=1-t;
        const x=u*u*x0+2*u*t*cx+t*t*x1;
        const y=u*u*y0+2*u*t*cy+t*t*y1;
        const tx=2*u*(cx-x0)+2*t*(x1-cx);
        const ty=2*u*(cy-y0)+2*t*(y1-cy);
        const mag=Math.hypot(tx,ty);
        if(mag<.001)continue;
        const nx=-ty/mag*side,ny=tx/mag*side;
        const travel=(3.2+5.1*pencilHash(seed,key,42))*
          (layer===2?.86:1);
        const root=1.2+1.6*pencilHash(seed,key,43);
        const bend=(pencilHash(seed,key,44)-.5)*2.8;
        const sx=x-nx*root,sy=y-ny*root;
        const ex=x+nx*travel,ey=y+ny*travel;
        const mx=(sx+ex)*.5+tx/mag*bend;
        const my=(sy+ey)*.5+ty/mag*bend;
        arcs.push("M"+fmt(sx)+" "+fmt(sy)+" Q"+
          fmt(mx)+" "+fmt(my)+" "+fmt(ex)+" "+fmt(ey));
      }
    });
    marks.push({...mark(arcs.join(" "),palette[layer],
      [.35,.29,.22][layer],startFrame+layer*6,
      [.74,.58,.68][layer]),id:"fringe-"+layer});
  }
  return marks;
}


// The former woman/portrait factory and all of its hand-authored regions
// were intentionally deleted. The replacement is a separate, fresh
// single-head construction in colored-pencil-first-character.ts.

function fox():PencilSubjectPart[] {
  const orange:PencilPalette=["#C9825D","#844C4C","#F4BC85"];
  const pale:PencilPalette=["#D5CEBB","#777D7B","#F4E8D7"];
  const charcoal:PencilPalette=["#674E46","#342F34","#AE9883"];
  const earth:PencilPalette=["#8B8773","#5F665C","#CBC2A3"];
  return [
    {id:"earth",material:"stone",palette:earth,
      path:"M28 395 Q98 378 161 393 Q235 384 301 389 Q378 373 433 393 L437 439 L20 439 Z",
      bounds:[18,370,423,73],start:32,
      details:[mark("M40 407 Q112 390 158 411 M208 411 Q302 393 415 407","#C5BFAB",1.4)]},
    {id:"ground-shadow",material:"cast-shadow",palette:["#77736B","#696A63","#B5AA9D"],
      path:"M78 380 Q190 367 328 378 Q384 381 401 396 Q228 417 96 401 Z",
      bounds:[73,362,333,57],start:36},
    {id:"tail-back",material:"fur",palette:["#A8624E","#684B46","#DEA77B"],
      // Brush tail is an anatomical continuation of the sitting rump: a
      // long softly tapering weight-bearing pelt along the ground. Preserve
      // its connection under the hindquarters, not a free round pompom.
      // Interleaved, unequal guard-hair tufts interrupt the silhouette.
      // The rump root stays behind the body while the white tip remains
      // within the distal pelt. Not a smooth tube or separate pompom.
      path:"M195 346 C178 337 161 332 144 331 "+
        "C133 327 123 330 113 330 C92 329 73 331 54 338 "+
        "C45 337 38 342 31 348 C24 349 18 354 15 362 "+
        "C11 366 13 369 14 372 C11 376 17 382 24 385 "+
        "C30 393 46 396 59 398 C70 403 82 401 94 404 "+
        "C117 406 139 398 155 391 C172 380 185 368 197 357 "+
        "C201 352 198 348 195 346 Z",
      bounds:[12,326,207,82],direction:157,start:60,
      details:[
        ...pencilRootedFur([
          [183,342,54,348,116,325,34,17],
          [180,367,46,385,114,402,33,17],
          [141,335,28,359,75,332,32,14],
          [163,381,72,399,125,410,32,14],
          [102,347,18,374,52,351,30,12],
          // Interlocking shallow scalp-to-distal fans keep the tail
          // densely furred instead of a long uniform diagonal hatch.
          [162,346,73,343,122,336,32,11],
          [148,377,34,383,97,398,33,12],
          [94,345,24,368,52,342,30,11],
        ],310,["#E2AE81","#74554F","#F0C79A"],224),
        ...pencilContourFringe([
          [150,330,34,349,82,324,31,-1],
          [28,390,151,391,91,409,32,1],
          [27,357,21,385,11,372,29,-1],
        ],1768,["#BE7859","#694C47","#F1BB8D"],255),
      ]},
    {id:"body",material:"fur",palette:orange,
      path:"M190 226 C211 216 244 221 266 239 C295 245 325 270 336 303 C348 336 335 366 317 383 Q292 400 262 389 Q236 386 222 381 Q195 392 174 374 Q153 355 156 322 C155 287 170 250 190 226 Z",
      bounds:[137,218,229,188],direction:73,start:73,
      details:[
        ...pencilRootedFur([
          [194,249,211,345,166,286,33,16],
          [243,233,265,373,244,291,35,15],
          [303,248,324,370,333,294,34,13],
        ],381,["#E7AE7E","#80544A","#F5D4A3"],224),
        ...pencilRootedFur([
          [168,281,193,343,172,310,34,15],
          [196,250,227,325,196,296,35,18],
          [241,245,267,346,267,293,35,19],
          [293,273,322,362,329,320,34,18],
          [219,358,302,386,264,380,33,12],
        ],1831,["#C8865D","#744E45","#ECC299"],244),
      ]},
    {id:"rear-leg",material:"fur",palette:charcoal,
      // ArtCraft native 960px review rejected even the first bent hock:
      // the ~80×74 dark cap read as a THIRD standing furry mound. In an
      // alert seated fox only a shortened rear metatarsus and toe pad
      // emerge from beneath the large russet haunch at ground level.
      // The hidden upper thigh stays orange; never extend a charcoal boot
      // from the rump to the grass just to fill empty picture space.
      path:"M328 369 C334 366 344 371 349 379 "+
        "C352 385 359 392 368 396 C373 399 372 403 367 405 "+
        "C359 408 353 405 348 404 C337 409 326 406 320 403 "+
        "C323 395 321 388 318 381 C318 374 322 369 328 369 Z",
      bounds:[315,364,59,46],direction:83,start:84,
      details:[
        ...pencilRootedFur([
          [326,377,345,398,334,387,27,7],
          [338,372,360,399,348,388,28,8],
          [322,389,345,404,336,399,27,6],
          [352,389,368,401,358,399,25,5],
        ],421,["#A69A8F","#605451","#C8B9A8"],234),
        {...mark("M326 374 C338 376 345 384 345 391 "+
          "M327 390 Q333 397 341 398",
          "#87736A",.44,261,.58),id:"hind-hock-plane"},
        {...mark("M323 400 Q330 403 335 402 "+
          "M338 404 Q347 407 352 402 "+
          "M356 402 Q363 405 369 400",
          "#443C3E",.37,269,.59),id:"hind-digit-folds"},
        {...mark("M327 405 l1.7 1.1 M345 406 l1.6 .7 "+
          "M362 404 l1.9 .8",
          "#3B3135",.30,276,.62),id:"hind-tiny-claws"},
        {...mark("M331 375 Q340 379 342 386 "+
          "M344 382 Q353 393 361 396 "+
          "M325 393 Q335 402 344 403",
          "#C0AE9D",.31,280,.45),id:"hind-fur-light-turn"},
      ]},
    {id:"foreleg-left",material:"fur",palette:charcoal,
      // The radius/ulna turn under the forearm taper into a slimmer wrist;
      // the foot flares only BELOW carpal flexion to expose four true digits.
      path:"M197 305 C207 307 216 315 219 328 "+
        "C221 337 217 347 213 358 C209 370 209 379 213 387 "+
        "C216 393 221 397 225 400 C228 402 225 406 221 408 "+
        "C215 411 207 408 201 405 C192 409 182 410 177 406 "+
        "C181 402 187 397 190 390 C193 383 192 373 192 364 "+
        "C191 352 184 342 187 328 C189 317 192 309 197 305 Z",
      bounds:[175,300,53,112],direction:79,start:90,
      details:[
        ...pencilRootedFur([
          [191,327,204,396,183,365,32,10],
        ],461,["#B6A594","#5E5150","#CBBDAA"],244),
        ...pencilRootedFur([
          [196,328,199,395,191,362,31,8],
          [209,342,215,397,205,372,28,8],
        ],2077,["#8C6B60","#393238","#BEA696"],250),
        // Named optical planes are thin, varied low-pressure pencil, not
        // a solid photograph-like gradient hiding the dark fur.
        {...mark("M198 316 Q206 335 204 352 "+
          "C201 367 198 377 206 392",
          "#D1B9A4",.44,263,.48),id:"far-antebrachial-plane"},
        {...mark("M190 380 Q188 393 183 403 "+
          "M206 387 Q211 398 219 405",
          "#54464A",.39,271,.60),id:"far-metacarpal-turn"},
        ...pencilRootedFur([
          [189,338,198,376,184,361,27,6],
          [213,335,205,374,216,359,26,6],
          [188,388,198,407,184,400,24,5],
        ],2167,["#B9A18D","#4E4142","#8A7770"],263),
        {...mark("M180 402 Q188 399 195 403 M197 406 Q205 402 212 405 M212 406 Q218 403 223 405",
          "#342E32",.58,260,.77),id:"paw-toes"},
        // Digit pads spread into four discrete low-pressure creases;
        // flexor lines begin on the leg and fade into the metacarpal fan.
        {...mark("M181 399 Q184 402 183 405 "+
          "M191 397 Q194 402 193 406 "+
          "M202 397 Q205 402 204 406 "+
          "M214 398 Q218 402 217 405",
          "#45393A",.42,266,.68),id:"toe-furrows"},
        {...mark("M182 405 l1.8 1.2 "+
          "M192 406 l1.6 .9 "+
          "M203 406 l1.8 1.1 "+
          "M216 405 l1.6 .8",
          "#342C30",.35,278,.65),id:"claw-tips"},
        {...mark("M190 354 Q188 371 184 389 "+
          "M197 351 Q197 373 192 393 "+
          "M205 355 Q205 375 203 392 "+
          "M213 356 Q212 376 215 394",
          "#9B8C83",.32,259,.48),id:"wrist-tendons"},
      ]},
    {id:"foreleg-right",material:"fur",palette:charcoal,
      // A light sagittal break in the near wrist, a broad weight-bearing
      // metacarpal and individually rounded toe pads; never a dark column.
      path:"M280 306 C289 307 295 319 297 332 "+
        "C300 343 295 353 291 363 C287 378 290 385 295 392 "+
        "C300 397 313 398 315 402 C319 406 315 408 309 409 "+
        "C300 411 291 408 282 406 C270 410 259 410 253 405 "+
        "C258 401 264 394 266 386 C268 376 266 361 267 350 "+
        "C267 335 271 311 280 306 Z",
      bounds:[250,302,68,110],direction:75,start:94,
      details:[
        ...pencilRootedFur([
          [270,332,282,399,273,372,33,9],
        ],489,["#B5A391","#655552","#C7B7A6"],242),
        ...pencilRootedFur([
          [278,328,279,395,277,371,31,10],
          [289,334,297,398,290,372,30,9],
        ],2129,["#8B695E","#3A3036","#B9A292"],248),
        {...mark("M282 318 Q289 341 283 355 "+
          "C280 371 279 383 289 393",
          "#C4AB99",.45,263,.50),id:"near-antebrachial-plane"},
        {...mark("M266 381 Q266 394 257 404 "+
          "M292 391 Q302 397 313 405",
          "#4A4042",.38,272,.60),id:"near-metacarpal-turn"},
        ...pencilRootedFur([
          [270,334,278,376,268,361,29,7],
          [291,339,283,379,297,361,27,6],
          [260,388,283,406,271,403,25,6],
        ],2201,["#BDA694","#514548","#998478"],266),
        {...mark("M255 405 Q267 401 278 404 M280 405 Q290 401 301 404 M301 405 Q308 402 314 405",
          "#3B3439",.58,260,.77),id:"paw-toes"},
        // Oblique near paw bears more weight; toe ridges are slightly
        // wider apart than the far foreleg and are not a drawn boot cuff.
        {...mark("M256 398 Q260 403 258 406 "+
          "M269 396 Q274 403 272 406 "+
          "M287 396 Q292 402 290 406 "+
          "M303 398 Q308 402 307 405",
          "#44393B",.43,266,.68),id:"toe-furrows"},
        {...mark("M257 405 l1.5 1 "+
          "M271 406 l1.7 .8 "+
          "M289 406 l1.9 .9 "+
          "M307 405 l1.6 .9",
          "#342C30",.35,278,.65),id:"claw-tips"},
        {...mark("M270 354 Q268 374 259 390 "+
          "M280 352 Q276 377 274 392 "+
          "M288 352 Q289 376 291 393 "+
          "M296 354 Q298 379 305 394",
          "#A3948A",.33,259,.48),id:"wrist-tendons"},
      ]},
    {id:"chest",material:"fur",palette:pale,
      path:"M191 242 C209 239 228 245 241 255 "+
        "C253 264 260 276 264 289 C266 304 267 317 261 330 "+
        // Smooth, interlocking sternum tufts instead of a stiff point.
        "C256 342 250 348 245 355 C242 359 238 356 235 349 "+
        "C231 354 226 351 222 346 C216 348 208 340 198 326 "+
        "C189 324 183 315 182 304 C176 296 174 281 180 268 "+
        "C181 256 185 247 191 242 Z",
      bounds:[171,236,102,135],direction:69,start:95,
      details:[
        ...pencilRootedFur([
          [194,250,222,328,196,305,31,11],
          [230,254,248,346,244,306,31,12],
        ],523,["#F8E9D4","#938780","#FFF2DB"],229),
        ...pencilRootedFur([
          [183,260,197,301,179,285,32,12],
          [205,259,220,335,211,298,35,12],
          [235,270,244,346,249,309,35,14],
          [252,283,249,350,263,313,30,12],
          [211,310,239,346,225,329,32,10],
          [228,316,245,352,243,335,31,9],
        ],1897,["#C6B5A1","#877E77","#FFF1D9"],249),
        {...mark("M205 316 Q213 333 224 342 "+
          "M226 337 Q235 348 243 352",
          "#AA9A8E",.29,278,.42),id:"fox-sternal-fur-turn"},
        mark("M196 267 Q211 289 219 319 M231 277 Q249 305 257 335",
          "#716E6D",.36,258,.50),
        // Every white edge fibre starts inside a measured chest curve and
        // lifts outside; the base color plane itself stays fully preserved.
        ...pencilContourFringe([
          [181,266,191,322,176,296,32,1],
          [264,285,245,361,267,319,32,-1],
          [245,354,217,346,231,350,30,-1],
          [216,343,192,317,203,337,28,1],
        ],901,["#E8DBC3","#9D9083","#FFF0D6"],253),
      ]},
    {id:"neck-ruff",material:"fur",palette:pale,
      path:"M162 237 C170 242 174 251 180 256 "+
        "C188 258 192 263 198 268 C206 268 214 271 220 278 "+
        "C230 280 236 287 235 297 C231 306 225 312 216 312 "+
        "C210 321 201 323 194 317 C184 319 176 313 170 305 "+
        "C160 300 157 288 159 280 C157 265 159 248 162 237 Z",
      bounds:[155,235,89,89],direction:59,start:104,
      details:[
        ...pencilRootedFur([
          [174,247,206,306,176,291,30,10],
          [204,258,231,301,222,283,30,9],
        ],557,["#F9E7CB","#938780","#FFF1D5"],232),
        ...pencilRootedFur([
          [166,251,191,307,164,284,30,11],
          [186,267,215,318,192,293,32,12],
          [210,269,225,307,233,287,29,12],
        ],1939,["#D7C3AC","#766D68","#FFF1D6"],244),
        ...pencilContourFringe([
          [159,253,167,301,155,278,29,1],
          [235,286,213,313,238,298,31,-1],
          [214,311,175,309,195,324,28,-1],
        ],903,["#DBCDB8","#A2998D","#FFF3DD"],253),
      ]},
    {id:"ear-far",material:"fur",palette:["#AD6B54","#704E49","#D8A17E"],
      // Far auricle is shorter and partly occluded by the cranial mass.
      path:"M176 190 C169 177 165 160 166 148 "+
        "Q164 139 172 137 C183 142 196 157 205 169 "+
        "Q200 184 187 191 Z",
      bounds:[160,135,53,61],direction:68,start:114,
      details:[
        mark("M171 141 Q174 157 184 174 M179 151 Q188 164 194 178",
          "#5D504D",.43,241,.55),
        ...pencilRootedFur([
          [169,147,189,178,174,160,30,8],
          [177,153,195,185,184,170,25,8],
        ],642,["#D7A58B","#665055","#F0D0B0"],252),
      ]},
    {id:"ear-far-inner",material:"fur",palette:["#94786E","#5D5054","#C8AA94"],
      path:"M176 166 C172 158 171 150 174 144 "+
        "Q184 153 190 167 Q193 177 185 180 "+
        "Q179 174 176 166 Z",
      bounds:[169,141,27,42],direction:75,start:131,
      details:[
        mark("M175 146 Q177 157 186 172 M179 152 Q186 162 188 174",
          "#594A4D",.39,245,.60),
        ...pencilRootedFur([
          [175,149,187,174,175,159,29,5],
          [178,157,187,178,181,165,25,5],
        ],1683,["#C69C86","#50474B","#EBD2BB"],256),
      ]},
    {id:"ear-near",material:"fur",palette:["#B67558","#765049","#E4A984"],
      // A fox's external helix is not a uniform russet leaf. Its pointed
      // apex turns into a rounded cartilaginous rim and a shaded basal
      // pocket; the root is buried by the overlying skull.
      path:"M246 185 C253 168 273 143 290 125 "+
        "C296 120 301 120 303 128 C305 146 300 164 289 189 "+
        "C277 195 259 191 246 185 Z",
      bounds:[242,118,67,79],direction:-69,start:115,
      details:[
        {...mark("M250 183 C265 158 284 136 292 127 "+
          "M293 125 Q298 122 301 128",
          "#EEC5A2",.39,246,.62),id:"near-pinna-helix-rim"},
        {...mark("M301 130 Q303 151 289 185 "+
          "M269 183 Q279 190 287 185",
          "#665050",.43,252,.65),id:"near-pinna-posterior-fold"},
        {...mark("M272 179 C279 183 285 185 291 187",
          "#5B484A",.44,261,.58),id:"near-auricular-base"},
        ...pencilRootedFur([
          [293,130,273,178,287,150,30,7],
          [296,144,284,184,294,163,27,7],
          [273,180,289,185,281,186,23,5],
        ],661,["#E0AB8C","#665357","#F2CBAB"],252),
      ]},
    {id:"ear-near-inner",material:"fur",palette:["#82665E","#493F47","#BF9D8C"],
      // The ear's recessed conchal bowl is smaller/darker than the
      // bright protective rim. Individual fine hairs grow from the
      // cartilage root toward its tip, not parallel across the auricle.
      path:"M275 170 C282 152 291 134 298 127 "+
        "C300 140 297 153 291 164 C286 175 282 182 276 181 "+
        "C274 179 273 175 275 170 Z",
      bounds:[272,126,29,58],direction:-66,start:131,
      details:[
        {...mark("M297 131 Q294 152 287 165 "+
          "M286 167 Q281 175 278 179",
          "#3D383F",.48,247,.83),id:"near-conchal-shadow"},
        {...mark("M279 174 C286 159 289 148 294 140 "+
          "M283 179 Q288 173 292 161",
          "#DCC0A9",.31,260,.57),id:"near-antihelix-reflection"},
        {...mark("M276 178 Q283 183 290 174",
          "#5D4A4C",.35,270,.60),id:"near-canal-base"},
        ...pencilRootedFur([
          [278,179,293,143,284,161,31,5],
          [283,175,298,134,293,157,29,5],
          [277,172,287,150,281,161,27,6],
        ],1711,["#C5A28B","#423C46","#E4C5A5"],256),
      ]},
    {id:"head-main",material:"fur",palette:["#B66C4E","#724849","#EBAE79"],
      // Three-quarter fox: skull widens behind the near orbit and narrows into
      // an oblique snout; avoid the old round bilateral mask.
      path:"M155 206 C173 181 191 162 220 152 C241 147 263 160 277 176 C287 194 285 210 274 223 Q255 241 232 236 C207 231 175 229 147 216 Q150 211 155 206 Z",
      bounds:[116,99,195,173],direction:43,start:112,
      details:[
        ...pencilRootedFur([
          [145,161,180,214,144,191,29,13],
          [191,130,227,172,218,144,28,17],
          [262,145,277,217,293,186,29,18],
          [164,216,222,247,178,250,26,14],
          [237,219,266,253,276,229,25,11],
        ],607,["#E5A17B","#874E46","#F6C296"],230),
        mark("M142 165 Q173 127 202 123 M213 114 Q262 118 281 157",
          "#E6A177",.81,232,.62),
        mark("M134 205 Q149 231 178 245 M260 235 Q245 253 221 258",
          "#714F4C",.67,258,.50),
        mark("M165 178 Q183 163 199 169 M230 178 Q250 166 272 185",
          "#8E5D4D",.65,244,.64),
        // Real fur grows in neighboring scalp, temple, orbital and cheek
        // fields, not a uniform hatch across a circular orange mask.
        ...pencilRootedFur([
          [149,164,193,180,172,151,34,10],
          [181,148,233,166,207,139,33,15],
          [241,146,276,193,281,162,31,14],
          [176,204,219,238,190,223,31,14],
          [255,210,274,239,284,217,28,13],
        ],1647,["#C98965","#704E4A","#F6CB95"],241),
        mark("M160 158 C178 139 203 139 223 144 M216 145 Q241 141 259 157",
          "#F7C99C",.62,248,.54),
        mark("M167 220 Q185 235 205 242 M234 239 Q248 237 259 228",
          "#7B5350",.55,257,.54),
      ]},
    {id:"periocular-form",material:"glaze",
      palette:["#B97959","#785047","#E4B28B"],
      path:"M188 189 C192 181 202 180 212 185 Q211 191 199 194 Q191 194 188 189 Z "+
        "M211 184 C227 172 246 168 260 176 Q274 183 272 194 C263 186 246 181 230 188 Q220 196 214 198 Z "+
        "M228 207 Q246 204 264 207 C259 225 247 229 236 235 C236 224 230 219 228 207 Z",
      bounds:[145,156,145,81],direction:36,start:130,
      details:[
        ...pencilRootedFur([
          [191,185,208,194,200,183,20,7],
          [217,178,275,195,246,168,25,8],
          [224,210,271,231,251,216,19,10],
        ],814,["#DCA083","#84574C","#EBC3A0"],236),
        mark("M191 186 Q201 180 212 185 M216 186 Q241 165 269 178",
          "#794C46",.61,241,.53),
        mark("M165 207 Q180 213 192 211 M224 213 Q248 216 270 205",
          "#ECC0A2",.66,253,.58),
      ]},
    {id:"mask",material:"fur",palette:["#8B604D","#543E3D","#B37D63"],
      // Thin shadow wedges stay attached to both orbital roofs. The far
      // socket recedes into the bridge rather than a black elliptical patch.
      path:"M198 189 Q202 186 207 188 Q204 191 201 191 Q199 191 198 189 Z "+
        "M232 188 C239 181 250 180 255 184 "+
        "C252 186 250 190 246 190 C240 189 237 189 232 188 Z",
      bounds:[193,176,68,26],direction:18,start:135,
      details:[
        mark("M198 188 Q203 186 208 188 M233 186 Q243 180 255 184",
          "#43393E",.62,251,.70),
        mark("M233 191 Q230 197 228 198 M240 191 Q246 193 250 188",
          "#59474A",.48,264,.62),
        ...pencilRootedFur([
          [195,188,209,193,201,185,17,4],
          [229,185,254,194,243,180,21,5],
        ],645,["#AA7965","#5F4A4C","#B99479"],250),
      ]},
    {id:"muzzle",material:"fur",palette:["#D6BFA6","#88786E","#F5DEC1"],
      // Source-led fox cranial triangle: nasal leather sits on a slim
      // taper and the maxilla broadens under the orbital/zygomatic plane.
      // A constant cream tube cannot model this canine skull.
      path:"M133 220 C141 215 153 213 165 211 "+
        "C182 205 208 200 230 205 C248 209 260 217 264 225 "+
        "C267 233 258 243 244 248 C229 253 208 251 192 246 "+
        "C171 240 157 236 144 234 C133 230 130 226 133 220 Z",
      bounds:[127,198,147,57],direction:14,start:146,
      details:[
        ...pencilRootedFur([
          [139,224,183,233,162,239,34,8],
          [174,215,218,244,200,239,34,10],
          [220,215,258,235,246,237,33,8],
          [149,231,208,246,176,247,32,8],
          // Tapered short hairs on the upper rostral plane travel toward
          // the nasal leather; longer cheek strands rotate caudally.
          [152,215,193,215,173,212,31,5],
          [180,220,233,225,210,219,33,9],
          [218,231,255,243,244,234,28,7],
        ],721,["#E9D2B7","#8D8177","#FFF0D3"],248),
        {...mark("M209 211 C227 208 247 210 258 220 "+
          "C260 230 254 237 244 242",
          "#A27D6F",.35,257,.50),id:"zygomatic-transition"},
        {...mark("M147 232 C168 237 187 246 211 247 "+
          "C230 250 249 242 254 236",
          "#78675F",.37,269,.54),id:"nasolabial-shadow"},
        // A distinct lightly recessed maxillary plane is the missing
        // 3D cheek/rostrum transition, not a second opaque cream sticker.
        {...mark("M153 221 C173 216 195 216 214 221 "+
          "C231 223 246 230 256 237",
          "#B69A83",.32,264,.45),id:"fox-maxillary-plane"},
        {...mark("M167 237 Q194 249 214 251 "+
          "Q240 253 258 238",
          "#7E6D66",.30,274,.51),id:"fox-mandibular-turn"},
        {...mark("M146 229 Q174 223 190 226 "+
          "M200 228 Q220 234 241 232",
          "#FFF0D7",.26,281,.58),id:"fox-rostral-highlight"},
        mark("M139 219 C164 214 192 208 216 211 M232 211 Q251 216 258 225",
          "#F8E6C6",.53,268,.59),
        mark("M146 234 Q168 241 192 245 M211 249 Q232 250 253 239",
          "#77665D",.36,278,.56),
        // Fuzzy orange-to-grey contact follows the nasal wedge, not a
        // perfectly hard, parallel tube edge or photo-texture.
        ...pencilContourFringe([
          [137,220,230,205,183,206,39,-1],
          [230,205,260,221,249,210,32,-1],
          [145,232,213,246,178,244,30,1],
        ],1021,["#C5957E","#77625B","#F3D9B9"],259),
      ]},
    {id:"rostrum-bridge",material:"glaze",
      palette:["#B27660","#80584F","#D59D7F"],
      // Warm dorsal septum connects nasal leather to the bony orbital
      // stop; each root follows the same fox skull perspective.
      path:"M140 213 C158 203 183 200 203 194 "+
        "C224 187 245 189 254 201 C238 212 218 217 188 219 "+
        "C164 220 149 221 140 218 Z",
      bounds:[136,185,123,41],direction:13,start:149,
      details:[
        ...pencilRootedFur([
          [146,214,204,213,173,197,33,9],
          [193,199,247,214,218,195,29,8],
        ],673,["#D49A7C","#715553","#F2C09E"],249),
        mark("M150 209 Q179 196 207 197 M200 216 Q225 207 245 211",
          "#BD7C69",.50,265,.58),
      ]},
    {id:"cheek-ruff",material:"fur",palette:pale,
      // Second ArtCraft VISUAL FAILURE: the first shorter ivory strip
      // still sat outside the cream chest as a separate drooping lobe.
      // Real fox ventral malar fur sweeps rearward/inward toward the
      // STRESSED cream thorax; only the hidden root is beneath the jaw.
      // This original dry-pencil coat now overlaps the existing cervical
      // field diagonally, where identical fur substrate prevents a sticker
      // while independent directional pigment passes retain local craft.
      path:"M249 227 C257 230 264 236 264 243 "+
        "C263 251 256 254 250 260 C245 266 241 274 238 283 "+
        "C235 277 229 273 226 264 C226 257 231 251 235 245 "+
        "C240 238 245 231 249 227 Z",
      bounds:[223,225,44,61],direction:56,start:150,
      details:[
        ...pencilRootedFur([
          [254,235,240,270,258,252,31,7],
          [248,242,235,278,239,260,33,7],
          [233,253,238,279,228,268,30,6],
          [250,254,242,281,252,271,29,5],
        ],765,["#E4D4BE","#8E867E","#FBEBD6"],257),
        {...mark("M250 234 Q248 249 239 264 "+
          "M245 252 Q240 267 236 277",
          "#F4DFC5",.36,279,.55),id:"fox-malar-light-fan"},
        {...mark("M255 242 C253 253 246 264 240 274 "+
          "M236 247 Q230 260 234 270",
          "#9B867A",.29,283,.43),id:"fox-cervical-turn"},
        ...pencilContourFringe([
          [263,243,238,283,261,268,30,-1],
          [238,282,249,227,223,257,31,1],
        ],905,["#E8D6BD","#A99C8D","#FFF2D8"],255),
      ]},
    {id:"eye-far",material:"glaze",palette:["#856B5E","#615250","#AE947D"],
      // Occluded far canthus: a shadow under the left brow, not a second eye.
      path:"M199 189 Q202 187 207 188 Q206 190 202 191 Q200 191 199 189 Z",
      bounds:[197,185,12,8],start:153,
      details:[
        mark("M199 189 Q203 186 207 188","#57443F",.38,253,.51),
        mark("M200 190 Q203 192 205 190","#A5816B",.25,264,.36),
        mark("M201 189 Q203 188 204 189","#544442",.24,272,.33),
      ]},
    {id:"eye-near",material:"glass",
      palette:["#866847","#34343A","#B69161"],
      // Miniature amber aperture recessed under superior brow shadow.
      // Upper eyelid darker than the receding inferior edge.
      // Real fox ocular anatomy: palpebral slit tucks beneath a heavier
      // supraorbital fur ridge. Never expose a white sclera or full circular
      // iris. The superior lid occludes the pupil's uppermost surface.
      path:"M235 189 C238 185 242 184 247 186 "+
        "C250 187 251 189 249 191 C246 194 241 194 238 192 "+
        "Q236 191 235 189 Z",
      bounds:[233,183,20,13],start:155,
      details:[
        {...mark("M233 189 C237 183 242 181 248 184 "+
          "Q253 184 256 186",
          "#242632",.64,249,.93),id:"fox-superior-tarsus"},
        {...mark("M237 191 Q242 194 248 192 Q252 190 253 188",
          "#6E5149",.35,258,.48),id:"fox-inferior-tarsus"},
        {...mark("M241 188 Q243 186 246 187 "+
          "Q249 189 246 191 Q243 192 241 188 Z",
          "#AC864E",.29,262,.72),id:"fox-iris-pigment"},
        {...mark("M245 187 Q246 189 245 191",
          "#22272C",.42,267,.91),id:"fox-vertical-pupil"},
        {...mark("M242 187 Q243 186 244 186.5",
          "#F7E4C9",.24,274,.66),id:"fox-corneal-glint"},
        {...mark("M228 184 C235 177 246 176 253 181 "+
          "Q256 183 257 185",
          "#82554B",.47,281,.62),id:"fox-supraorbital-arc"},
        {...mark("M231 195 Q242 201 250 195 "+
          "M239 198 Q247 199 254 191",
          "#A77A65",.32,287,.44),id:"fox-orbital-turn"},
        ...pencilRootedFur([
          [225,180,250,182,241,173,29,7],
          [230,196,254,195,242,202,28,6],
          [252,180,261,192,259,185,22,5],
        ],1779,["#B67E60","#604449","#E5AC84"],285),
      ]},
    {id:"whisker-roots",material:"glaze",palette:["#BEB2A2","#827874","#E9DBBE"],
      path:"M151 235 Q170 245 187 247 Q207 243 232 234 Q222 254 198 256 Q166 255 149 242 Z",
      bounds:[146,231,92,28],direction:10,start:171,
      details:[
        mark("M141 241 Q106 219 73 220 M143 247 Q99 241 67 259 M160 249 Q108 267 82 288",
          "#DED6C8",.49,275,.83),
        mark("M210 241 Q256 222 300 220 M216 247 Q257 247 311 255 M208 251 Q259 269 299 288",
          "#E4D3B9",.48,282,.82),
        mark("M152 238 L157 240 M161 244 L164 245 M206 245 L210 244 M214 249 L217 248",
          "#635A58",.48,279,.75),
      ]},
    {id:"nose",material:"fur",palette:["#333B41","#1C252D","#6F7070"],
      // Nasal leather is small, dark and part of the taper: two nostril
      // folds and an attached ventral philtrum, never a round button.
      path:"M132 220 C136 217 140 216 143 217 "+
        "C147 216 151 219 153 222 C153 225 149 227 146 229 "+
        "C143 232 140 232 138 230 C135 228 131 225 132 220 Z",
      bounds:[130,214,24,20],direction:14,start:160,
      details:[
        mark("M134 219 Q141 215 147 218","#96948A",.40,248,.54),
        mark("M136 224 Q140 227 143 224 M147 223 Q150 225 151 222",
          "#131F27",.43,260,.83),
        mark("M136 228 Q141 231 146 228","#89817C",.31,267,.65),
        {...mark("M144 230 Q150 232 151 236",
          "#62504D",.45,274,.67),id:"nasal-philtrum"},
        mark("M135 219 Q138 217 141 218","#DDD1BE",.23,277,.48),
      ]},
    {id:"tail-tip",material:"fur",palette:pale,
      // Cream brush hairs dissolve into the outer tip, turning back over the
      // lower russet pelt. Do not cover the middle with a round white sticker.
      // The terminal white coat interleaves along two staggered seams,
      // rather than ending at a single neat, rounded colour boundary.
      path:"M17 361 C24 352 39 343 54 340 "+
        "C61 342 61 346 58 349 C53 352 50 355 51 362 "+
        "C48 367 46 374 49 381 C52 388 59 391 67 394 "+
        "C57 398 44 398 33 392 C23 391 14 383 14 373 "+
        "C13 369 14 364 17 361 Z",
      bounds:[10,338,59,64],direction:164,start:180,
      details:[
        ...pencilRootedFur([
          [57,347,17,363,36,347,29,10],
          [62,393,17,383,42,397,30,10],
          [48,366,14,375,27,369,28,9],
          [58,351,22,358,39,346,31,8],
          [55,382,22,386,40,394,31,8],
        ],1999,["#F7E9D4","#988274","#FFF3D9"],263),
        {...mark("M60 348 Q54 353 52 360 "+
          "M50 366 Q46 375 51 383 M53 386 Q57 390 65 393",
          "#A8907D",.33,271,.43),id:"tail-tip-feathered-seam"},
        ...pencilContourFringe([
          [49,341,15,362,27,339,28,-1],
          [17,382,52,394,28,396,28,1],
        ],2177,["#E1C8AD","#A59181","#FFF3DD"],275),
      ]},

  ];
}

function conifer(x:number, y:number, h:number, id:string, far=false):PencilSubjectPart {
  const w=h*.30, top=y-h;
  const path="M"+fmt(x)+" "+fmt(top)+" Q"+fmt(x-10)+" "+fmt(y-h*.64)+" "+
    fmt(x-w*.64)+" "+fmt(y-h*.52)+" L"+fmt(x-w*.4)+" "+fmt(y-h*.50)+
    " L"+fmt(x-w)+" "+fmt(y-h*.20)+" L"+fmt(x-w*.35)+" "+fmt(y-h*.25)+
    " L"+fmt(x-w*.9)+" "+fmt(y-h*.07)+" Q"+fmt(x)+" "+fmt(y+4)+" "+
    fmt(x+w*.9)+" "+fmt(y-h*.07)+" L"+fmt(x+w*.35)+" "+fmt(y-h*.25)+
    " L"+fmt(x+w)+" "+fmt(y-h*.20)+" L"+fmt(x+w*.4)+" "+fmt(y-h*.50)+
    " L"+fmt(x+w*.64)+" "+fmt(y-h*.52)+" Q"+fmt(x+10)+" "+
    fmt(y-h*.64)+" "+fmt(x)+" "+fmt(top)+" Z";
  const details:string[]=["M"+fmt(x)+" "+fmt(top+6)+" L"+fmt(x)+" "+fmt(y+3)];
  for(let i=0;i<7;i++){
    const yy=top+15+(i/7)*(h-25);
    const arm=w*(.28+.72*i/7);
    details.push("M"+fmt(x)+" "+fmt(yy)+" Q"+fmt(x-arm*.5)+" "+
      fmt(yy+4)+" "+fmt(x-arm)+" "+fmt(yy+9),
      "M"+fmt(x)+" "+fmt(yy+2)+" Q"+fmt(x+arm*.5)+" "+
      fmt(yy+5)+" "+fmt(x+arm)+" "+fmt(yy+10));
  }
  return {id,path,bounds:[x-w-3,top-3,w*2+6,h+13],material:"foliage",
    palette:far?["#78958D","#55797F","#B7C7AC"]:["#527766","#2F5656","#A2AD86"],
    direction:73,flow:25,start:far?75:133,
    details:[mark(details.join(" "),far?"#B4CABC":"#ADC59A",far?.68:.86,215)]};
}
function valley():PencilSubjectPart[] {
  const mountains:PencilPalette=["#9FA9AD","#768A9A","#E2DBCB"];
  const water:PencilPalette=["#799BA2","#497784","#D7E3DA"];
  const moss:PencilPalette=["#75936C","#476A5C","#C0C6A0"];
  return [
    {id:"far-sky",material:"water",palette:["#D1DFD8","#A6C7D0","#FBF1D6"],
      path:"M0 0 L440 0 L440 258 Q231 215 0 260 Z",
      bounds:[0,0,440,263],direction:5,flow:5,start:24,
      details:[
        mark("M15 86 Q122 65 213 93 M261 70 Q365 60 428 82","#FFF7E9",1.8,211),
      ]},
    {id:"mountain-far",material:"stone",palette:mountains,
      path:"M0 254 L42 199 L63 222 L113 146 L145 181 L196 119 L218 148 L256 169 L292 139 L342 191 L377 156 L440 226 L440 301 L0 301 Z",
      bounds:[0,115,440,190],direction:62,flow:13,start:48,
      details:[
        mark("M113 146 L138 182 L154 178 M196 119 L176 177 L214 172 M292 139 L275 185 L312 181",
          "#F5EADD",1.3,209),
        mark("M53 227 L73 247 M185 157 L166 195 M355 201 L375 227",
          "#637B91",.8,224),
      ]},
    {id:"mountain-near",material:"stone",palette:["#7F918F","#4A7281","#B7BFB1"],
      path:"M0 286 Q63 237 115 249 L169 203 L228 257 L276 225 L355 263 Q400 233 440 258 L440 331 L0 331 Z",
      bounds:[0,199,440,137],direction:39,start:61,
      details:[mark("M158 222 L166 238 M225 265 L244 278 M276 234 L287 262",
        "#CDD4C4",1.1,217)]},
    {id:"distant-forest",material:"foliage",palette:["#77968A","#507C7D","#B0C5AA"],
      path:"M0 286 Q31 263 57 286 Q73 250 93 279 Q108 246 127 276 Q153 238 174 277 Q197 253 217 280 Q242 252 260 279 Q293 252 310 277 Q343 254 368 279 Q400 262 440 284 L440 337 L0 338 Z",
      bounds:[0,235,440,106],direction:70,start:72,
      details:[
        mark("M28 294 L28 266 M62 289 L62 252 M112 301 L112 250 M163 301 L163 251 M218 300 L218 269 M278 300 L278 266 M334 294 L334 267 M386 300 L386 267",
          "#355F65",.9,222),
      ]},
    {id:"midground-meadow",material:"foliage",palette:moss,
      path:"M0 334 Q91 304 147 331 Q227 309 286 328 Q370 306 440 331 L440 379 Q385 370 355 366 Q319 356 279 373 Q242 389 198 373 Q134 364 87 383 L0 379 Z",
      bounds:[0,302,440,91],direction:6,flow:20,start:90,
      details:[
        ...flowBundles([[22,333,69,376,32,358,20,21],[155,328,204,368,165,353,17,15],
          [308,326,342,371,333,348,17,16]],850,"#CED6A8",.66,236),
      ]},
    {id:"river",material:"water",palette:water,
      path:"M192 334 Q231 341 247 347 Q301 343 356 365 Q394 381 440 363 L440 441 L74 441 Q119 408 153 383 Q177 359 192 334 Z",
      bounds:[69,331,372,112],direction:5,flow:9,start:102,
      details:[
        mark("M195 354 Q230 359 268 353 M155 389 Q204 377 258 389 M265 404 Q328 390 415 405 M125 422 Q247 414 384 428",
          "#DCEAE3",1.6,223),
        mark("M222 368 Q275 375 314 363 M186 413 Q245 406 289 414 M321 387 Q355 385 390 391",
          "#416F85",1.15,236),
      ]},
    {id:"river-rock-left",material:"stone",palette:mountains,
      path:"M88 400 Q104 374 131 387 Q151 401 146 425 L77 428 Q74 414 88 400 Z",
      bounds:[74,373,79,59],start:133,
      details:[mark("M90 396 Q120 384 136 403","#E4DDCF",1.2,238)]},
    {id:"river-rock-right",material:"stone",palette:mountains,
      path:"M318 380 Q339 359 360 370 Q383 385 380 410 Q343 418 319 406 Z",
      bounds:[315,358,68,61],start:133,
      details:[mark("M326 386 Q341 370 361 378","#E5E1D3",1.2,239)]},
    {id:"left-bank",material:"foliage",palette:moss,
      path:"M0 349 Q62 344 111 365 Q144 370 148 390 Q126 405 89 414 Q42 426 0 421 Z",
      bounds:[0,340,152,87],direction:70,start:120,
      details:flowBundles([[14,351,45,406,23,389,22,19],[86,359,123,401,105,392,18,13]],
        941,"#BAD1A0",.74,245)},
    {id:"foreground-shore",material:"stone",palette:["#7C7A71","#4B6764","#C2B9A0"],
      path:"M0 410 Q56 394 109 416 Q159 420 177 439 L0 441 Z",
      bounds:[0,389,182,53],direction:13,start:131},
    conifer(36,334,172,"pine-left-a"),
    conifer(115,325,123,"pine-left-b"),
    conifer(374,336,189,"pine-right-a"),
    conifer(429,331,146,"pine-right-b"),
    conifer(187,315,68,"pine-far-a",true),
    conifer(286,312,74,"pine-far-b",true),
    {id:"wildflowers",material:"foliage",palette:["#AAAD79","#6A846F","#D3CB9A"],
      path:"M19 417 Q40 403 62 420 Q80 409 94 422 L99 439 L12 439 Z",
      bounds:[10,399,91,44],start:170,
      details:[
        mark("M27 424 L27 407 M42 427 L49 414 M69 429 L73 414 M82 432 L90 419",
          "#DFDCB1",1.2,252),
        mark("M23 410 L30 411 M48 412 L52 416 M71 412 L75 413",
          "#E7C39D",2.2,260),
      ]},
  ];
}

/** Only the object study is scene-specific; rendering remains the generic CP1 engine. */
export interface PencilLivingOptions {
  subject:PencilLivingStudy;
  aspect:PencilAspect;
  paperTooth?:number;
  seed?:number;
  pressure?:number;
  /** Stage-1 new head ONLY: include true contour-aligned pencil fibres. */
  headContourCraft?:boolean;
  /** New Human #01, opt-in photograph-unapproved cranial optical volume. */
  headVolumeWeave?:boolean;
  /** Source-led oblique skull-shape A/B, unapproved pending source photos. */
  headSilhouetteStudy?:boolean;
}
export function pencilLivingStudyDrawing({
  subject, aspect, paperTooth=.76, seed=271, pressure=1,
  headContourCraft=true,headVolumeWeave=false,headSilhouetteStudy=false,
}:PencilLivingOptions):PencilDrawingSpec {
  if (!PENCIL_LIVING_STUDIES.includes(subject)) throw new RangeError("Unknown living pencil subject");
  if (aspect!=="landscape"&&aspect!=="portrait") throw new RangeError("Unknown pencil aspect");
  if (!Number.isFinite(paperTooth)||paperTooth<0||paperTooth>1)
    throw new RangeError("Invalid paper tooth");
  if (!Number.isSafeInteger(seed)||seed<0||seed>2147483000)
    throw new RangeError("Invalid pencil seed");
  if (!Number.isFinite(pressure)||pressure<.2||pressure>1.2)
    throw new RangeError("Invalid pencil pressure");
  if(typeof headContourCraft!=="boolean")
    throw new TypeError("headContourCraft must be boolean");
  if(typeof headVolumeWeave!=="boolean")
    throw new TypeError("headVolumeWeave must be boolean");
  if(typeof headSilhouetteStudy!=="boolean")
    throw new TypeError("headSilhouetteStudy must be boolean");
  const parts=subject==="portrait"?
    newCharacterHeadStageOne(seed,headContourCraft,headVolumeWeave,headSilhouetteStudy):subject==="fox"?fox():valley();
  // Compatibility subject="portrait" now renders the ONLY new character
  // under construction: head contour first. No retired woman geometry.
  const transform=aspect==="landscape"?"translate(441 35) scale(1.06)":
    subject==="valley"?"translate(-16 154) scale(1.31)":
    "translate(-31 145) scale(1.38)";
  const regions:PencilRegion[]=parts.map((part,i)=>{
    const region=createPencilMaterialRegion({
      id:part.id,surface:part.material,path:part.path,bounds:part.bounds,
      palette:part.palette,seed:(seed+i*373)%2147483647,
      startFrame:part.start??45,durationFrames:172,
      direction:part.direction,flow:part.flow,
      details:part.details,transform,craft:true,
    });
    const locallyRooted=subject==="fox"&&part.material==="fur";
    const softSkin=subject==="portrait"&&part.material==="skin";
    const fineHair=subject==="portrait"&&part.material==="hair";
    const furDensity=part.id==="head-main"?.80:
      part.id==="muzzle"?.70:
      part.id==="chest"||part.id==="neck-ruff"?.66:
      part.id==="tail-back"||part.id==="tail-tip"?.73:
      part.id==="body"?.59:
      part.id.startsWith("ear-")?.54:
      part.id.startsWith("foreleg-")?.48:.36;
    return {...region,
      // Whiskers are fine, floating pencil contacts from visible follicles;
      // never flood the chin with an opaque region or gradient undercoat.
      layeredSkinOverParent:false,
      opaqueSupport:subject==="fox"&&part.id==="whisker-roots"?
        false:region.opaqueSupport,
      underpaint:subject==="fox"&&part.id==="whisker-roots"?
        undefined:region.underpaint,
      underpaintOpacity:subject==="fox"&&part.id==="whisker-roots"?
        undefined:region.underpaintOpacity,
      // The fox iris has its own traced upper eyelid and pupil. Suppress
      // only the enclosing glass-vector ring, not the separate pencil marks.
      // A measured head-outline drawing needs a readable, hand-pressure
      // boundary at native film size; the glass/glaze recipe's almost
      // invisible .09 contour is inadequate for an anatomy block-in.
      // Do not flood the incomplete head with opaque wax/skin support.
      contour:subject==="portrait"?
        {...region.contour,color:"#8C6E66",width:.82,opacity:.56}:
        subject==="fox"&&part.id==="whisker-roots"?
        {...region.contour,opacity:.05}:
        subject==="fox"&&part.id==="muzzle"?
        {...region.contour,opacity:.16}:
        subject==="fox"&&
        ["chest","neck-ruff","cheek-ruff"].includes(part.id)?
        {...region.contour,opacity:.18}:
        subject==="fox"&&part.id==="eye-near"?
        {...region.contour,opacity:.17}:region.contour,
      craft:subject==="fox"&&part.id==="whisker-roots"?
        undefined:locallyRooted&&region.craft?{
        ...region.craft,pigmentDensity:furDensity,
        // Opt-in optical mixing: keep tonal light planes, but pigment marks
        // now own most of the fox coat's perceptual weight at native 1x.
        tonalSupportWeight:.64,
      }:region.craft,
      // New bare human outline stays clipped; keep original FOX guard
      // hair exceptions intact when retiring the woman-specific branches.
      clipDetails:subject==="portrait"?true:
        (part.id==="whisker-roots"||
        // Fox exterior fur tips genuinely extend beyond the solid pelt.
        (subject==="fox"&&(part.id==="nose"||part.id==="muzzle"||
          ["chest","neck-ruff","cheek-ruff","tail-back","tail-tip"].includes(part.id))))?
          false:region.clipDetails,
      layers:region.layers.map((layer,index)=>({
      ...layer,
      // Multiple dry-pencil colours follow the *same* authored fur-growth
      // tract. The generic +73/-44 crosshatch offsets made a synthetic
      // plaid over the fox, which real wildlife pencil studies avoid.
      // Keep the broad three-pass pigment model and every other subject
      // byte-identical; only the explicitly authored fox-fur atlas changes.
      // The single unfinished head must NOT receive the generic CP1
      // triangular crosshatch grid. Actual head-plane gestures are authored
      // separately in newHeadValuePencil along the ANAT1 bone axes.
      // These three optical layers deposit granular tooth contacts instead
      // of intersecting 25-unit "CAD" hairline stripes over the whole skull.
      // This changes no fox, valley or object material recipe.
      texture:subject==="portrait"?"stipple" as const:
        locallyRooted||fineHair?"fiber" as const:
        softSkin?"stipple" as const:layer.texture,
      spacing:subject==="portrait"?[6.1,8.3,11.5][index]:layer.spacing,
      angle:subject==="portrait"?[12,-23,49][index]:
        locallyRooted?region.layers[0].angle+[0,16,-12][index]:layer.angle,
      tipWidth:subject==="portrait"?[.53,.42,.34][index]:
        locallyRooted?layer.tipWidth*.85:
        fineHair?layer.tipWidth*.80:softSkin?layer.tipWidth*.70:layer.tipWidth,
      pressure:Math.min(1,layer.pressure*pressure*
        (subject==="portrait"?.46:locallyRooted?.90:softSkin?.85:1)),
    }))};
  });
  const reference=subject==="portrait"?{
    title:"COLORED PENCIL Magazine — portrait block-in method (2012)",
    url:"https://coloredpencilmag.com/wp-content/uploads/2017/02/COLORED_PENCIL_Magazine_10_October_2012.pdf",
    observation:"Begin with head contour, major bony landmarks and a measured value map; reserve facial features for individual approved stages.",
  }:subject==="fox"?{
    title:"Claire Milligan — coloured-pencil wildlife and fox",
    url:"https://www.clairemilliganart.com/patreon-video-tutorials",
    observation:"Fox ear attachment, narrower muzzle, graded eye socket and varied rooted fur lengths.",
  }:{
    title:"Peter Weatherill — landscape coloured-pencil example",
    url:"https://www.pencil-topics.co.uk/landscape-in-colored-pencil.html",
    observation:"Colour temperature separates distant mountains from foreground trees and shaded water.",
  };
  return createPencilFoundationDrawing({
    version:1,seed,paper:"#F8F4EA",paperTooth,
    width:aspect==="landscape"?960:540,
    height:aspect==="landscape"?540:960,regions,
  },{
    subject:subject==="portrait"?"human":subject==="fox"?"wildlife":"landscape",
    medium:"dry",
    references:[{...reference,rights:"technique-only"}],
    construction:subject==="portrait"?
      "Fresh single-person drawing, stage 1 only: verify one source-informed 36-anchor facial contour, cheekbone and jaw turning planes before drawing any eye, nose, mouth, ear, hair or clothing. The retired woman is deleted.":
      subject==="fox"?
      "Build head and ear cartilage over the torso, set eye sockets on the skull, align tapered muzzle, whisker roots and fur growth by form.":
      "Compose far mountains, stepped evergreen hierarchy, near banks and a river widening towards the camera, with directional light and aerial colour.",
    surfaces:Object.fromEntries(parts.map(part=>[part.id,part.material])),
  });
}
