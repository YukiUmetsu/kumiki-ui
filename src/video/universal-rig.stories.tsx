import { useEffect, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { RIG_PRESETS } from "../../registry/rig/rig-presets";
import type { RigPresetEntry } from "../../registry/rig/rig-presets";
import { RIG_LOOKS, RigScene } from "../../registry/rig/rig-react";
import type { RigLook } from "../../registry/rig/rig-react";
import type { RigSpec } from "../../registry/rig/rig-spec";
import "../styles/collage-fonts.css";
import { CollageScene } from "../../registry/video/collage/collage-react";
import type { CollageSceneSpec } from "../../registry/video/collage/collage-scene";

const W = 1600, H = 900, GROUND = 720, DURATION = 240;
const page = { display: "grid", gap: 16, padding: 24, minHeight: "100vh", background: "#f4f1ea", color: "#26231f", font: "15px/1.45 system-ui, sans-serif" } as const;
const label = { display: "grid", gap: 5, font: "600 13px system-ui", minWidth: 150 } as const;
const button = { border: "1px solid #a39a8c", borderRadius: 7, background: "#ffffff", color: "#26231f", padding: "9px 14px", minHeight: 40, cursor: "pointer", font: "600 13px system-ui" } as const;
const active = { ...button, background: "#26231f", color: "#ffffff", border: "1px solid #26231f" } as const;

function useLoop(max: number, initial: number) {
  const [frame, setFrame] = useState(initial);
  const [playing, setPlaying] = useState(false);
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

/** Where a preset sits and how it travels in the lab frame. */
function placeRig(entry: RigPresetEntry, motion: string, id = entry.id, lane = 0): RigSpec {
  const travels = entry.travels(motion);
  const size: Record<string, number> = { person: 360, dog: 320, horse: 420, cat: 280, bird: 180, dragon: 620, fish: 300, locomotive: 760, car: 460, plane: 520, ship: 760, clock: 520 };
  const y = entry.id === "fish" ? GROUND - 180 : entry.id === "ship" ? GROUND - 10 : entry.id === "bird" && motion === "fly" ? 330
    : entry.id === "dragon" && motion === "fly" ? 380 : entry.id === "plane" ? 360 : GROUND - lane * 12;
  const span = entry.id === "locomotive" || entry.id === "ship" ? [-250, W + 300] : entry.id === "plane" || entry.id === "dragon" ? [-300, W + 300] : [180, W - 200];
  return entry.build({ id, size: size[entry.id], motion, start: 0, end: DURATION, y, from: travels ? span[0] : W / 2, to: travels ? span[1] : W / 2 });
}

function RigLab() {
  const [subject, setSubject] = useState("dragon");
  const entry = RIG_PRESETS.find(p => p.id === subject)!;
  const [motion, setMotion] = useState(entry.motions[0]);
  const [look, setLook] = useState<RigLook>("collage");
  const [bones, setBones] = useState(false);
  const loop = useLoop(DURATION - 1, 70);
  const m = entry.motions.includes(motion) ? motion : entry.motions[0];
  const rig = useMemo(() => placeRig(entry, m), [entry, m]);
  return <div style={page}>
    <header style={{ maxWidth: 980 }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2.5, color: "#8a3b28", textTransform: "uppercase" }}>Universal rig · RIG1</div>
      <h1 style={{ margin: "6px 0", font: "700 clamp(26px,3vw,38px)/1.1 Georgia, serif" }}>One rig, any film look</h1>
      <p style={{ margin: 0, maxWidth: 860 }}>Every subject is one style-agnostic rig — bones, parts with material roles and procedural drivers — evaluated
        from the frame number alone. Feet plant with two-bone IK and stay put while the body passes over them; wings beat with a quick
        downstroke and a folding hand; tails and necks ripple; wheels roll by distance; locomotive rods ride their crank pins; smoke is left
        behind. The painter only decides the medium.</p>
    </header>
    <nav aria-label="Subjects" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {RIG_PRESETS.map(p => <button type="button" key={p.id} style={p.id === subject ? active : button} aria-pressed={p.id === subject}
        onClick={() => { setSubject(p.id); setMotion(p.motions[0]); }}>{p.label}</button>)}
    </nav>
    <nav aria-label="Film looks" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {RIG_LOOKS.map(l => <button type="button" key={l.id} style={l.id === look ? active : button} aria-pressed={l.id === look} onClick={() => setLook(l.id)}>{l.label}</button>)}
    </nav>
    <div style={{ width: 1120, maxWidth: "100%", aspectRatio: "16 / 9", boxShadow: "0 14px 44px rgba(40,30,20,.2)", overflow: "hidden" }}>
      <RigScene look={look} width={W} height={H} ground={GROUND} frame={loop.frame} rigs={[rig]} showBones={bones} aria-label={`${entry.label}, ${m}, ${look}`} />
    </div>
    <div style={{ display: "flex", gap: 12, alignItems: "end", maxWidth: 1120 }}>
      <button type="button" style={button} onClick={loop.toggle}>{loop.playing ? "Pause" : "Play"}</button>
      <label style={{ ...label, flex: 1 }}>Frame · {loop.frame}<input type="range" aria-label="Rig frame" min={0} max={DURATION - 1} value={loop.frame} onChange={e => loop.seek(Number(e.target.value))} /></label>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
      <label style={label}>Motion<select aria-label="Motion" value={m} style={{ minHeight: 40, font: "inherit" }} onChange={e => setMotion(e.target.value)}>
        {entry.motions.map(x => <option key={x} value={x}>{x}</option>)}</select></label>
      <label style={{ display: "flex", alignItems: "center", gap: 8, font: "600 13px system-ui" }}><input type="checkbox" checked={bones} onChange={e => setBones(e.target.checked)} /> Show bones</label>
    </div>
  </div>;
}

/** Everything at once: a procession of rigs across one board, in the chosen look. */
function RigParade() {
  const [look, setLook] = useState<RigLook>("flat");
  const loop = useLoop(DURATION - 1, 120);
  const rigs = useMemo(() => {
    const pick = (id: string, motion: string, from: number, to: number, size: number, y = GROUND) => RIG_PRESETS.find(p => p.id === id)!.build({ id: id + "-parade", size, motion, start: 0, end: DURATION, y, from, to });
    return [
      pick("clock", "tick", 1380, 1380, 380, GROUND - 230),
      pick("plane", "fly", -300, W + 300, 360, 260),
      pick("dragon", "fly", W + 500, -500, 420, 380),
      pick("locomotive", "run", -700, W + 200, 620, GROUND - 4),
      pick("horse", "trot", 120, 760, 340),
      pick("dog", "walk", 360, 820, 220),
      pick("person", "walk", 500, 1060, 300),
      pick("cat", "walk", 900, 1240, 190),
      pick("bird", "fly", 200, 1300, 120, 200),
    ];
  }, []);
  return <div style={page}>
    <header><h1 style={{ margin: 0, font: "700 32px/1.15 Georgia, serif" }}>Rig parade</h1>
      <p style={{ margin: "6px 0 0", maxWidth: 820 }}>Nine rigs moving together on one board — switch the film look and every one of them redraws in the new medium.</p></header>
    <nav aria-label="Film looks" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {RIG_LOOKS.map(l => <button type="button" key={l.id} style={l.id === look ? active : button} aria-pressed={l.id === look} onClick={() => setLook(l.id)}>{l.label}</button>)}
    </nav>
    <div style={{ width: 1120, maxWidth: "100%", aspectRatio: "16 / 9", boxShadow: "0 14px 44px rgba(40,30,20,.2)", overflow: "hidden" }}>
      <RigScene look={look} width={W} height={H} ground={GROUND} frame={loop.frame} rigs={rigs} aria-label={"Rig parade, " + look} />
    </div>
    <div style={{ display: "flex", gap: 12, alignItems: "end", maxWidth: 1120 }}>
      <button type="button" style={button} onClick={loop.toggle}>{loop.playing ? "Pause" : "Play"}</button>
      <label style={{ ...label, flex: 1 }}>Frame · {loop.frame}<input type="range" aria-label="Parade frame" min={0} max={DURATION - 1} value={loop.frame} onChange={e => loop.seek(Number(e.target.value))} /></label>
    </div>
  </div>;
}

const meta = { title: "Video production/Film Looks/Universal Rig", id: "video-universal-rig", component: RigLab, parameters: { layout: "fullscreen" } } satisfies Meta<typeof RigLab>;
export default meta;
export const Lab: StoryObj<typeof RigLab> = { name: "RIG1 · One rig, any film look", render: () => <RigLab /> };
export const Parade: StoryObj<typeof RigLab> = { name: "RIG1 · Rig parade", render: () => <RigParade /> };

/** RIG1 rigs inside a COLLAGE1 scene: rigged figures sit on the same board as paper cut-outs, type and camera. */
function RigInCollage() {
  const loop = useLoop(DURATION - 1, 100);
  const spec = useMemo<CollageSceneSpec>(() => {
    const p = (id: string, motion: string, size: number, from: number, to: number, y = 0) => RIG_PRESETS.find(e => e.id === id)!.build({ id: id + "-c", size, motion, start: 0, end: DURATION, y, from, to });
    return {
      version: 1, id: "rig-in-collage", width: W, height: H, durationFrames: DURATION, seed: 21, cadence: 2, grain: .35,
      board: { material: "kraft" }, palette: { ink: "#1d1b19", cream: "#f2e9d6", red: "#c62f26" },
      camera: [{ frame: 0, x: W / 2, y: H / 2, zoom: 1.04 }, { frame: DURATION - 1, x: W / 2 + 20, y: H / 2, zoom: 1.08, ease: "linear" }],
      nodes: [
        { id: "ground", kind: "cutout", x: W / 2, y: GROUND + 100, shape: { type: "rect", width: W * 1.2, height: 220 }, fill: "cream", edge: "torn", roughness: 5 },
        { id: "rails", kind: "cutout", x: W / 2, y: GROUND + 6, shape: { type: "rect", width: W * 1.2, height: 10 }, fill: "#5a4636", edge: "cut", shadow: .4 },
        { id: "dragon", kind: "rig", rig: p("dragon", "fly", 380, W + 400, -500, 250), depth: .9 },
        { id: "train", kind: "rig", rig: p("locomotive", "run", 620, -800, W + 200, GROUND) },
        { id: "walker", kind: "rig", rig: p("person", "walk", 300, 260, 760, GROUND + 90), depth: 1.1 },
        { id: "dog", kind: "rig", rig: p("dog", "trot", 200, 120, 720, GROUND + 92), depth: 1.1 },
        { id: "title", kind: "text", depth: 0, x: 80, y: 120, text: "ANY RIG, ON PAPER", role: "headline", size: 84, color: "cream", slip: { fill: "ink", perWord: true, padding: 14, edge: "cut" },
          reveal: { by: "word", frame: 6, stagger: 6, preset: "stamp" } },
      ],
    };
  }, []);
  return <div style={page}>
    <header><h1 style={{ margin: 0, font: "700 32px/1.15 Georgia, serif" }}>Rigs inside a collage film</h1>
      <p style={{ margin: "6px 0 0", maxWidth: 820 }}>A COLLAGE1 scene with <code>rig</code> nodes: a person walking a dog, a steam train and a dragon overhead,
        on the same board as torn paper and pasted-up type, under one camera, all on twos.</p></header>
    <div style={{ width: 1120, maxWidth: "100%", aspectRatio: "16 / 9", boxShadow: "0 14px 44px rgba(40,30,20,.2)", overflow: "hidden" }}>
      <CollageScene spec={spec} frame={loop.frame} />
    </div>
    <div style={{ display: "flex", gap: 12, alignItems: "end", maxWidth: 1120 }}>
      <button type="button" style={button} onClick={loop.toggle}>{loop.playing ? "Pause" : "Play"}</button>
      <label style={{ ...label, flex: 1 }}>Frame · {loop.frame}<input type="range" aria-label="Collage frame" min={0} max={DURATION - 1} value={loop.frame} onChange={e => loop.seek(Number(e.target.value))} /></label>
    </div>
  </div>;
}
export const InCollage: StoryObj<typeof RigLab> = { name: "RIG1 · Rigs inside a collage film", render: () => <RigInCollage /> };
