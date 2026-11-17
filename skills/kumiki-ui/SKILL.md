---
name: kumiki-ui
description: Implement or review premium, accessible, themeable React components with tested interaction states and deterministic visual QA.
---

# Kumiki UI Skill

Use this skill for a new component, component modification, registry release or visual design review.

1. Read [AGENTS](../../AGENTS.md), the [catalog](../../docs/02-component-catalog.md) and the specific [component contract](../../docs/03-component-standards.md). Avoid reading every doc when a narrow task will do.
2. Search approved Kumiki components before creating new primitives. Respect the documented API and semantic tokens; keep copy and behaviors generic.
3. For each component, write a concise [spec](../../templates/component-spec.md): task, API, states, keyboard/focus, variants, customization, dependencies and acceptance tests.
4. Implement functional state and accessibility before visual polish. Use typography, composition, motion and themes from [foundations](../../docs/01-design-foundations.md).
5. Render real Storybook states and inspect screenshots; run tests and the [quality checklist](../../docs/04-quality-and-testing.md). Flag intentional overlaps explicitly.
6. Verify clean registry installation for distributable changes. Never claim success for checks you didn't run.
7. Report exact changes, commands/results, screenshots, dependencies/license impact and unresolved defects; stop after requested scope.

Drawing or reviewing people, faces, hands, poses, hair or skin and eye colour in any style: follow [kumiki-human-anatomy](../kumiki-human-anatomy/SKILL.md).
Drawing, animating or reviewing animals, birds or fish in any style (proportions, faces, coat colours, fur, gaits, sounds): follow [kumiki-animal-anatomy](../kumiki-animal-anatomy/SKILL.md).
Drawing or animating trees, bamboo, flowers, grasses or other vegetation in any style (architecture, seasons, blossom, autumn colour, bark): follow [kumiki-plant-anatomy](../kumiki-plant-anatomy/SKILL.md).
Drawing or animating sky, clouds and weather in any style (rain, snow, fog and haze, wind, time-of-day light, lightning, rainbows): follow [kumiki-sky-weather](../kumiki-sky-weather/SKILL.md).
Drawing or animating seas, waves, surf, wakes, ripples, reflections or rivers in any style: follow [kumiki-water](../kumiki-water/SKILL.md).
Choosing or painting materials in any style or renderer (metal, wood, bamboo, tatami, paper, plaster, lacquer, stone, tile; wet and aged looks): follow [kumiki-materials](../kumiki-materials/SKILL.md).
Dressing people for a place, period, role or occasion in any style (clothing and costume worldwide, found by tags): follow [kumiki-costume](../kumiki-costume/SKILL.md).
Putting makeup on any face in any style (foundation, contour, highlight, blush, eyes, liner, brows, lips, colour for a skin tone, face charts, photographs): follow [kumiki-makeup](../kumiki-makeup/SKILL.md).

Drawing or animating facial expressions and emotions in any style (brows, lids, mouth, creases, smiles that reach the eyes): follow [kumiki-facial-expressions](../kumiki-facial-expressions/SKILL.md).
Mountains, valleys, volcanoes, mesas, dunes, cliffs or hills in any style (slopes, snow and treelines, erosion, distance): follow [kumiki-terrain](../kumiki-terrain/SKILL.md).
Buildings, houses, streets, temples, castles, columns or roofs in any style (door and storey sizes, stairs, roof pitch, orders): follow [kumiki-architecture](../kumiki-architecture/SKILL.md).
Insects, spiders, snails or other small creatures in any style (legs and wings by order, sizes, wingbeats, fireflies): follow [kumiki-small-creatures](../kumiki-small-creatures/SKILL.md).
Food and cooking in any style (doneness, boiled eggs, browning, steam, gloss, dishes): follow [kumiki-food](../kumiki-food/SKILL.md).
Walking, running and moving people in any style (gait curves, cadence, planted feet, moods): follow [kumiki-motion](../kumiki-motion/SKILL.md).
Fire, candles, campfires, torches, smoke, sparks, explosions or firelight in any style (size and flicker from power, colour from temperature): follow [kumiki-fx](../kumiki-fx/SKILL.md).

**Never:** hardcode a specific consuming application; substitute tiny low-contrast text for elegance; add generic glow/gradients by default; ship untested animation or overlays; hide essential information for minimalism; overwrite consumer customization without review.
