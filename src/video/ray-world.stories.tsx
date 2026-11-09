import { useEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { RayWorldStage } from "../../registry/video/ray-world-react";
import { RAY_WORLD_TEXTURES } from "../film/ray-world-textures";
import type { RayWorld } from "../../registry/video/ray-world";
import { waterDropWorld } from "../../registry/video/ray-world-water-drop";
import { terracedReliefWorld } from "../../registry/video/ray-world-terraced-relief";
import { riverFlightWorld } from "../../registry/video/ray-world-river-flight";
import seljalandsfoss from "../../examples/film/assets/iceland/seljalandsfoss.jpg?url";
import dynjandi from "../../examples/film/assets/iceland/dynjandi.jpg?url";
import jokulsarlon from "../../examples/film/assets/iceland/jokulsarlon.jpg?url";
import rockColour from "../../examples/film/assets/pbr/dark_rock_diff.jpg?url";
import rockNormal from "../../examples/film/assets/pbr/dark_rock_nor_gl.jpg?url";
import rockHeight from "../../examples/film/assets/pbr/dark_rock_disp.jpg?url";
import iceCave from "../../examples/film/assets/iceland/ice-cave.jpg?url";

const fps = { num: 30, den: 1 };
const places = [["seljalandsfoss", seljalandsfoss, "A waterfall over a green cliff at sunset"], ["dynjandi", dynjandi, "A wide stepped waterfall under cloud"], ["jokulsarlon", jokulsarlon, "A still lagoon with ice, and a ripple"]]
  .map(([id, src, alt]) => ({ id, src, alt, licenseRef: `commons-${id}-cc0`, width: 1800, height: 1200 }));

function Lab({ world, start, images = [] }: { world: RayWorld; start: number; images?: typeof places }) {
  const last = Math.floor(world.durationSeconds * 30) - 1;
  const [frame, setFrame] = useState(start), [playing, setPlaying] = useState(false), clock = useRef({ from: 0, at: 0 });
  useEffect(() => {
    if (!playing) return;
    let id = 0;
    clock.current = { from: performance.now(), at: frame };
    const step = (now: number) => {
      setFrame(Math.min(last, clock.current.at + Math.round((now - clock.current.from) * .03)));
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  // Playback restarts from the frame the button was pressed on.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, last]);
  useEffect(() => { if (frame >= last) setPlaying(false); }, [frame, last]);
  return <div style={{ padding: 16, display: "grid", gap: 12, maxWidth: 960, font: "16px/1.45 system-ui, sans-serif" }}>
    <RayWorldStage world={world} frame={frame} fps={fps} images={images} textures={RAY_WORLD_TEXTURES[world.id]} samples={Math.min(world.samples, 8)} style={{ borderRadius: 12 }} />
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <button type="button" onClick={() => setPlaying(value => !value)} style={{ font: "inherit", minHeight: 44, minWidth: 88 }}>{playing ? "Pause" : "Play"}</button>
      <label style={{ display: "flex", gap: 12, alignItems: "center", flex: 1 }}>Frame {frame}
        <input type="range" min={0} max={last} value={frame} onChange={event => { setPlaying(false); setFrame(Number(event.target.value)); }} style={{ flex: 1 }} /></label>
    </div>
  </div>;
}
const meta = { title: "Video production/Ray Worlds", id: "video-ray-worlds", component: Lab, tags: ["showcase"] } satisfies Meta<typeof Lab>;
export default meta;
type Story = StoryObj<typeof meta>;
const rock = [["rock-colour", rockColour, "Scanned dark rock, colour"], ["rock-normal", rockNormal, "Scanned dark rock, normals"], ["rock-height", rockHeight, "Scanned dark rock, height"]]
  .map(([id, src, alt]) => ({ id, src, alt, licenseRef: "polyhaven-dark-rock-cc0", width: 2048, height: 2048 }));
const ice = { id: "ice-cave", src: iceCave, alt: "Scalloped blue ice inside a glacier cave, with daylight breaking through", licenseRef: "commons-ice-cave-cc0-example", width: 1800, height: 1200 };
export const WaterDrop: Story = { args: { world: waterDropWorld, start: 90, images: [...places, ...rock, ice] } };
export const TerracedRelief: Story = { args: { world: terracedReliefWorld, start: 378 } };
export const RiverFlight: Story = { args: { world: riverFlightWorld, start: 540, images: places.slice(0, 1) } };
