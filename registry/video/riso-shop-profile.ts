import {inspectRisoSeparation} from "./riso-separation-master";
import type {RisoSeparationLayout,RisoSeparationPlate,RisoSeparationLine}
  from "./riso-separation-master";
import {flattenRisoSvgPath} from "./riso-path-geometry";
import type {RisoPrintSpec} from "./print-plates";

/** RISO70: printer policy is explicit shop-supplied DATA. This library does
 * NOT guess a printer model, unprintable leading edge, stock/ink calibration
 * or paper-feed tolerances from a color preview or a marketing specification. */
export type RisoPressFormat="pdf"|"tiff";
export type RisoFeedEdge="top"|"right"|"bottom"|"left";
export type RisoMarksRule="none"|"crop"|"crop-and-register"|"any";
export interface RisoShopProfile {
  readonly version:1;
  readonly id:string;
  readonly label:string;
  readonly provenance:"operator-entered"|"vendor-published";
  readonly sourceUrl?:string;
  /** Supported explicit physical sheet orientations, in millimeters. */
  readonly sheetSizesMm:readonly (readonly [number,number])[];
  /** Asymmetric unavailable edges measured from the physical sheet, mm. */
  readonly unprintableMm:Readonly<{top:number;right:number;bottom:number;left:number}>;
  readonly feedEdge:RisoFeedEdge;
  /** Vendor wants no marks, crop only, crop and register, or permits any. */
  readonly marks:RisoMarksRule;
  readonly fileFormat:RisoPressFormat|"either";
  readonly tiffPpi:readonly (300|600)[];
  readonly minBleedMm:number;
  readonly maxBleedMm:number;
}
export interface RisoShopJobIssue {
  readonly code:string;
  readonly message:string;
  readonly plateId?:string;
  readonly shapeId?:string;
}
export interface RisoShopJobReport {
  /** Geometry/file-policy only. NOT acceptance by a printer or press-proof. */
  readonly compatible:boolean;
  readonly issues:readonly RisoShopJobIssue[];
  readonly shopId:string;
  readonly profileSource:RisoShopProfile["provenance"];
  readonly feedEdge:RisoFeedEdge;
  readonly physicalPaperMm:readonly [number,number];
  readonly printableMm:Readonly<{x:number;y:number;width:number;height:number}>;
  readonly inspectedMarks:number;
  readonly inspectedInkContours:number;
}
const slug=/^[a-z][a-z0-9-]{0,63}$/;
const finite=(x:number,lo=0,hi=600)=>
  Number.isFinite(x)&&x>=lo&&x<=hi;
function validProfile(p:RisoShopProfile){
  if(!p||p.version!==1||!slug.test(p.id)||!p.label||
    p.label.length>100||!["operator-entered","vendor-published"].includes(p.provenance)||
    !["top","right","bottom","left"].includes(p.feedEdge)||
    !["none","crop","crop-and-register","any"].includes(p.marks)||
    !["pdf","tiff","either"].includes(p.fileFormat)||
    !Array.isArray(p.sheetSizesMm)||p.sheetSizesMm.length<1||
    p.sheetSizesMm.length>12||p.sheetSizesMm.some(pair=>
      !Array.isArray(pair)||pair.length!==2||
      !finite(pair[0],30)||!finite(pair[1],30))||
    !p.unprintableMm||Object.values(p.unprintableMm).some(v=>!finite(v,0,60))||
    !Array.isArray(p.tiffPpi)||p.tiffPpi.length<1||
    p.tiffPpi.some(v=>v!==300&&v!==600)||
    !finite(p.minBleedMm,0,20)||!finite(p.maxBleedMm,0,20)||
    p.minBleedMm>p.maxBleedMm||
    (p.provenance==="vendor-published"&&(!p.sourceUrl||
      !/^https:\/\//.test(p.sourceUrl))))
    throw new RangeError("RISO70 requires a complete bounded explicit printer profile; published profiles require a source HTTPS URL.");
}
const rect=(x:number,y:number,width:number,height:number)=>({x,y,width,height});
const inRect=(box:ReturnType<typeof rect>,x:number,y:number)=>
  x>=box.x-1e-8&&y>=box.y-1e-8&&
  x<=box.x+box.width+1e-8&&y<=box.y+box.height+1e-8;
function insideLine(box:ReturnType<typeof rect>,m:RisoSeparationLine){
  return inRect(box,m.x1,m.y1)&&inRect(box,m.x2,m.y2);
}
/** Source-native preflight, THEN per-side shop profile checks. Even a
 * "compatible" result does not verify an unobserved printer calibration. */
export function inspectRisoShopJob(
  spec:RisoPrintSpec,masters:readonly RisoSeparationPlate[],
  layout:RisoSeparationLayout,profile:RisoShopProfile,
  delivery:{format:RisoPressFormat;dpi?:300|600},
):RisoShopJobReport{
  validProfile(profile);
  if(!delivery||!["pdf","tiff"].includes(delivery.format)||
    (delivery.format==="tiff"&&delivery.dpi!==300&&delivery.dpi!==600))
    throw new RangeError("RISO70 delivery requires PDF or TIFF with explicit 300/600 PPI.");
  const parent=inspectRisoSeparation(spec,masters,layout);
  const issues:RisoShopJobIssue[]=parent.issues.map(x=>({...x}));
  const error=(code:string,message:string,plateId?:string,shapeId?:string)=>
    issues.push({code,message,plateId,shapeId});
  const [sw,sh]=layout.sheetMm;
  const {top,right,bottom,left}=profile.unprintableMm;
  const printable=rect(left,top,sw-left-right,sh-top-bottom);
  if(printable.width<=0||printable.height<=0)
    error("printer-area-empty","Declared asymmetric printable area has no width or height.");
  if(!profile.sheetSizesMm.some(([w,h])=>Math.abs(w-sw)<.01&&Math.abs(h-sh)<.01))
    error("sheet-not-supported","The profile does not list this exact physical sheet orientation.");
  if(profile.fileFormat!=="either"&&profile.fileFormat!==delivery.format)
    error("format-not-supported","This shop policy does not accept the selected master file format.");
  if(delivery.format==="tiff"&&!profile.tiffPpi.includes(delivery.dpi!))
    error("ppi-not-supported","This operator's profile does not accept the TIFF raster PPI.");
  if(profile.marks!=="any"&&layout.marks!==profile.marks)
    error("marks-policy","Exported crop/registration marks do not match this shop's declared policy.");
  if(layout.bleedMm<profile.minBleedMm||layout.bleedMm>profile.maxBleedMm)
    error("bleed-policy","Declared millimeter bleed does not match shop limits.");
  const t=layout.trimMm,b=layout.bleedMm;
  for(const [x,y] of [[t.x-b,t.y-b],[t.x+t.width+b,t.y+t.height+b]]){
    if(!inRect(printable,x,y))
      error("trim-bleed-outside-press","Trim plus declared bleed exceeds at least one asymmetric press edge.");
  }
  for(const mark of parent.marks){
    if(!insideLine(printable,mark))
      error("mark-outside-press","A physical crop/registration mark falls into the declared non-printable printer margin.");
  }
  let contours=0;
  if(parent.ready){
    const scale=parent.scaleMmPerSourceUnit;
    for(const plate of masters)for(const shape of plate.shapes){
      const source=flattenRisoSvgPath(shape.outerPath,.5)[0];
      contours++;
      for(const [x,y] of source.points){
        if(!inRect(printable,t.x+x*scale,t.y+y*scale)){
          error("ink-outside-press","Actual native ink path extends into a printer's unavailable physical margin.",plate.id,shape.id);
          break;
        }
      }
    }
  }
  return {compatible:issues.length===0,issues,shopId:profile.id,
    profileSource:profile.provenance,feedEdge:profile.feedEdge,
    physicalPaperMm:layout.sheetMm,printableMm:printable,
    inspectedMarks:parent.marks.length,inspectedInkContours:contours};
}
