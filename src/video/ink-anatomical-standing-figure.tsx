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
  frame=0,reducedMotion=false,transparentPaper=false,style,...svgProps
}:InkAnatomicalStandingFigureProps) {
  if(!Number.isFinite(detail)||detail<.25||detail>1)
    throw new RangeError("Standing ANAT2 detail must be .25..1");
  const pose=inkStandingPoseAt(frame,reducedMotion);
  const uid="km-standing-"+useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const elder=character==="elder";
  const ink=elder?"#4b514b":"#494a46",wash=elder?"#9c9a8e":"#a7a49b";
  const robe=elder?"#beb9ab":"#d1c9b9",under="#ede4d3";
  const nativeStyle:CSSProperties={display:"block",width:"100%",height:"auto",
    background:transparentPaper?"transparent":"#f2e6d3",...style};
  return <svg {...svgProps} xmlns="http://www.w3.org/2000/svg"
    role="img" aria-label={svgProps["aria-label"]??(
      (elder?"Elder":"Young")+" original Chinese ink full standing scholar")}
    viewBox="0 0 540 1080" width="540" height="1080" style={nativeStyle}
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
    {/* Existing 468-point ANAT1 portrait and every original expression,
        hand-painted cheek wash, beard fibre, period cap and INK1 lapel
        mark are retained at the exact same unwarped source coordinates. */}
    <g transform={"translate(0 "+pose.breathe+")"}>
      <InkAnatomicalPortrait character={character} emotion={emotion}
        intensity={intensity} detail={detail} headScale={headScale}
        view="source" transparentPaper={true}
        x={0} y={0} width={540} height={620}
        style={{width:540,height:620,overflow:"visible"}}/>
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
    {/* Left sleeve continues from its shoulder to the real thumb and
        staff-bearing fingers. The hand is intentionally not a mitten. */}
    <g data-km-ink-sleeve-hand="near" transform={"translate("+pose.sleeve+" 0)"}>
      <path d="M163 464 Q127 511 103 554 Q96 587 122 615
        Q136 635 158 621 L171 597 Q156 562 182 532"
        fill={robe} opacity=".64" stroke={ink} strokeWidth=".68" strokeOpacity=".38"/>
      <path d="M122 596 Q130 581 151 586 Q167 598 157 612
        Q154 629 142 633 Q125 628 121 613 Z"
        fill="#e6cdb0" stroke={ink} strokeWidth=".74" strokeOpacity=".46"/>
      <path d="M120 604 Q109 595 110 581 Q114 575 119 580
        Q122 591 129 597 L138 604"
        fill="#e6cdb0" stroke={ink} strokeWidth=".70" strokeOpacity=".47"/>
      {Array.from({length:4},(_,i)=><path key={"finger"+i}
        data-km-ink-hand-finger={i}
        d={"M"+(129+i*5)+" "+(605+i*.8)
          +" q"+ff(4+i*.3)+" 10 "+ff(4-i*.7)+" "+ff(18-i*1.3)}
        stroke={ink} strokeWidth={.54+(i%2)*.12}
        strokeLinecap="round" fill="none" opacity=".47"/>)}
      <path data-km-ink-hand-opposed-thumb="true"
        d="M123 606 Q129 599 133 607 Q139 616 146 618"
        fill="none" stroke={ink} strokeWidth="1.0" opacity=".44"/>
      <path d="M109 595 Q130 589 152 594" stroke={ink}
        strokeWidth=".85" opacity=".39" fill="none"/>
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
    <title>Independent source-built late Ming standing scholar; preserved full ANAT1 face and physical garments</title>
  </svg>;
}
