/** Query-time choreography: same semantic IDs from search → embedding →
 * candidate traversal → source text lookup → LLM prompt → cited answer.
 * All timing is derived from the ES1 local frame; no requestAnimationFrame or
 * independent browser animations. Source identity is preserved across scenes.
 */
import type { ReactNode } from "react";
import { RAG_EXAMPLE_TRACE, RAG_QUESTION, RAG_QUESTION_VECTOR } from "./rag-domain";
import { RagVectorSpace } from "./rag-vector-space";
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

    <Appear f={f} at={12}>
      <Surface x={69} y={240} w={500} h={220} accent={K.gold}>
        <Label x={94} y={263} text="QUERY" color={K.gold} />
        <ContentLines x={98} y={355} value={question} width={31} size={27} gap={38} />
      </Surface>
    </Appear>
    <Appear f={f} at={70}>
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

      </Surface>
    </Appear>
    <Appear f={f} at={169}>
      <VectorGlyph x={1154} y={308} id="QUERY VECTOR"
        vector={RAG_QUESTION_VECTOR} gold />
    </Appear>

  </>;
}
/** A single projected semantic field is reused from indexing. Only the query
 * and the candidate route animate. Similarity and top-k appear AFTER the walk.
 */
export function RagVectorRetrieval({ frame: f }: { frame: number }) {
  return <>
    <T x={88} y={105} size={41} weight={650}>Find the closest meaning.</T>
    <T x={90} y={145} size={22} color={K.soft}>
      PTO neighbors are closest to the question.
    </T>
    <g opacity={reveal(f, 0, 19)}>
      <foreignObject x="65" y="173" width="1050" height="449">
        <div style={{ width: "100%", height: "100%" }}>
          <RagVectorSpace frame={f} mode="search" />
        </div>
      </foreignObject>
    </g>
    <g opacity={reveal(f, 280, 26)}>
      <Surface x={1164} y={237} w={360} h={282} accent={K.gold}>
        <Label x={1184} y={259} text="TOP 2 MATCHES" color={K.mint} />
        {RAG_EXAMPLE_TRACE.hits.map((hit, i) =>
          <g key={hit.chunk.id} opacity={reveal(f, 290+i*36, 22)}>
            <rect x={1187} y={341+i*79} width="313" height="67" rx="14"
              fill={i===0?"#18443e":"#163548"}
              stroke={i===0?K.mint:K.blue} strokeOpacity=".62" />
            <T x={1204} y={376+i*79} size={24} weight={740} color={i===0?K.mint:K.blue}>
              {hit.chunk.id}
            </T>
            <T x={1318} y={377+i*79} size={22} color={K.white} mono>
              {hit.similarity.toFixed(3)}
            </T>
          </g>
        )}
      </Surface>
    </g>

  </>;
}
/** Two focused beats: each selected vector ID unfolds into the exact source
 * passage it identifies. No fake network plumbing or permanently drawn lines.
 */
export function RagSourceRecovery({ frame: f }: { frame: number }) {
  const contexts=RAG_EXAMPLE_TRACE.prompt.context;
  const hits=RAG_EXAMPLE_TRACE.hits;
  return <>
    <T x={96} y={111} size={42} weight={670}>Retrieve the original words.</T>
    <T x={98} y={153} size={22} color={K.soft}>
      The nearest vectors identify source passages.
    </T>
    {contexts.map((ctx,i)=>{
      const at=i*145+22;
      const position=reveal(f,at+53,52);
      const y=218+i*203;
      const evidenceColor=i===0?K.mint:K.blue;
      const showPassage=reveal(f,at+101,35);
      return <g key={ctx.id}>
        <g opacity={reveal(f,at,24)*(1-showPassage*.35)}>
          <VectorGlyph x={109} y={y+47} id={ctx.id}
            vector={hits[i].chunk.embedding}/>
        </g>
        {f>=at+54 && f<=at+118&&<g opacity={1-reveal(f,at+102,16)}>
          <rect x={423+position*151} y={y+61} width={116} height={50}
            rx={16} fill="#153e3c" stroke={evidenceColor} strokeWidth="2"/>
          <T x={439+position*151} y={y+94} size={22} mono
            color={evidenceColor} weight={700}>{ctx.id}</T>
        </g>}
        <g opacity={showPassage}>
          <Surface x={558} y={y} w={931} h={175} accent={evidenceColor}>
            <Label x={583} y={y+15}
              text={ctx.id+" · "+ctx.source.split(" ").slice(-1)[0]}
              color={evidenceColor}/>
            <ContentLines x={585} y={y+93} value={ctx.text} width={62}
              size={24} gap={34}/>
          </Surface>
        </g>
      </g>;
    })}
  </>;
}
const ANSWER = "The example handbook permits up to five unused days to roll over.";
/** Editorial focus sequence: first compose a prompt from a question and two
 * original passages, then DE-EMPHASIZE the inputs and reveal the answer.
 * Never show multiple full-density grids simultaneously.
 */
export function RagGenerateAnswer({ frame: f }: { frame: number }) {
  const ctx=RAG_EXAMPLE_TRACE.prompt.context;
  const shift=reveal(f,215,39);
  const words=ANSWER.split(" ");
  const visible=Math.min(words.length,Math.max(0,Math.floor((f-262)/6)));
  return <>
    <T x={94} y={111} size={41} weight={650}>
      {f<253 ? "Give the model the relevant evidence." : "Generate a grounded answer."}
    </T>
    <g opacity={1-shift}>
      <Surface x={138} y={198} w={1320} h={392} accent={K.blue} radius={29}>
        <Label x={171} y={221} text="AUGMENTED PROMPT" color={K.blue} />
        <Appear f={f} at={15}>
          <T x={186} y={302} size={19} color={K.gold} weight={700} mono>QUESTION</T>
          <T x={377} y={302} size={27} color={K.white}>{RAG_QUESTION}</T>
        </Appear>
        {ctx.map((passage,i)=><Appear f={f} at={68+i*61} key={passage.id}>
          <rect x="171" y={347+i*103} width="1250" height="88"
            rx="15" fill={i===0?"#194038":"#17384a"}
            stroke={i===0?K.mint:K.blue} strokeOpacity=".5" />
          <T x={196} y={396+i*103} size={21} color={i===0?K.mint:K.blue}
            weight={720} mono>{passage.id} · {passage.source.split(" ").slice(-1)[0]}</T>
          <T x={376} y={396+i*103} size={21} color={K.white}>{passage.text}</T>
        </Appear>)}
      </Surface>
    </g>
    <g opacity={shift}>
      <Surface x={224} y={192} w={1155} h={388} accent={K.mint} radius={32}>
        <Label x={264} y={228} text="LANGUAGE MODEL → ANSWER" color={K.mint} />
        <ContentLines x={271} y={344} value={words.slice(0,visible).join(" ")}
          width={53} size={34} gap={49} />
        <g opacity={reveal(f,358,28)}>
          <rect x="269" y="484" width="357" height="49" rx="15"
            fill={K.mint} fillOpacity=".10" stroke={K.mint} strokeOpacity=".66" />
          <T x={291} y={516} size={21} color={K.mint} mono weight={700}>
            [Employee Handbook §4]
          </T>
          <T x={671} y={516} size={21} color={K.soft}>
            Evidence: C01
          </T>
        </g>
      </Surface>
    </g>
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
    default: return null;
  }
}
