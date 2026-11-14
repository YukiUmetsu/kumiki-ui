/**
 * Original paper-botanical theatre study.
 *
 * Construction vocabulary studied from cut-paper artists: distinct sculptural
 * petals, connected fern rachises, pierced wing motifs, cardstock shadow gaps,
 * and irregular (not cloned) foliage. No third-party art or traced paths.
 *
 * All geometry is authored in a 720-unit design square then transformed into
 * actual output coordinates at one uniform scale. This preserves natural
 * botanical proportions across landscape and portrait film exports.
 */
import { paperHash } from "./paper-craft";
import type { PaperCraftSpec, PaperCutLayer, PaperStyle } from "./paper-craft";
export type PaperBotanicalAspect = "landscape" | "portrait";

export type PaperBotanicalPalette = "nocturne" | "ivory";
export interface PaperBotanicalOptions {
  palette?: PaperBotanicalPalette;
  /** 0-1 controls leaflets and satellite blooms; never a raster filter. */
  detail?: number;
  seed?: number;
}
type Colors = Readonly<{
  backing:string; light:string; mat:string; ring:string; stem:string;
  leaf:string; leafAlt:string; vein:string; petal:string; petalLow:string;
  petalHigh:string; center:string; seed:string; wing:string; wingLow:string;
  wingHigh:string; wingSpot:string; body:string; frame:string;
}>;
const PALETTES: Record<PaperBotanicalPalette,Colors> = {
  nocturne:{
    backing:"#1D343C", light:"#FFE9CB",mat:"#F2E6D4",ring:"#B4A28F",
    stem:"#456C68",leaf:"#75978A",leafAlt:"#AFC0A0",vein:"#D8D8B8",
    petal:"#F8EADC",petalLow:"#CB8490",petalHigh:"#E7BBAF",
    center:"#D8AC65",seed:"#654C53",wing:"#344A65",wingLow:"#7C6D84",
    wingHigh:"#B18798",wingSpot:"#F2DCB3",body:"#253D4F",frame:"#334E51",
  },
  ivory:{
    backing:"#BEB3A1",light:"#FFFFFF",mat:"#F5F0E7",ring:"#D1C5B5",
    stem:"#B0A28E",leaf:"#DFD5C6",leafAlt:"#F9F3E8",vein:"#FFFDF8",
    petal:"#FFFCF6",petalLow:"#E2D5C4",petalHigh:"#F7EDE0",
    center:"#D0BDA4",seed:"#968572",wing:"#D5C5B3",wingLow:"#ECE1D3",
    wingHigh:"#FAF4E9",wingSpot:"#FFFFFF",body:"#998C7C",frame:"#E3D6C5",
  },
};
const clamp01=(n:number)=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):0.8;
const round=(n:number)=>Number(n.toFixed(3));
const R=Math.PI/180;
const at=(x:number,y:number,d:number,r:number):[number,number]=>
  [x+Math.cos(d*R)*r,y+Math.sin(d*R)*r];
type Painter = ReturnType<typeof makePainter>;
function makePainter(w:number,h:number){
  const s=Math.min(w,h)/720,cx=w/2,cy=h/2;
  const xy=(x:number,y:number)=>round(cx+x*s)+" "+round(cy+y*s);
  const M=(x:number,y:number)=>"M"+xy(x,y);
  const L=(x:number,y:number)=>"L"+xy(x,y);
  const Q=(x1:number,y1:number,x2:number,y2:number)=>"Q"+xy(x1,y1)+" "+xy(x2,y2);
  const C=(x1:number,y1:number,x2:number,y2:number,x3:number,y3:number)=>
    "C"+xy(x1,y1)+" "+xy(x2,y2)+" "+xy(x3,y3);
  const circle=(x:number,y:number,r:number)=>{
    const xx=round(cx+(x-r)*s), yy=round(cy+y*s), rr=round(r*s);
    return "M"+xx+" "+yy+" a"+rr+" "+rr+" 0 1 0 "+round(rr*2)+" 0 a"+rr+" "+rr+" 0 1 0 "+round(-rr*2)+" 0 Z";
  };
  const rect=(x1:number,y1:number,x2:number,y2:number)=>
    [M(x1,y1),L(x2,y1),L(x2,y2),L(x1,y2),"Z"].join(" ");
  return {s,cx,cy,M,L,Q,C,circle,rect};
}
/** Curved, tapered paper stock; base, tip and off-axis crown are all joined. */
function leaf(p:Painter,x0:number,y0:number,x1:number,y1:number,width:number,bend=0){
  const dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy);
  const nx=-dy/len,ny=dx/len,mx=(x0+x1)/2+nx*bend,my=(y0+y1)/2+ny*bend;
  return [p.M(x0,y0),
    p.C(x0+dx*.23+nx*width*.75,y0+dy*.23+ny*width*.75,
      mx+nx*width,my+ny*width,x1,y1),
    p.C(mx-nx*width*.68,my-ny*width*.68,
      x0+dx*.13-nx*width*.32,y0+dy*.13-ny*width*.32,x0,y0),"Z"].join(" ");
}
/** Open fern leaflets are separate drawn cut-pieces but overlap the solid rachis. */
function fern(p:Painter,angle:number,count:number){
  const [x0,y0]=at(0,0,angle,146),[x1,y1]=at(0,0,angle+11,315);
  const dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
  const stem=leaf(p,x0,y0,x1,y1,4.1,7);
  const pieces=[stem];
  const holes:string[]=[];
  for(let i=0;i<count;i++){
    const t=.10+.80*i/(count-1),ax=x0+dx*t,ay=y0+dy*t;
    const size=(13+23*Math.sin(Math.PI*t))*(.94+.06*(i%3));
    for(const side of [-1,1]){
      const bx=ax+nx*side*size*.09,by=ay+ny*side*size*.09;
      const tipX=ax+dx/len*size*.60+nx*side*size*.98;
      const tipY=ay+dy/len*size*.60+ny*side*size*.98;
      pieces.push(leaf(p,bx,by,tipX,tipY,Math.max(4,size*.30),side*2.1));
      // A few genuine fine openings, not ink-colored stroke decorations.
      if(i%4===0&&size>20){
        const rootX=bx+(tipX-bx)*.22,rootY=by+(tipY-by)*.22;
        const endX=bx+(tipX-bx)*.69,endY=by+(tipY-by)*.69;
        holes.push(leaf(p,rootX,rootY,endX,endY,1.05));
      }
    }
  }
  return {path:pieces.join(" "),holes};
}
function petal(p:Painter,cx:number,cy:number,r:number,angle:number,width:number){
  const [x0,y0]=at(cx,cy,angle,r*.10),[x1,y1]=at(cx,cy,angle,r*.99);
  const ux=Math.cos(angle*R),uy=Math.sin(angle*R),nx=-uy,ny=ux;
  return [p.M(x0,y0),
    p.C(cx+ux*r*.28+nx*width*.93,cy+uy*r*.28+ny*width*.93,
      cx+ux*r*.78+nx*width*.65,cy+uy*r*.78+ny*width*.65,x1,y1),
    p.C(cx+ux*r*.85-nx*width*.64,cy+uy*r*.85-ny*width*.64,
      cx+ux*r*.23-nx*width*.95,cy+uy*r*.23-ny*width*.95,x0,y0),"Z"].join(" ");
}
function corolla(p:Painter,cx:number,cy:number,r:number,n:number,seed:number,tag:number){
  const parts:string[]=[];
  for(let i=0;i<n;i++){
    const variation=.91+paperHash(seed,tag*29+i,12)*.16;
    const angle=-90+i*360/n+(paperHash(seed,tag*31+i,19)-.5)*3.8;
    parts.push(petal(p,cx,cy,r*variation,angle,Math.PI*r/n*.58));
  }
  parts.push(p.circle(cx,cy,r*.20)); // Physical central bridge joining petal roots.
  return parts.join(" ");
}
const centreHoles=(p:Painter,x:number,y:number,r:number,count:number)=>
  Array.from({length:count},(_,i)=>{const [xx,yy]=at(x,y,i*360/count,r*.54);
    return p.circle(xx,yy,Math.max(1.5,r*.075));});
/** Mirrored, scalloped butterfly wings, with authored pierced decorative windows. */
function upperWing(p:Painter,side:-1|1){
  const x=(a:number)=>a*side;
  return [p.M(x(9),-17),
    p.C(x(51),-82,x(127),-194,x(217),-188),
    p.C(x(270),-174,x(251),-97,x(222),-52),
    p.C(x(198),-15,x(149),-4,x(95),10),
    p.Q(x(44),24,x(9),-17),"Z"].join(" ");
}
function lowerWing(p:Painter,side:-1|1){
  const x=(a:number)=>a*side;
  return [p.M(x(9),7),
    p.C(x(82),20,x(161),5,x(190),69),
    p.C(x(220),115,x(201),168,x(162),185),
    p.C(x(160),221,x(181),239,x(169),258),
    p.C(x(122),225,x(49),125,x(11),30),"Z"].join(" ");
}
function wingHoles(p:Painter,side:-1|1){
  const x=(v:number)=>v*side;
  return [
    petal(p,x(112),-98,46,side===1?-115:-65,10.2),
    petal(p,x(181),-111,32,side===1?-40:-140,9),
    p.circle(x(207),-145,8.8),
    p.circle(x(164),-65,5.5),
  ];
}
function lowerHoles(p:Painter,side:-1|1){
  const x=(v:number)=>v*side;
  return [
    petal(p,x(116),93,32,side===1?115:65,8),
    p.circle(x(163),112,7),
    p.circle(x(141),145,4),
  ];
}
function taperedStroke(p:Painter,x0:number,y0:number,x1:number,y1:number,w:number){
  return leaf(p,x0,y0,x1,y1,w,0);
}
/** Proprietary authored paths are generated, never image-derived or traced. */
export function paperBotanicalSpec(
  style:PaperStyle="layered",
  aspect:PaperBotanicalAspect="landscape",
  options:PaperBotanicalOptions={},
):PaperCraftSpec {
  const w=aspect==="portrait"?540:960,h=aspect==="portrait"?960:540;
  const p=makePainter(w,h),seed=options.seed??37,detail=clamp01(options.detail??.82);
  const palette=options.palette??"nocturne",c=PALETTES[palette];
  if (!Number.isSafeInteger(seed)) throw new RangeError("Botanical paper seed must be a safe integer.");
  const layers:PaperCutLayer[]=[];
  const add=(id:string,color:string,depth:number,path:string,params:Partial<PaperCutLayer>={})=>{
    layers.push({id,color,depth,path,enterFrame:Math.min(148,4+layers.length*2),
      durationFrames:32,motion:"rise",...params});
  };
  // Deep matte, independent concentric cardstock rings, and open light apertures.
  add("matte-medallion",c.mat,1,p.circle(0,0,322),{enterFrame:0,durationFrames:30});
  add("outer-deckle-ring",c.ring,2,p.circle(0,0,332),
    {holes:[p.circle(0,0,317)],enterFrame:5,motion:"unfold",pivot:[w/2,h/2]});
  add("inner-pressed-ring",c.leafAlt,3,p.circle(0,0,251),
    {holes:[p.circle(0,0,246)],enterFrame:16});
  // An eight-frond radial structure forms a real connected pattern, not random leaves.
  const nLeaves=9+Math.round(detail*7);
  const fronds=[-167,-129,-86,-43,-4,39,82,124,167];
  for(const [i,angle] of fronds.entries()){
    const f=fern(p,angle,nLeaves+(i%3)-1);
    add("fern-"+i,i%3===0?c.leafAlt:c.leaf,5+i%3,f.path,{
      holes:f.holes,enterFrame:16+i*7,durationFrames:39,
      motion:"rise",pivot:[w/2,h/2],
    });
    if(i%2===0){
      const [x0,y0]=at(0,0,angle,155),[x1,y1]=at(0,0,angle+11,300);
      add("fern-rachis-"+i,c.vein,8,
        taperedStroke(p,x0,y0,x1,y1,1.35),{
          enterFrame:30+i*6,durationFrames:32,motion:"still"});
    }
  }
  const flowers=[
    [-248,-125,67], [240,-132,64],[-225,149,64],
    [234,168,66],[-35,-251,52],
  ] as const;
  for(const [i,[x,y,r]] of flowers.entries()){
    const offset=(paperHash(seed,i,8)-.5)*9;
    const rr=r+offset;
    add("flower-"+i+"-shadow",c.stem,9,
      corolla(p,x+3,y+5,rr*1.11,9,seed,i+200),{
        enterFrame:28+i*9,durationFrames:36,motion:"unfold",pivot:[p.cx+x*p.s,p.cy+y*p.s]});
    add("flower-"+i+"-under",c.petalLow,10,
      corolla(p,x,y,rr,11,seed,i+60),{
        enterFrame:36+i*9,durationFrames:36,motion:"unfold",pivot:[p.cx+x*p.s,p.cy+y*p.s]});
    add("flower-"+i+"-top",c.petal,12,
      corolla(p,x,y,rr*.69,9,seed,i+90),{
        enterFrame:44+i*9,durationFrames:31,motion:"unfold",pivot:[p.cx+x*p.s,p.cy+y*p.s]});
    add("flower-"+i+"-pollen",c.center,14,p.circle(x,y,rr*.205),{
      holes:centreHoles(p,x,y,rr*.205,9),enterFrame:62+i*8,durationFrames:26});
  }
  const satellites:[number,number][]=[
    [-315,-8],[-300,79],[-105,-312],[107,-305],
    [299,-29],[312,72],[-122,302],[116,304],
  ];
  const bloomCount=4+Math.round(detail*3);
  for(let i=0;i<bloomCount;i++){
    const [x,y]=satellites[i],r=16+paperHash(seed,i,55)*7;
    add("aster-"+i+"-corolla",i%2===0?c.petalHigh:c.petalLow,11,
      corolla(p,x,y,r,7,seed,300+i),{
        enterFrame:35+i*11,durationFrames:31,
        motion:"unfold",pivot:[p.cx+x*p.s,p.cy+y*p.s]});
    add("aster-"+i+"-heart",c.center,15,p.circle(x,y,r*.19),{
      holes:[p.circle(x,y,r*.06)],enterFrame:54+i*11,durationFrames:24});
  }
  // Fine paper curls and seed pods around the perimeter.
  for(let i=0;i<8;i++){
    const angle=i*45-23,[x0,y0]=at(0,0,angle,266),[x1,y1]=at(0,0,angle+10,316);
    // Connected gilded seed-stalk: the head is the same cut sheet as its rachis.
    add("seed-spray-"+i,c.center,8,
      taperedStroke(p,x0,y0,x1,y1,2.7)+" "+p.circle(x1,y1,5.2+paperHash(seed,i,48)*2),{
        enterFrame:40+i*9,durationFrames:33,motion:"still"});
  }
  // Symmetrical wings share a genuine thorax hinge. Perforations are empty paper.
  for(const side of [-1,1] as const){
    const label=side<0?"left":"right";
    add("moth-"+label+"-hind",c.wingLow,17,lowerWing(p,side),{
      holes:lowerHoles(p,side),enterFrame:85,durationFrames:48,
      motion:"swing",swingDegrees:5,pivot:[p.cx,p.cy+12*p.s]});
    add("moth-"+label+"-fore",c.wing,19,upperWing(p,side),{
      holes:wingHoles(p,side),enterFrame:93,durationFrames:45,
      motion:"swing",swingDegrees:6,pivot:[p.cx,p.cy-14*p.s]});
    const fx=(n:number)=>n*side;
    // Layered bands are individually curved cut cards with visible negative gaps.
    add("moth-"+label+"-feather",c.wingHigh,21,
      petal(p,fx(102),-60,119,side===1?-47:-133,20),{
        holes:[p.circle(fx(169),-109,7)],enterFrame:108,durationFrames:34});
    add("moth-"+label+"-window",c.wingSpot,22,
      petal(p,fx(91),66,57,side===1?41:139,12),{
        holes:[p.circle(fx(122),93,4)],enterFrame:115,durationFrames:30});
    add("moth-"+label+"-gold",c.center,23,
      p.circle(fx(188),-127,13),{
        holes:[p.circle(fx(188),-127,5)],enterFrame:122,durationFrames:23});
  }
  add("moth-antennae",c.body,24,
    [
      taperedStroke(p,-6,-56,-52,-108,2.6),
      taperedStroke(p,6,-56,52,-108,2.6),
      p.circle(-52,-108,4.5),p.circle(52,-108,4.5),
    ].join(" "),{enterFrame:118,durationFrames:27,motion:"still"});
  add("moth-abdomen",c.body,25,
    leaf(p,0,-50,0,111,17,3),{enterFrame:118,durationFrames:32,motion:"rise"});
  add("moth-thorax",c.wingSpot,26,
    p.circle(0,-30,16),{holes:[p.circle(0,-30,4)],enterFrame:128,durationFrames:24});
  // Extra shoulder wreaths fill the long axis without stretching individual petals.
  const vertical=aspect==="portrait";
  for(const sign of [-1,1] as const){
    const bx=vertical?sign*21:sign*450,by=vertical?sign*450:sign*22;
    const stem=vertical?
      leaf(p,bx,by-sign*75,bx,by+sign*58,3.8):
      leaf(p,bx-sign*78,by,bx+sign*53,by,3.8);
    add("aspect-spray-"+(sign<0?"a":"b"),c.stem,4,stem,{
      enterFrame:22,durationFrames:40});
    const bloomX=vertical?bx:bx-sign*24,bloomY=vertical?by-sign*26:by;
    add("aspect-bloom-"+(sign<0?"a":"b"),c.petalHigh,12,
      corolla(p,bloomX,bloomY,33,9,seed,400+sign),{
        enterFrame:80,durationFrames:33,
        motion:"unfold",pivot:[p.cx+bloomX*p.s,p.cy+bloomY*p.s]});
    add("aspect-heart-"+(sign<0?"a":"b"),c.center,14,
      p.circle(bloomX,bloomY,6.8),{
        holes:[p.circle(bloomX,bloomY,2)],enterFrame:103,durationFrames:27});
  }
  // Physical framing stock in actual output-sheet coordinates.
  const inset=aspect==="portrait"?15:18;
  add("deckled-card-border",c.frame,30,
    "M0 0 H"+w+" V"+h+" H0 Z",{
      holes:["M"+inset+" "+inset+" H"+(w-inset)+" V"+(h-inset)+
        " H"+inset+" Z"],
      enterFrame:130,durationFrames:28,motion:"still",
    });
  // PAPER1 material evaluator is intentionally bounded at 80 physical sheet layers.
  if (layers.length > 80) throw new RangeError("Botanical scene exceeded 80 cardstock layers.");
  return {
    version:1,id:"paper-botanical-"+style+"-"+aspect+"-"+palette,
    style,width:w,height:h,fps:30,durationFrames:240,seed,
    backing:c.backing,light:c.light,layers,
  };
}
