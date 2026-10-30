import { forwardRef } from "react";
import type { CSSProperties, ComponentPropsWithoutRef, ReactNode } from "react";
import { easeOut, span, templateDefinition, templateFrame } from "./cinematic-templates";
import type { CinematicTemplateId } from "./cinematic-templates";

/** Consumer-controlled visual plates. The library intentionally does not bundle a brand or stock footage. */
export interface CinematicTemplateAssets {
  nature: string;
  cave: string;
  sign: string;
  book: string;
  glass: string;
  earth: string;
  walk: string;
  /** Optional realistic foreground explorer with alpha; uses a neutral silhouette when omitted. */
  walker?: string;
  history: readonly [string, string, string, string, string, string];
}

export interface CinematicTemplateProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  kind: CinematicTemplateId;
  /** All changes are sampled at the absolute output frame, including blur, movement and fades. */
  frame: number;
  assets: CinematicTemplateAssets;
  title?: string;
  subtitle?: string;
  /** Freeze on the fully communicated composition, for motion-sensitive viewers. */
  reducedMotion?: boolean;
}

const fill: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%" };
const centered: CSSProperties = { position: "absolute", left: "50%", transform: "translateX(-50%)", textAlign: "center" };
const font = '"Geist Variable", Geist, Inter, system-ui, sans-serif';
const display = '"Newsreader Variable", Newsreader, Georgia, serif';
const fontShadow = "0 0.18cqw 1cqw rgba(0,0,0,.65)";
const image = (src: string, style?: CSSProperties) => <img src={src} alt="" draggable={false} style={{ ...fill, objectFit: "cover", ...style }} />;
const pulsing = (f: number, offset: number) => 0.5 + 0.5 * Math.sin(f * 0.047 + offset);

function FilmGrain({ opacity = 0.10 }: { opacity?: number }) {
  return <svg aria-hidden="true" viewBox="0 0 1280 720" preserveAspectRatio="none" style={{ ...fill, pointerEvents: "none", opacity }}>
    <filter id="km-cinematic-grain"><feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves={2} seed={12} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
    <rect width="1280" height="720" filter="url(#km-cinematic-grain)" />
  </svg>;
}

function FloatingDust({ frame, color = "#ffe6a9", count = 22, intensity = .6 }: { frame: number; color?: string; count?: number; intensity?: number }) {
  return <svg aria-hidden="true" viewBox="0 0 1280 720" preserveAspectRatio="none" style={{ ...fill, pointerEvents: "none" }}>
    {Array.from({ length: count }, (_, index) => {
      const x = (index * 241 + 113) % 1280;
      const y = ((index * 151 + 43) % 760 + 760 - frame * (0.11 + index % 5 * .045)) % 760 - 20;
      const r = (index % 4 + 1) * 1.15;
      return <circle key={index} cx={x + Math.sin(frame * .011 + index) * 14} cy={y} r={r}
        fill={color} opacity={intensity * (.2 + .65 * pulsing(frame, index * 1.6))} />;
    })}
  </svg>;
}

function Nature({ frame: f, assets, title, subtitle }: SceneProps) {
  const arrival = span(f, 0, 176), reveal = span(f, 108, 202), close = span(f, 265, 300);
  return <>
    {image(assets.nature, { transform: `scale(${1.30 - .19 * arrival}) translate(${(arrival - .5) * -1.8}%, ${arrival * 1.4}%)`, filter: `brightness(${.67 + .20 * arrival}) saturate(1.17)` })}
    <div style={{ ...fill, background: "radial-gradient(ellipse at 50% 48%, transparent 12%, rgba(0,21,10,.20) 66%, rgba(0,12,7,.68) 100%)" }} />
    {/* Two cropped photographic layers keep a foreground plane moving independently of the camera. */}
    <div style={{ ...fill, width: "34%", inset: "-3% auto -5% -7%", backgroundImage: `url(${assets.nature})`, backgroundSize: "auto 120%", backgroundPosition: "left center", filter: "blur(.5cqw) brightness(.58)", opacity: .6,
      maskImage: "linear-gradient(90deg, black 5%, transparent 100%)", transform: `translateX(${-16 * arrival}%) rotate(${3 * Math.sin(f * .016)}deg)` }} />
    <div style={{ ...fill, width: "34%", inset: "-3% -7% -5% auto", backgroundImage: `url(${assets.nature})`, backgroundSize: "auto 120%", backgroundPosition: "right center", filter: "blur(.7cqw) brightness(.63)", opacity: .52,
      maskImage: "linear-gradient(270deg, black 8%, transparent 100%)", transform: `translateX(${16 * arrival}%) rotate(${-3 * Math.sin(f * .015)}deg)` }} />
    <div style={{ ...fill, background: "linear-gradient(155deg, rgba(246,213,106,.13), transparent 52%)", opacity: .6 + .2 * pulsing(f, 4) }} />
    <FloatingDust frame={f} color="#ffe5a7" count={34} intensity={.65} />
    <div style={{ ...centered, top: "37%", width: "76%", color: "#fbfaf2", opacity: reveal * (1 - close), filter: `blur(${(1 - reveal) * 1.3}cqw)`, transform: `translateX(-50%) scale(${.92 + .08 * easeOut(reveal)})` }}>
      <div style={{ fontSize: "2.4cqw", letterSpacing: ".74em", marginRight: "-.74em", fontWeight: 500, textShadow: fontShadow }}>✦</div>
      <div style={{ font: `700 8.5cqw/1.02 ${font}`, letterSpacing: "-.075em", textShadow: fontShadow }}>{title ?? "VERDANT"}</div>
      <div style={{ font: `500 1.55cqw/1.5 ${font}`, letterSpacing: ".36em", marginTop: "1.5cqw", textShadow: fontShadow }}>{subtitle ?? "A WORLD WORTH EXPLORING"}</div>
    </div>
    <div style={{ ...fill, background: "#06150d", opacity: close }} />
  </>;
}

function Cave({ frame: f, assets, title, subtitle }: SceneProps) {
  const inCave = span(f, 0, 134), enter = span(f, 62, 158), settle = Math.exp(-Math.max(0, f - 111) / 42) * Math.sin(Math.max(0, f - 111) * .16);
  const reveal = span(f, 138, 215), fade = span(f, 270, 299);
  return <>
    {image(assets.cave, { transform: `scale(${1.12 + inCave * .16}) translateY(${inCave * -2}%)`, filter: "saturate(.98) brightness(.82)" })}
    <div style={{ ...fill, background: `radial-gradient(ellipse at 54% 78%, rgba(255,132,36,${.13 + .045 * pulsing(f, 2)}), transparent 50%), linear-gradient(90deg, rgba(5,10,15,.72), transparent 27%, transparent 75%, rgba(5,10,15,.6))` }} />
    <FloatingDust frame={f} color="#ffcb80" count={27} intensity={.75} />
    <div style={{ position: "absolute", left: "19%", top: "3%", width: "62%", opacity: enter * (1 - fade), transformOrigin: "50% 1%", transform: `translateY(${(1 - enter) * -42}%) rotate(${(1 - enter) * 11 + settle * 5}deg) scale(${.86 + .14 * enter})`, filter: "drop-shadow(0 2.5cqw 2.5cqw rgba(0,0,0,.75))" }}>
      <img src={assets.sign} alt="" draggable={false} style={{ display: "block", width: "100%" }} />
      <div style={{ position: "absolute", left: "9%", top: "46%", width: "82%", textAlign: "center", opacity: reveal, color: "#4d2812", textShadow: "0 .08cqw #e3b36d, .08cqw .14cqw .23cqw rgba(31,17,7,.55)" }}>
        <div style={{ font: `700 3.8cqw/.95 ${display}`, letterSpacing: "-.04em" }}>{title ?? "THE HIDDEN CAVERN"}</div>
        <div style={{ font: `600 1.25cqw/1.5 ${display}`, letterSpacing: ".20em", marginTop: ".8cqw" }}>{subtitle ?? "EVERY STORY HAS A BEGINNING"}</div>
      </div>
    </div>
    <div style={{ ...fill, background: "#080707", opacity: fade }} />
  </>;
}

const HISTORICAL_CHAPTERS = [
  { year: "1918", title: "A NEW HORIZON", note: "THE AGE OF FLIGHT" },
  { year: "1925", title: "CITIES IN MOTION", note: "STREETS TRANSFORM" },
  { year: "1944", title: "THE MACHINE AGE", note: "WORK & INDUSTRY" },
  { year: "1957", title: "A SIGNAL FORWARD", note: "COMPUTING BEGINS" },
  { year: "1964", title: "NEW MONUMENTS", note: "FORM & FUTURE" },
  { year: "1972", title: "BEYOND THE EARTH", note: "EXPLORATION" },
] as const;

function History({ frame: f, assets, title, subtitle }: SceneProps) {
  const chapterFrames = 70;
  const index = Math.min(5, Math.floor(f / chapterFrames));
  const local = f - index * chapterFrames;
  const photoIn = span(local, 0, 14);
  const photoOut = span(local, 61, 70);
  const chapter = HISTORICAL_CHAPTERS[index];
  return <>
    <div style={{ ...fill, background: "#0b0d11" }} />
    {image(assets.history[index], { filter: "grayscale(1) contrast(1.28) brightness(.68)", transform: `scale(${1.24 + local * .0016}) translate(${(index % 2 ? 1 : -1) * local * .045}%,${-local * .02}%)`, opacity: (0.35 + .65 * photoIn) * (1 - .8 * photoOut) })}
    <div style={{ ...fill, background: "linear-gradient(90deg, rgba(3,5,8,.9) 0%, rgba(4,5,9,.5) 38%, transparent 75%), linear-gradient(0deg, rgba(4,6,8,.9), transparent 24%, transparent 85%, rgba(4,6,8,.7))" }} />
    <div style={{ ...fill, opacity: .13, background: "repeating-linear-gradient(0deg, transparent 0px, transparent 3px, #111 4px, transparent 5px)" }} />
    <FilmGrain opacity={.11} />
    <div style={{ position: "absolute", left: "5.8%", top: "8%", width: "34%", font: `500 1.05cqw/1.45 ${font}`, letterSpacing: ".1em", color: "#d6d7d8", opacity: .7 }}>
      <div>ARCHIVE / FIELD NOTES</div><div>VOL. 01 — THE MODERN WORLD</div>
      <div style={{ marginTop: ".7cqw", width: "95%", height: "1px", background: "rgba(255,255,255,.4)" }} />
    </div>
    <div style={{ position: "absolute", left: "6%", bottom: "26%", opacity: photoIn * (1 - photoOut), color: "#fff", transform: `translateY(${(1 - photoIn) * 24}%)` }}>
      <span style={{ display: "inline-block", background: "#f0443f", padding: ".22cqw .65cqw", font: `800 3.35cqw/1.12 ${font}`, letterSpacing: "-.045em", boxShadow: "0 .4cqw 1.5cqw #0005" }}>{title ?? chapter.title}</span>
      <div style={{ font: `600 1.2cqw/1.6 ${font}`, letterSpacing: ".21em", marginTop: "1.2cqw" }}>{subtitle ?? chapter.note}</div>
    </div>
    <div style={{ position: "absolute", right: "6%", bottom: "19%", font: `800 3.4cqw/1 ${font}`, color: "#fafafa", textShadow: fontShadow }}>{chapter.year}</div>
    <div style={{ position: "absolute", bottom: "11%", left: "6%", right: "6%", height: ".25cqw", background: "rgba(255,255,255,.38)" }}>
      <div style={{ width: `${((index + (local / chapterFrames)) / 6) * 100}%`, height: "100%", background: "#fa4b42" }} />
      {HISTORICAL_CHAPTERS.map((ch, i) => <div key={ch.year} style={{ position: "absolute", left: `${(i / 5) * 100}%`, top: "-.34cqw", width: ".8cqw", height: ".8cqw", borderRadius: "50%", background: i <= index ? "#f44942" : "#ddd", border: ".17cqw solid #222" }} />)}
    </div>
    <div style={{ position: "absolute", right: "6%", top: "8%", font: `500 .95cqw ${font}`, letterSpacing: ".2em", color: "#f8f8f8" }}>CHAPTER {String(index + 1).padStart(2, "0")} / 06</div>
  </>;
}

function Book({ frame: f, assets, title, subtitle }: SceneProps) {
  const sceneIn = span(f, 0, 60), inkIn = span(f, 70, 150), flip = span(f, 216, 287), after = span(f, 281, 316);
  const fade = span(f, 344, 359);
  return <>
    {image(assets.book, { transform: `scale(${1.11 - .06 * sceneIn}) translate(${f * -.002}%, ${f * -.002}%)`, filter: `brightness(${.68 + sceneIn * .25}) contrast(1.07)` })}
    <div style={{ ...fill, background: "radial-gradient(ellipse at 53% 50%, transparent 28%, rgba(21,8,2,.42) 90%)" }} />
    <div style={{ position: "absolute", left: "16%", top: "35%", width: "28%", textAlign: "center", color: "#6a3c21", transform: "rotate(-5deg)", opacity: span(f, 34, 105) * (1 - fade) }}>
      <span style={{ font: `700 3.4cqw/1.12 ${display}`, letterSpacing: "-.025em" }}>{title ?? "THE CHRONICLES"}</span>
      <span style={{ display: "block", font: `italic 1.3cqw/1.5 ${display}`, marginTop: "1cqw" }}>{subtitle ?? "Stories preserved in time"}</span>
      <div style={{ margin: "1.6cqw auto 0", width: "35%", height: ".08cqw", background: "#8e633d" }} />
    </div>
    <div style={{ position: "absolute", left: "49%", top: "22%", width: "31%", height: "47%", transform: "rotate(3deg)", overflow: "hidden", borderRadius: "2%", opacity: inkIn * (1 - flip), mixBlendMode: "multiply",
      maskImage: "radial-gradient(ellipse, black 25%, rgba(0,0,0,.7) 60%, transparent 79%)" }}>
      {image(assets.history[0], { filter: "sepia(.9) contrast(1.1) brightness(1.07)", transform: `scale(${1.13 + f * .00028})` })}
    </div>
    {/* The moving parchment has a paper edge, its own lighting and a perspective hinge. */}
    {flip > 0 && flip < 1 && <div style={{ position: "absolute", left: "48%", top: "19%", width: "33%", height: "54%", perspective: "90cqw" }}>
      <div style={{ ...fill, transformOrigin: "left center", transform: `rotateY(${-178 * flip}deg) rotateZ(-2deg)`, background: "linear-gradient(95deg,#9b6534 0%,#e5c58a 12%,#e9d3a8 55%,#b58a54 97%)", boxShadow: "1cqw 0 2.2cqw #281205aa", borderRadius: "1% 7% 7% 1%", opacity: Math.sin(flip * Math.PI) }} />
    </div>}
    <div style={{ position: "absolute", left: "49%", top: "22%", width: "31%", height: "47%", transform: "rotate(3deg)", opacity: after * (1 - fade), mixBlendMode: "multiply", overflow: "hidden",
      maskImage: "radial-gradient(ellipse, black 23%, rgba(0,0,0,.65) 57%, transparent 77%)" }}>
      {image(assets.history[5], { filter: "sepia(.95) contrast(1.03) brightness(1.2)" })}
    </div>
    <FloatingDust frame={f} count={28} color="#ffc778" intensity={.5} />
    <div style={{ ...fill, background: "#130804", opacity: fade }} />
  </>;
}

function Glass({ frame: f, assets, title }: SceneProps) {
  const rise = span(f, 16, 88), show = span(f, 66, 150), morph = span(f, 200, 272), fade = span(f, 282, 299);
  const bars = [.42, .67, .85, .58, .77, .94, .72];
  return <>
    {image(assets.glass, { transform: `scale(1.13) translate(${Math.sin(f * .008) * 1.1}%, ${Math.cos(f * .011) * .9}%)`, filter: "saturate(1.2)" })}
    <div style={{ ...fill, background: "radial-gradient(ellipse at center, rgba(255,255,255,.18), transparent 64%)" }} />
    <div style={{ ...centered, top: "11%", width: "75%", color: "#364758", opacity: span(f, 0, 55) * (1 - morph), font: `700 2.2cqw/1 ${font}`, letterSpacing: ".23em" }}>{title ?? "LIQUID GLASS"}</div>
    <div style={{ position: "absolute", width: "56%", height: "56%", left: "22%", top: "23%", borderRadius: "3cqw", opacity: rise * (1 - fade),
      transform: `perspective(125cqw) rotateX(${(1 - rise) * 18 - morph * 7}deg) rotateY(${(1 - rise) * -14 + morph * 8}deg) translateY(${(1 - rise) * 17}%) scale(${.9 + rise * .1})`,
      background: "linear-gradient(138deg, rgba(255,255,255,.43), rgba(255,255,255,.10) 52%, rgba(212,240,255,.24))", backdropFilter: "blur(2.1cqw) saturate(1.6)", WebkitBackdropFilter: "blur(2.1cqw) saturate(1.6)",
      border: ".12cqw solid rgba(255,255,255,.72)", boxShadow: "inset 0 .3cqw .5cqw #ffffff9c, inset 0 -.4cqw 1cqw #fff5, 0 2.4cqw 5cqw rgba(65,87,108,.26)" }}>
      <div style={{ position: "absolute", left: "8%", top: "9%", color: "#33495a", opacity: show * (1 - morph), font: `600 1.5cqw ${font}` }}>An illustrative week</div>
      <div style={{ position: "absolute", left: "8%", right: "8%", bottom: "13%", top: "29%", display: "flex", gap: "2.4%", alignItems: "flex-end", opacity: show * (1 - morph) }}>
        {bars.map((value, i) => <div key={i} style={{ flex: 1, height: `${100 * value * span(f, 86 + i * 10, 156 + i * 6)}%`, borderRadius: "1.1cqw 1.1cqw .45cqw .45cqw", background: "linear-gradient(#fff,rgba(255,255,255,.58))", boxShadow: "inset 0 .2cqw .35cqw #fff,0 .25cqw .9cqw #6784a544" }} />)}
      </div>
      <div style={{ position: "absolute", left: "8%", right: "8%", bottom: "4%", display: "flex", justifyContent: "space-around", font: `600 .9cqw ${font}`, color: "#677888", opacity: show * (1 - morph) }}>{["M", "T", "W", "T", "F", "S", "S"].map((v, i) => <span key={i}>{v}</span>)}</div>
      <div style={{ position: "absolute", inset: "23% 8%", display: "grid", placeItems: "center", opacity: morph, color: "#40526b", textAlign: "center" }}>
        <div><div style={{ font: `700 5.5cqw/.95 ${font}`, letterSpacing: "-.07em" }}>Clear by design.</div><div style={{ font: `500 1.6cqw ${font}`, marginTop: "1.6cqw" }}>Light · depth · movement</div></div>
      </div>
    </div>
  </>;
}

function Biplane({ frame }: { frame: number }) {
  const progress = span(frame, 5, 238);
  const x = -15 + progress * 120, y = 22 - 17 * Math.sin(Math.PI * progress);
  return <svg aria-hidden="true" viewBox="0 0 300 140" style={{ position: "absolute", width: "18%", left: `${x}%`, top: `${y}%`, filter: "drop-shadow(.5cqw .9cqw .7cqw #35649555)", transform: `rotate(${-9 + 18 * progress}deg) scale(${.68 + .35 * Math.sin(progress * Math.PI)})` }}>
    <g stroke="#845522" strokeWidth="3" strokeLinejoin="round">
      <path d="M24 80Q118 40 236 72L285 89L226 99L58 103Z" fill="#e4a64a" />
      <path d="M85 44L238 39L265 57L95 62Z" fill="#f6cf6c" /><path d="M73 89L225 83L254 100L85 111Z" fill="#df923c" />
      <path d="M141 48L148 97M218 45L219 90" stroke="#77502a" strokeWidth="5" /><path d="M25 65L8 45L68 63Z" fill="#ebbc62" />
      <circle cx="158" cy="71" r="10" fill="#324e65" stroke="#f9dfa0" /><path d="M278 64L285 116M259 88L304 91" stroke="#493b33" strokeWidth="5" />
      <circle cx="99" cy="118" r="14" fill="#4c463a" /><circle cx="219" cy="115" r="14" fill="#4c463a" />
    </g>
  </svg>;
}

function Earth({ frame: f, assets, title, subtitle }: SceneProps) {
  const approach = span(f, 0, 145), banner = span(f, 214, 275), fade = span(f, 310, 329);
  return <>
    {image(assets.earth, { transform: `scale(${1.24 - .12 * approach}) translateX(${(approach - .5) * -2}%)`, filter: "saturate(1.14)" })}
    <div style={{ ...fill, background: "linear-gradient(0deg,rgba(4,66,113,.11),transparent 54%)" }} />
    <Biplane frame={f} />
    <div style={{ position: "absolute", left: "18%", top: "27%", width: "64%", height: "42%", display: "grid", placeItems: "center", textAlign: "center", opacity: banner * (1 - fade), transform: `translateY(${(1 - banner) * -16}%) rotate(${Math.sin(f * .025) * 1.3}deg)`,
      background: "linear-gradient(112deg,#f8f9e9,#fffdf5 55%,#e6e6d0)", boxShadow: "0 1.6cqw 4cqw #28649866", clipPath: "polygon(0 4%, 23% 2%, 51% 4%, 74% 2%, 100% 5%, 99% 96%, 76% 99%, 48% 97%, 22% 99%, 1% 95%)" }}>
      <div><div style={{ color: "#178388", font: `800 7cqw/1 ${font}`, letterSpacing: "-.08em" }}>{title ?? "WANDER"}</div><div style={{ color: "#c17c2c", font: `italic 2.3cqw ${display}`, marginTop: "1cqw" }}>{subtitle ?? "Time to discover"}</div></div>
    </div>
    <div style={{ ...fill, background: "#a8e5f9", opacity: fade }} />
  </>;
}

function Walker({ frame, asset }: { frame: number; asset?: string }) {
  const p = span(frame, 25, 310);
  const stride = Math.sin(frame * .38);
  if (asset) return <img src={asset} alt="" draggable={false} style={{ position: "absolute", width: "7.3%", height: "auto",
    left: `${42 + 23 * p}%`, top: `${34 - 3 * Math.sin(p * Math.PI)}%`,
    transform: `translateY(${Math.abs(stride) * -1.2}%) rotate(${(p - .5) * 4 + stride * 1.3}deg)`,
    transformOrigin: "center 90%", filter: "drop-shadow(.3cqw .4cqw .5cqw #0008)" }} />;
  return <svg viewBox="0 0 64 126" aria-hidden="true" style={{ position: "absolute", width: "5.2%", height: "18%", left: `${39 + 24 * p}%`, top: `${34 - 4 * Math.sin(p * Math.PI)}%`, filter: "drop-shadow(.2cqw .3cqw .1cqw #0007)", transform: `rotate(${(p - .5) * 7}deg)` }}>
    <g fill="none" stroke="#191d22" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="16" r="10" fill="#f0d9bb" /><path d="M31 29L31 74" />
      <path d={`M31 41L${15 + stride * 7} 65M31 41L${49 - stride * 7} 63`} />
      <path d={`M31 74L${18 + stride * 10} 114M31 74L${46 - stride * 10} 114`} />
    </g>
  </svg>;
}

function Walk({ frame: f, assets, title, subtitle }: SceneProps) {
  const motion = span(f, 0, 280), text = span(f, 38, 135), fade = span(f, 336, 359);
  return <>
    {image(assets.walk, { transform: `scale(${1.20 - .1 * motion}) translateX(${motion * -4}%) translateY(${motion * 2}%)`, filter: `saturate(1.12) brightness(${.82 + .11 * motion})` })}
    <div style={{ ...fill, background: "linear-gradient(90deg,rgba(27,18,36,.54),transparent 46%),radial-gradient(circle at 85% 20%,rgba(255,200,102,.24),transparent 25%)" }} />
    <Walker frame={f} asset={assets.walker} />
    <div style={{ position: "absolute", left: "6%", top: "13%", maxWidth: "53%", color: "#fffaf3", opacity: text * (1 - fade), transform: `translateX(${(1 - text) * -16}%)`, textShadow: fontShadow }}>
      <div style={{ font: `700 4.8cqw/.98 ${display}`, letterSpacing: "-.03em" }}>{title ?? "A WORLD IN MOTION"}</div>
      <div style={{ marginTop: "1.5cqw", font: `600 1.3cqw/1.4 ${font}`, letterSpacing: ".26em" }}>{subtitle ?? "EVERY STEP IS A STORY"}</div>
    </div>
    <FloatingDust frame={f} color="#ffdfad" count={12} intensity={.5} />
    <div style={{ ...fill, background: "#1b1d2e", opacity: fade }} />
  </>;
}

type SceneProps = Pick<CinematicTemplateProps, "assets" | "title" | "subtitle"> & { frame: number };
const SCENES: Record<CinematicTemplateId, (props: SceneProps) => ReactNode> = {
  "nature-logo": Nature, "liquid-glass": Glass, "history-timeline": History, "epic-book": Book,
  "fly-around-earth": Earth, "walk-on-earth": Walk, "cave-logo": Cave,
};

/** The customizable, renderer-independent, clock-free template surface.
 * Its art plates are inputs; the owner may replace every visual and all text.
 */
export const CinematicTemplate = forwardRef<HTMLDivElement, CinematicTemplateProps>(function CinematicTemplate({
  kind, frame, assets, title, subtitle, reducedMotion = false, style, ...props
}, ref) {
  const f = reducedMotion ? Math.round((templateDefinition(kind).durationFrames - 1) * .8) : templateFrame(kind, frame);
  const draw = SCENES[kind];
  return <div {...props} ref={ref} role="img" aria-label={`${kind.replace(/-/g, " ")} animation at ${(f / 30).toFixed(1)} seconds`}
    data-km-cinematic-template="" data-template={kind} data-frame={f}
    style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", overflow: "hidden", containerType: "inline-size", isolation: "isolate", background: "#12151c", ...style }}>
    {draw({ frame: f, assets, title, subtitle })}
  </div>;
});
