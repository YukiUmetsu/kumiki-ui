import type { Meta, StoryObj } from "@storybook/react-vite";
import { createLaptop, createSmartphone } from "../../registry/domains/technology-3d";
import { ExplodedView, FinishCompare, PartSpotlight, ProductHeroTurn, TwoAngleProof } from "../../registry/visual/studio-recipes-react";
import { inspectStudioShot } from "../../registry/visual/studio-shots";
import type { CompareSpec, ExplodeSpec, HeroTurnSpec, PartSpotlightSpec, StudioShotKind } from "../../registry/visual/studio-shots";
import { ParticlePlayer, fps } from "./particle-story-player";

const phone = () => createSmartphone({ id: "phone" });

const HERO_TURN: HeroTurnSpec = {
  durationFrames: 210, yawFrom: -80, yawTo: -32, pitch: 8, settleFrame: 72, offsetX: .24, fillFrom: .76, fillTo: .84,
  claim: { text: "Built to be held", sub: "Machined aluminium, glass on both sides", enter: 80 },
};
const SPOTLIGHT: PartSpotlightSpec = {
  durationFrames: 180, part: "phone-lens-stack", pushStart: 16, pushEnd: 70, dim: .55,
  wide: { yaw: 205, pitch: 10, fill: .8 }, close: { yaw: 148, pitch: 6, fill: .3, offsetX: .3 },
  label: { text: "Three lenses", sub: "Wide, ultra-wide and telephoto", enter: 82 },
};
const EXPLODE: ExplodeSpec = {
  durationFrames: 190, explodeStart: 14, explodeEnd: 58, stagger: 3, reassembleStart: 140, reassembleEnd: 170,
  parts: [["phone-front-glass", "phone-camera-island"], ["phone-display", "phone-notification"], "phone-machined-frame", "phone-back-glass", ["phone-camera-plateau", "phone-flash"], "phone-lens-stack", "phone-side-button", "phone-volume-button", "phone-port"],
  view: { yaw: -66, pitch: 16, fill: 1.05, offsetX: .12 }, orbit: 18, title: { text: "How it is built", enter: 76, exit: 136 },
};
const FINISHES: CompareSpec = {
  durationFrames: 150, view: { yaw: 158, pitch: 8, fill: .8 }, orbit: 20,
  panes: [{ label: "Slate" }, { label: "Sand" }],
};
const ANGLES: CompareSpec = {
  durationFrames: 150, view: { yaw: 0, pitch: 12, fill: .86 }, orbit: 0,
  panes: [{ label: "Front", view: { yaw: 18, pitch: 16 } }, { label: "Side", view: { yaw: 92, pitch: 4 } }],
};

function Problems({ kind, spec }: { kind: StudioShotKind; spec: Parameters<typeof inspectStudioShot>[1] }) {
  const problems = inspectStudioShot(kind, spec, fps.num);
  return <p style={{ margin: 0 }}><strong>Craft check (`inspectStudioShot`):</strong> {problems.length ? problems.map(p => `${p.severity}: ${p.message}`).join(" ") : "no problems."}</p>;
}

const meta = { title: "Video production/Studio Recipes", id: "video-studio-recipes", component: ProductHeroTurn, parameters: { layout: "fullscreen" } } satisfies Meta<typeof ProductHeroTurn>;
export default meta;
type Story = StoryObj<typeof meta>;
const args = { frame: 0, fps, create: phone, spec: HERO_TURN };

export const ProductHeroTurnStory: Story = { name: "Product Hero Turn", args, render: () => <ParticlePlayer title="Product Hero Turn: land on the best angle, hold, then say one thing" cues={[]} durationFrames={HERO_TURN.durationFrames} posterFrame={110}
  good={{ label: "A 48° turn that decelerates onto the three-quarter view, a 2.6 s hold with 1.5° of drift, the claim after the camera lands. Strip lighting draws highlight lines down the frame.", render: f => <ProductHeroTurn frame={f} fps={fps} create={phone} spec={HERO_TURN} studio={{ look: "strip" }} /> }}
  notes={<Problems kind="hero-turn" spec={HERO_TURN} />} /> };
export const PartSpotlightStory: Story = { name: "Part Spotlight", args, render: () => <ParticlePlayer title="Part Spotlight: push in, light one part, dim the rest, name it" cues={[]} durationFrames={SPOTLIGHT.durationFrames} posterFrame={120}
  good={{ label: "The camera arcs from the whole back to the lens plateau, the outline arrives as the camera does, and the label sits in the empty third with a leader line.", render: f => <PartSpotlight frame={f} fps={fps} create={phone} spec={SPOTLIGHT} studio={{ look: "softbox", palette: "midnight" }} /> }}
  notes={<Problems kind="part-spotlight" spec={SPOTLIGHT} />} /> };
export const ExplodedViewStory: Story = { name: "Exploded View", args, render: () => <ParticlePlayer title="Exploded View: every part moves along the axis it sits on" cues={[]} durationFrames={EXPLODE.durationFrames} posterFrame={100}
  good={{ label: "Glass, display and back separate along the depth axis, buttons sideways, outermost first; the camera pulls back so nothing leaves the frame, then everything nests back.", render: f => <ExplodedView frame={f} fps={fps} create={phone} spec={EXPLODE} studio={{ look: "softbox" }} /> }}
  notes={<Problems kind="exploded-view" spec={EXPLODE} />} /> };
export const FinishCompareStory: Story = { name: "Finish Compare", args, render: () => <ParticlePlayer title="Finish Compare: same light, same camera, two finishes" cues={[]} durationFrames={FINISHES.durationFrames} posterFrame={90}
  good={{ label: "Both panes share one studio and one camera move, so the only difference is the finish.", render: f => <FinishCompare frame={f} fps={fps} spec={FINISHES} studio={{ look: "strip" }}
    variants={[{ create: () => createSmartphone({ id: "phone-slate", back: "#3d4a5c" }) }, { create: () => createSmartphone({ id: "phone-sand", back: "#c8b49a", frame: "#cfc3b2" }) }]} /> }}
  notes={<Problems kind="compare" spec={FINISHES} />} /> };
export const TwoAngleProofStory: Story = { name: "Two Angle Proof", args, render: () => <ParticlePlayer title="Two-Angle Proof: one moment, two cameras" cues={[]} durationFrames={ANGLES.durationFrames} posterFrame={70}
  good={{ label: "The lid opens once, seen from the front and the side at the same time, so the hinge's travel reads in depth.", render: f => <TwoAngleProof frame={f} fps={fps} create={() => createLaptop({ id: "laptop" })} spec={ANGLES} action={{ id: "open", startFrame: 20 }} studio={{ look: "softbox" }} /> }}
  notes={<Problems kind="compare" spec={ANGLES} />} /> };
