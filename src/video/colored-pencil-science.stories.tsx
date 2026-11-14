import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileFilm } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { ColoredPencilSciencePlate } from "./colored-pencil-science";
import type { PencilSubject } from "./colored-pencil-science";
import type { PencilAspect } from "../../registry/video/colored-pencil";
import { COLOR_PENCIL_FILM } from "./colored-pencil-film";

const meta = {
  title: "Video production/Film Art Styles/Coloured Pencil",
  id: "video-colored-pencil-science",
  component: ColoredPencilSciencePlate,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ColoredPencilSciencePlate>;
export default meta;

const button = {
  minHeight: 40, padding: "9px 14px", border: "1px solid #a8ada3", borderRadius: 4,
  background: "#fffdf7", color: "#334037", font: "600 13px system-ui", cursor: "pointer",
} as const;
const label = { display: "grid", gap: 7, minWidth: 150, font: "600 13px system-ui" } as const;
const page = {
  background: "#e9e6db", color: "#334037", minHeight: "100vh", padding: 24,
  font: "15px/1.5 system-ui, sans-serif", display: "grid", alignContent: "start", gap: 16,
} as const;

function DrawingStudio() {
  const [frame, setFrame] = useState(280);
  const [subject, setSubject] = useState<PencilSubject>("leaf");
  const [aspect, setAspect] = useState<PencilAspect>("landscape");
  const [tooth, setTooth] = useState(.82);
  const [seed, setSeed] = useState(47);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing || reducedMotion) return;
    const first = performance.now(), offset = frame;
    let raf = 0;
    const next = (now: number) => {
      const at = Math.min(352, offset + Math.floor((now - first) * .03));
      setFrame(at);
      if (at < 352) raf = requestAnimationFrame(next);
      else setPlaying(false);
    };
    raf = requestAnimationFrame(next);
    return () => cancelAnimationFrame(raf);
    // Pressing Play captures the current frame once, then advances from the capture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, reducedMotion]);
  const status = reducedMotion || frame >= 249 ? "Completed sheet · pencil and graphite" :
    frame < 50 ? "Graphite underdrawing" : frame < 160 ? "Layering colour by hand" :
    frame < 204 ? "Deepening directional hatch" : "Fine details and annotation";
  return <main style={page}>
    <header style={{ maxWidth: 850 }}>
      <div style={{ fontSize: 12, letterSpacing: 2, fontWeight: 700, color: "#6c795c", textTransform: "uppercase" }}>
        Material-native illustration · CP1
      </div>
      <h1 style={{ font: "600 clamp(27px, 4vw, 42px)/1.15 Georgia,serif", margin: "7px 0" }}>
        Coloured Pencil · Scientific Field Notes
      </h1>
      <p style={{ maxWidth: 730, margin: 0 }}>
        Watch individual pencil marks build an original botanical or mineral observation plate.
        Each region has its own stroke direction, pigment pressure, crosshatching and graphite drawing.
        All texture is fixed to the paper, not animated as a filter.
      </p>
    </header>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "end", maxWidth: 990 }}>
      <label style={label}>Specimen
        <select aria-label="Specimen" value={subject} onChange={e => setSubject(e.target.value as PencilSubject)} style={{ minHeight: 40 }}>
          <option value="leaf">Botanical · leaf</option><option value="crystal">Mineral · crystal facets</option>
        </select>
      </label>
      <label style={label}>Aspect ratio
        <select aria-label="Aspect ratio" value={aspect} onChange={e => setAspect(e.target.value as PencilAspect)} style={{ minHeight: 40 }}>
          <option value="landscape">16:9 landscape</option><option value="portrait">9:16 portrait</option>
        </select>
      </label>
      <label style={label}>Paper tooth · {Math.round(tooth * 100)}%
        <input type="range" min="0" max="1" step=".05" value={tooth} onChange={e => setTooth(Number(e.target.value))}/>
      </label>
      <label style={label}>Paper seed
        <input aria-label="Paper seed" type="number" min={0} max={2147483647} value={seed}
          onChange={e => setSeed(Math.max(0, Math.min(2147483647, Math.floor(Number(e.target.value) || 0))))}
          style={{ minHeight: 40 }}/>
      </label>
      <label style={{ display: "flex", gap: 7, alignItems: "center", minHeight: 40 }}>
        <input type="checkbox" checked={reducedMotion} onChange={e => { setReducedMotion(e.target.checked); setPlaying(false); }}/>
        Reduced motion
      </label>
    </div>
    <div style={{ width: "100%", maxWidth: aspect === "landscape" ? 960 : 490,
      boxShadow: "0 16px 44px #514d3d26", background: "#F8F2E6" }}>
      <ColoredPencilSciencePlate aspect={aspect} subject={subject} frame={frame}
        seed={seed} paperTooth={tooth} reducedMotion={reducedMotion}/>
    </div>
    <div style={{ maxWidth: 960, display: "grid", gap: 8 }}>
      <div aria-live="polite" style={{ color: "#536455", fontWeight: 600 }}>{status}</div>
      <label style={{ ...label, width: "100%" }}>Drawn film frame · {frame} / 352
        <input aria-label="Drawing frame" type="range" min="0" max="352" step="1"
          value={frame} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }}/>
      </label>
      <nav aria-label="Drawing checkpoints" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" style={button} onClick={() => { setPlaying(value => !value); if (frame >= 352) setFrame(0); }}>
          {playing ? "Pause" : frame >= 352 ? "Replay" : "Play film"}</button>
        {([["Graphite", 34], ["First pigment", 100], ["Crosshatching", 180], ["Complete", 300]] as const).map(([name, at]) =>
          <button key={name} type="button" style={button} onClick={() => { setPlaying(false); setFrame(at); }}>{name}</button>)}
      </nav>
    </div>
    <p style={{ maxWidth: 790, margin: 0, color: "#536455", fontSize: 13 }}>
      This is an illustration, not a photograph or measurement. The leaf and mineral faceting are original teaching examples.
      Visual acceptance requires normal-speed exported film review for both aspect ratios.
    </p>
  </main>;
}

/** The same film uses FilmStage, the standard shot list, and scene-local absolute frames. */
function FilmStudio() {
  const [aspect, setAspect] = useState<PencilAspect>("landscape");
  const [subject, setSubject] = useState<PencilSubject>("leaf");
  const [frame, setFrame] = useState(242);
  const [reduce, setReduce] = useState(false);
  const compiled = useMemo(() => compileFilm(COLOR_PENCIL_FILM, { outputId: aspect }), [aspect]);
  if (!compiled.ok) return <pre role="alert">{compiled.diagnostics.map(x => x.path + ": " + x.message).join("\n")}</pre>;
  const film = compiled.film, scale = aspect === "landscape" ? 1 : .7;
  return <main style={page}>
    <h1 style={{ font: "600 29px Georgia,serif", margin: 0 }}>Coloured Pencil · 3-Shot FilmStage</h1>
    <p style={{ maxWidth: 800, margin: 0 }}>Graphite drawing → directional pigment → detailed held observation.
      Existing FD1 shots and cuts own the timeline. The material adapter draws only the frame requested.</p>
    <div style={{ display: "flex", alignItems: "end", gap: 16, flexWrap: "wrap", maxWidth: 960 }}>
      <label style={label}>Output
        <select value={aspect} onChange={e => setAspect(e.target.value as PencilAspect)} style={{ minHeight: 40 }}>
          <option value="landscape">16:9</option><option value="portrait">9:16</option>
        </select>
      </label>
      <label style={label}>Subject
        <select value={subject} onChange={e => setSubject(e.target.value as PencilSubject)} style={{ minHeight: 40 }}>
          <option value="leaf">Leaf</option><option value="crystal">Crystal</option>
        </select>
      </label>
      <label style={{ ...label, flex: "1 1 300px" }}>Film frame {frame} / {film.durationFrames - 1}
        <input aria-label="Film frame" type="range" min="0" max={film.durationFrames - 1} value={frame}
          onChange={e => setFrame(Number(e.target.value))}/>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 40 }}>
        <input type="checkbox" checked={reduce} onChange={e => setReduce(e.target.checked)}/> Reduced motion
      </label>
    </div>
    <div style={{ width: film.width * scale, height: film.height * scale, maxWidth: "100%", overflow: "hidden",
      boxShadow: "0 16px 44px #514d3d26" }}>
      <FilmStage film={film} frame={frame} renderObject={() => null} reducedMotion={reduce}
        renderSlot={(content, context) => {
          if (content.slot !== "colored-pencil-science") throw new Error("Unexpected pencil slot: " + content.slot);
          return <ColoredPencilSciencePlate aspect={aspect} subject={subject}
            frame={Number(content.props?.offsetFrame ?? 0) + context.frame} reducedMotion={context.reducedMotion}/>;
        }} style={{ transform: "scale(" + scale + ")", transformOrigin: "top left" }}/>
    </div>
  </main>;
}

export const Studio: StoryObj<typeof meta> = {
  name: "Drawing studio · Interactive",
  args: { aspect: "landscape", subject: "leaf", frame: 280 },
  render: () => <DrawingStudio/>,
};
export const FilmStageStory: StoryObj<typeof meta> = {
  name: "FilmStage · Three-shot proof",
  args: { aspect: "landscape", subject: "leaf", frame: 242 },
  render: () => <FilmStudio/>,
};
