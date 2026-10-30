import { useEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { LayeredCutawayPreview } from "./scene-template-previews/layered-cutaway";
import { QuestionRevealScene } from "../../registry/video/recipes/question-reveal";
import type { SceneTemplateSpec } from "../../registry/video/scene-templates";
import { resolveSpeedRampFrame } from "../../registry/motion/attention-editing-recipes";
import { PlaceShapedImageRevealPreview } from "./scene-template-previews/place-shaped-image-reveal";
import { ReliefMapExpeditionPreview } from "./scene-template-previews/relief-map-expedition";
import { CaveIdentityRevealPreview } from "./scene-template-previews/cave-identity-reveal";
import { NatureWorldIdentityRevealPreview } from "./scene-template-previews/nature-world-identity-reveal";
import { IllustratedBookIntoLivingWorldPreview } from "./scene-template-previews/illustrated-book-into-living-world";
import { FollowSubjectThroughSectionsPreview } from "./scene-template-previews/follow-subject-through-sections";
import { TimelineJourneyPreview } from "./scene-template-previews/timeline-journey";
import { PageTurnStoryPreview } from "./scene-template-previews/page-turn-story";
import { OrbitWorldPreview } from "./scene-template-previews/orbit-world";

const footage = new URL("./assets/question-launch.mp4", import.meta.url).href;
const fps = 24;
/** Real time until the cut to liftoff (source frame 406), then 0.3× slow motion to the end of the clip. */
const ramp = [{ frame: 0, sourceFrame: 0 }, { frame: 406, sourceFrame: 406 }, { frame: 489, sourceFrame: 431 }];
const sourceToScene = (source: number) => {
  for (let i = 0; i < ramp.length - 1; i++) {
    const a = ramp[i], b = ramp[i + 1];
    if (source <= b.sourceFrame) return a.frame + (source - a.sourceFrame) * (b.frame - a.frame) / (b.sourceFrame - a.sourceFrame);
  }
  return ramp[ramp.length - 1].frame;
};
/** Scene frame shown at a media time; the epsilon absorbs seconds↔frames float drift after a seek. */
const frameAtTime = (seconds: number) => Math.min(spec.durationFrames - 1, Math.floor(sourceToScene(seconds * fps) + 1e-3));
const rateAt = (frame: number) => frame < ramp[1].frame ? 1 : (ramp[2].sourceFrame - ramp[1].sourceFrame) / (ramp[2].frame - ramp[1].frame);
const spec: SceneTemplateSpec<"question-reveal"> = {
  schemaVersion: 1, recipeVersion: 1, recipeId: "question-reveal", id: "launch-question",
  fps: { num: fps, den: 1 }, durationFrames: 490, width: 960, height: 540,
  // Dock as ignition builds; reveal on the cut to liftoff; resolve once thrust has landed.
  cueFrames: [112, 406, 432], background: "#05070a", accent: "#f0b45c",
  content: { question: "How does a 4.5-million-pound shuttle lift off?", questionEmphasis: "4.5-million-pound",
    subject: { id: "launch", src: footage, alt: "Archival footage of a space shuttle ignition and liftoff",
      licenseRef: "pexels-854259-cc0", width: 1280, height: 720 },
    answer: "Exhaust rushes down. Thrust pushes the shuttle up.",
    answerSteps: [
      { id: "exhaust", text: "Exhaust rushes down.", frame: 150, marker: "down" },
      { id: "thrust", text: "Thrust pushes the shuttle up.", marker: "up" },
    ],
    // Marks are bound to beats, so moving a cue moves its proof with it.
    annotations: [
      { id: "exhaust-closeup", kind: "arrow", from: { x: .5, y: .63 }, to: { x: .5, y: .86 }, flow: true,
        timing: { at: { step: "exhaust" }, until: 222 } }, // retire before the cut to the wide shot
      // Equal and opposite: thrust beside the orbiter, exhaust down the plume centreline.
      { id: "thrust", kind: "arrow", from: { x: .6, y: .54 }, to: { x: .6, y: .34 }, flow: true, timing: { at: { step: "thrust" } } },
      { id: "exhaust-plume", kind: "arrow", from: { x: .5, y: .58 }, to: { x: .5, y: .78 }, flow: true, timing: { at: { step: "thrust" } } },
    ],
    revealImpact: "kick" },
};

function Preview() {
  const video = useRef<HTMLVideoElement | null>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!playing) return;
    let request = 0;
    const sample = () => {
      const player = video.current;
      if (player) {
        const next = frameAtTime(player.currentTime);
        const rate = reduced ? 1 : rateAt(next);
        if (player.playbackRate !== rate) player.playbackRate = rate;
        setFrame(next);
      }
      request = requestAnimationFrame(sample);
    };
    request = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(request);
  }, [playing, reduced]);
  const seek = (next: number) => {
    if (video.current) video.current.currentTime = resolveSpeedRampFrame(ramp, next) / fps;
    setFrame(next);
  };
  const toggle = () => {
    const player = video.current;
    if (!player) return;
    if (playing) { player.pause(); return; }
    if (player.ended || frame >= spec.durationFrames - 1) seek(0);
    // eslint-disable-next-line storybook/context-in-play-function -- HTMLMediaElement.play, not a story play function
    player.play().catch(() => setError("Playback could not start. Check that the footage is available and try again."));
  };
  return <main className="min-h-screen bg-canvas p-6 text-foreground">
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <header><p className="text-sm text-muted-foreground">Scene Templates</p>
        <h1 className="text-2xl font-semibold">Question Reveal</h1>
        <p className="text-sm text-muted-foreground">Archival launch footage · 18 seconds, slowed to 0.3× from liftoff</p></header>
      <div style={{width:"100%",maxWidth:portrait ? 440 : 1100,margin:"0 auto"}}>
        <QuestionRevealScene spec={{...spec,width:portrait?540:960,height:portrait?960:540}}
          frame={frame} reducedMotion={reduced} style={{color:"#f8f4e9"}}
          renderAsset={() => <video ref={node => { video.current = node; if (node) node.preservesPitch = false; }}
            src={footage} preload="auto" playsInline muted={muted}
            aria-label="Space shuttle ignition and liftoff"
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
            onTimeUpdate={e => setFrame(frameAtTime(e.currentTarget.currentTime))}
            onError={() => setError("Launch footage could not be loaded. Check the bundled video file.")}
            style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center"}}/>}/>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={toggle} disabled={reduced} className="rounded-control border border-border px-4 py-2">{playing ? "Pause" : "Play"}</button>
        <button type="button" onClick={() => {video.current?.pause();seek(0);}} className="rounded-control border border-border px-4 py-2">Restart</button>
        <button type="button" aria-pressed={!muted} onClick={() => setMuted(!muted)} className="rounded-control border border-border px-4 py-2">Sound {muted ? "off" : "on"}</button>
        <button type="button" aria-pressed={portrait} onClick={() => setPortrait(!portrait)} className="rounded-control border border-border px-4 py-2">{portrait ? "9:16" : "16:9"}</button>
        <label className="flex items-center gap-2"><input type="checkbox" checked={reduced} onChange={e => {
          const enabled = e.target.checked;
          video.current?.pause(); setReduced(enabled);
          if (enabled) seek(470);
        }}/> Reduced motion</label>
        <span className="text-sm tabular-nums">Frame {frame} / {spec.durationFrames - 1}</span>
      </div>
      <label className="flex flex-col gap-2 text-sm">Seek
        <input type="range" min={0} max={spec.durationFrames - 1} value={frame} onChange={e => {video.current?.pause();seek(Number(e.target.value));}}/>
      </label>
      {reduced && <p className="text-sm text-muted-foreground">Reduced motion shows a still from the reveal. Uncheck it to play.</p>}
      {error && <p role="alert">{error}</p>}
      <p className="text-sm text-muted-foreground">Footage: Pixabay via Pexels · CC0. Sound: NASA STS-131, edited from a separate launch recording; pitched down with the slow motion.</p>
    </div>
  </main>;
}
const meta = { title: "Video production/Scene Templates", component: Preview,
  parameters: { layout: "fullscreen" } } satisfies Meta<typeof Preview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const QuestionReveal: Story = {};
type Copy = { language: "en" | "ja" };
const copyControl = { args: { language: "en" as const }, argTypes: { language: { control: "inline-radio" as const, options: ["en", "ja"] } } };
export const PlaceShapedImageReveal: StoryObj<Copy> = { ...copyControl, render: ({ language }) => <PlaceShapedImageRevealPreview language={language}/> };
export const ReliefMapExpedition: Story = { render: () => <ReliefMapExpeditionPreview/> };
export const CaveIdentityReveal: Story = { render: () => <CaveIdentityRevealPreview/> };
export const NatureWorldIdentityReveal: Story = { render: () => <NatureWorldIdentityRevealPreview/> };
export const IllustratedBookIntoLivingWorld: Story = { render: () => <IllustratedBookIntoLivingWorldPreview/> };
export const FollowSubjectThroughSections: StoryObj<Copy> = { ...copyControl, render: ({ language }) => <FollowSubjectThroughSectionsPreview language={language}/> };
export const TimelineJourney: StoryObj<Copy> = { ...copyControl, render: ({ language }) => <TimelineJourneyPreview language={language}/> };
export const PageTurnStory: StoryObj<Copy & { renderer: "auto" | "flat" }> = { args: { language: "en", renderer: "auto" },
  argTypes: { ...copyControl.argTypes, renderer: { control: "inline-radio", options: ["auto", "flat"] } },
  render: ({ language, renderer }) => <PageTurnStoryPreview language={language} renderer={renderer}/> };
export const OrbitWorld: StoryObj<{ language: "en" | "ja" | "long" }> = { args: { language: "en" },
  argTypes: { language: { control: "inline-radio", options: ["en", "ja", "long"] } }, render: ({ language }) => <OrbitWorldPreview language={language}/> };

export const LayeredCutaway: StoryObj<Copy> = { ...copyControl, render: ({ language }) => <LayeredCutawayPreview language={language}/> };
