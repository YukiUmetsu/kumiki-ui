/**
 * Source-measured marks for one verified CC0 photographic portrait.
 *
 * Source: Christopher Campbell, 2015, "Brunette woman portrait (Unsplash)".
 * https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg
 * First published before the Unsplash licence change, CC0.
 *
 * These coordinates were manually observed in a 608×343 browser capture
 * of the existing 900×506 canvas at focus (.52,.25), zoom 2.05.
 * Converted back to intrinsic SOURCE-photo normalized coordinates.
 * They describe the actual person in that photograph, not an invented
 * generic face and not a traced copyrighted coloured-pencil artwork.
 *
 * Expected limitations: coarse 1× browser measurements, two eyes partly
 * occluded by hair. This is an EXPERIMENTAL anatomical guide, not an
 * artist-approved professional portrait or universal face detector.
 */
import {pencilHash} from "../../registry/video/colored-pencil";
import type {PencilPhotoMark,PencilPhotoPixels} from "./colored-pencil-photo";

export type PortraitFeatureName =
  "eyeNearLeft"|"eyeNearCenter"|"eyeNearRight"|
  "eyeFarLeft"|"eyeFarCenter"|"eyeFarRight"|
  "browNearLeft"|"browNearMiddle"|"browNearRight"|
  "browFarLeft"|"browFarMiddle"|"browFarRight"|
  "noseBridge"|"noseAlaNear"|"noseTip"|"noseAlaFar"|
  "lipLeft"|"lipCupid"|"lipRight"|"lipLower"|
  "cheekLeft"|"cheekRight"|"forehead"|"chin"|"hairline";
type Point=readonly[number,number];
export type PortraitFeatureMap=Readonly<Record<PortraitFeatureName,Point>>;
export const CC0_WOMAN_PORTRAIT_SOURCE_FEATURES:PortraitFeatureMap={
  eyeNearLeft:[.49192,.25660],eyeNearCenter:[.50716,.25180],
  eyeNearRight:[.52401,.24700],
  eyeFarLeft:[.54728,.24100],eyeFarCenter:[.56092,.23621],
  eyeFarRight:[.57295,.23981],
  browNearLeft:[.48711,.23501],browNearMiddle:[.50556,.22062],
  browNearRight:[.52722,.22181],
  browFarLeft:[.54487,.22301],browFarMiddle:[.55931,.21462],
  browFarRight:[.57215,.21822],
  noseBridge:[.53524,.24940],noseAlaNear:[.54327,.29498],
  noseTip:[.55049,.29018],noseAlaFar:[.56413,.29018],
  lipLeft:[.53203,.33695],lipCupid:[.55771,.32016],
  lipRight:[.57777,.33216],lipLower:[.55530,.34895],
  cheekLeft:[.48791,.32496],cheekRight:[.57375,.31417],
  forehead:[.52401,.15945],chin:[.55209,.39572],
  hairline:[.51037,.14266],
};
export interface PortraitPhotoCapture {
  width:number;height:number;
  naturalWidth:number;naturalHeight:number;
  mode:"fit"|"focus";
  focal:Point;zoom:number;
}
export const mapCC0WomanPortraitFeatures=(capture:PortraitPhotoCapture):PortraitFeatureMap=>{
  const {width,height,naturalWidth,naturalHeight,mode,focal,zoom}=capture;
  if([width,height,naturalWidth,naturalHeight,zoom,...focal].some(v=>
    !Number.isFinite(v)||v<=0)||width>2048||height>2048||
    naturalWidth<8||naturalHeight<8||
    focal[0]>1||focal[1]>1||zoom>8)
    throw new RangeError("Invalid photograph framing for portrait feature guides");
  const cover=mode==="focus";
  const scale=(cover?
    Math.max(width/naturalWidth,height/naturalHeight):
    Math.min(width/naturalWidth,height/naturalHeight))*(cover?zoom:1);
  const renderWidth=naturalWidth*scale,renderHeight=naturalHeight*scale;
  const dx=cover?Math.max(width-renderWidth,Math.min(0,width*.5-renderWidth*focal[0])):
    (width-renderWidth)*.5;
  const dy=cover?Math.max(height-renderHeight,Math.min(0,height*.5-renderHeight*focal[1])):
    (height-renderHeight)*.5;
  return Object.fromEntries(
    Object.entries(CC0_WOMAN_PORTRAIT_SOURCE_FEATURES).map(([key,[x,y]])=>
      [key,[x*renderWidth+dx,y*renderHeight+dy] as const]),
  ) as PortraitFeatureMap;
};

const clamp=(value:number,a:number,b:number)=>Math.max(a,Math.min(b,value));
const mix=(a:number,b:number,t:number)=>a*(1-t)+b*t;
const bezier=(start:Point,control:Point,end:Point,t:number):[number,number]=>{
  const i=1-t;
  return [
    i*i*start[0]+2*i*t*control[0]+t*t*end[0],
    i*i*start[1]+2*i*t*control[1]+t*t*end[1],
  ];
};
const hex=(r:number,g:number,b:number)=>"#"+[r,g,b].map(v=>
  clamp(Math.round(v),0,255).toString(16).padStart(2,"0")).join("");
const localPigment=(src:PencilPhotoPixels,x:number,y:number,deep:number)=>{
  const ix=clamp(Math.round(x),0,src.width-1);
  const iy=clamp(Math.round(y),0,src.height-1);
  const n=(iy*src.width+ix)*4;
  // Source-derived local earth pigments; NOT a flat uniform eye/eyebrow.
  const r=src.data[n],g=src.data[n+1],b=src.data[n+2];
  return hex(mix(r,72,deep),mix(g,47,deep),mix(b,43,deep));
};
export interface PortraitStrokeEvidence {
  readonly sampledSourceFeatures:PortraitFeatureMap;
  readonly marks:readonly PencilPhotoMark[];
  readonly featureCounts:Readonly<Record<string,number>>;
}
/** Fine dry pigment uses original source-color data at the measured features.
 * Supports per-shot rescaling/cropping; no arbitrary hand-invented human face.
 * Off-page features are clipped and cannot scatter strokes into the margins.
 */
export function createPencilPortraitFeatureMarks(
  source:PencilPhotoPixels,
  guides:PortraitFeatureMap,
  seed=271,
):PortraitStrokeEvidence {
  if(!Number.isSafeInteger(seed)||seed<0||
    source.data.length!==source.width*source.height*4)
    throw new RangeError("Invalid source photo or portrait pencil seed");
  const marks:PencilPhotoMark[]=[];
  const counts:Record<string,number>={};
  const add=(kind:string,x:number,y:number,dx:number,dy:number,
    alpha:number,width:number,pass:0|1|2,deep:number,step:number)=>{
    // Do not create marks outside actual photo pixels or on empty letterbox.
    if(x<1||y<1||x>=source.width-2||y>=source.height-2)return;
    const palette=localPigment(source,x,y,deep);
    const wobble=(pencilHash(seed,step,68)-.5)*.35;
    marks.push({
      x,y,controlX:x+dx*.5-dy*wobble*.1,
      controlY:y+dy*.5+dx*wobble*.1,
      endX:x+dx,endY:y+dy,color:palette,
      alpha:clamp(alpha,0,.57),width,pass,
    });
    counts[kind]=(counts[kind]??0)+1;
  };
  const curve=(kind:string,a:PortraitFeatureName,b:PortraitFeatureName,
    c:PortraitFeatureName,spacing:number,alpha:number,width:number,
    pass:0|1|2,deep:number)=>{
    const start=guides[a],control=guides[b],end=guides[c];
    const length=Math.hypot(end[0]-start[0],end[1]-start[1])+
      Math.hypot(control[0]-(start[0]+end[0])*.5,
        control[1]-(start[1]+end[1])*.5);
    const n=clamp(Math.ceil(length/spacing),4,140);
    for(let i=0;i<n;i++){
      const t=(i+.25)/n;
      const q=bezier(start,control,end,t);
      const after=bezier(start,control,end,Math.min(1,t+.6/n));
      const before=bezier(start,control,end,Math.max(0,t-.6/n));
      const tangent=Math.atan2(after[1]-before[1],after[0]-before[0]);
      const advance=spacing*(.65+.5*pencilHash(seed,i+marks.length,52));
      add(kind,q[0],q[1],Math.cos(tangent)*advance,Math.sin(tangent)*advance,
        alpha*(.8+.3*pencilHash(seed,i+marks.length,53)),
        width,pass,deep,marks.length+i);
    }
  };
  // Anatomy first: independent upper/lower iris rims, without a full
  // black almond outline around the sclera.
  curve("near-eye-upper","eyeNearLeft","eyeNearCenter","eyeNearRight",
    .88,.42,.76,0,.43);
  curve("far-eye-upper","eyeFarLeft","eyeFarCenter","eyeFarRight",
    .90,.38,.68,0,.40);
  // Fine root-aligned eyebrow fibres; no rectangular dark brow patches.
  const brow=(name:string,start:PortraitFeatureName,peak:PortraitFeatureName,
    end:PortraitFeatureName,amount:number)=>{
    const a=guides[start],m=guides[peak],c=guides[end];
    for(let i=0;i<amount;i++){
      const t=(i+.2)/amount,p=bezier(a,m,c,t);
      const theta=-.94+t*.90;
      const length=1.8+2.9*pencilHash(seed,i+amount,71);
      const sep=(pencilHash(seed,i+amount,72)-.5)*2.2;
      add(name,p[0],p[1]+sep,Math.cos(theta)*length,
        Math.sin(theta)*length,.36,.71,2,.36,i+amount);
    }
  };
  brow("brow-near-fibres","browNearLeft","browNearMiddle","browNearRight",94);
  brow("brow-far-fibres","browFarLeft","browFarMiddle","browFarRight",56);
  // One very narrow eyebrow arch is not equivalent to detailed irises.
  // Source-aligned radial pigment rays reinforce only dark iris rings,
  // leaving the photographed glint and eyelid overlap intact.
  for(const [id,centerId,rx,ry,count] of [
    ["iris-near","eyeNearCenter",3.6,2.8,33],
    ["iris-far","eyeFarCenter",2.2,1.9,20],
  ] as const){
    const center=guides[centerId];
    for(let i=0;i<count;i++){
      const theta=2*Math.PI*(i+.16*pencilHash(seed,i,79))/count;
      const x=center[0]+Math.cos(theta)*rx*.54;
      const y=center[1]+Math.sin(theta)*ry*.54;
      add(id,x,y,Math.cos(theta)*rx*.32,Math.sin(theta)*ry*.32,
        .31,.55,2,.45,i+1000);
    }
  }
  // Directional, soft nasal-plane and alar marks follow the actual
  // photographed curvature, not a white pointed triangle.
  curve("nose-alar-near","noseBridge","noseAlaNear","noseTip",
    1.8,.25,.55,1,.20);
  curve("nose-alar-far","noseBridge","noseAlaFar","noseTip",
    1.9,.20,.48,1,.16);
  // Separately traced vermilion curves, plus short vertical lip grains.
  curve("lip-top","lipLeft","lipCupid","lipRight",
    1.1,.34,.68,0,.36);
  curve("lip-bottom","lipLeft","lipLower","lipRight",
    1.1,.29,.60,0,.34);
  const l=guides.lipLeft,r=guides.lipRight,upper=guides.lipCupid,
    lower=guides.lipLower;
  for(let i=0;i<100;i++){
    const t=(i+.5)/100;
    const x=mix(l[0],r[0],t);
    const midY=bezier(l,upper,r,t)[1];
    const lowY=bezier(l,lower,r,t)[1];
    const centerY=mix(midY,lowY,.38+.18*pencilHash(seed,i,80));
    const length=clamp(Math.abs(lowY-midY)*.3,1,4.5);
    add("lip-grain",x,centerY,(pencilHash(seed,i,81)-.5)*.5,
      length,.24,.52,2,.23,i+2200);
  }
  // Crosshatched form, not just contours: gentle colour-pencil strokes follow
  // each actual photographed cheek/forehead/nasal/chin plane. A photo-local
  // colour gate stops the marks from drifting onto brows, hair or background.
  // Rendering preserves the untouched photograph-derived value map beneath.
  const eyeDistance=Math.hypot(
    guides.eyeFarCenter[0]-guides.eyeNearCenter[0],
    guides.eyeFarCenter[1]-guides.eyeNearCenter[1],
  );
  const scale=clamp(eyeDistance/79,.18,4);
  const planes=[
    {name:"form-cheek-left",center:guides.cheekLeft,rx:55,ry:51,
      angle:-.32,count:4050},
    {name:"form-cheek-right",center:guides.cheekRight,rx:23,ry:37,
      angle:-.66,count:1180},
    {name:"form-forehead",center:guides.forehead,rx:52,ry:34,
      angle:.18,count:3150},
    {name:"form-chin",center:guides.chin,rx:44,ry:19,
      angle:.34,count:1350},
    {name:"form-nose",center:guides.noseTip,rx:17,ry:26,
      angle:-1.29,count:1450},
  ] as const;
  for(const [planeIndex,plane] of planes.entries()){
    const center=plane.center;
    const ix=clamp(Math.round(center[0]),0,source.width-1);
    const iy=clamp(Math.round(center[1]),0,source.height-1);
    const offset=(iy*source.width+ix)*4;
    const rgb=[source.data[offset],source.data[offset+1],source.data[offset+2]];
    const radiusX=plane.rx*scale,radiusY=plane.ry*scale;
    for(let i=0;i<plane.count;i++){
      // Independent jittered low-discrepancy deposits, not uniform parallel
      // digital hatching. Every mark retains a local source-colour identity.
      const j=planeIndex*100000+i;
      const radial=Math.sqrt(pencilHash(seed,j,143))*.96;
      const polar=2*Math.PI*pencilHash(seed,j,144);
      const fx=Math.cos(polar)*radial,fy=Math.sin(polar)*radial;
      const x=center[0]+fx*radiusX,y=center[1]+fy*radiusY;
      if(x<1||x>=source.width-2||y<1||y>=source.height-2)continue;
      const pixel=(Math.round(y)*source.width+Math.round(x))*4;
      const delta=Math.hypot(
        source.data[pixel]-rgb[0],
        source.data[pixel+1]-rgb[1],
        source.data[pixel+2]-rgb[2]);
      // This is local *same-face* material coherence, not a global skin-tone
      // detector. It must not encode an assumed human complexion.
      const material=clamp((119-delta)/74,0,1);
      if(material<.19)continue;
      const lum=(.2126*source.data[pixel]+.7152*source.data[pixel+1]+
        .0722*source.data[pixel+2])/255;
      const pencilPressure=.16+.28*Math.pow(1-lum,.66);
      const heading=plane.angle+fy*.43+fx*.16+
        (pencilHash(seed,j,145)-.5)*.36;
      const length=(3.2+4.5*pencilHash(seed,j,146))*scale;
      const dx=Math.cos(heading)*length;
      const dy=Math.sin(heading)*length;
      add(plane.name,x,y,dx,dy,pencilPressure*material,
        .58+.34*pencilHash(seed,j,147),i%3===0?1:2,
        .20+.22*(1-lum),j);
    }
  }
  return {sampledSourceFeatures:guides,marks,featureCounts:counts};
}
