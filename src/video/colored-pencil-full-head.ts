/**
 * EXPERIMENTAL: photograph-measured complete head pencil construction.
 *
 * Source ONLY: CC0 "Brunette woman portrait (Unsplash)", Christopher Campbell.
 * Independent measurement: 608×343 actual Storybook source screenshot, with
 * roughly ±4 screenshot-pixel uncertainty in hair/face boundaries.
 *
 * Technique-only comparisons (NO traced artwork): Elena Pancorbo's anchored
 * orbits and tonal cheeks; Jesse Lane's value-first layered deposits; Silvia
 * Maccaferri's grouped hair masses before fine hair filaments.
 *
 * The output is never an image copy: ivory paper plus independently drawn
 * pigment gestures. This is a provisional, non-approved facial study.
 */
import {pencilHash} from "../../registry/video/colored-pencil";
import type {PencilPhotoPixels,PencilPhotoMark} from "./colored-pencil-photo";
import type {PortraitFeatureMap} from "./colored-pencil-portrait-guides";
import {createPencilPortraitFeatureMarks} from "./colored-pencil-portrait-guides";

type Point=readonly[number,number];
const PAPER="#FAF5ED";
const SIZE={width:540,height:600} as const;
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const interp=(a:number,b:number,t:number)=>a+(b-a)*t;
const color=(v:readonly number[])=>"#"+v.map(n=>
  clamp(Math.round(n),0,255).toString(16).padStart(2,"0")).join("");
const lum=(v:readonly number[])=>(.2126*v[0]+.7152*v[1]+.0722*v[2])/255;
const length=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const photoRGB=(src:PencilPhotoPixels,x:number,y:number):readonly[number,number,number]=>{
  const cx=clamp(Math.round(x),0,src.width-1);
  const cy=clamp(Math.round(y),0,src.height-1);
  const offset=(cy*src.width+cx)*4;
  return [src.data[offset],src.data[offset+1],src.data[offset+2]];
};
const photoValue=(src:PencilPhotoPixels,x:number,y:number)=>{
  // 3×3, 2.2px-radius optical sample; avoid individual-pixel photo stippling.
  let sum=0;
  for(const dy of [-2.2,0,2.2])for(const dx of [-2.2,0,2.2])
    sum+=lum(photoRGB(src,x+dx,y+dy));
  return sum/9;
};
const onPhoto=(src:PencilPhotoPixels,x:number,y:number)=>
  x>=1&&y>=1&&x<src.width-2&&y<src.height-2;
const inside=(p:Point,poly:readonly Point[])=>{
  let winding=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j];
    if((a[1]>p[1])!==(b[1]>p[1])&&
       p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])
      winding=!winding;
  }
  return winding;
};
const distanceToEdge=(p:Point,poly:readonly Point[])=>{
  let best=Number.POSITIVE_INFINITY;
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length];
    const dx=b[0]-a[0],dy=b[1]-a[1];
    const d=dx*dx+dy*dy;
    const t=d===0?0:clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/d,0,1);
    best=Math.min(best,Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t));
  }
  return best;
};
const bezier=(a:Point,b:Point,c:Point,t:number):Point=>{
  const inv=1-t;
  return [inv*inv*a[0]+2*inv*t*b[0]+t*t*c[0],
    inv*inv*a[1]+2*inv*t*b[1]+t*t*c[1]];
};
type Region="skin"|"hair"|"background";

/**
 * The 608×343 screenshot is the licensed CC0 photo as seen in the actual
 * Storybook 900×506 landscape capture; points below are hand observed there.
 * Base screenshot hairline=(292,82) and eye-centre separation=~67px.
 * All other framing modes are reprojections through the source-mapped guides,
 * not distinct guessed person anatomy or normalized screen coordinates.
 */
const CAPTURE={root:[292,82] as Point,eyeDistance:67};
const FACE_SCREEN:readonly Point[]=[
  [244,88],[274,76],[313,73],[348,87],[363,116],
  [371,158],[374,204],[369,246],[361,270],[345,288],
  [326,297],[299,295],[271,281],[249,260],[232,231],
  [221,196],[220,153],[227,112],
];
const HAIR_SCREEN:readonly Point[]=[
  [140,343],[145,264],[153,188],[164,133],[187,89],
  [219,57],[246,44],[272,35],[307,40],[335,49],
  [361,76],[380,119],[391,175],[405,257],[420,343],
];
const mapScreen=(p:Point,g:PortraitFeatureMap,eyeDistance:number):Point=>{
  const scale=eyeDistance/CAPTURE.eyeDistance;
  return [g.hairline[0]+(p[0]-CAPTURE.root[0])*scale,
    g.hairline[1]+(p[1]-CAPTURE.root[1])*scale];
};
export interface HeadContourEvidence {
  readonly face:readonly Point[];
  readonly hairOuter:readonly Point[];
  readonly reference:"cc0-campbell-608x343";
  readonly uncertaintySourcePixels:number;
}
export const projectMeasuredHeadContours=(guides:PortraitFeatureMap):HeadContourEvidence=>{
  const d=length(guides.eyeNearCenter,guides.eyeFarCenter);
  if(!Number.isFinite(d)||d<8||d>1600||
    Object.values(guides).some(p=>!Array.isArray(p)||p.length!==2||
      !p.every(Number.isFinite)))
    throw new RangeError("Invalid or degenerate source head geometry");
  const hair=HAIR_SCREEN.map(p=>mapScreen(p,guides,d));
  // Close lower hair envelope below the two sides. Image-space borders do
  // not imply actual scalp; no off-image invented hair is rendered.
  const hairOuter=[...hair,[hair[0][0],hair[0][1]] as Point];
  return {
    face:FACE_SCREEN.map(p=>mapScreen(p,guides,d)),
    hairOuter,reference:"cc0-campbell-608x343",
    uncertaintySourcePixels:4,
  };
};
export type HeadMaterialZone="face-value"|"face-chroma"|"face-form"|
  "hair-mass"|"hair-fibre"|"measured-features";
export interface DryPencilHeadPlate {
  readonly width:540;
  readonly height:600;
  readonly crop:Readonly<{left:number;top:number;width:number;height:number}>;
  readonly strokes:readonly PencilPhotoMark[];
  readonly rasterUnderpainting:false;
  readonly paperColor:typeof PAPER;
  /** Five independent support/value bins, 0=deepest, 4=reserved paper. */
  readonly fiveValueCounts:readonly[number,number,number,number,number];
  readonly materialCounts:Readonly<Record<HeadMaterialZone,number>>;
  readonly geometry:HeadContourEvidence;
}
const positiveSafeSource=(src:PencilPhotoPixels,seed:number)=>{
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647||
    !Number.isSafeInteger(src.width)||!Number.isSafeInteger(src.height)||
    src.width<8||src.height<8||src.width>2048||src.height>2048||
    !(src.data instanceof Uint8ClampedArray)||
    src.data.length!==src.width*src.height*4)
    throw new RangeError("Invalid source pixels or seed for full-head pencil");
};
const toneBand=(value:number)=>value<.18?0:value<.34?1:value<.50?2:
  value<.73?3:4;
const paperWhite=(src:PencilPhotoPixels,x:number,y:number)=>
  photoValue(src,x,y)>.93;
const isHairColour=(rgb:readonly number[])=>{
  // Reference-specific brown-gold signature separates photographed warm
  // hair from the green garden; NOT a generic hair-color classifier.
  const [r,g,b]=rgb;
  return r>g*.94+6&&r>b*1.11+5;
};

/** A person-specific, right-sized portrait drawing: five value classes,
 * isolated face/hair material masks, root-directed clumps and the previously
 * source-observed eye/nose/lip strokes. The returned bitmap does not exist:
 * consumers must draw its individual gestures onto paper.
 */
export const createDryPencilHeadPlate=(
  source:PencilPhotoPixels,guides:PortraitFeatureMap,seed=271,
):DryPencilHeadPlate=>{
  positiveSafeSource(source,seed);
  // Require the entire, already-audited 25-landmark source map.
  const details=createPencilPortraitFeatureMarks(source,guides,seed);
  const geometry=projectMeasuredHeadContours(guides);
  const eyeDist=length(guides.eyeNearCenter,guides.eyeFarCenter);
  const cropWidth=eyeDist*4.55;
  const cropHeight=cropWidth*SIZE.height/SIZE.width;
  const left=guides.hairline[0]-cropWidth*.49;
  const top=guides.hairline[1]-eyeDist*.70;
  const scale=SIZE.width/cropWidth;
  const marks:PencilPhotoMark[]=[];
  const fiveValueCounts:[number,number,number,number,number]=[0,0,0,0,0];
  const materialCounts:Record<HeadMaterialZone,number>={
    "face-value":0,"face-chroma":0,"face-form":0,
    "hair-mass":0,"hair-fibre":0,"measured-features":0,
  };
  const screen=(p:Point):Point=[(p[0]-left)*scale,(p[1]-top)*scale];
  const push=(zone:HeadMaterialZone,p:Point,vector:Point,ink:string,
    alpha:number,width:number,pass:0|1|2,twist:number)=>{
    if(alpha<=0||!Number.isFinite(alpha)||!onPhoto(source,p[0],p[1]))return;
    const root=screen(p),tip=screen([p[0]+vector[0],p[1]+vector[1]]);
    const cx=(root[0]+tip[0])*.5-vector[1]*scale*twist;
    const cy=(root[1]+tip[1])*.5+vector[0]*scale*twist;
    if(root[0]<0||root[1]<0||root[0]>SIZE.width||root[1]>SIZE.height)return;
    marks.push({
      x:root[0],y:root[1],
      controlX:clamp(cx,0,SIZE.width),controlY:clamp(cy,0,SIZE.height),
      endX:clamp(tip[0],0,SIZE.width),endY:clamp(tip[1],0,SIZE.height),
      color:ink,alpha:clamp(alpha,.005,.56),width,pass,
    });
    materialCounts[zone]++;
  };
  const classify=(p:Point):Region=>{
    if(!onPhoto(source,p[0],p[1]))return "background";
    if(inside(p,geometry.face))return "skin";
    if(inside(p,geometry.hairOuter)&&isHairColour(photoRGB(source,p[0],p[1]))&&
      !paperWhite(source,p[0],p[1]))return "hair";
    return "background";
  };
  const forehead=guides.forehead,chin=guides.chin;
  const foreheadScale=eyeDist*1.3;
  // Reference-measured face tonal masses: three distinct low-pressure
  // layers. No flat face polygon, ellipse or 1:1 photographic pixel stamps.
  for(const pass of [0,1,2] as const){
    const step=eyeDist*(pass===0?.046:pass===1?.041:.034);
    const nx=Math.ceil(cropWidth/step),ny=Math.ceil(cropHeight/step);
    for(let iy=0;iy<ny;iy++)for(let ix=0;ix<nx;ix++){
      const k=iy*nx+ix,hashBase=k+pass*338093;
      const px=left+(ix+.5+(pencilHash(seed,hashBase,10)-.5)*.54)*step;
      const py=top+(iy+.5+(pencilHash(seed,hashBase,11)-.5)*.54)*step;
      const p:Point=[px,py];
      if(classify(p)!=="skin")continue;
      const rgb=photoRGB(source,px,py),value=photoValue(source,px,py);
      const band=toneBand(value);
      if(pass===0)fiveValueCounts[band]++;
      if(band===4&&pass===2)continue;
      const edge=distanceToEdge(p,geometry.face);
      const fade=clamp(edge/(eyeDist*.083),0,1);
      // Build soft orbital, malar and nasal values following cranium shape,
      // not as rectangles pasted onto skin or a uniform global diagonal.
      const toNose=Math.abs(px-guides.noseBridge[0])/eyeDist;
      const toJaw=clamp((py-guides.noseTip[1])/
        Math.max(1,chin[1]-guides.noseTip[1]),0,1);
      const toForehead=clamp((forehead[1]-py)/foreheadScale,-1,1);
      const cheekSide=Math.sign(px-guides.noseBridge[0]);
      const heading=toJaw>.62?
        .16+cheekSide*.36+toJaw*.33:
        toNose<.29&&py<guides.noseTip[1]?
          1.42+cheekSide*.17:
          -.20+cheekSide*.33+toForehead*.20;
      const theta=heading+(pass===1?.48:pass===2?-.35:0)+
        (pencilHash(seed,hashBase,12)-.5)*.32;
      const len=step*(pass===0?1.56:pass===1?1.43:.94)*
        (.75+.40*pencilHash(seed,hashBase,13));
      const shade=1-value;
      const pressure=pass===0?.09+.26*shade:
        pass===1?.08+.23*shade:.065+.25*shade;
      const density=(band===4?.34:band===3?.72:1);
      if(pencilHash(seed,hashBase,14)>density)continue;
      // Subtle warm/cool layers are derived from the person's actual
      // captured pigments, not a globally assumed skin-color preset.
      const pigment=pass===0?
        color([rgb[0]*.75+90*.25,rgb[1]*.74+57*.26,rgb[2]*.77+63*.23]):
        pass===1?
          color([rgb[0]*.81+141*.19,rgb[1]*.88+83*.12,rgb[2]*.83+92*.17]):
          color([rgb[0]*.75+62*.25,rgb[1]*.73+50*.27,rgb[2]*.80+60*.20]);
      push(pass===0?"face-value":pass===1?"face-chroma":"face-form",
        p,[Math.cos(theta)*len,Math.sin(theta)*len],pigment,
        pressure*fade*(band===4?.52:1),
        pass===0?.86:pass===1?.69:.52,pass,
        (pencilHash(seed,hashBase,15)-.5)*.19);
    }
  }
  // Hair as connected MASSES first. The physical photographic reference
  // has auburn locks surrounding the head; green garden is NOT a hair mask.
  // Hair is a separate material and cannot inadvertently flatten the face.
  for(const pass of [0,1] as const){
    const step=eyeDist*(pass===0?.043:.035);
    const nx=Math.ceil(cropWidth/step),ny=Math.ceil(cropHeight/step);
    for(let iy=0;iy<ny;iy++)for(let ix=0;ix<nx;ix++){
      const k=iy*nx+ix+pass*49103;
      const px=left+(ix+.5+(pencilHash(seed,k,36)-.5)*.42)*step;
      const py=top+(iy+.5+(pencilHash(seed,k,37)-.5)*.42)*step;
      const p:Point=[px,py];
      if(classify(p)!=="hair")continue;
      const rgb=photoRGB(source,px,py),v=photoValue(source,px,py);
      const band=toneBand(v);
      if(pass===0)fiveValueCounts[band]++;
      const fade=clamp(distanceToEdge(p,geometry.hairOuter)/
        (eyeDist*.085),0,1);
      const side=Math.sign(px-guides.hairline[0]);
      const t=clamp((py-guides.hairline[1])/(eyeDist*3.6),0,1);
      const heading=Math.PI*.49+side*(.18+.30*t);
      const theta=heading+(pass===1?.17:0)+
        (pencilHash(seed,k,38)-.5)*.20;
      const len=step*(1.60+.48*pencilHash(seed,k,39));
      const pigment=pass===0?color([
        rgb[0]*.68+67*.32,rgb[1]*.70+44*.30,rgb[2]*.71+42*.29,
      ]):color([rgb[0]*.78+92*.22,rgb[1]*.74+61*.26,rgb[2]*.79+51*.21]);
      push("hair-mass",p,[Math.cos(theta)*len,Math.sin(theta)*len],
        pigment,(pass===0?.23:.17)*fade*(.48+.9*(1-v)),
        pass===0?1.25:.82,pass,
        (pencilHash(seed,k,40)-.5)*.16);
    }
  }
  // Root-aligned fine strands: quadratic clumps from the actual parting
  // toward the photographed shoulder/hair ends. They are deposited only
  // where the author-observed hair mass AND local photo agree.
  for(let clump=0;clump<148;clump++){
    const t=(clump+.5)/148;
    const right=t>.76;
    const root:Point=mapScreen([interp(218,352,t),
      47+21*pencilHash(seed,clump,43)],guides,eyeDist);
    const mid:Point=mapScreen([
      right?interp(366,395,(t-.76)/.24):interp(173,273,t/.76),
      171+30*pencilHash(seed,clump,44)],guides,eyeDist);
    const end:Point=mapScreen([
      right?interp(381,414,(t-.76)/.24):interp(145,275,t/.76),
      343],guides,eyeDist);
    const segments=48;
    for(let s=0;s<segments;s++){
      const u=(s+.2)/segments,v=(s+.9)/segments;
      const point=bezier(root,mid,end,u),next=bezier(root,mid,end,v);
      if(classify(point)!=="hair"||classify(next)!=="hair")continue;
      const rgb=photoRGB(source,point[0],point[1]);
      const value=photoValue(source,point[0],point[1]);
      if(value>.80)continue;
      const pressure=.11+.28*(1-value);
      push("hair-fibre",point,
        [next[0]-point[0],next[1]-point[1]],
        color([rgb[0]*.74+61*.26,rgb[1]*.73+45*.27,
          rgb[2]*.77+39*.23]),pressure,
        .39+.30*pencilHash(seed,clump*91+s,45),2,
        (pencilHash(seed,clump*91+s,46)-.5)*.09);
    }
  }
  // Add verified source-aligned anatomical marks only within the face or
  // hair structure. Never paste the original photographic background.
  for(const m of details.marks){
    const p:Point=[m.x,m.y];
    if(classify(p)==="background")continue;
    const a=screen(p),b=screen([m.endX,m.endY]);
    const control=screen([m.controlX,m.controlY]);
    if(a[0]<0||a[0]>SIZE.width||a[1]<0||a[1]>SIZE.height)continue;
    marks.push({
      ...m,x:a[0],y:a[1],
      endX:clamp(b[0],0,SIZE.width),endY:clamp(b[1],0,SIZE.height),
      controlX:clamp(control[0],0,SIZE.width),
      controlY:clamp(control[1],0,SIZE.height),
      width:m.width*scale,
      alpha:clamp(m.alpha*.88,.005,.56),
    });
    materialCounts["measured-features"]++;
  }
  marks.sort((a,b)=>a.pass-b.pass);
  return {
    width:SIZE.width,height:SIZE.height,paperColor:PAPER,
    crop:{left,top,width:cropWidth,height:cropHeight},
    strokes:marks,rasterUnderpainting:false,geometry,
    fiveValueCounts,materialCounts,
  };
};
