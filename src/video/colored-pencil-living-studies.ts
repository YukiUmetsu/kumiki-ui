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
  const pale:PencilPalette=["#E6D7BA","#887B78","#FFF0D0"];
  const charcoal:PencilPalette=["#59616A","#2C3B49","#B1ADA1"];
  const earth:PencilPalette=["#8B8773","#5F665C","#CBC2A3"];
  return [
    {id:"earth",material:"stone",palette:earth,
      path:"M28 395 Q98 378 161 393 Q235 384 301 389 Q378 373 433 393 L437 439 L20 439 Z",
      bounds:[18,370,423,73],start:32,
      details:[mark("M40 407 Q112 390 158 411 M208 411 Q302 393 415 407","#C5BFAB",1.4)]},
    {id:"ground-shadow",material:"cast-shadow",palette:["#77736B","#696A63","#B5AA9D"],
      path:"M78 380 Q190 367 328 378 Q384 381 401 396 Q228 417 96 401 Z",
      bounds:[73,362,333,57],start:36},
    {id:"tail-back",material:"fur",palette:charcoal,
      path:"M159 320 Q108 292 63 335 Q33 373 79 397 Q133 413 176 373 Q203 358 210 341 Z",
      bounds:[49,290,166,125],direction:80,start:60,
      details:flowBundles([
        [69,362,151,385,103,405,28,13],[83,345,172,377,130,383,20,10],
      ],310,"#AEB0A4",.74,220)},
    {id:"body",material:"fur",palette:orange,
      path:"M177 240 Q208 216 263 223 Q318 231 347 289 Q366 343 329 388 Q285 403 239 384 Q198 410 159 370 Q133 324 177 240 Z",
      bounds:[137,218,229,188],direction:73,start:73,
      details:flowBundles([
        [194,249,211,345,166,286,24,17],[243,233,265,373,244,291,27,15],
        [303,248,324,370,333,294,21,13],
      ],381,"#F5BE85",.65,224)},
    {id:"rear-leg",material:"fur",palette:charcoal,
      path:"M313 313 Q342 328 348 365 Q348 390 363 393 L357 403 L314 402 Q306 366 296 343 Z",
      bounds:[292,310,75,96],direction:72,start:84,
      details:flowBundles([[318,333,335,388,326,365,18,9]],421,"#A9B0A7",.66)},
    {id:"foreleg-left",material:"fur",palette:charcoal,
      path:"M197 301 Q222 301 228 336 Q220 374 224 393 Q237 398 237 406 L182 406 Q185 386 184 364 Q175 320 197 301 Z",
      bounds:[173,298,68,111],direction:79,start:90,
      details:flowBundles([[191,327,204,396,183,365,19,11]],461,"#B6B2A6",.63)},
    {id:"foreleg-right",material:"fur",palette:charcoal,
      path:"M273 307 Q302 311 304 341 Q294 374 302 393 Q315 397 317 406 L253 406 Q264 386 260 361 Q251 325 273 307 Z",
      bounds:[247,302,76,107],direction:75,start:94,
      details:flowBundles([[270,332,282,399,273,372,20,10]],489,"#B3B5AC",.65)},
    {id:"chest",material:"fur",palette:pale,
      path:"M185 236 Q219 221 271 244 Q301 275 295 316 Q289 344 267 366 Q232 344 222 314 Q203 298 182 306 Q164 270 185 236 Z",
      bounds:[163,220,137,152],direction:69,start:95,
      details:flowBundles([
        [194,250,222,328,196,305,23,15],[234,254,261,344,247,302,23,14],
      ],523,"#FFF1D7",.71,229)},
    {id:"neck-ruff",material:"fur",palette:pale,
      path:"M165 240 Q158 259 175 279 Q159 291 176 311 Q185 304 195 318 Q203 303 218 314 Q227 298 243 301 Q256 284 241 266 Z",
      bounds:[154,235,108,85],direction:59,start:104,
      details:flowBundles([[174,247,206,306,176,291,20,14],
        [210,248,237,295,225,278,19,14]],557,"#F8E7C6",.67)},
    {id:"head-main",material:"fur",palette:["#B66C4E","#724849","#EBAE79"],
      // Three-quarter fox: skull widens behind the near orbit and narrows into
      // an oblique snout; avoid the old round bilateral mask.
      path:"M133 167 C142 130 171 113 207 109 C250 99 287 129 299 166 C308 192 295 223 274 237 C258 243 255 262 229 267 C199 266 165 249 143 235 Q124 222 122 206 Q118 185 133 167 Z",
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
      ]},
    {id:"ear-far",material:"fur",palette:["#AF6B52","#714B49","#E1A47B"],
      // Ear-to-skull proportion: broad cartilage base, shorter tapered tip.
      path:"M150 152 C143 128 145 101 155 77 Q161 63 170 71 C184 82 196 111 202 132 Q178 130 150 152 Z",
      bounds:[143,63,62,94],direction:67,start:114,
      details:[
        mark("M159 132 Q154 105 164 77 Q180 97 186 123",
          "#524647",.78,241,.74),
        ...pencilRootedFur([[158,87,177,126,163,110,18,8]],642,
          ["#D4A282","#6D5653","#F1BFA2"],252),
      ]},
    {id:"ear-far-inner",material:"fur",palette:["#A17E73","#6A555B","#C9AD9A"],
      path:"M159 126 C154 105 159 91 165 81 Q179 99 185 122 Z",
      bounds:[154,78,35,53],direction:72,start:131,
      details:[
        mark("M164 96 Q164 115 178 120","#D4B29B",.44,245,.71),
      ]},
    {id:"ear-near",material:"fur",palette:["#B87658","#724F4A","#E4AA7F"],
      path:"M252 127 C261 98 278 73 293 64 Q304 56 310 72 Q316 105 295 153 Q277 134 252 127 Z",
      bounds:[246,55,71,102],direction:-66,start:115,
      details:[
        mark("M266 128 Q279 91 301 69 Q305 105 284 143",
          "#55474B",.83,247,.80),
        ...pencilRootedFur([[296,78,278,133,294,110,21,7]],661,
          ["#E2AD88","#6B5556","#F5C9A6"],252),
      ]},
    {id:"ear-near-inner",material:"fur",palette:["#A37C6E","#68545C","#D9B39A"],
      path:"M269 123 Q283 86 298 75 Q303 99 287 139 Z",
      bounds:[265,71,41,71],direction:-68,start:131,
      details:[mark("M291 94 Q282 107 282 127","#E8CAB0",.50,246,.73)]},
    // ArtCraft: one continuous source-free *anatomy* study, not a photo
    // extraction. The dark fox eye is embedded in brow bone and the cheek
    // skin/fur plane; disconnected socket stickers made this face mask-like.
    // Fine fibers originate from curved orbital ridges, turn into tear
    // tracts and vanish into malar fur at three different pressures.
    {id:"periocular-form",material:"glaze",
      palette:["#B97959","#785047","#E4B28B"],
      path:"M146 182 C158 165 174 167 190 177 Q198 182 192 192 Q181 179 169 184 Q158 183 147 196 Z "+
        "M209 180 C225 160 251 159 273 169 Q288 181 285 200 Q278 217 267 224 Q271 204 257 196 Q240 174 220 196 Z "+
        "M157 202 Q181 201 199 209 Q227 205 253 212 Q242 230 221 233 Q196 227 171 227 Z",
      bounds:[145,156,145,81],direction:36,start:130,
      details:[
        ...pencilRootedFur([
          [151,181,189,193,168,172,20,7],
          [217,178,275,195,246,168,25,8],
          [224,210,271,231,251,216,19,10],
        ],814,["#DCA083","#84574C","#EBC3A0"],236),
        mark("M152 183 Q174 168 191 183 M216 186 Q241 165 269 178",
          "#794C46",.78,241,.65),
        mark("M165 207 Q180 213 192 211 M224 213 Q248 216 270 205",
          "#ECC0A2",.66,253,.58),
      ]},
    {id:"mask",material:"fur",palette:["#69514E","#423C41","#986A5C"],
      // Narrow, dark bony orbits and an oblique tear duct beneath near eye.
      path:"M150 191 Q163 176 185 184 C189 190 181 198 167 200 Q156 201 150 191 Z M217 188 Q235 171 264 181 C267 191 254 203 231 205 Q220 202 217 188 Z",
      bounds:[147,169,123,39],direction:18,start:135,
      details:[
        mark("M151 190 Q168 178 184 185 M218 186 Q238 171 264 183",
          "#43393E",.88,251,.78),
        mark("M226 193 Q220 203 214 218 M229 199 Q241 208 257 197",
          "#59474A",.70,264,.85),
        ...pencilRootedFur([
          [153,188,179,204,160,205,17,5],
          [222,190,255,208,238,209,18,6],
        ],645,["#AA7965","#5F4A4C","#B99479"],250),
      ]},
    {id:"muzzle",material:"fur",palette:["#C8B6A0","#736A68","#EAD7B9"],
      // One coherent oblique nasal-to-maxilla plane and a soft lower jaw.
      path:"M105 221 C132 211 153 210 180 216 Q211 223 239 218 C261 215 271 224 274 234 Q264 248 237 259 Q207 265 165 258 Q126 251 107 239 Q97 232 105 221 Z",
      bounds:[96,204,182,65],direction:14,start:146,
      details:[
        ...pencilRootedFur([
          [116,227,171,248,142,246,29,10],
          [165,222,216,249,194,250,27,12],
          [225,222,267,237,247,246,26,9],
        ],721,["#EAD9B9","#8C8176","#FFF0CD"],248),
        mark("M112 239 C140 256 173 264 211 259 Q250 253 269 234",
          "#4D494C",.79,268,.70),
        mark("M113 225 Q146 214 176 226 M227 225 Q246 221 267 229",
          "#F1DEBD",.63,268,.72),
        mark("M125 248 Q170 266 199 262 M207 266 Q237 266 260 248",
          "#8E817A",.52,275,.62),
      ]},
    {id:"rostrum-bridge",material:"glaze",palette:["#B27660","#80584F","#D59D7F"],
      // Optical dry-colour plane overlays muzzle, without an opaque sticker.
      path:"M120 219 C151 206 180 202 205 192 Q230 190 246 214 C209 218 168 226 124 229 Z",
      bounds:[117,188,131,43],direction:13,start:149,
      details:[
        ...pencilRootedFur([
          [129,214,199,215,162,200,31,9],
          [187,196,225,217,216,200,23,8],
        ],673,["#D49A7C","#715553","#F2C09E"],249),
        mark("M131 211 Q164 200 198 199 M185 221 Q219 210 243 216",
          "#BD7C69",.65,265,.68),
      ]},
    {id:"cheek-ruff",material:"fur",palette:["#B5896E","#7B5F58","#D7B59A"],
      // Irregular roots turn into neck ruff. Avoid a detached parallelogram.
      path:"M252 215 Q270 220 285 233 L291 242 Q287 245 284 252 Q278 253 278 259 L269 263 Q268 272 258 276 L250 289 Q251 274 241 271 Q250 255 235 240 Q248 234 252 215 Z",
      bounds:[232,211,63,82],direction:64,start:150,
      details:[
        ...pencilRootedFur([
          [249,230,280,254,276,228,30,10],
          [247,248,254,282,281,262,27,8],
        ],765,["#CDAA8C","#705B56","#F6DBC0"],257),
        mark("M262 272 Q277 255 283 246 M249 278 Q260 269 268 262",
          "#E7C6A8",.52,279,.71),
      ]},
    {id:"eye-far",material:"glass",palette:["#8B694D","#433E3C","#B49767"],
      // The far eye is compressed in perspective and occluded by a bowed
      // upper eyelid. A slit pupil follows the globe, not a clock face.
      path:"M160 190 C166 185 172 184 179 188 C177 193 173 196 168 195 Q163 194 160 190 Z",
      bounds:[158,183,23,15],start:153,
      details:[
        mark("M159 189 C165 183 175 182 181 187","#29282F",1.0,250,.88),
        mark("M162 192 Q170 198 177 192","#6E5550",.56,261,.72),
        mark("M167 186 Q173 183 174 189 Q173 195 169 195",
          "#8E673F",.70,262,.89),
        mark("M170 186 Q172 190 169 195","#252932",.75,269,.93),
        mark("M168 187 Q169 186 170 188","#FFF1C6",.40,276,.93),
        mark("M159 189 Q158 192 161 195 M177 191 Q180 189 181 185",
          "#3A2F32",.54,277,.76),
      ]},
    {id:"eye-near",material:"glass",palette:["#9D7950","#413B3B","#D0A875"],
      // Near eye: six named anatomical contacts — canthi, upper-lid
      // overhang, lower rim, thin amber iris, tear duct, displaced glint.
      // Its upper lid is sharply pigmented; the lower is soft where the
      // fur turns toward the muzzle. No unshaded white eye ellipse.
      path:"M225 189 C231 182 239 179 248 181 Q256 182 258 185 "+
        "C256 193 251 197 243 198 Q231 197 225 189 Z",
      bounds:[223,178,38,23],start:155,
      details:[
        mark("M224 189 C232 179 244 177 256 182 Q259 183 260 185",
          "#25272F",1.38,248,.94),
        mark("M228 194 Q238 201 248 198 Q255 194 257 189",
          "#73534B",.65,257,.72),
        mark("M241 181 C247 178 253 183 252 189 Q251 196 246 198 "+
          "Q240 197 239 191 Q239 186 241 181 Z",
          "#B38A54",.73,264,.84),
        mark("M246 181 Q250 185 249 191 Q249 195 246 197",
          "#20262F",1.32,270,.93),
        mark("M244 183 Q246 181 248 183","#FFF3D1",.70,276,.96),
        mark("M225 188 Q228 192 231 192 M258 186 Q261 185 262 181",
          "#302B32",.61,277,.85),
        mark("M229 199 Q239 205 251 199 M232 203 Q245 207 254 200",
          "#BD8F79",.48,284,.54),
        mark("M220 184 Q231 178 241 177 M253 178 Q261 180 265 185",
          "#764D43",.43,290,.62),
      ]},
    {id:"whisker-roots",material:"fur",palette:["#BEB2A2","#827874","#E9DBBE"],
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
    {id:"nose",material:"fur",palette:["#454346","#202932","#8A7971"],
      // Tilted nasal leather at the projected end of the long muzzle.
      path:"M103 221 C109 214 121 213 134 217 Q142 224 135 236 Q125 247 115 242 Q105 237 103 221 Z",
      bounds:[101,211,44,39],direction:17,start:160,
      details:[
        mark("M107 222 Q117 214 133 219","#A99E95",.81,256,.70),
        mark("M107 231 Q113 235 116 231 M127 231 Q131 230 136 224",
          "#1B252F",.64,265,.90),
        mark("M119 238 Q124 241 129 237","#827A72",.57,273,.72),
        mark("M127 247 Q132 253 136 255","#5B5150",.52,281,.71),
      ]},
    {id:"tail-tip",material:"fur",palette:pale,
      path:"M67 351 Q46 374 79 397 Q97 407 118 397 Q103 392 91 377 Q80 365 67 351 Z",
      bounds:[45,347,79,63],direction:57,start:180},
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
    return {...region, clipDetails:part.id==="whisker-roots"?false:region.clipDetails, layers:region.layers.map(layer=>({
      ...layer,
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
