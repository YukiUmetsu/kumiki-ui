/** A frame-clock player for particle stories: Play, scrub, and catalog sounds fired at each cue's sync point. */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import catalogFile from "../../assets/sound/catalog.json";
import type { ParticleCue } from "../../registry/visual/particle-moments";
import type { ParticleGuide } from "../../registry/visual/particle-guide";

export const FPS = 30, fps = { num: FPS, den: 1 }, DURATION = 150;
const previews = import.meta.glob("../../assets/sound/lab/catalog/*.m4a", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const peaks = new Map((catalogFile as { sounds: { id: string; peakSeconds: number }[] }).sounds.map(sound => [sound.id, sound.peakSeconds]));
export const page = { padding: 16, display: "grid", gap: 14, maxWidth: 1160, font: "15px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-primary, #10202e)" } as const;

export interface Variant { label: string; render: (frame: number) => ReactNode }
/** One or two pictures on the same clock. With two, the first is the professional use and the second the common mistake. */
/** `posterFrame` is the frame shown before Play, like a video's poster, so a moment whose effect comes later does not open on an empty picture. Play starts from the beginning. */
export function ParticlePlayer({ title, cues, good, bad, guide, width, posterFrame = 0 }: { title: string; cues: readonly ParticleCue[]; good: Variant; bad?: Variant; guide?: ParticleGuide; width?: number; posterFrame?: number }) {
  const [frame, setFrame] = useState(posterFrame), [started, setStarted] = useState(false), [playing, setPlaying] = useState(false), [sound, setSound] = useState(true);
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
  const w = width ?? (bad ? 560 : 960), variants = bad ? [good, bad] : [good];
  return <div style={page}>
    <h2 style={{ margin: 0, font: "700 20px/1.3 var(--km-font-body, system-ui)" }}>{title}</h2>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => { if (frame >= DURATION - 1 || (!started && !playing)) setFrame(0); setStarted(true); setPlaying(value => !value); }} style={{ font: "inherit", minHeight: 40, minWidth: 92 }}>{playing ? "Pause" : frame >= DURATION - 1 ? "Replay" : "Play"}</button>
      <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={sound} onChange={event => setSound(event.target.checked)} />Sound</label>
      <label style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: 220 }}>Frame {frame}
        <input type="range" min={0} max={DURATION - 1} value={frame} onChange={event => { setPlaying(false); setStarted(true); setFrame(Number(event.target.value)); }} style={{ flex: 1 }} /></label>
    </div>
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      {variants.map((variant, i) => <figure key={variant.label} style={{ margin: 0, display: "grid", gap: 6, maxWidth: w }}>
        <div style={{ position: "relative", width: w, height: w * 9 / 16, overflow: "hidden", borderRadius: 10, background: "#05080c", containerType: "size", outline: bad ? `2px solid ${i ? "#c2410c" : "#15803d"}` : "none", outlineOffset: 2 }}>{variant.render(frame)}</div>
        <figcaption>{bad ? <><strong style={{ color: i ? "#b23a0b" : "#11703a" }}>{i ? "Common mistake" : "Professional"}</strong>: {variant.label}</> : variant.label}</figcaption>
      </figure>)}
    </div>
    {guide && <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 16px", maxWidth: 1136 }}>
      {([["Jobs", guide.jobs.join(", ")], ["Use it for", guide.use], ["Avoid", guide.avoid], ["Settings", guide.settings], ["Sound", `${guide.sound.id ?? "none"}, ${guide.sound.when}`],
        ["Before it ships", guide.review.join(" ")], ["Seen in practice", guide.practice + " Named examples and sources: docs/30-particles-in-practice.md."]] as const)
        .map(([name, text]) => [<dt key={name} style={{ fontWeight: 700 }}>{name}</dt>, <dd key={name + "d"} style={{ margin: 0 }}>{text}</dd>])}
    </dl>}
  </div>;
}
