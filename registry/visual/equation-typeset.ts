/** EQ1: optional MathJax SVG typesetting adapter for equations with stable term identities.
 * MathJax is injected, never imported: the caller passes a MathJax 4 instance (Node or browser component), so
 * consumers who do not typeset equations install nothing. Term identity is carried by MathJax's `\cssId` groups.
 * Term positions come from MathJax's own layout tree, so this module has no DOM or measurement dependency.
 * MathJax numbers its SVG `<defs>` per call (`MJX-1-…`, `MJX-2-…`): compare outputs with those counters normalised.
 * Browser-measured bounds are an optional refinement (`measureTermBounds`). Movement reuses `shared-element`.
 * No algebra is checked here: equivalence and sourced values are the caller's responsibility.
 */
import { evaluateEasing } from "../motion/easing";
import { evaluateSharedElement, type SharedElementSpec } from "../motion/shared-element";
import type { AffineMatrix, FrameRange } from "../motion/types";

export interface EquationDiagnostic {
  code: string;
  severity: "error" | "warning";
  message: string;
  termId?: string;
}

export interface EquationTerm {
  /** Stable identity across steps. Letters, digits, `_` and `-`, starting with a letter. */
  id: string;
  /** LaTeX for this term only. Spacing between terms is the caller's choice (e.g. `\\,` or a separate operator term). */
  tex: string;
}

export interface MathJaxAdaptorLike {
  kind(node: unknown): string;
  childNodes(node: unknown): unknown[];
  getAttribute(node: unknown, name: string): string | null;
  serializeXML(node: unknown): string;
}

/** The subset of a MathJax 4 instance this adapter uses. Satisfied by `import MathJax from "mathjax"` after `init`. */
export interface MathJaxLike {
  tex2svgPromise(tex: string, options?: { display?: boolean }): Promise<unknown>;
  startup: { adaptor: MathJaxAdaptorLike };
}

/** A term's position in the equation's SVG coordinate system (MathJax units, 1000 per em, y down). */
export interface EquationTermLayout {
  id: string;
  x: number;
  y: number;
  /** Advance to the next term on the baseline, or to the right edge for the last term. Estimated, not ink. */
  width: number;
}

export interface TypesetEquation {
  ok: boolean;
  svg: string;
  viewBox: { x: number; y: number; width: number; height: number };
  terms: EquationTermLayout[];
  diagnostics: EquationDiagnostic[];
}

export const TERM_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

/** Builds the LaTeX for a sequence of identified terms. Identities are validated before any LaTeX is produced. */
export function equationTex(terms: readonly EquationTerm[]): string {
  return terms.map(term => `\\cssId{${term.id}}{${term.tex}}`).join("");
}

function validateTerms(terms: readonly EquationTerm[]): EquationDiagnostic[] {
  const out: EquationDiagnostic[] = [];
  const seen = new Set<string>();
  for (const term of terms) {
    if (!TERM_ID_PATTERN.test(term.id)) out.push({ code: "term-id-invalid", severity: "error", termId: term.id,
      message: `Term id "${term.id}" must start with a letter and use only letters, digits, "_" or "-".` });
    if (seen.has(term.id)) out.push({ code: "term-id-duplicate", severity: "error", termId: term.id,
      message: `Term id "${term.id}" appears more than once; each identity needs one term.` });
    seen.add(term.id);
    if (!term.tex.trim()) out.push({ code: "term-tex-empty", severity: "error", termId: term.id,
      message: `Term "${term.id}" has no LaTeX.` });
  }
  return out;
}

const TRANSLATE = /translate\(\s*([-+]?[\d.]+(?:e[-+]?\d+)?)[\s,]+([-+]?[\d.]+(?:e[-+]?\d+)?)\s*\)/i;
function translateOf(adaptor: MathJaxAdaptorLike, node: unknown): { x: number; y: number } {
  const transform = adaptor.getAttribute(node, "transform");
  const match = transform ? TRANSLATE.exec(transform) : null;
  return match ? { x: Number(match[1]), y: Number(match[2]) } : { x: 0, y: 0 };
}

/** Walks MathJax's layout tree once, accumulating `translate` offsets so nested term groups get absolute positions. */
function collectPositions(adaptor: MathJaxAdaptorLike, node: unknown, ids: ReadonlySet<string>,
  originX: number, originY: number, out: Map<string, { x: number; y: number }>): void {
  const offset = translateOf(adaptor, node);
  const x = originX + offset.x, y = originY + offset.y;
  const id = adaptor.getAttribute(node, "id");
  if (id && ids.has(id) && !out.has(id)) out.set(id, { x, y });
  for (const child of adaptor.childNodes(node)) {
    if (adaptor.kind(child) !== "#text") collectPositions(adaptor, child, ids, x, y, out);
  }
}

function parseViewBox(raw: string | null): { x: number; y: number; width: number; height: number } | null {
  const parts = raw?.trim().split(/[\s,]+/).map(Number) ?? [];
  if (parts.length !== 4 || parts.some(v => !Number.isFinite(v)) || parts[2] <= 0 || parts[3] <= 0) return null;
  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
}

/** Typesets identified terms with MathJax and returns the SVG plus each term's position. Never throws for bad input. */
export async function typesetEquation(mathjax: MathJaxLike, terms: readonly EquationTerm[],
  options: { display?: boolean } = {}): Promise<TypesetEquation> {
  const diagnostics = validateTerms(terms);
  const empty = { x: 0, y: 0, width: 1, height: 1 };
  if (diagnostics.some(d => d.severity === "error") || terms.length === 0) {
    if (terms.length === 0) diagnostics.push({ code: "equation-empty", severity: "error", message: "An equation needs at least one term." });
    return { ok: false, svg: "", viewBox: empty, terms: [], diagnostics };
  }
  const adaptor = mathjax.startup.adaptor;
  let container: unknown;
  try {
    container = await mathjax.tex2svgPromise(equationTex(terms), { display: options.display ?? true });
  } catch (error) {
    diagnostics.push({ code: "tex-invalid", severity: "error",
      message: `MathJax could not typeset the equation: ${error instanceof Error ? error.message : String(error)}` });
    return { ok: false, svg: "", viewBox: empty, terms: [], diagnostics };
  }
  const svgNode = adaptor.childNodes(container).find(node => adaptor.kind(node) === "svg");
  const viewBox = svgNode ? parseViewBox(adaptor.getAttribute(svgNode, "viewBox")) : null;
  if (!svgNode || !viewBox) {
    diagnostics.push({ code: "svg-missing", severity: "error", message: "MathJax did not return an SVG with a viewBox." });
    return { ok: false, svg: "", viewBox: empty, terms: [], diagnostics };
  }
  const ids = new Set(terms.map(t => t.id));
  const positions = new Map<string, { x: number; y: number }>();
  collectPositions(adaptor, svgNode, ids, 0, 0, positions);
  for (const term of terms) {
    if (!positions.has(term.id)) diagnostics.push({ code: "term-layout-missing", severity: "error", termId: term.id,
      message: `MathJax produced no group for term "${term.id}"; check that its LaTeX is not empty or hidden.` });
  }
  const sorted = [...positions.entries()].map(([id, p]) => ({ id, ...p })).sort((a, b) => a.x - b.x || a.y - b.y);
  const right = viewBox.x + viewBox.width;
  const layout: EquationTermLayout[] = sorted.map((p, i) => {
    const next = sorted.slice(i + 1).find(q => q.x > p.x);
    return { id: p.id, x: p.x, y: p.y, width: Math.max(0, (next ? next.x : right) - p.x) };
  });
  const ok = !diagnostics.some(d => d.severity === "error");
  return { ok, svg: adaptor.serializeXML(svgNode), viewBox, terms: layout, diagnostics };
}

/** Measures each term group's rendered box in the SVG's viewBox units. Browser only: needs a mounted `<svg>`. */
export function measureTermBounds(svg: SVGSVGElement, ids: readonly string[]): Record<string, { x: number; y: number; width: number; height: number }> {
  const box = svg.viewBox.baseVal;
  const frame = svg.getBoundingClientRect();
  const scaleX = frame.width > 0 ? box.width / frame.width : 1, scaleY = frame.height > 0 ? box.height / frame.height : 1;
  const out: Record<string, { x: number; y: number; width: number; height: number }> = {};
  for (const id of ids) {
    const element = svg.querySelector(`[id="${id}"]`);
    if (!element) continue;
    const r = element.getBoundingClientRect();
    out[id] = { x: box.x + (r.left - frame.left) * scaleX, y: box.y + (r.top - frame.top) * scaleY,
      width: r.width * scaleX, height: r.height * scaleY };
  }
  return out;
}

export interface TermTransitionOptions {
  /** Frames during which terms move from `from` to `to`. */
  handoff: FrameRange;
  /** Share of the handoff, 0 to below 1, before entering terms start to fade in. Later values keep new terms from
   * overlapping terms that are still moving. Default 0. */
  enterAfter?: number;
}

export interface CompiledTermTransition {
  /** Terms present in both equations: each moves from its old position to its new one. */
  moves: SharedElementSpec[];
  /** Terms only in the `to` equation fade in during the handoff. */
  entering: string[];
  /** Terms only in the `from` equation fade out during the handoff. */
  exiting: string[];
  /** Handoff progress at which entering terms begin to fade in. */
  enterAfter: number;
  diagnostics: EquationDiagnostic[];
}

const translation = (x: number, y: number): AffineMatrix => ({ a: 1, b: 0, c: 0, d: 1, e: x, f: y });

/** Matches term identities across two typeset steps and compiles them to `shared-element` specs. */
export function compileTermTransition(from: TypesetEquation, to: TypesetEquation, options: TermTransitionOptions): CompiledTermTransition {
  const diagnostics: EquationDiagnostic[] = [];
  const { handoff } = options;
  const enterAfter = options.enterAfter ?? 0;
  if (!(Number.isFinite(enterAfter) && enterAfter >= 0 && enterAfter < 1))
    diagnostics.push({ code: "enter-after-invalid", severity: "error", message: "enterAfter must be a number from 0 up to, not including, 1." });
  if (!Number.isSafeInteger(handoff.startFrame) || !Number.isSafeInteger(handoff.endFrame) || handoff.endFrame <= handoff.startFrame)
    diagnostics.push({ code: "handoff-invalid", severity: "error", message: "The handoff needs an integer frame range with positive length." });
  if (!from.ok || !to.ok) diagnostics.push({ code: "step-not-typeset", severity: "error", message: "Both steps must typeset without errors before terms can be matched." });
  const toById = new Map(to.terms.map(t => [t.id, t] as const));
  const fromById = new Map(from.terms.map(t => [t.id, t] as const));
  const moves: SharedElementSpec[] = [];
  for (const term of from.terms) {
    const target = toById.get(term.id);
    if (!target) continue;
    moves.push({
      semanticId: term.id,
      from: { transform: translation(term.x, term.y), range: { startFrame: 0, endFrame: handoff.startFrame } },
      to: { transform: translation(target.x, target.y), range: { startFrame: handoff.endFrame, endFrame: Number.MAX_SAFE_INTEGER } },
      handoff: { ...handoff },
      collision: "cross-fade",
    });
  }
  return {
    moves,
    entering: to.terms.filter(t => !fromById.has(t.id)).map(t => t.id),
    exiting: from.terms.filter(t => !toById.has(t.id)).map(t => t.id),
    enterAfter,
    diagnostics,
  };
}

export interface TermFrameState { id: string; x: number; y: number; opacity: number }

/** Resolves every term's position and opacity at one frame. Pure: identical frames give identical states. */
export function evaluateTermTransition(compiled: CompiledTermTransition, from: TypesetEquation, to: TypesetEquation,
  handoff: FrameRange, frame: number): TermFrameState[] {
  const states: TermFrameState[] = [];
  for (const spec of compiled.moves) {
    const sample = evaluateSharedElement(spec, frame);
    states.push({ id: spec.semanticId, x: sample.transform.e, y: sample.transform.f, opacity: 1 });
  }
  const span = handoff.endFrame - handoff.startFrame;
  const t = span > 0 ? Math.max(0, Math.min(1, (frame - handoff.startFrame) / span)) : frame >= handoff.endFrame ? 1 : 0;
  const eased = evaluateEasing("ease-in-out", t);
  for (const term of from.terms) if (compiled.exiting.includes(term.id)) {
    states.push({ id: term.id, x: term.x, y: term.y, opacity: 1 - eased });
  }
  const enterT = compiled.enterAfter < 1 ? Math.max(0, (t - compiled.enterAfter) / (1 - compiled.enterAfter)) : 1;
  const enterOpacity = evaluateEasing("ease-in-out", enterT);
  for (const term of to.terms) if (compiled.entering.includes(term.id)) {
    states.push({ id: term.id, x: term.x, y: term.y, opacity: enterOpacity });
  }
  return states;
}
