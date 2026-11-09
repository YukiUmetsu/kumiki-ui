import { Suspense, useEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { createShot3dRenderer } from "../../registry/video/film-3d-react";
import type { FilmShot3dContent } from "../../registry/video/film-3d";

const FPS = 30, W = 960, H = 540, FRAMES = 210, render = createShot3dRenderer({});
const fps = { num: FPS, den: 1 };
/** Pairings the audience already knows how to read: the market turning, locking becoming protection, a desk becoming the cloud. The
 * particles are light, so the studios are dark. */
const PAIRS = {
  "bear-to-bull": { from: "bear-market", to: "bull-market", look: "rim", palette: "midnight", title: "The market turned", label: "A bronze bear dissolves from its head down into warm points of light that build a bronze bull on the same plinth." },
  "padlock-to-shield": { from: "padlock", to: "security-shield", look: "strip", palette: "graphite", title: "Locked becomes protected", label: "A padlock dissolves into points of light that build a security shield." },
  "laptop-to-server": { from: "laptop", to: "server-rack", look: "rim", palette: "midnight", title: "From your desk to the cloud", label: "A laptop dissolves into points of light that build a server rack." },
} as const;
type PairId = keyof typeof PAIRS;
const content = (id: PairId): FilmShot3dContent => {
  const pair = PAIRS[id];
  return { shot: "becomes", from: pair.from, to: pair.to, label: pair.label, studio: { look: pair.look, palette: pair.palette },
    spec: { view: { yaw: -28, pitch: 10, fill: .74 }, dissolveFrame: 40, formFrame: 118, orbitAfter: 14, title: { text: pair.title, enter: 132 } } } as FilmShot3dContent;
};

function Player({ pair }: { pair: PairId }) {
  const [frame, setFrame] = useState(0), [playing, setPlaying] = useState(false), clock = useRef({ from: 0, at: 0 });
  useEffect(() => {
    if (!playing) return;
    clock.current = { from: performance.now(), at: frame };
    let id = 0;
    const tick = (now: number) => {
      const next = Math.floor(clock.current.at + (now - clock.current.from) / 1000 * FPS);
      if (next >= FRAMES - 1) { setFrame(FRAMES - 1); setPlaying(false); return; }
      setFrame(next); id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps
  const seek = (to: number) => { setPlaying(false); setFrame(to); };
  const button = { font: "600 13px system-ui", padding: "6px 10px", borderRadius: 6, border: "1px solid #2b3442", background: "#151b23", color: "#c9ced6", cursor: "pointer" } as const;
  return <div style={{ display: "grid", gap: 12, padding: 16, background: "#0b0d10", color: "#e8ecf2", font: "14px system-ui", minHeight: "100vh", alignContent: "start" }}>
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => { if (frame >= FRAMES - 1) setFrame(0); setPlaying(p => !p); }} style={{ ...button, background: "#7cc6ff", color: "#06121f", border: 0, padding: "8px 16px", fontSize: 14 }}>{playing ? "Pause" : "Play"}</button>
      <input type="range" min={0} max={FRAMES - 1} value={frame} onChange={event => seek(Number(event.target.value))} aria-label="Film frame" style={{ width: 380 }} />
      <span style={{ font: "600 13px ui-monospace, monospace", color: "#9aa4b2" }}>{(frame / FPS).toFixed(1)} s</span>
      {[["the first object", 20], ["the change", 80], ["the second object", 160]].map(([label, at]) => <button key={label} type="button" onClick={() => seek(at as number)} style={button}>{label}</button>)}
    </div>
    <div style={{ width: W, height: H, borderRadius: 8, overflow: "hidden", background: "#0b0e12" }}>
      <Suspense fallback={null}>{render(content(pair), { frame, fps, durationFrames: FRAMES })}</Suspense>
    </div>
    <p style={{ margin: 0, maxWidth: W, color: "#9aa4b2", font: "13px/1.5 system-ui" }}>
      A visual simile told in time: the first object dissolves from the top down into points of light that fly to the second and build it where they land, top to top. A shared base stays put. Pick a pairing the audience already knows how to read; metaphors help only viewers who can decode them.
    </p>
  </div>;
}

const meta: Meta = { title: "Video production/Becomes", parameters: { layout: "fullscreen" } };
export default meta;

export const BearToBull: StoryObj = { render: () => <Player pair="bear-to-bull" /> };
export const PadlockToShield: StoryObj = { render: () => <Player pair="padlock-to-shield" /> };
export const LaptopToServer: StoryObj = { render: () => <Player pair="laptop-to-server" /> };
