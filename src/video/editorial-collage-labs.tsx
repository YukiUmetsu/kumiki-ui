import { useEffect, useMemo, useState } from "react";
import { CollageScene } from "../../registry/video/collage/collage-react";
import type { CollageNode, CollageSceneSpec } from "../../registry/video/collage/collage-scene";
import type { EdgeStyle } from "../../registry/video/collage/collage-geometry";
import type { CollagePuppetActionType, CollagePuppetLook } from "../../registry/video/collage/collage-puppet";
import { clock, mapPin, stamp } from "../../registry/video/collage/collage-kit";
import { CAST, PALETTE } from "./collage-standard-time";

const page = { display: "grid", gap: 16, padding: 24, minHeight: "100vh", background: "#f4f1ea", color: "#26231f", font: "15px/1.45 system-ui, sans-serif" } as const;
const label = { display: "grid", gap: 5, font: "600 13px system-ui", minWidth: 150 } as const;
const button = { border: "1px solid #a39a8c", borderRadius: 7, background: "#ffffff", color: "#26231f", padding: "9px 14px", minHeight: 40, cursor: "pointer", font: "600 13px system-ui" } as const;
const stage = { width: 960, height: 540, maxWidth: "100%", aspectRatio: "16 / 9", boxShadow: "0 14px 44px rgba(40,30,20,.2)", overflow: "hidden" } as const;

function useLoop(max: number, initial: number) {
  const [frame, setFrame] = useState(initial);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const start = performance.now(), first = frame >= max ? 0 : frame;
    const tick = (now: number) => { setFrame((first + Math.floor((now - start) * 30 / 1000)) % (max + 1)); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, max]);
  return { frame, playing, setFrame: (f: number) => { setPlaying(false); setFrame(f); }, toggle: () => setPlaying(p => !p) };
}

/** Paper, edge, print and lift study: the material vocabulary at full size. */
export function PaperLab() {
  const [edge, setEdge] = useState<EdgeStyle>("torn");
  const [roughness, setRoughness] = useState(3.4);
  const [core, setCore] = useState(3);
  const [cell, setCell] = useState(9);
  const [coverage, setCoverage] = useState(.55);
  const [lift, setLift] = useState(0);
  const [printCell, setPrintCell] = useState(6);
  const loop = useLoop(119, 119);
  const spec = useMemo<CollageSceneSpec>(() => {
    const nodes: CollageNode[] = [
      { id: "card", kind: "cutout", x: 330, y: 300, rotate: -4, shape: { type: "rect", width: 440, height: 300 }, fill: "teal", edge, roughness, backing: { width: core, edge }, keys: [{ frame: 0, lift }],
        halftone: { color: "navy", toward: 30, from: 0, to: coverage, cell }, enter: { preset: "drop", frame: 0, duration: 14 } },
      { id: "card-label", kind: "text", parent: "card", x: -180, y: -90, text: edge.toUpperCase() + " EDGE", role: "headline", size: 64, color: "cream" },
      { id: "card-note", kind: "text", parent: "card", x: -180, y: -30, text: "Lift raises the paper: the shadow slides away and softens.", role: "body", size: 26, weight: 600, color: "cream", maxWidth: 300 },
      { id: "tape", kind: "tape", x: 160, y: 158, rotate: -32, length: 150, width: 38, enter: { preset: "stamp", frame: 16, duration: 7 } },
      { id: "photo-frame", kind: "cutout", x: 1020, y: 300, rotate: 3, shape: { type: "rect", width: 412, height: 332 }, fill: "paper", edge: "cut", from: 8, enter: { preset: "drop", frame: 8, duration: 14 } },
      { id: "photo", kind: "group", x: 1020, y: 300, rotate: 3, print: { mode: "halftone", ink: "ink", paper: "cream", cell: printCell }, enter: { preset: "drop", frame: 8, duration: 14 } },
      { id: "photo-sky", kind: "cutout", parent: "photo", shape: { type: "rect", width: 380, height: 300 }, fill: "#c7c2b8", edge: "clean", shadow: 0 },
      { id: "photo-sun", kind: "cutout", parent: "photo", x: 80, y: -60, shape: { type: "ellipse", rx: 54, ry: 54 }, fill: "#f2efe6", edge: "clean", shadow: 0 },
      { id: "photo-hill", kind: "cutout", parent: "photo", y: 90, shape: { type: "polygon", points: [[-190, 60], [-190, -30], [-60, -90], [40, -40], [190, -110], [190, 60]] }, fill: "#5c5750", edge: "clean", shadow: 0 },
      { id: "photo-hill2", kind: "cutout", parent: "photo", y: 120, shape: { type: "polygon", points: [[-190, 30], [-190, -10], [-20, -60], [190, 0], [190, 30]] }, fill: "#2c2a27", edge: "clean", shadow: 0 },
      { id: "photo-cap", kind: "text", x: 840, y: 520, text: "Archival-print halftone: luminance through a real dot screen", role: "label", size: 22, weight: 600, color: "ink", from: 20 },
      { id: "circle", kind: "marker", x: 1540, y: 220, stroke: { type: "circle", width: 300, height: 170 }, color: "red", width: 7, enter: { preset: "draw", frame: 24, duration: 22 } },
      { id: "circle-t", kind: "text", x: 1540, y: 238, text: "MARKER", role: "headline", size: 66, color: "ink", align: "middle" },
      { id: "hl", kind: "text", x: 1400, y: 430, text: "highlighter sweep", role: "body", size: 44, weight: 700, color: "ink", highlight: { color: "yellow", frame: 40, duration: 20 } },
      { id: "arrow", kind: "marker", x: 1380, y: 560, stroke: { type: "arrow", to: [-220, 140], bend: .3 }, color: "ink", width: 6, enter: { preset: "draw", frame: 56, duration: 16 } },
      ...stamp("stamp", { x: 1600, y: 760, text: "APPROVED", frame: 70, size: 54 }),
      ...clock("clock", { x: 1150, y: 830, radius: 120, time: [{ frame: 0, hours: 9 }, { frame: 110, hours: 12, ease: "back" }], enter: { preset: "pop", frame: 30, duration: 12 } }),
      ...mapPin("pin", { x: 860, y: 900, dropAt: 60, size: 60 }),
      { id: "slip", kind: "text", x: 120, y: 760, text: "PASTED-UP HEADLINE", role: "headline", size: 92, color: "cream", slip: { fill: "red", perWord: true, padding: 14, edge, jitter: 2 }, reveal: { by: "word", frame: 30, stagger: 7, preset: "stamp" } },
      { id: "slip2", kind: "text", x: 120, y: 900, text: "on paper slips", role: "body", size: 60, italic: true, weight: 700, color: "ink", slip: { fill: "paper", padding: 14, edge: "cut" }, reveal: { by: "letter", frame: 50, stagger: 1.4, preset: "type" } },
    ];
    return { version: 1, id: "paper-lab", width: 1920, height: 1080, durationFrames: 120, seed: 5, board: { material: "kraft" }, palette: PALETTE, cadence: 2, grain: .35, nodes };
  }, [edge, roughness, core, cell, coverage, lift, printCell]);
  return <div style={page}>
    <header><h1 style={{ margin: 0, font: "700 32px/1.15 Georgia, serif" }}>Paper &amp; print lab</h1>
      <p style={{ margin: "6px 0 0", maxWidth: 820 }}>Edges, fibre cores, halftone shading, lift shadows, tape, marker, highlighter, stamp, archival print and typed
        slips — the full material vocabulary of the collage engine. Every control rebuilds the same JSON scene.</p></header>
    <div style={stage}><CollageScene spec={spec} frame={loop.frame} /></div>
    <div style={{ display: "flex", gap: 12, alignItems: "end", maxWidth: 960 }}>
      <button type="button" style={button} onClick={loop.toggle}>{loop.playing ? "Pause" : "Play entrances"}</button>
      <label style={{ ...label, flex: 1 }}>Frame · {loop.frame}<input type="range" aria-label="Paper lab frame" min={0} max={119} value={loop.frame} onChange={e => loop.setFrame(Number(e.target.value))} /></label>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, maxWidth: 960 }}>
      <label style={label}>Edge<select aria-label="Edge" value={edge} style={{ minHeight: 40, font: "inherit" }} onChange={e => setEdge(e.target.value as EdgeStyle)}>
        <option value="torn">Torn</option><option value="cut">Scissor cut</option><option value="deckle">Deckle</option><option value="clean">Clean</option></select></label>
      <label style={label}>Roughness · {roughness.toFixed(1)}<input type="range" aria-label="Roughness" min={0} max={10} step={.2} value={roughness} onChange={e => setRoughness(Number(e.target.value))} /></label>
      <label style={label}>Fibre core · {core.toFixed(1)} px<input type="range" aria-label="Fibre core" min={0} max={14} step={.5} value={core} onChange={e => setCore(Number(e.target.value))} /></label>
      <label style={label}>Halftone cell · {cell}px<input type="range" aria-label="Halftone cell" min={4} max={24} step={1} value={cell} onChange={e => setCell(Number(e.target.value))} /></label>
      <label style={label}>Halftone coverage · {Math.round(coverage * 100)}%<input type="range" aria-label="Halftone coverage" min={0} max={1} step={.05} value={coverage} onChange={e => setCoverage(Number(e.target.value))} /></label>
      <label style={label}>Lift · {lift.toFixed(2)}<input type="range" aria-label="Lift" min={0} max={2} step={.05} value={lift} onChange={e => setLift(Number(e.target.value))} /></label>
      <label style={label}>Print dot · {printCell}px<input type="range" aria-label="Print dot" min={3} max={14} step={1} value={printCell} onChange={e => setPrintCell(Number(e.target.value))} /></label>
    </div>
  </div>;
}

const ACTIONS: CollagePuppetActionType[] = ["talk", "wave", "point", "cheer", "shrug", "think", "nod", "jump", "carry", "walk", "run", "turn"];
const EXTRA: Record<string, CollagePuppetLook> = {
  student: { skin: "#8a5a3c", hair: "#2a1a12", top: "red", bottom: "#33302c", shoes: "#5a3020", hairStyle: "curly", topStyle: "sweater", accessory: "glasses" },
  painter: { skin: "#e7b99a", hair: "#7a3b1c", top: "sage", bottom: "ink", shoes: "ink", accent: "pink", hairStyle: "ponytail", topStyle: "dress", shortSleeves: true },
};

/** Five paper puppets with different builds, hair, clothes and accessories, all driven by the same action. */
export function CastLab() {
  const [action, setAction] = useState<CollagePuppetActionType>("talk");
  const [cadence, setCadence] = useState<1 | 2 | 3>(2);
  const [brads, setBrads] = useState(true);
  const loop = useLoop(149, 40);
  const looks = useMemo(() => [CAST.conductor, CAST.traveller, CAST.delegate, EXTRA.student, EXTRA.painter], []);
  const spec = useMemo<CollageSceneSpec>(() => {
    const travel = action === "walk" || action === "run";
    const nodes: CollageNode[] = [
      { id: "floor", kind: "cutout", x: 960, y: 1010, shape: { type: "rect", width: 2200, height: 200 }, fill: "#d9cdb4", edge: "torn", roughness: 5, depth: 1 },
      ...looks.map((look, i): CollageNode => ({
        id: "p" + i, kind: "puppet", x: travel ? 120 + i * 150 : 230 + i * 365, y: 960, height: 470 - (i % 2) * 30, facing: i % 2 ? -1 : 1, look: { ...look, brads },
        actions: travel ? [{ type: action, start: 6 + i * 4, end: 140, toX: 1100 - i * 40 }] : [{ type: action, start: 6 + i * 3, end: 144, angle: action === "point" ? 110 + i * 6 : undefined }],
      })),
      { id: "title", kind: "text", depth: 0, x: 70, y: 110, text: action.toUpperCase(), role: "headline", size: 84, color: "cream", slip: { fill: "ink", padding: 16, edge: "cut" } },
    ];
    if (travel) nodes.forEach(n => { if (n.kind === "puppet") (n as { facing?: 1 | -1 }).facing = 1; });
    return { version: 1, id: "cast-lab", width: 1920, height: 1080, durationFrames: 150, seed: 13, board: { material: "cream" }, palette: PALETTE, cadence, grain: .3, nodes };
  }, [action, cadence, brads, looks]);
  return <div style={page}>
    <header><h1 style={{ margin: 0, font: "700 32px/1.15 Georgia, serif" }}>Puppet cast lab</h1>
      <p style={{ margin: "6px 0 0", maxWidth: 820 }}>Jointed paper puppets: separate cut parts pinned at shoulder, elbow, hip and knee, posed per frame from
        layered actions over an idle breath, with automatic blinks. The walk derives its step from the travel distance so feet do not skate.</p></header>
    <div style={stage}><CollageScene spec={spec} frame={loop.frame} /></div>
    <div style={{ display: "flex", gap: 12, alignItems: "end", maxWidth: 960 }}>
      <button type="button" style={button} onClick={loop.toggle}>{loop.playing ? "Pause" : "Play"}</button>
      <label style={{ ...label, flex: 1 }}>Frame · {loop.frame}<input type="range" aria-label="Cast lab frame" min={0} max={149} value={loop.frame} onChange={e => loop.setFrame(Number(e.target.value))} /></label>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
      <label style={label}>Action<select aria-label="Action" value={action} style={{ minHeight: 40, font: "inherit" }} onChange={e => setAction(e.target.value as CollagePuppetActionType)}>
        {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}</select></label>
      <label style={label}>Cadence<select aria-label="Puppet cadence" value={cadence} style={{ minHeight: 40, font: "inherit" }} onChange={e => setCadence(Number(e.target.value) as 1 | 2 | 3)}>
        <option value={1}>On ones</option><option value={2}>On twos</option><option value={3}>On threes</option></select></label>
      <label style={{ display: "flex", alignItems: "center", gap: 8, font: "600 13px system-ui" }}><input type="checkbox" checked={brads} onChange={e => setBrads(e.target.checked)} /> Paper fasteners</label>
    </div>
  </div>;
}
