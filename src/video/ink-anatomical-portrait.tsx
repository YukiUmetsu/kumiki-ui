/**
 * Ink figure portrait A2 — a fresh ANAT1/EXPR1 drawing, NOT a variation of
 * the existing Shanshui reader's paths. Independent face, skull, hairstyle,
 * garment, contours and paint layers for two different character identities.
 *
 * Original markmaking study: docs/research/chinese-ink-anatomical-portrait-rebuild-2026-11-17.md
 * Authentic historical works are references, not imported / traced assets.
 */
import {useId, useMemo} from "react";
import type {FaceParams} from "../../registry/anatomy/anatomy-face";
import {createFace,FACE_FEATURES,FACE_LANDMARKS,measureFace} from "../../registry/anatomy/anatomy-face";
import {expressEmotion,expressFace,expressionFeatures,expressionMarks} from "../../registry/anatomy/expression-face";
import type {ExpressedFace} from "../../registry/anatomy/expression-face";

export const INK_PORTRAIT_CHARACTERS=["scholar","elder"] as const;
export const INK_PORTRAIT_EMOTIONS=["neutral","smile","sad","angry","surprise"] as const;
export type InkPortraitCharacter=typeof INK_PORTRAIT_CHARACTERS[number];
export type InkPortraitEmotion=typeof INK_PORTRAIT_EMOTIONS[number];
export type InkPortraitView="bust"|"face";

export interface InkAnatomicalPortraitProps {
  character?:InkPortraitCharacter;
  emotion?:InkPortraitEmotion;
  intensity?:number;
  detail?:number;
  view?:InkPortraitView;
  /** User-provided className and native SVG props remain optional. */
  className?:string;
}

const PERSONS={
  scholar:{yaw:19,face:{sex:.9,eyeSpacing:-.25,eyeWidth:.12,
    noseWidth:-.2,noseLength:.16,lowerFace:-.28,faceWidth:.94,mouthWidth:.98} satisfies FaceParams,
    complexion:"#f0e0c7",bone:"#8f7967",ink:"#292b29",warm:"#ae8d75",robe:"#b3ad9f"},
  elder:{yaw:27,face:{sex:1,eyeSpacing:.18,eyeWidth:-.23,
    noseWidth:.38,noseLength:.48,lowerFace:.44,faceWidth:1.1,mouthWidth:.91} satisfies FaceParams,
    complexion:"#e8d4b7",bone:"#7e7261",ink:"#2d302e",warm:"#a3846e",robe:"#9a9992"},
} as const;
type Point=readonly[number,number];
const clamp=(x:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,x));
const fmt=(x:number)=>x.toFixed(2);
const xy=(p:Point)=>fmt(p[0])+" "+fmt(p[1]);
/** Project the original 468-point millimetre ANAT1 mask; no old portrait path is read. */
function projection(yaw:number){
  const a=yaw*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return (p:readonly number[]):Point=>{
    const y=232-2.03*p[1];
    // The raw sagittal scaffold overextended the chin and outer jaws.
    // Move the lower third by a continuous, differentiable anatomical warp;
    // retain the measured upper-face mesh, EXPR1 eye, brow and nose motion.
    const t=clamp((y-292)/172,0,1),ease=t*t*(3-2*t);
    return [270+1.91*(p[0]*c+p[2]*s)*(.965-.12*ease),y-37*ease];
  };
}
function spline(points:readonly Point[],closed=false){
  if(points.length<2)return "";
  // Catmull–Rom to cubic with the original feature-vertex topology intact.
  let out="M"+xy(points[0]);
  const end=closed?points.length:points.length-1;
  for(let i=0;i<end;i++){
    const p0=points[(i-1+points.length)%points.length];
    const a=points[i],b=points[(i+1)%points.length];
    const p3=points[(i+2)%points.length];
    const before=i===0&&!closed?a:p0;
    const after=i===end-1&&!closed?b:p3;
    out+=" C"+xy([a[0]+(b[0]-before[0])/6,a[1]+(b[1]-before[1])/6])
      +" "+xy([b[0]-(after[0]-a[0])/6,b[1]-(after[1]-a[1])/6])+" "+xy(b);
  }
  return out+(closed?" Z":"");
}
function pathBetween(a:Point,b:Point,c:Point):string{
  return "M"+xy(a)+" Q"+xy(b)+" "+xy(c);
}
const shift=(p:Point,dx:number,dy:number):Point=>[p[0]+dx,p[1]+dy];

/** Numeric evidence for two *different* fitted ANAT1 head constructions. */
export function inkPortraitAnatomy(character:InkPortraitCharacter, emotion:InkPortraitEmotion="neutral", intensity=1){
  if(!(character in PERSONS)||!INK_PORTRAIT_EMOTIONS.includes(emotion))throw new RangeError("Unknown ink portrait identity or emotion");
  if(!Number.isFinite(intensity)||intensity<0||intensity>1)throw new RangeError("Intensity must be finite and in [0,1]");
  const base=createFace(PERSONS[character].face);
  const posed=emotion==="neutral"||intensity===0?expressFace({},base):expressEmotion(emotion,intensity,base);
  return {posed,measurements:measureFace(base.vertices),features:expressionFeatures(posed),
    landmarks:FACE_LANDMARKS, expressionMarks:expressionMarks(posed)};
}

interface PaintProps {posed:ExpressedFace; character:InkPortraitCharacter; detail:number; view:InkPortraitView; uid:string}
function PaintedPortrait({posed,character,detail,view,uid}:PaintProps){
  const preset=PERSONS[character], P=projection(preset.yaw),v=posed.vertices;
  const q=(k:keyof typeof FACE_LANDMARKS)=>P(v[FACE_LANDMARKS[k]]);
  const feature=(id:string)=>FACE_FEATURES[id].loop.map(i=>P(v[i]));
  const faceOutline=spline(feature("oval"),true);
  const brow=(side:"L"|"R")=>feature("brow."+side);
  const upper=(side:"L"|"R")=>feature("eye-upper."+side);
  const lower=(side:"L"|"R")=>feature("eye-lower."+side);
  const eyeAperture=(side:"L"|"R")=>spline([...upper(side),...lower(side).slice().reverse()],true);
  const marks=expressionMarks(posed);
  const features=expressionFeatures(posed);
  const eyeInk=(side:"L"|"R")=>{
    const ex=q(("exocanthion."+side) as keyof typeof FACE_LANDMARKS),en=q(("endocanthion."+side) as keyof typeof FACE_LANDMARKS);
    const center:Point=[(ex[0]+en[0])/2,(ex[1]+en[1])/2+.8];
    const radius=Math.hypot(ex[0]-en[0],ex[1]-en[1])*.15;
    return <g key={side} data-km-ink-eye={side}>
      <clipPath id={uid+"-eye-"+side}><path d={eyeAperture(side)}/></clipPath>
      <g clipPath={"url(#"+uid+"-eye-"+side+")"}>
        <ellipse cx={center[0]} cy={center[1]+radius*.18} rx={radius*1.05} ry={radius*1.18}
          fill="#494139" opacity=".64"/>
        <ellipse cx={center[0]+radius*.05} cy={center[1]+radius*.17}
          rx={radius*.46} ry={radius*.76} fill={preset.ink} opacity=".9"/>
        <path d={pathBetween(shift(center,-radius*.4,-radius*.5),
          shift(center,-radius*.1,-radius*.7),shift(center,radius*.3,-radius*.47))}
          fill="none" stroke="#ecddc5" strokeWidth=".55" opacity=".64"/>
      </g>
      <path d={spline(upper(side))} fill="none" stroke={preset.ink}
        strokeWidth={side==="L"?1.26:1.03} strokeLinecap="round" opacity=".78"/>
      <path d={spline(lower(side))} fill="none" stroke={preset.bone}
        strokeWidth=".61" strokeLinecap="round" opacity=".46"/>
      <path d={pathBetween(shift(ex,side==="L"?-2:2,-3.9),
        shift(center,0,-radius*2.0),shift(en,side==="L"?2:-2,-3.6))}
        fill="none" stroke={preset.bone} strokeWidth=".61" opacity=".32"/>
      <path d={pathBetween(shift(ex,side==="L"?-1:1,4.8),
        shift(center,1,radius*2.2),shift(en,0,4.1))}
        fill="none" stroke={preset.warm} strokeWidth="1.15"
        filter={"url(#"+uid+"-wash-feather)"} opacity=".19"/>
      <circle cx={en[0]} cy={en[1]+.6} r=".85"
        fill={preset.warm} opacity=".28"/>
      {Array.from({length:5},(_,i)=>{
        const t=(i+1)/6,a=upper(side),j=Math.max(0,Math.min(a.length-2,Math.floor(t*(a.length-1))));
        const pos=a[j];return <path key={i} d={"M"+xy(pos)+" l"+fmt((side==="L"?1:-1)*(1.0+i*.08))+" -"+fmt(.7+i*.09)}
          stroke={preset.ink} strokeWidth=".34" opacity={.36+detail*.28}/>;
      })}
    </g>;
  };
  const washes=(side:"L"|"R")=>{
    const cheek=q(("cheekbone."+side) as keyof typeof FACE_LANDMARKS),zy=q(("zygion."+side) as keyof typeof FACE_LANDMARKS),al=q(("alare."+side) as keyof typeof FACE_LANDMARKS);
    const gon=q(("gonion."+side) as keyof typeof FACE_LANDMARKS),eye=q(("palpebrale-inferius."+side) as keyof typeof FACE_LANDMARKS);
    const near=side==="L"?1:.72;
    // Zygoma->maxilla wet relief, not a straight-edged cardboard cheek.
    const direction=side==="L"?1:-1;
    const cheekVolume="M"+xy(shift(eye,0,6))
      +" C"+xy(shift(cheek,-direction*8,0))
      +" "+xy(shift(zy,-direction*44,7))
      +" "+xy(shift(zy,-direction*23,16))
      +" C"+xy(shift(zy,-direction*35,32))
      +" "+xy(shift(al,direction*24,30))
      +" "+xy(shift(al,direction*10,22))
      +" Q"+xy(shift(al,direction*17,8))
      +" "+xy(shift(al,direction*7,5))
      +" Q"+xy(shift(cheek,-direction*17,-5))
      +" "+xy(shift(eye,0,6))+" Z";
    return <g key={side} data-km-ink-cheek={side}>
      <path d={cheekVolume} data-km-ink-wet-malar="bone" fill={preset.bone} opacity={.21*near}
        filter={"url(#"+uid+"-wash-feather)"}/>
      <path d={cheekVolume} data-km-ink-wet-malar="warm" fill={preset.warm} opacity={.086*near}
        filter={"url(#"+uid+"-wash-feather)"}/>
      <path d={"M"+xy(shift(eye,-1,5))+" Q"+xy(shift(cheek,0,7))+" "+xy(shift(zy,side==="L"?5:-5,14))}
        stroke={preset.bone} strokeWidth="5.8" opacity={.09*near} fill="none"/>
      <path d={"M"+xy(shift(eye,0,8))+" Q"+xy(shift(cheek,1,10))+" "+xy(shift(al,side==="L"?7:-7,15))}
        stroke={preset.warm} strokeWidth="3.7" opacity={.09*near} fill="none"/>
      <path d={"M"+xy(shift(zy,side==="L"?-7:7,8))+" Q"+xy(shift(gon,side==="L"?7:-7,-6))+" "+xy(shift(gon,0,8))}
        stroke={preset.bone} strokeWidth="3.8" opacity={.12*near} fill="none"/>
      {detail>.42&&Array.from({length:9},(_,i)=>{
        const a=shift(eye,(side==="L"?-1:1)*(i*.8),8+i*.72);
        const b=shift(cheek,(side==="L"?1:-1)*(8+i*.25),4+i*1.22);
        return <path key={i} d={pathBetween(a,shift(b,0,-2.1-i*.14),b)}
          fill="none" stroke={i%3===0?preset.warm:preset.bone}
          strokeWidth={.24+(i%3)*.12} opacity={(.13+(i%3)*.037)*near*detail}/>;
      })}
    </g>;
  };
  const top=q("forehead"),menton=q("menton"),nose=q("pronasale");
  const templeL=q("zygion.L"),templeR=q("zygion.R");
  const browPoints=[...brow("L"),...brow("R")];
  const foreheadLeft=shift(browPoints[1],-5,-17),foreheadRight=shift(browPoints[browPoints.length-2],5,-17);
  const upperLip=feature("lips-upper"),lowerLip=feature("lips-lower");
  const mouthLine=feature("mouth-line");
  // Source-space oral fissure: borrow the EXPR1 stomion and mobile lower
  // vermilion, but NEVER paint its entire multi-lip contour as a solid
  // trapezoid. Delicate near/far labial ledges surround a narrow asymmetric
  // cavity whose volume grows continuously with mandibular displacement.
  const oral=q("stomion"),lowerOral=q("labiale-inferius");
  const lipGap=clamp(features.mouthOpen,0,1.5);
  const apertureWidth=clamp(3.3+lipGap*8.4,3.3,11.2);
  const apertureHeight=clamp(1.9+(lowerOral[1]-oral[1])*.43,3.5,20);
  const cavityTop:Point=[oral[0]+1.4,oral[1]-1.5];
  const mouthCavityD="M"+xy(shift(cavityTop,-apertureWidth,2))
    +" C"+xy(shift(cavityTop,-apertureWidth*.67,-2.8))
    +" "+xy(shift(cavityTop,apertureWidth*.42,-2.3))
    +" "+xy(shift(cavityTop,apertureWidth,1.6))
    +" C"+xy(shift(cavityTop,apertureWidth*.89,apertureHeight*.6))
    +" "+xy(shift(cavityTop,apertureWidth*.15,apertureHeight))
    +" "+xy(shift(cavityTop,-apertureWidth*.15,apertureHeight))
    +" C"+xy(shift(cavityTop,-apertureWidth*.69,apertureHeight*.83))
    +" "+xy(shift(cavityTop,-apertureWidth*.94,apertureHeight*.31))
    +" "+xy(shift(cavityTop,-apertureWidth,2))+" Z";
  const spokenMouthContour=features.mouthOpen>.012?
    mouthCavityD:spline(mouthLine);
  // A genuinely independently sculpted garment: elder open cross-lapel versus
  // scholar's wrapped collar, not the original Shanshui body's part assets.
  return <>
    <defs>
      <clipPath id={uid+"-skin"}><path d={faceOutline}/></clipPath>
      <filter id={uid+"-wash-feather"} x="-35%" y="-35%" width="170%" height="170%">
        <feGaussianBlur stdDeviation="5.2"/>
      </filter>
      <filter id={uid+"-fibres"} x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency=".074 .12" numOctaves="3"
          seed={character==="scholar"?11:31} result="grain"/>
        <feColorMatrix in="grain" type="saturate" values="0"/>
        <feComponentTransfer><feFuncA type="linear" slope=".14"/></feComponentTransfer>
      </filter>
    </defs>
    <g data-km-ink-costume={character}>
      <path d={character==="scholar"
        ?"M202 421 C163 424 131 439 116 470 Q98 506 83 612 L460 612 Q440 532 425 471 C412 443 372 428 328 420 Q263 451 202 421 Z"
        :"M184 419 C140 422 113 458 92 514 L59 612 L481 612 C469 554 443 458 394 426 Q356 410 324 422 Q250 471 184 419 Z"}
        fill={preset.robe} fillOpacity=".42" stroke={preset.ink} strokeWidth="1.08" strokeOpacity=".77"/>
      {/** Wet robe shadows bend across fabric drape, never the earlier
           triangular poster-like tone panels. Stroke pressure stays separate
           from the dry small folds and paper-reserved cloth underlayer. */}
      <path d="M173 449 C182 480 165 517 156 550 S143 590 138 611"
        fill="none" stroke={preset.bone} strokeWidth="26" opacity=".20"
        filter={"url(#"+uid+"-wash-feather)"}/>
      <path d="M369 449 C379 489 399 523 403 559 S410 588 421 610"
        fill="none" stroke={preset.ink} strokeWidth="24" opacity=".15"
        filter={"url(#"+uid+"-wash-feather)"}/>
      <path d="M191 466 C195 507 196 530 191 552 S176 594 181 609"
        fill="none" stroke={preset.warm} strokeWidth="12" opacity=".21"
        filter={"url(#"+uid+"-wash-feather)"}/>
      <path d="M353 462 Q342 503 355 540 T366 611"
        fill="none" stroke={preset.ink} strokeWidth="14" opacity=".095"
        filter={"url(#"+uid+"-wash-feather)"}/>
      {character==="scholar"
        ?<g data-km-ink-collar="late-ming-scholar-crossed">
          {/** Real folded undercollar, not a plunging rectangular V. The
               asymmetrical left lapel wraps over right and settles as a
               wet-loading, dry-ending stroke into the chest. */}
          <path d="M211 431 C236 448 255 462 282 476
            Q317 451 339 423 L350 447
            Q314 479 282 505 C254 486 224 464 211 431 Z"
            fill="#e3d9c7" fillOpacity=".86"/>
          <path d="M213 437 C239 459 260 486 285 511
            Q307 531 311 562"
            fill="none" stroke={preset.ink} strokeWidth="1.65"
            strokeLinecap="round" opacity=".66"/>
          <path d="M341 435 C325 456 309 470 282 486
            Q261 499 249 526"
            fill="none" stroke={preset.bone} strokeWidth="1.11"
            strokeLinecap="round" opacity=".61"/>
          <path d="M224 450 Q250 481 278 497"
            fill="none" stroke={preset.warm} strokeWidth="5.3"
            filter={"url(#"+uid+"-wash-feather)"} opacity=".19"/>
          <path d="M337 450 Q309 484 267 506"
            fill="none" stroke={preset.bone} strokeWidth="4.5"
            filter={"url(#"+uid+"-wash-feather)"} opacity=".13"/>
          <path d="M291 509 C302 533 290 558 295 575"
            fill="none" stroke={preset.bone} strokeWidth=".64"
            opacity=".36"/>
        </g>
        :<g data-km-ink-collar="elder-overlapping-soft-wrap">
          <path d="M192 427 C223 462 252 477 275 488
            Q324 464 341 424 L361 460
            Q307 495 264 529 C232 496 209 472 192 427 Z"
            fill="#ddd2c0" fillOpacity=".78"/>
          <path d="M200 435 C225 469 248 482 276 499
            Q298 522 303 549"
            stroke={preset.ink} strokeWidth="1.92"
            opacity=".65" strokeLinecap="round" fill="none"/>
          <path d="M348 431 C318 475 282 504 257 537"
            stroke={preset.ink} strokeWidth="1.53"
            opacity=".55" strokeLinecap="round" fill="none"/>
          <path d="M210 456 Q259 498 289 519"
            stroke={preset.warm} strokeWidth="5.9"
            opacity=".15" filter={"url(#"+uid+"-wash-feather)"}
            fill="none"/>
          <path d="M331 445 Q306 479 265 517"
            stroke={preset.bone} strokeWidth="6.7"
            opacity=".14" filter={"url(#"+uid+"-wash-feather)"}
            fill="none"/>
        </g>}
      {/** Rooted silk sleeve cascade: direct continuity from the upper
           shoulder, broad circular weight at elbow and pressure lift before
           a late-Ming hanging-fold tip. Two sleeves are never mirrors. */}
      {Array.from({length:12},(_,i)=>{
        const side=i<6?-1:1,k=i%6;
        const sx=side<0?135+k*10:394-k*7;
        const sy=462+k*6;
        const control:Point=[sx+side*(20+k*2.7),505+k*6];
        const tip:Point=[sx+side*(28+k*4.4),565+k*8];
        return <path key={"sleeve"+i} data-km-ink-sleeve-loading={i}
          d={"M"+fmt(sx)+" "+fmt(sy)+" Q"+xy(control)+" "+xy(tip)}
          stroke={i%3===0?preset.ink:preset.bone}
          strokeWidth={i%4===0?1.26:.48+(i%3)*.14}
          opacity={(i%4===0?.36:.20)*detail}
          strokeLinecap="round" fill="none"/>;
      })}
      {Array.from({length:17},(_,i)=>{
        const side=i%2===0?-1:1,k=Math.floor(i/2);
        const twist=Math.sin(i*2.12)*8;
        const start:Point=[270+side*(65+k*11)+twist*.38,438+Math.cos(i*1.3)*7];
        const mid:Point=[270+side*(79+k*12)+twist,488+Math.sin(i*.83)*25];
        const tipY=520+Math.min(86,((i*37)%103));
        const end:Point=[270+side*(93+k*13)+twist*.7,tipY];
        return <path key={i} data-km-ink-cloth-pressure={i}
          d={"M"+xy(start)+" C"+xy(shift(mid,-side*9,-20))
            +" "+xy(shift(mid,side*4,24))+" "+xy(end)}
          fill="none" stroke={i%5===0?preset.ink:preset.bone}
          strokeWidth={.42+(i%4)*.22}
          opacity={(.16+(i%5)*.073)*detail}/>;
      })}
      {Array.from({length:24},(_,i)=>{
        const u=i%12,dir=i<12?-1:1,noise=Math.sin(i*2.27);
        const x=270+dir*(76+u*10+noise*5);
        const y=499+u*4.4+Math.sin(i*.7)*11;
        const length=16+24*Math.abs(Math.sin(i*1.17));
        return <path key={"f"+i}
          d={"M"+fmt(x)+" "+fmt(y)
            +" q"+fmt(dir*(3+noise*2))+" "+fmt(length*.44)
            +" "+fmt(dir*(2+noise*4))+" "+fmt(length)}
          fill="none" stroke={i%7===0?preset.warm:preset.ink}
          strokeWidth={.27+(i%5)*.09} opacity={(.14+(i%3)*.028)*detail}/>;
      })}
      {Array.from({length:11},(_,i)=>{
        const t=i/10,side=i%2===0?-1:1;
        const a:Point=[270+side*(62+t*39),446+t*14];
        const b:Point=[270+side*(88+t*54),513+t*46];
        const c:Point=[270+side*(105+t*66),570+t*29];
        return <path key={"paperlift"+i} data-km-ink-cloth-dry-lift={i}
          d={pathBetween(a,b,c)} fill="none" stroke="#f0e5d4"
          strokeWidth={.54+(i%3)*.16} opacity={(.19+(i%4)*.045)*detail}/>;
      })}
    </g>
    {/** Period half-figure bust ratio: period silk sleeves are broader than the
         sitter's head. Native QA rejected the 0.75-width giant head; fit the
         new skull and all its EXPR1-attached ink around its collar contact. */}
    <g data-km-ink-anatomic-bust-ratio=".69" transform="translate(83.7 130.2) scale(.69)">
    {/** Cranial hair/hat, painted behind skin; scalp height derives from the ANAT1 forehead. */}
    <path d={"M"+xy(shift(templeR,0,-39))+" C"+xy(shift(top,-85,-54))+" "+xy(shift(top,45,-76))
      +" "+xy(shift(templeL,7,-25))+" L"+xy(shift(templeL,6,11))}
      fill={preset.ink} fillOpacity={character==="scholar"?.90:.65} stroke={preset.ink} strokeWidth="1.6"/>
    <path d={faceOutline} data-km-ink-face-sculpt="lower-third-continuous"
      fill={preset.complexion} stroke={preset.bone}
      strokeWidth=".65" strokeOpacity=".44"/>
    <g clipPath={"url(#"+uid+"-skin)"} data-km-ink-anatomy-washes="true">
      {/** No digital airbrush gradients: several overlaid, locally mapped pigment glazes. */}
      {/** Overlapping wet brush deposits following living frontal bone arcs;
           preserve sharp microstroke layers above, no hard polygon ends. */}
      {Array.from({length:13},(_,i)=>{
        const k=i/12,spread=(1-Math.pow(Math.abs(k-.5)*2,2))*.72+.28;
        const start=shift(foreheadLeft,4+i*.8,-3-i*1.36);
        const mid=shift(top,-4+(i-6)*1.4,58-i*2.2);
        const end=shift(foreheadRight,-4-i*.84,-2-i*1.25);
        return <path key={i} data-km-ink-frontal-glaze={i}
          d={"M"+xy(start)+" Q"+xy(mid)+" "+xy(end)}
          stroke={i%3===0?preset.warm:preset.bone}
          strokeWidth={4+7*spread} strokeLinecap="round" fill="none"
          filter={"url(#"+uid+"-wash-feather)"}
          opacity={.032+(.017*spread)}/>;
      })}
      <path d={"M"+xy(shift(foreheadLeft,-3,9))+" Q"+xy(shift(top,-6,67))
        +" "+xy(shift(foreheadRight,2,9))}
        stroke={preset.warm} strokeWidth="8.5" opacity=".085"
        filter={"url(#"+uid+"-wash-feather)"} fill="none"/>
      {washes("R")}{washes("L")}
      <path d={spline(feature("nose-bridge"))} stroke={preset.bone}
        strokeWidth="9" strokeOpacity=".17" filter={"url(#"+uid+"-wash-feather)"}
        fill="none"/>
      <path d={pathBetween(shift(q("alare.R"),-3,2),
        shift(q("subnasale"),-12,6),shift(q("subnasale"),-4,7))}
        stroke={preset.warm} strokeWidth="5.3" strokeOpacity=".12"
        filter={"url(#"+uid+"-wash-feather)"} fill="none"/>
      <path d={pathBetween(shift(q("subnasale"),4,7),
        shift(q("subnasale"),12,4),shift(q("alare.L"),3,2))}
        stroke={preset.bone} strokeWidth="4.5" strokeOpacity=".10"
        filter={"url(#"+uid+"-wash-feather)"} fill="none"/>
      <path d={"M"+xy(shift(nose,-10,0))+" Q"+xy(shift(nose,-4,14))+" "+xy(shift(q("subnasale"),-5,5))}
        stroke={preset.bone} strokeWidth="2" opacity=".19" fill="none"/>
      <path d={"M"+xy(shift(menton,-48,-4))+" Q"+xy(shift(menton,0,-14))+" "+xy(shift(menton,50,-9))}
        stroke={preset.bone} strokeWidth="6.1" opacity=".09" fill="none"/>
      <rect x="45" y="40" width="450" height="440" fill={preset.ink}
        filter={"url(#"+uid+"-fibres)"} opacity={.10*detail}/>
    </g>
    <g data-km-ink-facial-structures="true">
      {/** Nose and orbital canthi come from pose-dependent ANAT1 vertex loops. */}
      <path d={spline(feature("nose-bridge"))} fill="none" stroke={preset.bone}
        strokeWidth=".51" strokeLinecap="round" opacity=".25"/>
      {/** Interrupt the nasal-base line at the tissue planes: no U-shaped decal. */}
      <path d={pathBetween(shift(q("alare.R"),-1,2),
        shift(q("subnasale"),-13,2),shift(q("subnasale"),-3,3))}
        stroke={preset.bone} strokeWidth=".63" opacity=".43" fill="none"/>
      <path d={pathBetween(shift(q("subnasale"),3,3),
        shift(q("subnasale"),10,4),shift(q("alare.L"),1,1))}
        stroke={preset.bone} strokeWidth=".53" opacity=".31" fill="none"/>
      <path d={pathBetween(shift(nose,-8,8),shift(nose,-2,11),shift(nose,7,8))}
        fill="none" stroke={preset.warm} strokeWidth="2.3" opacity=".12"/>
      {(["R","L"] as const).map(side=><g key={side} data-km-ink-brow={side}>
        <path d={spline(brow(side))} stroke={preset.ink}
          strokeWidth={side==="L"?1.43:1.13} fill="none"
          opacity={character==="scholar"?.68:.49} strokeLinecap="round"/>
        {Array.from({length:16},(_,i)=>{
          const raw=brow(side),t=i/15,j=Math.min(raw.length-2,Math.floor(t*(raw.length-1)));
          const a=raw[j],b=raw[j+1],r=t*(raw.length-1)-j;
          const x=a[0]+(b[0]-a[0])*r,y=a[1]+(b[1]-a[1])*r;
          return <path key={i} d={"M"+xy([x,y])+" q"+fmt((side==="L"?-.9:.6))+" -1.6 "+fmt(i%2===0?1.2:-.8)+" -"+fmt(2.5+i%4*.35)}
            fill="none" stroke={preset.ink} strokeWidth={.33+(i%3)*.16}
            opacity={(i%4===0?.52:.36)*detail}/>;
        })}
      </g>)}
      {eyeInk("R")}{eyeInk("L")}
      <path d={spline(upperLip)} fill="none" stroke={preset.warm} opacity=".32" strokeWidth=".68"/>
      <path d={spline(lowerLip)} fill="none" stroke={preset.bone} opacity=".31" strokeWidth=".67"/>
      {features.mouthOpen>.012&&<>
        <path data-km-ink-mouth-cavity="true" d={mouthCavityD}
          fill={preset.warm} opacity={clamp(.25+lipGap*.16,.25,.46)}/>
        <path d={mouthCavityD} fill={preset.ink}
          opacity={clamp(.12+lipGap*.12,.12,.30)}/>
        <path d={pathBetween(
          shift(cavityTop,-apertureWidth*.65,apertureHeight+.4),
          shift(cavityTop,0,apertureHeight+2.4),
          shift(cavityTop,apertureWidth*.62,apertureHeight+.5))}
          fill="none" stroke={preset.warm} strokeWidth="1.4" opacity=".27"/>
      </>}
      <path data-km-ink-mouth-line="true" d={spokenMouthContour} stroke={preset.ink}
        strokeWidth={lipGap>.012?.78:.68} opacity={lipGap>.012?.42:.48}
        strokeLinecap="round" fill="none"/>
      <path d={"M"+xy(shift(q("sublabiale"),-12,4))+" Q"+xy(shift(q("sublabiale"),1,8))+" "+xy(shift(q("sublabiale"),13,1))}
        stroke={preset.bone} fill="none" strokeWidth=".64" opacity=".46"/>
      {character==="elder"&&<g data-km-ink-age-anatomy="orbital-temporal-volume">
        {(["R","L"] as const).map(side=>{
          const sign=side==="R"?-1:1;
          const outer=q(("exocanthion."+side) as keyof typeof FACE_LANDMARKS);
          const under=q(("palpebrale-inferius."+side) as keyof typeof FACE_LANDMARKS);
          const z=q(("cheekbone."+side) as keyof typeof FACE_LANDMARKS);
          return <g key={side} data-km-ink-age-eye={side}>
            {Array.from({length:4},(_,i)=><path key={i}
              d={pathBetween(shift(outer,sign*(2+i*2),1+i*2.2),
                shift(outer,sign*(8+i*2),-1+i*3),
                shift(outer,sign*(15+i*2),-4+i*3.7))}
              fill="none" stroke={i%2===0?preset.bone:preset.warm}
              strokeWidth={.31+(i%3)*.13} opacity={.17+detail*.08}/>)}
            {Array.from({length:3},(_,i)=><path key={"bag"+i}
              d={pathBetween(shift(under,sign*1,6+i*2.7),
                shift(z,sign*2,-6+i*2),shift(z,sign*7,6+i*2))}
              fill="none" stroke={preset.bone}
              strokeWidth={1.45+i*.4} strokeLinecap="round"
              filter={"url(#"+uid+"-wash-feather)"}
              opacity={.18+(2-i)*.032}/>)}
          </g>;
        })}
        {Array.from({length:4},(_,i)=>{
          const a=shift(q("forehead"),-38+i*6,-2+i*3.3);
          const b=shift(q("forehead"),-5+i*5,-1+i*3.1);
          const c=shift(q("forehead"),27+i*3,2+i*3.2);
          return <path key={i} data-km-ink-age-frontal={i}
            d={pathBetween(a,b,c)} stroke={preset.bone}
            strokeWidth={.35+(i%3)*.12} fill="none"
            opacity={(i%2===0?.33:.22)*detail}/>;
        })}
      </g>}
      {marks.map(m=><g key={m.id} data-km-ink-action-mark={m.id}>
        <path d={spline(m.points.map(([x,y])=>P([x,y,42])))} fill="none"
          stroke={preset.bone} strokeWidth={.38+(.3*m.strength)}
          opacity={.15+.25*m.strength} strokeLinecap="round"/>
      </g>)}
    </g>
    {/** Ear anatomy: its lobule, concha, crus and tragus are separate ink deposits. */}
    <g data-km-ink-ear="near">
      <path d={"M"+xy(shift(templeL,3,-4))+" C"+xy(shift(templeL,17,-24))
        +" "+xy(shift(templeL,31,-12))+" "+xy(shift(templeL,28,12))
        +" C"+xy(shift(templeL,25,28))+" "+xy(shift(templeL,8,34))
        +" "+xy(shift(templeL,6,21))} fill={preset.complexion} stroke={preset.bone}
        strokeWidth=".9" opacity=".76"/>
      <path d={"M"+xy(shift(templeL,10,-7))+" Q"+xy(shift(templeL,26,-3))
        +" "+xy(shift(templeL,22,17))+" M"+xy(shift(templeL,20,1))
        +" Q"+xy(shift(templeL,10,5))+" "+xy(shift(templeL,17,12))}
        stroke={preset.ink} opacity=".37" strokeWidth=".72" fill="none"/>
      <path d={"M"+xy(shift(templeL,18,8))+" q6 6 2 10"}
        fill="none" stroke={preset.ink} strokeWidth="1.2" opacity=".23"/>
    </g>

    {/** Unlike the rejected earlier crown, no exposed vertical hair comb or
         disconnected cap. All hair fibers have a true painted support mask. */}
    {(()=>{
      // Folded Ming headcloth; not the rejected modern beret silhouette.
      // Both forms are attached to the real ANAT1 forehead landmark.
      const crown=character==="scholar"?
        "M"+xy(shift(top,-85,9))
        +" C"+xy(shift(top,-85,-13))+" "+xy(shift(top,-70,-67))
        +" "+xy(shift(top,-60,-80))
        +" L"+xy(shift(top,34,-88))
        +" Q"+xy(shift(top,50,-81))+" "+xy(shift(top,59,-62))
        +" L"+xy(shift(top,78,-4))
        +" C"+xy(shift(top,65,13))+" "+xy(shift(top,-43,21))
        +" "+xy(shift(top,-85,9))+" Z"
        :
        "M"+xy(shift(top,-82,12))
        +" L"+xy(shift(top,-71,-59))
        +" Q"+xy(shift(top,-33,-64))+" "+xy(shift(top,19,-62))
        +" Q"+xy(shift(top,56,-59))+" "+xy(shift(top,66,-33))
        +" L"+xy(shift(top,73,14))
        +" C"+xy(shift(top,46,10))+" "+xy(shift(top,-45,23))
        +" "+xy(shift(top,-82,12))+" Z";
      return <g data-km-ink-hair={character}>
        <path d={crown} fill={preset.ink}
          fillOpacity={character==="scholar"?.90:.66}
          stroke={preset.ink} strokeWidth=".62" strokeOpacity=".7"/>
        <clipPath id={uid+"-hair-crown"}><path d={crown}/></clipPath>
        <g clipPath={"url(#"+uid+"-hair-crown)"}>
          {Array.from({length:65},(_,i)=>{
            const t=i/64,edge=Math.abs(t-.5)*2;
            const x=top[0]-65+t*119;
            const y=top[1]-15-58*(1-edge*.4)+2.1*Math.sin(i*1.87);
            const length=9+25*(1-edge)+2.2*Math.sin(i*2.31);
            const bend=1.5+2.8*Math.cos(i*.93);
            return <path key={i}
              d={"M"+fmt(x)+" "+fmt(y)
                +" q"+fmt(bend)+" "+fmt(length*.46)
                +" "+fmt(bend+(i%3-1)*2)+" "+fmt(length)}
              stroke={character==="elder"&&i%5===0?"#c9bca6":"#bcb09b"}
              fill="none" strokeWidth={i%7===0?.83:.33+(i%4)*.07}
              opacity={(character==="scholar"?.22:.37)*detail}/>;
          })}
        </g>
        {character==="scholar"?<>
          {/** Folded Ming scholar cap, with a continuous brim and side wings. */}
          <path d={"M"+xy(shift(top,-86,7))
            +" C"+xy(shift(top,-40,16))+" "+xy(shift(top,30,13))
            +" "+xy(shift(top,88,7))
            +" L"+xy(shift(top,80,19))
            +" Q"+xy(shift(top,-7,20))+" "+xy(shift(top,-79,18))+" Z"}
            fill="#262724" opacity=".95"/>
          <path d={"M"+xy(shift(top,-78,9))
            +" Q"+xy(shift(top,-102,14))+" "+xy(shift(top,-116,21))
            +" Q"+xy(shift(top,-94,27))+" "+xy(shift(top,-72,19))}
            fill="#2e2e2a" opacity=".82"/>
          <path d={"M"+xy(shift(top,80,7))
            +" Q"+xy(shift(top,101,11))+" "+xy(shift(top,110,22))
            +" Q"+xy(shift(top,89,23))+" "+xy(shift(top,77,18))}
            fill="#2e2e2a" opacity=".87"/>
          <path d={"M"+xy(shift(top,-73,9))
            +" Q"+xy(shift(top,-11,13))+" "+xy(shift(top,70,9))}
            fill="none" stroke="#cabca0" strokeWidth=".69" opacity=".37"/>
          <path d={"M"+xy(shift(top,-64,-67))
            +" Q"+xy(shift(top,-22,-71))+" "+xy(shift(top,35,-73))}
            fill="none" stroke="#c7b7a0" strokeWidth=".69" opacity=".28"/>
          <path d={"M"+xy(shift(top,30,-82))
            +" Q"+xy(shift(top,58,-53))+" "+xy(shift(top,75,7))}
            fill="none" stroke="#b4a593" strokeWidth="1.04" opacity=".41"/>
          <path d={"M"+xy(shift(top,-75,-11))
            +" Q"+xy(shift(top,-48,-26))+" "+xy(shift(top,-30,-65))}
            fill="none" stroke="#c7b7a0" strokeWidth="1.01" opacity=".24"/>
        </>:<>
          <path d={"M"+xy(shift(top,-53,12))
            +" Q"+xy(shift(top,-18,10))+" "+xy(shift(top,12,12))
            +" Q"+xy(shift(top,43,10))+" "+xy(shift(top,54,16))}
            stroke="#c8b7a0" strokeWidth=".9" fill="none" opacity=".42"/>
          {Array.from({length:8},(_,i)=><path key={i}
            d={"M"+xy(shift(top,-47+i*11,14+(i%2)*2))
              +" q"+fmt(1.1+(i%3))+" 6 "+fmt(3+(i%3))+" "+fmt(10+(i%4))}
            stroke={i%3===0?"#bdb5a6":preset.ink}
            strokeWidth=".53" opacity=".37" fill="none"/>)}
          {/** Individual late-Ming oral-root whisker clusters; a feathered
               underpaint follows the mandibular volume into five separate
               tapering locks and does not flatten the robe into a stamp. */}
          <path data-km-ink-beard-substrate="organic"
            d={"M"+xy(shift(q("stomion"),-26,-1))
              +" C"+xy(shift(q("stomion"),-31,24))
              +" "+xy(shift(menton,-47,17))
              +" "+xy(shift(menton,-34,62))
              +" Q"+xy(shift(menton,-21,100))
              +" "+xy(shift(menton,-1,92))
              +" Q"+xy(shift(menton,18,101))
              +" "+xy(shift(menton,35,61))
              +" C"+xy(shift(menton,48,18))
              +" "+xy(shift(q("stomion"),36,26))
              +" "+xy(shift(q("stomion"),23,-3))
              +" Q"+xy(shift(q("stomion"),2,12))
              +" "+xy(shift(q("stomion"),-26,-1))+" Z"}
            fill={preset.ink} opacity=".16"/>
          <path d={pathBetween(shift(q("stomion"),-24,-2),
            shift(q("stomion"),-16,0),shift(q("stomion"),-5,3))}
            stroke={preset.ink} strokeWidth="4.2" opacity=".30" fill="none"
            strokeLinecap="round" filter={"url(#"+uid+"-wash-feather)"}/>
          <path d={pathBetween(shift(q("stomion"),6,3),
            shift(q("stomion"),16,-2),shift(q("stomion"),22,-2))}
            stroke={preset.ink} strokeWidth="4.4" opacity=".28" fill="none"
            strokeLinecap="round" filter={"url(#"+uid+"-wash-feather)"}/>
          {/** Isolated moustache-root clusters with actual hairline directions. */}
          {Array.from({length:18},(_,i)=>{
            const near=i<9,side=near?-1:1,k=i%9;
            const x=q("subnasale")[0]+side*(4+k*1.4);
            const y=q("stomion")[1]-8+(k%3)*.38;
            return <path key={"m"+i}
              d={"M"+fmt(x)+" "+fmt(y)+" q"+fmt(side*(2+k*.17))
                +" "+fmt(2.1+k*.1)+" "+fmt(side*(4+k*.32))+" "+fmt(4.3+(k%3)*1.2)}
              fill="none" stroke={preset.ink}
              opacity={(i%4===0?.40:.25)*detail} strokeWidth={i%3===0?.70:.38}/>;
          })}
          {/** Five separate tapering chin locks, never one rectangular beard. */}
          {Array.from({length:5},(_,i)=>{
            const offset=i-2,root=shift(menton,offset*11,-24+Math.abs(offset)*5);
            const end=shift(menton,offset*9,83+Math.cos(offset*1.8)*18);
            const mid:Point=shift(menton,offset*11,28+Math.abs(offset)*2);
            return <path key={"lock"+i} data-km-ink-beard-lock={i}
              d={"M"+xy(shift(root,-4,-1))
                +" Q"+xy(shift(mid,-5,-1))+" "+xy(end)
                +" Q"+xy(shift(mid,4,3))+" "+xy(shift(root,3,2))+" Z"}
              fill={preset.ink} opacity={.11+(i===2?.21:.065)}/>;
          })}
          {Array.from({length:93},(_,i)=>{
            const t=i/92,x=menton[0]+(t-.5)*75;
            const offset=Math.abs(t-.5)*2;
            const topY=menton[1]-31+offset*20+1.2*Math.sin(i*1.83);
            const len=(1-offset*.44)*(76+35*Math.abs(Math.sin(i*2.77)));
            const drift=(t-.5)*16;
            return <path key={i} d={"M"+fmt(x)+" "+fmt(topY)
              +" Q"+fmt(x+drift*.4)+" "+fmt(topY+len*.51)
              +" "+fmt(x+drift)+" "+fmt(topY+len)}
              fill="none" stroke={i%7===0?"#bfb3a1":preset.ink}
              strokeWidth={i%4===0?.83:.32+(i%3)*.09}
              opacity={(i%7===0?.48:.38)*detail}/>;
          })}
        </>}
      </g>;
    })()}
    </g>
    {/** Paper fibers are individual dry, directional lines, not a flat gradient. */}
    {detail>.5&&Array.from({length:27},(_,i)=>{
      const x=110+(i*73)%317,y=492+(i*47)%108;
      return <path key={"p"+i} d={"M"+fmt(x)+" "+fmt(y)+" l"+fmt((i%3-1)*3)+" "+fmt(4+i%5)}
        stroke={preset.ink} fill="none" strokeWidth=".28" opacity=".105"/>;
    })}
    <title>{`${character==="scholar"?"Young scholar":"Elder scholar"} — ${view} — ${features.eyeOpen.toFixed(2)} eye aperture`}</title>
  </>;
}
/** Reusable live SVG layer for cinematics, independent of existing reader art. */
export function InkAnatomicalPortrait({character="scholar",emotion="neutral",intensity=1,
  detail=1,view="bust",className}:InkAnatomicalPortraitProps){
  const uid=useId().replace(/:/g,"");
  const study=useMemo(()=>inkPortraitAnatomy(character,emotion,intensity),
    [character,emotion,intensity]);
  const amount=clamp(detail,0,1);
  return <svg data-testid="ink-anat2-portrait" data-ink-character={character}
      data-ink-emotion={emotion} data-ink-view={view}
      className={className} xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label={character+" ink portrait, "+emotion+" expression"}
      viewBox={view==="face"?"100 112 345 419":"0 95 540 525"}
      style={{display:"block",background:"#f3ead9",width:"100%",height:"auto"}}>
    <rect width="540" height="620" fill="#f4ebd9"/>
    <g><PaintedPortrait posed={study.posed} character={character} detail={amount}
      view={view} uid={"ink-a2-"+uid}/></g>
  </svg>;
}
