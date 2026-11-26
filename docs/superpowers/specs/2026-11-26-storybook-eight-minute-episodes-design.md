# Design: 8-minute storybook episodes told with the camera (STORY1, phase 3)

Phase 2: [design](2026-11-25-storybook-production-design.md). Evidence: [research](../../research/storybook-episodes-research-2026-11-26.md). How to make a scene: [storybook-episode](../../component-specs/storybook-episode.md).

## Goal

Six episodes of about 8 minutes, one for each place: the station and the shinkansen, the summer festival, the convenience store, the souvenir shop, the taxi and the inn. Each one has a story and a review of its phrases (with English) and of its words. The owner's direction (2026-11-26): remove the scenes that need difficult joint work, and tell the story with camera angles and new animated paintings (a zoom into the takoyaki, someone's hands holding takoyaki seen from above). Each episode must cost less than the one before. Here cost is new code and new kinds of parts (acts, engine items, place recipes): after the pilot an episode adds none. New paintings are content: an episode with new places (the station) has more. Each episode records them in "What a scene costs".

Not in this phase: new acts, more joint fixes, an English voice, full-size or full-length renders without the owner's request.

## Decisions

| Question | Decision | Why |
|---|---|---|
| What do the people do on screen? | Body acts only: walk, turn, look, nod, bow, deep bow, hop, shrug, look around, listen, moods, speech, and `explain` with the hands below the chest. | These acts passed the checks in all films. The faults of rounds 1–5 came from hands that meet a prop or go high. |
| What happens to a hand on a prop? | It becomes an **insert**: a new painting of the hands and the object, close or from above. People do not hand over, cook, eat, pay, wrap, open a fan, steer or call with a raised hand in a full shot. | A painting has no joints to fail. Animation studios tell stories this way (limited animation, inserts, pans over a still). |
| How does an insert move? | With what the engine has: a slow camera push or pan in the painting, drifts (steam, bonito flakes), `slides` (a tray lifts, a train comes in), props that change their drawing at a time (2–4 drawings: a ball turns, a pick lifts), and a cut on the result (the order, then the tray already in the hands). | Checked on 2026-11-26: a scene with no cast on one painting compiles to a shot with a camera move. No new engine for the basic insert. |
| How long, and in what parts? | 8:00 ± 0:30 in titled chapters shorter than 2 minutes, in the same order in each episode (template below). The key phrase comes before minute 5. | Engagement falls after about 6 minutes; segments and signals help (Guo 2014, Rey 2019, Alpizar 2020). |
| Where is the review? | Throughout: a short check of a phrase from the chapter before after chapters 2 and 3, then the phrase review, the word review and a final check. | A delayed first recall beats an immediate one; tests between parts keep attention (Karpicke 2007, Szpunar 2013). Watching alone teaches about 7 % of words (Webb 2023). |
| Which phrases? | 6–8 phrases that the visitor **says** (practised, shadowed) and 3–5 lines that the visitor **hears** from staff (polite forms, for checks). 10–12 words with pictures. | Staff speak keigo above N5. A learner must understand it, not say it. |
| When does English show? | In the reviews: the Japanese first, the English after a pause. In a check: no English until the answer. In the story: see the open question below. | Bilingual text helps lower levels with meaning; attention to the Japanese predicts gains (Wang 2022, Montero Perez 2013). |
| Shadowing | 6 phrases in the review. Each one: said, a pause, the English, then said again with a pause of the line length × 1.25 + 0.9 s (the current `practice` time) to say it, twice. About 15 s a phrase. The other phrases come in the checks and the close. | Shadowing helps beginners most; gains level off after 4–5 repetitions over sessions (Hashizaki 2025). |
| Who speaks English? | Nobody. Titles and instructions are written in Japanese and English. | No English voice exists, and the owner picks the voices. |
| New paintings | 15–25 for each episode, with 4–6 pictures for words that no insert shows, painted locally by FLUX.2 Klein 4B on the existing paintings of the place, one process at a time, kept only after a look at 1× and 2×. Hands in an insert are counted and checked by eye; the owner looks at each hand insert before the episode is filmed. | The sets were made this way. Hands are what the model draws worst. |
| Facts | Only the facts in the research notes, or a new graded source. No brand marks or logos. | The repository is public, and the films teach real situations. |

## Visual grammar

From the research (working rules, not measured for adult learners):

- One place for each chapter. The chapter opens with an establishing shot or a still life of 4–6 s.
- An insert holds 2–4 s. A dialogue shot holds for its whole line. A subtitle ends two frames before a cut, or at least 0.5 s after it.
- A pan takes 7 s or more for one frame width. One small change (steam, a slow push, a cut) every 5–10 s. Nothing moves only to move.
- Shot kinds: **establishing** (wide, the place), **POV** (a sign, a board, a menu or a screen as the visitor sees it: these show the words that the episode teaches), **insert** (an object or hands, close or from above), **reaction** (a face, which the face mesh does well), **dialogue** (two people, waist or chest, hands out of the picture or still).
- An action between two people is shown by its start and its result: the order line, then an insert of the tray in the hands of the other person.

## Episode template (480 s)

| Part | Seconds | What |
|---|---|---|
| Cold open | 15 | One insert with sound (the takoyaki on the griddle), then the title. |
| Goal | 20 | "Today you learn to…": three can-do lines and the key phrase, in Japanese and English. |
| Chapter 1 | 85 | Title card, the place, the first phrases. |
| Chapter 2 | 85 | The main exchange. Ends with a check of a chapter 1 phrase (12 s). |
| Chapter 3 | 85 | The result. Ends with a check of a chapter 2 phrase (12 s). |
| Phrases | 90 | 6 phrases: the moment in the story (a still of its shot), the Japanese said and shown, a pause, the English, two shadowing pauses. |
| Words | 45 | 10–12 words with their pictures, then 4 pictures with no word: the viewer names them, then the answer. |
| Final check | 25 | Three staff lines are heard; the viewer answers; the answer is said and shown. |
| Close | 15 | The key exchange again, Japanese only, and the next episode. |

## Engine work (once, in the pilot)

Small and general. Each item is data that every episode uses.

1. **Delayed English on lesson pages**: `reveal` seconds for a `gloss` on `practice` pages. The words of `practice` already show the English at once.
2. **A line check**: a lesson `check: { hear: lineId, ask: text, answer: lineId, think: seconds }`. It plays a staff line, waits, then says and shows the answer. The `quiz` lesson names props only.
3. **A still of a story shot on a review page**: the phrase page shows a small still of the shot where the line was said.
4. **A chapter card and a goal page** from data, if the `words` of a beat do not already do it (check first).
5. **Insert stages**: a recipe and a stage for each insert painting, with frames for the camera. Data, with no new code, if the check of 2026-11-26 holds for drifts and props on such a stage.
6. **A screenplay check**: `story:check` reports a hand act (`cook`, `eat`, `offer`, `receive`, `take`, `pack`, `fan`, `unfold`, `fold`, `steer`, `show`, `call`, `raise`, `wave`) in a shot wider than an insert as a LOOK, so a later screenplay does not add one again.

## The six episodes

Each row names the chapters, the inserts that take the place of hand acts, and the phrases. Prices and rules are those of the research notes.

### 1. Summer festival (夏祭り) — pilot

Cast: Daniel, Ema, Sophie, Leo, Daichi. Places: `festival-lane`, `festival`, `festival-eat`, `festival-sky`.

| Chapter | Story | Inserts and POVs |
|---|---|---|
| 1 屋台がいっぱい | The family walks into the lane; what will they eat? | Stall banners (たこ焼き, 焼きそば, かき氷, りんご飴), lanterns (still life) |
| 2 たこ焼き屋さん | Daichi calls out (face, no raised hand); Leo orders; the price; "it is hot". | Griddle from above in four drawings (batter, half turned, round, sauce), bonito flakes that move, the tray in Daichi's hands, then in Leo's hands |
| 3 いただきます | Where to eat; the first bite; where the dish goes; fireworks. | Leo's hands from above with the pick lifting a ball and steam (the owner's example), the dish-return place, the fireworks sky |

Say: たこ{焼|や}き、{一|ひと}つください · いくらですか · ここで{食|た}べてもいいですか · お{皿|さら}はどこに{返|かえ}しますか · いただきます · あつい · おいしい · きれい. Hear: いらっしゃい · {六百円|ろっぴゃくえん}です · {熱|あつ}いから{気|き}をつけてね · どうぞ. Words: {祭|まつ}り, {屋台|やたい}, たこ{焼|や}き, {焼|や}きそば, かき{氷|ごおり}, りんご{飴|あめ}, {浴衣|ゆかた}, {花火|はなび}, {皿|さら}, ごみ, {熱|あつ}い, {一|ひと}つ. About 20 new paintings.

Removed from the current film: `call`, `cook` ×4, `eat`, `offer` and `receive` in full shots.

### 2. Station and shinkansen (駅と新幹線)

Cast: Daniel, Ema, Sophie, Leo, Takahashi. Places: `hall`, `passage`, `platform`, and new: the ticket office, the gate, the car inside.

| Chapter | Story | Inserts and POVs |
|---|---|---|
| 1 京都駅の中で | Find the shinkansen: ask, follow the signs to the Hachijō side. | Departure board, 新幹線のりば signs with arrows |
| 2 きっぷを買う | At the ticket office: two adults and two children to Tokyo (children aged 6 to 11 pay half), reserved, a window seat, seat E for Mount Fuji; a big bag. | The two tickets (乗車券, 特急券) from above, the seat map |
| 3 改札とホーム | Both tickets into the gate; track 12; the car number on the floor; the train comes in. | Gate slot (tickets slide in), track sign, floor marking 7号車, the train nose (no logo, `slides`) |
| 4 新幹線の話 | Someone in their seat; talk: 285 km/h, a delay of 1.6 minutes on average, Mount Fuji, the trolley is gone, so buy on the platform next time. | Seat number 5E, window with Fuji (`pace`), platform vending machine |

Say: {新幹線|しんかんせん}のりばはどこですか · {東京|とうきょう}まで、{大人|おとな}{二枚|にまい}、{子|こ}ども{二枚|にまい}お{願|ねが}いします · {指定席|していせき}で · {窓側|まどがわ}の{席|せき}はありますか · {大|おお}きい{荷物|にもつ}があります · {何番線|なんばんせん}ですか · すみません、そこは{私|わたし}の{席|せき}です · {速|はや}いね. Hear: まっすぐ{行|い}って、{右|みぎ}です · {指定席|していせき}ですか、{自由席|じゆうせき}ですか · {十二番線|じゅうにばんせん}です · まもなく{電車|でんしゃ}がまいります. Words: {駅|えき}, {新幹線|しんかんせん}, きっぷ, {改札|かいさつ}, のりば, {番線|ばんせん}, {号車|ごうしゃ}, {席|せき}, {指定席|していせき}, {自由席|じゆうせき}, {窓側|まどがわ}, {荷物|にもつ}, {子|こ}ども. About 24 new paintings. Four chapters of about 65 s each.

### 3. Convenience store (コンビニ)

Cast: Ema, Riku (clerk). The phase-1 code film becomes a screenplay on the `sv_` paintings.

| Chapter | Story | Inserts and POVs |
|---|---|---|
| 1 何を買う？ | In through the chime; onigiri and tea. | Onigiri shelf with prices, the drinks case |
| 2 レジで | Point card? Heat it? Chopsticks? A bag costs money: no bag. | The microwave (a beep), the tray of coins and the change from above |
| 3 店内で食べる | Eat in: 10 % on the receipt, not 8 %; open the onigiri. | Receipt close-up, onigiri wrapper in three drawings, the ATM |

Say: これをください · {袋|ふくろ}はいりません · {温|あたた}めてください · {店内|てんない}で{食|た}べます · ポイントカードはないです · お{箸|はし}を{一|ひと}つお{願|ねが}いします. Hear: ポイントカードはお{持|も}ちですか · お{温|あたた}めしますか · {袋|ふくろ}にお{入|い}れしますか · お{箸|はし}はお{付|つ}けしますか. Words: コンビニ, レジ, {袋|ふくろ}, {箸|はし}, おにぎり, {弁当|べんとう}, お{茶|ちゃ}, {現金|げんきん}, お{釣|つ}り, レシート, {店内|てんない}, {持|も}ち{帰|かえ}り. About 18 new paintings.

### 4. Souvenir shop (お土産屋)

Cast: Ema, Sophie, Emi. Places: `shop`, `shop-front`.

| Chapter | Story | Inserts and POVs |
|---|---|---|
| 1 何にしよう | Fans, tenugui, yatsuhashi; the price. | Shelf POV, the fan opening in three drawings (instead of Emi's fan acts), a tenugui pattern |
| 2 食べてみて | A tasting: soft and baked yatsuhashi. | Sample plate from above |
| 3 包んでください | For a present, wrapped one by one; tax-free from 5,000 yen, paid back at the airport. | Wrapping from above in three drawings, the bag, the passport on the counter |

Say: これはいくらですか · これをください · プレゼント{用|よう}です · {別々|べつべつ}に{包|つつ}んでください · {免税|めんぜい}できますか · {見|み}てもいいですか. Hear: いらっしゃいませ · ご{自宅用|じたくよう}ですか · どうぞ、{食|た}べてみてください · パスポートをお{願|ねが}いします. Words: お{土産|みやげ}, {扇子|せんす}, {手|て}ぬぐい, {八|や}ツ{橋|はし}, {包|つつ}む, プレゼント, {免税|めんぜい}, {税込|ぜいこみ}, {箱|はこ}, {袋|ふくろ}. About 18 new paintings.

### 5. Taxi (タクシー)

Cast: Daniel, Sato. Places: `taxi-stand`, `cabin`, `lane`.

| Chapter | Story | Inserts and POVs |
|---|---|---|
| 1 タクシー乗り場 | The stand; the door opens by itself. | Stand sign, the door (`swing`) |
| 2 どちらまで？ | To Kiyomizu-dera; straight, right at the light. | The road ahead (`pace`), the meter in three drawings (500 yen for the first 0.9 km) |
| 3 ここで止めてください | Stop here; pay by card; a receipt. | Card reader, receipt |

Say: {清水寺|きよみずでら}までお{願|ねが}いします · ここで{止|と}めてください · カードで{払|はら}えますか · {領収書|りょうしゅうしょ}をください · まっすぐお{願|ねが}いします. Hear: どちらまで · {右|みぎ}に{曲|ま}がります · {着|つ}きました. Words: タクシー, {乗|の}り{場|ば}, {住所|じゅうしょ}, {右|みぎ}, {左|ひだり}, まっすぐ, {信号|しんごう}, {角|かど}, {止|と}める, {現金|げんきん}, カード, {領収書|りょうしゅうしょ}. About 16 new paintings.

### 6. Inn (旅館)

Cast: Daniel, Ema, Sophie, Leo, Haruka. Places: `ryokan-gate`, `ryokan-in`, `ryokan-hall`, `ryokan-room`, `ryokan-night`.

| Chapter | Story | Inserts and POVs |
|---|---|---|
| 1 玄関で | Shoes off, slippers on; a deep bow of welcome. | Shoes in a row from above, slippers |
| 2 チェックイン | The booking; tea and a sweet; dinner at seven. | Tea and sweet from above (instead of `offer` and `receive`), the key |
| 3 部屋とお風呂 | Tatami, the yukata left over right, the bath times. | Folded yukata, 男湯 and 女湯 curtains |

Say: {予約|よやく}した〇〇です · チェックインをお{願|ねが}いします · {夕食|ゆうしょく}は{何時|なんじ}からですか · {七時|しちじ}でお{願|ねが}いします · お{風呂|ふろ}は{何時|なんじ}までですか. Hear: いらっしゃいませ · お{部屋|へや}へご{案内|あんない}いたします · {十一時|じゅういちじ}までです. Words: {旅館|りょかん}, {玄関|げんかん}, {靴|くつ}, スリッパ, {畳|たたみ}, {浴衣|ゆかた}, {布団|ふとん}, {夕食|ゆうしょく}, {朝食|ちょうしょく}, お{風呂|ふろ}, {部屋|へや}, {鍵|かぎ}. About 18 new paintings.

## Order of work

1. **Pilot: the festival.** The engine items, the new screenplay, the inserts, the voices (Daichi's voice: the owner picks), the checks (`story:check` 0 faults and 0 LOOKs, `story:qa`, `story:speech --hear`), a contact sheet and a small, short draft of one chapter and the reviews. The owner looks at it before the next episode.
2. Station and shinkansen. 3. Convenience store. 4. Souvenir shop. 5. Taxi. 6. Inn. One pull request or more for each, a small draft, the owner's look.
3. After each episode, add a row to "What a scene costs" in storybook-episode: length, shots, lines, new paintings, new code. The target is fewer new paintings and no new code after the pilot.

The current `first-trip` episode stays as it is until the six episodes exist.

## Open

- **English in the story parts**: rule 9 of the storybook skill hides it until a switch is on. The research favours English under the Japanese for beginners. The subtitles stand under the picture, so the paintings do not change; a second line makes the subtitle strip taller. The pilot draft is made both ways (`glosses` exists), and the owner picks.
- Daichi's voice (the owner picks).
- Leo (115 cm) and Sophie (138 cm) are taken as children of 6 to 11: two child tickets.
- Not verified, so not shown: the numbered onigiri wrapper, paying by IC card at a konbini, the floor colours of the shinkansen queue lines.
