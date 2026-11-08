import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { createLaptop, createSmartphone } from "../../registry/domains/technology-3d";
import { ExplodedView, FinishCompare, PartSpotlight, ProductHeroTurn, ScreenComesAlive, TwoAngleProof } from "../../registry/visual/studio-recipes-react";
import { inspectStudioShot } from "../../registry/visual/studio-shots";
import { StepInside } from "../../registry/visual/portal-recipes-react";
import { PhysicsPoint } from "../../registry/visual/physics-recipes-react";
import { ManyIntoOne } from "../../registry/visual/assemble-recipes-react";
import { inspectPhysicsShot } from "../../registry/visual/physics-shots";
import type { PhysicsPointSpec, PhysicsScene } from "../../registry/visual/physics-shots";
import type { BakedPhysicalActionSpec } from "../../registry/motion/baked-physical-motion";
import dominoBake from "../../assets/physics/domino-chain.json";
import stackBake from "../../assets/physics/stack-compare.json";
import { easeInOut, easeOut, span01 } from "../../registry/visual/studio-shots";
import type { CompareSpec, ExplodeSpec, HeroTurnSpec, ManyIntoOneSpec, PartSpotlightSpec, ScreenAliveSpec, StepInsideSpec, StudioShotKind } from "../../registry/visual/studio-shots";
import { ParticlePlayer, fps, page } from "./particle-story-player";
import { STUDIO_JOBS, STUDIO_RECIPE_GUIDE } from "../../registry/visual/studio-guide";
import type { StudioJob } from "../../registry/visual/studio-guide";

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

const SCREEN: ScreenAliveSpec = {
  durationFrames: 225, part: "phone-display", hide: ["phone-notification"], pushStart: 8, pushEnd: 50, uiStart: 46, pullStart: 186, pullEnd: 222,
  wide: { yaw: -30, pitch: 9, fill: .82 }, close: { yaw: 0, pitch: 1, fill: .97, offsetX: .24 },
  title: { text: "Your week at a glance", enter: 132, exit: 184 },
};
/** A weekly-energy screen that performs: the total counts up, bars grow in a stagger, a comparison slides in, a switch turns on.
 * A pure function of the frame, in 390-wide design pixels, with no text under 14 px. */
function energyScreen(ctx: CanvasRenderingContext2D, w: number, h: number, f: number) {
  const ink = "#eef3f8", soft = "rgba(214,226,238,.66)", accent = "#7cd6a4", font = "system-ui, -apple-system, sans-serif";
  const bg = ctx.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#111a24"); bg.addColorStop(1, "#0b1118"); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  const fade = (start: number, len = 10) => easeOut(span01(f, start, start + len));
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = soft; ctx.font = `600 15px ${font}`; ctx.fillText("9:41", 28, 40);
  let a = fade(0); ctx.globalAlpha = a; ctx.fillStyle = soft; ctx.font = `500 16px ${font}`; ctx.fillText("Energy use", 28, 104 + (1 - a) * 10);
  ctx.fillStyle = ink; ctx.font = `700 30px ${font}`; ctx.fillText("This week", 28, 140 + (1 - a) * 10);
  const total = 42.8 * easeOut(span01(f, 6, 46)); a = fade(4);
  ctx.globalAlpha = a; ctx.font = `700 64px ${font}`; ctx.fillStyle = ink; ctx.fillText(total.toFixed(1), 28, 228);
  const tw = ctx.measureText(total.toFixed(1)).width; ctx.font = `600 20px ${font}`; ctx.fillStyle = soft; ctx.fillText("kWh", 36 + tw, 228);
  const values = [5.1, 6.4, 7.8, 5.9, 6.6, 4.7, 6.3], max = 8, base = 470, area = 190, bw = 30, gap = (w - 56 - bw * 7) / 6;
  ctx.globalAlpha = 1;
  values.forEach((v, i) => {
    const grow = easeInOut(span01(f, 14 + i * 3, 32 + i * 3)), x = 28 + i * (bw + gap), hgt = area * (v / max) * grow;
    ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.beginPath(); ctx.roundRect(x, base - area, bw, area, 8); ctx.fill();
    ctx.fillStyle = i === 6 ? accent : "rgba(160,190,220,.55)"; ctx.beginPath(); ctx.roundRect(x, base - hgt, bw, Math.max(0, hgt), 8); ctx.fill();
    ctx.fillStyle = soft; ctx.font = `600 14px ${font}`; ctx.textAlign = "center"; ctx.fillText("MTWTFSS"[i], x + bw / 2, base + 26); ctx.textAlign = "left";
  });
  a = fade(56, 12); ctx.globalAlpha = a;
  const py = 540 + (1 - a) * 16; ctx.fillStyle = "rgba(124,214,164,.14)"; ctx.beginPath(); ctx.roundRect(28, py, w - 56, 54, 27); ctx.fill();
  ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(54, py + 27, 6, 0, 7); ctx.fill();
  ctx.fillStyle = ink; ctx.font = `600 17px ${font}`; ctx.fillText("12% less than last week", 72, py + 33);
  a = fade(74, 12); ctx.globalAlpha = a;
  const ry = 630 + (1 - a) * 16; ctx.fillStyle = "rgba(255,255,255,.05)"; ctx.beginPath(); ctx.roundRect(28, ry, w - 56, 72, 18); ctx.fill();
  ctx.fillStyle = ink; ctx.font = `600 18px ${font}`; ctx.fillText("Eco mode", 48, ry + 33); ctx.fillStyle = soft; ctx.font = `500 14px ${font}`; ctx.fillText("Shifts heating to off-peak hours", 48, ry + 54);
  const on = easeInOut(span01(f, 96, 106)), sx = w - 48 - 52;
  ctx.fillStyle = on > .5 ? accent : "rgba(255,255,255,.18)"; ctx.globalAlpha = a; ctx.beginPath(); ctx.roundRect(sx, ry + 22, 52, 30, 15); ctx.fill();
  ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(sx + 15 + on * 22, ry + 37, 12, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
}

const STEP: StepInsideSpec = {
  durationFrames: 240, part: "phone-display", hide: ["phone-notification"], wide: { yaw: -26, pitch: 8, fill: .8 }, pushStart: 14, closeFrame: 78, crossFrame: 96, travel: 9,
  title: { text: "Where it takes you", enter: 150 },
};

const dominoes = dominoBake as unknown as { scene: PhysicsScene; action: BakedPhysicalActionSpec };
const stacks = stackBake as unknown as { scene: PhysicsScene; action: BakedPhysicalActionSpec };
const lastContact = (action: BakedPhysicalActionSpec) => Math.ceil(action.contacts?.[action.contacts.length - 1]?.frame ?? 0);
const DOMINO: PhysicsPointSpec = { durationFrames: 180, view: { yaw: 64, pitch: 16, fill: 1.05 }, orbit: 12,
  title: { text: "One push, fourteen falls", sub: "Each domino passes the energy on to the next", enter: lastContact(dominoes.action) + 6 } };
const STACK: PhysicsPointSpec = { durationFrames: 210, view: { yaw: 0, pitch: 14, fill: .8 }, orbit: 8,
  labels: [{ group: "left", text: "6", enter: lastContact(stacks.action) + 4 }, { group: "right", text: "11", enter: lastContact(stacks.action) + 10 }],
  title: { text: "Almost twice as many", enter: lastContact(stacks.action) + 18 } };
/** Contact sounds from the bake: one tap per contact, louder for faster impacts. */
const contactCues = (action: BakedPhysicalActionSpec, sound: string, cap = 24) => (action.contacts ?? []).slice(0, cap).map(c => ({ frame: Math.round(c.frame), sound, gainDb: Math.max(-24, Math.min(-4, -18 + c.speedMps * 9)) }));

const GATHER: ManyIntoOneSpec = { durationFrames: 210, view: { yaw: -30, pitch: 8, fill: .78, offsetX: .2 }, startFrame: 6, formFrame: 86, revealFrames: 18, orbitAfter: 12,
  title: { text: "Everything in one place", enter: 112 } };

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
export const ScreenComesAliveStory: Story = { name: "Screen Comes Alive", args, render: () => <ParticlePlayer title="Screen Comes Alive: push in, let the interface perform, pull back" cues={[]} durationFrames={SCREEN.durationFrames} posterFrame={140}
  good={{ label: "The camera lands square on the display before the interface starts; the total counts up, bars grow in a stagger, a comparison slides in and the switch turns on; then the camera pulls back to the device.", render: f => <ScreenComesAlive frame={f} fps={fps} create={phone} spec={SCREEN} paint={energyScreen} studio={{ look: "strip" }} /> }}
  notes={<Problems kind="screen-alive" spec={SCREEN} />} /> };
export const StepInsideStory: Story = { name: "Step Inside", args, render: () => <ParticlePlayer title="Step Inside: the screen is a window, and the camera goes through" cues={[]} durationFrames={STEP.durationFrames} posterFrame={60}
  good={{ label: "Through the screen the meadow moves with real parallax as the camera approaches; when the screen fills the frame the shot switches to the world itself, and the camera keeps moving forward at the same speed.", render: f => <StepInside frame={f} fps={fps} create={phone} spec={STEP} studio={{ look: "strip" }} /> }}
  notes={<Problems kind="step-inside" spec={STEP} />} /> };
export const PhysicsPointDominoes: Story = { name: "Physics Point: Dominoes", args, render: () => <ParticlePlayer title="Physics Point: cause and effect you can feel" cues={contactCues(dominoes.action, "foley-wood-touch")} durationFrames={DOMINO.durationFrames} posterFrame={84}
  good={{ label: "Solved once with a deterministic rigid-body engine and played back from the bake: the fall travels down an S-curve, each contact a tap; the title waits for the last domino.", render: f => <PhysicsPoint frame={f} fps={fps} scene={dominoes.scene} action={dominoes.action} spec={DOMINO} studio={{ look: "softbox" }} /> }}
  notes={<p style={{ margin: 0 }}><strong>Craft check (`inspectPhysicsShot`):</strong> {inspectPhysicsShot(DOMINO, lastContact(dominoes.action), fps.num).map(p => p.message).join(" ") || "no problems."}</p>} /> };
export const PhysicsPointStacks: Story = { name: "Physics Point: Stacks", args, render: () => <ParticlePlayer title="Physics Point: a comparison you can weigh" cues={contactCues(stacks.action, "impact-light-firm", 30)} durationFrames={STACK.durationFrames} posterFrame={180}
  good={{ label: "Blocks drop one at a time into two columns; the numbers appear above each stack once it has settled, then the conclusion.", render: f => <PhysicsPoint frame={f} fps={fps} scene={stacks.scene} action={stacks.action} spec={STACK} studio={{ look: "softbox" }} /> }}
  notes={<p style={{ margin: 0 }}><strong>Craft check (`inspectPhysicsShot`):</strong> {inspectPhysicsShot(STACK, lastContact(stacks.action), fps.num).map(p => p.message).join(" ") || "no problems."}</p>} /> };
export const ManyIntoOneStory: Story = { name: "Many Into One", args, render: () => <ParticlePlayer title="Many Into One: particles gather onto the real surface, and the product builds in under them" cues={[{ frame: 80, sound: "sting-airy-short", gainDb: -8 }]} durationFrames={GATHER.durationFrames} posterFrame={70}
  good={{ label: "1,400 points sampled from the phone's own surfaces by area, from a seeded source; the particles curl in from the whole frame, then the phone builds in from the bottom as they fade, and turns a little.", render: f => <ManyIntoOne frame={f} fps={fps} create={phone} spec={GATHER} studio={{ look: "rim", palette: "midnight" }} /> }}
  notes={<Problems kind="many-into-one" spec={GATHER} />} /> };

// ------------------------------------------------------------------ choosing, and a reel

const JOB_LABELS: Readonly<Record<StudioJob, string>> = {
  introduce: "Introduce an object", "explain-part": "Explain one part", construction: "Show how it is built", compare: "Compare versions",
  mechanism: "Show a mechanism", reveal: "Reveal", bridge: "Bridge two chapters", "cause-and-effect": "Show cause and effect",
};
/** Pick a recipe by what the shot has to do, with the rules that come with it. */
function ChooseRecipe() {
  const [job, setJob] = useState<StudioJob>("introduce");
  const recipes = STUDIO_RECIPE_GUIDE.filter(guide => guide.jobs.includes(job)).sort((a, b) => Number(b.jobs[0] === job) - Number(a.jobs[0] === job));
  return <div style={page}>
    <h2 style={{ margin: 0, font: "700 20px/1.3 var(--km-font-body, system-ui)" }}>What does the 3D shot need to do?</h2>
    <div role="radiogroup" aria-label="The job" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {STUDIO_JOBS.map(item => <button key={item} type="button" role="radio" aria-checked={item === job} onClick={() => setJob(item)}
        style={{ font: "inherit", minHeight: 40, padding: "0 12px", borderRadius: 8, border: "1px solid #7a8a99", background: item === job ? "#10202e" : "transparent", color: item === job ? "#fff" : "inherit" }}>{JOB_LABELS[item]}</button>)}
    </div>
    {recipes.map(guide => <section key={guide.id} aria-label={guide.title} style={{ display: "grid", gap: 4, padding: 12, border: "1px solid #c9d3dc", borderRadius: 10, maxWidth: 1100 }}>
      <strong style={{ fontSize: 17 }}>{guide.title} <code style={{ fontWeight: 400, fontSize: 14 }}>{guide.component}</code></strong>
      <span><b>Use it for:</b> {guide.use}</span>
      <span><b>Avoid:</b> {guide.avoid}</span>
      <span><b>Settings:</b> {guide.settings}</span>
      <span><b>Seen in practice:</b> {guide.practice}</span>
      <span><b>Before it ships:</b> {guide.review.join(" ")}</span>
      <a href={`/?path=/story/${guide.storyId}`} target="_top">Open the recipe</a>
    </section>)}
    <p style={{ margin: 0, fontSize: 14 }}>Agents: <code>{`npm run catalog:find -- --type=effect --query="${job}"`}</code> returns the same recipes with these rules; <code>inspectStudioShot</code>, <code>inspectLightShot</code>, <code>inspectPhysicsShot</code> and <code>inspectFlythrough</code> check a spec before it renders. Research and sources: <code>docs/31-react-three-fiber-content-plan.md</code>.</p>
  </div>;
}
export const ChooseARecipe: Story = { args, render: () => <ChooseRecipe /> };

/** Six recipes cut together into one short product film: the subject forms, turns, shows a part, comes apart, demonstrates its
 * interface, and opens onto a world. Each shot is a recipe with its own spec; the reel only decides the order. */
const REEL: ReadonlyArray<{ frames: number; render: (f: number) => ReactNode }> = [
  { frames: GATHER.durationFrames - 40, render: f => <ManyIntoOne frame={f} fps={fps} create={phone} spec={{ ...GATHER, title: undefined }} studio={{ look: "rim", palette: "midnight" }} /> },
  { frames: HERO_TURN.durationFrames - 30, render: f => <ProductHeroTurn frame={f} fps={fps} create={phone} spec={HERO_TURN} studio={{ look: "strip" }} /> },
  { frames: SPOTLIGHT.durationFrames - 20, render: f => <PartSpotlight frame={f} fps={fps} create={phone} spec={SPOTLIGHT} studio={{ look: "softbox", palette: "midnight" }} /> },
  { frames: EXPLODE.durationFrames - 10, render: f => <ExplodedView frame={f} fps={fps} create={phone} spec={EXPLODE} studio={{ look: "softbox" }} /> },
  { frames: SCREEN.durationFrames - 40, render: f => <ScreenComesAlive frame={f} fps={fps} create={phone} spec={SCREEN} paint={energyScreen} studio={{ look: "strip" }} /> },
  { frames: STEP.durationFrames, render: f => <StepInside frame={f} fps={fps} create={phone} spec={STEP} studio={{ look: "strip" }} /> },
];
const REEL_TOTAL = REEL.reduce((n, shot) => n + shot.frames, 0);
function reelFrame(frame: number) {
  let start = 0;
  for (const [i, shot] of REEL.entries()) { if (frame < start + shot.frames || i === REEL.length - 1) return <div key={i} style={{ position: "absolute", inset: 0 }}>{shot.render(Math.min(shot.frames - 1, frame - start))}</div>; start += shot.frames; }
  return null;
}
export const ProductFilmReel: Story = { args, render: () => <ParticlePlayer title={`A product film in six recipes (${(REEL_TOTAL / fps.num).toFixed(0)} s)`} cues={[{ frame: 80, sound: "sting-airy-short", gainDb: -8 }]} durationFrames={REEL_TOTAL} posterFrame={260}
  good={{ label: "Many Into One, Product Hero Turn, Part Spotlight, Exploded View, Screen Comes Alive and Step Inside, cut on their beat boundaries. Each shot keeps its own craft rules; the reel only sets the order.", render: reelFrame }} /> };
