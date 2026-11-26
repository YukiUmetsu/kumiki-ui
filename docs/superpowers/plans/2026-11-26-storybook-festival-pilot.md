# Festival Pilot (Episode 7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An 8-minute festival episode (`matsuri`) in which no person does a hand act in a full shot, with the review pages, checks and voice pace that the next seven episodes use without new code.

**Architecture:** The engine gets five small, opt-in additions to the play compiler and the checker (`reveal`, practice `times` and `pictures`, a `card` lesson, a `check` lesson, a hand-act LOOK). A paint-order script paints the insert paintings from data in a recipe. The episode is a new play file, so `festival` and `first-trip` do not change.

**Tech Stack:** TypeScript (registry/video/storybook), React stage, vitest (`--project unit`), Node tools in `scripts/`, Python 3 (`local-assets/storybook/py`) with FLUX.2 Klein 4B (mflux) and Real-ESRGAN, Fish Audio for voices.

**Spec:** `docs/superpowers/specs/2026-11-26-storybook-eight-minute-episodes-design.md` (episode 7, "Engine work", "Order of work"), with the facts in `docs/research/storybook-episodes-research-2026-11-26.md`.

## Global Constraints

- English: a story line shows its English only with the `glosses` switch. The English of a taught word shows. On a review page the Japanese shows first and the English after `reveal` seconds. In a check, no English shows until the answer.
- Voice pace: 6.5 morae a second (`voice.pace` in `people/<id>.json`). The tempo stays in 0.7–1.0 (`scripts/storybook-speech.mjs:95`).
- Hand acts (`cook`, `eat`, `offer`, `receive`, `take`, `pack`, `fan`, `unfold`, `fold`, `steer`, `show`, `call`, `raise`, `wave`) are not in a shot with people. A hand on a prop is an insert: a painting.
- Facts: only those of the research notes. A tray of takoyaki costs 600 yen (stall prices 500–700 yen, grade C). No brand marks, logos or company names. A neighbourhood 夏祭り, not Gion Matsuri.
- The repository is public: no observation-only photos, keys or the owner's email in a commit. Reference photos stay in `local-assets/` (not committed). The paintings stay in `local-assets/storybook/paintings/sets`; only the cut-outs in `src/video/storybook/assets` are committed.
- Paintings are made locally (FLUX.2 Klein 4B), one FLUX process at a time. Do not upload the owner's sheets or paintings to any service.
- Readings inline (`{店|みせ}`), words apart, は said わ as `[は|わ]` (storybook skill rule 8).
- No full-size or full-length render without the owner's request. Drafts are 640 px wide and short.
- Fish Audio: `source ~/.bash_profile >/dev/null 2>&1` first. Never print the environment or the key.
- Run only the related tests: `npx vitest run --project unit tests/storybook-film.test.ts`. Run `npm run -s docs:check` after a doc or skill change, `npm run catalog:check` after a registry change.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `rm -rf scripts/__pycache__` before each commit. Write in STE.

## Review Focus

1. A long practised line with furigana and a picture on the same page at 1920 px: the picture, the title, the line and its English must not touch. Task 3 adds the box test; Task 11 looks at the longest line (`plate-where`) with the switch on and off.
2. `reveal` with the switch on: the English of a review word must still wait for `reveal`, and a story line's English must show at once. Task 2 tests both.
3. A check in which one person speaks in two items in a row, or changes sides from one item to the next, or both hears and answers in one item. Task 5 tests the first two and makes the third an error with a clear message.
4. A voice whose natural speed is below 6.5 at tempo 1.0: the cap keeps the line slower than the target. Task 10 lists each such line with its measured pace, and does not hide it.
5. Old films do not change: every new field is opt-in. The existing "translations" and "films from data" tests stay green, and `festival` keeps its practice page as it is (Task 2 step 4).

---

### Task 1: Voice pace 6.5

**Files:**
- Modify: `src/video/storybook/people/*.json` (the 10 files with `voice.pace`)
- Modify: `skills/kumiki-storybook/SKILL.md:19`, `docs/component-specs/storybook-episode.md:28`
- Test: `tests/storybook-film.test.ts` ("people")

**Interfaces:**
- Produces: `voice.pace === 6.5` for every person with a voice. Old plays keep their recordings; their tempo changes only when they are recorded again. Do not record the old plays again in this pilot.

- [ ] **Step 1: Write the failing test.** In the "people" test loop add `if (p.voice?.pace !== undefined) expect(p.voice.pace, id).toBe(6.5);`.
- [ ] **Step 2: Run it.** `npx vitest run --project unit tests/storybook-film.test.ts -t people`. Expected: FAIL (5.6, 5.7, 5.8).
- [ ] **Step 3: Set `"pace": 6.5`** in each voice. Rule 8 of the skill becomes "Pace 6.5 morae a second: faster than JLPT N5 listening (5.05), slower than native read speech (7.1)." Step 2 of storybook-episode.md says "6.5 morae a second" in place of "4 to 5".
- [ ] **Step 4: Run it.** Same command. Expected: PASS. Then `npm run -s docs:check`: OK.
- [ ] **Step 5: Commit.** `git commit -m "STORY1: voices at 6.5 morae a second"`.

### Task 2: English after a pause, and a phrase said twice

**Files:**
- Modify: `registry/video/storybook/storybook-film.ts:80` (`StoryWords`), the `StoryShownWords` interface, and the words loop at `:478`
- Modify: `registry/video/storybook/storybook-film-react.tsx:83`
- Modify: `registry/video/storybook/story-play.ts:62-63` (`PlayPractice`, `PlayRecap`), `practiceScene`, `recapScene`
- Test: `tests/storybook-film.test.ts` (new `describe("lesson pages")`)

**Interfaces:**
- Produces: `StoryWords.reveal?: number`: seconds after the words start when their translation starts to show.
- Produces: `StoryShownWords.glossOpacity: number`: the opacity (0–1) of the translation. Without `reveal` it is 1. With `reveal` it is `fade(t, start(w) + reveal, end, 0.35, 0.28)`, the same end as the words.
- Produces: `PlayPractice.reveal?: number`, `PlayPractice.times?: number` (default 1), `PlayRecap.reveal?: number`.
- With `reveal`, the words of a practised line are `{ text: l.ja, gloss: l.en, means: true, reveal }`, and recap words get `reveal`. Without it, the words are as they are now.
- With `times: 2`, the said beat and the hold beat come twice. The second hold has no `reveal`.

- [ ] **Step 1: Write the failing tests** with a film from `composeStory({ id: "t", title: "t", scenes: [{ id: "say", practice: { lines: [first], reveal: 1.5, times: 2 } }] }, { ...storyLibrary(), lines: KONBINI_LINES })`, where `first = Object.keys(KONBINI_LINES)[0]`:
  - `it("show the English of a practised line only after reveal seconds")`: for the shown words of the line, `glossOpacity === 0` at its start + 0.5 s and `glossOpacity === 1` at its start + 2.2 s. The stage markup (`glosses` off) does not contain `KONBINI_LINES[first].en` at the first time and contains it at the second.
  - `it("keep the reveal when the switch is on")`: the same first time with `glosses: true`: the line's English is not in the markup.
  - `it("say a phrase as many times as asked")`: the line is said twice in the film (count the `says` with that line).
- [ ] **Step 2: Run them.** `npx vitest run --project unit tests/storybook-film.test.ts -t "lesson pages"`. Expected: FAIL (`reveal` and `times` are not known).
- [ ] **Step 3: Implement** the fields above. The React stage renders the gloss `<p>` only when `glossOpacity > 0`, with `style.opacity = glossOpacity`. The condition `w.gloss && (glosses || w.means)` stays.
- [ ] **Step 4: Run** the new tests and the "translations" and "films from data" tests: `npx vitest run --project unit tests/storybook-film.test.ts`. Expected: PASS. `festival` (no `reveal`) is unchanged.
- [ ] **Step 5: Commit.** `git commit -m "STORY1: English after a pause on review pages, a phrase said twice"`.

### Task 3: A picture of the moment on a practice page

**Files:**
- Modify: `registry/video/storybook/story-play.ts` (`PlayPractice`, `practiceScene`)
- Test: `tests/storybook-film.test.ts` ("lesson pages")

**Interfaces:**
- Produces: `PlayPractice.pictures?: Readonly<Record<string, string | { prop: string; view?: string }>>`, keyed by line id. The picture is a painted prop (a still cut from an insert painting in Task 8). The film cannot draw one of its own shots onto a page, so the "still of a shot" of the spec is this prop.
- The picture fits in the box of film px `{ at: [1298, 660], width: 520, height: 280 }` (a private constant `PICTURE` in story-play.ts). The prop stands on its `to` point, as in `titled`, so the point is the bottom middle of the fitted box. The picture is on the page in both beats of the line.
- An unknown prop throws `Practice "<id>": there is no prop "<prop>" for the picture of "<line>".`

- [ ] **Step 1: Write the failing test** `it("put the picture of a line below the title and beside the speaker")`: compose a practice with `pictures: { [first]: <a prop from storyLibrary().props> }`. From the composed shot, take the prop's place and scale and change them to film px (`unit = frame.height / home.tall`, `x = frame.x + frame.width / 2 + (cm - home.at[0]) * unit`). Expect the box inside `[1038, 520, 520, 280]` ±1 px. Expect no overlap with the title box `[868, 380, 860, 120]`, and its left edge right of the speaker's box (from the speaker spot and the figure's painted width at its scale). Also expect the unknown-prop error.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement** `pictures` in `practiceScene`.
- [ ] **Step 4: Run** `npx vitest run --project unit tests/storybook-film.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "STORY1: a picture of the moment on a practice page"`.

### Task 4: A card lesson for the goal and the chapters

**Files:**
- Modify: `registry/video/storybook/story-play.ts:65` (`PlayLesson`), new `cardScene`, `lessonScene`
- Test: `tests/storybook-film.test.ts` ("lesson pages")

**Interfaces:**
- Produces: `PlayCard { title: string; gloss?: string; lines?: readonly (string | { text: string; gloss?: string })[]; seconds?: number }`. A string in `lines` is a line id: its words are `{ text: l.ja, gloss: l.en }`.
- Produces: `PlayLesson` gets `| { card: PlayCard }`.
- A card is a page with no people on the teach stage, `layout: "full"`. The title is `titled(...)` at `[960, 260]`, size 84, ribbon 900 wide, without `means` (its English needs the switch). The lines are at `[960, 470 + 150 * i]`, size 60, `means: true`. Seconds: `card.seconds ?? 3 + 2.5 * lines.length`. More than 3 lines throws `Card "<id>" has <n> lines; a card has 3 at most.`

- [ ] **Step 1: Write the failing test** `it("make a card from a title and up to three lines")`: a card with a title and 3 lines (one a line id) gives one shot with `layout: "full"`, no roles and 10.5 s. The markup with the switch off contains the English of the lines and not the English of the title. A card with 4 lines throws.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement** `cardScene` and add it to `lessonScene`.
- [ ] **Step 4: Run** `npx vitest run --project unit tests/storybook-film.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "STORY1: card lesson for the goal and the chapters"`.

### Task 5: A check lesson

**Files:**
- Modify: `registry/video/storybook/story-play.ts` (`PlayLesson`, new `checkScene`, `lessonScene`)
- Test: `tests/storybook-film.test.ts` ("lesson pages")

**Interfaces:**
- Produces: `PlayCheckItem { hear?: string; ask?: string; gloss?: string; answer: string }` (exactly one of `hear` and `ask`; `hear` and `answer` are line ids; `ask` is ruby text). `PlayCheck { items: readonly PlayCheckItem[]; think?: number }` with `think` 4 s by default. `PlayLesson` gets `| { check: PlayCheck }`.
- One shot for each item, `size: "wide"`, `join: "wash"` after the first. People are knee-up as in `quizScene` (`near`): the speaker of `hear` at `at.asker`, the speaker of `answer` at `at.other`.
- Beats of an item: (1) `hear`: its speaker says it to the viewer; `ask`: the words `{ text: ask, gloss, means: true, reveal }` at `[960, 190]`, size 72, with the ribbon, until the item ends, and `reveal` equal to the seconds until the answer starts. (2) Think: `think` seconds, the answer speaker does `think`, the words `？` at `[960, 470]`, size 84. (3) The answer speaker says the answer to the viewer, mood happy, the other person reacts happy, and the words `{ text: l.ja, gloss: l.en, means: true }` at `[960, 470]`, size 72.
- People: a person who is not in the next item, or who changes sides, exits at the start of that item. A person who keeps their side stays.
- Errors: `Check "<id>" item <n>: give "hear" or "ask", not both.`; `Check "<id>" item <n>: "<who>" hears and answers; a check needs two people.`; an unknown line id throws as `practiceScene` does.

- [ ] **Step 1: Write the failing tests** with `KONBINI_LINES` (one line of each of its two speakers as `hear` and `answer`):
  - `it("check a heard line: the line, a pause with no English, then the answer with its English")`: in the film the hear line is said before the answer line, with at least `think` seconds between their ends and starts. In the think beat the markup (switch off) has no `lang="en"`; in the answer beat it contains the answer's English.
  - `it("check a situation: its English waits for the answer")`: an `ask` item: the ask text is in the markup in the think beat and its gloss is not; both are in the answer beat.
  - `it("let people stay, change sides or leave between items")`: three items, where the second keeps the first one's hear speaker and the third swaps the two speakers. `inspectStorybook(film)` is `[]`, and in each shot each role is at its side.
  - `it("refuse a check that one person hears and answers")`: throws the second error above.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement** `checkScene`. Reuse `near`, `titled` and the enter and exit pattern of `quizScene`.
- [ ] **Step 4: Run** `npx vitest run --project unit tests/storybook-film.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "STORY1: check lesson: hear or a situation, a pause, the answer"`.

### Task 6: `story:check` names hand acts

**Files:**
- Modify: `registry/video/storybook/story-check.ts:15` (`StoryChecked`), `checkStory`
- Modify: `scripts/storybook-check.mjs:31-37`
- Test: `tests/storybook-film.test.ts` (new `describe("screenplays")`)

**Interfaces:**
- Produces: `export const HAND_ACTS: readonly string[] = ["cook", "eat", "offer", "receive", "take", "pack", "fan", "unfold", "fold", "steer", "show", "call", "raise", "wave"]`.
- Produces: `StoryChecked.handActs: string[]`, one entry for each role act in `HAND_ACTS`: `` `${shot} ${t.toFixed(2)} s: ${actor} ${act} — a hand on a prop goes in an insert (a painting), not in a shot with people.` ``. An insert has no roles, so it gives none.
- `storybook-check.mjs` prints `LOOK  <entry>` for each, and adds their count to "to look at".

- [ ] **Step 1: Write the failing test** `it("name a hand act in a shot with people")`: `checkStory(planStorybook(filmOf("festival")), { shots: [<the shot of plays/festival.json in which daichi does `call`>] }).handActs` has an entry that contains `daichi call`.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement** it in the role loop of `checkStory`.
- [ ] **Step 4: Run** the test file. Expected: PASS. Then `npm run -s story:check -- festival`: the hand acts show as LOOKs and the faults stay 0.
- [ ] **Step 5: Commit.** `git commit -m "STORY1: story:check names hand acts in shots with people"`.

### Task 7: Paint orders in a recipe

**Files:**
- Create: `scripts/storybook-paint-set.py`
- Modify: `docs/component-specs/storybook-episode.md` (a short "Paint orders" section)

**Interfaces:**
- Consumes: `Painter`, `Upscaler` and `write` from `scripts/storybook-paint.py`, loaded with `importlib` as that file loads `storybook-rig.py`. `Painter(path)(prompt, refs, size, seed)` returns RGB; `Upscaler(path)(rgb, fac)` returns RGB.
- Produces: a recipe source can have `"paint": { "prompt": string, "refs": [file names in --src], "size": [w, h], "seed": int }`. `storybook-art.py` already passes unknown source keys through.
- CLI: `python scripts/storybook-paint-set.py <recipe.json> [--only a,b] [--seed N] [--again] [--src local-assets/storybook/paintings/sets] [--models local-assets/storybook/models] [--dry]`.
- It paints each source with `paint` whose `file` is missing (all of them with `--again`), at `size`; then, when the source names `sharp`, it writes that file ×2 with the Upscaler. `--seed` replaces the seed, for another try. Beside each painting it writes `<file>.json`: prompt, refs, seed, size, model folder and the SHA-256 of the painting.
- It refuses (exit 1, one line) a missing ref, a size that is not a multiple of 16, or a lock file `<src>/.paint.lock` that another run holds (one FLUX process at a time). `--dry` lists the orders and loads no model.

- [ ] **Step 1: Check the refusals.** With a temporary recipe in the scratchpad that names a missing ref: `local-assets/storybook/py/bin/python scripts/storybook-paint-set.py $SP/bad.json --dry`. Expected: exit 1, one line that names the ref.
- [ ] **Step 2: Implement the script.**
- [ ] **Step 3: Check it.** Step 1 again: exit 1. A recipe with one order and `--dry`: one line with the file, size, seed and refs, exit 0. One real order of 512×512 (seed 1), painted to the scratchpad `--src` copy: the painting, the `@2` file and the `.json` exist; look at the painting.
- [ ] **Step 4: Docs.** The "Paint orders" section: the source keys, the command, the lock, and "look at each painting at 1× and 2× before it is cut". `npm run -s docs:check`: OK.
- [ ] **Step 5: Commit.** `rm -rf scripts/__pycache__; git commit -m "STORY1: paint orders in a recipe"`.

### Task 8: The festival inserts

**Files:**
- Modify: `src/video/storybook/recipes/festival.json` (paint orders, pieces), `src/video/storybook/places/festival.json` (insert stages and props), `src/video/storybook/assets/festival/*` (cut-outs)
- Modify: `docs/research/storybook-episodes-research-2026-11-26.md` (a "Festival inserts" section)
- Local only: `local-assets/storybook/refs/festival/`, `local-assets/storybook/paintings/sets/fs_*.png`

**Interfaces:**
- Consumes: Task 7 (paint orders).
- Produces these sets and stages (all with `about`, a `bed`, and frames `all` and at least one close frame) and props for Task 9:

| Painting | Stage, set or prop | What it shows |
|---|---|---|
| `fs_banners` | stage `festival-banners` | 4 stall banners; the recipe paints たこ焼き 600円, 焼きそば, かき氷, りんご飴 with text steps |
| `fs_lanterns` | stage `festival-lanterns` | lanterns on a string, a still life |
| `fs_top-1` | stage `festival-top` | the griddle from above: batter with octopus and tenkasu |
| `fs_top-2`, `-3`, `-4` | prop `top-balls`, views `half`, `round`, `sauce` | half turned 90°; round; in the boat tray with sauce, aonori and bonito flakes |
| `fs_tray-daichi`, `fs_tray-leo` | stages `festival-tray-daichi`, `festival-tray-leo` | the tray in Daichi's hands; then in Leo's hands |
| `fs_pick-1`, `fs_pick-2` | stage `festival-pick`, prop `pick-lift` | from above: the pick in a ball; the ball lifted, with steam |
| `fs_return` | stage `festival-return` | the place to return dishes, with a bin; the recipe paints 皿 and ごみ |
| word props | `yakisoba`, `kakigori`, `ringo-ame`, `yukata`, `plate`, `gomi` | one object each, for the recap and the quiz |
| stills (pieces) | `still-tray`, `still-price`, `still-eat`, `still-return`, `still-pick`, `still-sauce`, `still-lane`, `still-stall`, `still-steam` | rectangles cut from the paintings, for Task 3 and the recap |

Bonito flakes and steam are drifts (the `steam` drift exists in `places/festival.json`). Before you paint a word prop, check `npm run -s story:plan -- --library props`: `takoyaki`, `lantern`, `hanabi` and `bite` exist.

- [ ] **Step 1: References (artcraft source gate).** For each row, find 2–4 real photos: the griddle from above at each stage, the boat tray with toppings, a hand with a pick lifting a ball, a festival dish-return place, stall banners, string lanterns, and the six word objects. Save them in `local-assets/storybook/refs/festival/` (one folder for each download, read with `python -I`). In the research notes write, for each, the URL, the rights grade and what you saw (how the ball turns, where the sauce and flakes lie, how the fingers hold the tray and the pick, how many fingers show). Do not commit a photo.
- [ ] **Step 2: Paint orders.** Add a source with `paint` for each painting to `recipes/festival.json`: refs are our own paintings (`fs_griddle`, `fs_stall`, `fs_lane`, `fs_people`), in the look of the set; the prompt names the observations of step 1. Then `scripts/storybook-paint-set.py src/video/storybook/recipes/festival.json --dry`: about 17 orders.
- [ ] **Step 3: Paint and look, one at a time.** Paint each order. Open each painting at 1× and 2×. Hands: five fingers, a thumb on the right side, the fingers round the tray or the pick, no extra hand. Food: the ball is round and brown after the turn, sauce and flakes lie on top, the tray is a boat. Paint again with another seed or a better prompt until it holds. Keep only the paintings that pass.
- [ ] **Step 4: Cut.** Add the pieces and the text steps to the recipe, then `local-assets/storybook/py/bin/python scripts/storybook-art.py src/video/storybook/recipes/festival.json --src local-assets/storybook/paintings/sets --out src/video/storybook/assets`. Expected: exit 0. Add the stages and props of the table to `places/festival.json`, after the pattern of the stage `festival` (frames `cook`, `plate`).
- [ ] **Step 5: Look.** Open each cut-out in `src/video/storybook/assets/festival/` at 1× and each painting at 2×: no seam, no halo, no lost finger or flake at the cut. Task 11 looks at the inserts in their frames.
- [ ] **Step 6: Owner gate.** Show the owner the four hand inserts (`fs_tray-daichi`, `fs_tray-leo`, `fs_pick-1`, `fs_pick-2`) at 1× and 2×, and wait for the verdict. Do not film a hand insert that the owner rejects.
- [ ] **Step 7: Commit.** `rm -rf scripts/__pycache__; git commit -m "STORY1: festival inserts: banners, griddle from above, trays, the pick, the dish return"`.

### Task 9: The `matsuri` play

**Files:**
- Create: `src/video/storybook/plays/matsuri.json`
- Test: `tests/storybook-film.test.ts` ("screenplays")

**Interfaces:**
- Consumes: Tasks 2–6 (lessons), Task 8 (stages and props), the stages `festival-lane`, `festival`, `festival-eat`, `festival-sky`.
- Produces: the film `matsuri` (in `filmNames()` through `playNames()`).

Lines (speaker: Japanese — English):

| Id | Who | Japanese | English |
|---|---|---|---|
| crowd | ema | {人|ひと}が いっぱいだね。 | So many people. |
| smell | daniel | いい におい！ | Something smells good! |
| nani-ga-ii | sophie | {何|なに}が いい？ | What do you want? |
| takoyaki-ga-ii | leo | たこ{焼|や}きが いい！ | Takoyaki! |
| welcome | daichi | いらっしゃい！ | Welcome! |
| one-please | leo | たこ{焼|や}き、 {一|ひと}つ ください。 | One takoyaki, please. |
| how-much | daniel | いくらですか。 | How much is it? |
| six-hundred | daichi | {六百円|ろっぴゃくえん}です。 | It's 600 yen. |
| careful | daichi | {熱|あつ}いから、 {気|き}を つけてね。 | It's hot, so be careful. |
| here-you-are | daichi | どうぞ。 | Here you are. |
| eat-here | ema | ここで {食|た}べても いいですか。 | May we eat here? |
| sure | daichi | いいですよ。 | Sure. |
| itadakimasu | leo | いただきます。 | Let's eat. |
| hot | leo | あつい！ | Hot! |
| tasty | sophie | おいしい！ | Tasty! |
| plate-where | daniel | お{皿|さら}[は|わ] どこに {返|かえ}しますか。 | Where do we return the plate? |
| plate-there | daichi | あそこです。 | Over there. |
| fireworks | sophie | あ、 {花火|はなび}！ | Oh, fireworks! |
| pretty | ema | きれい！ | Beautiful! |
| kore-wa | ema | これ[は|わ] {何|なん}ですか。 | What is this? |
| is-yakisoba, is-kakigori, is-yukata, is-hanabi | daichi | {焼|や}きそばです。 · かき{氷|ごおり}です。 · {浴衣|ゆかた}です。 · {花火|はなび}です。 | It's yakisoba. · It's shaved ice. · It's a yukata. · It's fireworks. |

Screenplay (seconds are targets; the total must be 450–510 s):

| Part | s | Scenes and shots |
|---|---|---|
| Cold open | 15 | `festival-top`: batter, then `top-balls` `half` and `round` at set times, steam, the griddle sound; card `お{祭|まつ}り` ("The festival") |
| Goal | 20 | card `{今日|きょう}[は|わ] これを {言|い}います` ("Today you learn to say"), lines `one-please`, `how-much`, `eat-here` |
| Chapter 1 | 85 | card `{一|いち} {屋台|やたい}が いっぱい` ("1 So many stalls"); `festival-lane` push; `festival-banners` pan with the four food words (`means`) as each banner passes; `festival-lanterns`; the family walks in; `crowd`, `smell`, `nani-ga-ii`, `takoyaki-ga-ii` with reaction faces; they turn to the stall |
| Chapter 2 | 85 | card `{二|に} たこ{焼|や}き{屋|や}さん` ("2 The takoyaki stall"); `festival` wide; `welcome` (face and voice, no raised hand); `festival-top` round; `one-please`, `how-much`, `six-hundred`; `top-balls` `sauce` with the bonito drift; `festival-tray-daichi` with `careful`, `here-you-are`; cut to `festival-tray-leo`; check `{hear: "nani-ga-ii", answer: "takoyaki-ga-ii"}` |
| Chapter 3 | 85 | card `{三|さん} いただきます` ("3 Let's eat"); `festival`: `eat-here`, `sure`; `festival-eat`: bow, `itadakimasu`; `festival-pick` (the pick in a ball, then `pick-lift` with steam); `hot`, `tasty` (faces); `festival`: `plate-where`, `plate-there` (a look, no point); `festival-return` tilt; `festival-sky` bursts, `fireworks`, `pretty`; check `{ask: "{値段|ねだん}を {聞|き}きます", gloss: "Ask the price.", answer: "how-much"}` |
| Phrases | 90 | practice `one-please`, `how-much`, `eat-here`, `plate-where`, `itadakimasu`, `takoyaki-ga-ii` with `reveal: 1.5`, `times: 2`, pictures `still-tray`, `still-price`, `still-eat`, `still-return`, `still-pick`, `still-sauce` |
| Words | 45 | 3 recaps with `reveal: 1.5`: {祭|まつ}り `still-lane` · {屋台|やたい} `still-stall` · {浴衣|ゆかた} `yukata` · {花火|はなび} `hanabi`; たこ{焼|や}き `takoyaki` · {焼|や}きそば `yakisoba` · かき{氷|ごおり} `kakigori` · りんご{飴|あめ} `ringo-ame`; {皿|さら} `plate` · ごみ `gomi` · {熱|あつ}い `still-steam` · {一|ひと}つ `bite`. Then quiz `kore-wa` on `yakisoba`, `kakigori`, `yukata`, `hanabi` |
| Final check | 25 | `{hear: "welcome", answer: "one-please"}`, `{ask: "ここで {食|た}べたいです", gloss: "You want to eat here.", answer: "eat-here"}`, `{ask: "お{皿|さら}を {返|かえ}したいです", gloss: "You want to return the plate.", answer: "plate-where"}` |
| Close | 15 | `welcome`, `one-please`, `six-hundred`, `here-you-are` over the inserts, with no words on the page; card `{次|つぎ}[は|わ] お{土産|みやげ}{屋|や}さん` ("Next: the souvenir shop") |

The spec asks for three heard lines in the final check. Two items give the situation in words instead, because no staff line of this episode asks for `eat-here` or `plate-where`. Say this in the PR.

- [ ] **Step 1: Write the failing test** `it("keep hands on props in inserts: matsuri has no hand act in a shot with people")`: `filmOf("matsuri").shots.flatMap(s => s.roles ?? []).flatMap(r => r.acts ?? []).filter(a => HAND_ACTS.includes(a.act))` is `[]`.
- [ ] **Step 2: Run it.** Expected: FAIL (no film "matsuri").
- [ ] **Step 3: Write `plays/matsuri.json`** from the two tables. Use `npm run -s story:plan -- --library stages|props|sounds|acts` for names. Use only body acts: walk, turn, look, nod, bow, deep bow, hop, shrug, look around, listen, think, moods, speech, `explain` below the chest.
- [ ] **Step 4: Run** `npx vitest run --project unit tests/storybook-film.test.ts`. Expected: PASS, with `matsuri is whole`. Then `npm run -s story:plan -- matsuri`: the total is 450–510 s. If it is not, change the hold seconds of the establishing shots and inserts, not the lines.
- [ ] **Step 5: Commit.** `git commit -m "STORY1: matsuri, the festival in 8 minutes"`.

### Task 10: Voices

**Files:**
- Modify: the recorded lines of `matsuri` (written by `story:speech`)
- Modify (if needed): `src/video/storybook/people/<id>.json` (`voice.speed`)

**Interfaces:**
- Consumes: Task 1 (pace), Task 9 (lines).
- Produces: `unspokenLines("matsuri")` is `[]`.

- [ ] **Step 1: Record.** `source ~/.bash_profile >/dev/null 2>&1; npm run -s story:speech -- matsuri --hear`. Expected: every line is recorded, and `--hear` reads each one back with no wrong reading.
- [ ] **Step 2: Read the rates.** For each line the tool prints seconds, morae a second and tempo. A line at tempo 1.00 with a pace below 6.2 is slower than the target: raise that person's Fish `speed` by 0.05 and record their lines again (step 1 with only their lines). Write each such line and its numbers in the PR. Daichi keeps his voice; the owner picks a new one with `npm run story:voice -- daichi --try <ids>`.
- [ ] **Step 3: Check.** `npx vitest run --project unit tests/storybook-film.test.ts`: PASS (the lines now have tracks).
- [ ] **Step 4: Commit.** `git commit -m "STORY1: matsuri voices at 6.5 morae a second"`.

### Task 11: Checks, docs, draft and PR

**Files:**
- Modify: `docs/component-specs/storybook-episode.md` ("What a scene costs", the lessons `card` and `check`, `reveal`, `times`, `pictures`, insert stages, paint orders)
- Modify: `skills/kumiki-storybook/SKILL.md` (one line: hand acts go in inserts; the new lessons)

- [ ] **Step 1: Checks.** `npm run -s story:check -- matsuri --out $SP/check.jpg`: 0 faults, 0 LOOKs. `npm run -s story:qa -- matsuri --out $SP/qa`: no faults. `npm run -s story:sound -- matsuri --out $SP/mix.m4a`: report its LUFS and true peak.
- [ ] **Step 2: Look.** `npm run -s story:look -- matsuri --port 6016 --out $SP/sheet.png` (Storybook on 6016) and the same with `--english`. Look at every page: the goal card, the three chapter cards, a check at each beat, each practice page (with `plate-where` the longest) and each recap. Nothing touches or overlaps; the English waits for `reveal`; no English in a check before the answer.
- [ ] **Step 3: Draft.** Chapter 2 and the phrase pages only, 640 px wide, 12 frames a second: frames with `story:look -- matsuri --from <a> --to <b> --n <12 × seconds> --width 640 --keep --port 6016`, joined with ffmpeg and the mix of step 1. Not a full render.
- [ ] **Step 4: Docs.** Add the `matsuri` row to "What a scene costs" (length, shots, lines, new paintings, new code). Describe the new lesson fields and the insert pattern. `npm run -s docs:check` and `npm run catalog:check`: OK. `npx tsc --noEmit`: 0 errors. `npx eslint` on the changed TypeScript files: clean.
- [ ] **Step 5: PR.** `rm -rf scripts/__pycache__`, commit, push, open the PR: what changed, the checks (tested / looked at / not artist-approved), "Fixed alongside", "Follow-ups" (Daichi's voice, the more cupped call hand, the `sophie-rear` neck, Emi's 3 LOOKs, turned faces, the width lump measure, a thumb-side near point), and the draft for the owner. Merge when the checks pass and the owner has seen the draft.
