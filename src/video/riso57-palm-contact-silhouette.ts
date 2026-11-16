/**
 * RISO57 / ANAT1 — original, uninterrupted three-quarter *positive* palm.
 *
 * Observation: authentic two-hand paper exchange photographs present a
 * narrowed carpal wrist, a broad asymmetric but NOT circular metacarpal
 * fan, a pronounced concave first-web-space transition, and *different*
 * MCP heights / open valleys for index, middle, ring and little finger.
 * RISO47–55 used a twenty-unit round red mitten body: adjusting tiny
 * distal source bones cannot correct that macro silhouette.
 *
 * Author the ONE existing original red glove outline from 16 measured
 * anatomical contour landmarks. Generate 16 TRUE cubic Bézier spans in
 * connected C1 continuity, with narrower handle tension in the actual
 * concave web fold. That retains the original physical RED stencil path
 * ID and 16-cubic richness while preserving all prior cobalt and tendon
 * marks, nail/knuckle paths, actor poses, and 24fps index–paper depth.
 * This is an *original editorial illustration*, not photo landmark fit.
 */
export type Riso57Actor="courier"|"paper-artist";
export type Riso57Side="left"|"right";
export type Riso57SurfaceLandmark=
  "radial-wrist"|"flexor-radialis"|"thenar-bulge"|
  "first-web-inset"|"index-mcp"|"index-middle-web"|
  "middle-mcp"|"middle-ring-web"|"ring-mcp"|
  "ring-little-web"|"fifth-mcp"|"hypothenar-heel"|
  "pisiform-wrist"|"ulnar-wrist"|"palmaris-axis"|
  "radial-wrist-return";

export interface Riso57PalmKnot {
  readonly landmark:Riso57SurfaceLandmark;
  readonly x:number;
  readonly y:number;
  /** 0..1 anatomical tangent / fold tension, lower at web concavities. */
  readonly tension:number;
}
const source:readonly Riso57PalmKnot[]=[
  {landmark:"radial-wrist",x:5.1,y:-2.3,tension:1},
  {landmark:"flexor-radialis",x:7.3,y:2.2,tension:.92},
  {landmark:"thenar-bulge",x:8.9,y:8.7,tension:.74},
  {landmark:"first-web-inset",x:7.65,y:12.35,tension:.47},
  {landmark:"index-mcp",x:9.0,y:16.0,tension:.65},
  {landmark:"index-middle-web",x:5.8,y:17.2,tension:.55},
  {landmark:"middle-mcp",x:4.4,y:18.75,tension:.60},
  {landmark:"middle-ring-web",x:1.5,y:17.6,tension:.60},
  {landmark:"ring-mcp",x:-1.3,y:18.5,tension:.75},
  {landmark:"ring-little-web",x:-4.6,y:16.6,tension:.58},
  {landmark:"fifth-mcp",x:-6.9,y:16.2,tension:.72},
  {landmark:"hypothenar-heel",x:-7.0,y:10.1,tension:.95},
  {landmark:"pisiform-wrist",x:-6.0,y:3.4,tension:.84},
  {landmark:"ulnar-wrist",x:-4.2,y:-1.5,tension:1},
  {landmark:"palmaris-axis",x:-.6,y:-2.1,tension:1},
  {landmark:"radial-wrist-return",x:3.5,y:-2.0,tension:1},
] as const;

export const RISO57_PALMAR_ANATOMY={
  medium:"existing physical RED positive 16-cubic palm, unchanged BLUE detail",
  reference:"UCI Surface Anatomy of the Hand, thenar/hypothenar, DPC and thumb/index web; ANAT1 HAND_POSES.pinch",
  sourceLandmarkCount:16,
  sourceCubicCount:16,
  nonPhotoTrace:true,
  preservesInkId:"left|right-glove",
  focalRegions:["first-web-inset","index-mcp","middle-mcp","ring-mcp","fifth-mcp"] as const,
} as const;

const round=(v:number)=>Number(v.toFixed(3));
/** Named, source-born 2D visible landmarks; mirrored at the actual hand,
 * then varied independently per character. This does not scale/collapse
 * clinical ANAT1 bones and does not touch original opposite-hand identity.
 */
export function riso57PalmLandmarks(
  actor:Riso57Actor,side:Riso57Side,
):readonly Riso57PalmKnot[]{
  const courier=actor==="courier";
  const sign=side==="right"?1:-1;
  return source.map(k=>{
    let x=k.x,y=k.y;
    if(k.landmark==="first-web-inset"){
      x+=courier?-.22:.24;
      y+=courier?-.20:.33;
    }else if(k.landmark==="thenar-bulge"){
      x+=courier?.32:.07;
    }else if(k.landmark==="index-mcp"){
      y+=courier?.2:-.15;
    }else if(k.landmark==="middle-mcp"){
      y+=courier?.42:.16;
    }else if(k.landmark==="ring-mcp"){
      y+=courier?-.22:.21;
    }else if(k.landmark==="fifth-mcp"){
      x+=courier?-.12:-.28;
      y+=courier?-.22:.05;
    }else if(k.landmark==="hypothenar-heel"){
      x+=courier?-.25:-.40;
    }else if(k.landmark==="ulnar-wrist"){
      x+=courier?-.1:-.32;
    }
    return {...k,x:round(sign*x),y:round(y)};
  });
}

/** Connected original positive palm. Hermite handles at every landmark are
 * shared by the incoming and outgoing strokes, ensuring continuous real
 * vector *flow* rather than disconnected polygon triangles. All prior
 * source-ink path validators and per-cel morphs require exactly 16 C terms.
 */
export function riso57PositivePalmContour(
  actor:Riso57Actor,side:Riso57Side,
):string{
  const points=riso57PalmLandmarks(actor,side);
  if(points.length!==16)throw new Error("RISO57 missing authored palm landmark");
  const pt=(i:number)=>points[(i+points.length)%points.length];
  const xy=(x:number,y:number)=>`${round(x)} ${round(y)}`;
  const first=pt(0);
  const outline=[`M${xy(first.x,first.y)}`];
  for(let i=0;i<points.length;i++){
    const prev=pt(i-1),p=pt(i),q=pt(i+1),next=pt(i+2);
    const v1x=(q.x-prev.x)*p.tension/6,v1y=(q.y-prev.y)*p.tension/6;
    const v2x=(next.x-p.x)*q.tension/6,v2y=(next.y-p.y)*q.tension/6;
    outline.push(`C${xy(p.x+v1x,p.y+v1y)} ${xy(q.x-v2x,q.y-v2y)} ${xy(q.x,q.y)}`);
  }
  return outline.join(" ")+" Z";
}
