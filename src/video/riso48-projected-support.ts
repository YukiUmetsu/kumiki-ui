import type {RisoJoint} from "../../registry/video/riso-character";

/**
 * RISO48 ArtCraft: original editorial side-cup at RECEIVER hand only.
 *
 * The f160 source art showed three long side-on rake digits. Curling their
 * MCPs harder violated original index/middle white space, so we preserve
 * the clinically bounded RISO45 angles and shorten only the projected
 * PIP/DIP pivot stations in the existing living bone rig. The *original*
 * anatomical lengths remain documented in RISO31_GEOMETRY; view-space
 * compression approximates foreshortening, never shortening actual fingers.
 *
 * All SVG paths, nails, creases and RED/BLUE masters are untouched; their
 * animated transforms carry the actual original index/thumb paper contact.
 * This is not calibrated to a 3/4 photograph; the draft visual gate remains.
 */
export const RISO48_RECEIVER_PROJECTION={
  actor:"paper-artist",
  side:"left",
  contactFrame:160,
  source:"Proko hand-muscle construction and Kumiki ANAT1 original 3-bone hand",
  // World 2D projected foreshortening in source units, relative to the
  // original hidden 3D bone length. Earlier contact must interpolate.
  // RISO54: side-facing phalanges are almost aligned with the camera ray.
  // Preserve each TRUE ANAT1 bone length in RISO31_GEOMETRY, while 2D print
  // stations show ~40–45% of that length at physical paper contact.
  // Estimated foreshortening angle acos(.40)≈66°, not a shortened bone.
  middle:{pip:-4.988,dip:-4.020},
  ring:{pip:-4.234,dip:-3.481},
  pinky:{pip:-3.080,dip:-2.508},
  minimumVisibleBoneRatio:.39,
  maximumCompressionRatio:.61,
  verification:"independent exact render and 2-frame no-collisions required",
} as const;

const digits=["middle","ring","pinky"] as const;
type Digit=typeof digits[number];
type Stage="pip"|"dip";
export function riso48ProjectedPivot(j:RisoJoint):RisoJoint|null{
  const found=/^left-(middle|ring|pinky)-(pip|dip)$/.exec(j.id);
  if(!found)return null;
  const digit=found[1] as Digit,stage=found[2] as Stage;
  const delta=RISO48_RECEIVER_PROJECTION[digit][stage];
  return {...j,keys:j.keys?.map(k=>{
    // Already-canonical source keys, with *only* camera-space station
    // projection. The original angle, X, easing and true ink never change.
    const amount=k.frame<146?0:k.frame<160?0:
      k.frame<=186?1:k.frame<205?0.86:0.74;
    return {...k,y:(k.y??0)+delta*amount};
  })};
}
