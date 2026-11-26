# Design: 8-minute storybook episodes told with the camera (STORY1, phase 3)

Phase 2: [design](2026-11-25-storybook-production-design.md). Evidence: [research](../../research/storybook-episodes-research-2026-11-26.md). How to make a scene: [storybook-episode](../../component-specs/storybook-episode.md).

## Goal

Eight episodes of about 8 minutes, in the order of one trip (the owner's order, 2026-11-26): 1 from the airport to Tokyo by train, 2 a hotel in Tokyo, 3 a taxi, 4 a convenience store, 5 the shinkansen to Kyoto, 6 an inn in Kyoto, 7 a summer festival, 8 a souvenir shop. Each one has a story and a review of its phrases (with English) and of its words. The owner's direction (2026-11-26): remove the scenes that need difficult joint work, and tell the story with camera angles and new animated paintings (a zoom into the takoyaki, someone's hands holding takoyaki seen from above). Each episode must cost less than the one before. Here cost is new code and new kinds of parts (acts, engine items, place recipes): after the pilot an episode adds none. New paintings are content: an episode with new places has more. Each episode records them in "What a scene costs".

Not in this phase: new acts, more joint fixes, an English voice, full-size or full-length renders without the owner's request.

## The trip

One family (Daniel, Ema, Sophie, Leo) over five days in summer.

| Day | Episodes |
|---|---|
| 1 | 1 airport to Tokyo Station by train · 2 the hotel near the station: the bags wait at the desk until check-in |
| 2 | 3 a taxi from the hotel to Asakusa · 4 a convenience store near the hotel in the evening |
| 3 | 5 Tokyo to Kyoto by shinkansen · 6 the inn, from the Hachijō side of Kyoto Station |
| 4 | 7 the summer festival in the evening |
| 5 | 8 the souvenir shop, then the tax refund at the airport (the close of the series) |

- **One season, summer.** The festival is in summer. Two places are painted in spring (the station platform and the taxi street with cherry trees). A reused painting gets a summer pass (green leaves, summer light) before it is used, or it is not used.
- **Phrases come back.** A phrase that one episode teaches comes back in a later episode as a check, not as a new phrase: the ticket line (1 → 5), the check-in lines (2 → 6), 〜までお{願|ねが}いします (1, 3, 5), これをください (4 → 5, 8), {袋|ふくろ}はいりません (4 → 8), 〜てもいいですか (2 → 7). Spacing across sessions beats massing (Webb 2023).
- **The staff exist as people data.** Takahashi (station clerk) at the airport ticket office, Kento (navy suit, name badge) at the hotel desk, Sato (taxi), Riku (konbini), Haruka (inn), Daichi (takoyaki), Emi (shop). Yui (a young traveller with a backpack) sits in the family's seat on the shinkansen. A clerk who is only heard (the bento shop, the platform announcement) has a voice and no figure.

## Decisions

| Question | Decision | Why |
|---|---|---|
| What do the people do on screen? | Body acts only: walk, turn, look, nod, bow, deep bow, hop, shrug, look around, listen, moods, speech, and `explain` with the hands below the chest. | These acts passed the checks in all films. The faults of rounds 1–5 came from hands that meet a prop or go high. |
| What happens to a hand on a prop? | It becomes an **insert**: a new painting of the hands and the object, close or from above. People do not hand over, cook, eat, pay, wrap, open a fan, steer or call with a raised hand in a full shot. | A painting has no joints to fail. Animation studios tell stories this way (limited animation, inserts, pans over a still). |
| How does an insert move? | With what the engine has: a slow camera push or pan in the painting, drifts (steam, bonito flakes), `slides` (a tray lifts, a train comes in), props that change their drawing at a time (2–4 drawings: a ball turns, a pick lifts), and a cut on the result (the order, then the tray already in the hands). | Checked on 2026-11-26: a scene with no cast on one painting compiles to a shot with a camera move. No new engine for the basic insert. |
| How long, and in what parts? | 8:00 ± 0:30 in titled chapters shorter than 2 minutes, in the same order in each episode (template below). The key phrase comes before minute 5. | Engagement falls after about 6 minutes; segments and signals help (Guo 2014, Rey 2019, Alpizar 2020). |
| Where is the review? | Throughout: a short check of a phrase from the chapter before after chapters 2 and 3, then the phrase review, the word review and a final check. | A delayed first recall beats an immediate one; tests between parts keep attention (Karpicke 2007, Szpunar 2013). Watching alone teaches about 7 % of words (Webb 2023). |
| Which phrases? | 6–8 phrases that the visitor **says** (practised, shadowed) and 3–5 lines that the visitor **hears** from staff (polite forms, for checks). 10–12 words with pictures. | Staff speak keigo above N5. A learner must understand it, not say it. |
| When does English show? | **In the story**: the Japanese with furigana. The English of a conversation line is hidden by default; the viewer can turn it on (the `glosses` switch, rule 9 of the storybook skill). The English of a taught word shows. **In the reviews**: the Japanese first, the English after a pause. **In a check**: no English until the answer. | The owner's decision (2026-11-26). The research favours English for beginners (Wang 2022), so the switch stays. |
| How fast do they speak? | **6.5 morae a second** in the story and in the reviews: `pace` 6.5 in each `people/<id>.json` (now 5.6–5.8). The tempo stays between 0.7 and 1.0, so a voice is slowed and never sped up. A line that the voice says slower than 6.5 keeps its own speed. Rule 8 of the storybook skill changes from 4–5 to 6.5. All lines are recorded again. | The owner: faster, but slower than native speed. Native Japanese: read speech 7.1 morae a second and spontaneous speech 8.0 (CSJ); news is read at about 8. JLPT listening: N5 5.05, N4 5.59, N3 6.15, N2 6.76, N1 7.07. The voices now (5.6–5.8) speak at the N4 rate. 6.5 is between N3 and N2, about 80 % of spontaneous speech. No study gives the best slowed speed for beginners. Measured on 7 recordings of the konbini film: before the slowing the voices said 6.6–8.1 morae a second (tempo 0.70–0.86 at pace 5.6–5.8), so pace 6.5 gives a tempo of about 0.80–0.98 with no change to `storybook-speech.mjs`. |
| Shadowing | 6 phrases in the review. Each one: said, a pause, the English, then said again with a pause of the line length × 1.25 + 0.9 s (the current `practice` time) to say it, twice. About 15 s a phrase. The other phrases come in the checks and the close. | Shadowing helps beginners most; gains level off after 4–5 repetitions over sessions (Hashizaki 2025). |
| Who speaks English? | Nobody. Titles and instructions are written in Japanese and English. | No English voice exists, and the owner picks the voices. |
| New paintings | 14–24 for each episode, with 4–6 pictures for words that no insert shows, painted locally by FLUX.2 Klein 4B on the existing paintings of the place, one process at a time, kept only after a look at 1× and 2×. Hands in an insert are counted and checked by eye; the owner looks at each hand insert before the episode is filmed. | The sets were made this way. Hands are what the model draws worst. |
| Facts | Only the facts in the research notes, or a new graded source. No brand marks, logos, company names or train-service names: a sign says 特急 or 新幹線, a card is an ICカード. A fact that has a known date of change is not shown (the Tokyo lodging tax becomes 3 % on 1 Apr 2027). | The repository is public, and the films teach real situations. Fares changed twice in 2026. |

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
| Final check | 25 | Three staff lines are heard; the viewer answers; the answer is said and shown. A phrase from an earlier episode can be one of them. |
| Close | 15 | The key exchange again, Japanese only, and the next episode. |

## Engine work (once, in the pilot)

Small and general. Each item is data that every episode uses.

1. **Delayed English on lesson pages**: `reveal` seconds for a `gloss` on `practice` pages. The words of `practice` already show the English at once.
2. **A line check**: a lesson `check: { hear: lineId, ask: text, answer: lineId, think: seconds }`. It plays a staff line, waits, then says and shows the answer. The `quiz` lesson names props only.
3. **A still of a story shot on a review page**: the phrase page shows a small still of the shot where the line was said.
4. **A chapter card and a goal page** from data, if the `words` of a beat do not already do it (check first).
5. **Insert stages**: a recipe and a stage for each insert painting, with frames for the camera. Data, with no new code, if the check of 2026-11-26 holds for drifts and props on such a stage.
6. **A screenplay check**: `story:check` reports a hand act (`cook`, `eat`, `offer`, `receive`, `take`, `pack`, `fan`, `unfold`, `fold`, `steer`, `show`, `call`, `raise`, `wave`) in a shot wider than an insert as a LOOK, so a later screenplay does not add one again.
7. **Voice pace** (data and docs): `pace` 6.5 in `people/<id>.json`, rule 8 of the storybook skill, and `storybook-episode.md`.

## The eight episodes

Each section names the chapters, the inserts that take the place of hand acts, and the phrases. Prices and rules are those of the research notes.

### 1. From the airport to Tokyo (空港から東京へ)

Cast: Daniel, Ema, Sophie, Leo, Takahashi (the ticket office clerk). Narita Airport: its limited express goes to Tokyo Station with no change. Places, all new: the arrival lobby, the ticket office of the airport station (the `counter` painting, from behind the counter, is used again), the platform under the terminal, the car inside (used again in episode 5), the deep platform at Tokyo Station.

| Chapter | Story | Inserts and POVs |
|---|---|---|
| 1 到着ロビー | Out of the customs gate with the bags; follow the railway signs and go down one floor to the station. | The customs e-gate, the overhead signs with the train pictogram and arrows (POV), the escalator down, the bags on a cart |
| 2 きっぷを買う | At the ticket office: to Tokyo Station on the limited express, all seats reserved, two adults and two children (children aged 6 to 11 pay half); IC cards for the days in Tokyo, one for each person, a child's card on the child's passport. | The tickets from above, the passports and the IC cards on the counter, the seat numbers |
| 3 東京へ | The platform, the car number, the bags in the rack; about an hour of fields, then the city; "the next stop is Tokyo"; the long escalators up. | Floor marking of the car, the rack from above, the window (`pace`), the Tokyo Station sign |

Say: {東京駅|とうきょうえき}に{行|い}きたいです · {東京駅|とうきょうえき}まで、{大人|おとな}{二枚|にまい}、{子|こ}ども{二枚|にまい}お{願|ねが}いします · ICカードを{四枚|よんまい}ください · {子|こ}どものICカードもありますか · この{電車|でんしゃ}は{東京|とうきょう}に{行|い}きますか · {荷物|にもつ}はどこに{置|お}きますか. Hear: どちらまでですか · {全席指定|ぜんせきしてい}です · パスポートをお{願|ねが}いします · {次|つぎ}は{東京|とうきょう}です. Words: {空港|くうこう}, {到着|とうちゃく}, {出口|でぐち}, {電車|でんしゃ}, {駅|えき}, きっぷ, ICカード, {大人|おとな}, {子|こ}ども, {番線|ばんせん}, {号車|ごうしゃ}, {荷物|にもつ}. About 24 new paintings.

### 2. Hotel in Tokyo (ホテル)

Cast: Daniel, Ema, Sophie, Leo, Kento. Places, new: the lobby and the front desk (from the guest side and from behind), the lift, the room with a view of the city.

| Chapter | Story | Inserts and POVs |
|---|---|---|
| 1 早く着いた | They arrive at one; check-in is at three; the bags stay at the desk. | The check-in time on a stand (POV), the bag tags from above |
| 2 チェックイン | The booking name; the passports (a guest with no address in Japan shows a passport, and the hotel copies it); the form, breakfast time, the Wi-Fi card, the key cards. No lodging tax on the screen. | The form and a pen from above, the passports on the desk, the key cards, the breakfast card |
| 3 お部屋 | The lift to the eighth floor; the room; the city at dusk. | Lift buttons (8 lights up), the door number, the window (a slow push) |

Say: 〇〇です。{予約|よやく}してあります · チェックインをお{願|ねが}いします · {荷物|にもつ}を{預|あず}けてもいいですか · {朝|あさ}ごはんは{何時|なんじ}からですか · Wi-Fiのパスワードは{何|なん}ですか · エレベーターはどこですか. Hear: チェックインは{三時|さんじ}からです · パスポートを{見|み}せていただけますか · こちらにお{名前|なまえ}をお{願|ねが}いします · お{部屋|へや}は{八階|はっかい}です. Words: ホテル, フロント, {予約|よやく}, パスポート, {名前|なまえ}, {荷物|にもつ}, かぎ, {部屋|へや}, 〜{階|かい}, エレベーター, {朝|あさ}ごはん, {何時|なんじ}. About 20 new paintings.

### 3. Taxi (タクシー)

Cast: Daniel, Ema, Sophie, Leo, Kento, Sato. Places: the hotel desk (from episode 2), the hotel entrance (new), `cabin`, the dash and the driver (used again), a Tokyo street (new), the street before the Kaminarimon gate (new).

| Chapter | Story | Inserts and POVs |
|---|---|---|
| 1 タクシーを呼ぶ | At the desk, Kento calls a taxi; it comes to the entrance; the driver opens the rear door (the passengers do not touch it). | The taxi at the entrance, the door (`swing`) |
| 2 どちらまで？ | To Asakusa, to the front of the Kaminarimon gate; how long does it take; the road. | The road ahead (`pace`), the meter in three drawings (500 yen for the first 1.0 km, the fare since 20 Apr 2026) |
| 3 ここで止めてください | Stop here; pay by card; a receipt; the big lantern of the gate. | Card reader, receipt, the gate (a slow tilt up) |

Say: タクシーを{呼|よ}んでもらえますか · {浅草|あさくさ}までお{願|ねが}いします · {雷門|かみなりもん}の{前|まえ}でお{願|ねが}いします · どのくらいかかりますか · ここで{止|と}めてください · カードで{払|はら}えますか · {領収書|りょうしゅうしょ}をください. Hear: どちらまで · {浅草|あさくさ}のどちらですか · {二十分|にじゅっぷん}ぐらいです · {着|つ}きました. Words: タクシー, {乗|の}り{場|ば}, ドア, まっすぐ, {右|みぎ}, {左|ひだり}, {信号|しんごう}, {前|まえ}, {止|と}める, カード, {領収書|りょうしゅうしょ}, {円|えん}. The lantern of the gate shows its own name only: no donor or company text. About 14 new paintings.

### 4. Convenience store (コンビニ)

Cast: Ema, Riku (clerk). The phase-1 code film becomes a screenplay on the `sv_` paintings. The evening of day 2, near the hotel.

| Chapter | Story | Inserts and POVs |
|---|---|---|
| 1 何を買う？ | In through the chime; onigiri and tea. | Onigiri shelf with prices, the drinks case |
| 2 レジで | Point card? Heat it? Chopsticks? A bag costs money: no bag. | The microwave (a beep), the tray of coins and the change from above |
| 3 店内で食べる | Eat in: 10 % on the receipt, not 8 %; open the onigiri. | Receipt close-up, onigiri wrapper in three drawings |

Say: これをください · {袋|ふくろ}はいりません · {温|あたた}めてください · {店内|てんない}で{食|た}べます · ポイントカードはないです · お{箸|はし}を{一|ひと}つお{願|ねが}いします. Hear: ポイントカードはお{持|も}ちですか · お{温|あたた}めしますか · {袋|ふくろ}にお{入|い}れしますか · お{箸|はし}はお{付|つ}けしますか. Words: コンビニ, レジ, {袋|ふくろ}, {箸|はし}, おにぎり, {弁当|べんとう}, お{茶|ちゃ}, {現金|げんきん}, お{釣|つ}り, レシート, {店内|てんない}, {持|も}ち{帰|かえ}り. About 16 new paintings.

### 5. Shinkansen (新幹線)

Cast: Daniel, Ema, Sophie, Leo, Yui. Places: the Yaesu side of Tokyo Station (new), the ticket machine (new), the bento shop (new), `gate` (the Tokaido Shinkansen gates of one operator look the same at both stations), `platform` (with a summer pass and a Tokyo track sign), the car inside (from episode 1), the window with Mount Fuji (new).

| Chapter | Story | Inserts and POVs |
|---|---|---|
| 1 東京駅で | The blue signs to the Tokaido Shinkansen gates on the Yaesu side; the ticket machine: Kyoto, two adults and two children, reserved, the window, seat E for Mount Fuji, a big bag (a seat with the oversized-baggage area). | The machine screen in four drawings (POV), the two tickets (乗車券, 特急券) from above |
| 2 駅弁と改札 | Bentos from a shop near the gates, because there is no trolley; the two tickets stacked and put into the gate together, and they come back; the track (one of 14–19); the train comes in. | Bento boxes from above (the clerk is heard), the gate slot (the tickets slide in and come out), the track sign, the train nose (no logo, `slides`) |
| 3 新幹線の中で | Yui is in their seat by mistake; the talk: 285 km/h, a delay of 1.6 minutes on average, about 2 hours 10 minutes to Kyoto; Mount Fuji; "the next stop is Kyoto". No cleaning crew: no source shows the Tokaido crew bowing. | Seat number 5E, the window with Fuji (`pace`), the bento opened from above |

Say: {京都|きょうと}まで、{大人|おとな}{二枚|にまい}、{子|こ}ども{二枚|にまい} (a check from episode 1) · {窓側|まどがわ}がいいです · {富士山|ふじさん}が{見|み}たいです · これを{二|ふた}つください · すみません、そこは{私|わたし}の{席|せき}です · {速|はや}いですね. Hear: {二|ふた}つですね · まもなく{電車|でんしゃ}がまいります · あ、すみません · {次|つぎ}は{京都|きょうと}です. Words: {新幹線|しんかんせん}, {乗車券|じょうしゃけん}, {特急券|とっきゅうけん}, {改札|かいさつ}, のりば, {指定席|していせき}, {自由席|じゆうせき}, {窓側|まどがわ}, {席|せき}, {駅弁|えきべん}, {富士山|ふじさん}, {速|はや}い. About 16 new paintings.

### 6. Inn (旅館)

Cast: Daniel, Ema, Sophie, Leo, Haruka. Places: `gate` and `passage` of the station (used again), `ryokan-gate`, `ryokan-in`, `ryokan-hall`, `ryokan-room`, `ryokan-night`.

| Chapter | Story | Inserts and POVs |
|---|---|---|
| 1 京都に着いた | The exit gate keeps both tickets; the Hachijō side; the inn; shoes off, slippers on; a deep bow of welcome. | The gate slot (the tickets do not come back), the Hachijō sign (POV), shoes in a row from above, slippers |
| 2 チェックイン | The booking (a check from episode 2); tea and a sweet; dinner at seven; the Kyoto lodging tax on the bill. | Tea and sweet from above (instead of `offer` and `receive`), the key, the bill |
| 3 部屋とお風呂 | Slippers off on the tatami, the yukata left over right, the bath times, the futon. | Folded yukata, 男湯 and 女湯 curtains, the futon laid out |

Say: 〇〇です。{予約|よやく}してあります (a check from episode 2) · {夕食|ゆうしょく}は{何時|なんじ}からですか · {七時|しちじ}でお{願|ねが}いします · お{風呂|ふろ}は{何時|なんじ}までですか · スリッパはどこで{脱|ぬ}ぎますか. Hear: いらっしゃいませ · お{部屋|へや}へご{案内|あんない}いたします · {十一時|じゅういちじ}までです. Words: {旅館|りょかん}, {玄関|げんかん}, {靴|くつ}, スリッパ, {畳|たたみ}, {浴衣|ゆかた}, {布団|ふとん}, {夕食|ゆうしょく}, お{風呂|ふろ}, {部屋|へや}, お{茶|ちゃ}, {鍵|かぎ}. About 14 new paintings.

### 7. Summer festival (夏祭り) — pilot

Cast: Daniel, Ema, Sophie, Leo, Daichi. Places: `festival-lane`, `festival`, `festival-eat`, `festival-sky`. A neighbourhood festival, not Gion Matsuri.

| Chapter | Story | Inserts and POVs |
|---|---|---|
| 1 屋台がいっぱい | The family walks into the lane; what will they eat? | Stall banners (たこ焼き, 焼きそば, かき氷, りんご飴), lanterns (still life) |
| 2 たこ焼き屋さん | Daichi calls out (face, no raised hand); Leo orders; the price; "it is hot". | Griddle from above in four drawings (batter, half turned, round, sauce), bonito flakes that move, the tray in Daichi's hands, then in Leo's hands |
| 3 いただきます | Where to eat; the first bite; where the dish goes; fireworks. | Leo's hands from above with the pick lifting a ball and steam (the owner's example), the dish-return place, the fireworks sky |

Say: たこ{焼|や}き、{一|ひと}つください · いくらですか · ここで{食|た}べてもいいですか · お{皿|さら}はどこに{返|かえ}しますか · いただきます · あつい · おいしい · きれい. Hear: いらっしゃい · {六百円|ろっぴゃくえん}です · {熱|あつ}いから{気|き}をつけてね · どうぞ. Words: {祭|まつ}り, {屋台|やたい}, たこ{焼|や}き, {焼|や}きそば, かき{氷|ごおり}, りんご{飴|あめ}, {浴衣|ゆかた}, {花火|はなび}, {皿|さら}, ごみ, {熱|あつ}い, {一|ひと}つ. About 20 new paintings.

Removed from the current film: `call`, `cook` ×4, `eat`, `offer` and `receive` in full shots.

### 8. Souvenir shop (お土産屋)

Cast: Ema, Sophie, Emi. Places: `shop`, `shop-front`, and the airport for the close.

| Chapter | Story | Inserts and POVs |
|---|---|---|
| 1 何にしよう | Fans, tenugui, yatsuhashi; the price. | Shelf POV, the fan opening in three drawings (instead of Emi's fan acts), a tenugui pattern |
| 2 食べてみて | A tasting: soft and baked yatsuhashi. | Sample plate from above |
| 3 包んでください | For a present, wrapped one by one; no bag needed; tax-free from 5,000 yen: pay the full price, the customs check at the airport (a terminal, or online with Visit Japan Web), then the shop pays the money back. | Wrapping from above in three drawings, the passport on the counter, the customs terminal at the airport (the last shot of the series) |

Say: これはいくらですか · これをください · プレゼント{用|よう}です · {別々|べつべつ}に{包|つつ}んでください · {免税|めんぜい}できますか · {見|み}てもいいですか. Hear: いらっしゃいませ · ご{自宅用|じたくよう}ですか · どうぞ、{食|た}べてみてください · パスポートをお{願|ねが}いします. Words: お{土産|みやげ}, {扇子|せんす}, {手|て}ぬぐい, {八|や}ツ{橋|はし}, {包|つつ}む, プレゼント, {免税|めんぜい}, {税込|ぜいこみ}, {箱|はこ}, {袋|ふくろ}. About 16 new paintings.

## Order of work

1. **Pilot: the festival (episode 7).** Its four places exist, and the owner's takoyaki example is in it, so the pilot tests the engine items with no new places. The engine items, the voice pace, the new screenplay, the inserts, the voices (Daichi's voice: the owner picks), the checks (`story:check` 0 faults and 0 LOOKs, `story:qa`, `story:speech --hear`), a contact sheet and a small, short draft of one chapter and the reviews. The owner looks at it before the next episode.
2. Then the trip in order: 1, 2, 3, 4, 5, 6, 8. One pull request or more for each, a small draft, the owner's look. A reused spring painting gets its summer pass in the episode that first uses it.
3. After each episode, add a row to "What a scene costs" in storybook-episode: length, shots, lines, new paintings, new code. The target is no new code after the pilot and fewer new paintings as more places are used again.

The current `first-trip` episode and the phase-1 films stay as they are until the eight episodes exist.

## Open

- The owner picks the voices: Daichi, the bento clerk who is only heard, and the platform announcement.
- Leo (115 cm) and Sophie (138 cm) are taken as children of 6 to 11: two child tickets on each train.
- Not verified, so not shown: the numbered onigiri wrapper, paying by IC card at a konbini, the floor colours of the shinkansen queue lines.
