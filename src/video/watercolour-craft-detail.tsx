import { useMemo } from "react";
import { paintHash } from "../../registry/video/watercolour-brush";

export type WatercolourCraftSubject="botanical"|"estuary"|"courtyard";
export type CraftMarkKind="vein"|"seed"|"flower"|"grass"|"current"|"reflection"|"dry-brush"|"slate"|"masonry"|"wood"|"shadow";
export type CraftMark={
  path:string;kind:CraftMarkKind;stroke:string;strokeWidth:number;opacity:number;
  firstFrame:number;transform?:string;plantIndex?:number;plantX?:number;
};
const num=(n:number)=>n.toFixed(2);
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const hash=(seed:number,i:number,k:number)=>paintHash(seed,i,k);
const line=(x:number,y:number,dx:number,dy:number)=>
  "M"+num(x)+" "+num(y)+" l"+num(dx)+" "+num(dy);
const curved=(x:number,y:number,dx:number,dy:number,bend:number)=>
  "M"+num(x)+" "+num(y)+" q"+num(dx*.46)+" "+num(bend)+" "+num(dx)+" "+num(dy);
const mark=(path:string,kind:CraftMarkKind,stroke:string,strokeWidth:number,
  opacity:number,firstFrame:number,transform?:string):CraftMark=>
    ({path,kind,stroke,strokeWidth,opacity,firstFrame,transform});

/** Source-tied observations, not a uniform texture filter:
 * leaf veins arise at the same stem/leaf insertions as the actual botanic rig;
 * reflections follow curved water currents; mortar observes windows and walls.
 * Geometry is deterministic, film-frame independent and deliberately bounded.
 */
export function watercolourCraftMarks(subject:WatercolourCraftSubject,seed:number,detail=1):CraftMark[]{
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647)
    throw new RangeError("A finite nonnegative 31-bit paper seed is required.");
  if(!Number.isFinite(detail)||detail<0||detail>1)
    throw new RangeError("Craft detail must be between 0 and 1.");
  if(detail===0)return [];
  const marks:CraftMark[]=[];
  if(subject==="botanical"){
    const plants=Math.max(5,Math.round(8+13*detail));
    for(let i=0;i<plants;i++){
      const h=hash(seed,i,13),q=hash(seed,i,19);
      const x=[383,497,614,751,841][i%5]+Math.floor(i/5)*13+(h-.5)*48;
      const height=86+hash(seed,i,23)*242;
      const y=478+(q-.5)*19,bend=(h-.5)*54;
      const transform="translate("+num(x)+" "+num(y)+")";
      const plantStart=marks.length;
      const main=["#456753","#667E65","#81875C","#617B69","#587C7A"][i%5];
      const delicate=["#D7D9A9","#C8CBA4","#D5C3A1","#E2D8AD","#AFCEB1"][i%5];
      const count=Math.max(2,Math.round(2+3*detail));
      for(let j=0;j<(i%5===4?count:Math.min(3,count));j++){
        const side=j%2?1:-1;
        const up=height*(.26+j*.13);
        const length=(17+(1-h)*12)*(1-j*.13);
        const dx=side*length,root=bend*.1;
        const start=70+i*3+j*7;
        const spine=curved(root,-up,dx,-30,-16+hash(seed,i*9+j,6)*8);
        marks.push(mark(spine,"vein",main,.55+.25*hash(seed,i*9+j,2),.44,start,transform));
        const veinCount=Math.max(2,Math.round(1+3*detail));
        for(let k=1;k<=veinCount;k++){
          const t=k/(veinCount+1);
          const mx=root+dx*t*.83;
          const my=-up-30*t-3*Math.sin(Math.PI*t);
          const s=side*(1.25+hash(seed,i*99+j*11+k,19)*2.1);
          marks.push(mark(curved(mx,my,s,-(2.2+2*t),-1.4),
            "vein",k%3===0?delicate:main,.28+.12*hash(seed,i*50+j*7+k,23),
            .25+.15*hash(seed,i*99+j*11+k,29),start+6+k*2,transform));
        }
        // A shadow close to the leaf attachment creates actual structure.
        marks.push(mark(curved(root,-up,dx*.28,-8,-4),
          "dry-brush","#435E54",.88,.17,start+13,transform));
      }
      const tip=bend;
      const kind=i%5;
      if(kind===0){ // Open panicle: individual pedicels join the same axis.
        for(let k=0;k<10;k++){
          const side=k%2?1:-1;
          const yy=-height+4+k*5.4;
          marks.push(mark(curved(tip,yy,side*(8+k*.6),-13,-6),
            "seed",main,.42,.53,120+i*2+k,transform));
          marks.push(mark(line(tip+side*(9+k*.6),yy-14,
            side*(1.4+hash(seed,i*11+k,33)*2),-1.8),
            "seed",delicate,.64,.65,128+i*2+k,transform));
        }
      }else if(kind===1){ // Dense, deliberately staggered grain scales.
        for(let k=0;k<25;k++){
          const side=k%2?1:-1;
          const yy=-height-2-k*1.7;
          marks.push(mark(curved(tip+side*2,yy,side*(3+hash(seed,i*41+k,37)*2),-2.6,-2),
            "seed",k%4===0?"#C2B583":main,.38,.39,139+i+k,transform));
        }
      }else if(kind===2){ // Rays emerge from the disc and taper outward.
        for(let k=0;k<13;k++){
          const a=k*Math.PI*2/13;
          const cx=tip+Math.cos(a)*7,cy=-height-5+Math.sin(a)*6;
          marks.push(mark(curved(cx,cy,Math.cos(a)*9,Math.sin(a)*10,
            1.4*Math.sin(k)),"flower",k%3===0?"#A29363":"#FBF4DC",.7,
            .41,141+i+k,transform));
        }
        for(let k=0;k<14;k++){
          const a=k*2.399,r=Math.sqrt(k)*1.15;
          marks.push(mark(line(tip+Math.cos(a)*r,-height-5+Math.sin(a)*r,
            .1,.18),"seed","#746D46",.7,.61,145+i+k,transform));
        }
      }else if(kind===3){ // Umbels: branching pedicels and radial flowerlets.
        for(let k=0;k<7;k++){
          const a=(k-3)*.32,ux=tip+Math.sin(a)*20,uy=-height-14-Math.cos(a)*13;
          marks.push(mark(curved(tip,-height,ux-tip,uy+height,-17),
            "flower",main,.49,.45,134+i+k,transform));
          for(let f=0;f<3;f++){
            const t=f*Math.PI*2/3;
            marks.push(mark(line(ux,uy,Math.cos(t)*3,Math.sin(t)*2.9),
              "flower",delicate,.52,.6,145+i+k+f,transform));
          }
        }
      }else{ // Awned grass: finely varied filaments, not a smooth blob.
        for(let k=0;k<35;k++){
          const side=k%2?1:-1;
          const yy=-height-3-(k%18)*2.5;
          const spread=side*(5+k%7*1.6);
          marks.push(mark(curved(tip+spread,yy,side*(8+k%5*1.9),-12,
            -3+hash(seed,i*43+k,67)*2),"grass",
            k%3===0?"#B7AF7D":main,.32+.15*hash(seed,i*55+k,71),
            .28+.2*hash(seed,i*31+k,73),135+i+k,transform));
        }
      }
      // Keep the detail stems attached to the exact animated botanical rig.
      for(let j=plantStart;j<marks.length;j++){
        marks[j].plantIndex=i;marks[j].plantX=x;
      }
    }
  }else if(subject==="estuary"){
    const n=Math.round(28+110*detail);
    for(let i=0;i<n;i++){
      const y=372+hash(seed,i,211)*117;
      const depth=(y-370)/124;
      const x=358+hash(seed,i,223)*542;
      const length=(8+hash(seed,i,227)*56)*(.6+depth*.7);
      const arch=(hash(seed,i,229)-.5)*(2.2+depth*6);
      const dy=(hash(seed,i,233)-.5)*(1.8+depth*3.5);
      const kind=i%9===0?"reflection":i%5===0?"dry-brush":"current";
      const ink=kind==="reflection"?
        (x>700&&x<840?"#FDF5D5":"#E5DCD1"):
        (i%4===0?"#3F7282":i%3===0?"#4D8F96":"#6A8892");
      const opacity=kind==="reflection"?.44+.22*hash(seed,i,241):.15+.26*hash(seed,i,243);
      marks.push(mark(curved(x,y,length,dy,arch),kind,ink,kind==="reflection"?1.1:.38+depth*.9,
        opacity,112+i%64));
      // Every bright bifurcation joins the root highlight. Unlike random
      // isolated white specks, foam and sparkle read as connected filaments.
      if(kind==="reflection"){
        const mx=x+length*.46,my=y+arch;
        marks.push(mark(curved(mx,my,length*.24,-2.9-depth*3.5,-2.8),
          "reflection","#FDF6DD",.45,.32,143+i%51));
        marks.push(mark(curved(x+length*.78,y+dy*.8,-length*.17,-2,-1),
          "reflection","#F5EDDB",.35,.3,149+i%39));
      }
      if(i%6===0){
        marks.push(mark(curved(x+length*.13,y+2.4,length*.58,.7,2.6),
          "dry-brush","#A59C83",.44,.13+.1*depth,140+i%29));
      }
    }
    // Directional water around the boat. These nonparallel, interrupted
    // curves define reflected form more effectively than horizontal stripes.
    for(let i=0;i<13;i++){
      const y=409+i*4.4+hash(seed,i,269)*2.4;
      const x=705+i*1.7+(hash(seed,i,271)-.5)*16;
      const dx=52-i*.85;
      marks.push(mark(curved(x,y,dx,2.2,6+hash(seed,i,277)*4),
        "reflection",i%4===0?"#FDF4DA":"#8FA9A7",
        .55+(i%3)*.2,.27+i%4*.08,155+i*2));
    }
  }else if(subject==="courtyard"){
    // Rooftiles are projected onto the same four-point roof plane as the
    // structural architecture; not a uniform raster of floating lines.
    const tileCount=Math.round(24+78*detail);
    for(let i=0;i<tileCount;i++){
      const x=466+hash(seed,i,317)*419;
      const y=236+hash(seed,i,319)*58;
      // Roof is a trapezoidal angular shell, with increasingly narrow bands
      // toward the ridge. Sparse inclusions are acceptable like worn slate.
      const outerTop=x<567?293-(x-428)*.64:x>770?205+(x-770)*.75:201;
      const outerBottom=x<572?320-(x-448)*.53:x>768?244+(x-768)*.61:245;
      if(y<outerTop+4||y>outerBottom-3)continue;
      const len=3+hash(seed,i,331)*17,dy=1+hash(seed,i,337)*3;
      marks.push(mark(curved(x,y,len,dy,1.1+hash(seed,i,347)*2.2),
        "slate",i%7===0?"#E2C4A9":i%3===0?"#5B6370":"#725E65",
        .55+hash(seed,i,349)*.5,.16+hash(seed,i,353)*.35,146+i%54));
      if(i%10===0){
        marks.push(mark(line(x+len*.4,y,2.3,3.3),
          "dry-brush","#F3D7BB",.46,.29,164+i%43));
      }
    }
    // Masonry around real window holes (6 windows, three by two). Marks
    // stop before the glazing, retaining construction and watertight panes.
    const window=(x:number,y:number)=>{
      // Padding belongs to the *aperture*, not to its grid index. The old
      // floor-index shortcut accidentally let masonry cross the top/left
      // five-pixel window margins, particularly at row/column boundaries.
      for(let row=0;row<2;row++)for(let col=0;col<3;col++){
        const ax=525+col*108,ay=329+row*73;
        if(x>=ax-5&&x<=ax+47&&y>=ay-5&&y<=ay+42)return true;
      }
      return false;
    };
    const stoneCount=Math.round(36+124*detail);
    for(let i=0;i<stoneCount;i++){
      const x=471+hash(seed,i,383)*400;
      const y=324+hash(seed,i,389)*142;
      const length=4+hash(seed,i,397)*23;
      if(x>758&&y<328+(x-758)*.33)continue;
      if(window(x,y)||window(x+length*.5,y)||window(x+length,y))continue;
      const kind=i%8===0?"shadow":i%6===0?"dry-brush":"masonry";
      marks.push(mark(curved(x,y,length,hash(seed,i,401)*1.3-.7,
        (hash(seed,i,409)-.5)*2),
      kind,i%6===0?"#D4C4AD":i%3===0?"#716B5E":"#987D68",
      .38+hash(seed,i,419)*.7,.12+hash(seed,i,421)*.25,146+i%66));
    }
    // Carved lintel weathering, shaded sills and uneven light scratches.
    for(let row=0;row<2;row++)for(let col=0;col<3;col++){
      const x=525+col*108,y=329+row*73;
      for(let k=0;k<7;k++){
        const q=hash(seed,row*30+col*11+k,457);
        marks.push(mark(curved(x+q*41,y+38,2.3+q*5,.3,1.1),
          "wood",k%3===0?"#EDDDC5":"#5C746F",
          k%2===0?.5:.8,.21+.14*q,172+col*7+row*8+k));
        if(k%2===0)marks.push(mark(line(x-1+q*44,y+39,
          0,2+q*3),"shadow","#655E56",.4,.24,174+k));
      }
    }
  }else throw new RangeError("Unknown craft study.");
  return marks;
}

export function WatercolourCraftDetails({study,seed,frame,detail=1}:{
  study:WatercolourCraftSubject;seed:number;frame:number;detail?:number;
}){
  const marks=useMemo(()=>watercolourCraftMarks(study,seed,detail),[study,seed,detail]);
  return <g data-km-watercolour-craft="" data-km-craft-detail={detail}
    data-km-craft-marks={marks.length} pointerEvents="none"
    fill="none" strokeLinecap="round" strokeLinejoin="round">
    {marks.map((m,i)=>{
      const alpha=clamp((frame-m.firstFrame)/24)*m.opacity*detail;
      const sway=m.plantIndex===undefined?0:
        .95*Math.sin(frame*.025+(m.plantX??0)*.008)+
        .65*Math.sin(frame*.017+m.plantIndex*.51);
      const transform=m.transform?m.transform+" rotate("+num(sway)+")":undefined;
      return <path key={i} data-km-craft-kind={m.kind}
        d={m.path} transform={transform} stroke={m.stroke}
        strokeWidth={m.strokeWidth} opacity={alpha}/>;
    })}
  </g>;
}
