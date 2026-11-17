/**
 * ANAT3 — independent reference-led Chinese ink character heads.
 *
 * New construction: the 468-point ANAT1 face mesh supplies the head topology,
 * craniofacial landmarks and projected feature curves; EXPR1 supplies FACS
 * deformation, gaze and expression creases. No prior Shanshui / ANAT2 portrait
 * paths or rendered screenshots are read by this component.
 *
 * Reference study: docs/research/chinese-ink-anatomical-portrait-rebuild-2026-11-17.md
 */
import {useId,useMemo} from "react";
import type {CSSProperties} from "react";
import {
  createFace,FACE_FEATURES,FACE_LANDMARKS,faceFeatureLines,measureFace,
  eyeCentres,
} from "../../registry/anatomy/anatomy-face";
import {
  expressEmotion,expressFace,expressionFeatures,expressionMarks,
  irisPositions,nearestEmotion,findEmotion,
} from "../../registry/anatomy/expression-face";
import {renderMeshFrame,projectPoint,smoothPath} from "../../registry/anatomy/anatomy-view";

export const INK_REFERENCE_CHARACTERS=["scholar","elder"] as const;
export const INK_REFERENCE_EXPRESSIONS=[
  "neutral","smile","sad","angry","surprise","fear","disgust","contempt",
] as const;
export type InkReferenceCharacter=typeof INK_REFERENCE_CHARACTERS[number];
export type InkReferenceExpression=typeof INK_REFERENCE_EXPRESSIONS[number];
type Point=[number,number];
type LandmarkName=keyof typeof FACE_LANDMARKS;

export interface InkReferenceCharacterRedrawProps {
  character?:InkReferenceCharacter;
  emotion?:InkReferenceExpression;
  intensity?:number;
  detail?:number;
  className?:string;
  style?:CSSProperties;
}

const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));

/**
 * No validated East-Asian population norm is currently present in FACE_NORMS.
 * Start from the raw ANAT1 topology and apply explicit millimetre-space
 * landmark morphs from the observed references; never borrow an unrelated
 * demographic norm as a proxy.
 */
function createSourceFace(character:InkReferenceCharacter){
  const base=createFace({calibrate:false,sex:1});
  const vertices=base.vertices.map(v=>[v[0],v[1],v[2]] as [number,number,number]);
  const subnasaleY=vertices[FACE_LANDMARKS.subnasale][1];
  const mentonY=vertices[FACE_LANDMARKS.menton][1];
  const sellionY=vertices[FACE_LANDMARKS.sellion][1];
  const mouthY=(
    vertices[FACE_LANDMARKS.subnasale][1]+vertices[FACE_LANDMARKS.stomion][1]
  )/2;
  const lowerSpan=Math.max(1,Math.abs(subnasaleY-mentonY));
  const globalWidth=character==="scholar" ? .96 : 1.04;
  const mouthWidth=character==="scholar" ? .97 : .89;
  for(const v of vertices){
    const lower=clamp((subnasaleY-v[1])/lowerSpan,0,1);
    const nose=v[1]<=sellionY&&v[1]>=subnasaleY&&Math.abs(v[0])<22;
    const mouthFalloff=clamp(1-Math.abs(v[1]-mouthY)/12,0,1);
    v[0]*=globalWidth;
    if(character==="elder"){
      v[0]*=1+.045*lower;
      if(v[1]<subnasaleY)v[1]=subnasaleY+(v[1]-subnasaleY)*1.08;
      if(nose)v[0]*=1.055;
    }else{
      v[0]*=1-.035*lower;
      if(nose)v[0]*=.95;
    }
    v[0]*=1+(mouthWidth-1)*mouthFalloff;
  }
  const points=new Float32Array(vertices.length*3);
  vertices.forEach((v,i)=>{
    points[i*3]=v[0]/1000;
    points[i*3+1]=v[1]/1000;
    points[i*3+2]=v[2]/1000;
  });
  return {...base,vertices,mesh:{...base.mesh,points}};
}
const FACE_BASE={
  scholar:createSourceFace("scholar"),
  elder:createSourceFace("elder"),
};
const IDENTITY={
  scholar:{yaw:20,ink:"#37352f",skin:"#eadbc6",wash:"#9e8069",cap:"#353a39",robe:"#e9dfd0"},
  elder:{yaw:10,ink:"#403b34",skin:"#e4d1b8",wash:"#8f7561",cap:"#41413b",robe:"#e4d8c5"},
} as const;
const fmt=(v:number)=>Number(v.toFixed(2));

function createReferenceGeometry(
  character:InkReferenceCharacter,emotion:InkReferenceExpression,intensity:number,
){
  const base=FACE_BASE[character];
  const expressed=emotion==="neutral"
    ?expressFace({},base)
    :expressEmotion(emotion,intensity,base);
  const frame=renderMeshFrame(
    expressed.mesh,
    {yaw:IDENTITY[character].yaw,pitch:0},
    {width:180,height:220,pixelsPerMetre:580,centerOnTarget:true,padding:0},
  );
  const map=(p:readonly number[]):Point=>[
    fmt(140+(p[0]-90)*1.05),
    fmt(160+(p[1]-110)*1.05),
  ];
  const pointAt=(index:number):Point=>map([
    frame.screen[index*3],frame.screen[index*3+1],
  ]);
  const landmark=(name:LandmarkName)=>pointAt(FACE_LANDMARKS[name]);
  const outlinePoints=FACE_FEATURES.oval.loop.map(pointAt);
  const outline=smoothPath(outlinePoints,true);
  const features=faceFeatureLines(frame)
    .filter(line=>line.id!=="oval")
    .map(line=>({id:line.id,d:smoothPath(line.points.map(map),false)}))
    .filter(line=>line.d.length>0);

  const depthAt=(x:number,y:number)=>{
    let best=Infinity,z=0;
    for(const v of expressed.vertices){
      const d=(v[0]-x)*(v[0]-x)+(v[1]-y)*(v[1]-y);
      if(d<best){best=d;z=v[2];}
    }
    return z;
  };
  const marks=expressionMarks(expressed).map(mark=>{
    const points=mark.points.map(([x,y])=>{
      const p=projectPoint(frame,[x/1000,y/1000,depthAt(x,y)/1000]);
      return map([p[0],p[1]]);
    });
    return {id:mark.id,strength:mark.strength,d:smoothPath(points,false)};
  }).filter(mark=>mark.d.length>0);

  const centres=eyeCentres(expressed.vertices);
  const gaze=irisPositions(expressed);
  const irises=(["L","R"] as const).map(side=>{
    const p=projectPoint(frame,[
      gaze[side][0]/1000,gaze[side][1]/1000,centres[side][2]/1000,
    ]);
    const [x,y]=map([p[0],p[1]]);
    const nearIndex=FACE_LANDMARKS[side==="L"?"exocanthion.L":"exocanthion.R"];
    const farIndex=FACE_LANDMARKS[side==="L"?"exocanthion.R":"exocanthion.L"];
    const near=frame.vertexFacing[nearIndex]>=frame.vertexFacing[farIndex];
    return {
      side,x,y,
      rx:fmt(gaze.r*.58*1.05*(near?1:.78)),
      ry:fmt(gaze.r*.58*1.05),
    };
  });
  const measures=measureFace(expressed.vertices);
  const featuresNow=expressionFeatures(expressed);
  const nearest=emotion==="neutral"
    ?"neutral":(nearestEmotion(featuresNow)[0]?.id??emotion);
  const landmarks={
    forehead:landmark("forehead"),glabella:landmark("glabella"),
    sellion:landmark("sellion"),pronasale:landmark("pronasale"),
    subnasale:landmark("subnasale"),menton:landmark("menton"),
    zygionL:landmark("zygion.L"),zygionR:landmark("zygion.R"),
    gonionL:landmark("gonion.L"),gonionR:landmark("gonion.R"),
    cheekboneL:landmark("cheekbone.L"),cheekboneR:landmark("cheekbone.R"),
    mouthL:landmark("cheilion.L"),mouthR:landmark("cheilion.R"),
  };
  const top=Math.min(...outlinePoints.map(p=>p[1]));
  const left=Math.min(...outlinePoints.map(p=>p[0]));
  const right=Math.max(...outlinePoints.map(p=>p[0]));
  const capBottom=top+5;
  const capTop=top-(character==="scholar"?49:38);
  const capPath=character==="scholar"
    ? "M"+fmt(left-8)+" "+fmt(capBottom+4)
      +" Q"+fmt(left-5)+" "+fmt(capTop+13)+" 140 "+fmt(capTop)
      +" Q"+fmt(right+8)+" "+fmt(capTop+8)+" "+fmt(right+10)+" "+fmt(capBottom+4)
      +" L"+fmt(right+4)+" "+fmt(capBottom+12)
      +" Q140 "+fmt(capBottom+5)+" "+fmt(left-4)+" "+fmt(capBottom+12)+" Z"
    : "M"+fmt(left-12)+" "+fmt(capBottom+5)
      +" C"+fmt(left-10)+" "+fmt(capTop+12)+" 112 "+fmt(capTop-2)
      +" 140 "+fmt(capTop+1)
      +" C168 "+fmt(capTop-2)+" "+fmt(right+10)+" "+fmt(capTop+12)
      +" "+fmt(right+12)+" "+fmt(capBottom+5)
      +" Q140 "+fmt(capBottom+17)+" "+fmt(left-12)+" "+fmt(capBottom+5)+" Z";

  return {
    outline,features,marks,irises,landmarks,capPath,top,left,right,
    nearest,measures,
    source:character==="scholar"?"LOC-1903-cph-3a44343":"LOC-1860-LCCN2011660679",
  };
}

function faceHair(character:InkReferenceCharacter,g:ReturnType<typeof createReferenceGeometry>,detail:number){
  const ink=IDENTITY[character].ink;
  if(character==="scholar"){
    const y=g.landmarks.subnasale[1]+8;
    const cx=(g.landmarks.mouthL[0]+g.landmarks.mouthR[0])/2;
    return <g data-km-ink-reference-moustache="separate-rooted-hairs">
      {Array.from({length:22},(_,i)=>{
        const t=i/21,x=cx-14+t*28;
        const side=t<.5?-1:1;
        const lift=Math.sin(t*Math.PI)*2.1;
        const endX=x+side*(1.2+(i%4)*.6);
        const endY=y+2.2+Math.sin(i*1.7)*1.4;
        return <path key={i} data-km-ink-moustache-fiber={i}
          d={"M"+fmt(x)+" "+fmt(y+lift*.2)
            +" Q"+fmt(x+side*2.5)+" "+fmt(y+lift+1)
            +" "+fmt(endX)+" "+fmt(endY)}
          fill="none" stroke={ink} strokeWidth={.28+(i%3)*.09}
          strokeLinecap="round" opacity={(.28+(i%5)*.045)*detail}/>;
      })}
    </g>;
  }
  const chin=g.landmarks.menton;
  const mouth=g.landmarks.subnasale;
  return <g data-km-ink-reference-beard="split-locks-organic">
    <path d={"M"+fmt(g.landmarks.mouthL[0]-5)+" "+fmt(mouth[1]+5)
      +" C"+fmt(g.landmarks.mouthL[0]-12)+" "+fmt(mouth[1]+24)
      +" "+fmt(chin[0]-23)+" "+fmt(chin[1]+12)
      +" "+fmt(chin[0]-17)+" "+fmt(chin[1]+31)
      +" Q"+fmt(chin[0])+" "+fmt(chin[1]+47)
      +" "+fmt(chin[0]+17)+" "+fmt(chin[1]+31)
      +" C"+fmt(chin[0]+23)+" "+fmt(chin[1]+12)
      +" "+fmt(g.landmarks.mouthR[0]+12)+" "+fmt(mouth[1]+24)
      +" "+fmt(g.landmarks.mouthR[0]+5)+" "+fmt(mouth[1]+5)+" Z"}
      fill="#6d6255" opacity=".13" data-km-ink-beard-substrate="soft"/>
    {Array.from({length:72},(_,i)=>{
      const t=i/71;
      const rootX=chin[0]-22+t*44;
      const rootY=mouth[1]+8+Math.sin(t*Math.PI)*3;
      const drift=Math.sin(i*1.73)*5.4+(t-.5)*9;
      const endX=rootX+drift;
      const endY=chin[1]+20+(i%9)*2.25;
      const midX=(rootX+endX)/2+Math.sin(i*.77)*3;
      return <path key={i} data-km-ink-beard-fiber={i}
        d={"M"+fmt(rootX)+" "+fmt(rootY)
          +" C"+fmt(midX-3)+" "+fmt(rootY+16)
          +" "+fmt(midX+4)+" "+fmt(endY-12)
          +" "+fmt(endX)+" "+fmt(endY)}
        fill="none" stroke={i%6===0?"#c0aa8d":ink}
        strokeWidth={.24+(i%5)*.11}
        strokeLinecap="round" opacity={(.23+(i%7)*.045)*detail}/>;
    })}
  </g>;
}

/** Source-led head, built from anatomy landmarks rather than the existing character artwork. */
export function InkReferenceCharacterRedraw({
  character="scholar",emotion="neutral",intensity=.8,detail=1,className,style,
}:InkReferenceCharacterRedrawProps){
  if(!INK_REFERENCE_CHARACTERS.includes(character))
    throw new RangeError("Unknown reference-led ink character");
  if(!INK_REFERENCE_EXPRESSIONS.includes(emotion)||(
    emotion!=="neutral"&&!findEmotion(emotion)
  ))throw new RangeError("Unknown EXPR1 reference expression");
  if(!Number.isFinite(intensity)||intensity<0||intensity>1)
    throw new RangeError("Reference expression intensity must be in [0,1]");
  if(!Number.isFinite(detail)||detail<.25||detail>1)
    throw new RangeError("Reference redraw detail must be .25..1");
  const uid="km-ink-ref-"+useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const g=useMemo(()=>createReferenceGeometry(character,emotion,intensity),
    [character,emotion,intensity]);
  const palette=IDENTITY[character];
  const chin=g.landmarks.menton;
  const jawLeft=g.landmarks.gonionL,jawRight=g.landmarks.gonionR;
  const neckTop=chin[1]-3,neckBottom=chin[1]+48;
  const earY=(g.landmarks.zygionL[1]+g.landmarks.zygionR[1])/2;
  const earX=g.right+5;
  return <svg className={className} style={{display:"block",width:"100%",height:"auto",...style}}
    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 360"
    role="img" aria-label={(character==="elder"?"Elder":"Scholar")+" original Chinese ink portrait study"}
    data-km-ink-reference-redraw="ANAT3"
    data-km-ink-reference-character={character}
    data-km-ink-reference-source={g.source}
    data-km-anat1-source="468-point-face-mesh" data-km-anat1-shape="source-informed-landmark-morph"
    data-km-anat1-landmarks={Object.keys(FACE_LANDMARKS).length}
    data-km-anat1-feature-count={g.features.length}
    data-km-anat1-face-width-mm={fmt(g.measures.zyZy)}
    data-km-anat1-mouth-width-mm={fmt(g.measures.chCh)}
    data-km-expr1-emotion={emotion}
    data-km-expr1-nearest={g.nearest}
    data-km-expr1-mark-count={g.marks.length}>
    <defs>
      <clipPath id={uid+"-face-clip"}><path d={g.outline}/></clipPath>
      <radialGradient id={uid+"-skin"} cx=".43" cy=".29" r=".78">
        <stop offset="0" stopColor="#f4e8d5"/>
        <stop offset=".58" stopColor={palette.skin}/>
        <stop offset="1" stopColor="#c8ad92"/>
      </radialGradient>
      <radialGradient id={uid+"-bone"} cx=".48" cy=".5" r=".7">
        <stop offset="0" stopColor="#b99a7d" stopOpacity=".42"/>
        <stop offset=".65" stopColor={palette.wash} stopOpacity=".20"/>
        <stop offset="1" stopColor={palette.wash} stopOpacity="0"/>
      </radialGradient>
      <radialGradient id={uid+"-shadow"} cx=".5" cy=".5" r=".7">
        <stop offset="0" stopColor="#584b3f" stopOpacity=".28"/>
        <stop offset="1" stopColor="#584b3f" stopOpacity="0"/>
      </radialGradient>
      <filter id={uid+"-wet-wash"} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="2.2"/>
      </filter>
    </defs>
    <rect width="280" height="360" fill="#f1e7d6"/>
    <path d="M16 360 C22 315 49 284 91 273
      Q111 267 122 267 L158 267 Q176 269 189 273
      C231 284 258 315 264 360 Z"
      fill={palette.robe} stroke={palette.ink} strokeWidth=".9" strokeOpacity=".42"/>
    <path d="M104 260 Q112 284 108 310 Q140 326 172 310
      Q168 284 176 260 Z" fill="#d7c6ae" opacity=".9"/>
    <path d={"M"+fmt(jawLeft[0]-2)+" "+fmt(neckTop)
      +" C"+fmt(jawLeft[0]-7)+" "+fmt(neckBottom-9)
      +" 111 "+fmt(neckBottom+3)+" 119 "+fmt(neckBottom+7)
      +" L161 "+fmt(neckBottom+7)
      +" C169 "+fmt(neckBottom+3)+" "+fmt(jawRight[0]+7)+" "+fmt(neckBottom-9)
      +" "+fmt(jawRight[0]+2)+" "+fmt(neckTop)+" Z"}
      fill="#c9ad91" opacity=".88"/>
    <path d="M82 305 Q111 286 140 299 Q169 286 198 305
      L231 360 L49 360 Z" fill="#eee3d2" opacity=".86"/>
    <path d="M103 303 Q121 324 140 333 Q159 324 177 303"
      fill="none" stroke={palette.ink} strokeWidth="1.15" opacity=".48"/>
    <path d="M113 311 Q139 345 167 311" fill="none"
      stroke="#fff8e9" strokeWidth="3.1" opacity=".38"/>
    <g data-km-ink-reference-cap="period-headcloth">
      <path d={g.capPath} fill={palette.cap} stroke="#262925"
        strokeWidth=".85" strokeOpacity=".78"/>
      {Array.from({length:18},(_,i)=>{
        const t=i/17,x=g.left-4+t*(g.right-g.left+8);
        const y=g.top-2-(character==="scholar"?34:26)*Math.sin(t*Math.PI);
        return <path key={i} d={"M"+fmt(x)+" "+fmt(g.top+4)
          +" Q"+fmt(x+Math.sin(i*1.4)*2)+" "+fmt(y+12)
          +" "+fmt(x+Math.cos(i*.9)*3)+" "+fmt(y)}
          fill="none" stroke={i%4===0?"#c2b49e":"#171b1a"}
          strokeWidth={.34+(i%3)*.13} opacity={.28*detail}/>;
      })}
      <path d={"M"+fmt(g.left-7)+" "+fmt(g.top+8)
        +" Q140 "+fmt(g.top+17)+" "+fmt(g.right+9)+" "+fmt(g.top+8)}
        fill="none" stroke="#c5b59c" strokeWidth=".65" opacity=".42"/>
    </g>
    <g data-km-ink-reference-ear="anatomical-support">
      <path d={"M"+fmt(earX)+" "+fmt(earY-10)
        +" C"+fmt(earX+13)+" "+fmt(earY-13)
        +" "+fmt(earX+15)+" "+fmt(earY+11)
        +" "+fmt(earX+2)+" "+fmt(earY+16)}
        fill="#d8c1a6" stroke={palette.ink} strokeWidth=".65" opacity=".72"/>
      <path d={"M"+fmt(earX+5)+" "+fmt(earY-3)
        +" Q"+fmt(earX+13)+" "+fmt(earY+1)
        +" "+fmt(earX+5)+" "+fmt(earY+9)}
        fill="none" stroke={palette.ink} strokeWidth=".55" opacity=".5"/>
    </g>
    <path d={g.outline} fill={"url(#"+uid+"-skin)"}
      stroke={palette.ink} strokeWidth=".62" strokeOpacity=".36"/>
    <g clipPath={"url(#"+uid+"-face-clip)"}
      data-km-ink-reference-wash-planes="forehead-orbit-malar-nose-jaw">
      <ellipse cx={g.landmarks.forehead[0]} cy={g.landmarks.forehead[1]+5}
        rx="28" ry="19" fill={"url(#"+uid+"-bone)"} filter={"url(#"+uid+"-wet-wash)"}/>
      <ellipse cx={g.landmarks.cheekboneL[0]} cy={g.landmarks.cheekboneL[1]+4}
        rx="22" ry="16" fill={"url(#"+uid+"-bone)"} filter={"url(#"+uid+"-wet-wash)"}/>
      <ellipse cx={g.landmarks.cheekboneR[0]} cy={g.landmarks.cheekboneR[1]+4}
        rx="18" ry="14" fill={"url(#"+uid+"-bone)"} filter={"url(#"+uid+"-wet-wash)"}/>
      <ellipse cx={g.landmarks.sellion[0]} cy={g.landmarks.sellion[1]+18}
        rx="12" ry="31" fill={"url(#"+uid+"-bone)"} opacity=".76"/>
      <ellipse cx={g.landmarks.menton[0]} cy={g.landmarks.menton[1]-1}
        rx="27" ry="15" fill={"url(#"+uid+"-shadow)"}/>
      <path d={"M"+fmt(g.landmarks.glabella[0])+" "+fmt(g.landmarks.glabella[1])
        +" Q"+fmt(g.landmarks.pronasale[0]+8)+" "+fmt(g.landmarks.pronasale[1]+4)
        +" "+fmt(g.landmarks.subnasale[0])+" "+fmt(g.landmarks.subnasale[1]+8)}
        fill="none" stroke="#8a715c" strokeWidth="1.2"
        opacity=".25" filter={"url(#"+uid+"-wet-wash)"}/>
    </g>
    <g data-km-anat1-projected-features="true" clipPath={"url(#"+uid+"-face-clip)"}>
      {g.features.map((f,i)=>{
        const brow=f.id.startsWith("brow");
        const eye=f.id.startsWith("eye");
        const nose=f.id.startsWith("nose");
        const lip=f.id.startsWith("lips")||f.id==="mouth-line";
        return <path key={f.id+"-"+i} data-km-anat1-feature={f.id}
          d={f.d} fill="none" stroke={lip?"#735847":palette.ink}
          strokeWidth={brow?1.02:eye? .78:nose? .62:lip? .58:.48}
          strokeLinecap="round" strokeLinejoin="round"
          opacity={brow? .62:eye? .76:nose? .52:lip? .72:.5}/>;
      })}
      {g.irises.map(eye=><g key={eye.side} data-km-anat1-iris={eye.side}>
        <ellipse cx={eye.x} cy={eye.y} rx={eye.rx} ry={eye.ry}
          fill="#705541" opacity=".84"/>
        <ellipse cx={eye.x} cy={eye.y} rx={eye.rx*.43} ry={eye.ry*.78}
          fill="#211d19" opacity=".92"/>
        <circle cx={eye.x-eye.rx*.28} cy={eye.y-eye.ry*.34}
          r={Math.max(.55,eye.rx*.18)} fill="#f8efdd" opacity=".78"/>
      </g>)}
      {g.marks.map(mark=><path key={mark.id}
        data-km-expr1-mark={mark.id} d={mark.d}
        fill="none" stroke={palette.ink}
        strokeWidth={.35+mark.strength*.48}
        strokeLinecap="round"
        opacity={mark.strength*(character==="elder" ? .48:.31)*detail}/>)}
    </g>
    {faceHair(character,g,detail)}
    <g data-km-ink-reference-fine-planes="jaw-neck-collar">
      <path d={"M"+fmt(jawLeft[0])+" "+fmt(jawLeft[1])
        +" Q140 "+fmt(chin[1]+16)+" "+fmt(jawRight[0])+" "+fmt(jawRight[1])}
        fill="none" stroke={palette.ink} strokeWidth=".55" opacity=".28"/>
      <path d="M89 287 Q111 309 127 319 M191 287 Q169 309 153 319"
        fill="none" stroke={palette.ink} strokeWidth=".62" opacity=".36"/>
      {Array.from({length:16},(_,i)=>{
        const x=70+i*9,y=318+(i%4)*5;
        return <path key={i} d={"M"+x+" "+y+" q"+(i%2?3:-3)+" 8 "+(i%2?5:-5)+" 15"}
          fill="none" stroke={i%3===0?"#f7eddd":palette.wash}
          strokeWidth=".38" opacity={.24*detail}/>;
      })}
    </g>
    <g data-km-ink-reference-identity-notes="source-specific">
      <path d="M18 22 H58 M222 22 H262" stroke={palette.ink}
        strokeWidth=".5" opacity=".22"/>
      <circle cx="18" cy="22" r="1.3" fill={palette.ink} opacity=".28"/>
      <circle cx="262" cy="22" r="1.3" fill={palette.ink} opacity=".28"/>
    </g>
  </svg>;
}
