/**
 * MAKEUP1 React pieces:
 *   MakeupPortrait     an ANAT1 portrait wearing a look (designed for its skin, eyes, hair and face shape)
 *   FaceChart          a makeup artist's face chart: the face from the front, each zone's outline, placement guides
 *   MakeupSwatches     a plan's colours; MakeupChecks its placement and colour checks
 *   UndertonePlane     skin colours on the CIELAB a*-b* plane with the undertone split
 *   LearnedEffects, BeautyCorrelations, MakeupEvidenceList   what the data and the studies say
 */
import { forwardRef, useId, useMemo } from "react";
import type { CSSProperties } from "react";
import type { Vec3 } from "./anatomy-body";
import { MONK_SKIN_TONES } from "./anatomy-color";
import { FACE_FEATURES, FACE_LANDMARKS } from "./anatomy-face";
import { beautifulFace } from "./face-beauty";
import type { PortraitOptions } from "./face-portrait";
import { FacePortrait } from "./face-portrait-react";
import { sheetList, sheetSmall, SwatchList } from "./foundation-react";
import { readSkin, UNDERTONE_REF } from "./makeup-color";
import { MAKEUP_EVIDENCE, MAKEUP_LEARNED } from "./makeup-data";
import { checkMakeup, designMakeup, planSwatches } from "./makeup-design";
import type { DesignOptions, MakeupPlan } from "./makeup-design";
import { makeupPortraitOptions } from "./makeup-paint";
import { findZone, MAKEUP_ATLAS, zoneOutline } from "./makeup-zones";
import type { ProductId, ZoneAdjust } from "./makeup-zones";

/** One colour per product for charts (chart ink, not the product's real colour). */
export const PRODUCT_CHART_COLOURS: Record<ProductId, string> = {
  foundation: "#c9a27e", concealer: "#7fbf7a", corrector: "#97c46b", contour: "#5a5fb8", bronzer: "#b9772e", highlight: "#d9b52a", blush: "#d0548f", eyeshadow: "#3f9aa6",
  liner: "#262626", brow: "#7a4a24", lipstick: "#c8323c", "lip-liner": "#8e1f2a", gloss: "#e8a0b0", powder: "#b8b0a8",
};

export interface MakeupPortraitProps {
  /** Portrait options (sex, skin, eyes, hair, expression, light...). */
  portrait: PortraitOptions;
  /** The look and design choices; skin, face and eyes default to the portrait's. */
  design?: Omit<DesignOptions, "face">;
  /** A ready plan instead of a design (it must be designed for this portrait's skin). */
  plan?: MakeupPlan;
  label: string;
  style?: CSSProperties;
}

/**
 * An ANAT1 portrait wearing a look and no other makeup: the renderer's own makeup is off unless `portrait.makeup` asks
 * for it. Re-renders when the portrait, the design or the plan changes.
 */
export const MakeupPortrait = forwardRef<HTMLCanvasElement, MakeupPortraitProps>(function MakeupPortrait({ portrait, design, plan, label, style }, ref) {
  const planKey = JSON.stringify([portrait, design, plan]);
  const designed = useMemo(() => {
    if (plan) return plan;
    const face = beautifulFace(portrait);
    const eyeShape = typeof portrait.eyeShape === "string" ? portrait.eyeShape : portrait.eyeShape?.id;
    return designMakeup({ skin: portrait.skin ?? "#d8a98a", eyes: portrait.eyes ?? "brown", eyeShape, hair: portrait.hair, ...design, face: face.vertices });
  }, [planKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const options = useMemo(() => (designed.layers.length || designed.eyes.lens || designed.eyes.tape ? makeupPortraitOptions(portrait, designed) : { makeup: "none" as const, ...portrait }), [designed]); // eslint-disable-line react-hooks/exhaustive-deps
  return <FacePortrait ref={ref} options={options} label={label} style={style} />;
});

// ---- Face chart ---------------------------------------------------------------------------------------------------------

export interface FaceChartProps {
  /** A rest-frame face: ANAT1's `beautifulFace(...).vertices`, or a photo's `restFrame(landmarks).rest`. */
  face: readonly Vec3[];
  /** The plan whose zones to draw, with their adjustments (default: every zone of the atlas). */
  plan?: MakeupPlan;
  title: string;
  style?: CSSProperties;
}

/**
 * A face chart with the brow map and facial thirds as dashed guides. Labels never sit on the face: zones carry
 * numbers that the legend below names, so the chart stays legible at any size and in any language.
 */
export function FaceChart({ face: V, plan, title, style }: FaceChartProps) {
  const list: { zone: string; adjust?: ZoneAdjust }[] = plan?.layers.map(l => ({ zone: l.zone, adjust: l.adjust })) ?? MAKEUP_ATLAS.zones.filter(z => z.id !== "foundation").map(z => ({ zone: z.id }));
  const drawn = useMemo(() => list.filter(z => z.zone !== "foundation").map(z => ({ ...z, lines: zoneOutline(z.zone, V, { adjust: z.adjust, step: 0.8 }) })), [V, JSON.stringify(list)]); // eslint-disable-line react-hooks/exhaustive-deps
  const xs = V.map(p => p[0]), ys = V.map(p => p[1]);
  const pad = 12, x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad + 8;
  const P = (x: number, y: number) => `${(x - x0).toFixed(2)},${(y1 - y).toFixed(2)}`;
  // an id usable inside url(#...): React's ids carry characters that SVG references do not accept
  const id = `fc${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const L = (k: keyof typeof FACE_LANDMARKS) => V[FACE_LANDMARKS[k]];
  // guides: the brow map (head over the inner canthus, peak and tail on lines from the nose wing) and the thirds
  const guideLines: [number, number, number, number, string][] = [];
  for (const [al, en, ex] of [["alare.R", "endocanthion.R", "exocanthion.R"], ["alare.L", "endocanthion.L", "exocanthion.L"]] as const) {
    const a = L(al), e = L(en), x = L(ex), lim = [e[0] + (x[0] - e[0]) * 0.71, e[1] + (x[1] - e[1]) * 0.71];
    const far = (p: number[], k: number) => [a[0] + (p[0] - a[0]) * k, a[1] + (p[1] - a[1]) * k];
    const top = L("brow-mid.R")[1] + 12;
    guideLines.push([e[0], a[1], e[0], top, "brow head: above the inner canthus"]);
    const kl = (top - a[1]) / (lim[1] - a[1]), kx = (top - a[1]) / (x[1] - a[1]);
    guideLines.push([a[0], a[1], ...far(lim, kl), "peak: nose wing through the lateral limbus"] as [number, number, number, number, string]);
    guideLines.push([a[0], a[1], ...far(x, kx), "tail: nose wing through the outer canthus"] as [number, number, number, number, string]);
  }
  for (const k of ["glabella", "subnasale", "menton"] as const) guideLines.push([x0 + pad * 0.5, L(k)[1], x1 - pad * 0.5, L(k)[1], `thirds: ${k}`]);
  // Number each zone once, on its part on the chart's left (the face's right), and nudge numbers apart so none
  // overlaps another: the chart's text must stay legible.
  const markers = useMemo(() => {
    const placed: [number, number][] = [], R = 3.2;
    return drawn.map(z => {
      const lines = z.lines.filter(l => l.reduce((s, p) => s + p[0], 0) / l.length <= 0.5);
      const pts = (lines.length ? lines : z.lines).flat();
      if (!pts.length) return null;
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      for (let ring = 0; ring < 8; ring++) for (let k = 0; k < Math.max(1, ring * 6); k++) {
        const a = (k / Math.max(1, ring * 6)) * Math.PI * 2, x = cx + Math.cos(a) * ring * R * 1.1, y = cy + Math.sin(a) * ring * R * 1.1;
        if (placed.every(([px, py]) => Math.hypot(px - x, py - y) >= 2 * R)) { placed.push([x, y]); return [x, y] as [number, number]; }
      }
      placed.push([cx, cy]);
      return [cx, cy] as [number, number];
    });
  }, [drawn]);
  return (
    <figure style={{ margin: 0, display: "grid", gap: 8, ...style }}>
      <svg viewBox={`0 0 ${(x1 - x0).toFixed(1)} ${(y1 - y0).toFixed(1)}`} role="img" aria-labelledby={`${id}-t`} style={{ width: "100%", height: "auto", background: "var(--km-surface-subtle, #f4eee3)", borderRadius: 8 }}>
        <title id={`${id}-t`}>{title}</title>
        <clipPath id={`${id}-face`}><polygon points={FACE_FEATURES.oval.loop.map(i => P(V[i][0], V[i][1])).join(" ")} /></clipPath>
        <g clipPath={`url(#${id}-face)`}>{drawn.map((z, k) => { const prod = findZone(z.zone).product, col = PRODUCT_CHART_COLOURS[prod];
          return <g key={`${z.zone}-${k}`}>{z.lines.map((ln, j) => <polygon key={j} points={ln.map(([x, y]) => P(x, y)).join(" ")} fill={col} fillOpacity={0.28} stroke={col} strokeWidth={0.45} />)}</g>; })}</g>
        {Object.entries(FACE_FEATURES).map(([fid, f]) => <polyline key={fid} points={(f.closed ? [...f.loop, f.loop[0]] : f.loop).map(i => P(V[i][0], V[i][1])).join(" ")} fill="none" stroke="var(--km-text-primary, #2a211d)" strokeWidth={0.55} strokeLinejoin="round" />)}
        {guideLines.map(([ax, ay, bx, by, t], k) => <line key={k} x1={(ax - x0).toFixed(2)} y1={(y1 - ay).toFixed(2)} x2={(bx - x0).toFixed(2)} y2={(y1 - by).toFixed(2)} stroke="var(--km-text-muted, #5b524b)" strokeWidth={0.35} strokeDasharray="1.6 1.2"><title>{t}</title></line>)}
        {markers.map((m, k) => m ? <g key={`n${k}`}><circle cx={(m[0] - x0).toFixed(2)} cy={(y1 - m[1]).toFixed(2)} r={2.9} fill="var(--km-surface-raised, #fff)" stroke="#2a211d" strokeWidth={0.3} />
          <text x={(m[0] - x0).toFixed(2)} y={(y1 - m[1] + 1.15).toFixed(2)} fontSize={3.2} textAnchor="middle" fontFamily="system-ui, sans-serif" fill="#2a211d">{k + 1}</text></g> : null)}
      </svg>
      <ol style={{ ...sheetList, ...sheetSmall, columns: "2 16rem", columnGap: 24 }}>
        {drawn.map((z, k) => { const spec = findZone(z.zone); return <li key={`l${k}`} style={{ breakInside: "avoid", marginBottom: 4 }}>
          <span aria-hidden style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: PRODUCT_CHART_COLOURS[spec.product], marginRight: 6, verticalAlign: "-1px" }} />
          <b>{spec.label}.</b> {spec.note}</li>; })}
      </ol>
    </figure>
  );
}

// ---- Plan readouts ------------------------------------------------------------------------------------------------------

export function MakeupSwatches({ plan }: { plan: MakeupPlan }) {
  return <SwatchList items={planSwatches(plan).map(s => ({ name: s.label, hex: s.hex, note: s.why }))} />;
}

export function MakeupChecks({ plan, face }: { plan: MakeupPlan; face: readonly Vec3[] }) {
  const checks = useMemo(() => checkMakeup(plan, face), [plan, face]);
  return <ul style={{ ...sheetList, ...sheetSmall, listStyle: "none", paddingLeft: 0, display: "grid", gap: 4 }}>
    {checks.map(c => <li key={c.id}><b style={{ color: c.ok ? "var(--km-status-success, #2f7d4f)" : "var(--km-status-warning, #a05a00)" }}>{c.ok ? "Pass" : "Check"}</b> · {c.message} <span style={{ opacity: 0.8 }}>({c.rule})</span></li>)}
  </ul>;
}

// ---- Colour ----------------------------------------------------------------------------------------------------------

/** Skin colours on the a*-b* plane: the undertone split (terciles of measured cheek hue), Xiao et al.'s group means,
 * the Monk Skin Tone swatches, and an optional skin. */
export function UndertonePlane({ skin }: { skin?: string }) {
  const title = "Skin colours on the CIELAB a*-b* plane";
  const W = 320, H = 260, ax = (a: number) => 30 + (a / 30) * (W - 50), by = (b: number) => H - 30 - (b / 35) * (H - 50);
  const groups = [{ n: "Caucasian", a: 11.8, b: 14.6 }, { n: "Chinese", a: 11.4, b: 14.2 }, { n: "Kurdish", a: 11.7, b: 15.8 }, { n: "Thai", a: 10.5, b: 17.2 }];
  const ray = (deg: number) => { const r = (deg * Math.PI) / 180; return [ax(0), by(0), ax(28 * Math.cos(r)), by(28 * Math.sin(r))]; };
  const s = skin ? readSkin(skin) : undefined;
  return (
    <figure style={{ margin: 0, display: "grid", gap: 6 }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} style={{ width: "100%", maxWidth: 420, height: "auto", background: "var(--km-surface-subtle, #f4eee3)", borderRadius: 8 }}>
        <title>{title}</title>
        <line x1={ax(0)} y1={by(0)} x2={ax(30)} y2={by(0)} stroke="#777" strokeWidth={0.8} /><line x1={ax(0)} y1={by(0)} x2={ax(0)} y2={by(35)} stroke="#777" strokeWidth={0.8} />
        <text x={ax(30) - 2} y={by(0) + 14} fontSize={10} textAnchor="end" fill="currentColor">a* (redness)</text>
        <text x={ax(0) + 4} y={by(35) + 10} fontSize={10} fill="currentColor">b* (yellowness)</text>
        {[UNDERTONE_REF.coolBelow, UNDERTONE_REF.warmAbove].map(d => { const [x1, y1, x2, y2] = ray(d); return <line key={d} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#555" strokeDasharray="4 3" strokeWidth={0.9} />; })}
        <text x={ax(26)} y={by(14)} fontSize={10} fill="currentColor">cool</text><text x={ax(20)} y={by(26)} fontSize={10} fill="currentColor">neutral</text><text x={ax(9)} y={by(31)} fontSize={10} fill="currentColor">warm</text>
        {MONK_SKIN_TONES.map(t => <circle key={t.id} cx={ax(t.lab[1])} cy={by(t.lab[2])} r={6} fill={t.hex} stroke="#333" strokeWidth={0.6}><title>{`${t.id}: a* ${t.lab[1].toFixed(1)}, b* ${t.lab[2].toFixed(1)}`}</title></circle>)}
        {groups.map(g => <g key={g.n}><rect x={ax(g.a) - 3} y={by(g.b) - 3} width={6} height={6} fill="none" stroke="#111" strokeWidth={1} /><title>{`${g.n} cheek mean (Xiao et al. 2017)`}</title></g>)}
        {s ? <circle cx={ax(s.lab[1])} cy={by(s.lab[2])} r={8} fill={s.hex} stroke="#000" strokeWidth={2}><title>{`This skin: hue ${s.hue.toFixed(1)} deg, ${s.undertone}`}</title></circle> : null}
      </svg>
      <figcaption style={sheetSmall}>Dashed rays at {UNDERTONE_REF.coolBelow} and {UNDERTONE_REF.warmAbove} degrees split cool, neutral and warm (terciles of measured cheek hue, mean {UNDERTONE_REF.hueMean} ± {UNDERTONE_REF.hueSd}). Squares: cheek means of four populations (Xiao et al. 2017). Circles: Monk Skin Tone swatches{s ? "; the ringed circle is this skin" : ""}. The split is an estimate (grade E).</figcaption>
    </figure>
  );
}

// ---- Data and evidence ---------------------------------------------------------------------------------------------------

const cell: CSSProperties = { padding: "4px 8px", borderBottom: "1px solid var(--km-border-subtle, #e2deda)", textAlign: "left", verticalAlign: "top" };
const tableStyle: CSSProperties = { borderCollapse: "collapse", minWidth: 520, width: "100%", font: "13px/1.45 var(--km-font-sans, system-ui, sans-serif)" };

/** The makeup the learned references wore, per zone: median and quartiles of the change against bare skin. */
export function LearnedEffects() {
  const rows = Object.entries(MAKEUP_LEARNED.effects).sort((a, b) => a[1].dL.median - b[1].dL.median);
  const q = (s: { median: number; p25: number; p75: number }) => `${s.median.toFixed(1)} [${s.p25.toFixed(1)}, ${s.p75.toFixed(1)}]`;
  return <div style={{ overflowX: "auto" }} tabIndex={0} aria-label="Learned makeup effects per zone">
    <table style={tableStyle}><thead><tr><th style={cell}>Zone</th><th style={cell}>n</th><th style={cell}>dL* median [IQR]</th><th style={cell}>da*</th><th style={cell}>db*</th></tr></thead>
      <tbody>{rows.map(([z, e]) => <tr key={z}><td style={cell}>{findZone(z).label}</td><td style={cell}>{e.n}</td><td style={cell}>{q(e.dL)}</td><td style={cell}>{q(e.da)}</td><td style={cell}>{q(e.db)}</td></tr>)}</tbody></table>
  </div>;
}

/** Facial contrast of bare and made-up references, beside the published values. */
export function LearnedContrast() {
  const c = MAKEUP_LEARNED.contrast;
  return <div style={{ overflowX: "auto" }} tabIndex={0} aria-label="Facial contrast, bare and made up">
    <table style={tableStyle}><thead><tr><th style={cell}>Feature (L* contrast)</th><th style={cell}>Bare, median (n)</th><th style={cell}>Made up, median (n)</th><th style={cell}>Jones et al. 2015, women (set 1)</th></tr></thead>
      <tbody>{(["eyes", "lips", "brows"] as const).map(f => <tr key={f}><td style={cell}>{f}</td><td style={cell}>{c.bare[f].L.median.toFixed(2)} ({c.bare[f].L.n})</td><td style={cell}>{c.made_up[f].L.median.toFixed(2)} ({c.made_up[f].L.n})</td>
        <td style={cell}>{{ eyes: "0.148", lips: "0.121", brows: "0.159" }[f]}</td></tr>)}</tbody></table>
  </div>;
}

export function BeautyCorrelations({ sex }: { sex: "female" | "male" }) {
  const rows = MAKEUP_LEARNED.beauty[sex].slice(0, 8);
  return <div style={{ overflowX: "auto" }} tabIndex={0} aria-label={`Correlations with rated attractiveness (${sex} faces)`}>
    <table style={tableStyle}><thead><tr><th style={cell}>Feature</th><th style={cell}>r</th><th style={cell}>95% CI</th><th style={cell}>p</th><th style={cell}>n</th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.feature}><td style={cell}>{r.feature}</td><td style={cell}>{r.r.toFixed(2)}</td><td style={cell}>[{r.ci95[0].toFixed(2)}, {r.ci95[1].toFixed(2)}]</td><td style={cell}>{r.p.toFixed(3)}</td><td style={cell}>{r.n}</td></tr>)}</tbody></table>
  </div>;
}

export function MakeupEvidenceList() {
  return <ul style={{ ...sheetList, ...sheetSmall, display: "grid", gap: 6 }}>{MAKEUP_EVIDENCE.map(e => <li key={e.id}><b>{e.id}</b> ({e.grade}): {e.finding} <i>Applied:</i> {e.appliedAs} {e.url ? <a href={e.url}>{e.source}</a> : e.source}</li>)}</ul>;
}
