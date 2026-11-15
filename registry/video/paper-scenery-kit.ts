/**
 * Original PAPER1 scenery: two code-authored, layered cardstock worlds.
 * Reference-informed construction (not traced): shadow-box depth, natural
 * silhouettes, lace-cut tree canopies, individually cut foliage and rock strata.
 */
import { MAX_PAPER_LAYERS, paperHash } from "./paper-craft";
import type { PaperCraftSpec, PaperCutLayer, PaperStyle } from "./paper-craft";

export const PAPER_SCENERIES = ["woodland", "alpine-lake"] as const;
export type PaperScenery = typeof PAPER_SCENERIES[number];
export const PAPER_SCENERY_PALETTES = ["sage", "ember", "moonlight"] as const;
export type PaperSceneryPalette = typeof PAPER_SCENERY_PALETTES[number];
export type PaperSceneryAspect = "landscape" | "portrait";
export interface PaperSceneryOptions {
  scenery?: PaperScenery;
  palette?: PaperSceneryPalette;
  /** Amount of physically constructed fine foliage, stones and snow pieces (0–1). */
  detail?: number;
  /** Strength of small shared-hinge foliage motion (0–1). */
  breeze?: number;
  seed?: number;
}
type Stock = Readonly<{
  backing:string; mat:string; rim:string; light:string; sun:string; mist:string;
  far:string; middle:string; near:string; soil:string; trunk:string; bark:string;
  leaf:string; leafLight:string; accent:string; water:string; ripple:string; snow:string;
}>;
const STOCK:Record<PaperSceneryPalette,Stock>={
  sage:{backing:"#162F37",mat:"#D9D3B6",rim:"#EDD8AA",light:"#F3E7C8",
    sun:"#F5D58E",mist:"#C7D9CF",far:"#9AB9B1",middle:"#699B8B",near:"#427968",
    soil:"#294F48",trunk:"#364D48",bark:"#9BB5A2",leaf:"#3D7763",
    leafLight:"#87B599",accent:"#E9B46D",water:"#7BBDC0",ripple:"#D3E8CF",snow:"#EAF2DA"},
  ember:{backing:"#302A37",mat:"#D2AC9A",rim:"#F5CE9B",light:"#FBE7CD",
    sun:"#FFE2A2",mist:"#E9B5AB",far:"#D9A0A0",middle:"#B67D94",near:"#916679",
    soil:"#584C62",trunk:"#4E4257",bark:"#C9A49A",leaf:"#73586D",
    leafLight:"#DE9E82",accent:"#F2B961",water:"#A2B5BE",ripple:"#F0D7BA",snow:"#FFE9D7"},
  moonlight:{backing:"#152138",mat:"#354A64",rim:"#B6B7BD",light:"#E4E7E2",
    sun:"#F1E7D8",mist:"#B1C4D7",far:"#829BB9",middle:"#5D779B",near:"#3B6181",
    soil:"#263E5B",trunk:"#263348",bark:"#7791AA",leaf:"#35536E",
    leafLight:"#7CA4B1",accent:"#B5B3D0",water:"#538EAC",ripple:"#C3DDE2",snow:"#F4F0E7"},
};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const fixed=(v:number)=>Number(v.toFixed(3));
const radians=(degrees:number)=>degrees*Math.PI/180;
function paperGeometry(w:number,h:number) {
  const scale=Math.min(w,h)/720,cx=w/2,cy=h/2;
  const point=(x:number,y:number)=>fixed(cx+x*scale)+" "+fixed(cy+y*scale);
  const M=(x:number,y:number)=>"M"+point(x,y);
  const L=(x:number,y:number)=>"L"+point(x,y);
  const C=(a:number,b:number,c:number,d:number,e:number,f:number)=>
    "C"+point(a,b)+" "+point(c,d)+" "+point(e,f);
  const Q=(a:number,b:number,c:number,d:number)=>
    "Q"+point(a,b)+" "+point(c,d);
  const Z=" Z";
  const poly=(coords:readonly (readonly [number,number])[])=>
    coords.map(([x,y],i)=>i?L(x,y):M(x,y)).join(" ")+Z;
  const oval=(x:number,y:number,rx:number,ry:number)=>{
    const a=fixed(Math.abs(rx*scale)),b=fixed(Math.abs(ry*scale));
    return M(x-rx,y)+" a"+a+" "+b+" 0 1 0 "+fixed(2*a)+" 0 a"+a+" "+b+" 0 1 0 "+fixed(-2*a)+" 0 Z";
  };
  const band=(x:number,y:number,tx:number,ty:number,width:number)=>{
    const dx=tx-x,dy=ty-y,len=Math.hypot(dx,dy)||1;
    const nx=-dy/len*width/2,ny=dx/len*width/2;
    return poly([[x+nx,y+ny],[tx+nx,ty+ny],[tx-nx,ty-ny],[x-nx,y-ny]]);
  };
  const leaf=(x:number,y:number,length:number,angle:number,width:number)=>{
    const a=radians(angle),ux=Math.cos(a),uy=Math.sin(a),nx=-uy,ny=ux;
    const sample=(t:number,v:number):[number,number]=>[x+ux*length*t+nx*v*width,y+uy*length*t+ny*v*width];
    return [M(...sample(0,0)),C(...sample(.23,.85),...sample(.7,1.05),...sample(1,0)),
      C(...sample(.7,-1.05),...sample(.23,-.85),...sample(0,0)),Z].join(" ");
  };
  const pine=(x:number,foot:number,height:number,wide:number)=>{
    // Repeated staggered cuts are a continuous outline, not separate floating triangles.
    const left:[number,number][]=[],right:[number,number][]=[];
    const rows=6;
    for(let i=0;i<rows;i++){
      const y=foot-i*height/rows;
      const span=wide*(1-i/rows);
      left.push([x-span*.63,y],[x-span,y-height/rows*.24]);
      right.push([x+span,y-height/rows*.24],[x+span*.63,y]);
    }
    return poly([[x-wide*.1,foot+height*.09],...left,[x,foot-height],
      ...right.reverse(),[x+wide*.1,foot+height*.09]]);
  };
  return {scale,cx,cy,M,L,C,Q,Z,poly,oval,band,leaf,pine};
}
type P=ReturnType<typeof paperGeometry>;
type Add=(id:string,color:string,depth:number,path:string,rest?:Partial<PaperCutLayer>)=>void;
function ridge(p:P,xExtent:number,yFloor:number,level:number,amplitude:number,phase:number){
  const n=10,points=Array.from({length:n+1},(_,i)=>{
    const x=-xExtent+i*2*xExtent/n;
    return [x,level+amplitude*(Math.sin(i*.91+phase)*.52+Math.cos(i*1.67+phase)*.19)] as const;
  });
  return [p.M(points[0][0],points[0][1]),
    ...points.slice(1).map((pt,i)=>{
      const prior=points[i];
      return p.Q((prior[0]+pt[0])/2,prior[1],pt[0],pt[1]);
    }),
    p.L(xExtent+10,yFloor+20),p.L(-xExtent-10,yFloor+20),p.Z].join(" ");
}
function smallFern(p:P,x:number,y:number,height:number,side:number,detail:number){
  const tipX=x+side*height*.31,tipY=y-height;
  const bits=[p.band(x,y,tipX,tipY,1.8)];
  const count=4+Math.round(detail*4);
  for(let i=1;i<=count;i++){
    const t=i/(count+1),bx=x+(tipX-x)*t,by=y-height*t;
    const size=(1-t*.7)*height*.34;
    bits.push(p.leaf(bx,by,size,-160+side*12,3.2));
    bits.push(p.leaf(bx,by,size*.84,-20+side*14,2.8));
  }
  return bits.join(" ");
}
function silhouetteTree(p:P,x:number,ground:number,height:number,width:number,lean:number){
  const tipX=x+lean,top=ground-height;
  const path=[p.M(x-width*.75,ground),
    p.C(x-width*.38,ground-height*.33,tipX-width*.2,top+height*.26,tipX-3,top),
    p.L(tipX+3,top),
    p.C(tipX+width*.18,top+height*.32,x+width*.36,ground-height*.28,x+width*.82,ground),
    p.L(x+width*.24,ground+6),p.L(x,ground-16),
    p.L(x-width*.35,ground+7),p.Z].join(" ");
  return {path,top,tipX};
}
/** A filled paper-world within a physical matted aperture. */
function portal(p:P,add:Add,x:number,y:number,c:Stock){
  add("scenery-mat",c.mat,0,p.oval(0,0,x+13,y+13),{motion:"still",enterFrame:0});
  add("scenery-sky",c.light,1,p.oval(0,0,x,y),{motion:"still",enterFrame:0});
}
/** Woodland: luminous opening, 5 landscape planes and physically attached trees. */
function woodland(p:P,add:Add,c:Stock,x:number,y:number,detail:number,breeze:number,seed:number){
  add("woodland-sun-halo",c.mist,2,p.oval(x*.12,-y*.55,66,66),{
    enterFrame:16,durationFrames:35,motion:"rise"});
  add("woodland-sun",c.sun,3,p.oval(x*.12,-y*.55,57,57),{enterFrame:20,durationFrames:33});
  for(let i=0;i<3;i++){
    const cy=-y*.62+i*30,cx=-x*.41+i*23;
    add("woodland-cloud-"+i,i%2?c.mist:c.light,4,
      [p.M(cx-88,cy),p.C(cx-51,cy-13,cx-38,cy-18,cx-16,cy-13),
        p.C(cx+7,cy-38,cx+43,cy-27,cx+57,cy-10),
        p.C(cx+81,cy-13,cx+98,cy-1,cx+106,cy+6),
        p.C(cx+48,cy+10,cx-29,cy+13,cx-88,cy),p.Z].join(" "),{
          enterFrame:24+i*4,curl:.28});
  }
  const planes=[c.mist,c.far,c.middle,c.near,c.soil];
  for(let i=0;i<planes.length;i++){
    add("woodland-hill-"+i,planes[i],5+i,
      ridge(p,x,y,-y*.14+i*y*.17,26+i*3,i*1.15),{
        enterFrame:34+i*10,durationFrames:49,curl:.2+i*.07});
  }
  // Water emerges from between the distant hills and widens toward the viewer.
  add("woodland-stream-under",c.near,12,[
    p.M(-x*.04,y*.07),p.C(-x*.2,y*.3,x*.08,y*.44,-x*.07,y*.59),
    p.C(-x*.17,y*.76,x*.16,y*.9,x*.25,y+20),
    p.L(-x*.32,y+20),p.C(-x*.32,y*.85,-x*.29,y*.7,-x*.2,y*.58),
    p.C(-x*.02,y*.36,-x*.25,y*.28,-x*.04,y*.07),p.Z].join(" "),{enterFrame:76});
  add("woodland-stream",c.water,13,[
    p.M(-x*.04,y*.1),p.C(-x*.16,y*.29,x*.15,y*.44,-x*.04,y*.58),
    p.C(-x*.24,y*.77,x*.11,y*.88,x*.2,y+15),
    p.L(-x*.24,y+15),p.C(-x*.26,y*.84,-x*.2,y*.72,-x*.13,y*.58),
    p.C(x*.03,y*.41,-x*.21,y*.27,-x*.04,y*.1),p.Z].join(" "),{
      enterFrame:80,curl:.45});
  for(let i=0;i<6;i++){
    const yy=y*(.32+i*.11),xx=-x*(.08+.14*Math.sin(i*2.3));
    add("woodland-water-cut-"+i,c.ripple,14,
      p.band(xx-17,yy,xx+14+i*2,yy-2,1.3),{enterFrame:89+i*3});
  }
  // Midground conifers have distinct scalloped notch outlines and a shared footing.
  const farPines=Array.from({length:7+Math.round(detail*5)},(_,i)=>{
    const px=-x*.81+(i/(6+Math.round(detail*5)))*x*1.66;
    const py=y*(.15+.08*Math.sin(i*2.1));
    return p.pine(px,py,43+paperHash(seed,i,4)*26,11+paperHash(seed,i,5)*6);
  });
  add("woodland-far-pines",c.middle,15,farPines.join(" "),{enterFrame:85,curl:.3});
  // Two asymmetric framing trees with branches rooted in the actual trunks.
  for(const [i,sign] of [-1,1].entries()){
    const tx=sign*x*.73,ground=y*.91,height=y*1.79;
    const tree=silhouetteTree(p,tx,ground,height,sign===-1?43:37,-sign*29);
    add("woodland-trunk-"+i,c.trunk,20,tree.path,{enterFrame:89+i*5,curl:.61});
    add("woodland-trunk-grain-"+i,c.bark,21,
      p.band(tx-sign*5,ground-26,tree.tipX-sign*1,tree.top+42,1.8),{
        enterFrame:100+i*5,curl:.4});
    // Broad, branching crown forms the foreground theatre proscenium.
    // Inward boughs meet the negative-space opening rather than just
    // decorating the aperture's side walls.
    const forks=[
      {t:.37,d:-sign*x*.36,len:height*.17},
      {t:.56,d:sign*x*.14,len:height*.14},
      {t:.75,d:-sign*x*.51,len:height*.12},
      {t:.88,d:-sign*x*.31,len:height*.07},
    ];
    for(const [j,f] of forks.entries()){
      const by=ground-height*f.t,bx=tx+(tree.tipX-tx)*f.t;
      const ex=bx+f.d,ey=by-f.len;
      add("woodland-bough-"+i+"-"+j,c.trunk,22,
        [p.M(bx-6,by+10),p.C(bx+f.d*.24,by-17,bx+f.d*.58,ey+24,ex,ey),
          p.C(bx+f.d*.62,ey+36,bx+f.d*.19,by-9,bx+6,by+10),p.Z].join(" "),{
          enterFrame:107+i*5+j*3,curl:.4});
      // Each bough carries a single grouped paper canopy with real leaf tips.
      const leafCount=6+Math.round(detail*7);
      const packets=Array.from({length:leafCount},(_,k)=>{
        const theta=(k-(leafCount-1)/2)/(leafCount-1)*Math.PI*1.1;
        const fx=ex+Math.sin(theta)*49,fy=ey-Math.cos(theta)*25+(k%3)*9;
        return p.band(ex,ey,fx,fy,1.7)+" "+
          p.leaf(fx,fy,27+(k%4)*6,sign*(30+k*14)-108,8.4);
      });
      add("woodland-foliage-"+i+"-"+j,j%2?c.leaf:c.leafLight,23,
        packets.join(" "),{
          enterFrame:119+i*5+j*3,durationFrames:28,curl:.72,
          motion:"flutter",swingDegrees:1.35*breeze,flapHz:.24+j*.025,
          pivot:[p.cx+ex*p.scale,p.cy+ey*p.scale]});
    }
    add("woodland-tree-root-"+i,c.trunk,24,
      [p.M(tx-8,ground-4),p.C(tx-sign*32,ground-12,tx-sign*54,ground+5,
        tx-sign*80,ground+11),
        p.L(tx-sign*43,ground+12),p.L(tx+9,ground+10),p.Z].join(" "),{
          enterFrame:123+i*6});
  }
  add("woodland-bank",c.soil,25,ridge(p,x,y+30,y*.76,13,2.36),{
    enterFrame:119,curl:.32});
  // Lace foliage is built as cut rachises with paired attached leaflets.
  for(let i=0;i<11+Math.round(detail*7);i++){
    const side=i%2?-1:1,px=side*(x*(.08+(i%6)*.059)),py=y*(.81+(i%3)*.018);
    add("woodland-fern-"+i,i%3===0?c.leafLight:c.leaf,26,
      smallFern(p,px,py,60+(i%5)*13,side,detail),{
        enterFrame:124+i*2,durationFrames:24,curl:.62});
  }
  // Foreground water remains visible through the overlapping bank,
  // widening into a joined hand-cut paper channel.
  add("woodland-stream-tail",c.water,26,[
    p.M(-x*.09,y*.51),p.C(-x*.18,y*.69,-x*.3,y*.77,-x*.14,y+.05*y),
    p.L(x*.1,y+.05*y),p.C(-x*.03,y*.83,x*.06,y*.69,-x*.09,y*.51),p.Z
  ].join(" "),{enterFrame:125,curl:.7});
  for(let i=0;i<7;i++){
    const bx=-x*.16+(i%3)*x*.07,by=y*(.64+i*.048);
    add("woodland-bank-pebble-"+i,i%2?c.bark:c.mist,27,
      p.oval(bx,by,3+(i%3)*2,2+(i%2)),{enterFrame:138+i*2,curl:.3});
  }
  // Tiny die-cut wildflower constellations, anchored by visible stems.
  for(let i=0;i<4+Math.round(detail*5);i++){
    const side=i%2?-1:1,x0=side*(x*(.13+(i%3)*.085)),y0=y*.83,tip=y0-29-(i%3)*8;
    add("woodland-flower-stem-"+i,c.leafLight,27,
      [p.M(x0-1.6,y0),p.C(x0+side*5,y0-19,x0+side*9,tip+8,x0+side*11,tip),
        p.L(x0+side*13,tip),p.C(x0+side*11,tip+8,x0+side*8,y0-18,x0+1.6,y0),p.Z].join(" "),{
        enterFrame:142+i*2});
    add("woodland-flower-"+i,i%3?c.accent:c.light,28,
      Array.from({length:7},(_,j)=>p.leaf(x0+side*12,tip,13,j*360/7,4.5)).join(" "),{
        enterFrame:150+i*2,curl:.4});
  }
}
/** Alpine: cut-silhouette peaks, individual snow shelf plates, depth-spaced pines. */
function alpine(p:P,add:Add,c:Stock,x:number,y:number,detail:number,breeze:number,seed:number){
  const sunX=-x*.38,sunY=-y*.60;
  add("alpine-sun-halo",c.mist,2,p.oval(sunX,sunY,61,61),{enterFrame:15});
  add("alpine-sun",c.sun,3,p.oval(sunX,sunY,51,51),{enterFrame:19});
  const mountains=[
    {cx:-x*.65,peak:-y*.83,r:x*.52,h:y*.6,col:c.mist},
    {cx:x*.26,peak:-y*.96,r:x*.63,h:y*.69,col:c.far},
    {cx:x*.81,peak:-y*.64,r:x*.48,h:y*.55,col:c.middle},
  ];
  for(const [i,m] of mountains.entries()){
    const left=m.cx-m.r,right=m.cx+m.r,foot=m.peak+m.h;
    add("alpine-peak-"+i,m.col,5+i,[
      p.M(left,foot+6),p.C(left+m.r*.19,foot-13,m.cx-m.r*.31,m.peak+y*.14,m.cx,m.peak),
      p.C(m.cx+m.r*.16,m.peak+y*.15,right-m.r*.19,foot-6,right,foot+6),
      // Real mountain sheet ends in an irregular hidden foothill contour,
      // never a rectangular full-stage extension with visible vertical seams.
      p.C(right-m.r*.31,foot+y*.17,left+m.r*.31,foot+y*.24,left,foot+6),p.Z].join(" "),{
        enterFrame:31+i*8,durationFrames:51,curl:.55});
    add("alpine-snowcap-"+i,c.snow,8+i,
      p.poly([[m.cx-m.r*.19,m.peak+y*.2],[m.cx-m.r*.095,m.peak+y*.14],
        [m.cx,m.peak],[m.cx+m.r*.095,m.peak+y*.145],
        [m.cx+m.r*.18,m.peak+y*.22],[m.cx+m.r*.10,m.peak+y*.185],
        [m.cx+m.r*.04,m.peak+y*.25],[m.cx-m.r*.045,m.peak+y*.2],
        [m.cx-m.r*.11,m.peak+y*.26]]),{
          enterFrame:50+i*6,durationFrames:31,curl:.64});
    for(let j=0;j<2;j++){
      const side=j?1:-1;
      add("alpine-rock-facet-"+i+"-"+j,j?c.middle:c.mist,12,
        p.poly([[m.cx,m.peak+y*.17],[m.cx+side*m.r*.11,m.peak+y*.25],
          [m.cx+side*m.r*.32,m.peak+y*.55],[m.cx+side*m.r*.22,m.peak+y*.43],
          [m.cx+side*m.r*.09,m.peak+y*.39]]),{
          enterFrame:64+i*5+j*3,curl:.83});
    }
    // More detail adds small *physical paper* moraine cuts, not texture noise.
    for(let j=0;j<Math.round(detail*3);j++){
      const xx=m.cx-m.r*.21+j*m.r*.14,yy=m.peak+y*(.24+j*.085);
      add("alpine-scree-"+i+"-"+j,c.snow,11,
        p.poly([[xx,yy],[xx+7,yy-11],[xx+16,yy+5],[xx+6,yy+8]]),{
          enterFrame:72+j*3});
    }
  }
  add("alpine-distant-pines",c.near,13,
    Array.from({length:10+Math.round(detail*7)},(_,i)=>{
      const xx=-x*.9+i*(x*1.83)/(9+Math.round(detail*7));
      return p.pine(xx,y*.22+Math.sin(i*1.8)*9,45+paperHash(seed,i,7)*31,14);
    }).join(" "),{enterFrame:82,curl:.3});
  add("alpine-lake-bank",c.middle,14,
    ridge(p,x,y+12,y*.3,26,2.1),{enterFrame:86,durationFrames:34});
  add("alpine-lake",c.water,15,[
    p.M(-x,y*.41),p.C(-x*.36,y*.38,x*.38,y*.35,x,y*.43),
    p.L(x,y*.91),p.C(x*.47,y*.81,-x*.4,y*.82,-x,y*.97),p.Z
  ].join(" "),{enterFrame:92,curl:.48});
  add("alpine-lake-far-shore",c.near,16,
    ridge(p,x,y+11,y*.42,12,.7),{enterFrame:98});
  for(let i=0;i<10+Math.round(detail*5);i++){
    const yy=y*(.52+i*.028),w=20+(i%4)*18;
    const xx=-x*.64+(i%6)*x*.26;
    add("alpine-reflection-"+i,i%4?c.ripple:c.mist,17,
      p.band(xx,yy,xx+w,yy-1.7,1.45+(i%3)*.3),{
        enterFrame:113+i*2,curl:.22});
  }
  // Front escarpments frame the water on two separate material planes.
  for(const [i,side] of [-1,1].entries()){
    const hx=side*x;
    const rock=p.poly([[side*x*.28,y*.90],[side*x*.32,y*.69],
      [side*x*.38,y*.53],[side*x*.49,y*.57],
      [side*x*.64,y*.37],[side*x*.82,y*.43],
      [hx,y*.45],[hx,y+18],[side*x*.24,y+18]]);
    add("alpine-ledge-"+i,i?c.soil:c.near,19,rock,{enterFrame:102+i*6,curl:.76});
    for(let j=0;j<3+Math.round(detail*3);j++){
      const px=side*(x*(.24+j*.064)),py=y*(.66+(j%3)*.038);
      add("alpine-pine-"+i+"-"+j,j%3===0?c.trunk:c.leaf,22,
        p.pine(px,py,56+paperHash(seed,j+i*17,22)*50,17+(j%3)*4),{
          enterFrame:112+i*9+j*3,curl:.48,
          motion:"flutter",swingDegrees:breeze*.3,flapHz:.19+j*.01,
          pivot:[p.cx+px*p.scale,p.cy+py*p.scale]});
      if(j<2+Math.round(detail*2)){
        add("alpine-boulder-"+i+"-"+j,c.bark,23,
          [p.M(px-21,py+5),p.L(px-9,py-7),p.Q(px+3,py-11,px+13,py-2),
            p.L(px+20,py+7),p.Z].join(" "),{
              enterFrame:135+j*2,curl:.58});
      }
    }
  }
  add("alpine-foreground",c.soil,25,ridge(p,x,y+20,y*.85,14,1.8),{
    enterFrame:132});
  for(let i=0;i<9+Math.round(detail*5);i++){
    const side=i%2?-1:1,px=side*(x*(.1+(i%5)*.065)),py=y*(.78+(i%3)*.016);
    add("alpine-moss-"+i,i%3?c.leaf:c.leafLight,26,
      smallFern(p,px,py,46+(i%4)*12,side,detail),{
        enterFrame:139+i*2,curl:.43});
  }
  // A small flight in the open distance gives scale without opaque sprites.
  for(let i=0;i<3+Math.round(detail*3);i++){
    const bx=x*.05+i*28,by=-y*.66+(i%3)*11;
    add("alpine-bird-"+i,c.trunk,18,[
      p.M(bx-12,by),p.Q(bx-5,by-8,bx,by+1),
      p.Q(bx+6,by-8,bx+13,by),p.Q(bx+5,by-4,bx,by+4),
      p.Q(bx-5,by-3,bx-12,by),p.Z].join(" "),{
        enterFrame:145+i*3});
  }
}
function matFrame(p:P,add:Add,w:number,h:number,x:number,y:number,c:Stock){
  // Frame is a true even-odd die-cut aperture, opaque outside its opening.
  add("scenery-frame",c.backing,30,
    "M0 0 H"+w+" V"+h+" H0 Z",{
      holes:[p.oval(0,0,x+3,y+3)],enterFrame:164,durationFrames:28,motion:"still"});
  add("scenery-edge-inlay",c.rim,31,p.oval(0,0,x+9,y+9),{
    holes:[p.oval(0,0,x+4,y+4)],enterFrame:174,motion:"still"});
}
/** Returns a deterministic, finite, fully opaque film-ready paper landscape. */
export function paperScenerySpec(
  style:PaperStyle="layered",
  aspect:PaperSceneryAspect="landscape",
  options:PaperSceneryOptions={},
):PaperCraftSpec{
  const scenery=options.scenery??"woodland",palette=options.palette??"sage";
  if(!PAPER_SCENERIES.includes(scenery))throw new RangeError("Unknown paper scenery.");
  if(!PAPER_SCENERY_PALETTES.includes(palette))throw new RangeError("Unknown paper scenery palette.");
  if(aspect!=="landscape"&&aspect!=="portrait")throw new RangeError("Unknown paper scenery aspect.");
  const seed=options.seed??37;
  if(!Number.isSafeInteger(seed))throw new RangeError("Paper scenery seed must be a safe integer.");
  for(const [name,value] of [["detail",options.detail],["breeze",options.breeze]] as const){
    if(value!==undefined&&(!Number.isFinite(value)||value<0||value>1))
      throw new RangeError("Paper scenery "+name+" must be finite in [0,1].");
  }
  const detail=clamp(options.detail??.9),breeze=clamp(options.breeze??.5);
  const w=aspect==="portrait"?540:960,h=aspect==="portrait"?960:540;
  const p=paperGeometry(w,h),c=STOCK[palette],x=aspect==="portrait"?316:517,
    y=aspect==="portrait"?514:292;
  const layers:PaperCutLayer[]=[];
  const add:Add=(id,color,depth,path,rest={})=>{
    layers.push({id,color,depth,path,motion:"rise",
      enterFrame:Math.min(160,8+layers.length*2),durationFrames:34,...rest});
  };
  portal(p,add,x,y,c);
  if(scenery==="woodland")woodland(p,add,c,x,y,detail,breeze,seed);
  else alpine(p,add,c,x,y,detail,breeze,seed);
  matFrame(p,add,w,h,x,y,c);
  if(layers.length>MAX_PAPER_LAYERS)throw new RangeError("Paper scenery exceeded 128 cut layers.");
  return {version:1,id:"paper-scenery-"+scenery+"-"+aspect+"-"+palette,style,
    width:w,height:h,fps:30,durationFrames:240,seed,backing:c.backing,
    light:c.light,layers};
}
