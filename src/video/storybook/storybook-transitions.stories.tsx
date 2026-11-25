import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PAINT_TRANSITIONS } from "../../../registry/video/storybook/paint-stage";
import type { PaintTransitionKind } from "../../../registry/video/storybook/paint-stage";
import { transitionBench } from "./story-benches";
import { StoryBench, StoryPage } from "./story-page";

const meta: Meta = { title: "Video production/Japanese Retro Watercolor/Scene Transitions", id: "video-storybook-transitions", parameters: { layout: "fullscreen" } };
export default meta;
function One({ kind, seconds }: { kind: PaintTransitionKind; seconds: number }) { const film = useMemo(() => transitionBench(kind, seconds), [kind, seconds]); return <StoryPage title={kind}><StoryBench film={film} pixels={1200} /></StoryPage>; }
/** A sliding paper door, a wet wash, a dry brush, a turned page, petals, an ink circle. */
export const Transition: StoryObj<{ kind: PaintTransitionKind; seconds: number }> = { name: "Choose a transition", args: { kind: "shoji", seconds: 1.2 }, argTypes: { kind: { control: "select", options: PAINT_TRANSITIONS.filter(k => k !== "cut") }, seconds: { control: { type: "range", min: 0.4, max: 2, step: 0.1 } } }, render: a => <One {...a} /> };
