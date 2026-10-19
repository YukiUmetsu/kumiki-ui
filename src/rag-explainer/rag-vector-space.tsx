/** Spatial embedding illustration used by BOTH index creation and query retrieval.
 * Inspired by the visual grammar of projected vector spaces (many points,
 * coherent semantic neighborhoods, depth plane), not a decorative node graph.
 *
 * Points for C01..C06 derive from rag-domain.ts toy vectors. Background points
 * are deterministic context particles; NOT extra indexed source records.
 * The 2D projection is illustrative, not a claim about real ANN/DB internals.
 */
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
const legend = [
  { id: "PTO", color: C.mint },
  { id: "Benefits", color: C.blue },
  { id: "Travel", color: C.violet },
  { id: "Other", color: C.soft },
] as const;
export function ragSemanticDomain(id: string): typeof legend[number]["id"] {
  if (id === "C01" || id === "C02") return "PTO";
  if (id === "C06") return "Benefits";
  if (id === "C03") return "Travel";
  return "Other";
}
const domainColor = (id: string) =>
  legend.find(item => item.id === ragSemanticDomain(id))!.color;
const tagOffsets: Record<string, Pt> = {
  C01: [13,43], C02: [17,-18], C03: [-31,42],
  C04: [-50,-26], C05: [-17,-27], C06: [-18,-27],
};
/** Deterministic thematic neighborhoods. These dots are decorative samples
 * of a conceptual embedding space and do NOT assert additional corpus rows.
 */
const particles = [
  ...Array.from({length:34},(_,i) => ({center:[.76,.53] as Pt, i, group:0})),
  ...Array.from({length:32},(_,i) => ({center:[-.55,.82] as Pt, i, group:1})),
  ...Array.from({length:22},(_,i) => ({center:[-.82,-.58] as Pt, i, group:2})),
  ...Array.from({length:17},(_,i) => ({center:[.05,.84] as Pt, i, group:3})),
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
  const f=Math.max(0,Math.trunc(frame));
  const search=mode==="search";
  const query=projectToyVector(RAG_QUESTION_VECTOR);
  return <svg viewBox="0 0 1100 480" width="100%" height="100%"
    preserveAspectRatio="xMidYMid meet" role="img"
    aria-label={search
      ? "Semantic neighborhoods: mint PTO sources C01 and C02 sit near the gold question. Relevant sources are selected in similarity order. Benefits, Travel, and Other sources remain separate."
      : "Vector-space neighborhoods with a color legend for PTO, Benefits, Travel and Other. Sources C01 and C02 share the PTO color."}>
    <defs>
      <linearGradient id="rag-semantic-floor" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#6072d1" stopOpacity=".19" />
        <stop offset=".55" stopColor="#4c67ac" stopOpacity=".10" />
        <stop offset="1" stopColor="#48a0ad" stopOpacity=".055" />
      </linearGradient>
      <radialGradient id="rag-semantic-halo">
        <stop stopColor="#75e2d5" stopOpacity=".22" />
        <stop offset="1" stopColor="#75e2d5" stopOpacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="788" cy="306" rx="240" ry="135" fill="url(#rag-semantic-halo)" />
    <path d="M 150 350 L 420 74 L 1080 194 L 790 467 Z"
      fill="url(#rag-semantic-floor)" stroke="#6487b5"
      strokeOpacity=".42" strokeWidth="1.8" />
    <path d="M 420 74 V 24 M 420 74 L 1080 194 M 420 74 L 150 350"
      fill="none" stroke="#8ea6d0" strokeWidth="1.7" strokeOpacity=".56" />
    {particles.map(p=>{
      const t=search?1:arrive(f,15+p.index*.7+p.group*8,28);
      const origin=projectToyVector([.05,.10]);
      const x=origin[0]*(1-t)+p.x*t;
      const y=origin[1]*(1-t)+p.y*t;
      const color=[C.mint,C.blue,C.violet,C.soft][p.group];
      return <circle key={p.group+"-"+p.index} cx={x} cy={y}
        r={p.r} fill={color} opacity={.13+t*.36}/>;
    })}
    {sources.map((item,i)=>{
      const pt=item.point;
      const rank=RAG_EXAMPLE_TRACE.selected.indexOf(item.id);
      const selected=search&&rank>=0&&f>=110+rank*45;
      const t=search?1:arrive(f,34+i*9,22);
      const emphasis=domainColor(item.id);
      const label=tagOffsets[item.id];
      return <g key={item.id} opacity={t}>
        {selected&&<circle cx={pt[0]} cy={pt[1]} r={33}
          fill={C.mint} fillOpacity=".13" stroke={C.mint}
          strokeWidth="2.5" strokeOpacity=".86"/>}
        <circle cx={pt[0]} cy={pt[1]} r={12}
          fill={emphasis} fillOpacity=".21" stroke={emphasis} strokeWidth="2.5"/>
        <circle cx={pt[0]} cy={pt[1]} r="5.5" fill={emphasis}/>
        <text x={pt[0]+label[0]} y={pt[1]+label[1]}
          fill={emphasis} fontSize="21" fontWeight="720"
          fontFamily="ui-monospace,monospace">{item.id}</text>
      </g>;
    })}
    {search&&<g opacity={arrive(f,12,25)}>
      <circle cx={query[0]} cy={query[1]} r="24" fill="none"
        stroke={C.gold} strokeWidth="3" />
      <circle cx={query[0]} cy={query[1]} r="7" fill={C.gold} />
      <circle cx={query[0]} cy={query[1]} r={20+38*arrive(f,45,88)}
        fill="none" stroke={C.gold}
        strokeOpacity={.45*(1-arrive(f,45,88))} strokeWidth="3" />
    </g>}
    <g aria-label="Semantic-domain legend">
      {legend.map((entry,i)=><g key={entry.id} transform={"translate("+(70+i*242)+" 33)"}>
        <circle r="7" fill={entry.color}/>
        <text x="16" y="6" fill={C.white} opacity=".88" fontSize="20"
          fontFamily="'Geist Variable',Inter,sans-serif">{entry.id}</text>
      </g>)}
      {search&&<g transform="translate(893 67)">
        <circle r="7" fill={C.gold}/>
        <text x="15" y="6" fill={C.gold} fontSize="19"
          fontFamily="'Geist Variable',Inter,sans-serif">Question</text>
      </g>}
    </g>
  </svg>;
}
