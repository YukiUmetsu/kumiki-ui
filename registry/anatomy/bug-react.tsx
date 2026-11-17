/**
 * BUG1 React pieces: `BugFigure` (a top view painted by part: glossy chitin, translucent veined wings, a glowing
 * lantern), `BugMotion` (walking in the tripod gait, wingbeats at the species' rate (a blur where a camera could not
 * resolve them), fireflies flashing in step) and `BugSheet` (body plans, wings, wingbeats and the species).
 */
import { useEffect, useId, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { SheetCard, sheetGrid, sheetList, sheetSmall } from "./foundation-react";
import { BUG_PLANS, BUG_SPECIES, TRIPOD, WINGBEATS, WINGS, findBug, wingsOnFilm } from "./bug-data";
import { bugTopView } from "./bug-construct";
import type { BugPart, BugPose } from "./bug-construct";

const d = (p: BugPart) => `M${p.pts.map(q => `${q[0].toFixed(2)} ${q[1].toFixed(2)}`).join("L")}${p.closed ? "Z" : ""}`;
const smoothD = (p: BugPart) => {
  if (!p.closed || p.pts.length < 4) return d(p);
  const n = p.pts.length, m = (i: number) => p.pts[(i + n) % n];
  let s = `M${((m(0)[0] + m(1)[0]) / 2).toFixed(2)} ${((m(0)[1] + m(1)[1]) / 2).toFixed(2)}`;
  for (let i = 1; i <= n; i++) s += `Q${m(i)[0].toFixed(2)} ${m(i)[1].toFixed(2)} ${((m(i)[0] + m(i + 1)[0]) / 2).toFixed(2)} ${((m(i)[1] + m(i + 1)[1]) / 2).toFixed(2)}`;
  return `${s}Z`;
};

export interface BugFigureProps { species: string; pose?: BugPose; size?: number; label?: string; style?: CSSProperties; blurWings?: boolean }
/** A species seen from above, painted by part, at a given pose. */
export function BugFigure({ species, pose, size = 220, label, style, blurWings = false }: BugFigureProps) {
  const uid = useId().replace(/:/g, "");
  const dr = useMemo(() => bugTopView(species, pose), [species, pose]);
  const s = dr.species, ext = dr.size * 0.62, body = s.colours.body;
  const fill = (p: BugPart): string => {
    switch (p.role) {
      case "head": case "thorax": case "abdomen": case "body": return `url(#${uid}-chitin)`;
      case "elytra": return `url(#${uid}-elytra)`;
      case "shell": return `url(#${uid}-shell)`;
      case "eye": return s.wings === "net" ? "#5b2a1f" : "#121212";
      case "wing": return p.colour ?? "rgba(230,230,235,0.4)";
      case "mandible": case "horn": return `url(#${uid}-chitin)`;
      case "glow": return p.colour ?? "#c8ff5a";
      default: return p.colour ?? body;
    }
  };
  return (
    <svg viewBox={`${-ext} ${-ext} ${2 * ext} ${2 * ext}`} width={size} height={size} role="img" aria-label={label ?? `${s.label}, seen from above`} style={{ display: "block", maxWidth: "100%", ...style }}>
      <defs>
        <radialGradient id={`${uid}-chitin`} cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#ffffff" stopOpacity="0.55" /><stop offset="0.18" stopColor={body} /><stop offset="1" stopColor={body} stopOpacity="1" /></radialGradient>
        <radialGradient id={`${uid}-elytra`} cx="0.35" cy="0.25" r="0.9"><stop offset="0" stopColor="#ffffff" stopOpacity="0.7" /><stop offset="0.12" stopColor={s.colours.wing ?? body} /><stop offset="1" stopColor={s.colours.wing ?? body} /></radialGradient>
        <radialGradient id={`${uid}-shell`} cx="0.4" cy="0.35" r="0.75"><stop offset="0" stopColor="#e8cfa0" /><stop offset="0.6" stopColor={s.colours.wing ?? "#9a6e3e"} /><stop offset="1" stopColor="#4a3424" /></radialGradient>
        <filter id={`${uid}-glow`} x="-2" y="-2" width="5" height="5"><feGaussianBlur stdDeviation={s.length.typical * 0.12} /></filter>
        <filter id={`${uid}-blur`}><feGaussianBlur stdDeviation={s.length.typical * 0.06} /></filter>
        <filter id={`${uid}-shadow`} x="-0.3" y="-0.3" width="1.6" height="1.6"><feGaussianBlur stdDeviation={s.length.typical * 0.035} /></filter>
      </defs>
      {/* a soft contact shadow under the body */}
      <ellipse cx={s.length.typical * 0.04} cy={s.length.typical * 0.06} rx={s.length.typical * s.shape.width * 0.6} ry={s.length.typical * 0.5} fill="rgba(0,0,0,0.25)" filter={`url(#${uid}-shadow)`} />
      {dr.parts.map((p, i) => {
        if (p.role === "glow") return <g key={i} opacity={p.opacity ?? 1}><path d={smoothD(p)} fill={fill(p)} filter={`url(#${uid}-glow)`} opacity={0.9} /><path d={smoothD(p)} fill="#f4ffd0" /></g>;
        if (!p.closed) return <path key={i} d={d(p)} fill="none" stroke={p.colour ?? (p.role === "leg" || p.role === "antenna" ? body : "#2a2420")} strokeWidth={p.width ?? 0.3} strokeLinecap="round" strokeLinejoin="round" opacity={p.opacity ?? 1} />;
        const isWing = p.role === "wing";
        return <path key={i} d={smoothD(p)} fill={fill(p)} opacity={p.opacity ?? 1} filter={isWing && blurWings ? `url(#${uid}-blur)` : undefined}
          stroke={isWing ? "rgba(60,45,30,0.6)" : p.role === "spot" || p.role === "band" ? "none" : "rgba(0,0,0,0.55)"} strokeWidth={s.length.typical * 0.006} />;
      })}
    </svg>
  );
}

export interface BugMotionProps { species: string; mode: "walk" | "fly" | "glow"; size?: number; fps?: number; label?: string }
/**
 * A species moving at its own rates: walking in the tripod gait (about 2 strides a second at this scale), flapping at
 * its wingbeat (drawn as a blur where a camera at `fps` could not resolve it), or a firefly flashing (every 2 s in
 * the west of Japan). Reduced motion: a still pose and a Play button.
 */
export function BugMotion({ species, mode, size = 240, fps = 24, label }: BugMotionProps) {
  const [t, setT] = useState(0), [playing, setPlaying] = useState(() => !(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches));
  useEffect(() => {
    if (!playing) return;
    let raf = 0, start = 0, last = -1;
    const tick = (now: number) => { if (!start) start = now; const f = Math.floor(((now - start) / 1000) * fps); if (f !== last) { last = f; setT(f / fps); } raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, fps]);
  const s = findBug(species), hz = s.wings === "scaled" ? 8 : s.wings === "net" ? 30 : s.id === "honeybee" ? 230 : 60;
  const blur = mode === "fly" && wingsOnFilm(hz, fps) === "blur";
  const pose: BugPose = mode === "walk" ? { gait: (t * 2) % 1, wing: 0 } : mode === "fly" ? { gait: 0.25, wing: blur ? 1 : 0.5 + 0.5 * Math.cos(2 * Math.PI * hz * t) } : { gait: 0.25, wing: 0, glow: Math.pow(Math.max(0, Math.sin(Math.PI * ((t % 2) / 0.5))), 2) * ((t % 2) < 0.5 ? 1 : 0) };
  return (
    <div style={{ display: "grid", gap: 6, justifyItems: "start" }}>
      <div style={{ background: mode === "glow" ? "#0e1410" : "var(--km-surface-subtle, #e9e4da)", borderRadius: 6, padding: 6 }}>
        <BugFigure species={species} pose={pose} size={size} blurWings={blur} label={label ?? `${s.label}, ${mode === "walk" ? "walking" : mode === "fly" ? "flapping" : "glowing"}`} />
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", ...sheetSmall }}>
        <button type="button" onClick={() => setPlaying(p => !p)} aria-pressed={playing} style={{ minHeight: 32, padding: "4px 10px", borderRadius: 6, border: "1px solid #797776", background: "#fff", font: "13px system-ui" }}>{playing ? "Pause" : "Play"}</button>
        <span>{mode === "walk" ? "Tripod gait: L1·R2·L3 then R1·L2·R3" : mode === "fly" ? `${hz} beats/s${blur ? ` — a blur at ${fps} fps` : ""}` : "A flash every 2 s (western Japan)"}</span>
      </div>
    </div>
  );
}

/** Body plans, wings, wingbeats and the species. */
export function BugSheet() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={sheetGrid}>
        {BUG_PLANS.map(p => (
          <SheetCard key={p.id} title={`${p.label}: ${p.legs} legs`}>
            <ul style={{ ...sheetList, ...sheetSmall }}>{p.parts.map(x => <li key={x}>{x}</li>)}</ul>
            <ul style={{ ...sheetList, ...sheetSmall }}>{p.rules.map(x => <li key={x}>{x}</li>)}</ul>
            <span style={sheetSmall}><b>Common mistakes:</b> {p.mistakes.join(" ")}</span>
          </SheetCard>
        ))}
        <SheetCard title="Wings by order">
          <ul style={{ ...sheetList, ...sheetSmall }}>{Object.values(WINGS).filter(w => w.pairs > 0).map(w => <li key={w.label}><b>{w.label}</b> ({w.pairs} pair{w.pairs > 1 ? "s" : ""}): {w.rest} {w.look}</li>)}</ul>
        </SheetCard>
        <SheetCard title="Wingbeats and film">
          <ul style={{ ...sheetList, ...sheetSmall }}>{WINGBEATS.map(w => <li key={w.who}><b>{w.who}</b>: {w.hz.min}–{w.hz.max} Hz — {wingsOnFilm(w.hz.typical) === "blur" ? "a blur at 24 fps" : "separate poses at 24 fps"}</li>)}</ul>
          <span style={sheetSmall}>{TRIPOD.source}: legs L1, R2, L3 step together, then R1, L2, R3.</span>
        </SheetCard>
      </div>
      <div style={sheetGrid}>
        {BUG_SPECIES.map(s => (
          <SheetCard key={s.id} title={`${s.label} (${s.ja}, ${s.latin})`}>
            <div style={{ background: "var(--km-surface-subtle, #ede8de)", borderRadius: 6, justifySelf: "start" }}><BugFigure species={s.id} size={180} /></div>
            <span style={sheetSmall}>{s.length.min}–{s.length.max} mm{s.wingspan ? `, wingspan ${s.wingspan.min}–${s.wingspan.max} mm` : ""} · {s.season}</span>
            <ul style={{ ...sheetList, ...sheetSmall }}>{s.behaviour.map(b => <li key={b}>{b}</li>)}{s.sound ? <li>Sound: {s.sound}</li> : null}</ul>
            <span style={sheetSmall}>{s.sources.join("; ")}</span>
          </SheetCard>
        ))}
      </div>
    </div>
  );
}
