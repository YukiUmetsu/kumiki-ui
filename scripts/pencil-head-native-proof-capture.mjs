/**
 * ArtCraft CP-F1 Stage-1 source-to-SVG/native-render proof capture.
 *
 * Important: this module reads ACTUAL local photo/screenshot bytes to hash
 * and measure their pixels. It never supplies an image to the character
 * renderer or silently derives photographic measurements from the ANAT1
 * mesh. The named 18 source/render contour landmarks remain INDEPENDENT
 * human annotations; a successful capture is not artist approval.
 *
 * Run: node scripts/pencil-head-native-proof-capture.mjs
 *   --source /path/photo.jpg --render /path/native-final.png
 *   --annotations /path/independently-annotated-18-5.json > evidence.json
 *
 * Exact license text and photographer credit must be audited separately;
 * the capture tool cannot adjudicate authorship/likeness rights.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const MAX_BYTES=32*1024*1024;
const MAX_PIXELS=60_000_000;
const PNG_SIGNATURE=Buffer.from([137,80,78,71,13,10,26,10]);

function sniffImageMime(bytes){
  if(bytes.subarray(0,8).equals(PNG_SIGNATURE))return "image/png";
  if(bytes.length>3&&bytes[0]===255&&bytes[1]===216&&
    bytes[bytes.length-2]===255&&bytes[bytes.length-1]===217)
    return "image/jpeg";
  throw new Error("File has no valid PNG or JPEG image signature");
}

function checkRect(rect,dimensions){
  if(!rect||!["x","y","width","height"].every(k=>
    Number.isSafeInteger(rect[k]))||
    rect.x<0||rect.y<0||rect.width<3||rect.height<3)
    throw new RangeError("Tone sample rect must use positive integer x/y/width/height (>=3)");
  if(rect.x+rect.width>dimensions.width||
    rect.y+rect.height>dimensions.height)
    throw new RangeError("Tone sample rectangle outside native image bounds");
}
function overlaps(a,b){
  return Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)&&
    Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y);
}

/** Load LOCAL image bytes; browser decodes the unchanged actual pixels.
 * No URL fetch is allowed and neither source nor output pixels are returned.
 */
export async function measureExactLocalImage({file,tones},browser){
  if(typeof file!=="string"||!file.trim())
    throw new TypeError("Local photo/screenshot file path is required");
  if(!Array.isArray(tones)||tones.length<1||tones.length>18)
    throw new TypeError("One to eighteen independently chosen tone sample rectangles required");
  const ids=tones.map(t=>t?.id);
  if(ids.some(id=>typeof id!=="string"||!id)||
    new Set(ids).size!==ids.length)
    throw new TypeError("Tone sample IDs must be unique, nonempty strings");
  const bytes=await readFile(file);
  if(bytes.length>MAX_BYTES||bytes.length<16)
    throw new RangeError("Native source file exceeds proof size limit or is empty");
  const mime=sniffImageMime(bytes);
  const sha256=createHash("sha256").update(bytes).digest("hex");
  const own=!browser,engine=browser??await chromium.launch({headless:true});
  const page=await engine.newPage({viewport:{width:800,height:600}});
  try{
    const image=await page.evaluate(async({base64,mime,rectangles,maxPixels})=>{
      const img=new Image();
      img.src="data:"+mime+";base64,"+base64;
      await img.decode();
      const width=img.naturalWidth,height=img.naturalHeight;
      if(width<64||height<64||width>50000||height>50000||
        width*height>maxPixels)
        throw new Error("Decoded source image dimensions exceed supported proof bounds");
      const canvas=document.createElement("canvas");
      canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext("2d",{willReadFrequently:true});
      if(!ctx)throw new Error("Native browser Canvas2D unavailable for image proof");
      // All-pixel white paper beneath transparent PNG samples; no alpha
      // edge should be mistaken for black "core shadow".
      ctx.fillStyle="#fff";
      ctx.fillRect(0,0,width,height);
      ctx.drawImage(img,0,0);
      const means=rectangles.map((tone)=>{
        const rect=tone.rect;
        if(!rect||!["x","y","width","height"].every(k=>
          Number.isSafeInteger(rect[k]))||
          rect.x<0||rect.y<0||rect.width<3||rect.height<3||
          rect.x+rect.width>width||rect.y+rect.height>height)
          throw new Error("Tone sample rect outside native image bounds");
        const pixels=ctx.getImageData(rect.x,rect.y,
          rect.width,rect.height).data;
        let rr=0,gg=0,bb=0;
        for(let i=0;i<pixels.length;i+=4){
          rr+=pixels[i];gg+=pixels[i+1];bb+=pixels[i+2];
        }
        const count=pixels.length/4;
        return {id:tone.id,rect,
          meanRgb:[Math.round(rr/count),Math.round(gg/count),
            Math.round(bb/count)]};
      });
      return {width,height,tones:means};
    },{base64:bytes.toString("base64"),mime,
      rectangles:tones,maxPixels:MAX_PIXELS});
    // Validate the FULL ROI set only after actual intrinsic dimensions
    // were decoded, never based on declared width/height in metadata.
    for(const t of tones)checkRect(t.rect,image);
    for(let i=0;i<tones.length;i++)for(let j=i+1;j<tones.length;j++){
      if(overlaps(tones[i].rect,tones[j].rect))
        throw new RangeError("Tone sample ROIs overlap; sample separate real image regions");
    }
    return {width:image.width,height:image.height,sha256,tones:image.tones};
  }finally{
    await page.close();
    if(own)await engine.close();
  }
}

/** Emit evaluator-compatible evidence with real hashes/dimensions/mean RGB.
 * Photo source, permission and both sets of semantic contour points are
 * user-supplied annotations, never synthesized from the image/mesh.
 */
export async function captureHeadPhotoEvidence({
  sourceFile,renderFile,source,sourceLandmarks,outputLandmarks,
  sourceTones,outputTones,
},browser){
  if(!source||typeof source.url!=="string"||
    !source.url.startsWith("https://")||
    typeof source.license!=="string"||!source.license||
    typeof source.credit!=="string"||!source.credit.trim())
    throw new TypeError("Source URL (HTTPS), credit and exact verified license must be supplied");
  if(!Array.isArray(sourceLandmarks)||!Array.isArray(outputLandmarks))
    throw new TypeError("Independent source/render landmark arrays are required");
  const own=!browser,engine=browser??await chromium.launch({headless:true});
  try{
    const a=await measureExactLocalImage({file:sourceFile,tones:sourceTones},engine);
    const b=await measureExactLocalImage({file:renderFile,tones:outputTones},engine);
    if(a.sha256===b.sha256)
      throw new Error("SOURCE_RENDER_SAME_HASH: original source and native render cannot be identical files");
    return {
      source:{url:source.url,license:source.license,credit:source.credit,
        width:a.width,height:a.height,sha256:a.sha256},
      output:{width:b.width,height:b.height,sha256:b.sha256},
      sourceLandmarks,outputLandmarks,
      sourceTones:a.tones,outputTones:b.tones,
    };
  }finally{if(own)await engine.close();}
}

async function main(args){
  const flags={};
  for(let i=0;i<args.length;i+=2){
    if(!["--source","--render","--annotations"].includes(args[i])||
      !args[i+1]||flags[args[i]])
      throw new Error("Usage: node scripts/pencil-head-native-proof-capture.mjs --source photo.jpg --render native.png --annotations semantic-rois.json");
    flags[args[i]]=args[i+1];
  }
  if(Object.keys(flags).length!==3)
    throw new Error("Specify --source, --render, and --annotations local file paths");
  const annotation=JSON.parse(await readFile(flags["--annotations"],"utf8"));
  const proof=await captureHeadPhotoEvidence({
    ...annotation,sourceFile:flags["--source"],renderFile:flags["--render"],
  });
  process.stdout.write(JSON.stringify(proof,null,2)+"\n");
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  main(process.argv.slice(2)).catch(error=>{
    process.stderr.write("Native head proof failed: "+error.message+"\n");
    process.exitCode=1;
  });
}
