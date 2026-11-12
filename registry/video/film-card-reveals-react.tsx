/** Draws the headline reveals of `film-card-reveals.ts`: scramble, weight swell and rebuild. Each lays out the finished line first and
 * draws its moving letters over that layout, so the line never reflows while it arrives and the landed frame is the line as measured. */
import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { rebuildPairs, rebuildTravel, scrambleFrame, swellWeight } from "./film-card-reveals";

/** Character ranges of `text` inside `emphasis`, to colour them. */
const emphasized = (text: string, emphasis?: string) => {
  const at = emphasis ? text.indexOf(emphasis) : -1;
  return (i: number) => at >= 0 && i >= at && i < at + emphasis!.length;
};
const HIDDEN: CSSProperties = { visibility: "hidden" };

/** Letters that cycle through random characters and lock in, left to right. Each letter's own glyph holds its place, hidden, while the
 * random one is drawn over it, so the line keeps its final shape. */
export function ScrambleLine({ text, frame, start, emphasis, ink, accent, seed }: { text: string; frame: number; start: number; emphasis?: string; ink: string; accent: string; seed: number }) {
  const letters = scrambleFrame(text, frame, start, seed), lit = emphasized(text, emphasis), done = letters.every(item => item.locked && item.visible);
  return <span {...done ? {} : { "data-km-text-entering": "" }}>{letters.map((item, i) => item.locked
    ? <span key={i} style={{ color: lit(i) ? accent : ink, opacity: item.visible ? 1 : 0 }}>{item.final}</span>
    : <span key={i} style={{ position: "relative", display: "inline-block" }}>
        <span style={HIDDEN}>{item.final}</span>
        <span aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, textAlign: "center", color: lit(i) ? accent : ink, opacity: item.visible ? .82 : 0 }}>{item.shown}</span>
      </span>)}</span>;
}

/** Words that arrive thin and swell to heavy. The heavy word holds its place, hidden, while the swelling one is drawn centred over it, so the
 * line does not reflow as weight widens the letters. Needs a variable font; others step between their weights. */
export function WeightLine({ text, frame, start, emphasis, ink, accent, heavy = 820 }: { text: string; frame: number; start: number; emphasis?: string; ink: string; accent: string; heavy?: number }) {
  const tokens = text.split(/(\s+)/), lit = emphasized(text, emphasis);
  let word = 0, pos = 0;
  return <>{tokens.map((token, i) => {
    const at = pos; pos += token.length;
    if (!token.trim()) return token;
    const n = word++, weight = swellWeight(frame, start, n, heavy), arriving = frame - start - n * 3, color = lit(at) ? accent : ink;
    if (arriving < 0) return <span key={i} style={HIDDEN}>{token}</span>;
    if (weight >= heavy - .5) return <span key={i} style={{ color, fontWeight: heavy }}>{token}</span>;
    return <span key={i} data-km-text-entering="" style={{ position: "relative", display: "inline-block" }}>
      <span style={{ ...HIDDEN, fontWeight: heavy }}>{token}</span>
      <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: 0, transform: "translateX(-50%)", whiteSpace: "nowrap", fontWeight: weight, color, opacity: Math.min(1, (arriving + 1) / 4) }}>{token}</span>
    </span>;
  })}</>;
}

/** A letter's measured box is its font's content area; a moving letter takes that height as its line height, so its glyph sits exactly
 * where the laid-out letter's does and the landed line does not jump. */
type Rect = { x: number; y: number; width: number; height: number };
/** A line rebuilt into another: `from` is read, then its letters fly to their places in `text`; letters `text` lacks shrink away and new ones
 * grow in. Both lines are laid out (hidden) and their letters measured where the browser put them, so the move fits any font and wrap. */
export function RebuildLine({ from, text, frame, start, travelAt, landed, emphasis, ink, accent }: { from: string; text: string; frame: number; start: number; travelAt: number; landed: number; emphasis?: string; ink: string; accent: string }) {
  const box = useRef<HTMLSpanElement | null>(null), [measured, setMeasured] = useState<{ key: string; from: Rect[]; to: Rect[] }>();
  const key = `${from}\u0000${text}`, lit = emphasized(text, emphasis);
  // Every render, because the card's size and font can change; it sets state only when a letter moves.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const root = box.current;
    if (!root) return;
    const origin = root.getBoundingClientRect(), scale = root.offsetWidth ? origin.width / root.offsetWidth : 1;
    const read = (layer: string) => [...root.querySelectorAll<HTMLElement>(`[data-km-rebuild="${layer}"] > span`)].map(el => {
      const r = el.getBoundingClientRect();
      return { x: (r.left - origin.left) / scale, y: (r.top - origin.top) / scale, width: r.width / scale, height: r.height / scale };
    });
    const next = { key, from: read("from"), to: read("to") };
    const same = measured?.key === key && next.from.every((r, i) => Math.abs(r.x - measured.from[i]?.x) < .5 && Math.abs(r.y - measured.from[i]?.y) < .5) && next.to.every((r, i) => Math.abs(r.x - measured.to[i]?.x) < .5 && Math.abs(r.y - measured.to[i]?.y) < .5);
    if (!same) setMeasured(next);
  });
  const ready = measured?.key === key, moving = frame >= travelAt && frame < landed && ready;
  const pairs = moving ? rebuildPairs(from, text) : undefined, a = [...from], b = [...text];
  const layout = (layer: "from" | "to", chars: string[], style: CSSProperties) => <span data-km-rebuild={layer} aria-hidden={layer === "from" && frame >= travelAt ? "true" : undefined}
    style={{ display: "block", ...style }}>{chars.map((ch, i) => <span key={i} style={{ color: layer === "to" && lit(i) ? accent : ink }}>{ch}</span>)}</span>;
  return <span ref={box} style={{ position: "relative", display: "block" }} {...frame < landed ? { "data-km-text-entering": "" } : {}}>
    {layout("to", b, frame >= landed || (frame >= travelAt && !ready) ? {} : HIDDEN)}
    {layout("from", a, { position: "absolute", left: 0, top: 0, right: 0, ...(frame < travelAt ? { opacity: Math.min(1, Math.max(0, (frame - start + 1) / 5)) } : HIDDEN) })}
    {pairs && <span aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
      {pairs.moves.map(({ from: i, to: j }, k) => {
        const p = rebuildTravel(frame, travelAt, k), f = measured!.from[i], t = measured!.to[j];
        if (!f || !t) return null;
        return <span key={`m${k}`} style={{ position: "absolute", left: f.x + (t.x - f.x) * p, top: f.y + (t.y - f.y) * p, lineHeight: `${t.height}px`, color: lit(j) && p > .5 ? accent : ink, whiteSpace: "pre" }}>{b[j]}</span>;
      })}
      {pairs.leaving.map((i, k) => {
        const f = measured!.from[i], gone = Math.min(1, Math.max(0, (frame - travelAt - k * .3) / 8));
        return f ? <span key={`l${k}`} style={{ position: "absolute", left: f.x, top: f.y, lineHeight: `${f.height}px`, color: ink, opacity: 1 - gone, transform: `scale(${1 - .6 * gone})`, transformOrigin: "50% 60%", whiteSpace: "pre" }}>{a[i]}</span> : null;
      })}
      {pairs.arriving.map((j, k) => {
        const t = measured!.to[j], grown = Math.min(1, Math.max(0, (frame - travelAt - 8 - k * .5) / 9));
        return t ? <span key={`a${k}`} style={{ position: "absolute", left: t.x, top: t.y, lineHeight: `${t.height}px`, color: lit(j) ? accent : ink, opacity: grown, transform: `scale(${.4 + .6 * grown})`, transformOrigin: "50% 60%", whiteSpace: "pre" }}>{b[j]}</span> : null;
      })}
    </span>}
  </span>;
}
