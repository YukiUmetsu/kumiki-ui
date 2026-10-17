# Progressive Reveal

**Status:** development implementation; expanded tests, screenshots, accessibility/visual review
and clean registry installation deferred under the user's implementation-first instruction.

`createRevealTimeline({ id, fps, durationFrames, cues?, steps })` compiles staged explanation
elements into existing MG1 tracks and version-1 `fade-reveal` / `rise-reveal` presets. There is no
new timeline or clock. Step IDs identify semantic elements; `at` and optional `focusUntil` accept
integer frames or `{ cue: string }`. IDs/cues, times, travel and opacity are checked with actionable
errors. Each entrance occupies `durationFrames` including its first/last frame (default 24,
minimum 2); it must fit the composition. Travel defaults to 32 design pixels, bounded to 0–400.

After entering, the element holds. `focusUntil` begins a dim over the same duration; default
`subduedOpacity` is 0.35, configurable from 0 to 1. The element is retained in place. Dimming must
start after entrance completion and fit the composition. No disappearance/exit mode is introduced.

`ProgressiveReveal` evaluates once and shares state with `RevealItem` (DOM div), `RevealLayer`
(SVG group), and `useRevealState(id)`. Compound items can appear anywhere inside the provider,
including inside an SVG. Native props, className and refs forward. Position static SVG geometry
inside a nested group; the reveal wrapper owns its animated translate and opacity. DOM wrappers
likewise own animated opacity/translate. Consumers own scene layout and tokens; no mandatory
global stylesheet or app provider is required by the reveal adapter itself.

```tsx
const timeline = createRevealTimeline({
  id: "explanation", fps: { num: 30, den: 1 }, durationFrames: 240,
  cues: [{ id: "introduce", frame: 30 }, { id: "next", frame: 100 }],
  steps: [
    { id: "first", at: { cue: "introduce" }, focusUntil: { cue: "next" }, subduedOpacity: 0.6 },
    { id: "second", at: { cue: "next" }, effect: "fade" },
  ],
});
<ProgressiveReveal timeline={timeline} frame={frame}>
  <RevealItem targetId="first">First element</RevealItem>
  <svg viewBox="0 0 600 400">
    <RevealLayer targetId="second"><circle cx={300} cy={200} r={80} /></RevealLayer>
  </svg>
</ProgressiveReveal>;
```

Future/entering DOM items are inert and excluded from the accessibility tree until entrance completes;
fully hidden items preserve layout while using visibility hidden. Dimmed elements remain accessible
while opacity is positive. Reduced motion evaluates the final frame. Consumers should supply a
complete accessible scene summary and choose subdued opacity that retains sufficient contrast.
SVG layers are intended for non-interactive scene graphics; use DOM items for focusable controls.
No live announcements occur on every playback frame. Missing targets/providers throw descriptive
errors instead of drawing incorrect states.

Demo: `/#/storyboard/reveal`, Storybook **Motion / React / Progressive Explanation**. SVG objects
and HTML explanation cards share IDs/timing; a storyboard selects reveal beats using the same
integer frame. No packages added. Future additions can compose this with `diagram-stage`,
`data-flow`, code and camera tracks rather than replacing the existing motion engine.

Executed: `npm run typecheck` and `npm run build` passed. The existing Vite chunk-size warning
remains. Build log: `/tmp/kumiki-reveal-build.log`. No tests or screenshots were run.
