import type { Meta, StoryObj } from "@storybook/react-vite";
import type { InkFilm, InkFilmLayer, InkShot } from "../../../registry/video/ink/ink-film";
import { INK_REVEAL_KINDS, INK_TRANSITION_KINDS } from "../../../registry/video/ink/ink-reveal";
import type { InkTransitionKind } from "../../../registry/video/ink/ink-reveal";
import { inkHeightScene, inkPeaksScene, inkRainScene, inkRiverScene, inkTownScene } from "../../../registry/video/ink/ink-scenes";
import { InkStudioFilm } from "./ink-page";

const PAPER = "#F8F1E3", SIZE = { width: 1920, height: 1080 };
const WORDS: Record<(typeof INK_REVEAL_KINDS)[number], string> = { none: "Already there", paint: "Paint: the order the brush went", bloom: "Bloom: spreads from a drop", wipe: "Wipe: a broad dry brush", mist: "Mist: comes out in patches", develop: "Develop: pale water first" };
const REVEALS: InkFilm = { schemaVersion: 1, id: "ink-reveals", title: "Ways onto the paper", fps: 30, paper: PAPER, size: SIZE, shots: [{ id: "reveals", seconds: 9, label: "The same pavilion comes onto the paper in six ways", layers: INK_REVEAL_KINDS.map((kind, i): InkFilmLayer => ({ id: kind, subject: "pavilion", props: { seed: 4 }, at: [350 + (i % 3) * 610, 260 + Math.floor(i / 3) * 520], scale: 0.62, enter: kind === "none" ? undefined : { kind, at: 0.5, seconds: kind === "paint" ? 5 : 3.2 }, leave: { at: 7.4, seconds: 1.2 } })), text: INK_REVEAL_KINDS.map((kind, i) => ({ text: WORDS[kind], at: [350 + (i % 3) * 610, 492 + Math.floor(i / 3) * 520] as const, size: 34, width: 560 })) }] };
const SCENES = [inkPeaksScene, inkRiverScene, inkTownScene, inkHeightScene, inkRainScene], NAMES: Partial<Record<InkTransitionKind, string>> = { dissolve: "Dissolve", blot: "Blot", mist: "Mist", brush: "Brush", scroll: "Scroll", flood: "Flood" };
const KINDS = INK_TRANSITION_KINDS.filter(k => k !== "cut");
const TRANSITIONS: InkFilm = { schemaVersion: 1, id: "ink-transitions", title: "From one picture to the next", fps: 30, paper: PAPER, size: SIZE, shots: [...KINDS, "dissolve" as const].map((_, i): InkShot => ({ id: `scene-${i}`, seconds: 3.6, label: `A scene that gives way by ${KINDS[i] ?? "the end"}`, layers: SCENES[i % SCENES.length]({}), enter: i ? { kind: KINDS[i - 1], seconds: 1.5, from: [0.62, 0.45], seed: 3 + i } : undefined, text: i < KINDS.length ? [{ text: `Next: ${NAMES[KINDS[i]]}`, at: [1660, 1030] as const, size: 36, width: 420, from: 0.2 }] : [{ text: "The end", at: [1660, 1030] as const, size: 36, width: 420, from: 0.2 }] })) };
const MOUNTS: InkFilm = { schemaVersion: 1, id: "ink-mounts", title: "Page, round fan and album leaf", fps: 30, paper: PAPER, size: SIZE, shots: [
  { id: "page", seconds: 4, label: "Peaks on a whole page", layers: inkPeaksScene({}) },
  { id: "fan", seconds: 4, label: "A river in a round fan", layers: inkRiverScene({}).map(l => ({ ...l, at: [l.at[0] - 150, l.at[1]] as const })), mount: { kind: "fan", at: [960, 540], half: [500, 500], silk: "#E9DCC2" }, enter: { kind: "dissolve", seconds: 0.8 } },
  { id: "leaf", seconds: 4, label: "A water town in an album leaf", layers: inkTownScene({}), mount: { kind: "leaf", at: [960, 540], half: [780, 430], silk: "#C9D2CC" }, enter: { kind: "dissolve", seconds: 0.8 } },
] };
const meta: Meta = { title: "Video production/Film Looks/Chinese Ink/Reveals And Transitions", id: "video-ink-reveals", parameters: { layout: "fullscreen" } };
export default meta;
/** Six ways a picture comes onto the paper. Any layer takes any of them. */
export const Reveals: StoryObj = { render: () => <InkStudioFilm film={REVEALS} pixels={1440} /> };
/** Six ways one picture gives way to the next. */
export const Transitions: StoryObj = { render: () => <InkStudioFilm film={TRANSITIONS} pixels={1280} /> };
/** The same film on a whole page, in a round fan and in an album leaf. */
export const FanAndLeaf: StoryObj = { render: () => <InkStudioFilm film={MOUNTS} pixels={1280} /> };
