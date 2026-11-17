import type {SVGProps} from "react";
import {createRisoBrushGeometry,risoBrushInkPath}
  from "./riso-dry-brush";
import type {RisoBrushOptions} from "./riso-dry-brush";

export interface RisoDryBrushInkProps extends RisoBrushOptions,
  Omit<SVGProps<SVGGElement>,keyof RisoBrushOptions|"children"|"color"> {
  /** Exactly the active physical plate ink color (e.g. paint.solid). */
  color:string;
}
/** A single continuous original-pressure ink master, not an SVG mask or an
 * opacity/filter overlay. Use inside one RisoPrint artworks[plate] callback.
 * Paper-white dry-fibre slots are true evenodd unprinted regions. */
export function RisoDryBrushInk({
  start,control1,control2,end,width,pressure,dryness,seed,steps,color,
  ...groupProps
}:RisoDryBrushInkProps){
  if(!/^#[0-9a-f]{6}$/i.test(color))
    throw new RangeError("RISO62 dry brush needs a six-digit physical spot ink");
  // Authored cubic points are rebuilt per film frame, so useMemo on each
  // transient point object cannot cache geometry. Pure evaluation avoids
  // duplicate React dispatcher hazards in native lazy-loaded capture pages.
  const geometry=createRisoBrushGeometry({
    start,control1,control2,end,width,pressure,dryness,seed,steps,
  });
  return <g {...groupProps} data-km-riso62-brush=""
    data-km-riso62-fibres={geometry.count}
    data-km-riso62-ink-seed={seed}>
    <path data-km-riso62-source-path="" d={risoBrushInkPath(geometry)}
      fill={color} stroke="none" fillRule="evenodd"/>
  </g>;
}
