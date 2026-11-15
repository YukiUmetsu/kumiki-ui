import type {CrayonColor,CrayonContourElement,CrayonSceneSpec,CrayonWaxElement} from "../../registry/video/materials/crayon-scene";
import {crayonDirectionalStrokes} from "../../registry/video/materials/crayon-art-direction";
import type {CrayonDrawingPlan,CrayonDrawingPhase,CrayonPartRule} from "../../registry/video/materials/crayon-art-direction";

export type CrayonDrawingAspect="landscape"|"portrait";
export interface CrayonDrawingSettings{
  aspect:CrayonDrawingAspect;detail:number;pressure:number;paperTooth:number;
}
type Palette=readonly [CrayonColor,CrayonColor,CrayonColor];
const phases={
  blocking:{start:1,end:54},
  value:{start:55,end:104},
  colour:{start:105,end:159},
  detail:{start:160,end:238},
} as const;
const rect=(x:number,y:number,width:number,height:number)=>({x,y,width,height});

/**
 * Original botanical still-life built from studied drawing principles.
 * This is an honest technical construction study, NOT an approved masterwork.
 * Each stroked part has a declared purpose and anatomical parent.
 */
export function crayonBotanicalDrawing(settings:CrayonDrawingSettings):{
  scene:CrayonSceneSpec;plan:CrayonDrawingPlan;
}{
  const {aspect,detail,pressure,paperTooth}=settings;
  if(!["landscape","portrait"].includes(aspect)||
    ![detail,pressure,paperTooth].every(Number.isFinite)||
    detail<.2||detail>1||pressure<.2||pressure>1||
    paperTooth<0||paperTooth>1)throw new RangeError("Invalid crayon drawing settings");
  const portrait=aspect==="portrait",width=portrait?540:960,height=portrait?960:540;
  const elements:CrayonSceneSpec["elements"][number][]=[];
  const parts:CrayonPartRule[]=[];
  const addWax=(id:string,d:string,bounds:ReturnType<typeof rect>,colors:Palette,
    phase:CrayonDrawingPhase,role:"solid"|"glaze",
    timing:{start:number;end:number},overrides:Partial<CrayonWaxElement>={},
    minCurves=0)=>{
    const n:CrayonWaxElement={
      kind:"wax",id,d,bounds,colors,timing,
      coverage:role==="solid"?"opaque":"open",
      pressure,spacing:7.4,nibStyle:"tapered",strokeOrder:"patches",
      markLength:"long",edgeRoughness:.18,outlineOpacity:.035,
      ...overrides,
    };
    elements.push(n);parts.push({nodeId:id,phase,role,minCurves});
  };
  const addLine=(id:string,d:string,parentId:string,phase:CrayonDrawingPhase,
    color:CrayonColor,width:number,timing:{start:number;end:number},
    minCurves=1)=>{
    const n:CrayonContourElement={kind:"contour",id,d,parentId,clipToParent:true,
      timing,color,width,opacity:.82};
    elements.push(n);parts.push({nodeId:id,phase,role:"stroke",minCurves});
  };
  const place={x:width/2,y:height*(portrait?.44:.54),scale:portrait?1.25:1.07};
  // The left shoulder is broad, the right shoulder is high and narrower;
  // subtly flattened blossom-end makes the fruit a studied pear, not a teardrop.
  // Independent cubic tangents prevent symmetry and a computer-perfect ellipse.
  const rootD=
    "M-15 -140 C-31 -147 -46 -132 -54 -113 "+
    "C-59 -91 -72 -69 -84 -46 C-105 -12 -114 38 -109 78 "+
    "C-102 124 -75 156 -39 168 C-14 181 7 181 28 173 "+
    "C71 161 101 123 111 75 C120 37 110 -6 86 -48 "+
    "C67 -79 54 -99 41 -118 C27 -136 10 -140 -15 -140 Z";
  const leafD=
    "M19 -176 C49 -214 78 -231 104 -230 "+
    "C126 -231 139 -227 146 -221 Q158 -218 167 -213 "+
    "L176 -205 C151 -171 113 -147 84 -151 "+
    "C57 -153 35 -163 19 -176 Z";
  const stemD=
    "M-21 -142 C-16 -157 -8 -173 2 -184 "+
    "Q12 -192 22 -183 Q12 -180 7 -172 "+
    "C-2 -158 -5 -146 -10 -132 Z";
  // World-space paper impression and atmospheric ground. These intentionally
  // remain open wax: only physically solid focal subjects need full opacity.
  const root={x:width/2,y:height*(portrait?.68:.87)};
  const ground:CrayonWaxElement={
    kind:"wax",id:"paper-ground",d:
      "M"+(root.x-163)+" "+(root.y+7)+" C"+(root.x-113)+" "+(root.y-17)+" "+
      (root.x+120)+" "+(root.y-19)+" "+(root.x+164)+" "+(root.y+4)+
      " C"+(root.x+123)+" "+(root.y+29)+" "+(root.x-111)+" "+(root.y+29)+" "+
      (root.x-163)+" "+(root.y+7)+"Z",
    bounds:rect(root.x-169,root.y-22,338,57),
    colors:["#cfb18d","#aa8b85","#eee0bd"],
    timing:{start:1,end:80},coverage:"open",pressure:.36,spacing:17,
    nibStyle:"tapered",strokeOrder:"patches",markLength:"long",
    outlineOpacity:0,markStrength:.20,
  };
  elements.push(ground);
  const shadow:CrayonWaxElement={
    kind:"wax",id:"cast-shadow",d:
      "M"+(root.x-123)+" "+(root.y-3)+" C"+(root.x-86)+" "+(root.y-37)+" "+
      (root.x+125)+" "+(root.y-37)+" "+(root.x+167)+" "+(root.y-4)+
      " C"+(root.x+165)+" "+(root.y+35)+" "+(root.x-83)+" "+(root.y+29)+" "+
      (root.x-123)+" "+(root.y-3)+"Z",
    bounds:rect(root.x-130,root.y-42,300,85),
    colors:["#a18e88","#827b83","#c0a998"],
    timing:{start:35,end:140},coverage:"open",pressure:.48,spacing:13,
    nibStyle:"tapered",strokeOrder:"patches",markLength:"long",outlineOpacity:0,
    blendRadius:11,markStrength:.23,
  };
  elements.push(shadow);
  addWax("pear-body",rootD,rect(-130,-166,260,356),
    ["#e0b65f","#ad9365","#f3d38b"],"blocking","solid",{start:9,end:89},{
      placement:place,underpaintGradient:{
        light:"#f5d987",shadow:"#736c66",focusX:.25,focusY:.19,radius:1.36},
      markStrength:.26,spacing:8.5,edgeRoughness:.3,
    },6);
  addWax("leaf-body",leafD,rect(8,-243,178,111),
    ["#718c55","#3d624c","#b7be78"],"blocking","solid",{start:28,end:105},{
      parentId:"pear-body",underpaintGradient:{
        light:"#c7c887",shadow:"#2c5248",focusX:.3,focusY:.18,radius:1.1},
      markStrength:.36,spacing:6.2,edgeRoughness:.31,
    },3);
  addWax("stem-body",stemD,rect(-25,-192,52,70),
    ["#7a5846","#433e40","#b08566"],"blocking","solid",{start:32,end:113},{
      parentId:"pear-body",markStrength:.5,spacing:4.8,edgeRoughness:.3,
    },3);
  // The stalk sits in an indented, pigmented well with its own light falloff.
  // That depression is attached to pear flesh, never a free-floating brown disk.
  addWax("stalk-well",
    "M-42 -128 C-28 -149 -4 -153 13 -139 "+
    "Q21 -130 10 -123 Q-13 -118 -42 -128 Z",
    rect(-50,-157,77,45),
    ["#9e794e","#6d634c","#c59a64"],"value","glaze",
    {start:72,end:151},{
      parentId:"pear-body",clipToParent:true,blendRadius:5,
      pressure:pressure*.48,spacing:6.2,markStrength:.31,outlineOpacity:0,
    },2);
  // The value range describes light turning into shadow, not arbitrary flecks.
  addWax("pear-turn-shadow",
    "M37 -119 C91 -106 113 -61 117 11 Q135 82 75 135 "+
    "Q30 169 10 165 C68 114 71 56 65 0 C60 -58 44 -91 37 -119 Z",
    rect(0,-128,143,311),
    ["#757c65","#5d6670","#b9a16e"],"value","glaze",{start:68,end:156},{
      parentId:"pear-body",clipToParent:true,blendRadius:10,
      pressure:pressure*.65,spacing:8.9,markStrength:.26,outlineOpacity:0,
    },4);
  // Cool reflected light turns beneath the lower pear; reserve the brightest
  // yellows for the upper illuminated shoulder. The wax is still translucent
  // pigment on top of a fully occluding fruit body.
  addWax("pear-belly-umbra",
    "M-79 112 C-58 154 -14 178 28 173 "+
    "C68 166 86 145 95 112 Q58 143 26 146 "+
    "Q-21 160 -79 112 Z",
    rect(-90,102,194,84),
    ["#9d8273","#6c6371","#c8a06f"],"value","glaze",
    {start:93,end:168},{
      parentId:"pear-body",clipToParent:true,blendRadius:9,
      pressure:pressure*.44,spacing:8.2,markStrength:.26,outlineOpacity:0,
    },3);
  addWax("pear-cool-turn",
    "M88 -42 C110 -7 116 45 103 94 "+
    "C96 121 75 144 51 157 C75 96 83 35 70 -3 "+
    "Q69 -26 88 -42 Z",
    rect(43,-53,83,222),
    ["#6c836c","#5b6875","#a1a275"],"value","glaze",
    {start:100,end:169},{
      parentId:"pear-body",clipToParent:true,blendRadius:8,
      pressure:pressure*.45,spacing:7.8,markStrength:.3,outlineOpacity:0,
    },4);
  addWax("leaf-fold-shadow",
    "M20 -174 Q105 -186 172 -208 C136 -155 83 -146 44 -163 Z",
    rect(16,-219,164,79),
    ["#4c7557","#345d50","#7d9770"],"value","glaze",{start:82,end:157},{
      parentId:"leaf-body",clipToParent:true,blendRadius:5,
      pressure:pressure*.7,spacing:6.3,outlineOpacity:0,
    },2);
  addWax("pear-sunshine",
    "M-73 -105 Q-117 -30 -106 33 Q-92 111 -44 138 "+
    "Q-85 55 -55 -43 Q-39 -91 -73 -105 Z",
    rect(-117,-115,93,261),
    ["#efcb76","#dcb269","#f6dc95"],"colour","glaze",{start:110,end:177},{
      parentId:"pear-body",clipToParent:true,blendRadius:10,
      pressure:pressure*.53,spacing:9,markStrength:.35,outlineOpacity:0,
    },3);
  // A narrow raking highlight follows the changing left shoulder;
  // it never becomes an unmotivated elliptical white sticker.
  addWax("pear-raking-light",
    "M-61 -105 C-78 -60 -99 -14 -97 32 "+
    "Q-100 76 -83 105 C-91 42 -72 -28 -45 -94 Z",
    rect(-112,-115,76,232),
    ["#f7da91","#e8c67f","#ffebb0"],"colour","glaze",
    {start:115,end:188},{
      parentId:"pear-body",clipToParent:true,blendRadius:6,
      pressure:pressure*.46,spacing:7.7,markStrength:.4,outlineOpacity:0,
    },3);
  addWax("pear-blush",
    "M-110 -17 C-111 -82 -64 -115 -31 -91 C5 -63 -5 -11 -49 16 "+
    "Q-93 36 -110 -17 Z",
    rect(-118,-118,123,149),
    ["#cc855d","#a65d59","#e2a46c"],"colour","glaze",{start:124,end:185},{
      parentId:"pear-body",clipToParent:true,blendRadius:9,
      pressure:pressure*.6,spacing:6.8,markStrength:.32,outlineOpacity:0,
    },3);
  // Two broken warm pigment pools make the blush feel overlaid in successive
  // dry-wax applications, not like one airbrushed peach circle.
  addWax("pear-blush-glimmer",
    "M-87 -52 Q-80 -83 -57 -84 C-45 -80 -35 -69 -34 -52 "+
    "C-43 -34 -66 -16 -84 -21 Q-92 -36 -87 -52 Z",
    rect(-99,-93,74,87),
    ["#df8e5d","#b76a57","#f1b97b"],"colour","glaze",
    {start:148,end:196},{
      parentId:"pear-body",clipToParent:true,blendRadius:5,
      pressure:pressure*.48,spacing:6.8,markStrength:.36,outlineOpacity:0,
    },3);
  addWax("leaf-rim-light",
    "M31 -173 C64 -219 126 -226 166 -209 Q108 -213 62 -176 Z",
    rect(24,-240,149,79),
    ["#b4c38a","#81a271","#dbd9a2"],"colour","glaze",{start:136,end:191},{
      parentId:"leaf-body",clipToParent:true,blendRadius:3,
      pressure:pressure*.54,spacing:5.8,markStrength:.5,outlineOpacity:0,
    },2);
  // Broad luminous planes remain in wax, not printed gradients. Small glints
  // can be carved from an existing color layer without changing its contour.
  addWax("pear-reflected-glow",
    "M5 142 Q35 142 51 126 Q35 157 6 160 Z",
    rect(-1,119,58,51),
    ["#efca85","#d8a671","#fae0a1"],"colour","glaze",
    {start:151,end:193},{
      parentId:"pear-body",clipToParent:true,blendRadius:5,
      pressure:pressure*.42,spacing:6.5,markStrength:.22,outlineOpacity:0,
    },2);
  const collect=(array:CrayonContourElement[],phase:CrayonDrawingPhase)=>{
    for(const n of array){elements.push(n);parts.push({nodeId:n.id,phase,role:"stroke",minCurves:1});}
  };
  // Directional grain is correlated to the studied skin curvature, never random
  // full-frame noise. All marks remain clipped to opaque fruit/leaf shapes.
  collect(crayonDirectionalStrokes({
    prefix:"pear-wax-turn",parentId:"pear-body",seed:391,count:Math.max(1,Math.round(47*detail)),
    guide:[{x:-72,y:-93},{x:-120,y:0},{x:-66,y:124},{x:31,y:159}],
    spread:34,length:15,width:1.02,pressure,color:"#aa805d",
    startFrame:164,endFrame:235,
  }),"detail");
  collect(crayonDirectionalStrokes({
    prefix:"pear-wax-shadow",parentId:"pear-body",seed:481,count:Math.max(1,Math.round(42*detail)),
    guide:[{x:58,y:-85},{x:94,y:-3},{x:111,y:74},{x:34,y:152}],
    spread:26,length:14,width:1.24,pressure,color:"#7b7c70",
    startFrame:169,endFrame:235,
  }),"detail");
  collect(crayonDirectionalStrokes({
    prefix:"leaf-wax-veins",parentId:"leaf-body",seed:582,count:Math.max(1,Math.round(25*detail)),
    guide:[{x:29,y:-176},{x:72,y:-203},{x:124,y:-211},{x:166,y:-207}],
    spread:20,length:13,width:.9,pressure,color:"#cad09d",
    startFrame:172,endFrame:235,
  }),"detail");
  // Sparse lenticels are distinct short stippled side-nib contacts, not
  // uniform noise or opaque printed circles.
  collect(crayonDirectionalStrokes({
    prefix:"pear-lenticels",parentId:"pear-body",seed:739,
    count:Math.max(1,Math.round(19*detail)),
    guide:[{x:-43,y:-81},{x:-96,y:-2},{x:-28,y:80},{x:43,y:117}],
    spread:77,length:3.7,width:.74,pressure:pressure*.79,
    color:"#a58f65",startFrame:190,endFrame:237,
  }),"detail");
  addLine("leaf-main-vein",
    "M24 -176 C62 -192 105 -201 168 -208 "+
    "M48 -184 Q65 -207 84 -219 "+
    "M79 -192 Q98 -168 115 -163 "+
    "M105 -199 Q123 -220 141 -220 "+
    "M129 -203 Q147 -190 157 -182",
    "leaf-body","detail","#d1d5a0",1.22,{start:178,end:237},5);
  addLine("stem-fold",
    "M-14 -141 Q-13 -164 8 -183 M-6 -148 Q1 -172 13 -179",
    "stem-body","detail","#d3a77c",.95,{start:178,end:237},2);
  addLine("pear-calyx",
    "M-35 -131 Q-25 -141 -14 -137 "+
    "M-18 -142 Q-12 -150 -3 -146 "+
    "M-10 -137 Q0 -139 7 -133",
    "pear-body","detail","#726454",1.28,{start:182,end:237},3);
  addLine("pear-bottom-fold",
    "M-30 165 Q-6 171 14 168 M-18 160 Q0 156 11 159",
    "pear-body","detail","#b48b56",.83,{start:181,end:236},2);
  const scene:CrayonSceneSpec={version:1,id:"crayon-botanical-drawing-"+aspect,
    width,height,durationFrames:240,seed:3651,paper:"#f9edda",paperTooth,
    elements,camera:[{frame:0,focusX:width/2,focusY:height/2,zoom:1},
      {frame:239,focusX:width/2,focusY:height/2,zoom:1}]};
  const plan:CrayonDrawingPlan={
    version:1,sceneId:scene.id,phases,
    ambientIds:["paper-ground","cast-shadow"],
    subjects:[{id:"botanical-subject",kind:"botanical",rootId:"pear-body",
      parts,attachments:[
        {from:{nodeId:"pear-body",point:{x:-17,y:-139}},
          to:{nodeId:"stem-body",point:{x:-17,y:-141}},tolerance:8},
        {from:{nodeId:"stem-body",point:{x:18,y:-181}},
          to:{nodeId:"leaf-body",point:{x:18,y:-175}},tolerance:12},
      ]}],
  };
  return {scene,plan};
}
