---
name: kumiki-content
description: Make a film or short explainer with Kumiki: turn a brief into one film JSON file, check it, review contact sheets and render MP4s. Use for video, explainer or animated-scene requests, not for building a new component.
---

# Make a film

Write data, not TSX. Read [the film document](../../docs/component-specs/film-document.md) once. Use the [UI skill](../kumiki-ui/SKILL.md) only if a scene needs a component that does not exist.

1. **Brief.** State one learning objective in one sentence. Get the approved facts, script, assets and their rights. Do not invent numbers, sources or licences. If a fact is missing, ask or mark it as illustrative.
2. **Storyboard.** For each beat of 5 to 9 seconds, write **input → transformation → visible output**. If the beat still explains with the text removed, keep it. Answer the question early. End on the mechanism and its limit, not on a list. Compare two teaching metaphors and pick the one with fewer concepts. [The lessons](../../docs/15-explainer-lessons.md) record why.
3. **Choose scenes.** Map each beat to a recipe with `npm run catalog:find -- --query="<intent>" --format=json`. Read `partialMatches` if there are no results. Use `object-story` when the same objects stay on stage and each phrase changes them. Use a recipe for one intent such as `cause-effect` or `before-after`. Do not use 3D unless the camera or construction needs it.
4. **Write the file.** Start from `npm run film:example -- --recipe=<id> --out=<dir>`. For exact fields use the schema, or `npm run catalog:api -- --id=<pack> --format=json`. Do not guess fields. Keep one caption per beat, ideally 9 words or fewer. Use `outputs` for each format. Do not crop one format into another.
5. **Check.** Run `npm run film:check -- <file>`. Fix every error, then run it again. It reports all errors at once and takes about half a second, so use it often.
6. **Review.** Run `npm run film:review -- <file>`. Fix each text error. **Open each contact sheet and look at every frame.** Ask: can I read the text in one glance, does each frame have one focus, does the composition fill the frame, and does the picture alone explain the beat? Change the file and run the review again.
7. **Render.** Run `npm run film:render -- <file>` when the sheets are good. A 2D film renders at about 4 frames a second, so use the review to test a change.
8. **Report.** State the commands and their results. Report human review as pending. A clean report proves geometry only. You cannot approve your own film.

**Stop and ask** if an asset has no clear rights, if a claim has no source, or if no recipe fits a beat. Do not change a recipe to fix one film. Fix an authoring rule or a component once, then use it.

**Never:** put exact text or numbers inside generated imagery, add motion that teaches nothing, repeat a title and a caption, or call a film finished before you watch it.
