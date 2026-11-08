import { useLayoutEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Mesh } from "three";
import { FiberStage, useStageFrame } from "../../registry/visual/fiber-stage";
import { AssembleIntoMark, EmbersRising, FirefliesAtDusk, LensBokeh, MotesInTheLight, ParticleFlow, ParticleShot, SparksOnImpact } from "../../registry/visual/particle-moments-react";
import { embersRising, firefliesAtDusk, lensBokeh, motesInTheLight, sparksOnImpact } from "../../registry/visual/particle-moments";
import type { ParticleMomentPlan } from "../../registry/visual/particle-moments";
import { PARTICLE_GUIDE } from "../../registry/visual/particle-guide";
import { ShaderFxLayer } from "../../registry/video/shader-fx-react";
import { GrainFinish } from "../../registry/video/shader-fx-moments-react";
import { DURATION, ParticlePlayer, fps } from "./particle-story-player";
import lagoon from "../../examples/film/assets/iceland/jokulsarlon.jpg?url";
import mark from "../../examples/film/assets/water-mark.svg?url";

/** Each particle kind in the job film work gives it, beside its most common misuse. The rules come from PARTICLE_GUIDE. */
const FILL: CSSProperties = { position: "absolute", inset: 0 };
const out = (t: number) => 1 - (1 - t) ** 3, ramp = (a: number, b: number, f: number) => Math.min(1, Math.max(0, (f - a) / (b - a)));
const Title = ({ text, frame, at, style }: { text: string; frame: number; at: number; style?: CSSProperties }) =>
  <span style={{ position: "absolute", left: "7%", bottom: "9%", color: "#f3ece2", font: "600 clamp(14px, 6cqh, 34px)/1.2 var(--km-font-body, system-ui)", opacity: out(ramp(at, at + 24, frame)), textShadow: "0 1px 18px rgba(0,0,0,.6)", ...style }}>{text}</span>;
const centred: CSSProperties = { left: 0, right: 0, bottom: "46%", textAlign: "center", letterSpacing: ".18em" };
const warmRoom = <div style={{ ...FILL, background: "radial-gradient(ellipse at 20% 10%, #2a2018 0%, #0b0908 65%)" }} />;
const shaft = (frame: number) => <ShaderFxLayer frame={frame} fps={fps} hostDurationFrames={DURATION} style={FILL} spec={{ id: "shaft", effect: "god-rays", layer: "background", job: "reveal", treatment: "standard", rate: .2, fadeFrames: 0,
  params: { colors: ["#ffdcb066", "#ffc89044"], back: "#00000000", bloomColor: "#ffdcb0", density: .16, spotty: .7, bloom: .3, midSize: .08, midIntensity: .2, intensity: .6, originX: -1.65, originY: -.95 } }} />;
const photo = (filter?: string) => <img src={lagoon} alt="" style={{ ...FILL, width: "100%", height: "100%", objectFit: "cover", filter }} />;
const dusk = <>{photo("brightness(.38) saturate(.8)")}<div style={{ ...FILL, background: "linear-gradient(rgba(8,16,40,.45), rgba(4,8,20,.65))" }} /></>;
const floor = <div style={{ ...FILL, background: "linear-gradient(#0c1116, #121820 72%, #1a2028 72.4%, #0e1318)" }} />;
const shot = (plan: ParticleMomentPlan, frame: number, backdrop?: ReactNode, children?: ReactNode) => <ParticleShot plan={plan} frame={frame} fps={fps} backdrop={backdrop}>{children}</ParticleShot>;

// The common mistakes, as plans, so each runs on the same renderer as the professional version.
const MISTAKES: Readonly<Record<string, ParticleMomentPlan>> = {
  motes: { cues: [], specs: [{ frames: { fadeIn: 0 }, id: "soup", kind: "motes", region: { min: [-3.4, -2, -1.2], max: [3.4, 2, 1.2] }, budget: 3200, intensity: 1, color: "#fff0d6", seed: 3, scale: 2.4 }] },
  embers: { cues: [], specs: [{ frames: { fadeIn: 0 }, id: "falling", kind: "snow", region: { min: [-3.4, -2.3, -1.5], max: [3.4, 2.3, 1.5] }, budget: 900, intensity: 1, color: "#ff7a1a", seed: 5, scale: .7 }] },
  sparks: { cues: [], specs: [{ id: "glitter", kind: "sparks", burst: { frame: 0, origin: [0, -.4, 0], direction: [0, 1, 0], spread: 2.4, speed: .02, gravity: 0, life: 400 }, budget: 180, intensity: 1, seed: 8 }] },
  bokeh: { cues: [], specs: [{ frames: { fadeIn: 0 }, id: "sharp", kind: "bokeh", region: { min: [-2.6, -1.4, -.5], max: [2.6, 1.4, .5] }, budget: 140, intensity: 1, color: "#ffffff", seed: 11, scale: .35 }] },
  fireflies: { cues: [], specs: [{ frames: { fadeIn: 0 }, id: "swarm", kind: "fireflies", region: { min: [-3.2, -1.9, -1], max: [3.2, 1.9, 1.6] }, budget: 400, intensity: 1, color: "#e6ff8a", life: 30, seed: 14, scale: 12 }] },
  assemble: { cues: [], specs: [{ frames: { fadeIn: 0 }, id: "thin", kind: "assemble", region: { min: [-4, -2.4, -2], max: [4, 2.4, 2] }, intensity: 1, color: "#dff3ff", seed: 21, scale: 2.2,
    assemble: { targets: Array.from({ length: 120 }, (_, i) => { const a = i / 120 * Math.PI * 2; return [Math.cos(a) * .7, Math.sin(a) * .9 - .1, 0] as [number, number, number]; }), startFrame: 30, endFrame: 45, stagger: 0 } }] },
  flow: { cues: [], specs: [{ frames: { fadeIn: 0 }, id: "swarm", kind: "flow", flow: { path: [[-2.4, 0, 0], [0, .55, 0], [2.4, 0, 0]], speed: .02, spread: 1.4 }, budget: 900, intensity: 1, color: "#9fe3ff", seed: 31, scale: 2.4 }] },
};

const Motes = () => <ParticlePlayer title="Motes: dust that only shows in the light" cues={motesInTheLight().cues} guide={PARTICLE_GUIDE.motes}
  good={{ label: "countable specks inside a hard shaft, dark air around it, a slow camera", render: f => <MotesInTheLight frame={f} fps={fps} backdrop={<>{warmRoom}{shaft(f)}</>}><GrainFinish frame={f} amount={.05} /><Title text="Light finds the dust" frame={f} at={60} /></MotesInTheLight> }}
  bad={{ label: "three thousand specks spread evenly: soup in a room, no beam to explain them", render: f => shot(MISTAKES.motes, f, warmRoom, <Title text="Light finds the dust" frame={f} at={60} />) }} />;
const Embers = () => <ParticlePlayer title="Embers: heat rising out of frame" cues={embersRising().cues} guide={PARTICLE_GUIDE.embers}
  good={{ label: "embers rise, shrink and cool from white-hot to red, with a few soft ones near the lens", render: f => <EmbersRising frame={f} fps={fps} backdrop={<div style={{ ...FILL, background: "radial-gradient(ellipse at 50% 120%, #3a1a0c 0%, #0b0706 62%)" }} />}><GrainFinish frame={f} amount={.07} /><Title text="CHAPTER ONE" frame={f} at={60} style={centred} /></EmbersRising> }}
  bad={{ label: "orange dots of one size falling like snow: no heat, no cooling", render: f => shot(MISTAKES.embers, f, <div style={{ ...FILL, background: "#120804" }} />, <Title text="CHAPTER ONE" frame={f} at={60} style={centred} />) }} />;
const Sparks = () => <ParticlePlayer title="Sparks: one impact, on its frame" posterFrame={36} cues={sparksOnImpact().cues} guide={PARTICLE_GUIDE.sparks}
  good={{ label: "one burst on the hit's frame, a flash, an arc down, one bounce, gone in about a second", render: f => <SparksOnImpact frame={f} fps={fps} backdrop={floor} /> }}
  bad={{ label: "slow glitter that floats for the whole shot and marks no moment", render: f => shot(MISTAKES.sparks, f, floor) }} />;
const Bokeh = () => <ParticlePlayer title="Bokeh: depth in front of the subject" cues={lensBokeh().cues} guide={PARTICLE_GUIDE.bokeh}
  good={{ label: "a few large, faint discs near the lens, warm and cool, sliding past with the camera", render: f => <LensBokeh frame={f} fps={fps} backdrop={photo()}><Title text="Dusk on the lagoon" frame={f} at={40} /></LensBokeh> }}
  bad={{ label: "a hundred small, bright discs scattered over the whole picture", render: f => shot(MISTAKES.bokeh, f, photo(), <Title text="Dusk on the lagoon" frame={f} at={40} />) }} />;
const Fireflies = () => <ParticlePlayer title="Fireflies: life at dusk" cues={firefliesAtDusk().cues} guide={PARTICLE_GUIDE.fireflies}
  good={{ label: "about thirty, low in the frame, each blinking on its own slow clock", render: f => <FirefliesAtDusk frame={f} fps={fps} backdrop={dusk} /> }}
  bad={{ label: "a swarm of four hundred blinking fast: a screensaver, not a night", render: f => shot(MISTAKES.fireflies, f, dusk) }} />;
const Assemble = () => <ParticlePlayer title="Assemble: many become one" posterFrame={120} cues={[{ frame: 82, sound: "sting-airy-short", gainDb: -6 }]} guide={PARTICLE_GUIDE.assemble}
  good={{ label: "1,400 particles drift together over nearly three seconds, the mark holds, then the name lands", render: f => <AssembleIntoMark mark={mark} name="SAMPLE STUDIO" frame={f} fps={fps} backdrop={<div style={{ ...FILL, background: "radial-gradient(ellipse at 50% 45%, #10202c 0%, #05090e 70%)" }} />} /> }}
  bad={{ label: "a hundred and twenty points snap into place in half a second: no shape, no moment", render: f => shot(MISTAKES.assemble, f, <div style={{ ...FILL, background: "#05090e" }} />) }} />;
const Flow = () => <ParticlePlayer title="Flow: movement from one thing to another" cues={[]} guide={PARTICLE_GUIDE.flow}
  good={{ label: "a steady stream from source to destination, with the exact amount on a label", render: f => <ParticleFlow fromLabel="Customer" toLabel="Business" value="$120 a month" frame={f} fps={fps} backdrop={<div style={{ ...FILL, background: "#08131c" }} />} /> }}
  bad={{ label: "a fast, wide swarm with no labels: direction lost, and the density pretends to be a number", render: f => shot(MISTAKES.flow, f, <div style={{ ...FILL, background: "#08131c" }} />) }} />;

function Turntable() {
  const { frame } = useStageFrame(), mesh = useRef<Mesh>(null);
  useLayoutEffect(() => { if (mesh.current) mesh.current.rotation.set(.4, frame * .03, 0); }, [frame]);
  return <><ambientLight intensity={.4} /><directionalLight position={[3, 4, 5]} intensity={2.2} />
    <mesh ref={mesh}><torusKnotGeometry args={[.9, .3, 160, 24]} /><meshStandardMaterial color="#6fb6c4" roughness={.35} metalness={.4} /></mesh></>;
}
const Authoring = () => <ParticlePlayer title="FiberStage: an R3F scene on the host's clock" cues={[]}
  good={{ label: "Children read useStageFrame() instead of wall time, so a seek always matches playback. The stage draws once per frame and marks it drawn for the exporter.", render: f =>
    <FiberStage frame={f} fps={fps} background="#0b1620" label="A torus knot turning one step per frame" camera={{ position: [0, 0, 5], fov: 40 }} style={FILL}><Turntable /></FiberStage> }} />;

const meta = { title: "Video production/Particles", id: "video-particles", component: Motes, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Motes>;
export default meta;
type Story = StoryObj<typeof meta>;
export const DustInTheLight: Story = { render: () => <Motes /> };
export const RisingEmbers: Story = { render: () => <Embers /> };
export const SparksOnTheHit: Story = { render: () => <Sparks /> };
export const BokehBeforeTheSubject: Story = { render: () => <Bokeh /> };
export const FirefliesAtNight: Story = { render: () => <Fireflies /> };
export const AssembleManyIntoOne: Story = { render: () => <Assemble /> };
export const FlowFromSourceToDestination: Story = { render: () => <Flow /> };
export const FiberStageAuthoring: Story = { render: () => <Authoring /> };
