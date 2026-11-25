# Storybook character intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One command takes a person from the owner's full-body painting to a checked figure, with no code, and a document says how.

**Architecture:** People become data files read by globs, like plays and places. The scattered painting, upscaling and head-crop steps become `storybook-paint.py`, with a check against the painting. `storybook-rig.py --propose` drafts a card and draws it. `storybook-person.mjs` runs the steps, as `storybook-make.mjs` does for a play.

**Tech Stack:** TypeScript and Vite globs; Node scripts; Python 3 with OpenCV and MediaPipe (the rig), mflux 0.24 with FLUX.2 Klein 4B (Apache-2.0), spandrel with Real-ESRGAN anime 6B (BSD-3-Clause), Fish Audio.

**Spec:** `docs/superpowers/specs/2026-11-25-storybook-character-intake-design.md`

## Global Constraints

- No person's name, no palette and no copy of one person in `registry/` (AGENTS rule 2).
- Prose in docs, comments, commits and the PR: ASD-STE100 Simplified Technical English.
- A library goes into the pipeline only with a licence that allows it (Apache-2.0, MIT, BSD). Others are evaluated and not used.
- One image model at a time on this computer.
- Model weights, environments and the owner's paintings stay in `local-assets/storybook` (git ignores it). The repository is public.
- Run only the test files that a change touches. No new test suite: add cases to `tests/storybook-film.test.ts`.
- No full-size or full-length render.

## Review Focus

- A painting on which a landmark model finds no face or no pose: the command stops at that step, names the file, and writes no half card. (Task 4, Task 5)
- A painted face that drifts from the person: it is rejected and painted again with the next seed, three times at most, then reported. It is never kept quietly. (Task 3)
- A run on a person who already has a card: the card is not written over. The proposal goes to `<id>.draft.json`. (Task 4, Task 5)
- Two people in one run, and one fails: the other one is finished, and the summary names both. (Task 5)
- A fresh clone without the models: one line names the missing path and the command that sets it up. No stack trace. (Task 2, Task 5)

---

### Task 1: People are data

**Files:**
- Create: `src/video/storybook/people/<id>.json` for the 10 people in `PEOPLE` of `cast.ts`
- Modify: `src/video/storybook/cast.ts` (read `./people/*.json` by glob), `src/video/storybook/kit-film.ts:28` (unchanged use of `PEOPLE`), `scripts/storybook-speech.mjs:26` (voices from the people files)
- Delete: `src/video/storybook/voices.json`
- Test: `tests/storybook-film.test.ts`

**Interfaces:**
- Produces: a person file `{ "name", "label", "color", "seed", "first"?, "apart"?, "height", "age"?, "voice": { "fish", "speed", "pace" }, "looks": "<one line of hair, face and clothes for the painting templates>", "sheet"?: "<file of the owner's sheet>" }`. `PEOPLE` keeps its type and is built from the files. `voicesOf(dir: string): Record<string, { fish: string; speed: number; pace: number }>` in `storybook-speech.mjs`.

- [ ] **Step 1: Write the failing test** `people are data` in `tests/storybook-film.test.ts`: for each file of `people/`, `castOf(id)[id].name` is the file's name, and the person has a voice with a `fish` id of 32 hex digits. `Object.keys(PEOPLE).length` is 10.
- [ ] **Step 2: Run it.** `npx vitest run --project unit tests/storybook-film.test.ts -t "people are data"`. Expected: FAIL (no folder).
- [ ] **Step 3: Write the files** from `PEOPLE` and `voices.json` (the heights come from the cards). Build `PEOPLE` from the glob. Read voices from the files in `storybook-speech.mjs`. `--voices` stays as an override.
- [ ] **Step 4: Run** the test file, `npx tsc --noEmit`, and `npm run -s story:plan -- hello`. Expected: PASS, exit 0, the plan prints no fault.
- [ ] **Step 5: Commit** "STORY1: people are data files".

### Task 2: Tools that stay

**Files:**
- Move: from the scratch folder of this session to `local-assets/storybook/models/`: `klein6/` (FLUX.2 Klein 4B), `phonectc/`, `julius/`, `segkit/`, `RealESRGAN_x4plus_anime_6B.pth`; the Python environment `mfx/` to `local-assets/storybook/py/`
- Create: `scripts/storybook-tools.mjs` with `tools(): { python: string; models: string; missing: string[] }`
- Modify: `scripts/storybook-speech.mjs` (defaults of `STORY_HEAR`, `STORY_EAR`, `JULIUS_BIN`, `JULIUS_KIT` from `tools()`)

**Interfaces:**
- Produces: `tools()` reads `STORY_PY` and `STORY_MODELS`, else `local-assets/storybook/py/bin/python` and `local-assets/storybook/models`. `missing` names each absent path.

- [ ] **Step 1:** Move the folders (a rename on the same disk; 30 GB free). Install `spandrel` (MIT) into the environment.
- [ ] **Step 2: Verify** `local-assets/storybook/py/bin/python -c "import mflux, spandrel, torch"` exits 0, and `npm run -s story:speech -- ryokan --hear --only slippers` runs with no environment variables.
- [ ] **Step 3: Verify** that with `STORY_MODELS=/nonexistent`, `story:speech -- ryokan --hear` prints one line that names the path and `docs/component-specs/storybook-character.md#tools`.
- [ ] **Step 4: Commit** "STORY1: speech tools from local-assets".

### Task 3: Paintings from templates, checked

**Files:**
- Create: `scripts/storybook-paint.py`

**Interfaces:**
- Consumes: a person file (Task 1), `tools()` paths (Task 2).
- Produces: `python scripts/storybook-paint.py <id> --src local-assets/storybook/paintings --models local-assets/storybook/models [--kinds prepare,face-a,face-blink,face-joy,rear] [--seed n]`. `prepare` writes `flat/<file>.png` (the painting on paper), `flat/<file>@2.png`, `heads/<file>_src.png`, `heads/<file>.png` (4×) and `heads/<file>_768.png`, and prints `{ "box": [x, y, size] }`. A face kind writes `faces/<file>_<a|blink|happy>.png`. `rear` writes `views/<file>_rear.png`. Each kind prints one JSON line: `{ "kind", "file", "seed", "seconds", "kept": bool, "why"?: string }`.

- [ ] **Step 1:** Put the prompts of the scratch queue (`queue5`: `_a`, `_blink`, `_rear`; `joy` from the expressions of the cast) in a table of templates with a `{looks}` slot. The head crop is that of `headcrop.py`. The upscale is that of `up.py` (tiles of 208 px, 20 px of overlap, a blend of 0.6 with Lanczos).
- [ ] **Step 2: The check.** Face landmarks on the source and on the result. Kept when the landmarks that must not move (brows, nose, face outline for `a`; nose, outline and mouth for `blink`) stay within 2.5 % of the face height, the mean Lab colour inside the face outline differs by less than 6, and the asked change happened: lip gap over 4 % of the face height for `a`, eye opening under 30 % of the source for `blink`, mouth corners over the lip centre for `joy`. A rejected result is painted again with seed + 1, three times at most.
- [ ] **Step 3: Verify** on Daichi, whose faces exist: `--kinds face-blink --seed 1`. Then the check alone on the kept `faces/daichi_blink.png` (`--check faces/daichi_blink.png --kind face-blink`) prints `"kept": true`, and on `faces/daichi_rest.png` as a blink prints `"kept": false` with the eye opening.
- [ ] **Step 4: Commit** "STORY1: storybook-paint, paintings from templates with a check".

### Task 4: A proposed card, drawn

**Files:**
- Modify: `scripts/storybook-rig.py` (a `--propose` mode)

**Interfaces:**
- Consumes: `prepare` output of Task 3, the person file.
- Produces: `storybook-rig.py --propose <id> --src … --models … --out <dir>` writes `src/video/storybook/cards/<id>.json` when there is no card, else `<id>.draft.json`, and `<dir>/<id>-card.jpg` with each proposed point and line drawn and named on the painting. It proposes `head.box` (the ears in), `fix.hole.f|b.seam` and `side`, `shows` (from the lip gap and the eye opening of the painting), `faces` (the files that exist) and `height`.

- [ ] **Step 1: The measure.** Propose for the 7 front cards that have `fix.hole`, and compare with their hand-made values: the mean distance of seam points, and the head box. Accept when each seam point is within 12 px and the box within 8 px. Write the numbers in the report of Task 7.
- [ ] **Step 2:** Stop with one line that names the painting and the model when no face or no pose is found. Write no card.
- [ ] **Step 3: Verify** that a second run on Daichi writes `daichi.draft.json` and leaves `daichi.json` unchanged (`git diff --quiet src/video/storybook/cards/daichi.json`).
- [ ] **Step 4: Commit** "STORY1: storybook-rig proposes a card and draws it".

### Task 5: `story:person`

**Files:**
- Create: `scripts/storybook-person.mjs`
- Modify: `package.json` (`"story:person": "node scripts/storybook-person.mjs"`), `scripts/storybook-rig.py` (print the ear check: skin pixels above the jaw that stay on the body layer)

**Interfaces:**
- Consumes: Tasks 1 to 4; `story:qa`, `story:check`, `story:look` with the film `kit-<id>-front`.
- Produces: `npm run -s story:person -- <id>[,<id>] --out <dir> [--port n] [--paint]`. Steps for each person: tools, prepare, propose (only without a card), paint (only with `--paint`, only missing faces), cut, measure (`story:qa`), check (`story:check`), sheet (`story:look --n 4` into `<dir>/<id>-sheet.jpg`), missing (rear view, voice). One line for each step, a log for each step, a stop at the first fault of that person, then the next person, and one summary line for each person.

- [ ] **Step 1:** Write it with the step loop of `storybook-make.mjs`.
- [ ] **Step 2: Verify** `story:person -- daichi --out dir` on an existing person: every step passes, and the card does not change.
- [ ] **Step 3: Verify** `story:person -- daichi,nobody --out dir`: Daichi is finished, `nobody` stops at the first step with "There is no person nobody", and the exit code is 1.
- [ ] **Step 4: Commit** "STORY1: story:person, one command from a painting to a checked figure".

### Task 6: `story:voice --try`

**Files:**
- Modify: `scripts/storybook-speech.mjs` (export `speak`), create `scripts/storybook-voice.mjs`, `package.json` (`"story:voice"`)

**Interfaces:**
- Produces: `npm run -s story:voice -- <id> --try <fish id>,<fish id> [--line "<ja>"]`: speaks the line with each voice, hears it (`storybook-hear.py`), prints for each the edits of what was heard, the accent and the median pitch in semitones against each person of the cast. `--pick <fish id>` writes the voice into the person file.

- [ ] **Step 1: Verify** with Daichi's voice id and one other id: two rows, each with heard phones and a pitch. Nothing is written without `--pick`.
- [ ] **Step 2: Commit** "STORY1: story:voice tries voices for a person".

### Task 7: Kento and Yui, and the document

**Files:**
- Create: `src/video/storybook/people/kento.json`, `people/yui.json`, their cards, their assets; `docs/component-specs/storybook-character.md`; `docs/verification/storybook-character-intake-2026-11-25.md`
- Modify: `docs/component-specs/storybook-episode.md` (link), `docs/component-specs/storybook-film.md` (Add a figure: link), `skills/kumiki-storybook/SKILL.md`

- [ ] **Step 1:** `story:person -- kento,yui --out dir --paint`. Record the seconds of each step.
- [ ] **Step 2: Look** at both figure sheets and the card pictures at full size. Correct the cards where the drawing shows a wrong point, and count the lines typed by hand.
- [ ] **Step 3: Voices.** Use `story:voice --try` for each. Write a voice, and mark it in the report as the agent's draft for the owner to choose.
- [ ] **Step 4: The document** "Add a person": the assets (needed, made, when a scene needs them), the commands, the checks, the tools and their setup, what only the owner decides, and the limits.
- [ ] **Step 5: Verify** `npx vitest run --project unit tests/storybook-film.test.ts tests/rig.test.tsx`, `npx tsc --noEmit`, eslint on the changed files, `npm run -s docs:status`, `npm run -s docs:check`, `npm run catalog:check`, `story:qa -- kit-kento-front` and `kit-yui-front`: no faults.
- [ ] **Step 6: Commit,** push, open the PR, merge when it is clean.

### Task 8: External libraries (runs beside Tasks 1 to 7)

**Files:**
- Create: `docs/verification/storybook-character-libraries-2026-11-25.md`

- [ ] **Step 1:** In a new environment of its own, with the licence of code and weights read first: SAM 2 (Apache-2.0), a whole-body pose model (DWPose or SDPose), and See-through only if its weights have a licence and it runs on this computer.
- [ ] **Step 2: Measure** on the 16 paintings: the figure mask against the alpha of the painting (IoU), a head mask from two clicks against the head layer of each figure, and the keypoints against MediaPipe and against the joints of the 4 rear cards, which were set by hand.
- [ ] **Step 3: Write** the numbers, the licences, the times, and a decision for each library.
