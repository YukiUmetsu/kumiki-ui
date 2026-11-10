/** Draws a quiz card at one frame: a question, two to four lettered options and a line draining toward the answer; then the right
 * option fills and is ticked, a wrong guess is crossed and steps back, and one line says why. It fills the box it is given (the whole
 * frame, or a region over a picture) and sizes its type from that box, so it reads the same in landscape, vertical and a lower third.
 * Pure function of `frame`.
 *
 * Right and wrong are never colour alone: the badge changes from a letter to a tick or a cross, the right option fills, and a status
 * line for screen readers says what is shown. The space for the explanation is held from the first frame, so the card never jumps.
 *
 * Customize with CSS variables on the card or any ancestor: --km-quiz-surface, --km-quiz-ink, --km-quiz-muted, --km-quiz-line,
 * --km-quiz-accent (falls back to --km-accent), --km-quiz-on-accent, --km-quiz-wrong, --km-quiz-radius; type follows
 * --km-font-display and --km-font-body.
 */
import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { quizCardAt } from "./quiz-card";
import type { QuizCardPlan, QuizOptionState } from "./quiz-card";

const DISPLAY = "var(--km-font-display, var(--km-font-body, Georgia, 'Times New Roman', serif))", BODY = "var(--km-font-body, system-ui, sans-serif)";
const TOKENS = {
  dark: { "--_surface": "var(--km-quiz-surface, rgba(13,22,38,.86))", "--_ink": "var(--km-quiz-ink, #f6f1e6)", "--_muted": "var(--km-quiz-muted, rgba(246,241,230,.68))", "--_line": "var(--km-quiz-line, rgba(246,241,230,.22))",
    "--_accent": "var(--km-quiz-accent, var(--km-accent, #dcb96c))", "--_on-accent": "var(--km-quiz-on-accent, #101a2c)", "--_wrong": "var(--km-quiz-wrong, #f08f7d)" },
  light: { "--_surface": "var(--km-quiz-surface, rgba(251,247,239,.95))", "--_ink": "var(--km-quiz-ink, #14213a)", "--_muted": "var(--km-quiz-muted, rgba(20,33,58,.66))", "--_line": "var(--km-quiz-line, rgba(20,33,58,.2))",
    "--_accent": "var(--km-quiz-accent, var(--km-accent, #8a6420))", "--_on-accent": "var(--km-quiz-on-accent, #fffaf0)", "--_wrong": "var(--km-quiz-wrong, #b3402e)" },
} as const;
const SR_ONLY: CSSProperties = { position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap" };
/** Width of some text in ems of its own size: half an em a character, a whole one for CJK. An estimate, used only to hold the card inside its box. */
const ems = (text: string) => [...text].reduce((sum, ch) => sum + (/[぀-ヿ㐀-鿿가-힯＀-￯]/.test(ch) ? 1 : .52), 0);
/** The card's inner width in ems when its width is what limits the type (100cqw at 2.7cqw an em, less the padding). */
const INNER_EMS = 100 / 2.7 - 2.8;
/** The card's height in ems for some text, given how many ems wide its inside is. */
function tallEms(content: QuizCardPlan["content"], inner: number, rows: number, header: boolean) {
  const detail = content.options.some(option => option.detail);
  const questionLines = Math.ceil(ems(content.question) * 1.62 / inner), explanationLines = content.explanation ? Math.ceil(ems(content.explanation) * .86 / inner) : 0;
  return 2.5 + (header ? 1.45 : 0) + questionLines * 1.62 * 1.14 + .85 + rows * (detail ? 3.1 : 2.4) + (rows - 1) * .6 + (explanationLines ? .85 + explanationLines * .86 * 1.32 : 0);
}

function Badge({ option }: { option: QuizOptionState }) {
  const right = option.tone === "right", wrong = option.tone === "wrong", stroke = right ? "var(--_on-accent)" : "var(--_wrong)";
  return <span aria-hidden="true" style={{ flex: "none", width: "1.75em", height: "1.75em", borderRadius: "50%", display: "grid", placeItems: "center", boxSizing: "border-box",
    border: `.1em solid ${right ? "var(--_on-accent)" : wrong ? "var(--_wrong)" : option.tone === "picked" ? "var(--_accent)" : "var(--_line)"}`,
    color: option.tone === "picked" ? "var(--_accent)" : "inherit", font: `700 .78em/1 ${BODY}`, letterSpacing: ".02em" }}>
    {option.mark === "letter" ? option.letter : <svg viewBox="0 0 20 20" width="62%" height="62%" fill="none" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      {option.mark === "tick" ? <path d="M4.5 10.6L8.4 14.4L15.6 5.9" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - option.settle} /> : <path d="M5.5 5.5L14.5 14.5M14.5 5.5L5.5 14.5" />}
    </svg>}
  </span>;
}

export interface QuizCardProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** From `compileQuizCard`. */
  plan: QuizCardPlan;
  frame: number;
  /** Parts switch on instead of easing; nothing pulses or shakes. */
  reducedMotion?: boolean;
}
export const QuizCard = forwardRef<HTMLDivElement, QuizCardProps>(function QuizCard({ plan, frame, reducedMotion = false, style, ...props }, ref) {
  const { content } = plan, state = quizCardAt(plan, frame, reducedMotion), n = content.options.length;
  const longest = Math.max(...content.options.map(option => ems(option.label)));
  const columns = content.layout === "row" ? n : content.layout === "column" ? 1 : n === 2 ? (longest <= 12 ? 2 : 1) : n === 3 ? (longest <= 7 ? 3 : 1) : longest <= 10 ? 2 : 1;
  const rows = Math.ceil(n / columns), header = Boolean(content.eyebrow) || state.remaining !== undefined;
  // The type is set from the box: 2.7% of its width, more in a narrow or vertical box (up to 5.2% of the width, 3% of the height), and
  // less when the card's own text would make it taller than the box. Until the box is measured, a CSS estimate for a wide box stands in.
  const root = useRef<HTMLDivElement | null>(null), [box, setBox] = useState<{ w: number; h: number }>();
  // Measured after every render on purpose: the box can change size between frames (a growing region, a resized stage).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { const el = root.current; if (el && (!box || Math.abs(box.w - el.clientWidth) > .5 || Math.abs(box.h - el.clientHeight) > .5)) setBox({ w: el.clientWidth, h: el.clientHeight }); });
  const wide = box ? Math.max(box.w * .027, Math.min(box.w * .052, box.h * .03)) : 0;
  const fontSize = box && box.w > 0 && box.h > 0 ? `${Math.min(wide, box.h * .96 / tallEms(content, box.w / wide - 2.8, rows, header)).toFixed(2)}px` : `min(2.7cqw, ${(96 / tallEms(content, INNER_EMS, rows, header)).toFixed(3)}cqh)`;
  const visible = state.phase !== "before" && state.phase !== "gone", show = state.in * (1 - state.out);
  const answered = state.phase === "answer";
  return <div {...props} ref={node => { root.current = node; if (typeof ref === "function") ref(node); else if (ref) ref.current = node; }} role="group" aria-label={props["aria-label"] ?? `Quiz: ${content.question}`} data-km-quiz-phase={state.phase}
    style={{ position: "relative", width: "100%", height: "100%", containerType: "size", display: "grid", placeItems: "center", ...TOKENS[content.appearance ?? "dark"] as CSSProperties, ...style }}>
    <div data-km-quiz-card="" style={{ fontSize, width: "100%", boxSizing: "border-box", padding: "1.2em 1.4em 1.3em", borderRadius: "var(--km-quiz-radius, .9em)",
      background: "var(--_surface)", color: "var(--_ink)", border: ".06em solid var(--_line)", boxShadow: "0 1.2em 3em rgba(0,0,0,.28), inset 0 .06em 0 rgba(255,255,255,.12)", backdropFilter: "blur(.7em) saturate(1.15)",
      display: "grid", gap: ".85em", visibility: visible ? "visible" : "hidden", opacity: show, transform: reducedMotion ? undefined : `translateY(${(1 - state.in) * 1.1 - state.out * .6}em)` }}>
      {header && <div style={{ display: "flex", alignItems: "center", gap: ".9em", minHeight: ".62em" }}>
        {content.eyebrow && <span style={{ font: `600 .6em/1 ${BODY}`, letterSpacing: ".24em", textTransform: "uppercase", color: "var(--_accent)", whiteSpace: "nowrap" }}>{content.eyebrow}</span>}
        {state.remaining !== undefined && <span aria-hidden="true" data-km-quiz-countdown={state.remaining.toFixed(3)} style={{ flex: 1, height: ".14em", borderRadius: ".1em", background: "var(--_line)", overflow: "hidden", opacity: answered ? 1 - state.options[0].settle : 1 }}>
          <span style={{ display: "block", height: "100%", width: `${state.remaining * 100}%`, background: "var(--_accent)" }} />
        </span>}
      </div>}
      <p data-km-quiz-question="" style={{ margin: 0, font: `600 1.62em/1.14 ${DISPLAY}`, letterSpacing: "var(--km-title-tracking, -.01em)", textWrap: "balance", overflowWrap: "anywhere" }}>{content.question}</p>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: ".6em" }}>
        {content.options.map((option, i) => {
          const o = state.options[i], right = o.tone === "right", wrong = o.tone === "wrong", dimmed = o.tone === "dimmed";
          const pulse = right && !reducedMotion ? 1 + .055 * Math.sin(Math.PI * o.settle) : 1, shake = wrong && !reducedMotion ? Math.sin(o.settle * Math.PI * 4) * (1 - o.settle) * .28 : 0;
          return <li key={option.id} data-km-quiz-option={option.id} data-km-quiz-tone={o.tone} style={{ position: "relative", display: "flex", alignItems: "center", gap: ".65em", minWidth: 0, boxSizing: "border-box", padding: ".5em .85em .5em .55em", borderRadius: ".72em",
            border: `.09em solid ${right ? "var(--_accent)" : wrong ? "var(--_wrong)" : o.tone === "picked" ? "var(--_accent)" : "var(--_line)"}`,
            background: right ? `color-mix(in srgb, var(--_accent) ${Math.round(18 + 82 * o.settle)}%, transparent)` : o.tone === "picked" ? "color-mix(in srgb, var(--_accent) 16%, transparent)" : "color-mix(in srgb, var(--_ink) 7%, transparent)",
            color: right && o.settle > .45 ? "var(--_on-accent)" : "var(--_ink)", boxShadow: right ? `0 0 0 ${(o.settle * .55).toFixed(3)}em color-mix(in srgb, var(--_accent) ${Math.round((1 - o.settle) * 55)}%, transparent)` : undefined,
            opacity: o.in * (dimmed ? 1 - .55 * o.settle : wrong ? 1 - .3 * o.settle : 1), transform: reducedMotion ? undefined : `translate(${shake}em, ${(1 - o.in) * .55}em) scale(${pulse})` }}>
            <Badge option={o} />
            <span style={{ minWidth: 0, display: "grid", gap: ".16em" }}>
              <span style={{ font: `600 1.04em/1.16 ${BODY}`, overflowWrap: "anywhere" }}>{option.label}</span>
              {option.detail && <span style={{ font: `500 .68em/1.2 ${BODY}`, color: right && o.settle > .45 ? "inherit" : "var(--_muted)", opacity: right ? .82 : 1 }}>{option.detail}</span>}
            </span>
            {o.guessed && content.guess?.by && <span style={{ position: "absolute", right: ".7em", top: "-.62em", padding: ".22em .55em", borderRadius: "1em", background: "var(--_surface)", border: `.08em solid ${wrong ? "var(--_wrong)" : "var(--_accent)"}`,
              color: wrong ? "var(--_wrong)" : "var(--_accent)", font: `700 .5em/1 ${BODY}`, letterSpacing: ".14em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{content.guess.by}</span>}
          </li>;
        })}
      </ol>
      {content.explanation && <p data-km-quiz-explanation="" aria-hidden={state.explanation === 0} style={{ margin: 0, font: `italic 500 .86em/1.32 ${DISPLAY}`, color: "var(--_muted)", textWrap: "balance", opacity: state.explanation,
        transform: reducedMotion ? undefined : `translateY(${(1 - state.explanation) * .4}em)` }}>{content.explanation}</p>}
    </div>
    <span role="status" style={SR_ONLY}>{state.status}</span>
  </div>;
});
