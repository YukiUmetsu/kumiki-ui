import {evaluateRisoCharacter} from "../../registry/video/riso-character";
import type {RisoCharacterFrame,RisoCharacterSpec,RisoJointFrame} from "../../registry/video/riso-character";
import {RISO31_GEOMETRY} from "./riso31-finger-phalanges";

/** RISO33 ArtCraft: measure from ACTUAL source joint frames, not a
 * decorative hand drawn independently of the film. This is projected
 * centerline separation; the artist must also visually inspect the
 * RED silhouette and physical paper-white gaps at native print scale. */
const DIGITS=["index","middle","ring","pinky"] as const;
type Digit=(typeof DIGITS)[number];
type Point={x:number;y:number};
type Segment=[Point,Point];
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const determinant=(a:Point,b:Point,c:Point)=>
  (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function onSegment(a:Point,b:Point,p:Point){
  return Math.abs(determinant(a,b,p))<1e-8&&
    p.x>=Math.min(a.x,b.x)-1e-8&&p.x<=Math.max(a.x,b.x)+1e-8&&
    p.y>=Math.min(a.y,b.y)-1e-8&&p.y<=Math.max(a.y,b.y)+1e-8;
}
function intersect([a,b]:Segment,[c,d]:Segment){
  const abc=determinant(a,b,c),abd=determinant(a,b,d),
    cda=determinant(c,d,a),cdb=determinant(c,d,b);
  if(abc*abd<0&&cda*cdb<0)return true;
  return (Math.abs(abc)<1e-8&&onSegment(a,b,c))||
    (Math.abs(abd)<1e-8&&onSegment(a,b,d))||
    (Math.abs(cda)<1e-8&&onSegment(c,d,a))||
    (Math.abs(cdb)<1e-8&&onSegment(c,d,b));
}
function pointDistance(p:Point,[a,b]:Segment){
  const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
  const t=Math.max(0,Math.min(1,den>1e-10?
    ((p.x-a.x)*dx+(p.y-a.y)*dy)/den:0));
  return distance(p,{x:a.x+t*dx,y:a.y+t*dy});
}
function segmentDistance(a:Segment,b:Segment){
  if(intersect(a,b))return 0;
  return Math.min(pointDistance(a[0],b),pointDistance(a[1],b),
    pointDistance(b[0],a),pointDistance(b[1],a));
}
export interface Riso33AxisPair {
  first:Digit;second:Digit;
  /** Minimum separation of all 3 linked bone-centerline segments. */
  minimumAxisGap:number;
  /** Distal fingertip to fingertip, using the actual posed DIP matrix. */
  tipDistance:number;
}
export function inspectRiso33HandFan(spec:RisoCharacterSpec,frame:number,
  side:"left"|"right"){
  const posed:RisoCharacterFrame=evaluateRisoCharacter(spec,frame);
  const source=new Map(posed.joints.map(j=>[j.id,j]));
  const joint=(name:string):RisoJointFrame=>{
    const j=source.get(side+"-"+name);
    if(!j)throw new RangeError("RISO33 source anatomy missing "+side+"-"+name);
    return j;
  };
  const point=(name:string):Point=>{
    const j=joint(name);return {x:j.x,y:j.y};
  };
  const bones=(digit:Digit):{axis:Segment[];tip:Point}=>{
    const base=point(digit),pip=point(digit+"-pip"),dip=joint(digit+"-dip");
    const length=RISO31_GEOMETRY[digit].distal;
    const tip={x:dip.matrix.c*length+dip.x,y:dip.matrix.d*length+dip.y};
    return {axis:[[base,pip],[pip,{x:dip.x,y:dip.y}],[{x:dip.x,y:dip.y},tip]],tip};
  };
  const rows:Riso33AxisPair[]=[];
  for(let i=0;i<DIGITS.length-1;i++){
    const first=DIGITS[i],second=DIGITS[i+1],
      a=bones(first),b=bones(second);
    rows.push({first,second,minimumAxisGap:Math.min(
      ...a.axis.flatMap(s=>b.axis.map(t=>segmentDistance(s,t)))),
      tipDistance:distance(a.tip,b.tip)});
  }
  return {actor:spec.id,side,frame,pairs:rows,
    minimumAxisGap:Math.min(...rows.map(r=>r.minimumAxisGap)),
    minimumTipGap:Math.min(...rows.map(r=>r.tipDistance)),
    intersectingAxisPairs:rows.filter(r=>r.minimumAxisGap<.001).map(r=>r.first+"-"+r.second)};
}
