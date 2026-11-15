/**
 * INK — figure-craft marks. Original code-drawn bái-miáo/silk-thread contour,
 * tapered leaf strokes, and sparse dry-brush cross-grain.
 *
 * Inspired by historically documented Chinese figure line methods (十八描);
 * these are interpretations, not copies of paintings. Brush pressure is
 * encoded as a variable-width CLOSED path, not a uniform SVG line filter.
 *
 * Every stroke is deterministic and safe to serialize in the character asset.
 */
import type {CharacterPathShape,CharacterShapeAsset,CharacterVec2} from
  "../../registry/character/definition";
import type {ShanshuiScene} from "../../registry/video/ink-shanshui";
type V=CharacterVec2;
const n=(v:number)=>Number(v.toFixed(3));
const vec=(x:number,y:number):V=>({x,y});
const cubic=(a:V,b:V,c:V,d:V,t:number):V=>{
  const u=1-t;
  return {x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,
    y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y};
};
const tangent=(a:V,b:V,c:V,d:V,t:number):V=>{
  const u=1-t;
  return {x:3*u*u*(b.x-a.x)+6*u*t*(c.x-b.x)+3*t*t*(d.x-c.x),
    y:3*u*u*(b.y-a.y)+6*u*t*(c.y-b.y)+3*t*t*(d.y-c.y)};
};
const str=(p:V)=>n(p.x)+" "+n(p.y);
const pen=(d:string,fill:string,opacity=1):CharacterPathShape=>({
  type:"path",d,fill,stroke:"none",strokeWidth:0,opacity,
});
const line=(d:string,ink="$shadow",weight=.7,opacity=.7):CharacterPathShape=>({
  type:"path",d,fill:"none",stroke:ink,strokeWidth:weight,opacity,
});
export interface InkStrokeDesign {
  from:V;c1:V;c2:V;to:V;
  width:number;ink?:string;opacity?:number;
  /** 0 = light at start; 1 = fullest at start, for nail-head/rattail. */
  startWeight?:number;
  /** Distinct stroke variations; do not use wall-clock randomness. */
  seed?:number;
  /** 8..48 samples; smooth silhouettes cost less than bitmap texture. */
  samples?:number;
}
export function inkPressureStroke(c:InkStrokeDesign):CharacterPathShape {
  const props=[...Object.values(c.from),...Object.values(c.c1),
    ...Object.values(c.c2),...Object.values(c.to),c.width];
  if(props.some(v=>!Number.isFinite(v))||c.width<=0||c.width>24||
    (c.opacity!==undefined&&(!Number.isFinite(c.opacity)||
      c.opacity<0||c.opacity>1))||
    (c.startWeight!==undefined&&(!Number.isFinite(c.startWeight)||
      c.startWeight<0||c.startWeight>1))||
    (c.seed!==undefined&&!Number.isSafeInteger(c.seed))||
    (c.samples!==undefined&&(!Number.isSafeInteger(c.samples)||
      c.samples<8||c.samples>48)))
    throw new RangeError("Ink line geometry must have finite points, 0<width<=24 and valid pressure.");
  const slices=c.samples??20,left:V[]=[],right:V[]=[];
  const head=c.startWeight??.2,noise=c.seed??0;
  for(let i=0;i<=slices;i++){
    const t=i/slices,pt=cubic(c.from,c.c1,c.c2,c.to,t),
      dt=tangent(c.from,c.c1,c.c2,c.to,t);
    const len=Math.max(.00001,Math.hypot(dt.x,dt.y));
    const normal=vec(-dt.y/len,dt.x/len);
    // A single stroke accumulates pressure then relaxes toward a fine tail.
    // The slow deterministic edge oscillation avoids a mechanical outline.
    const envelope=.065+.935*Math.pow(Math.sin(Math.PI*t),.76);
    const shifted=Math.max(.04,(1-t)*(head*.68)+envelope*(1-head*.28));
    const edge=1+.045*Math.sin(t*21+noise*1.73)+
      .025*Math.sin(t*43+noise*.3);
    const half=c.width*.5*shifted*edge;
    left.push(vec(pt.x+normal.x*half,pt.y+normal.y*half));
    right.push(vec(pt.x-normal.x*half,pt.y-normal.y*half));
  }
  return pen("M"+left.map(str).join(" L")+" L"+
    right.reverse().map(str).join(" L")+" Z",c.ink??"$shadow",c.opacity??.85);
}
export function inkSilkFold(
  from:V,c1:V,c2:V,to:V,
  pressure=1,seed=0,
):CharacterPathShape[]{
  const k=(p:V,dx:number,dy:number)=>vec(p.x+dx,p.y+dy);
  return [
    inkPressureStroke({from,c1,c2,to,width:pressure*1.8,
      ink:"$shadow",opacity:.79,startWeight:.34,seed}),
    inkPressureStroke({from:k(from,2,1),c1:k(c1,2,1),
      c2:k(c2,1.5,0),to:k(to,1,.4),width:pressure*.65,
      ink:"$wash",opacity:.65,startWeight:0,seed:seed+11}),
    inkPressureStroke({from:k(from,-2,-.4),c1:k(c1,-1.4,-.1),
      c2:k(c2,-1.1,0),to:k(to,-.8,0),width:pressure*.4,
      ink:"$paper",opacity:.54,startWeight:0,seed:seed+20}),
  ];
}
export function inkHatching(
  origin:V,span:number,count:number,seed:number,
  ink="$shadow",
):CharacterPathShape[]{
  if(!Number.isFinite(span)||span<=0||span>600||
    !Number.isSafeInteger(count)||count<0||count>100)
    throw new RangeError("Ink hatching requires bounded geometry.");
  const shapes:CharacterPathShape[]=[];
  for(let i=0;i<count;i++){
    const t=(i+.5)/Math.max(1,count),x=origin.x+span*t;
    const w=4+2.5*Math.sin(i*2.9+seed);
    shapes.push(inkPressureStroke({
      from:vec(x,origin.y+(i%3)*.65),
      c1:vec(x+w*.12,origin.y+1.8),
      c2:vec(x+w*.55,origin.y+2.8),
      to:vec(x+w,origin.y+3.1),
      width:.45+.28*(1+Math.sin(i*.92+seed)),
      ink,opacity:.28+.15*Math.sin(i*1.45)**2,seed:i+seed,
      samples:10,
    }));
  }
  return shapes;
}
export function inkArt(shapes:CharacterPathShape[],
  label="Original Kumiki scholar linework"):CharacterShapeAsset{
  return {kind:"shapes",width:260,height:340,shapes,
    provenance:{license:"CC0-1.0",source:label}};
}
/**
 * Source character specific detail rather than generic wallpaper:
 * scholar with a lowered head, reader with a rolled manuscript, and
 * mountain walker with a taut streaming robe get DIFFERENT marks.
 * Face-local original design coordinates are subsequently transformed by
 * the teacher-specific head and feature part rest matrices.
 */
export function shanshuiFacialCraft(scene:ShanshuiScene,detail=1):
  Record<string,CharacterPathShape[]>{
  if(!Number.isFinite(detail)||detail<0||detail>1)
    throw new RangeError("Facial craft detail must be 0..1.");
  const fine=detail>.43,more=detail>.77;
  const face:CharacterPathShape[]=[
    line("M113 109 Q115 118 121 126","$skinshade",.73,.4),
    line("M117 83 Q119 78 123 75","$paper",.55,.52),
    line("M158 93 Q161 99 158 103","$skinshade",.68,.52),
    inkPressureStroke({from:vec(145,103),c1:vec(146.7,110),
      c2:vec(142.7,113),to:vec(139,113.7),
      width:.75,ink:"$shadow",opacity:.63,seed:4}),
    line("M138 115 Q141 117 144 115","$skinshade",.47,.48),
    line("M128 133 Q135 138 143 138","$paper",.66,.45),
  ];
  if(fine)face.push(
    line("M119 122 Q123 126 128 125","$skinshade",.62,.45),
    line("M153 111 Q156 114 155 120","$skinshade",.54,.36),
    line("M131 137 Q137 139 141 138","$shadow",.45,.32),
  );
  const hair:CharacterPathShape[]=[];
  for(let i=0;i<(more?15:fine?10:5);i++){
    const start=vec(114+i*3.15,71-i*.48);
    hair.push(inkPressureStroke({
      from:start,c1:vec(start.x+1.3,58-i*.32),
      c2:vec(138+i*.85,58+i*.35),
      to:vec(154+i*.55,78+i*.58),
      width:i%3===0?.82:.46,ink:i%4===0?"$wash":"$ink",
      opacity:i%4===0?.39:.68,seed:8+i,samples:14,
    }));
  }
  for(let i=0;i<(more?9:5);i++){
    const x=139+i*1.75;
    hair.push(inkPressureStroke({
      from:vec(x,52),c1:vec(134+i*1.2,44),
      c2:vec(143+i*1.1,37),to:vec(149+i*.6,48),
      width:.48,ink:i%3===0?"$paper":"$ink",
      opacity:i%3===0?.6:.55,seed:i+40,samples:10,
    }));
  }
  const brows:CharacterPathShape[]=[
    inkPressureStroke({from:vec(118,94),c1:vec(122,91.5),
      c2:vec(131,91.5),to:vec(136,95),
      width:.88,ink:"$deep",opacity:.72,seed:61}),
    inkPressureStroke({from:vec(146,93),c1:vec(151,89.5),
      c2:vec(160,89.5),to:vec(165,92.5),
      width:.82,ink:"$deep",opacity:.73,seed:62}),
  ];
  if(fine)brows.push(
    line("M119 91 Q126 88.5 135 92","$wash",.38,.53),
    line("M147 91 Q154 87.5 164 90","$wash",.38,.54),
  );
  if(more)brows.push(
    inkPressureStroke({from:vec(120,92),c1:vec(124,90),
      c2:vec(130,89.5),to:vec(133,92),width:.35,
      ink:"$ink",opacity:.71,seed:69}),
  );
  const eyes:CharacterPathShape[]=[
    line("M118 106.2 Q126 110 135 106.5","$skinshade",.54,.62),
    line("M147 104.8 Q155 108.3 163 104.5","$skinshade",.52,.61),
    inkPressureStroke({from:vec(118,103),c1:vec(123,99.9),
      c2:vec(131,101.5),to:vec(135,103.4),
      width:.78,opacity:.84,ink:"$ink",seed:26}),
    inkPressureStroke({from:vec(147,102.9),c1:vec(152,99.7),
      c2:vec(160,101.2),to:vec(163.5,102),
      width:.76,opacity:.83,ink:"$ink",seed:27}),
  ];
  if(fine)eyes.push(
    line("M117 107 Q121 110 125 110","$paper",.36,.57),
    line("M150 106.4 Q157 107.3 164 104.8","$paper",.34,.58),
    line("M119 102 Q121 101.7 123 102.7","$shadow",.37,.63),
  );
  if(more)eyes.push(
    line("M132 102.7 Q134.5 104.3 136 105","$ink",.36,.71),
    line("M159.2 102 Q162 103.6 164 104","$ink",.4,.72),
  );
  const mouth:CharacterPathShape[]=[
    line("M136 129.3 Q143 131.6 149 126.7","$skinshade",.6,.49),
    line("M138 132 Q142 133 145 130","$paper",.43,.41),
  ];
  if(fine)mouth.push(
    line("M135 126 Q140 125 144 125.5","$shadow",.38,.54),
    line("M137 130.7 Q143 131.9 146 129.7","$skinshade",.43,.62),
  );
  if(more)mouth.push(
    inkPressureStroke({from:vec(135.7,126.3),c1:vec(138,125.9),
      c2:vec(143.3,125.7),to:vec(147.5,126.6),
      width:.36,ink:"$ink",opacity:.58,seed:88}),
  );
  const beard:CharacterPathShape[]=[];
  if(scene==="misty-hermit"){
    for(let i=0;i<(fine?11:6);i++){
      const x=124+i*2.3,baseY=132+(i%3)*2;
      beard.push(inkPressureStroke({
        from:vec(x,baseY),c1:vec(x+2,145),
        c2:vec(137+(i-5)*.75,153+(i%3)*1.9),
        to:vec(139+(i-5)*1.05,163+3*Math.sin(i*.82)),
        width:.26+(i%3)*.12,ink:i%4===0?"$paper":"$ink",
        opacity:i%4===0?.28:.54,seed:i+99,samples:15,
      }));
    }
    face.push(
      line("M115 107 Q115 114 119 116","$shadow",.65,.46),
      line("M117 118 Q118 123 123 124","$shadow",.62,.41),
      line("M153 117 Q156 121 154 126","$shadow",.7,.49),
    );
  }
  if(scene==="mountain-trail"){
    hair.push(
      inkPressureStroke({from:vec(157,60),c1:vec(182,48),
        c2:vec(210,76),to:vec(231,70),width:1.2,
        ink:"$ink",opacity:.73,seed:157}),
      inkPressureStroke({from:vec(161,66),c1:vec(190,80),
        c2:vec(204,99),to:vec(230,98),width:.75,
        ink:"$shadow",opacity:.72,seed:158}),
    );
  }else if(scene==="river-scholar"){
    hair.push(
      inkPressureStroke({from:vec(151,59),c1:vec(108,46),
        c2:vec(72,61),to:vec(42,43),width:1.1,
        ink:"$ink",opacity:.64,seed:159}),
      inkPressureStroke({from:vec(151,60),c1:vec(110,67),
        c2:vec(88,101),to:vec(64,90),width:.87,
        ink:"$shadow",opacity:.68,seed:160}),
    );
  }
  return {
    face,hair,brow:brows,"eyes-open":eyes,
    "eyes-soft":eyes,"eyes-closed":[
      line("M117 109 Q125 111 135 107","$shadow",.55,.41),
      line("M147 107 Q156 109 163 104","$shadow",.55,.41),
    ],
    "mouth-rest":mouth,"mouth-aa":mouth,
    "mouth-oh":mouth,"mouth-mm":mouth,"mouth-smile":mouth,
    beard,
  };
}
