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

/**
 * A study video for one kanji (16:9): the brush writes the character, writes it again with
 * small vermilion stroke-order numbers, then the reading card holds. The last stroke is in vermilion.
 */
export const KanjiCard: StoryObj<typeof ShodoStudio> = {
  name: "SHO1 · Kanji study card",
  render: () => <ShodoKanjiCard />,
};

/** The same card as a 9:16 short for phones: the card sits under the sheet, and the video lasts about 20 s. */
export const KanjiCardShort: StoryObj<typeof ShodoStudio> = {
  name: "SHO1 · Kanji study card (9:16 short)",
  render: () => <ShodoKanjiCard layout="portrait" timing={{ write: 7, review: 9, info: 4 }} />,
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
