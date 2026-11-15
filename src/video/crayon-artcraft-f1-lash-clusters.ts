import type {CrayonElement} from "../../registry/video/materials/crayon-scene";

type Contour=Extract<CrayonElement,{kind:"contour"}>;
export type CrayonF1LashFinish="sparse"|"rooted";

/**
 * ArtCraft F1 lash construction: authored from source 608×1082 CC0 eye
 * close-ups. These are original CRAYON1 pressure-built cubic wax strokes,
 * not repeated SVG ticks/feather brush stamps or a photo mask.
 *
 * Near eye root follows the oblique lid from x217/y555, across x263/y535,
 * to x312/y542. The source contains dense asymmetric hair-root groups;
 * isolated equal-distance lines fail both root connectivity and texture.
 * Far eye, partly hair-covered, receives a shorter 14-stroke family.
 */
const clusters:Record<string,{paths:readonly string[];width:number;
  opacity:number;waxPressure:number}>={
  "lash-contact-near":{
    paths:[
      // Outer canthus: short down-left / tangential groups, not long rods.
      "M218 558 C217 558 216 557 215 555",
      "M220 555 C219 554 217 552 216 550",
      "M224 552 C223 550 221 549 220 547",
      "M228 549 C226 548 224 545 224 543",
      "M232 547 C231 544 228 542 227 541",
      "M236 545 C235 542 232 540 232 539",
      "M240 542 C239 540 237 538 236 536",
      "M244 540 C242 537 241 535 241 534",
      // Central lash-root bouquet, overlapped and deliberately unequal.
      "M247 539 C246 537 245 533 245 532",
      "M250 538 C248 536 247 533 248 530",
      "M253 537 C252 534 251 532 252 530",
      "M256 537 C255 534 255 531 256 529",
      "M259 536 C258 533 258 531 259 529",
      "M262 536 C262 533 262 530 263 529",
      "M266 535 C265 532 266 529 267 528",
      "M269 535 C269 532 269 530 271 529",
      "M272 535 C272 532 274 530 275 530",
      "M275 535 C276 532 277 529 279 530",
      // Medial side: compressed, mixed inward/outer releases.
      "M279 536 C281 533 281 532 283 532",
      "M283 536 C284 534 286 532 288 533",
      "M287 537 C290 535 291 533 292 534",
      "M291 538 C294 536 296 534 297 536",
      "M296 539 C299 537 301 537 303 538",
      "M300 540 C303 538 306 539 308 540",
      "M305 543 C307 540 309 541 311 542",
      // Fine roots weave through the main clump; not random field noise.
      "M232 548 C231 546 230 544 229 543",
      "M246 540 C244 538 243 537 243 535",
      "M261 537 C260 535 260 534 260 533",
      "M274 537 C275 535 276 534 278 534",
      "M287 538 C290 536 292 536 293 537",
      "M304 542 C306 542 308 543 309 543",
      "M224 552 C222 552 220 550 219 549",
      "M252 538 C252 537 252 535 253 533",
    ],
    width:.29,opacity:.66,waxPressure:.57,
  },
  "lash-contact-far":{
    paths:[
      "M406 529 C405 527 404 525 404 524",
      "M409 525 C407 522 406 520 406 518",
      "M412 519 C410 516 409 514 410 513",
      "M416 516 C414 513 412 511 413 510",
      "M420 513 C419 510 417 509 418 507",
      "M423 511 C423 508 421 506 422 505",
      "M427 509 C426 506 426 503 427 502",
      "M432 506 C432 503 433 500 434 500",
      "M437 505 C438 502 440 501 441 500",
      "M442 504 C444 502 446 501 447 502",
      "M447 505 C449 503 451 503 453 503",
      "M453 506 C455 504 457 504 458 506",
      "M421 514 C419 512 419 511 419 510",
      "M439 506 C440 504 442 504 444 503",
    ],
    width:.25,opacity:.62,waxPressure:.52,
  },
};

/** Preserve all original elements exactly unless the opt-in rooted finish
 * is requested; the global scene still uses the same absolute timing,
 * paper seed, outline clipping and semantic eye parents.
 */
export function crayonF1AddRootedLashes(elements:readonly CrayonElement[],
  finish:CrayonF1LashFinish="sparse"):CrayonElement[]{
  if(!["sparse","rooted"].includes(finish))
    throw new RangeError("Invalid F1 native rooted lash finish");
  if(finish==="sparse")return [...elements];
  return elements.map(e=>{
    if(e.kind!=="contour")return e;
    const group=clusters[e.id];
    return group?{...e,d:group.paths.join(" "),
      width:group.width,opacity:group.opacity,
      waxContact:"dry-wax",waxPressure:group.waxPressure} satisfies Contour:e;
  });
}

export const CRAYON_F1_LASH_CLUSTER_COUNTS=Object.freeze({
  near:clusters["lash-contact-near"].paths.length,
  far:clusters["lash-contact-far"].paths.length,
});
