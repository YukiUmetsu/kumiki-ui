import type {RisoSeparationLayout} from "./riso-separation-master";

/** RISO69: uncompressed Baseline TIFF, 8-bit TRUE grayscale (single sample,
 * BlackIsZero) with exact stated X/Y PPI, not a renamed PNG or RGB image.
 * Rasterization to pixels occurs separately in the caller at the chosen PPI. */
export type RisoMasterPpi=300|600;
export interface RisoRasterDimensions{
  readonly width:number;readonly height:number;
  readonly dpi:RisoMasterPpi;
  readonly pixelCount:number;
  readonly sheetMm:readonly [number,number];
}
const MAX_PIXELS=40000000; // bounded memory; 600 PPI A4 fits, larger rejected.
export function measureRisoTiffRaster(layout:RisoSeparationLayout,dpi:RisoMasterPpi):
  RisoRasterDimensions{
  if(dpi!==300&&dpi!==600||!layout||!Array.isArray(layout.sheetMm))
    throw new RangeError("RISO69 TIFF requires explicit 300 or 600 PPI and a millimeter sheet.");
  const [mmW,mmH]=layout.sheetMm;
  if(!Number.isFinite(mmW)||!Number.isFinite(mmH)||mmW<30||mmH<30||
    mmW>600||mmH>600)
    throw new RangeError("RISO69 TIFF physical sheet out of bounds.");
  const width=Math.round(mmW/25.4*dpi),height=Math.round(mmH/25.4*dpi),
    pixelCount=width*height;
  if(pixelCount>MAX_PIXELS||width<1||height<1)
    throw new RangeError("RISO69 TIFF sheet exceeds the 40-million-pixel memory safety budget.");
  return {width,height,dpi,pixelCount,sheetMm:layout.sheetMm};
}
type TiffEntry=readonly [tag:number,type:3|4|5,count:number,value:number];
export function encodeRisoGrayscaleTiff(
  input:Uint8Array,dimensions:RisoRasterDimensions,
):Uint8Array{
  if(!(input instanceof Uint8Array)||!dimensions||
    ![300,600].includes(dimensions.dpi)||
    !Number.isSafeInteger(dimensions.width)||!Number.isSafeInteger(dimensions.height)||
    dimensions.width<1||dimensions.height<1||
    dimensions.width*dimensions.height>MAX_PIXELS||
    input.byteLength!==dimensions.width*dimensions.height||
    input.byteLength!==dimensions.pixelCount)
    throw new RangeError("RISO69 requires one exact 8-bit grayscale sample per raster pixel.");
  // Little-endian TIFF 6.0: 14 sorted baseline tags + 2 rational resolution values.
  const tagCount=14,ifdOffset=8;
  const rationalX=ifdOffset+2+tagCount*12+4,rationalY=rationalX+8,
    pixelOffset=rationalY+8;
  const tags:readonly TiffEntry[]=[
    [256,4,1,dimensions.width],         // ImageWidth
    [257,4,1,dimensions.height],        // ImageLength
    [258,3,1,8],                        // BitsPerSample = 8
    [259,3,1,1],                        // Compression = 1 / uncompressed
    [262,3,1,1],                        // PhotometricInterpretation = BlackIsZero
    [273,4,1,pixelOffset],              // StripOffsets
    [274,3,1,1],                        // Orientation = top-left
    [277,3,1,1],                        // SamplesPerPixel = 1
    [278,4,1,dimensions.height],        // RowsPerStrip
    [279,4,1,input.byteLength],         // StripByteCounts
    [282,5,1,rationalX],                // XResolution 300/1 or 600/1
    [283,5,1,rationalY],                // YResolution
    [284,3,1,1],                        // PlanarConfiguration = chunky
    [296,3,1,2],                        // ResolutionUnit = inch
  ];
  const output=new Uint8Array(pixelOffset+input.byteLength);
  const view=new DataView(output.buffer);
  output[0]=0x49;output[1]=0x49;
  view.setUint16(2,42,true);
  view.setUint32(4,ifdOffset,true);
  view.setUint16(ifdOffset,tagCount,true);
  let pos=ifdOffset+2;
  for(const [tag,type,count,value] of tags){
    view.setUint16(pos,tag,true);
    view.setUint16(pos+2,type,true);
    view.setUint32(pos+4,count,true);
    if(type===3){view.setUint16(pos+8,value,true);view.setUint16(pos+10,0,true);}
    else view.setUint32(pos+8,value,true);
    pos+=12;
  }
  view.setUint32(pos,0,true); // no next IFD
  view.setUint32(rationalX,dimensions.dpi,true);view.setUint32(rationalX+4,1,true);
  view.setUint32(rationalY,dimensions.dpi,true);view.setUint32(rationalY+4,1,true);
  output.set(input,pixelOffset);
  return output;
}
