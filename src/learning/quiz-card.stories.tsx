import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileQuizCard } from "../../registry/learning/quiz-card";
import type { QuizCardContent } from "../../registry/learning/quiz-card";
import { QuizCard } from "../../registry/learning/quiz-card-react";
import type { QuizVariant } from "../../registry/learning/quiz-card-react";
import { Quiz } from "../../registry/learning/quiz";
import type { QuizQuestion, QuizResult } from "../../registry/learning/quiz";
import cape from "../video/assets/follow-cape.jpg";
import forest from "../video/assets/follow-forest.jpg";

const pyramid: QuizQuestion = { eyebrow: "Question 1 of 5", question: "About how old is the largest pyramid at Giza?",
  options: [{ id: "a", label: "450 years" }, { id: "b", label: "4,500 years" }], answer: "b", explanation: "It was built around 2560 BC, for the pharaoh Khufu." };
const oldest: QuizQuestion = { eyebrow: "Question 2 of 5", question: "Which of these is the oldest?",
  options: [{ id: "a", label: "A stone circle", detail: "c. 3000 BC" }, { id: "b", label: "A great pyramid", detail: "c. 2560 BC" }, { id: "c", label: "A hilltop citadel", detail: "c. 1450" }, { id: "d", label: "An iron tower", detail: "1889" }],
  answer: "a", explanation: "Its first ring of ditches and posts is about five centuries older than the pyramid." };
/** Anonymous demo themes: each is only CSS variables on a wrapper. */
const THEMES: { name: string; page: string; appearance: QuizQuestion["appearance"]; variant: QuizVariant; vars: Record<string, string> }[] = [
  { name: "Theme A · navy and brass (the default dark)", page: "#0b1220", appearance: "dark", variant: "solid", vars: {} },
  { name: "Theme B · paper", page: "#efe8d8", appearance: "light", variant: "solid", vars: {} },
  { name: "Theme C · forest, green for right", page: "#0d1f17", appearance: "dark", variant: "solid", vars: { "--km-quiz-surface": "#12281e", "--km-quiz-accent": "#e7c66a", "--km-quiz-correct": "#56c28a", "--km-quiz-on-correct": "#06150e", "--km-quiz-radius": "1.4em",
    "--km-quiz-font-display": "'Avenir Next', 'Helvetica Neue', system-ui, sans-serif" } },
  { name: "Theme D · coral on white, square corners", page: "#ffffff", appearance: "light", variant: "outline", vars: { "--km-quiz-accent": "#d8452b", "--km-quiz-on-accent": "#ffffff", "--km-quiz-ink": "#1b1b1f", "--km-quiz-line": "#1b1b1f33", "--km-quiz-radius": ".2em",
    "--km-quiz-font-display": "'Helvetica Neue', Arial, sans-serif" } },
  { name: "Theme E · high contrast", page: "#000000", appearance: "dark", variant: "solid", vars: { "--km-quiz-surface": "#000000", "--km-quiz-ink": "#ffffff", "--km-quiz-muted": "#ffffff", "--km-quiz-line": "#ffffff", "--km-quiz-accent": "#ffe14d", "--km-quiz-on-accent": "#000000",
    "--km-quiz-wrong": "#ff9d8a", "--km-quiz-option": "#000000", "--km-quiz-shadow": "none" } },
  { name: "Theme F · the design system's tokens (appearance \"system\")", page: "var(--km-surface-canvas, #f4f5f7)", appearance: "system", variant: "solid", vars: {} },
];

function Demo(props: Partial<React.ComponentProps<typeof Quiz>> & { question?: QuizQuestion; page?: string }) {
  const [log, setLog] = useState<string>("Nothing answered yet.");
  return <div style={{ display: "grid", gap: 12, padding: 24, borderRadius: 12, background: props.page ?? "#0b1220", maxWidth: 640 }}>
    <Quiz question={props.question ?? pyramid} {...props} onReveal={(result: QuizResult) => setLog(`onReveal: picked "${result.option}", ${result.correct ? "correct" : "incorrect"}`)} />
    <output style={{ font: "500 12px ui-monospace, monospace", color: "#8f9bb0" }}>{log}</output>
  </div>;
}

const FPS = 30, FRAMES = 420;
const filmTwo: QuizCardContent = { eyebrow: "Quick quiz · 01", question: "How old is the Great Pyramid of Giza?",
  options: [{ id: "a", label: "450 years" }, { id: "b", label: "4,500 years" }], answer: "b", guess: { option: "a", at: 96, by: "First guess" }, revealAt: 140, explanation: "Built around 2560 BC, for the pharaoh Khufu." };
const filmFour: QuizCardContent = { ...oldest, eyebrow: "Round two", appearance: "light", guess: { option: "a", at: 150, by: "Your pick" }, revealAt: 200 };
const filmJapanese: QuizCardContent = { eyebrow: "クイズ · 03", question: "ギザの大ピラミッドは、いまからおよそ何年前に建てられたでしょうか?",
  options: [{ id: "a", label: "およそ450年前" }, { id: "b", label: "およそ4,500年前" }, { id: "c", label: "およそ1,200年前" }], answer: "b", revealAt: 260, layout: "column", explanation: "紀元前2560年ごろ、クフ王のために建てられました。" };
/** Plays a film card on a requestAnimationFrame clock over a photograph; scrubbing pauses it. `box` is where the card sits in the frame. */
function Player({ content, image = cape, box = { inset: "8% 12%" }, portrait = false, reduced = false, variant }: { content: QuizCardContent; image?: string; box?: CSSProperties; portrait?: boolean; reduced?: boolean; variant?: QuizVariant }) {
  const { plan, problems } = useMemo(() => compileQuizCard(content, FRAMES, FPS), [content]);
  const [frame, setFrame] = useState(0), [playing, setPlaying] = useState(false), clock = useRef({ from: 0, at: 0 });
  useEffect(() => {
    if (!playing) return;
    clock.current = { from: performance.now(), at: frame };
    let id = 0;
    const tick = (now: number) => {
      const next = Math.floor(clock.current.at + (now - clock.current.from) / 1000 * FPS);
      if (next >= FRAMES - 1) { setFrame(FRAMES - 1); setPlaying(false); return; }
      setFrame(next); id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps
  const button = { font: "600 13px system-ui", padding: "6px 10px", borderRadius: 6, border: "1px solid #2b3442", background: "#151b23", color: "#c9ced6", cursor: "pointer" } as const;
  const jump = (label: string, to: number | undefined) => to === undefined ? null : <button key={label} type="button" onClick={() => { setPlaying(false); setFrame(to); }} style={button}>{label}</button>;
  return <div style={{ display: "grid", gap: 12 }}>
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => { if (frame >= FRAMES - 1) setFrame(0); setPlaying(p => !p); }} style={{ ...button, background: "#dcb96c", color: "#101a2c", border: 0, padding: "8px 16px", fontSize: 14 }}>{playing ? "Pause" : "Play"}</button>
      <input type="range" min={0} max={FRAMES - 1} value={frame} onChange={event => { setPlaying(false); setFrame(Number(event.target.value)); }} aria-label="Frame" style={{ width: 320 }} />
      <span style={{ font: "600 13px ui-monospace, monospace", color: "#9aa4b2" }}>{(frame / FPS).toFixed(1)} s</span>
      {plan && [jump("Question", plan.cues.options[plan.cues.options.length - 1] + 12), jump("Guess", plan.cues.guess === undefined ? undefined : plan.cues.guess + 8), jump("Answer", plan.cues.reveal + 16), jump("Why", plan.cues.explanation === undefined ? undefined : plan.cues.explanation + 14)]}
    </div>
    {problems.length > 0 && <ul role="alert" style={{ margin: 0, paddingLeft: 18, color: "#ffc94a", font: "500 13px/1.5 system-ui" }}>{problems.map(problem => <li key={problem.code + problem.path}>{problem.code}: {problem.message}</li>)}</ul>}
    <div style={{ position: "relative", width: portrait ? 360 : 960, maxWidth: "100%", aspectRatio: portrait ? "9 / 16" : "16 / 9", overflow: "hidden", borderRadius: 10, background: "#0b1220" }}>
      <img src={image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      {plan && <div style={{ position: "absolute", ...box }}><QuizCard plan={plan} frame={frame} reducedMotion={reduced} variant={variant} /></div>}
    </div>
  </div>;
}

const meta: Meta = { title: "Learning/Quiz Card", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;
/** Pick an option, check it, read why. Tab reaches the options, the arrow keys move the choice. */
export const Interactive: Story = { render: () => <Demo allowRetry /> };
/** Four options with details on light paper; the answer shows as soon as one is picked. */
export const InteractiveQuickFire: Story = { render: () => <Demo question={{ ...oldest, appearance: "light" }} revealOn="select" page="#efe8d8" /> };
/** Sizes sm, md and lg, and a disabled question. */
export const SizesAndDisabled: Story = { render: () => <div style={{ display: "grid", gap: 20 }}>
  <Demo size="sm" /><Demo size="md" /><Demo size="lg" /><Demo disabled defaultValue="a" /></div> };
/** Six looks from the same component: two appearances, three variants and CSS variables. Each is answered wrong, so both marks show. */
export const Themes: Story = { render: () => <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 20 }}>
  {THEMES.map(theme => <figure key={theme.name} style={{ margin: 0, display: "grid", gap: 8 }}>
    <div style={{ padding: 22, borderRadius: 12, background: theme.page, border: "1px solid #00000014", ...theme.vars as CSSProperties }}>
      <Quiz question={{ ...pyramid, appearance: theme.appearance }} variant={theme.variant} defaultValue="a" defaultRevealed allowRetry />
    </div>
    <figcaption style={{ font: "500 13px system-ui", color: "#5b6472" }}>{theme.name}</figcaption>
  </figure>)}
</div> };
/** In another language: content and labels. */
export const Japanese: Story = { render: () => <Demo question={{ eyebrow: "第1問", question: "ギザの大ピラミッドは、およそ何年前に建てられたでしょうか?", options: [{ id: "a", label: "およそ450年前" }, { id: "b", label: "およそ4,500年前" }], answer: "b", explanation: "紀元前2560年ごろ、クフ王のために建てられました。" }}
  labels={{ check: "答えを確認", correct: "正解", incorrect: "ざんねん", retry: "もう一度", notShown: "答えはまだ表示されていません。", answer: "答え", guess: "選択" }} allowRetry /> };
/** In a film: two options over a picture; a guess is made, then the answer and one line of why. */
export const FilmTwoOptions: Story = { render: () => <Player content={filmTwo} box={{ inset: "10% 14% 30%" }} /> };
/** In a film: four options with details, on light paper, where the guess is right. */
export const FilmFourOptionsLight: Story = { render: () => <Player content={filmFour} image={forest} /> };
/** In a film: the top third of the frame, clear of a subject below it. */
export const FilmUpperThird: Story = { render: () => <Player content={filmTwo} box={{ left: "16%", right: "16%", top: "5%", height: "40%" }} /> };
/** In a film: long Japanese copy in a vertical frame, three stacked options. */
export const FilmJapaneseVertical: Story = { render: () => <Player content={filmJapanese} portrait box={{ inset: "22% 7%" }} /> };
/** In a film, reduced motion: parts switch on; nothing slides, pulses or shakes. */
export const FilmReducedMotion: Story = { render: () => <Player content={filmTwo} reduced box={{ inset: "10% 14% 30%" }} /> };
/** The film checks: an answer shown before the question can be read, and a question that is too long. */
export const FilmProblems: Story = { render: () => <Player content={{ ...filmTwo, question: "Counting from the day its last stone was set to today, about how many years old is the largest of the pyramids at Giza?", guess: undefined, revealAt: 40 }} /> };
