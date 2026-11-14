import type { ReactNode } from "react";
import { evaluateRisoCharacter } from "./riso-character";
import type { RisoCharacterSpec } from "./riso-character";
import type { RisoPaint } from "./print-plates-react";

export interface RisoCharacterInkProps {
  spec: RisoCharacterSpec;
  /** The only clock: absolute source-film frame. */
  frame: number;
  plateId: string;
  paint: RisoPaint;
  /** Host-provided stage placement. No untrusted markup injection. */
  x?: number;
  y?: number;
  scale?: number;
  reducedMotion?: boolean;
  children?: ReactNode;
}
/** Plate-local character parts. Render this inside the corresponding RisoPrint artwork callback. */
export function RisoCharacterInk({
  spec, frame, plateId, paint, x = 0, y = 0, scale = 1,
  reducedMotion = false, children,
}: RisoCharacterInkProps) {
  if (![x, y, scale].every(Number.isFinite) || scale <= 0 || scale > 30 ||
      Math.abs(x) > 20000 || Math.abs(y) > 20000)
    throw new RangeError("RISO2 character placement requires finite bounded coordinates.");
  const evaluated = evaluateRisoCharacter(spec, frame, { reducedMotion });
  if (!spec.parts.some(p => p.plate === plateId))
    throw new RangeError("RISO2 character has no authored ink for plate " + plateId);
  return <g data-km-riso-character={spec.id} data-km-riso-expression={evaluated.expression}
      data-km-riso-sampled-frame={evaluated.sampledFrame}
      transform={`translate(${x} ${y}) scale(${scale})`}>
    {evaluated.parts.filter(part => part.plate === plateId).map(part =>
      <path key={part.id} data-km-riso-part={part.id} d={part.d}
        transform={part.transform} fill={part.paint === "screen" ? paint.dots : paint.solid}
        opacity={part.opacity} />)}
    {children}
  </g>;
}
