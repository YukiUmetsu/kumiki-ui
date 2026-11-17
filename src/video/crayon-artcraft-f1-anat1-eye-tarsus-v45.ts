import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
import {CRAYON_PORTRAIT_AUDIT} from "./crayon-artcraft-portrait-audit";

/**
 * ArtCraft F1 V45 · source-observed near-eye tarsal / lacrimal continuity.
 *
 * Actual CC0 608x1082 source and exact Chromium V43 f299:
 * medial x312,546 photo (74,30,28), native (152,127,120);
 * lower lid x260,572 photo (108,63,58), native (182,148,136);
 * upper socket x254,514 photo (121,89,87), native (170,136,132).
 * Photo inner visible sclera x293,547 (131,132,132), native
 * (139,123,119): grey/near neutral, NOT uniform white sticker.
 *
 * Use the existing ANAT1 source-fitted eyelid/limbus cubic structure
 * (V36), 33 authored source-root lash gestures and all original wax.
 * Soften contact at nasal tear duct, connect tarsal underfold and
 * increase eyelash microtouches without replacing eye by a vector icon.
 *
 * Important: underlayer color matching (V44) independently regressed
 * whole photo SSIM. This V45 remains an independent V43-derived opt-in
 * morphology/contact study, not a second V44 paint stack.
 */
type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Contour=Extract<CrayonElement,{kind:"contour"}>;
type ChangedId="sclera-inner-contact-near"|"lash-root-near"|
  "lower-lid-near"|"lower-lid-margin-near"|"upper-lid-crease-near";
export const CRAYON_F1_V45_SOURCE=Object.freeze({
  sha:CRAYON_PORTRAIT_AUDIT.source.sha256,
  medialTearDuct:{xy:[312,546],photo:[74,30,28],v43:[152,127,120]},
  neutralSclera:{xy:[293,547],photo:[131,132,132],v43:[139,123,119]},
  lowerTarsal:{xy:[260,572],photo:[108,63,58],v43:[182,148,136]},
  superiorSulcus:{xy:[254,514],photo:[121,89,87],v43:[170,136,132]},
  independentApproval:false,
} as const);

const material:Readonly<Record<ChangedId,Partial<Wax>>>={
  "sclera-inner-contact-near":{
    // Mucous sclera is a *small* neutral grey bright shape by the dark
    // limbus (x285..298), progressively occluded by medial lid x308.
    // The original iris + limbus/eye architecture is untouched.
    colors:["#a69d9c","#726669","#beb8b8"],
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    pressure:.60,spacing:5.2,markStrength:.18,
    featherContacts:true,blendRadius:5.4,outlineOpacity:0,
  },
  "lash-root-near":{
    // Replace cartoon-solid near-duct line with a curved deep skin fold.
    // The medial canthus is dark due to an overhanging upper tarsus,
    // not a duplicate pupil or a crescent black sclera.
    colors:["#4f3639","#231b20","#78565b"],
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",
    pressure:.86,spacing:4.5,markStrength:.24,
    underpaintTooth:.16,opaqueBurnish:.74,
    underpaintGradient:{light:"#715155",shadow:"#22191e",
      focusX:.39,focusY:.62,radius:.92},
    outlineOpacity:0,
  },
  "lower-lid-near":{
    // Source lower tarsal crest at x260,572 is muted mauve-brown, much
    // darker than native. Keep translucent wax rolling into infraorbit,
    // not a hard dark 10px painted ribbon.
    colors:["#865c5e","#4b343c","#b88783"],
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    pressure:.64,spacing:6.5,markStrength:.25,
    featherContacts:true,blendRadius:10.2,outlineOpacity:0,
  },
  "lower-lid-margin-near":{
    // Thin muted contact ends at the original source lower canthus.
    colors:["#916969","#594044","#b88d85"],
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    pressure:.55,spacing:6.7,markStrength:.21,
    featherContacts:true,blendRadius:8.7,outlineOpacity:0,
  },
  "upper-lid-crease-near":{
    // Brow-to-tarsus sulcus follows 3D ANAT1 photographed eyelid
    // surface. Darken the original *connected open* layer, not eye rim.
    colors:["#93716d","#5b4346","#b49389"],
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    pressure:.53,spacing:7.0,markStrength:.21,
    featherContacts:true,blendRadius:9.8,outlineOpacity:0,
  },
};
export const CRAYON_F1_V45_CHANGED_IDS=Object.freeze([
  "sclera-inner-contact-near","lash-root-near","lower-lid-near",
  "lower-lid-margin-near","upper-lid-crease-near",
] as const);

const r=(x:number)=>Math.round(x*100)/100;
const smooth=(a:number,b:number,t:number)=>a+(b-a)*(t*t*(3-2*t));
const knots:readonly (readonly [number,number])[]=[
  [220,558],[235,544],[249,538],[266,535],
  [282,536],[299,539],[317,545],
];
const yOnRim=(x:number)=>{
  for(let i=1;i<knots.length;i++){
    if(x<=knots[i][0]){
      const a=knots[i-1],b=knots[i];
      return smooth(a[1],b[1],(x-a[0])/(b[0]-a[0]));
    }
  }
  return knots[knots.length-1][1];
};
const jitter=(n:number,salt:number)=>{
  const v=Math.sin(n*126.179+salt*231.83)*61741.358;
  return v-Math.floor(v);
};

/** Source upper lash row: 10 original hand-placed curves remain at their
 * exact original path. Extra 23 micro fibers have variable slant, wax
 * pressure from original parent and tapered direction (free tip -> root).
 * Does not alter the original contour's source orientation or seed.
 */
function extraRootedLashes():string{
  const out:string[]=[];
  for(let i=0;i<23;i++){
    const x=230+(i+.3+.3*jitter(i,1))/23*79;
    const base=yOnRim(x)-.2+.8*(jitter(i,2)-.5);
    const length=2.4+5.4*jitter(i,3);
    const lean=x<255?-.28:x<281?-.04:.21;
    const dx=(lean+.32*(jitter(i,4)-.5))*length;
    const tipX=x+dx,tipY=base-length*.8;
    const c1x=tipX-dx*.18,c1y=tipY+length*.30;
    const c2x=x-dx*.1,c2y=base-length*.24;
    if(tipX<223||tipX>317||tipY<520||base>560)
      throw new RangeError("ANAT1 source lash escaped true upper lid");
    out.push("M"+r(tipX)+" "+r(tipY)+" C"+
      r(c1x)+" "+r(c1y)+" "+r(c2x)+" "+r(c2y)+" "+
      r(x)+" "+r(base));
  }
  return out.join(" ");
}
export const CRAYON_F1_V45_NEW_LASH_COUNT=23;

/** Fail-closed reversible source-domain transform, no new elements or
 * index-derived procedural seed shifts. All 300 film frames preserve
 * original skin geometry and authored timing, eye/nose/mouth/hair/foliage.
 */
export function crayonF1RefineNearTarsusV45(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const seen=new Set<string>(),changed=new Set<ChangedId>();
  let hasLashes=false;
  const out=elements.map(el=>{
    if(seen.has(el.id))throw new RangeError("Duplicate CC0 face ID "+el.id);
    seen.add(el.id);
    if(el.id==="lash-contact-near"){
      const sourceCount=(el.d.match(/M/g)??[]).length;
      const newMicroContacts=extraRootedLashes();
      // Some Storybook controls use the original 10 sparse lashes,
      // others the photographed 33-lash rooted-flow option. Both are
      // authentic existing source controls; never silently force one.
      // Appending 23 gives counts 33 and 56, respectively. A 33-count
      // *already applied V45* is distinguished by its exact terminal
      // micro-contact geometry to prevent destructive double re-ink.
      if(hasLashes||el.kind!=="contour"||el.parentId!=="face-outline"||
         el.clipToParent!==true||el.waxContact!=="dry-wax"||
         (sourceCount!==10&&sourceCount!==33)||
         el.d.endsWith(" "+newMicroContacts))
        throw new RangeError("Missing original sparse/rooted source eye lashes or V45 already applied");
      hasLashes=true;
      return {...el,d:el.d+" "+newMicroContacts} satisfies Contour;
    }
    if(!Object.prototype.hasOwnProperty.call(material,el.id))return el;
    const id=el.id as ChangedId;
    const expectedParent=id==="sclera-inner-contact-near"?
      "sclera-near":"face-outline";
    if(el.kind!=="wax"||el.parentId!==expectedParent||
       el.clipToParent!==true||!el.d.startsWith("M")||
       el.renderLayer==="backdrop"||changed.has(id))
      throw new RangeError("Disconnected source tarsal wax "+id);
    changed.add(id);
    return {...el,...material[id]} satisfies Wax;
  });
  if(changed.size!==CRAYON_F1_V45_CHANGED_IDS.length||!hasLashes||
     !seen.has("iris-near")||!seen.has("pupil-near")||
     !seen.has("lower-lid-far")||!seen.has("face-outline")||
     !seen.has("cc0-hedge-dark-underpaint"))
    throw new RangeError("Incomplete native CC0 eye or photographic source");
  return out;
}
