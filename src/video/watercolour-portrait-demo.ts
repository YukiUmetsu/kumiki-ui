import type { WatercolourArtKey, WatercolourArtPart, WatercolourArtwork,
  WatercolourWashTreatment } from "../../registry/video/watercolour-illustration";
import type { WetPaperSpec, WetPigmentDrop } from "../../registry/video/watercolour-wet-paper";

/** Original, constructed human portrait. Source photographs/artist paintings are
 * NOT downloaded, traced, embedded, or repackaged. The WC10 material renderer
 * accepts this scene without any change to its public schema.
 */
export type PortraitOutput = "landscape" | "portrait";
const pose = (frame:number,x=0,y=0,rotation=0,scale=1,opacity=1):WatercolourArtKey =>
  ({frame,x,y,rotation,scale,opacity});
// Opaque watercolor first washes cover their construction underlayers.
 // Local glazing passes remain multiply; optical color still has real depth.
const NORMAL_UNDERPAINTINGS = new Set([
  "opaque-face-volume","neck-volume","opaque-coat","hair-opaque-back",
  "near-ear","far-ear","near-sclera","far-sclera","near-glint","far-glint",
  "forehead-reserve","nose-bridge-light","shirt-negative-space",
  "collar-ochre","left-lapel","right-lapel",
]);
const wash = (id:string,path:string,fill:string,opacity=1,
  treatment?:WatercolourWashTreatment,begin=0,fade=0):WatercolourArtPart =>
  ({kind:"path",id,path,fill,opacity,technique:"wash",
    composite:NORMAL_UNDERPAINTINGS.has(id)?"normal":"multiply",
    ...(treatment?{wash:treatment}:{}),
    startFrame:begin,fadeFrames:fade});
const line = (id:string,path:string,stroke:string,width=1,opacity=1,
  begin=0):WatercolourArtPart =>
  ({kind:"path",id,path,stroke,strokeWidth:width,opacity,
    technique:"drybrush",startFrame:begin,fadeFrames:begin?24:0});
const group = (id:string,children:WatercolourArtPart[],keys?:WatercolourArtKey[],
  pivot?:{x:number;y:number},begin=0,fade=0,clipPath?:string):WatercolourArtPart =>
  ({kind:"group",id,children,...(keys?{keys}:{}),...(pivot?{pivot}:{}),
    ...(clipPath?{clipPath}:{}),startFrame:begin,fadeFrames:fade});

export const PORTRAIT_LANDMARKS = {
  crown:{x:286,y:60},chin:{x:292,y:432},
  nearEye:{x:249,y:229},farEye:{x:351,y:220},
  nose:{x:316,y:312},mouth:{x:307,y:364},
  neck:{x:300,y:451},
  leftShoulder:{x:115,y:565},rightShoulder:{x:468,y:558},
} as const;

const portraitFigure = ():WatercolourArtPart => {
  const clothing=group("rooted-shoulders-and-clothing",[
    wash("opaque-coat",
      "M262 482 C233 481 195 509 159 530 Q104 552 81 637 Q65 721 93 783 L504 783 Q522 716 514 648 Q502 576 454 546 C419 520 386 501 348 482 Q312 502 262 482 Z",
      "#5F7784",.98,{highlight:"#B4B9AD",shadow:"#334257",
        glaze:{pigment:"#687A90",opacity:.13},edgePooling:.29},38,108),
    wash("left-seam-shadow",
      "M164 531 Q123 550 102 620 Q91 679 112 762 L244 780 Q245 657 258 594 Q208 549 164 531 Z",
      "#596D7D",.46,{highlight:"#A4B1AB",shadow:"#405267",edgeSoftness:.63},61,99),
    wash("right-seam-shadow",
      "M357 508 Q429 526 474 567 Q506 638 501 769 L348 780 Q356 628 357 508 Z",
      "#516A78",.47,{highlight:"#9DABA6",shadow:"#3C4E63",edgeSoftness:.57},71,112),
    wash("collar-ochre",
      "M240 481 Q271 518 315 523 Q337 501 354 482 Q384 502 398 526 Q353 560 324 617 Q301 566 281 548 Q248 529 213 523 Z",
      "#B4A18E",.78,{highlight:"#E6CEB0",shadow:"#817986",
        edgePooling:.21},80,80),
    wash("shirt-negative-space",
      "M249 496 Q276 522 319 553 Q336 514 359 494 Q350 556 320 612 Q289 549 249 496 Z",
      "#E5D7C3",.84,{highlight:"#F6EBDC",shadow:"#B5A7A3"},86,72),
    wash("left-lapel",
      "M159 533 Q216 517 271 505 L290 551 Q258 600 247 653 Q213 592 159 533 Z",
      "#8C9BA0",.73,{highlight:"#C8C9BC",shadow:"#53697B"},101,62),
    wash("right-lapel",
      "M356 506 Q416 522 444 567 L364 625 Q351 587 334 548 Z",
      "#ABB0A8",.67,{highlight:"#D6CCB9",shadow:"#687A83"},106,69),
    line("collar-seam-details",
      "M168 532 Q235 529 274 551 M364 509 Q401 527 434 559 M362 625 Q390 594 439 570",
      "#5C6370",1.25,.44,152),
    line("cloth-folds",
      "M120 621 Q157 621 177 644 M113 678 Q147 662 173 698 M420 615 Q464 607 483 650 M193 693 Q225 691 242 728",
      "#E8E0D2",1.55,.42,166),
    wash("left-cloth-soft-crease",
      "M126 615 Q152 615 181 646 Q159 649 137 634 Z",
      "#9DA9AD",.17,{highlight:"#CBD0C5",shadow:"#6B7789",
        edgeSoftness:.85},130,80),
    wash("right-cloth-soft-crease",
      "M425 600 Q463 615 486 659 Q465 649 448 635 Z",
      "#8C9EAD",.18,{highlight:"#BBC6C3",shadow:"#5C7381",
        edgeSoftness:.75},150,66),
    line("lifted-bottom-brush",
      "M106 741 Q146 753 195 746 M263 760 Q294 751 317 759 M377 752 Q434 759 489 743",
      "#36536C",2.2,.3,196),
  ],undefined,undefined,37,107);

  const neck=group("neck-and-collarbones",[
    wash("neck-volume",
      "M252 379 Q257 417 238 478 Q250 504 298 521 Q334 520 360 483 Q341 451 365 383 Z",
      "#CCA08E",.99,{highlight:"#F2D4B9",shadow:"#94747B",
        glaze:{pigment:"#CA9788",opacity:.11},edgePooling:.17},56,102),
    wash("neck-side-reflected",
      "M252 405 Q260 439 279 466 L277 504 Q242 489 238 479 Q246 446 252 405 Z",
      "#B78E8A",.44,{highlight:"#ECC0A9",shadow:"#8C7787"},72,80),
    wash("neck-cool-shadow",
      "M344 422 Q335 469 354 484 Q338 502 315 506 Q327 461 344 422 Z",
      "#8B8189",.43,{highlight:"#CEABA4",shadow:"#626D82"},84,85),
    line("clavicle-attachments",
      "M238 481 Q266 503 286 505 M318 507 Q340 502 358 480 M298 464 Q304 477 301 490",
      "#A07B78",1,.36,154),
  ],undefined,undefined,55,108);

  const backHair=group("behind-head-hair-mass",[
    wash("hair-opaque-back",
      "M171 205 Q149 166 177 110 C201 47 249 31 282 37 C336 13 390 49 416 101 Q450 164 431 263 Q411 361 423 425 Q438 477 463 513 Q407 524 366 498 C388 464 382 433 372 408 Q340 456 258 438 Q194 469 141 517 Q138 471 159 395 Q133 337 145 266 Q148 224 171 205 Z",
      "#6D5967",.96,{highlight:"#AE8E91",shadow:"#39414D",
        glaze:{pigment:"#676176",opacity:.14},edgePooling:.35},39,95),
    wash("hair-rim-right",
      "M356 64 Q420 112 427 188 Q438 299 396 388 Q397 463 445 502 Q409 500 376 481 Q379 434 396 394 Q416 291 407 198 Q408 125 356 64 Z",
      "#967D82",.29,{highlight:"#CCAAA0",shadow:"#5F5364",
        edgeSoftness:.55,gradient:"radial"},64,117),
    wash("hair-rim-left",
      "M193 106 Q164 170 173 251 Q187 338 158 404 L141 504 Q191 472 193 415 Q202 362 185 285 Q176 206 215 96 Z",
      "#554A58",.71,{highlight:"#957F82",shadow:"#393C4C",
        edgeSoftness:.33},76,93),
    line("underlayer-hair-flow",
      "M196 86 Q160 170 182 246 Q191 311 172 409 M377 70 Q414 133 409 241 Q407 341 419 427",
      "#B5978D",1.25,.34,139),
  ],undefined,undefined,36,96);

  const eye=(side:"near"|"far"):WatercolourArtPart=>{
    const near=side==="near", cx=near?249:350,cy=near?230:220;
    const a=cx-(near?27:23),b=cx+(near?27:24);
    const upper="M"+a+" "+cy+" Q"+(cx-12)+" "+(cy-12)+" "+cx+" "+(cy-7)+
      " Q"+(cx+14)+" "+(cy-12)+" "+b+" "+(cy-1);
    const lower="M"+a+" "+cy+" Q"+cx+" "+(cy+8)+" "+b+" "+(cy-1);
    // The iris must share the same opening silhouette as the sclera. Painting
    // it over the entire eye creates a doll-like iris spilling through lids.
    const aperture="M"+a+" "+cy+" Q"+cx+" "+(cy-13)+" "+b+" "+(cy-1)+
      " Q"+cx+" "+(cy+8)+" "+a+" "+cy+" Z";
    const blink=[pose(0),pose(171),pose(180,0,0,0,1,0),
      pose(188,0,0,0,1,0),pose(197),pose(310),
      pose(319,0,0,0,1,0),pose(326,0,0,0,1,0),pose(334),pose(359)];
    const shut=[pose(0,0,0,0,1,0),pose(172,0,0,0,1,0),pose(181),
      pose(188),pose(197,0,0,0,1,0),pose(311,0,0,0,1,0),
      pose(320),pose(327),pose(334,0,0,0,1,0),pose(359,0,0,0,1,0)];
    return group(side+"-eye-orbit",[
      wash(side+"-orbit",
        "M"+(a-8)+" "+(cy-2)+" Q"+(cx-9)+" "+(cy-24)+" "+
        (cx+7)+" "+(cy-19)+" Q"+(b+11)+" "+(cy-12)+" "+
        (b+6)+" "+(cy+14)+" Q"+cx+" "+(cy+21)+" "+(a-8)+" "+(cy-2)+" Z",
        "#A9878C",.17,{highlight:"#E7BCAF",shadow:"#7F7885",
          gradient:"radial",edgeSoftness:.88},112,55),
      group(side+"-open-eyelids",[
        wash(side+"-sclera",aperture,
          "#CBB7AC",.34,{highlight:"#FAE9D9",shadow:"#C1AAA6",
            gradient:"radial",edgeSoftness:.14}),
        group(side+"-iris-gaze",[
          wash(side+"-iris",
            "M"+(cx-7)+" "+(cy-6)+" Q"+(cx-10)+" "+(cy+2)+" "+
            cx+" "+(cy+7)+" Q"+(cx+8)+" "+(cy+3)+" "+(cx+7)+" "+(cy-6)+" Z",
            near?"#726B62":"#79817D",.86,
            {highlight:"#B7A88B",shadow:"#3C464A",gradient:"radial",edgePooling:.08}),
          wash(side+"-pupil",
            "M"+(cx-2.2)+" "+(cy-5)+" Q"+(cx+3.3)+" "+(cy-5)+" "+
            (cx+3.2)+" "+(cy+2)+" Q"+cx+" "+(cy+5)+" "+(cx-2.2)+" "+(cy+2)+" Z",
            "#3A3B40",.95),
          wash(side+"-glint",
            "M"+(cx-3)+" "+(cy-4)+" q4 -3 5 0 q-1 4 -5 3 Z",
            "#FBF1E5",.98),
        ],[pose(0),pose(165),pose(235,-1,0),pose(271,2,0),pose(359)],
          {x:cx,y:cy}),
        line(side+"-upper-lid",upper,"#71585E",near?2.3:2,.84),
        line(side+"-lower-lid",lower,"#A78182",1.14,.64),
        line(side+"-eye-corner",
          "M"+b+" "+(cy-1)+" q5 -1 7 1","#765C64",.8,.66),
      ],blink,{x:cx,y:cy},0,0,aperture),
      group(side+"-closed-lids",[
        line(side+"-blink-crease",
          "M"+a+" "+(cy+2)+" Q"+cx+" "+(cy+11)+" "+b+" "+(cy+1),
          "#6E535D",2.05,.88),
      ],shut,{x:cx,y:cy}),
    ],undefined,undefined,138,55);
  };

  const face=group("facial-planes-and-portrait-identity",[
    wash("near-ear",
      "M196 255 Q176 244 171 265 Q173 303 198 313 L203 285 Z",
      "#C89184",.97,{highlight:"#EAC3AB",shadow:"#96717A"},78,92),
    wash("far-ear",
      "M397 258 Q414 245 418 276 Q418 310 399 324 L392 290 Z",
      "#C08D83",.93,{highlight:"#E1B4A3",shadow:"#93727C"},83,95),
    wash("opaque-face-volume",
      "M213 135 Q247 109 305 104 C354 108 385 141 400 189 Q415 258 393 321 C383 363 348 411 322 429 Q294 441 266 418 C227 385 201 349 188 311 Q171 254 179 204 Q181 160 213 135 Z",
      "#D7AD99",.995,{highlight:"#F3DCCA",shadow:"#AE8583",
        glaze:{pigment:"#CA998D",opacity:.075},gradient:"radial",edgePooling:.10},63,107),
    wash("forehead-reserve",
      "M233 153 C263 144 306 143 329 157 Q322 175 287 183 Q255 185 233 153 Z",
      "#E9C8B4",.18,{highlight:"#F9E8D5",shadow:"#D8A99D",
        gradient:"radial",edgeSoftness:.84},107,75),
    wash("temple-cool-plane",
      "M209 144 C189 173 192 229 198 263 Q198 312 219 344 C214 304 215 278 212 255 Q206 199 236 155 Z",
      "#AE9196",.18,{highlight:"#DEB9AA",shadow:"#837B91",
        edgeSoftness:1,gradient:"radial"},108,73),
    wash("far-side-face-plane",
      "M358 148 C389 194 396 242 387 297 Q374 353 351 383 C362 332 367 298 360 272 Q371 197 358 148 Z",
      "#897F8E",.14,{highlight:"#D1AEAA",shadow:"#79768A",
        edgeSoftness:.95,gradient:"radial"},118,83),
    wash("warm-near-cheek",
      "M199 286 C213 273 244 278 256 300 Q259 321 237 342 Q215 334 199 307 Z",
      "#D49E95",.18,{highlight:"#E7C5B2",shadow:"#B77F82",
        edgeSoftness:1,gradient:"radial"},122,67),
    wash("far-cheek-reflected",
      "M334 288 Q360 280 377 302 C376 328 363 352 348 349 Q326 336 334 288 Z",
      "#B69AA0",.15,{highlight:"#E0BDB4",shadow:"#918B9E",
        edgeSoftness:1,gradient:"radial"},129,71),
    wash("jaw-soft-edge",
      "M208 351 Q232 396 285 425 Q321 435 353 397 Q340 432 295 436 Q253 425 220 391 Z",
      "#AB8E8E",.17,{highlight:"#D6B3A9",shadow:"#8F8291",
        gradient:"radial",edgeSoftness:.86},128,86),
    wash("nose-bridge-light",
      "M295 246 Q305 247 311 267 Q309 289 312 300 Q295 303 292 294 Q300 275 295 246 Z",
      "#E5C0AF",.20,{highlight:"#FAE2C9",shadow:"#CF9D96",
        gradient:"radial",edgeSoftness:.80},145,54),
    wash("nose-side-plane",
      "M316 258 Q323 280 325 296 Q334 310 330 318 Q322 316 318 307 Q319 287 316 258 Z",
      "#AD8D91",.27,{highlight:"#DDB7AE",shadow:"#83767F",
        edgeSoftness:.78,gradient:"radial"},147,57),
    wash("nose-tip",
      "M298 304 C306 299 319 299 323 307 Q327 321 317 322 Q303 321 298 304 Z",
      "#D5A28F",.43,{highlight:"#F5D5B7",shadow:"#A57A77",
        gradient:"radial",edgeSoftness:.50},157,42),
    line("nose-alar-and-nostrils",
      "M288 310 Q293 323 304 323 M321 321 Q332 316 335 322",
      "#805F67",1.10,.65,176),
    line("philtrum",
      "M304 332 Q305 342 302 347 M317 334 Q318 341 315 345",
      "#AC8584",.80,.49,184),
    wash("upper-lip",
      "M273 365 C282 361 293 359 301 360 Q308 354 315 358 C328 354 338 360 342 362 Q327 372 310 371 Q285 369 273 365 Z",
      "#B98381",.59,{highlight:"#DFAEA1",shadow:"#9D777B",
        gradient:"radial",edgeSoftness:.32,edgePooling:.06},163,49),
    wash("lower-lip",
      "M282 371 Q300 378 318 374 Q334 370 341 364 Q330 383 308 383 Q291 380 282 371 Z",
      "#C99993",.44,{highlight:"#EEC4B1",shadow:"#B28C8D",
        gradient:"radial",edgeSoftness:.48},176,47),
    line("mouth-corners",
      "M270 365 Q281 367 290 369 M330 371 Q339 366 344 362",
      "#765A63",.82,.62,185),
    line("under-eye-and-cheek",
      "M225 252 Q246 263 273 248 M328 244 Q348 254 369 239 M210 324 Q221 348 236 357 M363 335 Q357 353 346 363",
      "#AC8388",.78,.38,176),
    line("brow-root-near",
      "M220 214 Q244 199 273 210 M228 208 Q250 204 267 208",
      "#5E515D",2.2,.66,153),
    line("brow-root-far",
      "M326 205 Q347 191 370 203 M335 201 Q354 197 364 202",
      "#5A5160",2.15,.69,159),
    // These soft anatomical transition marks deliberately avoid fully
    // outlined eye bags, oval cheeks and a triangular nose shadow.
    wash("near-supraorbital-light",
      "M223 192 Q248 177 276 198 Q264 194 253 197 Q239 191 223 203 Z",
      "#ECC5B1",.16,{highlight:"#F9DFC6",shadow:"#C49A98",
        gradient:"radial",edgeSoftness:.92},130,60),
    wash("far-supraorbital-cool",
      "M323 188 Q347 177 376 194 Q362 195 347 191 Q331 195 323 199 Z",
      "#BBA7A7",.14,{highlight:"#E8C5B8",shadow:"#8A8895",
        edgeSoftness:.86},139,55),
    wash("lacrimal-near",
      "M222 228 Q227 232 233 231 Q227 236 223 234 Z",
      "#B88882",.19,{highlight:"#DDACA0",shadow:"#956E76",
        edgeSoftness:.45},171,34),
    wash("lacrimal-far",
      "M327 219 Q330 221 336 221 Q331 225 328 224 Z",
      "#B4938B",.16,{highlight:"#DFC1AD",shadow:"#977E85",
        edgeSoftness:.38},179,35),
    wash("nose-to-cheek-transition",
      "M327 277 Q338 298 346 309 Q343 330 330 340 Q332 316 322 294 Z",
      "#B59A9A",.13,{highlight:"#E3BAB0",shadow:"#8C8497",
        edgeSoftness:.96,gradient:"radial"},145,73),
    wash("upper-lip-cast-shadow",
      "M275 353 Q302 349 329 352 Q335 356 343 356 Q330 354 313 356 Q289 355 275 356 Z",
      "#A78081",.15,{highlight:"#DBB2A4",shadow:"#826976",
        edgeSoftness:.68},177,46),
    eye("near"),eye("far"),
    line("chin-and-jaw-precision",
      "M209 343 Q219 378 248 402 M319 431 Q348 408 365 375 M297 393 Q311 397 325 391",
      "#9F7980",1.05,.39,215),
  ],undefined,undefined,56,105);

  const frontHair=group("anatomical-hair-and-temple-strands",[
    wash("left-fringe-root",
      "M181 190 C169 154 182 112 210 80 C237 48 279 29 326 45 C282 70 257 105 238 133 Q215 173 201 205 Q195 182 188 153 Q189 178 181 190 Z",
      "#6F5B6C",.91,{highlight:"#B49899",shadow:"#3E4354",edgePooling:.15},58,95),
    wash("swept-top-clump",
      "M205 159 C232 101 279 64 327 51 C361 49 389 76 403 101 C373 79 345 82 320 98 C290 113 272 140 242 153 Q222 166 205 159 Z",
      "#796676",.81,{highlight:"#C3A199",shadow:"#514C60",edgePooling:.18},78,99),
    wash("right-temple-tress",
      "M348 72 C382 93 408 131 415 174 C420 211 408 253 391 302 C392 259 381 227 385 184 Q380 123 348 72 Z",
      "#5A5062",.90,{highlight:"#A18895",shadow:"#3D4654"},87,102),
    wash("left-temple-drape",
      "M194 165 C182 215 184 254 190 301 C188 322 203 359 214 381 C184 354 177 326 173 286 C166 245 174 199 194 165 Z",
      "#413D4D",.84,{highlight:"#7D696E",shadow:"#30323F"},91,91),
    wash("warm-top-glazing",
      "M220 102 C261 58 300 48 331 53 C290 77 267 104 245 132 Q229 147 206 150 C210 132 212 122 220 102 Z",
      "#A77F7C",.33,{highlight:"#E0AC96",shadow:"#645B6A"},102,71),
    line("hair-flow-not-a-wig",
      "M208 131 Q239 76 313 53 M233 129 Q282 66 329 63 M355 83 Q393 132 392 199 M175 226 Q173 293 196 342 M382 197 Q393 244 380 279",
      "#C1A299",1.2,.61,160),
    line("hair-separated-locks",
      "M217 107 Q248 75 265 69 M291 68 Q314 62 341 72 M377 105 Q402 153 405 193 M183 186 Q178 232 182 266",
      "#323440",1.1,.49,188),
    line("flyaway-fibres",
      "M160 171 Q142 148 167 120 M424 123 Q458 189 438 266 M174 380 Q150 426 143 452",
      "#A28D92",.85,.4,196),
    // Tapered brush ribbons follow actual hair growth rather than geometric
    // quads. Each soft edge can dry/bleed without blurring the eyelids.
    wash("upper-hair-root-break",
      "M195 127 C212 85 251 60 291 51 C257 73 226 100 215 128 Q207 147 200 164 Q200 139 195 127 Z",
      "#594956",.47,{highlight:"#AD8D88",shadow:"#393947",
        gradient:"radial",edgeSoftness:.29},120,58),
    wash("hair-luminous-sweep",
      "M218 118 C241 86 275 63 306 58 Q274 75 251 102 Q235 126 216 150 C220 136 214 128 218 118 Z",
      "#C0A095",.30,{highlight:"#E0BCA5",shadow:"#86727C",
        gradient:"radial",edgeSoftness:.40},142,61),
    wash("hair-copper-midline",
      "M239 121 C273 80 314 61 351 62 C316 66 283 95 264 120 Q251 136 234 146 Z",
      "#BA9B94",.24,{highlight:"#E2BBA9",shadow:"#786C7A",
        edgeSoftness:.42},157,58),
    wash("side-lock-lightbreak",
      "M377 125 C394 157 400 192 390 238 C388 254 385 264 381 272 C388 215 387 169 377 125 Z",
      "#B89A98",.23,{highlight:"#D0AF9F",shadow:"#706679",
        edgeSoftness:.62},160,66),
    wash("left-long-hair-reflection",
      "M183 255 C178 302 186 348 173 402 Q163 447 154 487 Q173 462 179 425 C190 373 193 321 183 255 Z",
      "#AA9597",.20,{highlight:"#DDC2B2",shadow:"#65576C",
        edgeSoftness:.7},177,78),
    wash("right-long-hair-reflection",
      "M402 300 Q394 372 408 431 Q425 482 443 499 C420 495 399 471 392 432 C388 390 395 350 402 300 Z",
      "#AA9297",.17,{highlight:"#D3B8AE",shadow:"#5D596B",
        edgeSoftness:.64},184,77),
    // One source-authored compound strand map, not per-frame random hair lines.
    // Curves follow the actual crown-to-temple flow of this painted head.
    // Directional pigment glints follow the scalp-to-temple structure. These
    // are tapered wet brush paths, not a repeated uniform vector stripe.
    wash("crown-copper-sweep",
      "M202 123 C227 76 267 54 304 48 Q282 63 270 86 C248 92 232 114 217 142 Z",
      "#B09590",.36,{highlight:"#DAC0AD",shadow:"#6B5B6B",
        gradient:"radial",edgeSoftness:.48},142,62),
    wash("hair-ribbon-near-face",
      "M190 192 C186 234 185 269 200 311 Q200 326 212 347 C195 319 178 289 178 249 Q175 214 190 192 Z",
      "#928183",.31,{highlight:"#C3A8A2",shadow:"#514754",
        edgeSoftness:.39},169,62),
    wash("hair-ribbon-far-temple",
      "M386 111 Q409 143 409 178 C406 215 399 241 390 262 Q397 206 394 171 Q394 141 386 111 Z",
      "#B59797",.31,{highlight:"#CFAB9E",shadow:"#5D586A",
        edgeSoftness:.48},172,55),
    line("fine-upper-hair-fibre-flow",
      Array.from({length:26},(_,i)=>{
        const x=207+i*5, y=112-Math.sin(i/25*Math.PI)*47;
        return "M"+x.toFixed(1)+" "+y.toFixed(1)+
          " q"+(13+i%4)+" -"+(9+i%3*3)+" "+(21+i%4)+" -"+(13+i%3*3);
      }).join(" "), "#D0AC9E",.75,.48,208),
    line("fine-temple-hair-flow",
      Array.from({length:14},(_,i)=>{
        const x=374+i%4*5, y=137+i*12;
        return "M"+x+" "+y+" q"+(7+i%3)+" 11 "+(4+i%4)+" 24";
      }).join(" "), "#C1A1A3",.76,.46,212),
    line("lower-hair-lift-lines",
      Array.from({length:10},(_,i)=>{
        const x=161+i%4*7,y=337+i*11;
        return "M"+x+" "+y+" q"+(i%2?-4:2)+" 16 "+(i%2?-8:1)+" 29";
      }).join(" "), "#A98E96",.65,.38,215),
  ],[pose(0),pose(170,0,0,-.35),pose(275,0,0,.65),pose(359)],
    {x:288,y:69},50,100);

  return group("original-person-portrait",[
    backHair,clothing,neck,
    group("subtle-head-pose",[face,frontHair],
      [pose(0),pose(162,0,0,-.9),pose(250,1,-1,1.2),pose(315,0,0,.1),pose(359,0,0,-.5)],
      {x:306,y:419}),
    wash("earring-reserve",
      "M405 314 q5 2 4 12 q-6 8 -8 -4 Z","#DBB47E",.79,
      {highlight:"#F9E3BA",shadow:"#B68C71"},205,31),
  ]);
};

export function watercolorPortraitSpec(output:PortraitOutput,seed=83):WatercolourArtwork{
  const upright=output==="portrait",width=upright?540:960,height=upright?960:540;
  const paper={color:"#F8F1E7",tooth:.81,granulation:.77};
  const source:(readonly [string,number,number,number,string,number,number,number])[]=
    upright?[
      ["morning-blue",121,217,184,"#B3C1C3",.73,.94,0],
      ["rose-halo",355,310,171,"#DEC0B4",.65,.91,29],
      ["silvery-sky",433,522,163,"#AABDC1",.49,.91,55],
      ["peach-side",68,490,124,"#E5BDA9",.64,.90,52],
      ["cloud-soft",136,704,151,"#B9B5BA",.53,.91,81],
      ["clay-bottom",356,854,145,"#C7B1A4",.57,.92,111],
      ["paper-cerulean",442,151,103,"#ADC1C5",.73,.95,16],
      ["paper-violet",79,784,124,"#C1B3BB",.58,.90,95],
    ]:[
      ["sky-slate",722,91,183,"#A7BEC0",.65,.94,0],
      ["soft-apricot",202,166,196,"#E0BEAB",.66,.91,20],
      ["face-halo",552,207,196,"#DBC1B6",.59,.90,43],
      ["left-violet",132,378,177,"#BDA9B6",.53,.91,73],
      ["right-sage",802,366,145,"#B4C4B8",.63,.94,85],
      ["lower-dusk",569,455,136,"#AAB2BA",.64,.94,96],
      ["warm-corner",342,85,97,"#E9CBB9",.68,.91,12],
    ];
  const wetPaper:WetPaperSpec={version:1,width,height,seed,paper,
    flow:.68,granulation:.84,dryFrames:185,cellSize:30,edgePooling:.2,
    drops:source.map(([id,x,y,radius,pigment,load,water,startFrame]):WetPigmentDrop=>
      ({id,x,y,radius,pigment,load,water,startFrame}))};
  // Portrait is a deliberately closer head study, not a full bust poster.
  // Face fills the vertical field while garment edges naturally crop on paper.
  const placement=upright?{x:-78,y:20,scale:1.2}:{x:271,y:-9,scale:.75};
  const artwork:WatercolourArtPart[]=[
    wash("loose-atmosphere",
      upright?
        "M21 234 Q85 182 149 245 Q192 306 96 344 Q44 333 21 234 Z":
        "M64 201 Q154 143 225 213 Q245 267 126 303 Q78 280 64 201 Z",
      "#BEB4BE",.055,{highlight:"#DED0C6",shadow:"#9EB2B4"},28,112),
    group("portrait-framing",[portraitFigure()],
      [pose(0,placement.x,placement.y,0,placement.scale)]),
  ];
  return {version:1,width,height,seed,paper,wetPaper,
    parts:[group("portrait-art-direction",artwork)]};
}
