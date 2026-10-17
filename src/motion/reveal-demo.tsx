import { useState } from "react";
import { createRevealTimeline } from "../../registry/motion/progressive-reveal";
import { ProgressiveReveal, RevealItem, RevealLayer } from "../../registry/motion/progressive-reveal-react";
import { StoryboardShots } from "../../registry/motion/storyboard-shots";
import type { Storyboard } from "../../registry/motion/storyboard";
import { MotionScrubber, usePrefersReducedMotion } from "./react";

const REVEAL = createRevealTimeline({
  id: "staged-explanation", fps: { num: 30, den: 1 }, durationFrames: 450,
  cues: [{ id: "introduce", frame: 0 }, { id: "source", frame: 45 }, { id: "process", frame: 105 }, { id: "result", frame: 165 }, { id: "connect", frame: 225 }, { id: "resolve", frame: 300 }],
  steps: [
    { id: "title", at: { cue: "introduce" }, effect: "fade" },
    { id: "source", at: { cue: "source" }, focusUntil: { cue: "result" }, subduedOpacity: 0.55 },
    { id: "process", at: { cue: "process" }, focusUntil: { cue: "connect" }, subduedOpacity: 0.55 },
    { id: "result", at: { cue: "result" } },
    { id: "connections", at: { cue: "connect" }, effect: "fade" },
    { id: "summary", at: { cue: "resolve" }, effect: "fade" },
  ],
});

const BEATS = [
  [0, 45, "Set the idea", "Introduce the visual objective before adding detail."],
  [45, 105, "Introduce the source", "Reveal the first element in its final layout position."],
  [105, 165, "Show the process", "Bring in the second element while the source remains stable."],
  [165, 225, "Reveal the result", "Emphasize the new result and reduce the source's visual weight."],
  [225, 300, "Connect the system", "Reveal the relationships once their endpoints are established."],
  [300, 450, "Hold the explanation", "Keep the completed scene readable and show its concise summary."],
] as const;

const BOARD: Storyboard = {
  schemaVersion: 1, id: "reveal-story", title: "A staged explanation", fps: REVEAL.fps, durationFrames: 450,
  shots: BEATS.map(([start, end, title, objective], index) => ({
    id: `reveal-beat-${index}`, sceneRef: "explanation", startFrame: start, durationFrames: end - start,
    claim: title, visualObjective: objective, focusTarget: "explanation", onScreenLabels: [title], staticFallback: objective,
  })),
};

export function RevealDemo() {
  const [frame, setFrame] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  return <div className="flex min-w-0 flex-col gap-5">
    <ProgressiveReveal timeline={REVEAL} frame={frame} className="flex min-w-0 flex-col gap-4">
      <svg viewBox="0 0 1200 640" role="img" aria-label="A source, a process and a result introduced in sequence, then connected" className="w-full rounded-surface border border-border bg-surface" style={{ color: "var(--km-text-primary)" }}>
        <RevealLayer targetId="title"><text x="80" y="100" fontFamily="inherit" fontSize="38" fill="currentColor">One idea, revealed in stages.</text></RevealLayer>
        <RevealLayer targetId="connections">
          <g fill="none" stroke="var(--km-border-strong)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 335 300 H 455 M 439 284 L 455 300 L 439 316" />
            <path d="M 745 300 H 865 M 849 284 L 865 300 L 849 316" />
          </g>
        </RevealLayer>
        <RevealLayer targetId="source">
          <g transform="translate(220 300)">
            <rect x="-100" y="-100" width="200" height="200" rx="30" fill="var(--km-surface-subtle)" stroke="var(--km-border-strong)" strokeWidth="2" />
            {[-36, 0, 36].map((y) => <path key={y} d={`M -45 ${y} H 45`} stroke="var(--km-text-primary)" strokeWidth="12" strokeLinecap="round" />)}
            <text y="160" textAnchor="middle" fontSize="30" fontFamily="inherit" fill="currentColor">Source</text>
          </g>
        </RevealLayer>
        <RevealLayer targetId="process">
          <g transform="translate(600 300)">
            <circle r="110" fill="var(--km-action-primary)" />
            <circle r="54" fill="none" stroke="var(--km-surface-default)" strokeWidth="18" strokeDasharray="64 20" />
            <text y="160" textAnchor="middle" fontSize="30" fontFamily="inherit" fill="currentColor">Process</text>
          </g>
        </RevealLayer>
        <RevealLayer targetId="result">
          <g transform="translate(980 300)">
            <rect x="-100" y="-100" width="200" height="200" rx="30" fill="var(--km-surface-subtle)" stroke="var(--km-action-primary)" strokeWidth="4" />
            <path d="M -45 0 L -10 35 L 50 -35" fill="none" stroke="var(--km-action-primary)" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
            <text y="160" textAnchor="middle" fontSize="30" fontFamily="inherit" fill="currentColor">Result</text>
          </g>
        </RevealLayer>
        <RevealLayer targetId="summary"><text x="600" y="565" textAnchor="middle" fontFamily="inherit" fontSize="28" fill="currentColor">Establish the elements. Then explain their relationship.</text></RevealLayer>
      </svg>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["source", "Stable placement", "Elements reserve their space before appearing, keeping the composition still."],
          ["process", "Independent timing", "Each entrance follows an authored frame or named cue."],
          ["result", "Shared rendering", "SVG layers and HTML content read the same reveal state."],
        ].map(([id, title, copy]) => <RevealItem targetId={id} key={id} className="rounded-surface border border-border bg-surface p-4">
          <h3 className="mb-2 text-body font-medium">{title}</h3><p className="text-body-sm text-muted-foreground">{copy}</p>
        </RevealItem>)}
      </div>
    </ProgressiveReveal>
    <MotionScrubber timeline={REVEAL} frame={frame} onFrame={setFrame} label="Reveal frame" />
    <StoryboardShots storyboard={BOARD} frame={reducedMotion ? 449 : frame} onFrameChange={setFrame} label="Reveal storyboard beats" />
  </div>;
}
