import type {Riso72ScanAffine} from "./riso-paper-photo-affine";
import type {RisoProofPoint} from "./riso-scan-proof";

/** RISO74: capture resolution is derived from the actual uploaded raster's
 * original natural pixels and operator-selected physical PAPER corners.
 * Browser zoom, image CSS size and ink displacement cannot improve this. */
export interface Riso74NaturalPixelEvidence{
  readonly paperOnly:true;
  readonly crossFeedPixelsPerMm:number;
  readonly feedPixelsPerMm:number;
  /** Worst-direction scan resolution, including scanner skew/shear. */
  readonly minimumPixelsPerMm:number;
  readonly minimumEffectivePpi:number;
  readonly anisotropyRatio:number;
  readonly microdetail: "insufficient-under-300ppi"|"limited-300-to-599ppi"|"600ppi-or-greater";
}
export interface Riso74RasterPatchStatistics{
  readonly originalSamplePixelCount:number;
  readonly meanRgb:readonly [number,number,number];
  readonly meanLuma:number;
  readonly lumaStandardDeviation:number;
  /** Mean adjacent original sampled luminance contrast, 0..255.
   * Quantifies high-frequency variation but DOES NOT identify true Riso dots;
   * scanner aliasing, focus, file resampling and JPEG artifacts also affect it. */
  readonly horizontalContrast:number;
  readonly verticalContrast:number;
  readonly source:"operator-owned-photo-no-color-calibration";
}
const finite=(n:number)=>Number.isFinite(n)&&Math.abs(n)<1_000_000;
const round=(n:number)=>Number(n.toFixed(6));

/** The smallest singular value of sheet-mm -> original image px. Using just
 * width/height or max resolution would overstate a stretched low-res scan. */
export function inspectRiso74NaturalPixelDensity(
  proof:Pick<Riso72ScanAffine,"sheetToPixel"|"paperOnly">,
):Riso74NaturalPixelEvidence{
  const [a,b,c,d]=proof?.sheetToPixel??[NaN,NaN,NaN,NaN,NaN,NaN];
  if(proof?.paperOnly!==true||![a,b,c,d].every(finite))
    throw new RangeError("RISO74 requires a valid PAPER-only natural-image affine.");
  const ux=Math.hypot(a,b),uy=Math.hypot(c,d);
  const trace=a*a+b*b+c*c+d*d;
  const determinant=a*d-b*c;
  if(ux<.01||uy<.01||determinant<=.001)
    throw new RangeError("RISO74 requires positive, nonsingular paper-to-pixel geometry.");
  const discriminant=Math.max(0,trace*trace-4*determinant*determinant);
  const maximum=Math.sqrt((trace+Math.sqrt(discriminant))/2);
  // product of singular values is |det|; this is stable under near-isotropic cases.
  const minimum=determinant/maximum;
  const ppi=minimum*25.4;
  return {
    paperOnly:true,
    crossFeedPixelsPerMm:round(ux),
    feedPixelsPerMm:round(uy),
    minimumPixelsPerMm:round(minimum),
    minimumEffectivePpi:round(ppi),
    anisotropyRatio:round(maximum/minimum),
    microdetail:ppi<300?"insufficient-under-300ppi":
      ppi<600?"limited-300-to-599ppi":"600ppi-or-greater",
  };
}
/** RISO74 samples an original uploaded image through the PAPER affine.
 * Every pixel in this 2D grid has an exactly documented paper-mm center.
 * No ink-edge fitting, deconvolution, sharpening or image reconstruction. */
export function riso74PatchToNaturalPixelMatrix(
  proof:Riso72ScanAffine,centerMm:RisoProofPoint,
  diameterMm:number,sidePixels:number,
):readonly [number,number,number,number,number,number]{
  if(!Array.isArray(centerMm)||centerMm.length!==2||
    !centerMm.every(finite)||!finite(diameterMm)||
    diameterMm<.5||diameterMm>20||
    !Number.isInteger(sidePixels)||sidePixels<16||sidePixels>256)
    throw new RangeError("RISO74 requires a finite physical patch and 16–256 measured samples per axis.");
  const [sw,sh]=proof.physicalSheetMm;
  const half=diameterMm/2;
  if(centerMm[0]-half<0||centerMm[1]-half<0||
    centerMm[0]+half>sw||centerMm[1]+half>sh)
    throw new RangeError("RISO74 patch must lie entirely inside the real PAPER boundary.");
  const s=sidePixels/diameterMm;
  const [a,b,c,d,e,f]=proof.pixelToSheet;
  return [
    s*a,s*b,s*c,s*d,
    s*(e-centerMm[0]+half),
    s*(f-centerMm[1]+half),
  ];
}

/** Pure computation over ImageData-like raw sampled raster pixels, with no
 * external photos, machine-specific palette or nondeterministic noise. */
export function inspectRiso74RasterPatch(
  pixels:Pick<ImageData,"width"|"height"|"data">,
):Riso74RasterPatchStatistics{
  const {width,height,data}=pixels??{};
  if(!Number.isInteger(width)||!Number.isInteger(height)||
    width<16||height<16||width>256||height>256||
    !data||data.length!==width*height*4)
    throw new RangeError("RISO74 requires an exact 16–256 px RGBA swatch with no missing pixels.");
  const count=width*height,luma=new Float64Array(count);
  let red=0,green=0,blue=0,lum=0,lumSquared=0;
  for(let i=0;i<count;i++){
    const o=i*4;
    // Reject transparent/upload-error data; not physical paper pixels.
    if(data[o+3]!==255)
      throw new RangeError("RISO74 refuses transparent/absent photograph pixels.");
    const rr=data[o],gg=data[o+1],bb=data[o+2];
    const y=.2126*rr+.7152*gg+.0722*bb;
    red+=rr;green+=gg;blue+=bb;
    luma[i]=y;lum+=y;lumSquared+=y*y;
  }
  let horiz=0,vert=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x;
    if(x+1<width)horiz+=Math.abs(luma[i]-luma[i+1]);
    if(y+1<height)vert+=Math.abs(luma[i]-luma[i+width]);
  }
  return {originalSamplePixelCount:count,
    meanRgb:[round(red/count),round(green/count),round(blue/count)],
    meanLuma:round(lum/count),
    lumaStandardDeviation:round(Math.sqrt(Math.max(0,
      lumSquared/count-(lum/count)**2))),
    horizontalContrast:round(horiz/(height*(width-1))),
    verticalContrast:round(vert/(width*(height-1))),
    source:"operator-owned-photo-no-color-calibration"};
}
