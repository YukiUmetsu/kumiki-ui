/**
 * New character #01 — STAGE 1 ONLY.
 *
 * The previously shipped woman/portrait was deliberately retired and is NOT
 * imported or used here.  This is a fresh neutral adult head construction
 * driven by a separately parameterized MediaPipe ANAT1 mesh.  It deliberately
 * has NO eyes, lashes, nose, lips, ears, hairstyle or clothing yet.
 *
 * The frame starts with one facial-contour region; subsequent ArtCraft PRs
 * must finish and visually approve each feature before another is built.
 * This is an anatomy BLOCKOUT, never a finished character/portrait.
 */
import { createFace, FACE_FEATURES, FACE_LANDMARKS } from "../../registry/anatomy/anatomy-face";
import { smoothPath } from "../../registry/anatomy/anatomy-view";
import { pencilHash } from "../../registry/video/colored-pencil";
import type { PencilTrace } from "../../registry/video/colored-pencil";
import type { PencilSubjectPart, PencilPalette } from "./colored-pencil-living-studies";

type Point=[number,number];
const r=(x:number)=>Math.round(x*100)/100;
const n=(x:number)=>r(x).toFixed(2);
const line=(a:Point,b:Point,c:Point)=>"M"+n(a[0])+" "+n(a[1])+
  " Q"+n(b[0])+" "+n(b[1])+" "+n(c[0])+" "+n(c[1]);
const drawn=(id:string,path:string,color:string,width:number,opacity:number,
  startFrame=205):PencilTrace=>({
  id,path,color,width,opacity,startFrame,durationFrames:57,
});

/** Three independent, physically short dry-pencil glaze passes.
 * Guide samples come from three new bony structure curves and vary by
 * local tangent; this is not an old portrait's facial shading or a filter.
 */
function newHeadValuePencil(
  guides:readonly (readonly [Point,Point,Point])[],
  seed:number,
):PencilTrace[]{
  const values=[
    {color:"#967678",width:.41,opacity:.36,start:186},
    {color:"#C9A295",width:.34,opacity:.30,start:212},
    {color:"#F2D4B9",width:.27,opacity:.23,start:240},
  ] as const;
  return values.map((v,layer)=>{
    const marks:string[]=[];
    guides.forEach(([a,c,b],index)=>{
      for(let i=0;i<38;i++){
        const key=index*157+layer*53+i;
        const t=Math.max(.025,Math.min(.975,
          (i+.5+(pencilHash(seed,key,11)-.5)*.48)/38));
        const u=1-t;
        const x=u*u*a[0]+2*u*t*c[0]+t*t*b[0];
        const y=u*u*a[1]+2*u*t*c[1]+t*t*b[1];
        const tx=2*u*(c[0]-a[0])+2*t*(b[0]-c[0]);
        const ty=2*u*(c[1]-a[1])+2*t*(b[1]-c[1]);
        const size=Math.hypot(tx,ty);
        if(size<.0001)continue;
        const dx=tx/size,dy=ty/size,nx=-dy,ny=dx;
        const shift=(pencilHash(seed,key,12)-.5)*5;
        const len=(1.9+2.2*pencilHash(seed,key,13))*
          (layer===2?.72:1);
        const x0=x+nx*shift,y0=y+ny*shift;
        const curve=(pencilHash(seed,key,14)-.5)*.8;
        marks.push(line([x0,y0],
          [x0+dx*len*.52+nx*curve,y0+dy*len*.52+ny*curve],
          [x0+dx*len+nx*curve*.4,y0+dy*len+ny*curve*.4]));
      }
    });
    return drawn("newhead-value-"+layer,marks.join(" "),
      v.color,v.width,v.opacity,v.start);
  });
}

/** Stage 1-only head value fields. Pencil touches follow the cranial turn,
 * temporal recession, zygomatic wedge and mandibular fold. Unlike an
 * all-head Cartesian hatch these marks have independent local growth angles
 * and widths; their ellipse boundaries feather by tip pressure, while the
 * actual (unmodified) silhouette owns the SVG clipping. No eyes, nose,
 * hair, ears or feature stickers are drawn.
 *
 * Each field is split into bounded editable traces: no image underlay, canvas
 * photograph, flat gradient, displacement filter or global screen grain.
 */
function newHeadPlanePigment(
  bounds:readonly [number,number,number,number],
  seed:number,
):PencilTrace[]{
  const [x0,y0,w,h]=bounds;
  const planes=[
    {id:"cranial",center:[.49,.26],radii:[.44,.27],skew:-.08,
      heading:.13,turn:.32,colors:["#937A7D","#CEA596","#E6CAB0"],
      load:.87},
    {id:"temporal",center:[.20,.43],radii:[.25,.35],skew:.16,
      heading:-.93,turn:.26,colors:["#775E69","#B38D82","#CFAD99"],
      load:1.00},
    {id:"far-temple",center:[.82,.46],radii:[.18,.30],skew:-.10,
      heading:1.03,turn:-.34,colors:["#8C7376","#C59B87","#E3BFA6"],
      load:.74},
    {id:"malar",center:[.35,.68],radii:[.29,.21],skew:-.30,
      heading:.25,turn:.62,colors:["#9C7374","#D3A28D","#ECC5A6"],
      load:.94},
  ] as const;
  const traces:PencilTrace[]=[];
  planes.forEach((plane,part)=>{
    const cx=x0+w*plane.center[0],cy=y0+h*plane.center[1];
    const rx=w*plane.radii[0],ry=h*plane.radii[1];
    const cs=Math.cos(plane.skew),sn=Math.sin(plane.skew);
    for(let layer=0;layer<3;layer++)for(let group=0;group<3;group++){
      const strokes:string[]=[];
      for(let i=0;i<150;i++){
        const key=part*79031+layer*12947+group*313+i;
        const theta=2*Math.PI*pencilHash(seed,key,71);
        const radial=Math.sqrt(pencilHash(seed,key,72))*.98;
        const ux=radial*Math.cos(theta),uy=radial*Math.sin(theta);
        // A dense soft middle feathers outward without stamped ellipse edges.
        const fade=Math.pow(1-radial*radial,.62);
        if(pencilHash(seed,key,73)>.59+.41*fade)continue;
        const localX=ux*rx,localY=uy*ry;
        const x=cx+localX*cs-localY*sn;
        const y=cy+localX*sn+localY*cs;
        const heading=plane.heading+plane.turn*uy+.23*ux+
          (pencilHash(seed,key,74)-.5)*.26;
        const len=(2.7+5.7*pencilHash(seed,key,75))*
          (.32+.68*fade)*(layer===2?.75:1);
        const vx=Math.cos(heading),vy=Math.sin(heading);
        const ox=-vy,oy=vx;
        const bow=(pencilHash(seed,key,76)-.5)*.74*fade;
        strokes.push(line([x-vx*len*.46,y-vy*len*.46],
          [x+ox*bow,y+oy*bow],
          [x+vx*len*.54+ox*bow*.22,
            y+vy*len*.54+oy*bow*.22]));
      }
      traces.push(drawn(
        "newhead-plane-"+plane.id+"-"+layer+"-"+group,
        strokes.join(" "),plane.colors[layer],
        [.43,.34,.27][layer],
        [.40,.34,.29][layer]*plane.load,
        162+layer*22+part*4+group*3,
      ));
    }
  });
  return traces;
}

export const NEW_CHARACTER_01_ID="head-silhouette-01" as const;
export const NEW_CHARACTER_01_STAGE="head-outline" as const;

/** Source-of-truth for this new head, shared by its drawing and native
 * Storybook construction overlay. These are generated mesh coordinates,
 * NOT independent source-photo landmarks or claims of ArtCraft acceptance.
 * Keep facial details absent until the whole head silhouette is approved.
 */
const NEW_HEAD_FACE={
  norm:"north-american-white" as const,sex:.69,eyeSpacing:.07,
  noseWidth:.02,noseLength:.10,lowerFace:.23,faceWidth:1.035,
};
const NEW_HEAD_YAW=17*Math.PI/180;
const projectNewHeadPoint=(vertex:readonly number[]):Point=>[
  r(224+1.36*(vertex[0]*Math.cos(NEW_HEAD_YAW)+
    (vertex[2]-50)*Math.sin(NEW_HEAD_YAW))),
  r(227-1.44*vertex[1]+.03*(vertex[2]-50)),
];
export const NEW_CHARACTER_01_INSPECTION_KEYS=[
  "forehead","glabella","zygion.R","zygion.L",
  "cheekbone.R","cheekbone.L","gonion.R","gonion.L","menton",
] as const satisfies readonly (keyof typeof FACE_LANDMARKS)[];

export function newCharacterHeadInspectionAnchors(){
  const face=createFace(NEW_HEAD_FACE);
  return NEW_CHARACTER_01_INSPECTION_KEYS.map(id=>({
    id,point:projectNewHeadPoint(face.vertices[FACE_LANDMARKS[id]]),
  }));
}

/** Fresh original skull/vault blockout: measured lower face plus newly
 * authored parietal and frontal arch; NO previous woman silhouette. */
export function newCharacterHeadStageOne(seed=271):PencilSubjectPart[]{
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483000)
    throw new RangeError("New character study requires a valid drawing seed");
  // Fresh proportions, camera yaw, outline and local marks are independent
  // of pencilPortraitAnatomy() and the retired woman face() factory.
  const face=createFace(NEW_HEAD_FACE);
  const at=(key:keyof typeof FACE_LANDMARKS):Point=>
    projectNewHeadPoint(face.vertices[FACE_LANDMARKS[key]]);
  // Browser 960×540 review rejected the unmodified face MASK: it was a
  // flat-topped salmon shield, not a skull. MediaPipe deliberately STOPS at
  // the hairline and lacks the cranial vault. Keep the mesh's measured lower
  // face/jaw points, but lift an independently drafted vault from observed
  // head/skull construction ratios. This is still a FIRST-STAGE outline.
  const faceRing=FACE_FEATURES.oval.loop.map(i=>projectNewHeadPoint(face.vertices[i]));
  if(faceRing.length<30||faceRing.some(p=>p.some(v=>!Number.isFinite(v))))
    throw new Error("Missing ANAT1 facial outline anchor points");
  const faceTop=Math.min(...faceRing.map(p=>p[1]));
  const faceBottom=Math.max(...faceRing.map(p=>p[1]));
  const faceWidth=Math.max(...faceRing.map(p=>p[0]))-
    Math.min(...faceRing.map(p=>p[0]));
  // The cheek-temple interfaces are the FIRST anatomical points below
  // about 24% of the facial mask's projected height on each side.
  const templeLevel=faceTop+(faceBottom-faceTop)*.24;
  const rightTempleIndex=faceRing.findIndex((p,i)=>
    i>0&&p[1]>=templeLevel);
  // Repository TypeScript libs target pre-ES2023: explicit reverse
  // scan preserves deterministic source mesh ordering on every runtime.
  let leftTempleIndex=-1;
  for(let i=faceRing.length-1;i>rightTempleIndex;i--){
    if(faceRing[i][1]>=templeLevel){leftTempleIndex=i;break;}
  }
  if(rightTempleIndex<2||leftTempleIndex-rightTempleIndex<16)
    throw new Error("ANAT1 lacks two connected cheek/temple side chains");
  const lower=faceRing.slice(rightTempleIndex,leftTempleIndex+1);
  const lo=Math.min(...faceRing.map(p=>p[0]));
  const hi=Math.max(...faceRing.map(p=>p[0]));
  const left=lower[lower.length-1],right=lower[0];
  // Open curved vault with frontal and parietal surface turns: NOT the
  // previous portrait scalp, nor a circle/ellipse pasted on a face.
  const vault:Point[]=[
    [r(left[0]-faceWidth*.04),r(faceTop+faceWidth*.055)],
    [r(lo-faceWidth*.05),r(faceTop-faceWidth*.075)],
    [r(lo+faceWidth*.02),r(faceTop-faceWidth*.205)],
    [r(lo+faceWidth*.205),r(faceTop-faceWidth*.315)],
    [r(lo+faceWidth*.415),r(faceTop-faceWidth*.365)],
    [r(lo+faceWidth*.665),r(faceTop-faceWidth*.295)],
    [r(hi+faceWidth*.015),r(faceTop-faceWidth*.135)],
    [r(right[0]+faceWidth*.025),r(faceTop+faceWidth*.055)],
  ];
  const perimeter=[...lower,...vault];
  const contour=smoothPath(perimeter,true);
  const xs=perimeter.map(p=>p[0]),ys=perimeter.map(p=>p[1]);
  const x0=Math.min(...xs)-4,y0=Math.min(...ys)-4;
  const bounds:readonly [number,number,number,number]=[
    r(x0),r(y0),r(Math.max(...xs)-x0+4),r(Math.max(...ys)-y0+4),
  ];
  // Preserve open, useful negative space. These lines are temporary
  // *construction marks* for forehead/jaw/cheek only, not fake eyes/mouth.
  const forehead=at("forehead"),glabella=at("glabella");
  const leftCheek=at("cheekbone.L"),rightCheek=at("cheekbone.R");
  const leftJaw=at("gonion.L"),rightJaw=at("gonion.R");
  const chin=at("menton"),zyL=at("zygion.L"),zyR=at("zygion.R");
  const guides:readonly (readonly [Point,Point,Point])[]=[
    [forehead,glabella,chin],
    [zyR,rightCheek,rightJaw],
    [zyL,leftCheek,leftJaw],
  ];
  // Stage 1 is PENCIL CONSTRUCTION on paper, not fully opaque dermal
  // paint. The previous flat salmon wax mask was rejected in native proof.
  const palette:PencilPalette=["#B1978A","#82707A","#E0C3A6"];
  return [{
    id:NEW_CHARACTER_01_ID,material:"glaze",palette,path:contour,
    bounds,direction:64,flow:11,start:73,
    details:[
      ...newHeadPlanePigment(bounds,(seed+1831)%2147483647),
      ...newHeadValuePencil(guides,(seed+1001)%2147483647),
      drawn("newhead-sagittal-guide",line(forehead,glabella,chin),
        "#90777C",.32,.31,103),
      drawn("newhead-zygomatic-guides",
        line(zyR,rightCheek,rightJaw)+" "+line(zyL,leftCheek,leftJaw),
        "#987B7B",.33,.46,139),
      drawn("newhead-mandibular-hinge",
        line(rightJaw,chin,leftJaw),"#7E6871",.36,.43,165),
      drawn("newhead-orbital-placement-only",
        line(at("exocanthion.R"),glabella,at("exocanthion.L")),
        "#B39D97",.28,.24,174),
      // Partial nested skull vault line is observed construction, NOT hair.
      drawn("newhead-cranial-vault-turn",
        line([vault[1][0]+7,vault[1][1]+19],
          [vault[4][0],vault[4][1]+16],
          [vault[6][0]-7,vault[6][1]+14]),
        "#A58C85",.33,.39,153),
    ],
  }];
}
