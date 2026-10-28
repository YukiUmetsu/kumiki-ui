import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { InteractiveBranchingPlayer } from "../../registry/video/interactive-branching-player";
import type { BranchingActor, BranchingTheme } from "../../registry/video/interactive-branching-player";
import type { BranchingRank, BranchingStory } from "../../registry/video/interactive-branching-model";
import { BRANCHING_FRAME_THEMES } from "../../registry/video/branching-frames";
import type { BranchingFrameThemeId } from "../../registry/video/branching-frames";
import { BranchingCharacterActor } from "./branching-character-actors";

// In-house ocean clip with synthesized surf (scripts/generate-branching-ocean-demo.mjs); no third-party media.
const VIDEO = new URL("./assets/branching-ocean.webm", import.meta.url).href;
const POSTER = new URL("./assets/branching-ocean-poster.jpg", import.meta.url).href;

const ranks: BranchingRank[] = [
  { id: "new", title: "New tide explorer", minAccuracy: 0, badge: "Shell" },
  { id: "experienced", title: "Seasoned explorer", minAccuracy: .5, minCorrect: 1, badge: "Wave" },
  { id: "expert", title: "Ocean scholar", minAccuracy: .8, minCorrect: 2, badge: "Lighthouse" },
];

function makeStory(): BranchingStory {
  return { id: "tide-mystery", startClipId: "opening", clips: [
    { id: "opening", src: VIDEO, title: "Secrets of the tide", poster: POSTER, checkpoints: [
      { id: "tide", time: 4, question: "What pulls the tide in and out?", choices: [
        { id: "moon", label: "The Moon's gravity", correct: true, reactionClipId: "bright" },
        { id: "wind", label: "The evening wind", correct: false, reactionClipId: "hint" },
      ] },
      { id: "route", time: 9.5, question: "Where should we explore next?", choices: [
        { id: "shore", label: "Walk the shoreline", correct: true, nextClipId: "shore" },
        { id: "island", label: "Row to the island", correct: false, nextClipId: "island" },
      ] },
    ] },
    { id: "bright", src: VIDEO, title: "A bright idea", poster: POSTER },
    { id: "hint", src: VIDEO, title: "A gentle hint", poster: POSTER },
    { id: "shore", src: VIDEO, title: "Treasures on the shore", poster: POSTER },
    { id: "island", src: VIDEO, title: "Toward the lighthouse", poster: POSTER },
  ] };
}

// Pip and Doctor Quill are the repo's CharacterPresenter rigs, cued by clip time.
const actors: BranchingActor[] = [
  { id: "pip", name: "Pip", role: "student", side: "left", cues: [
    { clipId: "opening", time: 0, action: "walk" }, { clipId: "opening", time: 3, action: "think" },
    { clipId: "opening", time: 6, action: "idle" }, { clipId: "bright", time: 0, action: "celebrate" },
    { clipId: "hint", time: 0, action: "think" }, { clipId: "shore", time: 0, action: "celebrate" },
    { clipId: "island", time: 0, action: "walk" },
  ] },
  { id: "quill", name: "Dr. Quill", role: "teacher", side: "right", cues: [
    { clipId: "opening", time: 0, action: "talk" }, { clipId: "opening", time: 3.4, action: "point" },
    { clipId: "bright", time: 0, action: "celebrate" }, { clipId: "hint", time: 0, action: "talk" },
    { clipId: "shore", time: 0, action: "point" }, { clipId: "island", time: 0, action: "talk" },
  ] },
];

type Variant = BranchingFrameThemeId;
const FRAME_IDS = Object.keys(BRANCHING_FRAME_THEMES) as BranchingFrameThemeId[];

// Page backdrops are the "wall" each framed player hangs on.
const pages: Record<Variant, { background: string; ink: string; muted: string; title: string }> = {
  "forest-grove": { background: "radial-gradient(circle at 50% 20%, #d9e6d6, #b0c8c1)", ink: "#163932", muted: "#3c5b57", title: "Stories that respond to you." },
  "theater-proscenium": { background: "radial-gradient(circle at 50% 20%, #e6d8c7, #bfa5ab)", ink: "#4f2736", muted: "#714e58", title: "The story is in your hands." },
  "adventure-map": { background: "radial-gradient(ellipse at 50% 0%, #5a4430, #241a12 78%)", ink: "#f6ead2", muted: "#cdb894", title: "Every lesson is a journey." },
  "koi-pond": { background: "radial-gradient(ellipse at 50% 0%, #143542, #071219 78%)", ink: "#e8f6f2", muted: "#9cc7c0", title: "Quiet water, clear thinking." },
  "moss-stone": { background: "radial-gradient(ellipse at 50% 0%, #3c5136, #16211a 70%)", ink: "#eef3e2", muted: "#b9c7ad", title: "A window in the old garden wall." },
  "marble-colonnade": { background: "radial-gradient(ellipse at 50% 0%, #4a5163, #1b1f29 70%)", ink: "#f4f1ea", muted: "#c3c0b8", title: "Lessons framed in marble." },
  "blossom-branch": { background: "radial-gradient(ellipse at 40% 10%, #fbeef4, #f0d0de 80%)", ink: "#4a1f33", muted: "#7c4b60", title: "A gentle spring chapter." },
  "stone-portico": { background: "radial-gradient(ellipse at 50% 0%, #3f4b47, #141b19 72%)", ink: "#e9ece3", muted: "#b2bbae", title: "Enter the hall of questions." },
  "leaf-canopy": { background: "radial-gradient(ellipse at 50% 0%, #f4f8e6, #d5e5b5 85%)", ink: "#20331a", muted: "#4d6639", title: "Under the leafy canopy." },
  "walnut-lintel": { background: "radial-gradient(ellipse at 50% 0%, #f6f0e6, #e2d6c3 85%)", ink: "#2d1d13", muted: "#6f5643", title: "Hand-joined walnut, quiet focus." },
};

function themeFor(variant: Variant): BranchingTheme {
  return BRANCHING_FRAME_THEMES[variant];
}

interface DemoArgs { name: string; variant: Variant; showCharacters: boolean }
function Demo({ name, variant, showCharacters }: DemoArgs) {
  const page = pages[variant];
  const story = useMemo(() => makeStory(), []);
  return <main style={{ background: page.background, padding: "clamp(18px, 4vw, 58px)", minHeight: "100vh" }}>
    <div style={{ margin: "auto", maxWidth: 1040 }}>
      <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 750, letterSpacing: ".2em", color: page.muted }}>KUMIKI • INTERACTIVE EXPERIENCE</p>
      <h1 style={{ font: "500 clamp(30px, 4.5vw, 53px)/1.1 Georgia, serif", margin: "0 0 12px", color: page.ink, letterSpacing: "-.035em" }}>{page.title}</h1>
      <p style={{ maxWidth: 610, margin: "0 0 27px", color: page.muted }}>Pause for a question, see a short reaction, then return or branch. Personalize the frame, characters and rank independently.</p>
      <InteractiveBranchingPlayer story={story}
        viewer={{ name, title: "Marine researcher", badges: ["First voyage"] }} ranks={ranks}
        theme={themeFor(variant)} actors={showCharacters ? actors : []}
        renderActor={({ actor, action }) => <BranchingCharacterActor actor={actor} action={action} />} />
      <p style={{ color: page.muted, marginTop: 24, fontSize: 12 }}>Demo media is an in-house generated ocean clip with synthesized surf (no external footage or audio rights). Frames are procedural Kumiki SVGs; the world map uses public-domain Natural Earth data.</p>
    </div>
  </main>;
}

/** Every frame theme side by side, each player independent. */
function FrameGallery({ name }: { name: string }) {
  const story = useMemo(() => makeStory(), []);
  return <main style={{ background: "linear-gradient(180deg, #f3efe8, #e4ddd2)", padding: "clamp(16px, 4vw, 56px)", minHeight: "100vh" }}>
    <div style={{ margin: "auto", maxWidth: 1360 }}>
      <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 750, letterSpacing: ".2em", color: "#6b5b4c" }}>KUMIKI • FRAME THEMES</p>
      <h1 style={{ font: "500 clamp(28px, 4vw, 48px)/1.1 Georgia, serif", margin: "0 0 28px", color: "#2d241d", letterSpacing: "-.035em" }}>Every frame, one player.</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 560px), 1fr))", gap: "clamp(20px, 3vw, 40px)" }}>
        {FRAME_IDS.map(id => <figure key={id} style={{ margin: 0 }}>
          <InteractiveBranchingPlayer story={story} viewer={{ name }} ranks={ranks} theme={BRANCHING_FRAME_THEMES[id]} />
          <figcaption style={{ marginTop: 10, font: "600 12px/1.4 ui-monospace, monospace", color: "#6b5b4c", letterSpacing: ".04em" }}>{id}</figcaption>
        </figure>)}
      </div>
    </div>
  </main>;
}

const meta = {
  title: "Video production/Interactive Branching Player", id: "video-interactive-branching-player",
  component: Demo, parameters: { layout: "fullscreen" },
  args: { name: "Yuki", variant: "forest-grove", showCharacters: true },
  argTypes: { variant: { control: "select", options: FRAME_IDS } },
} satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ForestLesson: Story = {};
export const TheaterStage: Story = { args: { variant: "theater-proscenium" } };
export const AdventureMapFrame: Story = { args: { variant: "adventure-map" } };
export const KoiPondFrame: Story = { args: { variant: "koi-pond" } };
export const FrameThemes: Story = { render: args => <FrameGallery name={args.name} /> };
export const MossStoneFrame: Story = { args: { variant: "moss-stone" } };
export const MarbleColonnadeFrame: Story = { args: { variant: "marble-colonnade" } };
export const BlossomBranchFrame: Story = { args: { variant: "blossom-branch" } };
export const StonePorticoFrame: Story = { args: { variant: "stone-portico" } };
export const LeafCanopyFrame: Story = { args: { variant: "leaf-canopy" } };
export const WalnutLintelFrame: Story = { args: { variant: "walnut-lintel" } };
