import { useId } from "react";
import { paintHash } from "../../registry/video/watercolour-brush";

/** Original constructions informed by reference *principles*, not traced images.
 * Exact paper coordinates are locked to the three WM4–WM7 authored scenes.
 * These are semantic masses, attached contours and real negative spaces;
 * no source image pixels are embedded or loaded.
 */
const fixed=(n:number)=>n.toFixed(2);
const h=(seed:number,a:number,b:number)=>paintHash(seed,a,b);
const reveal=(frame:number,start:number,span:number)=>
  Math.min(1,Math.max(0,(frame-start)/span));

export type ReferencePetal={
  angle:number;length:number;path:string;fold:string;
};
/** 13 root-joined asymmetric ray florets; each closes back into the disc.
 * The alternating petal lengths, turning points, and midrib curves avoid
 * the equal ellipses of the former primitive flower-head implementation.
 */
export function referenceDaisyPetals(seed:number,index:number):ReferencePetal[]{
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647)
    throw new RangeError("Reference-art seed must be a nonnegative 31-bit integer.");
  if(!Number.isSafeInteger(index)||index<0||index>10000)
    throw new RangeError("Invalid flower index.");
  return Array.from({length:13},(_,i)=>{
    const twist=h(seed,index*37+i,307),asym=h(seed,index*17+i,311);
    const length=12.5+5.5*twist,wide=2.3+1.2*asym;
    const angle=i*360/13+(twist-.5)*8;
    const path="M0 -3.7 C"+fixed(-wide*.65)+" "+fixed(-length*.35)+
      " "+fixed(-wide*1.35)+" "+fixed(-length*.73)+" "+
      fixed(-wide*.65)+" "+fixed(-length+1.8)+
      " Q"+fixed(-wide*.2)+" "+fixed(-length-1.5)+
      " "+fixed(wide*.36)+" "+fixed(-length)+
      " C"+fixed(wide*1.5)+" "+fixed(-length*.76)+
      " "+fixed(wide*.91)+" "+fixed(-length*.34)+
      " 0 -3.7 Z";
    const fold="M"+fixed(-.2)+" -4.4 Q"+
      fixed(-.6+asym)+" "+fixed(-length*.54)+" "+
      fixed(-wide*.09)+" "+fixed(-length*.91);
    return {angle,length,path,fold};
  });
}

/** Paint construction of one observation-led flower at the existing source
 * bloom root. Paper reserves between florets are actual geometric gaps,
 * not white overpaint. Small colored folds follow the same petal paths.
 */
export function WatercolourReferenceFlower({cx,cy,seed,index,frame}:{
  cx:number;cy:number;seed:number;index:number;frame:number;
}){
  const petals=referenceDaisyPetals(seed,index);
  const id="km-ref-flower-"+useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const appear=reveal(frame,95+index*3,65);
  return <g data-km-reference-subject="botanical-flower"
    data-km-joined-petals={petals.length}
    transform={"translate("+fixed(cx)+" "+fixed(cy)+")"} opacity={appear}>
    <defs>
      <linearGradient id={id+"-petal"} x1="0" y1="0" x2=".7" y2="1">
        <stop offset="0" stopColor="#B3A67D" stopOpacity=".8"/>
        <stop offset=".34" stopColor="#F4E8C9" stopOpacity=".9"/>
        <stop offset=".72" stopColor="#EFE2C5" stopOpacity=".75"/>
        <stop offset="1" stopColor="#CEC092" stopOpacity=".77"/>
      </linearGradient>
      <radialGradient id={id+"-disc"}>
        <stop offset="0" stopColor="#C7AB5F"/>
        <stop offset=".62" stopColor="#A98C51"/>
        <stop offset="1" stopColor="#6C6F4A"/>
      </radialGradient>
    </defs>
    {/* Sepals are attached under the corolla, not independent dark dots. */}
    {Array.from({length:6},(_,i)=><path key={"sepal"+i}
      transform={"rotate("+(i*60+11)+")"}
      d="M-1 -2 Q-3 -7 0 -11 Q3 -6 1 -2Z" fill="#6D8462" opacity=".62"/>)}
    {petals.map((p,i)=><g key={i} transform={"rotate("+fixed(p.angle)+")"}
      data-km-petal-root="0,-3.7">
      <path d={p.path} fill={"url(#"+id+"-petal)"} opacity={.68+.06*(i%3)}
        stroke={i%4===0?"#B1A27E":"#B7AA8C"} strokeWidth=".35"/>
      <path d={p.fold} stroke={i%2?"#A6A280":"#CABD95"} strokeWidth=".42"
        opacity=".55" fill="none" strokeLinecap="round"/>
      {i%4===1&&<path d="M.7 -6.6 Q2.5 -10.2 1.2 -13.9"
        stroke="#FFF6DF" strokeWidth=".35" opacity=".3" fill="none"/>}
    </g>)}
    {/* Dense, convex, irregularly mottled disc replaces a featureless circle. */}
    <path d="M-5.2 -1.1 Q-6.8 -5.8 -1.1 -6.2 Q5.9 -6.4 6.3 -1
      Q7.1 4.8 1.9 5.4 Q-4.3 5.2 -5.2 -1.1 Z"
      fill={"url(#"+id+"-disc)"} opacity=".9"/>
    {Array.from({length:28},(_,i)=>{
      const a=i*2.39996,d=Math.sqrt(i)*.97;
      const x=Math.cos(a)*d,y=Math.sin(a)*d-.6;
      return <ellipse key={i} cx={x} cy={y} rx={.44+.13*(i%3)} ry={.55}
        fill={i%3===0?"#5B704E":i%3===1?"#E4CA85":"#887447"}
        opacity={.48+.12*(i%4)}/>;
    })}
    <path d="M-4 3.3 Q-1 6 3 4.9" stroke="#4D6E54" strokeWidth=".7"
      fill="none" opacity=".48"/>
  </g>;
}

/** Hero vessel's geometry, source-relative and shareable with tests and
 * material passes. Ropes terminate at real mast/deck points. */
export const REFERENCE_BOAT_GEOMETRY={
  mast:{x:761,y:399,topY:316},
  bow:{x:840,y:398},stern:{x:686,y:398},
  hull:"M686 397 C713 394 738 398 759 396 Q801 393 841 398 Q820 418 764 419 Q717 417 695 407 Z",
  upperRail:"M690 396 Q718 390 761 394 Q807 389 841 397",
  keel:"M699 410 Q741 429 800 419 Q820 412 828 406",
  mainsail:"M758 321 Q755 339 743 355 Q728 376 716 391 Q739 387 756 393 Q766 358 758 321 Z",
  headsail:"M765 331 Q782 352 803 381 L824 393 Q791 389 768 390 Q773 363 765 331 Z",
  boom:"M710 393 Q740 389 763 390",
  backstay:"M761 318 Q734 359 693 398",
  forestay:"M761 318 Q797 350 839 397",
} as const;

/** A genuinely constructed foreground watercraft with an enclosed hull,
 * mast/boom and two shaped fabric sails, connected graphite rigging, a
 * multi-part seated sailor and a root-connected contact wake.
 */
export function WatercolourReferenceBoat({frame,seed=83}:{
  frame:number;seed?:number;
}){
  const appear=reveal(frame,169,55);
  const bob=1.25*Math.sin(frame*.035+seed*.002);
  const g=REFERENCE_BOAT_GEOMETRY;
  const id="km-ref-boat-"+useId().replace(/[^a-zA-Z0-9_-]/g,"");
  return <g data-km-reference-subject="estuary-boat"
    data-km-rope-attachments="mast,bow,stern"
    transform={"translate(0 "+fixed(bob)+")"} opacity={appear}>
    <defs>
      <linearGradient id={id+"-hull"} x1="0" y1="0" x2=".36" y2="1">
        <stop offset="0" stopColor="#A3A8A1"/>
        <stop offset=".46" stopColor="#667D7F"/>
        <stop offset="1" stopColor="#415B65"/>
      </linearGradient>
      <linearGradient id={id+"-cloth"} x1="0" y1="0" x2="1" y2=".25">
        <stop offset="0" stopColor="#F9F6E8"/>
        <stop offset=".44" stopColor="#E8E2CF"/>
        <stop offset=".7" stopColor="#F8F2DA"/>
        <stop offset="1" stopColor="#ADB6B3"/>
      </linearGradient>
    </defs>
    {/* Contact dark comes before the vessel and remains a water mark. */}
    <path d="M687 414 Q723 421 770 421 Q822 419 846 410
      Q823 429 767 430 Q705 427 687 414 Z"
      fill="#3B6473" opacity=".13"/>
    <path d={g.hull} fill={"url(#"+id+"-hull)"}
      stroke="#50676A" strokeWidth="1.05" opacity=".92"/>
    <path d="M693 399 Q740 403 773 402 Q813 403 835 400 L824 409
      Q792 409 760 410 Q720 410 699 405Z"
      fill="#C8C4AD" opacity=".23"/>
    <path d={g.keel} stroke="#304D58" strokeWidth="1.7" opacity=".47"
      fill="none" strokeLinecap="round"/>
    {/* Curved boat rails, at least three deck details and stern structures. */}
    <path d={g.upperRail} stroke="#5F6666" strokeWidth="1.3" fill="none"/>
    <path d="M698 399 Q712 401 721 398 M811 399 Q827 398 834 400"
      stroke="#E7DEC7" strokeWidth=".9" fill="none" opacity=".72"/>
    <path d="M702 397 l-5 -6 v-4 M831 398 l4 -7" stroke="#5B6D6D"
      strokeWidth=".8" fill="none"/>
    <path d="M712 394 Q714 389 720 391 L735 393" stroke="#8B8C7E"
      strokeWidth="1.1" fill="none" opacity=".7"/>
    {/* Sailcloth is constructed with folds under and over joined stays. */}
    <path d={g.mainsail} fill={"url(#"+id+"-cloth)"} stroke="#8DABA8"
      strokeWidth=".8" opacity=".89"/>
    <path d="M758 324 Q746 359 721 388 Q744 375 753 385"
      fill="#96ADB2" opacity=".2"/>
    <path d="M756 330 Q748 354 739 370 Q729 381 723 386"
      stroke="#FDF7E7" strokeWidth="1.25" opacity=".7" fill="none"/>
    <path d="M754 336 Q748 355 740 368 M752 368 Q746 384 722 388"
      stroke="#A3B1AC" strokeWidth=".68" opacity=".62" fill="none"/>
    <path d={g.headsail} fill="#E8E5D6" opacity=".79"
      stroke="#8DA09E" strokeWidth=".6"/>
    <path d="M773 354 Q792 374 820 391" stroke="#FBF4DF"
      strokeWidth="1" fill="none" opacity=".52"/>
    <path d="M781 373 Q790 386 810 391" stroke="#678B93"
      strokeWidth=".6" fill="none" opacity=".45"/>
    {/* Graphite ropes always terminate at shared anchor coordinates. */}
    <path d={g.backstay+" "+g.forestay+" "+g.boom}
      stroke="#435F69" strokeWidth=".58" opacity=".64" fill="none"/>
    <path d="M761 318 V399" stroke="#4D6061" strokeWidth="1.35" fill="none"/>
    <path d="M759 319 V391" stroke="#E7D7B6" strokeWidth=".48" fill="none"
      opacity=".7"/>
    <path d="M766 360 Q787 378 816 396 M714 393 Q734 386 760 392"
      stroke="#6B7E7B" strokeWidth=".48" opacity=".6" fill="none"/>
    {/* Seated human: head/hair/neck, shirt with torso and elbow, forearm,
        thigh, shin, foot. Limbs connect at the actual shoulder and hip. */}
    <g data-km-figure-connected="head-neck-torso-arm-thigh-shin"
      transform="translate(788 385)">
      <path d="M-3 -5 Q-6 -11 -3 -13 Q0 -16 3 -12 Q6 -10 3 -5Z"
        fill="#9B765E" opacity=".86"/>
      <path d="M-5 -10 Q-4 -16 1 -15 Q5 -14 5 -11 Q1 -13 -3 -10Z"
        fill="#5A5A54"/>
      <path d="M-1 -5 V-2" stroke="#B68E73" strokeWidth="1.65"
        strokeLinecap="round"/>
      <path d="M-4 -3 Q-9 0 -9 6 L-2 11 Q5 11 7 5 L4 -2 Z"
        fill="#7E9186" stroke="#4E7678" strokeWidth=".64"/>
      <path d="M3 0 Q8 0 9 4 L6 8" stroke="#CDB08D" strokeWidth="2.25"
        strokeLinecap="round" fill="none"/>
      <path d="M-3 0 Q-7 3 -9 5 Q-13 3 -16 1" stroke="#A38B76"
        strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d="M-1 10 Q5 13 10 13 L16 12" stroke="#637F84"
        strokeWidth="2.9" strokeLinecap="round" fill="none"/>
      <path d="M-1 10 L-8 12 Q-12 13 -15 12" stroke="#546A6B"
        strokeWidth="2.8" strokeLinecap="round" fill="none"/>
      <path d="M14 12 l5 1 M-14 12 l-4 -1" stroke="#504E46"
        strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M-6 1 l-2 5" stroke="#D8D0B7" strokeWidth=".55"
        opacity=".44"/>
    </g>
    {/* Interrupted wake curves share the keel root: no long triangles. */}
    {Array.from({length:14},(_,i)=>{
      const side=i%2?-1:1;
      const x=765+side*(13+i*2.6);
      const y=418+Math.floor(i/2)*3.1;
      const len=10+h(seed,i,431)*18;
      return <path key={i} data-km-wake-root={i}
        d={"M"+fixed(x)+" "+fixed(y)+" q"+
          fixed(side*len*.46)+" "+fixed(2+h(seed,i,439)*2)+" "+
          fixed(side*len)+" "+fixed((h(seed,i,443)-.5)*4)}
        stroke={i%3===0?"#E3DCC7":"#799DA1"}
        strokeWidth={.55+.4*h(seed,i,449)} fill="none"
        opacity={.25+.19*h(seed,i,457)} strokeLinecap="round"/>;
    })}
  </g>;
}

/** Depth-respecting masonry and roof details, aligned to actual authored
 * wall apertures rather than spread across their glass by random noise.
 */
export function WatercolourReferenceCourtyard({frame,seed=83}:{
  frame:number;seed?:number;
}){
  const fade=reveal(frame,175,80);
  const lines=Array.from({length:4},(_,row)=>{
    const t=(row+.7)/5;
    const leftX=433+t*14,leftY=295+t*18;
    const ridgeX=568+t*6,ridgeY=207+t*37;
    const midX=769-t*2,midY=207+t*38;
    const rightX=897-t*13,rightY=292+t*24;
    return {row, leftX,leftY,ridgeX,ridgeY,midX,midY,rightX,rightY};
  });
  return <g data-km-reference-subject="courtyard-construction"
    data-km-roof-courses={lines.length}
    data-km-window-reveals="6" opacity={fade} fill="none">
    {/* Four continuous material courses wrap around both pitches instead of
        independent, randomly scattered hatches. Jagged minuscule end marks
        convey individual slate variation without changing roof mass. */}
    {lines.map(l=><g key={l.row}>
      <path d={"M"+fixed(l.leftX)+" "+fixed(l.leftY)+
        " Q"+fixed((l.leftX+l.ridgeX)/2)+" "+fixed((l.leftY+l.ridgeY)/2-3)+
        " "+fixed(l.ridgeX)+" "+fixed(l.ridgeY)+
        " Q"+fixed((l.ridgeX+l.midX)/2)+" "+fixed(l.midY-1)+
        " "+fixed(l.midX)+" "+fixed(l.midY)+
        " Q"+fixed((l.midX+l.rightX)/2)+" "+fixed((l.midY+l.rightY)/2-2)+
        " "+fixed(l.rightX)+" "+fixed(l.rightY)}
        stroke={l.row%2?"#5D6065":"#9E8B81"}
        strokeWidth={l.row===2?.85:.56} opacity={.38}/>
      {Array.from({length:13},(_,i)=>{
        const t=(i+.4)/13, x=572+(767-572)*t;
        const y=211+l.row*7.5;
        const dx=(h(seed,i+l.row*19,653)-.5)*2;
        return <path key={i}
          d={"M"+fixed(x+dx)+" "+fixed(y)+" l"+
            fixed((h(seed,i+l.row*19,659)-.5)*2)+" "+fixed(2.9+l.row*.3)}
          stroke={i%3===0?"#E7D7BF":"#625F5E"} strokeWidth=".56"
          opacity={.34}/>;
      })}
    </g>)}
    {/* Eaves and structural load path around the existing gable. */}
    <path d="M448 319 Q506 283 573 242 Q661 243 768 246 Q831 275 887 318"
      stroke="#4C5B66" strokeWidth="2.8" opacity=".3"/>
    <path d="M452 323 Q507 288 573 248 Q663 250 767 253 Q826 280 883 324"
      stroke="#9E8B7A" strokeWidth="2.2" opacity=".48"/>
    <path d="M465 322 V468 M880 324 V469"
      stroke="#695D53" strokeWidth="1.7" opacity=".28"/>
    {/* Recessed surrounds on all six windows, each with asymmetric stone
        reveals and glass reflection, preserving clear panes and mullions. */}
    {Array.from({length:6},(_,i)=>{
      const x=525+(i%3)*108,y=329+Math.floor(i/3)*73;
      return <g key={i} data-km-window-aperture={i}>
        <path d={"M"+(x-5)+" "+(y-6)+" H"+(x+47)+" V"+(y+45)+
          " H"+(x-5)+" Z"} stroke="#8E8874" strokeWidth="1.3" opacity=".41"/>
        <path d={"M"+(x-2)+" "+(y-3)+" L"+(x+43)+" "+(y-3)+
          " M"+(x+45)+" "+(y-1)+" V"+(y+41)}
          stroke="#F0DDC2" strokeWidth="2" opacity=".41"/>
        <path d={"M"+(x+2)+" "+(y+8)+" l13 -5 M"+(x+23)+" "+(y+30)+
          " l13 -8"} stroke="#FBF7E5" strokeWidth="1.5" opacity=".16"/>
        <path d={"M"+(x-6)+" "+(y+43)+" h54"}
          stroke="#6C655B" strokeWidth="1.75" opacity=".44"/>
        <path d={"M"+(x-3)+" "+(y+45)+" q20 2 49 -1"}
          stroke="#B4A58D" strokeWidth="1.75" opacity=".35"/>
      </g>;
    })}
    {/* Hand-laid irregular facade mortar explicitly skips all windows. */}
    {Array.from({length:105},(_,i)=>{
      const x=477+h(seed,i,671)*395;
      const y=324+h(seed,i,673)*137;
      const dx=4+h(seed,i,677)*20;
      if(y>=360&&x>=635&&x<=706)return null;
      for(let row=0;row<2;row++)for(let col=0;col<3;col++){
        const wx=525+col*108,wy=329+row*73;
        if(x>=wx-9&&x<=wx+51&&y>=wy-9&&y<=wy+48 ||
          x+dx>=wx-9&&x<=wx+51&&y>=wy-9&&y<=wy+48)return null;
      }
      return <path key={i} d={"M"+fixed(x)+" "+fixed(y)+" q"+
        fixed(dx*.24)+" "+fixed(-1.5+h(seed,i,683)*3)+" "+
        fixed(dx)+" "+fixed((h(seed,i,691)-.5)*3)}
        stroke={i%5===0?"#7B7064":"#B3A28A"} strokeWidth={.45+h(seed,i,697)*.36}
        opacity={.11+.18*h(seed,i,701)}/>;
    })}
  </g>;
}
