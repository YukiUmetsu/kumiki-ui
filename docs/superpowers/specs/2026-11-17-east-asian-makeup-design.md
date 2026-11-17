# East Asian transformation makeup (MAKEUP1) — Design

**Date:** 2026-11-17.
**Status:** Approved by the owner in chat on 2026-11-17.
**Repository baseline:** `0cbfc2f4` on `main`.
**Intent:** Trendy East Asian looks that change how a face reads, not only its colour. The eyes look bigger, the
lashes longer, and shadows are drawn. The owner wants trendy makeup.

## Why

MAKEUP1 has 12 looks. Most are studio or Western looks, and igari is one Japanese idea. The popular East Asian looks
transform the face with eye techniques that MAKEUP1 cannot draw today:

- the aegyo-sal (a bright band under the lower lashes with a shadow line below it).
- drawn lower lashes and spiky false lashes.
- a downturned "puppy" wing and an inner-corner liner.
- circle lenses and double-eyelid tape.

The renderer's iris is fixed at 11.7 mm. Lashes only scale in length, thickness and darkness. The brow arch is fixed.
There is no aegyo-sal zone.

## Goals

1. Five looks as data (colour rules, zones and eye tools) that adapt to any face and skin:
   - Chinese social-video glam (popularly "Douyin makeup").
   - Korean idol.
   - jirai-kei.
   - neo-gyaru (the strongest change).
   - ryousangata (soft doll).
2. Building blocks that any look can use:
   - zones: aegyo-sal, aegyo-sal shadow, inner-corner liner, puppy wing, tear mole, straight brow fill.
   - eye tools: false-lash styles with lower lashes (drawn or worn), circle lenses, double-eyelid tape.
   - brow straightening (0-1, on the face's own brow shape).
3. Evidence grades on every rule (reported, convention, estimated), in a research note. Checks for the aegyo-sal
   height, the puppy-wing angle and the lens size.
4. A Storybook story: before and after on the East Asian face type (single and in-fold lids), with eye close-ups and
   switches for each tool.
5. The Python pipeline reads the new zones from the shared atlas, and the parity fixture still matches.

## Non-goals and anti-goals

- No lashes or lenses on photographs (`paintPhoto`, Python `apply`) in this change. Photos get the new zones only.
- No brand, product or person names in code. Ids and labels stay generic. Popular names ("Douyin makeup") go in the
  research note and the catalog search terms only.
- No change to portraits that do not use the new tools. Without paint, the renderer stays byte-identical to `main`.
- Anti-goal: caricature. Lenses stay at 14.5 mm or less (the largest common size). Upper spikes stay at 14 mm or
  less. Tape stays in the measured range between single and double lids. No anime-proportioned eyes.
- No eyelid-surgery simulation. Tape is cosmetic: a crease, a smaller hood and a small opening.

## Approaches considered

### A. Paint only (rejected)

Zones and colour only: aegyo-sal, liner tricks and blush. It is cheap, but it cannot draw lashes, lenses or tape, and
those make these looks transform.

### B. The plan drives optional hooks (selected; approved in chat)

The plan gets an `eyes` part (lashes, lenses, tape) and a brow straightening amount:

- `SkinPaint` carries the lash style, lower lashes, lens and brow straightening to the renderer. The hooks do nothing
  unless a plan asks for them.
- Tape changes the eye-shape spec, which `beautifulFace` already accepts, so the face geometry needs no new code.

### C. A separate "eye transform" pack (rejected)

A second plan format and a second hook path for one consumer. The cut list forbids a layer with one consumer.

## Design

### Zones (`data/makeup-zones.json`, shared with Python)

| Zone | Shape | Place and size | Product | Grade |
|---|---|---|---|---|
| `aegyo-sal` | stroke | under the lower lid from the inner third to the outer third, a crescent about 5 mm tall at the centre (half the eye opening's height) | highlight (shimmer) | reported (height ratio), convention (span) |
| `aegyo-sal-shadow` | stroke | a thin line on the band's lower edge, from below the inner edge of the iris to the outer third | shadow (taupe or brown) | convention |
| `liner-inner` | stroke | from the inner corner 2-3 mm toward the nose and down, pointed | liner | convention |
| `puppy-wing` | stroke | from the outer corner, outward and down along the lower lash line (5-20 degrees below level), tapered | liner | convention |
| `tear-mole` | stroke (dot) | about 1 mm across, below the outer third of one eye (a centre zone, so not mirrored) | liner (brown) | convention |
| `brow-straight` | polygon | the brow head to the tail with a straight upper edge | brow | convention |

### Eye tools

- **Lashes:** `style` "natural", "wispy", "spiky" or "doll", and `lower: { length, darkness, drawn }`.
  - Spiky: 5-7 spikes for each eye, 10-14 mm, on a short wispy base (lash-mapping guides).
  - Doll (gyaru): dense, long and flared, with heavy lower lashes.
  - Drawn lower lashes: 4-7 thin strokes from the lower lash line, 2-4 mm down.
- **Lens:** `{ diameter, ring, tint? }`, with the diameter between 12.5 and 14.5 mm. The renderer's iris radius takes
  the diameter. The ring darkens the iris edge. A tint covers the iris pattern but not the pupil zone.
- **Tape:** 0-1. A helper changes the eye-shape spec:
  - a single lid gets a crease of about 6.5 mm (estimated).
  - the hood shrinks by the tape amount.
  - the opening grows by up to 1.2 mm on single lids (estimated, inside the 8.0 to 9.9 mm range that Jung et al.
    2020 measured) and by up to 0.5 mm on other lids.
- **Brow straightening:** 0-1. Since #538 the renderer draws each face type's own brow shape. Straightening blends
  the brow's upper and lower edges toward their head-to-tail lines. Lower, straighter brows also make the eyes look
  larger (Morikawa et al. 2015).
- **`makeupPortraitOptions(portrait, plan)`:** returns the portrait options with the taped eye shape, the paint and no
  built-in makeup. `MakeupPortrait` uses it, and agents use it with `renderPortrait`.

### Looks

| Id | Eyes | Face and lips |
|---|---|---|
| `c-glam` | aegyo-sal shimmer and shadow, inner-corner liner, a soft puppy wing, drawn lower lashes, spiky lashes, a 14.0 mm brown lens, glitter on the aegyo-sal | a porcelain base, blush under the eyes and across the nose, a narrow nose shadow, gradient lips |
| `k-idol` | straight brows, a puppy wing, aegyo-sal shimmer, wispy lashes, light lower lashes, a 13.4 mm lens | glass (dewy) skin, a soft flush, gradient lips |
| `jirai` | red-pink shade under the eyes, aegyo-sal, a steep droopy wing, heavy lower lashes, a 14.2 mm dark lens, a tear mole | a pale matte base, pink-red blush under the eyes, glossy pink-red lips |
| `neo-gyaru` | tape, doll lashes upper and lower, black liner all round with the inner corner, a 14.5 mm dark lens with a strong ring, a heavy aegyo-sal | strong contour and highlight, pale pink lips |
| `ryousangata` | rose shadow, pink aegyo-sal shimmer, a soft brown puppy wing, wispy lashes, light drawn lower lashes, a 13.8 mm lens, softly straight brows | a pink flush high on the cheeks, glossy pink lips |

### Checks

- `aegyo-sal-height`: the zone's height against the eye opening's height, 0.35-0.65 (0.5 preferred, Aesthetic
  Surgery Journal 2024, reported).
- `wing-angle`: `liner-wing` 10-45 degrees up (as now), `puppy-wing` 3-25 degrees down (convention).
- `lens-size`: 12.5-14.5 mm (convention: common sizes, and larger reads as costume).

### Storybook

A new story, "East Asian looks":

- the East Asian face type with its eye shape (single lid, in-fold, almond).
- a look picker and an intensity control.
- bare and look side by side, as portraits and as eye close-ups (`framing: "eyes"`).
- switches for lashes, lenses and tape.
- the reasons and checks.
- a small gallery of the five looks.

### Docs

- A research note with grades: `docs/research/makeup-east-asian-trends-2026-11-17.md`.
- `makeup.md` (looks, zones, tools, checks), `human-anatomy.md` (the new `SkinPaint` fields) and the makeup skill.
- Catalog search terms: douyin, aegyo-sal, jirai, gyaru, ulzzang, ryousangata, circle lens, false lashes, puppy
  liner, double-eyelid tape.

## Verification

- Related tests: assertions in `tests/makeup.test.ts` and the parity fixture. No new test suite. The assertions show
  these things:
  - the looks design and pass their checks on an East Asian face.
  - tape changes the eye-shape spec.
  - a lens widens the drawn iris.
- Visual review: each look before and after (portrait and close-up), beside real reference photographs of the style.
  The references stay local and do not ship.
- Without paint, the renderer is byte-identical to `main` (the same check as in #527).
- Typecheck, lint, `registry:validate`, `registry:smoke` and `docs-status --check`. Storybook on port 6116, stopped
  after.
- A pull request. Merge on the owner's word.

## Calls made by the designer (for the owner to check)

- The five looks. Generic ids. Popular names only in docs and search.
- Tape changes the eye-shape spec. It does not change the renderer.
- Photographs get zones only for now.
- Builder check: done by the designer, reading as the builder. The repo rules say to spawn no subagent unless the
  owner asks.

## Left to the builder

- Exact zone coordinates and colours, tuned on renders against the reference photographs.
- Stroke details of the lash styles.
- Whether the gallery fits the render time of a story. Render one look at a time if it does not.
