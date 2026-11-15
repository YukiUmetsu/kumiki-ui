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
const quadraticPoint=(a:P,b:P,c:P,t:number):P=>{
  const u=1-t;
  return [u*u*a[0]+2*u*t*b[0]+t*t*c[0],
    u*u*a[1]+2*u*t*b[1]+t*t*c[1]];
};
const cubicPoint=(a:P,b:P,c:P,d:P,t:number):P=>{
  const u=1-t;
  return [
    u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0],
    u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1],
  ];
};
/** Curved rock profiles have local fracture variation and non-regular slope
 * transitions, unlike polygons that look like paper triangles. The silhouette
 * is stable for a seed and its exact x stations are also used by cunfa strokes.
 */
/** Construct one fractured mountain silhouette. The exact same stations are
 * used for the filled contour, cliff brush roots, and moss deposits. Linear
 * interpolation over only the teacher nodes put some strokes into empty sky.
 */
const ridgeStations=(nodes:readonly P[],seed:number,band:number):P[]=>{
  const stations:P[]=[[f(nodes[0][0]),f(nodes[0][1])]];
  for(let i=0;i<nodes.length-1;i++){
    const a=nodes[Math.max(i-1,0)][1],b=nodes[i][1],
      c=nodes[i+1][1],d=nodes[Math.min(i+2,nodes.length-1)][1];
    const x0=nodes[i][0],x1=nodes[i+1][0];
    for(let k=1;k<=9;k++){
      const t=k/9,t2=t*t,t3=t2*t;
      const smooth=.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+
        (-a+3*b-3*c+d)*t3);
      const shapeNoise=(shanshuiHash(seed+band*113,i*17+k)-.5)*2;
      const fracture=(band===0?2.5:band===1?4.5:6.2)*
        Math.sin(Math.PI*t)*shapeNoise;
      stations.push([f(x0+(x1-x0)*t),f(smooth+fracture)]);
    }
  }
  return stations;
};
const ridgePath=(stations:readonly P[])=>
  stations.map(([x,y],i)=>(i?"L ":"M ")+x+" "+y).join(" ")+
  " L 1080 550 L -110 550 Z";
const ridgeHeight=(stations:readonly P[],x:number)=>{
  if(x<=stations[0][0])return stations[0][1];
  for(let i=0;i<stations.length-1;i++){
    const [x0,y0]=stations[i],[x1,y1]=stations[i+1];
    if(x<=x1)return y0+(y1-y0)*(x-x0)/(x1-x0);
  }
  return stations[stations.length-1][1];
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
/** Long, ridge-rooted hemp-fibre families with small alum-head rock
 * shelves. Huang Gongwang's contours accumulate in linked geological
 * groups; independent random raindrops would make the cliff look wet.
 *
 * Unlike the paper tint/gradient, every mark is rooted to the SAME
 * fractured ridge geometry as the outer silhouette. */
function RockInkPlanes({stations,seed,band,detail,mist}:{
  stations:readonly P[];seed:number;band:number;detail:number;mist:number;
}){
  const anchors=band===0?[116,255,564,755,890]:[82,247,345,532,711,857];
  const count=Math.round((band===0?7:band===1?12:17)*detail);
  return <g data-km-rock-plane-family={band}>
    {Array.from({length:count},(_,i)=>{
      const x=anchors[i%anchors.length]+
        (s(seed+band*491,i*17+41)-.5)*(band===0?48:74);
      const crest=ridgeHeight(stations,x);
      const rootY=crest+3.5+4*s(seed+91,i*11+band);
      const slope=clamp((ridgeHeight(stations,x+24)-
        ridgeHeight(stations,x-24))/48,-1.6,1.6);
      const length=(band===0?28:band===1?47:67)*
        (.72+.43*s(seed+317,i*11+9));
      const drift=clamp(slope*length*.5+
        (s(seed+409,i*7+band)-.5)*length*.22,
        -length*.49,length*.49);
      const inkWidth=(band===0?3.4:band===1?5.8:8.3)*
        (.62+.72*s(seed+503,i*23+1));
      const flex=(s(seed+521,i*29+17)-.5)*inkWidth*1.5;
      const opacity=(band===0?.19:band===1?.29:.37)*
        (1-.28*mist)*(.75+.35*s(seed+571,i*11+7));
      const vx=x+drift;
      const top="M"+f(x)+" "+f(rootY);
      // A soft, pressure-loaded shadow plane retreats to a narrow tail.
      const plane=top+
        " C"+f(x+flex*.31)+" "+f(rootY+length*.21)+
        " "+f(x+drift*.45-inkWidth*.35)+" "+f(rootY+length*.43)+
        " "+f(vx)+" "+f(rootY+length*.9)+
        " C"+f(x+drift*.58+inkWidth*.65)+" "+f(rootY+length*.63)+
        " "+f(x+flex+inkWidth)+" "+f(rootY+length*.23)+
        " "+f(x+inkWidth*.28)+" "+f(rootY+2.3)+" Z";
      // Dry lifted lines are interrupted; an uninterrupted long band
      // would instead read as computer-generated vertical rainfall.
      const fibre=top+
        " C"+f(x-inkWidth*.65)+" "+f(rootY+length*.17)+
        " "+f(x+drift*.38+flex*.3)+" "+f(rootY+length*.29)+
        " "+f(x+drift*.44)+" "+f(rootY+length*.45)+
        " M"+f(x+drift*.59+1.7)+" "+f(rootY+length*.57)+
        " Q"+f(vx+3)+" "+f(rootY+length*.72)+
        " "+f(vx)+" "+f(rootY+length*.88);
      const shelf="M"+f(x-inkWidth*.95)+" "+f(rootY+5)+
        " Q"+f(x+inkWidth*.44)+" "+f(rootY-4.5)+
        " "+f(x+inkWidth*1.55)+" "+f(rootY+2)+
        " Q"+f(x+inkWidth*.75)+" "+f(rootY+8)+
        " "+f(x+inkWidth*.23)+" "+f(rootY+9);
      return <g key={i} data-km-rock-ink-plane=""
        data-km-rock-plane-root={f(x)+","+f(rootY)}
        data-km-rock-plane-crest={f(crest)}
        data-km-rock-plane-style={i%3===0?"alum-head":"hemp-fibre"}>
        <path d={plane} fill={band===0?"#806c58":"#5b4837"}
          opacity={f(opacity)}/>
        <path d={fibre} fill="none"
          stroke={i%4===0?"#4b392d":"#796149"}
          strokeWidth={f(.63+1.18*s(seed+597,i*19))}
          strokeLinecap="round" opacity={f(.42+.31*s(seed+607,i*7))}/>
        <path d={shelf} fill="none"
          stroke="#5a4838" strokeWidth={f(.6+.6*s(seed+617,i*5))}
          opacity={f(opacity*1.6)} strokeLinecap="round"/>
        {/* Small non-uniform crest moss pockets grow where rock shelves
            catch moisture; their location derives from this same root. */}
        {band>0&&Array.from({length:i%3===0?5:3},(_,j)=>{
          const dx=(j-2)*2.1+1.6*(s(seed+641,i*17+j)-.5);
          const dy=5.4+(j%2)*1.3+s(seed+659,i*19+j)*3;
          return <ellipse key={j} data-km-rock-moss-pocket=""
            cx={f(x+dx)} cy={f(rootY+dy)}
            rx={f(.57+1.25*s(seed+673,i*23+j))}
            ry={f(.38+.75*s(seed+691,i*29+j))}
            fill="#493f30" opacity={f((.33+.28*s(seed+709,i*31+j))*(1-.23*mist))}/>;
        })}
      </g>;
    })}
  </g>;
}
function Mountains({scene,seed,detail,mist,ink,ids}:{
  scene:ShanshuiScene;seed:number;detail:number;mist:number;ink:number;
  ids:{far:string;mid:string;near:string;grain:string};
}){
  return <g data-km-shanshui-mountains="">
    {RIDGES[scene].map((ridge,band)=>{
      const width=band===0?1.1:band===1?1.3:1.8;
      const stations=ridgeStations(ridge,seed,band);
      const count=Math.round((band===0?27:band===1?48:67)*detail);
      return <g key={band} data-km-shanshui-ridge={band}
        opacity={(band===0?.32:band===1?.65:.86)*ink}>
        <path data-km-shanshui-ridge-contour={band} d={ridgePath(stations)}
          fill={"url(#"+([ids.far,ids.mid,ids.near][band])+")"}
          stroke={band===2?"#765e48":"#ac9070"} strokeWidth={band===2?1.05:.55}/>
        <RockInkPlanes stations={stations} seed={seed+band*181} band={band}
          detail={detail} mist={mist}/>
        {/* Reference-led rock painting: cluster different brush pressures
            over local geology. Leave quiet paper between texture families,
            rather than repeating parallel grooves across all the mountains. */}
        {Array.from({length:count},(_,i)=>{
          const centers=band===0?[80,250,570,740,900]:[70,210,350,560,720,890];
          const pocket=i%centers.length;
          const x=centers[pocket]+
            (s(seed+band*1201,i*13+3)-.5)*80+
            (s(seed+band*79,pocket*3+11)-.5)*12;
          const crest=ridgeHeight(stations,x);
          const y=crest+5+11*s(seed+5,i*19+band);
          const slope=(ridgeHeight(stations,x+14)-ridgeHeight(stations,x-14))/28;
          const rawLength=(band===0?27:band===1?53:77)*
            (.32+.73*s(seed+19,i*7+band));
          const short=i%4===1||i%5===0;
          const length=rawLength*(short?.52:1);
          const dx=clamp(slope*length*.54+
            (s(seed+29,i*5+band)-.5)*length*.3,
            -length*.56,length*.56);
          const opacity=(.27+.55*s(seed+8,i*11+band))*(1-.38*mist);
          const axe=band>0&&Math.abs(slope)>.5&&
            s(seed+band*47,i*13+19)>.29;
          const style=axe?"side-axe":short?"short-hemp":"long-hemp";
          const side=(slope>=0?1:-1)*(4+4*s(seed+9,i*5+27));
          const cut=length*.67;
          const d=axe
            ?"M"+f(x)+" "+f(y)+
              " Q"+f(x+side*.2)+" "+f(y+cut*.05)+
              " "+f(x+dx*.52+side)+" "+f(y+cut*.23)+
              " L"+f(x+dx*.52+side*1.08)+" "+f(y+cut*.31)+
              " Q"+f(x+side*.68)+" "+f(y+cut*.24)+
              " "+f(x+side*.11)+" "+f(y+cut*.57)+
              " Q"+f(x-side*.25)+" "+f(y+cut*.34)+
              " "+f(x)+" "+f(y)+" Z"
            :short
            ?"M"+f(x)+" "+f(y)+
              " Q"+f(x+dx*.15+2)+" "+f(y+length*.3)+
              " "+f(x+dx*.48)+" "+f(y+length*.53)+
              " M"+f(x+dx*.59)+" "+f(y+length*.64)+
              " Q"+f(x+dx*.74-2)+" "+f(y+length*.85)+
              " "+f(x+dx)+" "+f(y+length)
            :"M"+f(x)+" "+f(y)+
              " C"+f(x+dx*.11-2)+" "+f(y+length*.22)+
              " "+f(x+dx*.44+3)+" "+f(y+length*.35)+
              " "+f(x+dx*.52)+" "+f(y+length*.57)+
              " S"+f(x+dx*.82-3)+" "+f(y+length*.87)+
              " "+f(x+dx)+" "+f(y+length);
          const lift="M"+f(x+dx*.22+1)+" "+f(y+length*.27)+
            " Q"+f(x+dx*.52+1.5)+" "+f(y+length*.46)+
            " "+f(x+dx*.75)+" "+f(y+length*.7);
          return <g key={i} data-km-shanshui-cunfa="">
            <path data-km-cunfa-kind={axe?"axe":"hemp"}
              data-km-cunfa-style={style}
              data-km-cunfa-crest-y={f(crest)} data-km-cunfa-root-y={f(y)}
              data-km-cunfa-root-x={f(x)} d={d}
              fill={axe?INK:"none"} stroke={axe?"none":band===2?INK:STONE}
              strokeWidth={f(width*(.49+s(seed+11,i+band)*.7))}
              strokeLinecap="round" opacity={f(opacity*(axe?.77:1))}/>
            {i%3===0&&<path data-km-cunfa-dry-brush=""
              d={lift} fill="none" stroke="#e0cbb0"
              strokeWidth={f(.3+width*.28)} opacity={f(opacity*.44)}/>}
          </g>;
        })}
        {/* Dragon-vein structure: selected true crest high points produce
            descending fractured rock spines, not free-floating random rain. */}
        {ridge.slice(1,-1).flatMap(([rx,ry],i)=>{
          if(ry>=ridge[i][1]||ry>=ridge[i+2][1]||detail===0)return [];
          const crest=ridgeHeight(stations,rx);
          const rootY=crest+6;
          const len=(band===0?25:band===1?43:56)*
            (.8+.31*s(seed+band*31,i*15+19));
          const drift=(s(seed+band*7,i*11+37)-.5)*len*.68;
          const lateral=(s(seed+band*19,i*7+41)-.5)*len*.28;
          // Three short pressure marks with real paper gaps. A single long
          // line read like leaking paint rather than a fractured cliff.
          const d="M"+f(rx)+" "+f(rootY)+
            " Q"+f(rx+lateral*.12)+" "+f(rootY+len*.12)+
            " "+f(rx+lateral*.45)+" "+f(rootY+len*.23)+
            " M"+f(rx+lateral*.55+1.7)+" "+f(rootY+len*.35)+
            " Q"+f(rx+lateral+drift*.26)+" "+f(rootY+len*.47)+
            " "+f(rx+lateral+drift*.46)+" "+f(rootY+len*.59)+
            " M"+f(rx+lateral+drift*.58+1.2)+" "+f(rootY+len*.73)+
            " Q"+f(rx+lateral+drift*.82)+" "+f(rootY+len*.82)+
            " "+f(rx+lateral+drift)+" "+f(rootY+len*.92);
          return [<g key={"spine-"+i}>
            <path data-km-rock-spine="" data-km-rock-spine-root-y={f(crest)}
              d={d} fill="none"
              stroke={band===0?"#685b4c":INK}
              strokeWidth={band===0?.72:band===1?.96:1.22}
              strokeLinecap="round"
              opacity={f((band===0?.32:.54)*(1-.35*mist))}/>
            <path d={"M"+f(rx+lateral*.5+3)+" "+f(rootY+len*.35)+
              " Q"+f(rx+drift*.26+3)+" "+f(rootY+len*.45)+
              " "+f(rx+drift*.3+3)+" "+f(rootY+len*.52)}
              fill="none" stroke="#d1bb96" strokeWidth=".64"
              opacity=".28"/>
          </g>];
        })}
        {/* Moss dots cling to the actual crest rather than being random screen confetti. */}
        {Array.from({length:Math.round((band===2?52:22)*detail)},(_,i)=>{
          const centers=band===0?[80,250,570,740,900]:[70,210,350,560,720,890];
          const pocket=i%centers.length;
          const x=centers[pocket]+
            (s(seed+band*31,i*3+97)-.5)*89;
          const y=ridgeHeight(stations,x)+3+10*s(seed+band*51,i+119);
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
  // Parent every hanging frond to a point ON an authored bough. Earlier
  // random x/y samples left leaf sprays disconnected from the main tree.
  const arches:readonly {from:P;control:P;to:P}[]=[
    {from:[27,-228],control:[140,-328],to:[326,-329]},
    {from:[36,-254],control:[151,-364],to:[393,-332]},
    {from:[58,-298],control:[187,-303],to:[379,-284]},
    {from:[78,-319],control:[205,-370],to:[352,-357]},
    {from:[17,-213],control:[99,-276],to:[243,-252]},
    {from:[40,-248],control:[138,-286],to:[302,-291]},
  ];
  const strands=Math.round(39*detail);
  return <g data-km-shanshui-willow="" transform="translate(25 433)">
    <path d="M-16 10 Q10 -43 18 -112 Q24 -172 35 -237 Q54 -281 97 -315 Q133 -333 168 -347
      Q108 -335 63 -314 Q20 -289 7 -238 Q-9 -161 -26 -94 Q-31 -38 -25 10 Z"
      fill="#7e654a" stroke={INK} strokeWidth="2.2"/>
    <path d="M-10 -3 Q6 -116 26 -217 Q39 -295 115 -332 M1 -91 Q23 -159 30 -223"
      fill="none" stroke="#dfc89f" strokeWidth="5" opacity=".45"/>
    {arches.map((branch,i)=>{
      // A flexible, shrinking ink ribbon: the primary branch retains a
      // loaded root and releases to a hairline, unlike uniform-width bars.
      const steps=14;
      const sides:[P[],P[]]=[[],[]];
      for(let k=0;k<=steps;k++){
        const t=k/steps;
        const center=quadraticPoint(branch.from,branch.control,branch.to,t);
        const tx=2*(1-t)*(branch.control[0]-branch.from[0])+
          2*t*(branch.to[0]-branch.control[0]);
        const ty=2*(1-t)*(branch.control[1]-branch.from[1])+
          2*t*(branch.to[1]-branch.control[1]);
        const norm=Math.max(1e-6,Math.hypot(tx,ty));
        const pressure=(1.48+.19*(i%3))*Math.pow(1-t,.86)+.07;
        const nx=-ty/norm*pressure,ny=tx/norm*pressure;
        sides[0].push([f(center[0]+nx),f(center[1]+ny)]);
        sides[1].push([f(center[0]-nx),f(center[1]-ny)]);
      }
      const points=[...sides[0],...sides[1].reverse()];
      const d=points.map((v,j)=>(j?" L":"M")+f(v[0])+" "+f(v[1])).join("")+" Z";
      return <g key={i}>
        <path data-km-willow-tapered-branch="" d={d}
          fill="#71573e" opacity=".72"/>
        <path d={"M"+branch.from.join(" ")+" Q"+
          branch.control.join(" ")+" "+branch.to.join(" ")}
          stroke="#af9069" strokeWidth=".45" opacity=".39" fill="none"/>
      </g>;
    })}
    <path d="M31 -233 Q137 -320 322 -325 M41 -252 Q152 -352 387 -331
      M62 -294 Q197 -298 367 -280"
      stroke="#c0a180" strokeWidth=".69" fill="none" opacity=".38"/>
    {Array.from({length:strands},(_,i)=>{
      const branch=arches[i%arches.length];
      const u=.13+.83*s(seed,i*7+9);
      // Exactly one insertion point on the original parent arch.
      const origin=quadraticPoint(branch.from,branch.control,branch.to,u);
      const fall=80+148*s(seed,i*11+20);
      // A willow droops: the top of the frond bows outward, but its
      // lower half returns to a nearly vertical fall. The previous
      // 60 px lateral sweep made a diagonal mesh across the sky.
      const sweep=i%3===0?-1:i%3===1?1:
        s(seed+401,i*7+19)>.5?1:-1;
      const drift=sweep*(7+20*s(seed+427,i*13+11));
      const end:P=[origin[0]+drift+wind*8,
        origin[1]+fall*(1+.012*wind)];
      const control:P=[
        end[0]+sweep*(13+16*s(seed+439,i*17+37))-wind*3,
        origin[1]+fall*(.31+.11*s(seed+457,i*23+13)),
      ];
      const frondPoint=(t:number)=>quadraticPoint(origin,control,end,t);
      const stationCount=11;
      const upper:P[]=[],lower:P[]=[];
      for(let k=0;k<stationCount;k++){
        const t=k/(stationCount-1);
        const point=frondPoint(t);
        const before=frondPoint(Math.max(0,t-.012));
        const after=frondPoint(Math.min(1,t+.012));
        const dx=after[0]-before[0],dy=after[1]-before[1];
        const len=Math.hypot(dx,dy)||1;
        const pressure=(.72+.37*s(seed+467,i*5+29))*
          Math.pow(1-t,.91)+.045;
        const nx=-dy/len*pressure,ny=dx/len*pressure;
        upper.push([point[0]+nx,point[1]+ny]);
        lower.push([point[0]-nx,point[1]-ny]);
      }
      const ribbon="M"+upper.map(([x,y])=>f(x)+" "+f(y)).join(" L")+
        " L"+lower.reverse().map(([x,y])=>f(x)+" "+f(y)).join(" L")+" Z";
      // A few source-informed bare silk strands preserve visible paper,
      // while restrained leaves hang from the *same* painted centerline.
      const leafCount=i%9===0?0:5+Math.floor(3*s(seed,i*5+2));
      return <g key={i} data-km-willow-frond=""
        data-km-willow-frond-root={f(origin[0])+","+f(origin[1])}
        data-km-willow-frond-tip={f(end[0])+","+f(end[1])}
        data-km-willow-frond-drift={f(end[0]-origin[0])}
        data-km-willow-frond-leaves={leafCount}>
        <path data-km-willow-pressure-strand="" d={ribbon}
          fill={i%7===0?"#554535":"#897158"}
          opacity={f(.33+.18*s(seed+479,i*17+7))}/>
        {i%4===0&&<path data-km-willow-dry-release=""
          d={"M"+f(origin[0])+" "+f(origin[1])+
            " Q"+f(control[0])+" "+f(control[1])+
            " "+f(end[0])+" "+f(end[1])}
          stroke="#b8a081" strokeWidth=".35" opacity=".35"
          fill="none" strokeLinecap="round"/>}
        {Array.from({length:leafCount},(_,j)=>{
          const t=clamp((j+.75+
            .42*(s(seed+491,i*31+j*9)-.5))/(leafCount+1),.05,.94);
          const [x,y]=frondPoint(t);
          const after=frondPoint(Math.min(1,t+.025));
          const vx=after[0]-x,vy=after[1]-y;
          const len=Math.hypot(vx,vy)||1;
          const tx=vx/len,ty=vy/len,nx=-ty,ny=tx;
          const side=s(seed+509,i*43+j*19)>.47?1:-1;
          const reach=5+6.5*s(seed+521,i*13+j*11);
          const width=.52+1.4*s(seed+547,i*29+j);
          const tipX=x+nx*side*reach*.78+tx*reach*.32;
          const tipY=y+ny*side*reach*.78+ty*reach*.32;
          const leaf="M"+f(x)+" "+f(y)+
            " C"+f(x+nx*side*reach*.2-tx*width)+" "+
                f(y+ny*side*reach*.2-ty*width)+
            " "+f(tipX-nx*side*reach*.22-tx*.5)+" "+
                f(tipY-ny*side*reach*.22-ty*.5)+
            " "+f(tipX)+" "+f(tipY)+
            " C"+f(tipX-nx*side*reach*.32+tx*width*.25)+" "+
                f(tipY-ny*side*reach*.32+ty*width*.25)+
            " "+f(x+nx*side*reach*.12+tx*width)+" "+
                f(y+ny*side*reach*.12+ty*width)+
            " "+f(x)+" "+f(y)+" Z";
          return <path key={j} data-km-willow-leaf=""
            d={leaf} fill={j%5===0?"#a88c69":"#635342"}
            opacity={f(.29+.33*s(seed+563,i*11+j*5))}/>;
        })}
      </g>;
    })}
    {Array.from({length:31},(_,i)=>{
      const yy=-21-i*8,xx=-14+15*Math.sin(i*.25);
      return <path key={i} data-km-willow-bark=""
        d={"M"+f(xx)+" "+f(yy)+" q"+f(8+s(seed,i)*10)+" -17 "+f(17+s(seed,i+2)*18)+" -18"}
        fill="none" stroke={i%3===0?"#382a22":"#bd9b71"} strokeWidth={i%3===0?1.7:1}
        opacity={.5+s(seed,i+2)*.35}/>;
    })}
  </g>;
}
/** Source-study motif: old pine branchlets terminate in separate radial,
 * pressure-loaded needle rosettes, not one flat comb-shaped canopy. Every
 * visible twig roots in the parent branch point and needle root meets a twig.
 * Keep all brush deposition seek-stable and preserve paper between clusters.
 */
/** A pine tuft is a damp ink mass punctuated by scores of individually
 * tapering dry needles. Short compact fans and deliberate gaps prevent the
 * large 'firework spikes on a ruler' appearance of the previous rendering.
 */
function NeedleSpray({x,y,scale,seed,wind,lean=0}:{
  x:number;y:number;scale:number;seed:number;wind:number;lean?:number;
}){
  // Layered hanging / ascending / sideward needles form rhythmic
  // brush families, not three copies of the same radial firework.
  const sprigs=[
    {dx:-18,dy:-8,tilt:-.6},
    {dx:-1,dy:-14,tilt:.03},
    {dx:16,dy:-3,tilt:.73},
  ];
  return <g data-km-pine-spray=""
    transform={"rotate("+f(wind*.85)+" "+f(x)+" "+f(y)+")"}>
    {sprigs.map((sprig,j)=>{
      const offset=(s(seed+67,j*5)-.5)*4*scale;
      const tx=x+(sprig.dx+offset)*scale;
      const ty=y+sprig.dy*scale+(s(seed,j*17)-.5)*3*scale;
      const count=17+Math.floor(10*s(seed+17,j*11+1));
      // Wen Zhengming's needle bouquets cross at different pitches rather
      // than rising as identical vertical fireworks along horizontal limbs.
      const fanTurn=lean+sprig.tilt+
        (s(seed+149,j*41+3)-.5)*.49;
      const fanSpread=.37+.24*s(seed+233,j*29+1);
      const wet:string[]=[],dry:string[]=[],middle:string[]=[];
      for(let k=0;k<count;k++){
        // Needle trajectories do not belong to a regular polar stencil.
        // Some close into overlapping dark bundles, others expose open
        // paper sectors; all still grow from the same botanical twig.
        const radial=(k-(count-1)*.5)/((count-1)*.5);
        const crowd=(s(seed+1207,j*89+k*13)-.5)*.19;
        const spread=clamp(radial+crowd-.075*radial*radial,-1.04,1.04);
        const angle=-Math.PI/2+spread*fanSpread+fanTurn;
        const len=(7.5+9*s(seed+j*73,k*17+7))*scale*
          (1-.26*Math.abs(spread))*(.86+.28*s(seed+397,j*31+k));
        const rx=tx+spread*2.1*scale;
        const ry=ty+.7*scale*s(seed+j*13,k+17);
        const ex=rx+Math.cos(angle)*len;
        const ey=ry+Math.sin(angle)*len;
        const nx=-(ey-ry)/len,ny=(ex-rx)/len;
        const width=(.27+.52*s(seed+j*31,k*19+3))*scale;
        const d="M"+f(rx)+" "+f(ry)+
          " Q"+f(rx+(ex-rx)*.32+nx*width)+" "+
          f(ry+(ey-ry)*.32+ny*width)+
          " "+f(ex)+" "+f(ey)+
          " Q"+f(rx+(ex-rx)*.29-nx*width*.4)+" "+
          f(ry+(ey-ry)*.29-ny*width*.4)+
          " "+f(rx)+" "+f(ry)+" Z";
        (k%7===0?dry:k%4===0?middle:wet).push(d);
      }
      const twig="M"+f(x)+" "+f(y)+
        " Q"+f((x+tx)*.5)+" "+f((y+ty)*.5-2*scale)+
        " "+f(tx)+" "+f(ty);
      const spreadX=(10+4*s(seed+j*13,31))*scale;
      const spreadY=(3+3*s(seed+j*17,39))*scale;
      return <g key={j} data-km-pine-needle-cluster=""
        data-km-pine-needles={count}
        data-km-pine-twig-root={f(x)+","+f(y)}
        data-km-pine-fan-turn={f(fanTurn)}>
        <path d={twig} stroke="#6a5339"
          strokeWidth={f(1.05*scale)} fill="none" strokeLinecap="round"/>
        {/* Capillary ink underwash must never replace the needles' tips. */}
        <path data-km-pine-foliage-wash=""
          d={"M"+f(tx-spreadX)+" "+f(ty+1.5*scale)+
            " Q"+f(tx)+" "+f(ty-spreadY*.7)+
            " "+f(tx+spreadX)+" "+f(ty+1.6*scale)}
          fill="none" stroke="#665840"
          strokeWidth={f(1.4*scale)}
          opacity={f(.24+.10*s(seed+j*29,47))}/>
        <path d={wet.join(" ")} fill="#332c23" opacity=".86"/>
        <path d={middle.join(" ")} fill="#675741" opacity=".78"/>
        <path d={dry.join(" ")} fill="#a18b6a" opacity=".52"/>
        {Array.from({length:3},(_,k)=>{
          const startX=tx+(k-1)*6*scale;
          const toX=startX+(s(seed+j*29,k*17+31)-.5)*7*scale;
          const upperY=ty-4*scale-(k%2)*3*scale;
          return <path key={k} data-km-pine-feather=""
            d={"M"+f(startX)+" "+f(ty+2*scale)+
              " Q"+f(startX-2*scale)+" "+f(upperY)+
              " "+f(toX)+" "+f(upperY-3*scale)}
            fill="none" stroke={k===0?"#b9a485":"#6c5942"}
            strokeWidth={f((.37+.19*k)*scale)}
            opacity={f(.25+.09*s(seed+j*37,k*9+49))}/>;
        })}
        <path data-km-pine-foliage-wash=""
          d={"M"+f(tx-spreadX*.72)+" "+f(ty+2*scale)+
            " Q"+f(tx)+" "+f(ty-spreadY*.55)+
            " "+f(tx+spreadX*.55)+" "+f(ty+1.5*scale)}
          fill="none" stroke="#7d6a50" strokeWidth={f(1.6*scale)}
          opacity=".36"/>
      </g>;
    })}
  </g>;
}
function OldPine({x,y,scale,wind,seed,detail}:{
  x:number;y:number;scale:number;wind:number;seed:number;detail:number;
}){
  // Asymmetric branch endpoints and tip-heavy clustered needles emulate
  // old-pine brush canopies rather than regularly spaced horizontal shelves.
  // Authored branch crooks, not eight Bézier shelves. The first
  // deflection goes against (or across) the eventual tip direction.
  // Wen Zhengming paints wood that turns under load before continuing.
  const stems=[
    {y:-95, dir:-1,len:98, tipDy:39, firstDy:-22,secondDy:27},
    {y:-133,dir:1, len:132,tipDy:28, firstDy:-31,secondDy:-8},
    {y:-166,dir:1, len:92, tipDy:-44,firstDy:18, secondDy:-56},
    {y:-192,dir:-1,len:154,tipDy:-32,firstDy:-17,secondDy:-65},
    {y:-225,dir:-1,len:105,tipDy:25, firstDy:20, secondDy:-14},
    {y:-245,dir:1, len:108,tipDy:-24,firstDy:-36,secondDy:-48},
    {y:-270,dir:-1,len:80, tipDy:-37,firstDy:11, secondDy:-49},
    {y:-285,dir:1, len:63, tipDy:-20,firstDy:-36,secondDy:-4},
  ];
  // A shared trunk construction map also anchors the bark and bough roots.
  // Do not interpolate branches from unrelated arbitrary horizontal shelves.
  const trunkX=(y:number)=>{
    const t=clamp(-y/299,0,1);
    return -8+19*t+27*t*t+4*Math.sin(t*Math.PI*2);
  };
  return <g data-km-shanshui-pine="" transform={"translate("+x+" "+y+") scale("+scale+")"}>
    <path d="M-19 2 C-21 -37 7 -59 2 -94 C-14 -121 15 -144 8 -175
      C-7 -207 32 -229 23 -251 C16 -276 27 -289 38 -299
      L44 -295 C35 -264 45 -248 32 -228 C22 -202 18 -184 20 -169
      C25 -134 7 -116 15 -93 C21 -60 -5 -32 -1 4 Z"
      fill="#68513a" stroke="#3f3024" strokeWidth="2.1"/>
    <path d="M-11 -2 Q-15 -60 10 -93 Q-3 -133 17 -180
      Q35 -233 34 -271 M3 -25 Q-2 -77 12 -115 M6 -140 Q-4 -170 23 -207"
      stroke="#bd9870" strokeWidth="3.3" opacity=".55" fill="none"/>
    {Array.from({length:42},(_,i)=>{
      const cy=-6-i*6.65+(s(seed+1169,i*11)-.5)*4;
      const x0=trunkX(cy)+(s(seed+3,i*23)-.5)*10;
      const side=i%2===0?1:-1;
      const dx=side*(3+6*s(seed+11,i*9));
      const dy=7+10*s(seed+17,i*7);
      return <g key={i} data-km-pine-bark-grain={i%4}>
        <path data-km-pine-bark=""
          d={"M"+f(x0)+" "+f(cy)+
            " Q"+f(x0+dx*.62)+" "+f(cy-dy*.54)+
            " "+f(x0+dx*.35)+" "+f(cy-dy)}
          stroke={i%5===0?"#35291e":"#b49471"}
          strokeWidth={f(i%5===0?1.55:.65)}
          opacity={f(.38+.4*s(seed,i))}
          strokeLinecap="round" fill="none"/>
        {detail>.58&&i%3===1&&
          <path data-km-pine-bark-fissure=""
            d={"M"+f(x0+dx*.14)+" "+f(cy-dy*.23)+
              " q"+f(dx*.33)+" "+f(-dy*.19)+
              " "+f(dx*.21)+" "+f(-dy*.39)+
              " m"+f(-dx*.05)+" "+f(-dy*.17)+
              " l"+f(-dx*.27)+" "+f(-dy*.23)}
            stroke="#e2c6a0" strokeWidth=".55" strokeLinecap="round"
            opacity=".38" fill="none"/>}
      </g>;
    })}
    {stems.map((b,i)=>{
      const reach=b.len*b.dir;
      const root:P=[trunkX(b.y),b.y];
      const tip:P=[root[0]+reach,b.y+b.tipDy];
      const knots:readonly P[]=[
        root,
        [root[0]+reach*.255,b.y+b.firstDy],
        [root[0]+reach*.63,b.y+b.secondDy],
        tip,
      ];
      // A connected Catmull–Rom-like ink skeleton *passes through*
      // the authored crooks but rounds the wood, rather than joining
      // angled strips with sharp artificial corners.
      const handles=knots.slice(0,-1).map((p,k)=>{
        const q=knots[k+1];
        const before=knots[Math.max(0,k-1)];
        const after=knots[Math.min(3,k+2)];
        const a:P=[
          p[0]+(q[0]-before[0])*.17,
          p[1]+(q[1]-before[1])*.17,
        ];
        const b:P=[
          q[0]-(after[0]-p[0])*.17,
          q[1]-(after[1]-p[1])*.17,
        ];
        return [a,b] as const;
      });
      const boughPoint=(t:number):P=>{
        const u=clamp(t,0,1);
        const index=Math.min(2,Math.floor(u*3));
        const [a,b]=handles[index];
        return cubicPoint(knots[index],a,b,knots[index+1],
          index===2&&u===1?1:u*3-index);
      };
      const pointText=(p:P)=>f(p[0])+" "+f(p[1]);
      const spineCurve="M"+pointText(root)+
        handles.map(([a,b],k)=>" C"+pointText(a)+" "+pointText(b)+
          " "+pointText(knots[k+1])).join("");
      // Subpixel curve sampling gives one smooth, pressure-tapered
      // silhouette with local unevenness. No pointy quad joints.
      const stationCount=37;
      const upper:P[]=[],lower:P[]=[];
      for(let k=0;k<stationCount;k++){
        const u=k/(stationCount-1);
        const p=boughPoint(u);
        const before=boughPoint(Math.max(0,u-.006));
        const after=boughPoint(Math.min(1,u+.006));
        const dx=after[0]-before[0],dy=after[1]-before[1];
        const len=Math.hypot(dx,dy)||1;
        const width=(3.7*Math.pow(1-u,.68)+.14)*
          (1+.075*Math.sin(6.5*Math.PI*u+i*.7));
        const nx=-dy/len,ny=dx/len;
        upper.push([p[0]+nx*width,p[1]+ny*width]);
        lower.push([p[0]-nx*width,p[1]-ny*width]);
      }
      const bone="M"+upper.map(pointText).join(" L")+
        " L"+lower.reverse().map(pointText).join(" L")+" Z";
      const inner=spineCurve;
      const count=Math.round((3+(i%3))*detail);
      return <g key={i} data-km-pine-bough=""
        data-km-pine-bough-root={f(root[0])+","+f(root[1])}
        data-km-pine-bough-tip={f(tip[0])+","+f(tip[1])}>
        {/* A pressure-tapered, smoothly curved multi-elbow ink bone.
            Sampled contour normals avoid sharp folded wooden strips.
            All young stems, fissures
            and needles inherit this same changing centerline. */}
        <path data-km-pine-bough-shape="" d={bone}
          data-km-pine-bough-stations={stationCount}
          fill="#594733" opacity=".91" stroke="#3e3228"
          strokeWidth=".42" strokeLinejoin="round"/>
        <path data-km-pine-bough-light="" d={inner}
          stroke="#d0b18c" strokeWidth=".82" fill="none"
          strokeLinecap="round" opacity=".59"/>
        {knots.slice(1,3).map((p,k)=>
          <path key={k} data-km-pine-elbow={pointText(p)}
            d={"M"+pointText(p)+" q"+f((k===0?-1:1)*2.1)+
              " "+f((i%2===0?-1:1)*3.2)+
              " "+f((k===0?1:-1)*3.4)+" "+f((i%2===0?-1:1)*4.6)}
            stroke="#382d23" strokeWidth="1.05" opacity=".65"
            strokeLinecap="round" fill="none"/>
        )}
        {/* The exposed heartwood is alternately dark/soft and chipped:
            fractal noise is NOT a replacement for contour-following bark. */}
        {Array.from({length:Math.round(detail*9)},(_,k)=>{
          const u=.095+.83*(k+.35)/(9+.2);
          const at=boughPoint(u);
          const after=boughPoint(Math.min(u+.055,.995));
          const tangentX=after[0]-at[0],tangentY=after[1]-at[1];
          const len=Math.hypot(tangentX,tangentY)||1;
          const tx=tangentX/len,ty=tangentY/len;
          const side=(k%3===0?-1:1);
          const off=side*(.65+1.2*s(seed+1103,i*19+k));
          const x0=at[0]-ty*off,y0=at[1]+tx*off;
          const reach=3.2+7.1*s(seed+1117,i*31+k*7);
          const d="M"+f(x0)+" "+f(y0)+
            " Q"+f(x0+tx*reach*.48-ty*side*1.1)+" "+
                f(y0+ty*reach*.48+tx*side*1.1)+
            " "+f(x0+tx*reach)+" "+f(y0+ty*reach);
          return <path key={k} data-km-pine-bough-bark=""
            data-km-pine-bough-bark-root={f(at[0])+","+f(at[1])}
            d={d} fill="none" stroke={k%4===0?"#3d3026":"#ddbd96"}
            strokeWidth={f(.44+.72*s(seed+1139,i*17+k))}
            strokeLinecap="round" opacity={f(.35+.3*s(seed+1151,i*41+k))}/>;
        })}

        {/* A gnarled pine divides into independent secondary limbs whose
            roots are exact points ON the primary cubic, not random
            canopy stickers. Each fork carries its own old-wood ink bone. */}
        {Array.from({length:3},(_,k)=>{
          const u=.22+.235*k+.035*(s(seed+911,i*37+k)-.5);
          const rootFork=boughPoint(u);
          const flip=(k===1?-1:1)*(s(seed+929,i*13+k)>.55?-1:1);
          const branchLen=(27+27*s(seed+947,i*17+k))*(k===2?.8:1);
          const dx=reach>=0?branchLen*.47:-branchLen*.47;
          const q1:P=[rootFork[0]+dx*.47-flip*7,
            rootFork[1]-flip*(branchLen*.22)];
          const q2:P=[rootFork[0]+dx+flip*branchLen*.26,
            rootFork[1]-flip*branchLen*(.56+.16*s(seed+967,i*11+k))];
          const half=(2.1+.8*s(seed+981,i*23+k))*(1-.13*k);
          const inkBone="M"+f(rootFork[0])+" "+f(rootFork[1]-half)+
            " Q"+f(q1[0])+" "+f(q1[1]-half*.65)+
            " "+f(q2[0])+" "+f(q2[1])+
            " Q"+f(q1[0]+half*.6)+" "+f(q1[1]+half*.9)+
            " "+f(rootFork[0])+" "+f(rootFork[1]+half)+" Z";
          const veil="M"+f(rootFork[0]+.7)+" "+f(rootFork[1]-half*.52)+
            " Q"+f(q1[0])+" "+f(q1[1]-half*.42)+
            " "+f(q2[0])+" "+f(q2[1]);
          return <g key={k} data-km-pine-lateral=""
            data-km-pine-lateral-root={f(rootFork[0])+","+f(rootFork[1])}
            data-km-pine-lateral-parent-pt={f(rootFork[0])+","+f(rootFork[1])}
            data-km-pine-lateral-side={flip}>
            <path data-km-pine-lateral-bone="" d={inkBone}
              fill="#5b4935" opacity={f(.82-.08*k)}/>
            <path data-km-pine-lateral-lift="" d={veil}
              stroke="#e0c59f" strokeWidth={f(.48+.11*k)}
              fill="none" opacity=".5" strokeLinecap="round"/>
            <path data-km-pine-lateral-crotch=""
              d={"M"+f(rootFork[0]-3)+" "+f(rootFork[1]+1)+
                " q"+f(dx*.17)+" "+f(-flip*8)+
                " "+f(dx*.29)+" "+f(-flip*10)}
              fill="none" stroke="#392e25" strokeWidth="1.05" opacity=".64"/>
            {Array.from({length:Math.round(detail)},(_,j)=>{
              const t=.85;
              const twig=quadraticPoint(rootFork,q1,q2,t);
              return <NeedleSpray key={j}
                x={f(twig[0])} y={f(twig[1])}
                scale={f(.35+.28*s(seed+997,i*29+k*7+j))}
                lean={f(flip*.25+.23*(s(seed+1013,i*31+k*5+j)-.5))}
                wind={wind} seed={seed+1031+i*149+k*31+j*17}/>;
            })}
          </g>;
        })}
        {Array.from({length:count},(_,j)=>{
          const u=clamp(.43+.54*(j+.35)/(count+.25)+
            .1*(s(seed+307,i*53+j*13)-.5),.34,.98);
          const point=boughPoint(u);
          return <NeedleSpray key={j}
            x={f(point[0])} y={f(point[1])}
            scale={.58+(.62*s(seed,i*21+j))} wind={wind}
            lean={f((b.dir<0?-.19:.21)+.52*(s(seed+313,i*23+j*7)-.5))}
            seed={seed+i*41+j*71}/>;
        })}
      </g>;
    })}
    {detail>0&&<>
      <NeedleSpray x={39} y={-296} scale={.92} seed={seed+9} wind={wind}/>
      <NeedleSpray x={19} y={-263} scale={1.1} seed={seed+61} wind={wind}/>
    </>}
  </g>;
}
/** One calligraphic wrist pull drives both pigment boundary and dry-bristle
 * skips. The small secondary turn prevents perfectly mirrored SVG lozenges.
 * Reference: Wu Zhen, Manual of Ink Bamboo (NPM, 1350), album leaves 12/20.
 */
function bambooStrokeOffset(t:number,length:number,seed:number){
  const bow=(s(seed,17)-.5)*length*.22;
  const wrist=(s(seed,19)-.5)*length*.075;
  return bow*Math.sin(Math.PI*t)+wrist*Math.sin(2*Math.PI*t);
}
/** Pressure-loaded ink *gesture*, not a filled arrow template.
 * One-sided width, delayed brush contact and families of press/lift timing
 * separate a stalk-attached broad leaf from a quick light twig gesture.
 * Fifteen pressure knots are smoothly interpolated on both fibre edges.
 */
function bambooBrushBlade(root:P,tip:P,width:number,seed:number){
  const dx=tip[0]-root[0],dy=tip[1]-root[1];
  const length=Math.max(.01,Math.hypot(dx,dy));
  const nx=-dy/length,ny=dx/length;
  const stations=[0,.045,.09,.15,.23,.32,.42,.52,.62,.70,.78,.84,.90,.95,1] as const;
  const pressure=([
    [0,.14,.44,.82,1,.99,.91,.75,.57,.43,.31,.23,.14,.06,0],
    [0,.04,.12,.31,.59,.85,1,.95,.80,.66,.49,.35,.19,.07,0],
    [0,.19,.48,.76,.89,1,.92,.79,.69,.48,.29,.18,.09,.04,0],
  ] as const)[Math.abs(seed)%3];
  const dominant=.84+.26*s(seed,47);
  const recessive=.33+.31*s(seed,31);
  const makeSide=(side:1|-1)=>stations.map((t,k):P=>{
    // Edge grain follows brush load; none of it jumps independently in X/Y.
    const scratch=k===0||k===14?0:
      (s(seed+71,k*23+(side===1?3:17))-.5)*.085*
      Math.sin(Math.PI*t);
    const loaded=Math.max(0,pressure[k]+scratch);
    const turn=bambooStrokeOffset(t,length,seed);
    const shift=turn+side*width*loaded*(side===1?dominant:recessive);
    return [root[0]+dx*t+nx*shift,root[1]+dy*t+ny*shift];
  });
  const outline=[...makeSide(1),...makeSide(-1).slice(1,-1).reverse()];
  const path=["M"+f(root[0])+" "+f(root[1])];
  // Smooth local tangents preserve the pressured edge without angular
  // polygon vertices or uniform Bézier taper. Both ends return to the axis.
  for(let k=0;k<outline.length;k++){
    const p0=outline[(k-1+outline.length)%outline.length];
    const p1=outline[k],p2=outline[(k+1)%outline.length];
    const p3=outline[(k+2)%outline.length];
    const c1:P=[p1[0]+(p2[0]-p0[0])*.13,
      p1[1]+(p2[1]-p0[1])*.13];
    const c2:P=[p2[0]-(p3[0]-p1[0])*.13,
      p2[1]-(p3[1]-p1[1])*.13];
    path.push("C"+f(c1[0])+" "+f(c1[1])+
      " "+f(c2[0])+" "+f(c2[1])+
      " "+f(p2[0])+" "+f(p2[1]));
  }
  return path.join(" ")+" Z";
}
/** Fei-bai (flying-white): paper reserves are cut *out* of the deposited
 * ink, not bright highlight stickers painted over an opaque dark leaf.
 * Every short split travels on the exact same loaded calligraphic centerline.
 */
function bambooDryBristles(root:P,tip:P,width:number,seed:number){
  const dx=tip[0]-root[0],dy=tip[1]-root[1];
  const length=Math.max(.01,Math.hypot(dx,dy));
  const nx=-dy/length,ny=dx/length;
  const point=(t:number,offset:number):P=>{
    const belly=Math.sin(Math.PI*t);
    const shift=bambooStrokeOffset(t,length,seed)+width*offset*belly;
    return [root[0]+dx*t+nx*shift,root[1]+dy*t+ny*shift];
  };
  return Array.from({length:3},(_,i)=>{
    const start=.21+.29*s(seed+191,i*31+5);
    const finish=Math.min(.91,start+.14+.19*s(seed+193,i*17+11));
    const offset=(i-1)*.17+.08*(s(seed+197,i*23)-.5);
    const a=point(start,offset),mid=point((start+finish)*.5,
      offset+.04*(s(seed+199,i*17)-.5)),b=point(finish,offset);
    return {
      d:"M"+f(a[0])+" "+f(a[1])+" Q"+f(mid[0])+" "+f(mid[1])+
        " "+f(b[0])+" "+f(b[1]),
      width:f(.29+.28*s(seed+211,i*19)),
    };
  });
}
/** Bamboo is a calligraphic plant, not uniform fence-post lines. The
 * centerline of each tapered culm also supplies the positions of its branch
 * nodes; each broad leaf begins on its own painted branching centerline.
 */
function Bamboo({x,y,scale,wind,seed,detail,ink,materialId}:{
  x:number;y:number;scale:number;wind:number;seed:number;detail:number;
  ink:number;materialId:string;
}){
  const id="kmbamboo"+useId().replace(/[^a-z0-9_-]/gi,"");
  // Gongbi bamboo paintings place branches at visible culm joints. Sharing
  // node samples between collars and twigs prevents floating leaf clusters.
  return <g data-km-shanshui-bamboo=""
    data-km-bamboo-ink-load={f(ink)}
    filter={"url(#"+materialId+")"}
    opacity={f(.48+.52*ink)}
    transform={"translate("+x+" "+y+") scale("+scale+")"}>
    {[-32,0,25].map((x0,i)=>{
      // Nonparallel bamboo columns: one strong black stalk and two quieter
      // ink companions receding on either side, after Zheng Xie's groves.
      const h=[317,391,356][i],tipX=[-84,-7,64][i];
      const from:P=[x0,0],tip:P=[tipX,-h];
      const control:P=[x0+(tipX-x0)*.19,-h*.52];
      const half=[3.25,4.15,2.9][i];
      const culm="M"+f(x0-half)+" 1 Q"+f(control[0]-half)+" "+
        f(control[1])+" "+f(tipX)+" "+f(-h)+
        " Q"+f(control[0]+half)+" "+f(control[1])+
        " "+f(x0+half)+" 1 Z";
      // Each collar belongs to the same curved culm, but natural internodes
      // are not seven identical evenly-spaced ruler marks.
      const nodes=Array.from({length:7},(_,j)=>
        quadraticPoint(from,control,tip,clamp((j+1)/8+
          (s(seed+193,i*43+j*17)-.5)*.026,.05,.96)));
      return <g key={i} data-km-shanshui-bamboo-stem={i}>
        <path d={culm} fill={["#917b64","#5c4839","#a38b6c"][i]}
          stroke={i===1?"#3e332a":"#65513f"}
          strokeWidth={i===1?.82:.63} opacity={i===1?.96:.83}/>
        <path d={"M"+f(x0-.75)+" 0 Q"+f(control[0]-.75)+" "+
          f(control[1])+" "+f(tipX-.6)+" "+f(-h+12)}
          stroke="#dfc29b" strokeWidth={i===1?.9:.67}
          fill="none" opacity={i===1?.45:.29}/>
        {nodes.map(([cx,cy],j)=>{
          // Sparse, asymmetric calligraphic fans, not alternating rulers.
          const fan=s(seed+211,i*37+j*5)>.47?1:-1;
          const reach=(28+45*s(seed+239,i*17+j*13))*fan;
          const lift=14+25*s(seed+101,i*9+j);
          const base:P=[cx,cy];
          const turn:P=[cx+reach*(.29+.08*s(seed+231,i*23+j)),
            cy-lift*.56];
          const end:P=[cx+reach,cy-lift];
          const branchControl:P=[turn[0]-fan*.8,turn[1]-.9];
          const branch="M"+f(cx-.95)+" "+f(cy+.4)+
            " Q"+f(branchControl[0])+" "+f(branchControl[1])+
            " "+f(end[0])+" "+f(end[1])+
            " Q"+f(turn[0]+fan*.55)+" "+f(turn[1]+.85)+
            " "+f(cx+1.05)+" "+f(cy+1.35)+" Z";
          // Zheng Xie's bamboo distinguishes the principal branch from
          // little lateral shoots. Both child shoots start on the exact
          // painted parent curve; their leaves must use those curves too.
          const spurs=([.59,.78] as const).map((at,k)=>{
            const root=quadraticPoint(base,branchControl,end,at);
            const side=fan*(k===0?-1:1);
            const reach=9+12*s(seed+1021,i*53+j*19+k*7);
            const tip:P=[root[0]+side*reach,
              root[1]-(9+13*s(seed+1051,i*71+j*13+k*11))];
            const bend:P=[root[0]+side*reach*.37,
              root[1]-(7+5*s(seed+1061,i*19+j*37+k*3))];
            return {root,bend,tip};
          });
          // Wu Zhen's bamboo has unequal masses and long silent internodes.
          // Author a rhythmic motif rather than cloning five stars at every
          // one of 21 nodes. The same composition scales deterministically
          // with the public detail control.
          const clusterBudget=[
            [0,3,8,1,10,2,10],
            [10,0,3,10,1,8,2],
            [2,10,1,8,0,10,3],
          ][i][j];
          const visibleLeaves=Math.round(detail*clusterBudget);
          const visibleSpurs=visibleLeaves>4?2:visibleLeaves>1?1:0;
          return <g key={j} data-km-bamboo-branch-root={f(cx)+","+f(cy)}
            data-km-bamboo-cluster-budget={clusterBudget}
            transform={"rotate("+f(wind*.6)+" "+f(cx)+" "+f(cy)+")"}>
            {visibleLeaves>0&&<path data-km-bamboo-pressure-twig="" d={branch}
              fill="#685541" opacity=".87"/>}
            {spurs.slice(0,visibleSpurs).map((spur,k)=>{
              const root=spur.root,bend=spur.bend,tip=spur.tip;
              const side=k===0?-fan:fan;
              const d="M"+f(root[0]-side*.47)+" "+f(root[1]+.35)+
                " Q"+f(bend[0]-side*.31)+" "+f(bend[1]+.35)+
                " "+f(tip[0])+" "+f(tip[1])+
                " Q"+f(bend[0]+side*.37)+" "+f(bend[1]-.35)+
                " "+f(root[0]+side*.47)+" "+f(root[1]-.35)+" Z";
              return <path key={k} data-km-bamboo-secondary-shoot=""
                data-km-bamboo-secondary-root={f(root[0])+","+f(root[1])}
                d={d} fill={k===0?"#62513e":"#514438"}
                opacity={k===0?.78:.65}/>;
            })}
            {Array.from({length:visibleLeaves},(_,k)=>{
              const motif=k%5,layer=Math.floor(k/5);
              const spurIndex=motif===1?0:motif===4?1:-1;
              const origin=spurIndex<0
                ?{root:base,bend:branchControl,tip:end}
                :spurs[spurIndex];
              // Wu Zhen's bamboo resolves into terminal brush groups:
              // most leaves emerge from the outer branch section, not
              // evenly-spaced hooks along the entire bare bough.
              // Group three main strokes around the same terminal twig,
              // while both attached lateral spurs retain their own growth
              // direction. A wide stagger previously made each blade read
              // as an isolated spear instead of a single botanical spray.
              const along=spurIndex<0?[.75,0,.82,.89,0][motif]
                :motif===1?.72:.82;
              const t=clamp(along-layer*.075+
                (s(seed+71,i*43+j*11+k)-.5)*.06,.12,.96);
              const [bx,by]=quadraticPoint(origin.root,origin.bend,
                origin.tip,t);
              // Leaf direction is tied to the actual branch tangent.
              // Independent screen-space arrows caused comb-like foliage.
              const tangent:P=[
                2*(1-t)*(origin.bend[0]-origin.root[0])+
                  2*t*(origin.tip[0]-origin.bend[0]),
                2*(1-t)*(origin.bend[1]-origin.root[1])+
                  2*t*(origin.tip[1]-origin.bend[1]),
              ];
              const branchAngle=Math.atan2(tangent[1],tangent[0]);
              // Wu Zhen's loaded leaves overlap at their bases. The five
              // gesture families are an *alternating* fan (long/short,
              // open/closed), rather than five equally sized rays.
              const fanAngles=[-.69,-.95,.36,.83,-.43];
              const direction=branchAngle+fanAngles[motif]*(fan>0?1:-1)+
                (layer===0?0:-.095*fan)+
                // Individual brush wrists diverge slightly within one
                // common twig fan, avoiding identical ray headings.
                (s(seed+1081,i*29+j*17+k)-.5)*.52;
              const familyLength=[1.12,.81,1.06,.7,.79][motif];
              const len=(24+17*s(seed,i*50+j*9+k))*familyLength*
                (layer===1?.84:1);
              const leafTipX=bx+Math.cos(direction)*len;
              const leafTipY=by+Math.sin(direction)*len;
              const wide=(2.15+4.4*s(seed+11,k+i*13+j))*
                (motif===0?1.12:motif===3?.83:1);
              // Orient the brush belly to the blade tangent, not paper Y.
              // Secondary tip releases grow from the same parent wood,
              // but their size and pitch vary rather than forming mirror pairs.
              const blade=bambooBrushBlade([bx,by],[leafTipX,leafTipY],
                wide,seed+i*1009+j*41+k*17);
              // Leaf cluster resolves at a common live twig tip,
              // not at arbitrary positions distributed across empty space.
              const echo=detail>.62&&motif%2===0;
              const echoT=clamp(t+
                (s(seed+1321,i*59+j*11+k)-.5)*.078,.12,.96);
              const echoRoot=quadraticPoint(origin.root,origin.bend,
                origin.tip,echoT);
              const echoLen=len*(.59+.2*s(seed+1351,i*71+j*17+k));
              const echoAngle=direction+
                (motif===0?.33:motif===2?-.31:.25)*fan+
                (s(seed+1397,i*13+j*29+k)-.5)*.19;
              const echoTip:P=[echoRoot[0]+Math.cos(echoAngle)*echoLen,
                echoRoot[1]+Math.sin(echoAngle)*echoLen];
              const satellite=bambooBrushBlade(echoRoot,echoTip,
                wide*(.59+.19*s(seed+1381,i*17+j*11+k)),
                seed+1409+i*31+j*23+k*37);
              const bristles=detail>.6?bambooDryBristles(
                [bx,by],[leafTipX,leafTipY],wide,
                seed+i*1009+j*41+k*17):[];
              const echoBristles=echo&&detail>.85?bambooDryBristles(
                echoRoot,echoTip,wide*.65,
                seed+1409+i*31+j*23+k*37):[];
              const dilute=k%5===0||j%5===0;
              const leafId=id+"-"+i+"-"+j+"-"+k;
              const reserve=leafId+"-reserve",pigment=leafId+"-ink";
              const echoReserve=leafId+"-echo-reserve";
              const echoPigment=leafId+"-echo-ink";
              const margin=wide*3.3+2;
              const bx0=Math.min(bx,leafTipX)-margin,
                by0=Math.min(by,leafTipY)-margin;
              const bw=Math.abs(leafTipX-bx)+margin*2,
                bh=Math.abs(leafTipY-by)+margin*2;
              const ex0=Math.min(echoRoot[0],echoTip[0])-margin,
                ey0=Math.min(echoRoot[1],echoTip[1])-margin;
              const ew=Math.abs(echoTip[0]-echoRoot[0])+margin*2,
                eh=Math.abs(echoTip[1]-echoRoot[1])+margin*2;
              return <g key={k}>
                <defs>
                  <linearGradient id={pigment} gradientUnits="userSpaceOnUse"
                    x1={f(bx)} y1={f(by)} x2={f(leafTipX)} y2={f(leafTipY)}>
                    <stop offset="0" stopColor={dilute?"#655c4e":"#272a23"}/>
                    <stop offset=".19" stopColor={dilute?"#736857":"#20251f"}/>
                    <stop offset=".54" stopColor={dilute?"#907b66":"#2c3028"}/>
                    <stop offset=".83" stopColor={dilute?"#a59075":"#515043"}/>
                    <stop offset="1" stopColor={dilute?"#baa78d":"#706a58"}/>
                  </linearGradient>
                  {bristles.length>0&&<mask id={reserve}
                    maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse"
                    x={f(bx0)} y={f(by0)} width={f(bw)} height={f(bh)}
                    style={{maskType:"luminance"}}>
                    <path d={blade} fill="#fff"/>
                    {bristles.map((bristle,b)=><path key={b}
                      data-km-bamboo-internal-bristle="" d={bristle.d}
                      stroke="#000" strokeWidth={bristle.width}
                      strokeLinecap="round" fill="none"/>)}
                  </mask>}
                  {echo&&<linearGradient id={echoPigment}
                    gradientUnits="userSpaceOnUse" x1={f(echoRoot[0])}
                    y1={f(echoRoot[1])} x2={f(echoTip[0])}
                    y2={f(echoTip[1])}>
                    <stop offset="0" stopColor="#544a3b"/>
                    <stop offset=".46" stopColor="#84725d"/>
                    <stop offset="1" stopColor="#aa9174"/>
                  </linearGradient>}
                  {echoBristles.length>0&&<mask id={echoReserve}
                    maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse"
                    x={f(ex0)} y={f(ey0)} width={f(ew)} height={f(eh)}
                    style={{maskType:"luminance"}}>
                    <path d={satellite} fill="#fff"/>
                    {echoBristles.map((bristle,b)=><path key={b}
                      data-km-bamboo-satellite-bristle="" d={bristle.d}
                      stroke="#000" strokeWidth={bristle.width}
                      strokeLinecap="round" fill="none"/>)}
                  </mask>}
                </defs>
                <path data-km-shanshui-bamboo-leaf="" d={blade}
                  data-km-bamboo-leaf-root={f(bx)+","+f(by)}
                  data-km-bamboo-leaf-parent={spurIndex<0?"main":"spur-"+spurIndex}
                  data-km-bamboo-leaf-heading={f(direction)}
                  data-km-bamboo-leaf-station={f(t)}
                  data-km-bamboo-leaf-cluster={i+"-"+j}
                  fill={"url(#"+pigment+")"}
                  mask={bristles.length>0?"url(#"+reserve+")":undefined}
                  opacity={f((dilute?.76:.88)+
                    .1*s(seed,k+i*31+j*7))}/>
                {echo&&<path data-km-bamboo-satellite-leaf=""
                  data-km-bamboo-satellite-root={f(echoRoot[0])+","+f(echoRoot[1])}
                  d={satellite} data-km-bamboo-satellite-heading={f(echoAngle)}
                  data-km-bamboo-satellite-station={f(echoT)}
                  data-km-bamboo-satellite-cluster={i+"-"+j}
                  fill={"url(#"+echoPigment+")"}
                  mask={echoBristles.length>0?"url(#"+echoReserve+")":undefined}
                  opacity={f(.67+.15*s(seed+1459,i*13+j*7+k))}/>}
                {detail>.77&&(motif===1||motif===3)&&
                  <path data-km-bamboo-dry-lift=""
                    d={"M"+f(bx+(leafTipX-bx)*.2)+" "+
                      f(by+(leafTipY-by)*.2)+
                      " Q"+f(bx+(leafTipX-bx)*.42)+" "+
                      f(by+(leafTipY-by)*.45)+
                      " "+f(bx+(leafTipX-bx)*.68)+" "+
                      f(by+(leafTipY-by)*.69)}
                    stroke="#d6c09b" strokeWidth=".36" opacity=".42"
                    fill="none" strokeLinecap="round"/>}
              </g>;
            })}
          </g>;
        })}
        {/* The collar and all branch roots share exact sampled joint centres. */}
        {nodes.map(([nx,ny],j)=>{
          const t=clamp((j+1)/8+
            (s(seed+193,i*43+j*17)-.5)*.026,.05,.96);
          const dx=2*(1-t)*(control[0]-from[0])+
            2*t*(tip[0]-control[0]);
          const dy=2*(1-t)*(control[1]-from[1])+
            2*t*(tip[1]-control[1]);
          const length=Math.max(1,Math.hypot(dx,dy));
          const normal:P=[-dy/length,dx/length];
          const radius=half*(1-t*.43);
          return <path key={j} data-km-bamboo-node={f(nx)+","+f(ny)}
            d={"M"+f(nx-normal[0]*radius)+" "+
              f(ny-normal[1]*radius)+
              " Q"+f(nx)+" "+f(ny-1.2)+
              " "+f(nx+normal[0]*radius)+" "+
              f(ny+normal[1]*radius)}
            stroke={j%3===0?"#3b3026":"#514132"}
            strokeWidth={f(.94+.4*s(seed+1209,i*31+j))}
            opacity={f(.59+.28*s(seed+1229,i*17+j))}
            fill="none" strokeLinecap="round"/>;
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
/** Ink-reserve waterfall against actual painted cliff banks.
 * The river is readable from negative space and interrupted dark edges,
 * not two unmoored opaque white tubes. The cascade keeps its root and pool
 * still, with only surface flicks varying by absolute film time.
 * Study: Ma Yuan's Scholar Viewing a Waterfall (Met 1973.120.9). */
function InkWaterfall({phase,detail}:{phase:number;detail:number}){
  const flick=f(.56*Math.sin(phase*1.3));
  return <g data-km-shanshui-waterfall="">
    {/* The cliff lip and two shadowed banks give the cascade an origin,
        rock contact, volume and an intelligible receiving pool. */}
    <path data-km-waterfall-bank="left"
      d="M349 308 Q357 303 363 314 Q357 335 354 356
        Q346 390 337 412 Q333 424 329 442
        L322 446 Q323 420 333 394 Q341 372 343 351
        Q342 325 349 308 Z"
      fill="#816e54" opacity=".34" stroke="#594b3c" strokeWidth="1.1"/>
    <path data-km-waterfall-bank="right"
      d="M377 311 Q387 315 389 329 Q393 350 378 383
        Q365 410 356 436 L351 446 Q357 405 367 377
        Q380 346 372 320 Z"
      fill="#62513e" opacity=".3" stroke="#5a4636" strokeWidth=".9"/>
    <path data-km-waterfall-shelf=""
      d="M345 310 Q356 303 363 306 Q369 308 376 308
        Q385 310 392 319 M347 319 Q356 316 359 318
        M378 322 Q382 329 381 339"
      fill="none" stroke="#65523e" strokeWidth="1.1"
      strokeLinecap="round" opacity=".62"/>
    {/* An uneven paper-reserve water body leaves the warm wash legible;
        narrow ink contours reveal speed without drawing white tubes. */}
    <path data-km-waterfall-reserve=""
      d="M361 314 C364 335 358 356 352 381
        C342 410 338 430 336 442
        Q344 440 349 441
        C352 419 361 398 367 377
        C376 350 381 331 376 317
        Q373 311 368 316 Q364 311 361 314 Z"
      fill="#f8eedc" fillOpacity=".82"/>
    <path data-km-waterfall-ribbon=""
      d="M364 321 Q369 339 362 361 T353 399
        Q346 416 343 432"
      fill="none" stroke="#b6a087" strokeWidth=".8"
      strokeLinecap="round" opacity=".7"/>
    <path data-km-waterfall-ribbon=""
      d="M376 326 Q377 347 370 364
        M367 376 Q361 399 354 414"
      fill="none" stroke="#8e755a" strokeWidth=".92"
      strokeLinecap="round" opacity=".55"/>
    <path data-km-waterfall-ribbon=""
      d="M357 341 Q356 366 348 384
        M349 395 Q343 414 339 425"
      fill="none" stroke="#ddd0b9" strokeWidth="1.45"
      strokeLinecap="round" opacity=".85"/>
    <path data-km-waterfall-pool=""
      d="M320 443 Q333 439 344 443 Q355 446 365 443
        M323 449 Q338 446 351 448 Q366 452 378 448
        M336 455 Q353 453 371 455"
      fill="none" stroke="#806b53" strokeWidth=".8"
      strokeLinecap="round" opacity=".57"/>
    {detail>.32&&Array.from({length:Math.round(detail*9)},(_,i)=>{
      const x=329+i*4.4;
      const y=438+1.8*Math.sin(i*1.7)+flick*(.38+i%2*.3);
      const dx=2.2+(i%3)*1.7;
      return <path key={i} data-km-waterfall-impact=""
        d={"M"+f(x)+" "+f(y)+
          " q"+f(-dx*.5)+" -"+f(3.2+i%4*1.7)+
          " "+f(-dx)+" "+f(-2.5-i%3)+
          " M"+f(x)+" "+f(y)+
          " q"+f(dx*.5)+" -"+f(2+i%4)+" "+f(dx)+" -1.5"}
        fill="none" stroke={i%3===0?"#75624e":"#b5a48c"}
        strokeWidth={f(.42+.12*(i%3))} opacity=".5"
        strokeLinecap="round"/>;
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
function RockyPath({seed,detail,scene,washId}:{seed:number;detail:number;scene:ShanshuiScene;washId:string}){
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
    <path d={path} fill={"url(#"+washId+")"} opacity=".34"/>
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
function Foreground({scene,seed,detail,wind,ink,materialId}:{scene:ShanshuiScene;seed:number;detail:number;wind:number;ink:number;materialId:string}){
  if(scene==="river-scholar")return <g data-km-shanshui-foreground="">
    <Rock x={15} y={540} w={175} h={98} seed={seed+91} detail={detail}/>
    <Rock x={899} y={544} w={151} h={83} seed={seed+47} detail={detail}/>
    <Grass x={360} y={521} seed={seed} scale={1.1}/>
    <Grass x={746} y={510} seed={seed+3}/>
    <Bamboo x={925} y={510} scale={.55} seed={seed+79} detail={detail} wind={wind} ink={ink} materialId={materialId}/>
  </g>;
  if(scene==="misty-hermit")return <g data-km-shanshui-foreground="">
    <Rock x={23} y={557} w={171} h={96} seed={seed} detail={detail}/>
    <Rock x={873} y={548} w={184} h={83} seed={seed+8} detail={detail}/>
    <OldPine x={74} y={522} scale={1.28} seed={seed+47} detail={detail} wind={wind}/>
    <Bamboo x={908} y={538} scale={1.07} seed={seed+55} detail={detail} wind={wind} ink={ink} materialId={materialId}/>
    <Grass x={344} y={510} seed={seed} scale={.8}/>
  </g>;
  return <g data-km-shanshui-foreground="">
    <Rock x={76} y={568} w={218} h={168} seed={seed+7} detail={detail}/>
    <Rock x={885} y={567} w={205} h={162} seed={seed+13} detail={detail}/>
    <OldPine x={65} y={540} scale={1.43} seed={seed+9} detail={detail} wind={wind}/>
    <Bamboo x={914} y={535} scale={.9} seed={seed+10} detail={detail} wind={wind} ink={ink} materialId={materialId}/>
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
    path:"kmshan"+rawId+"path",brush:"kmshan"+rawId+"brush",
  }),[rawId]);
  const river=controls.scene==="river-scholar";
  const seed=controls.seed;
  // Center-anchored slow camera push; leaf motion, scholar walking and water
  // remain stage-space deterministic rather than incremented per RAF tick.
  const zoom=at.cameraZoom;
  const transform="translate("+f(480*(1-zoom)+at.cameraX)+" "+
    f(270*(1-zoom)+at.cameraY)+") scale("+f(zoom)+")";
  // A static, reduced-motion frame shows the completed wash, not its reveal.
  const washOpacity=clamp((at.frame+13)/63,0,1);
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
        <filter id={ids.brush} x="-8%" y="-8%" width="116%" height="116%"
          colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency=".13" numOctaves="2"
            seed={seed%997+1} result="fibres"/>
          <feDisplacementMap in="SourceGraphic" in2="fibres" scale=".9"
            xChannelSelector="R" yChannelSelector="G" result="absorbed"/>
          <feGaussianBlur in="absorbed" stdDeviation=".42" result="fringe"/>
          <feComponentTransfer in="fringe" result="wick">
            <feFuncA type="linear" slope=".24"/>
          </feComponentTransfer>
          <feMerge><feMergeNode in="wick"/><feMergeNode in="absorbed"/></feMerge>
        </filter>
        <linearGradient id={ids.path} x1="0" y1="0" x2=".6" y2="1">
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
          {controls.scene==="mountain-trail"&&
            <InkWaterfall phase={at.waterPhase} detail={controls.detail}/>}
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
          <RockyPath seed={seed} detail={controls.detail} scene={controls.scene}
            washId={ids.path}/>
        </g>
        <foreignObject x={0} y={0} width={W} height={H}
          style={{overflow:"visible"}}>
          <div style={{width:W,height:H,position:"relative",pointerEvents:"none"}}>
            {children}
          </div>
        </foreignObject>
        <Foreground scene={controls.scene} seed={seed} detail={controls.detail}
          wind={at.breeze} ink={controls.ink} materialId={ids.brush}/>
      </g>
      <rect width={W} height={H} filter={"url(#"+ids.grain+")"} opacity=".42"
        style={{mixBlendMode:"multiply",pointerEvents:"none"}}/>
    </svg>
  </div>;
}
