/** Semantic-vector teaching space.
 *
 * A true 3D *illustration*: each point has X, depth, and independent height.
 * Deterministic camera projection provides depth-dependent scale, vertical
 * source-to-floor stems, and parallax during one authored query-time push.
 * The six highlighted document points use the sample corpus; background
 * particles are a deliberately synthetic semantic-domain cloud.
 *
 * This SVG needs no WebGL or independently ticking renderer: the ES1 frame
 * determines every point and camera pose, including direct frame seeking.
 */
import { RAG_CHUNKS, RAG_EXAMPLE_TRACE, RAG_QUESTION_VECTOR } from "./rag-domain";

type Mode = "index" | "search";
type Vec3 = readonly [number, number, number];
type Vec2 = readonly [number, number];

const C = {
  white: "#F5F9FF", subdued: "#AFC3D4",
  pto: "#45EAC5", benefits: "#63B4FF",
  travel: "#AB91FF", payroll: "#FF76AB",
  holidays: "#FFA451", query: "#FFE18A",
} as const;
const ease = (n: number) => {
  const x = Math.max(0, Math.min(1, n));
  return x*x*(3-2*x);
};
const reveal = (f: number, at: number, frames = 24) => ease((f-at)/frames);
const domains = [
  { id:"PTO", color:C.pto, center:[.78,.53,.76] as Vec3 },
  { id:"Travel", color:C.travel, center:[-.82,-.57,1.38] as Vec3 },
  { id:"Payroll", color:C.payroll, center:[-.45,.89,.75] as Vec3 },
  { id:"Holidays", color:C.holidays, center:[.30,.95,1.66] as Vec3 },
  { id:"Benefits", color:C.benefits, center:[-.10,.99,1.18] as Vec3 },
] as const;
export type RagSemanticDomain = typeof domains[number]["id"];
export function ragSemanticDomain(id: string): RagSemanticDomain {
  if (id === "C01" || id === "C02") return "PTO";
  if (id === "C03") return "Travel";
  if (id === "C04") return "Payroll";
  if (id === "C05") return "Holidays";
  return "Benefits";
}
const domain = (id: string) => domains.find(d => d.id === ragSemanticDomain(id))!;

const heights: Record<string, number> = {
  C01:.63, C02:.90, C03:1.32, C04:.82, C05:1.45, C06:1.22,
};
const queryHeight = .66;
/** A camera with real yaw-dependent parallax across 3D height and depth. */
function project3D(point: Vec3, yaw: number) {
  const [x, depth, elevation] = point;
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  const u = x*cos + depth*sin;
  const away = depth*cos - x*sin;
  const perspective = 1 + away*.105;
  return {
    x: 570 + u*291*perspective,
    y: 350 - away*66 - elevation*92,
    scale: Math.max(.70, Math.min(1.22, perspective)),
    depth: away,
  };
}
const baseYaw = .43;
/** Kept as an exported geometry contract for source/query proximity tests. */
export function projectToyVector(vector: readonly number[]): Vec2 {
  const height = .63 + .11*Math.sin(vector[0]*2.2 + vector[1]*1.1);
  const p = project3D([vector[0],vector[1],height],baseYaw);
  return [p.x,p.y];
}
export function ragVectorFocusAt(frame: number, search: boolean) {
  const progress = search ? reveal(frame,68,100) : 0;
  const zoom = 1 + .52*progress;
  const yaw = baseYaw + .20*progress;
  const q = project3D([RAG_QUESTION_VECTOR[0],RAG_QUESTION_VECTOR[1],queryHeight],yaw);
  return {
    progress, zoom, yaw,
    tx: progress*(680-zoom*q.x),
    ty: progress*(259-zoom*q.y),
  };
}
const records = RAG_CHUNKS.map(chunk => ({
  ...chunk,
  position: [chunk.embedding[0],chunk.embedding[1],heights[chunk.id]] as Vec3,
}));
/** Domain-specific 3D scatter with independent elevation, not points on a plane. */
const cloud = domains.flatMap((d,group) =>
  Array.from({length:group===0?43:29},(_,i) => {
    const angle=i*2.3999632297 + group*1.1;
    const radius=(.055+Math.sqrt((i+.8)/45)*.31);
    return {
      id:group+"-"+i, group,
      position:[
        d.center[0]+Math.cos(angle)*radius,
        d.center[1]+Math.sin(angle)*radius*.77,
        Math.max(.12,d.center[2]+Math.sin(i*1.77+group*.9)*.62),
      ] as Vec3,
      size:2.3+(i%5)*.60,
    };
  }),
);
/** Exported for cheap, deterministic depth-invariant tests. */
export function ragCloudHeightRange() {
  const hs=cloud.map(p => p.position[2]);
  return { min:Math.min(...hs), max:Math.max(...hs), count:cloud.length };
}
function cloudColor(group:number) { return domains[group].color; }
export function RagVectorSpace({frame,mode}:{frame:number;mode:Mode}) {
  const f=Math.max(0,Math.trunc(frame));
  const searching=mode==="search";
  const camera=ragVectorFocusAt(f,searching);
  const anchor=(p:Vec3)=>project3D(p,camera.yaw);
  const q=anchor([RAG_QUESTION_VECTOR[0],RAG_QUESTION_VECTOR[1],queryHeight]);
  const cloudDraw=cloud.map(p=>({...p,projected:anchor(p.position)}))
    .sort((a,b)=>b.projected.depth-a.projected.depth);
  const selected=RAG_EXAMPLE_TRACE.selected;
  const legendX=[45,249,448,655,870];
  const volumeCorners:Vec3[]=[
    [-1.32,-1.25,0],[1.31,-1.25,0],[1.31,1.33,0],[-1.32,1.33,0],
    [-1.32,-1.25,2.05],[1.31,-1.25,2.05],
    [1.31,1.33,2.05],[-1.32,1.33,2.05],
  ];
  const corners=volumeCorners.map(anchor);
  const segments=[
    [0,1],[1,2],[2,3],[3,0],
    [0,4],[1,5],[2,6],[3,7],
    [4,5],[5,6],[6,7],[7,4],
  ];
  return <svg viewBox="0 0 1100 480" width="100%" height="100%"
    preserveAspectRatio="xMidYMid meet" role="img"
    aria-label={searching
      ? "A three-dimensional semantic cloud. The camera moves into the PTO cluster near the question and selects nearby chunk IDs C01 and C02."
      : "An elevated three-dimensional point cloud with separate PTO, Travel, Payroll, Holidays and Benefits neighborhoods."}>
    <defs>
      <radialGradient id="rag-volume-bloom">
        <stop stopColor="#4d849d" stopOpacity=".21"/>
        <stop offset="1" stopColor="#182e40" stopOpacity="0"/>
      </radialGradient>
      <radialGradient id="rag-point-highlight">
        <stop stopColor="#f3ffff" stopOpacity=".64"/>
        <stop offset="1" stopColor="#f3ffff" stopOpacity="0"/>
      </radialGradient>
    </defs>
    <g transform={"translate("+camera.tx+" "+camera.ty+") scale("+camera.zoom+")"}>
      <ellipse cx="570" cy="280" rx="530" ry="205" fill="url(#rag-volume-bloom)" />
      <g stroke="#7e9bb6" fill="none" strokeWidth="1.4">
        {segments.map(([a,b],i)=><line key={i}
          x1={corners[a].x} y1={corners[a].y}
          x2={corners[b].x} y2={corners[b].y}
          opacity={i<4?.22:i<8?.35:.12}/>)}
      </g>
      <g opacity=".29">
        {[-1,-.5,0,.5,1].map(v=>{
          const a=anchor([v,-1.25,0]),b=anchor([v,1.33,0]);
          const c=anchor([-1.32,v,0]),d=anchor([1.31,v,0]);
          return <g key={v} stroke="#6d8f9f" strokeWidth=".8">
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>
            <line x1={c.x} y1={c.y} x2={d.x} y2={d.y}/>
          </g>;
        })}
      </g>
      {cloudDraw.map(p=>{
        const lit=searching?1:reveal(f,17+p.group*7+(Number(p.id.split("-")[1])%14)*2,28);
        const point=p.projected;
        const color=cloudColor(p.group);
        return <g key={p.id} opacity={lit}>
          <circle cx={point.x} cy={point.y}
            r={p.size*point.scale} fill={color}
            opacity={.22 + point.scale*.30}/>
          {(p.id.endsWith("-4")||p.id.endsWith("-19"))&&<circle
            cx={point.x} cy={point.y} r={9*point.scale}
            fill="url(#rag-point-highlight)" opacity=".23"/>}
        </g>;
      })}
      {records.map((item,i)=>{
        const p=anchor(item.position);
        const floor=anchor([item.position[0],item.position[1],0]);
        const color=domain(item.id).color;
        const rank=selected.indexOf(item.id);
        const active=searching && rank>=0 && f>=110+rank*55;
        const visible=searching?1:reveal(f,22+i*9,24);
        const isNear=searching && camera.progress>.65;
        const labelOffset:Record<string,Vec2>={
          C01:[20,42],C02:[-88,-14],C03:[-38,36],
          C04:[-57,-22],C05:[20,-14],C06:[-67,-14],
        };
        const [lx,ly]=labelOffset[item.id];
        return <g key={item.id} opacity={visible}>
          <line x1={floor.x} y1={floor.y} x2={p.x} y2={p.y}
            stroke={color} strokeWidth="2" strokeOpacity=".23"
            strokeDasharray="4 7"/>
          <ellipse cx={floor.x} cy={floor.y} rx={11*p.scale}
            ry={4*p.scale} fill={color} fillOpacity=".16"/>
          {active&&<circle cx={p.x} cy={p.y} r={24*p.scale}
            fill={color} fillOpacity=".09" stroke={color}
            strokeWidth="2.4" strokeOpacity=".9"/>}
          <circle cx={p.x} cy={p.y} r={11*p.scale}
            fill="#102b3b" stroke={color} strokeWidth="3.3"/>
          <circle cx={p.x} cy={p.y} r={4.4*p.scale} fill={color}/>
          {!isNear||rank>=0?
          <text x={p.x+lx} y={p.y+ly}
            fontFamily="ui-monospace,monospace" fontWeight="760"
            fontSize="20" fill={color}>{item.id}</text>:null}
        </g>;
      })}
      {searching&&<g opacity={reveal(f,15,26)}>
        <circle cx={q.x} cy={q.y} r="18" fill="none"
          stroke={C.query} strokeWidth="3.3"/>
        <circle cx={q.x} cy={q.y} r="5" fill={C.query}/>
        <circle cx={q.x} cy={q.y}
          r={18+33*reveal(f,37,87)}
          fill="none" stroke={C.query}
          strokeWidth="2" strokeOpacity={.44*(1-reveal(f,37,87))}/>
      </g>}
    </g>
    <g aria-label="Semantic topic colors">
      {domains.map((d,i)=><g key={d.id}
        transform={"translate("+legendX[i]+" 36)"}>
        <circle r="8" fill={d.color}/>
        <text x="19" y="7" fill={C.white} fontSize="20"
          fontWeight="540" fontFamily="'Geist Variable',Inter,sans-serif">
          {d.id}
        </text>
      </g>)}
      {searching&&<g transform="translate(943 73)">
        <circle r="7" fill={C.query}/>
        <text x="15" y="7" fill={C.query}
          fontSize="18" fontFamily="'Geist Variable',Inter,sans-serif">
          Question
        </text>
      </g>}
    </g>
  </svg>;
}
