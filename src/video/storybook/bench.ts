/** Small films on plain paper, to look at one thing at a time: an act, a face, a line of speech, a hand on a prop. */
import type { StorybookFilm, StoryActor, StoryLine, StoryProp, StoryShot } from "../../../registry/video/storybook/storybook-film";

export interface BenchOptions {
  id: string; title: string; cast: Readonly<Record<string, StoryActor>>; seconds: number; fps?: number;
  /** Middle and height of the picture, centimetres. */ at?: readonly [number, number]; tall?: number;
  size?: readonly [number, number]; lines?: Readonly<Record<string, StoryLine>>; props?: Readonly<Record<string, StoryProp>>; shot?: Partial<StoryShot>; boil?: number;
}
export function benchFilm(o: BenchOptions): StorybookFilm {
  const [width, height] = o.size ?? [960, 960], at = o.at ?? [0, -84], tall = o.tall ?? 196;
  return {
    id: o.id, title: o.title, size: { width, height }, fps: o.fps ?? 24, paper: "#fbf3e1", frame: { x: 0, y: 0, width, height }, cast: o.cast,
    sets: { paper: { home: { at, tall }, layers: [] } }, props: o.props ?? {}, lines: o.lines ?? {}, boil: o.boil,
    shots: [{ id: o.id, label: o.title, set: "paper", seconds: o.seconds, camera: [{ t: 0, at, tall }], layout: "full", ...o.shot }],
  };
}
