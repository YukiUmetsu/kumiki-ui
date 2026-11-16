/**
 * Shared pieces of the art-foundation sheets (ANIM1 animals, FLORA1 plants): the card, text styles, a swatch list and
 * a to-scale chart beside a person. All text is HTML; colours come from the library tokens (`--km-*`) and
 * `--kumiki-animal-ink`, `--kumiki-animal-accent`, `--kumiki-animal-paper`, so themes and dark mode restyle them.
 */
import type { CSSProperties, ReactNode } from "react";
import { SCALE_PERSON, personOutline, smoothClosedPath } from "./foundation-shapes";
import type { FPoint } from "./foundation-shapes";

export const INK = "var(--kumiki-animal-ink, var(--km-text-primary, #2a211d))";
export const ACCENT = "var(--kumiki-animal-accent, #c2413a)";
export const PAPER = "var(--kumiki-animal-paper, var(--km-surface-subtle, #f4eee3))";
export const MUTED = "var(--km-text-muted, #5b524b)";

export const sheetCard: CSSProperties = { display: "grid", gap: "var(--km-space-1, 8px)", alignContent: "start", padding: "var(--km-space-2, 16px)", minWidth: 0,
  background: "var(--km-surface-default, #fff)", border: "1px solid var(--km-border-subtle, #cecac8)", borderRadius: "var(--km-radius-lg, 10px)" };
export const sheetH3: CSSProperties = { margin: 0, font: "600 15px/1.3 var(--km-font-sans, system-ui, sans-serif)" };
export const sheetSmall: CSSProperties = { font: "13px/1.45 var(--km-font-sans, system-ui, sans-serif)", color: "var(--km-text-muted, #4e4d4d)" };
export const sheetGrid: CSSProperties = { display: "grid", gap: "var(--km-space-2, 16px)", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
  color: "var(--km-text-primary, #242424)", font: "14px/1.5 var(--km-font-sans, system-ui, sans-serif)" };
export const sheetList: CSSProperties = { margin: 0, paddingLeft: 18 };

export function SheetCard({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  return <section style={{ ...sheetCard, gridColumn: wide ? "1 / -1" : undefined }}><h3 style={sheetH3}>{title}</h3>{children}</section>;
}

export function SwatchList({ items }: { items: readonly { name: string; hex: string; note?: string }[] }) {
  return (
    <ul style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: 0, padding: 0, listStyle: "none" }}>
      {items.map(p => <li key={p.name + p.hex + (p.note ?? "")} style={{ display: "flex", alignItems: "center", gap: 6, ...sheetSmall }}>
        <span aria-hidden style={{ width: 18, height: 18, borderRadius: 4, background: p.hex, border: "1px solid var(--km-border-strong, #797776)", flex: "none" }} />
        <span>{p.name}{p.note ? <span style={{ opacity: .8 }}> · {p.note}</span> : null}</span>
      </li>)}
    </ul>
  );
}

/**
 * A subject drawn to scale beside ANAT1's person: `subject` is path data in the subject's own units (y up, ground 0),
 * `bounds` its extent, `metresPerUnit` the scale.
 */
export function ScaleChart({ subject, bounds, metresPerUnit, label, caption }: { subject: string; bounds: readonly [number, number, number, number]; metresPerUnit: number; label: string; caption: ReactNode }) {
  const person = personOutline(), pw2 = Math.max(...person.map(p => p[0])), k = metresPerUnit;
  const aw = (bounds[2] - bounds[0]) * k, top = Math.max(SCALE_PERSON.stature, bounds[3] * k) + .08, W = pw2 * 2 + .5 + aw + .1, ax = pw2 * 2 + .35 - bounds[0] * k;
  return (
    <>
      <svg role="img" aria-label={label} viewBox={`0 ${-top} ${W} ${top + .04}`} style={{ display: "block", width: "100%", height: "auto" }}>
        <g transform="scale(1 -1)">
          <line x1={0} x2={W} y1={0} y2={0} stroke={MUTED} strokeWidth={W / 300} />
          <path d={smoothClosedPath(person.map(p => [p[0] + pw2 + .05, p[1]] as FPoint))} fill={MUTED} opacity=".55" />
          <g transform={`translate(${ax} 0) scale(${k})`}><path d={subject} fill={INK} /></g>
        </g>
      </svg>
      <p style={{ ...sheetSmall, margin: 0 }}>Person: ANAT1 man, 25 y, {SCALE_PERSON.stature.toFixed(2)} m (outlined through its measured landmarks). {caption}</p>
    </>
  );
}
