# Shader effects in practice: how studios and brands use them

**Researched:** 2026-11-07. **Purpose:** learn from real work when each effect earns its place, and turn what repeats into rules and demonstrations. The demonstrations are in Storybook under **Video production → Shader FX Craft**. The per-effect rules are in the [Shader FX spec](component-specs/shader-fx.md#using-each-effect-well).

Each example below was checked against its source page unless marked otherwise. Several of these brands are named here only as research citations. Library code, stories and examples stay anonymous.

## What the work shows

| Effect | Example | What they did | Source and weight |
|---|---|---|---|
| Light beams | Netflix's original-content identity, by Imaginary Forces | "Beams of colored light travel through space and converge to form the logo." The colours stand for the range of the catalogue. It premiered in cinemas before *Roma*, then became the opener for all Netflix originals, on the platform, in print and on social, scored by Hans Zimmer | [Studio page](https://imaginaryforces.com/post/netflix-originals), primary, read in full |
| Volumetric light | *Superman* (2025) titles, by Sarofsky | The volumetric light was made with practical, analog setups of glass and smoke. The team wanted titles "made of light", with an aurora look tied to the story's Arctic setting, as an homage to the 1978 titles | [AWN](https://www.awn.com/news/sarofsky-reimagines-superman-title-sequence) and [GEMA interview](https://gema.org/news/sarofsky-lights-up-james-gunns-dc-universe), trade press, from search summaries |
| Halftone | *The New York Times Magazine* video identity, by Gretel | A "living field of dots" stands for the magazine's stories. The dots are "filtered, activated and sharpened into the magazine's masthead", as "a modern take on the magazine's print heritage". It plays before the magazine's video content | [Studio page](https://gretelny.com/new-york-times-magazine), primary, read in full |
| Liquid metal | Paper's liquid-metal logo tool, February 2025 | Released by the design company Paper, styled after Apple's event invitations, to turn any logo or silhouette into a looping chrome animation. It exports video or stills, and its shader is open source. It is the same shader family this library uses | [Boing Boing](https://boingboing.net/2025/03/08/turn-any-logo-or-silhouette-into-a-liquid-metal-animation.html) and [Creative Bloq](https://www.creativebloq.com/design/logos-icons/from-apple-to-nike-im-mesmerised-by-these-hypnotising-chrome-logos), press, from search summaries |
| Mesh gradient | Stripe's homepage | A WebGL gradient that became the site's signature. Developers reverse-engineered it as a small WebGL program, and a summary of Stripe's own talk says it took years of iteration. One forum post from 2020 complains that it costs battery | [Bram.us](https://www.bram.us/2021/10/13/how-to-create-the-stripe-website-gradient-effect), developer blog, moderate. The iteration claim comes from a secondary summary, low |
| Water and caustics | Gentle Rain, a product site by Zajno with Andrew Encharm | Fluid simulation was already common, so they wanted a different way to reveal the product. They wrote a water effect from scratch, and caustics with dithering gave the gentle look | [Codrops case study](https://tympanus.net/codrops/?p=85090), practitioner case study, from a search summary (the page refused a direct read) |
| Grain | Brand work in 2025 and 2026 | Trend writers describe grain and scuffed edges as a sign of human craft, and a pushback against slick digital polish. One cites a subtle grain overlay in a TBWA rebrand. Another notes that many brands in one category share the same slick RGB gradient | [KOTA](https://kota.co.uk/blog/branding-inspiration-brand-design-trends-for-2026), [Creative Market](https://creativemarket.com/blog/?p=82782), [Zurb](https://radar.zurb.com/article/the-napkin-logo-raised-125m-heres-why-the-mess-is-the-point), opinion and trend writing, low |

**Corrected on the way:** a search suggested that Apple's 2025 iPhone event invitation was chrome. It was a thermal, heat-map look ([MacRumors](https://www.macrumors.com/2025/08/26/apple-event-2025-interactive-logo/)). The chrome trend traces to Paper's tool, styled after earlier Apple invitations.

## Patterns that repeat

1. **The effect resolves into the subject.** The Netflix beams end in the logo, and the NYT dots sharpen into the masthead. The effect is the reveal, not wallpaper. This is the strongest pattern in the research.
2. **The effect carries meaning.** Netflix's colours are the catalogue, the NYT dots are the stories, and Superman's aurora is the Arctic home. A designer can say why each colour and each motion is there.
3. **One signature, used everywhere.** Netflix's opener runs in cinemas, on the platform, in print and on social. Stripe's gradient is the brand. An effect becomes identity by being owned and repeated, and becomes generic by being swapped per project.
4. **Physical texture beats digital perfection.** Sarofsky used real glass and smoke, Gentle Rain added dithering, and the NYT dots honour print. Grain, haze and print texture make an effect read as made, not generated.
5. **Sound is part of the effect.** The Netflix identity is inseparable from its score.
6. **The cost is real.** Stripe's gradient drew battery complaints, and a review of Paper's tool questions its performance. Professionals pause effects off screen, keep few running at once, and pre-render for video.

## What changed in this library

| Pattern | Change |
|---|---|
| 1. Resolve into the subject | **Keyframed controls.** A spec can now move a numeric control over frames, such as dot contrast, ray intensity or water caustics. `keys` is serializable and validated against the same limits, and it updates uniforms on the live context, so a moving effect does not rebuild WebGL. Two new pieces use it: `Pattern Dots Sharpen Into The Picture` and `Pattern Light Gathers Into A Mark` |
| 2. Meaning | Each piece's guide states what its colours and motion stand for |
| 3. Signature | `Pattern One Signature Gradient` shows one palette, seed and rate across 16:9, 9:16 and 1:1 |
| 4. Physical texture | Print grain on halftone, and grain on gradients, were already added. The halftone pieces use both |
| 5. Sound | Every piece cues sound from the catalog at its picture's moment |
| Every pattern | Each craft piece, each moment and Choose An Effect show a **Seen in practice** line, from the guide's `practice` field, describing the real use without names and pointing here for the sources |
| 2. Meaning | `Pattern Colour With A Reason`: three colours, each named as it arrives, against an unexplained rainbow |
| 4. Physical texture | `Pattern Light That Looks Filmed`: warm haze, soft uneven beams, grain and a keyed flicker, against clean uniform beams |
| Water as a reveal | The `CausticReveal` moment: the picture comes up through calming water, following the product-site case study |
| 6. Cost | Each piece holds at most two WebGL contexts at once. The signature piece holds three, because it shows three formats side by side |

## Teaching agents

Studio judgement only helps an agent if it is structure and checks, not prose. So the guidance became data, and the data drives four things:

1. **Search by intent:** each effect and moment is a catalog entry of type `effect`, with its jobs, use, avoid and settings.
2. **A required intent:** every effect names a `job`, and a job the effect does not suit is refused.
3. **Checks:** `film:check` warns on the six misuses in this study, with the fix for each.
4. **Ready-made moments and tools:** six moments that do one job each, `fx:light` to find a photograph's light, and **Choose An Effect** in Storybook, which picks by the beat.

The example film `where-water-begins.film.json` was brought in line with the guide, so an agent that copies it copies good practice. It now passes `film:check` with no effect warnings.

## Not done

- **No human review.** An agent captured and inspected the frames. Nobody has approved the look or listened to the sound.
- **Two sources could not be read directly.** Codrops returned 403 and Creative Bloq returned only a headline, so those rows rest on search summaries.
- **No paid or proprietary work was copied.** The pieces follow the patterns, with original, anonymous content.
