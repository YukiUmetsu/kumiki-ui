import { useId, useMemo } from "react";
import { WatercolourCraftDetails } from "./watercolour-craft-detail";
import { WatercolourMasterworkMaterial } from "./watercolour-masterwork-material";
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


type PaintPoint={x:number;y:number};
/** Pressure-shaped lanceolate leaves: no circle/ellipse stamps or identical
 * repeated head geometry. Source geometry is reused from the specimen rig. */
function paintedLeaf(a:PaintPoint,b:PaintPoint,width:number):PaintPoint[] {
  const vx=b.x-a.x,vy=b.y-a.y,scale=Math.hypot(vx,vy)||1;
  const nx=-vy/scale,ny=vx/scale;
  const edge=(sign:number)=>Array.from({length:9},(_,i)=>{
    const t=sign>0?i/8:1-i/8;
    // One side remains broader; leaf apex tapers asymmetrically.
    const flank=Math.pow(Math.sin(Math.PI*t),.8)*(1+.13*(t-.5));
    const w=flank*width*(sign>0?1:.8);
    return {x:a.x+vx*t+nx*w*sign,y:a.y+vy*t+ny*w*sign};
  });
  return [...edge(1),...edge(-1)];
}

/** A second *physical* pigment field constrained to painted subjects.
 * Unlike a clipped image overlay, deposition, diffusion and drying all obey
 * the same SVG-authored silhouettes. It is not a copied master painting. */
export function watercolourSubjectSpec(study:WatercolourStudy,seed=83,
  material:{flow:number;granulation:number;tooth:number}={
    flow:.72,granulation:.8,tooth:.82,
  }):WetPaperSpec {
  const paintAreas:PaintPoint[][]=[];
  const drops:WetPigmentDrop[]=[];
  const add=(area:PaintPoint[],id:string,x:number,y:number,
    radius:number,pigment:string,load:number,startFrame:number,
    path?:WetPigmentDrop["path"])=>{
    paintAreas.push(area);
    drops.push({id,x,y,radius,pigment,load,water:.65,startFrame,path});
  };
  if(study==="botanical"){
    const hue=["#587D67","#778F73","#93A27C","#7D9885","#557E7C"];
    // Eight independently built focal specimens, 3 distinguishable leaves
    // each. Shape attachment repeats the same leaf/root calculations as Stem.
    for(let i=0;i<8;i++){
      const h=paintHash(seed,i,13),q=paintHash(seed,i,19);
      const x=[383,497,614,751,841][i%5]+Math.floor(i/5)*13+(h-.5)*48;
      const height=86+paintHash(seed,i,23)*242;
      const y=478+(q-.5)*19,bend=(h-.5)*54;
      const kind=i%5;
      for(let n=0;n<3;n++){
        const side=n%2?1:-1;
        const up=height*(.26+n*.13);
        const len=(17+(1-h)*12)*(1-n*.13);
        const a={x:x+bend*.1,y:y-up};
        const b={x:x+side*len,y:y-up-30};
        const poly=paintedLeaf(a,b,5.5+2.2*paintHash(seed,i,n));
        const at={x:a.x+(b.x-a.x)*.57,y:a.y+(b.y-a.y)*.57};
        add(poly,"leaf-"+i+"-"+n,at.x,at.y,14,
          hue[kind],.048+.018*paintHash(seed,i,n),38+i*7+n*4);
      }
    }
  }else if(study==="estuary"){
    const hills:PaintPoint[]=[
      {x:0,y:331},{x:195,y:322},{x:354,y:318},{x:387,y:311},{x:420,y:301},{x:458,y:299},
      {x:490,y:296},{x:525,y:282},{x:555,y:285},{x:605,y:293},
      {x:634,y:289},{x:675,y:277},{x:716,y:280},{x:744,y:282},
      {x:781,y:282},{x:835,y:277},{x:883,y:284},{x:960,y:290},
      {x:960,y:358},{x:354,y:354},{x:0,y:359},
    ];
    const distant:PaintPoint[]=[
      {x:0,y:358},{x:209,y:348},{x:354,y:350},{x:403,y:340},{x:468,y:345},{x:540,y:339},
      {x:610,y:336},{x:682,y:341},{x:747,y:330},{x:807,y:337},
      {x:880,y:333},{x:960,y:341},{x:960,y:380},{x:354,y:377},{x:0,y:380},
    ];
    const sea:PaintPoint[]=[
      {x:0,y:384},{x:230,y:376},{x:353,y:373},{x:450,y:367},{x:515,y:370},{x:600,y:365},
      {x:682,y:369},{x:754,y:365},{x:840,y:374},{x:960,y:368},
      {x:960,y:540},{x:0,y:540},
    ];
    add(hills,"distant-blue",610,313,115,"#6A8393",.62,29);
    add(hills,"distant-cool",785,314,106,"#77949A",.38,53);
    add(distant,"mist-aqua",611,349,100,"#78999C",.44,61);
    add(distant,"mist-umber",802,353,72,"#A4A39A",.35,76);
    add(sea,"sea-cobalt",574,420,118,"#416F87",.83,91,[
      {x:439,y:407,pressure:.28},{x:624,y:414,pressure:.94},
      {x:851,y:428,pressure:.32},
    ]);
    add(sea,"sea-viridian",775,433,106,"#528987",.78,107,[
      {x:566,y:449,pressure:.22},{x:736,y:443,pressure:.92},
      {x:879,y:456,pressure:.15},
    ]);
    add(sea,"sea-ochre",519,466,95,"#AC9479",.43,132);
  }else{
    const roof:PaintPoint[]=[
      {x:427,y:291},{x:567,y:202},{x:770,y:205},{x:901,y:291},
      {x:885,y:315},{x:769,y:244},{x:574,y:241},{x:448,y:320},
    ];
    const walls:PaintPoint[]=[
      {x:464,y:318},{x:574,y:255},{x:773,y:254},
      {x:882,y:318},{x:882,y:471},{x:464,y:471},
    ];
    const shadow:PaintPoint[]=[
      {x:772,y:255},{x:883,y:316},{x:883,y:470},{x:771,y:470},
    ];
    const garden=Array.from({length:15},(_,i)=>{
      const t=i*Math.PI*2/15;
      const wobble=1+.19*Math.sin(i*2.4+seed*.1);
      return {x:853+Math.cos(t)*70*wobble,
        y:400+Math.sin(t)*64*wobble};
    });
    add(roof,"roof-terracotta",655,257,120,"#A05D55",.81,35);
    add(roof,"roof-slate",827,276,105,"#646E83",.69,49);
    add(walls,"plaster-gold",617,361,136,"#D4AA82",.67,73,[
      {x:505,y:363,pressure:.3},{x:635,y:358,pressure:.89},
      {x:786,y:377,pressure:.23},
    ]);
    add(walls,"plaster-ochre",677,421,113,"#BDA180",.52,95);
    add(shadow,"blue-shade",821,387,112,"#53788E",.9,113);
    add(shadow,"reflected-green",836,450,69,"#5E8A8A",.49,127);
    add(garden,"garden-sage",848,402,60,"#638C6E",.55,139);
    add(garden,"garden-ochre",872,432,44,"#B1A36A",.32,155);
  }
  return {
    version:1,width:960,height:540,seed:(seed+101)%2147483648,
    paper:{color:"#F8F3E8",tooth:material.tooth},cellSize:16,
    flow:material.flow,granulation:material.granulation,
    edgePooling:.9,dryFrames:170,paintAreas,drops,
  };
}

function Stem({i,seed,frame}: {i:number;seed:number;frame:number}) {
  const h=paintHash(seed,i,13),q=paintHash(seed,i,19);
  const x=[383,497,614,751,841][i%5]+Math.floor(i/5)*13+(h-.5)*48;
  const height=86+paintHash(seed,i,23)*242;
  const y=478+(q-.5)*19;
  const bend=(h-.5)*54;
  // Root-anchored moving wind: each whole specimen, including all leaves and
  // seed heads, moves as one connected plant rather than disjoint limbs.
  const sway=.95*Math.sin(frame*.025+x*.008)+.65*Math.sin(frame*.017+i*.51);
  const kind=i%5;
  const green=["#587E68","#53766A","#859775","#A2A784","#5D777B"][kind];
  const dark=["#405E50","#4D5E52","#6C7656","#827B57","#53656A"][kind];
  const tipX=bend;
  const stem=`M0 0 Q${(bend*.15).toFixed(1)} ${(-height*.53).toFixed(1)} ${tipX.toFixed(1)} ${(-height).toFixed(1)}`;
  const appear=clamp((frame-65-i*3)/79);
  const leaves=Array.from({length:kind===4?5:3},(_,n)=>{
    const side=n%2?1:-1;
    const up=height*(.26+n*.13);
    const len=(17+(1-h)*12)*(1-n*.13);
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
  return <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${sway.toFixed(2)})`}
    opacity={appear}>
    <path d={stem} stroke="#F6F2D8" strokeWidth="3.9" opacity=".4" fill="none"/>
    <path d={stem} stroke={green} strokeWidth={1.4+q*.75} opacity=".77"
      fill="none" pathLength={1} strokeDasharray="1" strokeDashoffset={1-appear}/>
    <path d={stem} stroke={dark} strokeWidth=".48" opacity=".62" fill="none"/>
    {leaves}
    <g>{head}</g>
  </g>;
}

function BotanicalArt({seed,frame,washFilter}:{seed:number;frame:number;washFilter:string}) {
  const fade=clamp((frame-118)/64);
  return <g>
    <g filter={washFilter}>
      <path d="M336 463 C372 439 416 442 455 451 Q493 437 537 454
        C573 432 614 443 661 450 Q709 437 752 451
        Q804 439 848 455 Q901 439 932 458 L932 495
        Q850 487 797 497 C736 484 690 500 627 494
        Q548 484 488 496 Q412 488 337 501 Z"
        fill="#84936A" opacity={.17*fade}/>
      <path d="M355 476 C407 465 466 481 519 468
        Q578 458 641 470 Q706 477 759 463
        Q843 463 925 476 L923 490 Q863 481 796 495
        C705 482 643 497 562 485 Q431 493 355 491 Z"
        fill="#B7AB81" opacity={.16*fade}/>
      <path d="M361 455 C447 441 483 451 547 449
        S688 454 773 446 T923 456"
        stroke="#586E64" strokeWidth="5" fill="none" opacity={.09*fade}/>
    </g>
    <path d="M337 478 C420 485 481 462 566 475
      Q625 480 700 468 C789 481 874 468 929 475"
      stroke="#75695D" strokeWidth="1.1" fill="none" opacity={.37*fade}/>
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

function EstuaryArt({frame,washFilter}:{frame:number;washFilter:string}) {
  const fade=clamp((frame-92)/74);
  const sheen=clamp((frame-135)/98);
  return <g>
    <g filter={washFilter} opacity={fade}>
      {/* Four atmospheric depth planes: irregular geology, lost edges and
          negative spaces, not machine-cut rectangular mountain bands. */}
      <path d="M0 329 Q184 321 354 318 C387 310 420 299 458 298
        Q478 291 493 296 Q525 275 554 284
        C579 279 604 292 635 289 Q654 271 682 279
        Q711 268 743 281 Q770 271 796 287
        Q832 272 856 282 C890 280 914 289 939 290
        L960 338 Q885 334 839 342 Q790 336 748 342
        Q698 334 652 347 C593 339 545 350 497 344
        Q428 352 354 348 Q169 351 0 358 Z" fill="#859AA8" opacity=".21"/>
      <path d="M0 344 Q179 339 354 328 Q390 323 410 328 Q448 314 486 327
        Q526 312 566 333 Q604 310 630 320
        C669 300 707 310 733 324 Q773 309 816 317
        Q873 308 960 324 L960 357 Q872 352 820 362
        Q741 350 677 366 Q598 358 533 363
        Q437 350 354 364 Q173 365 0 373 Z" fill="#7C919D" opacity=".18"/>
      <path d="M0 371 Q187 369 354 360 C407 356 447 349 497 357
        C541 352 582 362 629 356 Q664 346 706 358
        Q761 350 800 361 Q862 349 960 357
        L960 382 Q876 382 839 391 C776 381 737 388 680 390
        Q606 384 547 390 Q439 381 354 391 Q185 385 0 398 Z" fill="#6D959E" opacity=".15"/>
      <path d="M380 305 Q457 289 511 297 M599 308 Q662 283 713 295"
        stroke="#A4ABB0" strokeWidth="7" opacity=".12" fill="none"/>
    </g>
    <path d="M352 374 Q424 371 486 376 Q541 374 591 380
      Q643 370 703 378 Q768 375 821 381 T939 374"
      stroke="#597E89" opacity={.22*fade} strokeWidth="1.2" fill="none"/>
    {/* Long wet glazes keep the sky and horizon connected without repeating
        hard vector bands. Fine lost-edge wisps and tiny bird strokes bring scale. */}
    <g filter={washFilter} opacity={.22*fade}>
      <path d="M405 254 C452 243 489 260 530 248 Q589 244 629 257
        T732 249 Q765 241 807 256" fill="none"
        stroke="#98ADB6" strokeWidth="8" strokeLinecap="round"/>
      <path d="M511 302 Q570 297 611 304 T722 298 Q786 301 854 305"
        stroke="#F3F2E6" strokeWidth="8" opacity=".37" fill="none"/>
      <path d="M368 415 Q457 405 537 426 Q583 411 650 422
        Q703 409 781 430 Q853 419 927 434"
        stroke="#91A9A1" strokeWidth="20" opacity=".16" fill="none"/>
    </g>
    <g stroke="#627F86" strokeWidth=".9" opacity={.3*fade} fill="none">
      <path d="M596 290 q5 -3 11 1 q4 -4 8 -2"/>
      <path d="M622 277 q4 -2 8 1 q5 -3 9 -1"/>
      <path d="M546 305 q3 -2 7 0 q3 -2 7 -1"/>
    </g>
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

function CourtyardArt({frame,washFilter}:{frame:number;washFilter:string}) {
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
      {/* Unequal watercolor panes, soft reflected light and timber wear. */}
      <path d={`M${x+3} ${y+4} Q${x+12} ${y+6} ${x+18} ${y+3}
        L${x+18} ${y+33} Q${x+12} ${y+30} ${x+3} ${y+34} Z`}
        fill="#E5E4CE" opacity={.14+.07*(i%3)}/>
      {i%3===1 && <g>
        <path d={`M${x-11} ${y-3} l9 2 v42 l-9 3 Z
          M${x+45} ${y-2} l10 -3 v41 l-10 4 Z`}
          fill="#6F8C80" opacity=".33"/>
        <path d={`M${x-7} ${y+4} v31 M${x+49} ${y+2} v32`}
          stroke="#5E756E" strokeWidth=".85" opacity=".6"/>
      </g>}
      <path d={`M${x+4} ${y+37} q20 3 35 -1`}
        stroke="#AFA28A" strokeWidth="2.3" fill="none" opacity=".4"/>
    </g>;
  });
  return <g opacity={fade}>
    <g filter={washFilter}>
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
    </g>
    <path d="M470 461 L881 461" stroke="#847B6E" strokeWidth="2" opacity=".46"/>
    <g opacity={ink}>
      {/* Art-directed roof strata. Broken, uneven marks suggest slate and
          the painter's wrist; avoid perfectly repeated architectural hatches. */}
      {Array.from({length:46},(_,i)=>{
        const x=475+paintHash(61,i,47)*385;
        const y=245+paintHash(61,i,53)*35;
        const width=4+paintHash(61,i,59)*23;
        return <path key={i} d={`M${x.toFixed(2)} ${y.toFixed(2)}
          l${width.toFixed(2)} ${(1.3+paintHash(61,i,67)*2).toFixed(2)}`}
          stroke={i%4===0?"#E8DBC6":"#716E78"} strokeWidth={i%4===0?1.2:.65}
          opacity={.09+.2*paintHash(61,i,71)} fill="none"/>;
      })}
      {/* Plaster sediment, an understated roof drain and masonry joints. */}
      {Array.from({length:55},(_,i)=>{
        const x=480+paintHash(113,i,29)*390;
        const y=327+paintHash(113,i,31)*135;
        const dx=(paintHash(113,i,41)-.5)*32;
        return <path key={i} d={`M${x.toFixed(2)} ${y.toFixed(2)}
          q${(dx*.2).toFixed(2)} -1.6 ${dx.toFixed(2)} 0`}
          stroke={i%5===0?"#8B7564":"#B9AA8E"} strokeWidth=".6"
          opacity={.08+paintHash(113,i,47)*.19} fill="none"/>;
      })}
      <path d="M891 313 Q895 356 892 406 L900 465"
        stroke="#6E7980" strokeWidth="1.2" fill="none" opacity=".38"/>
      {windows}
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

export function WatercolourMasterStudyPage({study,spec,frame,reducedMotion=false,artOnly=false,craftDetail=1,materialDepth=1}:{
  study:WatercolourStudy;spec:WetPaperSpec;frame:number;reducedMotion?:boolean;
  /** Full-frame painting instead of the editorial study with titles. */
  artOnly?:boolean;
  /** Bounded 0..1 anatomical, reflected-water, and perspective detail. */
  craftDetail?:number;
  /** Bounded material passes: translucent glazing, lifted paper and dry brush. */
  materialDepth?:number;
}) {
  if(!Number.isFinite(craftDetail)||craftDetail<0||craftDetail>1)
    throw new RangeError("Watercolour detail must be 0..1.");
  if(!Number.isFinite(materialDepth)||materialDepth<0||materialDepth>1)
    throw new RangeError("Watercolour material depth must be 0..1.");
  const portrait=spec.height>spec.width;
  const artOnlyPortraitCameras:Record<WatercolourStudy,string>={
    // Crop by a subject-specific camera without distorting its proportions.
    // Wildlife/botany, water/boat and the architectural facade need
    // different focal heights to fill a true 9:16 film frame.
    botanical:"translate(-1040 -148) scale(2)",
    estuary:"translate(-1410 -293) scale(2.22)",
    courtyard:"translate(-1280 -243) scale(2.2)",
  };
  const artTransform=artOnly
    ?(portrait?artOnlyPortraitCameras[study]:"translate(-447 -159) scale(1.46)")
    :(portrait?"translate(-280 275) scale(.85)":undefined);
  const word=story[study];
  const washId="wm4-subject-"+useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const washFilter="url(#"+washId+")";
  const subject=useMemo(()=>watercolourSubjectSpec(study,spec.seed,{
    flow:spec.flow,granulation:spec.granulation,tooth:spec.paper.tooth,
  }),[study,spec.seed,spec.flow,spec.granulation,spec.paper.tooth]);
  const canonical=useMemo(()=>{
    const base=watercolourStudySpec(study,"landscape",spec.seed);
    return {...base,flow:spec.flow,granulation:spec.granulation,
      paper:{...base.paper,tooth:spec.paper.tooth}};
  },[study,spec.seed,spec.flow,spec.granulation,spec.paper.tooth]);
  return <div style={{width:spec.width,height:spec.height,position:"relative",
    overflow:"hidden",background:spec.paper.color}}>
    {!artOnly && <WatercolourWetPaper spec={spec} frame={frame} reducedMotion={reducedMotion}/>}
    <svg role="img" aria-label={word.title.join(" ")+": original watercolor illustration"}
      viewBox={`0 0 ${spec.width} ${spec.height}`}
      style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}>
      <defs>
        {/* Only painted subject masses are affected. Text, structural
            drawing lines and accessibility labels remain crisp. */}
        <filter id={washId} x="-8%" y="-8%" width="116%" height="116%"
          colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency=".035 .027"
            numOctaves={3} seed={1+spec.seed%989} result="rag"/>
          <feDisplacementMap in="SourceGraphic" in2="rag"
            scale={2.9*spec.paper.tooth} xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        {/* Long coastal glazes must not end as a straight vertical
            rectangle across the editorial title's negative space.
            Full-canvas paintings retain the physical full-bleed coast. */}
        <linearGradient id={washId+"-coast-fade"} gradientUnits="userSpaceOnUse"
          x1="240" y1="0" x2="398" y2="0">
          <stop offset="0" stopColor="#000"/>
          <stop offset="1" stopColor="#fff"/>
        </linearGradient>
        <mask id={washId+"-editorial-shore"} maskUnits="userSpaceOnUse"
          x="0" y="0" width="960" height="540">
          <rect width="960" height="540"
            fill={`url(#${washId}-coast-fade)`}/>
        </mask>
      </defs>
      <g transform={artTransform}>
        {artOnly && <WatercolourWetPaper spec={canonical} frame={frame}
          reducedMotion={reducedMotion} transparentPaper aria-hidden="true"
          style={{width:960,height:540}}/>}
        <g mask={study==="estuary"&&!artOnly?`url(#${washId}-editorial-shore)`:undefined}>
        {study==="botanical"?<BotanicalArt seed={spec.seed} frame={reducedMotion?420:frame}
          washFilter={washFilter}/>:
          study==="estuary"?<EstuaryArt frame={reducedMotion?420:frame} washFilter={washFilter}/>:
            <CourtyardArt frame={reducedMotion?420:frame} washFilter={washFilter}/>}
        {/* Real water transport and sedimentation restricted to the painted
            botanical/landscape/architecture silhouettes. This glaze shares
            the absolute film frame and follows art-transform in portrait. */}
        <g data-km-subject-pigment="" opacity=".85" pointerEvents="none"
          style={{mixBlendMode:"multiply"}}>
          <WatercolourWetPaper spec={subject} frame={reducedMotion?420:frame}
            reducedMotion={reducedMotion} transparentPaper aria-hidden="true"
            style={{width:960,height:540}}/>
        </g>
        {/* Original material-driven shadow value, dry brush and actual
            negative-space lifting; localized to the artwork beneath the
            fine anatomical drawing, not to titles or film composition. */}
        <WatercolourMasterworkMaterial study={study} seed={spec.seed}
          frame={reducedMotion?420:frame} intensity={materialDepth}/>
        {/* Observational structure is a separate film-frame pure paint pass.
            Its botanical marks inherit source rig motion, while water marks
            follow the current and masonry respects the window openings. */}
        <WatercolourCraftDetails study={study} seed={spec.seed}
          frame={reducedMotion?420:frame} detail={craftDetail}/>
        </g>
      </g>
      {!artOnly && <g fill="#46585A">
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
      </g>}
    </svg>
  </div>;
}
