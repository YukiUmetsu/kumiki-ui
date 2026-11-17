import {inspectRisoPrint} from "./print-plates";
import type {RisoPrintSpec} from "./print-plates";
import {flattenRisoSvgPath} from "./riso-path-geometry";
import type {RisoContourPoint} from "./riso-path-geometry";

/** RISO68: a grayscale stencil is NOT a screenshot of an RGB composite.
 * The caller supplies original independent native SVG positive-ink contours.
 * Each evenodd dry-fibre opening remains on its exact source plate. */
export interface RisoSeparationShape {
  readonly id:string;
  readonly outerPath:string;
  readonly dryPaths?:readonly string[];
  /** Ink coverage on this master: 1 is K100 black, .5 is K50 gray. */
  readonly density?:number;
  /** Critical content must lie in the safe trim inset. Bleed must remain inside the bleed band. */
  readonly role?:"critical"|"decorative"|"bleed";
}
export interface RisoSeparationPlate {
  readonly id:string;
  readonly shapes:readonly RisoSeparationShape[];
}
export interface RisoSeparationTrim {
  readonly x:number;
  readonly y:number;
  readonly width:number;
  readonly height:number;
}
/** All physical dimensions are millimeters, NOT source design pixels. */
export interface RisoSeparationLayout {
  readonly sheetMm:readonly [number,number];
  readonly trimMm:RisoSeparationTrim;
  readonly bleedMm:number;
  readonly safeMm:number;
  readonly printableInsetMm:number;
  /** Different print shops disagree: never add registration/crop marks implicitly. */
  readonly marks:"none"|"crop"|"crop-and-register";
}
export interface RisoSeparationIssue {
  readonly code:string;
  readonly message:string;
  readonly plateId?:string;
  readonly shapeId?:string;
}
export interface RisoSeparationLine {
  readonly x1:number;readonly y1:number;
  readonly x2:number;readonly y2:number;
  readonly kind:"crop"|"registration";
}
export interface RisoSeparationReport {
  readonly ready:boolean;
  readonly issues:readonly RisoSeparationIssue[];
  readonly sheetMm:readonly [number,number];
  readonly trimMm:RisoSeparationTrim;
  readonly bleedMm:number;
  readonly safeMm:number;
  readonly printableInsetMm:number;
  readonly scaleMmPerSourceUnit:number;
  readonly marks:readonly RisoSeparationLine[];
  readonly plateIds:readonly string[];
  readonly pathCount:number;
  readonly paperOpeningCount:number;
}

const finite=(v:number)=>Number.isFinite(v);
const bounded=(v:number,min:number,max:number)=>finite(v)&&v>=min&&v<=max;
const slug=(s:string)=>/^[a-z][a-z0-9-]{0,63}$/.test(s);
const near=(a:number,b:number)=>Math.abs(a-b)<=1e-7;
const r=(n:number)=>String(Number(n.toFixed(5)));
const within=(v:number,min:number,max:number)=>v>=min-1e-7&&v<=max+1e-7;
const xml=(v:string)=>v.replace(/&/g,"&amp;").replace(/"/g,"&quot;")
  .replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/'/g,"&apos;");
const rectContains=(box:RisoSeparationTrim,b:readonly [number,number,number,number])=>
  within(b[0],box.x,box.x+box.width)&&within(b[2],box.x,box.x+box.width)&&
  within(b[1],box.y,box.y+box.height)&&within(b[3],box.y,box.y+box.height);
const inset=(a:RisoSeparationTrim,mm:number):RisoSeparationTrim=>({
  x:a.x+mm,y:a.y+mm,width:a.width-2*mm,height:a.height-2*mm,
});
const expanded=(a:RisoSeparationTrim,mm:number):RisoSeparationTrim=>({
  x:a.x-mm,y:a.y-mm,width:a.width+2*mm,height:a.height+2*mm,
});
const bbox=(points:readonly RisoContourPoint[]):readonly [number,number,number,number]=>{
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const [x,y] of points){
    minX=Math.min(x,minX);minY=Math.min(y,minY);
    maxX=Math.max(x,maxX);maxY=Math.max(y,maxY);
  }
  return [minX,minY,maxX,maxY];
};
function markLines(layout:RisoSeparationLayout):readonly RisoSeparationLine[]{
  if(layout.marks==="none")return [];
  const {trimMm:t,bleedMm:bleed}=layout,offset=bleed+2,length=4;
  const left=t.x,right=t.x+t.width,top=t.y,bottom=t.y+t.height;
  const out:RisoSeparationLine[]=[];
  const line=(x1:number,y1:number,x2:number,y2:number,
    kind:"crop"|"registration")=>out.push({x1,y1,x2,y2,kind});
  for(const x of [left,right]){
    for(const y of [top,bottom]){
      const directionX=x===left?-1:1,directionY=y===top?-1:1;
      line(x+directionX*offset,y,x+directionX*(offset+length),y,"crop");
      line(x,y+directionY*offset,x,y+directionY*(offset+length),"crop");
    }
  }
  if(layout.marks==="crop-and-register"){
    const midX=(left+right)/2,midY=(top+bottom)/2;
    const distance=bleed+12,arm=2;
    for(const y of [top-distance,bottom+distance]){
      line(midX-arm,y,midX+arm,y,"registration");
      line(midX,y-arm,midX,y+arm,"registration");
    }
    for(const x of [left-distance,right+distance]){
      line(x-arm,midY,x+arm,midY,"registration");
      line(x,midY-arm,x,midY+arm,"registration");
    }
  }
  return out;
}
/** This is an author-controlled print-shop profile, never a machine default. */
export function inspectRisoSeparation(spec:RisoPrintSpec,
  plates:readonly RisoSeparationPlate[],
  layout:RisoSeparationLayout):RisoSeparationReport{
  const issues:RisoSeparationIssue[]=[];
  const error=(code:string,message:string,plateId?:string,shapeId?:string)=>
    issues.push({code,message,plateId,shapeId});
  if(!spec||!layout||!Array.isArray(plates))
    throw new RangeError("RISO68 needs an explicit source spec, native masters and print-shop layout.");
  const risoIssues=inspectRisoPrint(spec);
  for(const p of risoIssues)error("riso-spec",p.path+": "+p.message);
  if(risoIssues.length) return {
    ready:false,issues,sheetMm:layout.sheetMm,trimMm:layout.trimMm,
    bleedMm:layout.bleedMm,safeMm:layout.safeMm,
    printableInsetMm:layout.printableInsetMm,
    scaleMmPerSourceUnit:0,marks:[],plateIds:[],pathCount:0,paperOpeningCount:0,
  };
  const [sw,sh]=layout.sheetMm??[],t=layout.trimMm;
  if(!bounded(sw,30,600)||!bounded(sh,30,600)||!t||
    !bounded(t.x,0,600)||!bounded(t.y,0,600)||
    !bounded(t.width,10,600)||!bounded(t.height,10,600)||
    !bounded(layout.bleedMm,0,20)||!bounded(layout.safeMm,0,40)||
    !bounded(layout.printableInsetMm,0,40)||
    !["none","crop","crop-and-register"].includes(layout.marks))
    throw new RangeError("RISO68 requires finite physical sheet, trim, bleed, safe margin, printable inset and explicit marks policy.");
  const trimmed=rectContains({x:0,y:0,width:sw,height:sh},
    [t.x,t.y,t.x+t.width,t.y+t.height]);
  if(!trimmed)error("trim-outside-sheet","Trim rectangle must fit within the physical sheet.");
  const physicalAspect=t.width/t.height,sourceAspect=spec.width/spec.height;
  if(Math.abs(physicalAspect/sourceAspect-1)>.005)
    error("aspect-distortion","Trim proportions must match source geometry within 0.5%; no silent nonuniform stretching.");
  if(layout.safeMm*2>=Math.min(t.width,t.height))
    error("safe-empty","The declared trim-safe rectangle must have positive width and height.");
  const printable=inset({x:0,y:0,width:sw,height:sh},layout.printableInsetMm);
  if(printable.width<=0||printable.height<=0||
    !rectContains(printable,[t.x-layout.bleedMm,t.y-layout.bleedMm,
      t.x+t.width+layout.bleedMm,t.y+t.height+layout.bleedMm]))
    error("bleed-not-printable","Full trim plus bleed must fit inside the declared printable region.");
  const marks=markLines(layout);
  for(const m of marks){
    if(!rectContains(printable,[
      Math.min(m.x1,m.x2),Math.min(m.y1,m.y2),
      Math.max(m.x1,m.x2),Math.max(m.y1,m.y2),
    ]))error("marks-not-printable","Requested crop/registration marks exceed the declared printable area.");
  }
  if(!Array.isArray(plates)||plates.length!==spec.plates.length||
    plates.some((p,i)=>!p||p.id!==spec.plates[i].id))
    error("plate-order","Provide exactly one independent native grayscale master per declared spot plate, in press order.");
  const scale=t.width/spec.width;
  const safe=inset(t,layout.safeMm),bleed=expanded(t,layout.bleedMm);
  let pathCount=0,paperOpeningCount=0;
  for(const plate of plates){
    if(!plate||!slug(plate.id)||!spec.plates.some(p=>p.id===plate.id)||
      !Array.isArray(plate.shapes)||plate.shapes.length<1||plate.shapes.length>64){
      error("plate-shapes","Each declared master requires 1..64 named native source contours.",plate?.id);continue;
    }
    const names=new Set<string>();
    for(const shape of plate.shapes){
      if(!shape||!slug(shape.id)||names.has(shape.id)||
        !bounded(shape.density??1,0,1)||
        !["critical","decorative","bleed"].includes(shape.role??"decorative")||
        !Array.isArray(shape.dryPaths??[])||(shape.dryPaths??[]).length>180){
        error("shape-data","Source shape IDs, density, role and dry-fibre count must be valid.",plate.id,shape?.id);continue;
      }
      names.add(shape.id);
      try{
        const contours=flattenRisoSvgPath(shape.outerPath,.5);
        if(contours.length!==1||!contours[0].closed)
          throw new RangeError("Exactly one closed native source contour required.");
        const box=bbox(contours[0].points);
        const physical:readonly [number,number,number,number]=[
          t.x+box[0]*scale,t.y+box[1]*scale,
          t.x+box[2]*scale,t.y+box[3]*scale];
        if(!rectContains(bleed,physical))
          error("artwork-outside-bleed","Source artwork extends beyond the declared bleed rectangle.",plate.id,shape.id);
        if(!rectContains(printable,physical))
          error("artwork-not-printable","Original source artwork exceeds the printer-safe inset.",plate.id,shape.id);
        if((shape.role??"decorative")==="critical"&&!rectContains(safe,physical))
          error("critical-outside-safe","Critical source detail lies outside the trim-safe area.",plate.id,shape.id);
        pathCount++;
        for(const hole of shape.dryPaths??[]){
          const h=flattenRisoSvgPath(hole,.5);
          if(h.length!==1||!h[0].closed)
            throw new RangeError("Each original unprinted fibre must be one closed native subpath.");
          paperOpeningCount++;
        }
      }catch(e){
        error("invalid-source-path",e instanceof Error?e.message:String(e),plate.id,shape.id);
      }
    }
  }
  return {ready:issues.length===0,issues,sheetMm:layout.sheetMm,trimMm:t,
    bleedMm:layout.bleedMm,safeMm:layout.safeMm,
    printableInsetMm:layout.printableInsetMm,
    scaleMmPerSourceUnit:scale,marks,plateIds:spec.plates.map(p=>p.id),
    pathCount,paperOpeningCount};
}
export function grayscaleForRisoDensity(density:number):string{
  if(!bounded(density,0,1))throw new RangeError("RISO68 grayscale density must be 0..1.");
  const gray=Math.round(255*(1-density)).toString(16).padStart(2,"0");
  return "#"+gray+gray+gray;
}
/** Self-contained, 100% native grayscale SVG; no embedded RGB imagery,
 * text fonts, paper texture or post-processed colorized result.
 * Source geometry is printed at its nominal paper position. Spot register
 * offsets are intentionally NOT baked into independent production masters. */
export function serializeRisoSeparationMaster(spec:RisoPrintSpec,
  plates:readonly RisoSeparationPlate[],layout:RisoSeparationLayout,
  plateId:string):string{
  const report=inspectRisoSeparation(spec,plates,layout);
  if(!report.ready)throw new RangeError("RISO68 refused unsafe master export: "+
    report.issues.map(i=>i.code+(i.plateId?":"+i.plateId:"")).join("; "));
  const plate=plates.find(p=>p.id===plateId);
  if(!plate)throw new RangeError("RISO68 cannot export an undeclared physical spot plate.");
  const [sw,sh]=report.sheetMm,t=report.trimMm,scale=report.scaleMmPerSourceUnit;
  const chunks:string[]=[
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="'+r(sw)+'mm" height="'+r(sh)+'mm" viewBox="0 0 '+r(sw)+' '+r(sh)+'" data-km-riso68-master="'+xml(plateId)+'">',
    '<title>Grayscale spot stencil '+xml(plateId)+'</title>',
    '<desc>Independent editable grayscale vector master. Convert and proof with your print shop before production.</desc>',
    '<rect x="0" y="0" width="'+r(sw)+'" height="'+r(sh)+'" fill="#ffffff"/>',
    '<g data-km-riso68-artwork="" transform="translate('+r(t.x)+' '+r(t.y)+') scale('+r(scale)+')">',
  ];
  for(const shape of plate.shapes){
    const density=grayscaleForRisoDensity(shape.density??1);
    const d=[shape.outerPath,...(shape.dryPaths??[])].join(" ");
    chunks.push('<path data-km-riso68-source="'+xml(shape.id)+
      '" fill="'+density+'" stroke="none" fill-rule="evenodd" d="'+xml(d)+'"/>');
  }
  chunks.push("</g>");
  if(report.marks.length){
    chunks.push('<g data-km-riso68-marks="" fill="none" stroke="#000000" stroke-width="0.2">');
    for(const m of report.marks){
      chunks.push('<path data-km-riso68-mark="'+m.kind+'" d="M'+r(m.x1)+' '+r(m.y1)+
        ' L'+r(m.x2)+' '+r(m.y2)+'"/>');
    }
    chunks.push("</g>");
  }
  chunks.push("</svg>");
  return chunks.join("\n");
}
/** Same source-space coordinate grid for every master; no machine-specific promises. */
export function risoSeparationFilename(spec:RisoPrintSpec,plateId:string):string{
  const plate=spec.plates.find(p=>p.id===plateId);
  if(!plate||!slug(plateId))throw new RangeError("RISO68 filename needs an existing ink master.");
  return "riso-"+spec.width+"x"+spec.height+"-"+plateId+"-"+plate.color.slice(1).toLowerCase()+"-K.svg";
}
