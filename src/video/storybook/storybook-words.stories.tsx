import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Furigana, StorySubtitle } from "../../../registry/video/storybook/furigana";
import { parseRuby, rubyReading } from "../../../registry/video/storybook/japanese-text";
import { KONBINI_CAST, KONBINI_LINES } from "./konbini-film";
import { StoryPage } from "./story-page";

const meta: Meta = { title: "Video production/Japanese Retro Watercolor/Furigana Subtitles", id: "video-storybook-words", parameters: { layout: "fullscreen" } };
export default meta;
/** Every line of the film, as it is shown. */
export const Lines: StoryObj<{ english: boolean }> = { args: { english: false }, render: ({ english }) => <StoryPage title="Furigana subtitles" about="A reading stands only over kanji, above its own characters.">{Object.entries(KONBINI_LINES).map(([id, l]) => { const who = KONBINI_CAST[l.speaker], tokens = parseRuby(l.ja); return <div key={id} style={{ containerType: "inline-size", padding: "14px 0", borderTop: "1px solid #D8C7A4" }}><StorySubtitle speaker={parseRuby(who.label ?? who.name)} color={who.color} tokens={tokens} gloss={english ? l.en : undefined} unit="0.0781cqw" room={1000} /></div>; })}</StoryPage> };
function Try({ text }: { text: string }) { const [readings, set] = useState(true), tokens = parseRuby(text); return <div><p lang="ja" style={{ margin: "20px 0", font: "600 44px/2 var(--storybook-ja)" }}><Furigana tokens={tokens} readings={readings} /></p><p style={{ font: "400 16px/1.5 system-ui, sans-serif" }}>{rubyReading(tokens)}</p><label style={{ font: "500 16px/2 system-ui, sans-serif" }}><input type="checkbox" checked={readings} onChange={e => set(e.target.checked)} /> Furigana</label></div>; }
/** Write `{漢字|かんじ}` for a reading, and `[は|わ]` for a sound that is not written. */
export const Text: StoryObj<{ text: string }> = { name: "Any text", args: { text: "{京都|きょうと}の コンビニで おにぎりを {買|か}いました。" }, render: ({ text }) => <StoryPage title="Any text"><Try text={text} /></StoryPage> };
