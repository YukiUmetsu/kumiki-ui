import { useCallback, useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Mesh } from "three";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import { loadBlenderRevision } from "../../registry/craft/blender-asset-bridge";
import type { BlenderRevisionFactory } from "../../registry/craft/blender-asset-bridge";
import { CameraLightingInspector } from "../../registry/motion/camera-lighting-inspector";
import { DEFAULT_CAMERA_LIGHTING_PRESET } from "../../registry/motion/camera-lighting-preset";
import type { CameraLightingPreset } from "../../registry/motion/camera-lighting-preset";
import { useFramePlayer } from "../house-math/house-ui";
import manifest from "./fixtures/blender-cloth-deformation/manifest.json";

const ACTION = "cloth-sag";
const FPS = 30;
const FRAME_COUNT = 25;
const CLOTH_CAMERA_PRESET: CameraLightingPreset = { ...DEFAULT_CAMERA_LIGHTING_PRESET, id: "cloth-sag-qa",
  camera: { ...DEFAULT_CAMERA_LIGHTING_PRESET.camera, space: "world", target: [0, -.36, 0],
    azimuthDeg: 20, elevationDeg: 18, distanceFactor: 3.9 } };

async function loadClothFixture(): Promise<BlenderRevisionFactory> {
  const model = new URL("./fixtures/blender-cloth-deformation/model.glb", import.meta.url).href;
  return loadBlenderRevision({ manifest, model }, {
    license: "Original first-party Blender Cloth solver QA asset.",
    actions: { [ACTION]: { loop: false, label: "Actual Blender cloth sag · 24 frames" } },
  });
}

function ClothDeformationDemo() {
  const [factory, setFactory] = useState<BlenderRevisionFactory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<CameraLightingPreset>(CLOTH_CAMERA_PRESET);
  const player = useFramePlayer(FRAME_COUNT, { loop: false });
  useEffect(() => {
    let cancelled = false;
    let owned: BlenderRevisionFactory | null = null;
    void loadClothFixture().then(result => {
      if (cancelled) result.release();
      else { owned = result; setFactory(() => result); }
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause)); });
    return () => { cancelled = true; owned?.release(); };
  }, []);
  const createAsset = useCallback(() => {
    if (!factory) throw new Error("Cloth fixture has not loaded.");
    return factory();
  }, [factory]);
  const stats = useMemo(() => {
    if (!factory) return null;
    const hero = factory();
    try {
      hero.pose?.({ id: ACTION, frame: player.frame, fps: FPS });
      const mesh = hero.parts.get("kumiki:cloth-panel:1") as Mesh | undefined;
      const weights = mesh?.morphTargetInfluences ?? [];
      return { roles: hero.semanticParts.size, morphs: weights.length,
        active: weights.filter(weight => weight > .001).length,
        strongest: weights.length ? Math.max(...weights) : 0,
        clipFrames: factory.actions.find(action => action.id === ACTION)?.durationFrames ?? 0 };
    } finally { hero.dispose(); }
  }, [factory, player.frame]);
  return <main style={{ background: "#09171c", minHeight: "100vh", color: "#ecf4f4", padding: "clamp(16px, 3vw, 36px)", fontFamily: "Inter, system-ui, sans-serif" }}>
    <div style={{ maxWidth: 1480, margin: "0 auto" }}>
      <p style={{ color: "#89ddc5", fontSize: 11, textTransform: "uppercase", letterSpacing: ".16em" }}>Blender asset bridge / deforming geometry</p>
      <h1 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 560, margin: "8px 0" }}>A real Blender cloth simulation. One reusable GLB.</h1>
      <p style={{ fontSize: 13, maxWidth: 850, color: "#aec6c7", lineHeight: 1.7, margin: "4px 0 22px" }}>
        Blender 4.5.15 evaluates a pinned cloth panel under gravity, then bakes its changing vertices to standard animated glTF morph targets. Scrub any frame or change camera and lights; no browser cloth solver, video texture, CSS imitation, or per-scene playback code is used. This 81-vertex mesh is structural QA, not a finished cinematic fabric asset.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 390px), 1fr))", gap: 20, alignItems: "start" }}>
        <div style={{ minWidth: 0 }}>
          <div data-km-video-capture="" style={{ background: "#111e24", borderRadius: 14, border: "1px solid #335057", overflow: "hidden", minHeight: 260 }}>
            {factory ? <HeroAssetViewer createAsset={createAsset} cameraLightingPreset={preset} action={ACTION}
              actionFrame={player.frame} width={960} height={600} />
              : <div role="status" style={{ padding: 28 }}>{error ? `Unable to load cloth: ${error}` : "Preparing native cloth morph GLB…"}</div>}
          </div>
          <section style={{ marginTop: 15, padding: 16, borderRadius: 12, background: "#10252a", border: "1px solid #325158", display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button type="button" onClick={() => player.playing ? player.pause() : player.resume()}
                style={{ color: "white", background: "#278773", padding: "9px 13px", borderRadius: 8, border: 0, fontWeight: 700, cursor: "pointer" }}>
                {player.playing ? "Pause" : "Play"}
              </button>
              <input type="range" aria-label="Cloth deformation frame" min={0} max={FRAME_COUNT - 1} value={player.frame}
                onChange={event => player.seek(Number(event.target.value))} style={{ flex: 1, accentColor: "#89ddc5" }} />
              <output aria-label="Cloth frame position" style={{ fontVariantNumeric: "tabular-nums", fontSize: 12 }}>{player.frame} / {FRAME_COUNT - 1}</output>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {[["Morph poses", stats?.morphs ?? "…"], ["Active weights", stats?.active ?? "…"], ["Clip frames", stats?.clipFrames ?? "…"]].map(([label, value]) =>
                <div key={label} style={{ border: "1px solid #2b4c50", borderRadius: 8, padding: 10, minWidth: 0 }}>
                  <p style={{ color: "#9dbbbc", margin: 0, fontSize: 11 }}>{label}</p><strong style={{ fontSize: 17 }}>{value}</strong>
                </div>)}
            </div>
            <p style={{ margin: 0, color: "#aac4c4", fontSize: 12, lineHeight: 1.6 }}>
              The source `.blend` retains editable Cloth physics. The browser receives a single GLB with {stats?.roles ?? 1} semantic mesh role and a native morph-weight clip. Frame 0 is the rest state, frame 24 is the simulated sag. Rewind to check deterministic interpolation and unchanged geometry identity.
            </p>
          </section>
        </div>
        <CameraLightingInspector value={preset} onChange={setPreset} onReset={() => setPreset(CLOTH_CAMERA_PRESET)} capabilities={{ physicalLights: true }} />
      </div>
    </div>
  </main>;
}

const meta = { title: "3D asset toolkit/Blender Asset Bridge/Cloth Deformation", id: "craft-blender-cloth-deformation",
  component: ClothDeformationDemo, parameters: { layout: "fullscreen" } } satisfies Meta<typeof ClothDeformationDemo>;
export default meta;
export const RealBlenderClothSag: StoryObj<typeof meta> = {};
