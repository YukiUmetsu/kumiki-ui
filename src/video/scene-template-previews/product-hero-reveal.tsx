import landscapeSource from "../assets/product-hero/landscape-source.json";
import portraitSource from "../assets/product-hero/portrait-source.json";
import { useEffect, useMemo, useState } from "react";
import { ProductHeroRevealScene } from "../../../registry/video/recipes/product-hero-reveal";
import { createVideoElementAdapter } from "../../../registry/video/frame-clip-adapters";
import { VideoExportStage } from "../../../registry/video/video-export-stage";
import { ScenePreviewShell } from "./preview-shell";

const landscape = new URL("../assets/product-hero/landscape.mp4", import.meta.url).href;
const portraitFilm = new URL("../assets/product-hero/portrait.mp4", import.meta.url).href;
const soundtrack = new URL("../assets/product-hero/mix.wav", import.meta.url).href;
const fps = landscapeSource.fps;
const durationFrames = landscapeSource.durationFrames;
const licenseRef = "Original Kumiki procedural speaker, Blender studio and synthesized sound; no third-party assets";
function Film({ frame, portrait, reduced, language }: { frame: number; portrait: boolean; reduced: boolean; language: "en" | "ja" }) {
  const source = portrait ? portraitFilm : landscape;
  const adapter = useMemo(() => createVideoElementAdapter({ url: () => source, cacheSize: 4 }), [source]);
  useEffect(() => () => adapter.dispose?.(), [adapter]);
  const clip = useMemo(() => ({ id: "product-studio", startFrame: 0, durationFrames,
    source: { id: portrait ? "speaker-portrait" : "speaker-landscape", width: (portrait ? portraitSource : landscapeSource).size[0],
      height: (portrait ? portraitSource : landscapeSource).size[1], frameCount: durationFrames, fps, licenseRef } }), [portrait]);
  return <ProductHeroRevealScene clip={clip} adapter={adapter} frame={frame} fps={fps} reducedMotion={reduced}
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
  if (new URLSearchParams(window.location.search).get("kmExport") === "1") return <Export language={language}/>;
  return <ScenePreviewShell title="Product Hero Reveal" subtitle="Blender product study · tactile detail → construction → hero"
    fps={fps.num / fps.den} durationFrames={durationFrames} reducedFrame={durationFrames - 1} audio={{ src: soundtrack, label: "Original product activation motif" }}
    credits="Original hypothetical product, geometry, studio and sound. Blender renders are pre-rendered media, not browser 3D. Source .blend and reproducible Python recipe retained; human visual/audio review pending.">
    {({ frame, portrait, reduced }) => <Film frame={frame} portrait={portrait} reduced={reduced} language={language}/>}
  </ScenePreviewShell>;
}
