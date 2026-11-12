import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileTwoLaneSwap } from "../../registry/motion/two-lane-swap";
import type { TwoLaneSwapSpec } from "../../registry/motion/two-lane-swap";
import { TwoLaneSwapSvg } from "../../registry/motion/two-lane-swap-react";

interface DemoProps {
  initialFrame?: number;
  initialPortrait?: boolean;
  initialReducedMotion?: boolean;
}
type Asset = "warm" | "cool";

function OriginalArtifact({ kind, smaller }: { kind: Asset; smaller: boolean }) {
  const golden = kind === "warm";
  const back = golden ? "#26344B" : "#193E48";
  const stroke = golden ? "#F5BE78" : "#75E6D2";
  const fill = golden ? "#E8A958" : "#56CFBE";
  return (
    <g transform={smaller ? "scale(0.76)" : undefined}>
      <rect x={-104} y={-64} width={208} height={128} rx={25}
        fill={back} stroke={stroke} strokeOpacity={.7} strokeWidth={2.5}/>
      <rect x={-96} y={-56} width={192} height={112} rx={18}
        fill="none" stroke="#FFFFFF" strokeOpacity={.09}/>
      {golden ? (
        <g>
          <path d="M -71 16 C -40 -38 -6 -27 15 -4 S 52 38 74 -18"
            fill="none" stroke={stroke} strokeWidth={10}
            strokeLinecap="round"/>
          <path d="M -72 20 C -36 18 0 42 32 22 S 56 1 72 8"
            fill="none" stroke={fill} strokeWidth={3} strokeOpacity={.7}
            strokeLinecap="round"/>
          <circle cx={-71} cy={16} r={9} fill={fill}/>
          <circle cx={74} cy={-18} r={9} fill={fill}/>
        </g>
      ) : (
        <g>
          <ellipse rx={62} ry={30} fill="none"
            stroke={stroke} strokeWidth={9} transform="rotate(-28)"/>
          <ellipse rx={57} ry={26} fill="none"
            stroke={fill} strokeWidth={2.5}
            strokeDasharray="9 10" opacity={.8}
            transform="rotate(36)"/>
          <circle cx={45} cy={-35} r={11} fill={fill}/>
          <circle cx={-20} cy={22} r={7} fill={stroke}/>
        </g>
      )}
      <path d="M -71 -47 h22 M 51 47 h20"
        stroke={stroke} strokeWidth={2}
        strokeLinecap="round" opacity={.48}/>
    </g>
  );
}

function TwoLaneSwapDemo({
  initialFrame = 57, initialPortrait = false,
  initialReducedMotion = false,
}: DemoProps) {
  const [portrait, setPortrait] = useState(initialPortrait);
  const [reduced, setReduced] = useState(initialReducedMotion);
  const [frame, setFrame] = useState(initialFrame);
  const spec = useMemo<TwoLaneSwapSpec>(() => {
    const width = portrait ? 720 : 1200;
    const height = portrait ? 1080 : 680;
    return {
      schemaVersion: 1, id: "original-exchange",
      stage: { width, height },
      subjectA: { id: "amber-signal", radiusPx: portrait ? 92 : 116 },
      subjectB: { id: "jade-orbit", radiusPx: portrait ? 92 : 116 },
      left: { x: portrait ? 182 : 292, y: portrait ? 555 : 382 },
      right: { x: portrait ? 538 : 908, y: portrait ? 555 : 382 },
      startFrame: 0, durationFrames: 120,
      staggerFrames: 6,
      arcHeightPx: portrait ? 146 : 140,
      anticipationPx: 10, overshootPx: 8,
      maxTiltDeg: 5, depthScaleDip: .04,
      clearancePx: 22, safeMarginPx: 30,
      layerOrder: "a-front",
    };
  }, [portrait]);
  const compiled = useMemo(() => compileTwoLaneSwap(spec), [spec]);
  const w = spec.stage.width;
  const h = spec.stage.height;
  const top = portrait ? 92 : 65;
  const controls = {
    color: "#D7E5F1",
    fontFamily: "system-ui,-apple-system,sans-serif",
  };
  return (
    <main style={{
      ...controls, background: "#08111D", minHeight: "100vh",
      padding: "min(4vw,44px)",
    }}>
      <div style={{ maxWidth: 1200, margin: "auto" }}>
        <header style={{
          display: "flex", gap: 16, justifyContent: "space-between",
          flexWrap: "wrap", alignItems: "baseline", marginBottom: 19,
        }}>
          <div>
            <div style={{
              color: "#85D6C9", fontSize: 12,
              letterSpacing: "0.25em", fontWeight: 750,
            }}>MOTION ENGINE / ORIGINAL SCENE MECHANICS</div>
            <h1 style={{
              fontSize: "clamp(25px,3vw,40px)", fontWeight: 680,
              margin: "8px 0 0", letterSpacing: "-.04em",
            }}>Two-Lane Swap</h1>
          </div>
          <span style={{ color: "#829BAE", fontSize: 14 }}>
            Frame-accurate · authorable SVG subjects · no animation clock
          </span>
        </header>
        {compiled.ok ? (
          <div style={{
            border: "1px solid #375166", borderRadius: 18,
            overflow: "hidden", background: "#0C1726",
            maxWidth: portrait ? 540 : 1200, margin: "auto",
          }}>
            <TwoLaneSwapSvg plan={compiled.plan} frame={frame}
              reducedMotion={reduced} ariaLabel={
                "Gold wave and mint orbit swap positions on safely separated curved lanes."
              }
              subjectA={<OriginalArtifact kind="warm" smaller={portrait}/>}
              subjectB={<OriginalArtifact kind="cool" smaller={portrait}/>}
              background={
                <g>
                  <defs>
                    <linearGradient id="lane-stage-bg" x1="0" y1="0" x2="1" y2="1">
                      <stop stopColor="#101D2C"/>
                      <stop offset=".58" stopColor="#17293B"/>
                      <stop offset="1" stopColor="#0A1524"/>
                    </linearGradient>
                    <radialGradient id="lane-glow">
                      <stop stopColor="#2D5960" stopOpacity=".42"/>
                      <stop offset="1" stopColor="#2D5960" stopOpacity="0"/>
                    </radialGradient>
                    <pattern id="lane-grid" width={40} height={40}
                      patternUnits="userSpaceOnUse">
                      <path d="M 40 0 H 0 V 40"
                        fill="none" stroke="#D3E9FC" strokeOpacity=".045"/>
                    </pattern>
                  </defs>
                  <rect width={w} height={h} fill="url(#lane-stage-bg)"/>
                  <ellipse cx={w*.5} cy={h*.49} rx={w*.53} ry={h*.47}
                    fill="url(#lane-glow)"/>
                  <rect width={w} height={h} fill="url(#lane-grid)"/>
                  <path d={"M " + spec.left.x + " " + spec.left.y +
                    " Q " + w*.5 + " " + (spec.left.y - spec.arcHeightPx!*2) +
                    " " + spec.right.x + " " + spec.right.y}
                    fill="none" stroke="#E9B878" strokeOpacity=".18"
                    strokeWidth={2} strokeDasharray="6 13"/>
                  <path d={"M " + spec.right.x + " " + spec.right.y +
                    " Q " + w*.5 + " " + (spec.left.y + spec.arcHeightPx!*2) +
                    " " + spec.left.x + " " + spec.left.y}
                    fill="none" stroke="#7BE4D4" strokeOpacity=".18"
                    strokeWidth={2} strokeDasharray="6 13"/>
                  {[spec.left.x, spec.right.x].map((x, i) => (
                    <g key={x}>
                      <circle cx={x} cy={spec.left.y} r={17}
                        fill="none" stroke={i ? "#7BE4D4" : "#E9B878"}
                        strokeOpacity=".22" strokeWidth={2}/>
                      <circle cx={x} cy={spec.left.y} r={4}
                        fill="#BDCCD9" fillOpacity=".3"/>
                    </g>
                  ))}
                </g>
              }
              overlay={
                <g>
                  <text x={w*.07} y={top} fontSize={portrait ? 23 : 17}
                    fill="#A1B4C4" fontWeight={750} letterSpacing={4}>
                    THE ART OF EXCHANGE
                  </text>
                  <text x={w*.07} y={top+37} fontSize={portrait ? 18 : 16}
                    fill="#728D9F">
                    Two independent stories. One intentional crossing.
                  </text>
                  <path d={"M " + w*.07 + " " + (h-93) + " H " + w*.93}
                    stroke="#7893A7" strokeOpacity=".3" strokeWidth={1}/>
                  <text x={w*.07} y={h-61} fontSize={portrait ? 19 : 16}
                    fill="#B5CBDC" letterSpacing={2}>
                    ORIGINAL CHOREOGRAPHY
                  </text>
                  <text x={w*.93} y={h-61} fontSize={portrait ? 17 : 15}
                    fill="#81B9B2" textAnchor="end">
                    A / B
                  </text>
                </g>
              }
            />
          </div>
        ) : (
          <div role="alert" style={{ padding: 30, color: "#FFAEAC" }}>
            Invalid motion spec: {compiled.diagnostics.map(d => d.message).join("; ")}
          </div>
        )}
        <section style={{
          maxWidth: 900, margin: "25px auto 0", padding: 22,
          border: "1px solid #294559", borderRadius: 14,
          background: "#111F2E",
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12,
            alignItems: "center", justifyContent: "space-between" }}>
            <label htmlFor="lane-swap-frame" style={{
              fontSize: 15, fontWeight: 630,
            }}>Absolute frame <strong style={{ color: "#8BE5D4" }}>{frame} / 119</strong></label>
            <div style={{ display: "flex", gap: 13, flexWrap: "wrap" }}>
              <label><input type="checkbox" checked={portrait}
                onChange={e=>setPortrait(e.target.checked)}/> Portrait stage</label>
              <label><input type="checkbox" checked={reduced}
                onChange={e=>setReduced(e.target.checked)}/> Reduced motion</label>
            </div>
          </div>
          <input id="lane-swap-frame" aria-label="Sequence frame" type="range"
            min={0} max={119} step={1} value={frame}
            onChange={e=>setFrame(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#80DCCF", marginTop: 12 }}/>
          <div style={{ display: "flex", gap: 9, marginTop: 15,
            justifyContent: "space-between", flexWrap: "wrap" }}>
            {[
              ["Establish",0],["Anticipation",10],
              ["Crossing",58],["Settle",103],["Final hold",119],
            ].map(([label, value]) => (
              <button key={label} type="button"
                onClick={()=>setFrame(Number(value))}
                style={{ border: "1px solid #466079", borderRadius: 8,
                  padding: "8px 14px", color: "#D8E9F5",
                  background: frame === value ? "#244E58" : "#1B3043",
                  cursor: "pointer", fontSize: 13 }}>
                {label}
              </button>
            ))}
          </div>
          {compiled.ok && <p style={{
            color: "#9BB4C4", fontSize: 13, margin: "16px 0 0",
          }}>
            Structural QA: {compiled.plan.checkedFrameCount} frames checked ·
            minimum circle clearance {compiled.plan.minSampledClearancePx.toFixed(1)} px ·
            no off-frame subjects. Art and motion still require human visual review.
          </p>}
        </section>
      </div>
    </main>
  );
}

const meta = {
  title: "Motion engine/Two Lane Swap",
  id: "motion-two-lane-swap",
  component: TwoLaneSwapDemo,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof TwoLaneSwapDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Crossing: Story = { args: { initialFrame: 58 } };
export const Establish: Story = { args: { initialFrame: 0 } };
export const FinalHold: Story = { args: { initialFrame: 119 } };
export const Portrait: Story = { args: { initialFrame: 58, initialPortrait: true } };
export const ReducedMotion: Story = {
  args: { initialFrame: 58, initialReducedMotion: true },
};
