import type { ReactNode, SVGProps } from "react";
import { evaluateSemanticTransfer } from "./semantic-direction";
import type { SemanticTransferSpec } from "./semantic-direction";
import type { Rect } from "./types";

export interface SemanticTransferSvgProps extends Omit<SVGProps<SVGGElement>, "children"> {
  /** All timing is driven by the same absolute frame clock as the film. */
  frame:number;
  transfer:SemanticTransferSpec;
  fromBounds:Rect;
  toBounds:Rect;
  color?:string;
  strokeWidth?:number;
  /** Render an identifiable object at the interpolated position. */
  children?:ReactNode;
}
/** Reusable SVG adapter for any content transfer: data, materials, state,
 * requests, citations etc. No idle connection, no second animation clock.
 * Consumers may supply a branded payload glyph as children.
 */
export function SemanticTransferSvg({
  frame,transfer,fromBounds,toBounds,color="currentColor",
  strokeWidth=2.5,children,...props
}:SemanticTransferSvgProps) {
  const state=evaluateSemanticTransfer(transfer,frame,fromBounds,toBounds);
  if(!state.visible)return null;
  const {from,to,position,progress,opacity}=state;
  return <g data-km-semantic-transfer={transfer.id}
    data-semantic-id={transfer.semanticId} opacity={opacity} {...props}>
    {transfer.intent!=="highlight"&&<path
      d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
      fill="none" stroke={color} strokeWidth={strokeWidth}
      strokeLinecap="round" pathLength={1}
      strokeDasharray={`${progress} 1`}/>}
    <g transform={`translate(${position.x} ${position.y})`}
      data-km-transfer-payload="">
      {children??<circle r={5} fill={color}/>}
    </g>
  </g>;
}
