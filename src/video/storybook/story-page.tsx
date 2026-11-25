import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import "@fontsource/klee-one/400.css";
import "@fontsource/klee-one/600.css";
import "@fontsource-variable/newsreader";
import "@fontsource-variable/newsreader/wght-italic.css";
import { StorybookFilmPlayer, StorybookFilmStage } from "../../../registry/video/storybook/storybook-film-react";
import { planStorybook } from "../../../registry/video/storybook/storybook-film";
import type { StoryFrame, StorybookFilm } from "../../../registry/video/storybook/storybook-film";
import { paintedSocket } from "../../../registry/rig/rig-look-painted";

/** Fonts of the demos (both SIL OFL 1.1): a pen hand for Japanese, a serif for English. */
export const STORYBOOK_WORDS = { "--storybook-ja": "'Klee One', 'Hiragino Mincho ProN', serif", "--storybook-en": "'Newsreader Variable', 'Palatino Linotype', Georgia, serif" } as CSSProperties;
export function StoryPage({ title, about, children, wide = true }: { title?: string; about?: ReactNode; children: ReactNode; wide?: boolean }) {
  return <main style={{ minHeight: "100vh", boxSizing: "border-box", padding: "24px 20px", background: "#EFE4CC", color: "#3A2A20", ...STORYBOOK_WORDS }}>
    <div style={{ maxWidth: wide ? 1280 : 820, margin: "0 auto" }}>
      {title && <h1 style={{ margin: "0 0 4px", font: "600 26px/1.3 var(--storybook-ja)" }}>{title}</h1>}
      {about && <p style={{ margin: "0 0 16px", maxWidth: "68ch", font: "400 16px/1.55 system-ui, sans-serif" }}>{about}</p>}
      {children}
    </div>
  </main>;
}
export const StoryFilm = (p: { film: StorybookFilm; loop?: boolean; autoPlay?: boolean; start?: number; wide?: boolean; pixels?: number; children?: (f: StoryFrame) => ReactNode }) => <StoryPage wide={p.wide}><StorybookFilmPlayer film={p.film} loop={p.loop} autoPlay={p.autoPlay} start={p.start} pixels={p.pixels ?? Math.min(1440, p.film.size.width)}>{p.children}</StorybookFilmPlayer></StoryPage>;
/** A silent bench film that plays round and round. */
export const StoryBench = ({ film, children, pixels }: { film: StorybookFilm; children?: (f: StoryFrame) => ReactNode; pixels?: number }) => <StorybookFilmPlayer film={film} loop autoPlay options={false} speeds={[1, 0.5, 0.25]} pixels={pixels ?? Math.min(1200, film.size.width)}>{children}</StorybookFilmPlayer>;
/** One frame, nothing moves. */
export const StoryStill = ({ film, frame = 0, pixels, children }: { film: StorybookFilm; frame?: number; pixels?: number; children?: (f: StoryFrame) => ReactNode }) => <StorybookFilmStage film={film} frame={frame} still pixels={pixels ?? Math.min(1200, film.size.width)}>{children}</StorybookFilmStage>;

/** Bones, joints, sockets and hands of everyone in the frame, drawn over the picture. */
export function RigOverlay({ frame, film, names = true }: { frame: StoryFrame; film: StorybookFilm; names?: boolean }) {
  const { width, height } = film.size, unit = width / 1000;
  return <svg viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
    {frame.played.map(p => <g key={p.role.actor + (p.role.view ?? "") + String(p.role.path)}>
      {p.spec.bones.filter(b => b.parent).map(b => {
        const now = p.frame.bones.get(b.id), up = p.frame.bones.get(b.parent!); if (!now || !up) return null;
        const [x, y] = frame.view.put(now.world.e, now.world.f), [X, Y] = frame.view.put(up.world.e, up.world.f);
        return <g key={b.id}><line x1={X} y1={Y} x2={x} y2={y} stroke="#fff" strokeWidth={4 * unit} opacity={0.75} /><line x1={X} y1={Y} x2={x} y2={y} stroke="#B3261E" strokeWidth={1.8 * unit} /><circle cx={x} cy={y} r={3.4 * unit} fill="#fff" stroke="#B3261E" strokeWidth={1.4 * unit} /></g>;
      })}
      {Object.keys(p.figure.art.sockets ?? {}).map(id => {
        const s = paintedSocket(p.figure.art, p.frame, id); if (!s) return null; const [x, y] = frame.view.put(s.at[0], s.at[1]), a = (s.angle * Math.PI) / 180;
        return <g key={id}><circle cx={x} cy={y} r={5 * unit} fill="none" stroke="#1C4E80" strokeWidth={2 * unit} /><line x1={x} y1={y} x2={x + Math.cos(a) * 14 * unit} y2={y + Math.sin(a) * 14 * unit} stroke="#1C4E80" strokeWidth={2 * unit} />{names && <text x={x + 8 * unit} y={y - 7 * unit} fontSize={13 * unit} fontFamily="system-ui, sans-serif" fill="#1C4E80" stroke="#fff" strokeWidth={3 * unit} paintOrder="stroke">{id}</text>}</g>;
      })}
    </g>)}
  </svg>;
}

/** Frame by frame: pick a frame, see it large with its rig and what is happening in it. */
export function FrameInspector({ film, start = 0 }: { film: StorybookFilm; start?: number }) {
  const plan = useMemo(() => planStorybook(film), [film]), [frame, setFrame] = useState(start), [rig, setRig] = useState(true), [now, setNow] = useState<StoryFrame | null>(null);
  const t = frame / film.fps, cell = { padding: "4px 12px 4px 0", verticalAlign: "top" } as const;
  return <div>
    <StorybookFilmStage film={film} frame={frame} pixels={Math.min(1440, film.size.width)} onFrame={setNow}>{f => (rig ? <RigOverlay frame={f} film={film} /> : null)}</StorybookFilmStage>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", padding: "10px 0", font: "500 15px/1.2 system-ui, sans-serif" }}>
      {[-12, -1, 1, 12].map(d => <button key={d} type="button" onClick={() => setFrame(f => Math.min(plan.frames - 1, Math.max(0, f + d)))} style={{ minWidth: 48, minHeight: 40, borderRadius: 4, border: "1px solid #8C7766", background: "transparent", color: "inherit", font: "inherit" }}>{d > 0 ? `+${d}` : d}</button>)}
      <input type="range" min={0} max={plan.frames - 1} value={frame} aria-label="Frame" onChange={e => setFrame(Number(e.target.value))} style={{ flex: "1 1 260px", minWidth: 12 }} />
      <span style={{ fontVariantNumeric: "tabular-nums" }}>frame {frame} of {plan.frames - 1} · {t.toFixed(2)} s</span>
      <label style={{ display: "inline-flex", gap: 6, alignItems: "center", minHeight: 40 }}><input type="checkbox" checked={rig} onChange={e => setRig(e.target.checked)} />Rig</label>
    </div>
    {now && <table style={{ borderCollapse: "collapse", font: "400 15px/1.45 system-ui, sans-serif" }}><tbody>
      <tr><th scope="row" align="left" style={cell}>Shot</th><td style={cell}>{now.shot.shot.id}: {now.shot.shot.label}</td></tr>
      {now.played.map(p => <tr key={p.role.actor}><th scope="row" align="left" style={cell}>{film.cast[p.role.actor].name}</th><td style={cell}>{(p.role.acts ?? []).filter(a => t - now.shot.start >= a.at && t - now.shot.start <= a.at + (a.for ?? 1)).map(a => a.act).join(", ") || "idle"}</td></tr>)}
    </tbody></table>}
  </div>;
}
