import type { Meta, StoryObj } from "@storybook/react-vite";
import type { InkFilm, InkFilmLayer } from "../../../registry/video/ink/ink-film";
import type { InkSubjectName } from "../../../registry/video/ink/ink-subjects";
import { InkStudioFilm } from "./ink-page";

const portrait = (subject: InkSubjectName, title: string, layer: Partial<InkFilmLayer> = {}): InkFilm => ({ schemaVersion: 1, id: `ink-${subject}${layer.enter ? "-painted" : ""}`, title, fps: 30, paper: "#F8F1E3", size: { width: 1200, height: 1600 }, shots: [{ id: "portrait", seconds: 16, label: title, layers: [{ subject, at: [600, 800], ...layer }], camera: [{ at: 0, zoom: 1 }, { at: 16, zoom: 1.04 }] }] });
const show = (film: InkFilm): StoryObj["render"] => () => <InkStudioFilm film={film} pixels={900} wide={false} />;
const painted: Partial<InkFilmLayer> = { enter: { kind: "paint", at: 0.3, seconds: 9 } };

const CAST: InkFilm = {
  schemaVersion: 1, id: "ink-cast", title: "Three figures in ink", fps: 30, paper: "#F8F1E3", size: { width: 1920, height: 1080 },
  shots: [{
    id: "cast", seconds: 18, label: "Three half figures in brush ink side by side: a girl with coiled hair and white blossom, a swordsman with a small crown, and a long-haired woman before the moon",
    layers: [
      { subject: "qingfeng", props: { name: false, mountain: false }, at: [962, 590], scale: 0.68, depth: 0, enter: { kind: "paint", at: 0.2, seconds: 6 } },
      { subject: "momei", props: { name: false, branch: false }, at: [352, 692], scale: 0.84, depth: 0, enter: { kind: "paint", at: 0.8, seconds: 6 } },
      { subject: "shuiyue-gongbi", props: { name: false }, at: [1570, 636], scale: 0.66, depth: 0, enter: { kind: "paint", at: 1.2, seconds: 6 } },
    ],
  }],
};

const meta: Meta = { title: "Video production/Film Looks/Chinese Ink/Characters", id: "video-ink-characters", parameters: { layout: "fullscreen" } };
export default meta;
/** The three of them, painted in from bare paper. */
export const Cast: StoryObj = { render: () => <InkStudioFilm film={CAST} pixels={1600} /> };
/** She breathes and blinks; hair, ribbons and earring move in a light wind. */
export const Shuiyue: StoryObj = { name: "水月 Shuiyue", render: show(portrait("shuiyue", "水月 in a light wind")) };
/** The picture paints itself in the order the brush went. */
export const ShuiyuePaintsItself: StoryObj = { name: "水月 Painted Stroke By Stroke", render: show(portrait("shuiyue", "水月, painted stroke by stroke", painted)) };
/** The same woman painted again, in layers over white (工筆). */
export const ShuiyueGongbi: StoryObj = { name: "水月 Shuiyue In Colour", render: show(portrait("shuiyue-gongbi", "水月 in colour, in a light wind")) };
export const ShuiyueGongbiPaintsItself: StoryObj = { name: "水月 In Colour, Painted Stroke By Stroke", render: show(portrait("shuiyue-gongbi", "水月 in colour, painted stroke by stroke", painted)) };
/** A swordsman with the wind in his hair and ribbons. */
export const Qingfeng: StoryObj = { name: "清風 Qingfeng", render: show(portrait("qingfeng", "清風 in the mountain wind")) };
export const QingfengPaintsItself: StoryObj = { name: "清風 Painted Stroke By Stroke", render: show(portrait("qingfeng", "清風, painted stroke by stroke", painted)) };
/** Under a branch of plum blossom. */
export const Momei: StoryObj = { name: "墨梅 Momei", render: show(portrait("momei", "墨梅 under plum blossom")) };
export const MomeiPaintsItself: StoryObj = { name: "墨梅 Painted Stroke By Stroke", render: show(portrait("momei", "墨梅, painted stroke by stroke", painted)) };
