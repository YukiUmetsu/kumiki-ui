import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ALIGNMENT_PARSERS, parseAlignment } from "../../registry/video/alignment-formats";
import type { AlignmentParser } from "../../registry/video/alignment-formats";
import { alignmentToCaptionTrack, audioMixFfmpegArgs, createAudioMixManifest, resolveAudioCues } from "../../registry/video/audio-visual-cue";
import type { AudioCueSheet, LinkStatus } from "../../registry/video/audio-visual-cue";
import { CaptionPerformer } from "../../registry/visual/caption-performer";
import type { CaptionDiagnostic } from "../../registry/visual/caption-track";
import { ShortSafeFrame } from "../../registry/visual/short-safe-frame";
import { safeFrameProfileFromInset } from "../../registry/visual/safe-frame";
import { TechnologyObject2D } from "../../registry/domains/technology-object-2d";

/* One authored timing table (seconds), emitted below in each tool's real payload shape so the
 * parsers can be compared. Example data only: it is not the output of an aligner run on a recording. */
const TABLE: [string, number, number][] = [
  ["A", 0.2, 0.3], ["router", 0.3, 0.68], ["reads", 0.68, 0.98], ["each", 0.98, 1.2], ["packet's", 1.2, 1.62], ["destination,", 1.62, 2.3],
  ["then", 2.55, 2.75], ["forwards", 2.75, 3.2], ["it", 3.2, 3.32], ["one", 3.32, 3.52], ["hop", 3.52, 3.8], ["closer.", 3.8, 4.3],
];
const LINE = TABLE.map(w => w[0]).join(" ");
const FORMATS: Record<string, { label: string; parser: AlignmentParser; payload: () => unknown; note: string }> = {
  whisperx: { label: "WhisperX JSON", parser: ALIGNMENT_PARSERS.whisperx, note: "“one” has a low alignment score.",
    payload: () => ({ segments: [{ start: 0.2, end: 4.3, text: LINE, words: TABLE.map(([word, start, end]) => ({ word, start, end, score: word === "one" ? 0.41 : 0.93 })) }] }) },
  whisper: { label: "OpenAI verbose_json", parser: ALIGNMENT_PARSERS.whisper, note: "Words at the top level; segment text separately.",
    payload: () => ({ language: "en", text: LINE, segments: [{ start: 0.2, end: 4.3, text: LINE }], words: TABLE.map(([word, start, end]) => ({ word, start, end })) }) },
  gentle: { label: "Gentle JSON", parser: ALIGNMENT_PARSERS.gentle, note: "“it” was not found in the audio, so it has no timing.",
    payload: () => ({ transcript: LINE, words: TABLE.map(([word, start, end]) => word === "it" ? { case: "not-found-in-audio", word } : { case: "success", word, alignedWord: word.toLowerCase(), start, end }) }) },
  textgrid: { label: "MFA TextGrid", parser: ALIGNMENT_PARSERS.textgrid, note: "Praat long format, words tier.",
    payload: () => `File type = "ooTextFile"\nObject class = "TextGrid"\n\nxmin = 0\nxmax = 4.5\ntiers? <exists>\nsize = 1\nitem []:\n    item [1]:\n        class = "IntervalTier"\n        name = "words"\n        xmin = 0\n        xmax = 4.5\n        intervals: size = ${TABLE.length}\n` +
      TABLE.map(([w, s, e], i) => `        intervals [${i + 1}]:\n            xmin = ${s}\n            xmax = ${e}\n            text = "${w}"\n`).join("") },
  characters: { label: "TTS character timings", parser: ALIGNMENT_PARSERS.characterTimings, note: "Character-level timings (ElevenLabs-style) grouped into words.",
    payload: () => { const characters: string[] = [], starts: number[] = [], ends: number[] = [];
      TABLE.forEach(([w, s, e], i) => { [...w].forEach((c, j) => { characters.push(c); starts.push(s + (e - s) * j / w.length); ends.push(s + (e - s) * (j + 1) / w.length); });
        if (i < TABLE.length - 1) { characters.push(" "); starts.push(e); ends.push(TABLE[i + 1][1]); } });
      return { alignment: { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } }; } },
  srt: { label: "SRT subtitles", parser: ALIGNMENT_PARSERS.srt, note: "Segment timing only: no word anchors, so word links report missing.",
    payload: () => "1\n00:00:00,200 --> 00:00:02,300\nA router reads each packet's destination,\n\n2\n00:00:02,550 --> 00:00:04,300\nthen forwards it one hop closer.\n" },
};

const FPS = { num: 30, den: 1 }, DURATION = 180, NARRATION_START = 15;
const PROFILE = { ...safeFrameProfileFromInset({ id: "landscape", width: 1920, height: 1080, inset: { left: 0.06, right: 0.06, top: 0.08, bottom: 0.08 } }), label: "16:9" };
const ROUTER = { x: 0.12, y: 0.22, width: 0.2, height: 0.36 }, SERVER = { x: 0.68, y: 0.22, width: 0.2, height: 0.36 };
const note: CSSProperties = { margin: 0, font: "400 13px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-muted, #5b6472)" };
const STATUS: Record<LinkStatus, string> = { aligned: "var(--km-status-success, #15803d)", early: "var(--km-status-warning, #b45309)", late: "var(--km-status-warning, #b45309)",
  missing: "var(--km-text-danger, #b91c1c)", "visual-only": "var(--km-text-muted, #5b6472)" };

interface Args { format: keyof typeof FORMATS; mode: "audio" | "visual-only"; departShift: number; startFrame: number }
function CueDemo({ format, mode, departShift, startFrame }: Args) {
  const spec = FORMATS[format];
  const parsed = useMemo(() => parseAlignment(spec.payload(), spec.parser, { id: "narration", language: "en", reference: `${spec.label} example payload` }), [spec]);
  // The visual choreography: a packet departs and arrives; the destination label is highlighted.
  const depart = 96 + departShift, arrive = depart + 30;
  const sheet: AudioCueSheet = useMemo(() => ({ id: "router", fps: FPS, durationFrames: DURATION,
    lanes: [
      { id: "voice", kind: "narration", startFrame: NARRATION_START, alignmentId: "narration", assetRef: "narration.wav", required: true },
      { id: "music", kind: "music", startFrame: 0, assetRef: "music.wav", gainDb: -14, beatGrid: { bpm: 100, beatsPerBar: 4, count: 10 } },
      { id: "sfx", kind: "sfx", startFrame: 0 },
    ],
    sounds: [{ id: "arrive-ding", laneId: "sfx", frame: 126, assetRef: "ding.wav", gainDb: -6 }],
    links: [
      { id: "highlight-on-destination", visualEventId: "highlight-destination", anchor: { kind: "word", laneId: "voice", text: "destination" } },
      { id: "depart-on-forwards", visualEventId: "packet-depart", anchor: { kind: "word", laneId: "voice", text: "forwards" }, offsetFrames: -2, toleranceFrames: 2 },
      { id: "arrive-on-ding", visualEventId: "packet-arrive", anchor: { kind: "sound", eventId: "arrive-ding" }, toleranceFrames: 0, strict: true },
      { id: "intro-on-downbeat", visualEventId: "title-in", anchor: { kind: "beat", laneId: "music", beat: 0 } },
    ] }), []);
  const visualEvents = useMemo(() => [{ id: "title-in", frame: 0 }, { id: "highlight-destination", frame: 63 }, { id: "packet-depart", frame: depart }, { id: "packet-arrive", frame: arrive }], [depart, arrive]);
  const resolved = useMemo(() => resolveAudioCues(sheet, { alignments: [parsed.alignment], visualEvents, mode }), [sheet, parsed, visualEvents, mode]);
  const captions = useMemo(() => alignmentToCaptionTrack(parsed.alignment, { id: "captions", fps: FPS, laneStartFrame: NARRATION_START, maxWords: 6 }), [parsed]);
  const manifest = useMemo(() => createAudioMixManifest(sheet), [sheet]);
  const [frame, setFrame] = useState(startFrame);
  const [captionIssues, setCaptionIssues] = useState<CaptionDiagnostic[]>([]);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    let raf = 0, origin: number | undefined; const from = frame >= DURATION - 1 ? 0 : frame;
    const tick = (t: number) => { origin ??= t; const next = from + Math.floor((t - origin) * 30 / 1000);
      if (next >= DURATION) { setFrame(DURATION - 1); setPlaying(false); return; } setFrame(next); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps -- restart only on play/pause
  const travel = Math.min(1, Math.max(0, (frame - depart) / (arrive - depart)));
  const highlight = frame >= 63 ? 1 : 0;
  const diagnostics = [...parsed.diagnostics, ...resolved.diagnostics, ...captionIssues];

  // Timeline geometry
  const W = 1000, x = (f: number) => 60 + (f / DURATION) * (W - 80), rows = { voice: 40, music: 92, sfx: 128, visual: 168 };
  return <section style={{ padding: 20, display: "grid", gap: 16, background: "var(--km-surface-canvas, #f6f7f9)", color: "var(--km-text-primary, #1f2937)", font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)" }}>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => setPlaying(p => !p)} style={{ padding: "8px 16px", borderRadius: 8, font: "600 14px/1 var(--km-font-body, system-ui)" }}>{playing ? "Pause" : "Play"}</button>
      <input aria-label="Seek" type="range" min={0} max={DURATION - 1} value={frame} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }} style={{ flex: "1 1 260px" }} />
      <span style={{ fontFamily: "var(--km-font-mono, ui-monospace, monospace)" }}>frame {frame}</span>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      <figure style={{ margin: 0, width: "100%", maxWidth: 520, display: "grid", gap: 6 }}>
        <ShortSafeFrame profile={PROFILE} aria-label="A router sends a packet to a server while the narration describes it" style={{ borderRadius: 12, background: "radial-gradient(120% 90% at 30% 20%, #23324a 0%, #111a29 60%, #0b111c 100%)" }}>
          <div style={{ position: "absolute", left: `${ROUTER.x * 100}%`, top: `${ROUTER.y * 100}%`, width: `${ROUTER.width * 100}%`, height: `${ROUTER.height * 100}%` }}>
            <TechnologyObject2D spec={{ id: "avc-router", kind: "router", title: "Router" }} theme="midnight" width="100%" height="100%" /></div>
          <div style={{ position: "absolute", left: `${SERVER.x * 100}%`, top: `${SERVER.y * 100}%`, width: `${SERVER.width * 100}%`, height: `${SERVER.height * 100}%`,
            borderRadius: "1.5cqw", boxShadow: frame >= arrive ? "0 0 0 0.4cqw rgba(255, 209, 102, 0.85)" : undefined }}>
            <TechnologyObject2D spec={{ id: "avc-server", kind: "server-rack", title: "Server" }} theme="midnight" width="100%" height="100%" /></div>
          <div style={{ position: "absolute", left: "34%", top: "14%", padding: "0.4cqw 1cqw", borderRadius: "0.8cqw", font: "600 1.8cqw/1.2 var(--km-font-mono, ui-monospace, monospace)",
            color: highlight ? "#1b1405" : "#c9d6ea", background: highlight ? "#ffd166" : "rgba(255,255,255,0.08)" }}>dst 203.0.113.7</div>
          {frame >= depart && frame <= arrive ? <div style={{ position: "absolute", top: "40%", left: `${(ROUTER.x + ROUTER.width + (SERVER.x - ROUTER.x - ROUTER.width) * travel) * 100}%`,
            width: "2.4cqw", height: "2.4cqw", marginLeft: "-1.2cqw", marginTop: "-1.2cqw", borderRadius: "0.6cqw", background: "#8fc8ff", boxShadow: "0 0 2cqw #8fc8ff" }} /> : null}
          <CaptionPerformer track={captions} frame={frame} onDiagnostics={setCaptionIssues} avoidRegions={[ROUTER, SERVER]} style={{ ["--km-caption-font-size" as string]: "2.8cqw" }} />
        </ShortSafeFrame>
        <figcaption style={note}>{spec.label} · {spec.note}</figcaption>
      </figure>
      <div style={{ flex: "1 1 340px", minWidth: 300, display: "grid", gap: 10 }}>
        <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>{["Visual event", "Visual", "Audio", "Wants", "Δ", "Status"].map(h => <th key={h} style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid var(--km-border-subtle, #d4d8de)" }}>{h}</th>)}</tr></thead>
          <tbody>{resolved.links.map(l => <tr key={l.id}>
            <td style={{ padding: "4px 8px" }}>{l.visualEventId}</td><td style={{ padding: "4px 8px" }}>{l.visualFrame ?? "—"}</td><td style={{ padding: "4px 8px" }}>{l.audioFrame ?? "—"}</td>
            <td style={{ padding: "4px 8px" }}>{l.suggestedFrame ?? "—"}</td><td style={{ padding: "4px 8px" }}>{l.deltaFrames ?? "—"}</td>
            <td style={{ padding: "4px 8px", color: STATUS[l.status], fontWeight: 600 }}>{l.status}</td></tr>)}</tbody>
        </table>
        {diagnostics.length ? <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>{diagnostics.map((d, i) =>
          <li key={i}><strong style={{ color: d.severity === "error" ? STATUS.missing : STATUS.late }}>{d.code}</strong> — {d.message}</li>)}</ul> : <p style={{ ...note, color: STATUS.aligned, fontWeight: 600 }}>All links aligned.</p>}
      </div>
    </div>
    <svg viewBox={`0 0 ${W} 196`} role="img" aria-label="Audio lanes and visual events on one frame timeline" style={{ width: "100%", maxWidth: 1100, background: "var(--km-surface-default, #fff)", borderRadius: 10, border: "1px solid var(--km-border-subtle, #d4d8de)" }}>
      {Object.entries({ voice: "Narration", music: "Music beats", sfx: "Sound FX", visual: "Visual" }).map(([k, label]) =>
        <text key={k} x={8} y={rows[k as keyof typeof rows] + 4} fontSize={11} fill="currentColor" opacity={0.7}>{label}</text>)}
      {resolved.words.map(w => <g key={w.index}><rect x={x(w.startFrame)} y={rows.voice - 14} width={Math.max(2, x(w.endFrame) - x(w.startFrame) - 1)} height={28} rx={4}
        fill={frame >= w.startFrame && frame < w.endFrame ? "#ffd166" : "#c7d7ef"} opacity={w.confidence !== undefined && w.confidence < 0.6 ? 0.5 : 1} />
        <text x={x(w.startFrame) + 2} y={rows.voice + 4} fontSize={9} fill="#1f2937">{w.text.replace(/[,.]$/, "")}</text></g>)}
      {resolved.segments.map(s => <rect key={`s${s.index}`} x={x(s.startFrame)} y={rows.voice + 16} width={x(s.endFrame) - x(s.startFrame)} height={4} rx={2} fill="#7aa2d6" />)}
      {resolved.beats.map(b => <line key={b.beat} x1={x(b.frame)} x2={x(b.frame)} y1={rows.music - (b.beatInBar === 0 ? 12 : 6)} y2={rows.music + (b.beatInBar === 0 ? 12 : 6)} stroke="#6b7280" strokeWidth={b.beatInBar === 0 ? 2 : 1} />)}
      {resolved.sounds.map(s => <path key={s.id} d={`M${x(s.frame)} ${rows.sfx - 8}l8 8l-8 8l-8-8z`} fill="#8b5cf6" />)}
      {resolved.links.map(l => l.visualFrame === undefined ? null : <g key={l.id}>
        {l.suggestedFrame !== undefined ? <line x1={x(l.suggestedFrame)} x2={x(l.visualFrame)} y1={rows.visual - 30} y2={rows.visual} stroke={STATUS[l.status]} strokeWidth={1.5} strokeDasharray="3 3" /> : null}
        <circle cx={x(l.visualFrame)} cy={rows.visual} r={6} fill={STATUS[l.status]} />
        <text x={x(l.visualFrame) + 8} y={rows.visual + 16} fontSize={9} fill="currentColor">{l.visualEventId}</text></g>)}
      <line x1={x(frame)} x2={x(frame)} y1={10} y2={190} stroke="#ef4444" strokeWidth={1.5} />
    </svg>
    <details>
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>Mix manifest and FFmpeg command (asset paths are placeholders; this story has no audio files)</summary>
      <pre style={{ margin: "8px 0 0", padding: 12, borderRadius: 8, overflowX: "auto", fontSize: 12, background: "var(--km-surface-subtle, #eef0f3)" }}>{JSON.stringify(manifest, null, 2)}{"\n\nffmpeg " + audioMixFfmpegArgs(manifest, "mix.wav").map(a => /[\s;[\]]/.test(a) ? `"${a}"` : a).join(" ")}</pre>
    </details>
  </section>;
}

const meta = {
  title: "Video/Audio Visual Cue", component: CueDemo, parameters: { layout: "fullscreen" },
  argTypes: {
    format: { control: { type: "select", labels: Object.fromEntries(Object.entries(FORMATS).map(([k, v]) => [k, v.label])) }, options: Object.keys(FORMATS) },
    mode: { control: "inline-radio", options: ["audio", "visual-only"] },
    departShift: { control: { type: "range", min: -12, max: 12, step: 1 } },
    startFrame: { control: { type: "number", min: 0, max: DURATION - 1 } },
  },
  args: { format: "whisperx", mode: "audio", departShift: 0, startFrame: 100 },
} satisfies Meta<typeof CueDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Cues: Story = {};
