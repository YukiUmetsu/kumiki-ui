# Shodō brush calligraphy (SHO1)

**Pack:** `shodo-calligraphy` · **Files:** `registry/video/shodo/` · **Storybook:** Video production / Film Looks / Shodō Calligraphy
**Research:** [SHO1 reference study](../research/shodo-calligraphy-reference-study-2026-11-15.md) · [brush photo reference note](../research/shodo-brush-reference-2026-11-16.md)

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
| 右払い migi-harai | `kind: "right-sweep"` | Swells to a pressed foot, pauses, pulls out flat. The pull-out is the last point pair, but at least `footShare` (0.2) of the stroke, so a traced form with evenly spaced points keeps its foot. | `footPress`, `footHold`, `pullOut`, `footShare` |
| 点 ten | `kind: "dot"` | Touches, presses along 45°, holds, gathers back. In a KanjiVG kanji, `shodoKaishoForm` writes a dot that falls to the left steeper than 110° (泉's first stroke, the left dot of ⺣) as a short ノ; a teacher's dots stay dots. | `tenPress`, `tenHold` |

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
| `shodo-kanji-card-plan.ts` | Item `shodo-kanji-card`: Node-safe planning of the kanji study card (`kanjiCardWriting`, timeline, geometry and safe bands, stroke times, typed intro, word highlights) |
| `shodo-kanji-card.tsx` | Item `shodo-kanji-card`: `ShodoKanjiCard` (frame-addressed) and `ShodoKanjiInfoCard` |

## Writing any character

1. `loadShodoGlyph(char)` reads the character from KanjiVG (stroke order and centrelines) at the pinned release, or returns a bundled original when asked to prefer them. Kanji and kana both work. When the host supplies a teacher (`{ teacher }`: forms fitted to one teacher's models, `source: "teacher"`) and the teacher has the character, that form is returned as it is: it already has the teacher's layout and weights, so the steps below leave it unchanged. `teacher` can also be a list in order of preference: the first teacher that has the character writes it (`shodoTeacherFor` tells which). Characters from different teachers in one text keep each teacher's own hand. The library bundles no teacher; a teacher's forms reproduce that teacher's work and stay with the host's rights to them. The demos load the files listed in `local-assets/shodo-teachers/teachers.json` (in order), or `teacher.json` alone, when the owner has them (never committed), use them by default, and credit each teacher whose forms are on screen.
2. `shodoKaishoForm` first applies `shodoStructure`, the 間架結構法 rule book measured on 411 finished models by one teacher. `shodoLayout` finds the layout from KanjiVG's component tree, and `shodoKankaRulesFor` lists the rules that apply, in this order:
   - 天覆: a covering crown (宀, 雨, 亠, 人…) keeps its width over the body.
   - 草冠: 艹 stays compact.
   - 上下の間: 冠/脚 parts are a little narrower, with more air between them.
   - 左短右長: the left part (偏) ends higher than the right part.
   - 外形: 冠/脚 and single-part characters are about 13% taller than KanjiVG, enclosures and roofs a little taller; 偏/旁 keep their width.

   `SHODO_KANKA_RULES` gives each rule's term, reading and summary for captions. Each amount can be changed in the `structure` option, and `structure: false` turns the rules off. Bundled originals are not changed.

   Then `shodoKaishoForm` trims KanjiVG's entry and exit curls and gives the skeleton brush habits: 右上がり as a shear (verticals stay vertical, joints stay closed; 1° over KanjiVG's slope for kanji, measured), free horizontal ends that stop short (`freeEnd`, 0.88 for kanji, measured), compact dots (`dotLength`, 0.8) and a longer 提 (`riseStrokeLength`, 1.2), weight by stroke length, a longer main horizontal (主画), longer sweeps, 懸針 on a hanging final vertical, a heavy foot on every 右払い (weight ×1.3, `rightSweepWeight`) whose pull-out turns 12° flatter than KanjiVG's (`footTurn`), both measured, a pressed head on the 辶 sweep (平捺), and flowing curves for kana (weight 1.1, measured); the ゜ of ぱ and パ is a light closed ring; small kana (ゃ っ ャ ッ …) are written at about 0.6 of a full kana, on its foot (`smallKana`).
3. `shodoJoinStrokes` finds ends that meet an earlier stroke (the inner lines of 口, 目, 日) and marks them as joins: a small head and a quiet stop that hide inside the other line. Across top-level parts (偏 and 旁, 冠 and 脚) only ends that already nearly meet (15 em) join, and a lengthened 主画, 払い or 提 keeps 50 em of centreline from the other parts, so 偏 and 旁 do not fuse. An end that passes through an earlier line and reaches more than 40 em beyond it crosses that line and stays free (青's top vertical, the verticals of 艹).
4. The hand writes the result with the ten basics. Stop knobs scale with the stroke's length: big on main strokes, quiet on short ones.

Weight is calibrated against finished models by one teacher: mean ink coverage is within 5% of the teacher's. Over 411 characters the layout rules raise the mean overlap with the teacher's models from 0.423 to 0.454 (kanji), and the gain holds on held-out characters; 10% of kanji get slightly worse (simple characters such as 人, 口 and 心 that this teacher writes wider than average). An earlier version fitted strokes to a locally installed kaisho font; it made the writing worse and was removed.

## Brush motion

The hand leans and lifts the brush as it writes, after side-view teaching videos (see the research study, §2.7):
- **Lean** (`ShodoBrushPose.leanX/leanY`, degrees): `hand.lean` toward `hand.leanAzimuth` at rest; pressing stands the brush up; travel tilts it toward the direction of motion, more with `hand.sideBrush` (直筆 0 → 側筆 1); 払い follows through, 撥ね throws toward the hook, a pushed 逆筆 entry leans against the motion. Filtered at 85 ms.
- **Height**: in contact the ferrule height falls with press (about 0.9 → 0.45 tuft lengths) and the tuft bends into an L; in the air the brush lifts nearly straight up, travels high and comes straight down onto the next start.
- `ShodoBrushProfile` draws the brush from the side; the story *Brush motion (top and side)* traces lean and height over time.
- **Pressed tuft:** the hair on the paper has the outline of the ink's contact patch (`shodoContactTipPower`). A loaded tuft is drawn as one wet black mass with gloss specks along its lit side, after the teacher's lesson videos (see the [brush reference note](../research/shodo-brush-reference-2026-11-16.md), third study).
- **Smooth at 30 fps.** These rules were measured frame by frame on 道.
  - The brush starts to move after 0.2 s (6 frames; `lead`, before 0.5 s).
  - An air move is one smooth arc. It uses quintic eases. The lift takes the first 42 % of the move, the travel 90 % and the descent the last 45 %. The travel starts at the speed with which the brush left the paper, so a 払い follows through.
  - A quick hop (under 0.4 s) lifts less, down to 60 % of the height. The exit hover rises only a little.
  - The spring-back of the hair starts from the bend that the hair had on the paper, so it does not snap.
  - Along a stroke, the speed (not the path) is smoothed in time: a Gaussian with σ = 22 ms. The start, the end, the exit speed, the press and the corners do not change.
  - The canvas measures the brush travel over the shutter (tip and handle top) and uses up to 16 motion-blur sub-poses.
  - Result on 道 at speed 1.6:
    - peak tip acceleration: 41 → 22 px/frame² in the air, 18 → 14 on the paper;
    - steps from a standstill to full speed: 7 → 1;
    - the largest bend step: 0.42 → 0.25.
- **The teacher's pace by default.** The kaisho hand's default speed is 0.32: a teacher's time with the brush on the paper, measured on 438 of her lesson videos (21 s per character; 3.2 s per stroke). Speed 1 is about three times as fast. Gyōsho (0.48) and sōsho (0.67) keep their pace relative to kaisho. The air moves between strokes scale with the square root of the speed, so they become about 1 s.
- **Smooth playback at any refresh rate.** The demos play on the clock: the canvas gets the exact playback position, not a 30 fps step, so the brush moves at the screen's refresh rate (60 or 120 Hz). Exported films keep whole frames.
  - The underlay, the sheet with its shadow and the paperweight are drawn once into cached layers; a frame draws only the ink and the brush.
  - `ShodoInkSurface.prepare(deadline)` stamps the strokes' ink tiles ahead of the brush, in slices, while the browser is idle; the result is the same as stamping a tile in one go. Before this, the first frame of each stroke stamped the whole stroke (up to 360 ms at the teacher's pace).
  - The ink is rasterised at 2 pixels per design pixel on every screen (`inkScale` default 2, at most 2 with the device pixel ratio).

## Configuration

- **Hand (運筆):** script (楷書, 行書, 草書), speed, pressure ("strength"), width, width decay along the stroke, tip angle, entry angle, tip follow, tremor, pause scale, hairline links (連綿), resting lean and its direction, 直筆 ↔ 側筆.
- **Brush (筆):** hair, diameter (size relative to the character), tuft length, spring (コシ), bristle lanes, hair and handle colours, handle length.
- **Ink (墨):** colour and dilute colour, strength (濃墨 to 淡墨), water, load, colour-strength decay per em written, fade as the brush empties, re-dip threshold, gloss. Presets: sumi, seiboku, chaboku, tanboku, shuboku.
- **Paper (紙):** colour, absorbency (にじみ), fibre, tooth (かすれ catch), drying time. Presets: hanshi, gasenshi, sized, practice.
- **Per stroke:** `weight`, `start`, `end`, `turns`, `hook`, `pace` (speed of this stroke relative to the hand, 0.25..4; a teacher's form uses it so each stroke gets that teacher's share of the writing time), `technique` (this stroke's own technique settings over the style's, within the same ranges; a teacher's form uses it for that teacher's heads, stops and lifts stroke by stroke), `press` (one press multiplier per point, 0.4..1.8, applied where the brush passes nearest that part of the centreline; a teacher's form uses it for the swelling and thinning inside one stroke). **Per item:** `strokeInk` writes chosen strokes in another ink; the brush visits the inkstone to change ink.
- **Canvas:** `sheet` (null or `kenteiSheet(...)`), `underlay`, `paperweight`, `orderGuide` (`none`, `current`, `all` or `numbers`), `guideStrokes`, `guideColor`, `guideSize`, `brushLook` (lean, azimuth, light, shadow, cord), `cameraHeight`, `inkScale` (default 2), `reducedMotion`.

## Kanji study card

The registry item **`shodo-kanji-card`** (`registry/video/shodo/shodo-kanji-card.tsx` and `shodo-kanji-card-plan.ts`, depends on `shodo-calligraphy`) is a study video for one kanji. `ShodoKanjiCard` is frame-addressed: the host gives the glyph (for example from `loadShodoGlyph`), the frame (30 fps, `KANJI_CARD_FPS`) and all the card text. It loads nothing and has no clock, so a video export can seek in any order. `shodo-kanji-card-plan.ts` has no React and no DOM: `kanjiCardWriting(glyph, options)` returns the layout, the brush plan, the phases, the ink box and the stroke times that the card draws, so a production tool can time a voice-over in Node before it renders.

In the stories, `ShodoKanjiCardPlayer` (in `src/video/shodo-demos.tsx`) adds the 道 sample data, loads the strokes from KanjiVG and plays the card with a transport. The video has four phases:

0. **Intro** (optional, `timing.intro`). The character is typed as on a phone or computer keyboard: a caret blinks, the reading is typed in kana (`intro.reading`, underlined while it is composed, one kana every 0.16 s), and at `intro.convertAt` it converts to the character. The character grows from the reading's size to about the size of the brush's ink and keeps a light conversion highlight for 0.5 s. While it holds it moves slowly toward the viewer (a push-in from 93 % to its full size), so the picture does not stand still. `intro.emphasizeAt` adds a short highlight pulse with a 4 % bump, for example when the voice-over says the character's name. A host that wants the subject on screen during a spoken question types early (a small `convertAt`) and emphasizes on the name. The typed character fades out during the first 0.35 s of the writing, while the brush comes down. `kanjiCardTypedAt` gives the state at any time. With reduced motion the character shows at once, with no typing.
1. **Write.** The brush writes the character in black ink (sumi). Vermilion ink (朱墨) is an option, off by default: `ink: "vermilion"` for the whole character, or `vermilionStrokes` to highlight strokes (these get the arrow guide).
2. **Review.** The sheet is fresh and the brush writes the character again. When the brush lands for a stroke, a small number fades in next to the start of that stroke. The numbers are dark vermilion (#B3301A, contrast 5.6:1 on hanshi) with a thin paper halo. Their text size is 0.42 of the brush diameter (about 24 px at 1280 × 720). `shodoStrokeNumbers` applies two rules. First, a number is nearer to the start of its own stroke than to the start of any other stroke, so it cannot be read as the number of a different stroke. Second, a number is clear of the ink of the finished character, also of ink that a later stroke writes. When no place within about 3.6 text sizes obeys both rules, the number sits on the ink at the start of its own stroke, with a wider paper halo (in 道, number 4 sits on 一 where the first stroke of 自 starts). The numbers do not overlap each other.
3. **Info.** The finished review holds with the reading card.

The ink of the character is centred in the writing panel, not in the full frame. The character is made smaller only when its ink would reach the label band or the edge of the sheet. The label "HEADING: char" shows once, at the top left of the writing panel.

| Prop | Default | Purpose |
|---|---|---|
| `char` | required (`"道"` in the player) | The character. |
| `glyph` | required | Its stroke data. The player reads it from KanjiVG. |
| `frame` | required | The video frame to show. The player runs its own clock. |
| `density` | `"regular"` | `"compact"` (9:16 only): the JLPT badge joins the title row, the word tiles are tighter and the card's text takes 350 instead of 462 design px, so the writing panel is taller. |
| `intro` | none | `{ reading?, convertAt?, emphasizeAt? }` for the intro phase. |
| `heading` | `"Kanji study"` | The label text. |
| `meanings`, `onyomi`, `kunyomi` | sample for 道 only | The text of the card. |
| `jlpt` | sample for 道 only (`"N4"`) | `"N5"` to `"N1"`. With no level (or `null`), the card shows no badge. |
| `words` | sample for 道 only | Useful words: `{ word, ruby, romaji, meaning }`. The Japanese word is the largest text of the row. |
| `vermilionStrokes` | none | Strokes (from 1) written in 朱墨 to highlight them. |
| `ink` | `"sumi"` | `"sumi"` (black) or `"vermilion"` for the whole character. |
| `speed` | `1.6` | Hand speed (0.25..4) when `timing.write` is not set. |
| `strokeNumbers` | `true` | The order numbers in the review pass. |
| `wordHighlights` | none | Timed highlights of the useful words: `{ word, at, hold? }[]`. See *Word highlights*. |
| `reducedMotion` | the viewer's setting | `true`: the word highlight has no scale or lift (fade only). Give `true` or `false` for a video export. |
| `layout` | `"landscape"` | `"landscape"` is 16:9 (1280 × 720), card on the right. `"portrait"` is 9:16 (720 × 1280) for phone shorts, card under the sheet. |
| `timing` | `{}` | Seconds per phase: `intro` (default 0), `write` (default: the natural pace of the brush at speed 1.6), `review` (default: the same as `write`), `info` (default: 4). A phase of 0 s is skipped. When `write` is set (or `review`, with `write: 0`), the hand speed is fitted to it (0.25 to 4), and each pass is then stretched to its phase. |
| `sections` | all `true` | Turn off `label`, `meanings`, `readings`, `jlpt` or `words`. A part with no data never shows. With no card parts, the sheet fills the frame. |
| `cardFrom` | `"intro"` | The phase in which the text of the card fades in (over 12 frames). At the first phase of the video it shows at once. The card panel always shows. |
| `safeInset` | none | Bands at the frame's edges that a platform covers with its buttons and caption: `{ left, right, top, bottom }`, fractions of the frame (0..0.4), for example a `VideoPlatformPreset`'s `safeInset`. See *Safe bands*. |
| `frame` | none | The video frame to show (30 fps), set by a host such as a video export. The card then has no clock of its own and renders only the picture: no transport, status line or credit (the host credits KanjiVG). |
| `pixelRatio` | the screen's, at most 2 | Backing-store pixels per design pixel of the brush canvas. Set it when the picture is larger than its design size: 1.5 for a 1080 × 1920 export of the portrait card. |

**Sample data.** The text props fall back to a sample only when `char` is 道. For any other character, the card shows only the data that the host gives. It does not invent a reading or a level.

**JLPT levels.** JLPT has published no official kanji list since 2010, so a level is an estimate. The card takes the level as data and bundles no level table. The level of the 道 sample (N4) is from Jonathan Waller's JLPT kanji lists at tanos.co.uk. The page *Use my data!* of that site (`tanos.co.uk/jlpt/sharing/`, archived 2026-08-09) states that everything on the site that is not for sale is licensed under Creative Commons "BY", and asks for credit. A host that copies levels from those lists must credit the site.

**Layout of the 9:16 card.** The readings stand side by side, with the JLPT badge on the same row. The useful words are tiles in one row (up to 3; 4 words make a 2 × 2 grid). Each tile has the word with its furigana, then the romaji and the meaning.

**Storybook controls.** Both kanji-card stories have controls for every setting: the character, the card data, the speed, the phase times, the layout, the sections, the ink, one highlighted stroke, the stroke numbers, the word highlights and the highlight motion.

**Local kanji data (stories only).** On the owner's machine, the stories fill the card from `local-assets/shodo-teachers/kanji-cards/jlpt-n5-n3.json`. Storybook serves this file as `/shodo-teachers/kanji-cards/jlpt-n5-n3.json`. It has study-card data for the 612 JLPT N5–N3 kanji, and it is never committed.
- `useKanjiCardDataset` in `src/video/shodo-studio.tsx` (beside `useShodoTeachers`) loads the file once per page. `readKanjiCardDataset` reads it and leaves out entries and fields of the wrong type.
- When the `char` control holds a kanji from the file, `fillKanjiCardContent` fills each empty card field (meanings, on'yomi, kun'yomi, JLPT, words) from the kanji's `card`. A field that still holds the 道 sample counts as empty. A value typed in the controls wins, and the JLPT option "none" also wins.
- The card shows no credit for this data. The credit line goes in the description of each video (the data's README in the private repository gives it).
- Without the file (on every other machine), the stories behave as before: only 道 has sample data.

### Word highlights

`wordHighlights` highlights the useful word cards one at a time, for example while a voice-over says each word.

- **"each".** `wordHighlights: "each"` highlights every word in turn: the first at 20 % and the last at 80 % of the video, evenly spaced, each for 2.5 s or until the next cue (`spreadWordHighlights`). This works for any kanji and any video length. It is the default of both kanji-card stories; a kanji with two words gets two highlights.
- **Cue format.** One cue is `{ word, at, hold? }`:
  - `word` is the index in `words`, from 0.
  - `at` is in seconds from the start of the video. This is the clock of the frame readout (frame / 30).
  - `hold` is in seconds. The default is 2.5 s (`KANJI_WORD_HOLD`), and the eases are included in it.
  - A voice-over cue list gives the cues directly: `at` is the start time of the spoken word, and `hold` is its length plus a short tail. The Storybook text control and `parseWordHighlights` read the same cues as text: `0@3, 1@6.5+1.5` means word 0 at 3 s, then word 1 at 6.5 s for 1.5 s.
- **One at a time.** When cues overlap, the later cue wins (by `at`, then by list order). The earlier highlight ends where the later one starts. A cue with an index outside `words`, or with a time that is not a number, is ignored.
- **Animation.** The highlight eases in during the 0.25 s after `at` (`KANJI_WORD_EASE`). It eases out during the 0.25 s before it ends.
  - At a handover, the earlier word eases out just before the later cue, and the later word eases in from the cue time.
  - The strength (0..1) comes from `wordHighlightAt(cues, seconds)`, a pure function of the video time, so every frame of an export is the same. There are no CSS transitions.
- **Look.** The highlighted card gets a light vermilion tint, a vermilion ring and vermilion romaji. The other word cards dim to 70 % opacity.
  - **9:16 tiles:** the tile lifts by 6 design px and scales to 1.045.
  - **16:9 list:** the row scales to 1.03 about its centre, over a tint layer that takes no space.
  - Only transforms and shadows change. The layout does not move, and the scaled card stays inside the card panel (measured on every checked frame).
- **Reduced motion.** With `reducedMotion` (default: the viewer's prefers-reduced-motion setting), there is no scale and no lift. Only the tint, the ring and the dimming fade.
- **Before the reveal.** A highlighted word card shows also before the card text fades in (`cardFrom`). It fades in and out with its highlight, and the rest of the card stays hidden until its reveal.

### Safe bands

Phone apps cover the edges of a short with their own buttons and caption. With `safeInset`, the label, the ink of the character and the text of the card stay inside the bands; the paper and the card panel still fill the frame.
- The label moves to the inner corner of the bands. The ink is centred in the free part of the paper: inside the bands and under the label (`kanjiCardGeometry(...).writing`).
- The card panel keeps its place at the edge, and its text gets padding of at least the side bands.
- In 9:16 the card ends above the bottom band. The band shows the brush canvas's dark felt underlay (下敷き): the platform's caption is white text, which stays readable there.
- The 9:16 card keeps the height of its text (462 design px, compact 350), so the paper above it gets shorter. With the YouTube Shorts bands (8 % left, 12 % right, 9 % top, 19 % bottom) the ink of 水 is 431 design px tall in the compact card (34 % of the frame).
- Without `safeInset` (or with all bands 0) the layout is unchanged.
- The *Kanji study card (9:16 short)* story uses the YouTube Shorts bands by default (control `safeArea`).

**Stroke-order numbers on phones.** In the portrait layout the numbers are at least 28 design px (15 px on a phone 390 px wide), also when the character is smaller.

### Video export and stroke times

- `kanjiCardStrokeTimes(plan, timeline)` gives, for the first writing and for the review, the time of each stroke in seconds of the video: `[start, end]` while the brush is on the paper, in writing order. The card also reports it as JSON in `data-km-stroke-times`. A host uses it to place a voice-over or sounds on the strokes, for example a word as the brush lands.
- `ShodoKanjiCardExport` (stories only) loads the strokes and puts the card in a `VideoExportStage` (`window.__kmVideoExport`) at the output size. A frame is ready when the strokes have loaded, the brush canvas reports ready and the card shows that frame. When the strokes cannot load, the export fails with the reason.
- `readKanjiCardExport(json)` reads a description of the video and lists every problem by path:
  - `char` and all three phase times (`timing.write`, `review`, `info`) are required, so that the length of the video is known before the strokes load.
  - The card text, `words`, `wordHighlights`, `strokeNumbers`, `safeInset` and `heading` are optional. `reducedMotion` is false unless it is given, so every export is the same.
  - The output is 1080 × 1920 (portrait) or 1920 × 1080 (landscape). `width` sets another size. A `preset` sets the preset's size and, unless `safeInset` is given, its safe bands.
- Both kanji-card stories have an export mode. `kmExport=1` with `kmCard=<URI-encoded JSON>` renders the described card for the exporter. The exporter's `--preset` names the preset when the JSON does not:

  ```sh
  npm run video:export -- --url="http://127.0.0.1:6006/iframe.html?id=video-shodo--kanji-card-short&viewMode=story&kmExport=1&kmCard=…" --preset=youtube-shorts --audio=mix.wav
  ```

**Phone fit.** In the portrait layout, body text is 25 design px or more and the furigana is 22 design px. On a phone frame 390 px wide, this gives 13.5 px body text and 11.9 px furigana. If long text does not fit the card, its text gets smaller, to 60 % at the least, before anything is cut. The card reports `data-km-fit` and `data-km-overflow`. The frame reports `data-km-ink-box`, `data-km-timeline` and `data-km-kanji-phase` for rendered-bounds checks.

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
