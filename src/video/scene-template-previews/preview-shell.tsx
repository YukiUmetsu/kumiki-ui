import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Storybook-only playback shell for frame-addressable scene templates. The
 * scene itself has no clock: this shell owns a requestAnimationFrame clock,
 * seeking, aspect and reduced-motion controls, and hands the frame down.
 */
export function ScenePreviewShell({ title, subtitle, fps, durationFrames, reducedFrame, credits, children }: {
  title: string; subtitle: string; fps: number; durationFrames: number;
  /** Frame shown when reduced motion is enabled: the settled final composition. */
  reducedFrame: number;
  credits: ReactNode;
  children: (state: { frame: number; portrait: boolean; reduced: boolean }) => ReactNode;
}) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [reduced, setReduced] = useState(false);
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
        {children({ frame: reduced ? reducedFrame : frame, portrait, reduced })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={toggle} disabled={reduced} className="rounded-control border border-border px-4 py-2">{playing ? "Pause" : "Play"}</button>
        <button type="button" onClick={() => { setPlaying(false); setFrame(0); }} className="rounded-control border border-border px-4 py-2">Restart</button>
        <button type="button" aria-pressed={portrait} onClick={() => setPortrait(!portrait)} className="rounded-control border border-border px-4 py-2">{portrait ? "9:16" : "16:9"}</button>
        <label className="flex items-center gap-2"><input type="checkbox" checked={reduced} onChange={e => { setPlaying(false); setReduced(e.target.checked); }}/> Reduced motion</label>
        <span className="text-sm tabular-nums">Frame {reduced ? reducedFrame : frame} / {durationFrames - 1}</span>
      </div>
      <label className="flex flex-col gap-2 text-sm">Seek
        <input type="range" min={0} max={durationFrames - 1} value={frame} disabled={reduced}
          onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }}/>
      </label>
      {reduced && <p className="text-sm text-muted-foreground">Reduced motion shows the settled final composition. Uncheck it to play.</p>}
      <p className="text-sm text-muted-foreground">{credits}</p>
    </div>
  </main>;
}
