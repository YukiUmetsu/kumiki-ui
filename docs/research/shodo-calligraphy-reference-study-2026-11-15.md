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
