import { useId } from "react";
import type { ReactNode } from "react";
import { evaluateRisoCharacter } from "./riso-character";
import type { RisoCharacterSpec, RisoPartFrame } from "./riso-character";
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
  /** Compare constrained IK against ordinary joint rotations in Storybook. */
  disableIK?: boolean;
  /** Diagnostic skeleton and foot-target markers; excluded from production by default. */
  showRig?: boolean;
  children?: ReactNode;
}
export interface RisoCharacterKnockoutProps {
  spec: RisoCharacterSpec;
  frame: number;
  x?: number;
  y?: number;
  scale?: number;
  reducedMotion?: boolean;
  disableIK?: boolean;
  /** Physical trapping expansion of the paper-shaped silhouette (stage units). */
  spread?: number;
}
function validPlacement(x: number, y: number, scale: number) {
  if (![x, y, scale].every(Number.isFinite) || scale <= 0 || scale > 30 ||
      Math.abs(x) > 20000 || Math.abs(y) > 20000)
    throw new RangeError("RISO character placement requires finite bounded coordinates.");
}
/**
 * Fully opaque paper clearance using the *union of all posed ink parts*.
 * Place this in RisoPrint.foregroundLayers[].knockout, which supplies paper
 * fill/stroke. Unlike character ink this SVG does not multiply over a backdrop.
 * Draw the union once, between background plate passes and subject plate passes.
 */
export function RisoCharacterKnockout({
  spec, frame, x = 0, y = 0, scale = 1, spread = 1.8,
  reducedMotion = false, disableIK = false,
}: RisoCharacterKnockoutProps) {
  validPlacement(x, y, scale);
  if (!Number.isFinite(spread) || spread < 0 || spread > 8)
    throw new RangeError("RISO character paper trapping spread must be 0..8.");
  const evaluated = evaluateRisoCharacter(spec, frame, {reducedMotion, disableIK});
  return <g data-km-riso-character-knockout={spec.id}
    data-km-riso-knockout-frame={evaluated.sampledFrame}
    transform={`translate(${x} ${y}) scale(${scale})`}
    strokeWidth={spread} strokeLinejoin="round" strokeLinecap="round"
    pointerEvents="none">
    {evaluated.parts.map(part => <path key={part.id}
      data-km-riso-knockout-part={part.id}
      d={part.d} transform={part.transform} fill="inherit" stroke="inherit"/>) }
  </g>;
}

/** Plate-local character parts. Render this inside the corresponding RisoPrint artwork callback. */
export function RisoCharacterInk({
  spec, frame, plateId, paint, x = 0, y = 0, scale = 1,
  reducedMotion = false, disableIK = false, showRig = false, children,
}: RisoCharacterInkProps) {
  validPlacement(x, y, scale);
  const evaluated = evaluateRisoCharacter(spec, frame, { reducedMotion, disableIK });
  // Each paper clearance is a local ink knockout for all earlier parts:
  // the coat may be behind the face, but cannot be visible *through* it.
  // Later facial ink remains printable; no alpha-opacity trick is used.
  const maskUid = useId().replace(/[^a-z0-9]/gi, "");
  const indexed = evaluated.parts.map((part, index) => ({ part, index }));
  const clearances = indexed.filter(({part}) => part.knockoutOnly);
  const painted = indexed.filter(({part}) => part.plate === plateId && !part.knockoutOnly);
  const segments: Array<{
    key: string;
    ink: RisoPartFrame[];
    clearance: typeof clearances;
  }> = [];
  for (const {part,index} of painted) {
    const clearance = clearances.filter(c => c.index > index);
    const key = clearance.map(c => c.index).join("-");
    const previous = segments[segments.length-1];
    if (previous && previous.key === key) previous.ink.push(part);
    else segments.push({key, ink:[part], clearance});
  }
  const inkPath = (part:RisoPartFrame) => <path key={part.id}
    data-km-riso-part={part.id} d={part.d} transform={part.transform}
    fill={part.paint === "screen" ? paint.dots : paint.solid}
    opacity={part.opacity}/>;
  if (!spec.parts.some(p => p.plate === plateId))
    throw new RangeError("RISO2 character has no authored ink for plate " + plateId);
  return <g data-km-riso-character={spec.id} data-km-riso-expression={evaluated.expression}
      data-km-riso-sampled-frame={evaluated.sampledFrame}
      transform={`translate(${x} ${y}) scale(${scale})`}>
    {segments.some(group => group.clearance.length > 0) && <defs>
      {segments.map((group, i) => group.clearance.length > 0 && <mask
        key={i} id={maskUid+"-paper-clear-"+i}
        maskContentUnits="userSpaceOnUse" x="-20%" y="-20%" width="140%" height="140%">
        <rect x={-16384} y={-16384} width={32768} height={32768} fill="white"/>
        {group.clearance.map(({part})=><path key={part.id} d={part.d}
          transform={part.transform} fill="black"/>)}
      </mask>)}
    </defs>}
    {segments.map((group,i)=><g key={i}
      data-km-riso-ink-segment={i}
      mask={group.clearance.length>0?"url(#"+maskUid+"-paper-clear-"+i+")":undefined}>
      {group.ink.map(inkPath)}
    </g>)}
    {showRig && plateId === "blue" && <g data-km-riso-rig-diagnostics=""
      pointerEvents="none" fill="none" stroke="#ED4772" strokeWidth={1.6}>
      {evaluated.joints.filter(j => j.parent).map(j => {
        const parent = evaluated.joints.find(other => other.id === j.parent)!;
        return <path key={j.id} data-km-riso-bone={j.id}
          d={`M${parent.x} ${parent.y} L${j.x} ${j.y}`} strokeDasharray="3 3"/>;
      })}
      {evaluated.joints.map(j => <circle key={j.id} data-km-riso-joint={j.id}
        cx={j.x} cy={j.y} r={j.id.includes("ankle") ? 4 : 2.7}
        strokeWidth={1.8} fill="#FAE7BF"/>)}
      {evaluated.ik.map(leg => <g key={leg.id}
        data-km-riso-foot-target={leg.id.includes("foot") ? leg.id : undefined}
        data-km-riso-grip-target={leg.id.includes("handhold") ? leg.id : undefined}
        data-km-riso-foot-error={leg.id.includes("foot") ? leg.error.toFixed(4) : undefined}
        data-km-riso-ik-error={leg.error.toFixed(4)}>
        <circle cx={leg.requested.x} cy={leg.requested.y} r={6}
          stroke={leg.reachable ? "#098A66" : "#C22A25"} strokeWidth={2}/>
        <path d={`M${leg.requested.x-8} ${leg.requested.y}
          H${leg.requested.x+8} M${leg.requested.x} ${leg.requested.y-8}
          V${leg.requested.y+8}`} stroke="#098A66" strokeWidth={1.2}/>
      </g>)}
    </g>}
    {children}
  </g>;
}
