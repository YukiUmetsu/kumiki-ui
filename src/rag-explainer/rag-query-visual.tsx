/** Query-time choreography: same semantic IDs from search → embedding →
 * candidate traversal → source text lookup → LLM prompt → cited answer.
 * All timing is derived from the ES1 local frame; no requestAnimationFrame or
 * independent browser animations. Uses Kumiki DiagramStage in the vector view.
 */
import type { ReactNode } from "react";
import { pointOnPath, pathToSvgD } from "../../registry/motion/paths";
import type { MotionPath } from "../../registry/motion/paths";
import { RAG_CHUNKS, RAG_EXAMPLE_TRACE, RAG_QUESTION, RAG_QUESTION_VECTOR } from "./rag-domain";
import { RagIndexNetwork } from "./rag-index-network";
import { RagPipelineDiagram } from "./rag-pipeline";
import type { RagChapterId } from "./rag-production";

const K = {
  white: "#ecf7fc", soft: "#acc3d3", faint: "#7c9caf", blue: "#87b9fd",
  gold: "#ffd08c", mint: "#78ebd6", lilac: "#b5a9ff", ink: "#0b1e2d",
  surface: "#132d40", edge: "#41687d",
};
const F = "'Geist Variable', Inter, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const ramp = (x: number) => { const a = Math.max(0, Math.min(1, x)); return a * a * (3 - 2 * a); };
const reveal = (frame: number, at: number, length = 30) => ramp((frame - at) / length);
function T({ x, y, children, size = 24, color = K.white, weight = 530,
  mono = false, anchor = "start" }: {
  x: number; y: number; children: ReactNode; size?: number; color?: string;
  weight?: number; mono?: boolean; anchor?: "start" | "middle" | "end";
}) {
  return <text x={x} y={y} fill={color} fontSize={size}
    fontWeight={weight} fontFamily={mono ? MONO : F}
    textAnchor={anchor}>{children}</text>;
}
function Appear({ f, at, children, dx = 0, dy = 14 }: {
  f: number; at: number; children: ReactNode; dx?: number; dy?: number;
}) {
  const a = reveal(f, at);
  return <g opacity={a} transform={"translate(" + dx * (1-a) + " " + dy * (1-a) + ")"}>
    {children}
  </g>;
}
function Surface({ x, y, w, h, children, accent = K.lilac, radius = 22 }: {
  x: number; y: number; w: number; h: number; children?: ReactNode;
  accent?: string; radius?: number;
}) {
  return <g>
    <rect x={x} y={y} width={w} height={h} rx={radius}
      fill={K.surface} stroke={K.edge} strokeWidth="1.5" />
    <path d={"M " + (x + radius) + " " + (y + 1) + " H " + (x + w - radius)}
      stroke={accent} strokeWidth="2.5" fill="none" strokeOpacity=".9" />
    {children}
  </g>;
}
function Label({ x, y, text, color = K.blue }: {
  x: number; y: number; text: string; color?: string;
}) {
  const width = text.length * 12.5 + 48;
  return <g>
    <rect x={x} y={y} width={width} height="42" rx="21"
      fill={color} fillOpacity=".1" stroke={color} strokeOpacity=".46" />
    <T x={x + 24} y={y + 28} size={19} weight={650} color={color} mono>{text}</T>
  </g>;
}
function ContentLines({ x, y, value, width = 48, color = K.white, size = 23,
  gap = 33 }: { x: number; y: number; value: string; width?: number;
  color?: string; size?: number; gap?: number;
}) {
  const lines: string[] = [];
  for (const word of value.split(/\s+/)) {
    const last = lines.length - 1;
    if (last >= 0 && (lines[last].length + word.length + 1) <= width)
      lines[last] += " " + word;
    else lines.push(word);
  }
  return <>{lines.map((line, i) => <T key={i} x={x} y={y + i * gap}
    size={size} color={color}>{line}</T>)}</>;
}
function Route({ frame, at, duration, from, to, color = K.gold, glow = true }: {
  frame: number; at: number; duration: number;
  from: readonly [number, number]; to: readonly [number, number];
  color?: string; glow?: boolean;
}) {
  const path: MotionPath = {
    id: "rag-query-motion", kind: "cubic", closed: false,
    anchors: [
      { x: from[0], y: from[1],
        out: { x: from[0] + (to[0]-from[0])*.45, y: from[1] } },
      { x: to[0], y: to[1],
        in: { x: to[0] - (to[0]-from[0])*.42, y: to[1] } },
    ],
  };
  const active = frame >= at && frame <= at + duration;
  const progress = reveal(frame, at, duration);
  const point = pointOnPath(path, progress, { arcLength: true });
  return <g>
    <path d={pathToSvgD(path)} stroke={color} strokeOpacity=".24"
      strokeWidth="2.4" strokeDasharray="8 10" fill="none" />
    {active && <g>
      {glow && <circle cx={point.x} cy={point.y} r="23" fill={color} fillOpacity=".1" />}
      <circle cx={point.x} cy={point.y} r="7" fill={color} />
    </g>}
  </g>;
}
function VectorGlyph({ x, y, id, vector, gold = false }: {
  x: number; y: number; id: string; vector: readonly number[]; gold?: boolean;
}) {
  const color = gold ? K.gold : K.lilac;
  return <g>
    <rect x={x} y={y} width="302" height="76" rx="18"
      fill={K.ink} stroke={color} strokeOpacity=".65" strokeWidth="2" />
    <T x={x + 18} y={y + 31} mono size={20} color={color} weight={700}>{id}</T>
    <T x={x + 18} y={y + 59} mono size={21} color={K.white}>
      {"[" + vector.map(value => value.toFixed(2)).join(", ") + "]"}
    </T>
    <path d={"M " + (x + 249) + " " + (y + 21) + " l 25 12 -25 12"}
      stroke={color} strokeWidth="2" fill="none" opacity=".65" />
  </g>;
}
export function RagQueryEmbedding({ frame: f }: { frame: number }) {
  const question = RAG_QUESTION;
  const tokens = question.split(" ");
  return <>
    <T x={83} y={107} size={40} weight={650}>Give the question a vector, too.</T>
    <T x={84} y={148} size={22} color={K.soft}>Same embedding space, different input.</T>
    <Route frame={f} at={0} duration={59} from={[1240,535]} to={[320,350]} color={K.gold} />
    <Appear f={f} at={51}>
      <Surface x={69} y={240} w={500} h={220} accent={K.gold}>
        <Label x={94} y={263} text="QUERY" color={K.gold} />
        <ContentLines x={98} y={355} value={question} width={31} size={27} gap={38} />
      </Surface>
    </Appear>
    <Route frame={f} at={75} duration={60} from={[578,349]} to={[700,349]} />
    <Appear f={f} at={114}>
      <Surface x={715} y={215} w={349} h={299} accent={K.lilac}>
        <Label x={737} y={238} text="EMBEDDING MODEL" color={K.lilac} />
        {tokens.slice(0, 7).map((word, i) => {
          const lit = reveal(f, 85 + i*11, 18);
          const x=760 + (i%4)*74, y=350+Math.floor(i/4)*59;
          return <g key={word+i}>
            <circle cx={x} cy={y} r={6+lit*7} fill={lit>.5 ? K.lilac : K.blue}
              opacity={.3+lit*.6} />
            {i<6 && <path d={"M "+x+" "+y+" l 56 18"} fill="none"
              stroke={K.lilac} strokeWidth="1.6" strokeOpacity={.15+lit*.22} />}
          </g>;
        })}
        <T x={740} y={482} size={19} color={K.soft}>Illustrative representation</T>
      </Surface>
    </Appear>
    <Route frame={f} at={164} duration={38} from={[1071,352]} to={[1140,352]}
      color={K.lilac} />
    <Appear f={f} at={199}>
      <VectorGlyph x={1154} y={308} id="QUERY VECTOR"
        vector={RAG_QUESTION_VECTOR} gold />
      <T x={1158} y={427} size={22} color={K.mint}>Ready for similarity search</T>
    </Appear>
    <g opacity={reveal(f, 214, 20)}>
      <path d="M 1256 452 V 539 H 842" stroke={K.gold} strokeWidth="2"
        strokeOpacity=".5" fill="none" strokeDasharray="7 9" />
      <T x={864} y={574} size={20} color={K.soft}>
        Query and chunks are encoded by compatible models.
      </T>
    </g>
  </>;
}
export function RagVectorRetrieval({ frame: f }: { frame: number }) {
  const scores = RAG_EXAMPLE_TRACE.candidates;
  const latestWalk = RAG_EXAMPLE_TRACE.traversed;
  return <>
    <T x={73} y={100} size={38} weight={650}>Inside the vector database</T>
    <T x={73} y={139} size={21} color={K.soft}>
      Neighbor traversal → measured similarity → ranked source IDs
    </T>
    <g opacity={reveal(f, 4)}>
      <Surface x={58} y={169} w={1077} h={413} accent={K.lilac} />
      <foreignObject x="81" y="189" width="1029" height="370">
        <div style={{ width: "100%", height: "100%" }}>
          <RagIndexNetwork mode="retrieve" frame={f} />
        </div>
      </foreignObject>
    </g>
    <Route frame={f} at={0} duration={62}
      from={[1305,348]} to={[235,427]} color={K.gold} />
    <g opacity={reveal(f, 39, 22)}>
      <T x={102} y={202} size={18} color={K.gold} mono>QUERY VECTOR ARRIVES</T>
    </g>
    <Surface x={1166} y={170} w={368} h={415} accent={K.gold}>
      <Label x={1188} y={192} text="COSINE SIMILARITY" color={K.gold} />
      <g opacity={reveal(f, 95, 22) * (1 - reveal(f, 259, 22))}>
        <T x={1197} y={258} color={K.soft} size={20}>Compare vector direction.</T>
        <line x1="1229" y1="438" x2="1492" y2="438"
          stroke={K.faint} strokeOpacity=".4" />
        <line x1="1229" y1="438" x2="1229" y2="288"
          stroke={K.faint} strokeOpacity=".4" />
        <line x1="1229" y1="438"
          x2={1229 + RAG_QUESTION_VECTOR[0]*240}
          y2={438 - RAG_QUESTION_VECTOR[1]*240}
          stroke={K.gold} strokeWidth="4" strokeLinecap="round" />
        <line x1="1229" y1="438"
          x2={1229 + RAG_CHUNKS[0].embedding[0]*240}
          y2={438 - RAG_CHUNKS[0].embedding[1]*240}
          stroke={K.mint} strokeWidth="4" strokeLinecap="round" />
        <circle cx="1229" cy="438" r="6" fill={K.white} />
        <T x="1436" y="289" size={18} color={K.gold} mono>query</T>
        <T x="1436" y="369" size={18} color={K.mint} mono>C01</T>
        <T x="1195" y="499" size={19} color={K.white} mono>
          {"cos(q, C01) = " + scores[0].similarity.toFixed(3)}
        </T>
      </g>
      {scores.slice(0, 5).map((candidate, i) => {
        const at = 279 + i*13;
        const isHit = RAG_EXAMPLE_TRACE.hits.some(hit => hit.chunk.id === candidate.chunk.id);
        const bar = Math.max(0, candidate.similarity);
        return <g key={candidate.chunk.id} opacity={reveal(f, at, 24)}>
          <T x={1193} y={yRow(i)} size={21}
            color={isHit ? K.mint : K.soft} mono weight={isHit?740:480}>
            {candidate.chunk.id}
          </T>
          <rect x="1270" y={yRow(i)-19} width="153" height="13" rx="6.5"
            fill="#294459" />
          <rect x="1270" y={yRow(i)-19} width={153*bar} height="13"
            rx="6.5" fill={isHit ? K.mint : K.lilac} opacity=".9" />
          <T x={1435} y={yRow(i)} size={20} color={isHit ? K.mint : K.white}
            mono>{candidate.similarity.toFixed(2)}</T>
        </g>;
      })}
      <g opacity={reveal(f, 367, 23)}>
        <rect x="1189" y="530" width="319" height="38" rx="14"
          fill="#173d3a" stroke={K.mint} strokeOpacity=".65" />
        <T x={1203} y={555} size={18} weight={690}
          color={K.mint}>TOP 2 → C01 + C02</T>
      </g>
    </Surface>
    <g opacity={reveal(f, 75, 24)}>
      <Label x={75} y={588} text="EXAMPLE ANN GRAPH" color={K.lilac} />
      <T x={382} y={615} size={18} color={K.faint}>
        Walk: {latestWalk.join(" → ")} · actual index implementation may differ
      </T>
    </g>
  </>;
}
function yRow(i: number) { return 290 + i*48; }
export function RagSourceRecovery({ frame: f }: { frame: number }) {
  const first = RAG_EXAMPLE_TRACE.prompt.context[0];
  const second = RAG_EXAMPLE_TRACE.prompt.context[1];
  const contexts = [first,second];
  return <>
    <T x={85} y={106} size={41} weight={650}>The vectors point back to words.</T>
    <T x={86} y={147} size={22} color={K.soft}>
      Retrieve source passages, not the embedding coordinates.
    </T>
    <Route frame={f} at={0} duration={47}
      from={[1393,348]} to={[280,368]} color={K.mint} />
    <Route frame={f} at={12} duration={45}
      from={[1393,405]} to={[280,460]} color={K.blue} />
    <Appear f={f} at={44}>
      <Surface x={75} y={207} w={398} h={324} accent={K.lilac}>
        <Label x={96} y={225} text="VECTOR HITS" color={K.lilac} />
        {RAG_EXAMPLE_TRACE.hits.map((hit, i) => <g key={hit.chunk.id}>
          <VectorGlyph x={104} y={311 + i*105} id={hit.chunk.id}
            vector={hit.chunk.embedding} />
        </g>)}
      </Surface>
    </Appear>
    <Appear f={f} at={66}>
      <Surface x={600} y={254} w={289} h={213} accent={K.blue}>
        <Label x={625} y={279} text="SOURCE LOOKUP" color={K.blue} />
        <T x={627} y={378} size={23} color={K.white}>ID → original text</T>
        <T x={627} y={414} size={19} color={K.soft}>+ document metadata</T>
      </Surface>
    </Appear>
    <Route frame={f} at={62} duration={75} from={[485,376]} to={[587,376]}
      color={K.lilac} />
    <Route frame={f} at={148} duration={60} from={[903,376]} to={[1007,376]}
      color={K.blue} />
    {contexts.map((ctx, i) => <Appear key={ctx.id} f={f} at={169+i*57}
      dx={12} dy={0}>
      <Surface x={1021} y={188+i*207} w={495} h={192}
        accent={i===0?K.mint:K.blue}>
        <Label x={1040} y={205+i*207} text={ctx.id+" / "+ctx.source.split(" ").slice(-1)[0]}
          color={i===0?K.mint:K.blue} />
        <ContentLines x={1043} y={280+i*207} value={ctx.text}
          width={35} size={21} gap={29} />
        <T x={1041} y={359+i*207} size={16} color={K.soft}>
          Original extracted PDF passage
        </T>
      </Surface>
    </Appear>)}
    <g opacity={reveal(f, 257, 20)}>
      <T x={644} y={579} size={21} color={K.mint}>
        The LLM receives human-readable evidence.
      </T>
    </g>
  </>;
}
const ANSWER = "The example handbook permits up to five unused days to roll over.";
export function RagGenerateAnswer({ frame: f }: { frame: number }) {
  const contexts = RAG_EXAMPLE_TRACE.prompt.context;
  const words = ANSWER.split(" ");
  const length = Math.min(words.length, Math.max(0, Math.floor((f-270)/5)));
  return <>
    <T x={78} y={104} size={40} weight={650}>Assemble the prompt. Then generate.</T>
    <T x={79} y={142} size={22} color={K.soft}>
      The LLM sees retrieved source text alongside the original question.
    </T>
    <Surface x={72} y={180} w={978} h={423} accent={K.blue}>
      <Label x={96} y={198} text="PROMPT / AUGMENTED CONTEXT" color={K.blue} />
      <Appear f={f} at={4}>
        <T x={101} y={285} size={19} color={K.gold} mono>USER QUESTION</T>
        <T x={101} y={324} size={25} color={K.white} weight={590}>{RAG_QUESTION}</T>
      </Appear>
      {contexts.map((ctx, i) => <Appear key={ctx.id} f={f} at={55+i*50}>
        <rect x={97} y={355+i*107} width="924" height="100" rx="15"
          fill={i===0 ? "#19443e" : "#1a364c"}
          stroke={i===0 ? K.mint : K.blue} strokeOpacity=".57" />
        <T x={115} y={388+i*107} mono size={19} color={i===0 ? K.mint : K.blue}
          weight={700}>{ctx.id} / {ctx.source.split(" ").slice(-1)[0]}</T>
        <ContentLines x={314} y={389+i*107} value={ctx.text}
          width={63} size={19} gap={26} />
      </Appear>)}
    </Surface>
    <Route frame={f} at={172} duration={70} from={[1062,389]} to={[1135,389]}
      color={K.lilac} />
    <Appear f={f} at={198}>
      <Surface x={1150} y={228} w={370} h={129} accent={K.lilac}>
        <Label x={1171} y={247} text="LANGUAGE MODEL" color={K.lilac} />
        <T x={1173} y={333} size={21} color={K.white}>Context → response</T>
      </Surface>
    </Appear>
    <Appear f={f} at={262}>
      <Surface x={1082} y={402} w={447} h={203} accent={K.mint}>
        <Label x={1101} y={420} text="ANSWER" color={K.mint} />
        <ContentLines x={1102} y={495} value={words.slice(0,length).join(" ")}
          width={36} size={21} gap={28} />
        {f >= 347 && <g opacity={reveal(f, 347, 24)}>
          <rect x="1103" y="557" width="285" height="30" rx="11"
            fill={K.mint} fillOpacity=".1" stroke={K.mint} strokeOpacity=".52" />
          <T x={1117} y={578} size={17} mono color={K.mint}>
            [Handbook §4] ↗ C01
          </T>
        </g>}
      </Surface>
    </Appear>
    {f >= 350 && <g opacity={reveal(f, 350, 25)}>
      <path d="M 1104 557 C 1070 608 925 626 669 607"
        stroke={K.mint} strokeWidth="2.2" fill="none" strokeDasharray="7 10"
        strokeOpacity=".56" />
      <T x={412} y={636} size={19} color={K.soft}>
        Citation links the answer to the original source.
      </T>
    </g>}
  </>;
}
export function RagFinalRecap({ frame: f }: { frame: number }) {
  return <>
    <T x={86} y={104} size={40} weight={650}>That is Retrieval-Augmented Generation.</T>
    <T x={88} y={143} size={22} color={K.soft}>
      Prepare knowledge once. Retrieve evidence for every question.
    </T>
    <g opacity={reveal(f, 4, 30)}>
      <foreignObject x="90" y="174" width="1405" height="402">
        <div style={{ width: "100%", height: "100%" }}>
          <RagPipelineDiagram frame={f} />
        </div>
      </foreignObject>
    </g>
    <Appear f={f} at={132}>
      <Label x={83} y={587} text="RETRIEVE → AUGMENT → GENERATE" color={K.mint} />
      <T x={83} y={643} size={20} color={K.soft}>
        Refresh the index without retraining the LLM. Verify cited evidence.
      </T>
    </Appear>
  </>;
}
export function RagQueryVisual({ id, frame }: {
  id: RagChapterId; frame: number;
}) {
  switch (id) {
    case "query-embed": return <RagQueryEmbedding frame={frame} />;
    case "retrieve": return <RagVectorRetrieval frame={frame} />;
    case "evidence": return <RagSourceRecovery frame={frame} />;
    case "generate": return <RagGenerateAnswer frame={frame} />;
    case "recap": return <RagFinalRecap frame={frame} />;
    default: return null;
  }
}
