import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as Moments from "../../registry/visual/particle-moments-react";
import { PARTICLE_MOMENTS, embersRising, firefliesAtDusk, lensBokeh, motesInTheLight, sparksOnImpact } from "../../registry/visual/particle-moments";
import type { ParticleCue } from "../../registry/visual/particle-moments";
import { PARTICLE_GUIDE, PARTICLE_JOBS } from "../../registry/visual/particle-guide";
import type { ParticleJob } from "../../registry/visual/particle-guide";
import { ParticlePlayer, fps, page } from "./particle-story-player";
import lagoon from "../../examples/film/assets/iceland/jokulsarlon.jpg?url";
import mark from "../../examples/film/assets/water-mark.svg?url";

const FILL: CSSProperties = { position: "absolute", inset: 0 };
const photo = (filter?: string) => <img src={lagoon} alt="" style={{ ...FILL, width: "100%", height: "100%", objectFit: "cover", filter }} />;
/** Each moment as it would sit in a film, with the cues its builder returns. */
const LIVE: Readonly<Record<string, { render: (frame: number) => ReactNode; cues: readonly ParticleCue[] }>> = {
  "motes-in-the-light": { cues: motesInTheLight().cues, render: f => <Moments.MotesInTheLight frame={f} fps={fps} backdrop={<div style={{ ...FILL, background: "radial-gradient(ellipse at 20% 10%, #2a2018 0%, #0b0908 65%)" }} />} /> },
  "embers-rising": { cues: embersRising().cues, render: f => <Moments.EmbersRising frame={f} fps={fps} backdrop={<div style={{ ...FILL, background: "radial-gradient(ellipse at 50% 120%, #3a1a0c 0%, #0b0706 62%)" }} />} /> },
  "sparks-on-impact": { cues: sparksOnImpact().cues, render: f => <Moments.SparksOnImpact frame={f} fps={fps} backdrop={<div style={{ ...FILL, background: "linear-gradient(#0c1116, #121820 72%, #1a2028 72.4%, #0e1318)" }} />} /> },
  "lens-bokeh": { cues: lensBokeh().cues, render: f => <Moments.LensBokeh frame={f} fps={fps} backdrop={photo()} /> },
  "fireflies-at-dusk": { cues: firefliesAtDusk().cues, render: f => <Moments.FirefliesAtDusk frame={f} fps={fps} backdrop={<>{photo("brightness(.38) saturate(.8)")}<div style={{ ...FILL, background: "linear-gradient(rgba(8,16,40,.45), rgba(4,8,20,.65))" }} /></>} /> },
  "assemble-into-mark": { cues: [{ frame: 82, sound: "sting-airy-short", gainDb: -6 }], render: f => <Moments.AssembleIntoMark mark={mark} name="SAMPLE STUDIO" frame={f} fps={fps} backdrop={<div style={{ ...FILL, background: "radial-gradient(ellipse at 50% 45%, #10202c 0%, #05090e 70%)" }} />} /> },
  "particle-flow": { cues: [], render: f => <Moments.ParticleFlow fromLabel="Customer" toLabel="Business" value="$120 a month" frame={f} fps={fps} backdrop={<div style={{ ...FILL, background: "#08131c" }} />} /> },
};
const BEATS: Readonly<Record<ParticleJob, string>> = {
  atmosphere: "Give a quiet shot life", weather: "Show weather or season", impact: "Mark a hit or contact", reveal: "Reveal a place or light",
  identity: "Form a brand or mark", data: "Show movement between things", bridge: "Bridge two scenes",
};
/** The craft story that shows each kind beside its common mistake. */
const CRAFT: Readonly<Record<string, string>> = { motes: "dust-in-the-light", embers: "rising-embers", sparks: "sparks-on-the-hit", bokeh: "bokeh-before-the-subject", fireflies: "fireflies-at-night", assemble: "assemble-many-into-one", flow: "flow-from-source-to-destination" };

function Chooser() {
  const [job, setJob] = useState<ParticleJob>("atmosphere"), [pick, setPick] = useState<string>();
  const moments = PARTICLE_MOMENTS.filter(moment => moment.job === job), kinds = Object.values(PARTICLE_GUIDE).filter(guide => guide!.jobs.includes(job));
  const shown = moments.find(moment => moment.id === pick) ?? moments[0];
  return <div style={page}>
    <h2 style={{ margin: 0, font: "700 20px/1.3 var(--km-font-body, system-ui)" }}>What do the particles need to do?</h2>
    <div role="radiogroup" aria-label="The beat" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {PARTICLE_JOBS.map(item => <button key={item} type="button" role="radio" aria-checked={item === job} onClick={() => { setJob(item); setPick(undefined); }}
        style={{ font: "inherit", minHeight: 40, padding: "0 12px", borderRadius: 8, border: "1px solid #7a8a99", background: item === job ? "#10202e" : "transparent", color: item === job ? "#fff" : "inherit" }}>{BEATS[item]}</button>)}
    </div>
    {moments.length > 1 && <div role="radiogroup" aria-label="Ready-made moments" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {moments.map(moment => <button key={moment.id} type="button" role="radio" aria-checked={moment.id === shown?.id} onClick={() => setPick(moment.id)} style={{ font: "inherit", minHeight: 36 }}>{moment.title}</button>)}
    </div>}
    {shown ? <ParticlePlayer key={shown.id} title={`${shown.title}: ${shown.summary}`} cues={LIVE[shown.id].cues} good={{ label: `Job: ${shown.job}. Kind: ${shown.kind}.`, render: LIVE[shown.id].render }} />
      : <p style={{ margin: 0 }}>No ready-made moment does this yet. Use the kind directly, as its craft story shows.</p>}
    <h3 style={{ margin: "8px 0 0", font: "700 17px/1.3 var(--km-font-body, system-ui)" }}>Particle kinds for this job</h3>
    {kinds.map(guide => <section key={guide!.kind} aria-label={guide!.title} style={{ display: "grid", gap: 4, padding: 12, border: "1px solid #c9d3dc", borderRadius: 10 }}>
      <strong>{guide!.title}</strong>
      <span><b>Use it for:</b> {guide!.use}</span>
      <span><b>Avoid:</b> {guide!.avoid}</span>
      <span><b>Settings:</b> {guide!.settings}</span>
      <span><b>Seen in practice:</b> {guide!.practice}</span>
      {CRAFT[guide!.kind] && <a href={`/?path=/story/video-particles--${CRAFT[guide!.kind]}`} target="_top">See it next to its common mistake</a>}
    </section>)}
    <p style={{ margin: 0, fontSize: 14 }}>The named film and studio examples behind these rules, with sources, are in <code>docs/30-particles-in-practice.md</code>.</p>
    <p style={{ margin: 0, fontSize: 14 }}>Agents: <code>{`npm run catalog:find -- --type=effect --query="${job}"`}</code> returns the same choices with these rules, and <code>compileEffect</code> reports a mismatched job, a haze of too many particles, motes with no beam and sparks that linger.</p>
  </div>;
}
const Moment = ({ id }: { id: string }) => {
  const moment = PARTICLE_MOMENTS.find(item => item.id === id)!;
  return <ParticlePlayer title={moment.title} cues={LIVE[id].cues} guide={PARTICLE_GUIDE[moment.kind]} good={{ label: moment.summary, render: LIVE[id].render }} />;
};

const meta = { title: "Video production/Particle Moments", id: "video-particle-moments", component: Chooser, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Chooser>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ChooseParticles: Story = { render: () => <Chooser /> };
export const MotesInTheLight: Story = { render: () => <Moment id="motes-in-the-light" /> };
export const EmbersRising: Story = { render: () => <Moment id="embers-rising" /> };
export const SparksOnImpact: Story = { render: () => <Moment id="sparks-on-impact" /> };
export const LensBokeh: Story = { render: () => <Moment id="lens-bokeh" /> };
export const FirefliesAtDusk: Story = { render: () => <Moment id="fireflies-at-dusk" /> };
export const AssembleIntoMark: Story = { render: () => <Moment id="assemble-into-mark" /> };
export const ParticleFlow: Story = { render: () => <Moment id="particle-flow" /> };
