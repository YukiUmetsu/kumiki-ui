/**
 * ANAT2 original standing Ming scholar; optional independent source-space
 * illustration, never a retrofit of the existing Shanshui walking rig.
 * A native body is layered beneath the original ANAT1+EXPR1 bust. The
 * feet, folded cotton robe, hand-held bamboo staff and five finger groups
 * remain separately authored, preserving the portrait's full microstructure.
 *
 * Reference language: Zeng Jing, Portrait of Pan Qintai, 1621, UMMA.
 * Study only, not a copied sitter or licensed source-image tracing.
 */
import {useId} from "react";
import type {CSSProperties,SVGProps} from "react";
import {evaluateInkBrush,inkHash} from "../../registry/video/ink-brush";
import type {InkBrushSpec} from "../../registry/video/ink-brush";
import {InkAnatomicalPortrait} from "./ink-anatomical-portrait";
import type {InkPortraitCharacter,InkPortraitEmotion} from "./ink-anatomical-portrait";

export const INK_STANDING_FIGURE_WIDTH=540;
export const INK_STANDING_FIGURE_HEIGHT=1080;
export interface InkAnatomicalStandingFigureProps
  extends Omit<SVGProps<SVGSVGElement>,"children"|"viewBox"> {
  character?:InkPortraitCharacter;
  emotion?:InkPortraitEmotion;
  intensity?:number;
  detail?:number;
  headScale?:number;
  /** Frame-native, standing (not walking), 0..95. */
  frame?:number;
  reducedMotion?:boolean;
  /** Reframe the same original SVG source-space geometry without resampling. */
  camera?:"full"|"waist"|"grip"|"hem";
  /** Transparent native film layer; no glued-on parchment/card. */
  transparentPaper?:boolean;
}
const ff=(x:number)=>Number(x.toFixed(3));
const pt=(x:number,y:number,pressure:number,pace:number)=>({x,y,pressure,pace});

/** Registered INK1 native trajectories on the *lower cotton robe* only. */
function lowerRobeInkSpec(character:InkPortraitCharacter):InkBrushSpec {
  const elder=character==="elder";
  const adjust=elder?12:0;
  return {
    version:1,width:540,height:1080,paper:"#f2e6d3",seed:elder?1621:1647,
    strokes:[
      {id:"left-weight-fold",width:4.1,load:.72,dryness:.62,tone:1,startFrame:0,durationFrames:1,
        points:[pt(182,563,.05,1.5),pt(175,707,.72,.66),pt(154,868,.51,1.1),pt(195,1005,.03,2.1)]},
      {id:"inside-left-panel",width:2.7,load:.66,dryness:.77,tone:1,startFrame:0,durationFrames:1,
        points:[pt(246,575,.04,1.6),pt(237,733,.87,.78),pt(223,906,.35,1.3),pt(208,1023,.02,2.2)]},
      {id:"crossed-inner-hem",width:3.4,load:.55,dryness:.81,tone:2,startFrame:0,durationFrames:1,
        points:[pt(311,570,.07,1.7),pt(298,714,.9,.59),pt(306,883,.48,.94),pt(319,1013,.02,2)]},
      {id:"right-bias-fold",width:4.25,load:.74,dryness:.59,tone:1,startFrame:0,durationFrames:1,
        points:[pt(369,559,.06,1.9),pt(365,704,.82,.62),pt(390,877,.60,1.12),pt(394,1009,.03,2.1)]},
      {id:"hanging-sleeve-dry-release",width:5.1,load:.57,dryness:.89,tone:1,startFrame:0,durationFrames:1,
        points:[pt(437,501,.05,1.7),pt(468,625,.85,.65),pt(447,727+adjust,.55,1.15),pt(417,762+adjust,.03,2.2)]},
      {id:"bamboo-hand-sleeve",width:3.15,load:.62,dryness:.70,tone:1,startFrame:0,durationFrames:1,
        points:[pt(142,487,.07,1.8),pt(111,561,.77,.74),pt(126,620,.37,1.3),pt(151,642,.03,2.1)]},
    ],
  };
}
const INK_FIGURE_LOWER_MARKS={
  scholar:evaluateInkBrush(lowerRobeInkSpec("scholar"),1,true),
  elder:evaluateInkBrush(lowerRobeInkSpec("elder"),1,true),
};

/** Reproducible absolute frame, independent of mount order or editor clock. */
export function inkStandingPoseAt(frame:number,reducedMotion=false) {
  if(!Number.isSafeInteger(frame)||frame<0||frame>95)
    throw new RangeError("Standing ANAT2 frame must be 0..95");
  const t=reducedMotion?0:frame;
  return {
    // Feet and robe baseline never move. The upper cloth breathes in millimeters.
    breathe:reducedMotion?0:ff(1.55*Math.sin(t*Math.PI/24)),
    sleeve:reducedMotion?0:ff(2.9*Math.sin(t*Math.PI/33)),
    staff:reducedMotion?0:ff(.65*Math.sin(t*Math.PI/38)),
  };
}

/** Original standing figure is a source-space SVG, fully editable as DOM. */
export function InkAnatomicalStandingFigure({
  character="scholar",emotion="neutral",intensity=1,detail=1,headScale=.48,
  frame=0,reducedMotion=false,camera="full",transparentPaper=false,style,...svgProps
}:InkAnatomicalStandingFigureProps) {
  if(!Number.isFinite(detail)||detail<.25||detail>1)
    throw new RangeError("Standing ANAT2 detail must be .25..1");
  const pose=inkStandingPoseAt(frame,reducedMotion);
  const uid="km-standing-"+useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const elder=character==="elder";
  const ink=elder?"#4b514b":"#494a46",wash=elder?"#9c9a8e":"#a7a49b";
  const robe=elder?"#e0d6c8":"#e6dccd",under="#f0e7d9";
  const cameras={
    full:{viewBox:"0 0 540 1080",height:1080},
    waist:{viewBox:"65 425 420 305",height:392},
    grip:{viewBox:"87 535 100 134",height:724},
    hem:{viewBox:"158 855 290 196",height:365},
  } as const;
  if(!(camera in cameras))throw new RangeError("Invalid standing ANAT2 camera");
  const filmCamera=cameras[camera];
  const nativeStyle:CSSProperties={display:"block",width:"100%",height:"auto",
    background:transparentPaper?"transparent":"#f2e6d3",...style};
  return <svg {...svgProps} xmlns="http://www.w3.org/2000/svg"
    role="img" aria-label={svgProps["aria-label"]??(
      (elder?"Elder":"Young")+" original Chinese ink full standing scholar")}
    viewBox={filmCamera.viewBox} width="540" height={filmCamera.height}
    style={nativeStyle} data-km-ink-standing-camera={camera}
    data-km-ink-standing-figure={character} data-km-ink-standing-frame={frame}
    data-km-ink-standing-physical="source-540x1080"
    data-km-ink-standing-paper={transparentPaper?"transparent":"paper"}
    data-km-ink-standing-ground="soles-fixed">
    <defs>
      <clipPath id={uid+"-robe-boundary"}>
        <path d="M166 458 C127 470 91 500 80 560 Q64 625 89 691
          Q108 723 151 739 L167 714 C165 805 159 875 179 1008
          Q226 1024 279 1016 Q357 1035 424 1010
          Q420 907 409 806 L431 780 Q477 737 478 654
          Q473 528 406 462 Q366 426 312 436
          L243 450 Q201 431 166 458 Z"/>
      </clipPath>
      <linearGradient id={uid+"-upper-robe-release"} x1="0" y1="0"
        x2="0" y2="620" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#fff"/>
        <stop offset=".79" stopColor="#fff"/>
        <stop offset=".86" stopColor="#fff" stopOpacity=".96"/>
        <stop offset=".96" stopColor="#fff" stopOpacity=".18"/>
        <stop offset="1" stopColor="#000"/>
      </linearGradient>
      <mask id={uid+"-upper-robe-contact"} maskUnits="userSpaceOnUse"
        maskContentUnits="userSpaceOnUse" x="0" y="0" width="540" height="620">
        <rect x="0" y="0" width="540" height="620"
          fill={"url(#"+uid+"-upper-robe-release)"}/>
      </mask>
      <filter id={uid+"-paper-spread"} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="5.7"/>
      </filter>
      <filter id={uid+"-fiber"} x="-15%" y="-8%" width="130%" height="116%">
        <feTurbulence baseFrequency=".21 .29" numOctaves={3}
          seed={elder?391:407} type="fractalNoise" result="fibres"/>
        <feDisplacementMap in="SourceGraphic" in2="fibres"
          scale="1.0" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs>
    {!transparentPaper&&<rect width="540" height="1080"
      fill="#f2e6d3" data-km-ink-standing-paper-ground="true"/>}
    {/* Soles precede the outer garment. The ground contact points do not move. */}
    <g data-km-ink-fixed-feet="true">
      <ellipse cx="288" cy="1026" rx="119" ry="8" fill={ink} opacity=".08"
        filter={"url(#"+uid+"-paper-spread)"}/>
      {([0,1] as const).map((n)=>{
        const cx=n?349:237;
        return <g key={n} data-km-ink-foot={n} transform={"translate("+cx+" 0)"}>
          <path d="M-27 985 Q-23 1001 -28 1011
            Q-34 1021 -23 1024 Q-4 1035 26 1023 Q32 1011 20 1004
            L13 982 Z" fill="#bead95" stroke={ink} strokeWidth=".78"
            strokeOpacity=".46"/>
          <path d="M-28 1017 Q-4 1026 28 1018 Q32 1024 23 1029
            Q-11 1035 -27 1026 Z" fill={ink} opacity=".43"/>
          <path d="M-13 1000 Q1 1007 15 1011 M-24 1010 Q3 1011 25 1016"
            stroke={ink} opacity=".43" strokeWidth="1.1" fill="none"/>
          {Array.from({length:5},(_,i)=><path key={i}
            d={"M"+(-21+i*7)+" 1017 q3 -"+(2+i%3)+" 7 -1"}
            stroke={ink} strokeWidth=".38" opacity=".32" fill="none"/>)}
        </g>;
      })}
    </g>
    {/* The under-robe is one topologically continuous weight-bearing fabric
        surface; hem, cuffs and shoulder are not independent stickers. */}
    <g data-km-ink-garment-structure="overlapping-cotton-ankle-robe">
      <path d="M166 458 C127 470 91 500 80 560 Q64 625 89 691
        Q108 723 151 739 L167 714 C165 805 159 875 179 1008
        Q226 1024 279 1016 Q357 1035 424 1010
        Q420 907 409 806 L431 780 Q477 737 478 654
        Q473 528 406 462 Q366 426 312 436
        L243 450 Q201 431 166 458 Z"
        fill={under} stroke={ink} strokeWidth="1.5" strokeOpacity=".40"/>
      <path d="M165 476 C136 575 153 656 177 736
        Q194 848 179 1009 Q224 1014 275 1014
        Q278 861 279 690 Q267 552 231 464 Z"
        fill={robe} opacity=".66"/>
      <path d="M316 455 C358 471 397 522 410 616
        Q389 785 422 1008 Q367 1016 279 1014
        Q272 830 288 662 Q296 546 316 455 Z"
        fill={robe} opacity=".57"/>
      <path d="M178 551 Q145 647 153 737 Q110 766 88 680
        Q80 622 99 557 Q117 509 164 470"
        fill={robe} stroke={ink} strokeWidth=".96" strokeOpacity=".36"/>
      <path d="M390 478 Q434 520 453 593 Q489 668 453 739
        Q424 784 386 777 Q408 684 408 596"
        fill={robe} stroke={ink} strokeWidth=".83" strokeOpacity=".39"/>
      <path d="M199 1002 Q230 996 254 1007
        Q286 1018 311 1004 Q360 1008 401 999"
        fill="none" stroke={ink} strokeWidth="1.34" opacity=".43"/>
      <path d="M178 953 Q176 985 182 1010
        M420 956 Q420 983 425 1008"
        fill="none" stroke={ink} strokeWidth="3.3" opacity=".18"
        filter={"url(#"+uid+"-paper-spread)"}/>
      <g clipPath={"url(#"+uid+"-robe-boundary)"}>
        {/* Each fine hemp-like fiber descends along the local fabric's
            gravity flow, with individually varying load and release. */}
        {Array.from({length:82},(_,i)=>{
          const left=i<41,k=i%41,ratio=k/40;
          const startX=left?120+ratio*155:290+ratio*167;
          const startY=560+14*Math.sin(i*1.43)+((i*11)%41);
          const endY=875+((i*37)%160);
          const endX=startX+(left?-1:1)*(3+18*Math.sin(i*.37));
          const bend=Math.sin(i*.72)*21;
          const op=(.07+(i%7)*.016)*detail;
          return <path key={"fiber"+i} data-km-ink-garment-flow={i}
            d={"M"+ff(startX)+" "+ff(startY)
              +" C"+ff(startX+bend)+" "+ff(startY+130)
              +" "+ff(endX-bend*.3)+" "+ff(endY-110)
              +" "+ff(endX)+" "+ff(endY)}
            stroke={i%5===0?ink:wash} fill="none"
            strokeWidth={.27+(i%6)*.105} opacity={op}
            strokeLinecap="round"/>;
        })}
        {Array.from({length:46},(_,i)=>{
          const x=175+inkHash(901,i,1)*241,y=625+inkHash(901,i,2)*350;
          const len=10+inkHash(901,i,3)*27;
          return <path key={"sweep"+i} data-km-ink-garment-dry-lift={i}
            d={"M"+ff(x)+" "+ff(y)+" q"+ff((inkHash(901,i,4)-.5)*15)
              +" "+ff(len*.45)+" "+ff((inkHash(901,i,5)-.5)*10)+" "+ff(len)}
            stroke={i%5===0?"#f5ecdc":wash} fill="none"
            strokeWidth={.30+(i%4)*.22} opacity={.18*detail}/>;
        })}
      </g>
      {/* INK1 loaded, pressure-paced native actual brush geometry;
          never a uniformly stroked vector overlay or film-grain post effect. */}
      {INK_FIGURE_LOWER_MARKS[character].map((mark,i)=><g key={mark.id}
        data-km-ink-standing-pressure={mark.id}
        opacity={mark.opacity*.55*detail}>
        <mask id={uid+"-lower-brush-"+i} maskUnits="userSpaceOnUse"
          x="0" y="0" width="540" height="1080">
          <rect width="540" height="1080" fill="#fff"/>
          {mark.gaps.map((g,j)=><path key={"g"+j} d={g.d}
            stroke="#000" fill="none" strokeWidth={g.width} strokeLinecap="round"/>)}
          {mark.pores.map((p,j)=><ellipse key={"p"+j} cx={p.x} cy={p.y}
            rx={p.rx} ry={p.ry} fill="#000"/>)}
        </mask>
        <path d={mark.outline} fill={ink}
          mask={"url(#"+uid+"-lower-brush-"+i+")"} opacity=".59"/>
        <path d={mark.core} fill={ink}
          mask={"url(#"+uid+"-lower-brush-"+i+")"} opacity=".16"/>
        {mark.hairs.map((hair,j)=><path key={"h"+j}
          d={hair.d} data-km-ink-standing-bristle={mark.id}
          fill="none" stroke={ink} strokeWidth={hair.width}
          opacity={hair.opacity*.66}/>)}
      </g>)}
    </g>
    {/* The old upper bust cut off in a dead-straight line at y=612,
        impossible on a real cotton robe. Preserve ALL original ink
        microgeometry and dissolve its lower hem across >120 paper units
        into the continuous standing cotton substrate. The mask stays in
        source coordinates, not in screen space or an animated CSS texture. */}
    <g data-km-ink-standing-seam="paper-wicked-continuous"
      mask={"url(#"+uid+"-upper-robe-contact)"}>
      <g transform={"translate(0 "+pose.breathe+")"}>
        <InkAnatomicalPortrait character={character} emotion={emotion}
          intensity={intensity} detail={detail} headScale={headScale}
          view="source" garmentWash="cotton" transparentPaper={true}
          x={0} y={0} width={540} height={620}
          style={{width:540,height:620,overflow:"visible"}}/>
      </g>
    </g>
    {/* A continuous waist-to-ankle set of satin-lit folds obscures the
        temporal edge where the upper and lower robes cross. */}
    <g data-km-ink-joined-folds="torso-to-ankle">
      {Array.from({length:24},(_,i)=>{
        const side=i<12?-1:1,k=i%12;
        const sx=270+side*(48+k*8),sy=537+(i%4)*4;
        const endX=sx+side*(6+k*1.7),endY=818+(i*41)%180;
        const bend=side*(7+k*.35);
        return <path key={i} data-km-ink-joined-robe-line={i}
          d={"M"+ff(sx)+" "+ff(sy)
            +" C"+ff(sx+bend)+" "+ff(sy+76)
            +" "+ff(endX-bend)+" "+ff(endY-125)
            +" "+ff(endX)+" "+ff(endY)}
          fill="none" stroke={i%7===0?ink:wash}
          strokeWidth={.32+(i%4)*.13}
          opacity={(i%6===0?.25:.11)*detail}/>;
      })}
    </g>
    {/* A period bamboo staff anchored by finger grip, with irregular node
        collars and split bamboo fibres. All nodes use the same stem spline. */}
    <g data-km-ink-bamboo-staff="continuous" transform={"translate("+pose.staff+" 0)"}>
      <path d="M123 237 Q124 410 129 586 Q137 790 127 1043"
        stroke="#8e866b" strokeWidth="5.9" strokeLinecap="round" fill="none"
        opacity=".48"/>
      <path d="M122 237 Q126 410 129 586 Q136 790 126 1043"
        stroke={ink} strokeWidth="1.1" strokeLinecap="round" fill="none"
        opacity=".59"/>
      {Array.from({length:10},(_,i)=>{
        const y=277+i*79.4,x=123+6.2*Math.sin(i*.44);
        return <g key={i} data-km-ink-bamboo-node={i}>
          <path d={"M"+ff(x-5)+" "+ff(y)
            +" Q"+ff(x)+" "+ff(y+4)+" "+ff(x+5)+" "+ff(y-.7)}
            fill="none" stroke={ink} strokeWidth=".81" opacity=".51"/>
          <path d={"M"+ff(x-2)+" "+ff(y+7)+" l1.4 "+ff(27+(i%3)*4)}
            fill="none" stroke="#eeead9" strokeWidth=".46" opacity=".36"/>
        </g>;
      })}
      {Array.from({length:19},(_,i)=>{
        const yy=270+i*38.1,xx=124+6*Math.sin(i*.21);
        return <path key={"staff-fibre"+i}
          d={"M"+ff(xx+(i%3-1)*1.4)+" "+ff(yy)
            +" l"+ff(Math.sin(i*.5)*1.4)+" "+ff(18+i%4*2)}
          stroke={i%5===0?"#ece1ca":ink} strokeWidth=".29"
          fill="none" opacity=".26"/>;
      })}
    </g>
    {/* Left sleeve continues from its shoulder to the real thumb and
        staff-bearing fingers. The hand is intentionally not a mitten. */}
    <g data-km-ink-sleeve-hand="near" transform={"translate("+pose.sleeve+" 0)"}>
      <path d="M163 464 Q127 511 103 554 Q96 587 122 615
        Q136 635 158 621 L171 597 Q156 562 182 532"
        fill={robe} opacity=".64" stroke={ink} strokeWidth=".68" strokeOpacity=".38"/>
      {/** The palm rests around the bamboo's x≈129 shaft, never as a flat
            mitten floating to its right. It retains separate proximal and
            distal anatomy: soft thenar belly, curled phalanges, opposed thumb,
            dorsal wash and tiny isolated nail crescents at the grip contact. */}
      <g data-km-ink-grip-kinematics="opposed-thumb-on-source-bamboo">
        <path data-km-ink-hand-palm="metacarpal-volume"
          d="M135 588 C145 583 155 590 157 603
            C158 614 149 623 139 621
            Q130 618 127 607 Q127 595 135 588 Z"
          fill={elder?"#dfcbb2":"#ead2b7"} stroke={ink}
          strokeWidth=".79" strokeOpacity=".38"/>
        <path d="M144 587 Q159 597 153 614 Q148 621 141 619"
          stroke={wash} strokeWidth="8" opacity=".17"
          fill="none" filter={"url(#"+uid+"-paper-spread)"}/>
        {Array.from({length:4},(_,i)=>{
          const knuckleX=146+(i%2)*2.5;
          const kY=593+i*5.8;
          const tipX=125+i*.65;
          const tipY=kY+6.1;
          const d="M"+ff(knuckleX)+" "+ff(kY)
            +" C"+ff(knuckleX+6)+" "+ff(kY+1)
            +" "+ff(knuckleX-6)+" "+ff(kY+7.7)
            +" "+ff(tipX+3)+" "+ff(tipY-1.5)
            +" C"+ff(tipX-4)+" "+ff(tipY-.9)
            +" "+ff(tipX-4)+" "+ff(tipY+3.8)
            +" "+ff(tipX+1)+" "+ff(tipY+5.3)
            +" C"+ff(tipX+9)+" "+ff(tipY+8)
            +" "+ff(knuckleX+2)+" "+ff(kY+12.3)
            +" "+ff(knuckleX+3.1)+" "+ff(kY+5.1)+" Z";
          return <g key={i} data-km-ink-hand-phalange={i}>
            <path data-km-ink-hand-finger={i} d={d}
              fill={elder?"#dec8ac":"#e9cdb1"} fillOpacity=".86"
              stroke={ink} strokeWidth=".48"
              strokeOpacity=".48" strokeLinejoin="round"/>
            <path data-km-ink-grip-nail={i}
              d={"M"+ff(tipX-1.3)+" "+ff(tipY+2)
                +" q1.8 1.6 4.8 .3"}
              fill="none" stroke={wash} strokeWidth=".42" opacity=".36"/>
            <path d={"M"+ff(knuckleX-5)+" "+ff(kY+5.4)
              +" q-3 1.8 -5 2.3"}
              fill="none" stroke={wash} strokeWidth=".53" opacity=".24"/>
          </g>;
        })}
        {/** Opposed first metacarpal crosses over the shaft toward index
              phalanx; the skin actually interrupts the staff's thin ink line. */}
        <path data-km-ink-hand-opposed-thumb="true"
          d="M139 601 C133 595 128 591 124 588
            C119 585 115 590 117 596
            Q119 601 128 604 Q133 606 136 611
            Q140 611 142 608 Z"
          fill={elder?"#dbc3a7":"#e8ceb0"} fillOpacity=".91"
          stroke={ink} strokeWidth=".63" strokeOpacity=".47"/>
        <path d="M122 591 Q126 595 127 599 Q129 601 131 601"
          stroke={wash} strokeWidth=".62" opacity=".39" fill="none"/>
        {Array.from({length:14},(_,i)=>{
          const k=i%7,t=Math.floor(i/7),xx=136+k*2.1;
          const yy=591+t*17+Math.sin(i*1.2)*2;
          return <path key={i} data-km-ink-hand-skin-fibre={i}
            d={"M"+ff(xx)+" "+ff(yy)
              +" q"+ff(1.0+Math.sin(i*1.1))+" 2.6 "+ff(-.7+k*.16)+" 4.1"}
            fill="none" stroke={i%3===0?ink:wash} strokeWidth=".28"
            opacity={.13+(i%4)*.028}/>;
        })}
      </g>
    </g>
    <title>Independent source-built late Ming standing scholar; preserved full ANAT1 face and physical garments</title>
  </svg>;
}
