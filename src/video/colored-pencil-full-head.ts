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
/**
 * Observed source-only shadow behind the left ear and below the jaw.
 * The CC0 original has a connected near-black mass here, while the
 * photograph-conditioned v6 output had a paper-white wedge. These eight
 * author-observed vertices are in the same 608×343 source screenshot
 * as the face/hair contours, with ±4 screenshot-pixel uncertainty.
 *
 * It is NOT a reusable facial landmark or generated painting contour:
 * every actual deposit still requires a dark, valid SOURCE pixel.
 */
const EAR_CONTACT_SHADOW_SCREEN:readonly Point[]=[
  [206,236],[228,236],[244,262],[252,300],
  [249,343],[205,343],[202,306],[203,265],
];
const mapScreen=(p:Point,g:PortraitFeatureMap,eyeDistance:number):Point=>{
  const scale=eyeDistance/CAPTURE.eyeDistance;
  return [g.hairline[0]+(p[0]-CAPTURE.root[0])*scale,
    g.hairline[1]+(p[1]-CAPTURE.root[1])*scale];
};
export interface HeadContourEvidence {
  readonly face:readonly Point[];
  readonly hairOuter:readonly Point[];
  readonly earShadow:readonly Point[];
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
    hairOuter,
    earShadow:EAR_CONTACT_SHADOW_SCREEN.map(p=>mapScreen(p,guides,d)),
    reference:"cc0-campbell-608x343",
    uncertaintySourcePixels:4,
  };
};
export type HeadMaterialZone="face-value"|"face-chroma"|"face-form"|
  "face-scumble"|"hair-mass"|"hair-occlusion"|"hair-fibre"|
  "measured-features";
export interface PortraitHeadStroke extends PencilPhotoMark {
  readonly zone:HeadMaterialZone;
}
/** Authentic mark families, not screenshots of intermediary raster paints. */
export const HEAD_STORYBOARD_PHASES=[
  {id:"value",label:"01 · Structure",description:"Value and connected hair mass"},
  {id:"pigment",label:"02 · Local chroma",description:"Warm/cool pencil layering"},
  {id:"form",label:"03 · Form and scumble",description:"Skin planes, eye sockets and attached hair shadows"},
  {id:"detail",label:"04 · Likeness details",description:"Lashes, lips and rooted hair fibres"},
] as const;
export type HeadStoryboardPhase=typeof HEAD_STORYBOARD_PHASES[number]["id"];
export const selectHeadStoryboardStrokes=(
  strokes:readonly PortraitHeadStroke[],phase:HeadStoryboardPhase,
):readonly PortraitHeadStroke[]=>{
  if(!HEAD_STORYBOARD_PHASES.some(stage=>stage.id===phase))
    throw new RangeError("Unknown coloured-pencil portrait storyboard phase");
  return strokes.filter(stroke=>phase==="detail"||
    (phase==="value"&&(stroke.zone==="face-value"||
      stroke.zone==="hair-mass"&&stroke.pass===0))||
    (phase==="pigment"&&stroke.zone!=="measured-features"&&
      (stroke.pass<=1||stroke.zone==="face-value"||
        stroke.zone==="face-chroma"))||
    (phase==="form"&&stroke.zone!=="hair-fibre"&&
      stroke.zone!=="measured-features"));
};
export interface DryPencilHeadPlate {
  readonly width:540;
  readonly height:600;
  readonly crop:Readonly<{left:number;top:number;width:number;height:number}>;
  readonly strokes:readonly PortraitHeadStroke[];
  readonly scumbleStrength:number;
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
  return r>g*1.045+1&&r>b*1.055+1;
};

/** A person-specific, right-sized portrait drawing: five value classes,
 * isolated face/hair material masks, root-directed clumps and the previously
 * source-observed eye/nose/lip strokes. The returned bitmap does not exist:
 * consumers must draw its individual gestures onto paper.
 */
export const createDryPencilHeadPlate=(
  source:PencilPhotoPixels,guides:PortraitFeatureMap,seed=271,
  scumbleStrength=.65,
):DryPencilHeadPlate=>{
  positiveSafeSource(source,seed);
  if(!Number.isFinite(scumbleStrength)||
    scumbleStrength<0||scumbleStrength>1)
    throw new RangeError("Invalid coloured pencil scumble strength");
  // Require the entire, already-audited 25-landmark source map.
  const details=createPencilPortraitFeatureMarks(source,guides,seed);
  const geometry=projectMeasuredHeadContours(guides);
  const eyeDist=length(guides.eyeNearCenter,guides.eyeFarCenter);
  const cropWidth=eyeDist*4.55;
  const cropHeight=cropWidth*SIZE.height/SIZE.width;
  const left=guides.hairline[0]-cropWidth*.49;
  const top=guides.hairline[1]-eyeDist*.70;
  const scale=SIZE.width/cropWidth;
  const marks:PortraitHeadStroke[]=[];
  const fiveValueCounts:[number,number,number,number,number]=[0,0,0,0,0];
  const materialCounts:Record<HeadMaterialZone,number>={
    "face-value":0,"face-chroma":0,"face-form":0,
    "face-scumble":0,"hair-mass":0,"hair-occlusion":0,
    "hair-fibre":0,
    "measured-features":0,
  };
  const screen=(p:Point):Point=>[(p[0]-left)*scale,(p[1]-top)*scale];
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
      color:ink,alpha:clamp(alpha,.005,.56),width,pass,zone,
    });
    materialCounts[zone]++;
  };
  const classify=(p:Point):Region=>{
    if(!onPhoto(source,p[0],p[1]))return "background";
    if(inside(p,geometry.face))return "skin";
    // Keep hair topologically disjoint from the skin support, including
    // subpixel feature boundaries where round-to-nearest colour sampling
    // could otherwise steal pale facial pixels into the outer hair mass.
    // Adjacent hair and skin need near-contiguous optical support, but
    // round-to-nearest photographic RGB at the polygon boundary can sample
    // *skin* into the garden. A subpixel registration tolerance prevents
    // false hair without the previous large white sticker-like inset.
    const registrationTolerance=eyeDist*.010;
    if(inside(p,geometry.hairOuter)&&
      distanceToEdge(p,geometry.face)>registrationTolerance){
      const rgb=photoRGB(source,p[0],p[1]);
      const r=eyeDist*.090;
      let around=0;
      for(const [dx,dy] of [[-r,0],[r,0],[0,-r],[0,r],
        [-r*.7,-r*.7],[r*.7,r*.7]]){
        const q:Point=[p[0]+dx,p[1]+dy];
        if(!inside(q,geometry.face)&&
          isHairColour(photoRGB(source,q[0],q[1])))around++;
      }
      // Black hair often has near-neutral RGB: require a coherent warm
      // connected neighbourhood before filling a dark strand. The CC0
      // garden background is also dark, but it is chromatically green.
      // A real near-black strand may have no remaining reddish chroma.
      // Requiring warm pixels on *both* sides erased the photographed
      // ear-to-hair occlusion and exposed an ivory-paper white fracture.
      // Only recover this dark material INSIDE the measured head/hair
      // envelope and close to the measured face. Never generalize it to
      // arbitrary background darkness (e.g. green garden/shadow).
      const value=lum(rgb);
      const closeToFace=distanceToEdge(p,geometry.face)<eyeDist*.24;
      const sourceVerifiedOcclusion=inside(p,geometry.earShadow)&&
        photoValue(source,p[0],p[1])<.28;
      const hair=isHairColour(rgb)?around>=1:
        value<.16&&(around>=2||closeToFace||
          sourceVerifiedOcclusion);
      if(hair&&!paperWhite(source,p[0],p[1]))return "hair";
    }
    return "background";
  };
  const forehead=guides.forehead,chin=guides.chin;
  const foreheadScale=eyeDist*1.3;
  // Reference-measured face tonal masses: three distinct low-pressure
  // layers. No flat face polygon, ellipse or 1:1 photographic pixel stamps.
  for(const pass of [0,1,2] as const){
    const step=eyeDist*(pass===0?.034:pass===1?.032:.028);
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
      // A bright unpigmented rim around the face read as a sticker or
      // cutout in v2. Preserve a connected coloured boundary instead.
      const fade=.62+.38*clamp(edge/(eyeDist*.043),0,1);
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
      let theta=heading+(pass===1?.48:pass===2?-.35:0)+
        (pencilHash(seed,hashBase,12)-.5)*.32;
      let gradientStrength=0;
      if(pass===2){
        const delta=eyeDist*.018;
        const gx=photoValue(source,px+delta,py)-
          photoValue(source,px-delta,py);
        const gy=photoValue(source,px,py+delta)-
          photoValue(source,px,py-delta);
        gradientStrength=Math.hypot(gx,gy);
        // Anchor the final dark pencil deposits to real eyelid, nasal,
        // lip and jaw value edges rather than uniformly crosshatching.
        if(gradientStrength>.052)theta=Math.atan2(-gx,gy)+
          (pencilHash(seed,hashBase,12)-.5)*.18;
      }
      const len=step*(pass===0?1.56:pass===1?1.43:.94)*
        (.75+.40*pencilHash(seed,hashBase,13));
      const shade=1-value;
      const pressure=pass===0?.22+.34*shade:
        pass===1?.18+.30*shade:
          .14+.30*shade+.28*clamp((gradientStrength-.045)*3.4,0,1);
      const density=(band===4?.28:band===3?.95:1);
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
        pass===0?1.30:pass===1?1.04:.82,pass,
        (pencilHash(seed,hashBase,15)-.5)*.19);
    }
  }
  // Optical grisaille: finish the *value* structure after the first
  // low-pressure chromatic map but before drawing tiny lashes and hair fibres.
  // A paper-only portrait with three 1px passes remained 40–80 luminance
  // points lighter than its source in orbits, nose and vermilion. Build the
  // shaded source planes from individual, intersecting dry-pencil marks.
  // White paper is still untouched where the reference is truly luminous.
  for(const layer of [0,1,2] as const){
    const step=eyeDist*(layer===0?.027:layer===1?.024:.021);
    const cols=Math.ceil(cropWidth/step),rows=Math.ceil(cropHeight/step);
    for(let iy=0;iy<rows;iy++)for(let ix=0;ix<cols;ix++){
      const j=iy*cols+ix+layer*191513;
      const px=left+(ix+.5+(pencilHash(seed,j,201)-.5)*.44)*step;
      const py=top+(iy+.5+(pencilHash(seed,j,202)-.5)*.44)*step;
      const p:Point=[px,py];
      if(classify(p)!=="skin")continue;
      const value=photoValue(source,px,py);
      // No darkening on source highlights, including corneal reflections.
      const shadow=clamp((.80-value)/.54,0,1);
      if(shadow<.08||pencilHash(seed,j,203)>Math.pow(shadow,.72))continue;
      const rgb=photoRGB(source,px,py);
      const offset=eyeDist*.016;
      const gx=photoValue(source,px+offset,py)-
        photoValue(source,px-offset,py);
      const gy=photoValue(source,px,py+offset)-
        photoValue(source,px,py-offset);
      const edge=Math.hypot(gx,gy);
      const nearEye=length(p,guides.eyeNearCenter)/eyeDist;
      const farEye=length(p,guides.eyeFarCenter)/eyeDist;
      const aroundOrbit=Math.min(nearEye,farEye)<.33;
      const nearLip=length(p,guides.lipCupid)/eyeDist<.34;
      const nearNose=length(p,guides.noseTip)/eyeDist<.36;
      // Planes follow orbital curves, vertical nasal cartilage and lips.
      // Edge tangents dominate only where the licensed source supports them.
      const tangent=edge>.06?Math.atan2(-gx,gy):
        aroundOrbit?-.24+(px-guides.noseBridge[0])/eyeDist*.4:
        nearNose?1.32:nearLip?.22+(px-guides.lipCupid[0])/eyeDist*.3:
        .38+(px-guides.noseBridge[0])/eyeDist*.28;
      const heading=tangent+(layer===1?.53:layer===2?-.39:0)+
        (pencilHash(seed,j,204)-.5)*.23;
      const ink=color([
        rgb[0]*(layer===0?.63:.72)+(layer===0?47:68)*(layer===0?.37:.28),
        rgb[1]*(layer===0?.62:.72)+(layer===0?36:46)*(layer===0?.38:.28),
        rgb[2]*(layer===0?.66:.76)+(layer===0?43:57)*(layer===0?.34:.24),
      ]);
      const distance=distanceToEdge(p,geometry.face);
      const feather=.74+.26*clamp(distance/(eyeDist*.055),0,1);
      const len=step*(layer===0?1.5:layer===1?1.4:1.07)*
        (.74+.50*pencilHash(seed,j,205));
      push("face-form",p,
        [Math.cos(heading)*len,Math.sin(heading)*len],
        ink,(.25+.31*shadow)*feather,
        layer===0?1.24:layer===1?.97:.69,2,
        (pencilHash(seed,j,206)-.5)*.12);
    }
  }
  // Ann Kullberg's elliptical scumbling technique: overlapping curved,
  // low-pressure pencil arcs knit coarse value strokes into the paper tooth.
  // Only source-conditioned skin is scumbled; highlights and bright glints
  // retain visible, unfilled paper. This does not blur photograph pixels.
  if(scumbleStrength>0){
    const step=eyeDist*.033;
    const cols=Math.ceil(cropWidth/step),rows=Math.ceil(cropHeight/step);
    for(let iy=0;iy<rows;iy++)for(let ix=0;ix<cols;ix++){
      const i=iy*cols+ix;
      const px=left+(ix+.5+(pencilHash(seed,i,271)-.5)*.5)*step;
      const py=top+(iy+.5+(pencilHash(seed,i,272)-.5)*.5)*step;
      const p:Point=[px,py];
      if(classify(p)!=="skin")continue;
      const value=photoValue(source,px,py);
      if(value>.92)continue;
      const shade=clamp((.91-value)/.7,0,1);
      // Very open tooth on highlights; build smoothly only in halftones
      // and the deep eye/cheek planes, with bounded deterministic density.
      if(pencilHash(seed,i,273)>scumbleStrength*(.22+.72*shade))continue;
      const rgb=photoRGB(source,px,py);
      const angle=(pencilHash(seed,i,274)-.5)*Math.PI*1.4;
      const radius=step*(.23+.17*pencilHash(seed,i,275));
      const vector:Point=[Math.cos(angle)*radius,Math.sin(angle)*radius*.68];
      const ink=color([rgb[0]*.82+93*.18,rgb[1]*.83+59*.17,
        rgb[2]*.84+68*.16]);
      push("face-scumble",p,vector,ink,
        (.10+.15*shade)*scumbleStrength,
        .58+.23*pencilHash(seed,i,276),2,
        .34+.18*pencilHash(seed,i,277));
    }
  }
  // ArtCraft source-dependent facial contour hierarchy: use optical
  // gradient measurements only around real orbits, nasal cartilage and
  // the two lip pillows. Unlike generic SVG outlines these tangent marks
  // are laid where the actual licensed photograph contains a value edge.
  const accents=[
    {name:"near-orbit",center:guides.eyeNearCenter,rx:.43,ry:.29},
    {name:"far-orbit",center:guides.eyeFarCenter,rx:.34,ry:.25},
    {name:"nasal-cartilage",center:guides.noseTip,rx:.36,ry:.42},
    {name:"vermilion",center:guides.lipCupid,rx:.45,ry:.29},
  ] as const;
  for(const [region,accent] of accents.entries()){
    const step=eyeDist*.015;
    const rx=eyeDist*accent.rx,ry=eyeDist*accent.ry;
    const cols=Math.ceil(rx*2/step),rows=Math.ceil(ry*2/step);
    for(let iy=0;iy<rows;iy++)for(let ix=0;ix<cols;ix++){
      const j=region*200000+iy*cols+ix;
      const px=accent.center[0]-rx+(ix+.5)*step+
        (pencilHash(seed,j,71)-.5)*step*.27;
      const py=accent.center[1]-ry+(iy+.5)*step+
        (pencilHash(seed,j,72)-.5)*step*.27;
      const u=(px-accent.center[0])/rx;
      const v=(py-accent.center[1])/ry;
      const radius=u*u+v*v;
      const p:Point=[px,py];
      if(radius>=1||classify(p)!=="skin")continue;
      const delta=eyeDist*.010;
      const gx=photoValue(source,px+delta,py)-
        photoValue(source,px-delta,py);
      const gy=photoValue(source,px,py+delta)-
        photoValue(source,px,py-delta);
      const edge=Math.hypot(gx,gy);
      const value=photoValue(source,px,py);
      if(edge<.039||value>.88)continue;
      const theta=Math.atan2(-gx,gy)+
        (pencilHash(seed,j,73)-.5)*.16;
      const len=eyeDist*(.016+.025*pencilHash(seed,j,74));
      const rgb=photoRGB(source,px,py);
      const optical=clamp((edge-.030)*3.2,0,1);
      const pressure=(.15+.35*optical)*Math.pow(1-radius,.45);
      const ink=color([rgb[0]*.61+56*.39,
        rgb[1]*.63+39*.37,rgb[2]*.67+38*.33]);
      push("face-form",p,[Math.cos(theta)*len,Math.sin(theta)*len],
        ink,pressure,.43+.33*pencilHash(seed,j,75),2,
        (pencilHash(seed,j,76)-.5)*.12);
    }
  }
  // A face cannot float inside a white sticker-outline against the hair.
  // The observed jaw/temple contour is made of short earthen pencil fibres
  // softened by the true local source value, never a solid black SVG path.
  for(let i=0;i<geometry.face.length;i++){
    const start=geometry.face[i];
    const finish=geometry.face[(i+1)%geometry.face.length];
    const span=length(start,finish);
    const segments=Math.max(2,Math.ceil(span/(eyeDist*.024)));
    for(let k=0;k<segments;k++){
      const t=(k+.25)/segments;
      const p:Point=[interp(start[0],finish[0],t),
        interp(start[1],finish[1],t)];
      if(!onPhoto(source,p[0],p[1]))continue;
      const rgb=photoRGB(source,p[0],p[1]);
      const value=photoValue(source,p[0],p[1]);
      if(value>.91)continue;
      const dx=(finish[0]-start[0])/segments;
      const dy=(finish[1]-start[1])/segments;
      push("face-form",p,[dx*.72,dy*.72],
        color([rgb[0]*.74+69*.26,rgb[1]*.73+48*.27,
          rgb[2]*.76+44*.24]),.13+.18*(1-value),
        .43,2,(pencilHash(seed,i*1000+k,77)-.5)*.06);
    }
  }
  // Hair as connected MASSES first. The physical photographic reference
  // has auburn locks surrounding the head; green garden is NOT a hair mask.
  // Hair is a separate material and cannot inadvertently flatten the face.
  for(const layer of [0,1,2,3] as const){
    const shadeCore=layer>=2;
    const pass:0|1|2=layer===0?0:layer===1?1:2;
    const step=eyeDist*(layer===0?.027:layer===1?.025:
      layer===2?.024:.021);
    const nx=Math.ceil(cropWidth/step),ny=Math.ceil(cropHeight/step);
    for(let iy=0;iy<ny;iy++)for(let ix=0;ix<nx;ix++){
      const k=iy*nx+ix+layer*49103;
      const px=left+(ix+.5+(pencilHash(seed,k,36)-.5)*.42)*step;
      const py=top+(iy+.5+(pencilHash(seed,k,37)-.5)*.42)*step;
      const p:Point=[px,py];
      if(classify(p)!=="hair")continue;
      const rgb=photoRGB(source,px,py),v=photoValue(source,px,py);
      const band=toneBand(v);
      if(layer===0)fiveValueCounts[band]++;
      // Deep contiguous strands need more pencil deposits than bright
      // loose highlights; no black flat filled polygon or photo bitmap.
      if(shadeCore&&(v>.72||
        pencilHash(seed,k,41)>clamp((.83-v)/.65,0,1)))continue;
      const fade=clamp(distanceToEdge(p,geometry.hairOuter)/
        (eyeDist*.085),0,1);
      const side=Math.sign(px-guides.hairline[0]);
      const t=clamp((py-guides.hairline[1])/(eyeDist*3.6),0,1);
      // Hair mass tangent must follow its root-to-end clump direction:
      // image-left hair travels left as it falls; image-right travels right.
      const heading=Math.PI*.49-side*(.38+.19*t);
      const theta=heading+(pass===1?.17:0)+
        (pencilHash(seed,k,38)-.5)*.20;
      const len=step*(1.60+.48*pencilHash(seed,k,39));
      const pigment=shadeCore?
        color([rgb[0]*.76+36*.24,rgb[1]*.74+27*.26,
          rgb[2]*.74+25*.26]):
        pass===0?color([
          rgb[0]*.85+51*.15,rgb[1]*.85+35*.15,rgb[2]*.85+28*.15,
        ]):color([rgb[0]*.9+79*.1,rgb[1]*.9+44*.1,rgb[2]*.9+32*.1]);
      push("hair-mass",p,[Math.cos(theta)*len,Math.sin(theta)*len],
        pigment,(shadeCore?.48:pass===0?.41:.34)*fade*(.48+.9*(1-v)),
        shadeCore?1.37:pass===0?1.65:1.27,pass,
        (pencilHash(seed,k,40)-.5)*.16);
    }
  }
  // Construct shadow adjacency BEFORE individual loose hair fibres.
  // The source has a dark connected ear/temple/collar lock. Earlier
  // pencil passes left a conspicuous pale ring at this boundary because
  // the achromatic black strand was mistaken for background. Local dense
  // sharpened pencil strokes now join hair and skin where *actual source*
  // values support a dark edge, without a solid painted region.
  {
    // A coarser anisotropic stipple grid stays under the source-specific
    // stroke budget: denser ink *per mark*, not thousands of redundant
    // overlapping points (which would also look waxy at normal scale).
    // Fill the verified shadow through prior hair-mass passes; these
    // sharpened overtraces should be sparse accents, not waxy duplicate
    // strokes. Keep the entire 540×600 plate under its 120k mark budget.
    const step=eyeDist*.022;
    const nx=Math.ceil(cropWidth/step),ny=Math.ceil(cropHeight/step);
    for(const layer of [0,1] as const){
      for(let iy=0;iy<ny;iy++)for(let ix=0;ix<nx;ix++){
        const k=layer*190117+iy*nx+ix;
        const px=left+(ix+.5+(pencilHash(seed,k,301)-.5)*.30)*step;
        const py=top+(iy+.5+(pencilHash(seed,k,302)-.5)*.30)*step;
        const p:Point=[px,py];
        if(classify(p)!=="hair")continue;
        const distance=distanceToEdge(p,geometry.face);
        // The observed black mass extends farther from the cheek than
        // a generic narrow contour band. Reconstruct the connected CC0
        // ear shadow, but only where the actual photo is dark.
        if(distance>eyeDist*.20&&
          !inside(p,geometry.earShadow))continue;
        const value=photoValue(source,px,py);
        if(value>.36)continue;
        const ink=photoRGB(source,px,py);
        const depth=clamp((.40-value)/.36,0,1);
        if(pencilHash(seed,k,303)>.60+.40*depth)continue;
        const side=Math.sign(px-guides.noseBridge[0])||1;
        const theta=Math.PI*.49-side*.18+
          (pencilHash(seed,k,304)-.5)*.34+(layer===1?.25:0);
        const lengthPx=step*(1.42+.40*pencilHash(seed,k,305));
        push("hair-occlusion",p,
          [Math.cos(theta)*lengthPx,Math.sin(theta)*lengthPx],
          color([ink[0]*.70+22*.30,ink[1]*.71+17*.29,
            ink[2]*.72+17*.28]),
          (.35+.21*depth),layer===0?.92:.74,2,
          (pencilHash(seed,k,306)-.5)*.12);
      }
    }
  }
  // Root-aligned fine strands: quadratic clumps from the actual parting
  // toward the photographed shoulder/hair ends. They are deposited only
  // where the author-observed hair mass AND local photo agree.
  for(let clump=0;clump<210;clump++){
    const t=(clump+.5)/210;
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
      const pressure=.20+.35*(1-value);
      push("hair-fibre",point,
        [next[0]-point[0],next[1]-point[1]],
        color([rgb[0]*.74+61*.26,rgb[1]*.73+45*.27,
          rgb[2]*.77+39*.23]),pressure,
        .49+.38*pencilHash(seed,clump*91+s,45),2,
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
      ...m,zone:"measured-features",x:a[0],y:a[1],
      endX:clamp(b[0],0,SIZE.width),endY:clamp(b[1],0,SIZE.height),
      controlX:clamp(control[0],0,SIZE.width),
      controlY:clamp(control[1],0,SIZE.height),
      width:m.width*scale,
      alpha:clamp(m.alpha*1.36,.005,.56),
    });
    materialCounts["measured-features"]++;
  }
  marks.sort((a,b)=>a.pass-b.pass);
  return {
    width:SIZE.width,height:SIZE.height,paperColor:PAPER,
    crop:{left,top,width:cropWidth,height:cropHeight},
    strokes:marks,rasterUnderpainting:false,geometry,
    scumbleStrength,fiveValueCounts,materialCounts,
  };
};
