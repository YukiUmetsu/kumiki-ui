import type {
  WatercolourArtPart,WatercolourArtwork,WatercolourWashTreatment,
} from "../../../registry/video/watercolour-illustration";

/** WC17 unapproved construction study. 100% authored SVG paths.
 * Inspired by watercolor portrait craftsmanship; no third-party painting is
 * embedded, no raster/photo texture, and no old rejected faces are restored.
 *
 * IMPORTANT: Source-space illustration is NOT a public Storybook component.
 * A proper ArtCraft v6 visual pass must precede any promotion.
 */
const P={
  paper:"#F5EEE5",hair:"#5C4038",deepHair:"#352D30",lightHair:"#AC7D62",
  skin:"#CA937D",skinLight:"#F3D0B5",warm:"#B87864",shadow:"#926574",
  cool:"#7B8594",blue:"#748797",dark:"#524548",sienna:"#986952",
  lips:"#B57471",white:"#F8E8DC",iris:"#786E4F",cloth:"#D4CEC1",
  clothShadow:"#A09C9F",
} as const;
const W=(id:string,path:string,fill:string,opacity=1,
  options:WatercolourWashTreatment={},composite:"normal"|"multiply"="multiply"):WatercolourArtPart=>({
  id,kind:"path",path,technique:"wash",fill,opacity,composite,
  wash:{highlight:fill,shadow:fill,...options},
});
const I=(id:string,path:string,color:string,width=1,opacity=.6):WatercolourArtPart=>({
  id,kind:"path",path,technique:"drybrush",stroke:color,strokeWidth:width,opacity,
});
const G=(id:string,children:WatercolourArtPart[],clipPath?:string):WatercolourArtPart=>({
  id,kind:"group",children,...(clipPath?{clipPath}:{}),
});
const local=(highlight:string,shadow:string,edgeSoftness=.3,
  edgePooling=.18):WatercolourWashTreatment=>({
  highlight,shadow,edgeSoftness,edgePooling,gradient:"radial",
});
const nearEye="M253 231 C264 221 278 218 290 220 C303 222 311 229 318 234"+
  " Q292 246 268 243 Q259 240 253 231 Z";
const farEye="M368 221 C374 215 383 209 397 210 Q411 211 424 224"+
  " Q405 232 383 232 Q375 230 368 221 Z";
const ink=[
  // Deliberately distinct major head/face silhouettes, not a generic
  // smooth ellipse with cartoon discs attached.
  G("atmospheric-reserved-paper",[
    W("left-cool-air","M0 52 C43 9 106 5 175 42 Q116 116 70 151 C13 182 0 208 0 52 Z",
      P.blue,.11,local(P.paper,P.blue,.92,.09)),
    W("right-warm-air","M392 4 Q474 -10 550 71 L550 394 Q495 333 461 222"+
      " Q420 109 392 4 Z",P.warm,.08,local(P.paper,P.warm,.98,.08)),
    W("lower-diffused-bloom","M0 452 C142 410 246 480 302 556"+
      " Q371 668 550 619 L550 688 L0 688 Z",
      P.cool,.12,local(P.paper,P.cool,.9,.07)),
  ]),
  G("behind-head-pigment",[
    W("head-back-umber-volume","M39 188 C28 111 109 17 213 23"+
      " C286 -16 396 19 431 90 Q480 147 457 258"+
      " Q456 307 446 378 C426 426 389 464 360 466"+
      " Q298 479 223 440 Q100 463 51 388 Q7 291 39 188 Z",
      P.deepHair,.97,local(P.lightHair,P.deepHair,.28,.33),"normal"),
    W("upper-left-raw-umber","M24 163 C69 50 148 16 213 26"+
      " C182 89 122 136 93 215 Q57 262 24 263 Z",
      P.sienna,.68,local("#D0AC88",P.deepHair,.65,.31)),
    W("crown-pooling","M151 52 Q227 16 293 20 Q358 23 406 63"+
      " C352 52 308 77 256 101 Q181 129 112 206"+
      " C131 135 148 78 151 52 Z",
      P.hair,.78,local("#A58067",P.deepHair,.42,.38)),
    W("deep-hair-pocket","M93 133 C149 85 239 66 307 70"+
      " Q254 103 213 155 C168 196 140 258 106 308"+
      " Q77 284 82 223 C77 191 76 164 93 133 Z",
      P.deepHair,.72,local(P.hair,P.deepHair,.38,.31)),
    W("behind-neck-bun","M58 343 C80 309 117 326 154 356"+
      " Q172 389 157 429 C139 449 104 436 73 410"+
      " Q45 378 58 343 Z",
      P.hair,.92,local(P.lightHair,P.deepHair,.54,.29),"normal"),
    W("left-hair-indigo-reflection","M22 217 Q68 166 127 146"+
      " Q94 216 92 281 Q79 345 41 355 Q16 302 22 217 Z",
      P.cool,.33,local(P.hair,P.cool,.82,.15)),
    W("hair-temple-shadow","M315 96 Q362 70 401 118"+
      " Q425 158 433 213 Q414 205 395 200"+
      " Q358 149 315 96 Z",
      P.deepHair,.65,local(P.hair,P.deepHair,.52,.21)),
  ]),
  G("connected-shoulders-and-garment",[
    W("cloth-opaque-support","M193 433 Q157 464 113 499"+
      " C62 536 27 591 0 637 L0 688 L550 688"+
      " L550 554 Q493 502 438 481 Q408 454 386 441"+
      " Q327 476 271 476 Q226 450 193 433 Z",
      P.cloth,1,local("#EFE1D3",P.clothShadow,.49,.19),"normal"),
    W("left-shoulder-cool-fold","M4 625 C51 549 111 500 153 484"+
      " Q115 563 76 625 Q91 656 106 687 L0 688 Z",
      P.cool,.39,local(P.cloth,P.blue,.84,.24)),
    W("coat-left-weight","M124 500 Q174 457 204 448"+
      " Q185 503 232 541 L199 684 Q145 631 124 500 Z",
      P.shadow,.27,local(P.cloth,P.cool,.79,.19)),
    W("inner-neckline-reserved","M190 465 Q259 515 316 516"+
      " Q367 489 395 455 Q420 488 462 509"+
      " Q353 530 307 582 Q244 549 190 465 Z",
      P.paper,.90,local("#FFF4E8",P.clothShadow,.62,.11),"normal"),
    W("right-shoulder-broken-light","M397 473 C438 478 500 512 541 557"+
      " Q479 555 457 596 Q433 641 400 659"+
      " Q422 573 397 473 Z",P.paper,.86,local("#FBF2E8",P.clothShadow,.88,.10),"normal"),
    W("right-shoulder-blue-gray","M441 531 Q503 525 550 587"+
      " L550 681 Q504 649 457 663 Q438 603 441 531 Z",
      P.cool,.28,local(P.cloth,P.blue,.78,.19)),
    W("collar-lift","M200 461 Q259 506 304 506"+
      " Q279 532 257 563 Q229 520 200 461 Z",
      P.skinLight,.43,local(P.paper,P.warm,.56,.09)),
    W("fold-lilac-accent","M345 530 Q418 493 459 531"+
      " Q400 567 366 646 Q356 604 345 530 Z",
      P.shadow,.19,local(P.cloth,P.shadow,.76,.10)),
    I("fold-broken-senna","M42 622 Q85 565 107 558 M450 551"+
      " Q467 570 473 600 M292 567 Q271 614 252 661",
      P.sienna,1.25,.26),
  ]),
  G("neck-and-skull-connection",[
    W("opaque-neck-support","M234 359 Q265 395 244 454"+
      " Q233 481 216 506 Q264 562 315 558"+
      " Q370 530 395 464 Q371 419 389 378 Z",
      P.skin,.99,local(P.skinLight,P.shadow,.36,.19),"normal"),
    W("neck-umbra","M248 398 Q288 449 324 460"+
      " Q345 448 379 414 Q366 492 330 533 Q291 529 259 491 Z",
      P.sienna,.32,local(P.skinLight,P.shadow,.81,.14)),
    W("neck-reflected-blue","M260 466 C278 492 301 520 324 532"+
      " Q286 550 265 529 Q247 507 260 466 Z",
      P.blue,.24,local(P.skinLight,P.cool,.82,.11)),
    W("throat-paper-light","M321 474 Q338 478 350 464"+
      " Q344 514 315 540 Q329 501 321 474 Z",
      P.skinLight,.29,local(P.white,P.skinLight,.88,.07)),
  ]),
  G("three-quarter-facial-volume",[
    W("face-primary-opaque","M235 121 C259 99 304 79 340 91"+
      " C401 102 433 144 438 208 C448 253 438 319 422 364"+
      " Q406 398 373 421 Q347 434 315 414"+
      " C274 394 243 356 222 322 Q194 292 198 240"+
      " Q197 162 235 121 Z",
      P.skin,1,local(P.skinLight,P.sienna,.35,.22),"normal"),
    W("forehead-light-reserve","M260 135 C292 107 333 101 366 127"+
      " Q382 149 380 173 C342 153 293 166 251 194"+
      " Q238 167 260 135 Z",
      P.skinLight,.54,local("#F7E1C5",P.skin,.87,.1)),
    W("temple-half-tone","M223 165 C237 196 250 216 239 269"+
      " Q233 304 253 333 Q210 310 203 271"+
      " Q201 202 223 165 Z",
      P.shadow,.20,local(P.skinLight,P.cool,.82,.06)),
    W("far-face-value","M386 131 Q429 163 433 226"+
      " Q445 308 403 367 Q412 306 386 288"+
      " Q398 222 386 131 Z",
      P.sienna,.27,local(P.skinLight,P.shadow,.9,.09)),
    W("near-cheek-luminous-plane","M238 263 Q266 244 298 259"+
      " Q329 264 338 285 Q314 306 296 323"+
      " Q267 325 243 306 Z",P.skinLight,.24,local("#F9DDC4",P.warm,.9,.12)),
    W("zygomatic-contour-warm","M254 292 Q279 279 300 293"+
      " Q309 310 298 323 Q275 341 251 336 Z",
      P.warm,.21,local(P.skinLight,P.warm,.75,.08)),
    W("far-cheek-violet","M384 266 Q408 267 416 290"+
      " Q416 316 397 352 Q400 302 377 298 Z",
      P.cool,.23,local(P.skin,P.shadow,.87,.08)),
    W("jaw-underplane","M236 335 Q265 377 308 404"+
      " Q345 432 373 418 Q398 404 422 362"+
      " Q413 405 372 433 Q340 444 308 423"+
      " C276 406 244 377 236 335 Z",
      P.shadow,.28,local(P.skinLight,P.cool,.72,.19)),
    W("chin-lift","M332 392 Q355 396 383 391"+
      " Q374 416 356 420 Q337 415 332 392 Z",
      P.skinLight,.29,local(P.white,P.skin,.89,.09)),
    // Key anatomical volumes: bridge emerges from the orbital plane.
    W("nasal-root-violet","M338 208 Q346 210 352 224"+
      " C361 249 367 263 375 274 Q358 264 349 250"+
      " Q335 235 338 208 Z",P.cool,.29,local(P.skin,P.cool,.67,.06)),
    W("nose-side-warm","M355 242 Q382 251 390 275"+
      " Q400 287 390 303 Q375 307 367 298"+
      " Q381 290 369 272 Z",P.warm,.32,local(P.skinLight,P.sienna,.65,.16)),
    W("nasal-dorsum-reserve","M342 225 Q352 230 365 253"+
      " Q369 270 375 275 Q365 285 359 281"+
      " Q349 266 342 225 Z",P.skinLight,.43,local(P.white,P.skinLight,.73,.04)),
    W("nose-tip-sculpture","M361 280 Q375 274 391 287"+
      " Q394 300 380 305 Q359 305 355 293 Z",
      P.warm,.32,local(P.skinLight,P.warm,.49,.17)),
    W("nostril-left-wing","M353 292 Q349 300 358 305"+
      " Q369 303 370 297 Q366 293 353 292 Z",
      P.sienna,.34,local(P.warm,P.shadow,.49,.16)),
    W("nostril-underturn","M373 302 Q383 310 399 299"+
      " Q392 316 377 314 Q368 310 373 302 Z",
      P.shadow,.34,local(P.skin,P.dark,.4,.18)),
    I("nasal-shadow-without-outline","M360 300 Q366 305 371 302"+
      " M381 308 Q389 309 394 301",P.dark,1.1,.41),
    W("lip-phi-and-muzzle","M333 313 Q349 322 355 335"+
      " Q368 341 392 337 Q400 352 395 364"+
      " Q360 359 336 367 Q326 346 333 313 Z",
      P.warm,.17,local(P.skinLight,P.warm,.88,.07)),
    W("upper-lip-uneven-umber","M325 354 Q344 341 355 347"+
      " Q367 351 374 347 Q383 345 399 344"+
      " Q395 360 374 364 Q347 363 325 354 Z",
      P.lips,.55,local("#D99B86",P.sienna,.44,.18)),
    W("lower-lip-plump-light","M330 359 Q357 368 375 364"+
      " Q391 357 399 345 Q403 372 375 380"+
      " Q348 374 330 359 Z",P.lips,.43,local(P.skinLight,P.lips,.7,.09)),
    I("lip-commissures-disconnected","M322 352 Q327 355 333 353"+
      " M396 350 Q402 347 406 344",P.dark,1.1,.54),
    W("mentolabial-softness","M341 383 Q360 391 384 382"+
      " Q375 398 360 399 Q349 397 341 383 Z",
      P.shadow,.2,local(P.skin,P.cool,.87,.07)),
    W("near-eye-orbit-warm","M242 211 Q261 191 293 198"+
      " Q322 201 326 231 Q300 232 277 246"+
      " Q254 246 244 234 Z",
      P.sienna,.25,local(P.skinLight,P.shadow,.72,.09)),
    W("far-eye-orbit-violet","M361 205 Q380 187 401 194"+
      " Q422 196 433 221 Q414 238 384 237 Z",
      P.cool,.26,local(P.skinLight,P.shadow,.64,.10)),
    G("near-eye-lid-clipping",[
      W("near-eye-opaque-sclera",nearEye,P.white,.92,local(P.white,P.shadow,.15,.10),"normal"),
      W("near-iris-occluded","M276 223 Q292 216 299 229"+
        " Q304 242 289 246 Q277 245 274 232 Z",
        P.iris,.88,local("#B0A37A",P.dark,.13,.2),"normal"),
      W("near-pupil-occluded","M284 224 Q291 222 294 230"+
        " Q295 239 289 240 Q283 239 284 224 Z",
        P.dark,.95,local("#62594C",P.dark,.1,.08),"normal"),
      W("near-pupil-illumination","M283 227 Q286 225 288 227"+
        " Q288 232 284 232 Z",P.white,.98,{}, "normal"),
    ],nearEye),
    G("far-eye-lid-clipping",[
      W("far-eye-opaque-sclera",farEye,P.white,.86,local(P.white,P.shadow,.13,.08),"normal"),
      W("far-iris-occluded","M389 210 Q402 207 407 219"+
        " Q411 231 398 233 Q387 229 389 210 Z",
        P.iris,.88,local("#AF9F76",P.dark,.12,.13),"normal"),
      W("far-pupil-occluded","M395 214 Q403 211 405 222"+
        " Q404 230 398 230 Q394 227 395 214 Z",
        P.dark,.96,{}, "normal"),
      W("far-eye-catchlight","M398 217 Q401 214 403 218"+
        " Q402 221 398 220 Z",P.white,.99,{}, "normal"),
    ],farEye),
    I("near-upper-lid-structured","M251 230 C265 216 284 216 301 224"+
      " Q312 228 319 235",P.dark,1.7,.66),
    I("near-lower-lid-selective","M255 235 Q269 243 290 244"+
      " Q305 243 317 236",P.shadow,.96,.35),
    I("far-upper-lid-structured","M367 223 Q384 209 397 210"+
      " Q414 213 424 226",P.dark,1.35,.61),
    I("far-lower-lid-selective","M370 226 Q392 236 410 230"+
      " Q418 228 424 225",P.shadow,.8,.35),
    W("near-brow-umber-mass","M247 202 Q273 190 299 195"+
      " Q315 200 318 206 Q294 201 268 207 Z",
      P.hair,.49,local(P.sienna,P.deepHair,.39,.15)),
    W("far-brow-umber-mass","M367 198 Q387 183 409 195"+
      " Q417 199 422 206 Q396 196 376 204 Z",
      P.hair,.54,local(P.sienna,P.deepHair,.33,.16)),
    I("near-upper-orbit-broken","M251 250 Q266 257 282 251 M298 251"+
      " Q309 243 315 245",P.shadow,.85,.35),
    I("far-orbit-broken","M373 243 Q385 249 399 241 M407 238"+
      " Q417 235 420 233",P.cool,.83,.3),
    I("near-cheek-edge-disappearing","M239 295 Q251 319 255 328"+
      " M269 344 Q280 362 293 367",P.shadow,.8,.3),
  ]),
  G("ear-and-rooted-fringe",[
    W("connected-near-ear","M211 247 C200 244 190 250 192 276"+
      " Q194 312 222 327 Q231 295 226 264 Z",
      P.skin,.98,local(P.skinLight,P.shadow,.48,.2),"normal"),
    W("ear-concha-cool","M204 264 Q215 254 222 271"+
      " Q214 289 217 302 Q196 288 204 264 Z",
      P.cool,.31,local(P.skinLight,P.cool,.56,.14)),
    I("ear-helix-selective","M200 278 Q199 260 212 259"+
      " Q225 263 220 281 M214 299 Q207 295 210 288",
      P.sienna,.9,.46),
    W("crown-swept-fringe","M189 95 C256 36 347 15 411 93"+
      " Q434 122 430 183 C413 158 398 137 368 127"+
      " Q343 108 310 117 Q246 110 205 186"+
      " Q214 135 189 95 Z",
      P.hair,.97,local("#9F7560",P.deepHair,.27,.33),"normal"),
    W("crown-cool-hair-highlights","M197 116 Q257 54 330 58"+
      " Q293 84 269 126 Q240 166 222 190 Z",
      P.lightHair,.33,local("#CBAB91",P.cool,.45,.17)),
    W("right-temple-hair-accent","M385 97 Q415 111 439 165"+
      " Q453 205 446 269 Q426 219 424 186"+
      " Q412 137 385 97 Z",P.deepHair,.83,local(P.hair,P.deepHair,.53,.22)),
    W("left-fringe-fall","M188 132 Q159 190 159 255"+
      " Q174 302 200 322 Q184 275 211 228"+
      " Q207 179 233 139 Z",
      P.hair,.8,local(P.lightHair,P.deepHair,.63,.2)),
    W("left-face-hair-negative-space","M191 297 Q180 344 200 379"+
      " Q222 389 239 398 Q216 365 215 328 Z",
      P.lightHair,.45,local(P.paper,P.hair,.79,.10)),
    I("crown-long-growth-gestures","M116 93 C163 40 238 24 284 32"+
      " M198 152 Q238 78 301 62 M285 64 Q363 47 400 109"+
      " M350 90 Q415 105 433 173",P.lightHair,1.62,.35),
    I("hair-root-broken-gouache","M61 206 Q102 129 148 104"+
      " M97 292 Q136 221 176 188 M217 134"+
      " Q248 83 273 69 M351 106 Q405 148 418 201",
      P.paper,1.05,.25),
    I("loose-temple-strands","M423 231 C450 257 436 293 456 325"+
      " M193 304 Q169 366 179 414"+
      " M222 154 Q201 196 198 233",P.sienna,.82,.36),
  ]),
];
/** @internal Unapproved static face study. Never use for an exported FilmStage
 * human or public Storybook until the source-led numeric and artistic gates pass.
 */
export function experimentalWatercolourPortrait(seed=83):WatercolourArtwork{
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647)
    throw new RangeError("Invalid watercolor portrait pigment seed");
  return {version:1,width:550,height:688,seed,
    paper:{color:P.paper,tooth:.72,granulation:.44},
    parts:ink,
  };
}
export const EXPERIMENTAL_FACE_REGION_PLAN={
  "full-face":[172,76,451,443],
  "near-eye":[244,170,353,249],
  "far-eye":[352,164,440,252],
  "nose":[303,226,418,312],
  "mouth":[324,306,421,373],
  "hairline":[74,0,441,226],
  "jaw":[168,290,466,487],
} as const;
