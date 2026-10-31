import { useState } from "react";
import type { ComponentType, CSSProperties } from "react";
import { VideoExportStage } from "../../../registry/video/video-export-stage";
import type { SceneTemplateSpec } from "../../../registry/video/scene-templates";
import type { SceneTemplateViewProps } from "../../../registry/video/scene-templates-react";

/** Shared native-size export boundary for the forest and cave identity variants. */
export function IdentitySceneExport({ spec, Scene, style }: {
  spec: SceneTemplateSpec<"nature-world-identity-reveal">;
  style?: CSSProperties;
  Scene: ComponentType<SceneTemplateViewProps<"nature-world-identity-reveal">>;
}) {
  const [frame, setFrame] = useState(0);
  const portrait = new URLSearchParams(window.location.search).get("portrait") === "1";
  const output = { ...spec, width: portrait ? 1080 : 1920, height: portrait ? 1920 : 1080 };
  const manifest = { schemaVersion: 1 as const, id: output.id, width: output.width, height: output.height,
    durationFrames: output.durationFrames, fps: output.fps,
    assets: [output.content.environment, output.content.mark, ...(output.content.layers ?? []).map(layer => layer.image)]
      .map(image => ({ id: image.id, kind: "image" as const, url: image.src, licenseRef: image.licenseRef })) };
  return <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}><Scene spec={output} frame={frame} style={style}/></VideoExportStage>;
}
