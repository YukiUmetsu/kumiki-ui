/**
 * Original, reusable 2.5D cardstock sculpture objects.
 *
 * Craft references (construction methods only, no assets or traced contours):
 * Diana Beltran Herrera: sculpted bird plumage and insect venation;
 * Helen Musselwhite: layered canal-side architectural silhouettes;
 * Jennifer Collier: paper camera and teacup craftsmanship.
 *
 * Every visible cut piece is a closed SVG contour with opaque hex stock.
 * Scene geometry uses one uniform coordinate system in portrait and landscape.
 */
import { MAX_PAPER_LAYERS, paperHash } from "./paper-craft";
import type { PaperCraftSpec, PaperCutLayer, PaperStyle } from "./paper-craft";

export const PAPER_OBJECTS = ["kingfisher","dragonfly","canal-houses","camera","teacup"] as const;
export type PaperObject = typeof PAPER_OBJECTS[number];
export type PaperObjectAspect = "landscape" | "portrait";
export const PAPER_OBJECT_PALETTES = ["jewel","pastel","heritage"] as const;
export type PaperObjectPalette = typeof PAPER_OBJECT_PALETTES[number];
export interface PaperObjectOptions {
  object?: PaperObject;
  palette?: PaperObjectPalette;
  /** 0–1: number of detail feathers, wing veins, facade embellishments. */
  detail?: number;
  /** 0–1: multiply authored cardstock curvature (non-mesh shading cue). */
  curl?: number;
  /** 0–1: scale ongoing linked wing-beat amplitude; zero freezes the rig. */
  motion?: number;
  /** 0–1 amount of geometric folded-tip projection and cast shadow. */
  relief?: number;
  seed?: number;
}
type Stock = Readonly<{
  backing:string;mat:string;rim:string;dark:string;deep:string;
  blue:string;blueLight:string;green:string;greenLight:string;
  gold:string;coral:string;pink:string;cream:string;white:string;
  ink:string;paper:string;accent:string;
}>;
const STOCKS:Record<PaperObjectPalette,Stock>={
  jewel:{
    backing:"#142E3B",mat:"#2E5962",rim:"#D9A45A",dark:"#233D4B",deep:"#192E40",
    blue:"#197D9B",blueLight:"#65C7C5",green:"#2D806C",greenLight:"#99C7A1",
    gold:"#F4C35D",coral:"#DF7A55",pink:"#DA7294",cream:"#F8E1BD",
    white:"#FFF3E1",ink:"#24334A",paper:"#C8AB8A",accent:"#BA7EC0",
  },
  pastel:{
    backing:"#504C6C",mat:"#AFCACD",rim:"#F5CDAB",dark:"#72617B",deep:"#474665",
    blue:"#5DA7BE",blueLight:"#C5E9E3",green:"#80A996",greenLight:"#C6D6B7",
    gold:"#F4D48D",coral:"#EA9F8D",pink:"#DEA8CB",cream:"#FFF0DF",
    white:"#FFFCF4",ink:"#3F5572",paper:"#D1B8AE",accent:"#9A8CBD",
  },
  heritage:{
    backing:"#433841",mat:"#A99377",rim:"#D6B27F",dark:"#514956",deep:"#332F3C",
    blue:"#45637C",blueLight:"#A4BBC7",green:"#507361",greenLight:"#BAC8A2",
    gold:"#DFAF59",coral:"#B56C52",pink:"#C58D8D",cream:"#E9D8B7",
    white:"#FFF1D4",ink:"#353645",paper:"#C1A88B",accent:"#80708D",
  },
};
const clamp=(n:number)=>Math.min(1,Math.max(0,n));
const num=(v:number)=>Number(v.toFixed(3));
const rad=(d:number)=>d*Math.PI/180;
function geometry(w:number,h:number){
  const s=Math.min(w,h)/720,cx=w/2,cy=h/2;
  const pt=(x:number,y:number)=>num(cx+s*x)+" "+num(cy+s*y);
  const M=(x:number,y:number)=>"M"+pt(x,y);
  const L=(x:number,y:number)=>"L"+pt(x,y);
  const C=(x1:number,y1:number,x2:number,y2:number,x3:number,y3:number)=>
    "C"+pt(x1,y1)+" "+pt(x2,y2)+" "+pt(x3,y3);
  const Q=(x1:number,y1:number,x2:number,y2:number)=>"Q"+pt(x1,y1)+" "+pt(x2,y2);
  const Z=" Z";
  const poly=(points:readonly (readonly [number,number])[])=>
    points.map(([x,y],i)=>i?L(x,y):M(x,y)).join(" ")+Z;
  const oval=(x:number,y:number,rx:number,ry:number)=>{
    const a=num(Math.abs(rx*s)),b=num(Math.abs(ry*s));
    return M(x-rx,y)+" a"+a+" "+b+" 0 1 0 "+num(2*a)+" 0 a"+a+" "+b+" 0 1 0 "+num(-2*a)+" 0 Z";
  };
  const disk=(x:number,y:number,r:number)=>oval(x,y,r,r);
  const rect=(x:number,y:number,rw:number,rh:number)=>poly([
    [x,y],[x+rw,y],[x+rw,y+rh],[x,y+rh]
  ]);
  const roundRect=(x:number,y:number,rw:number,rh:number,r:number)=>
    [M(x+r,y),L(x+rw-r,y),Q(x+rw,y,x+rw,y+r),
      L(x+rw,y+rh-r),Q(x+rw,y+rh,x+rw-r,y+rh),
      L(x+r,y+rh),Q(x,y+rh,x,y+rh-r),
      L(x,y+r),Q(x,y,x+r,y),Z].join(" ");
  const taper=(x0:number,y0:number,x1:number,y1:number,wide:number,bend=0)=>{
    const dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
    return [M(x0,y0),
      C(x0+dx*.25+nx*(wide*.8+bend),y0+dy*.25+ny*(wide*.8+bend),
        x1-dx*.29+nx*wide*.7,y1-dy*.29+ny*wide*.7,x1,y1),
      C(x1-dx*.22-nx*wide*.65,y1-dy*.22-ny*wide*.65,
        x0+dx*.2-nx*wide*.5,y0+dy*.2-ny*wide*.5,x0,y0),Z].join(" ");
  };
  const petal=(x:number,y:number,length:number,angle:number,width:number)=>{
    const ux=Math.cos(rad(angle)),uy=Math.sin(rad(angle)),nx=-uy,ny=ux;
    const p=(t:number,b:number):[number,number]=>[x+ux*length*t+nx*b*width,y+uy*length*t+ny*b*width];
    const o=p(.08,0),l=p(.73,.95),tip=p(.97,0),right=p(.73,-.95);
    return [M(...o),C(...p(.29,.75),...p(.62,1.06),...l),
      C(...p(1.05,.69),...p(1.05,.15),...tip),
      C(...p(1.05,-.15),...p(1.05,-.69),...right),
      C(...p(.62,-1.06),...p(.29,-.75),...o),Z].join(" ");
  };
  /** Two joined cards, each with its own silhouette and small base/tip overlap.
   * Rotating the distal piece now reveals a real, raised cardstock edge. */
  const feather=(x0:number,y0:number,x1:number,y1:number,width:number)=>{
    const dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy)||1;
    const ux=dx/len,uy=dy/len,nx=-uy,ny=ux;
    const f=(t:number,v:number):[number,number]=>[
      x0+dx*t+nx*width*v,y0+dy*t+ny*width*v];
    const base=[
      M(...f(0,-.20)),
      C(...f(.15,-.82),...f(.41,-1.04),...f(.755,-.68)),
      L(...f(.755,.68)),
      C(...f(.41,1.04),...f(.15,.82),...f(0,.20)),Z
    ].join(" ");
    const tip=[
      M(...f(.74,-.7)),
      C(...f(.84,-.7),...f(.96,-.43),...f(1,0)),
      C(...f(.96,.43),...f(.84,.7),...f(.74,.7)),Z
    ].join(" ");
    const h=f(.745,0);
    return {base,tip,hinge:[cx+s*h[0],cy+s*h[1]] as const};
  };
  const band=(x0:number,y0:number,x1:number,y1:number,thick:number)=>{
    const dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy)||1,nx=-dy/len*thick/2,ny=dx/len*thick/2;
    return poly([[x0+nx,y0+ny],[x1+nx,y1+ny],[x1-nx,y1-ny],[x0-nx,y0-ny]]);
  };
  return {s,cx,cy,M,L,C,Q,Z,poly,oval,disk,rect,roundRect,taper,petal,feather,band};
}
type P=ReturnType<typeof geometry>;
type Add=(id:string,color:string,depth:number,path:string,rest?:Partial<PaperCutLayer>)=>void;
const flower=(p:P,add:Add,id:string,x:number,y:number,r:number,c:Stock,seed:number,count=9,depth=11)=>{
  const rng=(i:number)=>paperHash(seed,i,12);
  add(id+"-under",c.coral,depth,Array.from({length:count},(_,i)=>
    p.petal(x,y,r*(.9+.13*rng(i)),i*360/count-90,r*.29)).join(" "),{
      enterFrame:65,durationFrames:32,motion:"unfold",pivot:[p.cx+x*p.s,p.cy+y*p.s]
    });
  add(id+"-rim",c.pink,depth+1,Array.from({length:count},(_,i)=>
    p.petal(x,y,r*.71,i*360/count-90+12,r*.2)).join(" "),{
      enterFrame:73,durationFrames:32,motion:"unfold",pivot:[p.cx+x*p.s,p.cy+y*p.s]
    });
  add(id+"-eye",c.gold,depth+2,p.disk(x,y,r*.19),{
    holes:Array.from({length:6},(_,i)=>p.disk(x+Math.cos(rad(i*60))*r*.10,
      y+Math.sin(rad(i*60))*r*.10,Math.max(1.3,r*.018))),
    enterFrame:91,durationFrames:23});
};
function setting(p:P,add:Add,aspect:PaperObjectAspect,c:Stock,seed:number){
  const w=aspect==="portrait"?540:960,h=aspect==="portrait"?960:540;
  add("stage-mat",c.mat,0,p.oval(0,0,330,290),{enterFrame:0,motion:"still"});
  add("stage-carved-border",c.rim,1,p.oval(0,0,347,305),{
    holes:[p.oval(0,0,329,289)],enterFrame:2,motion:"still"});
  add("stage-inner-rim",c.cream,2,p.oval(0,0,307,267),{
    holes:[p.oval(0,0,302,262)],enterFrame:4,motion:"still"});
  // Long-format flourishes are always attached to a decorative paper strip.
  for(const sign of [-1,1]){
    const vertical=aspect==="portrait";
    const x=vertical?0:sign*453,y=vertical?sign*485:0;
    const x0=vertical?0:sign*285,y0=vertical?sign*269:0;
    add("stage-flourish-"+sign,c.green,3,p.taper(x0,y0,x,y,5,sign*9),{
      enterFrame:16,durationFrames:36,motion:"rise"});
    for(let i=0;i<5;i++){
      const t=(i+1)/6,ax=x0+(x-x0)*t,ay=y0+(y-y0)*t;
      const dx=vertical?(i%2?-26:26):sign*20,dy=vertical?sign*20:(i%2?-24:24);
      add("stage-leaf-"+sign+"-"+i,i%2?c.greenLight:c.blueLight,4,
        p.taper(ax,ay,ax+dx,ay+dy,6),{enterFrame:24+i*4,durationFrames:29});
    }
  }
  add("stage-frame",c.dark,30,
    "M0 0 H"+w+" V"+h+" H0 Z",{
      holes:["M18 18 H"+(w-18)+" V"+(h-18)+" H18 Z"],
      enterFrame:151,durationFrames:29,motion:"still"
    });
  void seed;
}
/** Kingfisher anatomy: perched feet, throat, beak, folded coverts, individual feather stock. */
function kingfisher(p:P,add:Add,c:Stock,detail:number,seed:number){
  add("bird-branch-shadow",c.dark,7,p.taper(-344,177,319,148,24,-11),{enterFrame:18});
  add("bird-branch",c.paper,8,p.taper(-332,166,303,137,17,-9),{enterFrame:24});
  add("bird-bark",c.cream,9,p.taper(-293,164,-75,154,2),{enterFrame:35,motion:"still"});
  for(let i=0;i<7;i++){
    const x=-290+i*78,by=164-(x+300)*.045,up=i%2===0?-1:1;
    add("branch-leaf-"+i,i%3===0?c.gold:i%2?c.greenLight:c.green,10,
      p.taper(x,by,x-18,by+up*(29+i%3*7),10,4),{enterFrame:28+i*5});
  }
  // Tail feathers tuck beneath the body and overlap the branch in the same plane.
  for(let i=0;i<9;i++){
    add("kingfisher-tail-"+i,i%3===0?c.blueLight:i%2?c.ink:c.blue,11,
      p.taper(-111,-1,-224+i*7,156+i*2,7.5,4),{enterFrame:30+i*3,curl:.45});
  }
  add("kingfisher-body-shadow",c.dark,12,[
    p.M(-125,-77),p.C(-84,-135,-10,-116,43,-66),p.C(65,-20,37,86,-24,132),
    p.C(-85,175,-157,93,-125,-77),p.Z].join(" "),{enterFrame:36});
  add("kingfisher-orange-breast",c.coral,13,[
    p.M(-79,-67),p.C(-22,-105,54,-53,49,17),p.C(44,93,-3,143,-51,133),
    p.C(-96,107,-114,11,-79,-67),p.Z].join(" "),{enterFrame:41});
  add("kingfisher-white-belly",c.cream,14,[
    p.M(-29,-47),p.C(11,-55,42,-24,35,32),p.C(26,88,5,111,-26,107),
    p.C(-42,87,-54,-11,-29,-47),p.Z].join(" "),{enterFrame:47});
  add("kingfisher-back",c.blue,15,[
    p.M(-132,-75),p.C(-99,-125,-25,-116,5,-83),p.C(-58,-66,-46,56,-105,100),
    p.C(-153,82,-167,-2,-132,-75),p.Z].join(" "),{enterFrame:48});
  add("kingfisher-wing-base",c.ink,16,[
    p.M(-107,-64),p.C(-80,-94,-33,-79,-14,-43),p.C(-26,15,-68,79,-112,99),
    p.C(-139,50,-147,-19,-107,-64),p.Z].join(" "),{
      enterFrame:61,motion:"flutter",swingDegrees:5,flapHz:.65,flapPhase:0,
      rigGroup:"kingfisher-wing",curl:.5,pivot:[p.cx-85*p.s,p.cy-55*p.s]});
  add("kingfisher-wing-coverts",c.blueLight,17,[
    p.M(-112,-54),p.C(-68,-90,-35,-63,-34,-20),p.C(-59,28,-88,49,-113,69),
    p.C(-128,33,-139,-20,-112,-54),p.Z].join(" "),{
      enterFrame:67,motion:"flutter",swingDegrees:5,flapHz:.65,flapPhase:0,
      rigGroup:"kingfisher-wing",curl:.7,pivot:[p.cx-85*p.s,p.cy-55*p.s]});
  const feathers=11+Math.round(detail*7);
  for(let i=0;i<feathers;i++){
    const t=i/(feathers-1),x=-105+64*t,y=-34+62*t;
    const card=p.feather(x,y,x-16-21*t,y+42+17*t,5.4+(i%3)*.65);
    add("wing-feather-"+i,i%3===0?c.gold:i%2?c.blue:c.blueLight,18,
      card.base,{
        liftedTip:{path:card.tip,hinge:card.hinge,
          rotateDegrees:(i%2?-1:1)*(9+(i%4)*2.5),lift:5+(i%3)*2},
        enterFrame:69+i*2,durationFrames:25,motion:"flutter",swingDegrees:5,flapHz:.65,
        flapPhase:0,rigGroup:"kingfisher-wing",curl:.92,
        pivot:[p.cx-85*p.s,p.cy-55*p.s]});
  }
  for(let i=0;i<10;i++){
    const x=-30+i*4.7,y=58+i%2*7;
    add("breast-feather-"+i,i%3===0?c.gold:c.coral,17,
      p.taper(x,y,x-7,y+22,2.8),{enterFrame:75+i*2,durationFrames:22});
  }
  // Repeated overlapping cut-card feather tips create a real scale rhythm,
  // instead of a single flat painted orange breast region.
  for(let i=0;i<12;i++){
    const col=i%4,row=Math.floor(i/4);
    const x=-67+col*19+row*4,y=-17+row*30+(col%2)*4;
    add("breast-scale-"+i,i%3===0?c.gold:i%2?c.coral:c.cream,17,
      p.petal(x,y,23,77+row*6,5.5),{enterFrame:76+i*2,durationFrames:24,curl:.8});
  }
  // Head separates mask, crest, cap and eye; no translucent overlays.
  add("kingfisher-head",c.blue,19,[
    p.M(-20,-116),p.C(6,-156,80,-158,117,-108),
    p.C(131,-73,107,-24,68,-16),p.C(19,-10,-22,-48,-20,-116),p.Z].join(" "),{enterFrame:94});
  add("kingfisher-face-band",c.cream,20,[
    p.M(45,-70),p.C(65,-56,100,-52,113,-65),
    p.C(109,-42,91,-37,57,-44),p.C(43,-48,40,-57,45,-70),p.Z].join(" "),{enterFrame:103});
  add("kingfisher-cheek",c.coral,21,p.taper(71,-56,115,-50,11),{enterFrame:106});
  for(let i=0;i<9;i++){
    add("head-crest-"+i,i%2?c.blueLight:c.ink,21,
      p.taper(8+i*10,-123,25+i*10,-148-5*Math.sin(i*.5),4.2),{enterFrame:104+i*2,durationFrames:20});
  }
  for(let i=0;i<10;i++){
    const x=-8+i*11,y=-104+Math.sin(i*.41)*8;
    add("head-crown-feather-"+i,i%3===0?c.white:c.blueLight,22,
      p.taper(x,y,x+10,y-24,2.8,1),{enterFrame:111+i*2,durationFrames:20,curl:.88});
  }
  add("kingfisher-eye-mask",c.ink,22,p.oval(87,-86,16,11),{enterFrame:112});
  add("kingfisher-eye",c.white,23,p.disk(88,-89,5),{enterFrame:116,durationFrames:22});
  add("kingfisher-pupil",c.ink,24,p.disk(91,-89,2.7),{enterFrame:120});
  add("kingfisher-beak-lower",c.coral,21,p.poly([[112,-67],[278,-74],[129,-58]]),{enterFrame:107});
  add("kingfisher-beak-upper",c.deep,23,p.poly([[109,-77],[278,-76],[124,-61]]),{enterFrame:111});
  add("beak-light-strip",c.blueLight,24,p.taper(130,-73,251,-74,1.7),{enterFrame:117});
  // Toes join the branch. Each foot has a visible ankle.
  for(const [i,x] of [-29,13].entries()){
    add("kingfisher-ankle-"+i,c.gold,21,p.band(x,112,x-5,160,5.3),{enterFrame:112});
    for(let j=0;j<3;j++){
      add("kingfisher-talon-"+i+"-"+j,c.coral,22,p.taper(x-5,158,x-23+j*16,169,4),{
        enterFrame:119+j*3,durationFrames:26});
    }
  }
  void seed;
}
/** Four anatomically separated wings and segmented abdomen with true windows. */
function dragonfly(p:P,add:Add,c:Stock,detail:number,seed:number){
  // Plant footing: all stems attach to the lower mat and never float as dots.
  for(const side of [-1,1]){
    for(let i=0;i<5;i++){
      const x=side*(192+i*27),y=239;
      add("reed-"+side+"-"+i,i%2?c.greenLight:c.green,8,
        p.taper(x,y,x-side*16,y-75-i%3*22,5,side*4),{enterFrame:20+i*6});
    }
  }
  const wings=[
    {side:-1,front:true,y:-47,dx:-274,dy:-163,angle:12},
    {side:1,front:true,y:-47,dx:274,dy:-163,angle:-12},
    {side:-1,front:false,y:8,dx:-257,dy:93,angle:21},
    {side:1,front:false,y:8,dx:257,dy:93,angle:-21},
  ];
  for(const [wi,w] of wings.entries()){
    const rootX=w.side*18,rootY=w.y,tipX=w.dx,tipY=w.dy;
    const name="dragonfly-wing-"+wi;
    const upper=[
      p.M(rootX,rootY),
      p.C(rootX+w.side*72,rootY-87,tipX-w.side*34,tipY-75,tipX,tipY),
      p.C(tipX-w.side*22,tipY+71,rootX+w.side*57,rootY+35,rootX,rootY),
      p.Z].join(" ");
    const holes=Array.from({length:7},(_,j)=>{
      const t=.28+j*.087,x=rootX+(tipX-rootX)*t;
      const y=rootY+(tipY-rootY)*t+(j%2?-10:10);
      return p.oval(x,y,7+(1-t)*5,3.2+(1-t)*1.7);
    });
    const pivot:[number,number]=[p.cx+rootX*p.s,p.cy+rootY*p.s];
    const beat={motion:"flutter" as const,rigGroup:name,
      swingDegrees:w.side*(w.front?10:8),flapHz:2.1,
      flapPhase:w.front?0:100,pivot};
    add(name+"-rear",w.front?c.blueLight:c.greenLight,12,upper,{
      enterFrame:48+wi*5,durationFrames:45,curl:.5,...beat});
    add(name+"-lace",w.front?c.blue:c.gold,14,upper,{
      holes,enterFrame:61+wi*5,durationFrames:43,curl:.65,...beat});
    const n=6+Math.round(detail*4);
    for(let j=0;j<n;j++){
      const t=.15+j/(n-1)*.7,rx=rootX+(tipX-rootX)*t,ry=rootY+(tipY-rootY)*t;
      add(name+"-vein-"+j,j%2?c.white:c.cream,15,
        p.taper(rootX+w.side*5,rootY,rx,ry+(j%2?19:-19),1.55),{
        enterFrame:73+wi*4+j,durationFrames:22,...beat});
    }
  }
  // Body sits on top of the four wing root attachments.
  add("dragonfly-abdomen-core",c.ink,16,p.taper(0,-8,0,229,14),{enterFrame:55});
  for(let i=0;i<12;i++){
    const y=22+i*17.1,r=18-12*i/12;
    add("dragonfly-abdomen-segment-"+i,i%3===0?c.gold:i%2?c.blue:c.green,18,
      p.oval(0,y,r,11),{enterFrame:78+i*4,durationFrames:23});
    add("dragonfly-abdomen-stripe-"+i,c.cream,19,p.taper(-r*.45,y-2,r*.45,y-2,1.8),{
      enterFrame:91+i*3,durationFrames:20});
  }
  add("dragonfly-thorax",c.dark,21,p.oval(0,-28,26,63),{enterFrame:102});
  add("dragonfly-thorax-lining",c.blue,22,p.oval(0,-32,18,53),{enterFrame:107});
  add("dragonfly-head",c.green,23,p.oval(0,-112,37,29),{enterFrame:114});
  for(const side of [-1,1]){
    add("dragonfly-compound-eye-"+side,side===1?c.blueLight:c.gold,24,
      p.oval(side*29,-114,18,18),{enterFrame:118});
    add("dragonfly-eye-halo-"+side,c.ink,25,p.disk(side*31,-116,6),{enterFrame:127});
    for(let i=0;i<3;i++)
      add("dragonfly-leg-"+side+"-"+i,c.deep,22,
        p.taper(side*14,-5+i*13,side*(43+i*5),21+i*25,2.9),{enterFrame:111+i*4});
  }
  flower(p,add,"dragonfly-meadow-left",-208,180,43,c,seed);
  flower(p,add,"dragonfly-meadow-right",218,195,37,c,seed+7);
}
/** Canal-side architecture: interconnected facades, pierced windows, readable roofs. */
function houses(p:P,add:Add,c:Stock,detail:number,seed:number){
  add("canal-water",c.blue,6,p.rect(-331,172,662,90),{enterFrame:14});
  add("canal-water-highlight",c.blueLight,7,p.taper(-300,205,300,201,4,2),{enterFrame:23});
  add("house-pavement",c.paper,8,p.rect(-336,141,670,37),{enterFrame:27});
  const models=[
    {id:"left",x:-268,w:172,top:-111,roof:-190,col:c.coral,trim:c.cream},
    {id:"center",x:-97,w:202,top:-146,roof:-241,col:c.blue,trim:c.white},
    {id:"right",x:104,w:172,top:-106,roof:-188,col:c.green,trim:c.gold},
  ];
  for(const [i,m] of models.entries()){
    const base=9+i;
    // Stone footings bridge all buildings to the same street.
    add("house-"+m.id+"-foundation",c.dark,base,
      p.rect(m.x-4,131,m.w+8,28),{enterFrame:20+i*9});
    add("house-"+m.id+"-facade-shadow",c.deep,base+1,
      p.rect(m.x+6,m.top+4,m.w,136-m.top),{enterFrame:25+i*8});
    const windows=[
      {x:m.x+26,y:m.top+56,w:36,h:53},
      {x:m.x+m.w-62,y:m.top+56,w:36,h:53},
      {x:m.x+26,y:m.top+124,w:36,h:43},
      {x:m.x+m.w-62,y:m.top+124,w:36,h:43},
    ].filter(q=>q.y+q.h<131);
    const doorX=m.x+m.w/2-23;
    add("house-"+m.id+"-facade",m.col,base+2,
      p.rect(m.x,m.top,m.w,134-m.top),{
        holes:[...windows.map(q=>p.roundRect(q.x,q.y,q.w,q.h,3)),
          p.roundRect(doorX,49,46,85,8)],
        enterFrame:35+i*8,durationFrames:48});
    add("house-"+m.id+"-roof-shadow",c.deep,base+3,
      p.poly([[m.x-16,m.top+5],[m.x+m.w/2,m.roof-8],[m.x+m.w+17,m.top+5]]),{
        enterFrame:45+i*8,durationFrames:34,motion:"unfold",
        pivot:[p.cx+(m.x+m.w/2)*p.s,p.cy+m.top*p.s]});
    add("house-"+m.id+"-roof",m.trim,base+4,
      p.poly([[m.x-15,m.top-3],[m.x+m.w/2,m.roof],[m.x+m.w+16,m.top-3]]),{
        liftedTip:{
          path:p.poly([[m.x-15,m.top-3],[m.x+26,m.top-24],[m.x+52,m.top-3]]),
          hinge:[p.cx+(m.x+5)*p.s,p.cy+(m.top-13)*p.s],
          rotateDegrees:i%2?-7:7,lift:4,
        },
        enterFrame:49+i*8,durationFrames:36,motion:"unfold",curl:.45,
        pivot:[p.cx+(m.x+m.w/2)*p.s,p.cy+m.top*p.s]});
    add("house-"+m.id+"-roof-inset",c.dark,base+5,
      p.poly([[m.x+2,m.top-8],[m.x+m.w/2,m.roof+27],[m.x+m.w-2,m.top-8]]),{
        enterFrame:58+i*8,durationFrames:29});
    add("house-"+m.id+"-upper-oval",c.gold,base+6,p.oval(m.x+m.w/2,m.top-22,14,20),{
      holes:[p.oval(m.x+m.w/2,m.top-22,7,11)],enterFrame:64+i*8});
    for(const [j,q] of windows.entries()){
      add("house-"+m.id+"-window-"+j,c.ink,base+4,
        p.roundRect(q.x+3,q.y+3,q.w-6,q.h-6,2),{enterFrame:64+i*7+j*2});
      add("house-"+m.id+"-window-cross-"+j,m.trim,base+5,
        p.band(q.x+q.w/2,q.y+4,q.x+q.w/2,q.y+q.h-4,3)+
        " "+p.band(q.x+3,q.y+q.h*.53,q.x+q.w-3,q.y+q.h*.53,3),{enterFrame:70+i*7+j*2});
      add("house-"+m.id+"-sill-"+j,c.cream,base+6,
        p.rect(q.x-3,q.y+q.h+1,q.w+6,4),{enterFrame:76+i*7+j*2});
    }
    add("house-"+m.id+"-door",c.ink,base+6,p.roundRect(doorX+3,53,40,81,7),{
      enterFrame:90+i*8});
    add("house-"+m.id+"-door-ornament",m.trim,base+7,
      p.oval(doorX+23,76,9,15),{holes:[p.oval(doorX+23,76,4,8)],enterFrame:103+i*6});
    add("house-"+m.id+"-door-knob",c.gold,base+8,p.disk(doorX+34,107,3.8),{
      enterFrame:115+i*5});
    const bricks=3+Math.round(detail*5);
    for(let j=0;j<bricks;j++){
      const bx=m.x+9+(j%2)*(m.w-24),by=m.top+20+j*20;
      if(by>32)continue;
      add("house-"+m.id+"-trim-"+j,m.trim,base+7,
        p.rect(bx,by,5,12),{enterFrame:83+j*4});
    }
  }
  // A single wrought lamppost joins the street plane.
  add("street-lamp-pole",c.ink,19,p.band(301,145,301,-29,5),{enterFrame:103});
  add("street-lamp-cap",c.dark,20,p.poly([[283,-38],[319,-38],[306,-61],[296,-61]]),{enterFrame:109});
  add("street-lamp-glass",c.gold,21,p.roundRect(291,-36,22,39,4),{
    holes:[p.rect(297,-29,10,22)],enterFrame:114});
  add("street-lamp-base",c.deep,21,p.oval(301,144,20,5),{enterFrame:119});
  // Balustrade and scattered coloured flowers anchored to the street.
  add("canal-parapet",c.dark,19,p.band(-335,174,334,174,8),{enterFrame:121});
  for(let j=0;j<9;j++){
    const x=-300+j*75;
    add("canal-fence-post-"+j,c.cream,20,p.band(x,145,x,193,3.3),{enterFrame:119+j*2});
  }
  void seed;
}
/** Layered camera lens geometry and controls, not a flat rectangle with a dot. */
function camera(p:P,add:Add,c:Stock,detail:number,seed:number){
  add("camera-table-shadow",c.deep,7,p.oval(0,179,264,42),{enterFrame:21});
  add("camera-table-top",c.paper,8,p.roundRect(-315,169,630,28,7),{enterFrame:27});
  // Strap: a genuine punched paper band, attached to two camera lugs.
  add("camera-strap",c.coral,9,p.oval(-30,-30,306,188),{
    holes:[p.oval(-30,-30,289,171)],enterFrame:34,durationFrames:44,motion:"unfold",curl:.8,
    pivot:[p.cx,p.cy-18*p.s]});
  add("camera-back-slab",c.deep,11,p.roundRect(-235,-116,464,257,23),{enterFrame:41});
  add("camera-main-body",c.ink,12,p.roundRect(-223,-111,446,249,20),{enterFrame:47});
  add("camera-metal-top",c.paper,13,p.roundRect(-222,-121,442,59,13),{enterFrame:52});
  add("camera-leather-front",c.dark,14,p.roundRect(-206,-54,412,176,10),{enterFrame:59});
  add("camera-front-plate",c.blue,15,p.roundRect(-204,4,408,112,8),{enterFrame:65});
  // Stitch-like embossed edge marks: individual paper stripes with true depth.
  const stitchCount=9+Math.round(detail*13);
  for(let i=0;i<stitchCount;i++){
    const x=-189+i*376/(stitchCount-1);
    add("camera-stitched-detail-"+i,c.gold,16,p.rect(x,105,4.3,3),{enterFrame:73+i*2,durationFrames:18});
  }
  add("camera-viewfinder-base",c.deep,16,p.roundRect(-172,-95,78,47,8),{enterFrame:72});
  add("camera-viewfinder-glass",c.blueLight,17,p.roundRect(-163,-89,59,34,4),{enterFrame:79});
  add("camera-viewfinder-edge",c.white,18,
    p.roundRect(-161,-87,56,29,4),{holes:[p.roundRect(-157,-83,48,21,2)],enterFrame:84});
  for(const [i,x] of [-146,-87,152].entries()){
    add("camera-dial-rim-"+i,c.cream,17,p.oval(x,-127,20,10),{enterFrame:62+i*5});
    add("camera-dial-core-"+i,c.dark,18,p.oval(x,-127,12,6),{enterFrame:68+i*5});
    for(let k=0;k<7;k++){
      const a=rad(k*360/7);
      add("camera-dial-tick-"+i+"-"+k,c.gold,19,
        p.disk(x+Math.cos(a)*15,-127+Math.sin(a)*7,1.6),{enterFrame:91+i*4});
    }
  }
  // Concentric physical lens tubes and a deep, visibly open aperture.
  for(const [i,r] of [140,125,110,95,81,67,53].entries()){
    const palette=[c.deep,c.paper,c.ink,c.gold,c.blue,c.deep,c.blueLight];
    add("camera-lens-ring-"+i,palette[i],20+i,
      p.oval(43,19,r,r*.88),{
        holes:[p.oval(43,19,r-10,r*.88-10)],
        enterFrame:89+i*5,durationFrames:32,motion:"rise"});
  }
  add("camera-lens-glass",c.deep,28,p.oval(43,19,43,37),{enterFrame:130});
  add("camera-lens-reflection",c.blue,29,p.oval(43,19,28,25),{enterFrame:136});
  add("camera-lens-highlight",c.blueLight,29,p.oval(31,5,10,7),{enterFrame:142});
  add("camera-shutter",c.gold,17,p.oval(174,-86,13,8),{enterFrame:90});
  add("camera-shutter-center",c.white,18,p.disk(174,-87,4),{enterFrame:95});
  void seed;
}
/** Teacup and citrus: curved cut-paper cylinder, hollow handle, cup rim and sliced fruit. */
function teacup(p:P,add:Add,c:Stock,detail:number,seed:number){
  add("tea-table-shadow",c.deep,7,p.oval(0,181,285,43),{enterFrame:20});
  add("tea-napkin",c.greenLight,8,p.poly([[-298,99],[-124,83],[27,218],[-265,235]]),{
    liftedTip:{
      path:p.poly([[-298,99],[-228,94],[-257,145]]),
      hinge:[p.cx-266*p.s,p.cy+119*p.s],
      rotateDegrees:-13,lift:7,
    },
    enterFrame:25,motion:"unfold",pivot:[p.cx-200*p.s,p.cy+100*p.s]});
  add("tea-napkin-fold",c.cream,9,p.poly([[-298,99],[-124,83],[-228,165]]),{enterFrame:34});
  add("tea-saucer-outer",c.cream,10,p.oval(6,158,219,45),{enterFrame:38});
  add("tea-saucer-shadow",c.paper,11,p.oval(5,149,190,31),{enterFrame:44});
  add("tea-saucer-rim",c.white,12,p.oval(5,146,177,26),{
    holes:[p.oval(5,147,147,17)],enterFrame:50});
  add("tea-handle-back",c.gold,12,p.oval(166,30,85,84),{
    holes:[p.oval(170,30,52,54)],enterFrame:53,durationFrames:40,curl:.6});
  add("tea-handle-inner",c.paper,13,p.oval(166,30,70,73),{
    holes:[p.oval(171,30,50,53)],enterFrame:60,durationFrames:40});
  add("tea-cup-body-shadow",c.dark,14,[
    p.M(-160,-74),p.C(-162,-5,-122,143,-73,156),
    p.C(-20,177,95,169,122,126),p.C(143,99,165,16,163,-74),p.Z].join(" "),{enterFrame:59});
  add("tea-cup-body",c.cream,15,[
    p.M(-158,-83),p.C(-150,0,-120,118,-69,135),
    p.C(-12,162,90,145,113,115),p.C(137,64,151,-15,158,-83),p.Z].join(" "),{enterFrame:67,curl:.8});
  add("tea-cup-color-band",c.blue,16,[
    p.M(-148,56),p.C(-89,80,74,81,143,53),
    p.C(139,81,128,111,111,117),p.C(29,150,-79,143,-119,115),
    p.C(-133,96,-141,78,-148,56),p.Z].join(" "),{enterFrame:78});
  add("tea-cup-rim-shadow",c.paper,18,p.oval(0,-81,163,40),{enterFrame:89});
  add("tea-cup-rim-porcelain",c.white,19,p.oval(0,-91,162,38),{
    holes:[p.oval(0,-94,138,27)],enterFrame:98});
  add("tea-liquid",c.coral,17,p.oval(0,-92,131,22),{enterFrame:84});
  add("tea-rim-glint",c.white,20,p.taper(-106,-103,108,-104,1.8),{enterFrame:108});
  // Raised three-dimensional paper decal is attached to the cup body.
  flower(p,add,"tea-botanical-emblem",-20,21,46,c,seed,8,20);
  for(let i=0;i<7;i++){
    const x=-103+i*31;
    add("tea-cup-embossed-leaf-"+i,i%2?c.green:c.greenLight,20,
      p.taper(x,91,x+9,112,5.3),{enterFrame:118+i*2,durationFrames:21});
  }
  // Citrus slice: three concentric paper rings, radial pulp segments.
  add("tea-citrus-shadow",c.dark,12,p.disk(-237,147,55),{enterFrame:41});
  add("tea-citrus-peel",c.gold,13,p.disk(-240,141,53),{enterFrame:46});
  add("tea-citrus-pith",c.white,14,p.disk(-240,141,45),{enterFrame:51});
  const segments=7+Math.round(detail*3);
  for(let i=0;i<segments;i++){
    const angle=i*360/segments;
    add("tea-citrus-segment-"+i,c.coral,15,
      p.petal(-240,141,38,angle,9.2),{enterFrame:57+i*3,durationFrames:25,curl:.55});
  }
  add("tea-citrus-center",c.cream,16,p.disk(-240,141,8),{enterFrame:94});
  // Spoon rests on the saucer, with clearly hollow bowl.
  add("tea-spoon-handle",c.paper,16,p.band(172,142,311,154,7),{enterFrame:88});
  add("tea-spoon-bowl",c.gold,17,p.oval(163,140,29,14),{enterFrame:98});
  add("tea-spoon-well",c.white,18,p.oval(162,137,21,9),{enterFrame:108});
}
/** Create an original paper relief object suitable for Storybook and FilmStage. */
export function paperObjectSpec(
  style:PaperStyle="layered",
  aspect:PaperObjectAspect="landscape",
  options:PaperObjectOptions={},
):PaperCraftSpec {
  const object=options.object??"kingfisher",palette=options.palette??"jewel",seed=options.seed??37;
  if(!PAPER_OBJECTS.includes(object))throw new RangeError("Unknown paper object.");
  if(!PAPER_OBJECT_PALETTES.includes(palette))throw new RangeError("Unknown paper object palette.");
  if(aspect!=="landscape"&&aspect!=="portrait")throw new RangeError("Unknown paper object aspect.");
  if(!Number.isSafeInteger(seed))throw new RangeError("Paper object seed must be a safe integer.");
  if(options.detail!==undefined&&(!Number.isFinite(options.detail)||options.detail<0||options.detail>1))
    throw new RangeError("Paper object detail must be finite between 0 and 1.");
  for(const [key,value] of [["curl",options.curl],["motion",options.motion],["relief",options.relief]] as const)
    if(value!==undefined&&(!Number.isFinite(value)||value<0||value>1))
      throw new RangeError("Paper object "+key+" must be finite between 0 and 1.");
  const detail=clamp(options.detail??.85),curlAmount=options.curl??.85,motionAmount=options.motion??1,reliefAmount=options.relief??1,c=STOCKS[palette];
  const w=aspect==="portrait"?540:960,h=aspect==="portrait"?960:540,p=geometry(w,h);
  const layers:PaperCutLayer[]=[];
  const add:Add=(id,color,depth,path,rest={})=>{
    layers.push({id,color,depth,path,enterFrame:Math.min(148,5+layers.length*2),
      durationFrames:34,motion:"rise",...rest});
  };
  setting(p,add,aspect,c,seed);
  switch(object){
    case "kingfisher":kingfisher(p,add,c,detail,seed);break;
    case "dragonfly":dragonfly(p,add,c,detail,seed);break;
    case "canal-houses":houses(p,add,c,detail,seed);break;
    case "camera":camera(p,add,c,detail,seed);break;
    case "teacup":teacup(p,add,c,detail,seed);break;
  }
  if(layers.length>MAX_PAPER_LAYERS)throw new RangeError("Paper object exceeded bounded cardstock budget.");
  // Adjust authored sheet curvature and rig amplitude without changing geometry,
  // sheet count, deterministic assembly cues or all other paper media.
  const shaped=layers.map(layer=>({
    ...layer,
    curl:layer.curl===undefined?undefined:layer.curl*curlAmount,
    liftedTip:layer.liftedTip===undefined?undefined:{
      ...layer.liftedTip,
      rotateDegrees:layer.liftedTip.rotateDegrees*reliefAmount,
      lift:layer.liftedTip.lift*reliefAmount,
    },
    swingDegrees:layer.motion==="flutter"
      ? (layer.swingDegrees??8)*motionAmount :layer.swingDegrees,
  }));
  // Renderer sorts by depth, not declaration order; frame construction remains pure.
  return {version:1,id:"paper-object-"+object+"-"+aspect+"-"+palette,
    style,width:w,height:h,fps:30,durationFrames:240,seed,
    backing:c.backing,light:c.cream,layers:shaped};
}
