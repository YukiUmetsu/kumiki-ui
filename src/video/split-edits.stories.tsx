import { useEffect, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileFilm } from "../../registry/video/film-document";
import type { CompiledFilm, FilmDocument } from "../../registry/video/film-document";
import type { CompiledSceneSound } from "../../registry/video/film-split-edits";
import { FilmStage } from "../../registry/video/film-stage";
import { RayWorldStage } from "../../registry/video/ray-world-react";
import { riverFlightWorld } from "../../registry/video/ray-world-river-flight";
import example from "../../examples/film/split-edits.film.json";
import seljalandsfoss from "../../examples/film/assets/iceland-large/seljalandsfoss.jpg?url";

/** The example film's sounds, straight from the catalog's recordings (seamless 8 s loops). */
const RECORDINGS = Object.fromEntries(Object.entries(import.meta.glob("../../assets/sound/recorded/bed-*.wav", { eager: true, query: "?url", import: "default" }))
  .map(([path, url]) => [path.split("/").pop()!.replace(/\.wav$/, ""), url as string]));
const W = 640, H = 360, FPS = 30;
/** The example with its images served by Storybook, and, for comparison, the same film with every split taken out. */
const withImages = (doc: FilmDocument): FilmDocument => ({ ...doc, scenes: doc.scenes.map(scene => scene.recipeId === "ray-world"
  ? { ...scene, content: { ...scene.content, images: scene.content.images?.map(image => ({ ...image, src: seljalandsfoss })) } } : scene) as FilmDocument["scenes"] });
const straight = (doc: FilmDocument): FilmDocument => ({ ...doc, id: doc.id + "-straight", scenes: doc.scenes.map(scene => scene.transition
  ? { ...scene, transition: { ...scene.transition, audioLead: undefined, audioTail: undefined } } : scene) as FilmDocument["scenes"] });
const compiled = (doc: FilmDocument): CompiledFilm => {
  const result = compileFilm({ ...doc, outputs: [{ id: "panel", width: W, height: H }] }, { outputId: "panel" });
  if (!result.ok) throw new Error(result.diagnostics.map(item => item.message).join("\n"));
  return result.film;
};
const SPLIT = compiled(withImages(example as unknown as FilmDocument)), STRAIGHT = compiled(straight(withImages(example as unknown as FilmDocument)));
const PLACE: Record<string, string> = { valley: "river valley", tunnel: "ice tunnel", fall: "waterfall" };
const SOUND: Record<string, string> = { "bed-river-fast": "river", "bed-wind-mountain": "wind in the ice", "bed-waterfall-near": "waterfall roar", "bed-cave-air": "cave air" };
const COLOR: Record<string, string> = { valley: "#5fb878", tunnel: "#6cb8ff", fall: "#e8c46a" };

/** Plays the film's scene sounds with Web Audio, scheduled from its compiled spans: each one's start, end, fades, gain and low-pass.
 * A preview: the render bakes the same spans with FFmpeg and masters the mix; here a fixed gain and a limiter stand in for mastering. */
function useSceneAudio(sounds: readonly CompiledSceneSound[], volume: number) {
  const ctx = useRef<AudioContext | undefined>(undefined), buffers = useRef<Record<string, AudioBuffer>>({}), playing = useRef<AudioScheduledSourceNode[]>([]);
  // The listener's volume: the last node before the speakers, kept across plays, and moved smoothly so a change never clicks.
  const output = useRef<GainNode | undefined>(undefined), level = useRef(volume);
  level.current = volume;
  useEffect(() => { const node = output.current; if (node) node.gain.setTargetAtTime(volume, node.context.currentTime, .03); }, [volume]);
  const stop = () => { for (const node of playing.current) try { node.stop(); } catch { /* already stopped */ } playing.current = []; };
  useEffect(() => () => { stop(); void ctx.current?.close(); }, []);
  /** Starts every sound from film frame `from`; returns the context time that frame plays at. */
  const start = async (from: number) => {
    const audio = ctx.current ??= new AudioContext();
    await audio.resume();
    for (const item of sounds) if (!buffers.current[item.sound]) buffers.current[item.sound] = await audio.decodeAudioData(await (await fetch(RECORDINGS[item.sound])).arrayBuffer());
    stop();
    const master = audio.createGain(), limiter = audio.createDynamicsCompressor();
    master.gain.value = 2.4; limiter.threshold.value = -3; limiter.ratio.value = 20; limiter.attack.value = .002; limiter.release.value = .1;
    if (!output.current) { output.current = audio.createGain(); output.current.gain.value = level.current; output.current.connect(audio.destination); }
    master.connect(limiter).connect(output.current);
    const t0 = audio.currentTime + .08, at = (frame: number) => t0 + (frame - from) / FPS;
    for (const item of sounds) {
      if (item.endFrame <= from) continue;
      const source = audio.createBufferSource(), gain = audio.createGain(), level = 10 ** ((item.gainDb ?? 0) / 20);
      source.buffer = buffers.current[item.sound]; source.loop = true;
      let node: AudioNode = source;
      if (item.lowpassHz) { const filter = audio.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = item.lowpassHz; node.connect(filter); node = filter; }
      node.connect(gain).connect(master);
      // The envelope: up over the fade in, level, down over the fade out, as the render's fades.
      const envelope = (frame: number) => level * Math.min(1, Math.max(0, (frame - item.startFrame) / Math.max(1, item.fadeInFrames)), Math.max(0, (item.endFrame - frame) / Math.max(1, item.fadeOutFrames)));
      const first = Math.max(from, item.startFrame), keys = [first, item.startFrame + item.fadeInFrames, item.endFrame - item.fadeOutFrames, item.endFrame].filter(frame => frame >= first).sort((a, b) => a - b);
      gain.gain.setValueAtTime(envelope(first), at(first));
      for (const frame of keys.slice(1)) gain.gain.linearRampToValueAtTime(envelope(frame), at(frame));
      source.start(at(first), ((first - item.startFrame) / FPS) % source.buffer.duration);
      source.stop(at(item.endFrame));
      playing.current.push(source);
    }
    return { context: audio, t0 };
  };
  return { start, stop };
}

/** The picture and sound tracks: each scene's picture, and below it each scene's sound with its fades, the J- and L-cut parts marked. */
function Tracks({ film, frame, onSeek }: { film: CompiledFilm; frame: number; onSeek: (frame: number) => void }) {
  const x = (f: number) => 8 + f / film.durationFrames * (W - 16), row = (i: number) => 52 + i * 26;
  return <svg width={W} height={52 + film.sceneSounds.length * 26 + 22} role="slider" aria-label="Film frame" aria-valuemin={0} aria-valuemax={film.durationFrames - 1} aria-valuenow={frame}
    style={{ display: "block", cursor: "pointer" }} onPointerDown={event => { const r = event.currentTarget.getBoundingClientRect(); onSeek(Math.max(0, Math.min(film.durationFrames - 1, Math.round((event.clientX - r.left - 8) / (W - 16) * film.durationFrames)))); }}>
    <text x={8} y={12} fill="#9aa4b2" fontSize={11} fontWeight={600}>PICTURE</text>
    {film.scenes.map(scene => <g key={scene.id}>
      <rect x={x(scene.startFrame) + 1} y={18} width={x(scene.endFrame) - x(scene.startFrame) - 2} height={20} rx={4} fill={COLOR[scene.id]} opacity={.85} />
      <text x={x(scene.startFrame) + 8} y={32} fill="#0b0d10" fontSize={11} fontWeight={700}>{PLACE[scene.id]}</text>
    </g>)}
    <text x={8} y={48} fill="#9aa4b2" fontSize={11} fontWeight={600}>SOUND</text>
    {film.sceneSounds.map((item, i) => {
      const y = row(i), top = y + 2, bottom = y + 20, path = `M${x(item.startFrame)},${bottom} L${x(item.startFrame + item.fadeInFrames)},${top} L${x(item.endFrame - item.fadeOutFrames)},${top} L${x(item.endFrame)},${bottom} Z`;
      const scene = film.scenes.find(s => s.id === item.sceneId)!;
      return <g key={item.sceneId}>
        <path d={path} fill={COLOR[item.sceneId]} opacity={.5} />
        {/* The part that plays under another scene's picture: a J-cut before, an L-cut after. */}
        {item.lead ? <rect x={x(item.startFrame)} y={top} width={x(scene.startFrame) - x(item.startFrame)} height={18} fill="none" stroke="#fff" strokeDasharray="3 2" /> : null}
        {item.tail ? <rect x={x(scene.endFrame)} y={top} width={x(item.endFrame) - x(scene.endFrame)} height={18} fill="none" stroke="#fff" strokeDasharray="3 2" /> : null}
        <text x={x(item.startFrame) + 6} y={y + 15} fill="#e8ecf2" fontSize={11} fontWeight={600}>{SOUND[item.sound] ?? item.sound}{item.lead ? `  ·  J-cut, ${(item.lead / FPS).toFixed(1)} s early` : ""}{item.tail ? `  ·  L-cut, ${(item.tail / FPS).toFixed(1)} s over` : ""}</text>
      </g>;
    })}
    {film.cut.transitions.map(t => <line key={t.toShotId} x1={x(t.boundary)} x2={x(t.boundary)} y1={14} y2={52 + film.sceneSounds.length * 26} stroke="#c9ced6" strokeWidth={1} strokeDasharray="2 3" />)}
    <rect x={x(frame) - 1} y={14} width={2} height={42 + film.sceneSounds.length * 26} fill="#fff" />
    <text x={W - 8} y={52 + film.sceneSounds.length * 26 + 16} fill="#6b7686" fontSize={10} textAnchor="end">dotted lines: picture cuts · dashed boxes: sound playing under another scene's picture</text>
  </svg>;
}

const meta: Meta = { title: "Video production/Split Edits", parameters: { layout: "fullscreen" } };
export default meta;

/** Three places on one river, cut hard, each with its own recorded sound. With split edits on, the river's rush carries over the cut
 * into the ice tunnel and fades (an L-cut), and the waterfall's roar starts in the tunnel 0.8 s before you see it (a J-cut). Switch
 * them off to hear the same cuts with the sound cut on the picture. Press Play: the sound is the point. */
export const Compare: StoryObj = {
  render: function Compare() {
    const [split, setSplit] = useState(true), [frame, setFrame] = useState(0), [playing, setPlaying] = useState(false);
    // Volume as the slider shows it (0 to 100), heard on a squared curve so the slider's middle sounds like the middle.
    const [volume, setVolume] = useState(80), [muted, setMuted] = useState(false);
    const film = split ? SPLIT : STRAIGHT, audio = useSceneAudio(film.sceneSounds, muted ? 0 : (volume / 100) ** 2), clock = useRef(0);
    const world = useMemo(() => (content: { images?: readonly { id: string; src: string; alt: string; width?: number; height?: number }[]; samples?: number; label: string }, context: { frame: number; fps: CompiledFilm["fps"]; width: number; height: number; reducedMotion: boolean }) =>
      <RayWorldStage world={riverFlightWorld} images={content.images} samples={Math.min(content.samples ?? riverFlightWorld.samples, 4)} label={content.label} style={{ width: "100%", height: "100%" }} {...context} />, []);
    useEffect(() => {
      if (!playing) { audio.stop(); return; }
      let cancelled = false;
      void audio.start(frame >= film.durationFrames - 1 ? 0 : frame).then(({ context, t0 }) => {
        const from = frame >= film.durationFrames - 1 ? 0 : frame;
        // The audio clock drives the picture, so the two cannot drift apart.
        const tick = () => {
          if (cancelled) return;
          const now = Math.max(from, Math.floor(from + (context.currentTime - t0) * FPS));
          if (now >= film.durationFrames - 1) { setFrame(film.durationFrames - 1); setPlaying(false); return; }
          setFrame(now); clock.current = requestAnimationFrame(tick);
        };
        tick();
      });
      return () => { cancelled = true; cancelAnimationFrame(clock.current); audio.stop(); };
    }, [playing, split]); // eslint-disable-line react-hooks/exhaustive-deps
    const seek = (to: number) => { setPlaying(false); setFrame(to); };
    return <div style={{ background: "#0b0d10", padding: 16, display: "grid", gap: 14, font: "14px system-ui", color: "#e8ecf2", minHeight: "100vh", alignContent: "start" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={() => setPlaying(p => !p)} style={{ font: "650 14px system-ui", padding: "8px 16px", borderRadius: 8, border: 0, background: "#7cc6ff", color: "#06121f", cursor: "pointer" }}>{playing ? "Pause" : "Play with sound"}</button>
        <span id="km-split-mode" style={{ color: "#9aa4b2", marginLeft: 8 }}>Split edits:</span>
        <div role="radiogroup" aria-labelledby="km-split-mode" style={{ display: "flex", gap: 4, padding: 3, borderRadius: 9, background: "#151b23", border: "1px solid #2b3442" }}>
          {([[true, "On: J- and L-cuts"], [false, "Off: sound cuts with the picture"]] as const).map(([value, label]) =>
            <button key={label} type="button" role="radio" aria-checked={split === value} onClick={() => { setSplit(value); setPlaying(false); }}
              style={{ font: "600 13px system-ui", padding: "6px 12px", borderRadius: 6, border: 0, cursor: "pointer", background: split === value ? "#7cc6ff" : "transparent", color: split === value ? "#06121f" : "#c9ced6" }}>{label}</button>)}
        </div>
        <span style={{ font: "600 13px ui-monospace, monospace", color: "#9aa4b2" }}>{(frame / FPS).toFixed(1)} s / {(film.durationFrames / FPS).toFixed(1)} s</span>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ color: "#9aa4b2" }}>Sound:</span>
        <button type="button" aria-pressed={muted} onClick={() => setMuted(m => !m)}
          style={{ font: "600 13px system-ui", padding: "6px 12px", borderRadius: 6, border: "1px solid #2b3442", cursor: "pointer", background: muted ? "#3a2328" : "#151b23", color: muted ? "#ffb4b4" : "#c9ced6", minWidth: 84 }}>
          {muted ? "Muted" : "Mute"}
        </button>
        <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#9aa4b2" }}>Volume
          <input type="range" min={0} max={100} step={1} value={volume} disabled={muted} onChange={event => setVolume(Number(event.target.value))}
            aria-valuetext={`${volume}%`} style={{ width: 180, accentColor: "#7cc6ff", opacity: muted ? .4 : 1 }} />
          <span style={{ font: "600 13px ui-monospace, monospace", color: muted ? "#6b7686" : "#c9ced6", minWidth: 40 }}>{muted ? "off" : `${volume}%`}</span>
        </label>
      </div>
      <div style={{ width: W, height: H, overflow: "hidden", borderRadius: 8, background: "#000" }}>
        <FilmStage film={film} frame={frame} renderObject={() => null} renderWorld={world} reducedMotion={false} />
      </div>
      <Tracks film={film} frame={frame} onSeek={seek} />
      <p style={{ margin: 0, color: "#9aa4b2", font: "13px/1.5 system-ui", maxWidth: W }}>
        {split ? "Listen at the two cuts. At 4 s the picture enters the ice tunnel while the river's rush carries on for a second and fades: an L-cut, the last place lingering. At 7.2 s the waterfall's roar rises while you are still in the tunnel, and the picture follows at 8 s: a J-cut, hearing where you are going before you see it."
          : "The same cuts with each sound starting and stopping on its picture, crossfaded over four frames. Every change of place is now a jolt in sound and picture at once."}
      </p>
      <p style={{ margin: 0, color: "#6b7686", font: "12px/1.5 system-ui", maxWidth: W }}>Sound here is a browser preview of the same spans the render bakes and masters; the picture is drawn with fewer samples than the render to keep up.</p>
    </div>;
  },
};
