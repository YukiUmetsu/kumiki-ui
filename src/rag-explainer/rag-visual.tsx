/** PDF-first RAG production. Absolute-frame motion, no CSS timing loops.
 * Text parsing, embedding and indexing are explanatory simulations;
 * original passage/source IDs come from the typed demo corpus.
 */
import type { ReactNode } from "react";
import type { ExplainerFrame } from "../../registry/visual/explainer-sequence";
import { usePrefersReducedMotion } from "../../registry/motion/react";
import { pointOnPath, pathToSvgD } from "../../registry/motion/paths";
import type { MotionPath } from "../../registry/motion/paths";
import { RAG_CHAPTERS } from "./rag-production";
import type { RagChapterId } from "./rag-production";
import { RAG_CHUNKS, RAG_QUESTION } from "./rag-domain";
import { RagVectorSpace } from "./rag-vector-space";
import { typedRagQuestionAt } from "./rag-search-typing";
import { RagQueryVisual } from "./rag-query-visual";
import { RagSearchComparison } from "./rag-comparison";

const C = {
  bg: "#081723", surface: "#102637", raised: "#172f40",
  line: "#426275", white: "#eaf5fc", subdued: "#a6becd", quiet: "#7494a8",
  blue: "#8cbaff", mint: "#75e2d6", purple: "#b6a7ff",
  gold: "#ffcf91", warning: "#ffca93",
} as const;
const font = "'Geist Variable',Inter,system-ui,sans-serif";
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const show = (f: number, at: number, len = 24) => smooth((f - at) / len);
const hide = (f: number, at: number, len = 24) => 1 - smooth((f - at) / len);
const slide = (f: number, at: number, len = 28, distance = 18) =>
  (1 - show(f, at, len)) * distance;
/** Layout-safe deterministic word wrapping for the demo source text. */
function breakIntoLines(value: string, limit: number): string[] {
  const lines: string[] = [];
  for (const word of value.split(/\s+/)) {
    const last = lines.length - 1;
    if (last >= 0 && (lines[last] + " " + word).length <= limit)
      lines[last] += " " + word;
    else lines.push(word);
  }
  return lines;
}

function Text({ x, y, children, size = 25, color = C.white,
  weight = 500, code = false, anchor = "start", opacity }: {
  x: number; y: number; children: ReactNode; size?: number; color?: string;
  weight?: number; code?: boolean; anchor?: "start" | "middle" | "end";
  opacity?: number;
}) {
  return <text x={x} y={y} fill={color} fontSize={size} fontWeight={weight}
    fontFamily={code ? mono : font} textAnchor={anchor}
    opacity={opacity}>{children}</text>;
}
function Pane({ x, y, w, h, children, accent = C.blue, radius = 23 }: {
  x: number; y: number; w: number; h: number; children?: ReactNode;
  accent?: string; radius?: number;
}) {
  return <g>
    <rect x={x} y={y} width={w} height={h} rx={radius}
      fill={C.surface} stroke={C.line} strokeWidth="1.4" />
    <path d={"M " + (x + radius) + " " + (y + 1) + " H " + (x + w - radius)}
      fill="none" stroke={accent} opacity=".65" strokeWidth="2" />
    {children}
  </g>;
}
/** Measured for monospaced content, with 20px+ horizontal inset. */
function Chip({ x, y, text, color = C.blue }: {
  x: number; y: number; text: string; color?: string;
}) {
  const width = text.length * 13 + 48;
  return <g>
    <rect x={x} y={y} width={width} height="44" rx="22"
      fill={color} fillOpacity=".12" stroke={color} strokeOpacity=".53" />
    <Text x={x + 24} y={y + 29} size={20} code weight={660} color={color}>{text}</Text>
  </g>;
}
function Arrive({ f, at, children, dy = 22, len = 28 }: {
  f: number; at: number; children: ReactNode; dy?: number; len?: number;
}) {
  return <g opacity={show(f, at, len)}
    transform={"translate(0 " + slide(f, at, len, dy) + ")"}>{children}</g>;
}
const travel = (id: string, a: [number, number], b: [number, number]): MotionPath => ({
  id, kind: "cubic", closed: false, anchors: [
    { x: a[0], y: a[1], out: { x: a[0] + (b[0] - a[0]) * .44, y: a[1] } },
    { x: b[0], y: b[1], in: { x: b[0] - (b[0] - a[0]) * .38, y: b[1] } },
  ],
});
function Route({ f, at, len = 48, a, b, color = C.blue,
  visibleFrom = 0, radius = 7 }: {
  f: number; at: number; len?: number; a: [number, number]; b: [number, number];
  color?: string; visibleFrom?: number; radius?: number;
}) {
  const path = travel("route", a, b), progress = show(f, at, len);
  const point = pointOnPath(path, progress, { arcLength: true });
  return <g opacity={show(f, visibleFrom, 15)}>
    <path d={pathToSvgD(path)} fill="none" stroke={color}
      strokeWidth="3" strokeOpacity=".25" strokeLinecap="round" />
    {f >= at && f <= at + len + 16 ? <>
      <circle cx={point.x} cy={point.y} r={radius * 2.7} fill={color} opacity=".09" />
      <circle cx={point.x} cy={point.y} r={radius} fill={color} />
    </> : null}
  </g>;
}
function PdfGlyph({ x, y, scale = 1, showText = true }: {
  x: number; y: number; scale?: number; showText?: boolean;
}) {
  return <g transform={"translate(" + x + " " + y + ") scale(" + scale + ")"}>
    <path d="M 0 0 H 205 L 260 55 V 328 Q 260 338 250 338 H 10 Q 0 338 0 328 Z"
      fill="#f4f8fd" stroke="#c1d9ed" strokeWidth="2" />
    <path d="M 205 0 V 55 H 260" fill="#dae9f5" stroke="#c1d9ed" strokeWidth="2" />
    <rect x="24" y="28" width="73" height="34" rx="6" fill="#d94b58" />
    <text x="35" y="53" fill="white" fontSize="20" fontFamily={font}
      fontWeight="800">PDF</text>
    {showText && <>
      <text x="24" y="112" fontFamily={font} fontSize="20" fontWeight="650" fill="#1a3850">EMPLOYEE</text>
      <text x="24" y="136" fontFamily={font} fontSize="20" fontWeight="650" fill="#1a3850">HANDBOOK</text>
      {[178, 198, 218, 238, 258, 278, 298].map((row, i) =>
        <rect key={row} x="24" y={row} height="7" rx="3.5"
          width={i === 4 ? 125 : i % 2 ? 184 : 210}
          fill={i === 3 ? "#72a9e4" : "#91a9bc"}
          opacity={i === 3 ? ".95" : ".65"} />)}
    </>}
  </g>;
}
function Pointer({ x, y, pressed = false }: { x: number; y: number; pressed?: boolean }) {
  return <g transform={"translate(" + x + " " + y + ") scale(" + (pressed ? .87 : 1) + ")"}
    fill="#f7fbff" stroke="#082033" strokeWidth="3">
    <path d="M 0 0 L 0 34 L 11 26 L 19 45 L 29 39 L 21 20 L 34 18 Z" />
  </g>;
}
/** Static establishing shot: no dragging, pointer choreography or fake upload
 * progress. The document is already available for ingestion.
 */
function Upload({ f: _f }: { f: number }) {
  return <>
    <Text x={100} y={115} size={43} weight={630}>A document becomes searchable knowledge.</Text>
    <Text x={102} y={160} size={23} color={C.subdued}>
      Start with the employee handbook.
    </Text>
    <Pane x={248} y={210} w={1100} h={389} accent={C.blue} radius={32}>
      <PdfGlyph x={405} y={240} scale={.87} />
      <Text x={759} y={338} size={34} weight={620}>
        Employee Handbook.pdf
      </Text>
      <Text x={761} y={398} color={C.blue} size={24}>
        PDF → text extraction → chunks → vectors
      </Text>
      <path d="M 755 438 H 1266" fill="none" stroke={C.line} strokeWidth="2" />

    </Pane>
  </>;
}
/** Introductory PDF parsing only. Scanned-page OCR is intentionally deferred. */
function Page({ f }: { f: number }) {
  return <Pane x={114} y={218} w={520} h={355} accent={C.blue}>
    <Chip x={138} y={238} text="TEXT PDF" color={C.blue}/>
    <Text x={140} y={337} size={28} weight={680}>EMPLOYEE HANDBOOK</Text>
    {[0,1,2].map(i=><rect key={i} x={143} y={359+i*25}
      width={i===2?365:429} height={10} rx={5} fill={C.line} opacity=".75"/>)}
    <rect x={133} y={436} width={468} height={82} rx="13"
      fill={C.mint} fillOpacity={.05+.15*show(f,58,32)}
      stroke={C.mint} strokeOpacity={.17+.55*show(f,58,32)} />
    <Text x={157} y={470} size={23} weight={590}>
      Up to five unused PTO days
    </Text>
    <Text x={157} y={503} size={23} weight={590}>
      may be carried into next year.
    </Text>
  </Pane>;
}
function Extract({ f }: { f: number }) {
  const origin:[number,number]=[394,482];
  const destination:[number,number]=[829,351];
  const pos=pointOnPath(travel("extracted-source-text",origin,destination),
    show(f,93,69),{arcLength:true});
  return <>
    <Text x={98} y={113} size={42} weight={660}>Extract readable text from the PDF.</Text>
    <Text x={100} y={156} size={23} color={C.subdued}>
      Keep the original section reference attached.
    </Text>
    <Arrive f={f} at={12}><Page f={f}/></Arrive>
    {f>=91 && f<=165 &&
      <g opacity={show(f,91,17)*hide(f,147,18)}>
        <rect x={pos.x-55} y={pos.y-23} width={242} height={52} rx="15"
          fill="#214843" stroke={C.mint} strokeWidth="2" />
        <Text x={pos.x-35} y={pos.y+10} size={22} color={C.mint} weight={670}>
          C01 · source §4
        </Text>
      </g>}
    <Arrive f={f} at={144} len={38} dy={14}>
      <Pane x={772} y={218} w={730} h={355} accent={C.mint}>
        <Chip x={799} y={238} text="EXTRACTED TEXT" color={C.mint}/>
        {breakIntoLines(RAG_CHUNKS[0].text,41).map((line,i)=>
          <Text key={i} x={806} y={359+i*41} size={26} weight={610}>{line}</Text>)}
        <Text x={808} y={516} size={22} color={C.mint}>
          Employee Handbook · §4
        </Text>
      </Pane>
    </Arrive>
  </>;
}
function SourceStrip({ x, y, i, width = 818 }: {
  x: number; y: number; i: number; width?: number;
}) {
  const chunk = RAG_CHUNKS[i];
  return <Pane x={x} y={y} w={width} h={114}
    accent={i === 0 ? C.mint : C.blue} radius={19}>
    <Chip x={x + 19} y={y + 14} text={chunk.id + " · " + chunk.section}
      color={i === 0 ? C.mint : C.blue} />
    <Text x={x + 235} y={y + 44} size={21} color={C.white} weight={550}>
      {chunk.text.slice(0, 46).replace(/\s+\S*$/, "") + "…"}
    </Text>

  </Pane>;
}
function Chunk({ f }: { f: number }) {
  return <>
    <Text x={99} y={114} size={41} weight={630}>One PDF becomes searchable passages.</Text>
    <Text x={100} y={153} color={C.subdued} size={22}>Keep the sentence and its location together.</Text>
    <Arrive f={f} at={3}>
      <Pane x={80} y={202} w={396} h={345} accent={C.blue}>
        <Chip x={103} y={227} text="NORMALIZED TEXT" />
        <Text x={107} y={321} size={25} weight={650}>Employee handbook</Text>
        {[0, 1, 2, 3, 4, 5].map(i => <g key={i}>
          <rect x={109} y={357 + i * 24} width={i % 2 ? 308 : 331}
            height="9" rx="4" fill={i === 1 ? C.mint : "#6488a5"}
            opacity={i === 1 ? 1 : .48} />
        </g>)}
        <Text x={108} y={512} size={18} color={C.subdued}>Text · order · page · section</Text>
      </Pane>
    </Arrive>
    {RAG_CHUNKS.slice(0, 3).map((chunk, i) => {
      const at = 48 + i * 55, y = 195 + i * 133;
      // One literal chunk ID leaves the extracted page, travels with its
      // source identity, and docks into the readable strip. The moving item is
      // a visual data object, not a decorative pulse with unrelated cards.
      const transfer = pointOnPath(
        travel("chunk-" + chunk.id, [454, 358 + i * 22], [639, y + 56]),
        show(f, at, 47), { arcLength: true });
      return <g key={chunk.id}>
        <Route f={f} at={at} len={47}
          a={[475, 356 + i * 22]} b={[600, y + 53]}
          color={i === 0 ? C.mint : C.blue} visibleFrom={at - 13} />
        {f >= at && f <= at + 49 && <g opacity={hide(f, at + 38, 12)}>
          <rect x={transfer.x - 35} y={transfer.y - 22} width="150" height="46"
            rx="14" fill="#224b60" stroke={i === 0 ? C.mint : C.blue}
            strokeWidth="2" />
          <Text x={transfer.x - 17} y={transfer.y + 8} size={22}
            weight={690} color={i === 0 ? C.mint : C.blue}>
            {chunk.id}
          </Text>
        </g>}
        <Arrive f={f} at={at + 42} dy={20}>
          <SourceStrip x={608} y={y} i={i} />
        </Arrive>
      </g>;
    })}

</>;
}
function EmbeddingModel({ f }: { f: number }) {
  return <g>
    <Pane x={620} y={212} w={344} h={327} accent={C.purple} radius={28}>
      <Chip x={643} y={237} text="EMBEDDING MODEL" color={C.purple} />
      {Array.from({ length: 5 }, (_, row) =>
        Array.from({ length: 5 }, (_, col) => {
          const x = 671 + col * 54, y = 343 + row * 37;
          const lit = show(f, 60 + col * 14 + row * 5, 21);
          return <g key={row + "-" + col}>
            {col < 4 && <line x1={x} y1={y} x2={x + 54} y2={y}
              stroke={C.purple} strokeWidth="1.5" opacity=".19" />}
            {row < 4 && <line x1={x} y1={y} x2={x} y2={y + 37}
              stroke={C.purple} strokeWidth="1.5" opacity=".13" />}
            <circle cx={x} cy={y} r={5 + lit * 3}
              fill={row + col % 2 < 4 ? C.purple : C.blue}
              opacity={.23 + lit * .65} />
          </g>;
        }))}

    </Pane>
  </g>;
}
function Embed({ f }: { f: number }) {
  return <>
    <Text x={99} y={111} size={40} weight={630}>Turn meaning into numbers.</Text>
    <Text x={100} y={148} size={22} color={C.subdued}>
      The source text remains stored separately.
    </Text>
    <EmbeddingModel f={f} />
    {RAG_CHUNKS.slice(0, 3).map((chunk, i) => {
      const at = 30 + i * 79, y = 196 + i * 141;
      return <g key={chunk.id}>
        <Arrive f={f} at={i * 17}>
          <Pane x={89} y={y} w={428} h={112} accent={C.blue}>
            <Text x={112} y={y + 42} size={25} weight={650} color={C.blue}>{chunk.id}</Text>
            <Text x={204} y={y + 43} size={23}>
              {i === 0 ? "PTO carryover" : i === 1 ? "PTO eligibility" : "Travel expenses"}
            </Text>
            <Text x={115} y={y + 82} size={18} color={C.subdued}>Section {chunk.section}</Text>
          </Pane>
        </Arrive>
        <Route f={f} at={at} len={39} a={[523, y + 53]} b={[610, 350 + i * 21]}
          color={C.blue} visibleFrom={at - 12} />
        <Route f={f} at={at + 30} len={49} a={[972, 365 + i * 14]} b={[1056, y + 47]}
          color={C.purple} visibleFrom={at + 19} />
        <Arrive f={f} at={at + 65}>
          <Pane x={1066} y={y} w={419} h={111} accent={C.purple}>
            <Text x={1090} y={y + 41} size={25} color={C.purple} weight={650}>{chunk.id}</Text>
            <Text x={1182} y={y + 43} size={26} color={C.white} code>
              {"[" + chunk.embedding.map(value => value.toFixed(2)).join(", ") + "]"}
            </Text>

          </Pane>
        </Arrive>
      </g>;
    })}

</>;
}
function Index({ f }: { f: number }) {
  return <>
    <Text x={96} y={112} size={39} weight={630}>Prepare the vector index.</Text>
    <Text x={98} y={152} size={22} color={C.subdued}>
      Nearby positions represent related meaning.
    </Text>
    <Arrive f={f} at={6}>
      <Pane x={92} y={249} w={333} h={255} accent={C.purple}>
        <Chip x={115} y={275} text="INDEX RECORD" color={C.purple} />
        <Text x={123} y={376} size={25} weight={650} color={C.mint}>C01 · §4</Text>
        <Text x={123} y={412} size={23} color={C.white} code>[0.94, 0.34]</Text>

      </Pane>
    </Arrive>
    <Route f={f} at={25} len={75} a={[431, 378]} b={[574, 378]}
      color={C.purple} visibleFrom={4} />
    <g style={{ opacity: show(f, 15) }}>
      <foreignObject x="430" y="166" width="1110" height="448">
        <div style={{ width: "100%", height: "100%" }}>
          <RagVectorSpace frame={f} mode="index" />
        </div>
      </foreignObject>
    </g>

</>;
}
function Search({ f }: { f: number }) {
  const typed = typedRagQuestionAt(f);
  const buttonPressed = f >= 216 && f < 235;
  const sent = show(f, 228, 28);
  const tokenPoint = pointOnPath(travel("query-to-index", [800, 405], [1240, 535]),
    show(f, 242, 47), { arcLength: true });
  return <>
    <Text x={96} y={114} size={41} weight={630}>The index is ready. Now ask.</Text>
    <Text x={97} y={152} size={22} color={C.subdued}>
      The question enters the retrieval path, not the PDF parser.
    </Text>
    <Arrive f={f} at={3}>
      <Pane x={210} y={196} w={1178} h={361} accent={C.gold} radius={28}>
        <Text x={263} y={256} size={22} color={C.subdued}>ASK YOUR KNOWLEDGE BASE</Text>
        <rect x="261" y="305" width="1054" height="115" rx="23"
          fill="#0b1f2f" stroke={C.line} strokeWidth="2" />
        {/*
           The caret is a tspan in the SAME shaped SVG text run. This uses the
           browser's actual glyph advances, never string.length × guessed width.
           The caret always follows the last typed letter under real fonts.
        */}
        <Text x={289} y={376} size={27} color={typed ? C.white : C.quiet}>
          {typed || "Ask something about your documents…"}
          {typed && f < 214 &&
            <tspan fill={C.gold} dx={2} opacity={Math.floor(f / 15) % 2 === 0 ? 1 : .3}>
              ▏
            </tspan>}
        </Text>
        <rect x="1116" y="435" width="199" height="71" rx="17"
          fill={buttonPressed ? "#85602f" : "#b98b52"} stroke={C.gold} strokeWidth="2" />
        <Text x={1217} y={478} size={25} color="#102436" weight={740}
          anchor="middle">Search ↗</Text>
      </Pane>
    </Arrive>
    <g opacity={f >= 191 && f < 245 ? 1 : 0}>
      <Pointer x={1127 + show(f, 191, 27) * 87} y={f >= 217 ? 471 : 543 - show(f, 191, 27) * 72}
        pressed={buttonPressed} />
    </g>
    {f >= 236 && <>
      <g opacity={hide(f, 246, 26)}>
        <rect x="517" y="380" width="564" height="45" rx="20"
          fill={C.gold} fillOpacity=".10" stroke={C.gold} />
        <Text x={532} y={409} size={20} color={C.gold}>{RAG_QUESTION}</Text>
      </g>
      <path d={pathToSvgD(travel("query-to-index", [800, 405], [1240, 535]))}
        stroke={C.gold} strokeOpacity={.35 * sent} strokeWidth="3" fill="none" />
      <circle cx={tokenPoint.x} cy={tokenPoint.y} r={19}
        fill={C.gold} fillOpacity=".14" stroke={C.gold}
        strokeWidth="3" opacity={show(f, 245, 20)} />
      <circle cx={tokenPoint.x} cy={tokenPoint.y} r={7} fill={C.gold}
        opacity={show(f, 245, 20)} />
    </>}
  </>;
}
const descriptions: Record<RagChapterId, string> = {
  upload: "A PDF handbook is dragged into a knowledge-base import panel and added before any search.",
  extract: "The PDF text layer is parsed into readable text with the original handbook section reference preserved.",
  chunk: "Extracted handbook text splits into source-identified chunks C01, C02 and C03. C01 retains the PTO rollover policy and section four citation.",
  embed: "The same source chunks pass into an embedding-model illustration and acquire their numerical toy vectors, while preserving their original text and source IDs.",
  index: "Document vectors populate colored semantic neighborhoods while source IDs remain attached.",
  search: "Only after the index is prepared does a user type a real PTO rollover question and click Search. The query moves from the interface to the retrieval pipeline.",
  compare: "Keyword document search may return matching links and snippets. RAG retrieves source passages and supplies them to a language model for a cited answer.",
  "query-embed": "The same question becomes an embedding in the compatible document vector space.",
  retrieve: "The query appears near PTO embeddings. Cosine ranking selects the two most relevant source IDs C01 and C02.",
  evidence: "Selected vector records C01 and C02 resolve to the exact original human-readable PDF passages and source sections. The model does not receive the numeric vectors as context.",
  generate: "The original user question and retrieved C01/C02 passages are assembled into an augmented prompt. A language model produces an example answer and a section-four citation.",
  recap: "The full sequence: PDF import, direct parsing or OCR, chunk extraction, embeddings and index preparation, query-time vector similarity retrieval, original text inserted into the LLM prompt, and a cited response.",
};
function Stage({ id, f }: { id: RagChapterId; f: number }) {
  switch (id) {
    case "upload": return <Upload f={f} />;
    case "extract": return <Extract f={f} />;
    case "chunk": return <Chunk f={f} />;
    case "embed": return <Embed f={f} />;
    case "index": return <Index f={f} />;
    case "search": return <Search f={f} />;
    case "compare": return <RagSearchComparison frame={f} />;
    case "query-embed":
    case "retrieve":
    case "evidence":
    case "generate":
    case "recap": return <RagQueryVisual id={id} frame={f} />;
  }
}
export function RagVisual({ state }: { state: ExplainerFrame }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const section = RAG_CHAPTERS.find(chapter => chapter.id === state.shot.id);
  if (!section) throw new Error("Unknown RAG sequence shot " + state.shot.id);
  const index = RAG_CHAPTERS.indexOf(section);
  // Accessibility: render each chapter at its fully legible end state rather
  // than playing search packets, camera effects, sliding text or scan sweeps.
  // Export explicitly requests no-preference to preserve authored frames.
  const localFrame = prefersReducedMotion ?
    section.end - section.start - 1 : state.localFrame;
  const opacity = prefersReducedMotion ? 1 : show(localFrame, 0, 18);
  const previous = !prefersReducedMotion && index > 0 ? RAG_CHAPTERS[index - 1] : null;
  return <div data-rag-visual="" data-rag-section={section.id}
    style={{ position: "absolute", inset: 0, overflow: "hidden",
      background: C.bg, containerType: "inline-size" }}>
    <svg viewBox="0 0 1600 729" role="img" aria-label={descriptions[section.id]}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "81%", display: "block", position: "absolute",
        left: 0, top: 0 }}>
      <defs>
        <radialGradient id="ragV2StageLight" cx="47%" cy="38%" r="76%">
          <stop offset="0%" stopColor="#20445c" stopOpacity=".52" />
          <stop offset="100%" stopColor={C.bg} stopOpacity="0" />
        </radialGradient>
        <pattern id="ragV2Grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 H 0 V 48" stroke="#66859d" strokeOpacity=".075" fill="none" />
        </pattern>
        <pattern id="scanGrain" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="3" r="1.1" fill={C.gold} />
        </pattern>
      </defs>
      <rect width="1600" height="729" fill="url(#ragV2StageLight)" />
      <rect width="1600" height="729" fill="url(#ragV2Grid)" />
      {previous && opacity < 1 && <g opacity={1 - opacity}>
        <Stage id={previous.id} f={previous.end - previous.start - 1} />
      </g>}
      <g opacity={opacity}>
        <Stage id={section.id} f={localFrame} />
      </g>
    </svg>
  </div>;
}
