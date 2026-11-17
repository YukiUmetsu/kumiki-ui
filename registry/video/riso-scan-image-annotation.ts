import type {RisoProofPoint,RisoScanMeasurements} from "./riso-scan-proof";

/** Image-based scan annotation. This is pixel coordinate collection, NOT
 * color classification, image recognition or independently authenticated
 * physical press evidence. No ink, dry brush or source geometry is changed. */
export const RISO71_CORNER_IDS=["top-left","top-right","bottom-right","bottom-left"] as const;
export const RISO71_MARK_IDS=["top","bottom","left","right"] as const;
export type Riso71TargetKey=string;
export type Riso71PickedPixels=Readonly<Record<string,RisoProofPoint|undefined>>;
const validSize=(n:number)=>Number.isSafeInteger(n)&&n>=16&&n<=16000;

export function riso71TargetKeys(plateIds:readonly string[]):readonly Riso71TargetKey[]{
  if(!plateIds.length||plateIds.length>8||
    plateIds.some(id=>!id||!/^[a-z][a-z0-9-]{0,48}$/.test(id))||
    new Set(plateIds).size!==plateIds.length)
    throw new RangeError("RISO71 needs unique physical drum IDs.");
  return [
    ...RISO71_CORNER_IDS.map(id=>"paper:"+id),
    ...plateIds.flatMap(id=>RISO71_MARK_IDS.map(mark=>id+":"+mark)),
  ];
}

/** Pointer -> image's ORIGINAL pixel lattice (not displayed CSS pixels).
 * Reject clicks outside the actual image instead of silently clamping. */
export function riso71DisplayToSourcePixel(
  clientX:number,clientY:number,
  bounds:Readonly<{left:number;top:number;width:number;height:number}>,
  width:number,height:number,
):RisoProofPoint{
  if(!validSize(width)||!validSize(height)||!Number.isFinite(clientX)||
    !Number.isFinite(clientY)||!Number.isFinite(bounds.left)||
    !Number.isFinite(bounds.top)||!Number.isFinite(bounds.width)||
    !Number.isFinite(bounds.height)||bounds.width<=0||bounds.height<=0)
    throw new RangeError("RISO71 missing valid natural image or viewport geometry.");
  const x=(clientX-bounds.left)/bounds.width;
  const y=(clientY-bounds.top)/bounds.height;
  if(x<0||x>1||y<0||y>1)
    throw new RangeError("RISO71 point is outside the uploaded scan.");
  return [Math.round(x*width*100)/100,Math.round(y*height*100)/100];
}

const cross=(a:RisoProofPoint,b:RisoProofPoint,c:RisoProofPoint)=>
  (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);

/** Fail closed on missing observations and folded paper outlines.
 * RISO70 independently performs its own four-corner affine residual check. */
export function riso71BuildScanMeasurements(
  plateIds:readonly string[],points:Riso71PickedPixels,
  width:number,height:number,
):RisoScanMeasurements{
  const keys=riso71TargetKeys(plateIds);
  if(!validSize(width)||!validSize(height))
    throw new RangeError("RISO71 requires the actual scan pixel dimensions.");
  for(const id of keys){
    const p=points[id];
    if(!p||p.length!==2||p.some(v=>!Number.isFinite(v))||
      p[0]<0||p[0]>width||p[1]<0||p[1]>height)
      throw new RangeError("RISO71 missing or outside-image reading: "+id);
  }
  const corners=RISO71_CORNER_IDS.map(id=>points["paper:"+id]!);
  const signs=corners.map((a,i)=>cross(a,corners[(i+1)%4],corners[(i+2)%4]));
  if(signs.some(v=>Math.abs(v)<8)||signs.some(v=>Math.sign(v)!==Math.sign(signs[0])))
    throw new RangeError("RISO71 paper corner order is crossed, collinear or too small.");
  return {kind:"physical-scan",
    corners:RISO71_CORNER_IDS.map(id=>({id,scanPx:points["paper:"+id]!})),
    plates:plateIds.map(plateId=>({
      plateId,
      marks:RISO71_MARK_IDS.map(id=>({id,scanPx:points[plateId+":"+id]!})),
    })),
  };
}
