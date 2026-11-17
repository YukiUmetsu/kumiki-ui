import {inspectRisoSeparation} from "./riso-separation-master";
import type {RisoSeparationLayout,RisoSeparationPlate}
  from "./riso-separation-master";
import type {RisoPrintSpec} from "./print-plates";

/** RISO70 measured print-proof coordinates. Original paper edges, not printed
 * inks, define the scan-to-sheet affine mapping. Inks CANNOT "calibrate away"
 * their own offset or hide drum misregistration by moving the scan. */
export type RisoProofPoint=readonly [number,number];
export type RisoProofMark="top"|"bottom"|"left"|"right";
export interface RisoScanCorner {
  readonly id:"top-left"|"top-right"|"bottom-right"|"bottom-left";
  /** Actual scan pixel position of the physical paper edge corner. */
  readonly scanPx:RisoProofPoint;
}
export interface RisoScanPlate {
  readonly plateId:string;
  readonly marks:readonly {readonly id:RisoProofMark;readonly scanPx:RisoProofPoint}[];
}
export interface RisoScanMeasurements {
  readonly kind:"synthetic"|"physical-scan";
  /** Exactly 4 observed PAPER corners, not a best fit to printed ink. */
  readonly corners:readonly RisoScanCorner[];
  readonly plates:readonly RisoScanPlate[];
}
export interface RisoMarkOffset {
  readonly id:RisoProofMark;
  readonly expectedMm:RisoProofPoint;
  readonly measuredMm:RisoProofPoint;
  readonly deltaMm:RisoProofPoint;
  readonly distanceMm:number;
}
export interface RisoPlateScanResult {
  readonly id:string;
  readonly marks:readonly RisoMarkOffset[];
  readonly meanDeltaMm:RisoProofPoint;
  readonly rmsMm:number;
  readonly worstMm:number;
}
export interface RisoScanProofReport {
  /** Only an operator-provided physical scan can generate measured evidence. */
  readonly evidence:"simulation-only"|"operator-measured";
  /** True if complete numerical readings are <= the explicitly chosen budget.
   * Not a physical press certification or printer model calibration. */
  readonly withinDeclaredTolerance:boolean;
  readonly toleranceMm:number;
  readonly scannerCornerMaxErrorMm:number;
  readonly scannerCornerRmsMm:number;
  readonly expectedMarksMm:Readonly<Record<RisoProofMark,RisoProofPoint>>;
  readonly plates:readonly RisoPlateScanResult[];
  readonly relativePairMm:readonly {
    readonly first:string;readonly second:string;
    readonly meanDeltaMm:RisoProofPoint;readonly worstMm:number;
  }[];
}
const ids=["top","bottom","left","right"] as const;
const cornerIds=["top-left","top-right","bottom-right","bottom-left"] as const;
const finite=(v:number)=>Number.isFinite(v)&&Math.abs(v)<1000000;
const point=(x:unknown):x is RisoProofPoint=>
  Array.isArray(x)&&x.length===2&&x.every(y=>typeof y==="number"&&finite(y));
const hypot=(p:RisoProofPoint)=>Math.hypot(p[0],p[1]);
const solve=(a:number[][],b:number[]):readonly [number,number,number]=>{
  const rows=a.map((r,i)=>[...r,b[i]]);
  for(let col=0;col<3;col++){
    let pivot=col;
    for(let i=col+1;i<3;i++)
      if(Math.abs(rows[i][col])>Math.abs(rows[pivot][col]))pivot=i;
    if(Math.abs(rows[pivot][col])<1e-9)
      throw new RangeError("RISO70 paper corner scan is degenerate (collinear or zero size).");
    [rows[col],rows[pivot]]=[rows[pivot],rows[col]];
    const scale=rows[col][col];
    for(let k=col;k<4;k++)rows[col][k]/=scale;
    for(let i=0;i<3;i++)if(i!==col){
      const factor=rows[i][col];
      for(let k=col;k<4;k++)rows[i][k]-=factor*rows[col][k];
    }
  }
  return [rows[0][3],rows[1][3],rows[2][3]];
};
function affineMmToPixels(
  source:readonly RisoProofPoint[],dest:readonly RisoProofPoint[],
){
  const n=source.length;
  const a=[
    [source.reduce((s,p)=>s+p[0]*p[0],0),
      source.reduce((s,p)=>s+p[0]*p[1],0),
      source.reduce((s,p)=>s+p[0],0)],
    [source.reduce((s,p)=>s+p[0]*p[1],0),
      source.reduce((s,p)=>s+p[1]*p[1],0),
      source.reduce((s,p)=>s+p[1],0)],
    [source.reduce((s,p)=>s+p[0],0),
      source.reduce((s,p)=>s+p[1],0),n],
  ];
  const rhs=(axis:0|1)=>[
    source.reduce((s,p,i)=>s+p[0]*dest[i][axis],0),
    source.reduce((s,p,i)=>s+p[1]*dest[i][axis],0),
    dest.reduce((s,p)=>s+p[axis],0),
  ];
  const [xx,xy,x0]=solve(a,rhs(0)),[yx,yy,y0]=solve(a,rhs(1));
  const determinant=xx*yy-xy*yx;
  if(!finite(determinant)||Math.abs(determinant)<1e-9)
    throw new RangeError("RISO70 scanner calibration is singular.");
  const pixelToMm=(p:RisoProofPoint):RisoProofPoint=>{
    const dx=p[0]-x0,dy=p[1]-y0;
    return [(yy*dx-xy*dy)/determinant,(-yx*dx+xx*dy)/determinant];
  };
  return {pixelToMm};
}
/** Original exact source intersections: two lines per cross, never RGB
 * screenshot detection or an invented marker position. */
export function risoPrintRegistrationTargets(
  spec:RisoPrintSpec,plates:readonly RisoSeparationPlate[],
  layout:RisoSeparationLayout,
):Readonly<Record<RisoProofMark,RisoProofPoint>>{
  const plan=inspectRisoSeparation(spec,plates,layout);
  if(!plan.ready)throw new RangeError("RISO70 registration target needs safe source masters.");
  const lines=plan.marks.filter(x=>x.kind==="registration");
  if(lines.length!==8)
    throw new RangeError("RISO70 scan proof requires explicit crop-and-register output.");
  const marks=[] as RisoProofPoint[];
  for(let i=0;i<lines.length;i+=2){
    const horiz=lines[i],vert=lines[i+1];
    const h: RisoProofPoint=[(horiz.x1+horiz.x2)/2,(horiz.y1+horiz.y2)/2];
    const v: RisoProofPoint=[(vert.x1+vert.x2)/2,(vert.y1+vert.y2)/2];
    if(Math.hypot(h[0]-v[0],h[1]-v[1])>1e-7)
      throw new RangeError("RISO70 source registration cross is not coherent.");
    marks.push(h);
  }
  return {top:marks[0],bottom:marks[1],left:marks[2],right:marks[3]};
}
export function createRisoScanTemplate(
  spec:RisoPrintSpec,plates:readonly RisoSeparationPlate[],
  layout:RisoSeparationLayout,
){
  const targets=risoPrintRegistrationTargets(spec,plates,layout);
  return {
    description:"Fill scanPx with observed pixel centers from a REAL scan. Measure all four PAPER corners as well, not the ink contours. This template is NOT a physical measurement.",
    sheetMm:layout.sheetMm,
    expectedMarksMm:targets,
    kind:"physical-scan" as const,
    corners:cornerIds.map(id=>({id,scanPx:null})),
    plates:spec.plates.map(p=>({plateId:p.id,
      marks:ids.map(id=>({id,scanPx:null}))})),
  };
}
/** Synthetic scan is only a demonstration of math and must NEVER be labelled
 * a real physical press/stock measurement. */
export function simulateRisoScanProof(
  spec:RisoPrintSpec,plates:readonly RisoSeparationPlate[],
  layout:RisoSeparationLayout,redOffsetMm:RisoProofPoint,
  opts:{scanRotationDegrees?:number;scanPixelsPerMm?:number}={},
):RisoScanMeasurements{
  if(!point(redOffsetMm)||hypot(redOffsetMm)>12)
    throw new RangeError("RISO70 demo displacement must stay within ±12 mm.");
  const targets=risoPrintRegistrationTargets(spec,plates,layout);
  const angle=(opts.scanRotationDegrees??7)*Math.PI/180;
  const scale=opts.scanPixelsPerMm??12;
  if(!finite(angle)||!finite(scale)||scale<2||scale>1000)
    throw new RangeError("RISO70 synthetic scanner geometry invalid.");
  const toPx=([x,y]:RisoProofPoint):RisoProofPoint=>[
    100+x*scale*Math.cos(angle)-y*scale*Math.sin(angle),
    100+y*scale*Math.cos(angle)+x*scale*Math.sin(angle),
  ];
  const [w,h]=layout.sheetMm;
  const corners=cornerIds.map((id,i):RisoScanCorner=>({
    id,scanPx:toPx(([[0,0],[w,0],[w,h],[0,h]] as const)[i]),
  }));
  const plateMarks=spec.plates.map((p,i):RisoScanPlate=>({
    plateId:p.id,marks:ids.map(id=>{
      const q=targets[id],offset=i===0?[0,0] as const:redOffsetMm;
      return {id,scanPx:toPx([q[0]+offset[0],q[1]+offset[1]])};
    }),
  }));
  return {kind:"synthetic",corners,plates:plateMarks};
}
export function inspectRisoScanProof(
  spec:RisoPrintSpec,plates:readonly RisoSeparationPlate[],
  layout:RisoSeparationLayout,measurements:RisoScanMeasurements,
  toleranceMm:number,scannerToleranceMm=.5,
):RisoScanProofReport{
  if(!Number.isFinite(toleranceMm)||toleranceMm<.05||toleranceMm>10||
    !Number.isFinite(scannerToleranceMm)||scannerToleranceMm<.01||
    scannerToleranceMm>5)
    throw new RangeError("RISO70 operator must declare physical mark and scan calibration allowances.");
  const target=risoPrintRegistrationTargets(spec,plates,layout);
  if(!measurements||!["physical-scan","synthetic"].includes(measurements.kind)||
    !Array.isArray(measurements.corners)||measurements.corners.length!==4||
    measurements.corners.some((c,i)=>c?.id!==cornerIds[i]||!point(c.scanPx))||
    !Array.isArray(measurements.plates)||
    measurements.plates.length!==spec.plates.length||
    measurements.plates.some((p,i)=>p?.plateId!==spec.plates[i].id||
      !Array.isArray(p.marks)||p.marks.length!==4||
      p.marks.some((m:RisoScanPlate["marks"][number],j:number)=>m?.id!==ids[j]||!point(m.scanPx))))
    throw new RangeError("RISO70 requires four observed PAPER corners and four cross centers for every declared ink drum; missing readings fail closed.");
  const [w,h]=layout.sheetMm;
  const expected=([[0,0],[w,0],[w,h],[0,h]] as const);
  const measured=measurements.corners.map(c=>c.scanPx);
  const {pixelToMm}=affineMmToPixels(expected,measured);
  const errors=measured.map((p,i)=>{
    const actual=pixelToMm(p);
    return Math.hypot(actual[0]-expected[i][0],actual[1]-expected[i][1]);
  });
  const cornerWorst=Math.max(...errors);
  const cornerRms=Math.sqrt(errors.reduce((s,e)=>s+e*e,0)/4);
  if(cornerWorst>scannerToleranceMm)
    throw new RangeError("RISO70 scanner paper-corner calibration exceeds declared residual tolerance; use a flat scan or correct perspective first.");
  const result: RisoPlateScanResult[]=measurements.plates.map(p=>{
    const marks:RisoMarkOffset[]=p.marks.map((m:RisoScanPlate["marks"][number])=>{
      const actual=pixelToMm(m.scanPx),nominal=target[m.id];
      const delta:RisoProofPoint=[actual[0]-nominal[0],actual[1]-nominal[1]];
      return {id:m.id,expectedMm:nominal,measuredMm:actual,
        deltaMm:delta,distanceMm:hypot(delta)};
    });
    const mean: RisoProofPoint=[
      marks.reduce((sum,m)=>sum+m.deltaMm[0],0)/4,
      marks.reduce((sum,m)=>sum+m.deltaMm[1],0)/4,
    ];
    return {id:p.plateId,marks,meanDeltaMm:mean,
      rmsMm:Math.sqrt(marks.reduce((sum,m)=>sum+m.distanceMm**2,0)/4),
      worstMm:Math.max(...marks.map(m=>m.distanceMm))};
  });
  const pairs: RisoScanProofReport["relativePairMm"][number][]=[];
  for(let i=0;i<result.length;i++)for(let j=i+1;j<result.length;j++){
    const p=result[i],q=result[j];
    const delta=q.marks.map((v,k):RisoProofPoint=>[
      v.deltaMm[0]-p.marks[k].deltaMm[0],
      v.deltaMm[1]-p.marks[k].deltaMm[1],
    ]);
    pairs.push({first:p.id,second:q.id,
      meanDeltaMm:[
        delta.reduce((s,v)=>s+v[0],0)/4,
        delta.reduce((s,v)=>s+v[1],0)/4,
      ],worstMm:Math.max(...delta.map(hypot))});
  }
  return {evidence:measurements.kind==="synthetic"?"simulation-only":"operator-measured",
    withinDeclaredTolerance:result.every(p=>p.worstMm<=toleranceMm+1e-9)&&
      pairs.every(p=>p.worstMm<=toleranceMm+1e-9),
    toleranceMm,scannerCornerMaxErrorMm:cornerWorst,
    scannerCornerRmsMm:cornerRms,expectedMarksMm:target,
    plates:result,relativePairMm:pairs};
}
