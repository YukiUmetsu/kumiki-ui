# Painted storybook films (STORY1)

Short language lessons with painted people, as data. The engine moves paintings. It does not redraw them. A scene or an episode is made from data files alone: see [storybook-episode](storybook-episode.md).

| Pack | What it holds |
|---|---|
| `painted-rig` | `registry/rig/`: `rig-look-painted` (paintings on a RIG1 skeleton), `rig-arm` (an arm solved in depth), `rig-comfort` (what a person's joints can do), `rig-act-studies` (the photographs of each act), `rig-joints` (a skeleton from the joints of a painting), `rig-walk` (gaits), `rig-face` (looks from facial action units, a head turned in depth), `rig-acting` (the acts) |
| `storybook-film` | `registry/video/storybook/`: `storybook-film` (the film as data), `story-play` (a screenplay compiled to a film), `paint-stage` (WebGL2), `storybook-film-react` (stage and player), `furigana`, `japanese-text`, `speech-mouth`, `story-sound`, `story-figure`, `story-burst` (fireworks), `story-check` (joints, hands and elbows of a whole film). `registry/video/gl/film-gl` |

Storybook: **Video production / Japanese Retro Watercolor** — Film, Characters, Faces and Lip Sync, Animations, Props, Scene Transitions, Furigana Subtitles. Film holds the six scenes, the pages and the episode.

Tools: `scripts/storybook-art.py` (paintings to art), `storybook-rig.py` (a card to a figure), `storybook-plan.mjs` (what exists, and the faults of a screenplay), `storybook-look.mjs` (a contact sheet), `storybook-speech.mjs` (voices and phone times), `storybook-sound.mjs` (mastered sound), `storybook-qa.mjs` and `storybook-qa.py` (measurements).

Status: implemented, measured, and reviewed in frames and in Storybook by the agent that built it and by an independent agent. **No artist has approved it.**

## Make a film

```tsx
import { StorybookFilmPlayer } from "./components/video/storybook/storybook-film-react";
import { storyFigure } from "./components/video/storybook/story-figure";
import walker from "./art/walker/art.json";

const film = {
  id: "greeting", title: "A greeting", size: { width: 1920, height: 1080 }, fps: 24,
  frame: { x: 48, y: 40, width: 1824, height: 810 }, // the picture on its page; subtitles stand under it
  cast: { walker: { name: "Walker", label: "{歩|ある}く {人|ひと}", figures: { "three-quarter": storyFigure(walker, f => `/art/walker/${f}`) } } },
  sets: { street: { home: { at: [0, -110], tall: 250 }, layers: [/* paintings with a place in centimetres, depth, sway */] } },
  props: {}, lines: {/* from storybook-speech.mjs */},
  shots: [{
    id: "hello", label: "A walker stops and bows.", set: "street", seconds: 4,
    camera: [{ t: 0, at: [0, -120], tall: 250 }, { t: 4, at: [20, -110], tall: 210, ease: "ease-in-out-cubic" }],
    roles: [{ actor: "walker", path: [-60, 0], acts: [{ act: "bow", at: 1.2 }, { act: "feel", at: 2.4, params: { look: "happy" } }] }],
    says: [{ line: "hello", at: 0.6 }],
  }],
};
<StorybookFilmPlayer film={film} />;
```

- **Places** are centimetres: x to the right, y down, the ground is y = 0. Words and the picture's frame are in stage units (the pixels of the film).
- **Acts** have an act name, a time and parameters. `to` is a place, a mark of the set or a prop. The arm goes there from where the figure stands, so one act fits each figure. Acts that overlap are blended. An act says where a hand goes for a figure of any view: `forward` turns the hand for a figure that looks at the viewer, `pitch` bends the back as that view shows it, and a hand goes round the shoulder, not through the chest. `for`, `strength`, `ease`, `in` and `away` change speed and size. `film.acts` adds acts.
- **Props** have `holds`: a time and a place, or a time, an actor and a socket. Between two holds the prop goes over in `over` seconds. `hangs` makes a bag hang straight down and swing; with 0 it only stays upright. `views` are other paintings of the same prop (an empty bag, a full one), and a hold names one with `view`. `shadow` is how dark its shadow is where it stands. A beam or a line of light is a prop too: a painted piece on a socket for a short time.
- **Order**: a layer has its own z. `raise` brings an arm over a counter for a time. What of the own body is in front of that arm stays in front of it, from the shoulder to the elbow.
- **Lines** use `{袋|ふくろ}` for a reading, `[は|わ]` for a sound that is not its letter, and a space for a word boundary.
- **Translations** of what people say are optional and hidden at first. A word that a page teaches (`means`) shows its English always. `en` of a line and `gloss` of a word hold them. The player has a switch for them, which is off. `glosses` shows them from the start. In the export story, add `&args=english:!true` to the address.
- **Attention** follows the talk: who listens looks first, who answers looks next, eyes go before the head. `look`, `to` and `toward` overrule it.
- **Depth**: a set with `ground` gives each figure its size from where it stands. A walk in depth goes along the floor of the painting, with a first and a last step.
- **Where a hand goes** when it is raised: it comes up round a low elbow. A hand that acts before the body stays inside the arm, a hand at its side goes up outside it. `aside` is the angle from straight ahead, `ahead` is how far before the chest, `shortest` is how much an arm may look shortened.
- **Joins** are `cut`, `dissolve`, `wash`, `brush`, `page`, `shoji`, `petals`, `enso`. Two shots share the seconds of a join.
- **Check** with `inspectStorybook(film)`: names, places, looks, sockets, phones and lines that overlap. The stage shows these faults and draws nothing.
- **Export** through `VideoExportStage` (story `Export 16:9`). Any frame can be drawn first.
- **Less motion**: `still` stops idle moves, the camera, petals and the moving line. Without a press on Play, the player does this for a viewer who asks for less motion.

## Acts

| Group | Acts |
|---|---|
| basic | `look` `sway` `lean` `breathe` `turn` `sit` |
| talk | `speak` `listen` `nod` `shake` `explain` `invite` `point` `wave` `call` `greet` `bow` `deep-bow` `thank` `apologise` |
| feel | `think` `react` `laugh` `puzzled` `shrug` `clap` `hop` `look-around` `feel` |
| hands | `reach` `place` `show` `take` `carry` `offer` `receive` `raise` `rest` `beckon` `drink` `eat` `phone` |
| work | `scan` `pack` `press` `fold` `unfold` `fan` `steer` `cook` |

An act is a function of time. It can be drawn at any frame, cut off by the next one or blended with it. An act at `to` with no `hand` uses the hand on the side of `to` when the figure faces the viewer. `point` turns the eyes and the head to `to`: an act that holds the eyes is not mixed with other looks.

Walking comes from the role's `path`. Breath, sway, eye movement and seeded blinks are there without an act.

## Joints

A pose passes three questions, in this order.

1. **What do people do?** `ACT_STUDIES` holds the photographs of each act that moves an arm, with the angles read off them. A new act gets its entry first. `story:check` names an act that has none. Its `hand` says how the hand does the act: the grip, the side that is seen, and the band of the wrist and the forearm, from photographs, the owner's sheets and measured studies (eating with a spoon and chopsticks, typing on a phone, the tasks of daily life). The solver keeps the wrist in that band. `story:check` asks about a hand drawn with another grip, or a wrist out of the band. Its `seen` has the bands of the upper arm and the forearm that the photographs show from the front. The arm is drawn in them (`armInBands`) when its place is near their poses. A place farther away (a child that lifts a bag over a counter as high as her chest) is more than 15° out of a band (`SEEN_FITS`). Its arm goes over to the solved arm in the next 10°. The owner's action panels set the cook (elbows out, forearms across, picks down in a fist) and the call (the phone at the mouth).
2. **What can a joint do?** `JOINT_RANGES` holds 14 joints: shoulder, elbow, forearm, wrist, neck and back. `can` is the range of the anatomy pack (ANAT1). `easy` is what reads as easy in a picture (RULA, widened by the photographs; the wrist bends 40° to the palm or back at most, as in the tasks of daily life that Gates et al. 2016 measured). The arm solver keeps to them: it solves the arm in depth, reads its joints as a viewer does, and takes the pose that costs least. A hand that is too hard to bring there turns, or the body leans.
3. **Does the arm move as an arm does?** A hold is a pose of the joints, not a place, so that a breath does not shake an elbow. An act that stands free before the viewer (`wave`, `raise`, `explain`, `invite`, `shrug`, `beckon`) gives its arm as angles of the picture: `front` has the upper arm, the forearm, the hand, and how much of each length shows (`long`).

A range is no pose. A hand on a wheel can be inside all ranges and still hold it as nobody does.

- **A hand has a side.** The kit has palms, backs, thumbs and little fingers. A drawing says what it shows (`shows`) and which grip it stands for (`as`). The solver takes the one that the forearm can show.
- **A palm faces where the photographs show it.** `sides` of an act in `ACT_STUDIES` names the sides of the hand that its photographs show: the thumb side of a cupped hand at the mouth for `call` (a palm to the viewer covers the face), the back or the thumb side of a hand that gives over a counter or holds a bag up by its handles. The solver takes a drawing of another side only when the grip has no drawing of these. `story:check` reports a hand that is drawn with the wrong side. After a hand gives a thing, it goes back to ease (`easy`, the default `after` of `place`): an open palm turned up asks for something (the owner's finding on Riku).
- **An arm has bones.** A sleeve is drawn (`outlined`) with straight parts, a corner outside the elbow, a crease inside, and a root as wide as its armhole. The lines come from photographs of sleeves. A sleeve that was bent smoothly looked like a hose. A short sleeve (its hem above the elbow) keeps the line it was painted with: straight edges went across the step of its hem and tore it open at a bent elbow.
- **A hand goes over a counter at its far edge.** `raise.edge` of a spot is where that edge is.
- **A forearm keeps its length in the picture.** A bare painted forearm drawn shorter than half its length points at the viewer, and a flat painting of it is a lump as wide as its elbow (the owner's finding on Daichi). `armInBands` costs a short forearm, and a hand that the arm does not reach in its bands stops short. It does not take a pose that reaches exactly out of the bands: that pose flipped with the next one from frame to frame. Of the elbows that reach the hand in the bands, it takes the one nearest the middle of both bands. A pull to one band only put the elbow at one end of the elbows that reach in one frame and at the other end in the next.
- **A hand joins its arm smoothly.** The paint of a forearm fades out over its last part under the hand drawing (`PaintedMesh.fade`), and most at the sides of the wrist. A hard edge of the sleeve or the skin did not show there.

## Add a figure

A new person, front view: follow [Add a person](storybook-character.md). One command paints the missing faces, proposes the card, cuts and checks the figure. A rear figure: write a card (see [storybook-episode](storybook-episode.md#a-figure)). A side or three-quarter figure, by hand:

1. Get a front, three-quarter, side or rear painting of the figure on plain paper, and paintings of its hands and faces. Keep the paintings in `local-assets/`, which git ignores. The cut art goes into the host's assets.
2. Write a recipe (the head of `storybook-art.py` gives each field): the joints in pixels, one polygon for each layer, steps that paint what lies hidden, hand drawings, face patches with marks on the lips, sockets. `kit` gives the figure every hand of the cast's kit in its size and skin (`{ file, skin, size }`), so that each act finds the drawing of the side it needs.
3. Run `python scripts/storybook-art.py recipe.json --src paintings --out assets`. It removes the paper, cuts, registers each face patch and prints how well each one fits. It writes `_assembled.png`, the layers put back together, and prints the likeness with the painting. Delete that picture after you look at it.
4. Look at the figure in `Views`, `Joints and grips`, `Shoulders and elbows`, `Walk` and `Expressions`.

A recipe with `pieces` and no joints is a set or a tray of props.

Rules that decide the quality:

- **Keep the paint.** Cut along the ink line. Use `bleed` colour under a soft edge, so no white rim shows. Loose hair needs a wider `rim` and a seed point in each pocket of paper.
- **Extend what a joint uncovers.** A sleeve goes on under the body, a neck goes on under the head and the scarf, a hip goes on under the shirt.
- **Change a drawing instead of bending it** for hands and for faces. A mesh bends sleeves, trouser legs, torsos, hems and hair.
- **Cloth that hangs does not stand up.** A wide sleeve has `slack`: cloth on the inside of a bent elbow is drawn in to the arm, and its corner hangs (`hang` of an extra bone). Without it the folded hands of a kimono made two points of cloth over the elbows.
- **An arm has bones and a hand has a side.** See [Joints](#joints).
- **An elbow has a side.** It hangs below the line from shoulder to hand when the hand is in front of the waist. On a body that faces the viewer it also goes out with a hand that goes out, and a wrist bends at most 46°. The inside of the elbow folds and shows a crease. The shoulder goes along with a high or a far reach.
- **A shirt is sewn at the armhole.** An arm is cut along the seam from the shoulder to the armpit. The cap of the shoulder stays with the chest, and the side of the body goes on behind the arm. Without it a raised arm took a piece of the side with it (`fix.hole`).
- **What stands out of a face fades toward the ears.** The depth of a face moves the nose most and the edge of the cheek not at all. Without the fade a turned cheek folded over itself and showed specks.
- **A face that laughs in its painting listens with closed lips.** `idle` of the card names the look between lines.
- **Hair past the head box is in the figure** as a layer of its own (`head-past`).
- **A loose part** (a bun, a bag, a scarf end) is an `extra` bone. At rest it has the angle of the painting. `sway` says how much it trails.
- **Photographs come before joints.** A hand on a wheel, a pick or a purse has a grip that nobody invents well. Look at real people doing it, and write what you measured into `ACT_STUDIES`.
- **A head is cut with its ears.** The cut follows the ink of the ear and the jaw. A head box that stops at the cheek leaves the ear on the body, and a turn tears it off.
- **A walk along the picture has no first step and no last step.** Start it outside the picture or under a join. A walk in depth has both.
- **A gesture covers no word.** Give `invite` or `point` a `to` beside the price, the label or the sign.
- **Two shots that follow each other agree.** A thing on the counter is still there after the cut, or the framing leaves it out.

## Speech

`storybook-speech.mjs <play>` (or `lines.json --out dir`) speaks each line or uses a recording that is there, slows it to a pace in morae a second, and aligns each phone with the recording (Julius and its segmentation kit). Without the aligner the track is estimated from the text and says `"precision": "estimated"`.

With `--hear` each recording is heard by a model that does not know the text. The script names each line that was read another way, and the accent of each word (`speak` gives the voice another spelling). `--takes 4` records a line again and keeps the take that is nearest to the reading and its accent. A voice read ごじゅうのとう and せんはっぴゃくえん wrongly, and only this step found it. A line with no recording plays as silence with a slow mouth, so a film can be planned before it is spoken.

The mouth has painted shapes for rest, a, i, u, e, o and closed lips, plus `teeth` and `n`. A figure that has no painting for one of them says which one stands in (`mouthFor`). `steps` and `squeeze` of a face patch change one painted mouth into another: lips painted out, a wide mouth made a round one. Two paintings are joined by moving marks on the lips. ん is closed only before m, b and p; before t, d, n, r and s the tongue shows; before k, g, a vowel or a pause the mouth keeps what the vowel left and half closes. A vowel before a pause is held as long as the voice sounds.

A look (glad, worried, angry, surprised, shy, sad and so on) is a set of facial action units that moves the brows, lids, cheeks and lip corners of the painted face. It mixes with each mouth shape, so a figure does not need a painting for each look.

## Measure

```
npm run -s story:qa -- <film> --out dir [--shots a,b] [--frames --known file --python <python with OpenCV>]
```

`story:check` is the first part of it, without pictures: `npm run -s story:check -- <film> [--out sheet.jpg --port 6016]`. With `--out` it draws each act of an arm at its clearest moment, on one sheet.

`<film>` is a play, an episode, `konbini` or `kit-<figure>`. `--known` remembers the pictures that passed, so a second run draws only what changed.

| Measure | From | Limit |
|---|---|---|
| Faults of `inspectStorybook` | data | 0 |
| Mesh area that folds, bodies and heads | data | 0.2% |
| A foot that is down moves along the ground | data, and Lucas-Kanade on the frames | 0.6 cm for a step, 1.2 cm in a frame |
| A joint past what a person can do | data | 5° for 0.1 s; the turn of a forearm 20° for 0.25 s |
| An elbow that jumps, in the frame of the body | data | 3 cm for a frame² |
| A hand that goes through a counter | data | 3 cm past its far edge |
| A forearm drawn short, of its length | data, the hand drawn over the arm for bare skin | bare 50 %, sleeve 30 %, for 0.4 s, named to look at |
| A hand that does something behind a person; a pose that is not easy | data | named, to look at |
| A joint turns in one frame, in the picture | data | 40° |
| A hand moves against the hips, in the picture | data | 2.6 m/s |
| Mouth against its recording, best lag | phones against loudness; darkness inside the painted lips in the frames | 70 ms; 2 frames |
| A frame that is unlike both neighbours, more than motion explains | frames | 0.6% of the picture |
| The same frame, drawn in another order | frames | 2 of 255 |

These numbers find faults. They do not say that a film is good. Look at each frame that they name, and at the film at normal speed.

## The demo

`src/video/storybook/konbini-film.ts`: a customer buys a rice ball. The characters and the store are demo art in `src/`, not in the packs. It lasts 36.3 s: a scene of 32.1 s and a word card. JLPT N5 words, slowed speech.

The store follows sources: the muted signs, lattice and noren that Kyoto's landscape rules ask for, a checkout with a customer screen, a printer, a card terminal and an automatic change machine on the customer's side, a rice ball with a drop label, an orange opening band and steps ①②③, and 100 yen and 50 yen coins with the measurements of the Ministry of Finance. The spec of the sources is in the [design](../superpowers/specs/2026-11-24-japanese-retro-storybook-watercolor-design.md).

## Provenance

| What | Source | Licence |
|---|---|---|
| Character designs | the owner's character sheets and full-body paintings | owner |
| Riku's body and neutral face | the owner's full-body painting, cut | owner |
| Views, hands, faces, sets that the sheets do not show | FLUX.2 Klein 4B, run locally on the sheets | Apache-2.0 model |
| Coin faces | public-domain photographs, Wikimedia Commons | public domain |
| Voices | Fish Audio | the owner's account |
| Recorded effects and music | Freesound, see `assets/sound/catalog.json` | CC0 |
| Door bell | two synthesized tones | CC0 |
| Japanese type of the words on the screen | Klee One (`@fontsource/klee-one`) | OFL-1.1 |
| Letters painted into signs, labels and the checkout | Gen Jyuu Gothic P Bold; Klee and Hiragino Maru Gothic of macOS, as pictures only | OFL-1.1; macOS fonts, no font file is in the repo |

## Limits

- Painted views: Emma front, three-quarter, side, rear. Riku front, three-quarter. Daniel, Sophie and Leo front, rear. Takahashi, Sato, Emi, Haruka and Daichi front.
- Riku's three-quarter view came from the painting model and its face is off-model. It is used only in `Shoulders and elbows`.
- A pose far from the painted view needs another painting. The mesh does not turn a body in depth. A head turns about 10°, or about 25° when its face has the mesh of `rig-face`. A `turn` changes to another painted view in the middle.
- `lookFor` names the stand-ins of the first two figures, whose looks are paintings.
- `inspectStorybook` does not check the reach of an arm. `story:check` checks its joints. A place that is too far is reached by leaning, and then by a straight arm: look at the pose sheet.
- A picture does not say if a short forearm points to the viewer or away. The check takes the easier way, as a viewer does. A wide kimono sleeve keeps its curve.
- The acts are for upright two-legged figures.
- A recording with several speakers at once needs one line each.

## Checked

2026-11-24, the convenience store: [report](../verification/storybook-film-2026-11-24.md). 2026-11-25, five scenes, the cast and the episode: [report](../verification/storybook-production-2026-11-25.md). 2026-11-25, joints, hands, sleeves and voices: [report](../verification/storybook-joints-2026-11-25.md). Not checked: screen reader, Safari, Firefox, an artist's review, a full-size render of a whole film.
