import { inkHash } from "./ink-wash";
import type { InkStroke } from "./ink-wash";

/**
 * Traditional rock construction involves contour (gou), texture strokes (cun),
 * wash (ran), and moss/dark accents (dian).
 * The caller supplies the actual rock position; these *deterministic* local marks
 * add hand-drawn surface structure, not a full-frame faux-ink texture.
 */
export type InkRockMarkKind = "axe-cut" | "hemp-fiber" | "moss-dot";
export interface InkRockTexture {
  idPrefix: string;
  seed: number;
  kind: InkRockMarkKind;
  x: number; y: number; width: number; height: number;
  count: number;
  startFrame: number;
  /** Structural direction in degrees; rock flow follows geology, not image noise. */
  angle?: number;
  /** Optional limit polygon in artwork coordinates. Unspecified means the full rectangle. */
  boundary?: readonly (readonly [number,number])[];
  /** 0..1 relative darkness of these marks; a still needs nearby pale washes. */
  tone?: number;
}
const finite=(v:number)=>Number.isFinite(v);
function inside(x:number,y:number,poly:readonly(readonly[number,number])[]):boolean{
  let hit=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j];
    if(((a[1]>y)!==(b[1]>y)) &&
       x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }
  return hit;
}
export function makeInkRockTexture(spec:InkRockTexture):InkStroke[]{
  if(!spec || !/^[a-z0-9][a-z0-9._-]{0,37}$/i.test(spec.idPrefix) ||
    !Number.isSafeInteger(spec.seed)||spec.seed<0||spec.seed>2147483647 ||
    !["axe-cut","hemp-fiber","moss-dot"].includes(spec.kind) ||
    ![spec.x,spec.y,spec.width,spec.height].every(finite) ||
    spec.width<=0||spec.height<=0||spec.width>8192||spec.height>8192 ||
    !Number.isSafeInteger(spec.count)||spec.count<1||spec.count>160 ||
    !Number.isSafeInteger(spec.startFrame)||spec.startFrame<0 ||
    spec.angle!==undefined&&!finite(spec.angle) ||
    spec.tone!==undefined&&(!finite(spec.tone)||spec.tone<0||spec.tone>1) ||
    spec.boundary!==undefined&&
      (!Array.isArray(spec.boundary)||spec.boundary.length<3||spec.boundary.length>96 ||
        !spec.boundary.every(p=>p.length===2&&p.every(finite))))
    throw new RangeError("INK2 rock texture settings are invalid.");
  const angle=(spec.angle ?? (spec.kind==="hemp-fiber"?75:32))*Math.PI/180;
  const dx=Math.cos(angle),dy=Math.sin(angle);
  const base=Math.min(spec.width,spec.height);
  const marks:InkStroke[]=[];
  let k=0,tries=0;
  while(k<spec.count&&tries<spec.count*50){
    const pick=tries++;
    const x=spec.x+(.04+.92*inkHash(spec.seed,pick,9))*spec.width;
    const y=spec.y+(.05+.90*inkHash(spec.seed,pick,13))*spec.height;
    if(spec.boundary&&!inside(x,y,spec.boundary))continue;
    const length=base*(spec.kind==="hemp-fiber"?(.17+.16*inkHash(spec.seed,pick,15)):
      spec.kind==="axe-cut"?(.07+.11*inkHash(spec.seed,pick,17)):(.014+.025*inkHash(spec.seed,pick,19)));
    const twist=(inkHash(spec.seed,pick,31)-.5)*.44;
    const side=(inkHash(spec.seed,pick,37)-.5)*length*.24;
    const geom=spec.kind==="moss-dot"?
      [{x:x-length*.3,y:y-length*.15,pressure:.2},{x,y,pressure:.88},
        {x:x+length*.18,y:y+length*.12,pressure:.1}]:
      [{x:x-dx*length*.5,y:y-dy*length*.5,pressure:.05},
       {x:x+dx*length*.08+side,y:y+dy*length*.10-side,pressure:.84+twist*.24},
       {x:x+dx*length*.5,y:y+dy*length*.5,pressure:.015}];
    const width=spec.kind==="hemp-fiber"?base*.009:
      spec.kind==="axe-cut"?base*(.026+.02*inkHash(spec.seed,pick,41)):
      base*.022;
    marks.push({
      id:spec.idPrefix+"-"+k,
      points:geom,width:Math.max(.7,width),tone:(spec.tone??.55)*(.7+.3*inkHash(spec.seed,pick,45)),
      water:spec.kind==="moss-dot"?.24:spec.kind==="axe-cut"?.19:.40,
      load:.73+.21*inkHash(spec.seed,pick,51),brush:spec.kind==="axe-cut"?"oblique":"upright",
      drag:spec.kind==="axe-cut"?.85:.60,tipInk:.68,
      startFrame:spec.startFrame+Math.floor(k/5)*3,
      drawFrames:6+Math.floor(inkHash(spec.seed,pick,53)*8),
      spreadFrames:7,dryFrames:23,
    });
    k++;
  }
  if(marks.length!==spec.count)throw new RangeError("Rock boundary is too small for the requested mark count.");
  return marks;
}
