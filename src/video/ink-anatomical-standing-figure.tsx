/**
 * ANAT2 original standing Ming scholar; optional independent source-space
 * illustration, never a retrofit of the existing Shanshui walking rig.
 * A complete figure and head are independently authored from period
 * portrait studies. No ANAT1 face, prior Shanshui character or screenshot
 * is reused. The face uses layered mogu wash, with separate anatomy/expressions.
 *
 * Reference language: Zeng Jing, Portrait of Pan Qintai, 1621, UMMA.
 * Study only, not a copied sitter or licensed source-image tracing.
 */
import {useId} from "react";
import type {CSSProperties,SVGProps} from "react";
import {evaluateInkBrush,inkHash} from "../../registry/video/ink-brush";
import type {InkBrushSpec} from "../../registry/video/ink-brush";
import {INK_PORTRAIT_CHARACTERS,INK_PORTRAIT_EMOTIONS} from "./ink-anatomical-portrait";
import type {InkPortraitCharacter,InkPortraitEmotion} from "./ink-anatomical-portrait";
import {InkZengJingScholarHead} from "./ink-zengjing-scholar-head";

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
  camera?:"full"|"face"|"waist"|"grip"|"hem";
  /** Transparent native film layer; no glued-on parchment/card. */
  transparentPaper?:boolean;
}
const ff=(x:number)=>Number(x.toFixed(3));
const pt=(x:number,y:number,pressure:number,pace:number)=>({x,y,pressure,pace});

/** Registered INK1 native trajectories on the *lower cotton robe* only. */
function lowerRobeInkSpec(character:InkPortraitCharacter):InkBrushSpec {
  const elder=character==="elder";
  const adjust=elder?6:0;
  return {
    version:1,width:540,height:1080,paper:"#f2e6d3",seed:elder?1621:1647,
    strokes:[
      {id:"left-weight-fold",width:4.1,load:.72,dryness:.62,tone:1,startFrame:0,durationFrames:1,
        points:[pt(182,563,.05,1.5),pt(175,707,.72,.66),pt(184,868,.51,1.1),pt(195,982,.03,2.1)]},
      {id:"inside-left-panel",width:2.7,load:.66,dryness:.77,tone:1,startFrame:0,durationFrames:1,
        points:[pt(246,575,.04,1.6),pt(237,733,.87,.78),pt(223,906,.35,1.3),pt(208,982,.02,2.2)]},
      {id:"crossed-inner-hem",width:3.4,load:.55,dryness:.81,tone:2,startFrame:0,durationFrames:1,
        points:[pt(311,570,.07,1.7),pt(298,714,.9,.59),pt(306,883,.48,.94),pt(319,982,.02,2)]},
      {id:"right-bias-fold",width:4.25,load:.74,dryness:.59,tone:1,startFrame:0,durationFrames:1,
        points:[pt(339,559,.06,1.9),pt(352,704,.82,.62),pt(348,877,.60,1.12),pt(351,982,.03,2.1)]},
      {id:"hanging-sleeve-dry-release",width:4.1,load:.57,dryness:.89,tone:1,startFrame:0,durationFrames:1,
        points:[pt(354,472,.05,1.7),pt(390,565,.85,.65),pt(385,646+adjust,.55,1.15),pt(360,680+adjust,.03,2.2)]},
      {id:"bamboo-hand-sleeve",width:2.75,load:.62,dryness:.70,tone:1,startFrame:0,durationFrames:1,
        points:[pt(178,477,.07,1.8),pt(145,546,.77,.74),pt(149,607,.37,1.3),pt(178,650,.03,2.1)]},
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
  if(!INK_PORTRAIT_CHARACTERS.includes(character))
    throw new RangeError("Unknown standing scholar identity");
  if(!INK_PORTRAIT_EMOTIONS.includes(emotion))
    throw new RangeError("Unknown standing scholar expression");
  if(!Number.isFinite(intensity)||intensity<0||intensity>1)
    throw new RangeError("Standing ANAT2 intensity must be in [0,1]");
  if(!Number.isFinite(headScale)||headScale<.38||headScale>.75)
    throw new RangeError("Standing ANAT2 headScale must be .38..75");
  if(!Number.isFinite(detail)||detail<.25||detail>1)
    throw new RangeError("Standing ANAT2 detail must be .25..1");
  const pose=inkStandingPoseAt(frame,reducedMotion);
  const uid="km-standing-"+useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const elder=character==="elder";
  const ink=elder?"#4b514b":"#494a46",wash=elder?"#9c9a8e":"#a7a49b";
  const robe=elder?"#e1d6c5":"#e9dfd0",under="#f0e7d8";
  const cameras={
    full:{viewBox:"0 0 540 1080",height:1080},
    face:{viewBox:"215 183 110 260",height:1276},
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
        <path d="M180 423 C158 434 144 464 140 505
          Q132 566 146 624 Q157 662 178 686
          L194 666 C183 766 174 882 183 985
          Q269 1001 357 985 C366 883 357 766 346 666
          L362 686 Q383 662 394 624 Q408 566 400 505
          C396 464 382 434 360 423
          Q326 431 294 447 L246 447
          Q214 431 180 423 Z"/>
      </clipPath>
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
    {/* The under-robe is one topologically continuous weight-bearing fabric
        surface; hem, cuffs and shoulder are not independent stickers. */}
    <g data-km-ink-garment-structure="overlapping-cotton-ankle-robe">
      <path d="M180 423 C158 434 144 464 140 505
        Q132 566 146 624 Q157 662 178 686
        L194 666 C183 766 174 882 183 985
        Q269 1001 357 985 C366 883 357 766 346 666
        L362 686 Q383 662 394 624 Q408 566 400 505
        C396 464 382 434 360 423
        Q326 431 294 447 L246 447
        Q214 431 180 423 Z"
        fill={under} stroke={ink} strokeWidth=".82" strokeOpacity=".30"/>
      <path d="M200 447 C181 501 182 571 193 645
        Q202 710 195 789 Q184 884 190 984
        Q232 994 270 991 Q270 806 270 646
        Q267 516 238 444 Z"
        fill={robe} opacity=".35"/>
      <path d="M300 444 C331 492 352 555 348 646
        Q340 809 350 984 Q309 994 270 991
        Q272 808 270 646 Q272 516 300 444 Z"
        fill={robe} opacity=".29"/>
      <path d="M187 449 C160 476 145 523 145 579
        Q142 632 161 658 Q171 672 187 674
        Q179 621 181 567 Q182 502 214 455 Z"
        fill={robe} opacity=".42" stroke={ink} strokeWidth=".68" strokeOpacity=".25"/>
      <path d="M353 449 C380 476 395 523 395 579
        Q398 632 379 658 Q369 672 353 674
        Q361 621 359 567 Q358 502 326 455 Z"
        fill={robe} opacity=".38" stroke={ink} strokeWidth=".68" strokeOpacity=".25"/>
      <path d="M207 430 Q239 466 270 492 Q301 466 333 430
        L322 448 Q294 480 270 500 Q245 480 218 448 Z"
        fill="#f3eadc" fillOpacity=".74" stroke={ink}
        strokeWidth=".62" strokeOpacity=".24"/>
      <path d="M211 432 C233 460 251 479 270 495
        M330 432 C309 461 289 480 270 495"
        fill="none" stroke={ink} strokeWidth="1.12"
        strokeLinecap="round" opacity=".42"/>
      <path d="M270 497 Q265 560 271 635 T276 793 T270 977"
        fill="none" stroke={wash} strokeWidth="1.2"
        strokeLinecap="round" opacity=".25"/>
      <path d="M190 984 Q227 995 270 990 Q317 996 350 984"
        fill="none" stroke={ink} strokeWidth=".94" opacity=".36"/>
      <path d="M186 948 Q181 970 184 987 M354 948 Q359 970 356 987"
        fill="none" stroke={ink} strokeWidth="2.2" opacity=".10"
        filter={"url(#"+uid+"-paper-spread)"}/>
      <g clipPath={"url(#"+uid+"-robe-boundary)"}>
        {/* Each fine hemp-like fiber descends along the local fabric's
            gravity flow, with individually varying load and release. */}
        {Array.from({length:82},(_,i)=>{
          const left=i<41,k=i%41,ratio=k/40;
          const startX=left?164+ratio*94:270+ratio*92;
          const startY=520+18*Math.sin(i*1.43)+((i*11)%73);
          const endY=858+((i*37)%112);
          const endX=startX+(left?-1:1)*(2+13*Math.sin(i*.37));
          const bend=Math.sin(i*.72)*13;
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
          const x=183+inkHash(901,i,1)*174,y=625+inkHash(901,i,2)*334;
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
    {/* Independently redrawn Zeng Jing / Bochen-school head study.
        No ANAT1 face, old portrait screenshot, or walking-rig geometry is reused. */}
    <g data-km-ink-standing-head="independent-zj1-mogu"
      transform={"translate(0 "+pose.breathe+")"}>
      <InkZengJingScholarHead character={character} emotion={emotion}
        intensity={intensity} detail={detail} headScale={headScale}/>
    </g>
    {/* Two visible sandals sit in front of the ankle hem; soles remain fixed. */}
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
