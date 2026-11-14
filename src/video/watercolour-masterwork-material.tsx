import { useId, useMemo } from "react";
import { paintHash } from "../../registry/video/watercolour-brush";

export type MasterworkStudy="botanical"|"estuary"|"courtyard";
export type MaterialKind="tonal-mass"|"transparent-glaze"|"wet-edge"|"directional-drybrush"|"focal-shadow";
export type MasterworkMark={
  id:string;kind:MaterialKind;path:string;color:string;opacity:number;
  startFrame:number;strokeWidth?:number;transform?:string;plantIndex?:number;plantX?:number;
};
type ReserveMark={path:string;width:number};
export type MasterworkMaterialPlan={
  marks:MasterworkMark[];
  /** Artist-authored pigment-lifting strokes. These are holes in a glaze,
   * not bright opaque paint drawn over another layer. */
  reserves:ReserveMark[];
};
const clamp=(n:number)=>Math.min(1,Math.max(0,n));
const n=(x:number)=>x.toFixed(2);
const seedRand=(seed:number,i:number,j:number)=>paintHash(seed,i,j);
const add=(marks:MasterworkMark[],id:string,kind:MaterialKind,path:string,
  color:string,opacity:number,startFrame:number,strokeWidth?:number,
  transform?:string,plantIndex?:number,plantX?:number)=>{
  marks.push({id,kind,path,color,opacity,startFrame,strokeWidth,transform,
    plantIndex,plantX});
};

/** Material passes after studying historic and contemporary watercolour:
 * Turner—atmospheric light / pigment lifting;
 * Homer—purposeful dark-value grouping and white paper reserves;
 * Sargent—controlled lost/found edges;
 * Dürer—brush marks follow anatomy;
 * Cézanne—thin separate translucent color veils;
 * Cotman—legible shadow/shape hierarchy;
 * Cox—directional, irregular weather strokes;
 * Potter—botanical observation;
 * Zbukvic—tonal focal balance and reflected light;
 * Whyte—physical detail and figure/material separation.
 *
 * Techniques are translated into ORIGINAL geometry, never reference pixels.
 * Layers remain paper-locked, film-frame pure, and distinct from captions.
 */
export function watercolourMasterworkMaterialPlan(study:MasterworkStudy,
  seed:number,intensity=1):MasterworkMaterialPlan{
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647)
    throw new RangeError("Masterwork seed must be 0..2147483647.");
  if(!Number.isFinite(intensity)||intensity<0||intensity>1)
    throw new RangeError("Masterwork material intensity must be 0..1.");
  if(!["botanical","estuary","courtyard"].includes(study))
    throw new RangeError("Unknown masterwork subject.");
  const marks:MasterworkMark[]=[];
  const reserves:ReserveMark[]=[];
  if(intensity===0)return {marks,reserves};
  if(study==="botanical"){
    // Tonal groups are broad, interlocking ground washes; they stay behind
    // individual grasses rather than adding a generic all-over texture.
    add(marks,"meadow-left","tonal-mass",
      "M345 461 C393 448 438 451 490 465 Q522 475 568 464 C618 447 643 455 682 462 L682 490 Q613 478 563 494 Q492 479 448 489 Q383 480 345 495 Z",
      "#516852",.16,108);
    add(marks,"meadow-right","tonal-mass",
      "M582 455 Q649 439 710 458 Q746 435 793 451 Q854 439 930 463 L930 499 Q854 482 800 498 Q731 483 685 496 Q625 481 582 494 Z",
      "#486C67",.19,122);
    for(let i=0;i<19;i++){
      const h=seedRand(seed,i,13);
      const x=[383,497,614,751,841][i%5]+Math.floor(i/5)*13+(h-.5)*48;
      const height=86+seedRand(seed,i,23)*242;
      const bend=(h-.5)*54;
      // Draw into each source leaf, using EXACT same root, side, growth and
      // apical height as Stem. No disconnected floating dots.
      for(let j=0;j<3;j++){
        const side=j%2?1:-1;
        const up=height*(.26+j*.13);
        const len=(17+(1-h)*12)*(1-j*.13);
        const dx=side*len,root=bend*.1;
        const d="M"+n(root)+" "+n(-up)+
          " Q"+n(dx*.70)+" "+n(-up-15)+" "+n(dx*.85)+" "+n(-up-26)+
          " Q"+n(dx*.49)+" "+n(-up-20)+" "+n(root+side*.8)+" "+n(-up-4)+" Z";
        const pigment=["#415C4D","#506B5A","#657654","#7A7856","#405E65"][(i+j)%5];
        add(marks,"leaf-shade-"+i+"-"+j,"transparent-glaze",d,pigment,
          .24+.09*seedRand(seed,i*13+j,92),98+i*4+j*5,
          undefined,undefined,i,x);
        // A thinner dry brush accent follows the actual tapered lamina.
        const vein="M"+n(root)+" "+n(-up-3)+" Q"+
          n(dx*.42)+" "+n(-up-16)+" "+n(dx*.8)+" "+n(-up-26);
        add(marks,"leaf-tooth-"+i+"-"+j,"directional-drybrush",vein,
          "#3A614F",.28,133+i*3+j*4,.48,undefined,i,x);
      }
      if(i%5===2){
        const tip=bend;
        for(let j=0;j<9;j++){
          const a=j*Math.PI*2/9;
          const x1=tip+Math.cos(a)*6.4,y1=-height-5+Math.sin(a)*6.4;
          const d="M"+n(x1)+" "+n(y1)+
            " Q"+n(x1+Math.cos(a)*6)+" "+n(y1+Math.sin(a)*5)+
            " "+n(x1+Math.cos(a)*9.5)+" "+n(y1+Math.sin(a)*12);
          add(marks,"flower-ray-"+i+"-"+j,"directional-drybrush",d,
            j%3===0?"#8F865D":"#C8B789",.3,158+i+j,.45,
            undefined,i,x);
        }
      }
    }
    // Lift white paper only through the translucent lower ground glaze.
    for(let i=0;i<15;i++){
      const x=382+seedRand(seed,i,271)*508,y=466+seedRand(seed,i,277)*28;
      const dx=2+seedRand(seed,i,281)*8;
      reserves.push({path:"M"+n(x)+" "+n(y)+" q"+n(dx*.5)+" -2 "+n(dx)+" -1",width:.65});
    }
  }else if(study==="estuary"){
    // Atmospheric geometry: overlapping shaped veils rather than horizontal
    // rectangles. Bright paper reserves are holes in these actual washes.
    add(marks,"warm-air","transparent-glaze",
      "M0 246 Q172 240 320 231 C441 208 497 242 548 228 Q612 204 684 225 Q751 239 814 222 Q873 215 960 248 L960 295 Q851 269 799 282 Q715 259 659 278 Q577 263 516 277 Q424 250 320 279 Q170 271 0 285 Z",
      "#CEAF91",.075,46);
    add(marks,"cool-mist","transparent-glaze",
      "M0 313 Q177 303 354 297 Q437 267 497 290 Q560 265 625 290 Q686 267 761 293 Q838 272 960 297 L960 359 Q865 316 803 340 Q709 316 650 345 Q545 313 467 339 Q402 321 354 343 Q177 348 0 351 Z",
      "#506F89",.12,79);
    add(marks,"near-water-depth","tonal-mass",
      "M0 421 Q180 401 355 407 C404 393 461 416 518 404 Q604 398 660 413 Q716 398 779 413 Q848 402 960 421 L960 960 H0 Z",
      "#34677A",.28,103);
    add(marks,"boat-contact","focal-shadow",
      "M698 407 Q747 410 803 407 Q817 412 830 415 Q767 422 723 417 Q708 414 698 407 Z",
      "#395867",.34,194);
    add(marks,"horizon-lost-edge","wet-edge",
      "M385 347 Q427 340 495 347 Q555 339 616 349 M692 345 Q734 336 782 347 Q837 342 896 350",
      "#4F8494",.18,134,5);
    for(let i=0;i<78;i++){
      const x=359+seedRand(seed,i,311)*557;
      const y=367+seedRand(seed,i,313)*119;
      const distance=(y-367)/119;
      const len=12+seedRand(seed,i,317)*58*(.5+distance);
      const rise=(seedRand(seed,i,319)-.5)*7;
      const d="M"+n(x)+" "+n(y)+" q"+n(len*.32)+" "+n(rise)+
        " "+n(len*.7)+" "+n(rise*.32)+" t"+n(len*.3)+" "+n(rise*.22);
      add(marks,"wet-water-"+i,i%6===0?"wet-edge":"directional-drybrush",
        d,i%7===0?"#BDAE94":i%3===0?"#376B82":"#527C89",
        .21+.17*seedRand(seed,i,323),125+i%57,
        (i%6===0?1.4:.55)+distance*.5);
      if(i%5===0){
        const rx=x+len*.37,ry=y+rise*.8;
        reserves.push({path:"M"+n(rx)+" "+n(ry)+
          " q"+n(len*.24)+" "+n(rise*.3)+" "+n(len*.44)+" "+n(rise*.22),
          width:.65+distance*.75});
      }
    }
    // Thin, laterally interrupted vessel reflections stay close to the
    // water surface: no long filled sleeves or vertical triangle shadows.
    for(let i=0;i<10;i++){
      const x=712+seedRand(seed,i,557)*94;
      const y=419+i*3.8+seedRand(seed,i,563)*2.2;
      const dx=(i%2?-1:1)*(9+seedRand(seed,i,569)*21);
      add(marks,"boat-reflected-light-"+i,"directional-drybrush",
        "M"+n(x)+" "+n(y)+" q"+n(dx*.42)+" "+n(1.4+seedRand(seed,i,571)*2.2)+
        " "+n(dx)+" "+n((seedRand(seed,i,573)-.5)*3),
        i%3===0?"#D3C1A3":"#6E9798",.27,190+i*3,
        .45+seedRand(seed,i,577)*.4);
    }
  }else{
    // A simple flat facade fails at full-size. These transparent focal
    // shadow planes anchor the roof and portal, but no all-over blackout.
    add(marks,"roof-cast-plane","tonal-mass",
      "M426 294 L568 205 L769 207 L900 291 L889 317 L770 246 L575 243 L449 319 Z",
      "#554D64",.21,75);
    add(marks,"wall-cool-half","transparent-glaze",
      "M769 255 L882 317 L882 468 H771 Z",
      "#3C6177",.2,111);
    add(marks,"wall-warm-half","transparent-glaze",
      "M465 320 L574 256 L675 256 L662 467 H465 Z",
      "#C8A07D",.13,106);
    add(marks,"portal-depth","focal-shadow",
      "M636 469 L636 390 Q638 359 670 359 Q702 359 704 391 V469 H695 V394 Q694 367 670 367 Q647 367 645 395 V469 Z",
      "#3D5B69",.33,179);
    const windows=(x:number,y:number)=>{
      for(let j=0;j<6;j++){
        const bx=525+(j%3)*108,by=329+Math.floor(j/3)*73;
        if(x>=bx-7&&x<=bx+48&&y>=by-7&&y<=by+45)return true;
      }
      return false;
    };
    // Stonework follows building volume; strokes touching a window are
    // rejected, including both endpoints and midpoint.
    for(let i=0;i<110;i++){
      const x=480+seedRand(seed,i,401)*393;
      const y=322+seedRand(seed,i,403)*143;
      const dx=4+seedRand(seed,i,409)*24;
      if(windows(x,y)||windows(x+dx*.5,y)||windows(x+dx,y))continue;
      const d="M"+n(x)+" "+n(y)+" q"+n(dx*.34)+" "+
        n((seedRand(seed,i,411)-.5)*3)+" "+n(dx)+" "+
        n((seedRand(seed,i,419)-.5)*1.4);
      add(marks,"plaster-brush-"+i,i%4===0?"wet-edge":"directional-drybrush",
        d,i%4===0?"#6F7976":i%3===0?"#A17A68":"#866D59",
        .17+.15*seedRand(seed,i,421),135+i%64,
        i%4===0?1.6:.43);
    }
    // Roof crack lifting is a *mask*, not opaque painted highlight strokes.
    for(let i=0;i<13;i++){
      const x=580+seedRand(seed,i,479)*172;
      const y=217+seedRand(seed,i,487)*18;
      const dx=7+seedRand(seed,i,491)*17;
      reserves.push({path:"M"+n(x)+" "+n(y)+" q"+
        n(dx*.3)+" -2 "+n(dx)+" 0",width:.55});
    }
  }
  if(marks.length>300||reserves.length>50)
    throw new RangeError("WM7 artist material budget exceeded.");
  return {marks,reserves};
}

/** Original watercolor glazing and reductive highlights.
 * Opacity, timing and anatomy are authorable; SVG filter is applied only to
 * paint, never captions, structural annotation or the whole film.
 */
export function WatercolourMasterworkMaterial({study,seed,frame,intensity=1}:{
  study:MasterworkStudy;seed:number;frame:number;intensity?:number;
}){
  const plan=useMemo(()=>watercolourMasterworkMaterialPlan(study,seed,intensity),
    [study,seed,intensity]);
  const id=useId().replace(/[^a-zA-Z0-9_-]/g,"");
  return <g data-km-masterwork-medium="" data-km-masterwork-strength={intensity}
    data-km-masterwork-marks={plan.marks.length} data-km-masterwork-lifts={plan.reserves.length}
    pointerEvents="none" style={{mixBlendMode:"multiply"}}>
    {intensity>0&&<defs>
      <filter id={"km-masterwork-paper-"+id} x="-4%" y="-4%" width="108%" height="108%"
        colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".052 .081"
          numOctaves={2} seed={seed%997+1} result="paper"/>
        <feDisplacementMap in="SourceGraphic" in2="paper"
          scale="1.4" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <filter id={"km-masterwork-atmosphere-"+id} x="-20%" y="-30%"
        width="140%" height="160%">
        <feGaussianBlur stdDeviation="10"/>
      </filter>
      <filter id={"km-masterwork-soft-"+id} x="-8%" y="-8%"
        width="116%" height="116%">
        <feGaussianBlur stdDeviation="3.8"/>
      </filter>
      <linearGradient id={"km-masterwork-water-"+id}
        gradientUnits="userSpaceOnUse" x1="0" y1="390" x2="0" y2="565">
        <stop offset="0" stopColor="#34677A" stopOpacity=".88"/>
        <stop offset=".55" stopColor="#34677A" stopOpacity=".52"/>
        <stop offset="1" stopColor="#34677A" stopOpacity="0"/>
      </linearGradient>
      <mask id={"km-masterwork-lift-"+id} maskUnits="userSpaceOnUse"
        x="0" y="0" width="960" height="540">
        <rect x="0" y="0" width="960" height="540" fill="#fff"/>
        {plan.reserves.map((m,i)=><path key={i} d={m.path}
          fill="none" stroke="#000" strokeLinecap="round" strokeWidth={m.width}/>)}
      </mask>
    </defs>}
    {intensity>0&&<g mask={"url(#km-masterwork-lift-"+id+")"}>
      {plan.marks.map(m=>{
        const presence=clamp((frame-m.startFrame)/28);
        const sway=m.plantIndex===undefined?0:
          .95*Math.sin(frame*.025+(m.plantX??0)*.008)+
          .65*Math.sin(frame*.017+m.plantIndex*.51);
        const plant=m.plantIndex===undefined?m.transform:
          "translate("+n(m.plantX??0)+" "+n(
            // Rebuild the source rig's exact root y from source q.
            478+(seedRand(seed,m.plantIndex,19)-.5)*19
          )+") rotate("+n(sway)+")";
        return <path key={m.id} data-km-masterwork-kind={m.kind}
          d={m.path} fill={m.strokeWidth?"none":
            m.id==="near-water-depth"?"url(#km-masterwork-water-"+id+")":m.color}
          stroke={m.strokeWidth?m.color:"none"} strokeWidth={m.strokeWidth}
          strokeLinecap="round" strokeLinejoin="round"
          opacity={m.opacity*presence*intensity}
          transform={plant} filter={m.kind==="directional-drybrush"?undefined:
            m.id==="warm-air"||m.id==="cool-mist"?
            "url(#km-masterwork-atmosphere-"+id+")":
            m.id==="near-water-depth"||m.id==="wall-cool-half"||m.id==="wall-warm-half"?
            "url(#km-masterwork-soft-"+id+")":
            "url(#km-masterwork-paper-"+id+")"}/>;
      })}
    </g>}
  </g>;
}
