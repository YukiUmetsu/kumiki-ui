import { pencilHash } from "../../registry/video/colored-pencil";
import type { PencilAspect, PencilDrawingSpec, PencilRegion, PencilTrace } from "../../registry/video/colored-pencil";
import { createPencilMaterialRegion } from "../../registry/video/colored-pencil-materials";
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

function face():PencilSubjectPart[] {
  const skin:PencilPalette=["#DDA58F","#906277","#F4CEB0"];
  const lit:PencilPalette=["#F2C6AA","#B78082","#FFE0BF"];
  const hair:PencilPalette=["#684F50","#282E40","#B18471"];
  const dark:PencilPalette=["#4D4050","#23283B","#8A6A66"];
  const iris:PencilPalette=["#627D81","#263D53","#A2ADB4"];
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
    {id:"face-main",material:"skin",palette:skin,
      path:"M140 138 C153 89 218 79 277 107 Q321 121 327 177 Q324 220 304 266 Q289 319 244 344 Q202 343 170 312 Q136 268 130 209 Q124 166 140 138 Z",
      bounds:[121,89,210,259],direction:-37,flow:18,start:83,
      details:[
        mark("M145 181 Q143 250 169 287 M292 148 Q320 197 298 244","#F6D7B9",1.9,222),
        mark("M172 279 Q190 312 216 323 M269 317 Q288 302 291 281","#865873",1.1,227),
        mark("M204 177 Q235 163 264 180 M156 164 Q179 151 204 159","#FBE0C3",1.2,235),
        ...flowBundles([
          [155,254,179,298,150,282,12,12],[274,255,294,285,301,271,10,10],
        ],1449,"#CB8C89",.34,242),
      ]},
    {id:"temple-light",material:"skin",palette:lit,
      path:"M144 143 Q171 116 204 133 Q179 153 168 189 Q153 196 143 178 Z",
      bounds:[138,109,71,91],direction:39,start:97},
    {id:"cheek-light",material:"skin",palette:lit,
      path:"M233 224 Q264 208 292 236 Q293 258 272 273 Q245 286 228 265 Z",
      bounds:[225,205,73,83],direction:54,start:103,
      details:[mark("M245 248 Q263 238 278 248","#FFD8BB",.85,218)]},
    {id:"eye-white-far",material:"skin",palette:["#E7D7CD","#987E83","#FFEEE3"],
      path:"M155 207 Q170 190 190 196 Q199 204 195 212 Q174 220 155 207 Z",
      bounds:[151,188,49,35],direction:7,start:137,
      details:[mark("M155 207 Q170 190 190 196 Q199 204 195 212","#6F5362",1.6,202)]},
    {id:"iris-far",material:"glass",palette:iris,
      path:"M171 197 Q180 193 185 200 Q188 210 180 213 Q172 213 171 204 Z",
      bounds:[168,192,22,23],start:147,
      details:[mark("M180 194 L180 210 M173 202 L185 202","#21364C",.85,228)]},
    {id:"eye-white-near",material:"skin",palette:["#E7D8CF","#B88F94","#FFF0E3"],
      path:"M241 205 Q265 186 289 201 Q296 210 286 216 Q260 224 241 205 Z",
      bounds:[238,185,60,43],start:138,
      details:[
        mark("M241 205 Q265 186 289 201","#604657",1.8,200),
        mark("M245 216 Q265 228 288 216","#BA8B86",1.05,230),
      ]},
    {id:"iris-near",material:"glass",palette:iris,
      path:"M257 199 Q268 191 277 200 Q281 212 272 216 Q259 219 257 207 Z",
      bounds:[254,190,29,30],start:145,
      details:[
        mark("M267 195 Q268 203 268 216 M259 205 Q269 203 277 205","#26425B",1.1,226),
        mark("M264 199 Q267 197 270 200","#FFF5E9",1.55,234),
      ]},
    {id:"brows",material:"hair",palette:dark,
      path:"M150 181 Q173 168 198 177 L201 182 Q174 178 153 186 Z M242 179 Q265 167 295 180 L291 185 Q266 177 245 187 Z",
      bounds:[147,166,151,24],direction:5,start:147,
      details:[mark("M154 179 Q174 167 196 177 M244 181 Q270 167 294 182","#A07D74",.7,242)]},
    {id:"nose-bridge",material:"skin",palette:lit,
      path:"M223 193 Q234 202 238 219 Q241 248 228 264 Q241 274 251 262 Q261 252 262 246 Q254 268 241 279 Q223 281 216 265 Q230 246 223 193 Z",
      bounds:[211,191,54,92],direction:63,start:113,
      details:[
        mark("M226 253 Q231 263 224 268 M247 265 Q250 263 253 258","#89596B",1.35,216),
        mark("M234 211 Q237 235 232 250","#FFE5C9",1.25,226),
      ]},
    {id:"lip-upper",material:"skin",palette:["#C57977","#824A63","#E7A69B"],
      path:"M201 295 Q211 286 226 290 Q242 282 252 287 Q265 288 271 296 Q250 301 235 299 Q217 304 201 295 Z",
      bounds:[198,281,76,26],direction:14,start:157,
      details:[mark("M203 295 Q229 300 242 296 Q261 297 269 295","#7A4B5C",1.15,231)]},
    {id:"lip-lower",material:"skin",palette:["#D9958F","#9B6877","#F1BAAB"],
      path:"M203 299 Q226 307 244 299 Q263 300 270 296 Q257 314 236 315 Q213 312 203 299 Z",
      bounds:[199,294,75,26],direction:3,start:160,
      details:[mark("M212 306 Q238 316 261 304","#FFD3BF",1.1,237)]},
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
    {id:"ground-shadow",material:"cast-shadow",palette:["#77736B","#696A63","#B5AA9D"],
      path:"M78 380 Q190 367 328 378 Q384 381 401 396 Q228 417 96 401 Z",
      bounds:[73,362,333,57],start:27},
    {id:"earth",material:"stone",palette:earth,
      path:"M28 395 Q98 378 161 393 Q235 384 301 389 Q378 373 433 393 L437 439 L20 439 Z",
      bounds:[18,370,423,73],start:32,
      details:[mark("M40 407 Q112 390 158 411 M208 411 Q302 393 415 407","#C5BFAB",1.4)]},
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
    {id:"head-main",material:"fur",palette:orange,
      path:"M137 163 C151 122 188 101 224 106 Q268 99 286 146 Q311 182 287 220 Q264 252 214 265 Q155 255 127 229 Q108 207 137 163 Z",
      bounds:[105,96,208,174],direction:38,start:112,
      details:flowBundles([
        [149,157,187,212,162,194,24,16],[202,125,252,175,219,136,24,14],
        [250,159,281,216,289,183,20,12],
      ],607,"#E8AA7E",.63,239)},
    {id:"ear-far",material:"fur",palette:orange,
      path:"M153 150 Q143 113 153 58 Q159 34 178 58 Q198 82 201 123 Z",
      bounds:[141,37,64,119],direction:72,start:114,
      details:[mark("M161 120 Q157 88 164 65 Q177 81 186 114","#624B52",2.3,243)]},
    {id:"ear-far-inner",material:"fur",palette:["#B58E85","#705B67","#E9C0AE"],
      path:"M158 120 Q154 90 161 64 Q174 80 182 116 Z",
      bounds:[151,62,35,61],direction:72,start:131},
    {id:"ear-near",material:"fur",palette:orange,
      path:"M251 125 Q264 82 295 54 Q309 45 310 79 Q306 129 290 161 Z",
      bounds:[245,49,71,114],direction:-70,start:115,
      details:[mark("M264 127 Q281 90 297 68 Q299 109 285 143","#4F4856",2.4,240)]},
    {id:"ear-near-inner",material:"fur",palette:["#A87570","#644E5F","#E8AF9B"],
      path:"M263 126 Q281 83 298 66 Q302 97 287 140 Z",
      bounds:[260,64,42,81],direction:-67,start:131},
    {id:"mask",material:"fur",palette:charcoal,
      path:"M126 198 Q154 174 181 185 Q202 182 229 194 Q259 184 285 202 Q279 229 258 239 Q214 235 179 247 Q141 233 126 198 Z",
      bounds:[124,173,166,78],direction:6,start:135,
      details:flowBundles([
        [143,208,177,232,155,225,14,10],[239,207,272,225,253,219,13,10],
      ],647,"#D1C7B6",.48,254)},
    {id:"muzzle",material:"fur",palette:pale,
      path:"M141 216 Q173 199 203 216 Q220 223 241 229 Q268 214 286 220 Q265 251 219 259 Q185 267 143 244 Z",
      bounds:[138,198,152,73],direction:16,start:146,
      details:flowBundles([
        [158,226,189,252,173,246,18,12],[237,232,266,242,256,246,18,12],
      ],701,"#FCF1D9",.52,258)},
    {id:"eye-far",material:"glass",palette:["#D7B582","#5D5B57","#FFF0BE"],
      path:"M155 190 Q165 182 173 191 Q171 199 164 200 Q157 198 155 190 Z",
      bounds:[153,180,22,23],start:153,
      details:[mark("M155 190 Q166 183 173 191 M162 191 Q165 197 168 193","#332F3A",1.3,265)]},
    {id:"eye-near",material:"glass",palette:["#E9C68C","#685D56","#FFF0BF"],
      path:"M245 191 Q257 178 270 191 Q269 204 257 205 Q246 203 245 191 Z",
      bounds:[242,177,31,32],start:155,
      details:[
        mark("M245 191 Q257 178 270 191 M249 201 Q257 207 267 199","#2D303A",1.5,264),
        mark("M253 188 L255 193","#FFF5D9",1.3,274),
      ]},
    {id:"nose",material:"fur",palette:["#41424B","#1D2B38","#8B7977"],
      path:"M193 225 Q208 214 228 228 Q223 243 210 246 Q197 241 193 225 Z",
      bounds:[189,212,42,39],direction:12,start:160,
      details:[mark("M200 224 Q211 219 219 225","#D3C5BC",1.1,269)]},
    {id:"whisker-roots",material:"fur",palette:pale,
      path:"M180 239 Q201 248 213 249 Q244 244 253 237 L256 245 Q224 259 211 257 Q190 257 177 247 Z",
      bounds:[174,235,86,25],direction:6,start:171,
      details:[
        mark("M185 244 Q144 234 109 225 M189 252 Q140 263 109 262 M238 247 Q284 226 321 216 M240 253 Q286 258 323 271",
          "#F3E3D5",.8,274,.87),
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
  const transform=aspect==="landscape"?"translate(441 35) scale(1.06)":
    "translate(35 253) scale(1.06)";
  const regions:PencilRegion[]=parts.map((part,i)=>{
    const region=createPencilMaterialRegion({
      id:part.id,surface:part.material,path:part.path,bounds:part.bounds,
      palette:part.palette,seed:(seed+i*373)%2147483647,
      startFrame:part.start??45,durationFrames:172,
      direction:part.direction,flow:part.flow,
      details:part.details,transform,
    });
    return {...region, layers:region.layers.map(layer=>({
      ...layer,pressure:Math.min(1,layer.pressure*pressure),
    }))};
  });
  return {version:1,seed,paper:"#F8F4EA",paperTooth,
    width:aspect==="landscape"?960:540,
    height:aspect==="landscape"?540:960,regions};
}
