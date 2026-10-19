/** Data-addressable finance/business SVG illustration. No asset downloads,
 * brand logos, fake account data or dependency on Three.js.
 */
import type { SVGProps } from "react";
import { financeObjectProgress, resolveFinanceObject } from "./finance-object-model";
import type { FinanceObjectSpec, FinanceObjectArchetype } from "./finance-object-model";

export interface FinanceObject2DProps extends Omit<SVGProps<SVGSVGElement>,"children">{
  spec:FinanceObjectSpec;
  frame?:number;
  startFrame?:number;
  revealFrames?:number;
  theme?:"midnight"|"paper";
  showTitle?:boolean;
}
function Silhouette({kind,accent,ink,panel}:{
  kind:FinanceObjectArchetype;accent:string;ink:string;panel:string;
}){
  const stroke={stroke:ink,strokeWidth:2.4,strokeLinejoin:"round" as const};
  switch(kind){
    case "institution":return <g {...stroke}>
      <path d="M 39 58 L 120 22 L 201 58 Z" fill={accent}/>
      <rect x={43} y={58} width={154} height={11} rx={3} fill={ink}/>
      {[59,91,123,155].map(x=><g key={x}>
        <rect x={x} y={72} width={22} height={63} rx={4} fill={panel}/>
        <rect x={x-4} y={67} width={30} height={7} rx={2} fill={accent}/>
        <rect x={x-4} y={133} width={30} height={7} rx={2} fill={accent}/>
      </g>)}
      <rect x={36} y={142} width={168} height={9} rx={3} fill={ink}/>
    </g>;
    case "account":return <g {...stroke}>
      <rect x={41} y={27} width={158} height={122} rx={13} fill={panel}/>
      <rect x={41} y={27} width={158} height={30} rx={12} fill={accent}/>
      <rect x={58} y={72} width={95} height={8} rx={4} fill={ink}/>
      <rect x={58} y={93} width={128} height={5} rx={2} fill={ink} opacity={.35}/>
      <rect x={58} y={110} width={82} height={5} rx={2} fill={ink} opacity={.25}/>
      <circle cx={168} cy={126} r={17} fill={accent}/>
      <path d="M 161 126 L 166 132 L 176 121" fill="none" stroke={panel} strokeWidth={3.5}/>
    </g>;
    case "card":return <g {...stroke}>
      <rect x={28} y={31} width={184} height={117} rx={16} fill={accent}/>
      <path d="M 29 58 H 211" stroke={ink} strokeWidth={17} opacity={.6}/>
      <rect x={50} y={85} width={34} height={25} rx={5} fill={panel}/>
      <path d="M 67 85 V 110 M 50 97 H 84" stroke={ink} strokeWidth={1.3} opacity={.5}/>
      <path d="M 163 92 Q 178 97 163 111 M 173 87 Q 192 97 173 117" fill="none" stroke={panel} strokeWidth={3}/>
      <rect x={49} y={124} width={76} height={5} rx={2.5} fill={panel} opacity={.78}/>
    </g>;
    case "terminal":return <g {...stroke}>
      <rect x={63} y={21} width={114} height={136} rx={13} fill={panel}/>
      <rect x={78} y={35} width={84} height={51} rx={6} fill={accent}/>
      <path d="M 94 60 H 146" stroke={ink} strokeWidth={3}/>
      {Array.from({length:9},(_,i)=><rect key={i}
        x={83+(i%3)*27} y={98+Math.floor(i/3)*16}
        width={19} height={10} rx={3} fill={i===8?accent:ink} opacity={i===8?1:.72}/>)}
      <rect x={90} y={150} width={60} height={6} rx={3} fill={ink}/>
    </g>;
    case "document":return <g {...stroke}>
      <path d="M 69 19 H 153 L 184 50 V 157 H 69 Z" fill={panel}/>
      <path d="M 153 19 V 50 H 184" fill={accent}/>
      <rect x={85} y={69} width={77} height={7} rx={3} fill={accent}/>
      {[94,109,124].map((y,i)=><rect key={y} x={85} y={y} width={i===2?62:80}
        height={5} rx={2.5} fill={ink} opacity={.5}/>)}
      <path d="M 105 143 Q 120 131 130 144 L 153 138" fill="none" stroke={accent} strokeWidth={4}/>
    </g>;
    case "cash":return <g {...stroke}>
      <rect x={38} y={43} width={161} height={99} rx={9} fill={accent}/>
      <rect x={49} y={53} width={138} height={79} rx={7} fill="none" stroke={panel} strokeWidth={3}/>
      <circle cx={118} cy={93} r={29} fill={panel}/>
      <text x={118} y={108} textAnchor="middle" fontSize={44} fontWeight={700}
        fill={accent} stroke="none">$</text>
      <circle cx={64} cy={70} r={6} fill={panel}/><circle cx={171} cy={115} r={6} fill={panel}/>
    </g>;
    case "coin":return <g {...stroke}>
      {[{x:76,y:100},{x:110,y:90},{x:144,y:78}].map((p,i)=><g key={i}>
        <ellipse cx={p.x} cy={p.y+18} rx={30} ry={10} fill={ink} opacity={.4}/>
        <circle cx={p.x} cy={p.y} r={30} fill={accent} strokeWidth={4}/>
        <circle cx={p.x} cy={p.y} r={23} fill="none" stroke={panel} strokeWidth={2.5}/>
        <text x={p.x} y={p.y+9} textAnchor="middle" fontSize={28} fontWeight={760}
          fill={panel} stroke="none">$</text>
      </g>)}
    </g>;
    case "wallet":return <g {...stroke}>
      <rect x={40} y={52} width={159} height={100} rx={16} fill={accent}/>
      <path d="M 42 65 V 46 Q 42 37 55 37 H 172 V 66" fill={panel}/>
      <rect x={123} y={91} width={91} height={46} rx={10} fill={panel}/>
      <circle cx={151} cy={114} r={7} fill={accent}/>
    </g>;
    case "piggy":return <g {...stroke}>
      <ellipse cx={119} cy={96} rx={74} ry={49} fill={accent}/>
      <path d="M 61 64 L 55 37 L 84 56" fill={accent}/>
      <ellipse cx={192} cy={106} rx={21} ry={17} fill={panel}/>
      <circle cx={186} cy={103} r={3} fill={accent}/>
      <circle cx={199} cy={103} r={3} fill={accent}/>
      <circle cx={149} cy={76} r={5} fill={ink}/>
      <path d="M 97 57 H 130" stroke={panel} strokeWidth={5}/>
      <rect x={80} y={135} width={18} height={23} rx={4} fill={accent}/>
      <rect x={139} y={135} width={18} height={23} rx={4} fill={accent}/>
    </g>;
    case "vault":return <g {...stroke}>
      <rect x={46} y={28} width={150} height={125} rx={15} fill={panel}/>
      <rect x={58} y={40} width={126} height={100} rx={10} fill={accent}/>
      <circle cx={122} cy={90} r={34} fill={panel}/>
      <circle cx={122} cy={90} r={23} fill="none" stroke={ink} strokeWidth={4}/>
      <path d="M 122 65 V 115 M 97 90 H 147 M 104 73 L 140 107 M 104 107 L 140 73"
        fill="none" stroke={accent} strokeWidth={3}/>
      <rect x={178} y={63} width={6} height={52} rx={3} fill={ink}/>
    </g>;
    case "house":return <g {...stroke}>
      <path d="M 36 86 L 120 19 L 204 86 H 188 V 150 H 52 V 86 Z" fill={accent}/>
      <rect x={91} y={98} width={57} height={52} rx={4} fill={panel}/>
      <rect x={61} y={91} width={24} height={23} rx={4} fill={panel}/>
      <rect x={155} y={91} width={24} height={23} rx={4} fill={panel}/>
      <circle cx={137} cy={124} r={3.5} fill={ink}/>
    </g>;
    case "store":return <g {...stroke}>
      <rect x={40} y={64} width={161} height={91} rx={5} fill={panel}/>
      <path d="M 41 63 L 54 32 H 187 L 200 63 Z" fill={accent}/>
      {[0,1,2,3,4].map(i=><path key={i} d={`M ${55+i*29} 33 L ${48+i*31} 65`}
        fill="none" stroke={panel} strokeWidth={4}/>)}
      <rect x={60} y={90} width={65} height={53} rx={3} fill={accent}/>
      <rect x={143} y={90} width={41} height={65} rx={4} fill={accent}/>
    </g>;
    case "briefcase":return <g {...stroke}>
      <rect x={43} y={57} width={155} height={101} rx={13} fill={accent}/>
      <path d="M 92 58 V 41 Q 92 34 100 34 H 144 Q 152 34 152 41 V 58"
        fill="none" stroke={ink} strokeWidth={7}/>
      <path d="M 43 97 H 198" stroke={panel} strokeWidth={7}/>
      <rect x={109} y={91} width={24} height={18} rx={4} fill={panel}/>
    </g>;
    case "chart":return <g {...stroke}>
      <path d="M 39 28 V 154 H 207" stroke={ink} strokeWidth={5} fill="none"/>
      {[{x:58,h:37},{x:97,h:65},{x:137,h:89},{x:177,h:115}].map(p=>
        <rect key={p.x} x={p.x} y={150-p.h} width={24} height={p.h}
          rx={5} fill={accent}/>)}
      <path d="M 60 101 L 108 90 L 147 62 L 191 35" fill="none"
        stroke={panel} strokeWidth={5} strokeLinecap="round"/>
      <path d="M 174 34 L 194 33 L 193 51" fill="none" stroke={panel} strokeWidth={5}/>
    </g>;
    case "calculator":return <g {...stroke}>
      <rect x={68} y={19} width={104} height={145} rx={13} fill={panel}/>
      <rect x={81} y={35} width={78} height={36} rx={6} fill={accent}/>
      {Array.from({length:12},(_,i)=><rect key={i}
        x={83+(i%3)*27} y={86+Math.floor(i/3)*18}
        width={21} height={12} rx={3} fill={i%3===2?accent:ink} opacity={.92}/>)}
    </g>;
    case "shield":return <g {...stroke}>
      <path d="M 120 21 L 189 47 V 95 Q 185 131 120 163 Q 55 131 51 95 V 47 Z" fill={accent}/>
      <path d="M 85 92 L 107 114 L 153 65" fill="none" stroke={panel} strokeWidth={10}
        strokeLinecap="round"/>
    </g>;
    case "transfer":return <g {...stroke}>
      <circle cx={65} cy={93} r={31} fill={panel}/>
      <circle cx={178} cy={93} r={31} fill={panel}/>
      <path d="M 106 68 H 143 L 133 58 M 143 68 L 133 78"
        fill="none" stroke={accent} strokeWidth={7} strokeLinecap="round"/>
      <path d="M 137 120 H 100 L 110 110 M 100 120 L 110 130"
        fill="none" stroke={accent} strokeWidth={7} strokeLinecap="round"/>
      <text x={65} y={102} textAnchor="middle" fontSize={25} stroke="none" fill={accent}>$</text>
      <text x={178} y={102} textAnchor="middle" fontSize={25} stroke="none" fill={accent}>$</text>
    </g>;
    case "handshake":return <g {...stroke}>
      <path d="M 31 75 L 73 56 L 115 87 L 142 65 L 210 86 L 184 119 L 136 143 L 102 133 Z" fill={accent}/>
      <path d="M 71 61 L 111 106 M 94 74 L 139 117 M 114 87 L 160 112"
        fill="none" stroke={panel} strokeWidth={8} strokeLinecap="round"/>
      <path d="M 30 74 L 54 119 L 79 109 L 55 61 Z" fill={panel}/>
      <path d="M 183 68 L 210 85 L 190 118 L 165 103 Z" fill={panel}/>
    </g>;
    case "calendar":return <g {...stroke}>
      <rect x={45} y={34} width={153} height={120} rx={12} fill={panel}/>
      <path d="M 46 54 Q 46 34 58 34 H 185 Q 198 34 198 54 V 68 H 45 Z" fill={accent}/>
      {[73,110,147].map(x=><line key={x} x1={x} y1={83} x2={x} y2={142}
        stroke={ink} strokeWidth={1.5} opacity={.4}/>)}
      {[91,114,138].map(y=><line key={y} x1={58} y1={y} x2={185} y2={y}
        stroke={ink} strokeWidth={1.5} opacity={.4}/>)}
      <circle cx={128} cy={126} r={14} fill={accent}/>
    </g>;
  }
}
export function FinanceObject2D({
  spec,frame=Number.MAX_SAFE_INTEGER,startFrame=0,revealFrames=20,
  theme="midnight",showTitle=true,...props
}:FinanceObject2DProps){
  const object=resolveFinanceObject(spec);
  const progress=financeObjectProgress(frame,startFrame,revealFrames);
  const paper=theme==="paper";
  const ink=paper?"#23374A":"#D9EFF9";
  const panel=paper?"#EAF1F5":"#142C3B";
  const accent=object.accent??(paper?"#3D6AB2":"#6FDED2");
  const background=paper?"#F8FBFD":"#081A27";
  const guide=`km-finance-${object.id}`;
  return <svg {...props} viewBox="0 0 240 200" width={props.width??480} height={props.height??400}
    role="img" aria-label={object.title} data-km-finance-object-2d={object.kind}
    data-semantic-id={object.id} style={{display:"block",...props.style}}>
    <defs><radialGradient id={guide}>
      <stop stopColor={accent} stopOpacity={paper?.12:.14}/>
      <stop offset="1" stopColor={background} stopOpacity={0}/>
    </radialGradient></defs>
    <circle cx={120} cy={92} r={100} fill={`url(#${guide})`}/>
    <g opacity={progress} transform={`translate(${120*(1-(.88+.12*progress))} ${87*(1-(.88+.12*progress))}) scale(${.88+.12*progress})`}>
      <Silhouette kind={object.archetype} accent={accent} ink={ink} panel={panel}/>
    </g>
    {showTitle?<text x={120} y={184} textAnchor="middle" fontFamily="Inter, system-ui, sans-serif"
      fontSize={14} fontWeight={650} fill={ink} opacity={progress}>{object.title}</text>:null}
  </svg>;
}
