/** Deterministic book-page deformation for frame-addressable cinematic rendering.
 * All coordinates are in book-space: left edge is the fixed spine (x=0),
 * right edge is the leaf's free edge (x=width).
 * No timers, transitions, allocations per vertex, or dependency on prior pose.
 */
export interface PaperCurlPose {
  angleRadians:number;
  curl:number;
  sheetLift:number;
  progress:number;
}
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const ease=(v:number)=>{const t=clamp(v);return t*t*(3-2*t)};
export function paperCurlPose(frame:number,startFrame:number,endFrame:number,
  direction:"left"|"right"="left",reducedMotion=false):PaperCurlPose{
  if(![frame,startFrame,endFrame].every(Number.isFinite)||endFrame<=startFrame)
    throw new Error("Paper curl requires finite frames and a positive duration");
  const progress=reducedMotion?1:ease((frame-startFrame)/(endFrame-startFrame));
  const arch=Math.sin(progress*Math.PI);
  return {angleRadians:(direction==="left"?1:-1)*Math.PI*progress,
    curl:reducedMotion?0:arch,
    sheetLift:reducedMotion?0:arch*.085,
    progress};
}
/** Pure page-space vertex displacement. Surface normals are recomputed by the
 * host's geometry layer. Rest vertices should be supplied for every seek.
 */
export function deformPaperVertex(
  x:number,y:number,width:number,pose:PaperCurlPose,
):readonly [number,number,number]{
  if(![x,y,width,pose.curl,pose.sheetLift].every(Number.isFinite)||width<=0)
    throw new Error("Invalid paper vertex");
  const u=clamp(x/width);
  // Spine and free edge stay in their page plane. The body bows out of plane
  // with a second smaller wave near the lifted free edge.
  const bend=Math.sin(u*Math.PI)*pose.curl;
  const xShift=-width*.065*bend;
  const z=pose.curl*(.32*Math.sin(u*Math.PI)+.1*Math.sin(2*u*Math.PI))
    +pose.sheetLift*(u*u);
  const twist=pose.curl*Math.sin(u*Math.PI)*y*.035;
  return [x+xShift,y,z+twist];
}
/** Actual geometry displacement is evaluated from immutable rest positions,
 * so rendering frame 90 then 10 is identical to rendering frame 10 directly.
 */
export function deformPaperPositions(
  rest:Float32Array,output:Float32Array,width:number,pose:PaperCurlPose,
):void{
  if(rest.length!==output.length||rest.length%3!==0)
    throw new Error("Paper geometry buffers need equal XYZ triplet lengths");
  for(let i=0;i<rest.length;i+=3){
    const [x,y,z]=deformPaperVertex(rest[i],rest[i+1],width,pose);
    output[i]=x;output[i+1]=y;output[i+2]=rest[i+2]+z;
  }
}
