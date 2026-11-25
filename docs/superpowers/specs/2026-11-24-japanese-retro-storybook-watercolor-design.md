# Japanese retro storybook watercolour films: design

Date: 2026-11-24. Built: [STORY1 spec](../../component-specs/storybook-film.md).

## Intent

Short scenes that teach Japanese at JLPT N5 and N4. The people are the owner's painted characters. They act, speak and handle things in painted Japanese places. A line has furigana over its kanji and is spoken slowly. An English translation is optional and hidden at first. An episode is data: no animation code for one episode.

## Goals

- The painting stays: washes, pencil texture, uneven ink line, paper grain.
- Any figure, any set and any line through the same engine. Characters and places live in `src/` as demo art.
- Deterministic frames, one clock for picture, mouth and sound, export with the pipeline that exists.
- A 30-second acceptance scene: a customer buys a rice ball in a convenience store.

## Not goals

- 3D figures, vector redraws, a filter over footage.
- All sixteen characters, all views and all expressions in this slice. The acceptance scene comes first.

## Approaches

| | Approach | For | Against |
|---|---|---|---|
| A | Image-to-video model for each shot | quick, rich motion | not deterministic, identity drifts, no control of lips, hands and props, sheets leave this computer |
| B | Redraw the characters as vector rigs | full control | loses the paint, which is the point |
| **C** | **Cut the paintings into layers, bend them on a mesh rig, change whole drawings for hands, mouths and looks** | keeps the paint, deterministic, works on this computer | each new view needs a painting; a figure needs a careful recipe |

C was built. It extends RIG1 with one more look (`painted`) and does not add a second rig.

## How it works

1. **Art.** `storybook-art.py` reads a recipe (data) and paintings. It removes the paper and keeps the ink edge, cuts layers, extends what a joint uncovers, registers face drawings, and writes `art.json` and WebP pictures. It compares the layers with the painting.
2. **Rig.** `rig-joints` makes a skeleton from the joints of the painting. `rig-look-painted` bends each layer on it. `rig-arm` solves an arm in depth from the shoulder to a point in the world. Draw order follows the pose: of an arm that reaches across the body, the far arm goes behind the own body from the shoulder to the elbow.
3. **Acts.** Keys in body units, with entry and exit blends, speed, strength, side and a target. Walking plants the feet.
4. **Props.** A prop is on the set or in a socket of a hand. A hold changes at a time, and the prop goes over in a short time.
5. **Speech.** A recording, aligned phones, then painted mouths with coarticulation. The same times drive the furigana mark.
6. **Film.** Shots, roles, camera, sounds, joins. `planStorybook` and `storybookFrame` are pure. `inspectStorybook` names faults.
7. **Picture.** WebGL2: paint on cold-pressed paper, wet edge, line boil, grade, joins made of wash, brush, page, shoji, petals and enso. Text is real DOM text in a safe region under the picture.

## Real places and things

The store, checkout, rice ball and coins are drawn from references, for observation only:

- Kyoto shop fronts: [Kyoto signboards](https://www.tsunagujapan.com/ja/kyoto-signboard-trivia/), [Kyoto City's outdoor advertising guideline](https://www.city.kyoto.lg.jp/tokei/cmsfiles/contents/0000056/56450/guideline_all.pdf), [a store in Kyoto style](https://getnavi.jp/lifestyle/429542/), photographs on Wikimedia Commons.
- Checkout: [a chain's POS with a customer screen and a change machine](https://www.cio.com/article/643734/lason_pos_dx.html), [automatic change machines](https://jpn.nec.com/mobile-pos/column/column0143/index.html).
- Coins: [Ministry of Finance](https://www.mof.go.jp/policy/currency/coin/general_coin/list.htm), [the 100 yen coin](https://ja.wikid.org/%E7%99%BE%E5%86%86%E7%A1%AC%E8%B2%A8).
- Rice ball wrapper: [patent JP3506897B2](https://patents.google.com/patent/JP3506897B2/ja), [patent JPH11299439A](https://patents.google.com/patent/JPH11299439A/ja), [how to open one](https://www.lifehacker.jp/article/2304-roomie-onigiri-urawaza/).

No chain's name, logo or livery is copied. The store is invented.

## Tradeoffs

- A painting model on this computer (FLUX.2 Klein 4B, Apache-2.0) made the views, hands, faces and places that the sheets do not show. They are close to the sheets. They are not the owner's own drawings.
- WebGL2, not the CPU: paper, wet edge and joins for each frame at 1080p. The stage says when WebGL2 is not there.
- Voices come from Fish Audio. Any recording can replace a voice.
- Text does not go into the paint, so that it stays sharp, selectable and readable for assistive technology.
