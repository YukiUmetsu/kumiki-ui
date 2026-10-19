/** Spatial embedding illustration used by BOTH index creation and query retrieval.
 * Inspired by the visual grammar of projected vector spaces (many points,
 * coherent semantic neighborhoods, depth plane), not a decorative node graph.
 *
 * Points for C01..C06 derive from rag-domain.ts toy vectors. Background points
 * are deterministic context particles; NOT extra indexed source records.
 * The 2D projection is illustrative, not a claim about real ANN/DB internals.
 */
import { pointOnPath } from "../../registry/motion/paths";
import type { MotionPath } from "../../registry/motion/paths";
import { RAG_CHUNKS, RAG_EXAMPLE_TRACE, RAG_QUESTION_VECTOR } from "./rag-domain";

type Mode = "index" | "search";
const C = { violet: "#aba9ff", blue: "#7eb6f8", gold: "#ffd093",
  mint: "#7be7d3", white: "#f1f7fc", soft: "#8facbd" } as const;
const ease = (n: number) => { const t = Math.max(0, Math.min(1, n)); return t*t*(3-2*t); };
const arrive = (f: number, at: number, len = 30) => ease((f-at)/len);
type Pt = readonly [number, number];
/** True toy-vector coordinates projected onto the same oblique viewing plane. */
export function projectToyVector(vector: readonly number[]): Pt {
  return [560 + vector[0]*320 + vector[1]*100, 305 - vector[1]*140 + vector[0]*40];
}
const sources = RAG_CHUNKS.map(chunk => ({ ...chunk, point: projectToyVector(chunk.embedding) }));
const source = new Map(sources.map(item => [item.id, item]));
const controls = ["C03","C04","C05","C01"] as const;
const tagOffsets: Record<string, Pt> = {
  C01: [13,43], C02: [17,-18], C03: [-31,42],
  C04: [-50,-26], C05: [-17,-27], C06: [-18,-27],
};
function between(id: string, a: Pt, b: Pt): MotionPath {
  return { id, kind: "linear", closed: false,
    anchors: [{ x:a[0],y:a[1] },{ x:b[0],y:b[1] }] };
}
const steps = [
  { from:"C03", to:"C04", at:65, len:52 },
  { from:"C04", to:"C05", at:124, len:50 },
  { from:"C05", to:"C01", at:183, len:51 },
  { from:"C05", to:"C02", at:242, len:40 },
] as const;
/** Deterministic thematic neighborhoods. These dots are decorative samples
 * of a conceptual embedding space and do NOT assert additional corpus rows.
 */
const particles = [
  ...Array.from({length:34},(_,i) => ({center:[.76,.53] as Pt, i, group:0})),
  ...Array.from({length:32},(_,i) => ({center:[-.55,.82] as Pt, i, group:1})),
  ...Array.from({length:22},(_,i) => ({center:[-.82,-.58] as Pt, i, group:2})),
].map(({center,i,group})=>{
  const theta=i*2.399963229728653+group;
  const radius=(.07+Math.sqrt((i+.5)/35)*.37);
  const p=projectToyVector([
    center[0]+Math.cos(theta)*radius,
    center[1]+Math.sin(theta)*radius*.65,
  ]);
  return { x:p[0],y:p[1],r:2.2+(i%4)*.85,group,index:i };
});
export function RagVectorSpace({ frame, mode }: { frame:number; mode:Mode }) {
  const f = Math.max(0,Math.trunc(frame));
  const isSearch=mode==="search";
  const query = projectToyVector(RAG_QUESTION_VECTOR);
  return <svg viewBox="0 0 1100 480" width="100%" height="100%"
    role="img" aria-label={isSearch
      ? "Illustrative projected semantic space. The gold question lands near PTO vectors. A short candidate-search trail explores C03, C04, C05 and C01, then considers C02."
      : "Illustrative projected semantic embedding space. Similar handbook passages appear in nearby clusters. Each highlighted location is an actual toy vector with a preserved source ID."}
    preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="rag-space-plane" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#6a83ec" stopOpacity=".17" />
        <stop offset=".52" stopColor="#354bc0" stopOpacity=".12" />
        <stop offset="1" stopColor="#3a8ea7" stopOpacity=".055" />
      </linearGradient>
      <radialGradient id="rag-space-orb">
        <stop stopColor="#a29bff" stopOpacity=".22"/>
        <stop offset="1" stopColor="#a29bff" stopOpacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="691" cy="303" rx="393" ry="198" fill="url(#rag-space-orb)" />
    <path d="M 150 350 L 420 74 L 1080 194 L 790 467 Z"
      fill="url(#rag-space-plane)" stroke="#638ab4" strokeOpacity=".40"
      strokeWidth="2" />
    <path d="M 420 74 V 24 M 420 74 L 1080 194 M 420 74 L 150 350"
      fill="none" stroke="#89a8d0" strokeWidth="2" strokeOpacity=".62" />
    <path d="M 420 24 l -7 10 14 0 z M 1080 194 l -16 -9 -3 13 z M 150 350 l 13 -3 -7 -11 z"
      fill="#9ebbf4" opacity=".75" />
    {particles.map(p=>{
      const t=arrive(f,17+p.index*.9+(p.group*6),30);
      const origin=projectToyVector(([.05,.1] as Pt));
      const x=origin[0]*(1-t)+p.x*t;
      const y=origin[1]*(1-t)+p.y*t;
      return <circle key={p.group+"-"+p.index} cx={x} cy={y}
        r={p.r*(.7+.3*t)} fill={p.group===0?C.mint:p.group===1?C.blue:C.violet}
        opacity={.10+t*(p.group===0?.35:.24)} />;
    })}
    <g opacity={arrive(f,34)}>
      <text x="909" y="410" fill={C.mint} fontSize="20" fontWeight="680"
        fontFamily="'Geist Variable',sans-serif">PTO</text>
      <text x="445" y="56" fill={C.blue} fontSize="19"
        fontFamily="'Geist Variable',sans-serif">POLICIES</text>
      <text x="118" y="407" fill={C.violet} fontSize="18"
        fontFamily="'Geist Variable',sans-serif">TRAVEL</text>
    </g>
    {isSearch && <>
      <g opacity={arrive(f,18)}>
        <circle cx={query[0]} cy={query[1]} r="44" fill={C.gold} fillOpacity=".08" />
        <circle cx={query[0]} cy={query[1]} r="27" stroke={C.gold}
          fill="none" strokeWidth="2.6" strokeOpacity=".81" />
        <circle cx={query[0]} cy={query[1]} r="9" fill={C.gold} />
        <text x={query[0]+37} y={query[1]-28} fill={C.gold} fontSize="23"
          fontWeight="700" fontFamily="'Geist Variable',sans-serif">QUESTION</text>
      </g>
      {steps.map(({from,to,at,len})=>{
        const a=source.get(from)!.point,b=source.get(to)!.point;
        const t=arrive(f,at,len);
        const p=pointOnPath(between(from+to,a,b),t);
        return <g key={from+to} opacity={arrive(f,at-8,14)}>
          <line x1={a[0]} y1={a[1]} x2={a[0]+(b[0]-a[0])*t}
            y2={a[1]+(b[1]-a[1])*t} stroke={C.gold}
            strokeOpacity=".8" strokeWidth="2.7" strokeDasharray="7 7"/>
          {f>=at&&f<=at+len&&<>
            <circle cx={p.x} cy={p.y} r="18" fill={C.gold} opacity=".15" />
            <circle cx={p.x} cy={p.y} r="5.5" fill={C.gold} />
          </>}
        </g>;
      })}
    </>}
    {sources.map((item,i)=>{
      const pt=item.point;
      const selected=isSearch && f>=290 && (item.id==="C01"||item.id==="C02");
      const considered=isSearch && controls.includes(item.id as typeof controls[number]) &&
        f>=65+Math.max(0,controls.indexOf(item.id as typeof controls[number]))*58;
      const t=arrive(f,34+i*10,24);
      const emphasis=selected?C.mint:considered?C.gold:item.id==="C01"||item.id==="C02"?C.mint:C.blue;
      const label=tagOffsets[item.id];
      return <g key={item.id} opacity={t}>
        <circle cx={pt[0]} cy={pt[1]} r={selected?29:21}
          fill={emphasis} fillOpacity={selected?.11:.06} />
        <circle cx={pt[0]} cy={pt[1]} r={selected?14:10}
          fill={emphasis} fillOpacity=".23" stroke={emphasis} strokeWidth="2.8" />
        <circle cx={pt[0]} cy={pt[1]} r="5" fill={emphasis} />
        <text x={pt[0]+label[0]} y={pt[1]+label[1]}
          fill={emphasis} fontSize="20" fontWeight="720"
          fontFamily="ui-monospace,monospace">{item.id}</text>
      </g>;
    })}
    <text x="685" y="454" fill={C.soft} fontSize="16"
      fontFamily="ui-monospace,monospace">CONCEPTUAL 2D PROJECTION</text>
  </svg>;
}
