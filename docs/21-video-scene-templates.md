# Video scene templates

This compact catalog preserves **all 26** distinct intents in the attached scene-recipes specification. The requested filename retains “21” because recipe 21 is the initial implementation target; it is **not** a count. IDs denote semantic recipes, not claims that each exists as a complete renderer. See original scene-recipes.md for full sequence, guardrails, acceptance tests and evidence requirements.

| # | Recipe ID | Visual outcome | Reuse / status |
|---:|---|---|---|
| 1 | `question-reveal` | Question → answer | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 2 | `hidden-detail` | Focus overlooked detail | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 3 | `process-journey` | Follow ordered stages | ProcessJourney; assess/extend |
| 4 | `before-after` | Compare states of same subject | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 5 | `side-by-side` | Compare matched alternatives | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 6 | `cause-effect` | Trace intervention to outcome | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 7 | `scale-reveal` | Relate quantities to reference | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 8 | `context-to-detail` | Navigate from context to detail | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 9 | `layered-cutaway` | Reveal interior layers | Curated **Video production / Scene Templates / Layered Cutaway**: optional physical assembly, one-axis opening, material differentiation and bilingual/aspect controls. [Spec](component-specs/layered-cutaway-3d.md); human playback review pending |
| 10 | `build-and-connect` | Assemble parts and connections | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 11 | `transform-and-track` | Track shared entities through change | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 12 | `time-evolution` | Advance through milestones | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 13 | `data-story` | Reveal and annotate chart insight | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 14 | `consequence-chain` | Show downstream effects | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 15 | `decision-branch` | Follow decision outcomes | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 16 | `worked-example` | Apply operations to worked case | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 17 | `demonstration` | Show action and resulting state | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 18 | `guided-inspection` | Inspect ordered targets | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 19 | `character-discovery` | Character reacts and points | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 20 | `evidence-reveal` | Pair claim with sourced evidence | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 21 | `follow-subject-through-sections` | Persistent subject across changing worlds | **Implemented starter**: FollowSubjectThroughSections |
| 22 | `environment-reveal` | Reveal focal subject through depth | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 23 | `page-turn-story` | Turn document pages with attached content | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 24 | `orbit-world` | Orbit globe with surface anchors | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 25 | `timeline-journey` | Travel across dated events | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |
| 26 | `glass-data-reveal` | Reveal panels over layered depth | **ST1 implemented:** typed recipe + deterministic 2D / 2.5D composition, visual QA pending |

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

## Installable scene recipes

Process Journey uses the existing `process-journey` registry pack; Follow Subject Through Sections uses `follow-subject-through-sections`. The other 24 recipes are individually installable packs depending on `scene-template-foundation`, with typed semantic specifications, a pure absolute-frame evaluator, and a preview compositor. See [ST1 component spec](component-specs/scene-templates.md). The 2D/2.5D preview compositions are not proof of realistic 3D materials, finished licensed footage, measured comprehension, or verified video export.
