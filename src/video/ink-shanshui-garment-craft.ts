/**
 * Original high-frequency hand-drawn figure details on top of the AUTHORITATIVE
 * source-measured garment silhouette. This DOES NOT re-fit body proportions.
 * Pressure tapered silk-thread lines, layered cuff/neck bindings, sutures,
 * thumb/finger creases, folded hem grain, shoe uppers and restrained scroll
 * ruling are part-local SVG, so they animate with the correct garment joint.
 *
 * Reference technique: classical baimiao, iron-wire and floating silk-thread
 * outlines, nail-head/rattail pressure release, sparse dry-brush fibre grain.
 */
import type {CharacterShapeAsset,CharacterPathShape} from
  "../../registry/character/definition";
import type {ShanshuiScene} from "../../registry/video/ink-shanshui";
import type {ShanshuiBodyFit} from "./ink-shanshui-full-body";
import {SHANSHUI_TEACHER_MESHES} from "./ink-shanshui-teacher-mesh";
import {inkPressureStroke,inkSilkFold,inkHatching,inkArt} from
  "./ink-shanshui-fine-craft";
type V={x:number;y:number};
const v=(x:number,y:number):V=>({x,y});
const n=(x:number)=>Number(x.toFixed(2));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const st=(a:V)=>n(a.x)+" "+n(a.y);
const pen=(d:string,ink="$shadow",width=1,opacity=.7):CharacterPathShape=>({
  type:"path",d,fill:"none",stroke:ink,strokeWidth:width,opacity,
});
const closed=(d:string,color="$wash",opacity=.45):CharacterPathShape=>({
  type:"path",d,fill:color,stroke:"none",strokeWidth:0,opacity,
});
const curve=(a:V,b:V,c:V,d:V)=>"M"+st(a)+" C"+st(b)+" "+st(c)+" "+st(d);
function measured(scene:ShanshuiScene){
  const r=SHANSHUI_TEACHER_MESHES[scene];
  const scale=291/r.figure.height,cx=r.figure.x+r.figure.width*.5;
  const project=(p:V)=>v(n(133+(p.x-cx)*scale),n(43+(p.y-r.figure.y)*scale));
  const box=(id:string)=>{
    const a=r.regions[id as keyof typeof r.regions];
    if(!a)throw new RangeError("Visible source art missing "+id);
    return {x:project({x:a.x,y:a.y}).x,
      y:project({x:a.x,y:a.y}).y,
      width:a.width*scale,height:a.height*scale};
  };
  return {r,project,box};
}
const stroke=(a:V,b:V,c:V,d:V,width=.9,opacity=.72,seed=0,
  ink="$shadow"):CharacterPathShape=>
  inkPressureStroke({from:a,c1:b,c2:c,to:d,width,opacity,seed,ink});
/** All produced details derive from each region's coordinates. The part
 * hierarchy, mouth/eye controls and authored gait stay untouched.
 */
export function shanshuiGarmentCraft(
  scene:ShanshuiScene,fit:ShanshuiBodyFit,detail=1,
):Record<string,CharacterShapeAsset>{
  if(!Number.isFinite(detail)||detail<0||detail>1)
    throw new RangeError("Garment craft detail must be in 0..1.");
  const x=measured(scene),a=fit.anchors;
  const mid=(p:V,q:V)=>v((p.x+q.x)*.5,(p.y+q.y)*.5);
  const waist=mid(a.leftWaist,a.rightWaist);
  const hem=mid(a.leftHem,a.rightHem);
  const hip=mid(a.leftHip,a.rightHip);
  const linen="$paper",shadow="$shadow",deep="$deep";
  const high=detail>.72,medium=detail>.34;
  const robe:CharacterPathShape[]=[];
  // Pressure and direction follow gravity (upper side creasing at the tied
  // waist, broad arcs below the knee). Avoid parallel decorative striping.
  const folds=[
    [-.76,-.9,.88],[-.53,-.57,.65],[-.38,-.25,1.05],
    [-.17,-.41,.72],[-.06,.03,.48],[.16,.29,.92],
    [.27,.15,.64],[.44,.51,.93],[.68,.78,.54],
  ] as const;
  const count=detail>.74?folds.length:detail>.33?6:3;
  for(let i=0;i<count;i++){
    const [root,end,pressure]=folds[i];
    const start=v(waist.x+root*fit.sourceWaistRatio*291*.36,
      waist.y+11+(i%3)*1.8);
    const dest=v(hem.x+end*fit.sourceHemRatio*291*.41,
      hem.y-7-(i%4)*6.5);
    const path=inkSilkFold(start,
      v(start.x+(dest.x-start.x)*.18,hip.y+8+i%2*5),
      v(dest.x-(dest.x-start.x)*.11,hem.y-51+(i%3)*7),
      dest,pressure,i+71);
    robe.push(...path);
  }
  // Fan-shaped short stress folds at the waist, plus discontinuous turning
  // planes where fabric bunches above the moving hem.
  for(let i=0;i<(high?12:medium?8:4);i++){
    const t=(i+.5)/(high?12:medium?8:4),xx=mix(a.leftWaist.x,a.rightWaist.x,t);
    robe.push(stroke(v(xx,waist.y+9),
      v(xx+(t-.5)*5,waist.y+16),
      v(xx+(t-.5)*11,waist.y+19+(i%3)*5),
      v(xx+(t-.5)*16,waist.y+25+(i%3)*6),
      .55+(i%4)*.19,.6,101+i,i%3===0?deep:shadow));
  }
  for(let i=0;i<(medium?7:3);i++){
    const t=(i+.48)/(medium?7:3),xx=mix(a.leftHem.x,a.rightHem.x,t);
    robe.push(stroke(v(xx-5,hem.y-17-(i%3)*4),
      v(xx-2,hem.y-11),v(xx+2,hem.y+1),v(xx+9,hem.y+3),
      .52+(i%3)*.27,.56,130+i,shadow));
  }
  // Ink pooling along the garment seam, not random speckle.
  if(medium)robe.push(...inkHatching(
    v(a.leftHem.x+15,hem.y-14),
    Math.max(1,Math.abs(a.rightHem.x-a.leftHem.x)-28),
    high?23:12,37,"$wash"));

  const sleeve=(side:"left"|"right"):CharacterPathShape[]=>{
    const box=x.box("sleeve-screen-"+side);
    const shoulder=side==="left"?a.leftShoulder:a.rightShoulder;
    const hand=side===fit.nearSide?a.nearHand:a.farHand;
    const sign=side==="left"?-1:1;
    const outer=side==="left"?box.x:box.x+box.width;
    const inside=side==="left"?box.x+box.width:box.x;
    const bottom=box.y+box.height;
    const ink:CharacterPathShape[]=[];
    // Cuff's turned-under lip, separate silk lining and long compressed
    // folds have their own masses. Deliberately no repeated straight bars.
    ink.push(
      pen(curve(v(outer+sign*3,bottom-9),
        v(outer+sign*12,bottom+6),
        v(inside-sign*10,bottom+10),v(inside,bottom-10)),
        deep,1.08,.83),
      pen(curve(v(outer+sign*4,bottom-14),
        v(outer+sign*6,bottom-1),
        v(inside-sign*8,bottom+5),v(inside,bottom-14)),
        linen,.82,.73),
      closed(curve(v(outer+sign*3,bottom-12),
        v(outer-sign*2,bottom+7),
        v(inside-sign*4,bottom+8),v(inside,bottom-12))+" Z",
        "$wash",.23),
    );
    const pin=v(shoulder.x+sign*3,shoulder.y+10);
    const lengths=[.74,.55,.93,.66,.81,.39,.62];
    for(let i=0;i<(high?lengths.length:medium?5:3);i++){
      const f=lengths[i],t=(i+.5)/lengths.length;
      const target=v(mix(outer,inside,t)+sign*(i%3)*3,
        mix(shoulder.y+48,bottom-13,f));
      ink.push(...inkSilkFold(
        v(pin.x+(i-3)*2,pin.y+i%3*3),
        v(shoulder.x+sign*(15+i*2),
          shoulder.y+28+i*3),
        v(target.x+sign*(6+i%2*3),
          target.y-32),
        target,.48+.19*(i%3),251+i));
    }
    // Compression creases wrap the wrist rather than floating as texture.
    for(let i=0;i<(high?5:3);i++){
      ink.push(stroke(v(hand.x+sign*(4+i*2),hand.y+5+i*2),
        v(hand.x+sign*(11+i*3),hand.y+8+i*2),
        v(hand.x+sign*(14+i*3),hand.y+10+i*3),
        v(hand.x+sign*(18+i*2),hand.y+13+i*3),
        .5+i*.14,.6,i+501,"$shadow"));
    }
    return ink;
  };
  const collar:CharacterPathShape[]=[];
  const chest=mid(a.leftShoulder,a.rightShoulder);
  // Interleaved collar layers: outside tape, inner fold, hidden shadow
  // behind the crossing fabric instead of a single enormous brown V.
  for(const side of [-1,1]){
    const neck=side<0?a.neckLeft:a.neckRight;
    const end=v(chest.x+side*6,chest.y+39);
    collar.push(...inkSilkFold(neck,
      v(neck.x+side*8,neck.y+8),
      v(end.x+side*9,end.y-12),
      end,.79,side+401));
    collar.push(stroke(v(neck.x+side*3,neck.y+5),
      v(neck.x+side*10,neck.y+13),
      v(end.x+side*5,end.y-10),
      v(end.x+side*3,end.y),.55,.66,side+403,"$twine"));
  }
  if(high)collar.push(
    pen(curve(v(chest.x-11,chest.y+15),v(chest.x-8,chest.y+23),
      v(chest.x-4,chest.y+30),v(chest.x+1,chest.y+34)),
      "$paper",.8,.62),
    pen(curve(v(chest.x+10,chest.y+16),v(chest.x+9,chest.y+24),
      v(chest.x+6,chest.y+29),v(chest.x+2,chest.y+34)),
      "$deep",.65,.57));

  const belt:CharacterPathShape[]=[
    // Fabric knot: center pinch, distinct overlap and two textile strings.
    closed("M"+st(v(waist.x-5,waist.y+5))+
      " Q"+st(v(waist.x,waist.y))+" "+st(v(waist.x+7,waist.y+5))+
      " Q"+st(v(waist.x,waist.y+12))+" "+st(v(waist.x-5,waist.y+5))+" Z",
      "$deep",.76),
    ...inkSilkFold(v(waist.x+1,waist.y+8),
      v(waist.x+14,waist.y+20),
      v(waist.x+8,hip.y+11),
      v(waist.x+25,hip.y+28),.58,663),
    ...inkSilkFold(v(waist.x-2,waist.y+8),
      v(waist.x-9,waist.y+21),
      v(waist.x-1,hip.y+12),
      v(waist.x-14,hip.y+39),.43,664),
    pen(curve(v(a.leftWaist.x+2,a.leftWaist.y+3),
      v(waist.x-9,waist.y+5),
      v(waist.x+9,waist.y+6),
      v(a.rightWaist.x-2,a.rightWaist.y+2)),
      "$paper",1,.63),
  ];
  const hands=(which:"near"|"far"):CharacterPathShape[]=>{
    if(scene==="mountain-trail"&&which==="far")return [];
    const hand=which==="near"?a.nearHand:a.farHand;
    const out:CharacterPathShape[]=[];
    const px=hand.x,py=hand.y;
    // Slim separated knuckles. Finger group aligns to the visible approved
    // wrist/palm. Do not render floating dots that read as extra hands.
    const reading=scene==="river-scholar";
    const contemplative=scene!=="river-scholar"&&which==="near";
    const bend=contemplative?-1:1;
    const count=medium?4:2;
    for(let i=0;i<count;i++){
      const offset=(i-1.5)*2.45;
      out.push(stroke(v(px-4+offset,py+1),
        v(px-2+offset,py+4),
        v(px-1+offset+bend*1.7,py+5),
        v(px+offset+bend*3.5,py+6-(i%2)*1.7),
        .42+(i%2)*.13,.85,720+i,deep));
      out.push(pen("M"+st(v(px-1+offset,py+3))+
        " Q"+st(v(px+1+offset,py+4))+" "+st(v(px+2+offset,py+4.8)),
        "$skinshade",.5,.5));
    }
    out.push(...inkSilkFold(v(px-5,py-4),
      v(px-1,py-8),
      v(px+4,py-7),
      v(px+6,py-4),.57,789));
    if(reading)out.push(
      pen(curve(v(px-1,py-6),v(px+4,py-10),
        v(px+6,py-5),v(px+7,py+1)),
      "$shadow",.55,.78));
    if(contemplative)out.push(
      pen(curve(v(px-5,py-4),v(px-1,py-9),
        v(px+3,py-12),v(px+4,py-15)),
      "$ink",.69,.76));
    return out;
  };
  const shoe=(side:"left"|"right"):CharacterPathShape[]=>{
    const foot=side==="left"?a.leftFoot:a.rightFoot;
    const b=x.box("foot-screen-"+side);
    const start=v(b.x+b.width*.2,b.y+b.height*.44);
    const end=v(b.x+b.width*.86,b.y+b.height*.61);
    return [
      // Distinguish sole seam from vamp without hard polygonal black blob.
      stroke(start,v(start.x+b.width*.1,start.y-4),
        v(end.x-b.width*.18,end.y-3),end,
        .95,.82,907,linen),
      stroke(v(start.x+1,start.y+2),
        v(start.x+b.width*.23,start.y+5),
        v(end.x-b.width*.19,end.y+3),
        v(end.x-1,end.y+3),.48,.72,908,"$wash"),
      pen(curve(v(foot.x-2,foot.y-4),
        v(foot.x+1,foot.y-6),v(foot.x+3,foot.y-6),
        v(foot.x+5,foot.y-3)),"$paper",.7,.66),
    ];
  };
  const hemMarks=inkHatching(
    v(a.leftHem.x+14,hem.y-7),
    Math.max(2,Math.abs(a.rightHem.x-a.leftHem.x)-25),
    high?24:medium?12:5,819,"$shadow");
  const scroll:CharacterPathShape[]=[];
  if(scene==="river-scholar"){
    const paper=x.box("scroll");
    const left=paper.x,top=paper.y,w=paper.width,h=paper.height;
    scroll.push(
      // two fine turned edges and distinct roller end knobs
      pen("M"+st(v(left+5,top+7))+
        " Q"+st(v(left+3,top+h*.55))+" "+st(v(left+5,top+h*.84)),
        "$deep",.95,.82),
      pen("M"+st(v(left+w-5,top+7))+
        " Q"+st(v(left+w-4,top+h*.5))+" "+st(v(left+w-6,top+h*.88)),
        "$deep",.91,.82),
    );
    // The paper remains mostly empty: restrained readable brush rhythm,
    // not random squiggles masquerading as historical Chinese text.
    const columns=high?6:medium?4:2;
    for(let col=0;col<columns;col++){
      const xx=left+w*.19+col*w*.11;
      scroll.push(stroke(v(xx,top+h*.24),
        v(xx+1,top+h*.31),
        v(xx-1,top+h*.38),
        v(xx+1,top+h*.5),.42,.45,col+841,shadow));
      if(col%2===0)scroll.push(stroke(v(xx+2,top+h*.34),
        v(xx+3,top+h*.36),
        v(xx+2,top+h*.4),
        v(xx+4,top+h*.45),.32,.46,col+851,deep));
    }
  }
  const attrs:Record<string,CharacterPathShape[]>={
    "robe-fine":robe,
    "sleeve-fine-near":sleeve(fit.nearSide),
    "sleeve-fine-far":sleeve(fit.nearSide==="left"?"right":"left"),
    "collar-fine":collar,"belt-fine":belt,
    "hand-fine-near":hands("near"),"hand-fine-far":hands("far"),
    "shoe-fine-left":shoe("left"),"shoe-fine-right":shoe("right"),
    "hem-fine":hemMarks,
    "scroll-fine":scroll,
  };
  return Object.fromEntries(Object.entries(attrs).map(([key,value])=>
    [key,inkArt(value,"Kumiki historical scholar hand-drawn "+key)]));
}
