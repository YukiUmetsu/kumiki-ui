/**
 * The Moonlit Lantern — an original, three-act cut-paper fairy tale.
 * Art direction: jointed articulated silhouettes, book-theatre relief,
 * fine costume contours, real holes, opaque colored card and held poses.
 *
 * All artwork is authored geometry. Reference images are linked in
 * docs/research/paper-royal-story-artcraft.md; none are embedded or traced.
 */
import type {PaperCraftSpec,PaperCutLayer,PaperPoseKey,PaperStyle} from "../../registry/video/paper-craft";
import type {PaperDirectorAspect,PaperDirectorFilm} from "../../registry/video/paper-director";

export const ROYAL_STORY_BEATS=[
  {id:"the-hushed-orchard",title:"The forest falls silent",
    narration:"One night, the forest's lantern lost its light. The princess listened to the animals."},
  {id:"the-fox-guides",title:"Follow the little lights",
    narration:"A fox led the prince across the clearing. A rabbit kept watch beside the princess."},
  {id:"the-lantern-awakens",title:"A light shared is a light restored",
    narration:"Together, they lifted the lantern. The forest and all its creatures began to sing."},
] as const;
export type RoyalStoryBeat=typeof ROYAL_STORY_BEATS[number]["id"];

const fixed=(n:number)=>Number(n.toFixed(2));
const rad=(degrees:number)=>degrees*Math.PI/180;
function pen(x0:number,y0:number,s=1){
  const pt=(x:number,y:number)=>fixed(x0+x*s)+" "+fixed(y0+y*s);
  const xy=(x:number,y:number)=>[fixed(x0+x*s),fixed(y0+y*s)] as const;
  const M=(x:number,y:number)=>"M"+pt(x,y);
  const L=(x:number,y:number)=>"L"+pt(x,y);
  const C=(a:number,b:number,c:number,d:number,e:number,f:number)=>
    "C"+pt(a,b)+" "+pt(c,d)+" "+pt(e,f);
  const Q=(a:number,b:number,c:number,d:number)=>"Q"+pt(a,b)+" "+pt(c,d);
  const Z=" Z";
  const poly=(points:readonly (readonly [number,number])[])=>
    points.map(([x,y],i)=>i?L(x,y):M(x,y)).join(" ")+Z;
  const oval=(x:number,y:number,rx:number,ry:number)=>{
    const k=.5522847498;
    return [M(x-rx,y),C(x-rx,y-k*ry,x-k*rx,y-ry,x,y-ry),
      C(x+k*rx,y-ry,x+rx,y-k*ry,x+rx,y),
      C(x+rx,y+k*ry,x+k*rx,y+ry,x,y+ry),
      C(x-k*rx,y+ry,x-rx,y+k*ry,x-rx,y),Z].join(" ");
  };
  const band=(x0:number,y0:number,x1:number,y1:number,width:number,bend=0)=>{
    const dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
    return [M(x0+nx*width*.5,y0+ny*width*.5),
      C(x0+dx*.3+nx*(width*.65+bend),y0+dy*.3+ny*(width*.65+bend),
        x0+dx*.7+nx*width*.3,y0+dy*.7+ny*width*.3,x1,y1),
      C(x0+dx*.75-nx*width*.25,y0+dy*.75-ny*width*.25,
        x0+dx*.2-nx*width*.5,y0+dy*.2-ny*width*.5,
        x0-nx*width*.5,y0-ny*width*.5),Z].join(" ");
  };
  const leaf=(x:number,y:number,length:number,angle:number,width:number)=>{
    const a=rad(angle),ux=Math.cos(a),uy=Math.sin(a),nx=-uy,ny=ux;
    const P=(t:number,v:number)=>[x+ux*length*t+nx*width*v,y+uy*length*t+ny*width*v] as const;
    return [M(...P(0,0)),C(...P(.2,.7),...P(.67,1.15),...P(1,0)),
      C(...P(.67,-1.15),...P(.2,-.7),...P(0,0)),Z].join(" ");
  };
  return {M,L,C,Q,Z,xy,poly,oval,band,leaf};
}
type Pen=ReturnType<typeof pen>;
type Add=(id:string,color:string,depth:number,path:string,rest?:Partial<PaperCutLayer>)=>void;
const palette=[
  {sky:"#202B46",far:"#46637C",middle:"#53776F",land:"#344F52",foreground:"#233C44",
    moon:"#F4D6A0",spark:"#E8BD83",trim:"#E7C59F",leaf:"#779B83"},
  {sky:"#263B52",far:"#607C8B",middle:"#547D79",land:"#335F60",foreground:"#254B4F",
    moon:"#F7DCAF",spark:"#F6CB82",trim:"#E8CCA0",leaf:"#80AE99"},
  {sky:"#435477",far:"#8395A1",middle:"#76A49C",land:"#426B68",foreground:"#315654",
    moon:"#FFF0BF",spark:"#FFD984",trim:"#FAE1B9",leaf:"#A9C3A1"},
] as const;
function keys(x0:number,x1:number,x2:number,y:number,angle:number,motion:number):readonly PaperPoseKey[]{
  return [
    {frame:0,x:fixed(x0*motion),y:0,angle:0,ease:"smooth"},
    {frame:120,x:fixed(x1*motion),y:fixed(y*motion),angle:fixed(angle*motion),ease:"smooth"},
    {frame:239,x:fixed(x2*motion),y:0,angle:0},
  ];
}

/** The paper face is deliberately a small storybook profile, not a photo portrait. */
function princess(p:Pen,add:Add,phase:number,motion:number){
  const root="princess-bodice",face="princess-head";
  const attach=(parentId:string,x:number,y:number,rest:Partial<PaperCutLayer>={})=>
    ({parentId,pivot:p.xy(x,y),...rest});
  const travel=phase===0?keys(-10,0,13,0,-1,motion):
    phase===1?keys(0,13,23,0,1,motion):keys(23,40,44,-3,2,motion);
  // Back pieces have deliberate overlap beneath the waist/shoulder pivots.
  add("princess-back-cloak","#7B547C",12,[
    p.M(-18,-134),p.C(-61,-129,-57,-72,-78,-8),
    p.C(-59,2,-38,5,-18,-1),p.C(3,-10,22,-17,32,-47),
    p.C(28,-77,20,-113,-18,-134),p.Z].join(" "),attach(root,0,-107));
  add("princess-skirt","#B77F9C",15,[
    p.M(-18,-80),p.C(-44,-61,-58,-15,-77,-3),
    p.C(-64,8,-50,7,-38,2),p.C(-11,13,13,15,37,7),
    p.C(57,13,73,8,79,-3),p.C(48,-31,43,-69,23,-83),p.Z].join(" "),attach(root,0,-91));
  add("princess-skirt-shadow","#8E678B",16,[
    p.M(-20,-66),p.C(-37,-36,-37,-12,-49,3),
    p.C(-32,8,-17,10,-4,11),p.C(-14,-20,-9,-55,-20,-66),p.Z,
    p.M(11,-66),p.C(20,-40,31,-15,47,5),
    p.C(38,11,25,12,14,11),p.C(8,-23,5,-48,11,-66),p.Z].join(" "),
    attach(root,0,-91));
  add("princess-dress-inset","#DDA7B1",17,[
    p.M(-7,-67),p.C(-19,-39,-20,-13,-16,9),
    p.C(0,14,14,13,25,10),p.C(12,-8,4,-43,10,-67),p.Z].join(" "),
    attach(root,0,-91));
  add("princess-gown-gold-hem","#F8DDAA",18,[
    p.M(-69,-5),p.C(-41,7,-20,7,-2,9),p.C(30,13,49,8,73,-4),
    p.C(58,12,33,20,5,19),p.C(-29,19,-53,17,-69,-5),p.Z].join(" "),
    attach(root,0,-91));
  add("princess-bodice","#E4ADBE",20,[
    p.M(-24,-127),p.C(-30,-116,-29,-99,-18,-94),
    p.L(-17,-79),p.Q(-3,-65,18,-80),p.L(17,-98),
    p.C(33,-108,28,-126,12,-132),p.Q(-1,-121,-24,-127),p.Z].join(" "),
    {pivot:p.xy(0,-106),poseKeys:travel});
  add("princess-bodice-panel","#8F607F",21,[
    p.M(-7,-117),p.Q(0,-99,-7,-80),p.Q(0,-72,6,-80),
    p.Q(8,-104,3,-117),p.Z].join(" "),attach(root,0,-103));
  add("princess-collar","#FFF0DD",23,[
    p.M(-18,-132),p.Q(-6,-141,1,-126),p.Q(13,-141,21,-131),
    p.Q(11,-121,3,-122),p.Q(-7,-124,-18,-132),p.Z].join(" "),attach(root,0,-123));
  add("princess-gold-seams","#F6D7A4",23,[
    p.band(-18,-95,-6,-80,1.3),p.band(17,-95,8,-80,1.3),
    p.leaf(-4,-106,9,-85,1.4),p.leaf(3,-104,8,-95,1.2)].join(" "),
    attach(root,0,-101));
  add("princess-left-sleeve","#E9A9B7",20,[
    p.M(-22,-128),p.C(-37,-138,-45,-117,-42,-109),
    p.C(-39,-99,-47,-92,-49,-83),p.C(-40,-77,-32,-79,-27,-86),
    p.Q(-24,-104,-22,-128),p.Z].join(" "),
    attach(root,-27,-123,{poseKeys:keys(0,0,0,0,-8,motion)}));
  add("princess-left-cuff","#FFF2DA",24,
    p.band(-48,-83,-34,-77,5),
    attach("princess-left-sleeve",-40,-83));
  add("princess-right-sleeve","#C48DA3",20,[
    p.M(18,-129),p.C(34,-134,39,-122,41,-110),
    p.C(48,-101,55,-92,62,-84),
    p.C(58,-77,49,-74,44,-81),p.C(29,-97,20,-105,18,-129),p.Z].join(" "),
    attach(root,22,-125,{poseKeys:keys(0,-1,-3,0,phase===2?-22:-10,motion)}));
  add("princess-right-cuff","#FFEBD5",25,
    p.band(55,-87,62,-80,5),
    attach("princess-right-sleeve",55,-86));
  add("princess-right-hand","#E4B998",26,[
    p.M(58,-82),p.C(63,-81,68,-80,69,-74),
    p.Q(70,-68,66,-67),p.Q(62,-73,58,-77),p.Z].join(" "),
    attach("princess-right-sleeve",60,-79));
  add("princess-hair-back","#3E354E",21,[
    p.M(-25,-206),p.C(-45,-205,-45,-179,-38,-158),
    p.C(-38,-135,-53,-120,-36,-107),p.C(-21,-111,-16,-137,-18,-152),
    p.C(13,-158,29,-176,21,-200),p.C(9,-220,-10,-224,-25,-206),p.Z].join(" "),
    attach(root,-6,-172));
  add("princess-head","#EDC3A5",24,[
    p.M(-22,-206),p.C(-15,-219,8,-219,19,-201),
    p.Q(26,-193,24,-179),p.L(30,-175),
    p.Q(26,-168,21,-169),p.C(16,-153,7,-150,-3,-153),
    p.C(-18,-157,-24,-171,-25,-188),p.Z].join(" "),
    attach(root,-6,-177,{poseKeys:keys(0,0,0,-1,phase===2?-4:1,motion)}));
  add("princess-forelock","#51415D",27,[
    p.M(-23,-200),p.C(-24,-223,9,-227,21,-201),
    p.C(9,-209,4,-208,-2,-195),p.Q(-13,-187,-23,-182),p.Z].join(" "),
    attach(face,-3,-200));
  add("princess-hair-braid","#4D3758",26,[
    p.M(-27,-184),p.C(-33,-173,-35,-164,-28,-152),
    p.C(-40,-141,-38,-129,-27,-122),p.C(-20,-134,-26,-144,-20,-155),
    p.C(-13,-172,-18,-184,-27,-184),p.Z].join(" "),
    attach(face,-21,-184));
  add("princess-braid-stitches","#C59A9D",28,
    [p.band(-31,-161,-23,-157,1.7),p.band(-32,-151,-23,-147,1.7),
      p.band(-32,-140,-24,-136,1.7)].join(" "),attach(face,-20,-170));
  add("princess-lashes","#524050",28,
    [p.M(8,-187),p.Q(16,-191,21,-184),p.Q(16,-183,8,-187),p.Z,
      p.leaf(11,-185,4,-79,1.1)].join(" "),attach(face,11,-186));
  add("princess-lips","#B86E81",28,[
    p.M(17,-168),p.Q(22,-166,26,-168),p.Q(22,-162,17,-168),p.Z].join(" "),
    attach(face,15,-170));
  add("princess-tiara","#E9C780",29,[
    p.M(-16,-213),p.L(-12,-230),p.L(-3,-218),p.L(4,-237),
    p.L(11,-218),p.L(21,-230),p.L(23,-211),p.Q(2,-208,-16,-213),p.Z].join(" "),
    attach(face,0,-213));
  add("princess-tiara-jewels","#D99AA5",30,
    [p.oval(4,-223,2.7,4.3),p.oval(-11,-218,1.7,2.8),
      p.oval(18,-217,1.7,2.6)].join(" "),attach(face,4,-223));
}
function prince(p:Pen,add:Add,phase:number,motion:number){
  const root="prince-coat",face="prince-head";
  const attach=(parentId:string,x:number,y:number,rest:Partial<PaperCutLayer>={})=>
    ({parentId,pivot:p.xy(x,y),...rest});
  const travel=phase===0?keys(22,5,0,0,-2,motion):
    phase===1?keys(22,-14,-30,1,-3,motion):keys(-30,-42,-43,-3,1,motion);
  add("prince-cape","#51657B",12,[
    p.M(-25,-128),p.C(-54,-117,-64,-65,-65,-12),
    p.C(-44,5,-31,1,-21,-12),p.Q(10,-56,29,-101),p.Z].join(" "),
    attach(root,-12,-121));
  for(const side of [-1,1]){
    const n=side===-1?"left":"right",x=side*13;
    add("prince-"+n+"-leg","#41536D",14,[
      p.M(x-10,-65),p.C(x-14,-42,x-12,-16,x-12,-3),
      p.Q(x+1,1,x+11,-4),p.C(x+8,-32,x+13,-55,x+9,-70),p.Z].join(" "),
      attach(root,x,-66,{poseKeys:keys(0,0,0,0,side*(phase===1?12:5),motion)}));
    add("prince-"+n+"-boot","#2C3448",16,[
      p.M(x-13,-13),p.Q(x+4,-9,x+12,-14),p.L(x+14,3),
      p.Q(x+7,10,x-19,8),p.Q(x-25,1,x-13,-13),p.Z].join(" "),
      attach("prince-"+n+"-leg",x,-4));
  }
  add("prince-coat","#4D7189",19,[
    p.M(-26,-131),p.C(-38,-123,-35,-104,-27,-94),
    p.L(-33,-70),p.C(-16,-60,18,-59,33,-72),
    p.L(28,-96),p.C(40,-116,28,-131,15,-134),
    p.Q(-4,-123,-26,-131),p.Z].join(" "),
    {pivot:p.xy(0,-110),poseKeys:travel});
  add("prince-coat-tail","#365F79",20,[
    p.M(-28,-77),p.C(-34,-53,-43,-42,-49,-28),
    p.L(-11,-37),p.Q(2,-59,6,-78),p.Z,
    p.M(9,-75),p.Q(14,-59,21,-42),p.L(48,-28),
    p.Q(41,-57,29,-78),p.Z].join(" "),attach(root,0,-75));
  add("prince-waistcoat","#FADEB4",21,[
    p.M(-11,-120),p.Q(-2,-125,10,-118),
    p.L(13,-80),p.Q(1,-69,-13,-82),p.Z].join(" "),
    attach(root,0,-108));
  add("prince-lapels","#8DA9B4",23,[
    p.M(-22,-132),p.L(-7,-115),p.L(-14,-105),p.L(1,-87),p.L(-5,-126),p.Z,
    p.M(18,-132),p.L(4,-115),p.L(12,-104),p.L(3,-88),p.L(5,-129),p.Z].join(" "),
    attach(root,0,-118));
  add("prince-gold-braid","#EBC68C",25,[
    p.band(-23,-90,-14,-80,2),p.band(23,-90,15,-80,2),
    p.oval(4,-105,2.1,2.8),p.oval(4,-94,2.1,2.8),p.oval(4,-82,2.1,2.8)].join(" "),
    attach(root,0,-100));
  add("prince-belt","#354957",26,p.band(-25,-81,26,-81,5),attach(root,0,-82));
  add("prince-belt-clasp","#F4D9A2",27,p.oval(4,-81,6,4),
    { ...attach(root,0,-81),holes:[p.oval(4,-81,3.3,2)]});
  add("prince-left-arm","#4B6B87",22,[
    p.M(-25,-130),p.C(-39,-130,-43,-116,-45,-106),
    p.C(-49,-98,-56,-91,-60,-89),p.C(-57,-80,-47,-74,-41,-80),
    p.C(-30,-91,-22,-108,-25,-130),p.Z].join(" "),
    attach(root,-27,-126,{poseKeys:keys(0,0,0,0,phase===2?18:-5,motion)}));
  add("prince-left-cuff","#E7D2AB",25,
    p.band(-62,-86,-48,-80,6),attach("prince-left-arm",-54,-84));
  add("prince-left-hand","#E8BD9F",26,[
    p.M(-61,-84),p.Q(-68,-86,-69,-79),p.Q(-69,-72,-63,-72),
    p.Q(-58,-77,-61,-84),p.Z].join(" "),
    attach("prince-left-arm",-60,-81));
  add("prince-right-arm","#426781",21,[
    p.M(22,-130),p.C(38,-132,45,-118,45,-105),
    p.C(47,-96,50,-87,55,-80),p.C(51,-72,42,-74,38,-83),
    p.C(27,-104,22,-110,22,-130),p.Z].join(" "),
    attach(root,26,-126,{poseKeys:keys(0,0,0,0,phase===2?-14:9,motion)}));
  add("prince-right-cuff","#E1C69E",24,
    p.band(49,-85,59,-78,6),attach("prince-right-arm",53,-83));
  add("prince-right-hand","#EAC2A1",25,[
    p.M(55,-79),p.Q(63,-83,67,-78),p.Q(70,-72,66,-68),
    p.Q(61,-72,55,-74),p.Z].join(" "),
    attach("prince-right-arm",56,-78));
  add("prince-neck","#E3BD9F",22,
    p.poly([[-7,-137],[9,-137],[12,-119],[-11,-118]]),
    attach(root,0,-128));
  add("prince-head","#E6C2A5",24,[
    p.M(-19,-207),p.C(-7,-217,15,-215,25,-199),
    p.Q(28,-189,24,-180),p.L(30,-177),p.Q(28,-171,22,-173),
    p.C(20,-160,8,-151,-5,-156),p.C(-19,-161,-25,-176,-25,-192),p.Z].join(" "),
    attach(root,0,-176,{poseKeys:keys(0,0,0,0,phase===1?-5:2,motion)}));
  add("prince-hair","#3B4359",27,[
    p.M(-23,-195),p.C(-36,-214,-11,-231,8,-224),
    p.C(20,-229,31,-220,30,-207),
    p.C(25,-212,21,-210,18,-202),p.Q(10,-206,5,-199),
    p.C(-7,-203,-17,-192,-22,-186),p.Z].join(" "),attach(face,0,-200));
  add("prince-hair-strands","#687183",28,[
    p.leaf(-15,-212,16,-13,1.6),p.leaf(-2,-215,15,5,1.3),
    p.leaf(12,-216,14,28,1.1)].join(" "),attach(face,0,-204));
  add("prince-eye-brow","#4B4858",29,
    [p.M(9,-187),p.Q(17,-191,23,-185),p.Q(17,-186,9,-187),p.Z,
      p.oval(17,-184,2.1,2.6)].join(" "),attach(face,16,-187));
  add("prince-mouth","#9A7172",28,[
    p.M(17,-167),p.Q(23,-165,26,-167),p.Q(22,-163,17,-167),p.Z].join(" "),
    attach(face,19,-166));
  add("prince-crown","#E8C17E",29,[
    p.M(-23,-217),p.L(-21,-234),p.L(-9,-222),
    p.L(1,-239),p.L(11,-224),p.L(23,-234),p.L(28,-215),
    p.C(10,-210,-11,-211,-23,-217),p.Z].join(" "),attach(face,0,-217));
  add("prince-crown-stones","#91A6BA",30,
    [p.oval(1,-225,2.6,4.1),p.oval(-16,-221,1.6,2.6),
      p.oval(21,-221,1.6,2.6)].join(" "),attach(face,2,-224));
}

function fox(p:Pen,add:Add,phase:number,motion:number){
  const root="fox-body";const attach=(parentId:string,x:number,y:number,rest:Partial<PaperCutLayer>={})=>
    ({parentId,pivot:p.xy(x,y),...rest});
  add("fox-tail","#B87457",14,[
    p.M(-25,-33),p.C(-48,-54,-78,-44,-80,-19),
    p.C(-68,-36,-48,-33,-45,-12),p.C(-33,-9,-18,-22,-25,-33),p.Z].join(" "),
    attach(root,-30,-31,{poseKeys:keys(0,0,0,0,phase===2?-15:13,motion)}));
  add("fox-tail-tip","#F8DEC0",17,[
    p.M(-80,-19),p.C(-76,-31,-67,-34,-57,-29),
    p.C(-64,-23,-66,-15,-61,-10),p.Q(-75,-9,-80,-19),p.Z].join(" "),
    attach("fox-tail",-66,-24));
  add("fox-body","#C87F54",17,[
    p.M(-43,-33),p.C(-30,-53,5,-52,24,-37),
    p.C(44,-35,49,-25,43,-18),p.C(12,-9,-13,-12,-34,-17),p.Z].join(" "),
    {pivot:p.xy(0,-26),poseKeys:phase===1?
      keys(-10,2,18,-9,-3,motion):keys(0,3,0,-3,2,motion)});
  for(const [id,x] of [["rear",-29],["front",28]] as const){
    add("fox-"+id+"-legs","#A5674B",18,[
      p.M(x-9,-27),p.Q(x+1,-23,x+9,-27),p.L(x+8,-3),
      p.Q(x+3,3,x-12,2),p.Q(x-15,-5,x-9,-27),p.Z].join(" "),
      attach(root,x,-24));
  }
  add("fox-chest","#E9D5B9",19,[
    p.M(21,-41),p.Q(30,-31,33,-11),
    p.Q(26,-6,18,-14),p.Q(14,-29,21,-41),p.Z].join(" "),attach(root,20,-32));
  add("fox-head","#D48E5E",20,[
    p.M(24,-57),p.L(27,-81),p.Q(34,-72,37,-64),
    p.L(50,-77),p.L(48,-56),
    p.C(65,-54,71,-44,67,-35),
    p.L(79,-30),p.Q(68,-25,56,-28),
    p.C(43,-23,28,-30,22,-39),p.Z].join(" "),
    attach(root,36,-45,{poseKeys:keys(0,0,0,0,-5,motion)}));
  add("fox-face-patch","#F5DFC2",21,[
    p.M(48,-47),p.Q(64,-43,70,-35),p.L(79,-30),
    p.Q(61,-24,48,-30),p.Q(52,-39,48,-47),p.Z].join(" "),
    attach("fox-head",52,-40));
  add("fox-eye","#35424A",22,
    [p.oval(51,-49,2.6,2.3),p.oval(77,-31,2.1,1.6)].join(" "),
    attach("fox-head",52,-45));
}
function rabbit(p:Pen,add:Add,phase:number,motion:number){
  const root="rabbit-body";const attach=(id:string,x:number,y:number,rest:Partial<PaperCutLayer>={})=>
    ({parentId:id,pivot:p.xy(x,y),...rest});
  add("rabbit-body","#F2E9D3",17,[
    p.M(-19,-30),p.C(-26,-51,-10,-57,2,-48),
    p.C(20,-56,26,-31,22,-20),p.C(16,-6,-13,-6,-23,-18),p.Z].join(" "),
    {pivot:p.xy(0,-30),poseKeys:phase===1?
      keys(-6,0,8,-12,3,motion):keys(0,-1,0,-3,-3,motion)});
  add("rabbit-hind-leg","#D6C6B3",18,[
    p.M(-15,-23),p.C(-27,-16,-27,1,-17,3),
    p.Q(-6,8,5,1),p.Q(-9,-6,-15,-23),p.Z].join(" "),
    attach(root,-12,-16));
  add("rabbit-tail","#FFF7E8",19,p.oval(-24,-27,11,12),
    attach(root,-20,-25));
  add("rabbit-head","#F9EAD7",21,[
    p.M(-10,-51),p.C(-22,-66,-10,-83,9,-75),
    p.Q(27,-73,26,-58),p.C(27,-44,13,-40,2,-43),p.Z].join(" "),
    attach(root,6,-58,{poseKeys:keys(0,0,0,0,3,motion)}));
  for(const [id,x,tilt] of [["left",-5,-12],["right",12,9]] as const){
    add("rabbit-ear-"+id,"#F7EFE2",21,[
      p.M(x-6,-71),p.C(x-15+tilt*.2,-99,x-8+tilt,-126,x+2+tilt,-123),
      p.C(x+13+tilt,-116,x+8,-85,x+5,-72),p.Z].join(" "),
      attach("rabbit-head",x,-73,{poseKeys:keys(0,0,0,0,id==="left"?-5:6,motion)}));
    add("rabbit-ear-inner-"+id,"#D9A5AB",22,[
      p.M(x-3,-76),p.C(x-8+tilt*.2,-98,x-4+tilt,-115,x+2+tilt,-116),
      p.Q(x+9,-96,x+2,-77),p.Z].join(" "),
      attach("rabbit-ear-"+id,x,-90));
  }
  add("rabbit-face","#665964",24,[
    p.oval(15,-61,2.2,2.7),p.oval(24,-54,2.4,1.6),
    p.band(23,-54,18,-48,.75)].join(" "),attach("rabbit-head",15,-61));
  add("rabbit-whiskers","#C3AEA9",24,[
    p.band(22,-53,33,-57,.55),p.band(22,-52,34,-49,.55)].join(" "),
    attach("rabbit-head",23,-52));
}

function deer(p:Pen,add:Add,phase:number,motion:number){
  const root="deer-body";const attach=(id:string,x:number,y:number,rest:Partial<PaperCutLayer>={})=>
    ({parentId:id,pivot:p.xy(x,y),...rest});
  add("deer-body","#B39A84",14,[
    p.M(-36,-62),p.C(-18,-78,14,-68,23,-52),
    p.C(32,-48,30,-32,19,-27),p.C(-8,-20,-31,-34,-38,-48),p.Z].join(" "),
    {pivot:p.xy(0,-55),poseKeys:phase===2?keys(0,4,3,-5,2,motion):keys(0,0,0,0,-2,motion)});
  for(const [n,x] of [["rear",-23],["front",16]] as const){
    add("deer-"+n+"-legs","#9F8672",15,[
      p.M(x-7,-43),p.Q(x+3,-42,x+7,-45),
      p.L(x+3,-4),p.L(x+9,3),p.L(x-10,3),
      p.L(x-6,-21),p.Z].join(" "),attach(root,x,-43));
  }
  add("deer-neck","#A78D78",18,[
    p.M(15,-51),p.C(20,-84,26,-103,36,-119),
    p.Q(44,-132,54,-122),p.C(47,-95,46,-71,28,-44),p.Z].join(" "),
    attach(root,27,-69));
  add("deer-head","#C0A58D",20,[
    p.M(30,-121),p.C(28,-136,45,-146,55,-139),
    p.Q(61,-135,61,-126),p.L(75,-120),p.Q(77,-115,69,-111),
    p.C(55,-108,40,-113,30,-121),p.Z].join(" "),attach("deer-neck",43,-118));
  add("deer-antlers","#D1B69B",19,[
    p.band(42,-136,31,-178,2.8),p.band(31,-163,18,-178,2.5),
    p.band(35,-156,46,-172,2.4),p.band(51,-135,63,-180,2.8),
    p.band(56,-156,74,-171,2.5),p.band(59,-163,55,-185,2.6)].join(" "),
    attach("deer-head",46,-134));
  add("deer-ears","#B99583",21,
    [p.leaf(38,-132,17,-146,5.2),p.leaf(55,-136,17,-32,5.2)].join(" "),
    attach("deer-head",45,-133));
  add("deer-face","#534E51",23,
    [p.oval(59,-128,2.3,2.6),p.oval(73,-118,2.3,1.7),
      p.oval(-16,-60,2.2,2.3),p.oval(5,-58,2.1,2.2),
      p.oval(1,-40,2,2.2)].join(" "),attach(root,40,-119));
}

function owl(p:Pen,add:Add,phase:number,motion:number){
  const root="owl-body";const attach=(id:string,x:number,y:number,rest:Partial<PaperCutLayer>={})=>
    ({parentId:id,pivot:p.xy(x,y),...rest});
  add("owl-body","#AD958A",17,[
    p.M(-26,-38),p.Q(-31,-62,-12,-66),p.L(-6,-76),p.L(2,-67),
    p.Q(15,-68,24,-78),p.L(29,-60),p.Q(34,-27,21,-10),
    p.Q(0,5,-22,-13),p.Z].join(" "),
    {pivot:p.xy(0,-39),poseKeys:keys(0,0,0,-2,2,motion)});
  add("owl-chest","#E8D6BD",18,[
    p.M(-19,-41),p.Q(0,-57,21,-42),p.Q(23,-11,0,-9),
    p.Q(-21,-11,-19,-41),p.Z].join(" "),attach(root,0,-30));
  for(const sign of [-1,1]){
    const n=sign<0?"left":"right";
    add("owl-wing-"+n,"#786F78",19,[
      p.M(sign*18,-47),p.C(sign*35,-45,sign*47,-24,sign*49,-7),
      p.Q(sign*29,-3,sign*19,-17),p.Z].join(" "),
      attach(root,sign*20,-43,{poseKeys:keys(0,0,0,0,phase===2?sign*20:sign*8,motion)}));
    add("owl-eye-"+n,"#F8EAD1",22,p.oval(sign*12,-52,8,9),
      attach(root,sign*12,-52));
    add("owl-pupil-"+n,"#454854",23,p.oval(sign*12+2,-52,2.6,4),
      attach(root,sign*12,-52));
  }
  add("owl-beak","#D5AC6E",24,p.poly([[-4,-46],[6,-45],[1,-36]]),
    attach(root,0,-45));
}
function ornament(p:Pen,add:Add,phase:number){
  const paper=palette[phase],half=phase===2?1:.75;
  const w=phase===2?16:11;
  add("lantern-aurora",paper.spark,8,
    [p.oval(0,-6,43*half,56*half),p.oval(0,-6,27*half,43*half)].join(" "),
    {holes:[p.oval(0,-6,24*half,37*half)]});
  add("lantern-outer","#8B6281",24,[
    p.M(-28,-42),p.Q(0,-68,28,-42),p.L(32,25),
    p.Q(0,44,-32,25),p.Z].join(" "),{
      holes:[p.oval(0,-2,24,31)]});
  add("lantern-heart",paper.moon,26,[
    p.M(0,-30),p.C(-12,-48,-31,-23,0,14),
    p.C(31,-23,12,-48,0,-30),p.Z].join(" "));
  add("lantern-star",paper.spark,27,
    p.poly(Array.from({length:10},(_,i)=>{
      const a=rad(i*36-90),r=i%2?10:22;
      return [Math.cos(a)*r,Math.sin(a)*r-10] as const;
    })));
  add("lantern-hook",paper.trim,28,
    [p.band(0,-67,0,-52,2.8),p.oval(0,-69,4.5,3)].join(" "));
  for(let i=0;i<w;i++){
    const angle=i*360/w,r=47+((i*7)%5)*3,a=rad(angle),x=Math.cos(a)*r,y=-6+Math.sin(a)*r;
    add("lantern-ray-"+i,paper.spark,12,p.leaf(x,y,phase===2?8:5,angle,1.1),{
      motion:"still"});
  }
}
function scenery(w:number,h:number,aspect:PaperDirectorAspect,phase:number,seed:number,add:Add){
  const c=palette[phase],cx=w/2,cy=h/2,
    ground=aspect==="portrait"?188:169,
    width=aspect==="portrait"?220:435,
    p=pen(cx,cy,1);
  add("distant-skycut",c.far,1,[
    p.M(-width-45,ground-171),p.C(-width*.5,ground-224,-width*.26,ground-200,0,ground-194),
    p.C(width*.38,ground-234,width*.72,ground-186,width+45,ground-174),
    p.L(width+50,ground+15),p.L(-width-50,ground+15),p.Z].join(" "));
  add("moon-back",c.trim,2,p.oval(0,aspect==="portrait"?-280:-191,59,59));
  add("moon-face",c.moon,3,p.oval(0,aspect==="portrait"?-280:-191,48,48),{
    holes:[p.oval(15,aspect==="portrait"?-293:-204,7,4),p.oval(-18,aspect==="portrait"?-269:-180,5,6)]});
  const stars=Array.from({length:13},(_,i)=>{
    const x=(i*97+seed*3)%(width*2)-width,
      y=-(aspect==="portrait"?338:218)+(i*31)%92,
      r=1.7+(i%4)*.5;
    return p.poly([[x,y-r],[x+r*.35,y-r*.35],[x+r,y],
      [x+r*.35,y+r*.35],[x,y+r],[x-r*.35,y+r*.35],
      [x-r,y],[x-r*.35,y-r*.35]]);
  }).join(" ");
  add("sky-gold-stars",c.spark,4,stars);
  // One small original storybook castle seen through real negative space.
  const town=pen(cx,cy+ground-115,aspect==="portrait"?.74:1);
  add("castle-walls","#A7A6AD",4,[
    town.M(-65,6),town.L(-65,-65),town.L(-43,-65),town.L(-43,-31),
    town.L(-30,-31),town.L(-30,-81),town.L(-6,-81),town.L(-6,-36),
    town.L(16,-36),town.L(16,-84),town.L(38,-84),town.L(38,-31),
    town.L(65,-31),town.L(65,6),town.Z].join(" "));
  add("castle-rooftops","#7E849C",6,[
    town.poly([[-79,-63],[-53,-109],[-30,-63]]),
    town.poly([[-45,-79],[-18,-124],[8,-79]]),
    town.poly([[6,-84],[27,-121],[48,-84]])].join(" "));
  add("castle-windows",c.spark,7,[
    town.oval(-53,-42,4,8),town.oval(-18,-56,4,8),town.oval(27,-59,4,8),
    town.oval(52,-23,4,7),town.oval(-19,-13,7,13)].join(" "));
  add("back-hills",c.middle,8,[
    p.M(-width-45,ground-50),p.C(-width*.8,ground-115,-width*.55,ground-121,-width*.3,ground-68),
    p.C(0,ground-109,width*.27,ground-101,width*.5,ground-64),
    p.C(width*.75,ground-126,width*.92,ground-102,width+45,ground-65),
    p.L(width+45,ground+80),p.L(-width-45,ground+80),p.Z].join(" "));
  add("mid-hill",c.land,10,[
    p.M(-width-45,ground-22),p.C(-width*.75,ground-48,-width*.44,ground-44,-width*.25,ground-20),
    p.C(width*.08,ground-56,width*.43,ground-40,width*.6,ground-14),
    p.C(width*.86,ground-40,width,ground-48,width+45,ground-18),
    p.L(width+45,ground+60),p.L(-width-45,ground+60),p.Z].join(" "));
  // The open crescent of the creek stays visible between figures.
  add("silver-creek","#83B4B5",11,[
    p.M(-110,ground+67),p.C(-34,ground+21,40,ground+29,88,ground-5),
    p.Q(121,ground-8,151,ground-24),
    p.C(160,ground+16,88,ground+60,38,ground+75),
    p.Q(-43,ground+104,-110,ground+67),p.Z].join(" "));
  add("creek-ripples",c.moon,12,[
    p.band(-63,ground+66,-23,ground+57,1.8),
    p.band(12,ground+66,43,ground+56,1.5),
    p.band(68,ground+42,100,ground+23,1.5)].join(" "));
  // Forest is *rooted* geometry, with forks and cut leaves on each side.
  for(const sign of [-1,1]){
    const side=sign===-1?"left":"right",tx=sign*(width-35);
    const limb=[
      p.band(tx,ground-13,tx-sign*13,ground-225,18),
      p.band(tx-sign*13,ground-225,tx-sign*70,ground-277,11),
      p.band(tx-sign*12,ground-193,tx-sign*102,ground-202,7),
      p.band(tx-sign*48,ground-256,tx-sign*105,ground-300,6.5),
      p.band(tx-sign*80,ground-202,tx-sign*124,ground-239,4.5),
    ].join(" ");
    add("forest-"+side+"-wood","#324B54",16,limb);
    const leaves=Array.from({length:14},(_,i)=>{
      const q=i%7,t=Math.floor(i/7);
      const x=tx-sign*(26+q*16),y=ground-(193+((q*23+t*11)%91));
      const len=13+(i%4)*4;
      return p.leaf(x,y,len,sign===-1?-80+(q%3)*31:-115+(q%3)*26,5.3+(i%3));
    }).join(" ");
    add("forest-"+side+"-foliage",c.leaf,17,leaves);
    add("forest-"+side+"-highlights",c.trim,18,
      Array.from({length:7},(_,i)=>{
        const x=tx-sign*(28+i*20),y=ground-(212+((i*29)%77));
        return p.leaf(x,y,9+i%3,sign===-1?-72:-115,2.8);
      }).join(" "));
  }
  // Wide opaque foreground cardstock; flower stems visibly root into it.
  add("foreground-bank",c.foreground,22,[
    p.M(-width-50,ground),p.C(-width*.52,ground-33,-width*.3,ground+6,0,ground+8),
    p.C(width*.44,ground-11,width*.8,ground+4,width+50,ground-4),
    p.L(width+50,ground+270),p.L(-width-50,ground+270),p.Z].join(" "));
  const stems=Array.from({length:11},(_,i)=>{
    const x=-width+16+(i*83)%(2*width-24),y=ground+8;
    return p.band(x,y,x+((i%3)-1)*6,y-18-i%7,1.6);
  }).join(" ");
  add("meadow-stems",c.leaf,23,stems);
  add("meadow-blooms",phase===2?"#EAC0B2":"#B5ADBF",24,
    Array.from({length:10},(_,i)=>{
      const x=-width+16+(i*83)%(2*width-24),y=ground-10-i%7;
      return Array.from({length:5},(_,j)=>p.leaf(x,y,6,j*72,2.1)).join(" ");
    }).join(" "));
  add("meadow-pistils",c.spark,25,
    Array.from({length:10},(_,i)=>{
      const x=-width+16+(i*83)%(2*width-24),y=ground-10-i%7;
      return p.oval(x,y,2.7,2.7);
    }).join(" "));
  add("stage-frame","#283448",31,
    "M0 0 H"+w+" V"+h+" H0 Z",{
      holes:["M16 16 H"+(w-16)+" V"+(h-16)+" H16 Z"]});
}
export function paperRoyalStoryScene(
  medium:PaperStyle,aspect:PaperDirectorAspect,phase:number,seed=37,motion=.7,
):PaperCraftSpec {
  if (!["layered","kirigami","pop-up","lightbox","shadow-puppet"].includes(medium))
    throw new RangeError("Unknown royal paper style");
  if(aspect!=="landscape"&&aspect!=="portrait")throw new RangeError("Invalid royal paper aspect");
  if(!Number.isInteger(phase)||phase<0||phase>=ROYAL_STORY_BEATS.length)
    throw new RangeError("Royal story phase must be 0, 1 or 2");
  if(!Number.isSafeInteger(seed)||!Number.isFinite(motion)||motion<0||motion>1)
    throw new RangeError("Royal paper seed must be integer and motion finite 0–1");
  const w=aspect==="portrait"?540:960,h=aspect==="portrait"?960:540,
    ground=h/2+(aspect==="portrait"?188:169),
    distance=aspect==="portrait"?111:177,
    actorScale=aspect==="portrait"?.91:1.03;
  const layers:PaperCutLayer[]=[];
  const add:Add=(id,color,depth,path,rest={})=>{
    layers.push({id,color,depth,path,motion:"still",...rest});
  };
  scenery(w,h,aspect,phase,seed,add);
  // Scale around each character's physical contact point, never stretch
  // one aspect's people to fill the other aspect's video rectangle.
  princess(pen(w/2-distance,ground,actorScale),add,phase,motion);
  prince(pen(w/2+distance,ground,actorScale),add,phase,motion);
  fox(pen(w/2+(aspect==="portrait"?48:56),ground-2,actorScale*.85),add,phase,motion);
  rabbit(pen(w/2-(aspect==="portrait"?36:56),ground,actorScale*.71),add,phase,motion);
  deer(pen(w/2+(aspect==="portrait"?206:335),ground-10,actorScale*.72),add,phase,motion);
  owl(pen(w/2-(aspect==="portrait"?179:334),ground-(aspect==="portrait"?185:178),actorScale*.64),
    add,phase,motion);
  const lantern=pen(w/2,ground-(phase===0?179:phase===1?163:195),actorScale*.69);
  ornament(lantern,add,phase);
  if(layers.length>128)throw new RangeError("Royal story exceeds PAPER1 cut-stock budget");
  return {version:1,id:"royal-lantern-"+phase+"-"+aspect,style:medium,
    width:w,height:h,fps:30,durationFrames:240,seed,
    backing:palette[phase].sky,light:palette[phase].moon,
    layers,startAssembled:true,cameraKeys:[
      {frame:0,x:0,y:0,zoom:1.02,ease:"smooth"},
      {frame:120,x:fixed((phase===1?-9:7)*motion),y:fixed(-5*motion),zoom:1.04,ease:"smooth"},
      {frame:239,x:fixed((phase===1?-12:8)*motion),y:0,zoom:1.05},
    ]};
}
export function paperRoyalLanternFilm(
  medium:PaperStyle="layered",seed=37,motion=.7,
):PaperDirectorFilm {
  const shots=ROYAL_STORY_BEATS.map((beat,phase)=>({
    id:beat.id,
    scenes:{
      landscape:paperRoyalStoryScene(medium,"landscape",phase,seed,motion),
      portrait:paperRoyalStoryScene(medium,"portrait",phase,seed,motion),
    },
    ...(phase<2?{transitionOut:{kind:"paper-curtain" as const,
      durationFrames:24,color:phase===0?"#E8D7C8":"#AFC7BD",
      direction:phase===0?"left-to-right" as const:"right-to-left" as const}}:{}),
  }));
  return {version:1,id:"the-moonlit-lantern",shots};
}
