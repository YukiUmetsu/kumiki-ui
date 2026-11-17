/**
 * React pieces for ANAT1 portraits: `FacePortrait` (a rendered portrait in a canvas), `GoldenRatioTable` (the ratios
 * people check, against φ and against Pallett's average-face ratios) and `BeautyEvidence` (the findings applied).
 *
 * Portraits render on the CPU in workers (see `foundation-render.ts`), cached, so a page of them stays responsive.
 */
import { forwardRef } from "react";
import type { CanvasHTMLAttributes, CSSProperties } from "react";
import type { Portrait, PortraitOptions } from "./face-portrait";
import { ANATOMY_RENDER_POOL } from "./anatomy-render-pool";
import type { RenderOutput } from "./foundation-render";
import { RenderFrame } from "./foundation-render-react";
import { BEAUTY_EVIDENCE, GOLDEN_RATIO, beautifulFace } from "./face-beauty";
import type { BeautyOptions } from "./face-beauty";
import { sheetList, sheetSmall } from "./foundation-react";

export interface FacePortraitProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "width" | "height"> {
  options: PortraitOptions;
  label: string;
  /** Called with each finished render (its time, and the groomed hair: strand count, groom time). */
  onRendered?: (portrait: Portrait) => void;
}

/** A quicker portrait of the same face for a first look: half size, one sample a pixel, fewer strands. */
export const portraitPreview = (o: PortraitOptions): PortraitOptions => {
  const W = o.width ?? 384, H = o.height ?? 480;
  return { ...o, width: Math.max(64, Math.round(W / 2)), height: Math.max(80, Math.round(H / 2)), supersample: 1, hairStrands: Math.round(Math.min(o.hairStrands ?? 40000, 9000)) };
};

/**
 * A portrait rendered from the measured, attractiveness-calibrated face (see `renderPortrait`), in a worker, cached,
 * with a quick preview first and a visible "Rendering…" state while it works.
 */
export const FacePortrait = forwardRef<HTMLCanvasElement, FacePortraitProps>(function FacePortrait({ options, label, onRendered, ...rest }, ref) {
  const W = options.width ?? 384, H = options.height ?? 480;
  // the hair is groomed once per worker for the same hair and head: send those jobs to the same worker
  const affinity = JSON.stringify([options.sex, options.faceType, options.faceVariant, options.hairStyle, options.fringe, options.parting, options.hairStrands, options.hairLength, options.hairCurl, options.seed]);
  return <RenderFrame ref={ref} width={W} height={H} label={label} placeholder="var(--km-surface-subtle, #e8e4df)"
    job={{ pool: ANATOMY_RENDER_POOL, kind: "portrait", args: options, affinity }}
    preview={{ pool: ANATOMY_RENDER_POOL, kind: "portrait", args: portraitPreview(options), affinity }}
    onResult={onRendered ? r => onRendered(toPortrait(r)) : undefined} {...rest} />;
});

/** A finished render as a `Portrait` (the face, landmarks and hair counts travel in `meta`). */
function toPortrait(r: RenderOutput): Portrait {
  const m = (r.meta ?? {}) as { face: Portrait["face"]; landmarks: Portrait["landmarks"]; strands?: number; groomMs?: number };
  return { width: r.width, height: r.height, rgba: r.rgba, ms: r.ms, face: m.face, landmarks: m.landmarks, stats: { strands: m.strands ?? 0, groomMs: m.groomMs ?? 0 } };
}

const cell: CSSProperties = { padding: "4px 8px", borderBottom: "1px solid var(--km-border-subtle, #e2deda)", textAlign: "left", verticalAlign: "top" };

/** The golden-ratio checks for a face, beside Pallett's average-face ratios, with what the research found. */
export function GoldenRatioTable({ face = {} }: { face?: BeautyOptions }) {
  const f = beautifulFace(face);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ overflowX: "auto" }} tabIndex={0} aria-label="Facial ratios against the golden ratio and the average face">
        <table style={{ borderCollapse: "collapse", minWidth: 520, width: "100%", font: "13px/1.45 var(--km-font-sans, system-ui, sans-serif)" }}>
          <thead><tr><th style={cell}>Ratio</th><th style={cell}>This face</th><th style={cell}>Target claimed</th><th style={cell}>Source</th></tr></thead>
          <tbody>{f.report.map(r => <tr key={r.id}><td style={cell}>{r.label}</td><td style={cell}>{r.value.toFixed(3)}</td><td style={cell}>{r.target.toFixed(3)} · {r.targetLabel}</td><td style={cell}>{r.source}</td></tr>)}</tbody>
        </table>
      </div>
      <p style={{ ...sheetSmall, margin: 0 }}><b>Claim.</b> {GOLDEN_RATIO.claim.text} ({GOLDEN_RATIO.claim.by}; <a href={GOLDEN_RATIO.claim.url}>{GOLDEN_RATIO.claim.source}</a>)</p>
      <ul style={{ ...sheetList, ...sheetSmall }}>{GOLDEN_RATIO.findings.map(x => <li key={x.url}>{x.text} (<a href={x.url}>{x.source}</a>)</li>)}</ul>
      <p style={{ ...sheetSmall, margin: 0 }}>{GOLDEN_RATIO.verdict}</p>
    </div>
  );
}

/** The attractiveness findings the beautiful face applies, each with its source and grade. */
export function BeautyEvidence() {
  return <ul style={{ ...sheetList, ...sheetSmall }}>{BEAUTY_EVIDENCE.map(e => <li key={e.id}><b>{e.id}</b> ({e.grade}): {e.finding} {e.url ? <a href={e.url}>{e.source}</a> : e.source}</li>)}</ul>;
}
