import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileSpeed, speedOutput } from "../../registry/video/film-speed";
import type { FilmSpeed } from "../../registry/video/film-speed";
import { compileFilm } from "../../registry/video/film-document";
import type { CompiledFilm, FilmDocument } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { createShot3dRenderer } from "../../registry/video/film-3d-react";
import example from "../../examples/film/speed-ramp-3d.film.json";
import velocityExample from "../../examples/film/velocity-edit.film.json";
import velocityMix from "../../assets/sound/lab/moves/velocity-edit.m4a?url";
import dollyExample from "../../examples/film/dolly-zoom.film.json";
import dollyMix from "../../assets/sound/lab/moves/dolly-zoom.m4a?url";
import { trackPassState } from "../../registry/visual/race-shots";
import type { TrackPassSpec } from "../../registry/visual/race-shots";
import { bedBeats } from "../../registry/video/film-hits";
import { VELOCITY_SHAPES } from "../../registry/video/film-speed";
import { LOCAL_MOUNTAINS, RACE_CARS, RACE_TRACK } from "./race-assets";

/** One renderer per car: the example's car, or one of your own from local-assets/vehicles. */
const renderers = new Map<string, ReturnType<typeof createShot3dRenderer>>();
const rendererFor = (car: string) => {
  if (!renderers.has(car)) renderers.set(car, createShot3dRenderer({ race: { car: RACE_CARS[car] ?? RACE_CARS["concept-car"], cars: RACE_CARS, track: RACE_TRACK, mountains: LOCAL_MOUNTAINS } }));
  return renderers.get(car)!;
};
const W = 640, H = 360;
/** The same film with every ramp taken out: the same content in the same length, at an even speed. */
/** The camera's rise keeps the frame the ramp gave it, so both films lift at the same moment. */
const evenCopy = (doc: FilmDocument): FilmDocument => ({ ...doc, id: doc.id + "-even", scenes: doc.scenes.map(scene => {
  if (!scene.speed) return scene;
  const content = scene.content as { spec?: { camera?: { rise?: { end?: number } } } }, rise = content.spec?.camera?.rise, exit = (scene.speed as FilmSpeed).exit;
  const timed = rise && rise.end === undefined && exit ? { ...content, spec: { ...content.spec, camera: { ...content.spec!.camera, rise: { ...rise, end: scene.durationFrames - exit } } } } : content;
  return { ...scene, speed: { source: scene.speed.source }, content: timed };
}) as FilmDocument["scenes"] });
// Compiled for the panel's own size: a CSS scale would make the 3D canvas measure itself small and render small.
/** The shot's camera. The chase camera drives behind at the car's speed in the first frame, and the ramp never speeds it up, so when
 * the ramp speeds up the car races away. Trackside stands beside the track and pans as the car passes. The locked cameras ride at the
 * car's speed, so the car holds still in frame and the ramp shows in the track. Every camera rises just before the ramp starts. */
const CAMERAS = {
  chase: { mode: "chase" },
  trackside: { side: 8, height: .55, fov: 26 },
  "follow-alongside": { mode: "follow", along: .4, side: 6, height: .8, fov: 34 },
  "follow-chase": { mode: "follow", along: -10, side: 1.2, height: 1.4, fov: 28, lead: -1 },
  "follow-lead": { mode: "follow", along: 11, side: 1.6, height: 1.1, fov: 28, lead: 1 },
} as const;
const CAMERA_LABELS: Record<string, string> = { chase: "Chase from behind", trackside: "Trackside pan", "follow-alongside": "Locked: alongside", "follow-chase": "Locked: behind", "follow-lead": "Locked: ahead" };
const CAMERA_NOTES: Record<string, string> = { chase: "A camera car follows at the car's first speed, which the ramp never raises: it rises just before the ramp, then the car races away from it.",
  trackside: "The camera stands beside the track and pans as the car passes, and rises just before the ramp." };
type CameraId = keyof typeof CAMERAS;
/** The example filmed by the chosen camera (keeping the example's rise before the ramp), with the chosen mountains: the generated
 * range, one of your own models, or none. */
const MOUNTAIN_CHOICES = ["generated", ...Object.keys(LOCAL_MOUNTAINS), "none"];
const withCamera = (doc: FilmDocument, camera: CameraId, mountains = "generated"): FilmDocument => ({ ...doc, id: `${doc.id}-${camera}-${mountains}`, scenes: doc.scenes.map(scene => {
  if (scene.recipeId !== "shot-3d") return scene;
  const content = scene.content as { spec: { camera?: { rise?: object } }; mountains?: string | false };
  return { ...scene, content: { ...content, mountains: mountains === "none" ? false : mountains === "generated" ? undefined : mountains,
    spec: { ...content.spec, camera: { ...CAMERAS[camera], rise: content.spec.camera?.rise } } } };
}) as FilmDocument["scenes"] });
const compiled = (doc: FilmDocument) => { const result = compileFilm({ ...doc, outputs: [{ id: "panel", width: W, height: H }] }, { outputId: "panel" }); if (!result.ok) throw new Error(result.diagnostics.map(d => d.message).join("\n")); return result.film; };

/** Content frames per film frame for a scene at a film frame: 1 is natural speed. */
function speedAt(film: CompiledFilm, frame: number): { scene: string; speed: number; hold: boolean } {
  const scene = film.scenes.find(item => frame >= item.startFrame && frame < item.endFrame) ?? film.scenes[film.scenes.length - 1], local = frame - scene.startFrame;
  if (!scene.speed) return { scene: scene.id, speed: 1, hold: false };
  const map = scene.speed.map, i = Math.min(map.length - 2, Math.max(0, Math.floor(local)));
  return { scene: scene.id, speed: map[i + 1] - map[i], hold: scene.speed.holds.some(h => local >= h.start && local < h.end) };
}
/** Whether a time map changes speed anywhere (a ramp, a hold or a velocity curve), not one even rate. */
const varies = (map: readonly number[]) => { const steps = map.slice(1).map((v, k) => v - map[k]); return Math.max(...steps) - Math.min(...steps) > .05; };
/** The film's timeline: scenes, holds shaded, ramps into and out of cuts marked, and the playhead. */
function Timeline({ film, frame, onSeek }: { film: CompiledFilm; frame: number; onSeek: (frame: number) => void }) {
  const x = (f: number) => f / film.durationFrames * W;
  // A tick for every 6 frames of content, placed where the film reaches it: close together where the content races, far apart where it holds.
  const ticks = film.scenes.flatMap(scene => {
    const length = scene.speed ? Math.round(scene.speed.map[scene.speed.map.length - 1]) : scene.endFrame - scene.startFrame;
    return Array.from({ length: Math.floor(length / 6) + 1 }, (_, k) => scene.startFrame + (scene.speed ? speedOutput(scene.speed, k * 6) : k * 6 * (scene.endFrame - scene.startFrame) / length));
  });
  return <svg width={W} height={48} style={{ display: "block", cursor: "pointer" }} onPointerDown={event => { const r = event.currentTarget.getBoundingClientRect(); onSeek(Math.round((event.clientX - r.left) / W * (film.durationFrames - 1))); }}
    role="slider" aria-label="Film frame" aria-valuemin={0} aria-valuemax={film.durationFrames - 1} aria-valuenow={frame}>
    {film.scenes.map(scene => {
      const speed = scene.speed;
      return <g key={scene.id}>
        <rect x={x(scene.startFrame) + 1} y={6} width={x(scene.endFrame) - x(scene.startFrame) - 2} height={18} rx={4} fill="#1d2430" />
        {speed?.holds.map((hold, h) => <rect key={h} x={x(scene.startFrame + hold.start)} y={6} width={x(hold.end - hold.start)} height={18} rx={3} fill="rgba(124,198,255,.38)" />)}
        {speed?.rampUp !== undefined ? <rect x={x(scene.startFrame + speed.rampUp)} y={6} width={x(scene.endFrame - scene.startFrame - speed.rampUp)} height={18} fill="rgba(255,201,74,.45)" /> : null}
        {/* Sections: the initial speed, then the speed ramp; a film without a ramp plays at one speed throughout. */}
        <text x={x(scene.startFrame) + 8} y={19} fill="#c9ced6" fontSize={11} fontWeight={600}>{speed?.rampUp !== undefined ? "initial speed" : speed && varies(speed.map) ? "speed curve" : "even speed"}</text>
        {speed?.rampUp !== undefined ? <text x={x(scene.startFrame + speed.rampUp) + 8} y={19} fill="#ffe2a0" fontSize={11} fontWeight={600}>speed ramp</text> : null}
      </g>;
    })}
    {ticks.map((t, k) => <rect key={k} x={x(t)} y={30} width={1} height={10} fill="#8592a3" />)}
    <text x={W} y={47} fill="#6b7686" fontSize={9} textAnchor="end">content time: a tick per 6 frames</text>
    <rect x={x(frame) - 1} y={2} width={2} height={40} fill="#fff" />
  </svg>;
}

function Panel({ film, frame, title, note, onSeek, car }: { film: CompiledFilm; frame: number; title: string; note: string; onSeek: (frame: number) => void; car: string }) {
  const now = speedAt(film, frame);
  return <figure style={{ margin: 0, display: "grid", gap: 6 }}>
    <figcaption style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", color: "#e8ecf2", font: "650 15px system-ui" }}>
      <span>{title}</span>
      <span style={{ font: "600 13px ui-monospace, monospace", color: now.hold ? "#7cc6ff" : now.speed > 1.5 ? "#ffc94a" : "#c9ced6" }}>
        {now.hold ? "HOLD " : ""}{now.speed.toFixed(2)}×
      </span>
    </figcaption>
    <div style={{ width: W, height: H, overflow: "hidden", borderRadius: 8, background: "#000" }}>
      <Suspense fallback={null}><FilmStage film={film} frame={frame} renderObject={() => null} renderShot3d={rendererFor(car)} reducedMotion={false} /></Suspense>
    </div>
    <Timeline film={film} frame={frame} onSeek={onSeek} />
    <p style={{ margin: 0, color: "#9aa4b2", font: "13px/1.45 system-ui", maxWidth: W }}>{note}</p>
  </figure>;
}

/** Plays two films on one clock, frame for frame. */
function useClock(durationFrames: number, fps = 30) {
  const [frame, setFrame] = useState(0), [playing, setPlaying] = useState(false), clock = useRef({ from: 0, at: 0 });
  useEffect(() => {
    if (!playing) return;
    clock.current = { from: performance.now(), at: frame };
    let id = 0;
    const tick = (now: number) => { setFrame(Math.floor(clock.current.at + (now - clock.current.from) / 1000 * fps) % durationFrames); id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps
  return { frame, setFrame: (f: number) => { setPlaying(false); setFrame(f); }, playing, toggle: () => setPlaying(p => !p) };
}

const meta: Meta = { title: "Video production/Speed Ramp", parameters: { layout: "fullscreen" } };
export default meta;

/** The same race shot, the same content, the same length: on the left with a speed ramp, on the right at an even speed. Play them
 * together. The ramped shot holds the initial speed, the camera rises, then the ramp builds to 2.5× and the car races away from a
 * camera that keeps its first speed. The even version spends the same time evenly. */
export const Compare: StoryObj<{ frame: number; car: string; camera: CameraId }> = {
  args: { frame: 0, car: "concept-car", camera: "chase" },
  argTypes: { car: { control: "select", options: Object.keys(RACE_CARS), description: "Cars from local-assets/vehicles are yours, for local renders only." },
    camera: { control: { type: "inline-radio", labels: CAMERA_LABELS }, options: Object.keys(CAMERAS), description: "The camera: a camera car chasing from behind, a pan from beside the track, or a camera car locked to the car." } },
  render: function Compare({ frame: start, car: carArg, camera: cameraArg }) {
    // The camera and car are chosen on the page; the story's args only set where they start.
    const [camera, setCamera] = useState<CameraId>(cameraArg in CAMERAS ? cameraArg : "chase"), [car, setCar] = useState(carArg in RACE_CARS ? carArg : "concept-car");
    const [mountains, setMountains] = useState("generated");
    useEffect(() => { if (cameraArg in CAMERAS) setCamera(cameraArg); }, [cameraArg]);
    useEffect(() => { if (carArg in RACE_CARS) setCar(carArg); }, [carArg]);
    const source = useMemo(() => withCamera(example as unknown as FilmDocument, camera, mountains), [camera, mountains]);
    const ramped = useMemo(() => compiled(source), [source]), even = useMemo(() => compiled(evenCopy(source)), [source]);
    const { frame, setFrame, playing, toggle } = useClock(ramped.durationFrames);
    useEffect(() => setFrame(start), [start]); // eslint-disable-line react-hooks/exhaustive-deps
    // The two sections and the rise between them, from the compiled ramp.
    const run = ramped.scenes[0], rampUp = run.startFrame + (run.speed?.rampUp ?? run.endFrame - run.startFrame);
    const jumps: Array<[string, number]> = [["initial speed", run.startFrame], ["the rise", rampUp - 20], ["speed ramp", rampUp]];
    return <div style={{ background: "#0b0d10", padding: 16, display: "grid", gap: 14, font: "14px system-ui", color: "#e8ecf2" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={toggle} style={{ font: "650 14px system-ui", padding: "8px 16px", borderRadius: 8, border: 0, background: "#7cc6ff", color: "#06121f" }}>{playing ? "Pause" : "Play both"}</button>
        <input type="range" min={0} max={ramped.durationFrames - 1} value={frame} onChange={event => setFrame(Number(event.target.value))} aria-label="Film frame" style={{ width: 420 }} />
        <span style={{ font: "600 13px ui-monospace, monospace", color: "#9aa4b2" }}>frame {frame} / {ramped.durationFrames}</span>
        <span style={{ color: "#9aa4b2" }}>Jump to:</span>
        {jumps.map(([label, at]) =>
          <button key={label} type="button" onClick={() => setFrame(at)} style={{ font: "600 13px system-ui", padding: "6px 10px", borderRadius: 6, border: "1px solid #2b3442", background: "#151b23", color: "#c9ced6" }}>{label}</button>)}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span id="km-ramp-camera" style={{ color: "#9aa4b2" }}>Camera:</span>
        <div role="radiogroup" aria-labelledby="km-ramp-camera" style={{ display: "flex", gap: 4, padding: 3, borderRadius: 9, background: "#151b23", border: "1px solid #2b3442" }}>
          {(Object.keys(CAMERAS) as CameraId[]).map(id => <button key={id} type="button" role="radio" aria-checked={camera === id} onClick={() => setCamera(id)}
            style={{ font: "600 13px system-ui", padding: "6px 12px", borderRadius: 6, border: 0, cursor: "pointer", background: camera === id ? "#7cc6ff" : "transparent", color: camera === id ? "#06121f" : "#c9ced6" }}>{CAMERA_LABELS[id]}</button>)}
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#9aa4b2", marginLeft: 12 }}>Car:
          <select value={car} onChange={event => setCar(event.target.value)} style={{ font: "600 13px system-ui", padding: "6px 8px", borderRadius: 6, border: "1px solid #2b3442", background: "#151b23", color: "#e8ecf2" }}>
            {Object.keys(RACE_CARS).map(id => <option key={id} value={id}>{id === "concept-car" ? "Concept car (in the library)" : `${id} (yours, local only)`}</option>)}
          </select>
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#9aa4b2" }}>Mountains:
          <select value={mountains} onChange={event => setMountains(event.target.value)} style={{ font: "600 13px system-ui", padding: "6px 8px", borderRadius: 6, border: "1px solid #2b3442", background: "#151b23", color: "#e8ecf2" }}>
            {MOUNTAIN_CHOICES.map(id => <option key={id} value={id}>{id === "generated" ? "Generated (in the library)" : id === "none" ? "None" : `${id} (yours, local only)`}</option>)}
          </select>
        </label>
        <span style={{ color: "#6b7686", font: "12px system-ui" }}>{CAMERA_NOTES[camera] ?? "A camera car locked to the car's speed: the car holds still, and the ramp shows in the track streaming past."}</span>
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <Panel film={ramped} frame={frame} title="Ramped" onSeek={setFrame} car={car}
          note="Three seconds at the initial speed; the camera rises; then the speed ramp (yellow) builds to 2.5× and the car races away from a camera that keeps its first speed." />
        <Panel film={even} frame={frame} title="Even speed, same length" onSeek={setFrame} car={car}
          note="The same content in the same frames at one even speed: no surge, so the car never pulls away." />
      </div>
    </div>;
  },
};

/** A velocity edit: the race shot cut to a 110 bpm drum loop. Time races between the kicks and drops to slow motion on each one, with a
 * punch and zoom blur on the kick and a shake on the snare; beside it, the same content at an even speed. Play with your sound on: the
 * film's own mix plays in step. The content ticks bunch where time races and spread where it slows. */
export const Velocity: StoryObj = {
  render: function Velocity() {
    const doc = velocityExample as unknown as FilmDocument;
    const velocity = useMemo(() => compiled(doc), [doc]), even = useMemo(() => compiled({ ...doc, id: doc.id + "-even", scenes: doc.scenes.map(scene => ({ ...scene, hits: undefined, speed: { source: (scene.speed as FilmSpeed).source } })) } as FilmDocument), [doc]);
    const { frame, setFrame, playing, toggle } = useClock(velocity.durationFrames), sound = useRef<HTMLAudioElement>(null);
    useEffect(() => {
      const element = sound.current;
      if (!element) return;
      // eslint-disable-next-line storybook/context-in-play-function -- an audio element's play(), not a story's play function
      if (playing) { element.currentTime = frame / 30; void element.play().catch(() => undefined); } else element.pause();
    }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps
    return <div style={{ background: "#0b0d10", padding: 16, display: "grid", gap: 14, font: "14px system-ui", color: "#e8ecf2" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={toggle} style={{ font: "650 14px system-ui", padding: "8px 16px", borderRadius: 8, border: 0, background: "#7cc6ff", color: "#06121f" }}>{playing ? "Pause" : "Play both"}</button>
        <input type="range" min={0} max={velocity.durationFrames - 1} value={frame} onChange={event => setFrame(Number(event.target.value))} aria-label="Film frame" style={{ width: 420 }} />
        <span style={{ font: "600 13px ui-monospace, monospace", color: "#9aa4b2" }}>frame {frame} / {velocity.durationFrames}</span>
        <audio ref={sound} src={velocityMix} preload="auto" />
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <Panel film={velocity} frame={frame} title="Velocity edit (rush)" onSeek={setFrame} car="concept-car"
          note="Slow motion (0.4×) on each kick, racing to 3.1× into the next; the motion blur follows the speed. Punch and zoom blur on the kick, a shake on the snare." />
        <Panel film={even} frame={frame} title="Even speed, same content" onSeek={setFrame} car="concept-car"
          note="The same content in the same frames at an even 1.2×, with no hits: nothing lands on the music." />
      </div>
      <p style={{ margin: 0, color: "#6b7686", font: "12px system-ui", maxWidth: 1300 }}>Music: <a href="https://freesound.org/people/blakengouda/sounds/573948/" style={{ color: "#7cc6ff" }}>Hip-Hop Drum Loop - 110bpm</a> by blakengouda (CC0). The car is CC BY; see assets/models/vehicles/concept-car.LICENSE.md.</p>
    </div>;
  },
};

/** A race film's camera: its spec, and the lens and distance to the point it aims at in a film frame (one scene, no speed ramp). */
const raceCamera = (doc: FilmDocument) => (doc.scenes[0].content as { spec: Omit<TrackPassSpec, "durationFrames"> }).spec;
function lensAt(doc: FilmDocument, frame: number): { fov: number; distance: number } {
  const { pose } = trackPassState({ ...raceCamera(doc), durationFrames: doc.scenes[0].durationFrames }, frame, 30);
  return { fov: pose.fov, distance: Math.hypot(...pose.position.map((value, k) => value - pose.target[k])) };
}
/** One film in a panel, with the camera's lens and distance over it. */
function LensPanel({ film, doc, frame, title, note, onSeek }: { film: CompiledFilm; doc: FilmDocument; frame: number; title: string; note: string; onSeek: (frame: number) => void }) {
  const lens = lensAt(doc, frame);
  return <figure style={{ margin: 0, display: "grid", gap: 6, alignContent: "start" }}>
    <figcaption style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", height: 22, color: "#e8ecf2", font: "650 15px/22px system-ui" }}>
      <span>{title}</span>
      <span style={{ font: "600 13px ui-monospace, monospace", color: "#c9ced6" }}>lens {lens.fov.toFixed(1)}° · camera {lens.distance.toFixed(1)} m away</span>
    </figcaption>
    <div style={{ width: W, height: H, overflow: "hidden", borderRadius: 8, background: "#000" }}>
      <Suspense fallback={null}><FilmStage film={film} frame={frame} renderObject={() => null} renderShot3d={rendererFor("concept-car")} reducedMotion={false} /></Suspense>
    </div>
    <Timeline film={film} frame={frame} onSeek={onSeek} />
    <p style={{ margin: 0, color: "#9aa4b2", font: "13px/1.45 system-ui", maxWidth: W }}>{note}</p>
  </figure>;
}

/** A dolly zoom: the lens lengthens from 60° to 22° while the camera locked to the car pulls back along its line to it, so the car keeps
 * its size and the mountains behind it grow. Beside it, the same camera with the lens held. Play with your sound on: the film's own mix
 * plays in step. */
export const DollyZoom: StoryObj = {
  render: function DollyZoom() {
    const doc = dollyExample as unknown as FilmDocument;
    const held = useMemo((): FilmDocument => ({ ...doc, id: doc.id + "-held", scenes: doc.scenes.map(scene => {
      if (scene.recipeId !== "shot-3d" || scene.content.shot !== "race") return scene;
      const content = scene.content;
      return { ...scene, content: { ...content, spec: { ...content.spec, camera: { ...content.spec.camera, dollyZoom: undefined } } } };
    }) as FilmDocument["scenes"] }), [doc]);
    const zoomed = useMemo(() => compiled(doc), [doc]), still = useMemo(() => compiled(held), [held]);
    const { frame, setFrame, playing, toggle } = useClock(zoomed.durationFrames), sound = useRef<HTMLAudioElement>(null);
    useEffect(() => {
      const element = sound.current;
      if (!element) return;
      // eslint-disable-next-line storybook/context-in-play-function -- an audio element's play(), not a story's play function
      if (playing) { element.currentTime = frame / 30; void element.play().catch(() => undefined); } else element.pause();
    }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps
    const zoom = raceCamera(doc).camera?.dollyZoom, jumps: Array<[string, number]> = [["before", 0], ["middle", Math.round(((zoom?.start ?? 0) + (zoom?.end ?? 0)) / 2)], ["after", zoomed.durationFrames - 1]];
    return <div style={{ background: "#0b0d10", padding: 16, display: "grid", gap: 14, alignContent: "start", minHeight: "100vh", font: "14px system-ui", color: "#e8ecf2" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={toggle} style={{ font: "650 14px system-ui", padding: "8px 16px", borderRadius: 8, border: 0, background: "#7cc6ff", color: "#06121f" }}>{playing ? "Pause" : "Play both"}</button>
        <input type="range" min={0} max={zoomed.durationFrames - 1} value={frame} onChange={event => setFrame(Number(event.target.value))} aria-label="Film frame" style={{ width: 420 }} />
        <span style={{ font: "600 13px ui-monospace, monospace", color: "#9aa4b2" }}>frame {frame} / {zoomed.durationFrames}</span>
        <span style={{ color: "#9aa4b2" }}>Jump to:</span>
        {jumps.map(([label, at]) =>
          <button key={label} type="button" onClick={() => setFrame(at)} style={{ font: "600 13px system-ui", padding: "6px 10px", borderRadius: 6, border: "1px solid #2b3442", background: "#151b23", color: "#c9ced6" }}>{label}</button>)}
        <audio ref={sound} src={dollyMix} preload="auto" />
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <LensPanel film={zoomed} doc={doc} frame={frame} title="Dolly zoom" onSeek={setFrame}
          note="From frame 20 to 120 the lens goes from 60° to 22° and the camera pulls back from 3.7 m to about 9.7 m: the car keeps its size, and the mountains grow about three times." />
        <LensPanel film={still} doc={held} frame={frame} title="Lens held at 60°" onSeek={setFrame}
          note="The same camera without the zoom: the car and the mountains keep their sizes." />
      </div>
      <p style={{ margin: 0, color: "#6b7686", font: "12px system-ui", maxWidth: 1300 }}>Sound: bed-drone-low, a drone made in code (Kumiki UI, MIT). The car is CC BY; see assets/models/vehicles/concept-car.LICENSE.md.</p>
    </div>;
  },
};

/** A time map drawn as a curve: film frames across, content frames up. Holds are shaded; the yellow band is the speed. */
function SpeedGraph({ title, speed, durationFrames, beats = [], width = 560, height = 260 }: { title: string; speed: FilmSpeed; durationFrames: number; beats?: readonly number[]; width?: number; height?: number }) {
  const { speed: plan, problems } = compileSpeed(speed, durationFrames, 30, () => undefined, beats);
  if (!plan) return <pre style={{ color: "#f88" }}>{problems.map(p => p.message).join("\n")}</pre>;
  const pad = 36, w = width - pad * 2, h = height - pad * 2 - 60, S = speed.source;
  const x = (f: number) => pad + f / durationFrames * w, y = (c: number) => pad + h - c / S * h;
  const curve = plan.map.map((c, f) => `${f ? "L" : "M"}${x(f).toFixed(1)},${y(c).toFixed(1)}`).join(" ");
  const speeds = plan.map.slice(1).map((c, f) => c - plan.map[f]), top = Math.max(...speeds);
  const band = speeds.map((v, f) => `${f ? "L" : "M"}${x(f + .5).toFixed(1)},${(height - pad - v / top * 44).toFixed(1)}`).join(" ");
  return <figure style={{ margin: 0 }}>
    <svg width={width} height={height} role="img" aria-label={`${title}: content frame against film frame`} style={{ background: "#11151b", borderRadius: 8 }}>
      {plan.holds.map((hold, i) => <rect key={i} x={x(hold.start)} y={pad} width={x(hold.end) - x(hold.start)} height={height - pad * 2} fill="rgba(124,198,255,.12)" />)}
      <path d={`M${x(0)},${y(0)} L${x(durationFrames)},${y(S)}`} stroke="rgba(255,255,255,.18)" strokeDasharray="4 4" fill="none" />
      {beats.map(beat => <line key={beat} x1={x(beat)} x2={x(beat)} y1={pad} y2={height - pad} stroke="rgba(255,201,74,.28)" />)}
      <path d={curve} stroke="#7cc6ff" strokeWidth={2.5} fill="none" />
      <path d={band} stroke="#ffc94a" strokeWidth={1.5} fill="none" />
      <text x={pad} y={22} fill="#e8ecf2" fontSize={13} fontWeight={650}>{title}</text>
      <text x={width - pad} y={22} fill="#9aa4b2" fontSize={12} textAnchor="end">{speed.beats ? `${Math.min(...speeds).toFixed(2)}× to ${top.toFixed(2)}×` : `${plan.rate.toFixed(2)}× outside holds`} · {S} → {durationFrames} frames</text>
    </svg>
  </figure>;
}
/** How each ramp is solved: content frame against film frame, with holds shaded and the speed beneath. */
export const Graphs: StoryObj = {
  render: () => {
    // The example's holds as the film resolved them: a named moment becomes its content frame.
    const film = compiled(example as unknown as FilmDocument);
    return <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 560px)", gap: 16, padding: 16, background: "#0b0d10" }}>
      <SpeedGraph title="Ramp and hold" speed={{ source: 150, holds: [{ at: 75, frames: 45 }] }} durationFrames={96} />
      <SpeedGraph title="Ramp into and out of a cut" speed={{ source: 150, enter: 12, exit: 12 }} durationFrames={120} />
      {example.scenes.map((scene, i) => scene.speed && <SpeedGraph key={scene.id} title={`speed-ramp-3d: ${scene.id}`}
        speed={{ ...scene.speed, holds: (scene.speed as FilmSpeed).holds?.map((h, k) => ({ ...h, at: film.scenes[i].speed?.holds[k]?.at ?? 0 })) } as FilmSpeed} durationFrames={scene.durationFrames} />)}
      {/* Velocity edits on a 110 bpm grid, one speed point every two beats (the kicks, gold lines). */}
      {VELOCITY_SHAPES.map(shape => <SpeedGraph key={shape} title={`Velocity: ${shape}`} speed={{ source: 315, beats: { bed: "drums", every: 2, shape } }} durationFrames={262}
        beats={bedBeats({ bpm: 110 }, 30, 263).filter((_, n) => n % 2 === 0)} />)}
    </div>;
  },
};
