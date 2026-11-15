import type {CrayonColor,CrayonElement,CrayonSceneSpec}
  from "../../registry/video/materials/crayon-scene";

/**
 * ArtCraft v7 body construction; NOT a production character.
 * Structural reference: Irawanthea92, "Free use human standing simple",
 * Wikimedia Commons, CC BY-SA 4.0. Observed 669×1000 display crop; the
 * photograph stays remote and is never packaged as a product texture.
 *
 * Original wax geometry studies the pose, seam topology, hands, sleeves,
 * garment overlaps, pelvis, knees and grounded shoes. These contours are
 * hand-authored approximations, not pixel-registered silhouettes. A head
 * and face drawn here are neutral blockers, NOT a realistic portrait.
 * No marketing or gallery use until an independently aligned real source
 * and native screenshots pass the ArtCraft release contract.
 */
export const CRAYON_BODY_REFERENCE={
  title:"Free use human standing simple.jpg",
  url:"https://commons.wikimedia.org/wiki/File:Free_use_human_standing_simple.jpg",
  author:"Irawanthea92",
  license:"CC BY-SA 4.0",
  referenceWidth:669,
  referenceHeight:1000,
  sourceCrop:"Entire standing subject as displayed on Commons, 669×1000",
  caveat:"Visible-preview manual study, not source-pixel landmark certification",
} as const;

export type BodyStudyView="painted"|"construction";
export interface BodyStudyOptions {detail?:number;view?:BodyStudyView}
export type BodyLandmarkName=
  "crown"|"chin"|"neck"|"shoulder_left"|"shoulder_right"|
  "elbow_left"|"elbow_right"|"wrist_left"|"wrist_right"|
  "thumb_left"|"thumb_right"|"waist_left"|"waist_right"|
  "hip_left"|"hip_right"|"crotch"|"knee_left"|"knee_right"|
  "ankle_left"|"ankle_right"|"toe_left"|"toe_right";

/** Photo observations are approximate integer-pixel anchors on a visible
 * 669x1000 preview; do not pass them off as validated high-res source data.
 * The left/right labels refer to the image plane, not anatomical laterality.
 */
export const CRAYON_BODY_OBSERVED:Record<BodyLandmarkName,readonly [number,number]>={
  crown:[380,8],chin:[389,181],neck:[386,203],
  shoulder_left:[264,223],shoulder_right:[480,211],
  elbow_left:[249,381],elbow_right:[495,388],
  wrist_left:[258,519],wrist_right:[489,516],
  thumb_left:[279,553],thumb_right:[478,539],
  waist_left:[273,479],waist_right:[482,479],
  hip_left:[279,528],hip_right:[483,517],
  crotch:[378,602],knee_left:[328,772],
  knee_right:[425,760],ankle_left:[338,929],
  ankle_right:[415,935],toe_left:[309,988],toe_right:[453,989],
};

const P={
  paper:"#f5ead8" as CrayonColor,
  skin:["#cd9982","#876563","#e9bf9c"] as const,
  hair:["#352e31","#201f2b","#736059"] as const,
  hairTurn:["#62443e","#372b31","#987b68"] as const,
  denim:["#303149","#161c32","#53546c"] as const,
  denimLight:["#414357","#22263c","#6b6a78"] as const,
  shirt:["#92a6b9","#526881","#d5d9db"] as const,
  shirtShadow:["#6d829b","#3a4b67","#b1bed0"] as const,
  shirtLight:["#aabccd","#7c91a7","#e6e4e3"] as const,
  linen:["#e1d2c5","#a6a39f","#f9ecde"] as const,
  shoes:["#b8a78c","#827961","#f0dfb9"] as const,
  soles:["#8e8777","#5a5550","#c4b4a1"] as const,
} satisfies Record<string,CrayonColor|readonly [CrayonColor,CrayonColor,CrayonColor]>;

type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Contour=Extract<CrayonElement,{kind:"contour"}>;
const rect=(x:number,y:number,width:number,height:number)=>
  ({x,y,width,height});

export function crayonArtcraftBodyStudy(options:BodyStudyOptions={}):CrayonSceneSpec {
  const detail=options.detail??1,view=options.view??"painted";
  if(!Number.isFinite(detail)||detail<.2||detail>1||
     (view!=="painted"&&view!=="construction"))
    throw new RangeError("Invalid Crayon ArtCraft body-study controls");
  const elements:CrayonElement[]=[];
  const wax=(id:string,d:string,bounds:ReturnType<typeof rect>,
    colors:readonly [CrayonColor,CrayonColor,CrayonColor],
    phase:[number,number],more:Partial<Wax>={})=>{
    const opaque=more.coverage!=="open";
    elements.push({kind:"wax",id,d,bounds,colors,
      timing:{start:phase[0],end:phase[1]},
      coverage:"opaque",deposition:"stroke-built",pressure:.77,
      nibStyle:"dry",strokeOrder:"patches",markLength:"long",
      spacing:9,underpaintTooth:.67,markStrength:.64,
      edgeRoughness:.17,outlineOpacity:.08,
      ...more,
      // Underpainting must not accidentally create see-through limbs.
      ...(opaque?{coverage:"opaque" as const}:{}),
    });
  };
  const line=(id:string,d:string,color:CrayonColor,width:number,
    phase:[number,number]=[110,260],opacity=.65,parentId?:string)=>{
    const item:Contour={kind:"contour",id,d,color,width,opacity,
      timing:{start:phase[0],end:phase[1]},
      ...(parentId?{parentId,clipToParent:true}:{})};
    elements.push(item);
  };
  // Depth is painted back-to-front. Limbs sit beneath garment/collar, while
  // waist folds bridge pelvis and legs. Hands are independent silhouettes.
  wax("hair-back",
    "M314 94 C308 44 340 6 381 7 C423 8 452 44 446 103"+
    "Q449 151 426 181 Q395 193 339 182 C306 157 299 120 314 94Z",
    rect(295,3,165,197),P.hair,[1,74],
    {pressure:.9,spacing:7,markStrength:.85});
  wax("neck",
    "M361 164Q372 181 367 197Q360 208 348 219"+
    "Q364 235 388 234Q414 234 428 217"+
    "Q406 203 406 174Z",
    rect(341,159,92,84),P.skin,[6,86],
    {pressure:.74,spacing:8,outlineOpacity:0});
  wax("face-blockout",
    "M332 73Q345 40 384 43Q428 47 436 81"+
    "Q445 113 430 145Q419 176 390 181"+
    "Q359 181 342 151Q326 115 332 73Z",
    rect(324,36,120,153),P.skin,[16,116],
    {pressure:.7,spacing:7,markStrength:.3,outlineOpacity:.05});
  wax("face-turned-plane",
    "M403 61Q439 75 436 106Q429 150 401 171"+
    "Q418 132 410 104Z",
    rect(395,57,46,125),["#b48479","#76595b","#deac92"],[65,160],
    {parentId:"face-blockout",clipToParent:true,
      coverage:"open",markStrength:.24,pressure:.48,spacing:6,outlineOpacity:0});
  // This study explicitly marks the face as UNRESOLVED. An invented nose,
  // dot eyes, etc would fake anatomical completeness and violate ArtCraft.
  wax("hair-forelock",
    "M321 83Q335 17 382 10C420 11 443 40 445 75"+
    "Q424 66 409 75Q382 54 354 69Q336 92 323 106Z",
    rect(314,5,137,112),P.hairTurn,[82,174],
    {parentId:"hair-back",markStrength:.68,spacing:7});
  // The far arm is behind the shirt and hip, not an unattached tube.
  wax("arm-right-forearm",
    "M473 342Q503 345 508 379L504 449"+
    "Q501 480 496 519L484 526Q481 490 480 457"+
    "Q468 411 467 377Z",
    rect(464,334,50,201),P.skin,[12,111],
    {pressure:.73,spacing:7,markStrength:.51});
  wax("hand-right",
    "M483 508Q491 506 496 515L503 536Q510 558 501 568"+
    "Q497 572 493 568L490 548L487 570Q481 577 479 568"+
    "L478 548Q474 568 467 560Q461 553 468 535Z",
    rect(457,501,60,80),P.skin,[93,182],
    {pressure:.8,spacing:4.8,markStrength:.6});
  wax("arm-left",
    "M247 357Q251 370 245 389Q239 431 241 467"+
    "Q243 508 253 531L269 525Q262 499 264 469"+
    "Q268 434 268 398Q281 372 277 356Z",
    rect(234,347,53,190),P.skin,[21,124],
    {pressure:.8,spacing:6.5,markStrength:.51});
  wax("hand-left",
    "M250 524C243 533 243 545 246 558"+
    "Q249 575 259 584Q267 598 277 593"+
    "Q281 588 277 580L268 567Q265 557 271 553"+
    "Q276 551 282 558Q290 559 289 551Q280 536 270 526Z",
    rect(237,517,61,84),P.skin,[87,191],
    {pressure:.76,spacing:4.5,markStrength:.55,outlineOpacity:.15});
  // Two independent uneven trouser legs, not a same-width capsule pair.
  // The reference has a relaxed crossover: left leg bends inward at shin,
  // right knee turns to camera left, and the crotch/inner gap stay open.
  wax("trouser-leg-left",
    "M273 503C293 491 342 503 370 519"+
    "Q389 548 369 602L358 684Q362 747 353 811"+
    "Q359 869 355 928L342 955Q316 947 303 921"+
    "Q295 870 291 812Q287 753 288 699"+
    "Q288 657 283 609Q274 550 273 503Z",
    rect(266,488,122,469),P.denim,[16,135],
    {pressure:.88,spacing:9,markStrength:.84});
  wax("trouser-leg-right",
    "M369 515Q433 489 482 512Q486 561 473 613"+
    "Q469 683 451 740Q440 810 438 868"+
    "Q435 924 423 952Q400 951 386 940"+
    "Q376 899 376 859Q381 796 394 741"+
    "Q390 688 372 641Q361 598 369 515Z",
    rect(359,485,133,477),P.denimLight,[23,142],
    {pressure:.89,spacing:9,markStrength:.79});
  wax("crotch-and-pelvis",
    "M274 484Q364 483 481 483L480 527"+
    "Q466 564 448 588Q431 608 416 609"+
    "Q393 605 378 589Q362 607 337 603"+
    "Q301 584 281 548Z",
    rect(269,480,219,135),P.denim,[42,168],
    {pressure:.83,spacing:8,markStrength:.6});
  // Shoes are grounded with broad toe boxes, distinct ankle creases, sole
  // edges and lace systems. No detached triangles or geometrical slippers.
  wax("shoe-left",
    "M320 933Q337 941 354 939Q366 946 376 961"+
    "Q386 973 389 987Q385 997 370 998L298 997"+
    "Q293 992 297 977Q305 955 320 933Z",
    rect(289,925,106,75),P.shoes,[80,176],
    {pressure:.89,spacing:5.5,markStrength:.7});
  wax("shoe-right",
    "M390 934Q405 941 422 937Q442 942 456 960"+
    "Q470 974 471 990Q470 998 457 999L384 999"+
    "Q379 992 382 978Q383 951 390 934Z",
    rect(376,929,102,71),P.shoes,[84,177],
    {pressure:.88,spacing:5.2,markStrength:.71});
  wax("shirt-main",
    "M318 201Q343 195 354 201Q371 210 386 218"+
    "Q400 210 419 197Q454 195 475 210"+
    "Q493 256 499 304Q499 363 482 397"+
    "Q481 449 486 482Q455 498 429 489"+
    "Q392 499 380 484Q353 496 319 484"+
    "Q289 496 272 480Q278 437 270 397"+
    "Q251 343 252 292Q256 248 278 218Z",
    rect(244,191,266,310),P.shirt,[31,162],
    {pressure:.82,spacing:8.2,markStrength:.6});
  wax("sleeve-left-roll",
    "M280 224C259 240 252 269 250 304"+
    "L238 365Q238 385 259 388Q272 389 280 380"+
    "Q291 346 292 314Q299 279 314 245Z",
    rect(232,215,89,183),P.shirtShadow,[39,178],
    {pressure:.84,spacing:7,markStrength:.65});
  wax("sleeve-right-roll",
    "M468 213Q495 237 507 270Q512 319 515 369"+
    "Q512 392 493 396Q482 396 474 382"+
    "L472 307Q463 272 448 239Z",
    rect(442,203,80,201),P.shirtShadow,[42,177],
    {pressure:.86,spacing:7,markStrength:.62});
  wax("left-cuff-overlap",
    "M239 366Q260 358 279 366Q277 382 258 391"+
    "Q240 393 238 382Z",
    rect(234,352,50,46),P.shirtLight,[95,193],
    {pressure:.85,spacing:5,markStrength:.49});
  wax("right-cuff-overlap",
    "M474 374Q490 360 515 367L517 390"+
    "Q498 400 484 392Z",
    rect(468,358,55,48),P.shirtLight,[96,193],
    {pressure:.83,spacing:5,markStrength:.5});
  // Collar is constructed as overlapping fabric leaves around a real neck
  // opening. The placket stays anchored to the shirt, and the cuffs wrap.
  wax("collar-left",
    "M354 201Q370 217 385 220L367 267"+
    "Q350 242 333 223Z",
    rect(328,197,62,78),P.shirtLight,[108,217],
    {pressure:.82,spacing:5.3,markStrength:.47});
  wax("collar-right",
    "M419 197Q400 216 385 220L405 263"+
    "Q419 239 440 217Z",
    rect(382,192,63,78),P.shirtShadow,[108,218],
    {pressure:.81,spacing:5.3,markStrength:.45});
  wax("placket",
    "M382 222Q389 255 387 304L394 376"+
    "Q396 426 397 479L410 483Q408 439 405 374"+
    "Q401 301 397 259L394 222Z",
    rect(378,215,36,272),P.shirtLight,[122,244],
    {pressure:.76,spacing:5.7,markStrength:.3});
  wax("left-breast-pocket",
    "M296 269Q315 282 346 273L349 345"+
    "Q321 362 301 344Z",
    rect(293,268,59,96),P.shirt,[118,216],
    {pressure:.79,spacing:5.5,markStrength:.52});
  wax("right-breast-pocket",
    "M435 265Q452 272 470 265L478 342"+
    "Q460 351 440 335Z",
    rect(431,257,53,100),P.shirt,[117,216],
    {pressure:.78,spacing:5.5,markStrength:.49});
  wax("pocket-flap-left",
    "M294 264L350 264L348 288Q317 300 298 285Z",
    rect(290,260,66,47),P.shirtShadow,[132,220],
    {pressure:.78,spacing:5.2,markStrength:.43});
  wax("pocket-flap-right",
    "M431 258L477 256L477 282Q455 288 435 279Z",
    rect(428,250,56,44),P.shirtShadow,[135,219],
    {pressure:.77,spacing:5.2,markStrength:.43});
  wax("waist-cloth-curl",
    "M270 449Q292 466 314 474Q344 478 372 466"+
    "Q397 483 424 479Q461 481 486 456"+
    "L483 487Q465 494 436 489Q407 503 376 484"+
    "Q346 499 317 486Q287 491 273 481Z",
    rect(264,446,226,58),P.shirtShadow,[152,230],
    {pressure:.74,spacing:6.6,markStrength:.36});
  // Structural textile: the source has fine vertically organized blue-grey
  // pinstripes that bend around chest, sleeve rolls, waist creases and seams.
  // Use authored *curved* tracks, irregular spacing and changing contrast;
  // no screen-wide hash/noise or uniform parallel digital lines.
  const shirtStripePaths=[
    "M282 236Q278 305 280 350T280 447",
    "M287 232Q286 288 288 337T291 458",
    "M297 225Q298 279 297 312T304 452",
    "M304 224Q307 260 307 301T311 450",
    "M313 220Q320 274 317 313T321 464",
    "M325 217Q330 271 326 322T330 465",
    "M336 211Q340 263 338 319T342 471",
    "M346 210Q351 260 348 319T353 473",
    "M360 211Q365 257 363 310T363 464",
    "M370 217Q375 275 372 326T374 466",
    "M418 212Q420 274 423 330T426 465",
    "M429 211Q434 271 433 331T436 466",
    "M440 214Q441 276 442 340T446 460",
    "M450 215Q454 275 457 329T461 461",
    "M463 222Q467 289 473 340T477 456",
    "M476 248Q486 303 487 351T478 444",
    "M253 278Q252 323 250 366",
    "M261 264Q257 319 259 371",
    "M272 253Q267 317 269 361",
    "M283 248Q280 295 276 343",
    "M491 266Q500 313 500 366",
    "M484 255Q493 308 490 368",
  ] as const;
  for(let i=0;i<Math.round(shirtStripePaths.length*detail);i++)
    line("shirt-woven-pinstripe-"+i,shirtStripePaths[i],
      i%5===0?"#dbdce3":"#d5d4ce",i%6===0?1.22:.59,
      [139+Math.floor(i%5)*3,252],i%4===0?.58:.38,
      i<16?"shirt-main":i<20?"sleeve-left-roll":"sleeve-right-roll");
  const shirtCreases=[
    ["M272 374Q299 394 312 415Q345 427 366 410","#3d5065",1.15],
    ["M304 361Q336 350 350 370Q359 389 373 389","#52617a",1.05],
    ["M404 358Q434 344 456 373Q469 396 483 392","#33475d",1.2],
    ["M283 448Q306 452 326 467","#374b63",.9],
    ["M410 463Q441 470 475 447","#51617b",1.2],
    ["M308 332Q324 345 343 341","#536682",.8],
    ["M447 344Q454 352 471 342","#50647a",.72],
  ] as const;
  for(let i=0;i<Math.round(shirtCreases.length*detail);i++){
    const [d,c,w]=shirtCreases[i];
    line("shirt-form-crease-"+i,d,c,w,[164,277],.69,"shirt-main");
  }
  line("shirt-placket-stitch","M390 229Q391 301 397 375T402 479",
    "#e6dfd0",1.1,[152,282],.75,"placket");
  for(const [i,y] of [267,307,352,398,440].entries()){
    line("shirt-button-"+i,
      "M394 "+(y-3)+"q4 0 5 4q-3 5 -7 1q-3 -5 2 -5",
      "#495065",1,[165,286],.67,"placket");
  }
  line("left-cuff-seam","M239 377Q259 386 278 370",
    "#455970",1.6,[148,283],.82,"left-cuff-overlap");
  line("right-cuff-seam","M478 382Q499 391 513 377",
    "#465b6e",1.4,[148,283],.74,"right-cuff-overlap");
  // Hands: finger arcs, knuckle shadow, asymmetric thumb base and
  // thumbnail; independent strokes rather than detached geometric fingers.
  line("hand-left-finger-crease",
    "M259 559Q263 569 267 574 M265 579Q272 588 276 586"+
    " M251 547Q256 552 260 555 M268 542Q277 545 281 552",
    "#9b6b62",1.1,[183,296],.72,"hand-left");
  line("hand-left-thumb",
    "M268 532Q276 534 283 543Q286 549 282 553",
    "#9d6c65",1.25,[180,296],.72,"hand-left");
  line("hand-right-knuckles",
    "M476 541Q482 536 487 539M488 552Q494 558 495 567",
    "#a37971",.9,[183,296],.61,"hand-right");
  const pantsCreases=[
    ["M292 561Q318 581 336 588","trouser-leg-left"],
    ["M307 645Q326 663 352 663","trouser-leg-left"],
    ["M292 721Q324 737 349 714","trouser-leg-left"],
    ["M303 824Q322 811 351 826","trouser-leg-left"],
    ["M316 905Q336 913 349 905","trouser-leg-left"],
    ["M413 571Q441 563 469 584","trouser-leg-right"],
    ["M402 647Q429 663 458 657","trouser-leg-right"],
    ["M399 736Q426 750 449 727","trouser-leg-right"],
    ["M386 840Q419 856 438 825","trouser-leg-right"],
    ["M391 910Q412 902 434 922","trouser-leg-right"],
  ] as const;
  for(let i=0;i<Math.round(pantsCreases.length*detail);i++)
    line("denim-fold-"+i,pantsCreases[i][0],
      i%3===0?"#7b7b84":"#171d32",i%4===0?1.9:1.22,
      [150,290],.6,pantsCreases[i][1]);
  line("denim-fly","M378 516Q377 558 382 587L395 591",
    "#171d2d",1.45,[175,295],.66,"crotch-and-pelvis");
  line("denim-seam-left","M280 539Q303 631 300 723L316 920",
    "#777888",.9,[177,290],.64,"trouser-leg-left");
  line("denim-seam-right","M467 541Q463 675 441 771L429 926",
    "#7b7984",.9,[177,290],.63,"trouser-leg-right");
  for(const [side,x] of [["left",330],["right",412]] as const){
    line("shoe-laces-"+side,
      "M"+(x-15)+" 957q11 4 25 0M"+(x-16)+" 965q13 -3 28 2"+
      "M"+(x-19)+" 974q15 -5 31 1M"+(x-20)+" 983q14 -2 32 2",
      "#ede1cc",1.35,[178,298],.85,"shoe-"+side);
  }
  line("left-shoe-sole","M297 988Q339 999 387 989",
    "#5c5354",2.1,[190,299],.82,"shoe-left");
  line("right-shoe-sole","M381 990Q427 1001 471 991",
    "#5a5555",2.1,[190,299],.82,"shoe-right");
  line("hair-rooted-flow",
    "M327 77Q351 29 372 33M346 61Q372 18 402 28"+
    "M392 29Q427 39 436 75M323 104Q314 132 336 159"+
    "M415 79Q430 107 423 145",
    "#ad8f7e",1.1,[184,296],.55,"hair-back");
  // Diagnostic bones do not pretend to be a finished body mesh.
  if(view==="construction"){
    const bones=[
      ["crown","chin"],["chin","neck"],
      ["shoulder_left","neck"],["neck","shoulder_right"],
      ["shoulder_left","elbow_left"],["elbow_left","wrist_left"],
      ["shoulder_right","elbow_right"],["elbow_right","wrist_right"],
      ["waist_left","waist_right"],["shoulder_left","waist_left"],
      ["shoulder_right","waist_right"],["waist_left","hip_left"],
      ["waist_right","hip_right"],["hip_left","knee_left"],
      ["knee_left","ankle_left"],["hip_right","knee_right"],
      ["knee_right","ankle_right"],["ankle_left","toe_left"],
      ["ankle_right","toe_right"],
    ] as const;
    for(const [i,[from,to]] of bones.entries()){
      const a=CRAYON_BODY_OBSERVED[from],b=CRAYON_BODY_OBSERVED[to];
      line("body-source-bone-"+i,"M"+a[0]+" "+a[1]+"L"+b[0]+" "+b[1],
        "#bf574f",1.3,[0,299],.77);
    }
    for(const [name,p] of Object.entries(CRAYON_BODY_OBSERVED))
      line("body-source-landmark-"+name,
        "M"+(p[0]-4)+" "+p[1]+"h8M"+p[0]+" "+(p[1]-4)+"v8",
        "#bc3539",1.1,[0,299],.85);
  }
  return {version:1,id:"crayon-artcraft-reference-body-"+view,
    width:669,height:1000,durationFrames:300,seed:11837,
    paper:P.paper,paperTooth:.88,elements,
    camera:[{frame:0,focusX:334.5,focusY:500,zoom:1},
      {frame:299,focusX:334.5,focusY:500,zoom:1}]};
}
