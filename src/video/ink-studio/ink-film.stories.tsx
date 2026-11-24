import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { VideoExportStage } from "../../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../../registry/video/video-export-stage";
import { planInkFilm } from "../../../registry/video/ink/ink-film";
import { InkFilmStage } from "../../../registry/video/ink/ink-film-react";
import { inkPainter } from "../../../registry/video/ink/ink-paint-pool";
import { INK_BOOK } from "../../../registry/video/ink/ink-subjects";
import { INK_DEMO } from "./ink-demo-film";
import { INK_WORDS, InkStudioFilm } from "./ink-page";

function Export({ upright }: { upright: boolean }) {
  const [frame, setFrame] = useState(0), plan = useMemo(() => planInkFilm(INK_DEMO, { upright }), [upright]);
  const manifest = useMemo<VideoExportManifest>(() => ({ schemaVersion: 1, id: `ink-demo${upright ? "-tall" : ""}`, durationFrames: plan.frames, width: plan.width, height: plan.height, fps: { num: INK_DEMO.fps, den: 1 } }), [plan, upright]);
  return <div style={{ width: plan.width, ...INK_WORDS }}><VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}><InkFilmStage film={INK_DEMO} book={INK_BOOK} painter={inkPainter} frame={frame} upright={upright} /></VideoExportStage></div>;
}
const meta: Meta = { title: "Video production/Film Looks/Chinese Ink/Film", id: "video-ink-film", parameters: { layout: "fullscreen" } };
export default meta;
/** Six shots: title, height, swordsman, river, plum, moon. */
export const Film: StoryObj = { render: () => <InkStudioFilm film={INK_DEMO} pixels={1440} /> };
/** The same film, upright: every layer says where it goes. */
export const Upright: StoryObj = { render: () => <InkStudioFilm film={INK_DEMO} upright pixels={810} wide={false} /> };
/** What a renderer captures: no page round it, one frame at a time. */
export const ExportWide: StoryObj = { name: "Export 16:9", tags: ["!test"], render: () => <Export upright={false} /> };
export const ExportTall: StoryObj = { name: "Export 9:16", tags: ["!test"], render: () => <Export upright /> };
