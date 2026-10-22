import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { normalizeRedactions } from "../../registry/visual/redaction";
import type { RedactionMode, RedactionRange } from "../../registry/visual/redaction";
import { RedactionReveal } from "../../registry/visual/redaction-react";

// Fixture text is illustrative: every address, token and number is fake or from a documentation range.
/** Builds ranges from the text itself, so offsets are never typed by hand. */
const find = (text: string, needles: [string, string][]): RedactionRange[] => needles.map(([needle, label]) => {
  const start = text.indexOf(needle);
  if (start < 0) throw new Error(`Fixture text is missing "${needle}".`);
  return { start, end: start + needle.length, label };
});

const LOG = "2026-10-21 10:04:12 POST /api/session from 203.0.113.42 as alex.morgan@example.test, bearer eyJhbGciOiJIUzI1NiJ9.example-token";
const LOG_RANGES = find(LOG, [["203.0.113.42", "IP address"], ["alex.morgan@example.test", "email address"], ["eyJhbGciOiJIUzI1NiJ9.example-token", "access token"]]);
const CONTACT = "担当者：山田 太郎　電話：090-1234-5678　メール：taro@example.test";
const CONTACT_RANGES = find(CONTACT, [["山田 太郎", "name"], ["090-1234-5678", "phone number"], ["taro@example.test", "email address"]]);
const LONG = "Export command: export API_TOKEN=ghp_EXAMPLE0000000000000000000000000000 then restart the worker so the new value takes effect everywhere.";
const LONG_RANGES = find(LONG, [["ghp_EXAMPLE0000000000000000000000000000", "access token"]]);

const MODES: { mode: RedactionMode; caption: string }[] = [
  { mode: "redacted", caption: "Redacted: covered text is removed from the page and replaced by a bar." },
  { mode: "revealed", caption: "Revealed: the full text shows, with the covered ranges marked for review." },
  { mode: "overlay-only", caption: "Overlay only: a bar is painted over text that is still there. Copy and search still find it." },
];

const frame: CSSProperties = { font: "16px/1.6 Geist, Inter, system-ui, sans-serif", color: "#16191e", background: "#ffffff", padding: 20, borderRadius: 12, maxWidth: 720, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 18 };
const caption: CSSProperties = { fontSize: 13, color: "#5b6470", margin: 0 };
const line: CSSProperties = { margin: 0, padding: "10px 12px", border: "1px solid #d5d9df", borderRadius: 10 };

/** Which covered strings are still in the DOM: the difference between the modes, measured. */
function ExposedReadout({ text, ranges, mode, target }: { text: string; ranges: RedactionRange[]; mode: RedactionMode; target: RefObject<HTMLSpanElement | null> }) {
  const [exposed, setExposed] = useState<string[] | null>(null);
  useEffect(() => {
    const dom = target.current?.textContent ?? "";
    setExposed(ranges.filter(r => dom.includes(text.slice(r.start, r.end))).map(r => r.label ?? "text"));
  }, [text, ranges, mode, target]);
  if (exposed === null) return null;
  return <p style={caption} aria-live="polite">{exposed.length ? `Still in the page text: ${exposed.join(", ")}.` : "Still in the page text: nothing covered."}</p>;
}

function ModesDemo() {
  const [mode, setMode] = useState<RedactionMode>("redacted");
  const ref = useRef<HTMLSpanElement>(null);
  return <div style={frame}>
    <div role="group" aria-label="Redaction mode" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {MODES.map(m => <button key={m.mode} type="button" aria-pressed={mode === m.mode} onClick={() => setMode(m.mode)}
        style={{ font: "inherit", fontSize: 14, padding: "6px 12px", borderRadius: 999, border: "1px solid #aab2bd", background: mode === m.mode ? "#16191e" : "#ffffff", color: mode === m.mode ? "#ffffff" : "#16191e", cursor: "pointer" }}>{m.mode}</button>)}
    </div>
    <p style={{ ...line, margin: 0 }}><RedactionReveal ref={ref} text={LOG} ranges={LOG_RANGES} mode={mode} /></p>
    <p style={caption}>{MODES.find(m => m.mode === mode)?.caption}</p>
    <ExposedReadout text={LOG} ranges={LOG_RANGES} mode={mode} target={ref} />
  </div>;
}

function AllModes() {
  return <div style={frame}>
    {MODES.map(m => <figure key={m.mode} style={{ margin: 0, display: "grid", gap: 6 }}>
      <p style={{ ...line }}><RedactionReveal text={LOG} ranges={LOG_RANGES} mode={m.mode} /></p>
      <figcaption style={caption}><strong style={{ color: "#16191e" }}>{m.mode}.</strong> {m.caption}</figcaption>
    </figure>)}
  </div>;
}

function Samples({ dark = false }: { dark?: boolean }) {
  const ink = dark ? "#e8ebf0" : "#16191e", paper = dark ? "#16191e" : "#ffffff";
  const tokens = { "--km-redaction-highlight": dark ? "rgba(246, 190, 120, 0.28)" : undefined, "--km-redaction-mark": dark ? "#f6be78" : undefined } as CSSProperties;
  return <div style={{ ...frame, color: ink, background: paper, ...tokens }}>
    <p style={{ ...line, borderColor: dark ? "#3a424e" : "#d5d9df", margin: 0 }}><RedactionReveal text={LOG} ranges={LOG_RANGES} /></p>
    <p style={{ ...line, borderColor: dark ? "#3a424e" : "#d5d9df", margin: 0 }}><RedactionReveal text={CONTACT} ranges={CONTACT_RANGES} /></p>
    <p style={{ ...line, borderColor: dark ? "#3a424e" : "#d5d9df", margin: 0 }}><RedactionReveal text={LONG} ranges={LONG_RANGES} mode="revealed" /></p>
  </div>;
}

function NarrowDemo() {
  return <div style={{ ...frame, maxWidth: 240, padding: 14 }}>
    <p style={{ ...line, margin: 0, fontSize: 14 }}><RedactionReveal text={LONG} ranges={LONG_RANGES} /></p>
    <p style={{ ...line, margin: 0, fontSize: 14 }}><RedactionReveal text={CONTACT} ranges={CONTACT_RANGES} /></p>
  </div>;
}

const IP_START = LOG.indexOf("203.0.113.42");
const BAD_RANGES: RedactionRange[] = [
  { start: IP_START, end: IP_START + 12, label: "IP address" },
  { start: IP_START + 5, end: IP_START + 14, label: "overlapping" },
  { start: LOG.length - 4, end: LOG.length + 40, label: "past the end" },
  { start: 30, end: 30, label: "empty" },
  { start: 1.5, end: 9, label: "fractional" },
];

function NormalizeDemo() {
  const { ranges, diagnostics } = useMemo(() => normalizeRedactions(LOG, BAD_RANGES), []);
  return <div style={frame}>
    <p style={{ ...line, margin: 0 }}><RedactionReveal text={LOG} ranges={BAD_RANGES} /></p>
    <ul style={{ ...caption, margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
      {diagnostics.map((d, i) => <li key={i}>{d.code}: {d.range.label}</li>)}
    </ul>
    <p style={caption}>{ranges.length} ranges remain after normalisation. Clamping and merging cover more text, never less.</p>
  </div>;
}

const meta = { title: "Visual/Redaction Reveal", component: RedactionReveal, parameters: { layout: "padded" }, tags: ["autodocs"],
  args: { text: LOG, ranges: LOG_RANGES } } satisfies Meta<typeof RedactionReveal>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Modes: Story = { render: () => <ModesDemo /> };
export const SideBySide: Story = { name: "All three modes", render: () => <AllModes /> };
export const RealisticSamples: Story = { name: "Realistic samples", render: () => <Samples /> };
export const DarkTheme: Story = { name: "Dark theme", render: () => <Samples dark /> };
export const NarrowColumn: Story = { name: "Narrow column", render: () => <NarrowDemo /> };
export const NormalizeRanges: Story = { name: "Invalid ranges", render: () => <NormalizeDemo /> };
