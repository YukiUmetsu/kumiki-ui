import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  compileTermTransition, equationTex, evaluateTermTransition, measureTermBounds, typesetEquation,
  type EquationTerm, type MathJaxLike, type TypesetEquation,
} from "../../registry/visual/equation-typeset";

/* Home financing, two steps. Step B adds a label and an equals sign; the terms that already existed keep their
 * identities, so the highlight travels from its old position to its new one instead of the equation redrawing.
 * No algebra is claimed: the steps only re-lay out the same symbols. */
const BEFORE: EquationTerm[] = [
  { id: "principal", tex: "P\\," }, { id: "times", tex: "\\cdot\\," }, { id: "rate", tex: "r" },
];
const AFTER: EquationTerm[] = [
  { id: "payment", tex: "\\text{Payment}\\," }, { id: "equals", tex: "=\\," },
  { id: "principal", tex: "P\\," }, { id: "times", tex: "\\cdot\\," }, { id: "rate", tex: "r" },
];
const HANDOFF = { startFrame: 30, endFrame: 90 };
const TOTAL_FRAMES = 120;
const HIGHLIGHT = "principal";

const OUTPUTS = [
  { id: "landscape", width: 1280, height: 720, max: 640 },
  { id: "portrait", width: 720, height: 1280, max: 300 },
] as const;

type MathWindow = Window & { MathJax?: MathJaxLike & { startup: MathJaxLike["startup"] & { promise: Promise<unknown> } } };

/** Loads MathJax through its component loader with only TeX input and SVG output. The one-file browser bundle
 * always fetches a speech worker from a relative URL, which fails under a bundler; the loader does not. */
let mathJaxReady: Promise<MathJaxLike> | undefined;
function loadMathJax(): Promise<MathJaxLike> {
  mathJaxReady ??= new Promise<MathJaxLike>((resolve, reject) => {
    const w = window as MathWindow;
    w.MathJax = { loader: { load: ["input/tex", "output/svg"] }, startup: { typeset: false } } as unknown as MathWindow["MathJax"];
    const script = document.createElement("script");
    script.src = "/node_modules/mathjax/startup.js";
    script.async = true;
    script.onload = () => { w.MathJax!.startup.promise.then(() => resolve(w.MathJax as unknown as MathJaxLike), reject); };
    script.onerror = () => reject(new Error("MathJax startup.js did not load"));
    document.head.appendChild(script);
  });
  return mathJaxReady;
}

const note: CSSProperties = { margin: 0, font: "400 13px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-muted, #5b6472)" };

/** Both steps are centred in one shared viewBox, so a term's identity has one coordinate system across the change. */
function sharedFrame(before: TypesetEquation, after: TypesetEquation) {
  const width = Math.max(before.viewBox.width, after.viewBox.width);
  const y = Math.min(before.viewBox.y, after.viewBox.y);
  const height = Math.max(before.viewBox.y + before.viewBox.height, after.viewBox.y + after.viewBox.height) - y;
  const offset = (eq: TypesetEquation) => (width - eq.viewBox.width) / 2 - eq.viewBox.x;
  return { x: 0, y, width, height, offset };
}

/** The same step with every term moved into the shared frame. Compiling transitions from these keeps one coordinate system. */
function inSharedFrame(eq: TypesetEquation, dx: number): TypesetEquation {
  return { ...eq, terms: eq.terms.map(t => ({ ...t, x: t.x + dx })) };
}

/** One drawing, the final step. Matched term groups move by their frame state; entering terms fade in. Nothing is
 * cross-faded, so a matched glyph never appears twice. Positions come only from `evaluateTermTransition`. */
function EquationFigure({ before, after, output, frame }: {
  before: TypesetEquation; after: TypesetEquation; output: (typeof OUTPUTS)[number]; frame: number;
}) {
  const groupsRef = useRef<SVGGElement | null>(null);
  const [measured, setMeasured] = useState<{ x: number; width: number } | undefined>();
  const box = useMemo(() => sharedFrame(before, after), [before, after]);
  const beforeOffset = box.offset(before), afterOffset = box.offset(after);
  const shiftedBefore = useMemo(() => inSharedFrame(before, beforeOffset), [before, beforeOffset]);
  const shiftedAfter = useMemo(() => inSharedFrame(after, afterOffset), [after, afterOffset]);
  const compiled = useMemo(() => compileTermTransition(shiftedBefore, shiftedAfter, { handoff: HANDOFF, enterAfter: 0.6 }), [shiftedBefore, shiftedAfter]);
  const states = evaluateTermTransition(compiled, shiftedBefore, shiftedAfter, HANDOFF, frame);
  const highlight = states.find(s => s.id === HIGHLIGHT);
  const width = after.terms.find(t => t.id === HIGHLIGHT)?.width ?? 0;
  const inner = useMemo(() => after.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, ""), [after.svg]);
  // Apply the frame state to the drawn groups. This runs only when the frame or the typeset output changes.
  useLayoutEffect(() => {
    const root = groupsRef.current;
    if (!root) return;
    for (const state of states) {
      const group = root.querySelector(`[id="${state.id}"]`);
      if (!group) continue;
      const term = after.terms.find(t => t.id === state.id);
      if (!term) continue;
      group.setAttribute("transform", `translate(${state.x - afterOffset}, ${state.y})`);
      group.setAttribute("opacity", String(state.opacity));
    }
  }, [states, afterOffset, after]);
  // Re-measure after each frame's update. The functional update keeps an unchanged value from re-rendering.
  useEffect(() => {
    const svg = groupsRef.current?.ownerSVGElement;
    if (!svg) return;
    const b = measureTermBounds(svg, [HIGHLIGHT])[HIGHLIGHT];
    setMeasured(prev => {
      if (!b) return undefined;
      return prev && prev.x === b.x && prev.width === b.width ? prev : { x: b.x, width: b.width };
    });
  }, [frame, after, output.id]);
  return <figure style={{ margin: 0, display: "grid", gap: 6, width: "100%", maxWidth: output.max }}>
    <div style={{ position: "relative", width: "100%", aspectRatio: `${output.width} / ${output.height}`, borderRadius: 12,
      background: "var(--km-surface, #ffffff)", border: "1px solid var(--km-rule, #d5dbe3)", display: "grid", placeItems: "center", overflow: "hidden" }}>
      <div style={{ position: "relative", width: "88%", aspectRatio: `${box.width} / ${box.height}` }}>
        <svg viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`} role="img"
          aria-label="Home financing: Payment = P times r, with the principal term highlighted"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
          {highlight ? <rect x={highlight.x - 10} y={box.y + box.height * .08} width={width + 20} height={box.height * .84}
            rx={box.height * .12} fill="var(--km-accent, #2f5f8a)" opacity={0.18 * highlight.opacity} /> : null}
          <g ref={groupsRef} transform={`translate(${afterOffset}, 0)`} dangerouslySetInnerHTML={{ __html: inner }} />
        </svg>
      </div>
    </div>
    <figcaption style={note}>{output.width}×{output.height} · frame {frame} · {HIGHLIGHT} x={highlight ? highlight.x.toFixed(0) : "–"}
      {measured ? ` · browser x=${measured.x.toFixed(0)}, w=${measured.width.toFixed(0)}` : ""}</figcaption>
  </figure>;
}

function MathStep({ label, eq }: { label: string; eq: TypesetEquation | undefined }) {
  return <p style={{ ...note, fontFamily: "var(--km-font-mono, ui-monospace, monospace)" }}>{label}: {eq ? (eq.ok ? "typeset" : eq.diagnostics.map(d => d.message).join(" ")) : "loading"}</p>;
}

function EquationTypesetDemo() {
  const [mj, setMj] = useState<MathJaxLike | undefined>();
  const [steps, setSteps] = useState<{ before?: TypesetEquation; after?: TypesetEquation }>({});
  const [frame, setFrame] = useState(0);
  const [error, setError] = useState<string | undefined>();
  useEffect(() => {
    let live = true;
    loadMathJax().then(m => { if (live) setMj(m); }, e => { if (live) setError(String(e)); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (!mj) return;
    let live = true;
    (async () => {
      const before = await typesetEquation(mj, BEFORE);
      const after = await typesetEquation(mj, AFTER);
      if (live) setSteps({ before, after });
    })();
    return () => { live = false; };
  }, [mj]);
  const { before, after } = steps;
  return <section style={{ padding: 20, display: "grid", gap: 16, background: "var(--km-surface-canvas, #f6f7f9)", color: "var(--km-text-primary, #1f2937)" }}>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <input aria-label="Frame" type="range" min={0} max={TOTAL_FRAMES - 1} value={frame} onChange={e => setFrame(Number(e.target.value))} style={{ flex: "1 1 260px" }} />
      <span style={{ fontFamily: "var(--km-font-mono, ui-monospace, monospace)" }}>frame {frame}</span>
    </div>
    {error ? <p style={{ ...note, color: "var(--km-text-danger, #b91c1c)" }}>MathJax failed to load: {error}</p> : null}
    <MathStep label="Step A" eq={before} />
    <MathStep label="Step B" eq={after} />
    {before && after && before.ok && after.ok ? <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
      {OUTPUTS.map(o => <EquationFigure key={o.id} before={before} after={after} output={o} frame={frame} />)}
    </div> : null}
    <p style={note}>Source: {equationTex(AFTER)}</p>
  </section>;
}

const meta = { title: "Visual/Equation Typeset", component: EquationTypesetDemo, parameters: { layout: "fullscreen" } } satisfies Meta<typeof EquationTypesetDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Walkthrough: Story = {};
