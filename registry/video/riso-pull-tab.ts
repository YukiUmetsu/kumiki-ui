import {clamp01,printHash} from "./print-plates";

/** RISO80 adds authored closed organic contours to the RISO79 paper theatre.
 * A custom path is one absolute, closed SVG contour in original sheet units. */
export type RisoPullDirection="right"|"left"|"down"|"up";
export interface RisoPullWindow{
  readonly id:string;
  readonly x:number;
  readonly y:number;
  readonly width:number;
  readonly height:number;
  readonly radius?:number;
  /** Optional source-authored M/L/C/Q/Z path; coordinates are absolute sheet units. */
  readonly contour?:string;
}
export interface RisoPullSpec{
  readonly width:number;
  readonly height:number;
  readonly windows:readonly RisoPullWindow[];
  readonly direction:RisoPullDirection;
  readonly travel:number;
  readonly progress:number;
  readonly seed:number;
  readonly paperDepthMm?:number;
  readonly lightDirection?:readonly [number,number];
}
export interface RisoPullWindowGeometry{
  readonly id:string;
  readonly path:string;
  readonly x:number;
  readonly y:number;
  readonly width:number;
  readonly height:number;
  readonly shape:"rounded-rect"|"organic-contour";
  /** RISO80 requires clockwise winding in SVG's downward-positive coordinates. */
  readonly winding:"clockwise";
  readonly fibres:readonly string[];
}
export interface RisoPullEvaluation{
  readonly translation:readonly [number,number];
  readonly easedProgress:number;
  readonly windows:readonly RisoPullWindowGeometry[];
  readonly paperDepthMm:number;
  readonly depthUnits:number;
  readonly shadowOffset:readonly [number,number];
  readonly shadowOpacity:number;
  readonly fixedCoverRegistration:true;
  readonly fixedInsertRegistration:true;
}
interface Point{readonly x:number;readonly y:number}
interface ParsedContour{
  readonly samples:readonly Point[];
  readonly controls:readonly Point[];
  readonly signedArea:number;
  readonly perimeter:number;
}
const round=(n:number)=>Number(n.toFixed(4));
const finite=(n:number)=>Number.isFinite(n);
const PATH_TOKEN=/[A-Za-z]|[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/g;
const dist=(a:Point,b:Point)=>Math.hypot(b.x-a.x,b.y-a.y);
const cross=(a:Point,b:Point,c:Point)=>
  (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);

function pointInWindow(p:Point,w:RisoPullWindow):boolean{
  return p.x>=w.x-.01&&p.y>=w.y-.01&&
    p.x<=w.x+w.width+.01&&p.y<=w.y+w.height+.01;
}
function segmentsCross(a:Point,b:Point,c:Point,d:Point):boolean{
  const eps=1e-7;
  const o1=cross(a,b,c),o2=cross(a,b,d);
  const o3=cross(c,d,a),o4=cross(c,d,b);
  const between=(v:number,x:number,y:number)=>
    v>=Math.min(x,y)-eps&&v<=Math.max(x,y)+eps;
  const on=(p:Point,u:Point,v:Point)=>
    Math.abs(cross(u,v,p))<=eps&&between(p.x,u.x,v.x)&&between(p.y,u.y,v.y);
  if(((o1>eps&&o2< -eps)||(o1< -eps&&o2>eps))&&
    ((o3>eps&&o4< -eps)||(o3< -eps&&o4>eps)))return true;
  // Non-adjacent touches and collinear overlaps are also invalid apertures.
  return (Math.abs(o1)<=eps&&on(c,a,b))||
    (Math.abs(o2)<=eps&&on(d,a,b))||
    (Math.abs(o3)<=eps&&on(a,c,d))||
    (Math.abs(o4)<=eps&&on(b,c,d));
}
/** Parse only one closed, absolute M/L/C/Q/Z contour. Sampling is used for
 * topology, bounds and arc-length fibre placement; the original Bézier path
 * is preserved verbatim for the SVG mask and cut edge. */
function parseOrganicContour(path:string,w:RisoPullWindow):ParsedContour{
  if(!w||typeof path!=="string"||path.length<20||path.length>4096)
    throw new RangeError("RISO80 organic contour must be a 20–4096 character authored SVG path.");
  const key=[path,w.x,w.y,w.width,w.height].join("|");
  const cached=organicContourCache.get(w);
  if(cached?.key===key)return cached.value;
  const tokens=path.match(PATH_TOKEN)??[];
  const residue=path.replace(PATH_TOKEN,"").replace(/[\s,]/g,"");
  if(residue||tokens.length<8||tokens.length>512||
    tokens[0]!=="M"||tokens[tokens.length-1]!=="Z")
    throw new RangeError("RISO80 contour must contain one absolute M/L/C/Q/Z path and end in Z.");
  let cursor=0,commands=0,hasMove=false,closed=false;
  let current:Point={x:0,y:0},start:Point={x:0,y:0};
  const samples:Point[]=[];
  const controls:Point[]=[];
  const readNumbers=(count:number):number[]=>{
    if(cursor+count>tokens.length)throw new RangeError("RISO80 contour command has missing coordinates.");
    const values:number[]=[];
    for(let k=0;k<count;k++){
      const token=tokens[cursor++];
      if(!token||/^[A-Za-z]$/.test(token))throw new RangeError("RISO80 contour command has missing coordinates.");
      const n=Number(token);
      if(!finite(n)||Math.abs(n)>8192)throw new RangeError("RISO80 contour coordinates must be finite and within ±8192.");
      values.push(n);
    }
    return values;
  };
  const append=(p:Point)=>{
    if(!finite(p.x)||!finite(p.y))throw new RangeError("RISO80 contour contains a non-finite point.");
    if(samples.length&&dist(samples[samples.length-1],p)<1e-6)
      throw new RangeError("RISO80 contour contains a zero-length edge.");
    samples.push(p);
  };
  while(cursor<tokens.length){
    const command=tokens[cursor++];
    commands++;
    if(commands>64)throw new RangeError("RISO80 contour is limited to 64 explicit path commands.");
    if(!/^[A-Z]$/.test(command))
      throw new RangeError("RISO80 contour accepts only uppercase absolute M/L/C/Q/Z commands.");
    if(command==="M"){
      if(hasMove||samples.length)throw new RangeError("RISO80 contour must be a single connected subpath.");
      const [x,y]=readNumbers(2);
      current={x,y};start=current;hasMove=true;
      controls.push(current);append(current);
    }else if(command==="L"){
      if(!hasMove||closed)throw new RangeError("RISO80 L command must follow the initial M.");
      const [x,y]=readNumbers(2);
      current={x,y};controls.push(current);append(current);
    }else if(command==="C"){
      if(!hasMove||closed)throw new RangeError("RISO80 C command must follow the initial M.");
      const [x1,y1,x2,y2,x3,y3]=readNumbers(6);
      const p0=current,p1={x:x1,y:y1},p2={x:x2,y:y2},p3={x:x3,y:y3};
      controls.push(p1,p2,p3);
      for(let step=1;step<=8;step++){
        const t=step/8,u=1-t;
        append({
          x:u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*p3.x,
          y:u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*p3.y,
        });
      }
      current=p3;
    }else if(command==="Q"){
      if(!hasMove||closed)throw new RangeError("RISO80 Q command must follow the initial M.");
      const [x1,y1,x2,y2]=readNumbers(4);
      const p0=current,p1={x:x1,y:y1},p2={x:x2,y:y2};
      controls.push(p1,p2);
      for(let step=1;step<=6;step++){
        const t=step/6,u=1-t;
        append({
          x:u*u*p0.x+2*u*t*p1.x+t*t*p2.x,
          y:u*u*p0.y+2*u*t*p1.y+t*t*p2.y,
        });
      }
      current=p2;
    }else if(command==="Z"){
      if(!hasMove||closed||cursor!==tokens.length)
        throw new RangeError("RISO80 Z must close the one contour and be the final command.");
      if(dist(current,start)>1e-6)append(start);
      closed=true;
    }else{
      throw new RangeError("RISO80 organic contours support only absolute M/L/C/Q/Z commands; arcs and relative commands are intentionally rejected.");
    }
  }
  if(!hasMove||!closed||samples.length<5)
    throw new RangeError("RISO80 contour must be one closed shape with at least four edges.");
  for(const p of [...samples,...controls]){
    if(!pointInWindow(p,w))
      throw new RangeError("RISO80 contour and all Bézier controls must stay inside their declared source-paper bounds.");
  }
  const polygon=samples.slice(0,-1);
  let twiceArea=0,perimeter=0;
  for(let i=0;i<samples.length-1;i++){
    const a=samples[i],b=samples[i+1];
    twiceArea+=a.x*b.y-b.x*a.y;
    perimeter+=dist(a,b);
  }
  const signedArea=twiceArea/2;
  const minimumArea=Math.max(180,w.width*w.height*.08);
  if(!finite(signedArea)||signedArea<minimumArea||
    !finite(perimeter)||perimeter<80)
    throw new RangeError("RISO80 organic contour must have clockwise SVG winding, substantial area and at least 80 source units of perimeter.");
  // Reject self-crossing contours. Adjacent sampled segments and the closing
  // pair are expected to meet; every other intersection is an invalid aperture.
  const n=polygon.length;
  for(let i=0;i<n;i++)for(let j=i+2;j<n;j++){
    if(i===0&&j===n-1)continue;
    if(segmentsCross(samples[i],samples[i+1],samples[j],samples[j+1]))
      throw new RangeError("RISO80 organic contour must be a simple non-self-intersecting closed silhouette.");
  }
  const parsed={samples,controls,signedArea,perimeter};
  organicContourCache.set(w,{key,value:parsed});
  return parsed;
}
function customContourFibres(parsed:ParsedContour,seed:number):readonly string[]{
  const points=parsed.samples;
  const cumulative:number[]=[0];
  for(let i=0;i<points.length-1;i++)
    cumulative.push(cumulative[i]+dist(points[i],points[i+1]));
  const total=cumulative[cumulative.length-1];
  const outward=1; // Positive signed area is the validated clockwise SVG winding.
  return Array.from({length:88},(_,i)=>{
    const jitter=.08+.84*printHash(seed,i+11,13);
    const target=(i+jitter)/88*total;
    let segment=0;
    while(segment<cumulative.length-2&&cumulative[segment+1]<target)segment++;
    const a=points[segment],b=points[segment+1];
    const length=Math.max(1e-6,dist(a,b));
    const t=(target-cumulative[segment])/length;
    const px=a.x+(b.x-a.x)*t,py=a.y+(b.y-a.y)*t;
    const tx=(b.x-a.x)/length,ty=(b.y-a.y)/length;
    // In SVG's downward-positive coordinates, positive signed area is
    // clockwise; its outward normal is the left normal of each tangent.
    const nx=outward*ty,ny=outward*-tx;
    const bend=(printHash(seed+37,i+3,19)-.5)*1.35;
    const fibreLength=.28+1.52*printHash(seed,i+31,23);
    return "M"+round(px)+" "+round(py)+
      " Q"+round(px+nx*fibreLength*.43-tx*bend*.35)+" "+
      round(py+ny*fibreLength*.43-ty*bend*.35)+
      " "+round(px+nx*fibreLength-tx*bend)+" "+round(py+ny*fibreLength-ty*bend);
  });
}
function check(s:RisoPullSpec):Map<string,ParsedContour>{
  if(!s||!finite(s.width)||!finite(s.height)||
    s.width<240||s.height<240||s.width>8192||s.height>8192||
    !Array.isArray(s.windows)||s.windows.length<1||s.windows.length>4||
    !["left","right","up","down"].includes(s.direction)||
    !Number.isSafeInteger(s.seed)||s.seed<0||s.seed>2147483647||
    !finite(s.progress)||s.progress<0||s.progress>1||
    !finite(s.travel)||s.travel<12||
    s.travel>(["left","right"].includes(s.direction)?s.width:s.height)*.34)
    throw new RangeError("RISO79 requires 240–8192 paper, 1–4 openings, a cardinal pull, bounded travel, progress 0..1 and a 31-bit seed.");
  const depth=s.paperDepthMm??.32;
  const light=s.lightDirection??[-.55,-.84];
  if(!finite(depth)||depth<.08||depth>1.2||
    !Array.isArray(light)||light.length!==2||!light.every(finite))
    throw new RangeError("RISO79 paper depth must be .08–1.2mm and light direction must be a finite two-component vector.");
  const lightLength=Math.hypot(light[0],light[1]);
  if(!finite(lightLength)||lightLength<.25||lightLength>1.5)
    throw new RangeError("RISO79 light direction must be a finite nonzero vector of length .25–1.5.");
  const ids=new Set<string>();
  const parsed=new Map<string,ParsedContour>();
  for(const w of s.windows){
    if(!w||!/^[a-z][a-z0-9-]{0,35}$/.test(w.id)||ids.has(w.id)||
      ![w.x,w.y,w.width,w.height].every(finite)||
      w.width<35||w.height<35||w.width>s.width*.85||w.height>s.height*.85||
      w.x<10||w.y<10||w.x+w.width>s.width-10||w.y+w.height>s.height-10||
      (w.contour===undefined&&(!finite(w.radius??Math.min(w.width,w.height)*.065)||
        (w.radius??Math.min(w.width,w.height)*.065)<0||
        (w.radius??Math.min(w.width,w.height)*.065)>Math.min(w.width,w.height)*.25)))
      throw new RangeError("RISO79 requires unique named source-paper openings, inset 10 units, minimum 35 units, and bounded corner cuts.");
    if(w.contour!==undefined)parsed.set(w.id,parseOrganicContour(w.contour,w));
    ids.add(w.id);
  }
  for(let i=0;i<s.windows.length;i++)for(let j=i+1;j<s.windows.length;j++){
    const a=s.windows[i],b=s.windows[j];
    if(a.x<b.x+b.width+7&&a.x+a.width+7>b.x&&
      a.y<b.y+b.height+7&&a.y+a.height+7>b.y)
      throw new RangeError("RISO79 physical openings need at least seven source-paper units between cut edges.");
  }
  return parsed;
}
export function risoPullWindowContour(w:RisoPullWindow):string{
  if(w.contour!==undefined){
    parseOrganicContour(w.contour,w);
    return w.contour.trim();
  }
  const {x,y,width:hWidth,height:hHeight}=w;
  const r=w.radius??Math.min(hWidth,hHeight)*.065;
  const x2=x+hWidth,y2=y+hHeight;
  const f=(v:number)=>String(round(v));
  return "M"+f(x+r)+" "+f(y)+
    " L"+f(x2-r)+" "+f(y)+
    " C"+f(x2-r*.37)+" "+f(y)+" "+f(x2)+" "+f(y+r*.34)+" "+f(x2)+" "+f(y+r)+
    " L"+f(x2)+" "+f(y2-r)+
    " C"+f(x2)+" "+f(y2-r*.33)+" "+f(x2-r*.39)+" "+f(y2)+" "+f(x2-r)+" "+f(y2)+
    " L"+f(x+r)+" "+f(y2)+
    " C"+f(x+r*.41)+" "+f(y2)+" "+f(x)+" "+f(y2-r*.36)+" "+f(x)+" "+f(y2-r)+
    " L"+f(x)+" "+f(y+r)+
    " C"+f(x)+" "+f(y+r*.34)+" "+f(x+r*.39)+" "+f(y)+" "+f(x+r)+" "+f(y)+" Z";
}
export function risoPullWindowFibres(w:RisoPullWindow,seed:number):readonly string[]{
  if(w.contour!==undefined)return customContourFibres(parseOrganicContour(w.contour,w),seed);
  const r=w.radius??Math.min(w.width,w.height)*.065;
  const x=w.x,y=w.y,x2=x+w.width,y2=y+w.height;
  return Array.from({length:88},(_,i)=>{
    const side=Math.floor(i/22),index=i%22;
    const t=.018+.964*((index+.08+.84*printHash(seed,i+11,13))/22);
    const bend=(printHash(seed+37,i+3,19)-.5)*1.35;
    const length=.28+1.52*printHash(seed,i+31,23);
    let px=0,py=0,nx=0,ny=0;
    if(side===0){px=x+r+(w.width-2*r)*t;py=y;ny=-1;}
    if(side===1){px=x2;py=y+r+(w.height-2*r)*t;nx=1;}
    if(side===2){px=x2-r-(w.width-2*r)*t;py=y2;ny=1;}
    if(side===3){px=x;py=y2-r-(w.height-2*r)*t;nx=-1;}
    const tx=-ny,ty=nx;
    return "M"+round(px)+" "+round(py)+
      " Q"+round(px+nx*length*.43+tx*bend*.35)+" "+
      round(py+ny*length*.43+ty*bend*.35)+
      " "+round(px+nx*length+tx*bend)+" "+round(py+ny*length+ty*bend);
  });
}
/** Seek-safe absolute frames: no timers, seeded ink reprints or spring memory. */
export function risoPullProgress(
  frame:number,startFrame:number,durationFrames:number,reducedMotion=false,
):number{
  if(!Number.isSafeInteger(frame)||frame<0||
    !Number.isSafeInteger(startFrame)||startFrame<0||
    !Number.isSafeInteger(durationFrames)||durationFrames<1||durationFrames>2400)
    throw new RangeError("RISO79 requires valid absolute 24fps frames and a 1–2400 frame reveal.");
  if(reducedMotion)return 1;
  return clamp01((frame-startFrame)/durationFrames);
}
export function evaluateRisoPullTab(s:RisoPullSpec):RisoPullEvaluation{
  const parsed=check(s);
  const eased=s.progress*s.progress*(3-2*s.progress);
  const offset=round(eased*s.travel);
  const shift:readonly [number,number]=s.direction==="right"?[offset,0]:
    s.direction==="left"?[-offset,0]:s.direction==="down"?[0,offset]:[0,-offset];
  const paperDepthMm=s.paperDepthMm??.32;
  const light=s.lightDirection??[-.55,-.84];
  const lightLength=Math.hypot(light[0],light[1]);
  const depthUnits=round(paperDepthMm*96/25.4);
  const shadowOffset:readonly [number,number]=[
    round(-light[0]/lightLength*depthUnits*1.85),
    round(-light[1]/lightLength*depthUnits*1.85),
  ];
  return {
    translation:[shift[0]===0?0:shift[0],shift[1]===0?0:shift[1]],
    easedProgress:round(eased),
    paperDepthMm,depthUnits,shadowOffset,
    shadowOpacity:round(Math.min(.32,.12+paperDepthMm*.14)),
    windows:s.windows.map(w=>({
      id:w.id,x:w.x,y:w.y,width:w.width,height:w.height,
      path:w.contour?.trim()??risoPullWindowContour(w),
      fibres:w.contour!==undefined?customContourFibres(parsed.get(w.id)!,s.seed):risoPullWindowFibres(w,s.seed),
      shape:w.contour!==undefined?"organic-contour":"rounded-rect",
      winding:"clockwise",
    })),
    fixedCoverRegistration:true,fixedInsertRegistration:true,
  };
}
