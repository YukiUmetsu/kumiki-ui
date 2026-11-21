import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo } from "react";
import { VIDEO_PLATFORM_PRESETS } from "../../registry/video/platform-presets";
import { parseWordHighlights } from "../../registry/video/shodo/shodo-kanji-card-plan";
import {
  ShodoBrushCloseUp, ShodoBrushMotionStudy, ShodoCharacterGallery, ShodoFilmShot, ShodoKanjiCardExport, ShodoKanjiCardPlayer, ShodoTechniquesBoard,
  fillKanjiCardContent, readKanjiCardExport,
} from "./shodo-demos";
import type { JlptLevel, KanjiCardContent, KanjiCardDensity, KanjiCardInk, KanjiCardLayout, KanjiCardPhase, KanjiCardWord } from "./shodo-demos";
import { ShodoStudio, useKanjiCardDataset } from "./shodo-studio";

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

/** Flat settings for the Controls panel; `KanjiCardFromArgs` maps them onto `ShodoKanjiCard`. */
interface KanjiCardArgs {
  char: string;
  heading: string;
  meanings?: string;
  onyomi?: string;
  kunyomi?: string;
  jlpt: "sample" | "none" | JlptLevel;
  words?: KanjiCardWord[];
  layout: KanjiCardLayout;
  speed: number;
  writeSeconds?: number;
  reviewSeconds?: number;
  infoSeconds: number;
  showLabel: boolean;
  showMeanings: boolean;
  showReadings: boolean;
  showJlpt: boolean;
  showWords: boolean;
  cardFrom: KanjiCardPhase;
  ink: KanjiCardInk;
  highlightStroke: number;
  strokeNumbers: boolean;
  /** Word highlight cues as text: "word@seconds", with an optional "+hold", or "each". */
  wordHighlights: string;
  highlightMotion: "viewer" | "full" | "fade";
  /** Keep the text and the ink out of a platform's buttons and caption: "none" or a preset id. */
  safeArea: string;
  density: KanjiCardDensity;
  /** Seconds of the typed intro (0: none) and the kana it types before converting. */
  introSeconds: number;
  introReading: string;
}

// A cleared number field gives null or NaN; treat both as "not set".
const seconds = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? value : undefined;

/**
 * Export mode (`kmExport=1`): the card described by the URL parameter `kmCard`, URI-encoded JSON
 * read by `readKanjiCardExport`. The exporter's `kmPreset` names the preset when the JSON does not.
 *   npm run video:export -- --url="http://127.0.0.1:6006/iframe.html?id=video-shodo--kanji-card-short&viewMode=story&kmExport=1&kmCard=…" --preset=youtube-shorts --audio=mix.wav
 */
function KanjiCardExportFromUrl() {
  const read = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    let json: unknown;
    try { json = JSON.parse(params.get("kmCard") ?? ""); } catch { return { value: null, errors: ["kmCard: URI-encoded JSON describing the card is required."] }; }
    const preset = params.get("kmPreset");
    if (preset && json && typeof json === "object" && !Array.isArray(json) && !("preset" in json)) json = { ...json, preset };
    return readKanjiCardExport(json);
  }, []);
  if (!read.value) return <div role="alert" style={{ padding: 20, font: "14px/1.5 system-ui, sans-serif" }}>
    <strong>The kanji card cannot be exported.</strong>
    <ul>{read.errors.map(e => <li key={e}>{e}</li>)}</ul>
  </div>;
  return <div style={{ padding: 20, background: "#000", width: "max-content" }}><ShodoKanjiCardExport video={read.value} /></div>;
}

const exporting = () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("kmExport") === "1";

function KanjiCardFromArgs(args: KanjiCardArgs) {
  if (exporting()) return <KanjiCardExportFromUrl />;
  return <KanjiCardPreview {...args} />;
}

function KanjiCardPreview(args: KanjiCardArgs) {
  // The owner's local study-card data (missing on other machines) fills the fields left empty.
  const dataset = useKanjiCardDataset();
  const char = args.char.trim() ? [...args.char.trim()][0] : "道";
  const typed: KanjiCardContent = {
    meanings: args.meanings || undefined, onyomi: args.onyomi || undefined, kunyomi: args.kunyomi || undefined,
    jlpt: args.jlpt === "sample" ? undefined : args.jlpt === "none" ? null : args.jlpt, words: args.words?.length ? args.words : undefined,
  };
  const content = fillKanjiCardContent(typed, dataset?.get(char)?.card);
  const cues = args.wordHighlights?.trim().toLowerCase() === "each" ? "each" as const : parseWordHighlights(args.wordHighlights ?? "");
  return <ShodoKanjiCardPlayer
    key={char + "|" + args.layout}
    char={char} heading={args.heading} layout={args.layout}
    meanings={content.meanings} onyomi={content.onyomi} kunyomi={content.kunyomi} jlpt={content.jlpt} words={content.words}
    speed={args.speed} timing={{ intro: seconds(args.introSeconds), write: seconds(args.writeSeconds), review: seconds(args.reviewSeconds), info: seconds(args.infoSeconds) }}
    intro={args.introReading?.trim() ? { reading: args.introReading.trim() } : undefined} density={args.density}
    sections={{ label: args.showLabel, meanings: args.showMeanings, readings: args.showReadings, jlpt: args.showJlpt, words: args.showWords }}
    cardFrom={args.cardFrom} ink={args.ink} strokeNumbers={args.strokeNumbers}
    vermilionStrokes={args.highlightStroke > 0 ? [Math.round(args.highlightStroke)] : []}
    wordHighlights={cues}
    safeInset={VIDEO_PLATFORM_PRESETS.find(p => p.id === args.safeArea)?.safeInset}
    reducedMotion={args.highlightMotion === "viewer" ? undefined : args.highlightMotion === "fade"} />;
}

const KANJI_CARD_ARG_TYPES = {
  char: { control: "text", description: "The character to write. With the owner's local kanji data (JLPT N5–N3), the card fills from it; otherwise only 道 has sample data, and other characters show only the data you enter." },
  heading: { control: "text", description: "Label text: \"HEADING: char\"." },
  meanings: { control: "text", description: "Empty: from the local kanji data, or the 道 sample." },
  onyomi: { control: "text", description: "On'yomi. Empty: from the local kanji data, or the 道 sample." },
  kunyomi: { control: "text", description: "Kun'yomi. Empty: from the local kanji data, or the 道 sample." },
  jlpt: { control: "select", options: ["sample", "none", "N5", "N4", "N3", "N2", "N1"], description: "\"sample\": from the local kanji data, or the 道 sample (N4). \"none\" shows no badge." },
  words: { control: "object", description: "Useful words: [{ word, ruby, romaji, meaning }]. Empty: from the local kanji data, or the 道 sample." },
  layout: { control: "inline-radio", options: ["landscape", "portrait"], description: "16:9 or 9:16." },
  speed: { control: { type: "range", min: .25, max: 4, step: .05 }, description: "Hand speed when no write time is set (1 is an unhurried teacher)." },
  writeSeconds: { control: { type: "number", min: 0, step: .5 }, description: "Seconds for the first writing. Empty: set by the speed. 0 skips it." },
  reviewSeconds: { control: { type: "number", min: 0, step: .5 }, description: "Seconds for the review writing. Empty: the same as the write time. 0 skips it." },
  infoSeconds: { control: { type: "number", min: 0, step: .5 }, description: "Seconds the finished card holds at the end." },
  showLabel: { control: "boolean" }, showMeanings: { control: "boolean" }, showReadings: { control: "boolean" },
  showJlpt: { control: "boolean" }, showWords: { control: "boolean" },
  cardFrom: { control: "inline-radio", options: ["intro", "write", "review", "info"], description: "The phase in which the card text fades in. At the first phase of the video it shows at once." },
  ink: { control: "inline-radio", options: ["sumi", "vermilion"], description: "Ink for the whole character." },
  highlightStroke: { control: { type: "number", min: 0, step: 1 }, description: "One stroke (from 1) written in vermilion. 0: none." },
  strokeNumbers: { control: "boolean", description: "Order numbers in the review pass." },
  wordHighlights: { control: "text", description: "Highlight the useful words one at a time. \"each\": every word in turn, from 20 % to 80 % of the video. Or cues: word@seconds, with an optional +hold (default 2.5 s); words count from 0, seconds from the start of the video (the frame readout). Example: 0@3, 1@6.5+1.5, 2@9." },
  highlightMotion: { control: "inline-radio", options: ["viewer", "full", "fade"], description: "\"viewer\" follows prefers-reduced-motion; \"fade\" has no scale or lift; \"full\" always lifts (use it for an export)." },
  density: { control: "inline-radio", options: ["regular", "compact"], description: "\"compact\" (9:16 only): a shorter reading card and a taller writing panel." },
  introSeconds: { control: { type: "number", min: 0, step: .5 }, description: "Seconds of the typed intro before the brush writes. 0: no intro." },
  introReading: { control: "text", description: "Kana that the intro types before it converts to the character, for example みず. Empty: the character is typed directly." },
  safeArea: { control: "select", options: ["none", ...VIDEO_PLATFORM_PRESETS.map(p => p.id)], description: "Keep the label, the ink and the card text out of a platform's buttons and caption (the preset's approximate safe bands). \"none\": the whole frame." },
  initialText: { table: { disable: true } }, initialStyle: { table: { disable: true } },
} as const;

const KANJI_CARD_ARGS: KanjiCardArgs = {
  char: "道", heading: "Kanji study", jlpt: "sample", layout: "landscape", speed: 1.6, infoSeconds: 4,
  showLabel: true, showMeanings: true, showReadings: true, showJlpt: true, showWords: true,
  cardFrom: "intro", ink: "sumi", highlightStroke: 0, strokeNumbers: true,
  // Every word in turn, spread over the video, whatever its length.
  wordHighlights: "each", highlightMotion: "viewer", safeArea: "none", density: "regular", introSeconds: 0, introReading: "",
};

/**
 * A study video for one kanji (16:9): the brush writes the character in black ink, writes it
 * again with small vermilion stroke-order numbers, then the reading card holds. Every setting
 * is in the Controls panel.
 */
export const KanjiCard: StoryObj<typeof KanjiCardFromArgs> = {
  name: "SHO1 · Kanji study card",
  render: args => <KanjiCardFromArgs {...args} />,
  args: KANJI_CARD_ARGS,
  argTypes: KANJI_CARD_ARG_TYPES,
};

/**
 * The same card as a 9:16 short for phones: the card sits under the sheet, and the video lasts
 * about 20 s. The label, the ink and the card text stay out of the YouTube Shorts buttons and
 * caption (`safeArea`). Export mode: see `KanjiCardExportFromUrl`.
 */
export const KanjiCardShort: StoryObj<typeof KanjiCardFromArgs> = {
  name: "SHO1 · Kanji study card (9:16 short)",
  render: args => <KanjiCardFromArgs {...args} />,
  args: { ...KANJI_CARD_ARGS, layout: "portrait", writeSeconds: 7, reviewSeconds: 9, infoSeconds: 4, safeArea: "youtube-shorts", density: "compact" },
  argTypes: KANJI_CARD_ARG_TYPES,
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
