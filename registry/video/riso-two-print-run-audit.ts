import {createRiso72PaperAffine,riso72ImagePixelToPaperMm}
  from "./riso-paper-photo-affine";
import type {Riso72ScanAffine} from "./riso-paper-photo-affine";
import type {RisoProofMark,RisoProofPoint,RisoScanMeasurements,RisoScanPlate}
  from "./riso-scan-proof";

/** RISO73: independent observed source photos of TWO different sheets.
 * Numbers are operator annotations, not optical ink recognition or evidence
 * that these images were physically printed. */
export interface Riso73PrintCopy{
  readonly measurements:RisoScanMeasurements;
  readonly pixels:readonly [number,number];
}
export interface Riso73CrossDelta{
  readonly id:RisoProofMark;
  readonly firstMm:RisoProofPoint;
  readonly secondMm:RisoProofPoint;
  /** Second minus first in real millimeters, after each PAPER-only affine. */
  readonly changeMm:RisoProofPoint;
  readonly distanceMm:number;
}
export interface Riso73InkCopyDrift{
  readonly plateId:string;
  readonly marks:readonly Riso73CrossDelta[];
  readonly meanChangeMm:RisoProofPoint;
  readonly rmsChangeMm:number;
  readonly worstChangeMm:number;
}
export interface Riso73CopyReport{
  readonly evidence:"two-operator-annotated-images-unverified";
  readonly firstPaper:Riso72ScanAffine;
  readonly secondPaper:Riso72ScanAffine;
  readonly plates:readonly Riso73InkCopyDrift[];
  readonly relativeInk:{
    readonly first:string;readonly second:string;
    readonly marks:readonly Riso73CrossDelta[];
    readonly meanChangeMm:RisoProofPoint;
    readonly worstChangeMm:number;
  }|null;
  readonly declaredRepeatabilityBudgetMm:number;
  readonly withinDeclaredRepeatabilityBudget:boolean;
}
const ids=["top","bottom","left","right"] as const;
const validPoint=(p:unknown):p is RisoProofPoint=>
  Array.isArray(p)&&p.length===2&&p.every(v=>
    typeof v==="number"&&Number.isFinite(v)&&Math.abs(v)<=1000000);
const subtract=(a:RisoProofPoint,b:RisoProofPoint):RisoProofPoint=>[
  a[0]-b[0],a[1]-b[1],
];
const norm=(p:RisoProofPoint)=>Math.hypot(p[0],p[1]);
const stats=(marks:readonly Riso73CrossDelta[])=>{
  const meanChangeMm:[number,number]=[
    marks.reduce((s,m)=>s+m.changeMm[0],0)/marks.length,
    marks.reduce((s,m)=>s+m.changeMm[1],0)/marks.length,
  ];
  return {
    meanChangeMm,
    rmsChangeMm:Math.sqrt(marks.reduce(
      (s,m)=>s+m.distanceMm*m.distanceMm,0)/marks.length),
    worstChangeMm:Math.max(...marks.map(m=>m.distanceMm)),
  };
};
function inspectCopy(copy:Riso73PrintCopy,plateIds:readonly string[],
  sheetMm:readonly [number,number],toleranceMm:number){
  const scan=copy?.measurements;
  if(!scan||scan.kind!=="physical-scan"||
    !Array.isArray(scan.plates)||scan.plates.length!==plateIds.length||
    scan.plates.some((plate,i)=>plate?.plateId!==plateIds[i]||
      !Array.isArray(plate.marks)||plate.marks.length!==4||
      plate.marks.some((mark:RisoScanPlate["marks"][number],j:number)=>mark?.id!==ids[j]||
        !validPoint(mark.scanPx)||mark.scanPx[0]<0||
        mark.scanPx[0]>copy.pixels[0]||
        mark.scanPx[1]<0||mark.scanPx[1]>copy.pixels[1])))
    throw new RangeError("RISO73 each physical-copy image requires four complete, inside-image marks for every ink drum, in original press order.");
  const paper=createRiso72PaperAffine(scan,sheetMm,copy.pixels,toleranceMm);
  return {paper,plates:Object.fromEntries(scan.plates.map(plate=>[
    plate.plateId,Object.fromEntries(plate.marks.map((mark:RisoScanPlate["marks"][number])=>[
      mark.id,riso72ImagePixelToPaperMm(paper,mark.scanPx),
    ])),
  ])) as Record<string,Record<RisoProofMark,RisoProofPoint>>};
}

/** Ink alignment is never used for the camera calibration. The two
 * photographic sheets may have different original sizes, rotations, scan
 * positions and resolutions. Reject a folded/photo-perspective sheet before
 * comparing any single physical stencil mark. */
export function inspectRiso73CopyRepeatability(
  first:Riso73PrintCopy,second:Riso73PrintCopy,
  sheetMm:readonly [number,number],
  expectedMarksMm:Readonly<Record<RisoProofMark,RisoProofPoint>>,
  plateIds:readonly string[],
  declaredRepeatabilityBudgetMm=1.75,
  maxPaperResidualMm=.5,
):Riso73CopyReport{
  if(!Number.isFinite(declaredRepeatabilityBudgetMm)||
    declaredRepeatabilityBudgetMm<.05||
    declaredRepeatabilityBudgetMm>10)
    throw new RangeError("RISO73 requires a declared physical print-copy repeatability budget.");
  if(!Array.isArray(plateIds)||plateIds.length!==2||
    plateIds.some(x=>typeof x!=="string"||
      !/^[a-z][a-z0-9-]{0,63}$/.test(x))||
    plateIds[0]===plateIds[1])
    throw new RangeError("RISO73 requires exactly two unique original spot drums in press order.");
  if(!expectedMarksMm||ids.some(id=>!validPoint(expectedMarksMm[id])))
    throw new RangeError("RISO73 requires exact independent original source registration targets.");
  const a=inspectCopy(first,plateIds,sheetMm,maxPaperResidualMm);
  const b=inspectCopy(second,plateIds,sheetMm,maxPaperResidualMm);
  const plates=plateIds.map(plateId=>{
    const marks=ids.map(id=>{
      const firstMm=a.plates[plateId][id],
        secondMm=b.plates[plateId][id];
      const changeMm=subtract(secondMm,firstMm);
      return {id,firstMm,secondMm,changeMm,distanceMm:norm(changeMm)};
    });
    return {plateId,marks,...stats(marks)};
  });
  const firstPlate=plates[0],secondPlate=plates[1];
  // The change in B-A inter-ink displacement across sheets, at each exact
  // physical registration target. Absolute drum translation cancels;
  // independent paper corner transformations never cancel.
  const relativeMarks=ids.map((id,i)=>{
    const firstMm=subtract(secondPlate.marks[i].firstMm,
      firstPlate.marks[i].firstMm);
    const secondMm=subtract(secondPlate.marks[i].secondMm,
      firstPlate.marks[i].secondMm);
    const changeMm=subtract(secondMm,firstMm);
    return {id,firstMm,secondMm,changeMm,distanceMm:norm(changeMm)};
  });
  const relativeInk={first:firstPlate.plateId,
    second:secondPlate.plateId,marks:relativeMarks,
    meanChangeMm:stats(relativeMarks).meanChangeMm,
    worstChangeMm:stats(relativeMarks).worstChangeMm};
  const limit=declaredRepeatabilityBudgetMm+1e-8;
  return {evidence:"two-operator-annotated-images-unverified",
    firstPaper:a.paper,secondPaper:b.paper,plates,relativeInk,
    declaredRepeatabilityBudgetMm,
    withinDeclaredRepeatabilityBudget:
      plates.every(p=>p.worstChangeMm<=limit)&&
      relativeInk.worstChangeMm<=limit};
}
