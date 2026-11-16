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
export function riso47PalmContour(actor:Riso47Actor,side:Riso47Side):string{
  const hand=side==="right"?1:-1;
  const artist=actor==="paper-artist";
  const x=(v:number)=>Number((v*hand).toFixed(2));
  const n=(v:number)=>Number(v.toFixed(2));
  // Artist has a softer heel and rounder index saddle; Courier's contours
  // are tenser and slightly more angular. Source identity is preserved.
  const radial=artist?0.43:0.05,heel=artist?0.55:0.18,knuckle=artist?0.36:0.12;
  const c=(a:number,b:number)=>`${x(a)} ${n(b)}`;
  return [
    // RISO50 primary positive silhouette, same original named RED glove.
    // The three-quarter palm tapers into a REAL wrist and carries a
    // dissimilar, proximal-to-distal staggered MCP crest. Unlike the
    // previous 20-unit balloon, the ulnar heel cuts inward before turning
    // into three independent source RED finger bases.
    `M${c(5.12,-2.25)}`,
    `C${c(7.10,-2.84)} ${c(8.14+radial,-1.18)} ${c(7.86+radial,1.18)}`,
    `C${c(7.62+radial,3.33)} ${c(8.96+radial,5.09)} ${c(9.17+radial,7.58)}`,
    `C${c(10.23+radial,9.27)} ${c(10.68,10.68)} ${c(9.08,12.40)}`,
    `C${c(10.45+radial,14.19)} ${c(11.13,15.87)} ${c(9.86,17.27)}`,
    `C${c(9.28,18.24)} ${c(8.21,18.63)} ${c(7.21,17.98)}`,
    // First MCP is a rolled radial eminence, not one continuous smile
    // connecting all knuckle pits; the interdigit valleys are real
    // changes of positive red silhouette, not shallow screen overlays.
    `C${c(6.33,18.92)} ${c(5.72,20.31+knuckle)} ${c(4.21,19.02)}`,
    `C${c(2.79,20.41+knuckle)} ${c(.65,21.17)} ${c(-.54,19.38)}`,
    `C${c(-2.09,20.42+knuckle)} ${c(-4.16,19.91)} ${c(-5.16,18.32)}`,
    `C${c(-6.37,19.39)} ${c(-8.22-heel,18.12)} ${c(-8.78-heel,16.23)}`,
    // The ulnar carpal transition is a flatter, bony change of plane
    // at the pisiform, while the thenar side stays continuously rounded.
    `C${c(-9.20-heel,14.42)} ${c(-8.64,12.31)} ${c(-7.66,10.34)}`,
    `C${c(-8.88-heel,8.72)} ${c(-8.94-heel,6.58)} ${c(-8.19,4.44)}`,
    `C${c(-8.73-heel,2.39)} ${c(-8.14,1.00)} ${c(-6.58,-.74)}`,
    `C${c(-5.68,-1.48)} ${c(-4.93,-1.02)} ${c(-4.10,-1.66)}`,
    `C${c(-2.66,-2.15)} ${c(-1.50,-2.12)} ${c(-.46,-1.99)}`,
    `C${c(.89,-2.13)} ${c(2.20,-2.53)} ${c(3.43,-2.10)}`,
    `C${c(4.14,-2.03)} ${c(4.74,-2.13)} ${c(5.12,-2.25)} Z`,
  ].join(" ");
}
