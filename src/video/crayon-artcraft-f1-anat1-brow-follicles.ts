import type {CrayonColor,CrayonElement} from "../../registry/video/materials/crayon-scene";
import {crayonF1RegisterAnat1Face} from "./crayon-artcraft-f1-anat1-malar";
import {CRAYON_PORTRAIT_AUDIT} from "./crayon-artcraft-portrait-audit";

/**
 * ArtCraft F1 V37 — photographed ANAT1 eyebrow follicles, not a drawn arch.
 *
 * The independently inspected 608×1082 CC0 source has a real dark near
 * eyebrow growing from thin x200,y501 through dense root x265..305,
 * y470..485 then tapering to x330,y488. Actual V36 native screenshot
 * shows almost NO eyebrow: x265,y474 source median 7×7 (106,64,52)
 * versus native (188,159,147). Source x241,y486 (108,70,61)
 * versus native (172,141,131).
 *
 * The repository's existing V9 SOURCE-ROOTED brow pass already builds
 * eight rich original native wax/fiber elements. DO NOT throw them away,
 * replace source brow with a dark polygon or infer an averaged identity.
 * Keep all 20 separately authored source-brow-fibers-near strokes.
 * Strengthen only three existing near-brow wax layers and append 128
 * asymmetric source-follicle/contact fibers plus 37 reflected loose
 * fibers, before film eyes and hair. Existing far brow stays unchanged.
 *
 * Licensed photo: Christopher Campbell "Brunette woman portrait"
 * https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg
 * CC0 1.0; exact browser screenshot SHA below (not original camera JPEG).
 */
type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Contour=Extract<CrayonElement,{kind:"contour"}>;
type Point=readonly [number,number];
const source=CRAYON_PORTRAIT_AUDIT.sourcePoints;
const round=(n:number)=>Math.round(n*100)/100;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const point=(x:number,y:number):Point=>[round(x),round(y)];
const fmt=(p:Point)=>p[0]+" "+p[1];

export const CRAYON_F1_V37_SOURCE=Object.freeze({
  sha:CRAYON_PORTRAIT_AUDIT.source.sha256,
  nearBrowPeak:source.brow_near_peak,
  paperContactPoints:[
    {at:[214,497],photo:[158,116,101],v36:[191,162,149]},
    {at:[225,493],photo:[135,94,80],v36:[192,164,150]},
    {at:[241,486],photo:[108,70,61],v36:[172,141,131]},
    {at:[265,474],photo:[106,64,52],v36:[188,159,147]},
    {at:[280,472],photo:[111,69,61],v36:[183,153,142]},
    {at:[306,476],photo:[110,72,63],v36:[189,157,145]},
  ],
  darkFilamentCount:128,
  reflectedFilamentCount:37,
  preservedOriginalFilaments:20,
} as const);

export const CRAYON_F1_V37_WAX_IDS=[
  "source-brow-feather-near","source-brow-wax-near",
  "source-brow-vein-near",
] as const;
export const CRAYON_F1_V37_NEW_IDS=[
  "source-brow-follicles-near","source-brow-flyaways-near",
] as const;
type ExistingId=(typeof CRAYON_F1_V37_WAX_IDS)[number];
type NewId=(typeof CRAYON_F1_V37_NEW_IDS)[number];

/** Source photograph's upper/lower hair-root envelopes, measured by hand.
 * Deliberately asymmetric with a wide dense center and tapered ends.
 * No generic eyebrow ellipse or repeated uniform ticks are allowed.
 */
const browEnvelope={
  upper:[[201,500],[221,490],[242,476],[265,466],[284,465],[304,471],[332,485]],
  lower:[[201,504],[221,500],[242,493],[265,485],[284,481],[304,484],[332,489]],
} as const;
function interpolate(knots:readonly (readonly [number,number])[],x:number):number{
  if(x<=knots[0][0])return knots[0][1];
  for(let i=1;i<knots.length;i++){
    if(x<=knots[i][0]){
      const [ax,ay]=knots[i-1],[bx,by]=knots[i];
      const t=(x-ax)/(bx-ax);
      // Smooth a little, but preserve source irregularity and non-ellipse.
      const f=t*t*(3-2*t);
      return ay+(by-ay)*f;
    }
  }
  return knots[knots.length-1][1];
}
const jitter=(i:number,salt:number):number=>{
  const k=Math.sin(i*127.1+salt*311.7)*43758.5453;
  return k-Math.floor(k);
};
/** Fit the ANAT1 canonical brow tangent to the *source*, never
 * stretch the person into a population-average/unnatural arch.
 * Only tiny corrections ≤2px. Camera is registered with 13 source
 * points, not 18 observed FINAL-render points; no art approval.
 */
function sourceCameraOffset():Point{
  const fit=crayonF1RegisterAnat1Face();
  if(fit.model!=="ANAT1/MediaPipe-468-unmodified"||
     fit.artisticApproval!==false||fit.rmse>40)
    throw new RangeError("Invalid original-source ANAT1 brow camera");
  const peak=source.brow_near_peak;
  const model=fit.projected["brow-mid.R"];
  return point(
    clamp((model[0]-peak[0])*.07,-2,2),
    clamp((model[1]-peak[1])*.07,-2,2));
}
export function crayonF1Anat1BrowFibrePaths():
    Readonly<Record<NewId,string>>{
  const shift=sourceCameraOffset();
  const make=(count:number,salt:number,isReflection:boolean)=>{
    const strokes:string[]=[];
    for(let i=0;i<count;i++){
      // This jittered source-space distribution is deliberately neither
      // a repeated grid nor an even-spaced row of upward lash-like ticks.
      const f=(i+.20+.60*jitter(i,salt))/(count+.65);
      const x=203+127*f+1.75*(jitter(i,salt+1)-.5);
      const top=interpolate(browEnvelope.upper,x),
        bottom=interpolate(browEnvelope.lower,x);
      const depth=bottom-top;
      // Follicle roots occupy the underside/dense interior of the brow;
      // tips curve into the top envelope; the outermost 7% splay away.
      const rootY=bottom-(.07+.38*jitter(i,salt+2))*depth;
      const length=(isReflection?3.2:4.4)+
        (isReflection?7.0:11.8)*jitter(i,salt+3)*
        clamp(depth/13,.4,1.15);
      const lean=(x<245?.52:x<289?.17:.58)+
        (jitter(i,salt+4)-.5)*.33;
      const flip=x>311?-.12:0;
      const root=point(x+shift[0],rootY+shift[1]);
      const tip=point(x+(lean+flip)*length+shift[0],
        rootY-length*.76+shift[1]);
      const c1=point(tip[0]-(lean+flip)*length*.15,
        tip[1]+length*.40);
      const c2=point(root[0]+(lean+flip)*length*.15,
        root[1]-length*.33);
      // Native contour deposits its terminal wax at the LAST point;
      // draw thin free tip first and dark thick follicle last. Keep
      // true source-rooted curvature and irregular staggering.
      strokes.push("M"+fmt(tip)+" C"+fmt(c1)+" "+fmt(c2)+" "+fmt(root));
      if(root[0]<196||root[0]>341||root[1]<455||root[1]>513||
        tip[1]<442||tip[1]>513)
        throw new RangeError("Photo-fitted brow fiber escaped natural source hairline");
    }
    return strokes.join(" ");
  };
  const dark=make(CRAYON_F1_V37_SOURCE.darkFilamentCount,3,false);
  const glints=make(CRAYON_F1_V37_SOURCE.reflectedFilamentCount,11,true);
  if((dark.match(/M/g)??[]).length!==128||
     (glints.match(/M/g)??[]).length!==37||
     dark.includes("NaN")||glints.includes("NaN"))
    throw new RangeError("Failed to build complete variable-density brow follicles");
  return {
    "source-brow-follicles-near":dark,
    "source-brow-flyaways-near":glints,
  } as const;
}
/** Native wax pigment changes only; V9 source-rooted geometry remains,
 * including its separately authored original 20 brow fibers. The narrow
 * opaque density core rides inside an OPEN feathered large eyebrow
 * volume, avoiding an artificial black vector sticker.
 */
const pigments:Readonly<Record<ExistingId,Partial<Wax>>>={
  "source-brow-feather-near":{
    colors:["#86625b","#544144","#ac867d"],
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    underpaintGradient:undefined,underpaintTooth:0,opaqueBurnish:0,
    pressure:.68,spacing:5.1,markStrength:.20,
    featherContacts:true,blendRadius:10.2,
    outlineOpacity:0,
  },
  "source-brow-wax-near":{
    colors:["#74534e","#3f2d30","#977067"],
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    underpaintGradient:undefined,underpaintTooth:0,opaqueBurnish:0,
    pressure:.89,spacing:4.5,markStrength:.37,
    featherContacts:true,blendRadius:5.1,
    outlineOpacity:0,
  },
  "source-brow-vein-near":{
    colors:["#674940","#342528","#957167"],
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",
    underpaintGradient:{
      light:"#8a6157",shadow:"#342329",
      focusX:.45,focusY:.48,radius:.96,
    },
    underpaintTooth:.28,opaqueBurnish:.38,
    pressure:.90,spacing:4.1,markStrength:.26,
    featherContacts:true,blendRadius:4.2,
    outlineOpacity:0,
  },
};
const newContours:Readonly<Record<NewId,Readonly<{
  color:CrayonColor;width:number;opacity:number;waxPressure:number;
}>>>={
  "source-brow-follicles-near":{
    color:"#493435",width:.39,opacity:.83,waxPressure:.72,
  },
  "source-brow-flyaways-near":{
    color:"#a48072",width:.22,opacity:.40,waxPressure:.45,
  },
};
/**
 * Fail closed: V9 existing source-rooted brow assembly (including its
 * fine hairs) must be present and unique. Do not touch other face IDs,
 * reopen V33/V34, replace ANAT1 3D face, or flatten existing detail.
 */
export function crayonF1BuildAnat1SourceBrow(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const paths=crayonF1Anat1BrowFibrePaths();
  const found=new Set<ExistingId>();
  const out:CrayonElement[]=[];
  const allIds=new Set<string>();
  let hasOriginalNear=false,hasOriginalFar=false;
  for(const el of elements){
    if(allIds.has(el.id))throw new RangeError("Duplicated original F1 element "+el.id);
    allIds.add(el.id);
    if(CRAYON_F1_V37_NEW_IDS.some(id=>id===el.id))
      throw new RangeError("V37 already applied to the photographed brow");
    if(el.id==="source-brow-fibers-near"){
      if(el.kind!=="contour"||el.parentId!=="face-outline"||
         el.clipToParent!==true||
         (el.d.match(/M/g)??[]).length!==20)
        throw new RangeError("Missing 20 authentic original source eyebrow fibers");
      hasOriginalNear=true;
      out.push(el);
      for(const id of CRAYON_F1_V37_NEW_IDS){
        const spec=newContours[id];
        const contact:Contour={
          kind:"contour",id,d:paths[id],color:spec.color,
          width:spec.width,opacity:spec.opacity,
          waxContact:"dry-wax",waxPressure:spec.waxPressure,
          parentId:"face-outline",clipToParent:true,
          timing:{start:210,end:299},
        };
        out.push(contact);
      }
      continue;
    }
    if(el.id==="source-brow-fibers-far")hasOriginalFar=true;
    if(Object.prototype.hasOwnProperty.call(pigments,el.id)){
      if(el.kind!=="wax"||el.parentId!=="face-outline"||
         el.clipToParent!==true||found.has(el.id as ExistingId))
        throw new RangeError("Disconnected ANAT1 source eyebrow wax "+el.id);
      found.add(el.id as ExistingId);
      out.push({...el,...pigments[el.id as ExistingId]});
    }else out.push(el);
  }
  if(!hasOriginalNear||!hasOriginalFar||
     found.size!==CRAYON_F1_V37_WAX_IDS.length)
    throw new RangeError("Incomplete photographed V9 brow support");
  if(new Set(out.map(e=>e.id)).size!==out.length)
    throw new RangeError("Duplicate V37 follicle or original feature");
  return out;
}
