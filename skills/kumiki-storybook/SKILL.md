---
name: kumiki-storybook
description: Use when making, cutting, rigging, animating or reviewing painted storybook characters and watercolour learning films in Kumiki (furigana subtitles, Japanese lip sync, cut-out painted rigs, shop and street scenes), especially when an elbow or shoulder bends in a strange way, an arm lies on the wrong side of the body, a layer shows a white rim or a seam, hands or props float, a mouth does not follow the voice, feet slide, or a place, a machine, a coin or a label looks invented.
---

# Kumiki painted storybook films (STORY1)

A new scene, figure or episode: read [storybook-episode](../../docs/component-specs/storybook-episode.md). A new person: [Add a person](../../docs/component-specs/storybook-character.md) (`story:person`, `story:voice`). The engine and the acts: [storybook-film](../../docs/component-specs/storybook-film.md). Packs: `painted-rig`, `storybook-film`.

Start with `npm run -s story:make -- <play> --new --stage <stage> --cast a,b`: it writes a screenplay that plays. Then `story:make -- <play> --out dir` does all checks and draws two sheets. Before you write: `npm run -s story:plan -- --library people|stages|props|sounds|acts [name]`. Do not read the JSON of other scenes.

1. **A scene is data**: a screenplay (`plays/`), a place (`places/`, `recipes/`), figures (`cards/`). No code for one episode. A missing act goes into `rig-acting.ts`, and gets a name that another scene can use.
2. **Places are centimetres.** The ground is y = 0. Run `inspectStorybook` first.
3. **Keep the paint.** Cut, extend and bend the painting. Never redraw it as vector shapes. Change a whole drawing for hands, mouths and looks.
4. **Find photographs of the action before you set a joint.** Grip, wrist, elbow, where the eyes look. The owner's action panels first. A hand on a wheel, a pick, a purse: each one failed without them. Each act has an entry in `ACT_STUDIES` (`rig-act-studies.ts`) with its sources and the angles read off, and `hand`: the grip, the side seen, the band of the wrist. The ranges of `rig-comfort.ts` say what a person can do. A photograph says what a person does: you need both.
5. **Look at a real thing before you draw it.** Shops, machines, coins, labels and streets need sources. Measure, draw your own, copy no brand. Write prices and words that a real one has.
6. **An arm has bones.** A hold is a pose of the joints, not a place. The sleeve has straight parts, a corner outside the elbow and a crease inside: never a bent hose. An elbow hangs down when the hand is in front of the waist. A far arm goes behind the own body from shoulder to elbow. A hand goes over a counter at its far edge (`raise.edge`).
7. **A hand drawing fits the prop and its side.** A drawing says what it `shows` (palm, back, thumb side). Use a socket, with the front fingers over the prop. Hand over in one place, with both hands on the prop. A gesture covers no price and no label. A new hand: `story:hand`, then paint it.
8. **Japanese.** Write readings inline (`{店|みせ}`), words apart, は as `[は|わ]` when it is said わ. Pace 4–5 morae a second for N5. ん is not always closed.
9. **Subtitles have their own region.** Nothing covers them. Only Japanese is shown: the translation is hidden until `glosses` or the switch is on. The English of a taught word (`gloss`) shows always. Check the longest line with furigana and translation.
10. **Calm, caused motion.** A reach takes 0.7 s. Looking comes before reaching. A raised hand comes up round a low elbow. A walk along the picture starts outside it or under a join.
11. **Each figure keeps its own face and size.** The kit gives hands and feet in its size and skin. Look at its kit film (`story:look -- kit-<figure>`) after each change of an act.
12. **Measure, then look.** `story:check -- <film> --out sheet.jpg` (joints, hidden hands, elbow jumps, counters), `story:qa -- <film>`, open the frames that they name, `story:look -- <film> --shots a,b`, and play the film at normal speed. Speak with `story:speech -- <play> --hear`: it hears each line without its text. Say what is tested, what was looked at, and that nobody approved it yet.
