import type {RisoProofPoint,RisoScanMeasurements} from "./riso-scan-proof";

/** RISO72: paper-only affine scan rectification for genuine source-image
 * comparison. Original ink observations are NEVER used to align the scanner:
 * the printed registration drift must remain measurable. */
export interface Riso72ScanAffine {
  /** Paper millimeters -> original natural image pixels; 6-value SVG matrix. */
  readonly sheetToPixel:readonly [number,number,number,number,number,number];
  /** Scan image natural pixels -> paper millimeters; SVG transform matrix. */
  readonly pixelToSheet:readonly [number,number,number,number,number,number];
  readonly worstPaperCornerResidualMm:number;
  readonly sourceImagePx:readonly [number,number];
  readonly physicalSheetMm:readonly [number,number];
  readonly paperOnly:true;
}

const finite=(v:number)=>Number.isFinite(v)&&Math.abs(v)<=1_000_000;
const point=(p:unknown):p is RisoProofPoint=>
  Array.isArray(p)&&p.length===2&&p.every(v=>typeof v==="number"&&finite(v));
const apply=(m:readonly [number,number,number,number,number,number],
  [x,y]:RisoProofPoint):RisoProofPoint=>[
    m[0]*x+m[2]*y+m[4],
    m[1]*x+m[3]*y+m[5],
  ];

/** Exact source paper corners, in fixed TL/TR/BR/BL order.
 * A mirror, fold or perspective residual > declared allowance is NOT
 * "corrected" by fitting onto an ink color or using a flexible warp. */
export function createRiso72PaperAffine(
  scan:Pick<RisoScanMeasurements,"corners">,
  physicalSheetMm:readonly [number,number],
  sourceImagePx:readonly [number,number],
  maxResidualMm=.5,
):Riso72ScanAffine{
  const [sw,sh]=physicalSheetMm, [iw,ih]=sourceImagePx;
  if(![sw,sh,iw,ih,maxResidualMm].every(finite)||
    sw<30||sw>600||sh<30||sh>600||
    !Number.isInteger(iw)||!Number.isInteger(ih)||
    iw<16||ih<16||iw>16000||ih>16000||
    maxResidualMm<.01||maxResidualMm>5)
    throw new RangeError("RISO72 requires exact physical paper, natural image pixel size and bounded scanner allowance.");
  const order=["top-left","top-right","bottom-right","bottom-left"];
  if(!scan||!Array.isArray(scan.corners)||scan.corners.length!==4||
    scan.corners.some((c,i)=>c?.id!==order[i]||!point(c.scanPx)||
      c.scanPx[0]<0||c.scanPx[0]>iw||
      c.scanPx[1]<0||c.scanPx[1]>ih))
    throw new RangeError("RISO72 requires four complete in-image PAPER corners in fixed order.");
  const [tl,tr,br,bl]=scan.corners.map(c=>c.scanPx);
  const a=(tr[0]-tl[0])/sw,b=(tr[1]-tl[1])/sw;
  const c=(bl[0]-tl[0])/sh,d=(bl[1]-tl[1])/sh;
  const determinant=a*d-b*c;
  if(!finite(determinant)||determinant<=.001)
    throw new RangeError("RISO72 paper geometry is mirrored, folded or degenerate.");
  const sheetToPixel:[number,number,number,number,number,number]=[
    a,b,c,d,tl[0],tl[1],
  ];
  const e=(c*tl[1]-d*tl[0])/determinant;
  const f=(b*tl[0]-a*tl[1])/determinant;
  const pixelToSheet:[number,number,number,number,number,number]=[
    d/determinant,-b/determinant,
    -c/determinant,a/determinant,
    e,f,
  ];
  const observed=apply(pixelToSheet,br);
  const worstPaperCornerResidualMm=Math.hypot(observed[0]-sw,observed[1]-sh);
  if(!finite(worstPaperCornerResidualMm)||
    worstPaperCornerResidualMm>maxResidualMm+1e-9)
    throw new RangeError("RISO72 non-affine PAPER corner disagreement: photograph perspective or warped sheet exceeds tolerance.");
  return {sheetToPixel,pixelToSheet,worstPaperCornerResidualMm,
    sourceImagePx,physicalSheetMm,paperOnly:true};
}
export function riso72ImagePixelToPaperMm(
  proof:Riso72ScanAffine,pixel:RisoProofPoint,
):RisoProofPoint{
  if(!point(pixel))throw new RangeError("RISO72 needs a finite original image pixel.");
  return apply(proof.pixelToSheet,pixel);
}
export function riso72PaperMmToImagePixel(
  proof:Riso72ScanAffine,mm:RisoProofPoint,
):RisoProofPoint{
  if(!point(mm))throw new RangeError("RISO72 needs a finite physical sheet coordinate.");
  return apply(proof.sheetToPixel,mm);
}
export function riso72SvgMatrix(matrix:Riso72ScanAffine["pixelToSheet"]):string{
  if(matrix.length!==6||!matrix.every(finite))
    throw new RangeError("RISO72 invalid physical scanner transform");
  return "matrix("+matrix.map(v=>Number(v.toFixed(9))).join(" ")+")";
}
