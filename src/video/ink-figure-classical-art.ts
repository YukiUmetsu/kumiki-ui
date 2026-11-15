/** Classical ink character art on the canonical INK5 part-native figure brush API.
 * Reference method and rights: docs/research/ink-figure-classical-art-study.md
 * No copied reference frames or museum image files are distributed.
 */
import type {CharacterAsset,CharacterDefinition} from "../../registry/character/definition";
import {inkCraftAsset,DEFAULT_INK_FIGURE_CRAFT} from "../../registry/video/ink-figure-craft";
import type {InkFigureCraftControls,InkFigureStroke} from "../../registry/video/ink-figure-craft";
import { masterPortraitAssets } from "./ink-master-portrait-art";

const fold=(id:string,kind:InkFigureStroke["kind"],points:readonly (readonly[number,number,number])[],
  width:number,tone:number,water:number,detailMin=0,pigment?:string):InkFigureStroke=>({
  id,kind,points:points.map(([x,y,pressure])=>({x,y,pressure})),
  width,tone,water,detailMin,...(pigment?{pigment}:{}),
});
export const INK_TRAVELLER_FOLDS: Readonly<Record<string,readonly InkFigureStroke[]>>={
  robe:[
    fold("outer-shoulder","silk-thread",[[102,145,.05],[93,178,.31],[90,221,.54],[88,271,.39],[82,293,.03]],3.2,.64,.16,.15),
    fold("left-crease","fold",[[116,166,.05],[119,196,.24],[111,237,.67],[114,276,.32],[106,301,.02]],5.8,.60,.45,.35),
    fold("front-column","silk-thread",[[138,170,.03],[131,202,.22],[135,239,.53],[129,286,.35],[126,306,.01]],2.4,.55,.20,.18),
    fold("right-fall","fold",[[160,164,.04],[153,191,.26],[161,237,.65],[171,280,.48],[181,300,.02]],7,.53,.39,.2),
    fold("right-inset","silk-thread",[[178,179,.07],[172,215,.22],[179,261,.56],[194,291,.03]],2.2,.49,.19,.42),
    fold("gathered-center","silk-thread",[[134,231,.02],[137,248,.45],[139,275,.26],[146,302,.02]],1.7,.46,.10,.67),
    fold("left-hem","dry-brush",[[81,295,.04],[105,301,.37],[145,307,.50],[183,301,.32],[199,295,.02]],3.4,.64,.10,.44),
    fold("hem-inner","silk-thread",[[89,289,.04],[118,294,.35],[159,296,.32],[187,287,.03]],1.8,.39,.10,.80),
    fold("under-arm-shadow","fold",[[98,174,.04],[109,185,.42],[113,207,.06]],4.8,.58,.43,.54),
    fold("belt-radial","silk-thread",[[138,228,.04],[146,251,.30],[147,271,.09]],1.9,.42,.14,.82),
  ],
  "sleeve-far":[
    fold("sleeve-far-fold","fold",[[89,161,.02],[79,183,.27],[67,216,.66],[47,238,.05]],5.5,.63,.37,.2),
    fold("sleeve-far-edge","silk-thread",[[63,178,.03],[56,203,.51],[44,230,.22],[41,242,.02]],2.0,.67,.12,.48),
    fold("sleeve-far-crease","silk-thread",[[84,202,.04],[78,227,.43],[69,246,.03]],2.2,.53,.10,.65),
    fold("sleeve-far-cuff","dry-brush",[[43,242,.05],[59,247,.33],[76,244,.38],[87,238,.02]],2.4,.52,.09,.7),
  ],
  "sleeve-near":[
    fold("near-sleeve-volume","fold",[[174,157,.02],[183,180,.43],[202,216,.65],[220,237,.04]],6,.63,.45,.2),
    fold("near-sleeve-inside","silk-thread",[[190,167,.03],[192,190,.31],[202,218,.65],[205,239,.04]],2.2,.57,.12,.50),
    fold("near-sleeve-left","silk-thread",[[167,185,.02],[180,212,.38],[191,247,.07]],1.9,.42,.12,.66),
    fold("near-sleeve-cuff","dry-brush",[[190,243,.02],[207,250,.40],[224,244,.28],[231,237,.02]],2.7,.63,.13,.78),
  ],
  "hand-far":[
    fold("far-thumb","silk-thread",[[42,238,.10],[46,235,.55],[52,238,.23]],1.4,.42,.07,.4,"$shadow"),
    fold("far-knuckles","silk-thread",[[45,245,.04],[50,246,.43],[56,242,.04]],.8,.44,.05,.73,"$skinshade"),
  ],
  "hand-near":[
    fold("near-thumb","silk-thread",[[218,242,.03],[221,238,.56],[226,236,.04]],1.3,.6,.07,.38),
    fold("near-knuckles","silk-thread",[[224,247,.06],[229,248,.39],[234,245,.04]],.9,.58,.06,.61),
    fold("near-fingers","silk-thread",[[224,239,.07],[229,241,.44],[233,239,.08]],.85,.49,.06,.80),
  ],
  hair:[
    fold("temple-ink","silk-thread",[[112,76,.01],[124,64,.57],[145,60,.24],[165,69,.01]],2.4,.41,.12,.35,"$wash"),
    fold("hair-bun-bristles","dry-brush",[[137,29,.06],[143,32,.43],[147,46,.10]],2,.38,.10,.73,"$wash"),
  ],
  beard:[
    fold("beard-flow","silk-thread",[[135,141,.04],[141,153,.55],[142,169,.03]],1.55,.46,.11,.4,"$ink"),
    fold("beard-split","silk-thread",[[147,146,.04],[146,156,.47],[143,168,.02]],.9,.43,.06,.77,"$wash"),
  ],
  "far-upper":[
    fold("far-knee-shadow","fold",[[110,266,.03],[106,281,.55],[106,292,.07]],2.5,.49,.3,.46),
  ],
  "near-upper":[
    fold("near-knee-shadow","fold",[[144,265,.04],[149,279,.53],[152,288,.03]],3,.53,.25,.43),
  ],
  "far-lower":[
    fold("far-boot-crease","dry-brush",[[93,324,.02],[102,320,.32],[114,324,.02]],1.7,.41,.12,.66),
  ],
  "near-lower":[
    fold("near-boot-crease","dry-brush",[[146,325,.03],[158,322,.49],[168,327,.02]],2.1,.52,.12,.63),
  ],
};


/**
 * Additional original, pose-attached marks inspired by named Chinese figure
 * painting line families, not copied geometry from museum images.
 *
 * Every point is in the existing 260×340 approved design sheet.
 * Master deliberately uses restrained wet weight; the apprentice has tighter,
 * energetic small folding rhythms. Details move with their *own* rig part.
 */
export const INK_APPRENTICE_FOLDS: Readonly<Record<string,readonly InkFigureStroke[]>> = {
  robe: [
    fold("ap-shoulder-iron","silk-thread",[[107,150,.03],[99,178,.28],[98,224,.38],[88,278,.22],[82,300,.02]],2.0,.64,.19,.1),
    fold("ap-ink-belly","orchid-leaf",[[160,151,.02],[171,185,.35],[175,238,.87],[185,289,.46],[192,298,.015]],13,.43,.57,.17,"$shadow"),
    fold("ap-inside-lapel","silk-thread",[[126,158,.03],[137,186,.55],[143,216,.38],[150,239,.03]],2.1,.64,.18,.23),
    fold("ap-left-hang","orchid-leaf",[[110,173,.03],[114,202,.5],[108,245,.9],[103,277,.36],[94,299,.02]],11,.54,.51,.32),
    fold("ap-lower-return","broken-reed",[[96,284,.09],[113,293,.8],[120,299,.01],[136,306,.08],[155,303,.65],[188,292,.01]],3.2,.70,.19,.48),
    fold("ap-robe-drift","silk-thread",[[146,176,.02],[151,199,.31],[147,239,.64],[158,291,.04]],1.5,.48,.10,.44),
    fold("ap-trailing-crease","silk-thread",[[178,182,.02],[178,219,.56],[183,261,.42],[185,287,.02]],1.7,.52,.11,.67),
    fold("ap-hem-bristles","dry-brush",[[82,300,.01],[112,307,.32],[144,306,.63],[169,307,.39],[195,299,.02]],3.8,.62,.12,.6),
    fold("ap-tension-waist","orchid-leaf",[[131,225,.02],[134,243,.57],[129,275,.62],[132,304,.01]],7.5,.37,.51,.76),
  ],
  "sleeve-far": [
    fold("ap-far-shoulder","orchid-leaf",[[96,155,.02],[86,181,.50],[69,220,.9],[52,243,.03]],8.6,.58,.55,.24),
    fold("ap-far-inner","silk-thread",[[86,189,.02],[69,225,.63],[62,244,.02]],2,.6,.14,.37),
    fold("ap-far-turn","broken-reed",[[66,240,.08],[53,248,.7],[46,244,.01],[59,251,.07],[77,244,.59],[91,238,.015]],2.6,.64,.16,.63),
    fold("ap-far-fiber","dry-brush",[[81,172,.02],[69,190,.58],[58,221,.05]],3.2,.46,.12,.82),
  ],
  "sleeve-near": [
    fold("ap-near-shoulder","orchid-leaf",[[165,151,.02],[185,178,.43],[199,210,.80],[217,241,.04]],10,.59,.52,.15),
    fold("ap-near-center","silk-thread",[[173,176,.02],[187,206,.33],[201,230,.65],[208,248,.015]],2.2,.60,.14,.31),
    fold("ap-near-break","broken-reed",[[187,242,.12],[204,252,.65],[213,251,.015],[216,250,.09],[227,242,.74],[231,235,.02]],2.9,.66,.15,.49),
    fold("ap-near-satin","silk-thread",[[183,186,.02],[197,203,.56],[203,212,.01]],1.2,.44,.15,.68),
    fold("ap-near-worn-edge","dry-brush",[[205,244,.03],[217,250,.63],[228,239,.04]],2.6,.55,.10,.84),
  ],
  face: [
    fold("ap-cheek-volume","silk-thread",[[112,101,.02],[116,117,.30],[125,131,.03]],1.2,.28,.11,.31,"$skinshade"),
    fold("ap-nose-bridge","silk-thread",[[144,94,.015],[143,104,.55],[141,112,.02]],.7,.46,.11,.58,"$shadow"),
    fold("ap-chin-light","silk-thread",[[129,132,.01],[139,137,.20],[149,133,.02]],.65,.26,.08,.7,"$linen"),
  ],
  hair: [
    fold("ap-crown-bristle","dry-brush",[[111,72,.03],[124,57,.67],[145,51,.4],[163,60,.03]],3.4,.53,.1,.3,"$wash"),
    fold("ap-shifted-lock","broken-reed",[[105,87,.05],[115,72,.67],[132,67,.02],[144,69,.10],[159,72,.6],[171,87,.02]],2.2,.50,.09,.54,"$wash"),
    fold("ap-side-lock","silk-thread",[[170,81,.04],[177,91,.49],[173,104,.04]],1.4,.46,.13,.73,"$shadow"),
  ],
  "hand-near":[
    fold("ap-index-contour","silk-thread",[[225,239,.02],[232,237,.61],[236,240,.05]],.8,.52,.09,.3,"$skinshade"),
    fold("ap-knuckle-crease","silk-thread",[[221,245,.02],[228,247,.45],[234,245,.02]],.7,.50,.08,.58,"$skinshade"),
  ],
  "hand-far":[
    fold("ap-far-finger","silk-thread",[[43,242,.02],[50,244,.48],[55,241,.02]],.8,.50,.09,.36,"$skinshade"),
  ],
  "chin-trace":[
    fold("ap-jaw-soft","silk-thread",[[125,137,.01],[140,146,.50],[152,134,.02]],.85,.47,.10,.57,"$shadow"),
  ],
};
/** Extra large, asymmetrical brush planes in the teacher's robe.
 * They are a small authored extension of the *same* existing source fold atlas.
 */
export const INK_MASTER_CLASSICAL_ACCENTS: Readonly<Record<string,readonly InkFigureStroke[]>> = {
  robe:[
    fold("ma-shoulder-shadow","orchid-leaf",[[100,145,.03],[94,184,.46],[88,222,.86],[82,281,.38],[78,299,.02]],15,.43,.56,.18,"$shadow"),
    fold("ma-robe-river","orchid-leaf",[[162,148,.02],[171,190,.37],[178,244,.94],[190,294,.35],[199,300,.02]],20,.36,.69,.25,"$shadow"),
    fold("ma-pleat-interruption","broken-reed",[[114,294,.05],[125,303,.77],[135,306,.01],[151,307,.03],[171,303,.64],[191,294,.02]],3,.66,.15,.52),
    fold("ma-centered-crease","silk-thread",[[137,182,.01],[145,224,.34],[141,255,.56],[151,301,.02]],1.5,.43,.11,.72),
  ],
  "sleeve-near":[
    fold("ma-wing-shadow","orchid-leaf",[[169,148,.03],[183,174,.41],[208,216,.86],[225,240,.015]],11,.38,.52,.26,"$shadow"),
    fold("ma-sleeve-reed","broken-reed",[[182,232,.08],[195,251,.72],[204,254,.01],[213,253,.04],[225,246,.59],[231,236,.02]],2.8,.62,.18,.65),
  ],
  "sleeve-far":[
    fold("ma-far-shadow","orchid-leaf",[[96,157,.02],[76,180,.48],[62,216,.75],[43,238,.01]],10,.35,.52,.3,"$shadow"),
  ],
  face:[
    fold("ma-profile-crease","silk-thread",[[112,105,.02],[116,120,.31],[126,134,.02]],.9,.42,.08,.42,"$skinshade"),
    fold("ma-nose-highlight","silk-thread",[[144,92,.01],[147,99,.45],[143,108,.01]],.8,.43,.1,.72,"$shadow"),
  ],
  hair:[
    fold("ma-crown-calligraphy","dry-brush",[[114,71,.02],[136,53,.63],[162,59,.30],[173,77,.02]],3.6,.54,.11,.45,"$wash"),
  ],
  beard:[
    fold("ma-split-bristle","dry-brush",[[132,140,.02],[141,158,.58],[143,169,.015]],1.6,.62,.10,.58,"$wash"),
  ],
};

/** Enrich an approved portrait without touching rig pivots, cue timelines,
 * mouth/blink variants, identity or per-part material ownership.
 * The optional classical quality controls are shared with INK5 director.
 */
export function makeClassicalInkFigure(
  base: CharacterDefinition, role: "master"|"apprentice",
  controls: InkFigureCraftControls = DEFAULT_INK_FIGURE_CRAFT,
): CharacterDefinition {
  const groups=role==="master"
    ? [INK_TRAVELLER_FOLDS,INK_MASTER_CLASSICAL_ACCENTS]
    : [INK_APPRENTICE_FOLDS];
  const assets:Record<string,CharacterAsset>=role==="master"
    ? masterPortraitAssets(base.assets,controls.detail)
    : {...base.assets};
  for(const group of groups)for(const [key,marks] of Object.entries(group)){
    const existing=assets[key];
    // Some master marks describe segmented IK leg art in the director variant.
    // The simpler conversation rig has full leg cels; skip only absent parts.
    if(!existing)continue;
    if(existing.kind!=="shapes")
      throw new RangeError("INK figure crafts require approved vector art: "+key);
    assets[key]=inkCraftAsset(existing,marks,controls);
  }
  // The previous round-headed master read as a child at film scale.
  // Narrow the complete *parent* head (not each detached facial sprite):
  // the hair, face, eyes, nose, mouth and beard stay in one continuous rig,
  // and the authored eye anchor remains geometrically correct after acting.
  const poses=role==="master"&&controls.detail>=.55
    ? {...base.poses,rest:{...base.poses.rest,head:{
        ...base.poses.rest?.head,scaleX:.87,scaleY:.90,
      }}}
    : base.poses;
  return {...base, revision:base.revision+"-classical-v1", assets,poses};
}
