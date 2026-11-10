/** The quiz card's picture, and the film card built on it.
 *
 * `QuizCardView` draws one moment of a quiz: a question, two to four lettered options and, once the answer is shown, the right option
 * filled and ticked, a wrong pick crossed and stepped back, and one line of why. `QuizCard` is that view as a pure function of a film
 * frame; the interactive `Quiz` (quiz.tsx) is the same view driven by what a learner does.
 *
 * Right and wrong are never colour alone: the badge changes from a letter to a tick or a cross, the right option fills, and a status
 * line for screen readers says what is shown. The space for the explanation is held from the first moment, so the card never jumps.
 *
 * Theme it three ways, from coarse to fine:
 *   `appearance`  "dark", "light", or "system" (the design system's surface, text and action tokens; follows the page's theme)
 *   `variant`     "glass" (translucent, blurs what is behind), "solid" (opaque) or "outline" (no fill, for a surface that has one)
 *   CSS variables, on the card or any ancestor: --km-quiz-surface, --km-quiz-ink, --km-quiz-muted, --km-quiz-line, --km-quiz-option,
 *                 --km-quiz-accent (falls back to --km-accent), --km-quiz-on-accent, --km-quiz-correct, --km-quiz-on-correct,
 *                 --km-quiz-wrong, --km-quiz-focus, --km-quiz-radius, --km-quiz-shadow, --km-quiz-font-display, --km-quiz-font-body
 *                 (the fonts fall back to --km-font-display and --km-font-body).
 */
import { forwardRef, useId, useLayoutEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { quizCardAt } from "./quiz-card";
import type { QuizCardContent, QuizCardPlan, QuizCardState, QuizLabels, QuizOptionState } from "./quiz-card";

export type QuizVariant = "glass" | "solid" | "outline";
export type QuizSize = "sm" | "md" | "lg";
const DISPLAY = "var(--km-quiz-font-display, var(--km-font-display, var(--km-font-body, Georgia, 'Times New Roman', serif)))", BODY = "var(--km-quiz-font-body, var(--km-font-body, system-ui, sans-serif))";
/** Each appearance's defaults; every one gives way to its --km-quiz-* variable. `glass` and `solid` are the surface for those variants. */
const APPEARANCE = {
  dark: { glass: "rgba(13,22,38,.86)", solid: "#0f1a2c", ink: "#f6f1e6", muted: "rgba(246,241,230,.68)", line: "rgba(246,241,230,.22)", accent: "var(--km-accent, #dcb96c)", onAccent: "#101a2c", wrong: "#f08f7d" },
  light: { glass: "rgba(251,247,239,.95)", solid: "#fbf7ef", ink: "#14213a", muted: "rgba(20,33,58,.66)", line: "rgba(20,33,58,.2)", accent: "var(--km-accent, #8a6420)", onAccent: "#fffaf0", wrong: "#b3402e" },
  system: { glass: "color-mix(in srgb, var(--km-surface-elevated, #ffffff) 90%, transparent)", solid: "var(--km-surface-elevated, #ffffff)", ink: "var(--km-text-primary, #14213a)", muted: "var(--km-text-muted, rgba(20,33,58,.66))",
    line: "var(--km-border-subtle, rgba(20,33,58,.2))", accent: "var(--km-action-primary, #2f5bd3)", onAccent: "var(--km-action-primary-fg, #ffffff)", wrong: "var(--km-status-danger, #b3402e)" },
} as const;
function tokens(appearance: keyof typeof APPEARANCE, variant: QuizVariant): CSSProperties {
  const a = APPEARANCE[appearance];
  return { "--_surface": `var(--km-quiz-surface, ${variant === "outline" ? "transparent" : variant === "solid" ? a.solid : a.glass})`, "--_ink": `var(--km-quiz-ink, ${a.ink})`, "--_muted": `var(--km-quiz-muted, ${a.muted})`,
    "--_line": `var(--km-quiz-line, ${a.line})`, "--_accent": `var(--km-quiz-accent, ${a.accent})`, "--_on-accent": `var(--km-quiz-on-accent, ${a.onAccent})`,
    "--_correct": "var(--km-quiz-correct, var(--_accent))", "--_on-correct": "var(--km-quiz-on-correct, var(--_on-accent))", "--_wrong": `var(--km-quiz-wrong, ${a.wrong})`,
    "--_option": "var(--km-quiz-option, color-mix(in srgb, var(--_ink) 7%, transparent))" } as CSSProperties;
}
const SR_ONLY: CSSProperties = { position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap" };
/** What inline styles cannot say: hover, keyboard focus and disabled, for the interactive card. Scoped to the card. */
const INTERACTIVE_CSS = `
[data-km-quiz] label[data-km-quiz-option]{cursor:pointer;transition:border-color .12s,background-color .12s}
[data-km-quiz] label[data-km-quiz-option][data-km-quiz-tone="idle"]:hover{border-color:var(--_accent)!important}
[data-km-quiz] label[data-km-quiz-option]:has(input:focus-visible){outline:.14em solid var(--km-quiz-focus,var(--_ink));outline-offset:.16em}
[data-km-quiz] label[data-km-quiz-option]:has(input:disabled){cursor:default}
[data-km-quiz] button[data-km-quiz-action]{cursor:pointer;transition:opacity .12s,transform .12s}
[data-km-quiz] button[data-km-quiz-action]:hover:not(:disabled){transform:translateY(-.04em)}
[data-km-quiz] button[data-km-quiz-action]:focus-visible{outline:.14em solid var(--km-quiz-focus,var(--_ink));outline-offset:.16em}
[data-km-quiz] button[data-km-quiz-action]:disabled{opacity:.45;cursor:not-allowed}
@media (prefers-reduced-motion:reduce){[data-km-quiz] label[data-km-quiz-option],[data-km-quiz] button[data-km-quiz-action]{transition:none}}`;
/** Width of some text in ems of its own size: half an em a character, a whole one for CJK. An estimate, used only to hold the card inside its box. */
const ems = (text: string) => [...text].reduce((sum, ch) => sum + (/[぀-ヿ㐀-鿿가-힯＀-￯]/.test(ch) ? 1 : .52), 0);
/** The card's inner width in ems when its width is what limits the type (100cqw at 2.7cqw an em, less the padding). */
const INNER_EMS = 100 / 2.7 - 2.8;
/** The card's height in ems for some text, given how many ems wide its inside is. */
function tallEms(content: QuizCardContent, inner: number, rows: number, header: boolean, footer: boolean) {
  const detail = content.options.some(option => option.detail);
  const questionLines = Math.ceil(ems(content.question) * 1.62 / inner), explanationLines = content.explanation ? Math.ceil(ems(content.explanation) * .86 / inner) : 0;
  return 2.5 + (header ? 1.45 : 0) + questionLines * 1.62 * 1.14 + .85 + rows * (detail ? 3.1 : 2.4) + (rows - 1) * .6 + (explanationLines ? .85 + explanationLines * .86 * 1.32 : 0) + (footer ? 3.2 : 0);
}

function Badge({ option }: { option: QuizOptionState }) {
  const right = option.tone === "right", wrong = option.tone === "wrong", stroke = right ? "var(--_on-correct)" : "var(--_wrong)";
  return <span aria-hidden="true" style={{ flex: "none", width: "1.75em", height: "1.75em", borderRadius: "50%", display: "grid", placeItems: "center", boxSizing: "border-box",
    border: `.1em solid ${right ? "var(--_on-correct)" : wrong ? "var(--_wrong)" : option.tone === "picked" ? "var(--_accent)" : "var(--_line)"}`,
    background: option.tone === "picked" ? "var(--_accent)" : "transparent", color: option.tone === "picked" ? "var(--_on-accent)" : "inherit", font: `700 .78em/1 ${BODY}`, letterSpacing: ".02em" }}>
    {option.mark === "letter" ? option.letter : <svg viewBox="0 0 20 20" width="62%" height="62%" fill="none" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      {option.mark === "tick" ? <path d="M4.5 10.6L8.4 14.4L15.6 5.9" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - option.settle} /> : <path d="M5.5 5.5L14.5 14.5M14.5 5.5L5.5 14.5" />}
    </svg>}
  </span>;
}

export interface QuizCardViewProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onChange" | "content"> {
  content: QuizCardContent;
  /** The moment to draw: from `quizCardAt` (a film frame) or `quizStateOf` (a learner's progress). */
  state: QuizCardState;
  /** "fill": the card fills its parent's box and sets its type from it (films, posters). "intrinsic": it is as wide as its parent and as
   * tall as its content, with type from `size` (pages, apps). @default "fill" */
  sizing?: "fill" | "intrinsic";
  /** Type size for intrinsic sizing: 0.875, 1 or 1.25 rem. @default "md" */
  size?: QuizSize;
  /** The surface: translucent glass, an opaque solid, or an outline with no fill. @default "glass" */
  variant?: QuizVariant;
  /** A tag on the picked option, such as whose guess it is. */
  pickedBy?: string;
  /** Makes the options a radio group the learner can choose from. Without it they are a plain list. */
  choose?: { name: string; value?: string; disabled?: boolean; onChange: (option: string) => void };
  /** Under the explanation: actions, a result, a link to the next question. */
  footer?: ReactNode;
  /** Parts switch on instead of easing; nothing pulses or shakes. */
  reducedMotion?: boolean;
}
export const QuizCardView = forwardRef<HTMLDivElement, QuizCardViewProps>(function QuizCardView({ content, state, sizing = "fill", size = "md", variant = "glass", pickedBy, choose, footer, reducedMotion = false, style, ...props }, ref) {
  const n = content.options.length, questionId = useId(), fill = sizing === "fill";
  const longest = Math.max(...content.options.map(option => ems(option.label)));
  const columns = content.layout === "row" ? n : content.layout === "column" ? 1 : n === 2 ? (longest <= 12 ? 2 : 1) : n === 3 ? (longest <= 7 ? 3 : 1) : longest <= 10 ? 2 : 1;
  const rows = Math.ceil(n / columns), header = Boolean(content.eyebrow) || state.remaining !== undefined;
  // Filling a box, the type is set from it: 2.7% of its width, more in a narrow or vertical box (up to 5.2% of the width, 3% of the
  // height), and less when the card's own text would make it taller than the box. Until the box is measured, a CSS estimate stands in.
  const root = useRef<HTMLDivElement | null>(null), [box, setBox] = useState<{ w: number; h: number }>();
  // Measured after every render on purpose: the box can change size between frames (a growing region, a resized stage).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { const el = root.current; if (fill && el && (!box || Math.abs(box.w - el.clientWidth) > .5 || Math.abs(box.h - el.clientHeight) > .5)) setBox({ w: el.clientWidth, h: el.clientHeight }); });
  const wide = box ? Math.max(box.w * .027, Math.min(box.w * .052, box.h * .03)) : 0;
  const fontSize = !fill ? { sm: ".875rem", md: "1rem", lg: "1.25rem" }[size]
    : box && box.w > 0 && box.h > 0 ? `${Math.min(wide, box.h * .96 / tallEms(content, box.w / wide - 2.8, rows, header, Boolean(footer))).toFixed(2)}px`
    : `min(2.7cqw, ${(96 / tallEms(content, INNER_EMS, rows, header, Boolean(footer))).toFixed(3)}cqh)`;
  const visible = state.phase !== "before" && state.phase !== "gone", show = state.in * (1 - state.out), answered = state.phase === "answer", outline = variant === "outline";
  const option = (item: QuizCardContent["options"][number], i: number) => {
    const o = state.options[i], right = o.tone === "right", wrong = o.tone === "wrong", dimmed = o.tone === "dimmed";
    const pulse = right && !reducedMotion ? 1 + .055 * Math.sin(Math.PI * o.settle) : 1, shake = wrong && !reducedMotion ? Math.sin(o.settle * Math.PI * 4) * (1 - o.settle) * .28 : 0;
    const box: CSSProperties = { position: "relative", display: "flex", alignItems: "center", gap: ".65em", minWidth: 0, boxSizing: "border-box", padding: ".5em .85em .5em .55em", borderRadius: ".72em",
      border: `.09em solid ${right ? "var(--_correct)" : wrong ? "var(--_wrong)" : o.tone === "picked" ? "var(--_accent)" : "var(--_line)"}`,
      background: right ? `color-mix(in srgb, var(--_correct) ${Math.round(18 + 82 * o.settle)}%, transparent)` : o.tone === "picked" ? "color-mix(in srgb, var(--_accent) 16%, transparent)" : "var(--_option)",
      color: right && o.settle > .45 ? "var(--_on-correct)" : "var(--_ink)", boxShadow: right ? `0 0 0 ${(o.settle * .55).toFixed(3)}em color-mix(in srgb, var(--_correct) ${Math.round((1 - o.settle) * 55)}%, transparent)` : undefined,
      opacity: o.in * (dimmed ? 1 - .55 * o.settle : wrong ? 1 - .3 * o.settle : 1), transform: reducedMotion ? undefined : `translate(${shake}em, ${(1 - o.in) * .55}em) scale(${pulse})` };
    const inside = <>
      <Badge option={o} />
      <span style={{ minWidth: 0, display: "grid", gap: ".16em" }}>
        <span style={{ font: `600 1.04em/1.16 ${BODY}`, overflowWrap: "anywhere" }}>{item.label}</span>
        {item.detail && <span style={{ font: `500 .68em/1.2 ${BODY}`, color: right && o.settle > .45 ? "inherit" : "var(--_muted)", opacity: right ? .82 : 1 }}>{item.detail}</span>}
      </span>
      {o.guessed && pickedBy && <span style={{ position: "absolute", right: ".7em", top: "-.62em", padding: ".22em .55em", borderRadius: "1em", background: outline ? "var(--_on-accent)" : "var(--_surface)", border: `.08em solid ${wrong ? "var(--_wrong)" : "var(--_accent)"}`,
        color: wrong ? "var(--_wrong)" : "var(--_accent)", font: `700 .5em/1 ${BODY}`, letterSpacing: ".14em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{pickedBy}</span>}
    </>;
    return choose
      ? <label key={item.id} data-km-quiz-option={item.id} data-km-quiz-tone={o.tone} style={box}>
          <input type="radio" name={choose.name} value={item.id} checked={choose.value === item.id} disabled={choose.disabled} onChange={() => choose.onChange(item.id)} style={SR_ONLY} />{inside}
        </label>
      : <li key={item.id} data-km-quiz-option={item.id} data-km-quiz-tone={o.tone} style={box}>{inside}</li>;
  };
  const grid: CSSProperties = { listStyle: "none", margin: 0, padding: 0, border: 0, display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: ".6em" };
  return <div {...props} ref={node => { root.current = node; if (typeof ref === "function") ref(node); else if (ref) ref.current = node; }} role="group" aria-label={props["aria-label"] ?? content.question} data-km-quiz="" data-km-quiz-phase={state.phase}
    style={{ position: "relative", width: "100%", ...fill ? { height: "100%", containerType: "size", display: "grid", placeItems: "center" } : {}, ...tokens(content.appearance ?? "dark", variant), ...style }}>
    {(choose || footer) && <style>{INTERACTIVE_CSS}</style>}
    <div data-km-quiz-card="" style={{ fontSize, width: "100%", boxSizing: "border-box", padding: "1.2em 1.4em 1.3em", borderRadius: "var(--km-quiz-radius, .9em)",
      background: "var(--_surface)", color: "var(--_ink)", border: `${outline ? ".09em" : ".06em"} solid var(--_line)`,
      boxShadow: outline ? undefined : "var(--km-quiz-shadow, 0 1.2em 3em rgba(0,0,0,.28), inset 0 .06em 0 rgba(255,255,255,.12))", backdropFilter: variant === "glass" ? "blur(.7em) saturate(1.15)" : undefined,
      display: "grid", gap: ".85em", visibility: visible ? "visible" : "hidden", opacity: show, transform: reducedMotion ? undefined : `translateY(${(1 - state.in) * 1.1 - state.out * .6}em)` }}>
      {header && <div style={{ display: "flex", alignItems: "center", gap: ".9em", minHeight: ".62em" }}>
        {content.eyebrow && <span style={{ font: `600 .6em/1 ${BODY}`, letterSpacing: ".24em", textTransform: "uppercase", color: "var(--_accent)", whiteSpace: "nowrap" }}>{content.eyebrow}</span>}
        {state.remaining !== undefined && <span aria-hidden="true" data-km-quiz-countdown={state.remaining.toFixed(3)} style={{ flex: 1, height: ".14em", borderRadius: ".1em", background: "var(--_line)", overflow: "hidden", opacity: answered ? 1 - state.options[0].settle : 1 }}>
          <span style={{ display: "block", height: "100%", width: `${state.remaining * 100}%`, background: "var(--_accent)" }} />
        </span>}
      </div>}
      <p id={questionId} data-km-quiz-question="" style={{ margin: 0, font: `600 1.62em/1.14 ${DISPLAY}`, letterSpacing: "var(--km-title-tracking, -.01em)", textWrap: "balance", overflowWrap: "anywhere" }}>{content.question}</p>
      {choose ? <div role="radiogroup" aria-labelledby={questionId} style={grid}>{content.options.map(option)}</div> : <ol style={grid}>{content.options.map(option)}</ol>}
      {/* The actions sit under the options; the explanation's held space is then at the foot of the card, where it reads as margin. */}
      {footer}
      {content.explanation && <p data-km-quiz-explanation="" aria-hidden={state.explanation === 0} style={{ margin: 0, font: `italic 500 .86em/1.32 ${DISPLAY}`, color: "var(--_muted)", textWrap: "balance", opacity: state.explanation,
        transform: reducedMotion ? undefined : `translateY(${(1 - state.explanation) * .4}em)` }}>{content.explanation}</p>}
    </div>
    <span role="status" style={SR_ONLY}>{state.status}</span>
  </div>;
});

export interface QuizCardProps extends Omit<QuizCardViewProps, "content" | "state" | "choose" | "pickedBy" | "sizing" | "size"> {
  /** From `compileQuizCard`. */
  plan: QuizCardPlan;
  frame: number;
  /** The card's words that are not content, for other languages. */
  labels?: QuizLabels;
}
/** The quiz card at one frame of a film: it fills the box it is given. Pure function of `frame`. */
export const QuizCard = forwardRef<HTMLDivElement, QuizCardProps>(function QuizCard({ plan, frame, labels, reducedMotion = false, ...props }, ref) {
  return <QuizCardView {...props} ref={ref} content={plan.content} state={quizCardAt(plan, frame, reducedMotion, labels)} pickedBy={plan.content.guess?.by} reducedMotion={reducedMotion} aria-label={props["aria-label"] ?? `Quiz: ${plan.content.question}`} />;
});
