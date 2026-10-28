# Question Reveal Scene

`question-reveal` is a frame-addressable question, subject and answer composition,
graded like a film plate rather than laid out like a slide. Supply a
`SceneTemplateSpec<"question-reveal">` with a question, subject and answer; an optional
`answerVisual` replaces the subject at the reveal cue. The caller owns playback and
supplies `frame`; the component creates no clock.

**Beats.** `cueFrames` are *dock*, *reveal* and *resolve*.

- **Hook (0 → dock):** the subject fills the stage, the exposure lifts and the question
  rises word by word from a mask. `questionEmphasis` (a substring of the question) sets the
  stakes in the accent colour and gets a marker sweep once the line has settled.
- **Tension (dock → reveal):** the question docks into a single editorial line. In
  landscape it sits in anamorphic bars that close as it docks. The camera pushes in
  slowly, the vignette tightens, and a fuse line fills over the 48 frames before the
  reveal.
- **Reveal:** the answer lands. `revealImpact` punctuates it: `"flash"` adds an exposure
  bloom, `"kick"` adds the bloom plus a decaying camera kick. The default is `"none"`.
- **Resolve:** earlier answer steps recede so the final statement leads, and the question
  stays docked above it.

**Answer steps.** `answerSteps` delivers the answer as ordered beats. A step without
`frame` lands on the reveal cue, so a cause can arrive on the shot that shows it. Each
step's `marker` (`up`, `down`, `left`, `right`, `dot`, `none`) is the glyph beside its text;
match it to the mark that proves the step. `answer` remains the canonical accessible text
and is announced once the reveal is reached.

**Annotations: custom marks with timing.** Nothing about the proof is built in. Pass
`annotations`, a serializable list from the shared SA1 module
(`registry/video/subject-annotations.ts`):

| kind | geometry | options |
|---|---|---|
| `arrow` | `from`, `to` | `flow` sends a pulse from tail to tip |
| `path` | `points` (≥ 2) | `smooth`, `arrowhead`, `flow`, `headingWindow` (arrowhead heading averaged over this fraction of the path behind the tip, default 0.05), `maxTurn` (cap on arrowhead turn in degrees per frame, replayed from the mark's first frame so it stays seekable) |
| `ring` | `center`, `radius` | `pulse` |
| `label` | `anchor`, `text` | `side`, `distance`; flips away from a near frame edge |
| `spotlight` | `center`, `radius` | `dim` |

All marks take `id`, `color` (default: scene accent), `weight`, and `space`. `"subject"`
(the default) means normalized subject coordinates that ride the camera and the cover
crop; give the subject its intrinsic `width`/`height`. `"stage"` is fixed to the frame.

`timing` binds a mark to the story rather than to raw frames: `at` and `until` accept
`"start"`, `"dock"`, `"reveal"`, `"resolve"`, `{ step: "id" }` or a frame. They take
`offset`/`untilOffset`, `enter` and `exit` lengths, and `ease` (`expo`, `cubic`, `back`,
`linear`). When a cue or step frame moves, every mark bound to it moves too. Use a
frame for `until` when a mark must retire before a cut in the footage. Validation
rejects unknown steps, empty windows and points outside the subject.

```ts
annotations: [
  { id: "force", kind: "arrow", from: { x: .6, y: .54 }, to: { x: .6, y: .34 }, flow: true,
    timing: { at: { step: "thrust" } } },
  { id: "detail", kind: "ring", center: { x: .52, y: .3 }, radius: .07, pulse: true,
    timing: { at: "dock", offset: 12, until: { step: "thrust" }, ease: "back" } },
]
```

**Framing preflight.** A point inside a 16:9 subject can fall outside a 9:16 crop. Run
`annotationFraming(annotations, subject, width, height)` for each output size before
rendering. It is CPU-only and lists every mark that leaves that frame.

**Host overlays.** For motion that JSON cannot express (Lottie, a 3D inset, a bespoke
SVG), pass `renderOverlay` to the scene. It is called once per space with `frame`,
`beats`, `toStage(point)` and `state(timing)`: the same mapping and timing resolver the
annotations use, so custom work stays frame-exact and in sync. Like `renderAsset`, it is a
runtime slot and is never saved in the spec.

**Look and copy.** `look.letterbox` (landscape only, default on), `look.grain` and
`look.vignette` (0..1) tune the film treatment. `questionLabel` sets the eyebrow beside
the docked question (default `"Question"`; set it to `""` to hide it), so localized
scenes need no code change.

**Typography and safety.** Type sizes resolve against the stage container, so preview
and export agree. Display sizes are capped so the longest word always fits its column,
which means words never break internally and are never silently clipped. Reduced
motion removes the camera move, word motion, grain drift, flash and kick, and shows
each beat in its settled state at or after its frame. The component forwards its ref,
DOM props, className and style. Use the host `renderAsset` slot for a frame-addressable
subject renderer.

Storybook: **Video production / Scene Templates / Question Reveal**. The demo uses
an 18-second excerpt of [Rocket Take Off Countdown](https://www.pexels.com/video/rocket-take-off-countdown-854259/),
credited to Pixabay on Pexels and marked CC0. The clip is archival footage;
its original audio is replaced with an edited [NASA STS-131 launch recording](https://www.nasa.gov/historical-sounds/) from a different mission. The sound is illustrative, not the source recording of the pictured launch. The demo cuts to 0.3× slow motion on the liftoff
(`resolveSpeedRampFrame` keys) and drops the audio pitch with it. The browser video
clock drives the preview frame through that ramp; the interactive demo itself does not
export, though every seeked frame is exact. Play, pause, seeking,
portrait and reduced-motion controls are available. Production media needs its
own license, source and third-party rights checks.

The example's approximate 4.5-million-pound liftoff weight and thrust mechanism
are documented by [NASA's Shuttle reference](https://www.nasa.gov/reference/the-space-shuttle/)
and [NASA Glenn's rocket thrust explanation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/rocket-thrust/).
The reference weight varies with payload and consumables; the footage is not
identified here as a specific mission.

The shared foundation also contains other experimental recipe renderers; only
Question Reveal is registered here as an individual recipe. Human visual and audio
acceptance, text collision checks for arbitrary authored copy, and an exported video
remain release gates. The example is not a claim of premium production signoff.
