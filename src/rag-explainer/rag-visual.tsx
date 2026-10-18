/** Frame-pure vector art for the RAG explainer. No CSS motion, timers or camera.
 * All shapes seek deterministically from the ES1 absolute frame.
 */
import type { ReactNode } from "react";
import type { ExplainerFrame } from "../../registry/visual/explainer-sequence";
import { RAG_CHAPTERS } from "./rag-production";
import type { RagChapterId } from "./rag-production";

const INK = "#ebf4fb";
const MUTED = "#a5bbca";
const CYAN = "#80e8d7";
const GOLD = "#ffce87";
const LILAC = "#acbaff";
const easing = (t: number) => {
  const v = Math.max(0, Math.min(1, t));
  return v * v * (3 - 2 * v);
};
const enter = (frame: number, at: number, duration = 25) => easing((frame - at) / duration);
const value = (frame: number, at: number, duration = 25, shift = 22) => shift * (1 - enter(frame, at, duration));

function Label({ x, y, children, color = MUTED, size = 17, weight = 500 }: {
  x: number; y: number; children: ReactNode; color?: string; size?: number; weight?: number;
}) {
  return <text x={x} y={y} fill={color} fontSize={size} fontWeight={weight}
    fontFamily="'Geist Variable', Inter, system-ui, sans-serif" letterSpacing=".25">{children}</text>;
}
function Glass({ x, y, w, h, accent = CYAN, children, radius = 24, fill = "#192f3d" }: {
  x: number; y: number; w: number; h: number; accent?: string;
  children?: ReactNode; radius?: number; fill?: string;
}) {
  return <g>
    <rect x={x} y={y} width={w} height={h} rx={radius}
      fill={fill} stroke="#426274" strokeWidth="1.2" />
    <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx={radius - 1}
      fill="none" stroke="#b9eaf8" strokeOpacity=".055" strokeWidth="2" />
    <path d={"M " + (x + 20) + " " + y + " h " + Math.max(20, w - 40)}
      stroke={accent} strokeOpacity=".72" strokeWidth="2" strokeLinecap="round" />
    {children}
  </g>;
}
function Rule({ x, y, width, accent = MUTED }: { x: number; y: number; width: number; accent?: string }) {
  return <line x1={x} y1={y} x2={x + width} y2={y} stroke={accent} strokeOpacity=".28" />;
}
function Chip({ x, y, text, color = CYAN, width = 124 }: {
  x: number; y: number; text: string; color?: string; width?: number;
}) {
  return <g>
    <rect x={x} y={y} width={width} height="32" rx="16" fill={color} fillOpacity=".11"
      stroke={color} strokeOpacity=".42" />
    <Label x={x + 14} y={y + 22} color={color} size={14} weight={600}>{text}</Label>
  </g>;
}
function Arrow({ x1, y1, x2, y2, color = CYAN, opacity = 1, dashed = false }: {
  x1: number; y1: number; x2: number; y2: number;
  color?: string; opacity?: number; dashed?: boolean;
}) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const back = 12, wing = 5;
  const tipA = [x2 - back * Math.cos(angle) - wing * Math.sin(angle),
    y2 - back * Math.sin(angle) + wing * Math.cos(angle)];
  const tipB = [x2 - back * Math.cos(angle) + wing * Math.sin(angle),
    y2 - back * Math.sin(angle) - wing * Math.cos(angle)];
  return <g opacity={opacity} stroke={color} fill="none" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round">
    <line x1={x1} y1={y1} x2={x2 - 4 * Math.cos(angle)} y2={y2 - 4 * Math.sin(angle)}
      strokeDasharray={dashed ? "5 9" : undefined} />
    <path d={"M " + tipA.join(" ") + " L " + x2 + " " + y2 + " L " + tipB.join(" ")} />
  </g>;
}
function Reveal({ frame, at = 0, children, shift = 20 }: {
  frame: number; at?: number; shift?: number; children: ReactNode;
}) {
  return <g opacity={enter(frame, at)} transform={"translate(0 " + value(frame, at, 24, shift) + ")"}>
    {children}
  </g>;
}
function Document({ x, y, heading = "POLICY DOCUMENT", color = LILAC }: {
  x: number; y: number; heading?: string; color?: string;
}) {
  return <Glass x={x} y={y} w={236} h={302} accent={color}>
    <Chip x={x + 20} y={y + 19} text="EXAMPLE FILE" color={color} width={142} />
    <Label x={x + 21} y={y + 86} size={15} color={INK} weight={650}>{heading}</Label>
    {[.80, .94, .66, .84, .54, .89, .70].map((fraction, index) =>
      <rect key={index} x={x + 20} y={y + 116 + index * 23} width={190 * fraction}
        height={7} rx={3.5} fill={index === 3 ? GOLD : "#7591a3"} opacity={index === 3 ? .8 : .43} />)}
  </Glass>;
}

function QuestionScene({ f }: { f: number }) {
  return <>
    <Reveal frame={f} at={5}>
      <Glass x={74} y={147} w={666} h={164} accent={GOLD}>
        <Chip x={98} y={165} text="USER QUESTION" color={GOLD} width={166} />
        <Label x={100} y={256} color={INK} size={26} weight={620}>
          What is our PTO rollover policy?
        </Label>
      </Glass>
    </Reveal>
    <Reveal frame={f} at={45}>
      <Glass x={74} y={361} w={310} h={228} accent={LILAC}>
        <Label x={102} y={411} color={LILAC} size={17} weight={650}>GENERAL LLM</Label>
        <Label x={102} y={470} color={INK} size={22}>No access to the</Label>
        <Label x={102} y={502} color={INK} size={22}>private policy yet</Label>
        <Rule x={102} y={539} width={245} accent={LILAC} />
        <Label x={102} y={566} size={15}>Model knowledge ≠ your files</Label>
      </Glass>
    </Reveal>
    <Reveal frame={f} at={66}>
      <Document x={470} y={335} heading="PTO / HANDBOOK" />
    </Reveal>
    <Arrow x1={392} y1={464} x2={456} y2={464} color={GOLD} opacity={enter(f, 83)} dashed />
  </>;
}

function IndexScene({ f }: { f: number }) {
  return <>
    <Reveal frame={f} at={2}>
      <Document x={45} y={166} heading="PTO / HANDBOOK" />
    </Reveal>
    <Reveal frame={f} at={48}>
      <Label x={323} y={182} color={MUTED} size={17} weight={600}>SPLIT INTO CHUNKS</Label>
      {[0, 1, 2].map((index) =>
        <g key={index} transform={"translate(0 " + value(f, 48 + index * 13, 27, 16) + ")"}
          opacity={enter(f, 48 + index * 13)}>
          <Glass x={320} y={218 + index * 98} w={212} h={76} accent={index === 1 ? GOLD : LILAC} radius={16}>
            <Label x={337} y={246 + index * 98} size={14} color={index === 1 ? GOLD : LILAC}>
              CHUNK 0{index + 1}
            </Label>
            <Rule x={338} y={262 + index * 98} width={169} accent={LILAC} />
          </Glass>
        </g>)}
    </Reveal>
    <Arrow x1={278} y1={340} x2={312} y2={340} color={LILAC} opacity={enter(f, 48)} />
    <Reveal frame={f} at={115}>
      <Glass x={595} y={222} w={194} h={286} accent={CYAN}>
        <Label x={614} y={264} color={CYAN} size={17} weight={650}>VECTOR INDEX</Label>
        <Label x={613} y={300} size={14}>Embedding model</Label>
        {["[ .2, -.5, .9 ]", "[ .1,  .8, .4 ]", "[ -.7, .3, .1 ]"].map((text, index) =>
          <g key={text}>
            <rect x={609} y={317 + index * 51} width={165} height={40} rx={10}
              fill={index === 1 ? "#234c52" : "#243944"} stroke={CYAN} strokeOpacity={index === 1 ? .7 : .22} />
            <Label x={620} y={343 + index * 51} color={index === 1 ? CYAN : MUTED} size={15}>{text}</Label>
          </g>)}
      </Glass>
    </Reveal>
    <Arrow x1={540} y1={359} x2={586} y2={359} color={CYAN} opacity={enter(f, 118)} />
    <Reveal frame={f} at={145}>
      <Label x={85} y={590} color={MUTED} size={18}>Chunks retain links to their source documents.</Label>
    </Reveal>
  </>;
}

function RetrieveScene({ f }: { f: number }) {
  const matches = [
    { name: "CHUNK 02", subtitle: "PTO rollover", match: "HIGH MATCH", color: CYAN },
    { name: "CHUNK 01", subtitle: "PTO eligibility", match: "RELATED", color: LILAC },
    { name: "CHUNK 03", subtitle: "Travel expenses", match: "OTHER", color: MUTED },
  ];
  return <>
    <Reveal frame={f} at={3}>
      <Glass x={54} y={174} w={338} h={174} accent={GOLD}>
        <Chip x={77} y={192} text="USER QUERY" color={GOLD} width={139} />
        <Label x={76} y={271} color={INK} size={23}>PTO rollover?</Label>
        <Label x={77} y={315} size={16} color={MUTED}>Convert to an embedding</Label>
      </Glass>
    </Reveal>
    <Reveal frame={f} at={55}>
      <Glass x={445} y={174} w={317} h={174} accent={CYAN}>
        <Label x={468} y={215} size={16} color={CYAN} weight={650}>VECTOR SEARCH</Label>
        <Label x={466} y={266} size={24} color={INK}>Compare meaning</Label>
        <Label x={466} y={301} size={17}>not only exact words</Label>
      </Glass>
    </Reveal>
    <Arrow x1={400} y1={257} x2={436} y2={257} color={GOLD} opacity={enter(f, 50)} />
    <Reveal frame={f} at={95}>
      <Label x={57} y={411} color={MUTED} size={17}>ILLUSTRATIVE TOP RESULTS</Label>
    </Reveal>
    {matches.map((match, index) =>
      <Reveal key={match.name} frame={f} at={117 + index * 22} shift={12}>
        <Glass x={54} y={433 + index * 84} w={708} h={67} accent={match.color} radius={16}>
          <Label x={74} y={473 + index * 84} size={16} color={match.color} weight={600}>{match.name}</Label>
          <Label x={228} y={473 + index * 84} size={20} color={INK}>{match.subtitle}</Label>
          <Label x={612} y={473 + index * 84} size={14} color={match.color}>{match.match}</Label>
        </Glass>
      </Reveal>)}
  </>;
}

function GenerateScene({ f }: { f: number }) {
  return <>
    <Reveal frame={f} at={2}>
      <Glass x={52} y={155} w={424} h={330} accent={LILAC}>
        <Label x={78} y={196} color={LILAC} size={17} weight={650}>AUGMENTED PROMPT</Label>
        <Chip x={77} y={222} text="QUESTION" color={GOLD} width={116} />
        <Label x={79} y={287} size={20} color={INK}>What is the PTO policy?</Label>
        <Rule x={79} y={310} width={364} />
        <Chip x={78} y={328} text="RETRIEVED CONTEXT" color={CYAN} width={208} />
        <Label x={79} y={393} size={19} color={INK}>“Up to 5 unused days”</Label>
        <Label x={79} y={422} size={19} color={INK}>“may roll into next year.”</Label>
        <Label x={79} y={457} size={14}>Example handbook §4</Label>
      </Glass>
    </Reveal>
    <Reveal frame={f} at={72}>
      <Glass x={532} y={224} w={238} h={136} accent={LILAC}>
        <Label x={558} y={266} color={LILAC} size={17} weight={650}>LANGUAGE MODEL</Label>
        <Label x={559} y={317} color={INK} size={21}>Generate an answer</Label>
      </Glass>
    </Reveal>
    <Arrow x1={484} y1={287} x2={523} y2={287} color={LILAC} opacity={enter(f, 82)} />
    <Reveal frame={f} at={146}>
      <Glass x={52} y={533} w={718} h={149} accent={CYAN}>
        <Chip x={76} y={552} text="GROUNDED ANSWER" color={CYAN} width={189} />
        <Label x={79} y={622} color={INK} size={23} weight={590}>
          Up to 5 unused days may roll over.
        </Label>
        <Label x={79} y={653} color={CYAN} size={15}>[Example handbook §4]</Label>
      </Glass>
    </Reveal>
    <Arrow x1={640} y1={369} x2={640} y2={519} color={CYAN} opacity={enter(f, 150)} />
  </>;
}

function SummaryScene({ f }: { f: number }) {
  const items = [
    { name: "RETRIEVE", sub: "Find matching evidence", color: GOLD },
    { name: "AUGMENT", sub: "Add context to prompt", color: CYAN },
    { name: "GENERATE", sub: "Answer with references", color: LILAC },
  ];
  return <>
    <Reveal frame={f} at={7}>
      <Label x={51} y={194} color={INK} size={37} weight={640}>Retrieval-Augmented</Label>
      <Label x={51} y={244} color={INK} size={37} weight={640}>Generation</Label>
    </Reveal>
    {items.map((item, index) => <Reveal key={item.name} frame={f} at={43 + index * 24}>
      <Glass x={53} y={305 + index * 104} w={723} h={86} accent={item.color} radius={17}>
        <Label x={77} y={358 + index * 104} color={item.color} size={15} weight={720}>
          0{index + 1}
        </Label>
        <Label x={135} y={358 + index * 104} color={INK} size={23} weight={660}>
          {item.name}
        </Label>
        <Label x={375} y={358 + index * 104} color={MUTED} size={18}>
          {item.sub}
        </Label>
      </Glass>
    </Reveal>)}
    <Reveal frame={f} at={132}>
      <Label x={56} y={687} color={CYAN} size={17}>
        Fresh sources. No model retraining. Verify important answers.
      </Label>
    </Reveal>
  </>;
}

function Scene({ id, frame }: { id: RagChapterId; frame: number }) {
  switch (id) {
    case "question": return <QuestionScene f={frame} />;
    case "index": return <IndexScene f={frame} />;
    case "retrieve": return <RetrieveScene f={frame} />;
    case "generate": return <GenerateScene f={frame} />;
    case "summary": return <SummaryScene f={frame} />;
  }
}

/** A purposeful 0.5-second editorial dissolve between 100% static camera
 * shots. The outgoing diagram is frozen at its final frame; no double animation.
 */
export function RagVisual({ state }: { state: ExplainerFrame }) {
  const chapterIndex = RAG_CHAPTERS.findIndex(c => c.id === state.shot.id);
  if (chapterIndex < 0) throw new Error("Unknown RAG explainer chapter: " + state.shot.id);
  const chapter = RAG_CHAPTERS[chapterIndex];
  const previous = RAG_CHAPTERS[chapterIndex - 1];
  const mix = previous ? easing(state.localFrame / 15) : 1;
  return <div data-rag-visual="" data-rag-chapter={chapter.id}
    style={{ position: "absolute", inset: 0,
      background: "radial-gradient(ellipse at 30% 45%, #193847 0%, #0d1b29 72%)",
      overflow: "hidden", color: INK }}>
    <div aria-hidden="true" style={{ position: "absolute", top: "6%", left: "5%",
      fontFamily: "'Geist Variable', Inter, system-ui, sans-serif", color: CYAN,
      fontSize: "clamp(10px, 1vw, 15px)", fontWeight: 650, letterSpacing: ".17em" }}>
      HOW RAG WORKS / {String(chapterIndex + 1).padStart(2, "0")} OF 05
    </div>
    <svg role="img" aria-label={"RAG process: " + chapter.label}
      viewBox="0 0 830 760" preserveAspectRatio="xMidYMid meet"
      style={{ position: "absolute", left: "2.5%", top: "12%", width: "49%", height: "80%" }}>
      <defs>
        <radialGradient id="rag-orbit" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={CYAN} stopOpacity=".10" />
          <stop offset="100%" stopColor={CYAN} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="408" cy="389" rx="430" ry="390" fill="url(#rag-orbit)" />
      {previous && mix < 1 ? <g opacity={1 - mix}><Scene id={previous.id}
        frame={previous.end - previous.start - 1} /></g> : null}
      <g opacity={mix}><Scene id={chapter.id} frame={state.localFrame} /></g>
    </svg>
    <div aria-hidden="true" style={{ position: "absolute", bottom: "5%", left: "5%",
      display: "flex", gap: 6 }}>
      {RAG_CHAPTERS.map((item, index) => <span key={item.id}
        style={{ height: 3, width: index === chapterIndex ? 42 : 20,
          background: index === chapterIndex ? CYAN : "#48616d",
          borderRadius: 20 }} />)}
    </div>
  </div>;
}
