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
