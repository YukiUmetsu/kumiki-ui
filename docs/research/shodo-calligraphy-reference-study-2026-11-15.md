# SHO1 — Shodō (Japanese brush calligraphy) reference study

**Date:** 2026-11-15
**Implementation:** `registry/video/shodo/` (pack `shodo-calligraphy`)
**Status:** reference study for a code-drawn calligraphy engine. It is not a claim of artist-level fidelity.

## 1. What was studied, and how

The study used text sources for technique and real writing videos for motion. Each video was downloaded at low resolution into a session scratch folder for frame study only. No frame, glyph outline or coordinate from a video, a font or KanjiVG was traced into the bundled glyphs. The videos stay with their owners. This document records observations, not copies.

| # | Source | What it shows | Frames studied |
|---|---|---|---|
| V1 | [山口芳水: スーパースロー 学習 書道 点画 (横一・縦一)](https://www.youtube.com/watch?v=96UHwtd51nk) | Super-slow close-ups of a horizontal, a vertical and a turn, top view and oblique view, on gridded practice hanshi | 0:60, 2:58–3:22 (1.5 fps), 10:00–10:30 (1.2 fps) |
| V2 | [書道用品専門店 大阪教材社: 永字八法の書き方](https://www.youtube.com/watch?v=6zy5ourKOGk) | Whole 永 in kaisho, oblique camera, the dot formed at 6 fps | 0:00–0:36 at 1 fps, 0:00–0:04 at 6 fps, final frame |
| V3 | [松本松栄堂 書道教室: 「永」の書き方とコツ](https://www.youtube.com/watch?v=afB6vG44CnI) | Top view of 永 stroke by stroke, red teaching notes | 0:00–0:58 at 1 fps |
| V4 | [新日本書道教育連盟: 永字八法 書道の基本点画](https://www.youtube.com/watch?v=eZkb8oT3FMI) | Brush held upright (筆を立てる), elbow out, oblique view of each stroke | 0:00–0:47 at 1 fps |
| V5 | [よしみん先生: お手本動画 5年「道」](https://www.youtube.com/watch?v=JXu6liF8G9M) | Top view: black model on gridded hanshi beside a vermilion (朱墨) overwrite, the same layout as the brief | 0:40–1:40 at 2 fps, 1:40 frame |
| V6 | [松本松栄堂 書道教室: 「道」の書き方とコツ](https://www.youtube.com/watch?v=QbRro_SrRkE) | 道 on hanshi over a faint grid underlay, wooden bunchin, the long 辶 sweep | 1:10 frame |
| V7 | [Emilio Nakagawa: Quick & Slow, Strong & Weak Stroke](https://www.youtube.com/watch?v=8W0qwEmOfG4) | Wide view of a teacher contrasting speed and pressure | 0:00–0:51 at 1 fps |
| V8 | [祥香堂: 条幅のレッスン #005 潤筆と渇筆](https://www.youtube.com/watch?v=uIy3bniDUz8) | Gyōsho on a hansetsu scroll: wet (潤筆) and dry (渇筆) brush in one work, captioned | 0:00–3:03 at 0.25 fps, 1:40, 1:52, 2:08 frames |
| V9 | [筆文字でかすれを出す方法](https://www.youtube.com/watch?v=g_wTl6At5oE) | Blotting the brush to make kasure, then fast strokes | 0:00–2:50 at 0.25 fps |
| V10 | [書道/半切の書き方 カスレが美しく見えるように墨をつける](https://www.youtube.com/watch?v=ViAHBRU0CiM) | Ink loading for kasure on a hansetsu work | sampled at 1/12 fps |

Text sources (graded):

| Source | Grade | Used for |
|---|---|---|
| [Takase Studios, lesson 3: basic strokes](https://takase.com/learn-japanese-calligraphy/lesson-3/) | B — a working teacher's lesson | The 45° press-and-ease entry, the brush rotation at each tome, the tategahane pause and short 45° line before the flick |
| [Takase glossary](https://takase.com/library/glossary-japanese-calligraphy-terms), [traditional calligraphy](https://takase.com/library/traditional-japanese-calligraphy) | B | Nijimi is a required quality, not a fault; kasure looks like a brush that is running out |
| [Wikipedia: Eight Principles of Yong](https://en.wikipedia.org/wiki/Eight_Principles_of_Yong) | C — summary, cites the classical texts | The eight stroke families in 永 |
| [JAANUS: gasenshi](https://projects.mcah.columbia.edu/jaanus/node/4479), [JAANUS: kappitsu](https://projects.mcah.columbia.edu/jaanus/record/kappitsu) | A — scholarly dictionary | Gasenshi spreads ink fast; kappitsu is a half-dry brush that abrades |
| [pigment.tokyo: colours of sumi](https://pigment.tokyo/en/blogs/article/colors-of-sumi) | B — specialist dealer | Blue-black and brown-black sumi; the colour difference grows as the ink is diluted |
| [Xu et al. 2002, A Solid Model Based Virtual Hairy Brush](https://diglib.eg.org/handle/10.2312/8908), [Bai et al. 2009, Chinese Hairy Brush](https://pure.nwpu.edu.cn/en/publications/chinese-hairy-brush-a-physically-based-model-for-calligraphy/) | A — peer reviewed | A brush as a deformable tuft with a contact footprint and a separate ink and paper model |
| [Oriental Art Supply: calligraphy grid practice paper](https://orientalartsupply.com/products/calligraphy-grid-practice-paper) | B — product photographs | Red ink grid lines on absorbent practice paper, major and minor weights |
| [KanjiVG stroke types](https://kanjivg.tagaini.net/stroke-types.html) | A — the data set's own documentation | `kvg:type` stroke classes for the optional adapter |

## 2. Observations

### 2.1 The brush on the paper

- **The tip trails, the belly leads.** In V1 (2:58–3:22) the inked tuft lies on the paper as a long blade. The tip points back toward where the stroke started; the belly (腹) is near the ferrule. The contact footprint is a teardrop: sharp at the tip, round and wide at the belly.
- **Pressure lengthens and widens the footprint together.** As the writer presses in V1, the blade gets both longer and wider, and the tuft bends at a knee just below the ferrule. The handle angle hardly changes; the hair takes the deflection.
- **The kaisho brush is held nearly upright.** V4 states 筆を立てる (stand the brush) and ヒジを張る (lift the elbow). The handle leans only a little toward the writer. Seen from above (V3, V5), the handle points toward the lower right for a right-handed writer and grows with perspective because its end is close to the camera.
- **Turns are a stop and a new press, not a curve.** In V1 (10:00–10:30) the brush stops at the corner of a 横→縦 turn, lifts a little, presses again toward the lower right, and the tuft folds to a sharp knee before the vertical continues with the tip now trailing upward. This is what makes the shoulder (肩) of 口, 目 and 永.
- **The entry is a 45° press, then an ease back.** Takase: "most strokes begin with the brush at a 45° angle, pressed gently and then eased back up". V2 and V3 show the same angled head on every horizontal and vertical.
- **Each ending has its own move.** Takase and V3: a horizontal tome lifts without leaving the paper, turns about 45° clockwise, presses again and lifts off. A vertical with hane pauses, draws a short 45° line down-left, then flicks up-left quickly. A right sweep (右払い) starts with no pressure, grows to a pressed "foot", pauses, turns the hair flat and pulls right while lifting, which gives the chisel end. A left sweep keeps even pressure along an arm-driven arc and lifts gradually.
- **Timing.** At a teacher's demonstration pace (V2), the 永 dot forms in about 0.5 s, and the whole character takes about 25 s with pauses between strokes. A confident performance is two to three times faster. Movement between strokes is a lifted arc through the air, not a slide.

### 2.2 The ink

- **Dense sumi on hanshi is solid black with a fibrous edge** (V2 final frame, V5, V6). The edge is not a blur. It is a thin, irregular fringe that follows the paper fibres.
- **Pools form where the brush stops.** Entry presses, turns and tome ends hold more ink than the travelling middle. These places bleed first and stay glossy longest.
- **Kasure is black and white, not grey.** In V8 (渇筆 sections, 1:52) the dry strokes show white paper channels that run along the stroke direction. The ink between the channels is still dark. The channels appear first at the outer side of curves and in fast sections, and a fast pull (スススッと引っ張る) splits the end into separate hair lines. A freshly dipped brush (潤筆, "たっぷり墨の入った線") gives smooth, full edges.
- **Ink runs down over a sequence of strokes.** V8 and V9 show writers loading the brush once and letting it empty. The first strokes after a dip are wet and full. Later strokes get kasure. The writer re-dips before the next wet passage.
- **Vermilion (朱墨) behaves like sumi with a lighter, more saturated body** (V5). Split hair lines at the end of the sweep are as visible as in black ink.
- **Diluted ink (淡墨) shows a dark wet core inside a paler, wider spread**, and the hue of blue-black or brown-black sumi is stronger when diluted (pigment.tokyo).

### 2.3 The practice sheet: a faint vermilion mesh

- **V1 practice hanshi** (0:60 and 2:58 frames) has thin vermilion print lines: a few major cells, fainter dotted half lines, short center tick marks and a small circle at the center crossing. A narrow left column holds the printed name and date field.
- **Grid papers for brush practice** (Oriental Art Supply photographs) print major and minor lines in red ink. The minor lines are clearly lighter. The print is slightly uneven where the absorbent paper took the ink.
- **The lines sit under the ink.** A dense stroke hides them completely; a pale stroke lets them show through.
- **Design decision:** the default "kentei" sheet uses a barely visible xy mesh in vermilion at about 10% opacity, with slightly stronger major lines and a center mark. All weights, the pitch and the colour are parameters. The grid is printed into the paper layer, so the ink covers it.

### 2.4 The desk

V1, V2 and V6 show the same set: hanshi on a black or navy felt underlay (下敷き), a paperweight (文鎮) across the top, the inkstone (硯) to the right. The felt is visible around the sheet.

## 2.5 Terminology: how a stroke starts, moves, stops and ends

Japanese school calligraphy (書写) teaches every stroke as three phases with the rhythm **トン・スー・トン** (press, glide, press): 始筆 or 起筆 (start), 送筆 (move) and 終筆 or 収筆 (end). [Nara prefecture teaching plan](https://www.pref.nara.jp/secure/43575/3syosya.pdf) and the [MEXT curriculum materials](https://www.mext.go.jp/a_menu/shotou/kyoukasho/tenji/000029177/20230420-000029177-mxt_ope01-031.pdf) use these words from grade 1. The engine uses the same words as its API values.

| Phase | Term | Reading | What the brush does | API value |
|---|---|---|---|---|
| Start (起筆) | 打ち込み | uchikomi | The tip touches at the upper left and the brush is pressed toward the lower right at about 45°, held for a beat (溜め), then eased back up before it moves. Gives the angular head (方筆) of kaisho. Putting the brush down is "筆をつける" (tsukeru). | `start: "uchikomi"` |
| Start | 蔵鋒 (逆入) | zōhō (gyakunyū) | The tip enters against the stroke direction ("go left to write right"), turns, and flattens into the stroke, so the tip is hidden and the head is round (円筆). | `start: "zoho"` |
| Start | 露鋒 | rohō | The tip lands while already moving and is left visible: a sharp, tapered head. Used for the start of a right sweep, for kana and for cursive. | `start: "roho"` |
| Move (送筆) | 中鋒 / 側筆 | chūhō / sokuhitsu | Center tip keeps the tip inside the line; side brush lets it lie to one side. | `hand.tipFollow`, `hand.tipAngle` |
| Turn | 転折 | tensetsu | Stop at the corner, lift a little, press again toward the lower right, then go down. Gives the shoulder (肩). | `turns: [index]` |
| Turn | 曲がり | magari | A continuous curve without a stop. | a curve with no `turns` |
| End (終筆) | 止め | tome | Lift slightly without leaving the paper, turn about 45° clockwise, press again (トン), then gather the tip back into the stroke and lift off. | `end: "tome"` |
| End | 垂露 | suiro | The vertical stop: a rounded "dewdrop" end made by a small press and an upward lift. | `end: "tome"` on a vertical |
| End | 懸針 | kenshin | The "hanging needle" vertical: the brush lifts while it is still moving, so the line ends in a sharp point. | `end: "nuki"` |
| End | 撥ね | hane | Pause (溜め), draw a short 45° line, then flick off quickly in the hook direction. | `end: "hane"`, `hook: [dx, dy]` |
| End | 払い | harai | Lift gradually while the brush keeps moving. A left sweep (左払い) tapers along an arm-driven arc. A right sweep (右払い) grows to a pressed foot, pauses, turns the hair flat and pulls out to a chisel end. | `end: "harai"` |
| Dot | 点 | ten | Touch with the tip, press down along 45°, hold, and lift off back toward the start. | `kind: "dot"` |

The plan reports the live phase (`kihitsu`, `sohitsu`, `tensetsu`, `shuhitsu`) and the technique (for example `uchikomi` or `harai`) for every contact sample, so a film can caption the move that is on screen.

## 2.6 Second study round: the dot, structure, materials

| # | Source | What it shows | Frames studied |
|---|---|---|---|
| V11 | [【書道】Slow Shodo 点 基本](https://www.youtube.com/watch?v=8EgIoqK0HLI) | One kaisho dot in slow motion, close top view | 0:00–0:18 at 2 fps and 3 fps, 0:16.8 final frame |
| V12 | [The basic stroke of regular script: "Dot"](https://www.youtube.com/watch?v=o2CQAzvNbjI) | Dot variations | sampled |
| V13 | [しんにょうの書き方](https://www.youtube.com/watch?v=tQ1uu7IxwWs), [毛筆『しんにょう』の上手な書き方講座](https://www.youtube.com/watch?v=McsU3IpLVeM) | The 辶 zigzag and its flat sweep (平捺) | sampled |

- **The dot is pressed, not dragged** (V11). The tip lands, then the tuft is pressed almost in place along about 45°; the pressed tuft's own footprint makes the shape. The result is a tilted seed: a narrow but rounded top, a convex upper edge, a broad rounded end and a glossy pool where the brush paused. A contact patch with a needle-sharp tip gave every dot and head an artificial spike; the patch now has a blunt, rounded tip.
- **Kaisho fonts show structure, but fitting strokes to a font made the writing worse.** Brush-kaisho fonts (大和楷書, AR楷書体) set beside our output showed what was wrong with a hand-authored 道 (a too-wide 目, flat horizontals, a short 辶 sweep), and confirmed general habits: spread components, long sweeps, 右上がり. An experiment that moved each KanjiVG stroke onto a font's ink raised the overlap score but squashed kana and distorted strokes; the owner judged it worse, and it was removed. Only the general habits stay, as rules in `shodoKaishoForm`.
- **KanjiVG needs a brush layer.** Its paths start and end with small curls that stand for the brush entry and stop; the hand makes its own, so the curls are trimmed. Kana have no stroke classes in KanjiVG and are written as flowing curves with exposed-tip entries and lifted ends. The 辶 sweep is class ㇏a (平捺) and starts with a pressed head.
- **jsDelivr refuses uncached KanjiVG files** ("package size exceeded 50 MB"). The loader reads the pinned release tag from raw.githubusercontent.com, which sends `Access-Control-Allow-Origin: *`.
- **Materials.** The bamboo handle uses one cane of the CC0 scan [ambientCG Bamboo001B](https://ambientcg.com/view?id=Bamboo001B) as luminance detail tinted by the handle colour; the paperweight uses [ambientCG Wood066](https://ambientcg.com/view?id=Wood066), like the wooden 文鎮 in V6. Photos of plain practice brushes on Wikimedia Commons were CC BY-SA, and CC0 museum brushes were ornate antiques, so neither was used.
- **The practice grid is coarse.** Gridded practice hanshi (V1) has lines roughly 30 mm apart, not a fine mesh.

## 2.7 Third study round: teachers' models, stroke ends, brush angle and height

| # | Source | What it shows | Frames studied |
|---|---|---|---|
| V14 | 20 model videos from one teacher (松本松栄堂 書道教室: 年 大 夢 生 有 和 東 花 春 風 学 者 右 三 川 水 日 月 永 道), for example [「大」の書き方とコツ](https://www.youtube.com/watch?v=J2tJlU0NwgQ) | Finished kaisho models with a large brush, top view | the final frame of each, upscaled 2×; writing frames of 大 at 1 fps |
| V15 | [【書道】基本の筆づかい１【横画・縦画・はね・はらい】](https://www.youtube.com/watch?v=6i3a1xfO1f8) | Low side view of a horizontal and a vertical being written | 0:06–0:46 at 2.5–3 fps; 12 full frames of one stroke |
| V16 | [Calligraphy Basics #0004: About Brush Angle](https://www.youtube.com/watch?v=QoMGnbKgTSU) | Split screen: side camera and top camera; 直筆, 側筆, 順筆, 逆筆; narrated | 0:24–2:12 at 1.5 fps; narration read from the captions |
| V17 | [書道における「直筆」と「側筆」の違い](https://www.youtube.com/watch?v=-wVHKlSnFu0), [The basics of calligraphy: direct writing and side writing](https://www.youtube.com/watch?v=EcNesvhmFQA) | 直筆 and 側筆 compared | sampled |

**Calibration against the teacher (V14).** Each finished model was cropped to its ink, normalized to a square and compared with our rendering of the same character (KanjiVG strokes plus the form rules): ink coverage (weight) and overlap (IoU). Before this round our writing covered the same characters with about 25% more ink in thin, even strokes; the base press, the footprint shape and the density rule were set so the mean coverage is within 5% of the teacher's (0.315 vs 0.302 over 20 characters). Overlap stays about 0.41: it measures layout as much as brushwork and is used only to catch regressions.

**Stroke ends, from 2× crops of the teacher's 三, 川, 日 and 大:**
- A horizontal's 止め is a raised knob: the top edge rises at the end, the end is cut on a "\\" diagonal and the bulge is on the side away from the tip. Our earlier end was a round ball (the tip direction swung as the brush gathered) and later a hanging foot (the press went down). Now the brush steps forward and up, presses forward with the tip held, and lifts straight out.
- The head of a horizontal is a blunt, tilted oval, lowest at the bottom-left. A pressed tuft lies on the paper as a seed about 1.6 times as long as it is wide, with a blunt front; only a light touch leaves a sharp point. The footprint's length and tip sharpness now follow the press.
- A 転折 shoulder steps out past the corner and is pressed down along the new direction.
- Short strokes have quiet ends, and the inner lines of boxes (口 目 日) end inside the line they meet. Ends that meet an earlier stroke are marked as joins (接筆): a small head and a stop with no knob.

**Brush angle and height (V15, V16).** The teacher in V16 says (captions):
- 書道では、筆を立てるのが基本と教わります — keeping the brush upright is the basic.
- 穂が線の中央を通り、力強い線が引けます — with the tip through the centre of the line, the line is strong (直筆).
- ほんの少し、進行方向に向けることもあります — sometimes the brush points just slightly in the direction of travel.
- 少し傾けるのを「側筆」 — tilting it a little is 側筆, for thick and sharp, expressive lines.
- この筆の傾きは、動きとかけ合わせて使います — the tilt is used in combination with the movement.
- やや右に、進行方向に倒して … 順筆 / 一度左に … 逆筆 — tilt slightly right, toward the travel (順筆); go left first (逆筆, a pushed entry).
- 指を使って傾けたり、手首を使って傾けます — tilt with the fingers or the wrist.

V16's split screen shows both cameras at once: from above, the handle is long and points toward the writer (down or down-right on the page); from the side, across the page, the same brush looks nearly upright. Both agree with a lean of roughly 35–40° toward the writer and little sideways lean, so the resting lean is 38° toward 68° (mostly toward the writer, a little right).

Frame by frame in V15: the loaded brush comes down tilted with the tuft straight; when the tip touches, the hand keeps coming down and the handle stands up; the tuft bends into an L with roughly the lower 40% lying on the paper; the ferrule drops from about one tuft length above the paper to about half; during travel the height holds and the tuft trails; at the stop the brush presses a little more, then lifts nearly straight up, and the tuft springs straight. In V16's 側筆 rows the handle tilts 30–40° toward the travel and the tuft lies along the line instead of bending.

**Model.** The hand computes a lean vector for every contact sample (`shodoHandLean`): the resting lean toward the writer (`hand.lean`, `hand.leanAzimuth`), reduced as the press grows (standing up), plus a lean toward the travel that grows with speed and with `hand.sideBrush` (直筆 → 側筆), plus follow-through on 払い, a throw toward the hook on 撥ね, and a lean against the motion on a pushed 逆筆 entry. A low-pass filter (85 ms) stands for the fingers and wrist. In the renderer, the free hair runs from the belly on the paper to the ferrule along a chord between the handle and the lying part; the ferrule height falls with press from about 0.9 to 0.45 tuft lengths. In the air the brush lifts almost straight up, travels high (a third to two thirds of a tuft length) and comes straight down onto its next start; the lean relaxes to the resting hold. The story *Brush motion (top and side)* shows both views and traces lean and height over time.

## 2.8 Fourth study round: structure rules (結構法) from 411 teacher models

**Question.** Can new characters get calligrapher-like proportions without a reference for each one? KanjiVG gives every character's strokes and its components with their positions (偏 left, 旁 right, 冠 top, 脚 bottom, 構 enclosure, 垂 hanging roof, 繞 bottom-left wrap). If a teacher handles each kind of component in a consistent way, that habit can be measured once and applied to every character.

**Data.** The same teacher as §2.7 (松本松栄堂 書道教室) publishes one short video per character. All 419 single-character kaisho model videos on the channel were listed; 412 were downloaded at 360p and the final frame of each was turned into an ink mask (411 usable: 365 kanji, 46 kana). The frames and masks stay outside the repository.

**Method.** Each character was written by our pipeline from KanjiVG (all earlier rules, no structure rules). Then:
1. The whole skeleton was fitted to the teacher's ink (move and scale on each axis), so framing differences are removed.
2. Each top-level component was fitted again on its own; the residual move and scale were recorded by component position.
3. The overall proportion (height over width of the ink) was compared by layout, and the band widths (top fifth to bottom fifth) were compared.
4. Every candidate rule was applied to all 411 characters and scored by the overlap of the normalized ink (IoU) with the teacher's model. A rule was kept only if it helped on both halves of the characters (even and odd code points), so it is not tuned to particular characters.

**Findings.**
- **Proportion is the biggest difference.** Teachers write 冠/脚 (top/bottom) and single-part characters about 13% taller than KanjiVG (median ink height/width teacher ÷ ours: 1.14–1.16 and 1.08–1.14), enclosures and roofs about 4–7% taller, and 偏/旁 (left/right) characters at KanjiVG's proportion (0.98).
- **冠/脚 parts.** Both parts are a little narrower (top 0.97, bottom 0.94) and the bottom part is a little flatter (0.95), which leaves more air between them. This added +0.022 IoU for top/bottom characters on both halves, and 78% of them improved.
- **偏/旁 parts already match.** The left part's box and the right part's box are within a few percent of KanjiVG's. Part rules there added +0.0075 IoU with more regressions, so none are applied. (The often-taught "narrow left part" is already built into KanjiVG's layout.)
- **Rejected after testing:** a top taper (teachers' top fifth is narrower relative to the full width; applying it squeezed boxes such as 口, 四, 同, 円 and doubled the clear regressions), a relief for spreading sweeps, a broader "reaches both sides" relief, and an aspect model that depends on each character's own proportion (no better than one constant per layout on held-out characters). Enclosure, roof and 辶 part rules had too few characters (14, 11, 5) to show a consistent effect; those layouts keep only their proportion factor.

**Result (all 411 characters).**

| | Before | After |
|---|---|---|
| Kanji IoU with the teacher, mean / median | 0.423 / 0.404 | 0.454 / 0.445 |
| Kanji height/width, ours ÷ teacher (median) | 0.935 | 1.014 |
| Held-out halves (gain) | | +0.027 / +0.034 |
| Kanji better / unchanged / worse | | 53% / 37% / 10% |

The unchanged group is the left/right characters. Ten kanji lose clearly (IoU drop over 0.05): 人, 元, 兄, 刀, 口, 小, 市, 心, 水, 皿. These simple characters are written wider than average by this teacher; individual characters vary about ±13% around the rules, which no general rule can predict.

**Model.** `shodoStructure` (`registry/video/shodo/shodo-structure.ts`) holds the kept medians. `parseKanjiVgSvg` now reads the component tree (`glyph.parts`), merging a component that KanjiVG splits around another one (囗 in 国). `shodoKaishoForm` applies the structure rules first, to KanjiVG glyphs only; bundled originals keep their drawn proportions. `structure: false` turns the rules off. The *Character gallery* story has a toggle to compare. §2.9 replaces this rule set with a named rule book.

## 2.9 Fifth study round: the 間架結構法 rule book

**Question.** Can the layout rules have the names that teachers use? Then a person can read each rule, check it on a character and add a new rule without a video for each character.

**The classical frame.** 間架結構法 is the study of how the parts of a character are spaced (間架) and built together (結構). 歐陽詢's 結字三十六法 names habits such as 天覆 (the top covers what is below) and 地載 (the bottom carries what is above). Later lists such as 黄自元's 間架結構九十二法 give one rule for each kind of component. Japanese school 書写 teaches the same habits as 字形の整え方: the outer shape (外形), the left part shorter than the right part (左短右長), and the space between the parts.

| Source | Grade | Used for |
|---|---|---|
| [古今圖書集成 字學典 卷83 (Wikisource)](https://zh.wikisource.org/wiki/%E6%AC%BD%E5%AE%9A%E5%8F%A4%E4%BB%8A%E5%9C%96%E6%9B%B8%E9%9B%86%E6%88%90/%E7%90%86%E5%AD%B8%E5%BD%99%E7%B7%A8/%E5%AD%97%E5%AD%B8%E5%85%B8/%E7%AC%AC083%E5%8D%B7) | A — the classical text | The names of the 三十六法 rules, such as 天覆 and 地載 |
| [Hong Kong EDB: calligraphy teaching notes on 間架結構](https://www.edb.gov.hk/attachment/tc/curriculum-development/kla/chi-edu/resources/primary/lang/calligraphy%202.pdf) | B — a school curriculum | How each structure rule is taught, with example characters |
| [仙台市 書写研究会: 書写授業の基本](https://sendai-c.ed.jp/~shoshaken/bunnsyo/r3syosyajyugyounokihonn.pdf) | B — a Japanese teachers' guide | 字形の整え方 in Japanese school 書写 |
| [art-virtue.com: 歐陽詢](https://www.art-virtue.com/history/tang/OhYangSheun/) | C — a teaching site | Background on 歐陽詢 and his kaisho |

**Method.** The data and the test are the same as in §2.8: 411 models by one teacher, the overlap (IoU) of the normalized ink, and a rule is kept only if it helps both halves (even and odd code points). Each rule was first measured on its own, on the characters that it applies to. The teacher frames and masks stay outside the repository.

**The rules that were kept.** They are applied in this order.

| Rule | Applies to | What the teacher does (measured) | Change | Alone: chars, IoU gain, halves, better / worse |
|---|---|---|---|---|
| 天覆 tenpuku | 冠/脚 with a covering crown (宀 冖 雨 人 亠 穴 癶) | The crown is wider than the body: crown ÷ body width 1.12 (KanjiVG 0.93). The gap under the crown is +0.04 of the height (KanjiVG −0.02). | The crown keeps its width (×1.032 against the other tops) | 19, +0.016, +0.013 / +0.019, 89% / 5% |
| 草冠 sōkanmuri | 冠/脚 with 艹 | 艹 is about 0.95 of KanjiVG's width | ×0.95 | 10, +0.004, +0.000 / +0.005, 50% / 10% (weak evidence) |
| 上下の間 jōge no ma | All 冠/脚 | Both parts are narrower, and the bottom part is flatter | Top ×0.94, bottom ×0.94, bottom height ×0.92 on its base line | 118, +0.039, +0.034 / +0.043, 86% / 13% |
| 左短右長 sachō uchō | All 偏/旁 | The left part ends 0.033 of the height above the right part (KanjiVG 0.009) | The left foot rises by 0.03 of the height; its top stays | 125, +0.005, +0.007 / +0.004, 48% / 34% |
| 外形 gaikei | Every character | 冠/脚 and single characters are taller than KanjiVG; 偏/旁 already match | Width × 0.905 (冠/脚), 0.885 (single), 0.955 (構), 0.95 (垂), 0.93 (繞), 0.93 (kana), 1 (偏/旁) | 365, +0.022, +0.017 / +0.025, 54% / 10% |

"Better" and "worse" mean a change of more than 0.005 IoU.

**Measured, but no rule.** 地載: the bottom parts that carry a character (皿, 心, 灬) already have KanjiVG's width relative to the top. Per-element 偏 rules (木, 亻, 糸): the data was noisy, and a visual check did not show a clear habit.

**Rejected after testing.** Crowns wider than the measured median (×1.06 and ×1.10) scored worse. The rules rejected in §2.8 (top taper, sweep reliefs, a per-character aspect model, enclosure, roof and 辶 part rules) stay rejected.

**Result (all rules, all 411 characters).**

| | Before | After |
|---|---|---|
| Kanji IoU with the teacher, mean / median | 0.423 / 0.404 | 0.457 / 0.449 |
| Held-out halves (gain) | | +0.030 / +0.036 |
| Kanji better / worse | | 68% / 20% |
| Kana IoU, mean | 0.360 | 0.367 |

| Layout | Chars | IoU before → after | Better / worse |
|---|---|---|---|
| 冠/脚 top/bottom | 118 | 0.388 → 0.455 | 86% / 8% |
| Single part | 92 | 0.466 → 0.502 | 75% / 23% |
| 偏/旁 left/right | 125 | 0.429 → 0.434 | 45% / 31% |
| 構 垂 繞 enclosure, roof, wrap | 30 | 0.406 → 0.424 | 73% / 13% |
| Kana | 46 | 0.360 → 0.367 | 50% / 39% |

The same ten kanji lose clearly (IoU drop over 0.05): 人, 元, 兄, 刀, 口, 小, 市, 心, 水, 皿. This teacher writes these simple characters wider than any general rule predicts.

**How a new character is laid out.** KanjiVG gives the strokes and the component tree. `shodoLayout` finds the top-level layout. `shodoKankaRulesFor` lists the rules that apply. `shodoStructure` applies them. No video of the character is necessary. `SHODO_KANKA_RULES` gives each rule's term, reading and summary for captions and teaching views. To add a rule, measure it on the teacher set, apply it to all characters, and keep it only if both halves improve.

## 2.10 Sixth study round: learning each character from the teacher

**Question.** When a teacher's model of a character exists, can the engine write that character as the teacher wrote it, not only by general rules? The owner asked for this to be the default whenever a teacher is available.

**Writing time of each ink pixel.** The camera does not move while the teacher writes. A pixel that shows bare paper is not written yet, and ink never goes away. So a pixel's writing time is the first dark frame after the last frame that showed bare paper; the hand and the brush can hide or darken a pixel for a while, but they cannot make ink look like paper.
- The fixed shot is found from the cuts, and its end from a thin strip just inside the paper's left edge: ink, brush and hands never reach it, and a crossfade to the next shot always changes it.
- The paper is the bright region around the character. The paperweight is top ink that never showed bare paper. Small marks apart from the character are removed.
- Ink that was hidden under the hand before it showed dark has no reliable time. Only "fresh" ink, paper to dark within 0.4 s, is used to follow the brush.

**Strokes.** The brush's position at each frame is the largest patch of fresh ink added in the last 0.3 s. Its runs are joined into strokes: a pause in place, a crossing of older ink in the same direction, or a quick continuation joins; a jump starts a new stroke. An order-keeping alignment then matches the runs to KanjiVG's strokes by distance and direction, merging runs and skipping short stray runs. In a random check of 16 characters, 14 were split exactly right and the two complex ones (感, 徳) looked right.

**Fit.** Each stroke of our form is fitted to the teacher's stroke with one smooth transform (affine about its centre and a gentle bend), so that the line lies on the teacher's ink, in its middle, and covers its skeleton. Kana strokes then follow the middle of the teacher's line. Three rounds through our own renderer set each stroke's weight, its two ends and its centring. Two variants were rejected after testing: a press profile along each stroke (lumpy strokes) and a press range wider than the weight's (no gain).

**Gate.** A character keeps its teacher form only when the form matches the teacher's finished model at least as well as the rules do, its video starts before the first stroke, and its ink is complete: 322 of 406 characters. The other 84 use the rules.

**Result.** Overlap with the teacher's finished models, the same measure as §2.8–2.9:

| | Rules | With teacher forms (gated) |
|---|---|---|
| Kanji IoU, mean | 0.457 | 0.597 |
| Kana IoU, mean | 0.367 | 0.496 |

These numbers say how closely the engine reproduces this teacher's own models. They are not a prediction for characters the teacher has not written; those keep the rules.

**Data handling.** The fitted forms reproduce one teacher's work. They stay on the owner's machine in `local-assets/shodo-teachers/` (git-ignored) and are never committed or bundled. A film that writes a teacher's characters needs that teacher's permission. The forms keep KanjiVG's stroke order and kinds, so KanjiVG's credit and share-alike terms also apply.

**Model.** `ShodoGlyph.source` can be `"teacher"`; `shodoKaishoForm` leaves such a glyph as it is; `loadShodoGlyph(char, { teacher })` uses the teacher's form first. The studio and the character gallery load `local-assets/shodo-teachers/teacher.json` when it exists and use it by default, with a switch to compare with the rules.

**Limits.** The rules still write 84 of the teacher's characters (split failures, videos that start after the first stroke, incomplete ink). Kana loops (よ, あ, る) stay smaller than the teacher's. Heads and stops come from the technique programs, not from each stroke of the teacher. The writing time of every stroke is measured but not yet used to set the hand's rhythm.

## 2.11 Seventh study round: checks, harder strokes and the teacher's rhythm

**A better reference.** About one video in six ends on a model that is not the writing just shown (the overlap of the two is below 0.65 after the best small shift and scale). Forms are therefore compared with the live writing that they were learned from, after the best small shift and scale, which a single long sweep tip cannot distort as it can a box normalization.

**Checks before a form is used.**
- *Complete data*: the timed ink must cover at least 80 % of the end-of-video model. A shot that starts after the first strokes or ends before the last (旅, 史, 井) fails, so those characters keep the rules.
- *Every stroke*: each stroke must lie on the teacher's ink (precision 0.45 or more) and cover its own stroke (recall 0.25 or more). The overlap of the whole character hides a broken small stroke; this check does not (神's radical, 羊's foot).
- A stroke that fails goes back to the rule shape, placed with the character's mapping, and is checked again.
- Near-ties (within 0.03) go to the teacher's form.

**Harder strokes.**
- *Width*: measured across the stroke only where it does not run into an earlier stroke, and the whole character's ink is scaled to the teacher's total. Before, the forms carried 9 % more ink than the teacher's; now 0 %.
- *Shapes far from KanjiVG* (long sweeps, 史's ノ): a second candidate lays the stroke along the teacher's own brush path and wins when it lies clearly better on the teacher's stroke. 圧 0.39 → 0.78, 史 0.48 → 0.67, 顔 0.50 → 0.70. 349 of 2897 strokes use it.
- *Dots*: sized from their area and from their length along their own axis.
- *Kana*: the brush-path variant is kept for あ き け し に ふ む ら り れ, where it lies better.

**Rhythm.** The brush trace gives the time each stroke was being written (frames that added ink; pauses for explanation are left out). `ShodoStrokeSpec.pace` scales the hand's speed for one stroke, and each form's paces give every stroke the teacher's share of the writing time. The hand's speed still sets the tempo. Per-stroke shares match the teacher's within 0.002 on average (0.036 without pace), and the shapes do not change (overlap 0.726 with and without).

**Result.** Best-aligned overlap with the teacher's live writing:

| | Rules | With teacher forms |
|---|---|---|
| Kanji (360) | 0.564 | 0.677 |
| Kana (46) | 0.498 | 0.640 |
| The 326 characters with a form | 0.581 | 0.726 (98 % better) |

**Limits.** 80 characters keep the rules: about 40 for incomplete data and the rest for a stroke that still fails its check. Kana loops are still small (よ, あ, る); や and ゆ fail. Heads and stops come from the technique programs.

## 2.12 Eighth study round: dots, jump cuts, and each stroke's head and stop

**Dots.** Most strokes that still failed their check were dots: the dots of 氵 and 丷 are written quickly one after another, and the brush trace gave both blobs to one dot. A dot is usually a separate blob of ink, so each KanjiVG dot now takes the blob nearest its expected place, the blobs in the order they were written. 汚, 浅, 源, 羊 and 羽 pass.

**Jump cuts.** Many videos that seemed incomplete are cut once while the camera stays where it is (the editor removed a pause). Neighbouring runs with the same paper box are joined into one writing shot when every ink pixel before the cut is still dark after it (a re-framed shot moves the ink by a few pixels and is not joined), so ink written before the cut keeps its time. 旅, 史, 井, 不 and 筆 among 13 characters become complete; 30 stay incomplete.

**Heads, stops and lifts.** `ShodoStrokeSpec.technique` gives one stroke its own technique settings over the style's, within the same ranges. The fit compares, on our stroke and on the teacher's, the widest point of the head and of the stop with the stroke's middle width, and how long a 払い stays thin before it ends; it sets `uchikomiDepth`, `tomePress` and `haraiLift` or `kenshinLift` stroke by stroke. 1104 strokes have their own settings. On a test set of eight characters the change was small and mostly positive (overlap in the teacher's frame 0.743 → 0.750).

**Choice per character.** Each round keeps, per character, the form that lies best on the teacher's live writing among the forms that passed their checks.

**Visual review.** The forms whose data changed in this round were compared with the teacher one by one. 59 of 60 looked right; 侍 lost its 亻 (the shot misses its first moments) and keeps the rules. A label-free check for teacher ink that our ink leaves uncovered was tried and dropped: this teacher's ink is bolder on the lower right of every stroke in some videos, so the check flagged good forms and missed 侍.

**Result.** Best-aligned overlap with the teacher's live writing (the shots now include the jump cuts):

| | Rules | With teacher forms |
|---|---|---|
| Kanji (360) | 0.571 | 0.707 |
| Kana (46) | 0.498 | 0.675 |
| The 352 characters with a form | 0.579 | 0.742 (99 % better) |

**Limits.** 54 characters keep the rules: 30 for incomplete data (a shot that really changes the camera, or a final model that is not the writing shown) and the rest for a stroke that fails its check. Kana loops (よ, あ, る) are still smaller than the teacher's.

## 2.13 Ninth study round: more complete shots, dots on unexplained ink, and review

**Shots.** The paper box of a shot is measured on its median frame, and the hand or arm often covers part of the sheet there. Cuts are now joined when the boxes differ by up to 20 px, still only when every ink pixel before the cut is dark after it. 冬, 教, 火, 盆, 礼, 祭 and 能 become complete; 23 characters stay incomplete.

**Dots on unexplained ink.** A dot that lies off the teacher's ink after the repair goes to the nearest blob of teacher ink that none of our other strokes explains, and takes that blob's size. Its check is then precision only (0.6 or more), because the stroke split's label is what was wrong. 善, 希, 帰, 悟, 科 and 際 among others pass.

**A missing component.** In a 3 × 3 grid over the teacher's character, a cell that holds a fair share of the teacher's ink but almost none of ours means a missing radical (短 lost 矢). Such a form keeps the rules.

**Kana loops.** Measured again, the kana strokes are as wide as the teacher's along their paths (median ratio 1.00) and the paths follow the loops; earlier overlays drew our outline at a stricter threshold than the teacher's mask. 41 of 44 kana look like the teacher; よ, る and ゐ close their inner loops a little.

**Review.** Every form that this round added or changed (187) was compared with the teacher by eye. 侍, 杉 and 松 keep the rules (侍 lost 亻; 杉 and 松 write 木 like 扌 in every round). 暑, 雪 and 町 keep the round-three form: their new shot data was worse, and the new form followed it. The decisions are kept with the local data so later rounds respect them.

**Result.** Best-aligned overlap with the teacher's live writing:

| | Rules | With teacher forms |
|---|---|---|
| Kanji (360) | 0.575 | 0.717 |
| Kana (46) | 0.498 | 0.677 |
| The 365 characters with a form | 0.580 | 0.743 (99 % better) |

**Limits.** 41 characters keep the rules: 23 for incomplete data, 3 after review, the rest for a stroke that fails its check. The checks catch a missing stroke or component, not a wrong shape with the right amount of ink; review stays the last step.

## 2.14 Tenth study round: strokes written before the shot, and crossings

**What "incomplete" was.** Of the 23 characters, about half had their first component already on the sheet when the shot began (亻 of 信, 礻 of 福, 加 of 賀, 隺 of 鶴); five were complete, with an end-of-video model that is another writing (々, 涙, 期, 女, 必); the rest had a shot that starts or ends in the wrong place.

**Ink already on the sheet.** The shot's first second and last second and a half are kept as medians (the hand does not count). Ink that is there at the start and still there at the end, inside the sheet and not the paperweight, is kept without a time. The first KanjiVG strokes whose paths lie on it take it by position; the timed alignment covers the rest.

**Completeness.** A shot is incomplete only when a patch of its final ink that our ink does not explain is larger than 8 % of the ink. A share of the final ink was the wrong measure: a brush resting on the sheet at the end made complete characters look incomplete.

**Crossings.** A gap of 0.3 s or less across old ink is one stroke: the brush did not lift. Before, the vertical of 木 broke at the horizontal and every later stroke of 木 moved up by one, so 杉 and 松 wrote 木 like 扌. They now pass review.

**The paperweight.** Keeping the ink that is there from the start also kept the paperweight, which breaks into short pieces and catches light at its edge. The rows at the top of the sheet where that early ink covers a third of the width are the paperweight; no ink at or above its lower edge is kept. Characters keep their highest strokes, which lie below it.

**A conservative merge.** New data changes the stroke labels of many characters, and label-based checks then fail forms that review had passed. The round therefore starts from the reviewed set, adds new characters, and replaces a reviewed form only when the new one lies clearly better on the teacher's writing (+0.02). Every added or replaced form (62 over two passes) was reviewed: 圧 keeps its round-four form.

**Result.** Best-aligned overlap with the teacher's live writing (the reference ink now includes pre-written strokes, so the numbers are not directly comparable with §2.13):

| | Rules | With teacher forms |
|---|---|---|
| Kanji (360) | 0.585 | 0.736 |
| Kana (46) | 0.498 | 0.678 |
| The 381 characters with a form | 0.581 | 0.746 (99 % better) |

**Limits.** 25 characters keep the rules; 侍 still loses 亻 and stays rejected.

## 2.15 Eleventh study round: whole shots, the hand on the sheet, and かな loops

**Why 38 characters had no form.** None of the causes was in the teacher's writing:
- *The shot ended or began too early.* The end-of-shot test watches a strip just inside the paper's left edge, which a crossfade changes for good. A hand that writes near that edge (亻, a left sweep, the left dot of 小) changes it too, for a few seconds. In 33 videos the shot ended before the last strokes (方 小 太 参 考 池 町) or began after the first ones (信 侍 福 九 八 名 春). Steady stretches of the strip are now joined across a gap of up to 8 s when the ink from before the gap is still exactly in place after it: no shift of one or two pixels fits better, and 95 % of it is kept. A still of the finished sheet after the writing is shifted by a pixel and is never joined.
- *The hand was still on the sheet.* The clean step found the paper in the last frame. When the hand was still on the sheet, the paper had a notch, and the ink next to it was dropped: 建 kept 291 of 12,657 pixels, and 人 小 方 呼 太 参 kept none. The paper is now the convex outline of the bright region. The clean step drops a mark as part of the paper's border only when the mark lies mostly in the border band or meets the band over more than 150 pixels. A stroke whose tip reaches the edge (the sweep of 人) stays.
- *Seven videos were missing.* Six downloaded on a second try. The video for か still fails (HTTP 403).

**Lines.** The clean step now drops seams between the sheet and a white side bar, creases and grid lines: marks at least 30 px long, never more than 7 px thick and at most 6 px wide on average. The completeness check ignores straight patches (at most 15 px thick, at least 60 px long). All ten videos that it still flagged showed only the lower edge of the paperweight or a seam. No video is incomplete now (23 in round five).

**More of each character is timed.** Strokes that the shot used to miss now have a writing time. The stroke split now gets 不 九 八 右 行 好 必 名 春 right, and each stroke's pace comes from the teacher's complete writing time.

**結び (かな loops).** In 17 かな (あ お す な ぬ ね は ひ ほ ま み め よ る ゐ ゑ を), a curve comes back across its own path. The teacher's loops keep an open counter; ours filled with ink. The engine now eases the press through such a loop (`technique.musubiLift`, default 0.25). A loop counts only where the path returns within 0.8 stroke widths after at least 3 widths, and the largest circle inside it is 0.6 to 4 widths across. Hairpin turns and wide bowls are therefore unchanged. Over the 17 かな, 0.25 gave the best overlap (0.653; 0.650 with no lift), and on review it opens the counters. Fitting the lift stroke by stroke did not help. Matching the loop's line width closed the counters again. Matching the counter's area thinned る and ゐ to a hairline, because their loops are smaller than the teacher's: the size of the loop is the next thing to learn.

**Review.** Every added, replaced or re-rendered form was compared with the teacher:
- 30 forms were added. 侍 is among them: its 亻 is now in the data, so it is no longer rejected.
- 29 forms were replaced. 女 gets back the horizontal stroke that the old shot missed.
- 17 かな now have lighter loops.

午, 達 and 秋 keep their round-five forms: the new ones merge the top strokes of 午, break the 辶 of 達 and shrink the sweep of 火 in 秋. 統 keeps its round-five form, which only the new stroke labels disagree with. や keeps the rules, because the new form loses its loop.

**Result.** Best-aligned overlap with the teacher's live writing, on the new reference ink. On the same ink, the round-five forms score 0.737 for kanji and 0.676 for かな.

| | Rules | With teacher forms |
|---|---|---|
| Kanji (371) | 0.590 | 0.750 |
| Kana (47) | 0.501 | 0.679 |
| The 410 characters with a form | 0.582 | 0.747 (all better) |

**Limits.**
- 8 characters keep the rules: や after review, and ゆ 八 建 桜 様 短 読, whose forms fail a check. 建 and 様 still have debris in the teacher's ink: a seam piece, and the shadow of the hand that holds the sheet.
- か has no video.
- The loops of る ゐ ぬ ね are smaller than the teacher's.

## 2.16 Twelfth study round: かな from the teacher's own brush path

**Where the error was.** The lowest-scoring forms were mostly かな (お ゑ ひ わ ほ を れ). The kanji that scored low (念 感 祭 寒) looked right on review: thin dots and the overlap measure keep their scores down. A かな stroke is fitted in one of two ways. Either the KanjiVG line is bent onto the teacher's ink, or a line follows the teacher's brush path. A typeface skeleton cannot follow her curves. The brush-path line could, but it had two faults:
- It ran along one edge of the fresh ink, not the middle.
- It kept at most 8 points for a whole curve, so a loop collapsed into a corner (む) or made a detour (わ).

**The brush path, done properly.** A かな brush path is now:
1. put in the middle of the stroke;
2. smoothed by 2.5 px, which is far less than the size of a loop but removes the jitter between frames (a bump in ほ, bulbs at the ends of さ);
3. kept with up to 20 points per run (the engine takes up to 24).

Without smoothing the overlap was a little higher, but the forms showed the jitter, so the smoothed version was kept.

**The stroke split.**
- *Hidden ink.* お wrote its horizontal, then the vertical, loop and bowl in one stroke. The hand hid the bowl's lower part for 3 s, and that pause looked like a stroke boundary, so the horizontal took the whole vertical, loop and bowl. For かな, two runs apart by a pause of 1.5 s or more that lie nearest the same KanjiVG stroke may now be one stroke. This changes only あ, お and ゆ.
- *Skipped runs.* Ink of a run that the alignment skips now goes to the stroke of the nearest kept run. Before, it could only go to runs that had already started, which are the earlier strokes, so 八's right stroke began with the left stroke's label.

**Review in both directions.** A form that fails only a label-based check (a weak stroke, a stroke left on the rules, a grid cell) but looks right on review is now accepted (桜, 読). It still has to pass the overlap and completeness checks. Review also rejected two new forms: 短 loses the long sweep of 矢 and か loses its first stroke's sweep, so both keep the rules. The か video downloaded as a video-only stream, so all 419 videos are now in the data.

**Result.** Best-aligned overlap with the teacher's live writing:

| | Rules | Round six | Round seven |
|---|---|---|---|
| Kanji (371) | 0.590 | 0.750 | 0.753 |
| Kana, the 47 of round six | 0.501 | 0.679 | 0.697 |
| Characters with a form | | 410 | 413 |

15 かな and 28 kanji changed, and 八 桜 読 were added. All were reviewed against the teacher. お's loop, わ's and む's bowls, and the curves of の ひ を す now follow her writing.

**Limits.**
- か や ゆ 建 様 短 keep the rules.
- The loops of る ゐ ぬ ね are still smaller than the teacher's: their brush-path forms did not beat the reviewed forms.

## 2.17 Thirteenth study round: alignment by parts

**A good total can hide a wrong part.** The owner found a form whose total matched well but whose top was very different (the ノ at the top of 毎 in 海). So each character is now measured part by part:
- Each stroke is measured against the teacher's stroke. The measure counts the teacher's ink that our form misses plus the ink our stroke adds where the teacher has none, divided by the area of the teacher's stroke.
- A label-free measure takes the largest connected patch of mismatch. It finds a different part even where the stroke split is wrong.

Review now uses overlays: the teacher's ink and our form in two colours. The difference that side-by-side boards hide becomes plain, for example a form a few pixels off the teacher's position, or a stroke end that stops short.

**What was wrong.**
- *Strokes off by a few pixels.* Many forms sat a few pixels from the teacher's strokes. The overlap measure forgave this, because it searches a wide shift and scale.
- *Stroke ends.* Ends carried most of the mismatch: per unit of length, three times as much as the middle of a stroke.
- *Stroke split.* In 海, the teacher writes the ノ and the 一 of 毎 in one motion, and the stroke split gave the long ノ to the 一.

**What changed.**
1. Every character is fitted twice:
   - the KanjiVG line bent onto the teacher's stroke, now with a smooth sideways correction along the whole stroke, end moves of up to 16 px and five iterations;
   - the teacher's own brush path, centred and smoothed, for kanji as well as かな.

   Each stroke comes from the fit that lies closer to the teacher's stroke.
2. A reviewed form is replaced only when the new one overlaps better and no part looks worse.
3. An optional rule in the stroke split keeps a long run off a stroke whose kind it crosses (a horizontal is not written downward). It fixes 海 and eleven other characters but hurts characters with 心, so a round with it is merged character by character.
4. The worst characters then had each stroke end moved along the stroke and tried against the teacher's ink, keeping only moves that help.
5. Three forms held back by earlier reviews (午 町 圧) were fitted again and now pass. 雪 and 暑 keep their held forms.

**Result.** 240 forms changed, plus end corrections on 70 characters. All were reviewed with overlays.

| | Round seven | Round eight |
|---|---|---|
| Kanji (371) | 0.753 | 0.773 |
| Kana (48) | 0.691 | 0.708 |
| Median stroke discrepancy | 0.17 | 0.14 |
| Characters with a mismatch patch over 5 % of the ink | 98 | 42 |

**Limits.** The remaining large patches are:
- whole parts drawn at the wrong scale (岡);
- かな shapes (ひ ゐ ゑ み ろ);
- the hook of 心.

## 2.18 Fourteenth study round: characters from the teacher's word models, and several teachers

**Word models.** The teacher has 111 word models: whole words on one sheet, in vertical writing, right column first, in vermilion ink. They hold characters for which she has no single-character model. To learn them:
- *Vermilion ink.* Vermilion is read as ink. Bare paper must also be unsaturated, so a hand over written vermilion does not look like paper and does not reset the writing time.
- *One character per writing segment.* Characters touch, so a cut by position fails. The timed ink is cut into one segment per character in writing order, and each segment is as compact on the sheet as possible. A patch of ink goes to the segment that wrote at least 75 % of it, so a late touch stays with its character.
- *A virtual sheet.* Each new character gets a sheet of the single-model proportions, sized from its own ink (ink is 0.779 of the sheet width on single models). Its size in em then agrees with the single models.
- *A fixed em frame.* The frame that maps the sheet to em is now kept in a file, so new data does not move reviewed forms.

**Result.** 15 characters are new: ぼ じ 射 玉 カ ど 朗 理 想 鳴 台 が 間 進 from word models, and 夢 from a single model. All were reviewed against the teacher. Their overlap is 0.544 with the rules and 0.757 with the forms. 仲 keeps the rules (its 中 collapses). Twenty characters are left out: ten words do not cut into one compact character per segment (蒼 貢 献 農 振 興 清 里 式 ば), and ten cuts were wrong at review (遺 草 謝 解 ス テ ラ び で ぎ).

**Several teachers.** `teacher` now also takes a list. The first teacher in the list that has a form for a character writes it, and the rules write a character that no teacher has. A second teacher can then fill characters that the first one does not write.

## 2.19 Fifteenth study round: word models cut again, and a second teacher

**Word models, cut again.** Twenty characters from the word models had no form. The cause was a hand or a sleeve over a written character: it delays the writing time of some of that character's pixels, so they fall into the next character's segment, and that segment is then not compact. Now:
- ink that lies apart from its segment's main body goes to the segment whose main body is nearest, and ink far from every main body is dropped;
- only the characters that a word is cut for must be compact, and such a character must not lie in the same place as another segment (one character cut in two);
- when a word does not cut cleanly, the next word that holds the character is tried.

Fifteen characters now cut. Review accepts 11 forms (草 謝 貢 遺 農 振 興 解 清 里 蒼). ば, ぎ and び keep the rules: a dakuten on the tail of a loop, a diagonal a few pixels off, and an offset bowl. 献 fails the automatic gate.

**A second teacher.** The second teacher's videos show the same character four times: with a pen, a brush pen, a large brush beside a model card, and as an art piece. The large-brush take is found from the card.
- *Size.* His sheet is larger than the camera's view, and the zoom changes from video to video, so the paper does not give a size. Each character gets a virtual sheet on which his ink has the size and centre of the rules form (外形).
- *Data.* Many extractions are another take, caption text, or partial writing (the card take often starts after the first strokes). 65 clean takes were chosen by eye before fitting.
- *Result.* His strokes are thinner and freer than the first teacher's. Four forms match his writing closely (叶 確 罪 臣, overlap 0.71 to 0.79). Other forms have one part that lies off his stroke (the long sweep of 木 in 根, a flick of 長 in 張) and keep the rules.

**Not yet learned.** か, や, ゆ, 短, 様 and 建 have single models but keep the rules: the sweep of か's ノ and of 矢 stays short, and the loops of や and ゆ stay small. 様 and 建 had the sheet's edge in their ink; it is now removed, but their fits are not yet close.

| | Round nine | Round ten |
|---|---|---|
| First teacher's forms | 428 | 439 |
| Second teacher's forms | | 4 |

## 2.20 Sixteenth study round: stroke ends, whole parts and single strokes tried, and two more teachers' videos

**Every stroke end.** Round eight tried stroke ends only on the 80 worst characters. Now every reviewed form of the first teacher has each stroke end moved along the stroke by −24, −12, +12 and +24 em and rendered. A move is kept only when the overlap with the teacher's ink rises and the largest mismatch patch does not grow, and a character keeps its new ends only when all of them together still help. Every changed form was then reviewed in overlays, with the changed pixels outlined.

**Whole parts.** Moving ends cannot fix a part at the wrong place or scale (the inner part of 岡, the ヨ of 雪). For the weak kanji (a stroke over 0.5 discrepancy, or a mismatch patch over 3 % of the ink), each KanjiVG component of two or more strokes is moved by 16 em in eight directions or scaled by 8 % about its centre. The best change is kept when the overlap rises and no mismatch patch grows. Three passes changed 34 forms, all reviewed in overlays.

| In the fit frame | Round ten | Round eleven |
|---|---|---|
| 岡 | 0.54 | 0.72 |
| 雪 | 0.43 | 0.66 |
| 暑 | 0.60 | 0.77 |
| 賀 | 0.59 | 0.78 |

Some of these forms got larger, toward the teacher's own size: she writes 暑 1126 em tall.

Characters without parts of two strokes (心 八 火, the かな) then had each stroke tried on its own in the same way. Over the 64 weakest forms, 38 changed (心 0.65 → 0.71, 八 0.67 → 0.72, 火 0.66 → 0.72 in the fit frame).

**Result.** 336 forms have new ends, 34 have moved parts and 38 have moved strokes; the ends of the moved forms were then tried again (32 changed). All were reviewed in overlays.

| | Round ten | Round eleven |
|---|---|---|
| Best-aligned overlap, the 439 forms | 0.769 | 0.780 |
| Kanji | 0.772 | 0.782 |
| Kana | 0.692 | 0.699 |
| Overlap in the fit frame (the teacher's size and position) | 0.781 | 0.801 |
| Median stroke discrepancy | 0.14 | 0.12 |
| 95th percentile of stroke discrepancy | 0.45 | 0.35 |
| Characters whose worst stroke is over 0.6 | 51 | 35 |
| Characters with a mismatch patch over 5 % of the ink | 44 | 22 |

The best-aligned overlap rescales both shapes to their boxes, so moved parts change it little; the overlap in the fit frame shows them. The weakest forms are now 雪 (0.67) and 達 敬 感 (0.70) among kanji, and ゑ (0.58), ゐ (0.64) and ひ (0.65) among かな, whose loops are smaller than the teacher's.

**The second teacher's large-brush take.** His take beside the model card is semi-cursive. The large-brush kaisho take comes before it, with the whole sheet in view. Two simple rules (the minute before the card; the shot whose new ink has the thickest strokes) do not find that take reliably, because his lessons also hold pen and brush-pen takes, and a hand or a sleeve can pass for thick ink. The four forms of round ten stay; the large-brush take is the next thing to find.

**A third teacher.** A third channel writes each character in vermilion, sped up, and then explains it on other sheets. Taking the shot from the start to the moment the ink stops growing gives whole characters, and a sheet that holds the character twice keeps the copy written first. But the first stroke is often already on the sheet when the lesson starts, and the stroke split is weak, so the fits lie a few pixels off along most strokes (0.54 best-aligned overlap on average). No form of this teacher is accepted yet.

## 2.21 Seventeenth study round: the teacher's press along a stroke

**What was wrong.** After the parts were aligned, the weakest forms were かな. Their overlays show the teacher's ink as a border around ours in some places and ours outside hers in others: she swells and thins inside one stroke (the heavy start of ひ, the thick right side of の), while our stroke keeps one width, set by its `weight`.

**What changed.**
- *Engine.* A stroke can carry `press`: one multiplier per centreline point, 0.4 to 1.8. Every brush sample's press is scaled by the profile where the sample lies nearest the centreline. A stroke without it is written as before.
- *Learning.* At each point of each stroke, the half-width of the teacher's stroke is compared with ours, both on that stroke alone. The point's press moves toward the ratio, damped and smoothed along the stroke. Three rounds go through the renderer. A character keeps its profiles only when its overlap rises and no mismatch patch grows.

**Result.** 46 forms changed, and the stroke ends of those were then tried again (10 changed); all were reviewed in overlays. They are 23 of the 48 かな and kanji with curving strokes (心 鳥 月 寿). 114 strokes carry a profile. A second round of press changes only one form: the fit has converged.

| | Round eleven | Round twelve |
|---|---|---|
| かな, best-aligned overlap | 0.699 | 0.711 |
| かな, overlap in the fit frame | 0.741 | 0.756 |
| Characters with a mismatch patch over 5 % of the ink | 22 | 19 |

For example, の 0.75 → 0.82 (its largest mismatch patch 4.6 % → 1.1 % of the ink), く 0.72 → 0.82 and ひ 0.65 → 0.71 in the fit frame. Kanji change little (0.808 → 0.809): their strokes keep a more even width.

**One more character.** The same part, stroke, press and end searches recover ぎ, whose diagonal had lain a few pixels off (0.69 → 0.72): the first teacher now has 440 forms. び 献 建 様 短 improve but still have one part off and keep the rules. For the second teacher, the same searches recover 帆 (0.65 → 0.70) and bring his four forms closer (叶 0.80, 確 0.77, 臣 0.76, 罪 0.73): he now has 5 forms, and one more search over the fits his gate had dropped recovers 哉 (6). For the third teacher, they bring his fits to 0.62 to 0.77; 改 (0.77) and 阜 (0.76) are close (2 forms). The others still have one part off.

**Other teachers give positions only.** Teachers differ much more in stroke thickness, and in the techniques that go with it, than in where their strokes go. Before a teacher is added, the two teachers' own ink is compared on the characters both write, each scaled to one box:

| Against the first teacher | Third teacher (40 shared characters) | Second teacher (4 clean shared kaisho takes) |
|---|---|---|
| Stroke thickness for the character's size | 0.98× | 0.79× |
| Aspect (height over width) | 1.01× | 1.14× |
| Ink coverage of the box | 1.01× | 0.73× |
| Shape overlap at one box size | 0.53 | 0.49 |

The third teacher writes with the first teacher's weight and proportions. The second teacher writes thinner and taller; his take beside the model card is rarely clean kaisho for a shared character, so his sample is small. The two hands overlap about as much as the rules overlap the first teacher (0.58): every teacher places strokes in an own way. The other teachers' forms therefore keep only their stroke order and centrelines. Each stroke takes its thickness from the rules, which are calibrated on the first teacher, and leaves out that teacher's own press, technique and pace, so every character is written in the first teacher's style. The demos list the first teacher, then the third, then the second. The first teacher is the standard, so the second teacher's forms also take her proportions: each character gets the rules form's height over width (measured on her models) and keeps its own size, centre and stroke places inside the box.

## 2.22 Eighteenth study round: positions from still images, and the brush habits measured

**Still images (owner's request).** Stroke positions can come from a still image of the finished character: KanjiVG gives the strokes and their order, and the fit moves them onto the ink (the whole character, each stroke, each centreline point and each end). The fit runs on a fast stand-in (thick lines along the engine's curve, each as wide as the renderer draws that stroke) and checks the result once with the renderer. The second and third teachers are no longer used: their forms are freer and more artistic, and most people find them harder to read.

Before a source is used, it gets a held-out check. Forms fitted to the source's ink are scored against the first teacher's brush ink on the characters that she wrote both ways. She also writes kaisho with a pen on lesson cards:

| Against her brush ink, 117 characters | Best-aligned overlap | Centreline distance (hundredths of the box) |
|---|---|---|
| Rules | 0.560 | 2.90 |
| Fitted to her pen ink | 0.559 | 2.80 |
| Her brush forms | 0.772 | 1.12 |

Her pen kaisho places strokes differently from her brush kaisho by about as much as the rules do, so pen forms are not used. Her own brush ink, fitted without a stroke split, recovers three forms that the video fits had lost (短, や, ば).

**Forms from parts.** A form composed from her forms of the same parts in other characters (氵 on the left, 艹 on top), checked by leaving each character out, places strokes a little closer (centreline 2.64 → 2.38, 257 characters) but overlaps her ink less (0.579 → 0.563). The part's place and size depend on the other parts, and the rules already hold her general habits. It is not used.

**Brush habits measured.** Her 389 kanji forms were compared with our forms of the same characters, stroke by stroke:

| | Her forms against ours |
|---|---|
| Horizontal length, for the character's width | 0.885× (middle half 0.79–0.98) |
| Horizontal with a free end | 0.855× |
| Horizontal joined at both ends | 0.942× |
| Horizontal angle | 5.7° (ours 8.2°) |
| Main horizontal against the others | about 1.1× longer, as `main` already does |

The rise (3.5°) and the main factor (1.1) had come from general kaisho habits and fonts, not from measurement. `shodoKaishoForm` now uses, for KanjiVG kanji, a rise of 1° over KanjiVG's own slope and `freeEnd` 0.88: a horizontal that does not end on an earlier stroke shortens toward its joined start or about its centre, and the joins are closed again. Both halves of the characters (even and odd code points) improve:

| Best-aligned overlap with her ink | Half one | Half two |
|---|---|---|
| Change | +0.015 | +0.017 |
| Characters better / worse | 146 / 48 | 149 / 42 |

Kana did not improve (−0.003 and −0.001 on 27 + 27 characters), so they keep the earlier rise and full-length horizontals; bundled originals keep theirs too. In the tested range, the score changes little (rise 1–2.5°, `freeEnd` 0.84–0.92, a separate factor for joined starts 0.75–0.88); the kept values are close to her measured medians.

## 2.23 Nineteenth study round: more of her stroke habits

**Her own sources.** Of her 536 large-brush kaisho videos, only a few characters were left. Two single-character videos had an English word in their titles, and five small-brush kaisho lessons existed. Six more forms come from the clean model at the end of a video and from small-brush thumbnails. A held-out check on two characters that she wrote with both brushes favours the small-brush source over the rules. A school teacher's model sheets (another channel, 322 characters) are the closest other hand to hers: shape overlap 0.668, against 0.49 to 0.53 for the other sources. But their positions are not closer to her ink than the rules (0.600 against 0.613, 125 characters), so they are not used. Fitted again on her ink, only 9 of her 444 forms improve after review: her forms have converged.

**Stroke habits.** Her 389 kanji forms were compared again with our forms, now with the habits of §2.22. Five differences had a middle half on one side of the rules. Each was tried on its own through the renderer, on both halves of the characters:

| Her stroke against ours | Measured | Overlap change, half one / half two | Kept |
|---|---|---|---|
| Dot length | 0.78× | +0.0012 / +0.0011 (77/25 and 70/34 characters better/worse) | yes, 0.8 |
| 提 (rising stroke ㇀) length | 1.20× | +0.0003 / +0.0002 | yes, 1.2 |
| Vertical that hangs from an earlier stroke | 0.85× | −0.0018 / −0.0013 | no |
| Horizontal that starts on an earlier stroke, beyond `freeEnd` | 0.85× | −0.0003 / −0.0005 | no |
| Right sweep angle | 3.4° flatter | −0.0008 / −0.0007 | no |

Together, dots at 0.8 and 提 at 1.2 change overlap by +0.0020 and +0.0013 (84/27 and 71/37 characters better/worse), and the centreline distance also improves. The effect is small, about a tenth of §2.22. Dots look a little more compact, as hers are. `shodoKaishoForm` applies them to KanjiVG kanji only (`dotLength`, `riseStrokeLength`).

## 2.24 Twentieth study round: かな weight and small かな

**かな weight.** Our かな are the weakest rules forms: their best-aligned overlap with her ink is 0.50, against 0.71 for her own forms. Her 52 written かな are larger than ours (1.06 times as wide and 1.09 times as tall), but a larger かな scores worse (overlap 0.499 → 0.477 at 1.10). The overlap allows for size, so a larger character mainly makes the strokes thinner in comparison. Her かな strokes are heavier: weight 1.04 (median) against our 0.96. Heavier strokes improve both halves:

| かな stroke weight | Overlap change, half one / half two | Characters better/worse |
|---|---|---|
| 1.00 | +0.0019 / +0.0035 | 19/6, 19/7 |
| 1.04 | +0.0047 / +0.0059 | 24/2, 20/5 |
| 1.10 | +0.0075 / +0.0099 | 22/4, 20/6 |
| 1.10 and 1.05 larger | +0.0013 / +0.0048 | 18/8, 16/7 |

`strokeFromCentreline` now gives KanjiVG かな strokes weight 1.1; dots and dakuten keep 0.96. In renders the loops of あ ぬ ね の め る stay open.

**Small かな.** KanjiVG draws ぁ っ ゃ ァ ッ ャ … at 0.79 of a full かな, and in a grid ゃ beside し reads as や. Her one small かな (っ in a small-brush lesson) is 0.46 of the width of her す, and handwriting guides teach about half to two thirds. `shodoKaishoForm` writes KanjiVG small かな at 0.76 of KanjiVG's size (about 0.6 of a full かな), on the foot of their box (`smallKana`).

## 2.25 Twenty-first study round: strokes that meet where they should not

**What was wrong.** The owner saw the first stroke of 急 meet its third stroke. A check now compares, for each pair of strokes, the gap between our rendered inks with the gap in the teacher's labelled ink, and with KanjiVG's skeleton for characters without her ink (the gap that KanjiVG's centrelines leave once each stroke has its rendered width). In the rules forms of the JLPT N5–N3 kanji, 63 characters had strokes of 旁 that ran into 偏 (校, 持, 精, 待, 働, 体, 倒, 野).

**Causes and changes.**
- *Joins across parts.* `shodoJoinStrokes` moves an end up to 70 em onto an earlier stroke, which closes the gaps left by trimming KanjiVG's pen curls. It also pulled 交's horizontal in 校 into 木. Across top-level parts it now joins only ends within 15 em.
- *Lengthened strokes.* The 主画 (×1.1), 払い (×1.16) and 提 (×1.2) lengthenings reached the other part (体, 倒, 野). A lengthening now stops 50 em (centreline to centreline) from the strokes of another part, or at the distance the skeleton had when that was already smaller. Inside a part strokes stay as they were; a stricter rule for every stroke lowered the match with the teacher's ink.

**Result.** Flagged characters 63 → 43. Overlap with the teacher's ink is unchanged on both halves of her 388 kanji (+0.0006 and +0.0000). The remaining contacts are mostly corner shoulders of 転折 (the corner of 夕 in 死 reaches 匕) and are measured next.

## 2.26 Twenty-second study round: sweeps that lost their start

**What was wrong.** In 用 the first stroke started 150 em below the corner where ㇆ begins, so the frame was open at the top left. KanjiVG opens many strokes with a small pen curl, and `trimFlourish` removes the first 55 em of such a stroke. It cut at the first sample past 55 em. `samplePathData` takes ten samples per cubic, and a long cubic whose first control point lies far down the stroke has its first sample far from its start (用: 150 em). Thirty-eight strokes of 757 characters lost more than 30 em of their start, sixteen more than 100 em, nearly all of them ノ: 夫 read as 天, 失 as 矢, and 央 火 九 明 started their ノ too low.

**Change.** The entry curl is now cut at its length, between two samples. The exit cut is unchanged (it keeps the next sample, so it never cut too much).

**Result.** On her ink, the rules forms of the 316 of her kanji that change are closer on both halves: overlap +0.0054 and +0.0074 (42/7 and 42/4 characters better/worse), centreline distance −0.06 and −0.07. 央 gains 0.24, 夫 0.19, 左 0.16, 映 0.16, 火 0.13; the largest loss is 0.02 (光).

## 2.27 Twenty-third study round: the foot of a 右払い

**What was wrong.** The owner saw 秋's last stroke end like a long dot, not a 右払い. The stroke ends in a round press instead of a foot that flattens to the right. A 右払い is drawn from its last segment: the brush presses at the foot, then pulls out along that segment. KanjiVG's pull-out runs steeply down, close to the stroke's own course, so the press stays round.

**Measurement.** On her 99 右払い with a rules form, her pull-out leaves the foot at a median 21° below the horizontal (middle half 10° to 31°), ours at 34° (27° to 38°); her stroke turns 18° at the foot, ours 10°. The pull-out's length matches (0.23 against 0.24 of the stroke).

**Change.** For KanjiVG kanji, `shodoKaishoForm` turns the pull-out 12° flatter, never above the horizontal (`footTurn`), when it is at most half of the stroke (辶's sweep ends in one long segment, its whole tail, which keeps its course; turning it lifted 辶 into the part above it). On her ink, the 98 of her kanji with a 右払い gain on both halves: overlap +0.0043 and +0.0014 (30/7 and 26/15 characters better/worse); 8° gives +0.0030 and +0.0025, 16° +0.0045 and +0.0018 with a worse centreline on one half.

## 3. From observation to model

| Observation | Model decision |
|---|---|
| Teardrop footprint, tip trails, belly leads | The contact patch is a teardrop whose axis is the tip direction. Its length and width both grow with pressure. |
| Kaisho tip stays upper-left; cursive tip follows motion | Tip direction blends a fixed `hand.tipAngle` with the reverse of the velocity by `hand.tipFollow`, then is low-pass filtered so the hair cannot spin instantly. |
| 45° press and ease back at entry | `hand.entryAngle` sets the direction of the touch-down press. The press is followed by a short hold (溜め) and a pressure release. |
| Turns are stop + re-press | Authored corner indices (`turns`) generate a lift, a press toward the lower right and a hold. |
| Each ending has its own move | Endings `tome`, `hane`, `harai`, `dot` and `taper` are generated moves, not shapes. |
| Kasure is black channels along travel | Bristle lanes across the direction of motion each carry ink. A lane deposits nothing when its ink falls below the threshold. Speed and the paper tooth push lanes over the threshold. |
| Brush empties over strokes | `ink.decay` spends load per em of stroke. `ink.redipBelow` inserts a dip. |
| Pools at pauses, bleed at pools | Deposit is time-weighted: a pause deposits more pigment and water, so it bleeds more and stays glossy longer. |
| Fibrous edge, not blur | The bleed is gated by a fixed paper-fibre field, so ink creeps out along fibres. |
| Teachers write 冠/脚 and single characters taller; 冠/脚 parts compact; crowns cover; the left part ends higher | `shodoStructure`: five named 間架結構 rules (外形, 天覆, 草冠, 上下の間, 左短右長), measured on 411 models |
| Upright handle, perspective from above | The brush is a 3D object under a top-down pinhole camera with a cast shadow; a side camera shows it in profile. |
| Brush stands up to press, leans into travel, lifts straight | `shodoHandLean` per contact sample; ferrule height from press; vertical lift and descent in air moves. |
| Faint vermilion grid | `ShodoSheet` paper layer with mesh, cells, centre marks and an optional name column. |

## 4. Glyph data and rights

- **Bundled glyphs are original.** Their centrelines were authored by hand for this library from stroke-order knowledge. No outline was traced from a font, a video frame or KanjiVG.
- **KanjiVG is optional and is never bundled.** KanjiVG is licensed CC BY-SA 3.0 (copyright Ulrich Apel). The adapter `parseKanjiVgSvg` reads a KanjiVG file that the host supplies. A film made from KanjiVG strokes must credit KanjiVG and follow the share-alike terms. The loader reads the pinned release `r20260714` from raw.githubusercontent.com at run time and the stories show the credit.

## 5. Limits

- The ink model is a deterministic approximation, not a fluid simulation of pigment in paper.
- The bundled glyph set is small. Proportions were judged by eye against the studied models, not measured against a master's work.
- There is no hand or arm. The brush moves by itself, like a motion-graphics demonstration.
- Video frames were studied at 360p to 720p. Fine edge structure was judged from the sharpest frames only.
