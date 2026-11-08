import type { Meta, StoryObj } from "@storybook/react-vite";
import { LightThroughIt } from "../../registry/visual/light-recipes-react";
import { inspectLightShot } from "../../registry/visual/light-shots";
import type { LightThroughSpec } from "../../registry/visual/light-shots";
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
