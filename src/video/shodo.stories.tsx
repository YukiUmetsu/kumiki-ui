import type { Meta, StoryObj } from "@storybook/react-vite";
import { ShodoBrushCloseUp, ShodoBrushMotionStudy, ShodoCharacterGallery, ShodoFilmShot, ShodoKanjiCard, ShodoTechniquesBoard } from "./shodo-demos";
import { ShodoStudio } from "./shodo-studio";

const meta = {
  title: "Video production/Film Looks/Shodō Calligraphy",
  id: "video-shodo",
  component: ShodoStudio,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ShodoStudio>;
export default meta;

/** Every hand, brush, ink and paper parameter drives the real renderer. */
export const Studio: StoryObj<typeof ShodoStudio> = {
  name: "SHO1 · Studio",
  args: { initialText: "永" },
};

/** 始筆 (打ち込み, 蔵鋒, 露鋒), 転折 and 終筆 (止め, 懸針, 撥ね, 払い), one cell each. */
export const Techniques: StoryObj<typeof ShodoStudio> = {
  name: "SHO1 · Start, turn, stop and end",
  render: () => <ShodoTechniquesBoard />,
};

/** A study frame for video: the character on gridded hanshi, a reading card, the last stroke in vermilion. */
export const KanjiCard: StoryObj<typeof ShodoStudio> = {
  name: "SHO1 · Kanji study card",
  render: () => <ShodoKanjiCard />,
};

/** Macro view of the tuft: the press, the bend at the ferrule, the flick and the spring-back. */
export const BrushCloseUp: StoryObj<typeof ShodoStudio> = {
  name: "SHO1 · Brush close-up",
  render: () => <ShodoBrushCloseUp />,
};

/** The `shodo-writing` FilmStage slot inside a FilmDocument, as a film export would play it. */
export const FilmShot: StoryObj<typeof ShodoStudio> = {
  name: "SHO1 · Film shot (FilmStage slot)",
  render: () => <ShodoFilmShot />,
};

/** Any kanji or kana from KanjiVG stroke data, written with kaisho form rules. */
export const CharacterGallery: StoryObj<typeof ShodoStudio> = {
  name: "SHO1 · Character gallery (any text)",
  render: () => <ShodoCharacterGallery />,
};

/** The brush from the top and from the side, with its lean and height traced over time. */
export const BrushMotion: StoryObj<typeof ShodoStudio> = {
  name: "SHO1 · Brush motion (top and side)",
  render: () => <ShodoBrushMotionStudy />,
};
