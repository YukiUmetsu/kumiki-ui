import type {CrayonColor,CrayonElement,CrayonSceneSpec} from "../../registry/video/materials/crayon-scene";
import {crayonIrisFlecks} from "./crayon-editorial-character-craft";

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
    skin:["#e1b09e","#b98582","#f5d1bb"],
    light:["#f1c6b4","#cb988a","#ffe0c4"],
    shadow:["#ba8e91","#865e65","#dcb1a4"],
    socket:["#ac8182","#705962","#c9a0a0"],
    eyelid:["#d1a3a0","#9c777d","#f1c9b4"],
    sclera:["#e0d3c6","#9ea8aa","#f7eadc"],
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
  wax("eye-skin",
    "M4 1 C38 -2 169 -2 206 2 Q212 28 210 69"+
    "C210 126 214 174 205 198 Q141 201 72 199"+
    "Q19 201 3 198 C-2 139 -1 41 4 1Z",
    rect(-2,-3,216,205),palettes.skin,[1,76],{
      placement:place,underpaintGradient:{light:"#f6d8c2",shadow:"#9b7879",
        focusX:.16,focusY:.12,radius:1.35},underpaintTooth:.83,
      markStrength:.24,spacing:8.9,outlineOpacity:0});
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
  wax("brow-root",
    "M22 91 C48 65 70 49 104 42 C121 40 148 46 162 62"+
    "C146 57 129 57 105 54 C75 58 52 72 22 91Z",
    rect(15,35,154,63),palettes.brow,[70,164],{
      parentId:"eye-skin",spacing:5.7,markStrength:.32,
      underpaintGradient:{light:"#aa7c6a",shadow:"#604345",focusX:.55,focusY:.2,radius:1},
      outlineOpacity:0});
  wax("brow-pigment-turn",
    "M26 84 C47 69 75 56 105 50 C130 48 152 53 165 65"+
    "Q135 57 109 62 C79 65 54 77 26 84Z",
    rect(23,45,146,46),palettes.ochre,[121,191],{
      parentId:"brow-root",clipToParent:true,coverage:"open",
      blendRadius:3,markStrength:.42,pressure:.61,outlineOpacity:0});
  wax("eye-sclera",
    "M65 122 C74 107 93 98 115 98 C136 99 154 107 166 116"+
    "C151 126 137 139 116 144 C97 148 79 139 65 122Z",
    rect(61,94,111,56),palettes.sclera,[105,202],{
      parentId:"eye-skin",spacing:4.4,markStrength:.23,
      underpaintGradient:{light:"#eeebe1",shadow:"#7f8990",
        focusX:.75,focusY:.3,radius:1},outlineOpacity:0});
  wax("upper-sclera-occlusion",
    "M66 122 C76 104 95 99 118 99 Q144 100 165 116"+
    "Q132 107 108 107 C90 107 76 115 66 122Z",
    rect(63,96,105,29),palettes.socket,[125,203],{
      parentId:"eye-sclera",clipToParent:true,coverage:"open",
      blendRadius:3,pressure:.55,markStrength:.3,outlineOpacity:0});
  wax("eye-iris",
    "M87 111 C88 101 98 99 109 100 C122 102 130 112 129 123"+
    "C126 137 113 143 102 140 C92 137 84 128 87 111Z",
    rect(83,97,50,47),palettes.iris,[125,220],{
      parentId:"eye-sclera",spacing:3.4,markStrength:.48,pressure:.88,
      underpaintGradient:{light:"#bb9b76",shadow:"#3a322f",
        focusX:.75,focusY:.57,radius:.92},outlineOpacity:.08});
  wax("eye-pupil",
    "M98 111 C101 106 105 105 110 107 C117 109 118 116 117 122"+
    "C114 129 105 129 100 125 C96 121 96 115 98 111Z",
    rect(95,104,26,26),palettes.pupil,[157,231],{
      parentId:"eye-iris",spacing:3.3,markStrength:.38,pressure:.96,outlineOpacity:0});
  const irisFlecks=crayonIrisFlecks({seed:1407,cx:108,cy:120,
    rx:20,ry:20,count:Math.round(26*detail),minRadius:.46,maxRadius:.94});
  if(irisFlecks)line("iris-dark-radials",irisFlecks,"#493f36",.55,[171,271],"eye-iris",.77);
  wax("sclera-reflection",
    "M131 111 Q151 107 162 115 Q153 123 135 130Z",
    rect(128,106,38,27),palettes.sclera,[172,246],{
      parentId:"eye-sclera",clipToParent:true,coverage:"open",
      blendRadius:4,pressure:.4,markStrength:.24,outlineOpacity:0});
  wax("tear-duct",
    "M164 116 Q168 113 174 117 Q170 123 165 123 Q162 120 164 116Z",
    rect(160,111,17,16),palettes.tear,[174,253],{
      parentId:"eye-skin",pressure:.67,markStrength:.4,spacing:3.2,outlineOpacity:0});
  wax("upper-lid-overhang",
    "M61 122 C74 103 94 96 116 96 C138 97 156 105 168 115"+
    "Q149 107 135 106 C106 102 82 110 61 122Z",
    rect(58,93,113,34),palettes.eyelid,[168,249],{
      parentId:"eye-skin",spacing:5.3,markStrength:.39,pressure:.82,
      underpaintGradient:{light:"#dbb2ab",shadow:"#805e63",
        focusX:.45,focusY:.12,radius:1.1},outlineOpacity:0});
  wax("lower-lid-flesh",
    "M66 123 C83 141 100 148 118 145 C138 143 156 127 166 118"+
    "C159 141 140 155 119 159 C91 161 75 149 66 123Z",
    rect(62,116,108,47),palettes.eyelid,[174,262],{
      parentId:"eye-skin",spacing:5.3,markStrength:.34,pressure:.73,outlineOpacity:0});
  wax("lower-lid-groove",
    "M72 135 C88 149 106 153 122 151 Q146 148 163 130"+
    "Q145 167 115 167 C92 166 75 155 72 135Z",
    rect(70,129,97,43),palettes.socket,[184,267],{
      parentId:"eye-skin",clipToParent:true,coverage:"open",
      blendRadius:4,pressure:.58,markStrength:.34,outlineOpacity:0});
  line("upper-crease",
    "M60 106 C75 83 101 78 123 80 C146 82 159 93 164 102",
    "#875e63",.74,[214,290],"eye-skin",.57);
  line("lid-margin",
    "M68 122 C81 105 100 101 116 103 M121 103 C144 105 156 110 166 116",
    "#684950",.87,[206,287],"eye-skin",.76);
  line("lower-lid-light",
    "M83 146 Q98 151 117 148 C136 147 151 137 161 125",
    "#f1c1b1",.8,[216,290],"lower-lid-flesh",.63);
  line("upper-lashes",
    "M72 117 Q68 111 65 107 M78 112 Q74 104 73 100"+
    " M87 108 Q85 99 84 95 M96 105 Q94 97 94 94"+
    " M104 104 Q104 96 102 94 M114 104 Q114 98 113 94"+
    " M124 104 Q127 97 128 94 M134 106 Q139 99 140 96"+
    " M144 109 Q150 103 154 100 M154 112 Q160 108 163 106",
    "#4b353d",.69,[220,296],"eye-skin",.78);
  line("lower-lashes",
    "M83 145 Q80 151 76 155 M92 149 Q90 154 87 157"+
    " M105 151 Q105 157 103 160 M124 150 Q126 156 129 158"+
    " M137 145 Q140 151 143 152",
    "#885e61",.4,[239,295],"eye-skin",.55);
  line("brow-wax",
    "M25 80 Q36 68 52 63 M38 80 Q53 65 70 58"+
    " M57 72 Q69 55 83 53 M74 65 Q94 49 106 46"+
    " M94 59 Q110 44 122 45 M116 54 Q129 45 141 51"+
    " M132 57 Q149 53 161 63 M22 88 Q31 81 38 78",
    "#5f4244",.63,[237,298],"brow-root",.55);
  return {version:1,id:"crayon-artcraft-cc0-near-eye-"+aspect,
    width,height,durationFrames:300,seed:20918,paper:"#f5e8d8",paperTooth:.8,
    elements,camera:[{frame:0,focusX:width/2,focusY:height/2,zoom:1},
      {frame:299,focusX:width/2,focusY:height/2,zoom:1}]};
}
