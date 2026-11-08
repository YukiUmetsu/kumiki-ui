import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { LightThroughIt } from "../../registry/visual/light-recipes-react";
import { inspectLightShot } from "../../registry/visual/light-shots";
import type { LightThroughSpec } from "../../registry/visual/light-shots";
import { RealLightFlythrough, inspectFlythrough } from "../../registry/visual/baked-recipes-react";
import type { FlythroughSpec } from "../../registry/visual/baked-recipes-react";
import canyon from "../../assets/baked/slot-canyon.glb?url";
import canyonPath from "../../assets/baked/slot-canyon.path.json";
import rockDetail from "../../assets/baked/rock-detail.jpg?url";
import sandDetail from "../../assets/baked/sand-detail.jpg?url";
import { CapturedPlace, inspectCapturedPlace } from "../../registry/visual/splat-stage-react";
import type { CapturedPlaceSpec } from "../../registry/visual/splat-stage-react";
import capture from "../../assets/captured/montreal-clock-tower.spz?url";
import { ParticlePlayer, fps } from "./particle-story-player";

const POOL: LightThroughSpec = {
  durationFrames: 210, drop: { frame: 36, x: -.35, z: .25 }, view: { yaw: 6, pitch: 60, fill: 1.32 }, orbit: 4,
  title: { text: "Light bends where the surface curves", sub: "Each ripple acts as a lens and focuses the sun into lines", enter: 96 },
};

function Problems({ spec }: { spec: LightThroughSpec }) {
  const problems = inspectLightShot(spec, fps.num);
  return <p style={{ margin: 0 }}><strong>Craft check (`inspectLightShot`):</strong> {problems.length ? problems.map(p => `${p.severity}: ${p.message}`).join(" ") : "no problems."}</p>;
}

const meta = { title: "Video production/Light Recipes", id: "video-light-recipes", component: LightThroughIt, parameters: { layout: "fullscreen" } } satisfies Meta<typeof LightThroughIt>;
export default meta;
type Story = StoryObj<typeof meta>;

export const LightThroughWater: Story = { args: { frame: 0, fps, spec: POOL }, render: () => <ParticlePlayer title="Light Through It: the ripple you see is the light you see" cues={[{ frame: 36, sound: "drop-water-full", gainDb: -4 }]} durationFrames={POOL.durationFrames} posterFrame={84}
  good={{ label: "Calm swells keep the floor alive; the drop lands at 1.2 s and its rings sweep the caustics outward. The light is traced from the water's actual shape at each frame.", render: f => <LightThroughIt frame={f} fps={fps} spec={POOL} tone="dark-on-light" /> }}
  notes={<Problems spec={POOL} />} /> };

const CANYON_DETAILS = {
  wall: { src: rockDetail, repeat: canyonPath.details.wall.repeat as [number, number] },
  floor: { src: sandDetail, repeat: canyonPath.details.floor.repeat as [number, number] },
};
const CANYON: FlythroughSpec = { durationFrames: 240, travel: [.03, .55], lookUp: [3, 16], title: { text: "Light that bounced its way down", sub: "Lit once by a path tracer, then baked into the walls", enter: 120 } };
export const RealLightFlythroughStory: Story = { name: "Real-Light Flythrough", args: { frame: 0, fps, spec: POOL }, render: () => <ParticlePlayer title="Real-Light Flythrough: path-traced light, baked, flown through" cues={[{ frame: 0, sound: "bed-cave-air", gainDb: -16 }]} durationFrames={CANYON.durationFrames} posterFrame={150}
  good={{ label: "A sandstone slot canyon lit by a high sun and a blue sky, with every bounce path-traced in Blender Cycles and baked into the walls; the camera moves forward from the first frame and lifts its eye toward the light.", render: f => <RealLightFlythrough frame={f} fps={fps} src={canyon} path={canyonPath.path as [number, number, number][]} spec={CANYON} details={CANYON_DETAILS} /> }}
  notes={<p style={{ margin: 0 }}><strong>Craft check (`inspectFlythrough`):</strong> {inspectFlythrough(CANYON, fps.num).map(p => p.message).join(" ") || "no problems."}</p>} /> };

const PLACE: CapturedPlaceSpec = { durationFrames: 240, from: { position: [-0.598, 0.108, -1.873], target: [1.045, -0.255, -1.2] }, to: { position: [-0.338, 0.078, -1.44], target: [0.987, -0.155, -1.196] },
  rotation: [167.24, 29.82, 3.41], fov: 42, background: "#d7dde3",
  title: { text: "Montreal's Clock Tower", sub: "Rebuilt from 219 drone photographs", enter: 96 },
  credit: "Capture trained by Kumiki from Heritage3DMtl drone photographs by R. Shende, S. Mudur, T. Popa and K. Mendhurwar, Concordia University (CC BY 4.0)" };
export const CapturedPlaceStory: Story = { name: "Captured Place", args: { frame: 0, fps, spec: POOL }, render: () => <ParticlePlayer title="Captured Place: a real location, reconstructed from photographs" cues={[]} durationFrames={PLACE.durationFrames} posterFrame={120}
  good={{ label: "Gaussian splats rendered by Spark; every frame is held until the depth sort for its camera has settled.", render: f => <CapturedPlace frame={f} fps={fps} src={capture} spec={PLACE} /> }}
  notes={<p style={{ margin: 0 }}><strong>Craft check (`inspectCapturedPlace`):</strong> {inspectCapturedPlace(PLACE, fps.num).map(p => p.message).join(" ") || "no problems."}</p>} /> };

/** Three ways to make light and place look real, cut together: traced (caustics from the water's shape), baked (path-traced light in
 * the walls) and captured (a real place reconstructed from photographs). */
const PLACES: ReadonlyArray<{ frames: number; render: (f: number) => ReactNode }> = [
  { frames: 170, render: f => <LightThroughIt frame={f} fps={fps} spec={{ ...POOL, title: { text: "Traced", sub: "Light focused by the water's real shape", enter: 96 } }} tone="dark-on-light" /> },
  { frames: 180, render: f => <RealLightFlythrough frame={f} fps={fps} src={canyon} path={canyonPath.path as [number, number, number][]} details={CANYON_DETAILS} spec={{ ...CANYON, title: { text: "Baked", sub: "Every bounce path-traced, stored in the walls", enter: 70 } }} /> },
  { frames: 240, render: f => <CapturedPlace frame={f} fps={fps} src={capture} spec={{ ...PLACE, title: { text: "Captured", sub: "A real place, rebuilt from photographs", enter: 96 } }} /> },
];
const PLACES_TOTAL = PLACES.reduce((n, shot) => n + shot.frames, 0);
function placesFrame(frame: number) {
  let start = 0;
  for (const [i, shot] of PLACES.entries()) { if (frame < start + shot.frames || i === PLACES.length - 1) return <div key={i} style={{ position: "absolute", inset: 0 }}>{shot.render(Math.min(shot.frames - 1, frame - start))}</div>; start += shot.frames; }
  return null;
}
export const PlacesReel: Story = { args: { frame: 0, fps, spec: POOL }, render: () => <ParticlePlayer title={`Traced, baked, captured: three ways to real light (${(PLACES_TOTAL / fps.num).toFixed(0)} s)`} cues={[{ frame: 36, sound: "drop-water-full", gainDb: -4 }, { frame: 170, sound: "bed-cave-air", gainDb: -16 }]} durationFrames={PLACES_TOTAL} posterFrame={260}
  good={{ label: "Light Through It, Real-Light Flythrough and Captured Place, cut together. Each shot keeps its own recipe and rules.", render: placesFrame }} /> };
