import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CodeStageView } from "../../registry/visual/code-stage-react";
import { codeLines, codeStageDuration, layoutCodeStage, validateCodeStage } from "../../registry/visual/code-stage";
import type { CodeRevision, CodeSource, CodeStageDiagnostic, CodeStageSpec, CodeToken } from "../../registry/visual/code-stage";
import { createCanvasMeasurer } from "../../registry/media/text-layout";

/* Three unrelated domains, one component. All code is fictional and written for this demo. The tokenizer is a
 * small demo helper, not part of the library: it proves the token contract (tokens concatenate to the line). */
type Language = "ts" | "py";
const KEYWORDS: Record<Language, ReadonlySet<string>> = {
  ts: new Set(["const", "function", "return"]),
  py: new Set(["import", "def", "return"]),
};

function tokenize(line: string, language: Language): CodeToken[] {
  const out: CodeToken[] = [];
  const comment = language === "ts" ? "//" : "#";
  let rest = line;
  while (rest.length > 0) {
    if (rest.startsWith(comment)) { out.push({ text: rest, kind: "comment" }); break; }
    const text = /^(?:"[^"]*"|'[^']*'|`[^`]*`)|^\d+(?:\.\d+)?|^[A-Za-z_]\w*|^\s+|^./.exec(rest)![0];
    let kind = "plain";
    if (/^["'`]/.test(text)) kind = "string";
    else if (/^\d/.test(text)) kind = "number";
    else if (/^[A-Za-z_]/.test(text)) kind = KEYWORDS[language].has(text) ? "keyword" : /^\(/.test(rest.slice(text.length)) ? "function" : "plain";
    out.push({ text, kind });
    rest = rest.slice(text.length);
  }
  return out;
}

function stageSource(id: string, language: Language, lines: string[]): CodeSource {
  const built = codeLines(lines.join("\n"), "l");
  return { id, language, lines: built, tokens: Object.fromEntries(built.map(l => [l.id, tokenize(l.text, language)])) };
}

const FINANCE = stageSource("finance", "ts", [
  "function grow(p, rate, years) {",
  "  return p * Math.pow(1 + rate, years);",
  "}",
  "const a = grow(1000, 0.05, 0);",
  "const b = grow(1000, 0.05, 10);",
  "const gain = b - a;",
]);
const LOGISTICS = stageSource("logistics", "ts", [
  "const START = 10 * 60 + 4;",
  "const PER_STOP = 12;",
  "function arrival(n) {",
  "  return START + n * PER_STOP;",
  "}",
  "const stop3 = arrival(3);",
]);
const PHYSICS = stageSource("physics", "py", [
  "import math",
  "",
  "def landing(v, deg):",
  "    g = 9.81",
  "    a = math.radians(deg)",
  "    return v ** 2 * math.sin(2 * a) / g",
  "",
  "d = landing(20, 45)  # metres",
]);

const FINANCE_SPEC: CodeStageSpec = { id: "finance-growth", fps: { num: 30, den: 1 }, source: FINANCE, beats: [
  { id: "axes", kind: "establish", durationFrames: 45 },
  { id: "function", kind: "reveal", lineIds: ["l1", "l2", "l3"], durationFrames: 60 },
  { id: "inputs", kind: "reveal", lineIds: ["l4", "l5", "l6"], durationFrames: 60 },
  { id: "rule", kind: "focus", from: "l1", to: "l3", durationFrames: 75 },
  { id: "gain", kind: "token", lineId: "l6", token: "gain", occurrence: 0, durationFrames: 75 },
  { id: "inputs-again", kind: "focus", from: "l4", to: "l6", durationFrames: 75 },
] };
const LOGISTICS_SPEC: CodeStageSpec = { id: "logistics-eta", fps: { num: 30, den: 1 }, source: LOGISTICS, beats: [
  { id: "axes", kind: "establish", durationFrames: 45 },
  { id: "constants", kind: "reveal", lineIds: ["l1", "l2"], durationFrames: 40 },
  { id: "function", kind: "reveal", lineIds: ["l3", "l4", "l5", "l6"], durationFrames: 70 },
  { id: "rule", kind: "focus", from: "l3", to: "l5", durationFrames: 75 },
  { id: "per-stop", kind: "token", lineId: "l4", token: "PER_STOP", durationFrames: 75 },
  { id: "result", kind: "token", lineId: "l6", token: "arrival", occurrence: 0, durationFrames: 75 },
] };
const PHYSICS_SPEC: CodeStageSpec = { id: "physics-range", fps: { num: 30, den: 1 }, source: PHYSICS, beats: [
  { id: "axes", kind: "establish", durationFrames: 45 },
  { id: "setup", kind: "reveal", lineIds: ["l1", "l2", "l3", "l4"], durationFrames: 60 },
  { id: "rest", kind: "reveal", lineIds: ["l5", "l6", "l7", "l8"], durationFrames: 60 },
  { id: "formula", kind: "focus", from: "l3", to: "l6", durationFrames: 75 },
  { id: "gravity", kind: "token", lineId: "l4", token: "9.81", durationFrames: 75 },
  { id: "call", kind: "focus", from: "l6", to: "l8", durationFrames: 75 },
] };
const DOMAINS: Array<{ id: string; label: string; spec: CodeStageSpec }> = [
  { id: "finance", label: "Finance: compound growth", spec: FINANCE_SPEC },
  { id: "logistics", label: "Logistics: arrival time", spec: LOGISTICS_SPEC },
  { id: "physics", label: "Physics: landing distance", spec: PHYSICS_SPEC },
];

const OUTPUTS = [{ id: "portrait", width: 1080, height: 1920, max: 300 }, { id: "landscape", width: 1920, height: 1080, max: 560 }];
const note: CSSProperties = { margin: 0, font: "400 13px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-muted, #5b6472)" };
const tone = (d: CodeStageDiagnostic) => d.severity === "error" ? "var(--km-text-danger, #b91c1c)" : "var(--km-status-warning, #b45309)";
const button = (active: boolean): CSSProperties => ({ padding: "8px 14px", borderRadius: 8, font: "600 14px/1 var(--km-font-body, system-ui)",
  border: "1px solid var(--km-rule, #cfd5dd)", background: active ? "var(--km-accent, #2f5f8a)" : "var(--km-surface, #ffffff)", color: active ? "#ffffff" : "inherit" });

function Walkthrough({ startFrame }: { startFrame: number }) {
  const [domain, setDomain] = useState(0);
  const spec = DOMAINS[domain].spec;
  const total = codeStageDuration(spec);
  const [frame, setFrame] = useState(startFrame);
  const [playing, setPlaying] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Record<string, CodeStageDiagnostic[]>>({});
  useEffect(() => {
    if (!playing) return;
    let raf = 0, origin: number | undefined; const from = frame >= total - 1 ? 0 : frame;
    const tick = (t: number) => { origin ??= t; const next = from + Math.floor((t - origin) * 30 / 1000);
      if (next >= total) { setFrame(total - 1); setPlaying(false); return; } setFrame(next); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps -- restart only on play/pause
  const all = [...new Map(Object.entries(diagnostics).flatMap(([id, list]) => list.map(d => [`${d.code}|${d.message}`, { ...d, message: `${d.message} (${id})` }] as const))).values()];
  return <section style={{ padding: 20, display: "grid", gap: 16, background: "var(--km-surface-canvas, #f6f7f9)", color: "var(--km-text-primary, #1f2937)", font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)" }}>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {DOMAINS.map((d, i) => <button key={d.id} type="button" aria-pressed={i === domain} style={button(i === domain)}
        onClick={() => { setDomain(i); setFrame(0); setPlaying(false); }}>{d.label}</button>)}
    </div>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => setPlaying(p => !p)} style={button(false)}>{playing ? "Pause" : "Play"}</button>
      <input aria-label="Seek" type="range" min={0} max={total - 1} value={Math.min(frame, total - 1)} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }} style={{ flex: "1 1 260px" }} />
      <span style={{ fontFamily: "var(--km-font-mono, ui-monospace, monospace)" }}>frame {Math.min(frame, total - 1)}</span>
    </div>
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
      {OUTPUTS.map(o => <figure key={o.id} style={{ margin: 0, width: "100%", maxWidth: o.max, display: "grid", gap: 6 }}>
        <CodeStageView spec={spec} frame={frame} width={o.width} height={o.height} style={{ borderRadius: 12, overflow: "hidden" }}
          onDiagnostics={d => setDiagnostics(prev => ({ ...prev, [o.id]: d }))} />
        <figcaption style={note}>{o.width}×{o.height}</figcaption>
      </figure>)}
    </div>
    {all.length ? <ul style={{ margin: 0, paddingLeft: 20 }}>{all.map((d, i) => <li key={i}><strong style={{ color: tone(d) }}>{d.code}</strong> — {d.message}</li>)}</ul>
      : <p style={{ ...note, color: "var(--km-status-success, #15803d)", fontWeight: 600 }}>Every line fits, every token matches its line, and every focus names real lines in both outputs.</p>}
    <p style={note}>Fictional sample code in three domains. CodeStage checks layout and references; it does not run the code.</p>
  </section>;
}

/* Code the stage must refuse, each with its reason. */
const BROKEN: Array<{ label: string; spec: CodeStageSpec; box?: { width: number; height: number } }> = [
  { label: "Tokens that would change the code", spec: { ...FINANCE_SPEC, source: { ...FINANCE, tokens: { ...FINANCE.tokens, l2: [{ text: "return ", kind: "keyword" }] } } } },
  { label: "Token occurrence the line does not have", spec: { ...FINANCE_SPEC, beats: [{ id: "t", kind: "token", lineId: "l6", token: "gain", occurrence: 2, durationFrames: 75 }] } },
  { label: "Focus on a line that does not exist", spec: { ...FINANCE_SPEC, beats: [{ id: "f", kind: "focus", from: "l1", to: "l9", durationFrames: 75 }] } },
  { label: "Focus whose range is reversed", spec: { ...FINANCE_SPEC, beats: [{ id: "f", kind: "focus", from: "l5", to: "l1", durationFrames: 75 }] } },
  { label: "Two lines with the same id", spec: { ...FINANCE_SPEC, source: { ...FINANCE, lines: [...FINANCE.lines, { id: "l1", text: "}" }] } } },
  { label: "Code that cannot fit above the minimum size", spec: FINANCE_SPEC, box: { width: 1080, height: 150 } },
];
function Refusals() {
  const rows = useMemo(() => {
    const measure = createCanvasMeasurer({});
    return BROKEN.map(item => {
      const box = item.box ?? { width: 1080, height: 1920 };
      const layout = layoutCodeStage(item.spec, { x: 0, y: 0, ...box }, { measure, maxFontPx: 54, minFontPx: 26 });
      return { label: item.label, diagnostics: validateCodeStage(item.spec, layout).filter(d => d.severity === "error") };
    });
  }, []);
  return <section style={{ padding: 20, display: "grid", gap: 12, font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-primary, #1f2937)" }}>
    {rows.map((r, i) => <div key={i}><strong>{r.label}</strong>
      <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>{r.diagnostics.map((d, j) => <li key={j}><code>{d.code}</code> — {d.message}</li>)}</ul></div>)}
  </section>;
}

/* Edit and output: one TypeScript listing changes between two complete revisions, and a captured test run
 * shows before and after. The commands are text on the page; nothing here runs a shell or a test. */
const EDIT_BASE = stageSource("growth", "ts", [
  "// Simple growth model",
  "function grow(p: number, r: number) {",
  "  const gain = p * (1 + r)",
  "  return gain",
  "}",
]);
const FEE_LINES = [
  { id: "l2", text: "function grow(p: number, r: number) {" },
  { id: "l3", text: "  const gain = p * (1 + r) ** 2" },
  { id: "l6", text: "  const fee = gain * 0.01" },
  { id: "l4", text: "  return gain - fee" },
  { id: "l5", text: "}" },
];
const FEE_REVISION: CodeRevision = { id: "fee", lines: FEE_LINES, tokens: Object.fromEntries(FEE_LINES.map(l => [l.id, tokenize(l.text, "ts")])) };
const EDIT_SPEC: CodeStageSpec = { id: "edit-fee", fps: { num: 30, den: 1 }, source: EDIT_BASE, revisions: [FEE_REVISION], beats: [
  { id: "establish", kind: "establish", durationFrames: 45 },
  { id: "reveal", kind: "reveal", lineIds: ["l1", "l2", "l3", "l4", "l5"], durationFrames: 60 },
  { id: "run-before", kind: "output", durationFrames: 120, exitCode: 1, lines: [
    { kind: "command", text: "npm test -- growth" },
    { kind: "stdout", text: "running growth.test.ts" },
    { kind: "stderr", text: "expected 1.0 to equal 1.02" },
  ] },
  { id: "change", kind: "edit", to: "fee", durationFrames: 90 },
  { id: "run-after", kind: "output", durationFrames: 120, exitCode: 0, lines: [
    { kind: "command", text: "npm test -- growth" },
    { kind: "stdout", text: "running growth.test.ts" },
    { kind: "stdout", text: "1 passed" },
  ] },
] };

const EDIT_OUTPUTS = [{ id: "portrait", width: 1080, height: 1920, max: 300 }, { id: "landscape", width: 1920, height: 1080, max: 560 }];

function EditOutput() {
  const total = codeStageDuration(EDIT_SPEC);
  const [frame, setFrame] = useState(0);
  const [diagnostics, setDiagnostics] = useState<Record<string, CodeStageDiagnostic[]>>({});
  const all = [...new Map(Object.entries(diagnostics).flatMap(([id, list]) => list.map(d => [`${d.code}|${d.message}`, { ...d, message: `${d.message} (${id})` }] as const))).values()];
  return <section style={{ padding: 20, display: "grid", gap: 16, background: "var(--km-surface-canvas, #f6f7f9)", color: "var(--km-text-primary, #1f2937)", font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)" }}>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <input aria-label="Frame" type="range" min={0} max={total - 1} value={frame} onChange={e => setFrame(Number(e.target.value))} style={{ flex: "1 1 260px" }} />
      <span style={{ fontFamily: "var(--km-font-mono, ui-monospace, monospace)" }}>frame {frame}</span>
    </div>
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
      {EDIT_OUTPUTS.map(o => <figure key={o.id} style={{ margin: 0, width: "100%", maxWidth: o.max, display: "grid", gap: 6 }}>
        <CodeStageView spec={EDIT_SPEC} frame={frame} width={o.width} height={o.height} style={{ borderRadius: 12, overflow: "hidden" }}
          onDiagnostics={d => setDiagnostics(prev => ({ ...prev, [o.id]: d }))} />
        <figcaption style={note}>{o.width}×{o.height}</figcaption>
      </figure>)}
    </div>
    {all.length ? <ul style={{ margin: 0, paddingLeft: 20 }}>{all.map((d, i) => <li key={i}><strong style={{ color: tone(d) }}>{d.code}</strong> — {d.message}</li>)}</ul>
      : <p style={{ ...note, color: "var(--km-status-success, #15803d)", fontWeight: 600 }}>No diagnostics: every revision matches its tokens, and the captured output fits.</p>}
    <p style={note}>Lines keep their identity across the edit: removed lines fade out, added lines fade in, and only the changed tokens are marked. Terminal text is captured, not executed.</p>
  </section>;
}

const meta = { title: "Visual/Code Stage", component: Walkthrough, parameters: { layout: "fullscreen" },
  argTypes: { startFrame: { control: { type: "number", min: 0, max: 389 } } }, args: { startFrame: 150 } } satisfies Meta<typeof Walkthrough>;
export default meta;
type Story = StoryObj<typeof meta>;
export const WalkthroughStory: Story = { name: "Walkthrough" };
export const RefusalsStory: Story = { name: "Refusals", render: () => <Refusals /> };
export const EditAndOutputStory: Story = { name: "Edit and output", render: () => <EditOutput /> };
