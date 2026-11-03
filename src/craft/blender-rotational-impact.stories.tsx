import { useCallback, useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import { loadBlenderRevision } from "../../registry/craft/blender-asset-bridge";
import type { BlenderRevisionFactory } from "../../registry/craft/blender-asset-bridge";
import type { BakedPhysicalActionSpec } from "../../registry/motion/baked-physical-motion";
import { CameraLightingInspector } from "../../registry/motion/camera-lighting-inspector";
import { validateCameraLightingPreset } from "../../registry/motion/camera-lighting-preset";
import type { CameraLightingPreset } from "../../registry/motion/camera-lighting-preset";
import { bakedContactsToSoundEvents, createAudioMixManifest } from "../../registry/video/audio-visual-cue";
import { useFramePlayer } from "../house-math/house-ui";
import manifest from "./fixtures/blender-rotational-impacts/manifest.json";
import parityPlan from "./fixtures/blender-rotational-impacts/visual-parity-plan.json";

const ACTION = "swinging-rod-impact";
const FPS = 30;
const FRAME_COUNT = 101;
const CAMERA: CameraLightingPreset = validateCameraLightingPreset(parityPlan.camera_preset);

async function loadFixture(): Promise<BlenderRevisionFactory> {
  const model = new URL("./fixtures/blender-rotational-impacts/model.glb", import.meta.url).href;
  const url = new URL("./fixtures/blender-rotational-impacts/baked-actions.json", import.meta.url).href;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to fetch Blender rotational bake (${response.status}).`);
  const bakedActions = await response.json() as BakedPhysicalActionSpec[];
  return loadBlenderRevision({ manifest, model }, { bakedActions,
    license: "Original first-party Blender Bullet rotational collision QA geometry." });
}

function BlenderRotationalImpactDemo() {
  // Only local/offline parity capture opts into silhouette; normal Storybook QA stays fully lit.
  const silhouette = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("kmSilhouette") === "1";
  const [factory, setFactory] = useState<BlenderRevisionFactory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<CameraLightingPreset>(CAMERA);
  const player = useFramePlayer(FRAME_COUNT, { loop: false });
  useEffect(() => {
    let disposed = false;
    let owned: BlenderRevisionFactory | null = null;
    void loadFixture().then(result => {
      if (disposed) result.release();
      else { owned = result; setFactory(result); }
    }).catch(cause => { if (!disposed) setError(cause instanceof Error ? cause.message : String(cause)); });
    return () => { disposed = true; owned?.release(); };
  }, []);
  const createAsset = useCallback(() => {
    if (!factory) throw new Error("Real Blender contact asset is still loading.");
    return factory();
  }, [factory]);
  const cues = useMemo(() => {
    if (!factory) return null;
    const contacts = factory.bakedContactEvents(ACTION);
    const sounds = bakedContactsToSoundEvents(contacts, { fps: { num: FPS, den: 1 }, durationFrames: FRAME_COUNT - 1,
      profiles: { "wood-on-stone": { assetRef: "audio/wood-on-stone.wav", gainDb: -12 } } });
    const mix = createAudioMixManifest({ id: "rotational-contact-qa", fps: { num: FPS, den: 1 },
      durationFrames: FRAME_COUNT - 1, lanes: [{ id: "sfx", kind: "sfx", startFrame: 0 }], sounds });
    return { contacts, sounds, mix };
  }, [factory]);

  return <main data-km-parity-action={ACTION} style={{ minHeight: "100vh", boxSizing: "border-box", background: "#09171c", color: "#e9f4f2", fontFamily: "Inter, system-ui, sans-serif", padding: "clamp(16px, 3vw, 36px)" }}>
    <div style={{ maxWidth: 1460, margin: "0 auto" }}>
      <p style={{ color: "#83ddc4", fontSize: 11, textTransform: "uppercase", letterSpacing: ".16em" }}>Blender asset bridge / real rigid-body contact</p>
      <h1 style={{ fontWeight: 550, fontSize: "clamp(24px, 3vw, 36px)", margin: "8px 0" }}>A swinging rod. A real angular impact.</h1>
      <p style={{ color: "#abc7c7", maxWidth: 850, fontSize: 13, lineHeight: 1.7, margin: "6px 0 22px" }}>
        Blender 4.5.15 runs a native hinged rigid-body simulation. The body-center detector captures the first strike at frame 10; checking the moving contact surface also catches the frame-17 rotational strike. Both survive as portable, frame-exact PM2 motion and conservative SFX candidates. Scrub through either hit, adjust camera height and angle, or reposition and recolor the lights. This is structural QA geometry, not a finished cinematic prop.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 385px), 1fr))", gap: 21, alignItems: "start" }}>
        <div style={{ minWidth: 0 }}>
          <div data-km-video-capture="" style={{ borderRadius: 14, background: "#101f25", border: "1px solid #345158", minHeight: 260, overflow: "hidden" }}>
            {factory ? <HeroAssetViewer createAsset={createAsset} cameraLightingPreset={silhouette ? CAMERA : preset}
              pixelRatio={silhouette ? 1 : undefined}
              visualQaMode={silhouette ? "silhouette" : undefined} action={ACTION}
              actionFrame={player.frame} width={960} height={600} />
              : <div role="status" style={{ padding: 30 }}>{error ? `Cannot load Blender bake: ${error}` : "Loading real Blender collision GLB…"}</div>}
          </div>
          <section style={{ marginTop: 15, padding: 16, borderRadius: 12, background: "#11272b", border: "1px solid #345158", display: "grid", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button type="button" onClick={() => player.playing ? player.pause() : player.resume()}
                style={{ padding: "9px 13px", border: 0, borderRadius: 8, color: "#fff", fontWeight: 700, background: "#278572", cursor: "pointer" }}>{player.playing ? "Pause" : "Play"}</button>
              <input data-km-parity-seek="" aria-label="Rotational impact frame" type="range" min={0} max={FRAME_COUNT - 1} value={player.frame}
                onChange={event => player.seek(Number(event.target.value))} style={{ accentColor: "#83ddc4", flex: 1 }} />
              <output aria-label="Rotational impact position" style={{ fontVariantNumeric: "tabular-nums", minWidth: 74, fontSize: 12 }}>{player.frame} / {FRAME_COUNT - 1}</output>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {[ ["Center-only", "1 cue"], ["With rotation", `${cues?.contacts.length ?? "…"} cues`], ["Clip", "100 frames"] ].map(([label, value]) =>
                <div key={label} style={{ background: "#18353a", borderRadius: 8, border: "1px solid #31545b", padding: 10 }}>
                  <p style={{ fontSize: 11, color: "#a6c8c7", margin: "0 0 6px" }}>{label}</p><strong style={{ fontSize: 16 }}>{value}</strong>
                </div>)}
            </div>
            <div aria-label="Rotational collision sound cue QA" style={{ display: "grid", gap: 7 }}>
              {cues?.sounds.map((sound, index) => <button key={sound.id} type="button" onClick={() => player.seek(sound.frame)}
                style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 8,
                  padding: "10px 12px", border: `1px solid ${player.frame === sound.frame ? "#76dfbf" : "#31545b"}`,
                  background: player.frame === sound.frame ? "#18524a" : "#18353a", color: "#e9f4f2", fontSize: 12 }}>
                <span>{index === 0 ? "Body-center strike" : "Angular surface strike"} · frame {sound.frame}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{cues.mix.inputs[index]?.startSeconds.toFixed(3)} s · {sound.gainDb} dB</span>
              </button>)}
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.6, color: "#a9c8c4", margin: 0 }}>
              Sound events are scheduled into a reusable audio mix by material and relative speed. The WAV path is a placeholder; no sound is played or bundled. Native Bullet contact impulses are unavailable, and both events still need visual/audio review.
            </p>
          </section>
        </div>
        <CameraLightingInspector value={preset} onChange={setPreset} onReset={() => setPreset(CAMERA)} capabilities={{ physicalLights: true }} />
      </div>
    </div>
  </main>;
}

const meta = { title: "3D asset toolkit/Blender Asset Bridge/Rotational Impact", id: "craft-blender-rotational-impact",
  component: BlenderRotationalImpactDemo, parameters: { layout: "fullscreen" } } satisfies Meta<typeof BlenderRotationalImpactDemo>;
export default meta;
export const RealBlenderAngularImpact: StoryObj<typeof meta> = {};
