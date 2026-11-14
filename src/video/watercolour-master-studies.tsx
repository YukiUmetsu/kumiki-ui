import { WatercolourWetPaper } from "../../registry/video/watercolour-wet-paper-react";
import { paintHash } from "../../registry/video/watercolour-brush";
import type { WetPaperSpec, WetPigmentDrop } from "../../registry/video/watercolour-wet-paper";

export type WatercolourStudy = "botanical" | "estuary" | "courtyard";
export type WatercolourOutput = "landscape" | "portrait";
export const WATERCOLOUR_STUDIES: readonly WatercolourStudy[] =
  ["botanical","estuary","courtyard"];
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const story={
  botanical:{title:["The patient","meadow"],sub:"Species, stems & the quiet of the ordinary",footer:"BOTANICAL OBSERVATION   /   STRUCTURE & VARIETY"},
  estuary:{title:["Morning","on the estuary"],sub:"Luminous air, water and unpainted light",footer:"ATMOSPHERE & REFLECTION   /   RESERVED PAPER"},
  courtyard:{title:["A house","in afternoon"],sub:"Measured edges and translucent architecture",footer:"COLOUR PLANES   /   GEOMETRY & SHADOW"},
} as const;

/** All geometry is original: botanical observation, coastal atmosphere,
 * and architectural luminance, not tracings or reproductions of artworks.
 *
 * The same source coordinates map into two properly authored paper layouts.
 * Material events and drawn details share the exact projection and film clock.
 */
export function watercolourStudySpec(study:WatercolourStudy,output:WatercolourOutput,seed=83):WetPaperSpec {
  const portrait=output==="portrait";
  const width=portrait?540:960,height=portrait?960:540;
  const k=portrait?.85:1, ox=portrait?-280:0, oy=portrait?275:0;
  const pos=(x:number,y:number)=>({x:ox+x*k,y:oy+y*k});
  const radius=(r:number)=>r*k;
  type Source=[string,number,number,number,string,number,number,number];
  const sources:Record<WatercolourStudy,Source[]>={
    botanical:[
      ["meadow-olive",516,385,128,"#73896C",.62,.78,12],
      ["meadow-leaf",635,334,147,"#8DA48A",.7,.89,28],
      ["meadow-sage",754,367,170,"#588276",.88,.91,46],
      ["meadow-earth",666,447,140,"#BAA376",.64,.74,62],
      ["meadow-brown",824,457,105,"#967862",.52,.66,81],
      ["meadow-cool",554,443,90,"#6B8A92",.33,.63,98],
      ["meadow-lime",823,322,100,"#BBC49A",.34,.85,114],
    ],
    estuary:[
      ["morning-gold",651,210,190,"#E4C99F",.72,.95,8],
      ["morning-rose",795,194,147,"#DAB5B3",.48,.87,25],
      ["morning-blue",592,252,160,"#8EAFC5",.69,.93,40],
      ["distant-mist",735,305,165,"#879BAA",.62,.94,58],
      ["sea-green",632,391,180,"#789E9E",.8,.95,77],
      ["sea-deep",813,411,157,"#537F89",.78,.87,95],
      ["sea-ochre",825,480,88,"#B7A187",.41,.8,109],
      ["sky-amber",881,277,93,"#D8B987",.28,.77,126],
    ],
    courtyard:[
      ["sky-linen",627,195,168,"#C2C2B2",.41,.84,8],
      ["roof-umber",708,277,148,"#9D6C60",.83,.75,24],
      ["roof-violet",838,280,115,"#74738C",.58,.72,44],
      ["wall-chalk",655,366,156,"#D1C49D",.65,.84,61],
      ["cool-shadow",829,385,143,"#668698",.91,.9,83],
      ["warm-light",570,432,125,"#C5A08A",.56,.81,102],
      ["courtyard-hedge",831,479,95,"#668B76",.71,.69,123],
      ["courtyard-ochre",679,475,95,"#D2AC78",.49,.79,140],
    ],
  };
  // Brush-guided primary washes put pigment on an authored gesture rather
  // than a succession of identical Gaussian circles. Secondary transparent
  // passages share the wet sheet and blend with those broad moving strokes.
  type GesturePoint=[number,number,number];
  const brushPasses:Partial<Record<WatercolourStudy,Record<string,GesturePoint[]>>>={
    botanical:{
      "meadow-olive":[[478,423,.25],[538,381,.9],[641,351,.72],[747,365,.22]],
      "meadow-sage":[[608,398,.19],[684,344,.88],[764,329,.63],[828,354,.11]],
    },
    estuary:{
      "morning-gold":[[518,177,.11],[637,198,.84],[778,186,.69],[889,224,.09]],
      "morning-blue":[[474,286,.06],[560,260,.64],[683,269,.85],[839,309,.13]],
      "sea-green":[[491,398,.13],[639,383,.87],[757,401,.74],[896,411,.08]],
    },
    courtyard:{
      "sky-linen":[[487,199,.09],[602,185,.71],[762,200,.59],[877,219,.1]],
      "wall-chalk":[[522,375,.13],[646,346,.91],[752,370,.73],[858,405,.13]],
    },
  };
  const drops:WetPigmentDrop[]=sources[study].map(([id,x,y,r,pigment,load,water,startFrame])=>({
    id,...pos(x,y),radius:radius(r),pigment,load,water,startFrame,
    path:brushPasses[study]?.[id]?.map(([gx,gy,pressure])=>({...pos(gx,gy),pressure})),
  }));
  const reserves:string[]=[];
  const circle=(x:number,y:number,r:number)=>{
    const p=pos(x,y),R=radius(r);
    return `M${(p.x-R).toFixed(2)} ${p.y.toFixed(2)} a${R.toFixed(2)} ${R.toFixed(2)} 0 1 0 ${(2*R).toFixed(2)} 0 a${R.toFixed(2)} ${R.toFixed(2)} 0 1 0 ${(-2*R).toFixed(2)} 0 Z`;
  };
  if(study==="estuary"){
    reserves.push(circle(779,211,27));
    for(let i=0;i<9;i++){
      const p=pos(773+(i%3-1)*8,344+i*12);
      const wr=radius(19+i*1.8);
      reserves.push(`M${(p.x-wr).toFixed(1)} ${p.y.toFixed(1)} h${(wr*2).toFixed(1)} v${radius(1.8).toFixed(1)} h${(-2*wr).toFixed(1)} Z`);
    }
  } else if(study==="courtyard"){
    for(let i=0;i<4;i++){
      const p=pos(557+(i%2)*93,338+Math.floor(i/2)*65);
      const size=radius(19);
      reserves.push(`M${p.x.toFixed(2)} ${p.y.toFixed(2)} h${size.toFixed(2)} v${(size*1.5).toFixed(2)} h${(-size).toFixed(2)} Z`);
    }
  } else {
    for(let i=0;i<6;i++) {
      const p=pos(500+i*56,300+(i%3)*31);
      reserves.push(circle(portrait?500+i*56:500+i*56,300+(i%3)*31,2.6));
      void p;
    }
  }
  return {version:1,width,height,seed,paper:{color:"#F8F3E8",tooth:.82},
    cellSize:20,flow:.72,granulation:.8,dryFrames:208,
    reservePaths:reserves,drops};
}

function Stem({i,seed,frame}: {i:number;seed:number;frame:number}) {
  const h=paintHash(seed,i,13),q=paintHash(seed,i,19);
  const x=378+i*19+(h-.5)*27;
  const height=86+paintHash(seed,i,23)*242;
  const y=478+(q-.5)*19;
  const bend=(h-.5)*54;
  const sway=Math.sin(frame*.025+i*.57)*2.3;
  const kind=i%5;
  const green=["#587E68","#53766A","#859775","#A2A784","#5D777B"][kind];
  const dark=["#405E50","#4D5E52","#6C7656","#827B57","#53656A"][kind];
  const tipX=bend+sway;
  const stem=`M0 0 Q${(bend*.15).toFixed(1)} ${(-height*.53).toFixed(1)} ${tipX.toFixed(1)} ${(-height).toFixed(1)}`;
  const appear=clamp((frame-80-i*3)/55);
  const leaves=Array.from({length:kind===4?5:3},(_,n)=>{
    const side=n%2?1:-1;
    const up=height*(.26+n*.13);
    const len=(13+(1-h)*11)*(1-n*.13);
    const dx=side*len;
    return <g key={n}>
      <path d={`M${(bend*.1).toFixed(1)} ${(-up).toFixed(1)}
        Q${(dx*.85).toFixed(1)} ${(-up-13).toFixed(1)}
          ${dx.toFixed(1)} ${(-up-30).toFixed(1)}
        Q${(dx*.7).toFixed(1)} ${(-up-12).toFixed(1)}
          ${(bend*.1).toFixed(1)} ${(-up).toFixed(1)} Z`}
        fill={green} opacity={.19+n*.04}/>
      <path d={`M${(bend*.1).toFixed(1)} ${(-up).toFixed(1)}
        Q${(dx*.74).toFixed(1)} ${(-up-20).toFixed(1)}
          ${dx.toFixed(1)} ${(-up-30).toFixed(1)}`}
        stroke={dark} strokeWidth=".7" opacity=".43" fill="none"/>
    </g>;
  });
  // Five recognizable botanical families: panicle, plantain-like seed spike,
  // daisy-like composite head, clustered umbel, and feathered grass. Deliberate
  // morphology matters more than adding randomly placed micro-speckles.
  const head=kind===0? <g>
    {Array.from({length:9},(_,n)=>{
      const branch=n%2?-1:1;
      const yy=-height+4+n*5.4,xx=tipX+branch*(11+n*.6);
      return <g key={n}>
        <path d={"M"+tipX+" "+yy+" Q"+(tipX+branch*4)+" "+(yy-4)+" "+xx+" "+(yy-13)}
          stroke={dark} fill="none" strokeWidth=".65"/>
        <ellipse cx={xx} cy={yy-13} rx={1.7} ry={3}
          fill={n%3===0?"#B4A46B":"#788967"} opacity=".8"/>
      </g>;
    })}
  </g>:kind===1?<g>
    <path d={"M"+tipX+" "+(-height+4)+" q-4 -15 -1 -42"}
      stroke={dark} strokeWidth="1.2" fill="none"/>
    {Array.from({length:22},(_,n)=>{
      const shift=(n%2?-1:1)*(2+paintHash(seed,i*47+n,81)*3);
      return <ellipse key={n} cx={tipX+shift} cy={-height-1-n*1.7}
        rx={1.4} ry={2.2} fill={n%5===0?"#AFB38A":"#6F7F65"}
        opacity={.6+.25*paintHash(seed,i*13+n,89)}/>;
    })}
  </g>:kind===2?<g>
    {/* Daisylike flower: ray florets attach around a dense disc. */}
    {Array.from({length:13},(_,n)=>{
      const a=n*Math.PI*2/13;
      const x=tipX+Math.cos(a)*10,y=-height-5+Math.sin(a)*9;
      return <ellipse key={n} cx={x} cy={y} rx={3.3} ry={8.7}
        transform={"rotate("+(a*180/Math.PI+90)+" "+x+" "+y+")"}
        fill={n%3===0?"#DFD2AE":"#E3DFC4"} stroke="#B2AC8E"
        strokeWidth=".5" opacity=".8"/>;
    })}
    <circle cx={tipX} cy={-height-5} r={5.6} fill="#AC9861" opacity=".86"/>
    {Array.from({length:14},(_,n)=>{
      const a=n*2.399,r=Math.sqrt(n)*1.16;
      return <circle key={n} cx={tipX+Math.cos(a)*r} cy={-height-5+Math.sin(a)*r}
        r=".55" fill="#766F4A" opacity=".8"/>;
    })}
  </g>:kind===3?<g>
    {Array.from({length:7},(_,n)=>{
      const a=(n-3)*.32;
      const x=tipX+Math.sin(a)*20,y=-height-14-Math.cos(a)*13;
      return <g key={n}>
        <path d={"M"+tipX+" "+(-height)+" Q"+((x+tipX)/2)+" "+(-height-17)+" "+x+" "+y}
          stroke="#7F8C6D" strokeWidth=".7" fill="none"/>
        {Array.from({length:5},(_,j)=>{
          const t=j*2*Math.PI/5;
          return <ellipse key={j} cx={x+Math.cos(t)*3.2}
            cy={y+Math.sin(t)*3.1} rx={1.5} ry={2.8}
            fill={j%2?"#DDC8A1":"#F3E5C7"} opacity=".72"/>;
        })}
      </g>;
    })}
  </g>:<g>
    <path d={"M"+tipX+" "+(-height+5)+" Q"+(tipX+8)+" "+(-height-24)+" "+(tipX-1)+" "+(-height-46)}
      stroke={dark} strokeWidth=".8" fill="none"/>
    {Array.from({length:31},(_,n)=>{
      const yy=-height-3-(n%16)*2.8,side=n%2?-1:1;
      const x=tipX+side*(2+n%6*1.8);
      return <path key={n} d={"M"+x+" "+yy+" q"+(side*10)+" -9 "+(side*(13+n%4*2))+" -15"}
        stroke={n%3===0?"#A6A479":"#758C7B"} strokeWidth=".55"
        opacity=".4" fill="none"/>;
    })}
  </g>;
  return <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}
    opacity={appear}>
    <path d={stem} stroke="#F6F2D8" strokeWidth="3.9" opacity=".4" fill="none"/>
    <path d={stem} stroke={green} strokeWidth={1.4+q*.75} opacity=".77" fill="none"/>
    <path d={stem} stroke={dark} strokeWidth=".48" opacity=".62" fill="none"/>
    {leaves}
    <g>{head}</g>
  </g>;
}

function BotanicalArt({seed,frame}:{seed:number;frame:number}) {
  const fade=clamp((frame-118)/64);
  return <g>
    <path d="M336 455 Q440 424 515 456 T690 451 T925 461 L936 500 L337 500 Z"
      fill="#7B8C6A" opacity={.16*fade}/>
    <path d="M336 473 C473 483 545 453 674 476 S826 469 930 469"
      stroke="#715F54" strokeWidth="1.3" fill="none" opacity={.43*fade}/>
    {Array.from({length:29},(_,i)=><Stem key={i} i={i} seed={seed} frame={frame}/>)}
    {Array.from({length:36},(_,i)=>{
      const x=363+paintHash(seed,i,71)*552;
      const y=476+paintHash(seed,i,79)*21;
      return <path key={i}
        d={`M${x.toFixed(2)} ${y.toFixed(2)} l${((paintHash(seed,i,83)-.5)*14).toFixed(2)} -${(2+paintHash(seed,i,87)*12).toFixed(2)}`}
        stroke={i%3===0?"#776851":"#5E755F"} strokeWidth=".8" opacity={.4*fade}/>;
    })}
  </g>;
}

function EstuaryArt({frame}:{frame:number}) {
  const fade=clamp((frame-92)/74);
  const sheen=clamp((frame-135)/98);
  return <g>
    <path d="M354 309 Q435 287 478 295 Q556 269 632 290 Q699 260 773 284 Q844 270 939 290
      L942 337 L354 341 Z" fill="#8496A8" opacity={.17*fade}/>
    <path d="M354 351 Q487 337 586 342 Q691 325 782 341 Q863 337 941 345
      L941 371 L354 365 Z" fill="#678C94" opacity={.13*fade}/>
    <path d="M351 369 C477 370 536 362 650 371 S839 371 940 368"
      stroke="#507D89" opacity={.27*fade} strokeWidth="1.3" fill="none"/>
    {Array.from({length:77},(_,i)=>{
      const x=361+paintHash(78,i,41)*565;
      const y=369+paintHash(78,i,43)*111;
      const length=4+paintHash(78,i,47)*39;
      const sunny=Math.abs(x-779)<106;
      return <path key={i} d={`M${x.toFixed(2)} ${y.toFixed(2)}
        q${(length*.48).toFixed(2)} ${(paintHash(78,i,53)*2.5).toFixed(2)} ${length.toFixed(2)} 0`}
        stroke={sunny?"#F9EEDA":i%3===0?"#507D85":"#718F96"}
        strokeWidth={sunny?1.5:.7+i%3*.25} strokeLinecap="round" fill="none"
        opacity={(sunny?.58:.15+.28*paintHash(78,i,59))*sheen}/>;
    })}
    <g opacity={clamp((frame-169)/50)}>
      <path d="M705 398 Q756 391 801 397 Q783 411 737 412 Z"
        fill="#5C6A6B" opacity=".52"/>
      <path d="M734 390 L760 342 L765 390 Z" fill="#F8F2E7" opacity=".97"/>
      <path d="M766 394 L776 358 L779 395 Z" fill="#9DA4A2" opacity=".44"/>
      <path d="M761 343 V396 M709 397 Q767 409 807 398"
        stroke="#536D77" strokeWidth="1.1" fill="none"/>
      <path d="M731 412 Q766 422 795 416 M732 423 Q765 437 803 428"
        stroke="#D1D4C7" strokeWidth="1.5" fill="none" opacity=".7"/>
      {/* Tiny figure is a deliberate anatomy and storytelling scale mark,
           not a flat featureless blob: head, shirt, bent arm and seated legs. */}
      <g opacity=".81">
        <ellipse cx="778" cy="387" rx="3.4" ry="4.4" fill="#B68D74"/>
        <path d="M777 389 Q772 394 769 398 L779 402 L784 395 Q782 392 777 389 Z"
          fill="#8B9283"/>
        <path d="M773 396 Q771 399 767 399 M779 402 l7 0"
          stroke="#657476" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M773 391 Q778 389 781 392"
          stroke="#5E686D" strokeWidth="1.3" fill="none"/>
      </g>
    </g>
    {Array.from({length:14},(_,i)=>{
      const x=376+i*17+paintHash(22,i,17)*9;
      const h=20+paintHash(22,i,23)*29;
      const sw=Math.sin(frame*.033+i)*1.7;
      return <path key={i} d={`M${x.toFixed(1)} 481 q-8 -${(h*.54).toFixed(1)} ${sw.toFixed(1)} -${h.toFixed(1)}`}
        stroke={i%3===0?"#A69773":"#63827D"} strokeWidth="1.3" fill="none"
        opacity={.27*fade}/>;
    })}
  </g>;
}

function CourtyardArt({frame}:{frame:number}) {
  const fade=clamp((frame-100)/68);
  const ink=clamp((frame-180)/80);
  const windows=Array.from({length:6},(_,i)=>{
    const x=525+(i%3)*108,y=329+Math.floor(i/3)*73;
    return <g key={i}>
      <path d={`M${x} ${y+37} v-37 h42 v37 Z`}
        fill="#7E9395" opacity=".2"/>
      <path d={`M${x+3} ${y+36} v-33 h36 v33 Z`}
        fill="#BFD1CA" opacity=".22"/>
      <path d={`M${x+20} ${y} v37 M${x} ${y+16} h42`}
        stroke="#677B78" strokeWidth="1.3" opacity=".75" fill="none"/>
      <path d={`M${x} ${y+37} h42 M${x-2} ${y-2} h46`}
        stroke="#655D57" strokeWidth="1.7" opacity=".65"/>
      <path d={`M${x+46} ${y-3} l8 6 v37 l-8 -4 Z`}
        fill="#566D7C" opacity=".15"/>
    </g>;
  });
  return <g opacity={fade}>
    <path d="M434 276 L582 201 L781 219 L889 298 L881 469 L464 470 Z"
      fill="#BAA991" opacity=".30"/>
    <path d="M426 294 L567 202 L769 205 L901 291
      L887 318 L768 244 L572 241 L449 319 Z"
      fill="#826E7D" opacity=".37"/>
    <path d="M438 291 L570 218 L771 229 L891 300"
      stroke="#555D67" strokeWidth="3" fill="none" opacity=".45"/>
    <path d="M465 318 L574 255 L773 254 L882 318 V472 H465 Z"
      fill="#D9C7A5" opacity=".25"/>
    <path d="M772 255 L884 317 V472 H772 Z" fill="#4D7082" opacity=".18"/>
    <path d="M470 461 L881 461" stroke="#847B6E" strokeWidth="2" opacity=".46"/>
    <g opacity={ink}>{windows}
      <path d="M639 469 v-76 q0 -27 31 -27 t31 27 v76"
        fill="#526F77" opacity=".25"/>
      <path d="M640 469 v-78 q0 -25 30 -25 t31 25 v78"
        stroke="#53666A" strokeWidth="2" fill="none"/>
      <path d="M670 366 v103 M648 408 h45" stroke="#82908A" strokeWidth="1.2"/>
      <path d="M490 321 L568 277 M785 275 L871 327"
        stroke="#D5CDB3" strokeWidth="2.5" opacity=".77"/>
      {Array.from({length:17},(_,i)=><path key={i}
        d={`M${465+i*24} 474 h${(11+i%3*7).toFixed(0)}`}
        stroke="#856E61" strokeWidth={.8} opacity=".24"/>)}
      <path d="M789 472 L904 477 L936 508 L829 504 Z"
        fill="#526D77" opacity=".20"/>
      <g transform="translate(852 473)">
        <path d="M0 0 Q-12 -37 -8 -90 M0 0 Q20 -36 13 -110"
          stroke="#5B725B" strokeWidth="3" opacity=".65" fill="none"/>
        {Array.from({length:21},(_,i)=>{
          const a=i*.73,r=18+Math.sqrt(i)*11;
          return <ellipse key={i} cx={Math.cos(a)*r} cy={-83+Math.sin(a)*r*.8}
            rx={11} ry={5} fill={i%3===0?"#A5A66D":"#779477"}
            opacity={.28+.16*(i%3)} transform={`rotate(${i*17} ${Math.cos(a)*r} ${-83+Math.sin(a)*r*.8})`}/>;
        })}
      </g>
    </g>
  </g>;
}

export function WatercolourMasterStudyPage({study,spec,frame,reducedMotion=false}:{
  study:WatercolourStudy;spec:WetPaperSpec;frame:number;reducedMotion?:boolean;
}) {
  const portrait=spec.height>spec.width;
  const artTransform=portrait?"translate(-280 275) scale(.85)":undefined;
  const word=story[study];
  return <div style={{width:spec.width,height:spec.height,position:"relative",
    overflow:"hidden",background:spec.paper.color}}>
    <WatercolourWetPaper spec={spec} frame={frame} reducedMotion={reducedMotion}/>
    <svg role="img" aria-label={word.title.join(" ")+": original watercolor illustration"}
      viewBox={`0 0 ${spec.width} ${spec.height}`}
      style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}>
      <g transform={artTransform}>
        {study==="botanical"?<BotanicalArt seed={spec.seed} frame={reducedMotion?420:frame}/>:
          study==="estuary"?<EstuaryArt frame={reducedMotion?420:frame}/>:
            <CourtyardArt frame={reducedMotion?420:frame}/>}
      </g>
      <g fill="#46585A">
        <path d={portrait?"M35 65 H505":"M40 58 H919"} stroke="#A19F90"
          strokeWidth="1" opacity=".65"/>
        <text x={portrait?37:44} y={portrait?96:88} letterSpacing="2.3" fontWeight="700"
          fontFamily="system-ui,sans-serif" fontSize="13">WATERCOLOUR / ORIGINAL STUDIES</text>
        <text x={portrait?35:43} y={portrait?166:148} fontFamily="Georgia,serif"
          fontSize={portrait?54:54} fontStyle="italic" letterSpacing="-1.7">{word.title[0]}</text>
        <text x={portrait?35:43} y={portrait?221:208} fontFamily="Georgia,serif"
          fontSize={portrait?53:48} fontStyle="italic" letterSpacing="-1.3">{word.title[1]}</text>
        <text x={portrait?36:44} y={portrait?264:247}
          fontFamily="Georgia,serif" fontSize={portrait?16:14} fill="#667879">
          {word.sub}
        </text>
        <path d={portrait?"M35 901 H505":"M40 483 H920"} stroke="#A19F90" strokeWidth="1" opacity=".65"/>
        <text x={portrait?36:44} y={portrait?927:506} fontSize={portrait?11:11}
          fontFamily="system-ui,sans-serif" fontWeight="650" letterSpacing="1.2">
          {word.footer}
        </text>
        <text x={portrait?450:868} y={portrait?927:506}
          fontFamily="Georgia,serif" fontSize="14" fontStyle="italic">
          {study==="botanical"?"I":study==="estuary"?"II":"III"}
        </text>
      </g>
    </svg>
  </div>;
}
