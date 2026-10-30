import { forwardRef, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ComponentPropsWithoutRef, ReactNode } from "react";
import { easeOut, span, templateDefinition, templateFrame } from "./cinematic-templates";
import type { CinematicTemplateId } from "./cinematic-templates";
import type { BookPageFace, ImageAsset, SceneTemplateSpec, SurfaceMaps } from "./scene-templates";
import { bookFaces, bookMoment, bookShape, cameraAt, turnSchedule } from "./stages/page-curl";
import type { BookFrameState } from "./stages/page-curl";
import { PageTurnFlatBook, PageTurnRendererContext, pageTurnCameraKeys, usePaintedBook } from "./stages/page-turn-story-stage";
import { FilmFinish, fitLongestWord } from "./stages/stage-kit";

/** Optional surface detail and environment for the 3D folio in `epic-book`. Omit for flat materials. */
export interface CinematicBookDetail {
  /** Paper colour and normal maps; the printed faces carry the same detail. */
  paper?: SurfaceMaps;
  /** Binding cloth or leather maps. */
  cover?: SurfaceMaps;
  /** Desk surface maps. */
  desk?: SurfaceMaps;
  /** Equirectangular Radiance .hdr used for reflections and soft fill. */
  hdri?: ImageAsset;
}

/** Consumer-controlled visual plates. The library intentionally does not bundle a brand or stock footage. */
export interface CinematicTemplateAssets {
  nature: string;
  /** Establishing plate for `epic-book`: the candlelit desk the 3D folio is built on. */
  book: string;
  glass: string;
  earth: string;
  walk: string;
  /** Optional realistic foreground explorer with alpha; uses a neutral silhouette when omitted. */
  walker?: string;
  history: readonly [string, string, string, string, string, string];
  /** Optional PBR detail for the `epic-book` folio; without it the book keeps flat, honest materials. */
  bookDetail?: CinematicBookDetail;
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

/* ------------------------------------------------------------------------ */
/* Epic book                                                                  */

/** The single turn: the leaf peels at 212, lands at 268, and the spread is held. */
const EPIC_BOOK_TURN = { at: 212, frames: 56 } as const;
/** Drawing-buffer size of the WebGL folio. The canvas is laid out by CSS, so export stays exact. */
const EPIC_BOOK_PIXELS = { width: 1920, height: 1080 } as const;

/** Measures the scene box so the 2.5D book keeps the WebGL camera's scale at any stage size. */
function useStageSize(fallback: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setHeight(Math.max(1, Math.round(entry.contentRect.height))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, height] as const;
}

/**
 * Epic book: a candlelit folio on a desk. The establishing plate hands over to
 * the real page-turn rig — a leaf that peels at its corner, bends around the
 * fixed spine with its own thickness, two printed faces and a paper edge, cloth
 * boards, stacked fore edges and a warm key light with soft shadows. Without a
 * host renderer or WebGL the same pages are drawn by the 2.5D book from the same
 * curl, so the composition and the copy never change.
 */

function Book({ frame: f, durationFrames, reducedMotion, assets, title, subtitle }: SceneProps) {
  const plate = (index: number, folio: string): BookPageFace => ({
    image: { id: `epic-book-plate-${index}`, src: assets.history[index], alt: `Archival plate ${folio} supplied with the epic book template` },
    folio, layout: "plate",
  });
  // The rig is rebuilt when this key changes, so every authored input is part of it.
  const key = JSON.stringify([assets.history, assets.bookDetail, title, subtitle, durationFrames]);
  const spec = useMemo<SceneTemplateSpec<"page-turn-story">>(() => {
    const detail = assets.bookDetail;
    const heading = title?.trim() || "THE CHRONICLES";
    const line = subtitle?.trim() || "Stories preserved in time";
    return {
      schemaVersion: 1, recipeVersion: 1, recipeId: "page-turn-story", id: "epic-book",
      fps: { num: 30, den: 1 }, durationFrames, width: 1280, height: 720, accent: "#9d4526",
      content: {
        documentTitle: heading, eyebrow: line,
        spreads: [
          { id: "opening", left: { heading, folio: "8" }, right: { ...plate(0, "9"), caption: line } },
          { id: "revealed", left: plate(5, "10"), right: plate(3, "11") },
        ],
        turns: [EPIC_BOOK_TURN],
        stiffness: .4,
        book: { pageWidth: 190, pageHeight: 262, blockThickness: 15, boardThickness: 3 },
        paper: { color: "#e7d5ae", ink: "#2b2015", accent: "#9d4526", shadowOpacity: .6, roughness: .92, thickness: .24, age: .5,
          edgeColor: "#dfcaa0", texture: detail?.paper },
        cover: { color: "#43281b", material: "leather", roughness: .82, maps: detail?.cover, headband: "#a8894a" },
        environment: { surface: { color: "#8d5b35", roughness: .7, maps: detail?.desk },
          light: { azimuth: 316, elevation: 46, warmth: 3050, intensity: .85 }, hdri: detail?.hdri, backdrop: "#090502" },
        camera: { turn: { zoom: .9 } },
        typography: { headingFont: display, bodyFont: display },
        look: { grain: .5, vignette: 1, warmth: .4 },
      },
    };
    // `key` captures every authored input read here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const content = spec.content;
  const shape = useMemo(() => bookShape({ ...content.book, leaf: content.paper?.thickness }), [content]);
  const establish = Math.round(durationFrames * .15);
  const schedule = useMemo(() => turnSchedule(2, durationFrames, content.turns, establish), [durationFrames, content.turns, establish]);
  const keys = useMemo(() => pageTurnCameraKeys(content, shape, 16 / 9, schedule, establish, durationFrames),
    [content, shape, schedule, establish, durationFrames]);
  const moment = bookMoment(f, schedule, reducedMotion);
  // Reduced motion holds one settled shot instead of travelling between them.
  const camera = reducedMotion ? (f < establish ? keys[1].shot : keys[2].shot) : cameraAt(f, keys);
  const state: BookFrameState = { ...bookFaces(moment, 1, content.stiffness ?? .45), camera, aspect: 16 / 9 };
  const { book, error } = usePaintedBook(content, shape, spec.accent ?? "#9d4526");
  const Renderer = useContext(PageTurnRendererContext);
  const [glFailed, setGlFailed] = useState<string | undefined>();
  const use3d = !!Renderer && !glFailed;
  const [stage, stageHeight] = useStageSize(720);
  // Establishing plate → folio: a fast light-change cut (about a fifth of a second) under a warm bloom,
  // so the two framings never read as a double exposure.
  const plateOut = span(f, 0, 8) * (1 - span(f, 40, 46));
  const bloom = Math.sin(Math.PI * span(f, 34, 52)) * .55;
  const titleOpacity = span(f, 4, 20) * (1 - span(f, 26, 38));
  const fade = span(f, 344, 359);
  return <>
    <div ref={stage} style={{ ...fill }}
      data-km-book-state={error ? "error" : book ? "ready" : "loading"} data-km-book-renderer={use3d ? "webgl" : "flat"}
      data-km-book-textures={error ? "error" : book ? "ready" : "pending"}
      data-km-book-spread={moment.spread} data-km-book-turn={moment.turning} data-km-book-turn-progress={moment.progress.toFixed(4)}>
      {book && use3d && Renderer
        ? <Renderer spec={spec} shape={shape} painted={book} state={state} frame={f}
            pixelWidth={EPIC_BOOK_PIXELS.width} pixelHeight={EPIC_BOOK_PIXELS.height} onUnavailable={setGlFailed}/>
        : <PageTurnFlatBook c={content} shape={shape} painted={book} state={state} height={stageHeight}/>}
    </div>
    {plateOut > 0 && image(assets.book, { opacity: plateOut, transform: `scale(${1.06 - .05 * span(f, 0, 64)})`,
      filter: "brightness(.88) saturate(1.05)" })}
    {bloom > 0 && <div style={{ ...fill, pointerEvents: "none", opacity: bloom, mixBlendMode: "screen",
      background: "radial-gradient(ellipse 62% 54% at 54% 46%, rgba(255,214,152,.95), rgba(255,166,84,.34) 46%, transparent 74%)" }}/>}
    <div style={{ ...fill, pointerEvents: "none", mixBlendMode: "soft-light",
      background: "radial-gradient(ellipse 78% 68% at 56% 42%, rgba(255,190,120,.18), rgba(30,54,86,.10) 100%)" }}/>
    <FloatingDust frame={f} count={30} color="#ffc778" intensity={.55} />
    {/* Title card set on the establishing plate's left page, so it hands over to the printed title page. */}
    <div style={{ position: "absolute", left: "14%", top: "30%", width: "32%", textAlign: "center", opacity: titleOpacity,
      color: "#5f3a20", textShadow: "0 .08cqw .3cqw rgba(255,246,224,.45)", pointerEvents: "none" }}>
      <div style={{ fontFamily: display, fontWeight: 700, lineHeight: 1.12, letterSpacing: "-.025em",
        fontSize: fitLongestWord(title ?? "THE CHRONICLES", 3.4, 28), textWrap: "balance" }}>{title ?? "THE CHRONICLES"}</div>
      <div style={{ fontFamily: display, fontStyle: "italic", fontSize: "1.35cqw", lineHeight: 1.5, marginTop: "1cqw" }}>{subtitle ?? "Stories preserved in time"}</div>
      <div style={{ margin: "1.5cqw auto 0", width: "34%", height: ".08cqw", background: "#8e633d" }}/>
    </div>
    <FilmFinish frame={f} reduced={reducedMotion} grain={.5} vignette={1} vignetteStrength={.52}/>
    {fade > 0 && <div style={{ ...fill, background: "#0a0503", opacity: fade }}/>}
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

type SceneProps = Pick<CinematicTemplateProps, "assets" | "title" | "subtitle"> & {
  frame: number; durationFrames: number; reducedMotion: boolean;
};
const SCENES: Record<CinematicTemplateId, (props: SceneProps) => ReactNode> = {
  "nature-logo": Nature, "liquid-glass": Glass, "history-timeline": History, "epic-book": Book,
  "fly-around-earth": Earth, "walk-on-earth": Walk,
};

/** The customizable, renderer-independent, clock-free template surface.
 * Its art plates are inputs; the owner may replace every visual and all text.
 * `epic-book` draws its folio with the shared page-turn rig: pass a
 * `PageTurnRendererContext` value (see `page-turn-book-canvas.tsx`) to render the
 * bending WebGL book; without one it falls back to the 2.5D book from the same curl.
 */
export const CinematicTemplate = forwardRef<HTMLDivElement, CinematicTemplateProps>(function CinematicTemplate({
  kind, frame, assets, title, subtitle, reducedMotion = false, style, ...props
}, ref) {
  const definition = templateDefinition(kind);
  const f = reducedMotion ? Math.round((definition.durationFrames - 1) * .8) : templateFrame(kind, frame);
  const draw = SCENES[kind];
  return <div {...props} ref={ref} role="img" aria-label={`${kind.replace(/-/g, " ")} animation at ${(f / 30).toFixed(1)} seconds`}
    data-km-cinematic-template="" data-template={kind} data-frame={f}
    style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", overflow: "hidden", containerType: "inline-size", isolation: "isolate", background: "#12151c", ...style }}>
    {draw({ frame: f, durationFrames: definition.durationFrames, reducedMotion, assets, title, subtitle })}
  </div>;
});
