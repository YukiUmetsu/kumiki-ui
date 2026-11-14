/**
 * RISO7 - deterministic, dependency-free geometry of actual authored SVG paths.
 * Works on the safe SVG path subset accepted by RisoCharacter (M/L/H/V/C/S/Q/T/A/Z,
 * absolute and relative). Does not use DOM, canvas pixels, OCR or raster fitting.
 * Artist-authored outlines remain authoritative: these are measured vector samples.
 */
export type RisoContourPoint = readonly [number, number];
export type RisoContourTriangle = readonly [RisoContourPoint,RisoContourPoint,RisoContourPoint];
export interface RisoPathContour {points: readonly RisoContourPoint[];closed: boolean}
const lex=/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
const isCommand=(s:string)=>/^[MmLlHhVvCcSsQqTtAaZz]$/.test(s);
const eq=(a:RisoContourPoint,b:RisoContourPoint)=>Math.hypot(a[0]-b[0],a[1]-b[1])<1e-7;
const cross=(a:RisoContourPoint,b:RisoContourPoint,c:RisoContourPoint)=>
  (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
export const risoContourSignedArea=(p:readonly RisoContourPoint[]):number =>
  p.reduce((sum,a,i)=>sum+a[0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*a[1],0)/2;
const mid=(a:RisoContourPoint,b:RisoContourPoint):RisoContourPoint=>
  [(a[0]+b[0])/2,(a[1]+b[1])/2];
function distanceToSegmentLine(p:RisoContourPoint,a:RisoContourPoint,b:RisoContourPoint):number {
  const dx=b[0]-a[0],dy=b[1]-a[1],denom=Math.hypot(dx,dy);
  return denom<1e-8?Math.hypot(p[0]-a[0],p[1]-a[1]):
    Math.abs((p[0]-a[0])*dy-(p[1]-a[1])*dx)/denom;
}
function flattenCubic(a:RisoContourPoint,b:RisoContourPoint,c:RisoContourPoint,d:RisoContourPoint,
                      flat:number,add:(p:RisoContourPoint)=>void,depth=0):void {
  if(depth>=10 || Math.max(distanceToSegmentLine(b,a,d),distanceToSegmentLine(c,a,d))<=flat){
    add(d);return;
  }
  const ab=mid(a,b),bc=mid(b,c),cd=mid(c,d),abc=mid(ab,bc),bcd=mid(bc,cd),m=mid(abc,bcd);
  flattenCubic(a,ab,abc,m,flat,add,depth+1);
  flattenCubic(m,bcd,cd,d,flat,add,depth+1);
}
function flattenQuadratic(a:RisoContourPoint,b:RisoContourPoint,c:RisoContourPoint,
                          flat:number,add:(p:RisoContourPoint)=>void,depth=0):void {
  if(depth>=10||distanceToSegmentLine(b,a,c)<=flat){add(c);return;}
  const ab=mid(a,b),bc=mid(b,c),m=mid(ab,bc);
  flattenQuadratic(a,ab,m,flat,add,depth+1);flattenQuadratic(m,bc,c,flat,add,depth+1);
}
function flattenArc(from:RisoContourPoint,to:RisoContourPoint,rx0:number,ry0:number,angle:number,
                    large:number,sweep:number,flat:number,add:(p:RisoContourPoint)=>void){
  if(rx0===0||ry0===0||eq(from,to)){add(to);return;}
  let rx=Math.abs(rx0),ry=Math.abs(ry0);
  const phi=angle*Math.PI/180,C=Math.cos(phi),S=Math.sin(phi);
  const dx=(from[0]-to[0])/2,dy=(from[1]-to[1])/2;
  const x1=C*dx+S*dy,y1=-S*dx+C*dy;
  const lambda=x1*x1/(rx*rx)+y1*y1/(ry*ry);
  if(lambda>1){const factor=Math.sqrt(lambda);rx*=factor;ry*=factor;}
  const rxs=rx*rx,rys=ry*ry;
  const num=Math.max(0,rxs*rys-rxs*y1*y1-rys*x1*x1);
  const den=Math.max(1e-12,rxs*y1*y1+rys*x1*x1);
  const sign=Boolean(large)===Boolean(sweep)?-1:1;
  const coef=sign*Math.sqrt(num/den);
  const cx1=coef*rx*y1/ry,cy1=-coef*ry*x1/rx;
  const cx=C*cx1-S*cy1+(from[0]+to[0])/2;
  const cy=S*cx1+C*cy1+(from[1]+to[1])/2;
  const theta=Math.atan2((y1-cy1)/ry,(x1-cx1)/rx);
  const ex=(-x1-cx1)/rx,ey=(-y1-cy1)/ry;
  const vx=(x1-cx1)/rx,vy=(y1-cy1)/ry;
  let delta=Math.atan2(vx*ey-vy*ex,vx*ex+vy*ey);
  if(!sweep&&delta>0)delta-=2*Math.PI;
  if(sweep&&delta<0)delta+=2*Math.PI;
  const steps=Math.max(2,Math.min(120,Math.ceil(Math.abs(delta)*Math.max(rx,ry)/(Math.max(.25,flat)*2))));
  for(let i=1;i<=steps;i++){
    if(i===steps){add(to);continue;}
    const t=theta+delta*i/steps,ct=Math.cos(t),st=Math.sin(t);
    add([cx+rx*C*ct-ry*S*st,cy+rx*S*ct+ry*C*st]);
  }
}
function clean(points:readonly RisoContourPoint[]):RisoContourPoint[] {
  const result:RisoContourPoint[]=[];
  for(const p of points){if(!result.length||!eq(result[result.length-1],p))result.push(p);}
  if(result.length>2&&eq(result[0],result[result.length-1]))result.pop();
  if(result.length<=3)return result;
  // Keep real corners and curve samples. Remove only strict collinear redundant points.
  return result.filter((p,i)=>{
    const prev=result[(i+result.length-1)%result.length],next=result[(i+1)%result.length];
    return Math.abs(cross(prev,p,next))>1e-6 || Math.hypot(next[0]-prev[0],next[1]-prev[1])<1e-6;
  });
}
/** Adaptive path sampling: <1 local-unit error by default, repeatable across frames. */
export function flattenRisoSvgPath(d:string,flatness=.7):readonly RisoPathContour[] {
  if(typeof d!=="string"||d.length>20000||!Number.isFinite(flatness)||flatness<.1||flatness>8)
    throw new RangeError("Riso SVG contour expects bounded path and flatness .1..8");
  if(/[^MmLlHhVvCcSsQqTtAaZz\d\s,\.\+\-Ee]/.test(d))
    throw new RangeError("Unsupported SVG contour command");
  const tokens=d.match(lex)||[];
  const contours:RisoPathContour[]=[];
  let i=0,cmd="",current:RisoContourPoint=[0,0],start:RisoContourPoint=[0,0];
  let points:RisoContourPoint[]=[],lastControl:RisoContourPoint|undefined;
  let previousCmd="";
  const push=(p:RisoContourPoint)=>{
    if(!p.every(Number.isFinite)||p.some(n=>Math.abs(n)>1e7))throw new RangeError("Non-finite SVG geometry");
    current=p;
    if(!points.length||!eq(points[points.length-1],p))points.push(p);
    if(points.length>4096)throw new RangeError("Source path exceeds contour sample limit");
  };
  const finish=(closed:boolean)=>{
    const sanitized=clean(points);
    if(sanitized.length>=3&&Math.abs(risoContourSignedArea(sanitized))>1e-5)
      contours.push({points:sanitized,closed});
    points=[];lastControl=undefined;
  };
  const number=()=>{if(i>=tokens.length||isCommand(tokens[i]))throw new RangeError("Missing SVG path coordinate");return Number(tokens[i++]);};
  const point=(relative:boolean):RisoContourPoint=>{
    const x=number(),y=number();
    return [relative?current[0]+x:x,relative?current[1]+y:y];
  };
  while(i<tokens.length){
    if(isCommand(tokens[i]))cmd=tokens[i++];
    if(!cmd)throw new RangeError("SVG path must begin with move");
    const op=cmd.toUpperCase(),relative=cmd!==op;
    if(op==="Z"){push(start);finish(true);current=start;cmd="";previousCmd="Z";continue;}
    if(op==="M"){
      const p=point(relative);if(points.length)finish(false);
      push(p);start=p;cmd=relative?"l":"L";lastControl=undefined;previousCmd="M";continue;
    }
    if(op==="L"){push(point(relative));lastControl=undefined;}
    else if(op==="H"){const x=number();push([relative?current[0]+x:x,current[1]]);lastControl=undefined;}
    else if(op==="V"){const y=number();push([current[0],relative?current[1]+y:y]);lastControl=undefined;}
    else if(op==="C"){
      const a=current,b=point(relative),c=point(relative),d=point(relative);
      flattenCubic(a,b,c,d,flatness,push);lastControl=c;
    }else if(op==="Q"){
      const a=current,b=point(relative),c=point(relative);
      flattenQuadratic(a,b,c,flatness,push);lastControl=b;
    }else if(op==="S"){
      const a=current,reflect: RisoContourPoint=lastControl && (previousCmd==="C"||previousCmd==="S") ?
        [2*a[0]-lastControl[0],2*a[1]-lastControl[1]]:a;
      const c=point(relative),d=point(relative);
      flattenCubic(a,reflect,c,d,flatness,push);lastControl=c;
    }else if(op==="T"){
      const a=current,reflect: RisoContourPoint=lastControl && (previousCmd==="Q"||previousCmd==="T")?
        [2*a[0]-lastControl[0],2*a[1]-lastControl[1]]:a;
      const c=point(relative);
      flattenQuadratic(a,reflect,c,flatness,push);lastControl=reflect;
    }else if(op==="A"){
      const rx=number(),ry=number(),rotation=number(),large=number(),sweep=number(),end=point(relative);
      if(![0,1].includes(large)||![0,1].includes(sweep))throw new RangeError("Invalid SVG arc flags");
      flattenArc(current,end,rx,ry,rotation,large,sweep,flatness,push);
      lastControl=undefined;
    }else throw new RangeError("Unsupported SVG command");
    previousCmd=op;
  }
  if(points.length)finish(false);
  return contours;
}
/** Keep a specific eye/button subpath or use the largest silhouette by ink area. */
export function selectRisoSourceContour(d:string,subpathIndex?:number,flatness=.7):readonly RisoContourPoint[] {
  const contours=flattenRisoSvgPath(d,flatness);
  const contour=subpathIndex===undefined?
    [...contours].sort((a,b)=>Math.abs(risoContourSignedArea(b.points))-Math.abs(risoContourSignedArea(a.points)))[0]:
    contours[subpathIndex];
  if(!contour)throw new RangeError("No source contour for requested part or subpath");
  return contour.points;
}
/** Point-in-polygon used by geometry contracts and concavity-safe triangulation. */
export function risoPointInContour(p:RisoContourPoint,poly:readonly RisoContourPoint[]):boolean {
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j];
    if((a[1]>p[1])!==(b[1]>p[1]) &&
      p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
function insideTriangle(p:RisoContourPoint,a:RisoContourPoint,b:RisoContourPoint,c:RisoContourPoint):boolean {
  const s1=cross(a,b,p),s2=cross(b,c,p),s3=cross(c,a,p);
  return !(s1<-1e-8||s2<-1e-8||s3<-1e-8) || !(s1>1e-8||s2>1e-8||s3>1e-8);
}
/**
 * Ear clipping for a simple, potentially concave SVG silhouette.
 * Unlike fan triangulation, this avoids triangles crossing the feather/coat edge.
 * Holes and multi-island compositions remain independent source subpaths.
 */
export function triangulateRisoContour(input:readonly RisoContourPoint[]):readonly RisoContourTriangle[] {
  const poly=clean(input);
  if(poly.length<3)return [];
  const orientation=Math.sign(risoContourSignedArea(poly));
  if(!orientation)return [];
  const remaining=poly.map((_,i)=>i),tris:RisoContourTriangle[]=[];
  let iterations=0;
  while(remaining.length>3 && iterations++<poly.length*poly.length){
    let ear=false;
    for(let k=0;k<remaining.length;k++){
      const prev=remaining[(k+remaining.length-1)%remaining.length];
      const curr=remaining[k],next=remaining[(k+1)%remaining.length];
      const a=poly[prev],b=poly[curr],c=poly[next];
      if(cross(a,b,c)*orientation<=1e-8)continue;
      if(remaining.some(id=>id!==prev&&id!==curr&&id!==next&&insideTriangle(poly[id],a,b,c)))
        continue;
      tris.push([a,b,c]);remaining.splice(k,1);ear=true;break;
    }
    if(!ear)break;
  }
  if(remaining.length===3)tris.push([poly[remaining[0]],poly[remaining[1]],poly[remaining[2]]]);
  return tris;
}

/**
 * Replaces oversized diagnostic triangles with bounded, area-controlled microfacets.
 * Each triangle splits around its own centroid. This leaves the original perimeter
 * unchanged (no T-junctions along independent regions or the authored ink edge).
 * The area of the refined faces exactly equals the original triangulation area.
 * This is a per-frame analytical mesh, not stable UV topology across cels.
 */
export function refineRisoContourTriangles(
  input: readonly RisoContourTriangle[],
  maximumArea: number,
  maximumTriangles = 384,
  maximumDepth = 6,
): readonly RisoContourTriangle[] {
  if(!Number.isFinite(maximumArea)||maximumArea<=0||
    !Number.isSafeInteger(maximumTriangles)||maximumTriangles<3||maximumTriangles>4096||
    !Number.isSafeInteger(maximumDepth)||maximumDepth<0||maximumDepth>10)
    throw new RangeError("Invalid Risograph microfacet mesh resolution");
  if(input.length>maximumTriangles)
    throw new RangeError("Source triangulation exceeds microfacet triangle budget");
  const tris=[...input];
  const depth=tris.map(()=>0);
  const triangleArea=(t:RisoContourTriangle)=>{
    const [a,b,c]=t;
    return Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))*.5;
  };
  // Prioritize the largest *eligible* face so the budget is spent on large
  // geometric gaps rather than dense eyelids that were already sampled finely.
  while(tris.length+2<=maximumTriangles){
    let selected=-1,biggest=maximumArea;
    for(let i=0;i<tris.length;i++){
      if(depth[i]>=maximumDepth)continue;
      const currentArea=triangleArea(tris[i]);
      if(currentArea>biggest){biggest=currentArea;selected=i;}
    }
    if(selected<0)break;
    const [a,b,c]=tris[selected];
    const center:RisoContourPoint=[(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3];
    const nextDepth=depth[selected]+1;
    tris.splice(selected,1,[a,b,center],[b,c,center],[c,a,center]);
    depth.splice(selected,1,nextDepth,nextDepth,nextDepth);
  }
  return tris;
}
