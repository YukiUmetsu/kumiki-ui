import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import catalogFile from "../../assets/sound/catalog.json";
import * as Moments from "../../registry/video/shader-fx-moments-react";
import { causticReveal, lightWithASource, livingStill, markSting, resolveIntoMark, resolveIntoPicture } from "../../registry/video/shader-fx-moments";
import type { MomentCue } from "../../registry/video/shader-fx-moments";
import { SHADER_FX_GUIDE, SHADER_FX_JOBS, SHADER_FX_MOMENTS } from "../../registry/video/shader-fx-guide";
import type { ShaderFxJob } from "../../registry/video/shader-fx-guide";
import lagoon from "../../examples/film/assets/iceland/jokulsarlon.jpg?url";
import falls from "../../examples/film/assets/iceland/dynjandi.jpg?url";
import mark from "../../examples/film/assets/water-mark.svg?url";
import cave from "../../examples/film/assets/iceland/ice-cave.jpg?url";

const FPS = 30, fps = { num: FPS, den: 1 }, DURATION = 150;
const previews = import.meta.glob("../../assets/sound/lab/catalog/*.m4a", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const peaks = new Map((catalogFile as { sounds: { id: string; peakSeconds: number }[] }).sounds.map(sound => [sound.id, sound.peakSeconds]));
const LAGOON = { id: "jokulsarlon", src: lagoon, alt: "A glacier lagoon at dusk", licenseRef: "commons-jokulsarlon-cc0", width: 1800, height: 1202 };
const FALLS = { id: "dynjandi", src: falls, alt: "A wide stepped waterfall under cloud", licenseRef: "commons-dynjandi-cc0", width: 1800, height: 1200 };
const CAVE = { id: "ice-cave", src: cave, alt: "Scalloped blue ice inside a glacier cave", licenseRef: "commons-ice-cave-cc0-example", width: 1800, height: 1200 };
const MARK = { id: "drop", src: mark, alt: "A water drop mark", licenseRef: "original-kumiki-example" };
const BRAND = { colors: ["#0b1d2b", "#16405a", "#2a6b73", "#c9874f"], seed: 11, rate: .2 };

/** Each moment, with the cues its builder returns, so the sound in the story is the sound a film gets. */
const MOMENTS: Readonly<Record<string, { render: (frame: number) => ReactNode; cues: readonly MomentCue[] }>> = {
  "resolve-into-picture": { render: f => <Moments.ResolveIntoPicture image={FALLS} label="FIELD NOTES · ISSUE 12" frame={f} fps={fps} durationFrames={DURATION} />, cues: resolveIntoPicture({ image: FALLS }).cues },
  "resolve-into-mark": { render: f => <Moments.ResolveIntoMark mark={MARK} name="SAMPLE STUDIO" frame={f} fps={fps} durationFrames={DURATION} />, cues: resolveIntoMark({}).cues },
  "mark-sting": { render: f => <Moments.MarkSting mark={MARK} name="SAMPLE STUDIO" frame={f} fps={fps} durationFrames={DURATION} />, cues: markSting({ mark: MARK }).cues },
  "living-still": { render: f => <Moments.LivingStill image={LAGOON} waterline={.52} title="Still air, moving water" frame={f} fps={fps} durationFrames={DURATION} style={{ color: "#0d2133" }} />, cues: livingStill({ image: LAGOON, waterline: .52 }).cues },
  "signature-gradient": { render: f => <Moments.SignatureGradient brand={BRAND} frame={f} fps={fps} durationFrames={DURATION}>
    <span style={{ position: "absolute", left: "8%", bottom: "12%", color: "#f3f6f8", font: "600 clamp(16px, 5cqh, 40px)/1.2 var(--km-font-body, system-ui)" }}>Where the meltwater goes</span></Moments.SignatureGradient>, cues: [] },
  "caustic-reveal": { render: f => <Moments.CausticReveal image={CAVE} title="Under the ice" frame={f} fps={fps} durationFrames={DURATION} />, cues: causticReveal({ image: CAVE }).cues },
  "light-with-a-source": { render: f => <Moments.LightWithASource image={LAGOON} title="Light reaches the lagoon" frame={f} fps={fps} durationFrames={DURATION} />, cues: lightWithASource({ light: { x: .5, y: .3, strength: 2 }, aspect: 16 / 9 }).cues },
};

/** Plays on a frame clock and fires each cue at its sync point. */
function Player({ children, cues, width = 960, grain = false }: { children: (frame: number) => ReactNode; cues: readonly MomentCue[]; width?: number; grain?: boolean }) {
  const [frame, setFrame] = useState(0), [playing, setPlaying] = useState(false), [sound, setSound] = useState(true);
  const clock = useRef({ from: 0, at: 0 }), pending = useRef<{ timers: number[]; audios: HTMLAudioElement[] }>({ timers: [], audios: [] });
  useEffect(() => {
    const stop = () => { pending.current.timers.forEach(clearTimeout); pending.current.audios.forEach(audio => audio.pause()); pending.current = { timers: [], audios: [] }; };
    if (!playing) { stop(); return; }
    clock.current = { from: performance.now(), at: frame };
    if (sound) for (const cue of cues) {
      const wait = ((cue.frame - frame) / FPS - (peaks.get(cue.sound) ?? 0)) * 1000, url = previews[`../../assets/sound/lab/catalog/${cue.sound}.m4a`];
      if (wait < 0 || !url) continue;
      const audio = new Audio(url);
      audio.volume = Math.min(1, 10 ** (cue.gainDb / 20));
      pending.current.audios.push(audio);
      // Media playback, not a story play function.
      pending.current.timers.push(window.setTimeout(() => void HTMLMediaElement.prototype.play.call(audio).catch(() => undefined), wait));
    }
    let id = 0;
    const step = (now: number) => {
      const next = clock.current.at + Math.floor((now - clock.current.from) * FPS / 1000);
      if (next >= DURATION - 1) { setFrame(DURATION - 1); setPlaying(false); return; }
      setFrame(next); id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(id); stop(); };
  // The clock restarts from the frame where Play was pressed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);
  return <div style={{ display: "grid", gap: 10 }}>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", maxWidth: width }}>
      <button type="button" onClick={() => { if (frame >= DURATION - 1) setFrame(0); setPlaying(value => !value); }} style={{ font: "inherit", minHeight: 40, minWidth: 92 }}>{playing ? "Pause" : frame >= DURATION - 1 ? "Replay" : "Play"}</button>
      <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={sound} onChange={event => setSound(event.target.checked)} />Sound</label>
      <label style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: 220 }}>Frame {frame}
        <input type="range" min={0} max={DURATION - 1} value={frame} onChange={event => { setPlaying(false); setFrame(Number(event.target.value)); }} style={{ flex: 1 }} /></label>
    </div>
    <div style={{ position: "relative", width, height: width * 9 / 16, overflow: "hidden", borderRadius: 10, background: "#081420" }}>{children(frame)}{grain && <Moments.GrainFinish frame={frame} />}</div>
  </div>;
}
const page = { padding: 16, display: "grid", gap: 14, maxWidth: 1000, font: "15px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-primary, #10202e)" } as const;
const storyLink = (id: string) => `/?path=/story/${id}`;

function Moment({ id }: { id: string }) {
  const moment = SHADER_FX_MOMENTS.find(item => item.id === id)!, guide = SHADER_FX_GUIDE[moment.effect], live = MOMENTS[id];
  return <div style={page}>
    <h2 style={{ margin: 0, font: "700 20px/1.3 var(--km-font-body, system-ui)" }}>{moment.title}</h2>
    <p style={{ margin: 0 }}>{moment.summary} <strong>Job:</strong> {moment.job}.</p>
    <Player cues={live.cues}>{live.render}</Player>
    <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 16px" }}>
      {([["Use it for", guide.use], ["Avoid", guide.avoid], ["Settings", guide.settings], ["Sound", `${guide.sound.id ?? "none"}, ${guide.sound.when}`], ["Before it ships", guide.review.join(" ")], ["Seen in practice", guide.practice + " Named examples and sources: docs/29-shader-fx-in-practice.md."]] as const)
        .map(([name, value]) => [<dt key={name} style={{ fontWeight: 700 }}>{name}</dt>, <dd key={name + "d"} style={{ margin: 0 }}>{value}</dd>])}
    </dl>
  </div>;
}

/** Plain names for each job, as a person would describe the beat. */
const BEATS: Readonly<Record<ShaderFxJob, string>> = {
  mood: "Set a mood", bridge: "Bridge two scenes", identity: "Show a brand or mark", reveal: "Reveal a place or picture",
  evidence: "Present a quote or evidence", archive: "Show archive or print material", "living-still": "Make a photograph feel alive",
};
function EffectChooser() {
  const [job, setJob] = useState<ShaderFxJob>("reveal"), [grain, setGrain] = useState(false);
  // A moment shows for its own job and for every other job its effect suits, so each beat has something to play.
  const effects = Object.values(SHADER_FX_GUIDE).filter(guide => guide.jobs.includes(job)), moments = SHADER_FX_MOMENTS.filter(moment => moment.job === job || SHADER_FX_GUIDE[moment.effect].jobs.includes(job)).sort((a, b) => Number(b.job === job) - Number(a.job === job));
  const [pick, setPick] = useState<string>();
  const shown = moments.find(moment => moment.id === pick) ?? moments[0];
  return <div style={page}>
    <h2 style={{ margin: 0, font: "700 20px/1.3 var(--km-font-body, system-ui)" }}>What does this shot need to do?</h2>
    <div role="radiogroup" aria-label="The beat" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {SHADER_FX_JOBS.map(item => <button key={item} type="button" role="radio" aria-checked={item === job} onClick={() => { setJob(item); setPick(undefined); }}
        style={{ font: "inherit", minHeight: 40, padding: "0 12px", borderRadius: 8, border: "1px solid #7a8a99", background: item === job ? "#10202e" : "transparent", color: item === job ? "#fff" : "inherit" }}>{BEATS[item]}</button>)}
    </div>
    {moments.length > 1 && <div role="radiogroup" aria-label="Ready-made moments" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {moments.map(moment => <button key={moment.id} type="button" role="radio" aria-checked={moment.id === shown?.id} onClick={() => setPick(moment.id)} style={{ font: "inherit", minHeight: 36 }}>{moment.title}</button>)}
    </div>}
    {shown ? <section aria-label={shown.title} style={{ display: "grid", gap: 8 }}>
      <p style={{ margin: 0 }}><strong>{shown.title}</strong>: {shown.summary}</p>
      <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={grain} onChange={event => setGrain(event.target.checked)} />Add a grain finish over the whole shot</label>
      <Player key={shown.id} cues={MOMENTS[shown.id].cues} grain={grain}>{MOMENTS[shown.id].render}</Player>
    </section> : <p style={{ margin: 0 }}>No ready-made moment does this yet. Use the effect directly, as shown in its craft story below.</p>}
    <h3 style={{ margin: "8px 0 0", font: "700 17px/1.3 var(--km-font-body, system-ui)" }}>Effects for this job</h3>
    {effects.map(guide => <section key={guide.effect} aria-label={guide.title} style={{ display: "grid", gap: 4, padding: 12, border: "1px solid #c9d3dc", borderRadius: 10 }}>
      <strong>{guide.title}</strong>
      <span><b>Use it for:</b> {guide.use}</span>
      <span><b>Avoid:</b> {guide.avoid}</span>
      <span><b>Settings:</b> {guide.settings}</span>
      <span><b>Sound:</b> {guide.sound.id ?? "none"}, {guide.sound.when}.</span>
      <span><b>Seen in practice:</b> {guide.practice}</span>
      <a href={storyLink(`video-shader-fx-craft--${({ "mesh-gradient": "mesh-gradient-chapter-bridge", "liquid-metal": "liquid-metal-logo-sting", "god-rays": "god-rays-light-with-a-source", "grain-gradient": "grain-gradient-evidence-card", water: "water-living-still", "halftone-dots": "halftone-print-to-photograph" } as const)[guide.effect]}`)} target="_top">See it next to its common mistake</a>
    </section>)}
    <p style={{ margin: 0, fontSize: 14 }}>The named studio and brand examples behind these rules, with sources, are in <code>docs/29-shader-fx-in-practice.md</code>.</p>
    <p style={{ margin: 0, fontSize: 14 }}>Agents: <code>{`npm run catalog:find -- --type=effect --query="${job}"`}</code> returns the same choices with these rules, and <code>film:check</code> warns when a film breaks them.</p>
  </div>;
}

const meta = { title: "Video production/Shader FX Moments", id: "video-shader-fx-moments", component: EffectChooser, parameters: { layout: "fullscreen" } } satisfies Meta<typeof EffectChooser>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ChooseAnEffect: Story = { render: () => <EffectChooser /> };
export const ResolveIntoPicture: Story = { render: () => <Moment id="resolve-into-picture" /> };
export const ResolveIntoMark: Story = { render: () => <Moment id="resolve-into-mark" /> };
export const MarkSting: Story = { render: () => <Moment id="mark-sting" /> };
export const LivingStill: Story = { render: () => <Moment id="living-still" /> };
export const SignatureGradient: Story = { render: () => <Moment id="signature-gradient" /> };
export const LightWithASource: Story = { render: () => <Moment id="light-with-a-source" /> };
export const CausticReveal: Story = { render: () => <Moment id="caustic-reveal" /> };
