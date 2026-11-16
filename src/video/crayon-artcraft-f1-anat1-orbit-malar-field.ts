import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
import {CRAYON_PORTRAIT_AUDIT} from "./crayon-artcraft-portrait-audit";
import {crayonF1RegisterAnat1Face} from "./crayon-artcraft-f1-anat1-malar";

/**
 * ArtCraft V35 — connected native orbito-malar *five-value* face study.
 * This is a controlled new experiment from V32, NOT from V33 or V34.
 *
 * Actual source vs V32 browser RGB medians (7×7), at original 608×1082:
 * near brow (225,490) [133,94,79] vs [188,156,146];
 * near orbital hood (254,514) [121,89,87] vs [170,137,134];
 * infraorbital (255,585) [162,118,105] vs [198,160,146];
 * malar crest (180,620) [240,208,189] vs [222,185,165];
 * cheek shadow (133,721) [115,78,64] vs [153,109,98];
 * nasal root (350,532) [163,126,108] vs [203,171,158].
 *
 * This study is not a photo texture, not colorized dots, not a generic
 * face or a new feature rig. The 468-pt ANAT1 mesh/camera gives continuous
 * face-surface orientation. Frozen CC0 photographed landmarks supply
 * identity and color planes. All painting remains native CRAYON1 wax,
 * with pressure-built dry marks, tactile paper and original 300-frame film.
 */
type Wax=Extract<CrayonElement,{kind:"wax"}>;
type XY=readonly [number,number];
const src=CRAYON_PORTRAIT_AUDIT.sourcePoints;
const r=(x:number)=>Math.round(x*100)/100;
const p=(x:number,y:number):XY=>[r(x),r(y)];
const add=(xy:XY,x:number,y:number):XY=>p(xy[0]+x,xy[1]+y);
const mix=(a:XY,b:XY,t:number):XY=>
  p(a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t);
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const fmt=(a:XY)=>a.join(" ");
const cubic=(a:XY,b:XY,c:XY)=>" C"+fmt(a)+" "+fmt(b)+" "+fmt(c);
const b=(points:readonly XY[],padding:number)=>{
  const x=Math.floor(Math.min(...points.map(q=>q[0]))-padding);
  const y=Math.floor(Math.min(...points.map(q=>q[1]))-padding);
  const xx=Math.ceil(Math.max(...points.map(q=>q[0]))+padding);
  const yy=Math.ceil(Math.max(...points.map(q=>q[1]))+padding);
  return {x,y,width:xx-x,height:yy-y};
};
const asRegion=(pts:XY[],angle:number,padding=13)=>{
  if((pts.length-1)%3!==0)
    throw new RangeError("Cubic facial mass has incomplete connected controls");
  const [start,...ctl]=pts;
  const d="M"+fmt(start)+
    Array.from({length:ctl.length/3},(_,i)=>
      cubic(ctl[i*3],ctl[i*3+1],ctl[i*3+2])).join("")+"Z";
  const bounds=b(pts,padding);
  if(bounds.width<20||bounds.height<20||bounds.width>480||
     bounds.height>520||bounds.x<50||bounds.x>560||
     bounds.y<250||bounds.y>920)
    throw new RangeError("ANAT1 facial light field exceeds photo geometry");
  return {d,bounds,angle:r(clamp(angle,-75,75))};
};

export const CRAYON_F1_V35_IDS=[
  "socket-near","socket-far","malar-cheek-near",
  "cheek-malar-cast","cheek-malar-bounce","nose-root",
] as const;
export const CRAYON_F1_V35_SOURCE_SAMPLES=Object.freeze({
  sourceSha:CRAYON_PORTRAIT_AUDIT.source.sha256,
  nearBrow:{at:[225,490],photo:[133,94,79],baseline:[188,156,146]},
  nearHood:{at:[254,514],photo:[121,89,87],baseline:[170,137,134]},
  infraorbital:{at:[255,585],photo:[162,118,105],baseline:[198,160,146]},
  malarLight:{at:[180,620],photo:[240,208,189],baseline:[222,185,165]},
  cheekCore:{at:[133,721],photo:[115,78,64],baseline:[153,109,98]},
  nasalRoot:{at:[350,532],photo:[163,126,108],baseline:[203,171,158]},
} as const);

type ChangedId=(typeof CRAYON_F1_V35_IDS)[number];
type Surface={d:string;bounds:Wax["bounds"];angle:number};

/**
 * A unified axis field. The near eye's lower rim feeds the malar skin,
 * which in turn feeds the under-cheek cast. The medial nasal bone starts
 * at the same inner-eye/ANAT1 sellion neighborhood.
 *
 * The projected ANAT1 face is NOT an identity estimator: observed photo
 * canthi, root and cheek keep 85–95% of final placement. MediaPipe lacks
 * scalp/ears/neck; no source hair position is fitted to the face mask.
 */
export function crayonF1Anat1OrbitalMalarPaths():
    Readonly<Record<ChangedId,Surface>>{
  const fit=crayonF1RegisterAnat1Face();
  const nearOuter=mix(src.eye_near_outer as XY,fit.projected["exocanthion.R"],.09);
  const nearInner=mix(src.eye_near_inner as XY,fit.projected["endocanthion.R"],.10);
  const farInner=mix(src.eye_far_inner as XY,fit.projected["endocanthion.L"],.10);
  const farOuter=mix(src.eye_far_outer as XY,fit.projected["exocanthion.L"],.09);
  const nasalRoot=mix(src.nose_root as XY,fit.projected["sellion"],.09);
  const malar=mix(src.cheek_near as XY,fit.projected["cheekbone.R"],.15);
  const lowerOrbit=mix(add(nearInner,-38,27),
    add(fit.projected["palpebrale-inferius.R"],-3,8),.13);
  // The visible portrait eye is NOT symmetric: far sclera is hair-occluded.
  const orbTop=add(mix(src.brow_near_peak as XY,
    fit.projected["brow-mid.R"],.14),-3,-9);
  const nearStart=add(nearOuter,-22,-26);
  const nearFold=add(nearInner,15,-24);
  const nearBottom=add(lowerOrbit,0,-24);
  const nearEnd=add(nearOuter,-14,-2);
  const socketNear=asRegion([
    nearStart,
    add(nearStart,16,-24),add(orbTop,-37,-15),orbTop,
    add(orbTop,33,-11),add(nearFold,-10,-12),nearFold,
    add(nearFold,0,16),add(nearBottom,24,-15),nearBottom,
    add(nearBottom,-28,-16),add(nearEnd,16,-24),nearEnd,
    add(nearEnd,-13,-2),add(nearStart,-12,15),nearStart,
  ],18,15);
  const farStart=add(farInner,-19,-26);
  const farTop=add(farOuter,-7,-59);
  const farEnd=add(farOuter,7,-8);
  const farUnder=add(farInner,-5,-3);
  const socketFar=asRegion([
    farStart,
    add(farStart,18,-24),add(farTop,-35,-11),farTop,
    add(farTop,28,-8),add(farEnd,12,-29),farEnd,
    add(farEnd,-18,4),add(farUnder,27,-11),farUnder,
    add(farUnder,-17,1),add(farStart,-8,13),farStart,
  ],31,12);

  // Source highlight starts directly below the orbital bone and rolls
  // over the three-quarter face. Rebuild a *large single attached field*,
  // not a pair of local discs that cannot convey skin curvature.
  const cheekUpper=add(nearOuter,-99,27);
  const cheekInfra=add(lowerOrbit,-2,8);
  const cheekMedial=add(nasalRoot,-15,119);
  const cheekMid=add(malar,63,72);
  const cheekLower=add(malar,-8,116);
  const cheekLateral=add(nearOuter,-118,171);
  const cheek=asRegion([
    cheekUpper,
    add(cheekUpper,32,-20),add(cheekInfra,-67,-27),cheekInfra,
    add(cheekInfra,39,4),add(cheekMedial,-31,-45),cheekMedial,
    add(cheekMedial,-4,47),add(cheekMid,31,-32),cheekMid,
    add(cheekMid,-40,39),add(cheekLower,45,13),cheekLower,
    add(cheekLower,-63,-3),add(cheekLateral,15,68),cheekLateral,
    add(cheekLateral,-25,-50),add(cheekUpper,-12,84),cheekUpper,
  ],41,18);
  const castStart=add(cheekUpper,-15,35);
  const castMid=add(malar,-87,62);
  const castLow=add(cheekLower,-52,44);
  const castFinish=add(cheekLateral,-4,9);
  const cast=asRegion([
    castStart,
    add(castStart,13,18),add(castMid,-3,-19),castMid,
    add(castMid,32,27),add(castLow,17,-17),castLow,
    add(castLow,-27,17),add(castFinish,-8,25),castFinish,
    add(castFinish,-18,-37),add(castStart,-21,58),castStart,
  ],56,12);

  // The brighter core shares a natural continuation of cheekUpper,
  // lowerOrbit and malar. It is NOT an independently centered oval.
  const lightStart=add(cheekUpper,11,27);
  const lightTop=add(cheekInfra,-78,-2);
  const lightEnd=add(malar,48,16);
  const lightLow=add(malar,-29,38);
  const bounce=asRegion([
    lightStart,
    add(lightStart,24,-15),add(lightTop,-31,-22),lightTop,
    add(lightTop,58,-3),add(lightEnd,10,-33),lightEnd,
    add(lightEnd,-23,42),add(lightLow,47,21),lightLow,
    add(lightLow,-34,-1),add(lightStart,-19,54),lightStart,
  ],24,17);

  // A convex bone-to-cartilage turn remains continuous with socket's
  // medial return and nasal root; dark shadow high, warm reflected below.
  const rootA=add(nearInner,27,-36);
  const rootB=add(nasalRoot,-6,-11);
  const rootC=add(nasalRoot,19,41);
  const rootD=add(nasalRoot,-9,63);
  const rootE=add(nearInner,24,22);
  const root=asRegion([
    rootA,
    add(rootA,12,-23),add(rootB,-13,-21),rootB,
    add(rootB,18,13),add(rootC,-6,-17),rootC,
    add(rootC,0,19),add(rootD,18,22),rootD,
    add(rootD,-29,-18),add(rootE,15,25),rootE,
    add(rootE,-12,-9),add(rootA,-5,20),rootA,
  ],49,11);
  const path={
    "socket-near":socketNear,"socket-far":socketFar,
    "malar-cheek-near":cheek,"cheek-malar-cast":cast,
    "cheek-malar-bounce":bounce,"nose-root":root,
  } as const satisfies Record<ChangedId,Surface>;
  return Object.freeze(path);
}

const paint:Readonly<Record<ChangedId,Partial<Wax>>>={
  "socket-near":{
    colors:["#9a756d","#503738","#c3998a"],
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:18,
    underpaintGradient:{light:"#b88d80",shadow:"#573d40",
      focusX:.57,focusY:.68,radius:.93},
    underpaintTooth:.23,opaqueBurnish:.50,
    pressure:.79,spacing:5.8,markStrength:.29,outlineOpacity:0,
  },
  "socket-far":{
    colors:["#936b65","#4b3437","#aa7c75"],
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:13.6,
    underpaintGradient:{light:"#a58179",shadow:"#513739",
      focusX:.49,focusY:.71,radius:.94},
    underpaintTooth:.21,opaqueBurnish:.55,
    pressure:.84,spacing:5.8,markStrength:.28,outlineOpacity:0,
  },
  "malar-cheek-near":{
    colors:["#eac1ad","#b88a7a","#ffddc2"],
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:18,
    underpaintGradient:{light:"#f6ceaf",shadow:"#a4766b",
      focusX:.42,focusY:.41,radius:1.16},
    underpaintTooth:.27,opaqueBurnish:.12,
    pressure:.68,spacing:6.7,markStrength:.25,outlineOpacity:0,
  },
  "cheek-malar-cast":{
    colors:["#91665c","#533e3c","#c0927d"],
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:14,
    underpaintGradient:{light:"#bc8978",shadow:"#614744",
      focusX:.35,focusY:.40,radius:1.10},
    underpaintTooth:.24,opaqueBurnish:.27,
    pressure:.79,spacing:5.9,markStrength:.37,outlineOpacity:0,
  },
  "cheek-malar-bounce":{
    colors:["#fbd6ba","#cda192","#ffe5c9"],
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:18,
    underpaintGradient:{light:"#ffdfc3",shadow:"#bc9686",
      focusX:.30,focusY:.34,radius:1.22},
    underpaintTooth:.27,opaqueBurnish:.14,
    pressure:.71,spacing:6.3,markStrength:.23,outlineOpacity:0,
  },
  "nose-root":{
    colors:["#ad847b","#795956","#c79f8e"],
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:16,
    pressure:.66,spacing:6.1,markStrength:.31,outlineOpacity:0,
  },
};

/** Rebuild only original parent-clipped native wax. All other V32 nodes,
 * hand-drawn eyes, glints, individual hair strands, cavity rims, camera,
 * scene seed and timing are *structurally unchanged* by this transform.
 * Fails closed on duplicate, absent, invalid or already applied nodes.
 */
export function crayonF1BuildAnat1OrbitMalarField(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const geometry=crayonF1Anat1OrbitalMalarPaths();
  const seen=new Set<string>();
  const result=elements.map(el=>{
    if(!Object.prototype.hasOwnProperty.call(geometry,el.id))return el;
    if(el.kind!=="wax"||seen.has(el.id)||
       el.parentId!=="face-outline"||el.clipToParent!==true)
      throw new RangeError("Invalid ANAT1 orbital-to-malar wax "+el.id);
    seen.add(el.id);
    const id=el.id as ChangedId;
    if(el.d===geometry[id].d)
      throw new RangeError("V35 ANAT1 face value field already applied");
    return {...el,...paint[id],...geometry[id]};
  });
  if(seen.size!==CRAYON_F1_V35_IDS.length)
    throw new RangeError("Missing matched ANAT1 original eye/cheek/root wax");
  return result;
}
