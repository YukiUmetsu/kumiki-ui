import {evaluateRisoCharacter} from "../../registry/video/riso-character";
import type {RisoCharacterSpec,RisoMatrix} from "../../registry/video/riso-character";
import {selectRisoSourceContour,risoPointInContour} from "../../registry/video/riso-path-geometry";
import type {RisoContourPoint} from "../../registry/video/riso-path-geometry";

/** RISO36 ArtCraft: physical RED stencil edge-gap audit, not an axis-only
 * approximation and not a rendered-pixel similarity score. All coordinates
 * come from the *evaluated* source SVG paths + the actual FK/IK matrix.
 *
 * Real source fingers must overlap their own PIP/DIP caps. We therefore
 * report cross-digit clearance separately for proximal, middle, distal,
 * and finger-to-finger "all phalanges" (where overlapping knuckle roots may
 * legitimately create an ink bridge). Ink traps/registration are subsequent
 * press operations and must not be confused with drawing topology.
 */
export type Riso36Digit="index"|"middle"|"ring"|"pinky";
export type Riso36Side="left"|"right";
export type Riso36Section="proximal"|"middle"|"distal";
export const RISO36_DIGITS=["index","middle","ring","pinky"] as const;
export const RISO36_SECTIONS=["proximal","middle","distal"] as const;
type Point=RisoContourPoint;
type Segment=readonly [Point,Point];
const EPS=1e-8;
const cross=(a:Point,b:Point,c:Point)=>
  (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const pointOn=(p:Point,a:Point,b:Point)=>
  Math.abs(cross(a,b,p))<EPS&&
  p[0]>=Math.min(a[0],b[0])-EPS&&p[0]<=Math.max(a[0],b[0])+EPS&&
  p[1]>=Math.min(a[1],b[1])-EPS&&p[1]<=Math.max(a[1],b[1])+EPS;
function segmentsCross([a,b]:Segment,[c,d]:Segment){
  const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b);
  if(((x>EPS&&y<-EPS)||(x<-EPS&&y>EPS))&&
    ((z>EPS&&w<-EPS)||(z<-EPS&&w>EPS)))return true;
  return (Math.abs(x)<EPS&&pointOn(c,a,b))||
    (Math.abs(y)<EPS&&pointOn(d,a,b))||
    (Math.abs(z)<EPS&&pointOn(a,c,d))||
    (Math.abs(w)<EPS&&pointOn(b,c,d));
}
function pointToSegment(p:Point,[a,b]:Segment){
  const dx=b[0]-a[0],dy=b[1]-a[1],length2=dx*dx+dy*dy;
  const t=Math.max(0,Math.min(1,length2<EPS?0:
    ((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length2));
  return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
}
const edges=(points:readonly Point[]):Segment[]=>
  points.map((p,i)=>[p,points[(i+1)%points.length]] as const);
/** Signed distance between two independently inked CLOSED contours.
 * Positive: paper-white gap; zero: touching; negative: actual overlapping
 * pigment, not merely touching bounding boxes or skeleton centerlines.
 * The magnitude of a negative distance is intentionally NOT asserted:
 * robust intersection depth requires a distinct source-union analysis. */
export function riso36ContourClearance(a:readonly Point[],b:readonly Point[]):number{
  if(a.length<3||b.length<3||![...a,...b].every(p=>
    p.length===2&&Number.isFinite(p[0])&&Number.isFinite(p[1])))
    throw new RangeError("RISO36 needs finite, closed 2D contour polygons");
  const as=edges(a),bs=edges(b);
  if(as.some(s=>bs.some(t=>segmentsCross(s,t)))||
     risoPointInContour(a[0],b)||risoPointInContour(b[0],a))return 0;
  return Math.min(...as.flatMap(s=>bs.map(t=>
    Math.min(pointToSegment(s[0],t),pointToSegment(s[1],t),
      pointToSegment(t[0],s),pointToSegment(t[1],s)))));
}
function parseMatrix(value:string):RisoMatrix{
  const m=/^matrix\(\s*([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s*\)$/.exec(value);
  if(!m)throw new Error("RISO36 needs exact evaluated SVG matrix");
  const [a,b,c,d,e,f]=m.slice(1).map(Number);
  if(![a,b,c,d,e,f].every(Number.isFinite))
    throw new RangeError("RISO36 source part transform is nonfinite");
  return {a,b,c,d,e,f};
}
export function riso36WorldContour(path:string,transform:string,flatness=.25):readonly Point[]{
  const m=parseMatrix(transform);
  return selectRisoSourceContour(path,undefined,flatness).map(([x,y])=>
    [m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f] as const);
}
export interface Riso36Pair {
  pair:string;
  /** Measured from actual printed RED path curves, NOT finger axes. */
  sourceInkGap:number;
  /** Distal tips only, excluding legitimately overlapping proximal bases. */
  distalInkGap:number;
  /** Middle curved segments only. */
  middleInkGap:number;
  /** Proximal/red metacarpal roots, normally nearest the palm. */
  proximalInkGap:number;
  /** Number of cross-digit segment-pair contacts across all 3x3 sections. */
  crossInkContacts:number;
}
/** Pure source inspector: the actual two-spot red stencil at its original
 * 240-frame animation cel. Doesn't modify actor parts, masks or film poses. */
export function inspectRiso36RedFingerSilhouettes(
  spec:RisoCharacterSpec,frame:number,side:Riso36Side,flatness=.25,
){
  const pose=evaluateRisoCharacter(spec,frame);
  const sources=new Map(pose.parts.map(p=>[p.id,p]));
  const geometry=new Map<string,readonly Point[]>();
  for(const digit of RISO36_DIGITS){
    for(const section of RISO36_SECTIONS){
      const id=side+"-glove-"+digit+
        (section==="proximal"?"":section==="middle"?"-middle-phalanx":"-distal-phalanx");
      const part=sources.get(id);
      if(!part||part.plate!=="red"||part.paint!=="solid"||part.knockoutOnly)
        throw new Error("RISO36 missing original RED finger source "+id);
      geometry.set(digit+"/"+section,riso36WorldContour(part.d,part.transform,flatness));
    }
  }
  const pairs:Riso36Pair[]=[];
  for(let i=0;i<RISO36_DIGITS.length-1;i++){
    const first=RISO36_DIGITS[i],second=RISO36_DIGITS[i+1];
    const sep=(a:Riso36Section,b:Riso36Section)=>
      riso36ContourClearance(geometry.get(first+"/"+a)!,geometry.get(second+"/"+b)!);
    const sections=RISO36_SECTIONS;
    const contacts=sections.flatMap(a=>sections.map(b=>sep(a,b)));
    pairs.push({
      pair:first+"-"+second,
      sourceInkGap:Math.min(...contacts),
      proximalInkGap:sep("proximal","proximal"),
      middleInkGap:sep("middle","middle"),
      distalInkGap:sep("distal","distal"),
      crossInkContacts:contacts.filter(g=>g<EPS).length,
    });
  }
  return {actor:spec.id,side,frame,pairs,
    minimumInkGap:Math.min(...pairs.map(p=>p.sourceInkGap)),
    minimumDistalGap:Math.min(...pairs.map(p=>p.distalInkGap)),
    crossInkContacts:pairs.reduce((n,p)=>n+p.crossInkContacts,0),
    sourcePartCount:geometry.size,
    screening:"true closed red source SVG contours; source units, before registration" as const};
}
