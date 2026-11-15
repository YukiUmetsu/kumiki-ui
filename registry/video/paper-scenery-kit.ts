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
  /** Physical paper-depth separation, 0 = flat sheets, 1 = full relief. */
  relief?: number;
  /** Variation in real tree species, branching and canopy profiles (0–1). */
  treeVariety?: number;
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
/** Species have independent hand-cut bough grammars, not a stretched generic pine. */
export const PAPER_CONIFER_SPECIES=["spruce","fir","larch"] as const;
export type PaperConiferSpecies=(typeof PAPER_CONIFER_SPECIES)[number];
function speciesFor(seed:number,i:number,variety:number):PaperConiferSpecies{
  // Zero variety = a regular spruce stand. Higher values introduce genuinely
  // different bough contours and silhouette densities, deterministically.
  const families=1+Math.min(2,Math.floor(variety*2.999+1e-8));
  return PAPER_CONIFER_SPECIES[Math.min(families-1,
    Math.floor(paperHash(seed,i,97)*families))];
}

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
  /**
   * A single connected, closed cardstock tree, rooted at the ground.
   *
   * SPRUCE: dense, sharply drooping needle tiers.
   * FIR: broader, flatter and more widely spaced tiered boughs.
   * LARCH: open, tapering boughs and a slender central spar.
   *
   * Each tree has its own seeded left/right branch asymmetry, whorl count,
   * crown taper and local tip notches; all variation is fixed across frames.
   */
  const conifer=(x:number,foot:number,height:number,wide:number,
    species:PaperConiferSpecies,treeSeed:number,detail:number)=>{
    const rows=(species==="spruce"?8:species==="fir"?5:6)+Math.round(detail*2);
    const rise=height/rows;
    const exponent=species==="larch"?.57:species==="fir"?.72:.68;
    const notch=species==="larch"?.18:species==="fir"?.31:.42;
    const droop=species==="fir"?.115:species==="larch"?.095:.235;
    const arms=(side:-1|1):[number,number][]=>{
      const segments:[number,number][]=[];
      for(let row=0;row<rows;row++){
        const t=row/rows, yy=foot-height*t;
        const asym=.78+.40*paperHash(treeSeed,row,side===-1?103:109);
        const span=wide*Math.pow(1-t,exponent)*asym;
        // All outlines grow upward monotonically; the cut-back step produces
        // actual clear sky between whorls instead of a smooth triangle.
        segments.push(
          [x+side*span*notch,yy],
          [x+side*span,yy-rise*droop],
          [x+side*span*(species==="fir"?.72:.77),yy-rise*(droop+(species==="fir"?.34:.26))],
          [x+side*span*notch*.85,yy-rise*.82]);
      }
      return segments;
    };
    return poly([[x-wide*.115,foot+height*.055],...arms(-1),
      [x,foot-height],...arms(1).reverse(),
      [x+wide*.115,foot+height*.055]]);
  };
  return {scale,cx,cy,M,L,C,Q,Z,poly,oval,band,leaf,conifer};
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
function smallFern(p:P,x:number,y:number,height:number,side:number,detail:number,seed=31){
  // Each fern is a connected slanting rachis, but its leaflet pairs have
  // a distinct growth rhythm, irregular lengths and alternating asymmetry.
  const tipX=x+side*height*(.21+paperHash(seed,2,121)*.23),tipY=y-height;
  const bits=[p.band(x,y,tipX,tipY,2.15)];
  const direction=-90+side*15;
  const count=5+Math.round(detail*5);
  for(let i=1;i<=count;i++){
    const stagger=(paperHash(seed,i,123)-.5)*.30;
    const t=(i+stagger)/(count+1),bx=x+(tipX-x)*t,by=y-height*t;
    const size=(1-t*.68)*height*(.27+.13*paperHash(seed,i,125));
    const width=Math.max(3.1,size*(.16+.08*paperHash(seed,i,127)));
    bits.push(p.leaf(bx,by,size,direction-65+(i%3)*4,width));
    bits.push(p.leaf(bx,by,size*(.76+.17*paperHash(seed,i,129)),
      direction+65-(i%3)*5,width*.92));
  }
  bits.push(p.leaf(tipX-1.5,tipY+2,9+paperHash(seed,0,133)*7,direction,3.2));
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

/**
 * Original middle-distance forest arbor, built as a continuous silhouette
 * of trunk + tapering bifurcating forks rather than a flat canopy decal.
 * All side shoots grow out of real wood-stock junctions, and leaf bunches
 * sit at the *ends* of the forks rather than at arbitrary positions.
 *
 * Two separate stock planes (wood, foliage) share one deterministic skeleton.
 */
function wovenArbor(p:P,x:number,ground:number,height:number,
  hand:-1|1,seed:number,detail:number):{wood:string;foliage:string}{
  const tipX=x-hand*height*.045,top=ground-height;
  const wood=[
    p.M(x-8.3,ground+9),
    p.C(x-6.7,ground-height*.27,tipX-7,top+height*.25,tipX-2.2,top),
    p.L(tipX+2.2,top),
    p.C(tipX+7,top+height*.28,x+6.7,ground-height*.28,x+8.3,ground+9),
    p.L(x+3,ground+11),p.L(x,ground-8),p.L(x-4.2,ground+11),p.Z,
  ];
  const leaves:string[]=[];
  const tierCount=5+Math.round(detail*3);
  for(let j=0;j<tierCount;j++){
    const t=(j+1)/(tierCount+1);
    const by=ground-height*t,bx=x+(tipX-x)*t;
    // Most branches arch into the clearing; occasional outside forks give
    // irregular botanical silhouettes without closing the distant view.
    const dir=(j%4===1?hand:-hand) as -1|1;
    const h=paperHash(seed,j,311);
    const reach=height*(.16+.11*h)*(1-t*.29);
    const ex=bx+dir*reach,ey=by-height*(.08+.055*paperHash(seed,j,313));
    const rootWidth=2.4+2.3*(1-t),elbow=bx+dir*reach*.42;
    wood.push([
      p.M(bx-rootWidth,by+rootWidth*1.4),
      p.C(bx+dir*reach*.14,by-height*.04,elbow,ey+height*.08,ex,ey),
      p.C(elbow+dir*2.5,ey+height*.11,bx+dir*reach*.12,by+rootWidth*.4,
        bx+rootWidth,by+rootWidth*1.4),p.Z,
    ].join(" "));
    for(let k=0;k<2+Math.round(detail);k++){
      const q=(k+1)/(3+Math.round(detail));
      const px=bx+(ex-bx)*q,py=by+(ey-by)*q;
      const twigDir=k%2===0?-dir:dir;
      const tx=px+twigDir*(14+9*paperHash(seed,j*9+k,317));
      const ty=py-14-9*paperHash(seed,j*9+k,319);
      // A tapered secondary fork always begins on its parent branch.
      wood.push(p.band(px,py,tx,ty,1.65));
      const a=twigDir>0?-66:-114;
      leaves.push(p.band(tx,ty,tx+twigDir*6,ty-7,1.6));
      leaves.push(p.leaf(tx+twigDir*3,ty+2,15+5*paperHash(seed,j*9+k,321),
        a,4.6+1.5*paperHash(seed,j*9+k,323)));
    }
  }
  return {wood:wood.join(" "),foliage:leaves.join(" ")};
}
/** A collection of offset bark engravings cut from a contrasting thin sheet,
 * rather than a single full-height straight highlight resembling a metal rod. */
function treeBarkScores(p:P,x:number,ground:number,height:number,lean:number,
  hand:-1|1,seed:number){
  const strips:string[]=[];
  for(let i=0;i<5;i++){
    const t=.13+i*.145,yy=ground-height*t,
      bx=x+lean*t+hand*(i%2?3.4:-3.2);
    const dy=height*(.09+paperHash(seed,i,331)*.045),
      bend=hand*(1.5+2.9*paperHash(seed,i,333));
    strips.push([
      p.M(bx-1.15,yy+1),
      p.C(bx+bend*.4,yy-dy*.25,bx+bend,yy-dy*.68,bx+bend*.73,yy-dy),
      p.L(bx+bend*.73+1,yy-dy+1.5),
      p.C(bx+bend+1.3,yy-dy*.66,bx+bend*.6+1.4,yy-dy*.28,bx+1.15,yy+1),
      p.Z,
    ].join(" "));
  }
  return strips.join(" ");
}

/** Continuous die-cut crown (never a collection of floating stickers).
 * The broad cardstock mass is anchored over the foreground tree top. Its
 * smaller eye-shaped *physical holes* transmit light through negative space.
 */
function laceCanopy(p:P,x:number,y:number,side:number,detail:number,seed:number){
  const sx=(v:number)=>side*v;
  // The earlier top-only arc lay outside the actual ellipse. At normalized
  // x=.7 the visible opening starts around y=-.714; the new scalloped
  // lower silhouette extends to y≈-.25 so that cutwork is truly visible.
  const path=[
    p.M(sx(x*1.12),-y*1.10),
    p.C(sx(x*.93),-y*1.07,sx(x*.76),-y*1.02,sx(x*.63),-y*.965),
    p.C(sx(x*.52),-y*1.02,sx(x*.36),-y*.96,sx(x*.31),-y*.84),
    p.C(sx(x*.22),-y*.72,sx(x*.295),-y*.58,sx(x*.38),-y*.605),
    p.C(sx(x*.40),-y*.48,sx(x*.49),-y*.41,sx(x*.57),-y*.51),
    p.C(sx(x*.60),-y*.37,sx(x*.71),-y*.30,sx(x*.78),-y*.42),
    p.C(sx(x*.89),-y*.29,sx(x*.97),-y*.21,sx(x*1.12),-y*.10),
    p.L(sx(x*1.12),-y*1.10),p.Z
  ].join(" ");
  // All stations lie inside the scalloped contour. The placement is designed
  // against the actual *visible oval*, not the bounding rectangle.
  const sites=[
    [.39,.72],[.48,.69],[.58,.62],[.68,.52],[.80,.36],
    [.45,.54],[.56,.48],[.69,.40],[.81,.34],
    [.42,.83],[.51,.80],[.62,.72],[.71,.64],[.77,.52],
    [.50,.61],[.61,.57],[.72,.46],[.85,.39]
  ] as const;
  const holes=Array.from({length:5+Math.round(detail*13)},(_,k)=>{
    const h=paperHash(seed,k+(side>0?60:0),91);
    const [nx,ny]=sites[k];
    const px=sx(x*nx),py=-y*ny;
    // Knife-cut ovals are intentionally small to leave sound cardstock
    // bridges around their edges, not paper-thin disconnected islands.
    return p.leaf(px,py,11+7*h,side*(k%2?55:-32)-90,3.8+1.5*h);
  });
  return {path,holes};
}
/** Tapered paired blades form a joined, asymmetric thicket with openings.
 * This is all one cardstock color, but can be cut from a single sheet.
 */
function understoryCluster(p:P,x:number,y:number,side:number,detail:number,seed:number){
  const parts=[p.band(x,y,x+side*7,y-19,3.2)];
  const blades=5+Math.round(detail*6);
  for(let i=0;i<blades;i++){
    const h=28+paperHash(seed,i+Math.round(x),107)*32;
    const dx=side*(i-(blades-1)/2)*5.8;
    const tilt=-95+(i-(blades-1)/2)*10+(paperHash(seed,i,108)-.5)*9;
    parts.push(p.leaf(x+dx,y-h*.16,h,tilt,5+(i%3)*2));
  }
  return parts.join(" ");
}

/** Scalloped herbaceous blade with actual V-notch stock contour, not just
 * a perfect elliptical leaf copied around a stem. Ends taper to true points.
 * Each leaf keeps the same authored form through every absolute frame.
 */
function notchedBotanicalLeaf(p:P,x:number,y:number,length:number,angle:number,
  width:number,seed:number,detail:number){
  const a=radians(angle),ux=Math.cos(a),uy=Math.sin(a),nx=-uy,ny=ux;
  const n=6+Math.round(detail*4);
  const sidePoints=(side:-1|1):[number,number][]=>{
    const result:[number,number][]=[];
    for(let i=0;i<=n;i++){
      const t=i/n;
      const envelope=Math.pow(Math.sin(Math.PI*t),.81);
      const notch=i>1&&i<n-1&&i%3===1?.69:1;
      const w=width*envelope*notch*
        (.91+.18*paperHash(seed,i,side>0?223:229));
      const spineBend=Math.sin(Math.PI*t)*width*.13;
      result.push([
        x+ux*length*t+nx*(spineBend+side*w),
        y+uy*length*t+ny*(spineBend+side*w),
      ]);
    }
    return result;
  };
  return p.poly([...sidePoints(-1),...sidePoints(1).reverse()]);
}
/** The trunk is one contoured card, lateral forks are attached, and individual
 * leaves begin inside each fork. Veins are additional lighter cut-stock strips.
 * Return both material planes without creating an individual layer per leaf.
 */
function scenicHerb(p:P,x:number,y:number,height:number,side:-1|1,
  seed:number,detail:number):{stock:string;veins:string}{
  const tipX=x+side*height*(.18+.11*paperHash(seed,0,233));
  const tipY=y-height;
  const stock=[
    p.M(x-3,y+4),
    p.C(x+side*1,y-height*.26,tipX-side*8,y-height*.73,tipX-1,tipY),
    p.L(tipX+2,tipY),
    p.C(tipX-side*2,y-height*.73,x+side*7,y-height*.28,x+3,y+4),
    p.Z,
  ];
  const veins:string[]=[];
  // Two large opposite basal blades connect the entire sprig visually to its
  // ground plane. They are broad paper *masses*, not detached spear strokes.
  for(const [i,angle] of [-156,-24].entries()){
    const rootX=x+(i?2:-2),rootY=y-5;
    const len=height*(.37+.06*paperHash(seed,i,271));
    const width=height*(.105+.015*paperHash(seed,i,273));
    stock.push(notchedBotanicalLeaf(p,rootX,rootY,len,angle,
      width,seed+503+i*31,detail));
    const ang=radians(angle);
    veins.push(p.band(rootX,rootY,rootX+Math.cos(ang)*len*.61,
      rootY+Math.sin(ang)*len*.61,1.15));
  }
  const tiers=3+Math.round(detail*3);
  for(let j=0;j<tiers;j++){
    const t=(j+1)/(tiers+1);
    const baseX=x+(tipX-x)*t,baseY=y-height*t;
    const direction:1|-1=j%2===0?1:-1;
    const dx=direction*side;
    const spread=height*(.20+.09*paperHash(seed,j,239))*(1-t*.27);
    const ex=baseX+dx*spread,ey=baseY-height*(.115+.07*paperHash(seed,j,241));
    stock.push(p.band(baseX,baseY,ex,ey,2.3*(1-t*.28)));
    const length=height*(.29+.085*paperHash(seed,j,243))*(1-t*.40);
    const angle=dx>0?-32-8*paperHash(seed,j,247):-148+8*paperHash(seed,j,249);
    stock.push(notchedBotanicalLeaf(p,ex-2*dx,ey+3,length,angle,
      Math.max(8.2,height*.105)*(1-t*.32),seed+j*61,detail));
    const vLen=length*.57,rad=radians(angle);
    veins.push(p.band(ex,ey,ex+vLen*Math.cos(rad),ey+vLen*Math.sin(rad),.78));
  }
  const crownAngle=side>0?-66:-114;
  stock.push(notchedBotanicalLeaf(p,tipX,tipY+4,height*.23,
    crownAngle,height*.115,seed+413,detail));
  return {stock:stock.join(" "),veins:veins.join(" ")};
}
/** Layered paper wildflower, with independently cut flower-stock and centers.
 * Petal bases converge to a common carpellary junction; no floating disks.
 */
function scenicBloom(p:P,x:number,y:number,radius:number,
  seed:number,detail:number):{petals:string;center:string}{
  const count=5+Math.round(detail*2);
  const petals=Array.from({length:count},(_,j)=>{
    const h=paperHash(seed,j,251);
    const angle=j*360/count+(h-.5)*9-90;
    return p.leaf(x,y,radius*(.89+.19*h),angle,
      radius*(.26+.09*paperHash(seed,j,257)));
  }).join(" ");
  const center=p.oval(x,y,radius*.19,radius*.19)+
    " "+Array.from({length:5},(_,j)=>{
      const a=radians(j*360/5),rr=radius*.28;
      return p.oval(x+Math.cos(a)*rr,y+Math.sin(a)*rr,radius*.049,radius*.049);
    }).join(" ");
  return {petals,center};
}

/** Folded clipped glacial sediment, never uniformly tiled triangles. */
function alpineStratum(p:P,cx:number,peak:number,span:number,offset:number,side:number){
  const rootX=cx+side*span*.14,rootY=peak+offset;
  return p.poly([[rootX,rootY],[rootX+side*span*.22,rootY+offset*.26],
    [rootX+side*span*.41,rootY+offset*.52],
    [rootX+side*span*.29,rootY+offset*.45],
    [rootX+side*span*.14,rootY+offset*.54]]);
}

/** A filled paper-world within a physical matted aperture. */
function portal(p:P,add:Add,x:number,y:number,c:Stock){
  add("scenery-mat",c.mat,0,p.oval(0,0,x+13,y+13),{motion:"still",enterFrame:0});
  add("scenery-sky",c.light,1,p.oval(0,0,x,y),{motion:"still",enterFrame:0});
}
/** Woodland: luminous opening, 5 landscape planes and physically attached trees. */
function woodland(p:P,add:Add,c:Stock,x:number,y:number,detail:number,breeze:number,seed:number,treeVariety:number){
  add("woodland-sun-halo",c.light,2,p.oval(x*.12,-y*.55,66,66),{
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
  const farTreeCount=9+Math.round(detail*6);
  const farPines=Array.from({length:farTreeCount},(_,i)=>{
    const jitter=(paperHash(seed,i,64)-.5)*treeVariety;
    const px=-x*.89+i*x*1.78/(farTreeCount-1)+jitter*x*.063;
    const py=y*(.16+.057*Math.sin(i*1.64)+jitter*.035);
    const species=speciesFor(seed,i+17,treeVariety);
    const tall=55+paperHash(seed,i,4)*57;
    const wide=22+paperHash(seed,i,5)*16;
    return p.conifer(px,py,tall,wide,species,seed+i*127,detail);
  });
  add("woodland-far-pines",c.near,15,farPines.join(" "),{enterFrame:85,curl:.3});
  // Two intermediate planes form a real arched forest rather than trees that
  // appear only as perpendicular side-wall sticks. Each shadow stock is offset
  // in physical geometry; the visible upper tree and its terminal leaves are
  // separate opaque cut sheets at different depth, so the lightbox can cast
  // genuinely spaced shadows and parallax.
  for(const [i,hand] of [-1,1].entries()){
    const rootX=hand*x*.58,rootY=y*.43,height=y*1.24;
    const branches=wovenArbor(p,rootX,rootY,height,hand as -1|1,
      seed+101+i*173,detail);
    const under=wovenArbor(p,rootX+hand*6,rootY+7,height,
      hand as -1|1,seed+101+i*173,detail);
    add("woodland-arched-arbor-shadow-"+i,c.soil,16,under.wood,{
      enterFrame:90+i*6,curl:.26});
    add("woodland-arched-arbor-"+i,c.trunk,18,branches.wood,{
      enterFrame:96+i*6,curl:.62});
    add("woodland-arched-arbor-leaves-"+i,c.leafLight,19,
      branches.foliage,{enterFrame:113+i*5,curl:.64});
  }
  // Two asymmetrical solid cardstock canopy shells frame the distant sky.
  // Cut-through eye apertures, not transparent fake leaf silhouettes.
  for(const [i,side] of [-1,1].entries()){
    const crown=laceCanopy(p,x,y,side,detail,seed);
    add("woodland-lace-canopy-"+i,i?c.leaf:c.near,19,crown.path,{
      holes:crown.holes,enterFrame:101+i*4,durationFrames:42,curl:.65});
    const twigX=side*x*.72,twigY=-y*.65;
    const fronds=Array.from({length:5+Math.round(detail*5)},(_,j)=>{
      const ex=side*x*(.43+(j%4)*.11);
      const ey=-y*(.48+Math.floor(j/4)*.047);
      return p.band(twigX,twigY,ex,ey,1.6)+
        " "+p.leaf(ex,ey,25+(j%3)*5,side*(j%2?72:132),6.4);
    });
    add("woodland-canopy-ribs-"+i,c.leafLight,21,fronds.join(" "),{
      enterFrame:112+i*4,curl:.52});
  }
  // Two asymmetric framing trees with branches rooted in the actual trunks.
  for(const [i,sign] of [-1,1].entries()){
    const tx=sign*x*.73,ground=y*.91,height=y*1.79;
    const tree=silhouetteTree(p,tx,ground,height,sign===-1?43:37,-sign*29);
    add("woodland-trunk-"+i,c.trunk,20,tree.path,{enterFrame:89+i*5,curl:.61});
    add("woodland-trunk-grain-"+i,c.bark,21,
      treeBarkScores(p,tx,ground,height,tree.tipX-tx,
        sign as -1|1,seed+i*71),{
        enterFrame:100+i*5,curl:.3});
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
      const leafCount=9+Math.round(detail*8);
      const packets=Array.from({length:leafCount},(_,k)=>{
        const hash=paperHash(seed,k+i*59+j*31,161);
        const theta=(k-(leafCount-1)/2)/(leafCount-1)*Math.PI*1.23+
          treeVariety*(hash-.5)*.29;
        const radius=56+treeVariety*hash*26;
        const fx=ex+Math.sin(theta)*radius,
          fy=ey-Math.cos(theta)*(28+hash*16)+(k%4)*9;
        const angle=sign*(34+k*12)-109+treeVariety*(hash-.5)*27;
        return p.band(ex,ey,fx,fy,2.1+hash*.8)+" "+
          p.leaf(fx,fy,30+(k%4)*6+treeVariety*hash*11,
            angle,9+(k%3)*2+hash*2);
      });
      add("woodland-foliage-"+i+"-"+j,j%3?c.leaf:c.leafLight,23,
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
      smallFern(p,px,py,55+(i%5)*13,side,detail,seed+i*73),{
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
  // Wide-scale irregular paper undergrowth breaks up the bare fern comb:
  // each blade has a connected paper rachis, but a different slant/height.
  for(const [i,side] of [-1,1].entries()){
    for(let j=0;j<4;j++){
      const cx=side*x*(.32+j*.145);
      const cy=y*(.69+(j%3)*.025);
      add("woodland-understory-"+i+"-"+j,j%3?c.leaf:c.leafLight,28,
        understoryCluster(p,cx,cy,side,detail,seed+i*37+j*11),{
          enterFrame:151+j*2,curl:.64});
    }
  }
  // Rounded die-cut current strips sit above (not hidden under) the bank.
  const riverLight=Array.from({length:9+Math.round(detail*5)},(_,i)=>{
    const yy=y*(.62+i*.021);
    const xx=-x*.10+x*.042*Math.sin(i*1.91);
    return p.band(xx-9+(i%2)*4,yy,xx+10+(i%3)*6,yy-1.8,1.1+(i%3)*.4);
  }).join(" ");
  add("woodland-stream-surface-highlights",c.ripple,28,riverLight,{
    enterFrame:155,durationFrames:27,curl:.4});
  // Herbaceous broadleaf cards stand behind individually cut flower heads.
  // Roots sit on the same foreground paper terrace; vein material is separate.
  const woodlandHerbVeins:string[]=[];
  for(const [bank,side] of [-1,1].entries()){
    for(let j=0;j<3+Math.round(detail*1);j++){
      const px=side*x*(.205+j*.085),
        py=y*(.80+(j%2)*.027);
      const plant=scenicHerb(p,px,py,86+paperHash(seed,bank*11+j,263)*45,
        side as -1|1,seed+bank*121+j*89,detail);
      add("woodland-herb-"+bank+"-"+j,j%3===0?c.near:c.leaf,28,
        plant.stock,{enterFrame:141+j*3+bank*5,curl:.83});
      woodlandHerbVeins.push(plant.veins);
    }
  }
  add("woodland-herb-veins",c.leafLight,29,woodlandHerbVeins.join(" "),{
    enterFrame:152,curl:.34});
  // Larger seed-specific flower heads grow from attached papercut stems.
  const woodlandFlowerCenters:string[]=[];
  for(let i=0;i<4+Math.round(detail*5);i++){
    const side=i%2?-1:1,x0=side*(x*(.13+(i%3)*.085)),y0=y*.83,tip=y0-29-(i%3)*8;
    add("woodland-flower-stem-"+i,c.leafLight,27,
      [p.M(x0-1.6,y0),p.C(x0+side*5,y0-19,x0+side*9,tip+8,x0+side*11,tip),
        p.L(x0+side*13,tip),p.C(x0+side*11,tip+8,x0+side*8,y0-18,x0+1.6,y0),p.Z].join(" "),{
        enterFrame:142+i*2});
    const bloom=scenicBloom(p,x0+side*12,tip,
      17+(i%3)*3.2,seed+i*109,detail);
    add("woodland-flower-"+i,i%3?c.accent:c.light,28,bloom.petals,{
      enterFrame:150+i*2,curl:.48});
    woodlandFlowerCenters.push(bloom.center);
  }
  add("woodland-flower-centers",c.trunk,29,
    woodlandFlowerCenters.join(" "),{enterFrame:162,curl:.18});
}
/** Alpine: cut-silhouette peaks, individual snow shelf plates, depth-spaced pines. */
function alpine(p:P,add:Add,c:Stock,x:number,y:number,detail:number,breeze:number,seed:number,treeVariety:number){
  const sunX=-x*.38,sunY=-y*.60;
  add("alpine-sun-halo",c.light,2,p.oval(sunX,sunY,61,61),{enterFrame:15});
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
    // Three graded hand-cut horizontal terraces cross the light-facing slope.
    // Not a repeated bitmap texture: each has its own contour and depth.
    for(let j=0;j<2+Math.round(detail*2);j++){
      const sx=j%2?-1:1;
      add("alpine-folded-stratum-"+i+"-"+j,
        j%3===0?c.far:(j%3===1?c.middle:c.bark),11,
        alpineStratum(p,m.cx,m.peak,m.r,y*(.23+j*.09),sx),{
          enterFrame:68+i*4+j*2,curl:.72});
    }
    // More detail adds small *physical paper* moraine cuts, not texture noise.
    for(let j=0;j<Math.round(detail*3);j++){
      const xx=m.cx-m.r*.21+j*m.r*.14,yy=m.peak+y*(.24+j*.085);
      add("alpine-scree-"+i+"-"+j,c.snow,11,
        p.poly([[xx,yy],[xx+7,yy-11],[xx+16,yy+5],[xx+6,yy+8]]),{
          enterFrame:72+j*3});
    }
  }
  // Mountain feet settle behind continuous cut-paper foothill terraces;
  // no empty white stripe separates the peaks from the pine line.
  add("alpine-continuous-foothills",c.middle,12,
    ridge(p,x,y+20,-y*.10,28,1.38),{enterFrame:77,curl:.62});
  add("alpine-foothill-terrace",c.near,13,
    ridge(p,x,y+20,y*.145,14,.86),{enterFrame:80,curl:.44});
  const distantTreeCount=12+Math.round(detail*6);
  add("alpine-distant-pines",c.soil,14,
    Array.from({length:distantTreeCount},(_,i)=>{
      const k=i/(distantTreeCount-1);
      const jitter=(paperHash(seed,i,48)-.5)*treeVariety;
      const xx=-x*.92+(x*1.84)*k+jitter*x*.067;
      const yy=y*(.23+.036*Math.sin(i*1.38)+jitter*.04);
      const species=speciesFor(seed,i+37,treeVariety);
      return p.conifer(xx,yy,58+paperHash(seed,i,7)*62,
        20+paperHash(seed,i,51)*15,species,seed+i*113,detail);
    }).join(" "),{enterFrame:82,curl:.37});
  add("alpine-lake-bank",c.middle,14,
    ridge(p,x,y+12,y*.3,26,2.1),{enterFrame:86,durationFrames:34});
  add("alpine-lake",c.water,15,[
    p.M(-x,y*.41),p.C(-x*.36,y*.38,x*.38,y*.35,x,y*.43),
    p.L(x,y*.91),p.C(x*.47,y*.81,-x*.4,y*.82,-x,y*.97),p.Z
  ].join(" "),{enterFrame:92,curl:.48});
  // A narrow horizontal cut bank must NOT be a filled-to-bottom ridge:
  // the old full-height polygon occluded most of the intended blue lake.
  add("alpine-lake-far-shore",c.near,16,[
    p.M(-x,y*.405),p.C(-x*.62,y*.39,-x*.18,y*.425,x*.12,y*.414),
    p.C(x*.43,y*.406,x*.72,y*.40,x,y*.422),
    p.L(x,y*.465),p.C(x*.61,y*.457,x*.26,y*.466,x*.08,y*.47),
    p.C(-x*.25,y*.466,-x*.63,y*.466,-x,y*.472),p.Z
  ].join(" "),{enterFrame:98,curl:.36});
  for(let i=0;i<10+Math.round(detail*5);i++){
    const yy=y*(.52+i*.028),w=20+(i%4)*18;
    const xx=-x*.64+(i%6)*x*.26;
    add("alpine-reflection-"+i,i%4?c.ripple:c.mist,17,
      p.band(xx,yy,xx+w,yy-1.7,1.45+(i%3)*.3),{
        enterFrame:113+i*2,curl:.22});
  }
  // A shallow curved sheet follows the wave field, restoring depth without
  // a universal gradient or raster overlay.
  add("alpine-lake-current",c.water,18,[
    p.M(-x*.66,y*.605),
    p.C(-x*.42,y*.59,-x*.18,y*.62,x*.10,y*.60),
    p.C(x*.34,y*.58,x*.46,y*.635,x*.63,y*.61),
    p.C(x*.45,y*.66,x*.19,y*.64,-x*.05,y*.666),
    p.C(-x*.38,y*.68,-x*.53,y*.645,-x*.66,y*.605),p.Z
  ].join(" "),{enterFrame:121,curl:.53});
  // An island of solid cardstock and narrow bank cuts creates middle distance.
  add("alpine-lake-islet",c.soil,19,[
    p.M(-x*.50,y*.73),p.C(-x*.37,y*.69,-x*.23,y*.7,-x*.19,y*.747),
    p.C(-x*.28,y*.768,-x*.43,y*.78,-x*.50,y*.73),p.Z
  ].join(" "),{enterFrame:125,curl:.78});
  add("alpine-islet-reeds",c.leaf,20,
    Array.from({length:5+Math.round(detail*4)},(_,i)=>{
      const rx=-x*(.44-i*.026),ry=y*.728;
      return p.band(rx,ry,rx+(i%2?3:-4),ry-15-(i%3)*5,1.75)+
        " "+p.leaf(rx,ry-11,12,i%2?-42:-132,3.4);
    }).join(" "),{enterFrame:131,curl:.7});
  // Front escarpments frame the water on two separate material planes.
  for(const [i,side] of [-1,1].entries()){
    const hx=side*x;
    const rock=p.poly([[side*x*.28,y*.90],[side*x*.32,y*.69],
      [side*x*.38,y*.53],[side*x*.49,y*.57],
      [side*x*.64,y*.37],[side*x*.82,y*.43],
      [hx,y*.45],[hx,y+18],[side*x*.24,y+18]]);
    add("alpine-ledge-"+i,i?c.soil:c.near,19,rock,{enterFrame:102+i*6,curl:.76});
    for(let j=0;j<3+Math.round(detail*3);j++){
      const pineSeed=seed+i*173+j*41;
      const offset=(paperHash(seed,i*11+j,43)-.5)*treeVariety;
      const px=side*(x*(.245+j*.084+offset*.042));
      const py=y*(.69+(j%3)*.047+offset*.025);
      const species=speciesFor(seed,j+i*79+127,treeVariety);
      add("alpine-pine-"+i+"-"+j,j%3===0?c.trunk:c.leaf,22,
        p.conifer(px,py,74+paperHash(seed,j+i*17,22)*92,
          32+paperHash(seed,j+i*17,32)*27,species,pineSeed,detail),{
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
      smallFern(p,px,py,43+(i%4)*12,side,detail,seed+11+i*83),{
        enterFrame:139+i*2,curl:.43});
  }
  // Foreground botanical silhouettes form a crafted scenic frame, not random
  // noise: rooted stems, attached calyces and uneven five-petaled heads.
  for(const [i,side] of [-1,1].entries()){
    const stalks=Array.from({length:5+Math.round(detail*3)},(_,j)=>{
      const xx=side*x*(.19+(j%4)*.07);
      const ground=y*(.82+(j%3)*.021);
      const tip=ground-(33+(j%3)*14);
      return p.band(xx,ground,xx+side*5,tip,2.4)+
        " "+p.leaf(xx+side*5,tip+13,15,side>0?-152:-28,4.7)+
        " "+p.leaf(xx+side*4,tip+10,13,side>0?-27:-150,4.3);
    });
    add("alpine-meadow-grass-"+i,c.leaf,27,stalks.join(" "),{
      enterFrame:149+i*3,curl:.68});
    const seedX=side*x*.33,seedY=y*.69;
    const alpineBloom=scenicBloom(p,seedX,seedY,15+i*1.8,seed+i*73,detail);
    add("alpine-meadow-bloom-"+i,c.accent,28,alpineBloom.petals,{
      enterFrame:157+i*2,curl:.62});
  }
  // Elevated riverbank and rocky meadow contain differently branched broadleaf
  // herbs, with small supplementary vein cuts as a brighter sheet.
  const alpineHerbVeins:string[]=[];
  for(const [bank,side] of [-1,1].entries()){
    for(let j=0;j<2+Math.round(detail*1);j++){
      const px=side*x*(.24+j*.13),
        py=y*(.81+(j%2)*.014);
      const sprig=scenicHerb(p,px,py,65+paperHash(seed,bank*7+j,269)*34,
        side as -1|1,seed+bank*131+j*97+17,detail);
      add("alpine-herb-"+bank+"-"+j,j%2?c.leaf:c.leafLight,28,
        sprig.stock,{enterFrame:146+j*3+bank*4,curl:.73});
      alpineHerbVeins.push(sprig.veins);
    }
  }
  add("alpine-herb-veins",c.bark,29,alpineHerbVeins.join(" "),{
    enterFrame:155,curl:.32});
  // Bright centers are cut from one companion stock, not a filtered dot layer.
  const alpineBloomCenters=[-1,1].map((side,i)=>{
    const seedX=side*x*.33,seedY=y*.69;
    return scenicBloom(p,seedX,seedY,15+i*1.8,seed+i*73,detail).center;
  });
  add("alpine-meadow-bloom-centers",c.trunk,29,
    alpineBloomCenters.join(" "),{enterFrame:163,curl:.27});
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
  for(const [name,value] of [["detail",options.detail],["breeze",options.breeze],["relief",options.relief],["treeVariety",options.treeVariety]] as const){
    if(value!==undefined&&(!Number.isFinite(value)||value<0||value>1))
      throw new RangeError("Paper scenery "+name+" must be finite in [0,1].");
  }
  const detail=clamp(options.detail??.9),breeze=clamp(options.breeze??.5),
    relief=clamp(options.relief??1),treeVariety=clamp(options.treeVariety??.9);
  const w=aspect==="portrait"?540:960,h=aspect==="portrait"?960:540;
  const p=paperGeometry(w,h),c=STOCK[palette],x=aspect==="portrait"?316:517,
    y=aspect==="portrait"?514:292;
  const layers:PaperCutLayer[]=[];
  const add:Add=(id,color,depth,path,rest={})=>{
    layers.push({id,color,depth:Math.round(depth*relief),path,motion:"rise",
      enterFrame:Math.min(160,8+layers.length*2),durationFrames:34,...rest});
  };
  portal(p,add,x,y,c);
  if(scenery==="woodland")woodland(p,add,c,x,y,detail,breeze,seed,treeVariety);
  else alpine(p,add,c,x,y,detail,breeze,seed,treeVariety);
  matFrame(p,add,w,h,x,y,c);
  if(layers.length>MAX_PAPER_LAYERS)throw new RangeError("Paper scenery exceeded 128 cut layers.");
  return {version:1,id:"paper-scenery-"+scenery+"-"+aspect+"-"+palette,style,
    width:w,height:h,fps:30,durationFrames:240,seed,backing:c.backing,
    light:c.light,layers};
}
