import type {
  WatercolourArtKey, WatercolourArtPart, WatercolourArtwork, WatercolourWashTreatment,
} from "../../registry/video/watercolour-illustration";
import type { WetPaperSpec, WetPigmentDrop } from "../../registry/video/watercolour-wet-paper";

/**
 * WC13 / original portrait atelier.
 *
 * Entire figure geometry was redrawn from first principles: bony landmarks,
 * overlapping facial planes, opaque light-facing local colour and carefully
 * placed transparent glazes. The references describe MATERIAL CRAFT, not
 * image pixels, likenesses or paths to trace.
 *
 * The two independent sitters share a pose contract but have different
 * hair, garment and facial-age structures. Frame-seeking is deterministic.
 */
export type PortraitOutput = "landscape" | "portrait";
export type PortraitSubject = "sitter-a" | "sitter-b";
export const PORTRAIT_SUBJECTS: readonly PortraitSubject[] = ["sitter-a","sitter-b"];

const key=(frame:number,x=0,y=0,rotation=0,scale=1,opacity=1):WatercolourArtKey=>
  ({frame,x,y,rotation,scale,opacity});
/** The back hair, front hair, face and beard must all follow the same
 * continuous head gesture around the neck. Keyed eye gaze remains local.
 * Source-space amplitudes are deliberately human rather than exaggerated.
 */
const HEAD_PERFORMANCE:readonly WatercolourArtKey[]=[
  key(0),key(145),key(182,0,-1,-.9),key(223,1,-1,.65),
  key(255,2,-2,1.8),key(284,1,-1,.9),key(319,-1,1,-1.05),
  key(359),
];
const wash=(id:string,path:string,fill:string,opacity=1,
  material?:WatercolourWashTreatment,startFrame=0,fadeFrames=0,
  composite:"normal"|"multiply"="multiply"):WatercolourArtPart=>
  ({kind:"path",id,path,fill,opacity,technique:"wash",composite,
    ...(material?{wash:material}:{}),startFrame,fadeFrames});
const mark=(id:string,path:string,color:string,width:number,opacity=.6,startFrame=0):WatercolourArtPart=>
  ({kind:"path",id,path,stroke:color,strokeWidth:width,opacity,technique:"drybrush",
    startFrame,fadeFrames:startFrame?22:0});
const group=(id:string,children:WatercolourArtPart[],keys?:readonly WatercolourArtKey[],
  pivot?:{x:number;y:number},startFrame=0,fadeFrames=0,
  clipPath?:string):WatercolourArtPart=>
  ({kind:"group",id,children,...(keys?{keys}:{}),...(pivot?{pivot}:{}),
    ...(clipPath?{clipPath}:{}),startFrame,fadeFrames});
const luminous=(highlight:string,shadow:string,edgeSoftness=.2,
  edgePooling=.12):WatercolourWashTreatment=>
  ({highlight,shadow,gradient:"radial",edgeSoftness,edgePooling});

/** Distinct portrait identity is geometry, not a recolored head.
 * Eye centers follow each sitter's orbital bone; the nose and mouth
 * proportions are composed separately below. Original 600×800 art space.
 */
export const SITTER_LANDMARKS={
  "sitter-a":{
    crown:{x:319,y:42},chin:{x:331,y:447},
    nearEye:{x:276,y:234,halfWidth:33},farEye:{x:374,y:225,halfWidth:21},
    nose:{x:350,y:313},mouth:{x:335,y:369},neck:{x:328,y:477},
  },
  "sitter-b":{
    crown:{x:333,y:55},chin:{x:324,y:461},
    nearEye:{x:264,y:242,halfWidth:29},farEye:{x:361,y:232,halfWidth:22},
    nose:{x:338,y:320},mouth:{x:329,y:378},neck:{x:325,y:482},
  },
} as const;
/** Backward-compatible source-space anchors for the first sitter. */
export const PORTRAIT_LANDMARKS={
  crown:{x:319,y:42},chin:{x:331,y:447},
  nearEye:{x:276,y:234},farEye:{x:374,y:225},
  nose:{x:350,y:313},mouth:{x:335,y:369},
  neck:{x:328,y:477},leftShoulder:{x:110,y:581},
  rightShoulder:{x:502,y:570},
} as const;

interface Palette {
  skin:string; light:string; shade:string; reflected:string;
  cheek:string; lip:string; iris:string; hair:string; hairLight:string;
  hairDeep:string; garment:string; garmentLight:string; garmentDeep:string;
  fabric:string; brow:string;
}
const PALETTES:Record<PortraitSubject,Palette>={
  "sitter-a":{
    skin:"#CB9B85",light:"#F0C9AB",shade:"#A46F6F",reflected:"#9296A3",
    cheek:"#C6817B",lip:"#A9666D",iris:"#677A72",hair:"#4A454C",
    hairLight:"#9B8179",hairDeep:"#2E3640",garment:"#546D76",
    garmentLight:"#9DAEB0",garmentDeep:"#384D5B",fabric:"#E7D6BD",brow:"#54494C",
  },
  "sitter-b":{
    skin:"#B78266",light:"#E4BA95",shade:"#875D56",reflected:"#8A8790",
    cheek:"#B87669",lip:"#8C5B58",iris:"#68655B",hair:"#626166",
    hairLight:"#B3A5A0",hairDeep:"#3A4249",garment:"#777B72",
    garmentLight:"#B9B49F",garmentDeep:"#485B5B",fabric:"#DCC9AA",brow:"#514D50",
  },
};

/** Each eye's iris, sclera and pencil-like eyelid share ONE actual aperture.
 * No disconnected cartoon ellipse is allowed to escape the lid geometry.
 */
function eye(side:"near"|"far",p:Palette,subject:PortraitSubject):WatercolourArtPart {
  const near=side==="near";
  const landmark=near?SITTER_LANDMARKS[subject].nearEye:SITTER_LANDMARKS[subject].farEye;
  const {x:cx,y:cy,halfWidth:rx}=landmark;
  const left=cx-rx, right=cx+rx;
  // Irregular almond apertures, not cartoon white disks: the upper lid
  // occludes the iris and the small wet-paper sclera narrows at both canthi.
  const aperture="M"+left+" "+(cy+1)+" C"+(left+11)+" "+(cy-8)+
    " "+(cx+3)+" "+(cy-11)+" "+right+" "+(cy-2)+
    " Q"+(cx+2)+" "+(cy+6)+" "+left+" "+(cy+1)+" Z";
  const open=[key(0),key(176),key(184,0,0,0,1,0),
    key(190,0,0,0,1,0),key(201),key(306),key(313,0,0,0,1,0),
    key(320,0,0,0,1,0),key(329),key(359)];
  const closed=[key(0,0,0,0,1,0),key(176,0,0,0,1,0),
    key(184),key(190),key(201,0,0,0,1,0),key(306,0,0,0,1,0),
    key(313),key(320),key(329,0,0,0,1,0),key(359,0,0,0,1,0)];
  return group(side+"-eye",[
    wash(side+"-socket",
      "M"+(left-8)+" "+(cy+2)+" Q"+(cx-12)+" "+(cy-33)+" "+(right+9)+" "+(cy-22)+
      " Q"+(right+16)+" "+(cy+10)+" "+(right+1)+" "+(cy+22)+
      " Q"+(cx-20)+" "+(cy+25)+" "+(left-8)+" "+(cy+2)+" Z",
      p.reflected,.18,luminous(p.light,p.shade,.86,0),102,55),
    wash(side+"-lid-orbital-shadow",
      "M"+(left-3)+" "+(cy-4)+" Q"+(cx-12)+" "+(cy-27)+" "+(right+7)+" "+(cy-14)+
      " Q"+(cx+9)+" "+(cy-10)+" "+(left-3)+" "+(cy-4)+" Z",
      p.shade,.31,luminous(p.light,p.reflected,.51,.05),137,62),
    group(side+"-open-eye",[
      group(side+"-eye-inset",[
      wash(side+"-sclera",aperture,"#F1DDD0",.98,
        luminous("#FCEDDD","#BDAAA2",.12,.04),0,0,"normal"),
      group(side+"-moving-gaze",[
        wash(side+"-iris",
          "M"+(cx-8)+" "+(cy-9)+" Q"+(cx+3)+" "+(cy-12)+" "+(cx+9)+" "+(cy-4)+
          " Q"+(cx+8)+" "+(cy+12)+" "+cx+" "+(cy+12)+
          " Q"+(cx-10)+" "+(cy+8)+" "+(cx-8)+" "+(cy-9)+" Z",
          p.iris,.94,luminous("#B5B9A2","#35464A",.11,.08),0,0,"normal"),
        wash(side+"-pupil",
          "M"+(cx-3)+" "+(cy-7)+" Q"+(cx+3)+" "+(cy-8)+" "+(cx+4)+" "+(cy-1)+
          " Q"+(cx+5)+" "+(cy+6)+" "+cx+" "+(cy+8)+
          " Q"+(cx-4)+" "+(cy+4)+" "+(cx-3)+" "+(cy-7)+" Z",
          "#272C32",.94,undefined,0,0,"normal"),
        wash(side+"-catchlight",
          "M"+(cx-3)+" "+(cy-5)+" q4 -3 6 1 q0 4 -5 4 Z","#FFF5E4",1,
          undefined,0,0,"normal"),
      ],[key(0),key(150),key(253,-2,0),key(283,2,0),key(359)],
      {x:cx,y:cy}),
      ],undefined,undefined,0,0,aperture),
      mark(side+"-upper-lid",
        "M"+left+" "+(cy+1)+" C"+(left+12)+" "+(cy-8)+" "+
        (cx+3)+" "+(cy-11)+" "+right+" "+(cy-2),
        p.brow,near?1.8:1.55,.80,144),
      mark(side+"-lower-lid",
        "M"+left+" "+(cy+1)+" Q"+(cx+3)+" "+(cy+6)+" "+right+" "+(cy-2),
        p.shade,.95,.47,154),
      mark(side+"-outer-canthus",
        "M"+right+" "+(cy-1)+" q5 -2 8 1",p.brow,1,.7,155),
    ],open,{x:cx,y:cy}),
    group(side+"-closed-eye",[
      mark(side+"-blink-mark",
        "M"+left+" "+(cy+2)+" Q"+cx+" "+(cy+9)+" "+right+" "+(cy+1),
        p.brow,1.9,.9),
    ],closed,{x:cx,y:cy}),
    wash(side+"-brow-volume",
      "M"+(left-4)+" "+(cy-24)+" C"+(cx-16)+" "+(cy-37)+
      " "+(cx+2)+" "+(cy-32)+" "+(right+1)+" "+(cy-27)+
      " Q"+(cx-8)+" "+(cy-29)+" "+(left-4)+" "+(cy-24)+" Z",
      p.brow,.53,luminous(p.hairLight,p.brow,.43,.09),165,51),
    mark(side+"-brow",
      "M"+(left-4)+" "+(cy-24)+" Q"+(cx-10)+" "+(cy-33)+
      " "+(right-2)+" "+(cy-28),
      p.brow,near?1.75:1.5,.55,174),
    mark(side+"-brow-bristles",
      near?[
        "M"+(left+4)+" "+(cy-25)+" q3 -5 7 -5",
        "M"+(left+13)+" "+(cy-30)+" q5 -4 9 -3",
        "M"+(left+25)+" "+(cy-31)+" q6 -2 11 0",
        "M"+(left+40)+" "+(cy-29)+" q7 -1 11 2",
      ].join(" "):[
        "M"+(left+3)+" "+(cy-23)+" q3 -4 7 -5",
        "M"+(left+12)+" "+(cy-29)+" q5 -3 10 -1",
        "M"+(left+26)+" "+(cy-28)+" q5 0 9 2",
      ].join(" "),p.hairDeep,.9,.48,212),
  ],undefined,undefined,126,53);
}

/** Hand-directed broad and broken value strokes, composed in source space.
 * Studied from traditional watercolor portraits: saturated facial color is
 * deliberately concentrated around the orbital ridge, nose wing and cheek;
 * the wide facial lights are left unobstructed. THESE are original contours,
 * never bitmap-backed brush stamps or randomized splatter masks.
 *
 * This function is applied beneath the nose/eyes so the anatomy remains
 * coherent even when each gesture arrives at a different frame.
 */
function paintedFaceValues(p:Palette,subject:PortraitSubject):WatercolourArtPart {
  const older=subject==="sitter-b";
  return group("portrait-directed-value-brushwork",[
    wash("supraorbital-violet-cool",
      older
        ?"M224 223 C246 207 281 208 313 221 Q294 229 265 225"+
          " Q238 233 223 244 L224 223 Z"
        :"M229 217 C253 204 291 202 313 220 Q283 226 260 226"+
          " Q236 231 225 240 Z",
      p.reflected,.34,luminous(p.light,p.reflected,.41,.04),99,69),
    wash("far-brow-warm-undertone",
      older?"M345 217 C365 204 396 211 403 230 Q387 225 374 227"+
        " Q358 229 349 236 Z"
      :"M346 211 C367 201 392 209 401 225 Q379 221 360 228 Z",
      p.shade,.29,luminous(p.light,p.shade,.47,.08),117,59),
    wash("malar-light-uneven-brush",
      older
        ?"M238 303 C249 296 271 294 284 301"+
          " Q272 302 262 312 Q247 316 237 314 Z"
        :"M234 302 Q252 293 278 296 L288 300"+
          " Q270 306 257 315 Q242 319 231 311 Z",
      p.cheek,.22,luminous("#EDB1A0",p.cheek,.68,.05),133,73),
    wash("cheek-cool-broken-plane",
      older
        ?"M220 319 Q239 326 246 353 Q261 371 287 384"+
          " Q261 373 250 352 Q238 347 224 341 Z"
        :"M214 319 C226 328 241 345 248 361"+
          " Q261 386 288 402 Q260 392 242 369 L219 341 Z",
      p.reflected,.23,luminous(p.skin,p.reflected,.58,.02),145,64),
    wash("malar-second-colour-note",
      older
        ?"M366 291 Q384 277 393 294 L385 317 Q369 329 354 334"+
          " Q368 315 366 291 Z"
        :"M369 289 Q391 275 394 294 L390 319 Q382 328 360 332 Z",
      p.cheek,.19,luminous(p.light,p.cheek,.64,.04),143,60),
    wash("nose-saddle-left-plane",
      older
        ?"M302 246 Q316 265 321 287 L320 319"+
          " Q304 300 306 282 L298 264 Z"
        :"M312 247 Q321 262 325 287 L327 310 Q312 293 315 274 Z",
      p.reflected,.32,luminous(p.light,p.reflected,.55,.04),144,53),
    wash("nose-wing-sienna-pigment",
      older
        ?"M313 320 Q326 328 330 339 Q319 349 306 337"+
          " Q307 324 313 320 Z"
        :"M318 314 Q329 321 330 331 Q315 340 311 331 Z",
      p.cheek,.27,luminous(p.light,p.shade,.43,.05),174,44),
    wash("nasolabial-edge-falloff",
      older
        ?"M365 334 C378 343 379 360 369 378"+
          " Q373 358 356 349 Z"
        :"M376 328 Q386 348 370 368 Q372 350 361 344 Z",
      p.shade,.32,luminous(p.skin,p.shade,.44,.02),168,61),
    wash("chin-cool-turn-and-reserved-skin",
      older
        ?"M279 408 Q303 433 326 441 Q357 433 369 409"+
          " Q354 450 328 454 Q299 439 279 408 Z"
        :"M287 399 Q310 423 337 428 Q365 420 378 396"+
          " Q363 441 331 443 Q302 426 287 399 Z",
      p.reflected,.18,luminous(p.skin,p.reflected,.72,.02),173,66),
    wash("jaw-luminous-wet-gap",
      older
        ?"M233 359 Q250 405 280 424 Q264 416 256 393 Z"
        :"M221 350 Q248 408 291 425 Q251 399 236 381 Z",
      p.light,.25,luminous("#F5D5B9",p.light,.47,0),163,59),
  ],undefined,undefined,103,67);
}

/** A few decisive tapered brush silhouettes, rather than fake uniform
 * outlines or evenly scattered freckle noise; these deliberately break
 * before reaching the facial contour.
 */
function drawnFacialAccent(p:Palette,subject:PortraitSubject):WatercolourArtPart {
  const mature=subject==="sitter-b";
  return group("portrait-selective-calligraphic-accents",[
    wash("near-lid-outer-brushstroke",
      mature?"M234 245 Q255 233 277 235 Q290 236 296 240"+
          " Q271 239 251 245 Z"
        :"M244 237 Q260 228 285 232 Q301 233 304 236"+
          " Q276 234 256 242 Z",
      p.brow,.33,luminous(p.shade,p.brow,.15,.02),199,32),
    wash("far-lid-tapered-brushstroke",
      mature?"M351 231 Q361 226 379 226 Q391 227 394 233"+
        " Q375 230 359 234 Z"
      :"M355 226 Q370 222 389 225 Q396 227 400 232"+
        " Q373 227 362 230 Z",
      p.brow,.27,luminous(p.shade,p.brow,.18,.01),201,30),
    mark("bridge-nasal-broken-drawing",
      mature
        ?"M318 261 q2 13 5 21 M348 295 q6 12 5 21"
        :"M329 260 q4 11 6 20 M353 289 q7 13 6 22",
      p.shade,1.24,.46,218),
    mark("lip-gesture-not-outline",
      mature
        ?"M307 381 Q321 382 327 379 M346 385 q11 -3 18 -6"
        :"M306 370 Q321 372 330 370 M343 373 q10 -2 16 -7",
      p.lip,1.32,.52,214),
    mark("cheek-vanishing-dry-edge",
      mature
        ?"M218 323 Q222 346 231 355 M392 325 q-6 15 -11 22"
        :"M220 337 Q226 357 232 363 M395 309 q-7 19 -12 23",
      p.shade,1.02,.31,230),
  ],undefined,undefined,184,45);
}

/** The skull, upper/lower orbital planes, cheekbone, muzzle and jaw are painted
 * as overlapping translucent anatomical value groups, never as emoji features.
 */
function face(p:Palette,subject:PortraitSubject):WatercolourArtPart {
  const mature=subject==="sitter-b";
  return group("living-facial-anatomy",[
    wash("far-ear",
      "M409 264 Q426 253 434 270 Q440 290 422 320 L408 322 Z",
      p.skin,.99,luminous(p.light,p.shade,.23,.11),60,65,"normal"),
    wash("near-ear",
      "M205 263 Q182 248 179 275 Q185 312 207 322 L215 292 Z",
      p.skin,.99,luminous(p.light,p.shade,.22,.12),58,65,"normal"),
    wash("face-foundation",
      mature
        ? "M237 143 C267 116 320 105 366 120 C417 133 431 186 433 238"+
          " C434 292 411 349 397 395 C378 428 348 461 324 462"+
          " Q289 454 267 430 C229 396 212 350 204 306"+
          " C198 263 201 206 214 179 Q224 157 237 143 Z"
        : "M243 142 C274 111 318 103 355 118 C399 130 422 172 425 228"+
          " C431 282 409 343 386 389 C367 418 346 440 331 448"+
          " Q307 451 281 426 C247 403 221 367 210 326"+
          " C196 289 197 236 206 196 Q216 159 243 142 Z",
      p.skin,1,{...luminous(p.light,p.shade,.16,.15),
        glaze:{pigment:p.cheek,opacity:.09}},47,102,"normal"),
    wash("lit-forehead-plane",
      "M246 152 Q287 126 340 148 Q370 155 388 183"+
      " Q359 178 340 195 Q289 185 252 211 Q225 190 246 152 Z",
      p.light,.18,luminous("#F8DEC0",p.skin,.7,.03),82,90),
    wash("temple-lost-edge",
      "M223 168 Q198 224 212 282 Q220 312 224 332"+
      " Q222 269 244 231 Q254 188 272 165 Z",
      p.reflected,.23,luminous(p.light,p.reflected,.97,.04),89,82),
    wash("far-cheek-turn",
      "M389 218 Q413 265 403 312 Q393 358 369 397"+
      " Q378 348 364 327 Q382 279 389 218 Z",
      p.shade,.21,luminous(p.skin,p.reflected,.90,.07),90,97),
    wash("near-zygomatic-light",
      "M220 278 Q251 260 296 281 Q305 305 283 337 Q249 340 226 322 Z",
      p.cheek,.24,luminous(p.light,p.cheek,.88,.07),104,80),
    wash("far-zygomatic-reflection",
      "M361 267 Q385 257 401 287 Q398 313 380 332 Q365 319 361 267 Z",
      p.reflected,.18,luminous(p.light,p.shade,.87,.03),120,72),
    wash("malar-transition",
      "M239 296 Q260 328 292 331 L309 350 Q266 346 248 326 Z",
      p.shade,.14,luminous(p.skin,p.shade,.97,.02),132,62),
    paintedFaceValues(p,subject),
    wash("lower-jaw-turn",
      mature
        ? "M217 337 C237 394 271 429 321 453 Q354 467 390 399"+
          " Q378 445 331 463 Q280 449 252 420 Q225 395 217 337 Z"
        : "M224 338 Q244 400 303 435 Q341 458 376 394 Q361 438 334 452"+
          " Q294 441 266 419 Q238 393 224 338 Z",
      p.reflected,.18,luminous(p.skin,p.shade,.90,.06),111,87),
    wash("nose-dorsum-reserve",
      mature
        ? "M306 228 C325 236 341 263 341 287 L356 320"+
          " Q341 327 324 315 Q327 297 318 269 Z"
        : "M322 224 Q340 235 350 275 L358 310 Q345 315 329 304"+
          " Q329 284 326 265 Z",
      p.light,.25,luminous("#FADEC5",p.skin,.84,.02),125,74),
    wash("nose-side-plane",
      mature
        ? "M347 266 Q363 293 366 310 Q375 326 367 340"+
          " Q349 341 344 330 Q354 309 347 266 Z"
        : "M346 248 Q356 263 365 289 Q374 311 373 321"+
          " Q363 326 353 319 Q359 294 346 248 Z",
      p.shade,.34,luminous(p.light,p.reflected,.79,.06),132,81),
    wash("nose-tip-form",
      mature
        ? "M315 315 Q333 305 353 320 C359 330 349 338 337 338"+
          " Q323 336 315 328 Z"
        : "M328 303 Q343 299 357 308 Q365 317 357 325"+
          " Q339 332 328 319 Z",
      p.cheek,.43,luminous(p.light,p.shade,.41,.07),158,52),
    wash("near-nostril-wing",
      "M322 313 Q317 325 329 330 Q333 326 332 320 Z",
      p.shade,.28,luminous(p.light,p.shade,.4,.02),173,45),
    mark("nostril-indications",
      mature
        ? "M310 333 Q320 339 329 337 M345 339 Q355 334 363 338"
        : "M320 324 Q327 330 333 326 M352 325 Q363 323 369 328",
      p.brow,1.14,.61,196),
    wash("philtrum-planes",
      "M328 334 Q339 336 341 347 Q336 351 330 348 Z",
      p.shade,.13,luminous(p.light,p.shade,.86,0),174,53),
    wash("upper-lip-broken-wash",
      mature
        ? "M289 381 Q309 371 323 374 L332 370 Q341 373 353 374"+
          " Q368 378 373 378 Q360 385 343 387 Q311 387 289 381 Z"
        : "M292 369 Q305 361 320 361 L331 357 Q336 354 341 358"+
          " Q355 359 369 363 Q354 375 337 376 Q313 372 292 369 Z",
      p.lip,.68,luminous("#DDA49A","#805963",.23,.08),172,46),
    wash("lower-lip-transparent",
      mature
        ? "M300 386 Q318 395 337 392 Q360 389 371 380"+
          " Q360 400 335 400 Q312 396 300 386 Z"
        : "M305 373 Q325 382 342 378 Q358 371 368 365"+
          " Q356 390 331 391 Q315 385 305 373 Z",
      p.cheek,.43,luminous(p.light,p.lip,.50,.05),179,53),
    mark("lip-corner-accents",
      mature?"M288 380 q7 5 14 5 M361 383 q8 0 13 -6":
        "M289 367 q6 4 13 5 M361 369 q7 -3 11 -7",
      p.brow,1.05,.64,207),
    wash("sub-labial-shadow",
      mature
        ? "M306 401 Q330 414 359 402 Q352 420 329 420"+
          " Q316 416 306 401 Z"
        : "M317 394 Q338 403 356 392 Q352 412 336 412"+
          " Q325 408 317 394 Z",
      p.shade,.20,luminous(p.skin,p.shade,.85,.03),185,59),
    eye("near",p,subject),eye("far",p,subject),
    drawnFacialAccent(p,subject),
    mark("lid-folds-and-bone",
      "M242 215 Q271 203 305 218 M350 206 Q370 201 394 212"+
      " M245 259 Q275 266 307 250 M356 247 Q374 254 390 240",
      p.shade,1.1,.38,209),
    mark("cheek-and-jaw-lost-lines",
      "M224 326 Q237 369 265 394 M371 401 Q359 424 342 435",
      p.shade,.92,.29,218),
    ...(mature?[
      wash("mature-nasolabial-volume",
        "M364 326 Q376 343 365 370 Q366 357 354 347 Z",
        p.shade,.22,luminous(p.light,p.shade,.72,0),164,75),
      mark("mature-cheek-crease",
        "M364 328 Q379 343 369 368 M239 334 Q246 365 268 377",
        p.shade,.9,.37,220),
      mark("mature-forehead-character",
        "M256 176 Q294 170 324 181 M275 192 Q301 188 324 195",
        p.shade,.8,.25,225),
    ]:[]),
  ],HEAD_PERFORMANCE,{x:331,y:415},45,110);
}

function hair(p:Palette,subject:PortraitSubject):[WatercolourArtPart,WatercolourArtPart] {
  const mature=subject==="sitter-b";
  const back=group("opaque-hair-silhouette",[
    wash("hair-foundation",
      mature
        ?"M203 229 Q183 146 241 93 Q276 48 346 69 Q412 77 432 155"+
          " Q449 218 425 310 Q419 346 407 359 L389 384 Q396 314 398 272"+
          " Q401 200 361 164 Q296 149 232 206 L224 323 Q201 316 203 229 Z"
        :"M186 248 Q156 149 208 87 Q257 24 331 37 Q410 38 443 121"+
          " Q465 189 442 281 C430 343 421 401 448 491 Q406 503 386 482"+
          " Q389 436 404 397 Q377 445 303 455 Q220 443 194 492"+
          " Q163 484 164 464 C186 400 167 337 186 248 Z",
      p.hair,1,{...luminous(p.hairLight,p.hairDeep,.18,.27),
        glaze:{pigment:p.hairDeep,opacity:.12}},37,104,"normal"),
    wash("cool-hair-depth",
      mature
        ?"M370 115 Q426 171 408 267 L391 358 Q429 322 441 230"+
          " Q447 159 399 106 Z"
        :"M376 82 Q432 126 430 218 Q435 319 399 393 Q415 454 434 486"+
          " Q402 466 391 422 Q406 340 411 251 Q410 143 376 82 Z",
      p.hairDeep,.55,luminous(p.hair,p.hairDeep,.55,.09),63,102),
  ],HEAD_PERFORMANCE,{x:331,y:415},36,108);
  const fringe=group("directional-hair-overpainting",[
    wash("crown-root-and-parting",
      mature
        ?"M218 173 Q232 102 292 83 Q351 67 389 116"+
          " Q369 102 348 113 Q310 89 276 132 Q252 165 230 206 Z"
        :"M203 191 Q191 127 243 75 Q292 37 343 53"+
          " Q307 61 290 99 Q252 126 237 171 Z",
      p.hair,.99,luminous(p.hairLight,p.hairDeep,.24,.22),70,99),
    wash("broad-crown-light",
      mature
        ?"M233 144 Q269 91 305 94 Q280 112 265 143 Q249 158 234 180 Z"
        :"M230 137 Q263 67 329 55 Q297 82 276 123 Q257 143 223 167 Z",
      p.hairLight,.32,luminous("#CDC1B2",p.hair,.67,.09),112,70),
    wash("temple-overlap",
      mature
        ?"M379 118 Q409 147 410 207 Q408 244 397 260"+
          " Q398 192 379 118 Z"
        :"M390 109 Q419 154 423 219 Q418 269 405 308"+
          " Q411 222 390 176 Z",
      p.hairDeep,.70,luminous(p.hair,p.hairDeep,.35,.17),93,83),
    wash("crown-unbroken-light-ribbon",
      mature
        ?"M225 160 C242 117 271 93 298 94 Q263 128 251 166"+
          " Q243 178 231 189 Q244 153 225 160 Z"
        :"M211 159 C234 95 271 69 303 57 Q265 92 250 146"+
          " Q238 155 217 176 Z",
      p.hairLight,.23,luminous("#D7B9A3",p.hair,.40,.05),146,57),
    wash("crown-shadow-broken-ribbon",
      mature
        ?"M319 85 Q370 85 399 131 Q410 157 404 177"+
          " Q391 129 369 112 Q355 99 319 85 Z"
        :"M342 57 C380 67 418 110 424 157"+
          " Q410 134 399 115 Q375 79 342 57 Z",
      p.hairDeep,.59,luminous(p.hair,p.hairDeep,.25,.06),149,55),
    wash("temple-reflected-warm-pigment",
      mature
        ?"M224 177 Q213 195 220 243 Q222 263 225 278"+
          " Q229 233 244 211 Z"
        :"M205 173 Q181 214 191 270 Q192 294 188 321"+
          " Q210 285 209 246 Z",
      p.hairLight,.33,luminous("#B89C86",p.hairDeep,.48,.04),168,49),
    mark("root-following-gouache-dry-runs",
      mature
        ?"M226 154 Q241 115 274 99 M244 149 C254 123 270 108 292 105"+
          " M316 94 Q351 97 371 118 M374 122 Q400 152 400 190"
        :"M218 165 Q239 103 277 71 M243 145 Q264 100 300 73"+
          " M293 76 Q330 53 354 74 M379 89 Q409 125 414 155",
      p.hairLight,1.38,.49,205),
    mark("locks-follow-the-scalp",
      mature
        ?"M227 153 Q266 83 315 84 M247 159 Q277 105 313 103"+
          " M323 88 Q381 86 405 159 M391 145 Q418 196 403 256"
        :"M211 171 Q234 86 308 51 M240 149 Q265 84 333 58"+
          " M272 135 Q294 99 360 72 M365 77 Q402 119 411 195"+
          " M176 281 Q177 358 178 426",
      p.hairLight,1.75,.5,164),
    // Authored root-to-tip trajectories: irregular group spacing, different
    // tangent, length and curvature. No repeated cosine/sine stripe texture.
    mark("hair-broken-directional-bristles",
      (mature?[
        "M232 151 C237 117 261 98 279 91","M243 154 Q259 110 295 93",
        "M265 136 Q288 104 320 93","M284 122 Q308 92 344 98",
        "M306 106 Q335 88 362 107","M329 96 Q365 95 385 123",
        "M357 109 Q392 128 398 154","M384 142 Q403 166 402 187",
        "M402 177 Q410 212 400 235",
      ]:[
        "M219 165 C234 128 247 89 279 68","M232 152 Q253 97 294 63",
        "M249 144 C267 105 283 67 326 52","M269 129 Q290 76 342 58",
        "M285 116 Q310 73 353 63","M306 98 Q331 63 364 71",
        "M329 81 Q353 60 378 85","M355 81 Q385 91 397 117",
        "M384 104 C406 126 410 165 406 195",
        "M401 162 Q417 202 409 232",
      ]).join(" "),p.hairLight,.82,.42,222),
    ...(mature?[
      mark("grey-temple-whisps","M398 161 Q409 194 402 221 M231 172 Q214 192 218 221",
        "#C8B9A8",1.1,.64,208),
    ]:[
      wash("left-shoulder-falling-hair",
        "M191 288 C178 341 201 397 179 443 L165 476 Q203 454 208 420"+
        " Q219 375 198 323 Z",p.hair,.74,luminous(p.hairLight,p.hairDeep,.6,.12),126,77),
      mark("loose-crown-fibres",
        "M209 106 Q193 79 219 64 M424 123 Q452 155 440 190 M168 355 Q155 387 160 413",
        p.hairLight,.88,.42,219),
    ]),
  ],HEAD_PERFORMANCE,{x:331,y:415},60,105);
  return [back,fringe];
}

function garment(p:Palette,subject:PortraitSubject):WatercolourArtPart {
  const mature=subject==="sitter-b";
  return group("tailored-clothing-and-connected-shoulders",[
    wash("clothing-opaque-base",
      "M263 478 Q219 496 167 528 C117 550 85 607 68 677 L51 792"+
      " L553 792 L538 671 Q529 590 492 555 Q439 521 376 476"+
      " Q338 509 302 508 Q281 494 263 478 Z",
      p.garment,1,luminous(p.garmentLight,p.garmentDeep,.26,.17),60,100,"normal"),
    wash("clothing-shadow-left",
      "M168 531 Q109 575 86 660 L74 781 L234 781"+
      " Q218 638 268 537 Z",
      p.garmentDeep,.46,luminous(p.garment,p.garmentDeep,.64,.09),89,81),
    wash("clothing-fold-right",
      "M396 510 Q476 540 509 601 Q530 672 531 773 L394 779"+
      " Q403 615 396 510 Z",
      p.garmentDeep,.37,luminous(p.garmentLight,p.garmentDeep,.69,.08),99,86),
    // Bold, anatomically placed fabric washes replace noisy all-over texture.
    // Tapered edges describe actual sleeve fall and collar weight.
    wash("shoulder-left-bloom",
      "M159 558 Q115 581 102 639 Q116 627 134 626"+
      " Q160 613 176 631 Q164 599 159 558 Z",
      p.garmentLight,.29,luminous("#B7AEA0",p.garment,.45,.06),115,84),
    wash("shoulder-right-broken-violet",
      "M415 527 Q483 557 506 610 Q493 598 477 610"+
      " Q454 603 432 589 Q444 565 415 527 Z",
      p.reflected,.24,luminous(p.garmentLight,p.reflected,.69,.02),126,80),
    wash("chest-suggestion-of-fabric-weight",
      "M255 617 Q274 634 286 674 Q285 725 295 765"+
      " Q266 725 268 698 Q268 648 255 617 Z",
      p.garmentDeep,.23,luminous(p.garment,p.garmentDeep,.47,.03),150,83),
    wash("lapel-reserved-lift",
      "M188 542 Q235 517 263 509 Q278 536 289 556"+
      " Q250 544 235 564 Q205 557 188 542 Z",
      p.garmentLight,.29,luminous("#E1D0B9",p.garment,.32,.07),152,71),
    wash("right-lapel-tail-glaze",
      "M395 517 Q437 535 459 561 Q428 565 405 593"+
      " Q419 550 395 517 Z",
      p.garmentDeep,.27,luminous(p.garment,p.garmentDeep,.38,.07),161,62),
    wash("inner-shirt-reserved",
      "M268 491 Q302 520 333 532 Q357 517 379 493"+
      " Q366 555 335 661 Q316 569 268 491 Z",
      p.fabric,.93,luminous("#FFF1D7","#A89A91",.18,.05),101,81,"normal"),
    wash("left-lapel-plane",
      "M168 534 Q211 507 264 492 L315 568 Q275 610 257 676"+
      " Q222 599 168 534 Z",
      p.garmentLight,.57,luminous("#D1C9B8",p.garment,.48,.10),106,88),
    wash("right-lapel-plane",
      "M381 493 Q444 523 476 566 L382 646 Q373 598 341 552 Z",
      p.garmentLight,.43,luminous("#D6CEB9",p.garmentDeep,.42,.08),122,67),
    mark("construction-of-seams",
      "M171 537 Q220 520 266 507 L298 568 M380 502 Q435 530 465 565"+
      " M382 641 Q409 600 466 568",
      p.garmentDeep,1.38,.6,190),
    mark("fabric-fold-gesture",
      "M107 654 Q131 621 157 638 M124 706 Q143 700 159 722"+
      " M435 609 Q461 603 484 637 M430 703 Q451 692 482 713",
      p.garmentLight,1.7,.38,211),
    mark("sewn-fabric-broken-drybrush",
      "M148 557 Q118 595 121 612 M163 551 Q154 570 155 590"+
      " M400 532 Q435 544 445 564 M385 631 Q394 648 395 672"+
      " M314 664 Q322 691 313 710",
      p.garmentDeep,1.25,.36,226),
    ...(mature?[
      wash("collared-shirt-v-notch",
        "M277 489 Q318 537 342 531 L338 597 Q311 558 277 489 Z",
        "#F2DFC2",.42,luminous("#FAEED8",p.fabric,.34,.05),117,74),
    ]:[
      wash("warm-scarf-soft-overlap",
        "M248 489 Q291 514 334 522 Q362 522 391 484"+
        " L406 521 Q376 547 348 559 Q307 562 277 535 Z",
        "#B99B90",.56,luminous("#F0C9B0","#8F7C83",.48,.05),115,85),
    ]),
  ],undefined,undefined,59,97);
}

function neck(p:Palette):WatercolourArtPart {
  return group("neck-with-collarbone-planes",[
    wash("opaque-neck",
      "M268 394 Q289 432 256 480 Q286 526 331 529"+
      " Q357 527 384 480 Q355 454 382 392 Z",
      p.skin,.995,luminous(p.light,p.shade,.34,.13),56,95,"normal"),
    wash("neck-shadow-plane",
      "M367 414 Q351 471 380 482 Q358 512 344 509"+
      " Q345 463 367 414 Z",
      p.shade,.35,luminous(p.skin,p.reflected,.80,.06),91,82),
    wash("neck-reserved-light",
      "M274 437 Q284 482 313 501 Q285 495 267 480 Z",
      p.light,.24,luminous("#FADEC4",p.skin,.82,.01),113,61),
    mark("collarbone-continuity",
      "M261 480 Q286 502 309 505 M347 504 Q370 496 383 480",
      p.shade,1.06,.38,198),
  ],undefined,undefined,56,95);
}

function matureBeard(p:Palette):WatercolourArtPart {
  return group("salt-pepper-beard-with-volume",[
    wash("beard-contour-not-a-mask",
      "M223 351 Q244 400 280 423 Q303 457 337 460"+
      " Q370 438 390 391 Q392 360 382 348"+
      " Q369 389 343 413 Q319 429 293 411 Q249 389 223 351 Z",
      p.hair,.39,luminous(p.hairLight,p.hairDeep,.73,.08),151,78),
    wash("beard-sculpted-side-volume",
      "M239 367 Q250 385 274 398 Q294 416 311 423"+
      " Q289 412 271 410 Q250 398 239 367 Z",
      p.hairDeep,.38,luminous(p.hairLight,p.hairDeep,.42,.07),166,64),
    wash("beard-chin-salt-pigment",
      "M308 418 Q326 425 336 428 Q349 420 365 413"+
      " Q361 438 340 451 Q314 438 308 418 Z",
      p.hair,.56,luminous("#A29B96",p.hairDeep,.37,.10),177,60),
    wash("chin-shadow-through-beard",
      "M279 406 Q307 425 335 432 Q360 421 383 386"+
      " Q367 451 331 465 Q299 453 279 406 Z",
      p.hairDeep,.28,luminous(p.hair,p.hairDeep,.72,.06),173,58),
    // Individual growth paths turn around the jaw instead of repeating
    // a regular sine-wave beard hatch.
    mark("beard-growth-flow",[
      "M238 369 Q239 388 249 403","M248 385 Q254 405 270 416",
      "M265 398 Q277 420 295 433","M284 410 Q297 433 308 443",
      "M305 423 Q312 445 322 450","M328 435 Q331 449 337 454",
      "M347 431 Q345 449 340 455","M363 423 Q359 441 345 449",
      "M379 400 Q372 427 351 439","M386 384 Q378 407 363 418",
      "M284 398 q9 5 15 15","M350 418 q-8 18 -17 21",
    ].join(" "),p.hairLight,.9,.49,208),
    mark("moustache-broken-hairs",
      "M301 351 Q318 345 330 350 M343 351 Q356 345 370 353",
      p.hairDeep,2.2,.52,199),
  ],HEAD_PERFORMANCE,{x:331,y:415},151,82);
}

function figure(subject:PortraitSubject):WatercolourArtPart {
  const p=PALETTES[subject],mature=subject==="sitter-b";
  const [backHair,frontHair]=hair(p,subject);
  return group("rebuilt-human-"+subject,[
    backHair,
    garment(p,subject),
    neck(p),
    face(p,subject),
    frontHair,
    ...(mature?[matureBeard(p)]:[]),
    ...(mature?[]:[
      wash("small-earring-light",
        "M417 314 q6 0 5 12 q-7 7 -10 -3 Z",
        "#D3B68D",.92,luminous("#F5D7A6","#927866",.1,.08),217,31,"normal"),
    ]),
  ]);
}

/** Standalone detailed source figure for multi-character watercolor staging.
 * Consumer placements never alter original brush paths or mutate a sitter.
 */
export function watercolorPortraitFigure(subject:PortraitSubject):WatercolourArtPart {
  if(!PORTRAIT_SUBJECTS.includes(subject))throw new RangeError("Unknown watercolor portrait subject");
  return figure(subject);
}

export function watercolorPortraitSpec(output:PortraitOutput,seed=83,
  subject:PortraitSubject="sitter-a"):WatercolourArtwork {
  if(!PORTRAIT_SUBJECTS.includes(subject))throw new RangeError("Unknown watercolor portrait subject");
  const upright=output==="portrait",width=upright?540:960,height=upright?960:540;
  const paper={color:"#F8F1E7",tooth:.8,granulation:.73};
  const drops:(readonly [string,number,number,number,string,number,number,number])[] =
    upright?[
      ["daylight-blue",101,188,182,"#B5C6CA",.56,.91,0],
      ["muted-rose",442,306,162,"#DFC2B3",.54,.89,31],
      ["cobalt-reserve",415,566,193,"#AFC1C6",.37,.94,47],
      ["amber-bottom",155,819,180,"#D5BCA6",.37,.93,89],
      ["blue-grey-corner",56,692,126,"#ACB8BE",.32,.95,74],
    ]:[
      ["atmospheric-blue",716,103,177,"#A7C0C4",.55,.93,0],
      ["warm-diffusion",227,143,191,"#E2C5B1",.56,.92,21],
      ["soft-sienna",730,342,182,"#D2B0A3",.43,.91,55],
      ["blue-slate",154,414,145,"#A9B9C0",.44,.92,87],
      ["quiet-sage",822,442,154,"#AFBDAF",.39,.92,103],
    ];
  const wetPaper:WetPaperSpec={
    version:1,width,height,seed,paper,flow:.61,granulation:.77,
    dryFrames:178,cellSize:30,edgePooling:.16,
    drops:drops.map(([id,x,y,radius,pigment,load,water,startFrame]):WetPigmentDrop=>
      ({id,x,y,radius,pigment,load,water,startFrame})),
  };
  // All anatomy is authored in one 600×800 local coordinate space and fit to
  // the actual camera ratio; native paper space, not CSS cover or clipped titles.
  const placement=upright?{x:-121,y:37,scale:1.22}:{x:279,y:-28,scale:.74};
  const atmosphere=wash("unpainted-paper-atmosphere",
    upright?"M22 210 Q85 149 147 230 Q193 307 82 356 Z":
      "M58 184 Q126 120 218 192 Q251 269 115 305 Z",
    "#ADAFB9",.065,luminous("#DCC8BB","#A3B7BD",.85,0),29,104);
  return {
    version:1,width,height,seed,paper,wetPaper,
    parts:[group("art-directed-watercolour-portraits",[
      atmosphere,group("portrait-framing",[figure(subject)],
        [key(0,placement.x,placement.y,0,placement.scale)]),
    ])],
  };
}
