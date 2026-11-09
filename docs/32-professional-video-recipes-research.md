# Professional video recipes: what ad and film makers use that we do not have yet

**Research:** 2026-11-08, widened the same day to motion design, film language and storytelling · **Status:** Plan only; nothing built. · **Builds on:** [31 — React Three Fiber content plan](31-react-three-fiber-content-plan.md), [Story Scenes 3D](component-specs/story-scenes-3d.md), [Film Document](component-specs/film-document.md), [Attention editing recipes](component-specs/attention-editing-recipes.md)

## Question

Kumiki already has:

- 31 scene recipes;
- 12 React Three Fiber recipes;
- 7 story scenes in 3D;
- cuts, dissolves, wipes, whips and match transitions;
- shader effects, captions and sound.

What do professional ad makers, product filmmakers, motion designers, editors and storytellers use that is missing? Which of those are worth building, and which are better as checks?

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

## Broader research: motion design, film language and storytelling

### 10. Motion design: staged change helps people follow it (A, with practice guides)

- **Staged transitions.** In two controlled experiments, animated transitions between chart states improved graphical perception over static ones. Simple staging, one kind of change at a time, was preferred and helped. For open-ended analysis, animation was still slower than small multiples. [Heer & Robertson, InfoVis 2007](https://homes.cs.washington.edu/~jheer/files/2007-AnimatedTrans-InfoVis.pdf), [UW CSE442](https://courses.cs.washington.edu/courses/cse442/24au/lectures/CSE442-Animation.pdf)
- **Motion systems.** Material and Fluent describe the same grammar:
  - Speed is duration plus easing.
  - Short, standard easing reads as functional; longer, emphasized easing as expressive.
  - Arc paths feel more dramatic than straight ones.
  - A container transform lets one element grow into the next view.
  - Elements moving together at once read as ambiguous, so motion is choreographed in an order.

  [Material: motion customization](https://material.io/design/motion/customization.html), [Google Design](https://medium.com/google-design/33089196e6c2), [Fluent 2 motion](https://fluent2.microsoft.design/motion), [SAP Fiori](https://www.sap.com/design-system/fiori-design-web/v1-96/foundations/visual/motion-design)
- **Disney's principles in motion graphics.** Those that matter most here are easing, timing, anticipation, and follow-through with overlap: a small overshoot that settles, and parts arriving at different rates. Practitioners add "when in doubt, animate less". [Smashing Magazine](https://www.smashingmagazine.com/2012/10/motion-and-animation-a-new-mobile-ux-design-material), [IxDF](https://ixdf.org/literature/article/ui-animation-how-to-apply-disney-s-12-principles-of-animation-to-ui-design) (C)
- **Moving text.** Eye-tracking found real differences in attention between kinetic type styles. A 2024 study reports a speed range and interpolation methods that help comprehension, while others hinder it. Text still moving while it is read lowers comprehension. [Kuraitytė, Bessemans & Nuyts, *Visible Language* 2020](https://documentserver.uhasselt.be/bitstream/1942/32698/1/impact-of-kinetic-typography-on-readers-attention.pdf), [GRID 2024](https://www.grid.uns.ac.rs/symposium/download/2024/89.pdf) (B, small studies)
- **Title sequences.** Saul Bass condensed a film into one symbol. Kyle Cooper's titles work as a metaphor for the story, and *Se7en*'s were built by hand on a tabletop. [Frame.io](https://blog.frame.io/2018/06/04/iconic-movie-title-sequences/), [Art of the Title: Se7en](https://www.artofthetitle.com/title/se7en/), [Criterion](https://www.criterion.com/current/posts/6937-credit-where-it-s-due-the-father-of-the-title-sequence) (C)

### 11. Film language and what it does to viewers (A, mixed)

- **Rhythm.** In 150 popular films (1935–2005), shot lengths in films after 1980 increasingly follow a 1/f pattern, a mix of long and short that mirrors attention. Average shot length has fallen to about four seconds. Cutting finds no link with how much people liked the films, so this is rhythm, not quality. [APS](https://www.psychologicalscience.org/news/were-only-human/focusing-on-the-cinematic-mind.html), [Cornell](https://news.cornell.edu/node/271563), [Phys.org](https://phys.org/news/2010-02-hollywood-movies-mathematical-formula.amp)
- **The Kuleshov effect.** The context cut before a neutral face shifts how viewers read the face (36 viewers, 24 sequences). The effect is real but modest, and earlier replications were mixed. [Barratt et al., *Perception* 2016](https://pubmed.ncbi.nlm.nih.gov/27056181/), [Frontiers 2017](https://www.frontiersin.org/article/10.3389/fpsyg.2017.01684/full)
- **Music.** Positive or negative music biased how viewers interpreted and later remembered ambiguous clips, in the music's direction. When music *foreshadowed* an outcome, a mismatch between music and picture improved memory. [Boltz 2001](https://acnpsearch.tweb-dev.unibo.it/singlejournalindex/82968815), [Ireland (White Rose)](https://eprints.whiterose.ac.uk/115828/3/Ireland.pdf)
- **Camera moves.** In one experiment (44 viewers), moving cameras raised involvement more reliably than emotion. Push-ins often stay below conscious notice. Practice uses them at a decision or realisation. [Frontiers in Neuroscience 2023](https://www.frontiersin.org/articles/10.3389/fnins.2023.1160843/full), [No Film School](https://nofilmschool.com/2017/02/visual-and-emotional-effects-using-dolly-and-zoom-shots-your-film)
- **Colour scripts.** Pixar paints a strip of small frames to set each beat's palette across the film: muted for the dark beats, bright for the happy ones (*Finding Nemo*), and shifted between worlds (*Up*). [StudioBinder](https://www.studiobinder.com/blog/what-is-a-color-script-definition/), [TED Ideas](https://ideas.ted.com/how-color-helps-a-movie-tell-its-story/) (C)
- **Cutting to the beat.** Viewers watching music videos cut on and off the beat showed attentional differences. Synchrony is judged by *predicting* motion. [Eg & Behne 2015](https://www.frontiersin.org/articles/10.3389/fpsyg.2015.00736/full), [Takehana et al. 2019](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6711538/) (A, partial)

### 12. Why stories persuade and hold attention (A)

- **Transportation.** A meta-analysis of 132 effect sizes (76 articles, over 21,000 participants) found that being transported into a story changes beliefs, attitudes and intentions. Three story features drive it: an imaginable plot, identifiable characters, and life-likeness. [van Laer et al., *JCR* 2014](https://openaccess.city.ac.uk/id/eprint/6755/1/SSRN-id2033192.pdf), [OnFiction](https://www.onfiction.ca/2014/02/research-bulletin-summarizing-over.html)
- **Curiosity.** Curiosity is the felt gap between what one knows and wants to know (Loewenstein 1994). In a high-curiosity state before an answer, memory and reward regions are more active, and even incidental information shown then is remembered better. [Gruber, Gelman & Ranganath, *Neuron* 2014](https://shohamylab.zuckermaninstitute.columbia.edu/sites/default/files/2017-02/Curiosity.pdf), [PMC review](https://pmc.ncbi.nlm.nih.gov/articles/PMC6891259)
- **Emotional arcs.** A computational study of about 1,700 books found six basic shapes: rise, fall, fall-rise ("man in a hole"), rise-fall, rise-fall-rise and fall-rise-fall. [Reagan et al. 2016](https://arxiv.org/pdf/1606.07772) (A, books, not films)
- **And, But, Therefore.** Trey Parker rewrites scenes joined by "and then" into "but" or "therefore". Randy Olson made it a science-communication template, from Frank Daniel's screenwriting teaching. [NCSE](https://ncse.ngo/and-therefore-randy-olson-and-art-science-storytelling-part-1), [Sigma Xi](https://www.sigmaxi.org/keyed-in/post/keyed-in/2017/07/25/developing-effective-messages-means-developing-a-deep-understanding-of-narrative-an-interview-with-scientist-turned-filmmaker-randy-olson) (C)
- **The Story Spine.** "Once upon a time… every day… one day… because of that… until finally…", from Kenn Adams' improv teaching, and rule 4 in Emma Coats' list of Pixar guidelines. [Open Culture](https://www.openculture.com/2013/03/pixars_22_rules_of_good_storytelling.html), [TCK](https://www.tckpublishing.com/story-spine/) (C)

### 13. Neighbouring fields (A, with limits)

- **Visual rhetoric.** Visual rhyme, antithesis, metaphor and pun led to more elaboration and a warmer attitude to the ad without being harder to understand. The benefit for metaphor and pun vanished for viewers without the cultural knowledge to decode them. [McQuarrie & Mick, *JCR* 1999](https://econpapers.repec.org/RePEc:oup:jconrs:v:26:y:1999:i:1:p:37-54). Phillips and McQuarrie classify visual metaphors as simile, hybrid or contextual. [Lit. summary](https://marketingmanagementjournal.scholasticahq.com/article/151065.pdf)
- **Faces and gaze.** In banner ads, a face looking at the product raised attention to the product and the text. A face looking at the viewer held attention on itself and weakened memory for the brand. [Sajjacholapunt & Ball, *Frontiers* 2014](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.00166/full)
- **Joy in bursts.** Several short bursts of joy held viewers better than one sustained stretch (facial-expression coding and eye tracking). [Teixeira, Wedel & Pieters (HBS summary)](https://www.library.hbs.edu/working-knowledge/creating-online-ads-we-want-to-watch)
- **Humour.** A meta-analysis of 369 correlations found that humour raises attention and attitude to the ad, but lowers credibility. Other experiments show humour can steal recall from the brand. [Eisend, *JAMS* 2009](https://link.springer.com/article/10.1007/s11747-008-0096-y)
- **Video essays.** Practitioners build them on one thesis and a montage of evidence: freeze frames, annotation, side-by-side comparison, archival footage. They keep graphics restrained. [StudioBinder](https://www.studiobinder.com/blog/what-is-a-video-essay-examples/), [Every Frame a Painting](https://www.wikiwand.com/en/articles/Every_Frame_a_Painting) (C)

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
  - a brand slot in the film document;
  - object-to-object visual similes;
  - cold opens;
  - staged chart morphs;
  - container transforms;
  - title sequences;
  - beat sync;
  - a colour script view.
- **Already in Kumiki:** story checks for opened and closed questions, turns and the hero subject (`checkStory`); the explainer rule of stable captions; and a `match` transition that carries a subject box.

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
| **P1** | **Becomes** (3D) | Object A dissolves into particles that re-form as object B, a visual simile in time ("a coin becomes a clock"). Phillips and McQuarrie's simile; the hybrid form fuses the two | 13 visual rhetoric (A) | `ManyIntoOne` surface sampling, the catalog | Small |
| **P1** | **Cold open** (film level) | The film opens on a few seconds of its own climax, then cuts back with a title ("Two days earlier"). The checker warns when the flash-forward gives away the answer rather than raising a question | 12 curiosity (A) | Scenes driven only by `frame`; a scene can replay another's moment | Small |
| **P1** | **Chart morph** | A chart changes form in stages (rescale, then values, then type: bar to dot to line), one change at a time, with the object of interest kept identifiable | 10 staged transitions (A) | `data-story`, `infographic-system` | Medium |
| **P1** | **Container transform** | A card, tile or screen grows into the next scene, with its corners, colour and content handing over. Stronger than a dissolve when one thing becomes the place | 10 motion systems (C) | `match` transition, subject boxes | Small |
| **P2** | **Title sequence** | A film-opening built on one symbol for the story (Bass), with the title and credits set into it, and an optional tactile, hand-made texture (Cooper) | 10 titles (C) | Kinetic words, shader effects, 3D props | Medium |
| **P2** | **Annotated footage** | The video-essay move: play, freeze, draw circles, arrows and a label on the frame, and compare two frames side by side. Built on one thesis | 13 video essays (C), 5 signaling (A) | `subject-annotations`, `evidence-reveal`, `side-by-side` | Small |
| **P2** | **Reaction cut** | A short reaction from a character after an object or event, to steer how it reads. Gaze toward the product, not the camera | 11 Kuleshov (A, modest), 13 gaze (A) | `character-presenter` | Medium |
| **P2** | **Beat sync** | Cuts, accents and entrances snap to the beats of the music bed, found offline when the bed is chosen | 11 sync (A, partial) | Sound catalog, beds, accent placement | Medium |
| **P3** | **Grade arc** | Each scene declares a mood. The film's grade follows a colour script, and review renders the strip so the arc can be seen | 11 colour scripts (C), 11 music (A) | Shader effects, review contact sheets | Small |
| **P3** | **Living photograph** | A guided 2.5D push into a photograph: depth layers, parallax, a slow rack of focus, a caption on the subject | 9 (C) | `image-relief`, `depth-composite`, `livingStill` | Small |
| **P3** | **Loop ending** | A film setting that checks the last frame against the first and proposes a matching end move, for Shorts replays | 9 (C, anecdotal) | Film review frames | Small |
| **P3** | **Draw-on explainer** | Line art draws itself, with a pen tip following the stroke | 9 (C, vendor) | Stroke reveals in the stage kit | Small |

## Checks the research supports for `film:check`

Several findings are rules, not scenes. Warnings only, as everywhere in the story checks: a film may break a rule on purpose.

| Check | Rule | Evidence |
|---|---|---|
| `story-and-then` | Scenes joined only by "and then". Each scene may declare `story.link: "but" \| "therefore" \| "and"`; warn on two "and"s in a row | 12 ABT (C) |
| `story-unprimed-reveal` | A turn with no question opened before it, or opened less than a second before it. A curious viewer remembers the answer and what came with it | 12 curiosity (A) |
| `story-no-protagonist` | No subject or character carried across scenes. Transportation needs an identifiable character, and a product can be one | 12 transportation (A) |
| `pacing-monotone` | Scene or beat lengths all nearly the same. Vary them, long against short | 11 rhythm (A, correlational) |
| `text-moving-while-read` | Text still moving after its entrance, while it is meant to be read | 10 moving text (B) |
| `motion-unstaged` | More than one kind of change in a chart at once (scale and values and form) | 10 staged transitions (A) |
| `brand-late`, `cta-missing`, `hook-late` | The ABCD checks (from P0 ad formats) | 1 (B) |
| `face-direct-gaze` | A presenter looking at the camera while the product is the subject | 13 gaze (A) |
| `arc-flat` (review) | Plot each scene's mood and show the arc. Warn when an explainer of 30 s or more has no fall before its rise | 12 arcs (A, books) |

## Suggested order

0. **Story and pacing checks.** They need no new art, and they improve every film, old and new: `story-and-then`, `story-unprimed-reveal`, `story-no-protagonist`, `pacing-monotone` and `text-moving-while-read`. **Built 2026-11-08**, with `story-arc-flat`; see [Film Document → Story](component-specs/film-document.md#story).
1. **Ad formats, end card, brand slot.** Together they turn Kumiki's scenes into complete ads, and add the four ABCD checks. Highest value for least new art. **Built 2026-11-08** as both a `film:ad` command and six example briefs; see [Ad Formats](component-specs/ad-formats.md).
2. **Screen demo.** It is the format software makers ask for most, and the one Kumiki lacks entirely. **Built 2026-11-08** from both screenshots and live React UI; see [Screen Demo](component-specs/screen-demo.md).
3. **Light Sweep, speed ramp, split edits.** These are small additions to what exists, and each lifts every product film. **Light Sweep built 2026-11-08** with a near-field strip light; see [Studio Recipes → Light Sweep](component-specs/studio-recipes.md#light-sweep). **Speed ramps for scenes built 2026-11-08**; see [Film Document → Speed ramps](component-specs/film-document.md#speed-ramps). **Split edits built 2026-11-08**, with scene sounds; see [Film Document → Scene sounds and split edits](component-specs/film-document.md#scene-sounds-and-split-edits).
4. **Guided motion chart and chart morph.** The research is strongest here (grade A), with clear rules to enforce.
5. **Becomes and cold open.** Both are grade A in principle (visual rhetoric, curiosity), small to build, and work in ads and explainers alike.
6. **P2 and P3** as films need them.

## Not recommended

- **Copying platform templates.** No recipe should copy one platform's look. Every format above is structural and brand-neutral.
- **Fixed ratios as rules.** We should not encode numbers like 60:40, "47% in three seconds", a four-second shot length or a 1/f target as hard rules. They are averages, correlations or unverified, so they belong in warnings, not errors.
- **Humour by template.** Humour raises attention but can cost credibility and brand recall (13), so it stays the writer's call, not a recipe.
- **AI-generated footage as a recipe.** Kumiki's films are rendered from code and assets with known licences.

## Open questions for the owner

- Should the story and pacing checks start as warnings in `film:check` now (no art needed), ahead of new recipes?
- ~~Should ad formats compile a brief into a film document as a new command (`film:ad`), or be documented starting films (`film:example`)?~~ Both (owner, 2026-11-08).
- ~~Is a screen demo more useful from images (a screenshot per state) or from live React UI rendered in the stage?~~ Both (owner, 2026-11-08).
