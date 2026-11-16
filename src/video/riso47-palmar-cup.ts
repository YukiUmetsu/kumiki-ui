import {riso57PositivePalmContour} from "./riso57-palm-contact-silhouette";
/**
 * RISO47 ArtCraft — redraw the PRIMARY positive printed palm silhouette.
 *
 * The former palm was a near-rectangular mitt; tiny added grooves could not
 * repair the flat anatomy at native 1x. Build a genuine metacarpal/thenar
 * positive stencil on the original hand joint, with a sloped wrist, a
 * different-length four-knuckle silhouette, a radial thumb buttress and an
 * asymmetric ulnar heel. Both authors and handedness have distinct control
 * points; all prior small original RISO30/RISO37/RISO46 etched parts remain.
 *
 * This source only draws an editorial 2D plate. ANAT1 controls *where* the
 * fingertips actually move; original 2-color ink and paper own the material.
 * No photo likeness, 3D inference, overlay or third color is claimed.
 */
export type Riso47Actor="courier"|"paper-artist";
export type Riso47Side="left"|"right";
export const RISO47_PALM_RECONSTRUCTION={
  source:"Proko Hand Muscle Anatomy and Kumiki ANAT1 existing MCP joints",
  silhouette:"wrist-to-thenar-to-four-unequal-MCP-crest-to-ulnar-heel",
  oldContour:"single broad, nearly equal-sided mitten body",
  medium:"one closed positive red Risograph print master, original two-ink layering",
} as const;

/** RISO50 original source continuation: angled three-quarter carpal cup,
 * differentiated flesh volumes and sixteen articulated Bézier transitions.
 * Source-control tests must retain every RISO47 and RISO46 engraved mark.
 */
export const RISO50_PALM_CRAFT={
  mainRedMaster:"positive-ink only" as const,
  clinicalAnchors:["thenar","hypothenar","pisiform","index MCP","ulnar MCP"] as const,
  authoredCubicCount:16,
  source:"Proko palmar muscle-group construction & observed f160 native hand image",
  noPhotoTrace:true,
} as const;
/**
 * Compatibility entrypoint of the ORIGINAL red-glove source contract.
 * RISO57 reconstructs its positive contour with independent observed
 * ANAT1 carpal/thenar/ulnar landmarks rather than retaining the former
 * 16-cubic round mitten. All original RISO30–56 micro-engraved actors,
 * known IDs, ink masters and rig transforms remain unchanged.
 */
export function riso47PalmContour(actor:Riso47Actor,side:Riso47Side):string{
  return riso57PositivePalmContour(actor,side);
}
