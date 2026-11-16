# Shodō brush calligraphy (SHO1)

**Pack:** `shodo-calligraphy` · **Files:** `registry/video/shodo/` · **Storybook:** Video production / Film Looks / Shodō Calligraphy
**Research:** [SHO1 reference study](../research/shodo-calligraphy-reference-study-2026-11-15.md)

SHO1 writes Japanese characters with a simulated hand and brush. The shape of each mark comes from the brush motion, not from drawn outlines. Every frame is a pure function of the plan and the time, so a film can seek in any order.

## The basics: start, turn, stop, end

Every stroke is 始筆 (start) → 送筆 (travel) → 終筆 (end), the "トン・スー・トン" rhythm. Each technique is a generated brush move with its own press, hold and reach. `SHODO_BASICS` in `shodo-techniques.ts` names the ten basics, lists their steps and gives a demonstration stroke.

| Technique | Glyph API | What the brush does | Tunables in `style.technique` |
|---|---|---|---|
| 打ち込み uchikomi | `start: "uchikomi"` | The tip lands upper-left, presses 45° toward the lower right, holds (溜め), eases back. | `uchikomiDepth`, `uchikomiReach`, `uchikomiHold`, `easeBack`; angle is `hand.entryAngle` |
| 蔵鋒 zōhō | `start: "zoho"` | Enters against the direction, folds the tip in, flattens out. | `zohoReverse` |
| 露鋒 rohō | `start: "roho"` | Lands while moving; the press builds from the bare tip. | `rohoBuild` |
| 転折 tensetsu | `turns: [i]` | Lifts slightly at the corner, re-presses 45° (the shoulder), holds, turns. | `tensetsuShoulder`, `tensetsuPress`, `tensetsuHold` |
| 止め tome / 垂露 suiro | `end: "tome"` | Lifts slightly, presses again (トン), holds, gathers the tip back. Smaller on verticals. | `tomePress`, `tomeReach`, `tomeHold`, `suiro` |
| 懸針 kenshin | `end: "nuki"` | Lifts while moving to a needle point. | `kenshinLift` |
| 撥ね hane | `end: "hane"`, `hook` | Pauses, draws a short 45° line, flicks toward the hook. | `haneHold`, `haneLength`, `haneSpeed` |
| 左払い hidari-harai | `end: "harai"` | Keeps an even press, then lifts along the arc. | `haraiLift` |
| 右払い migi-harai | `kind: "right-sweep"` | Swells to a pressed foot, pauses, pulls out flat. | `footPress`, `footHold`, `pullOut` |
| 点 ten | `kind: "dot"` | Touches, presses along 45°, holds, gathers back. | `tenPress`, `tenHold` |

**結び (かな loops).** Where a かな curve comes back across its own path and the loop has room for an open counter, the brush eases off through the loop so the counter stays open. A loop counts when the path returns within 0.8 stroke widths after at least 3 widths, and the largest circle inside it is 0.6 to 4 widths across. Hairpin turns and wide bowls are not loops. `technique.musubiLift` sets how much the brush eases off (default 0.25, range 0 to 0.9). 結び is a かな technique, not one of the ten kaisho basics.

Every contact sample in a plan reports `phase` (`kihitsu`, `sohitsu`, `tensetsu`, `shuhitsu`, `renmen`), `technique` and `step`. `shodoStepLabel(sample)` gives the words for the step, so a film can caption the move on screen.

**Measured checks.** `auditShodoTechniques(surface)` measures the inked width across each rendered stroke and checks the signature of its techniques: a pressed head wider than the travel for 打ち込み, a bare tip for 露鋒, a shoulder at 転折, a heavier stop for 止め, a needle under 35 % of the travel width for 懸針, a taper for 払い, a foot for 右払い, an inked hook for 撥ね. The checks are deterministic geometry on the ink raster. They are not image recognition and they do not judge beauty.

## Modules

| File | Purpose |
|---|---|
| `shodo-style.ts` | `ShodoStyle`: hand, technique, brush, ink and paper groups; presets; `resolveShodoStyle`; path-specific `inspectShodoStyle` |
| `shodo-glyphs.ts` | Glyph format, original offline glyphs (一 二 三 永 道 山 心), `parseKanjiVgSvg`, `shodoKaishoForm` (右上がり, weight by length, 主画, longer sweeps, 懸針, 右払い feet, kana curves), `shodoJoinStrokes` (接筆) |
| `shodo-structure.ts` | The 間架結構法 rule book: `shodoStructure`, `shodoLayout`, `shodoKankaRulesFor`, `SHODO_KANKA_RULES`, `SHODO_STRUCTURE_RULES`, measured on 411 teacher models |
| `shodo-glyph-source.ts` | `loadShodoGlyph` / `loadShodoText`: a supplied teacher's form first, then bundled, otherwise KanjiVG from the pinned release, cached, with form rules; `ShodoTeacher` |
| `shodo-textures.ts` | Scanned CC0 bamboo cane and wood textures (ambientCG), embedded |
| `shodo-hand.ts` | `planShodoWriting` (strokes, air moves, ink dips), `shodoBrushPose(plan, seconds)` and `shodoStrokeNumbers` (stroke-order numbers, each nearest to its own stroke start and clear of the finished ink where possible) |
| `shodo-ink.ts` | `ShodoInkSurface`: paper raster with deposit, pooling, kasure, nijimi, colour mixing and wet sheen |
| `shodo-paper.ts` | Washi texture and the printed practice grid (`kenteiSheet`) |
| `shodo-brush.ts` | The 3D fude drawn with Canvas 2D (top or side camera), its cast shadow and `shodoFerruleHeight` |
| `shodo-techniques.ts` | `SHODO_BASICS`, step labels, width measurement and technique checks |
| `shodo-react.tsx` | `ShodoCanvas`: underlay, paper, ink, stroke-order guide, shadow, brush, motion blur. `ShodoBrushProfile`: the same writing seen from the side |
| `shodo-film-slot.tsx` | `renderShodoSlot` for FilmStage (`shodo-writing`), `shodoWritingFrames` |

## Writing any character

1. `loadShodoGlyph(char)` reads the character from KanjiVG (stroke order and centrelines) at the pinned release, or returns a bundled original when asked to prefer them. Kanji and kana both work. When the host supplies a teacher (`{ teacher }`: forms fitted to one teacher's models, `source: "teacher"`) and the teacher has the character, that form is returned as it is: it already has the teacher's layout and weights, so the steps below leave it unchanged. `teacher` can also be a list in order of preference: the first teacher that has the character writes it (`shodoTeacherFor` tells which). Characters from different teachers in one text keep each teacher's own hand. The library bundles no teacher; a teacher's forms reproduce that teacher's work and stay with the host's rights to them. The demos load the files listed in `local-assets/shodo-teachers/teachers.json` (in order), or `teacher.json` alone, when the owner has them (never committed), use them by default, and credit each teacher whose forms are on screen.
2. `shodoKaishoForm` first applies `shodoStructure`, the 間架結構法 rule book measured on 411 finished models by one teacher. `shodoLayout` finds the layout from KanjiVG's component tree, and `shodoKankaRulesFor` lists the rules that apply, in this order:
   - 天覆: a covering crown (宀, 雨, 亠, 人…) keeps its width over the body.
   - 草冠: 艹 stays compact.
   - 上下の間: 冠/脚 parts are a little narrower, with more air between them.
   - 左短右長: the left part (偏) ends higher than the right part.
   - 外形: 冠/脚 and single-part characters are about 13% taller than KanjiVG, enclosures and roofs a little taller; 偏/旁 keep their width.

   `SHODO_KANKA_RULES` gives each rule's term, reading and summary for captions. Each amount can be changed in the `structure` option, and `structure: false` turns the rules off. Bundled originals are not changed.

   Then `shodoKaishoForm` trims KanjiVG's entry and exit curls and gives the skeleton brush habits: 右上がり as a shear (verticals stay vertical, joints stay closed; 1° over KanjiVG's slope for kanji, measured), free horizontal ends that stop short (`freeEnd`, 0.88 for kanji, measured), compact dots (`dotLength`, 0.8) and a longer 提 (`riseStrokeLength`, 1.2), weight by stroke length, a longer main horizontal (主画), longer sweeps, 懸針 on a hanging final vertical, a foot on every 右払い, a pressed head on the 辶 sweep (平捺), and flowing curves for kana (weight 1.1, measured); the ゜ of ぱ and パ is a light closed ring; small kana (ゃ っ ャ ッ …) are written at about 0.6 of a full kana, on its foot (`smallKana`).
3. `shodoJoinStrokes` finds ends that meet an earlier stroke (the inner lines of 口, 目, 日) and marks them as joins: a small head and a quiet stop that hide inside the other line.
4. The hand writes the result with the ten basics. Stop knobs scale with the stroke's length: big on main strokes, quiet on short ones.

Weight is calibrated against finished models by one teacher: mean ink coverage is within 5% of the teacher's. Over 411 characters the layout rules raise the mean overlap with the teacher's models from 0.423 to 0.454 (kanji), and the gain holds on held-out characters; 10% of kanji get slightly worse (simple characters such as 人, 口 and 心 that this teacher writes wider than average). An earlier version fitted strokes to a locally installed kaisho font; it made the writing worse and was removed.

## Brush motion

The hand leans and lifts the brush as it writes, after side-view teaching videos (see the research study, §2.7):
- **Lean** (`ShodoBrushPose.leanX/leanY`, degrees): `hand.lean` toward `hand.leanAzimuth` at rest; pressing stands the brush up; travel tilts it toward the direction of motion, more with `hand.sideBrush` (直筆 0 → 側筆 1); 払い follows through, 撥ね throws toward the hook, a pushed 逆筆 entry leans against the motion. Filtered at 85 ms.
- **Height**: in contact the ferrule height falls with press (about 0.9 → 0.45 tuft lengths) and the tuft bends into an L; in the air the brush lifts nearly straight up, travels high and comes straight down onto the next start.
- `ShodoBrushProfile` draws the brush from the side; the story *Brush motion (top and side)* traces lean and height over time.

## Configuration

- **Hand (運筆):** script (楷書, 行書, 草書), speed, pressure ("strength"), width, width decay along the stroke, tip angle, entry angle, tip follow, tremor, pause scale, hairline links (連綿), resting lean and its direction, 直筆 ↔ 側筆.
- **Brush (筆):** hair, diameter (size relative to the character), tuft length, spring (コシ), bristle lanes, hair and handle colours, handle length.
- **Ink (墨):** colour and dilute colour, strength (濃墨 to 淡墨), water, load, colour-strength decay per em written, fade as the brush empties, re-dip threshold, gloss. Presets: sumi, seiboku, chaboku, tanboku, shuboku.
- **Paper (紙):** colour, absorbency (にじみ), fibre, tooth (かすれ catch), drying time. Presets: hanshi, gasenshi, sized, practice.
- **Per stroke:** `weight`, `start`, `end`, `turns`, `hook`, `pace` (speed of this stroke relative to the hand, 0.25..4; a teacher's form uses it so each stroke gets that teacher's share of the writing time), `technique` (this stroke's own technique settings over the style's, within the same ranges; a teacher's form uses it for that teacher's heads, stops and lifts stroke by stroke), `press` (one press multiplier per point, 0.4..1.8, applied where the brush passes nearest that part of the centreline; a teacher's form uses it for the swelling and thinning inside one stroke). **Per item:** `strokeInk` writes chosen strokes in another ink; the brush visits the inkstone to change ink.
- **Canvas:** `sheet` (null or `kenteiSheet(...)`), `underlay`, `paperweight`, `orderGuide` (`none`, `current`, `all` or `numbers`), `guideStrokes`, `guideColor`, `guideSize`, `brushLook` (lean, azimuth, light, shadow, cord), `cameraHeight`, `inkScale`, `reducedMotion`.

## Kanji study card

`ShodoKanjiCard` (in `src/video/shodo-demos.tsx`, story *Kanji study card*) is a study video for one kanji in three phases:

1. **Write.** The brush writes the character. Strokes in `vermilionStrokes` use 朱墨 and get the arrow guide.
2. **Review.** The sheet is fresh and the brush writes the character again. When the brush lands for a stroke, a small number fades in next to the start of that stroke. The numbers are dark vermilion (#B3301A, contrast 5.6:1 on hanshi) with a thin paper halo. Their text size is 0.42 of the brush diameter (about 24 px at 1280 × 720). `shodoStrokeNumbers` applies two rules. First, a number is nearer to the start of its own stroke than to the start of any other stroke, so it cannot be read as the number of a different stroke. Second, a number is clear of the ink of the finished character, also of ink that a later stroke writes. When no place within about 3.6 text sizes obeys both rules, the number sits on the ink at the start of its own stroke, with a wider paper halo (in 道, number 4 sits on 一 where the first stroke of 自 starts). The numbers do not overlap each other.
3. **Info.** The finished review holds with the reading card.

The ink of the character is centred in the writing panel, not in the full frame. The character is made smaller only when its ink would reach the label band or the edge of the sheet. The label "HEADING: char" shows once, at the top left of the writing panel.

| Prop | Default | Purpose |
|---|---|---|
| `char` | `"道"` | The character. Stroke data is read from KanjiVG. |
| `heading` | `"Kanji study"` | The label text. |
| `meanings`, `onyomi`, `kunyomi` | sample for 道 only | The text of the card. |
| `jlpt` | sample for 道 only (`"N4"`) | `"N5"` to `"N1"`. With no level (or `null`), the card shows no badge. |
| `words` | sample for 道 only | Useful words: `{ word, ruby, romaji, meaning }`. The Japanese word is the largest text of the row. |
| `vermilionStrokes` | sample for 道 only (`[12]`) | Strokes (from 1) written in 朱墨. |
| `layout` | `"landscape"` | `"landscape"` is 16:9 (1280 × 720), card on the right. `"portrait"` is 9:16 (720 × 1280) for phone shorts, card under the sheet. |
| `timing` | `{}` | Seconds per phase: `write` (default: the natural pace of the brush at speed 1.6), `review` (default: the same as `write`), `info` (default: 4). A phase of 0 s is skipped. When `write` is set (or `review`, with `write: 0`), the hand speed is fitted to it (0.25 to 4), and each pass is then stretched to its phase. |
| `sections` | all `true` | Turn off `label`, `meanings`, `readings`, `jlpt` or `words`. A part with no data never shows. With no card parts, the sheet fills the frame. |
| `cardFrom` | `"write"` | The phase in which the text of the card fades in (over 12 frames). The card panel always shows. |

**Sample data.** The text props fall back to a sample only when `char` is 道. For any other character, the card shows only the data that the host gives. It does not invent a reading or a level.

**JLPT levels.** JLPT has published no official kanji list since 2010, so a level is an estimate. The card takes the level as data and bundles no level table. The level of the 道 sample (N4) is from Jonathan Waller's JLPT kanji lists at tanos.co.uk. The page *Use my data!* of that site (`tanos.co.uk/jlpt/sharing/`, archived 2026-08-09) states that everything on the site that is not for sale is licensed under Creative Commons "BY", and asks for credit. A host that copies levels from those lists must credit the site.

**Phone fit.** In the portrait layout, body text is 26 design px or more and the furigana is 21 design px. On a phone frame 390 px wide, this gives 14 px body text and 11.5 px furigana. If long text does not fit the card, its text gets smaller, to 60 % at the least, before anything is cut. The card reports `data-km-fit` and `data-km-overflow`. The frame reports `data-km-ink-box`, `data-km-timeline` and `data-km-kanji-phase` for rendered-bounds checks.

## States and accessibility

- `ShodoCanvas` has `role="img"` and an `aria-label`. Hosts put readable text in the DOM (the stories use reserved bands and a card), not in the canvas.
- `reducedMotion` draws the finished writing with no brush.
- Invalid styles throw a `RangeError` that names every bad path. The studio shows these errors inline.
- The stroke-order guide measures the ink under each candidate position and takes the clearest one. The `numbers` guide shows all numbers in `reducedMotion`.

## Rights

- Bundled glyphs are original centrelines. No outline was traced from a font, a video or KanjiVG.
- The bamboo and wood textures are CC0 scans from ambientCG; provenance is in `assets/THIRD_PARTY_ASSETS.json`.
- KanjiVG data is never bundled. `parseKanjiVgSvg` reads a file the host supplies; output from it carries KanjiVG's CC BY-SA 3.0 terms (credit KanjiVG and keep the share-alike terms). The studio loads files from the pinned release `r20260714` only for characters outside the bundled set, and shows the credit.

## Evidence and limits

- Storybook stories: Studio, Start/turn/stop/end, Kanji study card, Kanji study card (9:16 short), Brush close-up, Brush motion (top and side), Film shot (16:9 and 9:16), Character gallery (any text).
- `tests/shodo-calligraphy.test.ts`: style validation, deterministic plans, the ten basics pass their checks, 結び opens a loop's counter, seek-independent ink, brush and ink share the contact, KanjiVG adapter and component tree, the layout rules, kaisho form rules and joins, kana curves, the cached loader, brush lean and height dynamics, frame-to-frame smoothness, stroke numbers clear of all the finished ink, and the kanji card phases and JLPT badge.
- The ink model is a deterministic approximation, not a fluid simulation. The glyph set is small, with proportions judged by eye against teaching models. There is no hand or arm. Human visual review at normal playback speed is still required before a film is called finished.
