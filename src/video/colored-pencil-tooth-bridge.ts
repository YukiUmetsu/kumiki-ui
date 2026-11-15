/**
 * ArtCraft CP17 — selective dry-pencil tooth bridging in photographed skin.
 *
 * A source-registered light skin plane must NOT be left as disconnected
 * ivory gaps between dark, regular hatches. This is a reversible, opt-in
 * feedback drawing pass: inspect the *already painted* paper, look for
 * source-supported missing pigment, then lay individual short pencil nibs.
 *
 * The output consists only of quadratic dry strokes. No image copy,
 * sampled bitmap, raster face underpainting, blur or flat polygon fill.
 * Artist-technique references: Gildow (long sharp point / layered loops);
 * Nickelsen (closely spaced light sharp marks instead of dark grain).
 */
import {pencilHash} from "../../registry/video/colored-pencil";
import {pencilSkinFibreFlow} from "./colored-pencil-full-head";
import type {PencilPhotoPixels,PencilPhotoMark} from "./colored-pencil-photo";
import type {PortraitFeatureMap} from "./colored-pencil-portrait-guides";

type Point=readonly[number,number];
type Crop=Readonly<{left:number;top:number;width:number;height:number}>;
const WIDTH=540,HEIGHT=600;
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
const dist=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const inside=(p:Point,poly:readonly Point[])=>{
  let yes=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j];
    if((a[1]>p[1])!==(b[1]>p[1])&&
      p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;
  }
  return yes;
};
const pixel=(img:PencilPhotoPixels,x:number,y:number):readonly[number,number,number]=>{
  const ix=clamp(Math.round(x),0,img.width-1);
  const iy=clamp(Math.round(y),0,img.height-1);
  const p=4*(iy*img.width+ix);
  return [img.data[p],img.data[p+1],img.data[p+2]];
};
const value=(rgb:readonly number[])=>(
  .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2])/255;
const sample=(img:PencilPhotoPixels,x:number,y:number,step:number)=>{
  const a=pixel(img,x,y),b=pixel(img,x-step,y),c=pixel(img,x+step,y);
  const d=pixel(img,x,y-step),e=pixel(img,x,y+step);
  return [0,1,2].map(i=>
    (4*a[i]+b[i]+c[i]+d[i]+e[i])/8) as [number,number,number];
};
const gradient=(img:PencilPhotoPixels,x:number,y:number)=>{
  const dx=value(sample(img,x+1.5,y,.5))-
    value(sample(img,x-1.5,y,.5));
  const dy=value(sample(img,x,y+1.5,.5))-
    value(sample(img,x,y-1.5,.5));
  return Math.hypot(dx,dy);
};
const hex=(rgb:readonly number[])=>"#"+rgb.map(c=>
  clamp(Math.round(c),0,255).toString(16).padStart(2,"0")).join("");
const on=(a:Point,c:Point,b:Point,t:number):Point=>{
  const u=1-t;
  return [u*u*a[0]+2*u*t*c[0]+t*t*b[0],
    u*u*a[1]+2*u*t*c[1]+t*t*b[1]];
};
export interface PencilToothBridgeEvidence {
  readonly marks:readonly PencilPhotoMark[];
  readonly sourceMatchedGaps:number;
  readonly protectedContours:number;
  readonly protectedHighlights:number;
  readonly protectedAnatomy:number;
  readonly untouchedAreas:number;
  readonly strength:number;
  readonly rasterUnderpainting:false;
}
const validate=(source:PencilPhotoPixels,drawing:PencilPhotoPixels,
  guides:PortraitFeatureMap,face:readonly Point[],crop:Crop,
  strength:number,seed:number)=>{
  const valid=(p:PencilPhotoPixels)=>
    p&&Number.isSafeInteger(p.width)&&Number.isSafeInteger(p.height)&&
    p.width>=8&&p.height>=8&&p.width<=2048&&p.height<=2048&&
    p.data instanceof Uint8ClampedArray&&
    p.data.length===4*p.width*p.height;
  if(!valid(source)||!valid(drawing)||
    !guides||Object.keys(guides).length!==25||
    Object.values(guides).some(p=>!Array.isArray(p)||p.length!==2||
      p.some(n=>!Number.isFinite(n)))||
    !Array.isArray(face)||face.length<3||face.length>256||
    face.some(p=>p.length!==2||p.some((n:number)=>!Number.isFinite(n)))||
    !crop||![crop.left,crop.top,crop.width,crop.height]
      .every(Number.isFinite)||crop.width<=0||crop.height<=0||
    !Number.isFinite(strength)||strength<0||strength>1||
    !Number.isSafeInteger(seed)||seed<0||seed>2147483647||
    drawing.width/drawing.height!==WIDTH/HEIGHT)
    throw new RangeError("Invalid source-registered dry pencil tooth bridge");
};

/** Existing paint -> evidence-guided, independently drawn interstitial nibs. */
export function createPhotoSkinToothBridge(
  source:PencilPhotoPixels,drawing:PencilPhotoPixels,
  guides:PortraitFeatureMap,face:readonly Point[],crop:Crop,
  strength=.7,seed=271,
):PencilToothBridgeEvidence {
  validate(source,drawing,guides,face,crop,strength,seed);
  const marks:PencilPhotoMark[]=[];
  let sourceMatchedGaps=0,protectedContours=0,protectedHighlights=0,
    protectedAnatomy=0,untouchedAreas=0;
  const result=()=>({marks,sourceMatchedGaps,protectedContours,
    protectedHighlights,protectedAnatomy,untouchedAreas,strength,
    rasterUnderpainting:false as const});
  if(strength===0)return result();
  const eye=dist(guides.eyeNearCenter,guides.eyeFarCenter);
  if(eye<6||eye>1200)throw new RangeError("Invalid eye reference scale");
  const src=(p:Point):Point=>[
    crop.left+p[0]/WIDTH*crop.width,
    crop.top+p[1]/HEIGHT*crop.height,
  ];
  const drawScale=drawing.width/WIDTH;
  const step=4.05;
  const nx=Math.ceil(WIDTH/step),ny=Math.ceil(HEIGHT/step);
  // Interleaved angular passes: no screen-wide parallel hatch or photo
  // pixel stamps. Each nib is independent of render frame / browser time.
  for(const pass of [0,1] as const)for(let iy=0;iy<ny;iy++)
    for(let ix=0;ix<nx;ix++){
      const k=iy*nx+ix+pass*200003;
      const x=(ix+.5+pass*.31+
        (pencilHash(seed,k,211)-.5)*.52)*step;
      const y=(iy+.5+pass*.23+
        (pencilHash(seed,k,212)-.5)*.52)*step;
      if(x<3||y<3||x>=WIDTH-3||y>=HEIGHT-3)continue;
      const sourcePoint=src([x,y]);
      if(!inside(sourcePoint,face))continue;
      const rgb=sample(source,sourcePoint[0],sourcePoint[1],1.2);
      const sourceY=value(rgb);
      if(sourceY>.912){protectedHighlights++;continue;}
      if(Math.min(dist(sourcePoint,guides.eyeNearCenter),
        dist(sourcePoint,guides.eyeFarCenter))<eye*.33||
        dist(sourcePoint,guides.lipCupid)<eye*.30||
        dist(sourcePoint,guides.noseTip)<eye*.20){
        protectedAnatomy++;continue;
      }
      if(gradient(source,sourcePoint[0],sourcePoint[1])>.048){
        protectedContours++;continue;
      }
      const drawnY=value(sample(drawing,x*drawScale,
        y*drawScale,drawScale*.76));
      const paperGap=drawnY-sourceY;
      // An intact tone or an intentional dark fibre is never brightened,
      // moved, removed or overdrawn. Recheck actual source values rather
      // than using a flat universal flesh colour.
      if(paperGap<.032){untouchedAreas++;continue;}
      const brightness=clamp((paperGap-.02)*4.2,0,1);
      const probability=clamp((.18+.52*brightness)*strength,0,.85);
      if(pencilHash(seed,k,213)>probability)continue;
      const flow=pencilSkinFibreFlow(sourcePoint,guides,eye,pass);
      const angle=flow.angle+(pass===1?.73:0)+
        (pencilHash(seed,k,214)-.5)*.21;
      const length=step*(.74+.31*pencilHash(seed,k,215));
      const vx=Math.cos(angle)*length,vy=Math.sin(angle)*length;
      const start:Point=[x-vx*.5,y-vy*.5];
      const end:Point=[x+vx*.5,y+vy*.5];
      const lift=(pass===0?1:-1)*length*
        (.12+.08*pencilHash(seed,k,216));
      const control:Point=[x-Math.sin(angle)*lift,
        y+Math.cos(angle)*lift];
      // A source-supported pigment centre does not authorize the nib to
      // cross a true glint, lip boundary or outward face contour.
      let blocked=false;
      for(const t of [0,.25,.5,.75,1]){
        const q=src(on(start,control,end,t));
        if(!inside(q,face)||gradient(source,q[0],q[1])>.048){
          blocked=true;protectedContours++;break;
        }
        if(value(sample(source,q[0],q[1],.6))>.912){
          blocked=true;protectedHighlights++;break;
        }
        if(Math.min(dist(q,guides.eyeNearCenter),
          dist(q,guides.eyeFarCenter))<eye*.33||
          dist(q,guides.lipCupid)<eye*.30||
          dist(q,guides.noseTip)<eye*.20){
          blocked=true;protectedAnatomy++;break;
        }
      }
      if(blocked)continue;
      const shade=clamp((.92-sourceY)/.78,0,1);
      const ink=hex(pass===0?[
        rgb[0]*.79+89*.21,rgb[1]*.83+58*.17,
        rgb[2]*.81+62*.19,
      ]:[
        rgb[0]*.84+129*.16,rgb[1]*.82+82*.18,
        rgb[2]*.82+105*.18,
      ]);
      marks.push({x:start[0],y:start[1],
        controlX:control[0],controlY:control[1],
        endX:end[0],endY:end[1],
        color:ink,pass:2,
        width:step*(.31+.16*pencilHash(seed,k,217)),
        alpha:clamp((.13+.14*brightness+.06*shade)*strength,.01,.36),
      });
      sourceMatchedGaps++;
    }
  return result();
}
