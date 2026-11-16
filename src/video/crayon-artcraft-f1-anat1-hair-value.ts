import type {CrayonColor,CrayonElement} from "../../registry/video/materials/crayon-scene";
import {CRAYON_PORTRAIT_AUDIT} from "./crayon-artcraft-portrait-audit";

/**
 * ArtCraft F1 V38: source-calibrated dark eumelanin-like crayon hair volume.
 * Original CC0 source screenshot 608×1082, SHA256 in CRAYON_PORTRAIT_AUDIT.
 *
 * Actual V37 native 9px RGB median against SAME source photo:
 *                         original        native V37
 * crown (278,215)         47,36,30        162,133,112
 * crown root (295,270)    48,34,31        153,130,113
 * left front (36,555)     52,29,22         90,76,72
 * left shine (40,364)     92,63,50        109,89,82
 * right roots (450,354)   61,44,37        123,102,89
 * right veil (532,707)    61,41,31        105,85,76
 * right tail (571,894)    46,28,21        122,97,84
 *
 * Existing native hair is too light and uniformly brown/gray, even
 * though its source-aligned silhouette and rich multi-band hair fibers
 * are retained. Fix face/hair luminance hierarchy BEFORE adding more
 * cosmetic strands; do not flatten/erase the existing 18+ hair-contour
 * groups or change any facial plane, ANAT1 camera or 300-frame timing.
 *
 * This is a reversible V37/ANAT1 opt-in, not an approved portrait. Hair
 * tones and shapes remain original native crayon geometry, NOT a
 * bitmap sampled from the photograph or a global brightness filter.
 */
type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Contour=Extract<CrayonElement,{kind:"contour"}>;
export const CRAYON_F1_V38_SOURCE=Object.freeze({
  sha:CRAYON_PORTRAIT_AUDIT.source.sha256,
  comparisons:[
    {point:[278,215],photo:[47,36,30],v37:[162,133,112]},
    {point:[295,270],photo:[48,34,31],v37:[153,130,113]},
    {point:[36,555],photo:[52,29,22],v37:[90,76,72]},
    {point:[40,364],photo:[92,63,50],v37:[109,89,82]},
    {point:[450,354],photo:[61,44,37],v37:[123,102,89]},
    {point:[532,707],photo:[61,41,31],v37:[105,85,76]},
    {point:[571,894],photo:[46,28,21],v37:[122,97,84]},
  ],
} as const);
export const CRAYON_F1_V38_HAIR_IDS=[
  "hair-back","hair-crown-surface","hair-left-curtain","hair-right-curtain",
] as const;
type Region=(typeof CRAYON_F1_V38_HAIR_IDS)[number];
const wax:Readonly<Record<Region,Partial<Wax>>>={
  "hair-back":{
    colors:["#3e2e29","#191719","#78543f"],
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",
    pressure:.96,spacing:4.4,markStrength:.36,
    underpaintTooth:.14,opaqueBurnish:.90,
    underpaintGradient:{light:"#594033",shadow:"#131013",
      focusX:.32,focusY:.19,radius:1.15},
    edgeRoughness:.26,outlineOpacity:0,
  },
  "hair-crown-surface":{
    colors:["#48332b","#20191a","#825c46"],
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",
    pressure:.95,spacing:4.3,markStrength:.34,
    underpaintTooth:.15,opaqueBurnish:.86,
    underpaintGradient:{light:"#745341",shadow:"#1b1417",
      focusX:.55,focusY:.26,radius:.90},
    edgeRoughness:.23,outlineOpacity:0,
  },
  "hair-left-curtain":{
    colors:["#352520","#151115","#765039"],
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",
    pressure:.96,spacing:4.3,markStrength:.33,
    underpaintTooth:.16,opaqueBurnish:.84,
    underpaintGradient:{light:"#674739",shadow:"#100d10",
      focusX:.26,focusY:.21,radius:1.20},
    edgeRoughness:.26,outlineOpacity:0,
  },
  "hair-right-curtain":{
    colors:["#382821","#181417","#76523e"],
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",
    pressure:.96,spacing:4.3,markStrength:.33,
    underpaintTooth:.16,opaqueBurnish:.86,
    underpaintGradient:{light:"#684938",shadow:"#120e12",
      focusX:.43,focusY:.17,radius:1.20},
    edgeRoughness:.29,outlineOpacity:0,
  },
};
const tone:(i:number)=>CrayonColor=i=>(
  ["#34282a","#584039","#88604c","#956b52","#6b4a3b","#b18766"] as const
)[i%6];
/**
 * Retain every native rooted individual source-space hair curve and
 * original silhouette/camera. Re-pigment only the existing dense
 * six-band source-linked contour groups, preserving the warm thin
 * rim-light contrast against the new dark large hair masses.
 */
export function crayonF1CalibrateAnat1HairValues(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const seen=new Set<string>();
  const hairRegions=new Set<string>();
  let hairBands=0;
  const out=elements.map(el=>{
    if(Object.prototype.hasOwnProperty.call(wax,el.id)){
      if(el.kind!=="wax"||seen.has(el.id)||
         el.parentId!==undefined||el.clipToParent===true)
        throw new RangeError("Invalid original CC0 hair mass "+el.id);
      seen.add(el.id);
      return {...el,...wax[el.id as Region]};
    }
    const match=/^hair-rooted-(crown|left|right)-(\d)$/.exec(el.id);
    if(match){
      if(el.kind!=="contour"||el.parentId!==
         (match[1]==="crown"?"hair-crown-surface":
           match[1]==="left"?"hair-left-curtain":"hair-right-curtain")||
         el.clipToParent!==true)
        throw new RangeError("Disconnected native hair microstructure");
      hairBands++;
      hairRegions.add(match[1]);
      const i=Number(match[2]);
      return {...el,color:tone(i),opacity:.28+i*.054,
        // Same source-registered cubic hairs and exact inherited dry wax
        // pressure. No new elements and no tiny uniform digital ticks.
      } satisfies Contour;
    }
    return el;
  });
  if(seen.size!==CRAYON_F1_V38_HAIR_IDS.length||
     hairRegions.size!==3||hairBands<3||hairBands>18)
    throw new RangeError("Incomplete crown/left/right directional hair fibers");
  return out;
}
