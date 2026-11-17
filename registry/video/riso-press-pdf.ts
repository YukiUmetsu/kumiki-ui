import {inspectRisoSeparation} from "./riso-separation-master";
import type {RisoSeparationLayout,RisoSeparationPlate} from "./riso-separation-master";
import type {RisoPrintSpec} from "./print-plates";

/** RISO69: grayscale vector PDF for a SINGLE original physical spot master.
 * No embedded images, RGB streams, fonts, or PDF transparency are generated.
 * Actual SVG quadratic (Q) segments are converted analytically to cubic
 * Béziers. Original inner paper cutouts are preserved by PDF evenodd f*.
 * Unsupported source SVG commands FAIL; no silent path flattening. */
const finite=(v:number)=>Number.isFinite(v)&&Math.abs(v)<1e8;
const num=(n:number)=>{
  if(!finite(n))throw new RangeError("RISO69 PDF needs finite source geometry.");
  return String(Number(n.toFixed(5)));
};
const pdfMM=72/25.4;
const tokenizer=/[MmLlHhVvQqCcZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
const command=/^[MmLlHhVvQqCcZz]$/;
type Point=readonly [number,number];
/** Read the exact author Q command. No flattening: Q->cubic is algebraic. */
export function risoSvgPathToPdfOperators(path:string):string{
  if(typeof path!=="string"||!path||path.length>20000||
    /[^MmLlHhVvQqCcZz0-9eE,.\s+\-]/.test(path))
    throw new RangeError("RISO69 vector PDF supports only finite SVG M/L/H/V/Q/C/Z source paths.");
  const tokens=path.match(tokenizer)||[];
  if(tokens.join("")!==path.replace(/[\s,]/g,""))
    throw new RangeError("RISO69 malformed SVG path number/command sequence.");
  let i=0,cmd="",current:Point=[0,0],start:Point=[0,0],moved=false;
  const out:string[]=[];
  const read=()=>{
    if(i>=tokens.length||command.test(tokens[i]))
      throw new RangeError("RISO69 path command has missing coordinates.");
    const v=Number(tokens[i++]);
    if(!finite(v))throw new RangeError("RISO69 nonfinite path coordinate.");
    return v;
  };
  const xy=(rel:boolean):Point=>{
    const x=read(),y=read();
    return [rel?current[0]+x:x,rel?current[1]+y:y];
  };
  const draw=(p:Point,operator:"m"|"l")=>{
    current=p;out.push(num(p[0])+" "+num(p[1])+" "+operator);
  };
  while(i<tokens.length){
    if(command.test(tokens[i]))cmd=tokens[i++];
    if(!cmd)throw new RangeError("RISO69 PDF SVG source must start with M.");
    const upper=cmd.toUpperCase(),rel=upper!==cmd;
    if(!moved&&upper!=="M")throw new RangeError("RISO69 PDF first command must be M.");
    if(upper==="Z"){
      out.push("h");current=start;cmd="";continue;
    }
    if(upper==="M"){
      const point=xy(rel);draw(point,"m");start=point;moved=true;
      cmd=rel?"l":"L";continue;
    }
    if(upper==="L"){draw(xy(rel),"l");continue;}
    if(upper==="H"){
      const x=read();draw([rel?current[0]+x:x,current[1]],"l");continue;
    }
    if(upper==="V"){
      const y=read();draw([current[0],rel?current[1]+y:y],"l");continue;
    }
    if(upper==="C"){
      const p1=xy(rel),p2=xy(rel),p3=xy(rel);
      out.push([p1,p2,p3].map(p=>num(p[0])+" "+num(p[1])).join(" ")+" c");
      current=p3;continue;
    }
    if(upper==="Q"){
      const ctrl=xy(rel),end=xy(rel),p=current;
      // Unique cubic with the *same* quadratic curve, not sampled polyline.
      const c1:Point=[p[0]+2*(ctrl[0]-p[0])/3,p[1]+2*(ctrl[1]-p[1])/3];
      const c2:Point=[end[0]+2*(ctrl[0]-end[0])/3,end[1]+2*(ctrl[1]-end[1])/3];
      out.push([c1,c2,end].map(p=>num(p[0])+" "+num(p[1])).join(" ")+" c");
      current=end;continue;
    }
    throw new RangeError("RISO69 unsupported source path command.");
  }
  if(!moved||out[out.length-1]!=="h")
    throw new RangeError("RISO69 PDF expects a closed source contour.");
  return out.join("\n");
}
const enc=new TextEncoder();
function pdfDocument(stream:string,widthPt:number,heightPt:number):Uint8Array{
  const body=enc.encode(stream);
  const parts:Uint8Array[]=[];const offsets:number[]=[0];
  let length=0;
  const add=(s:string|Uint8Array)=>{
    const bytes=typeof s==="string"?enc.encode(s):s;
    parts.push(bytes);length+=bytes.length;
  };
  const obj=(i:number,value:string)=>{
    offsets[i]=length;add(i+" 0 obj\n"+value+"\nendobj\n");
  };
  add("%PDF-1.4\n%RISO69 native monochrome vector master\n");
  obj(1,"<< /Type /Catalog /Pages 2 0 R >>");
  obj(2,"<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3,"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "+
    num(widthPt)+" "+num(heightPt)+"] /Resources << >> /Contents 4 0 R >>");
  offsets[4]=length;
  add("4 0 obj\n<< /Length "+body.length+" >>\nstream\n");
  add(body);
  add("\nendstream\nendobj\n");
  const xref=length;
  add("xref\n0 5\n0000000000 65535 f \n");
  for(let i=1;i<=4;i++)
    add(String(offsets[i]).padStart(10,"0")+" 00000 n \n");
  add("trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n"+
    xref+"\n%%EOF\n");
  const pdf=new Uint8Array(length);
  let pos=0;
  for(const bytes of parts){pdf.set(bytes,pos);pos+=bytes.length;}
  return pdf;
}
/** Strict preflight, then one monochrome plate. No printer profile inferred. */
export function serializeRisoSeparationPdf(spec:RisoPrintSpec,
  masters:readonly RisoSeparationPlate[],
  layout:RisoSeparationLayout,plateId:string):Uint8Array{
  const report=inspectRisoSeparation(spec,masters,layout);
  if(!report.ready)throw new RangeError("RISO69 PDF export blocked by preflight: "+
    report.issues.map(i=>i.code).join(","));
  const plate=masters.find(p=>p.id===plateId);
  if(!plate)throw new RangeError("RISO69 PDF plate ID must exist in the source spec.");
  const [widthMm,heightMm]=report.sheetMm,t=report.trimMm,
    scale=report.scaleMmPerSourceUnit;
  const out:string[]=[
    "q",
    // Source-space Y is downward. Flip *once* to match real page mm coordinates.
    num(pdfMM)+" 0 0 "+num(-pdfMM)+" 0 "+num(heightMm*pdfMM)+" cm",
    "1 g",
    "0 0 "+num(widthMm)+" "+num(heightMm)+" re f",
    "q",
    num(scale)+" 0 0 "+num(scale)+" "+num(t.x)+" "+num(t.y)+" cm",
  ];
  for(const shape of plate.shapes){
    const gray=1-(shape.density??1);
    out.push(num(gray)+" g");
    out.push(risoSvgPathToPdfOperators(shape.outerPath));
    for(const cutout of shape.dryPaths??[])
      out.push(risoSvgPathToPdfOperators(cutout));
    out.push("f*"); // Evenodd material removal: original paper pores stay OPEN.
  }
  out.push("Q");
  if(report.marks.length){
    out.push("0 G","0.2 w");
    for(const mark of report.marks){
      out.push(num(mark.x1)+" "+num(mark.y1)+" m "+
        num(mark.x2)+" "+num(mark.y2)+" l S");
    }
  }
  out.push("Q","");
  return pdfDocument(out.join("\n"),widthMm*pdfMM,heightMm*pdfMM);
}
