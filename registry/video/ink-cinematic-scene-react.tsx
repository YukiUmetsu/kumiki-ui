/**
 * INK7 cinematic painter: original code-only shan-shui motifs, all in independent
 * paper-space layers. Native React/SVG with INK1 pressure-stroke paths.
 *
 * This component deliberately does not show a generated still behind a
 * moving puppet: mountains, leaves, trees, architectural forms, textiles,
 * water, camera, and character are all separately authored render surfaces.
 */
import { useId } from "react";
import type { CSSProperties } from "react";
import { inkHash, inkOutline, flyingWhite } from "./ink-wash";
import type { InkStroke } from "./ink-wash";
import { assertInkCinematicSpec, inkCinematicAt, INK_CINEMATIC_PALETTE } from "./ink-cinematic-scene";
import type { InkCinematicFrame, InkCinematicMotif, InkCinematicSceneSpec } from "./ink-cinematic-scene";
import { InkCinematicScholar } from "./ink-cinematic-scholar-react";

const P=INK_CINEMATIC_PALETTE;
const F=(n:number)=>Number(n.toFixed(2));
const rand=(seed:number,x:number,y:number)=>inkHash(seed,x,y);
const pathProps={strokeLinecap:"round" as const,strokeLinejoin:"round" as const};
/** Stable brush centerline. Uses existing INK1 inkOutline and flyingWhite
 * algorithms, so mountain ink follows the same native paper model as actors.
 */
function Brush({id,points,width,water=.22,tone=.7,seed,color=P.line,broken=false}:{
  id:string;points:readonly (readonly [number,number,number])[];
  width:number;water?:number;tone?:number;seed:number;color?:string;broken?:boolean;
}) {
  const stroke:InkStroke={
    id,points:points.map(([x,y,pressure])=>({x,y,pressure})),
    width,tone,water,load:broken?.69:.87,brush:width>8?"oblique":"upright",
    drag:broken?.83:.31,tipInk:.71,startFrame:0,drawFrames:1,
    spreadFrames:0,dryFrames:1,
  };
  const hash=id.split("").reduce((v,c)=>Math.imul(v^c.charCodeAt(0),16777619),seed>>>0)>>>0;
  const d=inkOutline(stroke,hash,1);
  return <g data-km-ink-cinema-brush={id}>
    <path d={d} fill={color} opacity={tone}/>
    {broken&&flyingWhite(stroke,hash,1).slice(0,5).map((white,i)=>
      <path key={i} d={white} stroke={P.paperBright} strokeWidth={Math.max(.5,width*.047)}
        strokeLinecap="round" fill="none" opacity={.45}/>)}
  </g>;
}
function Mountain({m,id,seed,detail,ink,frame}:{
  m:InkCinematicMotif;id:string;seed:number;detail:number;ink:number;frame:InkCinematicFrame;
}) {
  const clip=id+"-"+m.id+"-mountain";
  // A mountain is a multi-peak *mass*, then directional rock-fibre texture,
  // then moss dots. These are not evenly distributed noise.
  const shape=`M-297 151 Q-273 110 -231 73 Q-213 42 -192 14 L-166 -12
    Q-144 -29 -132 -68 Q-116 -80 -93 -121 Q-77 -141 -69 -163
    Q-47 -172 -37 -202 L-18 -244 Q-11 -262 4 -255
    Q14 -254 18 -238 L42 -215 Q48 -189 73 -170
    Q84 -159 92 -139 L118 -112 Q137 -83 151 -51
    Q170 -39 180 -12 Q212 14 228 48 Q253 70 300 132
    L305 165 L-305 165Z`;
  const fade=m.depth===0?.57:.73,geo=seed+m.x*7+m.y*13;
  const strokes=Math.max(8,Math.round((m.depth===0?50:87)*detail));
  const mirror=m.flipped?-1:1;
  const offset=frame.cameraX*(m.depth===0?.19:.43);
  return <g data-km-ink-cinema-motif={m.id} data-km-ink-cinema-kind="mountain"
    transform={`translate(${F(m.x+offset)} ${F(m.y+frame.cameraY*.25)}) scale(${m.scale*mirror} ${m.scale})`}>
    <defs><clipPath id={clip}><path d={shape}/></clipPath></defs>
    <path d={shape} fill={"url(#"+id+"-mountain)"} opacity={fade*.92}/>
    <path d={shape} fill="none" stroke="#806b56" strokeWidth={m.depth===0?1.2:2.2}
      opacity={.50*ink*fade}/>
    <g clipPath={"url(#"+clip+")"}>
      {/* Structural strata flow down the face, unlike generic fleck overlays. */}
      <path d="M-18 -245 Q-36 -211 -56 -184 Q-74 -157 -79 -126
        Q-102 -92 -113 -52 M4 -252 Q-14 -203 0 -173 Q10 -131 -5 -90
        M40 -215 Q54 -173 80 -142 Q102 -112 105 -79
        M-95 -121 Q-151 -87 -168 -17 M119 -112 Q147 -69 165 -13"
        fill="none" stroke="#756048" strokeWidth={4.4} opacity={.37*ink}/>
      {/* Diluted wash planes follow geological faces and preserve the untouched valley. */}
      <path d="M-29 -231 Q-53 -169 -106 -92 Q-128 -50 -149 22
        L-115 51 Q-90 -48 -44 -145Z" fill="#9b8263" opacity={.14*ink}/>
      <path d="M25 -224 Q43 -176 72 -158 Q104 -111 137 -27
        L171 28 Q141 -95 88 -156Z" fill="#75634d" opacity={.15*ink}/>
      <path d="M-69 -161 Q-94 -123 -113 -89 M-54 -178 Q-68 -140 -70 -118
        M-23 -231 Q-39 -193 -50 -171 M6 -219 Q1 -188 9 -161
        M30 -202 Q43 -178 52 -158 M72 -150 Q86 -124 94 -102
        M-117 -62 Q-151 -16 -161 21"
        stroke="#51483b" strokeWidth={1.7} opacity={.40*ink} fill="none"/>
      <path d="M-35 -204 Q-41 -164 -61 -136 M-63 -162 Q-88 -124 -95 -97
        M-14 -222 Q-4 -183 -26 -151 M25 -214 Q24 -166 41 -145
        M58 -166 Q74 -127 69 -94 M-107 -84 Q-134 -41 -139 -12"
        fill="none" stroke="#6f5c48" strokeWidth={2.4} opacity={.56*ink}/>
      {Array.from({length:strokes},(_,i)=>{
        const x=-176+rand(geo,i,9)*333;
        const y=-205+rand(geo,i,13)*292;
        // Fibre follows slope and falls vertically from the mountain ridge.
        const len=11+rand(geo,i,23)*(m.depth===0?30:49);
        const hook=(rand(geo,i,51)-.5)*12;
        const tone=.20+.43*rand(geo,i,29);
        return <path key={i} d={`M${F(x)} ${F(y)} q${F(-7+hook)} ${F(len*.4)} ${F(-16+hook)} ${F(len)}`}
          stroke={i%5===0?"#5f5242":"#806b55"}
          strokeWidth={i%6===0?2.6:1+rand(geo,i,39)*1.5}
          {...pathProps} fill="none" opacity={tone*ink*fade}/>;
      })}
      {detail>.55&&Array.from({length:Math.round(detail*20)},(_,i)=>{
        const x=-174+rand(geo,i+441,17)*340;
        const y=-115+rand(geo,i+441,33)*160;
        return <ellipse key={i} cx={F(x)} cy={F(y)} rx={1.2+rand(geo,i,17)*2.2}
          ry={.9+rand(geo,i,27)*1.3} fill="#625342" opacity={.19*ink*fade}/>;
      })}
    </g>
    <Brush id={m.id+"-ridge"} points={[[-77,-166,.02],[-49,-198,.44],[-23,-248,.79],[4,-248,.3],[35,-205,.05]]}
      width={7} seed={geo} water={.18} color="#685746" tone={.36*ink*fade} broken/>
    {/* Pine silhouettes on upper ridgeline establish natural scale. */}
    {detail>.48&&[[-111,-111],[-62,-171],[48,-173],[85,-115]].map(([x,y],i)=><g key={i}
      transform={`translate(${x} ${y}) scale(${.42+(i%2)*.15})`}
      fill="none" stroke="#615543" strokeWidth={1.5} opacity={.65*ink*fade}>
      <path d="M0 0 L0 -29 M0 -18 L-22 -25 M0 -24 L20 -31"/>
      <path d="M-25 -27 Q-9 -43 -1 -31 M-8 -35 Q5 -48 19 -32" strokeWidth={4} {...pathProps}/>
    </g>)}
  </g>;
}
function Pine({m,seed,detail,ink,frame}:{
  m:InkCinematicMotif;seed:number;detail:number;ink:number;frame:InkCinematicFrame;
}) {
  const mirror=m.flipped?-1:1,hash=seed+m.x;
  const clusters=[
    [-173,-358,1],[-107,-391,.9],[-39,-400,1.05],[49,-396,1.15],[132,-379,1.05],
    [202,-339,.82],[-206,-309,.79],[-92,-327,1.13],[4,-316,1.05],[105,-300,.96],
  ] as const;
  return <g data-km-ink-cinema-motif={m.id} data-km-ink-cinema-kind="pine"
    transform={`translate(${F(m.x+frame.cameraX*1.32)} ${m.y}) scale(${m.scale*mirror} ${m.scale})`}>
    <Brush id={m.id+"-trunk"} seed={hash} width={29} water={.2} tone={.93*ink} color="#584b3a"
      broken points={[[8,0,.09],[19,-76,.78],[8,-154,.89],[-37,-225,.88],
        [-45,-293,.68],[-20,-356,.09]]}/>
    <path d="M18 -4 Q35 -49 8 -132 Q-7 -196 -42 -229 Q-61 -272 -39 -344"
      stroke="#d4bfa2" strokeWidth={4.5} fill="none" opacity={.47}/>
    <path d="M-43 -305 Q-119 -314 -211 -323 M-32 -340 Q-62 -382 -143 -391
      M-25 -354 Q14 -406 98 -388 M-30 -288 Q44 -319 136 -301
      M-32 -324 Q103 -356 216 -337"
      stroke="#403b31" strokeWidth={8} fill="none" {...pathProps} opacity={.9*ink}/>
    <path d="M-43 -299 Q-110 -320 -197 -325 M-31 -341 Q-54 -386 -132 -388
      M-26 -354 Q27 -399 96 -386 M-28 -318 Q107 -353 212 -336"
      stroke="#c4ad8b" strokeWidth={2} fill="none" opacity={.44}/>
    {/* Each needle cluster has a planted branch root, radiating imperfect
        needles and a few softer half-toned brush terminals. */}
    {clusters.slice(0,Math.max(4,Math.round(clusters.length*detail))).map(([x,y,sc],i)=>
      <g key={i} transform={`translate(${x} ${y}) scale(${sc})`}
        data-km-ink-cinema-pine-needles="">
        <path d="M-25 4 Q0 -3 27 3" stroke="#534938" strokeWidth={3.2} fill="none"/>
        {Array.from({length:17},(_,j)=>{
          const dx=-35+j*4.3+(rand(hash,i*21+j,3)-.5)*4.2;
          const len=8+rand(hash,i*19+j,19)*15;
          const side=j%2?-1:1;
          return <path key={j} d={`M${F(dx)} 1 q${F((j-8)*.28)} ${F(-len*.35)} ${F(side*5)} ${F(-len)}`}
            stroke={j%3===0?"#9b886f":"#453d33"} strokeWidth={.7+(j%4)*.12}
            opacity={(j%3===0?.42:.82)*ink} fill="none" {...pathProps}/>;
        })}
      </g>)}
  </g>;
}
function Willow({m,seed,detail,ink,frame}:{
  m:InkCinematicMotif;seed:number;detail:number;ink:number;frame:InkCinematicFrame;
}) {
  const hash=seed+m.y;
  return <g data-km-ink-cinema-motif={m.id} data-km-ink-cinema-kind="willow"
    transform={`translate(${F(m.x+frame.cameraX*1.3)} ${m.y}) scale(${m.scale})`}>
    <Brush id={m.id+"-trunk"} seed={hash} width={18} tone={.75*ink} color="#6e5b44"
      broken points={[[0,0,.14],[11,-78,.54],[31,-151,.73],[24,-237,.66],[-23,-318,.17]]}/>
    <path d="M28 -230 Q-80 -340 -185 -343 M25 -269 Q63 -375 187 -409
      M17 -297 Q-11 -404 -78 -438 M33 -230 Q107 -298 220 -314"
      stroke="#594a38" strokeWidth={6.3} fill="none" {...pathProps} opacity={.85*ink}/>
    <path d="M10 -38 Q11 -140 26 -198 M25 -240 Q19 -301 -24 -321"
      stroke="#ead6b4" strokeWidth={2.2} opacity={.51} fill="none"/>
    {Array.from({length:Math.round(28*detail)},(_,i)=>{
      const side=i%2?1:-1;
      const bx=side*(24+rand(hash,i,9)*174);
      const by=-404+rand(hash,i,19)*129;
      const length=64+rand(hash,i,31)*112;
      const sway=frame.foliageSway*(.6+rand(hash,i,23));
      return <g key={i} transform={`translate(${F(bx)} ${F(by)}) rotate(${F(sway)} 0 0)`}>
        <path d={`M0 0 Q${F(side*9)} ${F(length*.5)} ${F(-side*11)} ${F(length)}`}
          stroke="#8e7a5b" strokeWidth={.8} fill="none" opacity={.46*ink}/>
        {Array.from({length:8},(_,j)=>{
          const yy=9+j*length/9;const tx=side*(3-Math.sin(j*.35)*5);
          return <path key={j} d={`M${F(tx)} ${F(yy)} q${F(side*9)} -5 ${F(side*12)} ${F(-9)} q${F(-side*3)} 9 ${F(-side*12)} 9Z`}
            fill="#806d52" opacity={(j%3===0?.28:.53)*ink}/>;
        })}
      </g>;
    })}
  </g>;
}
function Bamboo({m,seed,detail,ink,frame}:{
  m:InkCinematicMotif;seed:number;detail:number;ink:number;frame:InkCinematicFrame;
}) {
  const hash=seed+m.x;const mirrored=m.x>800?-1:1;
  return <g data-km-ink-cinema-motif={m.id} data-km-ink-cinema-kind="bamboo"
    transform={`translate(${F(m.x+frame.cameraX*1.5)} ${m.y}) scale(${m.scale*mirrored} ${m.scale})`}>
    {[0,27,55].map((x,i)=><g key={i} transform={`translate(${x} 0) rotate(${F(frame.foliageSway*.25+(i-1)*4)} 0 0)`}>
      <path d={`M0 28 Q${8+i*3} -105 ${4+i*3} -318`}
        stroke="#74654d" strokeWidth={8-i*1.2} fill="none" opacity={.7*ink}/>
      {[0,1,2,3].map(j=><path key={j} d={`M${F(j*.8)} ${F(-63-j*66)}
        l${F(6+i*.9)} -2`} stroke="#3d3b32" strokeWidth={2} fill="none" opacity={.77*ink}/>)}
      {Array.from({length:Math.round(10*detail)},(_,j)=>{
        const y=-86-j*22;const side=j%2?1:-1;
        const dx=side*(36+rand(hash,i*25+j,31)*48);
        return <g key={j}>
          <path d={`M${F(4+i*3)} ${y} q${F(dx*.38)} -9 ${F(dx)} ${F(-j%3*4)}`}
            stroke="#78664d" strokeWidth={1.05} fill="none" opacity={.55*ink}/>
          <path d={`M${F(dx*.31)} ${F(y-4)} Q${F(dx*.61)} ${F(y-27)} ${F(dx)} ${F(y-12)}
            Q${F(dx*.65)} ${F(y-5)} ${F(dx*.31)} ${F(y-4)}Z`}
            fill="#665947" opacity={.36+.33*rand(hash,i*10+j,43)}/>
        </g>;
      })}
    </g>)}
  </g>;
}
function Rock({m,seed,detail,ink,frame}:{
  m:InkCinematicMotif;seed:number;detail:number;ink:number;frame:InkCinematicFrame;
}) {
  const hash=seed+m.y+m.x;
  return <g data-km-ink-cinema-motif={m.id} data-km-ink-cinema-kind="rock"
    transform={`translate(${F(m.x+frame.cameraX*1.6)} ${m.y}) scale(${m.scale})`}>
    <path d="M-155 66 Q-135 3 -103 -26 L-60 -37 Q-33 -88 12 -82
      Q55 -100 83 -58 L122 -41 Q145 -3 170 67Z" fill="#b7a083" opacity={.43*ink}
      stroke="#5d5140" strokeWidth={2.1}/>
    <path d="M-92 -25 Q-53 -38 -25 -72 Q-1 -75 23 -82
      M-41 -27 Q-6 -8 12 54 M49 -72 Q47 -37 95 -12
      M-117 12 Q-84 14 -49 64 M113 -36 Q135 9 143 57"
      fill="none" stroke="#75614b" strokeWidth={3.2} opacity={.57*ink}/>
    {Array.from({length:Math.round(detail*34)},(_,i)=>{
      const x=-106+rand(hash,i,9)*224,y=-57+rand(hash,i,19)*101;
      const length=7+rand(hash,i,31)*27;
      return <path key={i} d={`M${F(x)} ${F(y)} q-6 ${F(length*.3)} -11 ${F(length)}`}
        fill="none" stroke={i%5?"#75624c":"#4b4236"} strokeWidth={i%5?1.05:2.6}
        opacity={.18+.24*rand(hash,i,37)}/>;
    })}
    {Array.from({length:Math.round(detail*13)},(_,i)=>{
      const x=-126+rand(hash,i,23)*258,y=21+rand(hash,i,29)*42;
      return <ellipse key={i} cx={F(x)} cy={F(y)} rx={1.4+rand(hash,i,17)*3}
        ry={1+rand(hash,i,51)*1.4} fill="#4d4436" opacity={.52*ink}/>;
    })}
  </g>;
}
function Pavilion({m,ink,frame}:{
  m:InkCinematicMotif;ink:number;frame:InkCinematicFrame;
}) {
  return <g data-km-ink-cinema-motif={m.id} data-km-ink-cinema-kind="pavilion"
    transform={`translate(${F(m.x+frame.cameraX*.55)} ${m.y}) scale(${m.scale})`}
    opacity={.78*ink}>
    <path d="M-72 -7 L72 -7 L79 0 L-78 0Z" fill="#b8a085" stroke="#544a3c" strokeWidth={1.9}/>
    <path d="M-56 -11 L-56 -66 L-43 -66 L-43 -10 M-5 -10 L-5 -70 L7 -70 L7 -10
      M46 -10 L46 -66 L58 -66 L58 -10" fill="#c5ac88" stroke="#5c5040" strokeWidth={1.5}/>
    <path d="M-80 -70 Q-64 -65 -51 -83 Q-22 -103 0 -105
      Q29 -102 55 -84 Q70 -69 84 -73 L79 -63 Q48 -65 0 -87 Q-50 -62 -77 -61Z"
      fill="#655746" stroke="#3e382e" strokeWidth={2.4}/>
    <path d="M-91 -69 Q-79 -61 -65 -65 M91 -71 Q76 -64 60 -66
      M-52 -84 Q-12 -103 0 -102 Q37 -96 54 -83"
      fill="none" stroke="#c8b599" strokeWidth={2.2} opacity={.65}/>
    <path d="M0 -106 L0 -118 M-3 -112 L3 -112" stroke="#594937" strokeWidth={2.6}/>
    {[-41,-13,15,43].map((x,i)=><path key={i}
      d={`M${x} -87 L${F(x*.65)} -68`} stroke="#483e32" strokeWidth={1.4} fill="none"/>)}
  </g>;
}
function Bridge({m,ink,frame}:{
  m:InkCinematicMotif;ink:number;frame:InkCinematicFrame;
}) {
  return <g data-km-ink-cinema-motif={m.id} data-km-ink-cinema-kind="bridge"
    transform={`translate(${F(m.x+frame.cameraX*.65)} ${m.y}) scale(${m.scale})`}
    opacity={.66*ink}>
    <path d="M-189 6 Q-136 -12 -109 -39 Q0 -97 107 -39 Q140 -12 189 6
      L189 18 Q134 4 98 -25 Q0 -77 -98 -25 Q-139 6 -189 18Z"
      fill="#bda484" stroke="#655643" strokeWidth={2.2}/>
    <path d="M-186 -10 Q-115 -31 -99 -49 Q0 -105 99 -49 Q137 -25 186 -10"
      stroke="#6f5b45" strokeWidth={2.3} fill="none"/>
    <path d="M-188 -18 Q-100 -43 -96 -58 Q0 -115 96 -58 Q118 -36 188 -18"
      stroke="#675542" strokeWidth={1.7} fill="none"/>
    {Array.from({length:15},(_,i)=>{
      const x=-171+i*24;const y=-21-43*Math.sqrt(Math.max(0,1-(x/178)**2));
      return <path key={i} d={`M${x} ${F(y)} l1 12`} stroke="#6b5945" strokeWidth={1.3}/>;
    })}
    <path d="M-98 -20 Q0 -80 98 -20" stroke="#f7eddb" strokeWidth={1.8} fill="none" opacity={.71}/>
  </g>;
}
function Water({m,seed,detail,ink,frame}:{
 m:InkCinematicMotif;seed:number;detail:number;ink:number;frame:InkCinematicFrame;
}){
 const hash=seed+m.x;
 return <g data-km-ink-cinema-motif={m.id} data-km-ink-cinema-kind="water"
   transform={`translate(${F(m.x)} ${m.y}) scale(${m.scale})`}>
   <path d="M-620 -66 Q-320 -96 -90 -78 Q180 -89 460 -102 L720 -98
     L720 138 L-620 138Z" fill="#ebdcc2" opacity={.27}/>
   {Array.from({length:Math.round(62*detail)},(_,i)=>{
     const x=-572+rand(hash,i,13)*1180;
     const y=-88+rand(hash,i,19)*174;
     const len=8+rand(hash,i,29)*64;
     const drift=Math.sin(frame.riverPhase+i*.6)*3;
     return <path key={i} d={`M${F(x+drift)} ${F(y)} q${F(len*.48)} ${F(-1+rand(hash,i,17)*3)} ${F(len)} 0`}
       stroke={i%5===0?"#87715b":"#b6a084"} strokeWidth={i%5===0?1.1:.65}
       fill="none" opacity={(.10+.22*rand(hash,i,41))*ink}/>;
   })}
 </g>;
}
function Cloud({m,frame,ink}:{
 m:InkCinematicMotif;frame:InkCinematicFrame;ink:number;
}){return <g data-km-ink-cinema-motif={m.id} data-km-ink-cinema-kind="cloud"
 transform={`translate(${F(m.x+frame.mistOffset*.3)} ${m.y}) scale(${m.scale})`}
 fill="none" stroke="#ad9980" strokeWidth={1.4} opacity={.33*ink} {...pathProps}>
 <path d="M-132 12 Q-99 -2 -80 -4 Q-53 -5 -55 -23 Q-61 -32 -71 -23
   Q-77 -9 -55 -7 Q-25 -4 5 -19 Q34 -33 44 -17 Q47 -5 29 -3
   Q15 -2 19 -13 Q24 -20 34 -12 M18 12 Q67 2 119 8"/>
 <path d="M-89 21 Q-22 4 28 18 Q73 22 126 16" strokeWidth={.88} opacity={.6}/>
 </g>}
function Birds({m,ink,frame}:{
 m:InkCinematicMotif;ink:number;frame:InkCinematicFrame;
}){
 return <g data-km-ink-cinema-motif={m.id} data-km-ink-cinema-kind="birds"
  transform={`translate(${F(m.x+frame.birdOffset)} ${m.y}) scale(${m.scale})`}
  fill="none" stroke="#494238" strokeWidth={2.6} opacity={.63*ink} {...pathProps}>
  <path d="M-14 0 Q-8 -11 0 -2 Q5 -10 16 -7 M39 25 Q46 18 54 24 Q65 11 75 19"/>
  <path d="M-6 -5 Q-13 -14 -22 -13 M58 20 Q54 10 47 7" strokeWidth={1.3}/>
 </g>;
}
function Grass({m,seed,detail,ink,frame}:{
 m:InkCinematicMotif;seed:number;detail:number;ink:number;frame:InkCinematicFrame;
}){
 const hash=seed+m.x;
 return <g data-km-ink-cinema-motif={m.id} data-km-ink-cinema-kind="grass"
 transform={`translate(${F(m.x+frame.cameraX*1.5)} ${m.y}) scale(${m.scale})`}
 fill="none" stroke="#716047" opacity={.58*ink} strokeWidth={1.5} {...pathProps}>
 {Array.from({length:Math.round(22*detail)},(_,i)=>{
  const x=(rand(hash,i,7)-.5)*140;
  const length=17+rand(hash,i,17)*51;
  const side=(rand(hash,i,27)-.5)*45+frame.foliageSway*.25;
  return <path key={i} d={`M${F(x)} 0 Q${F(x+side*.4)} ${F(-length*.65)} ${F(x+side)} ${F(-length)}`}/>;
 })}
 </g>;
}
/** Scene-specific long geological/shoreline masses. In front of the distant
 * mountain but below character feet; no invented 3D shadow postprocess.
 */
function Ground({scene,ink,detail,seed}:{
 scene:InkCinematicSceneSpec["composition"];ink:number;detail:number;seed:number;
}){
 const river=scene==="riverside-scroll";
 const ground=river?
  `M-50 548 Q171 525 359 565 Q482 565 559 588 Q606 609 668 616
   L630 740 L-50 740Z`:
  `M-50 711 Q153 696 262 672 Q393 645 497 633 Q611 626 690 620
   Q780 581 870 570 Q1032 573 1330 592 L1330 740 L-50 740Z`;
 return <g data-km-ink-cinema-ground="" opacity={.95*ink}>
   <path d={ground} fill={river?"#d9c5a5":"#d7bfa0"} opacity={.55}/>
   <path d={ground} fill="none" stroke="#82715b" strokeWidth={2.4} opacity={.64}/>
   {!river&&<path d="M242 688 Q429 652 595 656 Q704 627 852 585
     M360 708 Q512 671 629 678 Q785 636 1022 603"
      stroke="#8f775e" strokeWidth={1.8} fill="none" opacity={.45}/>}
   {river&&<path d="M-10 568 Q280 543 425 576 Q537 602 653 622
     M60 619 Q242 592 434 630 M-20 666 Q264 632 440 680"
      stroke="#8a775f" strokeWidth={1.2} fill="none" opacity={.44}/>}
   {Array.from({length:Math.round(detail*57)},(_,i)=>{
    const x=river?rand(seed,i,3)*620:120+rand(seed,i,3)*1040;
    const y=river?575+rand(seed,i,7)*159:627+rand(seed,i,7)*99-(x/1280)*45;
    const w=7+rand(seed,i,9)*30;
    return <path key={i} d={`M${F(x)} ${F(y)} q${F(w*.5)} ${F(-3+rand(seed,i,31)*7)} ${F(w)} 1`}
      fill="none" stroke={i%6===0?"#615441":"#998166"}
      strokeWidth={i%6===0?1.8:.8} opacity={.17+.27*rand(seed,i,17)}/>;
   })}
 </g>;
}
export interface InkCinematicSceneProps {
  spec:InkCinematicSceneSpec;
  /** One absolute scene-local frame. Independently renderable by FilmStage. */
  frame:number;
  reducedMotion?:boolean;
  className?:string;
  style?:CSSProperties;
  /** Full scene is authored in source, not a raster screenshot. */
  label?:string;
}
export function InkCinematicScene({
 spec,frame,reducedMotion=false,className,style,label="Original Chinese ink-wash landscape animation",
}:InkCinematicSceneProps){
 assertInkCinematicSpec(spec);
 const pose=inkCinematicAt(spec,frame,reducedMotion);
 const rawId=useId().replace(/[^a-zA-Z0-9_-]/g,"");
 const id="ink7-"+rawId;
 const art=spec.art;
 const portrait=spec.output==="portrait";
 const width=portrait?540:960,height=portrait?960:540;
 const viewBox=portrait?"378 -172 524 932":"0 0 1280 720";
 // A stable, initially established, layered painted environment; ink motion
 // happens in the chosen subjects and wet atmospheric planes, not every pixel.
 const tree=(m:InkCinematicMotif)=>{
   const common={m,ink:art.ink,frame:pose};
   switch(m.kind){
     case "mountain":return <Mountain {...common} detail={art.detail} seed={spec.seed} id={id}/>;
     case "pine":return <Pine {...common} detail={art.detail} seed={spec.seed}/>;
     case "willow":return <Willow {...common} detail={art.detail} seed={spec.seed}/>;
     case "bamboo":return <Bamboo {...common} detail={art.detail} seed={spec.seed}/>;
     case "rock":return <Rock {...common} detail={art.detail} seed={spec.seed}/>;
     case "pavilion":return <Pavilion {...common}/>;
     case "bridge":return <Bridge {...common}/>;
     case "water":return <Water {...common} detail={art.detail} seed={spec.seed}/>;
     case "cloud":return <Cloud {...common}/>;
     case "birds":return <Birds {...common}/>;
     case "grass":return <Grass {...common} detail={art.detail} seed={spec.seed}/>;
   }
 };
 return <svg role="img" aria-label={label} className={className}
    data-km-ink-cinematic-scene={spec.id} data-km-ink-cinematic-frame={frame}
    data-km-ink-cinematic-preset={spec.composition} data-km-ink-cinematic-output={spec.output}
    data-km-ink-cinematic-actor-x={F(pose.actorX)}
    width={width} height={height} viewBox={viewBox}
    preserveAspectRatio="xMidYMid meet"
    style={{display:"block",background:P.paper,...style}}>
   <defs>
     <linearGradient id={id+"-mountain"} x1="0" x2=".15" y1="0" y2="1">
       <stop offset="0" stopColor="#796651" stopOpacity={.87*art.ink}/>
       <stop offset=".31" stopColor="#af987b" stopOpacity={.55*art.ink}/>
       <stop offset=".68" stopColor="#cfbba0" stopOpacity={.34*art.ink}/>
       <stop offset="1" stopColor="#eaddc6" stopOpacity="0"/>
     </linearGradient>
     <radialGradient id={id+"-paper"} cx=".44" cy=".32" r=".79">
       <stop offset="0" stopColor={P.paperBright}/>
       <stop offset=".72" stopColor={P.paper}/>
       <stop offset="1" stopColor="#dfc9a7"/>
     </radialGradient>
     <linearGradient id={id+"-atmosphere"} x1="0" y1="0" x2="0" y2="1">
       <stop offset="0" stopColor="#fff8eb" stopOpacity="0"/>
       <stop offset=".38" stopColor="#fff8eb" stopOpacity={.21*art.mist}/>
       <stop offset="1" stopColor="#fff8ed" stopOpacity={.9*art.mist}/>
     </linearGradient>
     <radialGradient id={id+"-mist"} cx=".53" cy=".50" r=".65">
       <stop offset="0" stopColor="#fff9e9" stopOpacity={.81*art.mist}/>
       <stop offset=".65" stopColor="#fdf6e8" stopOpacity={.53*art.mist}/>
       <stop offset="1" stopColor="#fffaf0" stopOpacity="0"/>
     </radialGradient>
     <filter id={id+"-fibres"} x="-5%" y="-5%" width="110%" height="110%">
       <feTurbulence type="fractalNoise" baseFrequency=".67" numOctaves={2}
         seed={spec.seed} stitchTiles="stitch" result="paperNoise"/>
       <feColorMatrix in="paperNoise" type="saturate" values="0" result="neutral"/>
       <feComponentTransfer in="neutral"><feFuncA type="linear" slope=".28"/></feComponentTransfer>
     </filter>
   </defs>
   <rect x="-800" y="-650" width="3000" height="2100" fill={"url(#"+id+"-paper)"}/>
   <g data-km-ink-cinema-plane="far" opacity={art.ink}>
     {spec.motifs.filter(m=>m.depth===0).map(m=><g key={m.id}>{tree(m)}</g>)}
   </g>
   {/* Wisps in intentionally unpainted negative space, never opaque full-card fog. */}
   <g data-km-ink-cinema-plane="atmosphere" pointerEvents="none">
     <ellipse cx={548+pose.mistOffset*.16} cy={410} rx={650} ry={161}
       fill={"url(#"+id+"-mist)"} opacity={.8}/>
     <ellipse cx={902+pose.mistOffset*.22} cy={506} rx={480} ry={99}
       fill={"url(#"+id+"-mist)"} opacity={.75}/>
   </g>
   <g data-km-ink-cinema-plane="middle" opacity={1}>
     {spec.motifs.filter(m=>m.depth===1).map(m=><g key={m.id}>{tree(m)}</g>)}
   </g>
   <Ground scene={spec.composition} ink={art.ink} detail={art.detail} seed={spec.seed}/>
   <g data-km-ink-cinema-plane="foreground">
     {spec.motifs.filter(m=>m.depth===2).map(m=><g key={m.id}>{tree(m)}</g>)}
   </g>
   <InkCinematicScholar actor={spec.actor} pose={pose} ink={art.ink} detail={art.detail}/>
   {/* One gentle authentic paper fibre pass is fixed in paper space. */}
   {art.grain>0&&<rect x="-800" y="-650" width="3000" height="2100"
     filter={"url(#"+id+"-fibres)"} opacity={art.grain*.21} pointerEvents="none"/>}
 </svg>;
}
