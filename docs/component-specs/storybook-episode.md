# Storybook episodes (STORY1 production)

How a scene or an episode of a painted storybook film is made from data. A new scene has no code. The engine, the acts and the figures are in [storybook-film](storybook-film.md).

| What | Where | Made by |
|---|---|---|
| A screenplay: lines and scenes | `src/video/storybook/plays/<play>.json` (the other folders are beside `plays/`) | hand |
| Its voices and phone times | `assets/<play>/voice/` | `npm run story:speech` |
| A place: sets, stages, props, sounds, drifts, bursts | `places/<place>.json` | hand, with the coordinates of the painting |
| The art of a place | `recipes/<place>.json` → `assets/<place>/` | `scripts/storybook-art.py` |
| A figure | `cards/<name>.json` → `assets/<name>-front/` | `scripts/storybook-rig.py` |
| An episode: plays, or scenes of plays, one after another | `episodes/<name>.json` | hand |

The paintings, the raw voices and the landmark models are in `local-assets/storybook` (git ignores it): `--src local-assets/storybook/paintings` for figures and the convenience store, `--src local-assets/storybook/paintings/sets` for other places and props, `--models local-assets/storybook/models`. Keep a copy: without them nothing can be cut again.

`src/video/storybook/library.ts` gathers all of them by folder. Nothing is registered by hand, except a new family of sound files, which the list in that file names.

## Order of work

1. `npm run -s story:plan -- --library people|stages|props|sounds|acts [name]` shows what exists: views, looks, hands, sockets, spots, frames, marks. Use it before you write. Do not read the JSON of other scenes.
2. Write the lines. Keep N5 and N4 words, one new pattern in a line, and 4 to 5 morae a second. Speak them: `npm run -s story:speech -- <play>`.
3. **Find photographs of each action that the scene needs, before a joint is set.** A hand on a wheel, a fan, a pick and a purse each failed when they came from imagination. Use the owner's action panels first, then photographs. Photographs that are not free are for observation only.
4. Find the real place. Measure it. Paint it, cut it with a recipe, and write its stage.
5. Write the scenes. `npm run -s story:plan -- <play>` prints shots, times and faults. It takes a second and opens no browser.
6. `npm run -s story:look -- <play>` draws a contact sheet. Look at the shots that changed with `--shots a,b --n 4`.
7. `npm run -s story:qa -- <play> --out dir` measures the data (about 20 s). Add `--frames --known file` for the pictures: it takes only the pictures that changed.
8. `npm run -s story:sound -- <play> --out mix.m4a` mixes and measures the sound.

## A screenplay

```json
{
  "id": "tea", "title": "お茶 — Tea",
  "lines": [{ "id": "please", "speaker": "ana", "ja": "お{茶|ちゃ}を お{願|ねが}いします。", "en": "Tea, please." }],
  "scenes": [
    { "id": "room", "stage": "tea-room", "cast": { "ana": "cushion", "ben": "door" },
      "beats": [
        { "shot": { "on": ["ana", "ben"], "size": "knee", "join": "page", "about": "Ben comes to Ana with a tray." }, "go": { "ben": "table" }, "in": 2.4 },
        { "say": "please", "to": "ben", "do": [{ "who": "ana", "act": "bow", "at": 0.2 }], "react": { "ben": "smile" } },
        { "do": [{ "who": "ben", "act": "offer", "to": "tray-mark" }], "give": [{ "prop": "cup", "to": "ana:palm-f", "at": 1.1 }] }
      ] },
    { "id": "again", "practice": { "lines": ["please"], "title": "もう{一度|いちど}" } }
  ]
}
```

A beat starts when the one before is over, or with it (`with`). Everything else that a scene needs has a default, and each default can be overruled in the beat.

| The compiler finds | Overrule with |
|---|---|
| how long a beat lasts (the line, the acts, the walk) | `seconds`, `after` |
| the picture: who is in it and how near (`face` to `wide`) | `shot.on`, `size`, `frame`, `shift` |
| the side of the stage where the face can be seen | `shot.from` |
| a slow move of the camera that stays inside the painting | `move`, `over` |
| a cut to who speaks when the picture does not show the face | `cover: "none"` |
| who looks at whom, and when: the listener first, then who answers | `look`, `to`, `toward` |
| a nod of the one who is spoken to; a look after the line | `nod`, `react`, `mood` |
| steps on the floor and their sounds | `go`, `in`, stage `steps` |
| everyone where the last picture left them | `enter`, `exit`, `without` |
| lessons: practice, words with pictures, a quiz | `practice`, `recap`, `quiz` |

`pose` is what someone does all the time from here on (hands on a wheel, hands folded). `wear` changes what people wear at a place (socks on tatami). The poses and gives of the first beat count from before the picture starts.

## A place

A set is layers of paintings with a place in centimetres. A stage is a set with **spots** (where someone can be, in which view, how low, what comes over a counter), **frames**, **sides** for a reverse shot, steps, sounds and things that stand there. The same stage serves each screenplay.

- `ground` on a set gives the horizon and the distance: figures get their size from where they stand, and walk on the floor.
- `depthZ` puts a layer between people by the floor that it stands on (`stands`).
- `raise` of a spot brings hands over a wheel, a counter or a tray.
- `stays` of a spot keeps its person in each picture of the place (who sits in a car): the picture grows, and the person is not left out. Without it a close-up leaves out a person whom the edge of the picture cuts.
- `sides` gives the place as it is seen from the other side (a desk: the clerk's side and the guests' side). A shot asks for it with `from`.
- A layer that stands on an upright `hinge` opens with `swing` in its `slide` (a car door). It gets narrower, and what comes nearer gets larger.
- A step `picture` of a recipe puts another painting on a phone, a poster or a card in the picture.
- A spot never looks (`toward`) at the person who stands on it.
- Drifts are petals, steam, rain or smoke. With `grow` they get larger. Bursts are fireworks. `slides` moves a layer: a train, a door, a car. `pace` is how fast the street goes by behind a window.

## A figure

A card of about 60 lines replaces a recipe cut by hand. `storybook-rig.py` finds joints, jaw, lips and cuffs from landmarks, cuts the painting, fills what a joint uncovers, sews the faces, and takes hands and feet from the kit of the cast in the size and the skin colour of the figure. It prints how like the painting the figure is at rest. Then look at the kit film of the figure (`npm run -s story:look -- kit-<figure> --n 4`) and measure it (`story:qa -- kit-<figure>`): standing, turning, each look, speech, both arms through the space in front, each act, a walk, sitting.

A wide sleeve (a kimono) needs `fix.sleeve` in the card: the line where it ends against the body. Its corner past the cuff then hangs on a bone of its own (`hang`), and the cloth on the inside of the elbow is drawn in as the elbow bends (`slack` of the bind). Under a skirt or a hem the legs stand straight, so that the cloth hangs as it is painted.

`fix.hole` gives the armhole where the gap beside an arm does not show it. `idle` names the look between lines when the painting laughs. `badges` replaces the letters of a real company on a badge with a plain wheel. A view in other clothes is named in `apart` of the person in `cast.ts`: it is loaded only by the films that name it.

A rear view is a card with `"view": "rear"`. `"body": { "sits": false }` says that the clothes hang in one piece and the figure only stands: a screenplay that asks for `sit` is refused.

## What a scene costs

Measured on the demo scenes, in the order in which they were made. New pictures are those that no earlier scene had: a figure brings all its looks, hands and feet at once.

| Scene | Length | Shots | Lines | Screenplay | New pictures | New acts |
|---|---|---|---|---|---|---|
| Convenience store (phase 1) | 36 s | 9 | 7 | 16.5 KB of code | 119 | 12 |
| Station | 90 s | 18 | 12 | 7.4 KB of JSON | 411 | hop, point, shrug, look-around, explain; perspective walk, turns, rear views |
| Taxi | 75 s | 17 | 13 | 6.3 KB | 63 | raise, steer; driving behind glass |
| Souvenir shop | 66 s | 17 | 11 | 8.3 KB | 63 | fold, unfold, fan, offer, thank, pack, receive |
| Inn | 79 s | 19 | 12 | 8.3 KB | 76 | deep-bow; socks, two-handed handover |
| Festival | 67 s | 19 | 12 | 9.6 KB | 65 | cook, call, eat; fireworks |
| Pages of the episode | 81 s | 16 | 16 | 7.8 KB | 3 | none |
| **Episode** `first-trip` | **487 s** | **115** | **83** | **0.4 KB** | **0** | **none** |

The large cost of a scene is now its place and its props. The people, the acts, the camera and the sound are there. Painting 100 sprites on this machine is slow (one local image model at a time); a compile takes a second, and a look at 20 frames of the whole episode takes 24 s.

## Limits

- The tool drafts front and rear figures. Side and three-quarter views are cut by hand (Emma, Riku).
- A seated figure that is seen from the front reads as short legs. Long skirts and aprons only stand.
- A kimono sleeve keeps the cloth of its painting: its corner hangs and its inner cloth is drawn in, but it does not swing. A deep bow from the front is shown by a shorter back, not by a turned body. From the front the arms of a walk swing in depth, which is small. A bent puffy sleeve bulges at the elbow.
- Rear, side and three-quarter figures have no `bar`, `tray` or `pen` grip.
- Shoes are not taken off in the picture. Backpacks stay on in a room. Payment at the festival is not shown.
- The mixed sound of a film is made in the browser when it opens. A whole episode takes some seconds.
- Nobody has approved the episode. See the [report](../verification/storybook-production-2026-11-25.md).
