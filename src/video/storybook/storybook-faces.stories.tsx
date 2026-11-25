import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { mouthAt, mouthKeys } from "../../../registry/video/storybook/speech-mouth";
import { StorybookFilmPlayer } from "../../../registry/video/storybook/storybook-film-react";
import { KONBINI_CAST, KONBINI_LINES } from "./konbini-film";
import { lookBench, looksOf, sayBench } from "./story-benches";
import { StoryPage, StoryStill } from "./story-page";

const meta: Meta = { title: "Video production/Japanese Retro Watercolor/Faces and Lip Sync", id: "video-storybook-faces", parameters: { layout: "fullscreen" } };
export default meta;
function Looks({ who }: { who: "ema" | "riku" }) {
  const films = useMemo(() => looksOf(who).map(look => ({ look, film: lookBench(who, look) })), [who]);
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 14 }}>{films.map(({ look, film }) => <figure key={look} style={{ margin: 0 }}><StoryStill film={film} pixels={420} /><figcaption style={{ padding: "6px 0", font: "500 15px/1.3 system-ui, sans-serif" }}>{look}</figcaption></figure>)}</div>;
}
export const Ema: StoryObj = { name: "Expressions: Emma", render: () => <StoryPage title="Expressions: Emma" about="Painted for each expression and cut into the same head. Names that were not painted show the nearest painted one."><Looks who="ema" /></StoryPage> };
export const Riku: StoryObj = { name: "Expressions: Riku", render: () => <StoryPage title="Expressions: Riku"><Looks who="riku" /></StoryPage> };

function Says({ line }: { line: string }) {
  const film = useMemo(() => sayBench(line), [line]), l = KONBINI_LINES[line], keys = useMemo(() => mouthKeys(l.track), [l]), [frame, setFrame] = useState(0), t = frame / film.fps - 0.35, m = mouthAt(keys, t), end = l.track.seconds;
  return <div style={{ display: "grid", gridTemplateColumns: "minmax(0,900px)", gap: 10 }}>
    <StorybookFilmPlayer film={film} onSeek={setFrame} pixels={900} options={false} />
    <svg viewBox="0 0 900 88" role="img" aria-label={`Sounds of ${l.en ?? l.ja}`} style={{ width: "100%" }}>
      {l.track.phones.map((p, i) => <g key={i}><rect x={(p.start / end) * 900} y={10} width={Math.max(1, ((p.end - p.start) / end) * 900 - 1.5)} height={44} fill={t >= p.start && t < p.end ? "#D9825B" : "#E5D3B0"} /><text x={((p.start + p.end) / 2 / end) * 900} y={38} fontSize={16} textAnchor="middle" fill="#3A2A20" fontFamily="system-ui, sans-serif">{p.p}</text></g>)}
      <line x1={(t / end) * 900} x2={(t / end) * 900} y1={2} y2={62} stroke="#8C1F14" strokeWidth={2} /><text x={0} y={82} fontSize={16} fill="#3A2A20" fontFamily="system-ui, sans-serif">mouth: {m.from} → {m.to}, {Math.round(m.mix * 100)}% · {l.track.precision}</text>
    </svg>
  </div>;
}
/** Mouths follow the sounds of the recording: vowels, closed lips, long vowels, small っ, ん by the sound after it. */
export const LipSync: StoryObj<{ line: string }> = { name: "Lip sync", args: { line: "onigiri-please" }, argTypes: { line: { control: "select", options: Object.keys(KONBINI_LINES) } }, render: ({ line }) => <StoryPage title="Lip sync" about={`${KONBINI_CAST[KONBINI_LINES[line].speaker].name}: ${KONBINI_LINES[line].en}`}><Says line={line} /></StoryPage> };
