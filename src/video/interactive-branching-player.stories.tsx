import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { InteractiveBranchingPlayer } from "../../registry/video/interactive-branching-player";
import type { BranchingActor, BranchingTheme } from "../../registry/video/interactive-branching-player";
import type { BranchingRank, BranchingStory } from "../../registry/video/interactive-branching-model";

const VIDEO = new URL("./assets/synthetic-frame-counter.webm", import.meta.url).href;
const FOREST_POSTER = new URL("./assets/branching-forest-poster.svg", import.meta.url).href;
const THEATER_POSTER = new URL("./assets/branching-theater-poster.svg", import.meta.url).href;

const ranks: BranchingRank[] = [
  { id: "new", title: "New mystery hunter", minAccuracy: 0, badge: "Seed" },
  { id: "experienced", title: "Experienced hunter", minAccuracy: .5, minCorrect: 1, badge: "Leaf" },
  { id: "detective", title: "Mystery detective", minAccuracy: .8, minCorrect: 2, badge: "Owl" },
];

function makeStory(poster: string): BranchingStory {
  return { id: "mystery-forest", startClipId: "opening", clips: [
    { id: "opening", src: VIDEO, title: "The forest's hidden clues", poster, checkpoints: [
      { id: "tracks", time: 1.1, question: "Which animal left these tracks?", choices: [
        { id: "fox", label: "A curious fox", correct: true, reactionClipId: "sparkle" },
        { id: "owl", label: "A flying owl", correct: false, reactionClipId: "think" },
      ] },
      { id: "weather", time: 2.9, question: "Where should we search next?", choices: [
        { id: "river", label: "Follow the stream", correct: true, nextClipId: "river" },
        { id: "hill", label: "Climb the hill", correct: false, nextClipId: "hill" },
      ] },
    ] },
    { id: "sparkle", src: VIDEO, title: "A clue discovered" },
    { id: "think", src: VIDEO, title: "A thoughtful hint" },
    { id: "river", src: VIDEO, title: "The riverside finale" },
    { id: "hill", src: VIDEO, title: "A view from the hill" },
  ] };
}

const actors: BranchingActor[] = [
  { id: "pip", name: "Pip", role: "student", side: "left", cues: [
    { clipId: "opening", time: 0, action: "walk" }, { clipId: "opening", time: 1.1, action: "think" },
    { clipId: "river", time: 0, action: "celebrate" },
  ] },
  { id: "quill", name: "Dr. Quill", role: "teacher", side: "right", cues: [
    { clipId: "opening", time: 0, action: "point" }, { clipId: "sparkle", time: 0, action: "celebrate" },
    { clipId: "hill", time: 0, action: "talk" },
  ] },
];

const forest: BranchingTheme = {
  id: "forest", colors: { accent: "#d5e7ac", background: "#142826", foreground: "#f5f9e8", border: "#718d66", glow: "#a4c795" },
  ornament: <svg viewBox="0 0 960 540" aria-hidden="true" preserveAspectRatio="none" width="100%" height="100%">
    <g fill="none" stroke="#b3d09a" opacity=".62" strokeWidth="3">
      <path d="M0 0q88 49 104 151m-8-57q-35-49-65-44m86 87q57-54 75-36M960 540q-103-34-135-130m18 45q67-57 89-47m-101-7q-72 21-87-14" />
    </g><g fill="#b5dca5" opacity=".7"><ellipse cx="82" cy="68" rx="11" ry="21" transform="rotate(-24 82 68)" /><ellipse cx="175" cy="100" rx="10" ry="20" transform="rotate(40 175 100)" /><ellipse cx="859" cy="461" rx="13" ry="23" transform="rotate(-48 859 461)" /></g>
  </svg>,
  rankOrnaments: { detective: <span style={{ position: "absolute", top: 16, right: 18, fontSize: 23, color: "#e1edb6" }}>✦</span> },
};
const theater: BranchingTheme = {
  id: "theater", colors: { accent: "#f1cc86", background: "#261923", foreground: "#fff1df", border: "#986d55", glow: "#d6a982" },
  ornament: <div style={{ position: "absolute", inset: "6px", border: "1px solid #d5a77877", borderRadius: 12, boxShadow: "inset 0 0 32px #7d2c2866" }} />,
};

function ForestActor({ actor, action }: { actor: BranchingActor; action: string }) {
  const owl = actor.id === "quill";
  return <div style={{ display: "grid", justifyItems: "center", filter: "drop-shadow(0 4px 10px #0007)" }} title={`${actor.name} is ${action}`}>
    <svg viewBox="0 0 96 116" width="clamp(44px, 7vw, 96px)" aria-hidden="true">
      {owl ? <><path d="M17 43V20l20 15 12-6 14 6 19-15v23Q94 80 74 100Q50 119 24 99Q3 80 17 43" fill="#a88565" stroke="#edc995" strokeWidth="2"/><ellipse cx="32" cy="58" rx="16" ry="21" fill="#f4e2bc"/><ellipse cx="64" cy="58" rx="16" ry="21" fill="#f4e2bc"/><circle cx="34" cy="57" r="7" fill="#1f272d"/><circle cx="63" cy="57" r="7" fill="#1f272d"/><path d="M44 75l10 0-5 9Z" fill="#d99d44"/><path d="M27 99q24 14 45 0" fill="none" stroke="#d8af7c" strokeWidth="4"/></>
        : <><path d="M17 28L5 1l30 16 27-2L87 1l-8 31q22 40-12 72Q47 118 26 99Q0 71 17 28" fill="#d88a58" stroke="#f3c69a" strokeWidth="2"/><path d="M22 61q28 14 54 0l-6 35q-23 28-46 0Z" fill="#fff1ce"/><ellipse cx="35" cy="55" rx="5" ry="7" fill="#25323a"/><ellipse cx="61" cy="55" rx="5" ry="7" fill="#25323a"/><path d="M42 68l12 0-6 7Z" fill="#402e35"/></>}
    </svg>
    <span style={{ padding: "2px 9px", borderRadius: 30, border: "1px solid #fff6", background: "#0d2028bf", color: "#fffbe8", fontSize: 10, whiteSpace: "nowrap" }}>{actor.name}</span>
  </div>;
}

interface DemoArgs { name: string; variant: "forest" | "theater"; showCharacters: boolean }
function Demo({ name, variant, showCharacters }: DemoArgs) {
  const isForest = variant === "forest";
  const story = useMemo(() => makeStory(isForest ? FOREST_POSTER : THEATER_POSTER), [isForest]);
  return <main style={{ background: isForest ? "radial-gradient(circle at 50% 20%, #d9e6d6, #b0c8c1)" : "radial-gradient(circle at 50% 20%, #e6d8c7, #bfa5ab)", padding: "clamp(18px, 4vw, 58px)", minHeight: "100vh" }}>
    <div style={{ margin: "auto", maxWidth: 1040 }}>
      <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 750, letterSpacing: ".2em", color: isForest ? "#315b56" : "#68283f" }}>KUMIKI • INTERACTIVE EXPERIENCE</p>
      <h1 style={{ font: "500 clamp(30px, 4.5vw, 53px)/1.1 Georgia, serif", margin: "0 0 12px", color: isForest ? "#163932" : "#4f2736", letterSpacing: "-.035em" }}>{isForest ? "Stories that respond to you." : "The story is in your hands."}</h1>
      <p style={{ maxWidth: 610, margin: "0 0 27px", color: isForest ? "#3c5b57" : "#714e58" }}>Pause for a question, see a short reaction, then return or branch. Personalize the frame, characters and rank independently.</p>
      <InteractiveBranchingPlayer story={story}
        viewer={{ name, title: "Field researcher", badges: ["First exploration"] }} ranks={ranks}
        theme={isForest ? forest : theater} actors={showCharacters ? actors : []}
        renderActor={({ actor, action }) => <ForestActor actor={actor} action={action} />} />
      <p style={{ color: isForest ? "#315b56" : "#714e58", marginTop: 24, fontSize: 12 }}>Demo media is an in-house synthetic frame-counter fixture (no external footage rights). The illustrated posters are authored Kumiki SVGs.</p>
    </div>
  </main>;
}

const meta = {
  title: "Video production/Interactive Branching Player", id: "video-interactive-branching-player",
  component: Demo, parameters: { layout: "fullscreen" },
  args: { name: "Yuki", variant: "forest", showCharacters: true },
  argTypes: { variant: { control: "inline-radio", options: ["forest", "theater"] } },
} satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ForestLesson: Story = {};
export const TheaterStage: Story = { args: { variant: "theater" } };
