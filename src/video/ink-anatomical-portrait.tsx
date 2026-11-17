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
  return (p:readonly number[]):Point=>[270+1.91*(p[0]*c+p[2]*s),232-2.03*p[1]];
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
        strokeWidth={side==="L"?1.65:1.3} strokeLinecap="round" opacity=".86"/>
      <path d={spline(lower(side))} fill="none" stroke={preset.bone}
        strokeWidth=".76" strokeLinecap="round" opacity=".62"/>
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
  const hatTop=shift(top,-11,-24);
  const browPoints=[...brow("L"),...brow("R")];
  const foreheadLeft=shift(browPoints[1],-5,-17),foreheadRight=shift(browPoints[browPoints.length-2],5,-17);
  const upperLip=feature("lips-upper"),lowerLip=feature("lips-lower");
  const mouthLine=feature("mouth-line");
  // Jaw-drop and AU26 create a real two-rim fissure: upper inner vermilion
  // stays anchored while the measured lower lip follows the EXPR1 mandibular
  // displacement. Never leave a closed-mouth seam painted across open speech.
  const spokenMouthContour=features.mouthOpen>.012?
    spline([...mouthLine,...lowerLip.slice(2,9).reverse()],true):spline(mouthLine);
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
        fill={preset.robe} fillOpacity=".46" stroke={preset.ink} strokeWidth="1.7"/>
      <path d="M173 453 C189 505 206 554 220 612 L118 612 C139 552 153 493 173 453 Z"
        fill="#d3c9b6" opacity=".53"/>
      <path d="M365 443 C390 490 422 563 431 612 L334 612 Q355 522 365 443 Z"
        fill={preset.ink} opacity=".14"/>
      {character==="scholar"
        ?<>
          <path d="M209 425 Q261 489 344 422 Q332 483 267 528 Q231 502 209 425Z"
            fill="#e8dac5" opacity=".92" stroke={preset.bone} strokeWidth="1"/>
          <path d="M212 429 Q256 485 272 526 C291 557 291 580 280 613"
            fill="none" stroke={preset.ink} strokeWidth="2.3" opacity=".68"/>
          <path d="M338 426 C315 461 290 489 264 500"
            fill="none" stroke={preset.bone} strokeWidth="1.4" opacity=".62"/>
        </>
        :<>
          <path d="M191 425 Q261 491 341 425 L363 466 Q303 532 253 559 Q209 515 191 425Z"
            fill="#cfc4b2" opacity=".86"/>
          <path d="M199 432 C234 471 277 510 303 547 Q291 580 271 612"
            fill="none" stroke={preset.ink} strokeWidth="2.4" opacity=".72"/>
          <path d="M349 432 C315 482 284 514 257 558" fill="none"
            stroke={preset.ink} strokeWidth="2.05" opacity=".67"/>
        </>}
      {Array.from({length:17},(_,i)=>{
        const side=i%2===0?-1:1, k=Math.floor(i/2);
        const start:Point=[270+side*(69+k*10),436+k*1.3];
        const mid:Point=[270+side*(98+k*13),508-k*1.3];
        const end:Point=[270+side*(114+k*15),612];
        return <path key={i} d={"M"+xy(start)+" Q"+xy(mid)+" "+xy(end)}
          fill="none" stroke={i%5===0?preset.ink:preset.bone}
          strokeWidth={.44+(i%4)*.23} opacity={(.16+(i%5)*.075)*detail}/>;
      })}
      {Array.from({length:24},(_,i)=>{
        const u=i%12,dir=i<12?-1:1,x=270+dir*(83+u*9);
        return <path key={"f"+i} d={"M"+fmt(x)+" "+fmt(513+u*3)
          +" q"+fmt(dir*(3+u*.1))+" 25 "+fmt(dir*(4+u*.5))+" 39"}
          fill="none" stroke={preset.ink} strokeWidth=".45" opacity={.12*detail}/>;
      })}
    </g>
    {/** Cranial hair/hat, painted behind skin; scalp height derives from the ANAT1 forehead. */}
    <path d={"M"+xy(shift(templeR,0,-39))+" C"+xy(shift(top,-85,-54))+" "+xy(shift(top,45,-76))
      +" "+xy(shift(templeL,7,-25))+" L"+xy(shift(templeL,6,11))}
      fill={preset.ink} fillOpacity={character==="scholar"?.90:.65} stroke={preset.ink} strokeWidth="1.6"/>
    <path d={faceOutline} fill={preset.complexion} stroke={preset.bone} strokeWidth=".78" strokeOpacity=".53"/>
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
        strokeWidth="9" strokeOpacity=".15" fill="none"/>
      <path d={spline(feature("nose-base"))} stroke={preset.warm}
        strokeWidth="5.2" strokeOpacity=".16" fill="none"/>
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
        strokeWidth=".61" strokeLinecap="round" opacity=".36"/>
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
        <path d={spline(brow(side))} stroke={preset.ink} strokeWidth={side==="L"?2.05:1.55}
          fill="none" opacity=".75" strokeLinecap="round"/>
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
      {features.mouthOpen>.012&&<path data-km-ink-mouth-cavity="true"
        d={spline([...upperLip.slice(3,9),...lowerLip.slice(3,9).reverse()],true)}
        fill={preset.ink} opacity={clamp(.20+features.mouthOpen*.95,.2,.72)}/>}
      <path data-km-ink-mouth-line="true" d={spokenMouthContour} stroke={preset.ink}
        strokeWidth=".76" opacity=".58" strokeLinecap="round" fill="none"/>
      <path d={"M"+xy(shift(q("sublabiale"),-12,4))+" Q"+xy(shift(q("sublabiale"),1,8))+" "+xy(shift(q("sublabiale"),13,1))}
        stroke={preset.bone} fill="none" strokeWidth=".64" opacity=".46"/>
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
        strokeWidth="1.5" opacity=".95"/>
      <path d={"M"+xy(shift(templeL,10,-7))+" Q"+xy(shift(templeL,26,-3))
        +" "+xy(shift(templeL,22,17))+" M"+xy(shift(templeL,20,1))
        +" Q"+xy(shift(templeL,10,5))+" "+xy(shift(templeL,17,12))}
        stroke={preset.ink} opacity=".51" strokeWidth=".88" fill="none"/>
      <path d={"M"+xy(shift(templeL,18,8))+" q6 6 2 10"}
        fill="none" stroke={preset.ink} strokeWidth="2" opacity=".27"/>
    </g>
    {/** Hair is independent from skin and dynamically remains in head space. */}
    {character==="scholar"?<>
      <path d={"M"+xy(shift(top,-77,21))+" Q"+xy(shift(hatTop,-8,-48))
        +" "+xy(shift(top,75,13))+" Q"+xy(shift(top,57,-9))
        +" "+xy(shift(top,31,-7))+" L"+xy(shift(top,-58,6))+" Z"}
        fill={preset.ink} opacity=".91"/>
      <path d={"M"+xy(shift(hatTop,-32,-8))+" Q"+xy(shift(hatTop,0,-45))
        +" "+xy(shift(hatTop,38,-14))+" L"+xy(shift(hatTop,39,6))
        +" "+xy(shift(hatTop,-35,9))+" Z"} fill="#302a27" opacity=".93"/>
      <path d={"M"+xy(shift(hatTop,-39,11))+" Q"+xy(shift(hatTop,1,7))
        +" "+xy(shift(hatTop,44,9))} fill="none" stroke="#938573" strokeWidth="1.25" opacity=".68"/>
    </>:<>
      <path d={"M"+xy(shift(top,-68,5))+" Q"+xy(shift(top,-8,-34))
        +" "+xy(shift(top,69,0))+" Q"+xy(shift(top,50,21))
        +" "+xy(shift(top,20,6))+" Q"+xy(shift(top,-37,13))
        +" "+xy(shift(top,-68,5))+" Z"} fill={preset.ink} opacity=".84"/>
      <path d={"M"+xy(shift(q("cheilion.R"),-11,-2))+" Q"+xy(shift(q("menton"),-25,30))
        +" "+xy(shift(menton,-12,86))+" Q"+xy(shift(menton,2,67))
        +" "+xy(shift(menton,16,83))+" Q"+xy(shift(q("cheilion.L"),19,20))
        +" "+xy(shift(q("cheilion.L"),14,-3))}
        fill="#5a5147" opacity=".31" stroke={preset.ink} strokeWidth=".8"/>
      {Array.from({length:39},(_,i)=>{
        const t=i/38,x=menton[0]+(t-.5)*76;
        const topY=menton[1]-26+Math.abs(t-.5)*36;
        const len=(1-Math.abs(t-.5)*.95)*(40+16*Math.sin(i*4.12));
        return <path key={i} d={"M"+fmt(x)+" "+fmt(topY)+" q"+fmt((t-.5)*8)
          +" "+fmt(len*.55)+" "+fmt((t-.5)*14)+" "+fmt(len)}
          fill="none" stroke={i%5===0?"#e2d3bd":preset.ink}
          strokeWidth={i%3===0?.75:.43} opacity={(i%5===0?.58:.36)*detail}/>;
      })}
    </>}
    {Array.from({length:42},(_,i)=>{
      const t=i/41,x=top[0]-65+t*133,y=top[1]-6-Math.sin(Math.PI*t)*23;
      return <path key={"h"+i} d={"M"+fmt(x)+" "+fmt(y)+" q"+fmt(2.7*Math.sin(i*.61))
        +" "+fmt(-7+i%4*.5)+" "+fmt(2.4*Math.cos(i))+" -"+fmt(12+(i%7)*1.25)}
        stroke={character==="elder"&&i%4===0?"#b6a68e":preset.ink}
        fill="none" strokeWidth={i%5===0?.78:.38} opacity={(.24+(i%3)*.11)*detail}/>;
    })}
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
      viewBox={view==="face"?"100 13 345 476":"0 0 540 620"}
      style={{display:"block",background:"#f3ead9",width:"100%",height:"auto"}}>
    <rect width="540" height="620" fill="#f4ebd9"/>
    <g><PaintedPortrait posed={study.posed} character={character} detail={amount}
      view={view} uid={"ink-a2-"+uid}/></g>
  </svg>;
}
