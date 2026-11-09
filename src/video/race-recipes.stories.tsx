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

/** Camera cars that keep pace with the car: it holds its place in frame while the track streams past, smeared by the shutter. */
const FOLLOW: Record<string, TrackPassSpec> = {
  alongside: { durationFrames: 120, speed: 58, passFrame: 60, camera: { mode: "follow", along: .4, side: 6, height: .8, fov: 34 } },
  chase: { durationFrames: 120, speed: 58, passFrame: 60, camera: { mode: "follow", along: -10, side: 1.2, height: 1.4, fov: 28, lead: -1 } },
  lead: { durationFrames: 120, speed: 58, passFrame: 60, camera: { mode: "follow", along: 11, side: 1.6, height: 1.1, fov: 28, lead: 1 } },
};
const VIEW_ARG = { view: { control: "inline-radio" as const, options: Object.keys(FOLLOW) } };
export const TrackFollow: StoryObj<{ car: string; view: string }> = {
  args: { ...CAR_ARG.args, view: "alongside" }, argTypes: { ...CAR_ARG.argTypes, ...VIEW_ARG },
  render: ({ car: name, view }) => { const car = RACE_CARS[name] ?? RACE_CARS["concept-car"], spec = FOLLOW[view] ?? FOLLOW.alongside; return <ParticlePlayer title="Track Follow: a camera car keeps pace with the car" cues={[]} durationFrames={spec.durationFrames} posterFrame={30}
    good={{ label: "The camera travels at the car's 58 m/s, so the car holds still in frame and the track streams past, smeared by a 180° shutter (six moments averaged per frame); the camera car vibrates a little.", render: f => <TrackPass frame={f} fps={fps} spec={spec} car={car} track={RACE_TRACK} /> }}
    notes={<p>{inspectTrackPass(spec).map(p => `${p.severity}: ${p.message}`).join(" ") || "No problems."}</p>} />; },
};
/** The three camera cars, two frames each, for review. */
export const TrackFollowFrames: StoryObj<{ car: string }> = {
  ...CAR_ARG,
  render: ({ car: name }) => { const car = RACE_CARS[name] ?? RACE_CARS["concept-car"]; return <div data-km-race-frames="" style={{ display: "grid", gridTemplateColumns: "repeat(3, 560px)", gap: 8, padding: 8, background: "#05070a" }}>
    {Object.entries(FOLLOW).flatMap(([view, spec]) => [30, 31].map(f => [view, spec, f] as const)).filter((_, i) => i % 2 === 0).concat(Object.entries(FOLLOW).map(([view, spec]) => [view + " · no blur", { ...spec, shutter: { samples: 1 } }, 30] as const))
      .map(([view, spec, f]) => <figure key={view} style={{ margin: 0 }}>
        <div style={{ width: 560, height: 315 }}><TrackPass frame={f} fps={fps} spec={spec} car={car} track={RACE_TRACK} /></div>
        <figcaption style={{ color: "#c9ced6", font: "600 12px system-ui", padding: "4px 2px" }}>{view} · frame {f}</figcaption></figure>)}
  </div>; },
};

