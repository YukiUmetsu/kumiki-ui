/** Shared presentation for the House Math Storybook section (demo chrome only, not library code). */
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

export const ink = { bg: "#0c1015", panel: "#131a22", line: "#232d39", text: "#e6edf3", sub: "#9aa8b6", dim: "#6f7d8b", accent: "#7cc4b4", warn: "#e7b15e" } as const;
export const font = "Geist, Inter, system-ui, sans-serif";
export const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

export function Page({ title, kicker, intro, children }: { title: string; kicker?: string; intro?: ReactNode; children: ReactNode }) {
  return <main style={{ background: ink.bg, minHeight: "100vh", padding: "20px 16px 48px", color: ink.text, fontFamily: font }}>
    <div style={{ maxWidth: 1320, margin: "0 auto", display: "grid", gap: 14 }}>
      <header style={{ display: "grid", gap: 6 }}>
        {kicker ? <span style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: ink.accent }}>{kicker}</span> : null}
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 650, letterSpacing: "-.01em" }}>{title}</h1>
        {intro ? <p style={{ margin: 0, color: ink.sub, maxWidth: 820, lineHeight: 1.5 }}>{intro}</p> : null}
      </header>
      {children}
    </div>
  </main>;
}

export function Panel({ children, style, title }: { children: ReactNode; style?: CSSProperties; title?: string }) {
  return <section style={{ background: ink.panel, border: `1px solid ${ink.line}`, borderRadius: 14, padding: 14, display: "grid", gap: 10, alignContent: "start", ...style }}>
    {title ? <h2 style={{ margin: 0, fontSize: 12, letterSpacing: ".07em", textTransform: "uppercase", color: ink.dim, fontWeight: 600 }}>{title}</h2> : null}
    {children}
  </section>;
}

export function Chip({ children, tone }: { children: ReactNode; tone?: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 9px", borderRadius: 999, fontSize: 12,
    background: tone ? tone + "22" : "#1c2530", color: tone ?? ink.sub, border: `1px solid ${tone ? tone + "55" : "#2a3542"}` }}>{children}</span>;
}

export function Button({ active, onClick, children, title, small }: { active?: boolean; onClick: () => void; children: ReactNode; title?: string; small?: boolean }) {
  return <button type="button" onClick={onClick} aria-pressed={active} title={title}
    style={{ font: `500 ${small ? 12 : 13}px ${font}`, padding: small ? "3px 8px" : "7px 12px", borderRadius: 8, cursor: "pointer",
      color: active ? "#0c1015" : ink.text, background: active ? "#e6edf3" : "#1a222c", border: `1px solid ${active ? "#e6edf3" : "#2a3542"}` }}>{children}</button>;
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
    <span style={{ color: ink.dim, fontSize: 12, minWidth: 74, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
    {children}
  </div>;
}

export function Slider({ label, value, min, max, step = 1, onChange, format }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: ink.sub }}>
    <span style={{ minWidth: 64 }}>{label}</span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{ flex: 1, minWidth: 120 }} />
    <span style={{ fontVariantNumeric: "tabular-nums", minWidth: 48, textAlign: "right", color: ink.text }}>{format ? format(value) : value}</span>
  </label>;
}

/** 30 fps playback over integer frames: RAF only advances the counter, every frame is a pure function of its number. */
export function useFramePlayer(durationFrames: number, options: { loop?: boolean; autoplay?: boolean } = {}) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(!!options.autoplay);
  const loop = !!options.loop;
  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = performance.now(), acc = 0;
    const tick = (now: number) => {
      acc += (now - last) / (1000 / 30); last = now;
      if (acc >= 1) {
        const step = Math.floor(acc); acc -= step;
        setFrame(f => {
          const next = f + step;
          if (next < durationFrames) return next;
          if (loop) return next % durationFrames;
          setPlaying(false); return durationFrames - 1;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, durationFrames, loop]);
  return {
    frame, playing,
    seek(f: number) { setPlaying(false); setFrame(Math.max(0, Math.min(durationFrames - 1, Math.round(f)))); },
    resume() { setFrame(f => (f >= durationFrames - 1 ? 0 : f)); setPlaying(true); },
    pause() { setPlaying(false); },
    restart() { setFrame(0); setPlaying(true); },
  };
}
