/** Production-facing React adapter. Storybook and FFmpeg consume this exact view. */
import { useMemo } from "react";
import { HeroAssetViewer } from "../../../registry/craft/hero-viewer";
import { createEverydayDeskScene, evaluateEverydayCamera, toEverydayBookSpec } from "../../../registry/video/everyday-scenes-3d";
import type { EverydaySceneSpec } from "../../../registry/video/everyday-scenes-3d";
import { PhysicalBookHero3D } from "./scene-book-3d";

export interface Everyday3DSceneProps {
  spec: EverydaySceneSpec;
  frame: number;
  reducedMotion?: boolean;
}

export function Everyday3DScene({ spec, frame, reducedMotion = false }: Everyday3DSceneProps) {
  // Asset factories remain stable across all seeks; a new frame must never
  // reallocate hundreds of meshes or change a seeded material texture.
  const createAsset = useMemo(() => () => createEverydayDeskScene(spec), [spec]);
  const bookSpec = useMemo(() => spec.recipeId === "epic-book-storytelling"
    ? toEverydayBookSpec(spec) : null, [spec]);
  const camera = evaluateEverydayCamera(spec, reducedMotion ? 0 : frame);
  const portrait = spec.height > spec.width;
  const book = spec.recipeId === "epic-book-storytelling";
  const editorialFrame = reducedMotion ? spec.durationFrames - 1 : frame;
  const titleOpacity = editorialFrame < spec.durationFrames * .13 ? 1 : editorialFrame < spec.durationFrames * .22
    ? 1 - (editorialFrame - spec.durationFrames * .13) / (spec.durationFrames * .09) : 0;
  const statusOpacity = editorialFrame > spec.durationFrames * .76 ? Math.min(1,
    (editorialFrame - spec.durationFrames * .76) / (spec.durationFrames * .10)) : 0;
  return <section data-km-everyday-scene="" data-aspect={portrait ? "portrait" : "landscape"}
    data-recipe={spec.recipeId} data-frame={frame}
    aria-label={`${spec.content.title} — ${book ? "physical 3D book" : "everyday desk"}`}
    style={{ position: "relative", width: spec.width, height: spec.height, overflow: "hidden",
      background: "#2b302e", color: "#fff8e8", fontFamily: "system-ui, sans-serif" }}>
    {book && bookSpec ? <PhysicalBookHero3D spec={bookSpec} frame={frame}
      width={spec.width} height={spec.height} reducedMotion={reducedMotion}/> :
      <HeroAssetViewer data-km-frame-addressed="" createAsset={createAsset}
        width={spec.width} height={spec.height} action={reducedMotion ? "static" : "play"} actionFrame={frame}
        fps={spec.fps.num / spec.fps.den} pixelRatio={1.25}
        camera={camera} ariaLabel="Walnut desk with functional 3D laptop and authored paper objects"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}/>
    }
    {!book && <>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(90deg,rgba(15,22,24,.48),rgba(15,22,24,.08) 42%,transparent 75%)" }} />
      <div style={{ position: "absolute", left: portrait ? "8%" : "6%", top: portrait ? "8%" : "12%",
        maxWidth: portrait ? "85%" : "48%", opacity: titleOpacity, pointerEvents: "none" }}>
        <div style={{ fontSize: portrait ? 14 : 17, letterSpacing: 3.2, fontWeight: 700,
          color: "#e6c6a3", marginBottom: 12 }}>THE OBJECT IN CONTEXT</div>
        <div style={{ fontSize: portrait ? 43 : 53, fontWeight: 690, letterSpacing: -2.2,
          lineHeight: 1.08, overflowWrap: "break-word", textShadow: "0 2px 14px #101b21" }}>
          {spec.content.title}
        </div>
      </div>
      <div style={{ position: "absolute", left: portrait ? "8%" : "6%", bottom: portrait ? "8%" : "10%",
        maxWidth: portrait ? "84%" : "48%", opacity: statusOpacity,
        pointerEvents: "none", textShadow: "0 2px 12px #142226" }}>
        {spec.recipeId === "invoice-to-software" && <div style={{ color: "#e8d0af",
          fontSize: portrait ? 16 : 19, letterSpacing: 2.6, fontWeight: 700, marginBottom: 8 }}>
          {spec.content.software?.title ?? "RECORD UPDATED"}
        </div>}
        <div style={{ fontSize: portrait ? 27 : 35, lineHeight: 1.22, fontWeight: 640 }}>
          {spec.recipeId === "invoice-to-software" ? spec.content.software?.status ?? spec.content.caption
            : spec.content.caption}
        </div>
      </div>
    </>}
  </section>;
}
