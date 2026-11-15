import type {CrayonColor,CrayonContourElement,CrayonSceneSpec,CrayonWaxElement} from "../../registry/video/materials/crayon-scene";
import type {CrayonNibStyle} from "../../registry/video/materials/crayon";
import {crayonDirectionalStrokes} from "../../registry/video/materials/crayon-art-direction";
import type {CrayonDrawingPlan,CrayonDrawingPhase,CrayonPartRule} from "../../registry/video/materials/crayon-art-direction";

export type CrayonDrawingAspect="landscape"|"portrait";
export interface CrayonDrawingSettings{
  aspect:CrayonDrawingAspect;detail:number;pressure:number;paperTooth:number;
  nibStyle?:CrayonNibStyle;
  underpaintTooth?:number;
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
  const {aspect,detail,pressure,paperTooth,nibStyle="dry",underpaintTooth=.82}=settings;
  if(!["landscape","portrait"].includes(aspect)||
    ![detail,pressure,paperTooth].every(Number.isFinite)||
    detail<.2||detail>1||pressure<.2||pressure>1||
    paperTooth<0||paperTooth>1||!["rounded","tapered","dry"].includes(nibStyle)||
    !Number.isFinite(underpaintTooth)||underpaintTooth<0||underpaintTooth>1)
    throw new RangeError("Invalid crayon drawing settings");
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
      pressure,spacing:7.4,nibStyle,strokeOrder:"patches",
      markLength:"long",edgeRoughness:.18,outlineOpacity:.035,
      ...overrides,
    };
    elements.push(n);parts.push({nodeId:id,phase,role,minCurves});
  };
  const addLine=(id:string,d:string,parentId:string,phase:CrayonDrawingPhase,
    color:CrayonColor,width:number,timing:{start:number;end:number},
    minCurves=1,opacity=.82)=>{
    const n:CrayonContourElement={kind:"contour",id,d,parentId,clipToParent:true,
      timing,color,width,opacity};
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
  // ArtCraft leaf study: the source leaf has an unequal shoulder, subtly
  // serrated margin, visible petiole insertion and lower-edge reversals.
  // A smooth symmetric green lens erases its botanical topology.
  const leafD=
    "M12 -183 C34 -207 60 -220 90 -228 "+
    "Q101 -232 110 -229 Q123 -232 133 -227 "+
    "Q143 -229 150 -224 Q158 -224 164 -216 "+
    "Q169 -214 176 -205 C165 -185 141 -164 116 -155 "+
    "Q108 -155 100 -157 Q91 -154 80 -157 "+
    "C69 -158 62 -160 56 -162 Q37 -170 12 -183 Z";
  const stemD=
    "M-21 -142 C-16 -157 -8 -173 2 -184 "+
    "Q12 -192 22 -183 Q12 -180 7 -172 "+
    "C-2 -158 -5 -146 -10 -132 Z";
  // World-space paper impression and atmospheric ground. These intentionally
  // remain open wax: only physically solid focal subjects need full opacity.
  // ArtCraft contact anchor: the pear's actual lower contour reaches local
  // y≈180 (not an aspect-dependent guessed ground line). Keep the cast shadow,
  // thin umbra and paper rubbing at the same world-space contact point.
  const root={x:place.x,y:place.y+180*place.scale};
  const ground:CrayonWaxElement={
    kind:"wax",id:"paper-ground",d:
      "M"+(root.x-163)+" "+(root.y+7)+" C"+(root.x-113)+" "+(root.y-17)+" "+
      (root.x+120)+" "+(root.y-19)+" "+(root.x+164)+" "+(root.y+4)+
      " C"+(root.x+123)+" "+(root.y+29)+" "+(root.x-111)+" "+(root.y+29)+" "+
      (root.x-163)+" "+(root.y+7)+"Z",
    bounds:rect(root.x-169,root.y-22,338,57),
    colors:["#dfc6a8","#c5afa2","#eee0c9"],
    timing:{start:1,end:80},coverage:"open",pressure:.23,spacing:19,
    nibStyle:"tapered",strokeOrder:"patches",markLength:"long",
    // An unfiltered open-wax fill reads as a vector ellipse at 1× and 3×.
    // Diffuse only the atmospheric rubbing; retain the sharp contact wedge.
    blendRadius:16,outlineOpacity:0,markStrength:.11,
  };
  elements.push(ground);
  const shadow:CrayonWaxElement={
    kind:"wax",id:"cast-shadow",d:
      // Asymmetric receding contact penumbra, not a hard symmetric oval.
      "M"+(root.x-123)+" "+(root.y-3)+" C"+(root.x-73)+" "+(root.y-27)+" "+
      (root.x+79)+" "+(root.y-22)+" "+(root.x+151)+" "+(root.y-2)+
      " C"+(root.x+171)+" "+(root.y+15)+" "+(root.x+39)+" "+(root.y+28)+" "+
      (root.x-27)+" "+(root.y+21)+" C"+(root.x-99)+" "+(root.y+16)+" "+
      (root.x-150)+" "+(root.y+8)+" "+(root.x-123)+" "+(root.y-3)+"Z",
    bounds:rect(root.x-130,root.y-42,300,85),
    colors:["#afa095","#918887","#cfbca5"],
    timing:{start:35,end:140},coverage:"open",pressure:.38,spacing:15,
    nibStyle:"tapered",strokeOrder:"patches",markLength:"long",outlineOpacity:0,
    blendRadius:18,markStrength:.15,
  };
  elements.push(shadow);
  // Deepest thin wedge is deliberately beneath the bottom-center contact
  // rather than an evenly blurred oval floating below the fruit.
  elements.push({
    kind:"wax",id:"fruit-contact-umbra",
    d:"M"+(root.x-52)+" "+(root.y+5)+" Q"+(root.x+4)+" "+(root.y-15)+" "+
      (root.x+68)+" "+(root.y+4)+" Q"+(root.x+20)+" "+(root.y+21)+" "+
      (root.x-52)+" "+(root.y+5)+"Z",
    bounds:rect(root.x-58,root.y-22,138,50),
    colors:["#80716b","#655f65","#ab9990"],
    timing:{start:94,end:165},coverage:"open",pressure:.54,spacing:8.8,
    nibStyle:"tapered",strokeOrder:"patches",markLength:"long",
    outlineOpacity:0,blendRadius:3,markStrength:.62,
  });
  addWax("pear-body",rootD,rect(-130,-166,260,356),
    ["#e5bc68","#b68b65","#f5d78d"],"blocking","solid",{start:9,end:89},{
      placement:place,underpaintGradient:{
        light:"#f6d991",shadow:"#756d6c",focusX:.23,focusY:.23,radius:1.3},
      markStrength:.23,spacing:7.7,edgeRoughness:.38,
      underpaintTooth,
    },6);
  addWax("leaf-body",leafD,rect(8,-243,178,111),
    ["#718c55","#3d624c","#b7be78"],"blocking","solid",{start:28,end:105},{
      parentId:"pear-body",underpaintGradient:{
        light:"#c7c887",shadow:"#2c5248",focusX:.3,focusY:.18,radius:1.1},
      markStrength:.32,spacing:6.1,edgeRoughness:.35,
      underpaintTooth:underpaintTooth*.76,
    },3);
  addWax("stem-body",stemD,rect(-25,-192,52,70),
    ["#7a5846","#433e40","#b08566"],"blocking","solid",{start:32,end:113},{
      parentId:"pear-body",markStrength:.5,spacing:4.8,edgeRoughness:.3,
      underpaintTooth:underpaintTooth*.54,
    },3);
  // The stalk sits in an indented, pigmented well with its own light falloff.
  // That depression is attached to pear flesh, never a free-floating brown disk.
  addWax("stalk-well",
    "M-42 -128 C-28 -149 -4 -153 13 -139 "+
    "Q21 -130 10 -123 Q-13 -118 -42 -128 Z",
    rect(-50,-157,77,45),
    ["#9e794e","#6d634c","#c59a64"],"value","glaze",
    {start:72,end:151},{
      parentId:"pear-body",clipToParent:true,blendRadius:3,
      pressure:pressure*.61,spacing:5.8,markStrength:.43,outlineOpacity:0,
    },2);
  // The value range describes light turning into shadow, not arbitrary flecks.
  addWax("pear-turn-shadow",
    "M37 -119 C91 -106 113 -61 117 11 Q135 82 75 135 "+
    "Q30 169 10 165 C68 114 71 56 65 0 C60 -58 44 -91 37 -119 Z",
    rect(0,-128,143,311),
    ["#757c65","#5d6670","#b9a16e"],"value","glaze",{start:68,end:156},{
      parentId:"pear-body",clipToParent:true,blendRadius:8,
      pressure:pressure*.66,spacing:8.1,markStrength:.36,outlineOpacity:0,
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
      parentId:"pear-body",clipToParent:true,blendRadius:6,
      pressure:pressure*.54,spacing:7.6,markStrength:.43,outlineOpacity:0,
    },3);
  addWax("pear-cool-turn",
    "M88 -42 C110 -7 116 45 103 94 "+
    "C96 121 75 144 51 157 C75 96 83 35 70 -3 "+
    "Q69 -26 88 -42 Z",
    rect(43,-53,83,222),
    ["#6c836c","#5b6875","#a1a275"],"value","glaze",
    {start:100,end:169},{
      parentId:"pear-body",clipToParent:true,blendRadius:6,
      pressure:pressure*.59,spacing:6.8,markStrength:.5,outlineOpacity:0,
    },4);
  addWax("leaf-fold-shadow",
    "M20 -174 Q105 -186 172 -208 C136 -155 83 -146 44 -163 Z",
    rect(16,-219,164,79),
    ["#4c7557","#345d50","#7d9770"],"value","glaze",{start:82,end:157},{
      parentId:"leaf-body",clipToParent:true,blendRadius:5,
      pressure:pressure*.7,spacing:6.3,outlineOpacity:0,
    },2);
  // Attached ridgeline: changing thickness follows the actual blade arch.
  // The petiole enters the leaf at a dark throat (not a detached dot).
  addWax("leaf-ridge-volume",
    "M16 -184 C45 -198 70 -212 105 -215 "+
    "Q140 -220 166 -209 C135 -206 102 -194 74 -185 "+
    "Q40 -177 16 -184 Z",
    rect(12,-224,165,51),
    ["#86a16c","#527e57","#c0c68b"],"value","glaze",
    {start:92,end:165},{
      parentId:"leaf-body",clipToParent:true,blendRadius:4,
      pressure:pressure*.63,spacing:5.7,markStrength:.26,
      outlineOpacity:0,
    },3);
  addWax("leaf-petiole-throat",
    "M12 -183 Q23 -192 36 -192 Q45 -187 47 -182 "+
    "Q32 -178 21 -175 Z",
    rect(9,-199,46,29),
    ["#426e52","#365744","#8c9a6d"],"value","glaze",
    {start:87,end:148},{
      parentId:"leaf-body",clipToParent:true,blendRadius:2.6,
      pressure:pressure*.55,spacing:5,markStrength:.34,
      outlineOpacity:0,
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
    "M-108 -15 C-110 -44 -99 -76 -78 -87 "+
    "Q-57 -105 -39 -87 C-34 -76 -18 -66 -26 -45 "+
    "Q-27 -31 -39 -21 C-45 -8 -63 8 -78 8 "+
    "C-93 10 -108 -2 -108 -15 Z",
    rect(-118,-116,107,134),
    ["#cc855d","#a65d59","#e2a46c"],"colour","glaze",{start:124,end:185},{
      parentId:"pear-body",clipToParent:true,blendRadius:3,
      pressure:pressure*.74,spacing:6.3,markStrength:.62,outlineOpacity:0,
    },3);
  // Two broken warm pigment pools make the blush feel overlaid in successive
  // dry-wax applications, not like one airbrushed peach circle.
  addWax("pear-blush-glimmer",
    "M-90 -40 Q-87 -68 -68 -75 C-53 -85 -40 -65 -42 -53 "+
    "C-36 -35 -54 -20 -70 -17 Q-89 -18 -90 -40 Z",
    rect(-100,-90,70,82),
    ["#df8e5d","#b76a57","#f1b97b"],"colour","glaze",
    {start:148,end:196},{
      parentId:"pear-body",clipToParent:true,blendRadius:3,
      pressure:pressure*.62,spacing:6.1,markStrength:.56,outlineOpacity:0,
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
    prefix:"pear-wax-turn",parentId:"pear-body",seed:391,count:Math.max(1,Math.round(27*detail)),
    guide:[{x:-72,y:-93},{x:-120,y:0},{x:-66,y:124},{x:31,y:159}],
    spread:34,length:15,width:1.02,pressure,color:"#aa805d",
    startFrame:164,endFrame:235,
  }),"detail");
  collect(crayonDirectionalStrokes({
    prefix:"pear-wax-shadow",parentId:"pear-body",seed:481,count:Math.max(1,Math.round(22*detail)),
    guide:[{x:58,y:-85},{x:94,y:-3},{x:111,y:74},{x:34,y:152}],
    spread:26,length:14,width:1.24,pressure,color:"#7b7c70",
    startFrame:169,endFrame:235,
  }),"detail");
  collect(crayonDirectionalStrokes({
    prefix:"leaf-wax-veins",parentId:"leaf-body",seed:582,count:Math.max(1,Math.round(16*detail)),
    guide:[{x:29,y:-176},{x:72,y:-203},{x:124,y:-211},{x:166,y:-207}],
    spread:20,length:13,width:.9,pressure,color:"#cad09d",
    startFrame:172,endFrame:235,
  }),"detail");
  // Sparse lenticels are distinct short stippled side-nib contacts, not
  // uniform noise or opaque printed circles.
  collect(crayonDirectionalStrokes({
    prefix:"pear-lenticels",parentId:"pear-body",seed:739,
    count:Math.max(1,Math.round(27*detail)),
    guide:[{x:-43,y:-81},{x:-96,y:-2},{x:-28,y:80},{x:43,y:117}],
    spread:74,length:2.8,width:.78,pressure:pressure*.82,
    color:"#a58f65",startFrame:190,endFrame:237,
  }),"detail");
  // Single curved midrib, offset shadow and independently branched veins.
  // Every secondary originates on that arc and terminates at its own margin;
  // repeated parallel hatching would not describe leaf lamina.
  addLine("leaf-main-vein",
    "M16 -183 C55 -194 110 -204 170 -208 "+
    "M36 -187 C42 -197 52 -209 57 -218 "+
    "M57 -193 C62 -205 73 -216 85 -226 "+
    "M82 -198 C91 -211 103 -221 115 -227 "+
    "M112 -203 C123 -213 134 -220 147 -222 "+
    "M42 -190 C47 -176 55 -167 65 -161 "+
    "M72 -196 C79 -179 89 -167 103 -157 "+
    "M101 -201 C112 -189 119 -171 128 -160 "+
    "M132 -205 C142 -197 150 -187 158 -180",
    "leaf-body","detail","#aebf92",.6,{start:178,end:237},9,.47);
  addLine("leaf-midrib-undertone",
    "M18 -183 C62 -196 113 -205 170 -209",
    "leaf-body","detail","#45694a",1.05,{start:174,end:234},1,.74);
  // The underside of select vein junctions stays low-chroma and broken.
  // This is local lamina structure, not a noisy texture overlay.
  addLine("leaf-secondary-vein-shade",
    "M57 -193 C63 -207 73 -218 85 -226 "+
    "M81 -198 Q87 -176 101 -160 "+
    "M112 -203 Q129 -207 145 -219 "+
    "M130 -204 Q146 -189 154 -182",
    "leaf-body","detail","#3a664d",.66,{start:185,end:237},4,.45);
  addLine("stem-fold",
    "M-16 -141 Q-11 -166 7 -184 M-4 -149 Q2 -169 12 -180",
    "stem-body","detail","#d8ab7d",.75,{start:178,end:237},2,.68);
  addLine("pear-calyx",
    "M-24 -132 Q-21 -136 -19 -139 "+
    "M-10 -140 Q-6 -143 -2 -139 "+
    "M5 -132 Q8 -130 12 -129",
    "pear-body","detail","#88714f",.75,{start:182,end:237},3,.69);
  // Separate fields cross the broad side-nib underpainting at irregular
  // angles. They are intentionally low-opacity physical wax, not sprayed
  // texture or a high-contrast grid of digital dashes.
  collect(crayonDirectionalStrokes({
    prefix:"pear-chromatic-scumble",parentId:"pear-body",seed:851,
    count:Math.max(1,Math.round(18*detail)),
    guide:[{x:-38,y:-116},{x:-43,y:-3},{x:6,y:85},{x:72,y:135}],
    spread:79,length:10,width:1.05,pressure:pressure*.71,
    color:"#cd956a",startFrame:185,endFrame:237,
  }).map(n=>({...n,opacity:.38})),"detail");
  collect(crayonDirectionalStrokes({
    prefix:"pear-blush-broken-wax",parentId:"pear-body",seed:659,
    count:Math.max(1,Math.round(17*detail)),
    guide:[{x:-91,y:-61},{x:-79,y:-37},{x:-52,y:-25},{x:-37,y:2}],
    spread:39,length:7,width:1.3,pressure:pressure*.82,
    color:"#a96d5e",startFrame:186,endFrame:236,
  }).map(n=>({...n,opacity:.42})),"detail");
  collect(crayonDirectionalStrokes({
    prefix:"leaf-second-pass",parentId:"leaf-body",seed:604,
    count:Math.max(1,Math.round(18*detail)),
    guide:[{x:22,y:-183},{x:61,y:-174},{x:108,y:-157},{x:163,y:-204}],
    spread:17,length:8,width:.74,pressure:pressure*.72,
    color:"#91a574",startFrame:188,endFrame:237,
  }).map(n=>({...n,opacity:.46})),"detail");
  // Finer low-opacity side-nib contacts accumulate uneven wax inside the
  // existing anatomy, replacing the exaggerated generic broad rubbing.
  collect(crayonDirectionalStrokes({
    prefix:"pear-light-binder",parentId:"pear-body",seed:1147,
    count:Math.max(1,Math.round(38*detail)),
    guide:[{x:-37,y:-103},{x:-73,y:-23},{x:-15,y:87},{x:46,y:152}],
    spread:52,length:6.7,width:.91,pressure:pressure*.69,
    color:"#f2cf88",startFrame:190,endFrame:238,
  }).map(n=>({...n,opacity:.38})),"detail");
  collect(crayonDirectionalStrokes({
    prefix:"pear-cool-binder",parentId:"pear-body",seed:1207,
    count:Math.max(1,Math.round(30*detail)),
    guide:[{x:68,y:-75},{x:88,y:-4},{x:97,y:92},{x:26,y:147}],
    spread:30,length:6.1,width:.87,pressure:pressure*.66,
    color:"#ada39a",startFrame:191,endFrame:238,
  }).map(n=>({...n,opacity:.42})),"detail");
  addLine("pear-bottom-fold",
    "M-30 165 Q-6 171 14 168 M-18 160 Q0 156 11 159",
    "pear-body","detail","#b48b56",.83,{start:181,end:236},2);
  const scene:CrayonSceneSpec={version:1,id:"crayon-botanical-drawing-"+aspect,
    width,height,durationFrames:240,seed:3651,paper:"#f9edda",paperTooth,
    elements,camera:[{frame:0,focusX:width/2,focusY:height/2,zoom:1},
      {frame:239,focusX:width/2,focusY:height/2,zoom:1}]};
  const plan:CrayonDrawingPlan={
    version:1,sceneId:scene.id,phases,
    ambientIds:["paper-ground","cast-shadow","fruit-contact-umbra"],
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
