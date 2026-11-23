import { useEffect, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { RIG_PRESETS } from "../../registry/rig/rig-presets";
import type { RigPresetEntry } from "../../registry/rig/rig-presets";
import { RIG_LOOKS, RigScene, followCamera } from "../../registry/rig/rig-react";
import type { RigCamera, RigLook } from "../../registry/rig/rig-react";
import "../styles/collage-fonts.css";
import { CollageScene } from "../../registry/video/collage/collage-react";
import type { CollageSceneSpec } from "../../registry/video/collage/collage-scene";

const W = 1600, H = 900, GROUND = 720, DURATION = 240;
const page = { display: "grid", gap: 16, padding: 24, minHeight: "100vh", background: "#f4f1ea", color: "#26231f", font: "15px/1.45 system-ui, sans-serif" } as const;
const label = { display: "grid", gap: 5, font: "600 13px system-ui", minWidth: 150 } as const;
const button = { border: "1px solid #a39a8c", borderRadius: 7, background: "#ffffff", color: "#26231f", padding: "8px 13px", minHeight: 38, cursor: "pointer", font: "600 13px system-ui" } as const;
const active = { ...button, background: "#26231f", color: "#ffffff", border: "1px solid #26231f" } as const;
const row = { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" } as const;
const rowLabel = { font: "700 12px system-ui", letterSpacing: 1.2, textTransform: "uppercase", color: "#6b6258", minWidth: 74 } as const;

function useLoop(max: number, initial: number, autoplay = false) {
  const [frame, setFrame] = useState(initial);
  const [playing, setPlaying] = useState(autoplay);
  const from = useRef(initial);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const start = performance.now(), first = from.current;
    const tick = (now: number) => { setFrame((first + Math.floor((now - start) * 30 / 1000)) % (max + 1)); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, max]);
  return { frame, playing, seek: (f: number) => { setPlaying(false); setFrame(f); from.current = f; }, toggle: () => { from.current = frame; setPlaying(p => !p); } };
}

type CameraMode = "follow" | "locked";
/** Where a preset stands and how it travels: natural speed, a tracking camera for long runs, staged paths for actions. */
function stage(entry: RigPresetEntry, motion: string, mode: CameraMode, id = entry.id, size = entry.size) {
  const air = entry.airborne?.(motion) ?? false, pace = entry.pace?.(motion, size) ?? 0, staged = entry.staged?.(motion) ?? false;
  const y = !air ? (entry.id === "ship" ? GROUND - 10 : GROUND) : entry.id === "fish" ? GROUND - 170 : entry.id === "balloon" ? GROUND - 60 : entry.id === "butterfly" ? 430
    : entry.id === "bird" ? 380 : entry.id === "dragon" ? 400 : 360;
  let from = W / 2, to = W / 2;
  if (staged) {
    if (motion === "brake" || motion === "sudden-brake" || motion === "stop" || motion === "sudden-stop") { from = -size * .8; to = W * .6; }
    else if (motion === "reverse") { from = W * .7; to = W * .32; }
    else if (motion === "turn-away" || motion === "turn-toward") { from = -size * .7; to = W + size * .7; }
  } else if (entry.travels(motion) && pace > 0) {
    const dist = pace * DURATION;
    if (mode === "follow") { from = 0; to = dist; }
    else if (dist < W * .7) { from = W / 2 - dist / 2; to = W / 2 + dist / 2; }
    else { from = -size * .6; to = from + dist; }
  }
  const spec = entry.build({ id, size, motion, start: 0, end: DURATION, y, from, to });
  const follows = mode === "follow" && !staged && entry.travels(motion) && pace > 0;
  // Turns in depth need a ground plane that reaches up toward the horizon, or a receding car would float.
  const horizon = motion === "turn-away" ? GROUND - size * .5 : GROUND;
  return { spec, follows, y, horizon };
}
const defaultMode = (entry: RigPresetEntry, motion: string): CameraMode =>
  !entry.staged?.(motion) && entry.travels(motion) && (entry.pace?.(motion, entry.size) ?? 0) * DURATION > W * .7 ? "follow" : "locked";

function Controls({ loop }: { loop: ReturnType<typeof useLoop> }) {
  return <div style={{ display: "flex", gap: 12, alignItems: "end", maxWidth: 1120 }}>
    <button type="button" style={button} onClick={loop.toggle}>{loop.playing ? "Pause" : "Play"}</button>
    <label style={{ ...label, flex: 1 }}>Frame · {loop.frame}<input type="range" aria-label="Rig frame" min={0} max={DURATION - 1} value={loop.frame} onChange={e => loop.seek(Number(e.target.value))} /></label>
  </div>;
}

function RigLab() {
  const [subject, setSubject] = useState("horse");
  const entry = RIG_PRESETS.find(p => p.id === subject)!;
  const [motion, setMotion] = useState("gallop");
  const m = entry.motions.includes(motion) ? motion : entry.motions[0];
  const [look, setLook] = useState<RigLook>("collage");
  const [bones, setBones] = useState(false);
  const [cadence, setCadence] = useState(1);
  const [mode, setMode] = useState<CameraMode | null>(null);
  const cam = mode ?? defaultMode(entry, m);
  const loop = useLoop(DURATION - 1, 70);
  const { spec, follows, horizon } = useMemo(() => stage(entry, m, cam), [entry, m, cam]);
  const camera: RigCamera | undefined = follows ? followCamera(spec, loop.frame, { y: H / 2, lead: entry.size * .08 }) : undefined;
  const groups = ["people", "animals", "creatures", "vehicles", "objects"] as const;
  return <div style={page}>
    <header style={{ maxWidth: 980 }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2.5, color: "#8a3b28", textTransform: "uppercase" }}>Universal rig · RIG1</div>
      <h1 style={{ margin: "6px 0", font: "700 clamp(26px,3vw,38px)/1.1 Georgia, serif" }}>One rig, any film look</h1>
      <p style={{ margin: 0, maxWidth: 900 }}>Every subject is one style-agnostic rig evaluated from the frame number alone. Gaits use real footfall orders
        (a horse gallops LH-RH-LF-RF with one gathered suspension; dogs flex their spine through a rotary gallop), feet plant with IK and roll
        off the toe, wings beat about the body's long axis and fold back on the upstroke, cars dive under braking and turn in depth. Animations
        play on ones; switch to twos for a stop-motion feel.</p>
    </header>
    {groups.map(g => <nav key={g} aria-label={g} style={row}><span style={rowLabel}>{g}</span>
      {RIG_PRESETS.filter(p => p.group === g).map(p => <button type="button" key={p.id} style={p.id === subject ? active : button} aria-pressed={p.id === subject}
        onClick={() => { setSubject(p.id); setMotion(p.motions[0]); setMode(null); }}>{p.label}</button>)}</nav>)}
    <nav aria-label="Motions" style={row}><span style={rowLabel}>Motion</span>
      {entry.motions.map(x => <button type="button" key={x} style={x === m ? active : button} aria-pressed={x === m} onClick={() => { setMotion(x); setMode(null); }}>{x}</button>)}</nav>
    <nav aria-label="Film looks" style={row}><span style={rowLabel}>Look</span>
      {RIG_LOOKS.map(l => <button type="button" key={l.id} style={l.id === look ? active : button} aria-pressed={l.id === look} onClick={() => setLook(l.id)}>{l.label}</button>)}</nav>
    <div style={{ width: 1120, maxWidth: "100%", aspectRatio: "16 / 9", boxShadow: "0 14px 44px rgba(40,30,20,.2)", overflow: "hidden" }}>
      <RigScene look={look} width={W} height={H} ground={horizon} frame={loop.frame} rigs={[spec]} showBones={bones} cadence={cadence} camera={camera} aria-label={`${entry.label}, ${m}, ${look}`} />
    </div>
    <Controls loop={loop} />
    <div style={{ ...row, gap: 18 }}>
      <div style={row} role="group" aria-label="Camera"><span style={rowLabel}>Camera</span>
        {(["follow", "locked"] as const).map(c => <button type="button" key={c} style={c === cam ? active : button} aria-pressed={c === cam} onClick={() => setMode(c)}>{c === "follow" ? "Tracking" : "Locked off"}</button>)}</div>
      <div style={row} role="group" aria-label="Timing"><span style={rowLabel}>Timing</span>
        {[[1, "Smooth · on ones"], [2, "Stop-motion · on twos"]].map(([c, l]) => <button type="button" key={c} style={c === cadence ? active : button} aria-pressed={c === cadence} onClick={() => setCadence(c as number)}>{l}</button>)}</div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, font: "600 13px system-ui" }}><input type="checkbox" checked={bones} onChange={e => setBones(e.target.checked)} /> Show bones</label>
    </div>
  </div>;
}

/** A closer frame for a small tile: tracking travelling motions, holding on the subject otherwise. */
function tileCamera(entry: RigPresetEntry, t: ReturnType<typeof stage>, frame: number): RigCamera {
  const air = t.y !== GROUND, zoom = entry.group === "vehicles" || entry.id === "dragon" ? 1.25 : 1.7;
  const y = air ? t.y : Math.min(GROUND - entry.size * .32, t.horizon + (GROUND - t.horizon) * .5);
  return t.follows ? { ...followCamera(t.spec, frame, { y, lead: entry.size * .08 }), zoom } : { x: W / 2, y, zoom: t.horizon < GROUND ? 1 : zoom };
}

/** Every motion of one subject side by side, playing together: the quickest way to compare actions. */
function ActionSheet() {
  const [subject, setSubject] = useState("person");
  const [look, setLook] = useState<RigLook>("flat");
  const entry = RIG_PRESETS.find(p => p.id === subject)!;
  const loop = useLoop(DURATION - 1, 0, true);
  const tiles = useMemo(() => entry.motions.map(motion => ({ motion, ...stage(entry, motion, defaultMode(entry, motion), entry.id + "-" + motion) })), [entry]);
  return <div style={page}>
    <header><h1 style={{ margin: 0, font: "700 32px/1.15 Georgia, serif" }}>Action sheet</h1>
      <p style={{ margin: "6px 0 0", maxWidth: 820 }}>Every motion of one rig, playing together on ones. Travelling motions are tracked by the camera so the gait stays in frame.</p></header>
    <nav aria-label="Subjects" style={row}>{RIG_PRESETS.filter(p => p.motions.length > 1).map(p => <button type="button" key={p.id} style={p.id === subject ? active : button} aria-pressed={p.id === subject} onClick={() => setSubject(p.id)}>{p.label}</button>)}</nav>
    <nav aria-label="Film looks" style={row}>{RIG_LOOKS.map(l => <button type="button" key={l.id} style={l.id === look ? active : button} aria-pressed={l.id === look} onClick={() => setLook(l.id)}>{l.label}</button>)}</nav>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
      {tiles.map(t => <figure key={t.motion} style={{ margin: 0, background: "#fff", boxShadow: "0 4px 14px rgba(40,30,20,.12)" }}>
        <div style={{ aspectRatio: "16 / 9", overflow: "hidden" }}>
          <RigScene look={look} width={W} height={H} ground={t.horizon} frame={loop.frame} rigs={[t.spec]} aria-label={`${entry.label}, ${t.motion}`}
            camera={tileCamera(entry, t, loop.frame)} />
        </div>
        <figcaption style={{ padding: "8px 12px", font: "600 14px system-ui" }}>{t.motion}</figcaption>
      </figure>)}
    </div>
    <Controls loop={loop} />
  </div>;
}

/** Everything at once: a procession of rigs across one board, in the chosen look. */
function RigParade() {
  const [look, setLook] = useState<RigLook>("flat");
  const loop = useLoop(DURATION - 1, 120);
  const rigs = useMemo(() => {
    const pick = (id: string, motion: string, from: number, to: number, size: number, y = GROUND) => RIG_PRESETS.find(p => p.id === id)!.build({ id: id + "-parade", size, motion, start: 0, end: DURATION, y, from, to });
    return [
      pick("clock", "tick", 1420, 1420, 360, GROUND - 230),
      pick("balloon", "float", 1180, 1240, 300, 330),
      pick("plane", "fly", -300, W + 300, 340, 200),
      pick("dragon", "fly", W + 500, -500, 420, 360),
      pick("locomotive", "run", -700, W + 200, 600, GROUND - 4),
      pick("modern-car", "drive", W + 300, -300, 380, GROUND + 60),
      pick("horse", "canter", -200, 1500, 330, GROUND + 40),
      pick("bicycle", "ride", 300, 900, 260, GROUND + 70),
      pick("dog", "trot", 360, 1060, 200, GROUND + 90),
      pick("person", "walk", 520, 920, 280, GROUND + 100),
      pick("bird", "fly", 200, 1300, 110, 300),
      pick("butterfly", "flutter", 700, 1000, 90, 560),
    ];
  }, []);
  return <div style={page}>
    <header><h1 style={{ margin: 0, font: "700 32px/1.15 Georgia, serif" }}>Rig parade</h1>
      <p style={{ margin: "6px 0 0", maxWidth: 820 }}>Twelve rigs moving together on one board — switch the film look and every one of them redraws in the new medium.</p></header>
    <nav aria-label="Film looks" style={row}>
      {RIG_LOOKS.map(l => <button type="button" key={l.id} style={l.id === look ? active : button} aria-pressed={l.id === look} onClick={() => setLook(l.id)}>{l.label}</button>)}
    </nav>
    <div style={{ width: 1120, maxWidth: "100%", aspectRatio: "16 / 9", boxShadow: "0 14px 44px rgba(40,30,20,.2)", overflow: "hidden" }}>
      <RigScene look={look} width={W} height={H} ground={GROUND} frame={loop.frame} rigs={rigs} aria-label={"Rig parade, " + look} />
    </div>
    <Controls loop={loop} />
  </div>;
}

const meta = { title: "Video production/Film Looks/Universal Rig", id: "video-universal-rig", component: RigLab, parameters: { layout: "fullscreen" } } satisfies Meta<typeof RigLab>;
export default meta;
export const Lab: StoryObj<typeof RigLab> = { name: "RIG1 · One rig, any film look", render: () => <RigLab /> };
export const Actions: StoryObj<typeof RigLab> = { name: "RIG1 · Action sheet", render: () => <ActionSheet /> };
export const Parade: StoryObj<typeof RigLab> = { name: "RIG1 · Rig parade", render: () => <RigParade /> };

/** RIG1 rigs inside a COLLAGE1 scene: rigged figures sit on the same board as paper cut-outs, type and camera. */
function RigInCollage() {
  const loop = useLoop(DURATION - 1, 100);
  const spec = useMemo<CollageSceneSpec>(() => {
    const p = (id: string, motion: string, size: number, from: number, to: number, y = 0) => RIG_PRESETS.find(e => e.id === id)!.build({ id: id + "-c", size, motion, start: 0, end: DURATION, y, from, to });
    return {
      version: 1, id: "rig-in-collage", width: W, height: H, durationFrames: DURATION, seed: 21, cadence: 1, grain: .35,
      board: { material: "kraft" }, palette: { ink: "#1d1b19", cream: "#f2e9d6", red: "#c62f26" },
      camera: [{ frame: 0, x: W / 2, y: H / 2, zoom: 1.04 }, { frame: DURATION - 1, x: W / 2 + 20, y: H / 2, zoom: 1.08, ease: "linear" }],
      nodes: [
        { id: "ground", kind: "cutout", x: W / 2, y: GROUND + 100, shape: { type: "rect", width: W * 1.2, height: 220 }, fill: "cream", edge: "torn", roughness: 5 },
        { id: "rails", kind: "cutout", x: W / 2, y: GROUND + 6, shape: { type: "rect", width: W * 1.2, height: 10 }, fill: "#5a4636", edge: "cut", shadow: .4 },
        { id: "dragon", kind: "rig", rig: p("dragon", "fly", 380, W + 400, -500, 250), depth: .9 },
        { id: "train", kind: "rig", rig: p("locomotive", "run", 620, -800, W + 200, GROUND) },
        { id: "walker", kind: "rig", rig: p("person", "walk", 300, 260, 640, GROUND + 90), depth: 1.1 },
        { id: "dog", kind: "rig", rig: p("dog", "trot", 200, 120, 1100, GROUND + 92), depth: 1.1 },
        { id: "title", kind: "text", depth: 0, x: 80, y: 120, text: "ANY RIG, ON PAPER", role: "headline", size: 84, color: "cream", slip: { fill: "ink", perWord: true, padding: 14, edge: "cut" },
          reveal: { by: "word", frame: 6, stagger: 6, preset: "stamp" } },
      ],
    };
  }, []);
  return <div style={page}>
    <header><h1 style={{ margin: 0, font: "700 32px/1.15 Georgia, serif" }}>Rigs inside a collage film</h1>
      <p style={{ margin: "6px 0 0", maxWidth: 820 }}>A COLLAGE1 scene with <code>rig</code> nodes: a person walking a dog, a steam train and a dragon overhead,
        on the same board as torn paper and pasted-up type, under one camera.</p></header>
    <div style={{ width: 1120, maxWidth: "100%", aspectRatio: "16 / 9", boxShadow: "0 14px 44px rgba(40,30,20,.2)", overflow: "hidden" }}>
      <CollageScene spec={spec} frame={loop.frame} />
    </div>
    <Controls loop={loop} />
  </div>;
}
export const InCollage: StoryObj<typeof RigLab> = { name: "RIG1 · Rigs inside a collage film", render: () => <RigInCollage /> };

const INK_PICKS = [["person", "walk"], ["horse", "gallop"], ["bird", "fly"], ["fish", "swim"], ["dragon", "fly"]] as const;
/** Five subjects in Chinese ink on xuan paper, each tracked closely: the brushwork must stay on the parts as they move. */
function InkSheet() {
  const loop = useLoop(DURATION - 1, 40);
  const tiles = useMemo(() => INK_PICKS.map(([id, motion]) => {
    const entry = RIG_PRESETS.find(p => p.id === id)!;
    return { entry, motion, ...stage(entry, motion, defaultMode(entry, motion), id + "-ink") };
  }), []);
  return <div style={page}>
    <header><h1 style={{ margin: 0, font: "700 32px/1.15 Georgia, serif" }}>In Chinese ink</h1>
      <p style={{ margin: "6px 0 0", maxWidth: 860 }}>The ink look paints each part with the style's own engines: a pale first wash on the exact
        silhouette, side-brush strokes deposited by the INK1 wet-paper engine, lost-and-found pressure contours on the silhouette only, dark ink
        for eyes and hooves, and a light traditional pigment taken from the palette's hue, on xuan paper. The marks are computed once per part,
        in the part's own space, so they ride with it frame after frame.</p></header>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
      {tiles.map(t => <figure key={t.entry.id} style={{ margin: 0, background: "#fff", boxShadow: "0 4px 14px rgba(40,30,20,.12)" }}>
        <div style={{ aspectRatio: "16 / 9", overflow: "hidden" }}>
          <RigScene look="ink" width={W} height={H} ground={t.horizon} frame={loop.frame} rigs={[t.spec]} aria-label={`${t.entry.label}, ${t.motion}, ink`}
            camera={tileCamera(t.entry, t, loop.frame)} />
        </div>
        <figcaption style={{ padding: "8px 12px", font: "600 14px system-ui" }}>{t.entry.label} · {t.motion}</figcaption>
      </figure>)}
    </div>
    <Controls loop={loop} />
  </div>;
}
export const InInk: StoryObj<typeof RigLab> = { name: "RIG1 · In Chinese ink", render: () => <InkSheet /> };
