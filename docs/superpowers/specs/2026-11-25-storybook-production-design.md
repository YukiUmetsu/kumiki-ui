# Design: production system for painted storybook films (STORY1, phase 2)

Phase 1: [design](2026-11-24-japanese-retro-storybook-watercolor-design.md). How to use the result: [storybook-episode](../../component-specs/storybook-episode.md). Evidence: [report](../../verification/storybook-production-2026-11-25.md).

## Goal

Five scenes and an episode of 8 to 10 minutes, made from data. Each new scene costs less than the one before, because each adds parts that the next one finds. No figure is made like another one to fit the system.

## Decisions

| Question | Decision | Why |
|---|---|---|
| How is a scene written? | A screenplay in JSON, compiled to the film data of phase 1 (`story-play`) | The convenience store needed 16.5 KB of code for 36 s. Its numbers were framing, who looks where, and times. A compiler finds those from the line, the act and the place. |
| How is a figure made? | A card of about 60 lines and `storybook-rig.py`, which measures the painting | The hand-made recipe of phase 1 took the most work of all. Landmarks give joints, jaw, lips and cuffs. The card holds what a machine cannot see: what is loose, what is a bag, where a sleeve ends. |
| How do faces change? | Shared action units on a mesh of each face (`rig-face`, with `facial-expressions`) | A painting for each look is dear, and drifts away from the person. Units move the painted brows and lids of that person, and mix with speech. |
| How does a figure turn? | A head turns on its mesh. A body changes to another painted view in the middle of a `turn` | The mesh cannot show a side that is not painted. |
| Hands | One kit of painted hands, in the size and the skin colour of each figure | Hands are the part that the painting model draws worst. One good set, looked at closely, serves everyone. |
| Who looks at whom | An attention engine: the listener first, the answer next, eyes before head | It was the largest part of each hand-written scene, and the first thing that looks dead when it is missing. |
| Acts | Pure functions of time | A frame can be drawn alone. An act can be cut off, blended and scrubbed. |
| Places | Sets with spots, frames, sides and a floor in perspective | The same place must serve the next screenplay with other people. |

## Actions come from photographs

The owner stopped the taxi scene: the wrists on the wheel were not how people hold one. The rule since then: look at the owner's action panels and at photographs of the action, write down grip, wrist, elbow and eyes, and only then set joints.

| Action | What the pictures showed | What it became |
|---|---|---|
| Driving | Hands at 9 and 3 to 10 and 2. The fingers wrap the rim and the thumb lies along it. Straight wrists. Elbows low and bent | `steer`, hand drawing `bar`, a socket on the rim, the wheel goes round with the hands |
| Ticket gate | A paper ticket goes into a slot, held by its long edges between thumb and fingers | `place` with the hand `card`, socket `card` |
| Fan | Held above the rivet with the thumb in front. Two hands open it, fold by fold. It moves from the wrist and the forearm | `unfold`, `fold`, `fan`, socket `bar` |
| Wrapping and handover | The bag comes out of its carrier, and the handle points to the guest. Two hands | `pack`, `offer`, `receive`, `thank` |
| Key and slippers | Two hands under the thing, a small bow with the eyes down | `offer` with the hands `under`, socket `hands`, `receive`, `deep-bow` |
| Takoyaki | A pick held like a pen, rolls from the wrist. The boat lies on a flat palm. The face comes to the food | `cook`, `eat`, sockets `pen`, `tray` and `hands`, look `bite` |
| Waving, thinking | The elbow hangs low, the forearm swings up beside the body. The hand at the chin has its elbow down on the ribs | hand paths round the elbow, `wave`, `think` |

Sources are in the [report](../../verification/storybook-production-2026-11-25.md#sources). Photographs that are not free were only looked at. None went into a painting.

## What each scene added

| Scene | New for all later scenes |
|---|---|
| Station | walks in perspective with first and last steps, rear views, turns, a family as one group, moving layers (train, gate) |
| Taxi | a car with people in it, a street that goes by, hands on a wheel, light over glass |
| Shop | goods on shelves as props with a price, folding and unfolding, purse and wallet, wrapping |
| Ryokan | clothing that changes at a place (socks on tatami), low spots, deep bows, sliding doors |
| Festival | night light, steam that grows, fireworks, food that is cooked and eaten, voices to a crowd |
| Pages | title, family, word cards and a quiz as screenplay scenes |

## Not done

Listed in the report: side views for most figures, figures that sit seen from the side, shoes that come off, other outfits, five people of the sheets.
