import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { VideoExportStage } from "../../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../../registry/video/video-export-stage";
import { planStorybook } from "../../../registry/video/storybook/storybook-film";
import { StorybookFilmStage } from "../../../registry/video/storybook/storybook-film-react";
import { filmNames, filmOf } from "./films";
import { KONBINI_FILM } from "./konbini-film";
import { FrameInspector, StoryFilm, StoryPage, STORYBOOK_WORDS } from "./story-page";

function Export({ film: name, english, readings }: { film: string; english: boolean; readings: boolean }) {
  const film = useMemo(() => filmOf(name), [name]), [frame, setFrame] = useState(0), plan = useMemo(() => planStorybook(film), [film]), { width, height } = film.size;
  const manifest = useMemo<VideoExportManifest>(() => ({ schemaVersion: 1, id: film.id, durationFrames: plan.frames, width, height, fps: { num: film.fps, den: 1 } }), [film, plan, width, height]);
  return <div style={{ width, ...STORYBOOK_WORDS }}>
    <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}><StorybookFilmStage film={film} frame={frame} glosses={english} readings={readings} /></VideoExportStage>
    <script type="application/json" data-story-plan>{JSON.stringify({ fps: film.fps, frames: plan.frames, shots: plan.shots.map(s => ({ id: s.shot.id, start: s.start, end: s.end })) })}</script>
  </div>;
}
const meta: Meta = { title: "Video production/Japanese Retro Watercolor/Film", id: "video-storybook-film", parameters: { layout: "fullscreen" } };
export default meta;
/** コンビニで: Emma buys a rice ball from Riku. JLPT N5 words, with furigana, spoken slowly. */
export const ConvenienceStore: StoryObj = { name: "Convenience store", render: () => <StoryFilm film={KONBINI_FILM} /> };
/** えきで: the family comes to Kyoto Station, buys tickets and goes through the gate. */
export const Station: StoryObj = { name: "Arriving at the station", render: () => <StoryFilm film={filmOf("station")} /> };
/** タクシーで: Daniel says where to go, Sato drives. */
export const Taxi: StoryObj = { name: "Taking a taxi", render: () => <StoryFilm film={filmOf("taxi")} /> };
/** おみやげ: Emma and Sophie choose a fan at Emi's shop. */
export const SouvenirShop: StoryObj = { name: "Souvenir shop", render: () => <StoryFilm film={filmOf("shop")} /> };
/** りょかんで: shoes off, a name, a key, and tea in the room with Haruka. */
export const Ryokan: StoryObj = { name: "Checking into a ryokan", render: () => <StoryFilm film={filmOf("ryokan")} /> };
/** お祭りで: takoyaki from Daichi, and fireworks. */
export const Festival: StoryObj = { name: "Summer festival", render: () => <StoryFilm film={filmOf("festival")} /> };
/** The pages that open and close an episode: a title, who is who, a quiz, goodbye. */
export const Pages: StoryObj = { name: "Title, family and quiz", render: () => <StoryFilm film={filmOf("hello")} /> };
/** はじめての京都: every scene in one episode of eight minutes. It is a list of plays in `episodes/first-trip.json`. */
export const Episode: StoryObj = { name: "Episode: first trip to Kyoto", tags: ["!test"], render: () => <StoryFilm film={filmOf("first-trip")} /> };
/** Any frame with its bones, joints and grips. */
export const Frames: StoryObj = { name: "Frame by frame", render: () => <StoryPage title="Frame by frame"><FrameInspector film={KONBINI_FILM} start={324} /></StoryPage> };
/** What a renderer captures: no page round it, one frame at a time. `&args=film:konbini;english:!true` in the address picks the film and English subtitles. */
export const ExportWide: StoryObj<{ film: string; english: boolean; readings: boolean }> = { name: "Export 16:9", tags: ["!test"], args: { film: "konbini", english: false, readings: true }, argTypes: { film: { control: "select", options: filmNames() } }, render: args => <Export {...args} /> };
