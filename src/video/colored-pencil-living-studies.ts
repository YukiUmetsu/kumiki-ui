import { pencilHash } from "../../registry/video/colored-pencil";
import type { PencilAspect, PencilDrawingSpec, PencilRegion, PencilTrace } from "../../registry/video/colored-pencil";
import { createPencilMaterialRegion } from "../../registry/video/colored-pencil-materials";
import { createPencilFoundationDrawing } from "../../registry/video/colored-pencil-foundation";
import type { PencilSurface } from "../../registry/video/colored-pencil-materials";

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

function face():PencilSubjectPart[] {
  const skin:PencilPalette=["#DDA58F","#906277","#F4CEB0"];
  const lit:PencilPalette=["#F2C6AA","#B78082","#FFE0BF"];
  const hair:PencilPalette=["#684F50","#282E40","#B18471"];
  const shirt:PencilPalette=["#718E9C","#384F73","#CCD9D3"];
  return [
    {id:"hair-back",material:"hair",palette:hair,
      path:"M113 161 C100 102 146 56 212 50 C276 35 339 80 354 143 Q375 207 354 300 C367 348 343 401 309 426 Q286 388 280 310 L143 311 Q151 373 120 418 C94 370 101 306 100 253 Q95 202 113 161 Z",
      bounds:[94,35,283,395],direction:67,flow:32,start:30,
      details:flowBundles([
        [165,76,116,386,116,214,22,17],[218,55,160,377,166,204,22,18],
        [270,55,315,391,335,199,23,17],[313,83,342,335,367,208,18,16],
      ],1401,"#AC7C6A",.65,225)},
    {id:"coat-back",material:"fabric",palette:shirt,
      path:"M165 354 Q115 350 84 381 Q57 406 45 437 L405 437 Q391 383 351 367 Q315 353 286 354 Z",
      bounds:[43,349,365,91],direction:27,flow:28,start:34,
      details:[mark("M86 401 Q139 367 183 381 M320 369 Q359 385 384 427","#D4DCD1",2)]},
    {id:"neck",material:"skin",palette:skin,
      path:"M196 303 Q217 323 280 303 L277 359 Q249 388 214 361 L191 344 Z",
      bounds:[187,299,97,88],direction:68,flow:14,start:45,
      details:[mark("M198 333 Q236 359 277 329 M207 359 Q238 372 261 363","#F5CAB0",1.2,214)]},
    {id:"ear",material:"skin",palette:skin,
      path:"M295 218 Q323 195 334 222 Q343 250 317 265 Q310 266 302 252 Z",
      bounds:[292,195,53,76],direction:18,start:79,
      details:[mark("M313 216 Q329 214 329 232 Q326 241 317 245 M315 229 Q317 223 322 225","#956675",1.1,203)]},
    {id:"face-main",material:"skin",palette:["#D7A18C","#956C77","#EAC3AA"],
      // Asymmetric 3/4 cranial planes: temple -> malar cheek -> masseter -> chin.
      path:"M142 136 C154 99 199 88 248 98 C300 107 325 142 325 184 C324 226 310 266 291 299 C277 321 257 343 235 345 C207 343 179 322 165 296 C142 259 133 224 133 189 C132 168 135 150 142 136 Z",
      bounds:[128,88,201,261],direction:-28,flow:22,start:83,
      details:[
        mark("M144 181 C143 223 155 267 172 289 M297 157 Q314 202 299 237","#E4B29C",1.2,217,.62),
        mark("M165 229 Q173 241 188 244 M275 235 Q292 237 299 255","#A87683",.72,222,.49),
        mark("M174 278 C187 304 202 315 218 321 M266 323 Q280 313 289 293","#8E6876",.82,228,.55),
        mark("M203 326 Q237 346 258 330","#F4D3B7",.85,233,.58),
        mark("M154 170 Q178 154 200 160 M247 169 Q271 160 294 175","#F4D1AF",.95,238,.68),
        mark("M158 219 Q170 232 192 226 M243 230 Q269 235 290 224","#9F7580",.62,240,.53),
        mark("M186 296 Q195 302 202 310 M278 296 Q271 307 260 315","#B98582",.64,248,.54),
        ...flowBundles([
          [160,246,175,291,158,276,13,8],[274,251,293,283,301,270,11,9],
        ],1449,"#BA8580",.27,247),
      ]},
    {id:"temple-light",material:"glaze",palette:lit,
      path:"M145 145 C163 121 185 123 200 135 Q177 151 170 182 Q152 187 143 172 Z",
      bounds:[140,118,64,72],direction:39,start:97},
    {id:"cheek-light",material:"glaze",palette:lit,
      path:"M234 229 Q260 212 286 234 C292 251 280 272 260 277 Q237 278 230 260 Z",
      bounds:[227,209,69,72],direction:53,start:103,
      details:[mark("M238 250 Q257 240 278 248","#F9D3B6",.6,223,.56)]},
    {id:"eye-white-far",material:"skin",palette:["#CCB8B0","#997F83","#E4D3C9"],
      // Exposed sclera is an occluded warm sliver, never a complete white ellipse.
      path:"M158 207 C167 201 179 201 189 205 Q186 211 177 212 Q165 213 158 207 Z",
      bounds:[155,199,36,16],direction:7,start:137,
      details:[
        mark("M157 206 Q170 199 184 202 Q188 204 191 206","#634E55",1.14,202,.81),
        mark("M162 210 Q175 215 188 210","#AD8C8F",.67,220,.65),
        mark("M159 200 Q173 197 187 201","#B18B8B",.51,237,.49),
        mark("M158 207 Q161 211 163 211 M188 206 L191 206","#D5ABA4",.50,240,.62),
      ]},
    {id:"iris-far",material:"glass",palette:["#768383","#3E575A","#AAB4AC"],
      path:"M172 203 C176 201 181 203 182 207 Q183 213 178 214 Q174 214 172 209 Z",
      bounds:[170,201,15,14],start:147,
      details:[
        mark("M174 205 Q177 202 181 206 M174 210 Q178 214 182 210","#394A52",.52,231,.78),
        mark("M175 204 L176 205","#ECE7D7",.67,246,.88),
      ]},
    {id:"pupil-far",material:"ocular",palette:["#34414A","#202C37","#637478"],
      path:"M177 204 Q180 204 180 208 Q180 212 178 212 Q175 209 177 204 Z",
      bounds:[175,203,7,11],start:157,
      details:[mark("M176 205 L177 206","#F8EBDA",.48,245,.81)]},
    {id:"eye-white-near",material:"skin",palette:["#D5C1B5","#A68B8B","#ECE0D3"],
      path:"M242 207 C253 200 269 199 284 207 Q281 216 266 216 Q251 216 242 207 Z",
      bounds:[240,198,47,21],direction:6,start:138,
      details:[
        mark("M241 207 Q255 199 271 200 Q280 202 286 208","#654C54",1.19,202,.86),
        mark("M246 214 Q264 219 283 213","#B78C8E",.73,222,.69),
        mark("M244 200 Q261 193 284 202","#C2918D",.53,232,.57),
        mark("M241 208 Q243 211 248 212 M282 208 L286 209","#D4A9A5",.51,244,.61),
      ]},
    {id:"iris-near",material:"glass",palette:["#70858A","#354B57","#B5BEB4"],
      path:"M261 201 C265 198 271 200 273 204 Q275 212 269 215 Q263 215 261 208 Z",
      bounds:[259,198,16,19],start:145,
      details:[
        mark("M264 203 Q269 200 272 205 M263 211 Q267 217 273 209","#345460",.56,231,.83),
        mark("M265 202 Q267 201 269 202","#F6EEDC",.77,240,.89),
      ]},
    {id:"pupil-near",material:"ocular",palette:["#283B45","#192936","#52636E"],
      path:"M266 202 Q269 202 270 206 Q271 212 268 213 Q265 211 266 202 Z",
      bounds:[264,201,8,13],start:158,
      details:[mark("M265 204 L266 205","#FFF5E7",.53,244,.88)]},
    {id:"brows",material:"hair",palette:["#9C766D","#70595B","#C8A28E"],
      // Rooted low-pressure hair fan; opaque black eyebrow stickers rejected.
      path:"M154 184 Q170 174 185 177 Q191 178 195 181 L194 184 Q172 181 156 188 Z M244 183 Q261 173 278 177 Q286 179 291 184 L289 187 Q266 181 246 190 Z",
      bounds:[151,173,143,16],direction:5,start:147,
      details:[
        mark("M155 185 Q172 175 192 182 M246 185 Q266 176 289 184","#6C5658",.51,227,.75),
        ...flowBundles([[158,184,192,182,172,176,20,4],
          [247,185,288,183,267,177,22,4]],1509,"#574C51",.24,243),
        mark("M159 192 Q175 189 186 188 M253 193 Q278 189 290 192",
          "#AF8584",.43,253,.48),
      ]},
    {id:"nose-bridge",material:"glaze",palette:["#D4A58F","#A77479","#ECC5AA"],
      // Skin-connected cartilage + softly glazed bridge: never an opaque white spear.
      path:"M227 194 C229 213 235 231 236 243 Q237 253 252 261 C260 268 250 276 237 275 Q223 275 221 265 Q231 244 227 194 Z",
      bounds:[218,193,45,87],direction:69,start:113,
      details:[
        mark("M230 207 Q236 226 239 244","#EFC8AD",.92,214,.64),
        mark("M223 259 Q225 267 233 268 M246 269 Q253 268 255 262",
          "#966A74",.78,226,.79),
        mark("M228 268 Q233 272 238 270 M246 270 Q250 269 252 266",
          "#695059",.61,232,.81),
        mark("M235 250 Q241 253 239 258 M225 261 Q230 263 235 265",
          "#DCA78F",.63,237,.72),
        mark("M228 276 Q241 279 251 272","#EDC7AF",.47,247,.52),
      ]},
    {id:"lip-upper",material:"skin",palette:["#C18F8A","#9F737A","#D9AA9B"],
      path:"M210 295 Q222 290 234 291 Q244 288 251 292 Q259 293 263 297 Q251 300 238 299 Q222 300 210 295 Z",
      bounds:[208,287,58,16],direction:10,start:157,
      details:[
        mark("M212 297 Q227 299 237 297 Q251 299 262 296","#815B65",.69,234,.73),
        mark("M217 291 Q226 290 232 293 M243 292 Q252 290 257 294","#E1B6A5",.52,240,.65),
      ]},
    {id:"lip-lower",material:"skin",palette:["#CDA29B","#AC8589","#E0B3A5"],
      path:"M211 300 Q226 304 237 302 Q252 305 262 299 Q253 311 240 313 Q226 313 211 300 Z",
      bounds:[209,297,56,18],direction:8,start:160,
      details:[
        mark("M218 305 Q240 311 254 305","#F0C7B4",.65,240,.68),
        mark("M225 314 Q241 317 252 313","#B48D88",.48,251,.45),
      ]},
    {id:"hair-crown",material:"hair",palette:hair,
      path:"M118 174 C111 128 127 95 153 78 Q181 57 224 57 Q299 55 331 117 Q321 125 297 125 Q270 95 249 106 Q204 126 180 143 Q151 162 134 194 Z",
      bounds:[110,55,226,146],direction:67,start:168,
      details:flowBundles([
        [159,85,133,166,112,106,18,17],[201,72,157,147,167,97,24,18],
        [248,68,197,130,218,90,23,16],[284,81,275,124,264,96,19,15],
      ],1477,"#CAA18A",.69,239)},
    {id:"hair-lock-left",material:"hair",palette:hair,
      path:"M151 119 Q125 170 146 237 Q154 297 148 356 Q135 399 110 420 Q152 414 174 375 Q177 311 164 260 Q147 202 169 155 Z",
      bounds:[108,116,75,307],direction:84,start:173,
      details:flowBundles([
        [147,153,126,401,122,278,16,14],[161,172,151,397,177,299,18,13],
      ],1511,"#BA8E78",.56,251)},
    {id:"hair-lock-right",material:"hair",palette:hair,
      path:"M321 122 Q349 171 330 242 Q312 308 332 368 Q342 398 357 415 Q326 413 309 389 Q290 360 294 324 Q308 249 309 189 Z",
      bounds:[290,119,73,298],direction:83,start:173,
      details:flowBundles([
        [326,145,341,399,351,278,17,14],[312,155,314,382,302,270,18,14],
      ],1549,"#BD9184",.59,251)},
    {id:"collar-left",material:"fabric",palette:shirt,
      path:"M161 347 Q192 350 224 380 Q200 397 183 431 Q150 400 133 364 Z",
      bounds:[131,343,95,92],direction:37,start:186,
      details:[mark("M148 365 Q179 385 185 421","#D7E2D8",1.55,243)]},
    {id:"collar-right",material:"fabric",palette:shirt,
      path:"M282 350 Q307 341 341 371 Q307 394 287 429 Q275 399 256 379 Z",
      bounds:[253,339,92,95],direction:55,start:188,
      details:[mark("M297 354 Q305 387 291 414","#D7E2D8",1.55,244)]},
  ];
}

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
      path:"M195 346 C177 335 154 329 129 330 "+
        "C104 327 78 329 52 339 C35 347 21 356 15 367 "+
        "C10 373 18 386 34 392 C60 401 91 405 119 403 "+
        "C150 400 175 383 195 359 C200 353 198 348 195 346 Z",
      bounds:[12,326,207,82],direction:157,start:60,
      details:[
        ...pencilRootedFur([
          [183,342,54,348,116,325,34,17],
          [180,367,46,385,114,402,33,17],
          [141,335,28,359,75,332,32,14],
          [163,381,72,399,125,410,32,14],
          [102,347,18,374,52,351,30,12],
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
      path:"M311 313 C331 316 344 332 344 349 C342 368 354 384 365 389 L369 402 Q357 407 344 404 Q325 410 312 400 C315 378 305 354 295 342 Z",
      bounds:[292,310,75,96],direction:72,start:84,
      details:pencilRootedFur([
        [318,333,335,388,326,365,30,9],
      ],421,["#A69A8F","#605451","#C8B9A8"],234)},
    {id:"foreleg-left",material:"fur",palette:charcoal,
      path:"M199 304 C207 305 215 314 218 329 "+
        "C221 346 217 365 213 380 C211 392 216 397 223 400 "+
        "C227 403 224 406 217 407 C211 408 205 405 200 404 "+
        "C195 407 184 407 178 405 C182 401 189 392 191 382 "+
        "C193 370 191 353 189 341 C185 325 191 311 199 304 Z",
      bounds:[175,300,53,109],direction:79,start:90,
      details:[
        ...pencilRootedFur([
          [191,327,204,396,183,365,32,10],
        ],461,["#B6A594","#5E5150","#CBBDAA"],244),
        ...pencilRootedFur([
          [196,328,199,395,191,362,31,8],
          [209,342,215,397,205,372,28,8],
        ],2077,["#8C6B60","#393238","#BEA696"],250),
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
      path:"M279 306 C287 306 295 319 298 333 "+
        "C299 348 295 367 292 382 C291 392 298 397 309 400 "+
        "C315 402 319 406 313 407 C303 409 287 405 280 406 "+
        "C272 409 263 408 253 406 C259 400 264 389 265 379 "+
        "C267 363 265 345 268 328 C270 318 272 310 279 306 Z",
      bounds:[250,302,68,107],direction:75,start:94,
      details:[
        ...pencilRootedFur([
          [270,332,282,399,273,372,33,9],
        ],489,["#B5A391","#655552","#C7B7A6"],242),
        ...pencilRootedFur([
          [278,328,279,395,277,371,31,10],
          [289,334,297,398,290,372,30,9],
        ],2129,["#8B695E","#3A3036","#B9A292"],248),
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
        "C256 342 250 351 244 365 C239 365 233 357 230 347 "+
        "C227 355 220 352 214 343 C208 343 202 336 198 326 "+
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
        ],1897,["#C6B5A1","#877E77","#FFF1D9"],249),
        mark("M196 267 Q211 289 219 319 M231 277 Q249 305 257 335",
          "#716E6D",.36,258,.50),
        // Every white edge fibre starts inside a measured chest curve and
        // lifts outside; the base color plane itself stays fully preserved.
        ...pencilContourFringe([
          [181,266,191,322,176,296,32,1],
          [264,285,245,361,267,319,32,-1],
          [244,364,217,346,231,359,30,-1],
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
      // Reduced pinna height, root still buried into upper cranium.
      path:"M246 185 C257 162 275 138 290 125 "+
        "Q299 119 302 127 C306 142 301 162 290 188 "+
        "Q268 195 246 185 Z",
      bounds:[242,118,67,79],direction:-69,start:115,
      details:[
        mark("M293 127 Q291 147 276 172 M300 131 Q302 149 288 176",
          "#645050",.44,248,.60),
        ...pencilRootedFur([
          [295,129,274,178,288,150,29,7],
          [296,143,284,184,293,165,26,7],
        ],661,["#E0AB8C","#665357","#F2CBAB"],252),
      ]},
    {id:"ear-near-inner",material:"fur",palette:["#A17A71","#62525A","#D5B4A0"],
      path:"M263 173 C275 150 285 134 296 124 "+
        "Q299 141 290 163 Q284 181 274 183 Z",
      bounds:[261,122,40,64],direction:-66,start:131,
      details:[
        mark("M293 129 Q290 149 277 174 M296 133 Q297 150 284 173",
          "#4D4248",.47,247,.70),
        ...pencilRootedFur([
          [292,135,274,171,285,150,31,7],
          [286,146,278,179,284,163,26,7],
        ],1711,["#C4A088","#4F464D","#EFDBC1"],256),
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
      // Narrow nasal taper, convex upper maxilla and softly attached lower
      // jaw. Distinct anatomical planes; do not draw one uniform grey tube.
      path:"M109 219 C117 214 127 211 145 208 "+
        "C165 202 184 200 198 200 C220 201 240 208 256 217 "+
        "C268 225 269 231 259 239 C244 249 224 252 201 248 "+
        "C180 244 164 244 144 239 C127 235 115 233 110 229 "+
        "C106 226 106 222 109 219 Z",
      bounds:[101,199,173,55],direction:14,start:146,
      details:[
        ...pencilRootedFur([
          [116,226,170,238,141,238,33,9],
          [167,217,216,243,193,243,32,11],
          [222,220,259,238,247,240,29,8],
          [140,231,198,243,170,247,33,7],
        ],721,["#E9D2B7","#8D8177","#FFF0D3"],248),
        mark("M115 233 C139 240 163 244 188 243 Q226 244 254 235",
          "#867369",.43,260,.39),
        mark("M116 218 Q146 210 175 216 M212 213 Q241 215 256 223",
          "#F8E6C6",.57,268,.58),
        mark("M126 237 Q151 246 179 247 M202 248 Q226 249 248 240",
          "#77665D",.39,275,.59),
        mark("M121 228 Q129 232 135 232 M148 225 Q168 221 185 227",
          "#C4A38D",.33,270,.55),
        // Original pigment tracks feather from inside the nasal-maxilla
        // junction across both sides of the cream-to-russet pelt boundary.
        // The whisker roots themselves do not need a colored sticker.
        ...pencilContourFringe([
          [112,219,198,201,160,204,40,-1],
          [198,201,257,218,233,206,36,-1],
          [115,233,196,246,158,242,30,1],
        ],1021,["#C5957E","#77625B","#F3D9B9"],259),
      ]},
    {id:"rostrum-bridge",material:"glaze",palette:["#B27660","#80584F","#D59D7F"],
      // Optical dry-colour plane overlays muzzle, without an opaque sticker.
      path:"M117 212 C136 203 159 196 188 192 C207 183 235 183 254 200 C231 209 201 218 163 220 Q138 223 118 223 Z",
      bounds:[117,188,131,43],direction:13,start:149,
      details:[
        ...pencilRootedFur([
          [129,214,199,215,162,200,31,9],
          [187,196,225,217,216,200,23,8],
        ],673,["#D49A7C","#715553","#F2C09E"],249),
        mark("M131 211 Q164 200 198 199 M185 221 Q219 210 243 216",
          "#BD7C69",.65,265,.68),
      ]},
    {id:"cheek-ruff",material:"fur",
      palette:["#B59278","#69534D","#D8B49A"],
      // Narrow, layered malar-to-throat root strip, not an opaque gray
      // triangular scarf. Its lower fibres grow into the existing white
      // chest and neck fur while the skull still occludes the upper root.
      path:"M251 225 C260 230 269 242 269 252 "+
        "C271 263 267 272 261 281 C255 289 252 298 250 313 "+
        "C247 302 245 292 244 282 C245 269 243 255 246 242 "+
        "C247 235 249 230 251 225 Z",
      bounds:[240,221,38,97],direction:64,start:150,
      details:[
        ...pencilRootedFur([
          [252,236,259,286,258,258,31,8],
          [250,263,251,307,245,289,35,7],
          [255,278,251,306,258,292,30,7],
        ],765,["#D6BBA1","#8B786E","#F2DEC5"],257),
        mark("M251 245 Q261 260 262 278 M249 282 Q250 298 250 308",
          "#E7CFB3",.40,279,.55),
        ...pencilContourFringe([
          [257,238,267,274,269,250,30,-1],
          [261,281,250,309,258,297,29,-1],
        ],905,["#D8BDA1","#9E8980","#F8E4C8"],255),
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
      path:"M236 190 C239 186 244 185 249 187 "+
        "Q250 189 247 191 C243 192 239 192 236 190 Z",
      bounds:[234,183,19,12],start:155,
      details:[
        mark("M235 189 Q242 181 250 187","#242632",.88,250,.96),
        mark("M237 191 Q243 195 248 191","#71504A",.46,258,.55),
        mark("M242 187 Q245 185 247 188 Q248 190 245 191 Q242 190 242 187 Z",
          "#986D3B",.42,263,.74),
        mark("M245 187 Q247 189 245 191","#20252C",.55,268,.90),
        mark("M243 186 L244 185","#FFF0D2",.29,276,.88),
        mark("M233 190 Q236 193 238 193 M250 186 Q252 184 255 183",
          "#4B3837",.41,279,.72),
        mark("M235 194 Q241 198 249 193 M240 198 Q244 199 248 195",
          "#9A7664",.34,283,.48),
        mark("M233 185 Q241 179 250 183 M249 184 Q254 185 256 190",
          "#704E47",.31,287,.56),
        ...pencilRootedFur([
          [230,180,249,183,241,176,28,6],
          [232,193,250,197,241,200,27,5],
        ],1779,["#BB8465","#493B3B","#E4AB83"],289),
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
      // Asymmetric flattened nasal leather with tapered ventral nostril,
      // following the bridge instead of a circular cartoon button.
      path:"M105 221 C108 217 112 216 116 217 "+
        "C119 216 124 219 125 221 C125 224 121 226 118 228 "+
        "C116 231 113 231 111 229 C108 227 105 224 105 221 Z",
      bounds:[103,214,24,20],direction:14,start:160,
      details:[
        mark("M107 219 Q113 216 119 218","#96948A",.43,248,.54),
        mark("M109 224 Q113 226 115 224 M119 224 Q122 225 123 222",
          "#131F27",.44,260,.85),
        mark("M110 228 Q113 230 117 227","#89817C",.33,267,.67),
        {...mark("M117 229 Q123 233 125 237",
          "#62504D",.47,274,.70),id:"nasal-philtrum"},
        mark("M107 219 Q109 218 112 218","#DDD1BE",.23,277,.51),
      ]},
    {id:"tail-tip",material:"fur",palette:pale,
      // Cream brush hairs dissolve into the outer tip, turning back over the
      // lower russet pelt. Do not cover the middle with a round white sticker.
      path:"M17 361 C24 350 43 341 61 341 "+
        "C54 349 49 358 46 367 C41 378 47 388 64 394 "+
        "C42 398 24 394 18 386 C12 379 12 371 17 361 Z",
      bounds:[10,338,59,64],direction:164,start:180,
      details:[
        ...pencilRootedFur([
          [57,347,17,363,36,347,29,10],
          [62,393,17,383,42,397,30,10],
          [48,366,14,375,27,369,28,9],
        ],1999,["#F7E9D4","#988274","#FFF3D9"],263),
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
}
export function pencilLivingStudyDrawing({
  subject, aspect, paperTooth=.76, seed=271, pressure=1,
}:PencilLivingOptions):PencilDrawingSpec {
  if (!PENCIL_LIVING_STUDIES.includes(subject)) throw new RangeError("Unknown living pencil subject");
  if (aspect!=="landscape"&&aspect!=="portrait") throw new RangeError("Unknown pencil aspect");
  if (!Number.isFinite(paperTooth)||paperTooth<0||paperTooth>1)
    throw new RangeError("Invalid paper tooth");
  if (!Number.isSafeInteger(seed)||seed<0||seed>2147483000)
    throw new RangeError("Invalid pencil seed");
  if (!Number.isFinite(pressure)||pressure<.2||pressure>1.2)
    throw new RangeError("Invalid pencil pressure");
  const parts=subject==="portrait"?face():subject==="fox"?fox():valley();
  // Portrait films deserve a large readable hero instead of a small sticker
  // floating in a blank page. Dedicated copy-safe top/bottom zones remain.
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
      opaqueSupport:subject==="fox"&&part.id==="whisker-roots"?
        false:region.opaqueSupport,
      underpaint:subject==="fox"&&part.id==="whisker-roots"?
        undefined:region.underpaint,
      underpaintOpacity:subject==="fox"&&part.id==="whisker-roots"?
        undefined:region.underpaintOpacity,
      // The fox iris has its own traced upper eyelid and pupil. Suppress
      // only the enclosing glass-vector ring, not the separate pencil marks.
      contour:subject==="fox"&&part.id==="whisker-roots"?
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
      clipDetails:part.id==="whisker-roots"||
        (subject==="fox"&&(part.id==="nose"||part.id==="muzzle"||
          ["chest","neck-ruff","cheek-ruff"].includes(part.id)))?
        false:region.clipDetails, layers:region.layers.map((layer,index)=>({
      ...layer,
      // Multiple dry-pencil colours follow the *same* authored fur-growth
      // tract. The generic +73/-44 crosshatch offsets made a synthetic
      // plaid over the fox, which real wildlife pencil studies avoid.
      // Keep the broad three-pass pigment model and every other subject
      // byte-identical; only the explicitly authored fox-fur atlas changes.
      angle:locallyRooted?region.layers[0].angle+[0,16,-12][index]:
        layer.angle,
      // CP-F1 direction/pressure remains intact, but soft facial skin needs
      // grain rather than ruler-like diagonals; scalp/brow hair needs fibre.
      texture:locallyRooted||fineHair?"fiber" as const:
        softSkin?"stipple" as const:layer.texture,
      tipWidth:locallyRooted?layer.tipWidth*.85:
        fineHair?layer.tipWidth*.80:softSkin?layer.tipWidth*.70:layer.tipWidth,
      pressure:Math.min(1,layer.pressure*pressure*
        (locallyRooted?.90:softSkin?.85:1)),
    }))};
  });
  const reference=subject==="portrait"?{
    title:"Elena Pancorbo — coloured-pencil portrait studies",
    url:"https://www.elenapancorbo.com/",
    observation:"Almond eyelid overlap, asymmetric facial planes and individual hair group direction.",
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
      "Build cranial silhouette, attached ear, orbital lids, nostrils, lips and hair root flows; preserve cheek glazing and opaque facial masses.":
      subject==="fox"?
      "Build head and ear cartilage over the torso, set eye sockets on the skull, align tapered muzzle, whisker roots and fur growth by form.":
      "Compose far mountains, stepped evergreen hierarchy, near banks and a river widening towards the camera, with directional light and aerial colour.",
    surfaces:Object.fromEntries(parts.map(part=>[part.id,part.material])),
  });
}
