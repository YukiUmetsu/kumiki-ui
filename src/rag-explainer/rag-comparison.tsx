/** The value proposition before the mechanics: one-question comparison.
 * SVG clip-revealed rows use the same ES1 frame as the rest of the film.
 * "Document search" here specifically means keyword-style document lookup;
 * RAG is the subsequent answer-generation workflow, not a retrieval algorithm.
 */
const ease=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
const pct=(frame:number,at:number,duration=34)=>ease((frame-at)/duration);
const F="'Geist Variable', Inter, system-ui, sans-serif";
const M="ui-monospace, SFMono-Regular, monospace";
const C={white:"#eff8fc",soft:"#a8c5d3",blue:"#8eb6ff",mint:"#7be6d2",
  gold:"#ffcd8d",panel:"#10293a",border:"#38596f",line:"#54778c"};
const rows=[
  { label:"RETRIEVES", search:"Matching handbook pages", rag:"Relevant source passages", at:57 },
  { label:"RETURNS", search:"Links and text snippets", rag:"A grounded, direct answer", at:147 },
  { label:"NEXT", search:"Read and interpret", rag:"Check the source citation", at:237 },
] as const;
function Header({x,w,text,color}:{x:number;w:number;text:string;color:string}) {
  return <g>
    <rect x={x} y="205" width={w} height="76" rx="19"
      fill={C.panel} stroke={color} strokeOpacity=".7" strokeWidth="2"/>
    <circle cx={x+33} cy="243" r="8" fill={color}/>
    <text x={x+59} y="254" fontSize="29" fontWeight="680" fill={C.white}
      fontFamily={F}>{text}</text>
  </g>;
}
function Row({x,y,w,id,label,value,accent,frame,at}:{
  x:number;y:number;w:number;id:string;label:string;value:string;
  accent:string;frame:number;at:number;
}) {
  const reveal=pct(frame,at);
  const clip="rag-compare-"+id;
  return <g>
    <rect x={x} y={y} width={w} height="83" rx="14" stroke={C.border}
      fill="#0d2232" fillOpacity=".58" strokeOpacity=".55" />
    <defs><clipPath id={clip}><rect x={x} y={y} width={w*reveal} height="85"/></clipPath></defs>
    <g clipPath={"url(#"+clip+")"}>
      <rect x={x} y={y} width={w} height="83" rx="14"
        fill={accent} fillOpacity=".095" stroke={accent} strokeOpacity=".53"/>
      <text x={x+23} y={y+30} fill={accent} fontSize="17" fontWeight="710"
        fontFamily={M}>{label}</text>
      <text x={x+23} y={y+61} fill={C.white} fontSize="25" fontWeight="580"
        fontFamily={F}>{value}</text>
    </g>
  </g>;
}
export function RagSearchComparison({frame}:{frame:number}) {
  const left=114,right=824,w=664;
  return <>
    <text x="93" y="111" fill={C.white} fontSize="43" fontWeight="670"
      fontFamily={F}>Search finds documents. RAG uses their content.</text>
    <text x="95" y="156" fill={C.soft} fontSize="24" fontFamily={F}>
      One question, two different workflows.
    </text>
    <g opacity={pct(frame,2,26)}>
      <Header x={left} w={w} text="Keyword document search" color={C.blue}/>
      <Header x={right} w={w} text="Retrieval-Augmented Generation" color={C.mint}/>
    </g>
    {rows.map((row,i)=>{
      const y=298+i*102;
      return <g key={row.label}>
        <Row x={left} y={y} w={w} id={"left-"+i} label={row.label}
          value={row.search} accent={C.blue} frame={frame} at={row.at}/>
        <Row x={right} y={y} w={w} id={"right-"+i} label={row.label}
          value={row.rag} accent={C.mint} frame={frame} at={row.at+9}/>
      </g>;
    })}
    <g opacity={pct(frame,329,20)}>
      <rect x="113" y="614" width="1377" height="48" rx="15"
        fill="#143a36" stroke={C.mint} strokeOpacity=".45"/>
      <text x="136" y="646" fill={C.mint} fontFamily={F}
        fontSize="24" fontWeight="670">
        RAG adds generation grounded in retrieved evidence.
      </text>
    </g>
  </>;
}
