# East Asian Transformation Makeup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five trendy East Asian looks as MAKEUP1 data: Chinese social-video glam, Korean idol, jirai-kei, neo-gyaru
and ryousangata. They transform the eyes with lashes, lenses, tape, aegyo-sal and drawn shadows.

**Architecture:** New zones go in the shared atlas (TypeScript and Python). The plan gets eye tools. `SkinPaint`
carries lashes, the lens and the brow straightening to the ANAT1 renderer, through optional hooks. Tape changes the
eye-shape spec that `beautifulFace` already accepts.

**Tech Stack:** TypeScript (registry/anatomy), React stories (Storybook 10), vitest, Python 3.12 for the parity fixture.

**Spec:** `docs/superpowers/specs/2026-11-17-east-asian-makeup-design.md`

## Global Constraints

- No brand, product or person names in code. Ids `c-glam`, `k-idol`, `jirai`, `neo-gyaru`, `ryousangata`. Popular
  names ("Douyin makeup") only in the research note and the catalog terms.
- Lens diameter 12.5-14.5 mm. Upper lash spikes 14 mm at most. Tape adds at most 1.2 mm of opening (single and in-fold
  lids) or 0.5 mm (other lids).
- Without paint, `renderPortrait` stays byte-identical to `main`.
- Photographs (`paintPhoto`, Python `apply`) get the zones only. No lashes or lenses on photos.
- No new test suite. Add assertions to `tests/makeup.test.ts`. Run related tests only.
- Storybook on port 6116, stopped after. Port 6006 is the owner's.
- Reference photographs stay in the scratchpad. They never ship or get committed.
- Prose in ASD-STE100. Merge only on the owner's word.
- Change from the spec: #538 made brows follow the face type's own brow shape. So the brow tool is
  `straight` (0-1, straightens that brow), not an arch height in mm.

## Review Focus

1. Tape on a lid that already has a crease (almond, in-fold): the crease never goes lower and no second line appears.
   Test in Task 4.
2. Intensity 0 and 1.5 with eye tools: 0 removes the lens and tape. 1.5 keeps the lens at 14.5 mm or less, the spikes
   at 14 mm or less and the tape at 1 or less. Test in Task 4.
3. A dilated pupil (`pupil: 8`) under a lens: the pupil stays black, and the tint starts outside it. Test in Task 3.
4. Men wearing the looks: designs and checks work at `sex: 1`. Test in Task 5.
5. `paintPhoto` with a new look: it paints the zones, ignores lashes, lens and tape, and does not throw. Test in Task 5.

---

### Task 1: Research note and visual targets

**Files:**
- Create: `docs/research/makeup-east-asian-trends-2026-11-17.md`
- Modify: `registry/anatomy/makeup-data.ts` (`MAKEUP_EVIDENCE`)

**Interfaces:**
- Produces: evidence ids `aegyo-sal`, `iris-size`, `eyelid-height`, `brow-distance`, `liner-colour`, `lash-maps`,
  `trend-cn`, `trend-kr`, `trend-jp`. Each is `{ id, grade, finding, appliedAs, source, url? }`. Task 5 cites them.

- [ ] **Step 1:** Verify each source (author, year, journal, the number used) with WebFetch:
  - the ASJ 2024 pretarsal roll study (5 mm, 0.5 ratio, crescent).
  - Takehara & Tanijiri 2015 (125% iris).
  - Jung et al. 2020 (8.0 against 9.9 mm) and Chen et al. 2016 (+27.9%).
  - the Morikawa group: J. Cosmet. Sci. 66 (about 6%), liner colour in J. Cosmet. Sci. 73 (dark 4%, light 2%), and
    Frontiers 2015 (lower brows make the eyes look larger).
  - lash maps (10-14 mm spikes, 5-7 for each eye).
  - one beauty-media source or more for each style.
- [ ] **Step 2:** Get 3-6 reference photographs for each look (Openverse CC0/CC BY or Wikimedia Commons, by search
  terms). Put them in `$SCRATCH/refs-ea/<look>/` and view them with Read. From them, note these visual targets:
  - the aegyo-sal height in eye-opening units.
  - the wing angle and length.
  - the lower-lash spikes (count and length).
  - the lens look (size, ring).
  - the blush position.
  - the lip pattern.
- [ ] **Step 3:** Write the research note. It has a sources table with grades and a section for each look (the
  elements and the visual targets). It also has the eye tools with numbers and an empty "What the renders changed"
  table.
- [ ] **Step 4:** Add the nine evidence entries. Run
  `npx vitest run --project unit tests/makeup.test.ts`. Expected: all pass.
- [ ] **Step 5:** Commit: `docs(makeup): study East Asian transformation looks with graded sources`.

### Task 2: Zones in the shared atlas

**Files:**
- Modify: `registry/anatomy/data/makeup-zones.json`, `tests/fixtures/makeup-zone-parity.json`, `tests/makeup.test.ts`

**Interfaces:**
- Produces: zone ids `aegyo-sal`, `aegyo-sal-shadow`, `liner-inner`, `puppy-wing`, `tear-mole`, `brow-straight`.

- [ ] **Step 1: Write the failing test** in the `MAKEUP1 zone atlas` block:
  `it("places the East Asian zones: aegyo-sal under the lower lid, the puppy wing down, the tear mole on one side")`:
  - On `beautifulFace({ sex: 0, faceType: "east-asian" }).vertices`:
    - `zoneField("aegyo-sal", V)` > 0.5 at the point 2.5 mm below `V[145]`, and < 0.1 at `V[159]` (upper lid).
    - The tip of `resolveZone("puppy-wing", V)[0].pts` is below its first point (y smaller) and further out (|x|
      larger).
    - `resolveZone("tear-mole", V)` has one part (not mirrored).
    - The upper-edge points of `brow-straight` lie within 0.6 mm of the line from its first point to its last.
- [ ] **Step 2:** Run `npx vitest run --project unit tests/makeup.test.ts`. Expected: FAIL (unknown zone).
- [ ] **Step 3:** Add the six zones (all `measure: false`):
  - `aegyo-sal`: highlight, a stroke on the lower lid 155→145→7 with `off` (0, -0.083 ew, 0), r 0.03, 0.08 and 0.035
    (a crescent); soft 0.08.
  - `aegyo-sal-shadow`: eyeshadow, a stroke from below 153 to below 7 with off -0.17 ew, r 0.012 and soft 0.04.
  - `liner-inner`: liner, from 133 toward the nose, down 0.03 ew and in 0.08 ew, r 0.012 to 0.003.
  - `puppy-wing`: liner, from 33 out 0.25 ew and down 0.06 ew (about 13 degrees), r 0.03 to 0.004.
  - `tear-mole`: liner, `side: "center"`, a point 0.06 ew below the outer third of the lower lid of one eye (253 to
    339), r 0.02.
  - `brow-straight`: brow, a polygon from the brow head with its upper edge on the head-to-tail line and the lower
    edge on the brow's lower points.
- [ ] **Step 4:** Regenerate the fixture:
  `$VENV/bin/python -I scripts/makeup/makeup.py parity --out tests/fixtures/makeup-zone-parity.json`. Run the test
  file. Expected: PASS, parity included.
- [ ] **Step 5:** Commit: `feat(makeup): aegyo-sal, puppy wing, inner-corner liner, tear mole and straight brow zones`.

### Task 3: Renderer eye tools (ANAT1)

**Files:**
- Modify: `registry/anatomy/face-portrait.ts`: `SkinPaint` (line 111), `drawEye` (`irisR`, line 905), `drawLashes`
  (line 1118), `drawBrows` (topY/botY, line 1080)
- Test: `tests/makeup.test.ts`

**Interfaces:**
- Produces (exported from `face-portrait.ts`):
  - `interface LashSpec { length: number; thickness: number; darkness: number; style?: "natural" | "wispy" | "spiky" | "doll"; lower?: { length: number; darkness: number; drawn: number } }`
  - `interface LensSpec { diameter: number; ring: number; tint?: RGB3 }` (tint is linear RGB)
  - `SkinPaint.lashes?: LashSpec`, `SkinPaint.eyes?: { lens?: LensSpec }`,
    `SkinPaint.brows?: { colour: RGB3; density: number; straight?: number }`

- [ ] **Step 1: Write the failing test**
  `it("a lens widens the iris and keeps a dilated pupil black")`:
  - Render `{ framing: "eyes", width: 192, height: 96, pupil: 8, makeup: "none" }` twice: with
    `paint: { key: "lens", shade() {}, eyes: { lens: { diameter: 14.5, ring: 0.6 } } }` and with no paint.
  - Count the pixels darker than L* 35 in the eye region of each. Assert: with the lens, more than 1.2 times as many.
  - Assert the pixel at each pupil centre (the projected `landmarks` 468 and 473) is darker than L* 15 in both.
- [ ] **Step 2:** Run it. Expected: FAIL (`eyes` unknown, no change).
- [ ] **Step 3:** Implement:
  - **`drawEye`:** `irisR = (lens?.diameter ?? 11.7) / 2`. With a lens, mix the tint into the iris albedo by 0.75 for
    r outside the pupil. Darken the edge by `ring` across the outer 0.9 mm.
  - **`drawLashes`:**
    - spiky: 5-7 spikes, 10-14 mm (clamped at 14), over a base at 0.75 times.
    - wispy: lengths ±35%, strokes 0.8 times.
    - doll: 1.3 times the clumps, 1.35 times the length (clamped at 14 mm), more flare.
    - `lower`: lower clumps times `length`, alpha from `darkness`, and `drawn` tapered strokes 2-4 mm down from the
      lower lash line on its outer two thirds.
  - **`drawBrows`:** `topY` and `botY` blend toward their head-to-tail chords by `straight`.
  - Every new branch is off when the field is absent.
- [ ] **Step 4:** Run the test file. Expected: PASS.
- [ ] **Step 5:** Byte-identity: copy `main`'s `face-portrait.ts` to a temporary file. Render the five cases from #527
  without paint with both. Expected: 0 bytes differ. Delete the temporary files.
- [ ] **Step 6:** Commit: `feat(anatomy): lashes, lenses and straight brows through SkinPaint (off unless asked)`.

### Task 4: Plan, tape, paint wiring and checks

**Files:**
- Modify: `registry/anatomy/makeup-data.ts` (`Look`), `registry/anatomy/makeup-design.ts` (`MakeupPlan`,
  `designMakeup`, `checkMakeup`), `registry/anatomy/makeup-paint.ts` (`makeupPaint`),
  `registry/anatomy/makeup-react.tsx` (`MakeupPortrait`)
- Test: `tests/makeup.test.ts`

**Interfaces:**
- Consumes: `LashSpec` and `LensSpec` (Task 3), and the zone ids (Task 2).
- Produces:
  - `Look.lashes?: LashSpec`; `Look.eyes?: { lens?: { diameter: number; ring: number; tint?: string }; tape?: number }`.
    `Look.brows?: { density: number; straight?: number }`
  - `MakeupPlan.lashes: LashSpec`; `MakeupPlan.eyes: { lens?: LensSpec; tape: number }`.
    `MakeupPlan.brows: { colour: Lab; density: number; straight: number }`
  - `tapedEyeShape(shape: EyeShapeSpec, tape: number): EyeShapeSpec` in `makeup-design.ts`
  - `makeupPortraitOptions(portrait: PortraitOptions, plan: MakeupPlan): PortraitOptions` in `makeup-paint.ts`. It
    returns `{ makeup: "none", ...portrait, eyeShape: tapedEyeShape(beautifulFace(portrait).eyeShape ?? EYE_SHAPES[0], plan.eyes.tape), paint: makeupPaint(plan) }`.
  - Check ids `aegyo-sal-height`, `wing-angle` (now also `puppy-wing`), `lens-size`.

- [ ] **Step 1: Write the failing tests:**
  - `it("tape makes a single lid double without lowering a crease")`:
    - monolid with tape 1: crease 6.5, height 9.2, hood 0.
    - in-fold with tape 1: crease 6.5, `infold` false, height 10.0.
    - almond with tape 1: crease 7.5, height 10.0.
    - any shape with tape 0 is the same object.
  - `it("scales the eye tools with intensity inside their caps")`:
    - a look with `eyes: { lens: { diameter: 14.5, ring: 0.8 }, tape: 1 }` and spiky lashes at intensity 1.5. The
      lens is 14.5 mm or less and the tape 1 or less. `lashes.length` keeps the spikes at 14 mm or less.
    - at intensity 0: no lens, tape 0.
  - `it("checks the aegyo-sal height, a puppy wing's droop and the lens size")`:
    - an aegyo-sal layer with `adjust: { radius: 3 }` fails `aegyo-sal-height`.
    - a `puppy-wing` layer passes `wing-angle`.
    - a 15.5 mm lens fails `lens-size`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement:
  - **`tapedEyeShape`:**
    - single lids: crease 4.5 + 2·t.
    - in-fold lids: crease max(crease, 4.5 + 2·t), and `infold` false when t ≥ 0.5.
    - hood × (1 − t).
    - height + 1.2·t on single and in-fold lids, + 0.5·t on others.
    - id `<id>+tape`.
  - **`designMakeup`:**
    - `lens` from 11.7 + (d − 11.7)·min(1, k), and none at k = 0.
    - `tape · min(1, k)`.
    - lash lengths scaled with the spike cap.
    - `brows.straight · min(1, k)`.
    - the tint hex to linear RGB.
  - **`makeupPaint`:** passes `lashes`, `eyes.lens` and `brows.straight`, and adds them to `key`.
  - **`MakeupPortrait`:** uses `makeupPortraitOptions`.
  - **Checks:**
    - aegyo-sal height: 2 · r(centre) · ew against the opening (V[159] to V[145]), 0.35-0.65.
    - puppy wing: −25 to −3 degrees.
    - lens: 12.5-14.5 mm.
- [ ] **Step 4:** Run the test file. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(makeup): eye tools in the plan: lashes, lenses, tape, straight brows, and their checks`.

### Task 5: The five looks

**Files:**
- Modify: `registry/anatomy/makeup-data.ts` (`MAKEUP_LOOKS`, and a colour rule where a tone does not exist)
- Test: `tests/makeup.test.ts`

**Interfaces:**
- Consumes: zones (Task 2), eye tools (Task 4), evidence ids (Task 1).
- Produces: looks `c-glam`, `k-idol`, `jirai`, `neo-gyaru`, `ryousangata`. Starting values follow. Task 7 tunes them.

| Look | Eye layers | Lashes | Lens | Tape | Brows | Face and lips |
|---|---|---|---|---|---|---|
| `c-glam` | aegyo-sal (highlight, glitter), aegyo-sal-shadow (taupe), liner-inner, puppy-wing (brown), lid peach-gold shimmer | spiky, lower drawn 5 | 14.0, ring 0.6, warm brown | 0 | straight 0.3 | porcelain satin base, blush-igari + blush-sunkissed (pink), nose-contour narrow, nose-highlight tip, lip-centre gradient (red) |
| `k-idol` | aegyo-sal (champagne shimmer), puppy-wing (brown), lid rose | wispy, lower 1.2 | 13.4, ring 0.4 | 0 | straight 0.8, density 1.2 | dewy base, blush-apples soft, lip-centre gradient (coral-red) |
| `jirai` | lower-lash (red), aegyo-sal (pink shimmer), aegyo-sal-shadow, puppy-wing steep (black, rotate −8), tear-mole | natural 1.2, lower 1.6 drawn 6 | 14.2, ring 0.8, dark brown | 0 | straight 0.6 | pale matte base, blush-igari (pink-red), lips glossy pink-red |
| `neo-gyaru` | liner, liner-inner, lower-lash (charcoal), aegyo-sal (heavy), outer-v | doll, lower 1.8 drawn 6 | 14.5, ring 1.0, black-brown | 1 | straight 0.2 | strong contour and highlight, pale pink lips |
| `ryousangata` | lid rose, aegyo-sal (pink shimmer), puppy-wing (soft brown) | wispy, lower drawn 4 | 13.8, ring 0.5 | 0 | straight 0.5 | pink flush high (blush-lifted), glossy pink lips |

- [ ] **Step 1: Write the failing tests:**
  - `it("designs the East Asian looks on single, in-fold and almond lids, for women and men")`. For each new look ×
    eyeShape in ["monolid", "inner-double", "almond"] × sex in [0, 1], on the `east-asian` face type:
    `checkMakeup(plan, face)` all ok, and `plan.layers.length > 6`.
  - `it("paints a new look on a photograph without its eye tools")`: `paintPhoto` with `c-glam` on the synthetic photo
    from the existing test. It returns pixels, and the lips are redder than the skin.
- [ ] **Step 2:** Run them. Expected: FAIL (unknown look).
- [ ] **Step 3:** Add the five looks: label, summary, layers, `lashes`, `eyes`, `brows`, `evidence` and `adapt`.
- [ ] **Step 4:** Run the test file. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(makeup): five East Asian looks: c-glam, k-idol, jirai, neo-gyaru, ryousangata`.

### Task 6: Story, docs and catalog terms

**Files:**
- Modify: `src/video/makeup.stories.tsx` (new `EastAsianLooksStory`, name "East Asian looks"),
  `docs/component-specs/makeup.md`, `docs/component-specs/human-anatomy.md`, `skills/kumiki-makeup/SKILL.md`,
  `src/catalog/catalog-core.ts` (line 208 terms), `registry/anatomy/README.md`

**Interfaces:**
- Consumes: `makeupPortraitOptions`, `MAKEUP_LOOKS`, `FacePortrait` (`framing: "eyes"`).

- [ ] **Step 1:** Write the story:
  - controls: look, intensity, eye shape (monolid / in-fold / almond), face variant (0-2), skin (four East Asian
    tones), and switches for lashes, lens, tape and aegyo-sal.
  - bare and look as portraits (256 × 320) and as eye close-ups (`framing: "eyes"`).
  - the reasons, the checks and the face chart.
- [ ] **Step 2:** Docs:
  - `makeup.md`: looks, zones, eye tools, checks, `makeupPortraitOptions`.
  - `human-anatomy.md`: the new `SkinPaint` fields.
  - `SKILL.md`: trend looks and tools.
  - the catalog terms: douyin, aegyo-sal, jirai, gyaru, ulzzang, ryousangata, circle lens, false lashes, puppy
    liner, double-eyelid tape.
- [ ] **Step 3:** Run `npx tsc --noEmit -p tsconfig.json`, eslint on the changed files, `npm run catalog:check` (the
  same issue count as `main`) and `node scripts/docs-status.mjs --check`. Expected: clean.
- [ ] **Step 4:** Commit: `feat(makeup): East Asian looks story, docs and search terms`.

### Task 7: Render review against references, tuning, release checks

**Files:** the zone, look and renderer values from Tasks 2-5, and the research note ("What the renders changed").

- [ ] **Step 1:** Start Storybook on port 6116. Take full-page screenshots of the new story for each look (portrait
  and eye close-up), at 1× and with a 3× crop of the eyes.
- [ ] **Step 2:** For each look, put the render next to its reference photographs (Task 1). Compare these:
  - the eye's apparent size.
  - the aegyo-sal band and its shadow.
  - the wing direction.
  - the lash spikes.
  - the lens ring.
  - the blush position.
  - the lip gradient.

  Note each mismatch.
- [ ] **Step 3:** Tune the values, re-render and compare again until no mismatch is left that you can fix. Record
  each fix in the research note's table.
- [ ] **Step 4:** Release checks:
  - related tests (`tests/makeup.test.ts`, `tests/human-anatomy.test.ts`, `tests/facial-expressions.test.tsx`).
  - typecheck, lint, `npm run registry:validate`, `npm run registry:smoke`, docs-status.
  - byte-identity without paint (Task 3, Step 5).

  Expected: all pass. Stop Storybook.
- [ ] **Step 5:** Commit the tuning (`fix(makeup): tune the East Asian looks against reference photographs`), push
  the branch and open a PR. The PR body lists the evidence, the review screenshots (described, not attached
  photographs of people) and the checks. Report to the owner, and merge only when the owner says so.
