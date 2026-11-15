/**
 * ArtCraft v7 negative-only face-value evidence.
 * Five *source-observed* tonal regions of a legally sourced CC0 reference,
 * registered in the 540x600 full-head proof canvas. These are NOT independent
 * output-landmark annotations and never constitute artistic sign-off.
 *
 * The regions were manually selected on the actual Storybook source screenshot
 * 285x318 at: pupil (135,130), orbital fold (134,112), jaw shadow (142,229),
 * cheek halftone (116,166), forehead light (156,75). Normalizing the image
 * allows the same rectangles in the separately rendered proof/output.
 */
export const CC0_FACE_VALUE_REGIONS=[
  {name:"Iris deep",x:135/285,y:130/318,r:3/285},
  {name:"Orbital shadow",x:134/285,y:112/318,r:4/285},
  {name:"Jaw core",x:142/285,y:229/318,r:5/285},
  {name:"Cheek halftone",x:116/285,y:166/318,r:5/285},
  {name:"Forehead light",x:156/285,y:75/318,r:4/285},
] as const;
export interface PencilTonePixelGrid {
  width:number;height:number;data:Uint8ClampedArray;
}
export interface PencilToneRegionReport {
  name:string;sourceLuminance:number;drawnLuminance:number;
  /** Positive values mean the pencil drawing is too pale at this area. */
  lightnessDeficit:number;
}
export interface PencilToneComparison {
  regions:readonly PencilToneRegionReport[];
  sourceRange:number;
  drawnRange:number;
  /** 1.0 retains source facial contrast; 0.0 is fully value-collapsed. */
  contrastRetention:number;
  meanAbsoluteValueError:number;
  /** Negative filter ONLY. A true result cannot certify visual likeness. */
  severeValueCollapse:boolean;
  artisticApproval:false;
}
const lum=(r:number,g:number,b:number)=>
  .2126*r+.7152*g+.0722*b;
const validate=(pixels:PencilTonePixelGrid)=>{
  if(!Number.isSafeInteger(pixels.width)||!Number.isSafeInteger(pixels.height)||
    pixels.width<200||pixels.height<200||
    pixels.width>4096||pixels.height>4096||
    !(pixels.data instanceof Uint8ClampedArray)||
    pixels.data.length!==pixels.width*pixels.height*4)
    throw new RangeError("Invalid image pixels for portrait tone comparison");
};
const sample=(pixels:PencilTonePixelGrid,x:number,y:number,r:number)=>{
  const cx=Math.round(x*pixels.width),cy=Math.round(y*pixels.height);
  const half=Math.max(2,Math.round(r*pixels.width));
  let sum=0,n=0;
  for(let yy=Math.max(0,cy-half);yy<Math.min(pixels.height,cy+half+1);yy++){
    for(let xx=Math.max(0,cx-half);xx<Math.min(pixels.width,cx+half+1);xx++){
      const idx=4*(yy*pixels.width+xx);
      if(pixels.data[idx+3]!==255)
        throw new RangeError("Portrait tonal evidence requires opaque source and output");
      sum+=lum(pixels.data[idx],pixels.data[idx+1],pixels.data[idx+2]);n++;
    }
  }
  return sum/n;
};
export const compareCC0PortraitTones=(
  source:PencilTonePixelGrid,drawing:PencilTonePixelGrid,
):PencilToneComparison=>{
  validate(source);validate(drawing);
  if(source.width!==drawing.width||source.height!==drawing.height)
    throw new RangeError("Face value evidence must use identical canvas dimensions");
  const regions=CC0_FACE_VALUE_REGIONS.map(({name,x,y,r})=>{
    const sourceLuminance=sample(source,x,y,r);
    const drawnLuminance=sample(drawing,x,y,r);
    return {name,sourceLuminance,drawnLuminance,
      lightnessDeficit:drawnLuminance-sourceLuminance};
  });
  const sourceValues=regions.map(v=>v.sourceLuminance);
  const drawnValues=regions.map(v=>v.drawnLuminance);
  const sourceRange=Math.max(...sourceValues)-Math.min(...sourceValues);
  const drawnRange=Math.max(...drawnValues)-Math.min(...drawnValues);
  // A flat source must not pass by dividing by a tiny denominator.
  const contrastRetention=sourceRange>10?drawnRange/sourceRange:0;
  const meanAbsoluteValueError=regions.reduce((sum,v)=>
    sum+Math.abs(v.lightnessDeficit),0)/regions.length;
  return {regions,sourceRange,drawnRange,contrastRetention,
    meanAbsoluteValueError,
    severeValueCollapse:sourceRange<=10||contrastRetention<.65||
      meanAbsoluteValueError>55,
    artisticApproval:false};
};

/**
 * The near-black photographed left ear/hair lock was missing in v6:
 * source ≈3/255, output ≈113/255 at (75,230) in 285×318 Storybook.
 * This exact reference-registered negative gate prevents an ivory seam.
 * It is independent of the five facial-tone rectangles and never
 * approves a portrait's likeness, neck anatomy or pencil material.
 */
export const CC0_HAIR_OCCLUSION_PROBE={
  x:75/285,y:230/318,r:3/285,
} as const;
export interface CC0HairOcclusionResult {
  sourceLuminance:number;
  drawnLuminance:number;
  lightnessDeficit:number;
  /** A false value does NOT imply professional artistic approval. */
  missingDarkLock:boolean;
  artisticApproval:false;
}
export const compareCC0HairOcclusion=(
  source:PencilTonePixelGrid,drawing:PencilTonePixelGrid,
):CC0HairOcclusionResult=>{
  validate(source);validate(drawing);
  if(source.width!==drawing.width||source.height!==drawing.height)
    throw new RangeError("Hair occlusion samples need matched canvas sizes");
  const {x,y,r}=CC0_HAIR_OCCLUSION_PROBE;
  const sourceLuminance=sample(source,x,y,r);
  const drawnLuminance=sample(drawing,x,y,r);
  // If a future source crop moved, reject an invalid proof; an ivory
  // seam should not be excused by a mismatched bright reference.
  const missingDarkLock=sourceLuminance>=30||drawnLuminance>=105||
    drawnLuminance-sourceLuminance>95;
  return {sourceLuminance,drawnLuminance,
    lightnessDeficit:drawnLuminance-sourceLuminance,
    missingDarkLock,artisticApproval:false};
};

/**
 * Two separately observed PHOTO vermilion cores. Previous PR #361
 * source/dry 7×7-luma: upper 75.3→113.0, lower 110.6→150.9.
 * Source-measured mid-lip Bézier geometry and dry-fibre deposition should
 * not regress to these paper-pale values. The linked marker is the actual
 * 285×318 CC0 browser screenshot, not a generic lip-shape classifier.
 * Passing this negative filter CANNOT verify resemblance or craftsmanship.
 */
export const CC0_VERMILION_PROBES=[
  {name:"upper",x:180/285,y:188/318,r:3/285,
    sourceLimit:135,lightnessLimit:25},
  {name:"lower",x:194/285,y:201/318,r:3/285,
    sourceLimit:170,lightnessLimit:36},
] as const;
export interface CC0VermilionResult {
  readonly regions:readonly {
    name:"upper"|"lower";
    sourceLuminance:number;
    drawnLuminance:number;
    lightnessDeficit:number;
  }[];
  /** Rejection-only, NOT artist approval. */
  readonly missingVermilionPigment:boolean;
  readonly artisticApproval:false;
}
export const compareCC0Vermilion=(
  source:PencilTonePixelGrid,drawing:PencilTonePixelGrid,
):CC0VermilionResult=>{
  validate(source);validate(drawing);
  if(source.width!==drawing.width||source.height!==drawing.height)
    throw new RangeError("Vermilion probes need identical canvas registration");
  const regions=CC0_VERMILION_PROBES.map(p=>({
    name:p.name,
    sourceLuminance:sample(source,p.x,p.y,p.r),
    drawnLuminance:sample(drawing,p.x,p.y,p.r),
    lightnessDeficit:
      sample(drawing,p.x,p.y,p.r)-sample(source,p.x,p.y,p.r),
  }));
  const missingVermilionPigment=regions.some((region,index)=>
    region.sourceLuminance>=CC0_VERMILION_PROBES[index].sourceLimit||
    region.lightnessDeficit>=
      CC0_VERMILION_PROBES[index].lightnessLimit);
  return {regions,missingVermilionPigment,artisticApproval:false};
};

/**
 * Three PHOTO-registered facial planes that were too chalk-white in
 * the prior PR #365 output. Coordinates refer to the same 285×318 CC0
 * browser crop and never to a guessed generic head or stock painting.
 * Negative-only acceptance cannot certify realistic skin material.
 */
export const CC0_SKIN_COVERAGE_PROBES=[
  {name:"cheek",x:119/285,y:164/318,r:3/285,
    sourceLimit:230,lightnessLimit:30},
  {name:"under-eye",x:136/285,y:118/318,r:3/285,
    sourceLimit:150,lightnessLimit:26},
  {name:"chin",x:163/285,y:215/318,r:3/285,
    sourceLimit:210,lightnessLimit:29},
] as const;
export interface CC0SoftSkinResult {
  readonly regions:readonly{
    name:"cheek"|"under-eye"|"chin";
    sourceLuminance:number;
    drawnLuminance:number;
    lightnessDeficit:number;
  }[];
  readonly missingOpticalCoverage:boolean;
  readonly artisticApproval:false;
}
export const compareCC0SoftSkin=(
  source:PencilTonePixelGrid,drawing:PencilTonePixelGrid,
):CC0SoftSkinResult=>{
  validate(source);validate(drawing);
  if(source.width!==drawing.width||source.height!==drawing.height)
    throw new RangeError("Soft-skin regions require matching photo and drawing canvases");
  const regions=CC0_SKIN_COVERAGE_PROBES.map(p=>{
    const sourceLuminance=sample(source,p.x,p.y,p.r);
    const drawnLuminance=sample(drawing,p.x,p.y,p.r);
    return {name:p.name,sourceLuminance,drawnLuminance,
      lightnessDeficit:drawnLuminance-sourceLuminance};
  });
  const missingOpticalCoverage=regions.some((r,index)=>
    r.sourceLuminance>=CC0_SKIN_COVERAGE_PROBES[index].sourceLimit||
    r.lightnessDeficit>=
      CC0_SKIN_COVERAGE_PROBES[index].lightnessLimit);
  return {regions,missingOpticalCoverage,artisticApproval:false};
};

/**
 * Reference-measured facial LIGHT plane probes. The source is NOT white:
 * Y≈202 at malar and ≈199 at nasal bridge. Earlier v7 incorrectly
 * treated both as unpigmented paper, rendering ≈241/236 respectively.
 * These are negative-only material observations of Christopher Campbell's
 * licensed CC0 head, measured in a 285x318 real browser source screenshot.
 */
export const CC0_LUMINOUS_SKIN_PROBES=[
  {name:"malar",x:114/285,y:148/318,r:3/285,
    sourceMax:225,deficitMax:30},
  {name:"nasal-bridge",x:176/285,y:142/318,r:3/285,
    sourceMax:225,deficitMax:32},
] as const;
export interface CC0LuminousSkinResult {
  readonly regions:readonly {
    name:"malar"|"nasal-bridge";
    sourceLuminance:number;drawnLuminance:number;
    lightnessDeficit:number;
  }[];
  readonly missingPhotographedLightSkin:boolean;
  readonly artisticApproval:false;
}
export const compareCC0LuminousSkin=(
  source:PencilTonePixelGrid,drawing:PencilTonePixelGrid,
):CC0LuminousSkinResult=>{
  validate(source);validate(drawing);
  if(source.width!==drawing.width||source.height!==drawing.height)
    throw new RangeError("Bright facial plane proof requires matching registered canvases");
  const regions=CC0_LUMINOUS_SKIN_PROBES.map(p=>{
    const sourceLuminance=sample(source,p.x,p.y,p.r);
    const drawnLuminance=sample(drawing,p.x,p.y,p.r);
    return {name:p.name,sourceLuminance,drawnLuminance,
      lightnessDeficit:drawnLuminance-sourceLuminance};
  });
  const missingPhotographedLightSkin=regions.some((region,i)=>
    region.sourceLuminance>=CC0_LUMINOUS_SKIN_PROBES[i].sourceMax||
    region.lightnessDeficit>=CC0_LUMINOUS_SKIN_PROBES[i].deficitMax);
  return {regions,missingPhotographedLightSkin,artisticApproval:false};
};
