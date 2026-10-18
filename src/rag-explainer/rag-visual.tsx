/** RAG visual reference: technical data transformations rather than text slides.
 * Pure absolute-frame evaluation; camera remains still for all 1,080 frames.
 * Example embeddings/scores and handbook statements are explicitly synthetic.
 */
import type { ReactNode } from "react";
import type { ExplainerFrame } from "../../registry/visual/explainer-sequence";
import { RAG_CHAPTERS } from "./rag-production";
import type { RagChapterId } from "./rag-production";
import { RagPipelineDiagram } from "./rag-pipeline";

const COLORS = {
  white: "#eff7fc", soft: "#b0c5d2", faint: "#7695a8",
  mint: "#79e5d3", amber: "#f4c889", violet: "#b6a9f5",
  blue: "#88b7ff", edge: "#426174", glass: "#162e3f",
  deep: "#102434",
} as const;
const FONT = "'Geist Variable', Inter, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Consolas, monospace";
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const n = clamp(x); return n * n * (3 - 2 * n); };
const enter = (frame: number, at: number, length = 24) => ease((frame - at) / length);
const progress = (frame: number, at: number, length = 26) => ease((frame - at) / length);
const DOCS = [
  { id: "C01", text: "PTO rollover", snippet: "5 unused days", source: "§4", vector: [0.94, 0.34], color: COLORS.mint },
  { id: "C02", text: "Eligibility", snippet: "After 90 days", source: "§2", vector: [0.42, 0.91], color: COLORS.blue },
  { id: "C03", text: "Expenses", snippet: "Meals reimbursed", source: "§8", vector: [-0.82, -0.57], color: COLORS.violet },
] as const;
const QUERY_VECTOR = [0.90, 0.43] as const;
const cosine = (a: readonly number[], b: readonly number[]) =>
  a.reduce((sum, n, i) => sum + n * b[i], 0) /
  (Math.hypot(...a) * Math.hypot(...b));
const SCORED = DOCS.map(doc => ({ ...doc, score: cosine(QUERY_VECTOR, doc.vector) }))
  .sort((a, b) => b.score - a.score);

const A11Y: Record<RagChapterId, string> = {
  question: "The private policy document and the language model are not connected. A user asks about PTO rollover; the model cannot reliably answer with the latest internal policy without retrieving it.",
  index: "Offline ingestion splits a handbook into three labeled chunks. An embedding model converts each text chunk to a numerical vector. The vector index stores each vector alongside the text chunk's ID and source reference.",
  retrieve: "At query time the same embedding model converts the question into a vector. Cosine similarity ranks the three stored vectors, and top-k equals two selects the relevant policy passages. This diagram uses illustrative two-dimensional vectors, not a real production embedding.",
  generate: "The retrieval system assembles the user's question and the original text of the two chosen chunks, including source references, into a prompt. The unchanged language model generates an answer citing the supplied section.",
  summary: "Before any user question, documents are chunked, embedded and indexed. At question time, embed the query, retrieve top-k passages, augment the prompt with their text, and generate a sourced answer. RAG does not retrain the language model and does not guarantee accuracy.",
};

function Txt({ x, y, children, size = 22, color = COLORS.white, weight = 500,
  mono = false, anchor = "start" }: { x: number; y: number; children: ReactNode;
  size?: number; color?: string; weight?: number; mono?: boolean;
  anchor?: "start" | "middle" | "end" }) {
  return <text x={x} y={y} textAnchor={anchor} fill={color} fontSize={size}
    fontWeight={weight} fontFamily={mono ? MONO : FONT}>{children}</text>;
}
function Panel({ x, y, w, h, children, tint = COLORS.mint }: { x: number; y: number;
  w: number; h: number; children?: ReactNode; tint?: string }) {
  return <g>
    <rect x={x} y={y} width={w} height={h} rx="18"
      fill={COLORS.glass} stroke={COLORS.edge} strokeWidth="1.5" />
    <path d={"M " + (x + 22) + " " + (y + 1) + " H " + (x + w - 22)}
      fill="none" stroke={tint} opacity=".8" strokeWidth="2.2" />
    {children}
  </g>;
}
/** Content-sized pill with conservative monospaced glyph measurement.
 * 20px left/right padding and 10px+ top/bottom padding are always retained.
 */
function Pill({ x, y, label, tint = COLORS.mint }: { x: number; y: number;
  label: string; tint?: string }) {
  const width = Math.ceil(label.length * 11.7 + 44);
  return <g>
    <rect x={x} y={y} width={width} height={42} rx={21}
      fill={tint} fillOpacity=".12" stroke={tint} strokeOpacity=".40" />
    <Txt x={x + 22} y={y + 27} size={18} weight={630} color={tint} mono>{label}</Txt>
  </g>;
}
function Show({ f, at, children, dy = 15 }: { f: number; at: number;
  children: ReactNode; dy?: number }) {
  const a = enter(f, at);
  return <g opacity={a} transform={"translate(0 " + ((1 - a) * dy) + ")"}>{children}</g>;
}
function Flow({ f, at, a, b, tint = COLORS.mint, duration = 35,
  dashed = false }: { f: number; at: number; a: [number, number];
  b: [number, number]; tint?: string; duration?: number; dashed?: boolean }) {
  const t = progress(f, at, duration);
  return <g opacity={enter(f, at, 10)}>
    <path d={"M " + a.join(" ") + " L " + b.join(" ")} fill="none"
      stroke={tint} strokeWidth="2.5" opacity=".45"
      strokeDasharray={dashed ? "6 8" : undefined} />
    <circle cx={a[0] + (b[0] - a[0]) * t}
      cy={a[1] + (b[1] - a[1]) * t}
      r="14" fill={tint} opacity=".17" />
    <circle cx={a[0] + (b[0] - a[0]) * t}
      cy={a[1] + (b[1] - a[1]) * t} r="5" fill={tint} />
  </g>;
}
function Handbook({ x, y, w = 210, h = 304 }: {
  x: number; y: number; w?: number; h?: number }) {
  return <Panel x={x} y={y} w={w} h={h} tint={COLORS.violet}>
    <Pill x={x + 18} y={y + 20} label="HANDBOOK" tint={COLORS.violet} />
    <Txt x={x + 20} y={y + 114} weight={610} size={22}>Employee policy</Txt>
    {[.8, .94, .72, .9, .65, .95].map((scale, i) =>
      <rect key={i} x={x + 22} y={y + 142 + i * 22}
        width={(w - 44) * scale} height="7" rx="3.5"
        fill={i === 2 ? COLORS.amber : COLORS.faint}
        opacity={i === 2 ? .93 : .40} />)}
    <Txt x={x + 22} y={y + h - 24} size={17} color={COLORS.soft}>Source: handbook</Txt>
  </Panel>;
}
function Chunk({ x, y, i, condensed = false }: {
  x: number; y: number; i: number; condensed?: boolean }) {
  const d = DOCS[i], height = condensed ? 72 : 94;
  return <Panel x={x} y={y} w={condensed ? 213 : 244} h={height} tint={d.color}>
    <Txt x={x + 17} y={y + 32} mono size={20} color={d.color} weight={640}>{d.id}</Txt>
    <Txt x={x + 83} y={y + 32} size={20} weight={550}>{d.text}</Txt>
    {!condensed && <Txt x={x + 18} y={y + 72} size={18} color={COLORS.soft}>{d.snippet} · {d.source}</Txt>}
  </Panel>;
}
function Vector({ x, y, vector, color = COLORS.mint }: { x: number; y: number;
  vector: readonly number[]; color?: string }) {
  return <g>
    <rect x={x} y={y} width="185" height="49" rx="12"
      fill={COLORS.deep} stroke={COLORS.edge} />
    <Txt x={x + 15} y={y + 32} mono color={color} size={20}>
      [{vector[0].toFixed(2)}, {vector[1].toFixed(2)}]
    </Txt>
  </g>;
}
function Question({ f }: { f: number }) {
  return <>
    <Show f={f} at={3}>
      <Txt x={54} y={145} size={21} color={COLORS.soft}>USER ASKS</Txt>
      <Panel x={54} y={175} w={424} h={138} tint={COLORS.amber}>
        <Pill x={77} y={194} label="QUERY" tint={COLORS.amber} />
        <Txt x={77} y={286} size={31} weight={620}>PTO rollover?</Txt>
      </Panel>
    </Show>
    <Flow f={f} at={36} a={[267, 314]} b={[267, 390]} tint={COLORS.amber} />
    <Show f={f} at={51}>
      <Panel x={86} y={399} w={362} h={155} tint={COLORS.violet}>
        <Txt x={112} y={446} size={27} weight={630}>Language model</Txt>
        <Txt x={112} y={501} color={COLORS.soft} size={22}>No handbook attached</Txt>
      </Panel>
    </Show>
    <Show f={f} at={62}><Handbook x={674} y={194} w={260} h={345} /></Show>
    <Show f={f} at={76}>
      <path d="M 452 475 Q 572 475 666 367" stroke={COLORS.amber}
        strokeWidth="2.5" strokeDasharray="8 10" opacity=".55" fill="none" />
      <circle cx="582" cy="435" r="19" fill={COLORS.deep} stroke={COLORS.amber} strokeWidth="2" />
      <path d="M 572 425 l 20 20 M 592 425 l -20 20" stroke={COLORS.amber} strokeWidth="3" />
      <Txt x={503} y={563} size={23} color={COLORS.amber}>Missing connection</Txt>
    </Show>
  </>;
}
function Index({ f }: { f: number }) {
  return <>
    <Show f={f} at={3}><Handbook x={24} y={178} w={199} h={306} /></Show>
    <Txt x={290} y={142} color={COLORS.soft} size={21}>01 · SPLIT TEXT</Txt>
    {DOCS.map((doc, i) => <Show key={doc.id} f={f} at={42 + i * 26}>
      <Chunk x={281} y={170 + i * 113} i={i} />
    </Show>)}
    <Flow f={f} at={35} a={[226, 330]} b={[274, 330]} tint={COLORS.violet} />
    <Show f={f} at={118}>
      <Panel x={568} y={262} w={164} h={132}>
        <Txt x={586} y={306} size={21} color={COLORS.mint} weight={630}>Embedding</Txt>
        <Txt x={586} y={341} size={21} color={COLORS.mint} weight={630}>model</Txt>
        <Txt x={586} y={376} size={17} color={COLORS.soft}>text → vector</Txt>
      </Panel>
    </Show>
    <Flow f={f} at={134} a={[527, 329]} b={[563, 329]} duration={30} />
    <Show f={f} at={171}>
      <Panel x={768} y={164} w={247} h={393}>
        <Txt x={786} y={209} size={22} color={COLORS.mint} weight={660}>Vector index</Txt>
        <Txt x={786} y={242} size={18} color={COLORS.soft}>ID + vector + source</Txt>
        {DOCS.map((d, i) => <Show key={d.id} f={f} at={183 + i * 17}>
          <Txt x={787} y={291 + i * 85} color={d.color} mono size={20}>{d.id} · {d.source}</Txt>
          <Vector x={786} y={305 + i * 85} vector={d.vector} color={d.color} />
        </Show>)}
      </Panel>
    </Show>
    <Flow f={f} at={159} a={[736, 329]} b={[761, 329]} />
    <Show f={f} at={205}>
      <Txt x={50} y={599} size={19} color={COLORS.soft}>Toy 2D vectors shown. Real embeddings typically have many dimensions.</Txt>
    </Show>
  </>;
}
function Retrieve({ f }: { f: number }) {
  const qx = 774, qy = 291;
  const dots = [
    { id: "C01", x: 820, y: 268, color: COLORS.mint },
    { id: "C02", x: 713, y: 232, color: COLORS.blue },
    { id: "C03", x: 654, y: 386, color: COLORS.violet },
  ];
  return <>
    <Show f={f} at={2}>
      <Panel x={31} y={171} w={306} h={133} tint={COLORS.amber}>
        <Pill x={48} y={189} label="QUERY" tint={COLORS.amber} />
        <Txt x={54} y={274} size={27} weight={610}>PTO rollover?</Txt>
      </Panel>
    </Show>
    <Show f={f} at={43}>
      <Panel x={392} y={184} w={191} h={105}>
        <Txt x={410} y={227} size={23} color={COLORS.mint}>Embed query</Txt>
        <Txt x={410} y={262} size={20} color={COLORS.soft} mono>[.90, .43]</Txt>
      </Panel>
    </Show>
    <Flow f={f} at={37} a={[340, 240]} b={[382, 240]} tint={COLORS.amber} />
    <Flow f={f} at={89} a={[588, 241]} b={[625, 241]} />
    <Show f={f} at={95}>
      <Panel x={635} y={145} w={378} h={307} tint={COLORS.mint}>
        <Txt x={653} y={188} size={22} color={COLORS.mint}>Similarity space · illustrative</Txt>
        <path d="M 663 417 H 985 M 663 417 V 213" stroke={COLORS.faint}
          strokeWidth="1.7" opacity=".44" />
        {[...dots, { id: "Q", x: qx, y: qy, color: COLORS.amber }].map(d =>
          <g key={d.id}>
            <circle cx={d.x} cy={d.y} r={d.id === "Q" ? 12 : 9}
              fill={d.color} opacity=".94" />
            <Txt x={d.x + 14} y={d.y - 10} size={20} color={d.color} weight={660}>{d.id}</Txt>
          </g>)}
        <circle cx={qx} cy={qy} r={105} fill="none"
          stroke={COLORS.amber} strokeOpacity=".40" strokeWidth="2" strokeDasharray="5 9" />
      </Panel>
    </Show>
    <Show f={f} at={147}>
      <Txt x={39} y={372} color={COLORS.soft} size={21}>COSINE SIMILARITY · TOP K = 2</Txt>
      {SCORED.map((d, i) => <Show key={d.id} f={f} at={170 + i * 20}>
        <Panel x={40} y={398 + i * 72} w={546} h={62} tint={i < 2 ? d.color : COLORS.faint}>
          <Txt x={58} y={437 + i * 72} mono size={20} color={d.color}>{d.id}</Txt>
          <Txt x={150} y={437 + i * 72} size={21}>{d.text}</Txt>
          <Txt x={464} y={437 + i * 72} mono size={22}
            color={i < 2 ? COLORS.mint : COLORS.faint}>
            {d.score.toFixed(2)}
          </Txt>
        </Panel>
        {i < 2 && <circle cx={568} cy={420 + i * 72} r={6} fill={COLORS.mint} />}
      </Show>)}
    </Show>
    <Show f={f} at={213}>
      <Txt x={653} y={520} color={COLORS.mint} size={22}>C01 + C02 selected</Txt>
      <Txt x={653} y={552} size={19} color={COLORS.soft}>Next: fetch original source text.</Txt>
    </Show>
  </>;
}
function Generate({ f }: { f: number }) {
  return <>
    <Show f={f} at={3}>
      <Panel x={30} y={152} w={602} h={434} tint={COLORS.mint}>
        <Txt x={54} y={195} size={27} color={COLORS.mint} weight={650}>Augmented prompt</Txt>
        <Pill x={54} y={217} label="QUESTION" tint={COLORS.amber} />
        <Txt x={57} y={294} size={25} weight={590}>PTO rollover?</Txt>
        <path d="M 54 311 H 606" stroke={COLORS.edge} />
        <Txt x={57} y={351} size={20} color={COLORS.soft}>RETRIEVED TEXT · NOT VECTOR COORDINATES</Txt>
      </Panel>
    </Show>
    <Show f={f} at={72}>
      <Panel x={54} y={371} w={548} h={78} tint={COLORS.mint}>
        <Txt x={73} y={404} color={COLORS.mint} mono size={21}>C01  §4</Txt>
        <Txt x={252} y={404} size={21}>5 unused days may roll over</Txt>
        <Txt x={73} y={431} size={17} color={COLORS.soft}>source: example handbook</Txt>
      </Panel>
    </Show>
    <Show f={f} at={104}>
      <Panel x={54} y={469} w={548} h={78} tint={COLORS.blue}>
        <Txt x={73} y={503} color={COLORS.blue} mono size={21}>C02  §2</Txt>
        <Txt x={252} y={503} size={21}>Eligibility after 90 days</Txt>
        <Txt x={73} y={529} size={17} color={COLORS.soft}>source: example handbook</Txt>
      </Panel>
    </Show>
    <Flow f={f} at={138} a={[641, 304]} b={[685, 304]} />
    <Show f={f} at={145}>
      <Panel x={699} y={212} w={300} h={179} tint={COLORS.violet}>
        <Pill x={719} y={230} label="LLM" tint={COLORS.violet} />
        <Txt x={721} y={317} size={26} weight={620}>Generate answer</Txt>
        <Txt x={721} y={350} size={20} color={COLORS.soft}>No model retraining</Txt>
      </Panel>
    </Show>
    <Flow f={f} at={189} a={[849, 397]} b={[849, 436]} tint={COLORS.violet} />
    <Show f={f} at={207}>
      <Panel x={665} y={453} w={349} h={137} tint={COLORS.mint}>
        <Txt x={686} y={490} color={COLORS.mint} size={20}>EXAMPLE ANSWER</Txt>
        <Txt x={685} y={535} weight={640} size={23}>Up to 5 days roll over.</Txt>
        <Txt x={685} y={566} size={20} color={COLORS.mint}>[Handbook §4]</Txt>
      </Panel>
    </Show>
  </>;
}
function Scene({ chapter, f }: { chapter: RagChapterId; f: number }) {
  switch (chapter) {
    case "question": return <Question f={f} />;
    case "index": return <Index f={f} />;
    case "retrieve": return <Retrieve f={f} />;
    case "generate": return <Generate f={f} />;
    case "summary": return null; // The recap uses DiagramStage below.
  }
}
/** All changes within the diagram share the absolute ES1 frame. A 15-frame
 * dissolve crossfades a frozen previous state into the next transformation.
 */
export function RagVisual({ state }: { state: ExplainerFrame }) {
  const index = RAG_CHAPTERS.findIndex(ch => ch.id === state.shot.id);
  if (index < 0) throw new Error("Unknown RAG chapter " + state.shot.id);
  const chapter = RAG_CHAPTERS[index];
  const previous = RAG_CHAPTERS[index - 1];
  const alpha = previous ? enter(state.localFrame, 0, 15) : 1;
  return <div data-rag-visual="" data-rag-chapter={chapter.id}
    style={{ position: "absolute", inset: 0,
      background: "radial-gradient(ellipse at 35% 45%,#203c50 0%,#101f30 66%,#0b1825 100%)",
      overflow: "hidden" }}>
    <svg viewBox="0 0 1050 680" role="img"
      aria-label={"RAG technical diagram. " + A11Y[chapter.id]}
      preserveAspectRatio="xMidYMid meet"
      style={{ position: "absolute", left: "5%", top: "8%",
        width: "90%", height: "65%" }}>
      <defs><radialGradient id="rag-sheen">
        <stop offset="0" stopColor={COLORS.mint} stopOpacity=".10" />
        <stop offset="1" stopColor={COLORS.mint} stopOpacity="0" />
      </radialGradient></defs>
      <ellipse cx="490" cy="330" rx="580" ry="360" fill="url(#rag-sheen)" />
      <Txt x={28} y={76} color={COLORS.mint} size={20} weight={650}>
        {String(index + 1).padStart(2, "0")} / 05 · {chapter.label.toUpperCase()}
      </Txt>
      {previous && alpha < 1 && <g opacity={1 - alpha}>
        <Scene chapter={previous.id} f={previous.end - previous.start - 1} />
      </g>}
      <g opacity={alpha}><Scene chapter={chapter.id} f={state.localFrame} /></g>
    </svg>
    {chapter.id === "summary" &&
      <div data-rag-pipeline="" style={{ position: "absolute",
        left: "5%", top: "8%", width: "90%", height: "65%", opacity: alpha,
        overflow: "hidden", pointerEvents: "none" }}>
        <RagPipelineDiagram frame={state.localFrame} />
      </div>}
    <div aria-hidden="true" style={{ position: "absolute", left: "5%",
      top: "4%", font: "600 clamp(10px, 1cqi, 15px) " + MONO, color: COLORS.soft,
      letterSpacing: ".14em" }}>RETRIEVAL / AUGMENTATION / GENERATION</div>
    <div aria-hidden="true" style={{ position: "absolute", left: "5%",
      bottom: "27%", display: "flex", gap: 9 }}>
      {RAG_CHAPTERS.map((ch, step) => <span key={ch.id} style={{
        width: step === index ? 60 : 26, height: 4,
        borderRadius: 3,
        background: step === index ? COLORS.mint : "#456171",
      }} />)}
    </div>
  </div>;
}
