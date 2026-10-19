/** Closing value comparison, revealed one row at a time.
 *
 * Keyword-only document search and RAG with semantic retrieval are examples,
 * not mutually exclusive algorithms: real RAG can use keyword or hybrid
 * search, and multilingual matching requires suitable embedding models.
 * Keep those qualifications in narration/docs, not extra on-screen labels.
 */
const ease=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
const pct=(frame:number,at:number,duration=34)=>ease((frame-at)/duration);
const F="'Geist Variable', Inter, system-ui, sans-serif";
const M="ui-monospace, SFMono-Regular, monospace";
const C={
  white:"#eff8fc",soft:"#a8c5d3",blue:"#8eb6ff",mint:"#7be6d2",
  panel:"#10293a",border:"#38596f",
};
export const RAG_COMPARISON_ROWS = [
  {
    label:"OUTPUT", at:50, y:290, height:93,
    search:["Matching pages and snippets"],
    rag:["Cited answers from unstructured text"],
  },
  {
    label:"STRENGTHS", at:150, y:403, height:112,
    search:["Fast, predictable, low overhead","Exact SKUs, part numbers, error codes"],
    rag:["Synonyms, intent, natural questions","Cross-language with multilingual models"],
  },
  {
    label:"WEAKNESSES", at:255, y:535, height:112,
    search:["Can miss rephrasing and synonyms","Does not generate an answer"],
    rag:["Higher compute cost and complexity","Generated answers need verification"],
  },
] as const;

function Header({x,w,text,color}:{x:number;w:number;text:string;color:string}) {
  return <g>
    <rect x={x} y="197" width={w} height="70" rx="18"
      fill={C.panel} stroke={color} strokeOpacity=".7" strokeWidth="2"/>
    <circle cx={x+25} cy="232" r="7.5" fill={color}/>
    <text x={x+46} y="242" fontSize="28" fontWeight="680" fill={C.white}
      fontFamily={F}>{text}</text>
  </g>;
}
function Cell({x,w,y,height,id,lines,color,frame,at}:{
  x:number;w:number;y:number;height:number;id:string;
  lines:readonly string[];color:string;frame:number;at:number;
}) {
  const progress=pct(frame,at);
  const clip="rag-compare-"+id;
  const lineY=lines.length===1 ? y+height/2+9 : y+46;
  return <g>
    <rect x={x} y={y} width={w} height={height} rx="16"
      fill="#0d2232" fillOpacity=".55" stroke={C.border} strokeOpacity=".58"/>
    <defs><clipPath id={clip}>
      <rect x={x} y={y} width={w*progress} height={height}/>
    </clipPath></defs>
    <g clipPath={"url(#"+clip+")"}>
      <rect x={x} y={y} width={w} height={height} rx="16"
        fill={color} fillOpacity=".085" stroke={color} strokeOpacity=".6"/>
      {lines.map((line,i)=><text key={line} x={x+21}
        y={lineY+i*34} fill={i===0?C.white:C.soft}
        fontSize={i===0?25:22} fontWeight={i===0?590:500}
        fontFamily={F}>{line}</text>)}
    </g>
  </g>;
}
export function RagSearchComparison({frame}:{frame:number}) {
  const left=262,right=905,w=587;
  return <>
    <text x="96" y="113" fill={C.white} fontSize="41"
      fontWeight="670" fontFamily={F}>
      Where keyword search wins. Where RAG helps.
    </text>
    <g opacity={pct(frame,2,26)}>
      <Header x={left} w={w} text="Keyword search" color={C.blue}/>
      <Header x={right} w={w} text="RAG + semantic retrieval" color={C.mint}/>
    </g>
    {RAG_COMPARISON_ROWS.map((row,i)=>{
      const progress=pct(frame,row.at,20);
      return <g key={row.label}>
        <text x="97" y={row.y+35} opacity={progress}
          fill={C.soft} fontFamily={M} fontSize="20"
          fontWeight="720">{row.label}</text>
        <Cell x={left} w={w} y={row.y} height={row.height}
          id={"keyword-"+i} lines={row.search} color={C.blue}
          frame={frame} at={row.at}/>
        <Cell x={right} w={w} y={row.y} height={row.height}
          id={"rag-"+i} lines={row.rag} color={C.mint}
          frame={frame} at={row.at+10}/>
      </g>;
    })}
  </>;
}
