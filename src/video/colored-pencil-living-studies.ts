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
    {id:"eye-white-far",material:"skin",palette:["#CBBFBA","#967E83","#EBDDD2"],
      // Warm sclera with lid overlap; never a fully exposed bright eye disc.
      path:"M157 206 C166 198 183 196 192 205 Q190 213 176 214 Q164 214 157 206 Z",
      bounds:[153,195,42,23],direction:6,start:137,
      details:[
        mark("M155 205 Q169 195 184 199 Q190 201 194 206","#573F50",1.42,203,.88),
        mark("M159 209 Q175 219 191 208","#A87981",.72,220,.73),
        mark("M156 199 Q172 192 187 196","#A37C82",.63,233,.52),
        mark("M158 205 Q160 209 164 210 M190 206 L194 207","#DCAFA5",.63,240,.62),
      ]},
    {id:"iris-far",material:"glass",palette:["#6A7E7D","#334C5C","#A7AEAA"],
      path:"M172 201 C176 199 181 199 184 205 Q185 211 180 214 Q174 213 172 208 Z",
      bounds:[170,198,17,19],start:147,
      details:[mark("M176 203 Q180 199 182 205 M174 208 Q179 215 184 209","#273D4A",.58,228,.83)]},
    {id:"pupil-far",material:"hair",palette:["#263846","#142436","#465A63"],
      path:"M178 201 Q182 201 182 206 Q182 211 179 212 Q176 209 178 201 Z",
      bounds:[175,199,9,15],start:157,
      details:[mark("M177 203 L178 204","#F8F0E3",.68,242)]},
    {id:"eye-white-near",material:"skin",palette:["#D2C7BE","#9D858B","#EDE2D7"],
      path:"M240 207 C252 198 270 195 286 205 Q285 216 267 218 Q252 219 240 207 Z",
      bounds:[236,194,54,28],direction:5,start:138,
      details:[
        mark("M239 206 Q259 194 276 199 Q283 201 289 207","#4D3B4D",1.55,201,.92),
        mark("M244 213 Q262 224 286 214","#A6757B",.78,220,.76),
        mark("M242 198 Q265 189 284 200","#AC7F87",.70,232,.58),
        mark("M239 207 L245 210 M284 207 Q288 210 289 211","#E6B4AA",.65,243,.67),
      ]},
    {id:"iris-near",material:"glass",palette:["#607B7E","#263D53","#A2ADB4"],
      path:"M260 201 C265 196 272 198 275 203 Q278 212 272 216 Q264 219 261 211 Z",
      bounds:[258,196,20,24],start:145,
      details:[
        mark("M266 200 Q272 197 274 205 M263 210 Q270 218 276 210","#26425B",.72,228),
        mark("M266 201 Q268 199 270 201","#F2EBDA",1.05,237,.90),
      ]},
    {id:"pupil-near",material:"hair",palette:["#253648","#101D32","#4B5B62"],
      path:"M268 201 Q272 200 273 206 Q273 213 270 215 Q266 212 268 201 Z",
      bounds:[265,199,10,19],start:158,
      details:[mark("M268 204 Q269 202 270 203","#FFF7E8",.75,245)]},
    {id:"brows",material:"hair",palette:["#5B474E","#353042","#92726C"],
      path:"M151 182 C166 172 185 172 198 181 L199 185 Q180 179 154 187 Z M241 179 C258 170 279 171 294 183 L290 188 Q268 180 245 188 Z",
      bounds:[148,168,150,23],direction:4,start:147,
      details:[
        mark("M155 184 Q175 173 195 181 M246 183 Q267 172 289 185","#8E716F",.69,229,.85),
        ...flowBundles([[157,183,196,181,176,173,17,2],
          [246,183,291,184,268,171,19,2]],1509,"#4A3944",.30,243),
        mark("M151 191 Q168 185 180 186 M259 193 Q280 189 292 192","#B38A88",.47,251,.48),
      ]},
    {id:"nose-bridge",material:"skin",palette:["#E7B69A","#A17380","#F5D7B6"],
      path:"M225 191 C231 210 237 223 240 239 Q243 249 253 254 Q261 263 251 271 Q239 279 227 275 Q219 271 225 259 Q232 247 225 191 Z",
      bounds:[216,190,49,90],direction:68,start:113,
      details:[
        mark("M228 199 Q235 220 238 239","#F9D7B9",1.05,211,.74),
        mark("M223 262 Q227 270 233 270 M248 269 Q254 268 257 262","#966879",.82,219,.68),
        mark("M229 270 Q233 273 238 270 M245 271 Q250 270 252 267","#604657",.58,230,.78),
        mark("M235 246 Q240 250 239 255 M230 260 Q230 264 234 265","#E6B59F",.75,235,.76),
        mark("M225 277 Q237 282 249 275","#FCE2C9",.62,246,.60),
      ]},
    {id:"lip-upper",material:"skin",palette:["#BD827F","#92616F","#DCAA9E"],
      path:"M206 296 Q219 289 228 291 Q238 288 245 291 Q257 291 264 296 Q250 301 237 300 Q222 302 206 296 Z",
      bounds:[203,286,64,19],direction:11,start:157,
      details:[
        mark("M207 297 Q220 300 235 299 Q249 300 264 296","#724D5C",.80,233,.81),
        mark("M215 292 Q223 291 228 292 M243 292 Q254 290 259 295","#EAC0AF",.65,239,.70),
      ]},
    {id:"lip-lower",material:"skin",palette:["#D09C94","#A77680","#E8B3A5"],
      path:"M207 299 Q220 305 238 302 Q250 304 264 297 Q254 312 239 313 Q224 315 207 299 Z",
      bounds:[205,295,62,22],direction:3,start:160,
      details:[
        mark("M215 305 Q237 313 254 305","#F4C8B7",.78,236,.73),
        mark("M222 316 Q242 320 253 315","#AD7E83",.56,250,.48),
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
    {id:"head-main",material:"fur",palette:["#C27C5B","#87524C","#EEB68B"],
      path:"M137 162 C145 125 178 105 214 108 Q258 99 284 140 C303 159 303 197 289 220 Q269 246 234 257 Q205 265 177 251 C153 243 130 226 126 210 Q122 190 137 162 Z",
      bounds:[122,99,183,169],direction:37,start:112,
      details:[
        ...flowBundles([
          [149,151,186,203,154,177,24,14],
          [201,121,245,171,216,135,25,15],
          [252,145,280,214,285,181,19,11],
          [175,224,198,253,178,247,17,12],
        ],607,"#E7AB80",.53,237),
        mark("M143 169 Q168 134 199 128 M222 119 Q260 115 281 153","#F1BB8E",.88,245,.63),
        mark("M131 210 Q147 231 177 246 M272 221 Q263 245 234 254","#764F4E",.66,251,.55),
        mark("M159 179 Q174 169 193 178 M237 178 Q263 163 279 185","#B2715E",.74,257,.67),
      ]},
    {id:"ear-far",material:"fur",palette:orange,
      path:"M151 151 C146 126 146 88 153 60 Q157 42 169 46 C184 58 199 99 200 125 Q173 124 151 151 Z",
      bounds:[142,40,63,113],direction:70,start:114,
      details:[
        mark("M159 124 Q157 83 165 56 Q177 80 186 115","#514650",1.05,237,.81),
        ...flowBundles([[163,67,176,112,168,93,13,5]],641,"#EEC9A7",.44,249),
      ]},
    {id:"ear-far-inner",material:"fur",palette:["#B58E85","#705B67","#E9C0AE"],
      path:"M158 120 Q154 90 161 64 Q174 80 182 116 Z",
      bounds:[151,62,35,61],direction:72,start:131},
    {id:"ear-near",material:"fur",palette:orange,
      path:"M251 126 C258 92 280 59 294 50 Q306 42 311 60 C315 88 308 129 290 162 Q274 137 251 126 Z",
      bounds:[247,43,69,122],direction:-69,start:115,
      details:[
        mark("M261 126 Q277 84 299 57 Q301 106 285 145","#4C4654",1.12,241,.84),
        ...flowBundles([[296,63,279,133,291,102,14,5]],659,"#EEC6AA",.48,252),
      ]},
    {id:"ear-near-inner",material:"fur",palette:["#A87570","#644E5F","#E8AF9B"],
      path:"M263 126 Q281 83 298 66 Q302 97 287 140 Z",
      bounds:[260,64,42,81],direction:-67,start:131},
    {id:"mask",material:"fur",palette:["#8B655C","#644D52","#BC8A72"],
      // Distinct orbits follow upper maxilla, not a wide raccoon band.
      path:"M132 197 C146 182 170 178 185 187 Q196 197 189 209 Q177 220 157 222 Q139 216 132 197 Z M228 197 C243 179 265 178 283 195 Q285 208 267 222 Q244 224 228 197 Z",
      bounds:[130,174,158,52],direction:4,start:135,
      details:[
        ...flowBundles([
          [139,202,182,214,159,226,14,8],
          [240,199,272,215,257,226,13,8],
        ],647,"#BD9984",.36,254),
        mark("M139 188 Q159 178 176 186 M242 186 Q265 178 282 192","#453D47",.69,252,.67),
      ]},
    {id:"muzzle",material:"fur",palette:["#E4D4BC","#947B72","#F5E4C8"],
      path:"M142 219 C155 210 179 207 198 218 Q214 225 238 225 C259 215 275 215 289 222 Q278 242 257 246 Q236 259 212 261 Q174 265 151 250 Q138 239 142 219 Z",
      bounds:[138,205,155,61],direction:17,start:146,
      details:[
        ...flowBundles([
          [150,224,185,249,168,244,18,10],
          [238,231,276,238,263,247,19,9],
          [195,234,213,257,200,251,16,8],
        ],701,"#F8EBD6",.45,255),
        mark("M151 246 Q179 264 208 258 Q241 255 269 245","#7A6560",.72,267,.63),
        mark("M202 254 Q211 260 221 255 M211 260 Q218 264 230 260","#5F5153",.61,272,.74),
        mark("M147 226 Q165 216 184 221 M251 228 Q270 219 284 225","#FEF0D5",.68,259,.78),
      ]},
    {id:"eye-far",material:"glass",palette:["#BA9468","#60554F","#D6B67F"],
      path:"M152 192 Q162 183 175 191 Q173 201 164 202 Q155 201 152 192 Z",
      bounds:[150,181,29,24],start:153,
      details:[
        mark("M152 191 Q162 181 175 190 M156 200 Q165 205 173 197","#3A323A",1.1,262,.87),
        mark("M163 188 Q169 190 169 197 Q168 201 164 201 Q160 196 163 188","#775B45",.85,264,.89),
        mark("M165 190 Q166 194 165 198","#282B32",1.3,269,.90),
        mark("M164 189 L165 191","#F9E1B3",.85,274,.91),
      ]},
    {id:"eye-near",material:"glass",palette:["#CFA875","#67594F","#EEC891"],
      path:"M244 193 C252 183 263 182 272 191 Q273 202 260 205 Q249 205 244 193 Z",
      bounds:[242,182,33,25],start:155,
      details:[
        mark("M244 191 Q254 181 272 190 M249 201 Q259 208 270 198","#312F37",1.25,262,.88),
        mark("M258 187 Q265 188 266 195 Q266 202 261 203 Q256 197 258 187","#8B633F",.82,266,.82),
        mark("M262 189 Q264 195 262 201","#252C34",1.44,272,.92),
        mark("M260 189 L261 191","#FFF0CA",1.0,276,.93),
      ]},
    {id:"whisker-roots",material:"fur",palette:pale,
      path:"M180 240 Q194 249 211 250 Q237 245 254 237 L255 246 Q233 259 210 259 Q187 255 176 247 Z",
      bounds:[172,235,86,27],direction:6,start:171,
      details:[
        mark("M190 245 Q164 226 132 224 M187 252 Q155 246 115 257 M199 253 Q165 264 131 276",
          "#E6DAD0",.63,275,.86),
        mark("M238 244 Q273 227 308 221 M237 251 Q273 248 313 259 M222 256 Q272 270 306 287",
          "#E5D7C8",.59,282,.84),
        mark("M189 244 L192 245 M197 247 L201 248 M241 244 L245 243 M245 250 L249 249",
          "#6D625D",.66,278,.76),
      ]},
    {id:"nose",material:"fur",palette:["#414049","#202A35","#8B7971"],
      path:"M194 228 Q200 220 210 220 Q222 219 229 229 Q227 239 217 244 Q207 250 198 241 Z",
      bounds:[191,216,41,35],direction:10,start:160,
      details:[
        mark("M199 228 Q210 221 221 227","#BEB3AB",.93,266,.77),
        mark("M197 233 Q202 237 207 234 M217 236 Q223 234 225 232","#1D232E",.86,270,.86),
        mark("M209 241 Q211 245 214 245","#B4A29B",.72,275,.66),
        mark("M210 247 Q207 253 211 256","#5C4E4D",.57,281,.70),
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
      details:part.details,transform,craft:true,
    });
    return {...region, clipDetails:part.id==="whisker-roots"?false:region.clipDetails, layers:region.layers.map(layer=>({
      ...layer,pressure:Math.min(1,layer.pressure*pressure),
    }))};
  });
  return {version:1,seed,paper:"#F8F4EA",paperTooth,
    width:aspect==="landscape"?960:540,
    height:aspect==="landscape"?540:960,regions};
}
