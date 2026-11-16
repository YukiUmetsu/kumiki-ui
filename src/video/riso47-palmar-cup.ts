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

export function riso47PalmContour(actor:Riso47Actor,side:Riso47Side):string{
  const hand=side==="right"?1:-1;
  const artist=actor==="paper-artist";
  const x=(v:number)=>Number((v*hand).toFixed(2));
  const n=(v:number)=>Number(v.toFixed(2));
  // Artist has a softer heel and rounder index saddle; Courier's contours
  // are tenser and slightly more angular. Source identity is preserved.
  const radial=artist?.43:.05,heel=artist?.55:.18,knuckle=artist?.36:.12;
  const c=(a:number,b:number)=>`${x(a)} ${n(b)}`;
  return [
    `M${c(6.4,-2.21)}`,
    `C${c(8.12,-2.9)} ${c(9.46+radial,-1.11)} ${c(9.64+radial,1.16)}`,
    `C${c(10.67+radial,3.45)} ${c(9.9,6.25)} ${c(9.92,8.44)}`,
    `C${c(11.07,10.06)} ${c(10.04,12.36)} ${c(10.45,14.16)}`,
    `C${c(11.13,16.47)} ${c(10.01,18.02)} ${c(8.32,18.15)}`,
    // Four unequal positive knuckle shoulders and shallow inter-digit
    // valleys. Finger *bones* and their own red/cobalt plates are separate.
    `C${c(7.69,19.55)} ${c(6.22,20.19+knuckle)} ${c(4.78,19.33)}`,
    `C${c(3.06,20.53+knuckle)} ${c(1.04,21.16)} ${c(-.65,19.96)}`,
    `C${c(-2.18,20.49)} ${c(-4.43,20.24+knuckle)} ${c(-5.36,18.87)}`,
    `C${c(-7.29,19.66)} ${c(-8.85,18.44+heel)} ${c(-9.15,16.45)}`,
    `C${c(-10.99-heel,14.63)} ${c(-10.02,11.91)} ${c(-9.49,9.84)}`,
    `C${c(-10.66-heel,7.37)} ${c(-10.28,4.04)} ${c(-9.18,2.0)}`,
    `C${c(-9.82,-.63)} ${c(-8.02,-2.78)} ${c(-6.27,-2.36)}`,
    `C${c(-3.68,-2.73)} ${c(-2.31,-1.97)} ${c(-.86,-2.22)}`,
    `C${c(1.22,-2.71)} ${c(3.37,-1.83)} ${c(4.66,-2.31)}`,
    `C${c(5.34,-2.43)} ${c(5.84,-2.42)} ${c(6.4,-2.21)} Z`,
  ].join(" ");
}
