import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { createSmartphone } from "../../registry/domains/technology-3d";
import { ShadowReveal } from "../../registry/visual/shadow-reveal-react";
import { ChainReaction } from "../../registry/visual/chain-reaction-react";
import { PhysicalData } from "../../registry/visual/physical-data-react";
import { TabletopStory } from "../../registry/visual/tabletop-story-react";
import { ScaleJourney } from "../../registry/visual/scale-journey-react";
import { InsideOut } from "../../registry/visual/inside-out-react";
import { DioramaJourney } from "../../registry/visual/diorama-journey-react";
import { inspectChainReaction, inspectDioramaJourney, inspectInsideOut, inspectPhysicalData, inspectScaleJourney, inspectShadowReveal, inspectTabletopStory } from "../../registry/visual/story-3d-shots";
import type { ChainReactionSpec, DioramaJourneySpec, InsideOutSpec, PhysicalDataSpec, ScaleJourneySpec, ShadowRevealSpec, Story3dProblem, TabletopStorySpec } from "../../registry/visual/story-3d-shots";
import type { PhysicsScene } from "../../registry/visual/physics-shots";
import type { BakedPhysicalActionSpec } from "../../registry/motion/baked-physical-motion";
import amplifier4 from "../../assets/physics/domino-amplifier-4.json";
import walnut from "../../assets/textures/wood/black_walnut_veneer_02_diff.jpg?url";
import walnutNormal from "../../assets/textures/wood/black_walnut_veneer_02_nor_gl.jpg?url";
import { ParticlePlayer, fps } from "./particle-story-player";

const SHADOW: ShadowRevealSpec = { durationFrames: 240, silhouette: "house", revealStart: 70, revealEnd: 165,
  question: { text: "What builds a home?", enter: 10 }, answer: { text: "A thousand small savings", enter: 168 } };
const CHAIN: ChainReactionSpec = { durationFrames: 440, links: ["Rates rise a little", "Loans cost more", "Fewer homes sell", "Builders slow down"], pushFrame: 265,
  title: { text: "Small causes, large effects", enter: 375 } };
const chainBake = amplifier4 as unknown as { scene: PhysicsScene; action: BakedPhysicalActionSpec };
const DATA: PhysicalDataSpec = { durationFrames: 220, series: [{ label: "Spent", value: 18000 }, { label: "Saved", value: 32000, highlight: true }, { label: "Invested", value: 12000 }],
  unitValue: 1000, format: { prefix: "$" }, dropStart: 20, title: { text: "Saving outgrew spending", enter: 135 } };
const TABLE: TabletopStorySpec = { durationFrames: 350,
  objects: [{ id: "bill", kind: "invoice", label: "The bill" }, { id: "cash", kind: "cash-stack", label: "Paid Monday" }, { id: "fee", kind: "coins", label: "Late fee" },
    { id: "card", kind: "credit-card", label: "Card" }, { id: "phone", kind: "smartphone", label: "Receipt" }],
  beats: [{ id: "all", startFrame: 0, layout: "row", objects: ["bill", "cash", "card", "phone"], caption: "Everything on the table" },
    { id: "pair", startFrame: 100, layout: "pair", objects: ["bill", "phone"], caption: "The bill and the receipt" },
    { id: "stack", startFrame: 190, layout: "stack", objects: ["cash", "fee"], caption: "Payment plus the fee" },
    { id: "focus", startFrame: 270, layout: "focus", focus: "bill", objects: ["bill", "cash", "fee"], caption: "They match the bill" }] };
const SCALE: ScaleJourneySpec = { durationFrames: 490, stops: [{ id: "coin", kind: "coin", caption: "A coin" }, { id: "phone", kind: "smartphone", caption: "A phone" },
  { id: "rack", kind: "server-rack", caption: "A server rack, about as tall as a person" }, { id: "bank", kind: "bank", caption: "A bank" }], title: { text: "Five hundred times the coin", enter: 405 } };
const INSIDE: InsideOutSpec = { durationFrames: 240, cutStart: 24, cutEnd: 84,
  labels: [{ part: "phone-camera-modules", text: "Camera modules" }, { part: "phone-logic-board", text: "Logic board" }, { part: "phone-charging-coil", text: "Charging coil" }, { part: "phone-battery", text: "Battery" }],
  title: { text: "A tap starts here", enter: 150 } };
const DIORAMA: DioramaJourneySpec = { durationFrames: 560, stations: [{ id: "tap", kind: "smartphone", caption: "You tap to pay" }, { id: "bank", kind: "bank", caption: "Your bank checks the funds" },
  { id: "network", kind: "server-rack", caption: "The network settles it" }, { id: "shop", kind: "money-bag", caption: "The shop is paid" }], title: { text: "Four stops in two seconds", enter: 478 } };
const phone = () => createSmartphone({ id: "phone" });

function Check({ name, problems }: { name: string; problems: readonly Story3dProblem[] }): ReactNode {
  return <p style={{ margin: 0 }}><strong>Craft check (`{name}`):</strong> {problems.length ? problems.map(p => `${p.severity}: ${p.message}`).join(" ") : "no problems."}</p>;
}

const meta = { title: "Video production/Story Scenes 3D", id: "video-story-scenes-3d", component: ShadowReveal, parameters: { layout: "fullscreen" } } satisfies Meta<typeof ShadowReveal>;
export default meta;
type Story = StoryObj<typeof meta>;
const args = { frame: 0, fps, spec: SHADOW };

export const ShadowRevealStory: Story = { name: "Shadow Reveal", args, render: () => <ParticlePlayer title="Shadow Reveal: a question asked with a shadow" cues={[]} durationFrames={SHADOW.durationFrames} posterFrame={210}
  good={{ label: "Each coin hangs on the ray from the light to one cell of the house; seen from the wall only the shadow reads, and near the light's viewpoint the scattered coins line up into it.", render: f => <ShadowReveal frame={f} fps={fps} spec={SHADOW} /> }}
  notes={<Check name="inspectShadowReveal" problems={inspectShadowReveal(SHADOW, fps.num)} />} /> };
export const ChainReactionStory: Story = { name: "Chain Reaction", args, render: () => <ParticlePlayer title="Chain Reaction: cause and effect on growing dominoes" cues={[]} durationFrames={CHAIN.durationFrames} posterFrame={140}
  good={{ label: "Each domino is 1.35 times the last and carries one link. The camera reads them from cause to effect, steps back, and the baked fall grows down the line at 0.55 speed.", render: f => <ChainReaction frame={f} fps={fps} spec={CHAIN} bake={chainBake} studio={{ look: "softbox" }} /> }}
  notes={<Check name="inspectChainReaction" problems={inspectChainReaction(CHAIN, 57, fps.num)} />} /> };
export const PhysicalDataStory: Story = { name: "Physical Data", args, render: () => <ParticlePlayer title="Physical Data: values as stacks of real coins" cues={[]} durationFrames={DATA.durationFrames} posterFrame={200}
  good={{ label: "One proof coin per 1,000; pieces drop in and settle, numbers count up as columns grow, and the value the scene is about is gold among silver.", render: f => <PhysicalData frame={f} fps={fps} spec={DATA} studio={{ look: "softbox" }} /> }}
  notes={<Check name="inspectPhysicalData" problems={inspectPhysicalData(DATA, fps.num)} />} /> };
export const TabletopStoryStory: Story = { name: "Tabletop Story", args, render: () => <ParticlePlayer title="Tabletop Story: object-story with real objects" cues={[]} durationFrames={TABLE.durationFrames} posterFrame={320}
  good={{ label: "Catalog objects at real size on photographed walnut, arranged as a row, a pair, a stack and a focus; each is lifted and set down between beats.", render: f => <TabletopStory frame={f} fps={fps} spec={TABLE} studio={{ look: "softbox" }} surfaceMaps={{ map: walnut, normal: walnutNormal, tileMetres: .6 }} /> }}
  notes={<Check name="inspectTabletopStory" problems={inspectTabletopStory(TABLE, fps.num)} />} /> };
export const ScaleJourneyStory: Story = { name: "Scale Journey", args, render: () => <ParticlePlayer title="Scale Journey: how big things are, felt" cues={[]} durationFrames={SCALE.durationFrames} posterFrame={300}
  good={{ label: "A coin to a bank in a log-space camera move; each stop shows its real size and its ratio to the last, and a 1.75 m scale figure keeps a human size in frame.", render: f => <ScaleJourney frame={f} fps={fps} spec={SCALE} studio={{ look: "softbox" }} /> }}
  notes={<Check name="inspectScaleJourney" problems={inspectScaleJourney(SCALE, fps.num)} />} /> };
export const InsideOutStory: Story = { name: "Inside Out", args, render: () => <ParticlePlayer title="Inside Out: the cover comes away" cues={[]} durationFrames={INSIDE.durationFrames} posterFrame={200}
  good={{ label: "A cut sweeps across the back with a line of light; the back glass goes where it has passed, showing the board, coil, battery and camera modules, named one at a time.", render: f => <InsideOut frame={f} fps={fps} spec={INSIDE} create={phone} studio={{ look: "softbox" }} /> }}
  notes={<Check name="inspectInsideOut" problems={inspectInsideOut(INSIDE, fps.num)} />} /> };
export const DioramaJourneyStory: Story = { name: "Diorama Journey", args, render: () => <ParticlePlayer title="Diorama Journey: a story as a trip across a miniature world" cues={[]} durationFrames={DIORAMA.durationFrames} posterFrame={140}
  good={{ label: "A glowing orb follows the path past four landmarks on stone plazas and rests at each while its caption reads; a long lens and a tilt-shift blur make it read as a model.", render: f => <DioramaJourney frame={f} fps={fps} spec={DIORAMA} studio={{ look: "softbox" }} /> }}
  notes={<Check name="inspectDioramaJourney" problems={inspectDioramaJourney(DIORAMA, fps.num)} />} /> };
