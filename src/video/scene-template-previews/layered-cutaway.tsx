import { useMemo, useState } from "react";
import { LayeredCutaway3D } from "../../../registry/video/stages/layered-cutaway-3d";
import type { SceneTemplateSpec } from "../../../registry/video/scene-templates";
import { VideoExportStage } from "../../../registry/video/video-export-stage";
import { ScenePreviewShell } from "./preview-shell";

const base: SceneTemplateSpec<"layered-cutaway"> = {
  schemaVersion: 1, recipeVersion: 1, recipeId: "layered-cutaway", id: "material-anatomy",
  fps: { num: 30, den: 1 }, durationFrames: 300, width: 1920, height: 1080,
  cueFrames: [54, 117, 180], background: "#151a1e", accent: "#b79973",
  content: { object: { id: "assembly", src: `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect x="10" y="20" width="80" height="60" rx="8" fill="%239ba8ac"/%3E%3C/svg%3E`, alt: "Original illustrative precision assembly" },
    relationship: "One assembly.\nFour distinct jobs.", reconstructed: true,
    layers: [{ id: "cover", label: "Optical cover", note: "Passes light" }, { id: "thermal", label: "Thermal spreader", note: "Distributes heat" },
      { id: "circuit", label: "Circuit core", note: "Carries signals" }, { id: "chassis", label: "Protective chassis", note: "Protects components" }] },
};
function Film({ frame, portrait, reduced, language }: { frame: number; portrait: boolean; reduced: boolean; language: "en" | "ja" }) {
  const spec = useMemo(() => ({ ...base, width: portrait ? 1080 : 1920, height: portrait ? 1920 : 1080,
    content: language === "en" ? base.content : { ...base.content, relationship: "ひとつの構造。\n四つの役割。",
      layers: base.content.layers.map((layer, index) => ({ ...layer, label: ["光学カバー", "熱拡散板", "回路基板", "保護シャーシ"][index], note: ["光を通す", "熱を分散する", "信号を伝える", "部品を保護する"][index] })) } }), [portrait, language]);
  return <LayeredCutaway3D spec={spec} frame={frame} reducedMotion={reduced}/>;
}
function Export({ language }: { language: "en" | "ja" }) {
  const [frame, setFrame] = useState(0);
  const portrait = new URLSearchParams(window.location.search).get("portrait") === "1";
  const manifest = useMemo(() => ({ schemaVersion: 1 as const, id: "material-anatomy", width: portrait ? 1080 : 1920,
    height: portrait ? 1920 : 1080, fps: base.fps, durationFrames: base.durationFrames, assets: [] }), [portrait]);
  return <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
    <Film frame={frame} portrait={portrait} reduced={false} language={language}/>
  </VideoExportStage>;
}
export function LayeredCutawayPreview({ language = "en" }: { language?: "en" | "ja" }) {
  if (new URLSearchParams(window.location.search).get("kmExport") === "1") return <Export language={language}/>;
  return <ScenePreviewShell title="Layered Cutaway" subtitle="Material anatomy · a 10-second assembly study"
    fps={30} durationFrames={300} reducedFrame={230}
    credits="Original illustrative geometry: open metal frames, copper fins, ceramic components and dielectric glass. No external model or texture. Silent; human visual acceptance pending.">
    {({ frame, portrait, reduced }) => <Film frame={frame} portrait={portrait} reduced={reduced} language={language}/>}
  </ScenePreviewShell>;
}
