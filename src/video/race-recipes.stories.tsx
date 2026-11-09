import type { Meta, StoryObj } from "@storybook/react-vite";
import { TrackPass } from "../../registry/visual/race-recipes-react";
import { inspectTrackPass } from "../../registry/visual/race-shots";
import type { TrackPassSpec } from "../../registry/visual/race-shots";
import { RACE_CARS, RACE_TRACK } from "./race-assets";
import { ParticlePlayer, fps } from "./particle-story-player";

const PASS: TrackPassSpec = { durationFrames: 120, speed: 58, passFrame: 60 };

const meta: Meta = { title: "Video/Race Recipes", parameters: { layout: "fullscreen" } };
export default meta;

/** A car at about 210 km/h passes a low trackside camera on a long lens; the camera pans with it. */
const CAR_ARG = { args: { car: "concept-car" }, argTypes: { car: { control: "select" as const, options: Object.keys(RACE_CARS), description: "Cars from local-assets/vehicles are yours, for local renders only." } } };
export const TrackPassStory: StoryObj<{ car: string }> = {
  name: "Track Pass", ...CAR_ARG,
  render: ({ car: name }) => { const car = RACE_CARS[name] ?? RACE_CARS["concept-car"]; return <ParticlePlayer title="Track Pass: a car at speed passes a trackside camera" cues={[]} durationFrames={PASS.durationFrames} posterFrame={60}
    good={{ label: "58 m/s past a camera 8 m from the car's line on a 26° lens; the wheels turn with the distance travelled.", render: f => <TrackPass frame={f} fps={fps} spec={PASS} car={car} track={RACE_TRACK} /> }}
    notes={<p>{inspectTrackPass(PASS).map(p => `${p.severity}: ${p.message}`).join(" ") || "No problems."}</p>} />; },
};
/** Frames through a pass, for review. */
export const TrackPassFrames: StoryObj<{ car: string }> = {
  ...CAR_ARG,
  render: ({ car: name }) => { const car = RACE_CARS[name] ?? RACE_CARS["concept-car"]; return <div data-km-race-frames="" style={{ display: "grid", gridTemplateColumns: "repeat(3, 560px)", gap: 8, padding: 8, background: "#05070a" }}>
    {[[45, 1], [58, 1], [60, 1], [58, .1], [60, .1], [64, 1]].map(([f, rate]) => <figure key={`${f}-${rate}`} style={{ margin: 0 }}>
      <div style={{ width: 560, height: 315 }}><TrackPass frame={f} fps={fps} spec={PASS} car={car} track={RACE_TRACK} rate={rate} /></div>
      <figcaption style={{ color: "#c9ced6", font: "600 12px system-ui", padding: "4px 2px" }}>frame {f} · playing at {rate}×</figcaption></figure>)}
  </div>; },
};
