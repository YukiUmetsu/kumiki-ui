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
  const rootD=
    "M-15 -138 C-51 -162 -77 -153 -87 -128 "+
    "C-105 -97 -117 -51 -120 9 C-132 86 -85 159 -23 174 "+
    "C31 189 102 145 117 71 C129 14 110 -51 76 -94 "+
    "C50 -127 15 -117 -15 -138 Z";
  const leafD=
    "M18 -175 C63 -234 127 -236 174 -208 "+
    "C152 -158 108 -138 49 -161 Q31 -167 18 -175 Z";
  const stemD="M-19 -140 Q-17 -159 0 -182 Q12 -189 21 -180 "+
    "Q4 -165 -5 -132 Z";
  // World-space paper impression and atmospheric ground. These intentionally
  // remain open wax: only physically solid focal subjects need full opacity.
  const root={x:width/2,y:height*(portrait?.68:.87)};
  const ground:CrayonWaxElement={
    kind:"wax",id:"paper-ground",d:
      "M"+(root.x-235)+" "+(root.y+3)+" Q"+root.x+" "+(root.y-37)+" "+
      (root.x+238)+" "+(root.y+9)+" Q"+root.x+" "+(root.y+62)+" "+
      (root.x-235)+" "+(root.y+3)+"Z",
    bounds:rect(root.x-250,root.y-52,500,135),
    colors:["#cfb18d","#aa8b85","#eee0bd"],
    timing:{start:1,end:80},coverage:"open",pressure:.36,spacing:17,
    nibStyle:"tapered",strokeOrder:"patches",markLength:"long",
    outlineOpacity:0,markStrength:.35,
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
    blendRadius:11,markStrength:.32,
  };
  elements.push(shadow);
  addWax("pear-body",rootD,rect(-138,-166,269,356),
    ["#d4aa5d","#8c8155","#e7c87a"],"blocking","solid",{start:9,end:89},{
      placement:place,underpaintGradient:{
        light:"#f0d58a",shadow:"#677756",focusX:.30,focusY:.27,radius:1.15},
      markStrength:.55,spacing:9.4,edgeRoughness:.29,
    },6);
  addWax("leaf-body",leafD,rect(8,-243,178,111),
    ["#6b925e","#345d4e","#b0b979"],"blocking","solid",{start:28,end:105},{
      parentId:"pear-body",underpaintGradient:{
        light:"#b6c68c",shadow:"#31564e",focusX:.35,focusY:.2,radius:1.1},
      markStrength:.62,spacing:6.2,edgeRoughness:.3,
    },3);
  addWax("stem-body",stemD,rect(-25,-192,52,70),
    ["#7a5846","#433e40","#b08566"],"blocking","solid",{start:32,end:113},{
      parentId:"pear-body",markStrength:.76,spacing:4.8,edgeRoughness:.32,
    },3);
  // The value range describes light turning into shadow, not arbitrary flecks.
  addWax("pear-turn-shadow",
    "M37 -119 C91 -106 113 -61 117 11 Q135 82 75 135 "+
    "Q30 169 10 165 C68 114 71 56 65 0 C60 -58 44 -91 37 -119 Z",
    rect(0,-128,143,311),
    ["#798357","#58715a","#adb274"],"value","glaze",{start:68,end:156},{
      parentId:"pear-body",clipToParent:true,blendRadius:10,
      pressure:pressure*.65,spacing:8.9,markStrength:.32,outlineOpacity:0,
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
  addWax("pear-blush",
    "M-110 -17 C-111 -82 -64 -115 -31 -91 C5 -63 -5 -11 -49 16 "+
    "Q-93 36 -110 -17 Z",
    rect(-118,-118,123,149),
    ["#cc855d","#a65d59","#e2a46c"],"colour","glaze",{start:124,end:185},{
      parentId:"pear-body",clipToParent:true,blendRadius:9,
      pressure:pressure*.6,spacing:6.8,markStrength:.51,outlineOpacity:0,
    },3);
  addWax("leaf-rim-light",
    "M31 -173 C64 -219 126 -226 166 -209 Q108 -213 62 -176 Z",
    rect(24,-240,149,79),
    ["#b4c38a","#81a271","#dbd9a2"],"colour","glaze",{start:136,end:191},{
      parentId:"leaf-body",clipToParent:true,blendRadius:3,
      pressure:pressure*.54,spacing:5.8,markStrength:.5,outlineOpacity:0,
    },2);
  const collect=(array:CrayonContourElement[],phase:CrayonDrawingPhase)=>{
    for(const n of array){elements.push(n);parts.push({nodeId:n.id,phase,role:"stroke",minCurves:1});}
  };
  // Directional grain is correlated to the studied skin curvature, never random
  // full-frame noise. All marks remain clipped to opaque fruit/leaf shapes.
  collect(crayonDirectionalStrokes({
    prefix:"pear-wax-turn",parentId:"pear-body",seed:391,count:Math.max(1,Math.round(38*detail)),
    guide:[{x:-80,y:-92},{x:-123,y:14},{x:-61,y:141},{x:35,y:156}],
    spread:48,length:19,width:1.24,pressure,color:"#aa8459",
    startFrame:164,endFrame:235,
  }),"detail");
  collect(crayonDirectionalStrokes({
    prefix:"pear-wax-shadow",parentId:"pear-body",seed:481,count:Math.max(1,Math.round(31*detail)),
    guide:[{x:66,y:-88},{x:97,y:-9},{x:109,y:86},{x:42,y:143}],
    spread:33,length:16,width:1.42,pressure,color:"#658064",
    startFrame:169,endFrame:235,
  }),"detail");
  collect(crayonDirectionalStrokes({
    prefix:"leaf-wax-veins",parentId:"leaf-body",seed:582,count:Math.max(1,Math.round(23*detail)),
    guide:[{x:28,y:-174},{x:75,y:-196},{x:129,y:-202},{x:165,y:-208}],
    spread:27,length:15,width:.82,pressure,color:"#c4ce9c",
    startFrame:172,endFrame:235,
  }),"detail");
  addLine("leaf-main-vein",
    "M23 -175 Q91 -188 165 -208 M68 -185 Q81 -207 97 -218 "+
    "M105 -195 Q118 -168 145 -166",
    "leaf-body","detail","#d1d5a0",1.38,{start:178,end:237},3);
  addLine("stem-fold",
    "M-14 -141 Q-13 -164 8 -183 M-6 -148 Q1 -172 13 -179",
    "stem-body","detail","#d3a77c",.95,{start:178,end:237},2);
  addLine("pear-calyx",
    "M-32 -140 Q-20 -146 -12 -138 M-20 -143 Q-20 -155 -12 -160 "+
    "M-16 -144 Q-7 -151 4 -151",
    "pear-body","detail","#746c50",1.35,{start:182,end:237},3);
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
