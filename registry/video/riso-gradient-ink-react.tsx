import {useId,useMemo} from "react";
import type {SVGProps} from "react";
import {
  createRisoGradientGeometry,risoGradientDotPath,
} from "./riso-gradient-ink";
import type {RisoGradientOptions} from "./riso-gradient-ink";

export interface RisoGradientInkProps extends RisoGradientOptions,
  Omit<SVGProps<SVGGElement>,"children"|"color"> {
  /** The current RisoPrint plate's paint.solid. Never pass an RGB blend. */
  color:string;
  /** Optional original vector contour; clip only, do not rasterize or erase it. */
  shape?:string;
}

/**
 * A single real-ink tonal master. Place inside a RisoPrint artwork callback:
 * blue: paint => <RisoGradientInk ... color={paint.solid} ... />
 *
 * Existing RisoPrint still owns paper fibres, ink tooth, plate registration,
 * the separate print-pass clock, knockout and multiply overprint. This only
 * generates continuously varying dot *radii* at sheet-fixed AM grid sites.
 */
export function RisoGradientInk({
  color,shape,x,y,width,height,cell,angle,seed,plateIndex,direction,stops,
  dotGain=0,irregularity=.35,dropout=0,
  ...groupProps
}:RisoGradientInkProps){
  if(!/^#[0-9a-f]{6}$/i.test(color))
    throw new RangeError("RISO61 requires the actual six-digit spot-ink color");
  if(shape!==undefined&&(
    typeof shape!=="string"||shape.length>20000||
    !/^[\s,\d.+\-eEMmLlHhVvCcSsQqTtAaZz]+$/.test(shape)||
    !/[Mm]/.test(shape)))
    throw new RangeError("RISO61 requires a finite SVG source contour; no markup/URLs/filters");
  const geometry=useMemo(()=>createRisoGradientGeometry({
    x,y,width,height,cell,angle,seed,plateIndex,direction,stops,
    dotGain,irregularity,dropout,
  }),[x,y,width,height,cell,angle,seed,plateIndex,direction,stops,
    dotGain,irregularity,dropout]);
  const dotPath=useMemo(()=>risoGradientDotPath(geometry.dots),[geometry]);
  const id="riso61"+useId().replace(/[^a-zA-Z0-9_-]/g,"");
  return <g {...groupProps}
    data-km-riso-gradient-ink={direction}
    data-km-riso-gradient-sites={geometry.siteCount}
    data-km-riso-gradient-dots={geometry.dots.length}
    data-km-riso-gradient-plate={plateIndex}
    data-km-riso-gradient-angle={angle}
    data-km-riso-gradient-ink-area={geometry.nominalInkArea}>
    <defs>
      <clipPath id={id+"-rect"} clipPathUnits="userSpaceOnUse">
        <rect x={x} y={y} width={width} height={height}/>
      </clipPath>
      {shape&&<clipPath id={id+"-shape"} clipPathUnits="userSpaceOnUse">
        <path d={shape}/>
      </clipPath>}
    </defs>
    <g clipPath={"url(#"+id+"-rect)"}>
      <g clipPath={shape?"url(#"+id+"-shape)":undefined}>
        <path data-km-riso-gradient-source-path="" d={dotPath}
          fill={color} stroke="none" fillRule="nonzero"/>
      </g>
    </g>
  </g>;
}
