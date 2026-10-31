import landscapeSource from "../assets/product-hero/landscape-source.json";
import portraitSource from "../assets/product-hero/portrait-source.json";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProductHeroRevealScene } from "../../../registry/video/recipes/product-hero-reveal";
import { createVideoElementAdapter } from "../../../registry/video/frame-clip-adapters";
import { VideoExportStage } from "../../../registry/video/video-export-stage";
import type { ReactNode } from "react";

const landscape = new URL("../assets/product-hero/landscape.mp4", import.meta.url).href;
const portraitFilm = new URL("../assets/product-hero/portrait.mp4", import.meta.url).href;
const fps = landscapeSource.fps;
const durationFrames = landscapeSource.durationFrames;
const licenseRef = "Original Kumiki procedural speaker, Blender studio and synthesized sound; no third-party assets";
function Film({ frame, portrait, reduced, language, renderMedia }: { frame: number; portrait: boolean; reduced: boolean; language: "en" | "ja"; renderMedia?: () => ReactNode }) {
  const source = portrait ? portraitFilm : landscape;
  const adapter = useMemo(() => createVideoElementAdapter({ url: () => source, cacheSize: 4 }), [source]);
  useEffect(() => () => adapter.dispose?.(), [adapter]);
  const clip = useMemo(() => ({ id: "product-studio", startFrame: 0, durationFrames,
    source: { id: portrait ? "speaker-portrait" : "speaker-landscape", width: (portrait ? portraitSource : landscapeSource).size[0],
      height: (portrait ? portraitSource : landscapeSource).size[1], frameCount: durationFrames, fps, licenseRef } }), [portrait]);
  return <ProductHeroRevealScene clip={clip} adapter={adapter} renderMedia={renderMedia} frame={frame} fps={fps} reducedMotion={reduced}
    width={clip.source.width} height={clip.source.height} copyAtFrame={landscapeSource.audioAnchorFrame}
    eyebrow={language === "ja" ? "音を、かたちに。" : "OBJECT STUDY / 01"}
    title={language === "ja" ? "聴くための、\n静かなかたち。" : "Sound,\nconsidered."}
    subtitle={language === "ja" ? "素材。細部。存在感。" : "Material. Detail. Presence."}
    description="An original desktop speaker: brass dial macro, perforated grille and walnut details, then a complete studio hero with its power indicator illuminated."/>;
}
function Export({ language }: { language: "en" | "ja" }) {
  const [frame, setFrame] = useState(0);
  const portrait = new URLSearchParams(window.location.search).get("portrait") === "1";
  const manifest = useMemo(() => ({ schemaVersion: 1 as const, id: "product-hero-reveal", durationFrames, fps,
    width: (portrait ? portraitSource : landscapeSource).size[0], height: (portrait ? portraitSource : landscapeSource).size[1],
    assets: [{ id: "blender-product-film", kind: "video" as const, url: portrait ? portraitFilm : landscape, licenseRef }] }), [portrait]);
  return <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
    <Film frame={frame} portrait={portrait} reduced={false} language={language}/>
  </VideoExportStage>;
}
export function ProductHeroRevealPreview({ language = "en" }: { language?: "en" | "ja" }) {
  const video = useRef<HTMLVideoElement>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const rate = fps.num / fps.den;
  useEffect(() => {
    if (!playing) return;
    let request = 0;
    const sample = () => {
      if (video.current) setFrame(Math.min(durationFrames - 1, Math.floor(video.current.currentTime * rate + 1e-4)));
      request = requestAnimationFrame(sample);
    };
    request = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(request);
  }, [playing, rate]);
  const seek = (target: number) => {
    video.current?.pause(); setPlaying(false); setFrame(target);
    if (video.current) video.current.currentTime = target / rate;
  };
  const toggle = () => {
    const player = video.current;
    if (!player) return;
    if (playing) { player.pause(); return; }
    if (frame >= durationFrames - 1) seek(0);
    void player.play().catch(() => setError("Playback could not start. Reload the film and try again."));
  };
  if (new URLSearchParams(window.location.search).get("kmExport") === "1") return <Export language={language}/>;
  return <main className="min-h-screen bg-canvas p-6 text-foreground">
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <header><p className="text-sm text-muted-foreground">Scene Templates</p><h1 className="text-2xl font-semibold">Product Hero Reveal</h1>
        <p className="text-sm text-muted-foreground">Tactile detail → construction → hero · 10 seconds</p></header>
      <div style={{ width: "100%", maxWidth: portrait ? 440 : 1100, margin: "0 auto" }}>
        <Film frame={frame} portrait={portrait} reduced={reduced} language={language}
          renderMedia={() => <video ref={video} src={portrait ? portraitFilm : landscape} preload="auto" playsInline muted={muted}
            aria-label="Original speaker studio film" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
            onEnded={() => { setPlaying(false); setFrame(durationFrames - 1); }}
            onLoadedData={() => { if (reduced && video.current) video.current.currentTime = (durationFrames - 1) / rate; }}
            onError={() => setError("The product film could not load. Check the generated media and reload the preview.")}
            style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}/>}/>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={reduced} onClick={toggle} className="rounded-control border border-border px-4 py-2">{playing ? "Pause" : "Play"}</button>
        <button type="button" onClick={() => seek(reduced ? durationFrames - 1 : 0)} className="rounded-control border border-border px-4 py-2">Restart</button>
        <button type="button" aria-pressed={portrait} onClick={() => { seek(reduced ? durationFrames - 1 : 0); setPortrait(!portrait); }} className="rounded-control border border-border px-4 py-2">{portrait ? "9:16" : "16:9"}</button>
        <button type="button" aria-pressed={!muted} onClick={() => setMuted(!muted)} className="rounded-control border border-border px-4 py-2">Sound {muted ? "off" : "on"}</button>
        <label className="flex items-center gap-2"><input type="checkbox" checked={reduced} onChange={event => { setReduced(event.target.checked); seek(event.target.checked ? durationFrames - 1 : 0); }}/> Reduced motion</label>
        <span className="text-sm tabular-nums">Frame {frame} / {durationFrames - 1}</span>
      </div>
      <input type="range" aria-label="Seek product film" min={0} max={durationFrames - 1} value={frame} disabled={reduced} onChange={event => seek(Number(event.target.value))}/>
      {error && <p role="alert">{error}</p>}
      <p className="text-sm text-muted-foreground">Original hypothetical product, geometry and sound. Blender-rendered footage; editable project retained. Human visual/audio review pending.</p>
    </div>
  </main>;
}
