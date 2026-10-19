/** PDF-first RAG production. Absolute-frame motion, no CSS timing loops.
 * Text parsing, OCR, embedding and indexing are explanatory simulations;
 * original passage/source IDs come from the typed demo corpus.
 */
import type { ReactNode } from "react";
import type { ExplainerFrame } from "../../registry/visual/explainer-sequence";
import { pointOnPath, pathToSvgD } from "../../registry/motion/paths";
import type { MotionPath } from "../../registry/motion/paths";
import { RAG_CHAPTERS } from "./rag-production";
import type { RagChapterId } from "./rag-production";
import { RAG_CHUNKS, RAG_QUESTION } from "./rag-domain";
import { RagIndexNetwork } from "./rag-index-network";

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
function Progress({ x, y, w, value, color = C.mint }: {
  x: number; y: number; w: number; value: number; color?: string;
}) {
  return <g>
    <rect x={x} y={y} width={w} height="9" rx="4.5" fill="#33546b" />
    <rect x={x} y={y} width={w * clamp(value)} height="9" rx="4.5" fill={color} />
  </g>;
}
function Upload({ f }: { f: number }) {
  const path = travel("pdf-drag", [160, 198], [538, 204]);
  const loc = pointOnPath(path, show(f, 25, 90), { arcLength: true });
  return <>
    <Arrive f={f} at={0}>
      <Text x={109} y={124} size={42} weight={620}>Start with the knowledge.</Text>
      <Text x={110} y={160} size={23} color={C.subdued}>PDF ingestion happens before anyone sends a question.</Text>
    </Arrive>
    <Pane x={310} y={205} w={981} h={365} accent={C.blue} radius={31}>
      <rect x="337" y="229" width="926" height="313" rx="24"
        fill="#153247" fillOpacity=".48" stroke={C.blue}
        strokeOpacity=".43" strokeWidth="2" strokeDasharray="11 14" />
      <Text x={720} y={298} size={25} color={C.subdued} anchor="middle">Knowledge library / source documents</Text>
      <Arrive f={f} at={106}>
        <Text x={785} y={392} color={C.white} size={28} weight={600}>
          Employee Handbook.pdf
        </Text>
        <Text x={785} y={429} color={C.subdued} size={21}>6 sections · local example data</Text>
      </Arrive>
      <g opacity={show(f, 137)}>
        <rect x="783" y="459" width="340" height="56" rx="15"
          fill={f >= 151 && f <= 174 ? "#2a776e" : "#24675e"}
          stroke={C.mint} strokeOpacity=".55" />
        <Text x={954} y={495} color={C.white} size={23} weight={650} anchor="middle">
          {f >= 184 ? "Imported" : "Add to knowledge base"}
        </Text>
      </g>
      <g opacity={show(f, 175)}>
        <Progress x={784} y={534} w={336} value={show(f, 177, 31)} />
      </g>
    </Pane>
    <g opacity={hide(f, 181, 22)}><PdfGlyph x={loc.x} y={loc.y} scale={.61} /></g>
    <g opacity={show(f, 101, 12)}><PdfGlyph x={535} y={329} scale={.54} /></g>
    {f >= 125 && f < 192 && <Pointer x={f < 154 ? 1190 - show(f, 127, 28) * 180 : 1011}
      y={f < 154 ? 545 - show(f, 127, 28) * 50 : 499} pressed={f >= 157 && f < 170} />}
  </>;
}
function Page({ x, y, scanned = false, f }: {
  x: number; y: number; scanned?: boolean; f: number;
}) {
  const color = scanned ? C.gold : C.blue;
  return <g>
    <Pane x={x} y={y} w={320} h={332} accent={color} radius={18}>
      <Chip x={x + 20} y={y + 16} text={scanned ? "IMAGE PAGE" : "TEXT LAYER"} color={color} />
      <Text x={x + 23} y={y + 92} size={21} weight={620}>PAGE {scanned ? "2" : "1"}</Text>
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i}>
          <rect x={x + 24} y={y + 118 + i * 24}
            width={i % 3 === 0 ? 214 : i % 2 ? 265 : 238} height="10" rx="3"
            fill={scanned ? "#668497" : "#92b7d4"} opacity={scanned ? .55 : .72} />
          {scanned && <g opacity={show(f, 75 + i * 13, 13)}>
            <rect x={x + 19} y={y + 114 + i * 24}
              width={272} height={18} rx={4} stroke={C.gold}
              fill={C.gold} fillOpacity=".07" strokeOpacity=".75" />
          </g>}
          {!scanned && i === 3 && <rect x={x + 19} y={y + 114 + i * 24}
            width={270 * show(f, 28, 55)} height="20"
            rx="5" fill={C.blue} fillOpacity=".22" />}
        </g>
      ))}
      {scanned && <rect x={x + 22} y={y + 115} width="274" height="194"
        rx="8" fill="url(#scanGrain)" opacity=".12" />}
    </Pane>
  </g>;
}
function Extract({ f }: { f: number }) {
  return <>
    <Text x={98} y={116} size={38} weight={630}>Read what's actually inside the PDF.</Text>
    <Text x={100} y={153} color={C.subdued} size={22}>
      Choose the extraction path per page.
    </Text>
    <Arrive f={f} at={0}><Page x={72} y={194} f={f} /></Arrive>
    <Arrive f={f} at={22}><Page x={418} y={194} scanned f={f} /></Arrive>
    <Arrive f={f} at={64}>
      <Chip x={94} y={552} text="PDF PARSER" color={C.blue} />
      <Chip x={450} y={552} text="OCR IF SCANNED" color={C.gold} />
    </Arrive>
    <Route f={f} at={85} len={67} a={[400, 370]} b={[843, 323]} color={C.blue} visibleFrom={64} />
    <Route f={f} at={132} len={69} a={[741, 389]} b={[843, 409]} color={C.gold} visibleFrom={108} />
    <Arrive f={f} at={155}>
      <Pane x={856} y={188} w={648} h={382} accent={C.mint}>
        <Chip x={885} y={213} text="EXTRACTED TEXT" color={C.mint} />
        <Text x={887} y={310} color={C.white} size={27} weight={620}>
          Up to five unused PTO days
        </Text>
        <Text x={887} y={345} color={C.white} size={27} weight={620}>
          may carry into the next year.
        </Text>
        <Text x={888} y={412} size={23} color={C.subdued}>Page 1 · source §4</Text>
        <g opacity={show(f, 205)}>
          <Text x={887} y={482} size={22} color={C.gold}>
            Scan recognized · page 2
          </Text>
          <Text x={887} y={517} size={18} color={C.subdued}>Review OCR reading order and accuracy.</Text>
        </g>
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
    <Text x={x + 235} y={y + 44} size={22} color={C.white} weight={550}>
      {i === 0 ? "5 unused PTO days may carry over" :
        i === 1 ? "PTO eligibility after 90 days" :
        "Travel meal expenses with receipts"}
    </Text>
    <Text x={x + 238} y={y + 84} size={18} color={C.subdued}>
      Employee Handbook.pdf · original source maintained
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
      return <g key={chunk.id}>
        <Route f={f} at={at} len={47}
          a={[475, 356 + i * 22]} b={[600, y + 53]}
          color={i === 0 ? C.mint : C.blue} visibleFrom={at - 13} />
        <Arrive f={f} at={at + 42} dy={20}>
          <SourceStrip x={608} y={y} i={i} />
        </Arrive>
      </g>;
    })}
    <Arrive f={f} at={255}>
      <Text x={609} y={609} size={21} color={C.mint}>
        Chunk IDs and § source anchors travel with the text.
      </Text>
    </Arrive>
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
      <Text x={794} y={512} size={19} color={C.subdued} anchor="middle">
        Illustrative internal layers
      </Text>
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
            <Text x={115} y={y + 82} size={18} color={C.subdued}>Source text · {chunk.section}</Text>
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
            <Text x={1090} y={y + 82} size={18} color={C.subdued}>Vector + linked source ID</Text>
          </Pane>
        </Arrive>
      </g>;
    })}
    <Arrive f={f} at={283}>
      <Text x={1112} y={608} size={19} color={C.quiet}>2D toy vectors · real models use many dimensions</Text>
    </Arrive>
  </>;
}
function Index({ f }: { f: number }) {
  return <>
    <Text x={96} y={112} size={39} weight={630}>Prepare the vector index.</Text>
    <Text x={98} y={152} size={22} color={C.subdued}>
      Each vector points back to its original passage.
    </Text>
    <Arrive f={f} at={6}>
      <Pane x={92} y={249} w={333} h={255} accent={C.purple}>
        <Chip x={115} y={275} text="INDEX RECORD" color={C.purple} />
        <Text x={123} y={376} size={25} weight={650} color={C.mint}>C01 · §4</Text>
        <Text x={123} y={412} size={23} color={C.white} code>[0.94, 0.34]</Text>
        <Text x={123} y={461} size={19} color={C.subdued}>↳ original PDF text</Text>
      </Pane>
    </Arrive>
    <Route f={f} at={25} len={75} a={[431, 378]} b={[574, 378]}
      color={C.purple} visibleFrom={4} />
    <g style={{ opacity: show(f, 15) }}>
      <foreignObject x="508" y="174" width="1000" height="420">
        <div style={{ width: "100%", height: "100%" }}>
          <RagIndexNetwork frame={f} />
        </div>
      </foreignObject>
    </g>
    <Arrive f={f} at={150}>
      <Text x={108} y={584} size={21} color={C.mint}>Index ready before the first search.</Text>
    </Arrive>
  </>;
}
function Search({ f }: { f: number }) {
  const typed = RAG_QUESTION.slice(0, Math.round(RAG_QUESTION.length * show(f, 52, 148)));
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
        <Text x={289} y={376} size={27}
          color={typed ? C.white : C.quiet}>{typed || "Ask something about your documents…"}</Text>
        {f < 202 && f > 43 &&
          <rect x={291 + typed.length * 13.7} y="344" width="3" height="42"
            fill={C.gold} opacity={Math.floor(f / 15) % 2 === 0 ? 1 : .22} />}
        <rect x="1116" y="435" width="199" height="71" rx="17"
          fill={buttonPressed ? "#85602f" : "#b98b52"} stroke={C.gold} strokeWidth="2" />
        <Text x={1217} y={478} size={25} color="#102436" weight={740}
          anchor="middle">Search ↗</Text>
        <Text x={260} y={518} size={18} color={C.subdued}>Employee Handbook.pdf · indexed</Text>
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
  extract: "A page with embedded selectable text is parsed directly. A separate scanned image page is recognized with OCR. Both paths yield text linked to the original PDF page and section.",
  chunk: "Extracted handbook text splits into source-identified chunks C01, C02 and C03. C01 retains the PTO rollover policy and section four citation.",
  embed: "The same source chunks pass into an embedding-model illustration and acquire their numerical toy vectors, while preserving their original text and source IDs.",
  index: "Embeddings and source IDs are stored in a connected illustrative vector index with six persistent chunk nodes and animated packets following index edges.",
  search: "Only after the index is prepared does a user type a real PTO rollover question and click Search. The query moves from the interface to the retrieval pipeline.",
};
function Stage({ id, f }: { id: RagChapterId; f: number }) {
  switch (id) {
    case "upload": return <Upload f={f} />;
    case "extract": return <Extract f={f} />;
    case "chunk": return <Chunk f={f} />;
    case "embed": return <Embed f={f} />;
    case "index": return <Index f={f} />;
    case "search": return <Search f={f} />;
  }
}
export function RagVisual({ state }: { state: ExplainerFrame }) {
  const section = RAG_CHAPTERS.find(chapter => chapter.id === state.shot.id);
  if (!section) throw new Error("Unknown RAG sequence shot " + state.shot.id);
  const index = RAG_CHAPTERS.indexOf(section);
  const opacity = show(state.localFrame, 0, 16);
  return <div data-rag-visual="" data-rag-section={section.id}
    style={{ position: "absolute", inset: 0, overflow: "hidden",
      background: C.bg, containerType: "inline-size" }}>
    <svg viewBox="0 0 1600 675" role="img" aria-label={descriptions[section.id]}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "75%", display: "block", position: "absolute",
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
      <rect width="1600" height="675" fill="url(#ragV2StageLight)" />
      <rect width="1600" height="675" fill="url(#ragV2Grid)" />
      <g opacity={opacity}>
        <Stage id={section.id} f={state.localFrame} />
      </g>
      <line x1="75" y1="654" x2="1525" y2="654" stroke={C.line} opacity=".55" />
      <Text x={95} y={637} size={18} color={C.subdued} weight={640}>
        INDEXING / {section.label.toUpperCase()}
      </Text>
      <Text x={1508} y={637} size={19} code color={C.mint} anchor="end">
        {String(index + 1).padStart(2, "0")} / 06
      </Text>
    </svg>
    <div aria-hidden="true" style={{ position: "absolute", left: "4.7%",
      top: "2%", font: "650 clamp(10px, 1.2cqi, 18px) " + mono,
      letterSpacing: ".16em", color: C.mint }}>KNOWLEDGE / FIRST PRINCIPLES</div>
    <div aria-hidden="true" style={{ position: "absolute", right: "4.7%",
      top: "2%", font: "500 clamp(10px, 1.05cqi, 16px) " + mono,
      letterSpacing: ".07em", color: C.subdued }}>PDF → INDEX → SEARCH</div>
  </div>;
}
