import type { RisoCharacterMeshSheet, RisoMeshRegion, RisoMeshCategory } from "../../registry/video/riso-proportion-mesh";

/** Drafted as transparent construction topology against the actual RISO5 paths.
 * These polygons are authored approximations for ratio and alignment review,
 * not automatically inferred path bounds or fabricated 3D geometry.
 */
function box(
  id: string, label: string, category: RisoMeshCategory,
  joint: string, parts: readonly string[], x0: number, y0: number,
  x1: number, y1: number, tipJoint?: string,
): RisoMeshRegion {
  return {
    id,label,category,joint,parts,tipJoint,
    contour: [[x0,y0],[x1,y0],[x1,y1],[x0,y1]],
    landmarks:[{id:"center",at:[(x0+x1)/2,(y0+y1)/2]}],
  };
}
export const RISO_COURIER_SHEET: RisoCharacterMeshSheet={
  id:"courier",label:"Paper Courier",view:"authored-2d",headRegion:"head-shape",
  missingViews:["true-side","back","three-quarter","top"],
  poses:[{frame:0,label:"Initial pose"},{frame:46,label:"Swing / knee bend"},{frame:198,label:"Final smile"}],
  regions:[
    box("head-shape","Head / face silhouette","face","head",["face","face-outline"],-38,-56,39,33),
    box("hair-mass","Hair crown and fringe","hair","head",["hair"],-44,-78,44,-10),
    box("cap","Cap crown + brim","headwear","head",["cap","cap-brim"],-47,-77,55,-26),
    box("brow-left","Left eyebrow","face","head",["left-eyebrow"],-25,-26,-10,-13),
    box("brow-right","Right eyebrow","face","head",["right-eyebrow"],8,-29,25,-14),
    box("eye-left","Left eye + eyelid","face","head",["eye-line"],-23,-12,-10,1),
    box("eye-right","Right eye + eyelid","face","head",["eye-line"],9,-14,23,0),
    box("nose","Nose bridge / tip","face","head",["nose"],0,0,8,9),
    box("mouth","Mouth / lip shapes","face","head",["mouth"],-11,8,12,28),
    box("cheek","Cheek spot","face","head",["cheek"],-30,0,-16,13),
    box("neck","Neck segment","torso","body",["neck"],-10,-83,10,-56),
    box("coat-shell","Coat silhouette","torso","body",["coat"],-34,-75,36,34),
    box("coat-seam","Coat center seam","torso","body",["coat-seam"],-6,-62,10,23),
    box("pocket","Coat pocket","accessory","body",["coat-pocket"],-26,-12,-7,10),
    box("coat-buttons","Coat buttons","accessory","body",["coat-buttons"],3,-42,15,-6),
    box("badge","Chest badge","accessory","body",["badge"],5,-44,23,-25),
    box("sleeve-left","Left upper sleeve","sleeve","left-arm",["left-upper-sleeve"],-11,-3,11,32,"left-elbow"),
    box("forearm-left","Left forearm / cuff","arm","left-elbow",["left-forearm"],-9,-5,10,28,"left-hand"),
    box("glove-left","Left glove / hand","hand","left-hand",["left-glove"],-9,-10,14,17),
    box("sleeve-right","Right upper sleeve","sleeve","right-arm",["right-upper-sleeve"],-11,-3,11,32,"right-elbow"),
    box("forearm-right","Right forearm / cuff","arm","right-elbow",["right-forearm"],-9,-5,10,29,"right-hand"),
    box("glove-right","Right glove / grip","hand","right-hand",["right-glove"],-9,-11,14,16),
    box("thigh-left","Left thigh / trouser","leg","left-leg",["left-thigh"],-12,-5,12,44,"left-knee"),
    box("shin-left","Left shin / trouser","leg","left-knee",["left-shin"],-10,-5,10,39,"left-ankle"),
    box("boot-left","Left boot / sole","foot","left-ankle",["left-boot","left-boot-detail"],-14,-13,26,14),
    box("thigh-right","Right thigh / trouser","leg","right-leg",["right-thigh"],-12,-5,12,44,"right-knee"),
    box("shin-right","Right shin / trouser","leg","right-knee",["right-shin"],-10,-5,10,39,"right-ankle"),
    box("boot-right","Right boot / sole","foot","right-ankle",["right-boot","right-boot-detail"],-14,-13,26,14),
    box("satchel","Satchel shell + flap","accessory","satchel",["satchel-ink","satchel-flap"],-10,-17,39,71),
    box("satchel-buckle","Satchel buckle","accessory","satchel",["satchel-buckle"],11,12,26,26),
    box("satchel-strap","Cross-body strap","accessory","body",["satchel-strap"],-31,-58,37,18),
  ],
};
export const RISO_PAPER_BIRD_SHEET: RisoCharacterMeshSheet={
  id:"paper-bird",label:"Paper Bird",view:"authored-2d",headRegion:"head",
  missingViews:["true-side","back","three-quarter","top","wing-fold-underside"],
  poses:[{frame:0,label:"Wing rise"},{frame:84,label:"Wing down"},{frame:160,label:"Flight hold"}],
  regions:[
    box("head","Head silhouette","face","root",["head"],8,-40,51,23),
    box("eye","Eye / blink","face","root",["eye"],25,-15,43,1),
    box("beak","Beak contour","face","root",["beak"],45,-8,65,13),
    box("body","Body / chest","torso","root",["body"],-31,-29,36,29),
    box("left-wing","Left wing / primary feathers","wing","left-wing",["wing-left"],-53,-72,7,3),
    box("right-wing","Right wing / ink accent","wing","right-wing",["wing-right","wing-ink-accent"],-10,-68,39,4),
    box("tail","Tail feathers","tail","tail",["tail-feathers"],-36,-19,2,16),
  ],
};
export const RISO_ALL_CHARACTER_SHEETS=[RISO_COURIER_SHEET,RISO_PAPER_BIRD_SHEET] as const;
