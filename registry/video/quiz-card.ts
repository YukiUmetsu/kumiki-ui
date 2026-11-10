/**
 * Quiz card: the pure, frame-addressable part.
 *
 * Causal beat:
 *   input      a question and two to four options arrive, and a line drains toward the answer
 *   transform  optionally someone commits to a guess; then the answer is shown: the right option fills and is ticked,
 *              a wrong guess is crossed and steps back, the rest dim
 *   output     the answer holds, with one line of why.
 *
 * Nothing is marked right or wrong before the reveal frame, and the draining line ends exactly on it: the card never hints
 * and its progress is true. Everything here is a pure function of (content, frame), so any frame can be seeked or exported.
 */

export interface QuizOption {
  /** Stable name; `answer` and `guess.option` refer to it. */
  id: string;
  /** The option as shown: a few words. */
  label: string;
  /** One small line under the label, such as a unit or a date. */
  detail?: string;
}
export interface QuizCardContent {
  /** Small label above the question, such as a series name and number. */
  eyebrow?: string;
  question: string;
  /** Two to four options, in the order shown. */
  options: readonly QuizOption[];
  /** The id of the right option. */
  answer: string;
  /** Someone commits to an option before the answer: a presenter, a character, or the viewer's stand-in. `by` labels it. */
  guess?: { option: string; at: number; by?: string };
  /** One line shown under the options after the answer: why, or since when. */
  explanation?: string;
  /** The frame the card arrives. @default 0 */
  enterAt?: number;
  /** The frame the answer is shown. @default after the question and options can be read */
  revealAt?: number;
  /** The frame the card leaves. @default it stays */
  leaveAt?: number;
  /** A thin line that drains from the options' arrival to the answer. @default true */
  countdown?: boolean;
  /** Options side by side, stacked, or chosen from their number and the card's shape. @default "auto" */
  layout?: "auto" | "row" | "column";
  /** Dark glass for bright pictures, light paper for dark ones. @default "dark" */
  appearance?: "dark" | "light";
}
export type QuizProblemCode = "quiz-options" | "quiz-answer" | "quiz-guess" | "quiz-timing" | "quiz-question-long" | "quiz-option-long"
  | "quiz-reveal-early" | "quiz-answer-brief" | "quiz-explanation-brief";
export interface QuizProblem { severity: "error" | "warning"; code: QuizProblemCode; path: string; message: string; hint: string }
export type QuizPhase = "before" | "question" | "guess" | "answer" | "gone";
export interface QuizCardPlan {
  content: QuizCardContent;
  durationFrames: number;
  fps: number;
  /** When each part arrives, in frames. */
  cues: { enter: number; options: readonly number[]; guess?: number; reveal: number; explanation?: number; leave?: number };
}
/** One option at one frame. `mark` is what its badge shows: its letter, a tick or a cross. */
export interface QuizOptionState { id: string; letter: string; in: number; guessed: boolean; mark: "letter" | "tick" | "cross"; tone: "idle" | "picked" | "right" | "wrong" | "dimmed";
  /** 0..1 since the reveal reached this option, for its landing. */
  settle: number }
export interface QuizCardState {
  phase: QuizPhase;
  /** 0..1: the card's own arrival, and its exit. */
  in: number; out: number;
  /** 1 → 0 between the options' arrival and the answer; undefined when the card has no countdown. */
  remaining?: number;
  options: readonly QuizOptionState[];
  /** 0..1: the explanation's arrival. */
  explanation: number;
  /** What a screen reader is told at this frame. */
  status: string;
}

export const QUIZ_ENTER_FRAMES = 10, QUIZ_OPTION_STAGGER = 4, QUIZ_SETTLE_FRAMES = 14;
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
/** Seconds a viewer needs for some on-screen words: 0.8 s to find them, then three words a second. Unspaced scripts count two characters a word. */
export function quizReadingSeconds(text: string): number {
  const cjk = (text.match(/[぀-ヿ㐀-鿿가-힯]/g) ?? []).length;
  return .8 + (words(text.replace(/[぀-ヿ㐀-鿿가-힯]/g, " ")) + cjk / 2) / 3;
}
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const out3 = (t: number) => 1 - (1 - clamp01(t)) ** 3;

/** Checks a quiz card and times it. Errors leave `plan` undefined. */
export function compileQuizCard(content: QuizCardContent, durationFrames: number, fps: number): { plan?: QuizCardPlan; problems: QuizProblem[] } {
  const problems: QuizProblem[] = [];
  const report = (severity: QuizProblem["severity"], code: QuizProblemCode, path: string, message: string, hint: string) => problems.push({ severity, code, path, message, hint });
  const options = content.options ?? [], ids = options.map(option => option.id);
  if (options.length < 2 || options.length > 4 || new Set(ids).size !== ids.length || options.some(option => !option.id || !option.label?.trim()))
    report("error", "quiz-options", "/options", "A quiz has two to four options, each with its own id and a label.", "More than four cannot be read before the answer. Split the question.");
  if (!content.question?.trim()) report("error", "quiz-options", "/question", "A quiz has a question.", "Write the question.");
  if (!ids.includes(content.answer)) report("error", "quiz-answer", "/answer", `The answer "${content.answer}" is not one of the options.`, "Set `answer` to an option's id.");
  if (content.guess && !ids.includes(content.guess.option)) report("error", "quiz-guess", "/guess/option", `The guess "${content.guess.option}" is not one of the options.`, "Set `guess.option` to an option's id.");
  const enter = content.enterAt ?? 0, optionAt = options.map((_, i) => enter + QUIZ_ENTER_FRAMES + i * QUIZ_OPTION_STAGGER), lastOption = optionAt[optionAt.length - 1] ?? enter;
  // The viewer needs the question and every option before the answer; three quarters of that is the floor for a quick quiz.
  const reading = Math.round(quizReadingSeconds([content.question, ...options.map(option => option.label)].join(" ")) * fps);
  const reveal = content.revealAt ?? Math.min(durationFrames - 1, enter + QUIZ_ENTER_FRAMES + reading), leave = content.leaveAt;
  const inside = (frame: number | undefined) => frame === undefined || (Number.isSafeInteger(frame) && frame >= 0 && frame < durationFrames);
  if (![content.enterAt, content.revealAt, content.leaveAt, content.guess?.at].every(inside) || reveal <= lastOption || (leave !== undefined && leave <= reveal))
    report("error", "quiz-timing", "/revealAt", "The card arrives, then every option, then the answer, then it leaves, all inside the scene.", "Give the scene more frames, or move `enterAt`, `revealAt` and `leaveAt`.");
  if (content.guess && (content.guess.at <= lastOption || content.guess.at >= reveal))
    report("error", "quiz-guess", "/guess/at", "A guess is made after the options arrive and before the answer.", "Move `guess.at` between the last option and `revealAt`.");
  if (problems.some(problem => problem.severity === "error")) return { problems };
  if (words(content.question) > 14) report("warning", "quiz-question-long", "/question", "The question is over 14 words.", "A question on screen is read once, fast. Cut it to its noun and its verb.");
  options.forEach((option, i) => { if (words(option.label) > 5) report("warning", "quiz-option-long", `/options/${i}/label`, `Option "${option.id}" is over five words.`, "Options are compared at a glance: a number, a name, a short phrase."); });
  if (reveal - enter - QUIZ_ENTER_FRAMES < reading * .75)
    report("warning", "quiz-reveal-early", "/revealAt", `The answer comes ${((reveal - enter) / fps).toFixed(1)} s after the card; reading the question and options takes about ${(reading / fps).toFixed(1)} s.`, "Move `revealAt` later, shorten the question, or have it spoken as it appears.");
  const end = leave ?? durationFrames, answerLabel = options.find(option => option.id === content.answer)!.label;
  if (end - reveal < Math.round(quizReadingSeconds(answerLabel) * fps * .8))
    report("warning", "quiz-answer-brief", "/revealAt", "The answer is on screen too briefly to register.", "Keep the card about a second after the answer.");
  const explanation = content.explanation ? reveal + QUIZ_SETTLE_FRAMES : undefined;
  if (explanation !== undefined && end - explanation < Math.round(quizReadingSeconds(content.explanation!) * fps * .75))
    report("warning", "quiz-explanation-brief", "/explanation", "The explanation leaves before it can be read.", "Shorten it, or hold the card longer after the answer.");
  return { problems, plan: { content, durationFrames, fps, cues: { enter, options: optionAt, guess: content.guess?.at, reveal, explanation, leave } } };
}

/** The card at one frame. With `reducedMotion`, parts switch on instead of easing, and nothing shakes or pulses. */
export function quizCardAt(plan: QuizCardPlan, frame: number, reducedMotion = false): QuizCardState {
  const { content, cues } = plan, ease = (start: number, length: number) => reducedMotion ? (frame >= start ? 1 : 0) : out3((frame - start) / length);
  const revealed = frame >= cues.reveal, guessed = cues.guess !== undefined && frame >= cues.guess;
  const gone = cues.leave !== undefined && frame >= cues.leave + QUIZ_ENTER_FRAMES;
  const phase: QuizPhase = frame < cues.enter ? "before" : gone ? "gone" : revealed ? "answer" : guessed ? "guess" : "question";
  const options = content.options.map((option, i): QuizOptionState => {
    const right = option.id === content.answer, picked = guessed && content.guess!.option === option.id;
    return { id: option.id, letter: String.fromCharCode(65 + i), in: ease(cues.options[i], QUIZ_ENTER_FRAMES), guessed: picked,
      mark: revealed ? (right ? "tick" : picked ? "cross" : "letter") : "letter",
      tone: revealed ? (right ? "right" : picked ? "wrong" : "dimmed") : picked ? "picked" : "idle",
      settle: revealed ? ease(cues.reveal, QUIZ_SETTLE_FRAMES) : 0 };
  });
  const last = cues.options[cues.options.length - 1];
  const answer = content.options.find(option => option.id === content.answer)!, by = content.guess?.by ? `${content.guess.by}: ` : "Guess: ";
  const status = phase === "before" || phase === "gone" ? "" : revealed ? `Answer: ${answer.label}.${content.explanation ? " " + content.explanation : ""}`
    : guessed ? `${by}${content.options.find(option => option.id === content.guess!.option)!.label}. The answer is not shown yet.` : "The answer is not shown yet.";
  return { phase, in: ease(cues.enter, QUIZ_ENTER_FRAMES), out: cues.leave === undefined ? 0 : ease(cues.leave, QUIZ_ENTER_FRAMES),
    remaining: content.countdown === false ? undefined : 1 - clamp01((frame - last) / Math.max(1, cues.reveal - last)),
    options, explanation: cues.explanation === undefined ? 0 : ease(cues.explanation, QUIZ_ENTER_FRAMES), status };
}
