import type {RisoJoint} from "../../registry/video/riso-character";

/**
 * RISO49 — original Courier donor RIGHT-hand supporting fingers in
 * an editorial three-quarter projected pinch. Real sample photography
 * shows the unopposed middle/ring/little digits TURNING UNDER the sheet,
 * so their 2D projected length differs from anatomical bone length.
 *
 * Only original joint-source y stations change. All original hand anatomy,
 * red moving phalanges, blue nails / creases, 24fps key timing, two plates
 * and index-over / thumb-under paper order remain untouched. No sprites,
 * raster textures, added stamps or false photographed likeness.
 */
export const RISO49_DONOR_PROJECTION={
  actor:"courier" as const,side:"right" as const,contactFrame:160,
  source:"original thumb-index paper pinch and anatomy reference photo; ANAT1 source bones",
  middle:{pip:-1.8,dip:-1.7},
  ring:{pip:-1.95,dip:-1.55},
  pinky:{pip:-1.65,dip:-1.35},
  minimumVisibleBoneRatio:.56,
  reference:"CMU's Hand Holding Papers photograph; Proko real-hand anatomy",
  quality:"source-candidate: no photo-aligned landmark approval" as const,
} as const;
type Digit="middle"|"ring"|"pinky";
type Stage="pip"|"dip";

/** Apply only on Courier donor's original right three support digits.
 * Rest untouched until the sheet approaches; attain foreshortening
 * at contact; smoothly unfold when the sheet transfers to recipient.
 */
export function riso49ProjectedDonorPivot(j:RisoJoint):RisoJoint|null{
  const m=/^right-(middle|ring|pinky)-(pip|dip)$/.exec(j.id);
  if(!m)return null;
  const digit=m[1] as Digit,stage=m[2] as Stage;
  const delta=RISO49_DONOR_PROJECTION[digit][stage];
  return {...j,keys:j.keys?.map(k=>{
    const amount=k.frame<160?0:k.frame<=178?1:k.frame<205?0.72:0;
    return {...k,y:(k.y??0)+delta*amount};
  })};
}
