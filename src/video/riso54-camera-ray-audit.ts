import type {RisoCharacterSpec} from "../../registry/video/riso-character";
import {riso31Inspect} from "./riso31-finger-phalanges";

/** RISO54 — clinical ANAT1 bone length and actual camera-space source axis
 * are different quantities. A finger viewed nearly end-on keeps its true
 * 3D segment length, but the 2D print occupies only L*cos(viewAngle).
 *
 * Earlier physical test shots RISO49–53 still showed 3 external red rakes.
 * ~.6 visible 2D ratios at the PIP and DIP retained too much unsupported
 * source length outside the metacarpal silhouette. RISO54 constructs a
 * deliberately oblique finger pose (editorial ~66° from picture plane).
 * This is a source view projection, not claimed measured camera or clinical
 * diagnostic. The original character ANAT1 joints are unchanged in count,
 * angular clinical ranges, naming, and canonical RISO31_GEOMETRY.
 */
export const RISO54_RAY_PROJECTION={
  contactFrame:160,
  smallest2DTo3DBoneRatio:.385,
  largest2DTo3DBoneRatio:.46,
  estimatedSourceRayDegrees:[62,68] as const,
  minVisibleSupportFingerCount:3,
  source:"ANAT1 anatomical full bone lengths + genuine 2D lateral pinch projection",
  medium:"original red articulated silhouettes / cobalt nail and crease printed in real two-spot Risograph",
  limits:"editorial 2D camera construction; not photogrammetric calibration",
} as const;
export type Riso54SourceActor="courier"|"paper-artist";

const projectedSide=(actor:Riso54SourceActor):"right"|"left"=>
  actor==="courier"?"right":"left";
export function inspectRiso54SourceRay(spec:RisoCharacterSpec,frame:number){
  if(spec.id!=="courier"&&spec.id!=="paper-artist")
    throw new RangeError("RISO54 needs one original named human actor");
  const side=projectedSide(spec.id as Riso54SourceActor);
  const segments=riso31Inspect(spec,frame,side)
    .filter(x=>x.digit!=="index")
    .flatMap(x=>[
      {digit:x.digit,stage:"pip" as const,length2D:x.rootLength,
        length3D:x.expectedProximal},
      {digit:x.digit,stage:"dip" as const,length2D:x.intermediateLength,
        length3D:x.expectedIntermediate},
    ])
    .map(s=>{
      const ratio=s.length2D/s.length3D;
      return {...s,ratio,estimatedRayDeg:Math.acos(Math.max(-1,Math.min(1,ratio)))*180/Math.PI};
    });
  return {
    actor:spec.id,frame,side,segments,
    originalClinical3DBoneSegments:segments.length,
    ratioMean:segments.reduce((v,s)=>v+s.ratio,0)/segments.length,
    ratioMin:Math.min(...segments.map(s=>s.ratio)),
    ratioMax:Math.max(...segments.map(s=>s.ratio)),
    estimatedIncidenceMeanDegrees:segments.reduce((v,s)=>v+s.estimatedRayDeg,0)/segments.length,
  };
}
