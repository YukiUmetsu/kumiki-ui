import type {CrayonColor,CrayonElement} from "../../registry/video/materials/crayon-scene";
import {CRAYON_PORTRAIT_AUDIT} from "./crayon-artcraft-portrait-audit";
import {CRAYON_F1_V50_HAIR_IDS} from "./crayon-artcraft-f1-anat1-photo-hair-v50";

/**
 * CRAYON1 V51 research / !dev: multi-scale rooted hair locks, not a
 * screen-space stripe shader. The photographed Campbell CC0 crown turns
 * from a right-of-center whorl into unequal left and right fall directions.
 * Existing 267 tiny curls and 18 contour pigment bands are fully retained.
 *
 * These guides are 608x1082 original-source *observed construction
 * hypotheses*, not precisely measured individual strands or a 3D scan.
 * Original photo SHA belongs to a browser crop, not full-resolution JPG.
 * Thick undercoat and finely split wax filaments remain distinct layers.
 */
type Region="crown"|"left"|"right";
type Cubic=readonly [number,number,number,number,number,number,number,number];
type Rooted=Extract<CrayonElement,{kind:"contour"}>;
const REGIONS=["crown","left","right"] as const;
const PARENTS:Readonly<Record<Region,string>>={
  crown:"hair-crown-surface",left:"hair-left-curtain",right:"hair-right-curtain",
};
/** The original photograph shows an off-center root fan, near side tucks
 * behind the ear, and far side travels down across the photographed cheek.
 * Every root/shaft curve is local to its REAL original wax hair parent.
 */
export const CRAYON_F1_V51_SOURCE_GUIDES:Readonly<Record<Region,readonly Cubic[]>>={
  crown:[
    [282,205,247,184,173,214,115,287],
    [302,206,262,192,184,207,86,309],
    [277,200,240,195,150,253,57,350],
    [257,210,198,217,117,305,52,410],
    [295,208,328,186,397,230,457,358],
    [315,205,365,198,417,248,462,369],
    [332,217,375,227,442,298,476,415],
  ],
  left:[
    [147,232,96,275,45,398,32,573],
    [124,260,71,346,39,480,32,693],
    [105,305,59,431,42,603,52,795],
    [87,350,50,509,47,715,70,983],
    [62,418,31,561,48,819,77,1080],
  ],
  right:[
    [395,258,441,286,464,429,491,644],
    [410,280,463,329,482,515,509,789],
    [427,329,485,420,502,639,523,1074],
    [446,369,495,481,535,728,566,1090],
    [468,402,507,549,553,791,588,1094],
    [488,463,539,667,582,910,605,1094],
  ],
};
export const CRAYON_F1_V51_SOURCE=Object.freeze({
  sha:CRAYON_PORTRAIT_AUDIT.source.sha256,
  rights:"Christopher Campbell, CC0; source evidence 608x1082 crop",
  originalRootGroups:18,originalFineStrands:267,
  approved:false,
});
/** Dense contact scratches are near-black, mid-tone wax catches, and rare
 * narrow glancing high-value filaments. Different widths/pressure, NEVER
 * a single uniform 1px hairline or repeated straight decorative streak.
 */
const BANDS:Readonly<Record<Region,readonly {
  color:CrayonColor;width:number;opacity:number;waxPressure:number;
  count:number;start:number;
}[]>>={
  crown:[
    {color:"#281e20",width:.86,opacity:.73,waxPressure:.81,count:27,start:179},
    {color:"#93715c",width:.62,opacity:.51,waxPressure:.72,count:24,start:187},
    {color:"#d0a58a",width:.30,opacity:.47,waxPressure:.53,count:13,start:201},
  ],
  left:[
    {color:"#241719",width:.90,opacity:.71,waxPressure:.81,count:31,start:185},
    {color:"#9b7159",width:.61,opacity:.52,waxPressure:.67,count:25,start:199},
    {color:"#c89b7a",width:.30,opacity:.38,waxPressure:.51,count:12,start:213},
  ],
  right:[
    {color:"#211719",width:1.02,opacity:.66,waxPressure:.84,count:34,start:184},
    {color:"#765543",width:.68,opacity:.47,waxPressure:.72,count:27,start:193},
    {color:"#bd8e6f",width:.30,opacity:.35,waxPressure:.56,count:12,start:214},
  ],
};
export const CRAYON_F1_V51_LOCK_IDS=Object.freeze(
  REGIONS.flatMap(region=>[0,1,2].map(band=>"hair-source-lock-"+region+"-"+band)),
);
function hash(seed:number,index:number,channel:number):number{
  let x=Math.imul(seed^Math.imul(index+1,0x45d9f3b),0x27d4eb2d)^
    Math.imul(channel+1,0x9e3779b1);
  x=Math.imul(x^(x>>>16),0x85ebca6b);
  x=Math.imul(x^(x>>>13),0xc2b2ae35);
  return ((x^(x>>>16))>>>0)/4294967296;
}
function pt(g:Cubic,t:number):readonly [number,number]{
  const s=1-t;
  return [s*s*s*g[0]+3*s*s*t*g[2]+3*s*t*t*g[4]+t*t*t*g[6],
    s*s*s*g[1]+3*s*s*t*g[3]+3*s*t*t*g[5]+t*t*t*g[7]];
}
function tangent(g:Cubic,t:number):readonly [number,number]{
  const s=1-t;
  return [3*s*s*(g[2]-g[0])+6*s*t*(g[4]-g[2])+3*t*t*(g[6]-g[4]),
    3*s*s*(g[3]-g[1])+6*s*t*(g[5]-g[3])+3*t*t*(g[7]-g[5])];
}
function curve(g:Cubic,t0:number,t1:number,normalOffset:number):string{
  const a=pt(g,t0),b=pt(g,t1),u=tangent(g,t0),v=tangent(g,t1);
  const lenU=Math.hypot(...u)||1,lenV=Math.hypot(...v)||1;
  const a0=[a[0]-u[1]/lenU*normalOffset,a[1]+u[0]/lenU*normalOffset];
  const b0=[b[0]-v[1]/lenV*normalOffset,b[1]+v[0]/lenV*normalOffset];
  const dt=(t1-t0)/3;
  const cp1=[a0[0]+u[0]*dt,a0[1]+u[1]*dt];
  const cp2=[b0[0]-v[0]*dt,b0[1]-v[1]*dt];
  const coords=[...a0,...cp1,...cp2,...b0];
  if(coords.some(n=>!Number.isFinite(n)||n< -20||n>1110))
    throw new RangeError("Source hair fiber escaped photograph topology");
  const f=(n:number)=>n.toFixed(2);
  return "M"+f(a0[0])+" "+f(a0[1])+
    " C"+f(cp1[0])+" "+f(cp1[1])+" "+
    f(cp2[0])+" "+f(cp2[1])+" "+f(b0[0])+" "+f(b0[1]);
}
function locks(region:Region,bandIndex:number,detail:number):Rooted{
  const guides=CRAYON_F1_V51_SOURCE_GUIDES[region];
  const band=BANDS[region][bandIndex];
  const count=Math.max(3,Math.round(band.count*detail));
  const seed=region==="crown"?48151:region==="left"?48173:48211;
  const d=Array.from({length:count},(_,i)=>{
    const root=guides[Math.floor(hash(seed,i,1)*guides.length)];
    const start=.025+hash(seed,i,2)*.56;
    // Independent original segment lengths and oblique contact; every
    // shaft tangent derives from the exact same cubic root trajectory.
    const length=.22+hash(seed,i,3)*.32;
    const end=Math.min(.99,start+length);
    const offset=(hash(seed,i,4)-.5)*(
      region==="crown"?9:region==="left"?7:10);
    return curve(root,start,end,offset);
  }).join(" ");
  const id="hair-source-lock-"+region+"-"+bandIndex;
  if(d.length>=24000)throw new RangeError("Too many wax strand cubics");
  return {
    kind:"contour",id,d,color:band.color,width:band.width,
    opacity:band.opacity,waxContact:"dry-wax",waxPressure:band.waxPressure,
    parentId:PARENTS[region],clipToParent:true,
    timing:{start:band.start,end:299},
  };
}
export function crayonF1AddPhotoRootLocksV51(
  elements:readonly CrayonElement[],detail:number,
):CrayonElement[]{
  if(!Number.isFinite(detail)||detail<.2||detail>1)
    throw new RangeError("Invalid original-source hair detail");
  if(CRAYON_F1_V51_SOURCE.sha!==
    "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2")
    throw new RangeError("Unregistered CC0 photographed source");
  const ids=new Map<string,CrayonElement>();
  for(const x of elements){
    if(ids.has(x.id))throw new RangeError("Duplicated original hair strand "+x.id);
    ids.set(x.id,x);
  }
  const face=ids.get("face-outline");
  if(face?.kind!=="wax"||face.underpaintFields?.length!==8)
    throw new RangeError("V51 requires intact original V48 facial skin");
  for(let i=0;i<CRAYON_F1_V50_HAIR_IDS.length;i++){
    const id=CRAYON_F1_V50_HAIR_IDS[i],hair=ids.get(id);
    if(hair?.kind!=="wax"||hair.coverage!=="opaque"||
      hair.underpaintFields?.length!==(i===2?3:4)||!hair.underpaintGradient)
      throw new RangeError("V51 requires V50 native hair mass "+id);
  }
  for(const region of REGIONS){
    const roots=[...ids.values()].filter(x=>
      x.id.startsWith("hair-rooted-"+region+"-"));
    if(roots.length<1||roots.some(x=>x.kind!=="contour"||
      x.parentId!==PARENTS[region]||x.clipToParent!==true))
      throw new RangeError("Original source-rooted strand field missing "+region);
  }
  for(const id of ["hair-back","sclera-near","iris-near","iris-far",
    "cc0-hedge-dark-underpaint","source-brow-follicles-near"])
    if(!ids.has(id))throw new RangeError("Protected original photo geometry missing "+id);
  if(CRAYON_F1_V51_LOCK_IDS.some(id=>ids.has(id))||elements.length+9>240)
    throw new RangeError("Source photo locks already applied or over budget");
  return [...elements,...REGIONS.flatMap(region=>
    [0,1,2].map(band=>locks(region,band,detail)))];
}
