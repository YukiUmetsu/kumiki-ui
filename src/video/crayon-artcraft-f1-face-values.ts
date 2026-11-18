import type {CrayonElement} from "../../registry/video/materials/crayon-scene";

type Wax=Extract<CrayonElement,{kind:"wax"}>;

/** F1 V28: real source-observed 5-region skin value study, opt-in only.
 * Native wax underpainting on the existing named human anatomical surface.
 * Based on Christopher Campbell CC0 original (608x1082), calibrated against
 * V27 native f299. No pixels from the source are embedded in render output.
 * This is a portrait *study*, not approved photorealistic likeness.
 */
export const CRAYON_F1_V28_SOURCE_VALUE_SAMPLES=Object.freeze({
  sourceSha256:"f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2",
  illuminatedCheek:{point:[180,643],source:[233,195,171],v26:[216,177,156]},
  nearMalarTurn:{point:[140,697],source:[141,94,75],v26:[192,151,135]},
  farCheek:{point:[459,687],source:[149,105,107],v26:[187,150,138]},
  nearEyeOrbit:{point:[245,508],source:[140,106,102],v26:[181,146,142]},
  farEyeOrbit:{point:[427,486],source:[108,82,80],v26:[177,140,135]},
} as const);
/** The existing skin silhouette, forehead, chin, eyes, nose, lips and
 * 300-frame animation are *not* reauthored here. Correct only light
 * directions inside five observed anatomical value planes.
 */
const patches:Readonly<Record<string,Partial<Wax>>> ={
  "cheek-malar-cast":{
    // Lateral cheek turns toward zygomatic underplane at x140,y697.
    // Native deep wax mass softly ends inside the unmodified face outline.
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:10.5,
    colors:["#8f5c54","#5d3c39","#cf9d8c"],
    pressure:.83,spacing:7.3,markStrength:.26,angle:48,
    markLength:"short",strokeOrder:"patches",
    underpaintTooth:.17,opaqueBurnish:.74,
    underpaintGradient:{light:"#c38b78",shadow:"#613e3b",
      focusX:.69,focusY:.31,radius:1.05},
    outlineOpacity:0,edgeRoughness:.17,
  },
  "cheek-malar-bounce":{
    // A separate lit high plane, not another dense dark stroke.
    // Source near cheek x180,y643 is ~18 RGB brighter than V26.
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:13.8,
    colors:["#f9d4ba","#d6a294","#ffead0"],
    pressure:.77,spacing:8.3,markStrength:.32,angle:-23,
    markLength:"short",strokeOrder:"patches",
    outlineOpacity:0,edgeRoughness:.13,
  },
  "cheek-far":{
    // Far cheek disappears behind hair; cool muted occlusion,
    // not the same warm bounce repeated on the far plane.
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:10.5,
    colors:["#8c6768","#574045","#ac8180"],
    pressure:.79,spacing:7.3,markStrength:.23,angle:69,
    markLength:"short",strokeOrder:"patches",
    underpaintTooth:.14,opaqueBurnish:.69,
    underpaintGradient:{light:"#bb9693",shadow:"#65464b",
      focusX:.3,focusY:.23,radius:1.07},
    outlineOpacity:0,edgeRoughness:.15,
  },
  "socket-near":{
    // Receding eye socket is broad but follows its actual
    // non-elliptical orbital fat and brow anatomy path, unchanged.
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:11.3,
    colors:["#815b60","#493c48","#ba928b"],
    pressure:.76,spacing:6.8,markStrength:.25,angle:19,
    markLength:"short",strokeOrder:"patches",
    underpaintTooth:.14,opaqueBurnish:.48,
    underpaintGradient:{light:"#bd9993",shadow:"#554347",
      focusX:.42,focusY:.28,radius:1.1},
    outlineOpacity:0,edgeRoughness:.15,
  },
  "socket-far":{
    // The source far orbit is ~70 RGB darker than the prior
    // wax. Place receding native tone underneath existing lids.
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:10.0,
    colors:["#6b4e55","#382c36","#ac8686"],
    pressure:.80,spacing:6.4,markStrength:.24,angle:43,
    markLength:"short",strokeOrder:"patches",
    underpaintTooth:.15,opaqueBurnish:.69,
    underpaintGradient:{light:"#af8c89",shadow:"#4b363c",
      focusX:.28,focusY:.26,radius:1.0},
    outlineOpacity:0,edgeRoughness:.14,
  },
};
export const CRAYON_F1_V28_PLANES=Object.freeze(Object.keys(patches));
/** Reversible measured facial value transform. In-place library nodes are
 * forbidden; reuse existing native paper/tooth and no source raster data.
 */
export function crayonF1CalibrateFacialValues(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const found=new Set<string>();
  const out=elements.map(el=>{
    if(!Object.prototype.hasOwnProperty.call(patches,el.id))return el;
    if(el.kind!=="wax"||found.has(el.id))
      throw new RangeError("Invalid/duplicate source value plane "+el.id);
    found.add(el.id);
    if(el.id==="socket-far"&&el.coverage==="opaque"&&el.featherContacts===true)
      throw new RangeError("F1 measured source values already built");
    return {...el,...patches[el.id]};
  });
  if(found.size!==CRAYON_F1_V28_PLANES.length)
    throw new RangeError("Incomplete source-observed facial values");
  return out;
}
