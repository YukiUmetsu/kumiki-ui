import type {CrayonElement} from "../../registry/video/materials/crayon-scene";

/**
 * ArtCraft F1 V44: source-measured, connected ANAT1 facial *value* field.
 *
 * On the licensed Christopher Campbell CC0 source 608×1082, the V43
 * forehead-to-cheek transition is too light/flat under the orbital rim,
 * at the zygomatic side and around the nose. Every original source
 * cubic path, face silhouette, ANAT1 optical landmark, individual eyelash,
 * brow, iris, hair, full 300-frame animation, paper and wax undercoat
 * is deliberately retained. Only five existing native source-anchored
 * physical wax material contacts receive a source-informed pigment
 * calibration; this is NOT a painted photo overlay or posterization.
 *
 * Pixel values below: median 7×7 source RGB vs exact native V43 f299.
 * These are calibration targets, not a release approval.
 */
type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Id="socket-near"|"cheek-malar-cast"|"cheek-malar-bounce"|
  "nose-root"|"chin-plane";
export const CRAYON_F1_V44_SOURCE_SHA=
  "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2";
export const CRAYON_F1_V44_PHOTO_VALUE_SAMPLES=Object.freeze({
  nearOrbit:{xy:[254,514],source:[121,89,87],nativeV43:[170,136,132]},
  infraorbital:{xy:[255,585],source:[162,118,105],nativeV43:[193,159,146]},
  cheekBounce:{xy:[180,620],source:[240,208,189],nativeV43:[221,184,165]},
  cheekUnderturn:{xy:[133,721],source:[115,78,64],nativeV43:[200,163,146]},
  malarJaw:{xy:[170,794],source:[114,80,65],nativeV43:[194,158,143]},
  nasalRoot:{xy:[350,532],source:[163,126,108],nativeV43:[200,167,153]},
  chin:{xy:[323,811],source:[176,138,117],nativeV43:[199,164,148]},
  eyeCenter:{xy:[260,550],protected:true},
  reviewApproved:false,
} as const);

const pigment:Readonly<Record<Id,Partial<Wax>>>={
  "socket-near":{
    // Oblique supraorbital under-plane, NEVER a flat black eye-hole;
    // preserve red/grey underpainting and source lid geometry.
    colors:["#795954","#453337","#a77e78"],
    pressure:.76,spacing:6.3,markStrength:.31,blendRadius:13,
    featherContacts:true,
  },
  "cheek-malar-cast":{
    // Source at x133,721 is ~85 RGB darker than V43.
    // Multiple dark open dry-wax contacts, feathered into the existing
    // connected zygomatic shape, not an opaque sticker.
    colors:["#785049","#3e2b2b","#a37c6a"],
    pressure:.78,spacing:6.5,markStrength:.38,blendRadius:13,
    featherContacts:true,
  },
  "cheek-malar-bounce":{
    // Higher-lit cheekbone y620 stays structurally connected to the
    // infraorbital, with small pale wax contact, not an added ellipse.
    colors:["#ffdeca","#c6a095","#ffe9d5"],
    pressure:.55,spacing:7.1,markStrength:.22,blendRadius:15,
    featherContacts:true,
  },
  "nose-root":{
    // Medial nasal depth: lower value at x350,532 while leaving the
    // authentic ANAT1 measured dorsal ridge, eye and nostrils intact.
    colors:["#8d6960","#54403d","#b7907f"],
    pressure:.66,spacing:6.8,markStrength:.32,blendRadius:13,
    featherContacts:true,
  },
  "chin-plane":{
    // Light under lower lip must roll toward the shadow, not occupy
    // an entirely pale flat strip over the lower mandibular form.
    colors:["#ba8d7e","#735b57","#d6aa95"],
    pressure:.43,spacing:8.7,markStrength:.20,blendRadius:11,
    featherContacts:true,
  },
};
export const CRAYON_F1_V44_FIVE_VALUE_IDS=Object.freeze(
  Object.keys(pigment) as Id[],
);

/** An opt-in physical wax re-inking of the existing five value surfaces.
 * Every polygon/path string and element order/parent/clip/timeline remains
 * deep-identical to V43. Unsupported input is rejected; V43 is never mutated.
 */
export function crayonF1CalibrateSourceSkinV44(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const seen=new Set<string>(),found=new Set<Id>();
  const out=elements.map(el=>{
    if(seen.has(el.id))throw new RangeError("Duplicated ANAT1 source ID "+el.id);
    seen.add(el.id);
    if(!Object.prototype.hasOwnProperty.call(pigment,el.id))return el;
    const id=el.id as Id;
    if(el.kind!=="wax"||el.parentId!=="face-outline"||
       el.clipToParent!==true||el.coverage!=="open"||
       !el.d.startsWith("M")||el.renderLayer==="backdrop"||
       !el.colors||el.colors.length!==3)
      throw new RangeError("Unregistered native facial tone "+id);
    found.add(id);
    return {...el,...pigment[id]} satisfies Wax;
  });
  if(found.size!==CRAYON_F1_V44_FIVE_VALUE_IDS.length||
     !seen.has("face-outline")||!seen.has("hair-crown-surface")||
     !seen.has("source-brow-follicles-near")||
     !seen.has("cc0-hedge-dark-underpaint"))
    throw new RangeError("Incomplete source ANAT1/photo wax environment");
  return out;
}
