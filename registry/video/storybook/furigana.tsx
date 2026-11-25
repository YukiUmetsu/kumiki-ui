import { forwardRef } from "react";
import type { CSSProperties, HTMLAttributes } from "react";
import { rubyPlain } from "./japanese-text";
import type { RubyToken } from "./japanese-text";

export interface FuriganaProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  tokens: readonly RubyToken[];
  /** Token being said; its whole word is marked. −1 marks nothing. */
  token?: number;
  /** Show the readings. Default true. */ readings?: boolean;
  /** Size of the readings, of the text's. Default 0.48. */ readingSize?: number;
  /** Colour of the marker under the word being said. */ marker?: string;
  /** Letters of the words not said yet, 0–1. Default 1. */ ahead?: number;
}
/** A brush mark behind a word: uneven ends, more paint where it starts. */
const swash = (color: string) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40' preserveAspectRatio='none'><path d='M2 13C10 7 22 9 34 7S60 5 76 8 95 8 98 12c2 6 0 13-2 18-6 5-20 3-34 5S34 33 20 35 5 34 3 30C0 25 1 18 2 13Z' fill='${color}'/><path d='M3 14C10 9 18 10 24 9c-5 8-6 17-3 25C12 35 5 34 3 30 1 25 2 19 3 14Z' fill='${color}' opacity='.55'/></svg>`)}")`;

/** Japanese text with readings over its kanji. The word being said lies on a brush mark. Each word stays in one piece when the line breaks. */
export const Furigana = forwardRef<HTMLSpanElement, FuriganaProps>(function Furigana({ tokens, token = -1, readings = true, readingSize = 0.48, marker = "#FFD97A", ahead = 1, style, ...props }, ref) {
  const words: { word: number; items: { t: RubyToken; i: number }[] }[] = [];
  tokens.forEach((t, i) => { const last = words[words.length - 1]; if (last && last.word === t.word) last.items.push({ t, i }); else words.push({ word: t.word, items: [{ t, i }] }); });
  const said = token >= 0 ? tokens[token]?.word : undefined;
  return <span {...props} ref={ref} lang="ja" data-furigana style={{ lineBreak: "strict", wordBreak: "keep-all", ...style }}>
    {words.map(w => {
      const on = w.word === said, later = said === undefined ? token < 0 : w.word > said;
      return <span key={`${w.word}-${w.items[0].i}`} data-word={w.word} data-said={on || undefined} style={{ display: "inline-block", position: "relative", whiteSpace: "nowrap", opacity: later ? ahead : 1 }}>
        {on && <span aria-hidden data-furigana-mark style={{ position: "absolute", zIndex: 0, left: "-0.12em", right: "-0.12em", bottom: "-0.1em", height: "0.72em", background: `${swash(marker)} center / 100% 100% no-repeat` }} />}
        <span style={{ position: "relative", zIndex: 1 }}>{w.items.map(({ t, i }) => readings && t.ruby ? <ruby key={i} style={{ rubyPosition: "over", rubyAlign: "center" } as CSSProperties}>{t.text}<rt style={{ fontSize: `${readingSize * (t.ruby.length > 2 * t.text.length ? 0.86 : 1)}em`, lineHeight: 1.1, fontWeight: 500, letterSpacing: 0 }}>{t.ruby}</rt></ruby> : <span key={i}>{t.text}</span>)}</span>
      </span>;
    })}
  </span>;
});

export interface StorySubtitleProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "lang"> {
  /** Who speaks, as tokens, and the colour of the name. */ speaker?: readonly RubyToken[]; color?: string;
  tokens: readonly RubyToken[]; token?: number; /** Translation under the line. */ gloss?: string; readings?: boolean; ink?: string; marker?: string;
  /** Length that one stage unit has on screen (a CSS length). Default `1px`. */ unit?: string;
  /** Size of the Japanese, stage units. Default: as large as one line of it allows, up to 68. */ size?: number; /** Room across, stage units. */ room?: number;
}
/** Size that keeps a line of this many letters on one row. */
export function subtitleSize(tokens: readonly RubyToken[], room: number, most = 68): number { const letters = [...rubyPlain(tokens)].reduce((n, c) => n + (c.charCodeAt(0) < 256 ? 0.55 : 1), 0); return Math.max(30, Math.min(most, Math.floor(room / Math.max(1, letters + 0.6)))); }

/** A spoken line under the picture: the speaker's name, the Japanese with furigana and the translation, each with room of its own. */
export const StorySubtitle = forwardRef<HTMLDivElement, StorySubtitleProps>(function StorySubtitle({ speaker, color = "#8A4B2A", tokens, token = -1, gloss, readings = true, ink = "#3A2A20", marker, unit = "1px", size, room = 1640, style, ...props }, ref) {
  const px = (n: number) => `calc(${n} * ${unit})`, main = size ?? subtitleSize(tokens, room);
  return <div {...props} ref={ref} data-story-subtitle style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: ink, fontFamily: "var(--storybook-ja,'Klee One','Klee','YuKyokasho','Hiragino Maru Gothic ProN','Hiragino Sans','Noto Sans JP',sans-serif)", ...style }}>
    <p style={{ margin: 0, fontSize: px(main), lineHeight: 1.24, fontWeight: 600, letterSpacing: "0.02em", paddingTop: readings ? "0.14em" : 0 }}>
      {speaker && <span style={{ display: "inline-block", color, fontSize: "0.56em", fontWeight: 600, marginInlineEnd: "0.9em", verticalAlign: "0.16em", whiteSpace: "nowrap" }}><Furigana tokens={speaker} readings={readings} readingSize={0.46} /></span>}
      <Furigana tokens={tokens} token={token} readings={readings} marker={marker} />
    </p>
    {gloss && <p lang="en" style={{ margin: 0, marginTop: px(10), fontFamily: "var(--storybook-en,'Newsreader Variable','Palatino Linotype',Palatino,Georgia,serif)", fontSize: px(Math.max(30, Math.min(36, main * 0.52))), lineHeight: 1.25, fontStyle: "italic", color: "#6A5343" }}>{gloss}</p>}
  </div>;
});
