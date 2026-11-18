import type {CrayonElement} from "../../registry/video/materials/crayon-scene";

type Wax=Extract<CrayonElement,{kind:"wax"}>;

/**
 * ArtCraft F1 V30: one source-registered continuous three-quarter face.
 * Source: Campbell CC0 608x1082 browser capture, SHA-256
 * f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2.
 *
 * Photograph observed: left visible cheek/ear transition ~[72,683],
 * near malar ~[211,658], oblique chin ~[398,858]. The V29 1x native
 * full render shows a broad symmetrical U-jaw and a triangular pasted
 * cast on the near cheek. Reauthor their *original source silhouettes*
 * rather than drawing on more noise, borders, fake highlights or text.
 *
 * This is not an approved realistic portrait, and remains opt-in.
 */
export const CRAYON_F1_V30_CONTOUR_ANCHORS=Object.freeze({
  nearVisibleCheek:[80,681] as const,
  photographedLeftMost:[72,683] as const,
  sourceChin:[398,858] as const,
  highMalar:[211,658] as const,
  sourceFaceTop:[281,288] as const,
});

export const CRAYON_F1_V30_SURFACE_IDS=[
  "face-outline","cheek-malar-cast","jaw-underside","chin-plane",
] as const;

/**
 * Independent original C-cubic curves reconstruct actual source-connected
 * cheek-to-jaw geometry. There is one skin body; the same parent clips,
 * underpainting, pressure/tooth and old fine details remain in place.
 */
const surfaces:Readonly<Record<(typeof CRAYON_F1_V30_SURFACE_IDS)[number],Partial<Wax>>> = {
  "face-outline":{
    // Brow-to-far temple, projecting cheek at right, swept mandibular
    // shelf rising toward left ear: asymmetric, exactly one closed path.
    d:"M142 353 C171 308 238 280 291 288 "+
      "C352 278 408 292 437 335 "+
      "C454 375 464 420 468 464 "+
      "C478 531 488 594 497 664 "+
      "C502 690 506 719 501 745 "+
      "C494 785 472 818 443 839 "+
      "C428 850 411 857 398 858 "+
      "C369 868 342 866 311 861 "+
      "C270 855 221 843 181 819 "+
      "C155 803 132 785 116 759 "+
      "C103 736 94 713 85 702 "+
      "C78 694 76 686 80 681 "+
      "C85 650 94 620 101 590 "+
      "C107 561 105 519 108 474 "+
      "C111 426 121 380 142 353Z",
    bounds:{x:73,y:272,width:440,height:611},
    // Inherit original volumetric wax, optical grain and skin shading;
    // this is a topology correction, not a new material.
  },
  "cheek-malar-cast":{
    // Real source zygomatic plane rolls inward, then descends toward
    // the mandibular angle. No straight-edged purple triangle.
    d:"M104 598 C116 619 131 633 140 655 "+
      "C154 683 160 702 157 725 "+
      "C154 755 165 786 185 806 "+
      "C159 799 137 783 119 759 "+
      "C99 732 86 702 88 667 "+
      "C88 636 96 608 104 598Z",
    bounds:{x:84,y:590,width:107,height:224},
    blendRadius:16,featherContacts:true,
    // All V28 source-value pigment bands, gradients and directional
    // paper-tooth deposits are intentionally preserved.
  },
  "jaw-underside":{
    // Attached underside is a gradually thinning arc that meets
    // the actual source right-projecting chin; dark is below the form.
    d:"M125 747 C150 786 207 828 266 847 "+
      "C310 860 364 867 398 858 "+
      "C431 853 465 819 487 778 "+
      "C474 821 452 851 418 871 "+
      "C388 884 345 884 300 872 "+
      "C239 856 179 826 146 787 "+
      "C133 770 128 759 125 747Z",
    bounds:{x:117,y:741,width:379,height:148},
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:18,
    outlineOpacity:0,
  },
  "chin-plane":{
    // Curved mental eminence under actual lip, tapering into oblique
    // rim; no large hard-sided tinted cheek rectangle.
    d:"M342 787 C371 777 400 773 427 779 "+
      "C448 785 465 802 458 820 "+
      "C445 846 415 860 398 858 "+
      "C368 858 345 844 336 821 "+
      "C334 808 336 795 342 787Z",
    bounds:{x:330,y:768,width:139,height:97},
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:16.2,
    outlineOpacity:0,
  },
};

/** Only the four photographed anatomical surfaces change; film is
 * non-destructive and reversible against the V29 negative control.
 */
export function crayonF1RebuildMalarMandible(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const found=new Set<string>();
  const result=elements.map(el=>{
    if(!Object.prototype.hasOwnProperty.call(surfaces,el.id))return el;
    if(found.has(el.id)||el.kind!=="wax")
      throw new RangeError("Duplicate or invalid F1 source jaw plane "+el.id);
    found.add(el.id);
    const plane=surfaces[el.id as keyof typeof surfaces];
    if(el.d===plane.d)
      throw new RangeError("V30 source mandible already rebuilt");
    if(el.id==="face-outline"){
      if(el.parentId!==undefined)
        throw new RangeError("F1 source skin root must remain independent");
    }else if(el.parentId!=="face-outline"||el.clipToParent!==true){
      throw new RangeError("F1 jaw anatomy lost its parent face clip");
    }
    return {...el,...plane};
  });
  if(found.size!==CRAYON_F1_V30_SURFACE_IDS.length)
    throw new RangeError("Missing registered source face/jaw regions");
  return result;
}
