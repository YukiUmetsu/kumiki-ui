/**
 * Nature-World Identity Reveal. Causal beat:
 *   input      a forest view framed by near trunks, ferns and canopy, with a
 *              clearing beyond; a caller-supplied mark stands in its shade
 *   transform  the camera walks forward (one dolly z drives every depth plane:
 *              near forms grow fast and leave by their edge, uncovering the
 *              clearing they hid); it settles, then a sun shaft through the
 *              canopy sweeps across the clearing and finds the mark
 *   output     the mark held lit, grounded (contact and cast shadow, thickness,
 *              rim light), above its optional name and line.
 * Multi-plane 2.5D built on environment-parallax: not a navigable 3D world.
 * Pure function of the frame.
 */
import { useContext, useMemo } from "react";
import type { CSSProperties } from "react";
import type { NatureDepthLayer, SceneTemplateFrame, SceneTemplateSpec } from "../scene-templates";
import type { AnnotationBeats } from "../subject-annotations";
import { annotationState, coverPoint } from "../subject-annotations";
import { dollyCameraAtFrame, projectDepthPlane } from "../environment-parallax";
import type { DepthPlane } from "../environment-parallax";
import { Asset, FilmFinish, KineticWords, OverlayRendererContext, RiseIn, cinematicEase, clamp01, cueAt, easeInOut, filmGrain, fitLongestWord, span01 } from "./stage-kit";

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
    d += `M${sx} ${sy}C${sx + ux * len * .3 + px * wid} ${sy + uy * len * .3 + py * wid} ${sx + ux * len * .85 + px * wid * .45} ${sy + uy * len * .85 + py * wid * .45} ${sx + ux * len} ${sy + uy * len}`
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
/** Near-lens forms just in front of the camera: they pass in the first part of the walk. */
const NEAR: (DepthPlane & { seed: number; rot: number })[] = [
  { seed: 11, x: .04, y: .18, width: .34, height: .62, depth: .9, rot: 140 },
  { seed: 23, x: .97, y: .88, width: .38, height: .7, depth: 1.05, rot: -38 },
  { seed: 41, x: .98, y: .1, width: .28, height: .52, depth: .8, rot: -150 },
];
/** Once a near plane passes ~2.2× its frame-0 size it no longer reads as forest, only as blur:
 * it dissolves as it reaches the lens instead of blooming across the frame. */
const passFade = (scale: number) => { const t = clamp01((scale - 2.2) / 1.4); return 1 - t * t * (3 - 2 * t); };
const maskStyle = (src: string): CSSProperties => ({ position: "absolute", inset: 0, maskImage: `url("${src}")`, WebkitMaskImage: `url("${src}")`,
  maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat",
  maskPosition: "center bottom", WebkitMaskPosition: "center bottom" } as CSSProperties);
/** Frame-0 plane of a caller layer, in stage fractions, honouring its portrait override. */
function layerPlane(layer: NatureDepthLayer, w: number, h: number): DepthPlane {
  const place = h > w && layer.portrait ? layer.portrait : layer;
  const width = place.height * (layer.image.width! / layer.image.height!) * h / w;
  return { x: place.x, y: place.y, width, height: place.height, depth: layer.depth };
}

export function NatureWorldIdentityRevealStage({ spec, f }: { spec: SceneTemplateSpec<"nature-world-identity-reveal">; f: SceneTemplateFrame }) {
  const c = spec.content, w = spec.width, h = spec.height, portrait = h > w, t = f.frame, reduced = f.reducedMotion;
  const dock = cueAt(f, 0), reveal = cueAt(f, 1), resolve = cueAt(f, 2);
  const env = c.environment, mark = c.mark, kind = c.foreground ?? "foliage";
  const grounded = (c.treatment ?? "grounded") === "grounded";
  const lightColor = c.light?.color ?? "#ffd9a0";
  // Walk: one camera z, settling on the dock beat so the clearing is still before the light arrives.
  const cam = dollyCameraAtFrame(t, { distance: c.walk?.distance ?? 1.7, truck: c.walk?.truck ?? 0, bob: c.walk?.bob ?? .5, start: 0, end: dock }, reduced);
  const base0 = coverPoint({ x: c.placement.x, y: c.placement.y }, env, w, h);
  const vp = { x: base0.x / w, y: base0.y / h };
  const bgDepth = 14;
  const bg = projectDepthPlane({ x: .5, y: .5, width: 1.06, height: 1.06, depth: bgDepth }, cam, vp);
  const toScreen = (p: { x: number; y: number }, depth: number) => ({ x: vp.x + ((p.x - vp.x) * depth - cam.x) / (depth - cam.z), y: vp.y + ((p.y - vp.y) * depth - cam.y) / (depth - cam.z) });
  // Mark geometry in stage pixels at frame 0 (it rides the far plane with the clearing).
  const plateH = env.height! * Math.max(w / env.width!, h / env.height!);
  const markH = plateH * c.placement.height, markW = markH * mark.width! / mark.height!;
  const markBase = toScreen(vp, bgDepth), markTop = toScreen({ x: vp.x, y: vp.y - markH / h }, bgDepth);
  // Reveal: a sun shaft sweeps across the clearing onto the mark, then light lands on it.
  const shaftIn = reduced ? (t >= reveal ? 1 : 0) : clamp01(span01(t, reveal - 6, reveal + 16));
  const sweep = reduced ? 1 : easeInOut(span01(t, reveal, reveal + 30));
  const lit = reduced ? (t >= reveal ? 1 : 0) : cinematicEase(span01(t, reveal + 16, reveal + 40));
  const bloom = reduced || t < reveal + 26 ? 0 : Math.exp(-(t - reveal - 26) / 10);
  const lightX = c.light?.x ?? .3;
  const groundX = markBase.x + (1 - sweep) * .24, groundY = markBase.y;
  const markMidY = (markBase.y + markTop.y) / 2;
  const lx = Math.cos(Math.atan2(-.05 - markMidY, lightX - markBase.x));
  const material = c.material ?? { kind: "solid" as const };
  const tone = material.color ?? "#b89b74";
  const thickness = (material.thickness ?? .06) * markH;
  const haze = c.haze ?? .35;
  const nearForms = useMemo(() => NEAR.map(n => ({ ...n, d: kind === "rock" ? rockPath(n.seed) : foliagePath(n.seed) })), [kind]);
  const overlay = useContext(OverlayRendererContext);
  const beats: AnnotationBeats = { dock, reveal, resolve, durationFrames: f.durationFrames, steps: {} };
  const look = c.look ?? {};
  const rect = (r: { x: number; y: number; width: number; height: number }): CSSProperties => ({ position: "absolute",
    left: `${(r.x - r.width / 2) * 100}%`, top: `${(r.y - r.height / 2) * 100}%`, width: `${r.width * 100}%`, height: `${r.height * 100}%` });
  // Defocus grows as a plane nears the lens; the camera is focused on the clearing.
  const defocus = (gap: number) => Math.max(0, Math.min(1.9, .5 / gap - .12));
  const face: CSSProperties = maskStyle(mark.src);
  const markLayer = <div data-km-identity-mark={grounded ? "grounded" : "graphic"} data-km-mark-lit={lit.toFixed(4)} style={{ position: "absolute",
    left: `${(base0.x - markW / 2) / w * 100}%`, top: `${(base0.y - markH) / h * 100}%`, width: `${markW / w * 100}%`, height: `${markH / h * 100}%` }}>
    {grounded && <>
      {/* Cast shadow on the ground, falling away from the shaft once it lands. */}
      <div aria-hidden="true" data-km-mark-shadow="" style={{ ...face, background: "rgba(8,12,6,.6)", transformOrigin: "50% 100%", filter: "blur(.7em)",
        transform: `scaleY(-.24) skewX(${lx * 50}deg) translateY(-2%)`, opacity: .1 + .35 * lit }}/>
      <div aria-hidden="true" style={{ position: "absolute", left: "-12%", right: "-12%", bottom: "-5%", height: "10%",
        background: "radial-gradient(ellipse 50% 50% at 50% 50%,rgba(6,9,4,.85),rgba(6,9,4,0) 70%)", filter: "blur(.12em)" }}/>
      {Array.from({ length: 7 }, (_, i) => <div key={i} aria-hidden="true" style={{ ...face,
        background: `color-mix(in srgb,${tone} ${18 + i * 4}%,#120e0a)`, transform: `translate(${-lx * thickness / markW * 100 * (7 - i) / 7}%,${-thickness / markH * 12 * (7 - i) / 7}%)` }}/>)}
      <div aria-hidden="true" style={{ ...face, background: lightColor, opacity: .95 * lit, transform: `translate(${lx * .05}em,-.03em)` }}/>
    </>}
    {material.kind === "artwork" || !grounded
      ? <div style={{ position: "absolute", inset: 0 }}><Asset asset={mark} style={{ borderRadius: 0, objectFit: "contain", objectPosition: "center bottom" }}/></div>
      : <div aria-hidden="true" data-km-mark-face="" style={{ ...face,
          background: `linear-gradient(${lx < 0 ? 120 : 240}deg,color-mix(in srgb,${tone} 85%,${lightColor}) 0%,${tone} 38%,color-mix(in srgb,${tone} 52%,#1a1610) 100%)` }}/>}
    <div aria-hidden="true" style={{ ...face, backgroundImage: filmGrain, backgroundSize: "6em 6em", mixBlendMode: "multiply", opacity: .5 }}/>
    <div aria-hidden="true" style={{ ...face, background: "linear-gradient(0deg,rgba(10,12,6,.7) 0%,transparent 16%)" }}/>
    {/* In the shade the mark is a quiet silhouette; the landing light lifts it. */}
    <div aria-hidden="true" data-km-mark-shade="" style={{ ...face, background: "#0a0e08", opacity: .72 * (1 - lit) + .04 }}/>
    <div aria-hidden="true" style={{ ...face, background: lightColor, mixBlendMode: "screen", opacity: .5 * bloom }}/>
  </div>;
  // Shaft geometry in stage fractions: a soft wedge from the canopy to the ground under the sweep.
  const shaft = `${lightX - .035},-0.05 ${lightX + .035},-0.05 ${groundX + .13},${groundY + .04} ${groundX - .13},${groundY + .04}`;
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#050805",
    fontSize: portrait ? "clamp(13px, 3.5cqw, 44px)" : "clamp(13px, 2cqw, 40px)" }}>
    <div data-km-nature-camera="" data-km-camera-z={cam.z.toFixed(4)} style={{ position: "absolute", inset: "-3%",
      transform: `rotate(${cam.roll}deg)`, transformOrigin: "50% 60%" }}>
      <div style={{ position: "absolute", inset: "2.9%" }}>
        <div data-km-nature-plate="clearing" style={rect(bg)}>
          <div style={{ position: "absolute", inset: `${-(1.06 - 1) / 2 / 1.06 * 100}%`, transform: `scale(${1 / 1.06})` }}>
            <Asset asset={env} style={{ borderRadius: 0, filter: "brightness(.8) saturate(1.05) contrast(1.08) sepia(.1)" }}/>
            <div aria-hidden="true" style={{ position: "absolute", inset: 0,
              background: "linear-gradient(180deg,rgba(8,12,10,.6) 0%,rgba(8,12,10,.18) 30%,transparent 44%),linear-gradient(0deg,rgba(6,10,6,.5) 0%,transparent 30%)" }}/>
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, mixBlendMode: "soft-light", opacity: .4 + .6 * shaftIn,
              background: `radial-gradient(ellipse 60% 55% at ${lightX * 100}% 0%,rgba(255,196,120,.85),rgba(255,170,90,.08) 60%,rgba(20,40,60,.45) 100%)` }}/>
            {markLayer}
          </div>
        </div>
        {/* Haze between the clearing and the forest thins as the camera approaches. */}
        <div aria-hidden="true" data-km-nature-haze="" style={{ position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(180deg,rgba(196,214,206,.5) 0%,rgba(170,192,180,.3) 60%,rgba(120,140,120,.15) 100%)", opacity: haze * (1 - cam.progress) }}/>
        {(c.layers ?? []).map((layer, i) => ({ layer, i, plane: layerPlane(layer, w, h) })).sort((a, b) => b.plane.depth - a.plane.depth).map(({ layer, i, plane }) => {
          const p = projectDepthPlane(plane, cam, vp);
          if (!p.visible) return null;
          const gap = plane.depth - cam.z;
          return <div key={i} data-km-depth-layer={layer.image.id} data-km-layer-scale={p.scale.toFixed(3)} style={{ ...rect(p),
            transform: layer.flip ? "scaleX(-1)" : undefined, opacity: passFade(p.scale), filter: `blur(${defocus(gap)}em) brightness(${.55 + .35 * Math.min(1, gap / 6)}) saturate(.92)` }}>
            <Asset asset={layer.image} style={{ borderRadius: 0, objectFit: "fill" }}/>
          </div>;
        })}
        {kind !== "none" && nearForms.map(form => {
          const p = projectDepthPlane(form, cam, vp);
          if (!p.visible || reduced) return null;
          return <svg key={form.seed} aria-hidden="true" data-km-foreground-form={form.seed} viewBox="-100 -100 200 200" preserveAspectRatio="none"
            style={{ ...rect(p), overflow: "visible", transform: `rotate(${form.rot}deg)`, opacity: passFade(p.scale), filter: `blur(${Math.min(2.2, defocus(form.depth - cam.z) + .5)}em)` }}>
            <path d={form.d} fill={kind === "rock" ? "#08090b" : "#040803"}/>
          </svg>;
        })}
      </div>
    </div>
    {shaftIn > 0 && <svg aria-hidden="true" data-km-nature-shaft={sweep.toFixed(3)} viewBox="0 0 1 1" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
      pointerEvents: "none", mixBlendMode: "screen", opacity: shaftIn * (.8 + .2 * lit), filter: "blur(1.2em)", overflow: "visible" }}>
      <defs><linearGradient id="km-shaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={lightColor} stopOpacity=".75"/><stop offset=".7" stopColor={lightColor} stopOpacity=".28"/><stop offset="1" stopColor={lightColor} stopOpacity=".05"/></linearGradient></defs>
      <polygon points={shaft} fill="url(#km-shaft)"/>
      <ellipse cx={groundX} cy={groundY + .01} rx={.2} ry={.05} fill={lightColor} opacity={.18 * lit}/>
    </svg>}
    {!reduced && shaftIn > 0 && <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {Array.from({ length: 22 }, (_, i) => { const r = seeded(200 + i), along = (r() + t * (.002 + r() * .003)) % 1, across = r() * 2 - 1;
        const x = (lightX + (groundX - lightX) * along) + across * (.035 + .095 * along), y = -.05 + (groundY + .09) * along;
        return <div key={i} style={{ position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, width: `${.1 + r() * .14}em`, height: `${.1 + r() * .14}em`,
          borderRadius: "50%", background: lightColor, opacity: (.25 + .45 * r()) * shaftIn, boxShadow: `0 0 .5em .12em ${lightColor}66` }}/>; })}
    </div>}
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none",
      background: "linear-gradient(0deg,rgba(4,6,4,.8) 0%,rgba(4,6,4,.35) 22%,transparent 40%)", opacity: .15 + .85 * span01(t, resolve - 20, resolve + 10) }}/>
    <FilmFinish frame={t} reduced={reduced} grain={look.grain ?? 1} vignette={look.vignette ?? 1} vignetteStrength={.55}/>
    <div data-km-stage-overlay="" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {overlay?.({ frame: f, width: w, height: h, beats, space: "stage", toStage: p => ({ x: p.x * w, y: p.y * h }),
        state: timing => annotationState(timing, beats, t, reduced) })}
    </div>
    {(c.name || c.tagline) && <div data-km-identity-copy="" style={{ position: "absolute", left: "8%", right: "8%", bottom: portrait ? "8%" : "6.5%",
      display: "flex", flexDirection: "column", alignItems: "center", gap: ".35em", textAlign: "center", textShadow: "0 .05em .7em rgba(0,0,0,.6)" }}>
      {c.name && <h2 style={{ margin: 0, visibility: reduced || t >= resolve ? "visible" : "hidden", fontSize: fitLongestWord(c.name, portrait ? 2.5 : 2.6, 84),
        fontWeight: 650, letterSpacing: ".14em", textTransform: "uppercase", lineHeight: 1.05, textWrap: "balance" }}>
        <KineticWords text={c.name} start={resolve} stagger={3} length={20} frame={t} reduced={reduced} marker="identity"/>
      </h2>}
      {c.tagline && <RiseIn name="identity-tagline" frame={t} start={resolve + 14} length={20} reduced={reduced}
        style={{ fontSize: "1.1em", fontWeight: 500, letterSpacing: ".04em", opacity: .92, maxWidth: "30em", textWrap: "balance" }}>{c.tagline}</RiseIn>}
    </div>}
  </div>;
}
