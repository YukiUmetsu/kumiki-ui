import {clamp01,printHash} from "./print-plates";

/** RISO79: one die-cut printed cover, a separately printed intact sliding
 * insert, and openings whose paper coordinates do not move with the film. */
export type RisoPullDirection="right"|"left"|"down"|"up";
export interface RisoPullWindow{
  readonly id:string;
  readonly x:number;
  readonly y:number;
  readonly width:number;
  readonly height:number;
  readonly radius?:number;
}
export interface RisoPullSpec{
  readonly width:number;
  readonly height:number;
  readonly windows:readonly RisoPullWindow[];
  readonly direction:RisoPullDirection;
  /** In original sheet units, not percent or screen pixels. */
  readonly travel:number;
  readonly progress:number;
  readonly seed:number;
  /** Stock thickness, in millimetres; converted to source-space CSS units. */
  readonly paperDepthMm?:number;
  /** Direction FROM the lamp toward the sheet; normalized before projection. */
  readonly lightDirection?:readonly [number,number];
}
export interface RisoPullWindowGeometry{
  readonly id:string;
  readonly path:string;
  readonly x:number;
  readonly y:number;
  readonly width:number;
  readonly height:number;
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
const round=(n:number)=>Number(n.toFixed(4));
const finite=(n:number)=>Number.isFinite(n);
function check(s:RisoPullSpec){
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
  for(const w of s.windows){
    const r=w.radius??Math.min(w.width,w.height)*.065;
    if(!w||!/^[a-z][a-z0-9-]{0,35}$/.test(w.id)||ids.has(w.id)||
      ![w.x,w.y,w.width,w.height,r].every(finite)||
      w.width<35||w.height<35||w.width>s.width*.85||w.height>s.height*.85||
      w.x<10||w.y<10||w.x+w.width>s.width-10||w.y+w.height>s.height-10||
      r<0||r>Math.min(w.width,w.height)*.25)
      throw new RangeError("RISO79 requires unique named source-paper openings, inset 10 units, minimum 35 units, and bounded corner cuts.");
    ids.add(w.id);
  }
  for(let i=0;i<s.windows.length;i++)for(let j=i+1;j<s.windows.length;j++){
    const a=s.windows[i],b=s.windows[j];
    if(a.x<b.x+b.width+7&&a.x+a.width+7>b.x&&
      a.y<b.y+b.height+7&&a.y+a.height+7>b.y)
      throw new RangeError("RISO79 physical openings need at least seven source-paper units between cut edges.");
  }
}
export function risoPullWindowContour(w:RisoPullWindow):string{
  const {x,y,width:hWidth,height:hHeight}=w;
  const r=w.radius??Math.min(hWidth,hHeight)*.065;
  const x2=x+hWidth,y2=y+hHeight;
  const f=(v:number)=>String(round(v));
  // Four hand-cut convex corner turns, but no geometry reduction of ink.
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
/** 88 deterministic short cut-face microfibrils per true paper opening.
 * Their anchors belong to source-paper coordinates, never the video camera. */
export function risoPullWindowFibres(w:RisoPullWindow,seed:number):readonly string[]{
  const r=w.radius??Math.min(w.width,w.height)*.065;
  const x=w.x,y=w.y,x2=x+w.width,y2=y+w.height;
  return Array.from({length:88},(_,i)=>{
    const side=Math.floor(i/22),index=i%22;
    // A die-cut edge is clean, not deckled: short, irregularly spaced
    // microfibrils remain attached to the cut face without long torn-paper hairs.
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
  check(s);
  const eased=s.progress*s.progress*(3-2*s.progress);
  const offset=round(eased*s.travel);
  const shift:readonly [number,number]=s.direction==="right"?[offset,0]:
    s.direction==="left"?[-offset,0]:s.direction==="down"?[0,offset]:[0,-offset];
  const paperDepthMm=s.paperDepthMm??.32;
  const light=s.lightDirection??[-.55,-.84];
  const lightLength=Math.hypot(light[0],light[1]);
  const depthUnits=round(paperDepthMm*96/25.4);
  // Light travels from the lamp toward the sheet; the visible cast shadow
  // falls in the opposite direction. This is an art-directed 2.5D cue,
  // not a claim to simulate the mechanical optics of a physical press.
  const shadowOffset:readonly [number,number]=[
    round(-light[0]/lightLength*depthUnits*1.85),
    round(-light[1]/lightLength*depthUnits*1.85),
  ];
  return {
    // Preserve SVG/serializable paper identity at the first frame: never -0.
    translation:[shift[0]===0?0:shift[0],shift[1]===0?0:shift[1]],
    easedProgress:round(eased),
    paperDepthMm,depthUnits,shadowOffset,
    shadowOpacity:round(Math.min(.32,.12+paperDepthMm*.14)),
    windows:s.windows.map(w=>({
      id:w.id,x:w.x,y:w.y,width:w.width,height:w.height,
      path:risoPullWindowContour(w),
      fibres:risoPullWindowFibres(w,s.seed),
    })),
    fixedCoverRegistration:true,fixedInsertRegistration:true,
  };
}
