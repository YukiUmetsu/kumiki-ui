import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileQuizCard } from "../../registry/video/quiz-card";
import type { QuizCardContent } from "../../registry/video/quiz-card";
import { QuizCard } from "../../registry/video/quiz-card-react";
import cape from "./assets/follow-cape.jpg";
import forest from "./assets/follow-forest.jpg";

const FPS = 30, FRAMES = 420;
const tallest: QuizCardContent = { eyebrow: "Quick quiz · 01", question: "How long was this the tallest building on Earth?",
  options: [{ id: "a", label: "400 years" }, { id: "b", label: "3,800 years" }], answer: "b", guess: { option: "a", at: 96, by: "First guess" }, revealAt: 140,
  explanation: "From about 2560 BC until a cathedral spire passed it in 1311." };
const four: QuizCardContent = { eyebrow: "Round two", question: "Which of these is the oldest?", appearance: "light",
  options: [{ id: "a", label: "A stone circle", detail: "c. 3000 BC" }, { id: "b", label: "A great pyramid", detail: "c. 2560 BC" }, { id: "c", label: "A hilltop citadel", detail: "c. 1450" }, { id: "d", label: "An iron tower", detail: "1889" }],
  answer: "a", guess: { option: "a", at: 150, by: "Your pick" }, revealAt: 200, explanation: "Its first ring of ditches and posts is about five centuries older than the pyramid." };
const japanese: QuizCardContent = { eyebrow: "クイズ · 03", question: "この建物が世界で最も高い建造物だったのは、どのくらいの期間でしょうか?",
  options: [{ id: "a", label: "およそ400年" }, { id: "b", label: "およそ3,800年" }, { id: "c", label: "およそ1,200年" }], answer: "b", revealAt: 260, layout: "column",
  explanation: "紀元前2560年ごろから、1311年に大聖堂の尖塔に抜かれるまで。" };

/** Plays a card on a requestAnimationFrame clock over a photograph; scrubbing pauses it. `box` is where the card sits in the frame. */
function Player({ content, image = cape, box = { inset: "8% 12%" }, portrait = false, reduced = false }: { content: QuizCardContent; image?: string; box?: CSSProperties; portrait?: boolean; reduced?: boolean }) {
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
      {plan && <div style={{ position: "absolute", ...box }}><QuizCard plan={plan} frame={frame} reducedMotion={reduced} /></div>}
    </div>
  </div>;
}

const meta: Meta = { title: "Video production/Quiz Card", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;
/** Two options over a picture: a guess is made, then the answer and one line of why. */
export const TwoOptions: Story = { render: () => <Player content={tallest} box={{ inset: "10% 14% 30%" }} /> };
/** Four options with details, on light paper, where the guess is right. */
export const FourOptionsLight: Story = { render: () => <Player content={four} image={forest} /> };
/** In the top third of the frame, clear of a subject below it. */
export const UpperThird: Story = { render: () => <Player content={tallest} box={{ left: "16%", right: "16%", top: "5%", height: "40%" }} /> };
/** Long Japanese copy in a vertical frame: three stacked options. */
export const JapaneseVertical: Story = { render: () => <Player content={japanese} portrait box={{ inset: "22% 7%" }} /> };
/** Reduced motion: parts switch on; nothing slides, pulses or shakes. */
export const ReducedMotion: Story = { render: () => <Player content={tallest} reduced box={{ inset: "10% 14% 30%" }} /> };
/** The checks: an answer shown before the question can be read, and a question that is too long. */
export const Problems: Story = { render: () => <Player content={{ ...tallest, question: "Counting from the day it was finished to the day something taller was built, for how long was this the tallest building on Earth?", guess: undefined, revealAt: 40 }} /> };
