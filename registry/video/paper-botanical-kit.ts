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
import { MAX_PAPER_LAYERS, paperHash } from "./paper-craft";
import type { PaperCraftSpec, PaperCutLayer, PaperStyle } from "./paper-craft";
export type PaperBotanicalAspect = "landscape" | "portrait";

export type PaperBotanicalPalette = "nocturne" | "ivory" | "rainforest" | "wildflower";
export interface PaperBotanicalOptions {
  palette?: PaperBotanicalPalette;
  /** 0–1 controls leaflets and satellite blooms; never a raster filter. */
  detail?: number;
  /** 0–1 controls the number of additional real cardstock pieces, not SVG opacity. */
  colorLayers?: number;
  seed?: number;
}
type Colors = Readonly<{
  backing:string; light:string; mat:string; ring:string; stem:string;
  leaf:string; leafAlt:string; vein:string; petal:string; petalLow:string;
  petalHigh:string; center:string; seed:string; wing:string; wingLow:string;
  wingHigh:string; wingSpot:string; body:string; frame:string;
  leafFlash:readonly string[]; flowerOuter:readonly string[];
  flowerInner:readonly string[]; wingLining:readonly string[];
}>;
const PALETTES: Record<PaperBotanicalPalette,Colors> = {
  nocturne:{
    backing:"#1D343C",light:"#FFE9CB",mat:"#F2E6D4",ring:"#B4A28F",
    stem:"#456C68",leaf:"#75978A",leafAlt:"#AFC0A0",vein:"#D8D8B8",
    petal:"#F8EADC",petalLow:"#CB8490",petalHigh:"#E7BBAF",
    center:"#D8AC65",seed:"#654C53",wing:"#344A65",wingLow:"#7C6D84",
    wingHigh:"#B18798",wingSpot:"#F2DCB3",body:"#253D4F",frame:"#334E51",
    leafFlash:["#CCE1C0","#93C6B9","#E0C5A0","#BBA1CF"],
    flowerOuter:["#AF6B8E","#D59477","#AD829F","#DBAE80","#9FB7A6"],
    flowerInner:["#F9D5A9","#F5C0C3","#E6C4E3","#FFDFBA","#E4D6B6"],
    wingLining:["#F6BC65","#7CD0C0","#E7A6C6"],
  },
  ivory:{
    backing:"#BEB3A1",light:"#FFFFFF",mat:"#F5F0E7",ring:"#D1C5B5",
    stem:"#B0A28E",leaf:"#DFD5C6",leafAlt:"#F9F3E8",vein:"#FFFDF8",
    petal:"#FFFCF6",petalLow:"#E2D5C4",petalHigh:"#F7EDE0",
    center:"#D0BDA4",seed:"#968572",wing:"#D5C5B3",wingLow:"#ECE1D3",
    wingHigh:"#FAF4E9",wingSpot:"#FFFFFF",body:"#998C7C",frame:"#E3D6C5",
    leafFlash:["#FFF7E8","#D4C8BB","#FDF8F1","#DCD5C9"],
    flowerOuter:["#E2D5C5","#F9F2EA","#D1C0B0","#EDE4D7","#D8C6B9"],
    flowerInner:["#FFFFFF","#D9CDBD","#FAF6ED","#E9DDD1","#FFFDF6"],
    wingLining:["#AA9B90","#F7EADF","#E4D6C5"],
  },
  rainforest:{
    backing:"#251A51",light:"#FFDBAA",mat:"#286479",ring:"#F5BC51",
    stem:"#256D54",leaf:"#13B7A3",leafAlt:"#89D870",vein:"#DEF2B3",
    petal:"#FFE8B2",petalLow:"#E951A4",petalHigh:"#FA8E5A",
    center:"#FCD052",seed:"#F77B46",wing:"#38217B",wingLow:"#EA459D",
    wingHigh:"#3BD2C9",wingSpot:"#FFEBBB",body:"#30254F",frame:"#2E2362",
    leafFlash:["#F7D255","#34D7BB","#A5EB78","#58ABD9"],
    flowerOuter:["#F255A6","#F9A846","#AE7AED","#FB6959","#D3EA72"],
    flowerInner:["#FFDC55","#EEABEC","#F4F2C9","#FFB797","#7AE2D1"],
    wingLining:["#FACA39","#4CCFDF","#FF74A8"],
  },
  wildflower:{
    backing:"#4D365B",light:"#FFE4D1",mat:"#F5D5D3",ring:"#D184A6",
    stem:"#306A61",leaf:"#489E84",leafAlt:"#A6BF7A",vein:"#D7E7C5",
    petal:"#FBE6D2",petalLow:"#D5669E",petalHigh:"#F4AE62",
    center:"#EEC858",seed:"#BD615A",wing:"#365395",wingLow:"#9475BF",
    wingHigh:"#E78EA7",wingSpot:"#FFDFB9",body:"#393B6B",frame:"#815574",
    leafFlash:["#F2BA79","#B8DD8C","#77C8B8","#EAB5D0"],
    flowerOuter:["#D85A91","#E79742","#9864BE","#EB7C6F","#ABCA70"],
    flowerInner:["#FFE1BD","#A8C8DD","#FAED96","#FBC2DE","#FAAD85"],
    wingLining:["#EEB956","#5DC5B9","#EFA2BE"],
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

/** Broad, rounded end grain inspired by real cut-paper flower sculptures.
 * Five cubic arcs give each petal a distinct shoulder and curled distal lip.
 */
function roundedPetal(p:Painter,cx:number,cy:number,r:number,angle:number,width:number){
  const ux=Math.cos(angle*R),uy=Math.sin(angle*R),nx=-uy,ny=ux;
  const pt=(a:number,b:number):[number,number]=>
    [cx+ux*r*a+nx*width*b,cy+uy*r*a+ny*width*b];
  const b=pt(.10,0),l=pt(.78,.92),tip=pt(.96,0),rgt=pt(.78,-.92);
  const a=pt(.29,.66),d=pt(.61,1.04),e=pt(1.04,.77),f=pt(1.045,.17);
  const g=pt(1.045,-.17),hh=pt(1.04,-.77),i=pt(.61,-1.04),j=pt(.29,-.66);
  return [p.M(...b),p.C(...a,...d,...l),p.C(...e,...f,...tip),
    p.C(...g,...hh,...rgt),p.C(...i,...j,...b),"Z"].join(" ");
}
function sculptedCorolla(p:Painter,cx:number,cy:number,r:number,n:number,seed:number,tag:number){
  const parts:string[]=[];
  for(let k=0;k<n;k++){
    const angle=-90+k*360/n+(paperHash(seed,tag*31+k,19)-.5)*3.8;
    const length=r*(.92+paperHash(seed,tag*29+k,12)*.13);
    parts.push(roundedPetal(p,cx,cy,length,angle,Math.PI*length/n*.81));
  }
  return [...parts,p.circle(cx,cy,r*.18)].join(" ");
}
const centreHoles=(p:Painter,x:number,y:number,r:number,count:number)=>
  Array.from({length:count},(_,i)=>{const [xx,yy]=at(x,y,i*360/count,r*.54);
    return p.circle(xx,yy,Math.max(1.5,r*.075));});
/** Hand-cut wing contours carry scallops and fine lace, not simple oval silhouettes. */
function upperWing(p:Painter,side:-1|1){
  const x=(a:number)=>a*side;
  return [p.M(x(9),-17),
    p.C(x(52),-88,x(132),-209,x(215),-187),
    p.C(x(245),-185,x(259),-159,x(258),-139),
    p.Q(x(259),-122,x(241),-111),
    p.C(x(262),-100,x(253),-81,x(231),-75),
    p.Q(x(247),-55,x(227),-38),
    p.C(x(208),-18,x(185),-24,x(173),-8),
    p.C(x(141),7,x(89),20,x(55),13),
    p.Q(x(25),8,x(9),-17),"Z"].join(" ");
}
function lowerWing(p:Painter,side:-1|1){
  const x=(a:number)=>a*side;
  return [p.M(x(9),7),
    p.C(x(82),19,x(167),6,x(191),65),
    p.Q(x(216),80,x(213),108),
    p.Q(x(219),128,x(197),136),
    p.C(x(202),166,x(181),187,x(162),184),
    p.C(x(155),222,x(187),240,x(169),258),
    p.Q(x(133),244,x(119),207),
    p.C(x(68),165,x(43),114,x(10),32),"Z"].join(" ");
}
function wingHoles(p:Painter,side:-1|1){
  const x=(v:number)=>v*side;
  const lacy:[number,number,number][]=[
    [172,-149,4.3],[191,-158,4.4],[209,-148,4.1],
    [221,-125,4.5],[224,-102,4.2],[217,-83,4.4],
    [202,-62,3.7],[180,-44,3.3],[157,-35,3.1],
  ];
  return [
    petal(p,x(112),-99,45,side===1?-113:-67,10.2),
    petal(p,x(181),-112,31,side===1?-45:-135,8.6),
    petal(p,x(151),-55,23,side===1?-61:-119,6.3),
    p.circle(x(206),-145,8.6),
    ...lacy.map(([xx,yy,r])=>p.circle(x(xx),yy,r)),
  ];
}
function lowerHoles(p:Painter,side:-1|1){
  const x=(v:number)=>v*side;
  const pearls:[number,number,number][]=[
    [186,94,5.1],[191,117,4.2],[184,140,4.6],
    [167,161,4.4],[146,180,3.9],[115,151,3.6],
  ];
  return [
    petal(p,x(111),92,31,side===1?110:70,8.2),
    petal(p,x(85),53,27,side===1?48:132,5.8),
    ...pearls.map(([xx,yy,r])=>p.circle(x(xx),yy,r)),
  ];
}
/** Small layered veins are separate attached cardstock paths, not painted texture. */
function foreWingVeins(p:Painter,side:-1|1){
  const x=(n:number)=>n*side;
  return [
    leaf(p,x(62),-40,x(169),-149,7,side*6),
    leaf(p,x(76),-25,x(190),-116,6,side*5),
    leaf(p,x(85),-14,x(198),-80,5,side*4),
    leaf(p,x(96),2,x(163),-42,4,side*3),
  ].join(" ");
}
function hindWingVeins(p:Painter,side:-1|1){
  const x=(n:number)=>n*side;
  return [
    leaf(p,x(46),54,x(167),143,6.2,side*4),
    leaf(p,x(57),75,x(144),177,5.2,side*3),
    leaf(p,x(72),83,x(124),121,4.4,side*2),
  ].join(" ");
}
/** The central ribbon and its leaves are one cut-stock design, never a straight wire. */
function vineSheet(p:Painter,x0:number,y0:number,x1:number,y1:number,bend:number){
  const dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
  const width=2.65;
  const c1x=x0+dx*.25+nx*bend,c1y=y0+dy*.25+ny*bend;
  const c2x=x0+dx*.73-nx*bend,c2y=y0+dy*.73-ny*bend;
  const ribbon=[
    p.M(x0+nx*width,y0+ny*width),
    p.C(c1x+nx*width,c1y+ny*width,c2x+nx*width,c2y+ny*width,
      x1+nx*width,y1+ny*width),
    p.L(x1-nx*width,y1-ny*width),
    p.C(c2x-nx*width,c2y-ny*width,c1x-nx*width,c1y-ny*width,
      x0-nx*width,y0-ny*width),"Z",
  ].join(" ");
  const point=(t:number):[number,number]=>{
    const u=1-t;
    return [
      u*u*u*x0+3*u*u*t*c1x+3*u*t*t*c2x+t*t*t*x1,
      u*u*u*y0+3*u*u*t*c1y+3*u*t*t*c2y+t*t*t*y1,
    ];
  };
  const leaves=[.23,.43,.64,.81].map((t,i)=>{
    const [x,y]=point(t),side=i%2===0?1:-1;
    return leaf(p,x,y,x+dx/len*15+nx*side*21,
      y+dy/len*15+ny*side*21,5.4,side*1.5);
  });
  return [ribbon,...leaves].join(" ");
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
  const colorLayers=clamp01(options.colorLayers??1);
  const palette=options.palette??"nocturne",c=PALETTES[palette];
  if (!c) throw new RangeError("Botanical paper palette must be a supported stock family.");
  if (!Number.isSafeInteger(seed)) throw new RangeError("Botanical paper seed must be a safe integer.");
  if (options.colorLayers !== undefined && !Number.isFinite(options.colorLayers))
    throw new RangeError("Botanical colorLayers must be finite.");
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
  if(colorLayers>.12)
    add("chroma-pressed-ring",c.flowerOuter[2],3,p.circle(0,0,284),
      {holes:[p.circle(0,0,278)],enterFrame:18,durationFrames:39,motion:"unfold",pivot:[w/2,h/2]});
  // An eight-frond radial structure forms a real connected pattern, not random leaves.
  const nLeaves=9+Math.round(detail*7);
  const fronds=[-167,-129,-86,-43,-4,39,82,124,167];
  for(const [i,angle] of fronds.entries()){
    const f=fern(p,angle,nLeaves+(i%3)-1);
    add("fern-"+i,i%3===0?c.leafAlt:c.leaf,5+i%3,f.path,{
      holes:f.holes,enterFrame:16+i*7,durationFrames:39,
      motion:"rise",pivot:[w/2,h/2],
    });
    if(i<Math.ceil(colorLayers*fronds.length)){
      // Overlapping enclosed leaflets are independent paper stock, following
      // the same rachis rather than spawning decorative unconnected particles.
      const flash:string[]=[];
      const [stemX,stemY]=at(0,0,angle,146);
      const [tipX,tipY]=at(0,0,angle+11,315);
      const dx=tipX-stemX,dy=tipY-stemY,len=Math.hypot(dx,dy);
      const nx=-dy/len,ny=dx/len;
      for(let j=0;j<6;j++){
        const t=.18+j*.12,side=j%2?1:-1;
        const ax=stemX+dx*t,ay=stemY+dy*t;
        flash.push(leaf(p,ax,ay,
          ax+dx/len*18+nx*side*19,ay+dy/len*18+ny*side*19,5.8,side*2));
      }
      add("fern-"+i+"-chroma",c.leafFlash[i%c.leafFlash.length],8,
        flash.join(" "),{enterFrame:29+i*6,durationFrames:34});
    }
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
    if(i<Math.ceil(5*colorLayers))
      add("flower-"+i+"-outer-stock",c.flowerOuter[i],9,
        sculptedCorolla(p,x,y,rr*1.24,13,seed,i+510),{
          enterFrame:31+i*9,durationFrames:37,
          motion:"unfold",pivot:[p.cx+x*p.s,p.cy+y*p.s]});
    add("flower-"+i+"-under",c.flowerInner[(i+1)%c.flowerInner.length],10,
      sculptedCorolla(p,x,y,rr,11,seed,i+60),{
        enterFrame:36+i*9,durationFrames:36,motion:"unfold",pivot:[p.cx+x*p.s,p.cy+y*p.s]});
    add("flower-"+i+"-top",i%2===0?c.petal:c.petalHigh,12,
      corolla(p,x,y,rr*.69,9,seed,i+90),{
        holes:Array.from({length:9},(_,k)=>{
          const angle=-90+k*40,[sx,sy]=at(x,y,angle,rr*.26),
            [ex,ey]=at(x,y,angle,rr*.48);
          return leaf(p,sx,sy,ex,ey,1.25);
        }),
        enterFrame:44+i*9,durationFrames:31,motion:"unfold",pivot:[p.cx+x*p.s,p.cy+y*p.s]});
    if(i<Math.ceil(5*colorLayers))
      add("flower-"+i+"-inner-stock",c.flowerInner[i],13,
        corolla(p,x,y,rr*.34,11,seed,i+560),{
          enterFrame:57+i*9,durationFrames:29,motion:"unfold",
          pivot:[p.cx+x*p.s,p.cy+y*p.s]});
    add("flower-"+i+"-pollen",c.center,14,p.circle(x,y,rr*.205),{
      holes:centreHoles(p,x,y,rr*.205,9),enterFrame:62+i*8,durationFrames:26});
    if(i<Math.ceil(5*colorLayers)){
      const beads=Array.from({length:7},(_,k)=>{
        const [bx,by]=at(x,y,k*360/7,rr*.135);
        return p.circle(bx,by,Math.max(1.9,rr*.035));
      });
      add("flower-"+i+"-seed-beads",c.seed,15,beads.join(" "),{
        enterFrame:69+i*8,durationFrames:23,motion:"still"});
    }
  }
  const satellites:[number,number][]=[
    [-315,-8],[-300,79],[-105,-312],[107,-305],
    [299,-29],[312,72],[-122,302],[116,304],
  ];
  const bloomCount=4+Math.round(detail*3);
  for(let i=0;i<bloomCount;i++){
    const [x,y]=satellites[i],r=16+paperHash(seed,i,55)*7;
    if(i<Math.ceil(colorLayers*bloomCount))
      add("aster-"+i+"-chroma",c.flowerOuter[i%c.flowerOuter.length],10,
        corolla(p,x,y,r*1.25,9,seed,430+i),{
          enterFrame:29+i*11,durationFrames:32,
          motion:"unfold",pivot:[p.cx+x*p.s,p.cy+y*p.s]});
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
    if(colorLayers>.25)
      add("moth-"+label+"-hind-lining",c.wingLining[1],16,lowerWing(p,side),{
        enterFrame:80,durationFrames:49,motion:"swing",swingDegrees:side*5,
        pivot:[p.cx,p.cy+12*p.s]});
    add("moth-"+label+"-hind",c.wingLow,17,lowerWing(p,side),{
      holes:lowerHoles(p,side),enterFrame:85,durationFrames:48,
      motion:"swing",swingDegrees:side*5,pivot:[p.cx,p.cy+12*p.s]});
    if(colorLayers>.25)
      add("moth-"+label+"-fore-lining",c.wingLining[0],18,upperWing(p,side),{
        enterFrame:87,durationFrames:47,motion:"swing",swingDegrees:side*6,
        pivot:[p.cx,p.cy-14*p.s]});
    add("moth-"+label+"-fore",c.wing,19,upperWing(p,side),{
      holes:wingHoles(p,side),enterFrame:93,durationFrames:45,
      motion:"swing",swingDegrees:side*6,pivot:[p.cx,p.cy-14*p.s]});
    // Broad physical secondary wing stocks cover the basal silhouette,
    // deliberately avoiding the perforated tip and decorative lace openings.
    if(colorLayers>.55){
      const x=(a:number)=>a*side;
      add("moth-"+label+"-hind-panel",c.wingLining[1],18,
        [p.M(x(28),36),
          p.C(x(50),40,x(72),57,x(87),87),
          p.C(x(90),106,x(78),110,x(62),83),
          p.C(x(43),60,x(34),44,x(28),36),"Z"].join(" "),{
          enterFrame:107,durationFrames:34,motion:"swing",swingDegrees:side*5,
          pivot:[p.cx,p.cy+12*p.s]});
      add("moth-"+label+"-fore-panel",c.wingLining[2],20,
        [p.M(x(54),-13),
          p.C(x(70),-46,x(99),-74,x(125),-77),
          p.C(x(140),-74,x(136),-59,x(119),-47),
          p.C(x(93),-23,x(73),-15,x(54),-13),"Z"].join(" "),{
          enterFrame:113,durationFrames:30,motion:"swing",swingDegrees:side*6,
          pivot:[p.cx,p.cy-14*p.s]});
    }
    const fx=(n:number)=>n*side;
    // Layered bands are individually curved cut cards with visible negative gaps.
    add("moth-"+label+"-feather",c.wingHigh,21,foreWingVeins(p,side),{
        enterFrame:108,durationFrames:34});
    add("moth-"+label+"-window",c.wingSpot,22,hindWingVeins(p,side),{
        enterFrame:115,durationFrames:30});
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
    leaf(p,0,-50,0,111,17,3),{
      holes:Array.from({length:6},(_,i)=>p.rect(-8,-13+i*15,8,-10+i*15)),
      enterFrame:118,durationFrames:32,motion:"rise"});
  add("moth-thorax",c.wingSpot,26,
    p.circle(0,-30,16),{holes:[p.circle(0,-30,4)],enterFrame:128,durationFrames:24});
  // Extra shoulder wreaths fill the long axis without stretching individual petals.
  const vertical=aspect==="portrait";
  for(const sign of [-1,1] as const){
    const bx=vertical?sign*21:sign*450,by=vertical?sign*450:sign*22;
    const stem=vertical?
      vineSheet(p,bx,sign*285,bx,by-sign*26,sign*24):
      vineSheet(p,sign*285,by,bx-sign*24,by,sign*24);
    add("aspect-spray-"+(sign<0?"a":"b"),c.stem,4,stem,{
      enterFrame:22,durationFrames:40});
    const bloomX=vertical?bx:bx-sign*24,bloomY=vertical?by-sign*26:by;
    if(colorLayers>.5)
      add("aspect-collar-"+(sign<0?"a":"b"),c.flowerOuter[sign<0?0:1],11,
        corolla(p,bloomX,bloomY,41,11,seed,490+sign),{
          enterFrame:75,durationFrames:35,
          motion:"unfold",pivot:[p.cx+bloomX*p.s,p.cy+bloomY*p.s]});
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
  // Structural bound: no unbounded nested duplicate layers or runtime surprises.
  if(layers.length > MAX_PAPER_LAYERS)
    throw new RangeError("Botanical scene exceeded the cardstock layer budget.");
  return {
    version:1,id:"paper-botanical-"+style+"-"+aspect+"-"+palette,
    style,width:w,height:h,fps:30,durationFrames:240,seed,
    backing:c.backing,light:c.light,layers,
  };
}
