import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
import {CRAYON_PORTRAIT_AUDIT} from "./crayon-artcraft-portrait-audit";
import {crayonF1RegisterAnat1Face} from "./crayon-artcraft-f1-anat1-malar";

/**
 * ArtCraft F1 V33 — rebuild the single facial nasal projection using the
 * EXISTING ANAT1 camera/3D landmark framework, then paint through CRAYON1.
 *
 * The source person is Christopher Campbell's CC0 photograph (frozen
 * 608×1082 browser crop). An average 468-point ANAT1 face gives 3D
 * direction only; measured original coordinates and source tones take
 * precedence when individual nose measurements disagree with the mean.
 *
 * Previous V32 native 1× review: [163,126,108] photo root vs
 * [203,171,158] wax; [241,199,179] lit bulb vs [210,168,154] wax;
 * the nasal bridge and narrow sidewall ROIs both regressed.
 * These *independently sampled* median 7×7 RGB values are references,
 * not image pixels embedded in this generated wax art.
 *
 * Strictly opt-in unapproved artwork; retain all V32 untouched sections,
 * right/far naris, mouth, lashes, hair, timing, paper and per-fiber grain.
 */
type Wax=Extract<CrayonElement,{kind:"wax"}>;
type XY=readonly [number,number];
const src=CRAYON_PORTRAIT_AUDIT.sourcePoints;
const r=(v:number)=>Math.round(v*100)/100;
const xy=(x:number,y:number):XY=>[r(x),r(y)];
const mix=(a:XY,b:XY,t:number):XY=>
  xy(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t);
const offset=(p:XY,x:number,y:number):XY=>xy(p[0]+x,p[1]+y);
const txt=(p:XY)=>p.join(" ");
const C=(a:XY,b:XY,c:XY)=>" C"+txt(a)+" "+txt(b)+" "+txt(c);
const envelope=(points:readonly XY[],margin:number)=>{
  const minX=Math.floor(Math.min(...points.map(x=>x[0]))-margin);
  const minY=Math.floor(Math.min(...points.map(x=>x[1]))-margin);
  const maxX=Math.ceil(Math.max(...points.map(x=>x[0]))+margin);
  const maxY=Math.ceil(Math.max(...points.map(x=>x[1]))+margin);
  return {x:minX,y:minY,width:maxX-minX,height:maxY-minY};
};
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
type NativeNosePatch={d:string;bounds:Wax["bounds"];angle:number};
export const CRAYON_F1_V33_PHOTO_OBSERVATIONS=Object.freeze({
  sourceSha:CRAYON_PORTRAIT_AUDIT.source.sha256,
  root:{point:[350,532] as const,source:[163,126,108] as const,v32:[203,171,158] as const},
  bridge:{point:[382,590] as const,source:[233,196,177] as const,v32:[229,196,178] as const},
  bulb:{point:[384,612] as const,source:[241,199,179] as const,v32:[210,168,154] as const},
  nearNaris:{point:[402,632] as const,source:[22,3,3] as const,v32:[79,43,39] as const},
  farNaris:{point:[450,625] as const,source:[76,24,20] as const,v32:[95,65,59] as const},
  farWall:{point:[436,594] as const,source:[192,169,167] as const,v32:[195,159,143] as const},
});
export const CRAYON_F1_V33_CHANGED_IDS=[
  "nose-root","nose-dorsum","nose-sidewall-form",
  "nose-tip","nose-tip-reflected-light",
] as const;
type ChangedId=(typeof CRAYON_F1_V33_CHANGED_IDS)[number];

/**
 * Topologically shared points make the root, longitudinal dorsal bridge,
 * neighboring lateral wall, round bulb and reflected half light cohere
 * in one ANAT1-registered 3/4 camera. The visible *source* nose_tip
 * overrides model pronasale, whose generic shape is not the sitter's.
 */
export function crayonF1Anat1NasalPatchGeometry():
  Readonly<Record<ChangedId,NativeNosePatch>>{
  const fit=crayonF1RegisterAnat1Face();
  const root=mix(src.nose_root as XY,fit.projected["sellion"],.17);
  const tip=mix(src.nose_tip as XY,fit.projected["pronasale"],.2);
  const actualNear=CRAYON_F1_V33_PHOTO_OBSERVATIONS.nearNaris.point;
  const actualFar=CRAYON_F1_V33_PHOTO_OBSERVATIONS.farNaris.point;
  const alareR=mix(actualNear,fit.projected["alare.R"],.08);
  const alareL=mix(actualFar,fit.projected["alare.L"],.10);
  const ridge=mix(root,tip,.46);
  const bulbHigh=mix(CRAYON_F1_V33_PHOTO_OBSERVATIONS.bulb.point,tip,.25);
  const farWall=offset(mix(fit.projected["alare.L"],actualFar,.85),-2,-30);
  const slope=(Math.atan2(tip[1]-root[1],tip[0]-root[0])*180/Math.PI);
  const angle=r(clamp(slope-90,-75,75));

  // 1. Nasal bone/root: open to orbital skin, tapered into the bridge.
  const rootA=offset(root,-24,-19),rootB=offset(root,-10,-5);
  const rootC=offset(ridge,-21,-5),rootD=offset(ridge,-29,3);
  const rootControls:XY[]=[
    offset(rootA,16,-3),offset(rootB,-4,-3),rootB,
    offset(rootB,2,15),offset(rootC,-9,-12),rootC,
    offset(rootC,-9,12),offset(rootD,4,16),rootD,
    offset(rootD,-11,-12),offset(rootA,-4,23),rootA,
  ];
  const rootShape={
    d:"M"+txt(rootA)+C(...rootControls.slice(0,3) as [XY,XY,XY])+
      C(...rootControls.slice(3,6) as [XY,XY,XY])+
      C(...rootControls.slice(6,9) as [XY,XY,XY])+
      C(...rootControls.slice(9,12) as [XY,XY,XY])+"Z",
    bounds:envelope([rootA,rootB,rootC,rootD,...rootControls],13),
    angle,
  };

  // 2. The dorsal convexity belongs to the same root-to-tip tube; its
  //    near edge flows into alar cartilage, never a square-ended stripe.
  const dorsalA=offset(root,-13,9),dorsalB=offset(ridge,1,0);
  const dorsalC=offset(tip,8,-5),dorsalD=offset(tip,-16,4);
  const dorsalE=offset(ridge,-22,9);
  const dorsumControls:XY[]=[
    offset(root,-1,18),offset(ridge,-7,-19),dorsalB,
    offset(ridge,13,25),offset(tip,5,-28),dorsalC,
    offset(tip,11,15),offset(tip,-2,18),dorsalD,
    offset(tip,-37,-5),offset(ridge,-6,37),dorsalE,
    offset(root,-25,38),offset(root,-24,19),dorsalA,
  ];
  const dorsumShape={
    d:"M"+txt(dorsalA)+C(...dorsumControls.slice(0,3) as [XY,XY,XY])+
      C(...dorsumControls.slice(3,6) as [XY,XY,XY])+
      C(...dorsumControls.slice(6,9) as [XY,XY,XY])+
      C(...dorsumControls.slice(9,12) as [XY,XY,XY])+
      C(...dorsumControls.slice(12,15) as [XY,XY,XY])+"Z",
    bounds:envelope([dorsalA,dorsalB,dorsalC,dorsalD,dorsalE,...dorsumControls],12),
    angle,
  };

  // 3. The receding (far) nasal cartilage is under the main dorsal
  //    surface, directed at the ANAT1 far alare rather than far cheek.
  const wallA=offset(ridge,4,-15),wallB=offset(farWall,-10,8);
  const wallC=offset(alareL,-1,10),wallD=offset(tip,8,3);
  const wallControls:XY[]=[
    offset(wallA,23,-2),offset(wallB,-11,-24),wallB,
    offset(wallB,20,22),offset(wallC,-7,-20),wallC,
    offset(wallC,-5,13),offset(wallD,30,18),wallD,
    offset(tip,5,-4),offset(ridge,21,7),wallA,
  ];
  const wallShape={
    d:"M"+txt(wallA)+C(...wallControls.slice(0,3) as [XY,XY,XY])+
      C(...wallControls.slice(3,6) as [XY,XY,XY])+
      C(...wallControls.slice(6,9) as [XY,XY,XY])+
      C(...wallControls.slice(9,12) as [XY,XY,XY])+"Z",
    bounds:envelope([wallA,wallB,wallC,wallD,...wallControls],11),
    angle:r(clamp(slope-37,-75,75)),
  };

  // 4. Bulb is the distal continuation of the *dorsum*, not a circle.
  const bulbA=offset(bulbHigh,-21,-5),bulbB=offset(tip,12,-13);
  const bulbC=offset(tip,20,4),bulbD=offset(alareR,-5,4);
  const bulbControls:XY[]=[
    offset(bulbA,12,-12),offset(tip,-13,-20),bulbB,
    offset(tip,22,-9),offset(bulbC,3,-1),bulbC,
    offset(tip,14,20),offset(alareR,10,22),bulbD,
    offset(alareR,-29,-5),offset(bulbA,-10,17),bulbA,
  ];
  const bulbShape={
    d:"M"+txt(bulbA)+C(...bulbControls.slice(0,3) as [XY,XY,XY])+
      C(...bulbControls.slice(3,6) as [XY,XY,XY])+
      C(...bulbControls.slice(6,9) as [XY,XY,XY])+
      C(...bulbControls.slice(9,12) as [XY,XY,XY])+"Z",
    bounds:envelope([bulbA,bulbB,bulbC,bulbD,...bulbControls],10),
    angle:r(clamp(slope-103,-75,75)),
  };

  // 5. Soft light is concentrated over photographed x384,y612 and
  //    fades into bulb. An attached narrow wax contact, never a dot.
  const highA=offset(bulbHigh,-13,-12),highB=offset(tip,5,-18);
  const highC=offset(tip,-4,3),highD=offset(bulbHigh,-16,5);
  const highControls:XY[]=[
    offset(highA,11,-8),offset(highB,-17,-5),highB,
    offset(highB,7,6),offset(highC,11,5),highC,
    offset(highC,-11,4),offset(highD,2,9),highD,
    offset(highA,-6,10),offset(highA,-6,-1),highA,
  ];
  const highShape={
    d:"M"+txt(highA)+C(...highControls.slice(0,3) as [XY,XY,XY])+
      C(...highControls.slice(3,6) as [XY,XY,XY])+
      C(...highControls.slice(6,9) as [XY,XY,XY])+
      C(...highControls.slice(9,12) as [XY,XY,XY])+"Z",
    bounds:envelope([highA,highB,highC,highD,...highControls],9),
    angle:r(clamp(slope-112,-75,75)),
  };

  const shapes={
    "nose-root":rootShape,
    "nose-dorsum":dorsumShape,
    "nose-sidewall-form":wallShape,
    "nose-tip":bulbShape,
    "nose-tip-reflected-light":highShape,
  } as const satisfies Record<ChangedId,NativeNosePatch>;
  if(Object.values(shapes).some(v=>
    !Number.isFinite(v.angle)||v.bounds.width<20||v.bounds.height<20||
    v.bounds.width>210||v.bounds.height>210||
    v.bounds.x<280||v.bounds.x>460||v.bounds.y<460||v.bounds.y>700))
    throw new RangeError("ANAT1 photo-registered nasal geometry exceeds observed face");
  return shapes;
}

const pigment:Readonly<Record<ChangedId,Partial<Wax>>>={
  "nose-root":{
    colors:["#a67d74","#704f51","#c19685"],
    pressure:.7,markStrength:.34,spacing:6.3,
    featherContacts:true,blendRadius:13.4,
    deposition:"stroke-built",nibStyle:"dry",outlineOpacity:0,
    coverage:"open",
  },
  "nose-dorsum":{
    colors:["#e7bfae","#b1857d","#f6d2bc"],
    pressure:.73,markStrength:.43,spacing:5.2,
    featherContacts:true,blendRadius:13.6,
    underpaintGradient:{light:"#f3cbb7",shadow:"#ae837e",
      focusX:.34,focusY:.38,radius:1.1},
    underpaintTooth:.21,opaqueBurnish:.12,
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",outlineOpacity:0,
  },
  "nose-sidewall-form":{
    colors:["#b68f89","#886767","#d7aaa0"],
    pressure:.72,markStrength:.41,spacing:5.2,
    featherContacts:true,blendRadius:12.8,
    underpaintGradient:{light:"#c49f97",shadow:"#795653",
      focusX:.33,focusY:.34,radius:1.07},
    underpaintTooth:.24,opaqueBurnish:.16,
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",outlineOpacity:0,
  },
  "nose-tip":{
    colors:["#f9d8be","#d9ac98","#ffe4c8"],
    pressure:.82,markStrength:.46,spacing:4.8,
    featherContacts:true,blendRadius:9.4,
    underpaintGradient:{light:"#ffe0c5",shadow:"#c39380",
      focusX:.19,focusY:.29,radius:1.1},
    underpaintTooth:.26,opaqueBurnish:.26,
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",outlineOpacity:0,
  },
  "nose-tip-reflected-light":{
    colors:["#f7ceb8","#ddab98","#ffe2c9"],
    pressure:.87,markStrength:.48,spacing:4.8,
    featherContacts:true,blendRadius:7.8,
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",outlineOpacity:0,
  },
};

/** Rebuild exactly five existing nested anatomical wax surfaces.
 * CRAYON1 blend/pressure engine continues to own final texture.
 * Fail closed on duplicates, missing parent, wrong layer type, double use.
 */
export function crayonF1BuildAnat1NasalVolume(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const geometry=crayonF1Anat1NasalPatchGeometry();
  const seen=new Set<string>();
  const output=elements.map(el=>{
    if(!Object.prototype.hasOwnProperty.call(pigment,el.id))return el;
    if(seen.has(el.id)||el.kind!=="wax"||
       el.parentId!=="face-outline"||el.clipToParent!==true)
      throw new RangeError("Invalid nasal skin wax "+el.id);
    seen.add(el.id);
    const id=el.id as ChangedId;
    if(el.d===geometry[id].d)
      throw new RangeError("V33 ANAT1 nasal volume was already applied");
    return {...el,...pigment[id],...geometry[id]};
  });
  if(seen.size!==CRAYON_F1_V33_CHANGED_IDS.length)
    throw new RangeError("Missing registered ANAT1 dorsal/orbital/alar contact");
  return output;
}
