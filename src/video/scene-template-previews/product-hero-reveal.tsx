import { useEffect, useMemo, useState } from "react";
import { ProductHeroRevealScene } from "../../../registry/video/recipes/product-hero-reveal";
import { createVideoElementAdapter } from "../../../registry/video/frame-clip-adapters";
import { VideoExportStage } from "../../../registry/video/video-export-stage";
import { ScenePreviewShell } from "./preview-shell";

const landscape = new URL("../assets/product-hero/landscape.mp4", import.meta.url).href;
const portraitFilm = new URL("../assets/product-hero/portrait.mp4", import.meta.url).href;
const soundtrack = new URL("../assets/product-hero/mix.wav", import.meta.url).href;
const fps = { num: 30, den: 1 };
const licenseRef = "Original Kumiki procedural speaker, Blender studio and synthesized sound; no third-party assets";
function Film({ frame, portrait, reduced, language }: { frame: number; portrait: boolean; reduced: boolean; language: "en" | "ja" }) {
  const source = portrait ? portraitFilm : landscape;
  const adapter = useMemo(() => createVideoElementAdapter({ url: () => source, cacheSize: 4 }), [source]);
  useEffect(() => () => adapter.dispose?.(), [adapter]);
  const clip = useMemo(() => ({ id: "product-studio", startFrame: 0, durationFrames: 300,
    source: { id: portrait ? "speaker-portrait" : "speaker-landscape", width: portrait ? 1080 : 1920,
      height: portrait ? 1920 : 1080, frameCount: 300, fps, licenseRef } }), [portrait]);
  return <ProductHeroRevealScene clip={clip} adapter={adapter} frame={frame} fps={fps} reducedMotion={reduced}
    width={clip.source.width} height={clip.source.height} copyAtFrame={209}
    eyebrow={language === "ja" ? "音を、かたちに。" : "SOUND / CONSIDERED"}
    title={language === "ja" ? "聴くための、\n静かなかたち。" : "Sound,\nconsidered."}
    subtitle={language === "ja" ? "素材から、細部まで。" : "An original study in material and detail."}
    description="An original desktop speaker: brass dial macro, perforated grille and walnut details, then a complete studio hero with its power indicator illuminated."/>;
}
function Export({ language }: { language: "en" | "ja" }) {
  const [frame, setFrame] = useState(0);
  const portrait = new URLSearchParams(window.location.search).get("portrait") === "1";
  const manifest = useMemo(() => ({ schemaVersion: 1 as const, id: "product-hero-reveal", durationFrames: 300, fps,
    width: portrait ? 1080 : 1920, height: portrait ? 1920 : 1080,
    assets: [{ id: "blender-product-film", kind: "video" as const, url: portrait ? portraitFilm : landscape, licenseRef }] }), [portrait]);
  return <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
    <Film frame={frame} portrait={portrait} reduced={false} language={language}/>
  </VideoExportStage>;
}
export function ProductHeroRevealPreview({ language = "en" }: { language?: "en" | "ja" }) {
  if (new URLSearchParams(window.location.search).get("kmExport") === "1") return <Export language={language}/>;
  return <ScenePreviewShell title="Product Hero Reveal" subtitle="Blender product study · tactile detail → construction → hero"
    fps={30} durationFrames={300} reducedFrame={270} audio={{ src: soundtrack, label: "Original product activation motif" }}
    credits="Original hypothetical product, geometry, studio and sound. Blender renders are pre-rendered media, not browser 3D. Source .blend and reproducible Python recipe retained; human visual/audio review pending.">
    {({ frame, portrait, reduced }) => <Film frame={frame} portrait={portrait} reduced={reduced} language={language}/>}
  </ScenePreviewShell>;
}
