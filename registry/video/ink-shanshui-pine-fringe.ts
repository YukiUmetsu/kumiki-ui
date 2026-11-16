/**
 * Huang Gongwang / Fuchun source study: short loaded pine-tip flicks.
 *
 * A fan is built out of REAL upper-lobe crest points authored in the grove.
 * Every fine fibre begins exactly at an existing positive silhouette point.
 * Its axial direction is a seeded, non-repeating brush gesture, including
 * opposing dry/descending tips. The shape isn't a canned Christmas-tree
 * triangle or freestanding texture noise; the painter supplies the actual
 * pressure ribbon using these geometric controls.
 *
 * Technique references: National Palace Museum, Dwelling in the Fuchun
 * Mountains (Master Wuyong Scroll); Smarthistory detail 3.
 */
import {shanshuiHash} from "./ink-shanshui";

export type InkPinePoint=readonly [number,number];
export interface InkPineFibre {
  readonly root:InkPinePoint;
  readonly control:InkPinePoint;
  readonly tip:InkPinePoint;
  readonly width:number;
  readonly tone:"wet"|"midtone"|"dry";
  /** The exact upper fan lobe from which this brush stroke grows. */
  readonly lobe:number;
}
const finite=(p:InkPinePoint)=>Number.isFinite(p[0])&&Number.isFinite(p[1]);

/** Returns one short loaded brush bristle per source-contour crest. */
export function fuchunPineFibreFringe(
  peaks:readonly InkPinePoint[],sweep:number,seed:number,
):readonly InkPineFibre[]{
  if(peaks.length<3||peaks.length>24||sweep!==1&&sweep!==-1||
    !Number.isSafeInteger(seed)||seed<0||seed>2147483647||
    !peaks.every(finite))
    throw new RangeError("Fuchun pine fringe requires 3..24 finite source lobes, direction and seed");
  const roles=[
    {along:.82,lift:.98},
    {along:1.21,lift:.25},
    {along:-.27,lift:1.12},
    {along:.45,lift:-.31},
    {along:1.36,lift:.71},
    {along:-.12,lift:.45},
  ] as const;
  return peaks.map((root,lobe)=>{
    const variance=shanshuiHash(seed,lobe*59+7);
    const role=roles[Math.floor(shanshuiHash(seed+11,lobe*83+13)*roles.length)];
    const length=1.5+3.25*variance;
    const dx=sweep*length*role.along;
    const dy=-length*role.lift*(.87+
      .27*shanshuiHash(seed+23,lobe*31+17));
    const control:InkPinePoint=[
      root[0]+dx*(.29+.19*shanshuiHash(seed+37,lobe*41+19)),
      root[1]+dy*.44- .38*shanshuiHash(seed+43,lobe*19+23),
    ];
    const tip:InkPinePoint=[root[0]+dx,root[1]+dy];
    const load=shanshuiHash(seed+53,lobe*47+29);
    return {root,control,tip,lobe,
      width:.21+.41*load,
      tone:load<.24?"dry":load<.53?"midtone":"wet"};
  });
}
