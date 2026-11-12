import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compilePairedFocus, evaluatePairedFocus } from "../../registry/motion/paired-focus";
import type { PairedFocusMode, PairedFocusSpec } from "../../registry/motion/paired-focus";
import { PairedFocusSvg } from "../../registry/motion/paired-focus-react";

interface Props { initialMode?: PairedFocusMode; initialFrame?: number;
  initialPortrait?: boolean; initialReducedMotion?: boolean }
const MODE_CHOICES: PairedFocusMode[] = [
  "converge", "diverge", "converge-then-diverge",
];

function OriginalGlyph({ kind }: { kind: "wave" | "orbit" }) {
  const warm = kind === "wave";
  const ink = warm ? "#EFC18D" : "#80EDDA";
  const body = warm ? "#293A50" : "#1E454A";
  return <g>
    <circle r={93} fill={body} stroke={ink}
      strokeOpacity={.65} strokeWidth={2}/>
    <circle r={83} fill="none" stroke="#EEF8FA"
      strokeOpacity={.1} strokeWidth={1}/>
    <circle r={67} fill="none" stroke={ink}
      strokeDasharray="3 11" strokeOpacity={.5} strokeWidth={1.5}/>
    {warm ? <>
      <path d="M -54 0 C -27 -50 4 50 29 0 S 53 -20 56 -2"
        fill="none" stroke={ink} strokeWidth={9} strokeLinecap="round"/>
      <circle cx={-54} cy={0} r={8} fill={ink}/>
      <circle cx={56} cy={-2} r={8} fill={ink}/>
    </> : <>
      <ellipse rx={55} ry={23} fill="none" stroke={ink}
        strokeWidth={8} transform="rotate(-31)"/>
      <ellipse rx={54} ry={24} fill="none" stroke="#B6F3E8"
        strokeWidth={2} strokeOpacity={.65} transform="rotate(37)"/>
      <circle cx={42} cy={-35} r={10} fill={ink}/>
    </>}
    <circle cx={-64} cy={-61} r={4} fill={ink} opacity={.8}/>
    <circle cx={68} cy={56} r={3} fill={ink} opacity={.5}/>
  </g>;
}
function PairedFocusShowcase({
  initialMode = "converge-then-diverge", initialFrame = 72,
  initialPortrait = false, initialReducedMotion = false,
}: Props) {
  const [mode, setMode] = useState<PairedFocusMode>(initialMode);
  const [portrait, setPortrait] = useState(initialPortrait);
  const [reduced, setReduced] = useState(initialReducedMotion);
  const [frame, setFrame] = useState(initialFrame);
  const spec = useMemo<PairedFocusSpec>(() => {
    const w = portrait ? 720 : 1280;
    const h = portrait ? 1080 : 720;
    return {
      schemaVersion: 1,
      id: "paired-idea-focus", mode,
      stage: { width: w, height: h },
      subjectA: { id: "gold-wave", radiusPx: portrait ? 77 : 102 },
      subjectB: { id: "mint-orbit", radiusPx: portrait ? 77 : 102 },
      outerA: { x: portrait ? 140 : 272, y: portrait ? 553 : 386 },
      outerB: { x: portrait ? 580 : 1008, y: portrait ? 553 : 386 },
      focus: { x: w / 2, y: portrait ? 553 : 386 },
      focusSeparationPx: portrait ? 206 : 302,
      startFrame: 0, durationFrames: 160, focusHoldFrames:
        mode === "converge-then-diverge" ? 28 : 0,
      staggerFrames: 4, curvePx: portrait ? 52 : 64,
      anticipationPx: 7, overshootPx: 5,
      clearancePx: 20, safeMarginPx: 28,
    };
  }, [mode, portrait]);
  const compiled = useMemo(() => compilePairedFocus(spec), [spec]);
  const displayedFrame = Math.max(0, Math.min(spec.durationFrames - 1, frame));
  const state = compiled.ok ? evaluatePairedFocus(compiled.plan, displayedFrame,
    reduced) : null;
  const w = spec.stage.width, h = spec.stage.height;
  const palette = {
    background: "#08121F", ink: "#E8F5FF", muted: "#95B1C4",
    warm: "#EFC18D", cool: "#80EDDA",
  };
  const inputStyle = {
    border: "1px solid #446077", borderRadius: 8,
    padding: "8px 10px", color: palette.ink,
    background: "#1A2D42", fontSize: 14,
  };
  return <main style={{
    background: palette.background, color: palette.ink, minHeight: "100vh",
    fontFamily: "system-ui,-apple-system,sans-serif", padding: "min(4vw,42px)",
  }}>
    <header style={{ maxWidth: 1280, margin: "0 auto 24px",
      display: "flex", justifyContent: "space-between",
      alignItems: "end", flexWrap: "wrap", gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, letterSpacing: "0.22em",
          fontWeight: 740, color: palette.cool }}>
          MOTION ENGINE / PAIRED FOCUS
        </div>
        <h1 style={{ margin: "9px 0 6px", letterSpacing: "-.045em",
          fontWeight: 680, fontSize: "clamp(26px,3vw,42px)" }}>
          A shared point of attention.
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: palette.muted }}>
          Two independent visual ideas. A deliberate relationship, then a choice.
        </p>
      </div>
      <span style={{ color: palette.muted, fontSize: 13 }}>
        Absolute-frame composition · original SVG art · geometry preflight
      </span>
    </header>
    {compiled.ok ? (
      <div style={{
        maxWidth: portrait ? 560 : 1280, margin: "auto",
        border: "1px solid #37506B", borderRadius: 20,
        overflow: "hidden", background: "#111D30",
        boxShadow: "0 35px 100px #0006",
      }}>
        <PairedFocusSvg
          plan={compiled.plan} frame={displayedFrame}
          reducedMotion={reduced ? true : undefined}
          ariaLabel="A golden wave and mint orbit deliberately approach a shared focal zone, then optionally separate."
          subjectA={<g transform={portrait ? "scale(.72)" : undefined}>
            <OriginalGlyph kind="wave"/>
          </g>}
          subjectB={<g transform={portrait ? "scale(.72)" : undefined}>
            <OriginalGlyph kind="orbit"/>
          </g>}
          focusCue={<g>
            <circle r={portrait ? 134 : 170} fill="#8DE9D3"
              fillOpacity=".032" stroke="#87DCD1"
              strokeOpacity=".24" strokeWidth={2}/>
            <circle r={portrait ? 26 : 34} fill="none"
              stroke="#D7F7F0" strokeOpacity=".37" strokeWidth={2}
              strokeDasharray="7 12"/>
            <path d="M-16 0 H16 M0-16 V16" stroke="#BBEFE4"
              strokeOpacity=".75" strokeWidth={2}/>
          </g>}
          background={<g>
            <defs>
              <linearGradient id="paired-focus-bg" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#101E30"/>
                <stop offset=".57" stopColor="#1C3044"/>
                <stop offset="1" stopColor="#0C1D2F"/>
              </linearGradient>
              <radialGradient id="paired-focus-halo">
                <stop stopColor="#4C9A9B" stopOpacity=".24"/>
                <stop offset="1" stopColor="#366177" stopOpacity="0"/>
              </radialGradient>
              <pattern id="paired-focus-grid" width={48} height={48}
                patternUnits="userSpaceOnUse">
                <path d="M48 0H0V48" stroke="#E3F4FF"
                  strokeOpacity=".038" fill="none"/>
              </pattern>
            </defs>
            <rect width={w} height={h} fill="url(#paired-focus-bg)"/>
            <rect width={w} height={h} fill="url(#paired-focus-grid)"/>
            <ellipse cx={w*.5} cy={h*.56} rx={w*.54} ry={h*.43}
              fill="url(#paired-focus-halo)"/>
            <path d={"M " + w*.06 + " " + h*.5 +
              " H " + w*.94}
              stroke="#91BAD0" strokeOpacity=".12" strokeDasharray="3 14"/>
            {[spec.outerA, spec.outerB].map((p,i)=>
              <circle key={i} cx={p.x} cy={p.y} r={6}
                fill={i===0 ? palette.warm : palette.cool}
                fillOpacity=".22"/>
            )}
          </g>}
          overlay={<g>
            <text x={w*.06} y={portrait ? 106 : 79}
              fontSize={portrait ? 22 : 19} letterSpacing={4}
              fontWeight={780} fill="#AEDBD7">
              COMMON GROUND
            </text>
            <text x={w*.06} y={portrait ? 147 : 115}
              fontSize={portrait ? 17 : 16} fill="#A3B8C8">
              A designed relationship between two independent ideas.
            </text>
            <path d={"M " + w*.06 + " " + (h - 105) +
              " H " + w*.94} stroke="#9FC3D1"
              strokeOpacity=".22"/>
            <text x={w*.06} y={h-68} fontSize={portrait ? 17 : 15}
              letterSpacing={3} fill="#ACC6D5">
              FOCUS / RELEASE
            </text>
            <text x={w*.94} y={h-68} fontSize={portrait ? 17 : 15}
              fill="#84CDBE" textAnchor="end">
              {mode === "converge-then-diverge" ? "01  —  02" :
                mode === "converge" ? "01" : "02"}
            </text>
          </g>}
        />
      </div>
    ) : <p role="alert" style={{ color: "#FDB8B8" }}>
      Authored stage invalid: {compiled.diagnostics.map(e=>e.message).join("; ")}
    </p>}
    <section style={{
      maxWidth: 1000, margin: "25px auto 0", padding: 20,
      border: "1px solid #34536A", borderRadius: 14,
      background: "#122337",
    }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap",
        alignItems: "center", justifyContent: "space-between" }}>
        <label htmlFor="paired-focus-mode" style={{ fontSize: 14 }}>
          Choreography:
          <select id="paired-focus-mode" aria-label="Choreography mode"
            value={mode} onChange={e=>{
              setMode(e.target.value as PairedFocusMode);
              setFrame(0);
            }} style={{ ...inputStyle, marginLeft: 12 }}>
            {MODE_CHOICES.map(name=>
              <option key={name} value={name}>
                {name.replaceAll("-", " ")}
              </option>)}
          </select>
        </label>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <label><input type="checkbox" checked={portrait}
            onChange={e=>setPortrait(e.target.checked)}/> Portrait</label>
          <label><input type="checkbox" checked={reduced}
            onChange={e=>setReduced(e.target.checked)}/> Reduced motion</label>
        </div>
      </div>
      <label htmlFor="paired-focus-frame" style={{
        marginTop: 20, display: "block", fontSize: 14,
      }}>
        Frame <strong style={{ color: palette.cool }}>
          {displayedFrame} / {spec.durationFrames-1}
        </strong>
      </label>
      <input id="paired-focus-frame" aria-label="Absolute frame"
        type="range" min={0} max={159} value={displayedFrame}
        onChange={e=>setFrame(Number(e.target.value))}
        style={{ width: "100%", accentColor: palette.cool }}/>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 9,
        marginTop: 14 }}>
        {[
          ["Establish",0],["Approach",34],["Focal moment",77],
          ["Release",118],["Final hold",159],
        ].map(([label, frameValue]) => <button
          key={label} type="button"
          style={{ ...inputStyle, cursor: "pointer",
            background: displayedFrame === frameValue ? "#245765" : "#1A3047" }}
          onClick={()=>setFrame(Number(frameValue))}>
          {label}
        </button>)}
      </div>
      {compiled.ok && state && <p style={{ fontSize: 13,
        color: palette.muted, margin: "16px 0 0" }}>
        Deterministic checks: {compiled.plan.checkedFrameCount} frames ·
        minimum scaled-circle clearance
        {" "}{compiled.plan.minSampledClearancePx.toFixed(1)} px ·
        current focus strength {(state.focusStrength*100).toFixed(0)}%.
        Structural checks do not certify visual craftsmanship.
      </p>}
    </section>
  </main>;
}
const meta = {
  title: "Motion engine/Paired Focus",
  id: "motion-paired-focus",
  component: PairedFocusShowcase,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PairedFocusShowcase>;
export default meta;
type Story = StoryObj<typeof meta>;
export const CompleteSequence: Story = { args: { initialFrame: 77 } };
export const Converge: Story = { args: { initialMode: "converge", initialFrame: 92 } };
export const Diverge: Story = { args: { initialMode: "diverge", initialFrame: 45 } };
export const Portrait: Story = { args: {
  initialMode: "converge-then-diverge", initialFrame: 77, initialPortrait: true,
}};
export const ReducedMotion: Story = { args: { initialReducedMotion: true } };
