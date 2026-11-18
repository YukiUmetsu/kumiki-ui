import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
import {CRAYON_PORTRAIT_AUDIT} from "./crayon-artcraft-portrait-audit";
import {crayonF1RegisterAnat1Face} from "./crayon-artcraft-f1-anat1-malar";

/**
 * ArtCraft F1 V36 — source-registered skin-held eye *aperture*, not an
 * isolated iris circle or generic 'beautiful eye' icon.
 *
 * Concrete failure in the exact V35 source/native 3× comparison:
 * left exposed sclera (239,550) photo [43,28,27], V35 [119,102,101];
 * right sclera (299,551) photo [114,99,100], V35 [170,153,147];
 * iris (254,547) photo [19,12,10], V35 [41,33,36];
 * lower lid (259,571) photo [108,64,60], V35 [181,155,146].
 * This is a coordinated *form and value* correction before generic
 * additional detail. Preserve every named fibre, corneal reflection,
 * lower infra-orbital mass, source ANAT1 yaw/pitch and 300-frame timing.
 *
 * CC0 Christopher Campbell original browser screenshot 608×1082,
 * not the unavailable high-res original camera JPEG.
 */
type Wax=Extract<CrayonElement,{kind:"wax"}>;
type XY=readonly [number,number];
const r=(x:number)=>Math.round(x*100)/100;
const xy=(x:number,y:number):XY=>[r(x),r(y)];
const src=CRAYON_PORTRAIT_AUDIT.sourcePoints;
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));

/** Frozen individual-source pixels measure shape, not copied RGB texture. */
export const CRAYON_F1_V36_SOURCE=Object.freeze({
  sha:CRAYON_PORTRAIT_AUDIT.source.sha256,
  nearOuterCanthus:[216,558] as const,
  nearInnerCanthus:[318,545] as const,
  upperLidCrest:[265,534] as const,
  lowerLidCrest:[267,565] as const,
  nearIris:[260,546] as const,
  leftSclera:{at:[239,550] as const,source:[43,28,27] as const,v35:[119,102,101] as const},
  rightSclera:{at:[299,551] as const,source:[114,99,100] as const,v35:[170,153,147] as const},
  iris:{at:[254,547] as const,source:[19,12,10] as const,v35:[41,33,36] as const},
  lidMargin:{at:[259,571] as const,source:[108,64,60] as const,v35:[181,155,146] as const},
});
export const CRAYON_F1_V36_IDS=[
  "sclera-near","sclera-inner-contact-near","iris-near","pupil-near","upper-lid-near",
  "lash-root-near","lower-lid-near","lower-lid-margin-near",
  "upper-lid-crease-near",
] as const;
type Id=(typeof CRAYON_F1_V36_IDS)[number];
type Shape={d:string;bounds:Wax["bounds"];angle:number};

/** The ANAT1 3D camera corrects shape orientation by a bounded
 * displacement along the photographed visible lateral→medial canthi.
 * Source coordinates retain ≥90% authority: the canonical 468-vertex
 * eye mesh is an average face, NOT the photographed sitter's identity.
 */
function sourceToFittedPhoto(point:XY):XY{
  const fit=crayonF1RegisterAnat1Face();
  const outer=src.eye_near_outer as XY,inner=src.eye_near_inner as XY;
  const near=fit.projected["exocanthion.R"],
    far=fit.projected["endocanthion.R"];
  const t=clamp((point[0]-outer[0])/(inner[0]-outer[0]),0,1);
  const dx=clamp(((near[0]-outer[0])*(1-t)+(far[0]-inner[0])*t)*.09,-2.5,2.5);
  const dy=clamp(((near[1]-outer[1])*(1-t)+(far[1]-inner[1])*t)*.09,-2.5,2.5);
  return xy(point[0]+dx,point[1]+dy);
}
const fmt=(p:XY)=>p.join(" ");
const curve=(c1:XY,c2:XY,end:XY)=>" C"+fmt(c1)+" "+fmt(c2)+" "+fmt(end);
const make=(original:readonly XY[],angle:number,pad=8):Shape=>{
  if((original.length-1)%3!==0||original.length<10)
    throw new RangeError("Incomplete connected ANAT1 tarsal cubic");
  const points=original.map(sourceToFittedPhoto);
  const [start,...control]=points;
  const d="M"+fmt(start)+Array.from({length:control.length/3},(_,i)=>
    curve(control[i*3],control[i*3+1],control[i*3+2])).join("")+"Z";
  const minX=Math.floor(Math.min(...points.map(p=>p[0]))-pad);
  const minY=Math.floor(Math.min(...points.map(p=>p[1]))-pad);
  const maxX=Math.ceil(Math.max(...points.map(p=>p[0]))+pad);
  const maxY=Math.ceil(Math.max(...points.map(p=>p[1]))+pad);
  const bounds={x:minX,y:minY,width:maxX-minX,height:maxY-minY};
  if(bounds.x<185||bounds.x>280||bounds.y<479||bounds.y>575||
     bounds.width<17||bounds.width>155||bounds.height<17||bounds.height>110)
    throw new RangeError("Photographic tarsal contour escaped original face");
  return {d,bounds,angle};
};
/**
 * 9 original wax forms share 2 actual canthi and photographic limbus.
 * The iris pupil is partially occluded by the upper skin, and left
 * exposed sclera lies INSIDE the near dark lid/sclera intersection.
 * Non-eye regions (forehead, nose, ear, jaw, hair) remain exactly V35.
 */
export function crayonF1Anat1NearEyePaths():Readonly<Record<Id,Shape>>{
  const out:Record<Id,Shape>={
    "sclera-near":make([
      xy(216,558),
      xy(228,544),xy(246,537),xy(264,536),
      xy(285,532),xy(305,538),xy(318,545),
      xy(303,558),xy(285,563),xy(266,566),
      xy(246,570),xy(228,568),xy(216,558),
    ],-9,8),
    // Actual source inner sclera (x290,y546) is moist/light, but its
    // medial corner past x305 is cast-shadowed. Split the wet reflection
    // from the dark corneal base instead of whitening the entire almond.
    "sclera-inner-contact-near":make([
      xy(281,544),
      xy(285,540),xy(293,539),xy(300,543),
      xy(302,547),xy(298,552),xy(294,555),
      xy(288,558),xy(282,556),xy(281,549),
      xy(280,547),xy(280,545),xy(281,544),
    ],17,5),
    "iris-near":make([
      xy(240,543),
      xy(244,535),xy(253,532),xy(264,533),
      xy(277,534),xy(283,544),xy(280,553),
      xy(277,562),xy(268,566),xy(258,566),
      xy(244,563),xy(240,554),xy(240,543),
    ],-2,6),
    "pupil-near":make([
      xy(250,546),
      xy(252,542),xy(260,540),xy(264,542),
      xy(269,545),xy(268,553),xy(263,557),
      xy(257,559),xy(251,554),xy(250,546),
    ],7,5),
    "upper-lid-near":make([
      xy(211,560),
      xy(225,537),xy(243,524),xy(266,525),
      xy(291,521),xy(309,532),xy(322,546),
      xy(307,540),xy(288,536),xy(268,536),
      xy(244,540),xy(226,550),xy(216,565),
      xy(212,567),xy(211,564),xy(211,560),
    ],-11,8),
    "lash-root-near":make([
      xy(218,558),
      xy(230,544),xy(243,537),xy(264,535),
      xy(286,532),xy(305,538),xy(318,544),
      xy(301,542),xy(285,540),xy(267,540),
      xy(244,545),xy(232,551),xy(220,561),
      xy(218,562),xy(218,560),xy(218,558),
    ],-12,6),
    "lower-lid-near":make([
      xy(216,559),
      xy(236,569),xy(251,572),xy(270,567),
      xy(293,563),xy(311,554),xy(319,546),
      xy(309,566),xy(294,577),xy(272,581),
      xy(249,586),xy(227,578),xy(216,559),
    ],20,9),
    "lower-lid-margin-near":make([
      xy(222,568),
      xy(242,580),xy(264,578),xy(282,572),
      xy(302,562),xy(314,553),xy(316,549),
      xy(310,570),xy(289,588),xy(267,587),
      xy(243,589),xy(228,580),xy(222,568),
    ],20,9),
    "upper-lid-crease-near":make([
      xy(212,545),
      xy(226,521),xy(247,510),xy(267,510),
      xy(291,508),xy(311,520),xy(324,536),
      xy(306,521),xy(288,516),xy(270,520),
      xy(246,523),xy(225,537),xy(212,545),
    ],-13,9),
  };
  const fit=crayonF1RegisterAnat1Face();
  if(fit.artisticApproval!==false||fit.rmse>40||
     fit.model!=="ANAT1/MediaPipe-468-unmodified")
    throw new RangeError("Not a verified ANAT1 source fitted reference");
  return Object.freeze(out);
}
const wax:Readonly<Record<Id,Partial<Wax>>>={
  "sclera-near":{
    // The photo's left sclera is nearly invisible under a dark eyelid.
    colors:["#77665f","#342b30","#b3a19b"],
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",
    underpaintGradient:{light:"#bbaaa3",shadow:"#392c30",
      focusX:.87,focusY:.48,radius:1.18},
    underpaintTooth:.16,opaqueBurnish:.63,
    pressure:.96,spacing:4.8,markStrength:.35,outlineOpacity:0,
  },
  "sclera-inner-contact-near":{
    colors:["#beb0ad","#857b7e","#d8cccb"],
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:4.5,
    pressure:.70,spacing:5.3,markStrength:.26,outlineOpacity:0,
  },
  "iris-near":{
    colors:["#32241f","#110d0f","#5b3d2d"],
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",
    underpaintGradient:{light:"#60442f",shadow:"#100e12",
      focusX:.67,focusY:.83,radius:.95},
    underpaintTooth:.1,opaqueBurnish:.94,
    pressure:.99,spacing:4.2,markStrength:.41,outlineOpacity:0,
  },
  "pupil-near":{
    colors:["#191216","#0d090b","#352224"],
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",
    underpaintGradient:{light:"#2e2121",shadow:"#0a070a",
      focusX:.44,focusY:.68,radius:.75},
    underpaintTooth:.045,opaqueBurnish:1,
    pressure:1,spacing:4,markStrength:.36,outlineOpacity:0,
  },
  "upper-lid-near":{
    colors:["#9c7672","#66474b","#bd9186"],
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:6.8,
    pressure:.73,spacing:5.6,markStrength:.3,outlineOpacity:0,
  },
  "lash-root-near":{
    colors:["#403037","#171014","#795455"],
    coverage:"opaque",deposition:"stroke-built",nibStyle:"dry",
    underpaintGradient:{light:"#755254",shadow:"#180f13",
      focusX:.56,focusY:.61,radius:.89},
    underpaintTooth:.09,opaqueBurnish:.94,
    pressure:.94,spacing:4.5,markStrength:.29,outlineOpacity:0,
  },
  "lower-lid-near":{
    colors:["#916967","#573941","#b4877b"],
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:8.4,
    pressure:.78,spacing:6,markStrength:.37,outlineOpacity:0,
  },
  "lower-lid-margin-near":{
    colors:["#8f6763","#614146","#b88c82"],
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:7.1,
    pressure:.63,spacing:6.4,markStrength:.29,outlineOpacity:0,
  },
  "upper-lid-crease-near":{
    colors:["#a4817d","#68494e","#bb948e"],
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:6.5,
    pressure:.54,spacing:7.2,markStrength:.23,outlineOpacity:0,
  },
};

/** Only original native source wax; all other V35 details untouched.
 * Rendering order stays iris inside sclera BEFORE eyelid and lash skin.
 * Fail closed on duplicated/absent/malformed clipping or double apply.
 */
export function crayonF1BuildAnat1NearEyeAperture(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const shapes=crayonF1Anat1NearEyePaths();
  const found=new Set<string>();
  const out=elements.map(el=>{
    if(!Object.prototype.hasOwnProperty.call(shapes,el.id))return el;
    if(found.has(el.id)||el.kind!=="wax")
      throw new RangeError("Invalid photographic ANAT1 eye wax "+el.id);
    const id=el.id as Id;
    const parent=id==="iris-near"||id==="sclera-inner-contact-near"?"sclera-near":
      id==="pupil-near"?"iris-near":"face-outline";
    if(el.parentId!==parent||el.clipToParent!==true)
      throw new RangeError("Detached ANAT1 eye skin/cornea: "+id);
    if(el.d===shapes[id].d)
      throw new RangeError("ANAT1 near eye source plane already applied");
    found.add(id);
    return {...el,...wax[id],...shapes[id]};
  });
  if(found.size!==CRAYON_F1_V36_IDS.length)
    throw new RangeError("Missing original ANAT1 lower/upper lid contact");
  const index=(name:string)=>out.findIndex(x=>x.id===name);
  if(index("iris-near")<=index("sclera-near")||
    index("pupil-near")<=index("iris-near")||
    index("upper-lid-near")<=index("pupil-near")||
    index("lash-root-near")<=index("upper-lid-near"))
    throw new RangeError("The photographed iris must be overhung by skin");
  return out;
}
