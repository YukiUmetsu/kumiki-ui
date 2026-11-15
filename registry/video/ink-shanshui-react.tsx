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
  return [u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0],
    u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1]];
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
        opacity={(band===0?.32:band===1?.58:.73)*ink}>
        <path data-km-shanshui-ridge-contour={band} d={ridgePath(stations)}
          fill={"url(#"+([ids.far,ids.mid,ids.near][band])+")"}
          stroke={band===2?"#816b51":"#ac9070"} strokeWidth={band===2?.85:.55}/>
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
          const opacity=(.18+.47*s(seed+8,i*11+band))*(1-.55*mist);
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
    {arches.map((branch,i)=><path key={i}
      d={"M"+branch.from.join(" ")+" Q"+branch.control.join(" ")+
        " "+branch.to.join(" ")}
      stroke="#6b5038" strokeWidth={3.1+(i%3)*.52} fill="none"
      strokeLinecap="round"/>)}
    <path d="M31 -233 Q137 -320 322 -325 M41 -252 Q152 -352 387 -331
      M62 -294 Q197 -298 367 -280"
      stroke="#c0a180" strokeWidth="1.2" fill="none" opacity=".8"/>
    {Array.from({length:strands},(_,i)=>{
      const branch=arches[i%arches.length];
      const u=.18+.78*s(seed,i*7+9);
      const origin=quadraticPoint(branch.from,branch.control,branch.to,u);
      const fall=48+125*s(seed,i*11+20);
      const control:P=[origin[0]-10+wind*4,origin[1]+fall*.48];
      const end:P=[origin[0]+8+wind*6,origin[1]+fall*(1+.012*wind)];
      const leafCount=Math.round(4+7*s(seed,i*5+2));
      return <g key={i} data-km-willow-frond="">
        <path d={"M"+f(origin[0])+" "+f(origin[1])+
          " Q"+f(control[0])+" "+f(control[1])+
          " "+f(end[0])+" "+f(end[1])}
          fill="none" stroke="#9c8568" strokeWidth={.7+.35*s(seed,i*31)}
          opacity=".6"/>
        {Array.from({length:leafCount},(_,j)=>{
          const t=(j+.6)/(leafCount+1);
          const [x,y]=quadraticPoint(origin,control,end,t);
          const dir=j%2?1:-1,len=6+6*s(seed,i*37+j);
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
/** Source-study motif: old pine branchlets terminate in separate radial,
 * pressure-loaded needle rosettes, not one flat comb-shaped canopy. Every
 * visible twig roots in the parent branch point and needle root meets a twig.
 * Keep all brush deposition seek-stable and preserve paper between clusters.
 */
function NeedleSpray({x,y,scale,seed,wind}:{
  x:number;y:number;scale:number;seed:number;wind:number;
}){
  const sprigs=[
    {dx:-23,dy:-6,tilt:-.28},{dx:4,dy:-17,tilt:.10},
    {dx:25,dy:-8,tilt:.38},
  ];
  return <g data-km-pine-spray=""
    transform={"rotate("+f(wind*1.25)+" "+f(x)+" "+f(y)+")"}>
    {sprigs.map((sprig,j)=>{
      const offset=(s(seed+67,j*5)-.5)*5*scale;
      const tx=x+(sprig.dx+offset)*scale;
      const ty=y+sprig.dy*scale+(s(seed,j*17)-.5)*3*scale;
      const count=10+Math.floor(6*s(seed+17,j*11+1));
      const wet:string[]=[],dry:string[]=[],middle:string[]=[];
      for(let k=0;k<count;k++){
        const spread=(k-(count-1)*.5)/((count-1)*.5);
        const angle=-Math.PI/2+spread*1.18+sprig.tilt*.28;
        const len=(11+14*s(seed+j*73,k*17+7))*scale*
          (1-.20*Math.abs(spread));
        const rx=tx+spread*2.6*scale;
        const ry=ty+.9*scale*s(seed+j*13,k+17);
        const ex=rx+Math.cos(angle)*len;
        const ey=ry+Math.sin(angle)*len;
        const nx=-(ey-ry)/len,ny=(ex-rx)/len;
        const width=(.48+1.13*s(seed+j*31,k*19+3))*scale;
        const d="M"+f(rx)+" "+f(ry)+
          " Q"+f(rx+(ex-rx)*.37+nx*width)+" "+
          f(ry+(ey-ry)*.37+ny*width)+
          " "+f(ex)+" "+f(ey)+
          " Q"+f(rx+(ex-rx)*.31-nx*width*.45)+" "+
          f(ry+(ey-ry)*.31-ny*width*.45)+
          " "+f(rx)+" "+f(ry)+" Z";
        (k%6===0?dry:k%3===0?middle:wet).push(d);
      }
      return <g key={j} data-km-pine-needle-cluster=""
        data-km-pine-needles={count}
        data-km-pine-twig-root={f(x)+","+f(y)}>
        <path d={"M"+f(x)+" "+f(y)+
          " Q"+f((x+tx)*.5)+" "+f((y+ty)*.5-3*scale)+
          " "+f(tx)+" "+f(ty)}
          stroke="#4c3c2b" strokeWidth={f(1.6*scale)}
          fill="none" strokeLinecap="round"/>
        {/* Dark pigment, dilute secondary strokes, dry lifted highlights. */}
        <path d={wet.join(" ")} fill="#332c23" opacity=".88"/>
        <path d={middle.join(" ")} fill="#675741" opacity=".75"/>
        <path d={dry.join(" ")} fill="#a18b6a" opacity=".58"/>
      </g>;
    })}
  </g>;
}
function OldPine({x,y,scale,wind,seed,detail}:{
  x:number;y:number;scale:number;wind:number;seed:number;detail:number;
}){
  // Asymmetric branch endpoints and tip-heavy clustered needles emulate
  // old-pine brush canopies rather than regularly spaced horizontal shelves.
  const stems=[
    {y:-95,dir:-1,len:98,tipDy:25},
    {y:-133,dir:1,len:132,tipDy:9},
    {y:-166,dir:-1,len:121,tipDy:-28},
    {y:-192,dir:1,len:154,tipDy:-37},
    {y:-225,dir:-1,len:105,tipDy:20},
    {y:-245,dir:1,len:108,tipDy:-12},
    {y:-270,dir:-1,len:80,tipDy:-23},
    {y:-285,dir:1,len:63,tipDy:-28},
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
    {Array.from({length:28},(_,i)=>{
      const cy=-8-i*10;
      const x0=trunkX(cy)+(s(seed+3,i*23)-.5)*10;
      const side=i%2===0?1:-1;
      const dx=side*(3+6*s(seed+11,i*9));
      const dy=7+10*s(seed+17,i*7);
      return <path key={i} data-km-pine-bark=""
        d={"M"+f(x0)+" "+f(cy)+
          " Q"+f(x0+dx*.62)+" "+f(cy-dy*.54)+
          " "+f(x0+dx*.35)+" "+f(cy-dy)}
        stroke={i%5===0?"#35291e":"#b49471"}
        strokeWidth={f(i%5===0?1.55:.65)} opacity={f(.38+.4*s(seed,i))}
        strokeLinecap="round" fill="none"/>;
    })}
    {stems.map((b,i)=>{
      const reach=b.len*b.dir;
      const root:P=[trunkX(b.y),b.y];
      const c1:P=[root[0]+reach*.24,b.y-13-(i%2)*7];
      const c2:P=[root[0]+reach*.71,b.y+b.tipDy*.6-10+(i%3)*4];
      const tip:P=[root[0]+reach,b.y+b.tipDy];
      const count=Math.round((4+(i%3))*detail);
      return <g key={i} data-km-pine-bough=""
        data-km-pine-bough-root={f(root[0])+","+f(root[1])}>
        <path d={"M"+f(root[0])+" "+f(root[1])+
          " C"+f(c1[0])+" "+f(c1[1])+" "+f(c2[0])+" "+f(c2[1])+
          " "+f(tip[0])+" "+f(tip[1])}
          stroke="#51402c" strokeWidth={7-i*.48} fill="none" strokeLinecap="round"/>
        <path d={"M"+f(root[0])+" "+f(root[1]-2)+
          " Q"+f(c2[0])+" "+f(c2[1]-2)+" "+f(tip[0])+" "+f(tip[1]-1)}
          stroke="#c2a080" strokeWidth="1.4" fill="none" opacity=".7"/>
        {Array.from({length:count},(_,j)=>{
          const u=.45+.51*(j+.35)/(count+.25);
          const point=cubicPoint(root,c1,c2,tip,u);
          return <NeedleSpray key={j}
            x={f(point[0])} y={f(point[1])}
            scale={.58+(.62*s(seed,i*21+j))} wind={wind}
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
/** Bamboo is a calligraphic plant, not uniform fence-post lines. The
 * centerline of each tapered culm also supplies the positions of its branch
 * nodes; each broad leaf begins on its own painted branching centerline.
 */
function Bamboo({x,y,scale,wind,seed,detail}:{
  x:number;y:number;scale:number;wind:number;seed:number;detail:number;
}){
  return <g data-km-shanshui-bamboo=""
    transform={"translate("+x+" "+y+") scale("+scale+")"}>
    {[-32,0,25].map((x0,i)=>{
      const h=315+i*53,tipX=x0-38-i*13;
      const from:P=[x0,0],control:P=[x0-6,-h*.48],tip:P=[tipX,-h];
      const half=4.25-i*.35;
      const culm="M"+f(x0-half)+" 1 Q"+f(x0-6-half)+" "+f(-h*.48)+
        " "+f(tipX)+" "+f(-h)+
        " Q"+f(x0-6+half)+" "+f(-h*.48)+" "+f(x0+half)+" 1 Z";
      return <g key={i} data-km-shanshui-bamboo-stem={i}>
        <path d={culm} fill="#66513d" stroke="#43382d"
          strokeWidth=".78" opacity=".91"/>
        <path d={"M"+f(x0-.75)+" 0 Q"+f(x0-7)+" "+f(-h*.48)+
          " "+f(tipX-.6)+" "+f(-h+12)}
          stroke="#dfc29b" strokeWidth="1.05" fill="none" opacity=".57"/>
        {Array.from({length:7},(_,j)=>{
          const t=(j+1)/8,[cx,cy]=quadraticPoint(from,control,tip,t);
          const fan=j%2===0?-1:1,reach=(36+28*s(seed,i*11+j))*fan;
          const base:P=[cx,cy],turn:P=[cx+reach*.45,cy-17],
            end:P=[cx+reach,cy-27];
          return <g key={j}
            transform={"rotate("+f(wind*.6)+" "+f(cx)+" "+f(cy)+")"}>
            <path d={"M"+f(cx)+" "+f(cy)+" Q"+f(turn[0])+" "+
              f(turn[1])+" "+f(end[0])+" "+f(end[1])}
              stroke="#685541" strokeWidth="1.15" fill="none"/>
            {Array.from({length:Math.round(detail*5)},(_,k)=>{
              const along=(k+.75)/5.8,[bx,by]=
                quadraticPoint(base,turn,end,along);
              const side=k%2===0?1:-1;
              const len=18+15*s(seed,i*50+j*9+k);
              const tipX=bx+side*len*.86+Math.sign(reach)*len*.22;
              const tipY=by-len*(.39+.23*s(seed+5,k+i*23+j));
              const wide=3.8+3.2*s(seed+11,k+i*13+j);
              // Two unequal edges make a broad pressure-loaded wedge
              // with a clean pointed release, not an almost invisible V.
              const blade="M"+f(bx)+" "+f(by)+
                " Q"+f(bx+side*len*.4)+" "+f(by-len*.10-wide*.65)+
                " "+f(tipX)+" "+f(tipY)+
                " Q"+f(bx+side*len*.12)+" "+f(by+wide*.9)+
                " "+f(bx)+" "+f(by)+" Z";
              return <path key={k} data-km-shanshui-bamboo-leaf=""
                d={blade} fill={k%5===0?"#8a775b":"#40392b"}
                opacity={f(.57+.28*s(seed,k+i*31+j*7))}/>;
            })}
          </g>;
        })}
        {/* Thick nodes are rings around the SAME curved culm. */}
        {Array.from({length:5},(_,j)=>{
          const [nx,ny]=quadraticPoint(from,control,tip,(j+1)/6);
          return <path key={j} d={"M"+f(nx-4)+" "+f(ny+1)+
            " Q"+f(nx)+" "+f(ny-3)+" "+f(nx+5)+" "+f(ny)}
            stroke="#342b21" strokeWidth="1.45" fill="none"/>;
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
function Foreground({scene,seed,detail,wind}:{scene:ShanshuiScene;seed:number;detail:number;wind:number}){
  if(scene==="river-scholar")return <g data-km-shanshui-foreground="">
    <Rock x={15} y={540} w={175} h={98} seed={seed+91} detail={detail}/>
    <Rock x={899} y={544} w={151} h={83} seed={seed+47} detail={detail}/>
    <Grass x={360} y={521} seed={seed} scale={1.1}/>
    <Grass x={746} y={510} seed={seed+3}/>
    <Bamboo x={925} y={510} scale={.55} seed={seed+79} detail={detail} wind={wind}/>
  </g>;
  if(scene==="misty-hermit")return <g data-km-shanshui-foreground="">
    <Rock x={23} y={557} w={171} h={96} seed={seed} detail={detail}/>
    <Rock x={873} y={548} w={184} h={83} seed={seed+8} detail={detail}/>
    <OldPine x={74} y={522} scale={1.28} seed={seed+47} detail={detail} wind={wind}/>
    <Bamboo x={908} y={538} scale={1.07} seed={seed+55} detail={detail} wind={wind}/>
    <Grass x={344} y={510} seed={seed} scale={.8}/>
  </g>;
  return <g data-km-shanshui-foreground="">
    <Rock x={76} y={568} w={218} h={168} seed={seed+7} detail={detail}/>
    <Rock x={885} y={567} w={205} h={162} seed={seed+13} detail={detail}/>
    <OldPine x={65} y={540} scale={1.43} seed={seed+9} detail={detail} wind={wind}/>
    <Bamboo x={914} y={535} scale={.9} seed={seed+10} detail={detail} wind={wind}/>
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
    path:"kmshan"+rawId+"path",
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
          wind={at.breeze}/>
      </g>
      <rect width={W} height={H} filter={"url(#"+ids.grain+")"} opacity=".42"
        style={{mixBlendMode:"multiply",pointerEvents:"none"}}/>
    </svg>
  </div>;
}
