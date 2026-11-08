# Professional video recipes: what ad and film makers use that we do not have yet

**Research:** 2026-11-08 · **Status:** Plan only; nothing built. · **Builds on:** [31 — React Three Fiber content plan](31-react-three-fiber-content-plan.md), [Story Scenes 3D](component-specs/story-scenes-3d.md), [Film Document](component-specs/film-document.md), [Attention editing recipes](component-specs/attention-editing-recipes.md)

## Question

Kumiki already has:

- 31 scene recipes;
- 12 React Three Fiber recipes;
- 7 story scenes in 3D;
- cuts, dissolves, wipes, whips and match transitions;
- shader effects, captions and sound.

What do professional ad makers, product filmmakers and editors use that is missing? Which of those are worth building?

## How sources are graded

- **A:** primary research, peer-reviewed or reproducible.
- **B:** a platform's or a research firm's own large dataset. It is commissioned or self-reported, so it is not independent.
- **C:** practitioner, vendor or creator material. It is useful for what professionals do, but its numbers are unverified.

## What the research says

### 1. Ads that work share four habits (B)

Google's ABCD framework comes from reviewing over 11,000 ads (one Google page says 17,000) with Ipsos, with Kantar and Nielsen as reviewers. It has four parts:

- **Attention:** hook from the start.
- **Branding:** show the brand early and often.
- **Connection:** make people think or feel something.
- **Direction:** say clearly what to do next.

Google reports a 30% lift in short-term sales likelihood and 17% in long-term brand contribution (Google/Kantar, 2021). The figures are Google's own; we found no independent replication. [Google: ABCDs](https://business.google.com/us/resources/articles/abcds-of-effective-video-ads/), [Google Ads help](https://support.google.com/google-ads/answer/14783551)

### 2. The opening seconds carry most of the value (B, C)

- **Meta.** Practitioner guides cite Meta research: 47% of a video ad's value lands in the first three seconds, and 74% in the first ten. We could not find the original study. Grade C until we do. [Straight North](https://www.straightnorth.com/blog/meta-ads-creative-best-practices-that-convert/)
- **TikTok.** TikTok's own small-business playbook describes a three-part structure, **hook, body, close**, with a problem-first opener. [TikTok SMB Creative Playbook](https://ads.tiktok.com/business/library/SMB_Creative_Playbook.pdf)
- **YouTube Shorts.** Google's help page for Shorts ads asks for vertical, sound-on, "social first" assets, and says 9:16 outperforms landscape. It links music or voice-over to a conversion lift above 20% (B). A review of 2,000 Shorts ads found vertical ads perform better there. [Google Ads help: Shorts](https://support.google.com/google-ads/answer/16041697), [Google blog](https://blog.google/products/ads-commerce/vertical-video-youtube/)

### 3. Feeling sells for longer, and people, dialogue and place carry feeling (B)

- **Brand building.** Binet and Field analysed 996 campaigns in the IPA Databank. Emotional, brand-building work drove long-term effects. The often-quoted 60:40 budget split is an average, not a law, and was later refined to 62:38. [Alex Murrell summary](https://www.alexmurrell.co.uk/summaries/les-binet-and-peter-field-the-long-and-the-short-of-it), [IPA](https://ipa.co.uk/knowledge/ipa-blog/the-next-chapter-for-the-long-and-the-short-of-it/)
- **What carries the feeling.** In Orlando Wood's *Lemon* (System1), ads scored higher with more "right-brain" features: people, dialogue, glances between characters, a sense of place, scenes played out. They scored lower with more "left-brain" features: voice-over, on-screen text, rhythmic beds.
  - In a 200-ad sample, over 60% of the ads with the fewest right-brain features scored 1 star.
  - The data is correlational, and System1 sells the scoring. [System1](https://system1group.com/blog/the-timeless-importance-of-the-show), [Contagious](https://contagious.com/news-and-views/why-left-brain-thinking-is-killing-advertising-effectiveness)
- **What this means for Kumiki.** Our scenes lean on text and voice-over, the left-brain side. The gap is scenes with people and places.

### 4. Brands are recognised by distinctive assets (B)

Romaniuk (Ehrenberg-Bass) defines distinctive brand assets as non-name cues that trigger the brand: words, a story, a face, a colour, a shape. They must be famous and unique, and they work as identifiers, not message carriers. [Umbrex summary](https://umbrex.com/resources/frameworks/marketing-frameworks/distinctive-brand-assets-framework-ehrenberg-bass/), [Contagious](https://contagious.com/io/article/jenni-romaniuk-on-distinctive-assets)

What this means for Kumiki: a brand needs a slot in the film document, so a film can carry its colour, shape and mark from the first seconds to the end card.

### 5. How people learn from explainers (A)

Mayer's multimedia principles have repeated experimental support. Median effect sizes, from a 2021 table, vary by edition:

- **Coherence:** cut extraneous material. d = 0.86, 18 of 19 tests.
- **Signaling:** highlight the essential. d = 0.70.
- **Segmenting:** learner-paced segments. d = 0.67.

Effects are stronger for novices. [UNH (Mayer)](https://www.unh.edu/teaching-learning-resource-hub/sites/default/files/media/2023-06/itow-research-based-principles-for-designing-multimedia-instruction-mayer.pdf), [Chartered College](https://my.chartered.college/impact_article/how-multimedia-can-improve-learning-and-instruction/)

Kumiki's explainer rules already follow these principles. They support the guided-chart and screen-demo recipes below, where signaling is the whole job.

### 6. Animated data works when someone guides the eye (A)

In a user study, animated bubble charts were the *least* effective for analysis, compared with small multiples and traces. They worked in Rosling's talks because he told a story and primed viewers to look at one bubble before something happened to it. [Robertson et al., InfoVis 2008](https://faculty.cc.gatech.edu/~stasko/papers/infovis08-anim.pdf), [Roslingifier, Ko & Elmqvist](https://users.umiacs.umd.edu/~elm/projects/roslingifier/roslingifier.pdf)

What this means for Kumiki: an animated chart needs a narrator's cue before each event. Animation alone is not enough.

### 7. The editor's grammar (C, with a canonical text)

- **Rule of Six.** Walter Murch, *In the Blink of an Eye*, ranks emotion, story, rhythm, eye-trace, the 2D plane and 3D space; emotion matters most. [UT Austin](https://cloud.wikis.utexas.edu/wiki/spaces/rtf318/pages/80022510/Murch+s+Rule+of+Six), [No Film School](https://nofilmschool.com/2016/11/6-rules-good-cutting-according-oscar-winning-editor-walter-murch)
- **J- and L-cuts.** The next scene's sound comes in early, or the last scene's sound carries over the cut. They keep momentum and emotion across a cut. [EditShare](https://editshare.com/post/5-fundamental-editing-techniques/)
- **Speed ramps.** Fast, slow, fast, with a "ramp and hold": about 1.5 s of near-stillness so the product registers. They also hide a cut inside one fast move. [Hailuo guide](https://hailuoai.video/knowledge/kinetic-energy-high-impact-product-ads-guide); Apple's iPad Pro transitions as analysed by [IndieTips](https://indietips.com/?p=63494)
- **The oner.** A true one-take has no cuts. Most are "stitched", with cuts hidden in whip pans, darkness, or a body crossing the lens. A oner gives a sense of presence and real time. [Definition](https://definitionmagazine.com/features/technique-mastering-the-oner/), [ASC](https://theasc.com/article/one-shot-ed-sheeran-cinematography/)
- **Infinite zoom and morph.** Both are among School of Motion's essential transitions. Infinite zoom pushes into a detail that becomes the next scene; morph turns one shape into another. [School of Motion](https://www.schoolofmotion.com/blog/six-essential-motion-design-transitions-tutorial)

### 8. Product films have a shot grammar (C)

- **The three shots.** Commentary on Apple films names a close-up reveal of the product, detail shots of each new feature, and a context shot that closes the sale. [SLR Lounge](https://slrlounge.com/recreating-a-cinematic-tech-commercial-like-apple)
- **Real effects.** Apple builds real effects where it can: fire, balloons, metallic liquid, and handmade props for the MacBook Neo film. [TechCrunch](https://techcrunch.com/?p=1716679), [PetaPixel](https://petapixel.com/2026/04/24/how-apple-filmed-its-flashy-macbook-neo-video-using-handmade-props/)
- **Software products.** Guidance for software videos: show the real UI early, lead with the customer's problem, not the menu bar, and keep launch films to 30–60 s. [Hatch Studios](https://hatchstudios.com/best-practices-for-creating-engaging-saas-product-videos/), [Vidpros](https://vidpros.com/saas-explainer-video/)

### 9. Documentary and explainer formats (C)

- **The 2.5D photograph** (the "3D Ken Burns" effect): a still is cut into depth layers that move at different rates under a virtual camera. It is a documentary standard. [PetaPixel](https://petapixel.com/2017/08/09/give-still-photos-2-5d-parallax-effect-photoshop/), [STAG 2015](https://diglib7.eg.org/bitstream/handle/10.2312/stag20151296/093-101.pdf)
- **Whiteboard animation.** Vendor-reported figures say it is 15% more memorable than a talking head, but the study is unpublished. [Cognitive](https://cognitive-media.squarespace.com/blog/whiteboard-animation-research-richard-wiseman)
- **Short-form loops.** Creator guidance says replays count in Shorts retention, so an ending that leads seamlessly back to the opening can push retention past 100%. The evidence is anecdotal. [Aibrify](https://aibrify.com/en/blog/youtube-shorts-retention-curve-playbook)

## What we already have, checked in the code

- **Speed ramps** exist for clips (`attention-editing-recipes.ts`, `compileSpeedRamp`). They are not available to film scenes or 3D shots.
- **2.5D relief.** `craft/image-relief.ts` and `craft/depth-composite.ts` turn images into depth relief, and the shader effect `livingStill` animates a still. There is no film recipe for a guided 2.5D photograph.
- **Kinetic words.** `KineticWords` exists in the stage kit.
- **Missing entirely:**
  - a cursor-driven screen demo;
  - an end card with a call to action;
  - testimonials;
  - infinite zoom;
  - a guided motion chart;
  - a pass-by transition;
  - split audio edits;
  - loop endings;
  - a light-sweep product reveal;
  - a brand slot in the film document.

## Proposed recipes, ranked

| Rank | Recipe | What it does | Evidence | Reuses | Effort |
|---|---|---|---|---|---|
| **P0** | **Ad formats** (film level) | A brief becomes a whole film document in a proven structure: `hook-body-close`, `problem-solution`, `before-after`, `three-reasons`, `myth-vs-fact`, `social-proof`. `film:check` gains ABCD checks (warnings): a hook within 3 s, the brand within the first 5 s, a call to action in the last scene, captions for sound-off, the 9:16 safe zone | 1, 2, 4 (B) | All existing scenes, the film document, presets | Medium |
| **P0** | **End card** | The brand's mark resolves with its colour and shape, then one call to action and a URL or handle. Held 2 s or more and legible at the platform's size | 1 Direction, 4 (B) | `markSting` and `resolveIntoMark` shader moments, `StudioCaption` | Small |
| **P0** | **Screen demo** | Real UI (an image, or live React) with a choreographed cursor: moves, clicks with ripples, typing. The camera zooms to the active region and eases out, as screen-recording tools do. Callouts point at the change | 5 Signaling (A), 8 (C) | `screen-surface`, `ScreenComesAlive` (3D variant), callouts | Medium |
| **P1** | **Light Sweep** (3D) | The product starts in darkness; one soft strip light glides across it and draws its form and materials, then a hero hold. The classic close-up reveal of a product film | 8 (C) | `FiberHeroStudio`, the `rim` look, hero assets | Small |
| **P1** | **Speed ramp for scenes** | A time map on any scene or 3D shot: fast, slow, fast, with a ramp-and-hold, and a ramped cut that hides the join between two scenes | 7 (C) | `compileSpeedRamp`, recipes driven only by `frame` | Small |
| **P1** | **Guided motion chart** | Rosling-style bubbles over time with a year counter and trails. Before each event a cue primes the eye ("watch this one"), and other bubbles dim. The check refuses an event with no cue | 6 (A) | `data-story`, the caption performer | Medium |
| **P1** | **Split edits (J and L)** | `transition.audioLead` and `audioTail` in frames: the next scene's sound starts early, or the last one's carries over the cut | 7 (C, canonical) | Audio lanes in the film document | Small |
| **P2** | **Infinite zoom** | Each scene sits inside a region of the one before (a photo inside a screen inside a room). The camera pushes through without a cut | 7 (C) | `FocusRegion`, image scenes, `StepInside` (3D) | Medium |
| **P2** | **Pass-by and stitched oner** | A transition hidden behind a foreground object crossing the lens, or a whip, so a run of scenes reads as one take | 7 (C) | Cut director, whip transition | Small |
| **P2** | **Social proof** | Short quotes as cards, each with a face or initials, a rating that counts up, then a total ("4.8 from 2,100 reviews"). The check limits it to three quotes and enforces reading time | 2 (C, TikTok playbook) | Caption performer, card stages | Small |
| **P2** | **People in a place** | Two characters in a setting with dialogue and glances, per *Lemon*: the right-brain features our scenes lack | 3 (B) | `character-presenter`, everyday scenes | Large |
| **P3** | **Living photograph** | A guided 2.5D push into a photograph: depth layers, parallax, a slow rack of focus, a caption on the subject | 9 (C) | `image-relief`, `depth-composite`, `livingStill` | Small |
| **P3** | **Loop ending** | A film setting that checks the last frame against the first and proposes a matching end move, for Shorts replays | 9 (C, anecdotal) | Film review frames | Small |
| **P3** | **Draw-on explainer** | Line art draws itself, with a pen tip following the stroke | 9 (C, vendor) | Stroke reveals in the stage kit | Small |

## Suggested order

1. **Ad formats, end card, brand slot.** Together they turn Kumiki's scenes into complete ads, and add the four ABCD checks. Highest value for least new art.
2. **Screen demo.** It is the format software makers ask for most, and the one Kumiki lacks entirely.
3. **Light Sweep, speed ramp, split edits.** These are small additions to what exists, and each lifts every product film.
4. **Guided motion chart.** The research is strongest here (grade A), with a clear rule to enforce.
5. **P2 and P3** as films need them.

## Not recommended

- **Copying platform templates.** No recipe should copy one platform's look. Every format above is structural and brand-neutral.
- **Fixed ratios as rules.** We should not encode numbers like 60:40 or "47% in three seconds" as hard rules. They are averages or unverified, so they belong in warnings, not errors.
- **AI-generated footage as a recipe.** Kumiki's films are rendered from code and assets with known licences.

## Open questions for the owner

- Should ad formats compile a brief into a film document as a new command (`film:ad`), or be documented starting films (`film:example`)?
- Is a screen demo more useful from images (a screenshot per state) or from live React UI rendered in the stage?
