import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Storybook-only playback shell for frame-addressable scene templates. The
 * scene itself has no clock: this shell owns a requestAnimationFrame clock,
 * seeking, aspect and reduced-motion controls, and hands the frame down.
 */
export function ScenePreviewShell({ title, subtitle, fps, durationFrames, reducedFrame, credits, audio, children }: {
  title: string; subtitle: string; fps: number; durationFrames: number;
  /** Frame shown when reduced motion is enabled: the settled final composition.
   * Omit it to keep playback and seeking with reduced motion (scenes that cut between beats). */
  reducedFrame?: number;
  credits: ReactNode;
  /** Optional licensed ambience; the shell owns playback and seeking, never the scene. */
  audio?: { src: string; label: string };
  children: (state: { frame: number; portrait: boolean; reduced: boolean }) => ReactNode;
}) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioError, setAudioError] = useState("");
  const ambience = useRef<HTMLAudioElement>(null);
  const frozen = reduced && reducedFrame !== undefined;
  const origin = useRef({ time: 0, frame: 0 });
  useEffect(() => {
    if (!playing) return;
    let request = 0;
    origin.current = { time: performance.now(), frame };
    const tick = (now: number) => {
      const next = origin.current.frame + Math.floor((now - origin.current.time) * fps / 1000);
      if (next >= durationFrames - 1) { setFrame(durationFrames - 1); setPlaying(false); return; }
      setFrame(next);
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
    // The clock restarts from the current frame only when playback toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, fps, durationFrames]);
  useEffect(() => {
    const element = ambience.current;
    if (!element) return;
    if (audioError) { element.pause(); return; }
    const target = frame / fps;
    if ((!playing || Math.abs(element.currentTime - target) > .35) && Number.isFinite(element.duration)) element.currentTime = Math.min(target, element.duration);
    if (!playing || !soundEnabled || frozen) element.pause();
    else if (element.paused) void element.play().then(() => setAudioError("")).catch(() => setAudioError("Sound could not start. Toggle Sound off and on to retry."));
  }, [frame, fps, playing, soundEnabled, frozen, audio?.src, audioError]);
  useEffect(() => { const element = ambience.current; return () => element?.pause(); }, [audio?.src]);
  const toggle = () => {
    if (!playing && frame >= durationFrames - 1) setFrame(0);
    setPlaying(!playing);
  };
  return <main className="min-h-screen bg-canvas p-6 text-foreground">
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <header><p className="text-sm text-muted-foreground">Scene Templates</p>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p></header>
      <div style={{ width: "100%", maxWidth: portrait ? 440 : 1100, margin: "0 auto" }}>
        {children({ frame: frozen ? reducedFrame! : frame, portrait, reduced })}
      </div>
      {audio && <audio ref={ambience} src={audio.src} preload="auto" aria-label={audio.label}
        onError={() => setAudioError("Ambience could not load. Reload the preview to retry.")}/>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={toggle} disabled={frozen} className="rounded-control border border-border px-4 py-2">{playing ? "Pause" : "Play"}</button>
        <button type="button" onClick={() => { setPlaying(false); setFrame(0); }} className="rounded-control border border-border px-4 py-2">Restart</button>
        <button type="button" aria-pressed={portrait} onClick={() => setPortrait(!portrait)} className="rounded-control border border-border px-4 py-2">{portrait ? "9:16" : "16:9"}</button>
        <label className="flex items-center gap-2"><input type="checkbox" checked={reduced} onChange={e => { setPlaying(false); setReduced(e.target.checked); }}/> Reduced motion</label>
        {audio && <button type="button" aria-pressed={soundEnabled} onClick={() => { setSoundEnabled(!soundEnabled); setAudioError(""); }}
          className="rounded-control border border-border px-4 py-2">Sound {soundEnabled ? "on" : "off"}</button>}
        <span className="text-sm tabular-nums">Frame {frozen ? reducedFrame : frame} / {durationFrames - 1}</span>
      </div>
      {audioError && <p role="alert" className="text-sm">{audioError}</p>}
      <label className="flex flex-col gap-2 text-sm">Seek
        <input type="range" min={0} max={durationFrames - 1} value={frame} disabled={frozen}
          onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }}/>
      </label>
      {frozen && <p className="text-sm text-muted-foreground">Reduced motion shows the settled final composition. Uncheck it to play.</p>}
      <p className="text-sm text-muted-foreground">{credits}</p>
    </div>
  </main>;
}
