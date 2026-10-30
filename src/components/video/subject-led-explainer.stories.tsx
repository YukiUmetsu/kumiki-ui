import { DiagramStage } from "../../../registry/motion/diagram-stage-react";
import { createDiagramTimeline } from "../../../registry/motion/diagram-stage";
import type { DiagramSpec } from "../../../registry/infographic/types";
import type { OneChangeKind, OneChangeSample } from "../../../registry/video/one-change-hold";
import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SubjectStage } from "../../../registry/video/subject-stage";
import type { SubjectAsset } from "../../../registry/video/subject-stage";

const windowSpec={startFrame:3188,endFrame:3488,changeFrame:3212,change:"connect" as const};
const dataUri=(svg:string)=>"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
/** Original illustration, not a screenshot of any vendor's product. */
const ledger=dataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 484"><rect width="860" height="484" fill="#f3f7f9"/><rect width="860" height="62" fill="#17394e"/><text x="32" y="41" font-family="Arial" font-size="27" fill="white">Invoices / General Ledger</text><rect x="34" y="99" width="792" height="50" rx="6" fill="#d5e5ed"/><text x="50" y="133" font-family="Arial" font-size="21" fill="#17394e">Date</text><text x="260" y="133" font-family="Arial" font-size="21" fill="#17394e">Invoice</text><text x="610" y="133" font-family="Arial" font-size="21" fill="#17394e">Amount</text><g font-family="Arial" font-size="21" fill="#214056"><text x="50" y="207">Oct 24</text><text x="260" y="207">INV-0128</text><text x="610" y="207">$845.00</text><text x="50" y="270">Oct 25</text><text x="260" y="270">INV-0129</text><text x="610" y="270">$390.00</text><text x="50" y="338">Oct 26</text><text x="260" y="338">INV-0130</text><text x="610" y="338">$775.00</text></g><g stroke="#cad8df" stroke-width="2"><path d="M34 225H826M34 291H826M34 358H826"/></g></svg>');
const receipt=dataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 700"><rect width="1100" height="700" fill="#7a6556"/><path d="M0 500L1100 80V700H0" fill="#b59472"/><g transform="rotate(-8 545 353)"><rect x="361" y="105" width="370" height="520" rx="5" fill="#f6eddd"/><path d="M410 190H682M410 236H682M410 305H682M410 350H631M410 420H682M410 500H682" stroke="#a1a0a0" stroke-width="12"/><path d="M409 548H650" stroke="#2e5363" stroke-width="16"/></g></svg>');
const mark=dataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 280"><rect width="280" height="280" rx="42" fill="#1f5a62"/><path d="M76 60V220M76 70H222M76 120H222M76 170H222M76 220H222" stroke="#d2f4e5" stroke-width="16" stroke-linecap="round"/></svg>');
const mobileLedger = dataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844"><rect width="390" height="844" fill="#f2f7f8"/><rect width="390" height="132" fill="#1a4f59"/><text x="28" y="61" font-size="31" font-weight="700" font-family="Arial" fill="white">Invoices</text><text x="28" y="101" font-size="20" font-family="Arial" fill="#b6eddf">Mobile ledger</text><g font-family="Arial" fill="#274252"><rect x="18" y="163" width="354" height="146" rx="16" fill="white"/><text x="37" y="207" font-size="18">INV-0128</text><text x="37" y="248" font-size="27" font-weight="700">$845.00</text><text x="37" y="285" font-size="16">Filed Oct 24</text><rect x="18" y="331" width="354" height="146" rx="16" fill="white"/><text x="37" y="375" font-size="18">INV-0129</text><text x="37" y="416" font-size="27" font-weight="700">$390.00</text><text x="37" y="453" font-size="16">Filed Oct 25</text><rect x="18" y="499" width="354" height="146" rx="16" fill="white"/><text x="37" y="543" font-size="18">INV-0130</text><text x="37" y="584" font-size="27" font-weight="700">$775.00</text><text x="37" y="621" font-size="16">Filed Oct 26</text></g></svg>');
/** Real Kumiki DiagramStage, with semantic nodes and an authored zero-drift timeline. */
function CauseDiagram({ changed, portrait, hasSubject, receipt = false }: {
  changed: boolean; portrait: boolean; hasSubject: boolean; receipt?: boolean;
}) {
  const width = portrait ? 848 : hasSubject ? 660 : 1680;
  const height = portrait ? hasSubject ? 540 : 1210 : 640;
  const graph = useMemo<DiagramSpec>(() => ({
    nodes: changed ? [
      { id: "source", label: receipt ? "Desk" : "Inbox" },
      { id: "destination", label: receipt ? "Folder" : "Ledger" },
    ] : [{ id: "source", label: receipt ? "Desk" : "Inbox" }],
    edges: changed ? [{ id: "transfer", from: "source", to: "destination" }] : [],
  }), [changed, receipt]);
  const timeline = useMemo(() => {
    const nodeWidth = portrait ? width * .56 : width * .34;
    const nodeHeight = portrait ? 126 : 164;
    const x1 = portrait ? (width - nodeWidth) / 2 : width * .05;
    const y1 = portrait ? height * .12 : height * .30;
    const x2 = portrait ? x1 : width * .61;
    const y2 = portrait ? height * .64 : y1;
    return createDiagramTimeline({
      id: "subject-led-" + (changed ? "after" : "before"),
      graph, fps: { num: 30, den: 1 }, durationFrames: 1,
      layouts: [{ frame: 0, bounds: {
        source: { x: x1, y: y1, width: nodeWidth, height: nodeHeight },
        ...(changed ? { destination: { x: x2, y: y2, width: nodeWidth, height: nodeHeight } } : {}),
      }}],
    });
  }, [changed, graph, height, portrait, width]);
  return <DiagramStage graph={graph} timeline={timeline} frame={0} width={width} height={height}
    ariaLabel={receipt ? "Desk connects to folder" : "Invoice inbox connects to ledger"}
    ports={portrait ? { transfer: { from: { side: "bottom" }, to: { side: "top" } } } : undefined}
    theme={{ surface: "#101a27", node: "#244559", ink: "#f5f7f8",
      edge: "#65dbc7", mutedInk: "#c7d8df", fontSize: portrait ? 44 : 42,
      strokeWidth: 5, radius: 22 }}/>
}

/** Each action reveals only its own authored geometry; portrait rearranges, never overlaps. */
function SemanticDiagram({ sample, portrait }: { sample: OneChangeSample; portrait: boolean }) {
  const width = portrait ? 848 : 660, height = portrait ? 540 : 640;
  const first = portrait
    ? { x: 170, y: 28, width: 508, height: 152 }
    : { x: 17, y: 120, width: 276, height: 198 };
  const second = portrait
    ? { x: 170, y: 322, width: 508, height: 152 }
    : { x: 368, y: 120, width: 276, height: 198 };
  const center1 = first.x + first.width / 2, center2 = second.x + second.width / 2;
  const label = sample.change === "compare" ? "Invoice comparison" :
    sample.change === "ring" ? "An invoice example" :
    sample.change === "move" ? "Invoice reaches the next step" : "Ledger focus";
  const revealed = sample.showNextStep || sample.showComparison;
  return <svg data-km-semantic-reveal={sample.change} role="img" aria-label={label}
    viewBox={`0 0 ${width} ${height}`} style={{ display: "block", width: "100%", height: "100%" }}>
    <rect {...first} rx="25" fill="#244559" stroke="#7ea2ad" strokeWidth="4"/>
    <text x={center1} y={first.y + first.height / 2 + 13} fill="#f4f8f9"
      textAnchor="middle" fontSize="37">{sample.change === "compare" ? "Unfiled" : "Invoice"}</text>
    {revealed && <g data-km-next-step={String(sample.showNextStep)}
      data-km-comparison={String(sample.showComparison)}>
      <path d={portrait ? "M424 183V316" : "M295 220H362"}
        stroke="#65dbc7" strokeWidth="8" strokeLinecap="round" fill="none"/>
      <path d={portrait ? "M409 300L424 318L439 300" : "M347 205L365 220L347 235"}
        stroke="#65dbc7" strokeWidth="6" fill="none"/>
      <rect {...second} rx="25" fill="#244559" stroke="#65dbc7" strokeWidth="4"/>
      <text x={center2} y={second.y + second.height / 2 + 13}
        fill="white" fontSize="37" textAnchor="middle">
        {sample.showComparison ? "Filed" : "Ledger"}
      </text>
    </g>}
    {sample.showRing && <circle data-km-ring="" cx={center1} cy={first.y + first.height / 2}
      r={portrait ? 115 : 150} fill="none" stroke="#65dbc7" strokeWidth="10"/>}
    {sample.emphasizeSubject && <text x={width / 2} y={portrait ? 500 : 420}
      fill="#65dbc7" fontSize="34" textAnchor="middle">Ledger selected</text>}
  </svg>;
}
type Variant = "laptop" | "monitor" | "phone" | "screen" | "icon" | "no-icon" | "receipt" | "diagram";
function Demo({ variant, action = "connect" }: { variant: Variant; action?: OneChangeKind }) {
  const [frame, setFrame] = useState(3212);
  const [portrait, setPortrait] = useState(false);
  const receiptExample = variant === "receipt";
  const effectiveAction = receiptExample ? "move" : action;
  const window = { ...windowSpec, change: effectiveAction };
  const src: SubjectAsset | undefined = variant === "diagram" ? undefined
    : variant === "icon" || variant === "no-icon"
      ? { mode: "icon", src: variant === "icon" ? mark : undefined,
          name: "Accounting software", claim: "software files each invoice" }
      : receiptExample
        ? { mode: "scene", src: receipt, alt: "Original illustration of a receipt on a desk",
            focalPoint: { x: .5, y: .5 } }
        : variant === "screen" ? { mode: "screen", src: ledger, alt: "Illustrated ledger table" }
        : { mode: "device", src: variant === "phone" ? mobileLedger : ledger,
            alt: variant === "phone" ? "Illustrated mobile invoice app" : "Illustrated accounting ledger",
            device: variant, highlight: variant === "phone"
              ? { x: .04, y: .39, width: .92, height: .15 }
              : { x: .08, y: .42, width: .84, height: .12 } };
  const isCause = effectiveAction === "connect" || receiptExample;
  const hasSubject = Boolean(src);
  return <main style={{ background: "#101a27", color: "#eef5f7", minHeight: "100vh",
      padding: 24, fontFamily: "system-ui" }}>
    <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
      <label><input type="checkbox" checked={portrait} onChange={e => setPortrait(e.target.checked)}/> 9:16 portrait</label>
      <span>Absolute frame {frame} · {effectiveAction}</span>
    </div>
    <div style={{ maxWidth: portrait ? 425 : 1100, margin: "auto" }}>
      <SubjectStage frame={frame} window={window} orientation={portrait ? "portrait" : "landscape"}
        subject={src}
        title={receiptExample ? "A receipt waits on the desk" :
          variant === "phone" ? "Mobile invoices" : "Where does each invoice go?"}
        caption={receiptExample ? "someone files the receipt" : "software files each invoice"}
        explanation={sample => isCause
          ? <CauseDiagram changed={receiptExample ? sample.showNextStep : sample.showConnector}
              portrait={portrait} hasSubject={hasSubject} receipt={receiptExample}/>
          : <SemanticDiagram sample={sample} portrait={portrait}/>}
      />
    </div>
    <label style={{ display: "block", marginTop: 24 }}>Seek the reveal
      <input style={{ width: "100%" }} type="range" min={3188} max={3487}
        value={frame} onChange={e => setFrame(Number(e.target.value))}/>
    </label>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
      {[3188, 3211, 3212, 3213, 3400, 3487].map(n => <button key={n} type="button"
        onClick={() => setFrame(n)} aria-pressed={frame === n}
        style={{ padding: "10px 12px", color: "#172735", background: frame === n ? "#65dbc7" : "#e0efef",
          border: 0, borderRadius: 6, cursor: "pointer" }}>{n}</button>)}
    </div>
  </main>;
}
const meta = { title: "Motion/Subject Led Explainers", component: SubjectStage,
  args: { frame: 3212, window: windowSpec, explanation: <span>Diagram</span> },
  parameters: { layout: "fullscreen" } } satisfies Meta<typeof SubjectStage>;
export default meta;
type Story = StoryObj<typeof meta>;
export const LedgerLaptop: Story = { render: () => <Demo variant="laptop"/> };
export const LedgerMonitor: Story = { render: () => <Demo variant="monitor"/> };
export const MobileApp: Story = { render: () => <Demo variant="phone"/> };
export const ScreenshotWithoutBezel: Story = { render: () => <Demo variant="screen"/> };
export const OriginalIcon: Story = { render: () => <Demo variant="icon"/> };
export const GenericIcon: Story = { render: () => <Demo variant="no-icon"/> };
export const ReceiptScene: Story = { render: () => <Demo variant="receipt"/> };
export const DiagramOnly: Story = { render: () => <Demo variant="diagram"/> };
export const ShowEmphasis: Story = { render: () => <Demo variant="screen" action="show"/> };
export const AdvanceJourney: Story = { render: () => <Demo variant="screen" action="move"/> };
export const CompareReveal: Story = { render: () => <Demo variant="screen" action="compare"/> };
export const RingExample: Story = { render: () => <Demo variant="screen" action="ring"/> };
