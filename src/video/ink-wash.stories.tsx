import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileFilm } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { InkWash } from "../../registry/video/ink-wash-react";
import type { InkWashSpec } from "../../registry/video/ink-wash";
import { inkExampleSpec } from "./ink-wash-demo";
import type { InkAspect, InkSubject } from "./ink-wash-demo";
import { INK_WASH_FILM } from "./ink-wash-film";

const MAX_FRAME = 419;
const buttonStyle = { border: "1px solid #B4B0A3", background: "#FAF8F3",
  color: "#32342D", borderRadius: 6, padding: "8px 14px", minHeight: 42,
  font: "600 13px system-ui", cursor: "pointer" } as const;
const labelStyle = { display: "grid", gap: 5, minWidth: 160,
  font: "600 13px system-ui", color: "#393D36" } as const;

function Painting({ spec, subject, frame, absorption, grain, reducedMotion }: {
  spec: InkWashSpec; subject: InkSubject; frame: number; absorption: number; grain: number; reducedMotion: boolean;
}) {
  const portrait = spec.height > spec.width;
  return <div style={{ width: spec.width, height: spec.height, position: "relative", background: spec.paper, overflow: "hidden" }}>
    <InkWash spec={spec} frame={frame} absorption={absorption} grain={grain} reducedMotion={reducedMotion}
      label={subject === "landscape" ? "Pine tree, mountains and water being painted in Chinese ink wash" :
        "A bamboo grove being painted in Chinese ink wash"} />
    {/* Text is deliberately separate from pigment so captions never grow ink halos or lose legibility. */}
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox={"0 0 " + spec.width + " " + spec.height}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      <g fill="#30382F">
        <text x={portrait ? 46 : 74} y={portrait ? 77 : 47}
          fontSize={12} fontFamily="system-ui,sans-serif" fontWeight={700} letterSpacing={3.1}>
          INK STUDIES / 01
        </text>
        <text x={portrait ? 45 : 73} y={portrait ? 140 : 100}
          fontSize={portrait ? 44 : 49} fontFamily="Georgia, 'Times New Roman', serif" letterSpacing={-.7}>
          {subject === "landscape" ? "Among the pines" : "Quiet bamboo"}
        </text>
        <text x={portrait ? 47 : 76} y={portrait ? 181 : 126}
          fontSize={portrait ? 14 : 13} fontFamily="system-ui,sans-serif" letterSpacing={.9} opacity={.79}>
          {subject === "landscape" ? "Mountain, mist and a single enduring tree" : "A gesture of stems, leaves and light"}
        </text>
      </g>
      <path d={portrait ? "M46 211 H494" : "M75 140 H885"}
        fill="none" stroke="#B4AEA1" strokeWidth={1} />
      <path d={portrait ? "M46 885 H494" : "M75 505 H885"}
        fill="none" stroke="#B4AEA1" strokeWidth={1} />
      <g fontFamily="system-ui,sans-serif" fontSize={11} letterSpacing={1.2} fill="#4C5147">
        <text x={portrait ? 47 : 76} y={portrait ? 915 : 528}>WATER · PIGMENT · FIBRE</text>
        <text x={portrait ? 458 : 849} y={portrait ? 915 : 528} textAnchor="end">INK / 01</text>
      </g>
    </svg>
  </div>;
}

/** Playback is only a Storybook convenience; all material math accepts absolute film frames. */
function InkWashStudio() {
  const [subject, setSubject] = useState<InkSubject>("landscape");
  const [aspect, setAspect] = useState<InkAspect>("landscape");
  const [frame, setFrame] = useState(335);
  const [playing, setPlaying] = useState(false);
  const [grain, setGrain] = useState(.6);
  const [absorption, setAbsorption] = useState(.69);
  const [seed, setSeed] = useState(47);
  const [reducedMotion, setReducedMotion] = useState(false);
  const spec = useMemo(() => inkExampleSpec(subject, aspect, seed), [subject, aspect, seed]);
  const compiled = useMemo(() => compileFilm(INK_WASH_FILM, { outputId: aspect }), [aspect]);

  useEffect(() => {
    if (!playing) return;
    const started = performance.now(), initial = frame;
    let request = 0;
    const tick = (now: number) => {
      const next = Math.min(MAX_FRAME, initial + Math.floor((now - started) * 30 / 1000));
      setFrame(next);
      if (next < MAX_FRAME) request = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
    // Intentionally capture the frame at the moment Play was pressed, not each successive tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  if (!compiled.ok) return <pre role="alert">{compiled.diagnostics.map(p => p.path + ": " + p.message).join("\n")}</pre>;
  const film = compiled.film;
  const scale = aspect === "portrait" ? .52 : .9;
  const message = frame < 20 ? "Still paper" : frame < 108 ? "Pale wash deposited" :
    frame < 230 ? "The brush finds its subject" : frame < 298 ? "Capillary spreading and drying" : "Finished ink on paper";
  return <main style={{ minHeight: "100vh", display: "grid", justifyItems: "start", alignContent: "start",
    gap: 18, padding: "clamp(16px,3vw,30px)", background: "#EAE8E0", font: "15px/1.5 system-ui,sans-serif", color: "#292D28" }}>
    <header style={{ maxWidth: 790 }}>
      <div style={{ color: "#785D50", fontWeight: 700, fontSize: 12, letterSpacing: 2.7 }}>MATERIAL-NATIVE FILM / CHINESE INK WASH</div>
      <h1 style={{ font: "500 clamp(28px,3.7vw,42px)/1.15 Georgia,serif", margin: "7px 0 5px" }}>Brush, water, paper.</h1>
      <p style={{ margin: 0, maxWidth: 720, color: "#52574F" }}>Watch an original illustration emerge from individual strokes.
        Pressure shapes each mark; brush moisture determines bristle splitting; absorbent paper draws pigment beyond the stroke.</p>
    </header>
    <div style={{ width: film.width * scale, height: film.height * scale, maxWidth: "100%",
      overflow: "hidden", boxShadow: "0 18px 56px rgba(43,41,31,.16)" }}>
      <FilmStage film={film} frame={frame} renderObject={() => null} reducedMotion={reducedMotion}
        renderSlot={(content, context) => {
          if (content.slot !== "ink-wash-study") throw new Error("Unknown INK1 slot: " + content.slot);
          const offset = Number(content.props?.offsetFrame ?? 0);
          return <Painting spec={spec} subject={subject} frame={offset + context.frame}
            grain={grain} absorption={absorption} reducedMotion={context.reducedMotion}/>;
        }}
        style={{ transform: "scale(" + scale + ")", transformOrigin: "0 0" }}/>
    </div>
    <div aria-live="polite" style={{ width: "100%", maxWidth: 880, display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
      <strong>{message}</strong>
      <span style={{ color: "#62665D" }}>30 fps · fixed seed · frame {frame} / {MAX_FRAME}</span>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 14, width: "100%", maxWidth: 880 }}>
      <button type="button" style={{ ...buttonStyle, background: "#29362E", color: "#FFFFFF" }}
        onClick={() => { if (frame === MAX_FRAME) setFrame(0); setPlaying(v => !v); }}
        disabled={reducedMotion}>{playing ? "Pause" : frame >= MAX_FRAME ? "Replay" : "Play film"}</button>
      <label style={{ ...labelStyle, flex: 1, minWidth: 280 }}>Scrub film frame
        <input type="range" aria-label="Scrub ink film" min={0} max={MAX_FRAME} value={frame}
          onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }}/>
      </label>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {([["Blank paper", 0], ["Wash", 78], ["Gestural brush", 170], ["Wet spread", 260], ["Dry hold", 395]] as const)
        .map(([name, at]) => <button type="button" key={name} style={buttonStyle}
          onClick={() => { setPlaying(false); setFrame(at); }}>{name}</button>)}
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 18, maxWidth: 900, alignItems: "end" }}>
      <label style={labelStyle}>Original subject
        <select value={subject} onChange={e => { setPlaying(false); setSubject(e.target.value as InkSubject); }}
          style={{ font: "inherit", minHeight: 40 }}>
          <option value="landscape">Mountain and pine</option><option value="bamboo">Bamboo grove</option>
        </select>
      </label>
      <label style={labelStyle}>Composition
        <select value={aspect} onChange={e => { setPlaying(false); setAspect(e.target.value as InkAspect); }}
          style={{ font: "inherit", minHeight: 40 }}>
          <option value="landscape">16:9 landscape</option><option value="portrait">9:16 portrait</option>
        </select>
      </label>
      <label style={labelStyle}>Absorbency · {Math.round(absorption * 100)}%
        <input type="range" min={0} max={1} step={.05} value={absorption}
          onChange={e => setAbsorption(Number(e.target.value))}/>
      </label>
      <label style={labelStyle}>Paper tooth · {Math.round(grain * 100)}%
        <input type="range" min={0} max={1} step={.05} value={grain}
          onChange={e => setGrain(Number(e.target.value))}/>
      </label>
      <label style={labelStyle}>Seed
        <input type="number" min={0} max={2147483647} step={1} value={seed}
          style={{ font: "inherit", minHeight: 40 }}
          onChange={e => setSeed(Math.max(0, Math.min(2147483647, Math.floor(Number(e.target.value) || 0))))}/>
      </label>
      <label style={{ display: "flex", gap: 8, alignItems: "center", minHeight: 40, font: "600 13px system-ui" }}>
        <input type="checkbox" checked={reducedMotion} onChange={e => { setPlaying(false); setReducedMotion(e.target.checked); }}/>
        Reduced motion (final still)
      </label>
    </div>
    <p style={{ color: "#61685F", margin: 0, maxWidth: 760, fontSize: 13 }}>
      Material study, not a photographic filter. The preview compiles through FilmDocument and FilmStage. The three cuts share one
      absolute stroke timeline; playback never accumulates fluid state. Final artistic acceptance requires reviewing encoded video.</p>
  </main>;
}

const meta = { title: "Video production/Material-native film", id: "video-ink-wash",
  component: InkWashStudio, parameters: { layout: "fullscreen" } } satisfies Meta<typeof InkWashStudio>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ChineseInkWash: Story = { name: "Chinese ink wash · Film Stage" };
