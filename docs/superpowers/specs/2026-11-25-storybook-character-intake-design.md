# Storybook character intake (STORY1): design

Approved by the owner on 2026-11-25 ("I'll take your recommendation").

## Intent

Each new character must cost less work than the last one, also when one video brings several of them. Adding a person must need no code. Every check that found a fault in earlier figures (an ear left on the body, a hand of the wrong side, an elbow that no person can bend, a face that drifts from its painting) must run before the owner sees the figure.

## Goals

- One command takes a person from the owner's full-body painting to a checked figure and one sheet to approve.
- A person is a data file. No edit of `cast.ts` or `voices.json`.
- The prompts, the upscaler and the checks that made the earlier figures are in the repository, with their models in `local-assets` (git ignores it).
- A document, "Add a person", says which assets a person needs, which commands to run, what is automatic and what only the owner decides.
- An evaluation of external libraries (masks, pose, layers) on the owner's paintings, with measured results and licences.

## Non-goals

- Side and three-quarter views made by the tool (approach 2, later).
- Moving the tools into the `painted-rig` pack, and hands that are tinted when they load (approach 3, later).
- A rig for the cat Momo.
- A choice of voice by the agent: the owner listens and chooses.

## Anti-goals

- A face or a view that the image model makes and nobody checks against the painting.
- Numbers in a card that nobody can see on the painting.
- A code path for one person.

## Approaches

| Approach | Trade-off | Decision |
|---|---|---|
| 1. Character package and one intake command on the current engine | Gives the next video the most. Views stay front and rear | **chosen** |
| 2. Approach 1 plus side and three-quarter views made by the tool | Largest gain in quality. More risk: landmarks on side paintings are less sure, and painted views drift | later |
| 3. Approach 1 plus the tools in the `painted-rig` pack and hands tinted when they load | Reusable by other projects, 12 MB less. Little gain for the next video | later |

## Design

1. **A person is data.** `src/video/storybook/people/<id>.json` holds the name, the label, the colour, the seed, the first view, the views in other clothes, the height, the age, the voice and a short description of hair and clothes. `cast.ts` and `storybook-speech.mjs` read these files. `voices.json` and the list in `cast.ts` go away.
2. **Paintings from templates.** `scripts/storybook-paint.py` paints the faces (open mouth, blink, smile) and a rear view from templates. The person's description fills them. Each result is compared with the painting: the face landmarks that must stay where they were, the colours, and the change that was asked for (the mouth opens, the eyes close). A result that fails is not kept. The 2× copies come from the same tool (Real-ESRGAN anime 6B, BSD-3-Clause).
3. **A card that is proposed and drawn.** `storybook-rig.py --propose` writes a draft card from the landmarks (head box with the ears, armhole seams, cuffs) and a picture that draws each proposed point on the painting.
4. **`story:person -- <id>[,<id>]`** runs: import, propose, paint the missing faces, cut, the figure checks (likeness, ears, hand sides, joints, elbows, mouths), one figure sheet, and the list of what is missing. It stops at the first fault. Paintings run one at a time, because one image model at a time fits this computer.
5. **Voices.** `story:voice -- <id> --try a,b,c` speaks one test line with each candidate voice, hears it, and measures its pitch against the voices of the cast. The owner chooses.
6. **Document.** `docs/component-specs/storybook-character.md`, "Add a person", linked from the episode spec and the `kumiki-storybook` skill.
7. **External libraries.** SAM 2 (Apache-2.0) for masks, a whole-body pose model (DWPose or SDPose) against MediaPipe, and See-through for layers if its weights have a licence. Each runs in its own environment on the 16 paintings. A library goes into the pipeline only if it measures better and its licence allows it.

## Proof

Add Kento and Yui with the command, measure the time of each step, and look at their figure sheets. They stay front-only until a screenplay needs more.

## Left to the builder

The thresholds of the face check, the format of the figure sheet, and the names of the template fields.
