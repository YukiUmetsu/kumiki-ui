# Ad Formats, Film Cards and the brand slot

**Registry items:**

- `film-cards` (`registry/video/film-cards.ts`, `film-cards-react.tsx`): the card scenes and the brand's corner bug. `film-document` depends on it.
- `ad-formats` (`registry/video/ad-formats.ts`): a brief becomes a film document.

**Command:** `npm run film:ad -- <brief.ad.json>`
**Research:** [32 — Professional video recipes](../32-professional-video-recipes-research.md), sections 1, 2 and 4.

## Purpose

Kumiki's scenes can now be cut into complete short ads. A writer gives a brief: a format, a brand, a hook and the format's few lines. `film:ad` writes a film document in a proven structure, which `film:review` and `film:render` take like any other film. The film:

- opens on the hook;
- carries the brand from the first frame;
- ends on one call to action;
- times every card from reading speed;
- passes the story, pacing and ad checks.

## The brand slot

A film document can carry a `brand`:

```json
"brand": { "name": "Brand A", "color": "#2f6bff", "cta": { "text": "Try it free", "url": "example.com/start" }, "bug": true }
```

| Field | Meaning |
|---|---|
| `name`, `color` | Required. The colour is used for emphasis words, list numbers, bars, the call-to-action fill and the bug's dot. |
| `ink` | Text on a brand-colour fill. By default, white or a near-black, whichever reads better (`inkOn`). |
| `background` | The ground the cards are set on. By default, a dark neutral. |
| `mark` | An `ImageAsset` for the logo, with its `licenseRef`. Without one, the name is set as a wordmark. |
| `cta` | One call to action, and where it leads. |
| `bug` | A small mark in a top corner of every scene except the end card, inside the output's safe area. |

On a dark ground, the brand colour as **text** is lightened toward white until it reads at 4.5:1 (`readableOn`). Fills keep the true colour.

## Cards

A card is a film scene with `"recipeId": "card"`. Each card enters within about half a second and then holds still. Text that moves while it is read lowers comprehension, and `film:review` checks this as `text-moving-while-read`.

| Card | Content | Moments (`cardCues`) |
|---|---|---|
| `headline` | `text`, `emphasis` (a phrase of the text set in the brand colour, underlined once it lands), `kicker`, `reveal` (`slam`, `scramble`, `weight`, `rebuild`), `from` (for `rebuild`) | `landed`; with `rebuild` also `from` and `rebuild` |
| `list` | `title`, 2–5 `items`, numbered, arriving one at a time with a progress bar | `title`, `item-1` … |
| `versus` | `left` and `right` (each a `label` and lines); `strike` crosses out the left side, line by line | `left`, `right` |
| `quote` | `quote`, `name`, `role`, `rating` (0–5; the stars fill in) | `quote`, `rating` |
| `proof` | 1–3 `quotes` (each `quote`, `name`, `role`, `rating`), an optional `total` (`rating`, `count`, `label`) and its `source` | `quote-1` …, `total` |
| `end` | `line`, plus `cta` and `url`, which override the brand's | `mark`, `cta` |
| `words` | `text`, shown one word at a time; `hold` (words held longer, in the brand colour), `holdFrames`, `framesPerWord` | `word-1` …, `landed` (the last word) |
| `wall` | `word`, repeated in `rows` (default 7) that slide past the frame's edges at `speed` frame widths a second; `accentRow` in the brand colour | `landed` |
| any | `flips`: card frames where the card cuts to the opposite ground (see [Film Document → Flash cut, burst and flip](film-document.md#flash-cut-burst-and-flip)) | |

- **Word flash (2026-11-11, doc 34 A1).** One word at a time, alone and centred, as large as the safe width allows. A short word is on screen for about a fifth of a second (5 to 8 frames at 30 fps, by length), close to 300 words a minute, as in Apple's *Don't Blink*; a held word stays a second. Words cut on with a three-frame settle and cut off, because a fade would eat their time. Words come from a word segmenter, so Japanese splits into words, with a short kana particle or ending joined to the word before. Reduced motion shows the whole line. Checks: `card-words-fast` (an error under 4 frames a word; a warning over 330 words a minute), `card-words-hold`, `card-words-monotone` (no word held in a run of five or more), `card-words-empty`.
- **Headline reveals (2026-11-11, doc 34 A3, A4, A5).** `reveal` sets how a headline's words arrive. Each lays out the finished line first and draws its moving letters over it, so the line never reflows while it arrives, and the landed frame is the line as measured. Reduced motion shows the finished line.
  - **`scramble`**: each letter cycles through stand-ins, changing every second frame, then locks in left to right within about 16 frames. Stand-ins are glyphs of the letter's own kind and width (x-height letters for lowercase, narrow ones for i, l, t, capitals for capitals, digits for digits), so they fill its place without spilling over. They come from a hash of the frame, so any frame renders the same. CJK text is warned about (`card-scramble-cjk`).
  - **`weight`**: each word arrives thin (160) and swells to heavy (820) over 12 frames, three frames after the word before, on a variable font's weight axis: the look's display font, or Geist Variable (OFL), which Kumiki's pages load. A font without a weight axis steps between its weights.
  - **`rebuild`**: `from` is shown and read, then its letters fly to their places in `text` on an emphasized curve. Each letter of `text`, left to right, takes the first unused matching letter of `from` (ignoring case), so letters keep their order where they can; letters `text` lacks shrink away and new ones grow in. Both lines are laid out and their letters measured where the browser put them, so the move fits any font and wrap. Checks: `card-reveal-from` (a rebuild with no `from`), `card-rebuild-few` (lines that share few letters read as a swap). Making a word's outline become an object is not built.
  - Example: [`examples/film/reveals.film.json`](../../examples/film/reveals.film.json); Storybook **Video production → Promo Moves → Type Reveals**.
- **Type wall (2026-11-11, doc 34 A2).** A texture made of one word: heavy capitals in rows that fill the frame and run off its edges, alternate rows sliding opposite ways, one row in the brand colour. A vertical output gets proportionally more rows. Each row carries enough copies for its whole slide, so nothing is measured. Screen readers hear the word once and the text audit treats the rows as artwork. Reduced motion stands it still. Checks: `card-wall-word`, `card-wall-rows` (3 to 14), `card-wall-speed`, `card-wall-accent`. Example: [`examples/film/type-moves.film.json`](../../examples/film/type-moves.film.json); Storybook **Video production → Promo Moves → Rapid Word Flash, Type Wall**.

- **Proof.** Social proof in one scene: the voices arrive in turn, each after two thirds of the one before has been read, since the earlier ones stay on screen; each card's stars fill in, and a person is shown by initials on the brand colour. Then the total lands under them, its number counting up and its stars filling to the fraction (4.8 fills four and four fifths), with `source` set small beneath. In a landscape frame the cards sit side by side; in a vertical frame they stack, compact, with who said it and their stars sharing a row above the words. The checks hold it to three voices (`card-proof-length`), quotes of 16 words or fewer (`card-proof-quote-long`), a whole positive `count` (`card-proof-count`), and warn on a total that does not say where it is from (`card-proof-unsourced`): advertising codes treat an overall rating as a claim to substantiate. Example: [`examples/film/social-proof.film.json`](../../examples/film/social-proof.film.json); Storybook, **Video production → Ad formats** plays the social-proof brief.
- **The look (2026-11-09).** The first version read as slides: every card was white text on one dark gradient, still once it landed, cut hard to the next. Platform research says an ad should open on bold imagery and land its message in the first seconds (Google and Ipsos's ABCD study of about 17,000 ads; TikTok's creative guidance), so cards now carry their own motion graphics:
  - **Grounds.** Each card stands on the brand's colour, light paper or dark (`ground`), and the ad compiler colour-blocks them: the hook and the end on the brand's colour, the body alternating paper and dark. Every colour on a card (ink, brand-coloured text, blocks and the text on them, surfaces) comes from its ground, with brand text moved toward white or black until it reads at 4.5:1; on the brand's own ground secondary text keeps the full ink.
  - **Kinetic type.** Headlines are larger and slam in word by word (from a little larger, with a moment of blur). The emphasis is swiped with a block of colour: a true wipe, its letters changing colour exactly at the block's edge.
  - **A graphic layer** behind the words (a large disc, a ring arc and a dot grid, placed by a seed so cards differ) pops in with the card and then drifts and turns slowly, with film grain over it. The words hold still once they land.
  - **Lists** have big numerals; rows swing in from the right and the one being said sits on a surface with the brand's bar. **Versus** is a split screen: the old way holds the frame until the new way wipes in on the brand's colour from the seam, the frame splits and a badge lands on the seam. **The end card** sits on the brand's colour; its call to action lands and sends out two slow pulses.
  - **Transitions.** Cards whip into one another (an edge-to-edge push with motion blur, see [Film Document](film-document.md)); a 3D shot dissolves.
- **Pictures (2026-11-09).** Text alone reads as slides, so cards carry the product and its world, as product ads are built: product on screen in the first seconds, about three benefits shown on the product rather than listed, then the offer (platform and agency practice: Google and Ipsos's ABCD, TikTok and Meta creative guidance; product-launch format guides).
  - **`photo`** on any card: a photograph filling it, cover-fitted on its `focus` point, under a slow push, with a shade where the words sit; the words turn light.
  - **`product`** on any card: a packshot (a cutout with a transparent background) that rises into place with a turn that settles, floats, and casts a contact shadow; below the words in a tall frame, beside them in a wide one. `screen` places a picture on a device's screen (a region of the packshot), and tags it, so a `zoom` transition can push from the screen into the picture full frame.
  - **`feature`** card: the product with one to three callouts. From each point on the product a dot pops, a line draws out to the side with room and a label lands; labels keep clear of one another. Checks: `card-feature-length`, `card-feature-point` (errors), `card-feature-many`, `card-feature-long`.
  - **End card** `price`, and the product above the brand.
  - **Briefs** take `photo` (behind the hook), `packshot` (on the hook, so the product is seen in the first second, and on the feature card), `endPackshot`, `features` (replacing the points with a feature card) and `price`. A 3D shot's length now follows its claim's reading time.
  - Pictures are checked for size and rights (`card-image`, `card-image-licence`). Packshots of Kumiki's own 3D products can be rendered with a transparent background; `examples/ads/assets/phone-*.png` were made that way.
  - Example: [`examples/ads/phone-camera.ad.json`](../../examples/ads/phone-camera.ad.json), a phone camera ad: the phone over a waterfall it photographed ("Not shot on a camera."), its three cameras called out, a strip-lit hero shot, and the phone with a lagoon photograph on its screen beside the price.
- **Size.** Type follows the frame's short side, a little larger in vertical frames. In a vertical frame the versus columns stack.
- **Safe area.** Every card keeps its words 1.5% inside the output preset's safe area, so a look's handheld or weave cannot push them across it.
- **Checks.** `inspectCard`, run by `film:check`, reports:
  - `card-short`: too short to read once the text has landed;
  - a headline over ten words;
  - emphasis that is not in the text;
  - list and versus lengths;
  - quotes over 28 words;
  - a rating outside 0–5;
  - an end card with no brand or no call to action.

## Ad checks

These run when a film has a `brand`. All are warnings unless marked.

| Code | Rule | Source |
|---|---|---|
| `ad-hook-late` | The first scene's first beat lands after 3 s | ABCD Attention; Meta via practitioners (C) |
| `ad-brand-late` | The brand is not seen in the first 5 s: no bug, and no brand name in an opening headline | ABCD Branding (B) |
| `ad-cta-missing` | The film does not end on an end card | ABCD Direction (B) |
| `ad-captions-missing` | Narration with no captions; most feed video plays with the sound off | Platform guidance (B) |
| `ad-vertical-long` | A vertical ad over 60 s | Short-form placements |
| `ad-brand-name` (error) | The brand has no name | |
| `unlicensed-asset` (error) | The brand mark has no rights reference | |

In the story checks, a card that names the brand counts as a subject, so a brand that returns from a headline to the end card is a protagonist. The corner bug alone does not count.

## Formats

| Format | Brief fields | Film |
|---|---|---|
| `hook-body-close` | `points` (2–5), `pointsTitle` | Hook → points list → end card |
| `problem-solution` | `problem.statement`, `problem.pains`, `solution` | Hook → the problem (a list of pains, or a headline) → the solution, a "but" turn under the brand's name → end |
| `before-after` | `before`, `after` | Hook → a versus card whose turn is the right side landing → end |
| `three-reasons` | exactly three `points` | Hook → "Three reasons" list → end |
| `myth-vs-fact` | `myths` (`myth` and `fact` pairs) | Hook → myth-versus-fact card, myths struck → end |
| `social-proof` | 1–3 `quotes`, `rating` (`value`, `count`, `source`) | Hook → one proof card: the quotes in turn, then the overall rating counting up → end |

Every format also takes:

- `outputs`: `vertical` (YouTube Shorts preset), `landscape` (YouTube) and `square`. Default: `["vertical"]`.
- `look`: any film look.
- `emphasis` for the hook.
- `endLine`.
- `product`: `{ "subject": "phone" | "laptop", "claim", "reveal" }`, a 3D product shot after the body. With `"reveal": "turn"` (the default) the product turns to its best angle. With `"reveal": "sweep"` it is drawn out of the dark by a strip light whose reflection crosses its glass, its screen waking for the hold (see [Studio Recipes → Light Sweep](studio-recipes.md#light-sweep)). `budget-problem-solution` uses the sweep. In a portrait frame the subject is centred and the claim sits above the band that players cover.

**Story fields.** The compiler fills them in:

- the hook opens the question `why`;
- the body closes it, with a `but` turn where the format has one;
- every other scene follows with `therefore` or `and`.

`inspectAdBrief` reports missing fields with a JSON path into the brief, and no film is written until they are fixed.

## Examples

`examples/ads/` holds six briefs, one per format, and the films `film:ad` wrote from them:

| Brief | Format | Outputs | Notes |
|---|---|---|---|
| `budget-hook-body-close` | hook-body-close | vertical, square | |
| `budget-problem-solution` | problem-solution | vertical | 3D phone |
| `desk-before-after` | before-after | vertical, landscape | 3D laptop, `warm-35mm` look |
| `study-three-reasons` | three-reasons | vertical | |
| `sleep-myth-vs-fact` | myth-vs-fact | vertical | |
| `tool-social-proof` | social-proof | vertical, landscape | Three quotes and a sourced rating, on one proof card |

They run 14–25 s.

```bash
npm run film:ad -- examples/ads/desk-before-after.ad.json
npm run film:review -- examples/ads/desk-before-after.film.json --only=vertical --gl=gpu
```

## Evidence (2026-11-08)

- **Pictures (2026-11-09).** `tests/ad-formats.test.ts`, "ads with pictures". `film:review` of `examples/ads/phone-camera.film.json` at 1080×1920 and 1920×1080: found and fixed white on the brand orange at 2.8:1 (the example's orange is now deeper, 4.6:1), a phone and brand name colliding on the vertical end card, and products too small in a tall frame. A 540×960 draft of a longer phone ad (photo hook, 3D reveal, callouts, screen-to-full-frame zoom, footage, offer) was rendered and mixed with music; earshot rated its sound launch-grade on 23 of 23 metrics. Still showing: the 3D phone's lock screen carries a payment notification, which a camera ad would not.

- **The look (2026-11-09).** Frames of every format at 1080×1920 and 1920×1080, and 540×960 and 960×540 drafts of `budget-hook-body-close` and `desk-before-after`: the rendered-text audit reports no problems on landed frames. Found and fixed: secondary text on the brand's colour at 3.0:1 (now the full ink); the emphasis changing colour before its block covered it (1.2:1 mid-swipe; now a true wipe); the vertical split's "Fact" half taller than its half; the seam badge over the left half's longest line; a whip that panned off the scene into the empty stage (now an edge-to-edge push); and a split card whose right half sat empty while the left was read (the left now holds the frame until the split).

- **Proof card (2026-11-09).** `tests/ad-formats.test.ts`, "proof card": the voices' timing, every check, and the format's one scene. Frames 50, 150, 212 and 310 of `examples/film/social-proof.film.json` rendered at 1920×1080 and 1080×1920: the rendered-text audit reports no problems. The first vertical pass stacked full-size cards 1,600 px tall into about 1,180 px of safe area, so the total fell below the Shorts safe line; vertical cards are now compact (who and stars share a row) at 0.85 scale.

- **Tests.** `tests/ad-formats.test.ts`:
  - every format compiles to a film with no errors and no ad, story, card or pacing warnings;
  - a broken brief reports its paths;
  - card timing and card checks;
  - a late hook, a late brand, a missing call to action and a long vertical ad are each reported;
  - the colour helpers.
- **Install.** `registry:fixture` passes for `film-cards`, `ad-formats` and `film-document`.
- **Review.** All six films were reviewed with `film:review` on the GPU, every output, at output size (stills only, no video). The first pass found real faults, all fixed:
  - Cards ignored the Shorts safe area (12% right, 19% bottom), and so did the bug.
  - Vertical type was small.
  - Brand-blue list numbers read at 2.8:1.
  - A portrait hero turn kept its landscape side offset, so the claim wrapped to three lines.
  - The versus card struck a two-line item between its lines, and its vertical stack clung to the top.
  - The quote's star row squeezed the name onto two lines.
  - The audit had three false reports:
    - words still rising behind their masks were reported as clipped, now skipped via `data-km-text-entering`;
    - `findMovingText` paired every line of a block with its first line;
    - a strike-through read as the background in the contrast measure, so struck text is now judged on the sheet, via `data-km-text-struck`.
- **Remaining warnings.** After the fixes, the six films have no review errors and no text warnings. The remaining warnings are `frame-mostly-empty`, on end cards and on the frame before a card's text arrives, and `focus-off-hero`, on a hook frame while its words are still rising.
- **Storybook.** **Video production → Ad Formats → Cards, Entrance, Ad Formats** render with no console errors; every card kind was checked in vertical, landscape and square.
- **Not yet done.** No owner viewing yet. No video was rendered.

## Limitations

- **Text-led ads.** Cards are text, the "left-brain" side of Wood's analysis (doc 32, §3): ads built from people, place and played-out scenes score higher. Pair cards with 3D and story scenes, or footage, rather than shipping card-only ads for brand work.
- **Graded looks lower contrast.** `readableOn` measures against the ungraded ground. Looks that lift blacks (`nordic-overcast`, `pastel-tableau`) can take emphasis below 4.5:1. `film:review` reports it.
- **No logo animation.** A brand mark fades in from a soft blur; it is not drawn or built. The `markSting` shader moment can stand in front of the end card.
- **One product shot.** Only the hero turn of the phone or the laptop is offered from a brief. A film document can use any `shot-3d` directly.
- **Reading speed is an average.** Card timing assumes about three words a second, and two CJK characters to a word (about six characters a second). Slow readers and dense numbers need longer scenes.
