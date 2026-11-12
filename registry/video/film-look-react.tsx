/** Draws a resolved film look over anything: a scene of HTML, canvas or WebGL. The grade is one SVG filter on the composited picture
 * (colour matrix, per-channel tone curves, optional posterising, highlight glow, anamorphic streaks, video colour bleed and
 * softness); the texture is a few layers above it (grain, vignette, light leaks, blinds, scan lines, tracking noise, a matte); the
 * camera's movement and the gate weave are a transform. Every value comes from the frame, so any frame renders the same in any order.
 */
import { useId, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { cadenceFrame, gradeCurve, gradeMatrix, lookFrame } from "./film-look";
import type { ResolvedLook } from "./film-look";

/** Six tiles of film grain, made once per kind: Gaussian-ish noise about mid grey, in colour or in one channel. */
const tiles = new Map<string, string[]>();
function grainTiles(mono: boolean): string[] {
  const key = mono ? "mono" : "colour";
  if (tiles.has(key) || typeof document === "undefined") return tiles.get(key) ?? [];
  const out: string[] = [];
  for (let t = 0; t < 6; t++) {
    const size = 256, canvas = document.createElement("canvas"); canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d"); if (!ctx) return [];
    const image = ctx.createImageData(size, size);
    let a = (t + 1) * 2654435761 >>> 0;
    const random = () => { a = (a + 0x6d2b79f5) >>> 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    // The sum of three uniforms is close to Gaussian; real grain clumps, it does not dither.
    const n = () => (random() + random() + random()) / 3 - .5;
    for (let i = 0; i < size * size; i++) {
      const v = n(), r = 128 + v * 255, g = mono ? r : 128 + n() * 230, b = mono ? r : 128 + n() * 280;
      image.data.set([r, g, b, 255], i * 4);
    }
    ctx.putImageData(image, 0, 0); out.push(canvas.toDataURL());
  }
  tiles.set(key, out);
  return out;
}

const hexRgb = (hex: string): [number, number, number] => { const n = parseInt(hex.replace("#", ""), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const FILL: CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none" };

/** The look's grade as SVG filter primitives, at a frame (flicker changes the exposure frame to frame). */
function GradeFilter({ id, look, gain, height, drawing = 0 }: { id: string; look: ResolvedLook; gain: number; height: number; /** The held drawing's number, which seeds the boil. */ drawing?: number }) {
  const g = look.grade, t = look.texture, px = height / 1080, short = height;
  const curve = (c: 0 | 1 | 2) => gradeCurve(g, c).join(" ");
  const glow = t.halation > 0 || t.bloom > 0 || t.streaks > 0;
  const th = t.glowThreshold, slope = 1 / Math.max(.05, 1 - th), intercept = -th * slope;
  const steps = g.posterize ? Array.from({ length: Math.round(g.posterize) }, (_, i) => (i / (Math.round(g.posterize!) - 1)).toFixed(4)).join(" ") : undefined;
  const tint = (hex: string, amount: number) => { const [r, gg, b] = hexRgb(hex); return `${r * amount} 0 0 0 0 ${gg * amount} 0 0 0 0 ${b * amount} 0 0 0 0 0 0 0 1 0`; };
  let last = "graded";
  const add = (input: string, result: string) => { const node = <feComposite key={result} in={last} in2={input} operator="arithmetic" k1={0} k2={1} k3={1} k4={0} result={result} />; last = result; return node; };
  const nodes: ReactNode[] = [];
  if (glow) {
    nodes.push(<feColorMatrix key="luma" in="graded" type="matrix" values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0" result="luma" />,
      <feComponentTransfer key="hi" in="luma" result="hi"><feFuncR type="linear" slope={slope} intercept={intercept} /><feFuncG type="linear" slope={slope} intercept={intercept} /><feFuncB type="linear" slope={slope} intercept={intercept} /></feComponentTransfer>);
    if (t.halation > 0) nodes.push(<feColorMatrix key="ht" in="hi" type="matrix" values={tint(t.halationTint, t.halation)} result="ht" />, <feGaussianBlur key="hb" in="ht" stdDeviation={t.glowRadius * short} result="hb" />, add("hb", "withHalation"));
    if (t.bloom > 0) nodes.push(<feColorMatrix key="bt" in="hi" type="matrix" values={tint("#ffffff", t.bloom)} result="bt" />, <feGaussianBlur key="bb" in="bt" stdDeviation={t.glowRadius * short * .6} result="bb" />, add("bb", "withBloom"));
    if (t.streaks > 0) nodes.push(<feColorMatrix key="st" in="hi" type="matrix" values={tint("#8fb8ff", t.streaks * 1.6)} result="st" />,
      <feGaussianBlur key="sb" in="st" stdDeviation={`${t.glowRadius * short * 9} ${Math.max(.5, t.glowRadius * short * .12)}`} result="sb" />, add("sb", "withStreaks"));
  }
  if (t.outline > 0) {
    // Ink where colours meet: a Laplacian of the (posterised) luminance, thickened a little, drawn in near-black over the picture.
    nodes.push(<feColorMatrix key="ol" in={last} type="matrix" values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0" result="ol" />,
      // Softened first, so fine photographic texture does not become ink; only edges between flat areas survive the threshold.
      <feGaussianBlur key="olb" in="ol" stdDeviation={1.6 * px + .4} result="olb" />,
      <feConvolveMatrix key="edge" in="olb" order={3} kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" preserveAlpha result="edge" />,
      <feComponentTransfer key="edgeK" in="edge" result="edgeK"><feFuncR type="linear" slope={9} intercept={-.3} /><feFuncG type="linear" slope={9} intercept={-.3} /><feFuncB type="linear" slope={9} intercept={-.3} /></feComponentTransfer>,
      <feMorphology key="edgeD" in="edgeK" operator="dilate" radius={Math.max(.5, px * .9)} result="edgeD" />,
      <feColorMatrix key="ink" in="edgeD" type="matrix" values={`0 0 0 0 .06 0 0 0 0 .05 0 0 0 0 .07 ${t.outline} 0 0 0 0`} result="ink" />,
      <feComposite key="inked" in="ink" in2={last} operator="over" result="inked" />);
    last = "inked";
  }
  if (t.chroma > 0) {
    const d = t.chroma * px, base = last;
    nodes.push(<feColorMatrix key="cr" in={base} type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="cr" />, <feOffset key="cro" in="cr" dx={d} result="cro" />,
      <feColorMatrix key="cg" in={base} type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="cg" />,
      <feColorMatrix key="cb" in={base} type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="cb" />, <feOffset key="cbo" in="cb" dx={-d} result="cbo" />,
      <feComposite key="crg" in="cro" in2="cg" operator="arithmetic" k2={1} k3={1} result="crg" />, <feComposite key="crgb" in="crg" in2="cbo" operator="arithmetic" k2={1} k3={1} result="chroma" />);
    last = "chroma";
  }
  if (t.softness > 0) { nodes.push(<feGaussianBlur key="soft" in={last} stdDeviation={t.softness * px} result="soft" />); last = "soft"; }
  // Chromium keeps a filter's result when only a turbulence seed changes, so a boiling filter is remounted for each new drawing.
  return <svg key={t.boil > 0 ? drawing : 0} aria-hidden="true" width="0" height="0" style={{ position: "absolute" }}>
    <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      {/* Line boil: a fine turbulence nudges every edge a pixel or two, with a new seed on each held drawing. */}
      {t.boil > 0 && <feTurbulence type="fractalNoise" baseFrequency={(.022 / px).toFixed(4)} numOctaves={2} seed={(drawing * 7919) % 9973 + 1} result="boilNoise" />}
      {t.boil > 0 && <feDisplacementMap in="SourceGraphic" in2="boilNoise" scale={t.boil * 10 * px} xChannelSelector="R" yChannelSelector="G" result="boiled" />}
      <feColorMatrix in={t.boil > 0 ? "boiled" : "SourceGraphic"} type="matrix" values={gradeMatrix(g, gain).map(v => v.toFixed(5)).join(" ")} result="balanced" />
      <feComponentTransfer in="balanced" result={steps ? "curved" : "graded"}>
        <feFuncR type="table" tableValues={curve(0)} /><feFuncG type="table" tableValues={curve(1)} /><feFuncB type="table" tableValues={curve(2)} />
      </feComponentTransfer>
      {steps && <feComponentTransfer in="curved" result="graded"><feFuncR type="discrete" tableValues={steps} /><feFuncG type="discrete" tableValues={steps} /><feFuncB type="discrete" tableValues={steps} /></feComponentTransfer>}
      {nodes}
      {/* The last result is the filter's output; a pass-through keeps it last whatever the chain. */}
      <feOffset in={last} dx={0} dy={0} />
    </filter>
  </svg>;
}

export interface FilmLookLayerProps {
  look: ResolvedLook;
  /** The film frame (not the held frame): grain, weave and flicker change every projected frame. */
  frame: number;
  fps: number;
  width: number;
  height: number;
  /** A different seed per scene, so two scenes never shake alike. */
  seed?: number;
  /** The scene's story turn, in its own frames, where the look may push in. */
  turnFrame?: number;
  children: ReactNode;
}
/** A scene under a film look: graded, textured and moved by the look's camera. */
export function FilmLookLayer({ look, frame, fps, width, height, seed = 1, turnFrame, children }: FilmLookLayerProps) {
  const id = "km-look-" + useId().replace(/[^a-zA-Z0-9-]/g, "");
  const state = lookFrame(look, frame, fps, seed, turnFrame), t = look.texture, px = height / 1080;
  const grain = useMemo(() => t.grain > 0 ? grainTiles(t.grainMono) : [], [t.grain, t.grainMono]);
  const { camera, weave } = state;
  const transform = `translate(${camera.x * width + weave.x * px}px, ${camera.y * height + weave.y * px}px) rotate(${camera.rotate}deg) scale(${camera.scale})`;
  const type: CSSProperties = { ...look.type.display ? { "--km-font-display": look.type.display } : {}, ...look.type.body ? { "--km-font-body": look.type.body } : {},
    "--km-title-case": look.type.titleCase, "--km-title-tracking": look.type.tracking } as CSSProperties;
  const matte = t.matte === "2.39" ? { top: (height - width / 2.39) / 2, side: 0 } : t.matte === "4:3" ? { top: 0, side: (width - height * 4 / 3) / 2 } : undefined;
  return <div data-km-film-look={look.id} style={{ ...FILL, overflow: "hidden", ...type }}>
    <GradeFilter id={id} look={look} gain={state.gain} height={height} drawing={Math.floor(cadenceFrame(look, frame) / (look.motion.cadence === "smooth" ? 2 : 1))} />
    <div style={{ ...FILL, pointerEvents: undefined, filter: `url(#${id})`, transform, transformOrigin: "50% 50%" }}>
      {children}
      {t.blinds > 0 && <div aria-hidden="true" style={{ ...FILL, mixBlendMode: "multiply", opacity: t.blinds, filter: `blur(${6 * px}px)`,
        // Blind shadows fall from one side, strongest across the upper frame where a wall would be, fading toward the floor.
        maskImage: "linear-gradient(105deg, black 0%, black 45%, transparent 85%)", WebkitMaskImage: "linear-gradient(105deg, black 0%, black 45%, transparent 85%)",
        background: `repeating-linear-gradient(118deg, rgba(0,0,0,.85) 0px, rgba(0,0,0,.85) ${70 * px}px, rgba(0,0,0,0) ${86 * px}px, rgba(0,0,0,0) ${150 * px}px, rgba(0,0,0,.85) ${166 * px}px)` }} />}
      {t.leaks > 0 && <div aria-hidden="true" style={{ ...FILL, mixBlendMode: "screen", opacity: t.leaks * (.55 + .45 * Math.sin(state.leak * Math.PI * 2)),
        background: `radial-gradient(ellipse 45% 70% at ${-5 + state.leak * 30}% ${30 + 20 * Math.sin(state.leak * 6.28)}%, rgba(255,120,40,.85), rgba(255,60,20,0) 70%), radial-gradient(ellipse 30% 50% at ${100 - state.leak * 20}% 80%, rgba(255,190,90,.6), rgba(255,140,60,0) 70%)` }} />}
    </div>
    {t.vignette > 0 && <div aria-hidden="true" style={{ ...FILL, background: `radial-gradient(ellipse 75% 75% at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,${.85 * t.vignette}) 100%)` }} />}
    {grain.length > 0 && <div aria-hidden="true" data-km-look-grain="" style={{ ...FILL, mixBlendMode: "overlay", opacity: Math.min(.9, t.grain * .75),
      backgroundImage: `url(${grain[state.grain.tile]})`, backgroundSize: `${256 * t.grainSize * px}px`, backgroundPosition: `${state.grain.x}px ${state.grain.y}px` }} />}
    {t.scanlines > 0 && <div aria-hidden="true" style={{ ...FILL, mixBlendMode: "multiply", opacity: t.scanlines,
      background: `repeating-linear-gradient(0deg, rgba(0,0,0,.55) 0px, rgba(0,0,0,.55) ${Math.max(1, px)}px, rgba(0,0,0,0) ${Math.max(1, px)}px, rgba(0,0,0,0) ${3 * px}px)` }} />}
    {state.band && grain.length > 0 && <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: `${state.band.top * 100}%`, height: `${state.band.height * 100}%`, mixBlendMode: "screen",
      opacity: .35 + .4 * t.tracking, backgroundImage: `url(${grain[(state.grain.tile + 3) % 6]})`, backgroundSize: `${512 * px}px ${40 * px}px`, filter: "saturate(0) contrast(3)" }} />}
    {matte && <>
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: 0, height: matte.top, background: "#000" }} />
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: matte.top, background: "#000" }} />
      <div aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: matte.side, background: "#000" }} />
      <div aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: matte.side, background: "#000" }} />
    </>}
  </div>;
}
