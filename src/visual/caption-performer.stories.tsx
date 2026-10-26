import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CaptionPerformer, CaptionStage } from "../../registry/visual/caption-performer";
import { validateCaptionTrack } from "../../registry/visual/caption-track";
import type { CaptionCue, CaptionDiagnostic, CaptionEmphasis, CaptionTrack } from "../../registry/visual/caption-track";
import { ShortSafeFrame } from "../../registry/visual/short-safe-frame";
import { safeFrameProfileFromInset } from "../../registry/visual/safe-frame";
import type { SafeFrameProfile } from "../../registry/visual/safe-frame";
import { TechnologyObject2D } from "../../registry/domains/technology-object-2d";
import type { Rect } from "../../registry/motion/types";

/* Example timings were authored by hand for this demo (source "manual"); they are not
 * aligned to any recording. Real productions pass forced-alignment or ASR output. */
type W = [text: string, start: number, end: number, emphasis?: CaptionEmphasis];
const cue = (id: string, startFrame: number, endFrame: number, speakerId: string, text: string, words: W[], lang: string, dir: "ltr" | "rtl" = "ltr"): CaptionCue =>
  ({ id, startFrame, endFrame, speakerId, text, lang, dir, words: words.map(([t, s, e, emphasis]) => ({ text: t, startFrame: s, endFrame: e, emphasis })) });

const TRACKS: Record<"en" | "ja" | "ar", CaptionTrack & { durationFrames: number }> = {
  en: { id: "router-en", fps: { num: 30, den: 1 }, durationFrames: 360, timing: { source: "manual", reference: "authored demo timing" },
    speakers: { a: { label: "Speaker A" }, b: { label: "Speaker B" } }, cues: [
      cue("c1", 0, 78, "a", "A router reads each packet's destination.", [["A", 4, 8], ["router", 8, 20], ["reads", 20, 32], ["each", 32, 40], ["packet's", 40, 54], ["destination.", 54, 74, "accent"]], "en"),
      cue("c2", 84, 176, "a", "Then it forwards the packet one hop closer.", [["Then", 86, 94], ["it", 94, 99], ["forwards", 99, 115], ["the", 115, 120], ["packet", 120, 134], ["one", 134, 142], ["hop", 142, 152, "strong"], ["closer.", 152, 170]], "en"),
      cue("c3", 182, 262, "b", "So no router needs the whole map?", [["So", 184, 192], ["no", 192, 200], ["router", 200, 212], ["needs", 212, 222], ["the", 222, 227], ["whole", 227, 239, "strong"], ["map?", 239, 256]], "en"),
      cue("c4", 268, 356, "a", "Right — each hop only knows the next step.", [["Right", 270, 282], ["each", 290, 298], ["hop", 298, 308], ["only", 308, 318], ["knows", 318, 328], ["the", 328, 333], ["next", 333, 342, "accent"], ["step.", 342, 352, "accent"]], "en"),
    ] },
  ja: { id: "router-ja", fps: { num: 30, den: 1 }, durationFrames: 460, timing: { source: "manual", reference: "authored demo timing" },
    speakers: { a: { label: "話者 A" }, b: { label: "話者 B" } }, cues: [
      cue("c1", 0, 104, "a", "ルーターは各パケットの宛先を読み取ります。", [["ルーターは", 4, 22], ["各パケットの", 22, 42], ["宛先を", 42, 56, "accent"], ["読み取ります。", 56, 80]], "ja"),
      cue("c2", 110, 220, "a", "そして、宛先に一つ近いルーターへ転送します。", [["そして、", 112, 124], ["宛先に", 124, 138], ["一つ近い", 138, 156, "strong"], ["ルーターへ", 156, 178], ["転送します。", 178, 204]], "ja"),
      cue("c3", 226, 330, "b", "では、地図全体を持つルーターは要らないの？", [["では、", 228, 238], ["地図全体を", 238, 256, "strong"], ["持つ", 256, 264], ["ルーターは", 264, 280], ["要らないの？", 280, 302]], "ja"),
      cue("c4", 336, 460, "a", "そう。各ルーターは次の行き先だけを知っています。", [["そう。", 338, 350], ["各ルーターは", 352, 372], ["次の", 372, 380, "accent"], ["行き先だけを", 380, 400, "accent"], ["知っています。", 400, 428]], "ja"),
    ] },
  ar: { id: "router-ar", fps: { num: 30, den: 1 }, durationFrames: 362, timing: { source: "manual", reference: "authored demo timing" },
    speakers: { a: { label: "المتحدث أ" }, b: { label: "المتحدث ب" } }, cues: [
      cue("c1", 0, 78, "a", "يقرأ الموجّه وجهة كل حزمة.", [["يقرأ", 4, 16], ["الموجّه", 16, 30], ["وجهة", 30, 42, "accent"], ["كل", 42, 48], ["حزمة.", 48, 64]], "ar", "rtl"),
      cue("c2", 84, 176, "a", "ثم يرسلها قفزة واحدة أقرب.", [["ثم", 86, 94], ["يرسلها", 94, 110], ["قفزة", 110, 124, "strong"], ["واحدة", 124, 136], ["أقرب.", 136, 156]], "ar", "rtl"),
      cue("c3", 182, 268, "b", "إذن لا يحتاج أي موجّه إلى الخريطة كاملة؟", [["إذن", 184, 194], ["لا", 194, 200], ["يحتاج", 200, 212], ["أي", 212, 218], ["موجّه", 218, 230], ["إلى", 230, 236], ["الخريطة", 236, 250], ["كاملة؟", 250, 262, "strong"]], "ar", "rtl"),
      cue("c4", 268, 362, "a", "صحيح، كل قفزة تعرف الخطوة التالية فقط.", [["صحيح،", 270, 284], ["كل", 288, 294], ["قفزة", 294, 306], ["تعرف", 306, 318], ["الخطوة", 318, 332, "accent"], ["التالية", 332, 344, "accent"], ["فقط.", 344, 356]], "ar", "rtl"),
    ] },
};

const PORTRAIT: SafeFrameProfile = { id: "portrait", label: "Action column + description", width: 1080, height: 1920, padding: 0.06, reserved: [
  { id: "header", edge: "top", rect: { x: 0, y: 0, width: 1, height: 0.07 }, appearance: "header" },
  { id: "progress", edge: "bottom", rect: { x: 0, y: 0.95, width: 1, height: 0.05 }, appearance: "progress" },
  { id: "description", rect: { x: 0, y: 0.74, width: 0.8, height: 0.21 }, appearance: "description", label: "Description" },
  { id: "actions", rect: { x: 0.84, y: 0.4, width: 0.16, height: 0.55 }, appearance: "actions", label: "Actions" },
] };
const LANDSCAPE = { ...safeFrameProfileFromInset({ id: "landscape", width: 1920, height: 1080, inset: { left: 0.08, right: 0.12, top: 0.09, bottom: 0.1 } }), label: "Preset insets" };
const SUBJECTS: Record<"portrait" | "landscape", { a: Rect; b: Rect }> = {
  portrait: { a: { x: 0.12, y: 0.12, width: 0.32, height: 0.18 }, b: { x: 0.5, y: 0.34, width: 0.32, height: 0.18 } },
  landscape: { a: { x: 0.18, y: 0.16, width: 0.2, height: 0.36 }, b: { x: 0.56, y: 0.16, width: 0.2, height: 0.36 } },
};
const scene = "radial-gradient(120% 90% at 30% 20%, #23324a 0%, #111a29 60%, #0b111c 100%)";
const note: CSSProperties = { margin: 0, font: "400 13px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-muted, #5b6472)" };
const box = (r: Rect): CSSProperties => ({ position: "absolute", left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.width * 100}%`, height: `${r.height * 100}%` });

function Diagnostics({ items }: { items: readonly CaptionDiagnostic[] }) {
  if (!items.length) return <p style={{ ...note, color: "var(--km-status-success, #15803d)", fontWeight: 600 }}>No timing or layout problems.</p>;
  return <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 4, font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)" }}>
    {items.map((d, i) => <li key={i}><strong style={{ color: d.severity === "error" ? "var(--km-text-danger, #b91c1c)" : "var(--km-status-warning, #b45309)" }}>{d.code}</strong>
      {d.frame !== undefined ? ` · frame ${d.frame}` : ""} — {d.message}</li>)}
  </ul>;
}

interface Args { lang: "en" | "ja" | "ar"; output: "portrait" | "landscape"; highlight: "word" | "phrase"; staticMode: boolean; guides: boolean; reducedMotion: boolean; startFrame: number }
function Performer({ lang, output, highlight, staticMode, guides, reducedMotion, startFrame }: Args) {
  const track = TRACKS[lang], profile = output === "portrait" ? PORTRAIT : LANDSCAPE, subjects = SUBJECTS[output];
  const [frame, setFrame] = useState(Math.min(startFrame, track.durationFrames - 1));
  const [playing, setPlaying] = useState(false);
  const [diagnostics, setDiagnostics] = useState<CaptionDiagnostic[]>([]);
  useEffect(() => { setFrame(f => Math.min(f, track.durationFrames - 1)); }, [track.durationFrames]);
  // Preview clock for the story only; the performer itself is driven purely by `frame`.
  useEffect(() => {
    if (!playing) return;
    let raf = 0, origin: number | undefined, from = 0;
    setFrame(f => { from = f >= track.durationFrames - 1 ? 0 : f; return from; });
    const tick = (time: number) => {
      origin ??= time;
      const next = from + Math.floor((time - origin) * track.fps.num / track.fps.den / 1000);
      if (next >= track.durationFrames) { setFrame(track.durationFrames - 1); setPlaying(false); return; }
      setFrame(next); raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, track]);
  const avoid = useMemo(() => [subjects.a, subjects.b], [subjects]);
  const Captions = staticMode ? CaptionStage : CaptionPerformer;
  return <section style={{ padding: 20, display: "grid", gap: 16, background: "var(--km-surface-canvas, #f6f7f9)", color: "var(--km-text-primary, #1f2937)" }}>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      <figure style={{ margin: 0, width: "100%", maxWidth: output === "portrait" ? 360 : 640, display: "grid", gap: 8 }}>
        <ShortSafeFrame profile={profile} guides={guides} aria-label="A router passing a packet to a server, with timed captions" style={{ borderRadius: 12, background: scene }}>
          <div style={box(subjects.a)}><TechnologyObject2D spec={{ id: "cp-router", kind: "router", title: "Router" }} theme="midnight" width="100%" height="100%" /></div>
          <div style={box(subjects.b)}><TechnologyObject2D spec={{ id: "cp-server", kind: "server-rack", title: "Server" }} theme="midnight" width="100%" height="100%" /></div>
          <Captions track={track} frame={frame} avoidRegions={avoid} onDiagnostics={setDiagnostics}
            {...(staticMode ? {} : { highlight, reducedMotion })}
            style={{ ["--km-caption-font-size" as string]: output === "portrait" ? "5cqw" : "2.6cqw" }} />
        </ShortSafeFrame>
        <figcaption style={note}>{profile.width}×{profile.height} · timing: {track.timing.source} ({track.timing.reference})</figcaption>
      </figure>
      <div style={{ display: "grid", gap: 12, minWidth: 260, flex: "1 1 280px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="button" onClick={() => setPlaying(p => !p)} style={{ padding: "8px 16px", borderRadius: 8, font: "600 14px/1 var(--km-font-body, system-ui)" }}>{playing ? "Pause" : "Play"}</button>
          <span style={{ font: "500 14px/1 var(--km-font-mono, ui-monospace, monospace)" }}>frame {frame} / {track.durationFrames - 1}</span>
        </div>
        <label style={{ display: "grid", gap: 4, font: "500 13px/1.4 var(--km-font-body, system-ui)" }}>Seek
          <input type="range" min={0} max={track.durationFrames - 1} value={frame} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }} />
        </label>
        <Diagnostics items={diagnostics} />
      </div>
    </div>
  </section>;
}

/* A track with the mistakes CaptionPerformer reports instead of hiding. */
const BROKEN: CaptionTrack = { id: "broken", fps: { num: 30, den: 1 }, timing: { source: "asr", reference: "example" },
  speakers: { a: { label: "Speaker A" } }, cues: [
    { id: "late", startFrame: 30, endFrame: 100, speakerId: "a", text: "This cue appears after its first word.", lang: "en",
      words: [["This", 18, 26], ["cue", 26, 34], ["appears", 34, 46], ["after", 46, 54], ["its", 54, 60], ["first", 60, 70], ["word.", 70, 84]].map(([text, s, e]) => ({ text: text as string, startFrame: s as number, endFrame: e as number })) },
    { id: "overlap", startFrame: 90, endFrame: 170, speakerId: "a", text: "Same speaker, overlapping the previous cue.", lang: "en" },
    { id: "mismatch", startFrame: 180, endFrame: 260, text: "Displayed text differs from the words.", lang: "en",
      words: [{ text: "Displayed", startFrame: 182, endFrame: 196 }, { text: "copy", startFrame: 196, endFrame: 206, confidence: 0.32 }] },
    { id: "flash", startFrame: 270, endFrame: 282, text: "Far too short to read at any normal pace.", lang: "en" },
  ] };
function TimingProblems() {
  const diagnostics = validateCaptionTrack(BROKEN, { durationFrames: 300 });
  const [render, setRender] = useState<CaptionDiagnostic[]>([]);
  return <section style={{ padding: 20, display: "grid", gap: 16, background: "var(--km-surface-canvas, #f6f7f9)", color: "var(--km-text-primary, #1f2937)" }}>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      <figure style={{ margin: 0, width: "100%", maxWidth: 300, display: "grid", gap: 8 }}>
        <ShortSafeFrame profile={PORTRAIT} guides aria-label="Captions with timing errors" style={{ borderRadius: 12, background: scene }}>
          <CaptionPerformer track={BROKEN} frame={120} onDiagnostics={setRender} style={{ ["--km-caption-font-size" as string]: "5cqw" }} />
        </ShortSafeFrame>
        <figcaption style={note}>Frame 120: two cues from one speaker overlap. Status: {render.some(d => d.severity === "error") ? "error (export refused)" : "ready"}</figcaption>
      </figure>
      <div style={{ flex: "1 1 320px" }}><Diagnostics items={diagnostics} /></div>
    </div>
  </section>;
}

const meta = {
  title: "Video production/Caption Performer", id: "visual-caption-performer", component: Performer, parameters: { layout: "fullscreen" },
  argTypes: {
    lang: { control: "inline-radio", options: ["en", "ja", "ar"] },
    output: { control: "inline-radio", options: ["portrait", "landscape"] },
    highlight: { control: "inline-radio", options: ["word", "phrase"] },
    startFrame: { control: { type: "number", min: 0 } },
  },
  args: { lang: "en", output: "portrait", highlight: "word", staticMode: false, guides: false, reducedMotion: false, startFrame: 140 },
} satisfies Meta<typeof Performer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Performance: Story = {};
export const TimingProblemsStory: Story = { name: "Timing problems", render: () => <TimingProblems /> };
