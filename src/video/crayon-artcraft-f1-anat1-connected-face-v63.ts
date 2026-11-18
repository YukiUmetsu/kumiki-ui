import type {CrayonColor,CrayonElement} from "../../registry/video/materials/crayon-scene";
import {CRAYON_PORTRAIT_AUDIT} from "./crayon-artcraft-portrait-audit";

type PlanePatch=Readonly<{
  colors:readonly [CrayonColor,CrayonColor,CrayonColor];
  pressure:number;
  markStrength:number;
}>;

/**
 * V63: source-calibrated value balance over the unchanged V57 geometry baseline (still experimental, not approved).
 * The five connected planes are orbital, malar highlight, lateral undercheek,
 * nasal bridge/alar, and mandibular roll. Existing Bezier boundaries, wax
 * marks, paper tooth, timing, hair flow and all 300 frames remain untouched.
 */
const patches:Readonly<Record<string,PlanePatch>>=Object.freeze({
  // Orbital cast: source median 141/94/80; V57 median 179/148/135.
  "lower-lid-near":Object.freeze({
    colors:["#85595b","#4f363e","#b77e79"] as const,
    pressure:.58,markStrength:.30,
  }),
  // Lateral undercheek: source median 123/85/67; V57 median 173/141/126.
  "cheek-malar-cast":Object.freeze({
    colors:["#81554f","#4b3338","#a8756a"] as const,
    pressure:.70,markStrength:.32,
  }),
  // Malar light return: source median 237/206/186; V57 median 224/189/170.
  "cheek-malar-bounce":Object.freeze({
    colors:["#f7d9bf","#d7b4a8","#fff0d9"] as const,
    pressure:.63,markStrength:.22,
  }),
  // Nasal root: source median 124/95/90; V57 median 180/151/139.
  "nose-root":Object.freeze({
    colors:["#8f686b","#5b4550","#b78f89"] as const,
    pressure:.48,markStrength:.20,
  }),
  // Nasal ridge return: source median 226/192/174; V57 median 203/168/152.
  "nose-dorsum":Object.freeze({
    colors:["#f3d3bd","#c5a096","#ffe9d3"] as const,
    pressure:.42,markStrength:.22,
  }),
  "nose-sidewall-form":Object.freeze({
    colors:["#b88b82","#8b6b70","#d5a99c"] as const,
    pressure:.52,markStrength:.21,
  }),
  // Mandibular roll: source median 177/133/108; V57 median 191/158/142.
  "jaw-underside":Object.freeze({
    colors:["#927068","#5c4650","#b58d7e"] as const,
    pressure:.38,markStrength:.17,
  }),
});

export const CRAYON_F1_V63_PATCH_IDS=Object.freeze(Object.keys(patches));
export const CRAYON_F1_V63_WITNESSES=Object.freeze([
  {id:"infraorbital-cast",at:[255,583],sourceRgb:[141,94,80],v57Rgb:[179,148,135]},
  {id:"lateral-undercheek",at:[133,702],sourceRgb:[123,85,67],v57Rgb:[173,141,126]},
  {id:"nasal-root",at:[333,533],sourceRgb:[124,95,90],v57Rgb:[180,151,139]},
  {id:"malar-light-return",at:[175,615],sourceRgb:[237,206,186],v57Rgb:[224,189,170]},
  {id:"nasal-ridge-return",at:[367,595],sourceRgb:[226,192,174],v57Rgb:[203,168,152]},
  {id:"mandibular-roll",at:[261,830],sourceRgb:[177,133,108],v57Rgb:[191,158,142]},
] as const);

/** Retune pigment only; preserve the source-registered geometry verbatim. */
export function crayonF1ConnectedFacePlanesV63(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  if(CRAYON_PORTRAIT_AUDIT.source.sha256!==
    "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2")
    throw new RangeError("V63 original CC0 source benchmark changed");
  const byId=new Map<string,CrayonElement>();
  for(const element of elements){
    if(byId.has(element.id))throw new RangeError("V63 duplicate source wax ID: "+element.id);
    byId.set(element.id,element);
  }
  const face=byId.get("face-outline");
  if(face?.kind!=="wax"||face.underpaintFields?.length!==12)
    throw new RangeError("V63 requires the unchanged V52 twelve-field face underpaint");
  for(const id of Object.keys(patches)){
    if(byId.get(id)?.kind!=="wax")
      throw new RangeError("V63 missing connected source face plane: "+id);
  }
  return elements.map(element=>{
    const patch=patches[element.id];
    if(!patch)return element;
    if(element.kind!=="wax")throw new RangeError("V63 plane is not wax: "+element.id);
    return {...element,colors:patch.colors,pressure:patch.pressure,
      markStrength:patch.markStrength};
  });
}
