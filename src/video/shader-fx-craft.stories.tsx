import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ShaderFxLayer } from "../../registry/video/shader-fx-react";
import type { ShaderFxSpec } from "../../registry/video/shader-fx";
import catalogFile from "../../assets/sound/catalog.json";
import lagoon from "../../examples/film/assets/iceland/jokulsarlon.jpg?url";
import falls from "../../examples/film/assets/iceland/dynjandi.jpg?url";
import mark from "../../examples/film/assets/water-mark.svg?url";
import { SHADER_FX_GUIDE } from "../../registry/video/shader-fx-guide";
import { resolveIntoMark } from "../../registry/video/shader-fx-moments";
import { GrainFinish } from "../../registry/video/shader-fx-moments-react";

/** How to use each shader effect well. Every piece plays a professional use beside the most common misuse, with sound cued from the catalog. */
const FPS = 30, fps = { num: FPS, den: 1 };
const previews = import.meta.glob("../../assets/sound/lab/catalog/*.m4a", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const peaks = new Map((catalogFile as { sounds: { id: string; peakSeconds: number }[] }).sounds.map(sound => [sound.id, sound.peakSeconds]));
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const ramp = (a: number, b: number, f: number) => clamp((f - a) / (b - a));
const out = (t: number) => 1 - (1 - t) ** 3;
const smooth = (t: number) => t * t * (3 - 2 * t);
const photo = (id: string, src: string, width: number, height: number) => ({ id, src, alt: id, licenseRef: `commons-${id}-cc0`, width, height });
const LAGOON = photo("jokulsarlon", lagoon, 1800, 1202), FALLS = photo("dynjandi", falls, 1800, 1200);

interface Cue { frame: number; sound: string; gainDb?: number }
interface Variant { label: string; render: (frame: number, width: number) => ReactNode }
interface Guide { use: string; avoid: string; settings: string; sound: string; /** How studio work uses it, from the guide. */ practice?: string }
interface PieceProps { title: string; durationFrames: number; cues: readonly Cue[]; good: Variant; bad?: Variant; guide: Guide }

/** Plays a piece on a frame clock, so the picture is the same at a frame however it is reached, and fires sound at each cue's sync point. */
function Piece({ title, durationFrames, cues, good, bad, guide }: PieceProps) {
  const [frame, setFrame] = useState(0), [playing, setPlaying] = useState(false), [sound, setSound] = useState(true);
  const clock = useRef({ from: 0, at: 0 }), timers = useRef<number[]>([]), audios = useRef<HTMLAudioElement[]>([]);
  const stop = () => { timers.current.forEach(clearTimeout); timers.current = []; audios.current.forEach(audio => audio.pause()); audios.current = []; };
  useEffect(() => {
    if (!playing) { stop(); return; }
    let id = 0;
    clock.current = { from: performance.now(), at: frame };
    if (sound) for (const cue of cues) {
      const wait = ((cue.frame - frame) / FPS - (peaks.get(cue.sound) ?? 0)) * 1000, url = previews[`../../assets/sound/lab/catalog/${cue.sound}.m4a`];
      if (wait < 0 || !url) continue;
      const audio = new Audio(url);
      audio.volume = Math.min(1, 10 ** ((cue.gainDb ?? 0) / 20));
      audio.preload = "auto";
      audios.current.push(audio);
      // Media playback, not a story play function.
      timers.current.push(window.setTimeout(() => void HTMLMediaElement.prototype.play.call(audio).catch(() => undefined), wait));
    }
    const step = (now: number) => {
      const next = clock.current.at + Math.floor((now - clock.current.from) * FPS / 1000);
      if (next >= durationFrames - 1) { setFrame(durationFrames - 1); setPlaying(false); return; }
      setFrame(next);
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(id); stop(); };
  // The clock restarts from the frame where Play was pressed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);
  const W = bad ? 560 : 960, variants = bad ? [good, bad] : [good];
  return <div style={{ padding: 16, display: "grid", gap: 14, maxWidth: 1160, font: "15px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-primary, #10202e)" }}>
    <h2 style={{ margin: 0, font: "700 20px/1.3 var(--km-font-body, system-ui)" }}>{title}</h2>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => { if (frame >= durationFrames - 1) setFrame(0); setPlaying(value => !value); }} style={{ font: "inherit", minHeight: 40, minWidth: 92 }}>{playing ? "Pause" : frame >= durationFrames - 1 ? "Replay" : "Play"}</button>
      <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={sound} onChange={event => setSound(event.target.checked)} />Sound</label>
      <label style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: 240 }}>Frame {frame}
        <input type="range" min={0} max={durationFrames - 1} value={frame} onChange={event => { setPlaying(false); setFrame(Number(event.target.value)); }} style={{ flex: 1 }} /></label>
    </div>
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      {variants.map((variant, i) => <figure key={variant.label} style={{ margin: 0, display: "grid", gap: 6 }}>
        <div style={{ position: "relative", width: W, height: W * 9 / 16, overflow: "hidden", borderRadius: 10, background: "#081420", outline: !bad ? "none" : i ? "2px solid #c2410c" : "2px solid #15803d", outlineOffset: 2 }}>{variant.render(frame, W)}</div>
        <figcaption>{bad ? <><strong style={{ color: i ? "#b23a0b" : "#11703a" }}>{i ? "Common mistake" : "Professional"}</strong>: {variant.label}</> : variant.label}</figcaption>
      </figure>)}
    </div>
    <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 16px", maxWidth: 1136 }}>
      {([[bad ? "Use it for" : "The idea", guide.use], [bad ? "Avoid" : "The rule", guide.avoid], [bad ? "Settings that look premium" : "How it is built", guide.settings], ["Sound", guide.sound],
        ...guide.practice ? [["Seen in practice", guide.practice + " Named examples and sources: docs/29-shader-fx-in-practice.md."]] as const : []] as const).map(([name, text]) =>
        [<dt key={name + "t"} style={{ fontWeight: 700 }}>{name}</dt>, <dd key={name + "d"} style={{ margin: 0 }}>{text}</dd>])}
    </dl>
  </div>;
}

const fill: CSSProperties = { position: "absolute", inset: 0 };
const Fx = ({ spec, frame, duration }: { spec: ShaderFxSpec; frame: number; duration: number }) =>
  <ShaderFxLayer spec={spec} frame={frame} fps={fps} hostDurationFrames={duration} style={fill} />;
/** Words that rise into place one by one: the type moves, the background does not compete. */
function Rise({ text, start, frame, gap = 4, style }: { text: string; start: number; frame: number; gap?: number; style: CSSProperties }) {
  return <span style={{ ...style, display: "block" }}>{text.split(" ").map((word, i) => {
    const t = out(ramp(start + i * gap, start + i * gap + 14, frame));
    return <span key={i} style={{ display: "inline-block", opacity: t, transform: `translateY(${(1 - t) * .45}em)`, marginRight: ".26em" }}>{word}</span>;
  })}</span>;
}

// 1. Mesh gradient: a chapter bridge.
const MESH_FRAMES = 120;
const Chapter: PieceProps = {
  title: "Mesh gradient: a chapter bridge", durationFrames: MESH_FRAMES, cues: [{ frame: 14, sound: "whoosh-slow-soft", gainDb: -8 }],
  good: { label: "four close hues, slow drift, the type does the moving", render: (f, w) => <>
    <Fx frame={f} duration={MESH_FRAMES} spec={{ id: "bridge", effect: "mesh-gradient", layer: "background", treatment: "subtle", rate: .22, seed: 5,
      params: { colors: ["#0b1d2b", "#16405a", "#24606e", "#0f2a3a"], distortion: .8, swirl: .14, grain: .05 } }} />
    <div style={{ position: "absolute", left: "9%", right: "9%", top: "30%", color: "#f1f5f7" }}>
      <span style={{ display: "block", font: `300 ${w / 9}px/1 var(--km-font-body, system-ui)`, opacity: out(ramp(4, 24, f)), letterSpacing: "-.02em" }}>02</span>
      <span style={{ display: "block", height: 1, margin: `${w / 60}px 0`, width: `${out(ramp(10, 40, f)) * 38}%`, background: "#7fb3c4" }} />
      <Rise text="Where the meltwater goes" start={18} frame={f} style={{ font: `600 ${w / 22}px/1.2 var(--km-font-body, system-ui)` }} />
    </div></> },
  bad: { label: "saturated rainbow, fast swirl, small text straight on top", render: (f, w) => <>
    <Fx frame={f} duration={MESH_FRAMES} spec={{ id: "loud", effect: "mesh-gradient", layer: "background", treatment: "hero", rate: 1.4, seed: 5,
      params: { colors: ["#ff3b6b", "#ffb800", "#00e0ff", "#7a00ff"], distortion: 1, swirl: .8, grain: 0 } }} />
    <p style={{ position: "absolute", left: "9%", right: "9%", top: "34%", margin: 0, color: "#fff", font: `400 ${w / 40}px/1.5 var(--km-font-body, system-ui)` }}>
      Chapter 2. Where the meltwater goes. This chapter follows the water from the ice field down to the sea, and shows how each stage changes it.</p></> },
  guide: { practice: SHADER_FX_GUIDE["mesh-gradient"].practice, use: "Chapter cards, openings and quiet bridges between scenes. It sets a mood and a palette without saying anything.",
    avoid: "Busy colour behind small text. A mesh gradient's contrast changes across the frame, so text can pass in one place and fail in another. Never let it be the thing that moves fastest.",
    settings: "3 to 4 neighbouring hues from one palette, rate 0.15 to 0.25, swirl under 0.2, grain about 0.05 to stop banding. Animate the type, not the background.",
    sound: "A soft, slow whoosh as the title rises. Nothing on the gradient itself." },
};

// 2. Liquid metal: a logo sting.
const MARK_FRAMES = 120;
/** The flow rushes in and then settles: shader time runs fast for a second, then slows to a crawl. */
const settle = (f: number) => f < 40 ? f * 2.4 : 96 + (f - 40) * .35;
const Logo: PieceProps = {
  title: "Liquid metal: a logo sting", durationFrames: MARK_FRAMES, cues: [{ frame: 36, sound: "sting-airy-short", gainDb: -4 }],
  good: { label: "one mark, the flow rushes in and settles, the name follows", render: (f, w) => {
    const grow = out(ramp(14, 40, f));
    return <>
      <div style={{ ...fill, background: "radial-gradient(ellipse at 50% 42%, #142636 0%, #070f17 70%)" }} />
      {/* The mark waits for its dark field, so a cut or crossfade into the sting never shows chrome over the last shot. */}
      <div style={{ ...fill, opacity: ramp(14, 22, f), transform: `scale(${.9 + .1 * grow})` }}>
        <Fx frame={settle(f)} duration={9999} spec={{ id: "mark", effect: "liquid-metal", layer: "overlay", treatment: "standard", seed: 2, rate: 1, fadeFrames: 0,
          image: { id: "drop", src: mark, alt: "A water drop mark", licenseRef: "original-kumiki-example" }, region: { x: .35, y: .06, width: .3, height: .58 },
          params: { repetition: 3, contour: .55, softness: .12, distortion: .06, angle: 70, tint: "#dfe9f1", scale: .95 } }} />
      </div>
      <span style={{ position: "absolute", left: 0, right: 0, top: "68%", textAlign: "center", color: "#e8eef2", font: `500 ${w / 24}px/1 var(--km-font-body, system-ui)`,
        letterSpacing: `${.32 - .14 * out(ramp(48, 88, f))}em`, opacity: out(ramp(48, 76, f)) }}>SAMPLE STUDIO</span></>;
  } },
  bad: { label: "chrome on everything: a full-frame shape with text over it", render: (f, w) => <>
    <Fx frame={f * 3} duration={9999} spec={{ id: "blob", effect: "liquid-metal", layer: "background", treatment: "hero", seed: 2, rate: 1, fadeFrames: 0,
      params: { shape: "metaballs", repetition: 8, contour: 1, distortion: .6, scale: 1.6, back: "#2a2a2a" } }} />
    <span style={{ position: "absolute", left: 0, right: 0, top: "44%", textAlign: "center", color: "#fff", font: `700 ${w / 18}px/1 var(--km-font-body, system-ui)` }}>SAMPLE STUDIO</span></> },
  guide: { practice: SHADER_FX_GUIDE["liquid-metal"].practice, use: "One identity moment: a logo, a product mark or an icon, once per film. It reads as precious because it is rare.",
    avoid: "Text, backgrounds and anything with fine detail. Chrome everywhere becomes noise, and a busy reflection makes words unreadable.",
    settings: "A clean silhouette with a transparent background. Repetition 2 to 4, distortion under 0.1. Let the flow rush in for about a second, then slow it right down so the mark settles. Bring the name in after the mark has settled.",
    sound: "One airy sting whose peak lands as the mark settles. Silence before it." },
};

// 3. God rays: a motivated reveal.
const RAYS_FRAMES = 150;
const Light: PieceProps = {
  title: "God rays: light with a source", durationFrames: RAYS_FRAMES, cues: [{ frame: 70, sound: "riser-1s-soft", gainDb: -10 }],
  good: { label: "the rays rise from the glow on the horizon, in its colour, and grow slowly", render: (f, w) => {
    const push = 1 + .05 * smooth(f / RAYS_FRAMES);
    return <>
      <div style={{ ...fill, transform: `scale(${push})`, transformOrigin: "45% 40%" }}>
        <img src={lagoon} alt="" style={{ ...fill, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ ...fill, opacity: smooth(ramp(10, 90, f)) }}>
          <Fx frame={f} duration={RAYS_FRAMES} spec={{ id: "dawn", effect: "god-rays", layer: "overlay", treatment: "standard", seed: 4, rate: .25, fadeFrames: 0,
            params: { colors: ["#ffe2c288", "#ffd0b055"], bloomColor: "#ffd9bf", intensity: .75, density: .25, spotty: .4, bloom: .35, midSize: .14, midIntensity: .35, originX: -.1, originY: -.2 } }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: "7%", bottom: "9%", color: "#fff", textShadow: "0 1px 14px rgba(0,20,40,.55)" }}>
        <Rise text="Light reaches the lagoon" start={84} frame={f} style={{ font: `600 ${w / 24}px/1.2 var(--km-font-body, system-ui)` }} />
      </div></>;
  } },
  bad: { label: "white rays from the top of a frame with no light there, over the title", render: (f, w) => <>
    <img src={lagoon} alt="" style={{ ...fill, width: "100%", height: "100%", objectFit: "cover" }} />
    <Fx frame={f * 2} duration={9999} spec={{ id: "fake", effect: "god-rays", layer: "overlay", treatment: "hero", seed: 4, rate: 1,
      params: { colors: ["#ffffffcc", "#ffffffaa"], intensity: 1, density: .6, bloom: .8, bloomColor: "#ffffff", midSize: .5, midIntensity: .8, originY: -.9 } }} />
    <span style={{ position: "absolute", left: 0, right: 0, top: "40%", textAlign: "center", color: "#fff", font: `600 ${w / 24}px/1.2 var(--km-font-body, system-ui)` }}>Light reaches the lagoon</span></> },
  guide: { practice: SHADER_FX_GUIDE["god-rays"].practice, use: "Reveals of a place, the moment light arrives, or a subject that should feel discovered. Light makes a viewer look where it falls.",
    avoid: "Rays with no source in the picture, pure white beams, and rays crossing text. Real beams need a bright source and haze; without one the eye reads them as a filter.",
    settings: "Find the brightest point in the photograph and set originX and originY on it. Tint the rays with that light's colour, keep intensity near 0.5, and fade them in over 2 to 3 seconds. A slow push toward the source sells it.",
    sound: "A soft riser that peaks as the title lands, not when the rays start." },
};

// 4. Grain gradient: an evidence card.
const QUOTE_FRAMES = 120;
const Quote: PieceProps = {
  title: "Grain gradient: an evidence card", durationFrames: QUOTE_FRAMES, cues: [{ frame: 10, sound: "foley-paper-slide", gainDb: -6 }],
  good: { label: "two muted tones and fine grain, so the words carry the weight", render: (f, w) => <>
    <Fx frame={f} duration={QUOTE_FRAMES} spec={{ id: "paper", effect: "grain-gradient", layer: "background", treatment: "subtle", seed: 7, rate: .15,
      params: { colors: ["#1b2a33", "#24384a"], back: "#121c24", softness: .9, intensity: .15, noise: .12, shape: "corners" } }} />
    <div style={{ position: "absolute", left: "11%", right: "11%", top: "24%", color: "#eef2f4" }}>
      <span style={{ display: "block", font: `400 ${w / 7}px/0.6 Georgia, serif`, color: "#8fb6c2", opacity: out(ramp(0, 16, f)) }}>“</span>
      <Rise text="Put the source on the same screen as the claim." start={10} frame={f} gap={3} style={{ font: `500 ${w / 25}px/1.35 Georgia, serif` }} />
      <span style={{ display: "block", marginTop: w / 40, font: `600 ${w / 52}px/1 var(--km-font-body, system-ui)`, letterSpacing: ".14em", color: "#9fb6c0", opacity: out(ramp(56, 76, f)) }}>EDITORIAL RULE</span>
    </div></> },
  bad: { label: "heavy, colourful noise under small text", render: (f, w) => <>
    <Fx frame={f} duration={QUOTE_FRAMES} spec={{ id: "static", effect: "grain-gradient", layer: "background", treatment: "hero", seed: 7, rate: 1,
      params: { colors: ["#ff6a00", "#00c2ff", "#d400ff"], back: "#222222", softness: .2, intensity: .9, noise: .9, shape: "truchet" } }} />
    <p style={{ position: "absolute", left: "11%", right: "11%", top: "36%", margin: 0, color: "#fff", font: `400 ${w / 42}px/1.5 var(--km-font-body, system-ui)` }}>
      “Put the source on the same screen as the claim.” Editorial rule, applied to every chapter in this film and every figure it shows.</p></> },
  guide: { practice: SHADER_FX_GUIDE["grain-gradient"].practice, use: "Quotes, evidence, statistics and documentary cards. Grain makes a flat digital colour feel like paper or film, and it hides gradient banding after video compression.",
    avoid: "Heavy noise and saturated colour behind small text. Grain is texture: once you notice it, it is too much.",
    settings: "Two neighbouring dark tones, softness 0.8 to 0.9, noise 0.1 to 0.15, rate under 0.2. Use a serif or a strong weight so the words hold against the texture.",
    sound: "A paper slide as the card arrives. The quote itself should land in silence." },
};

// 5. Water: a living still.
const STILL_FRAMES = 150;
const HORIZON = "52%";
const Still: PieceProps = {
  title: "Water: a living still (a cinemagraph)", durationFrames: STILL_FRAMES, cues: [{ frame: 6, sound: "bed-wind-mountain", gainDb: -14 }],
  good: { label: "only the lagoon moves; ice, sky and title stay still", render: (f, w) => {
    const push = 1 + .03 * smooth(f / STILL_FRAMES);
    return <>
      <div style={{ ...fill, transform: `scale(${push})` }}>
        <Fx frame={f} duration={STILL_FRAMES} spec={{ id: "lagoon", effect: "water", layer: "background", treatment: "subtle", seed: 1, rate: .3, fadeFrames: 0, image: LAGOON,
          params: { caustic: .05, waves: .05, layering: .2, edges: .15, highlights: .02, size: 1.2 } }} />
        {/* The still sits on top, cut away below the waterline with a soft edge, so only water moves. */}
        <img src={lagoon} alt="" style={{ ...fill, width: "100%", height: "100%", objectFit: "cover",
          maskImage: `linear-gradient(to bottom, #000 calc(${HORIZON} - 2%), transparent calc(${HORIZON} + 2%))`, WebkitMaskImage: `linear-gradient(to bottom, #000 calc(${HORIZON} - 2%), transparent calc(${HORIZON} + 2%))` }} />
      </div>
      <div style={{ position: "absolute", left: "7%", top: "9%", color: "#0d2133" }}>
        <Rise text="Still air, moving water" start={30} frame={f} style={{ font: `600 ${w / 26}px/1.2 var(--km-font-body, system-ui)` }} />
      </div></>;
  } },
  bad: { label: "the whole picture wobbles, even the mountains and the sky", render: (f, w) => <>
    <Fx frame={f} duration={STILL_FRAMES} spec={{ id: "wobble", effect: "water", layer: "background", treatment: "hero", seed: 1, rate: 1, image: LAGOON,
      params: { caustic: .3, waves: .5, layering: .8, edges: .8, highlights: .2, size: .6 } }} />
    <span style={{ position: "absolute", left: "7%", top: "9%", color: "#0d2133", font: `600 ${w / 26}px/1.2 var(--km-font-body, system-ui)` }}>Still air, moving water</span></> },
  guide: { practice: SHADER_FX_GUIDE["water"].practice, use: "Making a still photograph feel alive: a lake, a stream, wet stone. The stillness around the movement is what makes it striking.",
    avoid: "Distorting land, sky, faces or text. If everything moves, the viewer sees an effect instead of a place.",
    settings: "Mask the effect to the water only, and put the mask edge where the picture already changes, such as the shoreline. Waves and caustic around 0.05, rate about 0.3. A very slow push keeps it alive without drawing attention.",
    sound: "A quiet outdoor bed. A cinemagraph is calm, so no hits." },
};

// 6. Halftone: from print to photograph.
const PRINT_FRAMES = 150;
const Print: PieceProps = {
  title: "Halftone: from print to photograph", durationFrames: PRINT_FRAMES, cues: [{ frame: 74, sound: "props-page-turn", gainDb: -6 }],
  good: { label: "ink on paper with grain, then a clean wipe to the photograph", render: (f, w) => {
    const wipe = smooth(ramp(72, 106, f));
    return <>
      <Fx frame={f} duration={PRINT_FRAMES} spec={{ id: "print", effect: "halftone-dots", layer: "background", treatment: "standard", seed: 1, fadeFrames: 0, image: FALLS,
        params: { front: "#1d1a16", back: "#efe8da", size: .62, radius: 1.3, contrast: .55, grid: "hex", type: "classic", grain: .3 } }} />
      <img src={falls} alt="" style={{ ...fill, width: "100%", height: "100%", objectFit: "cover", clipPath: `inset(0 ${100 - wipe * 100}% 0 0)` }} />
      {wipe > 0 && wipe < 1 && <span style={{ position: "absolute", top: 0, bottom: 0, left: `${wipe * 100}%`, width: 2, background: "#efe8da", boxShadow: "0 0 18px rgba(255,255,255,.6)" }} />}
      <span style={{ position: "absolute", left: "6%", bottom: "7%", padding: "6px 12px", borderRadius: 6, background: wipe < .5 ? "#1d1a16" : "#ffffff", color: wipe < .5 ? "#efe8da" : "#14202b",
        font: `600 ${w / 46}px/1.2 var(--km-font-body, system-ui)`, letterSpacing: ".08em" }}>{wipe < .5 ? "PRINT" : "PHOTOGRAPH"}</span></>;
  } },
  bad: { label: "dots so large the picture is gone, in colour, with no paper", render: (f, w) => <>
    <Fx frame={f} duration={PRINT_FRAMES} spec={{ id: "lost", effect: "halftone-dots", layer: "background", treatment: "hero", seed: 1, image: FALLS,
      params: { size: 1.5, radius: 2, contrast: .15, originalColors: true, grid: "square", type: "gooey" } }} />
    <span style={{ position: "absolute", left: "6%", bottom: "7%", color: "#fff", font: `600 ${w / 46}px/1.2 var(--km-font-body, system-ui)` }}>PRINT</span></> },
  guide: { practice: SHADER_FX_GUIDE["halftone-dots"].practice, use: "Archive material, newspapers, evidence and then-and-now reveals. The print look says that this came from a page.",
    avoid: "Dots so large that the subject disappears, low contrast, faces at small sizes, and pop-art colour in a serious piece.",
    settings: "Ink on a warm paper colour, a hex grid, contrast 0.5 to 0.6, and some grain so the dots look printed rather than generated. Choose a photo with clear light and dark areas. A straight wipe to the photograph is the payoff.",
    sound: "A page turn on the wipe." },
};

// 7. All of it together: each effect has one job, and one effect leads each shot.
const SHOTS = [
  { piece: Chapter, start: 0, end: 105 },
  { piece: Light, start: 90, end: 240 },
  { piece: Still, start: 225, end: 330 },
  { piece: Print, start: 315, end: 450 },
  { piece: Logo, start: 435, end: 540 },
] as const;
const CROSS = 15;
const Sequence: PieceProps = {
  title: "All six jobs in one title sequence", durationFrames: 540,
  cues: SHOTS.flatMap(shot => shot.piece.cues.map(cue => ({ ...cue, frame: cue.frame + shot.start }))),
  good: { label: "A chapter card, a reveal, a living still, an archive print and a sign-off. 18 seconds, one effect leading each shot, crossfades of half a second.", render: (f, w) => <>
    {SHOTS.filter(shot => f >= shot.start && f < shot.end).map(shot => <div key={shot.piece.title} style={{ ...fill, opacity: shot.start ? smooth(ramp(shot.start, shot.start + CROSS, f)) : 1 }}>
      {shot.piece.good.render(f - shot.start, w)}</div>)}
  </> },
  guide: { use: "Restraint is what makes these effects look expensive. Each one appears once, does one job, and leaves before it becomes wallpaper.",
    avoid: "Two effects competing in one shot, and an effect that is louder than the words. Only a crossfade holds two at once.",
    settings: "Every shot is a pure function of the frame, so the sequence can be scrubbed, captured and exported frame for frame. Only the shots on screen hold a WebGL context: two at most, during a crossfade.",
    sound: "Five cues, each placed on its picture's moment: a whoosh under the chapter title, a riser into the reveal, a quiet wind bed for the still, a page turn on the wipe, and the sting as the mark settles." },
};

// Patterns from studio and brand work. See docs/29-shader-fx-in-practice.md for the examples behind each one.

// 8. Resolve: a field of dots sharpens into the picture.
const RESOLVE_FRAMES = 150;
const Resolve: PieceProps = {
  title: "Pattern: dots sharpen into the picture", durationFrames: RESOLVE_FRAMES, cues: [{ frame: 78, sound: "riser-1s-soft", gainDb: -10 }],
  good: { label: "The dots start flat, as pure texture, then gain contrast and shrink until the photograph appears. The effect is the reveal, not decoration.", render: (f, w) => <>
    <Fx frame={f} duration={RESOLVE_FRAMES} spec={{ id: "resolve", effect: "halftone-dots", layer: "background", treatment: "standard", seed: 1, fadeFrames: 0, image: FALLS,
      params: { front: "#1d1a16", back: "#efe8da", grid: "hex", type: "classic", grain: .25 },
      keys: [{ param: "contrast", from: 0, to: .6, startFrame: 8, endFrame: 78 }, { param: "size", from: .95, to: .55, startFrame: 8, endFrame: 86 }, { param: "radius", from: 1.9, to: 1.25, startFrame: 8, endFrame: 86 }] }} />
    <span style={{ position: "absolute", left: "6%", bottom: "8%", padding: "6px 12px", borderRadius: 6, background: "#1d1a16", color: "#efe8da",
      font: `600 ${w / 48}px/1.2 var(--km-font-body, system-ui)`, letterSpacing: ".1em", opacity: out(ramp(88, 106, f)) }}>FIELD NOTES · ISSUE 12</span></> },
  guide: { practice: SHADER_FX_GUIDE["halftone-dots"].practice, use: "Openings for publications, archives and anything with a print heritage. The dots stand for many stories, and the picture they resolve into is the one this piece tells.",
    avoid: "Resolving too fast. The audience must see the texture first, or the reveal has nothing to reveal.",
    settings: "Key contrast from 0 to about 0.6 and dot size from large to about 0.55 over 2 to 3 seconds, eased. Hold the finished picture for a beat before any text.",
    sound: "A soft riser that peaks as the picture becomes clear." },
};

// 9. Resolve: beams of light gather into a mark.
const GATHER_FRAMES = 150;
const Gather: PieceProps = {
  title: "Pattern: light gathers into a mark", durationFrames: GATHER_FRAMES, cues: [{ frame: 58, sound: "sting-airy-short", gainDb: -6 }],
  good: { label: "Coloured beams build toward one point, the mark appears where they meet, and the light falls back so the mark holds the frame. Each colour can stand for one strand of the story.", render: (f, w) => {
    const markIn = out(ramp(50, 70, f));
    return <>
      <div style={{ ...fill, background: "#05090e" }} />
      <Fx frame={f} duration={GATHER_FRAMES} spec={{ id: "gather", effect: "god-rays", layer: "background", treatment: "standard", seed: 9, rate: .5, fadeFrames: 0,
        params: { colors: ["#3fb6c6aa", "#f2b45a99", "#e2667a88"], back: "#05090e", bloomColor: "#ffffff", density: .3, spotty: .25, bloom: .4, midSize: .18, originY: 0 },
        keys: [{ param: "intensity", from: 0, to: .85, startFrame: 0, endFrame: 48 }, { param: "intensity", from: .85, to: .35, startFrame: 70, endFrame: 115 },
          { param: "midIntensity", from: 0, to: .9, startFrame: 24, endFrame: 56 }, { param: "midIntensity", from: .9, to: .55, startFrame: 70, endFrame: 115 }] }} />
      <img src={mark} alt="" style={{ position: "absolute", left: "50%", top: "50%", width: w * .1, transform: `translate(-50%, -54%) scale(${.86 + .14 * markIn})`, opacity: markIn, filter: "brightness(1.6)" }} />
      <span style={{ position: "absolute", left: 0, right: 0, top: "70%", textAlign: "center", color: "#eef3f6", font: `500 ${w / 30}px/1 var(--km-font-body, system-ui)`, letterSpacing: ".3em", opacity: out(ramp(84, 108, f)) }}>SAMPLE STUDIO</span></>;
  } },
  guide: { practice: SHADER_FX_GUIDE["god-rays"].practice, use: "A brand or channel identity that opens every film. The mark is a silhouette held in front of the light, so it reads as backlit. The light carries meaning: the beams can be the many things the brand makes, and the mark is where they come together.",
    avoid: "Light that only decorates. If the rays do not end in the mark, they are a filter.",
    settings: "Centre the rays on the mark. Key intensity up over about 1.5 seconds, bring the core glow up just before the mark, then let both fall back so the mark stays readable. Two or three colours, each with a reason.",
    sound: "One sting on the moment the light becomes the mark." },
};

// 10. Signature: one gradient that the whole brand owns.
const SIGNATURE_FRAMES = 150;
const signature = (id: string): ShaderFxSpec => ({ id, effect: "mesh-gradient", layer: "background", treatment: "subtle", rate: .2, seed: 11,
  params: { colors: ["#0b1d2b", "#16405a", "#2a6b73", "#c9874f"], distortion: .7, swirl: .15, grain: .05 } });
function Formats({ frame, width }: { frame: number; width: number }) {
  const h = width * 9 / 16, card = (w: number, ht: number, label: string, title: string, size: number) =>
    <figure style={{ margin: 0, display: "grid", gap: 4, justifyItems: "start" }}>
      <div style={{ position: "relative", width: w, height: ht, overflow: "hidden", borderRadius: 8 }}>
        <Fx frame={frame} duration={SIGNATURE_FRAMES} spec={signature(label)} />
        <span style={{ position: "absolute", left: "9%", right: "9%", bottom: "10%", color: "#f3f6f8", font: `600 ${size}px/1.2 var(--km-font-body, system-ui)` }}>{title}</span>
      </div>
      <figcaption style={{ color: "#c7d3db", fontSize: 12 }}>{label}</figcaption>
    </figure>;
  return <div style={{ ...fill, background: "#0a1118", display: "flex", gap: width / 40, alignItems: "center", justifyContent: "center" }}>
    {card(width * .38, width * .38 * 9 / 16, "Film, 16:9", "Where the meltwater goes", width / 42)}
    {card(h * .72 * 9 / 16, h * .72, "Story, 9:16", "Chapter 2", width / 50)}
    {card(h * .46, h * .46, "Post, 1:1", "New chapter", width / 52)}
  </div>;
}
const Signature: PieceProps = {
  title: "Pattern: one signature gradient across every format", durationFrames: SIGNATURE_FRAMES, cues: [],
  good: { label: "The same palette, seed and slow drift in a film card, a story and a post. Owned this way, a gradient becomes a recognisable asset instead of a trend.", render: (f, w) => <Formats frame={f} width={w} /> },
  guide: { practice: SHADER_FX_GUIDE["mesh-gradient"].practice, use: "A brand or series that appears in many places. A gradient used once is decoration; the same gradient everywhere is identity.",
    avoid: "A different gradient in every film, or the generic purple-to-blue that many brands share. A trend gradient dates quickly and identifies no one.",
    settings: "Fix the palette, the seed and the rate, and write them down as brand values. Add one accent hue that is yours. Keep the motion slow enough to leave behind text in any format.",
    sound: "None. A signature should work in silence." },
};

// 11. Colour with a reason: every colour in the light stands for something the audience will meet.
const MEANING_FRAMES = 150;
const THREADS = [{ color: "#3fb6c6", label: "Rivers", at: 14 }, { color: "#f2b45a", label: "Light", at: 26 }, { color: "#e2667a", label: "Ice at dusk", at: 38 }];
const meaningMark = (colors: readonly string[], f: number, w: number, legend: boolean) => {
  const { fx, markFrame, nameFrame } = resolveIntoMark({ colors }), shown = out(ramp(markFrame, markFrame + 20, f));
  return <>
    <div style={{ ...fill, background: "#05090e" }} />
    <Fx frame={f} duration={MEANING_FRAMES} spec={fx} />
    <img src={mark} alt="" style={{ position: "absolute", left: "50%", top: "46%", width: w * .1, transform: `translate(-50%, -54%) scale(${.86 + .14 * shown})`, opacity: shown }} />
    <span style={{ position: "absolute", left: 0, right: 0, top: "66%", textAlign: "center", color: "#eef3f6", font: `500 ${w / 32}px/1 var(--km-font-body, system-ui)`, letterSpacing: ".3em", opacity: out(ramp(nameFrame, nameFrame + 24, f)) }}>SAMPLE STUDIO</span>
    {legend && <div style={{ position: "absolute", left: 0, right: 0, bottom: "8%", display: "flex", justifyContent: "center", gap: w / 30 }}>
      {THREADS.map(thread => <span key={thread.label} style={{ display: "flex", gap: 8, alignItems: "center", color: "#dfe7ec", font: `500 ${w / 52}px/1 var(--km-font-body, system-ui)`, opacity: out(ramp(thread.at, thread.at + 14, f)) }}>
        <i style={{ width: w / 70, height: w / 70, borderRadius: 999, background: thread.color, display: "inline-block" }} />{thread.label}</span>)}
    </div>}
  </>;
};
const Meaning: PieceProps = {
  title: "Pattern: colour with a reason", durationFrames: MEANING_FRAMES, cues: [{ frame: 58, sound: "sting-airy-short", gainDb: -6 }],
  good: { label: "three colours, one for each of the studio's series, named as they arrive and then gathered into the mark", render: (f, w) => meaningMark(THREADS.map(thread => thread.color + "ee"), f, w, true) },
  bad: { label: "a rainbow chosen because it looks lively, standing for nothing", render: (f, w) => meaningMark(["#ff0000aa", "#ffa500aa", "#ffff00aa", "#00ff00aa", "#0080ffaa", "#8000ffaa"], f, w, false) },
  guide: { practice: SHADER_FX_GUIDE["god-rays"].practice,
    use: "An identity or chapter where the light gathers several things into one: a studio's series, a story's strands, a product's parts. The audience learns the colours, and the mark means more.",
    avoid: "Colour picked for liveliness. Six unexplained hues read as a template, and a viewer cannot tell what the light is for.",
    settings: "Two or three colours, each with a reason you can say aloud. Name them once, briefly, as they arrive, then let them gather into the mark. Use the same colours later in the film, so the meaning holds.",
    sound: "One sting as the colours gather into the mark." },
};

// 12. Practical light: haze, grain and a little flicker make rays read as filmed, not drawn.
const PRACTICAL_FRAMES = 150;
/** A small, fixed flicker, as a real lamp through smoke has. It is keyed, so every frame is the same on every render. */
const FLICKER = Array.from({ length: 18 }, (_, i) => ({ param: "intensity", from: i ? (i % 2 ? .66 : .58) : 0, to: i % 2 ? .58 : .66, startFrame: i ? 40 + (i - 1) * 6 : 0, endFrame: i ? 46 + (i - 1) * 6 : 40, ease: "in-out" as const }));
const practical = (f: number, w: number, made: boolean) => <>
  <div style={{ ...fill, background: made ? "radial-gradient(ellipse at 50% -10%, #3a2a1c 0%, #0b0a09 62%)" : "#000" }} />
  <Fx frame={f} duration={PRACTICAL_FRAMES} spec={{ id: made ? "practical" : "clean", effect: "god-rays", layer: "background", treatment: "standard", seed: 6, rate: made ? .3 : .3, fadeFrames: 0,
    params: made ? { colors: ["#ffd9a880", "#ffc68a55"], back: "#00000000", bloomColor: "#ffdcb0", density: .18, spotty: .65, bloom: .5, midSize: .1, midIntensity: .3, originX: 0, originY: -.75 }
      : { colors: ["#ffffffcc", "#ffffffcc"], back: "#000000", bloomColor: "#ffffff", density: .6, spotty: .05, bloom: 0, midSize: 0, midIntensity: 0, originX: 0, originY: -.75, intensity: .8 },
    keys: made ? FLICKER : undefined }} />
  {made && <div aria-hidden style={{ ...fill, background: "linear-gradient(to bottom, rgba(255,226,190,.08), rgba(255,226,190,0) 45%), radial-gradient(ellipse at 50% 120%, rgba(0,0,0,.55), transparent 60%)" }} />}
  {made && <GrainFinish frame={f} amount={.07} />}
  <span style={{ position: "absolute", left: 0, right: 0, top: "62%", textAlign: "center", color: made ? "#f3e6d4" : "#ffffff", font: `600 ${w / 20}px/1 var(--km-font-body, system-ui)`, letterSpacing: ".18em", opacity: out(ramp(60, 90, f)) }}>CHAPTER ONE</span>
</>;
const Practical: PieceProps = {
  title: "Pattern: light that looks filmed", durationFrames: PRACTICAL_FRAMES, cues: [{ frame: 0, sound: "bed-cave-air", gainDb: -16 }, { frame: 74, sound: "riser-1s-soft", gainDb: -12 }],
  good: { label: "warm haze, long soft beams, film grain and a small fixed flicker, as a lamp through smoke would give", render: (f, w) => practical(f, w, true) },
  bad: { label: "clean white beams of even strength on pure black: precise, and obviously drawn", render: (f, w) => practical(f, w, false) },
  guide: { practice: SHADER_FX_GUIDE["god-rays"].practice,
    use: "Titles and moments that should feel crafted rather than computed. Real beams always come with haze, uneven strength and texture.",
    avoid: "Perfect, uniform, pure-white beams on pure black. Precision is what gives computer graphics away.",
    settings: "Warm, slightly transparent ray colours. Low density with long, soft beams (spotty about 0.6). A faint haze gradient and a vignette, a grain finish around 0.07, and a keyed flicker of plus or minus 0.04 in intensity.",
    sound: "A quiet room tone, and a soft riser into the title." },
};

const meta = { title: "Video production/Shader FX Craft", id: "video-shader-fx-craft", component: Piece, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Piece>;
export default meta;
type Story = StoryObj<typeof meta>;
export const TitleSequence: Story = { args: Sequence };
export const MeshGradientChapterBridge: Story = { args: Chapter };
export const LiquidMetalLogoSting: Story = { args: Logo };
export const GodRaysLightWithASource: Story = { args: Light };
export const GrainGradientEvidenceCard: Story = { args: Quote };
export const WaterLivingStill: Story = { args: Still };
export const HalftonePrintToPhotograph: Story = { args: Print };
export const PatternDotsSharpenIntoThePicture: Story = { args: Resolve };
export const PatternLightGathersIntoAMark: Story = { args: Gather };
export const PatternOneSignatureGradient: Story = { args: Signature };
export const PatternColourWithAReason: Story = { args: Meaning };
export const PatternLightThatLooksFilmed: Story = { args: Practical };
