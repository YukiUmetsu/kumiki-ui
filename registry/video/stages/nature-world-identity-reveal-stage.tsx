/**
 * Nature-World Identity Reveal. Causal beat:
 *   input      an intimate forest (or cave) view framed by near foreground forms
 *   transform  the camera moves forward past the forms; one passes the lens and
 *              carries the cut into the clearing, where the forms part; the
 *              key light then reaches a caller-supplied mark standing in it
 *   output     the mark held as a grounded object (contact shadow, cast shadow,
 *              thickness, rim light, atmospheric depth) above its name.
 * Builds on environment-reveal's plate camera; the mark rides the clearing
 * plate's transform so it stays planted. Multi-plane 2.5D, not a navigable
 * 3D world. Frame-addressable, no clock.
 */
import { useContext, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { ImageAsset, SceneTemplateFrame, SceneTemplateSpec } from "../scene-templates";
import type { AnnotationBeats } from "../subject-annotations";
import { annotationState, coverPoint } from "../subject-annotations";
import { Asset, FilmFinish, KineticWords, OverlayRendererContext, RiseIn, cinematicEase, clamp01, cueAt, fitLongestWord, span01 } from "./stage-kit";

/** Small deterministic PRNG so every frame regenerates identical forms. */
function seeded(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** A leafy branch in a 200×200 box, stem from the bottom edge. */
function foliagePath(seed: number): string {
  const r = seeded(seed); let d = "";
  const bend = (r() - .5) * 70, leaves = 9 + Math.floor(r() * 6);
  d += `M-4 100Q${bend} 10 ${bend * .4} -96L${bend * .4 + 6} -96Q${bend + 6} 10 4 100Z`;
  for (let i = 0; i < leaves; i++) {
    const t = .12 + .86 * i / leaves, side = i % 2 ? 1 : -1;
    const sx = bend * 2 * t * (1 - t) + bend * .4 * t * t, sy = 100 - 196 * t;
    const len = (58 - 30 * t) * (.8 + .4 * r()), wid = len * (.34 + .1 * r()), ang = (side * (48 + 25 * r()) - 8) * Math.PI / 180;
    const ux = Math.sin(ang), uy = -Math.cos(ang), px = -uy, py = ux;
    const tipX = sx + ux * len, tipY = sy + uy * len;
    d += `M${sx} ${sy}C${sx + ux * len * .3 + px * wid} ${sy + uy * len * .3 + py * wid} ${sx + ux * len * .85 + px * wid * .45} ${sy + uy * len * .85 + py * wid * .45} ${tipX} ${tipY}`
      + `C${sx + ux * len * .85 - px * wid * .45} ${sy + uy * len * .85 - py * wid * .45} ${sx + ux * len * .3 - px * wid} ${sy + uy * len * .3 - py * wid} ${sx} ${sy}Z`;
  }
  return d;
}
/** A jagged rock mass in the same box, for cave mouths. */
function rockPath(seed: number): string {
  const r = seeded(seed), pts: string[] = [];
  for (let i = 0; i <= 18; i++) { const a = Math.PI * (1 + i / 18), rad = 70 + 30 * r(); pts.push(`${Math.cos(a) * rad * 1.3} ${100 + Math.sin(a) * rad * 1.9}`); }
  return `M-100 100L${pts.join("L")}L100 100Z`;
}
interface Form { id: string; seed: number; from: [number, number]; to: [number, number]; size: [number, number]; rot: number; start: number; end: number; blur: [number, number]; flip?: boolean }
/**
 * Forms are authored in stage percent: each moves from `from` to `to` (centre), growing,
 * between its frames, which reads as the camera passing it. Opening framers leave by the
 * cut; the lens-passing occluder covers the cut; clearing framers part by the reveal.
 */
function formsFor(dock: number, reveal: number, portrait: boolean): Form[] {
  const s = portrait ? 1.5 : 1;
  return [
    { id: "open-tl", seed: 11, from: [6, 12], to: [-40, -30], size: [70 * s, 190 * s], rot: 140, start: -30, end: dock + 4, blur: [.25, 1.1] },
    { id: "open-br", seed: 23, from: [92, 92], to: [150, 140], size: [80 * s, 210 * s], rot: -38, start: -24, end: dock + 2, blur: [.3, 1.2] },
    { id: "open-bl", seed: 37, from: [10, 96], to: [-50, 150], size: [60 * s, 160 * s], rot: 30, start: -40, end: dock - 6, blur: [.35, 1.2], flip: true },
    { id: "open-tr", seed: 41, from: [96, 6], to: [150, -40], size: [55 * s, 150 * s], rot: -150, start: -36, end: dock - 10, blur: [.4, 1.2] },
    { id: "lens", seed: 53, from: [140, 55], to: [-60, 45], size: [190 * s, 420 * s], rot: -70, start: dock - 13, end: dock + 13, blur: [1.4, 1.8] },
    { id: "clear-l", seed: 67, from: [4, 40], to: [-55, 30], size: [75 * s, 210 * s], rot: 70, start: dock - 2, end: reveal - 8, blur: [.9, 1.4], flip: true },
    { id: "clear-r", seed: 79, from: [97, 30], to: [160, 10], size: [70 * s, 200 * s], rot: -110, start: dock - 2, end: reveal - 14, blur: [.8, 1.4] },
    { id: "clear-b", seed: 83, from: [62, 104], to: [80, 190], size: [90 * s, 180 * s], rot: -10, start: dock, end: reveal - 4, blur: [1, 1.5] },
  ];
}
function ForegroundForm({ form, frame, reduced, kind }: { form: Form; frame: number; reduced: boolean; kind: "foliage" | "rock" }) {
  const d = useMemo(() => kind === "rock" ? rockPath(form.seed) : foliagePath(form.seed), [form.seed, kind]);
  if (reduced || frame < form.start || frame > form.end) return null;
  // Ease in: the camera accelerates past near forms.
  const p = Math.pow(span01(frame, form.start, form.end), 1.6);
  const x = form.from[0] + (form.to[0] - form.from[0]) * p, y = form.from[1] + (form.to[1] - form.from[1]) * p;
  const grow = 1 + 1.3 * p, blur = form.blur[0] + (form.blur[1] - form.blur[0]) * p;
  return <svg aria-hidden="true" data-km-foreground-form={form.id} viewBox="-100 -100 200 200" preserveAspectRatio="none" style={{ position: "absolute",
    left: `${x}%`, top: `${y}%`, width: `${form.size[0] * grow}%`, height: `${form.size[1] * grow / 1.78}%`, overflow: "visible",
    transform: `translate(-50%,-50%) rotate(${form.rot}deg) scaleX(${form.flip ? -1 : 1})`, filter: `blur(${blur}em)`, pointerEvents: "none" }}>
    <defs><linearGradient id={`km-fg-${form.id}`} x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stopColor={kind === "rock" ? "#07080a" : "#050904"}/>
      <stop offset="1" stopColor={kind === "rock" ? "#1d2024" : "#1d3312"}/>
    </linearGradient></defs>
    <path d={d} fill={`url(#km-fg-${form.id})`}/>
  </svg>;
}
/** Grass blades that overlap the mark's base, so it sits in the ground rather than on top of it. */
function GroundBlades({ seed, color }: { seed: number; color: string }) {
  const r = seeded(seed);
  const blades = Array.from({ length: 46 }, () => { const x = r() * 200 - 100, hgt = 30 + r() * 70, lean = (r() - .5) * 26;
    return `M${x - 2.4} 100Q${x + lean * .4} ${100 - hgt * .6} ${x + lean} ${100 - hgt}Q${x + lean * .4 + 1} ${100 - hgt * .55} ${x + 2.4} 100Z`; }).join("");
  return <svg aria-hidden="true" viewBox="-100 0 200 100" preserveAspectRatio="none" style={{ position: "absolute", left: "-35%", right: "-35%", bottom: "-4%", height: "16%", width: "170%", overflow: "visible" }}>
    <defs><linearGradient id={`km-blade-${seed}`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#141c0d"/><stop offset="1" stopColor={color}/></linearGradient></defs>
    <path d={blades} fill={`url(#km-blade-${seed})`}/>
  </svg>;
}
function maskStyle(src: string): CSSProperties {
  return { maskImage: `url("${src}")`, WebkitMaskImage: `url("${src}")`, maskSize: "contain", WebkitMaskSize: "contain",
    maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskPosition: "center bottom", WebkitMaskPosition: "center bottom" } as CSSProperties;
}

export function NatureWorldIdentityRevealStage({ spec, f }: { spec: SceneTemplateSpec<"nature-world-identity-reveal">; f: SceneTemplateFrame }) {
  const c = spec.content, w = spec.width, h = spec.height, portrait = h > w, t = f.frame, reduced = f.reducedMotion;
  const dock = cueAt(f, 0), reveal = cueAt(f, 1), resolve = cueAt(f, 2);
  const env = c.environment, mark = c.mark, kind = c.foreground ?? "foliage";
  const grounded = (c.treatment ?? "grounded") === "grounded";
  const lightColor = c.light?.color ?? "#ffe2a8";
  // Clearing camera: forward momentum from the cut, easing into a slow push on the mark.
  const base = coverPoint({ x: c.placement.x, y: c.placement.y }, env, w, h);
  const into = reduced ? 1 : cinematicEase(span01(t, dock - 6, f.durationFrames + 40));
  const zoom = 1 + .16 * into;
  const origin = `${base.x / w * 100}% ${base.y / h * 100 - 12}%`;
  // Approach camera accelerates into the forms, matching the speed carried across the cut.
  const approachZoom = 1.02 + .3 * Math.pow(span01(t, 0, dock + 6), 1.7);
  const atClearing = reduced ? t >= dock : t >= dock;
  const crossfade = kind === "none" && !reduced ? span01(t, dock - 8, dock + 8) : atClearing ? 1 : 0;
  // Mark geometry, in stage pixels at zoom 1 (it rides the plate transform).
  const plateH = env.height! * Math.max(w / env.width!, h / env.height!);
  const markH = plateH * c.placement.height, markW = markH * mark.width! / mark.height!;
  // Light reaches the mark on the reveal: exposure, rim and a sweep across its face.
  const lit = reduced ? (t >= reveal ? 1 : 0) : cinematicEase(span01(t, reveal - 4, reveal + 22));
  const sweep = reduced ? -1 : span01(t, reveal - 2, reveal + 30);
  const light = coverPoint({ x: c.light?.x ?? .3, y: c.light?.y ?? .05 }, env, w, h);
  const toLight = Math.atan2(light.y - base.y, light.x - base.x);
  const lx = Math.cos(toLight), ly = Math.sin(toLight);
  const material = c.material ?? { kind: "solid" as const };
  const tone = material.color ?? "#d9cdb4";
  const thickness = (material.thickness ?? .05) * markH;
  const haze = c.haze ?? .25;
  const rays = c.light?.rays !== false;
  // Beams point from the key light towards the mark (CSS rotate turns a downward beam clockwise).
  const aim = -Math.atan2(base.x - light.x, base.y - light.y) * 180 / Math.PI;
  const raysOn = reduced ? (t >= reveal ? .8 : t >= dock ? .45 : 0) : .35 * span01(t, dock, dock + 30) + .55 * span01(t, reveal - 10, reveal + 30);
  const forms = useMemo(() => formsFor(dock, reveal, portrait), [dock, reveal, portrait]);
  const overlay = useContext(OverlayRendererContext);
  const beats: AnnotationBeats = { dock, reveal, resolve, durationFrames: f.durationFrames, steps: {} };
  const look = c.look ?? {};
  const plate = (asset: ImageAsset, z: number, o: string, filter: string, children?: ReactNode, name?: string) =>
    <div data-km-nature-plate={name} style={{ position: "absolute", inset: 0, transform: `scale(${z})`, transformOrigin: o, willChange: "transform" }}>
      <Asset asset={asset} style={{ borderRadius: 0, filter }}/>
      {children}
    </div>;
  const markBox: CSSProperties = { position: "absolute", left: `${(base.x - markW / 2) / w * 100}%`, top: `${(base.y - markH) / h * 100}%`,
    width: `${markW / w * 100}%`, height: `${markH / h * 100}%` };
  const face: CSSProperties = { position: "absolute", inset: 0, ...maskStyle(mark.src) };
  const markLayer = <div data-km-identity-mark={grounded ? "grounded" : "graphic"} data-km-mark-lit={lit.toFixed(4)} style={markBox}>
    {grounded && <>
      {/* Cast shadow on the ground, falling away from the key light. */}
      <div aria-hidden="true" data-km-mark-shadow="" style={{ ...face, background: "rgba(8,12,6,.62)", transformOrigin: "50% 100%", filter: "blur(.25em)",
        transform: `scaleY(-.26) skewX(${-lx * 52}deg) translateY(${-2}%)`, opacity: .35 + .5 * lit }}/>
      <div aria-hidden="true" data-km-mark-contact="" style={{ position: "absolute", left: "-12%", right: "-12%", bottom: "-5%", height: "10%",
        background: "radial-gradient(ellipse 50% 50% at 50% 50%,rgba(6,9,4,.8),rgba(6,9,4,0) 70%)", filter: "blur(.12em)" }}/>
      {/* Thickness: the silhouette extruded away from the light. */}
      {Array.from({ length: 7 }, (_, i) => <div key={i} aria-hidden="true" style={{ ...face,
        background: `rgb(${46 + i * 3},${40 + i * 3},${32 + i * 2})`, transform: `translate(${-lx * thickness / markW * 100 * (7 - i) / 7}%,${-ly * thickness / markH * 35 * (7 - i) / 7}%)` }}/>)}
      {/* Rim: a sliver of key light on the edges that face it. */}
      <div aria-hidden="true" style={{ ...face, background: lightColor, opacity: .9 * lit, transform: `translate(${lx * .045}em,${ly * .045}em)` }}/>
    </>}
    {material.kind === "artwork" || !grounded
      ? <div style={{ position: "absolute", inset: 0 }}><Asset asset={mark} style={{ borderRadius: 0, objectFit: "contain", objectPosition: "center bottom" }}/></div>
      : <div aria-hidden="true" data-km-mark-face="" style={{ ...face,
          background: `linear-gradient(${Math.round(toLight * 180 / Math.PI + 90)}deg,${tone} 0%,color-mix(in srgb,${tone} 62%,#1e1a14) 100%)` }}/>}
    {/* Exposure: the mark sits in shade until the key light reaches it. */}
    <div aria-hidden="true" style={{ ...face, background: "#0b0f08", opacity: .58 * (1 - lit) }}/>
    {sweep > 0 && sweep < 1 && <div aria-hidden="true" data-km-mark-sweep="" style={{ ...face,
      background: `linear-gradient(105deg,transparent ${sweep * 160 - 50}%,${lightColor} ${sweep * 160 - 30}%,transparent ${sweep * 160 - 10}%)`,
      mixBlendMode: "screen", opacity: .55 }}/>}
    <div aria-hidden="true" style={{ ...face, background: "#c9d6cf", opacity: haze * .35 }}/>
    {grounded && <GroundBlades seed={7} color="#5f7a3b"/>}
    {!grounded && <div aria-hidden="true" style={{ ...face, filter: `blur(.5em)`, background: lightColor, opacity: .35 * lit, zIndex: -1 }}/>}
  </div>;
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#050805",
    fontSize: portrait ? "clamp(13px, 3.5cqw, 44px)" : "clamp(13px, 2cqw, 40px)" }}>
    {c.approach && crossfade < 1 && <div style={{ position: "absolute", inset: 0, opacity: 1 - crossfade }}>
      {plate(c.approach, reduced ? 1.02 : approachZoom, "50% 50%", "brightness(.66) saturate(.92) contrast(1.08)", undefined, "approach")}
    </div>}
    {(crossfade > 0 || !c.approach) && <div style={{ position: "absolute", inset: 0, opacity: c.approach ? crossfade : 1 }}>
      {plate(env, zoom, origin, "brightness(.84) saturate(1.06) contrast(1.06) sepia(.12)", <>
        {/* Warm key from the light position and cool shade in the foreground grade the daylight plate. */}
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, mixBlendMode: "soft-light",
          background: `radial-gradient(ellipse 70% 60% at ${light.x / w * 100}% ${light.y / h * 100}%,rgba(255,196,120,.85),rgba(255,170,90,.1) 60%,rgba(20,40,60,.5) 100%)` }}/>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0,
          background: "linear-gradient(0deg,rgba(6,10,6,.55) 0%,transparent 34%),linear-gradient(180deg,rgba(6,10,8,.38) 0%,transparent 28%)" }}/>
        {markLayer}
      </>, "clearing")}
    </div>}
    {rays && raysOn > 0 && <div aria-hidden="true" data-km-nature-rays={raysOn.toFixed(3)} style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen", opacity: raysOn }}>
      {[-.34, -.18, -.05, .07, .2, .33].map((spread, i) => <div key={i} style={{ position: "absolute", left: `${light.x / w * 100}%`, top: `${light.y / h * 100}%`,
        width: `${10 + (i % 3) * 5}%`, height: "190%", transformOrigin: "50% 0",
        transform: `translateX(-50%) rotate(${aim + spread * 60 + (reduced ? 0 : (t - reveal) * .02)}deg)`,
        background: `linear-gradient(180deg,${lightColor}cc 0%,${lightColor}33 45%,transparent 80%)`, filter: "blur(1.2em)", opacity: .35 + (i % 2) * .2 }}/>)}
    </div>}
    {!reduced && <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {Array.from({ length: 16 }, (_, i) => { const r = seeded(100 + i); const x0 = r() * 100, y0 = r() * 100, sp = .02 + r() * .05;
        return <div key={i} style={{ position: "absolute", left: `${(x0 + t * sp * .4) % 100}%`, top: `${(y0 - t * sp + 400) % 100}%`, width: `${.12 + r() * .14}em`, height: `${.12 + r() * .14}em`,
          borderRadius: "50%", background: lightColor, opacity: (.12 + .3 * r()) * clamp01(raysOn * 1.6), boxShadow: `0 0 .6em .15em ${lightColor}55` }}/>; })}
    </div>}
    {kind !== "none" && forms.map(form => <ForegroundForm key={form.id} form={form} frame={t} reduced={reduced} kind={kind}/>)}
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none",
      background: "linear-gradient(0deg,rgba(4,6,4,.78) 0%,rgba(4,6,4,.35) 22%,transparent 40%)", opacity: span01(t, resolve - 20, resolve + 10) * .9 + .1 }}/>
    <FilmFinish frame={t} reduced={reduced} grain={look.grain ?? 1} vignette={look.vignette ?? 1} vignetteStrength={.55}/>
    <div data-km-stage-overlay="" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {overlay?.({ frame: f, width: w, height: h, beats, space: "stage", toStage: p => ({ x: p.x * w, y: p.y * h }),
        state: timing => annotationState(timing, beats, t, reduced) })}
    </div>
    {(c.name || c.tagline) && <div data-km-identity-copy="" style={{ position: "absolute", left: "8%", right: "8%", bottom: portrait ? "8%" : "6.5%",
      display: "flex", flexDirection: "column", alignItems: "center", gap: ".35em", textAlign: "center", textShadow: "0 .05em .7em rgba(0,0,0,.6)" }}>
      {c.name && <h2 style={{ margin: 0, fontSize: fitLongestWord(c.name, portrait ? 2.5 : 2.6, 84), fontWeight: 650, letterSpacing: ".14em",
        textTransform: "uppercase", lineHeight: 1.05, textWrap: "balance" }}>
        <KineticWords text={c.name} start={resolve} stagger={3} length={20} frame={t} reduced={reduced} marker="identity"/>
      </h2>}
      {c.tagline && <RiseIn name="identity-tagline" frame={t} start={resolve + 14} length={20} reduced={reduced}
        style={{ fontSize: portrait ? "1em" : ".95em", fontWeight: 450, letterSpacing: ".04em", opacity: .92, maxWidth: "30em", textWrap: "balance" }}>{c.tagline}</RiseIn>}
    </div>}
  </div>;
}
