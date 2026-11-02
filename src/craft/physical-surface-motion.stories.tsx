import { useCallback, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, PlaneGeometry, SphereGeometry } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import { createPhysicalHeroMotion } from "../../registry/craft/physical-motion-three";
import type { HeroAsset } from "../../registry/craft/hero-asset";
import type { PhysicalActionSpec } from "../../registry/motion/physical-motion";
import { CameraLightingInspector } from "../../registry/motion/camera-lighting-inspector";
import { DEFAULT_CAMERA_LIGHTING_PRESET } from "../../registry/motion/camera-lighting-preset";
import type { CameraLightingPreset } from "../../registry/motion/camera-lighting-preset";
import { useFramePlayer } from "../house-math/house-ui";

const FRAME_COUNT = 91;
const STUDIO_PRESET: CameraLightingPreset = { ...DEFAULT_CAMERA_LIGHTING_PRESET, id: "physical-surface-qa",
  camera: { ...DEFAULT_CAMERA_LIGHTING_PRESET.camera, space: "world", target: [0, .28, 0],
    azimuthDeg: 9, elevationDeg: 24, distanceFactor: 7.5 } };

/** Simple first-party geometry is intentional: this story verifies equations and visual playback, not asset fidelity. */
function createMotionFixture(speedMps: number, friction: number, rollingResistance: number): HeroAsset {
  const group = new Group(), parts = new Map<string, Mesh>();
  const resources: Array<{ dispose(): void }> = [];
  const material = (color: string, roughness: number, metalness = 0) => {
    const result = new MeshStandardMaterial({ color, roughness, metalness });
    resources.push(result);
    return result;
  };
  const floor = new Mesh(new BoxGeometry(8.7, .08, 3.3), material("#34434a", .85));
  resources.push(floor.geometry); floor.position.y = -.06; floor.receiveShadow = true; group.add(floor);
  const lane = new Mesh(new PlaneGeometry(8.3, 2.9), material("#4e6268", .9));
  resources.push(lane.geometry); lane.rotation.x = -Math.PI / 2; lane.position.y = -.017; group.add(lane);
  const crate = new Mesh(new RoundedBoxGeometry(.68, .44, .68, 4, .045), material("#cf8b51", .58));
  resources.push(crate.geometry); crate.position.set(-2.8, .22, -.8); crate.castShadow = true; group.add(crate);
  const ball = new Mesh(new SphereGeometry(.25, 40, 24), material("#82a9d0", .26, .55));
  resources.push(ball.geometry); ball.position.set(-2.8, .25, .8); ball.castShadow = true; group.add(ball);
  // The patch makes ball rotation visually apparent without fake motion.
  const patch = new Mesh(new SphereGeometry(.253, 24, 16, 0, Math.PI * .6, .4, .5), material("#dceef8", .32));
  resources.push(patch.geometry); ball.add(patch);
  parts.set("crate", crate); parts.set("ball", ball);
  const hero: HeroAsset = { id: "physical-surface-qa", group,
    bounds: { min: [-4.35, -.1, -1.65], max: [4.35, 1.2, 1.65] }, parts, tier: "supporting",
    metersPerUnit: 1, craft: { materials: ["wood", "brushed metal", "painted floor"],
      details: ["Dry Coulomb friction", "Rolling resistance", "No-slip rotation"] },
    dispose() { for (const resource of resources) resource.dispose(); },
  };
  const plans: PhysicalActionSpec[] = [
    { schemaVersion: 1, id: "slide-crate", label: "Dry friction · sliding", durationFrames: FRAME_COUNT - 1,
      motions: [{ kind: "slide", target: "crate", direction: [1, 0, 0], speedMps, frictionCoefficient: friction }] },
    { schemaVersion: 1, id: "roll-ball", label: "No-slip rolling", durationFrames: FRAME_COUNT - 1,
      motions: [{ kind: "roll", target: "ball", direction: [1, 0, 0], speedMps,
        radiusMeters: .25, rollingResistance }] },
  ];
  return createPhysicalHeroMotion(hero, plans, role => parts.has(role) ? [parts.get(role)!] : []).asset;
}

function SurfaceMotionDemo({ initialAction = "slide-crate" }: { initialAction?: "slide-crate" | "roll-ball" }) {
  const [action, setAction] = useState<string>(initialAction);
  const [speed, setSpeed] = useState(1.8);
  const [friction, setFriction] = useState(.32);
  const [resistance, setResistance] = useState(.06);
  const [preset, setPreset] = useState<CameraLightingPreset>(STUDIO_PRESET);
  const player = useFramePlayer(FRAME_COUNT, { loop: false });
  const createAsset = useCallback(() => createMotionFixture(speed, friction, resistance), [speed, friction, resistance]);
  const mu = action === "slide-crate" ? friction : resistance;
  const stopAt = mu > 0 ? speed / (mu * 9.81) : Infinity;
  const stopDistance = mu > 0 ? speed * speed / (2 * mu * 9.81) : Infinity;
  return <main style={{ minHeight: "100vh", background: "#0b171b", color: "#e8f3f1", padding: "clamp(16px, 3vw, 36px)", fontFamily: "Inter, system-ui, sans-serif" }}>
    <div style={{ maxWidth: 1480, margin: "0 auto" }}>
      <p style={{ color: "#82dbbd", textTransform: "uppercase", fontSize: 11, letterSpacing: ".15em" }}>Physics · deterministic motion</p>
      <h1 style={{ fontSize: "clamp(24px, 3vw, 35px)", margin: "8px 0" }}>Slide and roll. No simulation loop.</h1>
      <p style={{ color: "#a9c5c6", fontSize: 13, maxWidth: 800, lineHeight: 1.6, marginBottom: 22 }}>
        Reusable analytic presets: a crate decelerates under dry friction; a ball translates and rotates with no slip.
        Both are sampled from an absolute film frame, so backward scrub and render are identical. This is a QA scene using simple first-party geometry.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 390px), 1fr))", gap: 20, alignItems: "start" }}>
        <div style={{ minWidth: 0 }}>
          <div data-km-video-capture="" style={{ background: "#121e24", border: "1px solid #385258", borderRadius: 12, overflow: "hidden" }}>
            <HeroAssetViewer createAsset={createAsset} cameraLightingPreset={preset} width={960} height={600} action={action} actionFrame={player.frame} />
          </div>
          <section style={{ marginTop: 15, padding: 16, background: "#12262a", border: "1px solid #395454", borderRadius: 12, display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 12 }}>Motion
              <select aria-label="Surface motion" value={action} onChange={event => { setAction(event.target.value); player.seek(0); }}
                style={{ padding: 9, borderRadius: 8, color: "#e8f3f1", background: "#1b3740", border: "1px solid #567176" }}>
                <option value="slide-crate">Crate · Coulomb slide</option><option value="roll-ball">Ball · no-slip roll</option>
              </select>
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button type="button" onClick={() => player.playing ? player.pause() : player.resume()}
                style={{ padding: "8px 14px", borderRadius: 8, border: 0, background: "#258775", color: "white", fontWeight: 700, cursor: "pointer" }}>
                {player.playing ? "Pause" : "Play"}
              </button>
              <input aria-label="Surface motion frame" type="range" min={0} max={90} value={player.frame}
                onChange={event => player.seek(Number(event.target.value))} style={{ flex: 1, accentColor: "#89dabb" }} />
              <output aria-label="Surface frame position" style={{ fontVariantNumeric: "tabular-nums", fontSize: 12 }}>{player.frame} / 90</output>
            </div>
            <label style={{ display: "grid", gap: 5, fontSize: 12 }}>Initial speed · {speed.toFixed(1)} m/s
              <input aria-label="Initial speed" type="range" min={.2} max={3} step={.1} value={speed} onChange={event => setSpeed(Number(event.target.value))} />
            </label>
            <label style={{ display: "grid", gap: 5, fontSize: 12 }}>Dry friction coefficient · {friction.toFixed(2)}
              <input aria-label="Sliding friction" type="range" min={0} max={1} step={.01} value={friction} onChange={event => setFriction(Number(event.target.value))} />
            </label>
            <label style={{ display: "grid", gap: 5, fontSize: 12 }}>Rolling resistance coefficient · {resistance.toFixed(2)}
              <input aria-label="Rolling resistance" type="range" min={0} max={.4} step={.01} value={resistance} onChange={event => setResistance(Number(event.target.value))} />
            </label>
            <p style={{ fontSize: 12, color: "#a6c2bc", margin: 0, lineHeight: 1.55 }}>
              {Number.isFinite(stopAt) ? `Stops after ${stopAt.toFixed(2)} s / ${stopDistance.toFixed(2)} m.` : "Zero resistance: constant speed (no stopping time)."}
              {action === "roll-ball" ? " Rotation = traveled distance ÷ radius; assumes a horizontal surface and no slipping." : " Friction force is approximated as μ × mass × gravity on a flat surface."}
            </p>
          </section>
        </div>
        <CameraLightingInspector value={preset} onChange={setPreset} onReset={() => setPreset(STUDIO_PRESET)} capabilities={{ physicalLights: true }} />
      </div>
    </div>
  </main>;
}

const meta = { title: "3D asset toolkit/Physically Grounded Motion", id: "craft-physical-grounded-motion",
  component: SurfaceMotionDemo, parameters: { layout: "fullscreen" } } satisfies Meta<typeof SurfaceMotionDemo>;
export default meta;
export const CoulombSlide: StoryObj<typeof meta> = { args: { initialAction: "slide-crate" } };
export const NoSlipRoll: StoryObj<typeof meta> = { args: { initialAction: "roll-ball" } };
