import type { Meta, StoryObj } from "@storybook/react-vite";
import { LightThroughIt } from "../../registry/visual/light-recipes-react";
import { inspectLightShot } from "../../registry/visual/light-shots";
import type { LightThroughSpec } from "../../registry/visual/light-shots";
import { RealLightFlythrough, inspectFlythrough } from "../../registry/visual/baked-recipes-react";
import type { FlythroughSpec } from "../../registry/visual/baked-recipes-react";
import canyon from "../../assets/baked/slot-canyon.glb?url";
import canyonPath from "../../assets/baked/slot-canyon.path.json";
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

const CANYON: FlythroughSpec = { durationFrames: 240, travel: [.03, .55], lookUp: [3, 16], title: { text: "Light that bounced its way down", sub: "Lit once by a path tracer, then baked into the walls", enter: 120 } };
export const RealLightFlythroughStory: Story = { name: "Real-Light Flythrough", args: { frame: 0, fps, spec: POOL }, render: () => <ParticlePlayer title="Real-Light Flythrough: path-traced light, baked, flown through" cues={[{ frame: 0, sound: "bed-cave-air", gainDb: -16 }]} durationFrames={CANYON.durationFrames} posterFrame={150}
  good={{ label: "A sandstone slot canyon lit by a high sun and a blue sky, with every bounce path-traced in Blender Cycles and baked into the walls; the camera moves forward from the first frame and lifts its eye toward the light.", render: f => <RealLightFlythrough frame={f} fps={fps} src={canyon} path={canyonPath.path as [number, number, number][]} spec={CANYON} /> }}
  notes={<p style={{ margin: 0 }}><strong>Craft check (`inspectFlythrough`):</strong> {inspectFlythrough(CANYON, fps.num).map(p => p.message).join(" ") || "no problems."}</p>} /> };
