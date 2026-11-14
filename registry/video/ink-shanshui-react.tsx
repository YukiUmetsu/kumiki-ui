import {useId,useMemo} from "react";
import type {ReactNode} from "react";
import {assertShanshuiControls,shanshuiAt,shanshuiHash} from "./ink-shanshui";
import type {ShanshuiControls,ShanshuiScene,ShanshuiMotion} from "./ink-shanshui";

/**
 * A procedural painter, NOT a flat bitmap disguised as a movie.
 *
 * Three separate independent visual vocabularies drawn in code:
 *  • distant mountain silhouettes, hemp-fiber slope contours & wet washes;
 *  • near pine/willow/bamboo, individually attached loaded needle/leaf gestures;
 *  • rock, path, water, arch, distant pavilion, sky and paper grain.
 *
 * The source reference images are never distributed or sampled as textures.
 * No interval, runtime randomness, image loading or independent animation clock.
 */
const W=960,H=540;
const INK="#493b2e",STONE="#82674d",PAPER="#f3e6cd";
type P=readonly [number,number];
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const f=(x:number)=>Number(x.toFixed(2));
const s=(seed:number,i:number)=>shanshuiHash(seed,i);
const ridgePath=(nodes:readonly P[])=>"M "+nodes.map(([x,y])=>f(x)+" "+f(y)).join(" L ")+
  " L 1080 550 L -110 550 Z";
const ridgeHeight=(nodes:readonly P[],x:number)=>{
  for(let i=0;i<nodes.length-1;i++){
    const [x0,y0]=nodes[i],[x1,y1]=nodes[i+1];
    if(x>=x0&&x<=x1)return y0+(y1-y0)*(x-x0)/(x1-x0);
  }
  return nodes[nodes.length-1][1];
};
const RIDGES:Record<ShanshuiScene,readonly (readonly P[])[]>={
  "misty-hermit":[
    [[-60,213],[70,170],[160,206],[247,112],[292,127],[360,213],[483,158],[571,201],[681,166],[790,186],[875,92],[940,110],[1040,195]],
    [[-50,302],[65,243],[133,259],[235,155],[278,202],[358,294],[492,218],[590,283],[672,226],[770,264],[840,150],[914,120],[1040,272]],
    [[-50,384],[64,326],[170,344],[263,260],[350,352],[448,306],[532,385],[646,290],[733,345],[828,244],[916,228],[1040,378]],
  ],
  "river-scholar":[
    [[-60,250],[88,210],[170,222],[260,177],[345,241],[447,154],[538,230],[653,178],[747,128],[825,159],[960,170],[1040,237]],
    [[-50,327],[67,267],[160,297],[265,231],[348,292],[460,223],[535,267],[620,174],[706,124],[755,146],[840,192],[1050,298]],
    [[-50,379],[90,344],[175,355],[259,295],[345,349],[464,309],[565,357],[635,259],[706,217],[790,266],[922,261],[1050,352]],
  ],
  "mountain-trail":[
    [[-60,235],[50,180],[152,204],[252,147],[312,192],[422,155],[489,178],[581,103],[624,117],[737,183],[832,149],[1030,230]],
    [[-60,334],[64,271],[146,288],[254,195],[340,251],[445,216],[554,83],[590,98],[655,188],[745,155],[825,221],[1050,318]],
    [[-60,430],[78,359],[160,405],[275,298],[338,361],[427,304],[530,235],[586,274],[713,340],[812,295],[1050,383]],
  ],
};
function Mountains({scene,seed,detail,mist,ink,ids}:{
  scene:ShanshuiScene;seed:number;detail:number;mist:number;ink:number;
  ids:{far:string;mid:string;near:string;grain:string};
}){
  return <g data-km-shanshui-mountains="">
    {RIDGES[scene].map((ridge,band)=>{
      const width=band===0?1.1:band===1?1.3:1.8;
      const count=Math.round((band===0?27:band===1?48:67)*detail);
      return <g key={band} opacity={(band===0?.32:band===1?.58:.73)*ink}>
        <path d={ridgePath(ridge)} fill={"url(#"+([ids.far,ids.mid,ids.near][band])+")"}
          stroke={band===2?"#816b51":"#ac9070"} strokeWidth={band===2?.85:.55}/>
        {/* Cunfa: lines emerge from slopes, vary in weight and leave deliberate fog gaps. */}
        {Array.from({length:count},(_,i)=>{
          const x=-22+1000*s(seed+band*1201,i*3+3);
          const y=ridgeHeight(ridge,x)+5+11*s(seed+5,i*19+band);
          const length=(band===0?30:band===1?66:92)*(.36+s(seed+19,i*7+band));
          const dx=-17+42*s(seed+29,i*5+band);
          const opacity=(.18+.47*s(seed+8,i*11+band))*(1-.55*mist);
          return <path key={i}
            d={"M"+f(x)+" "+f(y)+" Q"+f(x+dx*.35)+" "+f(y+length*.35)+
              " "+f(x+dx*.58)+" "+f(y+length*.67)+" T"+
              f(x+dx)+" "+f(y+length)}
            fill="none" stroke={band===2?INK:STONE}
            strokeWidth={f(width*(.48+s(seed+11,i+band)))}
            strokeLinecap="round" opacity={opacity}/>;
        })}
        {/* Moss dots cling to the actual crest rather than being random screen confetti. */}
        {Array.from({length:Math.round((band===2?52:22)*detail)},(_,i)=>{
          const x=18+915*s(seed+band*31,i*3+97);
          const y=ridgeHeight(ridge,x)+3+10*s(seed+band*51,i+119);
          return <ellipse key={i} cx={f(x)} cy={f(y)}
            rx={f(.65+1.9*s(seed,i*13+band))}
            ry={f(.45+.9*s(seed,i*9+band))}
            fill={INK} opacity={.17+.36*s(seed,i*7+3)}/>;
        })}
      </g>;
    })}
  </g>;
}
function Clouds({shift}:{shift:number}){
  const d="M-51 0 C-34 -7 -25 2 -17 -8 C-11 -15 -1 -11 4 -8 C9 -5 21 -12 28 -6 C35 -1 44 -3 51 -7 M-29 8 C-19 13 -8 9 2 7 C16 4 32 10 42 7";
  return <g fill="none" stroke="#97816a" strokeWidth="1" strokeLinecap="round" opacity=".52"
    transform={"translate("+f(shift)+",0)"}>
    <path d={d} transform="translate(187 143) scale(1.43 .72)"/>
    <path d={d} transform="translate(730 162) scale(.92 .6)"/>
    <path d={d} transform="translate(832 236) scale(.76 .54)" opacity=".72"/>
  </g>;
}
function Birds({motion}:{motion:ShanshuiMotion}){
  return <g fill="none" stroke={INK} strokeWidth="2.1" strokeLinecap="round"
    data-km-shanshui-birds="" data-km-shanshui-bird-x={f(motion.birdX)}
    transform={"translate("+f(motion.birdX-620)+" "+f(motion.birdY-145)+")"}>
    {[{x:620,y:145,k:1},{x:592,y:165,k:.65},{x:663,y:158,k:.5}].map((b,i)=>
      <g key={i} transform={"translate("+b.x+" "+b.y+") scale("+b.k+")"}>
        <path d={"M-13 1 Q-7 "+f(-6+motion.birdWing*5)+" 0 1 Q8 "+
          f(-6-motion.birdWing*5)+" 14 1"}/>
      </g>)}
  </g>;
}
/** Willow foliage has independent drooping strands and individually tapered leaves.
 * The vine origin follows its branch; tiny breeze changes leaf rotation only.
 */
function Willow({wind,seed,detail}:{wind:number;seed:number;detail:number}){
  const strands=Math.round(39*detail);
  return <g data-km-shanshui-willow="" transform="translate(25 433)">
    <path d="M-16 10 Q10 -43 18 -112 Q24 -172 35 -237 Q54 -281 97 -315 Q133 -333 168 -347
      Q108 -335 63 -314 Q20 -289 7 -238 Q-9 -161 -26 -94 Q-31 -38 -25 10 Z"
      fill="#7e654a" stroke={INK} strokeWidth="2.2"/>
    <path d="M-10 -3 Q6 -116 26 -217 Q39 -295 115 -332 M1 -91 Q23 -159 30 -223"
      fill="none" stroke="#dfc89f" strokeWidth="5" opacity=".45"/>
    <path d="M27 -228 Q140 -328 326 -329 M36 -254 Q151 -364 393 -332
      M58 -298 Q187 -303 379 -284 M78 -319 Q205 -370 352 -357
      M17 -213 Q99 -276 243 -252 M40 -248 Q138 -286 302 -291"
      stroke="#6b5038" strokeWidth="5.1" fill="none" strokeLinecap="round"/>
    <path d="M31 -233 Q137 -320 322 -325 M41 -252 Q152 -352 387 -331
      M62 -294 Q197 -298 367 -280"
      stroke="#c0a180" strokeWidth="1.2" fill="none" opacity=".8"/>
    {Array.from({length:strands},(_,i)=>{
      const left=29+380*s(seed,i*7+9),top=-334+75*s(seed,i*3+50);
      const fall=48+125*s(seed,i*11+20);
      const drop=fall*(1+.012*wind);
      const leafCount=Math.round(4+7*s(seed,i*5+2));
      return <g key={i}>
        <path d={"M"+f(left)+" "+f(top)+" Q"+f(left-10+wind*4)+" "+
          f(top+fall*.48)+" "+f(left+8+wind*6)+" "+f(top+drop)}
          fill="none" stroke="#9c8568" strokeWidth={.7+.35*s(seed,i*31)}
          opacity=".6"/>
        {Array.from({length:leafCount},(_,j)=>{
          const t=(j+.6)/(leafCount+1),x=left-12*t+8*t*t+wind*t*5;
          const y=top+drop*t,dir=j%2?1:-1,len=6+6*s(seed,i*37+j);
          return <path key={j}
            d={"M"+f(x)+" "+f(y)+" Q"+f(x+dir*len*.8)+" "+f(y+3)+
              " "+f(x+dir*len)+" "+f(y+len*.52)+
              " Q"+f(x+dir*len*.4)+" "+f(y+len*.48)+" "+f(x)+" "+f(y)}
            fill={j%4===0?"#a48b6a":"#66543f"}
            opacity={.32+.35*s(seed,i*11+j*5)}/>;
        })}
      </g>;
    })}
    {Array.from({length:31},(_,i)=>{
      const yy=-21-i*8,xx=-14+15*Math.sin(i*.25);
      return <path key={i}
        d={"M"+f(xx)+" "+f(yy)+" q"+f(8+s(seed,i)*10)+" -17 "+f(17+s(seed,i+2)*18)+" -18"}
        fill="none" stroke={i%3===0?"#382a22":"#bd9b71"} strokeWidth={i%3===0?1.7:1}
        opacity={.5+s(seed,i+2)*.35}/>;
    })}
  </g>;
}
function NeedleSpray({x,y,scale,seed,wind}:{x:number;y:number;scale:number;seed:number;wind:number}){
  const needles=Array.from({length:15},(_,i)=>{
    const spread=(i-7)/7,len=(12+10*s(seed,i))*scale;
    const startX=x+spread*5*scale,startY=y+2*Math.abs(spread);
    const endX=startX+spread*len*1.6,endY=startY-(1-Math.abs(spread)*.5)*len*.42;
    return "M"+f(startX)+" "+f(startY)+" Q"+f(startX+(endX-startX)*.6)+" "+
      f(startY-len*.63)+" "+f(endX)+" "+f(endY);
  }).join(" ");
  return <g transform={"rotate("+f(wind*1.5)+" "+x+" "+y+")"}>
    <path d={needles} stroke="#423629" fill="none" strokeWidth=".87"
      strokeLinecap="round" opacity=".78"/>
    <ellipse cx={x} cy={y-2} rx={9*scale} ry={3*scale}
      fill="#75634d" opacity=".11"/>
  </g>;
}
function OldPine({x,y,scale,wind,seed,detail}:{
  x:number;y:number;scale:number;wind:number;seed:number;detail:number;
}){
  const stems=[
    {y:-95,dir:-1,len:83},{y:-129,dir:1,len:153},
    {y:-156,dir:-1,len:153},{y:-184,dir:1,len:167},
    {y:-209,dir:-1,len:100},{y:-227,dir:1,len:107},
    {y:-250,dir:-1,len:72},{y:-273,dir:1,len:65},
  ];
  return <g data-km-shanshui-pine="" transform={"translate("+x+" "+y+") scale("+scale+")"}>
    <path d="M-19 2 C-21 -37 7 -59 2 -94 C-14 -121 15 -144 8 -175
      C-7 -207 32 -229 23 -251 C16 -276 27 -289 38 -299
      L44 -295 C35 -264 45 -248 32 -228 C22 -202 18 -184 20 -169
      C25 -134 7 -116 15 -93 C21 -60 -5 -32 -1 4 Z"
      fill="#68513a" stroke="#3f3024" strokeWidth="2.1"/>
    <path d="M-11 -2 Q-15 -60 10 -93 Q-3 -133 17 -180
      Q35 -233 34 -271 M3 -25 Q-2 -77 12 -115 M6 -140 Q-4 -170 23 -207"
      stroke="#bd9870" strokeWidth="3.3" opacity=".55" fill="none"/>
    {Array.from({length:28},(_,i)=>{
      const cy=-8-i*10,x0=-11+17*Math.sin(i*.33);
      return <path key={i} d={"M"+f(x0)+" "+cy+" q"+f(9+s(seed,i)*12)+" -12 "+
        f(22+s(seed,i+1)*12)+" -19"}
        stroke={i%4===0?"#362a21":"#d0b18b"}
        strokeWidth={i%4===0?1.9:.75} opacity=".62" fill="none"/>;
    })}
    {stems.map((b,i)=>{
      const a=(b.y+270)/95,reach=b.len*b.dir;
      return <g key={i}>
        <path d={"M"+f(9+a*11)+" "+b.y+" Q"+f(reach*.32)+" "+
          f(b.y-16)+" "+f(reach*.57)+" "+f(b.y-23)+
          " T"+f(reach)+" "+f(b.y-13)}
          stroke="#51402c" strokeWidth={7-i*.48} fill="none" strokeLinecap="round"/>
        <path d={"M"+f(10+a*11)+" "+f(b.y-2)+" Q"+f(reach*.4)+" "+
          f(b.y-18)+" "+f(reach)+" "+f(b.y-15)}
          stroke="#c2a080" strokeWidth="1.6" fill="none" opacity=".76"/>
        {Array.from({length:Math.round((4+(i%3))*detail)},(_,j)=>{
          const u=(j+.32)/(5+(i%3));
          return <NeedleSpray key={j}
            x={f(reach*u)} y={f(b.y-14-8*Math.sin(u*Math.PI))}
            scale={.58+(.62*s(seed,i*21+j))} wind={wind}
            seed={seed+i*41+j*71}/>;
        })}
      </g>;
    })}
    <NeedleSpray x={39} y={-296} scale={.92} seed={seed+9} wind={wind}/>
    <NeedleSpray x={19} y={-263} scale={1.1} seed={seed+61} wind={wind}/>
  </g>;
}
function Bamboo({x,y,scale,wind,seed,detail}:{
  x:number;y:number;scale:number;wind:number;seed:number;detail:number;
}){
  return <g data-km-shanshui-bamboo="" transform={"translate("+x+" "+y+") scale("+scale+")"}>
    {[-32,0,25].map((x0,i)=>{
      const h=315+i*53,tipX=x0-38-i*13;
      return <g key={i}>
        <path d={"M"+x0+" 0 Q"+f(x0-6)+" "+f(-h*.48)+
          " "+tipX+" "+(-h)}
          stroke="#6d5741" strokeWidth={f(7.5-i*.65)} fill="none" strokeLinecap="round"/>
        <path d={"M"+f(x0-1)+" 0 Q"+f(x0-7)+" "+f(-h*.48)+
          " "+f(tipX-1)+" "+(-h)}
          stroke="#e1c59c" strokeWidth="2" fill="none" opacity=".56"/>
        {Array.from({length:7},(_,j)=>{
          const t=(j+1)/8,cx=x0+(tipX-x0)*t-2,cy=-h*t;
          const fan=j%2===0?-1:1,reach=(36+28*s(seed,i*11+j))*fan;
          return <g key={j} transform={"rotate("+f(wind*.6)+" "+f(cx)+" "+f(cy)+")"}>
            <path d={"M"+f(cx)+" "+f(cy)+" Q"+f(cx+reach*.45)+" "+f(cy-17)+
              " "+f(cx+reach)+" "+f(cy-27)}
              stroke="#685541" strokeWidth="1.15" fill="none"/>
            {Array.from({length:Math.round(detail*6)},(_,k)=>{
              const a=(k+.7)/7,bx=cx+reach*a,by=cy-23*a;
              const side=k%2===0?1:-1,len=10+12*s(seed,i*50+j*9+k);
              return <path key={k}
                d={"M"+f(bx)+" "+f(by)+" Q"+f(bx+side*len*.43)+
                " "+f(by-3)+" "+f(bx+side*len*.85)+" "+f(by-len*.55)+
                " Q"+f(bx+side*len*.4)+" "+f(by-len*.38)+" "+f(bx)+" "+f(by)}
                fill={k%4===0?"#a88f6c":"#4b4032"}
                opacity={.38+.37*s(seed,k+i*31+j*7)}/>;
            })}
          </g>;
        })}
        {Array.from({length:5},(_,j)=>{
          const t=(j+1)/6;
          return <path key={j} d={"M"+f(x0+(tipX-x0)*t-6)+" "+f(-h*t)+
            " q 5 -3 13 -2"}
            stroke="#392d24" strokeWidth="1.8" fill="none"/>;
        })}
      </g>;
    })}
  </g>;
}
function Pavilion({x,y,scale=1}:{x:number;y:number;scale?:number}){
  return <g data-km-shanshui-pavilion="" transform={"translate("+x+" "+y+") scale("+scale+")"}
    stroke="#715840" strokeLinecap="round" strokeLinejoin="round">
    <path d="M-46 -35 Q-29 -42 -20 -54 Q0 -51 0 -68 Q0 -52 21 -54 Q31 -41 48 -35
      Q30 -31 20 -38 L-21 -38 Q-30 -30 -46 -35 Z"
      fill="#ac9475" fillOpacity=".36" strokeWidth="2.1"/>
    <path d="M-53 -36 Q-31 -28 -20 -43 L22 -43 Q34 -29 54 -36
      M-13 -54 Q0 -59 13 -54 M0 -69 L0 -74"
      fill="none" strokeWidth="1.9"/>
    <path d="M-38 -29 L-38 -1 M-21 -37 L-21 -1 M0 -39 L0 -1
      M20 -38 L20 -1 M39 -29 L39 -1 M-44 -1 L45 -1"
      fill="none" stroke="#81674e" strokeWidth="2.7"/>
    <path d="M-39 -5 L40 -5 M-20 -25 L20 -25"
      fill="none" strokeWidth="1.2"/>
    <path d="M-47 -3 Q-2 4 49 -3 L55 3 Q0 13 -54 3 Z"
      fill="#9c8060" fillOpacity=".43" strokeWidth="1.3"/>
  </g>;
}
function StoneBridge(){
  return <g data-km-shanshui-bridge="" stroke="#816a50" strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M508 368 Q582 314 683 367 L683 377 Q594 335 512 377 Z"
      fill="#b9a17f" fillOpacity=".7" strokeWidth="1.35"/>
    <path d="M522 374 Q594 330 670 374 M532 379 Q596 348 659 379"
      stroke="#dfc7a5" strokeWidth="2.8" fill="none"/>
    <path d="M514 358 Q585 310 678 359 M514 366 Q587 319 678 366"
      strokeWidth="1.15" fill="none"/>
    {Array.from({length:11},(_,i)=>{
      const t=i/10,x=514+164*t, y=358-43*Math.sin(t*Math.PI);
      return <g key={i}>
        <path d={"M"+f(x)+" "+f(y)+" l0 -12"} strokeWidth="1.7"/>
        <path d={"M"+f(x-3)+" "+f(y-13)+" l6 0"} strokeWidth="1.5"/>
        {i<10&&<path d={"M"+f(x)+" "+f(y-9)+" L"+
          f(x+16.4)+" "+f(358-43*Math.sin((t+.1)*Math.PI)-9)}
          strokeWidth=".8"/>}
      </g>;
    })}
  </g>;
}
function Water({phase,detail,seed}:{phase:number;detail:number;seed:number}){
  return <g data-km-shanshui-water="">
    <path d="M-40 370 Q151 369 286 376 Q438 371 537 380 Q780 362 1010 378
      L1010 560 L-40 560 Z" fill="#efe2cb" opacity=".73"/>
    <path d="M-20 375 Q135 373 295 382 Q443 379 535 383 Q750 377 980 382"
      stroke="#967a5a" strokeWidth="1.1" opacity=".43" fill="none"/>
    {Array.from({length:Math.round(112*detail)},(_,i)=>{
      const x=20+926*s(seed,i*11+14);
      const y=381+158*s(seed,i*7+63);
      const width=5+32*s(seed,i*13+21);
      const jitter=.7*Math.sin(phase+i*.51),shade=.14+.36*s(seed,i*5+13);
      return <path key={i} d={"M"+f(x)+" "+f(y+jitter)+" q"+
        f(width*.48)+" "+f(1.8*s(seed,i*9))+" "+f(width)+" "+
        f(.25*Math.sin(i*.5))}
        fill="none" stroke={i%6===0?"#604b36":"#a68b68"}
        strokeWidth={i%6===0?.95:.57} opacity={shade}/>;
    })}
  </g>;
}
function RockyPath({seed,detail,scene}:{seed:number;detail:number;scene:ShanshuiScene}){
  const river=scene==="river-scholar";
  const hermit=scene==="misty-hermit";
  const path=river
    ?"M-55 570 L-55 442 Q50 418 117 425 Q205 448 282 428 Q335 411 398 424 Q497 448 536 500 L650 560 Z"
    :hermit
      ?"M-55 570 L-40 500 Q84 436 214 438 Q320 428 422 416 Q522 407 615 424 L800 570 Z"
      :"M-50 566 Q102 530 220 498 Q327 467 423 430 Q488 403 560 409 L626 443 Q520 458 449 488 Q312 510 245 555 Z";
  return <g data-km-shanshui-ground="">
    <path d={path} fill="#d8bea0" fillOpacity=".61" stroke="#9d8160" strokeOpacity=".45"
      strokeWidth="2"/>
    <path d={path} fill="url(#km-shan-path-wash)" opacity=".34"/>
    {Array.from({length:Math.round(52*detail)},(_,i)=>{
      const x=20+780*s(seed,i*11+400),y=river?428+105*s(seed,i*7+402):
        hermit?426+100*s(seed,i*7+402):438+112*s(seed,i*7+402);
      const w=7+28*s(seed,i*9+409),h=2+5*s(seed,i*5+408);
      return <path key={i}
        d={"M"+f(x-w/2)+" "+f(y)+" q"+f(w*.53)+" "+
          f(-h)+" "+f(w)+" "+f(.8)+" l"+f(-w*.17)+" "+f(h*.6)}
        stroke="#917355" strokeWidth={i%6===0?1.5:.75}
        fill="none" opacity={.15+.4*s(seed,i*5+18)}/>;
    })}
  </g>;
}
function Rock({x,y,w,h,seed,detail}:{
  x:number;y:number;w:number;h:number;seed:number;detail:number;
}){
  const rock="M"+f(x-w*.52)+" "+f(y)+" L"+f(x-w*.34)+" "+f(y-h*.47)+
    " Q"+f(x-w*.22)+" "+f(y-h*.98)+" "+f(x)+" "+f(y-h*.85)+
    " L"+f(x+w*.17)+" "+f(y-h*.97)+" L"+f(x+w*.40)+" "+
    f(y-h*.5)+" L"+f(x+w*.55)+" "+f(y)+" Z";
  return <g data-km-shanshui-rock="">
    <path d={rock} fill="#b8a083" opacity=".56" stroke="#5d4937" strokeWidth="2"/>
    <path d={"M"+f(x-w*.31)+" "+f(y-h*.39)+" Q"+f(x-w*.2)+
      " "+f(y-h*.8)+" "+f(x)+" "+f(y-h*.83)+
      " Q"+f(x-w*.12)+" "+f(y-h*.49)+" "+f(x+w*.1)+" "+f(y-h*.08)}
      fill="none" stroke="#665240" strokeWidth="3.4" opacity=".48"/>
    <path d={"M"+f(x+w*.12)+" "+f(y-h*.87)+" Q"+
      f(x+w*.31)+" "+f(y-h*.47)+" "+f(x+w*.41)+" "+f(y)}
      fill="none" stroke="#ddc29f" strokeWidth={w*.11} opacity=".35"/>
    {Array.from({length:Math.round(14*detail)},(_,i)=>{
      const xx=x-w*.32+s(seed,i*5+19)*w*.68;
      const yy=y-h*.7+s(seed,i*3+7)*h*.6;
      return <path key={i} d={"M"+f(xx)+" "+f(yy)+" l"+
        f((s(seed,i+67)-.5)*12)+" "+f(7+s(seed,i+37)*14)}
        fill="none" stroke={INK} strokeWidth={.55+1.3*s(seed,i*6)}
        opacity={.12+.38*s(seed,i*13)}/>;
    })}
    {Array.from({length:Math.round(19*detail)},(_,i)=>{
      const xx=x+w*(s(seed,i*3+97)-.5)*.96,yy=y-h*s(seed,i*7+47)*.15;
      return <ellipse key={i} cx={f(xx)} cy={f(yy)} rx={.8+s(seed,i)*2}
        ry={.6+s(seed,i+10)*1.3} fill={i%4===0?INK:STONE}
        opacity={.3+s(seed,i*7)*.35}/>;
    })}
  </g>;
}
function Grass({x,y,seed,scale=1}:{x:number;y:number;seed:number;scale?:number}){
  return <g transform={"translate("+x+" "+y+") scale("+scale+")"} stroke="#6c573f"
    fill="none" strokeLinecap="round">
    {Array.from({length:11},(_,i)=>{
      const a=(i-5)*.35,reach=15+26*s(seed,i*13+5);
      return <path key={i} d={"M0 0 Q"+f(Math.sin(a)*reach*.5)+" "+
        f(-reach*.78)+" "+f(Math.sin(a)*reach)+" "+f(-reach)}
        strokeWidth={.64+s(seed,i*5)*.6} opacity={.37+.38*s(seed,i*21)}/>;
    })}
  </g>;
}
function Foreground({scene,seed,detail,wind}:{scene:ShanshuiScene;seed:number;detail:number;wind:number}){
  if(scene==="river-scholar")return <g data-km-shanshui-foreground="">
    <Rock x={15} y={540} w={175} h={98} seed={seed+91} detail={detail}/>
    <Rock x={899} y={544} w={151} h={83} seed={seed+47} detail={detail}/>
    <Grass x={360} y={521} seed={seed} scale={1.1}/>
    <Grass x={746} y={510} seed={seed+3}/>
    <Bamboo x={968} y={510} scale={.55} seed={seed+79} detail={detail} wind={wind}/>
  </g>;
  if(scene==="misty-hermit")return <g data-km-shanshui-foreground="">
    <Rock x={23} y={557} w={171} h={96} seed={seed} detail={detail}/>
    <Rock x={873} y={548} w={184} h={83} seed={seed+8} detail={detail}/>
    <OldPine x={36} y={507} scale={1.06} seed={seed+47} detail={detail} wind={wind}/>
    <Bamboo x={939} y={538} scale={1.07} seed={seed+55} detail={detail} wind={wind}/>
    <Grass x={344} y={510} seed={seed} scale={.8}/>
  </g>;
  return <g data-km-shanshui-foreground="">
    <Rock x={76} y={568} w={218} h={168} seed={seed+7} detail={detail}/>
    <Rock x={885} y={567} w={205} h={162} seed={seed+13} detail={detail}/>
    <OldPine x={28} y={522} scale={1.22} seed={seed+9} detail={detail} wind={wind}/>
    <Bamboo x={951} y={535} scale={.9} seed={seed+10} detail={detail} wind={wind}/>
    <Grass x={366} y={522} seed={seed+10}/>
    <Grass x={758} y={499} seed={seed+35} scale={1.17}/>
  </g>;
}
export interface InkShanshuiStageProps {
  frame:number;
  controls?:ShanshuiControls;
  reducedMotion?:boolean;
  /** Native CharacterPresenter acting layer, between landscape and foreground. */
  children?:ReactNode;
}
export function InkShanshuiStage({frame,controls={
  scene:"mountain-trail",seed:71,detail:.9,mist:.67,wind:.32,ink:.73,
},reducedMotion=false,children}:InkShanshuiStageProps){
  assertShanshuiControls(controls);
  const at=shanshuiAt(controls,frame,reducedMotion);
  const rawId=useId().replace(/[^a-z0-9_-]/gi,"");
  const ids=useMemo(()=>({
    far:"kmshan"+rawId+"far",mid:"kmshan"+rawId+"mid",
    near:"kmshan"+rawId+"near",grain:"kmshan"+rawId+"grain",
    paper:"kmshan"+rawId+"paper",mist:"kmshan"+rawId+"mist",
  }),[rawId]);
  const river=controls.scene==="river-scholar";
  const seed=controls.seed;
  // Center-anchored slow camera push; leaf motion, scholar walking and water
  // remain stage-space deterministic rather than incremented per RAF tick.
  const zoom=at.cameraZoom;
  const transform="translate("+f(480*(1-zoom)+at.cameraX)+" "+
    f(270*(1-zoom)+at.cameraY)+") scale("+f(zoom)+")";
  const washOpacity=clamp((frame+13)/63,0,1);
  return <div role="group" aria-label={"Animated Chinese ink landscape: "+controls.scene}
    data-km-shanshui-scene={controls.scene}
    data-km-shanshui-frame={frame}
    style={{position:"relative",width:W,height:H,overflow:"hidden",
      background:PAPER,isolation:"isolate"}}>
    <svg width={W} height={H} viewBox="0 0 960 540"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
      style={{position:"absolute",inset:0,width:W,height:H,display:"block"}}>
      <defs>
        <linearGradient id={ids.far} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9b8267" stopOpacity=".5"/>
          <stop offset=".45" stopColor="#c5aa85" stopOpacity=".38"/>
          <stop offset="1" stopColor="#f6e9d0" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id={ids.mid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8c7256" stopOpacity=".69"/>
          <stop offset=".44" stopColor="#ae9071" stopOpacity=".45"/>
          <stop offset="1" stopColor="#f7e9d2" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id={ids.near} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#806447" stopOpacity=".65"/>
          <stop offset=".48" stopColor="#a99070" stopOpacity=".45"/>
          <stop offset="1" stopColor="#f7e9d2" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id={ids.paper} x1="0" y1="0" x2=".12" y2="1">
          <stop offset="0" stopColor="#fbf1df"/>
          <stop offset=".55" stopColor="#f5e8d2"/>
          <stop offset="1" stopColor="#ede0c6"/>
        </linearGradient>
        <filter id={ids.grain} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency=".35" numOctaves="3" seed={seed%999+1}/>
          <feColorMatrix type="saturate" values="0"/>
          <feComponentTransfer><feFuncA type="linear" slope=".17"/></feComponentTransfer>
        </filter>
        <filter id={ids.mist} x="-40%" y="-80%" width="180%" height="260%">
          <feGaussianBlur stdDeviation="28"/>
        </filter>
        <linearGradient id="km-shan-path-wash" x1="0" y1="0" x2=".6" y2="1">
          <stop offset="0" stopColor="#b29371" stopOpacity=".15"/>
          <stop offset="1" stopColor="#8f7055" stopOpacity=".7"/>
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={"url(#"+ids.paper+")"}/>
      <g data-km-shanshui-world="" transform={transform}>
        <g opacity={f(washOpacity)}>
          <Mountains scene={controls.scene} seed={seed} detail={controls.detail}
            mist={controls.mist} ink={controls.ink} ids={ids}/>
          <Clouds shift={at.cloudX}/>
          <Birds motion={at}/>
          {controls.scene==="mountain-trail"&&<>
            <path d="M364 314 Q373 348 354 378 Q345 402 335 432
              M378 320 Q387 361 370 390 Q363 418 354 437"
              stroke="#f8f0dd" strokeWidth="7.5" strokeLinecap="round" opacity=".84" fill="none"/>
            <path d="M364 319 Q371 348 358 370 M377 325 Q383 365 367 384"
              fill="none" stroke="#b7a48a" strokeWidth=".9" opacity=".55"/>
          </>}
          {river&&<>
            <Water seed={seed} phase={at.waterPhase} detail={controls.detail}/>
            <StoneBridge/>
            <Pavilion x={806} y={316} scale={.96}/>
          </>}
          {!river&&<Pavilion x={controls.scene==="misty-hermit"?419:290}
            y={controls.scene==="misty-hermit"?235:284}
            scale={controls.scene==="misty-hermit"?.47:.65}/>}
          {river&&<Willow seed={seed+47} detail={controls.detail} wind={at.breeze}/>}
          <g data-km-shanshui-mist=""
            transform={"translate("+f(at.mistX)+" 0)"}
            opacity={f(controls.mist)}>
            <ellipse cx="395" cy={river?288:293} rx="315" ry="46" fill="#fff8e9"
              filter={"url(#"+ids.mist+")"} opacity=".82"/>
            <ellipse cx="720" cy={river?341:337} rx="325" ry="41" fill="#fff6e4"
              filter={"url(#"+ids.mist+")"} opacity=".72"/>
          </g>
          <RockyPath seed={seed} detail={controls.detail} scene={controls.scene}/>
        </g>
        <foreignObject x={0} y={0} width={W} height={H}
          style={{overflow:"visible"}}>
          <div style={{width:W,height:H,position:"relative",pointerEvents:"none"}}>
            {children}
          </div>
        </foreignObject>
        <Foreground scene={controls.scene} seed={seed} detail={controls.detail}
          wind={at.breeze}/>
      </g>
      <rect width={W} height={H} filter={"url(#"+ids.grain+")"} opacity=".42"
        style={{mixBlendMode:"multiply",pointerEvents:"none"}}/>
    </svg>
  </div>;
}
