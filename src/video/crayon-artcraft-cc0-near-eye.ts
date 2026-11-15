import type {CrayonColor,CrayonElement,CrayonSceneSpec} from "../../registry/video/materials/crayon-scene";
import {crayonFurFlow,crayonIrisFlecks} from "./crayon-editorial-character-craft";

/**
 * Isolated, experimental native-wax construction from an observed CC0 eye crop.
 * Christopher Campbell (2015): https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg
 * The 608x1082 Chromium source capture shows an asymmetric eyebrow, shaded
 * upper globe, round dark iris, narrower lower lid and rooted lashes.
 * Reference eye crop: source x160..370, y430..630. The 210x200 coordinates
 * below are manually interpreted photo-space shapes, not SVG eye templates.
 * Never silently transplant this person's eye onto the unrelated #281 bust.
 */
export function crayonCc0NearEyeStudy(aspect:"landscape"|"portrait",detail=1):CrayonSceneSpec {
  if(!["landscape","portrait"].includes(aspect)||!Number.isFinite(detail)||
    detail<.2||detail>1)throw new RangeError("Invalid ArtCraft eye-study controls");
  const portrait=aspect==="portrait",width=portrait?540:960,height=portrait?960:540;
  const elements:CrayonElement[]=[];
  type Wax=Extract<CrayonElement,{kind:"wax"}>;
  type Ink=Extract<CrayonElement,{kind:"contour"}>;
  const rect=(x:number,y:number,w:number,h:number)=>({x,y,width:w,height:h});
  const palettes={
    skin:["#e5baa6","#be9a8d","#f6d2bd"],
    light:["#f1c6b4","#cb988a","#ffe0c4"],
    shadow:["#ba8e91","#865e65","#dcb1a4"],
    socket:["#ac8182","#705962","#c9a0a0"],
    eyelid:["#d1a3a0","#9c777d","#f1c9b4"],
    sclera:["#d8cbc3","#aaaeb0","#f1e4d7"],
    iris:["#806451","#403b37","#b69374"],
    pupil:["#312b2d","#181c22","#4a383b"],
    brow:["#7e4c45","#4e3338","#a77b6b"],
    ochre:["#b08374","#704c4d","#d5ac96"],
    tear:["#aa6d70","#815a65","#d4a5a0"],
  } as const satisfies Record<string,readonly [CrayonColor,CrayonColor,CrayonColor]>;
  const wax=(id:string,d:string,bounds:ReturnType<typeof rect>,
    colors:readonly [CrayonColor,CrayonColor,CrayonColor],
    timing:[number,number],overrides:Partial<Wax>={})=>{
    elements.push({kind:"wax",id,d,bounds,colors,
      timing:{start:timing[0],end:timing[1]},coverage:"opaque",
      pressure:.82,spacing:5.8,nibStyle:"dry",strokeOrder:"patches",
      markLength:"short",edgeRoughness:.19,outlineOpacity:.03,...overrides});
  };
  const line=(id:string,d:string,color:CrayonColor,w:number,timing:[number,number],
    parentId="eye-skin",opacity=.7)=>{
    const item:Ink={kind:"contour",id,d,color,width:w,parentId,
      clipToParent:true,opacity,timing:{start:timing[0],end:timing[1]}};
    elements.push(item);
  };
  const place=portrait?{x:11,y:223,scale:2.47}:{x:214,y:17,scale:2.52};

  // Source crop is full-bleed. The prior 210x200 wax sticker had a hard
  // edge; extend its opaque support outside both camera aspect frames.
  wax("eye-skin",
    "M-125 -115 C-37 -123 113 -123 316 -113"+
    "C323 -9 322 112 316 214 Q313 276 308 328"+
    "C187 330 12 333 -126 326 C-134 157 -136 -22 -125 -115Z",
    rect(-140,-129,467,467),palettes.skin,[1,76],{
      placement:place,underpaintGradient:{light:"#f6d8c2",shadow:"#9b7879",
        focusX:.27,focusY:.20,radius:1.35},underpaintTooth:.79,
      markStrength:.11,spacing:15.2,outlineOpacity:0});
  // The brow and eye do not share a smooth cartoon capsule. Each root and
  // local value plane is an individually connected wax silhouette.
  wax("upper-orbital-turn",
    "M36 119 C47 93 58 78 79 70 C115 61 150 75 172 96"+
    "C160 85 130 87 108 91 C82 92 61 115 45 145Z",
    rect(34,58,143,91),palettes.shadow,[45,133],{
      parentId:"eye-skin",clipToParent:true,coverage:"open",
      blendRadius:9.5,markStrength:.41,pressure:.59,outlineOpacity:0});
  wax("eye-socket-umbra",
    "M53 122 C67 94 100 90 131 94 C156 98 172 110 178 123"+
    "Q157 153 124 158 C83 160 58 147 53 122Z",
    rect(50,87,131,76),palettes.socket,[61,154],{
      parentId:"eye-skin",clipToParent:true,coverage:"open",
      blendRadius:9,markStrength:.36,pressure:.57,outlineOpacity:0});
  wax("lower-orbital-hollow",
    "M62 140 C78 159 104 165 127 159 Q163 152 176 128"+
    "Q167 168 142 180 C100 186 76 178 62 140Z",
    rect(59,126,121,61),palettes.shadow,[77,170],{
      parentId:"eye-skin",clipToParent:true,coverage:"open",
      blendRadius:10,pressure:.52,markStrength:.39,outlineOpacity:0});
  wax("cheek-light-turn",
    "M11 144 C32 129 53 136 71 154 Q96 178 142 181"+
    "C106 194 46 194 4 181Z",
    rect(0,127,148,68),palettes.light,[96,167],{
      parentId:"eye-skin",clipToParent:true,coverage:"open",
      blendRadius:10,pressure:.43,markStrength:.26,outlineOpacity:0});

  // The source brow is fine follicular pigment over opaque skin, not a
  // solid single-piece vector decal.
  wax("brow-root",
    "M22 91 C48 65 70 49 104 42 C121 40 148 46 162 62"+
    "C146 57 129 57 105 54 C75 58 52 72 22 91Z",
    rect(15,35,154,63),palettes.brow,[70,164],{
      parentId:"eye-skin",clipToParent:true,coverage:"open",
      blendRadius:3,spacing:6.4,pressure:.53,markStrength:.28,outlineOpacity:0});
  wax("brow-pigment-turn",
    "M26 84 C47 69 75 56 105 50 C130 48 152 53 165 65"+
    "Q135 57 109 62 C79 65 54 77 26 84Z",
    rect(23,45,146,46),palettes.ochre,[121,191],{
      parentId:"brow-root",clipToParent:true,coverage:"open",
      blendRadius:3,markStrength:.42,pressure:.61,outlineOpacity:0});
  wax("eye-sclera",
    "M63 122 C73 108 91 105 112 105 C133 105 155 112 168 116"+
    "C154 128 139 137 117 141 C96 146 79 138 63 122Z",
    rect(59,102,114,47),palettes.sclera,[105,202],{
      parentId:"eye-skin",spacing:4.4,markStrength:.23,
      underpaintGradient:{light:"#eeebe1",shadow:"#7f8990",
        focusX:.75,focusY:.3,radius:1},outlineOpacity:0});
  wax("upper-sclera-occlusion",
    "M63 122 C81 107 98 102 119 104 Q147 106 168 116"+
    "Q148 116 131 114 C109 112 80 115 63 122Z",
    rect(60,100,112,27),palettes.socket,[125,203],{
      parentId:"eye-sclera",clipToParent:true,coverage:"open",
      blendRadius:3,pressure:.55,markStrength:.3,outlineOpacity:0});
  wax("eye-iris",
    "M79 109 C84 101 94 103 103 104 C116 105 124 116 123 126"+
    "C120 138 110 144 98 139 C85 134 76 121 79 109Z",
    rect(76,100,51,47),palettes.iris,[125,220],{
      parentId:"eye-sclera",clipToParent:true,spacing:4.2,markStrength:.45,pressure:.86,
      underpaintGradient:{light:"#8d7260",shadow:"#312b2e",
        focusX:.8,focusY:.68,radius:.9},outlineOpacity:.08});
  wax("eye-pupil",
    "M90 110 C94 106 99 106 103 109 C110 111 111 118 109 123"+
    "Q106 129 100 129 C92 127 89 120 90 110Z",
    rect(88,104,25,27),palettes.pupil,[157,231],{
      parentId:"eye-iris",clipToParent:true,spacing:4.2,markStrength:.38,pressure:.96,outlineOpacity:0});
  const irisFlecks=crayonIrisFlecks({seed:1407,cx:100,cy:120,
    rx:20,ry:20,count:Math.round(18*detail),minRadius:.46,maxRadius:.91});
  if(irisFlecks)line("iris-dark-radials",irisFlecks,"#493f36",.37,[171,271],"eye-iris",.49);
  wax("sclera-reflection",
    "M131 111 Q151 107 162 115 Q153 123 135 130Z",
    rect(128,106,38,27),palettes.sclera,[172,246],{
      parentId:"eye-sclera",clipToParent:true,coverage:"open",
      blendRadius:4,pressure:.4,markStrength:.24,outlineOpacity:0});
  wax("tear-duct",
    "M164 116 Q168 113 174 117 Q170 123 165 123 Q162 120 164 116Z",
    rect(160,111,17,16),palettes.tear,[174,253],{
      parentId:"eye-skin",pressure:.67,markStrength:.4,spacing:4.2,outlineOpacity:0});
  // Source contact: the upper lid covers the top of the iris, rather
  // than merely outlining the full exposed eye.
  wax("upper-lid-overhang",
    "M62 123 C75 107 96 100 116 102 C140 104 156 107 169 115"+
    "Q154 113 136 113 C119 108 98 109 79 117 Q69 120 62 123Z",
    rect(59,99,114,28),palettes.eyelid,[168,249],{
      parentId:"eye-skin",spacing:5.3,markStrength:.37,pressure:.81,
      underpaintGradient:{light:"#c49c97",shadow:"#745258",
        focusX:.42,focusY:.13,radius:1.05},outlineOpacity:0});
  // Dense, attached lash-root underplane: overlies the iris at the
  // upper edge without drawing a detached black eyelash decal.
  wax("upper-lash-root-shadow",
    "M63 123 C81 109 99 105 118 106 C138 108 154 110 169 116"+
    "Q147 117 129 116 C110 113 87 118 74 126Z",
    rect(61,103,111,27),
    ["#63474a","#45353a","#947375"],[192,263],{
      parentId:"eye-skin",clipToParent:true,coverage:"open",
      spacing:4.6,pressure:.63,markStrength:.37,
      blendRadius:1.7,outlineOpacity:0});
  wax("lower-lid-flesh",
    "M66 123 C88 139 103 143 119 140 C140 139 157 128 167 117"+
    "C156 143 137 153 118 154 C94 156 73 146 66 123Z",
    rect(62,115,110,43),palettes.eyelid,[174,262],{
      parentId:"eye-skin",spacing:5.3,markStrength:.27,pressure:.63,outlineOpacity:0});
  wax("lower-lid-groove",
    "M72 135 C88 149 106 153 122 151 Q146 148 163 130"+
    "Q145 167 115 167 C92 166 75 155 72 135Z",
    rect(70,129,97,43),palettes.socket,[184,267],{
      parentId:"eye-skin",clipToParent:true,coverage:"open",
      blendRadius:4,pressure:.58,markStrength:.34,outlineOpacity:0});
  line("upper-crease",
    "M60 106 C75 88 96 85 119 88 C138 89 153 97 164 106",
    "#875e63",.56,[214,290],"eye-skin",.36);
  line("lid-margin",
    "M68 122 C81 105 100 101 116 103 M121 103 C144 105 156 110 166 116",
    "#684950",.87,[206,287],"eye-skin",.76);
  line("lower-lid-light",
    "M84 140 Q99 148 116 145 C134 143 151 135 161 125",
    "#efc5b5",.55,[216,290],"lower-lid-flesh",.44);

  // Six unequal curved lash roots replace a regularly spaced vertical fan.
  line("upper-lashes",
    "M72 116 Q69 112 67 110 M81 112 Q76 105 74 104"+
    " M92 108 Q90 103 89 101 M118 104 Q119 100 119 98"+
    " M139 107 Q145 101 147 101 M155 111 Q160 109 162 107",
    "#4b353d",.48,[220,296],"eye-skin",.68);
  line("lower-lashes",
    "M84 141 Q82 145 79 146 M110 146 Q111 149 112 151"+
    " M146 134 Q150 137 152 136",
    "#885e61",.34,[239,295],"eye-skin",.37);

  const follicles=crayonFurFlow({
    seed:2084,guide:[{x:25,y:88},{x:59,y:67},{x:102,y:47},{x:161,y:61}],
    count:Math.round(91*detail),spread:3.3,length:10.2,curvature:.21,forkRate:.06,
  });
  if(follicles)line("brow-rooted-fibres",follicles,"#493b3c",.33,[217,298],
    "brow-root",.62);
  line("brow-wax",
    "M25 80 Q36 68 52 63 M57 72 Q69 55 83 53"+
    " M94 59 Q110 44 122 45 M132 57 Q149 53 161 63",
    "#675052",.48,[237,298],"brow-root",.42);
  return {version:1,id:"crayon-artcraft-cc0-near-eye-"+aspect,
    width,height,durationFrames:300,seed:20918,paper:"#f5e8d8",paperTooth:.8,
    elements,camera:[{frame:0,focusX:width/2,focusY:height/2,zoom:1},
      {frame:299,focusX:width/2,focusY:height/2,zoom:1}]};
}
