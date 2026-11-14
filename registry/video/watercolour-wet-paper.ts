/**
 * WM4: finite-volume wet pigment transport on a small, fixed paper grid.
 * This is a deliberately bounded, qualitative watercolor model, not spectral
 * pigment chemistry. Mobile pigment diffuses while paper is wet, and transfers
 * into an irreversible sediment field as the paper dries.
 * 
 * All simulation inputs are serializable. The result is a pure function of the
 * ABSOLUTE film frame; seeking and reduced motion cannot change the outcome.
 */
import { paintHash } from "./watercolour-brush";

export interface WetPigmentDrop {
  id: string;
  x: number;
  y: number;
  radius: number;
  pigment: string;
  /** 0..1 pigment mass. */
  load: number;
  /** 0..1 initial paper wetness. */
  water: number;
  /** Absolute film frame of this painted deposit. */
  startFrame: number;
  /** Optional pressure-guided wet brush path in paper coordinates. */
  path?: readonly { x: number; y: number; pressure: number }[];
}
export interface WetPaperSpec {
  version: 1;
  width: number;
  height: number;
  seed: number;
  paper: { color: string; tooth: number };
  /** Grid pitch in paper pixels. Use 20..32 for a production first pass. */
  cellSize: number;
  /** 0..1 inter-cell fluid mobility. */
  flow: number;
  /** 0..1 paper-dependent pigment settlement irregularity. */
  granulation: number;
  /** Frames after the last drop before the dry state is permanently held. */
  dryFrames: number;
  /** Optional 0..1 outward wet-front transport that deposits pigment along drying edges. */
  edgePooling?: number;
  /** Painted subject silhouettes. Pigment and water cannot cross these boundaries. */
  paintAreas?: readonly (readonly { x: number; y: number }[])[];
  /** Artist-preserved unpainted paper in SVG coordinates; wax/masking-fluid style. */
  reservePaths?: readonly string[];
  drops: readonly WetPigmentDrop[];
}
export interface WetPaperIssue { code: string; path: string; message: string }
export interface WetPaperCell {
  x: number; y: number; width: number; height: number;
  pigment: string; opacity: number; wetness: number; sediment: number; edgeDensity: number;
}
export interface WetPaperFrame {
  columns: number; rows: number; cellWidth: number; cellHeight: number;
  cells: readonly WetPaperCell[];
  /** Pigment mass is conserved under transport and sedimentation (within FP rounding). */
  totalPigment: number;
  wetness: number;
  settled: boolean;
  dryFrame: number;
}
const HEX = /^#[0-9a-f]{6}$/i;
const finite = (n: number, a: number, b: number) => Number.isFinite(n) && n >= a && n <= b;
const integer = (n: number, a: number, b: number) => Number.isSafeInteger(n) && n >= a && n <= b;
const clamp = (n: number) => Math.max(0, Math.min(1, n));

export function inspectWetPaper(spec: WetPaperSpec): WetPaperIssue[] {
  const issues: WetPaperIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({code,path,message});
  if (!spec || spec.version !== 1) {
    add("version","/version","Expected WM4 version 1."); return issues;
  }
  if (!integer(spec.width,240,8192)) add("width","/width","Width must be 240..8192.");
  if (!integer(spec.height,240,8192)) add("height","/height","Height must be 240..8192.");
  if (!integer(spec.seed,0,2147483647)) add("seed","/seed","Seed must be a nonnegative 31-bit integer.");
  if (!spec.paper || !HEX.test(spec.paper.color)) add("paper","/paper/color","Paper color must be six-digit hex.");
  if (!spec.paper || !finite(spec.paper.tooth,0,1)) add("tooth","/paper/tooth","Paper tooth must be 0..1.");
  if (!integer(spec.cellSize,12,64)) add("cellSize","/cellSize","Cell size must be 12..64 whole paper pixels.");
  if (!finite(spec.flow,0,1)) add("flow","/flow","Flow must be 0..1.");
  if (!finite(spec.granulation,0,1)) add("granulation","/granulation","Granulation must be 0..1.");
  if(spec.edgePooling!==undefined && !finite(spec.edgePooling,0,1))
    add("edge-pooling","/edgePooling","Edge pooling must be 0..1.");
  if(spec.paintAreas!==undefined && (
    !Array.isArray(spec.paintAreas) || spec.paintAreas.length<1 || spec.paintAreas.length>48 ||
    spec.paintAreas.some(poly=>!Array.isArray(poly) || poly.length<3 || poly.length>64 ||
      poly.some(p=>!p || !finite(p.x,0,spec.width) || !finite(p.y,0,spec.height)) ||
      Math.abs(poly.reduce((acc,p,i)=>{
        const q=poly[(i+1)%poly.length];return acc+p.x*q.y-q.x*p.y;
      },0))<2)))
    add("paint-areas","/paintAreas","Use 1..48 nondegenerate polygons of 3..64 paper-space vertices each.");
  if (!integer(spec.dryFrames,24,360)) add("dryFrames","/dryFrames","Drying must last 24..360 frames.");
  if (integer(spec.width,240,8192) && integer(spec.height,240,8192) &&
      integer(spec.cellSize,12,64) &&
      Math.ceil(spec.width/spec.cellSize)*Math.ceil(spec.height/spec.cellSize)>4096)
    add("grid-budget","/cellSize","Choose a coarser grid: maximum 4096 cells.");
  const legalPath=(path:unknown)=>typeof path==="string" && path.length>=4 &&
    path.length<=65536 && /^[Mm]\s*[-+.\d]/.test(path) &&
    /^[MmLlHhVvCcSsQqTtAaZz0-9eE,\s.+-]+$/.test(path);
  if (spec.reservePaths!==undefined &&
      (!Array.isArray(spec.reservePaths) || spec.reservePaths.length>32 ||
        spec.reservePaths.some(path=>!legalPath(path))))
    add("reserves","/reservePaths","Use up to 32 safe SVG paper-preserve paths.");
  if (!Array.isArray(spec.drops) || spec.drops.length<1 || spec.drops.length>24) {
    add("drops","/drops","Provide 1..24 pigment deposits."); return issues;
  }
  const ids=new Set<string>();
  let first=Infinity, last=0;
  spec.drops.forEach((d,i)=>{
    const p="/drops/"+i;
    if (!d || typeof d.id!=="string" || !/^[a-z][a-z0-9-]{0,39}$/.test(d.id) || ids.has(d.id))
      add("id",p+"/id","Deposit ID must be unique kebab-case.");
    else ids.add(d.id);
    if (!d || !finite(d.x,0,spec.width) || !finite(d.y,0,spec.height)) add("position",p,"Drop must lie on the paper.");
    if (!d || !finite(d.radius,4,600)) add("radius",p+"/radius","Radius must be 4..600 paper pixels.");
    if (!d || !HEX.test(d.pigment)) add("pigment",p+"/pigment","Pigment must be six-digit hex.");
    if (!d || !finite(d.load,0,1)) add("load",p+"/load","Load must be 0..1.");
    if (!d || !finite(d.water,0,1)) add("water",p+"/water","Water must be 0..1.");
    if (!d || !integer(d.startFrame,0,10000000)) add("startFrame",p+"/startFrame","Frame must be a nonnegative integer.");
    if (d?.path !== undefined && (!Array.isArray(d.path) || d.path.length < 2 || d.path.length > 64 ||
        d.path.some((q: {x:number;y:number;pressure:number}) => !q || !finite(q.x,0,spec.width) || !finite(q.y,0,spec.height) || !finite(q.pressure,.03,1)) ||
        d.path.every((q: {x:number;y:number;pressure:number}) => q.x === d.path![0].x && q.y === d.path![0].y)))
      add("path",p+"/path","Wet brush needs 2..64 distinct in-bounds pressure points.");
    if (d && Number.isSafeInteger(d.startFrame)) {
      first=Math.min(first,d.startFrame); last=Math.max(last,d.startFrame);
    }
  });
  if (last-first>720) add("time-budget","/drops","Deposits must fit within a 720-frame film window.");
  return issues;
}

/** Even-odd silhouette test in paper coordinates, independent of the DOM. */
export function insideWetPaintArea(x:number,y:number,
  polygons:readonly (readonly {x:number;y:number}[])[]):boolean {
  for(const vertices of polygons){
    let inside=false;
    for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){
      const a=vertices[i],b=vertices[j];
      if((a.y>y)!==(b.y>y)){
        if(x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
      }
    }
    if(inside)return true;
  }
  return false;
}

const rgb = (hex: string): [number,number,number] => [
  parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16),
];
const toHex = (r:number,g:number,b:number):string =>
  "#"+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("").toUpperCase();

/** Pure reference simulation using paper-space cells and stable 4-neighbor flux.
 * Each mobile/fixed RGB array stores color-weighted pigment mass, not a color
 * sample: transport changes location while preserving total pigment mass.
 */
export function evaluateWetPaper(spec: WetPaperSpec, frame: number, reducedMotion=false):WetPaperFrame {
  const issues=inspectWetPaper(spec);
  if (issues.length) throw new RangeError("Invalid wet paper: "+issues.map(e=>e.path).join(", "));
  if (!integer(frame,0,10000000)) throw new RangeError("Wet-paper frame must be a nonnegative integer.");
  const cols=Math.ceil(spec.width/spec.cellSize),rows=Math.ceil(spec.height/spec.cellSize);
  const dx=spec.width/cols,dy=spec.height/rows,n=cols*rows;
  const first=Math.min(...spec.drops.map(d=>d.startFrame));
  const dryFrame=Math.max(...spec.drops.map(d=>d.startFrame))+spec.dryFrames;
  const target=reducedMotion?dryFrame:Math.min(frame,dryFrame);
  // Compute polygon bounding boxes once per render; otherwise many fine
  // subject leaves would retest every vertex for every untouched paper cell.
  const boundedAreas=spec.paintAreas?.map(poly=>({
    poly,minX:Math.min(...poly.map(p=>p.x)),maxX:Math.max(...poly.map(p=>p.x)),
    minY:Math.min(...poly.map(p=>p.y)),maxY:Math.max(...poly.map(p=>p.y)),
  }));
  const active=boundedAreas?
    Array.from({length:n},(_,i)=>{
      const x=(i%cols+.5)*dx,y=(Math.floor(i/cols)+.5)*dy;
      return boundedAreas.some(a=>x>=a.minX && x<=a.maxX &&
        y>=a.minY && y<=a.maxY && insideWetPaintArea(x,y,[a.poly]));
    }):
    Array.from({length:n},()=>true);
  if(!active.some(Boolean))throw new RangeError("Paint areas have no coverage at this grid resolution.");
  const m=Array.from({length:4},()=>new Float64Array(n));
  const fixed=Array.from({length:4},()=>new Float64Array(n));
  let water=new Float64Array(n);

  const deposit=(d:WetPigmentDrop)=>{
    const [r,g,b]=rgb(d.pigment);
    // A radial dab distributes a fixed pigment mass rather than adding color
    // independently to each raster cell (which changes total mass with resolution).
    const weights:number[]=[];
    let sum=0;
    for(let i=0;i<n;i++){
      if(!active[i]){weights.push(0);continue;}
      const x=(i%cols+.5)*dx,y=(Math.floor(i/cols)+.5)*dy;
      let norm=((x-d.x)**2+(y-d.y)**2)/(d.radius*d.radius);
      if (d.path) {
        norm=Infinity;
        for (let j=0;j<d.path.length-1;j++) {
          const a=d.path[j],b=d.path[j+1];
          const vx=b.x-a.x,vy=b.y-a.y;
          const lengthSquared=vx*vx+vy*vy;
          const t=lengthSquared>0?clamp(((x-a.x)*vx+(y-a.y)*vy)/lengthSquared):0;
          const cx=a.x+vx*t,cy=a.y+vy*t;
          const pressure=a.pressure+(b.pressure-a.pressure)*t;
          const breadth=Math.max(1,d.radius*(.18+.82*pressure));
          norm=Math.min(norm,((x-cx)**2+(y-cy)**2)/(breadth*breadth));
        }
      }
      const w=norm>9?0:Math.exp(-norm*1.6);
      weights.push(w);sum+=w;
    }
    if(sum===0) {
      // Small painted shapes can miss the original radial dab. Preserve all
      // deposited mass by using the closest *valid* paper-region cell.
      let nearest=-1,best=Infinity;
      for(let i=0;i<n;i++)if(active[i]){
        const x=(i%cols+.5)*dx,y=(Math.floor(i/cols)+.5)*dy;
        const dist=(x-d.x)**2+(y-d.y)**2;
        if(dist<best){nearest=i;best=dist;}
      }
      if(nearest<0)throw new RangeError("Paint area contains no active cells.");
      weights[nearest]=1;sum=1;
    }
    for(let i=0;i<n;i++) if(weights[i]>0){
      const part=weights[i]/sum * 65*d.load;
      m[0][i]+=part;
      m[1][i]+=part*r/255;m[2][i]+=part*g/255;m[3][i]+=part*b/255;
      water[i]=Math.min(2,water[i]+weights[i]*d.water);
    }
  };

  // Precompute boundary topology once per query; recomputing arrays inside
  // every physics step inflated GC cost during interactive 30 fps playback.
  const neighbors=Array.from({length:n},(_,i)=>{
    const x=i%cols,y=Math.floor(i/cols),out:number[]=[];
    if(!active[i])return out;
    if(x>0&&active[i-1])out.push(i-1);
    if(x<cols-1&&active[i+1])out.push(i+1);
    if(y>0&&active[i-cols])out.push(i-cols);
    if(y<rows-1&&active[i+cols])out.push(i+cols);
    return out;
  });
  let previous=first-1;
  // 4-frame physics cadence: the image interpolates by film frame through
  // deposition events and wetness, but never integrates from an earlier seek.
  const STEP=4;
  for(let f=first;f<=target;f=Math.min(target+1,f+STEP)){
    const next=Math.min(target,f+STEP-1);
    for(const d of spec.drops) if(d.startFrame>previous && d.startFrame<=next)deposit(d);
    previous=next;
    const newWater=new Float64Array(n);
    const moving=Array.from({length:4},()=>new Float64Array(n));
    for(let i=0;i<n;i++){
      const nbr=neighbors[i],w=water[i];
      if(!active[i])continue;
      const waterFraction=.22*spec.flow;
      const mobility=.235*spec.flow*clamp(w);
      // Neighbor flux is conservative, including at the paper boundary.
      newWater[i]+=w*(1-waterFraction)*.95;
      for(let k=0;k<4;k++){
        const pigment=m[k][i],flow=pigment*mobility;
        let pooled=0;
        for(const j of nbr){
          // Pigment follows wet-to-dry water-front gradients and becomes
          // trapped by the higher dry-front sedimentation of paper fibres.
          const outward=Math.max(0,clamp(w)-clamp(water[j]));
          const pushed=pigment*(spec.edgePooling??0)*.09*outward;
          pooled+=pushed;
          moving[k][j]+=flow/4+pushed;
        }
        moving[k][i]+=pigment-flow-pooled+flow*(4-nbr.length)/4;
      }
      for(const j of nbr)newWater[j]+=w*waterFraction/4*.95;
      newWater[i]+=w*waterFraction*(4-nbr.length)/4*.95;
    }
    water=newWater;
    for(let i=0;i<n;i++){
      // Tooth-dependent sedimentation is stronger at the drying front.
      const sediment=clamp(.035+(.03+.09*spec.granulation)*spec.paper.tooth*(1-clamp(water[i])));
      for(let k=0;k<4;k++){
        const amount=moving[k][i]*sediment;
        fixed[k][i]+=amount;m[k][i]=moving[k][i]-amount;
      }
    }
    if(next===target)break;
  }
  const settled=target>=dryFrame;
  if(settled){
    for(let i=0;i<n;i++){
      water[i]=0;
      for(let k=0;k<4;k++){fixed[k][i]+=m[k][i];m[k][i]=0;}
    }
  }
  const cells:WetPaperCell[]=[];
  let total=0, totalWater=0;
  for(let i=0;i<n;i++){
    if(!active[i])continue;
    const mass=fixed[0][i]+m[0][i];
    total+=mass; totalWater+=water[i];
    if(mass<.012)continue;
    const pigment=toHex(
      255*(fixed[1][i]+m[1][i])/mass,
      255*(fixed[2][i]+m[2][i])/mass,
      255*(fixed[3][i]+m[3][i])/mass,
    );
    // Grain varies in paper coordinates, not by frame. Optical density is
    // deliberately bounded; no opaque watercolor cells or global image filter.
    const fibre=paintHash(spec.seed, i%cols,Math.floor(i/cols));
    const tooth=(1-spec.granulation*.32*fibre*spec.paper.tooth);
    // Accumulated pigment darkens slightly where a damp wash meets bare paper.
    // This is an optical edge, not an artificial extra deposit of physical mass.
    const near=neighbors[i];
    const neighborMass=near.reduce((sum,j)=>sum+fixed[0][j]+m[0][j],0)/Math.max(1,near.length);
    const edgeDensity=clamp((mass-neighborMass)/Math.max(.001,mass));
    // Pigment mass belongs to an AREA. Without the reference-area correction,
    // simply increasing grid resolution faded the same painting dramatically.
    const referenceArea=24*24;
    const arealMass=mass*referenceArea/(dx*dy);
    const opacity=clamp((1-Math.exp(-arealMass*.8))*tooth*(.76+.14*edgeDensity));
    cells.push({
      x:(i%cols)*dx,y:Math.floor(i/cols)*dy,width:dx,height:dy,
      pigment,opacity,wetness:clamp(water[i]),sediment:fixed[0][i]/mass,edgeDensity,
    });
  }
  return {columns:cols,rows,cellWidth:dx,cellHeight:dy,cells,
    totalPigment:total,wetness:totalWater/n,settled,dryFrame};
}
