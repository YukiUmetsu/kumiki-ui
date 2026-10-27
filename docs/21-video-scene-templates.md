# Video scene templates

This compact catalog preserves **all 26** distinct intents in the attached scene-recipes specification. The requested filename retains “21” because recipe 21 is the initial implementation target; it is **not** a count. IDs denote semantic recipes, not claims that each exists as a complete renderer. See original scene-recipes.md for full sequence, guardrails, acceptance tests and evidence requirements.

| # | Recipe ID | Visual outcome | Reuse / status |
|---:|---|---|---|
| 1 | `question-reveal` | Question → answer | Reveal choreography; assess/extend |
| 2 | `hidden-detail` | Focus overlooked detail | Camera/focus primitives; assess/extend |
| 3 | `process-journey` | Follow ordered stages | ProcessJourney; assess/extend |
| 4 | `before-after` | Compare states of same subject | Synchronized transformations; assess/extend |
| 5 | `side-by-side` | Compare matched alternatives | Comparison primitives; assess/extend |
| 6 | `cause-effect` | Trace intervention to outcome | Graph/reveal primitives; assess/extend |
| 7 | `scale-reveal` | Relate quantities to reference | Scale/camera primitives; assess/extend |
| 8 | `context-to-detail` | Navigate from context to detail | Camera focus; assess/extend |
| 9 | `layered-cutaway` | Reveal interior layers | Layered scene; assess/extend |
| 10 | `build-and-connect` | Assemble parts and connections | DiagramStage / MotionDirector; assess/extend |
| 11 | `transform-and-track` | Track shared entities through change | Synchronized transformations; assess/extend |
| 12 | `time-evolution` | Advance through milestones | Timeline primitives; assess/extend |
| 13 | `data-story` | Reveal and annotate chart insight | Chart primitives; assess/extend |
| 14 | `consequence-chain` | Show downstream effects | Graph primitives; assess/extend |
| 15 | `decision-branch` | Follow decision outcomes | Branch graph; assess/extend |
| 16 | `worked-example` | Apply operations to worked case | Step / text primitives; assess/extend |
| 17 | `demonstration` | Show action and resulting state | Demonstration stage; assess/extend |
| 18 | `guided-inspection` | Inspect ordered targets | Camera focus; assess/extend |
| 19 | `character-discovery` | Character reacts and points | Character rig / cues; assess/extend |
| 20 | `evidence-reveal` | Pair claim with sourced evidence | Source / callout primitives; assess/extend |
| 21 | `follow-subject-through-sections` | Persistent subject across changing worlds | **Implemented starter**: FollowSubjectThroughSections |
| 22 | `environment-reveal` | Reveal focal subject through depth | Cinematic reveal primitives; assess/extend |
| 23 | `page-turn-story` | Turn document pages with attached content | New composition; assess/extend |
| 24 | `orbit-world` | Orbit globe with surface anchors | 3D sphere/camera primitives; assess/extend |
| 25 | `timeline-journey` | Travel across dated events | Timeline primitives; assess/extend |
| 26 | `glass-data-reveal` | Reveal panels over layered depth | Chart + layered panels; assess/extend |

## Shared contract

- Serializable, versioned specs with stable scene/subject IDs, explicit asset refs, aspect ratio, rational FPS, duration in frames, deterministic seed (optional) and user overrides.
- Validate semantic inputs and timing; compile deterministic random-access frames and diagnostics. Missing evidence/assets must be diagnosed rather than invented.
- Keep persistent objects identifiable; provide intentional cuts and legible caption-safe composition. Support 16:9 and 9:16, static and reduced-motion fallbacks.
- Expose subject/path, backgrounds, transitions, parallax, pace, palette, and framing independently; preserve asset provenance and render review requirements.
- Audio cues are metadata; downstream production performs sourcing, ducking, mixing, captioning and verification.

## Recommended order

1. Foundation: question-reveal, hidden-detail, process-journey, before-after, context-to-detail, build-and-connect.
2. Explanation: side-by-side, cause-effect, scale-reveal, time-evolution, data-story, guided-inspection.
3. Cinematic: follow-subject-through-sections, timeline-journey, environment-reveal, orbit-world.
4. Extended: glass-data-reveal, page-turn-story, and remaining templates.

**Definition of done:** a real consumer can compile, preview, export and edit the scene; validate first/transition/last frames, accessibility, clipping, provenance, invalid inputs and reduced motion. A standalone Storybook demo is not sufficient.
