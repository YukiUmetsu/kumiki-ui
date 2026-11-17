/**
 * ZJ1 — original Ming literati portrait head, rebuilt from historical portrait
 * references rather than the earlier ANAT1 face mesh. Uses layered mogu
 * (bone-immersing) washes for facial volume and sparse, tapered contour marks.
 *
 * Primary study: Zeng Jing, Portrait of Pan Qintai (1621), UMMA 1966/1.110.
 * Comparative full-figure study: anonymous, Portrait of a Scholar (17th–18th c.),
 * The Metropolitan Museum of Art 29.20.1 (Open Access / Public Domain).
 * No reference pixels or traced paths are included.
 */
import {useId} from "react";
import type {InkPortraitCharacter,InkPortraitEmotion} from "./ink-anatomical-portrait";

export interface InkZengJingScholarHeadProps {
  character:InkPortraitCharacter;
  emotion:InkPortraitEmotion;
  intensity?:number;
  detail?:number;
  headScale?:number;
}

const n=(v:number)=>Number(v.toFixed(2));
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));

/** Independent source-built head in the 540×1080 standing-figure coordinate system. */
export function InkZengJingScholarHead({
  character,emotion,intensity=.9,detail=1,headScale=.48,
}:InkZengJingScholarHeadProps){
  if(character!=="scholar"&&character!=="elder")
    throw new RangeError("Unknown ZJ1 portrait identity");
  if(!["neutral","smile","sad","angry","surprise"].includes(emotion))
    throw new RangeError("Unknown ZJ1 facial expression");
  if(!Number.isFinite(intensity)||intensity<0||intensity>1)
    throw new RangeError("ZJ1 expression intensity must be in [0,1]");
  if(!Number.isFinite(detail)||detail<.25||detail>1)
    throw new RangeError("ZJ1 detail must be .25..1");
  if(!Number.isFinite(headScale)||headScale<.38||headScale>.75)
    throw new RangeError("ZJ1 headScale must be .38..75");
  const uid="km-zj1-"+useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const elder=character==="elder",power=clamp(intensity,0,1);
  const scale=.91+(headScale-.48)*.42;
  const ink=elder?"#49423a":"#51483e";
  const skin=elder?"#e4d1b8":"#eadbc5";
  const warm=elder?"#ad8870":"#b9987f";
  const bone=elder?"#a28e79":"#b5a18b";
  const sad=emotion==="sad"?power:0;
  const smile=emotion==="smile"?power:0;
  const angry=emotion==="angry"?power:0;
  const surprise=emotion==="surprise"?power:0;
  const browInner= -3.1*sad+2.6*angry-3.6*surprise;
  const browOuter= 1.3*sad-1.4*angry-2.4*surprise;
  const eyeOpen=5.2+2.2*surprise-1.1*smile-1.0*angry;
  const mouthLift=2.8*smile-2.4*sad;
  const mouthOpen=4.2*surprise;
  const facePath=elder
    ?"M237 269 C239 257 250 252 270 251 C290 252 301 260 303 275 C305 297 301 326 295 349 C290 367 281 379 270 382 C258 379 249 367 244 349 C237 326 234 296 237 269 Z"
    :"M237 268 C240 256 251 252 270 252 C290 252 301 260 303 275 C305 297 302 325 296 348 C291 365 281 377 270 380 C258 377 248 365 243 348 C237 325 234 296 237 268 Z";
  const eye=(side:"L"|"R")=>{
    const cx=side==="L"?255:285,far=side==="R";
    const y=313+(far?.55:0),half=9.6;
    const top=y-eyeOpen*.56,bottom=y+eyeOpen*.42;
    return <g key={side} data-km-zj1-eye={side}>
      <path d={`M${n(cx-half)} ${n(y)}
        Q${n(cx-3)} ${n(top-1.6)} ${n(cx+half)} ${n(y)}
        Q${n(cx+2)} ${n(bottom+1.2)} ${n(cx-half)} ${n(y)} Z`}
        fill="#f0e5d6" opacity=".58"/>
      <path d={`M${n(cx-half)} ${n(y)}
        Q${n(cx-3)} ${n(top-1.6)} ${n(cx+half)} ${n(y)}`}
        fill="none" stroke={ink} strokeWidth=".68" opacity=".68"
        strokeLinecap="round"/>
      <path d={`M${n(cx-half+1)} ${n(y+.8)}
        Q${n(cx)} ${n(bottom+1.4)} ${n(cx+half-1)} ${n(y+.7)}`}
        fill="none" stroke={bone} strokeWidth=".48" opacity=".55"/>
      <ellipse cx={cx+(far?1.1:-.4)} cy={y-.15} rx="2.05" ry={2.75+surprise*.65}
        fill="#74604e" opacity=".72"/>
      <ellipse cx={cx+(far?1.1:-.4)} cy={y-.25} rx=".88" ry="2.0"
        fill="#292722" opacity=".86"/>
      <circle cx={cx-.72} cy={y-1.18} r=".56" fill="#f7ead6" opacity=".74"/>
      <path d={`M${n(cx-half-1)} ${n(y-2.1)}
        q-2.1 -1.8 -3.2 -1.2`}
        stroke={bone} strokeWidth=".38" fill="none" opacity=".46"/>
    </g>;
  };
  const brow=(side:"L"|"R")=>{
    const cx=side==="L"?255:285,near=side==="L";
    const innerY=300+browInner,outerY=299+browOuter;
    const d=near
      ?`M244 ${n(outerY+1)} Q251 ${n(innerY-1.2)} 264 ${n(innerY+.8)}`
      :`M276 ${n(innerY+.8)} Q289 ${n(innerY-1.2)} 296 ${n(outerY+1)}`;
    return <g key={side} data-km-zj1-brow={side}>
      <path d={d} stroke={ink} strokeWidth={elder?1.05:.82}
        strokeLinecap="round" fill="none" opacity=".58"/>
      {Array.from({length:5},(_,i)=>{
        const x=(near?246:279)+i*3.15;
        const y=outerY+(innerY-outerY)*(i/4);
        return <path key={i} d={`M${n(x)} ${n(y)} l${near?.9:-.9} -1.2`}
          stroke={ink} strokeWidth=".32" opacity=".32" fill="none"/>;
      })}
    </g>;
  };
  return <g data-km-ink-zengjing-head={character}
    data-km-ink-zengjing-method="mogu-aotufa"
    data-km-ink-face-source="independent-zj1-not-anat1"
    data-km-ink-face-emotion={emotion}
    transform={`translate(270 315) scale(${n(scale)}) translate(-270 -315)`}>
    <defs>
      <radialGradient id={uid+"-skin"} cx="38%" cy="23%" r="78%">
        <stop offset="0" stopColor="#f6e9d5"/>
        <stop offset=".46" stopColor={skin}/>
        <stop offset=".82" stopColor="#dfc8ad"/>
        <stop offset="1" stopColor="#c7aa8d" stopOpacity=".66"/>
      </radialGradient>
      <radialGradient id={uid+"-malar"} cx="45%" cy="45%" r="58%">
        <stop offset="0" stopColor={warm} stopOpacity=".27"/>
        <stop offset=".58" stopColor={warm} stopOpacity=".11"/>
        <stop offset="1" stopColor={warm} stopOpacity="0"/>
      </radialGradient>
      <radialGradient id={uid+"-orbital"} cx="50%" cy="40%" r="65%">
        <stop offset="0" stopColor="#8b7562" stopOpacity=".24"/>
        <stop offset=".6" stopColor="#9b826b" stopOpacity=".10"/>
        <stop offset="1" stopColor="#9b826b" stopOpacity="0"/>
      </radialGradient>
      <linearGradient id={uid+"-nose"} x1="0" y1="0" x2="1" y2=".15">
        <stop offset="0" stopColor="#8f735d" stopOpacity="0"/>
        <stop offset=".48" stopColor="#a78368" stopOpacity=".27"/>
        <stop offset="1" stopColor="#f5e8d5" stopOpacity=".06"/>
      </linearGradient>
      <linearGradient id={uid+"-cap"} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#4b4942"/>
        <stop offset=".38" stopColor="#292a27"/>
        <stop offset=".78" stopColor="#3a3933"/>
        <stop offset="1" stopColor="#1e201e"/>
      </linearGradient>
      <linearGradient id={uid+"-neck"} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#b99a7f" stopOpacity=".38"/>
        <stop offset=".45" stopColor="#f0dfc7"/>
        <stop offset="1" stopColor="#9b806b" stopOpacity=".30"/>
      </linearGradient>
      <filter id={uid+"-wash"} x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="4.4"/>
      </filter>
      <filter id={uid+"-soft"} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="1.35"/>
      </filter>
      <clipPath id={uid+"-face-clip"}><path d={facePath}/></clipPath>
    </defs>

    {/* Skull and jaw: a narrow, asymmetric human cranium, not a vector oval. */}
    <path d={facePath} fill={`url(#${uid}-skin)`}
      stroke="#9f8872" strokeWidth=".52" strokeOpacity=".22"/>
    <g clipPath={`url(#${uid}-face-clip)`}>
      <path data-km-zj1-face-plane="forehead"
        d="M239 270 C249 252 289 250 301 271
          Q286 282 270 281 Q250 280 239 270 Z"
        fill="#f8ead7" opacity=".30" filter={`url(#${uid}-soft)`}/>
      <path data-km-zj1-face-plane="left-temple"
        d="M236 278 Q246 267 249 293 Q244 316 243 338
          Q233 319 236 278 Z"
        fill="#8f7864" opacity=".13" filter={`url(#${uid}-wash)`}/>
      <path data-km-zj1-face-plane="right-temple"
        d="M300 276 Q291 269 290 294 Q296 317 297 338
          Q306 313 300 276 Z"
        fill="#8f7864" opacity=".11" filter={`url(#${uid}-wash)`}/>
      <ellipse data-km-zj1-face-plane="left-malar" cx="249" cy="332"
        rx="17" ry="19" fill={`url(#${uid}-malar)`}/>
      <ellipse data-km-zj1-face-plane="right-malar" cx="292" cy="332"
        rx="15" ry="18" fill={`url(#${uid}-malar)`}/>
      <path data-km-zj1-face-plane="left-orbit" d="M242 304 Q254 296 267 305
        Q264 318 253 321 Q244 316 242 304 Z"
        fill={`url(#${uid}-orbital)`}/>
      <path data-km-zj1-face-plane="right-orbit" d="M274 305 Q287 296 300 305
        Q298 317 287 321 Q277 316 274 305 Z"
        fill={`url(#${uid}-orbital)`}/>
      <path data-km-zj1-face-plane="nose-bridge"
        d="M267 307 C269 319 264 337 261 345
          Q269 351 279 345 C275 332 274 318 273 307 Z"
        fill={`url(#${uid}-nose)`} opacity=".88"/>
      <path d="M270 314 Q269 332 265 344"
        stroke="#f8ead7" strokeWidth="2.1" opacity=".34"
        fill="none" filter={`url(#${uid}-soft)`}/>
      <ellipse cx="270" cy="348" rx="8.2" ry="4.1"
        fill="#b28d72" opacity=".17" filter={`url(#${uid}-soft)`}/>
      <path data-km-zj1-face-plane="chin" d="M251 357 Q270 367 289 357
        Q283 380 270 381 Q257 378 251 357 Z"
        fill="#9d8069" opacity=".12" filter={`url(#${uid}-wash)`}/>
      {elder&&<g data-km-zj1-aging-planes="elder">
        <path d="M241 335 Q250 341 258 340 M282 340 Q292 341 299 334"
          stroke={bone} strokeWidth=".62" opacity=".35" fill="none"/>
        <path d="M244 350 Q251 354 258 353 M282 353 Q290 354 296 350"
          stroke={warm} strokeWidth=".48" opacity=".34" fill="none"/>
        <path d="M248 287 Q254 284 261 286 M280 286 Q289 283 294 287"
          stroke={bone} strokeWidth=".43" opacity=".35" fill="none"/>
      </g>}
    </g>

    {/* Ears carry their own helix, antihelix and tragus; no flat side dots. */}
    <g data-km-zj1-ear="far" opacity=".68">
      <path d="M238 309 C230 303 226 311 229 324 Q232 335 239 330"
        fill="#d9c2a8" stroke={bone} strokeWidth=".54"/>
      <path d="M234 313 Q229 318 235 326 M234 319 l3 2"
        fill="none" stroke={ink} strokeWidth=".42" opacity=".43"/>
    </g>
    <g data-km-zj1-ear="near">
      <path d="M301 309 C310 302 315 310 312 325
        Q309 337 301 331 Q297 323 301 309 Z"
        fill="#dfc9b0" stroke={bone} strokeWidth=".56" opacity=".86"/>
      <path d="M304 313 Q311 313 308 322 Q305 329 302 324
        M304 320 q-3 1 -2 5"
        fill="none" stroke={ink} strokeWidth=".48" opacity=".45"/>
      <ellipse cx="301.5" cy="322" rx="2.2" ry="4.8"
        fill="#b28e75" opacity=".18" filter={`url(#${uid}-soft)`}/>
    </g>

    {/* Orbital anatomy: small deep-set eyes, soft lower-lid ledges and restrained iris. */}
    {eye("L")}{eye("R")}
    {brow("L")}{brow("R")}
    <g data-km-zj1-nasal-anatomy="bridge-tip-alar">
      <path d="M263 342 Q267 348 270 348 Q275 348 278 342"
        fill="none" stroke={bone} strokeWidth=".62" opacity=".56"/>
      <path d="M263 348 Q266 351 269 350 M272 350 Q276 351 278 348"
        fill="none" stroke={ink} strokeWidth=".43" opacity=".46"/>
      <path d="M262 346 q-3 1 -4 3 M278 346 q3 1 4 3"
        fill="none" stroke={warm} strokeWidth=".66" opacity=".36"/>
      <path d="M269 350 q-1 3 -2 4 M271 350 q1 3 2 4"
        stroke={bone} strokeWidth=".38" opacity=".38" fill="none"/>
    </g>

    {/* Nasolabial folds are broken, low-contrast arcs, never drawn as triangles. */}
    <g data-km-zj1-facial-expression="nasolabial">
      <path d={emotion==="smile"?"M257 344 Q253 351 256 355":"M257 344 Q254 350 256 354"}
        stroke={bone} strokeWidth={.55+smile*.2} opacity=".38" fill="none"/>
      <path d={emotion==="smile"?"M283 344 Q287 351 284 355":"M283 344 Q286 350 284 354"}
        stroke={bone} strokeWidth={.55+smile*.2} opacity=".34" fill="none"/>
      <path d="M251 347 q-2 2 -2 4 M289 347 q2 2 2 4"
        stroke={warm} strokeWidth=".34" opacity=".24" fill="none"/>
    </g>

    {/* Mouth: individualized vermilion edges and a live expression aperture. */}
    <g data-km-zj1-mouth="anatomical">
      {mouthOpen>.1&&<path d={`M263 356 Q270 ${n(353-mouthOpen)} 277 356
        Q276 364 270 364 Q264 363 263 356 Z`}
        fill="#68483f" opacity={.68*power}/>}
      <path d={`M258 ${n(357-mouthLift)} Q263 ${n(355-mouthLift*.5)}
        270 ${n(357+mouthOpen*.25)} Q277 ${n(355-mouthLift*.5)}
        282 ${n(357-mouthLift)}`}
        fill="none" stroke="#8b6253" strokeWidth=".68"
        strokeLinecap="round" opacity=".65"/>
      <path d={`M260 ${n(359-mouthLift*.25)} Q270 ${n(363-mouthLift*.7)}
        280 ${n(359-mouthLift*.25)}`}
        fill="none" stroke="#a67d69" strokeWidth=".55" opacity=".48"/>
      <path d="M264 365 Q270 367 276 365"
        fill="none" stroke={bone} strokeWidth=".48" opacity=".34"/>
    </g>

    {/* Facial hair is a separate hairline/follicle system, not a dark sticker. */}
    {elder?<g data-km-zj1-facial-hair="elder">
      <path d="M249 361 Q258 369 270 366 Q283 369 291 360
        Q287 378 270 392 Q254 381 249 361 Z"
        fill="#8a8070" opacity=".19"/>
      {Array.from({length:31},(_,i)=>{
        const side=i<16?-1:1,k=i%16;
        const x=270+side*(3+k*.63);
        const y=365+(k%5)*2.2;
        return <path key={i} d={`M${n(x)} ${n(y)} q${n(side*(1.5+k*.12))} 10 ${n(side*(2+k*.15))} ${n(20+k*.5)}`}
          stroke={i%4===0?"#d6c6ac":"#69665e"}
          strokeWidth={.25+(i%3)*.1} opacity={.34+(i%4)*.07}
          fill="none" strokeLinecap="round"/>;
      })}
      <path d="M250 358 Q258 354 265 359 M275 359 Q283 354 290 358"
        stroke="#6d655b" strokeWidth=".75" opacity=".42" fill="none"/>
    </g>:<g data-km-zj1-facial-hair="scholar">
      <path d="M258 358 Q263 361 269 359 M272 359 Q278 361 282 357"
        stroke="#776c5e" strokeWidth=".62" opacity=".36" fill="none"/>
      {Array.from({length:8},(_,i)=><path key={i}
        d={`M${n(262+i*2.1)} 360 q${n((i-3.5)*.12)} 2 ${n((i-3.5)*.2)} 4`}
        stroke="#827665" strokeWidth=".28" opacity=".35" fill="none"/>)}
    </g>}

    {/* Fine age/skin marks follow bone planes and are suppressed at low detail. */}
    {detail>.3&&<g data-km-zj1-skin-detail="fine">
      {Array.from({length:12},(_,i)=>{
        const side=i<6?-1:1,k=i%6;
        const x=side<0?242+k*1.8:298-k*1.8;
        const y=325+k*3.2;
        return <path key={i} d={`M${n(x)} ${n(y)} q${n(side*1.4)} 1.2 ${n(side*2.8)} 2.1`}
          stroke={i%3===0?warm:bone} strokeWidth=".28"
          opacity={(.12+(i%4)*.035)*detail} fill="none"/>;
      })}
      {Array.from({length:9},(_,i)=><path key={"forehead"+i}
        d={`M${n(250+i*4.2)} ${n(279+(i%3)*2)} q2 -1 4 .2`}
        stroke={bone} strokeWidth=".25" opacity={.13*detail} fill="none"/>)}
    </g>}

    {/* Neck joins the collar; its sternocleidomastoid planes are wash, not lines. */}
    <path d="M254 372 C256 390 253 405 247 419
      Q270 432 293 419 C286 403 284 389 286 372 Z"
      fill={`url(#${uid}-neck)`} opacity=".94"/>
    <path d="M254 386 Q262 397 269 397 Q279 395 286 385"
      fill="none" stroke={bone} strokeWidth="1.0" opacity=".30"/>
    <path d="M260 392 Q259 408 255 416 M280 392 Q281 407 286 416"
      fill="none" stroke={warm} strokeWidth="4.1" opacity=".10"
      filter={`url(#${uid}-wash)`}/>

    {/* Plain scholar's soft black gauze cap, with paper-visible dry fibers. */}
    <g data-km-zj1-headwear="ming-soft-black-gauze">
      <path d="M231 254 Q230 225 236 195
        Q270 187 304 195 Q310 225 309 254
        Q286 260 270 259 Q249 260 231 254 Z"
        fill={`url(#${uid}-cap)`} stroke="#242521"
        strokeWidth=".72" strokeOpacity=".64"/>
      <path d="M229 254 Q270 259 311 253
        Q307 261 270 263 Q234 261 229 254 Z"
        fill="#34342f" opacity=".92"/>
      <path d="M239 201 Q270 195 301 201"
        stroke="#888174" strokeWidth=".52" opacity=".30" fill="none"/>
      {Array.from({length:19},(_,i)=>{
        const x=240+i*3.25;
        const top=199+Math.sin(i*.71)*2;
        return <path key={i} d={`M${n(x)} ${n(top)} q${n(Math.sin(i*1.4)*1.1)} 18 ${n(Math.sin(i*.5)*1.5)} 31`}
          stroke={i%4===0?"#a39a87":"#d2c5ad"}
          strokeWidth={i%5===0?.48:.27} opacity={i%4===0?.25:.13}
          fill="none"/>;
      })}
      <path d="M231 253 Q270 258 309 253"
        stroke="#b7a992" strokeWidth=".52" opacity=".38" fill="none"/>
    </g>
  </g>;
}
