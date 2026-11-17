import {inspectRisoPrint,plateRegistration} from "./print-plates";
import type {RisoPrintSpec} from "./print-plates";

/** A geometry-independent displacement budget for native physical spot masters.
 * This does NOT dilate paths, measure actual neighbouring silhouettes, or
 * certify that an unmeasured physical press will register within tolerance. */
export interface RisoRegistrationPlate {
  id:string;
  offset:readonly [number,number];
}
export interface RisoRegistrationPair {
  first:string;
  second:string;
  /** Second plate minus first plate, in original sheet design pixels. */
  delta:readonly [number,number];
  magnitude:number;
  /** Declared design allowance, not an applied trap or physical measurement. */
  trapAllowance:number;
  excess:number;
}
export interface RisoRegistrationReport {
  plates:readonly RisoRegistrationPlate[];
  pairs:readonly RisoRegistrationPair[];
  worstPair:RisoRegistrationPair;
  /** True only when the declared trap budget covers every pairwise displacement. */
  withinAllowance:boolean;
}
export function evaluateRisoRegistration(
  spec:RisoPrintSpec,misregistration=0,trapAllowance=0,
):RisoRegistrationReport{
  const issues=inspectRisoPrint(spec);
  if(issues.length)throw new RangeError(
    "RISO65 invalid spot masters: "+issues.map(i=>i.path+": "+i.message).join("; ")
  );
  if(!Number.isFinite(misregistration)||misregistration<0||misregistration>1||
    !Number.isFinite(trapAllowance)||trapAllowance<0||trapAllowance>12)
    throw new RangeError("RISO65 misregistration must be 0..1 and trap allowance 0..12 design pixels.");
  const plates=spec.plates.map((plate,i):RisoRegistrationPlate=>({
    id:plate.id,offset:plateRegistration(spec,i,misregistration),
  }));
  const pairs:RisoRegistrationPair[]=[];
  for(let i=0;i<plates.length;i++)for(let j=i+1;j<plates.length;j++){
    const dx=plates[j].offset[0]-plates[i].offset[0];
    const dy=plates[j].offset[1]-plates[i].offset[1];
    const magnitude=Math.hypot(dx,dy);
    pairs.push({
      first:plates[i].id,second:plates[j].id,
      delta:[dx,dy],magnitude,trapAllowance,
      excess:Math.max(0,magnitude-trapAllowance),
    });
  }
  const worstPair=pairs.reduce((worst,p)=>p.magnitude>worst.magnitude?p:worst);
  return {plates,pairs,worstPair,
    withinAllowance:pairs.every(p=>p.excess<=1e-9)};
}
