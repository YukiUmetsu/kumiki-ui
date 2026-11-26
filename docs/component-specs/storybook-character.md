# Add a person (STORY1)

How a new person goes into the painted storybook films: the assets, the commands, the checks and what only the owner decides. A person needs no code. The engine and the rules of a figure are in [storybook-film](storybook-film.md#add-a-figure). The card fields are in [storybook-episode](storybook-episode.md#a-figure).

## What a person needs

| Asset | Where | Made by | When |
|---|---|---|---|
| The person: name, label (ruby), colour, seed, height, age, `looks`, `keep` | `src/video/storybook/people/<id>.json` | hand, from the owner's character sheet | always |
| A full-body painting, front, A-pose (arms a little away from the body), RGBA or on white paper | `local-assets/storybook/paintings/cast/<id>_full_body.png` | the owner | always |
| The painting on paper, a 2× copy, the head square at 4× | `flat/<id>.png`, `flat/<id>@2.png`, `heads/<id>.png` | `storybook-paint.py` (prepare) | always |
| Face paintings: open mouth `a`, `blink`, a laugh `happy`, `rest` | `faces/<id>_<face>.png` | `storybook-paint.py` (faces), each one checked | the ones that the painting does not show itself |
| The card | `src/video/storybook/cards/<id>.json` | `storybook-rig.py --propose`, then corrected by hand where its picture shows a wrong point | always |
| The figure | `src/video/storybook/assets/<id>-front/` | `storybook-rig.py` (the cut) | always |
| A voice | `voice` of the person file | `story:voice --try`, then the owner picks | before the first line is spoken |
| A rear view | `views/<id>_rear.png`, `cards/<id>-rear.json` | `storybook-paint.py --kinds rear`, a rear card | only when a screenplay turns the person |
| A view in other clothes | `apart` of the person file, its own painting and card | the owner, then as a front view | only when a screenplay names it |

Hands and feet come from the kit of the cast (`cards/kit-hands.json`, `kit-feet.json`) in the size and the skin colour of the figure. Acts, joints and looks are shared. A person does not need paintings of hands, of looks or of mouth shapes.

`looks` is hair and clothes in a few words, in English, for the templates (for example "messy brown bun, mustard-yellow hoodie, loose blue jeans"). `keep` is what a face painting must keep besides the hair and the clothes, for example "thin glasses".

## Commands

```
npm run -s story:person -- kento,yui --out dir --paint --port 6016   # all steps for each person
npm run -s story:voice -- kento --try <fish id>,<fish id>             # one line with each voice, heard and measured
npm run -s story:voice -- kento --pick <fish id> --speed 0.8 --pace 5.6
```

`story:person` runs these steps for each person, writes a log of each step into `dir`, and stops that person at the first fault. Then the next person starts. The exit code is 1 when one person stopped.

| Step | What it does | What stops it |
|---|---|---|
| prepare | the painting on paper, the sharp copies (Real-ESRGAN anime 6B), the head square | no person file, no painting, no face at the top of the painting |
| paint | with `--paint`: each face that is missing, from the 768 px head square with a template. Up to 3 seeds | a face that fails its check 3 times |
| propose | only without a card: the card, and `<id>-card.jpg`, the painting with each point and line of the card | no face in the head box |
| cut | the figure, `<id>-front_parts.png` and `<id>-front_assembled.png` | skin of an ear left on the body (more than 0.02 of the face width squared) |
| measure, check | `story:qa` and `story:check` of the shots of the kit film that show the figure: stand, turn, heads, looks, say, arms, walk, sit | any fault |
| acts | `story:check` of all acts, and `<id>-poses.jpg`. It does not stop: see [Limits](#limits) | nothing |
| sheet | `<id>-sheet.jpg`, four frames of each shot of the kit film. It needs a running Storybook | |
| missing | faces, a rear view, a voice | |

A card is never written over. When there is one, `storybook-rig.py --propose <id> --look dir` writes `dir/<id>.draft.json` to compare.

## Checks

| Check | Pass | Why |
|---|---|---|
| A face painting stays where the head was | the hair, the ears and the clothes are aligned (ECC, affine) within 1.5 % of the face height and 1.5 % of size | a painting model moves and scales a head now and then |
| A face painting shows what was asked | lips over 4 % of the face height apart for `a`; eyes under 3 % open and lips under 1.5 % apart for `blink`; corners of the mouth up and lips apart for a laugh; lips closed and eyes open for `rest` | measured on the 21 faces in use |
| A rear view | no face is found, its figure covers 80 % of the painting's, its height is within 3 % | |
| Ears | 0 px of ear skin on the body, after an opening of 5 px | the seven cut figures leave 0 px; a cut at the cheek leaves 960 to 4531 px |
| Joints, hands, elbows, mouths, feet | `story:qa` and `story:check` | see [Joints](storybook-film.md#joints) |

The colour of a face painting is printed and not judged: only its eyes, cheeks and mouth go into the figure, and the cut matches their colour at the edge. MediaPipe's points inside a face that changed its expression move 1 to 11 % on paintings that did not move, so they do not measure place.

## What only the owner decides

- The painting, the clothes and the looks of the person.
- The height when the sheet gives none. The agent writes the national mean of the person's age and says so.
- The voice. The agent can try voices and measure them. It cannot hear whether a voice fits the person.
- Whether the figure is approved. Tests and checks do not approve art.

## Look at

1. `<id>-card.jpg`: the head box holds the hair and both ears; the seams run along the armholes and not through a strap; the cuff lines are at the cuffs; "the legs part here" is at the crotch, or "skirt: stands only".
2. The new face paintings beside the painting: the same person, the same glasses, the same hair.
3. `<id>-sheet.jpg`: the face in each look, closed lips between lines, the mouth in speech, the neck beside the jaw, the arms in the space in front, the walk. A painting with an open mouth or a laugh gets `"idle": "neutral"` in the proposed card, so that the figure listens with the face painted at rest.
4. `<id>-poses.jpg`: each act of the arms.

Correct the card where a picture shows a wrong point, and run `story:person` again: the faces and the sharp copies that are there are kept.

## Tools

The tools are in `local-assets/storybook` (git ignores it). `STORY_PY` and `STORY_MODELS` overrule the paths. `npm run -s story:setup` makes what is missing from pinned public sources and checks each file with its SHA-256 (`-- --check` only checks, `-- --only <part>` does one part). The Python packages are pinned in `scripts/storybook-requirements.txt`. The paintings are not rebuilt: keep a copy, without them no person can be cut again.

| Path | What | Licence |
|---|---|---|
| `py/` | Python 3.12 with mflux 0.24.0, torch 2.15.0, spandrel 0.4.2, mediapipe 1.2.3, opencv-python 5.1.0.95, transformers 5.24.1, pyopenjtalk-plus 0.4.1, numpy 2.5.5 | each its own |
| `models/klein6/` | [FLUX.2 Klein 4B](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B), quantized to 6 bits for mflux ([mlx-community/FLUX.2-Klein-4B-6bit](https://huggingface.co/mlx-community/FLUX.2-Klein-4B-6bit)) | Apache-2.0 |
| `models/RealESRGAN_x4plus_anime_6B.pth` | [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) anime 6B | BSD-3-Clause |
| `models/face_landmarker.task`, `pose_landmarker_heavy.task`, `selfie_multiclass_256x256.tflite` | [MediaPipe](https://ai.google.dev/edge/mediapipe/solutions/guide) landmarks and segmentation | Apache-2.0 |
| `models/phonectc/` | [japanese-hubert-base-phoneme-ctc-v4](https://huggingface.co/prj-beatrice/japanese-hubert-base-phoneme-ctc-v4), hears phones without the text | Apache-2.0 |
| `models/julius/`, `models/segkit/` | [Julius](https://github.com/julius-speech/julius) built from source, and its [segmentation kit](https://github.com/julius-speech/segmentation-kit) | BSD-style |
| `paintings/` | the owner's paintings | the owner's |

The models take 6.6 GB and the environment 1.6 GB. One image model runs at a time on this computer. Voices need `FISH_AUDIO_API` in the environment. A tool that is not there stops a command with one line that names its path.

## Limits

- Front views only. A side or three-quarter view is cut by hand with a recipe (see [Add a figure](storybook-film.md#add-a-figure)).
- On 2026-11-25 the kit film of every figure had 5 to 7 faults in the same acts: `clap` turns a hand to −149° to −173° (a person can turn it −85° to 80°), the end of `receive` to −144° to −160°, and `raise` moves an elbow 3.7 to 5.0 cm in one frame. `clap` is in no film. The step `acts` writes them and does not stop.
- A figure that sits, seen from the front, shows a soft dark edge at the hips and between the legs. All figures have it (Sato, Daniel and Kento were looked at).
- A face painting can pass its checks and still not look like the person. Look at it.
- The proposed card does not give `fix.hole` (an armhole seam): on the cards that have one, no rule found it within 12 px on more than 4 of 14 sides.
