import type {CrayonElement} from "../../registry/video/materials/crayon-scene";

/**
 * F1 V40 (!dev) source-guided hair contour / wax-contact experiment.
 * A shape correction, not a cosmetic strand screen: the photographic mass
 * is asymmetric at the part, temple and hanging curtain, with no rigid
 * symmetric arched "helmet" or straight uniform outer edge.
 *
 * Christopher Campbell CC0 photographic reference:
 * https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg
 * The existing 608x1082 source crop is a browser capture, not the original
 * camera JPEG; V40's coordinates are reconstruction hypotheses rather
 * than newly pixel-registered source observations. Remains ART HOLD.
 *
 * Source side hair shows warm directional light on one side and a darker
 * free fall on the other. Crayon contact: short, thin deposits attached to
 * a continuous dark underpaint, not bright broad vertical rectangular wax
 * stickers. Everything other than these four hair wax boundaries and their
 * existing clipped microfibers is byte-identical to V39.
 */

type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Contour=Extract<CrayonElement,{kind:"contour"}>;
type Region="crown"|"left"|"right";
type Mass="hair-back"|"hair-crown-surface"|"hair-left-curtain"|"hair-right-curtain";

const hairMass:Readonly<Record<Mass,{oldStart:string;d:string}>>={
  "hair-back":{
    oldStart:"M-45 405C-12 280",
    d:"M-45 422C-30 327 6 258 73 215"+
      "C126 179 185 183 247 167"+
      "C287 153 328 157 368 176"+
      "C424 191 465 252 491 307"+
      "C516 373 536 462 555 572"+
      "C568 640 574 727 582 795"+
      "C598 886 610 995 626 1103"+
      "L-27 1103C-29 992 -16 861 -26 735"+
      "C-30 607 -58 512 -45 422Z",
  },
  "hair-crown-surface":{
    oldStart:"M-44 404C-8 270",
    d:"M-44 429C-24 322 6 263 72 216"+
      "C118 184 174 176 225 172"+
      "C270 165 283 158 305 164"+
      "C345 171 383 191 418 222"+
      "C452 250 464 290 476 328"+
      "C472 350 459 364 455 381"+
      "C446 354 434 326 416 302"+
      "C394 281 378 267 358 264"+
      "C342 252 322 256 304 262"+
      "Q281 273 265 269"+
      "C223 263 192 281 173 297"+
      "C140 327 120 355 104 398"+
      "C95 434 89 454 76 477"+
      "Q62 499 47 505L-35 505Z",
  },
  "hair-left-curtain":{
    oldStart:"M-33 352C-4 269",
    d:"M-33 365C-12 297 48 216 165 197"+
      "C143 222 114 258 105 306"+
      "C92 360 92 414 89 456"+
      "C87 517 84 568 74 626"+
      "C69 673 69 728 73 778"+
      "C80 855 102 945 116 1093"+
      "L-27 1093C-29 987 -41 890 -32 808"+
      "C-22 735 -33 656 -36 575"+
      "C-43 500 -45 420 -33 365Z",
  },
  "hair-right-curtain":{
    oldStart:"M379 191Q450 209",
    d:"M379 191C425 203 460 242 479 295"+
      "C500 352 504 411 516 463"+
      "C528 519 534 558 544 609"+
      "C559 669 557 730 573 787"+
      "C582 856 589 926 604 1009"+
      "Q617 1064 615 1091L434 1091"+
      "C455 1015 474 953 481 895"+
      "C491 830 486 770 493 712"+
      "C494 649 483 605 473 551"+
      "C465 506 467 456 457 411"+
      "C444 337 418 266 379 191Z",
  },
};

const regionParent:Readonly<Record<Region,Mass>>={
  crown:"hair-crown-surface",
  left:"hair-left-curtain",
  right:"hair-right-curtain",
};

// Sparse, nonuniform crayon edge contacts. Preserve all original underlying
// centerline cubics / root curves / pigment and opacity: only deposited width
// and pressure change; hard rectangular wax pickups become smaller.
const widths:Readonly<Record<Region,readonly number[]>>={
  crown:[.26,.27,.34,.24,.29,.22],
  left:[.26,.29,.31,.23,.27,.20],
  right:[.24,.27,.29,.23,.26,.19],
};
const pressures:Readonly<Record<Region,number>>={
  crown:.56,left:.54,right:.51,
};

export const CRAYON_F1_V40_HAIR_MASSES=Object.freeze(
  ["hair-back","hair-crown-surface","hair-left-curtain","hair-right-curtain"] as const,
);
export const CRAYON_F1_V40_HAIR_SOURCE=Object.freeze({
  reference:"Christopher Campbell CC0 photographic hair crop, 608x1082",
  correctiveMedium:"native contact-pressure wax with original underpaint gradients",
  approval:false,
} as const);

export function crayonF1ReconstructHairContourV40(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const seen=new Set<string>(),foundMass=new Set<Mass>();
  const foundFiber=new Set<Region>();
  const out=elements.map(el=>{
    if(seen.has(el.id))throw new RangeError("Duplicate source hair or feature "+el.id);
    seen.add(el.id);
    if(Object.prototype.hasOwnProperty.call(hairMass,el.id)){
      const id=el.id as Mass,expected=hairMass[id];
      if(el.kind!=="wax"||el.parentId!==undefined||
         el.clipToParent===true||!el.d.startsWith(expected.oldStart))
        throw new RangeError("Unexpected source wax silhouette "+id);
      foundMass.add(id);
      // Materials remain V38: dark physical underpaint, native paper tooth,
      // original pigment, depth gradients, edge roughness and all timings.
      return {...el,d:expected.d} satisfies Wax;
    }
    if(!el.id.startsWith("hair-rooted-"))return el;
    const match=/^hair-rooted-(crown|left|right)-([0-5])$/.exec(el.id);
    if(!match||el.kind!=="contour")
      throw new RangeError("Malformed original source wax root "+el.id);
    const region=match[1] as Region,index=Number(match[2]);
    if(el.parentId!==regionParent[region]||el.clipToParent!==true||
       !el.d.startsWith("M"))
      throw new RangeError("Disconnected source root "+el.id);
    foundFiber.add(region);
    return {...el,width:widths[region][index],
      waxContact:"dry-wax" as const,waxPressure:pressures[region]} satisfies Contour;
  });
  if(foundMass.size!==CRAYON_F1_V40_HAIR_MASSES.length||
     foundFiber.size!==3)
    throw new RangeError("Incomplete source hair contour and root coverage");
  return out;
}
