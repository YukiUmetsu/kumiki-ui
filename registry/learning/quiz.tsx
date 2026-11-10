/** An interactive quiz question: the learner picks an option, checks it, and sees the answer and why.
 *
 * It is the quiz card (quiz-card-react.tsx) driven by the learner instead of a film frame, so a question looks the same in a lesson page
 * as in the video that teaches it. The options are a native radio group: Tab reaches it, the arrow keys move the choice, and the
 * buttons are real buttons. Before the answer nothing says which option is right; "Check answer" is disabled until one is picked;
 * after the answer the options are disabled. The result is said in words ("Correct", "Not quite"), drawn as a tick or a cross, and
 * announced through a status line. With `revealOn="select"` the first pick shows the answer at once, for a quick-fire round.
 *
 * Value and reveal can each be controlled or left to the component. Theme it as the card: `appearance`, `variant`, `size`, and the
 * --km-quiz-* CSS variables. Every word it adds comes from `labels`.
 */
import { forwardRef, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { QUIZ_LABELS, quizStateOf } from "./quiz-card";
import type { QuizCardContent, QuizLabels } from "./quiz-card";
import { QuizCardView } from "./quiz-card-react";
import type { QuizCardViewProps } from "./quiz-card-react";

export type QuizQuestion = Pick<QuizCardContent, "eyebrow" | "question" | "options" | "answer" | "explanation" | "layout" | "appearance">;
export interface QuizResult { option: string; correct: boolean }
export interface QuizProps extends Omit<QuizCardViewProps, "content" | "state" | "choose" | "pickedBy" | "sizing" | "footer" | "defaultValue"> {
  question: QuizQuestion;
  /** The picked option's id. Leave it out to let the component hold it; `defaultValue` then sets the first pick. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (option: string) => void;
  /** Whether the answer is shown. Leave it out to let the component hold it. */
  revealed?: boolean;
  defaultRevealed?: boolean;
  /** Called once when the answer is shown, with the pick and whether it was right. */
  onReveal?: (result: QuizResult) => void;
  /** Show the answer when "Check answer" is pressed, or as soon as an option is picked. @default "submit" */
  revealOn?: "submit" | "select";
  /** After a wrong answer, offer "Try again", which clears the pick and hides the answer. @default false */
  allowRetry?: boolean;
  /** Called when "Try again" is pressed. */
  onRetry?: () => void;
  /** The learner cannot choose or check. @default false */
  disabled?: boolean;
  /** The radio group's form name. @default a generated one */
  name?: string;
  /** The component's own words, for other languages; missing ones stay English. */
  labels?: Partial<QuizLabels>;
  /** Beside the buttons after the answer: a link to the next question, a score. */
  after?: ReactNode;
}

/** 0 → 1 over `ms` once `on` is true; 1 at once for reduced motion; 0 while `on` is false. */
function useSettle(on: boolean, ms: number, instant: boolean) {
  const [t, setT] = useState(on ? 1 : 0), started = useRef(on);
  useEffect(() => {
    if (!on) { started.current = false; setT(0); return; }
    if (started.current || instant) { started.current = true; setT(1); return; }
    started.current = true;
    let id = 0; const from = performance.now();
    const tick = (now: number) => { const x = Math.min(1, (now - from) / ms); setT(1 - (1 - x) ** 3); if (x < 1) id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [on, ms, instant]);
  return t;
}
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)"); if (!query) return;
    const update = () => setReduced(query.matches); update();
    query.addEventListener("change", update); return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

export const Quiz = forwardRef<HTMLDivElement, QuizProps>(function Quiz({ question, value, defaultValue, onValueChange, revealed, defaultRevealed = false, onReveal, revealOn = "submit", allowRetry = false, onRetry,
  disabled = false, name, labels, after, size = "md", variant = "solid", reducedMotion, ...props }, ref) {
  const words = { ...QUIZ_LABELS, ...labels }, generated = useId(), prefersReduced = usePrefersReducedMotion(), reduce = reducedMotion ?? prefersReduced;
  const [ownValue, setOwnValue] = useState(defaultValue), [ownRevealed, setOwnRevealed] = useState(defaultRevealed);
  const picked = value !== undefined ? value : ownValue, shown = revealed !== undefined ? revealed : ownRevealed;
  const settle = useSettle(shown, 460, reduce), explanation = useSettle(shown, 760, reduce);
  const correct = picked === question.answer;
  // "Check answer" leaves the page when it is pressed; focus moves to the result, so a keyboard or screen-reader user is not dropped.
  const result = useRef<HTMLElement>(null), focusResult = useRef(false);
  useEffect(() => { if (shown && focusResult.current) { focusResult.current = false; result.current?.focus(); } }, [shown]);
  const reveal = (option: string) => { focusResult.current = revealOn === "submit"; if (revealed === undefined) setOwnRevealed(true); onReveal?.({ option, correct: option === question.answer }); };
  const choose = (option: string) => {
    if (disabled || shown) return;
    if (value === undefined) setOwnValue(option);
    onValueChange?.(option);
    if (revealOn === "select") reveal(option);
  };
  const retry = () => { if (value === undefined) setOwnValue(undefined); if (revealed === undefined) setOwnRevealed(false); onRetry?.(); };
  const state = quizStateOf(question, { picked, revealed: shown, settle, explanation: shown ? Math.max(0, explanation * 1.6 - .6) : 0 }, words);
  const button = { font: "600 .86em/1 var(--km-quiz-font-body, var(--km-font-body, system-ui, sans-serif))", padding: ".7em 1.15em", borderRadius: "var(--km-quiz-radius, .9em)", border: ".09em solid var(--_accent)" } as const;
  const footer = <div data-km-quiz-footer="" style={{ display: "flex", alignItems: "center", gap: ".8em", flexWrap: "wrap", minHeight: "2.4em" }}>
    {!shown && revealOn === "submit" && <button type="button" data-km-quiz-action="check" disabled={disabled || picked === undefined} onClick={() => picked !== undefined && reveal(picked)}
      style={{ ...button, background: "var(--_accent)", color: "var(--_on-accent)" }}>{words.check}</button>}
    {shown && <strong ref={result} tabIndex={-1} data-km-quiz-result={correct ? "correct" : "incorrect"} style={{ outline: "none", font: "700 .92em/1 var(--km-quiz-font-body, var(--km-font-body, system-ui, sans-serif))", color: correct ? "var(--_correct)" : "var(--_wrong)", opacity: settle }}>{correct ? words.correct : words.incorrect}</strong>}
    {shown && !correct && allowRetry && <button type="button" data-km-quiz-action="retry" disabled={disabled} onClick={retry} style={{ ...button, background: "transparent", color: "var(--_ink)" }}>{words.retry}</button>}
    {shown && after}
  </div>;
  return <QuizCardView {...props} ref={ref} content={question} state={state} sizing="intrinsic" size={size} variant={variant} reducedMotion={reduce} footer={footer}
    choose={{ name: name ?? `quiz-${generated}`, value: picked, disabled: disabled || shown, onChange: choose }} />;
});
