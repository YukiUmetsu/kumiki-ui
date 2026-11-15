import type {CrayonElement} from "../../registry/video/materials/crayon-scene";

type Wax=Extract<CrayonElement,{kind:"wax"}>;

/**
 * ArtCraft 9.1: F1 photographed mandibular shelf and attached neck study.
 *
 * Evidence: Christopher Campbell, CC0; frozen 608x1082 browser source,
 * sha256 f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2.
 * Independent source landmarks: chin=(398,858), near cheek=(211,658).
 *
 * Observation: the mandibular contour rises from the ear/cheek mass to an
 * asymmetric chin on the RIGHT of the source image. A broad, irregular,
 * soft submandibular cast directly below it roots into the neck column.
 * The neck is not a flat dark trapezoid and the jaw is not a thin ink loop.
 *
 * All original CRAYON1 native semantic IDs, nesting, paper/contact engine,
 * seed, reveal frames, and material detail are preserved. There is an exact
 * negative control: jawNeckForm:"baseline" in the calling scene.
 */
const regions:Readonly<Record<string,Partial<Wax>>>={
  "face-outline":{
    d:"M142 353 C171 304 237 281 292 287 "+
      "C349 277 409 286 438 330 "+
      "C459 384 467 456 475 523 "+
      "C483 588 493 637 501 685 "+
      "C507 726 500 768 488 794 "+
      "C475 816 453 840 421 852 "+
      "C405 863 389 869 366 866 "+
      "C332 863 301 862 277 853 "+
      "C228 836 195 815 172 789 "+
      "C148 769 132 742 119 707 "+
      "C103 656 105 606 108 557 "+
      "L108 467 C111 421 119 387 142 353Z",
    bounds:{x:99,y:272,width:412,height:608},
    underpaintGradient:{
      light:"#bf9d94",shadow:"#685051",
      focusX:.46,focusY:.33,radius:1.10,
    },
    underpaintTooth:.23,spacing:11.1,markStrength:.16,
  },
  "jaw-underside":{
    d:"M122 752 C152 794 211 828 269 846 "+
      "C319 864 378 869 420 849 "+
      "C449 835 471 811 487 778 "+
      "C472 831 450 854 417 865 "+
      "C366 890 294 871 239 848 "+
      "Q173 826 122 752Z",
    bounds:{x:109,y:744,width:391,height:147},
    colors:["#aa837e","#6f5053","#c8978d"],
    pressure:.41,spacing:9.7,markStrength:.21,blendRadius:17,
    featherContacts:true,
  },
  "chin-plane":{
    d:"M338 783 C364 771 397 766 425 774 "+
      "C451 783 468 801 463 820 "+
      "C449 849 421 861 390 860 "+
      "C363 858 338 840 333 817 "+
      "Q329 798 338 783Z",
    bounds:{x:326,y:757,width:148,height:113},
    colors:["#bc9790","#936e6c","#d6ada1"],
    pressure:.37,spacing:8.9,markStrength:.21,blendRadius:11,
    featherContacts:true,
  },
  "neck-attached":{
    d:"M151 811 C187 834 236 854 303 863 "+
      "C370 876 415 849 440 827 "+
      "C448 891 451 973 480 1091 "+
      "L135 1091 C145 1042 142 968 140 925 "+
      "C136 883 143 841 151 811Z",
    bounds:{x:128,y:795,width:360,height:301},
    colors:["#826660","#493b3c","#aa897e"],
    pressure:.89,spacing:8.3,markStrength:.18,underpaintTooth:.17,
    underpaintGradient:{
      light:"#8e7269",shadow:"#392d30",focusX:.49,focusY:.15,radius:1.10,
    },
  },
  "neck-submandibular-cast":{
    d:"M149 810 C194 839 254 865 320 873 "+
      "C381 882 418 852 440 829 "+
      "C446 865 431 887 405 901 "+
      "C363 923 286 918 230 892 "+
      "C185 875 160 851 149 810Z",
    bounds:{x:139,y:801,width:311,height:133},
    colors:["#4a3439","#30282d","#8b6662"],
    pressure:.69,spacing:8.6,markStrength:.23,
    blendRadius:19,featherContacts:true,
    underpaintTooth:.17,
  },
  "neck-cervical-turn":{
    d:"M144 848 C159 875 175 912 183 951 "+
      "C192 998 210 1059 226 1088 "+
      "L267 1091 C234 1020 220 954 206 902 "+
      "C183 864 161 843 144 848Z",
    bounds:{x:139,y:841,width:136,height:255},
    colors:["#604648","#3a2e32","#927269"],
    pressure:.47,spacing:11.1,markStrength:.16,
    blendRadius:22,featherContacts:true,
  },
};

/** All expected IDs must exist. Reject silent partial patches. */
export const CRAYON_F1_JAW_NECK_IDS=Object.freeze(Object.keys(regions));

export function crayonF1ReconstructJawNeck(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const found=new Set<string>();
  const out=elements.map(element=>{
    if(element.kind!=="wax"||!(element.id in regions))return element;
    if(found.has(element.id))throw new RangeError("Duplicate jaw/neck: "+element.id);
    found.add(element.id);
    return {...element,...regions[element.id]};
  });
  for(const id of CRAYON_F1_JAW_NECK_IDS){
    if(!found.has(id))throw new RangeError("Missing source jaw/neck: "+id);
  }
  return out;
}
