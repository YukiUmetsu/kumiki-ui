import {inspectRisoSeparation,serializeRisoSeparationMaster}
  from "./riso-separation-master";
import type {RisoSeparationLayout,RisoSeparationPlate} from "./riso-separation-master";
import type {RisoPrintSpec} from "./print-plates";
import {measureRisoTiffRaster,encodeRisoGrayscaleTiff} from "./riso-press-tiff";
import type {RisoMasterPpi} from "./riso-press-tiff";

/** RISO69 browser adapter: rasterize ONE physical K-only SVG native master.
 * Canvas is an explicit DPI conversion boundary, not a rendered RGB
 * screenshot of the colored 2-drum composite. Preserves source outlines
 * in RISO68 SVG/PDF; TIFF necessarily quantizes to 300 or 600 PPI. */
export async function rasterizeRisoSeparationTiff(
  spec:RisoPrintSpec,masters:readonly RisoSeparationPlate[],
  layout:RisoSeparationLayout,plateId:string,dpi:RisoMasterPpi,
):Promise<Uint8Array>{
  if(typeof document==="undefined"||typeof Image==="undefined")
    throw new Error("RISO69 TIFF rasterization requires a browser canvas.");
  const audit=inspectRisoSeparation(spec,masters,layout);
  if(!audit.ready)throw new RangeError("RISO69 TIFF export blocked: "+
    audit.issues.map(i=>i.code).join(","));
  const {width,height,pixelCount}=measureRisoTiffRaster(layout,dpi);
  const svg=serializeRisoSeparationMaster(spec,masters,layout,plateId);
  const url=URL.createObjectURL(new Blob([svg],
    {type:"image/svg+xml;charset=utf-8"}));
  const graphic=new Image();
  try{
    await new Promise<void>((resolve,reject)=>{
      graphic.onload=()=>resolve();
      graphic.onerror=()=>reject(new RangeError(
        "RISO69 original native separation failed browser SVG decoding."));
      graphic.src=url;
    });
    const canvas=document.createElement("canvas");
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext("2d",{willReadFrequently:true});
    if(!ctx)throw new Error("RISO69 grayscale raster cannot access a 2D canvas.");
    ctx.fillStyle="#ffffff";ctx.fillRect(0,0,width,height);
    ctx.drawImage(graphic,0,0,width,height);
    const rgba=ctx.getImageData(0,0,width,height).data;
    const gray=new Uint8Array(pixelCount);
    let nonGray=0;
    for(let j=0,i=0;j<gray.length;j++,i+=4){
      const red=rgba[i],green=rgba[i+1],blue=rgba[i+2],alpha=rgba[i+3]/255;
      if(Math.max(red,green,blue)-Math.min(red,green,blue)>2)nonGray++;
      gray[j]=Math.round(((red+green+blue)/3)*alpha+255*(1-alpha));
    }
    if(nonGray>0)throw new RangeError(
      "RISO69 refuses RGB/non-monochrome pixels in the physical grayscale master.");
    canvas.width=0;canvas.height=0;
    return encodeRisoGrayscaleTiff(gray,{width,height,pixelCount,dpi,
      sheetMm:layout.sheetMm});
  }finally{
    graphic.src="";
    URL.revokeObjectURL(url);
  }
}
